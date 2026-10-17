import * as THREE from 'three';
import { ARENA_RADIUS } from './arena';
import { sound } from './audio';
import { ParticleManager } from './particles';

export type HazardType = 'electric_tile' | 'laser_grid';
export type HazardPhase = 'telegraph' | 'active' | 'decay';

export interface HazardEntity {
  id: number;
  type: HazardType;
  phase: HazardPhase;
  group: THREE.Group;
  // Timing
  timer: number;
  telegraphDuration: number;
  activeDuration: number;
  decayDuration: number;
  // Bounds & Positioning
  x: number;
  z: number;
  width: number;
  depth: number;
  // For laser grid
  x2?: number;
  z2?: number;
  // Tactical & Damage
  damageTickTimer: number;
  // Three.js internal references for fast procedural animation
  dynamicMeshes: {
    warningGround?: THREE.Mesh;
    warningBorder?: THREE.LineSegments | THREE.Mesh;
    activeCore?: THREE.Mesh;
    activeAura?: THREE.Mesh;
    pylonBeacons?: THREE.Mesh[];
    beamCore?: THREE.Mesh;
    beamAura?: THREE.Mesh;
  };
}

export class HazardManager {
  private scene: THREE.Scene;
  private particleManager: ParticleManager;
  private hazards: HazardEntity[] = [];
  private nextHazardId: number = 1;
  private spawnCooldown: number = 4.0; // Initial delay before first hazard in a wave

  // Reusable materials & geometries for optimal GPU memory
  private warningFloorMat: THREE.MeshBasicMaterial;
  private warningBorderMat: THREE.LineBasicMaterial;
  private electricCoreMat: THREE.MeshBasicMaterial;
  private electricPlaneMat: THREE.MeshBasicMaterial;
  private laserCoreMat: THREE.MeshBasicMaterial;
  private laserAuraMat: THREE.MeshBasicMaterial;
  private pylonMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene, particleManager: ParticleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    // Materials
    this.warningFloorMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.warningBorderMat = new THREE.LineBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.8,
    });

    this.electricCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    this.electricPlaneMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.laserCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      blending: THREE.AdditiveBlending,
    });

    this.laserAuraMat = new THREE.MeshBasicMaterial({
      color: 0xff0044,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.pylonMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.25,
    });
  }

  /**
   * Spawns an electrified floor tile zone with holographic warning border and pylons.
   */
  public spawnElectrifiedTile(
    x: number,
    z: number,
    width: number = 7.0,
    depth: number = 7.0,
    telegraphDuration: number = 2.0,
    activeDuration: number = 3.2
  ): HazardEntity {
    const id = this.nextHazardId++;
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // 1. Warning Floor Decal (Holographic amber plane)
    const floorGeo = new THREE.PlaneGeometry(width, depth);
    const warningGround = new THREE.Mesh(floorGeo, this.warningFloorMat.clone());
    warningGround.rotation.x = -Math.PI / 2;
    warningGround.position.y = 0.04;
    group.add(warningGround);

    // 2. Warning Border Frame (Box edges)
    const borderGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(width, 0.1, depth));
    const warningBorder = new THREE.LineSegments(borderGeo, this.warningBorderMat.clone());
    warningBorder.position.y = 0.05;
    group.add(warningBorder);

    // 3. Four Corner Warning Pylons
    const pylonBeacons: THREE.Mesh[] = [];
    const halfW = width / 2;
    const halfD = depth / 2;
    const cornerOffsets = [
      [-halfW, -halfD],
      [halfW, -halfD],
      [-halfW, halfD],
      [halfW, halfD],
    ];

    cornerOffsets.forEach(([cx, cz]) => {
      const pylonNode = new THREE.Group();
      pylonNode.position.set(cx, 0, cz);

      // Base
      const baseMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.35, 0.5, 6),
        this.pylonMat
      );
      baseMesh.position.y = 0.25;
      baseMesh.castShadow = true;
      pylonNode.add(baseMesh);

      // Glowing emitter beacon tip
      const beaconMesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.18, 0),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b })
      );
      beaconMesh.position.y = 0.6;
      pylonNode.add(beaconMesh);
      pylonBeacons.push(beaconMesh);

      group.add(pylonNode);
    });

    // 4. Active Electric Plane & Core Arc lattice (hidden until active phase)
    const activePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(width - 0.2, depth - 0.2),
      this.electricPlaneMat.clone()
    );
    activePlane.rotation.x = -Math.PI / 2;
    activePlane.position.y = 0.07;
    activePlane.visible = false;
    group.add(activePlane);

    // Electric energy wireframe lattice
    const arcGridGeo = new THREE.PlaneGeometry(width - 0.4, depth - 0.4, 6, 6);
    const activeCore = new THREE.Mesh(
      arcGridGeo,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      })
    );
    activeCore.rotation.x = -Math.PI / 2;
    activeCore.position.y = 0.09;
    activeCore.visible = false;
    group.add(activeCore);

    this.scene.add(group);
    sound.playHazardWarning();

    const entity: HazardEntity = {
      id,
      type: 'electric_tile',
      phase: 'telegraph',
      group,
      timer: 0,
      telegraphDuration,
      activeDuration,
      decayDuration: 0.4,
      x,
      z,
      width,
      depth,
      damageTickTimer: 0,
      dynamicMeshes: {
        warningGround,
        warningBorder,
        activeCore,
        activeAura: activePlane,
        pylonBeacons,
      },
    };

    this.hazards.push(entity);
    return entity;
  }

  /**
   * Spawns a high-energy laser grid spanning between two emitter pylons across the arena floor.
   */
  public spawnLaserGrid(
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    telegraphDuration: number = 2.2,
    activeDuration: number = 2.8
  ): HazardEntity {
    const id = this.nextHazardId++;
    const group = new THREE.Group();

    const midX = (x1 + x2) / 2;
    const midZ = (z1 + z2) / 2;
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);

    const laserHeight = 0.55; // Mech hover height

    // 1. Two Heavy Emitter Pylons at endpoints
    const pylonBeacons: THREE.Mesh[] = [];
    [
      [x1, z1],
      [x2, z2],
    ].forEach(([px, pz]) => {
      const pylonGroup = new THREE.Group();
      pylonGroup.position.set(px, 0, pz);

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.5, 0.7, 8),
        this.pylonMat
      );
      base.position.y = 0.35;
      base.castShadow = true;
      pylonGroup.add(base);

      const lens = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
      );
      lens.position.y = laserHeight;
      pylonGroup.add(lens);
      pylonBeacons.push(lens);

      group.add(pylonGroup);
    });

    // 2. Telegraph Guide Line (Thin red blinking guideline)
    const guideGeo = new THREE.CylinderGeometry(0.04, 0.04, length, 6);
    guideGeo.rotateX(Math.PI / 2);
    const warningBorder = new THREE.Mesh(
      guideGeo,
      new THREE.MeshBasicMaterial({
        color: 0xff0044,
        transparent: true,
        opacity: 0.6,
      })
    );
    warningBorder.position.set(midX, laserHeight, midZ);
    warningBorder.rotation.y = angle;
    group.add(warningBorder);

    // Telegraph floor shadow line
    const floorLineGeo = new THREE.PlaneGeometry(0.2, length);
    const warningGround = new THREE.Mesh(
      floorLineGeo,
      new THREE.MeshBasicMaterial({
        color: 0xff2200,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      })
    );
    warningGround.rotation.x = -Math.PI / 2;
    warningGround.rotation.z = -angle;
    warningGround.position.set(midX, 0.03, midZ);
    group.add(warningGround);

    // 3. Active Lethal Laser Beam (Hot core + Volumetric outer aura)
    const beamGeo = new THREE.CylinderGeometry(0.12, 0.12, length, 12);
    beamGeo.rotateX(Math.PI / 2);
    const beamCore = new THREE.Mesh(beamGeo, this.laserCoreMat.clone());
    beamCore.position.set(midX, laserHeight, midZ);
    beamCore.rotation.y = angle;
    beamCore.visible = false;
    group.add(beamCore);

    const auraGeo = new THREE.CylinderGeometry(0.42, 0.42, length, 12);
    auraGeo.rotateX(Math.PI / 2);
    const beamAura = new THREE.Mesh(auraGeo, this.laserAuraMat.clone());
    beamAura.position.set(midX, laserHeight, midZ);
    beamAura.rotation.y = angle;
    beamAura.visible = false;
    group.add(beamAura);

    this.scene.add(group);
    sound.playHazardWarning();

    const entity: HazardEntity = {
      id,
      type: 'laser_grid',
      phase: 'telegraph',
      group,
      timer: 0,
      telegraphDuration,
      activeDuration,
      decayDuration: 0.3,
      x: x1,
      z: z1,
      x2,
      z2,
      width: length,
      depth: 0.85, // Lethal radius
      damageTickTimer: 0,
      dynamicMeshes: {
        warningGround,
        warningBorder,
        beamCore,
        beamAura,
        pylonBeacons,
      },
    };

    this.hazards.push(entity);
    return entity;
  }

  /**
   * Spawns localized hazards dynamically based on wave progression.
   */
  public spawnRandomHazard(wave: number, sectorLevel: number) {
    // Choose between electric tile and laser grid
    const allowLaser = wave >= 2;
    const roll = Math.random();
    const isLaser = allowLaser && roll > 0.45;

    const maxRadius = ARENA_RADIUS - 6;

    if (isLaser) {
      // Pick random chords cutting across the arena
      const angle = Math.random() * Math.PI * 2;
      const distFromCenter = (Math.random() - 0.5) * (maxRadius * 0.9);
      const perpAngle = angle + Math.PI / 2;

      const chordHalfLen = Math.sqrt(Math.max(4, maxRadius * maxRadius - distFromCenter * distFromCenter));
      const cx = Math.cos(angle) * distFromCenter;
      const cz = Math.sin(angle) * distFromCenter;

      const x1 = cx + Math.cos(perpAngle) * chordHalfLen;
      const z1 = cz + Math.sin(perpAngle) * chordHalfLen;
      const x2 = cx - Math.cos(perpAngle) * chordHalfLen;
      const z2 = cz - Math.sin(perpAngle) * chordHalfLen;

      const telegraph = Math.max(1.7, 2.3 - wave * 0.05);
      const active = 2.6 + Math.min(wave * 0.1, 1.2);
      this.spawnLaserGrid(x1, z1, x2, z2, telegraph, active);

      // On higher sector levels (or boss wave), spawn an intersecting cross beam!
      if (wave >= 5 || sectorLevel >= 2) {
        if (Math.random() < 0.4) {
          const crossAngle = perpAngle;
          const crossPerp = angle;
          const crossDist = (Math.random() - 0.5) * 8;
          const cx2 = Math.cos(crossAngle) * crossDist;
          const cz2 = Math.sin(crossAngle) * crossDist;
          const halfL = Math.sqrt(Math.max(4, maxRadius * maxRadius - crossDist * crossDist));

          this.spawnLaserGrid(
            cx2 + Math.cos(crossPerp) * halfL,
            cz2 + Math.sin(crossPerp) * halfL,
            cx2 - Math.cos(crossPerp) * halfL,
            cz2 - Math.sin(crossPerp) * halfL,
            telegraph + 0.3,
            active
          );
        }
      }
    } else {
      // Pick random floor tile position in arena (avoiding exact center where portal spawns)
      const r = 4 + Math.random() * (maxRadius - 5);
      const theta = Math.random() * Math.PI * 2;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;

      const tileSize = 6.0 + Math.random() * 2.5;
      const telegraph = Math.max(1.8, 2.2 - wave * 0.04);
      const active = 3.2;

      this.spawnElectrifiedTile(x, z, tileSize, tileSize, telegraph, active);
    }
  }

  /**
   * Main simulation update loop for all hazards.
   */
  public update(
    dt: number,
    time: number,
    player: { x: number; z: number; isDashing: boolean },
    damagePlayer: (amount: number) => void,
    damageEnemy: (
      enemy: any,
      amount: number,
      hitX?: number,
      hitY?: number,
      hitZ?: number
    ) => void,
    enemies: any[],
    wave: number,
    sectorLevel: number,
    isPlaying: boolean
  ) {
    // 1. Spawner Director Tick
    if (isPlaying) {
      this.spawnCooldown -= dt;
      // Cap concurrent hazards based on wave
      const maxConcurrent = wave >= 5 ? 3 : wave >= 3 ? 2 : 1;
      if (this.spawnCooldown <= 0 && this.hazards.length < maxConcurrent) {
        this.spawnRandomHazard(wave, sectorLevel);
        // Interval between hazard spawns: 6.5s to 9.5s
        this.spawnCooldown = 6.5 + Math.random() * 3.0;
      }
    }

    // 2. Update existing hazards
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.timer += dt;
      h.damageTickTimer += dt;

      if (h.phase === 'telegraph') {
        const progress = Math.min(1.0, h.timer / h.telegraphDuration);

        // Flash frequency accelerates as activation nears (from 3Hz up to 14Hz)
        const flashRate = 4.0 + progress * 10.0;
        const flashIntensity = 0.5 + Math.sin(time * flashRate * Math.PI * 2) * 0.45;

        if (h.type === 'electric_tile') {
          // Warning ground opacity pulses
          if (h.dynamicMeshes.warningGround) {
            const mat = h.dynamicMeshes.warningGround.material as THREE.MeshBasicMaterial;
            mat.opacity = 0.15 + flashIntensity * 0.35;
          }
          // Pylon beacons flash amber
          h.dynamicMeshes.pylonBeacons?.forEach((b) => {
            (b.material as THREE.MeshBasicMaterial).color.setHex(
              flashIntensity > 0.5 ? 0xf59e0b : 0x78350f
            );
          });
        } else if (h.type === 'laser_grid') {
          // Guide line blinks
          if (h.dynamicMeshes.warningBorder) {
            (h.dynamicMeshes.warningBorder.material as THREE.MeshBasicMaterial).opacity =
              0.2 + flashIntensity * 0.7;
          }
          if (h.dynamicMeshes.warningGround) {
            (h.dynamicMeshes.warningGround.material as THREE.MeshBasicMaterial).opacity =
              0.1 + flashIntensity * 0.4;
          }
          h.dynamicMeshes.pylonBeacons?.forEach((b) => {
            (b.material as THREE.MeshBasicMaterial).color.setHex(
              flashIntensity > 0.5 ? 0xff0044 : 0x450a0a
            );
          });
        }

        // Transition from Telegraph to Active
        if (h.timer >= h.telegraphDuration) {
          h.phase = 'active';
          h.timer = 0;

          if (h.type === 'electric_tile') {
            sound.playElectricShock();
            // Hide telegraph, show active
            if (h.dynamicMeshes.warningGround) h.dynamicMeshes.warningGround.visible = false;
            if (h.dynamicMeshes.warningBorder) h.dynamicMeshes.warningBorder.visible = false;
            if (h.dynamicMeshes.activeAura) h.dynamicMeshes.activeAura.visible = true;
            if (h.dynamicMeshes.activeCore) h.dynamicMeshes.activeCore.visible = true;

            // Turn pylon beacons electric cyan
            h.dynamicMeshes.pylonBeacons?.forEach((b) => {
              (b.material as THREE.MeshBasicMaterial).color.setHex(0x00f0ff);
            });

            // Initial spark eruption
            this.particleManager.spawnElectricSparks(h.x, 0.1, h.z, 16, h.width / 2);
          } else if (h.type === 'laser_grid') {
            sound.playLaserGridActive();
            // Hide guide lines, activate heavy laser beam
            if (h.dynamicMeshes.warningBorder) h.dynamicMeshes.warningBorder.visible = false;
            if (h.dynamicMeshes.warningGround) h.dynamicMeshes.warningGround.visible = false;
            if (h.dynamicMeshes.beamCore) h.dynamicMeshes.beamCore.visible = true;
            if (h.dynamicMeshes.beamAura) h.dynamicMeshes.beamAura.visible = true;

            h.dynamicMeshes.pylonBeacons?.forEach((b) => {
              (b.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
            });

            // Initial laser line spark eruption
            const midX = (h.x + (h.x2 ?? h.x)) / 2;
            const midZ = (h.z + (h.z2 ?? h.z)) / 2;
            this.particleManager.spawnLaserSparks(midX, 0.1, midZ, 12);
          }
        }
      } else if (h.phase === 'active') {
        // --- Active VFX Animations ---
        if (h.type === 'electric_tile') {
          // Electric grid jitter & wave
          if (h.dynamicMeshes.activeCore) {
            h.dynamicMeshes.activeCore.position.y = 0.08 + Math.sin(time * 30) * 0.02;
            (h.dynamicMeshes.activeCore.material as THREE.MeshBasicMaterial).opacity =
              0.6 + Math.random() * 0.4;
          }
          if (h.dynamicMeshes.activeAura) {
            (h.dynamicMeshes.activeAura.material as THREE.MeshBasicMaterial).opacity =
              0.5 + Math.sin(time * 20) * 0.2;
          }

          // Emit crackling electric sparks
          if (Math.random() < 0.6) {
            this.particleManager.spawnElectricSparks(h.x, 0.1, h.z, 3, h.width / 2);
          }
        } else if (h.type === 'laser_grid') {
          // Laser beam pulsation & core jitter
          if (h.dynamicMeshes.beamAura) {
            const scaleY = 1.0 + Math.sin(time * 25) * 0.25;
            h.dynamicMeshes.beamAura.scale.set(scaleY, 1.0, scaleY);
          }
          // Spray molten contact sparks along the beam line
          if (h.x2 !== undefined && h.z2 !== undefined && Math.random() < 0.65) {
            const alpha = Math.random();
            const sx = THREE.MathUtils.lerp(h.x, h.x2, alpha);
            const sz = THREE.MathUtils.lerp(h.z, h.z2, alpha);
            const dirX = (h.x2 - h.x) / h.width;
            const dirZ = (h.z2 - h.z) / h.width;
            this.particleManager.spawnLaserSparks(sx, 0.1, sz, 2, dirX, dirZ);
          }
        }

        // --- Tactical Damage Evaluation ---
        if (h.damageTickTimer >= 0.35) {
          h.damageTickTimer = 0;

          // 1. Player check
          if (h.type === 'electric_tile') {
            const halfW = h.width / 2;
            const halfD = h.depth / 2;
            const inside =
              player.x >= h.x - halfW &&
              player.x <= h.x + halfW &&
              player.z >= h.z - halfD &&
              player.z <= h.z + halfD;

            if (inside) {
              if (player.isDashing) {
                // Kinetic dash provides immunity window!
              } else {
                damagePlayer(12);
                sound.playElectricShock();
                this.particleManager.spawnElectricSparks(player.x, 0.55, player.z, 8, 0.5);
              }
            }

            // Tactical baiting: damage enemies standing in the tile!
            enemies.forEach((enemy) => {
              if (
                enemy.x >= h.x - halfW &&
                enemy.x <= h.x + halfW &&
                enemy.z >= h.z - halfD &&
                enemy.z <= h.z + halfD
              ) {
                damageEnemy(enemy, 35, enemy.x, 0.7, enemy.z);
                this.particleManager.spawnElectricSparks(enemy.x, 0.6, enemy.z, 4, 0.4);
              }
            });
          } else if (h.type === 'laser_grid' && h.x2 !== undefined && h.z2 !== undefined) {
            // Distance from player to laser line segment
            const dist = distToSegment(player.x, player.z, h.x, h.z, h.x2, h.z2);
            if (dist <= 0.85) {
              if (player.isDashing) {
                // Kinetic dash cuts right through the laser grid!
              } else {
                damagePlayer(22);
                sound.playLaserGridActive();
                this.particleManager.spawnLaserSparks(player.x, 0.55, player.z, 10);
              }
            }

            // Tactical baiting: enemies cutting through the laser beam take heavy burn damage!
            enemies.forEach((enemy) => {
              const eDist = distToSegment(enemy.x, enemy.z, h.x, h.z, h.x2!, h.z2!);
              if (eDist <= 1.1) {
                damageEnemy(enemy, 60, enemy.x, 0.7, enemy.z);
                this.particleManager.spawnLaserSparks(enemy.x, 0.6, enemy.z, 6);
              }
            });
          }
        }

        // Transition from Active to Decay
        if (h.timer >= h.activeDuration) {
          h.phase = 'decay';
          h.timer = 0;
        }
      } else if (h.phase === 'decay') {
        const decayProgress = Math.min(1.0, h.timer / h.decayDuration);
        const fade = 1.0 - decayProgress;

        // Fade out all active meshes
        if (h.dynamicMeshes.activeAura) {
          (h.dynamicMeshes.activeAura.material as THREE.MeshBasicMaterial).opacity = 0.5 * fade;
        }
        if (h.dynamicMeshes.activeCore) {
          (h.dynamicMeshes.activeCore.material as THREE.MeshBasicMaterial).opacity = 0.8 * fade;
        }
        if (h.dynamicMeshes.beamCore) {
          h.dynamicMeshes.beamCore.scale.set(fade, 1.0, fade);
        }
        if (h.dynamicMeshes.beamAura) {
          (h.dynamicMeshes.beamAura.material as THREE.MeshBasicMaterial).opacity = 0.7 * fade;
          h.dynamicMeshes.beamAura.scale.set(fade, 1.0, fade);
        }

        // Cleanup after decay completes
        if (h.timer >= h.decayDuration) {
          this.scene.remove(h.group);
          disposeHierarchy(h.group);
          this.hazards.splice(i, 1);
        }
      }
    }
  }

  /**
   * Clears all hazards immediately (e.g. on game over, restart, or level warp).
   */
  public clear() {
    this.hazards.forEach((h) => {
      this.scene.remove(h.group);
      disposeHierarchy(h.group);
    });
    this.hazards = [];
    this.spawnCooldown = 4.0;
  }

  public getActiveCount(): number {
    return this.hazards.filter((h) => h.phase === 'active').length;
  }

  public getTelegraphingCount(): number {
    return this.hazards.filter((h) => h.phase === 'telegraph').length;
  }
}

/**
 * Calculates perpendicular distance from a 2D point (px, pz) to a line segment (x1, z1) - (x2, z2)
 */
function distToSegment(
  px: number,
  pz: number,
  x1: number,
  z1: number,
  x2: number,
  z2: number
): number {
  const l2 = (x2 - x1) * (x2 - x1) + (z2 - z1) * (z2 - z1);
  if (l2 === 0) return Math.hypot(px - x1, pz - z1);

  let t = ((px - x1) * (x2 - x1) + (pz - z1) * (z2 - z1)) / l2;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * (x2 - x1);
  const projZ = z1 + t * (z2 - z1);

  return Math.hypot(px - projX, pz - projZ);
}

/**
 * Cleanly disposes geometries and materials of an object tree to prevent memory leaks.
 */
function disposeHierarchy(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.LineSegments) {
      if (child.geometry) child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else if (child.material) {
        child.material.dispose();
      }
    }
  });
}
