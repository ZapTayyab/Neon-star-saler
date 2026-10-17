import * as THREE from 'three';
import { ARENA_RADIUS, buildArena, getSectorTheme } from './arena';
import { sound } from './audio';
import {
  createColossusBoss,
  createPickupMesh,
  createPlayerMech,
  createSiegeGoliath,
  createStalkerDrone,
  createVectorDrone,
  materials,
} from './models';
import { HazardManager } from './hazards';
import { ParticleManager } from './particles';
import { QuantumPortal } from './portal';
import { applySkinToMech, getSavedSkinId, getSkinById, MechSkin, saveSkinId } from './skins';
import { EnemyType, GameState, PlayerStats, UpgradeOption } from './types';

// Pre-allocated math objects to avoid garbage collection
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _m1 = new THREE.Matrix4();
const _color1 = new THREE.Color();
const _raycaster = new THREE.Raycaster();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

export function triggerHaptic(ms: number) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(ms);
    }
  } catch {
    // Ignore unsupported
  }
}

export interface Projectile {
  mesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  damage: number;
  isEnemy: boolean;
  pierceRemaining: number;
  life: number;
  maxLife: number;
  radius: number;
  color: number;
}

export interface EnemyEntity {
  id: number;
  type: EnemyType;
  group: THREE.Group;
  meshes: THREE.Mesh[];
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  rotation: number;
  targetRotation: number;
  maxHp: number;
  hp: number;
  speed: number;
  radius: number;
  state: 'idle' | 'chase' | 'windup' | 'attack' | 'cooldown';
  timer: number;
  windupDuration: number;
  telegraphProgress: number; // 0 to 1
  hitFlashTimer: number;
  telegraphMesh?: THREE.Line | THREE.Mesh;
  subParts?: Record<string, THREE.Object3D>;
}

export interface PickupEntity {
  id: number;
  type: 'xp' | 'heal' | 'emp';
  group: THREE.Group;
  mesh: THREE.Mesh;
  x: number;
  z: number;
  life: number;
}

export const ALL_UPGRADES: UpgradeOption[] = [
  {
    id: 'plasma_split',
    title: 'Twin Multi-Cannon',
    description: 'Adds an extra parallel plasma bolt to each salvo.',
    icon: 'target',
    rarity: 'rare',
    level: 0,
    maxLevel: 3,
  },
  {
    id: 'overclock_thruster',
    title: 'Kinetic Overclock',
    description: '+22% Hover speed & reduces Dash cooldown by 20%.',
    icon: 'zap',
    rarity: 'common',
    level: 0,
    maxLevel: 4,
  },
  {
    id: 'plasma_pierce',
    title: 'High-Density Cores',
    description: 'Plasma shots pierce through +1 additional enemy.',
    icon: 'shield',
    rarity: 'rare',
    level: 0,
    maxLevel: 3,
  },
  {
    id: 'chain_lightning',
    title: 'Arc Overload',
    description: 'Critical hits arc lightning bolts to 2 nearby enemies.',
    icon: 'sparkles',
    rarity: 'epic',
    level: 0,
    maxLevel: 2,
  },
  {
    id: 'siphon_nanite',
    title: 'Siphon Nanites',
    description: '15% chance to instantly repair 10 HP on enemy takedown.',
    icon: 'heart',
    rarity: 'rare',
    level: 0,
    maxLevel: 3,
  },
  {
    id: 'orbital_drone',
    title: 'Vanguard Aegis Drone',
    description: 'Deploy an automated escort drone that fires at targets.',
    icon: 'cpu',
    rarity: 'epic',
    level: 0,
    maxLevel: 2,
  },
  {
    id: 'emp_supercharge',
    title: 'EMP Resonator',
    description: '+35% EMP Shockwave damage radius and clears all bullets.',
    icon: 'radio',
    rarity: 'rare',
    level: 0,
    maxLevel: 3,
  },
];

export class GameEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private particleManager: ParticleManager;
  private arena: ReturnType<typeof buildArena>;

  // Player Model & State
  private playerModel: ReturnType<typeof createPlayerMech>;
  public playerStats: PlayerStats;
  private playerX: number = 0;
  private playerZ: number = 0;
  private playerVx: number = 0;
  private playerVz: number = 0;
  private playerRot: number = 0;
  private fireTimer: number = 0;
  private aimTargetX: number = 0;
  private aimTargetZ: number = -10;

  // Escort Drones
  private escortDrones: THREE.Group[] = [];
  private escortDroneTimer: number = 0;

  // Camera Shake & Hitstop
  private trauma: number = 0;
  private hitstopTimer: number = 0;
  private cameraBaseY: number = 22;
  private cameraBaseZ: number = 18;

  // Input states (Desktop & Mobile)
  private keysHeld: Record<string, boolean> = {};
  private inputBuffer: { action: string; time: number }[] = [];
  private isPointerDown: boolean = false;
  private pointerNdc: THREE.Vector2 = new THREE.Vector2(0, 0);

  // Mobile Virtual Touch inputs & Aiming
  private virtualMoveX: number = 0;
  private virtualMoveZ: number = 0;
  private virtualAimX: number = 0;
  private virtualAimZ: number = 0;
  private hasVirtualAim: boolean = false;
  private hasMouseAim: boolean = true;
  private virtualFiring: boolean = false;
  public autoFire: boolean = false;
  private reticleMesh!: THREE.Mesh;
  private reticleGroup!: THREE.Group;
  private reticleOuterRing!: THREE.Mesh;
  private reticleCenterDot!: THREE.Mesh;
  private reticleBrackets!: THREE.LineSegments;
  private reticleMaterial!: THREE.MeshBasicMaterial;
  private aimLaserLine!: THREE.Line;
  private aimLaserMaterial!: THREE.LineBasicMaterial;
  private isAimLockedOn: boolean = false;

  // Quantum Portal & Sector Level Progression
  public quantumPortal: QuantumPortal;
  public currentSkin: MechSkin;
  private isWarpingLevel: boolean = false;
  private warpTransitionTimer: number = 0;

  // Localized Arena Hazards (Electrified Floor Tiles & Laser Grids)
  public hazardManager: HazardManager;

  // Kinetic Dash High-Contrast Trail Tracking
  private prevThrusterLX: number = 0;
  private prevThrusterLY: number = 0;
  private prevThrusterLZ: number = 0;
  private prevThrusterRX: number = 0;
  private prevThrusterRY: number = 0;
  private prevThrusterRZ: number = 0;

  // Entities
  private projectiles: Projectile[] = [];
  private projectilePool: THREE.Mesh[] = [];
  private enemies: EnemyEntity[] = [];
  private pickups: PickupEntity[] = [];
  private nextEnemyId: number = 1;
  private nextPickupId: number = 1;

  // Wave Director
  public gameState: GameState = 'title';
  private waveTimer: number = 0;
  private waveEnemiesToSpawn: { type: EnemyType; delay: number }[] = [];
  private bossEntity: EnemyEntity | null = null;
  public bossHpRatio: number = 1;

  // Callbacks to React
  private onStatsUpdate: (stats: PlayerStats) => void;
  private onStateChange: (state: GameState) => void;
  private onUpgradePrompt: (upgrades: UpgradeOption[]) => void;

  // Title Screen Cinematic
  private titleCinematicAngle: number = 0;

  private isRunning: boolean = true;
  private animFrameId: number = 0;

  constructor(
    container: HTMLElement,
    callbacks: {
      onStatsUpdate: (stats: PlayerStats) => void;
      onStateChange: (state: GameState) => void;
      onUpgradePrompt: (upgrades: UpgradeOption[]) => void;
    }
  ) {
    this.container = container;
    this.onStatsUpdate = callbacks.onStatsUpdate;
    this.onStateChange = callbacks.onStateChange;
    this.onUpgradePrompt = callbacks.onUpgradePrompt;

    // 1. Scene, Camera, Renderer Setup
    this.scene = new THREE.Scene();
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 200);
    this.camera.position.set(0, this.cameraBaseY, this.cameraBaseZ);
    this.camera.lookAt(0, 0, 0);

    const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !isHeadless;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.arena = buildArena(this.scene, this.renderer);
    this.particleManager = new ParticleManager(this.scene);
    this.playerModel = createPlayerMech();
    this.scene.add(this.playerModel.group);

    // Initialize Quantum Warp Portal and Hover Mech Skins
    this.quantumPortal = new QuantumPortal(this.scene);
    this.currentSkin = getSkinById(getSavedSkinId());
    applySkinToMech(this.playerModel, this.currentSkin);

    // Initialize Localized Arena Hazards
    this.hazardManager = new HazardManager(this.scene, this.particleManager);

    // Initial stats
    this.playerStats = {
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
      // Sector Level, Quantum Portal & Mech Skin
      sectorLevel: 1,
      sectorName: 'Neon Core',
      portalActive: false,
      portalDistance: null,
      portalAngle: null,
      equippedSkinId: this.currentSkin.id,
      hazardCount: 0,
      hazardTelegraphing: false,
    };

    // Holographic target reticle and laser sight guide on ground
    this.reticleGroup = new THREE.Group();
    this.reticleGroup.position.y = 0.04;
    this.reticleGroup.visible = false;

    this.reticleMaterial = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const reticleGeo = new THREE.RingGeometry(0.7, 0.88, 32);
    reticleGeo.rotateX(-Math.PI / 2);
    this.reticleOuterRing = new THREE.Mesh(reticleGeo, this.reticleMaterial);
    this.reticleMesh = this.reticleOuterRing;
    this.reticleGroup.add(this.reticleOuterRing);

    const dotGeo = new THREE.CircleGeometry(0.1, 16);
    dotGeo.rotateX(-Math.PI / 2);
    this.reticleCenterDot = new THREE.Mesh(dotGeo, this.reticleMaterial);
    this.reticleGroup.add(this.reticleCenterDot);

    const bracketPoints: THREE.Vector3[] = [
      new THREE.Vector3(-1.15, 0.01, 0),
      new THREE.Vector3(-0.4, 0.01, 0),
      new THREE.Vector3(0.4, 0.01, 0),
      new THREE.Vector3(1.15, 0.01, 0),
      new THREE.Vector3(0, 0.01, -1.15),
      new THREE.Vector3(0, 0.01, -0.4),
      new THREE.Vector3(0, 0.01, 0.4),
      new THREE.Vector3(0, 0.01, 1.15),
    ];
    const bracketGeo = new THREE.BufferGeometry().setFromPoints(bracketPoints);
    this.reticleBrackets = new THREE.LineSegments(
      bracketGeo,
      new THREE.LineBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      })
    );
    this.reticleGroup.add(this.reticleBrackets);
    this.scene.add(this.reticleGroup);

    // Dynamic Aim Guide Laser Line connecting mech cannons to reticle target
    const laserGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.55, 0),
      new THREE.Vector3(0, 0.05, -10),
    ]);
    this.aimLaserMaterial = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
    });
    this.aimLaserLine = new THREE.Line(laserGeo, this.aimLaserMaterial);
    this.aimLaserLine.visible = false;
    this.scene.add(this.aimLaserLine);

    // Pre-warm WebGL shaders per Three.js guidelines
    this.renderer.compile(this.scene, this.camera);

    this.bindInputs();
    this.handleResize();
    this.startLoop();
  }

  // --- Mobile Touch Virtual Controller Interface ---
  public setVirtualMove(x: number, z: number) {
    this.virtualMoveX = x;
    this.virtualMoveZ = z;
  }

  public setVirtualAim(x: number, z: number, active: boolean) {
    this.virtualAimX = x;
    this.virtualAimZ = z;
    this.hasVirtualAim = active;
    if (active) {
      this.hasMouseAim = false;
    }
  }

  public setVirtualFiring(firing: boolean) {
    this.virtualFiring = firing;
  }

  public toggleAutoFire(): boolean {
    this.autoFire = !this.autoFire;
    return this.autoFire;
  }

  public isAutoFireEnabled(): boolean {
    return this.autoFire;
  }

  private bindInputs() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('resize', this.handleResize);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    sound.unlock();
    this.keysHeld[e.code] = true;

    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (this.gameState === 'playing') {
        this.setGameState('paused');
      } else if (this.gameState === 'paused') {
        this.setGameState('playing');
      }
      return;
    }

    if (this.gameState === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
      this.startGame();
      return;
    }

    // Edge-triggered input buffering for Dash
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'Space') {
      this.inputBuffer.push({ action: 'dash', time: this.clock.getElapsedTime() });
    }

    // EMP Shockwave Action
    if (e.code === 'KeyE' || e.code === 'KeyQ') {
      this.triggerEMP();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysHeld[e.code] = false;
  };

  private handleBlur = () => {
    this.keysHeld = {};
    this.isPointerDown = false;
  };

  public updateAimFromPointer = () => {
    _raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hitPoint = _v1;
    if (_raycaster.ray.intersectPlane(_groundPlane, hitPoint)) {
      this.aimTargetX = hitPoint.x;
      this.aimTargetZ = hitPoint.z;
    }
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' || e.pointerType === 'pen' || e.pointerType === '') {
      this.hasMouseAim = true;
      this.hasVirtualAim = false;
    }

    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerNdc.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      this.updateAimFromPointer();
    }
  };

  private handlePointerDown = (e: PointerEvent) => {
    sound.unlock();
    if (e.pointerType === 'mouse' || e.pointerType === 'pen' || e.pointerType === '') {
      this.hasMouseAim = true;
      this.hasVirtualAim = false;
    }

    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerNdc.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      this.updateAimFromPointer();
    }

    if (e.button === 0) {
      this.isPointerDown = true;
    } else if (e.button === 2) {
      // Right click dash
      this.inputBuffer.push({ action: 'dash', time: this.clock.getElapsedTime() });
    }
  };

  private handlePointerUp = (e: PointerEvent) => {
    if (e.button === 0) {
      this.isPointerDown = false;
    }
  };

  private handleResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const aspect = w / h;
    this.camera.aspect = aspect;

    // Responsive camera framing for phones
    if (aspect < 0.8) {
      // Tall portrait phone (e.g. 9:16 or 9:19.5)
      this.cameraBaseY = 32;
      this.cameraBaseZ = 24;
      this.camera.fov = 64;
    } else if (aspect < 1.2) {
      // Compact square / foldable / tablet
      this.cameraBaseY = 26;
      this.cameraBaseZ = 20;
      this.camera.fov = 56;
    } else {
      // Standard landscape / desktop
      this.cameraBaseY = 22;
      this.cameraBaseZ = 18;
      this.camera.fov = 50;
    }

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public setGameState(state: GameState) {
    this.gameState = state;
    this.onStateChange(state);
    if (state === 'playing') {
      sound.startMusic();
    } else {
      sound.stopMusic();
    }
  }

  public startGame() {
    this.resetStats();
    this.setGameState('playing');
    this.startWave(1);
  }

  public setMechSkin(skinId: string) {
    this.currentSkin = getSkinById(skinId);
    saveSkinId(skinId);
    applySkinToMech(this.playerModel, this.currentSkin);
    this.playerStats.equippedSkinId = skinId;
    this.onStatsUpdate({ ...this.playerStats });
  }

  public resetStats() {
    this.playerStats.hp = this.playerStats.maxHp;
    this.playerStats.shield = this.playerStats.maxShield;
    this.playerStats.dashCharges = this.playerStats.maxDashCharges;
    this.playerStats.empCharge = 100;
    this.playerStats.score = 0;
    this.playerStats.combo = 0;
    this.playerStats.comboTimer = 0;
    this.playerStats.wave = 1;
    this.playerStats.sectorLevel = 1;
    this.playerStats.sectorName = 'Neon Core';
    this.playerStats.portalActive = false;
    this.playerStats.portalDistance = null;
    this.playerStats.portalAngle = null;
    this.playerStats.hazardCount = 0;
    this.playerStats.hazardTelegraphing = false;
    this.playerStats.xp = 0;
    this.playerStats.xpToNextLevel = 100;
    this.playerStats.level = 1;
    this.playerStats.kills = 0;

    this.playerX = 0;
    this.playerZ = 0;
    this.playerVx = 0;
    this.playerVz = 0;
    this.playerRot = 0;
    this.trauma = 0;
    this.hitstopTimer = 0;
    this.titleCinematicAngle = 0;
    this.isWarpingLevel = false;
    this.quantumPortal.despawn();
    this.hazardManager.clear();
    this.arena.setSector(1);
    this.playerModel.group.position.set(0, 0.6, 0);
    this.playerModel.group.rotation.set(0, 0, 0);

    // Clear entities
    this.clearAllEntities();
    this.updateEscortDrones();
  }

  private clearAllEntities() {
    this.enemies.forEach((e) => {
      this.scene.remove(e.group);
      if (e.telegraphMesh) this.scene.remove(e.telegraphMesh);
    });
    this.enemies = [];

    this.projectiles.forEach((p) => this.scene.remove(p.mesh));
    this.projectiles = [];

    this.pickups.forEach((p) => this.scene.remove(p.group));
    this.pickups = [];

    this.hazardManager.clear();
    this.bossEntity = null;
  }

  // --- Wave Director ---
  public startWave(waveNumber: number) {
    this.playerStats.wave = waveNumber;
    this.waveTimer = 0;
    this.waveEnemiesToSpawn = [];

    const isBossWave = waveNumber % 5 === 0;

    if (isBossWave) {
      sound.playTelegraphAlert();
      // Boss wave: Titan Colossus + supporting escorts
      this.waveEnemiesToSpawn.push({ type: 'colossus', delay: 1.0 });
      for (let i = 0; i < 4; i++) {
        this.waveEnemiesToSpawn.push({ type: 'stalker', delay: 3.0 + i * 2.0 });
      }
    } else {
      // Procedural wave compositions
      const stalkerCount = 6 + waveNumber * 3;
      const goliathCount = waveNumber >= 2 ? Math.floor(waveNumber * 1.2) : 0;
      const sniperCount = waveNumber >= 3 ? Math.floor(waveNumber * 0.9) : 0;

      for (let i = 0; i < stalkerCount; i++) {
        this.waveEnemiesToSpawn.push({ type: 'stalker', delay: 0.5 + i * 0.7 });
      }
      for (let i = 0; i < goliathCount; i++) {
        this.waveEnemiesToSpawn.push({ type: 'goliath', delay: 2.0 + i * 2.5 });
      }
      for (let i = 0; i < sniperCount; i++) {
        this.waveEnemiesToSpawn.push({ type: 'sniper', delay: 3.0 + i * 2.0 });
      }
    }
  }

  public spawnQuantumPortal() {
    if (this.quantumPortal.isActive) return;
    const nextSectorLevel = this.playerStats.sectorLevel + 1;
    const nextTheme = getSectorTheme(nextSectorLevel);
    this.quantumPortal.spawn(0, -3, nextSectorLevel, nextTheme.accentColor);
    sound.playPortalSpawn();
    this.playerStats.portalActive = true;
    this.playerStats.portalDistance = Math.round(
      this.quantumPortal.getDistance(this.playerX, this.playerZ)
    );
    this.playerStats.portalAngle = this.quantumPortal.getAngle(this.playerX, this.playerZ);
    this.onStatsUpdate({ ...this.playerStats });
  }

  public startWarpJump() {
    this.isWarpingLevel = true;
    this.warpTransitionTimer = 0;
    this.quantumPortal.triggerWarp();
    sound.playPortalWarp();
    triggerHaptic(80);
    this.addTrauma(0.6);
  }

  public advanceToNextSector() {
    this.isWarpingLevel = false;
    this.quantumPortal.despawn();
    this.hazardManager.clear();

    this.playerStats.sectorLevel += 1;
    const theme = getSectorTheme(this.playerStats.sectorLevel);
    this.playerStats.sectorName = theme.name;
    this.playerStats.score += 3000 * this.playerStats.sectorLevel;
    this.playerStats.portalActive = false;
    this.playerStats.portalDistance = null;
    this.playerStats.portalAngle = null;

    // Environmental sector transition
    this.arena.setSector(this.playerStats.sectorLevel);

    // Position player safely near entrance of new sector
    this.playerX = 0;
    this.playerZ = 8;
    this.playerVx = 0;
    this.playerVz = 0;

    // Trigger sector clear upgrade reward!
    this.triggerUpgradeSelection();

    // Start next wave
    this.startWave(this.playerStats.wave + 1);
  }

  private spawnEnemy(type: EnemyType) {
    const id = this.nextEnemyId++;
    const angle = Math.random() * Math.PI * 2;
    const dist = ARENA_RADIUS - 3;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;

    let entity: EnemyEntity;

    if (type === 'stalker') {
      const { group, meshes, eye } = createStalkerDrone();
      group.position.set(x, 0, z);
      this.scene.add(group);
      entity = {
        id,
        type,
        group,
        meshes,
        x,
        y: 0,
        z,
        vx: 0,
        vz: 0,
        rotation: 0,
        targetRotation: 0,
        maxHp: 45 + this.playerStats.wave * 10,
        hp: 45 + this.playerStats.wave * 10,
        speed: 9.5 + Math.min(this.playerStats.wave * 0.4, 4),
        radius: 0.8,
        state: 'chase',
        timer: 0,
        windupDuration: 0.7,
        telegraphProgress: 0,
        hitFlashTimer: 0,
        subParts: { eye },
      };
    } else if (type === 'goliath') {
      const { group, meshes, barrels } = createSiegeGoliath();
      group.position.set(x, 0, z);
      this.scene.add(group);
      entity = {
        id,
        type,
        group,
        meshes,
        x,
        y: 0,
        z,
        vx: 0,
        vz: 0,
        rotation: 0,
        targetRotation: 0,
        maxHp: 200 + this.playerStats.wave * 35,
        hp: 200 + this.playerStats.wave * 35,
        speed: 4.5,
        radius: 1.5,
        state: 'chase',
        timer: 0,
        windupDuration: 1.2,
        telegraphProgress: 0,
        hitFlashTimer: 0,
        subParts: { barrels },
      };
    } else if (type === 'sniper') {
      const { group, meshes, chargeRing } = createVectorDrone();
      group.position.set(x, 0, z);
      this.scene.add(group);
      entity = {
        id,
        type,
        group,
        meshes,
        x,
        y: 0,
        z,
        vx: 0,
        vz: 0,
        rotation: 0,
        targetRotation: 0,
        maxHp: 90 + this.playerStats.wave * 20,
        hp: 90 + this.playerStats.wave * 20,
        speed: 6.0,
        radius: 1.0,
        state: 'chase',
        timer: 0,
        windupDuration: 1.3,
        telegraphProgress: 0,
        hitFlashTimer: 0,
        subParts: { chargeRing },
      };
    } else {
      // Titan Colossus Boss
      const { group, meshes, core, shieldMesh } = createColossusBoss();
      group.position.set(0, 0, -ARENA_RADIUS + 6);
      this.scene.add(group);
      entity = {
        id,
        type,
        group,
        meshes,
        x: 0,
        y: 0,
        z: -ARENA_RADIUS + 6,
        vx: 0,
        vz: 0,
        rotation: 0,
        targetRotation: 0,
        maxHp: 1600 + this.playerStats.wave * 300,
        hp: 1600 + this.playerStats.wave * 300,
        speed: 3.2,
        radius: 3.2,
        state: 'chase',
        timer: 0,
        windupDuration: 1.5,
        telegraphProgress: 0,
        hitFlashTimer: 0,
        subParts: { core, shieldMesh },
      };
      this.bossEntity = entity;
    }

    this.enemies.push(entity);
  }

  // --- Projectile System ---
  public firePlayerShot() {
    sound.playLaser(920);

    const spread = this.playerStats.bulletSpread;
    const baseAngle = this.playerRot;

    const spreadAngles =
      spread === 1
        ? [0]
        : spread === 2
        ? [-0.08, 0.08]
        : spread === 3
        ? [-0.14, 0, 0.14]
        : [-0.2, -0.07, 0.07, 0.2];

    const multiplier = this.playerStats.comboMultiplier || 1.0;
    const finalDamage = Math.round(this.playerStats.bulletDamage * multiplier);
    const bulletColor =
      multiplier >= 3.0 ? 0xff00cc : multiplier >= 2.0 ? 0xf59e0b : multiplier >= 1.4 ? 0x38bdf8 : 0x00f0ff;
    const bulletRadius = multiplier >= 2.5 ? 0.11 : 0.08;

    spreadAngles.forEach((offsetAngle) => {
      const angle = baseAngle + offsetAngle;
      const speed = 42;
      const vx = -Math.sin(angle) * speed;
      const vz = -Math.cos(angle) * speed;

      // Create glowing projectile mesh
      const geo = new THREE.CylinderGeometry(bulletRadius, bulletRadius, 0.95, 6);
      geo.rotateX(Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ color: bulletColor });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        this.playerX - Math.sin(angle) * 0.9,
        0.55,
        this.playerZ - Math.cos(angle) * 0.9
      );
      mesh.rotation.y = angle;
      this.scene.add(mesh);

      this.projectiles.push({
        mesh,
        x: mesh.position.x,
        y: mesh.position.y,
        z: mesh.position.z,
        vx,
        vz,
        damage: finalDamage,
        isEnemy: false,
        pierceRemaining: this.playerStats.pierceCount,
        life: 0,
        maxLife: 1.5,
        radius: bulletRadius * 3.5,
        color: bulletColor,
      });

      // Muzzle spark
      this.particleManager.spawn(mesh.position.x, 0.55, mesh.position.z, multiplier >= 2 ? 6 : 4, bulletColor, 8, 0.35, 0.15);
    });
  }

  public fireEnemyShot(x: number, z: number, targetX: number, targetZ: number, damage: number, speed: number = 22) {
    sound.playEnemyLaser();
    const dx = targetX - x;
    const dz = targetZ - z;
    const dist = Math.hypot(dx, dz) || 1;
    const vx = (dx / dist) * speed;
    const vz = (dz / dist) * speed;

    const geo = new THREE.SphereGeometry(0.25, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.6, z);
    this.scene.add(mesh);

    this.projectiles.push({
      mesh,
      x,
      y: 0.6,
      z,
      vx,
      vz,
      damage,
      isEnemy: true,
      pierceRemaining: 0,
      life: 0,
      maxLife: 3.0,
      radius: 0.35,
      color: 0xff3b30,
    });
  }

  public triggerDash() {
    if (this.playerStats.dashCharges <= 0 || this.playerStats.isDashing) return;

    this.playerStats.dashCharges--;
    this.playerStats.isDashing = true;
    this.playerStats.dashTimeRemaining = 0.22;
    sound.playDash();
    triggerHaptic(30);

    // Dash burst direction
    let moveX = this.virtualMoveX;
    let moveZ = this.virtualMoveZ;
    if (this.keysHeld['KeyW'] || this.keysHeld['ArrowUp']) moveZ -= 1;
    if (this.keysHeld['KeyS'] || this.keysHeld['ArrowDown']) moveZ += 1;
    if (this.keysHeld['KeyA'] || this.keysHeld['ArrowLeft']) moveX -= 1;
    if (this.keysHeld['KeyD'] || this.keysHeld['ArrowRight']) moveX += 1;

    const len = Math.hypot(moveX, moveZ);
    if (len > 0.1) {
      this.playerVx = (moveX / len) * 36;
      this.playerVz = (moveZ / len) * 36;
    } else {
      // Dash towards aim
      const dx = this.aimTargetX - this.playerX;
      const dz = this.aimTargetZ - this.playerZ;
      const dlen = Math.hypot(dx, dz) || 1;
      this.playerVx = (dx / dlen) * 36;
      this.playerVz = (dz / dlen) * 36;
    }

    // Initialize thruster tracking coordinates for continuous trail
    this.playerModel.thrusterL.getWorldPosition(_v1);
    this.playerModel.thrusterR.getWorldPosition(_v2);
    this.prevThrusterLX = _v1.x;
    this.prevThrusterLY = _v1.y;
    this.prevThrusterLZ = _v1.z;
    this.prevThrusterRX = _v2.x;
    this.prevThrusterRY = _v2.y;
    this.prevThrusterRZ = _v2.z;

    // High-contrast neon-blue trail burst on dash initiation
    const trailColor = this.currentSkin?.colors?.trail || 0x00f0ff;
    this.particleManager.spawnDashTrail(
      _v1.x,
      _v1.y,
      _v1.z,
      _v2.x,
      _v2.y,
      _v2.z,
      this.playerVx,
      this.playerVz,
      trailColor
    );
    this.addTrauma(0.2);
  }

  public triggerEMP() {
    if (this.playerStats.empCharge < 100) return;
    this.playerStats.empCharge = 0;
    sound.playEMP();
    triggerHaptic(60);
    this.addTrauma(0.65);
    this.triggerHitstop(0.06);

    const empRadius = 16;
    this.particleManager.triggerEMPRing(this.playerX, this.playerZ, 0x00f0ff);
    this.particleManager.spawn(this.playerX, 0.5, this.playerZ, 60, 0x00f0ff, 18, 0.8, 0.6);

    // Wipe enemy projectiles in range
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.isEnemy) {
        const d = Math.hypot(p.x - this.playerX, p.z - this.playerZ);
        if (d <= empRadius) {
          this.scene.remove(p.mesh);
          this.particleManager.spawn(p.x, p.y, p.z, 6, 0x00f0ff, 6, 0.3, 0.2);
          this.projectiles.splice(i, 1);
        }
      }
    }

    // Heavy damage to all enemies in radius
    this.enemies.forEach((enemy) => {
      const d = Math.hypot(enemy.x - this.playerX, enemy.z - this.playerZ);
      if (d <= empRadius) {
        this.damageEnemy(enemy, 160 + this.playerStats.bulletDamage * 2);
        // Knockback
        const kx = (enemy.x - this.playerX) / (d || 1);
        const kz = (enemy.z - this.playerZ) / (d || 1);
        enemy.vx += kx * 20;
        enemy.vz += kz * 20;
      }
    });
  }

  public addTrauma(amount: number) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  public triggerHitstop(duration: number) {
    this.hitstopTimer = Math.max(this.hitstopTimer, duration);
  }

  public damageEnemy(
    enemy: EnemyEntity,
    damage: number,
    hitX?: number,
    hitY?: number,
    hitZ?: number
  ) {
    enemy.hp -= damage;
    enemy.hitFlashTimer = 0.08;
    sound.playHit();

    // Refresh combo timer slightly on successful damage hits so sustained fire maintains streak
    if (this.playerStats.combo > 0) {
      this.playerStats.comboTimer = Math.min(3.5, this.playerStats.comboTimer + 0.35);
    }

    // Hit flash meshes to white
    enemy.meshes.forEach((m) => {
      m.material = materials.hitFlashMat;
    });

    // If damage was triggered without direct projectile collision (e.g. EMP blast or chain lightning),
    // spawn colorful particle burst at the enemy position
    if (hitX === undefined) {
      this.particleManager.spawnHitExplosion(
        enemy.x,
        0.7,
        enemy.z,
        0x00f0ff,
        0,
        0,
        this.playerStats.comboMultiplier
      );
    }

    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  private killEnemy(enemy: EnemyEntity) {
    sound.playExplosion(enemy.type === 'colossus');
    this.addTrauma(enemy.type === 'colossus' ? 0.7 : 0.25);
    this.triggerHitstop(enemy.type === 'colossus' ? 0.08 : 0.035);

    const isLarge = enemy.type === 'colossus' || enemy.type === 'goliath';
    this.particleManager.spawn(
      enemy.x,
      1.0,
      enemy.z,
      isLarge ? 70 : 25,
      enemy.type === 'colossus' ? 0xf43f5e : 0xff9900,
      isLarge ? 16 : 9,
      0.65,
      0.5
    );

    // Score & Combo
    this.playerStats.kills++;
    this.playerStats.combo++;
    this.playerStats.comboTimer = 3.5;
    const multiplier = 1 + Math.min(this.playerStats.combo * 0.1, 4.0);
    this.playerStats.comboMultiplier = Number(multiplier.toFixed(1));
    const basePoints = enemy.type === 'colossus' ? 3000 : enemy.type === 'goliath' ? 400 : 150;
    this.playerStats.score += Math.round(basePoints * multiplier);
    this.playerStats.empCharge = Math.min(100, this.playerStats.empCharge + (isLarge ? 35 : 12));

    // Visceral audio feedback for streaks
    if (this.playerStats.combo >= 2) {
      sound.playComboStreak(this.playerStats.combo);
    }

    // Siphon Nanite upgrade
    if (this.playerStats.siphonChance > 0 && Math.random() < this.playerStats.siphonChance) {
      this.playerStats.hp = Math.min(this.playerStats.maxHp, this.playerStats.hp + 12);
      sound.playPickup();
      this.particleManager.spawn(this.playerX, 0.5, this.playerZ, 12, 0x10b981, 6, 0.4, 0.3);
    }

    // Spawn Pickups (XP and chance for heal/emp)
    this.spawnPickup('xp', enemy.x, enemy.z);
    if (Math.random() < 0.18 || enemy.type === 'colossus') {
      this.spawnPickup(Math.random() < 0.5 ? 'heal' : 'emp', enemy.x + 0.5, enemy.z);
    }

    // Cleanup enemy
    this.scene.remove(enemy.group);
    if (enemy.telegraphMesh) this.scene.remove(enemy.telegraphMesh);
    const idx = this.enemies.indexOf(enemy);
    if (idx !== -1) this.enemies.splice(idx, 1);

    if (enemy === this.bossEntity) {
      this.bossEntity = null;
    }
  }

  private spawnPickup(type: 'xp' | 'heal' | 'emp', x: number, z: number) {
    const id = this.nextPickupId++;
    const { group, mesh } = createPickupMesh(type);
    group.position.set(x, 0, z);
    this.scene.add(group);
    this.pickups.push({ id, type, group, mesh, x, z, life: 18.0 });
  }

  public damagePlayer(damage: number) {
    if (this.playerStats.isDashing || this.gameState !== 'playing') return;

    sound.playPlayerHurt();
    this.addTrauma(0.5);
    this.triggerHitstop(0.05);
    this.playerStats.shieldDelayTimer = 3.0; // 3s before shield regens

    if (this.playerStats.shield > 0) {
      const absorbed = Math.min(this.playerStats.shield, damage);
      this.playerStats.shield -= absorbed;
      damage -= absorbed;
      this.particleManager.spawn(this.playerX, 0.6, this.playerZ, 15, 0x00f0ff, 8, 0.4, 0.3);
    }

    if (damage > 0) {
      this.playerStats.hp -= damage;
      this.particleManager.spawn(this.playerX, 0.6, this.playerZ, 20, 0xef4444, 10, 0.5, 0.3);

      if (this.playerStats.hp <= 0) {
        this.playerStats.hp = 0;
        sound.playExplosion(true);
        this.setGameState('gameover');
      }
    }
  }

  private addPlayerXp(amount: number) {
    this.playerStats.xp += amount;
    if (this.playerStats.xp >= this.playerStats.xpToNextLevel) {
      this.playerStats.xp -= this.playerStats.xpToNextLevel;
      this.playerStats.level++;
      this.playerStats.xpToNextLevel = Math.round(this.playerStats.xpToNextLevel * 1.35);
      sound.playLevelUp();
      this.triggerUpgradeSelection();
    }
  }

  private triggerUpgradeSelection() {
    this.setGameState('upgrade');
    // Pick 3 random eligible upgrades
    const available = ALL_UPGRADES.filter((u) => u.level < u.maxLevel);
    const shuffled = [...available].sort(() => 0.5 - Math.random());
    const choices = shuffled.slice(0, 3);
    this.onUpgradePrompt(choices);
  }

  public applyUpgrade(upgradeId: string) {
    const upgrade = ALL_UPGRADES.find((u) => u.id === upgradeId);
    if (!upgrade) return;

    upgrade.level++;
    if (upgrade.id === 'plasma_split') {
      this.playerStats.bulletSpread = Math.min(4, this.playerStats.bulletSpread + 1);
    } else if (upgrade.id === 'overclock_thruster') {
      this.playerStats.moveSpeed *= 1.2;
      this.playerStats.dashCooldown *= 0.8;
    } else if (upgrade.id === 'plasma_pierce') {
      this.playerStats.pierceCount++;
    } else if (upgrade.id === 'chain_lightning') {
      this.playerStats.chainLightning = true;
    } else if (upgrade.id === 'siphon_nanite') {
      this.playerStats.siphonChance += 0.15;
    } else if (upgrade.id === 'orbital_drone') {
      this.playerStats.orbitalDrones++;
      this.updateEscortDrones();
    } else if (upgrade.id === 'emp_supercharge') {
      this.playerStats.bulletDamage += 12;
    }

    this.setGameState('playing');
  }

  private updateEscortDrones() {
    // Clear old drones
    this.escortDrones.forEach((d) => this.scene.remove(d));
    this.escortDrones = [];

    for (let i = 0; i < this.playerStats.orbitalDrones; i++) {
      const droneGroup = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.25, 0),
        materials.playerHull
      );
      body.castShadow = true;
      droneGroup.add(body);

      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        materials.playerTrim
      );
      eye.position.z = -0.2;
      droneGroup.add(eye);

      this.scene.add(droneGroup);
      this.escortDrones.push(droneGroup);
    }
  }

  // --- Main Simulation Loop ---
  private startLoop() {
    const tick = () => {
      if (!this.isRunning) return;
      this.animFrameId = requestAnimationFrame(tick);

      // Clamp delta time to 50ms per prompt requirement
      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const elapsedTime = this.clock.getElapsedTime();

      if (this.gameState === 'title') {
        this.updateTitleCinematic(dt, elapsedTime);
      } else if (this.gameState === 'playing') {
        this.updateSimulation(dt, elapsedTime);
        // Apply camera shake & smooth tracking ONLY during active gameplay
        this.updateCamera(dt);
      } else if (this.gameState === 'paused' || this.gameState === 'gameover') {
        this.updateCamera(dt);
      }

      // Arena & particle animation always tick
      this.arena.update(elapsedTime);
      this.particleManager.update(dt);

      this.renderer.render(this.scene, this.camera);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  private updateTitleCinematic(dt: number, time: number) {
    this.titleCinematicAngle += dt * 0.45;
    const camDist = 9.5;
    const camHeight = 4.2;

    this.camera.position.set(
      Math.sin(this.titleCinematicAngle) * camDist,
      camHeight + Math.sin(time * 0.5) * 0.5,
      Math.cos(this.titleCinematicAngle) * camDist
    );
    this.camera.lookAt(0, 0.8, 0);

    // Gently hover player mech
    this.playerModel.group.position.set(0, 0.6 + Math.sin(time * 2.0) * 0.1, 0);
    this.playerModel.group.rotation.y = time * 0.25;

    // Thruster scale
    const flameScale = 1.0 + Math.sin(time * 12) * 0.15;
    this.playerModel.thrusterL.scale.set(1, flameScale, 1);
    this.playerModel.thrusterR.scale.set(1, flameScale, 1);
  }

  private updateSimulation(dt: number, time: number) {
    // Hitstop handler (30-80ms simulation pause on heavy impacts)
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    // Input buffer processing (Coyote time & action buffering)
    for (let i = this.inputBuffer.length - 1; i >= 0; i--) {
      const item = this.inputBuffer[i];
      if (item.action === 'dash') {
        if (this.playerStats.dashCharges > 0 && !this.playerStats.isDashing) {
          this.triggerDash();
          this.inputBuffer.splice(i, 1);
          break;
        }
      }
      if (time - item.time > 0.18) {
        // Expire buffer
        this.inputBuffer.splice(i, 1);
      }
    }

    // Dash cooldown recharge
    if (this.playerStats.dashCharges < this.playerStats.maxDashCharges) {
      this.playerStats.dashTimer += dt;
      if (this.playerStats.dashTimer >= this.playerStats.dashCooldown) {
        this.playerStats.dashCharges++;
        this.playerStats.dashTimer = 0;
      }
    }

    // Shield Delay & Regeneration
    if (this.playerStats.shieldDelayTimer > 0) {
      this.playerStats.shieldDelayTimer -= dt;
    } else if (this.playerStats.shield < this.playerStats.maxShield) {
      this.playerStats.shield = Math.min(
        this.playerStats.maxShield,
        this.playerStats.shield + this.playerStats.shieldRegenRate * dt
      );
    }

    // Combo timer
    if (this.playerStats.comboTimer > 0) {
      this.playerStats.comboTimer -= dt;
      if (this.playerStats.comboTimer <= 0) {
        this.playerStats.combo = 0;
        this.playerStats.comboMultiplier = 1.0;
        this.playerStats.comboTimer = 0;
      }
    }

    // --- Player Movement & Kinematics ---
    let moveInputX = this.virtualMoveX;
    let moveInputZ = this.virtualMoveZ;
    if (this.keysHeld['KeyW'] || this.keysHeld['ArrowUp']) moveInputZ -= 1;
    if (this.keysHeld['KeyS'] || this.keysHeld['ArrowDown']) moveInputZ += 1;
    if (this.keysHeld['KeyA'] || this.keysHeld['ArrowLeft']) moveInputX -= 1;
    if (this.keysHeld['KeyD'] || this.keysHeld['ArrowRight']) moveInputX += 1;

    const inputLen = Math.hypot(moveInputX, moveInputZ);
    if (inputLen > 1.0) {
      moveInputX /= inputLen;
      moveInputZ /= inputLen;
    }

    if (this.playerStats.isDashing) {
      this.playerStats.dashTimeRemaining -= dt;
      if (this.playerStats.dashTimeRemaining <= 0) {
        this.playerStats.isDashing = false;
      }
    } else {
      // Smooth exponential acceleration / damping
      const targetVx = moveInputX * this.playerStats.moveSpeed;
      const targetVz = moveInputZ * this.playerStats.moveSpeed;
      this.playerVx = THREE.MathUtils.damp(this.playerVx, targetVx, 12, dt);
      this.playerVz = THREE.MathUtils.damp(this.playerVz, targetVz, 12, dt);
    }

    this.playerX += this.playerVx * dt;
    this.playerZ += this.playerVz * dt;

    // Arena boundary containment
    const distFromCenter = Math.hypot(this.playerX, this.playerZ);
    const maxBound = ARENA_RADIUS - 1.2;
    if (distFromCenter > maxBound) {
      this.playerX = (this.playerX / distFromCenter) * maxBound;
      this.playerZ = (this.playerZ / distFromCenter) * maxBound;
    }

    // --- Smart Targeting & Aiming (Continuous Cursor Tracking & Reticle) ---
    if (this.hasMouseAim) {
      this.updateAimFromPointer();
    }

    let nearestEnemy: EnemyEntity | null = null;
    let minEnemyDist = 32.0;
    let hoveredEnemy: EnemyEntity | null = null;
    let minHoverDist = 2.5;

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      const dist = Math.hypot(e.x - this.playerX, e.z - this.playerZ);
      const weightedDist = e.type === 'colossus' ? dist * 0.7 : dist;
      if (weightedDist < minEnemyDist) {
        minEnemyDist = weightedDist;
        nearestEnemy = e;
      }

      // Check if mouse cursor / aim target is hovering over or targeting this enemy
      const distFromAim = Math.hypot(e.x - this.aimTargetX, e.z - this.aimTargetZ);
      if (distFromAim < e.radius + 1.2 && distFromAim < minHoverDist) {
        minHoverDist = distFromAim;
        hoveredEnemy = e;
      }
    }

    let targetRot = this.playerRot;

    if (this.hasVirtualAim && Math.hypot(this.virtualAimX, this.virtualAimZ) > 0.05) {
      // 1. Right virtual stick has active input
      targetRot = Math.atan2(-this.virtualAimX, -this.virtualAimZ);
      this.aimTargetX = this.playerX + this.virtualAimX * 14;
      this.aimTargetZ = this.playerZ + this.virtualAimZ * 14;
    } else if (this.hasMouseAim) {
      // 2. Mouse aiming on desktop: continuously tracks mouse cursor with precision
      const aimDx = this.aimTargetX - this.playerX;
      const aimDz = this.aimTargetZ - this.playerZ;
      if (Math.hypot(aimDx, aimDz) > 0.25) {
        targetRot = Math.atan2(-aimDx, -aimDz);
      }
    } else if (this.autoFire && nearestEnemy) {
      // 3. Auto-lock onto nearest target ONLY if user enabled Auto-Mode
      const aimDx = nearestEnemy.x - this.playerX;
      const aimDz = nearestEnemy.z - this.playerZ;
      targetRot = Math.atan2(-aimDx, -aimDz);
      this.aimTargetX = nearestEnemy.x;
      this.aimTargetZ = nearestEnemy.z;
    } else if (inputLen > 0.05) {
      // 4. Moving without explicit aiming: mech smoothly faces direction of travel
      targetRot = Math.atan2(-moveInputX, -moveInputZ);
      this.aimTargetX = this.playerX + moveInputX * 10;
      this.aimTargetZ = this.playerZ + moveInputZ * 10;
    }

    // Shortest angular difference wrapping between -PI and PI for silky-smooth rotation
    let angleDiff = targetRot - this.playerRot;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

    const rotSpeed = this.hasVirtualAim ? 26 : this.hasMouseAim ? 38 : 16;
    this.playerRot += angleDiff * (1 - Math.exp(-rotSpeed * dt));

    // Update holographic reticle and laser sight guide
    const isPlaying = this.gameState === 'playing' && !this.isWarpingLevel;
    const shouldShowAim =
      isPlaying &&
      (this.hasMouseAim || this.hasVirtualAim || (this.autoFire && nearestEnemy !== null));

    if (shouldShowAim) {
      const targetPos = hoveredEnemy
        ? { x: hoveredEnemy.x, z: hoveredEnemy.z }
        : { x: this.aimTargetX, z: this.aimTargetZ };

      this.reticleGroup.position.set(targetPos.x, 0.04, targetPos.z);
      this.reticleGroup.visible = true;

      const isLocked = hoveredEnemy !== null || (this.autoFire && nearestEnemy !== null);
      this.isAimLockedOn = isLocked;

      const skinTrim = this.currentSkin?.colors?.trim || 0x00f0ff;
      const activeColor = isLocked ? 0xff2a55 : skinTrim;

      this.reticleMaterial.color.setHex(activeColor);
      (this.reticleBrackets.material as THREE.LineBasicMaterial).color.setHex(activeColor);

      this.reticleOuterRing.rotation.z = time * (isLocked ? 3.5 : 2.0);
      this.reticleBrackets.rotation.y = -time * (isLocked ? 3.5 : 2.0);
      const reticleScale = isLocked
        ? 1.25 + Math.sin(time * 16) * 0.1
        : 1.0 + Math.sin(time * 4) * 0.05;
      this.reticleGroup.scale.setScalar(reticleScale);

      // Aim Guide Laser Line connecting mech cannons to reticle target
      this.aimLaserLine.visible = true;
      const muzzleX = this.playerX - Math.sin(this.playerRot) * 0.85;
      const muzzleZ = this.playerZ - Math.cos(this.playerRot) * 0.85;
      const positions = (this.aimLaserLine.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
      positions[0] = muzzleX;
      positions[1] = 0.55;
      positions[2] = muzzleZ;
      positions[3] = targetPos.x;
      positions[4] = 0.06;
      positions[5] = targetPos.z;
      this.aimLaserLine.geometry.attributes.position.needsUpdate = true;

      this.aimLaserMaterial.color.setHex(activeColor);
      this.aimLaserMaterial.opacity = isLocked ? 0.65 : 0.28;
    } else {
      this.reticleGroup.visible = false;
      this.aimLaserLine.visible = false;
    }

    // Apply model transforms with hover bobbing & bank roll
    const hoverY = 0.55 + Math.sin(time * 6) * 0.05;
    this.playerModel.group.position.set(this.playerX, hoverY, this.playerZ);
    this.playerModel.group.rotation.y = this.playerRot;

    // Bank roll on lateral turn
    const bankTarget = -this.playerVx * 0.035;
    this.playerModel.group.rotation.z = THREE.MathUtils.damp(
      this.playerModel.group.rotation.z,
      bankTarget,
      8,
      dt
    );

    // Thruster flame dynamics
    const thrustScale =
      this.playerStats.isDashing ? 3.0 : inputLen > 0.1 ? 1.3 + Math.sin(time * 25) * 0.2 : 0.8;
    this.playerModel.thrusterL.scale.set(1, thrustScale, 1);
    this.playerModel.thrusterR.scale.set(1, thrustScale, 1);

    // Continuous High-Contrast Neon-Blue Particle Trail on Kinetic Dash
    this.playerModel.thrusterL.getWorldPosition(_v1);
    this.playerModel.thrusterR.getWorldPosition(_v2);

    if (this.playerStats.isDashing) {
      const trailColor = this.currentSkin?.colors?.trail || 0x00f0ff;
      const subSteps = 3;
      for (let s = 1; s <= subSteps; s++) {
        const alpha = s / subSteps;
        const lx = THREE.MathUtils.lerp(this.prevThrusterLX || _v1.x, _v1.x, alpha);
        const ly = THREE.MathUtils.lerp(this.prevThrusterLY || _v1.y, _v1.y, alpha);
        const lz = THREE.MathUtils.lerp(this.prevThrusterLZ || _v1.z, _v1.z, alpha);

        const rx = THREE.MathUtils.lerp(this.prevThrusterRX || _v2.x, _v2.x, alpha);
        const ry = THREE.MathUtils.lerp(this.prevThrusterRY || _v2.y, _v2.y, alpha);
        const rz = THREE.MathUtils.lerp(this.prevThrusterRZ || _v2.z, _v2.z, alpha);

        this.particleManager.spawnDashTrail(
          lx,
          ly,
          lz,
          rx,
          ry,
          rz,
          this.playerVx,
          this.playerVz,
          trailColor
        );
      }
    }
    this.prevThrusterLX = _v1.x;
    this.prevThrusterLY = _v1.y;
    this.prevThrusterLZ = _v1.z;
    this.prevThrusterRX = _v2.x;
    this.prevThrusterRY = _v2.y;
    this.prevThrusterRZ = _v2.z;

    // Core rotation
    this.playerModel.core.rotation.y = time * 4.0;

    // --- Weapon Firing ---
    this.fireTimer += dt;
    const fireInterval = 1 / this.playerStats.fireRate;
    const wantsToFire =
      this.isPointerDown ||
      this.keysHeld['Space'] ||
      this.virtualFiring ||
      (this.autoFire && nearestEnemy !== null);

    if (wantsToFire && this.fireTimer >= fireInterval) {
      this.firePlayerShot();
      this.fireTimer = 0;
    }

    // --- Escort Drones Update ---
    if (this.escortDrones.length > 0) {
      this.escortDroneTimer += dt;
      this.escortDrones.forEach((drone, idx) => {
        const droneAngle = time * 2.5 + (idx * Math.PI * 2) / this.escortDrones.length;
        const dX = this.playerX + Math.cos(droneAngle) * 2.2;
        const dZ = this.playerZ + Math.sin(droneAngle) * 2.2;
        drone.position.set(dX, 0.9 + Math.sin(time * 4 + idx) * 0.1, dZ);

        // Auto target nearest enemy
        let nearest: EnemyEntity | null = null;
        let minDist = 18;
        this.enemies.forEach((e) => {
          const d = Math.hypot(e.x - dX, e.z - dZ);
          if (d < minDist) {
            minDist = d;
            nearest = e;
          }
        });

        if (nearest) {
          drone.lookAt((nearest as EnemyEntity).x, 0.7, (nearest as EnemyEntity).z);
          if (this.escortDroneTimer >= 0.65) {
            this.fireDroneShot(dX, dZ, nearest);
          }
        }
      });
      if (this.escortDroneTimer >= 0.65) {
        this.escortDroneTimer = 0;
      }
    }

    // --- Quantum Warp Portal & Sector Level Progression ---
    if (this.quantumPortal.isActive) {
      this.quantumPortal.update(dt, time, this.particleManager);

      const pDist = this.quantumPortal.getDistance(this.playerX, this.playerZ);
      const pAngle = this.quantumPortal.getAngle(this.playerX, this.playerZ);
      this.playerStats.portalActive = true;
      this.playerStats.portalDistance = Math.round(pDist);
      this.playerStats.portalAngle = pAngle;

      // Check if player hovers into the Quantum Warp Portal
      if (this.quantumPortal.checkEnter(this.playerX, this.playerZ) && !this.isWarpingLevel) {
        this.startWarpJump();
      }
    }

    // Warp sequence handling
    if (this.isWarpingLevel) {
      this.warpTransitionTimer += dt;
      this.playerX = THREE.MathUtils.lerp(this.playerX, this.quantumPortal.x, 8 * dt);
      this.playerZ = THREE.MathUtils.lerp(this.playerZ, this.quantumPortal.z, 8 * dt);
      this.particleManager.spawnPortalSwirl(this.playerX, 1.0, this.playerZ, 2.0, 0x00f0ff);

      if (this.warpTransitionTimer >= 0.45) {
        this.advanceToNextSector();
      }
    }

    // --- Wave Director Spawn Tick ---
    this.waveTimer += dt;
    for (let i = this.waveEnemiesToSpawn.length - 1; i >= 0; i--) {
      const item = this.waveEnemiesToSpawn[i];
      if (this.waveTimer >= item.delay) {
        this.spawnEnemy(item.type);
        this.waveEnemiesToSpawn.splice(i, 1);
      }
    }

    // Wave & Sector Completion Check
    if (this.waveEnemiesToSpawn.length === 0 && this.enemies.length === 0) {
      // Sector level clearance: every 2 waves triggers the Quantum Portal!
      const isSectorClear = this.playerStats.wave % 2 === 0;

      if (isSectorClear) {
        // Sector cleared! Spawn Quantum Warp Portal to advance to the next level
        if (!this.quantumPortal.isActive && !this.isWarpingLevel) {
          this.spawnQuantumPortal();
        }
      } else {
        // Inter-sector wave progression
        this.playerStats.score += 500 * this.playerStats.wave;
        this.startWave(this.playerStats.wave + 1);
        this.triggerUpgradeSelection();
      }
    }

    // --- Update Enemies with Telegraphed Behaviors ---
    this.updateEnemies(dt, time);

    // --- Update Localized Arena Hazards (Electrified Tiles & Laser Grids) ---
    this.hazardManager.update(
      dt,
      time,
      { x: this.playerX, z: this.playerZ, isDashing: this.playerStats.isDashing },
      (damage) => this.damagePlayer(damage),
      (enemy: EnemyEntity, damage: number, hitX?: number, hitY?: number, hitZ?: number) =>
        this.damageEnemy(enemy, damage, hitX, hitY, hitZ),
      this.enemies,
      this.playerStats.wave,
      this.playerStats.sectorLevel,
      this.gameState === 'playing' && !this.isWarpingLevel
    );

    this.playerStats.hazardCount = this.hazardManager.getActiveCount();
    this.playerStats.hazardTelegraphing = this.hazardManager.getTelegraphingCount() > 0;

    // --- Update Projectiles ---
    this.updateProjectiles(dt);

    // --- Update Pickups ---
    this.updatePickups(dt, time);

    // Sync stats to UI
    this.onStatsUpdate({ ...this.playerStats });
  }

  private fireDroneShot(x: number, z: number, target: EnemyEntity) {
    sound.playLaser(1100);
    const dx = target.x - x;
    const dz = target.z - z;
    const dist = Math.hypot(dx, dz) || 1;
    const vx = (dx / dist) * 35;
    const vz = (dz / dist) * 35;

    const geo = new THREE.SphereGeometry(0.12, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.8, z);
    this.scene.add(mesh);

    this.projectiles.push({
      mesh,
      x,
      y: 0.8,
      z,
      vx,
      vz,
      damage: 18,
      isEnemy: false,
      pierceRemaining: 0,
      life: 0,
      maxLife: 1.2,
      radius: 0.2,
      color: 0x38bdf8,
    });
  }

  private updateEnemies(dt: number, time: number) {
    this.enemies.forEach((enemy) => {
      // Restore hit flash materials
      if (enemy.hitFlashTimer > 0) {
        enemy.hitFlashTimer -= dt;
        if (enemy.hitFlashTimer <= 0) {
          enemy.meshes.forEach((m) => {
            if (enemy.type === 'stalker') m.material = materials.stalkerArmor;
            else if (enemy.type === 'goliath') m.material = materials.goliathArmor;
            else if (enemy.type === 'sniper') m.material = materials.sniperArmor;
            else m.material = materials.bossArmor;
          });
        }
      }

      const dx = this.playerX - enemy.x;
      const dz = this.playerZ - enemy.z;
      const dist = Math.hypot(dx, dz);

      // Distinct enemy behaviors with visible windups
      if (enemy.type === 'stalker') {
        // Stalker: Chases close, then enters 0.7s telegraphed windup, then lunges at 28 speed!
        if (enemy.state === 'chase') {
          enemy.rotation = Math.atan2(-dx, -dz);
          enemy.vx = (dx / (dist || 1)) * enemy.speed;
          enemy.vz = (dz / (dist || 1)) * enemy.speed;

          if (dist < 8.0) {
            enemy.state = 'windup';
            enemy.timer = 0;
            sound.playTelegraphAlert();
          }
        } else if (enemy.state === 'windup') {
          enemy.timer += dt;
          enemy.telegraphProgress = enemy.timer / enemy.windupDuration;
          // Decelerate and lock on
          enemy.vx *= 0.85;
          enemy.vz *= 0.85;
          enemy.rotation = Math.atan2(-dx, -dz);

          // Eye flares intense red
          if (enemy.subParts?.eye) {
            (enemy.subParts.eye as THREE.Mesh).scale.setScalar(1 + enemy.telegraphProgress * 0.8);
          }

          if (enemy.timer >= enemy.windupDuration) {
            enemy.state = 'attack';
            enemy.timer = 0;
            // High speed lunge vector towards player
            enemy.vx = (dx / (dist || 1)) * 26;
            enemy.vz = (dz / (dist || 1)) * 26;
            this.particleManager.spawn(enemy.x, 0.5, enemy.z, 15, 0xff3b30, 8, 0.4, 0.2);
          }
        } else if (enemy.state === 'attack') {
          enemy.timer += dt;
          // Check collision with player
          if (dist < enemy.radius + 0.8) {
            this.damagePlayer(25);
            enemy.state = 'cooldown';
            enemy.timer = 0;
          }
          if (enemy.timer >= 0.4) {
            enemy.state = 'cooldown';
            enemy.timer = 0;
          }
        } else if (enemy.state === 'cooldown') {
          enemy.timer += dt;
          enemy.vx *= 0.9;
          enemy.vz *= 0.9;
          if (enemy.subParts?.eye) {
            (enemy.subParts.eye as THREE.Mesh).scale.set(1, 1, 1);
          }
          if (enemy.timer >= 1.2) {
            enemy.state = 'chase';
          }
        }
      } else if (enemy.type === 'goliath') {
        // Goliath: Stays at mid range (12-16 units), winds up dual mortar artillery
        enemy.rotation = Math.atan2(-dx, -dz);
        if (enemy.state === 'chase') {
          if (dist > 15) {
            enemy.vx = (dx / dist) * enemy.speed;
            enemy.vz = (dz / dist) * enemy.speed;
          } else {
            enemy.vx *= 0.85;
            enemy.vz *= 0.85;
            enemy.state = 'windup';
            enemy.timer = 0;
          }
        } else if (enemy.state === 'windup') {
          enemy.timer += dt;
          enemy.telegraphProgress = enemy.timer / enemy.windupDuration;
          enemy.vx *= 0.8;
          enemy.vz *= 0.8;

          // Barrels elevate
          if (enemy.subParts?.barrels) {
            enemy.subParts.barrels.rotation.x = -enemy.telegraphProgress * 0.4;
          }

          if (enemy.timer >= enemy.windupDuration) {
            // Fire twin heavy shells
            this.fireEnemyShot(enemy.x + 0.4, enemy.z, this.playerX, this.playerZ, 22, 16);
            this.fireEnemyShot(enemy.x - 0.4, enemy.z, this.playerX, this.playerZ, 22, 16);
            this.particleManager.spawn(enemy.x, 1.2, enemy.z, 20, 0xf59e0b, 10, 0.6, 0.3);
            enemy.state = 'cooldown';
            enemy.timer = 0;
          }
        } else if (enemy.state === 'cooldown') {
          enemy.timer += dt;
          if (enemy.subParts?.barrels) {
            enemy.subParts.barrels.rotation.x = 0;
          }
          if (enemy.timer >= 2.2) {
            enemy.state = 'chase';
          }
        }
      } else if (enemy.type === 'sniper') {
        // Vector Sniper: Orbits player at 18-22 units, charges railgun laser beam
        const orbitAngle = time * 0.8 + enemy.id;
        const targetDist = 18;
        const targetX = this.playerX + Math.cos(orbitAngle) * targetDist;
        const targetZ = this.playerZ + Math.sin(orbitAngle) * targetDist;
        const dtx = targetX - enemy.x;
        const dtz = targetZ - enemy.z;

        enemy.vx = dtx * 2.0;
        enemy.vz = dtz * 2.0;
        enemy.rotation = Math.atan2(-dx, -dz);

        // Spin charge ring
        if (enemy.subParts?.chargeRing) {
          enemy.subParts.chargeRing.rotation.z = time * 8.0;
        }

        enemy.timer += dt;
        if (enemy.timer >= 2.5) {
          // Railgun sniper shot
          this.fireEnemyShot(enemy.x, enemy.z, this.playerX, this.playerZ, 30, 36);
          this.particleManager.spawn(enemy.x, 0.8, enemy.z, 15, 0xd946ef, 12, 0.4, 0.25);
          enemy.timer = 0;
        }
      } else if (enemy.type === 'colossus') {
        // Boss: Colossus
        this.bossHpRatio = Math.max(0, enemy.hp / enemy.maxHp);
        enemy.rotation = Math.atan2(-dx, -dz);

        // Advance towards center
        if (dist > 10) {
          enemy.vx = (dx / dist) * enemy.speed;
          enemy.vz = (dz / dist) * enemy.speed;
        } else {
          enemy.vx *= 0.9;
          enemy.vz *= 0.9;
        }

        // Pulse core & rotate shield
        if (enemy.subParts?.core) {
          (enemy.subParts.core as THREE.Mesh).rotation.y = time * 3.0;
        }
        if (enemy.subParts?.shieldMesh) {
          (enemy.subParts.shieldMesh as THREE.Mesh).rotation.y = -time * 0.5;
        }

        // Multi-phase attack cycle
        enemy.timer += dt;
        if (enemy.timer >= 2.2) {
          // Quad spread volley
          const baseAng = enemy.rotation;
          [-0.3, -0.1, 0.1, 0.3].forEach((angOffset) => {
            const shotAng = baseAng + angOffset;
            const sx = enemy.x - Math.sin(shotAng) * 2.5;
            const sz = enemy.z - Math.cos(shotAng) * 2.5;
            const targetX = sx - Math.sin(shotAng) * 20;
            const targetZ = sz - Math.cos(shotAng) * 20;
            this.fireEnemyShot(sx, sz, targetX, targetZ, 20, 20);
          });
          enemy.timer = 0;
        }
      }

      // Kinematics & collision with other enemies
      enemy.x += enemy.vx * dt;
      enemy.z += enemy.vz * dt;

      // Arena clamp
      const dCenter = Math.hypot(enemy.x, enemy.y);
      if (dCenter > ARENA_RADIUS - 1.5) {
        enemy.x = (enemy.x / dCenter) * (ARENA_RADIUS - 1.5);
        enemy.z = (enemy.z / dCenter) * (ARENA_RADIUS - 1.5);
      }

      enemy.group.position.set(enemy.x, 0, enemy.z);
      enemy.group.rotation.y = enemy.rotation;
    });
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.z += p.vz * dt;

      p.mesh.position.set(p.x, p.y, p.z);

      // Check lifetime / arena bounds
      if (p.life >= p.maxLife || Math.hypot(p.x, p.z) > ARENA_RADIUS) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      // Player projectiles hitting enemies
      if (!p.isEnemy) {
        let hit = false;
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const enemy = this.enemies[j];
          const dist = Math.hypot(enemy.x - p.x, enemy.z - p.z);
          if (dist < enemy.radius + p.radius) {
            // Compute exact collision point on enemy perimeter where projectile strikes
            const dx = p.x - enemy.x;
            const dz = p.z - enemy.z;
            const norm = Math.hypot(dx, dz) || 1;
            const hitX = enemy.x + (dx / norm) * Math.min(enemy.radius, norm);
            const hitZ = enemy.z + (dz / norm) * Math.min(enemy.radius, norm);
            const hitY = Math.max(0.25, Math.min(1.2, p.y));

            // Trigger short-lived, colorful particle explosion at exact collision point
            this.particleManager.spawnHitExplosion(
              hitX,
              hitY,
              hitZ,
              p.color,
              p.vx,
              p.vz,
              this.playerStats.comboMultiplier
            );

            // Subtle visceral micro-impact shake
            this.addTrauma(0.012);

            this.damageEnemy(enemy, p.damage, hitX, hitY, hitZ);
            hit = true;

            // Chain lightning upgrade
            if (this.playerStats.chainLightning && Math.random() < 0.4) {
              this.triggerChainLightning(enemy);
            }

            p.pierceRemaining--;
            if (p.pierceRemaining <= 0) {
              break;
            }
          }
        }

        if (hit && p.pierceRemaining <= 0) {
          this.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
          continue;
        }
      } else {
        // Enemy projectiles hitting player
        const dist = Math.hypot(this.playerX - p.x, this.playerZ - p.z);
        if (dist < 1.0 + p.radius) {
          const dx = p.x - this.playerX;
          const dz = p.z - this.playerZ;
          const norm = Math.hypot(dx, dz) || 1;
          const hitX = this.playerX + (dx / norm) * 0.8;
          const hitZ = this.playerZ + (dz / norm) * 0.8;

          // Spawn impact explosion on player hit
          this.particleManager.spawnHitExplosion(
            hitX,
            p.y,
            hitZ,
            0xf43f5e,
            p.vx,
            p.vz,
            1.0
          );

          this.damagePlayer(p.damage);
          this.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  private triggerChainLightning(source: EnemyEntity) {
    const nearby = this.enemies.filter(
      (e) => e !== source && Math.hypot(e.x - source.x, e.z - source.z) < 10
    );
    if (nearby.length > 0) {
      const target = nearby[0];
      this.damageEnemy(target, 22);
      this.particleManager.spawn(
        (source.x + target.x) / 2,
        0.8,
        (source.z + target.z) / 2,
        14,
        0x00f0ff,
        12,
        0.35,
        0.18
      );
    }
  }

  private updatePickups(dt: number, time: number) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.group);
        this.pickups.splice(i, 1);
        continue;
      }

      // Bobbing & rotating
      p.mesh.rotation.y = time * 3.0;
      p.mesh.position.y = 0.4 + Math.sin(time * 5 + p.id) * 0.1;

      // Magnet attraction towards player
      const dx = this.playerX - p.x;
      const dz = this.playerZ - p.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 6.0) {
        const pull = (1 - dist / 6.0) * 16 * dt;
        p.x += (dx / (dist || 1)) * pull;
        p.z += (dz / (dist || 1)) * pull;
        p.group.position.set(p.x, 0, p.z);
      }

      // Collect pickup
      if (dist < 1.4) {
        sound.playPickup();
        if (p.type === 'xp') {
          this.addPlayerXp(25);
          this.playerStats.score += 50;
        } else if (p.type === 'heal') {
          this.playerStats.hp = Math.min(this.playerStats.maxHp, this.playerStats.hp + 30);
        } else if (p.type === 'emp') {
          this.playerStats.empCharge = 100;
        }

        this.particleManager.spawn(
          p.x,
          0.5,
          p.z,
          15,
          p.type === 'heal' ? 0x10b981 : p.type === 'emp' ? 0xf59e0b : 0x00f0ff,
          8,
          0.4,
          0.25
        );

        this.scene.remove(p.group);
        this.pickups.splice(i, 1);
      }
    }
  }

  private updateCamera(dt: number) {
    // Decaying trauma shake: shake = trauma * trauma
    this.trauma = Math.max(0, this.trauma - dt * 1.5);
    const shake = this.trauma * this.trauma;
    const shakeX = (Math.random() * 2 - 1) * shake * 1.4;
    const shakeY = (Math.random() * 2 - 1) * shake * 1.4;
    const shakeZ = (Math.random() * 2 - 1) * shake * 1.4;

    // Smoothly track player position with lookahead
    const targetCamX = this.playerX + (this.aimTargetX - this.playerX) * 0.15 + shakeX;
    const targetCamZ = this.playerZ + this.cameraBaseZ + (this.aimTargetZ - this.playerZ) * 0.12 + shakeZ;
    const targetCamY = this.cameraBaseY + shakeY;

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 6, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamY, 6, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, targetCamZ, 6, dt);

    this.camera.lookAt(this.playerX + shakeX * 0.5, 0.5, this.playerZ + shakeZ * 0.5);
  }

  public dispose() {
    this.isRunning = false;
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('resize', this.handleResize);

    sound.stopMusic();
    this.renderer.dispose();
  }
}
