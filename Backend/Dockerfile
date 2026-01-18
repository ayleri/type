FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy application code
COPY . .

# Expose port
EXPOSE 8080

# Use gunicorn for production
CMD exec gunicorn --bind :8080 --workers 1 --threads 8 --timeout 0 run:app
