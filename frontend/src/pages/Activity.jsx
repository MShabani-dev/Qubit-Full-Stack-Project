import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity as ActivityIcon,
  MessageSquare,
  FileText,
  Heart,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import api from '../api/api';

// Map each activity `type` to an icon, accent colors, and a message builder.
const ACTIVITY_CONFIG = {
  topic_created: {
    icon: MessageSquare,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    message: (a) => (
      <span>
        created a new topic{' '}
        <Link to={`/topics/${a.topic_id}`} className="font-semibold text-indigo-300 hover:underline">
          {a.topic_text || 'Untitled'}
        </Link>
      </span>
    ),
  },
  entry_created: {
    icon: FileText,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    message: (a) => (
      <span>
        posted an entry in{' '}
        <Link to={`/topics/${a.topic_id}`} className="font-semibold text-emerald-300 hover:underline">
          {a.topic_text || 'a topic'}
        </Link>
        {a.entry_text && (
          <span className="block mt-1 text-gray-400 italic line-clamp-2 border-l-2 border-emerald-500/30 pl-2">
            "{a.entry_text}"
          </span>
        )}
      </span>
    ),
  },
  like_created: {
    icon: Heart,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    message: (a) => (
      <span>
        {a.entry_id ? (
          <>
            liked an entry in{' '}
            <Link to={`/topics/${a.topic_id}`} className="font-semibold text-rose-300 hover:underline">
              {a.topic_text || 'a topic'}
            </Link>
          </>
        ) : (
          <>
            liked the topic{' '}
            <Link to={`/topics/${a.topic_id}`} className="font-semibold text-rose-300 hover:underline">
              {a.topic_text || 'a topic'}
            </Link>
          </>
        )}
        {a.entry_text && (
          <span className="block mt-1 text-gray-400 italic line-clamp-2 border-l-2 border-rose-500/30 pl-2">
            "{a.entry_text}"
          </span>
        )}
      </span>
    ),
  },
};

const FALLBACK_CONFIG = {
  icon: ActivityIcon,
  color: 'text-gray-400',
  bg: 'bg-gray-500/10',
  message: () => <span>performed an action</span>,
};

function timeAgo(timestamp) {
  if (!timestamp) return '';
  const then = new Date(timestamp).getTime();
  const seconds = Math.floor((Date.now() - then) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function Activity() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get('/api/activity/');
        const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
        if (mounted) setActivities(list);
      } catch (err) {
        console.error('Failed to load activity feed:', err);
        if (mounted) setError('Could not load the activity feed. Please try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-0 pb-12">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6 mt-4">
        <div className="p-2 rounded-xl bg-indigo-500/10">
          <ActivityIcon size={24} className="text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Activity Feed</h1>
          <p className="text-sm text-gray-400">The latest activity across the community</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={22} className="animate-spin mr-2" />
          Loading activity...
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 text-red-400 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {!loading && !error && activities.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <ActivityIcon size={40} className="mx-auto mb-3 opacity-40" />
          No activity yet. Be the first to start a conversation.
        </div>
      )}

      {!loading && !error && activities.length > 0 && (
        <ul className="space-y-3">
          {activities.map((activity, index) => {
            const config = ACTIVITY_CONFIG[activity.type] || FALLBACK_CONFIG;
            const Icon = config.icon;
            const key = activity.id ?? `${activity.type}-${activity.topic_id}-${index}`;

            return (
              <motion.li
                key={key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className="flex items-start gap-3 p-4 rounded-xl bg-[#1a1d2d]/50 border border-white/5 hover:bg-[#1a1d2d] transition-colors shadow-sm hover:shadow-md"
              >
                {/* Type icon */}
                <div className={`p-2 rounded-lg ${config.bg} shrink-0 mt-1`}>
                  <Icon size={18} className={config.color} />
                </div>

                {/* Message + timestamp */}
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-gray-300 leading-relaxed">
                    <Link
                      to={`/users/${activity.actor}`}
                      className="font-semibold text-white hover:text-indigo-300 transition-colors"
                    >
                      {activity.actor || 'Someone'}
                    </Link>{' '}
                    {config.message(activity)}
                  </div>
                  <span className="text-xs text-gray-500 mt-1 block">{timeAgo(activity.date)}</span>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default Activity;
