import * as THREE from 'three';
import { ParticleManager } from './particles';

export class QuantumPortal {
  public group: THREE.Group;
  public isActive: boolean = false;
  public x: number = 0;
  public z: number = 0;
  public targetLevel: number = 2;
  public themeColor: number = 0x00f0ff;

  private outerRing: THREE.Mesh;
  private innerRing: THREE.Mesh;
  private baseRing: THREE.Mesh;
  private vortexCylinder: THREE.Mesh;
  private singularity: THREE.Mesh;
  private beaconLight: THREE.PointLight;
  private groundRipple: THREE.Mesh;
  private scaleProgress: number = 0;
  private isWarping: boolean = false;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.group.visible = false;
    this.group.position.set(0, 0, 0);

    // 1. Ground Energy Ring / Emitter Pad
    const baseGeo = new THREE.TorusGeometry(3.0, 0.18, 12, 48);
    baseGeo.rotateX(Math.PI / 2);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 1.5,
      metalness: 0.9,
      roughness: 0.1,
    });
    this.baseRing = new THREE.Mesh(baseGeo, baseMat);
    this.baseRing.position.y = 0.1;
    this.group.add(this.baseRing);

    // Ground Ripple Disc
    const rippleGeo = new THREE.RingGeometry(0.2, 4.0, 32);
    rippleGeo.rotateX(-Math.PI / 2);
    const rippleMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.groundRipple = new THREE.Mesh(rippleGeo, rippleMat);
    this.groundRipple.position.y = 0.04;
    this.group.add(this.groundRipple);

    // 2. Outer Rotating Gimbal Ring
    const outerGeo = new THREE.TorusGeometry(2.6, 0.12, 16, 48);
    const outerMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x00e5ff,
      emissiveIntensity: 2.0,
      metalness: 0.95,
      roughness: 0.1,
    });
    this.outerRing = new THREE.Mesh(outerGeo, outerMat);
    this.outerRing.position.y = 2.4;
    this.group.add(this.outerRing);

    // 3. Inner Counter-Rotating Glyph Ring
    const innerGeo = new THREE.TorusGeometry(1.9, 0.09, 16, 48);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x00f0ff,
      emissiveIntensity: 2.8,
      metalness: 0.8,
      roughness: 0.2,
    });
    this.innerRing = new THREE.Mesh(innerGeo, innerMat);
    this.innerRing.position.y = 2.4;
    this.group.add(this.innerRing);

    // 4. Vertical Warp Vortex Cylinder (Light Column)
    const vortexGeo = new THREE.CylinderGeometry(1.6, 2.5, 12, 32, 1, true);
    const vortexMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.vortexCylinder = new THREE.Mesh(vortexGeo, vortexMat);
    this.vortexCylinder.position.y = 6.0;
    this.group.add(this.vortexCylinder);

    // 5. Central Singularity Core
    const coreGeo = new THREE.SphereGeometry(0.55, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });
    this.singularity = new THREE.Mesh(coreGeo, coreMat);
    this.singularity.position.y = 2.4;
    this.group.add(this.singularity);

    // 6. Point Light source
    this.beaconLight = new THREE.PointLight(0x00f0ff, 4.0, 18);
    this.beaconLight.position.set(0, 2.4, 0);
    this.group.add(this.beaconLight);

    scene.add(this.group);
  }

  public spawn(x: number, z: number, targetLevel: number, themeColor: number = 0x00f0ff) {
    this.x = x;
    this.z = z;
    this.targetLevel = targetLevel;
    this.themeColor = themeColor;
    this.isActive = true;
    this.isWarping = false;
    this.scaleProgress = 0;

    this.group.position.set(x, 0, z);
    this.group.scale.set(0.01, 0.01, 0.01);
    this.group.visible = true;

    // Apply color theme
    this.setPortalColor(themeColor);
  }

  public setPortalColor(colorHex: number) {
    this.themeColor = colorHex;
    (this.baseRing.material as THREE.MeshStandardMaterial).color.setHex(colorHex);
    (this.baseRing.material as THREE.MeshStandardMaterial).emissive.setHex(colorHex);

    (this.outerRing.material as THREE.MeshStandardMaterial).emissive.setHex(colorHex);
    (this.innerRing.material as THREE.MeshStandardMaterial).emissive.setHex(colorHex);

    (this.vortexCylinder.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
    (this.groundRipple.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
    this.beaconLight.color.setHex(colorHex);
  }

  public despawn() {
    this.isActive = false;
    this.isWarping = false;
    this.group.visible = false;
    this.scaleProgress = 0;
  }

  public triggerWarp() {
    this.isWarping = true;
  }

  public update(dt: number, time: number, particleManager: ParticleManager) {
    if (!this.isActive) return;

    // Entrance scale animation
    if (this.scaleProgress < 1.0) {
      this.scaleProgress = Math.min(1.0, this.scaleProgress + dt * 2.2);
      // Spring elastic ease
      const s = Math.sin((this.scaleProgress * Math.PI) / 2);
      this.group.scale.set(s, s, s);
    }

    // Dynamic rotation of gimbal rings
    this.outerRing.rotation.y = time * 2.2;
    this.outerRing.rotation.x = Math.sin(time * 1.5) * 0.4;

    this.innerRing.rotation.y = -time * 3.4;
    this.innerRing.rotation.z = Math.cos(time * 1.8) * 0.5;

    // Vortex column rotation & pulse
    this.vortexCylinder.rotation.y = time * 1.2;
    const pulse = 1.0 + Math.sin(time * 6.0) * 0.15;
    this.singularity.scale.set(pulse, pulse, pulse);

    // Ground ripple expansion
    const rippleScale = 1.0 + ((time * 1.5) % 1.0) * 1.8;
    this.groundRipple.scale.set(rippleScale, rippleScale, rippleScale);
    (this.groundRipple.material as THREE.MeshBasicMaterial).opacity =
      0.5 * (1.0 - ((time * 1.5) % 1.0));

    // Light flickering intensity
    this.beaconLight.intensity = 3.5 + Math.sin(time * 12) * 1.2;

    // Swirling portal intake particles
    particleManager.spawnPortalSwirl(this.x, 2.0, this.z, 3.2, this.themeColor);
  }

  public checkEnter(playerX: number, playerZ: number): boolean {
    if (!this.isActive || this.scaleProgress < 0.6) return false;
    const dist = Math.hypot(playerX - this.x, playerZ - this.z);
    return dist < 2.8;
  }

  public getDistance(playerX: number, playerZ: number): number {
    return Math.hypot(playerX - this.x, playerZ - this.z);
  }

  public getAngle(playerX: number, playerZ: number): number {
    return Math.atan2(this.x - playerX, this.z - playerZ);
  }
}
