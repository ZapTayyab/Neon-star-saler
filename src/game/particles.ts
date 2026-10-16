import * as THREE from 'three';

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  r: number;
  g: number;
  b: number;
  size: number;
  life: number;
  maxLife: number;
  active: boolean;
  drag: number;
}

const MAX_PARTICLES = 1800;
const _tempColor = new THREE.Color();

// Spectrum of vibrant high-contrast neon hues for colorful collision explosions
const HIT_EXPLOSION_PALETTE = [
  0x00f5ff, // Hyper Cyan
  0xff007f, // Hot Electric Magenta
  0xffea00, // Solar Electric Yellow
  0xff5500, // Plasma Neon Orange
  0xa855f7, // Deep Neon Violet
  0x10b981, // Vivid Emerald
  0x38bdf8, // Sky Laser Blue
  0xff0055, // Vivid Laser Crimson
  0xff77e9, // Bubblegum Neon
  0x00ffcc, // Electric Turquoise
];

export class ParticleManager {
  private points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private pool: Particle[];
  private poolCursor: number = 0;

  // EMP ring mesh
  public empRing: THREE.Mesh;
  private empRingActive: boolean = false;
  private empRingProgress: number = 0;

  constructor(scene: THREE.Scene) {
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);
    this.pool = [];

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.pool.push({
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        r: 1,
        g: 1,
        b: 1,
        size: 0,
        life: 0,
        maxLife: 1,
        active: false,
        drag: 3.0,
      });
      this.positions[i * 3] = 0;
      this.positions[i * 3 + 1] = -100;
      this.positions[i * 3 + 2] = 0;
      this.colors[i * 3] = 0;
      this.colors[i * 3 + 1] = 0;
      this.colors[i * 3 + 2] = 0;
      this.sizes[i] = 0;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    // Particle sprite canvas texture: smooth feathered circular spark with ultra-hot white core
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Hook shader to read per-particle vertex size and apply distance perspective
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
attribute float size;`
      );
      shader.vertexShader = shader.vertexShader.replace(
        'gl_PointSize = size;',
        'gl_PointSize = size * ( 260.0 / - mvPosition.z );'
      );
    };

    this.points = new THREE.Points(this.geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.points);

    // Shockwave ring for EMP / heavy blast
    const ringGeo = new THREE.RingGeometry(0.1, 0.4, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.empRing = new THREE.Mesh(ringGeo, ringMat);
    this.empRing.position.y = 0.1;
    scene.add(this.empRing);
  }

  /**
   * Spawns a short-lived, colorful particle explosion at exact collision contact points.
   * Features snappy outward explosive velocities, splash reflection, dynamic neon hues,
   * pure white core sparks, and rapid decay for crisp visual punch.
   */
  public spawnHitExplosion(
    x: number,
    y: number,
    z: number,
    bulletColor: number = 0x00f0ff,
    bulletVx: number = 0,
    bulletVz: number = 0,
    comboMultiplier: number = 1.0
  ) {
    const isEmpowered = comboMultiplier >= 2.0;
    // Higher streak multiplier spawns even more intense spark explosions
    const count = isEmpowered ? 24 : 16;

    // Angle of incoming projectile, so sparks naturally splash away from impact surface
    const hasVelocity = Math.hypot(bulletVx, bulletVz) > 1.0;
    const bulletAngle = hasVelocity ? Math.atan2(bulletVx, bulletVz) : Math.random() * Math.PI * 2;
    const reboundAngle = bulletAngle + Math.PI;

    let spawned = 0;
    for (let i = 0; i < MAX_PARTICLES && spawned < count; i++) {
      const idx = (this.poolCursor + i) % MAX_PARTICLES;
      const p = this.pool[idx];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        p.z = z;

        // Choose colorful hue:
        // ~25% pure white sparks (intense instantaneous flash)
        // ~35% primary projectile color (visual continuity with weapon)
        // ~40% brilliant neon rainbow shards (electric cyan, magenta, solar yellow, orange, violet, emerald)
        const roll = Math.random();
        let colHex: number;
        if (roll < 0.25) {
          colHex = 0xffffff;
        } else if (roll < 0.6) {
          colHex = bulletColor;
        } else {
          colHex = HIT_EXPLOSION_PALETTE[Math.floor(Math.random() * HIT_EXPLOSION_PALETTE.length)];
        }
        _tempColor.setHex(colHex);

        // Explosive burst trajectory:
        // 70% directional splash bounce away from impact normal + 30% 360-degree omni blast
        const isOmni = Math.random() < 0.3;
        const spreadAngle = isOmni
          ? Math.random() * Math.PI * 2
          : reboundAngle + (Math.random() - 0.5) * Math.PI * 1.35;

        const baseSpd = 9 + Math.random() * 13;
        const spd = isEmpowered ? baseSpd * 1.25 : baseSpd;

        p.vx = Math.sin(spreadAngle) * spd + (Math.random() - 0.5) * 3;
        p.vz = Math.cos(spreadAngle) * spd + (Math.random() - 0.5) * 3;
        // Arc upwards into the air with gravity
        p.vy = 2.0 + Math.random() * 6.5;

        p.r = _tempColor.r;
        p.g = _tempColor.g;
        p.b = _tempColor.b;
        // White flash particles are slightly larger, sparks are crisp needles
        p.size = (colHex === 0xffffff ? 0.8 : 0.45) + Math.random() * 0.45;
        if (isEmpowered) p.size *= 1.2;

        // Short-lived: 0.14s to 0.26s for snappy, punchy feedback
        p.life = 0.14 + Math.random() * 0.12;
        p.maxLife = p.life;
        p.drag = 5.2; // Quick explosive deceleration for that classic energetic snap

        this.poolCursor = (idx + 1) % MAX_PARTICLES;
        spawned++;
      }
    }
  }

  public spawn(
    x: number,
    y: number,
    z: number,
    count: number,
    colorHex: number,
    speed: number = 5,
    size: number = 0.5,
    lifetime: number = 0.4
  ) {
    const col = new THREE.Color(colorHex);
    let spawned = 0;

    for (let i = 0; i < MAX_PARTICLES && spawned < count; i++) {
      const idx = (this.poolCursor + i) % MAX_PARTICLES;
      const p = this.pool[idx];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        p.z = z;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const spd = speed * (0.4 + Math.random() * 0.8);
        p.vx = Math.sin(phi) * Math.cos(theta) * spd;
        p.vy = Math.cos(phi) * spd * 0.6 + 1.2;
        p.vz = Math.sin(phi) * Math.sin(theta) * spd;

        p.r = col.r;
        p.g = col.g;
        p.b = col.b;
        p.size = size;
        p.life = lifetime * (0.6 + Math.random() * 0.8);
        p.maxLife = p.life;
        p.drag = 3.0;

        this.poolCursor = (idx + 1) % MAX_PARTICLES;
        spawned++;
      }
    }
  }

  public triggerEMPRing(x: number, z: number, color: number = 0x00f0ff) {
    this.empRing.position.set(x, 0.1, z);
    this.empRing.scale.set(1, 1, 1);
    (this.empRing.material as THREE.MeshBasicMaterial).color.setHex(color);
    (this.empRing.material as THREE.MeshBasicMaterial).opacity = 0.85;
    this.empRingActive = true;
    this.empRingProgress = 0;
  }

  public update(dt: number) {
    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = this.geometry.attributes.color as THREE.BufferAttribute;
    const sizeAttr = this.geometry.attributes.size as THREE.BufferAttribute;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.pool[i];
      if (p.active) {
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          this.positions[i * 3 + 1] = -100;
          this.colors[i * 3] = 0;
          this.colors[i * 3 + 1] = 0;
          this.colors[i * 3 + 2] = 0;
          this.sizes[i] = 0;
          continue;
        }

        // Apply aerodynamic drag for snappy explosive deceleration
        const dragFactor = Math.exp(-p.drag * dt);
        p.vx *= dragFactor;
        p.vz *= dragFactor;

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.vy -= 13.0 * dt; // snappy gravity

        // Bounce on ground
        if (p.y < 0.05) {
          p.y = 0.05;
          p.vy *= -0.32;
          p.vx *= 0.75;
          p.vz *= 0.75;
        }

        const progress = Math.max(0, p.life / p.maxLife);
        this.positions[i * 3] = p.x;
        this.positions[i * 3 + 1] = p.y;
        this.positions[i * 3 + 2] = p.z;

        // Vivid gamma falloff: maintains high saturation and radiance before clean snap fade
        const intensity = Math.pow(progress, 0.7);
        this.colors[i * 3] = p.r * intensity;
        this.colors[i * 3 + 1] = p.g * intensity;
        this.colors[i * 3 + 2] = p.b * intensity;

        this.sizes[i] = p.size * progress;
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;

    // Update EMP shockwave
    if (this.empRingActive) {
      this.empRingProgress += dt * 2.2;
      const s = 1 + this.empRingProgress * 30;
      this.empRing.scale.set(s, s, s);
      const ringMat = this.empRing.material as THREE.MeshBasicMaterial;
      ringMat.opacity = Math.max(0, 0.85 * (1 - this.empRingProgress));

      if (this.empRingProgress >= 1.0) {
        this.empRingActive = false;
        ringMat.opacity = 0;
      }
    }
  }

  public getActiveCount(): number {
    return this.pool.reduce((acc, p) => acc + (p.active ? 1 : 0), 0);
  }
}
