# GYTT

A free/open-source GTA-like browser game foundation for GitHub Pages.

## Runtime stack

- Three.js — rendering
- Rapier 3D — character physics and collision
- three-mesh-bvh — accelerated raycasts
- Vite — build
- NippleJS 1.0.4 — dual virtual mobile joysticks (MIT)
- GitHub Actions + GitHub Pages — automatic deployment

## Gameplay foundation

- Third-person character controller
- Analog 2-stick mobile controls
- Desktop WASD fallback
- Dual-stick orbit camera on touch
- Sprint and jump
- Vehicle enter/exit + analog driving
- Traffic and pedestrian simulation
- Procedural chunk streaming
- Distance/shadow LOD
- Mission HUD
- CC0 model and animation pipeline

## Open-source asset sources

All runtime art is sourced from free/public-domain packs or explicitly marked as CC0 by their publishers.

| Pack | License | Source |
|---|---|---|
| Kenney City Kit Roads | CC0 1.0 | https://kenney.nl/assets/city-kit-roads |
| Kenney City Kit Suburban | CC0 1.0 | https://kenney.nl/assets/city-kit-suburban |
| Kenney Car Kit | CC0 1.0 | https://kenney.nl/assets/car-kit |
| Quaternius Universal Base Characters | CC0 1.0 | https://quaternius.com/packs/universalbasecharacters.html |
| Quaternius Universal Animation Library | CC0 1.0 | https://quaternius.com/packs/universalanimationlibrary.html |
| Quaternius Universal Animation Library 2 | CC0 1.0 | https://quaternius.com/packs/universalanimationlibrary2.html |

The browser runtime mirrors are documented in `src/game/AssetRegistry.js`.

## Mobile controls

Left stick: move.
Right stick: camera.
RUN: sprint.
JUMP: jump.
E: enter/exit vehicle.
RESET: respawn.

The control layer uses NippleJS 1.0.4 with a dead-zone, analog force, safe-area layout, two simultaneous joystick zones, and haptic feedback where supported.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

Every push to `main` is configured to build and deploy through `.github/workflows/pages.yml`.
