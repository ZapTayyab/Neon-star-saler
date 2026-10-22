export type GameState = 'title' | 'playing' | 'upgrade' | 'paused' | 'gameover' | 'victory';

export type EnemyType =
  | 'stalker'
  | 'goliath'
  | 'sniper'
  | 'shredder'
  | 'mortar_destroyer'
  | 'phase_stalker'
  | 'colossus'
  | 'boss_goliath_prime'
  | 'boss_nexus_colossus'
  | 'boss_hyperion_archon'
  | 'boss_shield_drone';

export interface UpgradeOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  level: number;
  maxLevel: number;
}

export interface PlayerStats {
  maxHp: number;
  hp: number;
  maxShield: number;
  shield: number;
  shieldRegenRate: number;
  shieldDelayTimer: number;
  moveSpeed: number;
  dashCharges: number;
  maxDashCharges: number;
  dashCooldown: number;
  dashTimer: number;
  isDashing: boolean;
  dashTimeRemaining: number;
  empCharge: number; // 0 to 100
  score: number;
  combo: number;
  comboTimer: number;
  comboMultiplier: number;
  wave: number;
  xp: number;
  xpToNextLevel: number;
  level: number;
  kills: number;
  // Upgrade levels
  bulletSpread: number; // 1, 2, 3, 4
  fireRate: number; // shots per sec
  bulletDamage: number;
  pierceCount: number;
  chainLightning: boolean;
  orbitalDrones: number;
  siphonChance: number;
  magnetRange: number;
  // Sector Progression, Quantum Portal & Customization
  sectorLevel: number;
  sectorName: string;
  portalActive: boolean;
  portalDistance: number | null;
  portalAngle: number | null;
  equippedSkinId: string;
  // Arena Tactical Hazards
  hazardCount: number;
  hazardTelegraphing: boolean;
  // Boss Battle Telemetry
  bossActive: boolean;
  bossName: string;
  bossPhase: string;
  bossHpRatio: number | null;
  // Map Location & Biome Telemetry
  mapTier: number;
  mapLocationName: string;
  mapHazardLevel: string;
  // Tactical Radar / Mini-map Telemetry
  radar?: RadarData;
}

export interface RadarEnemy {
  id: number;
  type: EnemyType;
  x: number;
  z: number;
  relX: number;
  relZ: number;
  dist: number;
  angle: number;
  isTelegraphing: boolean;
  isBoss: boolean;
}

export interface RadarObstacle {
  x: number;
  z: number;
  width: number;
  depth: number;
  radius: number;
  shape: 'box' | 'cylinder';
  type: string;
}

export interface RadarData {
  playerX: number;
  playerZ: number;
  playerRot: number;
  arenaRadius: number;
  enemies: RadarEnemy[];
  obstacles: RadarObstacle[];
  portal: {
    active: boolean;
    x: number;
    z: number;
    dist: number;
    angle: number;
  } | null;
}

export interface TelegraphIndicator {
  type: 'line' | 'circle' | 'cone';
  x: number;
  z: number;
  targetX?: number;
  targetZ?: number;
  radius?: number;
  angle?: number;
  progress: number; // 0 to 1
  duration: number;
  color: string;
}

export interface GameTelemetry {
  fps: number;
  enemiesActive: number;
  particlesActive: number;
  timeElapsed: number;
}
