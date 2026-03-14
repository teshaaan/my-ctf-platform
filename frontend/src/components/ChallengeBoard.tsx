import { useState, useEffect } from 'react';
import ChallengeDetail from './ChallengeDetails';

interface Challenge {
  id: number;
  title: string;
  category: string;
  points: number;
}

export default function ChallengeBoard() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChallengeId, setSelectedChallengeId] = useState<number | null>(null);

  useEffect(() => {
    fetch('http://localhost:3001/api/challenges')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setChallenges(data);
      })
      .catch(err => console.error(err));
  }, []);

  // Filter logic: Checks category AND search bar text
  const uniqueCategories = ["All", ...Array.from(new Set(challenges.map(c => c.category)))];
  const filteredChallenges = challenges.filter(c => {
    const matchesCategory = selectedCategory === "All" || c.category === selectedCategory;
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Helper to color-code categories
  const getCategoryStyles = (cat: string) => {
    switch(cat) {
      case 'Web Exploitation': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Cryptography': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'Reverse Engineering': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'Forensics': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Find the full challenge object based on the selected ID
  const selectedChallenge = challenges.find(c => c.id === selectedChallengeId);

  // If a challenge is clicked, show the Detail view instead of the grid!
  if (selectedChallenge) {
    return (
      <ChallengeDetail 
        challenge={selectedChallenge} 
        onBack={() => setSelectedChallengeId(null)} // This brings them back to the grid
      />
    );
  }

  // Otherwise, render the standard Grid view
  return (
    <div className="max-w-7xl mx-auto py-8">
      {/* Search & Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-secondary dark:text-white">Active Challenges</h1>
          <p className="text-accent dark:text-gray-400 mt-1">Select a vulnerability and capture the flag.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-accent">search</span>
            <input 
              className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-secondary dark:text-white focus:ring-primary focus:border-primary w-full md:w-64" 
              placeholder="Search challenges..." 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex overflow-x-auto pb-4 gap-3 mb-8 no-scrollbar">
        {uniqueCategories.map(cat => (
          <button 
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-2 rounded-full font-medium whitespace-nowrap transition-colors border ${
              selectedCategory === cat 
                ? "bg-primary text-white border-primary" 
                : "bg-white dark:bg-secondary text-secondary dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Challenge Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredChallenges.map(chal => (
          <div key={chal.id} className={`group bg-white dark:bg-secondary rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-xl flex flex-col transition-all`}>
            <div className="p-6 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <span className={`${getCategoryStyles(chal.category)} text-xs font-bold px-2 py-1 rounded uppercase tracking-wider`}>
                  {chal.category}
                </span>
                <div className="flex items-center gap-1 text-primary">
                  <span className="material-symbols-outlined text-sm">stars</span>
                  <span className="font-mono font-bold">{chal.points} pts</span>
                </div>
              </div>
              <h3 className="text-xl font-bold dark:text-white mb-2">{chal.title}</h3>
              <p className="text-accent dark:text-gray-400 text-sm line-clamp-2 mb-4">
                Capture the flag to prove your skills in {chal.category}.
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
              <button 
                onClick={() => setSelectedChallengeId(chal.id)}
                className="w-full bg-secondary dark:bg-primary text-white py-2 rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <span>Select Target</span>
                <span className="material-symbols-outlined text-sm">rocket_launch</span>
              </button>
            </div>
          </div>
        ))}
        {filteredChallenges.length === 0 && <p className="col-span-full text-center text-accent italic">No challenges found.</p>}
      </div>
    </div>
  );
}