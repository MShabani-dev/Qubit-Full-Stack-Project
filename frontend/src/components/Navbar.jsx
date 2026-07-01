import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
// Icons imported from lucide-react, including the new 'Activity' icon and fixed 'Moon' icon
import { Home, Layers, LogIn, UserPlus, LogOut, Menu, X, User, Sun, Moon, Activity } from 'lucide-react';
import { useTheme } from '../context/ThemeContext'; // Theme hook for light/dark mode
import QubitLogo from './QubitLogo'; // Custom animated logo component

function Navbar({ username, handleLogout }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme(); // Access theme state and toggle function

  // Fallback: If the parent prop is empty, check localStorage.
  // This ensures the navbar reflects the authentication state even after a hard refresh.
  const [localUser, setLocalUser] = useState(
    () => username || localStorage.getItem('username') || ''
  );

  // Sync local state whenever the username prop changes (e.g., login or logout events).
  useEffect(() => {
    setLocalUser(username || localStorage.getItem('username') || '');
  }, [username]);

  // Sync auth state across different browser tabs.
  // If a user logs out in another tab, this updates the UI in the current tab.
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'username') {
        setLocalUser(e.newValue || '');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Automatically close the mobile menu whenever the route (URL) changes.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Determine the active user: prefer the passed prop, otherwise fallback to local state.
  const activeUser = username || localUser;

  // Define navigation links centrally to map over them in both desktop and mobile views.
  const navLinks = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/topics', label: 'Topics', icon: Layers },
    { to: '/activity', label: 'Activity', icon: Activity },
  ];

  // Handle user logout process.
  const onLogout = () => {
    // Clear authentication data from local storage.
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('username');

    // Trigger parent logout handler if provided.
    handleLogout?.();

    // Reset local state, close menu, and redirect to the login page.
    setLocalUser('');
    setOpen(false);
    navigate('/login');
  };

  // Helper function to check if a specific path is the current active route.
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#0a0f1c]/80 dark:bg-gray-900/80 border-b border-white/10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo Section */}
          <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2 group">
            <QubitLogo size={40} />
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {/* Destructuring parameters correctly using ({ ... }) */}
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

          {/* Desktop Right Section: Theme Toggle & Authentication */}
          <div className="hidden md:flex items-center gap-2">
            
            {/* Theme Toggle Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </motion.button>

            {/* Authentication Area */}
            {activeUser ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-sm text-gray-200 hover:bg-white/10 transition-colors"
                  title="View your profile"
                >
                  <User size={16} className="text-indigo-400" />
                  Hello, <span className="font-semibold text-indigo-300">{activeUser}</span>
                </Link>
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

          {/* Mobile Menu Hamburger Toggle */}
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

      {/* Mobile Menu Dropdown (Animated) */}
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
              
              {/* Mobile Navigation Links */}
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

              {/* Mobile Theme Toggle */}
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

              {/* Mobile Authentication Area */}
              {activeUser ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors"
                  >
                    <User size={18} className="text-indigo-400" />
                    Hello, <span className="font-semibold text-indigo-300">{activeUser}</span>
                  </Link>
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
