import React from 'react';

interface EditorProps {
  code: string;
  onChange: (value: string) => void;
  error?: string | null;
}

export const Editor: React.FC<EditorProps> = ({ code, onChange, error }) => {
  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Editor</span>
        <div className="flex gap-2">
           <span className="text-xs text-slate-500">Mermaid Syntax</span>
        </div>
      </div>
      <div className="relative flex-1">
        <textarea
          className="absolute inset-0 w-full h-full p-4 bg-slate-900 text-sm font-mono leading-relaxed resize-none focus:outline-none custom-scrollbar text-slate-200"
          value={code}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          placeholder="Enter Mermaid code here..."
        />
      </div>
      {error && (
        <div className="px-4 py-3 bg-red-900/20 border-t border-red-900/50 text-red-400 text-xs font-mono break-all">
          <span className="font-bold">Error:</span> {error}
        </div>
      )}
    </div>
  );
};
