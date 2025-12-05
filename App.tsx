import React, { useState, useEffect, useCallback, useRef } from 'react';
import { INITIAL_CODE, TEMPLATES } from './constants';
import { Editor } from './components/Editor';
import { Preview } from './components/Preview';
import { Button } from './components/Button';
import { generateMermaidCode, explainDiagram, analyzeDiagram, sendPlanningChat } from './services/geminiService';
import { Template, DiagramFile, AnalysisResult, ChatMessage } from './types';
import { 
  LayoutTemplate, 
  Download, 
  Code,
  Sparkles,
  MessageSquareQuote,
  BrainCircuit,
  FileText,
  Plus,
  Trash2,
  Settings,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Send,
  X
} from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  // File Management
  const [files, setFiles] = useState<DiagramFile[]>([
    { id: '1', name: 'Main Flow', code: INITIAL_CODE, type: 'macro', updatedAt: Date.now() }
  ]);
  const [activeFileId, setActiveFileId] = useState<string>('1');
  
  // AI & Generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [useThinkingMode, setUseThinkingMode] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Project Context & Settings
  const [projectContext, setProjectContext] = useState("VelPRO is a Construction Management software linking to Xero.");
  const [showSettings, setShowSettings] = useState(false);

  // Live Analysis
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Planning Chat
  const [showPlanner, setShowPlanner] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatSending, setIsChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // UI State
  const [showTemplates, setShowTemplates] = useState(false);

  // --- Computed ---
  const activeFile = files.find(f => f.id === activeFileId) || files[0];

  // --- Effects ---
  
  // Persist/Load Chat History
  useEffect(() => {
    const savedChat = localStorage.getItem('velpro_planner_chat');
    if (savedChat) {
      try {
        setChatHistory(JSON.parse(savedChat));
      } catch (e) { console.error("Failed to load chat history", e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('velpro_planner_chat', JSON.stringify(chatHistory));
    // Scroll to bottom of chat
    if (showPlanner) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, showPlanner]);

  // Debounced analysis effect
  const triggerAnalysis = useCallback(async (codeToAnalyze: string) => {
    if (!codeToAnalyze.trim()) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeDiagram(codeToAnalyze, projectContext);
      setAnalysis(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  }, [projectContext]);

  useEffect(() => {
    const timer = setTimeout(() => {
      triggerAnalysis(activeFile.code);
    }, 2000); 
    return () => clearTimeout(timer);
  }, [activeFile.code, triggerAnalysis]);


  // --- Handlers ---

  const handleCodeChange = (newCode: string) => {
    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, code: newCode, updatedAt: Date.now() } : f));
    setError(null);
  };

  const handleAddFile = (type: 'macro' | 'micro') => {
    const newFile: DiagramFile = {
      id: Date.now().toString(),
      name: type === 'macro' ? 'New Macro Flow' : 'New Micro Flow',
      code: 'graph TD\n    A[Start] --> B[End]',
      type,
      updatedAt: Date.now()
    };
    setFiles([...files, newFile]);
    setActiveFileId(newFile.id);
  };

  const handleDeleteFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (files.length === 1) return; 
    const newFiles = files.filter(f => f.id !== id);
    setFiles(newFiles);
    if (activeFileId === id) {
      setActiveFileId(newFiles[0].id);
    }
  };

  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    try {
      const otherFiles = files.filter(f => f.id !== activeFileId);
      const generatedCode = await generateMermaidCode(
        aiPrompt, 
        activeFile.code, 
        useThinkingMode, 
        projectContext,
        otherFiles
      );
      handleCodeChange(generatedCode);
      setAiPrompt("");
      triggerAnalysis(generatedCode);
    } catch (err) {
      setError("Failed to generate diagram. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExplain = async () => {
    if(!activeFile.code) return;
    setIsExplaining(true);
    setExplanation(null);
    try {
      const result = await explainDiagram(activeFile.code, useThinkingMode);
      setExplanation(result);
    } catch (err) {
      setExplanation("Failed to explain diagram.");
    } finally {
      setIsExplaining(false);
    }
  };

  const handleChatSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        text: chatInput,
        timestamp: Date.now()
    };

    setChatHistory(prev => [...prev, userMsg]);
    setChatInput("");
    setIsChatSending(true);

    try {
        const responseText = await sendPlanningChat(chatInput, chatHistory, projectContext, files);
        
        const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: responseText,
            timestamp: Date.now()
        };
        setChatHistory(prev => [...prev, aiMsg]);
    } catch (err) {
        console.error("Chat Error", err);
        const errorMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: "I encountered an error while thinking. Please try again.",
            timestamp: Date.now()
        };
        setChatHistory(prev => [...prev, errorMsg]);
    } finally {
        setIsChatSending(false);
    }
  };

  const handleClearChat = () => {
      setChatHistory([]);
      localStorage.removeItem('velpro_planner_chat');
  };

  const loadTemplate = (template: Template) => {
    handleCodeChange(template.code);
    setShowTemplates(false);
  };

  const handleDownload = (format: 'svg' | 'png') => {
    const svgElement = document.querySelector('.mermaid-output svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      if (format === 'png') {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const pngUrl = canvas.toDataURL('image/png');
        downloadUrl(pngUrl, `${activeFile.name.replace(/\s+/g, '_')}.png`);
      } else {
        downloadUrl(url, `${activeFile.name.replace(/\s+/g, '_')}.svg`);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const downloadUrl = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0 z-20 shadow-sm relative">
        <div className="flex items-center gap-3">
          <div className="bg-velpro-600 p-1.5 rounded-lg">
            <Code className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 tracking-tight">VelPRO Architect</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowSettings(!showSettings)}
            className={showSettings ? "bg-slate-100 text-velpro-600" : ""}
            icon={<Settings size={14} />}
           >
             Context
           </Button>

           <Button 
            variant={showPlanner ? 'primary' : 'secondary'}
            size="sm" 
            onClick={() => setShowPlanner(!showPlanner)}
            className={showPlanner ? "bg-indigo-600 hover:bg-indigo-700" : ""}
            icon={<MessageSquare size={14} />}
           >
             Planner
           </Button>

           <div className="h-4 w-px bg-slate-200 mx-1"></div>
           <Button variant="secondary" size="sm" onClick={() => handleDownload('svg')} icon={<Download size={14} />}>
             SVG
           </Button>
           <Button variant="primary" size="sm" onClick={() => handleDownload('png')} icon={<Download size={14} />}>
             PNG
           </Button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: File Explorer */}
        <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-slate-100/50">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Flows</span>
            <div className="flex gap-1">
               <button onClick={() => handleAddFile('macro')} className="p-1 hover:bg-slate-200 rounded text-slate-600" title="Add Macro Flow"><Plus size={14} /></button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {files.map(file => (
              <div 
                key={file.id}
                onClick={() => setActiveFileId(file.id)}
                className={`group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors ${
                  activeFileId === file.id 
                    ? 'bg-white border border-velpro-200 shadow-sm text-velpro-700' 
                    : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText size={14} className={file.type === 'macro' ? 'text-blue-500' : 'text-slate-400'} />
                  <span className="text-sm font-medium truncate">
                    {file.name}
                  </span>
                </div>
                {files.length > 1 && (
                  <button 
                    onClick={(e) => handleDeleteFile(file.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 hover:text-red-600 rounded"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-slate-200 bg-slate-50">
             <Button variant="secondary" size="sm" className="w-full justify-start text-xs" onClick={() => setShowTemplates(true)} icon={<LayoutTemplate size={12}/>}>
                Browse Templates
             </Button>
          </div>
        </aside>

        {/* Templates Drawer */}
        {showTemplates && (
          <div className="absolute top-14 bottom-0 left-0 w-64 bg-white border-r border-slate-200 z-30 shadow-xl flex flex-col animate-in slide-in-from-left-full duration-200">
            <div className="p-3 border-b border-slate-200 flex justify-between items-center">
               <h3 className="font-medium text-sm">Templates</h3>
               <button onClick={() => setShowTemplates(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <div className="overflow-y-auto p-2 space-y-2 flex-1 custom-scrollbar">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => loadTemplate(t)}
                    className="w-full text-left p-2 rounded border border-slate-100 hover:border-velpro-200 hover:bg-velpro-50 transition-all"
                  >
                    <div className="text-xs font-medium text-slate-800">{t.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{t.description}</div>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Middle: Editor & Prompt */}
        <div className="flex-1 flex flex-col min-w-[350px] border-r border-slate-200 relative">
            {/* Project Context Overlay */}
            {showSettings && (
                <div className="absolute inset-0 bg-slate-900/50 z-40 backdrop-blur-sm flex items-start justify-center pt-20">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                                <Settings size={18} className="text-slate-500"/>
                                Project Context (System Prompt)
                            </h2>
                            <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">×</button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-500 mb-3">
                                Prime the AI with details about your project. This context is sent with every generation request to ensure consistency across flows.
                            </p>
                            <textarea
                                value={projectContext}
                                onChange={(e) => setProjectContext(e.target.value)}
                                className="w-full h-40 p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-velpro-500 focus:border-velpro-500 text-sm leading-relaxed resize-none"
                                placeholder="E.g. We are building an e-commerce platform..."
                            />
                            <div className="mt-4 flex justify-end">
                                <Button onClick={() => setShowSettings(false)}>Save Context</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between bg-slate-800 px-4 py-2 border-b border-slate-700">
                <input 
                    value={activeFile.name}
                    onChange={(e) => setFiles(files.map(f => f.id === activeFileId ? {...f, name: e.target.value} : f))}
                    className="bg-transparent text-slate-200 text-sm font-medium focus:outline-none focus:border-b border-velpro-500 px-1"
                />
                <span className="text-xs text-slate-500 font-mono">Mermaid Editor</span>
            </div>

            <div className="flex-1 relative">
                <Editor 
                    code={activeFile.code} 
                    onChange={handleCodeChange} 
                    error={error} 
                />
            </div>
          
            {/* AI Prompt Area (Builder) */}
            <div className="bg-slate-900 p-4 border-t border-slate-800">
                <form onSubmit={handleAiGenerate} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-400 flex items-center gap-2">
                    <Sparkles size={12} className="text-velpro-400" />
                    Builder Assistant {files.length > 1 && <span className="text-slate-600 text-[10px] ml-1">(Aware of {files.length - 1} other flows)</span>}
                    </label>
                    
                    <button
                        type="button"
                        onClick={() => setUseThinkingMode(!useThinkingMode)}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all border ${
                            useThinkingMode 
                                ? 'bg-purple-900/40 border-purple-500 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.2)]' 
                                : 'bg-slate-800 border-slate-600 text-slate-500 hover:text-slate-400'
                        }`}
                    >
                        <BrainCircuit size={12} className={useThinkingMode ? "text-purple-400" : "text-slate-600"} />
                        <span>Thinking Mode</span>
                    </button>
                </div>
                
                <div className="relative">
                    <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiGenerate(e); }}}
                    placeholder={useThinkingMode ? "Describe complex logic. AI will reason about all project files..." : "Describe changes... (Enter to submit)"}
                    className={`w-full bg-slate-950 border rounded-md p-3 text-sm text-slate-300 placeholder-slate-600 focus:outline-none resize-none h-20 custom-scrollbar transition-colors ${
                        useThinkingMode 
                            ? 'border-purple-500/30 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20' 
                            : 'border-slate-800 focus:border-velpro-600 focus:ring-1 focus:ring-velpro-600/20'
                    }`}
                    />
                    <div className="absolute bottom-2 right-2 flex items-center gap-2">
                         {activeFile.code && (
                             <button type="button" onClick={handleExplain} className="text-[10px] text-slate-500 hover:text-slate-300" disabled={isExplaining}>
                                 {isExplaining ? "..." : "Explain"}
                             </button>
                         )}
                         <Button 
                            type="submit" 
                            variant="primary"
                            size="sm" 
                            isLoading={isGenerating}
                            disabled={!aiPrompt.trim()}
                            className={`!py-1 !px-2 !text-xs !h-7 ${useThinkingMode ? '!bg-purple-700 hover:!bg-purple-800' : ''}`}
                        >
                            Generate
                        </Button>
                    </div>
                </div>
                </form>
            </div>
        </div>

        {/* Right: Preview & Insights */}
        <div className={`flex flex-col min-w-[350px] bg-slate-50 border-l border-slate-200 transition-all duration-300 ${showPlanner ? 'w-[30%]' : 'w-[45%]'}`}>
          <div className="flex-1 relative border-b border-slate-200">
            <Preview 
              code={activeFile.code} 
              onError={(err) => setError(err)} 
              onSuccess={() => setError(null)} 
            />
             {explanation && (
                <div className="absolute top-10 right-4 left-4 z-20 bg-white/95 backdrop-blur shadow-xl border border-slate-200 rounded-lg p-4 animate-in slide-in-from-top-2">
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                             <MessageSquareQuote size={16} className="text-velpro-600"/> 
                             Explanation
                        </h4>
                        <button onClick={() => setExplanation(null)} className="text-slate-400 hover:text-slate-600">×</button>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed max-h-60 overflow-y-auto custom-scrollbar">
                        {explanation}
                    </p>
                </div>
            )}
          </div>
          
          {/* AI Insights Panel (Live Analysis) */}
          <div className="h-48 bg-white flex flex-col shrink-0">
             <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                    <Lightbulb size={12} className={analysis?.suggestions.length ? "text-yellow-500" : "text-slate-400"} />
                    Live Insights
                </h3>
                {isAnalyzing && <span className="text-[10px] text-slate-400 animate-pulse">Analyzing...</span>}
             </div>
             <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {!analysis && !isAnalyzing && (
                    <div className="text-xs text-slate-400 italic text-center mt-4">Start typing to see AI suggestions...</div>
                )}
                
                {analysis && (
                    <div className="space-y-3">
                        {analysis.logicGaps.length > 0 && (
                            <div className="space-y-1">
                                {analysis.logicGaps.map((gap, i) => (
                                    <div key={i} className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-100">
                                        <AlertTriangle size={12} className="mt-0.5 shrink-0"/>
                                        <span>{gap}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {analysis.suggestions.map((suggestion, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                                <span className="text-velpro-500 font-bold">•</span>
                                <span>{suggestion}</span>
                            </div>
                        ))}
                        {analysis.syntaxValid && analysis.suggestions.length === 0 && analysis.logicGaps.length === 0 && (
                             <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 p-2 rounded border border-green-100">
                                <CheckCircle2 size={12} />
                                <span>Diagram looks logical and valid.</span>
                            </div>
                        )}
                    </div>
                )}
             </div>
          </div>
        </div>

        {/* Planner Chat Drawer (New Panel) */}
        {showPlanner && (
            <div className="w-[400px] border-l border-slate-200 bg-white flex flex-col shadow-2xl z-30 animate-in slide-in-from-right duration-300">
                <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4 bg-indigo-50">
                    <div className="flex items-center gap-2">
                        <div className="bg-indigo-600 text-white p-1 rounded">
                            <BrainCircuit size={16} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm">Strategic Planner</h3>
                            <p className="text-[10px] text-indigo-700 font-medium">Gemini 3.0 Pro • Thinking Mode</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={handleClearChat} className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-red-50" title="Clear History">
                            <Trash2 size={14} />
                        </button>
                        <button onClick={() => setShowPlanner(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 custom-scrollbar">
                    {chatHistory.length === 0 && (
                        <div className="text-center mt-10 p-4">
                            <div className="w-12 h-12 bg-indigo-100 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                <MessageSquare size={24} />
                            </div>
                            <p className="text-sm text-slate-600 font-medium">No messages yet</p>
                            <p className="text-xs text-slate-400 mt-1">Discuss macro-architecture, flow consistency, or planning strategies.</p>
                        </div>
                    )}
                    
                    {chatHistory.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div 
                                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                                    msg.role === 'user' 
                                        ? 'bg-indigo-600 text-white rounded-br-none' 
                                        : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
                                }`}
                            >
                                <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                                <div className={`text-[10px] mt-1.5 opacity-70 ${msg.role === 'user' ? 'text-indigo-100' : 'text-slate-400'}`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isChatSending && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                                <div className="flex space-x-1.5">
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div className="p-3 border-t border-slate-200 bg-white">
                    <form onSubmit={handleChatSend} className="relative">
                        <textarea
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(e); }}}
                            placeholder="Ask about architecture or planning..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none custom-scrollbar"
                            rows={1}
                            style={{minHeight: '44px', maxHeight: '120px'}}
                        />
                        <button 
                            type="submit"
                            disabled={!chatInput.trim() || isChatSending}
                            className="absolute right-2 bottom-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                        >
                            <Send size={14} />
                        </button>
                    </form>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default App;
