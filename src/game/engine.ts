import * as THREE from 'three';
import { ARENA_RADIUS, buildArena, getSectorTheme } from './arena';
import { sound } from './audio';
import {
  createColossusBoss,
  createGoliathPrimeBoss,
  createHyperionArchonBoss,
  createPickupMesh,
  createPlayerMech,
  createShieldDrone,
  createSiegeGoliath,
  createStalkerDrone,
  createVectorDrone,
  createShredderDrone,
  createMortarDestroyer,
  createPhaseStalker,
  materials,
} from './models';
import { HazardManager } from './hazards';
import { ObstacleManager, getMapForWave } from './obstacles';
import { ParticleManager } from './particles';
import { QuantumPortal } from './portal';
import { applySkinToMech, getSavedSkinId, getSkinById, MechSkin, saveSkinId } from './skins';
import { EnemyType, GameState, PlayerStats, RadarData, RadarEnemy, UpgradeOption } from './types';
import { createFreshUpgradePool, selectUpgradeChoices } from './upgrades';
import { DashTrailManager } from './dashTrail';

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
  subParts?: Record<string, any>;
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

export class GameEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private particleManager: ParticleManager;
  private arena: ReturnType<typeof buildArena>;

  // Upgrades Catalog
  public activeUpgradePool: UpgradeOption[] = createFreshUpgradePool();

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
  private cameraBaseFov: number = 50;

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

  // In-Arena Physical Obstacles, Cover Bunkers & Skyscrapers
  public obstacleManager: ObstacleManager;

  // Kinetic Glowing Neon Dash Trail & Holographic Afterimage System
  public dashTrailManager: DashTrailManager;

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

  // Wave Director & Boss Battle Engine
  public gameState: GameState = 'title';
  private waveTimer: number = 0;
  private waveEnemiesToSpawn: { type: EnemyType; delay: number }[] = [];
  public bossEntity: EnemyEntity | null = null;
  public bossHpRatio: number = 1;
  public activeBossType: EnemyType | null = null;
  private bossAttackTimer: number = 0;
  private bossSpiralAngle: number = 0;
  private bossShieldDrones: EnemyEntity[] = [];
  private bossLaserChargeMesh: THREE.Mesh | null = null;

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

    // Initialize In-Arena Obstacles & Buildings
    this.obstacleManager = new ObstacleManager(this.scene);
    this.obstacleManager.setMapTier(1, 0x00f0ff);

    // Initialize Glowing Neon Dash Trail & Afterimage System
    this.dashTrailManager = new DashTrailManager(this.scene);
    this.dashTrailManager.setTrailColor(this.currentSkin?.colors?.trail || 0x00f0ff);

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
      magnetRange: 4.5,
      // Sector Level, Quantum Portal & Mech Skin
      sectorLevel: 1,
      sectorName: 'Neon Core',
      portalActive: false,
      portalDistance: null,
      portalAngle: null,
      equippedSkinId: this.currentSkin.id,
      hazardCount: 0,
      hazardTelegraphing: false,
      bossActive: false,
      bossName: '',
      bossPhase: '',
      bossHpRatio: null,
      // Map Location & Obstacle Telemetry
      mapTier: 1,
      mapLocationName: 'NEON CITADEL FOUNDRY',
      mapHazardLevel: 'STANDARD',
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
      this.cameraBaseFov = 64;
    } else if (aspect < 1.2) {
      // Compact square / foldable / tablet
      this.cameraBaseY = 26;
      this.cameraBaseZ = 20;
      this.cameraBaseFov = 56;
    } else {
      // Standard landscape / desktop
      this.cameraBaseY = 22;
      this.cameraBaseZ = 18;
      this.cameraBaseFov = 50;
    }
    this.camera.fov = this.cameraBaseFov;

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
    this.dashTrailManager.setTrailColor(this.currentSkin?.colors?.trail || 0x00f0ff);
    this.onStatsUpdate({ ...this.playerStats });
  }

  public resetStats() {
    this.activeUpgradePool = createFreshUpgradePool();
    this.dashTrailManager.clear();
    this.dashTrailManager.setTrailColor(this.currentSkin?.colors?.trail || 0x00f0ff);

    this.playerStats.maxHp = 100;
    this.playerStats.hp = 100;
    this.playerStats.maxShield = 60;
    this.playerStats.shield = 60;
    this.playerStats.shieldRegenRate = 15;
    this.playerStats.shieldDelayTimer = 0;
    this.playerStats.moveSpeed = 14;
    this.playerStats.dashCharges = 2;
    this.playerStats.maxDashCharges = 2;
    this.playerStats.dashCooldown = 2.8;
    this.playerStats.dashTimer = 0;
    this.playerStats.isDashing = false;
    this.playerStats.dashTimeRemaining = 0;
    this.playerStats.empCharge = 100;
    this.playerStats.score = 0;
    this.playerStats.combo = 0;
    this.playerStats.comboTimer = 0;
    this.playerStats.comboMultiplier = 1.0;
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

    // Upgrades
    this.playerStats.bulletSpread = 1;
    this.playerStats.fireRate = 6.5;
    this.playerStats.bulletDamage = 32;
    this.playerStats.pierceCount = 1;
    this.playerStats.chainLightning = false;
    this.playerStats.orbitalDrones = 0;
    this.playerStats.siphonChance = 0;
    this.playerStats.magnetRange = 4.5;

    // Boss state
    this.playerStats.bossActive = false;
    this.playerStats.bossName = '';
    this.playerStats.bossPhase = '';
    this.playerStats.bossHpRatio = null;
    this.bossEntity = null;
    this.activeBossType = null;
    this.bossShieldDrones = [];

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
    this.playerStats.mapTier = 1;
    this.playerStats.mapLocationName = 'NEON CITADEL FOUNDRY';
    this.playerStats.mapHazardLevel = 'STANDARD';
    this.obstacleManager.setMapTier(1, 0x00f0ff);
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
    this.bossShieldDrones = [];
  }

  public updateMapLocation(waveNumber: number) {
    const isLevel10Cleared = waveNumber > 10;
    // Boundary is active only during waves 1-10; after level 10 is cleared, boundary is removed!
    this.arena.setBoundaryActive(!isLevel10Cleared);

    const mapDef = getMapForWave(waveNumber);
    const tierChanged = this.playerStats.mapTier !== mapDef.tier;

    if (tierChanged || (!isLevel10Cleared && this.obstacleManager.obstacles.length > 0)) {
      this.playerStats.mapTier = mapDef.tier;
      this.playerStats.mapLocationName = mapDef.name;
      this.playerStats.mapHazardLevel = mapDef.hazardLevel;

      if (!isLevel10Cleared) {
        // Enclosed arena: strictly NO buildings or obstacles appear before Level 10 is cleared!
        this.obstacleManager.clear();
      } else {
        // Level 10 cleared: Deploy buildings & obstacles for open metropolis!
        this.obstacleManager.setMapTier(mapDef.tier, mapDef.accentColor);
      }

      this.arena.setSector(mapDef.tier);

      if (waveNumber === 11) {
        // High-impact sensory event for breaching perimeter barriers
        sound.playBossIntroSiren();
        triggerHaptic(120);
        this.addTrauma(0.85);
      } else if (tierChanged) {
        sound.playPortalWarp();
        this.addTrauma(0.45);
      }
    }
  }

  // --- Wave Director ---
  public startWave(waveNumber: number) {
    this.updateMapLocation(waveNumber);
    this.playerStats.wave = waveNumber;
    this.waveTimer = 0;
    this.waveEnemiesToSpawn = [];
    this.bossShieldDrones = [];

    const isLevel10Cleared = waveNumber > 10;

    // Boss waves spawn after every 6 levels (Wave 6, 12, 18, 24...)
    const isBossWave = waveNumber % 6 === 0;

    if (isBossWave) {
      sound.playBossIntroSiren();
      this.addTrauma(0.7);
      triggerHaptic(90);

      // Rotate through distinct apex boss classes
      const bossCycle = Math.floor(waveNumber / 6) % 3;
      let bossType: EnemyType = 'boss_goliath_prime';
      let bName = 'GOLIATH PRIME';
      let bPhase = 'PHASE 1: SIEGE ARTILLERY';

      if (bossCycle === 1) {
        bossType = 'boss_goliath_prime';
        bName = 'GOLIATH PRIME // SIEGE DREADNOUGHT';
        bPhase = 'PHASE 1: MORTAR BARRAGE';
      } else if (bossCycle === 2) {
        bossType = 'boss_nexus_colossus';
        bName = 'NEXUS OMNI-COLOSSUS // VECTOR DESTROYER';
        bPhase = 'PHASE 1: HELIX BULLET HELL';
      } else {
        bossType = 'boss_hyperion_archon';
        bName = 'HYPERION ARCHON // VOID OVERLORD';
        bPhase = 'PHASE 1: ORBITAL SWEEP';
      }

      this.activeBossType = bossType;
      this.playerStats.bossActive = true;
      this.playerStats.bossName = bName;
      this.playerStats.bossPhase = bPhase;
      this.playerStats.bossHpRatio = 1.0;
      this.onStatsUpdate({ ...this.playerStats });

      // Spawn boss as main encounter
      this.waveEnemiesToSpawn.push({ type: bossType, delay: 0.8 });

      // Escort support with increased difficulty in open arena
      const escortCount = Math.min(2 + Math.floor(waveNumber / 6) + (isLevel10Cleared ? 2 : 0), 8);
      for (let i = 0; i < escortCount; i++) {
        let eType: EnemyType = i % 2 === 0 ? 'stalker' : 'sniper';
        if (waveNumber >= 20 && i % 3 === 0) {
          eType = 'phase_stalker';
        } else if (waveNumber >= 10 && i % 2 === 1) {
          eType = 'shredder';
        }
        this.waveEnemiesToSpawn.push({
          type: eType,
          delay: 3.0 + i * (isLevel10Cleared ? 1.6 : 2.2),
        });
      }
    } else {
      this.playerStats.bossActive = false;
      this.playerStats.bossName = '';
      this.playerStats.bossPhase = '';
      this.playerStats.bossHpRatio = null;
      this.activeBossType = null;
      this.onStatsUpdate({ ...this.playerStats });

      // Procedural regular wave compositions with major difficulty increase after Level 10
      const stalkerCount = isLevel10Cleared
        ? Math.floor((6 + waveNumber * 2.8) * 1.35)
        : Math.max(4, 6 + waveNumber * 2);
      const goliathCount = waveNumber >= 2
        ? Math.floor(waveNumber * (isLevel10Cleared ? 1.35 : 0.9))
        : 0;
      const sniperCount = waveNumber >= 3
        ? Math.floor(waveNumber * (isLevel10Cleared ? 1.15 : 0.7))
        : 0;

      // Ruthless Berserker Shredder Drones introduced at Wave 11+ (Level 10 cleared)
      const shredderCount = isLevel10Cleared
        ? Math.max(3, Math.floor((waveNumber - 8) * 1.4))
        : 0;
      // Heavy Mortar Destroyers introduced at Wave 11+ (Level 10 cleared)
      const mortarCount = isLevel10Cleared
        ? Math.max(2, Math.floor((waveNumber - 8) * 0.85))
        : 0;
      // Void Phase Stalkers introduced at Wave 20+
      const phaseStalkerCount = waveNumber >= 20
        ? Math.max(3, Math.floor((waveNumber - 16) * 1.1))
        : 0;

      const spawnInterval = isLevel10Cleared ? 0.38 : 0.6;

      for (let i = 0; i < stalkerCount; i++) {
        this.waveEnemiesToSpawn.push({ type: 'stalker', delay: 0.4 + i * spawnInterval });
      }
      for (let i = 0; i < goliathCount; i++) {
        this.waveEnemiesToSpawn.push({ type: 'goliath', delay: 1.2 + i * (spawnInterval * 2.5) });
      }
      for (let i = 0; i < sniperCount; i++) {
        this.waveEnemiesToSpawn.push({ type: 'sniper', delay: 2.0 + i * (spawnInterval * 2.2) });
      }
      for (let i = 0; i < shredderCount; i++) {
        this.waveEnemiesToSpawn.push({ type: 'shredder', delay: 0.8 + i * (spawnInterval * 1.5) });
      }
      for (let i = 0; i < mortarCount; i++) {
        this.waveEnemiesToSpawn.push({ type: 'mortar_destroyer', delay: 2.2 + i * (spawnInterval * 3.0) });
      }
      for (let i = 0; i < phaseStalkerCount; i++) {
        this.waveEnemiesToSpawn.push({ type: 'phase_stalker', delay: 1.6 + i * (spawnInterval * 2.0) });
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
    const isLevel10Cleared = this.playerStats.wave > 10;
    const angle = Math.random() * Math.PI * 2;
    let x: number, z: number;

    if (!isLevel10Cleared) {
      // Level 1-10 Enclosed arena: spawn along the perimeter barrier
      const dist = ARENA_RADIUS - 3;
      x = Math.cos(angle) * dist;
      z = Math.sin(angle) * dist;
    } else {
      // Level 10 Cleared: Free-roam unbounded metropolis, enemies spawn in tactical arcs around player
      const dist = 24 + Math.random() * 14;
      x = this.playerX + Math.cos(angle) * dist;
      z = this.playerZ + Math.sin(angle) * dist;
    }

    // Difficulty multiplier after Level 10 is cleared
    const hpMult = isLevel10Cleared ? 1.35 : 1.0;
    const speedMult = isLevel10Cleared ? 1.22 : 1.0;

    let entity: EnemyEntity;

    if (type === 'stalker') {
      const { group, meshes, eye } = createStalkerDrone();
      group.position.set(x, 0, z);
      this.scene.add(group);
      const stalkerHp = Math.round((45 + this.playerStats.wave * 10) * hpMult);
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
        maxHp: stalkerHp,
        hp: stalkerHp,
        speed: (9.5 + Math.min(this.playerStats.wave * 0.4, 4)) * speedMult,
        radius: 0.8,
        state: 'chase',
        timer: 0,
        windupDuration: isLevel10Cleared ? 0.55 : 0.7,
        telegraphProgress: 0,
        hitFlashTimer: 0,
        subParts: { eye },
      };
    } else if (type === 'goliath') {
      const { group, meshes, barrels } = createSiegeGoliath();
      group.position.set(x, 0, z);
      this.scene.add(group);
      const goliathHp = Math.round((200 + this.playerStats.wave * 35) * hpMult);
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
        maxHp: goliathHp,
        hp: goliathHp,
        speed: 4.5 * speedMult,
        radius: 1.5,
        state: 'chase',
        timer: 0,
        windupDuration: isLevel10Cleared ? 0.95 : 1.2,
        telegraphProgress: 0,
        hitFlashTimer: 0,
        subParts: { barrels },
      };
    } else if (type === 'sniper') {
      const { group, meshes, chargeRing } = createVectorDrone();
      group.position.set(x, 0, z);
      this.scene.add(group);
      const sniperHp = Math.round((90 + this.playerStats.wave * 20) * hpMult);
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
        maxHp: sniperHp,
        hp: sniperHp,
        speed: 6.0 * speedMult,
        radius: 1.0,
        state: 'chase',
        timer: 0,
        windupDuration: isLevel10Cleared ? 1.05 : 1.3,
        telegraphProgress: 0,
        hitFlashTimer: 0,
        subParts: { chargeRing },
      };
    } else if (type === 'shredder') {
      // Level 10+ Ruthless Berserker Shredder Drone
      const { group, meshes, bladeL, bladeR, eye } = createShredderDrone();
      group.position.set(x, 0, z);
      this.scene.add(group);
      const shredderHp = Math.round((75 + this.playerStats.wave * 16) * hpMult);
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
        maxHp: shredderHp,
        hp: shredderHp,
        speed: (12.0 + Math.min(this.playerStats.wave * 0.25, 4.0)) * speedMult,
        radius: 0.9,
        state: 'chase',
        timer: 0,
        windupDuration: 0.4,
        telegraphProgress: 0,
        hitFlashTimer: 0,
        subParts: { bladeL, bladeR, eye },
      };
    } else if (type === 'mortar_destroyer') {
      // Level 10+ Ruthless Heavy Mortar Destroyer
      const { group, meshes, mortarBarrel, heatsink } = createMortarDestroyer();
      group.position.set(x, 0, z);
      this.scene.add(group);
      const mortarHp = Math.round((260 + this.playerStats.wave * 40) * hpMult);
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
        maxHp: mortarHp,
        hp: mortarHp,
        speed: 4.2 * speedMult,
        radius: 1.6,
        state: 'chase',
        timer: 0,
        windupDuration: 1.25,
        telegraphProgress: 0,
        hitFlashTimer: 0,
        subParts: { mortarBarrel, heatsink },
      };
    } else if (type === 'phase_stalker') {
      // Level 20+ Ruthless Void Phase Stalker
      const { group, meshes, core, halo } = createPhaseStalker();
      group.position.set(x, 0, z);
      this.scene.add(group);
      const phaseHp = Math.round((150 + this.playerStats.wave * 26) * hpMult);
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
        maxHp: phaseHp,
        hp: phaseHp,
        speed: 9.8 * speedMult,
        radius: 1.1,
        state: 'chase',
        timer: 0,
        windupDuration: 0.65,
        telegraphProgress: 0,
        hitFlashTimer: 0,
        subParts: { core, halo },
      };
    } else if (type === 'boss_goliath_prime') {
      // Wave 6 Boss: Goliath Prime - Heavy Siege Dreadnought
      const bossX = isLevel10Cleared ? this.playerX : 0;
      const bossZ = isLevel10Cleared ? this.playerZ - 26 : -ARENA_RADIUS + 6;
      const { group, meshes, core, mortarL, mortarR } = createGoliathPrimeBoss();
      group.position.set(bossX, 0, bossZ);
      this.scene.add(group);
      const bossHp = Math.round((2600 + this.playerStats.wave * 420) * (isLevel10Cleared ? 1.3 : 1.0));
      entity = {
        id,
        type,
        group,
        meshes,
        x: bossX,
        y: 0,
        z: bossZ,
        vx: 0,
        vz: 0,
        rotation: 0,
        targetRotation: 0,
        maxHp: bossHp,
        hp: bossHp,
        speed: 3.4 * speedMult,
        radius: 3.2,
        state: 'chase',
        timer: 0,
        windupDuration: 1.5,
        telegraphProgress: 0,
        hitFlashTimer: 0,
        subParts: { core, mortarL, mortarR },
      };
      this.bossEntity = entity;
    } else if (type === 'boss_nexus_colossus' || type === 'colossus') {
      // Wave 12 Boss: Nexus Omni-Colossus
      const bossX = isLevel10Cleared ? this.playerX : 0;
      const bossZ = isLevel10Cleared ? this.playerZ - 26 : -ARENA_RADIUS + 6;
      const { group, meshes, core, shieldMesh } = createColossusBoss();
      group.position.set(bossX, 0, bossZ);
      this.scene.add(group);
      const bossHp = Math.round((4200 + this.playerStats.wave * 520) * (isLevel10Cleared ? 1.3 : 1.0));
      entity = {
        id,
        type: 'boss_nexus_colossus',
        group,
        meshes,
        x: bossX,
        y: 0,
        z: bossZ,
        vx: 0,
        vz: 0,
        rotation: 0,
        targetRotation: 0,
        maxHp: bossHp,
        hp: bossHp,
        speed: 3.0 * speedMult,
        radius: 3.6,
        state: 'chase',
        timer: 0,
        windupDuration: 1.5,
        telegraphProgress: 0,
        hitFlashTimer: 0,
        subParts: { core, shieldMesh },
      };
      this.bossEntity = entity;
    } else if (type === 'boss_hyperion_archon') {
      // Wave 18+ Boss: Hyperion Archon - Void Overlord
      const bossX = isLevel10Cleared ? this.playerX : 0;
      const bossZ = isLevel10Cleared ? this.playerZ - 26 : -ARENA_RADIUS + 6;
      const { group, meshes, core, haloRing } = createHyperionArchonBoss();
      group.position.set(bossX, 0, bossZ);
      this.scene.add(group);
      const bossHp = Math.round((6000 + this.playerStats.wave * 650) * (isLevel10Cleared ? 1.3 : 1.0));
      entity = {
        id,
        type,
        group,
        meshes,
        x: bossX,
        y: 0,
        z: bossZ,
        vx: 0,
        vz: 0,
        rotation: 0,
        targetRotation: 0,
        maxHp: bossHp,
        hp: bossHp,
        speed: 3.8 * speedMult,
        radius: 3.8,
        state: 'chase',
        timer: 0,
        windupDuration: 1.5,
        telegraphProgress: 0,
        hitFlashTimer: 0,
        subParts: { core, haloRing },
      };
      this.bossEntity = entity;
    } else if (type === 'boss_shield_drone') {
      // Shield Escort Drone deployed by bosses
      const { group, meshes, dome } = createShieldDrone();
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
        maxHp: 220 + this.playerStats.wave * 25,
        hp: 220 + this.playerStats.wave * 25,
        speed: 7.0,
        radius: 0.9,
        state: 'chase',
        timer: 0,
        windupDuration: 1.0,
        telegraphProgress: 0,
        hitFlashTimer: 0,
        subParts: { dome },
      };
      this.bossShieldDrones.push(entity);
    } else {
      // General Fallback Drone
      const { group, meshes, eye } = createStalkerDrone();
      group.position.set(x, 0, z);
      this.scene.add(group);
      entity = {
        id,
        type: 'stalker',
        group,
        meshes,
        x,
        y: 0,
        z,
        vx: 0,
        vz: 0,
        rotation: 0,
        targetRotation: 0,
        maxHp: 60,
        hp: 60,
        speed: 9.0,
        radius: 0.8,
        state: 'chase',
        timer: 0,
        windupDuration: 0.7,
        telegraphProgress: 0,
        hitFlashTimer: 0,
        subParts: { eye },
      };
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
    const isLevel10Cleared = this.playerStats.wave > 10;
    const finalDamage = isLevel10Cleared ? Math.round(damage * 1.25) : damage;
    const finalSpeed = isLevel10Cleared ? speed * 1.2 : speed;

    const dx = targetX - x;
    const dz = targetZ - z;
    const dist = Math.hypot(dx, dz) || 1;
    const vx = (dx / dist) * finalSpeed;
    const vz = (dz / dist) * finalSpeed;

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
      damage: finalDamage,
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

    const trailColor = this.currentSkin?.colors?.trail || 0x00f0ff;
    const hoverY = this.playerModel.group.position.y || 0.6;

    // Instant supersonic mach ring, chrono-ghost afterimage, and thruster neon light flare
    this.dashTrailManager.triggerBurst(
      this.playerX,
      hoverY,
      this.playerZ,
      this.playerRot,
      this.playerModel.group.rotation.x,
      this.playerModel.group.rotation.z,
      this.playerVx,
      this.playerVz
    );

    // Radial 360-degree kinetic particle burst
    this.particleManager.spawnDashBurst(
      this.playerX,
      hoverY,
      this.playerZ,
      this.playerVx,
      this.playerVz,
      trailColor
    );

    // High-contrast glowing neon trail ejecta
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
    this.addTrauma(0.24);
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
    let finalDamage = damage;
    if (enemy === this.bossEntity && this.bossShieldDrones.length > 0) {
      finalDamage *= 0.25; // 75% damage reduction from shield drone escort
      this.particleManager.spawn(
        hitX ?? enemy.x,
        hitY ?? 1.5,
        hitZ ?? enemy.z,
        6,
        0x00f0ff,
        8,
        0.3,
        0.2
      );
    }
    enemy.hp -= finalDamage;
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
    const isBoss =
      enemy === this.bossEntity ||
      (enemy.type.startsWith('boss_') && enemy.type !== 'boss_shield_drone');

    sound.playExplosion(isBoss || enemy.type === 'colossus');
    this.addTrauma(isBoss ? 0.85 : enemy.type === 'goliath' ? 0.4 : 0.25);
    this.triggerHitstop(isBoss ? 0.12 : 0.035);

    if (isBoss) {
      // Massive multi-stage chain explosions for Apex Boss
      this.particleManager.spawn(enemy.x, 1.2, enemy.z, 120, 0xf43f5e, 24, 0.9, 0.6);
      this.particleManager.spawn(enemy.x + 1.2, 1.6, enemy.z - 1.0, 80, 0xff9900, 20, 0.8, 0.5);
      this.particleManager.spawn(enemy.x - 1.2, 1.2, enemy.z + 1.0, 80, 0x00f0ff, 20, 0.8, 0.5);

      // Score & Combo
      this.playerStats.kills++;
      this.playerStats.combo += 5;
      this.playerStats.comboTimer = 5.0;
      this.playerStats.score += 15000 * Math.floor(this.playerStats.wave / 6);
      this.playerStats.empCharge = 100;

      // Drop massive XP hoard
      for (let k = 0; k < 6; k++) {
        const offX = (Math.random() - 0.5) * 3.5;
        const offZ = (Math.random() - 0.5) * 3.5;
        this.spawnPickup('xp', enemy.x + offX, enemy.z + offZ);
      }
      this.spawnPickup('heal', enemy.x + 1.5, enemy.z);
      this.spawnPickup('emp', enemy.x - 1.5, enemy.z);

      // Defeating boss unlocks the Quantum Warp Portal immediately!
      this.spawnQuantumPortal();

      this.bossEntity = null;
      this.playerStats.bossActive = false;
      this.playerStats.bossHpRatio = null;
      this.playerStats.bossName = '';
      this.playerStats.bossPhase = '';
      this.onStatsUpdate({ ...this.playerStats });
    } else {
      const isLarge = enemy.type === 'goliath' || enemy.type === 'colossus';
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
      const basePoints =
        enemy.type === 'mortar_destroyer'
          ? 450
          : enemy.type === 'goliath'
          ? 400
          : enemy.type === 'phase_stalker'
          ? 350
          : enemy.type === 'shredder'
          ? 250
          : enemy.type === 'sniper'
          ? 200
          : 150;
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
      if (Math.random() < 0.18) {
        this.spawnPickup(Math.random() < 0.5 ? 'heal' : 'emp', enemy.x + 0.5, enemy.z);
      }
    }

    // Shield drone handling
    if (enemy.type === 'boss_shield_drone') {
      const dIdx = this.bossShieldDrones.indexOf(enemy);
      if (dIdx !== -1) this.bossShieldDrones.splice(dIdx, 1);
      // Feedback damage on boss
      if (this.bossEntity) {
        this.damageEnemy(this.bossEntity, 300);
      }
    }

    // Cleanup enemy
    this.scene.remove(enemy.group);
    if (enemy.telegraphMesh) this.scene.remove(enemy.telegraphMesh);
    const idx = this.enemies.indexOf(enemy);
    if (idx !== -1) this.enemies.splice(idx, 1);
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
    // Guaranteed 3 distinct upgrades, never empty
    const choices = selectUpgradeChoices(this.activeUpgradePool, 3);
    this.onUpgradePrompt(choices);
  }

  public applyUpgrade(upgradeId: string) {
    const upgrade = this.activeUpgradePool.find((u) => u.id === upgradeId);
    if (upgrade) {
      upgrade.level++;
    }

    if (upgradeId === 'plasma_split') {
      this.playerStats.bulletSpread = Math.min(4, this.playerStats.bulletSpread + 1);
    } else if (upgradeId === 'rapid_accelerator') {
      this.playerStats.fireRate *= 1.25;
    } else if (upgradeId === 'overclock_thruster') {
      this.playerStats.moveSpeed *= 1.20;
      this.playerStats.dashCooldown *= 0.8;
    } else if (upgradeId === 'plasma_pierce') {
      this.playerStats.pierceCount++;
    } else if (upgradeId === 'chain_lightning') {
      this.playerStats.chainLightning = true;
    } else if (upgradeId === 'siphon_nanite') {
      this.playerStats.siphonChance += 0.18;
    } else if (upgradeId === 'orbital_drone') {
      this.playerStats.orbitalDrones++;
      this.updateEscortDrones();
    } else if (upgradeId === 'emp_supercharge') {
      this.playerStats.bulletDamage += 14;
    } else if (upgradeId === 'shield_capacitor') {
      this.playerStats.maxShield += 25;
      this.playerStats.shield = this.playerStats.maxShield;
      this.playerStats.shieldRegenRate += 8;
    } else if (upgradeId === 'hull_reinforce') {
      this.playerStats.maxHp += 35;
      this.playerStats.hp = Math.min(this.playerStats.maxHp, this.playerStats.hp + 40);
    } else if (upgradeId === 'dash_overdrive') {
      this.playerStats.maxDashCharges++;
      this.playerStats.dashCharges++;
    } else if (upgradeId === 'magnet_nanites') {
      this.playerStats.magnetRange += 5.0;
    } else if (upgradeId.startsWith('overclock_damage')) {
      this.playerStats.bulletDamage = Math.round(this.playerStats.bulletDamage * 1.15);
      this.playerStats.score += 5000;
    } else if (upgradeId.startsWith('overclock_hull')) {
      this.playerStats.maxHp += 25;
      this.playerStats.hp = this.playerStats.maxHp;
      this.playerStats.shield = this.playerStats.maxShield;
    } else if (upgradeId.startsWith('overclock_shield')) {
      this.playerStats.maxShield += 20;
      this.playerStats.shield = this.playerStats.maxShield;
    } else if (upgradeId.startsWith('overclock_speed')) {
      this.playerStats.moveSpeed *= 1.10;
    } else if (upgradeId.startsWith('overclock_emp')) {
      this.playerStats.score += 6000;
      this.playerStats.empCharge = 100;
    }

    this.onStatsUpdate({ ...this.playerStats });
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
      // Responsive dynamic acceleration / braking
      const targetVx = moveInputX * this.playerStats.moveSpeed;
      const targetVz = moveInputZ * this.playerStats.moveSpeed;

      // Snappy direction changes: higher acceleration rate when turning or reversing to eliminate sluggish feel
      const isReversingX = moveInputX !== 0 && Math.sign(moveInputX) !== Math.sign(this.playerVx);
      const isReversingZ = moveInputZ !== 0 && Math.sign(moveInputZ) !== Math.sign(this.playerVz);
      const accelRate = isReversingX || isReversingZ ? 26 : inputLen > 0.05 ? 18 : 15;

      this.playerVx = THREE.MathUtils.damp(this.playerVx, targetVx, accelRate, dt);
      this.playerVz = THREE.MathUtils.damp(this.playerVz, targetVz, accelRate, dt);
    }

    this.playerX += this.playerVx * dt;
    this.playerZ += this.playerVz * dt;

    // Arena boundary containment: 30m perimeter during waves 1-10; unbounded exploration up to 165m when Level 10 cleared
    const isLevel10Cleared = this.playerStats.wave > 10;
    const distFromCenter = Math.hypot(this.playerX, this.playerZ);
    const maxBound = isLevel10Cleared ? 165.0 : ARENA_RADIUS - 1.2;
    if (distFromCenter > maxBound) {
      this.playerX = (this.playerX / distFromCenter) * maxBound;
      this.playerZ = (this.playerZ / distFromCenter) * maxBound;
    }

    // In-Arena Building & Obstacle Collision Resolution (Smooth sliding)
    const colResult = this.obstacleManager.resolveEntityCollision(this.playerX, this.playerZ, 1.0);
    this.playerX = colResult.x;
    this.playerZ = colResult.z;

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

    // Transform world velocity into local mech frame for realistic physical banking and pitch
    const sinR = Math.sin(this.playerRot);
    const cosR = Math.cos(this.playerRot);
    // Relative strafe velocity (local X: positive = strafing right, negative = strafing left)
    const localStrafeV = this.playerVx * cosR - this.playerVz * sinR;
    // Relative forward velocity (local -Z is forward: positive = moving forward, negative = reversing)
    const localForwardV = -(this.playerVx * sinR + this.playerVz * cosR);

    // Dynamic hover elevation with speed suspension
    const speedRatio = Math.min(
      1.0,
      Math.hypot(this.playerVx, this.playerVz) / (this.playerStats.moveSpeed || 14)
    );
    const hoverY = 0.55 + Math.sin(time * 7) * 0.05 + speedRatio * 0.06;
    this.playerModel.group.position.set(this.playerX, hoverY, this.playerZ);
    this.playerModel.group.rotation.y = this.playerRot;

    // Roll banking: lean into lateral strafes
    const bankTarget = -localStrafeV * 0.046;
    this.playerModel.group.rotation.z = THREE.MathUtils.damp(
      this.playerModel.group.rotation.z,
      bankTarget,
      12,
      dt
    );

    // Combat pitch: aggressive forward hover stance on acceleration, lean back on brake
    const pitchTarget = localForwardV * 0.038;
    this.playerModel.group.rotation.x = THREE.MathUtils.damp(
      this.playerModel.group.rotation.x,
      pitchTarget,
      12,
      dt
    );

    // Thruster flame dynamics
    const thrustScale =
      this.playerStats.isDashing ? 3.2 : inputLen > 0.1 ? 1.4 + Math.sin(time * 25) * 0.2 : 0.8;
    this.playerModel.thrusterL.scale.set(1, thrustScale, 1);
    this.playerModel.thrusterR.scale.set(1, thrustScale, 1);

    // Continuous High-Contrast Neon-Blue Particle Trail & Volumetric Dash Streamers
    this.playerModel.thrusterL.getWorldPosition(_v1);
    this.playerModel.thrusterR.getWorldPosition(_v2);

    // Update Glowing Neon Dash Trail & Holographic Afterimage System
    this.dashTrailManager.update(
      dt,
      this.playerStats.isDashing,
      this.playerX,
      hoverY,
      this.playerZ,
      this.playerRot,
      this.playerModel.group.rotation.x,
      this.playerModel.group.rotation.z,
      _v1.x,
      _v1.y,
      _v1.z,
      _v2.x,
      _v2.y,
      _v2.z,
      this.playerVx,
      this.playerVz
    );

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

    // Build tactical radar telemetry for circular mini-map overlay
    const radarEnemies: RadarEnemy[] = this.enemies.map((e) => {
      const dx = e.x - this.playerX;
      const dz = e.z - this.playerZ;
      const dist = Math.hypot(dx, dz);
      return {
        id: e.id,
        type: e.type,
        x: e.x,
        z: e.z,
        relX: dx,
        relZ: dz,
        dist,
        angle: Math.atan2(dx, -dz),
        isTelegraphing: e.telegraphProgress > 0 || (e.windupDuration > 0 && e.state === 'windup'),
        isBoss: e.type.startsWith('boss_') || e.type === 'colossus',
      };
    });

    this.playerStats.radar = {
      playerX: this.playerX,
      playerZ: this.playerZ,
      playerRot: this.playerRot,
      arenaRadius: this.playerStats.wave <= 10 ? ARENA_RADIUS : 0,
      enemies: radarEnemies,
      obstacles: this.obstacleManager.getRadarObstacles(),
      portal: this.quantumPortal.isActive
        ? {
            active: true,
            x: this.quantumPortal.x,
            z: this.quantumPortal.z,
            dist: this.quantumPortal.getDistance(this.playerX, this.playerZ),
            angle: this.quantumPortal.getAngle(this.playerX, this.playerZ),
          }
        : null,
    };

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
            if (enemy.type === 'stalker' || enemy.type === 'shredder') m.material = materials.stalkerArmor;
            else if (enemy.type === 'goliath' || enemy.type === 'mortar_destroyer') m.material = materials.goliathArmor;
            else if (enemy.type === 'sniper' || enemy.type === 'phase_stalker') m.material = materials.sniperArmor;
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
      } else if (enemy.type === 'shredder') {
        // --- LEVEL 10+ RUTHLESS ENEMY: BERSERKER SHREDDER DRONE ---
        // Rapid zigzag evasion & scythe spinning
        if (enemy.subParts?.bladeL && enemy.subParts?.bladeR) {
          (enemy.subParts.bladeL as THREE.Mesh).rotation.y = Math.sin(time * 28) * 0.5;
          (enemy.subParts.bladeR as THREE.Mesh).rotation.y = -Math.sin(time * 28) * 0.5;
        }

        if (enemy.state === 'chase') {
          // Dynamic oscillatory weave trajectory
          const weaveFreq = 7.0;
          const weaveAmp = 3.2;
          const perpX = -dz / (dist || 1);
          const perpZ = dx / (dist || 1);
          const lateral = Math.sin(time * weaveFreq + enemy.id) * weaveAmp;

          enemy.vx = ((dx / (dist || 1)) + perpX * (lateral / (dist || 1))) * enemy.speed;
          enemy.vz = ((dz / (dist || 1)) + perpZ * (lateral / (dist || 1))) * enemy.speed;
          enemy.rotation = Math.atan2(-enemy.vx, -enemy.vz);

          if (dist < 8.5) {
            enemy.state = 'windup';
            enemy.timer = 0;
            sound.playTelegraphAlert();
          }
        } else if (enemy.state === 'windup') {
          enemy.timer += dt;
          enemy.telegraphProgress = enemy.timer / enemy.windupDuration;
          enemy.vx *= 0.8;
          enemy.vz *= 0.8;
          enemy.rotation = Math.atan2(-dx, -dz);

          if (enemy.subParts?.eye) {
            (enemy.subParts.eye as THREE.Mesh).scale.setScalar(1 + enemy.telegraphProgress * 1.6);
          }

          if (enemy.timer >= enemy.windupDuration) {
            enemy.state = 'attack';
            enemy.timer = 0;
            sound.playShredderLunge();
            // Blistering high speed lunge straight toward player
            const lungeSpeed = 30.0;
            enemy.vx = (dx / (dist || 1)) * lungeSpeed;
            enemy.vz = (dz / (dist || 1)) * lungeSpeed;
            this.particleManager.spawn(enemy.x, 0.55, enemy.z, 22, 0xff3b00, 14, 0.45, 0.25);
          }
        } else if (enemy.state === 'attack') {
          enemy.timer += dt;
          if (dist < enemy.radius + 1.1) {
            this.damagePlayer(28);
            enemy.state = 'cooldown';
            enemy.timer = 0;
          }
          if (enemy.timer >= 0.38) {
            enemy.state = 'cooldown';
            enemy.timer = 0;
          }
        } else if (enemy.state === 'cooldown') {
          enemy.timer += dt;
          enemy.vx *= 0.86;
          enemy.vz *= 0.86;
          if (enemy.subParts?.eye) {
            (enemy.subParts.eye as THREE.Mesh).scale.set(1, 1, 1);
          }
          if (enemy.timer >= 0.9) {
            enemy.state = 'chase';
          }
        }
      } else if (enemy.type === 'mortar_destroyer') {
        // --- LEVEL 10+ RUTHLESS ENEMY: HEAVY MORTAR DESTROYER ---
        enemy.rotation = Math.atan2(-dx, -dz);

        if (enemy.state === 'chase') {
          if (dist > 18) {
            enemy.vx = (dx / (dist || 1)) * enemy.speed;
            enemy.vz = (dz / (dist || 1)) * enemy.speed;
          } else if (dist < 9) {
            // Tactical reverse away if player gets in point-blank range
            enemy.vx = -(dx / (dist || 1)) * (enemy.speed * 0.7);
            enemy.vz = -(dz / (dist || 1)) * (enemy.speed * 0.7);
          } else {
            enemy.vx *= 0.84;
            enemy.vz *= 0.84;
            enemy.state = 'windup';
            enemy.timer = 0;
          }
        } else if (enemy.state === 'windup') {
          enemy.timer += dt;
          enemy.telegraphProgress = enemy.timer / enemy.windupDuration;
          enemy.vx *= 0.8;
          enemy.vz *= 0.8;

          // Thermal heatsink glow and elevation
          if (enemy.subParts?.heatsink) {
            const hMesh = enemy.subParts.heatsink as THREE.Mesh;
            (hMesh.material as THREE.MeshBasicMaterial).color.setHex(
              enemy.telegraphProgress > 0.65 ? 0xffffff : 0xff4400
            );
          }

          if (enemy.timer >= enemy.windupDuration) {
            enemy.state = 'cooldown';
            enemy.timer = 0;
            sound.playMortarLaunch();

            // Lobbed mortar artillery targeting player's predicted coordinates
            const leadX = this.playerX + this.playerVx * 0.65 + (Math.random() - 0.5) * 2;
            const leadZ = this.playerZ + this.playerVz * 0.65 + (Math.random() - 0.5) * 2;

            // Telegraph ground blast hazard zone
            this.particleManager.spawn(leadX, 0.1, leadZ, 32, 0xf97316, 8, 0.85, 0.5);

            // Delayed high-yield detonation
            window.setTimeout(() => {
              if (this.gameState === 'playing') {
                sound.playExplosion(true);
                this.addTrauma(0.45);
                this.particleManager.spawn(leadX, 0.7, leadZ, 70, 0xff5500, 18, 0.9, 0.6);
                const pDist = Math.hypot(this.playerX - leadX, this.playerZ - leadZ);
                if (pDist < 4.2 && !this.playerStats.isDashing) {
                  this.damagePlayer(36);
                }
              }
            }, 850);
          }
        } else if (enemy.state === 'cooldown') {
          enemy.timer += dt;
          if (enemy.timer >= 2.4) {
            enemy.state = 'chase';
          }
        }
      } else if (enemy.type === 'phase_stalker') {
        // --- LEVEL 20+ RUTHLESS ENEMY: VOID PHASE STALKER ---
        enemy.rotation = Math.atan2(-dx, -dz);

        if (enemy.subParts?.halo) {
          (enemy.subParts.halo as THREE.Mesh).rotation.z = time * 6.5;
        }
        if (enemy.subParts?.core) {
          (enemy.subParts.core as THREE.Mesh).rotation.y = time * 4.0;
        }

        if (enemy.state === 'chase') {
          enemy.vx = (dx / (dist || 1)) * enemy.speed;
          enemy.vz = (dz / (dist || 1)) * enemy.speed;

          if (dist < 15.0) {
            enemy.state = 'windup';
            enemy.timer = 0;
          }
        } else if (enemy.state === 'windup') {
          enemy.timer += dt;
          enemy.telegraphProgress = enemy.timer / enemy.windupDuration;
          enemy.vx *= 0.8;
          enemy.vz *= 0.8;

          // Disperse into void energy before quantum blink
          if (enemy.timer >= enemy.windupDuration) {
            enemy.state = 'attack';
            enemy.timer = 0;
            sound.playPhaseTeleport();
            this.particleManager.spawn(enemy.x, 0.75, enemy.z, 25, 0xa855f7, 10, 0.4, 0.3);

            // Phase teleport: warp adjacent to player (ignoring obstacles!)
            const warpAngle = Math.random() * Math.PI * 2;
            const warpRadius = 6.0 + Math.random() * 3.0;
            enemy.x = Math.max(-ARENA_RADIUS + 2.5, Math.min(ARENA_RADIUS - 2.5, this.playerX + Math.cos(warpAngle) * warpRadius));
            enemy.z = Math.max(-ARENA_RADIUS + 2.5, Math.min(ARENA_RADIUS - 2.5, this.playerZ + Math.sin(warpAngle) * warpRadius));

            this.particleManager.spawn(enemy.x, 0.75, enemy.z, 30, 0xd946ef, 12, 0.5, 0.35);

            // Fan of 3 void energy bolts
            const shotAng = Math.atan2(this.playerX - enemy.x, this.playerZ - enemy.z);
            [-0.2, 0, 0.2].forEach((spread) => {
              const targetX = enemy.x + Math.sin(shotAng + spread) * 20;
              const targetZ = enemy.z + Math.cos(shotAng + spread) * 20;
              this.fireEnemyShot(enemy.x, enemy.z, targetX, targetZ, 22, 22);
            });
          }
        } else if (enemy.state === 'attack') {
          enemy.timer += dt;
          if (enemy.timer >= 0.35) {
            enemy.state = 'cooldown';
            enemy.timer = 0;
          }
        } else if (enemy.state === 'cooldown') {
          enemy.timer += dt;
          enemy.vx *= 0.9;
          enemy.vz *= 0.9;
          if (enemy.timer >= 1.7) {
            enemy.state = 'chase';
          }
        }
      } else if (enemy.type === 'boss_goliath_prime') {
        // --- WAVE 6 APEX BOSS: GOLIATH PRIME ---
        this.bossHpRatio = Math.max(0, enemy.hp / enemy.maxHp);
        this.playerStats.bossHpRatio = this.bossHpRatio;
        enemy.rotation = Math.atan2(-dx, -dz);

        const isOverdrive = this.bossHpRatio <= 0.5;
        this.playerStats.bossPhase = isOverdrive
          ? 'PHASE 2: BERSERK OVERDRIVE'
          : 'PHASE 1: SIEGE ARTILLERY';

        // Approach to artillery engagement range
        if (dist > 12) {
          enemy.vx = (dx / dist) * (isOverdrive ? 4.6 : 3.4);
          enemy.vz = (dz / dist) * (isOverdrive ? 4.6 : 3.4);
        } else {
          enemy.vx *= 0.88;
          enemy.vz *= 0.88;
        }

        // Molten core flare
        if (enemy.subParts?.core) {
          const coreMesh = enemy.subParts.core as THREE.Mesh;
          coreMesh.rotation.y = time * (isOverdrive ? 5.0 : 2.5);
          (coreMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = isOverdrive ? 4.5 : 2.5;
        }

        // Heavy Direct Dual Cannon Burst (Every 1.8s)
        enemy.timer += dt;
        if (enemy.timer >= (isOverdrive ? 1.5 : 2.0)) {
          enemy.timer = 0;
          const baseAng = enemy.rotation;
          [-0.12, 0.12].forEach((offset) => {
            const shotAng = baseAng + offset;
            const sx = enemy.x - Math.sin(shotAng) * 2.8;
            const sz = enemy.z - Math.cos(shotAng) * 2.8;
            const tx = sx - Math.sin(shotAng) * 25;
            const tz = sz - Math.cos(shotAng) * 25;
            this.fireEnemyShot(sx, sz, tx, tz, 24, 28);
          });
          this.particleManager.spawn(enemy.x, 1.4, enemy.z, 20, 0xff5500, 10, 0.5, 0.3);
        }

        // Signature Attack: Siege Mortar Artillery & Shockwave
        this.bossAttackTimer += dt;
        if (this.bossAttackTimer >= (isOverdrive ? 3.5 : 4.8)) {
          this.bossAttackTimer = 0;

          if (isOverdrive) {
            // Ground Slam Shockwave!
            sound.playBossShockwave();
            this.addTrauma(0.5);
            this.particleManager.triggerEMPRing(enemy.x, enemy.z, 0xff3b00);
            this.particleManager.spawn(enemy.x, 0.2, enemy.z, 50, 0xff3b00, 18, 0.7, 0.5);

            // Expanding shockwave damage check (jump/dash through it!)
            if (dist < 12.0 && !this.playerStats.isDashing) {
              this.damagePlayer(30);
              // Knockback player away from boss
              const kx = (this.playerX - enemy.x) / (dist || 1);
              const kz = (this.playerZ - enemy.z) / (dist || 1);
              this.playerVx += kx * 22;
              this.playerVz += kz * 22;
            }

            // Also fire 8-way shrapnel ring
            for (let a = 0; a < 8; a++) {
              const ang = (a * Math.PI * 2) / 8 + enemy.rotation;
              const sx = enemy.x - Math.sin(ang) * 2.5;
              const sz = enemy.z - Math.cos(ang) * 2.5;
              const tx = sx - Math.sin(ang) * 20;
              const tz = sz - Math.cos(ang) * 20;
              this.fireEnemyShot(sx, sz, tx, tz, 18, 18);
            }
          } else {
            // Mortar barrage targeting player's predicted coordinates
            sound.playHazardWarning();
            const impactX = this.playerX + (Math.random() - 0.5) * 4;
            const impactZ = this.playerZ + (Math.random() - 0.5) * 4;

            // Spawn warning telegraph on ground
            this.particleManager.spawn(impactX, 0.1, impactZ, 25, 0xff3b00, 6, 0.6, 0.4);

            // Schedule delayed mortar detonation
            window.setTimeout(() => {
              if (this.gameState === 'playing') {
                sound.playExplosion(true);
                this.addTrauma(0.4);
                this.particleManager.spawn(impactX, 0.8, impactZ, 60, 0xff5500, 16, 0.8, 0.5);
                const dPlayer = Math.hypot(this.playerX - impactX, this.playerZ - impactZ);
                if (dPlayer < 3.8 && !this.playerStats.isDashing) {
                  this.damagePlayer(32);
                }
              }
            }, 900);
          }
        }
      } else if (enemy.type === 'boss_nexus_colossus' || enemy.type === 'colossus') {
        // --- WAVE 12 APEX BOSS: NEXUS OMNI-COLOSSUS ---
        this.bossHpRatio = Math.max(0, enemy.hp / enemy.maxHp);
        this.playerStats.bossHpRatio = this.bossHpRatio;
        enemy.rotation = Math.atan2(-dx, -dz);

        const isPhase2 = this.bossHpRatio <= 0.5;
        this.playerStats.bossPhase = isPhase2
          ? 'PHASE 2: SHIELD OVERDRIVE'
          : 'PHASE 1: HELIX BULLET HELL';

        // Approach cautiously
        if (dist > 13) {
          enemy.vx = (dx / dist) * enemy.speed;
          enemy.vz = (dz / dist) * enemy.speed;
        } else {
          enemy.vx *= 0.9;
          enemy.vz *= 0.9;
        }

        // Pulse core & rotate shield mesh
        if (enemy.subParts?.core) {
          (enemy.subParts.core as THREE.Mesh).rotation.y = time * 3.5;
        }
        if (enemy.subParts?.shieldMesh) {
          const sMesh = enemy.subParts.shieldMesh as THREE.Mesh;
          sMesh.rotation.y = -time * 0.8;
          // While shield drones live, shield is ultra bright and opaque
          const hasDrones = this.bossShieldDrones.length > 0;
          (sMesh.material as THREE.MeshStandardMaterial).opacity = hasDrones ? 0.75 : 0.25;
          (sMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = hasDrones ? 1.8 : 0.6;
        }

        // Spawn shield drones once entering Phase 2
        if (isPhase2 && !enemy.subParts?.dronesDeployed) {
          if (!enemy.subParts) enemy.subParts = {};
          enemy.subParts.dronesDeployed = true;
          sound.playBossIntroSiren();
          // Spawn 4 orbiting shield drones
          for (let i = 0; i < 4; i++) {
            this.spawnEnemy('boss_shield_drone');
          }
        }

        // Continuous Double-Helix Spiral Bullet Storm (Bullet Hell)
        this.bossSpiralAngle += dt * 3.5;
        enemy.timer += dt;
        if (enemy.timer >= 0.22) {
          enemy.timer = 0;
          [-0.15, 0.15].forEach((offset) => {
            const shotAng = this.bossSpiralAngle + offset;
            const sx = enemy.x - Math.sin(shotAng) * 2.2;
            const sz = enemy.z - Math.cos(shotAng) * 2.2;
            const tx = sx - Math.sin(shotAng) * 22;
            const tz = sz - Math.cos(shotAng) * 22;
            this.fireEnemyShot(sx, sz, tx, tz, 16, 18);
          });
        }

        // Sweeping Searing Death Laser (Every 6.0s)
        this.bossAttackTimer += dt;
        if (this.bossAttackTimer >= 6.0) {
          this.bossAttackTimer = 0;
          sound.playBossLaserFire();
          this.addTrauma(0.4);

          // Sweeping 7-bolt arc fan
          const baseAng = enemy.rotation;
          [-0.45, -0.3, -0.15, 0, 0.15, 0.3, 0.45].forEach((angOffset) => {
            const shotAng = baseAng + angOffset;
            const sx = enemy.x - Math.sin(shotAng) * 2.8;
            const sz = enemy.z - Math.cos(shotAng) * 2.8;
            const tx = sx - Math.sin(shotAng) * 26;
            const tz = sz - Math.cos(shotAng) * 26;
            this.fireEnemyShot(sx, sz, tx, tz, 24, 25);
          });
        }
      } else if (enemy.type === 'boss_hyperion_archon') {
        // --- WAVE 18+ APEX BOSS: HYPERION ARCHON ---
        this.bossHpRatio = Math.max(0, enemy.hp / enemy.maxHp);
        this.playerStats.bossHpRatio = this.bossHpRatio;
        enemy.rotation = Math.atan2(-dx, -dz);

        const isPhase2 = this.bossHpRatio <= 0.5;
        this.playerStats.bossPhase = isPhase2
          ? 'PHASE 2: APEX EXTINCTION'
          : 'PHASE 1: VOID MATRIX';

        // Hover & glide around arena center
        const glideAngle = time * 0.5;
        const targetX = Math.cos(glideAngle) * 8;
        const targetZ = Math.sin(glideAngle) * 8;
        enemy.vx = (targetX - enemy.x) * 1.5;
        enemy.vz = (targetZ - enemy.z) * 1.5;

        // Spin halo ring & core
        if (enemy.subParts?.haloRing) {
          (enemy.subParts.haloRing as THREE.Mesh).rotation.z = time * 2.5;
        }
        if (enemy.subParts?.core) {
          (enemy.subParts.core as THREE.Mesh).rotation.y = time * 4.0;
        }

        // Teleport Phase Shift if player gets too close
        if (dist < 6.5) {
          sound.playPortalWarp();
          this.particleManager.spawn(enemy.x, 2.0, enemy.z, 40, 0xa855f7, 14, 0.5, 0.3);
          const warpAngle = Math.random() * Math.PI * 2;
          enemy.x = Math.cos(warpAngle) * 15;
          enemy.z = Math.sin(warpAngle) * 15;
          this.particleManager.spawn(enemy.x, 2.0, enemy.z, 40, 0xa855f7, 14, 0.5, 0.3);
        }

        // Rapid 12-way starburst pulse (Every 2.4s)
        enemy.timer += dt;
        if (enemy.timer >= (isPhase2 ? 1.6 : 2.4)) {
          enemy.timer = 0;
          sound.playLaser(600);
          const count = isPhase2 ? 16 : 12;
          for (let k = 0; k < count; k++) {
            const shotAng = (k * Math.PI * 2) / count + time;
            const sx = enemy.x - Math.sin(shotAng) * 2.5;
            const sz = enemy.z - Math.cos(shotAng) * 2.5;
            const tx = sx - Math.sin(shotAng) * 25;
            const tz = sz - Math.cos(shotAng) * 25;
            this.fireEnemyShot(sx, sz, tx, tz, 20, 22);
          }
        }
      } else if (enemy.type === 'boss_shield_drone') {
        // Escort Shield Drone: Circles the active boss
        if (this.bossEntity) {
          const orbitAngle = time * 2.0 + (enemy.id % 4) * (Math.PI / 2);
          const orbitRadius = 5.5;
          const targetX = this.bossEntity.x + Math.cos(orbitAngle) * orbitRadius;
          const targetZ = this.bossEntity.z + Math.sin(orbitAngle) * orbitRadius;
          enemy.vx = (targetX - enemy.x) * 4.0;
          enemy.vz = (targetZ - enemy.z) * 4.0;
          enemy.rotation = Math.atan2(-(this.playerX - enemy.x), -(this.playerZ - enemy.z));

          // Occasional support shot at player
          enemy.timer += dt;
          if (enemy.timer >= 2.2) {
            enemy.timer = 0;
            this.fireEnemyShot(enemy.x, enemy.z, this.playerX, this.playerZ, 14, 18);
          }
        } else {
          // If boss died, fly toward player
          enemy.vx = (dx / (dist || 1)) * enemy.speed;
          enemy.vz = (dz / (dist || 1)) * enemy.speed;
        }
      }

      // Kinematics & collision with other enemies
      enemy.x += enemy.vx * dt;
      enemy.z += enemy.vz * dt;

      // In-Arena Building & Obstacle Collision (Phase Stalkers phase through cover during quantum attacks!)
      if (!(enemy.type === 'phase_stalker' && (enemy.state === 'attack' || enemy.state === 'windup'))) {
        const eCol = this.obstacleManager.resolveEntityCollision(enemy.x, enemy.z, enemy.radius);
        enemy.x = eCol.x;
        enemy.z = eCol.z;
      }

      // Arena clamp: 30m perimeter during waves 1-10; up to 170m in open metropolis after Level 10 is cleared
      const dCenter = Math.hypot(enemy.x, enemy.z);
      const enemyMaxBound = this.playerStats.wave > 10 ? 170.0 : ARENA_RADIUS - 1.5;
      if (dCenter > enemyMaxBound) {
        enemy.x = (enemy.x / dCenter) * enemyMaxBound;
        enemy.z = (enemy.z / dCenter) * enemyMaxBound;
      }

      enemy.group.position.set(enemy.x, 0, enemy.z);
      enemy.group.rotation.y = enemy.rotation;
    });
  }

  private updateProjectiles(dt: number) {
    const isLevel10Cleared = this.playerStats.wave > 10;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.z += p.vz * dt;

      p.mesh.position.set(p.x, p.y, p.z);

      // Check lifetime / arena bounds: within 30m ring during early waves; up to 90m from player in open metropolis
      const isOutOfBounds = isLevel10Cleared
        ? Math.hypot(p.x - this.playerX, p.z - this.playerZ) > 90
        : Math.hypot(p.x, p.z) > ARENA_RADIUS;

      if (p.life >= p.maxLife || isOutOfBounds) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check physical building & obstacle collisions (allows cover tactics!)
      const obsHit = this.obstacleManager.checkProjectileHit(p.x, p.z, p.radius);
      if (obsHit.hit) {
        this.particleManager.spawnHitExplosion(
          obsHit.hitX,
          p.y,
          obsHit.hitZ,
          p.color,
          -p.vx * 0.35,
          -p.vz * 0.35,
          1.0
        );
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

      const magnetDist = this.playerStats.magnetRange || 5.0;
      if (dist < magnetDist) {
        const pull = (1 - dist / magnetDist) * 20 * dt;
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

    // Dynamic kinetic FOV expansion on dash (visceral warp acceleration effect)
    const targetFov = this.playerStats.isDashing ? this.cameraBaseFov + 3.2 : this.cameraBaseFov;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 12, dt);
    this.camera.updateProjectionMatrix();

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
