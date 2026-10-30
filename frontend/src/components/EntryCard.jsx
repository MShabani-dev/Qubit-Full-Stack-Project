import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { ArrowUp, ArrowDown, Flag, X } from "lucide-react";
import api from "../api";

// Must match the backend Report.reason choices.
const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "abuse", label: "Abuse / harassment" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "misinformation", label: "Misinformation" },
  { value: "other", label: "Other" },
];

/**
 * Renders a single entry with:
 *  - upvote / downvote buttons (optimistic UI + rollback on error)
 *  - animated score number
 *  - markdown-rendered body
 *  - report button (signed-in users, not on their own entries)
 *
 * Expected `entry` shape from the backend:
 *  { id, text, date_added, topic, author, score, my_vote }
 */
export default function EntryCard({ entry }) {
  const [score, setScore] = useState(entry.score ?? 0);
  const [myVote, setMyVote] = useState(entry.my_vote ?? 0); // 1, -1, or 0
  const [loading, setLoading] = useState(false);

  // Report modal state
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [description, setDescription] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reported, setReported] = useState(false);

  const isLoggedIn = Boolean(localStorage.getItem("access"));
  const currentUser = localStorage.getItem("username");
  const isOwn = Boolean(currentUser) && entry.author === currentUser;

  const sendVote = async (value) => {
    if (!isLoggedIn || loading) return;

    // Snapshot for rollback if the request fails.
    const prevScore = score;
    const prevVote = myVote;

    // Clicking the same arrow again toggles the vote off.
    let nextVote = value;
    if (myVote === value) nextVote = 0;

    // New score = old score - old vote contribution + new vote contribution.
    const optimisticScore = prevScore - prevVote + nextVote;
    setMyVote(nextVote);
    setScore(optimisticScore);
    setLoading(true);

    try {
      const res = await api.post(`/api/entries/${entry.id}/vote/`, { value });
      setScore(res.data.score ?? optimisticScore);
      setMyVote(res.data.my_vote ?? nextVote);
    } catch {
      setScore(prevScore);
      setMyVote(prevVote);
    } finally {
      setLoading(false);
    }
  };

  const closeReport = () => {
    setReportOpen(false);
    setReportError("");
  };

  const submitReport = async (e) => {
    e.preventDefault();
    if (reporting) return;
    setReporting(true);
    setReportError("");
    try {
      await api.post("/api/reports/", {
        entry: entry.id,
        reason,
        description: description.trim(),
      });
      setReported(true);
      setReportOpen(false);
      setDescription("");
    } catch (err) {
      const data = err.response?.data;
      const msg =
        (typeof data === "string" && data) ||
        data?.detail ||
        (data && Object.values(data).flat().join(" ")) ||
        "Could not send the report.";
      setReportError(msg);
    } finally {
      setReporting(false);
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
        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
          <span>
            {entry.author ? `by ${entry.author}` : "anonymous"} ·{" "}
            {new Date(entry.date_added).toLocaleString()}
          </span>

          {isLoggedIn && !isOwn && (
            <button
              onClick={() => setReportOpen(true)}
              disabled={reported}
              className="ml-auto flex items-center gap-1 text-gray-500 transition-colors hover:text-rose-400 disabled:cursor-default disabled:text-emerald-400"
              aria-label="Report entry"
            >
              <Flag size={14} />
              {reported ? "Reported" : "Report"}
            </button>
          )}
        </div>
      </div>

      {/* Report modal */}
      <AnimatePresence>
        {reportOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={closeReport}
          >
            <motion.form
              initial={{ scale: 0.95, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={submitReport}
              className="w-full max-w-md space-y-4 rounded-xl border border-white/10 bg-base-800 p-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Report this entry</h3>
                <button
                  type="button"
                  onClick={closeReport}
                  className="text-gray-400 hover:text-white"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-base-900 p-2 text-sm text-white"
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">
                  Details (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={1000}
                  rows={4}
                  className="w-full rounded-md border border-white/10 bg-base-900 p-2 text-sm text-white"
                />
              </div>

              {reportError && (
                <p className="text-sm text-rose-400">{reportError}</p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeReport}
                  className="rounded-md px-3 py-1.5 text-sm text-gray-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reporting}
                  className="rounded-md bg-rose-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-50"
                >
                  {reporting ? "Sending..." : "Submit report"}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
