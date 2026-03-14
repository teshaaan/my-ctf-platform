import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';


interface LoginProps {
  onSwitchToSignup: () => void;
}

export default function Login({ onSwitchToSignup }: LoginProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault(); 
    setError('');
    
    if (identifier.trim() !== '') {
      try {
        const response = await fetch('http://localhost:3001/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: identifier, password }) 
        });
        
        const data = await response.json();
        
        if (data.success) {
          login(data.token, data.username, data.role);
          toast.success(`Welcome back, ${data.username}!`);
          navigate('/dashboard');
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
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex items-center justify-center p-4 pattern-bg transition-colors duration-300 w-full">
      <main className="w-full max-w-md relative z-10 animate-fade-in-up">
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-white rounded-2xl shadow-lg shadow-primary/30 mb-4 transform -rotate-6 hover:rotate-0 transition-transform duration-300">
            <span className="material-symbols-outlined text-4xl">terminal</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white mb-2">
            Cipher<span className="text-primary">Core</span>
          </h1>
          <p className="text-slate-500 dark:text-secondary font-medium">Cybersecurity CTF Arena</p>
        </div>

        <div className="cipher-card bg-white/80 dark:bg-slate-900/80 border border-white dark:border-slate-800 shadow-2xl rounded-3xl p-8 md:p-10">
          <h2 className="text-xl font-semibold mb-6">Welcome back, agent.</h2>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 ml-1">Username</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">alternate_email</span>
                <input 
                  type="text" 
                  required 
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="hacker99" 
                  className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary/50 dark:text-white transition-all placeholder:text-slate-400 outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 ml-1">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">Password</label>
                <a href="#" className="text-xs font-semibold text-primary hover:underline">Forgot?</a>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">lock</span>
                <input 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary/50 dark:text-white transition-all placeholder:text-slate-400 outline-none"
                />
              </div>
            </div>

            {error && <p className="text-primary text-sm font-bold text-center">{error}</p>}

            <button type="submit" className="w-full bg-primary hover:bg-red-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/25 transform active:scale-[0.98] transition-all flex items-center justify-center gap-2 group">
              <span>Initiate Session</span>
              <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">login</span>
            </button>
          </form>

          <p className="text-center mt-8 text-slate-500 dark:text-slate-400">
            New operative? 
            <button onClick={onSwitchToSignup} className="text-primary font-bold hover:underline ml-1">Create an account</button>
          </p>
        </div>
      </main>
    </div>
  );
}