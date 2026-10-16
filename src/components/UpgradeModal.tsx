import React, { useEffect } from 'react';
import { Target, Zap, Shield, Sparkles, Heart, Cpu, Radio } from 'lucide-react';
import { UpgradeOption } from '../game/types';

interface UpgradeModalProps {
  upgrades: UpgradeOption[];
  onSelect: (upgradeId: string) => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ upgrades, onSelect }) => {
  // Allow picking via 1, 2, 3 key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '1' && upgrades[0]) onSelect(upgrades[0].id);
      if (e.key === '2' && upgrades[1]) onSelect(upgrades[1].id);
      if (e.key === '3' && upgrades[2]) onSelect(upgrades[2].id);
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
        return 'text-amber-400 border-amber-500/50 bg-amber-950/40';
      case 'epic':
        return 'text-purple-400 border-purple-500/50 bg-purple-950/40';
      case 'rare':
        return 'text-cyan-400 border-cyan-500/50 bg-cyan-950/40';
      default:
        return 'text-neutral-400 border-neutral-700 bg-neutral-900';
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-4 bg-black/80">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-neutral-950 border border-neutral-800 p-4 sm:p-6 md:p-8 rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.9)]">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6">
          <div className="text-[10px] sm:text-[11px] font-mono-numbers text-cyan-400 uppercase tracking-widest font-bold">
            // TACTICAL SYSTEM OVERCLOCK DETECTED //
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white uppercase tracking-wider mt-1">
            SELECT COMBAT PROTOCOL
          </h2>
          <p className="text-[11px] sm:text-xs text-neutral-400 font-mono-numbers mt-1">
            TAP CARD OR PRESS [1 - 3] TO INSTALL INTO MARK-IV PLATFORM
          </p>
        </div>

        {/* Upgrade Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {upgrades.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className="group relative flex flex-col items-start p-4 bg-neutral-900/90 hover:bg-neutral-850 border border-neutral-800 hover:border-cyan-500 transition-all duration-150 text-left rounded-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              {/* Shortcut badge */}
              <div className="absolute top-3 right-3 text-[10px] font-mono-numbers px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 group-hover:text-cyan-400 group-hover:bg-cyan-950 border border-neutral-700 group-hover:border-cyan-700">
                [{idx + 1}]
              </div>

              {/* Icon & Rarity */}
              <div className="mb-3 p-2 rounded bg-neutral-950 border border-neutral-800 group-hover:border-cyan-500/50">
                {getIcon(item.icon)}
              </div>

              <div
                className={`text-[9px] font-mono-numbers font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border mb-1.5 ${getRarityBadge(
                  item.rarity
                )}`}
              >
                {item.rarity} · LVL {item.level + 1}/{item.maxLevel}
              </div>

              <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors uppercase tracking-wide">
                {item.title}
              </h3>

              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                {item.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
