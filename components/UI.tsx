import React from 'react';
import { ChevronLeft, Check, Play, Pause } from 'lucide-react';

export const BackButton = ({ onClick }: { onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="flex size-10 sm:size-11 items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 transition-colors text-slate-600 touch-manipulation"
  >
    <ChevronLeft size={24} />
  </button>
);

export const PrimaryButton = ({ children, onClick, icon: Icon, className = "", ...props }: any) => (
  <button 
    onClick={onClick}
    className={`w-full h-14 sm:h-16 bg-gold-gradient text-white text-base sm:text-lg font-serif font-bold rounded-full shadow-gold-soft hover:shadow-gold-glow hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 group border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none touch-manipulation ${className}`}
    {...props}
  >
    <span>{children}</span>
    {Icon && <Icon className="group-hover:translate-x-1 transition-transform" size={20} />}
  </button>
);

export const GoldCard = ({ children, className = "" }: any) => (
  <div className={`bg-white/95 border border-royal-gold/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02)] rounded-xl ${className}`}>
    {children}
  </div>
);

export const StepIndicator = ({ step, total, label }: { step: number; total: number; label: string }) => (
  <div className="px-1 mb-6">
    <div className="flex justify-between items-end mb-2">
      <p className="text-royal-gold font-bold text-sm tracking-wide font-sans">Step {step} of {total}</p>
      <p className="text-xs text-slate-400 font-medium font-sans">{label}</p>
    </div>
    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
      <div 
        className="h-full bg-royal-gold rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(212,175,55,0.5)]" 
        style={{ width: `${(step / total) * 100}%` }}
      ></div>
    </div>
  </div>
);

export const SongPlayer = ({ song, isPlaying, onToggle }: { song: any, isPlaying: boolean, onToggle: () => void }) => (
  <div className="bg-white/90 border border-white/50 rounded-2xl shadow-xl shadow-black/5 overflow-hidden ring-1 ring-black/5 backdrop-blur-xl pointer-events-auto w-full">
    <div className="h-1 w-full bg-royal-gold/10">
      <div className="h-full bg-royal-gold w-[30%] rounded-r-full relative"></div>
    </div>
    <div className="flex items-center gap-3 p-3 pr-4">
      <div className="bg-center bg-no-repeat bg-cover aspect-square rounded-lg size-12 shrink-0 shadow-sm" style={{ backgroundImage: `url(${song.coverUrl})` }}></div>
      <div className="flex flex-col justify-center flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-slate-800 text-sm font-bold leading-tight line-clamp-1">{song.title}</p>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-royal-gold text-white">PREVIEW</span>
        </div>
        <p className="text-slate-500 text-xs font-medium leading-tight line-clamp-1 mt-0.5">{song.artist}</p>
      </div>
      <button 
        onClick={onToggle}
        className="size-10 flex items-center justify-center rounded-full bg-royal-gold text-white hover:bg-royal-gold-dark transition-colors shadow-lg shadow-royal-gold/30 shrink-0"
      >
        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
      </button>
    </div>
  </div>
);