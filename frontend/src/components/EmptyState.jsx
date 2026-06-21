import { motion } from 'framer-motion';

/**
 * EmptyState Component
 * Reusable component to show when there's no data to display
 * 
 * @param {React.Component} icon - Lucide icon component
 * @param {string} title - Main heading text
 * @param {string} description - Explanation text
 * @param {string} actionText - Button text (optional)
 * @param {boolean} showAction - Whether to show action button
 * @param {function} onAction - Click handler for action button
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  showAction = false,
  onAction,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      {/* Animated icon with pulsing glow effect */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="mb-6 rounded-full bg-cyan-500/10 p-6"
      >
        <Icon size={48} className="text-cyan-400" />
      </motion.div>

      {/* Title */}
      <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>

      {/* Description */}
      <p className="text-white/60 text-center max-w-md mb-6">{description}</p>

      {/* Optional action button */}
      {showAction && actionText && onAction && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAction}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 
                     text-white font-semibold shadow-glow hover:shadow-glow-lg transition-shadow"
        >
          {actionText}
        </motion.button>
      )}
    </motion.div>
  );
}
