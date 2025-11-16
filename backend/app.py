from flask import Flask, request, jsonify
from flask_cors import CORS
from pinecone import Pinecone
from openai import AzureOpenAI
import os
import json
import base64
from dotenv import load_dotenv
from supabase import create_client, Client
from google import genai
from google.genai import types

# Try different import paths for Google Cloud
try:
    from vertexai.preview.language_models import TextEmbeddingModel
except ImportError:
    try:
        from google.cloud.aiplatform.language_models import TextEmbeddingModel
    except ImportError:
        TextEmbeddingModel = None

load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize Google Embedding Model
MODEL_ID = "text-embedding-005"
embedding_model = None
if TextEmbeddingModel:
    try:
        embedding_model = TextEmbeddingModel.from_pretrained(MODEL_ID)
    except Exception as e:
        print(f"Warning: Could not initialize embedding model: {e}")
        print("Make sure GOOGLE_APPLICATION_CREDENTIALS is set correctly")
else:
    print("Warning: TextEmbeddingModel not available. Install google-cloud-aiplatform")

# Initialize Pinecone
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY", "pcsk_D2zMz_AdNzbvbQoRWBCDVSKvFmE8rJatLxUpxrVxSPQgRw9spCLbBLYqzTGTHZRserLhP")
PINECONE_HOST = os.getenv("PINECONE_HOST", "https://data-n7q8h09.svc.aped-4627-b74a.pinecone.io")
INDEX_NAME = os.getenv("PINECONE_INDEX", "grocery")

pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(INDEX_NAME)

# Initialize Azure OpenAI
def create_openai_client():
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "https://aiprojects2984267134.openai.azure.com/")
    api_key = os.getenv("AZURE_OPENAI_KEY")
    deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4.1")
    
    if not api_key:
        raise ValueError("AZURE_OPENAI_KEY environment variable is required")
    
    return AzureOpenAI(
        azure_endpoint=endpoint,
        api_version="2025-01-01-preview",
        api_key=api_key
    ), deployment

openai_client, deployment = create_openai_client()

# Initialize Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://fdxdpqyhlvftoknpybno.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkeGRwcXlobHZmdG9rbnB5Ym5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNzM0NTQsImV4cCI6MjA3ODc0OTQ1NH0.m9cliDpMiXeBACxfF_a_cRWStnbyUTp_iRIizBJAyzA")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

@app.route('/api/money-saver/recommendations', methods=['POST'])
def get_recommendations():
    """
    Generate money-saving recommendations for grocery items in cart.
    
    For each item in the cart:
    1. Extract name and category
    2. Convert name + category to embedding using Google's text-embedding-005
    3. Query Pinecone for similar products with price < current item price
    4. Filter by similarity >= 0.5
    5. Validate with Azure OpenAI GPT-4.1 if products are the same type
    6. Return cheaper alternatives sorted by price
    """
    try:
        data = request.json
        items = data.get('items', [])
        
        if not items:
            return jsonify({"recommendations": {}}), 200
        
        recommendations = {}
        
        for item in items:
            # Extract name and category for each cart item
            item_id = str(item.get('id'))
            item_name = item.get('name', '').strip()
            item_category = item.get('category', '').strip()
            item_price = float(item.get('price', 0))
            item_description = item.get('description', '').strip()
            
            # Validate required fields
            if not item_name:
                print(f"Skipping item {item_id}: missing name")
                continue
                
            if item_price <= 0:
                print(f"Skipping item {item_id} ({item_name}): invalid price {item_price}")
                continue
            
            # Check if embedding model is available
            if not embedding_model:
                print("Error: Embedding model not initialized")
                continue
            
            # Create embedding from name and category for this cart item
            # Combine name and category to create the embedding text
            embedding_text_parts = [item_name]
            if item_category:
                embedding_text_parts.append(item_category)
            
            embedding_text = " ".join(embedding_text_parts).strip()
            print(f"Processing item {item_id}: {item_name} (category: {item_category or 'N/A'}) - Price: €{item_price}")
            print(f"Creating embedding from: '{embedding_text}'")
            
            try:
                embeddings = embedding_model.get_embeddings([embedding_text])
                embedding_vector = embeddings[0].values
                print(f"Successfully created embedding (vector length: {len(embedding_vector)})")
            except Exception as e:
                print(f"Error creating embedding for {item_name}: {e}")
                continue
            
            # Query Pinecone for similar products with price less than current item
            # This is for money saver - find cheaper alternatives
            try:
                print(f"Querying Pinecone for products cheaper than €{item_price}...")
                query_results = index.query(
                    vector=embedding_vector,
                    filter={"price": {"$lt": item_price}},
                    top_k=10,
                    include_metadata=True
                )
                print(f"Found {len(query_results.matches)} candidates from Pinecone")
            except Exception as e:
                print(f"Pinecone query error for {item_name}: {e}")
                continue
            
            # First, collect all candidates with similarity >= 0.5
            candidates = []
            for match in query_results.matches:
                if match.score >= 0.5:
                    candidate_metadata = match.metadata
                    candidates.append({
                        "id": match.id,
                        "name": candidate_metadata.get('name', ''),
                        "description": candidate_metadata.get('description', ''),
                        "price": float(candidate_metadata.get('price', 0)),
                        "similarity": match.score,
                        "metadata": candidate_metadata
                    })
            
            if not candidates:
                print(f"No candidates found with similarity >= 0.5 for {item_name}")
                continue
            
            # Send all candidates at once to GPT for validation
            candidates_list = "\n".join([
                f"{i+1}. Name: {c['name']}\n   Description: {c['description']}\n   Price: €{c['price']}\n   Similarity: {c['similarity']:.2f}"
                for i, c in enumerate(candidates)
            ])
            
            prompt = f"""Compare the original product with all candidate products below and determine which candidates are the same type of product (e.g., both are hot chocolate, both are eggs, etc.).

Original Product:
- Name: {item_name}
- Description: {item_description}
- Price: €{item_price}

Candidate Products:
{candidates_list}

Respond with JSON only in this format:
{{
  "valid_products": [1, 3, 5],
  "reasoning": {{
    "1": "brief explanation why product 1 is/isn't the same",
    "3": "brief explanation why product 3 is/isn't the same",
    "5": "brief explanation why product 5 is/isn't the same"
  }}
}}

Where "valid_products" is an array of candidate numbers (1-based) that are the same type as the original product."""
            
            try:
                print(f"Validating {len(candidates)} candidates with GPT for {item_name}...")
                resp = openai_client.chat.completions.create(
                    model=deployment,
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"},
                    temperature=0.5
                )
                
                result = json.loads(resp.choices[0].message.content)
                valid_indices = result.get("valid_products", [])
                
                print(f"GPT validated {len(valid_indices)} out of {len(candidates)} candidates as same product type")
                
                # Build valid recommendations from validated candidates
                valid_recs = []
                for idx in valid_indices:
                    # Convert 1-based index to 0-based
                    candidate_idx = idx - 1
                    if 0 <= candidate_idx < len(candidates):
                        c = candidates[candidate_idx]
                        candidate_metadata = c["metadata"]
                        valid_recs.append({
                            "id": c["id"],
                            "name": c["name"],
                            "category": candidate_metadata.get("category", ""),
                            "price": c["price"],
                            "description": c["description"],
                            "similarity": c["similarity"],
                            "image_url": candidate_metadata.get("image_url") or candidate_metadata.get("img_url") or candidate_metadata.get("gcp_public_url"),
                            "gcp_public_url": candidate_metadata.get("gcp_public_url"),
                            "gcp_image_url": candidate_metadata.get("gcp_image_url"),
                            "gcp_bucket": candidate_metadata.get("gcp_bucket"),
                            "gcp_path": candidate_metadata.get("gcp_path")
                        })
            except Exception as e:
                print(f"OpenAI validation error for {item_name}: {e}")
                continue
            
            # Sort by price (cheapest first)
            valid_recs.sort(key=lambda x: x['price'])
            
            if valid_recs:
                recommendations[item_id] = valid_recs
        
        return jsonify({"recommendations": recommendations}), 200
    
    except Exception as e:
        print(f"Error in get_recommendations: {e}")
        return jsonify({"error": str(e), "recommendations": {}}), 500

@app.route('/api/restaurant/upgrade-recommendations', methods=['POST'])
def get_restaurant_upgrades():
    """
    Generate upgrade recommendations for restaurant menu items.
    
    For each restaurant item in the cart:
    1. Check if item exists in menu_items table
    2. Find menu items that cost +2 to +7 euros more
    3. Check if those items have a 'dishes' attribute (list)
    4. Verify the current dish is included in that list
    5. Return upgrade options
    """
    try:
        data = request.json
        items = data.get('items', [])
        
        if not items:
            return jsonify({"recommendations": {}}), 200
        
        recommendations = {}
        
        for item in items:
            item_id = str(item.get('id'))
            item_name = item.get('name', '').strip()
            item_price = float(item.get('price', 0))
            restaurant_id = item.get('restaurant_id')
            
            # Validate required fields
            if not item_name or item_price <= 0:
                print(f"Skipping item {item_id}: missing name or invalid price")
                continue
            
            # Check if this item exists in menu_items table
            try:
                menu_item_result = supabase.table('menu_items').select('*').eq('id', int(item_id) if item_id.isdigit() else item_id).execute()
                
                if not menu_item_result.data or len(menu_item_result.data) == 0:
                    print(f"Item {item_id} not found in menu_items table")
                    continue
                
                current_menu_item = menu_item_result.data[0]
                current_restaurant_id = current_menu_item.get('restaurant_id')
                
                # Find menu items from the same restaurant that cost +2 to +7 euros more
                min_price = item_price + 2
                max_price = item_price + 7
                
                upgrade_candidates = supabase.table('menu_items').select('*').eq('restaurant_id', current_restaurant_id).gte('price', min_price).lte('price', max_price).execute()
                
                if not upgrade_candidates.data:
                    print(f"No upgrade candidates found for item {item_id}")
                    continue
                
                # Filter candidates that have 'dishes' attribute as a list containing the current dish
                valid_upgrades = []
                for candidate in upgrade_candidates.data:
                    dishes = candidate.get('dishes')
                    
                    # Check if dishes is a list/array
                    if isinstance(dishes, list):
                        # Check if current dish name or ID is in the dishes list
                        current_dish_included = False
                        for dish in dishes:
                            if isinstance(dish, dict):
                                # If dish is an object, check name or id
                                if dish.get('name') == item_name or str(dish.get('id')) == item_id:
                                    current_dish_included = True
                                    break
                            elif isinstance(dish, str):
                                # If dish is a string, check if it matches name
                                if dish == item_name:
                                    current_dish_included = True
                                    break
                            elif str(dish) == item_id:
                                current_dish_included = True
                                break
                        
                        if current_dish_included:
                            # Get full dish details for the upgrade option
                            candidate_price = float(candidate.get('price', 0))
                            valid_upgrades.append({
                                "id": candidate.get('id'),
                                "name": candidate.get('name', ''),
                                "description": candidate.get('description', ''),
                                "price": candidate_price,
                                "dishes": dishes,
                                "restaurant_id": candidate.get('restaurant_id'),
                                "gcp_public_url": candidate.get('gcp_public_url'),
                                "gcp_image_url": candidate.get('gcp_image_url'),
                                "gcp_bucket": candidate.get('gcp_bucket'),
                                "gcp_path": candidate.get('gcp_path'),
                                "upgrade_amount": candidate_price - item_price
                            })
                
                # Sort by price (lowest upgrade first)
                valid_upgrades.sort(key=lambda x: x['price'])
                
                if valid_upgrades:
                    recommendations[item_id] = valid_upgrades
                    print(f"Found {len(valid_upgrades)} upgrade options for item {item_id}")
                    
            except Exception as e:
                print(f"Error processing restaurant item {item_id}: {e}")
                continue
        
        return jsonify({"recommendations": recommendations}), 200
    
    except Exception as e:
        print(f"Error in get_restaurant_upgrades: {e}")
        return jsonify({"error": str(e), "recommendations": {}}), 500

@app.route('/api/healthy/recommendations', methods=['POST'])
def get_healthy_recommendations():
    """
    Generate healthy recommendations for grocery items in cart.
    
    For each item in the cart:
    1. Extract name and category
    2. Convert name + category to embedding using Google's text-embedding-005
    3. Query Pinecone for similar products (top 10, similarity >= 0.5)
    4. Fetch nutrition_profile from Supabase for original item and candidates
    5. Send to Azure OpenAI GPT-4.1 to determine which are better nutritionally
    6. Return recommendations with nutrition info and descriptions
    """
    try:
        data = request.json
        items = data.get('items', [])
        
        if not items:
            return jsonify({"recommendations": {}}), 200
        
        recommendations = {}
        
        for item in items:
            # Extract name and category for each cart item
            item_id = str(item.get('id'))
            item_name = item.get('name', '').strip()
            item_category = item.get('category', '').strip()
            item_description = item.get('description', '').strip()
            
            # Validate required fields
            if not item_name:
                print(f"Skipping item {item_id}: missing name")
                continue
            
            # Check if embedding model is available
            if not embedding_model:
                print("Error: Embedding model not initialized")
                continue
            
            # Create embedding from name and category for this cart item
            embedding_text_parts = [item_name]
            if item_category:
                embedding_text_parts.append(item_category)
            
            embedding_text = " ".join(embedding_text_parts).strip()
            print(f"Processing item {item_id}: {item_name} (category: {item_category or 'N/A'}) for healthy recommendations")
            print(f"Creating embedding from: '{embedding_text}'")
            
            try:
                embeddings = embedding_model.get_embeddings([embedding_text])
                embedding_vector = embeddings[0].values
                print(f"Successfully created embedding (vector length: {len(embedding_vector)})")
            except Exception as e:
                print(f"Error creating embedding for {item_name}: {e}")
                continue
            
            # Query Pinecone for similar products (top 10, similarity >= 0.5)
            try:
                print(f"Querying Pinecone for similar products...")
                query_results = index.query(
                    vector=embedding_vector,
                    top_k=10,
                    include_metadata=True
                )
                print(f"Found {len(query_results.matches)} candidates from Pinecone")
            except Exception as e:
                print(f"Pinecone query error for {item_name}: {e}")
                continue
            
            # Filter candidates with similarity >= 0.5
            candidates = []
            for match in query_results.matches:
                if match.score >= 0.5:
                    candidate_metadata = match.metadata
                    candidates.append({
                        "id": match.id,
                        "name": candidate_metadata.get('name', ''),
                        "description": candidate_metadata.get('description', ''),
                        "price": float(candidate_metadata.get('price', 0)),
                        "similarity": match.score,
                        "metadata": candidate_metadata
                    })
            
            if not candidates:
                print(f"No candidates found with similarity >= 0.5 for {item_name}")
                continue
            
            # Fetch nutrition_profile from Supabase for original item
            original_nutrition = None
            try:
                # Convert item_id to int if possible, otherwise use as string
                original_id = int(item_id) if item_id.isdigit() else item_id
                original_result = supabase.table('grocery_products').select('nutrition_profile').eq('id', original_id).execute()
                if original_result.data and len(original_result.data) > 0:
                    original_nutrition = original_result.data[0].get('nutrition_profile')
                    print(f"Fetched nutrition profile for original item {item_id}")
            except Exception as e:
                print(f"Error fetching nutrition profile for original item {item_id}: {e}")
            
            # Fetch nutrition profiles for all candidates
            candidate_ids = [c["id"] for c in candidates]
            candidate_nutrition = {}
            try:
                if candidate_ids:
                    # Convert candidate IDs to int if possible
                    candidate_ids_int = []
                    for cid in candidate_ids:
                        try:
                            candidate_ids_int.append(int(cid))
                        except (ValueError, TypeError):
                            candidate_ids_int.append(cid)
                    
                    nutrition_result = supabase.table('grocery_products').select('id, nutrition_profile').in_('id', candidate_ids_int).execute()
                    if nutrition_result.data:
                        for product in nutrition_result.data:
                            candidate_nutrition[str(product['id'])] = product.get('nutrition_profile')
                        print(f"Fetched nutrition profiles for {len(candidate_nutrition)} candidates")
            except Exception as e:
                print(f"Error fetching nutrition profiles for candidates: {e}")
            
            # Build candidates list with nutrition info for GPT
            candidates_list = []
            for i, c in enumerate(candidates):
                candidate_id = c["id"]
                nutrition = candidate_nutrition.get(candidate_id, "Not available")
                candidates_list.append({
                    "index": i + 1,
                    "id": candidate_id,
                    "name": c['name'],
                    "description": c['description'],
                    "price": c['price'],
                    "similarity": c['similarity'],
                    "nutrition": nutrition
                })
            
            # Format candidates for GPT prompt
            candidates_text = "\n".join([
                f"{c['index']}. Name: {c['name']}\n   Description: {c['description']}\n   Price: €{c['price']}\n   Nutrition Profile: {json.dumps(c['nutrition']) if isinstance(c['nutrition'], dict) else c['nutrition']}"
                for c in candidates_list
            ])
            
            original_nutrition_text = json.dumps(original_nutrition) if isinstance(original_nutrition, dict) else (original_nutrition or "Not available")
            
            prompt = f"""Compare the original product with all candidate products below and determine which candidates are nutritionally better options. Consider factors like: protein content, fiber, vitamins, minerals, lower sugar, lower saturated fat, whole grains, etc.

Original Product:
- Name: {item_name}
- Description: {item_description}
- Nutrition Profile: {original_nutrition_text}

Candidate Products:
{candidates_text}

Respond with JSON only in this format:
{{
  "better_products": [
    {{
      "index": 1,
      "reason": "Brief explanation why this product is nutritionally better (e.g., 'Higher protein and fiber, lower sugar')"
    }},
    {{
      "index": 3,
      "reason": "Brief explanation why this product is nutritionally better"
    }}
  ]
}}

Where "better_products" is an array of candidate objects (1-based index) that are nutritionally better than the original product. Only include products that are clearly better nutritionally."""
            
            try:
                print(f"Analyzing {len(candidates)} candidates with GPT for nutritional value...")
                resp = openai_client.chat.completions.create(
                    model=deployment,
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"},
                    temperature=0.5
                )
                
                result = json.loads(resp.choices[0].message.content)
                better_products = result.get("better_products", [])
                
                print(f"GPT identified {len(better_products)} nutritionally better products")
                
                # Build valid recommendations from better products
                valid_recs = []
                for better_product in better_products:
                    candidate_idx = better_product.get("index", 0) - 1
                    if 0 <= candidate_idx < len(candidates_list):
                        c = candidates_list[candidate_idx]
                        candidate_metadata = candidates[candidate_idx]["metadata"]
                        valid_recs.append({
                            "id": c["id"],
                            "name": c["name"],
                            "category": candidate_metadata.get("category", ""),
                            "price": c["price"],
                            "description": c["description"],
                            "similarity": c["similarity"],
                            "nutrition_reason": better_product.get("reason", "Better nutritional value"),
                            "nutrition_profile": c["nutrition"],
                            "image_url": candidate_metadata.get("image_url") or candidate_metadata.get("img_url") or candidate_metadata.get("gcp_public_url"),
                            "gcp_public_url": candidate_metadata.get("gcp_public_url"),
                            "gcp_image_url": candidate_metadata.get("gcp_image_url"),
                            "gcp_bucket": candidate_metadata.get("gcp_bucket"),
                            "gcp_path": candidate_metadata.get("gcp_path")
                        })
            except Exception as e:
                print(f"OpenAI nutrition analysis error for {item_name}: {e}")
                continue
            
            if valid_recs:
                recommendations[item_id] = valid_recs
        
        return jsonify({"recommendations": recommendations}), 200
    
    except Exception as e:
        print(f"Error in get_healthy_recommendations: {e}")
        return jsonify({"error": str(e), "recommendations": {}}), 500

@app.route('/api/complaint/damage-detection', methods=['POST'])
def detect_damage():
    """
    Analyze parcel damage using Gemini AI.
    Receives an image (base64) and user comment, returns damage assessment.
    """
    try:
        data = request.json
        image_base64 = data.get('image')
        comment = data.get('comment', '').strip()
        
        if not image_base64:
            return jsonify({"error": "Image is required"}), 400
        
        # Initialize Gemini client
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        gcp_project_id = os.getenv("GCP_PROJECT_ID")
        
        if not gemini_api_key or not gcp_project_id:
            return jsonify({"error": "Gemini API credentials not configured"}), 500
        
        client = genai.Client(
            api_key=gemini_api_key,
        )
        
        # Decode base64 image
        try:
            # Remove data URL prefix if present
            if ',' in image_base64:
                image_base64 = image_base64.split(',')[1]
            
            image_data = base64.b64decode(image_base64)
        except Exception as e:
            return jsonify({"error": f"Invalid image data: {str(e)}"}), 400
        
        # Create prompt for damage detection
        prompt = f"""Analyze this parcel image and user comment to determine if there is actual physical damage to the parcel.

User Comment: "{comment}"

Please examine the image carefully and determine:
1. Is there visible physical damage to the parcel (dents, tears, holes, crushing, etc.)?
2. Is the damage significant enough to warrant a return/refund?
3. What type of damage is visible (if any)?

Respond with JSON only in this format:
{{
    "is_damaged": true/false,
    "damage_severity": "none" | "minor" | "moderate" | "severe",
    "damage_type": "description of damage type or 'none'",
    "reasoning": "brief explanation of your assessment",
    "recommendation": "approve_return" | "reject_return" | "needs_review"
}}

Be strict - only approve if there is clear, visible physical damage to the parcel itself (not just packaging wear)."""
        
        # Create content with image and text
        contents = [
            types.Content(
                role="user",
                parts=[
                    types.Part.from_bytes(
                        data=image_data,
                        mime_type="image/jpeg"
                    ),
                    types.Part.from_text(text=prompt),
                ],
            ),
        ]
        
        # Generate content with Gemini
        model = "gemini-2.0-flash-exp"
        try:
            response = client.models.generate_content(
                model=model,
                contents=contents,
            )
            
            # Extract text response
            response_text = ""
            if response.candidates and response.candidates[0].content:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'text'):
                        response_text += part.text
            
            # Parse JSON response
            try:
                # Try to extract JSON from response
                json_start = response_text.find('{')
                json_end = response_text.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = response_text[json_start:json_end]
                    result = json.loads(json_str)
                else:
                    # Fallback: create result from text
                    result = {
                        "is_damaged": "damage" in response_text.lower() or "damaged" in response_text.lower(),
                        "damage_severity": "moderate" if "moderate" in response_text.lower() else ("severe" if "severe" in response_text.lower() else "minor" if "minor" in response_text.lower() else "none"),
                        "damage_type": "Unknown",
                        "reasoning": response_text[:200],
                        "recommendation": "needs_review"
                    }
            except json.JSONDecodeError:
                # If JSON parsing fails, create a structured response
                result = {
                    "is_damaged": "damage" in response_text.lower() or "damaged" in response_text.lower(),
                    "damage_severity": "moderate",
                    "damage_type": "Unable to determine",
                    "reasoning": response_text[:200] if response_text else "Analysis completed",
                    "recommendation": "needs_review"
                }
            
            return jsonify({
                "success": True,
                "assessment": result
            }), 200
            
        except Exception as e:
            print(f"Gemini API error: {e}")
            return jsonify({"error": f"AI analysis failed: {str(e)}"}), 500
    
    except Exception as e:
        print(f"Error in damage detection: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"}), 200

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8080))
    app.run(host="0.0.0.0", port=port, debug=True)

