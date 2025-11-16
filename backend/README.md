# Backend API Server

This is the Flask backend server for the Money Saver recommendations feature.

## Setup

1. **Install dependencies:**
```bash
cd backend
pip install -r requirements.txt
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env and add your credentials
```

3. **Set up Google Cloud credentials:**
   - Download your Google Cloud service account JSON key file
   - Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
   ```
   Or add it to your `.env` file.

4. **Run the server:**
```bash
python app.py
```

The server will start on `http://localhost:8000`

## API Endpoints

### POST `/api/money-saver/recommendations`

Get cheaper alternatives for grocery items in the cart.

**Request:**
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

**Response:**
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
        "similarity": 0.85,
        "image_url": "https://...",
        "gcp_public_url": "https://..."
      }
    ]
  }
}
```

### GET `/health`

Health check endpoint.

## Environment Variables

- `PINECONE_API_KEY`: Your Pinecone API key
- `PINECONE_INDEX`: Pinecone index name (default: "grocery")
- `AZURE_OPENAI_KEY`: Your Azure OpenAI API key
- `AZURE_OPENAI_ENDPOINT`: Azure OpenAI endpoint
- `AZURE_OPENAI_DEPLOYMENT`: Deployment name (default: "gpt-4.1")
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to Google Cloud service account JSON
- `PORT`: Server port (default: 8000)

## Notes

- The backend uses Google's `text-embedding-005` model for creating embeddings
- Pinecone is queried with a price filter (`price < item.price`) and similarity threshold (>= 0.5)
- Azure OpenAI GPT-4.1 validates if recommended products are the same type
- Recommendations are sorted by price (cheapest first)

