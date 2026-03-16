import { Link } from 'react-router-dom';
import SiteFooter from './SiteFooter';

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark text-slate-900 dark:text-white">
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold">Contact</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Contact Us</h1>
        <p className="mt-5 text-slate-600 dark:text-slate-300 leading-relaxed">
          Questions, feedback, or bug reports are always welcome. Reach us at:
        </p>
        <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-5">
          <p className="text-slate-700 dark:text-slate-300"><strong>Email:</strong> support@ciphercore.dev</p>
          <p className="mt-2 text-slate-700 dark:text-slate-300"><strong>Discord:</strong> discord.gg/ciphercore</p>
          <p className="mt-2 text-slate-700 dark:text-slate-300"><strong>Response time:</strong> 1-3 business days</p>
        </div>
        <Link to="/" className="inline-flex mt-8 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-primary transition-colors">
          Back to Home
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
