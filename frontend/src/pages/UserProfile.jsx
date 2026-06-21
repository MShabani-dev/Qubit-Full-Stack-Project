import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  User,
  Mail,
  Calendar,
  MessageSquare,
  FileText,
  ThumbsUp,
  ArrowLeft,
  Shield,
} from "lucide-react";
import AnimatedBackground from "../components/AnimatedBackground";

export default function UserProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch public user profile from /api/users/<username>/
    fetch(`http://127.0.0.1:8000/api/users/${username}/`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("User not found.");
          }
          throw new Error("Failed to load profile.");
        }
        return res.json();
      })
      .then((data) => {
        setProfile(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [username]);

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

  // Error state (user not found)
  if (error) {
    return (
      <div className="relative min-h-screen text-white">
        <AnimatedBackground />
        <div className="relative z-10 max-w-xl mx-auto px-4 py-32 text-center">
          <User size={64} className="mx-auto mb-4 text-white/30" />
          <h2 className="text-2xl font-bold text-white/70 mb-4">{error}</h2>
          <Link
            to="/topics"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-black bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all duration-300"
          >
            <ArrowLeft size={16} />
            Back to Topics
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  // Main render
  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12">
        {/* Back button */}
        <motion.button
          onClick={() => navigate(-1)}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors duration-200"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back</span>
        </motion.button>

        {/* PROFILE HEADER CARD */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-cyan-500/30 bg-black/40 backdrop-blur-md p-8 shadow-[0_0_40px_rgba(34,211,238,0.15)] mb-8"
        >
          <div className="flex items-start gap-6 mb-6 flex-wrap">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white shadow-[0_0_30px_rgba(34,211,238,0.5)] flex-shrink-0">
              {profile.username?.charAt(0)?.toUpperCase() || "U"}
            </div>

            {/* User info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-bold font-display bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent break-words">
                  {profile.username}
                </h1>
                {profile.is_staff && (
                  <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                    <Shield size={12} />
                    Admin
                  </span>
                )}
              </div>

              {/* Stats - Using correct field names from UserProfileSerializer */}
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <MessageSquare size={18} className="text-cyan-400" />
                  <span className="text-sm font-semibold">
                    {profile.entries_count || 0} Entries
                  </span>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <FileText size={18} className="text-blue-400" />
                  <span className="text-sm font-semibold">
                    {profile.topics_count || 0} Topics
                  </span>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <ThumbsUp size={18} className="text-purple-400" />
                  <span className="text-sm font-semibold">
                    {profile.total_score || 0} Score
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Join date */}
          {profile.date_joined && (
            <div className="flex items-center gap-2 text-white/40 text-sm pt-4 border-t border-white/5">
              <Calendar size={14} />
              <span>
                Member since{" "}
                {new Date(profile.date_joined).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
        </motion.div>

        {/* USER'S RECENT ENTRIES SECTION */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 className="text-2xl font-bold font-display text-white mb-6 flex items-center gap-2">
            <FileText size={24} className="text-cyan-400" />
            Recent Entries
          </h2>

          {!profile.recent_entries || profile.recent_entries.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-white/5 bg-black/20">
              <MessageSquare size={48} className="mx-auto mb-3 text-white/20" />
              <p className="text-white/40">
                {profile.username} hasn't written any entries yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {profile.recent_entries.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="rounded-xl border border-white/10 bg-black/30 backdrop-blur-sm p-5 hover:border-white/20 transition-colors duration-300"
                >
                  {/* Entry content (Markdown) - Using 'text' field from backend */}
                  <div className="prose prose-invert max-w-none text-white/80 break-words prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10 prose-code:text-cyan-300 mb-4">
                    <ReactMarkdown>{entry.text}</ReactMarkdown>
                  </div>

                  {/* Entry metadata */}
                  <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-4 text-sm text-white/40">
                      {entry.date_added && (
                        <span className="flex items-center gap-1">
                          <Calendar size={14} className="text-cyan-400" />
                          {new Date(entry.date_added).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </span>
                      )}
                    </div>

                    {/* Link to topic - Using topic_id and topic_text from backend */}
                    {entry.topic_id && entry.topic_text && (
                      <Link
                        to={`/topics/${entry.topic_id}`}
                        className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors duration-200 font-medium flex items-center gap-1"
                        title={entry.topic_text}
                      >
                        {entry.topic_text.length > 40
                          ? entry.topic_text.substring(0, 40) + "..."
                          : entry.topic_text}
                        <ArrowLeft size={14} className="rotate-180" />
                      </Link>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* USER'S RECENT TOPICS SECTION */}
        {profile.recent_topics && profile.recent_topics.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-12"
          >
            <h2 className="text-2xl font-bold font-display text-white mb-6 flex items-center gap-2">
              <FileText size={24} className="text-blue-400" />
              Created Topics
            </h2>

            <div className="space-y-3">
              {profile.recent_topics.map((topic, index) => (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Link
                    to={`/topics/${topic.id}`}
                    className="block rounded-xl border border-white/10 bg-black/30 backdrop-blur-sm p-4 hover:border-cyan-400/40 hover:bg-black/40 transition-all duration-300 group"
                  >
                    <div className="flex items-center justify-between gap-4">
                      {/* Using 'text' field from backend, not 'title' */}
                      <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors duration-200 break-words">
                        {topic.text}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-white/40 flex-shrink-0">
                        <span className="flex items-center gap-1">
                          <MessageSquare size={14} />
                          {topic.entry_count || 0}
                        </span>
                      </div>
                    </div>

                    {/* Date added */}
                    {topic.date_added && (
                      <div className="flex items-center gap-2 text-white/40 text-xs mt-2">
                        <Calendar size={12} />
                        <span>
                          {new Date(topic.date_added).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </span>
                      </div>
                    )}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
