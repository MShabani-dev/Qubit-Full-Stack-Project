# 🚀 Qubit - Learning Platform

A full-stack web application built with Django REST Framework (backend) and React + Vite (frontend).

## 🛠️ Tech Stack

### Backend
- Django 4.2
- Django REST Framework
- Simple JWT Authentication
- Djoser (User Management)
- SQLite Database

### Frontend
- React 18
- Vite
- Axios
- React Router
- Framer Motion

## 📋 Prerequisites

Before you begin, ensure you have:
- **Docker Desktop** installed ([Download](https://www.docker.com/products/docker-desktop))
- **Docker Compose** (included with Docker Desktop)
- **Git** installed ([Download](https://git-scm.com/downloads))

## 🐳 Quick Start with Docker

### 1. Clone the repository
```bash
git clone <your-repository-url>
cd qubit

### 2. Build and run containers
bash
# Build images and start containers
docker-compose up --build

# Or run in detached mode (background)
docker-compose up --build -d

### 3. Access the application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Django Admin**: http://localhost:8000/admin/

### 4. Create superuser (first time only)
bash
# While containers are running, open new terminal
docker-compose exec backend python manage.py createsuperuser

## 🔧 Docker Commands

### Starting & Stopping
bash
# Start containers
docker-compose up

# Start in background
docker-compose up -d

# Stop containers
docker-compose down

# Stop and remove volumes (deletes database!)
docker-compose down -v

### Viewing Logs
bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs frontend

# Follow logs in real-time
docker-compose logs -f

### Running Django Commands
bash
# Run migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Collect static files
docker-compose exec backend python manage.py collectstatic

# Open Django shell
docker-compose exec backend python manage.py shell

### Rebuilding Containers
bash
# Rebuild specific service
docker-compose build backend
docker-compose build frontend

# Rebuild all services
docker-compose build

# Force rebuild (no cache)
docker-compose build --no-cache

### Accessing Container Shell
bash
# Backend container shell
docker-compose exec backend sh

# Frontend container shell
docker-compose exec frontend sh

## 💻 Manual Setup (Without Docker)

### Backend Setup
bash
# Navigate to backend folder
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver

### Frontend Setup
bash
# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

## 📁 Project Structure


qubit/
├── backend/                    # Django backend
│   ├── ll_project/            # Project settings
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── Qubit/                 # Main app
│   ├── accounts/              # User authentication app
│   ├── manage.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── api.js
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml         # Docker orchestration
├── .gitignore
└── README.md

## 🔐 Environment Variables

### Backend (.env - optional)
env
DEBUG=True
SECRET_KEY=your-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=sqlite:///db.sqlite3

### Frontend (.env - optional)
env
VITE_API_URL=http://localhost:8000

## 🚀 Deployment Notes

For production deployment:

1. **Update settings.py**:
   
```python
   DEBUG = False
   ALLOWED_HOSTS = ['your-domain.com']
