import type { BuildingType, CellCoord, Team, UnitType } from './primitives';

export interface UnitBlueprint {
  type: UnitType;
  name: string;
  unlockCost: number;
  placementCost: number;
  maxHp: number;
  attackDamage: number;
  attackRange: number;
  attackDistance?: 'MANHATTAN' | 'CHEBYSHEV';
  aoeRadius?: number;
  attacksAllUnitsInRange?: boolean;
  spawnsOnDeathsInRange?: boolean;
  summonOnly?: boolean;
  allyDamageBonusRadius?: number;
  allyDamageBonusPerUnit?: number;
  allyMaxHpBonusRadius?: number;
  allyMaxHpBonusPerUnit?: number;
  goblinDeathHpBonusRadius?: number;
  goblinDeathHpBonusPerDeath?: number;
  footprint?: { width: number; height: number };
  placementFootprint?: { width: number; height: number };
  spawnOffsets?: CellCoord[];
  attackCooldownMs: number;
  moveCooldownMs: number;
  moveSpeed: number;
  color: string;
}

export interface BuildingBlueprint {
  type: BuildingType;
  name: string;
  unlockCost: number;
  placementCost: number;
  maxHp: number;
  aggroRange: number;
  goldPerTurn?: number;
  attackDamage?: number;
  attackRange?: number;
  attackCooldownMs?: number;
  attackDistance?: 'MANHATTAN' | 'CHEBYSHEV';
  footprint: { width: number; height: number };
  maxCount?: number;
  color: string;
}

export interface UnitState {
  id: number;
  team: Team;
  type: UnitType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attackCooldownMs: number;
  moveCooldownMs: number;
  inactiveMsRemaining: number;
  xp: number;
  tier: number;
  roundHpBonusPct: number;
  roundDamageBonusPct: number;
  roundKillBlows: number;
  bleedStacks: number;
  bloodMageSpawnsCreated: number;
  mageBlinkUsed: boolean;
  isMirrorImage: boolean;
  statMultiplier: number;
  oilFlaskUsed: boolean;
  oilFlaskX: number | null;
  oilFlaskY: number | null;
}

export interface BuildingState {
  id: number;
  team: Team;
  type: BuildingType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  tier: number;
  upgradeReady: boolean;
  spawnCooldownMs: number;
  attackCooldownMs: number;
  roundAttackSpeedBonusPct: number;
  roundSpawnRateBonusPct: number;
}

export interface DeploymentUnit {
  id: number;
  type: UnitType;
  x: number;
  y: number;
  xp: number;
  tier: number;
  squadId?: number;
  placedTurn?: number;
  lastUpgradeTurn?: number;
}
