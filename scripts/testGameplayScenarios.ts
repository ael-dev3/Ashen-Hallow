import { GAME_CONFIG } from '../src/engine/config/gameConfig';
import { GameScreen } from '../src/app/ui/screens/GameScreen';
import { createBuilding, getBuildingBlueprint } from '../src/engine/game/buildingCatalog';
import { spawnEnemyUnits } from '../src/engine/game/enemySpawner';
import { isPlayerDeployableCell } from '../src/engine/game/grid';
import { createInitialGameState } from '../src/engine/game/initialState';
import { gameReducer } from '../src/engine/game/reducer';
import { stepBattle } from '../src/engine/game/simulateBattle';
import { createUnit, getUnitBlueprint } from '../src/engine/game/unitCatalog';
import { xpRequiredForTier } from '../src/engine/game/xp';
import { getUpgradeAllSummary } from '../src/engine/game/upgrades';
import type { CellCoord, DeploymentUnit, GameState } from '../src/engine/game/types';

const fail = (message: string): never => {
  throw new Error(message);
};

const assertEqual = <T>(actual: T, expected: T, message: string): void => {
  if (actual !== expected) {
    fail(`${message} (expected ${String(expected)}, got ${String(actual)})`);
  }
};

const assertOk = (value: unknown, message: string): void => {
  if (!value) {
    fail(message);
  }
};

const assertApproxEqual = (actual: number, expected: number, tolerance: number, message: string): void => {
  if (Math.abs(actual - expected) > tolerance) {
    fail(`${message} (expected ${expected} ± ${tolerance}, got ${actual})`);
  }
};

const assertDeepEqual = (
  actual: Record<string, unknown>,
  expected: Record<string, unknown>,
  message: string
): void => {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) {
    fail(`${message} (expected ${expectedText}, got ${actualText})`);
  }
};

const runTest = (name: string, testFn: () => void): void => {
  try {
    testFn();
    console.log(`[pass] ${name}`);
  } catch (error) {
    console.error(`[fail] ${name}`);
    throw error;
  }
};

const findFirstPlayerDeployableCell = (state: GameState): CellCoord => {
  for (let y = 0; y < state.grid.rows; y++) {
    for (let x = 0; x < state.grid.cols; x++) {
      const cell = { x, y };
      if (
        isPlayerDeployableCell(
          state.grid,
          cell,
          state.turn,
          GAME_CONFIG.flankColsPerSide,
          GAME_CONFIG.flankUnlockTurn
        )
      ) {
        return cell;
      }
    }
  }
  throw new Error('No player deployable cell found.');
};

const assertFullGoblinSquad = (deployments: readonly DeploymentUnit[]): void => {
  assertEqual(deployments.length, 6, 'Goblin Squad should occupy all 6 cells of its 3x2 formation.');
  const keys = new Set(deployments.map(deployment => `${deployment.x},${deployment.y}`));
  assertEqual(keys.size, 6, 'Goblin Squad cells should be unique.');

  const xs = deployments.map(deployment => deployment.x);
  const ys = deployments.map(deployment => deployment.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  assertEqual(maxX - minX + 1, 3, 'Goblin Squad width should stay 3 cells.');
  assertEqual(maxY - minY + 1, 2, 'Goblin Squad height should stay 2 cells.');

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      assertOk(keys.has(`${x},${y}`), `Missing Goblin Squad cell ${x},${y}.`);
    }
  }
};

runTest('enemy mirror avoidance replaces a whole placement instead of spawning a singleton goblin', () => {
  const initial = createInitialGameState();
  const result = spawnEnemyUnits({
    grid: initial.grid,
    playerUnits: [createUnit({ id: 1, team: 'PLAYER', type: 'KNIGHT', x: 5, y: 12 })],
    buildings: [],
    existingEnemyDeployments: [],
    nextUnitId: 100,
    nextBuildingId: 1,
    rngSeed: 2,
    turn: 3,
    enemyGoldDebtNextTurn: 0,
    enemyGold: 1,
    enemyUnlockedUnits: {
      KNIGHT: true,
      GOBLIN: true,
      BLOOD_GOBLIN: false,
      ARCHER: false,
      SNIPER: false,
      MAGE: false,
      BLOOD_MAGE: false,
      GOLEM: false,
      HOBGOBLIN: false,
    },
    enemyPlacementSlots: 1,
    enemyNextPlacementSlotCost: 2,
    enemyRace: 'ORC',
  });

  const goblinDeployments = result.enemyDeployments.filter(deployment => deployment.type === 'GOBLIN');
  assertFullGoblinSquad(goblinDeployments);
});

runTest('enemy AI can take a loan to create an opening deployment', () => {
  const initial = createInitialGameState();
  const result = spawnEnemyUnits({
    grid: initial.grid,
    playerUnits: [],
    buildings: [],
    existingEnemyDeployments: [],
    nextUnitId: 1,
    nextBuildingId: 1,
    rngSeed: 1,
    turn: 1,
    enemyGoldDebtNextTurn: 0,
    enemyGold: 0,
    enemyUnlockedUnits: {
      KNIGHT: false,
      GOBLIN: false,
      BLOOD_GOBLIN: false,
      ARCHER: false,
      SNIPER: false,
      MAGE: false,
      BLOOD_MAGE: false,
      GOLEM: false,
      HOBGOBLIN: false,
    },
    enemyPlacementSlots: 1,
    enemyNextPlacementSlotCost: 2,
    enemyRace: 'HUMAN',
  });

  assertOk(result.enemyDeployments.length > 0, 'Enemy loan should enable at least one opening placement.');
  assertEqual(result.nextEnemyGoldDebtNextTurn, 3, 'Enemy loan should schedule 3 gold debt for the next turn.');
});

runTest('enemy always chooses the opposite race', () => {
  assertEqual(createInitialGameState('HUMAN').enemyRace, 'ORC', 'Human player should always face Orc enemy.');
  assertEqual(createInitialGameState('ORC').enemyRace, 'HUMAN', 'Orc player should always face Human enemy.');
});

runTest('enemy AI can place one race-legal building and does not stack extras immediately', () => {
  const initial = createInitialGameState('HUMAN');
  const first = spawnEnemyUnits({
    grid: initial.grid,
    playerUnits: [],
    buildings: [],
    existingEnemyDeployments: [],
    nextUnitId: 1,
    nextBuildingId: 1,
    rngSeed: 7,
    turn: 1,
    enemyGoldDebtNextTurn: 0,
    enemyGold: 3,
    enemyUnlockedUnits: {
      KNIGHT: false,
      GOBLIN: false,
      BLOOD_GOBLIN: false,
      ARCHER: false,
      SNIPER: false,
      MAGE: false,
      BLOOD_MAGE: false,
      GOLEM: false,
      HOBGOBLIN: false,
    },
    enemyPlacementSlots: 1,
    enemyNextPlacementSlotCost: 2,
    enemyRace: 'ORC',
  });

  const enemyBuildingsAfterFirst = first.buildings.filter(building => building.team === 'ENEMY');
  assertEqual(enemyBuildingsAfterFirst.length, 1, 'Enemy AI should place a single building, not stack multiples at once.');
  assertOk(
    enemyBuildingsAfterFirst.every(building => building.type === 'GOLD_MINE' || building.type === 'GOBLIN_CAVE'),
    'Enemy AI should only place buildings allowed by its race.'
  );

  const second = spawnEnemyUnits({
    grid: initial.grid,
    playerUnits: [],
    buildings: first.buildings,
    existingEnemyDeployments: first.enemyDeployments,
    nextUnitId: first.nextUnitId,
    nextBuildingId: first.nextBuildingId,
    rngSeed: first.nextSeed,
    turn: 2,
    enemyGoldDebtNextTurn: first.nextEnemyGoldDebtNextTurn,
    enemyGold: 10,
    enemyUnlockedUnits: first.nextEnemyUnlockedUnits,
    enemyPlacementSlots: first.nextEnemyPlacementSlots,
    enemyNextPlacementSlotCost: first.nextEnemyNextPlacementSlotCost,
    enemyRace: 'ORC',
  });

  assertEqual(
    second.buildings.filter(building => building.team === 'ENEMY').length,
    1,
    'Enemy AI should not keep adding extra buildings once it already has one on board.'
  );
});
runTest('goblin upgrades cost 1g per squad and upgrade the whole squad together', () => {
  const initial = createInitialGameState('ORC', 'HUMAN');
  const unlocked = gameReducer(initial, { type: 'SELECT_UNIT', unitType: 'GOBLIN' });
  const placed = gameReducer(unlocked, { type: 'PLACE_UNIT', cell: findFirstPlayerDeployableCell(unlocked) });
  const readyXp = xpRequiredForTier('GOBLIN', 1);
  const readyState: GameState = {
    ...placed,
    phase: 'INTERMISSION',
    gold: 1,
    deployments: placed.deployments.map(d => ({ ...d, xp: readyXp, tier: d.tier ?? 1 })),
    units: placed.units.map(u => ({ ...u, xp: readyXp })),
  };

  const singleUpgrade = gameReducer(readyState, { type: 'UPGRADE_UNIT', unitId: readyState.deployments[0].id });
  assertEqual(singleUpgrade.gold, 0, 'Upgrading one Goblin Squad should cost exactly 1 gold total.');
  assertOk(singleUpgrade.deployments.every(d => (d.tier ?? 1) === 2), 'Every goblin in the selected squad should level together.');

  const freshUnlocked = gameReducer(initial, { type: 'SELECT_UNIT', unitType: 'GOBLIN' });
  const firstCell = findFirstPlayerDeployableCell(freshUnlocked);
  const firstPlaced = gameReducer({ ...freshUnlocked, placementSlots: 2, gold: 3 }, { type: 'PLACE_UNIT', cell: firstCell });
  const secondCell = { x: firstCell.x + 4, y: firstCell.y };
  const secondPlaced = gameReducer(firstPlaced, { type: 'PLACE_UNIT', cell: secondCell });
  const secondReady: GameState = {
    ...secondPlaced,
    phase: 'INTERMISSION',
    gold: 2,
    deployments: secondPlaced.deployments.map(d => ({ ...d, xp: readyXp, tier: d.tier ?? 1 })),
    units: secondPlaced.units.map(u => ({ ...u, xp: readyXp, tier: u.tier ?? 1 })),
  };
  const summary = getUpgradeAllSummary(secondReady);
  assertEqual(summary.cost, 2, 'Upgrade All UI should charge once per Goblin Squad, not once per Goblin.');
  assertEqual(summary.readyCount, 2, 'Upgrade All UI should count ready squads, not individual Goblins.');
  const upgradedAll = gameReducer(secondReady, { type: 'UPGRADE_ALL_UNITS' });
  assertEqual(upgradedAll.gold, 0, 'Two Goblin Squads should cost 2 gold total to upgrade.');
  assertOk(upgradedAll.deployments.every(d => (d.tier ?? 1) === 2), 'Upgrade All should level both goblin squads fully.');
});

runTest('human AI favors archer towers and mages in a ranged gameplan', () => {
  const initial = createInitialGameState('ORC', 'HUMAN');
  const result = spawnEnemyUnits({
    grid: initial.grid,
    playerUnits: [
      createUnit({ id: 1, team: 'PLAYER', type: 'GOBLIN', x: 5, y: 12 }),
      createUnit({ id: 2, team: 'PLAYER', type: 'GOBLIN', x: 6, y: 12 }),
      createUnit({ id: 3, team: 'PLAYER', type: 'GOBLIN', x: 7, y: 12 }),
      createUnit({ id: 4, team: 'PLAYER', type: 'GOLEM', x: 10, y: 12 }),
    ],
    buildings: [],
    existingEnemyDeployments: [],
    nextUnitId: 1,
    nextBuildingId: 1,
    rngSeed: 12345,
    turn: 6,
    enemyGoldDebtNextTurn: 0,
    enemyGold: 15,
    enemyUnlockedUnits: initial.enemyUnlockedUnits,
    enemyPlacementSlots: 2,
    enemyNextPlacementSlotCost: 2,
    enemyRace: 'HUMAN',
  });

  const enemyBuildings = result.buildings.filter(building => building.team === 'ENEMY');
  assertOk(enemyBuildings.some(building => building.type === 'ARCHER_TOWER'), 'Human AI should prefer building an Archer Tower when playing a ranged defensive plan.');
  assertOk(result.enemyDeployments.some(unit => unit.type === 'MAGE'), 'Human AI should lean toward recruiting Mages in this matchup.');
});

runTest('units move directly toward an archer tower instead of stalling into neutral staging', () => {
  const initial = createInitialGameState('ORC', 'HUMAN');
  const playerKnight = {
    ...createUnit({ id: 1, team: 'PLAYER', type: 'KNIGHT', x: 0, y: 10 }),
    attackCooldownMs: 999,
    moveCooldownMs: 0,
  };
  const enemyTower = createBuilding({ id: 2, team: 'ENEMY', type: 'ARCHER_TOWER', x: 10, y: 10, tier: 1, upgradeReady: true });

  const result = stepBattle({
    grid: initial.grid,
    units: [playerKnight],
    buildings: [enemyTower],
    deltaMs: 100,
  });

  const nextKnight = result.units.find(unit => unit.id === playerKnight.id);
  assertOk(!!nextKnight, 'Knight should still be alive after the first movement tick.');
  assertOk((nextKnight?.x ?? 0) > playerKnight.x, 'Units should advance toward the Archer Tower horizontally when it is the only target.');
  assertEqual(nextKnight?.y ?? 0, playerKnight.y, 'Units should not drift into neutral staging when pathing to a lone building.');
});

runTest('archer tower damages enemies in range during battle', () => {
  const initial = createInitialGameState('HUMAN', 'ORC');
  const tower = createBuilding({ id: 1, team: 'PLAYER', type: 'ARCHER_TOWER', x: 10, y: 10, tier: 1, upgradeReady: true });
  const enemyGoblin = {
    ...createUnit({ id: 2, team: 'ENEMY', type: 'GOBLIN', x: 11, y: 11 }),
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };

  const result = stepBattle({
    grid: initial.grid,
    units: [enemyGoblin],
    buildings: [tower],
    deltaMs: 100,
  });

  const damagedGoblin = result.units.find(unit => unit.id === enemyGoblin.id);
  assertOk(!damagedGoblin, 'Archer Tower should kill a tier-1 goblin in range.');
});

runTest('archer tower upgrade increases damage and max hp', () => {
  const initial = createInitialGameState('HUMAN', 'ORC');
  const upgraded = gameReducer({
    ...initial,
    phase: 'INTERMISSION',
    gold: 10,
    buildings: [createBuilding({ id: 1, team: 'PLAYER', type: 'ARCHER_TOWER', x: 10, y: 10, tier: 1, upgradeReady: true })],
  }, { type: 'UPGRADE_BUILDING', buildingType: 'ARCHER_TOWER' });

  const tower = upgraded.buildings.find(building => building.type === 'ARCHER_TOWER' && building.team === 'PLAYER');
  assertOk(!!tower, 'Archer Tower should still exist after upgrading.');
  assertEqual(tower?.tier ?? 0, 2, 'Archer Tower should level up to tier 2.');
  assertEqual(tower?.maxHp ?? 0, 200, 'Archer Tower max HP should scale with tier.');
});

runTest('tier-2 archer tower hits an additional target and doubles damage', () => {
  const initial = createInitialGameState('HUMAN', 'ORC');
  const tower = createBuilding({ id: 1, team: 'PLAYER', type: 'ARCHER_TOWER', x: 10, y: 10, tier: 2, upgradeReady: true });
  const enemyKnightA = {
    ...createUnit({ id: 2, team: 'ENEMY', type: 'KNIGHT', x: 11, y: 11 }),
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };
  const enemyKnightB = {
    ...createUnit({ id: 3, team: 'ENEMY', type: 'KNIGHT', x: 12, y: 11 }),
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };

  const result = stepBattle({
    grid: initial.grid,
    units: [enemyKnightA, enemyKnightB],
    buildings: [tower],
    deltaMs: 100,
  });

  const nextKnightA = result.units.find(unit => unit.id === enemyKnightA.id);
  const nextKnightB = result.units.find(unit => unit.id === enemyKnightB.id);
  assertOk(!!nextKnightA, 'First enemy Knight should survive the tower shot.');
  assertOk(!!nextKnightB, 'Second enemy Knight should also be targeted after the tower upgrade.');
  assertEqual(nextKnightA?.hp ?? 0, enemyKnightA.hp - 8, 'Tier-2 Archer Tower should deal double base damage to its first target.');
  assertEqual(nextKnightB?.hp ?? 0, enemyKnightB.hp - 8, 'Tier-2 Archer Tower should gain one extra target per upgrade.');
});

runTest('knight upgrades add 10% damage reduction per upgraded level', () => {
  const initial = createInitialGameState('HUMAN', 'ORC');
  const tierOneKnight = {
    ...createUnit({ id: 1, team: 'PLAYER', type: 'KNIGHT', x: 10, y: 10, tier: 1 }),
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };
  const tierThreeKnight = {
    ...createUnit({ id: 2, team: 'PLAYER', type: 'KNIGHT', x: 12, y: 10, tier: 3 }),
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };
  const enemyArcherA = {
    ...createUnit({ id: 3, team: 'ENEMY', type: 'ARCHER', x: 10, y: 14 }),
    attackCooldownMs: 0,
    moveCooldownMs: 999,
  };
  const enemyArcherB = {
    ...createUnit({ id: 4, team: 'ENEMY', type: 'ARCHER', x: 12, y: 14 }),
    attackCooldownMs: 0,
    moveCooldownMs: 999,
  };

  const result = stepBattle({
    grid: initial.grid,
    units: [tierOneKnight, tierThreeKnight, enemyArcherA, enemyArcherB],
    buildings: [],
    deltaMs: 100,
  });

  const nextTierOneKnight = result.units.find(unit => unit.id === tierOneKnight.id);
  const nextTierThreeKnight = result.units.find(unit => unit.id === tierThreeKnight.id);
  assertOk(!!nextTierOneKnight, 'Tier-1 Knight should survive the comparison hit.');
  assertOk(!!nextTierThreeKnight, 'Tier-3 Knight should survive the comparison hit.');
  assertEqual(nextTierOneKnight?.hp ?? 0, tierOneKnight.hp - 4, 'Baseline Knight should take the Archer full hit.');
  assertEqual(nextTierThreeKnight?.hp ?? 0, tierThreeKnight.hp - 3.2, 'Tier-3 Knight should reduce incoming damage by 20%.');
});

runTest('archer tower gains 1% attack speed each time it gets a kill until round end', () => {
  const initial = createInitialGameState('HUMAN', 'ORC');
  const tower = createBuilding({ id: 1, team: 'PLAYER', type: 'ARCHER_TOWER', x: 10, y: 10, tier: 1, upgradeReady: true });
  const doomedGoblin = {
    ...createUnit({ id: 2, team: 'ENEMY', type: 'GOBLIN', x: 11, y: 11 }),
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };
  const enemyKnight = {
    ...createUnit({ id: 3, team: 'ENEMY', type: 'KNIGHT', x: 12, y: 11 }),
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };

  const result = stepBattle({
    grid: initial.grid,
    units: [doomedGoblin, enemyKnight],
    buildings: [tower],
    deltaMs: 100,
  });

  const nextTower = result.buildings.find(building => building.id === tower.id);
  assertOk(!!nextTower, 'Archer Tower should still exist after the kill.');
  assertOk(!result.units.some(unit => unit.id === doomedGoblin.id), 'Archer Tower should get the kill that grants attack speed.');
  assertApproxEqual(nextTower?.attackCooldownMs ?? 0, 750 / 1.01, 0.1, 'Archer Tower should attack slightly faster after each kill in the round.');
});

runTest('goblin cave gains 1% spawn rate each time it spawns until round end', () => {
  const initial = createInitialGameState('ORC', 'HUMAN');
  const cave = createBuilding({ id: 1, team: 'PLAYER', type: 'GOBLIN_CAVE', x: 2, y: 2, tier: 1, spawnCooldownMs: 1000 });
  const playerKnight = {
    ...createUnit({ id: 2, team: 'PLAYER', type: 'KNIGHT', x: 10, y: 10 }),
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };
  const enemyKnight = {
    ...createUnit({ id: 3, team: 'ENEMY', type: 'KNIGHT', x: 30, y: 10 }),
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };

  const nextState = gameReducer({
    ...initial,
    phase: 'BATTLE',
    units: [playerKnight, enemyKnight],
    buildings: [cave],
    nextUnitId: 4,
    battleTimeMs: 0,
    result: null,
  }, { type: 'TICK', deltaMs: 1000 });

  const nextCave = nextState.buildings.find(building => building.id === cave.id);
  assertOk(!!nextCave, 'Goblin Cave should remain after spawning.');
  assertEqual(nextState.units.filter(unit => unit.type === 'GOBLIN' && unit.team === 'PLAYER').length, 1, 'Goblin Cave should spawn its goblin.');
  assertApproxEqual(nextCave?.spawnCooldownMs ?? 0, 1000 / 1.01, 0.1, 'Goblin Cave should slightly shorten its next spawn interval after each spawn.');
});

runTest('combat unit tooltip exposes live hp, bleed, and other combat stats', () => {
  const state = createInitialGameState('HUMAN', 'ORC');
  const knight = {
    ...createUnit({ id: 1, team: 'PLAYER', type: 'KNIGHT', x: 10, y: 10, tier: 3 }),
    hp: 37,
    bleedStacks: 2,
    roundDamageBonusPct: 0.15,
    roundKillBlows: 1,
  };
  const text = (GameScreen.prototype as any).getCellTooltipText.call({}, { ...state, phase: 'BATTLE', units: [knight] }, { x: 10, y: 10 }) as string | null;

  assertOk(!!text, 'Combat hover should show a tooltip for highlighted units.');
  assertOk(text?.includes('HP 37/48'), 'Combat tooltip should show the unit\'s remaining HP.');
  assertOk(text?.includes('Bleed 2'), 'Combat tooltip should show active bleed stacks.');
  assertOk(text?.includes('DMG reduction 20%'), 'Combat tooltip should show Knight damage reduction from upgrades.');
  assertOk(text?.includes('Round ATK +15%'), 'Combat tooltip should show temporary combat buffs.');
});

runTest('building placement does not consume unit placement slots', () => {
  const initial = createInitialGameState();
  const placementCell = findFirstPlayerDeployableCell(initial);
  const state: GameState = {
    ...initial,
    phase: 'INTERMISSION',
    turn: 3,
    gold: 10,
    placementSlots: 1,
    placementsUsedThisTurn: 1,
    selectedBuildingType: 'GOLD_MINE',
    unlockedBuildings: {
      ...initial.unlockedBuildings,
      GOLD_MINE: true,
    },
    message: null,
  };

  const nextState = gameReducer(state, { type: 'PLACE_BUILDING', cell: placementCell });

  assertEqual(nextState.buildings.length, 1, 'Building should place even when all unit placement slots are used.');
  assertEqual(nextState.placementsUsedThisTurn, 1, 'Building placement must not change unit placement usage.');
  assertEqual(
    nextState.gold,
    10 - getBuildingBlueprint('GOLD_MINE').placementCost,
    'Building placement should still charge its gold cost.'
  );
});

runTest('ranged units hold position when already in diagonal range but waiting on cooldown', () => {
  const initial = createInitialGameState();
  const archer = {
    ...createUnit({ id: 1, team: 'PLAYER', type: 'ARCHER', x: 4, y: 10 }),
    attackCooldownMs: 600,
    moveCooldownMs: 0,
  };
  const knight = {
    ...createUnit({ id: 2, team: 'ENEMY', type: 'KNIGHT', x: 5, y: 9 }),
    attackCooldownMs: 600,
    moveCooldownMs: 600,
  };

  const result = stepBattle({
    grid: initial.grid,
    units: [archer, knight],
    buildings: [],
    deltaMs: 100,
  });

  const nextArcher = result.units.find(unit => unit.id === archer.id);
  const nextKnight = result.units.find(unit => unit.id === knight.id);
  if (!nextArcher) {
    fail('Archer should still be alive after a no-attack cooldown tick.');
  }
  if (!nextKnight) {
    fail('Knight should still be alive after a no-attack cooldown tick.');
  }
  const archerAfterTick = nextArcher!;
  const knightAfterTick = nextKnight!;
  assertDeepEqual(
    { x: archerAfterTick.x, y: archerAfterTick.y },
    { x: archer.x, y: archer.y },
    'Archer should hold position instead of jittering while already in diagonal range.'
  );
  assertDeepEqual(
    { x: knightAfterTick.x, y: knightAfterTick.y },
    { x: knight.x, y: knight.y },
    'Target unit should remain in place when its own move cooldown has not expired.'
  );
});

runTest('goblin squad gains 10% damage per nearby allied goblin within radius 10', () => {
  const initial = createInitialGameState();
  const goblinA = {
    ...createUnit({ id: 1, team: 'PLAYER', type: 'GOBLIN', x: 4, y: 10 }),
    attackCooldownMs: 0,
  };
  const goblinB = {
    ...createUnit({ id: 2, team: 'PLAYER', type: 'GOBLIN', x: 6, y: 10 }),
    attackCooldownMs: 0,
  };
  const knightNear = {
    ...createUnit({ id: 3, team: 'ENEMY', type: 'KNIGHT', x: 4, y: 9 }),
    hp: 1.1,
    maxHp: 16,
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };
  const knightFar = {
    ...createUnit({ id: 4, team: 'ENEMY', type: 'KNIGHT', x: 20, y: 20 }),
    hp: 1.1,
    maxHp: 16,
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };

  const buffedResult = stepBattle({
    grid: initial.grid,
    units: [goblinA, goblinB, knightNear],
    buildings: [],
    deltaMs: 100,
  });

  const unbuffedResult = stepBattle({
    grid: initial.grid,
    units: [goblinA, knightFar],
    buildings: [],
    deltaMs: 100,
  });

  assertOk(
    !buffedResult.units.some(unit => unit.id === knightNear.id),
    'Buffed goblin should deal 1.1 damage and defeat a 1.1 HP target when another goblin is nearby.'
  );
  assertOk(
    unbuffedResult.units.some(unit => unit.id === knightFar.id),
    'Single goblin should still deal base damage and fail to defeat a 1.1 HP target without nearby allies.'
  );
});

runTest('race selection limits the player roster for humans and orcs', () => {
  const humanState = createInitialGameState('HUMAN', 'ORC');
  assertEqual(humanState.selectedUnitType, 'KNIGHT', 'Human games should default to Knight selection.');
  assertEqual(humanState.selectedBuildingType, 'GOLD_MINE', 'Human games should default to Gold Mine selection.');

  const humanGoblinUnlockAttempt = gameReducer(humanState, { type: 'SELECT_UNIT', unitType: 'GOBLIN' });
  assertEqual(humanGoblinUnlockAttempt.gold, humanState.gold, 'Humans should not spend gold on Orc-only units.');
  assertOk(!humanGoblinUnlockAttempt.unlockedUnits.GOBLIN, 'Humans should not be able to unlock Goblin Squad.');

  const orcState = createInitialGameState('ORC', 'HUMAN');
  assertEqual(orcState.selectedUnitType, 'GOBLIN', 'Orc games should default to Goblin Squad selection.');
  assertEqual(orcState.selectedBuildingType, 'GOLD_MINE', 'Orc games should default to Gold Mine selection.');

  const orcTowerUnlockAttempt = gameReducer(orcState, { type: 'SELECT_BUILDING', buildingType: 'ARCHER_TOWER' });
  assertEqual(orcTowerUnlockAttempt.gold, orcState.gold, 'Orcs should not spend gold on Human-only buildings.');
  assertOk(!orcTowerUnlockAttempt.unlockedBuildings.ARCHER_TOWER, 'Orcs should not be able to unlock Archer Tower.');

  const orcHobgoblinSelect = gameReducer(orcState, { type: 'SELECT_UNIT', unitType: 'HOBGOBLIN' });
  assertEqual(orcHobgoblinSelect.selectedUnitType, 'HOBGOBLIN', 'Orcs should be able to select Hobgoblin.');
});

runTest('hobgoblin uses double knight baseline stats and cleave data', () => {
  const knight = createUnit({ id: 1, team: 'PLAYER', type: 'KNIGHT', x: 5, y: 5 });
  const hobgoblin = createUnit({ id: 2, team: 'PLAYER', type: 'HOBGOBLIN', x: 6, y: 5 });
  const knightBlueprint = getUnitBlueprint('KNIGHT');
  const hobgoblinBlueprint = getUnitBlueprint('HOBGOBLIN');

  assertEqual(hobgoblin.maxHp, knight.maxHp * 2, 'Hobgoblin HP should be double Knight HP.');
  assertEqual(hobgoblinBlueprint.attackDamage, knightBlueprint.attackDamage * 2, 'Hobgoblin ATK should be double Knight ATK.');
  assertEqual(hobgoblinBlueprint.unlockCost, 2, 'Hobgoblin unlock cost should be 2g.');
  assertEqual(hobgoblinBlueprint.placementCost, 2, 'Hobgoblin placement cost should be 2g.');
  assertOk((hobgoblinBlueprint.aoeRadius ?? 0) > 0, 'Hobgoblin should have cleave damage.');
});

runTest('hobgoblins gain max hp from nearby hobgoblins and goblin deaths in range for the round', () => {
  const initial = createInitialGameState('ORC', 'HUMAN');
  const hobgoblinA = {
    ...createUnit({ id: 1, team: 'PLAYER', type: 'HOBGOBLIN', x: 10, y: 10 }),
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };
  const hobgoblinB = {
    ...createUnit({ id: 2, team: 'PLAYER', type: 'HOBGOBLIN', x: 12, y: 10 }),
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };
  const doomedGoblin = {
    ...createUnit({ id: 3, team: 'PLAYER', type: 'GOBLIN', x: 11, y: 10 }),
    hp: 1,
    maxHp: 1,
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };
  const enemyKnight = {
    ...createUnit({ id: 4, team: 'ENEMY', type: 'KNIGHT', x: 11, y: 11 }),
    attackCooldownMs: 0,
    moveCooldownMs: 999,
  };

  const result = stepBattle({
    grid: initial.grid,
    units: [hobgoblinA, hobgoblinB, doomedGoblin, enemyKnight],
    buildings: [],
    deltaMs: 100,
  });

  const buffedHobgoblins = result.units.filter(unit => unit.type === 'HOBGOBLIN');
  assertEqual(buffedHobgoblins.length, 2, 'Both Hobgoblins should survive the setup.');
  const expectedHp = 32 * 1.11;
  for (const hobgoblin of buffedHobgoblins) {
    assertEqual(hobgoblin.maxHp, expectedHp, 'Nearby Hobgoblin and Goblin death buffs should stack on Hobgoblin max HP.');
    assertEqual(hobgoblin.hp, expectedHp, 'The max HP buff should also grant current HP for the round.');
  }
});

runTest('blood mage attacks enemies in range without friendly fire', () => {
  const initial = createInitialGameState('ORC', 'HUMAN');
  const bloodMage = {
    ...createUnit({ id: 1, team: 'PLAYER', type: 'BLOOD_MAGE', x: 10, y: 10 }),
    attackCooldownMs: 0,
  };
  const alliedGoblin = {
    ...createUnit({ id: 2, team: 'PLAYER', type: 'GOBLIN', x: 12, y: 10 }),
    hp: 1.5,
    maxHp: 1.5,
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };
  const enemyKnight = {
    ...createUnit({ id: 3, team: 'ENEMY', type: 'KNIGHT', x: 11, y: 10 }),
    hp: 1.5,
    maxHp: 16,
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };

  const result = stepBattle({
    grid: initial.grid,
    units: [bloodMage, alliedGoblin, enemyKnight],
    buildings: [],
    deltaMs: 100,
  });

  assertOk(result.units.some(unit => unit.id === alliedGoblin.id), 'Blood Mage should not damage allied units.');
  assertOk(!result.units.some(unit => unit.id === enemyKnight.id), 'Blood Mage should still damage enemy units in range.');
});

runTest('blood goblin death deals 1 damage to all nearby enemy units within 5 range', () => {
  const initial = createInitialGameState('ORC', 'HUMAN');
  const bloodGoblin = {
    ...createUnit({ id: 1, team: 'PLAYER', type: 'BLOOD_GOBLIN', x: 10, y: 10 }),
    hp: 1,
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };
  const enemyKnightNear = {
    ...createUnit({ id: 2, team: 'ENEMY', type: 'KNIGHT', x: 11, y: 10 }),
    attackCooldownMs: 0,
    moveCooldownMs: 999,
  };
  const enemyKnightFar = {
    ...createUnit({ id: 3, team: 'ENEMY', type: 'KNIGHT', x: 20, y: 10 }),
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };

  const result = stepBattle({
    grid: initial.grid,
    units: [bloodGoblin, enemyKnightNear, enemyKnightFar],
    buildings: [],
    deltaMs: 100,
  });

  const nextNearKnight = result.units.find(unit => unit.id === enemyKnightNear.id);
  const nextFarKnight = result.units.find(unit => unit.id === enemyKnightFar.id);
  assertOk(!result.units.some(unit => unit.id === bloodGoblin.id), 'Blood Goblin should die in the setup attack.');
  assertOk(!!nextNearKnight, 'Nearby enemy should survive the splash test.');
  assertOk(!!nextFarKnight, 'Far enemy should survive the splash test.');
  assertEqual(nextNearKnight?.hp ?? 0, enemyKnightNear.hp - 1, 'Nearby enemy should take 1 Blood Goblin death damage.');
  assertEqual(nextFarKnight?.hp ?? 0, enemyKnightFar.hp, 'Distant enemy should not take Blood Goblin death damage.');
});

runTest('each blood mage in range spawns blood goblins into nearest open cells for a death in range', () => {
  const initial = createInitialGameState('ORC', 'HUMAN');
  const bloodMageA = {
    ...createUnit({ id: 1, team: 'PLAYER', type: 'BLOOD_MAGE', x: 10, y: 10 }),
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };
  const bloodMageB = {
    ...createUnit({ id: 2, team: 'PLAYER', type: 'BLOOD_MAGE', x: 14, y: 10 }),
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };
  const bloodMageC = {
    ...createUnit({ id: 3, team: 'PLAYER', type: 'BLOOD_MAGE', x: 12, y: 14 }),
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };
  const doomedKnight = {
    ...createUnit({ id: 4, team: 'ENEMY', type: 'KNIGHT', x: 12, y: 10 }),
    hp: 1,
    maxHp: 16,
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };
  const killerGoblin = {
    ...createUnit({ id: 5, team: 'PLAYER', type: 'GOBLIN', x: 11, y: 10 }),
    attackCooldownMs: 0,
    moveCooldownMs: 999,
  };

  const result = stepBattle({
    grid: initial.grid,
    units: [bloodMageA, bloodMageB, bloodMageC, doomedKnight, killerGoblin],
    buildings: [],
    deltaMs: 100,
  });

  assertOk(!result.units.some(unit => unit.id === doomedKnight.id), 'The target unit should die in the setup.');
  const spawnedBloodGoblins = result.units.filter(unit => unit.type === 'BLOOD_GOBLIN');
  assertEqual(spawnedBloodGoblins.length, 3, 'A single death with three Blood Mages in range should create three Blood Goblins.');
  assertEqual(
    new Set(spawnedBloodGoblins.map(unit => `${unit.x},${unit.y}`)).size,
    3,
    'Blood Goblins from the same death should occupy distinct nearest open cells.'
  );
  assertOk(
    spawnedBloodGoblins.every(unit => Math.abs(unit.x - doomedKnight.x) + Math.abs(unit.y - doomedKnight.y) <= 1),
    'Blood Goblins should use the nearest open cells around the death location.'
  );
});

runTest('blood goblin inherits the tier of the dead unit', () => {
  const initial = createInitialGameState('ORC', 'HUMAN');
  const bloodMage = {
    ...createUnit({ id: 1, team: 'PLAYER', type: 'BLOOD_MAGE', x: 10, y: 10 }),
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };
  const doomedTierThreeKnight = {
    ...createUnit({ id: 2, team: 'ENEMY', type: 'KNIGHT', x: 12, y: 10, tier: 3 }),
    hp: 0.8,
    maxHp: getUnitBlueprint('KNIGHT').maxHp * 3,
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };
  const killerGoblin = {
    ...createUnit({ id: 3, team: 'PLAYER', type: 'GOBLIN', x: 11, y: 10 }),
    attackCooldownMs: 0,
    moveCooldownMs: 999,
  };

  const result = stepBattle({
    grid: initial.grid,
    units: [bloodMage, doomedTierThreeKnight, killerGoblin],
    buildings: [],
    deltaMs: 100,
  });

  const spawnedBloodGoblin = result.units.find(unit => unit.type === 'BLOOD_GOBLIN');
  assertEqual(spawnedBloodGoblin?.tier ?? 0, 3, 'Blood Goblin tier should match the dead unit tier.');
});

runTest('human units gain 1% round damage per killing blow', () => {
  const initial = createInitialGameState('HUMAN', 'ORC');
  const archer = {
    ...createUnit({ id: 1, team: 'PLAYER', type: 'ARCHER', x: 10, y: 10 }),
    attackCooldownMs: 0,
    moveCooldownMs: 999,
  };
  const doomedGoblin = {
    ...createUnit({ id: 2, team: 'ENEMY', type: 'GOBLIN', x: 10, y: 12 }),
    hp: 1,
    maxHp: 1,
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };

  const result = stepBattle({
    grid: initial.grid,
    units: [archer, doomedGoblin],
    buildings: [],
    deltaMs: 100,
  });

  const buffedArcher = result.units.find(unit => unit.id === archer.id);
  assertOk(!!buffedArcher, 'The archer should survive the setup.');
  assertEqual(buffedArcher?.roundDamageBonusPct ?? 0, 0.01, 'A human unit should gain 1% round damage per killing blow.');
});

runTest('archer gains one additional in-range target per kill for the rest of the round', () => {
  const initial = createInitialGameState('HUMAN', 'ORC');
  const archer = {
    ...createUnit({ id: 1, team: 'PLAYER', type: 'ARCHER', x: 10, y: 10 }),
    attackCooldownMs: 0,
    moveCooldownMs: 999,
  };
  const firstDoomedGoblin = {
    ...createUnit({ id: 2, team: 'ENEMY', type: 'GOBLIN', x: 10, y: 12 }),
    hp: 1,
    maxHp: 1,
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };

  const firstStep = stepBattle({
    grid: initial.grid,
    units: [archer, firstDoomedGoblin],
    buildings: [],
    deltaMs: 100,
  });

  const buffedArcher = firstStep.units.find(unit => unit.id === archer.id);
  assertOk(!!buffedArcher, 'The archer should survive the first setup.');

  const secondDoomedGoblin = {
    ...createUnit({ id: 3, team: 'ENEMY', type: 'GOBLIN', x: 9, y: 12 }),
    hp: 1,
    maxHp: 1,
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };
  const thirdDoomedGoblin = {
    ...createUnit({ id: 4, team: 'ENEMY', type: 'GOBLIN', x: 11, y: 12 }),
    hp: 1,
    maxHp: 1,
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };

  const secondStep = stepBattle({
    grid: initial.grid,
    units: [buffedArcher!, secondDoomedGoblin, thirdDoomedGoblin],
    buildings: [],
    deltaMs: 750,
  });

  const survivingTargets = secondStep.units.filter(unit => unit.team === 'ENEMY');
  assertEqual(
    survivingTargets.length,
    0,
    'After one kill this round, the archer should hit two in-range enemy units with its next attack.'
  );
});

runTest('mage blinks backward on first hit and creates four 10% mirror images', () => {
  const initial = createInitialGameState('HUMAN', 'ORC');
  const mage = {
    ...createUnit({ id: 1, team: 'PLAYER', type: 'MAGE', x: 10, y: 10, tier: 3, xp: 5 }),
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };
  const enemyArcher = {
    ...createUnit({ id: 2, team: 'ENEMY', type: 'ARCHER', x: 10, y: 13 }),
    attackCooldownMs: 0,
    moveCooldownMs: 999,
  };

  const result = stepBattle({
    grid: initial.grid,
    units: [mage, enemyArcher],
    buildings: [],
    deltaMs: 100,
  });

  const survivingMages = result.units.filter(unit => unit.type === 'MAGE' && unit.team === 'PLAYER');
  assertEqual(survivingMages.length, 5, 'The original mage should survive and create four mirror images.');

  const blinkingMage = survivingMages.find(unit => unit.id === mage.id);
  assertOk(!!blinkingMage, 'The original mage should still exist after blinking.');
  assertEqual(blinkingMage?.x ?? -1, 10, 'The blink should preserve the mage lane when space is open.');
  assertEqual(blinkingMage?.y ?? -1, 5, 'The mage should blink five cells backward away from the attacker.');

  const mirrorImages = survivingMages.filter(unit => unit.id !== mage.id);
  assertEqual(mirrorImages.length, 4, 'Exactly four mirror images should spawn.');
  assertOk(
    mirrorImages.every(unit => unit.tier === 3 && unit.xp === 5),
    'Mirror images should inherit the mage tier and XP.'
  );
  assertOk(
    mirrorImages.every(unit => unit.maxHp === 2.1 && unit.hp === 2.1),
    'Mirror images should inherit 10% of the mage stats.'
  );
});

runTest('knight applies stacking end-of-round bleed to attackers that hit it', () => {
  const initial = createInitialGameState('HUMAN', 'ORC');
  const knight = {
    ...createUnit({ id: 1, team: 'PLAYER', type: 'KNIGHT', x: 10, y: 10 }),
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };
  const enemyArcher = {
    ...createUnit({ id: 2, team: 'ENEMY', type: 'ARCHER', x: 10, y: 12 }),
    attackCooldownMs: 0,
    moveCooldownMs: 999,
  };

  const firstStep = stepBattle({
    grid: initial.grid,
    units: [knight, enemyArcher],
    buildings: [],
    deltaMs: 1000,
  });

  const firstBleedingArcher = firstStep.units.find(unit => unit.id === enemyArcher.id);
  assertOk(!!firstBleedingArcher, 'The archer should survive the first bleed tick.');
  assertEqual(firstBleedingArcher?.bleedStacks ?? 0, 1, 'A unit that hits a Knight should gain one bleed stack.');
  assertEqual(firstBleedingArcher?.hp ?? 0, 7.92, 'First bleed stack should deal 1% max HP over one second.');

  const secondStep = stepBattle({
    grid: initial.grid,
    units: [knight, { ...firstBleedingArcher!, attackCooldownMs: 0 }],
    buildings: [],
    deltaMs: 1000,
  });

  const secondBleedingArcher = secondStep.units.find(unit => unit.id === enemyArcher.id);
  assertOk(!!secondBleedingArcher, 'The archer should survive the second bleed tick.');
  assertEqual(secondBleedingArcher?.bleedStacks ?? 0, 2, 'Repeated hits on a Knight should stack bleed.');
  assertEqual(secondBleedingArcher?.hp ?? 0, 7.76, 'Second hit should raise bleed to 2% max HP per second.');
});

runTest('archer drops an oil flask the first time an enemy enters range and slows movement in the area', () => {
  const initial = createInitialGameState('HUMAN', 'ORC');
  const archer = {
    ...createUnit({ id: 1, team: 'PLAYER', type: 'ARCHER', x: 10, y: 10 }),
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };
  const enemyKnight = {
    ...createUnit({ id: 2, team: 'ENEMY', type: 'KNIGHT', x: 10, y: 13 }),
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };
  const enemyGoblin = {
    ...createUnit({ id: 3, team: 'ENEMY', type: 'GOBLIN', x: 10, y: 14 }),
    attackCooldownMs: 999,
    moveCooldownMs: 0,
  };

  const firstStep = stepBattle({
    grid: initial.grid,
    units: [archer, enemyKnight, enemyGoblin],
    buildings: [],
    deltaMs: 100,
  });

  const oilArcher = firstStep.units.find(unit => unit.id === archer.id);
  assertOk(!!oilArcher, 'The archer should survive the setup.');
  assertOk(oilArcher?.oilFlaskUsed, 'The archer should drop its oil flask on first contact.');
  assertEqual(oilArcher?.oilFlaskX ?? -1, 10, 'The oil flask should land on the first target x-position.');
  assertEqual(oilArcher?.oilFlaskY ?? -1, 13, 'The oil flask should land on the first target y-position.');

  const secondStep = stepBattle({
    grid: initial.grid,
    units: firstStep.units.map(unit => (unit.id === enemyGoblin.id ? { ...unit, moveCooldownMs: 0 } : unit)),
    buildings: [],
    deltaMs: 100,
  });

  const slowedGoblin = secondStep.units.find(unit => unit.id === enemyGoblin.id);
  assertOk(!!slowedGoblin, 'The goblin should survive the oil-slow setup.');
  assertOk((slowedGoblin?.moveCooldownMs ?? 0) > 93, 'Units moving through the oil field should receive a stronger movement cooldown.');
});

runTest('golem death spawns a goblin squad around its death location', () => {
  const initial = createInitialGameState('ORC', 'HUMAN');
  const doomedGolem = {
    ...createUnit({ id: 1, team: 'PLAYER', type: 'GOLEM', x: 10, y: 10 }),
    hp: 1,
    maxHp: 32,
    attackCooldownMs: 999,
    moveCooldownMs: 999,
  };
  const enemyMage = {
    ...createUnit({ id: 2, team: 'ENEMY', type: 'MAGE', x: 11, y: 11 }),
    attackCooldownMs: 0,
    moveCooldownMs: 999,
  };

  const result = stepBattle({
    grid: initial.grid,
    units: [doomedGolem, enemyMage],
    buildings: [],
    deltaMs: 100,
  });

  assertOk(!result.units.some(unit => unit.id === doomedGolem.id), 'The golem should die in the setup.');
  const spawnedGoblins = result.units.filter(unit => unit.type === 'GOBLIN' && unit.team === 'PLAYER');
  assertEqual(spawnedGoblins.length, 6, 'A dead golem should spawn a full Goblin Squad.');
  assertOk(
    spawnedGoblins.every(unit => Math.abs(unit.x - doomedGolem.x) + Math.abs(unit.y - doomedGolem.y) <= 3),
    'Spawned goblins should appear around the golem death location.'
  );
});

console.log('[done] gameplay regression scenarios passed');
