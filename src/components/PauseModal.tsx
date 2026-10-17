import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX, Sliders, Palette } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenHangar?: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onMenu,
  isMuted,
  onToggleMute,
  onOpenHangar,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 p-6 md:p-8 rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.9)] text-center">
        <div className="text-[10px] font-mono-numbers text-cyan-400 tracking-[0.3em] uppercase font-bold">
          // SIMULATION SUSPENDED //
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider mt-1 mb-6">
          TACTICAL PAUSE
        </h2>

        {/* Audio & Hangar quick panel */}
        <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xs mb-6 text-left space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono-numbers text-neutral-300 uppercase tracking-wider font-semibold flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              AUDIO SYNTHESIZER
            </span>
            <button
              onClick={onToggleMute}
              className="px-2.5 py-1 rounded border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-xs font-mono-numbers flex items-center gap-1.5 cursor-pointer text-cyan-300"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{isMuted ? 'UNMUTE' : 'MUTE'}</span>
            </button>
          </div>

          {onOpenHangar && (
            <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
              <span className="text-xs font-mono-numbers text-neutral-300 uppercase tracking-wider font-semibold flex items-center gap-2">
                <Palette className="w-3.5 h-3.5 text-cyan-400" />
                HOVER CHASSIS
              </span>
              <button
                onClick={onOpenHangar}
                className="px-2.5 py-1 rounded border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/60 text-xs font-mono-numbers text-cyan-300 flex items-center gap-1 cursor-pointer font-bold"
              >
                CUSTOMIZE SKINS
              </button>
            </div>
          )}
        </div>

        {/* Controls Cheatsheet */}
        <div className="text-left text-xs font-mono-numbers text-neutral-400 mb-6 p-3 bg-neutral-900/40 border border-neutral-900 rounded-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-neutral-500">NAVIGATION:</span>
            <span className="text-neutral-200">WASD / ARROW KEYS</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">PRIMARY FIRE:</span>
            <span className="text-neutral-200">LEFT CLICK / SPACE</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">KINETIC DASH:</span>
            <span className="text-neutral-200">SHIFT / RIGHT CLICK</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">EMP SHOCKWAVE:</span>
            <span className="text-neutral-200">E / Q</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onResume}
            className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(0,229,255,0.4)]"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>RESUME SIMULATION</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onRestart}
              className="flex-1 py-2.5 border border-neutral-800 hover:border-neutral-700 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESTART</span>
            </button>
            <button
              onClick={onMenu}
              className="flex-1 py-2.5 border border-neutral-800 hover:border-neutral-700 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>TITLE SCREEN</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
