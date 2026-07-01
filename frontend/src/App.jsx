import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext'; // NEW: Import theme context
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Topics from './pages/Topics';
import Login from './pages/Login';
import Register from './pages/Register';
import TopicDetail from './pages/TopicDetail';
import NewTopic from "./pages/NewTopic";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound"; // NEW: 404 page
import UserProfile from "./pages/UserProfile";
import Activity from "./pages/Activity"; // NEW: Activity feed page

function App() {
  const [username, setUsername] = useState(localStorage.getItem("username") || "");

  // Restore session on page refresh
  useEffect(() => {
    const stored = localStorage.getItem('username');
    if (stored) setUsername(stored);
  }, []);

  // Handle successful login: save username to state and localStorage
  const handleLogin = (loggedInUsername) => {
    localStorage.setItem('username', loggedInUsername);
    setUsername(loggedInUsername);
  };

  // Handle logout: clear all auth tokens and username
  const handleLogout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('username');
    setUsername("");
  };

  return (
    // NEW: Wrap app with ThemeProvider for dark/light mode support
    <ThemeProvider>
      <Router>
        {/* NEW: Add transition classes for smooth theme switching */}
        <div className="bg-[#0a0f1c] dark:bg-gray-900 min-h-screen text-white transition-colors duration-300">
          <Navbar username={username} handleLogout={handleLogout} />
          <div className="pt-20">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/topics" element={<Topics />} />
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
              <Route path="/register" element={<Register onLogin={handleLogin} />} />
              <Route path="/topics/new" element={<NewTopic />} />
              <Route path="/topics/:id" element={<TopicDetail />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/users/:username" element={<UserProfile />} />
              {/* NEW: Site-wide activity feed */}
              <Route path="/activity" element={<Activity />} />
              {/* Catch-all route for 404 pages */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
