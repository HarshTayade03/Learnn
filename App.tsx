import React, { useState, useEffect } from 'react';
import { searchVerifiedTopic, advancedVerifiedSearch } from './services/geminiService';
import { VerifiedResult } from './types';
import { Timer } from './components/Timer';
import { NotesPanel } from './components/NotesPanel';

type View = 'LANDING' | 'LEARN' | 'FOCUS';

// Helper to translate API errors into user-friendly messages
const getReadableError = (error: any): string => {
  const msg = error.message || error.toString();
  if (msg.includes('429')) return "Traffic is high! We've reached our API limit. Please wait a moment and try again.";
  if (msg.includes('400')) return "The search query was invalid. Please try a different topic.";
  if (msg.includes('500') || msg.includes('503')) return "Our AI servers are having a hiccup. Please try again shortly.";
  if (msg.includes('API Key')) return "Configuration Error: API Key is missing or invalid.";
  if (msg.includes('JSON')) return "We couldn't verify the results properly. Please try searching again.";
  return "An unexpected error occurred. Please try again.";
};

// -- COMPONENT: Markdown Renderer (Refined) --
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const processText = (text: string) => {
    const paragraphs = text.split('\n\n');
    return paragraphs.map((para, idx) => {
      if (para.startsWith('### ')) {
        return <h3 key={idx} className="text-xl font-bold text-slate-800 dark:text-white mt-8 mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">{parseInline(para.replace('### ', ''))}</h3>;
      }
      if (para.startsWith('## ')) {
        return <h2 key={idx} className="text-2xl font-bold text-slate-900 dark:text-white mt-10 mb-4">{parseInline(para.replace('## ', ''))}</h2>;
      }
      if (para.trim().startsWith('- ')) {
        const items = para.split('\n').filter(line => line.trim().startsWith('- '));
        return (
          <ul key={idx} className="list-disc pl-6 space-y-3 mb-6 text-slate-700 dark:text-slate-300">
            {items.map((item, i) => (
              <li key={i} className="font-normal text-lg leading-relaxed">{parseInline(item.replace('- ', ''))}</li>
            ))}
          </ul>
        );
      }
      // Explicitly normal font weight
      return <p key={idx} className="mb-6 text-slate-600 dark:text-slate-300 leading-relaxed text-lg font-normal">{parseInline(para)}</p>;
    });
  };

  const parseInline = (text: string) => {
    // Basic bold parsing
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-slate-900 dark:text-slate-100">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return <>{processText(content)}</>;
};

// -- COMPONENT: Reliability Indicator --
const CircularReliability: React.FC<{ score: number }> = ({ score }) => {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let colorClass = 'text-red-500';
  if (score >= 90) colorClass = 'text-emerald-500';
  else if (score >= 70) colorClass = 'text-amber-500';

  return (
    <div className="flex flex-col items-center justify-center p-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
      <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="50%" cy="50%" r={radius} fill="transparent" stroke="currentColor" strokeWidth="4" className="text-slate-100 dark:text-slate-700" />
          <circle cx="50%" cy="50%" r={radius} fill="transparent" stroke="currentColor" strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className={`${colorClass} transition-all duration-1000 ease-out`} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xs font-extrabold ${colorClass}`}>{score}%</span>
        </div>
      </div>
      <span className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">Reliability</span>
    </div>
  );
};

// -- COMPONENT: Landing Page --
const LandingPage: React.FC<{ onStart: () => void }> = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] px-4 text-center animate-fadeIn relative">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-20 dark:opacity-5 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-10 right-10 w-64 h-64 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-64 h-64 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-4 rounded-3xl mb-8 shadow-sm">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
      </div>
      <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-8 leading-tight">
        Focus. Learn. <br className="hidden md:block"/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">Master.</span>
      </h1>
      <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 max-w-2xl mb-12 leading-relaxed">
        Stop digital overload. Verified AI answers, smart notes, and deep focus tools in one simple, distraction-free space.
      </p>
      <button 
        onClick={onStart}
        className="px-12 py-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xl font-bold rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all transform duration-200 ring-4 ring-indigo-100 dark:ring-indigo-900"
      >
        Start Learning Now
      </button>
      
      <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full">
        <div className="p-8 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
          <div className="text-4xl mb-4">🧠</div>
          <h3 className="font-bold text-xl text-slate-800 dark:text-white mb-2">Verified Knowledge</h3>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">Multi-model consensus engine ensures accuracy and reduces misinformation.</p>
        </div>
        <div className="p-8 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
          <div className="text-4xl mb-4">📝</div>
          <h3 className="font-bold text-xl text-slate-800 dark:text-white mb-2">Smart Notes</h3>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">Capture insights instantly without leaving your learning environment.</p>
        </div>
        <div className="p-8 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
          <div className="text-4xl mb-4">⏱️</div>
          <h3 className="font-bold text-xl text-slate-800 dark:text-white mb-2">Deep Focus</h3>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">Integrated Pomodoro timer to maintain flow and build discipline.</p>
        </div>
      </div>
    </div>
  );
};

// -- COMPONENT: Footer --
const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500 dark:text-slate-400">
        <div className="flex items-center space-x-2 mb-4 md:mb-0">
          <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">Learnn</span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span>Verified Learning Platform</span>
        </div>
        <div className="flex space-x-6">
          <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">About</a>
          <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Privacy</a>
          <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Terms</a>
          <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Contact</a>
        </div>
        <div className="mt-4 md:mt-0">
          &copy; {new Date().getFullYear()} Learnn. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default function App() {
  const [view, setView] = useState<View>('LANDING');
  const [query, setQuery] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifiedResult | null>(null);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [showSummary, setShowSummary] = useState(true);
  const [copied, setCopied] = useState(false);
  const [deepMode, setDeepMode] = useState(false);

  // Initialize dark mode
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);
    setSearchedQuery(query);

    try {
      let data: VerifiedResult;
      if (deepMode) {
        data = await advancedVerifiedSearch(query);
      } else {
        data = await searchVerifiedTopic(query);
      }
      setResult(data);
      setQuery(''); // Clear the search input after successful search
    } catch (err: any) {
      setError(getReadableError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCopySummary = () => {
    if (result?.summary) {
      navigator.clipboard.writeText(result.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const NavButton = ({ target, icon, label }: { target: View; icon: React.ReactNode; label: string }) => (
    <button
      onClick={() => setView(target)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
        view === target 
        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' 
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </button>
  );

  if (view === 'LANDING') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col transition-colors duration-200 font-sans">
        <header className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
           <div className="font-bold text-2xl text-slate-800 dark:text-white flex items-center gap-2">
             <span className="bg-indigo-600 text-white p-1 rounded-lg">Ln</span>
             Learnn
           </div>
           <button 
             onClick={() => setDarkMode(!darkMode)}
             className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
           >
             {darkMode ? '☀️' : '🌙'}
           </button>
        </header>
        <LandingPage onStart={() => setView('LEARN')} />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navigation */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-8">
            <div className="font-bold text-2xl text-slate-800 dark:text-white flex items-center gap-2 cursor-pointer" onClick={() => setView('LANDING')}>
              <span className="bg-indigo-600 text-white p-1.5 rounded-lg text-sm">Ln</span>
              <span className="hidden sm:inline">Learnn</span>
            </div>
            
            {/* Navigation - Visible on Mobile as Icons */}
            <nav className="flex items-center gap-1 md:gap-2">
              <NavButton 
                target="LEARN" 
                label="Search" 
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
              />
              <NavButton 
                target="FOCUS" 
                label="Timer" 
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              />
            </nav>
          </div>

          <div className="flex items-center gap-4">
             <button 
               onClick={() => setDarkMode(!darkMode)}
               className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
             >
               {darkMode ? '☀️' : '🌙'}
             </button>
             <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full flex items-center justify-center font-bold text-xs">
               US
             </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 overflow-hidden flex flex-col">
        
        {view === 'FOCUS' ? (
           <div className="flex-1 flex flex-col items-center justify-center animate-fadeIn">
              <Timer />
           </div>
        ) : (
          // Updated Layout for better responsiveness: Stack on mobile, Row on Large Screens
          <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-8rem)] gap-6">
            
            {/* LEFT COLUMN: Search & Results */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden min-h-[60vh] lg:min-h-0">
              
              {/* Search Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-850">
                <form onSubmit={handleSearch} className="relative">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="What do you want to learn today?"
                      className="w-full pl-5 pr-28 py-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-lg transition-all"
                    />
                    
                    {/* Search Actions */}
                    <div className="absolute right-2 flex items-center gap-2">
                       {/* Deep Search Toggle */}
                       <div 
                         onClick={() => setDeepMode(!deepMode)}
                         className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold transition-all border select-none ${deepMode ? 'bg-indigo-100 border-indigo-200 text-indigo-700 dark:bg-indigo-900 dark:border-indigo-700 dark:text-indigo-300' : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400'}`}
                         title="Deep Verification generates multiple perspectives and consolidates them (Slower but more accurate)"
                       >
                         {deepMode ? '✨ Deep' : '⚡ Quick'}
                       </div>

                       <button
                        type="submit"
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg transition-all disabled:opacity-50"
                       >
                        {loading ? (
                          <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Results Area */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 bg-white dark:bg-slate-800 relative">
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-800/50 flex items-center gap-3 animate-fadeIn">
                    <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="font-medium">{error}</span>
                  </div>
                )}

                {!result && !loading && !error && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 opacity-60">
                    <svg className="w-24 h-24 mb-4 text-slate-200 dark:text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    <p className="text-xl font-medium">Search to start learning</p>
                  </div>
                )}

                {result && (
                  <div className="animate-fadeIn space-y-8 pb-10">
                    
                    {/* Header: Title & Reliability */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white capitalize leading-tight">{searchedQuery}</h2>
                        <div className="flex items-center gap-2 mt-2">
                           <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide">
                             {result.mode === 'deep' ? '✨ Deep Verification' : '⚡ Quick Verified'}
                           </span>
                           <span className="text-slate-500 dark:text-slate-400 text-sm">Consensus Engine v1.0</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <CircularReliability score={result.reliabilityScore} />
                      </div>
                    </div>

                    {/* AI Summary Section */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden">
                       <div className="px-5 py-3 bg-indigo-50/50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                          <h3 className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Quick AI Summary
                          </h3>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={handleCopySummary}
                              className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
                              title="Copy to clipboard"
                            >
                                {copied ? (
                                    <>
                                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        <span className="text-green-500">Copied</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                        <span>Copy</span>
                                    </>
                                )}
                            </button>
                            <div className="h-4 w-px bg-slate-300 dark:bg-slate-600"></div>
                            <button onClick={() => setShowSummary(!showSummary)} className="text-slate-400 hover:text-indigo-600 transition-colors text-sm font-medium">
                                {showSummary ? 'Hide' : 'Show'}
                            </button>
                          </div>
                       </div>
                       {showSummary && (
                         <div className="p-5">
                           <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{result.summary}</p>
                           <p className="mt-3 text-sm text-slate-500 italic border-l-2 border-slate-300 pl-3">{result.consensusNote}</p>
                         </div>
                       )}
                    </div>

                    {/* Main Content */}
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                         <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
                         Detailed Explanation
                      </h3>
                      <div className="prose dark:prose-invert max-w-none max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                        <MarkdownRenderer content={result.detailedExplanation} />
                      </div>
                    </div>

                    {/* Resource Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                      {/* Web Sources */}
                      <div className="bg-slate-50 dark:bg-slate-850 rounded-xl p-5 border border-slate-100 dark:border-slate-700">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                          Verified Sources
                        </h4>
                        <ul className="space-y-3">
                          {result.sources.length > 0 ? (
                            result.sources.map((source, idx) => (
                              <li key={idx} className="flex items-start gap-3 group">
                                <span className="text-slate-300 dark:text-slate-600 text-sm mt-0.5 font-mono">{idx + 1}.</span>
                                <div className="min-w-0">
                                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="block text-indigo-600 dark:text-indigo-400 font-medium hover:underline truncate text-sm">
                                    {source.title}
                                  </a>
                                  <span className="text-xs text-slate-400">{source.source}</span>
                                </div>
                              </li>
                            ))
                          ) : (
                            <li className="text-sm text-slate-400 italic">No direct web sources found.</li>
                          )}
                        </ul>
                      </div>

                      {/* Video Resources */}
                      <div className="bg-slate-50 dark:bg-slate-850 rounded-xl p-5 border border-slate-100 dark:border-slate-700">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                          Learn on YouTube
                        </h4>
                        <ul className="space-y-3">
                          {result.recommendedVideos.map((video, idx) => (
                            <li key={idx} className="group">
                              <a 
                                href={video.url || `https://www.youtube.com/results?search_query=${encodeURIComponent(video.query)}`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
                              >
                                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center text-red-600 dark:text-red-500 flex-shrink-0">
                                  ▶
                                </div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors line-clamp-2">
                                  {video.title}
                                </span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Notes */}
            <div className="w-full lg:w-[400px] flex-shrink-0 flex flex-col h-[600px] lg:h-full">
              <NotesPanel currentTopic={result ? searchedQuery : undefined} />
            </div>
            
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}