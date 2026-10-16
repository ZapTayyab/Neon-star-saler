import * as THREE from 'three';

// Shared materials for performance and hit flashes
export const materials = {
  playerHull: new THREE.MeshStandardMaterial({
    color: 0x1a2634,
    metalness: 0.85,
    roughness: 0.2,
  }),
  playerTrim: new THREE.MeshStandardMaterial({
    color: 0x00e5ff,
    metalness: 0.9,
    roughness: 0.15,
    emissive: 0x00e5ff,
    emissiveIntensity: 0.6,
  }),
  playerWings: new THREE.MeshStandardMaterial({
    color: 0x0f151c,
    metalness: 0.3,
    roughness: 0.7,
  }),
  playerCanopy: new THREE.MeshPhysicalMaterial({
    color: 0x00f0ff,
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.8,
    thickness: 0.5,
    emissive: 0x007799,
    emissiveIntensity: 0.4,
  }),
  playerGuns: new THREE.MeshStandardMaterial({
    color: 0x2e3846,
    metalness: 0.95,
    roughness: 0.1,
  }),
  thrusterFlame: new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.85,
  }),
  shadowMat: new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  }),
  // Enemy shared mats
  stalkerArmor: new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    metalness: 0.75,
    roughness: 0.25,
  }),
  stalkerEye: new THREE.MeshStandardMaterial({
    color: 0xff3b30,
    emissive: 0xff1100,
    emissiveIntensity: 2.0,
    roughness: 0.2,
  }),
  goliathArmor: new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.9,
    roughness: 0.45,
  }),
  goliathPlates: new THREE.MeshStandardMaterial({
    color: 0xeab308,
    metalness: 0.8,
    roughness: 0.3,
  }),
  goliathGuns: new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.95,
    roughness: 0.15,
  }),
  sniperArmor: new THREE.MeshStandardMaterial({
    color: 0x581c87,
    metalness: 0.8,
    roughness: 0.25,
  }),
  sniperGlow: new THREE.MeshStandardMaterial({
    color: 0xd946ef,
    emissive: 0xc026d3,
    emissiveIntensity: 2.2,
    roughness: 0.1,
  }),
  bossArmor: new THREE.MeshStandardMaterial({
    color: 0x1e1b4b,
    metalness: 0.9,
    roughness: 0.2,
  }),
  bossCore: new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0xe11d48,
    emissiveIntensity: 2.5,
  }),
  hitFlashMat: new THREE.MeshBasicMaterial({
    color: 0xffffff,
  }),
};

/**
 * Creates soft radial gradient shadow texture procedurally
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.3)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const shadowTexture = createContactShadowTexture();
const softShadowMaterial = new THREE.MeshBasicMaterial({
  map: shadowTexture,
  transparent: true,
  opacity: 0.6,
  depthWrite: false,
});

/**
 * Create Player Combat Hover-Mech (10-part procedural group)
 */
export function createPlayerMech(): {
  group: THREE.Group;
  thrusterL: THREE.Mesh;
  thrusterR: THREE.Mesh;
  barrelL: THREE.Mesh;
  barrelR: THREE.Mesh;
  core: THREE.Mesh;
} {
  const group = new THREE.Group();

  // 1. Primary Central Fuselage / Hull (Angular wedge shape)
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
    depth: 0.35,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.08,
    bevelThickness: 0.08,
  });
  hullGeo.rotateX(Math.PI / 2);
  hullGeo.center();
  const hullMesh = new THREE.Mesh(hullGeo, materials.playerHull);
  hullMesh.position.y = 0.55;
  hullMesh.castShadow = true;
  group.add(hullMesh);

  // 2. Cockpit Canopy (Aerodynamic glass canopy)
  const canopyGeo = new THREE.ConeGeometry(0.32, 0.9, 5);
  canopyGeo.rotateX(Math.PI / 2);
  canopyGeo.scale(1, 0.5, 1);
  const canopyMesh = new THREE.Mesh(canopyGeo, materials.playerCanopy);
  canopyMesh.position.set(0, 0.75, -0.15);
  group.add(canopyMesh);

  // 3 & 4. Twin Swept-Back Wings
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(0.9, -0.4);
  wingShape.lineTo(1.1, -0.9);
  wingShape.lineTo(0.2, -0.8);
  wingShape.closePath();

  const wingGeoL = new THREE.ExtrudeGeometry(wingShape, { depth: 0.06, bevelEnabled: false });
  wingGeoL.rotateX(Math.PI / 2);
  const wingMeshL = new THREE.Mesh(wingGeoL, materials.playerWings);
  wingMeshL.position.set(0.4, 0.52, 0.2);
  wingMeshL.castShadow = true;
  group.add(wingMeshL);

  const wingGeoR = wingGeoL.clone();
  wingGeoR.scale(-1, 1, 1);
  const wingMeshR = new THREE.Mesh(wingGeoR, materials.playerWings);
  wingMeshR.position.set(-0.4, 0.52, 0.2);
  wingMeshR.castShadow = true;
  group.add(wingMeshR);

  // 5 & 6. Twin Dual Plasma Cannons
  const cannonGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.9, 8);
  cannonGeo.rotateX(Math.PI / 2);
  const barrelL = new THREE.Mesh(cannonGeo, materials.playerGuns);
  barrelL.position.set(0.65, 0.52, -0.2);
  barrelL.castShadow = true;
  group.add(barrelL);

  const muzzleMouldL = new THREE.Mesh(
    new THREE.TorusGeometry(0.08, 0.02, 6, 12),
    materials.playerTrim
  );
  muzzleMouldL.position.set(0.65, 0.52, -0.65);
  group.add(muzzleMouldL);

  const barrelR = new THREE.Mesh(cannonGeo, materials.playerGuns);
  barrelR.position.set(-0.65, 0.52, -0.2);
  barrelR.castShadow = true;
  group.add(barrelR);

  const muzzleMouldR = muzzleMouldL.clone();
  muzzleMouldR.position.set(-0.65, 0.52, -0.65);
  group.add(muzzleMouldR);

  // 7 & 8. Rear Plasma Hover Thrusters
  const thrusterHousingGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.45, 8);
  thrusterHousingGeo.rotateX(Math.PI / 2);
  const houseL = new THREE.Mesh(thrusterHousingGeo, materials.playerHull);
  houseL.position.set(0.35, 0.55, 0.85);
  group.add(houseL);

  const houseR = houseL.clone();
  houseR.position.set(-0.35, 0.55, 0.85);
  group.add(houseR);

  // Dynamic Thruster Flame Plumes
  const flameGeo = new THREE.ConeGeometry(0.12, 0.6, 8);
  flameGeo.rotateX(-Math.PI / 2);
  const thrusterL = new THREE.Mesh(flameGeo, materials.thrusterFlame);
  thrusterL.position.set(0.35, 0.55, 1.25);
  group.add(thrusterL);

  const thrusterR = thrusterL.clone();
  thrusterR.position.set(-0.35, 0.55, 1.25);
  group.add(thrusterR);

  // 9. Central Pulsing Reactor Core
  const coreGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.3, 6);
  const core = new THREE.Mesh(coreGeo, materials.playerTrim);
  core.position.set(0, 0.65, 0.1);
  group.add(core);

  // 10. Contact Shadow Disc on ground
  const shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), softShadowMaterial);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.02;
  group.add(shadowMesh);

  return { group, thrusterL, thrusterR, barrelL, barrelR, core };
}

/**
 * Create Stalker Scrapper Drone (7-part predatory skimmer)
 */
export function createStalkerDrone(): { group: THREE.Group; meshes: THREE.Mesh[]; eye: THREE.Mesh } {
  const group = new THREE.Group();
  const meshes: THREE.Mesh[] = [];

  // 1. Faceted Head Unit
  const headGeo = new THREE.ConeGeometry(0.45, 0.85, 4);
  headGeo.rotateX(Math.PI / 2);
  const head = new THREE.Mesh(headGeo, materials.stalkerArmor);
  head.position.set(0, 0.5, 0);
  head.castShadow = true;
  group.add(head);
  meshes.push(head);

  // 2. Optical Eye Sensor
  const eyeGeo = new THREE.SphereGeometry(0.14, 8, 8);
  const eye = new THREE.Mesh(eyeGeo, materials.stalkerEye);
  eye.position.set(0, 0.5, -0.45);
  group.add(eye);
  meshes.push(eye);

  // 3 & 4. Dual Scythe Mandibles
  const mandibleGeo = new THREE.BoxGeometry(0.08, 0.08, 0.7);
  mandibleGeo.rotateY(0.4);
  const mandL = new THREE.Mesh(mandibleGeo, materials.stalkerArmor);
  mandL.position.set(0.3, 0.45, -0.5);
  mandL.castShadow = true;
  group.add(mandL);
  meshes.push(mandL);

  const mandR = new THREE.Mesh(mandibleGeo, materials.stalkerArmor);
  mandR.position.set(-0.3, 0.45, -0.5);
  mandR.rotation.y = -0.8;
  mandR.castShadow = true;
  group.add(mandR);
  meshes.push(mandR);

  // 5 & 6. Side Thruster Pods
  const thrusterGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.4, 6);
  thrusterGeo.rotateX(Math.PI / 2);
  const thL = new THREE.Mesh(thrusterGeo, materials.stalkerArmor);
  thL.position.set(0.38, 0.55, 0.35);
  group.add(thL);
  meshes.push(thL);

  const thR = thL.clone();
  thR.position.set(-0.38, 0.55, 0.35);
  group.add(thR);
  meshes.push(thR);

  // 7. Ground Contact Shadow
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), softShadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  return { group, meshes, eye };
}

/**
 * Create Heavy Siege Goliath (8-part armored artillery walker)
 */
export function createSiegeGoliath(): { group: THREE.Group; meshes: THREE.Mesh[]; barrels: THREE.Group } {
  const group = new THREE.Group();
  const meshes: THREE.Mesh[] = [];

  // 1. Armored Main Chassis
  const bodyGeo = new THREE.BoxGeometry(1.4, 0.75, 1.3);
  const body = new THREE.Mesh(bodyGeo, materials.goliathArmor);
  body.position.set(0, 0.85, 0);
  body.castShadow = true;
  group.add(body);
  meshes.push(body);

  // 2 & 3. Heavy Shoulder Armor Plates
  const plateGeo = new THREE.BoxGeometry(0.35, 0.5, 1.1);
  const plateL = new THREE.Mesh(plateGeo, materials.goliathPlates);
  plateL.position.set(0.85, 1.0, 0);
  plateL.castShadow = true;
  group.add(plateL);
  meshes.push(plateL);

  const plateR = plateL.clone();
  plateR.position.set(-0.85, 1.0, 0);
  group.add(plateR);
  meshes.push(plateR);

  // 4. Twin Mortar Barrels Group (recoils together)
  const barrels = new THREE.Group();
  barrels.position.set(0, 1.1, 0.1);

  const cannonGeo = new THREE.CylinderGeometry(0.18, 0.22, 1.3, 8);
  cannonGeo.rotateX(Math.PI / 2);
  const b1 = new THREE.Mesh(cannonGeo, materials.goliathGuns);
  b1.position.set(0.35, 0, -0.6);
  b1.castShadow = true;
  barrels.add(b1);
  meshes.push(b1);

  const b2 = new THREE.Mesh(cannonGeo, materials.goliathGuns);
  b2.position.set(-0.35, 0, -0.6);
  b2.castShadow = true;
  barrels.add(b2);
  meshes.push(b2);

  group.add(barrels);

  // 5. Heavy Reactor Vent
  const ventGeo = new THREE.BoxGeometry(0.6, 0.2, 0.3);
  const ventMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.5,
  });
  const vent = new THREE.Mesh(ventGeo, ventMat);
  vent.position.set(0, 0.9, 0.65);
  group.add(vent);

  // 6. Ground Shadow
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.8), softShadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  return { group, meshes, barrels };
}

/**
 * Create Vector Sniper Drone (6-part floating tri-wing craft)
 */
export function createVectorDrone(): { group: THREE.Group; meshes: THREE.Mesh[]; chargeRing: THREE.Mesh } {
  const group = new THREE.Group();
  const meshes: THREE.Mesh[] = [];

  // 1. Spire Core Fuselage
  const coreGeo = new THREE.ConeGeometry(0.3, 1.2, 5);
  coreGeo.rotateX(Math.PI / 2);
  const core = new THREE.Mesh(coreGeo, materials.sniperArmor);
  core.position.set(0, 0.8, 0);
  core.castShadow = true;
  group.add(core);
  meshes.push(core);

  // 2. Long Railgun Barrel
  const barrelGeo = new THREE.CylinderGeometry(0.05, 0.06, 1.6, 6);
  barrelGeo.rotateX(Math.PI / 2);
  const barrel = new THREE.Mesh(barrelGeo, materials.playerGuns);
  barrel.position.set(0, 0.8, -0.9);
  barrel.castShadow = true;
  group.add(barrel);
  meshes.push(barrel);

  // 3. Glowing Charge Ring
  const ringGeo = new THREE.TorusGeometry(0.18, 0.04, 6, 16);
  const chargeRing = new THREE.Mesh(ringGeo, materials.sniperGlow);
  chargeRing.position.set(0, 0.8, -0.6);
  group.add(chargeRing);
  meshes.push(chargeRing);

  // 4 & 5. Tri-Wing Stabilizers
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    const finGeo = new THREE.BoxGeometry(0.04, 0.45, 0.7);
    const fin = new THREE.Mesh(finGeo, materials.sniperArmor);
    fin.position.set(Math.cos(angle) * 0.4, 0.8 + Math.sin(angle) * 0.4, 0.2);
    fin.rotation.z = angle;
    group.add(fin);
    meshes.push(fin);
  }

  // 6. Ground Shadow
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), softShadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  return { group, meshes, chargeRing };
}

/**
 * Create Titan Colossus Boss (12-part mega war machine)
 */
export function createColossusBoss(): {
  group: THREE.Group;
  meshes: THREE.Mesh[];
  core: THREE.Mesh;
  shieldMesh: THREE.Mesh;
} {
  const group = new THREE.Group();
  const meshes: THREE.Mesh[] = [];

  // 1. Massive Command Hull
  const hullGeo = new THREE.CylinderGeometry(1.6, 2.2, 1.4, 8);
  const hull = new THREE.Mesh(hullGeo, materials.bossArmor);
  hull.position.set(0, 1.7, 0);
  hull.castShadow = true;
  group.add(hull);
  meshes.push(hull);

  // 2. Command Bridge Visor
  const visorGeo = new THREE.BoxGeometry(1.4, 0.35, 0.6);
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 2.2,
  });
  const visor = new THREE.Mesh(visorGeo, visorMat);
  visor.position.set(0, 1.9, -1.9);
  group.add(visor);
  meshes.push(visor);

  // 3. Central Overload Reactor Core
  const coreGeo = new THREE.SphereGeometry(0.85, 12, 12);
  const core = new THREE.Mesh(coreGeo, materials.bossCore);
  core.position.set(0, 1.7, 0);
  group.add(core);

  // 4 & 5. Twin Heavy Hover Nacelles
  const turbineGeo = new THREE.CylinderGeometry(0.8, 0.9, 2.4, 8);
  turbineGeo.rotateZ(Math.PI / 2);
  const turbL = new THREE.Mesh(turbineGeo, materials.bossArmor);
  turbL.position.set(2.4, 1.6, 0);
  turbL.castShadow = true;
  group.add(turbL);
  meshes.push(turbL);

  const turbR = turbL.clone();
  turbR.position.set(-2.4, 1.6, 0);
  group.add(turbR);
  meshes.push(turbR);

  // 6 & 7. Quad Heavy Cannon Batteries
  const cannonGeo = new THREE.CylinderGeometry(0.2, 0.25, 2.0, 8);
  cannonGeo.rotateX(Math.PI / 2);

  const c1 = new THREE.Mesh(cannonGeo, materials.playerGuns);
  c1.position.set(1.2, 1.4, -1.8);
  group.add(c1);
  meshes.push(c1);

  const c2 = c1.clone();
  c2.position.set(-1.2, 1.4, -1.8);
  group.add(c2);
  meshes.push(c2);

  // 8. Heavy Armor Crest Plates
  const crestGeo = new THREE.BoxGeometry(2.0, 0.4, 1.8);
  const crest = new THREE.Mesh(crestGeo, materials.goliathPlates);
  crest.position.set(0, 2.5, 0);
  group.add(crest);
  meshes.push(crest);

  // 9. Holographic Forcefield Shield Bubble
  const shieldGeo = new THREE.SphereGeometry(3.6, 16, 16);
  const shieldMat = new THREE.MeshStandardMaterial({
    color: 0x00ffff,
    emissive: 0x0088ff,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.28,
    wireframe: true,
    depthWrite: false,
  });
  const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
  shieldMesh.position.set(0, 1.8, 0);
  group.add(shieldMesh);

  // 10. Massive Ground Contact Shadow
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 6.5), softShadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  return { group, meshes, core, shieldMesh };
}

/**
 * Procedural Pickup: XP Core, Repair Nanites, Overdrive Cell
 */
export function createPickupMesh(type: 'xp' | 'heal' | 'emp'): { group: THREE.Group; mesh: THREE.Mesh } {
  const group = new THREE.Group();
  let mesh: THREE.Mesh;

  if (type === 'xp') {
    // Quantum Octahedron with cyan glow
    const geo = new THREE.OctahedronGeometry(0.3, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00a8ff,
      emissiveIntensity: 1.8,
      metalness: 0.8,
      roughness: 0.1,
    });
    mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.4;
    group.add(mesh);

    // Orbiting ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.02, 4, 16),
      new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.7 })
    );
    ring.rotation.x = Math.PI / 3;
    ring.position.y = 0.4;
    group.add(ring);
  } else if (type === 'heal') {
    // Green Cross Nanite canister
    const geo = new THREE.BoxGeometry(0.2, 0.5, 0.2);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 1.9,
    });
    mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.4;
    group.add(mesh);

    const crossArm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.2), mat);
    crossArm.position.y = 0.4;
    group.add(crossArm);
  } else {
    // Gold EMP Energy Core
    const geo = new THREE.IcosahedronGeometry(0.35, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 2.2,
      metalness: 0.9,
      roughness: 0.15,
    });
    mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.4;
    group.add(mesh);
  }

  // Shadow
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), softShadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  return { group, mesh };
}
