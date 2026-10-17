import React from 'react';
import { X, Check, Shield, Zap, Sparkles, Award } from 'lucide-react';
import { MECH_SKINS, MechSkin } from '../game/skins';
import { sound } from '../game/audio';

interface MechHangarModalProps {
  currentSkinId: string;
  onSelectSkin: (skinId: string) => void;
  onClose: () => void;
}

export const MechHangarModal: React.FC<MechHangarModalProps> = ({
  currentSkinId,
  onSelectSkin,
  onClose,
}) => {
  const handleSelect = (skin: MechSkin) => {
    sound.playPickup();
    onSelectSkin(skin.id);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-950/95 border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.15)] overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-cyan-500/20 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-wider text-white uppercase">
                  Combat Mech Hangar
                </h2>
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                  {MECH_SKINS.length} SKINS AVAILABLE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Custom paint schemes and aerodynamic energy conduits for your combat hover-mech
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Skins Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MECH_SKINS.map((skin) => {
            const isEquipped = currentSkinId === skin.id;

            return (
              <div
                key={skin.id}
                onClick={() => handleSelect(skin)}
                className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                  isEquipped
                    ? 'border-cyan-400 bg-cyan-950/20 shadow-[0_0_20px_rgba(0,240,255,0.2)]'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
                }`}
              >
                {/* Rarity & Status Header */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded border ${skin.badgeColor}`}
                    >
                      {skin.rarity}
                    </span>
                    {isEquipped && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/30">
                        <Check className="w-3 h-3" /> EQUIPPED
                      </span>
                    )}
                  </div>

                  {/* Color Swatch Bar */}
                  <div className="flex items-center gap-1.5 mb-3 p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <div
                      className="w-5 h-5 rounded-md border border-white/20 shadow-sm"
                      style={{ backgroundColor: `#${skin.colors.hull.toString(16).padStart(6, '0')}` }}
                      title="Fuselage / Hull"
                    />
                    <div
                      className="w-5 h-5 rounded-md border border-white/20 shadow-sm"
                      style={{ backgroundColor: `#${skin.colors.trim.toString(16).padStart(6, '0')}` }}
                      title="Neon Trim"
                    />
                    <div
                      className="w-5 h-5 rounded-md border border-white/20 shadow-sm"
                      style={{ backgroundColor: `#${skin.colors.canopy.toString(16).padStart(6, '0')}` }}
                      title="Canopy Glass"
                    />
                    <div
                      className="w-5 h-5 rounded-md border border-white/20 shadow-sm"
                      style={{ backgroundColor: `#${skin.colors.trail.toString(16).padStart(6, '0')}` }}
                      title="Kinetic Dash Trail"
                    />
                    <div className="ml-auto text-[10px] font-mono text-slate-500">PALETTE</div>
                  </div>

                  {/* Title & Tagline */}
                  <h3 className="text-base font-bold text-white tracking-wide">{skin.name}</h3>
                  <div className="text-xs font-mono text-cyan-400/90 mb-2">{skin.tagline}</div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">{skin.description}</p>
                </div>

                {/* Footer perk & button */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-mono">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">{skin.bonusTag}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(skin);
                    }}
                    className={`text-xs px-3 py-1.5 rounded-lg font-mono font-bold transition-all ${
                      isEquipped
                        ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                        : 'bg-slate-800 hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-300'
                    }`}
                  >
                    {isEquipped ? 'ACTIVE' : 'EQUIP'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/80 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>Skins modify chassis materials, thruster flames, and kinetic dash trail visuals.</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold font-mono rounded-lg transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)]"
          >
            CONFIRM & RETURN
          </button>
        </div>
      </div>
    </div>
  );
};
