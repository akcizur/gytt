# GYTT showcase environment assets

The runtime prefers local production files:

- `house.glb`
- `shed.glb`

When a local file is not present, it now falls back to verified public CC0 model sources:

- House: KayKit Medieval Hexagon Pack model mirrored by the jevfire demo repository.
- Shed: Garden Shed from 3DAssets.dev.

Both are loaded with Three.js `GLTFLoader`. The Rapier house/shed colliders remain authored separately in `World.ts`, so visual model scale does not replace gameplay collision.

The shed source is CC0 1.0 and is documented as CORS-enabled for direct Three.js loading. The house source is documented by the upstream demo as CC0 1.0.

For a fully self-contained GitHub Pages build, place your own verified `house.glb` and `shed.glb` in this directory; the local files take priority over the remote fallbacks.
