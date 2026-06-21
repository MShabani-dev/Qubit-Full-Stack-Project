from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterAPIView 

app_name = 'accounts'

urlpatterns = [
    # API endpoint for user registration
    path('register/', RegisterAPIView.as_view(), name='register'),
    
    # API endpoints for JWT login and token refresh (used by React frontend)
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
