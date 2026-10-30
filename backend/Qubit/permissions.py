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

        # Moderators can edit or remove any content
        if request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser):
            return True

        # Write permissions are only allowed to the owner/author
        # Topic has 'owner', Entry has 'author'
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        elif hasattr(obj, 'author'):
            return obj.author == request.user

        # If neither owner nor author exists, deny write access
        return False


class IsAdminOrModerator(permissions.BasePermission):
    """
    Allows access only to admin/staff users (moderators).
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_staff or request.user.is_superuser)
        )


class IsNotBanned(permissions.BasePermission):
    """
    Blocks write requests from users with an active ban.
    Safe methods (read) stay available, and anonymous users are handled
    by the authentication permission classes.
    """
    message = 'Your account is suspended. You cannot post or interact right now.'

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not request.user or not request.user.is_authenticated:
            return True
        profile = getattr(request.user, 'profile', None)
        return not (profile and profile.is_currently_banned)
