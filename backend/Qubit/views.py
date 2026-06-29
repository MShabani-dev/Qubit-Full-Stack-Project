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
from .permissions import IsOwnerOrReadOnly


class TopicViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Topic model with advanced search, filtering, sorting,
    like/unlike, hot topics and tag aggregation.
    Only the owner can edit/delete their own topics.
    """
    serializer_class = TopicSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def get_queryset(self):
        """
        Build the topic queryset with advanced search and filtering.

        Supported query params:
        - q          : search inside topic text (case-insensitive)
        - author     : filter by the owner's username (exact, case-insensitive)
        - tag        : filter topics that contain a given tag
        - date       : time window filter -> 'today' | 'week' | 'month'
        - ordering   : sort mode -> 'newest' (default) | 'oldest'
                       | 'hottest' (most liked) | 'most_discussed' (most entries)
        - my_topics  : 'true' -> only the current authenticated user's topics
        """
        # Annotate aggregates once so we can both filter and sort efficiently.
        # NOTE: Use 'topic_likes' (not 'likes') because the Like model uses
        # related_name='topic_likes'.
        qs = Topic.objects.all().annotate(
            num_entries=Count('entries', distinct=True),
            num_likes=Count('topic_likes', distinct=True),
        )

        params = self.request.query_params

        # 1) Text search: /api/topics/?q=...
        q = params.get('q')
        if q:
            qs = qs.filter(text__icontains=q)

        # 2) Filter by author username: /api/topics/?author=john
        author = params.get('author')
        if author:
            qs = qs.filter(owner__username__iexact=author)

        # 3) Filter by tag: /api/topics/?tag=python
        tag = params.get('tag')
        if tag:
            qs = qs.filter(tags__icontains=tag)

        # 4) Date window filter: /api/topics/?date=today|week|month
        date_filter = params.get('date')
        if date_filter:
            now = timezone.now()
            if date_filter == 'today':
                since = now - timedelta(days=1)
            elif date_filter == 'week':
                since = now - timedelta(days=7)
            elif date_filter == 'month':
                since = now - timedelta(days=30)
            else:
                since = None
            if since is not None:
                qs = qs.filter(date_added__gte=since)

        # 5) My topics only: /api/topics/?my_topics=true
        # Filter to show only topics owned by the currently authenticated user.
        # This is the fix for the "My Topics" button functionality.
        my_topics = params.get('my_topics')
        if my_topics == 'true' and self.request.user.is_authenticated:
            qs = qs.filter(owner=self.request.user)

        # 6) Ordering / sorting
        ordering = params.get('ordering', 'newest')
        if ordering == 'oldest':
            qs = qs.order_by('date_added')
        elif ordering == 'hottest':
            # Most liked first, newest as tie-breaker
            qs = qs.order_by('-num_likes', '-date_added')
        elif ordering == 'most_discussed':
            # Most entries first, newest as tie-breaker
            qs = qs.order_by('-num_entries', '-date_added')
        else:
            # Default: newest first
            qs = qs.order_by('-date_added')

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
        # Get all topics that actually have tags
        topics_with_tags = Topic.objects.exclude(tags='')
        tag_dict = {}

        for topic in topics_with_tags:
            for tag in topic.tag_list:
                tag_dict[tag] = tag_dict.get(tag, 0) + 1

        # Convert to list of {tag, count} sorted by count (descending)
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
    Only the author can edit/delete their own entries.
    """
    queryset = Entry.objects.all().order_by('-date_added')
    serializer_class = EntrySerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

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
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Ensure UserProfile exists for this user
        UserProfile.objects.get_or_create(user=user)

        serializer = UserProfileSerializer(user, context={'request': request})

        return Response(serializer.data)
