import { useState, useEffect } from 'react';

interface UserScore {
  username: string;
  score: number;
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

  // Helper to generate a cool robot avatar based on username
  const getAvatar = (name: string) => `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`;

  return (
    <div className="relative">
      <div className="absolute inset-0 cyber-grid opacity-[0.03] dark:opacity-[0.05] pointer-events-none"></div>
      
      {/* HEADER SECTION */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-4xl">military_tech</span>
            Global Rankings
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-2xl">
            Compete with security researchers worldwide. Rankings are updated in real-time based on successful challenge completions.
          </p>
        </div>
      </div>

      {/* TOP 3 PODIUM */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 relative z-10">
        
        {/* 2ND PLACE */}
        <div className="order-2 md:order-1 flex flex-col items-center justify-end h-full">
          {secondPlace && (
            <div className="w-full bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 text-center relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-500 transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-7xl">military_tech</span>
              </div>
              <div className="relative">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full p-1 bg-gradient-to-tr from-slate-300 to-slate-500">
                  <img src={getAvatar(secondPlace.username)} alt="2nd" className="w-full h-full rounded-full bg-white dark:bg-slate-700" />
                </div>
                <h3 className="font-bold text-xl mb-1 dark:text-white">{secondPlace.username}</h3>
                <p className="text-primary font-mono font-bold text-2xl">{secondPlace.score} <span className="text-xs font-normal text-slate-400">PTS</span></p>
                <div className="mt-4 inline-flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-sm font-medium dark:text-white">
                  <span className="material-symbols-outlined text-sm">workspace_premium</span> Silver League
                </div>
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
                <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                  <span className="material-symbols-outlined text-5xl text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">emoji_events</span>
                </div>
                <div className="w-24 h-24 mx-auto mb-4 rounded-full p-1.5 bg-gradient-to-tr from-yellow-400 via-primary to-orange-500">
                  <img src={getAvatar(firstPlace.username)} alt="1st" className="w-full h-full rounded-full bg-white dark:bg-slate-700" />
                </div>
                <h3 className="font-black text-2xl mb-1 text-slate-900 dark:text-white tracking-tight">{firstPlace.username}</h3>
                <p className="text-primary font-mono font-black text-3xl">{firstPlace.score} <span className="text-xs font-normal text-slate-400">PTS</span></p>
                <div className="mt-4 inline-flex items-center gap-1 px-4 py-1.5 bg-primary/10 dark:bg-primary/20 text-primary rounded-full text-sm font-bold border border-primary/20">
                  <span className="material-symbols-outlined text-sm">verified</span> Elite Sentinel
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3RD PLACE */}
        <div className="order-3 flex flex-col items-center justify-end h-full">
          {thirdPlace && (
            <div className="w-full bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 text-center relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-500 transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-7xl">military_tech</span>
              </div>
              <div className="relative">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full p-1 bg-gradient-to-tr from-orange-500 to-amber-700">
                  <img src={getAvatar(thirdPlace.username)} alt="3rd" className="w-full h-full rounded-full bg-white dark:bg-slate-700" />
                </div>
                <h3 className="font-bold text-xl mb-1 dark:text-white">{thirdPlace.username}</h3>
                <p className="text-primary font-mono font-bold text-2xl">{thirdPlace.score} <span className="text-xs font-normal text-slate-400">PTS</span></p>
                <div className="mt-4 inline-flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-sm font-medium dark:text-white">
                  <span className="material-symbols-outlined text-sm">stars</span> Bronze Veteran
                </div>
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
                <th className="px-6 py-5 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">Est. Solves</th>
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
                      <div className="flex items-center gap-3">
                        <img src={getAvatar(user.username)} className={`w-9 h-9 rounded-full ${isCurrentUser ? 'border border-primary' : 'bg-slate-200 dark:bg-slate-700'}`} alt="avatar" />
                        <span className={`font-bold ${isCurrentUser ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>
                          {user.username} {isCurrentUser && "(You)"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono dark:text-gray-300">~{Math.floor(user.score / 100)}</span>
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-right font-mono font-bold ${isCurrentUser ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>
                      {user.score}
                    </td>
                  </tr>
                );
              })}
              {leaderboard.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
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