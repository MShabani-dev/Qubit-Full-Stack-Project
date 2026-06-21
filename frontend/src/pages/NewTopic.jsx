import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import AnimatedBackground from "../components/AnimatedBackground";

export default function NewTopic() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("access");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("http://127.0.0.1:8000/api/topics/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        // TopicSerializer: only "text" is writable, owner is auto-set
        body: JSON.stringify({ text }),
      });

      if (res.status === 401) {
        setError("Your session expired. Please log in again.");
        return;
      }
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`Could not create topic (${res.status}): ${detail}`);
      }

      const created = await res.json();
      // Go to the new topic's detail page: /topics/{id}
      navigate(`/topics/${created.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 max-w-xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-cyan-500/30 bg-black/40
                     backdrop-blur-md p-8 shadow-[0_0_30px_rgba(34,211,238,0.15)]"
        >
          <h1 className="text-2xl font-bold mb-6">Create a New Topic</h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Topic title..."
              autoFocus
              className="rounded-xl border border-cyan-500/30 bg-black/40
                         backdrop-blur-md px-4 py-3 text-white placeholder-white/40
                         outline-none focus:border-cyan-500/60 transition"
            />

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting || !text.trim()}
                className="flex items-center gap-2 rounded-xl px-5 py-3 font-semibold
                  text-black bg-cyan-400 hover:bg-cyan-300
                  shadow-[0_0_20px_rgba(34,211,238,0.5)] transition
                  disabled:opacity-50"
              >
                <Plus size={16} />
                {submitting ? "Creating..." : "Create"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/topics")}
                className="rounded-xl px-5 py-3 font-semibold text-white/70
                  border border-white/10 hover:bg-white/5 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
