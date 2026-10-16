import React, { useRef, useState, useEffect } from 'react';
import { Zap, Radio, Target, Crosshair } from 'lucide-react';
import { triggerHaptic } from '../game/engine';

interface TouchControlsProps {
  onMove: (x: number, z: number) => void;
  onAim: (x: number, z: number, active: boolean) => void;
  onDash: () => void;
  onEMP: () => void;
  onToggleAutoFire: () => boolean;
  onSetFiring: (firing: boolean) => void;
  isEmpReady: boolean;
  empCharge: number;
  dashCharges: number;
  autoFireEnabled: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onMove,
  onAim,
  onDash,
  onEMP,
  onToggleAutoFire,
  onSetFiring,
  isEmpReady,
  empCharge,
  dashCharges,
  autoFireEnabled,
}) => {
  // Left Movement Joystick State
  const [leftKnobPos, setLeftKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isLeftActive, setIsLeftActive] = useState(false);
  const leftTouchIdRef = useRef<number | null>(null);
  const leftBaseRef = useRef<HTMLDivElement>(null);
  const leftCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Right Aim & Fire Joystick State
  const [rightKnobPos, setRightKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isRightActive, setIsRightActive] = useState(false);
  const rightTouchIdRef = useRef<number | null>(null);
  const rightBaseRef = useRef<HTMLDivElement>(null);
  const rightCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const leftTouchOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rightTouchOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const maxRadius = 45;
  const deadzone = 4;

  // Initialize/Update joystick center positions on mount and resize
  const updateCenters = () => {
    if (leftBaseRef.current) {
      const rect = leftBaseRef.current.getBoundingClientRect();
      leftCenterRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    if (rightBaseRef.current) {
      const rect = rightBaseRef.current.getBoundingClientRect();
      rightCenterRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
  };

  useEffect(() => {
    updateCenters();
    window.addEventListener('resize', updateCenters);
    window.addEventListener('orientationchange', updateCenters);
    return () => {
      window.removeEventListener('resize', updateCenters);
      window.removeEventListener('orientationchange', updateCenters);
    };
  }, []);

  // --- Left (Movement) Touch Handlers ---
  const handleLeftTouchStart = (e: React.TouchEvent) => {
    updateCenters();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (leftTouchIdRef.current === null) {
        leftTouchIdRef.current = touch.identifier;
        setIsLeftActive(true);
        triggerHaptic(8);

        // If touching directly near visible base, track from base center; otherwise from touch point
        const distFromBase = Math.hypot(
          touch.clientX - leftCenterRef.current.x,
          touch.clientY - leftCenterRef.current.y
        );
        if (distFromBase <= 75) {
          leftTouchOriginRef.current = { ...leftCenterRef.current };
        } else {
          leftTouchOriginRef.current = { x: touch.clientX, y: touch.clientY };
        }

        const dx = touch.clientX - leftTouchOriginRef.current.x;
        const dy = touch.clientY - leftTouchOriginRef.current.y;
        const dist = Math.hypot(dx, dy);

        let clampedX = 0;
        let clampedY = 0;
        if (dist > deadzone) {
          const ratio = Math.min(1, (dist - deadzone) / (maxRadius - deadzone));
          clampedX = (dx / dist) * maxRadius * ratio;
          clampedY = (dy / dist) * maxRadius * ratio;
        }

        setLeftKnobPos({ x: clampedX, y: clampedY });
        onMove(clampedX / maxRadius, clampedY / maxRadius);
        break;
      }
    }
  };

  const handleLeftTouchMove = (e: React.TouchEvent) => {
    if (leftTouchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === leftTouchIdRef.current) {
        const dx = touch.clientX - leftTouchOriginRef.current.x;
        const dy = touch.clientY - leftTouchOriginRef.current.y;
        const dist = Math.hypot(dx, dy);

        let clampedX = 0;
        let clampedY = 0;
        if (dist > deadzone) {
          const ratio = Math.min(1, (dist - deadzone) / (maxRadius - deadzone));
          clampedX = (dx / dist) * maxRadius * ratio;
          clampedY = (dy / dist) * maxRadius * ratio;
        }

        setLeftKnobPos({ x: clampedX, y: clampedY });
        onMove(clampedX / maxRadius, clampedY / maxRadius);
        break;
      }
    }
  };

  const handleLeftTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === leftTouchIdRef.current) {
        leftTouchIdRef.current = null;
        setIsLeftActive(false);
        setLeftKnobPos({ x: 0, y: 0 });
        onMove(0, 0);
        break;
      }
    }
  };

  // --- Right (Aim & Fire) Touch Handlers ---
  const handleRightTouchStart = (e: React.TouchEvent) => {
    updateCenters();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (rightTouchIdRef.current === null) {
        rightTouchIdRef.current = touch.identifier;
        setIsRightActive(true);
        triggerHaptic(8);

        const distFromBase = Math.hypot(
          touch.clientX - rightCenterRef.current.x,
          touch.clientY - rightCenterRef.current.y
        );
        if (distFromBase <= 75) {
          rightTouchOriginRef.current = { ...rightCenterRef.current };
        } else {
          rightTouchOriginRef.current = { x: touch.clientX, y: touch.clientY };
        }

        const dx = touch.clientX - rightTouchOriginRef.current.x;
        const dy = touch.clientY - rightTouchOriginRef.current.y;
        const dist = Math.hypot(dx, dy);

        let clampedX = 0;
        let clampedY = 0;
        if (dist > deadzone) {
          const ratio = Math.min(1, (dist - deadzone) / (maxRadius - deadzone));
          clampedX = (dx / dist) * maxRadius * ratio;
          clampedY = (dy / dist) * maxRadius * ratio;
          onAim(clampedX / maxRadius, clampedY / maxRadius, true);
          onSetFiring(true);
        }

        setRightKnobPos({ x: clampedX, y: clampedY });
        break;
      }
    }
  };

  const handleRightTouchMove = (e: React.TouchEvent) => {
    if (rightTouchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === rightTouchIdRef.current) {
        const dx = touch.clientX - rightTouchOriginRef.current.x;
        const dy = touch.clientY - rightTouchOriginRef.current.y;
        const dist = Math.hypot(dx, dy);

        let clampedX = 0;
        let clampedY = 0;
        if (dist > deadzone) {
          const ratio = Math.min(1, (dist - deadzone) / (maxRadius - deadzone));
          clampedX = (dx / dist) * maxRadius * ratio;
          clampedY = (dy / dist) * maxRadius * ratio;
          onAim(clampedX / maxRadius, clampedY / maxRadius, true);
          onSetFiring(true);
        } else {
          onAim(0, 0, false);
          onSetFiring(false);
        }

        setRightKnobPos({ x: clampedX, y: clampedY });
        break;
      }
    }
  };

  const handleRightTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === rightTouchIdRef.current) {
        rightTouchIdRef.current = null;
        setIsRightActive(false);
        setRightKnobPos({ x: 0, y: 0 });
        onAim(0, 0, false);
        onSetFiring(false);
        break;
      }
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 flex justify-between touch-none overflow-hidden">
      {/* ================= LEFT MOVEMENT JOYSTICK ================= */}
      <div
        className="w-[50vw] h-full pointer-events-auto relative touch-none"
        onTouchStart={handleLeftTouchStart}
        onTouchMove={handleLeftTouchMove}
        onTouchEnd={handleLeftTouchEnd}
        onTouchCancel={handleLeftTouchEnd}
      >
        {/* Visible, permanent Left Joystick Base */}
        <div
          ref={leftBaseRef}
          className={`absolute bottom-6 left-6 w-[120px] h-[120px] rounded-full border-2 bg-neutral-950/80 transition-colors flex items-center justify-center ${
            isLeftActive
              ? 'border-cyan-400 shadow-[0_0_25px_rgba(0,229,255,0.4)]'
              : 'border-cyan-500/40 shadow-[0_0_15px_rgba(0,229,255,0.15)]'
          }`}
        >
          {/* Compass indicators */}
          <span className="absolute top-1 text-[8px] font-bold text-cyan-400/60 font-mono-numbers">▲</span>
          <span className="absolute bottom-1 text-[8px] font-bold text-cyan-400/60 font-mono-numbers">▼</span>
          <span className="absolute left-1 text-[8px] font-bold text-cyan-400/60 font-mono-numbers">◄</span>
          <span className="absolute right-1 text-[8px] font-bold text-cyan-400/60 font-mono-numbers">►</span>

          {/* Crosshair lines */}
          <div className="absolute w-[80%] h-[1px] bg-cyan-500/20" />
          <div className="absolute h-[80%] w-[1px] bg-cyan-500/20" />

          {/* Center label */}
          <span className="text-[9px] font-mono-numbers tracking-widest text-cyan-400/40 font-bold uppercase select-none">
            MOVE
          </span>

          {/* Draggable Knob */}
          <div
            className={`absolute w-12 h-12 rounded-full border-2 transition-transform duration-75 flex items-center justify-center ${
              isLeftActive
                ? 'bg-gradient-to-br from-cyan-400 to-cyan-600 border-white shadow-[0_0_18px_rgba(0,229,255,0.9)] scale-105'
                : 'bg-cyan-950/90 border-cyan-400/70 shadow-[0_0_10px_rgba(0,229,255,0.3)]'
            }`}
            style={{
              transform: `translate(${leftKnobPos.x}px, ${leftKnobPos.y}px)`,
            }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-cyan-200/90" />
          </div>
        </div>
      </div>

      {/* ================= RIGHT AIM & FIRE JOYSTICK + ACTIONS ================= */}
      <div
        className="w-[50vw] h-full pointer-events-auto relative touch-none flex flex-col items-end justify-end p-6"
        onTouchStart={handleRightTouchStart}
        onTouchMove={handleRightTouchMove}
        onTouchEnd={handleRightTouchEnd}
        onTouchCancel={handleRightTouchEnd}
      >
        {/* Action Buttons Row directly above Right Joystick */}
        <div className="absolute bottom-[156px] right-6 flex items-center gap-3 pointer-events-auto z-30">
          {/* Mode Toggle Button: Manual vs Auto-Aim */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic(15);
              onToggleAutoFire();
            }}
            className={`px-2.5 py-1.5 rounded-full border flex items-center gap-1.5 text-[9px] font-mono-numbers font-bold tracking-wider transition-all active:scale-95 cursor-pointer ${
              autoFireEnabled
                ? 'bg-cyan-950/90 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                : 'bg-neutral-900/90 border-neutral-700 text-neutral-400'
            }`}
          >
            <Target className="w-3 h-3" />
            <span>{autoFireEnabled ? 'AUTO-AIM: ON' : 'MANUAL AIM'}</span>
          </button>

          {/* EMP Shockwave Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isEmpReady) {
                triggerHaptic(50);
                onEMP();
              }
            }}
            disabled={!isEmpReady}
            className={`w-13 h-13 rounded-full border-2 flex flex-col items-center justify-center transition-all cursor-pointer active:scale-90 ${
              isEmpReady
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 border-amber-300 text-black shadow-[0_0_20px_rgba(245,158,11,0.8)]'
                : 'bg-neutral-950/80 border-neutral-800 text-neutral-600 opacity-60'
            }`}
            title="EMP Shockwave"
          >
            <Radio className="w-5 h-5" />
            <span className="text-[7.5px] font-mono-numbers uppercase font-black">
              {isEmpReady ? 'EMP' : `${Math.floor(empCharge)}%`}
            </span>
          </button>

          {/* Kinetic Dash Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic(30);
              onDash();
            }}
            disabled={dashCharges <= 0}
            className={`w-15 h-15 rounded-full border-2 flex flex-col items-center justify-center transition-all cursor-pointer active:scale-90 ${
              dashCharges > 0
                ? 'bg-gradient-to-br from-cyan-500 to-blue-600 border-cyan-300 text-white shadow-[0_0_20px_rgba(0,229,255,0.7)]'
                : 'bg-neutral-950/80 border-neutral-800 text-neutral-600 opacity-50'
            }`}
            title="Kinetic Dash"
          >
            <Zap className="w-6 h-6 fill-white" />
            <span className="text-[8px] font-mono-numbers uppercase font-black">
              DASH ({dashCharges})
            </span>
          </button>
        </div>

        {/* Visible, permanent Right Aim & Fire Joystick Base */}
        <div
          ref={rightBaseRef}
          className={`absolute bottom-6 right-6 w-[120px] h-[120px] rounded-full border-2 bg-neutral-950/80 transition-colors flex items-center justify-center ${
            isRightActive
              ? 'border-red-400 shadow-[0_0_25px_rgba(239,68,68,0.5)]'
              : 'border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
          }`}
        >
          {/* Crosshair ticks */}
          <div className="absolute w-[80%] h-[1px] bg-red-500/25" />
          <div className="absolute h-[80%] w-[1px] bg-red-500/25" />
          <div className="absolute w-16 h-16 rounded-full border border-red-500/20" />

          {/* Center label */}
          <span className="text-[8px] font-mono-numbers tracking-widest text-red-400/50 font-bold uppercase select-none text-center leading-tight">
            AIM &<br />FIRE
          </span>

          {/* Draggable Aim Knob */}
          <div
            className={`absolute w-12 h-12 rounded-full border-2 transition-transform duration-75 flex items-center justify-center ${
              isRightActive
                ? 'bg-gradient-to-br from-red-500 to-rose-600 border-white shadow-[0_0_20px_rgba(239,68,68,0.9)] scale-105'
                : 'bg-red-950/90 border-red-400/70 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
            }`}
            style={{
              transform: `translate(${rightKnobPos.x}px, ${rightKnobPos.y}px)`,
            }}
          >
            <Crosshair className="w-5 h-5 text-white/90" />
          </div>
        </div>
      </div>
    </div>
  );
};
