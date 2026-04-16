# Contributing to Ashen-Hallow

Thanks for contributing.

## Development setup

```bash
npm install
npm run dev
```

## Validation before opening a PR

```bash
npm run build
npm test
```

## Project standards

- preserve deterministic battle behavior
- add or update regression tests for every gameplay mechanic change
- keep unit and building rules documented in UI/tooltips and README when player-facing behavior changes
- prefer small, reviewable pull requests
- avoid hidden mechanics without a tooltip or visible battlefield signal

## Gameplay change checklist

- add a failing regression test first
- verify the mechanic works for both player and enemy teams where applicable
- verify battle visuals still communicate the mechanic clearly
- update docs if the change affects faction identity, roadmap, or architecture

## Architecture direction

Ashen-Hallow is still evolving from a prototype toward a production-ready autobattler. Near-term work should move the codebase toward:

- more data-driven ability definitions
- smaller simulation modules instead of one oversized battle file
- cleaner UI/component boundaries
- stronger CI, testing, and release discipline

## Pull request notes

Include:

- what changed
- why it changed
- how it was tested
- any follow-up refactors still needed
