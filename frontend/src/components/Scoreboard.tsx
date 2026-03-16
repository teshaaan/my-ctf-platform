import { useState, useEffect } from 'react';

interface UserScore {
  username: string;
  score: number;
  rank: number;
}

interface ScoreboardProps {
  username: string | null;
}

export default function Scoreboard({ username }: ScoreboardProps) {
  const [leaderboard, setLeaderboard] = useState<UserScore[]>([]);

  useEffect(() => {
    fetch('http://localhost:3001/api/scoreboard')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setLeaderboard(data);
      })
      .catch(err => console.error(err));
  }, []);

  // Safely grab top 3 (even if there are less than 3 users in the DB)
  const firstPlace = leaderboard[0];
  const secondPlace = leaderboard[1];
  const thirdPlace = leaderboard[2];

  return (
    <div className="relative">
      <div className="absolute inset-0 cyber-grid opacity-[0.03] dark:opacity-[0.05] pointer-events-none"></div>
      
      {/* HEADER SECTION */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">Global Rankings</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-2xl">
            This is just friendly competition.
          </p>
        </div>
      </div>

      {/* TOP 3 PODIUM */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 relative z-10">
        
        {/* 2ND PLACE */}
        <div className="order-2 md:order-1 flex flex-col items-center justify-end h-full">
          {secondPlace && (
            <div className="w-full bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 text-center relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-500 transition-all">
              <div className="relative">
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-3 inline-flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-slate-400 dark:text-slate-300">military_tech</span>
                  2nd
                </p>
                <h3 className="font-bold text-xl mb-1 dark:text-white">{secondPlace.username}</h3>
                <p className="text-primary font-mono font-bold text-2xl">{secondPlace.score} <span className="text-xs font-normal text-slate-400">PTS</span></p>
              </div>
            </div>
          )}
        </div>

        {/* 1ST PLACE */}
        <div className="order-1 md:order-2 flex flex-col items-center justify-end h-full">
          {firstPlace && (
            <div className="w-full bg-white dark:bg-slate-800 p-8 rounded-3xl border-2 border-primary/30 dark:border-primary/50 text-center relative overflow-hidden shadow-2xl shadow-primary/10 group transform md:scale-110">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all"></div>
              <div className="relative">
                <p className="text-sm font-semibold uppercase tracking-wider text-yellow-600 dark:text-yellow-400 mb-3 inline-flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-yellow-500 dark:text-yellow-400">military_tech</span>
                  1st
                </p>
                <h3 className="font-black text-2xl mb-1 text-slate-900 dark:text-white tracking-tight">{firstPlace.username}</h3>
                <p className="text-primary font-mono font-black text-3xl">{firstPlace.score} <span className="text-xs font-normal text-slate-400">PTS</span></p>
              </div>
            </div>
          )}
        </div>

        {/* 3RD PLACE */}
        <div className="order-3 flex flex-col items-center justify-end h-full">
          {thirdPlace && (
            <div className="w-full bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 text-center relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-500 transition-all">
              <div className="relative">
                <p className="text-sm font-semibold uppercase tracking-wider text-orange-900 dark:text-orange-500 mb-3 inline-flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-orange-900 dark:text-orange-500">military_tech</span>
                  3rd
                </p>
                <h3 className="font-bold text-xl mb-1 dark:text-white">{thirdPlace.username}</h3>
                <p className="text-primary font-mono font-bold text-2xl">{thirdPlace.score} <span className="text-xs font-normal text-slate-400">PTS</span></p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FULL LEADERBOARD TABLE */}
      <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl relative z-10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-5 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">Rank</th>
                <th className="px-6 py-5 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">Username</th>
                <th className="px-6 py-5 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {leaderboard.map((user, index) => {
                const rank = index + 1;
                const isCurrentUser = user.username === username;
                
                // Determine rank styling
                let rankBadge;
                if (rank === 1) rankBadge = <div className="w-8 h-8 rounded-full rank-gradient-1 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-orange-500/20">1</div>;
                else if (rank === 2) rankBadge = <div className="w-8 h-8 rounded-full rank-gradient-2 flex items-center justify-center text-white font-bold text-sm">2</div>;
                else if (rank === 3) rankBadge = <div className="w-8 h-8 rounded-full rank-gradient-3 flex items-center justify-center text-white font-bold text-sm">3</div>;
                else rankBadge = <span className="text-slate-500 font-mono">#{rank}</span>;

                return (
                  <tr key={user.username} className={`transition-colors ${isCurrentUser ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-primary' : 'hover:bg-slate-50/80 dark:hover:bg-slate-700/30'}`}>
                    <td className="px-6 py-4">{rankBadge}</td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${isCurrentUser ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>
                        {user.username} {isCurrentUser && "(You)"}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-mono font-bold ${isCurrentUser ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>
                      {user.score}
                    </td>
                  </tr>
                );
              })}
              {leaderboard.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    No users on the scoreboard yet. Be the first!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}