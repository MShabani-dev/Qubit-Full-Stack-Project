// AnimatedBackground.jsx
// A reusable, fixed full-screen background layer.
// It renders three blurred, slowly-moving "blobs" using the custom
// `animate-blob` keyframes + `accent`/`violet` colors defined in step 1.
// `pointer-events-none` ensures it never blocks clicks on real UI.

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-base-900">
      {/* Blob 1 — top-left, accent color */}
      <div
        className="absolute -top-32 -left-32 h-96 w-96 rounded-full
                   bg-accent-500/30 blur-3xl animate-blob"
      />
      {/* Blob 2 — bottom-right, violet color, delayed for offset motion */}
      <div
        className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full
                   bg-violet-500/30 blur-3xl animate-blob
                   [animation-delay:2s]"
      />
      {/* Blob 3 — center, subtle, longer delay */}
      <div
        className="absolute top-1/3 left-1/2 h-80 w-80 -translate-x-1/2
                   rounded-full bg-accent-400/20 blur-3xl animate-blob
                   [animation-delay:4s]"
      />

      {/* Soft dark vignette on top so text stays readable */}
      <div className="absolute inset-0 bg-base-900/40 backdrop-blur-[2px]" />
    </div>
  );
}
