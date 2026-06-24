# 🚀 Qubit - Interactive Learning Platform

A modern full-stack web application for collaborative learning, featuring topic management, user profiles, and real-time content editing. Built with Django REST Framework and React, containerized with Docker for seamless deployment.

---

## 📖 Overview

**Qubit** is a collaborative learning platform that helps users organize knowledge through topics and entries. The application provides a clean interface for creating, managing, and sharing educational content with JWT-based authentication and role-based access control.

### Key Features

- **Topic Management**: Create, organize, and filter topics with tags and search
- **User Profiles**: Track contributions, scores, and recent activity
- **JWT Authentication**: Secure token-based authentication with auto-refresh
- **Markdown Support**: Rich text editing for formatted content
- **Responsive Design**: Mobile-first design with smooth animations
- **RESTful API**: Clean, documented API architecture

---

## 🛠️ Tech Stack

### Backend
- **Django** 4.2+ - Web framework
- **Django REST Framework** 3.14+ - API framework
- **Simple JWT** 5.3+ - JWT authentication
- **Djoser** 2.2+ - User management endpoints
- **django-cors-headers** 4.3+ - CORS handling
- **SQLite** - Database (development)

### Frontend
- **React** 18 - UI library
- **Vite** 5 - Build tool & dev server
- **React Router** 6 - Client-side routing
- **Axios** 1.6+ - HTTP client with interceptors
- **Framer Motion** 11 - Animation library
- **Node.js** 22 - JavaScript runtime

### DevOps
- **Docker** & **Docker Compose** - Containerization
- **Git** - Version control

---

## 📋 Prerequisites

Ensure you have installed:

- **Docker Desktop** 24.0+ ([Download](https://www.docker.com/products/docker-desktop))
  - Includes Docker Compose
  - Verify: `docker --version` && `docker compose version`
- **Git** 2.30+ ([Download](https://git-scm.com/downloads))
  - Verify: `git --version`

**Optional** (for manual setup):
- Python 3.11+
- Node.js 22+ & npm

---

## 🚀 Quick Start with Docker

### 1. Clone Repository
```bash
git clone https://github.com/conquest-sh/Qubit-Full-Stack-Project.git
cd Qubit-Full-Stack-Project

### 2. Build and Run

bash
# Build images and start containers
docker compose up --build

# Or run in detached mode (background)
docker compose up --build -d

**First run takes 3-5 minutes** to download base images.

### 3. Initialize Database

bash
# Run migrations (creates database tables)
docker compose exec backend python manage.py migrate

# Create admin user
docker compose exec backend python manage.py createsuperuser

### 4. Access Application

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | React application |
| **Backend API** | http://localhost:8000/api/ | REST API endpoints |
| **Django Admin** | http://localhost:8000/admin/ | Admin panel |

---

## 🐳 Docker Commands Reference

### Lifecycle

bash
# Start containers
docker compose up

# Start in background
docker compose up -d

# Stop containers (keeps data)
docker compose down

# Stop and remove volumes (deletes database!)
docker compose down -v

# Restart specific service
docker compose restart backend
docker compose restart frontend

### Building

bash
# Build all services
docker compose build

# Build specific service
docker compose build backend

# Rebuild without cache
docker compose build --no-cache

# Build and start
docker compose up --build

### Logs

bash
# View all logs
docker compose logs

# View specific service
docker compose logs backend
docker compose logs frontend

# Follow logs in real-time
docker compose logs -f

# Last 100 lines
docker compose logs --tail=100

### Execute Commands

bash
# Django management commands
docker compose exec backend python manage.py <command>

# Examples:
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py shell

# Access backend shell
docker compose exec backend sh

# Access frontend shell
docker compose exec frontend sh

# Run npm commands
docker compose exec frontend npm run <script>

---

## 💻 Manual Setup (Without Docker)

### Backend Setup

bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start server
python manage.py runserver

Backend runs at http://localhost:8000

### Frontend Setup

Open **new terminal**:

bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev

Frontend runs at http://localhost:5173

---

## 📁 Project Structure


Qubit-Full-Stack-Project/
│
├── backend/                          # Django REST API
│   ├── ll_project/                   # Project configuration
│   │   ├── settings.py               # Django settings (CORS, JWT, DB)
│   │   ├── urls.py                   # Main URL routing
│   │   └── wsgi.py                   # WSGI application
│   │
│   ├── Qubit/                        # Main application
│   │   ├── models.py                 # Topic and Entry models
│   │   ├── serializers.py            # DRF serializers
│   │   ├── views.py                  # ViewSets and API views
│   │   └── urls.py                   # App URL patterns
│   │
│   ├── accounts/                     # User authentication
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── urls.py
│   │
│   ├── manage.py                     # Django CLI
│   ├── requirements.txt              # Python dependencies
│   ├── Dockerfile                    # Backend container definition
│   └── db.sqlite3                    # SQLite database (gitignored)
│
├── frontend/                         # React application
│   ├── src/
│   │   ├── components/               # Reusable components
│   │   │   ├── Navbar.jsx
│   │   │   ├── AnimatedBackground.jsx
│   │   │   ├── MarkdownEditor.jsx
│   │   │   └── Profile.jsx
│   │   │
│   │   ├── pages/                    # Page components
│   │   │   ├── Home.jsx
│   │   │   ├── Topics.jsx
│   │   │   ├── TopicDetail.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   └── UserProfile.jsx
│   │   │
│   │   ├── api.js                    # Axios instance & interceptors
│   │   ├── App.jsx                   # Main app & routing
│   │   ├── main.jsx                  # React entry point
│   │   └── index.css                 # Global styles
│   │
│   ├── package.json                  # NPM dependencies
│   ├── vite.config.js                # Vite configuration
│   ├── Dockerfile                    # Frontend container definition
│   └── index.html                    # HTML entry point
│
├── docker-compose.yml                # Multi-container orchestration
├── .dockerignore                     # Docker ignore patterns
├── .gitignore                        # Git ignore patterns
└── README.md                         # This file

---

## 🔌 API Documentation

### Base URL

http://localhost:8000/api/

### Authentication

#### Obtain Token
http
POST /api/token/
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}

**Response:**
json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}

#### Refresh Token
http
POST /api/token/refresh/
Content-Type: application/json

{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}

### Topics

#### List Topics
http
GET /api/topics/
Authorization: Bearer <access_token>

Query Parameters:
  - q: Search query
  - tag: Filter by tag

#### Create Topic
http
POST /api/topics/
Authorization: Bearer <access_token>

{
  "title": "Topic Title",
  "description": "Description",
  "tags": ["tag1", "tag2"]
}

#### Update Topic
http
PUT /api/topics/{id}/
Authorization: Bearer <access_token>

{
  "title": "Updated Title"
}

#### Delete Topic
http
DELETE /api/topics/{id}/
Authorization: Bearer <access_token>

### User Profile
http
GET /api/user/{username}/

Response includes:
  - topics_count
  - entries_count
  - total_score
  - recent_topics
  - recent_entries

---

## ⚙️ Configuration

### Backend Environment (optional)

Create `backend/.env`:

env
DEBUG=True
SECRET_KEY=your-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173

### Frontend Environment (optional)

Create `frontend/.env`:

env
VITE_API_URL=http://localhost:8000

---

## 🔧 Development Guide

### Hot Module Replacement

Both services support hot reloading:
- **Frontend**: Vite HMR updates React components instantly
- **Backend**: Django auto-reloads on file changes

### Running Tests

bash
# Backend tests
docker compose exec backend python manage.py test

# Frontend tests (if configured)
docker compose exec frontend npm test

### Database Management

bash
# Create migrations
docker compose exec backend python manage.py makemigrations

# Apply migrations
docker compose exec backend python manage.py migrate

# Django shell
docker compose exec backend python manage.py shell

### Reset Database

bash
docker compose down -v
docker compose up --build
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser

---

## 🐛 Troubleshooting

### Frontend Not Loading

**Check logs:**
bash
docker compose logs frontend

**Rebuild:**
bash
docker compose build --no-cache frontend
docker compose up

### Backend API Errors

**Check logs:**
bash
docker compose logs backend

**Verify migrations:**
bash
docker compose exec backend python manage.py showmigrations
docker compose exec backend python manage.py migrate

### CORS Errors

Verify `settings.py`:
python
CORS_ALLOWED_ORIGINS = [
"http://localhost:5173",
"http://127.0.0.1:5173",
]

Restart backend:
bash
docker compose restart backend

### Token Issues

Clear browser localStorage:
javascript
localStorage.clear()

### Port Already in Use

**Windows:**
bash
netstat -ano | findstr :8000

**macOS/Linux:**
bash
lsof -i :8000

---

## 🚀 Deployment

### Production Checklist

**Backend (`settings.py`):**
python
DEBUG = False
SECRET_KEY = os.environ.get('SECRET_KEY')
ALLOWED_HOSTS = ['yourdomain.com']

# Use PostgreSQL
DATABASES = {
'default': {
'ENGINE': 'django.db.backends.postgresql',
'NAME': os.environ.get('DB_NAME'),
'USER': os.environ.get('DB_USER'),
'PASSWORD': os.environ.get('DB_PASSWORD'),
'HOST': os.environ.get('DB_HOST'),
}
}

**Frontend:**
env
VITE_API_URL=https://api.yourdomain.com

**Build:**
bash
npm run build

**Deployment Platforms:**
- Backend: Railway, Render, AWS, DigitalOcean
- Frontend: Vercel, Netlify, Cloudflare Pages

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request


## 👤 Author

**Mohammad Shabani**

- GitHub: [@MShabani-dev](https://github.com/MShabani-dev)
- Email: Mohammad.sh7283@gmail.com

---

## 📞 Support

For issues:
1. Check [Troubleshooting](#troubleshooting)
2. Search [Issues](https://github.com/MShabani-dev/Qubit-Full-Stack-Project/issues)
3. Open [New Issue](https://github.com/MShabani-dev/Qubit-Full-Stack-Project/issues/new)
