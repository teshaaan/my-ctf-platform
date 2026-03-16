import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

type AdminTab = 'challenges' | 'submissions' | 'users';
type ModalMode = 'create' | 'update';

interface Challenge {
  id: number;
  createdAt?: string;
  title: string;
  category: string;
  points: number;
  difficulty: string;
  description?: string;
  author?: string;
  hint?: string;
  hintCost?: number;
}

interface ChallengeSubmission {
  id: number;
  title: string;
  category: string;
  points: number;
  difficulty: string;
  description?: string;
  hint?: string;
  hintCost?: number;
  status: string;
  createdAt?: string;
  submittedBy: string;
}

interface AdminUserSummary {
  id: number;
  username: string;
  score: number;
  rank: number;
  solved_count: number;
}

interface ChallengeFormState {
  title: string;
  category: string;
  points: number;
  difficulty: string;
  flag: string;
  description: string;
  author: string;
  hint: string;
  hintCost: number;
}

const defaultForm: ChallengeFormState = {
  title: '',
  category: 'Web Exploitation',
  points: 100,
  difficulty: 'Easy',
  flag: '',
  description: '',
  author: 'Admin',
  hint: '',
  hintCost: 0,
};

const categories = [
  'Web Exploitation',
  'Cryptography',
  'Reverse Engineering',
  'Forensics',
  'Pwn',
  'Misc',
  'General Skills',
];

export default function AdminBoard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('challenges');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<ChallengeSubmission[]>([]);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [editingChallengeId, setEditingChallengeId] = useState<number | null>(null);
  const [form, setForm] = useState<ChallengeFormState>(defaultForm);
  const [saving, setSaving] = useState(false);

  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const pendingSubmissions = useMemo(
    () => submissions.filter((submission) => submission.status === 'pending'),
    [submissions]
  );

  const tabItems: Array<{ key: AdminTab; label: string; icon: string }> = [
    { key: 'challenges', label: 'Challenges', icon: 'deployed_code' },
    { key: 'submissions', label: 'Pending Submissions', icon: 'inbox' },
    { key: 'users', label: 'User Stats', icon: 'groups' },
  ];

  const handleUnauthorized = () => {
    logout();
    toast.error('Session expired or unauthorized. Please log in again.');
    navigate('/admin/login', { replace: true });
  };

  const fetchChallenges = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/challenges', { cache: 'no-store' });
      const data = await response.json();
      if (Array.isArray(data)) setChallenges(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSubmissions = async () => {
    if (!token) return;

    try {
      const response = await fetch('http://localhost:3001/api/admin/challenge-submissions', {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        handleUnauthorized();
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

  const fetchUsersSummary = async () => {
    if (!token) return;

    try {
      const response = await fetch('http://localhost:3001/api/admin/users-summary', {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.users)) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchChallenges();
    fetchSubmissions();
    fetchUsersSummary();
  }, [token]);

  const setField = <K extends keyof ChallengeFormState>(field: K, value: ChallengeFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const openCreateModal = () => {
    setModalMode('create');
    setEditingChallengeId(null);
    setForm(defaultForm);
    setIsModalOpen(true);
  };

  const openUpdateModal = (challenge: Challenge) => {
    setModalMode('update');
    setEditingChallengeId(challenge.id);
    setForm({
      title: challenge.title || '',
      category: challenge.category || 'Misc',
      points: Number(challenge.points) || 0,
      difficulty: challenge.difficulty || 'Medium',
      flag: '',
      description: challenge.description || '',
      author: challenge.author || 'Admin',
      hint: challenge.hint || '',
      hintCost: Number(challenge.hintCost) || 0,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setIsModalOpen(false);
  };

  const handleSaveChallenge = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    try {
      const isUpdate = modalMode === 'update' && editingChallengeId !== null;
      const endpoint = isUpdate
        ? `http://localhost:3001/api/admin/challenges/${editingChallengeId}`
        : 'http://localhost:3001/api/admin/challenges';
      const method = isUpdate ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (response.status === 401 || response.status === 403) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();
      if (data.success) {
        toast.success(data.message || (isUpdate ? 'Challenge updated.' : 'Challenge created.'));
        setIsModalOpen(false);
        fetchChallenges();
      } else {
        toast.error(data.message || 'Failed to save challenge.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to save challenge.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this challenge?')) return;

    try {
      const response = await fetch(`http://localhost:3001/api/admin/challenges/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();
      if (data.success) {
        toast.success('Challenge deleted.');
        fetchChallenges();
      } else {
        toast.error(data.message || 'Failed to delete challenge.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete challenge.');
    }
  };

  const handleAcceptSubmission = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:3001/api/admin/challenge-submissions/${id}/accept`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();
      if (data.success) {
        toast.success('Submission accepted and published.');
        fetchSubmissions();
        fetchChallenges();
      } else {
        toast.error(data.message || 'Failed to accept submission.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to accept submission.');
    }
  };

  const handleRemoveSubmission = async (id: number) => {
    if (!window.confirm('Remove this pending submission?')) return;

    try {
      const response = await fetch(`http://localhost:3001/api/admin/challenge-submissions/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();
      if (data.success) {
        toast.success('Submission removed.');
        fetchSubmissions();
      } else {
        toast.error(data.message || 'Failed to remove submission.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove submission.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Challenges</p>
          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{challenges.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Pending Reviews</p>
          <p className="mt-1 text-2xl font-black text-primary">{pendingSubmissions.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Tracked Players</p>
          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{users.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabItems.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors inline-flex items-center gap-2 ${
              activeTab === tab.key
                ? 'bg-primary border-primary text-white shadow-sm shadow-primary/30'
                : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'challenges' && (
        <section className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Challenges ({challenges.length})</h2>
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Create Challenge
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Title</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Category</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Points</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Difficulty</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Created</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {challenges.map((challenge) => (
                  <tr key={challenge.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{challenge.title}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{challenge.category}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{challenge.points}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{challenge.difficulty || 'Medium'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {challenge.createdAt ? new Date(challenge.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openUpdateModal(challenge)}
                          className="px-3 py-1.5 rounded-md border border-blue-500 text-blue-600 dark:text-blue-300 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-sm font-semibold"
                        >
                          Update
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(challenge.id)}
                          className="px-3 py-1.5 rounded-md border border-rose-500 text-rose-600 dark:text-rose-300 dark:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-sm font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'submissions' && (
        <section className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Pending Laboratory Challenge Submissions ({pendingSubmissions.length})
            </h2>
          </div>

          {pendingSubmissions.length === 0 ? (
            <p className="px-5 py-6 text-slate-500 dark:text-slate-400">No pending submissions.</p>
          ) : (
            <div className="p-4 space-y-3">
              {pendingSubmissions.map((submission) => (
                <article
                  key={submission.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{submission.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                        {submission.category} • {submission.points} pts • {submission.difficulty} • by {submission.submittedBy}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Submitted {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : '-'}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAcceptSubmission(submission.id)}
                        className="px-3 py-2 rounded-md bg-emerald-600 text-white font-semibold hover:opacity-90 transition-opacity"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubmission(submission.id)}
                        className="px-3 py-2 rounded-md bg-rose-600 text-white font-semibold hover:opacity-90 transition-opacity"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {submission.description && (
                    <p className="mt-3 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{submission.description}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'users' && (
        <section className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Players Overview ({users.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Username</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Points</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Rank</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Solved Challenges</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{user.username}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{user.score}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">#{user.rank}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{user.solved_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            onClick={closeModal}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            aria-label="Close modal"
          />

          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {modalMode === 'update' ? 'Update Challenge' : 'Create Challenge'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveChallenge} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setField('category', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-900 dark:text-white"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Difficulty</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setField('difficulty', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-900 dark:text-white"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Points</label>
                  <input
                    type="number"
                    min={0}
                    value={form.points}
                    onChange={(e) => setField('points', Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Hint Cost</label>
                  <input
                    type="number"
                    min={0}
                    value={form.hintCost}
                    onChange={(e) => setField('hintCost', Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Secret Flag {modalMode === 'update' && <span className="font-normal text-xs">(optional when updating)</span>}
                </label>
                <input
                  type="text"
                  value={form.flag}
                  onChange={(e) => setField('flag', e.target.value)}
                  placeholder={modalMode === 'update' ? 'Leave blank to keep existing flag' : 'flag{...}'}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-900 dark:text-white"
                  required={modalMode === 'create'}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Author</label>
                <input
                  type="text"
                  value={form.author}
                  onChange={(e) => setField('author', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Hint</label>
                <input
                  type="text"
                  value={form.hint}
                  onChange={(e) => setField('hint', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-primary text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {saving ? 'Saving...' : modalMode === 'update' ? 'Save Changes' : 'Create Challenge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
