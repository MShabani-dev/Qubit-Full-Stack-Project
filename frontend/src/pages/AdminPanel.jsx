import { useEffect, useState, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api from "../api/api";
import useMe from '../useMe';

function ReportsTab() {
  const [status, setStatus] = useState('pending');
  const [items, setItems] = useState([]);
  const load = useCallback(() => {
    api.get('/api/reports/', { params: { status } }).then(r => setItems(r.data.results ?? r.data));
  }, [status]);
  useEffect(load, [load]);

  const act = async (id, path, body = {}) => {
    try { await api.post(`/api/reports/${id}/${path}/`, body); load(); }
    catch (e) { alert(e.response?.data?.detail || 'Error'); }
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {['pending', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-3 py-1 rounded ${status === s ? 'bg-blue-600' : 'bg-[#1e293b]'}`}>{s}</button>
        ))}
      </div>
      {items.length === 0 && <p className="text-gray-500">No reports.</p>}
      <div className="space-y-4">
        {items.map(r => (
          <div key={r.id} className="bg-[#0f172a] border border-gray-700 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-2">
              #{r.id} · {r.target_type} #{r.target_id} · reason: <b>{r.reason}</b> · by {r.reporter}
            </div>
            {r.description && <p className="text-sm mb-2">“{r.description}”</p>}
            <div className="bg-[#1e293b] rounded p-3 mb-3 text-gray-200 whitespace-pre-wrap">
              {r.target ? r.target.text : <i className="text-gray-500">Target already deleted</i>}
              {r.target?.author && <div className="text-xs text-gray-400 mt-1">author: {r.target.author}</div>}
              {r.target?.topic_id && <Link className="text-xs text-blue-400" to={`/topics/${r.target.topic_id}`}>open</Link>}
            </div>
            {r.status === 'pending' ? (
              <div className="flex flex-wrap gap-2">
                {r.target_type !== 'user' &&
                  <button onClick={() => window.confirm('Delete content?') && act(r.id, 'approve', { action: 'delete' })}
                    className="px-3 py-1 bg-red-600 rounded">Approve + delete</button>}
                <button onClick={() => window.confirm('Ban author?') && act(r.id, 'approve', { action: 'ban' })}
                  className="px-3 py-1 bg-orange-600 rounded">Approve + ban author</button>
                <button onClick={() => act(r.id, 'approve')} className="px-3 py-1 bg-green-700 rounded">Approve only</button>
                <button onClick={() => act(r.id, 'reject')} className="px-3 py-1 bg-gray-600 rounded">Reject</button>
              </div>
            ) : <div className="text-xs text-gray-500">{r.status} by {r.reviewed_by}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersTab() {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState([]);
  const load = useCallback(() => {
    api.get('/api/mod/users/', { params: { q } }).then(r => setUsers(r.data));
  }, [q]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const toggle = async (u) => {
    try {
      if (u.is_banned) await api.post(`/api/mod/users/${u.id}/unban/`);
      else {
        const reason = window.prompt('Ban reason?') ;
        if (reason === null) return;
        await api.post(`/api/mod/users/${u.id}/ban/`, { reason });
      }
      load();
    } catch (e) { alert(e.response?.data?.detail || 'Error'); }
  };

  return (
    <div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search username..."
        className="mb-4 p-2 w-full rounded bg-[#1e293b] border border-gray-600" />
      {users.map(u => (
        <div key={u.id} className="flex justify-between items-center bg-[#0f172a] border border-gray-700 rounded-lg p-3 mb-2">
          <span>{u.username} {u.is_staff && '🛡️'} {u.is_banned && <span className="text-red-400 text-xs">banned: {u.ban_reason}</span>}</span>
          {!u.is_staff && (
            <button onClick={() => toggle(u)}
              className={`px-3 py-1 rounded ${u.is_banned ? 'bg-green-700' : 'bg-red-600'}`}>
              {u.is_banned ? 'Unban' : 'Ban'}
            </button>)}
        </div>
      ))}
    </div>
  );
}

export default function AdminPanel() {
  const me = useMe();
  const [tab, setTab] = useState('reports');
  if (!localStorage.getItem('access')) return <Navigate to="/login" />;
  if (!me) return <div className="text-center mt-10">Loading...</div>;
  if (!me.is_staff) return <Navigate to="/" />;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Moderation Panel</h1>
      <div className="flex gap-3 mb-6">
        {['reports', 'users'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg ${tab === t ? 'bg-blue-600' : 'bg-[#1e293b]'}`}>{t}</button>
        ))}
      </div>
      {tab === 'reports' ? <ReportsTab /> : <UsersTab />}
    </div>
  );
}
