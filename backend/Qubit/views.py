from datetime import timedelta

from rest_framework import viewsets, generics, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import (
    IsAuthenticatedOrReadOnly,
    IsAuthenticated,
    AllowAny,
)
from django.contrib.auth.models import User
from django.db.models import Count, Q
from django.utils import timezone

from .models import Topic, Entry, Vote, Like, UserProfile
from .serializers import (
    TopicSerializer,
    EntrySerializer,
    RegisterSerializer,
    ProfileSerializer,
    UserProfileSerializer,
)


class TopicViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Topic model with like/unlike and filtering by tags.
    """
    serializer_class = TopicSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        """
        Get all topics with optional search and tag filtering.
        Query params:
        - q: search in topic text
        - tag: filter by specific tag
        """
        qs = Topic.objects.all().order_by('-date_added')
        
        # Live search: /api/topics/?q=...  filters by topic text
        q = self.request.query_params.get('q')
        if q:
            qs = qs.filter(text__icontains=q)
        
        # Filter by tag: /api/topics/?tag=python
        tag = self.request.query_params.get('tag')
        if tag:
            qs = qs.filter(tags__icontains=tag)
        
        return qs

    def get_serializer_context(self):
        """Pass request to serializer for user-specific data"""
        return {'request': self.request}

    def perform_create(self, serializer):
        """Set the owner when creating a topic"""
        serializer.save(owner=self.request.user)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def hot(self, request):
        """
        Get hot topics (most entries in last 24 hours).
        Endpoint: /api/topics/hot/
        """
        since = timezone.now() - timedelta(hours=24)
        topics = (
            Topic.objects
            .annotate(
                recent_count=Count(
                    'entries',
                    filter=Q(entries__date_added__gte=since)
                )
            )
            .order_by('-recent_count', '-date_added')[:10]
        )
        serializer = self.get_serializer(topics, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def like(self, request, pk=None):
        """
        Toggle like on a topic.
        Endpoint: POST /api/topics/{id}/like/
        """
        topic = self.get_object()
        existing_like = Like.objects.filter(
            user=request.user,
            topic=topic
        ).first()

        if existing_like:
            # Unlike: remove the like
            existing_like.delete()
            is_liked = False
        else:
            # Like: create new like
            Like.objects.create(user=request.user, topic=topic)
            is_liked = True

        return Response({
            'is_liked': is_liked,
            'likes_count': topic.likes_count
        })

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def by_tag(self, request):
        """
        Get all unique tags with usage count.
        Endpoint: /api/topics/by_tag/
        """
        # Get all topics with tags
        topics_with_tags = Topic.objects.exclude(tags='')
        tag_dict = {}
        
        for topic in topics_with_tags:
            for tag in topic.tag_list:
                tag_dict[tag] = tag_dict.get(tag, 0) + 1
        
        # Convert to list of {tag, count} sorted by count
        tag_list = [
            {'tag': tag, 'count': count}
            for tag, count in sorted(
                tag_dict.items(),
                key=lambda x: x[1],
                reverse=True
            )
        ]
        
        return Response(tag_list)


class EntryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Entry model with voting and liking functionality.
    """
    queryset = Entry.objects.all().order_by('-date_added')
    serializer_class = EntrySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_serializer_context(self):
        """Pass request to serializer so it can compute my_vote and is_liked"""
        return {'request': self.request}

    def perform_create(self, serializer):
        """Attach the logged-in user as the author"""
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def vote(self, request, pk=None):
        """
        Toggle vote on an entry (upvote/downvote).
        Endpoint: POST /api/entries/{id}/vote/
        Body: {"value": 1} or {"value": -1}
        """
        entry = self.get_object()
        value = request.data.get('value')

        try:
            value = int(value)
        except (TypeError, ValueError):
            return Response(
                {'detail': 'value must be 1 or -1'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if value not in (Vote.UP, Vote.DOWN):
            return Response(
                {'detail': 'value must be 1 or -1'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing = Vote.objects.filter(user=request.user, entry=entry).first()

        if existing is None:
            # First time voting
            Vote.objects.create(user=request.user, entry=entry, value=value)
            my_vote = value
        elif existing.value == value:
            # Clicking the same arrow again removes the vote
            existing.delete()
            my_vote = 0
        else:
            # Switching from up to down (or vice versa)
            existing.value = value
            existing.save()
            my_vote = value

        return Response({'score': entry.score, 'my_vote': my_vote})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def like(self, request, pk=None):
        """
        Toggle like on an entry.
        Endpoint: POST /api/entries/{id}/like/
        """
        entry = self.get_object()
        existing_like = Like.objects.filter(
            user=request.user,
            entry=entry
        ).first()

        if existing_like:
            # Unlike: remove the like
            existing_like.delete()
            is_liked = False
        else:
            # Like: create new like
            Like.objects.create(user=request.user, entry=entry)
            is_liked = True

        return Response({
            'is_liked': is_liked,
            'likes_count': entry.likes_count
        })


class RegisterAPIView(generics.CreateAPIView):
    """
    API View for user registration.
    Endpoint: POST /api/register/
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class ProfileAPIView(APIView):
    """
    API View for the logged-in user's full profile.
    Endpoint: GET /api/profile/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get current user's profile with entries"""
        serializer = ProfileSerializer(
            request.user,
            context={'request': request}
        )
        return Response(serializer.data)


class UserProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for UserProfile model with custom actions.
    """
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """
        Get current user's profile.
        Endpoint: GET /api/profiles/me/
        """
        # FIXED: Pass User instance, not UserProfile
        serializer = UserProfileSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['put', 'patch'], permission_classes=[IsAuthenticated])
    def update_me(self, request):
        """
        Update current user's profile (UserProfile model fields).
        Endpoint: PUT/PATCH /api/profiles/update_me/
        """
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        
        # Update profile fields directly
        for field in ['bio', 'avatar_url', 'website', 'location']:
            if field in request.data:
                setattr(profile, field, request.data[field])
        profile.save()
        
        # Return the User serialization with updated profile
        serializer = UserProfileSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def by_username(self, request):
        """
        Get user profile by username.
        Endpoint: GET /api/profiles/by_username/?username=john
        """
        username = request.query_params.get('username')
        if not username:
            return Response(
                {'detail': 'username parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(username=username)
            # FIXED: Pass User instance, not UserProfile
            serializer = UserProfileSerializer(user, context={'request': request})
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class UserProfileAPIView(APIView):
    """
    Public API endpoint to fetch any user's profile by username.
    Returns 404 if user does not exist.
    No authentication required (public profiles).
    """
    permission_classes = [AllowAny]

    def get(self, request, username):
        """
        Get public profile for any user by username.
        Endpoint: GET /api/users/<username>/
        """
        try:
            # Fetch the user by username
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # CRITICAL FIX: Ensure UserProfile exists for this user
        UserProfile.objects.get_or_create(user=user)
        
        # Pass the User instance to UserProfileSerializer (not UserProfile)
        serializer = UserProfileSerializer(user, context={'request': request})
        
        return Response(serializer.data)
