import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, MessageSquare, Clock, TrendingUp, Sparkles } from "lucide-react";
import AnimatedBackground from "../components/AnimatedBackground";
import EmptyState from "../components/EmptyState";

export default function Home() {
  const [hotTopics, setHotTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState("checking");

  const navigate = useNavigate();
  const isAuthenticated = Boolean(localStorage.getItem("access"));
  const username = sessionStorage.getItem("username");

  useEffect(() => {
    const controller = new AbortController();

    // Check system status
    fetch("http://127.0.0.1:8000/api/topics/", {
      signal: controller.signal,
    })
      .then(() => setSystemStatus("online"))
      .catch(() => setSystemStatus("offline"));

    // Fetch hot topics (latest 6 sorted by date)
    fetch("http://127.0.0.1:8000/api/topics/", {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        const allTopics = Array.isArray(data) ? data : data.results ?? [];
        // Take first 6 topics as "hot"
        setHotTopics(allTopics.slice(0, 6));
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setLoading(false);
      });

    return () => controller.abort();
  }, []);

  // Helper: relative time formatting
  const getTimeSince = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      {/* Layer 0: Animated themed background */}
      <AnimatedBackground />

      {/* Layer 10: Page content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          {/* System Status Badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full
                       bg-black/40 backdrop-blur-md border border-cyan-500/20 mb-8"
          >
            <motion.span
              className={`w-2 h-2 rounded-full ${
                systemStatus === "online" ? "bg-cyan-400" : "bg-yellow-400"
              }`}
              animate={
                systemStatus === "online"
                  ? { scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }
                  : {}
              }
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-sm font-medium text-white/80">
              System Status:{" "}
              {systemStatus === "online" ? "Online" : "Checking..."}
            </span>
          </motion.div>

          {/* Welcome Title */}
          <h1 className="text-5xl md:text-6xl font-bold font-display text-gradient mb-6">
            {username ? `Welcome back, ${username}` : "Welcome to Qubit"}
          </h1>

          <p className="text-xl text-white/60 mb-8 max-w-2xl mx-auto">
            Explore today's hottest discussions and join the conversation
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 justify-center">
            {isAuthenticated ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/topics/new")}
                className="group flex items-center gap-2 rounded-xl
                          bg-cyan-400 hover:bg-cyan-300 px-6 py-3
                          font-semibold text-black
                          shadow-[0_0_20px_rgba(34,211,238,0.5)] transition"
              >
                <Plus size={18} className="transition group-hover:rotate-90" />
                Create New Topic
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/login")}
                className="flex items-center gap-2 rounded-xl
                          bg-cyan-400 hover:bg-cyan-300 px-6 py-3
                          font-semibold text-black
                          shadow-[0_0_20px_rgba(34,211,238,0.5)] transition"
              >
                <Sparkles size={18} />
                Get Started
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/topics")}
              className="flex items-center gap-2 rounded-xl
                        border border-cyan-500/20 bg-black/40
                        backdrop-blur-md px-6 py-3
                        font-semibold text-white
                        hover:border-cyan-500/50 transition
                        hover:shadow-[0_0_20px_rgba(34,211,238,0.25)]"
            >
              Browse All Topics
            </motion.button>
          </div>
        </motion.div>

        {/* Hot Topics Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold font-display text-gradient flex items-center gap-3">
              <TrendingUp className="text-cyan-400" size={32} />
              Hot Topics Today
            </h2>
            <Link
              to="/topics"
              className="text-cyan-400 hover:text-cyan-300 font-medium
                         flex items-center gap-1 group transition"
            >
              View all
              <motion.span
                className="inline-block"
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                →
              </motion.span>
            </Link>
          </div>

          {loading ? (
            /* Loading State */
            <div className="flex justify-center py-20">
              <div
                className="h-10 w-10 rounded-full border-2
                           border-cyan-400 border-t-transparent animate-spin"
              />
            </div>
          ) : hotTopics.length === 0 ? (
            /* Empty State */
            <EmptyState
              icon={MessageSquare}
              title="No Topics Yet"
              description="Be the first to start a discussion in the community."
              actionText="Create Topic"
              showAction={isAuthenticated}
              onAction={() => navigate("/topics/new")}
            />
          ) : (
            /* Topic Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hotTopics.map((topic, index) => (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="group"
                >
                  <Link
                    to={`/topics/${topic.id}`}
                    className="block rounded-2xl border border-cyan-500/20
                               bg-black/40 backdrop-blur-md p-6
                               hover:border-cyan-500/50 transition
                               hover:shadow-[0_0_25px_rgba(34,211,238,0.25)]
                               h-full flex flex-col"
                  >
                    {/* Rank Badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3
                          className="text-xl font-semibold font-display text-white
                                     group-hover:text-cyan-400 transition line-clamp-2"
                        >
                          {topic.text}
                        </h3>
                      </div>
                      <span
                        className="flex-shrink-0 ml-2 px-3 py-1
                                   bg-cyan-400/10 text-cyan-400
                                   text-xs font-medium rounded-full
                                   border border-cyan-400/20"
                      >
                        #{index + 1}
                      </span>
                    </div>

                    {/* Meta Info */}
                    <div className="space-y-3 mt-auto">
                      {/* Author & Time */}
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <span className="font-medium text-cyan-400">
                          {topic.owner || "Anonymous"}
                        </span>
                        <span className="text-white/30">•</span>
                        <span>{getTimeSince(topic.date_added)}</span>
                      </div>

                      {/* Stats Row */}
                      <div className="flex items-center gap-4 text-sm text-white/40">
                        <span className="flex items-center gap-1.5">
                          <MessageSquare size={14} className="text-cyan-400" />
                          <span className="font-medium text-white/60">
                            {topic.entries?.length ?? 0}
                          </span>
                          <span>replies</span>
                        </span>

                        {topic.entries && topic.entries.length > 0 && (
                          <>
                            <span className="text-white/30">•</span>
                            <span className="flex items-center gap-1.5">
                              <Clock size={14} className="text-cyan-400" />
                              <span className="text-xs">
                                Active{" "}
                                {getTimeSince(
                                  topic.entries[topic.entries.length - 1]
                                    ?.date_added || topic.date_added
                                )}
                              </span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Hover Indicator */}
                    <div
                      className="mt-4 pt-4 border-t border-cyan-500/10
                                  flex items-center gap-2 text-cyan-400
                                  opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <span className="text-sm font-medium">
                        View discussion
                      </span>
                      <motion.span
                        className="inline-block"
                        animate={{ x: [0, 4, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        →
                      </motion.span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Stats Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 rounded-3xl border border-cyan-500/20
                     bg-black/40 backdrop-blur-md p-8
                     shadow-[0_0_40px_rgba(34,211,238,0.15)]"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-cyan-400 mb-2">
                {hotTopics.length}+
              </div>
              <div className="text-white/60">Active Topics</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-cyan-400 mb-2">
                {hotTopics.reduce(
                  (sum, t) => sum + (t.entries?.length || 0),
                  0
                )}
                +
              </div>
              <div className="text-white/60">Total Discussions</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-cyan-400 mb-2">24/7</div>
              <div className="text-white/60">Community Support</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
