import type { BuildingState, GridState, Team, UnitState } from './types';
import {
  createUnit,
  getPlacementOffsets,
  getUnitBlueprint,
  getUnitCenter,
  getUnitFootprint,
  getUnitFootprintCells,
  getUnitMoveCooldownMs,
  getUnitStats,
  isGoblinPackUnitType,
  isHumanUnitType,
} from './unitCatalog';
import { getBuildingAttackStats, getBuildingCenter, getBuildingFootprint, getBuildingStats } from './buildingCatalog';
import { addXp, XP_REWARD } from './xp';

const manhattan = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const BUILDING_HITBOX_PADDING = 0.35;
const OIL_FLASK_RADIUS = 10;
const OIL_FLASK_SLOW_MULTIPLIER = 0.4;

const keyOf = (x: number, y: number): string => `${x},${y}`;

const zoneOf = (grid: GridState, unit: UnitState): 'PLAYER' | 'NEUTRAL' | 'ENEMY' => grid.cells[unit.y][unit.x].zone;

const findNeutralCenterY = (grid: GridState): number | null => {
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

interface AttackIntent {
  attackerId: number;
  attackerKind: 'UNIT' | 'BUILDING';
  defenderId: number;
  defenderKind: 'UNIT' | 'BUILDING';
  damage: number;
}

interface MoveIntent {
  unitId: number;
  toX: number;
  toY: number;
}

const chebyshev = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const getUnitAttackDamage = (unit: UnitState, allies: readonly UnitState[]): number => {
  const blueprint = getUnitBlueprint(unit.type);
  const baseDamage = getUnitStats(unit.type, unit.tier).attackDamage * (unit.statMultiplier ?? 1);
  const bonusRadius = blueprint.allyDamageBonusRadius ?? 0;
  const bonusPerUnit = blueprint.allyDamageBonusPerUnit ?? 0;
  if (bonusRadius <= 0 || bonusPerUnit <= 0) return baseDamage;

  const unitCenter = getUnitCenter(unit);
  const nearbyAllies = allies.filter(ally => {
    if (ally.id === unit.id) return false;
    const samePack = isGoblinPackUnitType(unit.type) && isGoblinPackUnitType(ally.type);
    return (samePack || ally.type === unit.type) && chebyshev(unitCenter, getUnitCenter(ally)) <= bonusRadius;
  }).length;

  const packDamage = baseDamage * (1 + nearbyAllies * bonusPerUnit);
  return packDamage * (1 + (unit.roundDamageBonusPct ?? 0));
};

const getUnitMaxHpMultiplier = (unit: UnitState, allies: readonly UnitState[]): number => {
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

const applyUnitHpBonuses = (units: readonly UnitState[]): UnitState[] => {
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

const isUnitWithinAttackRange = (attacker: UnitState, target: UnitState): boolean => {
  const blueprint = getUnitBlueprint(attacker.type);
  const attackerCenter = getUnitCenter(attacker);
  const targetCenter = getUnitCenter(target);
  const dist = blueprint.attackDistance === 'CHEBYSHEV' ? chebyshev(attackerCenter, targetCenter) : manhattan(attackerCenter, targetCenter);
  return dist <= blueprint.attackRange;
};

const getBuildingEngagementPoint = (
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

const pickNearestTarget = (
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

const getUnitTargetsInAttackRange = (unit: UnitState, enemies: readonly UnitState[]): UnitState[] => {
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

const getOilFieldsForTeam = (units: readonly UnitState[], team: Team): Array<{ x: number; y: number }> =>
  units
    .filter(unit => unit.team === team && unit.type === 'ARCHER' && unit.oilFlaskUsed && unit.oilFlaskX !== null && unit.oilFlaskY !== null)
    .map(unit => ({ x: unit.oilFlaskX as number, y: unit.oilFlaskY as number }));

const getMoveSlowMultiplier = (unit: UnitState, oilFields: readonly { x: number; y: number }[]): number => {
  if (oilFields.length === 0) return 1;
  const center = getUnitCenter(unit);
  return oilFields.some(field => chebyshev(center, field) <= OIL_FLASK_RADIUS) ? OIL_FLASK_SLOW_MULTIPLIER : 1;
};

const canOccupyAnchor = (
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

const findNearestOpenSpawnAnchor = (
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

const spawnUnitNearOrigin = (params: {
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

const getMoveStepToward = (
  grid: GridState,
  unit: UnitState,
  target: { x: number; y: number },
  occupiedByKey: ReadonlyMap<string, string>,
  tieBreaker: 'VERTICAL' | 'HORIZONTAL',
  orbitDirection: 1 | -1
): { x: number; y: number } | null => {
  const dx = target.x - unit.x;
  const dy = target.y - unit.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const verticalFirst = absDy > absDx || (absDy === absDx && tieBreaker === 'VERTICAL');

  const candidates: Array<{ x: number; y: number }> = [];
  if (verticalFirst && dy !== 0) candidates.push({ x: unit.x, y: unit.y + Math.sign(dy) });
  if (dx !== 0) candidates.push({ x: unit.x + Math.sign(dx), y: unit.y });
  if (!verticalFirst && dy !== 0) candidates.push({ x: unit.x, y: unit.y + Math.sign(dy) });

  for (const c of candidates) {
    if (!canOccupyAnchor(grid, unit, c, occupiedByKey)) continue;
    return c;
  }

  const lateralCandidates: Array<{ x: number; y: number }> = [];
  if (absDx >= absDy) {
    lateralCandidates.push({ x: unit.x, y: unit.y + orbitDirection });
    lateralCandidates.push({ x: unit.x, y: unit.y - orbitDirection });
  } else {
    lateralCandidates.push({ x: unit.x + orbitDirection, y: unit.y });
    lateralCandidates.push({ x: unit.x - orbitDirection, y: unit.y });
  }

  for (const c of lateralCandidates) {
    if (!canOccupyAnchor(grid, unit, c, occupiedByKey)) continue;
    return c;
  }

  return null;
};

export const stepBattle = (params: {
  grid: GridState;
  units: readonly UnitState[];
  buildings: readonly BuildingState[];
  deltaMs: number;
}): {
  units: UnitState[];
  buildings: BuildingState[];
  xpGains: Map<number, number>;
  knightKnightHits: number;
  knightArcherHits: number;
  knightMageHits: number;
} => {
  const playerOilFields = getOilFieldsForTeam(params.units, 'PLAYER');
  const enemyOilFields = getOilFieldsForTeam(params.units, 'ENEMY');

  const alive = applyUnitHpBonuses(
    params.units.filter(u => u.hp > 0).map(u => {
      const enemyOil = u.team === 'PLAYER' ? enemyOilFields : playerOilFields;
      const moveSlowMultiplier = getMoveSlowMultiplier(u, enemyOil);
      return {
        ...u,
        attackCooldownMs: Math.max(0, u.attackCooldownMs - params.deltaMs),
        moveCooldownMs: Math.max(0, u.moveCooldownMs - params.deltaMs * moveSlowMultiplier),
        inactiveMsRemaining: Math.max(0, u.inactiveMsRemaining - params.deltaMs),
        roundHpBonusPct: u.roundHpBonusPct ?? 0,
        roundDamageBonusPct: u.roundDamageBonusPct ?? 0,
        roundKillBlows: u.roundKillBlows ?? 0,
        bleedStacks: u.bleedStacks ?? 0,
        bloodMageSpawnsCreated: u.bloodMageSpawnsCreated ?? 0,
        mageBlinkUsed: u.mageBlinkUsed ?? false,
        isMirrorImage: u.isMirrorImage ?? false,
        statMultiplier: u.statMultiplier ?? 1,
        oilFlaskUsed: u.oilFlaskUsed ?? false,
        oilFlaskX: u.oilFlaskX ?? null,
        oilFlaskY: u.oilFlaskY ?? null,
      };
    })
  );

  const aliveBuildings = params.buildings.filter(b => b.hp > 0).map(b => ({
    ...b,
    attackCooldownMs: Math.max(0, b.attackCooldownMs - params.deltaMs),
  }));

  const playerUnits = alive.filter(u => u.team === 'PLAYER');
  const enemyUnits = alive.filter(u => u.team === 'ENEMY');
  const playerBuildings = aliveBuildings.filter(b => b.team === 'PLAYER');
  const enemyBuildings = aliveBuildings.filter(b => b.team === 'ENEMY');

  const occupiedByKey = new Map<string, string>();
  for (const unit of alive) {
    const footprint = getUnitFootprint(unit.type);
    for (let dy = 0; dy < footprint.height; dy++) {
      for (let dx = 0; dx < footprint.width; dx++) {
        occupiedByKey.set(keyOf(unit.x + dx, unit.y + dy), `unit:${unit.id}`);
      }
    }
  }
  for (const building of aliveBuildings) {
    const footprint = getBuildingFootprint(building.type);
    for (let dy = 0; dy < footprint.height; dy++) {
      for (let dx = 0; dx < footprint.width; dx++) {
        occupiedByKey.set(keyOf(building.x + dx, building.y + dy), `building:${building.id}`);
      }
    }
  }
  const neutralCenterY = findNeutralCenterY(params.grid);

  const zoneCounts: Record<Team, Record<'PLAYER' | 'NEUTRAL' | 'ENEMY', number>> = {
    PLAYER: { PLAYER: 0, NEUTRAL: 0, ENEMY: 0 },
    ENEMY: { PLAYER: 0, NEUTRAL: 0, ENEMY: 0 },
  };
  for (const unit of alive) {
    const zone = zoneOf(params.grid, unit);
    zoneCounts[unit.team][zone] += 1;
  }

  const attacks: AttackIntent[] = [];
  const moves: MoveIntent[] = [];
  const buildingsThatAttacked = new Set<number>();
  const oilFlaskDrops = new Map<number, { x: number; y: number }>();

  const considerUnit = (
    unit: UnitState,
    allies: readonly UnitState[],
    enemies: readonly UnitState[],
    enemyBuildings: readonly BuildingState[]
  ): void => {
    if (unit.inactiveMsRemaining > 0) return;
    const target = pickNearestTarget(unit, enemies, enemyBuildings);
    if (!target) return;

    const blueprint = getUnitBlueprint(unit.type);
    const unitCenter = getUnitCenter(unit);
    const targetCenter = target.center;
    const dist =
      blueprint.attackDistance === 'CHEBYSHEV' ? chebyshev(unitCenter, targetCenter) : manhattan(unitCenter, targetCenter);
    const inRange = dist <= blueprint.attackRange;
    if (unit.type === 'ARCHER' && target.kind === 'UNIT' && inRange && !unit.oilFlaskUsed && !oilFlaskDrops.has(unit.id)) {
      oilFlaskDrops.set(unit.id, { x: target.unit.x, y: target.unit.y });
    }

    const canAttack = inRange && unit.attackCooldownMs === 0;

    if (canAttack) {
      const attackDamage = getUnitAttackDamage(unit, allies);
      if (blueprint.attacksAllUnitsInRange) {
        for (const otherUnit of enemies) {
          if (!isUnitWithinAttackRange(unit, otherUnit)) continue;
          attacks.push({
            attackerId: unit.id,
            attackerKind: 'UNIT',
            defenderId: otherUnit.id,
            defenderKind: 'UNIT',
            damage: attackDamage,
          });
        }
      } else if (target.kind === 'BUILDING') {
        attacks.push({
          attackerId: unit.id,
          attackerKind: 'UNIT',
          defenderId: target.id,
          defenderKind: 'BUILDING',
          damage: attackDamage,
        });
      } else {
        const aoeRadius = blueprint.aoeRadius ?? 0;
        if (aoeRadius > 0) {
          for (const enemy of enemies) {
            if (chebyshev(getUnitCenter(enemy), targetCenter) > aoeRadius) continue;
            attacks.push({
              attackerId: unit.id,
              attackerKind: 'UNIT',
              defenderId: enemy.id,
              defenderKind: 'UNIT',
              damage: attackDamage,
            });
          }
        } else {
          const archerExtraTargets = unit.type === 'ARCHER' ? unit.roundKillBlows ?? 0 : 0;
          const targetsToHit = archerExtraTargets > 0
            ? getUnitTargetsInAttackRange(unit, enemies).slice(0, 1 + archerExtraTargets)
            : [target.unit];
          for (const targetUnit of targetsToHit) {
            attacks.push({
              attackerId: unit.id,
              attackerKind: 'UNIT',
              defenderId: targetUnit.id,
              defenderKind: 'UNIT',
              damage: attackDamage,
            });
          }
        }
      }
      return;
    }

    // Stay put while waiting on cooldown to avoid jittery ping-pong movement.
    if (inRange) return;
    if (unit.moveCooldownMs > 0) return;

    const currentZone = zoneOf(params.grid, unit);
    const enemyZoneCounts = zoneCounts[unit.team === 'PLAYER' ? 'ENEMY' : 'PLAYER'];
    const shouldStageToNeutral =
      neutralCenterY !== null &&
      currentZone !== 'NEUTRAL' &&
      enemyZoneCounts.NEUTRAL === 0 &&
      enemyZoneCounts[currentZone] === 0;

    const moveTarget = shouldStageToNeutral ? { x: unit.x, y: neutralCenterY } : targetCenter;
    const tieBreaker = unit.id < target.id ? 'VERTICAL' : 'HORIZONTAL';
    const orbitDirection: 1 | -1 = (unit.id + target.id) % 2 === 0 ? 1 : -1;
    const step = getMoveStepToward(params.grid, unit, moveTarget, occupiedByKey, tieBreaker, orbitDirection);
    if (!step) return;
    moves.push({ unitId: unit.id, toX: step.x, toY: step.y });
  };

  const considerBuilding = (building: BuildingState, enemies: readonly UnitState[]): void => {
    const attackStats = getBuildingAttackStats(building.type, building.tier ?? 1);
    if (!attackStats) return;
    if (building.attackCooldownMs > 0) return;
    const buildingCenter = getBuildingCenter(building);
    let bestTarget: UnitState | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const enemy of enemies) {
      const enemyCenter = getUnitCenter(enemy);
      const dist =
        attackStats.attackDistance === 'CHEBYSHEV'
          ? chebyshev(buildingCenter, enemyCenter)
          : manhattan(buildingCenter, enemyCenter);
      if (dist > attackStats.attackRange) continue;
      if (dist < bestDist) {
        bestDist = dist;
        bestTarget = enemy;
      } else if (dist === bestDist && bestTarget && enemy.id < bestTarget.id) {
        bestTarget = enemy;
      }
    }
    if (!bestTarget) return;
    attacks.push({
      attackerId: building.id,
      attackerKind: 'BUILDING',
      defenderId: bestTarget.id,
      defenderKind: 'UNIT',
      damage: attackStats.attackDamage,
    });
    buildingsThatAttacked.add(building.id);
  };

  for (const unit of alive) {
    const allies = unit.team === 'PLAYER' ? playerUnits : enemyUnits;
    const enemies = unit.team === 'PLAYER' ? enemyUnits : playerUnits;
    const buildings = unit.team === 'PLAYER' ? enemyBuildings : playerBuildings;
    considerUnit(unit, allies, enemies, buildings);
  }

  for (const building of aliveBuildings) {
    const enemies = building.team === 'PLAYER' ? enemyUnits : playerUnits;
    considerBuilding(building, enemies);
  }

  const unitsById = new Map<number, UnitState>(alive.map(u => [u.id, u]));
  let knightKnightHits = 0;
  let knightArcherHits = 0;
  let knightMageHits = 0;
  for (const attack of attacks) {
    if (attack.defenderKind !== 'UNIT') continue;
    const attacker = unitsById.get(attack.attackerId);
    const defender = unitsById.get(attack.defenderId);
    if (attacker?.type !== 'KNIGHT' || !defender) continue;
    if (defender.type === 'KNIGHT') knightKnightHits += 1;
    if (defender.type === 'ARCHER') knightArcherHits += 1;
    if (defender.type === 'MAGE') knightMageHits += 1;
  }

  const damageByDefender = new Map<number, number>();
  const attacksByDefender = new Map<number, AttackIntent[]>();
  const damageByBuilding = new Map<number, number>();
  for (const a of attacks) {
    if (a.defenderKind === 'BUILDING') {
      damageByBuilding.set(a.defenderId, (damageByBuilding.get(a.defenderId) ?? 0) + a.damage);
      continue;
    }
    damageByDefender.set(a.defenderId, (damageByDefender.get(a.defenderId) ?? 0) + a.damage);
    if (a.attackerKind === 'UNIT') {
      const list = attacksByDefender.get(a.defenderId);
      if (list) {
        list.push(a);
      } else {
        attacksByDefender.set(a.defenderId, [a]);
      }
    }
  }

  const attackedByAttacker = new Set(attacks.filter(a => a.attackerKind === 'UNIT').map(a => a.attackerId));
  const knightBleedStacksAdded = new Map<number, number>();
  for (const attack of attacks) {
    if (attack.attackerKind !== 'UNIT' || attack.defenderKind !== 'UNIT') continue;
    const defender = unitsById.get(attack.defenderId);
    if (defender?.type !== 'KNIGHT') continue;
    knightBleedStacksAdded.set(attack.attackerId, (knightBleedStacksAdded.get(attack.attackerId) ?? 0) + 1);
  }
  const xpGains = new Map<number, number>();
  const humanKillBlowCounts = new Map<number, number>();

  for (const [defenderId, defenderAttacks] of attacksByDefender) {
    const defender = alive.find(u => u.id === defenderId);
    if (!defender) continue;
    let remainingHp = defender.hp;
    let killerId: number | null = null;
    for (const attack of defenderAttacks) {
      remainingHp -= attack.damage;
      if (remainingHp <= 0) {
        killerId = attack.attackerId;
        break;
      }
    }
    if (killerId === null) continue;
    const gain = XP_REWARD[defender.type];
    xpGains.set(killerId, (xpGains.get(killerId) ?? 0) + gain);
    const killer = unitsById.get(killerId);
    if (killer && isHumanUnitType(killer.type)) {
      humanKillBlowCounts.set(killerId, (humanKillBlowCounts.get(killerId) ?? 0) + 1);
    }
  }

  const afterBuildingAttacks = aliveBuildings
    .map(b => {
      const damage = damageByBuilding.get(b.id) ?? 0;
      const hp = Math.max(0, b.hp - damage);
      const attackStats = getBuildingAttackStats(b.type, b.tier ?? 1);
      const attackCooldownMs =
        buildingsThatAttacked.has(b.id) && attackStats ? attackStats.attackCooldownMs : b.attackCooldownMs;
      return { ...b, hp, attackCooldownMs };
    })
    .filter(b => b.hp > 0);

  const afterAttacks = alive
    .map(u => {
      const totalDamage = damageByDefender.get(u.id) ?? 0;
      const attackCooldownMs = attackedByAttacker.has(u.id) ? getUnitBlueprint(u.type).attackCooldownMs : u.attackCooldownMs;
      const gainedXp = xpGains.get(u.id) ?? 0;
      const xp = addXp(u.xp, gainedXp, u.type, u.tier);
      const killBlowsThisStep = humanKillBlowCounts.get(u.id) ?? 0;
      const roundDamageBonusPct = (u.roundDamageBonusPct ?? 0) + killBlowsThisStep * 0.01;
      const roundKillBlows = (u.roundKillBlows ?? 0) + killBlowsThisStep;
      const bleedStacks = (u.bleedStacks ?? 0) + (knightBleedStacksAdded.get(u.id) ?? 0);
      const bleedDamage = u.maxHp * 0.01 * bleedStacks * (params.deltaMs / 1000);
      const hp = Math.max(0, u.hp - totalDamage - bleedDamage);
      const oilFlaskDrop = oilFlaskDrops.get(u.id);
      return {
        ...u,
        hp,
        attackCooldownMs,
        xp,
        roundDamageBonusPct,
        roundKillBlows,
        bleedStacks,
        oilFlaskUsed: u.oilFlaskUsed || !!oilFlaskDrop,
        oilFlaskX: oilFlaskDrop?.x ?? u.oilFlaskX,
        oilFlaskY: oilFlaskDrop?.y ?? u.oilFlaskY,
      };
    })
    .filter(u => u.hp > 0);

  const deadUnits = alive.filter(unit => !afterAttacks.some(survivor => survivor.id === unit.id));
  let afterDeathBuffs = afterAttacks.map(unit => ({ ...unit }));
  for (const deadUnit of deadUnits) {
    if (!isGoblinPackUnitType(deadUnit.type)) continue;
    afterDeathBuffs = afterDeathBuffs.map(unit => {
      const blueprint = getUnitBlueprint(unit.type);
      const deathBonusRadius = blueprint.goblinDeathHpBonusRadius ?? 0;
      const deathBonusPerDeath = blueprint.goblinDeathHpBonusPerDeath ?? 0;
      if (deathBonusRadius <= 0 || deathBonusPerDeath <= 0) return unit;
      if (chebyshev(getUnitCenter(unit), getUnitCenter(deadUnit)) > deathBonusRadius) return unit;
      return { ...unit, roundHpBonusPct: (unit.roundHpBonusPct ?? 0) + deathBonusPerDeath };
    });
  }
  afterDeathBuffs = applyUnitHpBonuses(afterDeathBuffs);

  let nextSpawnId = alive.reduce((maxId, unit) => Math.max(maxId, unit.id), 0) + 1;
  const spawnedUnitsFromDeaths: UnitState[] = [];

  const occupiedAfterAttacks = new Map<string, string>();
  const buildingsById = new Map<number, BuildingState>(aliveBuildings.map(building => [building.id, building]));
  for (const unit of afterDeathBuffs) {
    const footprint = getUnitFootprint(unit.type);
    for (let dy = 0; dy < footprint.height; dy++) {
      for (let dx = 0; dx < footprint.width; dx++) {
        occupiedAfterAttacks.set(keyOf(unit.x + dx, unit.y + dy), `unit:${unit.id}`);
      }
    }
  }
  for (const building of afterBuildingAttacks) {
    const footprint = getBuildingFootprint(building.type);
    for (let dy = 0; dy < footprint.height; dy++) {
      for (let dx = 0; dx < footprint.width; dx++) {
        occupiedAfterAttacks.set(keyOf(building.x + dx, building.y + dy), `building:${building.id}`);
      }
    }
  }

  afterDeathBuffs = afterDeathBuffs.map(unit => {
    if (unit.type !== 'MAGE' || unit.isMirrorImage || unit.mageBlinkUsed) return unit;
    if ((damageByDefender.get(unit.id) ?? 0) <= 0) return unit;

    const incomingAttack = attacks.find(attack => attack.defenderKind === 'UNIT' && attack.defenderId === unit.id);
    const attackerUnit = incomingAttack?.attackerKind === 'UNIT' ? unitsById.get(incomingAttack.attackerId) : null;
    const attackerBuilding = incomingAttack?.attackerKind === 'BUILDING' ? buildingsById.get(incomingAttack.attackerId) : null;
    const attackerCenter = attackerUnit
      ? getUnitCenter(attackerUnit)
      : attackerBuilding
        ? getBuildingCenter(attackerBuilding)
        : { x: unit.x, y: unit.team === 'PLAYER' ? unit.y + 1 : unit.y - 1 };

    const unitCenter = getUnitCenter(unit);
    const deltaX = unitCenter.x - attackerCenter.x;
    const deltaY = unitCenter.y - attackerCenter.y;
    const blinkDirection =
      Math.abs(deltaY) >= Math.abs(deltaX) && deltaY !== 0
        ? { x: 0, y: Math.sign(deltaY) }
        : deltaX !== 0
          ? { x: Math.sign(deltaX), y: 0 }
          : { x: 0, y: unit.team === 'PLAYER' ? -1 : 1 };
    const blinkOrigin = { x: unit.x + blinkDirection.x * 5, y: unit.y + blinkDirection.y * 5 };

    for (const cell of getUnitFootprintCells(unit.type, { x: unit.x, y: unit.y })) {
      occupiedAfterAttacks.delete(keyOf(cell.x, cell.y));
    }

    const blinkAnchor = findNearestOpenSpawnAnchor(params.grid, unit, blinkOrigin, occupiedAfterAttacks) ?? { x: unit.x, y: unit.y };
    const blinkedMage = { ...unit, x: blinkAnchor.x, y: blinkAnchor.y, mageBlinkUsed: true };

    for (const cell of getUnitFootprintCells(blinkedMage.type, blinkAnchor)) {
      occupiedAfterAttacks.set(keyOf(cell.x, cell.y), `unit:${blinkedMage.id}`);
    }

    for (let i = 0; i < 4; i++) {
      const spawn = spawnUnitNearOrigin({
        grid: params.grid,
        occupiedByKey: occupiedAfterAttacks,
        unitType: 'MAGE',
        origin: blinkAnchor,
        team: blinkedMage.team,
        tier: blinkedMage.tier,
        nextSpawnId,
      });
      if (!spawn) break;
      spawnedUnitsFromDeaths.push({
        ...spawn,
        hp: blinkedMage.maxHp * 0.1,
        maxHp: blinkedMage.maxHp * 0.1,
        attackCooldownMs: blinkedMage.attackCooldownMs,
        moveCooldownMs: blinkedMage.moveCooldownMs,
        inactiveMsRemaining: blinkedMage.inactiveMsRemaining,
        xp: blinkedMage.xp,
        roundHpBonusPct: blinkedMage.roundHpBonusPct,
        roundDamageBonusPct: blinkedMage.roundDamageBonusPct,
        roundKillBlows: blinkedMage.roundKillBlows,
        bleedStacks: blinkedMage.bleedStacks,
        bloodMageSpawnsCreated: blinkedMage.bloodMageSpawnsCreated,
        mageBlinkUsed: true,
        isMirrorImage: true,
        statMultiplier: 0.1,
        oilFlaskUsed: false,
        oilFlaskX: null,
        oilFlaskY: null,
      });
      nextSpawnId += 1;
    }

    return blinkedMage;
  });

  const bloodMages = alive.filter(unit => getUnitBlueprint(unit.type).spawnsOnDeathsInRange);
  const bloodMageSpawnCounts = new Map<number, number>(
    bloodMages.map(unit => [unit.id, unit.bloodMageSpawnsCreated ?? 0])
  );

  for (const deadUnit of deadUnits) {
    if (deadUnit.type !== 'GOLEM') continue;
    const goblinSquadSize = getPlacementOffsets('GOBLIN').length;
    for (let i = 0; i < goblinSquadSize; i++) {
      const spawn = spawnUnitNearOrigin({
        grid: params.grid,
        occupiedByKey: occupiedAfterAttacks,
        unitType: 'GOBLIN',
        origin: { x: deadUnit.x, y: deadUnit.y },
        team: deadUnit.team,
        tier: deadUnit.tier,
        nextSpawnId,
      });
      if (!spawn) break;
      spawnedUnitsFromDeaths.push(spawn);
      nextSpawnId += 1;
    }
  }

  for (const bloodMage of bloodMages) {
    for (const deadUnit of deadUnits) {
      if (deadUnit.type === 'BLOOD_GOBLIN') continue;
      if (!isUnitWithinAttackRange(bloodMage, deadUnit)) continue;
      const spawn = spawnUnitNearOrigin({
        grid: params.grid,
        occupiedByKey: occupiedAfterAttacks,
        unitType: 'BLOOD_GOBLIN',
        origin: { x: deadUnit.x, y: deadUnit.y },
        team: bloodMage.team,
        tier: deadUnit.tier,
        nextSpawnId,
      });
      if (!spawn) continue;
      spawnedUnitsFromDeaths.push(spawn);
      bloodMageSpawnCounts.set(bloodMage.id, (bloodMageSpawnCounts.get(bloodMage.id) ?? 0) + 1);
      nextSpawnId += 1;
    }
  }

  for (const deadUnit of deadUnits) {
    if (deadUnit.type !== 'BLOOD_MAGE') continue;
    const explosionCount = (bloodMageSpawnCounts.get(deadUnit.id) ?? 0) * 2;
    for (let i = 0; i < explosionCount; i++) {
      const spawn = spawnUnitNearOrigin({
        grid: params.grid,
        occupiedByKey: occupiedAfterAttacks,
        unitType: 'BLOOD_GOBLIN',
        origin: { x: deadUnit.x, y: deadUnit.y },
        team: deadUnit.team,
        tier: deadUnit.tier,
        nextSpawnId,
      });
      if (!spawn) break;
      spawnedUnitsFromDeaths.push(spawn);
      nextSpawnId += 1;
    }
  }

  afterDeathBuffs = afterDeathBuffs.map(unit =>
    unit.type === 'BLOOD_MAGE'
      ? { ...unit, bloodMageSpawnsCreated: bloodMageSpawnCounts.get(unit.id) ?? unit.bloodMageSpawnsCreated }
      : unit
  );

  const unitsAfterSpawns = [...afterDeathBuffs, ...spawnedUnitsFromDeaths];
  const aliveIdsAfterAttacks = new Set<number>(unitsAfterSpawns.map(u => u.id));
  const afterAttacksById = new Map<number, UnitState>(unitsAfterSpawns.map(u => [u.id, u]));

  const winners = new Map<number, MoveIntent>();
  const takenTargets = new Set<string>();
  for (const move of moves) {
    if (!aliveIdsAfterAttacks.has(move.unitId)) continue;
    const mover = afterAttacksById.get(move.unitId);
    if (!mover) continue;
    if (!canOccupyAnchor(params.grid, mover, { x: move.toX, y: move.toY }, occupiedAfterAttacks)) continue;
    const targetCells = getUnitFootprintCells(mover.type, { x: move.toX, y: move.toY });
    if (targetCells.some(cell => takenTargets.has(keyOf(cell.x, cell.y)))) continue;
    for (const cell of targetCells) {
      takenTargets.add(keyOf(cell.x, cell.y));
    }
    winners.set(move.unitId, move);
  }

  const movedUnits = unitsAfterSpawns.map(u => {
    const winner = winners.get(u.id);
    if (!winner) return u;
    const enemyOilFieldsAfterSpawns = getOilFieldsForTeam(unitsAfterSpawns, u.team === 'PLAYER' ? 'ENEMY' : 'PLAYER');
    const movedUnit = { ...u, x: winner.toX, y: winner.toY };
    const moveSlowMultiplier = getMoveSlowMultiplier(movedUnit, enemyOilFieldsAfterSpawns);
    return {
      ...movedUnit,
      moveCooldownMs: getUnitMoveCooldownMs(u.type) / moveSlowMultiplier,
    };
  });

  return { units: movedUnits, buildings: afterBuildingAttacks, xpGains, knightKnightHits, knightArcherHits, knightMageHits };
};

export const countAliveByTeam = (units: readonly UnitState[], team: Team): number =>
  units.reduce((count, u) => (u.team === team && u.hp > 0 ? count + 1 : count), 0);
