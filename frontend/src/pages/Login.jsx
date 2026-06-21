import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, Lock, LogIn, AlertCircle, CheckCircle, Sparkles } from "lucide-react";
import api from "../api/api";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username.trim() || !password) {
      showToast("error", "Username and password are required.");
      return;
    }

    setLoading(true);
    try {
      // Clear stale session before fresh login
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      localStorage.removeItem("username");

      // SimpleJWT TokenObtainPairView -> returns { access, refresh }
      const res = await api.post("api/login/", {
        username: username.trim(),
        password,
      });

      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);
      localStorage.setItem("username", username.trim());

      onLogin?.(username.trim());
      showToast("success", "Welcome back! Redirecting...");
      setTimeout(() => navigate("/"), 1000);
    } catch (err) {
      const data = err.response?.data;
      const msg =
        data?.detail ||
        data?.username?.[0] ||
        data?.password?.[0] ||
        data?.non_field_errors?.[0] ||
        "Invalid username or password.";
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-950">
      {/* Animated Background Orbs - matching Home.jsx aesthetic */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl"
        />
      </div>

      {/* Toast Notification */}
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            transition={{ duration: 0.3, type: "spring" }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3
                        rounded-xl px-6 py-3.5 font-medium shadow-2xl backdrop-blur-xl border
                        ${
                          toast.type === "success"
                            ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-100"
                            : "bg-red-500/20 border-red-400/40 text-red-100"
                        }`}
          >
            {toast.type === "success" ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span className="text-sm">{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Login Card - Glassmorphism matching Home.jsx */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Status Badge (matching Home.jsx system status) */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="flex justify-center mb-6"
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full
                       bg-black/40 backdrop-blur-md border border-cyan-500/20"
          >
            <motion.span
              className="w-2 h-2 rounded-full bg-cyan-400"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-sm font-medium text-white/80">
              Secure Login Portal
            </span>
          </div>
        </motion.div>

        {/* Card Container */}
        <div
          className="rounded-2xl border border-cyan-500/20
                     bg-black/40 backdrop-blur-md p-8
                     shadow-[0_0_40px_rgba(34,211,238,0.15)]"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full
                         bg-cyan-400/10 border border-cyan-400/20 mb-4"
            >
              <Sparkles className="text-cyan-400" size={28} />
            </motion.div>
            <h1 className="text-3xl font-bold font-display text-gradient mb-2">
              Welcome Back
            </h1>
            <p className="text-white/60 text-sm">
              Log in to continue your journey
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Username Input */}
            <div className="relative group">
              <User
                className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-cyan-400/60
                           group-focus-within:text-cyan-400 transition"
              />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full rounded-xl bg-black/30 border border-cyan-500/20
                           py-3.5 pl-11 pr-4 text-white placeholder-white/40
                           outline-none transition
                           focus:border-cyan-500/50 focus:bg-black/40
                           focus:shadow-[0_0_20px_rgba(34,211,238,0.15)]"
              />
            </div>

            {/* Password Input */}
            <div className="relative group">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-cyan-400/60
                           group-focus-within:text-cyan-400 transition"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl bg-black/30 border border-cyan-500/20
                           py-3.5 pl-11 pr-4 text-white placeholder-white/40
                           outline-none transition
                           focus:border-cyan-500/50 focus:bg-black/40
                           focus:shadow-[0_0_20px_rgba(34,211,238,0.15)]"
              />
            </div>

            {/* Login Button (matching Home.jsx CTA) */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="group w-full flex items-center justify-center gap-2 rounded-xl
                         bg-cyan-400 hover:bg-cyan-300 py-3.5 font-semibold text-black
                         shadow-[0_0_20px_rgba(34,211,238,0.5)] transition
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="h-5 w-5 border-2 border-black/20 border-t-black rounded-full"
                  />
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Login</span>
                  <motion.span
                    className="inline-block"
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    →
                  </motion.span>
                </>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-cyan-500/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-black/40 text-white/40">
                New to Qubit?
              </span>
            </div>
          </div>

          {/* Register Link */}
          <Link
            to="/register"
            className="block text-center rounded-xl border border-cyan-500/20
                       bg-black/20 py-3 font-medium text-white
                       hover:border-cyan-500/50 hover:bg-black/30 transition
                       hover:shadow-[0_0_20px_rgba(34,211,238,0.15)]"
          >
            Create New Account
          </Link>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-white/40 mt-6">
          By logging in, you agree to our terms and privacy policy
        </p>
      </motion.div>
    </div>
  );
}
