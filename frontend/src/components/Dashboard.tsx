import { useState, useEffect } from 'react';

interface DashboardProps {
  username: string;
}

export default function Dashboard({ username }: DashboardProps) {
  const [score, setScore] = useState(0);
  const [rank, setRank] = useState(0);

  // Fetch real score and rank from the backend
  useEffect(() => {
    fetch('http://localhost:3001/api/scoreboard')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Find the user in the leaderboard to get their real score and rank
          const userIndex = data.findIndex(p => p.username === username);
          if (userIndex !== -1) {
            setRank(userIndex + 1);
            setScore(data[userIndex].score);
          }
        }
      })
      .catch(err => console.error(err));
  }, [username]);

  return (
    <div className="relative z-10 max-w-7xl mx-auto py-8">
      <div className="pattern-bg absolute inset-0 pointer-events-none opacity-50"></div>
      
      <header className="mb-8 relative z-10">
        <h1 className="text-3xl font-display font-bold text-secondary dark:text-white">
          Welcome back, <span className="text-primary">{username}</span>
        </h1>
        <p className="text-accent mt-1">Ready to exploit some vulnerabilities today?</p>
      </header>

      {/* TOP STATS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 relative z-10">
        
        {/* Rank Card */}
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-accent dark:text-gray-300 font-medium">Global Rank</span>
            <span className="material-symbols-outlined text-primary">military_tech</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-display font-bold text-secondary dark:text-white">
              {rank > 0 ? `#${rank}` : 'Unranked'}
            </span>
          </div>
          <div className="mt-4 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary h-full" style={{ width: rank > 0 ? `${Math.max(10, 100 - (rank * 5))}%` : '0%' }}></div>
          </div>
          <p className="text-xs text-accent mt-2">Based on total points</p>
        </div>

        {/* Points Card */}
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-accent dark:text-gray-300 font-medium">Total Points</span>
            <span className="material-symbols-outlined text-primary">token</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-display font-bold text-secondary dark:text-white">{score}</span>
            <span className="text-accent text-sm">pts</span>
          </div>
          <div className="mt-4 flex gap-1">
            <div className="h-1.5 flex-1 bg-primary rounded-full"></div>
            <div className="h-1.5 flex-1 bg-primary rounded-full"></div>
            <div className="h-1.5 flex-1 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
          </div>
          <p className="text-xs text-accent mt-2">Keep solving challenges!</p>
        </div>

        {/* Challenges Solved Card (Static for now) */}
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-accent dark:text-gray-300 font-medium">Clearance Level</span>
            <span className="material-symbols-outlined text-primary">security</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-display font-bold text-secondary dark:text-white">Alpha</span>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">ACCOUNT ACTIVE</span>
          </div>
          <p className="text-xs text-accent mt-2">Standard user privileges</p>
        </div>
      </div>

      {/* BOTTOM SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* RADAR CHART */}
        <div className="lg:col-span-8 space-y-8">
          <section className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-display font-bold text-secondary dark:text-white">Category Proficiency</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              
              <div className="relative flex items-center justify-center">
                <div className="w-48 h-48 border border-slate-200 dark:border-slate-700 radar-grid flex items-center justify-center relative">
                  <div className="w-32 h-32 border border-slate-200 dark:border-slate-700 radar-grid"></div>
                  <div className="w-16 h-16 border border-slate-200 dark:border-slate-700 radar-grid"></div>
                  <svg className="absolute inset-0 w-full h-full drop-shadow-lg" viewBox="0 0 100 100">
                    <polygon fill="rgba(239, 35, 60, 0.2)" points="50,15 90,40 75,85 25,85 10,40" stroke="#EF233C" strokeWidth="2"></polygon>
                  </svg>
                </div>
                <span className="absolute top-[-10px] text-[10px] font-bold uppercase tracking-wider text-secondary dark:text-white">Web</span>
                <span className="absolute right-[-20px] top-[40%] text-[10px] font-bold uppercase tracking-wider text-secondary dark:text-white">Crypto</span>
                <span className="absolute bottom-[-10px] right-[10%] text-[10px] font-bold uppercase tracking-wider text-secondary dark:text-white">Pwn</span>
                <span className="absolute bottom-[-10px] left-[10%] text-[10px] font-bold uppercase tracking-wider text-secondary dark:text-white">Rev</span>
                <span className="absolute left-[-20px] top-[40%] text-[10px] font-bold uppercase tracking-wider text-secondary dark:text-white">Misc</span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-secondary dark:text-white">Web Exploitation</span>
                    <span className="text-primary font-bold">85%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-primary h-full w-[85%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-secondary dark:text-white">Cryptography</span>
                    <span className="text-secondary dark:text-gray-400 font-bold">60%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-secondary dark:bg-gray-400 h-full w-[60%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-secondary dark:text-white">Binary / Pwn</span>
                    <span className="text-secondary dark:text-gray-400 font-bold">45%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-secondary dark:bg-gray-400 h-full w-[45%]"></div>
                  </div>
                </div>
              </div>

            </div>
          </section>
        </div>

        {/* RECENT ACTIVITY FEED */}
        <div className="lg:col-span-4 space-y-8">
          <section className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden h-full">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-display font-bold text-secondary dark:text-white">Recent Logs</h2>
              <span className="material-symbols-outlined text-accent text-sm">history</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              
              {/* Static logs for now until we build the backend feed */}
              <div className="p-6 flex gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">login</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-secondary dark:text-white">User <span className="font-bold">{username}</span> authenticated.</p>
                  <p className="text-xs text-accent mt-1">Just now</p>
                </div>
              </div>

              <div className="p-6 flex gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary">emoji_events</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-secondary dark:text-white">Account successfully initialized.</p>
                  <p className="text-xs text-accent mt-1">System Message</p>
                </div>
              </div>
              
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}