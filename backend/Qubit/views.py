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


from .models import Topic, Entry, Vote, Like, UserProfile, UserFollow, TopicFollow

from .serializers import (
    TopicSerializer,
    EntrySerializer,
    LikeSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
    ProfileSerializer,
    RegisterSerializer,
)

from .permissions import IsOwnerOrReadOnly


class TopicViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Topic model with advanced search, filtering, sorting,
    like/unlike, hot topics, tag aggregation, and follow functionality.
    """
    serializer_class = TopicSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def get_queryset(self):
        qs = Topic.objects.all().annotate(
            num_entries=Count('entries', distinct=True),
            num_likes=Count('topic_likes', distinct=True),
        )

        params = self.request.query_params

        q = params.get('q')
        if q:
            qs = qs.filter(text__icontains=q)

        author = params.get('author')
        if author:
            qs = qs.filter(owner__username__iexact=author)

        tag = params.get('tag')
        if tag:
            qs = qs.filter(tags__icontains=tag)

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

        my_topics = params.get('my_topics')
        if my_topics == 'true' and self.request.user.is_authenticated:
            qs = qs.filter(owner=self.request.user)

        ordering = params.get('ordering', 'newest')
        if ordering == 'oldest':
            qs = qs.order_by('date_added')
        elif ordering == 'hottest':
            qs = qs.order_by('-num_likes', '-date_added')
        elif ordering == 'most_discussed':
            qs = qs.order_by('-num_entries', '-date_added')
        else:
            qs = qs.order_by('-date_added')

        return qs

    def get_serializer_context(self):
        return {'request': self.request}

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def hot(self, request):
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
        topic = self.get_object()
        existing_like = Like.objects.filter(
            user=request.user,
            topic=topic
        ).first()

        if existing_like:
            existing_like.delete()
            is_liked = False
        else:
            Like.objects.create(user=request.user, topic=topic)
            is_liked = True

        return Response({
            'is_liked': is_liked,
            'likes_count': topic.likes_count if hasattr(topic, 'likes_count') else topic.topic_likes.count()
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def follow(self, request, pk=None):
        """Toggle follow on a topic."""
        topic = self.get_object()
        existing_follow = TopicFollow.objects.filter(user=request.user, topic=topic).first()

        if existing_follow:
            existing_follow.delete()
            is_followed = False
        else:
            TopicFollow.objects.create(user=request.user, topic=topic)
            is_followed = True

        return Response({
            'is_followed': is_followed,
            'followers_count': topic.followers.count()
        })

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def by_tag(self, request):
        topics_with_tags = Topic.objects.exclude(tags='')
        tag_dict = {}

        for topic in topics_with_tags:
            for tag in topic.tag_list:
                tag_dict[tag] = tag_dict.get(tag, 0) + 1

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
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def get_serializer_context(self):
        return {'request': self.request}

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def vote(self, request, pk=None):
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
            Vote.objects.create(user=request.user, entry=entry, value=value)
            my_vote = value
        elif existing.value == value:
            existing.delete()
            my_vote = 0
        else:
            existing.value = value
            existing.save()
            my_vote = value

        return Response({'score': entry.score, 'my_vote': my_vote})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def like(self, request, pk=None):
        entry = self.get_object()
        existing_like = Like.objects.filter(
            user=request.user,
            entry=entry
        ).first()

        if existing_like:
            existing_like.delete()
            is_liked = False
        else:
            Like.objects.create(user=request.user, entry=entry)
            is_liked = True

        return Response({
            'is_liked': is_liked,
            'likes_count': entry.likes_count if hasattr(entry, 'likes_count') else entry.entry_likes.count()
        })


class RegisterAPIView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class ProfileAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = ProfileSerializer(
            request.user,
            context={'request': request}
        )
        return Response(serializer.data)


class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.action == 'update_me':
            return UserProfileUpdateSerializer
        return UserProfileSerializer

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        UserProfile.objects.get_or_create(user=request.user)
        serializer = UserProfileSerializer(
            request.user, context={'request': request}
        )
        return Response(serializer.data)

    @action(detail=False, methods=['put', 'patch'], permission_classes=[IsAuthenticated])
    def update_me(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        partial = request.method == 'PATCH'

        write_serializer = UserProfileUpdateSerializer(
            instance=profile,
            data=request.data,
            partial=partial,
            context={'request': request},
        )
        write_serializer.is_valid(raise_exception=True)
        write_serializer.save()

        read_serializer = UserProfileSerializer(
            request.user, context={'request': request}
        )
        return Response(read_serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def by_username(self, request):
        username = request.query_params.get('username')
        if not username:
            return Response(
                {'detail': 'username parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        UserProfile.objects.get_or_create(user=user)
        serializer = UserProfileSerializer(
            user, context={'request': request}
        )
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def follow(self, request):
        """Toggle follow on a user by username."""
        username = request.data.get('username')
        if not username:
            return Response({'detail': 'username is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if target_user == request.user:
            return Response({'detail': 'You cannot follow yourself'}, status=status.HTTP_400_BAD_REQUEST)

        existing_follow = UserFollow.objects.filter(follower=request.user, following=target_user).first()

        if existing_follow:
            existing_follow.delete()
            is_followed = False
        else:
            UserFollow.objects.create(follower=request.user, following=target_user)
            is_followed = True

        return Response({
            'is_followed': is_followed,
            'followers_count': target_user.followers.count()
        })


class UserProfileAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, username):
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        UserProfile.objects.get_or_create(user=user)
        serializer = UserProfileSerializer(user, context={'request': request})
        return Response(serializer.data)


class FeedAPIView(APIView):
    """
    Returns entries from followed topics and followed users.
    Endpoint: GET /api/feed/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        followed_topic_ids = user.followed_topics.values_list('topic_id', flat=True)
        followed_user_ids = user.following.values_list('following_id', flat=True)

        feed_entries = Entry.objects.filter(
            Q(topic__id__in=followed_topic_ids) | Q(author__id__in=followed_user_ids)
        ).distinct().order_by('-date_added')[:50]

        serializer = EntrySerializer(feed_entries, many=True, context={'request': request})
        return Response(serializer.data)


class ActivityFeedAPIView(APIView):
    """
    Site-wide Activity Feed.
    Builds a merged, chronologically-sorted list of recent activities.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        limit = 20
        activities = []

        # 1) Recent topics created
        recent_topics = (
            Topic.objects
            .select_related('owner')
            .order_by('-date_added')[:limit]
        )
        for topic in recent_topics:
            activities.append({
                # Ensure id is absolutely unique for React keys
                'id': f'topic_{topic.id}', 
                'type': 'topic_created',
                'actor': topic.owner.username if topic.owner else 'Anonymous',
                'topic_id': topic.id,
                'topic_text': topic.text,
                'entry_id': None,
                # Explicitly pass none for entry_text since it's a topic creation
                'entry_text': None, 
                'date': topic.date_added,
            })

        # 2) Recent entries (replies)
        recent_entries = (
            Entry.objects
            .select_related('author', 'topic')
            .order_by('-date_added')[:limit]
        )
        for entry in recent_entries:
            activities.append({
                'id': f'entry_{entry.id}',
                'type': 'entry_created',
                'actor': entry.author.username if entry.author else 'Anonymous',
                'topic_id': entry.topic.id,
                'topic_text': entry.topic.text,
                'entry_id': entry.id,
                # Include entry text to differentiate the content
                'entry_text': entry.text, 
                'date': entry.date_added,
            })

        # 3) Recent likes
        recent_likes = (
            Like.objects
            .select_related('user', 'topic', 'entry', 'entry__topic')
            .order_by('-created_at')[:limit]
        )
        for like in recent_likes:
            if like.topic:
                topic_id = like.topic.id
                topic_text = like.topic.text
                entry_id = None
                entry_text = None
            elif like.entry:
                topic_id = like.entry.topic.id
                topic_text = like.entry.topic.text
                entry_id = like.entry.id
                entry_text = like.entry.text
            else:
                continue

            activities.append({
                'id': f'like_{like.id}',
                'type': 'like_created',
                'actor': like.user.username,
                'topic_id': topic_id,
                'topic_text': topic_text,
                'entry_id': entry_id,
                'entry_text': entry_text,
                'date': like.created_at,
            })

        # Merge all sources, sort by date (newest first), then cap the result
        activities.sort(key=lambda item: item['date'], reverse=True)
        activities = activities[:limit]

        return Response(activities)
