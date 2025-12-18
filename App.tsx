
import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, Play, Square, Trophy, Heart, Sparkles, 
  RefreshCcw, Box, Star, Clock, History, 
  Trash2, Crown, Sparkle, Gem, RotateCcw, X, Upload, Image as ImageIcon,
  Calendar, Award, Share2, LogIn, User, Laptop, ShieldCheck, ChevronDown, LogOut, UserPlus, Plus, 
  CheckCircle2, Mail, ExternalLink, ChevronRight, Info, Camera, Save, UserCircle
} from 'lucide-react';
import { Doll, GameStatus, AnnouncerMessage, CatchRecord, UserProfile } from './types';
import { getAnnouncerResponse } from './services/gemini';

// Extend Doll type locally for favorites unique identification
interface FavoriteDoll extends Doll {
  favId: string;
}

const DEFAULT_COLORS = [
  'bg-indigo-600', 'bg-zinc-800', 'bg-cyan-600', 'bg-orange-800', 'bg-rose-900',
  'bg-green-600', 'bg-purple-600', 'bg-blue-500', 'bg-pink-400', 'bg-sky-700'
];

const INITIAL_COLLECTION: Doll[] = [
  { id: '1', name: 'Molly: Space Guardian', color: 'bg-indigo-600', emoji: '👩‍🚀', isLiked: false },
  { id: '2', name: 'Skullpanda: The Warmth', color: 'bg-zinc-800', emoji: '🧸', isLiked: false },
  { id: '3', name: 'Dimoo: Cloud Walker', color: 'bg-cyan-600', emoji: '☁️', isLiked: false },
  { id: '4', name: 'Hirono: Little Mischief', color: 'bg-orange-800', emoji: '👺', isLiked: false },
  { id: '5', name: 'Labubu: The Monsters', color: 'bg-rose-900', emoji: '🧛', isLiked: false },
  { id: '6', name: 'Pucky: Forest Fairy', color: 'bg-green-600', emoji: '🧚', isLiked: false },
  { id: '7', name: 'Bunny: Magic Series', color: 'bg-purple-600', emoji: '🐰', isLiked: false },
  { id: '8', name: 'Azura: Animal Fighter', color: 'bg-blue-500', emoji: '🐱', isLiked: false },
  { id: '9', name: 'Satyr Rory: Dreams', color: 'bg-pink-400', emoji: '🦄', isLiked: false },
  { id: '10', name: 'Yuki: Interstellar', color: 'bg-sky-700', emoji: '❄️', isLiked: false },
];

type AuthStep = 'PICKER' | 'EMAIL' | 'PASSWORD';

export default function App() {
  const [dolls, setDolls] = useState<Doll[]>(INITIAL_COLLECTION);
  const [favorites, setFavorites] = useState<FavoriteDoll[]>([]);
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
  const [winTimestamp, setWinTimestamp] = useState<string | null>(null);
  
  const [user, setUser] = useState<UserProfile>({
    name: "Guest Collector",
    email: "",
    lastLogin: "Not Logged In",
    isLoggedIn: false,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=Guest`
  });
  const [deviceName, setDeviceName] = useState<string>("Detecting...");
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Auth & Profile State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [authStep, setAuthStep] = useState<AuthStep>('PICKER');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // Editing profile state
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState("");

  const animationRef = useRef<number>(null);
  const moveDirection = useRef<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const activeEditingDollId = useRef<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const platform = navigator.platform || "Unknown Device";
    setDeviceName(platform);

    const savedHistory = localStorage.getItem('catch_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    
    const savedDolls = localStorage.getItem('doll_collection_v3');
    if (savedDolls) setDolls(JSON.parse(savedDolls));

    const savedFavorites = localStorage.getItem('doll_favorites_v3');
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));

    const savedUser = localStorage.getItem('active_google_session');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed.isLoggedIn) {
        setUser(parsed);
      }
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    localStorage.setItem('doll_collection_v3', JSON.stringify(dolls));
  }, [dolls]);

  useEffect(() => {
    localStorage.setItem('doll_favorites_v3', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    if (user.isLoggedIn) {
      localStorage.setItem('active_google_session', JSON.stringify(user));
    } else {
      localStorage.removeItem('active_google_session');
    }
  }, [user]);

  const openAuthModal = () => {
    setAuthStep('PICKER');
    setEmailInput('');
    setPasswordInput('');
    setShowPassword(false);
    setShowGoogleModal(true);
  };

  const goToEmailStep = () => setAuthStep('EMAIL');
  const goToPasswordStep = () => {
    if (!emailInput.includes('@')) return;
    setAuthStep('PASSWORD');
  };

  const handleFinalSignIn = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!passwordInput) return;

    setIsAuthenticating(true);
    setTimeout(() => {
      const now = new Date().toLocaleString();
      const authUser: UserProfile = {
        name: emailInput.split('@')[0] || "Anime Master",
        email: emailInput || "master.collector@gmail.com",
        lastLogin: now,
        isLoggedIn: true,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${emailInput || 'Master'}`
      };
      setUser(authUser);
      setIsAuthenticating(false);
      setShowGoogleModal(false);
      updateAnnouncer('start', authUser.name);
    }, 1500);
  };

  const handleQuickLogin = (email: string, name: string) => {
    setIsAuthenticating(true);
    setTimeout(() => {
      const now = new Date().toLocaleString();
      const authUser: UserProfile = {
        name,
        email,
        lastLogin: now,
        isLoggedIn: true,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
      };
      setUser(authUser);
      setIsAuthenticating(false);
      setShowGoogleModal(false);
      updateAnnouncer('start', name);
    }, 1000);
  };

  const handleLogout = () => {
    setUser({
      name: "Guest Collector",
      email: "",
      lastLogin: "Logged Out",
      isLoggedIn: false,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=Guest`
    });
    setShowUserMenu(false);
    localStorage.removeItem('active_google_session');
  };

  const openProfileSettings = () => {
    setEditName(user.name);
    setEditAvatar(user.avatar || "");
    setShowProfileModal(true);
    setShowUserMenu(false);
  };

  const saveProfileChanges = () => {
    setUser(prev => ({
      ...prev,
      name: editName,
      avatar: editAvatar
    }));
    setShowProfileModal(false);
  };

  const handleProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveToHistory = (doll: Doll) => {
    const now = new Date().toLocaleString();
    setWinTimestamp(now);
    const newRecord: CatchRecord = {
      id: Math.random().toString(36).substr(2, 9),
      dollName: doll.name,
      emoji: doll.emoji,
      timestamp: now,
      deviceName: deviceName,
      authorizedBy: user.isLoggedIn ? user.name : "Guest"
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
      setWinTimestamp(null);
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
    setWinTimestamp(null);
  };

  const refreshMachine = () => {
    const shuffled = [...dolls].sort(() => Math.random() - 0.5);
    setDolls(shuffled);
    resetGame();
  };

  const addManifestItem = () => {
    const newId = (dolls.length + 1).toString();
    const newDoll: Doll = {
      id: newId,
      name: `New Mystery Figure ${newId}`,
      color: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
      emoji: '🎁',
      isLiked: false
    };
    setDolls(prev => [...prev, newDoll]);
  };

  const removeManifestItem = (id: string) => {
    if (dolls.length <= 1) return;
    setDolls(prev => prev.filter(d => d.id !== id));
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
    const randomIndex = Math.floor(Math.random() * dolls.length);
    const selectedDoll = dolls[randomIndex];
    setCaughtDoll(selectedDoll);
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

  const addToPersistentCollection = (doll: Doll) => {
    const snapshot: FavoriteDoll = {
      ...doll,
      favId: Math.random().toString(36).substr(2, 9),
      isLiked: true
    };
    setFavorites(prev => [...prev, snapshot]);
    setDolls(prev => prev.map(d => d.id === doll.id ? { ...d, isLiked: true } : d));
    setTimeout(() => {
        setDolls(prev => prev.map(d => d.id === doll.id ? { ...d, isLiked: false } : d));
    }, 500);
  };

  const removeFromPersistentCollection = (favId: string) => {
    setFavorites(prev => prev.filter(f => f.favId !== favId));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('catch_history');
  };

  const isDataUrl = (str: string) => str?.startsWith('data:');

  const renderVisual = (source: string, sizeClass: string = "text-xl") => {
    if (source.startsWith('data:')) {
      return <img src={source} alt="visual" className="w-full h-full object-cover rounded-inherit" />;
    }
    return <span className={sizeClass}>{source || '🎁'}</span>;
  };

  return (
    <div className="min-h-screen p-4 md:p-6 flex flex-col items-center justify-start text-zinc-100 pb-20 overflow-x-hidden">
      
      {/* Profile Settings Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="w-full max-w-[420px] bg-white rounded-[2rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.9)] animate-in zoom-in-95 duration-200">
             <div className="p-10 pb-6 text-center bg-gray-50 border-b border-gray-100">
                <h2 className="text-2xl font-black text-black uppercase tracking-tighter">Profile Settings</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Customize Your Collector Identity</p>
             </div>
             <div className="p-10 space-y-8 bg-white">
                {/* Avatar Edit */}
                <div className="flex flex-col items-center gap-4">
                   <div className="relative group cursor-pointer" onClick={() => profilePhotoInputRef.current?.click()}>
                      <div className="w-32 h-32 rounded-full border-4 border-gray-100 overflow-hidden shadow-xl bg-gray-200">
                        <img src={editAvatar} alt="edit avatar" className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <Camera className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-black text-white p-2 rounded-full border-2 border-white shadow-lg">
                         <Upload className="w-4 h-4" />
                      </div>
                   </div>
                   <input 
                      type="file" 
                      ref={profilePhotoInputRef} 
                      onChange={handleProfilePhotoUpload} 
                      accept="image/*" 
                      className="hidden" 
                   />
                   <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Click photo to upload</p>
                </div>

                {/* Name Edit */}
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-black uppercase tracking-widest flex items-center gap-2">
                     <UserCircle className="w-4 h-4" /> Display Name
                   </label>
                   <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Collector Name"
                      className="w-full bg-gray-100 border-2 border-transparent rounded-xl px-5 py-4 text-black font-black focus:outline-none focus:border-black transition-all"
                   />
                </div>

                <div className="flex gap-4 pt-4">
                   <button 
                      onClick={() => setShowProfileModal(false)}
                      className="flex-1 bg-gray-100 text-black px-6 py-4 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-200 transition"
                   >
                     Discard
                   </button>
                   <button 
                      onClick={saveProfileChanges}
                      className="flex-1 bg-black text-white px-6 py-4 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-zinc-800 transition active:scale-95 flex items-center justify-center gap-2"
                   >
                     <Save className="w-4 h-4" /> Save
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* High-Contrast White/Black Google Login Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-3xl animate-in fade-in duration-300">
           <div className="w-full max-w-[420px] bg-white rounded-[1.5rem] overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200 flex flex-col">
              
              {isAuthenticating ? (
                <div className="p-16 flex flex-col items-center justify-center gap-6 bg-white">
                  <div className="w-16 h-16 border-4 border-gray-100 border-t-blue-600 rounded-full animate-spin"></div>
                  <div className="text-center">
                    <p className="text-lg font-black text-black">Authenticating Identity...</p>
                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Secure Browser Sync</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white flex flex-col min-h-[480px]">
                  <div className="p-10 pb-6 text-center">
                    <div className="w-14 h-14 mx-auto mb-8 bg-white rounded-full flex items-center justify-center shadow-md border border-gray-100">
                      <svg viewBox="0 0 24 24" width="28" height="28" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
                    </div>
                    
                    {authStep === 'PICKER' && (
                      <>
                        <h2 className="text-2xl font-black text-black mb-2 uppercase tracking-tight">Sign in</h2>
                        <p className="text-sm text-black/70 font-medium">to continue to Pop Mart Arcade</p>
                      </>
                    )}
                    {authStep === 'EMAIL' && (
                      <>
                        <h2 className="text-2xl font-black text-black mb-2 uppercase tracking-tight">Sign in</h2>
                        <p className="text-sm text-black/70 font-medium">Use your Google Account</p>
                      </>
                    )}
                    {authStep === 'PASSWORD' && (
                      <>
                        <h2 className="text-2xl font-black text-black mb-2 uppercase tracking-tight">Welcome</h2>
                        <div className="flex items-center justify-center gap-2 mt-4 bg-gray-50 border border-gray-100 py-2 px-4 rounded-full mx-auto w-fit">
                           <div className="w-6 h-6 rounded-full overflow-hidden border border-black/10">
                              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${emailInput || 'Master'}`} alt="user" />
                           </div>
                           <span className="text-sm font-black text-black">{emailInput}</span>
                           <ChevronDown className="w-4 h-4 text-black" />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="px-10 pb-10 flex-1 bg-white">
                    {authStep === 'PICKER' && (
                      <div className="space-y-3">
                        <button 
                          onClick={() => handleQuickLogin('master.collector@gmail.com', 'Anime Master')}
                          className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 rounded-xl transition border border-gray-100 group"
                        >
                          <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden border border-black/5 group-hover:scale-105 transition">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Master" alt="Master" />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-black text-black leading-none truncate uppercase">Anime Master</p>
                            <p className="text-xs text-gray-600 mt-1 truncate">master.collector@gmail.com</p>
                          </div>
                        </button>

                        <button 
                          onClick={goToEmailStep}
                          className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 rounded-xl transition border border-gray-100 group"
                        >
                          <div className="w-11 h-11 rounded-full bg-gray-50 flex items-center justify-center border border-gray-200 group-hover:scale-105 transition">
                             <UserPlus className="w-6 h-6 text-black" />
                          </div>
                          <p className="text-sm font-black text-black uppercase">Use another account</p>
                        </button>
                      </div>
                    )}

                    {authStep === 'EMAIL' && (
                      <div className="space-y-10">
                         <div className="relative group">
                            <input 
                              type="email" 
                              value={emailInput}
                              onChange={(e) => setEmailInput(e.target.value)}
                              autoFocus
                              placeholder="Email or phone"
                              className="w-full bg-black border-2 border-black rounded-xl px-4 py-4 text-white font-black focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all peer placeholder-transparent"
                            />
                            <label className="absolute left-4 -top-2.5 bg-white px-2 text-[12px] text-black font-black transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-black peer-focus:text-[12px] pointer-events-none uppercase tracking-widest">
                              Email or phone
                            </label>
                         </div>
                         <div className="flex flex-col gap-8">
                            <button className="text-blue-700 text-sm font-black text-left hover:underline w-fit uppercase">Forgot email?</button>
                            <div className="flex items-center justify-between gap-4">
                               <button onClick={() => setAuthStep('PICKER')} className="text-black text-sm font-black hover:bg-gray-100 px-6 py-3 rounded-xl transition uppercase">Back</button>
                               <button 
                                onClick={goToPasswordStep}
                                disabled={!emailInput}
                                className="bg-black text-white px-10 py-3 rounded-xl text-sm font-black shadow-xl hover:bg-zinc-900 disabled:opacity-30 transition active:scale-95 uppercase tracking-widest"
                               >
                                Next
                               </button>
                            </div>
                         </div>
                      </div>
                    )}

                    {authStep === 'PASSWORD' && (
                      <form onSubmit={handleFinalSignIn} className="space-y-10">
                         <div className="relative group">
                            <input 
                              type={showPassword ? 'text' : 'password'}
                              value={passwordInput}
                              onChange={(e) => setPasswordInput(e.target.value)}
                              autoFocus
                              placeholder="Enter your password"
                              className="w-full bg-black border-2 border-black rounded-xl px-4 py-4 text-white font-black focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all peer placeholder-transparent"
                            />
                            <label className="absolute left-4 -top-2.5 bg-white px-2 text-[12px] text-black font-black transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-black peer-focus:text-[12px] pointer-events-none uppercase tracking-widest">
                              Enter password
                            </label>
                         </div>
                         <div className="flex flex-col gap-8">
                            <div className="flex items-center gap-3">
                               <input 
                                  type="checkbox" 
                                  id="show-pass" 
                                  className="w-5 h-5 rounded border-gray-300 accent-black"
                                  checked={showPassword}
                                  onChange={(e) => setShowPassword(e.target.checked)}
                               />
                               <label htmlFor="show-pass" className="text-sm text-black font-black uppercase tracking-tight cursor-pointer">Show password</label>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                               <button type="button" onClick={() => setAuthStep('EMAIL')} className="text-black text-sm font-black hover:bg-gray-100 px-6 py-3 rounded-xl transition uppercase">Back</button>
                               <button 
                                type="submit"
                                disabled={!passwordInput}
                                className="bg-black text-white px-10 py-3 rounded-xl text-sm font-black shadow-xl hover:bg-zinc-900 disabled:opacity-30 transition active:scale-95 uppercase tracking-widest"
                               >
                                Sign in
                               </button>
                            </div>
                         </div>
                      </form>
                    )}
                  </div>
                  
                  <div className="mt-auto p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between px-10">
                    <div className="flex gap-6 text-[11px] text-black font-black uppercase tracking-widest">
                       <span className="hover:text-blue-700 cursor-pointer">Help</span>
                       <span className="hover:text-blue-700 cursor-pointer">Privacy</span>
                       <span className="hover:text-blue-700 cursor-pointer">Terms</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-black font-black uppercase">
                       <ShieldCheck className="w-4 h-4 text-black" />
                       Verified
                    </div>
                  </div>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Hidden File Input for Doll Customization */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Header UI */}
      <div className="w-full max-w-5xl mb-6 flex flex-col items-center gap-4">
        <div className="w-full flex justify-between items-center px-4 relative">
           <div className="flex items-center gap-2 bg-zinc-900/40 px-3 py-1 rounded-lg border border-white/5">
              <Laptop className="w-3 h-3 text-zinc-500" />
              <span className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Browser Context: {deviceName}</span>
           </div>
           
           {user.isLoggedIn ? (
             <div className="flex items-center gap-3 relative" ref={menuRef}>
                <div className="text-right hidden sm:block">
                  <p className="text-[9px] font-black text-zinc-200 uppercase leading-none">{user.name}</p>
                  <p className="text-[7px] text-zinc-500 italic truncate max-w-[120px]">{user.email}</p>
                </div>
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 bg-zinc-900/60 p-1.5 pl-2.5 rounded-full border border-white/10 hover:bg-zinc-800 transition shadow-xl"
                >
                   <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                   <div className="w-8 h-8 rounded-full border border-purple-500/30 overflow-hidden relative">
                      <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 right-0 w-2 h-2 bg-blue-500 rounded-full border border-zinc-900 animate-pulse"></div>
                   </div>
                </button>

                {showUserMenu && (
                  <div className="absolute top-full right-0 mt-3 w-64 bg-zinc-900 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[110] p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                     <div className="p-4 border-b border-white/5 mb-1 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                           <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20">
                              <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                           </div>
                           <div className="min-w-0">
                              <p className="text-[10px] font-black text-zinc-100 uppercase truncate">{user.name}</p>
                              <p className="text-[8px] text-zinc-500 truncate tracking-tighter">{user.email}</p>
                           </div>
                        </div>
                        <p className="text-[7px] text-zinc-600 italic uppercase tracking-widest flex items-center gap-1">
                           <Clock className="w-2 h-2" /> Session Started: {user.lastLogin}
                        </p>
                     </div>
                     <button 
                      onClick={openProfileSettings}
                      className="w-full flex items-center gap-3 px-3 py-3 hover:bg-zinc-800 rounded-xl text-zinc-300 transition group"
                     >
                        <Settings className="w-4 h-4 text-purple-400 group-hover:scale-110 transition" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Edit Profile Settings</span>
                     </button>
                     <button 
                      onClick={openAuthModal}
                      className="w-full flex items-center gap-3 px-3 py-3 hover:bg-zinc-800 rounded-xl text-zinc-300 transition group"
                     >
                        <UserPlus className="w-4 h-4 text-blue-400 group-hover:scale-110 transition" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Switch Google Identity</span>
                     </button>
                     <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-3 hover:bg-red-950/30 rounded-xl text-red-400 transition group"
                     >
                        <LogOut className="w-4 h-4 text-red-500 group-hover:scale-110 transition" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Sign Out & Disconnect</span>
                     </button>
                  </div>
                )}
             </div>
           ) : (
             <button 
              onClick={openAuthModal}
              className="group flex items-center gap-3 bg-white hover:bg-gray-50 text-black px-5 py-2.5 rounded-full text-[11px] font-black transition-all shadow-xl active:scale-95 border-2 border-transparent hover:border-black"
             >
                <div className="w-4 h-4 shrink-0">
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                </div>
                SIGN IN WITH GOOGLE
             </button>
           )}
        </div>

        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-300 to-indigo-400 italic tracking-tighter">
            CATCH & CHOOSE
          </h1>
          <div className="flex items-center justify-center gap-2 bg-zinc-900/60 px-5 py-2 rounded-full border border-white/5 shadow-inner mt-2">
             <Star className="w-4 h-4 text-yellow-500 fill-current animate-pulse" />
             <p className="text-[11px] font-bold text-zinc-300 italic tracking-wide">
               &ldquo;{announcer.text}&rdquo;
             </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start justify-center w-full max-w-[1400px]">
        
        {/* SIDEBAR: Records & Favorites */}
        <div className="lg:col-span-3 flex flex-col gap-6 order-2 lg:order-1">
          <div className="premium-glass p-5 rounded-[2rem] flex flex-col h-[320px] relative overflow-hidden">
             <div className="flex items-center justify-between mb-4 px-1 relative z-10">
                <h3 className="font-black text-[10px] uppercase tracking-widest text-purple-400 flex items-center gap-2">
                   <Clock className="w-4 h-4" /> Awards Vault
                </h3>
                {history.length > 0 && (
                  <button 
                    onClick={clearHistory} 
                    className="text-zinc-700 hover:text-red-400 transition transform hover:scale-110"
                    title="Clear All"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
             </div>
             <div className="flex-1 overflow-y-auto space-y-2 pr-1 relative z-10">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-10">
                    <Box className="w-12 h-12 mb-2" />
                    <p className="text-[8px] font-black uppercase">No Acquisitions</p>
                  </div>
                ) : (
                  history.map((record) => (
                    <div key={record.id} className="bg-zinc-900/60 p-3 rounded-2xl border border-white/5 flex items-center gap-3 hover:bg-zinc-800 transition group relative">
                       <div className="w-9 h-9 flex items-center justify-center shrink-0 overflow-hidden rounded-xl">
                          {renderVisual(record.emoji)}
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black truncate text-zinc-200 uppercase">{record.dollName}</p>
                          <div className="flex items-center gap-1.5 opacity-60">
                             <Laptop className="w-2 h-2" />
                             <p className="text-[7px] text-zinc-400 truncate tracking-tight uppercase">Auth: {record.authorizedBy}</p>
                          </div>
                          <p className="text-[7px] text-zinc-600 italic">{record.timestamp}</p>
                       </div>
                       <button 
                         onClick={() => deleteFromHistory(record.id)}
                         className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-zinc-950/50 text-zinc-500 hover:text-red-500 transition-all transform hover:scale-110"
                         title="Delete Entry"
                       >
                         <X className="w-4 h-4" />
                       </button>
                    </div>
                  ))
                )}
             </div>
          </div>

          <div className="premium-glass p-5 rounded-[2rem] relative overflow-hidden h-[320px] flex flex-col">
             <h3 className="font-black text-[10px] uppercase tracking-widest text-pink-400 mb-4 px-1 flex items-center gap-2 relative z-10">
                <Heart className="w-4 h-4 fill-current" /> Persistent Collection
             </h3>
             <div className="flex-1 overflow-y-auto space-y-2 pr-1 relative z-10">
                {favorites.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-10">
                    <Heart className="w-12 h-12 mb-2" />
                    <p className="text-[8px] font-black uppercase">Collection Empty</p>
                  </div>
                ) : (
                  favorites.map((fav) => (
                    <div key={fav.favId} className="bg-zinc-900/80 p-3 rounded-2xl border border-white/10 flex items-center gap-3 group">
                       <div className={`w-10 h-10 rounded-xl ${fav.color} flex items-center justify-center shadow-lg overflow-hidden shrink-0`}>
                          {renderVisual(fav.emoji, "text-xl")}
                       </div>
                       <p className="flex-1 text-[10px] font-black truncate uppercase text-zinc-300">{fav.name}</p>
                       <button 
                        onClick={() => removeFromPersistentCollection(fav.favId)} 
                        className="text-pink-500 hover:scale-125 transition p-1 hover:bg-pink-500/10 rounded-full"
                        title="Remove from Collection"
                       >
                          <Heart className="w-4 h-4 fill-current" />
                       </button>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>

        {/* CENTER: Arcade Machine */}
        <div className="lg:col-span-6 flex flex-col items-center order-1 lg:order-2 relative">
          <div className="relative w-full max-w-md aspect-[3/4] bg-zinc-900 border-[12px] border-zinc-800 rounded-[4rem] shadow-[0_50px_120px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col ring-4 ring-white/5 transition-all duration-500">
            <div className="flex-1 relative bg-gradient-to-b from-[#0f172a] to-[#020617] overflow-hidden">
               {status === 'COUNTDOWN' && (
                 <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-lg animate-in fade-in duration-300">
                    <div className="text-[12rem] font-black text-white italic drop-shadow-[0_0_60px_rgba(168,85,247,0.9)] scale-up">
                      {countdown}
                    </div>
                 </div>
               )}

               <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>
               
              <div 
                className="absolute z-30 transition-none"
                style={{ left: `${clawX}%`, top: 0 }}
              >
                <div className="w-2 claw-string mx-auto transition-all" style={{ height: `${clawY}%`, minHeight: '50px' }}></div>
                <div className="relative -mt-6 flex flex-col items-center">
                  <div className="w-20 h-14 bg-gradient-to-b from-zinc-500 to-zinc-800 rounded-b-2xl border-b-[6px] border-zinc-950 flex items-center justify-center shadow-2xl">
                    <div className="w-10 h-1 bg-purple-400 rounded-full animate-pulse shadow-[0_0_12px_#a855f7]"></div>
                  </div>
                  <div className="flex justify-between w-28 -mt-2 px-1 relative">
                    <div className={`w-4 h-16 bg-zinc-400 rounded-full origin-top transition-transform duration-500 shadow-xl ${status === 'DROPPING' || status === 'RETURNING' ? 'rotate-[-8deg]' : 'rotate-[-30deg]'}`}></div>
                    <div className={`w-4 h-16 bg-zinc-400 rounded-full origin-top transition-transform duration-500 shadow-xl ${status === 'DROPPING' || status === 'RETURNING' ? 'rotate-[8deg]' : 'rotate-[30deg]'}`}></div>
                  </div>
                  
                  {caughtDoll && (
                    <div className="absolute -bottom-20 animate-bounce z-50">
                      <div className={`w-20 h-20 rounded-[2rem] ${caughtDoll.color} flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.5)] border-4 border-white transform rotate-6 overflow-hidden`}>
                        {renderVisual(caughtDoll.emoji, "text-5xl")}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="absolute bottom-4 left-4 right-4 top-40 flex flex-wrap items-end justify-center gap-2 overflow-hidden pointer-events-none">
                {dolls.map((doll) => (
                  <div 
                    key={doll.id} 
                    className={`
                      relative transition-all duration-[1000ms]
                      ${status === 'RETURNING' && caughtDoll?.id === doll.id ? 'opacity-0 scale-0 -translate-y-96' : 'opacity-100 scale-100'}
                    `}
                  >
                    <div className={`
                      w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-[1rem] ${doll.color} 
                      flex items-center justify-center shadow-[0_10px_20px_rgba(0,0,0,0.8)] border-2 border-white/10 overflow-hidden
                    `}>
                      {renderVisual(doll.emoji, "text-xl sm:text-2xl md:text-3xl")}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-44 bg-zinc-800 border-t border-white/10 flex items-center justify-center p-10 gap-12">
               <button 
                onClick={handleStart}
                disabled={status !== 'IDLE'}
                className={`
                  w-28 h-28 rounded-[2.5rem] border-b-[10px] active:border-b-0 active:translate-y-2 transition-all flex flex-col items-center justify-center font-black text-[10px] tracking-widest
                  ${status === 'IDLE' 
                    ? 'bg-purple-600 border-purple-900 text-white shadow-[0_20px_50px_rgba(168,85,247,0.4)]' 
                    : 'bg-zinc-700 border-zinc-900 text-zinc-500 opacity-30 cursor-not-allowed'}
                `}
               >
                 <Play className="w-12 h-12 mb-2 fill-current" />
                 START
               </button>
               <button 
                onClick={handleStop}
                disabled={status !== 'MOVING'}
                className={`
                  w-28 h-28 rounded-[2.5rem] border-b-[10px] active:border-b-0 active:translate-y-2 transition-all flex flex-col items-center justify-center font-black text-[10px] tracking-widest
                  ${status === 'MOVING' 
                    ? 'bg-white border-zinc-300 text-zinc-900 shadow-[0_20px_50px_rgba(255,255,255,0.2)]' 
                    : 'bg-zinc-700 border-zinc-900 text-zinc-500 opacity-30 cursor-not-allowed'}
                `}
               >
                 <Square className="w-12 h-12 mb-2 fill-current" />
                 STOP
               </button>
            </div>
          </div>

          {status === 'WIN' && (
            <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl flex flex-col items-center justify-center z-[100] p-4 text-center animate-in zoom-in duration-500">
              <div className="w-full h-full flex flex-col items-center justify-center overflow-y-auto py-10 px-6">
                
                <div className="relative mb-8 flex justify-center group">
                   <Crown className="w-24 h-24 text-yellow-400 animate-float drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]" />
                   <Sparkles className="absolute -top-6 -right-6 w-16 h-16 text-indigo-400 animate-pulse" />
                   <Sparkle className="absolute -bottom-4 -left-8 w-10 h-10 text-pink-400 animate-bounce" />
                </div>
                
                <div className="relative mb-10 group">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-[3rem] blur-3xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className={`w-48 h-48 md:w-56 md:h-56 rounded-[3rem] ${caughtDoll?.color} mx-auto flex items-center justify-center shadow-[0_0_80px_rgba(255,255,255,0.3)] border-[6px] border-white transform rotate-3 scale-110 overflow-hidden relative z-10 transition-transform group-hover:rotate-6`}>
                    {renderVisual(caughtDoll?.emoji || "", "text-[8rem]")}
                  </div>
                </div>
                
                <div className="space-y-4 mb-10 relative z-10 w-full max-sm px-4 text-center">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-white to-yellow-500 italic uppercase tracking-tighter drop-shadow-sm">
                      Award Secured
                    </h2>
                    <div className="h-1 w-32 bg-gradient-to-r from-transparent via-yellow-400 to-transparent mx-auto"></div>
                  </div>

                  <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
                    <div className="space-y-1">
                      <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">Vinyl Figure Name</p>
                      <p className="text-2xl font-black text-zinc-100 uppercase tracking-tight leading-tight">
                        {caughtDoll?.name}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                      <div className="flex flex-col items-center gap-1">
                         <Award className="w-4 h-4 text-purple-400" />
                         <p className="text-[8px] text-zinc-500 uppercase font-black">Edition</p>
                         <p className="text-[10px] text-zinc-300 font-bold">Series A-01</p>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                         <Calendar className="w-4 h-4 text-indigo-400" />
                         <p className="text-[8px] text-zinc-500 uppercase font-black">Acquired</p>
                         <p className="text-[10px] text-zinc-300 font-bold">{winTimestamp?.split(',')[0] || 'Today'}</p>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col items-center gap-2 border-t border-white/5">
                        <div className="flex items-center gap-2">
                           <ShieldCheck className="w-3 h-3 text-blue-400" />
                           <p className="text-[8px] text-zinc-400 font-black uppercase tracking-tight">Verified Session: {user.isLoggedIn ? user.name : "Guest"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                           <Mail className="w-3 h-3 text-zinc-500" />
                           <p className="text-[7px] text-zinc-500 font-bold italic truncate max-w-[150px]">{user.isLoggedIn ? user.email : "Local Browser"}</p>
                        </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3 w-full max-w-sm relative z-10 px-4">
                  <button 
                    onClick={resetGame} 
                    className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800 text-white font-black py-6 rounded-[2rem] shadow-[0_20px_40px_rgba(79,70,229,0.3)] flex items-center justify-center gap-4 uppercase tracking-[0.4em] text-[12px] border border-white/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    <RefreshCcw className="w-6 h-6 animate-spin-slow" /> 
                    Continue Chase
                  </button>
                  <button className="flex items-center justify-center gap-2 text-[10px] font-black uppercase text-zinc-600 hover:text-zinc-400 transition tracking-widest py-2">
                    <Share2 className="w-4 h-4" /> Export Award
                  </button>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR: Editor (Manifest) */}
        <div className="lg:col-span-3 flex flex-col gap-6 order-3">
          <div className="premium-glass p-6 rounded-[2rem] shadow-xl relative flex flex-col h-[660px]">
            <div className="flex items-center justify-between mb-6 shrink-0 relative z-10">
              <h3 className="text-purple-300 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                <Settings className="w-4 h-4" /> Manifest ({dolls.length})
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={addManifestItem}
                  className="p-1.5 rounded-lg bg-green-900/40 hover:bg-green-800/60 text-green-400 border border-green-500/30 transition-all hover:scale-110"
                  title="Add New Figure"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button 
                  onClick={refreshMachine}
                  className="p-1.5 rounded-lg bg-zinc-900/50 hover:bg-zinc-800 text-purple-400 border border-purple-500/30 transition-all hover:rotate-180 duration-500"
                  title="Shuffle Machine"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2 relative z-10 custom-scroll">
              {dolls.map((doll) => (
                <div key={doll.id} className="flex flex-col gap-1.5 group/item bg-white/5 p-3 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className={`w-11 h-11 shrink-0 rounded-xl ${doll.color} flex items-center justify-center shadow-lg border border-white/10 overflow-hidden`}>
                        {renderVisual(doll.emoji, "text-2xl")}
                      </div>
                      <button 
                        onClick={() => triggerFileInput(doll.id)}
                        className="absolute -bottom-1 -right-1 p-1 bg-zinc-900 rounded-full border border-white/20 text-purple-400 hover:text-white transition shadow-lg"
                        title="Upload Photo"
                      >
                        <Upload className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">A-{doll.id}</span>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => addToPersistentCollection(doll)} 
                                className={`transition-all hover:scale-125 text-zinc-700 hover:text-pink-400 ${doll.isLiked ? 'text-pink-500 scale-125' : ''}`}
                                title="Save Snapshot"
                            >
                                <Heart className="w-3.5 h-3.5 fill-current" />
                            </button>
                            <button 
                                onClick={() => removeManifestItem(doll.id)}
                                className="transition-all hover:scale-125 text-zinc-700 hover:text-red-400"
                                title="Delete Entry"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                      </div>
                      <input 
                        type="text" 
                        value={doll.name}
                        onChange={(e) => updateDoll(doll.id, { name: e.target.value })}
                        className="w-full bg-zinc-950/40 px-3 py-2 rounded-xl border-b border-zinc-800 text-[10px] font-black focus:outline-none focus:border-purple-500 text-zinc-300 uppercase tracking-tight transition-all"
                        placeholder="Award Name"
                      />
                    </div>
                  </div>
                  <input 
                    type="text"
                    value={doll.emoji.startsWith('data:') ? "[Custom Asset]" : doll.emoji}
                    onChange={(e) => updateDoll(doll.id, { emoji: e.target.value })}
                    className="w-full mt-1 bg-zinc-950/30 px-3 py-1.5 rounded-lg border border-white/5 text-[8px] text-zinc-600 focus:text-zinc-200"
                    placeholder="Emoji code..."
                    disabled={doll.emoji.startsWith('data:')}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-zinc-800/80 to-zinc-950/80 p-6 rounded-[2rem] border border-white/5 text-[9px] font-bold text-zinc-400 italic flex items-center gap-4">
             <Gem className="w-5 h-5 text-indigo-400 shrink-0" />
             <p>Real-Feel Security. Sign in with any Gmail handle to establish a persistent session linked to your specific browser profile.</p>
          </div>
        </div>

      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 text-[8px] font-black text-zinc-900 uppercase tracking-[2em] text-center opacity-30 pointer-events-none">
         Pop Mart // Premium Edition
      </div>
    </div>
  );
}
