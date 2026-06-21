from rest_framework import generics
from rest_framework.permissions import AllowAny
from django.contrib.auth.models import User
from .serializers import RegisterSerializer

class RegisterAPIView(generics.CreateAPIView):
    # Allow any user (authenticated or not) to hit this endpoint
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer
