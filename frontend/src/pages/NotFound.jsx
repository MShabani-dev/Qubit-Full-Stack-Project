import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';
import AnimatedBackground from '../components/AnimatedBackground';

/**
 * NotFound Component (404 Page)
 * Shown when user navigates to a non-existent route
 */
export default function NotFound() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated background */}
      <AnimatedBackground />

      {/* Content */}
      <div className="relative z-10 text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Large animated 404 text */}
          <motion.h1
            className="text-9xl font-bold font-display bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-600 
                       bg-clip-text text-transparent mb-4"
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{ backgroundSize: '200% 200%' }}
          >
            404
          </motion.h1>

          {/* Subtitle */}
          <h2 className="text-3xl font-bold text-white mb-4">Page Not Found</h2>

          <p className="text-white/60 text-lg mb-8 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>

          {/* Action buttons */}
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              to="/"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 
                         text-white font-semibold shadow-glow hover:shadow-glow-lg transition-shadow"
            >
              <Home size={20} />
              Go Home
            </Link>

            <Link
              to="/topics"
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-cyan-500/30 
                         text-cyan-400 font-semibold hover:bg-cyan-500/10 transition-colors"
            >
              <Search size={20} />
              Browse Topics
            </Link>
          </div>
        </motion.div>

        {/* Floating particles effect */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-cyan-400/30 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
