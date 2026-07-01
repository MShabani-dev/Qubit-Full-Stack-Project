from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError


class Topic(models.Model):
    """
    Represents a discussion topic created by a user.
    Can have multiple entries (replies) and can be liked by users.
    """
    text = models.CharField(max_length=200)
    date_added = models.DateTimeField(auto_now_add=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='topics')
    # Comma-separated tags for categorization
    tags = models.CharField(
        max_length=200, 
        blank=True, 
        help_text="Comma-separated tags (e.g., 'python, django, api')"
    )

    class Meta:
        ordering = ['-date_added']

    def __str__(self):
        return self.text

    @property
    def likes_count(self):
        """Return total number of likes for this topic"""
        return self.topic_likes.count()

    @property
    def tag_list(self):
        """Convert comma-separated tags string into a list"""
        return [tag.strip() for tag in self.tags.split(',') if tag.strip()]

    @property
    def entry_count(self):
        """Return total number of entries (replies) for this topic"""
        return self.entries.count()


class Entry(models.Model):
    """
    Represents a reply/entry within a topic.
    Each entry has an author, can be voted on, and can be liked.
    Supports Markdown formatting in the text field.
    """
    # related_name='entries' lets us access topic.entries instead of topic.entry_set
    topic = models.ForeignKey(
        Topic, 
        on_delete=models.CASCADE, 
        related_name='entries'
    )
    # Author can be null for old rows; new entries set it from request.user
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='entries',
        null=True,
        blank=True,
    )
    # Text supports Markdown formatting
    text = models.TextField()
    date_added = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_added']
        verbose_name_plural = 'entries'

    @property
    def score(self):
        """Sum of all vote values (+1 / -1) for this entry"""
        return sum(v.value for v in self.votes.all())

    @property
    def likes_count(self):
        """Return total number of likes for this entry"""
        return self.entry_likes.count()

    def __str__(self):
        return f"{self.text[:50]}..."


class Vote(models.Model):
    """
    Represents an upvote or downvote on an entry.
    Each user can vote once per entry (enforced by unique_together).
    """
    UP = 1
    DOWN = -1
    VALUE_CHOICES = [(UP, 'Upvote'), (DOWN, 'Downvote')]

    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='votes'
    )
    entry = models.ForeignKey(
        Entry, 
        on_delete=models.CASCADE, 
        related_name='votes'
    )
    value = models.SmallIntegerField(choices=VALUE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # One vote per user per entry
        unique_together = ('user', 'entry')

    def __str__(self):
        return f"{self.user} voted {self.value} on entry {self.entry_id}"


class Like(models.Model):
    """
    Represents a like on either a Topic or an Entry (but not both).
    Each user can like each topic/entry only once.
    """
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='likes'
    )
    # A like can be for a topic OR an entry (one must be null)
    topic = models.ForeignKey(
        Topic, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='topic_likes'
    )
    entry = models.ForeignKey(
        Entry, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='entry_likes'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Ensure one like per user per topic and one like per user per entry
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'topic'],
                condition=models.Q(topic__isnull=False),
                name='unique_user_topic_like'
            ),
            models.UniqueConstraint(
                fields=['user', 'entry'],
                condition=models.Q(entry__isnull=False),
                name='unique_user_entry_like'
            ),
        ]
        ordering = ['-created_at']

    def clean(self):
        """Ensure a like is for exactly one of topic or entry"""
        if self.topic and self.entry:
            raise ValidationError('A like cannot be for both a topic and an entry.')
        if not self.topic and not self.entry:
            raise ValidationError('A like must be for either a topic or an entry.')

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        if self.topic:
            return f"{self.user.username} likes topic: {self.topic.text[:30]}"
        elif self.entry:
            return f"{self.user.username} likes entry: {self.entry.text[:30]}"
        return f"Like by {self.user.username}"


class UserProfile(models.Model):
    """
    Extended user profile with bio, avatar, and other metadata.
    Automatically created when a user registers.
    """
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='profile'
    )
    bio = models.TextField(max_length=500, blank=True)
    avatar_url = models.URLField(blank=True)
    website = models.URLField(blank=True)
    location = models.CharField(max_length=100, blank=True)
    joined_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username}'s profile"

    @property
    def topics_count(self):
        """Total topics created by this user"""
        return self.user.topics.count()

    @property
    def entries_count(self):
        """Total entries/replies created by this user"""
        return self.user.entries.count()

    @property
    def total_likes_received(self):
        """Total likes received on all topics and entries"""
        topic_likes = sum(topic.likes_count for topic in self.user.topics.all())
        entry_likes = sum(entry.likes_count for entry in self.user.entries.all())
        return topic_likes + entry_likes

class UserFollow(models.Model):
    follower = models.ForeignKey(User, related_name='following', on_delete=models.CASCADE)
    following = models.ForeignKey(User, related_name='followers', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('follower', 'following')

class TopicFollow(models.Model):
    user = models.ForeignKey(User, related_name='followed_topics', on_delete=models.CASCADE)
    topic = models.ForeignKey('Topic', related_name='followers', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'topic')