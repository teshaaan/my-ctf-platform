import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ChallengeDetail from './ChallengeDetails';
import { useAuth } from '../context/AuthContext';

interface Challenge {
  id: number;
  title: string;
  category: string;
  points: number;
  description?: string;
  author?: string;
  hint?: string;
  hintCost?: number;
  difficulty: string;
  solveCount: number;
}

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeDifficulty = (value?: string | null): string => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'easy') return 'Easy';
  if (normalized === 'medium') return 'Medium';
  if (normalized === 'hard') return 'Hard';
  return 'Unknown';
};

export default function ChallengeBoard() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [solvedChallengeIds, setSolvedChallengeIds] = useState<number[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'solved' | 'unsolved'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChallengeId, setSelectedChallengeId] = useState<number | null>(null);
  const { token, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [challengesResponse, solvedResponse] = await Promise.all([
          fetch('http://localhost:3001/api/challenges', { cache: 'no-store' }),
          fetch('http://localhost:3001/api/me/solves', {
            cache: 'no-store',
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (solvedResponse.status === 401 || solvedResponse.status === 403) {
          logout();
          toast.error('Session expired. Please log in again.');
          navigate('/login', { replace: true });
          return;
        }

        const challengesData = await challengesResponse.json();
        if (Array.isArray(challengesData)) {
          const normalizedChallenges = challengesData.map((challenge) => ({
            id: toNumber(challenge.id),
            title: String(challenge.title || ''),
            category: String(challenge.category || 'Misc'),
            points: toNumber(challenge.points),
            description: String(challenge.description || ''),
            author: String(challenge.author || 'System_Admin'),
            hint: String(challenge.hint || ''),
            hintCost: toNumber(challenge.hintCost),
            difficulty: String(challenge.difficulty || ''),
            solveCount: toNumber(challenge.solveCount),
          }));
          setChallenges(normalizedChallenges);
        }

        const solvedData = await solvedResponse.json();
        if (solvedData.success && Array.isArray(solvedData.solvedChallengeIds)) {
          const normalizedSolvedIds = solvedData.solvedChallengeIds
            .map((id: unknown) => toNumber(id, NaN))
            .filter((id: number) => Number.isFinite(id));
          setSolvedChallengeIds(normalizedSolvedIds);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load challenges.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token, logout, navigate]);

  useEffect(() => {
    const resumeChallengeId = (location.state as { resumeChallengeId?: number } | null)?.resumeChallengeId;
    if (!resumeChallengeId || challenges.length === 0) return;
    const exists = challenges.some((c) => c.id === resumeChallengeId);
    if (exists) setSelectedChallengeId(resumeChallengeId);
  }, [location.state, challenges]);

  const uniqueCategories = useMemo(
    () => Array.from(new Set(challenges.map((c) => c.category))),
    [challenges]
  );

  const uniqueDifficulties = useMemo(() => {
    const defaults = ['Easy', 'Medium', 'Hard'];
    const api = challenges.map((c) => normalizeDifficulty(c.difficulty));
    return Array.from(new Set([...defaults, ...api]));
  }, [challenges]);

  const solvedSet = useMemo(() => new Set(solvedChallengeIds), [solvedChallengeIds]);

  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      const difficulty = normalizeDifficulty(c.difficulty);
      const isSolved = solvedSet.has(toNumber(c.id));
      const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(c.category);
      const matchesDifficulty = selectedDifficulties.length === 0 || selectedDifficulties.includes(difficulty);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'solved' && isSolved) ||
        (statusFilter === 'unsolved' && !isSolved);
      return matchesSearch && matchesCategory && matchesDifficulty && matchesStatus;
    });
  }, [challenges, searchQuery, selectedCategories, selectedDifficulties, statusFilter, solvedSet]);

  const totalPages = Math.max(1, Math.ceil(filteredChallenges.length / itemsPerPage));

  useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedCategories, selectedDifficulties, statusFilter, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedChallenges = filteredChallenges.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleCategory = (category: string) =>
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((v) => v !== category) : [...prev, category]
    );

  const toggleDifficulty = (difficulty: string) =>
    setSelectedDifficulties((prev) =>
      prev.includes(difficulty) ? prev.filter((v) => v !== difficulty) : [...prev, difficulty]
    );

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedDifficulties([]);
    setStatusFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const activeFilterCount =
    selectedCategories.length + selectedDifficulties.length + (statusFilter !== 'all' ? 1 : 0);

  // ── Category chip colours ──────────────────────────────────────────────────
  const getCategoryChipStyles = (cat: string, active: boolean) => {
    const base =
      'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer select-none whitespace-nowrap';
    if (!active)
      return `${base} border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 bg-transparent hover:border-gray-400 dark:hover:border-gray-400`;
    switch (cat) {
      case 'Web Exploitation':   return `${base} bg-blue-600   border-blue-600   text-white`;
      case 'Cryptography':       return `${base} bg-green-600  border-green-600  text-white`;
      case 'Reverse Engineering':return `${base} bg-purple-600 border-purple-600 text-white`;
      case 'Forensics':          return `${base} bg-red-600    border-red-600    text-white`;
      default:                   return `${base} bg-gray-600   border-gray-600   text-white`;
    }
  };

  // ── Difficulty chip colours ────────────────────────────────────────────────
  const getDifficultyChipStyles = (difficulty: string, active: boolean) => {
    const base =
      'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer select-none';
    if (!active)
      return `${base} border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 bg-transparent hover:border-gray-400 dark:hover:border-gray-400`;
    switch (difficulty) {
      case 'Easy':   return `${base} bg-emerald-500 border-emerald-500 text-white`;
      case 'Medium': return `${base} bg-amber-500   border-amber-500   text-white`;
      case 'Hard':   return `${base} bg-rose-600    border-rose-600    text-white`;
      default:       return `${base} bg-gray-600    border-gray-600    text-white`;
    }
  };

  // ── Card badge styles (grid view) ─────────────────────────────────────────
  const getCategoryBadgeStyles = (cat: string) => {
    switch (cat) {
      case 'Web Exploitation':   return 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400';
      case 'Cryptography':       return 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400';
      case 'Reverse Engineering':return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'Forensics':          return 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400';
      default:                   return 'bg-gray-100   text-gray-700   dark:bg-gray-700      dark:text-gray-300';
    }
  };

  const getDifficultyBadgeStyles = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':   return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'Medium': return 'bg-amber-100   text-amber-700   dark:bg-amber-900/30   dark:text-amber-400';
      case 'Hard':   return 'bg-rose-100    text-rose-700    dark:bg-rose-900/30    dark:text-rose-400';
      default:       return 'bg-gray-100    text-gray-700    dark:bg-gray-700       dark:text-gray-300';
    }
  };

  const selectedChallenge = challenges.find((c) => c.id === selectedChallengeId);

  const handleChallengeSolved = (challengeId: number) => {
    const normalizedId = toNumber(challengeId);
    setSolvedChallengeIds((prev) => (prev.includes(normalizedId) ? prev : [...prev, normalizedId]));
  };

  if (selectedChallenge) {
    return (
      <ChallengeDetail
        challenge={selectedChallenge}
        onBack={() => setSelectedChallengeId(null)}
        onSolved={handleChallengeSolved}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-5 lg:px-6 relative">
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        {/* Hamburger with active-filter badge */}
        <button
          onClick={() => setIsSidebarOpen((prev) => !prev)}
          className="relative h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-secondary text-secondary dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle filters"
        >
          <span className="material-symbols-outlined text-xl">
            {isSidebarOpen ? 'close' : 'menu'}
          </span>
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {activeFilterCount}
            </span>
          )}
        </button>

        <div>
          <h1 className="text-3xl font-bold text-secondary dark:text-white">Active Challenges</h1>
          <p className="text-accent dark:text-gray-400 mt-0.5 text-sm">
            Filter and browse challenges.
          </p>
        </div>
      </div>

      <div className="relative">
        {/* ── Filter panel (overlay / side rail) ───────────────────────────── */}
        <div
          className={`fixed inset-0 z-30 bg-black/30 transition-opacity lg:hidden ${
            isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />

        <aside
          className={`z-40 transition-all duration-300 ${
            isSidebarOpen
              ? 'opacity-100 translate-y-0 lg:translate-x-0 pointer-events-auto'
              : 'opacity-0 -translate-y-2 lg:-translate-x-3 pointer-events-none'
          } fixed top-20 left-4 right-4 lg:left-6 lg:right-auto lg:top-24 lg:w-72`}
        >
          <div className="bg-white dark:bg-secondary border border-gray-200 dark:border-gray-800 rounded-xl p-5 w-full lg:w-72 max-h-[calc(100vh-7rem)] overflow-y-auto shadow-lg">
            {/* Sidebar header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  Filters
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    Clear all ({activeFilterCount})
                  </button>
                )}
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="h-7 w-7 rounded-md border border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Close filters"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
            </div>

            {/* Status */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                Status
              </h3>
              <div className="flex flex-wrap gap-2">
                {(['all', 'unsolved', 'solved'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer select-none ${
                      statusFilter === s
                        ? 'bg-secondary dark:bg-primary border-secondary dark:border-primary text-white'
                        : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 bg-transparent hover:border-gray-400 dark:hover:border-gray-400'
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                Difficulty
              </h3>
              <div className="flex flex-wrap gap-2">
                {uniqueDifficulties.map((difficulty) => (
                  <button
                    key={difficulty}
                    onClick={() => toggleDifficulty(difficulty)}
                    className={getDifficultyChipStyles(difficulty, selectedDifficulties.includes(difficulty))}
                  >
                    {difficulty}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                Category
              </h3>
              <div className="flex flex-wrap gap-2">
                {uniqueCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={getCategoryChipStyles(category, selectedCategories.includes(category))}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main content ────────────────────────────────────────────────── */}
        <div className="min-w-0">
          {/* Search */}
          <div className="mb-6">
            <div className="relative w-full lg:max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-accent">
                search
              </span>
              <input
                className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-secondary dark:text-white focus:ring-primary focus:border-primary w-full"
                placeholder="Search challenges..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {loading && <p className="text-accent">Loading challenges...</p>}

          {!loading && (
            <>
              {/* Challenge grid */}
              <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
                {paginatedChallenges.map((chal) => {
                  const solved = solvedSet.has(toNumber(chal.id));
                  const difficulty = normalizeDifficulty(chal.difficulty);
                  const solveCount = Number(chal.solveCount) || 0;

                  return (
                    <div
                      key={chal.id}
                      className="group bg-white dark:bg-secondary rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5 flex flex-col transition-all"
                    >
                      <div className="h-1.5 bg-gradient-to-r from-primary via-rose-500 to-orange-400" />
                      <div className="p-6 flex flex-col h-full">
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-bold mb-1">
                              Name
                            </p>
                            <h3 className="text-xl font-bold dark:text-white leading-tight">{chal.title}</h3>
                          </div>
                          <span
                            className={`text-xs font-bold px-2 py-1 rounded ${
                              solved
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {solved ? 'Solved' : 'Unsolved'}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          <span className={`${getCategoryBadgeStyles(chal.category)} text-xs font-bold px-2 py-1 rounded uppercase tracking-wider`}>
                            {chal.category}
                          </span>
                          <span className={`${getDifficultyBadgeStyles(difficulty)} text-xs font-bold px-2 py-1 rounded uppercase tracking-wider`}>
                            {difficulty}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm mb-2">
                          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-bold mb-1">Points</p>
                            <p className="font-mono font-bold text-primary flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">stars</span>
                              {chal.points}
                            </p>
                          </div>

                          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-bold mb-1">No. of Solves</p>
                            <p className="font-semibold text-secondary dark:text-white flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">trophy</span>
                              {solveCount}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
                        <button
                          onClick={() => setSelectedChallengeId(chal.id)}
                          className="w-full bg-secondary dark:bg-primary text-white py-2 rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        >
                          <span>Select Target</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {paginatedChallenges.length === 0 && (
                  <p className="col-span-full text-center text-accent italic">
                    No challenges found for selected filters.
                  </p>
                )}
              </div>

              {/* Pagination + page size */}
              <div className="mt-8 space-y-4">
                <div className="overflow-x-auto">
                  <div className="flex items-center justify-center gap-2 min-w-max">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-50"
                    >
                      Prev
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-lg border ${
                          currentPage === page
                            ? 'bg-primary text-white border-primary'
                            : 'border-gray-300 dark:border-gray-700 text-secondary dark:text-gray-200'
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <label className="text-sm text-accent">Per page</label>
                  <select
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-secondary dark:text-white"
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  >
                    <option value={12}>12</option>
                    <option value={36}>36</option>
                    <option value={48}>48</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
