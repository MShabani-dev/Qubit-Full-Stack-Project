/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // NEW: Enable dark mode with 'class' strategy
  darkMode: 'class',
  
  theme: {
    extend: {
      colors: {
        // Cohesive palette built around your existing cyan accent
        base: {
          900: "#0a0f1c", // your current background
          800: "#0f1626",
          700: "#161f33",
        },
        accent: {
          DEFAULT: "#06b6d4", // cyan-500, your main accent
          glow: "#22d3ee",    // cyan-400, for glows/hovers
          soft: "#67e8f9",
        },
        violet: {
          glow: "#a78bfa",
        },
      },
      fontFamily: {
        // Distinctive heading font + clean body + mono for "tech" feel
        display: ['"Space Grotesk"', "sans-serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(6, 182, 212, 0.25)",
        "glow-lg": "0 0 80px rgba(6, 182, 212, 0.35)",
      },
      keyframes: {
        // Slow-moving background blobs
        blob: {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -40px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 30px) scale(0.95)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        blob: "blob 14s ease-in-out infinite",
        "blob-slow": "blob 20s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}
