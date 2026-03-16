import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

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
  const [form, setForm] = useState<ChallengeFormState>(defaultForm);
  const [selectedChallengeId, setSelectedChallengeId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<ChallengeSubmission[]>([]);
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const handleUnauthorized = () => {
    logout();
    toast.error('Session expired or unauthorized. Please log in again.');
    navigate('/login', { replace: true });
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

  useEffect(() => {
    fetchChallenges();
    if (token) fetchSubmissions();
  }, [token]);

  const resetForm = () => {
    setSelectedChallengeId(null);
    setForm(defaultForm);
  };

  const selectChallenge = (challenge: Challenge) => {
    setSelectedChallengeId(challenge.id);
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
  };

  const setField = <K extends keyof ChallengeFormState>(field: K, value: ChallengeFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  async function handleAddChallenge(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('http://localhost:3001/api/admin/challenges', {
        method: 'POST',
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
        toast.success(data.message || 'Challenge added.');
        resetForm();
        fetchChallenges();
      } else {
        toast.error(data.message || 'Failed to create challenge.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to create challenge.');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateChallenge(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedChallengeId) return;

    setSaving(true);
    try {
      const response = await fetch(`http://localhost:3001/api/admin/challenges/${selectedChallengeId}`, {
        method: 'PATCH',
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
        toast.success(data.message || 'Challenge updated.');
        fetchChallenges();
      } else {
        toast.error(data.message || 'Failed to update challenge.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update challenge.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Are you sure you want to delete this challenge?")) return;

    const response = await fetch(`http://localhost:3001/api/admin/challenges/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}) 
    });

    if (response.status === 401 || response.status === 403) {
      handleUnauthorized();
      return;
    }

    const data = await response.json();
    if (data.success) {
      toast.success('Challenge deleted.');
      if (selectedChallengeId === id) resetForm();
      fetchChallenges();
    } else {
      toast.error(data.message || 'Failed to delete challenge.');
    }
  }

  async function handleAcceptSubmission(id: number) {
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
  }

  async function handleRemoveSubmission(id: number) {
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
  }

  const pendingSubmissions = submissions.filter((submission) => submission.status === 'pending');

  const renderChallengeForm = () => (
    <form
      onSubmit={selectedChallengeId ? handleUpdateChallenge : handleAddChallenge}
      style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
    >
      <h3 style={{ marginTop: 0 }}>{selectedChallengeId ? 'Edit Selected Challenge' : 'Create New Challenge'}</h3>

      <label style={{ fontWeight: 700 }}>
        Title
        <input
          type="text"
          value={form.title}
          onChange={(e) => setField('title', e.target.value)}
          required
          style={{ display: 'block', marginTop: '4px', width: '100%', padding: '8px' }}
        />
      </label>

      <label style={{ fontWeight: 700 }}>
        Category
        <select
          value={form.category}
          onChange={(e) => setField('category', e.target.value)}
          style={{ display: 'block', marginTop: '4px', width: '100%', padding: '8px' }}
        >
          {categories.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <label style={{ fontWeight: 700 }}>
          Points
          <input
            type="number"
            min={0}
            value={form.points}
            onChange={(e) => setField('points', Number(e.target.value))}
            required
            style={{ display: 'block', marginTop: '4px', width: '100%', padding: '8px' }}
          />
        </label>

        <label style={{ fontWeight: 700 }}>
          Difficulty
          <select
            value={form.difficulty}
            onChange={(e) => setField('difficulty', e.target.value)}
            style={{ display: 'block', marginTop: '4px', width: '100%', padding: '8px' }}
          >
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </label>
      </div>

      <label style={{ fontWeight: 700 }}>
        Secret Flag
        <input
          type="text"
          value={form.flag}
          onChange={(e) => setField('flag', e.target.value)}
          placeholder={selectedChallengeId ? 'Leave blank to keep existing flag' : 'picoCTF{...}'}
          required={!selectedChallengeId}
          style={{ display: 'block', marginTop: '4px', width: '100%', padding: '8px' }}
        />
      </label>

      <label style={{ fontWeight: 700 }}>
        Author
        <input
          type="text"
          value={form.author}
          onChange={(e) => setField('author', e.target.value)}
          style={{ display: 'block', marginTop: '4px', width: '100%', padding: '8px' }}
        />
      </label>

      <label style={{ fontWeight: 700 }}>
        Description
        <textarea
          value={form.description}
          onChange={(e) => setField('description', e.target.value)}
          rows={3}
          style={{ display: 'block', marginTop: '4px', width: '100%', padding: '8px' }}
        />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '10px' }}>
        <label style={{ fontWeight: 700 }}>
          Hint
          <input
            type="text"
            value={form.hint}
            onChange={(e) => setField('hint', e.target.value)}
            style={{ display: 'block', marginTop: '4px', width: '100%', padding: '8px' }}
          />
        </label>

        <label style={{ fontWeight: 700 }}>
          Hint Cost
          <input
            type="number"
            min={0}
            value={form.hintCost}
            onChange={(e) => setField('hintCost', Number(e.target.value))}
            style={{ display: 'block', marginTop: '4px', width: '100%', padding: '8px' }}
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="submit"
          disabled={saving}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: selectedChallengeId ? '#0d6efd' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          {saving ? 'Saving...' : selectedChallengeId ? 'Update Challenge' : 'Add Challenge'}
        </button>
        <button
          type="button"
          onClick={resetForm}
          style={{
            padding: '10px 12px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
      </div>

      {selectedChallengeId && (
        <p style={{ margin: 0, color: '#6c757d', fontSize: '0.9rem' }}>
          Editing challenge ID #{selectedChallengeId}. Click another row to switch.
        </p>
      )}
    </form>
  );

  return (
    <div style={{ display: 'grid', gap: '18px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '18px', alignItems: 'start' }}>
        <section style={{ border: '1px solid #dee2e6', borderRadius: '8px', backgroundColor: '#fff', overflow: 'hidden' }}>
          <div style={{ padding: '12px 15px', borderBottom: '1px solid #dee2e6', fontWeight: 700 }}>
            Challenges ({challenges.length})
          </div>

          <div style={{ maxHeight: '520px', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f8f9fa', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Title</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Category</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Pts</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Difficulty</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Created</th>
                  <th style={{ textAlign: 'left', padding: '10px' }} />
                </tr>
              </thead>
              <tbody>
                {challenges.map((challenge) => {
                  const selected = selectedChallengeId === challenge.id;
                  return (
                    <tr
                      key={challenge.id}
                      onClick={() => selectChallenge(challenge)}
                      style={{
                        backgroundColor: selected ? '#e7f1ff' : 'transparent',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f1f3f5',
                      }}
                    >
                      <td style={{ padding: '10px', fontWeight: 600 }}>{challenge.title}</td>
                      <td style={{ padding: '10px' }}>{challenge.category}</td>
                      <td style={{ padding: '10px' }}>{challenge.points}</td>
                      <td style={{ padding: '10px' }}>{challenge.difficulty || 'Medium'}</td>
                      <td style={{ padding: '10px' }}>
                        {challenge.createdAt ? new Date(challenge.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDelete(challenge.id);
                          }}
                          style={{
                            backgroundColor: '#dc3545',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ border: '1px solid #dee2e6', padding: '16px', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
          {renderChallengeForm()}
        </section>
      </div>

      <section style={{ border: '1px solid #dee2e6', borderRadius: '8px', backgroundColor: '#fff' }}>
        <div style={{ padding: '12px 15px', borderBottom: '1px solid #dee2e6', fontWeight: 700 }}>
          Pending Laboratory Challenge Submissions ({pendingSubmissions.length})
        </div>

        {pendingSubmissions.length === 0 ? (
          <p style={{ padding: '14px 15px', margin: 0, color: '#6c757d' }}>
            No pending submissions.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '8px', padding: '10px' }}>
            {pendingSubmissions.map((submission) => (
              <article
                key={submission.id}
                style={{ border: '1px solid #e9ecef', borderRadius: '6px', padding: '12px', backgroundColor: '#f8f9fa' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0' }}>{submission.title}</h4>
                    <p style={{ margin: 0, color: '#6c757d', fontSize: '0.9rem' }}>
                      {submission.category} • {submission.points} pts • {submission.difficulty} • by {submission.submittedBy}
                    </p>
                    <p style={{ margin: '4px 0 0 0', color: '#6c757d', fontSize: '0.85rem' }}>
                      Submitted {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : '-'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleAcceptSubmission(submission.id)}
                      style={{
                        backgroundColor: '#198754',
                        color: '#fff',
                        border: 'none',
                        padding: '8px 10px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRemoveSubmission(submission.id)}
                      style={{
                        backgroundColor: '#dc3545',
                        color: '#fff',
                        border: 'none',
                        padding: '8px 10px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {submission.description && (
                  <p style={{ margin: '10px 0 0 0', whiteSpace: 'pre-wrap' }}>{submission.description}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}