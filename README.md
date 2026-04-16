# Ashen-Hallow

Ashen-Hallow is a browser-based fantasy autobattler built in TypeScript and designed for GitHub Pages deployment. Inspired by early Mechabellum-style prototype gameplay, it has been rebuilt into a more focused standalone strategy game with a darker sacred-horror identity, cleaner UI, modular systems, and mobile-friendly play.

**Live game:** https://ael-dev3.github.io/Ashen-Hallow/  
**Current version:** `v0.0.02`

## Overview

In Ashen-Hallow, players prepare a warhost on a grid, invest gold into new units and structures, and then watch rounds resolve through automatic combat. Placements persist across rounds, so every unlock, upgrade, and positioning choice shapes the long-term flow of the match.

The game is structured around fast strategic decisions:
- choose a race at match start
- unlock units and buildings over time
- expand your battlefield presence across multiple rounds
- counter the opposing army’s composition
- scale through upgrades, synergies, and economic choices

## Core Gameplay

Ashen-Hallow combines several layers of autobattler strategy:
- **grid-based deployment** for pre-battle positioning
- **persistent armies** that carry between rounds
- **gold-based progression** for unlocks, placements, and economy
- **unit XP and upgrades** that reward surviving and performing units
- **building support** for income and battlefield pressure
- **AI opposition** with race-based rosters and automated deployment logic

The goal is to create an army that snowballs efficiently while adapting to the enemy’s composition and momentum.

## Factions

Every match begins with a faction choice. The player selects a race, and the AI fields its own race-based army.

### Humans
Humans focus on disciplined ranged pressure and classic fantasy frontline control.

**Units**
- Knight
- Archer
- Sniper
- Mage

**Buildings**
- Gold Mine
- Archer Tower

### Orcs
Orcs focus on swarm pressure, brutal board presence, death triggers, and chaotic momentum.

**Units**
- Goblin Squad
- Golem
- Blood Mage
- Hobgoblin

**Buildings**
- Gold Mine
- Goblin Cave

## Visual Direction

Ashen-Hallow is being developed around a distinct crimson, blood-lit, sacred-horror atmosphere rather than a generic web-app aesthetic. The project aims for a stronger “game” presentation through:
- darker, moodier battlefield surfaces
- crimson-led faction accents
- cleaner, more intentional UI framing
- reduced reliance on generic gradient-heavy styling
- a haunted fantasy tone that feels more ritualistic and warlike

## Technical Highlights

- **TypeScript-first architecture**
- **modular gameplay systems** for engine, app, and presentation layers
- **Vite-based web build**
- **GitHub Actions + GitHub Pages** deployment pipeline
- **mobile-friendly layout** designed for touch and portrait-friendly play

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

## Project Notes

- The original prototype remains untouched: https://github.com/ael-dev3/Mechabellum-prototype
- Ashen-Hallow is the standalone rebuild and now diverges through race-based faction design, modular TypeScript systems, improved presentation, and new faction mechanics.
