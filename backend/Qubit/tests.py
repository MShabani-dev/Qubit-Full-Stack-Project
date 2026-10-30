from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from rest_framework.test import APITestCase

from .models import Entry, Like, Topic, Vote


class ModelTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("ali", password="pass12345")
        self.topic = Topic.objects.create(
            text="Django", owner=self.user, tags="python, django"
        )

    def test_tag_list(self):
        self.assertEqual(self.topic.tag_list, ["python", "django"])

    def test_vote_is_unique_per_user_and_entry(self):
        entry = Entry.objects.create(topic=self.topic, text="hi", author=self.user)
        Vote.objects.create(user=self.user, entry=entry, value=Vote.UP)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Vote.objects.create(user=self.user, entry=entry, value=Vote.DOWN)

    def test_like_requires_exactly_one_target(self):
        from django.core.exceptions import ValidationError

        with self.assertRaises(ValidationError):
            Like.objects.create(user=self.user)


class AuthAndTopicAPITests(APITestCase):
    def _login(self):
        User.objects.create_user("sara", password="pass12345")
        res = self.client.post(
            "/api/login/", {"username": "sara", "password": "pass12345"}
        )
        self.assertEqual(res.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + res.data["access"])

    def test_register(self):
        res = self.client.post(
            "/api/register/",
            {"username": "new", "password": "pass12345", "email": "n@x.com"},
        )
        self.assertEqual(res.status_code, 201)
        self.assertTrue(User.objects.filter(username="new").exists())

    def test_topics_list_is_public(self):
        self.assertEqual(self.client.get("/api/topics/").status_code, 200)

    def test_create_topic_requires_auth(self):
        res = self.client.post("/api/topics/", {"text": "x"})
        self.assertIn(res.status_code, (401, 403))

    def test_create_topic_authenticated(self):
        self._login()
        res = self.client.post("/api/topics/", {"text": "Hello", "tags": "a"})
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Topic.objects.get().owner.username, "sara")
