import { GAME_CONFIG } from '../config/gameConfig';
import type { GameAction } from './actions';
import { createGrid, isInBounds } from './grid';
import { createInitialGameState } from './initialState';
import type { DeploymentUnit, GameState, SfxEvent, UnitState } from './types';
import { stepBattle } from './simulateBattle';
import { createBuilding, getBuildingBlueprint, getBuildingStats } from './buildingCatalog';
import { createUnit, getPlacementOffsets, getUnitBlueprint, getUnitStats } from './unitCatalog';
import { addXp, xpRequiredForTier, toRoman } from './xp';
import { isBuildingAvailableForRace, isUnitAvailableForRace } from './races';
import { getDeploymentUpgradeGroup } from './upgrades';
import {
  applyXpToDeployments,
  canModifyDeployments,
  countCombatants,
  endBattle,
  getBuildingPlacementIssue,
  getPlacementIssue,
  getUnitUpgradeCost,
  spawnBuildingUnits,
  startBattleFromCurrentDeployments,
} from './reducerHelpers';


export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'SELECT_UNIT': {
      if (!isUnitAvailableForRace(state.playerRace, action.unitType)) {
        return { ...state, message: { kind: 'error', text: `${action.unitType} is not available for the ${state.playerRace} race.` } };
      }
      const alreadyUnlocked = state.unlockedUnits[action.unitType];
      if (alreadyUnlocked) {
        return { ...state, selectedUnitType: action.unitType, selectedPlacementKind: 'UNIT', message: null };
      }

      const blueprint = getUnitBlueprint(action.unitType);
      if (!canModifyDeployments(state)) {
        return { ...state, message: { kind: 'error', text: 'Units can only be unlocked between battles.' } };
      }

      if (state.gold < blueprint.unlockCost) {
        return {
          ...state,
          message: { kind: 'error', text: `Need ${blueprint.unlockCost}g to unlock ${blueprint.name} (you have ${state.gold}g).` },
        };
      }

      return {
        ...state,
        gold: state.gold - blueprint.unlockCost,
        unlockedUnits: { ...state.unlockedUnits, [action.unitType]: true },
        selectedUnitType: action.unitType,
        selectedPlacementKind: 'UNIT',
        message: { kind: 'success', text: `${blueprint.name} unlocked.` },
      };
    }
    case 'SELECT_BUILDING': {
      if (!isBuildingAvailableForRace(state.playerRace, action.buildingType)) {
        return { ...state, message: { kind: 'error', text: `${action.buildingType} is not available for the ${state.playerRace} race.` } };
      }
      const alreadyUnlocked = state.unlockedBuildings[action.buildingType];
      if (alreadyUnlocked) {
        return { ...state, selectedBuildingType: action.buildingType, selectedPlacementKind: 'BUILDING', message: null };
      }

      const blueprint = getBuildingBlueprint(action.buildingType);
      if (!canModifyDeployments(state)) {
        return { ...state, message: { kind: 'error', text: 'Buildings can only be unlocked between battles.' } };
      }

      if (state.gold < blueprint.unlockCost) {
        return {
          ...state,
          message: {
            kind: 'error',
            text: `Need ${blueprint.unlockCost}g to unlock ${blueprint.name} (you have ${state.gold}g).`,
          },
        };
      }

      return {
        ...state,
        gold: state.gold - blueprint.unlockCost,
        unlockedBuildings: { ...state.unlockedBuildings, [action.buildingType]: true },
        selectedBuildingType: action.buildingType,
        selectedPlacementKind: 'BUILDING',
        message: { kind: 'success', text: `${blueprint.name} unlocked.` },
      };
    }
    case 'SELECT_PLACED_UNIT': {
      if (action.unitId === null) {
        return { ...state, selectedUnitId: null };
      }
      const deployment = state.deployments.find(d => d.id === action.unitId);
      if (!deployment) {
        return { ...state, selectedUnitId: null };
      }
      if (state.selectedUnitId === action.unitId) {
        return { ...state, selectedUnitId: null };
      }
      return { ...state, selectedUnitId: action.unitId };
    }
    case 'SET_HOVERED_CELL':
      return { ...state, hoveredCell: action.cell };
    case 'TAKE_LOAN': {
      if (!canModifyDeployments(state)) return state;
      if (state.matchResult) return state;
      if (state.loanUsedThisTurn) {
        return { ...state, message: { kind: 'error', text: 'Loan already used this turn.' } };
      }
      return {
        ...state,
        gold: state.gold + 2,
        goldDebtNextTurn: state.goldDebtNextTurn + 3,
        loanUsedThisTurn: true,
        message: { kind: 'info', text: 'Loan taken: +2 gold now, -3 gold next turn.' },
      };
    }
    case 'READY': {
      if (state.phase !== 'INTERMISSION' && state.phase !== 'DEPLOYMENT') return state;
      if (state.matchResult) return state;
      return startBattleFromCurrentDeployments(state);
    }
    case 'INTERMISSION_TICK': {
      if (state.phase !== 'INTERMISSION' && state.phase !== 'DEPLOYMENT') return state;
      if (state.matchResult) return state;
      if (state.intermissionMsRemaining <= 0) return state;

      const remaining = Math.max(0, state.intermissionMsRemaining - action.deltaMs);
      if (remaining > 0) {
        return { ...state, intermissionMsRemaining: remaining };
      }

      // Auto-start battle when the timer runs out.
      return startBattleFromCurrentDeployments({ ...state, intermissionMsRemaining: 0 });
    }
    case 'BUY_PLACEMENT_SLOT': {
      if (!canModifyDeployments(state)) return state;
      const cost = state.nextPlacementSlotCost;
      if (state.gold < cost) {
        return {
          ...state,
          message: { kind: 'error', text: `Need ${cost}g to buy a placement slot (you have ${state.gold}g).` },
        };
      }
      return {
        ...state,
        gold: state.gold - cost,
        placementSlots: state.placementSlots + 1,
        nextPlacementSlotCost: 2,
        message: { kind: 'success', text: 'Temporary placement slot purchased (+1 this turn).' },
      };
    }
    case 'PLACE_UNIT': {
      if (!canModifyDeployments(state)) return state;
      if (!isInBounds(state.grid, action.cell)) return state;

      if (state.placementsUsedThisTurn >= state.placementSlots) {
        return { ...state, message: { kind: 'error', text: 'No placements left this turn. Press Ready to advance.' } };
      }

      if (!state.unlockedUnits[state.selectedUnitType]) {
        const blueprint = getUnitBlueprint(state.selectedUnitType);
        return { ...state, message: { kind: 'error', text: `${blueprint.name} is locked. Tap the unit to unlock it.` } };
      }

      const blueprint = getUnitBlueprint(state.selectedUnitType);
      const placementIssue = getPlacementIssue(state, state.selectedUnitType, action.cell);
      if (placementIssue) {
        return { ...state, message: { kind: 'error', text: placementIssue } };
      }
      if (state.gold < blueprint.placementCost) {
        return {
          ...state,
          message: { kind: 'error', text: `Need ${blueprint.placementCost}g to place ${blueprint.name} (you have ${state.gold}g).` },
        };
      }

      let nextUnitId = state.nextUnitId;
      const squadId = nextUnitId;
      const spawnOffsets = getPlacementOffsets(state.selectedUnitType);
      const placedDeployments: DeploymentUnit[] = [];
      const placedUnits: UnitState[] = [];
      for (const offset of spawnOffsets) {
        const id = nextUnitId++;
        const x = action.cell.x + offset.x;
        const y = action.cell.y + offset.y;
        placedDeployments.push({
          id,
          type: state.selectedUnitType,
          x,
          y,
          xp: 0,
          tier: 1,
          squadId: state.selectedUnitType === 'GOBLIN' ? squadId : undefined,
          placedTurn: state.turn,
        });
        placedUnits.push(
          createUnit({
            id,
            team: 'PLAYER',
            type: state.selectedUnitType,
            x,
            y,
            xp: 0,
            tier: 1,
          })
        );
      }
      const shouldPlayGoblinSpawn = state.selectedUnitType === 'GOBLIN';
      const sfxEvents: SfxEvent[] = shouldPlayGoblinSpawn ? [{ kind: 'GOBLIN_SPAWN', count: 1 }] : [];
      const sfxEventId = shouldPlayGoblinSpawn ? state.sfxEventId + 1 : state.sfxEventId;

      return {
        ...state,
        gold: state.gold - blueprint.placementCost,
        placementsUsedThisTurn: state.placementsUsedThisTurn + 1,
        deployments: [...state.deployments, ...placedDeployments],
        units: [...state.units, ...placedUnits],
        nextUnitId,
        sfxEvents,
        sfxEventId,
        message: null,
      };
    }
    case 'PLACE_BUILDING': {
      if (!canModifyDeployments(state)) return state;
      if (!isInBounds(state.grid, action.cell)) return state;

      const buildingType = state.selectedBuildingType;
      if (!state.unlockedBuildings[buildingType]) {
        const blueprint = getBuildingBlueprint(buildingType);
        return { ...state, message: { kind: 'error', text: `${blueprint.name} is locked. Tap it to unlock.` } };
      }

      const maxCount = getBuildingBlueprint(buildingType).maxCount ?? 1;
      const existingCount = state.buildings.filter(b => b.type === buildingType && b.team === 'PLAYER').length;
      if (existingCount >= maxCount) {
        const blueprint = getBuildingBlueprint(buildingType);
        const plural = maxCount === 1 ? '' : 's';
        return {
          ...state,
          message: { kind: 'error', text: `Only ${maxCount} ${blueprint.name}${plural} can be on your side.` },
        };
      }

      const blueprint = getBuildingBlueprint(buildingType);
      const placementIssue = getBuildingPlacementIssue(state, buildingType, action.cell);
      if (placementIssue) {
        return { ...state, message: { kind: 'error', text: placementIssue } };
      }
      if (state.gold < blueprint.placementCost) {
        return {
          ...state,
          message: { kind: 'error', text: `Need ${blueprint.placementCost}g to place ${blueprint.name} (you have ${state.gold}g).` },
        };
      }

      const building = createBuilding({
        id: state.nextBuildingId,
        team: 'PLAYER',
        type: buildingType,
        x: action.cell.x,
        y: action.cell.y,
      });

      return {
        ...state,
        gold: state.gold - blueprint.placementCost,
        buildings: [...state.buildings, building],
        nextBuildingId: state.nextBuildingId + 1,
        message: null,
      };
    }
    case 'UPGRADE_UNIT': {
      if (!canModifyDeployments(state)) return state;
      const deploymentIndex = state.deployments.findIndex(d => d.id === action.unitId);
      if (deploymentIndex === -1) return state;

      const deployment = state.deployments[deploymentIndex];
      const group = getDeploymentUpgradeGroup(state.deployments, deployment);
      const currentTier = deployment.tier ?? 1;
      const currentXp = deployment.xp ?? 0;
      if (group.some(item => item.lastUpgradeTurn === state.turn)) {
        return { ...state, message: { kind: 'info', text: 'This unit already upgraded this turn.' } };
      }
      const requiredXp = xpRequiredForTier(deployment.type, currentTier);
      if (group.some(item => (item.xp ?? 0) < requiredXp)) {
        return {
          ...state,
          message: { kind: 'error', text: `Need ${requiredXp} XP to upgrade this unit group.` },
        };
      }

      const blueprint = getUnitBlueprint(deployment.type);
      const upgradeCost = getUnitUpgradeCost(deployment.type);
      if (state.gold < upgradeCost) {
        return {
          ...state,
          message: { kind: 'error', text: `Need ${upgradeCost}g to upgrade ${blueprint.name} (you have ${state.gold}g).` },
        };
      }

      const nextTier = currentTier + 1;
      const nextXp = addXp(Math.max(0, currentXp - requiredXp), 0, deployment.type, nextTier);
      const nextStats = getUnitStats(deployment.type, nextTier);
      const prevStats = getUnitStats(deployment.type, currentTier);
      const hpGain = nextStats.maxHp - prevStats.maxHp;
      const groupIds = new Set(group.map(item => item.id));

      const deployments = state.deployments.map(d =>
        groupIds.has(d.id) ? { ...d, tier: nextTier, xp: nextXp, lastUpgradeTurn: state.turn } : d
      );
      const units = state.units.map(u =>
        groupIds.has(u.id)
          ? {
              ...u,
              tier: nextTier,
              xp: nextXp,
              maxHp: nextStats.maxHp,
              hp: Math.min(nextStats.maxHp, u.hp + hpGain),
            }
          : u
      );

      return {
        ...state,
        gold: Math.round((state.gold - upgradeCost) * 100) / 100,
        deployments,
        units,
        message: { kind: 'success', text: `${blueprint.name} upgraded to Tier ${toRoman(nextTier)}.` },
      };
    }
    case 'UPGRADE_ALL_UNITS': {
      if (!canModifyDeployments(state)) return state;

      const upgradeableGroups: DeploymentUnit[][] = [];
      const seenGroupKeys = new Set<string>();
      for (const deployment of state.deployments) {
        const group = getDeploymentUpgradeGroup(state.deployments, deployment);
        const groupKey = deployment.type === 'GOBLIN' && deployment.squadId !== undefined ? `GOBLIN:${deployment.squadId}` : `UNIT:${deployment.id}`;
        if (seenGroupKeys.has(groupKey)) continue;
        seenGroupKeys.add(groupKey);
        const currentTier = deployment.tier ?? 1;
        const requiredXp = xpRequiredForTier(deployment.type, currentTier);
        const ready = group.every(item => (item.xp ?? 0) >= requiredXp && item.lastUpgradeTurn !== state.turn);
        if (ready) upgradeableGroups.push(group);
      }

      if (upgradeableGroups.length === 0) {
        return { ...state, message: { kind: 'info', text: 'No units are ready to upgrade.' } };
      }

      const upgradeableIds = new Set(upgradeableGroups.flat().map(d => d.id));
      const totalCost = upgradeableGroups.reduce((sum, group) => sum + getUnitUpgradeCost(group[0].type), 0);
      if (state.gold < totalCost) {
        return {
          ...state,
          message: { kind: 'error', text: `Need ${totalCost}g to upgrade all units (you have ${state.gold}g).` },
        };
      }

      const upgradeMap = new Map<
        number,
        { nextTier: number; nextXp: number; nextMaxHp: number; hpGain: number }
      >();

      const deployments = state.deployments.map(d => {
        if (!upgradeableIds.has(d.id)) return d;
        const currentTier = d.tier ?? 1;
        const currentXp = d.xp ?? 0;
        const requiredXp = xpRequiredForTier(d.type, currentTier);
        const nextTier = currentTier + 1;
        const nextXp = addXp(Math.max(0, currentXp - requiredXp), 0, d.type, nextTier);
        const nextStats = getUnitStats(d.type, nextTier);
        const prevStats = getUnitStats(d.type, currentTier);
        const hpGain = nextStats.maxHp - prevStats.maxHp;
        upgradeMap.set(d.id, { nextTier, nextXp, nextMaxHp: nextStats.maxHp, hpGain });
        return { ...d, tier: nextTier, xp: nextXp, lastUpgradeTurn: state.turn };
      });

      const units = state.units.map(u => {
        const upgrade = upgradeMap.get(u.id);
        if (!upgrade) return u;
        return {
          ...u,
          tier: upgrade.nextTier,
          xp: upgrade.nextXp,
          maxHp: upgrade.nextMaxHp,
          hp: Math.min(upgrade.nextMaxHp, u.hp + upgrade.hpGain),
        };
      });

      return {
        ...state,
        gold: Math.round((state.gold - totalCost) * 100) / 100,
        deployments,
        units,
        message: { kind: 'success', text: `Upgraded ${upgradeableGroups.length} unit${upgradeableGroups.length === 1 ? '' : 's'}.` },
      };
    }
    case 'UPGRADE_BUILDING': {
      if (!canModifyDeployments(state)) return state;

      const building = state.buildings.find(b => b.type === action.buildingType && b.team === 'PLAYER');
      if (!building) {
        const blueprint = getBuildingBlueprint(action.buildingType);
        return { ...state, message: { kind: 'error', text: `${blueprint.name} is not on your side.` } };
      }

      if (!building.upgradeReady) {
        return {
          ...state,
          message: { kind: 'info', text: 'Building upgrades unlock after surviving a battle.' },
        };
      }

      const blueprint = getBuildingBlueprint(building.type);
      const upgradeCost = blueprint.placementCost;
      if (state.gold < upgradeCost) {
        return {
          ...state,
          message: { kind: 'error', text: `Need ${upgradeCost}g to upgrade ${blueprint.name} (you have ${state.gold}g).` },
        };
      }

      const currentTier = building.tier ?? 1;
      const nextTier = currentTier + 1;
      const prevStats = getBuildingStats(building.type, currentTier);
      const nextStats = getBuildingStats(building.type, nextTier);
      const hpGain = nextStats.maxHp - prevStats.maxHp;

      const buildings = state.buildings.map(b =>
        b.id === building.id
          ? {
              ...b,
              tier: nextTier,
              maxHp: nextStats.maxHp,
              hp: Math.min(nextStats.maxHp, b.hp + hpGain),
              upgradeReady: false,
            }
          : b
      );

      return {
        ...state,
        gold: state.gold - upgradeCost,
        buildings,
        message: { kind: 'success', text: `${blueprint.name} upgraded to Tier ${toRoman(nextTier)}.` },
      };
    }
    case 'REMOVE_UNIT': {
      if (!canModifyDeployments(state)) return state;
      return {
        ...state,
        message: { kind: 'info', text: 'Placements are permanent for the match.' },
      };
    }
    case 'START_BATTLE': {
      if (state.phase !== 'DEPLOYMENT') return state;
      return startBattleFromCurrentDeployments(state);
    }
    case 'TICK': {
      if (state.phase !== 'BATTLE') return state;
      if (state.result) return state;

      const timedOutAlready = state.battleTimeMs >= GAME_CONFIG.battleMaxTimeMs;
      const playerCombatantsNow = countCombatants(state.units, state.buildings, 'PLAYER');
      const enemyCombatantsNow = countCombatants(state.units, state.buildings, 'ENEMY');
      if (timedOutAlready || playerCombatantsNow === 0 || enemyCombatantsNow === 0) {
        return endBattle(state, {
          units: state.units,
          battleTimeMs: state.battleTimeMs,
          timedOut: timedOutAlready,
        });
      }

      const battleTimeMs = state.battleTimeMs + action.deltaMs;
      const spawnResult = spawnBuildingUnits({
        grid: state.grid,
        buildings: state.buildings,
        units: state.units,
        nextUnitId: state.nextUnitId,
        deltaMs: action.deltaMs,
      });
      const { units, buildings, xpGains, knightKnightHits, knightArcherHits, knightMageHits } = stepBattle({
        grid: state.grid,
        units: spawnResult.units,
        buildings: spawnResult.buildings,
        deltaMs: action.deltaMs,
      });
      const deployments = applyXpToDeployments(state.deployments, xpGains);
      const enemyDeployments = applyXpToDeployments(state.enemyDeployments, xpGains);
      const sfxEvents: SfxEvent[] = [];
      if (spawnResult.spawnedGoblins > 0) sfxEvents.push({ kind: 'GOBLIN_SPAWN', count: spawnResult.spawnedGoblins });
      if (knightKnightHits > 0) sfxEvents.push({ kind: 'KNIGHT_HIT_KNIGHT', count: knightKnightHits });
      if (knightArcherHits > 0) sfxEvents.push({ kind: 'KNIGHT_HIT_ARCHER', count: knightArcherHits });
      if (knightMageHits > 0) sfxEvents.push({ kind: 'KNIGHT_HIT_MAGE', count: knightMageHits });
      const sfxEventId = sfxEvents.length > 0 ? state.sfxEventId + 1 : state.sfxEventId;

      const playerCombatants = countCombatants(units, buildings, 'PLAYER');
      const enemyCombatants = countCombatants(units, buildings, 'ENEMY');

      const battleDone =
        (playerCombatants === 0 && enemyCombatants === 0) ||
        playerCombatants === 0 ||
        enemyCombatants === 0 ||
        battleTimeMs >= GAME_CONFIG.battleMaxTimeMs;

      if (battleDone) {
        return endBattle({ ...state, deployments, enemyDeployments, sfxEvents, sfxEventId, buildings, nextUnitId: spawnResult.nextUnitId }, {
          units,
          battleTimeMs,
          timedOut: battleTimeMs >= GAME_CONFIG.battleMaxTimeMs,
        });
      }

      return {
        ...state,
        units,
        buildings,
        battleTimeMs,
        deployments,
        enemyDeployments,
        sfxEvents,
        sfxEventId,
        nextUnitId: spawnResult.nextUnitId,
      };
    }
    case 'FORCE_END_BATTLE': {
      if (state.phase !== 'BATTLE') return state;
      if (state.result) return state;
      const battleTimeMs = Math.max(state.battleTimeMs, GAME_CONFIG.battleMaxTimeMs);
      return endBattle(state, { units: state.units, battleTimeMs, timedOut: true });
    }
    default:
      return state;
  }
};

export const createNewGridGameState = (): GameState => ({
  ...createInitialGameState(),
  grid: createGrid(
    GAME_CONFIG.gridRows,
    GAME_CONFIG.gridCols,
    GAME_CONFIG.enemyZoneRows,
    GAME_CONFIG.neutralZoneRows
  ),
});
