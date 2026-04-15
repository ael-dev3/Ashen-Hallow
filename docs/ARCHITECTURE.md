# Ashen-Hallow v0.0.01 Architecture

Ashen-Hallow starts by migrating the existing prototype feature set into a dedicated production repo while setting up a cleaner base for future modularization.

## Current module groups

- `src/core/config` — runtime constants and versioning
- `src/core/game` — deterministic game rules, catalogs, reducer, battle simulation
- `src/core/ai` — automated preparation logic
- `src/core/rendering` — canvas renderer
- `src/core/input` — board input and camera controls
- `src/core/state` — store wrapper
- `src/ui` — application shell, screens, HUD, buttons, audio
- `src/styles` — styling tokens and screen layout

## v0.0.01 priorities

1. Preserve current mechanics and assets from the prototype.
2. Ship from the Ashen-Hallow repo on GitHub Pages.
3. Lock the release version to `0.0.01`.
4. Use this repo as the stable base for deeper subsystem extraction in subsequent releases.

## Immediate follow-up refactors

- split `GameScreen.ts` into focused HUD, sidebar, overlay, and interaction modules
- split `reducer.ts` into economy, placement, battle, and progression reducers
- restore deterministic regression tests under an ESM-safe setup
- add CI smoke checks and deploy verification
