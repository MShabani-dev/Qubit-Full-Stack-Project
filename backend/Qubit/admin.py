from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
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


# ---------------------------------------------------------------------------
# Topics & entries
# ---------------------------------------------------------------------------
class EntryInline(admin.TabularInline):
    model = Entry
    extra = 0
    fields = ('author', 'text', 'date_added')
    readonly_fields = ('date_added',)
    show_change_link = True


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ('id', 'text', 'owner', 'tags', 'entry_count', 'likes_count', 'date_added')
    list_filter = ('date_added',)
    search_fields = ('text', 'tags', 'owner__username')
    raw_id_fields = ('owner',)
    date_hierarchy = 'date_added'
    inlines = [EntryInline]


@admin.register(Entry)
class EntryAdmin(admin.ModelAdmin):
    list_display = ('id', 'short_text', 'topic', 'author', 'score', 'date_added')
    list_filter = ('date_added',)
    search_fields = ('text', 'author__username', 'topic__text')
    raw_id_fields = ('topic', 'author')
    date_hierarchy = 'date_added'

    @admin.display(description='Text')
    def short_text(self, obj):
        return obj.text[:60]


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'entry', 'value', 'created_at')
    list_filter = ('value',)
    search_fields = ('user__username',)
    raw_id_fields = ('user', 'entry')


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'topic', 'entry', 'created_at')
    search_fields = ('user__username',)
    raw_id_fields = ('user', 'topic', 'entry')


@admin.register(UserFollow)
class UserFollowAdmin(admin.ModelAdmin):
    list_display = ('id', 'follower', 'following', 'created_at')
    search_fields = ('follower__username', 'following__username')
    raw_id_fields = ('follower', 'following')


@admin.register(TopicFollow)
class TopicFollowAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'topic', 'created_at')
    search_fields = ('user__username', 'topic__text')
    raw_id_fields = ('user', 'topic')


# ---------------------------------------------------------------------------
# Users, profiles and bans
# ---------------------------------------------------------------------------
def _ban(queryset, reason):
    """Ban every user in the queryset (creates missing profiles)."""
    count = 0
    for user in queryset:
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.is_banned = True
        profile.banned_at = timezone.now()
        profile.banned_until = None
        profile.banned_reason = reason
        profile.save()
        count += 1
    return count


def _unban(queryset):
    count = 0
    for user in queryset:
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.is_banned = False
        profile.banned_at = None
        profile.banned_until = None
        profile.banned_reason = ''
        profile.save()
        count += 1
    return count


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    extra = 0
    max_num = 1
    fields = (
        'bio', 'avatar_url', 'website', 'location',
        'is_banned', 'banned_at', 'banned_until', 'banned_reason',
    )


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'is_banned', 'banned_until', 'joined_date')
    list_filter = ('is_banned',)
    search_fields = ('user__username', 'user__email')
    raw_id_fields = ('user',)
    readonly_fields = ('joined_date',)


class UserAdmin(BaseUserAdmin):
    inlines = [UserProfileInline]
    list_display = BaseUserAdmin.list_display + ('is_banned',)
    actions = ['ban_users', 'unban_users']

    @admin.display(boolean=True, description='Banned')
    def is_banned(self, obj):
        profile = getattr(obj, 'profile', None)
        return bool(profile and profile.is_banned)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('profile')

    @admin.action(description='Ban selected users (permanent)')
    def ban_users(self, request, queryset):
        # Never ban the acting admin or other superusers
        queryset = queryset.exclude(pk=request.user.pk).exclude(is_superuser=True)
        n = _ban(queryset, 'Banned by admin')
        self.message_user(request, f'{n} user(s) banned.')

    @admin.action(description='Unban selected users')
    def unban_users(self, request, queryset):
        n = _unban(queryset)
        self.message_user(request, f'{n} user(s) unbanned.')


admin.site.unregister(User)
admin.site.register(User, UserAdmin)


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------
@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'reporter', 'reason', 'status', 'topic', 'entry',
        'reported_user', 'created_at', 'resolved_by',
    )
    list_filter = ('status', 'reason', 'created_at')
    search_fields = ('description', 'reporter__username', 'reported_user__username')
    raw_id_fields = ('reporter', 'topic', 'entry', 'reported_user', 'resolved_by')
    readonly_fields = ('created_at', 'resolved_at')
    actions = ['mark_resolved', 'mark_rejected', 'ban_reported_users']

    def _close(self, request, queryset, status):
        n = queryset.filter(status=Report.PENDING).update(
            status=status,
            resolved_by=request.user,
            resolved_at=timezone.now(),
        )
        self.message_user(request, f'{n} report(s) updated.')

    @admin.action(description='Mark selected pending reports as resolved')
    def mark_resolved(self, request, queryset):
        self._close(request, queryset, Report.RESOLVED)

    @admin.action(description='Mark selected pending reports as rejected')
    def mark_rejected(self, request, queryset):
        self._close(request, queryset, Report.REJECTED)

    @admin.action(description='Ban the reported users of selected reports')
    def ban_reported_users(self, request, queryset):
        ids = queryset.exclude(reported_user__isnull=True).values_list('reported_user', flat=True)
        users = (
            User.objects.filter(pk__in=ids)
            .exclude(pk=request.user.pk)
            .exclude(is_superuser=True)
        )
        n = _ban(users, 'Banned via admin report action')
        self.message_user(request, f'{n} user(s) banned.')
