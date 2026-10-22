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
  const hullMesh = new THREE.Mesh(hullGeo, materials.playerHull.clone());
  hullMesh.userData.part = 'hull';
  hullMesh.position.y = 0.55;
  hullMesh.castShadow = true;
  group.add(hullMesh);

  // 2. Cockpit Canopy (Aerodynamic glass canopy)
  const canopyGeo = new THREE.ConeGeometry(0.32, 0.9, 5);
  canopyGeo.rotateX(Math.PI / 2);
  canopyGeo.scale(1, 0.5, 1);
  const canopyMesh = new THREE.Mesh(canopyGeo, materials.playerCanopy.clone());
  canopyMesh.userData.part = 'canopy';
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
  const wingMeshL = new THREE.Mesh(wingGeoL, materials.playerWings.clone());
  wingMeshL.userData.part = 'wings';
  wingMeshL.position.set(0.4, 0.52, 0.2);
  wingMeshL.castShadow = true;
  group.add(wingMeshL);

  const wingGeoR = wingGeoL.clone();
  wingGeoR.scale(-1, 1, 1);
  const wingMeshR = new THREE.Mesh(wingGeoR, materials.playerWings.clone());
  wingMeshR.userData.part = 'wings';
  wingMeshR.position.set(-0.4, 0.52, 0.2);
  wingMeshR.castShadow = true;
  group.add(wingMeshR);

  // 5 & 6. Twin Dual Plasma Cannons
  const cannonGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.9, 8);
  cannonGeo.rotateX(Math.PI / 2);
  const barrelL = new THREE.Mesh(cannonGeo, materials.playerGuns.clone());
  barrelL.userData.part = 'guns';
  barrelL.position.set(0.65, 0.52, -0.2);
  barrelL.castShadow = true;
  group.add(barrelL);

  const muzzleMouldL = new THREE.Mesh(
    new THREE.TorusGeometry(0.08, 0.02, 6, 12),
    materials.playerTrim.clone()
  );
  muzzleMouldL.userData.part = 'trim';
  muzzleMouldL.position.set(0.65, 0.52, -0.65);
  group.add(muzzleMouldL);

  const barrelR = new THREE.Mesh(cannonGeo, materials.playerGuns.clone());
  barrelR.userData.part = 'guns';
  barrelR.position.set(-0.65, 0.52, -0.2);
  barrelR.castShadow = true;
  group.add(barrelR);

  const muzzleMouldR = new THREE.Mesh(
    new THREE.TorusGeometry(0.08, 0.02, 6, 12),
    materials.playerTrim.clone()
  );
  muzzleMouldR.userData.part = 'trim';
  muzzleMouldR.position.set(-0.65, 0.52, -0.65);
  group.add(muzzleMouldR);

  // 7 & 8. Rear Plasma Hover Thrusters
  const thrusterHousingGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.45, 8);
  thrusterHousingGeo.rotateX(Math.PI / 2);
  const houseL = new THREE.Mesh(thrusterHousingGeo, materials.playerHull.clone());
  houseL.userData.part = 'hull';
  houseL.position.set(0.35, 0.55, 0.85);
  group.add(houseL);

  const houseR = new THREE.Mesh(thrusterHousingGeo, materials.playerHull.clone());
  houseR.userData.part = 'hull';
  houseR.position.set(-0.35, 0.55, 0.85);
  group.add(houseR);

  // Dynamic Thruster Flame Plumes
  const flameGeo = new THREE.ConeGeometry(0.12, 0.6, 8);
  flameGeo.rotateX(-Math.PI / 2);
  const thrusterL = new THREE.Mesh(flameGeo, materials.thrusterFlame.clone());
  thrusterL.userData.part = 'thruster';
  thrusterL.position.set(0.35, 0.55, 1.25);
  group.add(thrusterL);

  const thrusterR = new THREE.Mesh(flameGeo, materials.thrusterFlame.clone());
  thrusterR.userData.part = 'thruster';
  thrusterR.position.set(-0.35, 0.55, 1.25);
  group.add(thrusterR);

  // 9. Central Pulsing Reactor Core
  const coreGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.3, 6);
  const core = new THREE.Mesh(coreGeo, materials.playerTrim.clone());
  core.userData.part = 'core';
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

/**
 * Wave 6 Boss: Goliath Prime - Heavy Siege Dreadnought
 */
export function createGoliathPrimeBoss(): {
  group: THREE.Group;
  meshes: THREE.Mesh[];
  core: THREE.Mesh;
  mortarL: THREE.Group;
  mortarR: THREE.Group;
} {
  const group = new THREE.Group();
  const meshes: THREE.Mesh[] = [];

  // 1. Reinforced Dreadnought Chassis
  const chassisGeo = new THREE.BoxGeometry(3.2, 1.6, 3.4);
  const chassis = new THREE.Mesh(chassisGeo, materials.bossArmor);
  chassis.position.set(0, 1.8, 0);
  chassis.castShadow = true;
  group.add(chassis);
  meshes.push(chassis);

  // 2. Heavy Angled Front Prow
  const prowGeo = new THREE.ConeGeometry(1.8, 2.0, 4);
  prowGeo.rotateX(-Math.PI / 2);
  const prow = new THREE.Mesh(prowGeo, materials.goliathPlates);
  prow.position.set(0, 1.8, -2.4);
  prow.castShadow = true;
  group.add(prow);
  meshes.push(prow);

  // 3. Central Molten Reactor Core
  const coreGeo = new THREE.SphereGeometry(1.0, 16, 16);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xff3b00,
    emissive: 0xff4500,
    emissiveIntensity: 3.0,
    metalness: 0.9,
    roughness: 0.1,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.set(0, 2.0, 0);
  group.add(core);

  // 4. Dual Heavy Siege Mortar Batteries (Left & Right)
  const mortarL = new THREE.Group();
  mortarL.position.set(-1.9, 2.5, 0.4);
  const mBaseL = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.6, 8), materials.goliathPlates);
  const mTubeL = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 1.8, 8), materials.playerGuns);
  mTubeL.position.set(0, 0.8, -0.4);
  mTubeL.rotation.x = -Math.PI / 4;
  mortarL.add(mBaseL);
  mortarL.add(mTubeL);
  group.add(mortarL);
  meshes.push(mBaseL, mTubeL);

  const mortarR = new THREE.Group();
  mortarR.position.set(1.9, 2.5, 0.4);
  const mBaseR = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.6, 8), materials.goliathPlates);
  const mTubeR = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 1.8, 8), materials.playerGuns);
  mTubeR.position.set(0, 0.8, -0.4);
  mTubeR.rotation.x = -Math.PI / 4;
  mortarR.add(mBaseR);
  mortarR.add(mTubeR);
  group.add(mortarR);
  meshes.push(mBaseR, mTubeR);

  // 5. Heavy Front Dual Cannons
  for (let s of [-0.9, 0.9]) {
    const cannonGeo = new THREE.CylinderGeometry(0.18, 0.22, 2.4, 8);
    cannonGeo.rotateX(Math.PI / 2);
    const cannon = new THREE.Mesh(cannonGeo, materials.playerGuns);
    cannon.position.set(s, 1.4, -2.6);
    group.add(cannon);
    meshes.push(cannon);
  }

  // 6. Ground Shadow
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(7.0, 7.0), softShadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  return { group, meshes, core, mortarL, mortarR };
}

/**
 * Wave 18+ Boss: Hyperion Archon - The Void Overlord
 */
export function createHyperionArchonBoss(): {
  group: THREE.Group;
  meshes: THREE.Mesh[];
  core: THREE.Mesh;
  haloRing: THREE.Mesh;
} {
  const group = new THREE.Group();
  const meshes: THREE.Mesh[] = [];

  // 1. Sleek Obsidian Archon Spire
  const spireGeo = new THREE.OctahedronGeometry(2.2, 0);
  const spireMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.95,
    roughness: 0.1,
    emissive: 0x6366f1,
    emissiveIntensity: 0.4,
  });
  const spire = new THREE.Mesh(spireGeo, spireMat);
  spire.position.set(0, 2.6, 0);
  spire.scale.set(1.1, 1.8, 1.1);
  spire.castShadow = true;
  group.add(spire);
  meshes.push(spire);

  // 2. Swirling Quantum Halo Ring
  const haloGeo = new THREE.TorusGeometry(3.5, 0.12, 8, 32);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xa855f7,
    wireframe: true,
  });
  const haloRing = new THREE.Mesh(haloGeo, haloMat);
  haloRing.position.set(0, 2.6, 0);
  haloRing.rotation.x = Math.PI / 2;
  group.add(haloRing);

  // 3. Ultra-Bright Void Core
  const coreGeo = new THREE.IcosahedronGeometry(1.1, 2);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xc084fc,
    emissive: 0x9333ea,
    emissiveIntensity: 3.5,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.set(0, 2.6, 0);
  group.add(core);

  // 4. Six Orbiting Prism Pylons
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI * 2) / 6;
    const pylonGeo = new THREE.ConeGeometry(0.3, 1.6, 4);
    pylonGeo.rotateX(Math.PI / 2);
    const pylon = new THREE.Mesh(pylonGeo, materials.sniperArmor);
    pylon.position.set(Math.cos(angle) * 3.5, 2.6, Math.sin(angle) * 3.5);
    pylon.rotation.y = -angle;
    group.add(pylon);
    meshes.push(pylon);
  }

  // 5. Heavy Twin Beam Emitter Prongs at the front
  for (let s of [-1.2, 1.2]) {
    const prong = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.4, 2.8), materials.playerGuns);
    prong.position.set(s, 2.2, -1.8);
    group.add(prong);
    meshes.push(prong);
  }

  // 6. Ground Shadow
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(8.0, 8.0), softShadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  return { group, meshes, core, haloRing };
}

/**
 * Escort Shield Drone for Bosses
 */
export function createShieldDrone(): {
  group: THREE.Group;
  meshes: THREE.Mesh[];
  dome: THREE.Mesh;
} {
  const group = new THREE.Group();
  const meshes: THREE.Mesh[] = [];

  const bodyGeo = new THREE.CylinderGeometry(0.4, 0.5, 0.35, 6);
  const body = new THREE.Mesh(bodyGeo, materials.stalkerArmor);
  body.position.set(0, 1.2, 0);
  body.castShadow = true;
  group.add(body);
  meshes.push(body);

  const domeGeo = new THREE.SphereGeometry(0.28, 8, 8);
  const domeMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00d8ff,
    emissiveIntensity: 2.5,
  });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.position.set(0, 1.45, 0);
  group.add(dome);
  meshes.push(dome);

  // Shadow
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), softShadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  return { group, meshes, dome };
}

/**
 * Level 10+ Ruthless Enemy: Berserker Shredder Drone
 * High-speed assault skimmer with twin forward spinning scythe blades and afterburner flames
 */
export function createShredderDrone(): {
  group: THREE.Group;
  meshes: THREE.Mesh[];
  bladeL: THREE.Mesh;
  bladeR: THREE.Mesh;
  eye: THREE.Mesh;
} {
  const group = new THREE.Group();
  const meshes: THREE.Mesh[] = [];

  // 1. Angular Razor Cockpit Chassis
  const bodyGeo = new THREE.ConeGeometry(0.5, 1.1, 4);
  bodyGeo.rotateX(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, materials.stalkerArmor);
  body.position.set(0, 0.55, 0);
  body.castShadow = true;
  group.add(body);
  meshes.push(body);

  // 2. Glowing Visor Eye
  const eyeGeo = new THREE.BoxGeometry(0.35, 0.1, 0.15);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff1100 });
  const eye = new THREE.Mesh(eyeGeo, eyeMat);
  eye.position.set(0, 0.55, -0.58);
  group.add(eye);
  meshes.push(eye);

  // 3 & 4. Twin Serrated Scythe Cutter Blades
  const bladeGeo = new THREE.BoxGeometry(0.08, 0.06, 0.95);
  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0xff3b30,
    emissive: 0xff0022,
    emissiveIntensity: 1.8,
    metalness: 0.9,
    roughness: 0.1,
  });

  const bladeL = new THREE.Mesh(bladeGeo, bladeMat);
  bladeL.position.set(0.48, 0.5, -0.65);
  bladeL.rotation.y = 0.35;
  bladeL.castShadow = true;
  group.add(bladeL);
  meshes.push(bladeL);

  const bladeR = new THREE.Mesh(bladeGeo, bladeMat);
  bladeR.position.set(-0.48, 0.5, -0.65);
  bladeR.rotation.y = -0.35;
  bladeR.castShadow = true;
  group.add(bladeR);
  meshes.push(bladeR);

  // 5 & 6. Dual Overclocked Afterburners
  const flameGeo = new THREE.ConeGeometry(0.12, 0.65, 6);
  flameGeo.rotateX(-Math.PI / 2);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xff5500 });
  const fL = new THREE.Mesh(flameGeo, flameMat);
  fL.position.set(0.32, 0.55, 0.7);
  const fR = new THREE.Mesh(flameGeo, flameMat);
  fR.position.set(-0.32, 0.55, 0.7);
  group.add(fL, fR);

  // Contact shadow
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), softShadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  return { group, meshes, bladeL, bladeR, eye };
}

/**
 * Level 10+ Ruthless Enemy: Heavy Mortar Destroyer
 * Heavily armored dreadnought walker with an elevated siege mortar artillery cannon
 */
export function createMortarDestroyer(): {
  group: THREE.Group;
  meshes: THREE.Mesh[];
  mortarBarrel: THREE.Mesh;
  heatsink: THREE.Mesh;
} {
  const group = new THREE.Group();
  const meshes: THREE.Mesh[] = [];

  // 1. Reinforced Tracked Chassis
  const bodyGeo = new THREE.BoxGeometry(1.8, 0.9, 1.6);
  const body = new THREE.Mesh(bodyGeo, materials.goliathArmor);
  body.position.set(0, 0.95, 0);
  body.castShadow = true;
  group.add(body);
  meshes.push(body);

  // 2. Heavy Armor Plates
  const plateGeo = new THREE.BoxGeometry(2.1, 0.45, 1.8);
  const plate = new THREE.Mesh(plateGeo, materials.goliathPlates);
  plate.position.set(0, 0.85, 0);
  plate.castShadow = true;
  group.add(plate);
  meshes.push(plate);

  // 3. Elevated Siege Mortar Cannon Barrel (Angled upward for lobbed artillery)
  const mortarGeo = new THREE.CylinderGeometry(0.24, 0.32, 1.6, 8);
  mortarGeo.rotateX(-Math.PI / 3); // 60 degree elevation
  const mortarMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.95,
    roughness: 0.15,
  });
  const mortarBarrel = new THREE.Mesh(mortarGeo, mortarMat);
  mortarBarrel.position.set(0, 1.8, -0.2);
  mortarBarrel.castShadow = true;
  group.add(mortarBarrel);
  meshes.push(mortarBarrel);

  // Muzzle band
  const bandGeo = new THREE.TorusGeometry(0.34, 0.06, 6, 16);
  bandGeo.rotateX(-Math.PI / 3);
  const bandMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
  const band = new THREE.Mesh(bandGeo, bandMat);
  band.position.set(0, 2.45, -0.6);
  group.add(band);

  // 4. Glowing Thermal Heatsink Grate on back
  const heatGeo = new THREE.BoxGeometry(0.8, 0.3, 0.15);
  const heatMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
  const heatsink = new THREE.Mesh(heatGeo, heatMat);
  heatsink.position.set(0, 1.3, 0.82);
  group.add(heatsink);

  // Contact shadow
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 3.0), softShadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  return { group, meshes, mortarBarrel, heatsink };
}

/**
 * Level 20+ Ruthless Enemy: Void Phase Stalker
 * Teleporting quantum assassin drone with crystalline void wings and phasing halo
 */
export function createPhaseStalker(): {
  group: THREE.Group;
  meshes: THREE.Mesh[];
  core: THREE.Mesh;
  halo: THREE.Mesh;
} {
  const group = new THREE.Group();
  const meshes: THREE.Mesh[] = [];

  // 1. Sleek Crystalline Obsidian Fuselage
  const bodyGeo = new THREE.OctahedronGeometry(0.65, 0);
  bodyGeo.scale(0.8, 0.6, 1.4);
  const body = new THREE.Mesh(bodyGeo, materials.sniperArmor);
  body.position.set(0, 0.7, 0);
  body.castShadow = true;
  group.add(body);
  meshes.push(body);

  // 2. Void Singularity Core
  const coreGeo = new THREE.SphereGeometry(0.22, 12, 12);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xd946ef });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.set(0, 0.7, -0.4);
  group.add(core);
  meshes.push(core);

  // 3. Floating Anti-Gravity Phasing Halo Ring
  const haloGeo = new THREE.TorusGeometry(0.85, 0.06, 8, 24);
  haloGeo.rotateX(Math.PI / 2);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xa855f7,
    transparent: true,
    opacity: 0.8,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.position.set(0, 0.7, 0);
  group.add(halo);

  // 4 & 5. Swept Crystalline Phase Wings
  const wingGeo = new THREE.BoxGeometry(1.6, 0.04, 0.6);
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0x3b0764,
    emissive: 0x7e22ce,
    emissiveIntensity: 1.2,
    metalness: 0.9,
    roughness: 0.2,
  });
  const wings = new THREE.Mesh(wingGeo, wingMat);
  wings.position.set(0, 0.75, 0.2);
  group.add(wings);
  meshes.push(wings);

  // Contact shadow
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), softShadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  return { group, meshes, core, halo };
}

