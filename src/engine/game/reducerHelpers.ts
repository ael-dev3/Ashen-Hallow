import { GAME_CONFIG } from '../config/gameConfig';
import { getCellZone, isEnemyFlankCell, isPlayerDeployableCell, isPlayerFlankCell } from './grid';
import type { BattleResult, BuildingType, CellCoord, DeploymentUnit, GameState, RoundSummary, RoundUnitSummary, SfxEvent, Team, UnitState, UnitType } from './types';
import { spawnEnemyUnits } from './enemySpawner';
import { countAliveByTeam } from './simulateBattle';
import {
  getBuildingAttackStats,
  getBuildingBlueprint,
  getBuildingFootprint,
  getBuildingFootprintCells,
  getBuildingStats,
  getBuildingSpawnInfo,
  isCellInBuildingFootprint,
} from './buildingCatalog';
import {
  createUnit,
  getPlacementFootprint,
  getPlacementFootprintCells,
  getPlacementOffsets,
  getUnitBlueprint,
  getUnitFootprint,
  isCellInUnitFootprint,
} from './unitCatalog';
import { addXp } from './xp';

const goldForTurn = (turn: number): number => Math.max(2, turn);

const isDeploymentOccupied = (deployments: readonly DeploymentUnit[], coord: { x: number; y: number }): boolean =>
  deployments.some(d => isCellInUnitFootprint(d, coord));

const isBuildingOccupied = (
  buildings: readonly GameState['buildings'][number][],
  coord: { x: number; y: number }
): boolean =>
  buildings.some(b => isCellInBuildingFootprint(b, coord));

const isAnyDeploymentOccupied = (state: GameState, coord: { x: number; y: number }): boolean =>
  isDeploymentOccupied(state.deployments, coord) ||
  isDeploymentOccupied(state.enemyDeployments, coord) ||
  isBuildingOccupied(state.buildings, coord);

const isCombatBuilding = (building: GameState['buildings'][number]): boolean => {
  const tier = building.tier ?? 1;
  return Boolean(getBuildingAttackStats(building.type, tier) || getBuildingSpawnInfo(building.type, tier));
};

const countCombatBuildings = (buildings: readonly GameState['buildings'][number][], team: Team): number =>
  buildings.reduce((count, building) => (building.team === team && isCombatBuilding(building) ? count + 1 : count), 0);

export const countCombatants = (
  units: readonly UnitState[],
  buildings: readonly GameState['buildings'][number][],
  team: Team
): number => countAliveByTeam(units, team) + countCombatBuildings(buildings, team);

export const getPlacementIssue = (
  state: GameState,
  unitType: DeploymentUnit['type'],
  anchor: { x: number; y: number }
): string | null => {
  const blueprint = getUnitBlueprint(unitType);
  const footprint = getPlacementFootprint(unitType);
  const needsFootprint = footprint.width > 1 || footprint.height > 1;
  const sizeLabel = `${footprint.width}x${footprint.height}`;
  const flankCols = GAME_CONFIG.flankColsPerSide;
  const flankUnlockTurn = GAME_CONFIG.flankUnlockTurn;
  const flankDescriptor = `${flankCols}-column flank lanes on each edge`;
  for (const cell of getPlacementFootprintCells(unitType, anchor)) {
    const zone = getCellZone(state.grid, cell);
    const canDeploy = isPlayerDeployableCell(state.grid, cell, state.turn, flankCols, flankUnlockTurn);
    if (!canDeploy) {
      if (zone === 'PLAYER' && isPlayerFlankCell(state.grid, cell, flankCols)) {
        return needsFootprint
          ? `${blueprint.name} needs a clear ${sizeLabel} space in the Player zone (player flank lanes are enemy-only).`
          : 'Player flank lanes are enemy-only. Use the Player zone.';
      }
      if (zone === 'ENEMY' && isEnemyFlankCell(state.grid, cell, flankCols)) {
        return needsFootprint
          ? `${blueprint.name} needs a clear ${sizeLabel} space. Enemy flank lanes unlock on turn ${flankUnlockTurn}.`
          : `Enemy flank lanes unlock on turn ${flankUnlockTurn}.`;
      }
      if (zone === 'ENEMY') {
        return needsFootprint
          ? `${blueprint.name} needs a clear ${sizeLabel} space in the Player zone or enemy flank lanes.`
          : `Enemy territory is locked. Use the Player zone or ${flankDescriptor} on turn ${flankUnlockTurn} and later.`;
      }
      if (zone === 'NEUTRAL') {
        return needsFootprint
          ? `${blueprint.name} needs a clear ${sizeLabel} space in the Player zone or enemy flank lanes.`
          : `Neutral zone cannot be used. Deploy in the Player zone or ${flankDescriptor} on turn ${flankUnlockTurn} and later.`;
      }
      return needsFootprint
        ? `${blueprint.name} needs a clear ${sizeLabel} space in the Player zone or enemy flank lanes.`
        : `You can only place units in the Player zone or ${flankDescriptor} on turn ${flankUnlockTurn} and later.`;
    }
    if (isAnyDeploymentOccupied(state, cell)) {
      return 'That space is already occupied.';
    }
  }
  return null;
};

export const getBuildingPlacementIssue = (
  state: GameState,
  buildingType: BuildingType,
  anchor: { x: number; y: number }
): string | null => {
  const blueprint = getBuildingBlueprint(buildingType);
  const footprint = getBuildingFootprint(buildingType);
  const sizeLabel = `${footprint.width}x${footprint.height}`;
  const flankCols = GAME_CONFIG.flankColsPerSide;
  const flankUnlockTurn = GAME_CONFIG.flankUnlockTurn;
  const flankDescriptor = `${flankCols}-column flank lanes on each edge`;
  for (const cell of getBuildingFootprintCells(buildingType, anchor)) {
    const zone = getCellZone(state.grid, cell);
    const canDeploy = isPlayerDeployableCell(state.grid, cell, state.turn, flankCols, flankUnlockTurn);
    if (!canDeploy) {
      if (zone === 'PLAYER' && isPlayerFlankCell(state.grid, cell, flankCols)) {
        return `${blueprint.name} needs a clear ${sizeLabel} space in the Player zone (player flank lanes are enemy-only).`;
      }
      if (zone === 'ENEMY' && isEnemyFlankCell(state.grid, cell, flankCols)) {
        return `${blueprint.name} needs a clear ${sizeLabel} space. Enemy flank lanes unlock on turn ${flankUnlockTurn}.`;
      }
      if (zone === 'ENEMY') {
        return `${blueprint.name} needs a clear ${sizeLabel} space in the Player zone or enemy flank lanes.`;
      }
      if (zone === 'NEUTRAL') {
        return `${blueprint.name} needs a clear ${sizeLabel} space in the Player zone or enemy flank lanes.`;
      }
      return `${blueprint.name} needs a clear ${sizeLabel} space in the Player zone or ${flankDescriptor} on turn ${flankUnlockTurn} and later.`;
    }
    if (isAnyDeploymentOccupied(state, cell)) {
      return 'That space is already occupied.';
    }
  }
  return null;
};

const getSideDeploymentDelayMs = (state: GameState, deployment: DeploymentUnit, team: Team): number => {
  if (GAME_CONFIG.flankDeployDelayMs <= 0) return 0;
  const placedTurn = deployment.placedTurn ?? -1;
  if (placedTurn !== state.turn) return 0;
  const flankCols = GAME_CONFIG.flankColsPerSide;
  if (team === 'PLAYER') {
    return isEnemyFlankCell(state.grid, deployment, flankCols) ? GAME_CONFIG.flankDeployDelayMs : 0;
  }
  return isPlayerFlankCell(state.grid, deployment, flankCols) ? GAME_CONFIG.flankDeployDelayMs : 0;
};

const keyOf = (x: number, y: number): string => `${x},${y}`;

const getSpawnRingCells = (grid: GameState['grid'], building: GameState['buildings'][number]): CellCoord[] => {
  const footprint = getBuildingFootprint(building.type);
  const minX = building.x - 1;
  const maxX = building.x + footprint.width;
  const minY = building.y - 1;
  const maxY = building.y + footprint.height;
  const cells: CellCoord[] = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (x < 0 || y < 0 || x >= grid.cols || y >= grid.rows) continue;
      if (x >= building.x && x < building.x + footprint.width && y >= building.y && y < building.y + footprint.height) continue;
      cells.push({ x, y });
    }
  }
  return cells;
};

export const spawnBuildingUnits = (params: {
  grid: GameState['grid'];
  buildings: readonly GameState['buildings'][number][];
  units: readonly UnitState[];
  nextUnitId: number;
  deltaMs: number;
}): { buildings: GameState['buildings'][number][]; units: UnitState[]; nextUnitId: number; spawnedGoblins: number } => {
  if (params.buildings.length === 0) {
    return { buildings: [...params.buildings], units: [...params.units], nextUnitId: params.nextUnitId, spawnedGoblins: 0 };
  }

  const occupied = new Set<string>();
  for (const unit of params.units) {
    const footprint = getUnitFootprint(unit.type);
    for (let dy = 0; dy < footprint.height; dy++) {
      for (let dx = 0; dx < footprint.width; dx++) {
        occupied.add(keyOf(unit.x + dx, unit.y + dy));
      }
    }
  }
  for (const building of params.buildings) {
    const footprint = getBuildingFootprint(building.type);
    for (let dy = 0; dy < footprint.height; dy++) {
      for (let dx = 0; dx < footprint.width; dx++) {
        occupied.add(keyOf(building.x + dx, building.y + dy));
      }
    }
  }

  let nextUnitId = params.nextUnitId;
  const spawnedUnits: UnitState[] = [];
  let spawnedGoblins = 0;

  const buildings = params.buildings.map(building => {
    const buildingTier = Math.max(1, Math.floor(building.tier ?? 1));
    const spawnInfo = getBuildingSpawnInfo(building.type, buildingTier);
    if (!spawnInfo || spawnInfo.intervalMs <= 0) return building;

    let cooldown = Number.isFinite(building.spawnCooldownMs) ? building.spawnCooldownMs : spawnInfo.intervalMs;
    cooldown -= params.deltaMs;
    let roundSpawnRateBonusPct = building.roundSpawnRateBonusPct ?? 0;

    const candidates = getSpawnRingCells(params.grid, building);
    const startIndex = candidates.length > 0 ? building.id % candidates.length : 0;
    const ordered = candidates.slice(startIndex).concat(candidates.slice(0, startIndex));
    const spawnFootprint = getUnitFootprint(spawnInfo.unitType);
    const canSpawnAt = (cell: CellCoord): boolean => {
      for (let dy = 0; dy < spawnFootprint.height; dy++) {
        for (let dx = 0; dx < spawnFootprint.width; dx++) {
          const x = cell.x + dx;
          const y = cell.y + dy;
          if (x < 0 || y < 0 || x >= params.grid.cols || y >= params.grid.rows) return false;
          if (occupied.has(keyOf(x, y))) return false;
        }
      }
      return true;
    };

    while (cooldown <= 0) {
      for (let spawnIndex = 0; spawnIndex < spawnInfo.countPerInterval; spawnIndex++) {
        const spawnCell = ordered.find(cell => canSpawnAt(cell));
        if (!spawnCell) break;
        const id = nextUnitId++;
        spawnedUnits.push(
          createUnit({
            id,
            team: building.team,
            type: spawnInfo.unitType,
            x: spawnCell.x,
            y: spawnCell.y,
            tier: buildingTier,
            xp: 0,
          })
        );
        if (spawnInfo.unitType === 'GOBLIN') {
          spawnedGoblins += 1;
        }
        for (let dy = 0; dy < spawnFootprint.height; dy++) {
          for (let dx = 0; dx < spawnFootprint.width; dx++) {
            occupied.add(keyOf(spawnCell.x + dx, spawnCell.y + dy));
          }
        }
        roundSpawnRateBonusPct += 0.01;
      }
      cooldown += spawnInfo.intervalMs / (1 + roundSpawnRateBonusPct);
    }

    return { ...building, spawnCooldownMs: Math.max(0, cooldown), roundSpawnRateBonusPct };
  });

  return {
    buildings,
    units: [...params.units, ...spawnedUnits],
    nextUnitId,
    spawnedGoblins,
  };
};

const deploymentsToPlayerUnitsForBattle = (state: GameState): UnitState[] =>
  state.deployments.map(d =>
    createUnit({
      id: d.id,
      team: 'PLAYER',
      type: d.type,
      x: d.x,
      y: d.y,
      xp: d.xp,
      tier: d.tier,
      inactiveMsRemaining: getSideDeploymentDelayMs(state, d, 'PLAYER'),
    })
  );

const deploymentsToPlayerUnitsForDisplay = (deployments: readonly DeploymentUnit[]): UnitState[] =>
  deployments.map(d => createUnit({ id: d.id, team: 'PLAYER', type: d.type, x: d.x, y: d.y, xp: d.xp, tier: d.tier }));

const deploymentsToEnemyUnitsForDisplay = (deployments: readonly DeploymentUnit[]): UnitState[] =>
  deployments.map(d => createUnit({ id: d.id, team: 'ENEMY', type: d.type, x: d.x, y: d.y, xp: d.xp, tier: d.tier }));

export const applyXpToDeployments = (deployments: readonly DeploymentUnit[], xpGains: ReadonlyMap<number, number>): DeploymentUnit[] =>
  deployments.map(d => {
    const gain = xpGains.get(d.id) ?? 0;
    const tier = d.tier ?? 1;
    const currentXp = d.xp ?? 0;
    const nextXp = addXp(currentXp, gain, d.type, tier);
    if (nextXp === currentXp) return d;
    return { ...d, xp: nextXp, tier };
  });

const prepareBuildingsForBattle = (buildings: readonly GameState['buildings'][number][]): GameState['buildings'][number][] =>
  buildings.map(building => {
    const spawnInfo = getBuildingSpawnInfo(building.type, building.tier);
    const attackStats = getBuildingAttackStats(building.type, building.tier ?? 1);
    return {
      ...building,
      spawnCooldownMs: spawnInfo ? spawnInfo.intervalMs : building.spawnCooldownMs,
      attackCooldownMs: attackStats ? 0 : building.attackCooldownMs,
      roundAttackSpeedBonusPct: 0,
      roundSpawnRateBonusPct: 0,
    };
  });

export const canModifyDeployments = (state: GameState): boolean => state.phase === 'DEPLOYMENT' || state.phase === 'INTERMISSION';

const skipBattleWithoutUnits = (state: GameState): GameState => {
  const {
    enemyUnits,
    enemyDeployments,
    buildings,
    nextUnitId,
    nextBuildingId,
    nextSeed,
    nextEnemyGoldDebtNextTurn,
    nextEnemyGold,
    nextEnemyUnlockedUnits,
    nextEnemyPlacementSlots,
    nextEnemyNextPlacementSlotCost,
  } = spawnEnemyUnits({
    grid: state.grid,
    playerUnits: [],
    buildings: state.buildings,
    existingEnemyDeployments: state.enemyDeployments,
    nextUnitId: state.nextUnitId,
    nextBuildingId: state.nextBuildingId,
    rngSeed: state.rngSeed,
    turn: state.turn,
    enemyGoldDebtNextTurn: state.enemyGoldDebtNextTurn,
    enemyGold: state.enemyGold,
    enemyUnlockedUnits: state.enemyUnlockedUnits,
    enemyPlacementSlots: state.enemyPlacementSlots,
    enemyNextPlacementSlotCost: state.enemyNextPlacementSlotCost,
    enemyRace: state.enemyRace,
  });

  const nextState = {
    ...state,
    enemyDeployments,
    buildings,
    nextUnitId,
    nextBuildingId,
    rngSeed: nextSeed,
    enemyGoldDebtNextTurn: nextEnemyGoldDebtNextTurn,
    enemyGold: nextEnemyGold,
    enemyUnlockedUnits: nextEnemyUnlockedUnits,
    enemyPlacementSlots: nextEnemyPlacementSlots,
    enemyNextPlacementSlotCost: nextEnemyNextPlacementSlotCost,
    hoveredCell: null,
    intermissionMsRemaining: 0,
    pendingPlayerDamage: 0,
    pendingEnemyDamage: 0,
    battleTimeMs: 0,
    result: null,
  };

  return endBattle(nextState, { units: enemyUnits, battleTimeMs: 0, timedOut: false });
};

export const startBattleFromCurrentDeployments = (state: GameState): GameState => {
  const playerUnits = deploymentsToPlayerUnitsForBattle(state);
  const playerCombatBuildings = countCombatBuildings(state.buildings, 'PLAYER');
  if (playerUnits.length === 0 && playerCombatBuildings === 0) {
    return skipBattleWithoutUnits(state);
  }

  const {
    enemyUnits,
    enemyDeployments,
    buildings: nextBuildings,
    nextUnitId,
    nextBuildingId,
    nextSeed,
    nextEnemyGoldDebtNextTurn,
    nextEnemyGold,
    nextEnemyUnlockedUnits,
    nextEnemyPlacementSlots,
    nextEnemyNextPlacementSlotCost,
  } = spawnEnemyUnits({
    grid: state.grid,
    playerUnits,
    buildings: state.buildings,
    existingEnemyDeployments: state.enemyDeployments,
    nextUnitId: state.nextUnitId,
    nextBuildingId: state.nextBuildingId,
    rngSeed: state.rngSeed,
    turn: state.turn,
    enemyGoldDebtNextTurn: state.enemyGoldDebtNextTurn,
    enemyGold: state.enemyGold,
    enemyUnlockedUnits: state.enemyUnlockedUnits,
    enemyPlacementSlots: state.enemyPlacementSlots,
    enemyNextPlacementSlotCost: state.enemyNextPlacementSlotCost,
    enemyRace: state.enemyRace,
  });

  const buildings = prepareBuildingsForBattle(nextBuildings);

  return {
    ...state,
    phase: 'BATTLE',
    units: [...playerUnits, ...enemyUnits],
    buildings,
    nextUnitId,
    nextBuildingId,
    rngSeed: nextSeed,
    enemyGoldDebtNextTurn: nextEnemyGoldDebtNextTurn,
    enemyGold: nextEnemyGold,
    enemyUnlockedUnits: nextEnemyUnlockedUnits,
    enemyPlacementSlots: nextEnemyPlacementSlots,
    enemyNextPlacementSlotCost: nextEnemyNextPlacementSlotCost,
    enemyDeployments,
    hoveredCell: null,
    intermissionMsRemaining: 0,
    pendingPlayerDamage: 0,
    pendingEnemyDamage: 0,
    message: { kind: 'info', text: 'Battle started. Units act automatically.' },
    battleTimeMs: 0,
    result: null,
  };
};

const getBattleResult = (params: {
  playerAlive: number;
  enemyAlive: number;
  timedOut: boolean;
}): BattleResult => {
  const { playerAlive, enemyAlive, timedOut } = params;
  if (playerAlive === 0 && enemyAlive === 0) return { winner: 'DRAW', reason: 'ELIMINATION' };
  if (playerAlive === 0) return { winner: 'ENEMY', reason: 'ELIMINATION' };
  if (enemyAlive === 0) return { winner: 'PLAYER', reason: 'ELIMINATION' };
  return timedOut ? { winner: 'DRAW', reason: 'TIME' } : { winner: 'DRAW', reason: 'TIME' };
};

const HP_ROUND_PRECISION = 1000;

const normalizeHpValue = (value: number): number => Math.max(0, Math.round(value * HP_ROUND_PRECISION) / HP_ROUND_PRECISION);

const formatHpValue = (value: number): string => {
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(2).replace(/\.?0+$/, '');
};

const getUnitSpawnCount = (unitType: UnitType): number => Math.max(1, getPlacementOffsets(unitType).length);

const getUnitHpDamageWeight = (unitType: UnitType): number => {
  const blueprint = getUnitBlueprint(unitType);
  const spawnCount = getUnitSpawnCount(unitType);
  return blueprint.placementCost / spawnCount;
};

export const getUnitUpgradeCost = (unitType: UnitType): number => getUnitBlueprint(unitType).placementCost;

const getHpDamageByTeam = (units: readonly UnitState[], team: Team): number =>
  units.reduce((sum, unit) => {
    if (unit.team !== team || unit.hp <= 0) return sum;
    return sum + getUnitHpDamageWeight(unit.type);
  }, 0);

const summarizeSurvivors = (units: readonly UnitState[], team: Team): RoundUnitSummary[] => {
  const summaries = new Map<string, { type: UnitType; tier: number; count: number; damagePerUnit: number; totalDamage: number }>();
  for (const unit of units) {
    if (unit.team !== team || unit.hp <= 0) continue;
    const damagePerUnit = getUnitHpDamageWeight(unit.type);
    const key = `${unit.type}|${unit.tier}`;
    const entry = summaries.get(key);
    if (entry) {
      entry.count += 1;
      entry.totalDamage += damagePerUnit;
    } else {
      summaries.set(key, { type: unit.type, tier: unit.tier, count: 1, damagePerUnit, totalDamage: damagePerUnit });
    }
  }

  return [...summaries.values()]
    .map(summary => ({
      type: summary.type,
      tier: summary.tier,
      count: summary.count,
      damagePerUnit: normalizeHpValue(summary.damagePerUnit),
      totalDamage: normalizeHpValue(summary.totalDamage),
    }))
    .sort((a, b) => b.totalDamage - a.totalDamage || a.type.localeCompare(b.type) || a.tier - b.tier);
};

const buildRoundSummary = (params: {
  round: number;
  result: RoundSummary['winner'];
  playerDamage: number;
  enemyDamage: number;
  units: readonly UnitState[];
}): RoundSummary => ({
  round: params.round,
  winner: params.result,
  playerDamage: params.playerDamage,
  enemyDamage: params.enemyDamage,
  playerUnits: summarizeSurvivors(params.units, 'PLAYER'),
  enemyUnits: summarizeSurvivors(params.units, 'ENEMY'),
});

const getBuildingGoldIncome = (buildings: readonly GameState['buildings'][number][], team: Team): number =>
  buildings.reduce((sum, building) => {
    if (building.team !== team) return sum;
    const stats = getBuildingStats(building.type, building.tier);
    return sum + stats.goldPerTurn;
  }, 0);

export const endBattle = (state: GameState, params: { units: readonly UnitState[]; battleTimeMs: number; timedOut: boolean }): GameState => {
  const playerCombatants = countCombatants(params.units, state.buildings, 'PLAYER');
  const enemyCombatants = countCombatants(params.units, state.buildings, 'ENEMY');

  const result = getBattleResult({ playerAlive: playerCombatants, enemyAlive: enemyCombatants, timedOut: params.timedOut });
  const playerDamageRaw = getHpDamageByTeam(params.units, 'PLAYER');
  const enemyDamageRaw = getHpDamageByTeam(params.units, 'ENEMY');
  const playerDamage = normalizeHpValue(playerDamageRaw);
  const enemyDamage = normalizeHpValue(enemyDamageRaw);
  const lastRoundSummary = buildRoundSummary({
    round: state.turn,
    result: result.winner,
    playerDamage,
    enemyDamage,
    units: params.units,
  });

  const enemyHp = normalizeHpValue(state.enemyHp - playerDamageRaw);
  const playerHp = normalizeHpValue(state.playerHp - enemyDamageRaw);
  const matchOver = enemyHp <= 0 || playerHp <= 0;

  const displayUnits = [
    ...deploymentsToPlayerUnitsForDisplay(state.deployments),
    ...deploymentsToEnemyUnitsForDisplay(state.enemyDeployments),
  ];
  const buildingsReady = state.buildings.map(building => ({ ...building, upgradeReady: true }));

  if (matchOver) {
    const winner = enemyHp <= 0 && playerHp <= 0 ? 'DRAW' : enemyHp <= 0 ? 'PLAYER' : 'ENEMY';
    const victorySfx: SfxEvent[] = winner === 'PLAYER' ? [{ kind: 'VICTORY', count: 1 }] : [];
    const hasVictorySfx = victorySfx.length > 0;
    const sfxEvents = hasVictorySfx ? [...state.sfxEvents, ...victorySfx] : state.sfxEvents;
    const sfxEventId = hasVictorySfx ? state.sfxEventId + 1 : state.sfxEventId;
    return {
      ...state,
      phase: 'INTERMISSION',
      enemyHp,
      playerHp,
      matchResult: { winner, reason: 'HP' },
      units: displayUnits,
      buildings: buildingsReady,
      battleTimeMs: params.battleTimeMs,
      result,
      intermissionMsRemaining: 0,
      pendingPlayerDamage: playerDamage,
      pendingEnemyDamage: enemyDamage,
      sfxEvents,
      sfxEventId,
      goldDebtNextTurn: 0,
      enemyGoldDebtNextTurn: 0,
      loanUsedThisTurn: false,
      placementSlots: 1,
      nextPlacementSlotCost: 2,
      enemyPlacementSlots: 1,
      enemyNextPlacementSlotCost: 2,
      lastRoundSummary,
      message:
        winner === 'DRAW'
          ? { kind: 'success', text: 'Game over: draw.' }
          : winner === 'PLAYER'
            ? { kind: 'success', text: 'Game over: victory!' }
            : { kind: 'success', text: 'Game over: defeat.' },
    };
  }

  const turn = state.turn + 1;
  const goldIncome = goldForTurn(turn);
  const playerBuildingIncome = getBuildingGoldIncome(state.buildings, 'PLAYER');
  const enemyBuildingIncome = getBuildingGoldIncome(state.buildings, 'ENEMY');
  const gold = Math.max(0, state.gold + goldIncome + playerBuildingIncome - state.goldDebtNextTurn);
  const enemyGold = Math.max(0, state.enemyGold + goldIncome + enemyBuildingIncome - state.enemyGoldDebtNextTurn);

  return {
    ...state,
    phase: 'INTERMISSION',
    turn,
    gold,
    enemyGold,
    enemyHp,
    playerHp,
    units: displayUnits,
    buildings: buildingsReady,
    battleTimeMs: params.battleTimeMs,
    result,
    intermissionMsRemaining: GAME_CONFIG.intermissionMs,
    pendingPlayerDamage: playerDamage,
    pendingEnemyDamage: enemyDamage,
    placementSlots: 1,
    placementsUsedThisTurn: 0,
    nextPlacementSlotCost: 2,
    goldDebtNextTurn: 0,
    enemyGoldDebtNextTurn: 0,
    loanUsedThisTurn: false,
    enemyPlacementSlots: 1,
    enemyNextPlacementSlotCost: 2,
    lastRoundSummary,
    message: {
      kind: 'info',
      text: `Prep: dealt ${formatHpValue(playerDamage)}, took ${formatHpValue(enemyDamage)}. Battle starts in ${Math.ceil(
        GAME_CONFIG.intermissionMs / 1000
      )}s (or Ready).`,
    },
  };
};
