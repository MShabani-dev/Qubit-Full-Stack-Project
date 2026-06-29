import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  MessageSquare,
  Clock,
  Search,
  User,
  Tag as TagIcon,
  Calendar,
  TrendingUp,
  Flame,
  X,
  Filter,
  SlidersHorizontal,
} from "lucide-react";
import AnimatedBackground from "../components/AnimatedBackground";
import EmptyState from "../components/EmptyState";

export default function Topics() {
  // State management
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(""); // Search term
  const [authorFilter, setAuthorFilter] = useState(""); // Author username filter
  const [tagFilter, setTagFilter] = useState(""); // Tag filter
  const [dateFilter, setDateFilter] = useState("all"); // Date range filter
  const [ordering, setOrdering] = useState("newest"); // Sort option
  const [showFilters, setShowFilters] = useState(false); // Toggle advanced filters

  const navigate = useNavigate();
  const isAuthenticated = Boolean(localStorage.getItem("access"));
  const currentUser = localStorage.getItem("username");

  // Debounced search with all filters
  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(() => {
      setLoading(true);

      // Build query string with all filters
      const params = new URLSearchParams();

      if (query.trim()) params.append("q", query.trim());
      if (authorFilter.trim()) params.append("author", authorFilter.trim());
      if (tagFilter.trim()) params.append("tag", tagFilter.trim());
      if (dateFilter !== "all") params.append("date", dateFilter);

      // Handle ordering - my_topics is special case
      if (ordering === "my_topics") {
        params.append("my_topics", "true");
        params.append("ordering", "newest"); // Default ordering for my topics
      } else {
        params.append("ordering", ordering);
      }

      const url = `http://127.0.0.1:8000/api/topics/?${params.toString()}`;

      // IMPORTANT FIX:
      // Attach the JWT access token so the backend knows WHO is requesting.
      // Without this header the backend treats the request as AnonymousUser,
      // so `request.user.is_authenticated` is False and the `my_topics`
      // filter is silently skipped -> all topics are returned.
      const headers = { "Content-Type": "application/json" };
      const token = localStorage.getItem("access");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      fetch(url, { signal: controller.signal, headers })
        .then((res) => res.json())
        .then((data) => {
          setTopics(Array.isArray(data) ? data : data.results ?? []);
          setLoading(false);
        })
        .catch((err) => {
          if (err.name !== "AbortError") setLoading(false);
        });
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, authorFilter, tagFilter, dateFilter, ordering]);

  // Clear all filters
  const clearFilters = () => {
    setQuery("");
    setAuthorFilter("");
    setTagFilter("");
    setDateFilter("all");
    setOrdering("newest");
  };

  // Check if any filter is active
  const hasActiveFilters =
    query.trim() ||
    authorFilter.trim() ||
    tagFilter.trim() ||
    dateFilter !== "all" ||
    ordering !== "newest";

  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      {/* Animated background */}
      <AnimatedBackground />

      {/* Main content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold font-display text-gradient">
              Topics
            </h1>
            <p className="text-white/60 mt-2">
              Browse the latest discussions in the community
            </p>
          </div>

          {isAuthenticated && (
            <Link
              to="/topics/new"
              className="group flex items-center gap-2 rounded-xl bg-cyan-400
                        hover:bg-cyan-300 px-4 py-2.5 font-semibold text-black
                        shadow-[0_0_20px_rgba(34,211,238,0.5)] transition"
            >
              <Plus size={18} className="transition group-hover:rotate-90" />
              New Topic
            </Link>
          )}
        </div>

        {/* Sort Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {/* Newest */}
          <button
            onClick={() => setOrdering("newest")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition
              ${
                ordering === "newest"
                  ? "bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.5)]"
                  : "bg-black/40 text-white/60 hover:text-white border border-cyan-500/20 hover:border-cyan-500/50"
              }`}
          >
            <Clock size={16} />
            Newest
          </button>

          {/* Hottest */}
          <button
            onClick={() => setOrdering("hottest")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition
              ${
                ordering === "hottest"
                  ? "bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.5)]"
                  : "bg-black/40 text-white/60 hover:text-white border border-cyan-500/20 hover:border-cyan-500/50"
              }`}
          >
            <Flame size={16} />
            Hottest
          </button>

          {/* Most Discussed */}
          <button
            onClick={() => setOrdering("most_discussed")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition
              ${
                ordering === "most_discussed"
                  ? "bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.5)]"
                  : "bg-black/40 text-white/60 hover:text-white border border-cyan-500/20 hover:border-cyan-500/50"
              }`}
          >
            <TrendingUp size={16} />
            Most Discussed
          </button>

          {/* My Topics (only for authenticated users) */}
          {isAuthenticated && (
            <button
              onClick={() => setOrdering("my_topics")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition
                ${
                  ordering === "my_topics"
                    ? "bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.5)]"
                    : "bg-black/40 text-white/60 hover:text-white border border-cyan-500/20 hover:border-cyan-500/50"
                }`}
            >
              <User size={16} />
              My Topics
            </button>
          )}

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition ml-auto
              ${
                showFilters || hasActiveFilters
                  ? "bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.5)]"
                  : "bg-black/40 text-white/60 hover:text-white border border-cyan-500/20 hover:border-cyan-500/50"
              }`}
          >
            <SlidersHorizontal size={16} />
            Filters
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-black" />
            )}
          </button>
        </div>

        {/* Advanced Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="rounded-2xl border border-cyan-500/20 bg-black/40 backdrop-blur-md p-6">
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Search by Title */}
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">
                      <Search size={14} className="inline mr-1" />
                      Search Title
                    </label>
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search topics..."
                      className="w-full rounded-xl border border-cyan-500/20 bg-black/40 
                                backdrop-blur-md py-2.5 px-4 text-white placeholder-white/40 
                                outline-none focus:border-cyan-500/50 transition"
                    />
                  </div>

                  {/* Filter by Author */}
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">
                      <User size={14} className="inline mr-1" />
                      Filter by Author
                    </label>
                    <input
                      type="text"
                      value={authorFilter}
                      onChange={(e) => setAuthorFilter(e.target.value)}
                      placeholder="Username..."
                      className="w-full rounded-xl border border-cyan-500/20 bg-black/40 
                                backdrop-blur-md py-2.5 px-4 text-white placeholder-white/40 
                                outline-none focus:border-cyan-500/50 transition"
                    />
                  </div>

                  {/* Filter by Tag */}
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">
                      <TagIcon size={14} className="inline mr-1" />
                      Filter by Tag
                    </label>
                    <input
                      type="text"
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                      placeholder="Tag name..."
                      className="w-full rounded-xl border border-cyan-500/20 bg-black/40 
                                backdrop-blur-md py-2.5 px-4 text-white placeholder-white/40 
                                outline-none focus:border-cyan-500/50 transition"
                    />
                  </div>

                  {/* Filter by Date */}
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">
                      <Calendar size={14} className="inline mr-1" />
                      Date Range
                    </label>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-full rounded-xl border border-cyan-500/20 bg-black/40 
                                backdrop-blur-md py-2.5 px-4 text-white outline-none 
                                focus:border-cyan-500/50 transition cursor-pointer"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                    </select>
                  </div>
                </div>

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 
                                text-red-400 hover:bg-red-500/30 border border-red-500/20 
                                hover:border-red-500/50 transition font-medium"
                    >
                      <X size={16} />
                      Clear All Filters
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          </div>
        ) : topics.length === 0 ? (
          /* Empty State */
          <EmptyState
            icon={MessageSquare}
            title="No Topics Found"
            description={
              hasActiveFilters
                ? "No topics match your filters. Try adjusting your search criteria."
                : "Be the first to start a discussion in the community."
            }
            actionText={hasActiveFilters ? "Clear Filters" : "Create Topic"}
            showAction={true}
            onAction={
              hasActiveFilters
                ? clearFilters
                : () => navigate("/topics/new")
            }
          />
        ) : (
          /* Topics List */
          <div className="grid gap-4">
            {topics.map((topic, i) => (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <Link
                  to={`/topics/${topic.id}`}
                  className="block rounded-2xl border border-cyan-500/20 bg-black/40 
                            backdrop-blur-md p-5 hover:border-cyan-500/50 transition 
                            hover:shadow-[0_0_25px_rgba(34,211,238,0.25)]"
                >
                  {/* Title */}
                  <h2 className="text-xl font-semibold font-display text-white mb-2">
                    {topic.text}
                  </h2>

                  {/* Tags */}
                  {topic.tag_list && topic.tag_list.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {topic.tag_list.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 
                                    rounded-lg bg-cyan-400/10 text-cyan-400 text-xs 
                                    font-medium border border-cyan-400/20"
                        >
                          <TagIcon size={12} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Meta Info */}
                  <div className="flex items-center gap-4 text-sm text-white/40">
                    {/* Author */}
                    <span className="flex items-center gap-1">
                      <User size={14} className="text-cyan-400" />
                      {topic.owner}
                    </span>

                    {/* Entry Count */}
                    <span className="flex items-center gap-1">
                      <MessageSquare size={14} className="text-cyan-400" />
                      {topic.entry_count ?? 0} entries
                    </span>

                    {/* Likes Count */}
                    <span className="flex items-center gap-1">
                      <Flame size={14} className="text-cyan-400" />
                      {topic.likes_count ?? 0} likes
                    </span>

                    {/* Date */}
                    <span className="flex items-center gap-1">
                      <Clock size={14} className="text-cyan-400" />
                      {topic.date_added
                        ? new Date(topic.date_added).toLocaleDateString()
                        : ""}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ttt
