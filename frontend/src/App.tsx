import { useState, useEffect } from 'react';
import {Routes, Route, Navigate, useNavigate, Link, useLocation} from 'react-router-dom';
import toast, {Toaster} from 'react-hot-toast';

import Login from './components/Login';
import Scoreboard from './components/Scoreboard';
import ChallengeBoard from './components/ChallengeBoard';
import AdminBoard from './components/AdminBoard';
import AdminLogin from './components/AdminLogin';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Signup from './components/Signup';

export default function App() {
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  // Handle Theme Toggling globally
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const handleAuthSuccess = (username: string) => {
    setLoggedInUser(username);
    toast.success(`Welcome, ${username}!`);
    navigate('/dashboard'); 
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    toast.success('Logged out successfully!');
    navigate('/');
  }

  const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
    if (!loggedInUser) return <Navigate to="/login" />; // Kick out unauthorized users

    return (
      <div className="bg-background-light dark:bg-background-dark text-secondary dark:text-gray-200 min-h-screen flex flex-col transition-colors duration-300">
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-secondary/80 border-b border-gray-200 dark:border-gray-800 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              
              <Link to="/dashboard" className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-3xl">security</span>
                <span className="text-xl font-bold tracking-tight text-secondary dark:text-white uppercase font-display">
                  Cipher<span className="text-primary">Core</span>
                </span>
              </Link>
              
              <nav className="hidden md:flex space-x-8 items-center">
                <Link to="/dashboard" className={`${location.pathname === "/dashboard" ? "text-primary border-b-2 border-primary" : "text-secondary dark:text-gray-300 hover:text-primary"} font-bold pb-1 transition-colors`}>
                  Dashboard
                </Link>
                <Link to="/challenges" className={`${location.pathname === "/challenges" ? "text-primary border-b-2 border-primary" : "text-secondary dark:text-gray-300 hover:text-primary"} font-bold pb-1 transition-colors`}>
                  Challenges
                </Link>
                <Link to="/scoreboard" className={`${location.pathname === "/scoreboard" ? "text-primary border-b-2 border-primary" : "text-secondary dark:text-gray-300 hover:text-primary"} font-bold pb-1 transition-colors`}>
                  Scoreboard
                </Link>
              </nav>

              <div className="flex items-center gap-4">
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full hover:bg-gray-100 dark:bg-gray-800 text-accent transition-colors">
                  <span className="material-symbols-outlined">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
                </button>
                <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-700">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-primary uppercase">Player</p>
                    <p className="text-sm font-semibold dark:text-white">{loggedInUser}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full border-2 border-primary bg-secondary flex items-center justify-center text-white font-bold uppercase">
                    {loggedInUser.charAt(0)}
                  </div>
                  <button onClick={handleLogout} className="ml-2 p-2 text-slate-400 hover:text-primary transition-colors flex items-center" title="Sign Out">
                    <span className="material-symbols-outlined">logout</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </header>

        <main className="flex-grow">
          {children}
        </main>

        <footer className="mt-20 border-t border-gray-200 dark:border-gray-800 py-12 bg-white dark:bg-secondary/30">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm text-accent flex flex-col items-center">
            <span className="material-symbols-outlined text-primary text-2xl mb-2">security</span>
            <p>© 2026 CipherCore. All flags reserved.</p>
          </div>
        </footer>
      </div>
    );
  };

  // --- THE ROUTING ENGINE ---
  return (
  <>
    <Toaster position="top-right" toastOptions={{
      duration: 3000,
      className: 'dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xl font-mono text-sm'
    }} />

    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage onStartClick={() => navigate('/login')} />} />
      <Route path="/login" element={<Login onLogin={handleAuthSuccess} onSwitchToSignup={() => navigate('/signup')} />} />
      <Route path="/signup" element={<Signup onSignup={handleAuthSuccess} onSwitchToLogin={() => navigate('/login')} />} />
      
      {/* Admin Route */}
      <Route path="/admin" element={
        !loggedInUser ? (
          <AdminLogin onAdminLogin={handleAuthSuccess} />
        ) : (
          <div className="p-10 font-sans max-w-5xl mx-auto bg-background-light dark:bg-background-dark min-h-screen text-secondary dark:text-white">
            <div className="flex justify-between items-center border-b-2 border-primary pb-5 mb-5">
              <h1 className="text-primary text-2xl font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">admin_panel_settings</span> Admin Control Panel
              </h1>
              <p>Logged in as: <strong>{loggedInUser}</strong></p>
            </div>
            <AdminBoard username={loggedInUser} />
          </div>
        )
      } />

      {/* Protected Player Routes */}
      <Route path="/dashboard" element={<ProtectedLayout><Dashboard username={loggedInUser || ""} /></ProtectedLayout>} />
      <Route path="/challenges" element={<ProtectedLayout><ChallengeBoard username={loggedInUser || ""} /></ProtectedLayout>} />
      <Route path="/scoreboard" element={<ProtectedLayout><div className="max-w-7xl mx-auto py-8"><Scoreboard username={loggedInUser} /></div></ProtectedLayout>} />

      {/* Catch-all: If they type a weird URL, send them back to the start */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  </> 
  );
}