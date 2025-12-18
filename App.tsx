
import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, Play, Square, Trophy, Heart, Sparkles, 
  RefreshCcw, Box, Star, Clock, History, 
  Trash2, Crown, Sparkle, Gem, RotateCcw, X, Upload, Image as ImageIcon
} from 'lucide-react';
import { Doll, GameStatus, AnnouncerMessage, CatchRecord } from './types';
import { getAnnouncerResponse } from './services/gemini';

const POP_MART_COLLECTION: Doll[] = [
  { id: '1', name: 'Molly: Space Guardian', color: 'bg-indigo-600', emoji: '👩‍🚀', isLiked: false },
  { id: '2', name: 'Skullpanda: The Warmth', color: 'bg-zinc-800', emoji: '🧸', isLiked: false },
  { id: '3', name: 'Dimoo: Cloud Walker', color: 'bg-cyan-600', emoji: '☁️', isLiked: false },
  { id: '4', name: 'Hirono: Little Mischief', color: 'bg-orange-800', emoji: '👺', isLiked: false },
  { id: '5', name: 'Labubu: The Monsters', color: 'bg-rose-900', emoji: '🧛', isLiked: false },
];

export default function App() {
  const [dolls, setDolls] = useState<Doll[]>(POP_MART_COLLECTION);
  const [history, setHistory] = useState<CatchRecord[]>([]);
  const [status, setStatus] = useState<GameStatus>('IDLE');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [clawX, setClawX] = useState(0);
  const [clawY, setClawY] = useState(0);
  const [announcer, setAnnouncer] = useState<AnnouncerMessage>({ 
    text: "Collector, prepare for unboxing.", 
    type: 'neutral' 
  });
  const [caughtDoll, setCaughtDoll] = useState<Doll | null>(null);

  const animationRef = useRef<number>(null);
  const moveDirection = useRef<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeEditingDollId = useRef<string | null>(null);

  const favoriteDolls = dolls.filter(d => d.isLiked);

  useEffect(() => {
    const savedHistory = localStorage.getItem('catch_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    
    const savedDolls = localStorage.getItem('doll_collection');
    if (savedDolls) setDolls(JSON.parse(savedDolls));
  }, []);

  useEffect(() => {
    localStorage.setItem('doll_collection', JSON.stringify(dolls));
  }, [dolls]);

  const saveToHistory = (doll: Doll) => {
    const newRecord: CatchRecord = {
      id: Math.random().toString(36).substr(2, 9),
      dollName: doll.name,
      emoji: doll.emoji,
      timestamp: new Date().toLocaleString()
    };
    const updatedHistory = [newRecord, ...history].slice(0, 20);
    setHistory(updatedHistory);
    localStorage.setItem('catch_history', JSON.stringify(updatedHistory));
  };

  const deleteFromHistory = (id: string) => {
    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('catch_history', JSON.stringify(updatedHistory));
  };

  const updateAnnouncer = async (event: 'start' | 'win' | 'loss' | 'near_miss', dollName: string) => {
    const text = await getAnnouncerResponse(event, dollName);
    setAnnouncer({ text, type: event === 'win' ? 'excited' : event === 'loss' ? 'sad' : 'neutral' });
  };

  const handleStart = () => {
    if (status !== 'IDLE') return;
    setStatus('COUNTDOWN');
    setCountdown(1);
    
    const timer1 = setTimeout(() => setCountdown(2), 700);
    const timer2 = setTimeout(() => setCountdown(3), 1400);
    const timer3 = setTimeout(() => {
      setCountdown(null);
      setStatus('MOVING');
      setClawY(0);
      setCaughtDoll(null);
      updateAnnouncer('start', "Mystery Item");
    }, 2100);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  };

  const handleStop = () => {
    if (status !== 'MOVING') return;
    setStatus('DROPPING');
  };

  const resetGame = () => {
    setStatus('IDLE');
    setClawX(0);
    setClawY(0);
    setCaughtDoll(null);
    setCountdown(null);
  };

  const refreshMachine = () => {
    const shuffled = [...dolls].sort(() => Math.random() - 0.5);
    setDolls(shuffled);
    resetGame();
  };

  useEffect(() => {
    if (status === 'MOVING') {
      const step = () => {
        setClawX(prev => {
          if (prev >= 92) moveDirection.current = -1;
          if (prev <= 0) moveDirection.current = 1;
          return prev + (1.6 * moveDirection.current);
        });
        animationRef.current = requestAnimationFrame(step);
      };
      animationRef.current = requestAnimationFrame(step);
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [status]);

  useEffect(() => {
    if (status === 'DROPPING') {
      const interval = setInterval(() => {
        setClawY(prev => {
          if (prev >= 82) {
            clearInterval(interval);
            checkCatch();
            return 82;
          }
          return prev + 5;
        });
      }, 16);
      return () => clearInterval(interval);
    }
    
    if (status === 'RETURNING') {
      const interval = setInterval(() => {
        setClawY(prev => {
          if (prev <= 0) {
            clearInterval(interval);
            finalizeGame();
            return 0;
          }
          return prev - 4;
        });
      }, 16);
      return () => clearInterval(interval);
    }
  }, [status]);

  const checkCatch = () => {
    const dollZones = [15, 32, 50, 68, 85];
    let closestIndex = 0;
    let minDistance = 100;

    dollZones.forEach((center, index) => {
      const dist = Math.abs(clawX - center);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = index;
      }
    });

    setCaughtDoll(dolls[closestIndex]);
    setStatus('RETURNING');
  };

  const finalizeGame = () => {
    if (caughtDoll) {
      setStatus('WIN');
      saveToHistory(caughtDoll);
      updateAnnouncer('win', caughtDoll.name);
    } else {
      setStatus('IDLE');
    }
  };

  const updateDoll = (id: string, updates: Partial<Doll>) => {
    setDolls(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeEditingDollId.current) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        updateDoll(activeEditingDollId.current!, { emoji: base64String });
        activeEditingDollId.current = null;
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = (id: string) => {
    activeEditingDollId.current = id;
    fileInputRef.current?.click();
  };

  const toggleLike = (id: string) => {
    setDolls(prev => prev.map(d => d.id === id ? { ...d, isLiked: !d.isLiked } : d));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('catch_history');
  };

  const isDataUrl = (str: string) => str.startsWith('data:');

  const renderVisual = (source: string, sizeClass: string = "text-xl") => {
    if (isDataUrl(source)) {
      return <img src={source} alt="doll" className="w-full h-full object-cover rounded-inherit" />;
    }
    return <span className={sizeClass}>{source}</span>;
  };

  return (
    <div className="min-h-screen p-4 md:p-6 flex flex-col items-center justify-start text-zinc-100 pb-20">
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Header UI */}
      <div className="w-full max-w-4xl mb-4 text-center relative">
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-300 to-indigo-400 italic tracking-tighter">
            CATCH & CHOOSE
          </h1>
          <div className="flex items-center gap-2 bg-zinc-900/60 px-4 py-1.5 rounded-full border border-white/5 shadow-inner">
             <Star className="w-3 h-3 text-yellow-500 fill-current animate-pulse" />
             <p className="text-[10px] font-bold text-zinc-400 italic tracking-wide">
               &ldquo;{announcer.text}&rdquo;
             </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start justify-center w-full max-w-[1200px]">
        
        {/* SIDEBAR: History */}
        <div className="lg:col-span-3 flex flex-col gap-4 order-2 lg:order-1">
          <div className="premium-glass p-5 rounded-[1.5rem] flex flex-col h-[300px] relative overflow-hidden">
             <div className="flex items-center justify-between mb-3 px-1 relative z-10">
                <h3 className="font-black text-[9px] uppercase tracking-widest text-purple-400 flex items-center gap-2">
                   <Clock className="w-3 h-3" /> Awards Vault
                </h3>
                {history.length > 0 && (
                  <button 
                    onClick={clearHistory} 
                    className="text-zinc-700 hover:text-red-400 transition transform hover:scale-110"
                    title="Clear All"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
             </div>
             <div className="flex-1 overflow-y-auto space-y-2 pr-1 relative z-10">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-10">
                    <Box className="w-10 h-10 mb-2" />
                    <p className="text-[7px] font-black uppercase">No Acquisitions</p>
                  </div>
                ) : (
                  history.map((record) => (
                    <div key={record.id} className="bg-zinc-900/60 p-2.5 rounded-xl border border-white/5 flex items-center gap-3 hover:bg-zinc-800 transition group relative">
                       <div className="w-8 h-8 flex items-center justify-center shrink-0 overflow-hidden rounded-lg">
                          {renderVisual(record.emoji)}
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-black truncate text-zinc-200 uppercase">{record.dollName}</p>
                          <p className="text-[7px] text-zinc-600 italic">{record.timestamp}</p>
                       </div>
                       <button 
                         onClick={() => deleteFromHistory(record.id)}
                         className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-zinc-950/50 text-zinc-500 hover:text-red-500 transition-all transform hover:scale-110"
                         title="Delete Entry"
                       >
                         <X className="w-3 h-3" />
                       </button>
                    </div>
                  ))
                )}
             </div>
          </div>

          <div className="premium-glass p-5 rounded-[1.5rem] relative overflow-hidden">
             <h3 className="font-black text-[9px] uppercase tracking-widest text-pink-400 mb-3 px-1 flex items-center gap-2">
                <Heart className="w-3 h-3 fill-current" /> Favorites
             </h3>
             <div className="space-y-2">
                {favoriteDolls.map((doll) => (
                  <div key={doll.id} className="bg-zinc-900/80 p-2.5 rounded-xl border border-white/10 flex items-center gap-3">
                     <div className={`w-8 h-8 rounded-lg ${doll.color} flex items-center justify-center shadow-lg overflow-hidden`}>
                        {renderVisual(doll.emoji, "text-lg")}
                     </div>
                     <p className="flex-1 text-[9px] font-black truncate uppercase text-zinc-300">{doll.name}</p>
                     <button onClick={() => toggleLike(doll.id)} className="text-pink-500 hover:scale-110 transition">
                        <Heart className="w-3 h-3 fill-current" />
                     </button>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* CENTER: Arcade Machine */}
        <div className="lg:col-span-6 flex flex-col items-center order-1 lg:order-2">
          <div className="relative w-full max-w-sm aspect-[3/4] bg-zinc-900 border-[10px] border-zinc-800 rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col ring-2 ring-white/5">
            <div className="flex-1 relative bg-gradient-to-b from-[#0f172a] to-[#020617] overflow-hidden">
               {/* Countdown Overlay */}
               {status === 'COUNTDOWN' && (
                 <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-lg animate-in fade-in duration-300">
                    <div className="text-9xl font-black text-white italic drop-shadow-[0_0_40px_rgba(168,85,247,0.8)] scale-up">
                      {countdown}
                    </div>
                 </div>
               )}

               <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
               
              <div 
                className="absolute z-30"
                style={{ left: `${clawX}%`, top: 0 }}
              >
                <div className="w-1.5 claw-string mx-auto transition-all" style={{ height: `${clawY}%`, minHeight: '40px' }}></div>
                <div className="relative -mt-4 flex flex-col items-center">
                  <div className="w-14 h-10 bg-gradient-to-b from-zinc-600 to-zinc-800 rounded-b-xl border-b-[4px] border-zinc-950 flex items-center justify-center shadow-xl">
                    <div className="w-6 h-0.5 bg-purple-400 rounded-full animate-pulse shadow-[0_0_8px_#a855f7]"></div>
                  </div>
                  <div className="flex justify-between w-20 -mt-1 px-1 relative">
                    <div className={`w-3 h-12 bg-zinc-400 rounded-full origin-top transition-transform duration-500 shadow-lg ${status === 'DROPPING' || status === 'RETURNING' ? 'rotate-[-5deg]' : 'rotate-[-25deg]'}`}></div>
                    <div className={`w-3 h-12 bg-zinc-400 rounded-full origin-top transition-transform duration-500 shadow-lg ${status === 'DROPPING' || status === 'RETURNING' ? 'rotate-[5deg]' : 'rotate-[25deg]'}`}></div>
                  </div>
                  
                  {caughtDoll && (
                    <div className="absolute -bottom-14 animate-bounce z-50">
                      <div className={`w-16 h-16 rounded-[1.5rem] ${caughtDoll.color} flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.4)] border-2 border-white transform rotate-6 overflow-hidden`}>
                        {renderVisual(caughtDoll.emoji, "text-4xl")}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="absolute bottom-12 left-6 right-6 h-32 flex items-end justify-center gap-4">
                {dolls.map((doll) => (
                  <div 
                    key={doll.id} 
                    className={`
                      relative transition-all duration-[800ms]
                      ${status === 'RETURNING' && caughtDoll?.id === doll.id ? 'opacity-0 scale-0 -translate-y-32' : 'opacity-100 scale-100'}
                    `}
                  >
                    <div className={`
                      w-12 h-12 md:w-16 md:h-16 rounded-[1rem] ${doll.color} 
                      flex items-center justify-center shadow-[0_12px_24px_rgba(0,0,0,0.7)] border border-white/10 overflow-hidden
                    `}>
                      {renderVisual(doll.emoji, "text-2xl md:text-4xl")}
                    </div>
                  </div>
                ))}
              </div>

              {status === 'WIN' && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-3xl flex flex-col items-center justify-center z-50 p-6 text-center animate-in zoom-in duration-500">
                  <div className="premium-glass p-8 rounded-[3rem] border-2 border-yellow-400/40 shadow-[0_0_80px_rgba(234,179,8,0.3)]">
                    <div className="relative mb-6 flex justify-center">
                       <Crown className="w-16 h-16 text-yellow-400 animate-float" />
                       <Sparkles className="absolute -top-2 -right-2 w-10 h-10 text-indigo-400 animate-pulse" />
                    </div>
                    
                    <div className={`w-28 h-28 rounded-[2rem] ${caughtDoll?.color} mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.2)] mb-6 border-4 border-white transform rotate-6 scale-110 overflow-hidden`}>
                      {renderVisual(caughtDoll?.emoji || "", "text-6xl")}
                    </div>
                    
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500 italic mb-1 uppercase tracking-tighter">Award Secured</h2>
                    <p className="text-zinc-100 font-black mb-8 text-[12px] uppercase tracking-[0.3em]">&ldquo;{caughtDoll?.name}&rdquo;</p>
                    
                    <button onClick={resetGame} className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800 text-white font-black py-4 rounded-2xl shadow-2xl flex items-center justify-center gap-3 uppercase tracking-[0.4em] text-[10px] border border-white/20 hover:scale-105 transition">
                      <RefreshCcw className="w-5 h-5" /> Next Release
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="h-40 bg-zinc-800 border-t border-white/10 flex items-center justify-center p-8 gap-10">
               <button 
                onClick={handleStart}
                disabled={status !== 'IDLE'}
                className={`
                  w-24 h-24 rounded-3xl border-b-[8px] active:border-b-0 active:translate-y-1 transition-all flex flex-col items-center justify-center font-black text-[9px] tracking-widest
                  ${status === 'IDLE' 
                    ? 'bg-purple-600 border-purple-900 text-white shadow-[0_15px_40px_rgba(168,85,247,0.4)]' 
                    : 'bg-zinc-700 border-zinc-900 text-zinc-500 opacity-30 cursor-not-allowed'}
                `}
               >
                 <Play className="w-10 h-10 mb-1.5 fill-current" />
                 START
               </button>
               <button 
                onClick={handleStop}
                disabled={status !== 'MOVING'}
                className={`
                  w-24 h-24 rounded-3xl border-b-[8px] active:border-b-0 active:translate-y-1 transition-all flex flex-col items-center justify-center font-black text-[9px] tracking-widest
                  ${status === 'MOVING' 
                    ? 'bg-white border-zinc-300 text-zinc-900 shadow-[0_15px_40px_rgba(255,255,255,0.2)]' 
                    : 'bg-zinc-700 border-zinc-900 text-zinc-500 opacity-30 cursor-not-allowed'}
                `}
               >
                 <Square className="w-10 h-10 mb-1.5 fill-current" />
                 STOP
               </button>
            </div>
          </div>
        </div>

        {/* SIDEBAR: Editor */}
        <div className="lg:col-span-3 flex flex-col gap-4 order-3">
          <div className="premium-glass p-6 rounded-[1.5rem] shadow-xl relative">
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h3 className="text-purple-300 font-black text-[9px] uppercase tracking-widest flex items-center gap-2">
                <Settings className="w-3.5 h-3.5" /> Manifest
              </h3>
              <button 
                onClick={refreshMachine}
                className="p-2.5 rounded-xl bg-zinc-900/50 hover:bg-zinc-800 text-purple-400 border border-purple-500/30 transition-all hover:rotate-180 duration-500"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5 relative z-10">
              {dolls.map((doll) => (
                <div key={doll.id} className="flex flex-col gap-1.5 group/item">
                  <div className="flex items-center gap-3">
                    {/* PICTURE/EMOJI EDITOR */}
                    <div className="relative">
                      <div className={`w-10 h-10 shrink-0 rounded-lg ${doll.color} flex items-center justify-center shadow-lg border border-white/10 overflow-hidden`}>
                        {renderVisual(doll.emoji, "text-xl")}
                      </div>
                      <button 
                        onClick={() => triggerFileInput(doll.id)}
                        className="absolute -bottom-1 -right-1 p-1 bg-zinc-900 rounded-full border border-white/20 text-purple-400 hover:text-white transition shadow-lg"
                        title="Upload Photo"
                      >
                        <Upload className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[7px] font-black uppercase tracking-widest text-zinc-600">Series A-01</span>
                        <button onClick={() => toggleLike(doll.id)} className="transition-all hover:scale-110">
                           <Heart className={`w-3 h-3 ${doll.isLiked ? 'fill-pink-500 text-pink-500' : 'text-zinc-700 hover:text-pink-400'}`} />
                        </button>
                      </div>
                      <input 
                        type="text" 
                        value={doll.name}
                        onChange={(e) => updateDoll(doll.id, { name: e.target.value })}
                        className="w-full bg-zinc-900/50 px-2 py-2 rounded-lg border-b border-zinc-800 text-[9px] font-black focus:outline-none focus:border-purple-500 text-zinc-300 uppercase tracking-tight transition-all"
                        placeholder="Award Name"
                      />
                    </div>
                  </div>
                  {/* Option to manual edit emoji text if preferred */}
                  <input 
                    type="text"
                    value={isDataUrl(doll.emoji) ? "[Image Set]" : doll.emoji}
                    onChange={(e) => updateDoll(doll.id, { emoji: e.target.value })}
                    className="w-full mt-1 bg-zinc-950/30 px-2 py-1 rounded border border-white/5 text-[7px] text-zinc-500 focus:text-zinc-200"
                    placeholder="or type emoji here..."
                    disabled={isDataUrl(doll.emoji)}
                  />
                  {isDataUrl(doll.emoji) && (
                    <button 
                      onClick={() => updateDoll(doll.id, { emoji: '🎁' })} 
                      className="text-[6px] text-zinc-700 hover:text-red-400 text-left uppercase font-bold"
                    >
                      Reset to Emoji
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-zinc-800/80 to-zinc-950/80 p-5 rounded-[1.5rem] border border-white/5 text-[8px] font-bold text-zinc-500 italic flex items-center gap-3">
             <Gem className="w-4 h-4 text-indigo-400 shrink-0" />
             <p>Customise your awards: upload photos from your device or use emojis.</p>
          </div>
        </div>

      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 text-[7px] font-black text-zinc-900 uppercase tracking-[2em] text-center opacity-30 pointer-events-none">
         Pop Mart // Premium Edition
      </div>
    </div>
  );
}
