# ⚡ NEON VANGUARD: OMEGA SECTOR

> **High-Octane 3D Cyberpunk Arena Survivor & Rogue-Lite Combat Mech Simulator**  
> Pilot a customizable combat hover-mech across dynamic procedural battlefields, evade telegraphed rogue drone swarms, carve spatial rifts with multi-layered supersonic kinetic dashes, deploy clearing EMP shockwaves, survive multi-phase Titan Apex bosses, and warp through Quantum Sector Portals.

---

## 📑 Table of Contents
1. [Overview & Highlights](#-overview--highlights)
2. [Gameplay Mechanics & Combat Systems](#-gameplay-mechanics--combat-systems)
   - [Movement, Supersonic Dash & Volumetric Trail](#1-movement-supersonic-dash--volumetric-trail)
   - [Weaponry, Plasma Projectiles & EMP Shockwave](#2-weaponry-plasma-projectiles--emp-shockwave)
   - [Combo Multiplier & Overdrive Tiers](#3-combo-multiplier--overdrive-tiers)
   - [Dynamic Arena Hazards & Environmental Telegraphs](#4-dynamic-arena-hazards--environmental-telegraphs)
   - [Quantum Portals & Sector Progression](#5-quantum-portals--sector-progression)
3. [Boss Encounters & Titan Apex Encounters](#-boss-encounters--titan-apex-encounters)
4. [Enemy Unit Roster & Attack Telegraphs](#-enemy-unit-roster--attack-telegraphs)
5. [Rogue-Lite Upgrade Matrix & Repeatable Overclocks](#-rogue-lite-upgrade-matrix--repeatable-overclocks)
6. [Hangar & Mech Chassis Customization](#-hangar--mech-chassis-customization)
7. [Procedural Web Audio Engine](#-procedural-web-audio-engine)
8. [Controls & Input Systems](#-controls--input-systems)
9. [Getting Started & Local Installation](#-getting-started--local-installation)
10. [Available NPM Scripts](#-available-npm-scripts)
11. [Architecture & Technical Stack](#-architecture--technical-stack)
12. [Project Directory Structure](#-project-directory-structure)
13. [Tactical Pro-Tips](#-tactical-pro-tips)

---

## 🎮 Overview & Highlights

**Neon Vanguard: Omega Sector** is built from the ground up to bring intense, responsive arcade bullet-hell survival into full 3D in the browser. Powered by **React 19**, **Three.js**, **TailwindCSS v4**, and a zero-dependency procedural **Web Audio API synthesizer**, the game delivers AAA browser-grade visual spectacle and tight combat loops.

- **Zero Asset Dependencies**: All 3D models (mechs, drones, bosses, turrets, wormholes), particle systems, and audio sound effects/music tracks are 100% procedurally synthesized in code.
- **Volumetric Dash VFX System**: Supersonic kinetic dash with 3D cross-ribbon streamers, chrono-ghost afterimages, expanding Mach shockwave vapor rings, and surface plasma repulsor wakes.
- **Multi-Phase Apex Boss Battles**: Bespoke mega-encounters (Goliath Prime, Nexus Colossus, Hyperion Archon) with rotating attack cycles, mortar bombardments, bullet spirals, and escort shield drone escorts.
- **Tactical Arena Hazards**: Floor-level electric grid traps and rotating perimeter laser sweep barriers that demand spatial awareness and timely dashes.
- **Fail-Safe Rogue-Lite Upgrades**: Extensive modular upgrade deck with fallback infinite repeatable overclocks to ensure high-wave runs never bottleneck or soft-lock.
- **Full Cross-Platform Compatibility**: Supports mouse/keyboard precision aiming and dual virtual analog touch joysticks with intelligent target acquisition for mobile devices.

---

## 🕹️ Gameplay Mechanics & Combat Systems

### 1. Movement, Supersonic Dash & Volumetric Trail
- **Inertial Hover Physics**: The Mark-IV hover-mech features smooth momentum gliding, dynamic chassis tilt into turns, and terrain contact shadow mapping.
- **Kinetic Dash (`Shift` or Touch Button)**:
  - Grants instant invulnerability frames (i-frames) allowing the pilot to dash straight through projectile walls and laser sweep beams.
  - Multi-charge dash reserve with individual recharge cooldowns.
  - Upgradable via **Quantum Phase Shunt** (+1 maximum dash charge and extended afterimages).
- **Multi-Layered Dash Trail Engine (`src/game/dashTrail.ts`)**:
  - **Twin Volumetric Cross-Ribbons**: High-speed blade streamers projecting from left and right thrusters in 3D cross orientations for full volume from every camera angle.
  - **Chrono-Ghost Holograms**: Full wireframe and hull silhouette afterimages captured at 28ms intervals along the travel path that fade and decay gracefully.
  - **Supersonic Mach Vapor Rings**: Concentric shockwave displacement rings expanding outwards at the dash origin point.
  - **Ground Repulsor Wake**: Surface-skimming neon plasma decal tracing the hover propulsion footprint.

### 2. Weaponry, Plasma Projectiles & EMP Shockwave
- **Dual Plasma Cannons**: Rapid-fire kinetic plasma bolts with dynamic barrel recoil and muzzle energy sparks.
- **Auto-Aim & Manual Targeting**: Aim freely with the mouse or enable auto-aim lock-on against the nearest threat vector.
- **EMP Tactical Supercell (`E` or Touch Button)**:
  - Consumes 100% EMP energy (generated through enemy takedowns, pickups, and high combo streaks).
  - Unleashes an expanding shockwave clearing all hostile ordnance, canceling enemy attack windups, and stunning swarms in an extensive radius.

### 3. Combo Multiplier & Overdrive Tiers
Eliminating hostiles within the combo timer window builds your streak counter and amplifies your damage multiplier:
| Combo Streak | Tier Name | Visual Glow & HUD Effects | Damage Bonus |
| :--- | :--- | :--- | :--- |
| **0 – 4** | **BASELINE** | Subtle cyan border & telemetry | Standard (1.0x) |
| **5 – 9** | **OVERDRIVE** | Amber glow, animated flame badge | +15% Damage |
| **10 – 19** | **HYPERDRIVE** | Intense orange radiation, pulsating meter | +35% Damage |
| **20+** | **APEX FURY** | Fuchsia/magenta neon surge, spinning apex badge | +60% Damage & Max Score Surge |

Taking damage resets the combo meter unless shielded or mitigated.

### 4. Dynamic Arena Hazards & Environmental Telegraphs
Battlefields are not passive—hostile tactical hazards activate periodically:
- **Electric Grid Tiles**: Hexagonal or square tiles show pulsating amber telegraph warning borders before discharging lethal high-voltage arcs. Walking on energized tiles triggers continuous damage ticks.
- **Laser Sweep Grids**: Massive laser pylons emit concentrated energy barriers that rotate clockwise or counter-clockwise across the arena. Pilots must time their kinetic dash to phase through the beam safely.
- **HUD Tactical Alerts**: The HUD displays `TACTICAL HAZARD TELEGRAPHING // EVADE` warnings prior to hazard activation.

### 5. Quantum Portals & Sector Progression
Clearing waves or destroying Sector Bosses activates a spatial wormhole:
- **Quantum Portal Structure**: Features dual counter-rotating gimbal rings, vertical ion vortex cylinders, glowing base emitters, and a gravitational singularity core.
- **HUD Waypoint & Distance Radar**: The top HUD provides real-time compass distance (`XX M`) and direction telemetry pointing towards the active portal.
- **Sector Themes**: Stepping into the singularity warps the mech into the next sector with dynamic procedural lighting, custom environment fog, and arena recoloring:
  1. **Sector 01: Neon Core** (Sub-Grid Foundry — Electric Cyan & Deep Obsidian)
  2. **Sector 02: Magma Bastion** (Molten Reactor — Radiant Orange & Crimson Ash)
  3. **Sector 03: Void Matrix** (Abyssal Singularity — Deep Violet & Fuchsia Plasma)
  4. **Sector 04: Acid Synthetics** (Bio-Hazard Lab — Emerald Laser & Toxic Green)
  5. **Sector 05: Chrono Sanctum** (Apex Horizon — Solar Gold & Amber Starlight)

---

## 👾 Boss Encounters & Titan Apex Encounters

Apex Bosses spawn every 6 waves and feature dedicated cinematic sirens, real-time boss health bars, and distinct combat phases:

### 1. Goliath Prime (Wave 6) — Heavy Siege Dreadnought
- **Chassis**: Heavy-plated dreadnought prow with twin rear heavy mortar batteries and dual forward autocannons.
- **Phase 1: Siege Artillery**: Fires dual arcing mortar shells that leave burning impact blast zones on the arena floor while strafing with suppressive plasma.
- **Phase 2: Overdrive Frenzy (< 50% HP)**: Fires rapid mortar volleys, increases movement speed, and deploys radial concussive kinetic shockwaves that knock back the player.

### 2. Nexus Colossus (Wave 12) — Planetary Annihilator
- **Chassis**: Giant command platform with four heavy cannon batteries, glowing central overload core, and an impenetrable spherical forcefield shield.
- **Invulnerability Shield & Escort Shield Drones**: Deploys orbital escort drones (`createShieldDrone`) that link forcefield tethers to the boss. Destroying each escort drone breaks the shield and deals 300 feedback damage to the Colossus.
- **Rotating Bullet-Hell Spirals**: Continuously fires dense multi-directional spiral bullet salvos across the entire arena diameter.
- **Phase 2: Super-Laser Sweep (< 50% HP)**: Charges a colossal continuous particle beam and sweeps it across 180° of the battlefield.

### 3. Hyperion Archon (Wave 18+) — The Void Overlord
- **Chassis**: Monolithic obsidian octahedron spire surrounded by a spinning quantum halo ring and 6 orbiting prism laser pylons.
- **Phase 1: Prism Array Barrage**: Alternates between targeted high-velocity railgun beams and perimeter mortar barrages.
- **Phase 2: Singularity Collapse (< 50% HP)**: Summons gravity rifts, unleashes full 360° omni-directional shockwaves, and accelerates projectile velocity.

---

## 🤖 Enemy Unit Roster & Attack Telegraphs

All enemy attacks feature visible visual telegraphs allowing skilled players to evade with precision:

| Enemy Class | Appearance | Combat Behavior | Telegraph Warning |
| :--- | :--- | :--- | :--- |
| **Stalker Drone** | Crimson angular scout with glowing red mono-eye | Swarms the player in packs, attempts high-speed ramming | Flashing red eye indicator and acceleration flare |
| **Vector Sniper** | Tri-wing floating craft with extended railgun barrel | Keeps perimeter distance and charges high-velocity armor-piercing beam | Visible bright red targeting line locking onto player position |
| **Siege Goliath** | Heavy tracked walker with dual mortar barrels | Fires high-trajectory mortar shells over player defenses | Expanding red impact ground rings showing landing ETA |
| **Escort Shield Drone**| Spherical drone with cyan energy dome | Orbits active Apex Bosses, granting invulnerability shields | Glowing holographic energy link tether to the boss core |

---

## ⚡ Rogue-Lite Upgrade Matrix & Repeatable Overclocks

Collecting XP cores dropped by destroyed drones triggers the **Tactical System Overclock Modal** (`UpgradeModal.tsx`). Players select 1 of 3 randomized perks (keyboard shortcuts `1`, `2`, `3` supported).

### Standard Upgrade Protocols
- **Twin Multi-Cannon (`plasma_split`)**: Adds extra parallel plasma bolts to each salvo (Up to Level 4).
- **Flux Accelerator (`rapid_accelerator`)**: +25% Fire Rate & +15% Projectile Velocity (Up to Level 4).
- **Kinetic Overclock (`overclock_thruster`)**: +20% Movement Speed & -20% Dash Recharge Delay (Up to Level 5).
- **High-Density Cores (`plasma_pierce`)**: Plasma shots pierce through +1 additional target (Up to Level 4).
- **Arc Overload (`chain_lightning`)**: Hits arc high-voltage lightning bolts to 2 nearby enemies (Up to Level 3).
- **Siphon Nanites (`siphon_nanite`)**: 18% chance to repair Hull integrity on target takedown (Up to Level 4).
- **Vanguard Aegis Drone (`orbital_drone`)**: Deploys automated escort drones that orbit the mech and fire independent salvos (Up to Level 4).
- **EMP Resonator (`emp_supercharge`)**: +35% EMP Shockwave radius and clears hostile artillery shells (Up to Level 4).
- **Kinetic Shield Battery (`shield_capacitor`)**: +25 Max Shield capacity & reduces shield reboot delay (Up to Level 4).
- **Composite Hull Matrix (`hull_reinforce`)**: +35 Max Hull integrity & instantly repairs 40 HP (Up to Level 4).
- **Quantum Phase Shunt (`dash_overdrive`)**: +1 Maximum Dash Charge & extended invulnerability afterimages (Up to Level 3).
- **Graviton Nanite Scoop (`magnet_nanites`)**: Expands XP and pickup gravitational attraction radius by +120% (Up to Level 3).

### Infinite Repeatable Overclock Protocols
To guarantee that high-level runs never encounter empty modals or soft-locks, the engine provides infinite repeatable overclock protocols:
- **Overclock: Heavy Ordnance**: +15% Plasma damage and increased explosive impact footprint.
- **Overclock: Nanite Restoration**: +25 Max Hull and instantly restores 100% of current Hull and Shields.
- **Overclock: Aegis Barrier**: +20 Max Shield and triggers an immediate instant shield reboot.
- **Overclock: Afterburner Flux**: +10% Movement velocity and +15% Kinetic Dash propulsion force.
- **Overclock: EMP Supercell**: +30% Faster EMP charge generation and grants +5,000 bonus score.

---

## 🎨 Hangar & Mech Chassis Customization

Access the **Combat Mech Hangar** from the title screen to select and preview custom chassis paint schemes and energy conduit tunings:

| Skin Name | Rarity | Primary Aesthetic | Chassis Bonus Trait |
| :--- | :--- | :--- | :--- |
| **Cyan Striker** | Common | Carbon-alloy fuselage with electric cyan superconducting coils | *Balanced Kinetic Matrix* |
| **Crimson Phantom** | Rare | Matte obsidian hull with hyper-reactive crimson plasma injectors | *+15% Threat Velocity* |
| **Solar Aegis** | Epic | Brushed ceramic titanium plated with 24K gold conduits | *Reinforced Kinetic Plating* |
| **Void Cyber-Oni** | Epic | Deep violet metamaterial with electric fuchsia accents | *Phase-Space Agility* |
| **Toxic Synthetics**| Rare | Reinforced ballistic resin with bio-luminescent acid green fuel | *Corrosive Trail Dissipation* |
| **Apex Singularity**| Legendary| Monolithic zero-friction alloy with blinding white antimatter pulses | *Hyper-Velocity Surge* |

*Skin choices are automatically saved to `localStorage` and persist across play sessions.*

---

## 🔊 Procedural Web Audio Engine

The game contains **zero external MP3/WAV files**, guaranteeing zero audio 404 errors, zero network latency, and instant loading:
- **Dynamic Synth Bassline & Arpeggios**: Pure oscillator-driven combat soundtrack that steps in tempo with combat intensity.
- **Bespoke Synthesized Sound FX**:
  - `playDash`: Dual-oscillator sub-bass frequency sweep layered with bandpass white noise burst.
  - `playLaser` & `playEnemyLaser`: High-frequency pitch drop sweeps with resonant filtering.
  - `playEMP`: Sub-bass rumble followed by white-noise expansion and high-resonance sweep.
  - `playBossIntroSiren`: Sinusoidal alarm siren with low-frequency modulation.
  - `playBossLaserCharge` & `playBossLaserFire`: Rising resonant charge tones with sustained laser hum.
  - `playBossShockwave`: High-impact dual square wave impact with decay.
  - `playComboStreak`: Musical melodic chime escalating in pitch with higher combo streaks.
  - `playPortalSpawn` & `playPortalWarp`: Frequency modulated harmonic chord progression.

---

## 🎮 Controls & Input Systems

### Keyboard & Mouse
| Action | Keybinding |
| :--- | :--- |
| **Move Mech** | `W`, `A`, `S`, `D` or `Arrow Keys` |
| **Aim Mech Turret** | Mouse Pointer (auto-aim assists when pointer is stationary) |
| **Primary Fire** | `Left Click` or `Spacebar` (Hold for continuous fire) |
| **Kinetic Dash** | `Shift` (Consumes dash charge, triggers invulnerability frames) |
| **EMP Shockwave** | `E` (Requires 100% EMP charge) |
| **Upgrade Selection** | `1`, `2`, `3` or Mouse Click |
| **Tactical Pause** | `Esc` or `P` |
| **Toggle Audio** | Top-Right Audio Icon |

### Mobile & Touch Controls
- **Left Virtual Analog Joystick**: Full 360° omnidirectional movement control.
- **Right Virtual Action Buttons**: Dedicated high-contrast touch buttons for **DASH** and **EMP**.
- **Auto-Targeting Subsystem**: Automatically computes the nearest hostile threat and directs plasma fire seamlessly.

---

## 🚀 Getting Started & Local Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher (Node 20+ recommended)
- **npm**: v9+ (or **bun** / **pnpm**)

Verify your installed versions:
```bash
node -v
npm -v
```

### 1. Clone & Navigate
```bash
git clone https://github.com/ZapTayyab/Neon-star-saler.git
cd Neon-star-saler
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Launch Development Server
```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 📜 Available NPM Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Runs the local development server on port `3000` with hot-module replacement |
| `npm run build` | Compiles TypeScript and creates optimized production bundle in `/dist` |
| `npm run preview` | Runs a local preview server for the compiled `/dist` output |
| `npm run lint` | Performs strict TypeScript type checks without emitting files (`tsc --noEmit`) |
| `npm run clean` | Removes `/dist` and temporary build artifacts |

---

## 🏗️ Architecture & Technical Stack

```
+-------------------------------------------------------------------------+
|                              REACT 19 UI                                |
|  [TitleScreen]  [GameHUD]  [UpgradeModal]  [MechHangar]  [TouchControls] |
+------------------------------------+------------------------------------+
                                     | Telemetry & State Callbacks
+------------------------------------v------------------------------------+
|                         CORE THREE.JS ENGINE                            |
|                            (engine.ts)                                  |
|  - Frame Tick Game Loop             - Dynamic Hazard Controller         |
|  - Spatial Collision Grid           - Wave & Boss Spawner State Machine |
|  - Entity Pools & Garbage-Free Math - Quantum Portal Warp Engine        |
+----------+-------------------+--------------------+--------------------+
           |                   |                    |
+----------v---------+ +-------v----------+ +-------v----------+
|    3D MODELS       | |  DASH TRAIL VFX  | | PROCEDURAL AUDIO |
|   (models.ts)      | |  (dashTrail.ts)  | |   (audio.ts)     |
| - Mark-IV Mech     | | - Cross-Ribbons  | | - Synth Bassline |
| - Stalker/Sniper   | | - Chrono-Ghosts  | | - Laser/EMP SFX  |
| - 3 Titan Bosses   | | - Mach Rings     | | - Boss Sirens    |
+--------------------+ +------------------+ +------------------+
```

- **Frontend Core**: [React 19](https://react.dev/) with [TypeScript 7](https://www.typescriptlang.org/)
- **Rendering & 3D Math**: [Three.js r186](https://threejs.org/) (WebGL rendering, procedural geometry extrusion, custom shaders, dynamic lighting)
- **UI & Styling**: [TailwindCSS v4](https://tailwindcss.com/) with native `@tailwindcss/vite`
- **Animations & Micro-Interactions**: [Motion](https://motion.dev/) & [canvas-confetti](https://www.npmjs.com/package/canvas-confetti)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Audio Architecture**: Pure Web Audio API (`AudioContext`, `BiquadFilterNode`, `OscillatorNode`, `GainNode`)

---

## 📁 Project Directory Structure

```
Neon-star-saler/
├── index.html                  # HTML5 entry with retro sci-fi typography imports
├── package.json                # Project dependencies and executable scripts
├── tsconfig.json               # Strict TypeScript compiler options
├── vite.config.ts              # Vite 8 configuration with React & Tailwind plugins
├── src/
│   ├── main.tsx                # React DOM root bootstrapping
│   ├── App.tsx                 # Root application lifecycle & state orchestrator
│   ├── index.css               # Global arcade fonts, scanline overlay, and styling
│   ├── components/             # React UI HUD & Overlay Modules
│   │   ├── TitleScreen.tsx     # Main menu, hangar trigger, and game launcher
│   │   ├── GameHUD.tsx         # HP, Shield, EMP, Combo, Wave, Sector, Boss telemetry
│   │   ├── UpgradeModal.tsx    # Rogue-lite 3-card perk drafting with key shortcuts
│   │   ├── MechHangarModal.tsx # 3D Mech skin selector with live preview
│   │   ├── GameOverModal.tsx   # Run stats, high scores, and quick retry
│   │   ├── PauseModal.tsx      # Tactical combat pause menu
│   │   └── TouchControls.tsx   # Dual virtual touch joysticks & mobile HUD buttons
│   └── game/                   # Pure TypeScript 3D Game Systems
│       ├── engine.ts           # Game loop, entity management, boss phases, collision
│       ├── arena.ts            # Cyberpunk grid floor, sector themes, perimeter pylons
│       ├── audio.ts            # Procedural synthesizer engine (music + combat SFX)
│       ├── dashTrail.ts        # Volumetric cross-ribbon & chrono-ghost afterimages
│       ├── hazards.ts          # Electric grid floor tiles and rotating laser barriers
│       ├── models.ts           # Procedural 3D geometries for mechs, drones, and bosses
│       ├── particles.ts        # Particle effects (explosions, sparks, thruster plumes)
│       ├── portal.ts           # Quantum sector warp wormhole gate and vortex
│       ├── skins.ts            # Mech skin catalog, color palettes, and persistence
│       ├── types.ts            # TypeScript interfaces, stats, and entity contracts
│       └── upgrades.ts         # Upgrade deck, perk definitions, and fallback pools
```

---

## 🏆 Tactical Pro-Tips

1. **Phase Through Projectiles**: The kinetic dash (`Shift`) provides invulnerability frames. Do not hesitate to dash directly forward through dense walls of enemy bullets.
2. **Prioritize Vector Snipers**: Snipers deal heavy armor-piercing damage from the arena perimeter. Dash toward their red targeting line before the beam solidifies and discharges.
3. **Escort Shield Drone Strategy**: When battling the **Nexus Colossus**, do not waste primary ammunition on the boss's invincible energy barrier. Hunt down the orbiting **Shield Drones** first to trigger massive feedback damage.
4. **Maintain Apex Fury**: Chaining 20+ eliminations without taking damage activates **Apex Fury** (+60% Damage boost and maximum score multipliers).
5. **Save EMP for Emergency Clears**: If boxed into an electric hazard tile with incoming mortar rounds, hit `E` to immediately detonate the EMP, clearing all incoming artillery and stunning surrounding hostiles.
6. **Follow the Portal Radar**: As soon as a wave or boss is eliminated, monitor the top HUD waypoint indicator to locate the Quantum Portal and enter the next sector.

---

## 📄 License
This project is open-source under the MIT License. Created with passion for fast-paced cyberpunk arcade combat.
