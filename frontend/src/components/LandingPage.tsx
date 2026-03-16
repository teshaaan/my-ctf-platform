import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SiteFooter from './SiteFooter';

interface LandingPageProps {
  onStartClick: () => void;
}

export default function LandingPage({ onStartClick }: LandingPageProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize dark mode on load
  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' || 
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <div className="font-display bg-background-light dark:bg-background-dark text-navy dark:text-white transition-colors duration-300 min-h-screen">
      
      {/* HEADER */}
      <header className="fixed top-0 w-full z-50 border-b border-steel/20 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-xl">terminal</span>
              </div>
              <span className="text-xl font-extrabold tracking-tight font-mono text-navy dark:text-white">
                Cipher<span className="text-primary">Core</span>
              </span>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a className="text-sm font-medium hover:text-primary transition-colors text-navy dark:text-steel dark:hover:text-white" href="#">Dashboard</a>
              <a className="text-sm font-medium hover:text-primary transition-colors text-navy dark:text-steel dark:hover:text-white" href="#">Challenges</a>
              <a className="text-sm font-medium hover:text-primary transition-colors text-navy dark:text-steel dark:hover:text-white" href="#">Scoreboard</a>
            </nav>
            <div className="flex items-center gap-4">
              <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-steel/10 transition-colors">
                {isDarkMode ? (
                  <span className="material-symbols-outlined">light_mode</span>
                ) : (
                  <span className="material-symbols-outlined">dark_mode</span>
                )}
              </button>
              <Link to="/admin/login" className="px-4 py-2 text-sm font-semibold rounded-lg border border-navy/20 dark:border-white/20 text-navy dark:text-white hover:bg-navy/5 dark:hover:bg-white/5 transition-colors">
                Admin Portal
              </Link>
              <button onClick={onStartClick} className="px-5 py-2 text-sm font-semibold rounded-lg bg-navy dark:bg-white text-white dark:text-navy hover:opacity-90 transition-opacity">
                Log In
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="relative pt-32 pb-20 overflow-hidden min-h-screen flex items-center">
        <div className="absolute inset-0 circuit-pattern pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full hero-gradient pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Live CTF Season Starts Now
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold text-navy dark:text-white mb-6 leading-[1.1]">
              Conquer the world of <span className="text-primary italic">CTFs.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-steel dark:text-steel mb-10 leading-relaxed font-light">
              Hope y'all have a blast! This was just done for the love of the game.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={onStartClick} className="w-full sm:w-auto px-8 py-4 bg-primary text-white font-bold rounded-lg glow-effect transition-all flex items-center justify-center gap-2">
                Get Started <span className="material-symbols-outlined">rocket_launch</span>
              </button>
            </div>
            
            {/* STATS */}
            <div className="mt-16 border-t border-steel/20 pt-8">
              <div className="grid grid-cols-6 gap-2 md:gap-4 text-center">
                <div><div className="text-base md:text-xl font-bold text-navy dark:text-white">10%</div><div className="text-[11px] md:text-xs text-steel">Luck</div></div>
                <div><div className="text-base md:text-xl font-bold text-navy dark:text-white">20%</div><div className="text-[11px] md:text-xs text-steel">Skill</div></div>
                <div><div className="text-base md:text-xl font-bold text-navy dark:text-white">15%</div><div className="text-[11px] md:text-xs text-steel leading-tight">Concentrated power of will</div></div>
                <div><div className="text-base md:text-xl font-bold text-navy dark:text-white">5%</div><div className="text-[11px] md:text-xs text-steel">Pleasure</div></div>
                <div><div className="text-base md:text-xl font-bold text-navy dark:text-white">50%</div><div className="text-[11px] md:text-xs text-steel">Pain</div></div>
                <div><div className="text-base md:text-xl font-bold text-navy dark:text-white">100%</div><div className="text-[11px] md:text-xs text-steel leading-tight">Reason to remember the name</div></div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter className="relative z-10" />
    </div>
  );
}