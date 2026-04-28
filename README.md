# Ashen-Hallow

Ashen-Hallow is a browser-based fantasy autobattler built with TypeScript and deployed on GitHub Pages. It started as a focused standalone rebuild of an earlier prototype and is now being hardened into a more professional, expandable strategy game with stronger combat identity, clearer faction mechanics, and a better long-term architecture plan.

**Live game:** https://ael-dev3.github.io/Ashen-Hallow/  
**Current version:** `v0.0.10`

## Overview

Ashen-Hallow is built around a fast preparation-and-resolution loop:

- choose a faction
- unlock units and buildings with gold
- place forces on a grid-based battlefield
- carry army progress across rounds
- scale through economy, upgrades, synergies, and tactical positioning
- outlast the opposing warhost before your side collapses

The current playable foundation now has a clearer TypeScript module spine: domain types, catalog facades, AI planning, battle support helpers, reducer orchestration, rendering viewport state, input interaction mapping, and audio service wiring are separated into focused modules while existing gameplay entry points remain stable.

## v0.0.10 highlights

- Fixed oil-field movement slow so units pay one intended slowed cooldown instead of compounding the slow twice
- Added a regression proving an oil-slowed Goblin can move again after one slowed cooldown window
- Kept existing Archer oil flask behavior and pathing polish while making movement debuffs feel less sticky and more readable

## v0.0.09 highlights

- Fixed human round-damage scaling so Knight, Archer, Sniper, and Mage kill-blow bonuses now affect later attacks instead of only updating round state
- Added a combat regression that proves the +1% human kill-blow bonus changes follow-up damage output
- Kept the v0.0.08 pathfinding, mobile canvas panning, and collapsed debug-monitor polish intact while tightening combat correctness

## v0.0.08 highlights

- Fixed same-lane pathing so blocked units use their true center and deterministic orbit side instead of drifting right from half-cell target math
- Improved fallback movement scoring so units choose valid detours more consistently when the direct cell is occupied
- Added mobile touch-drag panning on the battle canvas while preserving tap-to-place and long-press tooltips
- Collapsed the debug monitor by default so the playable screen feels cleaner while keeping the expand-on-demand diagnostics
- Added regression/architecture coverage for the new pathfinding and input polish gates

## v0.0.07 highlights

- Engine domain types now live in explicit `engine/domain` modules instead of one catch-all game type file
- Unit and building catalogs moved behind production-facing catalog facades
- Enemy AI, reducer helpers, battle support utilities, rendering viewport, render theme, input interactor, and audio service were split into focused modules
- Added an architecture-contract test that enforces module boundaries and file-size budgets alongside gameplay regression coverage
- Fixed the in-game debug overlay mounting path while preserving the current UI and deterministic combat behavior

## v0.0.06 highlights

- Archer Tower upgrades now double tower combat stats, gain additional targets, and ramp attack speed on kills
- Knight upgrades now add stacking damage reduction per upgraded tier
- Goblin Cave spawn tempo now accelerates throughout each round
- Blood Goblin deaths now punish nearby enemies with splash damage
- hovered combat tooltips now expose live HP, bleed, and temporary round buffs for faster battlefield reads

## Core gameplay pillars

- **Autobattler combat** — battles resolve automatically once preparation ends
- **Persistent army building** — units and structures matter across rounds
- **Grid deployment** — positioning is a core skill expression layer
- **Faction identity** — Humans and Orcs support distinct playstyles
- **Economy and upgrades** — gold, structures, XP, and timing shape momentum
- **Deterministic gameplay regression coverage** — core combat behaviors and architecture boundaries are validated through automated tests

## Factions

The player chooses a faction at match start. The AI takes the opposite faction.

### Humans

Humans focus on discipline, ranged pressure, battlefield control, and scaling through precision.

**Units**
- Knight
- Archer
- Sniper
- Mage

**Buildings**
- Gold Mine
- Archer Tower

### Orcs

Orcs focus on swarm pressure, death triggers, brute force, and chaotic snowballing.

**Units**
- Goblin Squad
- Golem
- Blood Mage
- Hobgoblin

**Buildings**
- Gold Mine
- Goblin Cave

## Recent combat upgrades

Recent releases strengthened faction identity and readability with mechanics such as:

- Blood Mages spawning one Blood Goblin per Blood Mage in range for each qualifying death
- Archers chaining extra targets after earning kills in the round
- Archers dropping oil fields on first contact to slow enemy movement
- Mages blinking and generating mirror images on first hit
- Knights applying stacking bleed to units that strike them
- extra battlefield visuals for ability states and influence zones

## Visual direction

Ashen-Hallow is aiming for a distinct blood-lit sacred-horror battlefield rather than a generic browser UI. The current direction emphasizes:

- darker battlefield surfaces
- crimson-led highlights and stronger contrast
- clearer combat silhouettes and status readability
- cleaner game-like framing instead of app-like panels
- ritual-war fantasy atmosphere over placeholder aesthetics

## Technical direction

The current codebase is stable and playable. v0.0.10 keeps the modular TypeScript spine from v0.0.07 and the recent pathfinding/combat polish while tightening oil-field movement timing so slows are applied once instead of compounded. Short-term engineering priorities are:

- break oversized simulation and UI files into smaller systems
- move toward more data-driven ability definitions
- improve GitHub/project hygiene, docs, and contributor workflows
- strengthen test coverage and production-readiness guardrails

See:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`docs/SPACETIMEDB_INTEGRATION.md`](docs/SPACETIMEDB_INTEGRATION.md)
- [`CONTRIBUTING.md`](CONTRIBUTING.md)
- [`SECURITY.md`](SECURITY.md)

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Test

```bash
npm test
```

## GitHub workflows

The repository includes:

- CI validation on pushes and pull requests
- GitHub Pages deployment from `main`
- issue templates for bugs and feature requests
- a pull request template for consistent review hygiene

## Repository notes

- Original prototype reference: https://github.com/ael-dev3/Mechabellum-prototype
- Ashen-Hallow is the dedicated rebuild and now diverges through faction-based combat design, improved AI behavior, more polished visuals, and stronger release discipline

## License

This project is released under [The Unlicense](LICENSE), placing it in the public domain to the fullest extent allowed by law.
