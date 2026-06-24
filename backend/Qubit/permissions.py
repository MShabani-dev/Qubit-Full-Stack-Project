from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    - For Topic: checks obj.owner == request.user
    - For Entry: checks obj.author == request.user
    - Read permissions are allowed to any request (GET, HEAD, OPTIONS).
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner/author
        # Topic has 'owner', Entry has 'author'
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        elif hasattr(obj, 'author'):
            return obj.author == request.user
        
        # If neither owner nor author exists, deny write access
        return False
