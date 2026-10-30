import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  AlertCircle,
  Flag,
} from "lucide-react";
import AnimatedBackground from "../components/AnimatedBackground";
import { followTopic } from "../api/api";

// Backend base URL; keep in sync with Topics.jsx
const API_BASE_URL = "http://127.0.0.1:8000";

/**
 * Returns the topic's tags as plain strings.
 * The backend sends `tag_list` (array) and `tags` (comma-separated string).
 */
const getTagNames = (topic) => {
  if (Array.isArray(topic?.tag_list)) return topic.tag_list;
  if (typeof topic?.tags === "string") {
    return topic.tags.split(",").map((t) => t.trim()).filter(Boolean);
  }
  return [];
};

/* ========================================================================== */
/*  HELPERS                                                                   */
/* ========================================================================== */

/**
 * Checks whether an API error response corresponds to an active account ban.
 * The backend's IsNotBanned permission class returns this exact message.
 */
const isBanResponse = (data) =>
  data?.detail === "Your account is suspended. You cannot post or interact right now.";

/* ========================================================================== */
/*  BAN BANNER COMPONENT                                                      */
/*  Shown whenever the backend signals the user's account is suspended.       */
/* ========================================================================== */
function BanBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-rose-500/40 bg-rose-500/10 backdrop-blur-sm px-5 py-4 flex items-center gap-3 mb-6"
    >
      <AlertCircle size={18} className="text-rose-400 flex-shrink-0" />
      <p className="text-rose-300 text-sm font-medium">
        Your account is suspended. You cannot post or interact right now.
      </p>
    </motion.div>
  );
}

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

/**
 * Renders a single entry with voting, liking, and inline editing.
 *
 * Permission logic:
 *  - isOwner     → backend IsOwnerOrReadOnly  → can edit own entry
 *  - isModerator → backend IsAdminOrModerator → can edit any entry
 *  - isBanned    → backend IsNotBanned        → write actions are blocked;
 *                   the ban is surfaced via the parent's onBan callback so
 *                   the page-level BanBanner is shown immediately.
 */
function EntryCard({ entry, token, onUpdate, isBanned, isModerator, onBan }) {
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

  // Report state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDesc, setReportDesc] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reported, setReported] = useState(false);

  // IsOwnerOrReadOnly: owner can edit their own entry.
  // IsAdminOrModerator: staff/superuser can edit any entry.
  const isOwner = entry.author === currentUser;
  const canEdit = isOwner || isModerator;

  /* ── Voting ─────────────────────────────────────────────────────────────── */
  const sendVote = async (value) => {
    if (!isAuthenticated || voting) return;

    // Block write action immediately if banned (optimistic guard)
    if (isBanned) return;

    const prevScore = score;
    const prevVote = myVote;
    const nextVote = myVote === value ? 0 : value;
    const delta = nextVote - myVote;

    setMyVote(nextVote);
    setScore(prevScore + delta);
    setVoting(true);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/entries/${entry.id}/vote/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ value }),
        }
      );

      if (res.status === 403) {
        const errData = await res.json();
        if (isBanResponse(errData) && onBan) {
          // Notify parent to show the ban banner
          onBan();
        }
        setScore(prevScore);
        setMyVote(prevVote);
        return;
      }

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

  /* ── Liking ─────────────────────────────────────────────────────────────── */
  const toggleLike = async () => {
    if (!isAuthenticated || liking) return;
    if (isBanned) return;

    const prevLikeCount = likeCount;
    const prevMyLike = myLike;
    const nextMyLike = !myLike;

    setMyLike(nextMyLike);
    setLikeCount(prevLikeCount + (nextMyLike ? 1 : -1));
    setLiking(true);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/entries/${entry.id}/like/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.status === 403) {
        const errData = await res.json();
        if (isBanResponse(errData) && onBan) onBan();
        setLikeCount(prevLikeCount);
        setMyLike(prevMyLike);
        return;
      }

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

  /* ── Edit/Update ─────────────────────────────────────────────────────────── */
  const handleUpdate = async () => {
    if (!editedText.trim() || saving) return;

    setSaving(true);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/entries/${entry.id}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text: editedText }),
        }
      );

      if (res.status === 403) {
        const errData = await res.json();
        if (isBanResponse(errData) && onBan) onBan();
        setIsEditing(false);
        setShowPreview(false);
        return;
      }

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
    setEditedText((prev) => (prev ? `${prev}\n${syntax}` : syntax));
  };

  /* ── Report ─────────────────────────────────────────────────────────────── */
  const submitReport = async (e) => {
    e.preventDefault();
    if (reporting) return;
    setReporting(true);
    setReportError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          entry: entry.id,
          reason: reportReason,
          description: reportDesc.trim(),
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 403 && isBanResponse(errData) && onBan) onBan();
        const msg =
          errData?.detail ||
          Object.values(errData || {}).flat().join(" ") ||
          "Could not send the report.";
        setReportError(msg);
        return;
      }
      setReported(true);
      setReportOpen(false);
      setReportDesc("");
    } catch (error) {
      console.error("Report error:", error);
      setReportError("Network error. Please try again.");
    } finally {
      setReporting(false);
    }
  };

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="rounded-xl border border-cyan-500/20 bg-[#0a1628]/60 backdrop-blur-sm p-4 flex gap-3 hover:border-cyan-500/30 transition-colors duration-300 shadow-lg">
      {/* ── Vote Column ── */}
      <div className="flex flex-col items-center gap-1 select-none">
        <button
          type="button"
          onClick={() => sendVote(1)}
          disabled={!isAuthenticated || voting || isBanned}
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
          disabled={!isAuthenticated || voting || isBanned}
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

      {/* ── Entry Body ── */}
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

                {/* Edit button: visible to entry owner OR moderator (IsAdminOrModerator) */}
                {canEdit && !isBanned && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors duration-200"
                  >
                    <Edit3 size={12} />
                    {/* Label distinguishes owner edits from moderator edits */}
                    {isOwner ? "Edit" : "Edit (Mod)"}
                  </button>
                )}

                {/* Report button: signed-in users, not on their own entries */}
                {isAuthenticated && !isOwner && !isBanned && (
                  <button
                    type="button"
                    onClick={() => setReportOpen(true)}
                    disabled={reported}
                    className="flex items-center gap-1 text-slate-500 hover:text-rose-400 transition-colors duration-200 disabled:text-emerald-400 disabled:cursor-default"
                  >
                    <Flag size={12} />
                    {reported ? "Reported" : "Report"}
                  </button>
                )}
              </div>

              {/* Like button: disabled when banned (IsNotBanned) */}
              <button
                type="button"
                onClick={toggleLike}
                disabled={!isAuthenticated || liking || isBanned}
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

      {/* ── Report modal ── */}
      {reportOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setReportOpen(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={submitReport}
            className="w-full max-w-md space-y-4 rounded-xl border border-cyan-500/20 bg-[#0a1628] p-5 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Report this entry</h3>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="text-slate-400 hover:text-white"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Reason</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full rounded-lg border border-cyan-500/30 bg-[#020617] p-2 text-sm text-slate-200 outline-none"
              >
                <option value="spam">Spam</option>
                <option value="abuse">Abuse / harassment</option>
                <option value="inappropriate">Inappropriate content</option>
                <option value="misinformation">Misinformation</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Details (optional)</label>
              <textarea
                value={reportDesc}
                onChange={(e) => setReportDesc(e.target.value)}
                maxLength={1000}
                rows={4}
                className="w-full rounded-lg border border-cyan-500/30 bg-[#020617] p-2 text-sm text-slate-200 outline-none resize-none"
              />
            </div>

            {reportError && <p className="text-sm text-rose-400">{reportError}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reporting}
                className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-semibold text-sm disabled:opacity-50"
              >
                {reporting ? "Sending..." : "Submit report"}
              </button>
            </div>
          </form>
        </div>
        ,document.body
      )}
    </div>
  );
}

/* ========================================================================== */
/* MAIN: TOPIC DETAIL PAGE                                                    */
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

  // Follow system state
  const [isFollowed, setIsFollowed] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingState, setFollowingState] = useState(false);

  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  /**
   * isBanned: true when the backend returns the IsNotBanned 403 message.
   * Set optimistically on any ban response so the UI reacts immediately
   * without a profile re-fetch.
   */
  const [isBanned, setIsBanned] = useState(false);

  const token = localStorage.getItem("access");
  const isAuthenticated = Boolean(token);
  const currentUser = localStorage.getItem("username");

  /**
   * isModerator: derived from localStorage flags set at login.
   * Mirrors the backend IsAdminOrModerator permission class.
   * Store `is_staff` and `is_superuser` in localStorage when the user logs in.
   */
  const isModerator =
    localStorage.getItem("is_staff") === "true" ||
    localStorage.getItem("is_superuser") === "true";

  // IsOwnerOrReadOnly: only the topic owner can edit the title
  const isOwner = topic?.owner === currentUser;

  /* ── Data Loading ─────────────────────────────────────────────────────── */
  const loadTopic = async () => {
    try {
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(`${API_BASE_URL}/api/topics/${id}/`, {
        headers,
      });

      if (!res.ok) throw new Error("Failed to load topic");

      const data = await res.json();
      setTopic(data);
      setEntries(data.entries ?? []);
      setTopicLikeCount(data.likes_count ?? 0);
      setMyTopicLike(data.is_liked ?? false);
      setEditedTitle(data.text ?? "");
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

  /* ── Callbacks ────────────────────────────────────────────────────────── */

  /** Called by EntryCard when any child action triggers a ban 403. */
  const handleBanDetected = () => setIsBanned(true);

  const handleEntryUpdate = (updatedEntry) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === updatedEntry.id ? updatedEntry : e))
    );
  };

  /* ── Follow ───────────────────────────────────────────────────────────── */
  const handleToggleFollow = async () => {
    if (!isAuthenticated || followingState || isBanned) return;
    setFollowingState(true);

    const prevIsFollowed = isFollowed;
    const prevFollowersCount = followersCount;

    setIsFollowed(!prevIsFollowed);
    setFollowersCount(prevFollowersCount + (!prevIsFollowed ? 1 : -1));

    try {
      const data = await followTopic(id);
      if (typeof data.followers_count === "number")
        setFollowersCount(data.followers_count);
      if (typeof data.is_followed === "boolean") setIsFollowed(data.is_followed);
    } catch (error) {
      console.error("Topic follow error:", error);
      setIsFollowed(prevIsFollowed);
      setFollowersCount(prevFollowersCount);
    } finally {
      setFollowingState(false);
    }
  };

  /* ── Topic Like ───────────────────────────────────────────────────────── */
  const toggleTopicLike = async () => {
    if (!isAuthenticated || topicLiking || isBanned) return;

    const prevCount = topicLikeCount;
    const prevLike = myTopicLike;
    const nextLike = !myTopicLike;

    setMyTopicLike(nextLike);
    setTopicLikeCount(prevCount + (nextLike ? 1 : -1));
    setTopicLiking(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/topics/${id}/like/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      // Handle ban from IsNotBanned permission
      if (res.status === 403) {
        const errData = await res.json();
        if (isBanResponse(errData)) setIsBanned(true);
        setTopicLikeCount(prevCount);
        setMyTopicLike(prevLike);
        return;
      }

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

  /* ── Title Update (IsOwnerOrReadOnly) ─────────────────────────────────── */
  const handleTitleUpdate = async () => {
    if (!editedTitle.trim() || savingTitle) return;

    setSavingTitle(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/topics/${id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: editedTitle }),
      });

      // Detect ban before other errors (same contract as entry creation)
      if (res.status === 403) {
        const errData = await res.json();
        if (isBanResponse(errData)) {
          setIsBanned(true);
          setIsEditingTitle(false);
          return;
        }
        throw new Error("Permission denied");
      }

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

  /* ── New Entry Submit (IsNotBanned blocks this for banned users) ───────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newEntry.trim() || submitting || isBanned) return;

    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/entries/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: newEntry, topic: Number(id) }),
      });

      // Detect ban before other errors
      if (res.status === 403) {
        const errData = await res.json();
        if (isBanResponse(errData)) {
          setIsBanned(true);
          return;
        }
        throw new Error("Permission denied");
      }

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
    setNewEntry((prev) => (prev ? `${prev}\n${syntax}` : syntax));
  };

  /* ── Loading / Not Found ─────────────────────────────────────────────── */
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

  /* ── Main Render ─────────────────────────────────────────────────────── */
  return (
    <div className="relative min-h-screen bg-[#020617] text-white overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12">

        {/* Ban banner: shown whenever IsNotBanned fires a 403 */}
        {isBanned && <BanBanner />}

        {/* ── Topic Header Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-cyan-500/30 bg-[#0a1628]/80 backdrop-blur-md p-6 shadow-[0_0_40px_rgba(6,182,212,0.15)]"
        >
          {/* Title editing: only topic owner can do this (IsOwnerOrReadOnly) */}
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
              {/* Edit title: only for topic owner */}
              {isOwner && !isBanned && (
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

          {/* Tags */}
          {getTagNames(topic).length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <TagIcon size={16} className="text-slate-500" />
              {getTagNames(topic).map((name) => {
                return (
                  <span
                    key={name}
                    className="px-3 py-1 rounded-full text-sm font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  >
                    #{name}
                  </span>
                );
              })}
            </div>
          )}

          {/* Topic actions: topic like, follow, and entry count */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-cyan-500/10">
            <button
              type="button"
              onClick={toggleTopicLike}
              disabled={!isAuthenticated || topicLiking || isBanned}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                myTopicLike
                  ? "text-rose-400 bg-rose-400/10 border-rose-400/30"
                  : "text-slate-400 border-slate-700 hover:text-rose-400 hover:border-rose-400/30 hover:bg-rose-400/5"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              aria-label={myTopicLike ? "Unlike topic" : "Like topic"}
            >
              <Heart
                size={16}
                fill={myTopicLike ? "currentColor" : "none"}
                className="transition-transform duration-200 hover:scale-110"
              />
              <span>{topicLikeCount}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleFollow}
              disabled={!isAuthenticated || followingState || isBanned}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                isFollowed
                  ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/30"
                  : "text-slate-400 border-slate-700 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/5"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              aria-label={isFollowed ? "Unfollow topic" : "Follow topic"}
            >
              <Bookmark size={16} fill={isFollowed ? "currentColor" : "none"} />
              <span>{isFollowed ? "Following" : "Follow"}</span>
              <span className="text-xs text-slate-500">· {followersCount}</span>
            </button>

            <span className="ml-auto flex items-center gap-2 text-sm text-slate-500">
              <MessageSquare size={16} />
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </span>
          </div>
        </motion.div>

        {/* ── Entries List ── */}
        <section className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={20} className="text-cyan-400" />
            <h2 className="text-xl font-bold font-display text-slate-200">
              Discussion
            </h2>
          </div>

          {entries.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="rounded-xl border border-dashed border-cyan-500/20 bg-[#0a1628]/40 p-8 text-center text-slate-500"
            >
              No entries yet. Be the first to share your thoughts!
            </motion.div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  token={token}
                  onUpdate={handleEntryUpdate}
                  isBanned={isBanned}
                  isModerator={isModerator}
                  onBan={handleBanDetected}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── New Entry Form (authenticated users) ── */}
        {isAuthenticated ? (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            onSubmit={handleSubmit}
            className="mt-8 rounded-xl border border-cyan-500/20 bg-[#0a1628]/60 backdrop-blur-sm p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-400">
                Write an entry
              </span>
              <button
                type="button"
                onClick={() => setShowPreview((p) => !p)}
                disabled={isBanned}
                className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors duration-200 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
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
                    {newEntry.trim() || "*Nothing to preview yet...*"}
                  </ReactMarkdown>
                </div>
              ) : (
                <textarea
                  value={newEntry}
                  onChange={(e) => setNewEntry(e.target.value)}
                  placeholder="Write your reply... (Markdown supported)"
                  rows={5}
                  disabled={submitting || isBanned}
                  className="w-full px-3 py-2 text-slate-200 placeholder-slate-500 bg-transparent outline-none resize-none font-mono text-sm"
                />
              )}
            </div>

            <div className="flex justify-end mt-4">
              <button
                type="submit"
                disabled={submitting || isBanned || !newEntry.trim()}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-black bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Sending..." : "Submit"}
                <Send size={18} />
              </button>
            </div>
          </motion.form>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-8 rounded-xl border border-cyan-500/20 bg-[#0a1628]/60 backdrop-blur-sm p-6 text-center"
          >
            <MessageSquare size={32} className="mx-auto mb-3 text-cyan-400/40" />
            <p className="text-slate-400 mb-4">Sign in to join the conversation.</p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-black bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all duration-300"
            >
              Sign In
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
