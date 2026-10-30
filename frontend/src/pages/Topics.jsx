import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  MessageSquare,
  Clock,
  Heart,
  User,
  Tag as TagIcon,
  Bookmark,
  TrendingUp,
  Filter,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";
import AnimatedBackground from "../components/AnimatedBackground";

/* ========================================================================== */
/*  CONSTANTS & HELPERS                                                       */
/* ========================================================================== */

const API_BASE_URL = "http://127.0.0.1:8000";

// Backend tags carry no color, so chips fall back to the theme cyan (text-cyan-400).
const DEFAULT_TAG_COLOR = "#22d3ee";

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

/** Converts a topic's tag names into chip objects used by the existing styles. */
const getTagChips = (topic) =>
  getTagNames(topic).map((name) => ({ id: name, name, color: DEFAULT_TAG_COLOR }));

/**
 * Checks whether an API error response corresponds to an active account ban.
 * Mirrors the same helper in TopicDetail so both pages behave identically.
 */
const isBanResponse = (data) =>
  data?.detail ===
  "Your account is suspended. You cannot post or interact right now.";

/* ========================================================================== */
/*  TOPIC CARD                                                                */
/* ========================================================================== */

/**
 * A single topic card with optimistic like and follow toggles.
 *
 * The whole card is clickable through a "stretched link" on the title:
 * the link's ::after pseudo-element covers the card, and the action buttons
 * sit above it (z-10). This avoids nesting interactive elements inside <a>.
 *
 * Permission flags:
 *  - isBanned    → IsNotBanned  → like/follow write actions are blocked
 *  - onBan       → bubble-up so the page-level BanBanner appears immediately
 */
function TopicCard({ topic, token, isBanned, onBan }) {
  const isAuthenticated = Boolean(token);

  const [likeCount, setLikeCount] = useState(topic.likes_count ?? 0);
  const [myLike, setMyLike] = useState(topic.is_liked ?? false);
  const [liking, setLiking] = useState(false);

  const [isFollowed, setIsFollowed] = useState(topic.is_followed ?? false);
  const [followersCount, setFollowersCount] = useState(
    topic.followers_count ?? 0
  );
  const [following, setFollowing] = useState(false);

  // Keep local state in sync when the parent passes fresh topic data.
  useEffect(() => {
    setLikeCount(topic.likes_count ?? 0);
    setMyLike(topic.is_liked ?? false);
    setIsFollowed(topic.is_followed ?? false);
    setFollowersCount(topic.followers_count ?? 0);
  }, [topic]);

  /* ── Like ─────────────────────────────────────────────────────────────── */
  const toggleLike = async (e) => {
    e.preventDefault(); // Never let the button trigger card navigation
    if (!isAuthenticated || liking || isBanned) return;

    const prevCount = likeCount;
    const prevLike = myLike;
    const nextLike = !myLike;

    setMyLike(nextLike);
    setLikeCount(prevCount + (nextLike ? 1 : -1));
    setLiking(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/topics/${topic.id}/like/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 403) {
        const errData = await res.json();
        if (isBanResponse(errData) && onBan) onBan();
        setLikeCount(prevCount);
        setMyLike(prevLike);
        return;
      }

      if (!res.ok) throw new Error("Like failed");

      const data = await res.json();
      if (typeof data.likes_count === "number") setLikeCount(data.likes_count);
      if (typeof data.is_liked === "boolean") setMyLike(data.is_liked);
    } catch (error) {
      console.error("Topic like error:", error);
      setLikeCount(prevCount);
      setMyLike(prevLike);
    } finally {
      setLiking(false);
    }
  };

  /* ── Follow ───────────────────────────────────────────────────────────── */
  const toggleFollow = async (e) => {
    e.preventDefault(); // Never let the button trigger card navigation
    if (!isAuthenticated || following || isBanned) return;

    const prevFollowed = isFollowed;
    const prevCount = followersCount;
    const nextFollowed = !isFollowed;

    setIsFollowed(nextFollowed);
    setFollowersCount(prevCount + (nextFollowed ? 1 : -1));
    setFollowing(true);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/topics/${topic.id}/follow/`,
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
        setIsFollowed(prevFollowed);
        setFollowersCount(prevCount);
        return;
      }

      if (!res.ok) throw new Error("Follow failed");

      const data = await res.json();
      if (typeof data.followers_count === "number")
        setFollowersCount(data.followers_count);
      if (typeof data.is_followed === "boolean") setIsFollowed(data.is_followed);
    } catch (error) {
      console.error("Topic follow error:", error);
      setIsFollowed(prevFollowed);
      setFollowersCount(prevCount);
    } finally {
      setFollowing(false);
    }
  };

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25 }}
    >
      {/* relative: structural anchor for the stretched link (no visual change) */}
      <div className="relative group rounded-xl border border-cyan-500/20 bg-[#0a1628]/60 backdrop-blur-sm p-5 hover:border-cyan-500/40 hover:bg-[#0a1628]/80 transition-all duration-300 shadow-lg">
        {/* Title: stretched link covers the whole card (structural: after:*) */}
        <Link
          to={`/topics/${topic.id}`}
          className="block after:absolute after:inset-0 after:rounded-xl after:content-['']"
        >
          <h3 className="text-lg font-semibold text-white group-hover:text-cyan-300 transition-colors duration-200 mb-3 line-clamp-2">
            {topic.text}
          </h3>
        </Link>

        {/* Tags */}
        {getTagChips(topic).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {getTagChips(topic).map((tag) => (
              <span
                key={tag.id ?? tag.name}
                className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"
                style={{
                  backgroundColor: `${tag.color}18`,
                  color: tag.color,
                  border: `1px solid ${tag.color}35`,
                }}
              >
                <TagIcon size={10} />
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            {topic.owner && (
              <span className="flex items-center gap-1 text-cyan-400/80">
                <User size={11} />
                {topic.owner}
              </span>
            )}
            {topic.date_added && (
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {new Date(topic.date_added).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
            <span className="flex items-center gap-1">
              <MessageSquare size={11} />
              {topic.entries_count ?? 0}
            </span>
          </div>

          {/* Action buttons: relative z-10 keeps them above the stretched link */}
          <div className="relative z-10 flex items-center gap-2">
            {/* Follow toggle: only for authenticated users; disabled when banned */}
            {isAuthenticated && (
              <button
                type="button"
                onClick={toggleFollow}
                disabled={following || isBanned}
                className={`flex items-center gap-1 px-2 py-1 rounded transition-all duration-200 ${
                  isFollowed
                    ? "text-cyan-400 bg-cyan-400/10"
                    : "text-slate-500 hover:text-cyan-400 hover:bg-cyan-400/5"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
                aria-label={isFollowed ? "Unfollow" : "Follow"}
              >
                <Bookmark size={13} fill={isFollowed ? "currentColor" : "none"} />
                <span>{followersCount}</span>
              </button>
            )}

            {/* Like toggle: disabled when banned (IsNotBanned) */}
            <button
              type="button"
              onClick={toggleLike}
              disabled={!isAuthenticated || liking || isBanned}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-all duration-200 ${
                myLike
                  ? "text-rose-400 bg-rose-400/10"
                  : "text-slate-500 hover:text-rose-400 hover:bg-rose-400/5"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              aria-label={myLike ? "Unlike" : "Like"}
            >
              <Heart size={13} fill={myLike ? "currentColor" : "none"} />
              <span>{likeCount}</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ========================================================================== */
/*  BAN BANNER                                                                */
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
/*  MAIN: TOPICS PAGE                                                         */
/* ========================================================================== */

export default function Topics() {
  const navigate = useNavigate();

  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [allTags, setAllTags] = useState([]);
  const [sortBy, setSortBy] = useState("newest"); // "newest" | "popular" | "followed"
  const [showFilters, setShowFilters] = useState(false);

  /**
   * isBanned: set optimistically when any card action hits an IsNotBanned 403.
   * Propagated down to all TopicCards so write actions lock immediately.
   */
  const [isBanned, setIsBanned] = useState(false);

  const token = localStorage.getItem("access");
  const isAuthenticated = Boolean(token);

  /* ── Load topics (re-fetch on filter change; stale responses ignored) ──── */
  useEffect(() => {
    let ignore = false;

    const fetchTopics = async () => {
      setLoading(true);
      try {
        const headers = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set("search", searchQuery.trim());
        if (activeTag) params.set("tag", activeTag);
        if (sortBy === "popular") params.set("ordering", "-likes_count");
        else if (sortBy === "followed") params.set("followed", "true");
        else params.set("ordering", "-date_added");

        const res = await fetch(
          `${API_BASE_URL}/api/topics/?${params.toString()}`,
          { headers }
        );

        if (!res.ok) throw new Error("Failed to load topics");

        const data = await res.json();
        // Support both paginated { results: [] } and plain array responses
        if (!ignore) {
          setTopics(Array.isArray(data) ? data : (data.results ?? []));
        }
      } catch (error) {
        console.error("Load topics error:", error);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchTopics();

    // Cleanup: discard the response if filters changed before it arrived
    return () => {
      ignore = true;
    };
  }, [searchQuery, activeTag, sortBy, token]);

  /* ── Load tags for filter chips (once) ──────────────────────────────────── */
  useEffect(() => {
    const loadTags = async () => {
      try {
        // by_tag returns [{ tag, count }, ...]
        const res = await fetch(`${API_BASE_URL}/api/topics/by_tag/`);
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setAllTags(
          list.map(({ tag }) => ({ id: tag, name: tag, color: DEFAULT_TAG_COLOR }))
        );
      } catch (error) {
        console.error("Load tags error:", error);
      }
    };

    loadTags();
  }, []);

  /* ── Callbacks ────────────────────────────────────────────────────────── */

  /** Called by any TopicCard when it receives a ban 403. */
  const handleBanDetected = () => setIsBanned(true);

  /* ── Derived: Trending Now (client-side, from already-loaded topics) ───── */
  // Only meaningful for the unfiltered "all topics" view, so it is hidden
  // while searching, filtering by tag, or viewing "Following".
  const trendingTopics = [...topics]
    .filter((t) => (t.likes_count ?? 0) > 0)
    .sort((a, b) => (b.likes_count ?? 0) - (a.likes_count ?? 0))
    .slice(0, 3);

  const showTrending =
    !loading &&
    !searchQuery.trim() &&
    !activeTag &&
    sortBy !== "followed" &&
    trendingTopics.length > 0;

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="relative min-h-screen bg-[#020617] text-white overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12">

        {/* Ban banner: shown whenever IsNotBanned fires a 403 on this page */}
        {isBanned && <BanBanner />}

        {/* ── Page Header ── */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold font-display bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Topics
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              {topics.length} topic{topics.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Create topic: only show when authenticated and not banned */}
          {isAuthenticated && !isBanned && (
            <button
              type="button"
              onClick={() => navigate("/topics/new")}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-black bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all duration-300"
            >
              <Plus size={18} />
              New Topic
            </button>
          )}
        </div>

        {/* ── Search & Filters ── */}
        <div className="mb-6 space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics..."
              className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-cyan-500/20 bg-[#0a1628]/80 text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/50 transition-colors duration-200 text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors duration-200"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort + Filter toggle row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort buttons ("Following" only for authenticated users) */}
            {[
              { key: "newest", label: "Newest", icon: Clock },
              { key: "popular", label: "Popular", icon: TrendingUp },
              ...(isAuthenticated
                ? [{ key: "followed", label: "Following", icon: Bookmark }]
                : []),
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSortBy(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  sortBy === key
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 hover:text-slate-300 border border-transparent"
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}

            {/* Tag filter toggle */}
            {allTags.length > 0 && (
              <button
                type="button"
                onClick={() => setShowFilters((p) => !p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ml-auto ${
                  showFilters || activeTag
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 hover:text-slate-300 border border-transparent"
                }`}
              >
                <Filter size={13} />
                Tags
                {activeTag && (
                  <span className="ml-1 w-1.5 h-1.5 rounded-full bg-cyan-400" />
                )}
              </button>
            )}
          </div>

          {/* Tag chips */}
          <AnimatePresence>
            {showFilters && allTags.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveTag(null)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                      !activeTag
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                        : "bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 border border-transparent"
                    }`}
                  >
                    All
                  </button>
                  {allTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() =>
                        setActiveTag(activeTag === tag.name ? null : tag.name)
                      }
                      className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition-all duration-200 ${
                        activeTag === tag.name
                          ? "opacity-100 scale-105"
                          : "opacity-70 hover:opacity-100"
                      }`}
                      style={{
                        backgroundColor: `${tag.color}18`,
                        color: tag.color,
                        border: `1px solid ${
                          activeTag === tag.name
                            ? `${tag.color}60`
                            : `${tag.color}30`
                        }`,
                      }}
                    >
                      <TagIcon size={10} />
                      {tag.name}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Trending Now (top 3 most-liked loaded topics) ── */}
        {showTrending && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={18} className="text-cyan-400" />
              <h2 className="text-lg font-bold font-display text-slate-200">
                Trending Now
              </h2>
              <span className="text-xs text-slate-500">most liked right now</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {trendingTopics.map((topic, index) => (
                <Link
                  key={topic.id}
                  to={`/topics/${topic.id}`}
                  className="group relative block rounded-xl border border-cyan-500/20 bg-[#0a1628]/60 backdrop-blur-sm p-4 hover:border-cyan-500/40 hover:bg-[#0a1628]/80 transition-all duration-300 shadow-lg"
                >
                  {/* Rank badge */}
                  <span className="absolute top-3 right-3 text-2xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    #{index + 1}
                  </span>

                  <h3 className="pr-8 text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors duration-200 mb-3 line-clamp-2">
                    {topic.text}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1 text-rose-400">
                      <Heart size={12} fill="currentColor" />
                      {topic.likes_count ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare size={12} />
                      {topic.entries_count ?? 0}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.section>
        )}

        {/* ── Topics Grid ── */}
        {loading ? (
          <div className="flex justify-center items-center py-32">
            <Loader2 size={36} className="text-cyan-400 animate-spin" />
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-24 text-slate-500 bg-[#0a1628]/40 rounded-xl border border-cyan-500/10">
            <MessageSquare size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium mb-1">No topics found</p>
            <p className="text-sm">
              {searchQuery || activeTag
                ? "Try adjusting your search or filters."
                : "Be the first to start a discussion!"}
            </p>
          </div>
        ) : (
          <motion.div layout className="grid gap-4 sm:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {topics.map((topic) => (
                /*
                 * Pass ban flags to every card:
                 *   isBanned → IsNotBanned: disables write interactions
                 *   onBan    → bubbles a ban 403 up to the page BanBanner
                 */
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  token={token}
                  isBanned={isBanned}
                  onBan={handleBanDetected}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
