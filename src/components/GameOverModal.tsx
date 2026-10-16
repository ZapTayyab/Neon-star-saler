import React, { useEffect, useState } from 'react';
import { RotateCcw, Home, Award, Skull, Crosshair } from 'lucide-react';
import { PlayerStats } from '../game/types';

interface GameOverModalProps {
  stats: PlayerStats;
  onRestart: () => void;
  onMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ stats, onRestart, onMenu }) => {
  const [highScore, setHighScore] = useState<number>(0);

  useEffect(() => {
    const saved = localStorage.getItem('neon_vanguard_highscore');
    const prev = saved ? parseInt(saved, 10) : 0;
    if (stats.score > prev) {
      localStorage.setItem('neon_vanguard_highscore', stats.score.toString());
      setHighScore(stats.score);
    } else {
      setHighScore(prev);
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        onRestart();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [stats.score, onRestart]);

  const isNewRecord = stats.score >= highScore && stats.score > 0;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-4 bg-black/85">
      <div className="w-full max-w-lg max-h-[95vh] overflow-y-auto bg-neutral-950 border border-red-500/40 p-4 sm:p-6 md:p-8 rounded-sm shadow-[0_0_60px_rgba(239,68,68,0.25)] text-center">
        {/* Skull Icon */}
        <div className="w-12 h-12 mx-auto mb-4 rounded-full border border-red-500/50 bg-red-950/40 flex items-center justify-center text-red-400">
          <Skull className="w-6 h-6" />
        </div>

        <div className="text-[10px] font-mono-numbers text-red-400 tracking-[0.3em] uppercase font-bold">
          // SIGNAL TERMINATED //
        </div>

        <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-wider mt-1 mb-2">
          MECH DESTROYED
        </h2>

        {isNewRecord && (
          <div className="inline-block px-3 py-1 mb-4 rounded border border-amber-500/60 bg-amber-950/40 text-amber-300 text-xs font-mono-numbers tracking-widest font-bold">
            ★ NEW HIGH SCORE RECORD ★
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 my-6 font-mono-numbers">
          <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xs text-left">
            <div className="text-[10px] text-neutral-400 uppercase tracking-wider">FINAL SCORE</div>
            <div className="text-xl font-bold text-cyan-400 tabular-nums">{stats.score.toLocaleString()}</div>
          </div>

          <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xs text-left">
            <div className="text-[10px] text-neutral-400 uppercase tracking-wider">ALL-TIME BEST</div>
            <div className="text-xl font-bold text-amber-400 tabular-nums">{highScore.toLocaleString()}</div>
          </div>

          <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xs text-left">
            <div className="text-[10px] text-neutral-400 uppercase tracking-wider">WAVES REACHED</div>
            <div className="text-xl font-bold text-white tabular-nums">WAVE {stats.wave}</div>
          </div>

          <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xs text-left">
            <div className="text-[10px] text-neutral-400 uppercase tracking-wider">DRONES KILLED</div>
            <div className="text-xl font-bold text-white tabular-nums">{stats.kills}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onRestart}
            className="w-full sm:flex-1 py-3 px-6 bg-cyan-500 hover:bg-cyan-400 text-black font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,229,255,0.4)]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RE-ENGAGE [SPACE]</span>
          </button>

          <button
            onClick={onMenu}
            className="w-full sm:w-auto py-3 px-5 border border-neutral-800 hover:border-neutral-600 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>TITLE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
