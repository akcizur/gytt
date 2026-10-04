# GYTT

Browser-native open-world action game DEV.

## Runtime
TypeScript + Three.js + Rapier 3D + Vite + WebGL2.

## Tooling
Python 3.12+ handles asset validation, manifests, deterministic world/content preprocessing and CI checks. Python is never required at runtime.

## GitHub Pages
Production is a static build. GitHub Pages remains the hosting target.

## Development
npm ci
npm run dev
npm run typecheck
npm run build

See docs/PRD.md and docs/ARCHITECTURE.md.