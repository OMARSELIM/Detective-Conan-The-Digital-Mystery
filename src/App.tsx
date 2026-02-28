/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  User, 
  FileText, 
  MapPin, 
  MessageSquare, 
  Brain, 
  ChevronRight, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Send,
  Info
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  generateNewCase, 
  chatWithSuspect, 
  evaluateDeduction, 
  type CaseDetails, 
  type Suspect, 
  type Clue 
} from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type GameState = 'LOBBY' | 'INVESTIGATING' | 'INTERROGATING' | 'DEDUCTION' | 'RESULT';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('LOBBY');
  const [currentCase, setCurrentCase] = useState<CaseDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSuspect, setSelectedSuspect] = useState<Suspect | null>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [inputText, setInputText] = useState('');
  const [discoveredClues, setDiscoveredClues] = useState<string[]>([]);
  const [deductionCulprit, setDeductionCulprit] = useState<string>('');
  const [deductionReasoning, setDeductionReasoning] = useState('');
  const [result, setResult] = useState<{ isCorrect: boolean; score: number; feedback: string; conanComment: string } | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const startNewCase = async (difficulty: string = 'Medium') => {
    setLoading(true);
    try {
      const newCase = await generateNewCase(difficulty);
      setCurrentCase(newCase);
      setDiscoveredClues([]);
      setGameState('INVESTIGATING');
    } catch (error) {
      console.error("Failed to start case:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedSuspect || !currentCase) return;

    const userMsg = inputText;
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const response = await chatWithSuspect(
        currentCase.case.description,
        selectedSuspect,
        userMsg,
        [] // History could be added here for better context
      );
      setMessages(prev => [...prev, { role: 'model', text: response || '...' }]);
    } catch (error) {
      console.error("Chat failed:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleDeduction = async () => {
    if (!currentCase || !deductionCulprit || !deductionReasoning) return;
    setLoading(true);
    try {
      const evalResult = await evaluateDeduction(currentCase, deductionCulprit, deductionReasoning);
      setResult(evalResult);
      setGameState('RESULT');
    } catch (error) {
      console.error("Deduction failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleClue = (clueId: string) => {
    setDiscoveredClues(prev => 
      prev.includes(clueId) ? prev.filter(id => id !== clueId) : [...prev, clueId]
    );
  };

  return (
    <div className="min-h-screen mystery-grid relative overflow-hidden flex flex-col">
      <div className="scanline" />
      
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-md p-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-conan-red rounded-lg flex items-center justify-center shadow-lg shadow-conan-red/20">
              <Brain className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold tracking-tight text-white">Detective Conan</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-conan-yellow font-mono font-bold">Digital Mystery System v2.5</p>
            </div>
          </div>
          
          {gameState !== 'LOBBY' && (
            <button 
              onClick={() => setGameState('LOBBY')}
              className="text-xs font-mono uppercase tracking-wider text-slate-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-3 h-3" /> Abort Case
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-6 relative">
        <AnimatePresence mode="wait">
          {gameState === 'LOBBY' && (
            <motion.div 
              key="lobby"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full flex flex-col items-center justify-center space-y-12 py-12"
            >
              <div className="text-center space-y-4 max-w-2xl">
                <h2 className="text-5xl font-serif italic text-white">"There is always only one truth!"</h2>
                <p className="text-slate-400 font-light leading-relaxed">
                  Step into the world of mystery. Analyze clues, interrogate suspects, and uncover the truth behind complex crimes using advanced AI reasoning.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                {[
                  { diff: 'Easy', color: 'text-emerald-400', desc: 'A straightforward case for beginners.' },
                  { diff: 'Medium', color: 'text-conan-yellow', desc: 'A challenging mystery with multiple layers.' },
                  { diff: 'Hard', color: 'text-conan-red', desc: 'A complex locked-room mystery for master detectives.' }
                ].map((level) => (
                  <button
                    key={level.diff}
                    disabled={loading}
                    onClick={() => startNewCase(level.diff)}
                    className="glass-panel p-8 text-left hover:bg-white/10 transition-all group relative overflow-hidden"
                  >
                    <div className={cn("text-xs font-mono uppercase tracking-widest mb-2", level.color)}>
                      {level.diff} Level
                    </div>
                    <h3 className="text-2xl font-serif text-white mb-4 group-hover:translate-x-1 transition-transform">
                      Start New Case
                    </h3>
                    <p className="text-sm text-slate-400 mb-6">{level.desc}</p>
                    <div className="flex items-center text-xs font-mono uppercase text-white/40 group-hover:text-white transition-colors">
                      Initialize System <ChevronRight className="w-3 h-3 ml-1" />
                    </div>
                    {loading && (
                      <div className="absolute inset-0 bg-slate-950/50 flex items-center justify-center backdrop-blur-sm">
                        <Loader2 className="w-8 h-8 animate-spin text-conan-yellow" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {gameState === 'INVESTIGATING' && currentCase && (
            <motion.div 
              key="investigating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row gap-8">
                {/* Case Info */}
                <div className="flex-1 space-y-6">
                  <div className="glass-panel p-8 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 bg-conan-red/20 text-conan-red text-[10px] font-mono font-bold uppercase tracking-widest rounded-full border border-conan-red/30">
                        Active Case
                      </span>
                      <div className="flex items-center gap-2 text-slate-400 font-mono text-xs">
                        <MapPin className="w-3 h-3" /> {currentCase.case.location}
                      </div>
                    </div>
                    <h2 className="text-4xl font-serif text-white">{currentCase.case.title}</h2>
                    <p className="text-slate-300 leading-relaxed italic">
                      {currentCase.case.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-panel p-6 space-y-4">
                      <h3 className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-conan-yellow">
                        <Search className="w-4 h-4" /> Evidence Board
                      </h3>
                      <div className="space-y-3">
                        {currentCase.clues.map((clue) => (
                          <button
                            key={clue.id}
                            onClick={() => toggleClue(clue.id)}
                            className={cn(
                              "w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 group",
                              discoveredClues.includes(clue.id) 
                                ? "bg-conan-blue/20 border-conan-blue/50 text-white" 
                                : "bg-white/5 border-white/10 text-slate-400 hover:border-white/30"
                            )}
                          >
                            <div className={cn(
                              "mt-1 p-1.5 rounded-lg",
                              discoveredClues.includes(clue.id) ? "bg-conan-blue text-white" : "bg-white/10 text-slate-500"
                            )}>
                              <FileText className="w-3 h-3" />
                            </div>
                            <div>
                              <div className="text-sm font-bold mb-1">{clue.name}</div>
                              {discoveredClues.includes(clue.id) && (
                                <p className="text-xs text-slate-400 leading-relaxed animate-in fade-in slide-in-from-top-1">
                                  {clue.description}
                                </p>
                              )}
                              {!discoveredClues.includes(clue.id) && (
                                <div className="text-[10px] uppercase tracking-wider opacity-50">Click to examine</div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="glass-panel p-6 space-y-4">
                      <h3 className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-conan-yellow">
                        <User className="w-4 h-4" /> Suspects
                      </h3>
                      <div className="space-y-3">
                        {currentCase.suspects.map((suspect) => (
                          <button
                            key={suspect.id}
                            onClick={() => {
                              setSelectedSuspect(suspect);
                              setMessages([]);
                              setGameState('INTERROGATING');
                            }}
                            className="w-full text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:border-conan-yellow/50 hover:bg-white/10 transition-all flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-conan-yellow group-hover:text-slate-950 transition-colors">
                                <User className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-white">{suspect.name}</div>
                                <div className="text-[10px] uppercase tracking-wider text-slate-500">{suspect.role}</div>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-conan-yellow transition-colors" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sidebar Actions */}
                <div className="md:w-72 space-y-6">
                  <div className="glass-panel p-6 space-y-6">
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Investigation Progress</h4>
                      <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-conan-yellow transition-all duration-500" 
                          style={{ width: `${(discoveredClues.length / currentCase.clues.length) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setGameState('DEDUCTION')}
                      className="w-full py-4 bg-conan-red hover:bg-conan-red/90 text-white rounded-xl font-bold text-sm shadow-lg shadow-conan-red/20 transition-all flex items-center justify-center gap-2 group"
                    >
                      <Brain className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      Make Deduction
                    </button>

                    <div className="p-4 rounded-xl bg-conan-blue/10 border border-conan-blue/20">
                      <div className="flex items-center gap-2 text-conan-blue mb-2">
                        <Info className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Detective's Tip</span>
                      </div>
                      <p className="text-xs text-slate-400 italic leading-relaxed">
                        "When you have eliminated the impossible, whatever remains, however improbable, must be the truth."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {gameState === 'INTERROGATING' && selectedSuspect && (
            <motion.div 
              key="interrogating"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-[calc(100vh-12rem)] flex flex-col gap-6"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setGameState('INVESTIGATING')}
                  className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Evidence
                </button>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">{selectedSuspect.name}</div>
                    <div className="text-[10px] uppercase tracking-wider text-conan-yellow">{selectedSuspect.role}</div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-conan-yellow flex items-center justify-center text-slate-950">
                    <User className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="flex-1 glass-panel flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                      <MessageSquare className="w-12 h-12" />
                      <p className="text-sm font-serif italic max-w-xs">
                        The suspect is waiting for your questions. Be precise, Detective.
                      </p>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex flex-col max-w-[80%]",
                        msg.role === 'user' ? "ml-auto items-end" : "items-start"
                      )}
                    >
                      <div className={cn(
                        "p-4 rounded-2xl text-sm leading-relaxed",
                        msg.role === 'user' 
                          ? "bg-conan-blue text-white rounded-tr-none" 
                          : "bg-white/10 text-slate-200 rounded-tl-none border border-white/10"
                      )}>
                        {msg.text}
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-widest mt-2 text-slate-500">
                        {msg.role === 'user' ? 'Conan' : selectedSuspect.name}
                      </span>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex items-center gap-2 text-slate-500 font-mono text-[10px] uppercase tracking-widest">
                      <Loader2 className="w-3 h-3 animate-spin" /> {selectedSuspect.name} is thinking...
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-4 bg-slate-900/50 border-t border-white/10">
                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder={`Ask ${selectedSuspect.name} something...`}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-conan-yellow/50 transition-colors"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputText.trim() || isTyping}
                      className="p-3 bg-conan-yellow text-slate-950 rounded-xl hover:bg-conan-yellow/90 disabled:opacity-50 disabled:hover:bg-conan-yellow transition-all"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {gameState === 'DEDUCTION' && currentCase && (
            <motion.div 
              key="deduction"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto space-y-8"
            >
              <div className="text-center space-y-4">
                <Brain className="w-12 h-12 text-conan-red mx-auto" />
                <h2 className="text-4xl font-serif text-white">The Deduction Showdown</h2>
                <p className="text-slate-400">Time to point out the culprit and present your reasoning.</p>
              </div>

              <div className="glass-panel p-8 space-y-8">
                <div className="space-y-4">
                  <label className="text-xs font-mono uppercase tracking-widest text-conan-yellow block">1. Select the Culprit</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentCase.suspects.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setDeductionCulprit(s.id)}
                        className={cn(
                          "p-4 rounded-xl border transition-all text-left flex items-center gap-3",
                          deductionCulprit === s.id 
                            ? "bg-conan-red/20 border-conan-red text-white" 
                            : "bg-white/5 border-white/10 text-slate-400 hover:border-white/30"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          deductionCulprit === s.id ? "bg-conan-red text-white" : "bg-white/10"
                        )}>
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold">{s.name}</div>
                          <div className="text-[10px] uppercase tracking-wider opacity-60">{s.role}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-mono uppercase tracking-widest text-conan-yellow block">2. Present Your Reasoning</label>
                  <textarea
                    value={deductionReasoning}
                    onChange={(e) => setDeductionReasoning(e.target.value)}
                    placeholder="Explain how they did it, their motive, and the key evidence that proves it..."
                    className="w-full h-48 bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-conan-red/50 transition-colors resize-none"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setGameState('INVESTIGATING')}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-sm transition-all"
                  >
                    Not Ready Yet
                  </button>
                  <button
                    onClick={handleDeduction}
                    disabled={!deductionCulprit || !deductionReasoning || loading}
                    className="flex-[2] py-4 bg-conan-red hover:bg-conan-red/90 text-white rounded-xl font-bold text-sm shadow-lg shadow-conan-red/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Solve the Case
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {gameState === 'RESULT' && result && currentCase && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto space-y-8 text-center"
            >
              <div className="space-y-6">
                {result.isCorrect ? (
                  <div className="space-y-4">
                    <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-500/30">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h2 className="text-5xl font-serif text-white">Case Solved!</h2>
                    <div className="text-conan-yellow font-mono text-2xl font-bold">Score: {result.score}/100</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-20 h-20 bg-conan-red/20 text-conan-red rounded-full flex items-center justify-center mx-auto border-4 border-conan-red/30">
                      <XCircle className="w-10 h-10" />
                    </div>
                    <h2 className="text-5xl font-serif text-white">The Truth Escaped...</h2>
                    <div className="text-slate-500 font-mono text-2xl font-bold">Score: {result.score}/100</div>
                  </div>
                )}
              </div>

              <div className="glass-panel p-8 space-y-6 text-left">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-mono uppercase tracking-widest text-conan-yellow">Feedback</h4>
                  <p className="text-slate-300 leading-relaxed">{result.feedback}</p>
                </div>

                <div className="p-6 rounded-2xl bg-conan-blue/20 border border-conan-blue/30 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Brain className="w-16 h-16" />
                  </div>
                  <h4 className="text-[10px] font-mono uppercase tracking-widest text-conan-blue mb-2">Conan's Comment</h4>
                  <p className="text-white font-serif italic text-lg leading-relaxed">
                    "{result.conanComment}"
                  </p>
                </div>

                <button
                  onClick={() => setGameState('LOBBY')}
                  className="w-full py-4 bg-white text-slate-950 hover:bg-slate-200 rounded-xl font-bold text-sm transition-all"
                >
                  Return to Agency
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer / Status Bar */}
      <footer className="border-t border-white/10 bg-slate-950/80 backdrop-blur-md p-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> System Online</span>
            <span className="hidden md:inline">Encrypted Connection Active</span>
          </div>
          <div>
            Detective ID: OMAR-SELM-2026
          </div>
        </div>
      </footer>
    </div>
  );
}
