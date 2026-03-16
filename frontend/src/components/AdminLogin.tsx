import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import SiteFooter from './SiteFooter';

export default function AdminLogin() {
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault(); 
    setError('');
    
    if (usernameInput.trim() !== '' && password.trim() !== '') {
      try {
        const response = await fetch('http://localhost:3001/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: usernameInput, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
          // STRICT CHECK: Are they actually an admin?
          if (data.role === 'admin') {
            login(data.token, data.username, data.role);
            toast.success(`Admin authenticated: ${data.username}`);
            navigate('/admin/portal');
          } else {
            // Kick them out if they are a regular player
            setError("Access Denied: You do not have administrator privileges.");
          }
        } else {
          setError(data.message);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to connect to the server.");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 shadow-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
            <p className="text-xs uppercase tracking-widest font-semibold text-primary">Restricted Area</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Admin Portal Login</h2>
          </div>

          <form onSubmit={handleLogin} className="px-6 py-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Username</label>
              <input
                type="text"
                placeholder="Admin Username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
              <input
                type="password"
                placeholder="Admin Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-primary text-white font-bold hover:opacity-90 transition-opacity"
            >
              Authenticate
            </button>

            {error && <p className="text-sm font-semibold text-primary text-center">{error}</p>}
          </form>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}