"""
URL configuration for ll_project project.
"""

from django.contrib import admin
from django.urls import path, re_path, include
from django.contrib.staticfiles.views import serve as serve_static
from django.http import JsonResponse

# Simple health-check view for the root path
def health_check(request):
    return JsonResponse({"status": "ok", "message": "Backend is running"})

urlpatterns = [
    path('', health_check, name='health-check'),
    path('admin/', admin.site.urls),
    path('auth/', include('djoser.urls')),
    path('auth/', include('djoser.urls.jwt')),
    # Serve static files (admin CSS/JS) in development, even if DEBUG is False
    re_path(r'^static/(?P<path>.*)$', serve_static, {'insecure': True}),
    path('', include('Qubit.urls')),
]
