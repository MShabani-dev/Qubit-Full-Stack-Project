import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getFeed } from "../api"; 
import AnimatedBackground from "../components/AnimatedBackground";

export default function Feed() {
  const [feedEntries, setFeedEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFeed()
      .then(data => setFeedEntries(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white text-center py-20">Loading feed...</div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8">
      <AnimatedBackground />
      <div className="max-w-2xl mx-auto relative z-10">
        <h1 className="text-3xl font-bold mb-6 text-cyan-400">Your Personalized Feed</h1>
        {feedEntries.length === 0 ? (
          <p className="text-slate-400">Your feed is empty. Follow some users or topics!</p>
        ) : (
          <div className="space-y-4">
            {feedEntries.map(entry => (
              <div key={entry.id} className="p-4 border border-slate-800 bg-slate-900/50 rounded-xl">
                <Link to={`/users/${entry.author}`} className="text-cyan-400 font-bold hover:underline mb-2 block">
                  @{entry.author}
                </Link>
                <p className="text-slate-300">{entry.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
