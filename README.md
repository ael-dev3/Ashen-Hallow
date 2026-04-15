# Ashen-Hallow

Ashen-Hallow is a production-focused fantasy autobattler rebuilt from the Mechabellum prototype into a darker crimson war-game experience with race selection, modular TypeScript systems, mobile-friendly play, and static web deployment.

Current release target: `v0.0.02`

## Live site

GitHub Pages: https://ael-dev3.github.io/Ashen-Hallow/

## Core features

- grid-based deployment and autobattle loop
- persistent placements between rounds
- unit unlocks, XP, upgrades, and race-restricted rosters
- building placement and upgrades
- AI enemy deployment logic with race choice
- audio controls, music, and battle SFX
- mobile-friendly layout for touch screens and portrait play
- GitHub Pages deployment

## Races

At the start of a match, the player chooses a race. The AI also chooses a race for its army.

### Humans

**Units**
- Knight
- Archer
- Sniper
- Mage

**Buildings**
- Gold Mine
- Archer Tower

### Orcs

**Units**
- Goblin Squad
- Golem
- Blood Mage
- Blood Goblin (summoned by Blood Mage)

**Buildings**
- Gold Mine
- Goblin Cave

### Blood Mage

The Orc Blood Mage costs `3g` to unlock and `3g` to place.

- half the damage of a normal Mage
- double the Mage attack range
- 50% slower attack speed than a normal Mage
- attacks all units within range instead of using AOE
- spawns a Blood Goblin at the position of each non-Blood-Goblin unit that dies within its range

Blood Goblins inherit Goblin-style melee swarm behavior and buff alongside regular Goblins as part of the same pack.

## Tech

- TypeScript
- Vite
- Modular game source
- GitHub Actions + GitHub Pages

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Notes

- The original prototype remains untouched at https://github.com/ael-dev3/Mechabellum-prototype
- Ashen-Hallow now diverges from the prototype with race-based faction design, Blood Mage mechanics, and a darker sacred-horror visual direction.
