import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { ArrowUp, ArrowDown } from "lucide-react";
import api from "../api/api";

/**
 * Renders a single entry with:
 *  - upvote / downvote buttons (optimistic UI + rollback on error)
 *  - animated score number
 *  - markdown-rendered body
 *
 * Expected `entry` shape from the backend:
 *  { id, text, date_added, topic, author, score, my_vote }
 */
export default function EntryCard({ entry }) {
  const [score, setScore] = useState(entry.score ?? 0);
  const [myVote, setMyVote] = useState(entry.my_vote ?? 0); // 1, -1, or 0
  const [loading, setLoading] = useState(false);

  const isLoggedIn = Boolean(localStorage.getItem("access"));

  const sendVote = async (value) => {
    if (!isLoggedIn || loading) return;

    // Snapshot for rollback if the request fails.
    const prevScore = score;
    const prevVote = myVote;

    // --- Optimistic update ---
    // Clicking the same arrow again toggles the vote off.
    let nextVote = value;
    if (myVote === value) nextVote = 0;

    // New score = old score - old vote contribution + new vote contribution.
    const optimisticScore = prevScore - prevVote + nextVote;
    setMyVote(nextVote);
    setScore(optimisticScore);
    setLoading(true);

    try {
      // Backend toggles/switches the vote and returns the fresh entry.
      const res = await api.post(`/api/entries/${entry.id}/vote/`, { value });
      setScore(res.data.score ?? optimisticScore);
      setMyVote(res.data.my_vote ?? nextVote);
    } catch {
      // Roll back to the previous state on any error.
      setScore(prevScore);
      setMyVote(prevVote);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-4 rounded-xl border border-white/10 bg-base-800/60 p-4"
    >
      {/* Vote column */}
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={() => sendVote(1)}
          disabled={!isLoggedIn || loading}
          className={`rounded-md p-1 transition-colors ${
            myVote === 1 ? "text-emerald-400" : "text-gray-400 hover:text-white"
          } disabled:opacity-40`}
          aria-label="Upvote"
        >
          <ArrowUp size={20} />
        </button>

        {/* Animated score: key change triggers the swap animation */}
        <AnimatePresence mode="popLayout">
          <motion.span
            key={score}
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            className="min-w-[2ch] text-center font-semibold text-white"
          >
            {score}
          </motion.span>
        </AnimatePresence>

        <button
          onClick={() => sendVote(-1)}
          disabled={!isLoggedIn || loading}
          className={`rounded-md p-1 transition-colors ${
            myVote === -1 ? "text-rose-400" : "text-gray-400 hover:text-white"
          } disabled:opacity-40`}
          aria-label="Downvote"
        >
          <ArrowDown size={20} />
        </button>
      </div>

      {/* Body column */}
      <div className="flex-1">
        <div className="prose prose-invert max-w-none text-gray-200">
          <ReactMarkdown>{entry.text}</ReactMarkdown>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          {entry.author ? `by ${entry.author}` : "anonymous"} ·{" "}
          {new Date(entry.date_added).toLocaleString()}
        </div>
      </div>
    </motion.div>
  );
}
