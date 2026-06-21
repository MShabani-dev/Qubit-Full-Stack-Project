from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views
from .views import UserProfileAPIView

router = DefaultRouter()
router.register(r'topics', views.TopicViewSet, basename='topic')
router.register(r'entries', views.EntryViewSet, basename='entry')

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/register/', views.RegisterAPIView.as_view(), name='register'),
    path('api/login/', TokenObtainPairView.as_view(), name='login'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/profile/', views.ProfileAPIView.as_view(), name='profile'),
    path('api/users/<str:username>/', UserProfileAPIView.as_view(), name='user-profile'),
]
