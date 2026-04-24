# Ashen-Hallow Roadmap

## v0.0.07 - Production TypeScript architecture pass

Goals:

- raise the project quality bar through clearer TypeScript boundaries and smaller modules
- keep current gameplay behavior stable while reshaping internals
- add automated modularity guardrails so the codebase does not drift back into god files
- keep GitHub Pages release flow unchanged and safe

Delivered in this phase:

- domain types moved into `src/engine/domain`
- unit and building catalogs moved into `src/engine/catalog` with compatibility facades
- enemy AI moved into `src/engine/ai/enemy`
- battle geometry, targeting, movement, spawn, and intent helpers moved into `src/engine/battle/simulationSupport.ts`
- reducer helper logic moved into `src/engine/game/reducerHelpers.ts`
- rendering viewport/camera math moved into `src/presentation/rendering/CanvasViewport.ts`
- render constants moved into `src/presentation/rendering/renderTheme.ts`
- canvas input action mapping moved into `src/presentation/input/GameCanvasInteractor.ts`
- audio logic moved behind `src/app/audio/AudioService.ts`
- tooltip copy/format helpers moved into `src/app/ui/screens/game/gameText.ts`
- architecture contract test added to enforce module paths and file-size budgets
- debug overlay mounting path fixed

## v0.0.06 - Combat readability and escalation polish

Delivered in this phase:

- Archer Tower upgrades now double tower combat stats and gain +1 target per tier
- Archer Towers gain +1% round attack speed per kill
- Knight upgrades now grant +10% damage reduction per upgraded tier
- Goblin Cave gains +1% round spawn rate per spawned unit
- Blood Goblin death now splashes 1 damage to nearby enemies within 5 tiles
- combat tooltips now surface live HP, bleed, temporary buffs, and other in-round stats

## v0.0.05 - Foundation hardening

Delivered in this phase:

- refreshed README and architecture notes
- contributor and security documentation
- GitHub issue templates and PR template
- roadmap for simulation, UI, rendering, AI, and networking evolution

## Near-term roadmap

### 1. UI composition

- split `GameScreen.ts` into focused HUD, palette, upgrade, round-result, debug, toast, and canvas-host modules
- keep CSS class names stable during extraction to avoid visual regressions
- add pure selector tests for panel view models

### 2. Battle system modules

- split the current support module into targeting, movement, damage resolution, death effects, status effects, and spawn modules
- preserve `stepBattle(...)` as the public facade until all callers are migrated
- add fixtures for each special ability and deterministic tick ordering

### 3. Data-driven abilities

- move player-facing ability descriptions into a shared ability catalog
- define trigger/effect metadata in one place
- reduce duplicated logic between tooltips, visuals, AI heuristics, and simulation

### 4. Rendering layers

- split `CanvasRenderer.ts` into explicit grid, placement preview, building, effect, unit, and result layers
- keep Canvas stable short-term while ability VFX mature
- evaluate a future WebGL/PixiJS path only when unit count and effect density justify it

### 5. AI planning

- expose AI tuning through config data
- separate drafting, economy, positioning, and combat heuristics
- add deterministic seed fixtures for planner decisions
- add difficulty presets without hardcoding behavior everywhere

### 6. Production readiness

- keep architecture-contract checks in CI
- add release notes and semantic tagging discipline
- strengthen browser hardening over time
- explore future authoritative networking architecture without compromising deterministic local sim

## Longer-term target

A modern, extensible autobattler stack with modular simulation systems, data-driven content definitions, cleaner UI composition, scalable rendering, and stronger multiplayer-ready deterministic foundations.
