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
  Info,
  History,
  Trash2
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
type Language = 'en' | 'ar';

const translations = {
  en: {
    title: "Detective Conan",
    subtitle: "Digital Mystery System v2.5",
    abort: "Abort Case",
    quote: "\"There is always only one truth!\"",
    lobbyDesc: "Step into the world of mystery. Analyze clues, interrogate suspects, and uncover the truth behind complex crimes using advanced AI reasoning.",
    startCase: "Start New Case",
    initSystem: "Initialize System",
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
    easyDesc: "A straightforward case for beginners.",
    mediumDesc: "A challenging mystery with multiple layers.",
    hardDesc: "A complex locked-room mystery for master detectives.",
    activeCase: "Active Case",
    evidenceBoard: "Evidence Board",
    suspects: "Suspects",
    examine: "Click to examine",
    progress: "Investigation Progress",
    makeDeduction: "Make Deduction",
    tipTitle: "Detective's Tip",
    tipDesc: "\"When you have eliminated the impossible, whatever remains, however improbable, must be the truth.\"",
    backToEvidence: "Back to Evidence",
    waiting: "The suspect is waiting for your questions. Be precise, Detective.",
    thinking: "is thinking...",
    askSomething: "Ask something...",
    deductionTitle: "The Deduction Showdown",
    deductionDesc: "Time to point out the culprit and present your reasoning.",
    selectCulprit: "1. Select the Culprit",
    presentReasoning: "2. Present Your Reasoning",
    reasoningPlaceholder: "Explain how they did it, their motive, and the key evidence that proves it...",
    notReady: "Not Ready Yet",
    solveCase: "Solve the Case",
    caseSolved: "Case Solved!",
    truthEscaped: "The Truth Escaped...",
    score: "Score",
    feedback: "Feedback",
    conanComment: "Conan's Comment",
    returnToAgency: "Return to Agency",
    systemOnline: "System Online",
    encrypted: "Encrypted Connection Active",
    detectiveId: "Detective ID",
    caseArchive: "Case Archive",
    resumeCase: "Resume Case",
    noPastCases: "No past cases found. Start your first investigation!",
    deleteCase: "Delete",
  },
  ar: {
    title: "المحقق كونان - النسخة المصرية",
    subtitle: "نظام الألغاز الرقمي v2.5 - فرع القاهرة",
    abort: "إلغاء القضية",
    quote: "\"الحقيقة مبيستخباش عليها غربال!\"",
    lobbyDesc: "ادخل عالم الغموض في شوارع مصر. حلل الأدلة، استجوب المشتبه بهم، واكشف الحقيقة وراء الجرائم المعقدة بذكاء المحقق المصري الأصيل.",
    startCase: "ابدأ قضية جديدة",
    initSystem: "تجهيز النظام",
    easy: "سهل (يا هادي)",
    medium: "متوسط (محتاج تركيز)",
    hard: "صعب (للمحترفين بس)",
    easyDesc: "قضية بسيطة للمبتدئين في التحقيق.",
    mediumDesc: "لغز محتاج دماغ شغالة وتفكير عميق.",
    hardDesc: "لغز غرفة مغلقة معقد للمحققين اللي مبيفوتهمش الهوا.",
    activeCase: "قضية شغالة",
    evidenceBoard: "لوحة الأدلة",
    suspects: "المشتبه فيهم",
    examine: "دوس عشان تفحص",
    progress: "تقدم التحقيق",
    makeDeduction: "قول استنتاجك",
    tipTitle: "نصيحة المحقق",
    tipDesc: "\"لما تستبعد المستحيل، اللي يفضل مهما كان غريب، هو ده الحقيقة يا دكتور!\"",
    backToEvidence: "ارجع للأدلة",
    waiting: "المشتبه فيه مستني أسئلتك. ركز في كل كلمة بيقولها.",
    thinking: "بيفكر...",
    askSomething: "اسأل أي حاجة...",
    deductionTitle: "ساعة الحساب",
    deductionDesc: "جه الوقت تقول مين الجاني وتشرح عملها إزاي.",
    selectCulprit: "1. اختار الجاني",
    presentReasoning: "2. قول استنتاجك",
    reasoningPlaceholder: "اشرح عملها إزاي، إيه الدافع، وإيه الدليل اللي قفشه...",
    notReady: "لسه شوية",
    solveCase: "حل اللغز",
    caseSolved: "مبروك! حليت القضية",
    truthEscaped: "للأسف الحقيقة هربت منك...",
    score: "النتيجة",
    feedback: "التقييم",
    conanComment: "كلمة كونان",
    returnToAgency: "ارجع للوكالة",
    systemOnline: "النظام شغال",
    encrypted: "اتصال مشفر وآمن",
    detectiveId: "رقم المحقق",
    caseArchive: "أرشيف القضايا",
    resumeCase: "كمل التحقيق",
    noPastCases: "مفيش قضايا قديمة. ابدأ أول مغامرة ليك!",
    deleteCase: "مسح",
  }
};

export default function App() {
  const [language, setLanguage] = useState<Language>('ar');
  const t = translations[language];
  const isRtl = language === 'ar';

  const [gameState, setGameState] = useState<GameState>('LOBBY');
  const [currentCase, setCurrentCase] = useState<CaseDetails | null>(null);
  const [pastCases, setPastCases] = useState<CaseDetails[]>([]);
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
    const saved = localStorage.getItem('conan_cases');
    if (saved) {
      try {
        setPastCases(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load cases", e);
      }
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const startNewCase = async (difficulty: string = 'Medium') => {
    setLoading(true);
    try {
      const newCase = await generateNewCase(difficulty, language);
      setCurrentCase(newCase);
      setDiscoveredClues([]);
      setGameState('INVESTIGATING');
      
      // Save to history
      const updated = [newCase, ...pastCases].slice(0, 10); // Keep last 10
      setPastCases(updated);
      localStorage.setItem('conan_cases', JSON.stringify(updated));
    } catch (error) {
      console.error("Failed to start case:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPastCase = (caseData: CaseDetails) => {
    setCurrentCase(caseData);
    setDiscoveredClues([]);
    setGameState('INVESTIGATING');
  };

  const deletePastCase = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = pastCases.filter(c => c.case.title !== id); // Using title as pseudo-ID for now
    setPastCases(updated);
    localStorage.setItem('conan_cases', JSON.stringify(updated));
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
        [], // History could be added here for better context
        language
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
      const evalResult = await evaluateDeduction(currentCase, deductionCulprit, deductionReasoning, language);
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
    <div className={cn("min-h-screen mystery-grid relative overflow-hidden flex flex-col", isRtl && "rtl")} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="scanline" />
      
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-md p-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-conan-red rounded-lg flex items-center justify-center shadow-lg shadow-conan-red/20">
              <Brain className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold tracking-tight text-white">{t.title}</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-conan-yellow font-mono font-bold">{t.subtitle}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
              <button 
                onClick={() => setLanguage('en')}
                className={cn("px-3 py-1 text-[10px] font-mono uppercase rounded-md transition-all", language === 'en' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300")}
              >
                EN
              </button>
              <button 
                onClick={() => setLanguage('ar')}
                className={cn("px-3 py-1 text-[10px] font-mono uppercase rounded-md transition-all", language === 'ar' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300")}
              >
                AR
              </button>
            </div>

            {gameState !== 'LOBBY' && (
              <button 
                onClick={() => setGameState('LOBBY')}
                className="text-xs font-mono uppercase tracking-wider text-slate-400 hover:text-white transition-colors flex items-center gap-2"
              >
                <ArrowLeft className={cn("w-3 h-3", isRtl && "rotate-180")} /> {t.abort}
              </button>
            )}
          </div>
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
                <h2 className="text-5xl font-serif italic text-white">{t.quote}</h2>
                <p className="text-slate-400 font-light leading-relaxed">
                  {t.lobbyDesc}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                {[
                  { id: 'Easy', diff: t.easy, color: 'text-emerald-400', desc: t.easyDesc },
                  { id: 'Medium', diff: t.medium, color: 'text-conan-yellow', desc: t.mediumDesc },
                  { id: 'Hard', diff: t.hard, color: 'text-conan-red', desc: t.hardDesc }
                ].map((level) => (
                  <button
                    key={level.id}
                    disabled={loading}
                    onClick={() => startNewCase(level.id)}
                    className="glass-panel p-8 text-left hover:bg-white/10 transition-all group relative overflow-hidden"
                  >
                    <div className={cn("text-xs font-mono uppercase tracking-widest mb-2", level.color)}>
                      {level.diff}
                    </div>
                    <h3 className="text-2xl font-serif text-white mb-4 group-hover:translate-x-1 transition-transform">
                      {t.startCase}
                    </h3>
                    <p className="text-sm text-slate-400 mb-6">{level.desc}</p>
                    <div className="flex items-center text-xs font-mono uppercase text-white/40 group-hover:text-white transition-colors">
                      {t.initSystem} <ChevronRight className={cn("w-3 h-3 ml-1", isRtl && "rotate-180 mr-1 ml-0")} />
                    </div>
                    {loading && (
                      <div className="absolute inset-0 bg-slate-950/50 flex items-center justify-center backdrop-blur-sm">
                        <Loader2 className="w-8 h-8 animate-spin text-conan-yellow" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Case Archive Section */}
              <div className="w-full space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                    <History className="w-3 h-3" /> {t.caseArchive}
                  </h3>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                {pastCases.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pastCases.map((pc, idx) => (
                      <div 
                        key={idx}
                        onClick={() => loadPastCase(pc)}
                        className="glass-panel p-4 hover:bg-white/5 transition-all cursor-pointer group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono text-conan-yellow uppercase tracking-wider">Case #{pastCases.length - idx}</span>
                            <button 
                              onClick={(e) => deletePastCase(e, pc.case.title)}
                              className="p-1 hover:text-conan-red text-slate-600 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          <h4 className="text-sm font-serif text-white mb-1 group-hover:text-conan-yellow transition-colors line-clamp-1">{pc.case.title}</h4>
                          <p className="text-[10px] text-slate-500 line-clamp-2 italic">{pc.case.location}</p>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-slate-400">
                          <span>{t.resumeCase}</span>
                          <ChevronRight className={cn("w-3 h-3", isRtl && "rotate-180")} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed border-white/5 rounded-2xl">
                    <p className="text-xs text-slate-600 font-mono italic">{t.noPastCases}</p>
                  </div>
                )}
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
                        {t.activeCase}
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
                        <Search className="w-4 h-4" /> {t.evidenceBoard}
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
                                <div className="text-[10px] uppercase tracking-wider opacity-50">{t.examine}</div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="glass-panel p-6 space-y-4">
                      <h3 className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-conan-yellow">
                        <User className="w-4 h-4" /> {t.suspects}
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
                            <ChevronRight className={cn("w-4 h-4 text-slate-600 group-hover:text-conan-yellow transition-colors", isRtl && "rotate-180")} />
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
                      <h4 className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{t.progress}</h4>
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
                      {t.makeDeduction}
                    </button>

                    <div className="p-4 rounded-xl bg-conan-blue/10 border border-conan-blue/20">
                      <div className="flex items-center gap-2 text-conan-blue mb-2">
                        <Info className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{t.tipTitle}</span>
                      </div>
                      <p className="text-xs text-slate-400 italic leading-relaxed">
                        {t.tipDesc}
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
                  <ArrowLeft className={cn("w-4 h-4", isRtl && "rotate-180")} /> {t.backToEvidence}
                </button>
                <div className="flex items-center gap-3">
                  <div className={cn("text-right", isRtl && "text-left")}>
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
                        {t.waiting}
                      </p>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex flex-col max-w-[80%]",
                        msg.role === 'user' ? (isRtl ? "mr-auto items-start" : "ml-auto items-end") : (isRtl ? "ml-auto items-end" : "items-start")
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
                        {msg.role === 'user' ? (language === 'ar' ? 'كونان' : 'Conan') : selectedSuspect.name}
                      </span>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex items-center gap-2 text-slate-500 font-mono text-[10px] uppercase tracking-widest">
                      <Loader2 className="w-3 h-3 animate-spin" /> {selectedSuspect.name} {t.thinking}
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
                      placeholder={t.askSomething}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-conan-yellow/50 transition-colors"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputText.trim() || isTyping}
                      className="p-3 bg-conan-yellow text-slate-950 rounded-xl hover:bg-conan-yellow/90 disabled:opacity-50 disabled:hover:bg-conan-yellow transition-all"
                    >
                      <Send className={cn("w-5 h-5", isRtl && "rotate-180")} />
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
                <h2 className="text-4xl font-serif text-white">{t.deductionTitle}</h2>
                <p className="text-slate-400">{t.deductionDesc}</p>
              </div>

              <div className="glass-panel p-8 space-y-8">
                <div className="space-y-4">
                  <label className="text-xs font-mono uppercase tracking-widest text-conan-yellow block">{t.selectCulprit}</label>
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
                        <div className={cn(isRtl && "text-right")}>
                          <div className="text-sm font-bold">{s.name}</div>
                          <div className="text-[10px] uppercase tracking-wider opacity-60">{s.role}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-mono uppercase tracking-widest text-conan-yellow block">{t.presentReasoning}</label>
                  <textarea
                    value={deductionReasoning}
                    onChange={(e) => setDeductionReasoning(e.target.value)}
                    placeholder={t.reasoningPlaceholder}
                    className="w-full h-48 bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-conan-red/50 transition-colors resize-none"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setGameState('INVESTIGATING')}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-sm transition-all"
                  >
                    {t.notReady}
                  </button>
                  <button
                    onClick={handleDeduction}
                    disabled={!deductionCulprit || !deductionReasoning || loading}
                    className="flex-[2] py-4 bg-conan-red hover:bg-conan-red/90 text-white rounded-xl font-bold text-sm shadow-lg shadow-conan-red/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {t.solveCase}
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
                    <h2 className="text-5xl font-serif text-white">{t.caseSolved}</h2>
                    <div className="text-conan-yellow font-mono text-2xl font-bold">{t.score}: {result.score}/100</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-20 h-20 bg-conan-red/20 text-conan-red rounded-full flex items-center justify-center mx-auto border-4 border-conan-red/30">
                      <XCircle className="w-10 h-10" />
                    </div>
                    <h2 className="text-5xl font-serif text-white">{t.truthEscaped}</h2>
                    <div className="text-slate-500 font-mono text-2xl font-bold">{t.score}: {result.score}/100</div>
                  </div>
                )}
              </div>

              <div className="glass-panel p-8 space-y-6 text-left">
                <div className={cn("space-y-2", isRtl && "text-right")}>
                  <h4 className="text-[10px] font-mono uppercase tracking-widest text-conan-yellow">{t.feedback}</h4>
                  <p className="text-slate-300 leading-relaxed">{result.feedback}</p>
                </div>

                <div className="p-6 rounded-2xl bg-conan-blue/20 border border-conan-blue/30 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Brain className="w-16 h-16" />
                  </div>
                  <h4 className={cn("text-[10px] font-mono uppercase tracking-widest text-conan-blue mb-2", isRtl && "text-right")}>{t.conanComment}</h4>
                  <p className={cn("text-white font-serif italic text-lg leading-relaxed", isRtl && "text-right")}>
                    "{result.conanComment}"
                  </p>
                </div>

                <button
                  onClick={() => setGameState('LOBBY')}
                  className="w-full py-4 bg-white text-slate-950 hover:bg-slate-200 rounded-xl font-bold text-sm transition-all"
                >
                  {t.returnToAgency}
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
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> {t.systemOnline}</span>
            <span className="hidden md:inline">{t.encrypted}</span>
          </div>
          <div>
            {t.detectiveId}: OMAR-SELM-2026
          </div>
        </div>
      </footer>
    </div>
  );
}
