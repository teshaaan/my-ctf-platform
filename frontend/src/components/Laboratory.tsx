import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface Notebook {
  id: number;
  title: string;
  question: string | null;
  updated_at: string;
}

interface ChallengeSubmission {
  id: number;
  title: string;
  category: string;
  points: number;
  difficulty: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
}

interface DraftChallenge {
  title: string;
  category: string;
  points: number;
  difficulty: string;
  flag: string;
  description: string;
  hint: string;
  hintCost: number;
}

const defaultDraftChallenge: DraftChallenge = {
  title: '',
  category: 'Web Exploitation',
  points: 100,
  difficulty: 'Easy',
  flag: '',
  description: '',
  hint: '',
  hintCost: 0,
};

const challengeCategories = [
  'Web Exploitation',
  'Cryptography',
  'Reverse Engineering',
  'Forensics',
  'Pwn',
  'Misc',
  'General Skills',
];

export default function Laboratory() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [submissions, setSubmissions] = useState<ChallengeSubmission[]>([]);
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [draftChallenge, setDraftChallenge] = useState<DraftChallenge>(defaultDraftChallenge);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sendingChallenge, setSendingChallenge] = useState(false);
  const [addingChallengeNotebook, setAddingChallengeNotebook] = useState(false);

  const { token, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotebooks = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/lab/notebooks', {
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
        if (data.success && Array.isArray(data.notebooks)) {
          setNotebooks(data.notebooks);
        }

        const submissionsResponse = await fetch('http://localhost:3001/api/lab/challenge-submissions', {
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (submissionsResponse.status === 401 || submissionsResponse.status === 403) {
          logout();
          toast.error('Session expired. Please log in again.');
          navigate('/login', { replace: true });
          return;
        }

        const submissionsData = await submissionsResponse.json();
        if (submissionsData.success && Array.isArray(submissionsData.submissions)) {
          setSubmissions(submissionsData.submissions);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load notebooks.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchNotebooks();
    }
  }, [token, logout, navigate]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setCreating(true);
    try {
      const response = await fetch('http://localhost:3001/api/lab/notebooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: title.trim(), question: question.trim() }),
      });

      if (response.status === 401 || response.status === 403) {
        logout();
        toast.error('Session expired. Please log in again.');
        navigate('/login', { replace: true });
        return;
      }

      const data = await response.json();
      if (!data.success || !data.notebook) {
        toast.error(data.message || 'Failed to create notebook.');
        return;
      }

      toast.success('Notebook created.');
      setTitle('');
      setQuestion('');
      navigate(`/lab/notebooks/${data.notebook.id}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to create notebook.');
    } finally {
      setCreating(false);
    }
  };

  const setChallengeField = <K extends keyof DraftChallenge>(field: K, value: DraftChallenge[K]) => {
    setDraftChallenge((prev) => ({ ...prev, [field]: value }));
  };

  const challengePayload = {
    ...draftChallenge,
    title: draftChallenge.title.trim(),
    description: draftChallenge.description.trim(),
    hint: draftChallenge.hint.trim(),
    flag: draftChallenge.flag.trim(),
  };

  const validateChallengeDraft = (): boolean => {
    if (!challengePayload.title || !challengePayload.flag) {
      toast.error('Challenge title and flag are required.');
      return false;
    }
    return true;
  };

  const refreshSubmissions = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/lab/challenge-submissions', {
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
      if (data.success && Array.isArray(data.submissions)) {
        setSubmissions(data.submissions);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendToAdmin = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateChallengeDraft()) return;

    setSendingChallenge(true);
    try {
      const response = await fetch('http://localhost:3001/api/lab/challenge-submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(challengePayload),
      });

      if (response.status === 401 || response.status === 403) {
        logout();
        toast.error('Session expired. Please log in again.');
        navigate('/login', { replace: true });
        return;
      }

      const data = await response.json();
      if (!data.success) {
        toast.error(data.message || 'Failed to send challenge to admin.');
        return;
      }

      toast.success('Challenge sent to admin review queue.');
      setDraftChallenge(defaultDraftChallenge);
      refreshSubmissions();
    } catch (err) {
      console.error(err);
      toast.error('Failed to send challenge to admin.');
    } finally {
      setSendingChallenge(false);
    }
  };

  const handleAddChallengeToNotebook = async () => {
    if (!validateChallengeDraft()) return;

    setAddingChallengeNotebook(true);
    try {
      const response = await fetch('http://localhost:3001/api/lab/notebooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: `Draft: ${challengePayload.title}`,
          question: challengePayload.description || 'Custom challenge draft from laboratory',
          content: `## ${challengePayload.title}\n\n- Category: ${challengePayload.category}\n- Difficulty: ${challengePayload.difficulty}\n- Points: ${challengePayload.points}\n- Hint Cost: ${challengePayload.hintCost}\n\n### Prompt\n${challengePayload.description || 'Add your challenge description here.'}\n\n### Hint\n${challengePayload.hint || 'No hint yet.'}\n\n### Flag\n${challengePayload.flag}`,
        }),
      });

      if (response.status === 401 || response.status === 403) {
        logout();
        toast.error('Session expired. Please log in again.');
        navigate('/login', { replace: true });
        return;
      }

      const data = await response.json();
      if (!data.success || !data.notebook) {
        toast.error(data.message || 'Failed to add challenge draft to notebook.');
        return;
      }

      toast.success('Challenge draft added to notebook.');
      navigate(`/lab/notebooks/${data.notebook.id}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to add draft to notebook.');
    } finally {
      setAddingChallengeNotebook(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary dark:text-white">Laboratory</h1>
        <p className="text-accent dark:text-slate-400 mt-1">Create and manage your own challenge notebooks.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-1 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <h2 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">New Notebook</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. SQLi practice"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                Question (optional)
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Write your challenge question or objective"
                rows={4}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {creating ? 'Creating...' : 'Create Notebook'}
            </button>
          </form>
        </section>

        <section className="lg:col-span-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <h2 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Your Notebooks</h2>

          {loading && <p className="text-accent">Loading notebooks...</p>}

          {!loading && notebooks.length === 0 && (
            <p className="text-accent">No notebooks yet. Create one from the form.</p>
          )}

          {!loading && notebooks.length > 0 && (
            <div className="space-y-3">
              {notebooks.map((notebook) => (
                <button
                  key={notebook.id}
                  onClick={() => navigate(`/lab/notebooks/${notebook.id}`)}
                  className="w-full text-left rounded-lg border border-slate-200 dark:border-slate-700 p-4 hover:border-primary transition-colors"
                >
                  <p className="font-bold text-slate-900 dark:text-white">{notebook.title}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {notebook.question || 'No question added.'}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                    Updated {new Date(notebook.updated_at).toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Build Your Own Challenge</h2>
            <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Lab Creator
            </span>
          </div>

          <form onSubmit={handleSendToAdmin} className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                Challenge Title
              </label>
              <input
                value={draftChallenge.title}
                onChange={(e) => setChallengeField('title', e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-slate-900 dark:text-white"
                placeholder="e.g. JWT role bypass"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                  Category
                </label>
                <select
                  value={draftChallenge.category}
                  onChange={(e) => setChallengeField('category', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-slate-900 dark:text-white"
                >
                  {challengeCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                  Difficulty
                </label>
                <select
                  value={draftChallenge.difficulty}
                  onChange={(e) => setChallengeField('difficulty', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-slate-900 dark:text-white"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                  Points
                </label>
                <input
                  type="number"
                  min={0}
                  value={draftChallenge.points}
                  onChange={(e) => setChallengeField('points', Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                  Hint Cost
                </label>
                <input
                  type="number"
                  min={0}
                  value={draftChallenge.hintCost}
                  onChange={(e) => setChallengeField('hintCost', Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                Challenge Description
              </label>
              <textarea
                value={draftChallenge.description}
                onChange={(e) => setChallengeField('description', e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-slate-900 dark:text-white"
                placeholder="Explain the challenge objective and context"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                  Hint
                </label>
                <input
                  value={draftChallenge.hint}
                  onChange={(e) => setChallengeField('hint', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-slate-900 dark:text-white"
                  placeholder="Optional guidance"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                  Secret Flag
                </label>
                <input
                  value={draftChallenge.flag}
                  onChange={(e) => setChallengeField('flag', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-slate-900 dark:text-white"
                  placeholder="flag{...}"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleAddChallengeToNotebook}
                disabled={addingChallengeNotebook || sendingChallenge}
                className="w-full bg-slate-700 text-white font-bold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {addingChallengeNotebook ? 'Adding...' : 'Add To Notebook'}
              </button>
              <button
                type="submit"
                disabled={sendingChallenge || addingChallengeNotebook}
                className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {sendingChallenge ? 'Sending...' : 'Send To Admin'}
              </button>
            </div>
          </form>
        </section>

        <section className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <h2 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Your Challenge Submissions</h2>
          {submissions.length === 0 ? (
            <p className="text-accent">No submissions yet. Create one and send it to admin.</p>
          ) : (
            <div className="space-y-3">
              {submissions.map((submission) => (
                <article
                  key={submission.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white">{submission.title}</h3>
                    <span
                      className={`text-xs uppercase tracking-wide px-2 py-1 rounded-full ${
                        submission.status === 'accepted'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : submission.status === 'removed'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}
                    >
                      {submission.status}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {submission.category} • {submission.points} pts • {submission.difficulty}
                  </p>
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                    Submitted {new Date(submission.created_at).toLocaleString()}
                  </p>
                  {submission.reviewed_at && (
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      Reviewed {new Date(submission.reviewed_at).toLocaleString()}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
