import { Link } from 'react-router-dom';
import SiteFooter from './SiteFooter';

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark text-slate-900 dark:text-white">
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold">Terms</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Terms of Use</h1>
        <p className="mt-5 text-slate-600 dark:text-slate-300 leading-relaxed">
          CipherCore is for educational and authorized security practice only. Any misuse of acquired
          knowledge against systems you do not own or have permission to test is strictly prohibited.
        </p>
        <p className="mt-4 text-slate-600 dark:text-slate-300 leading-relaxed">
          We reserve the right to suspend accounts involved in abuse, cheating, or malicious activity.
          By using the platform, you agree to fair play, respectful conduct, and legal usage.
        </p>
        <Link to="/" className="inline-flex mt-8 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-primary transition-colors">
          Back to Home
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
