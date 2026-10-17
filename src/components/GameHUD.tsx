import React, { useEffect, useRef, useState } from 'react';
import {
  Shield,
  Zap,
  Radio,
  Volume2,
  VolumeX,
  Pause,
  Crosshair,
  Flame,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { PlayerStats } from '../game/types';

interface GameHUDProps {
  stats: PlayerStats;
  bossHpRatio?: number | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  stats,
  bossHpRatio,
  isMuted,
  onToggleMute,
  onPause,
}) => {
  const hpPercent = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));
  const shieldPercent = Math.max(0, Math.min(100, (stats.shield / stats.maxShield) * 100));
  const xpPercent = Math.max(0, Math.min(100, (stats.xp / stats.xpToNextLevel) * 100));
  const isEmpReady = stats.empCharge >= 100;

  // Combo Streak & Multiplier Telemetry
  const combo = stats.combo || 0;
  const comboMultiplier = stats.comboMultiplier || 1.0;
  const comboTimer = stats.comboTimer || 0;
  const timerRatio = Math.max(0, Math.min(1, comboTimer / 3.5));
  const effectiveDamage = Math.round(stats.bulletDamage * comboMultiplier);
  const damageBonusPercent = Math.round((comboMultiplier - 1.0) * 100);

  // Visceral Punch Animation on Combo Hit
  const [isPunched, setIsPunched] = useState(false);
  const prevComboRef = useRef(combo);

  useEffect(() => {
    if (combo > prevComboRef.current) {
      setIsPunched(true);
      const timer = setTimeout(() => setIsPunched(false), 220);
      prevComboRef.current = combo;
      return () => clearTimeout(timer);
    }
    prevComboRef.current = combo;
  }, [combo]);

  // Streak Tiers Configuration (Glow, Colors, Labels, Scale)
  let tierLevel = 0;
  let tierName = 'BASELINE';
  let tierTextColor = 'text-cyan-400';
  let tierBorderColor = 'border-cyan-900/60';
  let tierBgColor = 'bg-neutral-950/85';
  let tierGlowShadow = 'shadow-[0_0_12px_rgba(6,182,212,0.15)]';
  let barGradient = 'from-cyan-600 to-cyan-400';
  let badgeStyle = 'bg-cyan-950/70 text-cyan-400 border-cyan-800/50';
  let iconComponent = <Crosshair className="w-3.5 h-3.5 text-cyan-400" />;

  if (combo >= 20) {
    tierLevel = 4;
    tierName = 'APEX FURY';
    tierTextColor = 'text-fuchsia-300';
    tierBorderColor = 'border-fuchsia-400';
    tierBgColor = 'bg-gradient-to-br from-fuchsia-950/90 via-neutral-950/90 to-purple-950/90';
    tierGlowShadow =
      'shadow-[0_0_35px_rgba(217,70,239,0.85),0_0_15px_rgba(255,255,255,0.4),inset_0_0_15px_rgba(217,70,239,0.25)]';
    barGradient = 'from-fuchsia-600 via-rose-500 to-amber-300';
    badgeStyle = 'bg-fuchsia-950/90 text-fuchsia-300 border-fuchsia-400 animate-pulse';
    iconComponent = <Sparkles className="w-3.5 h-3.5 text-fuchsia-300 animate-spin" />;
  } else if (combo >= 10) {
    tierLevel = 3;
    tierName = 'HYPERDRIVE';
    tierTextColor = 'text-orange-400';
    tierBorderColor = 'border-orange-500';
    tierBgColor = 'bg-neutral-950/90';
    tierGlowShadow =
      'shadow-[0_0_26px_rgba(249,115,22,0.8),inset_0_0_12px_rgba(249,115,22,0.2)]';
    barGradient = 'from-orange-600 via-amber-500 to-yellow-300';
    badgeStyle = 'bg-orange-950/80 text-orange-300 border-orange-500/80';
    iconComponent = <Flame className="w-3.5 h-3.5 text-orange-400" />;
  } else if (combo >= 5) {
    tierLevel = 2;
    tierName = 'OVERDRIVE';
    tierTextColor = 'text-amber-300';
    tierBorderColor = 'border-amber-400';
    tierBgColor = 'bg-neutral-950/90';
    tierGlowShadow =
      'shadow-[0_0_20px_rgba(245,158,11,0.65),inset_0_0_10px_rgba(245,158,11,0.15)]';
    barGradient = 'from-amber-600 to-amber-300';
    badgeStyle = 'bg-amber-950/80 text-amber-300 border-amber-500/70';
    iconComponent = <Zap className="w-3.5 h-3.5 text-amber-300" />;
  } else if (combo >= 2) {
    tierLevel = 1;
    tierName = 'RAMPING';
    tierTextColor = 'text-cyan-300';
    tierBorderColor = 'border-cyan-400/80';
    tierBgColor = 'bg-neutral-950/90';
    tierGlowShadow = 'shadow-[0_0_15px_rgba(6,182,212,0.45)]';
    barGradient = 'from-cyan-600 to-cyan-300';
    badgeStyle = 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60';
    iconComponent = <TrendingUp className="w-3.5 h-3.5 text-cyan-300" />;
  }

  // Dynamic transform scale based on streak + punch reaction
  const baseScale = 1.0 + Math.min(combo * 0.012, 0.24);
  const finalScale = isPunched ? baseScale * 1.12 : baseScale;

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-2.5 sm:p-4 md:p-6 z-10">
      {/* Top Bar Perimeter Cluster */}
      <div className="flex items-start justify-between w-full gap-2">
        {/* Top-Left: Health, Shield, Dash & EMP Cluster */}
        <div className="flex flex-col gap-1.5 w-36 sm:w-52 md:w-64">
          {/* Hull Integrity (HP) */}
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-mono-numbers">
              <span className="text-neutral-400 uppercase tracking-wider flex items-center gap-1 font-bold">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-xs bg-red-500 inline-block" />
                <span className="hidden xs:inline">HULL</span>
                <span className="xs:hidden">HP</span>
              </span>
              <span className="text-red-400 font-bold tabular-nums">
                {Math.ceil(stats.hp)}
              </span>
            </div>
            <div className="h-1.5 sm:h-2 w-full bg-neutral-900 border border-neutral-800 rounded-xs overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-150"
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          {/* Kinetic Shield */}
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-mono-numbers">
              <span className="text-neutral-400 uppercase tracking-wider flex items-center gap-1 font-bold">
                <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-cyan-400" />
                <span className="hidden xs:inline">SHIELD</span>
                <span className="xs:hidden">SH</span>
              </span>
              <span className="text-cyan-400 font-bold tabular-nums">
                {Math.ceil(stats.shield)}
              </span>
            </div>
            <div className="h-1.5 w-full bg-neutral-900 border border-neutral-800 rounded-xs overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-100"
                style={{ width: `${shieldPercent}%` }}
              />
            </div>
          </div>

          {/* Dash & EMP Status Row (compact on mobile) */}
          <div className="hidden sm:flex items-center justify-between pt-1 gap-2">
            {/* Dash Charges */}
            <div className="flex items-center gap-1.5 bg-neutral-950/90 border border-neutral-800/80 px-2 py-1 rounded-xs">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] font-mono-numbers text-neutral-400 uppercase">DASH</span>
              <div className="flex gap-1 ml-1">
                {Array.from({ length: stats.maxDashCharges }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3.5 h-3.5 rounded-xs border transition-colors ${
                      i < stats.dashCharges
                        ? 'bg-cyan-400 border-cyan-300 shadow-[0_0_8px_rgba(0,229,255,0.8)]'
                        : i === stats.dashCharges
                        ? 'bg-cyan-950/60 border-cyan-800'
                        : 'bg-neutral-900 border-neutral-800'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* EMP Overdrive */}
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-xs border transition-all ${
                isEmpReady
                  ? 'bg-amber-500/20 border-amber-400/80 text-amber-300'
                  : 'bg-neutral-950/90 border-neutral-800/80 text-neutral-400'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${isEmpReady ? 'text-amber-400' : 'text-neutral-500'}`} />
              <span className="text-[10px] font-mono-numbers uppercase tracking-wider font-bold">
                {isEmpReady ? '[E] EMP' : `${Math.floor(stats.empCharge)}%`}
              </span>
            </div>
          </div>
        </div>

        {/* Top-Center: Sector Level, Wave Info & Quantum Portal Waypoint */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Sector Level Badge */}
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 rounded-b-md border border-cyan-500/30 bg-neutral-950/90 shadow-[0_0_15px_rgba(0,240,255,0.15)] text-center">
              <span className="text-[8px] sm:text-[10px] font-mono-numbers tracking-wider font-bold text-cyan-400 uppercase">
                LEVEL {stats.sectorLevel || 1}
              </span>
              <span className="text-neutral-500 text-xs">/</span>
              <span className="text-[9px] sm:text-xs font-mono-numbers font-bold text-white tracking-wide uppercase truncate max-w-[110px] sm:max-w-[200px]">
                {stats.sectorName || 'Neon Core'}
              </span>
            </div>

            {/* Wave Counter */}
            <div className="px-2.5 sm:px-3.5 py-1 rounded-b-md border border-cyan-500/30 bg-neutral-950/90 text-center">
              <span className="text-[8px] sm:text-[10px] tracking-wider text-cyan-400 font-mono-numbers font-bold uppercase mr-1">
                WAVE
              </span>
              <span className="text-xs sm:text-base font-black text-white font-mono-numbers tabular-nums">
                {stats.wave.toString().padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Quantum Warp Portal Waypoint / Objective Alert */}
          {stats.portalActive && (
            <div className="animate-bounce flex items-center gap-2 px-3 sm:px-4 py-1 rounded-full border border-cyan-400 bg-cyan-950/90 text-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.4)]">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-[9px] sm:text-xs font-mono-numbers font-bold tracking-wider uppercase">
                PORTAL ACTIVE: WARP TO LEVEL {(stats.sectorLevel || 1) + 1}
              </span>
              {stats.portalDistance !== null && (
                <span className="text-[9px] sm:text-xs font-mono-numbers font-bold text-amber-300 bg-black/50 px-2 py-0.5 rounded-full border border-amber-400/40">
                  {stats.portalDistance}M
                </span>
              )}
            </div>
          )}

          {/* Tactical Arena Hazard Warning */}
          {stats.hazardTelegraphing && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-amber-500/70 bg-amber-950/85 text-amber-300 text-[8px] sm:text-[10px] font-mono-numbers font-bold tracking-wider animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.45)]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>TACTICAL HAZARD TELEGRAPHING // EVADE</span>
            </div>
          )}

          {/* Boss Bar if Boss is Active */}
          {bossHpRatio !== null && bossHpRatio !== undefined && (
            <div className="mt-1 w-48 sm:w-64 md:w-80 flex flex-col gap-0.5 items-center">
              <div className="flex justify-between w-full text-[9px] sm:text-[10px] font-mono-numbers tracking-wider text-red-400 font-bold uppercase">
                <span>TITAN APEX BOSS</span>
                <span className="tabular-nums">{Math.round(bossHpRatio * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-neutral-950 border border-red-500/50 rounded-xs overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 transition-all duration-100"
                  style={{ width: `${Math.max(0, bossHpRatio * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Top-Right: Controls, Score & XP Progression */}
        <div className="flex flex-col items-end gap-1 sm:gap-1.5">
          {/* Action buttons (Mute & Pause) */}
          <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
            <button
              onClick={onToggleMute}
              className="p-1.5 sm:p-2 rounded border border-neutral-800 bg-neutral-950/90 hover:bg-neutral-800 text-neutral-300 hover:text-cyan-400 transition-colors cursor-pointer"
              title="Toggle Audio"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />}
            </button>
            <button
              onClick={onPause}
              className="p-1.5 sm:p-2 rounded border border-neutral-800 bg-neutral-950/90 hover:bg-neutral-800 text-neutral-300 hover:text-cyan-400 transition-colors cursor-pointer"
              title="Pause Game"
            >
              <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Score Counter */}
          <div className="text-right">
            <div className="text-[9px] sm:text-[10px] tracking-widest text-neutral-400 font-mono-numbers uppercase font-semibold">
              SCORE
            </div>
            <div className="text-lg sm:text-2xl font-black text-cyan-300 font-mono-numbers tabular-nums tracking-wide">
              {stats.score.toLocaleString()}
            </div>
          </div>

          {/* Level & XP Progression */}
          <div className="w-32 sm:w-44 flex flex-col gap-0.5 sm:gap-1 text-right">
            <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-mono-numbers">
              <span className="text-cyan-400 font-bold uppercase">LVL {stats.level}</span>
              <span className="text-neutral-400 tabular-nums">
                {stats.xp} / {stats.xpToNextLevel} XP
              </span>
            </div>
            <div className="h-1.5 w-full bg-neutral-900 border border-neutral-800 rounded-xs overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-all duration-150"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Middle-Right Perimeter: PERSISTENT DAMAGE COMBO MULTIPLIER DISPLAY */}
      <div className="flex justify-end w-full my-auto pr-0 sm:pr-1">
        <div
          className={`relative flex flex-col gap-1.5 p-2 sm:p-2.5 rounded border transition-all duration-200 origin-right ${tierBgColor} ${tierBorderColor} ${tierGlowShadow}`}
          style={{
            transform: `scale(${finalScale})`,
            width: 'clamp(148px, 24vw, 210px)',
          }}
        >
          {/* Header Row: Tier Badge & Streak Count */}
          <div className="flex items-center justify-between gap-1 text-[9px] sm:text-[10px] font-mono-numbers">
            <div className="flex items-center gap-1 font-bold">
              {iconComponent}
              <span className={`px-1.5 py-0.5 rounded-xs border text-[8px] sm:text-[9px] tracking-wider uppercase font-black ${badgeStyle}`}>
                {tierName}
              </span>
            </div>
            <div className="flex items-center gap-0.5 font-bold tabular-nums">
              <span className="text-neutral-400 text-[8px] sm:text-[9px]">STREAK</span>
              <span className={`text-[10px] sm:text-[11px] ${tierTextColor}`}>
                {combo}
              </span>
            </div>
          </div>

          {/* Core Multiplier & Effective Damage Row */}
          <div className="flex items-baseline justify-between gap-2 border-y border-neutral-800/80 py-1">
            <div className="flex flex-col">
              <span className="text-[7px] sm:text-[8px] uppercase tracking-wider text-neutral-400 font-mono-numbers font-semibold">
                DMG BOOST
              </span>
              <span className="text-[9px] sm:text-[10px] text-neutral-300 font-mono-numbers font-bold">
                {damageBonusPercent > 0 ? `+${damageBonusPercent}%` : 'NORMAL'}
              </span>
            </div>

            <div className="text-right">
              <div
                className={`text-xl sm:text-2xl font-black font-mono-numbers tracking-tight tabular-nums transition-all ${tierTextColor}`}
                style={{
                  textShadow:
                    tierLevel >= 2
                      ? tierLevel >= 4
                        ? '0 0 16px rgba(217,70,239,0.9), 0 0 30px rgba(217,70,239,0.5)'
                        : tierLevel === 3
                        ? '0 0 14px rgba(249,115,22,0.85)'
                        : '0 0 10px rgba(245,158,11,0.7)'
                      : 'none',
                }}
              >
                {comboMultiplier.toFixed(1)}x
              </div>
            </div>
          </div>

          {/* Effective Output Readout */}
          <div className="flex items-center justify-between text-[8px] sm:text-[9px] font-mono-numbers text-neutral-400">
            <span>PER SHOT:</span>
            <span className="font-bold text-neutral-200 tabular-nums">
              <span className={`${tierTextColor}`}>{effectiveDamage}</span> DMG
            </span>
          </div>

          {/* Streak Window Countdown Timer Bar */}
          <div className="flex flex-col gap-0.5 pt-0.5">
            <div className="h-1 sm:h-1.5 w-full bg-neutral-900 border border-neutral-800/90 rounded-xs overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${barGradient} transition-all duration-75 ${
                  combo > 0 && comboTimer < 1.0 ? 'animate-pulse' : ''
                }`}
                style={{
                  width: `${combo > 0 ? timerRatio * 100 : 100}%`,
                  opacity: combo > 0 ? 1 : 0.35,
                }}
              />
            </div>
            <div className="flex justify-between items-center text-[7px] sm:text-[8px] font-mono-numbers text-neutral-500">
              <span>{combo > 0 ? `${comboTimer.toFixed(1)}s WINDOW` : 'READY'}</span>
              {/* 5 Milestone Pips */}
              <div className="flex gap-0.5">
                {[5, 10, 15, 20, 25].map((pipThreshold, idx) => (
                  <div
                    key={idx}
                    className={`w-1.5 h-1 rounded-xs transition-colors ${
                      combo >= pipThreshold
                        ? tierLevel >= 4
                          ? 'bg-fuchsia-400 shadow-[0_0_4px_#d946ef]'
                          : tierLevel >= 3
                          ? 'bg-orange-400 shadow-[0_0_4px_#f97316]'
                          : 'bg-amber-400 shadow-[0_0_4px_#f59e0b]'
                        : 'bg-neutral-800'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Perimeter: Weapon Telemetry Readout (Desktop & Tablets) */}
      <div className="hidden md:flex items-end justify-between w-full">
        <div className="flex items-center gap-3 bg-neutral-950/85 border border-neutral-800/80 px-3 py-1.5 rounded-xs text-[11px] font-mono-numbers text-neutral-300">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <Crosshair className="w-3.5 h-3.5" />
            <span className="font-bold">MK-IV CANNON</span>
          </div>
          <span className="text-neutral-600">|</span>
          <span className="text-neutral-400">
            SPREAD: <b className="text-white tabular-nums">{stats.bulletSpread}x</b>
          </span>
          <span className="text-neutral-600">|</span>
          <span className="text-neutral-400">
            PIERCE: <b className="text-white tabular-nums">{stats.pierceCount}</b>
          </span>
          <span className="text-neutral-600">|</span>
          <span className="text-neutral-400">
            COMBO MULTIPLIER:{' '}
            <b className={`${tierTextColor} font-black tabular-nums`}>
              {comboMultiplier.toFixed(1)}x
            </b>
          </span>
          {stats.orbitalDrones > 0 && (
            <>
              <span className="text-neutral-600">|</span>
              <span className="text-cyan-400">
                DRONES: <b className="text-white tabular-nums">{stats.orbitalDrones}</b>
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-mono-numbers">
          <span>
            KILLS: <b className="text-neutral-300 tabular-nums">{stats.kills}</b>
          </span>
          <span>·</span>
          <span>
            SPEED: <b className="text-neutral-300 tabular-nums">{Math.round(stats.moveSpeed)}</b>
          </span>
        </div>
      </div>
    </div>
  );
};
