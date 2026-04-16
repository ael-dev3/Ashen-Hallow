# Ashen-Hallow Architecture

Ashen-Hallow is currently in a transition phase between a fast-moving prototype and a production-ready autobattler foundation.

## Current state

The game is playable, deterministic, and regression-tested, but several systems are still too centralized:

- combat simulation is concentrated in a large `simulateBattle.ts`
- UI behavior and tooltip copy still rely on a heavyweight `GameScreen.ts`
- many mechanics require touching simulation, rendering, state types, and UI text at the same time
- content expansion is still more imperative than data-driven

## Current module groups

- `src/engine/config` — runtime constants and versioning
- `src/engine/game` — rules, catalogs, reducer, deterministic battle simulation
- `src/engine/ai` — AI drafting and placement logic
- `src/presentation/rendering` — canvas battlefield rendering
- `src/presentation/input` — board interaction and camera controls
- `src/app/ui` — menus, screens, HUD, audio, tooltips

## v0.0.06 priorities

1. keep the game playable and deterministic while mechanics expand
2. make combat-state information visible enough for players to parse live fights quickly
3. support more round-scaling building behaviors without breaking reducer/sim consistency
4. continue documenting a credible path away from prototype-style file sprawl

## v0.0.05 priorities

1. keep the game playable and deterministic while mechanics expand
2. improve project professionalism through docs, templates, and release hygiene
3. make current mechanics easier to understand visually and through tooltips
4. document a credible path away from prototype-style file sprawl

## Near-term architecture goals

### 1. Simulation modularization

Refactor battle logic out of one oversized file into focused systems/modules such as:

- target selection
- movement resolution
- on-hit effects
- summons and death triggers
- status effects
- per-frame / per-tick damage processing

### 2. Data-driven abilities

Introduce a shared ability catalog so the same source can drive:

- simulation triggers/effects
- tooltip copy
- UI metadata
- future AI heuristics
- future VFX tagging

### 3. Cleaner UI boundaries

Split `GameScreen.ts` into smaller modules/components for:

- HUD
- right/left side panels
- tooltip rendering
- battle overlays
- interaction state

### 4. Rendering evolution

Short-term: keep Canvas stable and improve battlefield readability.

Mid-term:

- formalize render-only metadata for effects/zones
- reduce logic leaking into renderer decisions
- evaluate PixiJS/WebGL when unit counts and VFX density justify it

### 5. AI separation

Move the AI toward more explicit, configurable layers:

- economy decisions
- unlock decisions
- composition selection
- placement strategy
- difficulty tuning via config instead of hardcoded heuristics

### 6. Production-readiness track

The long-term architecture should support:

- stricter browser hardening
- stronger deterministic tests and CI gates
- eventual authoritative networking concepts
- persistence/progression support without rewriting the whole game core

## Guiding principles

- deterministic first
- data over hardcoded condition chains where practical
- visuals must communicate mechanics clearly
- every gameplay change should have regression coverage
- refactor toward extensibility without stalling playable progress
