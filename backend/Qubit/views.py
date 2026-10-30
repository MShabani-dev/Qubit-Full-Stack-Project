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
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer


from rest_framework.exceptions import ValidationError
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import (
    Topic,
    Entry,
    Vote,
    Like,
    UserProfile,
    UserFollow,
    TopicFollow,
    Report,
)
from .serializers import (
    TopicSerializer,
    EntrySerializer,
    LikeSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
    ProfileSerializer,
    RegisterSerializer,
    ReportSerializer,
)
from .permissions import IsOwnerOrReadOnly, IsAdminOrModerator, IsNotBanned


def _as_bool(value):
    """Parse booleans sent as JSON or form strings."""
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in ('1', 'true', 'yes', 'on')


class TopicViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Topic model with advanced search, filtering, sorting,
    like/unlike, hot topics, tag aggregation, and follow functionality.
    """
    serializer_class = TopicSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsNotBanned, IsOwnerOrReadOnly]

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

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsNotBanned])
    def like(self, request, pk=None):
        topic = self.get_object()
        existing_like = Like.objects.filter(user=request.user, topic=topic).first()

        if existing_like:
            existing_like.delete()
            is_liked = False
        else:
            Like.objects.create(user=request.user, topic=topic)
            is_liked = True

        return Response({
            'is_liked': is_liked,
            'likes_count': topic.topic_likes.count()
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsNotBanned])
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
    permission_classes = [IsAuthenticatedOrReadOnly, IsNotBanned, IsOwnerOrReadOnly]

    def get_serializer_context(self):
        return {'request': self.request}

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsNotBanned])
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

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsNotBanned])
    def like(self, request, pk=None):
        entry = self.get_object()
        existing_like = Like.objects.filter(user=request.user, entry=entry).first()

        if existing_like:
            existing_like.delete()
            is_liked = False
        else:
            Like.objects.create(user=request.user, entry=entry)
            is_liked = True

        return Response({
            'is_liked': is_liked,
            'likes_count': entry.entry_likes.count()
        })


class RegisterAPIView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class ProfileAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = ProfileSerializer(request.user, context={'request': request})
        return Response(serializer.data)


class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.action == 'update_me':
            return UserProfileUpdateSerializer
        return UserProfileSerializer

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated, IsNotBanned])
    def me(self, request):
        UserProfile.objects.get_or_create(user=request.user)
        serializer = UserProfileSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['put', 'patch'], permission_classes=[IsAuthenticated, IsNotBanned])
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

        read_serializer = UserProfileSerializer(request.user, context={'request': request})
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
        serializer = UserProfileSerializer(user, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, IsNotBanned])
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
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

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
                'id': f'topic_{topic.id}',
                'type': 'topic_created',
                'actor': topic.owner.username if topic.owner else 'Anonymous',
                'topic_id': topic.id,
                'topic_text': topic.text,
                'entry_id': None,
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

        activities.sort(key=lambda item: item['date'], reverse=True)
        activities = activities[:limit]

        return Response(activities)


class ReportViewSet(viewsets.ModelViewSet):
    """
    Report endpoints.

    - POST /api/reports/                Submit a report (any signed-in user)
    - GET  /api/reports/                Moderation queue (staff only)
    - GET  /api/reports/my/             Reports submitted by the current user
    - POST /api/reports/{id}/resolve/   Approve: remove content (staff only)
    - POST /api/reports/{id}/reject/    Dismiss the report (staff only)
    """
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated, IsNotBanned]

    def get_queryset(self):
        user = self.request.user
        qs = Report.objects.select_related(
            'reporter', 'resolved_by', 'topic', 'entry',
            'topic__owner', 'entry__author'
        )

        if user.is_staff or user.is_superuser:
            status_filter = self.request.query_params.get('status')
            if status_filter in dict(Report.STATUS_CHOICES):
                qs = qs.filter(status=status_filter)
            reason_filter = self.request.query_params.get('reason')
            if reason_filter in dict(Report.REASON_CHOICES):
                qs = qs.filter(reason=reason_filter)
            return qs

        # Regular users can only see their own reports
        return qs.filter(reporter=user)

    def get_serializer_context(self):
        return {'request': self.request}

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)

    def update(self, request, *args, **kwargs):
        return Response(
            {'detail': 'Reports cannot be edited. Use resolve or reject.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def destroy(self, request, *args, **kwargs):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {'detail': 'Only moderators can delete reports.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def my(self, request):
        """Return all reports submitted by the current user."""
        reports = Report.objects.filter(reporter=request.user).order_by('-created_at')
        serializer = self.get_serializer(reports, many=True)
        return Response(serializer.data)

    def _resolve(self, request, pk, new_status):
        """
        Shared logic for resolve and reject actions.
        Handles bulk-closing of related reports, content removal, and optional banning.
        """
        report = self.get_object()
        if report.status != Report.PENDING:
            return Response(
                {'detail': f'This report is already {report.status}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        note = (request.data.get('note') or '').strip()
        delete_content = _as_bool(request.data.get('delete_content', True))
        ban_user = _as_bool(request.data.get('ban_user', False))
        ban_duration_days = request.data.get('ban_duration_days')  # None = permanent

        with transaction.atomic():
            # Update this report
            report.status = new_status
            report.resolved_by = request.user
            report.resolved_at = timezone.now()
            report.resolution_note = note

            if new_status == Report.RESOLVED and delete_content:
                # Remove the flagged content; FK is SET_NULL so report row survives
                if report.topic_id and report.topic:
                    report.topic.delete()
                elif report.entry_id and report.entry:
                    report.entry.delete()
                report.content_removed = True

            report.save()

            # Bulk-close all other pending reports for the same piece of content
            Report.objects.filter(
                target_type=report.target_type,
                target_id=report.target_id,
                status=Report.PENDING,
            ).exclude(pk=report.pk).update(
                status=new_status,
                resolved_by=request.user,
                resolved_at=timezone.now(),
                resolution_note=f'Bulk-closed with report #{report.id}',
            )

            # Optionally ban the reported user
            if new_status == Report.RESOLVED and ban_user and report.reported_user:
                profile, _ = UserProfile.objects.get_or_create(user=report.reported_user)
                profile.is_banned = True
                profile.banned_at = timezone.now()
                profile.banned_reason = note or f'Banned via report #{report.id}'
                if ban_duration_days:
                    try:
                        profile.banned_until = timezone.now() + timedelta(
                            days=int(ban_duration_days)
                        )
                    except (ValueError, TypeError):
                        profile.banned_until = None  # Fall back to permanent
                else:
                    profile.banned_until = None  # Permanent ban
                profile.save()

        serializer = self.get_serializer(report)
        return Response(serializer.data)

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsAuthenticated, IsAdminOrModerator],
    )
    def resolve(self, request, pk=None):
        """Approve a report: remove content and/or ban the reported user."""
        return self._resolve(request, pk, Report.RESOLVED)

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsAuthenticated, IsAdminOrModerator],
    )
    def reject(self, request, pk=None):
        """Dismiss a report without taking action on the content."""
        return self._resolve(request, pk, Report.REJECTED)


class BanUserView(APIView):
    """
    POST /api/users/<username>/ban/   — ban a user directly (staff only)
    POST /api/users/<username>/unban/ — lift an existing ban (staff only)
    """
    permission_classes = [IsAuthenticated, IsAdminOrModerator]

    def post(self, request, username, action):
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        profile, _ = UserProfile.objects.get_or_create(user=user)

        if action == 'ban':
            reason = (request.data.get('reason') or '').strip()
            ban_duration_days = request.data.get('ban_duration_days')
            profile.is_banned = True
            profile.banned_at = timezone.now()
            profile.banned_reason = reason
            if ban_duration_days:
                try:
                    profile.banned_until = timezone.now() + timedelta(
                        days=int(ban_duration_days)
                    )
                except (ValueError, TypeError):
                    profile.banned_until = None
            else:
                profile.banned_until = None
            profile.save()
            return Response({'detail': f'{username} has been banned.'})

        if action == 'unban':
            profile.is_banned = False
            profile.banned_until = None
            profile.banned_reason = ''
            profile.banned_at = None
            profile.save()
            return Response({'detail': f'{username} has been unbanned.'})

        return Response(
            {'detail': 'Invalid action. Use "ban" or "unban".'},
            status=status.HTTP_400_BAD_REQUEST,
        )
class CustomTokenObtainPairView(TokenObtainPairView):
    """Login view: returns tokens plus username and role flags."""
    serializer_class = CustomTokenObtainPairSerializer
