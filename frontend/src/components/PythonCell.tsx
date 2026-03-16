import { useState } from 'react';

interface PythonCellProps {
  pyodide: any;           // We use 'any' here because the Pyodide engine object is massive and complex
  initialCode: string;    // The code should always be text
  onDelete: () => void;   // This means onDelete is a function that returns nothing
  onChangeCode: (newCode: string) => void;
}

// We expect the parent (Workspace) to pass down the Pyodide engine and the code
export default function PythonCell({ pyodide, initialCode, onDelete, onChangeCode }: PythonCellProps) {
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
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden mt-4">
      {/* Cell Header */}
      <div className="flex justify-between items-center bg-gray-800 px-4 py-2">
        <span className="text-xs font-bold text-blue-400">🐍 Python Snippet</span>
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
        className="w-full bg-[#1e1e1e] text-green-400 p-3 font-mono text-sm focus:outline-none resize-y min-h-[100px]"
        spellCheck="false"
      />
      {output && (
        <div className="bg-black border-t border-gray-700 p-3 text-sm font-mono text-gray-300 whitespace-pre-wrap">
          {output}
        </div>
      )}
    </div>
  );
}