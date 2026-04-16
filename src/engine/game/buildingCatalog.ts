import type { BuildingBlueprint, BuildingState, BuildingType, CellCoord, Team, UnitType } from './types';

export interface BuildingFootprint {
  width: number;
  height: number;
}

const BUILDING_CATALOG: Record<BuildingType, BuildingBlueprint> = {
  GOLD_MINE: {
    type: 'GOLD_MINE',
    name: 'Gold Mine',
    unlockCost: 1,
    placementCost: 1,
    maxHp: 20,
    aggroRange: 10,
    goldPerTurn: 1,
    footprint: { width: 2, height: 2 },
    color: '#d8b55b',
  },
  ARCHER_TOWER: {
    type: 'ARCHER_TOWER',
    name: 'Archer Tower',
    unlockCost: 3,
    placementCost: 3,
    maxHp: 100,
    aggroRange: 10,
    attackDamage: 4,
    attackRange: 10,
    attackCooldownMs: 750,
    attackDistance: 'CHEBYSHEV',
    footprint: { width: 2, height: 2 },
    maxCount: 2,
    color: '#4ea8de',
  },
  GOBLIN_CAVE: {
    type: 'GOBLIN_CAVE',
    name: 'Goblin Cave',
    unlockCost: 10,
    placementCost: 10,
    maxHp: 200,
    aggroRange: 10,
    footprint: { width: 10, height: 10 },
    color: '#725437',
  },
};

export const getBuildingBlueprint = (buildingType: BuildingType): BuildingBlueprint => {
  const blueprint = BUILDING_CATALOG[buildingType];
  if (!blueprint) {
    const known = Object.keys(BUILDING_CATALOG).join(', ');
    throw new Error(`Unknown building type: ${String(buildingType)} (known: ${known})`);
  }
  return blueprint;
};

export const getAllBuildingTypes = (): BuildingType[] => Object.keys(BUILDING_CATALOG) as BuildingType[];

export const getBuildingFootprint = (buildingType: BuildingType): BuildingFootprint =>
  getBuildingBlueprint(buildingType).footprint;

export interface BuildingSpawnInfo {
  unitType: UnitType;
  intervalMs: number;
  countPerInterval: number;
}

const getBuildingTierMultiplier = (buildingType: BuildingType, tier: number): number => {
  const safeTier = Math.max(1, Math.floor(tier));
  if (buildingType === 'ARCHER_TOWER') {
    return 2 ** (safeTier - 1);
  }
  return safeTier;
};

export const getKnightDamageReductionPctForTier = (tier: number): number => Math.max(0, Math.floor(tier) - 1) * 0.1;

export const getBuildingSpawnInfo = (buildingType: BuildingType, tier: number): BuildingSpawnInfo | null => {
  if (buildingType !== 'GOBLIN_CAVE') return null;
  const safeTier = Math.max(1, Math.floor(tier));
  return {
    unitType: 'GOBLIN',
    intervalMs: 1000,
    countPerInterval: safeTier,
  };
};

export const getBuildingStats = (
  buildingType: BuildingType,
  tier: number
): { maxHp: number; aggroRange: number; goldPerTurn: number } => {
  const blueprint = getBuildingBlueprint(buildingType);
  const safeTier = Math.max(1, Math.floor(tier));
  const multiplier = getBuildingTierMultiplier(buildingType, safeTier);
  const baseGold = blueprint.goldPerTurn ?? 0;
  const hasGoldScaling = baseGold > 0;
  return {
    maxHp: blueprint.maxHp * multiplier,
    aggroRange: blueprint.aggroRange * multiplier,
    goldPerTurn: hasGoldScaling ? baseGold + (safeTier - 1) : 0,
  };
};

export const getBuildingAttackStats = (
  buildingType: BuildingType,
  tier: number
): { attackDamage: number; attackRange: number; attackCooldownMs: number; attackDistance: 'MANHATTAN' | 'CHEBYSHEV'; maxTargets: number } | null => {
  const blueprint = getBuildingBlueprint(buildingType);
  if (
    blueprint.attackDamage === undefined ||
    blueprint.attackRange === undefined ||
    blueprint.attackCooldownMs === undefined
  ) {
    return null;
  }
  const safeTier = Math.max(1, Math.floor(tier));
  const multiplier = getBuildingTierMultiplier(buildingType, safeTier);
  return {
    attackDamage: blueprint.attackDamage * multiplier,
    attackRange: blueprint.attackRange * multiplier,
    attackCooldownMs: blueprint.attackCooldownMs,
    attackDistance: blueprint.attackDistance ?? 'MANHATTAN',
    maxTargets: buildingType === 'ARCHER_TOWER' ? safeTier : 1,
  };
};

export const getBuildingFootprintCells = (buildingType: BuildingType, anchor: CellCoord): CellCoord[] => {
  const footprint = getBuildingFootprint(buildingType);
  const cells: CellCoord[] = [];
  for (let dy = 0; dy < footprint.height; dy++) {
    for (let dx = 0; dx < footprint.width; dx++) {
      cells.push({ x: anchor.x + dx, y: anchor.y + dy });
    }
  }
  return cells;
};

export const isCellInBuildingFootprint = (building: { type: BuildingType; x: number; y: number }, cell: CellCoord): boolean => {
  const footprint = getBuildingFootprint(building.type);
  return (
    cell.x >= building.x &&
    cell.x < building.x + footprint.width &&
    cell.y >= building.y &&
    cell.y < building.y + footprint.height
  );
};

export const getBuildingCenter = (building: { type: BuildingType; x: number; y: number }): { x: number; y: number } => {
  const footprint = getBuildingFootprint(building.type);
  return {
    x: building.x + footprint.width / 2,
    y: building.y + footprint.height / 2,
  };
};

export const createBuilding = (params: {
  id: number;
  team: Team;
  type: BuildingType;
  x: number;
  y: number;
  tier?: number;
  upgradeReady?: boolean;
  spawnCooldownMs?: number;
  attackCooldownMs?: number;
}): BuildingState => {
  const tier = params.tier ?? 1;
  const stats = getBuildingStats(params.type, tier);
  const spawnInfo = getBuildingSpawnInfo(params.type, tier);
  return {
    id: params.id,
    team: params.team,
    type: params.type,
    x: params.x,
    y: params.y,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    tier,
    upgradeReady: params.upgradeReady ?? false,
    spawnCooldownMs: params.spawnCooldownMs ?? spawnInfo?.intervalMs ?? 0,
    attackCooldownMs: params.attackCooldownMs ?? 0,
    roundAttackSpeedBonusPct: 0,
    roundSpawnRateBonusPct: 0,
  };
};
