# Backend API Implementation Guide

This document describes the backend API endpoint that needs to be created to support the Money Saver feature.

## Endpoint

**POST** `/api/money-saver/recommendations`

## Request Body

```json
{
  "items": [
    {
      "id": 123,
      "name": "Hot Chocolate",
      "category": "Beverages",
      "price": 5.99,
      "description": "Rich hot chocolate drink"
    }
  ]
}
```

## Response Format

```json
{
  "recommendations": {
    "123": [
      {
        "id": 456,
        "name": "Hot Cocoa Mix",
        "category": "Beverages",
        "price": 3.49,
        "description": "Instant hot cocoa mix",
        "similarity": 0.85
      }
    ]
  }
}
```

## Implementation Steps

1. **Extract grocery items** from the request
2. **For each item:**
   - Use Google's Text Embedding Model (`text-embedding-005`) to create embeddings from `name` and `category`
   - Query Pinecone index `grocery` with:
     - Filter: `price < item.price`
     - Similarity threshold: `>= 0.5`
     - Max results: 10
   - For each candidate:
     - Use Azure OpenAI GPT-4.1 to judge if it's the same product
     - Send prompt with original product and candidate product details
     - Only include if GPT confirms it's the same product type
3. **Return recommendations** grouped by item ID

## Required Environment Variables

```python
PINECONE_API_KEY = "pcsk_D2zMz_AdNzbvbQoRWBCDVSKvFmE8rJatLxUpxrVxSPQgRw9spCLbBLYqzTGTHZRserLhP"
PINECONE_HOST = "https://data-n7q8h09.svc.aped-4627-b74a.pinecone.io"
INDEX_NAME = "grocery"
AZURE_OPENAI_KEY = "<your-key>"
AZURE_OPENAI_ENDPOINT = "https://aiprojects2984267134.openai.azure.com/"
AZURE_OPENAI_DEPLOYMENT = "gpt-4.1"
GOOGLE_EMBEDDING_MODEL = "text-embedding-005"
```

## Example Python Implementation

```python
from google.cloud import aiplatform
from pinecone import Pinecone
from openai import AzureOpenAI
import os

# Initialize clients
embedding_model = TextEmbeddingModel.from_pretrained("text-embedding-005")
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index("grocery")
openai_client, deployment = create_openai_client()

def get_recommendations(items):
    recommendations = {}
    
    for item in items:
        # Create embedding
        text = f"{item['name']} {item['category']}"
        embedding = embedding_model.get_embeddings([text])[0]
        
        # Query Pinecone
        results = index.query(
            vector=embedding,
            filter={"price": {"$lt": item["price"]}},
            top_k=10,
            include_metadata=True
        )
        
        # Filter by similarity and validate with GPT
        valid_recs = []
        for match in results.matches:
            if match.score >= 0.5:
                # Check with GPT if it's the same product
                prompt = f"""Compare these two products and determine if they are the same type of product (e.g., both are hot chocolate, both are eggs, etc.).

Original: {item['name']} - {item['description']} - €{item['price']}
Candidate: {match.metadata['name']} - {match.metadata['description']} - €{match.metadata['price']}

Respond with JSON: {{"is_same": true/false, "reason": "brief explanation"}}"""
                
                resp = openai_client.chat.completions.create(
                    model=deployment,
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"},
                    temperature=0.5
                )
                
                result = json.loads(resp.choices[0].message.content)
                if result["is_same"]:
                    valid_recs.append({
                        "id": match.id,
                        "name": match.metadata["name"],
                        "category": match.metadata.get("category", ""),
                        "price": match.metadata["price"],
                        "description": match.metadata.get("description", ""),
                        "similarity": match.score
                    })
        
        if valid_recs:
            recommendations[str(item["id"])] = valid_recs
    
    return {"recommendations": recommendations}
```

## Frontend Configuration

Set the API base URL in your `.env` file:

```
VITE_API_BASE_URL=http://localhost:8000
```

Or update `src/lib/api.js` with your backend URL.

