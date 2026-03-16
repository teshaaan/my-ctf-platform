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

export default function Laboratory() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

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
    </div>
  );
}
