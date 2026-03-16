import { Link } from 'react-router-dom';
import SiteFooter from './SiteFooter';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark text-slate-900 dark:text-white">
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold">Privacy</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Privacy Policy</h1>
        <p className="mt-5 text-slate-600 dark:text-slate-300 leading-relaxed">
          We only collect the minimum data needed to run your account and provide challenge progress,
          rankings, and notebook features. This typically includes account credentials, challenge solves,
          and notebook content you create.
        </p>
        <p className="mt-4 text-slate-600 dark:text-slate-300 leading-relaxed">
          We do not sell your personal data. Security logs may be retained for abuse prevention and
          platform integrity. By using CipherCore, you consent to this basic data processing.
        </p>
        <Link to="/" className="inline-flex mt-8 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-primary transition-colors">
          Back to Home
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
