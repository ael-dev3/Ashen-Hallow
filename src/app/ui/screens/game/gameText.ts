import { getUpgradeAllSummary } from '../../../../engine/game/upgrades';
import type { BuildingType, GameState, UnitType } from '../../../../engine/game/types';
import { getUnitBlueprint, getUnitMoveSpeed, getUnitStats } from '../../../../engine/game/unitCatalog';
import {
  getBuildingAttackStats,
  getBuildingBlueprint,
  getBuildingSpawnInfo,
  getBuildingStats,
  getKnightDamageReductionPctForTier,
} from '../../../../engine/game/buildingCatalog';

export const formatHp = (value: number): string => {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

export const buildUnitTooltipText = (unitType: UnitType): string => {
  const blueprint = getUnitBlueprint(unitType);
  const stats = getUnitStats(unitType, 1);
  const moveSpeed = getUnitMoveSpeed(unitType).toFixed(1);
  const details = [
    `Cost ${blueprint.placementCost}g`,
    `HP ${stats.maxHp}`,
    `DMG ${stats.attackDamage}`,
    `Range ${blueprint.attackRange}`,
    `Move ${moveSpeed}/s`,
  ];
  if (unitType === 'KNIGHT') details.push('Bleeds enemies that strike it. Upgrades add 10% damage reduction per tier.');
  if (unitType === 'ARCHER') details.push('Drops oil on first contact and gains one extra target per kill.');
  if (unitType === 'MAGE') details.push('Blinks on first hit and leaves four 10% mirror images.');
  if (unitType === 'GOBLIN') details.push('Deploys as a 3x2 squad. Nearby goblins grant +10% damage each.');
  if (unitType === 'GOLEM') details.push('Large bruiser. Death splits into a Goblin Squad.');
  if (unitType === 'BLOOD_MAGE') details.push('Hits every enemy in range and raises Blood Goblins from nearby deaths.');
  if (unitType === 'HOBGOBLIN') details.push('Cleave brute. Gains max HP from nearby Hobgoblins and Goblin deaths.');
  return `${blueprint.name}: ${details.join(' | ')}`;
};

export const buildBuildingTooltipText = (buildingType: BuildingType, state?: GameState): string => {
  const blueprint = getBuildingBlueprint(buildingType);
  const stats = getBuildingStats(buildingType, 1);
  const details = [`Cost ${blueprint.placementCost}g`, `HP ${stats.maxHp}`, `Aggro ${stats.aggroRange}`];
  if (stats.goldPerTurn > 0) details.push(`Income +${stats.goldPerTurn}g/turn`);
  const attackStats = getBuildingAttackStats(buildingType, 1);
  if (attackStats) {
    details.push(`DMG ${attackStats.attackDamage}`, `Range ${attackStats.attackRange}`, `Targets ${attackStats.maxTargets}`);
    if (buildingType === 'ARCHER_TOWER') details.push('Upgrades double combat stats and add targets. Kills add round attack speed.');
  }
  const spawnInfo = getBuildingSpawnInfo(buildingType, 1);
  if (spawnInfo) {
    details.push(`Spawns ${spawnInfo.countPerInterval} ${getUnitBlueprint(spawnInfo.unitType).name}/${spawnInfo.intervalMs / 1000}s`);
    if (buildingType === 'GOBLIN_CAVE') details.push('Spawn tempo accelerates each time it produces units.');
  }
  if (buildingType === 'ARCHER_TOWER') {
    details.push(`Knight reduction reference: ${Math.round(getKnightDamageReductionPctForTier(2) * 100)}% at tier II.`);
  }
  if (state && buildingType === 'ARCHER_TOWER') {
    const summary = getUpgradeAllSummary(state);
    if (summary.readyCount > 0) details.push(`${summary.readyCount} unit upgrade(s) ready elsewhere.`);
  }
  return `${blueprint.name}: ${details.join(' | ')}`;
};
