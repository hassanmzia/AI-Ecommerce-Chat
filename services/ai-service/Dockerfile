FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download spaCy English model for PII detection
RUN python -m spacy download en_core_web_sm

COPY . .

RUN python manage.py collectstatic --noinput 2>/dev/null || true

RUN chmod +x entrypoint.sh

EXPOSE 3067

CMD ["./entrypoint.sh"]
