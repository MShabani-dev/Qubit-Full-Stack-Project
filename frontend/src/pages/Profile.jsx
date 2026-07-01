import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  LogOut,
  Globe,
  MapPin,
  Edit3,
  Save,
  X,
} from "lucide-react";
import AnimatedBackground from "../components/AnimatedBackground";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --- Edit form state ---
  const [editing, setEditing] = useState(false); // Toggle between view and edit mode
  const [saving, setSaving] = useState(false); // Disable the form while a PATCH is in flight
  const [saveError, setSaveError] = useState(""); // Inline error shown inside the edit form
  // Editable metadata fields, matching the backend UserProfile model.
  const [form, setForm] = useState({
    avatar_url: "",
    bio: "",
    website: "",
    location: "",
  });

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("access");

    // Check if user is authenticated
    if (!token) {
      setError("Please log in to view your profile.");
      setLoading(false);
      return;
    }

    // Fetch profile from /api/profile/ endpoint
    fetch("http://127.0.0.1:8000/api/profile/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error("Please log in to view your profile.");
          }
          throw new Error("Failed to load profile.");
        }
        return res.json();
      })
      .then((data) => {
        setProfile(data);
        // Seed the edit form with the current profile values
        // (empty string fallback keeps inputs controlled).
        setForm({
          avatar_url: data.avatar_url || "",
          bio: data.bio || "",
          website: data.website || "",
          location: data.location || "",
        });
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    navigate("/login");
  };

  // Update a single field in the edit form.
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Cancel editing: reset the form back to the saved profile values.
  const handleCancel = () => {
    setForm({
      avatar_url: profile.avatar_url || "",
      bio: profile.bio || "",
      website: profile.website || "",
      location: profile.location || "",
    });
    setSaveError("");
    setEditing(false);
  };

  // Submit the edit form: PATCH the editable fields to /api/profiles/update_me/.
  const handleSave = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("access");
    if (!token) {
      setSaveError("Your session has expired. Please log in again.");
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch(
        "http://127.0.0.1:8000/api/profiles/update_me/",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        }
      );

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Your session has expired. Please log in again.");
        }
        throw new Error("Failed to update profile.");
      }

      const updated = await res.json();

      // Merge the updated metadata into the existing profile so the
      // header (entries, username, email) stays intact.
      setProfile((prev) => ({ ...prev, ...updated }));
      setEditing(false);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
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

  // Error state (not authenticated or failed to load)
  if (error) {
    return (
      <div className="relative min-h-screen text-white">
        <AnimatedBackground />
        <div className="relative z-10 max-w-xl mx-auto px-4 py-32 text-center">
          <User size={64} className="mx-auto mb-4 text-white/30" />
          <h2 className="text-2xl font-bold text-white/70 mb-4">{error}</h2>
          <div className="flex gap-4 justify-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-black bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all duration-300"
            >
              Log In
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white border border-white/20 hover:bg-white/10 transition-all duration-300"
            >
              <ArrowLeft size={16} />
              Back to Home
            </Link>
          </div>
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
        {/* PROFILE HEADER CARD */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-cyan-500/30 bg-black/40 backdrop-blur-md p-8 shadow-[0_0_40px_rgba(34,211,238,0.15)] mb-8"
        >
          <div className="flex items-start gap-6 mb-6">
            {/* Avatar: render the uploaded avatar_url if present, otherwise
                fall back to the first letter of the username. */}
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={`${profile.username}'s avatar`}
                className="w-24 h-24 rounded-full object-cover shadow-[0_0_30px_rgba(34,211,238,0.5)] flex-shrink-0"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white shadow-[0_0_30px_rgba(34,211,238,0.5)] flex-shrink-0">
                {profile.username?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}

            {/* User info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl md:text-4xl font-bold font-display bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 break-words">
                {profile.username}
              </h1>

              {profile.email && (
                <div className="flex items-center gap-2 text-white/60 mb-2">
                  <Mail size={16} />
                  <span className="text-sm break-all">{profile.email}</span>
                </div>
              )}

              {/* Optional metadata: location */}
              {profile.location && (
                <div className="flex items-center gap-2 text-white/50 mb-2">
                  <MapPin size={16} className="text-cyan-400" />
                  <span className="text-sm">{profile.location}</span>
                </div>
              )}

              {/* Optional metadata: website */}
              {profile.website && (
                <div className="flex items-center gap-2 text-white/50 mb-2">
                  <Globe size={16} className="text-cyan-400" />
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-cyan-400 hover:text-cyan-300 break-all transition-colors"
                  >
                    {profile.website}
                  </a>
                </div>
              )}

              {/* Optional metadata: bio (rendered as Markdown) */}
              {profile.bio && (
                <div className="prose prose-invert max-w-none text-white/70 text-sm mt-3 mb-4">
                  <ReactMarkdown>{profile.bio}</ReactMarkdown>
                </div>
              )}

              {/* Stats - Using correct field name 'entry_count' from ProfileSerializer */}
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <MessageSquare size={18} className="text-cyan-400" />
                  <span className="text-sm font-semibold">
                    {profile.entry_count || 0} Entries
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons: Edit profile + Logout */}
            <div className="flex flex-col gap-2 flex-shrink-0">
              {/* Toggle the edit form on. Hidden while already editing. */}
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-cyan-400 border border-cyan-400/20 hover:bg-cyan-400/10 transition-all duration-200"
                  title="Edit Profile"
                >
                  <Edit3 size={18} />
                  <span className="hidden sm:inline text-sm font-medium">
                    Edit
                  </span>
                </button>
              )}

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-rose-400 border border-rose-400/20 hover:bg-rose-400/10 transition-all duration-200"
                title="Log Out"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline text-sm font-medium">
                  Log Out
                </span>
              </button>
            </div>
          </div>

          {/* EDIT FORM: shown only in edit mode. PATCHes /api/profiles/update_me/. */}
          {editing && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              onSubmit={handleSave}
              className="mt-4 pt-6 border-t border-white/10 space-y-4"
            >
              {/* Avatar URL */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  Avatar URL
                </label>
                <input
                  type="url"
                  name="avatar_url"
                  value={form.avatar_url}
                  onChange={handleChange}
                  placeholder="https://example.com/avatar.png"
                  className="w-full px-4 py-2 rounded-lg bg-black/30 border border-white/10 text-white placeholder-white/30 focus:border-cyan-400/50 focus:outline-none transition-colors"
                />
              </div>

              {/* Bio (supports Markdown) */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Tell others about yourself (Markdown supported)..."
                  className="w-full px-4 py-2 rounded-lg bg-black/30 border border-white/10 text-white placeholder-white/30 focus:border-cyan-400/50 focus:outline-none transition-colors resize-y"
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  name="website"
                  value={form.website}
                  onChange={handleChange}
                  placeholder="https://your-site.com"
                  className="w-full px-4 py-2 rounded-lg bg-black/30 border border-white/10 text-white placeholder-white/30 focus:border-cyan-400/50 focus:outline-none transition-colors"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="City, Country"
                  className="w-full px-4 py-2 rounded-lg bg-black/30 border border-white/10 text-white placeholder-white/30 focus:border-cyan-400/50 focus:outline-none transition-colors"
                />
              </div>

              {/* Inline save error */}
              {saveError && (
                <p className="text-sm text-rose-400">{saveError}</p>
              )}

              {/* Form actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-black bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all duration-200"
                >
                  <Save size={16} />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg font-medium text-white/70 border border-white/20 hover:bg-white/10 disabled:opacity-50 transition-all duration-200"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            </motion.form>
          )}
        </motion.div>

        {/* MY ENTRIES SECTION */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 className="text-2xl font-bold font-display text-white mb-6 flex items-center gap-2">
            <FileText size={24} className="text-cyan-400" />
            My Entries
          </h2>

          {!profile.entries || profile.entries.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-white/5 bg-black/20">
              <MessageSquare size={48} className="mx-auto mb-3 text-white/20" />
              <p className="text-white/40 mb-4">
                You haven't written any entries yet.
              </p>
              <Link
                to="/topics"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-black bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all duration-300"
              >
                Explore Topics
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {profile.entries.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="rounded-xl border border-white/10 bg-black/30 backdrop-blur-sm p-5 hover:border-white/20 transition-colors duration-300"
                >
                  {/* Entry content (Markdown) */}
                  <div className="prose prose-invert max-w-none text-white/80 break-words prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10 prose-code:text-cyan-300 mb-4">
                    <ReactMarkdown>{entry.text}</ReactMarkdown>
                  </div>

                  {/* Entry metadata */}
                  <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-4 text-sm text-white/40">
                      <span className="flex items-center gap-1">
                        <ThumbsUp size={14} className="text-cyan-400" />
                        Score: {entry.score ?? 0}
                      </span>
                      {entry.date_added && (
                        <span className="flex items-center gap-1">
                          <Calendar size={14} className="text-cyan-400" />
                          {new Date(entry.date_added).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </span>
                      )}
                    </div>

                    {/* Link to topic - Using 'topic' field which contains topic ID */}
                    {entry.topic && (
                      <Link
                        to={`/topics/${entry.topic}`}
                        className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors duration-200 font-medium flex items-center gap-1"
                      >
                        View topic
                        <ArrowLeft size={14} className="rotate-180" />
                      </Link>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
