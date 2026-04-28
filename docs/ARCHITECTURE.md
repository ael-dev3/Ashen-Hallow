# Ashen-Hallow Architecture

Ashen-Hallow is a browser-based TypeScript autobattler. v0.0.10 keeps the v0.0.07 production module spine and recent movement/input polish stable while tightening oil-field movement timing so terrain slows are applied predictably.

## Architecture goals

- preserve deterministic combat and seeded AI behavior
- keep browser/UI code separate from pure engine code
- keep large systems behind stable facades while internals become smaller modules
- make future mechanics easier to add without touching state, rendering, AI, and tooltip code at once
- enforce modularity with automated architecture-contract checks

## Runtime layers

### `src/engine/domain`

Pure type modules:

- `primitives.ts` — teams, races, cells, unit/building identifiers
- `entities.ts` — unit, building, deployment, and blueprint shapes
- `events.ts` — SFX, UI messages, battle and round summaries
- `state.ts` — full `GameState`

`src/engine/game/types.ts` remains as a compatibility facade so older imports keep working.

### `src/engine/catalog`

Catalog-backed game content:

- `units.ts` — unit blueprints, movement/stat helpers, unit factory
- `buildings.ts` — building blueprints, upgrade scaling, building factory

`src/engine/game/unitCatalog.ts` and `buildingCatalog.ts` re-export these modules as stable public entry points.

### `src/engine/game`

Game orchestration and compatibility surface:

- `reducer.ts` — action handling and high-level state transitions
- `reducerHelpers.ts` — placement rules, battle lifecycle helpers, building spawns, round summaries, XP application
- `simulateBattle.ts` — public battle-step orchestration
- `grid.ts`, `initialState.ts`, `races.ts`, `upgrades.ts`, `xp.ts` — focused rule helpers

The reducer is now a clearer orchestration layer instead of owning every helper directly.

### `src/engine/battle`

Battle support utilities extracted from the old monolith:

- `simulationSupport.ts` — geometry, targeting helpers, HP/damage bonuses, center-aware movement helpers, spawn helpers, and battle intent types

The public `stepBattle(...)` API is unchanged and remains covered by gameplay regression scenarios.

### `src/engine/ai`

Enemy AI now has a dedicated module path:

- `ai/enemy/enemySpawner.ts` — seeded enemy economy, unlock, placement, building, and mirror-avoidance planning

`game/enemySpawner.ts` is a compatibility facade.

### `src/presentation/rendering`

Canvas rendering is split into state/control and drawing concerns:

- `CanvasRenderer.ts` — render facade and drawing pipeline
- `CanvasViewport.ts` — resize, pan, zoom, layout, and canvas/cell coordinate conversion
- `renderTheme.ts` — battlefield colors and render constants

### `src/presentation/input`

Input is separated from game interaction mapping:

- `CanvasInput.ts` — DOM pointer/wheel listener lifecycle, mouse/touch pan gestures, tap placement, and long-press tooltip handling
- `GameCanvasInteractor.ts` — cell-click-to-game-action mapping
- `inputTypes.ts` — input-facing interfaces

### `src/app/audio`

Audio is now behind a service module:

- `AudioService.ts` — sound preference, music playback, SFX buffering, and service facade
- `app/ui/audio.ts` — compatibility wrapper for current screens

### `src/app/ui`

The current DOM UI remains intentionally lightweight and dependency-free:

- `GameScreen.ts` — screen composition, HUD, overlays, debug monitor, and store/loop wiring
- `screens/game/gameText.ts` — tooltip/stat copy and formatting helpers
- `atoms` — button and tooltip primitives

v0.0.10 keeps the debug monitor collapsed by default for a cleaner player-facing screen while retaining expand-on-demand diagnostics for QA, and keeps combat movement timing covered by deterministic regression scenarios.

## Public compatibility facades

These imports are intentionally preserved:

- `src/engine/game/types.ts`
- `src/engine/game/unitCatalog.ts`
- `src/engine/game/buildingCatalog.ts`
- `src/engine/game/enemySpawner.ts`
- `src/engine/game/simulateBattle.ts`
- `src/app/ui/audio.ts`

This lets tests, scripts, and UI code migrate gradually without a risky full import rewrite in one release.

## Verification gates

The release test command is:

```bash
npm test
```

It runs:

1. TypeScript and Vite production build
2. deterministic gameplay regression scenarios
3. architecture contracts in `scripts/testArchitectureContracts.mjs`

The architecture contract checks required module paths, compatibility facades, and line budgets for former god files.

## Next architecture steps

- split `GameScreen.ts` into panel/overlay view components
- split `CanvasRenderer.ts` drawing into render layers
- move ability descriptions toward shared data used by simulation, UI, AI, and VFX
- introduce small tests for pure selectors, placement rules, viewport math, and AI planning fixtures
- keep compatibility facades until all callers are migrated cleanly
