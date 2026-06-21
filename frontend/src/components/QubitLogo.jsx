import { motion } from 'framer-motion';

/**
 * QubitLogo - Animated quantum logo with the letter "Q" in the center.
 *
 * @param {number} size - Logo size in pixels (default 40).
 * @param {boolean} showText - Whether to show the "Qubit" text next to the icon (default true).
 */
function QubitLogo({ size = 40, showText = true }) {
  return (
    <div className="flex items-center gap-2 select-none">
      {/* Atomic/quantum icon */}
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
        initial={{ rotate: 0 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      >
        {/* indigo → purple gradient definition matching the site theme */}
        <defs>
          <linearGradient id="qubitGradient" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#6366f1" /> {/* indigo-500 */}
            <stop offset="100%" stopColor="#9333ea" /> {/* purple-600 */}
          </linearGradient>

          {/* Glowing halo for the central core */}
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a5b4fc" />
            <stop offset="100%" stopColor="#6366f1" />
          </radialGradient>
        </defs>

        {/* Three elliptical orbits rotating around the center (inspired by the Bohr/qubit model) */}
        <ellipse
          cx="50"
          cy="50"
          rx="42"
          ry="16"
          stroke="url(#qubitGradient)"
          strokeWidth="2.5"
          opacity="0.7"
        />
        <ellipse
          cx="50"
          cy="50"
          rx="42"
          ry="16"
          stroke="url(#qubitGradient)"
          strokeWidth="2.5"
          opacity="0.7"
          transform="rotate(60 50 50)"
        />
        <ellipse
          cx="50"
          cy="50"
          rx="42"
          ry="16"
          stroke="url(#qubitGradient)"
          strokeWidth="2.5"
          opacity="0.7"
          transform="rotate(120 50 50)"
        />
      </motion.svg>

      {/* Central core + letter Q (kept separate from the rotating SVG so the letter stays still) */}
      <motion.div
        className="absolute flex items-center justify-center"
        style={{ width: size, height: size, marginLeft: 0 }}
        initial={{ scale: 0.9, opacity: 0.8 }}
        animate={{ scale: [0.9, 1, 0.9], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span
          className="font-extrabold bg-gradient-to-br from-indigo-400 to-purple-500 bg-clip-text text-transparent"
          style={{ fontSize: size * 0.4 }}
        >
          Q
        </span>
      </motion.div>

      {/* Text next to the logo */}
      {showText && (
        <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Qubit
        </span>
      )}
    </div>
  );
}

export default QubitLogo;
