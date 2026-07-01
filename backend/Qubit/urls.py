from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views
from .views import UserProfileAPIView, FeedAPIView, ActivityFeedAPIView

router = DefaultRouter()
router.register(r'topics', views.TopicViewSet, basename='topic')
router.register(r'entries', views.EntryViewSet, basename='entry')
router.register(r'profiles', views.UserProfileViewSet, basename='profile-vs')

urlpatterns = [
    # All router-generated routes are mounted under /api/
    path('api/', include(router.urls)),

    # Auth
    path('api/register/', views.RegisterAPIView.as_view(), name='register'),
    path('api/login/', TokenObtainPairView.as_view(), name='login'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Logged-in user's own full profile (entries + stats)
    path('api/profile/', views.ProfileAPIView.as_view(), name='profile'),

    # Public profile by username
    path('api/users/<str:username>/', UserProfileAPIView.as_view(), name='user-profile'),

    # Feed (Followed users and topics)
    path('api/feed/', FeedAPIView.as_view(), name='feed'),

    # Site-wide Activity Feed
    path('api/activity/', ActivityFeedAPIView.as_view(), name='activity'),
]
