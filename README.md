# GYTT — Full Game DEV

A clean-room browser open-world game foundation.

## Stack
- Three.js — rendering
- Rapier 3D — character collision / physics primitives
- NippleJS — mobile dual-stick input
- Vite — development/build

## Current DEV vertical slice
- procedural streamed-style city foundation
- third-person player
- WASD + mouse camera
- mobile dual joystick
- sprint / jump
- collision-aware character controller
- vehicle enter/exit and driving
- ambient traffic
- pedestrians
- mission chain
- wanted meter
- money / local save
- responsive HUD
- GitHub Pages build

## Run
```bash
npm install
npm run dev
```

This branch intentionally uses procedural geometry so the development build starts without downloading external art assets. Art/animation packs can be added later behind the same asset interfaces.

## Controls
Desktop: WASD, mouse, Shift, Space, E, R.

Mobile: left stick = move/drive, right stick = camera, buttons = run/jump/use/reset.

## Next development layers
1. GLTF character + native animation library
2. vehicle collision/handling upgrade
3. road graph + traffic routing
4. pedestrian navigation
5. police AI / wanted chase
6. mission editor/data files
7. audio
8. save slots
9. chunk streaming + LOD
10. combat
