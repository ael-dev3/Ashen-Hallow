# Ashen-Hallow

Ashen-Hallow is a browser-based fantasy autobattler built with TypeScript and deployed on GitHub Pages. It started as a focused standalone rebuild of an earlier prototype and is now being hardened into a more professional, expandable strategy game with stronger combat identity, clearer faction mechanics, and a better long-term architecture plan.

**Live game:** https://ael-dev3.github.io/Ashen-Hallow/  
**Current version:** `v0.0.05`

## Overview

Ashen-Hallow is built around a fast preparation-and-resolution loop:

- choose a faction
- unlock units and buildings with gold
- place forces on a grid-based battlefield
- carry army progress across rounds
- scale through economy, upgrades, synergies, and tactical positioning
- outlast the opposing warhost before your side collapses

The current playable foundation is focused on deterministic combat, faction asymmetry, and a darker crimson sacred-horror presentation.

## Core gameplay pillars

- **Autobattler combat** — battles resolve automatically once preparation ends
- **Persistent army building** — units and structures matter across rounds
- **Grid deployment** — positioning is a core skill expression layer
- **Faction identity** — Humans and Orcs support distinct playstyles
- **Economy and upgrades** — gold, structures, XP, and timing shape momentum
- **Deterministic gameplay regression coverage** — core combat behaviors are validated through simulation tests

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

The current codebase is stable and playable, but still transitional. Short-term engineering priorities are:

- break oversized simulation and UI files into smaller systems
- move toward more data-driven ability definitions
- improve GitHub/project hygiene, docs, and contributor workflows
- strengthen test coverage and production-readiness guardrails

See:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
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
