# Ashen-Hallow Roadmap

## v0.0.06 - Combat readability and escalation polish

Goals:

- improve combat readability by surfacing live status information on hovered units
- make Human defenses and Orc spawners scale more dynamically inside a round
- keep the expanded combat sandbox deterministic under regression coverage

Delivered in this phase:

- Archer Tower upgrades now double tower combat stats and gain +1 target per tier
- Archer Towers gain +1% round attack speed per kill
- Knight upgrades now grant +10% damage reduction per upgraded tier
- Goblin Cave gains +1% round spawn rate per spawned unit
- Blood Goblin death now splashes 1 damage to nearby enemies within 5 tiles
- combat tooltips now surface live HP, bleed, temporary buffs, and other in-round stats

## v0.0.05 - Foundation hardening

Goals:

- improve documentation and contributor onboarding
- make GitHub workflows and issue intake more professional
- keep the combat sandbox deterministic while abilities expand
- document the migration path away from prototype-style architecture

Delivered in this phase:

- refreshed README and architecture notes
- contributor and security documentation
- GitHub issue templates and PR template
- roadmap for simulation, UI, rendering, AI, and networking evolution

## Near-term roadmap

### 1. Simulation modularization

- split `simulateBattle.ts` into smaller systems/modules
- isolate status effects, on-hit triggers, summons, and movement modifiers
- reduce the amount of per-unit special-casing in the core loop

### 2. Data-driven abilities

- move player-facing ability descriptions into a shared ability catalog
- define trigger/effect metadata in one place
- reduce duplicated logic between tooltips, visuals, and simulation

### 3. UI and UX polish

- break `GameScreen.ts` into focused HUD, tooltip, overlay, and control modules
- improve battlefield readability for status zones and ability ranges
- continue strengthening touch/mobile usability

### 4. Rendering evolution

- keep Canvas stable short-term while ability VFX mature
- evaluate a future WebGL/PixiJS path once unit count and effect density justify it

### 5. AI improvements

- expose AI tuning through config data
- separate drafting, economy, positioning, and combat heuristics
- add difficulty presets without hardcoding behavior everywhere

### 6. Production-readiness track

- stricter browser hardening
- stronger test coverage and CI gates
- release notes and semantic tagging discipline
- future authoritative networking architecture exploration

## Longer-term target

A modern, extensible autobattler stack with:

- modular simulation systems
- data-driven content definitions
- cleaner UI composition
- scalable rendering
- stronger multiplayer-ready deterministic foundations
