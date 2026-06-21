import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, MessageSquare, Clock, Search } from "lucide-react";
import AnimatedBackground from "../components/AnimatedBackground";
import EmptyState from "../components/EmptyState"; // NEW: Import EmptyState component

export default function Topics() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(""); // Live search term

  const navigate = useNavigate();
  const isAuthenticated = Boolean(localStorage.getItem("access"));

  // Debounced live search: wait 500ms after typing stops, then fetch
  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(() => {
      setLoading(true);

      // Build URL with ?q= parameter when there is a search term
      const url = query.trim()
        ? `http://127.0.0.1:8000/api/topics/?q=${encodeURIComponent(query.trim())}`
        : "http://127.0.0.1:8000/api/topics/";

      fetch(url, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          // DRF list endpoint returns array of topics
          setTopics(Array.isArray(data) ? data : data.results ?? []);
          setLoading(false);
        })
        .catch((err) => {
          // Ignore aborts triggered by newer keystrokes
          if (err.name !== "AbortError") setLoading(false);
        });
    }, 500);

    // Cancel pending timer/request on next keystroke or unmount
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      {/* Layer 0: Animated themed background */}
      <AnimatedBackground />

      {/* Layer 10: Page content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold font-display text-gradient">
              Topics
            </h1>
            <p className="text-white/60 mt-2">
              Browse the latest discussions in the community
            </p>
          </div>

          {/* Only authenticated users can create new topics */}
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

        {/* Live Search Box with animated glow accent */}
        <motion.div
          className="relative mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Pulsing animated search icon */}
          <motion.div
            className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400"
            animate={{
              scale: [1, 1.25, 1],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Search size={18} />
          </motion.div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics..."
            aria-label="Search topics"
            className="w-full rounded-2xl border border-cyan-500/20
                      bg-black/40 backdrop-blur-md py-3 pl-11 pr-4
                      text-white placeholder-white/40 outline-none
                      focus:border-cyan-500/50 transition
                      focus:shadow-[0_0_25px_rgba(34,211,238,0.25)]"
          />

          {/* Animated gradient sweep along bottom edge */}
          <motion.div
            className="pointer-events-none absolute bottom-0 left-0 h-[2px]
                      rounded-full bg-gradient-to-r from-transparent
                      via-cyan-400 to-transparent"
            animate={{ width: ["0%", "100%", "0%"], left: ["0%", "0%", "100%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          </div>
        ) : topics.length === 0 ? (
          /* NEW: Empty State Component */
          <EmptyState
            icon={MessageSquare}
            title={query.trim() ? "No Topics Found" : "No Topics Yet"}
            description={
              query.trim()
                ? "No topics match your search. Try a different keyword."
                : "Be the first to start a discussion in the community."
            }
            actionText="Create Topic"
            showAction={isAuthenticated && !query.trim()} // Only show action if authenticated and no search query
            onAction={() => navigate("/topics/new")}
          />
        ) : (
          /* Topic List */
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
                  className="block rounded-2xl border border-cyan-500/20
                             bg-black/40 backdrop-blur-md p-5
                             hover:border-cyan-500/50 transition
                             hover:shadow-[0_0_25px_rgba(34,211,238,0.25)]"
                >
                  {/* Backend field is "text", not "title" */}
                  <h2 className="text-xl font-semibold font-display text-white mb-1">
                    {topic.text}
                  </h2>

                  {/* Meta row: uses real backend fields (entries[] and date_added) */}
                  <div className="flex items-center gap-4 mt-4 text-sm text-white/40">
                    <span className="flex items-center gap-1">
                      <MessageSquare size={14} className="text-cyan-400" />
                      {topic.entries?.length ?? 0} entries
                    </span>
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
