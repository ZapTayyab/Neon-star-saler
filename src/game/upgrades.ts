import { UpgradeOption } from './types';

export const INITIAL_UPGRADES: UpgradeOption[] = [
  {
    id: 'plasma_split',
    title: 'Twin Multi-Cannon',
    description: 'Adds an extra parallel plasma bolt to each salvo.',
    icon: 'target',
    rarity: 'rare',
    level: 0,
    maxLevel: 4,
  },
  {
    id: 'rapid_accelerator',
    title: 'Flux Accelerator',
    description: '+25% Fire Rate and +15% projectile velocity for high-cadence suppression.',
    icon: 'zap',
    rarity: 'rare',
    level: 0,
    maxLevel: 4,
  },
  {
    id: 'overclock_thruster',
    title: 'Kinetic Overclock',
    description: '+20% Hover speed & reduces Dash recharge delay by 20%.',
    icon: 'zap',
    rarity: 'common',
    level: 0,
    maxLevel: 5,
  },
  {
    id: 'plasma_pierce',
    title: 'High-Density Cores',
    description: 'Plasma shots pierce through +1 additional target.',
    icon: 'shield',
    rarity: 'rare',
    level: 0,
    maxLevel: 4,
  },
  {
    id: 'chain_lightning',
    title: 'Arc Overload',
    description: 'Plasma hits arc high-voltage lightning bolts to 2 nearby hostile units.',
    icon: 'sparkles',
    rarity: 'epic',
    level: 0,
    maxLevel: 3,
  },
  {
    id: 'siphon_nanite',
    title: 'Siphon Nanites',
    description: '18% chance to instantly repair Hull integrity on target takedown.',
    icon: 'heart',
    rarity: 'rare',
    level: 0,
    maxLevel: 4,
  },
  {
    id: 'orbital_drone',
    title: 'Vanguard Aegis Drone',
    description: 'Deploy an automated escort drone that orbits and fires plasma salvos.',
    icon: 'cpu',
    rarity: 'epic',
    level: 0,
    maxLevel: 4,
  },
  {
    id: 'emp_supercharge',
    title: 'EMP Resonator',
    description: '+35% EMP Shockwave damage radius and clears hostile artillery salvos.',
    icon: 'radio',
    rarity: 'rare',
    level: 0,
    maxLevel: 4,
  },
  {
    id: 'shield_capacitor',
    title: 'Kinetic Shield Battery',
    description: '+25 Max Shield capacity and reduces shield reboot delay by 0.5s.',
    icon: 'shield',
    rarity: 'rare',
    level: 0,
    maxLevel: 4,
  },
  {
    id: 'hull_reinforce',
    title: 'Composite Hull Matrix',
    description: '+35 Max Hull integrity and instantly repairs 40 HP.',
    icon: 'heart',
    rarity: 'common',
    level: 0,
    maxLevel: 4,
  },
  {
    id: 'dash_overdrive',
    title: 'Quantum Phase Shunt',
    description: '+1 Maximum Dash charge and adds brief invulnerability afterimages.',
    icon: 'zap',
    rarity: 'epic',
    level: 0,
    maxLevel: 3,
  },
  {
    id: 'magnet_nanites',
    title: 'Graviton Nanite Scoop',
    description: 'Expands XP and tactical pickup gravitational pull radius by +120%.',
    icon: 'sparkles',
    rarity: 'common',
    level: 0,
    maxLevel: 3,
  },
];

// Infinite Repeatable Overclock Protocols that guarantee the player is NEVER soft-locked
export const REPEATABLE_OVERCLOCKS: UpgradeOption[] = [
  {
    id: 'overclock_damage',
    title: 'Overclock: Heavy Ordnance',
    description: '+15% Plasma cannon damage and increased explosive impact footprint.',
    icon: 'target',
    rarity: 'rare',
    level: 0,
    maxLevel: 99,
  },
  {
    id: 'overclock_hull',
    title: 'Overclock: Nanite Restoration',
    description: '+25 Max Hull and instantly restores 100% of current Hull and Shields.',
    icon: 'heart',
    rarity: 'legendary',
    level: 0,
    maxLevel: 99,
  },
  {
    id: 'overclock_shield',
    title: 'Overclock: Aegis Barrier',
    description: '+20 Max Shield and triggers an immediate instant shield reboot.',
    icon: 'shield',
    rarity: 'rare',
    level: 0,
    maxLevel: 99,
  },
  {
    id: 'overclock_speed',
    title: 'Overclock: Afterburner Flux',
    description: '+10% Movement velocity and +15% Kinetic Dash propulsion force.',
    icon: 'zap',
    rarity: 'common',
    level: 0,
    maxLevel: 99,
  },
  {
    id: 'overclock_emp',
    title: 'Overclock: EMP Supercell',
    description: '+30% Faster EMP charge generation and grants +5,000 bonus score.',
    icon: 'radio',
    rarity: 'rare',
    level: 0,
    maxLevel: 99,
  },
];

/**
 * Creates a fresh clone of the upgrade catalog for a new session.
 */
export function createFreshUpgradePool(): UpgradeOption[] {
  return [
    ...INITIAL_UPGRADES.map((u) => ({ ...u })),
    ...REPEATABLE_OVERCLOCKS.map((u) => ({ ...u })),
  ];
}

/**
 * Safely picks `count` distinct upgrade options.
 * Guarantees that even if all standard upgrades are maxed,
 * repeatable Overclock protocols are returned so the player NEVER encounters an empty modal.
 */
export function selectUpgradeChoices(pool: UpgradeOption[], count: number = 3): UpgradeOption[] {
  // First, get standard non-maxed upgrades
  const availableStandards = pool.filter(
    (u) => !u.id.startsWith('overclock_') && u.level < u.maxLevel
  );

  // Shuffle standards
  const shuffledStandards = [...availableStandards].sort(() => 0.5 - Math.random());

  const selected: UpgradeOption[] = [];

  // Pick as many standards as possible up to `count`
  for (const item of shuffledStandards) {
    if (selected.length < count) {
      selected.push(item);
    }
  }

  // If we still need more options to fill `count`, pull from repeatable overclocks
  if (selected.length < count) {
    const overclocks = pool.filter((u) => u.id.startsWith('overclock_'));
    const shuffledOverclocks = [...overclocks].sort(() => 0.5 - Math.random());

    for (const oc of shuffledOverclocks) {
      if (selected.length < count && !selected.some((s) => s.id === oc.id)) {
        selected.push(oc);
      }
    }
  }

  // Extreme fallback: if still less than count, duplicate with emergency repair
  while (selected.length < count) {
    const fallback: UpgradeOption = {
      id: `overclock_damage_${Date.now()}_${selected.length}`,
      title: 'Overclock: Ordnance Surge',
      description: '+15% Plasma damage and +5000 tactical combat score.',
      icon: 'target',
      rarity: 'rare',
      level: 1,
      maxLevel: 99,
    };
    selected.push(fallback);
  }

  return selected;
}
