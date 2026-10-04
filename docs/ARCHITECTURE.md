# GYTT Architecture

Input -> Gameplay -> Fixed Physics -> AI -> Animation -> Camera -> Render.

Input sources map to device-independent actions: MOVE_X, MOVE_Y, LOOK_X, LOOK_Y, SPRINT, JUMP, CROUCH, ROLL, INTERACT, AIM, ATTACK.

Player gameplay state owns movement intent. Rapier owns collision resolution. Animation visualizes state. Camera follows gameplay state. AssetManager owns loading, cache and disposal. EventBus is the typed cross-system boundary.

World uses chunk/LOD concepts. Near entities get full simulation; distant entities get simplified simulation.

Asset pipeline: source -> license -> integrity -> normalization -> optimization -> local production asset -> manifest.

Python is a build/content tool only. Browser production is static and GitHub Pages compatible.