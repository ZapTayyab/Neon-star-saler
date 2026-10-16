import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export const ARENA_RADIUS = 30;

/**
 * Creates a procedural high-tech cyberpunk arena floor grid texture
 */
export function createArenaFloorTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Dark matte composite ground
  ctx.fillStyle = '#0a0d14';
  ctx.fillRect(0, 0, 1024, 1024);

  // Hexagonal and grid lines
  ctx.strokeStyle = '#15202d';
  ctx.lineWidth = 2;

  const tileSize = 64;
  for (let x = 0; x <= 1024; x += tileSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1024);
    ctx.stroke();
  }
  for (let y = 0; y <= 1024; y += tileSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // Major accent grid lines with subtle cyan glow
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.35;
  for (let x = 0; x <= 1024; x += tileSize * 4) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1024);
    ctx.stroke();
  }
  for (let y = 0; y <= 1024; y += tileSize * 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // Center vector glyphs and markings
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(512, 512, 120, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(512, 512, 280, 0, Math.PI * 2);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

export interface ArenaComponents {
  floorMesh: THREE.Mesh;
  pylons: THREE.Group;
  barrierMesh: THREE.Mesh;
  dustParticles: THREE.Points;
  update: (time: number) => void;
}

export function buildArena(scene: THREE.Scene, renderer: THREE.WebGLRenderer): ArenaComponents {
  // 1. Studio RoomEnvironment Reflection (Mandatory per Three.js skill)
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  pmremGenerator.dispose();

  // 2. Horizon Fog matched to background color
  const bgColor = new THREE.Color(0x06080e);
  scene.background = bgColor;
  scene.fog = new THREE.FogExp2(0x06080e, 0.015);

  // 3. Balanced Lighting Rig (Warm key directional + Cool hemisphere sky/ground)
  const dirLight = new THREE.DirectionalLight(0xfff5e6, 2.0); // Warm key light
  dirLight.position.set(25, 45, 20);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 120;
  const d = 40;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.bias = -0.0005;
  dirLight.shadow.normalBias = 0.02;
  scene.add(dirLight);

  // Cool sky / dark ground hemisphere light
  const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 1.2);
  hemiLight.position.set(0, 50, 0);
  scene.add(hemiLight);

  // Subtle accent rim light
  const rimLight = new THREE.DirectionalLight(0x818cf8, 0.8);
  rimLight.position.set(-25, 20, -25);
  scene.add(rimLight);

  // 4. Extended Floor Plane (Beyond playable zone to horizon)
  const floorTexture = createArenaFloorTexture(renderer);
  const floorGeo = new THREE.PlaneGeometry(160, 160);
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTexture,
    roughness: 0.7,
    metalness: 0.3,
  });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  // 5. Perimeter Pylons & Holographic Energy Ring
  const pylons = new THREE.Group();
  const numPylons = 16;
  const pylonMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.9,
    roughness: 0.2,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00f0ff,
    emissiveIntensity: 2.0,
  });

  for (let i = 0; i < numPylons; i++) {
    const angle = (i * Math.PI * 2) / numPylons;
    const x = Math.cos(angle) * ARENA_RADIUS;
    const z = Math.sin(angle) * ARENA_RADIUS;

    const pylonGroup = new THREE.Group();
    // Base pedestal
    const baseGeo = new THREE.CylinderGeometry(0.8, 1.1, 0.8, 6);
    const base = new THREE.Mesh(baseGeo, pylonMat);
    base.position.y = 0.4;
    base.castShadow = true;
    pylonGroup.add(base);

    // Spire column
    const spireGeo = new THREE.CylinderGeometry(0.3, 0.5, 4.5, 6);
    const spire = new THREE.Mesh(spireGeo, pylonMat);
    spire.position.y = 2.65;
    spire.castShadow = true;
    pylonGroup.add(spire);

    // Glowing tip
    const tipGeo = new THREE.OctahedronGeometry(0.4, 0);
    const tip = new THREE.Mesh(tipGeo, beaconMat);
    tip.position.y = 5.2;
    pylonGroup.add(tip);

    pylonGroup.position.set(x, 0, z);
    pylons.add(pylonGroup);
  }
  scene.add(pylons);

  // Holographic perimeter barrier ring
  const barrierGeo = new THREE.CylinderGeometry(ARENA_RADIUS, ARENA_RADIUS, 3.5, 64, 1, true);
  const barrierMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.15,
    wireframe: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const barrierMesh = new THREE.Mesh(barrierGeo, barrierMat);
  barrierMesh.position.y = 1.75;
  scene.add(barrierMesh);

  // 6. Monolithic Distant Horizon Towers (adds cyber scale)
  const distantGroup = new THREE.Group();
  const towerMat = new THREE.MeshStandardMaterial({
    color: 0x090d16,
    metalness: 0.5,
    roughness: 0.8,
  });
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8 + 0.2;
    const dist = 55 + (i % 3) * 10;
    const height = 30 + (i % 4) * 15;
    const towerGeo = new THREE.BoxGeometry(7, height, 7);
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(Math.cos(angle) * dist, height / 2, Math.sin(angle) * dist);
    tower.castShadow = true;
    distantGroup.add(tower);
  }
  scene.add(distantGroup);

  // 7. Floating Nano-Dust Motes
  const particleCount = 200;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * ARENA_RADIUS * 2;
    positions[i * 3 + 1] = 0.5 + Math.random() * 5.0;
    positions[i * 3 + 2] = (Math.random() - 0.5) * ARENA_RADIUS * 2;
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0x38bdf8,
    size: 0.12,
    transparent: true,
    opacity: 0.6,
  });
  const dustParticles = new THREE.Points(particleGeo, particleMat);
  scene.add(dustParticles);

  const update = (time: number) => {
    // Subtle rotation of perimeter barrier & dust drift
    barrierMesh.rotation.y = time * 0.05;
    const posAttr = dustParticles.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < particleCount; i++) {
      arr[i * 3 + 1] += Math.sin(time + i) * 0.003;
    }
    posAttr.needsUpdate = true;
  };

  return { floorMesh, pylons, barrierMesh, dustParticles, update };
}
