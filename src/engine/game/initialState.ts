import { GAME_CONFIG } from '../config/gameConfig';
import type { BuildingType, GameState, Race, UnitType } from './types';
import { createGrid } from './grid';
import { getDefaultBuildingTypeForRace, getDefaultUnitTypeForRace, pickEnemyRace } from './races';

const createUnlockedUnits = (): Record<UnitType, boolean> => ({
  KNIGHT: false,
  GOBLIN: false,
  ARCHER: false,
  SNIPER: false,
  MAGE: false,
  GOLEM: false,
  BLOOD_MAGE: false,
  BLOOD_GOBLIN: false,
});

const createUnlockedBuildings = (): Record<BuildingType, boolean> => ({
  GOLD_MINE: false,
  ARCHER_TOWER: false,
  GOBLIN_CAVE: false,
});

export const createInitialGameState = (playerRace: Race = 'HUMAN', enemyRace?: Race): GameState => {
  const resolvedEnemyRace = enemyRace ?? pickEnemyRace(playerRace, Math.random());
  return {
    phase: 'DEPLOYMENT',
    playerRace,
    enemyRace: resolvedEnemyRace,
    turn: 1,
    gold: 2,
    rngSeed: 1337,
    goldDebtNextTurn: 0,
    loanUsedThisTurn: false,
    enemyGoldDebtNextTurn: 0,
    enemyGold: 2,
    enemyUnlockedUnits: createUnlockedUnits(),
    enemyPlacementSlots: 1,
    enemyNextPlacementSlotCost: 2,
    maxHp: 50,
    playerHp: 50,
    enemyHp: 50,
    matchResult: null,
    intermissionMsRemaining: GAME_CONFIG.intermissionMs,
    pendingPlayerDamage: 0,
    pendingEnemyDamage: 0,
    unlockedUnits: createUnlockedUnits(),
    unlockedBuildings: createUnlockedBuildings(),
    placementSlots: 1,
    placementsUsedThisTurn: 0,
    nextPlacementSlotCost: 2,
    grid: createGrid(
      GAME_CONFIG.gridRows,
      GAME_CONFIG.gridCols,
      GAME_CONFIG.enemyZoneRows,
      GAME_CONFIG.neutralZoneRows
    ),
    deployments: [],
    enemyDeployments: [],
    units: [],
    buildings: [],
    nextUnitId: 1,
    nextBuildingId: 1,
    selectedUnitType: getDefaultUnitTypeForRace(playerRace),
    selectedBuildingType: getDefaultBuildingTypeForRace(playerRace),
    selectedPlacementKind: 'UNIT',
    selectedUnitId: null,
    hoveredCell: null,
    message: {
      kind: 'info',
      text: `Prep: unlock + place units. Battle auto-starts in ${Math.ceil(
        GAME_CONFIG.intermissionMs / 1000
      )}s (or press Ready). Placements persist for the whole match.`,
    },
    sfxEventId: 0,
    sfxEvents: [],
    battleTimeMs: 0,
    result: null,
    lastRoundSummary: null,
  };
};
