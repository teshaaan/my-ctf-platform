import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';


interface DashboardProps {
 username: string;
}


interface RecentSolve {
 id: number;
 title: string;
 category: string;
 points: number;
}

interface BestCategory {
  category: string;
  solved_count: number;
  total_points: number;
}

interface ResumeChallenge {
  id: number;
  title: string;
  category: string;
  points: number;
}


export default function Dashboard({ username }: DashboardProps) {
 const [score, setScore] = useState<number>(0);
 const [rank, setRank] = useState<number>(0);
 const [recentSolves, setRecentSolves] = useState<RecentSolve[]>([]);
 const [bestCategories, setBestCategories] = useState<BestCategory[]>([]);
 const [resumeChallenge, setResumeChallenge] = useState<ResumeChallenge | null>(null);
 const [loading, setLoading] = useState(true);
 const { token, logout } = useAuth();
 const navigate = useNavigate();


 useEffect(() => {
   const fetchDashboardData = async () => {
     if (!token) {
       setLoading(false);
       return;
     }


     try {
       const response = await fetch('http://localhost:3001/api/me/dashboard', {
          cache: 'no-store',
         headers: {
           Authorization: `Bearer ${token}`,
         },
       });


       if (response.status === 401 || response.status === 403) {
         logout();
         toast.error('Session expired. Please log in again.');
         navigate('/login', { replace: true });
         return;
       }


       const data = await response.json();
       if (data.success) {
         setScore(data.points || 0);
         setRank(data.rank || 0);
         setRecentSolves(Array.isArray(data.recentSolves) ? data.recentSolves : []);
         setBestCategories(Array.isArray(data.bestCategories) ? data.bestCategories : []);
         setResumeChallenge(data.resumeChallenge || null);
        } else {
          toast.error(data.message || 'Failed to load dashboard data.');
       }
     } catch (err) {
       console.error(err);
        toast.error('Failed to load dashboard data.');
     } finally {
       setLoading(false);
     }
   };


   fetchDashboardData();
 }, [token, logout, navigate]);


 return (
   <div className="max-w-4xl mx-auto py-8 px-4">
     <header className="mb-6">
       <h1 className="text-2xl font-bold text-secondary dark:text-white">
         Dashboard
       </h1>
       <p className="text-accent mt-1">Welcome, {username}</p>
     </header>


     <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 mb-6">
       <h2 className="text-lg font-semibold text-secondary dark:text-white mb-3">Resume Challenge</h2>

       {loading && <p className="text-accent">Loading...</p>}

       {!loading && !resumeChallenge && (
         <p className="text-accent">All challenges solved. Great work.</p>
       )}

       {!loading && resumeChallenge && (
         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
           <div>
             <p className="font-medium text-secondary dark:text-white">{resumeChallenge.title}</p>
             <p className="text-sm text-accent">{resumeChallenge.category} • {resumeChallenge.points} pts</p>
           </div>
           <button
             onClick={() => navigate('/challenges', { state: { resumeChallengeId: resumeChallenge.id } })}
             className="px-4 py-2 bg-primary text-white rounded-md font-semibold hover:opacity-90 transition-opacity"
           >
             Resume
           </button>
         </div>
       )}
     </section>


     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
       <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
         <div className="flex items-center justify-between mb-1">
           <p className="text-sm font-medium text-accent">Global Rank</p>
           <span className="material-symbols-outlined text-primary text-lg">military_tech</span>
         </div>
         <p className="text-3xl font-bold text-secondary dark:text-white mt-1">
           {loading ? '...' : (rank > 0 ? `#${rank}` : 'Unranked')}
         </p>
       </div>


       <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
         <div className="flex items-center justify-between mb-1">
           <p className="text-sm font-medium text-accent">Total Points</p>
           <span className="material-symbols-outlined text-primary text-lg">deployed_code</span>
         </div>
         <div className="flex items-end gap-1 mt-1">
           <p className="text-3xl font-bold text-secondary dark:text-white">
             {loading ? '...' : score}
           </p>
           <span className="text-sm text-accent mb-1">pts</span>
         </div>
       </div>
     </div>


     <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 mb-6">
       <h2 className="text-lg font-semibold text-secondary dark:text-white mb-4">
         Your Best Performing Categories
       </h2>

       {loading && <p className="text-accent">Loading...</p>}

       {!loading && bestCategories.length === 0 && (
         <p className="text-accent">No category stats yet.</p>
       )}

       {!loading && bestCategories.length > 0 && (
         <ul className="space-y-3">
           {bestCategories.map((category) => (
             <li
               key={category.category}
               className="flex items-center justify-between border border-slate-200 dark:border-slate-700 rounded-md px-4 py-3"
             >
               <div>
                 <p className="font-medium text-secondary dark:text-white">{category.category}</p>
                 <p className="text-sm text-accent">Solved: {category.solved_count}</p>
               </div>
               <p className="font-semibold text-primary">{category.total_points} pts</p>
             </li>
           ))}
         </ul>
       )}
     </section>


     <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
       <h2 className="text-lg font-semibold text-secondary dark:text-white mb-4">
         Recent Solved Challenges
       </h2>


       {loading && <p className="text-accent">Loading...</p>}


       {!loading && recentSolves.length === 0 && (
         <p className="text-accent">No solved challenges yet.</p>
       )}


       {!loading && recentSolves.length > 0 && (
         <ul className="space-y-3">
           {recentSolves.map((solve) => (
             <li
               key={solve.id}
               className="flex items-center justify-between border border-slate-200 dark:border-slate-700 rounded-md px-4 py-3"
             >
               <div>
                 <p className="font-medium text-secondary dark:text-white">{solve.title}</p>
                 <p className="text-sm text-accent">{solve.category}</p>
               </div>
               <p className="font-semibold text-primary">+{solve.points}</p>
             </li>
           ))}
         </ul>
       )}
     </section>
    
     <p className="text-xs text-accent mt-4">Showing latest 3 solved challenges.</p>
     </div>
  
 );
}

