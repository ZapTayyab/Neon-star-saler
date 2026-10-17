import React from 'react';
import { Volume2, VolumeX, Shield, Play, Palette } from 'lucide-react';

interface TitleScreenProps {
  onStart: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenHangar: () => void;
  currentSkinName?: string;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  isMuted,
  onToggleMute,
  onOpenHangar,
  currentSkinName = 'Cyan Striker',
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-8 md:p-12 z-20 select-none">
      {/* Top Header info */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded border border-cyan-500/40 bg-cyan-950/40 flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
          </div>
          <div className="text-left">
            <div className="text-[10px] sm:text-xs tracking-widest text-cyan-400/80 font-bold uppercase font-mono-numbers">
              TACTICAL ARENA SIMULATOR // v2.5
            </div>
            <div className="text-[9px] sm:text-[10px] tracking-wider text-neutral-400 uppercase hidden xs:block">
              SECTOR WARP & CHASSIS HANGAR ONLINE
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onOpenHangar}
            className="p-2 sm:px-3 sm:py-2 rounded border border-cyan-500/40 bg-slate-900/80 hover:bg-cyan-500/10 hover:border-cyan-400 text-cyan-300 transition-all flex items-center gap-2 text-xs font-mono shadow-[0_0_12px_rgba(0,240,255,0.15)]"
            title="Customize Mech Skins"
          >
            <Palette className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline uppercase text-[11px] font-bold">
              HANGAR ({currentSkinName})
            </span>
          </button>

          <button
            onClick={onToggleMute}
            className="p-2 sm:p-2.5 rounded border border-neutral-800 bg-neutral-900/80 hover:bg-neutral-800 hover:border-cyan-500/50 text-neutral-300 hover:text-cyan-400 transition-colors flex items-center gap-1.5 sm:gap-2 text-xs"
            title="Toggle Audio"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            <span className="hidden sm:inline uppercase text-[11px] font-mono-numbers">
              {isMuted ? 'MUTED' : 'SYNTH ON'}
            </span>
          </button>
        </div>
      </div>

      {/* Center Title Lockup */}
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center mt-auto mb-auto px-2">
        <div className="relative w-full max-w-lg mb-3 sm:mb-4">
          <svg
            viewBox="0 0 600 130"
            className="w-full h-auto"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M30 65 L100 10 L500 10 L570 65 L500 120 L100 120 Z"
              stroke="#00e5ff"
              strokeWidth="1.5"
              strokeOpacity="0.4"
              strokeDasharray="8 4"
            />
            <path
              d="M70 65 L115 25 L485 25 L530 65 L485 105 L115 105 Z"
              fill="#00e5ff"
              fillOpacity="0.06"
              stroke="#00e5ff"
              strokeWidth="0.75"
              strokeOpacity="0.3"
            />
            <text
              x="300"
              y="62"
              textAnchor="middle"
              className="font-black italic uppercase"
              fill="#ffffff"
              fontSize="44"
              letterSpacing="6"
              style={{ fontFamily: "'Chakra Petch', sans-serif" }}
            >
              NEON VANGUARD
            </text>
            <text
              x="300"
              y="94"
              textAnchor="middle"
              className="font-bold tracking-[0.4em] uppercase"
              fill="#00f0ff"
              fontSize="16"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              — QUANTUM PROTOCOL —
            </text>
            <line x1="20" y1="65" x2="60" y2="65" stroke="#00e5ff" strokeWidth="2" strokeOpacity="0.8" />
            <line x1="540" y1="65" x2="580" y2="65" stroke="#00e5ff" strokeWidth="2" strokeOpacity="0.8" />
            <circle cx="60" cy="65" r="3" fill="#00e5ff" />
            <circle cx="540" cy="65" r="3" fill="#00e5ff" />
          </svg>
        </div>

        <p className="text-neutral-400 text-xs sm:text-sm max-w-md mx-auto mb-6 sm:mb-8 font-mono-numbers px-2">
          Pilot the Mark-IV Hover-Mech through escalating sectors. Clear incursions, enter Quantum Portals to warp to new levels, and customize your combat chassis.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onStart}
            className="pointer-events-auto group relative px-8 sm:px-10 py-3.5 sm:py-4 bg-cyan-500 hover:bg-cyan-400 border border-cyan-300 text-black font-bold tracking-widest uppercase transition-all duration-150 active:scale-95 cursor-pointer flex items-center gap-2.5 sm:gap-3 rounded-xs shadow-[0_0_20px_rgba(0,229,255,0.4)]"
          >
            <Play className="w-5 h-5 fill-black" />
            <span className="text-sm sm:text-base tracking-[0.2em]">ENGAGE SIMULATION</span>
          </button>

          <button
            onClick={onOpenHangar}
            className="pointer-events-auto px-6 py-3.5 sm:py-4 bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 font-bold tracking-widest uppercase transition-all duration-150 active:scale-95 cursor-pointer flex items-center gap-2 rounded-xs shadow-[0_0_15px_rgba(0,229,255,0.15)] text-xs sm:text-sm font-mono"
          >
            <Palette className="w-4 h-4 text-cyan-400" />
            <span>MECH SKINS</span>
          </button>
        </div>

        <div className="mt-3 sm:mt-4 text-[10px] sm:text-[11px] text-cyan-400/80 font-mono-numbers tracking-widest">
          TAP START OR PRESS [ENTER / SPACE]
        </div>
      </div>

      {/* Control hints */}
      <div className="w-full text-center">
        <div className="inline-block px-4 py-1.5 sm:px-5 sm:py-2 rounded-full border border-neutral-800 bg-neutral-950/90 text-[10px] sm:text-[11px] text-neutral-400 font-mono-numbers tracking-wider max-w-full truncate">
          <span className="hidden md:inline">
            <span className="text-neutral-200 font-semibold">WASD / ARROWS</span> Move · <span className="text-neutral-200 font-semibold">CLICK / SPACE</span> Action · <span className="text-neutral-200 font-semibold">SHIFT</span> Kinetic Dash · <span className="text-neutral-200 font-semibold">E</span> EMP · <span className="text-neutral-200 font-semibold">ESC</span> Pause
          </span>
          <span className="md:hidden">
            <span className="text-neutral-200 font-semibold">LEFT THUMB</span> Move · <span className="text-neutral-200 font-semibold">AUTO-AIM</span> Active · <span className="text-neutral-200 font-semibold">DASH & EMP</span> Buttons
          </span>
        </div>
      </div>
    </div>
  );
};
