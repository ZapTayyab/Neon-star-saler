import * as THREE from 'three';

export interface MechSkin {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  tagline: string;
  description: string;
  colors: {
    hull: number;
    trim: number;
    wings: number;
    canopy: number;
    guns: number;
    thruster: number;
    trail: number;
    core: number;
  };
  bonusTag: string;
  badgeColor: string;
}

export const MECH_SKINS: MechSkin[] = [
  {
    id: 'cyan_striker',
    name: 'Cyan Striker',
    rarity: 'common',
    tagline: 'Standard Fleet Issue',
    description: 'High-tensile carbon-alloy fuselage with high-frequency cyan superconducting coils.',
    colors: {
      hull: 0x1a2634,
      trim: 0x00e5ff,
      wings: 0x0f151c,
      canopy: 0x00f0ff,
      guns: 0x2e3846,
      thruster: 0x00f0ff,
      trail: 0x00f0ff,
      core: 0x00e5ff,
    },
    bonusTag: 'Balanced Kinetic Matrix',
    badgeColor: 'border-cyan-500/40 text-cyan-400 bg-cyan-950/40',
  },
  {
    id: 'crimson_phantom',
    name: 'Crimson Phantom',
    rarity: 'rare',
    tagline: 'Spec-Ops Infiltrator',
    description: 'Matte obsidian radar-absorbent hull with hyper-reactive crimson plasma injectors.',
    colors: {
      hull: 0x141416,
      trim: 0xff003c,
      wings: 0x1c1917,
      canopy: 0xff1744,
      guns: 0x292524,
      thruster: 0xff1744,
      trail: 0xff0055,
      core: 0xff003c,
    },
    bonusTag: '+15% Threat Velocity',
    badgeColor: 'border-rose-500/40 text-rose-400 bg-rose-950/40',
  },
  {
    id: 'solar_aegis',
    name: 'Solar Aegis',
    rarity: 'epic',
    tagline: 'Gilded Titan Vanguard',
    description: 'Brushed ceramic titanium plated with 24K gold conduits and solar radiation collectors.',
    colors: {
      hull: 0xf8fafc,
      trim: 0xf59e0b,
      wings: 0xe2e8f0,
      canopy: 0xfbbf24,
      guns: 0x475569,
      thruster: 0xfbbf24,
      trail: 0xffea00,
      core: 0xf59e0b,
    },
    bonusTag: 'Reinforced Kinetic Plating',
    badgeColor: 'border-amber-500/40 text-amber-400 bg-amber-950/40',
  },
  {
    id: 'void_oni',
    name: 'Void Cyber-Oni',
    rarity: 'epic',
    tagline: 'Dimensional Drifter',
    description: 'Deep violet metamaterial tuned to dark-matter frequencies with electric fuchsia accents.',
    colors: {
      hull: 0x2e1065,
      trim: 0xd946ef,
      wings: 0x1e1b4b,
      canopy: 0xf43f5e,
      guns: 0x3b0764,
      thruster: 0xe879f9,
      trail: 0xd946ef,
      core: 0xc026d3,
    },
    bonusTag: 'Phase-Space Agility',
    badgeColor: 'border-purple-500/40 text-purple-400 bg-purple-950/40',
  },
  {
    id: 'toxic_synth',
    name: 'Toxic Synthetics',
    rarity: 'rare',
    tagline: 'Bio-Hazard Interceptor',
    description: 'Reinforced ballistic resin with bio-luminescent acid green synthetic fuel cells.',
    colors: {
      hull: 0x052e16,
      trim: 0x10b981,
      wings: 0x022c22,
      canopy: 0x34d399,
      guns: 0x134e4a,
      thruster: 0x10b981,
      trail: 0x00ff88,
      core: 0x10b981,
    },
    bonusTag: 'Corrosive Trail Dissipation',
    badgeColor: 'border-emerald-500/40 text-emerald-400 bg-emerald-950/40',
  },
  {
    id: 'apex_singularity',
    name: 'Apex Singularity',
    rarity: 'legendary',
    tagline: 'Chrono-Warp Prototype',
    description: 'Monolithic zero-friction alloy radiating blinding white antimatter and hyper-radiant azure pulses.',
    colors: {
      hull: 0x0f172a,
      trim: 0x38bdf8,
      wings: 0x1e293b,
      canopy: 0xffffff,
      guns: 0x334155,
      thruster: 0x67e8f9,
      trail: 0x00f5ff,
      core: 0x38bdf8,
    },
    bonusTag: 'Hyper-Velocity Surge',
    badgeColor: 'border-cyan-400/60 text-cyan-300 bg-cyan-900/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]',
  },
];

const STORAGE_KEY = 'cyber_mech_selected_skin_id';

export function getSavedSkinId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && MECH_SKINS.some((s) => s.id === saved)) {
      return saved;
    }
  } catch {
    // Ignore storage errors
  }
  return 'cyan_striker';
}

export function saveSkinId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Ignore storage errors
  }
}

export function getSkinById(id: string): MechSkin {
  return MECH_SKINS.find((s) => s.id === id) || MECH_SKINS[0];
}

/**
 * Live updates the materials on the player mech model to match the specified skin
 */
export function applySkinToMech(
  playerModel: {
    group: THREE.Group;
    thrusterL: THREE.Mesh;
    thrusterR: THREE.Mesh;
    barrelL: THREE.Mesh;
    barrelR: THREE.Mesh;
    core: THREE.Mesh;
  },
  skin: MechSkin
): void {
  playerModel.group.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.material) return;

    const name = child.name;
    const mat = child.material as THREE.MeshStandardMaterial;

    // Identify parts by userData or name
    if (name === 'playerHull' || child.userData.part === 'hull') {
      mat.color.setHex(skin.colors.hull);
    } else if (name === 'playerTrim' || child.userData.part === 'trim') {
      mat.color.setHex(skin.colors.trim);
      if (mat.emissive) mat.emissive.setHex(skin.colors.trim);
    } else if (name === 'playerCanopy' || child.userData.part === 'canopy') {
      mat.color.setHex(skin.colors.canopy);
      if (mat.emissive) mat.emissive.setHex(skin.colors.canopy);
    } else if (name === 'playerWings' || child.userData.part === 'wings') {
      mat.color.setHex(skin.colors.wings);
    } else if (name === 'playerGuns' || child.userData.part === 'guns') {
      mat.color.setHex(skin.colors.guns);
    }
  });

  // Explicit parts
  if (playerModel.thrusterL?.material) {
    (playerModel.thrusterL.material as THREE.MeshBasicMaterial).color.setHex(skin.colors.thruster);
  }
  if (playerModel.thrusterR?.material) {
    (playerModel.thrusterR.material as THREE.MeshBasicMaterial).color.setHex(skin.colors.thruster);
  }
  if (playerModel.barrelL?.material) {
    (playerModel.barrelL.material as THREE.MeshStandardMaterial).color.setHex(skin.colors.guns);
  }
  if (playerModel.barrelR?.material) {
    (playerModel.barrelR.material as THREE.MeshStandardMaterial).color.setHex(skin.colors.guns);
  }
  if (playerModel.core?.material) {
    const coreMat = playerModel.core.material as THREE.MeshStandardMaterial;
    coreMat.color.setHex(skin.colors.core);
    if (coreMat.emissive) coreMat.emissive.setHex(skin.colors.core);
  }
}
