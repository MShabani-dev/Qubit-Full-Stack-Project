import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  Send,
  MessageSquare,
  Clock,
  Eye,
  Edit3,
  ChevronUp,
  ChevronDown,
  Heart,
  User,
  Tag as TagIcon,
  Bold,
  Italic,
  Code,
  List,
  Link as LinkIcon,
  Image as ImageIcon,
  Check,
  X,
  Bookmark,
} from "lucide-react";
import AnimatedBackground from "../components/AnimatedBackground";
import { followTopic } from "../api/api"; // Adjust the path as needed

/* ========================================================================== */
/*  MARKDOWN TOOLBAR COMPONENT                                                */
/* ========================================================================== */
function MarkdownToolbar({ onInsert }) {
  const tools = [
    { icon: Bold, syntax: "**bold text**", label: "Bold" },
    { icon: Italic, syntax: "*italic text*", label: "Italic" },
    { icon: Code, syntax: "`code`", label: "Inline Code" },
    { icon: List, syntax: "- list item", label: "Bullet List" },
    { icon: LinkIcon, syntax: "[text](url)", label: "Link" },
    { icon: ImageIcon, syntax: "![alt](image-url)", label: "Image" },
  ];

  return (
    <div className="flex items-center gap-1 p-2 border-b border-cyan-500/20 bg-[#0a1628]/80">
      {tools.map((tool) => (
        <button
          key={tool.label}
          type="button"
          onClick={() => onInsert(tool.syntax)}
          className="p-2 rounded hover:bg-cyan-500/10 text-cyan-400/60 hover:text-cyan-300 transition-colors duration-200"
          title={tool.label}
          aria-label={tool.label}
        >
          <tool.icon size={16} />
        </button>
      ))}
    </div>
  );
}

/* ========================================================================== */
/*  ENTRY CARD COMPONENT                                                      */
/* ========================================================================== */
function EntryCard({ entry, token, onUpdate }) {
  const isAuthenticated = Boolean(token);

  const [score, setScore] = useState(entry.score ?? 0);
  const [myVote, setMyVote] = useState(entry.my_vote ?? 0);
  const [voting, setVoting] = useState(false);

  const [likeCount, setLikeCount] = useState(entry.likes_count ?? 0);
  const [myLike, setMyLike] = useState(entry.is_liked ?? false);
  const [liking, setLiking] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(entry.text);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const currentUser = localStorage.getItem("username");
  const isOwner = entry.author === currentUser;

  const sendVote = async (value) => {
    if (!isAuthenticated || voting) return;

    const prevScore = score;
    const prevVote = myVote;
    const nextVote = myVote === value ? 0 : value;
    const delta = nextVote - myVote;

    setMyVote(nextVote);
    setScore(prevScore + delta);
    setVoting(true);

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/entries/${entry.id}/vote/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ value }),
        }
      );

      if (!res.ok) throw new Error("Vote failed");

      const data = await res.json();
      if (typeof data.score === "number") setScore(data.score);
      if (typeof data.my_vote === "number") setMyVote(data.my_vote);
    } catch (error) {
      console.error("Vote error:", error);
      setScore(prevScore);
      setMyVote(prevVote);
    } finally {
      setVoting(false);
    }
  };

  const toggleLike = async () => {
    if (!isAuthenticated || liking) return;

    const prevLikeCount = likeCount;
    const prevMyLike = myLike;
    const nextMyLike = !myLike;

    setMyLike(nextMyLike);
    setLikeCount(prevLikeCount + (nextMyLike ? 1 : -1));
    setLiking(true);

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/entries/${entry.id}/like/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error("Like failed");

      const data = await res.json();
      if (typeof data.likes_count === "number") setLikeCount(data.likes_count);
      if (typeof data.is_liked === "boolean") setMyLike(data.is_liked);
    } catch (error) {
      console.error("Like error:", error);
      setLikeCount(prevLikeCount);
      setMyLike(prevMyLike);
    } finally {
      setLiking(false);
    }
  };

  const handleUpdate = async () => {
    if (!editedText.trim() || saving) return;

    setSaving(true);

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/entries/${entry.id}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text: editedText }),
        }
      );

      if (!res.ok) throw new Error("Failed to update entry");

      const data = await res.json();
      setIsEditing(false);
      setShowPreview(false);
      if (onUpdate) onUpdate(data);
    } catch (error) {
      console.error("Update entry error:", error);
      alert("Failed to update entry. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const insertMarkdown = (syntax) => {
    setEditedText((prev) => {
      return prev ? `${prev}\n${syntax}` : syntax;
    });
  };

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-[#0a1628]/60 backdrop-blur-sm p-4 flex gap-3 hover:border-cyan-500/30 transition-colors duration-300 shadow-lg">
      <div className="flex flex-col items-center gap-1 select-none">
        <button
          type="button"
          onClick={() => sendVote(1)}
          disabled={!isAuthenticated || voting}
          className={`transition-all duration-200 ${
            myVote === 1
              ? "text-cyan-400 scale-110"
              : "text-slate-500 hover:text-cyan-400 hover:scale-110"
          } disabled:opacity-40 disabled:cursor-not-allowed`}
          aria-label="Upvote"
        >
          <ChevronUp size={20} strokeWidth={2.5} />
        </button>

        <motion.span
          key={score}
          initial={{ scale: 0.7, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
          className={`text-sm font-bold ${
            score > 0
              ? "text-cyan-400"
              : score < 0
              ? "text-rose-400"
              : "text-slate-400"
          }`}
        >
          {score}
        </motion.span>

        <button
          type="button"
          onClick={() => sendVote(-1)}
          disabled={!isAuthenticated || voting}
          className={`transition-all duration-200 ${
            myVote === -1
              ? "text-rose-400 scale-110"
              : "text-slate-500 hover:text-rose-400 hover:scale-110"
          } disabled:opacity-40 disabled:cursor-not-allowed`}
          aria-label="Downvote"
        >
          <ChevronDown size={20} strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-400">
                Edit Entry
              </span>
              <button
                type="button"
                onClick={() => setShowPreview((p) => !p)}
                className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors duration-200 font-medium"
              >
                {showPreview ? (
                  <>
                    <Edit3 size={14} /> Edit
                  </>
                ) : (
                  <>
                    <Eye size={14} /> Preview
                  </>
                )}
              </button>
            </div>

            <div className="rounded-lg border border-cyan-500/30 bg-[#020617]/80 backdrop-blur-md overflow-hidden">
              {!showPreview && <MarkdownToolbar onInsert={insertMarkdown} />}

              {showPreview ? (
                <div className="min-h-[100px] max-h-[300px] overflow-y-auto px-3 py-2 prose prose-invert prose-sm max-w-none text-slate-300 break-words prose-pre:bg-[#020617] prose-pre:border prose-pre:border-cyan-500/20 prose-code:text-cyan-300 prose-headings:text-cyan-400 prose-a:text-cyan-400">
                  <ReactMarkdown>
                    {editedText.trim() || "*Nothing to preview yet...*"}
                  </ReactMarkdown>
                </div>
              ) : (
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.ctrlKey) handleUpdate();
                    if (e.key === "Escape") {
                      setEditedText(entry.text);
                      setIsEditing(false);
                      setShowPreview(false);
                    }
                  }}
                  className="w-full px-3 py-2 text-slate-200 placeholder-slate-500 bg-transparent outline-none resize-none font-mono text-sm"
                  rows={6}
                  disabled={saving}
                  autoFocus
                  placeholder="Write your entry here... (Markdown supported)"
                />
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleUpdate}
                disabled={saving || !editedText.trim()}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Check size={16} />
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditedText(entry.text);
                  setIsEditing(false);
                  setShowPreview(false);
                }}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <X size={16} />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="prose prose-invert prose-sm max-w-none text-slate-300 break-words prose-pre:bg-[#020617] prose-pre:border prose-pre:border-cyan-500/20 prose-code:text-cyan-300 prose-headings:text-cyan-400 prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline">
              <ReactMarkdown>{entry.text}</ReactMarkdown>
            </div>

            <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3 text-xs text-slate-500">
                {entry.author && (
                  <Link
                    to={`/users/${entry.author}`}
                    className="text-cyan-400 hover:text-cyan-300 transition-colors duration-200 flex items-center gap-1"
                  >
                    <User size={12} />
                    <span className="font-medium">{entry.author}</span>
                  </Link>
                )}

                {entry.date_added && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(entry.date_added).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}

                {isOwner && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors duration-200"
                  >
                    <Edit3 size={12} />
                    Edit
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={toggleLike}
                disabled={!isAuthenticated || liking}
                className={`flex items-center gap-1 text-sm transition-all duration-200 px-2 py-1 rounded ${
                  myLike
                    ? "text-rose-400 bg-rose-400/10"
                    : "text-slate-500 hover:text-rose-400 hover:bg-rose-400/5"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
                aria-label={myLike ? "Unlike" : "Like"}
              >
                <Heart
                  size={16}
                  fill={myLike ? "currentColor" : "none"}
                  className="transition-transform duration-200 hover:scale-110"
                />
                <span className="font-semibold">{likeCount}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ========================================================================== */
/* MAIN: TOPIC DETAIL PAGE */
/* ========================================================================== */

export default function TopicDetail() {
  const { id } = useParams();

  const [topic, setTopic] = useState(null);
  const [entries, setEntries] = useState([]);
  const [newEntry, setNewEntry] = useState("");
  const [loading, setLoading] = useState(true);

  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [topicLikeCount, setTopicLikeCount] = useState(0);
  const [myTopicLike, setMyTopicLike] = useState(false);
  const [topicLiking, setTopicLiking] = useState(false);

  // Topic Follow System State
  const [isFollowed, setIsFollowed] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingState, setFollowingState] = useState(false);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  const token = localStorage.getItem("access");
  const isAuthenticated = Boolean(token);
  const currentUser = localStorage.getItem("username");
  const isOwner = topic?.owner === currentUser;

  const loadTopic = async () => {
    try {
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(`http://127.0.0.1:8000/api/topics/${id}/`, {
        headers,
      });

      if (!res.ok) throw new Error("Failed to load topic");
      const data = await res.json();

      setTopic(data);
      setEntries(data.entries ?? []);
      setTopicLikeCount(data.likes_count ?? 0);
      setMyTopicLike(data.is_liked ?? false);
      setEditedTitle(data.text ?? "");
      
      // Init Follow State
      setIsFollowed(data.is_followed ?? false);
      setFollowersCount(data.followers_count ?? 0);
    } catch (error) {
      console.error("Load topic error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopic();
  }, [id]);

  const handleEntryUpdate = (updatedEntry) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === updatedEntry.id ? updatedEntry : e))
    );
  };

  const handleToggleFollow = async () => {
    if (!isAuthenticated || followingState) return;
    setFollowingState(true);
    
    const prevIsFollowed = isFollowed;
    const prevFollowersCount = followersCount;
    
    setIsFollowed(!prevIsFollowed);
    setFollowersCount(prevFollowersCount + (!prevIsFollowed ? 1 : -1));

    try {
      const data = await followTopic(id);
      if (typeof data.followers_count === "number") setFollowersCount(data.followers_count);
      if (typeof data.is_followed === "boolean") setIsFollowed(data.is_followed);
    } catch (error) {
      console.error("Topic follow error:", error);
      setIsFollowed(prevIsFollowed);
      setFollowersCount(prevFollowersCount);
    } finally {
      setFollowingState(false);
    }
  };

  const toggleTopicLike = async () => {
    if (!isAuthenticated || topicLiking) return;

    const prevCount = topicLikeCount;
    const prevLike = myTopicLike;
    const nextLike = !myTopicLike;

    setMyTopicLike(nextLike);
    setTopicLikeCount(prevCount + (nextLike ? 1 : -1));
    setTopicLiking(true);

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/topics/${id}/like/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Topic like failed");

      const data = await res.json();
      if (typeof data.likes_count === "number")
        setTopicLikeCount(data.likes_count);
      if (typeof data.is_liked === "boolean") setMyTopicLike(data.is_liked);
    } catch (error) {
      console.error("Topic like error:", error);
      setTopicLikeCount(prevCount);
      setMyTopicLike(prevLike);
    } finally {
      setTopicLiking(false);
    }
  };

  const handleTitleUpdate = async () => {
    if (!editedTitle.trim() || savingTitle) return;

    setSavingTitle(true);

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/topics/${id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: editedTitle }),
      });

      if (!res.ok) throw new Error("Failed to update title");

      const data = await res.json();
      setTopic((prev) => ({ ...prev, text: data.text }));
      setIsEditingTitle(false);
    } catch (error) {
      console.error("Update title error:", error);
      alert("Failed to update title. Please try again.");
    } finally {
      setSavingTitle(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newEntry.trim() || submitting) return;

    setSubmitting(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/entries/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: newEntry, topic: Number(id) }),
      });

      if (!res.ok) throw new Error("Failed to create entry");

      const created = await res.json();
      setEntries((prev) => [created, ...prev]);
      setNewEntry("");
      setShowPreview(false);
    } catch (error) {
      console.error("Submit entry error:", error);
      alert("Failed to submit entry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const insertMarkdown = (syntax) => {
    setNewEntry((prev) => {
      return prev ? `${prev}\n${syntax}` : syntax;
    });
  };

  if (loading) {
    return (
      <div className="relative min-h-screen bg-[#020617]">
        <AnimatedBackground />
        <div className="relative z-10 flex justify-center items-center py-32">
          <div className="h-10 w-10 rounded-full border-3 border-cyan-400 border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="relative min-h-screen bg-[#020617]">
        <AnimatedBackground />
        <div className="relative z-10 text-center py-32">
          <h2 className="text-2xl font-bold text-slate-500 mb-4">
            Topic not found
          </h2>
          <Link
            to="/topics"
            className="text-cyan-400 hover:text-cyan-300 transition-colors duration-200"
          >
            ← Back to Topics
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#020617] text-white overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-cyan-500/30 bg-[#0a1628]/80 backdrop-blur-md p-6 shadow-[0_0_40px_rgba(6,182,212,0.15)]"
        >
          {isEditingTitle ? (
            <div className="mb-4">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleUpdate();
                  if (e.key === "Escape") {
                    setEditedTitle(topic.text);
                    setIsEditingTitle(false);
                  }
                }}
                className="w-full text-3xl md:text-4xl font-bold font-display bg-transparent border-b-2 border-cyan-400 text-cyan-400 outline-none pb-2"
                disabled={savingTitle}
                autoFocus
              />
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleTitleUpdate}
                  disabled={savingTitle || !editedTitle.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Check size={16} /> Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditedTitle(topic.text);
                    setIsEditingTitle(false);
                  }}
                  disabled={savingTitle}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <X size={16} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 mb-4">
              <h1 className="flex-1 text-3xl md:text-4xl font-bold font-display bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                {topic.text}
              </h1>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(true)}
                  className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all duration-200"
                  title="Edit title"
                >
                  <Edit3 size={20} />
                </button>
              )}
            </div>
          )}

          {topic.tags && topic.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {topic.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-transform duration-200 hover:scale-105"
                  style={{
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                    border: `1px solid ${tag.color}40`,
                  }}
                >
                  <TagIcon size={12} />
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 text-sm text-slate-500">
              {topic.owner && (
                <Link
                  to={`/users/${topic.owner}`}
                  className="text-cyan-400 hover:text-cyan-300 transition-colors duration-200 flex items-center gap-1 font-medium"
                >
                  <User size={14} />
                  {topic.owner}
                </Link>
              )}
              <span className="flex items-center gap-1">
                <Clock size={14} className="text-cyan-400" />
                {topic.date_added
                  ? new Date(topic.date_added).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : ""}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare size={14} className="text-cyan-400" />
                {entries.length} {entries.length === 1 ? "entry" : "entries"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Follow Button */}
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleToggleFollow}
                  disabled={followingState}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                    isFollowed
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300 border border-transparent"
                  } disabled:opacity-50`}
                >
                  <Bookmark size={18} fill={isFollowed ? "currentColor" : "none"} />
                  <span>{isFollowed ? "Following" : "Follow"}</span>
                  <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-black/30">
                    {followersCount}
                  </span>
                </button>
              )}

              {/* Like Button */}
              <button
                type="button"
                onClick={toggleTopicLike}
                disabled={!isAuthenticated || topicLiking}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                  myTopicLike
                    ? "bg-rose-500/20 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <Heart
                  size={18}
                  fill={myTopicLike ? "currentColor" : "none"}
                  className="transition-transform duration-200 hover:scale-110"
                />
                <span>{topicLikeCount}</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* ... Entries and Form (same as original code) ... */}
        <div className="mt-10">
          <h2 className="text-2xl font-bold font-display text-cyan-400 mb-6 flex items-center gap-2">
            <MessageSquare size={24} />
            Entries
          </h2>
          <div className="space-y-4">
            {entries.length === 0 ? (
              <div className="text-center py-12 text-slate-500 bg-[#0a1628]/40 rounded-xl border border-cyan-500/10">
                <MessageSquare size={48} className="mx-auto mb-3 opacity-30" />
                <p>No entries yet. Be the first to start the conversation!</p>
              </div>
            ) : (
              entries.map((entry, index) => (
                <motion.div
                  key={entry.id ?? index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <EntryCard entry={entry} token={token} onUpdate={handleEntryUpdate} />
                </motion.div>
              ))
            )}
          </div>
        </div>

        {isAuthenticated ? (
          <motion.form
            onSubmit={handleSubmit}
            className="mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-400">
                Write your entry
              </label>
              <button
                type="button"
                onClick={() => setShowPreview((p) => !p)}
                className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors duration-200 font-medium"
              >
                {showPreview ? <><Edit3 size={14} /> Edit</> : <><Eye size={14} /> Preview</>}
              </button>
            </div>

            <div className="rounded-xl border border-cyan-500/30 bg-[#0a1628]/80 backdrop-blur-md overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.1)]">
              {!showPreview && <MarkdownToolbar onInsert={insertMarkdown} />}
              {showPreview ? (
                <div className="min-h-[150px] max-h-[400px] overflow-y-auto px-4 py-3 prose prose-invert prose-sm max-w-none text-slate-300 break-words prose-pre:bg-[#020617] prose-pre:border prose-pre:border-cyan-500/20 prose-code:text-cyan-300 prose-headings:text-cyan-400 prose-a:text-cyan-400">
                  <ReactMarkdown>{newEntry.trim() || "Nothing to preview yet..."}</ReactMarkdown>
                </div>
              ) : (
                <textarea
                  value={newEntry}
                  onChange={(e) => setNewEntry(e.target.value)}
                  placeholder="Write your entry here... (Markdown supported)"
                  rows={8}
                  className="w-full px-4 py-3 text-slate-200 placeholder-slate-500 bg-transparent outline-none resize-none font-mono text-sm"
                  disabled={submitting}
                />
              )}
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setNewEntry(""); setShowPreview(false); }}
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-300 hover:bg-slate-800/50 transition-all duration-200"
                disabled={submitting}
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={!newEntry.trim() || submitting}
                className="flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-black bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all duration-300"
              >
                {submitting ? "Sending..." : "Submit Entry"}
              </button>
            </div>
          </motion.form>
        ) : (
          <div className="mt-8 text-center py-8 bg-[#0a1628]/40 rounded-xl border border-cyan-500/10">
            <p className="text-slate-400 mb-4">Please log in to add an entry.</p>
            <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-black bg-cyan-400 hover:bg-cyan-300">
              Log In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
