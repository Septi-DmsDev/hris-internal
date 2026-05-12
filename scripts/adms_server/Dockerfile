FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir fastapi uvicorn apscheduler requests

# Copy script
COPY main.py .

# Folder persistent untuk SQLite
RUN mkdir -p /var/lib/adms-receiver

EXPOSE 8000

CMD ["uvicorn", "main:app_router", "--host", "0.0.0.0", "--port", "8000", "--log-level", "info"]
