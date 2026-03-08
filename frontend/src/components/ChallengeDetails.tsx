import { useState } from 'react';
import toast from 'react-hot-toast';

interface Challenge {
  id: number;
  title: string;
  category: string;
  points: number;
}

interface ChallengeDetailProps {
  challenge: Challenge;
  username: string;
  onBack: () => void; // Function to go back to the grid
}

export default function ChallengeDetail({ challenge, username, onBack }: ChallengeDetailProps) {
  const [flag, setFlag] = useState("");
  const [isSolved, setIsSolved] = useState(false);

  async function submitFlag(e: React.FormEvent) {
    e.preventDefault();
    if (!flag) return;

    const toastId = toast.loading('Verifying flag...');

    const response = await fetch('http://localhost:3001/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId: challenge.id, userFlag: flag, username })
    });
    
    const result = await response.json();

    if (result.success) {
      toast.success(`Flag Captured! +${challenge.points} pts`, { id: toastId });
      setIsSolved(true);
      setFlag("Solved!");
    } else {
      toast.error(result.message || "Invalid flag.", { id: toastId });
    }
  }

  // Helper to color-code categories
  const getCategoryStyles = (cat: string) => {
    switch(cat) {
      case 'Web Exploitation': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Cryptography': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'Reverse Engineering': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'Forensics': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 animate-fade-in-up">
      {/* Back Button */}
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-secondary dark:text-slate-400 hover:text-primary transition-colors font-bold">
        <span className="material-symbols-outlined">arrow_back</span>
        Back to Challenges
      </button>

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <span className={`${getCategoryStyles(challenge.category)} px-3 py-1 text-xs font-bold uppercase tracking-wider rounded`}>
            {challenge.category}
          </span>
          <span className="flex items-center gap-1 text-sm text-secondary dark:text-slate-400 font-bold">
            <span className="material-symbols-outlined text-sm">bolt</span> {challenge.points} Points
          </span>
        </div>
        <h1 className="text-4xl font-bold mb-4 text-slate-900 dark:text-white">{challenge.title}</h1>
        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">person</span> By System_Admin</span>
          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">visibility</span> Active Target</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Description Box */}
          <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
              <span className="material-symbols-outlined text-primary">description</span>
              Description
            </h2>
            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
              <p>Welcome to the <strong>{challenge.title}</strong> challenge. We've detected an anomaly in the target system. Your objective is to exploit this vulnerability and retrieve the secret flag.</p>
              <p>Analyze the provided target and see if you can find the hidden message. The flag format is <code>picoCTF&#123;flag_here&#125;</code>.</p>
              
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded border-l-4 border-primary mt-6">
                <p className="text-sm italic mb-0 font-mono">"Look closely at the source, sometimes the server speaks in codes."</p>
              </div>
            </div>
          </div>

          {/* Attachments & Hints Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                <span className="material-symbols-outlined text-primary">download</span>
                Attachments
              </h3>
              <div className="space-y-3">
                <a href="#" className="flex items-center justify-between p-3 rounded bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">terminal</span>
                    <span className="text-sm font-mono text-slate-700 dark:text-slate-300">target_instance</span>
                  </div>
                  <span className="text-xs text-slate-400">Launch</span>
                </a>
              </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                <span className="material-symbols-outlined text-primary">lightbulb</span>
                Hints
              </h3>
              <button className="w-full text-left p-3 rounded bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="text-sm">Hint 1 (Cost: 0 pts)</span>
                <span className="material-symbols-outlined text-slate-400">lock_open</span>
              </button>
            </div>

          </div>
        </div>

        {/* Right Column: Submission Form */}
        <div className="space-y-6">
          <div className={`bg-surface-light dark:bg-surface-dark p-8 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 sticky top-24 transition-opacity ${isSolved ? 'opacity-70' : ''}`}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
              <span className="material-symbols-outlined text-primary">flag</span>
              Submit Flag
            </h2>
            
            <form onSubmit={submitFlag} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Flag</label>
                <input 
                  type="text" 
                  value={flag}
                  onChange={(e) => setFlag(e.target.value)}
                  disabled={isSolved}
                  placeholder="picoCTF{...}" 
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 font-mono focus:ring-primary focus:border-primary transition-all text-slate-900 dark:text-white" 
                />
              </div>
              <button 
                type="submit" 
                disabled={isSolved}
                className="w-full bg-primary hover:bg-red-600 text-white font-bold py-4 rounded-lg transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 disabled:bg-slate-600 disabled:cursor-not-allowed"
              >
                {isSolved ? "SOLVED" : "SUBMIT FLAG"}
              </button>
            </form>


            {/* Success Message */}
            {isSolved && (
              <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg animate-bounce">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                  <div>
                    <h4 className="font-bold text-emerald-800 dark:text-emerald-400">Challenge Solved!</h4>
                    <p className="text-sm text-emerald-700 dark:text-emerald-500">Excellent work, operative. {challenge.points} points have been added to your profile.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}