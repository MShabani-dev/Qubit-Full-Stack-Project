# Use official Python runtime as base image
FROM python:3.11-slim

# Set environment variables
# Prevents Python from writing pyc files to disc
ENV PYTHONDONTWRITEBYTECODE=1
# Prevents Python from buffering stdout and stderr
ENV PYTHONUNBUFFERED=1

# Set work directory inside container
WORKDIR /app

# Install system dependencies (if needed for Pillow or other packages)
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file first (Docker layer caching optimization)
COPY requirements.txt /app/

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy entire Django project to container
COPY . /app/

# Create directory for static files
RUN mkdir -p /app/staticfiles

# Collect static files (optional, for production)
# RUN python manage.py collectstatic --noinput

# Expose port 8000 for Django development server
EXPOSE 8000

# Run Django development server
# In production, use gunicorn instead
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
