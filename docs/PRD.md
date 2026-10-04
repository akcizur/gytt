# GYTT — PRD v2.0

## Vision
A robust browser-native third-person open-world action game with a remastered lightweight direction.

## Non-negotiable
GitHub Pages static deployment. No Python runtime server. No AI-generated assets. CC0/permissive assets only. Mobile is first-class. Physics is fixed-step. Animation visualizes gameplay and never owns gameplay movement. External assets are never mandatory.

## Runtime
TypeScript, Three.js, Rapier 3D, Vite, WebGL2.

## Python
Python 3.12+ for asset validation, license/provenance checks, deterministic world generation, manifests, optimization and CI validation.

## Systems
Core, Input, Player, Locomotion, AnimationGraph, Camera, AssetManager, World, Vehicles, Traffic, Pedestrians, Police, Interaction, Combat, Wanted, Missions, Economy, Save, Audio, UI, Performance.

## Development order
Foundation -> Input -> Physics -> Player -> 8-direction locomotion -> AnimationGraph -> Camera -> AssetManager -> World -> Vehicles -> Interaction -> AI -> Wanted -> Combat -> Missions -> Economy -> Save -> Streaming -> Polish.

## MVP loop
Spawn -> Explore -> Interact -> Enter vehicle -> Drive -> Mission -> Crime/event -> Wanted -> Police -> Escape/combat -> Reward -> Save/load.

## Definition of done
Feature works on desktop, mobile where applicable, has fallback behavior, has no fatal console error, passes typecheck/build and does not break GitHub Pages deployment.