import * as THREE from 'three';
import { RadarObstacle } from './types';

export interface MapDefinition {
  tier: number;
  name: string;
  subtitle: string;
  hazardLevel: string;
  accentColor: number;
  floorHex: string;
  bgColor: number;
  description: string;
}

export const MAP_DEFINITIONS: Record<number, MapDefinition> = {
  1: {
    tier: 1,
    name: 'NEON CITADEL FOUNDRY',
    subtitle: 'Waves 01-10 // Enclosed Perimeter',
    hazardLevel: 'STANDARD PROTOCOL',
    accentColor: 0x00f0ff,
    floorHex: '#00f0ff',
    bgColor: 0x06080e,
    description: 'Enclosed perimeter defense sector. Clear Level 10 to breach the perimeter forcefield and unlock the open metropolis.',
  },
  2: {
    tier: 2,
    name: 'OPEN SKYLINE METROPOLIS',
    subtitle: 'Waves 11-20 // Perimeter Breached // Unbounded',
    hazardLevel: 'RUTHLESS // HIGH THREAT',
    accentColor: 0x38bdf8,
    floorHex: '#0284c7',
    bgColor: 0x030712,
    description: 'Perimeter barriers disengaged! Roam freely through skyscraper complexes, alley choke-points, and high-speed Shredder swarms.',
  },
  3: {
    tier: 3,
    name: 'EXPANSIVE MAGMA CRUCIBLE',
    subtitle: 'Waves 21-30 // Open Geothermal Plain',
    hazardLevel: 'EXTREME // MORTAR ARTILLERY',
    accentColor: 0xf97316,
    floorHex: '#ea580c',
    bgColor: 0x140505,
    description: 'Geothermal smelting silos and incinerator towers across an open lava plain under relentless mortar bombardments.',
  },
  4: {
    tier: 4,
    name: 'VOID RESEARCH FACILITY',
    subtitle: 'Waves 31-40 // Singularity Plateau',
    hazardLevel: 'CRITICAL // PHASE STALKERS',
    accentColor: 0xa855f7,
    floorHex: '#9333ea',
    bgColor: 0x0b0217,
    description: 'Dark-matter graviton monoliths and dimensional phase hunters that blink through cover across open void fields.',
  },
  5: {
    tier: 5,
    name: 'TITAN ORBITAL APEX STATION',
    subtitle: 'Waves 41+ // Boundless Deep-Space Platform',
    hazardLevel: 'MAXIMUM APEX // OVERDRIVE',
    accentColor: 0xfacc15,
    floorHex: '#eab308',
    bgColor: 0x020617,
    description: 'Massive orbital defense domes and radar arrays besieged by elite rogue mechanical legions.',
  },
};

export function getMapForWave(wave: number): MapDefinition {
  const tier = Math.min(5, Math.floor((Math.max(1, wave) - 1) / 10) + 1);
  return MAP_DEFINITIONS[tier] || MAP_DEFINITIONS[1];
}

export interface ObstacleEntity {
  id: string;
  type: 'building' | 'bunker' | 'silo' | 'monolith' | 'barrier';
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  radius: number;
  shape: 'box' | 'cylinder';
  group: THREE.Group;
}

export class ObstacleManager {
  private scene: THREE.Scene;
  private containerGroup: THREE.Group;
  public obstacles: ObstacleEntity[] = [];
  public currentTier: number = 0;

  // Shared reusable materials
  private matBuildingDark: THREE.MeshStandardMaterial;
  private matBuildingTrim: THREE.MeshStandardMaterial;
  private matWindowGlow: THREE.MeshBasicMaterial;
  private matRoofAccent: THREE.MeshBasicMaterial;
  private matBarrierGlow: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.containerGroup = new THREE.Group();
    this.scene.add(this.containerGroup);

    this.matBuildingDark = new THREE.MeshStandardMaterial({
      color: 0x0d131f,
      metalness: 0.85,
      roughness: 0.35,
    });
    this.matBuildingTrim = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.2,
    });
    this.matWindowGlow = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
    });
    this.matRoofAccent = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
    });
    this.matBarrierGlow = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.45,
      wireframe: true,
    });
  }

  /**
   * Builds 3D obstacles and buildings.
   * STRICT REQUIREMENT: Buildings and obstacles ONLY appear after Level 10 is cleared (Tier >= 2).
   */
  public setMapTier(tier: number, accentColor: number) {
    if (this.currentTier === tier && (tier === 1 || this.obstacles.length > 0)) return;
    this.currentTier = tier;

    // Clear previous obstacles
    this.clear();

    // Update material accent colors
    this.matWindowGlow.color.setHex(accentColor);
    this.matRoofAccent.color.setHex(accentColor);
    this.matBarrierGlow.color.setHex(accentColor);

    if (tier === 1) {
      // --- MAP 1: NEON FOUNDRY (WAVES 1-10) ---
      // Level 10 is NOT cleared yet: NO obstacles or buildings appear!
      // Enclosed arena is clean and open.
      return;
    } else if (tier === 2) {
      // --- MAP 2: OPEN SKYLINE METROPOLIS (WAVES 11-20, LEVEL 10 CLEARED!) ---
      // Boundary is removed and player plays freely! Buildings & obstacles now appear.
      // Inner city skyscrapers & tactical outposts
      this.createSkyscraperBuilding('sky_1', -14, -12, 5.5, 5.5, 12.0, accentColor);
      this.createSkyscraperBuilding('sky_2', 14, -12, 5.5, 5.5, 10.0, accentColor);
      this.createSkyscraperBuilding('sky_3', -14, 12, 5.5, 5.5, 11.0, accentColor);
      this.createSkyscraperBuilding('sky_4', 14, 12, 5.5, 5.5, 13.0, accentColor);

      // Alley barrier walls & street transformers
      this.createBarrierWall('barr_1', 0, -9, 5.5, 1.8, 2.4, accentColor);
      this.createBarrierWall('barr_2', 0, 9, 5.5, 1.8, 2.4, accentColor);
      this.createPowerTransformer('relay_1', -16, 0, 2.2, 5.2, accentColor);
      this.createPowerTransformer('relay_2', 16, 0, 2.2, 5.2, accentColor);

      // Extended Outer Metropolis Skyscraper Blocks (Explorable in boundless open arena)
      this.createSkyscraperBuilding('sky_out_1', -34, -28, 7.0, 7.0, 16.0, accentColor);
      this.createSkyscraperBuilding('sky_out_2', 34, -28, 7.0, 7.0, 15.0, accentColor);
      this.createSkyscraperBuilding('sky_out_3', -34, 28, 7.0, 7.0, 17.0, accentColor);
      this.createSkyscraperBuilding('sky_out_4', 34, 28, 7.0, 7.0, 14.0, accentColor);
      this.createBunker('bunker_out_1', 0, -36, 6.0, 4.0, 3.5, accentColor);
      this.createBunker('bunker_out_2', 0, 36, 6.0, 4.0, 3.5, accentColor);
      this.createBunker('bunker_out_3', -40, 0, 5.0, 4.5, 3.5, accentColor);
      this.createBunker('bunker_out_4', 40, 0, 5.0, 4.5, 3.5, accentColor);
    } else if (tier === 3) {
      // --- MAP 3: EXPANSIVE MAGMA CRUCIBLE (WAVES 21-30) ---
      // Smelting Silos, Industrial Blast Bunkers & Thermal Flumes
      this.createSmeltingSilo('silo_1', -13, -13, 2.8, 9.0, accentColor);
      this.createSmeltingSilo('silo_2', 13, -13, 2.8, 9.0, accentColor);
      this.createSmeltingSilo('silo_3', -13, 13, 2.8, 9.0, accentColor);
      this.createSmeltingSilo('silo_4', 13, 13, 2.8, 9.0, accentColor);

      this.createBunker('blast_1', 0, -14, 6.5, 3.5, 3.6, accentColor);
      this.createBunker('blast_2', 0, 14, 6.5, 3.5, 3.6, accentColor);
      this.createBarrierWall('therm_1', -15, 0, 2.2, 5.5, 2.8, accentColor);
      this.createBarrierWall('therm_2', 15, 0, 2.2, 5.5, 2.8, accentColor);

      // Outer geothermal smelting arrays
      this.createSmeltingSilo('silo_out_1', -32, -30, 3.4, 11.0, accentColor);
      this.createSmeltingSilo('silo_out_2', 32, -30, 3.4, 11.0, accentColor);
      this.createSmeltingSilo('silo_out_3', -32, 30, 3.4, 11.0, accentColor);
      this.createSmeltingSilo('silo_out_4', 32, 30, 3.4, 11.0, accentColor);
      this.createBunker('blast_out_1', -38, 0, 6.0, 4.0, 3.8, accentColor);
      this.createBunker('blast_out_2', 48, 0, 6.0, 4.0, 3.8, accentColor);
    } else if (tier === 4) {
      // --- MAP 4: VOID RESEARCH: SECTOR 30 ---
      // Graviton Monoliths + Quantum Cubes + Singularity Pylons
      this.createGravitonMonolith('mono_1', -13, -12, 4.2, 4.2, 11.5, accentColor);
      this.createGravitonMonolith('mono_2', 13, -12, 4.2, 4.2, 11.5, accentColor);
      this.createGravitonMonolith('mono_3', -13, 12, 4.2, 4.2, 11.5, accentColor);
      this.createGravitonMonolith('mono_4', 13, 12, 4.2, 4.2, 11.5, accentColor);

      this.createBunker('cube_1', -9, 0, 3.8, 3.8, 3.8, accentColor);
      this.createBunker('cube_2', 9, 0, 3.8, 3.8, 3.8, accentColor);
      this.createPowerTransformer('sing_1', 0, -15, 2.2, 6.0, accentColor);
      this.createPowerTransformer('sing_2', 0, 15, 2.2, 6.0, accentColor);

      // Outer Graviton Monoliths
      this.createGravitonMonolith('mono_out_1', -35, -28, 5.0, 5.0, 14.0, accentColor);
      this.createGravitonMonolith('mono_out_2', 35, -28, 5.0, 5.0, 14.0, accentColor);
      this.createGravitonMonolith('mono_out_3', -35, 28, 5.0, 5.0, 14.0, accentColor);
      this.createGravitonMonolith('mono_out_4', 35, 28, 5.0, 5.0, 14.0, accentColor);
    } else {
      // --- MAP 5: TITAN ORBITAL APEX: SECTOR 40+ ---
      // Massive Radar Domes & Communication Towers + Ion Fortress Bunkers
      this.createSmeltingSilo('radar_1', -14, -13, 3.2, 9.5, accentColor);
      this.createSmeltingSilo('radar_2', 14, -13, 3.2, 9.5, accentColor);
      this.createSmeltingSilo('radar_3', -14, 13, 3.2, 9.5, accentColor);
      this.createSmeltingSilo('radar_4', 14, 13, 3.2, 9.5, accentColor);

      this.createBunker('ion_1', -15, 0, 4.8, 3.8, 3.4, accentColor);
      this.createBunker('ion_2', 15, 0, 4.8, 3.8, 3.4, accentColor);
      this.createBarrierWall('array_1', 0, -14, 6.5, 2.2, 2.8, accentColor);
      this.createBarrierWall('array_2', 0, 14, 6.5, 2.2, 2.8, accentColor);

      this.createSmeltingSilo('radar_out_1', -36, -30, 4.0, 12.0, accentColor);
      this.createSmeltingSilo('radar_out_2', 36, -30, 4.0, 12.0, accentColor);
      this.createBunker('ion_out_1', 0, -38, 7.0, 4.5, 4.0, accentColor);
    }
  }

  // --- Building Generators ---

  private createSkyscraperBuilding(
    id: string,
    x: number,
    z: number,
    width: number,
    depth: number,
    height: number,
    accentColor: number
  ) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // 1. Primary Building Tower
    const bodyGeo = new THREE.BoxGeometry(width, height, depth);
    const body = new THREE.Mesh(bodyGeo, this.matBuildingDark);
    body.position.y = height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // 2. Neon Window Stripes / Arrays on 4 facades
    const winMat = new THREE.MeshBasicMaterial({ color: accentColor, transparent: true, opacity: 0.85 });
    const numBands = Math.floor(height / 2.2);
    for (let b = 1; b <= numBands; b++) {
      const bandY = b * 2.0;
      // Front and Back strips
      const bandGeoFB = new THREE.BoxGeometry(width * 0.85, 0.45, depth + 0.08);
      const bandFB = new THREE.Mesh(bandGeoFB, winMat);
      bandFB.position.y = bandY;
      group.add(bandFB);

      // Left and Right strips
      const bandGeoLR = new THREE.BoxGeometry(width + 0.08, 0.45, depth * 0.85);
      const bandLR = new THREE.Mesh(bandGeoLR, winMat);
      bandLR.position.y = bandY;
      group.add(bandLR);
    }

    // 3. Roof Helipad & Antenna Mast
    const roofBaseGeo = new THREE.BoxGeometry(width * 0.7, 0.8, depth * 0.7);
    const roofBase = new THREE.Mesh(roofBaseGeo, this.matBuildingTrim);
    roofBase.position.y = height + 0.4;
    group.add(roofBase);

    // Roof edge glow ring
    const roofRingGeo = new THREE.RingGeometry(width * 0.25, width * 0.28, 16);
    roofRingGeo.rotateX(-Math.PI / 2);
    const roofRing = new THREE.Mesh(roofRingGeo, new THREE.MeshBasicMaterial({ color: accentColor, side: THREE.DoubleSide }));
    roofRing.position.y = height + 0.85;
    group.add(roofRing);

    // Communication Antenna Mast with blinking aviation light
    const antGeo = new THREE.CylinderGeometry(0.08, 0.15, 3.5, 6);
    const ant = new THREE.Mesh(antGeo, this.matBuildingTrim);
    ant.position.set(0, height + 2.5, 0);
    group.add(ant);

    const beaconGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const beacon = new THREE.Mesh(beaconGeo, new THREE.MeshBasicMaterial({ color: 0xff2a44 }));
    beacon.position.set(0, height + 4.3, 0);
    group.add(beacon);

    this.containerGroup.add(group);
    this.obstacles.push({
      id,
      type: 'building',
      x,
      z,
      width,
      depth,
      height,
      radius: Math.hypot(width, depth) / 2,
      shape: 'box',
      group,
    });
  }

  private createBunker(
    id: string,
    x: number,
    z: number,
    width: number,
    depth: number,
    height: number,
    accentColor: number
  ) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Sloped reinforced bunker chassis
    const bodyGeo = new THREE.BoxGeometry(width, height, depth);
    const body = new THREE.Mesh(bodyGeo, this.matBuildingDark);
    body.position.y = height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Top armor slab
    const roofGeo = new THREE.BoxGeometry(width * 1.08, 0.5, depth * 1.08);
    const roof = new THREE.Mesh(roofGeo, this.matBuildingTrim);
    roof.position.y = height + 0.25;
    roof.castShadow = true;
    group.add(roof);

    // Neon trim line
    const trimMat = new THREE.MeshBasicMaterial({ color: accentColor });
    const trimGeo = new THREE.BoxGeometry(width + 0.05, 0.25, depth + 0.05);
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.y = height * 0.75;
    group.add(trim);

    // Warning Beacon on roof
    const bGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.8, 8);
    const bMesh = new THREE.Mesh(bGeo, trimMat);
    bMesh.position.y = height + 0.8;
    group.add(bMesh);

    this.containerGroup.add(group);
    this.obstacles.push({
      id,
      type: 'bunker',
      x,
      z,
      width,
      depth,
      height,
      radius: Math.hypot(width, depth) / 2,
      shape: 'box',
      group,
    });
  }

  private createPowerTransformer(
    id: string,
    x: number,
    z: number,
    radius: number,
    height: number,
    accentColor: number
  ) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Cylindrical tower column
    const colGeo = new THREE.CylinderGeometry(radius * 0.75, radius, height, 12);
    const col = new THREE.Mesh(colGeo, this.matBuildingDark);
    col.position.y = height / 2;
    col.castShadow = true;
    col.receiveShadow = true;
    group.add(col);

    // Pulsing energy rings
    const ringMat = new THREE.MeshBasicMaterial({ color: accentColor });
    const r1 = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.95, 0.12, 8, 20), ringMat);
    r1.rotateX(Math.PI / 2);
    r1.position.y = height * 0.4;
    group.add(r1);

    const r2 = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.85, 0.12, 8, 20), ringMat);
    r2.rotateX(Math.PI / 2);
    r2.position.y = height * 0.75;
    group.add(r2);

    // Spire electrode
    const spireGeo = new THREE.ConeGeometry(radius * 0.45, 1.4, 8);
    const spire = new THREE.Mesh(spireGeo, ringMat);
    spire.position.y = height + 0.7;
    group.add(spire);

    this.containerGroup.add(group);
    this.obstacles.push({
      id,
      type: 'silo',
      x,
      z,
      width: radius * 2,
      depth: radius * 2,
      height,
      radius,
      shape: 'cylinder',
      group,
    });
  }

  private createSmeltingSilo(
    id: string,
    x: number,
    z: number,
    radius: number,
    height: number,
    accentColor: number
  ) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Heavy reinforced smelting silo
    const colGeo = new THREE.CylinderGeometry(radius * 0.85, radius, height, 12);
    const col = new THREE.Mesh(colGeo, this.matBuildingDark);
    col.position.y = height / 2;
    col.castShadow = true;
    col.receiveShadow = true;
    group.add(col);

    // Glowing thermal heat grates
    const grateMat = new THREE.MeshBasicMaterial({ color: accentColor });
    const grateGeo = new THREE.CylinderGeometry(radius * 0.88, radius * 0.92, 0.6, 12, 1, true);
    const grate = new THREE.Mesh(grateGeo, grateMat);
    grate.position.y = height * 0.55;
    group.add(grate);

    // Exhaust crown
    const crownGeo = new THREE.TorusGeometry(radius * 0.9, 0.22, 8, 20);
    crownGeo.rotateX(Math.PI / 2);
    const crown = new THREE.Mesh(crownGeo, this.matBuildingTrim);
    crown.position.y = height;
    group.add(crown);

    this.containerGroup.add(group);
    this.obstacles.push({
      id,
      type: 'silo',
      x,
      z,
      width: radius * 2,
      depth: radius * 2,
      height,
      radius,
      shape: 'cylinder',
      group,
    });
  }

  private createGravitonMonolith(
    id: string,
    x: number,
    z: number,
    width: number,
    depth: number,
    height: number,
    accentColor: number
  ) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Tapered dark-matter monolith
    const colGeo = new THREE.BoxGeometry(width * 0.75, height, depth * 0.75);
    const col = new THREE.Mesh(colGeo, this.matBuildingDark);
    col.position.y = height / 2;
    col.castShadow = true;
    col.receiveShadow = true;
    group.add(col);

    // Floating singularity ring around waist
    const ringGeo = new THREE.TorusGeometry(width * 0.65, 0.16, 8, 24);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: accentColor });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = height * 0.5;
    group.add(ring);

    // Glowing vertical void channel
    const chanGeo = new THREE.BoxGeometry(0.3, height * 0.85, depth * 0.78);
    const chan = new THREE.Mesh(chanGeo, ringMat);
    chan.position.y = height / 2;
    group.add(chan);

    this.containerGroup.add(group);
    this.obstacles.push({
      id,
      type: 'monolith',
      x,
      z,
      width,
      depth,
      height,
      radius: Math.hypot(width, depth) / 2,
      shape: 'box',
      group,
    });
  }

  private createBarrierWall(
    id: string,
    x: number,
    z: number,
    width: number,
    depth: number,
    height: number,
    accentColor: number
  ) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Solid concrete base
    const baseGeo = new THREE.BoxGeometry(width, height * 0.5, depth);
    const base = new THREE.Mesh(baseGeo, this.matBuildingDark);
    base.position.y = height * 0.25;
    base.castShadow = true;
    group.add(base);

    // Holographic energy barrier top
    const topGeo = new THREE.BoxGeometry(width * 0.95, height * 0.55, depth * 0.3);
    const topMat = new THREE.MeshBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = height * 0.75;
    group.add(top);

    this.containerGroup.add(group);
    this.obstacles.push({
      id,
      type: 'barrier',
      x,
      z,
      width,
      depth,
      height,
      radius: Math.hypot(width, depth) / 2,
      shape: 'box',
      group,
    });
  }

  // --- Collision Detection & Resolution ---

  /**
   * Resolves collision between an entity (player or enemy) and all obstacles.
   * If collision occurs, pushes entity cleanly along the penetration normal.
   */
  public resolveEntityCollision(
    px: number,
    pz: number,
    radius: number
  ): { x: number; z: number; collided: boolean } {
    let resolvedX = px;
    let resolvedZ = pz;
    let anyCollision = false;

    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];

      if (obs.shape === 'cylinder') {
        const dx = resolvedX - obs.x;
        const dz = resolvedZ - obs.z;
        const dist = Math.hypot(dx, dz);
        const minDist = obs.radius + radius;

        if (dist < minDist) {
          anyCollision = true;
          const pushLen = minDist - dist;
          const normX = dist > 0.001 ? dx / dist : 1;
          const normZ = dist > 0.001 ? dz / dist : 0;
          resolvedX += normX * pushLen;
          resolvedZ += normZ * pushLen;
        }
      } else {
        // Box collision: find closest point on rectangle
        const halfW = obs.width / 2;
        const halfD = obs.depth / 2;

        const closestX = Math.max(obs.x - halfW, Math.min(resolvedX, obs.x + halfW));
        const closestZ = Math.max(obs.z - halfD, Math.min(resolvedZ, obs.z + halfD));

        const dx = resolvedX - closestX;
        const dz = resolvedZ - closestZ;
        const dist = Math.hypot(dx, dz);

        if (dist < radius) {
          anyCollision = true;
          if (dist > 0.001) {
            const pushLen = radius - dist;
            resolvedX += (dx / dist) * pushLen;
            resolvedZ += (dz / dist) * pushLen;
          } else {
            // Entity center is exactly inside box; push toward closest edge
            const distLeft = resolvedX - (obs.x - halfW);
            const distRight = obs.x + halfW - resolvedX;
            const distBottom = resolvedZ - (obs.z - halfD);
            const distTop = obs.z + halfD - resolvedZ;

            const minDistEdge = Math.min(distLeft, distRight, distBottom, distTop);
            if (minDistEdge === distLeft) resolvedX = obs.x - halfW - radius;
            else if (minDistEdge === distRight) resolvedX = obs.x + halfW + radius;
            else if (minDistEdge === distBottom) resolvedZ = obs.z - halfD - radius;
            else resolvedZ = obs.z + halfD + radius;
          }
        }
      }
    }

    return { x: resolvedX, z: resolvedZ, collided: anyCollision };
  }

  /**
   * Checks if a projectile hits any obstacle in the map
   */
  public checkProjectileHit(
    px: number,
    pz: number,
    pRadius: number
  ): { hit: boolean; hitX: number; hitZ: number } {
    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];

      if (obs.shape === 'cylinder') {
        const dx = px - obs.x;
        const dz = pz - obs.z;
        const dist = Math.hypot(dx, dz);
        if (dist <= obs.radius + pRadius) {
          const norm = dist || 1;
          return { hit: true, hitX: obs.x + (dx / norm) * obs.radius, hitZ: obs.z + (dz / norm) * obs.radius };
        }
      } else {
        const halfW = obs.width / 2;
        const halfD = obs.depth / 2;
        const closestX = Math.max(obs.x - halfW, Math.min(px, obs.x + halfW));
        const closestZ = Math.max(obs.z - halfD, Math.min(pz, obs.z + halfD));

        const dist = Math.hypot(px - closestX, pz - closestZ);
        if (dist <= pRadius) {
          return { hit: true, hitX: closestX, hitZ: closestZ };
        }
      }
    }
    return { hit: false, hitX: 0, hitZ: 0 };
  }

  /**
   * Returns simplified obstacle descriptors for HUD circular radar mini-map
   */
  public getRadarObstacles(): RadarObstacle[] {
    return this.obstacles.map((o) => ({
      x: o.x,
      z: o.z,
      width: o.width,
      depth: o.depth,
      radius: o.radius,
      shape: o.shape,
      type: o.type,
    }));
  }

  public clear() {
    while (this.containerGroup.children.length > 0) {
      const child = this.containerGroup.children[0];
      this.containerGroup.remove(child);
    }
    this.obstacles = [];
  }
}
