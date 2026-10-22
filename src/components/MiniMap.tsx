import React, { useState } from 'react';
import { Crosshair, AlertTriangle, Disc, Maximize2, Minimize2 } from 'lucide-react';
import { RadarData, RadarEnemy } from '../game/types';

interface MiniMapProps {
  radar?: RadarData;
  portalActive?: boolean;
  portalDistance?: number | null;
  portalAngle?: number | null;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  radar,
  portalActive,
  portalDistance,
  portalAngle,
}) => {
  const [zoomRange, setZoomRange] = useState<number>(30); // 30m full arena or 18m close tactical
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  if (!radar) {
    return null;
  }

  const { playerRot, enemies, portal, arenaRadius } = radar;
  const isPortalActive = portalActive || portal?.active;
  const pDist = portalDistance ?? portal?.dist ?? null;
  const pAngle = portalAngle ?? portal?.angle ?? null;

  // Mini-map dimensions (SVG viewport)
  const size = 120; // 120px x 120px
  const center = size / 2;
  const radius = center - 8; // 52px radius for radar circular boundary

  // Count active threats
  const telegraphingCount = enemies.filter((e) => e.isTelegraphing).length;
  const bossEntity = enemies.find((e) => e.isBoss);
  const hostileCount = enemies.length;

  return (
    <div className="relative pointer-events-auto select-none flex flex-col items-start gap-1">
      {/* Mini-map Header & Tactical Status Bar */}
      <div className="flex items-center justify-between w-full max-w-[124px] px-1 text-[8px] font-mono-numbers font-bold text-neutral-400">
        <div className="flex items-center gap-1">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              bossEntity
                ? 'bg-red-500 animate-ping'
                : telegraphingCount > 0
                ? 'bg-amber-400 animate-pulse'
                : 'bg-cyan-400'
            }`}
          />
          <span className="tracking-wider text-cyan-400">RADAR</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoomRange((prev) => (prev === 30 ? 18 : 30))}
            className="text-[7px] px-1 py-0.2 rounded-xs border border-neutral-800 bg-neutral-900/90 text-neutral-300 hover:text-cyan-300 cursor-pointer transition-colors"
            title="Toggle Radar Zoom"
          >
            {zoomRange}M
          </button>
          <button
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="text-neutral-400 hover:text-cyan-300 cursor-pointer transition-colors p-0.5"
            title={isCollapsed ? 'Expand Radar' : 'Minimize Radar'}
          >
            {isCollapsed ? <Maximize2 className="w-2.5 h-2.5" /> : <Minimize2 className="w-2.5 h-2.5" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="relative w-[124px] h-[124px] rounded-full border border-cyan-500/40 bg-neutral-950/90 backdrop-blur-md shadow-[0_0_20px_rgba(0,240,255,0.2),inset_0_0_20px_rgba(0,0,0,0.8)] overflow-hidden">
          {/* Rotating Radar Scanner Sweep Line */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background:
                'conic-gradient(from 0deg at 50% 50%, rgba(0, 240, 255, 0.22) 0deg, rgba(0, 240, 255, 0) 55deg, transparent 360deg)',
              animation: 'spin 3s linear infinite',
            }}
          />

          {/* SVG Map Render */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox={`0 0 ${size} ${size}`}
          >
            <defs>
              {/* Radial gradient glow for center player */}
              <radialGradient id="playerGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
              </radialGradient>
              {/* Radial gradient for portal vortex */}
              <radialGradient id="portalGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
                <stop offset="60%" stopColor="#00f0ff" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Concentric Range Rings */}
            <circle
              cx={center}
              cy={center}
              r={radius * (10 / zoomRange)}
              fill="none"
              stroke="rgba(0, 240, 255, 0.15)"
              strokeWidth="0.8"
              strokeDasharray="2,2"
            />
            <circle
              cx={center}
              cy={center}
              r={radius * (20 / zoomRange)}
              fill="none"
              stroke="rgba(0, 240, 255, 0.2)"
              strokeWidth="0.8"
            />
            {/* Outer boundary ring (Arena Perimeter) */}
            <circle
              cx={center}
              cy={center}
              r={radius * Math.min(1.0, arenaRadius / zoomRange)}
              fill="none"
              stroke="rgba(0, 240, 255, 0.35)"
              strokeWidth="1"
            />

            {/* Radar Crosshairs */}
            <line
              x1={center}
              y1={center - radius}
              x2={center}
              y2={center + radius}
              stroke="rgba(0, 240, 255, 0.18)"
              strokeWidth="0.7"
            />
            <line
              x1={center - radius}
              y1={center}
              x2={center + radius}
              y2={center}
              stroke="rgba(0, 240, 255, 0.18)"
              strokeWidth="0.7"
            />

            {/* Cardinal Direction Markers */}
            <text
              x={center}
              y={center - radius + 7}
              fill="rgba(0, 240, 255, 0.65)"
              fontSize="6"
              fontWeight="bold"
              textAnchor="middle"
              className="font-mono-numbers"
            >
              N
            </text>
            <text
              x={center + radius - 5}
              y={center + 2}
              fill="rgba(0, 240, 255, 0.65)"
              fontSize="6"
              fontWeight="bold"
              textAnchor="middle"
              className="font-mono-numbers"
            >
              E
            </text>
            <text
              x={center}
              y={center + radius - 3}
              fill="rgba(0, 240, 255, 0.65)"
              fontSize="6"
              fontWeight="bold"
              textAnchor="middle"
              className="font-mono-numbers"
            >
              S
            </text>
            <text
              x={center - radius + 5}
              y={center + 2}
              fill="rgba(0, 240, 255, 0.65)"
              fontSize="6"
              fontWeight="bold"
              textAnchor="middle"
              className="font-mono-numbers"
            >
              W
            </text>

            {/* In-Arena Obstacles & Physical Buildings Blueprint */}
            {radar.obstacles?.map((obs, idx) => {
              const relX = obs.x - radar.playerX;
              const relZ = obs.z - radar.playerZ;
              const rawX = (relX / zoomRange) * radius;
              const rawY = (relZ / zoomRange) * radius;

              if (obs.shape === 'cylinder') {
                const r = (obs.radius / zoomRange) * radius;
                return (
                  <g key={`obs-${idx}`}>
                    <circle
                      cx={center + rawX}
                      cy={center + rawY}
                      r={Math.max(2.5, r)}
                      fill="rgba(30, 41, 59, 0.85)"
                      stroke="rgba(0, 240, 255, 0.6)"
                      strokeWidth="0.8"
                    />
                    <circle
                      cx={center + rawX}
                      cy={center + rawY}
                      r={Math.max(1, r * 0.45)}
                      fill="none"
                      stroke="rgba(0, 240, 255, 0.85)"
                      strokeWidth="0.5"
                    />
                  </g>
                );
              } else {
                const w = (obs.width / zoomRange) * radius;
                const d = (obs.depth / zoomRange) * radius;
                return (
                  <g key={`obs-${idx}`}>
                    <rect
                      x={center + rawX - w / 2}
                      y={center + rawY - d / 2}
                      width={Math.max(3, w)}
                      height={Math.max(3, d)}
                      fill="rgba(15, 23, 42, 0.85)"
                      stroke="rgba(56, 189, 248, 0.7)"
                      strokeWidth="0.8"
                      rx="1"
                    />
                    <rect
                      x={center + rawX - w / 4}
                      y={center + rawY - d / 4}
                      width={Math.max(1.5, w / 2)}
                      height={Math.max(1.5, d / 2)}
                      fill="none"
                      stroke="rgba(56, 189, 248, 0.35)"
                      strokeWidth="0.5"
                    />
                  </g>
                );
              }
            })}

            {/* Rogue Drone Swarms (Enemy Blips) */}
            {enemies.map((enemy: RadarEnemy) => {
              // Convert relative world coords to radar coords:
              // World: +X is right, +Z is down/south in top-down view
              const rawX = (enemy.relX / zoomRange) * radius;
              const rawY = (enemy.relZ / zoomRange) * radius;
              const distFromCenter = Math.hypot(rawX, rawY);

              // Clamp distant enemies to perimeter ring with a small border buffer
              const isClamped = distFromCenter > radius - 3;
              const angle = Math.atan2(rawY, rawX);
              const blipX = isClamped ? center + Math.cos(angle) * (radius - 3) : center + rawX;
              const blipY = isClamped ? center + Math.sin(angle) * (radius - 3) : center + rawY;

              // Color and shape based on enemy type
              const isBoss = enemy.isBoss;
              const isTelegraphing = enemy.isTelegraphing;

              let fillColor = '#ef4444'; // Stalker red
              let blipRadius = 2.2;

              if (isBoss) {
                fillColor = '#f43f5e';
                blipRadius = 4.2;
              } else if (enemy.type === 'goliath') {
                fillColor = '#f59e0b'; // Amber diamond
                blipRadius = 3.0;
              } else if (enemy.type === 'mortar_destroyer') {
                fillColor = '#ea580c'; // Deep rust mortar
                blipRadius = 3.2;
              } else if (enemy.type === 'shredder') {
                fillColor = '#f97316'; // High-speed orange
                blipRadius = 2.5;
              } else if (enemy.type === 'phase_stalker') {
                fillColor = '#a855f7'; // Phasing violet
                blipRadius = 2.8;
              } else if (enemy.type === 'sniper') {
                fillColor = '#c026d3'; // Magenta sniper
                blipRadius = 2.4;
              } else if (enemy.type === 'boss_shield_drone') {
                fillColor = '#38bdf8';
                blipRadius = 1.8;
              }

              return (
                <g key={enemy.id}>
                  {/* Telegraphing alert aura */}
                  {isTelegraphing && (
                    <circle
                      cx={blipX}
                      cy={blipY}
                      r={blipRadius * 2.2}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="0.9"
                      className="animate-ping"
                      opacity="0.8"
                    />
                  )}

                  {/* Boss pulsating threat ring */}
                  {isBoss && (
                    <circle
                      cx={blipX}
                      cy={blipY}
                      r={blipRadius + 2.5}
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="1.2"
                      strokeDasharray="2,1"
                      className="animate-spin"
                    />
                  )}

                  {/* Main Blip Archetypes */}
                  {isBoss ? (
                    // Boss Crown / Diamond Shape
                    <polygon
                      points={`${blipX},${blipY - blipRadius} ${blipX + blipRadius},${blipY} ${blipX},${blipY + blipRadius} ${blipX - blipRadius},${blipY}`}
                      fill={fillColor}
                      stroke="#ffffff"
                      strokeWidth="0.7"
                    />
                  ) : enemy.type === 'goliath' || enemy.type === 'mortar_destroyer' ? (
                    // Heavy Goliath / Mortar Destroyer Block
                    <rect
                      x={blipX - blipRadius}
                      y={blipY - blipRadius}
                      width={blipRadius * 2}
                      height={blipRadius * 2}
                      fill={fillColor}
                      stroke="#ffffff"
                      strokeWidth="0.5"
                    />
                  ) : enemy.type === 'phase_stalker' ? (
                    // Phase Stalker Rotated Diamond
                    <polygon
                      points={`${blipX},${blipY - blipRadius} ${blipX + blipRadius},${blipY} ${blipX},${blipY + blipRadius} ${blipX - blipRadius},${blipY}`}
                      fill={fillColor}
                      stroke="#e9d5ff"
                      strokeWidth="0.6"
                    />
                  ) : enemy.type === 'shredder' ? (
                    // Shredder Chevron Triangle
                    <polygon
                      points={`${blipX},${blipY - blipRadius * 1.2} ${blipX + blipRadius},${blipY + blipRadius * 0.8} ${blipX - blipRadius},${blipY + blipRadius * 0.8}`}
                      fill={fillColor}
                      stroke="#ffedd5"
                      strokeWidth="0.5"
                    />
                  ) : (
                    // Regular Drone Circular Blip
                    <circle
                      cx={blipX}
                      cy={blipY}
                      r={blipRadius}
                      fill={fillColor}
                      stroke={isClamped ? '#ffffff' : 'none'}
                      strokeWidth={isClamped ? '0.6' : '0'}
                    />
                  )}
                </g>
              );
            })}

            {/* Quantum Warp Portal Beacon Waypoint */}
            {isPortalActive && portal && (
              (() => {
                const rawPortalX = (portal.x - radar.playerX);
                const rawPortalZ = (portal.z - radar.playerZ);
                const pDistWorld = Math.hypot(rawPortalX, rawPortalZ);
                const scaledDist = (pDistWorld / zoomRange) * radius;

                const isPortalClamped = scaledDist > radius - 5;
                const pAngleR = Math.atan2(rawPortalZ, rawPortalX);
                const pIconX = isPortalClamped
                  ? center + Math.cos(pAngleR) * (radius - 5)
                  : center + (rawPortalX / zoomRange) * radius;
                const pIconY = isPortalClamped
                  ? center + Math.sin(pAngleR) * (radius - 5)
                  : center + (rawPortalZ / zoomRange) * radius;

                return (
                  <g>
                    {/* Pulsing Portal Beacon Ring */}
                    <circle
                      cx={pIconX}
                      cy={pIconY}
                      r="6.5"
                      fill="url(#portalGlow)"
                      className="animate-pulse"
                    />
                    <circle
                      cx={pIconX}
                      cy={pIconY}
                      r="4.5"
                      fill="none"
                      stroke="#00f0ff"
                      strokeWidth="1.2"
                      strokeDasharray="2,1"
                      className="animate-spin"
                    />
                    <circle cx={pIconX} cy={pIconY} r="2.0" fill="#ffffff" />

                    {/* Edge Indicator Directional Arrow if Clamped */}
                    {isPortalClamped && (
                      <polygon
                        points={`${pIconX},${pIconY - 2.5} ${pIconX + 2.5},${pIconY + 2.5} ${pIconX - 2.5},${pIconY + 2.5}`}
                        fill="#00f0ff"
                        transform={`rotate(${((pAngleR + Math.PI / 2) * 180) / Math.PI}, ${pIconX}, ${pIconY})`}
                      />
                    )}
                  </g>
                );
              })()
            )}

            {/* Center Player Mech Heading Pip */}
            {/* Ambient player radius circle */}
            <circle
              cx={center}
              cy={center}
              r="4.5"
              fill="url(#playerGlow)"
            />
            {/* Directional Mech Heading Chevron */}
            <g transform={`rotate(${(-playerRot * 180) / Math.PI}, ${center}, ${center})`}>
              {/* Forward arrowhead */}
              <polygon
                points={`${center},${center - 5.5} ${center + 3.2},${center + 3.5} ${center},${center + 1.8} ${center - 3.2},${center + 3.5}`}
                fill="#00f0ff"
                stroke="#ffffff"
                strokeWidth="0.8"
              />
              {/* Thruster core dot */}
              <circle cx={center} cy={center + 3} r="0.9" fill="#ffffff" />
            </g>
          </svg>

          {/* Active Portal Target Waypoint Text Badge */}
          {isPortalActive && pDist !== null && (
            <div className="absolute bottom-1 inset-x-0 mx-auto w-fit flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-cyan-950/90 border border-cyan-400 text-cyan-300 text-[7px] font-mono-numbers font-black tracking-wider shadow-[0_0_8px_rgba(0,240,255,0.6)]">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>PORTAL {pDist}M</span>
            </div>
          )}
        </div>
      )}

      {/* Threat Level & Swarm Counter Footer */}
      {!isCollapsed && (
        <div className="flex items-center justify-between w-full max-w-[124px] px-1 text-[7px] font-mono-numbers text-neutral-400">
          <span>SWARM: <b className="text-white tabular-nums">{hostileCount}</b></span>
          {telegraphingCount > 0 ? (
            <span className="text-amber-400 font-bold flex items-center gap-0.5 animate-pulse">
              <AlertTriangle className="w-2.5 h-2.5" />
              INCOMING
            </span>
          ) : bossEntity ? (
            <span className="text-red-400 font-bold tracking-tight">BOSS APEX</span>
          ) : (
            <span className="text-cyan-400/80">SECURE</span>
          )}
        </div>
      )}
    </div>
  );
};
