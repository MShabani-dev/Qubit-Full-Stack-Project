import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  ShieldCheck, Flag, Trash2, Ban, UserCheck, CheckCircle2, XCircle,
  RefreshCw, Search, FileText, MessageSquare, AlertTriangle,
} from "lucide-react";
import AnimatedBackground from "../components/AnimatedBackground";

const API_BASE_URL = "http://127.0.0.1:8000";

// Read a localStorage flag stored as "true" / "1"
const readFlag = (key) => ["true", "1"].includes(String(localStorage.getItem(key)).toLowerCase());

// Normalize DRF list responses (plain array or paginated)
const toList = (data) => (Array.isArray(data) ? data : data?.results || []);

const TABS = [
  { id: "reports", label: "Reports", icon: Flag },
  { id: "topics", label: "Topics", icon: FileText },
  { id: "entries", label: "Entries", icon: MessageSquare },
  { id: "users", label: "Ban users", icon: Ban },
];

const STATUS_STYLES = {
  pending: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  resolved: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  rejected: "bg-slate-500/10 text-slate-300 border-slate-500/30",
};

export default function ModerationPanel() {
  const token = localStorage.getItem("access");
  const isModerator = readFlag("is_staff") || readFlag("is_superuser");

  const [tab, setTab] = useState("reports");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [reports, setReports] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [topics, setTopics] = useState([]);
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Ban form state
  const [banUsername, setBanUsername] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banDays, setBanDays] = useState("");

  // Generic authenticated request helper
  const request = useCallback(
    async (path, options = {}) => {
      const res = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
      });
      if (res.status === 204) return null;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
      return data;
    },
    [token]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [all, shown] = await Promise.all([
        request("/api/reports/"),
        request(statusFilter ? `/api/reports/?status=${statusFilter}` : "/api/reports/"),
      ]);
      setAllReports(toList(all));
      setReports(toList(shown));
      if (tab === "topics") setTopics(toList(await request("/api/topics/")));
      if (tab === "entries") setEntries(toList(await request("/api/entries/")));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [request, statusFilter, tab]);

  useEffect(() => {
    if (isModerator) load();
  }, [isModerator, load]);

  // Statistics derived from the report queue
  const stats = useMemo(() => {
    const count = (s) => allReports.filter((r) => r.status === s).length;
    return {
      total: allReports.length,
      pending: count("pending"),
      resolved: count("resolved"),
      rejected: count("rejected"),
    };
  }, [allReports]);

  // Run an action, then refresh and show a message
  const run = async (fn, okMessage) => {
    setError("");
    setNotice("");
    try {
      await fn();
      setNotice(okMessage);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const resolveReport = (r, ban) =>
    run(
      () =>
        request(`/api/reports/${r.id}/resolve/`, {
          method: "POST",
          body: JSON.stringify({ delete_content: true, ban_user: ban }),
        }),
      ban ? "Report approved, content removed, user banned." : "Report approved, content removed."
    );

  const rejectReport = (r) =>
    run(
      () => request(`/api/reports/${r.id}/reject/`, { method: "POST", body: JSON.stringify({}) }),
      "Report rejected."
    );

  const deleteItem = (kind, id) => {
    if (!window.confirm(`Delete this ${kind}? This cannot be undone.`)) return;
    run(() => request(`/api/${kind === "topic" ? "topics" : "entries"}/${id}/`, { method: "DELETE" }),
      `${kind === "topic" ? "Topic" : "Entry"} deleted.`);
  };

  const banUser = (e) => {
    e.preventDefault();
    const name = banUsername.trim();
    if (!name) return;
    run(
      () =>
        request(`/api/users/${encodeURIComponent(name)}/ban/`, {
          method: "POST",
          body: JSON.stringify({
            reason: banReason,
            ban_duration_days: banDays ? Number(banDays) : null,
          }),
        }),
      `User ${name} banned.`
    ).then(() => { setBanReason(""); setBanDays(""); });
  };

  const unbanUser = () => {
    const name = banUsername.trim();
    if (!name) return;
    run(
      () => request(`/api/users/${encodeURIComponent(name)}/unban/`, { method: "POST", body: JSON.stringify({}) }),
      `User ${name} unbanned.`
    );
  };

  if (!token || !isModerator) return <Navigate to="/" replace />;

  const q = search.trim().toLowerCase();
  const filteredTopics = topics.filter((t) => !q || String(t.text || t.title || "").toLowerCase().includes(q));
  const filteredEntries = entries.filter((en) => !q || String(en.text || "").toLowerCase().includes(q));

  const card = "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4";
  const input =
    "w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400";

  return (
    <div className="relative min-h-screen text-white">
      <AnimatedBackground />
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ShieldCheck className="text-cyan-400" /> Moderation Panel
          </h1>
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm hover:border-cyan-400"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* Statistics */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Total reports", stats.total, "text-cyan-300"],
            ["Pending", stats.pending, "text-amber-300"],
            ["Approved", stats.resolved, "text-emerald-300"],
            ["Rejected", stats.rejected, "text-rose-300"],
          ].map(([label, value, color]) => (
            <div key={label} className={card}>
              <div className="text-xs text-slate-400">{label}</div>
              <div className={`text-3xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mb-4 flex flex-wrap gap-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setSearch(""); }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition ${
                tab === id
                  ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-semibold shadow-[0_0_25px_rgba(6,182,212,0.5)]"
                  : "border border-white/10 hover:border-cyan-400"
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
            <AlertTriangle size={14} /> {error}
          </div>
        )}
        {notice && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {notice}
          </div>
        )}

        {/* Reports */}
        {tab === "reports" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              {["pending", "resolved", "rejected", ""].map((s) => (
                <button
                  key={s || "all"}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-lg px-3 py-1 text-xs ${
                    statusFilter === s ? "bg-cyan-500/20 text-cyan-300" : "border border-white/10 text-slate-400"
                  }`}
                >
                  {s || "all"}
                </button>
              ))}
            </div>
            {reports.length === 0 && !loading && (
              <div className={`${card} text-center text-slate-400`}>No reports.</div>
            )}
            {reports.map((r) => (
              <div key={r.id} className={card}>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full border px-2 py-0.5 ${STATUS_STYLES[r.status] || ""}`}>{r.status}</span>
                  <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-rose-300">
                    {r.reason_display || r.reason}
                  </span>
                  <span className="text-slate-400">
                    #{r.id} · by {r.reporter} · {r.target_type || "content"}
                    {r.reported_user ? ` · author ${r.reported_user}` : ""}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-sm text-slate-200">
                  {r.target_preview || r.content_snapshot || "(content unavailable)"}
                </p>
                {r.description && <p className="mt-2 text-sm text-slate-400">Reporter note: {r.description}</p>}
                {r.topic_id_for_link && (
                  <Link to={`/topics/${r.topic_id_for_link}`} className="mt-2 inline-block text-xs text-cyan-400 hover:underline">
                    Open topic
                  </Link>
                )}
                {r.status === "pending" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => resolveReport(r, false)} className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/30">
                      <CheckCircle2 size={14} /> Approve &amp; remove
                    </button>
                    {r.reported_user && (
                      <button onClick={() => resolveReport(r, true)} className="flex items-center gap-1 rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/30">
                        <Ban size={14} /> Approve &amp; ban user
                      </button>
                    )}
                    <button onClick={() => rejectReport(r)} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-400">
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">
                    {r.status} by {r.resolved_by || "—"}
                    {r.content_removed ? " · content removed" : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Topics & entries */}
        {(tab === "topics" || tab === "entries") && (
          <div className="space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-slate-500" />
              <input className={`${input} pl-9`} placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {(tab === "topics" ? filteredTopics : filteredEntries).map((item) => (
              <div key={item.id} className={`${card} flex items-start justify-between gap-3`}>
                <div className="min-w-0">
                  <div className="text-xs text-slate-500">
                    #{item.id} · {item.owner || item.author || "unknown"}
                  </div>
                  <p className="mt-1 line-clamp-3 break-words text-sm text-slate-200">{item.text || item.title}</p>
                </div>
                <button
                  onClick={() => deleteItem(tab === "topics" ? "topic" : "entry", item.id)}
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/30"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Ban users */}
        {tab === "users" && (
          <form onSubmit={banUser} className={`${card} space-y-3`}>
            <input className={input} placeholder="Username" value={banUsername} onChange={(e) => setBanUsername(e.target.value)} />
            <input className={input} placeholder="Reason (optional)" value={banReason} onChange={(e) => setBanReason(e.target.value)} />
            <input className={input} type="number" min="1" placeholder="Days (empty = permanent)" value={banDays} onChange={(e) => setBanDays(e.target.value)} />
            <div className="flex gap-2">
              <button type="submit" className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2 text-sm font-semibold">
                <Ban size={14} /> Ban
              </button>
              <button type="button" onClick={unbanUser} className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm hover:border-cyan-400">
                <UserCheck size={14} /> Unban
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
