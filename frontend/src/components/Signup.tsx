import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface SignupProps {
  onSwitchToLogin: () => void;
}

export default function Signup({ onSwitchToLogin }: SignupProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const isStrongPassword = (candidate: string) => {
    // Match backend password policy.
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/;
    return strongPasswordRegex.test(candidate);
  };

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!isStrongPassword(password)) {
      setError('Password must be 8+ chars with uppercase, lowercase, number, and symbol.');
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      
      const data = await response.json();
      
      if (data.success) {
        login(data.token, data.username, data.role);
        toast.success(`Account created. Welcome, ${data.username}!`);
        navigate('/dashboard');
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to the server.");
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex items-center justify-center relative overflow-hidden transition-colors duration-300 w-full">
      <div className="absolute inset-0 cyber-grid-signup pointer-events-none"></div>
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary opacity-[0.03] dark:opacity-[0.05] blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-accent-grey opacity-[0.1] dark:opacity-[0.05] blur-[120px] rounded-full"></div>
      
      <div className="w-full max-w-md px-6 relative z-10 animate-fade-in-up">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 mb-4 bg-primary rounded-xl text-white shadow-lg">
            <span className="material-symbols-outlined text-3xl">security</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            Join <span className="font-mono text-primary">CipherCore</span>
          </h1>
          <p className="text-slate-500 dark:text-accent-grey">Start your journey into the world of CTF.</p>
        </div>

        <div className="bg-white dark:bg-slate-800/50 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 p-8 rounded-2xl shadow-xl glow-effect">
          <form onSubmit={handleSignup} className="space-y-5">
            
            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-[20px] text-slate-400">person</span>
                </div>
                <input 
                  type="text" 
                  required 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. shadow_hacker" 
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none placeholder:text-slate-400 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-[20px] text-slate-400">mail</span>
                </div>
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" 
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none placeholder:text-slate-400 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-[20px] text-slate-400">lock</span>
                </div>
                <input 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none placeholder:text-slate-400 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-[20px] text-slate-400">shield</span>
                </div>
                <input 
                  type="password" 
                  required 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none placeholder:text-slate-400 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {error && <p className="text-primary text-sm font-bold text-center">{error}</p>}

            <button type="submit" className="w-full py-3 px-4 bg-primary hover:bg-red-600 text-white font-semibold rounded-lg shadow-lg shadow-primary/20 transform transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              Create Account <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500 dark:text-accent-grey">
            Already have an account? 
            <button onClick={onSwitchToLogin} className="font-semibold text-primary hover:underline ml-1">Log in</button>
          </p>
        </div>
      </div>
    </div>
  );
}