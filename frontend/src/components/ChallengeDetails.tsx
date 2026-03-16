import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Challenge {
  id: number;
  title: string;
  category: string;
  points: number;
  difficulty?: string;
  description?: string;
  author?: string;
  hint?: string;
  hintCost?: number;
}

interface ChallengeDetailProps {
  challenge: Challenge;
  onBack: () => void; // Function to go back to the grid
  onSolved: (challengeId: number) => void;
}

export default function ChallengeDetail({ challenge, onBack, onSolved }: ChallengeDetailProps) {
  const [flag, setFlag] = useState("");
  const [isSolved, setIsSolved] = useState(false);
  const [isHintUnlocked, setIsHintUnlocked] = useState(false);
  const [isUnlockingHint, setIsUnlockingHint] = useState(false);
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);
  const [awardedPoints, setAwardedPoints] = useState(challenge.points);
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const hintCost = Number(challenge.hintCost) || 0;
  const hasHint = Boolean(String(challenge.hint || '').trim());

  useEffect(() => {
    setIsHintUnlocked(false);
    setIsSolved(false);
    setFlag('');
    setAwardedPoints(challenge.points);

    const loadHintStatus = async () => {
      if (!token) return;

      try {
        const response = await fetch('http://localhost:3001/api/me/hints', {
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

        const result = await response.json();
        if (result.success && Array.isArray(result.unlockedHintChallengeIds)) {
          const unlocked = result.unlockedHintChallengeIds.includes(challenge.id);
          setIsHintUnlocked(unlocked);
          if (unlocked) {
            setAwardedPoints(Math.max(0, challenge.points - hintCost));
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadHintStatus();
  }, [challenge.id, challenge.points, hintCost, token, logout, navigate]);

  async function unlockHint() {
    if (!hasHint || isHintUnlocked || isUnlockingHint) return;

    setIsUnlockingHint(true);
    const toastId = toast.loading('Unlocking hint...');

    try {
      const response = await fetch(`http://localhost:3001/api/challenges/${challenge.id}/hint/unlock`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        toast.error('Session expired. Please log in again.', { id: toastId });
        logout();
        navigate('/login', { replace: true });
        return;
      }

      const result = await response.json();
      if (result.success) {
        setIsHintUnlocked(true);
        const newAwardedPoints = Number(result.awardedPoints);
        const rewardNow = Number.isFinite(newAwardedPoints)
          ? newAwardedPoints
          : Math.max(0, challenge.points - hintCost);

        if (Number.isFinite(newAwardedPoints)) {
          setAwardedPoints(newAwardedPoints);
        } else {
          setAwardedPoints(Math.max(0, challenge.points - hintCost));
        }
        toast.success(`Hint unlocked. Reward is now ${rewardNow} pts.`, { id: toastId });
      } else {
        toast.error(result.message || 'Failed to unlock hint.', { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to unlock hint.', { id: toastId });
    } finally {
      setIsUnlockingHint(false);
    }
  }

  async function submitFlag(e: React.FormEvent) {
    e.preventDefault();
    if (!flag) return;

    const toastId = toast.loading('Verifying flag...');

    const response = await fetch('http://localhost:3001/api/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ challengeId: challenge.id, userFlag: flag })
    });

    if (response.status === 401 || response.status === 403) {
      toast.error('Session expired. Please log in again.', { id: toastId });
      logout();
      navigate('/login', { replace: true });
      return;
    }
    
    const result = await response.json();

    if (result.success) {
      const finalAwardedPoints = Number(result.awardedPoints);
      const safeAwardedPoints = Number.isFinite(finalAwardedPoints)
        ? finalAwardedPoints
        : awardedPoints;

      toast.success(`Flag Captured! +${safeAwardedPoints} pts`, { id: toastId });
      setIsSolved(true);
      setFlag("Solved!");
      setAwardedPoints(safeAwardedPoints);
      onSolved(challenge.id);
    } else {
      toast.error(result.message || "Invalid flag.", { id: toastId });
    }
  }

  async function handleAddToNotes() {
    if (isCreatingNotebook) return;

    setIsCreatingNotebook(true);
    const toastId = toast.loading('Creating notebook...');

    try {
      const notebookTitle = `${challenge.title} Notes`;
      const notebookQuestion = challenge.description || `Notes and documentation for ${challenge.title}`;
      const notebookContent = [
        `# ${challenge.title}`,
        '',
        '## Challenge Details',
        `- ID: ${challenge.id}`,
        `- Category: ${challenge.category}`,
        `- Difficulty: ${challenge.difficulty || 'Unknown'}`,
        `- Points: ${challenge.points}`,
        `- Hint Cost: ${hintCost}`,
        '',
        '## Question / Objective',
        notebookQuestion,
        '',
        '## Recon',
        '- ',
        '',
        '## Exploitation Steps',
        '1. ',
        '',
        '## Notes',
        '- ',
        '',
        '## Flag',
        '`picoCTF{}`',
      ].join('\n');

      const response = await fetch('http://localhost:3001/api/lab/notebooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          challengeId: challenge.id,
          title: notebookTitle,
          question: notebookQuestion,
          content: notebookContent,
        }),
      });

      if (response.status === 401 || response.status === 403) {
        toast.error('Session expired. Please log in again.', { id: toastId });
        logout();
        navigate('/login', { replace: true });
        return;
      }

      const result = await response.json();
      if (!result.success || !result.notebook?.id) {
        toast.error(result.message || 'Failed to create notebook.', { id: toastId });
        return;
      }

      toast.success(result.existing ? 'Opened your existing notebook.' : 'Notebook created from challenge details.', { id: toastId });
      navigate(`/lab/notebooks/${result.notebook.id}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to create notebook.', { id: toastId });
    } finally {
      setIsCreatingNotebook(false);
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
          <span className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400 font-bold">
            <span className="material-symbols-outlined text-sm">savings</span> Reward Now: {awardedPoints} Points
          </span>
        </div>
        <h1 className="text-4xl font-bold mb-4 text-slate-900 dark:text-white">{challenge.title}</h1>
        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">person</span> By {challenge.author || 'System_Admin'}</span>
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
              <p>{challenge.description || `Welcome to the ${challenge.title} challenge. We've detected an anomaly in the target system. Your objective is to exploit this vulnerability and retrieve the secret flag.`}</p>
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
              {!hasHint && (
                <div className="w-full text-left p-3 rounded bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm">
                  No hints available for this challenge.
                </div>
              )}

              {hasHint && !isHintUnlocked && (
                <button
                  onClick={unlockHint}
                  disabled={isUnlockingHint}
                  className="w-full text-left p-3 rounded bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-between text-slate-700 dark:text-slate-300 disabled:opacity-60"
                >
                  <span className="text-sm">Hint 1 (Unlock: -{hintCost} pts)</span>
                  <span className="material-symbols-outlined text-slate-400">lock</span>
                </button>
              )}

              {hasHint && isHintUnlocked && (
                <div className="w-full p-3 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">Hint 1 (Unlocked)</span>
                    <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">lock_open</span>
                  </div>
                  <p className="text-sm">{challenge.hint}</p>
                </div>
              )}
            </div>

          </div>

          <div className="bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex items-center justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-300">Want to document your approach for this challenge?</p>
            <button
              type="button"
              onClick={handleAddToNotes}
              disabled={isCreatingNotebook}
              className="text-xs font-semibold px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-60"
            >
              {isCreatingNotebook ? 'Opening...' : 'Add to Notes'}
            </button>
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
                    <p className="text-sm text-emerald-700 dark:text-emerald-500">Excellent work, operative. {awardedPoints} points have been added to your profile.</p>
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