import { useState } from 'react';

interface PythonCellProps {
  pyodide: any;           // We use 'any' here because the Pyodide engine object is massive and complex
  initialCode: string;    // The code should always be text
  isDarkMode: boolean;
  onDelete: () => void;   // This means onDelete is a function that returns nothing
  onChangeCode: (newCode: string) => void;
}

// We expect the parent (Workspace) to pass down the Pyodide engine and the code
export default function PythonCell({ pyodide, initialCode, isDarkMode, onDelete, onChangeCode }: PythonCellProps) {
  const [code, setCode] = useState(initialCode || '');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const runCode = async () => {
    if (!pyodide) return;
    setIsRunning(true);
    setOutput('');

    try {
      // Redirect print statements to our variable
      await pyodide.runPythonAsync(`
import sys
import io
sys.stdout = io.StringIO()
      `);
      await pyodide.runPythonAsync(code);
      const result = pyodide.runPython("sys.stdout.getvalue()");
      setOutput(result);
    } catch (err: any) {
      setOutput(err.toString());
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div
      className={`rounded-lg overflow-hidden mt-4 border ${
        isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-slate-50 border-slate-200'
      }`}
    >
      {/* Cell Header */}
      <div className={`flex justify-between items-center px-4 py-2 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <span className="text-xs font-bold text-primary">Python Snippet</span>
        <div className="flex gap-2">
          <button 
            onClick={runCode}
            disabled={!pyodide || isRunning}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-xs font-bold"
          >
            {isRunning ? 'Running...' : 'Run'}
          </button>
          <button onClick={onDelete} className="text-red-400 hover:text-red-300 text-xs px-2">
            Remove
          </button>
        </div>
      </div>
      
      {/* Editor & Output */}
      <textarea
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          onChangeCode(e.target.value);
        }}
        className={`w-full p-3 font-mono text-sm focus:outline-none resize-y min-h-[100px] ${
          isDarkMode ? 'bg-[#1e1e1e] text-green-400' : 'bg-white text-slate-800'
        }`}
        spellCheck="false"
      />
      {output && (
        <div
          className={`border-t p-3 text-sm font-mono whitespace-pre-wrap ${
            isDarkMode
              ? 'bg-black border-gray-700 text-gray-300'
              : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}
        >
          {output}
        </div>
      )}
    </div>
  );
}