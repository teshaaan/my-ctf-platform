import { useState, useEffect } from 'react';
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
  const [activeTab, setActiveTab] = useState<"dashboard" |"challenges" | "scoreboard">("dashboard");
  const [showLanding, setShowLanding] = useState(true); 
  const [isDarkMode, setIsDarkMode] = useState(true); // Defaulting to dark mode to match theme
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  // Handle Theme Toggling globally
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const isAdminRoute = window.location.pathname === '/admin';

  // --- ADMIN FLOW ---
  if (isAdminRoute) {
    if (!loggedInUser) return <AdminLogin onAdminLogin={setLoggedInUser} />;
    return (
      <div className="p-10 font-sans max-w-5xl mx-auto bg-background-light dark:bg-background-dark min-h-screen text-secondary dark:text-white transition-colors duration-300">
        <div className="flex justify-between items-center border-b-2 border-primary pb-5 mb-5">
          <h1 className="text-primary text-2xl font-bold flex items-center gap-2">
            <span className="material-icons">admin_panel_settings</span> Admin Control Panel
          </h1>
          <p>Logged in as: <strong>{loggedInUser}</strong></p>
        </div>
        <AdminBoard username={loggedInUser} />
      </div>
    );
  }

  // --- LOGIN & LANDING FLOW ---
  if (!loggedInUser) {
    if (showLanding) return <LandingPage onStartClick={() => setShowLanding(false)} />;
    
    if (authMode === "signup") {
      return (
        <Signup 
          onSignup={(name) => setLoggedInUser(name)} 
          onSwitchToLogin={() => setAuthMode("login")} 
        />
      );
    }

    return (
      <Login 
        onLogin={(name) => setLoggedInUser(name)} 
        onSwitchToSignup={() => setAuthMode("signup")} 
      />
    );
  }
  // --- MAIN PLAYER UI ---
  return (
    <div className="bg-background-light dark:bg-background-dark text-secondary dark:text-gray-200 min-h-screen flex flex-col transition-colors duration-300">
      
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-secondary/80 border-b border-gray-200 dark:border-gray-800 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="material-icons text-primary text-3xl">security</span>
              <span className="text-xl font-bold tracking-tight text-secondary dark:text-white uppercase font-display">
                Cipher<span className="text-primary">Core</span>
              </span>
            </div>
            
            {/* TAB NAVIGATION */}
            <nav className="hidden md:flex space-x-8 items-center">
              <button 
                onClick={() => setActiveTab("dashboard")}
                className={`${activeTab === "dashboard" ? "text-primary border-b-2 border-primary" : "text-secondary dark:text-gray-300 hover:text-primary"} font-bold pb-1 transition-colors`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => setActiveTab("challenges")}
                className={`${activeTab === "challenges" ? "text-primary border-b-2 border-primary" : "text-secondary dark:text-gray-300 hover:text-primary"} font-bold pb-1 transition-colors`}
              >
                Challenges
              </button>
              <button 
                onClick={() => setActiveTab("scoreboard")}
                className={`${activeTab === "scoreboard" ? "text-primary border-b-2 border-primary" : "text-secondary dark:text-gray-300 hover:text-primary"} font-bold pb-1 transition-colors`}
              >
                Scoreboard
              </button>
            </nav>

            {/* USER PROFILE & CONTROLS */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-accent transition-colors"
              >
                <span className="material-icons">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
              </button>
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-700">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-primary uppercase">Player</p>
                  <p className="text-sm font-semibold dark:text-white">{loggedInUser}</p>
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-primary bg-secondary flex items-center justify-center text-white font-bold uppercase">
                  {loggedInUser ? loggedInUser.charAt(0) : ""}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* DYNAMIC CONTENT ROUTING */}
      <main className="flex-grow px-4 sm:px-6 lg:px-8">
        {activeTab === "dashboard" && <Dashboard username={loggedInUser ?? ""} />}
        {activeTab === "challenges" && <ChallengeBoard username={loggedInUser ?? ""} />}
        {activeTab === "scoreboard" && (
          <div className="max-w-7xl mx-auto py-8">
            <Scoreboard username={loggedInUser ?? ""} />  {/* <-- ADD THE USERNAME HERE */}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="mt-20 border-t border-gray-200 dark:border-gray-800 py-12 bg-white dark:bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center md:text-left grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
              <span className="material-icons text-primary text-2xl">security</span>
              <span className="text-xl font-bold tracking-tight text-secondary dark:text-white uppercase font-display">
                Cipher<span className="text-primary">Core</span>
              </span>
            </div>
            <p className="text-accent dark:text-gray-400 max-w-sm mx-auto md:mx-0">The ultimate playground for cybersecurity enthusiasts. Sharpen your skills, compete with the best, and secure the future.</p>
          </div>
          <div className="mt-8 md:mt-0 pt-8 border-t border-gray-100 dark:border-gray-800 md:border-none text-sm text-accent flex items-end justify-center md:justify-end">
            <p>© 2026 CipherCore. All flags reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}