#!/bin/bash
set -e

echo "Running Django migrations..."
python manage.py makemigrations --noinput 2>&1 || true
python manage.py migrate --noinput 2>&1 || true

echo "Loading seed data (if management command exists)..."
python manage.py seed_data 2>&1 || true

echo "Starting Gunicorn..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:3067 \
    --workers 4 \
    --timeout 120 \
    --access-logfile -
