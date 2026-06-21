import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Layers, LogIn, UserPlus, LogOut, Menu, X, User, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext'; // Theme hook (provides current theme + toggle)
import QubitLogo from './QubitLogo'; // Animated quantum logo component

function Navbar({ username, handleLogout }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme(); // Access theme state and toggle function

  // Fallback: if the parent prop is empty (e.g. after a hard refresh),
  // read the persisted username from localStorage so the navbar still
  // reflects the real authentication state.
  const [localUser, setLocalUser] = useState(
    () => username || localStorage.getItem('username') || ''
  );

  // Keep local state in sync whenever the prop changes (login / logout).
  useEffect(() => {
    setLocalUser(username || localStorage.getItem('username') || '');
  }, [username]);

  // Sync auth state across browser tabs: if the user logs in/out in another
  // tab, the `storage` event fires here and we update accordingly.
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'username') {
        setLocalUser(e.newValue || '');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Close the mobile menu automatically whenever the route changes,
  // so it doesn't stay open after the user navigates somewhere.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Active username: prefer the prop, fall back to local state.
  const activeUser = username || localUser;

  const navLinks = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/topics', label: 'Topics', icon: Layers },
  ];

  // Handle logout: clear all auth-related keys, then notify the parent,
  // then redirect to the login page.
  const onLogout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('username');

    // Call the parent handler if it was provided.
    handleLogout?.();

    setLocalUser('');
    setOpen(false);
    navigate('/login');
  };

  // Check whether a given route is the currently active one.
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#0a0f1c]/80 dark:bg-gray-900/80 border-b border-white/10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo: closing the mobile menu on click prevents a stuck-open menu */}
          <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2 group">
            <QubitLogo size={40} />
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                aria-current={isActive(to) ? 'page' : undefined}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(to)
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </div>

          {/* Desktop Auth Area + Theme Toggle */}
          <div className="hidden md:flex items-center gap-2">
            {/* Theme Toggle Button (Desktop) */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </motion.button>

            {activeUser ? (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-sm text-gray-200">
                  <User size={16} className="text-indigo-400" />
                  Hello, <span className="font-semibold text-indigo-300">{activeUser}</span>
                </span>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onLogout}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium transition-colors"
                >
                  <LogOut size={16} />
                  Logout
                </motion.button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <LogIn size={16} />
                  Login
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 transition-opacity"
                >
                  <UserPlus size={16} />
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg text-gray-300 hover:bg-white/10 transition-colors"
            aria-label="Toggle mobile menu"
            aria-expanded={open}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu (animated open/close with theme toggle) */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden overflow-hidden border-t border-white/10 bg-[#0a0f1c]/95 dark:bg-gray-900/95"
          >
            <div className="px-4 py-4 flex flex-col gap-2">
              {/* Navigation Links */}
              {navLinks.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(to) ? 'page' : undefined}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive(to) ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              ))}

              {/* Theme Toggle (Mobile) */}
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 text-sm font-medium transition-colors"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun size={18} />
                    Light Mode
                  </>
                ) : (
                  <>
                    <Moon size={18} />
                    Dark Mode
                  </>
                )}
              </button>

              <div className="h-px bg-white/10 my-2" />

              {/* Auth Section */}
              {activeUser ? (
                <>
                  <span className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300">
                    <User size={18} className="text-indigo-400" />
                    Hello, <span className="font-semibold text-indigo-300">{activeUser}</span>
                  </span>
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium transition-colors"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg text-gray-300 hover:bg-white/5 text-sm font-medium transition-colors"
                  >
                    <LogIn size={18} />
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg text-white bg-gradient-to-r from-indigo-500 to-purple-600 text-sm font-medium"
                  >
                    <UserPlus size={18} />
                    Register
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

export default Navbar;
