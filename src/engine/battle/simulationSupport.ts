import type { BuildingState, GridState, Team, UnitState } from '../game/types';
import {
  createUnit,
  getUnitBlueprint,
  getUnitCenter,
  getUnitFootprint,
  getUnitFootprintCells,
  getUnitStats,
  isGoblinPackUnitType,
} from '../game/unitCatalog';
import { getBuildingFootprint, getBuildingStats } from '../game/buildingCatalog';

export const manhattan = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const BUILDING_HITBOX_PADDING = 0.35;
const OIL_FLASK_RADIUS = 10;
const OIL_FLASK_SLOW_MULTIPLIER = 0.4;

export const keyOf = (x: number, y: number): string => `${x},${y}`;

export const zoneOf = (grid: GridState, unit: UnitState): 'PLAYER' | 'NEUTRAL' | 'ENEMY' => grid.cells[unit.y][unit.x].zone;

export const findNeutralCenterY = (grid: GridState): number | null => {
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (let y = 0; y < grid.rows; y++) {
    if (grid.cells[y][0]?.zone !== 'NEUTRAL') continue;
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minY) || !Number.isFinite(maxY)) return null;
  return Math.floor((minY + maxY) / 2);
};

export interface AttackIntent {
  attackerId: number;
  attackerKind: 'UNIT' | 'BUILDING';
  defenderId: number;
  defenderKind: 'UNIT' | 'BUILDING';
  damage: number;
}

export interface MoveIntent {
  unitId: number;
  toX: number;
  toY: number;
}

export const chebyshev = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

export const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export const getUnitAttackDamage = (unit: UnitState, allies: readonly UnitState[]): number => {
  const blueprint = getUnitBlueprint(unit.type);
  const baseDamage = getUnitStats(unit.type, unit.tier).attackDamage * (unit.statMultiplier ?? 1);
  const bonusRadius = blueprint.allyDamageBonusRadius ?? 0;
  const bonusPerUnit = blueprint.allyDamageBonusPerUnit ?? 0;
  let allyDamageMultiplier = 1;

  if (bonusRadius > 0 && bonusPerUnit > 0) {
    const unitCenter = getUnitCenter(unit);
    const nearbyAllies = allies.filter(ally => {
      if (ally.id === unit.id) return false;
      const samePack = isGoblinPackUnitType(unit.type) && isGoblinPackUnitType(ally.type);
      return (samePack || ally.type === unit.type) && chebyshev(unitCenter, getUnitCenter(ally)) <= bonusRadius;
    }).length;
    allyDamageMultiplier += nearbyAllies * bonusPerUnit;
  }

  return baseDamage * allyDamageMultiplier * (1 + (unit.roundDamageBonusPct ?? 0));
};

export const getUnitMaxHpMultiplier = (unit: UnitState, allies: readonly UnitState[]): number => {
  const blueprint = getUnitBlueprint(unit.type);
  let bonusPct = unit.roundHpBonusPct ?? 0;
  const allyRadius = blueprint.allyMaxHpBonusRadius ?? 0;
  const allyPerUnit = blueprint.allyMaxHpBonusPerUnit ?? 0;
  if (allyRadius > 0 && allyPerUnit > 0) {
    const unitCenter = getUnitCenter(unit);
    const nearbyAllies = allies.filter(ally => {
      if (ally.id === unit.id) return false;
      return ally.type === unit.type && chebyshev(unitCenter, getUnitCenter(ally)) <= allyRadius;
    }).length;
    bonusPct += nearbyAllies * allyPerUnit;
  }
  return 1 + bonusPct;
};

export const applyUnitHpBonuses = (units: readonly UnitState[]): UnitState[] => {
  return units.map(unit => {
    const allies = units.filter(other => other.team === unit.team);
    const baseMaxHp = getUnitStats(unit.type, unit.tier).maxHp * (unit.statMultiplier ?? 1);
    const targetMaxHp = baseMaxHp * getUnitMaxHpMultiplier(unit, allies);
    const hpDelta = targetMaxHp - unit.maxHp;
    return {
      ...unit,
      maxHp: targetMaxHp,
      hp: Math.min(targetMaxHp, Math.max(0, unit.hp + hpDelta)),
    };
  });
};

export const isUnitWithinAttackRange = (attacker: UnitState, target: UnitState): boolean => {
  const blueprint = getUnitBlueprint(attacker.type);
  const attackerCenter = getUnitCenter(attacker);
  const targetCenter = getUnitCenter(target);
  const dist = blueprint.attackDistance === 'CHEBYSHEV' ? chebyshev(attackerCenter, targetCenter) : manhattan(attackerCenter, targetCenter);
  return dist <= blueprint.attackRange;
};

export const getBuildingEngagementPoint = (
  unitCenter: { x: number; y: number },
  building: BuildingState
): { x: number; y: number } => {
  const footprint = getBuildingFootprint(building.type);
  const minX = building.x + 0.5 - BUILDING_HITBOX_PADDING;
  const maxX = building.x + footprint.width - 0.5 + BUILDING_HITBOX_PADDING;
  const minY = building.y + 0.5 - BUILDING_HITBOX_PADDING;
  const maxY = building.y + footprint.height - 0.5 + BUILDING_HITBOX_PADDING;
  return {
    x: clamp(unitCenter.x, minX, maxX),
    y: clamp(unitCenter.y, minY, maxY),
  };
};

type TargetCandidate =
  | { kind: 'UNIT'; id: number; center: { x: number; y: number }; unit: UnitState }
  | { kind: 'BUILDING'; id: number; center: { x: number; y: number }; building: BuildingState };

export const pickNearestTarget = (
  unit: UnitState,
  enemies: readonly UnitState[],
  enemyBuildings: readonly BuildingState[]
): TargetCandidate | null => {
  const unitCenter = getUnitCenter(unit);
  const candidates: TargetCandidate[] = [];
  const ignoreAggroRange = enemies.length === 0;

  for (const enemy of enemies) {
    candidates.push({ kind: 'UNIT', id: enemy.id, center: getUnitCenter(enemy), unit: enemy });
  }

  for (const building of enemyBuildings) {
    const stats = getBuildingStats(building.type, building.tier);
    const center = getBuildingEngagementPoint(unitCenter, building);
    const dist = manhattan(unitCenter, center);
    if (!ignoreAggroRange && dist > stats.aggroRange) continue;
    candidates.push({ kind: 'BUILDING', id: building.id, center, building });
  }

  if (candidates.length === 0) return null;

  let best = candidates[0];
  let bestDist = manhattan(unitCenter, best.center);
  for (let i = 1; i < candidates.length; i++) {
    const candidate = candidates[i];
    const dist = manhattan(unitCenter, candidate.center);
    if (dist < bestDist) {
      best = candidate;
      bestDist = dist;
      continue;
    }
    if (dist === bestDist) {
      if (candidate.kind !== best.kind) {
        if (candidate.kind === 'UNIT') {
          best = candidate;
        }
      } else if (candidate.id < best.id) {
        best = candidate;
      }
    }
  }

  return best;
};

export const getUnitTargetsInAttackRange = (unit: UnitState, enemies: readonly UnitState[]): UnitState[] => {
  const blueprint = getUnitBlueprint(unit.type);
  const unitCenter = getUnitCenter(unit);
  return [...enemies]
    .filter(enemy => {
      const targetCenter = getUnitCenter(enemy);
      const dist =
        blueprint.attackDistance === 'CHEBYSHEV' ? chebyshev(unitCenter, targetCenter) : manhattan(unitCenter, targetCenter);
      return dist <= blueprint.attackRange;
    })
    .sort((a, b) => {
      const distA = manhattan(unitCenter, getUnitCenter(a));
      const distB = manhattan(unitCenter, getUnitCenter(b));
      return distA - distB || a.id - b.id;
    });
};

export const getOilFieldsForTeam = (units: readonly UnitState[], team: Team): Array<{ x: number; y: number }> =>
  units
    .filter(unit => unit.team === team && unit.type === 'ARCHER' && unit.oilFlaskUsed && unit.oilFlaskX !== null && unit.oilFlaskY !== null)
    .map(unit => ({ x: unit.oilFlaskX as number, y: unit.oilFlaskY as number }));

export const getMoveSlowMultiplier = (unit: UnitState, oilFields: readonly { x: number; y: number }[]): number => {
  if (oilFields.length === 0) return 1;
  const center = getUnitCenter(unit);
  return oilFields.some(field => chebyshev(center, field) <= OIL_FLASK_RADIUS) ? OIL_FLASK_SLOW_MULTIPLIER : 1;
};

export const canOccupyAnchor = (
  grid: GridState,
  unit: UnitState,
  anchor: { x: number; y: number },
  occupiedByKey: ReadonlyMap<string, string>
): boolean => {
  const footprint = getUnitFootprint(unit.type);
  const selfKey = `unit:${unit.id}`;
  for (let dy = 0; dy < footprint.height; dy++) {
    for (let dx = 0; dx < footprint.width; dx++) {
      const x = anchor.x + dx;
      const y = anchor.y + dy;
      if (x < 0 || x >= grid.cols || y < 0 || y >= grid.rows) return false;
      const occupant = occupiedByKey.get(keyOf(x, y));
      if (occupant !== undefined && occupant !== selfKey) return false;
    }
  }
  return true;
};

export const findNearestOpenSpawnAnchor = (
  grid: GridState,
  unit: UnitState,
  origin: { x: number; y: number },
  occupiedByKey: ReadonlyMap<string, string>
): { x: number; y: number } | null => {
  const anchors: Array<{ x: number; y: number; dist: number }> = [];
  for (let y = 0; y < grid.rows; y++) {
    for (let x = 0; x < grid.cols; x++) {
      anchors.push({ x, y, dist: manhattan(origin, { x, y }) });
    }
  }

  anchors.sort((a, b) => a.dist - b.dist || a.y - b.y || a.x - b.x);
  for (const anchor of anchors) {
    if (!canOccupyAnchor(grid, unit, anchor, occupiedByKey)) continue;
    return { x: anchor.x, y: anchor.y };
  }

  return null;
};

export const spawnUnitNearOrigin = (params: {
  grid: GridState;
  occupiedByKey: Map<string, string>;
  unitType: UnitState['type'];
  origin: { x: number; y: number };
  team: Team;
  tier: number;
  nextSpawnId: number;
}): UnitState | null => {
  const prototype = createUnit({
    id: params.nextSpawnId,
    team: params.team,
    type: params.unitType,
    x: params.origin.x,
    y: params.origin.y,
    xp: 0,
    tier: params.tier,
  });
  const anchor = findNearestOpenSpawnAnchor(params.grid, prototype, params.origin, params.occupiedByKey);
  if (!anchor) return null;
  const spawn = { ...prototype, x: anchor.x, y: anchor.y };
  for (const cell of getUnitFootprintCells(spawn.type, anchor)) {
    params.occupiedByKey.set(keyOf(cell.x, cell.y), `unit:${spawn.id}`);
  }
  return spawn;
};

export const getMoveStepToward = (
  grid: GridState,
  unit: UnitState,
  target: { x: number; y: number },
  occupiedByKey: ReadonlyMap<string, string>,
  tieBreaker: 'VERTICAL' | 'HORIZONTAL',
  orbitDirection: 1 | -1
): { x: number; y: number } | null => {
  const unitCenter = getUnitCenter(unit);
  const dx = target.x - unitCenter.x;
  const dy = target.y - unitCenter.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const verticalFirst = absDy > absDx || (absDy === absDx && tieBreaker === 'VERTICAL');
  const currentDistance = manhattan(unitCenter, target);
  const candidates = new Map<string, { x: number; y: number; preference: number }>();

  const addCandidate = (x: number, y: number, preference: number): void => {
    const key = keyOf(x, y);
    if (candidates.has(key)) return;
    candidates.set(key, { x, y, preference });
  };

  if (verticalFirst && dy !== 0) addCandidate(unit.x, unit.y + Math.sign(dy), 0);
  if (dx !== 0) addCandidate(unit.x + Math.sign(dx), unit.y, 1);
  if (!verticalFirst && dy !== 0) addCandidate(unit.x, unit.y + Math.sign(dy), 2);

  if (absDx >= absDy) {
    addCandidate(unit.x, unit.y + orbitDirection, 3);
    addCandidate(unit.x, unit.y - orbitDirection, 4);
  } else {
    addCandidate(unit.x + orbitDirection, unit.y, 3);
    addCandidate(unit.x - orbitDirection, unit.y, 4);
  }

  addCandidate(unit.x + 1, unit.y, 5);
  addCandidate(unit.x - 1, unit.y, 6);
  addCandidate(unit.x, unit.y + 1, 7);
  addCandidate(unit.x, unit.y - 1, 8);

  const best = [...candidates.values()]
    .filter(candidate => canOccupyAnchor(grid, unit, candidate, occupiedByKey))
    .map(candidate => {
      const candidateCenter = getUnitCenter({ ...unit, x: candidate.x, y: candidate.y });
      const distance = manhattan(candidateCenter, target);
      const progressBucket = distance < currentDistance ? 0 : distance === currentDistance ? 1 : 2;
      return { ...candidate, distance, progressBucket };
    })
    .sort((a, b) =>
      a.progressBucket - b.progressBucket ||
      a.distance - b.distance ||
      a.preference - b.preference ||
      a.y - b.y ||
      a.x - b.x
    )[0];

  return best ? { x: best.x, y: best.y } : null;
};
