# Ashen-Hallow

Ashen-Hallow is a browser-based fantasy autobattler built with TypeScript and deployed on GitHub Pages. Originally inspired by an early Mechabellum-style prototype, the project has been rebuilt as a standalone strategy game with modular systems, faction-based rosters, persistent round-to-round army growth, and a darker crimson sacred-horror identity.

**Live game:** https://ael-dev3.github.io/Ashen-Hallow/  
**Current version:** `v0.0.02`

## Overview

Ashen-Hallow is designed around quick strategic preparation followed by automatic combat resolution. Players build a warhost over multiple rounds, balancing economy, positioning, upgrades, and faction identity while adapting to the opposing army.

Each match revolves around a simple but expandable loop:
- choose a faction at the start of the game
- unlock units and buildings with gold
- position forces on a grid-based battlefield
- carry surviving forces and structures into future rounds
- scale through upgrades, synergies, and economic momentum
- defeat the enemy warhost before your own side collapses

## Core Gameplay Pillars

- **Autobattler combat** — battles resolve automatically once preparation ends
- **Persistent army building** — units and structures remain relevant across rounds
- **Grid deployment** — pre-battle placement matters as much as composition
- **Faction identity** — Humans and Orcs field distinct rosters and strategic tools
- **Economy and upgrades** — gold, structures, XP, and timing decisions shape long-term advantage
- **AI opposition** — the enemy drafts the opposite faction, deploys armies, and places buildings as part of its strategy

## Factions

Every match begins with a faction choice. The AI automatically takes the opposite faction to create clearer asymmetry and matchup variety.

### Humans
Humans emphasize disciplined ranged pressure, conventional battlefield control, and scaling through steady tactical efficiency.

**Units**
- Knight
- Archer
- Sniper
- Mage

**Buildings**
- Gold Mine
- Archer Tower

### Orcs
Orcs emphasize swarm pressure, death-trigger mechanics, brute force, and chaotic momentum through aggressive board presence.

**Units**
- Goblin Squad
- Golem
- Blood Mage
- Hobgoblin

**Buildings**
- Gold Mine
- Goblin Cave

## Visual Direction

Ashen-Hallow is being shaped around a distinct crimson, blood-lit, sacred-horror presentation rather than a generic web-app look. The project direction focuses on:
- darker and moodier battlefield surfaces
- crimson-led accents and harsher contrast
- cleaner UI framing with a stronger game-like feel
- less generic gradient-heavy styling
- a haunting fantasy atmosphere built around ritual, warfare, and decay

## Technical Highlights

- **TypeScript-first codebase**
- **Modular architecture** across engine, app, and presentation layers
- **Vite-based frontend build pipeline**
- **GitHub Actions + GitHub Pages deployment**
- **Mobile-friendly layout** tuned for smaller screens and touch interaction
- **Regression-tested gameplay systems** for core battle and faction mechanics

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

## Repository Notes

- Original prototype reference: https://github.com/ael-dev3/Mechabellum-prototype
- Ashen-Hallow is the standalone rebuild and now diverges through faction-based design, improved AI behavior, modular TypeScript systems, and a dedicated visual direction.

## License

This project is released under [The Unlicense](LICENSE), which places it in the public domain to the fullest extent allowed by law.
