# urls.py
# Complete, corrected URL configuration.
# Fix: register UserProfileViewSet under the `profiles` prefix so that
# the @action endpoints (me / update_me / by_username) are exposed.
# Without this, PATCH /api/profiles/update_me/ returned 404 ->
# the frontend showed "Failed to update profile."

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views
from .views import UserProfileAPIView

router = DefaultRouter()
router.register(r'topics', views.TopicViewSet, basename='topic')
router.register(r'entries', views.EntryViewSet, basename='entry')
# NEW: exposes
#   GET   /api/profiles/me/
#   PUT   /api/profiles/update_me/
#   PATCH /api/profiles/update_me/
#   GET   /api/profiles/by_username/?username=<name>
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
]
