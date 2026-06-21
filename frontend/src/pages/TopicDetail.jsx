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
} from "lucide-react";
import AnimatedBackground from "../components/AnimatedBackground";

/* ========================================================================== */
/*  MARKDOWN TOOLBAR COMPONENT                                                */
/*  Quick insert buttons for markdown syntax (bold, italic, code, etc.)      */
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
    <div className="flex items-center gap-1 p-2 border-b border-white/10 bg-black/20">
      {tools.map((tool) => (
        <button
          key={tool.label}
          type="button"
          onClick={() => onInsert(tool.syntax)}
          className="p-2 rounded hover:bg-white/10 text-white/60 hover:text-white/90 transition-colors duration-200"
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
/*  Single entry with voting system, like button, and markdown rendering     */
/* ========================================================================== */
function EntryCard({ entry, token }) {
  const isAuthenticated = Boolean(token);

  // Voting state
  const [score, setScore] = useState(entry.score ?? 0);
  const [myVote, setMyVote] = useState(entry.my_vote ?? 0);
  const [voting, setVoting] = useState(false);

  // Like state - FIXED: use is_liked and likes_count from backend
  const [likeCount, setLikeCount] = useState(entry.likes_count ?? 0);
  const [myLike, setMyLike] = useState(entry.is_liked ?? false);
  const [liking, setLiking] = useState(false);

  // Send vote (upvote +1 or downvote -1)
  const sendVote = async (value) => {
    if (!isAuthenticated || voting) return;

    const prevScore = score;
    const prevVote = myVote;
    
    // Toggle logic: if same vote, remove it (set to 0)
    const nextVote = myVote === value ? 0 : value;
    const delta = nextVote - myVote;

    // Optimistic update
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
      
      // Update with server response
      if (typeof data.score === "number") setScore(data.score);
      if (typeof data.my_vote === "number") setMyVote(data.my_vote);
    } catch (error) {
      console.error("Vote error:", error);
      // Rollback on error
      setScore(prevScore);
      setMyVote(prevVote);
    } finally {
      setVoting(false);
    }
  };

  // Toggle like - FIXED: use is_liked and likes_count from backend response
  const toggleLike = async () => {
    if (!isAuthenticated || liking) return;

    const prevLikeCount = likeCount;
    const prevMyLike = myLike;
    const nextMyLike = !myLike;

    // Optimistic update
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
      
      // FIXED: Update with correct field names from server response
      if (typeof data.likes_count === "number") setLikeCount(data.likes_count);
      if (typeof data.is_liked === "boolean") setMyLike(data.is_liked);
    } catch (error) {
      console.error("Like error:", error);
      // Rollback on error
      setLikeCount(prevLikeCount);
      setMyLike(prevMyLike);
    } finally {
      setLiking(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 backdrop-blur-sm p-4 flex gap-3 hover:border-white/20 transition-colors duration-300">
      {/* LEFT COLUMN: Voting buttons */}
      <div className="flex flex-col items-center gap-1 select-none">
        <button
          type="button"
          onClick={() => sendVote(1)}
          disabled={!isAuthenticated || voting}
          className={`transition-all duration-200 ${
            myVote === 1
              ? "text-cyan-400 scale-110"
              : "text-white/40 hover:text-cyan-300 hover:scale-110"
          } disabled:opacity-40 disabled:cursor-not-allowed`}
          aria-label="Upvote"
        >
          <ChevronUp size={20} strokeWidth={2.5} />
        </button>

        {/* Score display with animation */}
        <motion.span
          key={score}
          initial={{ scale: 0.7, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
          className={`text-sm font-bold ${
            score > 0
              ? "text-cyan-300"
              : score < 0
              ? "text-rose-400"
              : "text-white/60"
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
              : "text-white/40 hover:text-rose-300 hover:scale-110"
          } disabled:opacity-40 disabled:cursor-not-allowed`}
          aria-label="Downvote"
        >
          <ChevronDown size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* RIGHT COLUMN: Entry content */}
      <div className="flex-1 min-w-0">
        {/* Markdown content */}
        <div className="prose prose-invert max-w-none text-white/80 break-words prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10 prose-code:text-cyan-300">
          <ReactMarkdown>{entry.text}</ReactMarkdown>
        </div>

        {/* Footer: author, date, like button */}
        <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 text-xs text-white/30">
            {entry.author && (
              <Link
                to={`/users/${entry.author}`}
                className="text-cyan-400/80 hover:text-cyan-300 transition-colors duration-200 flex items-center gap-1"
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
          </div>

          {/* Like button */}
          <button
            type="button"
            onClick={toggleLike}
            disabled={!isAuthenticated || liking}
            className={`flex items-center gap-1 text-sm transition-all duration-200 px-2 py-1 rounded ${
              myLike
                ? "text-rose-400 bg-rose-400/10"
                : "text-white/40 hover:text-rose-300 hover:bg-white/5"
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
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  MAIN COMPONENT: TOPIC DETAIL PAGE                                         */
/*  Displays topic info, tags, entries, and allows creating new entries      */
/* ========================================================================== */
export default function TopicDetail() {
  const { id } = useParams(); // Get topic ID from URL
  const [topic, setTopic] = useState(null);
  const [entries, setEntries] = useState([]);
  const [newEntry, setNewEntry] = useState("");
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Topic like state - FIXED: initialize with is_liked and likes_count
  const [topicLikeCount, setTopicLikeCount] = useState(0);
  const [myTopicLike, setMyTopicLike] = useState(false);
  const [topicLiking, setTopicLiking] = useState(false);

  const token = localStorage.getItem("access");
  const isAuthenticated = Boolean(token);

   // Load topic data from API
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
      // FIXED: use likes_count and is_liked from backend
      setTopicLikeCount(data.likes_count ?? 0);
      setMyTopicLike(data.is_liked ?? false);
    } catch (error) {
      console.error("Load topic error:", error);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadTopic();
  }, [id]);

  // Toggle topic like - FIXED: use is_liked and likes_count from backend response
  const toggleTopicLike = async () => {
    if (!isAuthenticated || topicLiking) return;

    const prevCount = topicLikeCount;
    const prevLike = myTopicLike;
    const nextLike = !myTopicLike;

    // Optimistic update
    setMyTopicLike(nextLike);
    setTopicLikeCount(prevCount + (nextLike ? 1 : -1));
    setTopicLiking(true);

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/topics/${id}/like/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error("Topic like failed");

      const data = await res.json();
      
      // FIXED: Update with correct field names from server response
      if (typeof data.likes_count === "number")
        setTopicLikeCount(data.likes_count);
      if (typeof data.is_liked === "boolean") setMyTopicLike(data.is_liked);
    } catch (error) {
      console.error("Topic like error:", error);
      // Rollback on error
      setTopicLikeCount(prevCount);
      setMyTopicLike(prevLike);
    } finally {
      setTopicLiking(false);
    }
  };

  // Submit new entry
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
      
      // Add new entry to the top of the list
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

  // Insert markdown syntax at cursor position
  const insertMarkdown = (syntax) => {
    setNewEntry((prev) => {
      // If there's existing text, add a newline before inserting
      return prev ? `${prev}\n${syntax}` : syntax;
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="relative min-h-screen text-white">
        <AnimatedBackground />
        <div className="relative z-10 flex justify-center items-center py-32">
          <div className="h-10 w-10 rounded-full border-3 border-cyan-400 border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  // Topic not found
  if (!topic) {
    return (
      <div className="relative min-h-screen text-white">
        <AnimatedBackground />
        <div className="relative z-10 text-center py-32">
          <h2 className="text-2xl font-bold text-white/50 mb-4">
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

  // Main render
  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12">
        {/* TOPIC CARD */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-cyan-500/30 bg-black/40 backdrop-blur-md p-6 shadow-[0_0_40px_rgba(34,211,238,0.15)]"
        >
          {/* Topic title */}
          <h1 className="text-3xl md:text-4xl font-bold font-display bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-4">
            {topic.text}
          </h1>

          {/* Tags */}
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

          {/* Topic metadata and like button */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 text-sm text-white/40">
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

            {/* Topic like button */}
            <button
              type="button"
              onClick={toggleTopicLike}
              disabled={!isAuthenticated || topicLiking}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                myTopicLike
                  ? "bg-rose-500/20 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                  : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              aria-label={myTopicLike ? "Unlike topic" : "Like topic"}
            >
              <Heart
                size={18}
                fill={myTopicLike ? "currentColor" : "none"}
                className="transition-transform duration-200 hover:scale-110"
              />
              <span>{topicLikeCount}</span>
            </button>
          </div>
        </motion.div>

        {/* ENTRIES SECTION */}
        <div className="mt-10">
          <h2 className="text-2xl font-bold font-display text-white mb-6 flex items-center gap-2">
            <MessageSquare size={24} className="text-cyan-400" />
            Entries
          </h2>

          <div className="space-y-4">
            {entries.length === 0 ? (
              <div className="text-center py-12 text-white/40 bg-black/20 rounded-xl border border-white/5">
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
                  <EntryCard entry={entry} token={token} />
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* NEW ENTRY FORM */}
        {isAuthenticated ? (
          <motion.form
            onSubmit={handleSubmit}
            className="mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-medium text-white/60">
                Write your entry
              </label>
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

            <div className="rounded-xl border border-cyan-500/30 bg-black/40 backdrop-blur-md overflow-hidden shadow-[0_0_20px_rgba(34,211,238,0.1)]">
              {/* Markdown toolbar (only in edit mode) */}
              {!showPreview && <MarkdownToolbar onInsert={insertMarkdown} />}

              {/* Preview or textarea */}
              {showPreview ? (
                <div className="min-h-[150px] max-h-[400px] overflow-y-auto px-4 py-3 prose prose-invert max-w-none text-white/80 break-words prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10 prose-code:text-cyan-300">
                  <ReactMarkdown>
                    {newEntry.trim() || "*Nothing to preview yet...*"}
                  </ReactMarkdown>
                </div>
              ) : (
                <textarea
                  value={newEntry}
                  onChange={(e) => setNewEntry(e.target.value)}
                  placeholder="Write your entry here... (Markdown supported: **bold**, *italic*, `code`, etc.)"
                  rows={8}
                  className="w-full px-4 py-3 text-white placeholder-white/30 bg-transparent outline-none resize-none font-mono text-sm"
                  disabled={submitting}
                />
              )}
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setNewEntry("");
                  setShowPreview(false);
                }}
                className="px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all duration-200"
                disabled={submitting}
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={!newEntry.trim() || submitting}
                className="flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-black bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-[0_0_25px_rgba(34,211,238,0.5)] hover:shadow-[0_0_35px_rgba(34,211,238,0.7)] transition-all duration-300 disabled:opacity-50 disabled:shadow-none disabled:bg-white/20 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Submit Entry
                  </>
                )}
              </button>
            </div>
          </motion.form>
        ) : (
          <div className="mt-8 text-center py-8 bg-black/20 rounded-xl border border-white/5">
            <p className="text-white/50 mb-4">
              Please log in to add an entry to this topic.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-black bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all duration-300"
            >
              Log In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
