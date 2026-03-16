import { Link } from 'react-router-dom';

interface SiteFooterProps {
  className?: string;
}

export default function SiteFooter({ className = '' }: SiteFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={`border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/70 backdrop-blur ${className}`.trim()}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm">
          <div>
            <p className="font-bold text-slate-900 dark:text-white">CipherCore</p>
            <p className="text-slate-500 dark:text-slate-400">Practice. Compete. Defend.</p>
          </div>

          <nav className="flex flex-wrap gap-4 text-slate-500 dark:text-slate-400">
            <Link to="/about" className="hover:text-primary transition-colors">About</Link>
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
            <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
          </nav>
        </div>

        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          © {year} CipherCore. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
