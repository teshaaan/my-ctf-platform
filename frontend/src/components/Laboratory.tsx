import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const NOTEBOOK_TIME_CACHE_KEY = 'labNotebookLocalUpdatedAt';

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
];

export default function Laboratory() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [submissions, setSubmissions] = useState<ChallengeSubmission[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [notebookSearchQuery, setNotebookSearchQuery] = useState('');
  const [currentNotebookPage, setCurrentNotebookPage] = useState(1);
  const [draftChallenge, setDraftChallenge] = useState<DraftChallenge>(defaultDraftChallenge);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sendingChallenge, setSendingChallenge] = useState(false);
  const [addingChallengeNotebook, setAddingChallengeNotebook] = useState(false);
  const [deletingNotebookId, setDeletingNotebookId] = useState<number | null>(null);

  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const getNotebookTimeCache = () => {
    try {
      const raw = localStorage.getItem(NOTEBOOK_TIME_CACHE_KEY);
      if (!raw) return {} as Record<string, number>;
      const parsed = JSON.parse(raw) as Record<string, number>;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {} as Record<string, number>;
    }
  };

  const parseNotebookDate = (value: string) => {
    const parsedDirect = new Date(value);
    if (!Number.isNaN(parsedDirect.getTime())) return parsedDirect;

    const normalized = value.includes(' ') ? value.replace(' ', 'T') : value;
    return new Date(normalized);
  };

  const getNotebookUpdatedEpoch = (notebook: Notebook) => {
    const cache = getNotebookTimeCache();
    const localUpdatedAt = Number(cache[String(notebook.id)]);
    if (Number.isFinite(localUpdatedAt)) return localUpdatedAt;
    return parseNotebookDate(notebook.updated_at).getTime();
  };

  const formatNotebookUpdatedAt = (value: string | number) => {
    const parsed = typeof value === 'number' ? new Date(value) : parseNotebookDate(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString([], {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

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
      setIsCreateModalOpen(false);
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

  const validateChallengeForNotebook = (): boolean => {
    if (!challengePayload.title) {
      toast.error('Challenge title is required to add to notebook.');
      return false;
    }
    return true;
  };

  const validateChallengeForAdmin = (): boolean => {
    if (
      !challengePayload.title ||
      !challengePayload.category ||
      !challengePayload.difficulty ||
      !challengePayload.flag ||
      !challengePayload.description ||
      !challengePayload.hint ||
      !Number.isFinite(Number(challengePayload.points)) ||
      !Number.isFinite(Number(challengePayload.hintCost))
    ) {
      toast.error('All challenge fields are required before sending to admin.');
      return false;
    }

    if (Number(challengePayload.points) < 0 || Number(challengePayload.hintCost) < 0) {
      toast.error('Points and hint cost must be 0 or greater.');
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
    if (!validateChallengeForAdmin()) return;

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
    if (!validateChallengeForNotebook()) return;

    setAddingChallengeNotebook(true);
    try {
      const response = await fetch('http://localhost:3001/api/lab/notebooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: challengePayload.title,
          question: challengePayload.description || 'Custom challenge draft from laboratory',
          content: `## ${challengePayload.title}\n\n- Category: ${challengePayload.category}\n\n### Prompt\n${challengePayload.description || 'Add your challenge description here.'}\n\n### Hint\n${challengePayload.hint || 'No hint yet.'}\n\n### Flag\n${challengePayload.flag}`,
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

  const handleDeleteNotebook = async (notebookId: number) => {
    const shouldDelete = window.confirm('Delete this notebook? This action cannot be undone.');
    if (!shouldDelete) return;

    setDeletingNotebookId(notebookId);
    try {
      const response = await fetch(`http://localhost:3001/api/lab/notebooks/${notebookId}`, {
        method: 'DELETE',
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
      if (!data.success) {
        toast.error(data.message || 'Failed to delete notebook.');
        return;
      }

      setNotebooks((prev) => prev.filter((notebook) => notebook.id !== notebookId));
      toast.success('Notebook deleted.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete notebook.');
    } finally {
      setDeletingNotebookId(null);
    }
  };

  const sortedNotebooks = [...notebooks].sort(
    (a, b) => getNotebookUpdatedEpoch(b) - getNotebookUpdatedEpoch(a)
  );

  const filteredNotebooks = sortedNotebooks.filter((notebook) =>
    notebook.title.toLowerCase().includes(notebookSearchQuery.toLowerCase())
  );

  const notebooksPerPage = 6;
  const totalNotebookPages = Math.max(1, Math.ceil(filteredNotebooks.length / notebooksPerPage));

  useEffect(() => {
    setCurrentNotebookPage(1);
  }, [notebookSearchQuery]);

  useEffect(() => {
    if (currentNotebookPage > totalNotebookPages) {
      setCurrentNotebookPage(totalNotebookPages);
    }
  }, [currentNotebookPage, totalNotebookPages]);

  const paginatedNotebooks = filteredNotebooks.slice(
    (currentNotebookPage - 1) * notebooksPerPage,
    currentNotebookPage * notebooksPerPage
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary dark:text-white">Laboratory</h1>
        <p className="text-accent dark:text-slate-400 mt-1">Create and manage your own challenge notebooks.</p>
      </div>

      <section className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your Notebooks</h2>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full sm:w-auto bg-primary text-white font-bold py-2.5 px-4 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">note_stack_add</span>
              Create New Notebook
            </button>
          </div>

          <div className="mb-4 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
              search
            </span>
            <input
              type="text"
              value={notebookSearchQuery}
              onChange={(e) => setNotebookSearchQuery(e.target.value)}
              placeholder="Search notebook titles..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-3 text-slate-900 dark:text-white"
            />
          </div>

          {loading && <p className="text-accent">Loading notebooks...</p>}

          {!loading && notebooks.length === 0 && <p className="text-accent">No notebooks yet. Create one now.</p>}

          {!loading && notebooks.length > 0 && filteredNotebooks.length === 0 && (
            <p className="text-accent">No notebooks found for that title.</p>
          )}

          {!loading && notebooks.length > 0 && (
            <div className="space-y-2.5">
              {paginatedNotebooks.map((notebook) => (
                <div
                  key={notebook.id}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3 hover:border-primary transition-colors flex items-start justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/lab/notebooks/${notebook.id}`)}
                    className="text-left min-w-0 flex-1"
                  >
                    <p className="font-bold text-slate-900 dark:text-white truncate">{notebook.title}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Updated {formatNotebookUpdatedAt(getNotebookUpdatedEpoch(notebook))}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteNotebook(notebook.id)}
                    disabled={deletingNotebookId === notebook.id}
                    className="h-9 w-9 rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:text-rose-600 hover:border-rose-300 dark:hover:border-rose-500 transition-colors inline-flex items-center justify-center disabled:opacity-60"
                    title="Delete notebook"
                    aria-label={`Delete notebook ${notebook.title}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              ))}

              <div className="pt-3 flex items-center justify-center gap-2 flex-wrap">
                {Array.from({ length: totalNotebookPages }, (_, idx) => idx + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentNotebookPage(page)}
                    className={`h-8 min-w-8 px-2 rounded-md border text-sm font-semibold transition-colors ${
                      currentNotebookPage === page
                        ? 'bg-primary border-primary text-white'
                        : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            </div>
          )}
      </section>

      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-notebook-title"
        >
          <button
            type="button"
            onClick={() => !creating && setIsCreateModalOpen(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            aria-label="Close create notebook modal"
          />

          <div className="relative w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between gap-4">
              <div>
                <h2 id="new-notebook-title" className="text-xl font-bold text-slate-900 dark:text-white">
                  Create New Notebook
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Add a title and optional challenge prompt to start your lab workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !creating && setIsCreateModalOpen(false)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                  Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. SQLi practice"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
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
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={creating}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-lg bg-primary text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {creating ? 'Creating...' : 'Create Notebook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  required
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
                  required
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
                required
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
                  required
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
                  placeholder="CTP{...}"
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
