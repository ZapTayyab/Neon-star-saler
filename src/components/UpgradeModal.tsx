import React, { useEffect } from 'react';
import { Target, Zap, Shield, Sparkles, Heart, Cpu, Radio, AlertTriangle } from 'lucide-react';
import { UpgradeOption } from '../game/types';

interface UpgradeModalProps {
  upgrades: UpgradeOption[];
  onSelect: (upgradeId: string) => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ upgrades, onSelect }) => {
  // Allow picking via 1, 2, 3 key, or Enter/Space for first item or emergency fallback
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '1' && upgrades[0]) {
        onSelect(upgrades[0].id);
      } else if (e.key === '2' && upgrades[1]) {
        onSelect(upgrades[1].id);
      } else if (e.key === '3' && upgrades[2]) {
        onSelect(upgrades[2].id);
      } else if ((e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') && upgrades.length === 0) {
        onSelect('overclock_hull');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [upgrades, onSelect]);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'target':
        return <Target className="w-6 h-6 text-cyan-400" />;
      case 'zap':
        return <Zap className="w-6 h-6 text-amber-400" />;
      case 'shield':
        return <Shield className="w-6 h-6 text-blue-400" />;
      case 'sparkles':
        return <Sparkles className="w-6 h-6 text-purple-400" />;
      case 'heart':
        return <Heart className="w-6 h-6 text-emerald-400" />;
      case 'cpu':
        return <Cpu className="w-6 h-6 text-cyan-300" />;
      case 'radio':
        return <Radio className="w-6 h-6 text-rose-400" />;
      default:
        return <Sparkles className="w-6 h-6 text-cyan-400" />;
    }
  };

  const getRarityBadge = (rarity: UpgradeOption['rarity']) => {
    switch (rarity) {
      case 'legendary':
        return 'text-amber-400 border-amber-500/50 bg-amber-950/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]';
      case 'epic':
        return 'text-purple-400 border-purple-500/50 bg-purple-950/40 shadow-[0_0_12px_rgba(168,85,247,0.25)]';
      case 'rare':
        return 'text-cyan-400 border-cyan-500/50 bg-cyan-950/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]';
      default:
        return 'text-neutral-400 border-neutral-700 bg-neutral-900';
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-neutral-950 border border-cyan-500/30 p-4 sm:p-6 md:p-8 rounded-sm shadow-[0_0_60px_rgba(0,240,255,0.15)] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="text-center mb-5 sm:mb-7">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-[10px] sm:text-[11px] font-mono-numbers text-cyan-300 uppercase tracking-widest font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            // TACTICAL SYSTEM OVERCLOCK DETECTED //
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white uppercase tracking-wider mt-2">
            SELECT COMBAT PROTOCOL
          </h2>
          <p className="text-[11px] sm:text-xs text-neutral-400 font-mono-numbers mt-1">
            TAP CARD OR PRESS KEY [1 - 3] TO INSTALL INTO MARK-IV CHASSIS
          </p>
        </div>

        {/* Upgrade Cards Grid */}
        {upgrades.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {upgrades.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className="group relative flex flex-col items-start p-4 bg-neutral-900/90 hover:bg-neutral-850 border border-neutral-800 hover:border-cyan-400 transition-all duration-150 text-left rounded-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[0_0_20px_rgba(0,240,255,0.2)]"
              >
                {/* Shortcut badge */}
                <div className="absolute top-3 right-3 text-[10px] font-mono-numbers px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 group-hover:text-cyan-300 group-hover:bg-cyan-950 border border-neutral-700 group-hover:border-cyan-500 font-bold">
                  [{idx + 1}]
                </div>

                {/* Icon */}
                <div className="mb-3 p-2.5 rounded bg-neutral-950 border border-neutral-800 group-hover:border-cyan-500/50 group-hover:bg-cyan-950/20 transition-colors">
                  {getIcon(item.icon)}
                </div>

                {/* Rarity & Level */}
                <div
                  className={`text-[9px] font-mono-numbers font-bold uppercase tracking-widest px-2 py-0.5 rounded border mb-2 ${getRarityBadge(
                    item.rarity
                  )}`}
                >
                  {item.rarity} · {item.maxLevel > 10 ? 'OVERCLOCK' : `LVL ${item.level + 1}/${item.maxLevel}`}
                </div>

                <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-300 transition-colors uppercase tracking-wide">
                  {item.title}
                </h3>

                <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                  {item.description}
                </p>

                <div className="mt-4 pt-2 w-full border-t border-neutral-800/80 flex items-center justify-between text-[10px] font-mono-numbers text-neutral-500 group-hover:text-cyan-400 font-bold uppercase tracking-wider">
                  <span>INSTALL PROTOCOL</span>
                  <span>→</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* Emergency Fallback Safeguard (Guarantees player is never trapped) */
          <div className="flex flex-col items-center justify-center p-6 border border-amber-500/40 bg-amber-950/20 rounded-sm text-center">
            <AlertTriangle className="w-10 h-10 text-amber-400 mb-2 animate-bounce" />
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">
              TACTICAL SUBSYSTEM SATURATION
            </h3>
            <p className="text-xs text-neutral-400 max-w-md mt-1 mb-5">
              All primary weapon protocols have reached maximum operational overclock. Triggering emergency field restoration and core damage surge.
            </p>
            <button
              onClick={() => onSelect('overclock_hull')}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-cyan-500 text-black font-black text-xs uppercase tracking-widest rounded-sm hover:opacity-90 cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.4)]"
            >
              [ENTER] RESTORE HULL & RESUME COMBAT
            </button>
          </div>
        )}

        {/* Bottom Status / Manual Resume Bar */}
        <div className="mt-5 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-[10px] font-mono-numbers text-neutral-500">
          <span>MK-IV COMBAT OS v4.2 // ALL OVERCLOCKS PERMANENT</span>
          {upgrades.length === 0 && (
            <button
              onClick={() => onSelect('overclock_hull')}
              className="text-cyan-400 hover:underline uppercase cursor-pointer"
            >
              Force Continue →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
