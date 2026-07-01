from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Topic, Entry, Vote, Like, UserProfile, UserFollow, TopicFollow


class EntrySerializer(serializers.ModelSerializer):
    author = serializers.ReadOnlyField(source='author.username')
    score = serializers.IntegerField(read_only=True)
    my_vote = serializers.SerializerMethodField()
    likes_count = serializers.IntegerField(read_only=True)
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Entry
        fields = [
            'id', 'text', 'date_added', 'topic', 'author',
            'score', 'my_vote', 'likes_count', 'is_liked'
        ]

    def get_my_vote(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        vote = obj.votes.filter(user=request.user).first()
        return vote.value if vote else 0

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.entry_likes.filter(user=request.user).exists()


class TopicSerializer(serializers.ModelSerializer):
    entries = EntrySerializer(many=True, read_only=True)
    owner = serializers.ReadOnlyField(source='owner.username')
    entry_count = serializers.SerializerMethodField()
    tag_list = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        write_only=True
    )
    tags = serializers.CharField(read_only=True)
    likes_count = serializers.IntegerField(read_only=True)
    is_liked = serializers.SerializerMethodField()
    
    # Follow fields
    is_followed = serializers.SerializerMethodField()
    followers_count = serializers.SerializerMethodField()

    class Meta:
        model = Topic
        fields = [
            'id', 'text', 'date_added', 'owner', 'entry_count',
            'entries', 'tags', 'tag_list', 'likes_count', 'is_liked',
            'is_followed', 'followers_count'
        ]
        read_only_fields = ['owner']

    def get_entry_count(self, obj):
        return obj.entries.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.topic_likes.filter(user=request.user).exists()

    def get_is_followed(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return TopicFollow.objects.filter(user=request.user, topic=obj).exists()

    def get_followers_count(self, obj):
        return obj.followers.count()

    def create(self, validated_data):
        tag_list = validated_data.pop('tag_list', [])
        topic = Topic.objects.create(**validated_data)
        if tag_list:
            topic.tags = ', '.join(tag_list)
            topic.save()
        return topic

    def update(self, instance, validated_data):
        tag_list = validated_data.pop('tag_list', None)
        if tag_list is not None:
            instance.tags = ', '.join(tag_list)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class LikeSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = Like
        fields = ['id', 'user', 'topic', 'entry', 'created_at']
        read_only_fields = ['user', 'created_at']


class UserProfileSerializer(serializers.ModelSerializer):
    topics_count = serializers.SerializerMethodField()
    entries_count = serializers.SerializerMethodField()
    total_score = serializers.SerializerMethodField()
    recent_entries = serializers.SerializerMethodField()
    recent_topics = serializers.SerializerMethodField()
    bio = serializers.CharField(source='profile.bio', read_only=True)
    avatar_url = serializers.URLField(source='profile.avatar_url', read_only=True)
    website = serializers.URLField(source='profile.website', read_only=True)
    location = serializers.CharField(source='profile.location', read_only=True)
    
    # Follow fields
    is_followed = serializers.SerializerMethodField()
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'date_joined', 'is_staff',
            'topics_count', 'entries_count', 'total_score',
            'recent_entries', 'recent_topics',
            'bio', 'avatar_url', 'website', 'location',
            'is_followed', 'followers_count', 'following_count'
        ]
        read_only_fields = ['username', 'email', 'date_joined', 'is_staff']

    def get_topics_count(self, obj):
        return Topic.objects.filter(owner=obj).count()

    def get_entries_count(self, obj):
        return Entry.objects.filter(author=obj).count()

    def get_total_score(self, obj):
        entries = Entry.objects.filter(author=obj)
        return sum(entry.score for entry in entries)

    def get_recent_entries(self, obj):
        entries = Entry.objects.filter(author=obj).order_by('-date_added')[:10]
        return [{
            'id': e.id,
            'text': e.text[:150] + '...' if len(e.text) > 150 else e.text,
            'date_added': e.date_added,
            'topic_id': e.topic.id,
            'topic_text': e.topic.text,
        } for e in entries]

    def get_recent_topics(self, obj):
        topics = Topic.objects.filter(owner=obj).order_by('-date_added')[:10]
        return [{
            'id': t.id,
            'text': t.text,
            'date_added': t.date_added,
            'entry_count': t.entries.count(),
        } for t in topics]

    def get_is_followed(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return UserFollow.objects.filter(follower=request.user, following=obj).exists()

    def get_followers_count(self, obj):
        return obj.followers.count()

    def get_following_count(self, obj):
        return obj.following.count()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'password', 'email']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
        )
        UserProfile.objects.get_or_create(user=user)
        return user


class ProfileSerializer(serializers.ModelSerializer):
    entries = EntrySerializer(many=True, read_only=True)
    entry_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'entry_count', 'entries']

    def get_entry_count(self, obj):
        return obj.entries.count()


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['bio', 'avatar_url', 'website', 'location']
