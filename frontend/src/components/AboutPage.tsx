import { Link } from 'react-router-dom';
import SiteFooter from './SiteFooter';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark text-slate-900 dark:text-white">
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold">About CipherCore</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Built for Curious Security Minds</h1>
        <p className="mt-5 text-slate-600 dark:text-slate-300 leading-relaxed">
          CipherCore is a hands-on CTF learning platform where players practice web, crypto, forensics,
          reverse engineering, and more through curated challenges. We built this platform to make security
          learning competitive, practical, and genuinely fun.
        </p>
        <p className="mt-4 text-slate-600 dark:text-slate-300 leading-relaxed">
          Our goal is to help learners level up by doing, not just reading. Whether you are a beginner
          or experienced hacker, CipherCore gives you a place to train, track progress, and compete.
        </p>
        <Link to="/" className="inline-flex mt-8 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-primary transition-colors">
          Back to Home
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
