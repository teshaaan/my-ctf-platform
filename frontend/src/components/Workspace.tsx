import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MDEditor from '@uiw/react-md-editor';
import { useAuth } from '../context/AuthContext';
// import toast from 'react-hot-toast'; // Uncomment if you are using react-hot-toast
import PythonCell from './PythonCell';

const NOTEBOOK_TIME_CACHE_KEY = 'labNotebookLocalUpdatedAt';

export default function Workspace() {
  const { notebookId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [note, setNote] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(
    document.documentElement.classList.contains('dark')
  );

  // Python Engine State
  const [pyodide, setPyodide] = useState<any>(null);
  const [snippets, setSnippets] = useState<{id: number, code: string}[]>([]);

  const getNotebookTimeCache = () => {
    try {
      const raw = localStorage.getItem(NOTEBOOK_TIME_CACHE_KEY);
      if (!raw) return {} as Record<string, number>;
      const parsed = JSON.parse(raw) as Record<string, number>;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {} as Record<string, number>;
    }
  };

  const setNotebookLocalUpdatedAt = (id: number, epochMs: number) => {
    const cache = getNotebookTimeCache();
    cache[String(id)] = epochMs;
    localStorage.setItem(NOTEBOOK_TIME_CACHE_KEY, JSON.stringify(cache));
  };

  const parseApiDate = (value: string | null | undefined) => {
    if (!value) return NaN;
    const parsed = new Date(value).getTime();
    if (Number.isFinite(parsed)) return parsed;
    const normalized = value.includes(' ') ? value.replace(' ', 'T') : value;
    return new Date(normalized).getTime();
  };

  // 1. Fetch the existing note when the page loads
  useEffect(() => {
    const fetchNote = async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/lab/notebooks/${notebookId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success && data.notebook) {
          setTitle(data.notebook.title || 'Untitled Notebook');
          setQuestion(data.notebook.question || '');
          setNote(data.notebook.content || '');
          const cache = getNotebookTimeCache();
          const notebookIdKey = String(notebookId || '');
          const localUpdatedAt = Number(cache[notebookIdKey]);
          const apiUpdatedAt = parseApiDate(data.notebook.updated_at);

          if (Number.isFinite(localUpdatedAt) && (!Number.isFinite(apiUpdatedAt) || localUpdatedAt >= apiUpdatedAt)) {
            setLastSaved(
              new Date(localUpdatedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })
            );
          } else if (Number.isFinite(apiUpdatedAt)) {
            setLastSaved(
              new Date(apiUpdatedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })
            );
          }
          // Note: Later, you can also fetch saved Python snippets here!
          if (data.notebook.python_snippets) {
            setSnippets(data.notebook.python_snippets);
          }
        }
      } catch (error) {
        console.error("Failed to load notes", error);
      }
    };

    if (token && notebookId) {
      fetchNote();
    }
  }, [notebookId, token]);

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setIsDarkMode(root.classList.contains('dark'));
    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  // 2. Load the Pyodide Engine Globally (Runs once on mount)
  useEffect(() => {
    const loadEngine = async () => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
      script.async = true;
      script.onload = async () => {
        // @ts-ignore - Pyodide attaches itself to the window object
        const py = await window.loadPyodide();
        setPyodide(py);
      };
      document.body.appendChild(script);
    };
    loadEngine();
  }, []);

  // 3. Auto-Save Logic for Markdown
  useEffect(() => {
    if (!note) return;
    const delayDebounceFn = setTimeout(() => {
        handleSave();
    }, 2000);
    return () => clearTimeout(delayDebounceFn);
  }, [note]);

  // 4. Function to save the note to the database
  const handleSave = async () => {
    if (!notebookId) return;

    setIsSaving(true);
    try {
      const response = await fetch(`http://localhost:3001/api/lab/notebooks/${notebookId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        // Later, you can include JSON.stringify({ content: note, python_snippets: snippets })
        body: JSON.stringify({ content: note, python_snippets: snippets }) 
      });
      
      const data = await response.json();
      if (data.success && data.notebook) {
        // toast.success("Notes saved!");
        const now = Date.now();
        setLastSaved(
          new Date(now).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
        if (notebookId) {
          const numericNotebookId = Number(notebookId);
          if (Number.isFinite(numericNotebookId)) {
            setNotebookLocalUpdatedAt(numericNotebookId, now);
          }
        }
      }
    } catch (error) {
      console.error("Failed to save", error);
      // toast.error("Failed to save notes");
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Python Snippet Handlers
  const addSnippet = () => {
    const newSnippet = { id: Date.now(), code: '# Write your code here...' };
    setSnippets([...snippets, newSnippet]);
  };

  const removeSnippet = (idToRemove: number) => {
    setSnippets(snippets.filter(snippet => snippet.id !== idToRemove));
  };

  const updateSnippetCode = (idToUpdate: number, newCode: string) => {
    setSnippets(snippets.map(snippet => 
      snippet.id === idToUpdate ? { ...snippet, code: newCode } : snippet
    ));
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-white flex flex-col p-4 transition-colors duration-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => navigate('/lab')} className="text-primary hover:opacity-90 transition-opacity">
          &larr; Back to Laboratory
        </button>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {lastSaved ? `Last saved: ${lastSaved}` : 'Not saved yet'}
          </span>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary hover:opacity-90 px-4 py-2 rounded text-white font-bold disabled:opacity-50 transition-opacity"
          >
            {isSaving ? 'Saving...' : 'Save Notes'}
          </button>
        </div>
      </div>

      {/* The Split Screen Layout using Tailwind Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-grow">
        
        {/* LEFT SIDE: Challenge Details & Python Engine */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 overflow-y-auto flex flex-col gap-6">
          
          {/* Top of Left Side: Notebook Details */}
          <div>
            <h2 className="text-2xl font-bold mb-2">{title || 'Notebook'}</h2>
            <p className="mt-4 text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
              {question || 'No question added for this notebook.'}
            </p>
          </div>

          {/* Bottom of Left Side: The Interactive Python Area */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Interactive Scripts</h3>
              <button 
                onClick={addSnippet}
                className="bg-primary hover:opacity-90 text-white px-3 py-1 rounded text-sm font-bold transition-opacity"
              >
                + Add Python Environment
              </button>
            </div>

            {!pyodide && (
              <p className="text-yellow-400 text-sm animate-pulse">
                Loading Python Engine in background...
              </p>
            )}

            {/* Render the Python Cells */}
            <div className="flex flex-col gap-4">
              {snippets.map((snippet) => (
                <PythonCell 
                  key={snippet.id} 
                  pyodide={pyodide} 
                  initialCode={snippet.code}
                  isDarkMode={isDarkMode}
                  onDelete={() => removeSnippet(snippet.id)}
                  onChangeCode={(newCode) => updateSnippetCode(snippet.id, newCode)}
                />
              ))}
            </div>
          </div>
          
        </div>

        {/* RIGHT SIDE: The Markdown Editor */}
        <div
          className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col"
          data-color-mode={isDarkMode ? 'dark' : 'light'}
        >
          <MDEditor
            value={note}
            onChange={(val) => setNote(val || '')}
            height="100%"
            className="flex-grow border-none"
            preview="live"
          />
        </div>

      </div>
    </div>
  );
}