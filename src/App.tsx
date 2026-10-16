/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { GameEngine } from './game/engine';
import { sound } from './game/audio';
import { GameState, PlayerStats, UpgradeOption } from './game/types';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { UpgradeModal } from './components/UpgradeModal';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { TouchControls } from './components/TouchControls';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('title');
  const [stats, setStats] = useState<PlayerStats>({
    maxHp: 100,
    hp: 100,
    maxShield: 60,
    shield: 60,
    shieldRegenRate: 15,
    shieldDelayTimer: 0,
    moveSpeed: 14,
    dashCharges: 2,
    maxDashCharges: 2,
    dashCooldown: 2.8,
    dashTimer: 0,
    isDashing: false,
    dashTimeRemaining: 0,
    empCharge: 100,
    score: 0,
    combo: 0,
    comboTimer: 0,
    comboMultiplier: 1.0,
    wave: 1,
    xp: 0,
    xpToNextLevel: 100,
    level: 1,
    kills: 0,
    bulletSpread: 1,
    fireRate: 6.5,
    bulletDamage: 32,
    pierceCount: 1,
    chainLightning: false,
    orbitalDrones: 0,
    siphonChance: 0,
  });

  const [bossHpRatio, setBossHpRatio] = useState<number | null>(null);
  const [availableUpgrades, setAvailableUpgrades] = useState<UpgradeOption[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());

  // Keep references to state callbacks to avoid recreating the engine
  const callbacksRef = useRef({
    onStatsUpdate: (newStats: PlayerStats) => {
      setStats(newStats);
      if (engineRef.current && engineRef.current.bossHpRatio !== undefined) {
        setBossHpRatio(
          engineRef.current.playerStats.wave % 5 === 0 && engineRef.current.bossHpRatio > 0
            ? engineRef.current.bossHpRatio
            : null
        );
      }
    },
    onStateChange: (newState: GameState) => {
      setGameState(newState);
      if (newState === 'playing' && engineRef.current?.playerStats.wave && engineRef.current.playerStats.wave % 5 === 1 && engineRef.current.playerStats.wave > 1) {
        // Celebrate boss clear with confetti
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00f0ff', '#38bdf8', '#f59e0b'],
        });
      }
    },
    onUpgradePrompt: (upgrades: UpgradeOption[]) => {
      setAvailableUpgrades(upgrades);
    },
  });

  // Stable WebGL Canvas initialization inside dedicated ref container
  useEffect(() => {
    if (!mountRef.current) return;

    const engine = new GameEngine(mountRef.current, {
      onStatsUpdate: (s) => callbacksRef.current.onStatsUpdate(s),
      onStateChange: (st) => callbacksRef.current.onStateChange(st),
      onUpgradePrompt: (upg) => callbacksRef.current.onUpgradePrompt(upg),
    });

    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const [autoFire, setAutoFire] = useState<boolean>(false);
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);

  useEffect(() => {
    const checkTouch = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 1024;
      setIsTouchDevice(hasTouch);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    window.addEventListener('touchstart', () => setIsTouchDevice(true), { once: true });
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  const handleVirtualMove = useCallback((x: number, z: number) => {
    if (engineRef.current) {
      engineRef.current.setVirtualMove(x, z);
    }
  }, []);

  const handleVirtualAim = useCallback((x: number, z: number, active: boolean) => {
    if (engineRef.current) {
      engineRef.current.setVirtualAim(x, z, active);
    }
  }, []);

  const handleSetFiring = useCallback((firing: boolean) => {
    if (engineRef.current) {
      engineRef.current.setVirtualFiring(firing);
    }
  }, []);

  const handleToggleAutoFire = useCallback(() => {
    if (engineRef.current) {
      const next = engineRef.current.toggleAutoFire();
      setAutoFire(next);
      return next;
    }
    return true;
  }, []);

  const handleStartGame = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.startGame();
    }
  }, []);

  const handleResumeGame = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.setGameState('playing');
    }
  }, []);

  const handleRestartGame = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.startGame();
    }
  }, []);

  const handleMenu = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.resetStats();
      engineRef.current.setGameState('title');
    }
  }, []);

  const handleSelectUpgrade = useCallback((upgradeId: string) => {
    if (engineRef.current) {
      engineRef.current.applyUpgrade(upgradeId);
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  }, []);

  const handlePause = useCallback(() => {
    if (engineRef.current && gameState === 'playing') {
      engineRef.current.setGameState('paused');
    }
  }, [gameState]);

  const handleDash = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.triggerDash();
    }
  }, []);

  const handleEMP = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.triggerEMP();
    }
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black font-sans select-none touch-none">
      {/* Isolated WebGL Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0 cursor-crosshair touch-none" />

      {/* Game Shell Screens & Modals */}
      {gameState === 'title' && (
        <TitleScreen
          onStart={handleStartGame}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {(gameState === 'playing' || gameState === 'upgrade' || gameState === 'paused') && (
        <GameHUD
          stats={stats}
          bossHpRatio={bossHpRatio}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onPause={handlePause}
        />
      )}

      {gameState === 'playing' && isTouchDevice && (
        <TouchControls
          onMove={handleVirtualMove}
          onAim={handleVirtualAim}
          onDash={handleDash}
          onEMP={handleEMP}
          onToggleAutoFire={handleToggleAutoFire}
          onSetFiring={handleSetFiring}
          isEmpReady={stats.empCharge >= 100}
          empCharge={stats.empCharge}
          dashCharges={stats.dashCharges}
          autoFireEnabled={autoFire}
        />
      )}

      {gameState === 'upgrade' && (
        <UpgradeModal
          upgrades={availableUpgrades}
          onSelect={handleSelectUpgrade}
        />
      )}

      {gameState === 'paused' && (
        <PauseModal
          onResume={handleResumeGame}
          onRestart={handleRestartGame}
          onMenu={handleMenu}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {gameState === 'gameover' && (
        <GameOverModal
          stats={stats}
          onRestart={handleRestartGame}
          onMenu={handleMenu}
        />
      )}
    </div>
  );
}
