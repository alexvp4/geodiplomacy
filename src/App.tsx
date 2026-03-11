import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Globe, 
  TrendingUp, 
  Shield, 
  Users, 
  ChevronRight, 
  RotateCcw, 
  Languages,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trophy,
  Swords,
  History,
  Scale,
  Shuffle,
  MessageSquare,
  Briefcase,
  Crown,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import WorldMap from './components/WorldMap';
import { 
  GameState, 
  Country, 
  Category, 
  FunModeState,
  HelpType
} from './types';
import { TRANSLATIONS, CATEGORIES, FAMOUS_LEADERS } from './constants';
import { generateScenario, evaluateChoice, generateGameAnalysis, compareCountries, generateHelpResponse } from './services/gemini';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const COUNTRY_LIST: Country[] = [
  { id: "076", name: "Brazil" },
  { id: "840", name: "USA" },
  { id: "156", name: "China" },
  { id: "643", name: "Russia" },
  { id: "250", name: "France" },
  { id: "276", name: "Germany" },
  { id: "356", name: "India" },
  { id: "392", name: "Japan" },
  { id: "826", name: "UK" },
  { id: "036", name: "Australia" },
  { id: "124", name: "Canada" },
  { id: "710", name: "South Africa" },
  { id: "032", name: "Argentina" },
  { id: "484", name: "Mexico" },
  { id: "528", name: "Netherlands" },
  { id: "752", name: "Sweden" },
  { id: "756", name: "Switzerland" },
  { id: "792", name: "Turkey" },
  { id: "682", name: "Saudi Arabia" },
  { id: "360", name: "Indonesia" },
  { id: "702", name: "Singapore" },
  { id: "410", name: "South Korea" },
  { id: "380", name: "Italy" },
  { id: "724", name: "Spain" },
  { id: "578", name: "Norway" },
  { id: "208", name: "Denmark" },
  { id: "246", name: "Finland" },
  { id: "554", name: "New Zealand" },
  { id: "372", name: "Ireland" },
  { id: "040", name: "Austria" },
  { id: "056", name: "Belgium" },
  { id: "616", name: "Poland" },
  { id: "818", name: "Egypt" },
  { id: "566", name: "Nigeria" },
  { id: "404", name: "Kenya" },
  { id: "170", name: "Colombia" },
  { id: "152", name: "Chile" },
  { id: "604", name: "Peru" },
  { id: "862", name: "Venezuela" },
  { id: "368", name: "Iraq" },
  { id: "364", name: "Iran" },
  { id: "376", name: "Israel" },
  { id: "784", name: "UAE" },
  { id: "586", name: "Pakistan" },
  { id: "050", name: "Bangladesh" },
  { id: "704", name: "Vietnam" },
  { id: "764", name: "Thailand" },
  { id: "458", name: "Malaysia" },
  { id: "608", name: "Philippines" },
];

export default function App() {
  const [state, setState] = useState<GameState>({
    playerCountry: null,
    selectedCountry: null,
    score: 100,
    history: [],
    language: 'pt',
    currentScenario: null,
    isEvaluating: false,
    lastEvaluation: null,
    showIntro: false,
    pendingOption: null,
    autoRandomCountry: false,
    isGameOver: false,
    gameAnalysis: null,
    turnCount: 0,
    usedHelpTools: [],
    helpUsedThisTurn: false,
    currentHelpResponse: null,
    currentRandomLeader: null,
  });

  const [funMode, setFunMode] = useState<FunModeState>({
    active: false,
    countryA: null,
    countryB: null,
    comparison: null,
    isLoading: false,
  });

  const [isLoadingScenario, setIsLoadingScenario] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const t = TRANSLATIONS[state.language];

  const startGame = () => {
    const randomCountry = COUNTRY_LIST[Math.floor(Math.random() * COUNTRY_LIST.length)];
    setState(prev => ({
      ...prev,
      playerCountry: randomCountry,
      score: 100,
      history: [],
      selectedCountry: null,
      currentScenario: null,
      lastEvaluation: null,
      showIntro: true,
      isGameOver: false,
      gameAnalysis: null,
      pendingOption: null,
      turnCount: 0,
      usedHelpTools: [],
      helpUsedThisTurn: false,
      currentHelpResponse: null,
      currentRandomLeader: null,
    }));
    setGameStarted(true);
  };

  const toggleLanguage = () => {
    setState(prev => ({
      ...prev,
      language: prev.language === 'pt' ? 'en' : 'pt'
    }));
  };

  const handleCountrySelect = (country: Country) => {
    if (state.isEvaluating || isLoadingScenario || state.isGameOver) return;
    setState(prev => ({ ...prev, selectedCountry: country, currentScenario: null, lastEvaluation: null, pendingOption: null }));
  };

  const handleCategorySelect = async (category: Category, targetCountryOverride?: Country) => {
    const target = targetCountryOverride || state.selectedCountry;
    if (!state.playerCountry || !target) return;
    
    setIsLoadingScenario(true);
    try {
      const scenario = await generateScenario(
        state.playerCountry,
        target,
        category,
        state.language
      );
      const randomLeader = FAMOUS_LEADERS[Math.floor(Math.random() * FAMOUS_LEADERS.length)];
      setState(prev => ({ 
        ...prev, 
        selectedCountry: target,
        currentScenario: scenario, 
        pendingOption: null,
        turnCount: prev.turnCount + 1,
        currentRandomLeader: randomLeader,
        helpUsedThisTurn: false,
        currentHelpResponse: null
      }));
    } catch (error) {
      console.error("Failed to generate scenario:", error);
    } finally {
      setIsLoadingScenario(false);
    }
  };

  const handleOptionSelect = async (optionId: string) => {
    if (!state.playerCountry || !state.selectedCountry || !state.currentScenario) return;
    
    const option = state.currentScenario.options.find(o => o.id === optionId);
    if (!option) return;

    setState(prev => ({ ...prev, isEvaluating: true, pendingOption: null }));
    
    try {
      const evaluation = await evaluateChoice(
        state.playerCountry,
        state.selectedCountry,
        state.currentScenario.category,
        state.currentScenario,
        option.text,
        state.history,
        state.language
      );

      const isBonus = state.turnCount > 0 && state.turnCount % 5 === 0;
      const multiplier = isBonus ? 3 : 1;
      const finalScoreChange = evaluation.scoreChange * multiplier;

      setState(prev => {
        const newScore = prev.score + finalScoreChange;
        return {
          ...prev,
          score: newScore,
          lastEvaluation: { ...evaluation, scoreChange: finalScoreChange },
          isEvaluating: false,
          history: [
            {
              country: prev.selectedCountry!,
              category: prev.currentScenario!.category,
              scenarioTitle: prev.currentScenario!.title,
              choice: option.text,
              isGood: evaluation.isGood,
              scoreChange: finalScoreChange,
            },
            ...prev.history
          ]
        };
      });
    } catch (error) {
      console.error("Failed to evaluate choice:", error);
      setState(prev => ({ ...prev, isEvaluating: false }));
    }
  };

  useEffect(() => {
    if (state.score <= 0 && !state.isGameOver && !state.isEvaluating && state.history.length > 0) {
      handleEndGame();
    }
  }, [state.score, state.isGameOver, state.isEvaluating, state.history.length]);

  const handleEndGame = async () => {
    if (!state.playerCountry) return;
    setState(prev => ({ ...prev, isEvaluating: true }));
    try {
      const analysis = await generateGameAnalysis(state.playerCountry, state.history, state.language);
      setState(prev => ({ 
        ...prev, 
        isGameOver: true, 
        gameAnalysis: analysis, 
        isEvaluating: false 
      }));
    } catch (error) {
      console.error("Failed to generate analysis:", error);
      setState(prev => ({ ...prev, isEvaluating: false }));
    }
  };

  const nextTurn = async () => {
    if (state.autoRandomCountry && state.playerCountry) {
      const available = COUNTRY_LIST.filter(c => c.id !== state.playerCountry?.id);
      const nextSelected = available[Math.floor(Math.random() * available.length)];
      const randomCategory = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      
      setState(prev => ({
        ...prev,
        selectedCountry: nextSelected,
        currentScenario: null,
        lastEvaluation: null,
        pendingOption: null,
        helpUsedThisTurn: false,
        currentHelpResponse: null
      }));
      
      await handleCategorySelect(randomCategory, nextSelected);
    } else {
      setState(prev => ({
        ...prev,
        selectedCountry: null,
        currentScenario: null,
        lastEvaluation: null,
        pendingOption: null,
        helpUsedThisTurn: false,
        currentHelpResponse: null
      }));
    }
  };

  const toggleAutoRandom = async () => {
    const willBeAuto = !state.autoRandomCountry;
    setState(prev => ({ ...prev, autoRandomCountry: willBeAuto }));
    
    if (willBeAuto && !state.selectedCountry && !state.currentScenario && !state.lastEvaluation && state.playerCountry) {
      const available = COUNTRY_LIST.filter(c => c.id !== state.playerCountry?.id);
      const nextSelected = available[Math.floor(Math.random() * available.length)];
      const randomCategory = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      await handleCategorySelect(randomCategory, nextSelected);
    }
  };

  const resetGame = () => {
    setGameStarted(false);
    setState(prev => ({
      ...prev,
      playerCountry: null,
      selectedCountry: null,
      score: 100,
      history: [],
      currentScenario: null,
      lastEvaluation: null,
      showIntro: false,
      isGameOver: false,
      gameAnalysis: null,
      pendingOption: null,
      turnCount: 0,
      usedHelpTools: [],
      helpUsedThisTurn: false,
      currentHelpResponse: null,
      currentRandomLeader: null,
    }));
  };

  const [isLoadingHelp, setIsLoadingHelp] = useState(false);

  const handleHelp = async (type: HelpType) => {
    if (state.helpUsedThisTurn || state.usedHelpTools.includes(type) || !state.currentScenario) return;

    setIsLoadingHelp(true);
    try {
      const response = await generateHelpResponse(
        state.currentScenario,
        type,
        state.currentRandomLeader,
        state.language
      );
      setState(prev => ({
        ...prev,
        usedHelpTools: [...prev.usedHelpTools, type],
        helpUsedThisTurn: true,
        currentHelpResponse: response
      }));
    } catch (error) {
      console.error("Failed to get help:", error);
    } finally {
      setIsLoadingHelp(false);
    }
  };

  const handleCompareCountries = async () => {
    if (!funMode.countryA || !funMode.countryB) return;
    setFunMode(prev => ({ ...prev, isLoading: true, comparison: null }));
    try {
      const comparison = await compareCountries(funMode.countryA, funMode.countryB, state.language);
      setFunMode(prev => ({ ...prev, comparison, isLoading: false }));
    } catch (error) {
      console.error("Failed to compare countries:", error);
      setFunMode(prev => ({ ...prev, isLoading: false }));
    }
  };

  if (funMode.active) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 p-6 flex flex-col items-center font-sans selection:bg-emerald-500/30">
        <div className="w-full max-w-5xl flex justify-between items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-emerald-400 flex items-center gap-3">
            <Swords className="text-emerald-500" />
            {t.funMode}
          </h1>
          <button 
            onClick={() => setFunMode(prev => ({ ...prev, active: false, comparison: null, countryA: null, countryB: null }))} 
            className="px-4 py-2 rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 transition-colors text-sm font-bold"
          >
            {t.backToGame}
          </button>
        </div>
        
        <div className="w-full max-w-5xl bg-slate-900/50 border border-white/10 rounded-3xl p-6 md:p-10 space-y-8 shadow-2xl backdrop-blur-sm">
          <div className="flex flex-col md:flex-row gap-6 items-center justify-center">
            <select 
              className="bg-slate-800 border border-white/20 rounded-xl p-4 text-white w-full md:w-72 text-lg focus:outline-none focus:border-emerald-500 transition-colors"
              value={funMode.countryA?.id || ""}
              onChange={e => setFunMode(prev => ({ ...prev, countryA: COUNTRY_LIST.find(c => c.id === e.target.value) || null }))}
            >
              <option value="">{t.selectCountryA}</option>
              {COUNTRY_LIST.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            
            <div className="p-4 rounded-full bg-slate-800/50 border border-white/5">
              <Scale size={32} className="text-slate-400" />
            </div>
            
            <select 
              className="bg-slate-800 border border-white/20 rounded-xl p-4 text-white w-full md:w-72 text-lg focus:outline-none focus:border-emerald-500 transition-colors"
              value={funMode.countryB?.id || ""}
              onChange={e => setFunMode(prev => ({ ...prev, countryB: COUNTRY_LIST.find(c => c.id === e.target.value) || null }))}
            >
              <option value="">{t.selectCountryB}</option>
              {COUNTRY_LIST.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          
          <div className="flex justify-center">
            <button 
              disabled={!funMode.countryA || !funMode.countryB || funMode.isLoading}
              onClick={handleCompareCountries}
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold rounded-2xl transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg flex items-center gap-2 text-lg"
            >
              {funMode.isLoading ? (
                <><Loader2 className="animate-spin" /> {t.analyzingMatch}</>
              ) : (
                <><Globe /> {t.compare}</>
              )}
            </button>
          </div>
          
          {funMode.comparison && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl">
                <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2 text-lg"><CheckCircle2 /> {t.compatibilities}</h3>
                <ul className="space-y-3 text-slate-300">
                  {funMode.comparison.compatibilities.map((c, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-emerald-500 mt-1">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-2xl">
                <h3 className="text-rose-400 font-bold mb-4 flex items-center gap-2 text-lg"><AlertCircle /> {t.incompatibilities}</h3>
                <ul className="space-y-3 text-slate-300">
                  {funMode.comparison.incompatibilities.map((c, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-rose-500 mt-1">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="md:col-span-2 bg-slate-800/50 border border-white/5 p-8 rounded-2xl">
                <h3 className="text-slate-400 font-bold mb-4 uppercase text-sm tracking-widest flex items-center gap-2"><History size={18} /> {t.summary}</h3>
                <p className="text-slate-200 text-lg leading-relaxed">{funMode.comparison.summary}</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center p-6 font-sans selection:bg-emerald-500/30">
        <div className="absolute top-6 right-6 flex gap-4">
          <button 
            onClick={() => setFunMode(prev => ({ ...prev, active: true }))}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-white/10 hover:bg-slate-800 transition-colors text-sm font-medium"
          >
            <Swords size={18} className="text-amber-400" />
            {t.funMode}
          </button>
          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-white/10 hover:bg-slate-800 transition-colors text-sm font-medium"
          >
            <Languages size={18} className="text-emerald-400" />
            {t.changeLanguage}
          </button>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full text-center space-y-8"
        >
          <div className="space-y-2">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="inline-block p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 mb-4"
            >
              <Globe size={64} className="text-emerald-400" />
            </motion.div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
              {t.title}
            </h1>
            <p className="text-slate-400 text-lg md:text-xl font-medium italic">
              {t.subtitle}
            </p>
          </div>

          <div className="bg-slate-900/50 border border-white/5 p-8 rounded-3xl backdrop-blur-sm space-y-6">
            <h2 className="text-2xl font-semibold text-emerald-400">{t.welcome}</h2>
            <p className="text-slate-300 leading-relaxed">
              {t.welcomeDesc}
            </p>
            <button 
              onClick={startGame}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-lg"
            >
              {t.start}
              <ChevronRight size={20} />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (state.showIntro) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center p-6 font-sans selection:bg-emerald-500/30">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full bg-slate-900 border border-white/10 rounded-3xl p-10 text-center space-y-8 shadow-2xl"
        >
          <div className="space-y-2">
            <h2 className="text-slate-400 uppercase tracking-widest text-sm font-bold">{t.introTitle}</h2>
            <p className="text-xl text-slate-300">{t.introDesc}</p>
          </div>
          
          <div className="py-8">
            <h1 className="text-5xl font-bold text-emerald-400 tracking-tight">
              {state.playerCountry?.name}
            </h1>
          </div>

          <button 
            onClick={() => setState(prev => ({ ...prev, showIntro: false }))}
            className="w-full py-4 bg-white text-slate-950 font-bold rounded-2xl hover:bg-slate-200 transition-all transform hover:scale-[1.02] active:scale-95 text-lg"
          >
            {t.beginDiplomacy}
          </button>
        </motion.div>
      </div>
    );
  }

  if (state.isGameOver && state.gameAnalysis) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 p-6 md:p-12 font-sans selection:bg-emerald-500/30">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <div className="inline-block p-4 rounded-full bg-slate-900 border border-white/10 mb-2">
              <History size={48} className="text-emerald-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{t.gameOver}</h1>
            <p className="text-xl text-slate-400">{t.legacy} - {state.playerCountry?.name}</p>
            {state.score <= 0 && (
              <p className="text-rose-400 font-bold">{t.gameOverLowScore}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-white/10 p-8 rounded-3xl space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">{t.summary}</h3>
              <p className="text-slate-200 leading-relaxed text-lg">{state.gameAnalysis.summary}</p>
            </div>
            <div className="bg-slate-900 border border-white/10 p-8 rounded-3xl space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Global Impact</h3>
              <p className="text-slate-200 leading-relaxed text-lg">{state.gameAnalysis.impact}</p>
            </div>
            <div className="md:col-span-2 bg-emerald-500/10 border border-emerald-500/20 p-8 rounded-3xl space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-emerald-500/20">
                    <Trophy size={24} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-500/70">{t.historicalMatch}</h3>
                    <p className="text-2xl font-bold text-emerald-400">{state.gameAnalysis.historicalLeader}</p>
                  </div>
                </div>
                <a
                  href={`https://${state.language}.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(state.gameAnalysis.historicalLeader)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 shrink-0"
                >
                  {t.learnMore.replace('{leader}', state.gameAnalysis.historicalLeader)}
                  <ExternalLink size={14} />
                </a>
              </div>
              <p className="text-slate-300 leading-relaxed italic border-l-2 border-emerald-500/30 pl-4">
                "{state.gameAnalysis.leaderReasoning}"
              </p>
            </div>
          </div>

          <div className="flex justify-center pt-8">
            <button 
              onClick={resetGame}
              className="px-8 py-4 bg-white text-slate-950 font-bold rounded-2xl hover:bg-slate-200 transition-all flex items-center gap-2 text-lg"
            >
              <RotateCcw size={20} />
              {t.playAgain}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-4 md:p-8 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <Globe size={28} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {t.playerCountry}: <span className="text-emerald-400 font-bold">{state.playerCountry?.name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap justify-center">
          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer hover:text-slate-300 transition-colors bg-slate-900/50 px-4 py-2 rounded-xl border border-white/5">
            <input 
              type="checkbox" 
              checked={state.autoRandomCountry}
              onChange={toggleAutoRandom}
              className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500/50"
            />
            <Shuffle size={14} />
            {t.autoRandom}
          </label>

          <div className="bg-slate-900/80 border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-xl">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{t.score}</p>
              <p className={cn(
                "text-2xl font-mono font-bold",
                state.score >= 100 ? "text-emerald-400" : "text-rose-400"
              )}>
                {state.score}
              </p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <TrendingUp size={24} className="text-emerald-400" />
          </div>

          <button 
            onClick={() => handleEndGame()}
            disabled={state.isEvaluating}
            className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors text-rose-400 text-sm font-bold flex items-center gap-2 disabled:opacity-50"
          >
            <History size={16} />
            {t.endGame}
          </button>
          
          <button 
            onClick={toggleLanguage}
            className="px-4 py-3 rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 transition-colors text-xs font-bold uppercase tracking-wider"
          >
            {state.language === 'pt' ? 'EN' : 'PT'}
          </button>
        </div>
      </header>

      {state.isEvaluating && !state.currentScenario && !state.lastEvaluation && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <Loader2 size={64} className="text-emerald-400 animate-spin mb-4" />
          <p className="text-2xl font-bold text-white">{t.analyzingLegacy}</p>
        </div>
      )}

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Map and History */}
        <div className="lg:col-span-5 space-y-8">
          <WorldMap 
            onSelectCountry={handleCountrySelect}
            playerCountryId={state.playerCountry?.id}
            selectedCountryId={state.selectedCountry?.id}
          />

          <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <RotateCcw size={14} />
              Recent History
            </h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {state.history.length === 0 ? (
                <p className="text-slate-600 italic text-sm py-4">No diplomatic actions yet.</p>
              ) : (
                state.history.map((item, idx) => (
                  <div key={idx} className="bg-slate-800/50 border border-white/5 p-4 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-2 rounded-xl",
                        item.isGood ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                      )}>
                        {item.category === 'Economic' ? <TrendingUp size={18} /> : 
                         item.category === 'Political' ? <Users size={18} /> : <Shield size={18} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{item.country.name}</p>
                        <p className="text-xs text-slate-400 line-clamp-1">{item.scenarioTitle}</p>
                      </div>
                    </div>
                    <div className={cn(
                      "text-sm font-mono font-bold",
                      item.scoreChange >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {item.scoreChange >= 0 ? '+' : ''}{item.scoreChange}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Interaction Panel */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {!state.selectedCountry ? (
              <motion.div 
                key="no-selection"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col items-center justify-center p-8 bg-slate-900/30 border border-dashed border-white/10 rounded-3xl text-center space-y-4"
              >
                <div className="p-4 rounded-full bg-slate-800/50 text-slate-600">
                  <Globe size={48} />
                </div>
                <p className="text-slate-400 font-medium">
                  {t.selectCountry}
                </p>
              </motion.div>
            ) : state.lastEvaluation ? (
              <motion.div 
                key="evaluation"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-full"
              >
                <div className={cn(
                  "p-6 flex items-center gap-4",
                  state.lastEvaluation.isGood ? "bg-emerald-500/20" : "bg-rose-500/20"
                )}>
                  {state.lastEvaluation.isGood ? (
                    <CheckCircle2 size={32} className="text-emerald-400" />
                  ) : (
                    <AlertCircle size={32} className="text-rose-400" />
                  )}
                  <div>
                    <h2 className="text-xl font-bold">
                      {state.lastEvaluation.isGood ? t.goodChoice : t.badChoice}
                    </h2>
                    <p className={cn(
                      "text-sm font-mono font-bold",
                      state.lastEvaluation.isGood ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {state.lastEvaluation.scoreChange >= 0 ? '+' : ''}{state.lastEvaluation.scoreChange} Influence
                    </p>
                  </div>
                </div>
                
                <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Feedback</p>
                    <p className="text-lg font-medium text-slate-200">{state.lastEvaluation.feedback}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Justification</p>
                    <p className="text-sm text-slate-400 leading-relaxed italic">
                      {state.lastEvaluation.justification}
                    </p>
                  </div>
                </div>

                <div className="p-6 bg-slate-800/50 border-t border-white/5">
                  <button 
                    onClick={nextTurn}
                    className="w-full py-4 bg-white text-slate-950 font-bold rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    {t.nextTurn}
                    <ChevronRight size={20} />
                  </button>
                </div>
              </motion.div>
            ) : state.currentScenario ? (
              <motion.div 
                key="scenario"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-full relative"
              >
                <div className="p-6 border-b border-white/5 bg-slate-800/30 flex items-center justify-between relative">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                      {state.currentScenario.category === 'Economic' ? <TrendingUp size={20} /> : 
                       state.currentScenario.category === 'Political' ? <Users size={20} /> : <Shield size={20} />}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      {state.currentScenario.category}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-500">
                    vs {state.selectedCountry.name}
                  </div>
                  
                  {state.turnCount > 0 && state.turnCount % 5 === 0 && (
                    <div className="absolute -top-3 -right-3 bg-amber-500 text-slate-950 text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-amber-500/20 flex items-center gap-1 animate-bounce">
                      <Sparkles size={12} />
                      {t.bonusRound}
                    </div>
                  )}
                </div>

                <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold leading-tight">{state.currentScenario.title}</h2>
                    <p className="text-slate-400 leading-relaxed">
                      {state.currentScenario.description}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {state.currentScenario.options.map((option) => (
                      <div key={option.id} className="relative">
                        <button
                          disabled={state.isEvaluating || state.pendingOption !== null}
                          onClick={() => setState(prev => ({ ...prev, pendingOption: option.id }))}
                          className={cn(
                            "w-full p-4 text-left border rounded-2xl transition-all group relative overflow-hidden",
                            state.pendingOption === option.id 
                              ? "bg-slate-800 border-emerald-500/50" 
                              : "bg-slate-800/50 border-white/5 hover:bg-slate-700 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          )}
                        >
                          <div className="relative z-10 flex items-start gap-3">
                            <div className={cn(
                              "mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0",
                              state.pendingOption === option.id ? "border-emerald-500" : "border-slate-600 group-hover:border-emerald-500"
                            )}>
                              <div className={cn(
                                "w-2 h-2 rounded-full bg-emerald-500 transition-opacity",
                                state.pendingOption === option.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                              )} />
                            </div>
                            <span className={cn(
                              "text-sm font-medium transition-colors",
                              state.pendingOption === option.id ? "text-white" : "text-slate-300 group-hover:text-white"
                            )}>
                              {option.text}
                            </span>
                          </div>
                        </button>

                        {/* Confirmation Actions */}
                        <AnimatePresence>
                          {state.pendingOption === option.id && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="flex gap-2 pt-2">
                                <button
                                  onClick={() => handleOptionSelect(option.id)}
                                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 rounded-xl text-sm transition-colors"
                                >
                                  {t.confirmChoice}
                                </button>
                                <button
                                  onClick={() => setState(prev => ({ ...prev, pendingOption: null }))}
                                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-xl text-sm transition-colors"
                                >
                                  {t.cancel}
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>

                  {/* Help Tools */}
                  <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <Briefcase size={14} />
                      {t.helpTools}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <button
                        onClick={() => handleHelp('social')}
                        disabled={state.helpUsedThisTurn || state.usedHelpTools.includes('social') || isLoadingHelp || state.isEvaluating}
                        className="p-3 rounded-xl bg-slate-800/50 border border-white/5 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-2 transition-colors"
                      >
                        <MessageSquare size={18} className={state.usedHelpTools.includes('social') ? "text-slate-600" : "text-blue-400"} />
                        <span className="text-[10px] font-bold uppercase text-center">{t.helpSocial}</span>
                      </button>
                      <button
                        onClick={() => handleHelp('advisors')}
                        disabled={state.helpUsedThisTurn || state.usedHelpTools.includes('advisors') || isLoadingHelp || state.isEvaluating}
                        className="p-3 rounded-xl bg-slate-800/50 border border-white/5 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-2 transition-colors"
                      >
                        <Users size={18} className={state.usedHelpTools.includes('advisors') ? "text-slate-600" : "text-purple-400"} />
                        <span className="text-[10px] font-bold uppercase text-center">{t.helpAdvisors}</span>
                      </button>
                      <button
                        onClick={() => handleHelp('leader')}
                        disabled={state.helpUsedThisTurn || state.usedHelpTools.includes('leader') || isLoadingHelp || state.isEvaluating}
                        className="p-3 rounded-xl bg-slate-800/50 border border-white/5 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-2 transition-colors"
                      >
                        <Crown size={18} className={state.usedHelpTools.includes('leader') ? "text-slate-600" : "text-amber-400"} />
                        <span className="text-[10px] font-bold uppercase text-center">{t.helpLeader.replace('{leader}', state.currentRandomLeader || '')}</span>
                      </button>
                    </div>

                    {isLoadingHelp && (
                      <div className="flex items-center justify-center gap-2 text-slate-400 py-4">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-sm italic">{t.consulting}</span>
                      </div>
                    )}

                    {state.currentHelpResponse && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-2xl bg-slate-800/80 border border-white/10 text-sm text-slate-300 italic leading-relaxed shadow-inner"
                      >
                        "{state.currentHelpResponse}"
                      </motion.div>
                    )}
                  </div>
                </div>

                {state.isEvaluating && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center space-y-4 z-20">
                    <Loader2 size={48} className="text-emerald-400 animate-spin" />
                    <p className="text-lg font-bold text-white">{t.evaluating}</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="category-selection"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl"
              >
                <div className="space-y-1">
                  <h2 className="text-xl font-bold">{state.selectedCountry.name}</h2>
                  <p className="text-sm text-slate-500">{t.pickCategory}</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleCategorySelect(cat)}
                      disabled={isLoadingScenario}
                      className="flex items-center justify-between p-4 bg-slate-800 border border-white/5 rounded-2xl hover:bg-slate-700 hover:border-emerald-500/30 transition-all group disabled:opacity-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-slate-900 text-slate-400 group-hover:text-emerald-400 transition-colors">
                          {cat === 'Economic' ? <TrendingUp size={24} /> : 
                           cat === 'Political' ? <Users size={24} /> : <Shield size={24} />}
                        </div>
                        <span className="font-bold text-slate-200 group-hover:text-white transition-colors">
                          {t[cat.toLowerCase() as keyof typeof t]}
                        </span>
                      </div>
                      <ChevronRight size={20} className="text-slate-600 group-hover:text-emerald-400 transition-colors" />
                    </button>
                  ))}
                </div>

                {isLoadingScenario && (
                  <div className="flex items-center justify-center gap-3 py-4 text-emerald-400">
                    <Loader2 size={20} className="animate-spin" />
                    <span className="text-sm font-bold animate-pulse">Generating Scenario...</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer / Stats */}
      <footer className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-xs font-medium uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-amber-500" />
          Global Rank: #12
        </div>
        <p>© 2024 GeoDiplomacy AI - Educational Simulator</p>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Live Data
          </span>
          <span className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Gemini 3.0 Flash
          </span>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
