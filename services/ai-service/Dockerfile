FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python manage.py collectstatic --noinput 2>/dev/null || true

EXPOSE 3067

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:3067", "--workers", "4", "--timeout", "120", "--access-logfile", "-"]
