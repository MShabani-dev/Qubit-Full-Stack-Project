from rest_framework import serializers
from django.contrib.auth.models import User
from django.db.models import Sum
from .models import Topic, Entry, Vote, Like, UserProfile


class EntrySerializer(serializers.ModelSerializer):
    """
    Serializer for Entry model with author info, vote score, and like status.
    """
    # Show author's username (read-only) instead of its id
    author = serializers.ReadOnlyField(source='author.username')
    # Computed total score from the related votes
    score = serializers.IntegerField(read_only=True)
    # The current user's vote on this entry: 1, -1, or 0
    my_vote = serializers.SerializerMethodField()
    # Total number of likes
    likes_count = serializers.IntegerField(read_only=True)
    # Whether current user has liked this entry
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Entry
        fields = [
            'id', 'text', 'date_added', 'topic', 'author', 
            'score', 'my_vote', 'likes_count', 'is_liked'
        ]

    def get_my_vote(self, obj):
        """Return current user's vote value (1, -1, or 0)"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        vote = obj.votes.filter(user=request.user).first()
        return vote.value if vote else 0

    def get_is_liked(self, obj):
        """Return True if current user has liked this entry"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.entry_likes.filter(user=request.user).exists()


class TopicSerializer(serializers.ModelSerializer):
    """
    Serializer for Topic model with nested entries, tags, and like status.
    """
    # related_name is now 'entries', so source must match it
    entries = EntrySerializer(many=True, read_only=True)
    # Convenient owner username + entry count
    owner = serializers.ReadOnlyField(source='owner.username')
    entry_count = serializers.SerializerMethodField()
    # Tags support
    tag_list = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        write_only=True
    )
    tags = serializers.CharField(read_only=True)
    # Like info
    likes_count = serializers.IntegerField(read_only=True)
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Topic
        fields = [
            'id', 'text', 'date_added', 'owner', 'entry_count', 
            'entries', 'tags', 'tag_list', 'likes_count', 'is_liked'
        ]
        read_only_fields = ['owner']

    def get_entry_count(self, obj):
        """Return total number of entries for this topic"""
        return obj.entries.count()

    def get_is_liked(self, obj):
        """Return True if current user has liked this topic"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.topic_likes.filter(user=request.user).exists()

    def create(self, validated_data):
        """Handle tag_list on creation"""
        tag_list = validated_data.pop('tag_list', [])
        topic = Topic.objects.create(**validated_data)
        if tag_list:
            topic.tags = ', '.join(tag_list)
            topic.save()
        return topic

    def update(self, instance, validated_data):
        """Handle tag_list on update"""
        tag_list = validated_data.pop('tag_list', None)
        if tag_list is not None:
            instance.tags = ', '.join(tag_list)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class LikeSerializer(serializers.ModelSerializer):
    """
    Serializer for Like model (used internally).
    """
    user = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = Like
        fields = ['id', 'user', 'topic', 'entry', 'created_at']
        read_only_fields = ['user', 'created_at']


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Public user profile serializer based on Django User model.
    Computes stats from related Topic and Entry models.
    """
    topics_count = serializers.SerializerMethodField()
    entries_count = serializers.SerializerMethodField()
    total_score = serializers.SerializerMethodField()
    recent_entries = serializers.SerializerMethodField()
    recent_topics = serializers.SerializerMethodField()
    # Include UserProfile fields via nested serialization
    bio = serializers.CharField(source='profile.bio', read_only=True)
    avatar_url = serializers.URLField(source='profile.avatar_url', read_only=True)
    website = serializers.URLField(source='profile.website', read_only=True)
    location = serializers.CharField(source='profile.location', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'date_joined', 'is_staff',
            'topics_count', 'entries_count', 'total_score',
            'recent_entries', 'recent_topics',
            'bio', 'avatar_url', 'website', 'location'
        ]
        read_only_fields = ['username', 'email', 'date_joined', 'is_staff']

    def get_topics_count(self, obj):
        """Number of topics created by the user"""
        return Topic.objects.filter(owner=obj).count()

    def get_entries_count(self, obj):
        """Number of entries written by the user"""
        return Entry.objects.filter(author=obj).count()

    def get_total_score(self, obj):
        """Total score from all user's entries"""
        entries = Entry.objects.filter(author=obj)
        total = sum(entry.score for entry in entries)
        return total

    def get_recent_entries(self, obj):
        """Last 10 entries by the user"""
        entries = Entry.objects.filter(author=obj).order_by('-date_added')[:10]
        
        return [{
            'id': e.id,
            'text': e.text[:150] + '...' if len(e.text) > 150 else e.text,
            'date_added': e.date_added,
            'topic_id': e.topic.id,
            'topic_text': e.topic.text,
        } for e in entries]

    def get_recent_topics(self, obj):
        """Last 10 topics created by the user"""
        topics = Topic.objects.filter(owner=obj).order_by('-date_added')[:10]
        return [{
            'id': t.id,
            'text': t.text,
            'date_added': t.date_added,
            'entry_count': t.entries.count(),
        } for t in topics]


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    Automatically creates a UserProfile when user is created.
    """
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'password', 'email']

    def create(self, validated_data):
        """Create user and their profile"""
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
        )
        # Create associated profile
        UserProfile.objects.create(user=user)
        return user


class ProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for the logged-in user's full profile including their entries.
    """
    entries = EntrySerializer(many=True, read_only=True)
    entry_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'entry_count', 'entries']

    def get_entry_count(self, obj):
        """Return total entries by this user"""
        return obj.entries.count()
