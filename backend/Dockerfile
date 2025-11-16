FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Flask runs on port 8080 for Cloud Run
ENV PORT=8080

CMD ["python", "app.py"]
