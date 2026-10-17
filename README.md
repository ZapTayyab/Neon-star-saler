# ⚡ NEON VANGUARD: OMEGA SECTOR

> **High-Octane 3D Cyberpunk Arena Survivor**  
> Pilot a customizable combat hover-mech against telegraphed rogue drone swarms, unleash kinetic dashes, trigger EMP shockwaves, conquer colossal titan bosses, and warp through Quantum Portals across escalating sectors.

---

## 🎮 Overview & Core Features

- **3D Fast-Paced Arena Combat**: Powered by **Three.js** with procedural particle systems, bloom effects, dynamic lighting, and camera recoil.
- **Telegraphed Enemy Combat System**:
  - **Stalker**: Agile melee drones with predictive targeting.
  - **Sniper**: High-velocity railgun attacks with visible red laser telegraph lines.
  - **Goliath**: Area-of-effect stomp rings and mortar bombardments.
  - **Colossus Titan Boss**: Multi-phase boss encounters every 5 waves with massive laser sweeps and bullet-hell shockwaves.
- **Dynamic Arena Hazards**:
  - **Electric Grid Tiles**: Warning telegraph borders transitioning into high-voltage shock zones.
  - **Laser Sweep Grids**: Procedural energy barriers rotating across the battlefield.
- **Mech Customization & Hangar**:
  - Multiple selectable chassis skins (*Cyan Striker, Crimson Phantom, Golden Sovereign, Void Walker, etc.*) featuring tailored color palettes, custom thrusters, and visual trails.
- **Rogue-lite Upgrade Matrix**:
  - Gain XP, level up, and draft random upgrades: Multi-shot spread, Piercing plasma, Chain Lightning, Kinetic Siphon, Orbital Defensive Drones, and Overclocked Thrusters.
- **Combo & Multiplier Telemetry**:
  - Consecutive eliminations trigger combo streak tiers (*Overdrive, Hyperdrive, Apex Fury*) boosting damage multipliers and visual score counters.
- **Quantum Sector Warp**:
  - Defeat waves to open a spatial wormhole portal warping the mech to new thematic sectors with distinct lighting and escalating difficulty.
- **Synthesizer Web Audio Engine**:
  - Pure procedural Web Audio API synth soundtrack with adaptive combat audio cues, laser blasts, shield recharges, and explosions—no external audio files needed.
- **Cross-Platform Controls**:
  - Keyboard/Mouse and dual virtual touch joystick support with auto-aim assistance on mobile/touch screens.

---

## 🕹️ Controls

### Keyboard & Mouse
| Action | Keybinding |
| :--- | :--- |
| **Move Mech** | `W`, `A`, `S`, `D` or `Arrow Keys` |
| **Aim** | Mouse Pointer (or Auto-aims nearest threat) |
| **Primary Fire** | `Left Click` or `Spacebar` (Auto-fire supported) |
| **Kinetic Dash** | `Shift` (Consumes dash charge, invulnerability frames) |
| **EMP Shockwave** | `E` (100% Charge required; clears bullets & stuns enemies) |
| **Pause / Resume** | `Esc` / `P` |
| **Toggle Audio** | Audio Icon or Mute Button |

### Mobile & Touch Screens
- **Left Virtual Thumbstick**: Smooth directional movement.
- **Right Action Buttons**: Dedicated buttons for **Kinetic Dash** and **EMP Blast**.
- **Targeting**: Automatic intelligent target lock on incoming hostiles.

---

## 🚀 How to Run the Project Locally

### 1. Prerequisites
Ensure you have installed:
- **Node.js** (v18.0.0 or higher recommended, Node 20+ tested)
- **npm** (comes with Node.js) or **bun** / **pnpm**

Check your installation:
```bash
node -v
npm -v
```

---

### 2. Installation

1. Open your terminal in the project directory:
   ```powershell
   cd c:\Users\M-Tayyab\Desktop\my1stgame\Neon-star-saler
   ```
2. Install dependencies:
   ```powershell
   npm install
   ```

---

### 3. Running the Game (Dev Server)

Start the local Vite development server:
```powershell
npm run dev
```

Open your browser at:
```
http://localhost:3000
```

---

### 4. Other Available Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the local dev server on port `3000` with hot-reloading |
| `npm run build` | Compiles and builds the production bundle into `/dist` |
| `npm run preview` | Previews the production build locally |
| `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`) |
| `npm run clean` | Removes `/dist` build artifacts |

---

## 🛠️ Tech Stack & Architecture

- **Frontend Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 8](https://vitejs.dev/)
- **3D Graphics Engine**: [Three.js](https://threejs.org/) (WebGL rendering, procedural geometries, post-processing lights & materials)
- **Styling**: [TailwindCSS v4](https://tailwindcss.com/)
- **Animation**: [Motion](https://motion.dev/) & [canvas-confetti](https://www.npmjs.com/package/canvas-confetti)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Audio Engine**: Custom procedural Web Audio API synthesizers (`audio.ts`)

---

## 📁 Project Structure

```
Neon-star-saler/
├── index.html                  # HTML entry point with retro arcade fonts
├── package.json                # Dependencies and npm scripts
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite & Tailwind configuration
├── src/
│   ├── main.tsx                # React app bootstrapping
│   ├── App.tsx                 # Root application & state orchestrator
│   ├── index.css               # Global theme & typography styles
│   ├── components/             # UI Overlay components
│   │   ├── TitleScreen.tsx     # Start screen & hangar launcher
│   │   ├── GameHUD.tsx         # HP, Shield, EMP, Combo, Wave telemetry
│   │   ├── UpgradeModal.tsx    # Rogue-lite 3-card perk selection modal
│   │   ├── MechHangarModal.tsx # Custom mech skin & chassis selector
│   │   ├── GameOverModal.tsx   # Run statistics & retry screen
│   │   ├── PauseModal.tsx      # Tactical pause screen
│   │   └── TouchControls.tsx   # Mobile on-screen joysticks & buttons
│   └── game/                   # 3D Game Engine & systems
│       ├── engine.ts           # Core game loop, collision, entities & waves
│       ├── arena.ts            # Cyberpunk grid, floating neon pylons, boundaries
│       ├── audio.ts            # Procedural Web Audio synth & FX manager
│       ├── hazards.ts          # Electric floors and laser sweep barriers
│       ├── models.ts           # Procedural 3D mech, drone, and boss meshes
│       ├── particles.ts        # Particle effects (sparks, thruster fire, dust)
│       ├── portal.ts           # Quantum sector warp wormhole gate
│       ├── skins.ts            # Mech hangar skins, palettes, and stats
│       └── types.ts            # Game interfaces, stats, and types
```

---

## 🏆 Tips for High Scores
1. **Maintain Combo Streaks**: Avoid taking damage and chain quick kills to enter **Apex Fury** mode for maximum score and damage boost.
2. **Master the Kinetic Dash**: The dash grants brief invulnerability frames—dash straight through laser sweeps or dense clusters of drone bullets.
3. **Save EMP for Swarms**: Deploy the EMP (`E`) when boxed in or when the Colossus unleashes dense circular bullet barrages.
4. **Quantum Portals**: When a sector is cleared, follow the HUD navigation indicator to locate and enter the Quantum Portal to enter the next sector.
