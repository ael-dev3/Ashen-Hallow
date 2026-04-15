# Ashen-Hallow

Ashen-Hallow is a production-focused rebuild of the Mechabellum prototype: a fantasy autobattler with persistent deployments, unit unlocks, upgrades, buildings, enemy AI, audio, and round-based tactical combat.

Current release target: `v0.0.01`

## Live site

GitHub Pages: https://ael-dev3.github.io/Ashen-Hallow/

## Scope of v0.0.01

This release migrates the current prototype feature set into a dedicated repo while preserving the core mechanics, assets, music, and combat loop:

- grid-based deployment and autobattle loop
- persistent placements between rounds
- unit unlocks, XP, and upgrades
- building placement and upgrades
- AI enemy deployment logic
- audio controls, music, and battle SFX
- mobile-friendly layout for touch screens and portrait play
- static web deployment through GitHub Pages

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
- Ashen-Hallow v0.0.01 preserves the gameplay feature set while future releases continue the deeper ground-up modular redesign and polish pass.
