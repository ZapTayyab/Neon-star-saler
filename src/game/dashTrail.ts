import * as THREE from 'three';

interface AfterimageGhost {
  group: THREE.Group;
  materials: THREE.MeshBasicMaterial[];
  active: boolean;
  age: number;
  maxLife: number;
  vx: number;
  vz: number;
}

interface RibbonPoint {
  x: number;
  y: number;
  z: number;
  time: number;
  alpha: number;
}

interface MachRing {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  active: boolean;
  age: number;
  maxLife: number;
  initialScale: number;
  targetScale: number;
}

const MAX_AFTERIMAGES = 14;
const MAX_RIBBON_POINTS = 44;
const MAX_MACH_RINGS = 8;

/**
 * Procedural holographic ghost silhouette matching the player combat hover-mech
 */
function buildMechGhostModel(matHull: THREE.MeshBasicMaterial, matWire: THREE.MeshBasicMaterial): THREE.Group {
  const group = new THREE.Group();

  // 1. Angular Fuselage Hull
  const hullShape = new THREE.Shape();
  hullShape.moveTo(0, 1.2);
  hullShape.lineTo(0.5, 0.4);
  hullShape.lineTo(0.7, -0.6);
  hullShape.lineTo(0.4, -1.0);
  hullShape.lineTo(-0.4, -1.0);
  hullShape.lineTo(-0.7, -0.6);
  hullShape.lineTo(-0.5, 0.4);
  hullShape.closePath();

  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 0.32,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.06,
    bevelThickness: 0.06,
  });
  hullGeo.rotateX(Math.PI / 2);
  hullGeo.center();

  const hullMesh = new THREE.Mesh(hullGeo, matHull);
  hullMesh.position.y = 0.55;
  const hullWire = new THREE.Mesh(hullGeo, matWire);
  hullWire.position.y = 0.55;
  group.add(hullMesh, hullWire);

  // 2. Cockpit Canopy
  const canopyGeo = new THREE.ConeGeometry(0.32, 0.9, 5);
  canopyGeo.rotateX(Math.PI / 2);
  canopyGeo.scale(1, 0.5, 1);
  const canopyMesh = new THREE.Mesh(canopyGeo, matWire);
  canopyMesh.position.set(0, 0.75, -0.15);
  group.add(canopyMesh);

  // 3. Swept-Back Wings
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(0.9, -0.4);
  wingShape.lineTo(1.1, -0.9);
  wingShape.lineTo(0.2, -0.8);
  wingShape.closePath();

  const wingGeoL = new THREE.ExtrudeGeometry(wingShape, { depth: 0.05, bevelEnabled: false });
  wingGeoL.rotateX(Math.PI / 2);
  const wingMeshL = new THREE.Mesh(wingGeoL, matHull);
  wingMeshL.position.set(0.4, 0.52, 0.2);
  const wingWireL = new THREE.Mesh(wingGeoL, matWire);
  wingWireL.position.set(0.4, 0.52, 0.2);
  group.add(wingMeshL, wingWireL);

  const wingGeoR = wingGeoL.clone();
  wingGeoR.scale(-1, 1, 1);
  const wingMeshR = new THREE.Mesh(wingGeoR, matHull);
  wingMeshR.position.set(-0.4, 0.52, 0.2);
  const wingWireR = new THREE.Mesh(wingGeoR, matWire);
  wingWireR.position.set(-0.4, 0.52, 0.2);
  group.add(wingMeshR, wingWireR);

  // 4. Twin Cannons
  const cannonGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.9, 6);
  cannonGeo.rotateX(Math.PI / 2);
  const cL = new THREE.Mesh(cannonGeo, matWire);
  cL.position.set(0.65, 0.52, -0.2);
  const cR = new THREE.Mesh(cannonGeo, matWire);
  cR.position.set(-0.65, 0.52, -0.2);
  group.add(cL, cR);

  // 5. Twin Thruster Nacelles
  const thrusterGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.45, 6);
  thrusterGeo.rotateX(Math.PI / 2);
  const tL = new THREE.Mesh(thrusterGeo, matHull);
  tL.position.set(0.35, 0.55, 0.85);
  const tR = new THREE.Mesh(thrusterGeo, matHull);
  tR.position.set(-0.35, 0.55, 0.85);
  group.add(tL, tR);

  // 6. Glowing Thruster Cone Plumes
  const flameGeo = new THREE.ConeGeometry(0.14, 0.7, 6);
  flameGeo.rotateX(-Math.PI / 2);
  const fL = new THREE.Mesh(flameGeo, matWire);
  fL.position.set(0.35, 0.55, 1.3);
  const fR = new THREE.Mesh(flameGeo, matWire);
  fR.position.set(-0.35, 0.55, 1.3);
  group.add(fL, fR);

  // 7. Core reactor
  const coreGeo = new THREE.SphereGeometry(0.18, 8, 8);
  const core = new THREE.Mesh(coreGeo, matWire);
  core.position.set(0, 0.65, 0.1);
  group.add(core);

  return group;
}

/**
 * High-performance Neon Dash Trail & Holographic Kinetic Afterimage System
 * Provides multi-layered kinetic movement visualization when the dash ability is used:
 * 1. Volumetric 3D Cross-Ribbon Streamers trailing from twin thruster nacelles
 * 2. Central ion slipstream ribbon along the chassis spine
 * 3. Supersonic Mach Vapor Rings (shockwave displacement rings)
 * 4. Faithful holographic Chrono-Ghost afterimages left along the trajectory
 * 5. Ground-skimming glowing neon repulsor plasma wake on the arena surface
 * 6. Dynamic neon point-light thruster illumination
 */
export class DashTrailManager {
  private scene: THREE.Scene;

  // Afterimage Chrono-Ghost pool
  private ghosts: AfterimageGhost[] = [];
  private ghostSpawnTimer: number = 0;
  private ghostInterval: number = 0.028; // Spawn a ghost every 28ms during dash

  // Supersonic Mach Rings pool
  private machRings: MachRing[] = [];
  private machRingSpawnTimer: number = 0;

  // Twin 3D Volumetric Cross-Ribbons (Left & Right Thrusters)
  // Cross-ribbon contains both horizontal and vertical blades to guarantee volume from any camera angle
  private ribbonGeoL: THREE.BufferGeometry;
  private ribbonGeoR: THREE.BufferGeometry;
  private ribbonGeoCenter: THREE.BufferGeometry;

  private ribbonMeshL: THREE.Mesh;
  private ribbonMeshR: THREE.Mesh;
  private ribbonMeshCenter: THREE.Mesh;

  private ribbonMatL: THREE.MeshBasicMaterial;
  private ribbonMatR: THREE.MeshBasicMaterial;
  private ribbonMatCenter: THREE.MeshBasicMaterial;

  private pointsL: RibbonPoint[] = [];
  private pointsR: RibbonPoint[] = [];
  private pointsCenter: RibbonPoint[] = [];

  // Ground Kinetic Plasma Wake (Floor-skimming glowing repulsor treads)
  private groundWakeGeometry: THREE.BufferGeometry;
  private groundWakeMesh: THREE.Mesh;
  private groundWakeMaterial: THREE.MeshBasicMaterial;
  private groundPoints: { x: number; z: number; width: number; life: number }[] = [];

  // Real-time Neon Thruster Dash Point Light
  private dashLight: THREE.PointLight;

  // Current Trail Color
  private currentColor: number = 0x00f0ff;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // --- 1. Holographic Chrono-Ghost Clones Pool ---
    for (let i = 0; i < MAX_AFTERIMAGES; i++) {
      const ghostMats: THREE.MeshBasicMaterial[] = [];

      // Hull translucent additive material
      const matHull = new THREE.MeshBasicMaterial({
        color: this.currentColor,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        wireframe: false,
      });
      ghostMats.push(matHull);

      // Edge wireframe radiant white/neon material
      const matWire = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        wireframe: true,
      });
      ghostMats.push(matWire);

      const group = buildMechGhostModel(matHull, matWire);
      group.visible = false;
      this.scene.add(group);

      this.ghosts.push({
        group,
        materials: ghostMats,
        active: false,
        age: 0,
        maxLife: 0.38,
        vx: 0,
        vz: 0,
      });
    }

    // --- 2. Supersonic Mach Shock Rings ---
    const ringGeo = new THREE.TorusGeometry(0.55, 0.042, 8, 28);
    for (let i = 0; i < MAX_MACH_RINGS; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: this.currentColor,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);

      this.machRings.push({
        mesh,
        material: mat,
        active: false,
        age: 0,
        maxLife: 0.26,
        initialScale: 0.8,
        targetScale: 2.8,
      });
    }

    // --- 3. Twin Volumetric Cross-Ribbons + Center Spine ---
    // A cross-ribbon uses 4 vertices per slice (2 for horizontal blade, 2 for vertical blade)
    // Vertices per slice = 4; total vertices = MAX_RIBBON_POINTS * 4
    const verticesPerSlice = 4;
    const totalVertices = MAX_RIBBON_POINTS * verticesPerSlice;
    const indexArray: number[] = [];

    // Indices for horizontal strip (verts 0, 1) and vertical strip (verts 2, 3)
    for (let i = 0; i < MAX_RIBBON_POINTS - 1; i++) {
      const baseCurr = i * verticesPerSlice;
      const baseNext = (i + 1) * verticesPerSlice;

      // Horizontal blade quad (0, 1)
      indexArray.push(baseCurr + 0, baseNext + 0, baseCurr + 1);
      indexArray.push(baseCurr + 1, baseNext + 0, baseNext + 1);

      // Vertical blade quad (2, 3)
      indexArray.push(baseCurr + 2, baseNext + 2, baseCurr + 3);
      indexArray.push(baseCurr + 3, baseNext + 2, baseNext + 3);
    }

    const indices = new Uint16Array(indexArray);

    // Left Ribbon
    this.ribbonGeoL = new THREE.BufferGeometry();
    this.ribbonGeoL.setAttribute('position', new THREE.BufferAttribute(new Float32Array(totalVertices * 3), 3));
    this.ribbonGeoL.setAttribute('color', new THREE.BufferAttribute(new Float32Array(totalVertices * 3), 3));
    this.ribbonGeoL.setIndex(new THREE.BufferAttribute(indices, 1));

    // Right Ribbon
    this.ribbonGeoR = new THREE.BufferGeometry();
    this.ribbonGeoR.setAttribute('position', new THREE.BufferAttribute(new Float32Array(totalVertices * 3), 3));
    this.ribbonGeoR.setAttribute('color', new THREE.BufferAttribute(new Float32Array(totalVertices * 3), 3));
    this.ribbonGeoR.setIndex(new THREE.BufferAttribute(indices, 1));

    // Center Spine Ribbon (flat 2-vert blade for smooth slipstream)
    const centerIndices: number[] = [];
    for (let i = 0; i < MAX_RIBBON_POINTS - 1; i++) {
      const b0 = i * 2;
      const b1 = (i + 1) * 2;
      centerIndices.push(b0, b1, b0 + 1);
      centerIndices.push(b0 + 1, b1, b1 + 1);
    }
    const centerTotalVerts = MAX_RIBBON_POINTS * 2;
    this.ribbonGeoCenter = new THREE.BufferGeometry();
    this.ribbonGeoCenter.setAttribute('position', new THREE.BufferAttribute(new Float32Array(centerTotalVerts * 3), 3));
    this.ribbonGeoCenter.setAttribute('color', new THREE.BufferAttribute(new Float32Array(centerTotalVerts * 3), 3));
    this.ribbonGeoCenter.setIndex(new THREE.BufferAttribute(new Uint16Array(centerIndices), 1));

    this.ribbonMatL = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.ribbonMatR = this.ribbonMatL.clone();
    this.ribbonMatCenter = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.ribbonMeshL = new THREE.Mesh(this.ribbonGeoL, this.ribbonMatL);
    this.ribbonMeshL.frustumCulled = false;
    this.scene.add(this.ribbonMeshL);

    this.ribbonMeshR = new THREE.Mesh(this.ribbonGeoR, this.ribbonMatR);
    this.ribbonMeshR.frustumCulled = false;
    this.scene.add(this.ribbonMeshR);

    this.ribbonMeshCenter = new THREE.Mesh(this.ribbonGeoCenter, this.ribbonMatCenter);
    this.ribbonMeshCenter.frustumCulled = false;
    this.scene.add(this.ribbonMeshCenter);

    // --- 4. Ground Kinetic Wake Ribbon ---
    const groundVertexCount = MAX_RIBBON_POINTS * 2;
    this.groundWakeGeometry = new THREE.BufferGeometry();
    this.groundWakeGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(groundVertexCount * 3), 3)
    );
    this.groundWakeGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(new Float32Array(groundVertexCount * 3), 3)
    );
    this.groundWakeGeometry.setIndex(new THREE.BufferAttribute(new Uint16Array(centerIndices), 1));

    this.groundWakeMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.groundWakeMesh = new THREE.Mesh(this.groundWakeGeometry, this.groundWakeMaterial);
    this.groundWakeMesh.frustumCulled = false;
    this.scene.add(this.groundWakeMesh);

    // --- 5. Dynamic Neon Thruster Dash Point Light ---
    this.dashLight = new THREE.PointLight(this.currentColor, 0, 9, 1.8);
    this.dashLight.position.set(0, 0.6, 0);
    this.scene.add(this.dashLight);
  }

  public setTrailColor(hex: number) {
    this.currentColor = hex;
    this.dashLight.color.setHex(hex);
    this.ghosts.forEach((g) => {
      g.materials[0].color.setHex(hex);
    });
    this.machRings.forEach((m) => {
      m.material.color.setHex(hex);
    });
  }

  /**
   * Instantly called when dash ability fires to create an explosive kinetic shockwave ring,
   * high-intensity thruster flare, and initial ghost.
   */
  public triggerBurst(
    x: number,
    y: number,
    z: number,
    rotY: number,
    rotX: number,
    rotZ: number,
    vx: number,
    vz: number
  ) {
    this.spawnMachRing(x, y + 0.1, z, vx, vz);
    this.spawnGhost(x, y, z, rotY, rotX, rotZ, vx, vz);
    this.dashLight.intensity = 3.6;
    this.dashLight.position.set(x, y, z);
  }

  /**
   * Spawns an expanding Supersonic Mach Shockwave Ring perpendicular to the dash travel vector
   */
  private spawnMachRing(x: number, y: number, z: number, vx: number, vz: number) {
    let ring = this.machRings.find((r) => !r.active);
    if (!ring) {
      ring = this.machRings.reduce((prev, curr) => (curr.age > prev.age ? curr : prev));
    }

    ring.active = true;
    ring.age = 0;
    ring.mesh.position.set(x, Math.max(0.2, y), z);

    // Orient ring facing the dash velocity direction
    const spd = Math.hypot(vx, vz);
    if (spd > 0.1) {
      ring.mesh.lookAt(x + vx, y, z + vz);
    } else {
      ring.mesh.rotation.set(0, 0, 0);
    }

    ring.mesh.scale.setScalar(ring.initialScale);
    ring.material.opacity = 0.95;
    ring.mesh.visible = true;
  }

  /**
   * Called on every frame.
   * If isDashing is true: records high-resolution cross-ribbon points, spawns ghosts, mach rings, and lights.
   * Smoothly fades and dissolves existing trail segments over time when dash finishes.
   */
  public update(
    dt: number,
    isDashing: boolean,
    playerX: number,
    playerY: number,
    playerZ: number,
    playerRot: number,
    playerPitch: number,
    playerRoll: number,
    thrusterLX: number,
    thrusterLY: number,
    thrusterLZ: number,
    thrusterRX: number,
    thrusterRY: number,
    thrusterRZ: number,
    dashVx: number,
    dashVz: number
  ) {
    // 1. Dashing State Handling
    if (isDashing) {
      // Dynamic thruster point light follows player
      this.dashLight.position.set((thrusterLX + thrusterRX) / 2, playerY, (thrusterLZ + thrusterRZ) / 2);
      this.dashLight.intensity = THREE.MathUtils.damp(this.dashLight.intensity, 3.2, 16, dt);

      // Chrono-Ghost Afterimages
      this.ghostSpawnTimer += dt;
      if (this.ghostSpawnTimer >= this.ghostInterval) {
        this.ghostSpawnTimer = 0;
        this.spawnGhost(playerX, playerY, playerZ, playerRot, playerPitch, playerRoll, dashVx, dashVz);
      }

      // Supersonic Mach Rings
      this.machRingSpawnTimer += dt;
      if (this.machRingSpawnTimer >= 0.055) {
        this.machRingSpawnTimer = 0;
        this.spawnMachRing(
          (thrusterLX + thrusterRX) / 2,
          playerY,
          (thrusterLZ + thrusterRZ) / 2,
          dashVx,
          dashVz
        );
      }

      // Record high-resolution ribbon points
      const now = performance.now();
      this.pointsL.unshift({
        x: thrusterLX,
        y: thrusterLY,
        z: thrusterLZ,
        time: now,
        alpha: 1.0,
      });
      this.pointsR.unshift({
        x: thrusterRX,
        y: thrusterRY,
        z: thrusterRZ,
        time: now,
        alpha: 1.0,
      });
      this.pointsCenter.unshift({
        x: (thrusterLX + thrusterRX) / 2,
        y: (thrusterLY + thrusterRY) / 2 + 0.04,
        z: (thrusterLZ + thrusterRZ) / 2,
        time: now,
        alpha: 1.0,
      });

      // Ground wake points (along center floor)
      this.groundPoints.unshift({
        x: (thrusterLX + thrusterRX) / 2,
        z: (thrusterLZ + thrusterRZ) / 2,
        width: 1.6,
        life: 1.0,
      });

      if (this.pointsL.length > MAX_RIBBON_POINTS) this.pointsL.pop();
      if (this.pointsR.length > MAX_RIBBON_POINTS) this.pointsR.pop();
      if (this.pointsCenter.length > MAX_RIBBON_POINTS) this.pointsCenter.pop();
      if (this.groundPoints.length > MAX_RIBBON_POINTS) this.groundPoints.pop();
    } else {
      this.ghostSpawnTimer = 0;
      this.machRingSpawnTimer = 0;
      this.dashLight.intensity = THREE.MathUtils.damp(this.dashLight.intensity, 0, 10, dt);

      // Smooth decay of existing ribbon points
      const fadeSpeed = dt * 3.8;
      for (let i = this.pointsL.length - 1; i >= 0; i--) {
        this.pointsL[i].alpha -= fadeSpeed;
        this.pointsR[i].alpha -= fadeSpeed;
        if (this.pointsL[i].alpha <= 0) {
          this.pointsL.splice(i, 1);
          this.pointsR.splice(i, 1);
        }
      }
      for (let i = this.pointsCenter.length - 1; i >= 0; i--) {
        this.pointsCenter[i].alpha -= fadeSpeed * 1.1;
        if (this.pointsCenter[i].alpha <= 0) {
          this.pointsCenter.splice(i, 1);
        }
      }
      for (let i = this.groundPoints.length - 1; i >= 0; i--) {
        this.groundPoints[i].life -= dt * 3.2;
        if (this.groundPoints[i].life <= 0) {
          this.groundPoints.splice(i, 1);
        }
      }
    }

    // 2. Update Mach Shock Rings
    for (let i = 0; i < this.machRings.length; i++) {
      const ring = this.machRings[i];
      if (ring.active) {
        ring.age += dt;
        const progress = ring.age / ring.maxLife;
        if (progress >= 1.0) {
          ring.active = false;
          ring.mesh.visible = false;
        } else {
          // Rapid expansion and quadratic fade
          const curScale = THREE.MathUtils.lerp(ring.initialScale, ring.targetScale, Math.pow(progress, 0.7));
          ring.mesh.scale.setScalar(curScale);
          ring.material.opacity = Math.pow(1.0 - progress, 1.4) * 0.95;
        }
      }
    }

    // 3. Update Holographic Ghosts
    for (let i = 0; i < this.ghosts.length; i++) {
      const g = this.ghosts[i];
      if (g.active) {
        g.age += dt;
        const progress = g.age / g.maxLife;
        if (progress >= 1.0) {
          g.active = false;
          g.group.visible = false;
        } else {
          // Quadratic fade out
          const fade = Math.pow(1.0 - progress, 1.5);
          g.materials[0].opacity = fade * 0.75;
          g.materials[1].opacity = fade * 0.98;

          // Gentle kinetic expansion and backward inertia lag
          const scaleMult = 1.0 + progress * 0.16;
          g.group.scale.set(scaleMult, scaleMult, scaleMult);
          g.group.position.x -= g.vx * dt * 0.08 * progress;
          g.group.position.z -= g.vz * dt * 0.08 * progress;
        }
      }
    }

    // 4. Rebuild 3D Volumetric Cross-Ribbons
    this.rebuildCrossRibbonMesh(this.ribbonGeoL, this.pointsL, 0.32);
    this.rebuildCrossRibbonMesh(this.ribbonGeoR, this.pointsR, 0.32);
    this.rebuildCenterSpineMesh(this.ribbonGeoCenter, this.pointsCenter, 0.22);
    this.rebuildGroundWakeMesh();
  }

  private spawnGhost(
    x: number,
    y: number,
    z: number,
    rotY: number,
    rotX: number,
    rotZ: number,
    vx: number,
    vz: number
  ) {
    let ghost = this.ghosts.find((g) => !g.active);
    if (!ghost) {
      ghost = this.ghosts.reduce((prev, curr) => (curr.age > prev.age ? curr : prev));
    }

    ghost.active = true;
    ghost.age = 0;
    ghost.vx = vx;
    ghost.vz = vz;
    ghost.group.position.set(x, y, z);
    ghost.group.rotation.set(rotX, rotY, rotZ);
    ghost.group.scale.set(1, 1, 1);
    ghost.materials[0].color.setHex(this.currentColor);
    ghost.materials[0].opacity = 0.75;
    ghost.materials[1].opacity = 0.98;
    ghost.group.visible = true;
  }

  /**
   * Rebuilds a volumetric 3D cross-ribbon mesh (horizontal + vertical intersecting blades)
   * This guarantees that from ANY camera perspective, the glowing trail has 3D body and thickness!
   */
  private rebuildCrossRibbonMesh(
    geometry: THREE.BufferGeometry,
    points: RibbonPoint[],
    baseHalfWidth: number
  ) {
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const colors = colAttr.array as Float32Array;

    const baseColor = new THREE.Color(this.currentColor);
    const whiteColor = new THREE.Color(0xffffff);
    const n = points.length;

    for (let i = 0; i < MAX_RIBBON_POINTS; i++) {
      const sliceBase = i * 4; // 4 vertices per slice
      const v0 = (sliceBase + 0) * 3;
      const v1 = (sliceBase + 1) * 3;
      const v2 = (sliceBase + 2) * 3;
      const v3 = (sliceBase + 3) * 3;

      if (i < n) {
        const pt = points[i];
        // Calculate tangent vector along the ribbon for perpendicular cross-blade offsets
        let tanX = 0;
        let tanZ = 1;
        if (i < n - 1) {
          tanX = points[i + 1].x - pt.x;
          tanZ = points[i + 1].z - pt.z;
        } else if (i > 0) {
          tanX = pt.x - points[i - 1].x;
          tanZ = pt.z - points[i - 1].z;
        }
        const len = Math.hypot(tanX, tanZ) || 1;
        // Side normal vector perpendicular to tangent on XZ plane
        const sideX = -tanZ / len;
        const sideZ = tanX / len;

        // Taper width from nozzle flare (1.2x) to fine tail tip (0.05x)
        const taperRatio = Math.max(0.04, 1.0 - i / n);
        const taper = Math.pow(taperRatio, 0.85);
        const wHoriz = baseHalfWidth * taper * 1.1;
        const wVert = baseHalfWidth * taper * 0.9;
        const fade = (pt.alpha ?? 1.0) * taper;

        // Vert 0 & 1: Horizontal Blade
        positions[v0] = pt.x - sideX * wHoriz;
        positions[v0 + 1] = pt.y;
        positions[v0 + 2] = pt.z - sideZ * wHoriz;

        positions[v1] = pt.x + sideX * wHoriz;
        positions[v1 + 1] = pt.y;
        positions[v1 + 2] = pt.z + sideZ * wHoriz;

        // Vert 2 & 3: Vertical Blade
        positions[v2] = pt.x;
        positions[v2 + 1] = pt.y + wVert;
        positions[v2 + 2] = pt.z;

        positions[v3] = pt.x;
        positions[v3 + 1] = pt.y - wVert;
        positions[v3 + 2] = pt.z;

        // Color gradient: nozzle is brilliant white-hot plasma, fading into saturated neon hue
        const c = i < 3 ? whiteColor : baseColor;
        const rVal = c.r * fade;
        const gVal = c.g * fade;
        const bVal = c.b * fade;

        for (let k = 0; k < 4; k++) {
          const cIdx = (sliceBase + k) * 3;
          colors[cIdx] = rVal;
          colors[cIdx + 1] = gVal;
          colors[cIdx + 2] = bVal;
        }
      } else {
        // Zero out unused slices below the arena
        for (let k = 0; k < 4; k++) {
          const pIdx = (sliceBase + k) * 3;
          positions[pIdx] = 0;
          positions[pIdx + 1] = -100;
          positions[pIdx + 2] = 0;
          colors[pIdx] = 0;
          colors[pIdx + 1] = 0;
          colors[pIdx + 2] = 0;
        }
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  /**
   * Rebuilds the central spine slipstream ribbon connecting both nacelle streams
   */
  private rebuildCenterSpineMesh(
    geometry: THREE.BufferGeometry,
    points: RibbonPoint[],
    baseHalfWidth: number
  ) {
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const colors = colAttr.array as Float32Array;

    const baseColor = new THREE.Color(this.currentColor);
    const n = points.length;

    for (let i = 0; i < MAX_RIBBON_POINTS; i++) {
      const idx = i * 2;
      const v0 = idx * 3;
      const v1 = (idx + 1) * 3;

      if (i < n) {
        const pt = points[i];
        let tanX = 0;
        let tanZ = 1;
        if (i < n - 1) {
          tanX = points[i + 1].x - pt.x;
          tanZ = points[i + 1].z - pt.z;
        } else if (i > 0) {
          tanX = pt.x - points[i - 1].x;
          tanZ = pt.z - points[i - 1].z;
        }
        const len = Math.hypot(tanX, tanZ) || 1;
        const sideX = -tanZ / len;
        const sideZ = tanX / len;

        const taper = Math.pow(Math.max(0.04, 1.0 - i / n), 0.9);
        const w = baseHalfWidth * taper;
        const fade = (pt.alpha ?? 1.0) * taper * 0.75;

        positions[v0] = pt.x - sideX * w;
        positions[v0 + 1] = pt.y;
        positions[v0 + 2] = pt.z - sideZ * w;

        positions[v1] = pt.x + sideX * w;
        positions[v1 + 1] = pt.y;
        positions[v1 + 2] = pt.z + sideZ * w;

        colors[v0] = baseColor.r * fade;
        colors[v0 + 1] = baseColor.g * fade;
        colors[v0 + 2] = baseColor.b * fade;

        colors[v1] = baseColor.r * fade;
        colors[v1 + 1] = baseColor.g * fade;
        colors[v1 + 2] = baseColor.b * fade;
      } else {
        positions[v0] = 0;
        positions[v0 + 1] = -100;
        positions[v0 + 2] = 0;
        positions[v1] = 0;
        positions[v1 + 1] = -100;
        positions[v1 + 2] = 0;

        colors[v0] = 0;
        colors[v0 + 1] = 0;
        colors[v0 + 2] = 0;
        colors[v1] = 0;
        colors[v1 + 1] = 0;
        colors[v1 + 2] = 0;
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  /**
   * Rebuilds the ground-skimming glowing plasma repulsor skid wake on the arena surface
   */
  private rebuildGroundWakeMesh() {
    const posAttr = this.groundWakeGeometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.groundWakeGeometry.getAttribute('color') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const colors = colAttr.array as Float32Array;

    const baseColor = new THREE.Color(this.currentColor);
    const n = this.groundPoints.length;

    for (let i = 0; i < MAX_RIBBON_POINTS; i++) {
      const idx = i * 2;
      const v0 = idx * 3;
      const v1 = (idx + 1) * 3;

      if (i < n) {
        const pt = this.groundPoints[i];
        const fade = pt.life;
        const w = (pt.width / 2) * Math.max(0.15, 1.0 - i / n);

        // Ground flat ribbon with slight elevation to prevent z-fighting (Y = 0.028)
        positions[v0] = pt.x - w;
        positions[v0 + 1] = 0.028;
        positions[v0 + 2] = pt.z;

        positions[v1] = pt.x + w;
        positions[v1 + 1] = 0.028;
        positions[v1 + 2] = pt.z;

        colors[v0] = baseColor.r * fade;
        colors[v0 + 1] = baseColor.g * fade;
        colors[v0 + 2] = baseColor.b * fade;

        colors[v1] = baseColor.r * fade;
        colors[v1 + 1] = baseColor.g * fade;
        colors[v1 + 2] = baseColor.b * fade;
      } else {
        positions[v0] = 0;
        positions[v0 + 1] = -100;
        positions[v0 + 2] = 0;
        positions[v1] = 0;
        positions[v1 + 1] = -100;
        positions[v1 + 2] = 0;

        colors[v0] = 0;
        colors[v0 + 1] = 0;
        colors[v0 + 2] = 0;
        colors[v1] = 0;
        colors[v1 + 1] = 0;
        colors[v1 + 2] = 0;
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  public clear() {
    this.ghosts.forEach((g) => {
      g.active = false;
      g.group.visible = false;
    });
    this.machRings.forEach((r) => {
      r.active = false;
      r.mesh.visible = false;
    });
    this.pointsL = [];
    this.pointsR = [];
    this.pointsCenter = [];
    this.groundPoints = [];
    this.dashLight.intensity = 0;
  }
}
