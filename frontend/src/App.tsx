import { useState, useEffect } from 'react';
import {Routes, Route, Navigate, useNavigate, Link} from 'react-router-dom';
import toast, {Toaster} from 'react-hot-toast';
import { useAuth } from './context/AuthContext';

import Login from './components/Login';
import Scoreboard from './components/Scoreboard';
import ChallengeBoard from './components/ChallengeBoard';
import AdminBoard from './components/AdminBoard.tsx';
import AdminLogin from './components/AdminLogin';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Signup from './components/Signup';
import Workspace from './components/Workspace';
import Laboratory from './components/Laboratory';
import SiteFooter from './components/SiteFooter';
import AboutPage from './components/AboutPage';
import PrivacyPage from './components/PrivacyPage';
import TermsPage from './components/TermsPage';
import ContactPage from './components/ContactPage';

export default function App() {

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileEmail, setProfileEmail] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const { token, username, role, logout } = useAuth();
  const navigate = useNavigate();

  const parseTokenExp = (jwtToken: string): number | null => {
    try {
      const payloadPart = jwtToken.split('.')[1];
      if (!payloadPart) return null;

      const normalizedPayload = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(normalizedPayload));
      return typeof payload.exp === 'number' ? payload.exp : null;
    } catch {
      return null;
    }
  };

  // Handle Theme Toggling globally
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // Auto-expire client session when JWT expiry time is reached.
  useEffect(() => {
    if (!token) return;

    const exp = parseTokenExp(token);
    if (!exp) return;

    const now = Math.floor(Date.now() / 1000);
    if (now >= exp) {
      logout();
      toast.error('Session expired. Please log in again.');
      navigate('/login', { replace: true });
      return;
    }

    const timeoutMs = (exp - now) * 1000;
    const timer = window.setTimeout(() => {
      logout();
      toast.error('Session expired. Please log in again.');
      navigate('/login', { replace: true });
    }, timeoutMs);

    return () => window.clearTimeout(timer);
  }, [token, logout, navigate]);

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch('http://localhost:3001/api/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.error('Failed to call logout API:', err);
      }
    }

    logout();
    toast.success('Logged out successfully!');
    navigate('/');
  };

  const openProfileModal = async () => {
    if (!token) return;
    setIsProfileOpen(true);
    setProfileLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/me/profile', {
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
      if (data.success && data.user) {
        setProfileEmail(data.user.email || 'No email set');
      } else {
        toast.error(data.message || 'Failed to load profile details.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load profile details.');
    } finally {
      setProfileLoading(false);
    }
  };

  const closeProfileModal = () => {
    if (changingPassword) return;
    setIsProfileOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    if (newPassword !== confirmNewPassword) {
      toast.error('New password and confirm password do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch('http://localhost:3001/api/me/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (response.status === 401 || response.status === 403) {
        logout();
        toast.error('Session expired. Please log in again.');
        navigate('/login', { replace: true });
        return;
      }

      const data = await response.json();
      if (data.success) {
        toast.success(data.message || 'Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        toast.error(data.message || 'Failed to change password.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
    if (!username) return <Navigate to="/login" replace />; // Kick out unauthorized users

    return (
      <div className="bg-background-light dark:bg-background-dark text-secondary dark:text-gray-200 min-h-screen flex flex-col transition-colors duration-300">
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-secondary/80 border-b border-gray-200 dark:border-gray-800 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              
              <Link to="/dashboard" className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-3xl">terminal</span>
                <span className="text-xl font-extrabold tracking-tight font-mono text-secondary dark:text-white">
                  Cipher<span className="text-primary">Core</span>
                </span>
              </Link>
              
              <nav className="hidden md:flex space-x-8 items-center">
                <Link to="/dashboard" className="text-sm font-medium hover:text-primary transition-colors text-navy dark:text-steel dark:hover:text-white">
                  Dashboard
                </Link>
                <Link to="/challenges" className="text-sm font-medium hover:text-primary transition-colors text-navy dark:text-steel dark:hover:text-white">
                  Challenges
                </Link>
                <Link to="/scoreboard" className="text-sm font-medium hover:text-primary transition-colors text-navy dark:text-steel dark:hover:text-white">
                  Scoreboard
                </Link>
                <Link to="/lab" className="text-sm font-medium hover:text-primary transition-colors text-navy dark:text-steel dark:hover:text-white">
                  Laboratory
                </Link>
              </nav>

              <div className="flex items-center gap-4">
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full hover:bg-gray-100 dark:bg-gray-800 text-accent transition-colors">
                  <span className="material-symbols-outlined">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
                </button>
                <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-700">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-primary uppercase">Player</p>
                    <p className="text-sm font-semibold dark:text-white">{username}</p>
                  </div>
                  <button
                    type="button"
                    onClick={openProfileModal}
                    className="w-10 h-10 rounded-full border-2 border-primary bg-secondary flex items-center justify-center text-white font-bold uppercase hover:opacity-90 transition-opacity"
                    title="Profile"
                    aria-label="Open profile"
                  >
                    {username.charAt(0)}
                  </button>
                  <button onClick={handleLogout} className="ml-2 p-2 text-slate-400 hover:text-primary transition-colors flex items-center" title="Sign Out">
                    <span className="material-symbols-outlined">logout</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </header>

        <main className="flex-grow">
          {isProfileOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
              <button
                type="button"
                onClick={closeProfileModal}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                aria-label="Close profile modal"
              />

              <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Profile</h3>
                  <button
                    type="button"
                    onClick={closeProfileModal}
                    disabled={changingPassword}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                <div className="px-5 py-4 space-y-2">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Username</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{username}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 pt-2">Email</p>
                  <p className="font-semibold text-slate-900 dark:text-white break-all">
                    {profileLoading ? 'Loading...' : profileEmail}
                  </p>
                </div>

                <form onSubmit={handleChangePassword} className="px-5 pb-5 space-y-3">
                  <h4 className="font-semibold text-slate-900 dark:text-white pt-1">Change Password</h4>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current password"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-900 dark:text-white"
                    required
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-900 dark:text-white"
                    required
                  />
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-900 dark:text-white"
                    required
                  />
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="w-full rounded-lg bg-primary text-white font-bold py-2.5 hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {changingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            </div>
          )}
          {children}
        </main>

        <SiteFooter className="mt-20" />
      </div>
    );
  };

  const AdminLayout = ({ children }: { children: React.ReactNode }) => {
    if (!username) return <Navigate to="/admin/login" replace />;
    if (role !== 'admin') return <Navigate to="/dashboard" replace />;

    return (
      <div className="bg-background-light dark:bg-background-dark min-h-screen text-secondary dark:text-white flex flex-col">
        <div className="p-6 md:p-10 font-sans max-w-[1400px] mx-auto w-full flex-1">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 shadow-sm mb-6">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(220,38,38,0.18),transparent_45%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(248,113,113,0.2),transparent_45%)]" />
            <div className="relative px-5 py-5 md:px-6 md:py-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary border border-primary/30 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[26px]">admin_panel_settings</span>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    Admin Control Center
                  </h1>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Moderate challenges, review submissions, and monitor player progression from one dashboard.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-start lg:self-auto">
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="h-10 w-10 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-200 transition-colors"
                  title="Toggle theme"
                  aria-label="Toggle theme"
                >
                  <span className="material-symbols-outlined text-[20px]">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
                </button>
                <div className="rounded-full border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/60">
                  Logged in as <span className="font-bold text-primary">{username}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="h-10 px-3 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5"
                  title="Sign Out"
                  aria-label="Sign out"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  <span className="text-sm font-semibold">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
          {children}
        </div>
        <SiteFooter />
      </div>
    );
  };

  // --- THE ROUTING ENGINE ---
  return (
  <>
    <Toaster position="top-right" toastOptions={{
      duration: 3000,
      className: 'dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xl font-mono text-sm'
    }} />

    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage onStartClick={() => navigate('/login')} />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/login" element={username ? <Navigate to="/dashboard" replace /> : <Login onSwitchToSignup={() => navigate('/signup')} />} />
      <Route path="/signup" element={username ? <Navigate to="/dashboard" replace /> : <Signup onSwitchToLogin={() => navigate('/login')} />} />

      <Route path="/lab" element={
        <ProtectedLayout>
          <Laboratory />
        </ProtectedLayout>
      } />

      <Route path="/lab/notebooks/:notebookId" element={
        <ProtectedLayout>
          <Workspace />
        </ProtectedLayout>
      } />
      
      {/* Admin Routes */}
      <Route
        path="/admin"
        element={<Navigate to={role === 'admin' ? '/admin/portal' : '/admin/login'} replace />}
      />
      <Route
        path="/admin/login"
        element={role === 'admin' ? <Navigate to="/admin/portal" replace /> : <AdminLogin />}
      />
      <Route
        path="/admin/portal"
        element={
          <AdminLayout>
            <AdminBoard />
          </AdminLayout>
        }
      />

      {/* Protected Player Routes */}
      <Route path="/dashboard" element={<ProtectedLayout><Dashboard username={username || ""} /></ProtectedLayout>} />
      <Route path="/challenges" element={<ProtectedLayout><ChallengeBoard /></ProtectedLayout>} />
      <Route path="/scoreboard" element={<ProtectedLayout><div className="max-w-7xl mx-auto py-8"><Scoreboard username={username || ""} /></div></ProtectedLayout>} />

      {/* Catch-all: If they type a weird URL, send them back to the start */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  </> 
  );
}