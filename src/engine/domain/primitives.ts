export type GamePhase = 'DEPLOYMENT' | 'BATTLE' | 'INTERMISSION';
export type Team = 'PLAYER' | 'ENEMY';
export type CellZone = 'PLAYER' | 'NEUTRAL' | 'ENEMY';
export type Race = 'HUMAN' | 'ORC';

export type UnitType = 'KNIGHT' | 'ARCHER' | 'SNIPER' | 'MAGE' | 'GOLEM' | 'GOBLIN' | 'BLOOD_MAGE' | 'BLOOD_GOBLIN' | 'HOBGOBLIN';
export type BuildingType = 'GOLD_MINE' | 'GOBLIN_CAVE' | 'ARCHER_TOWER';
export type PlacementKind = 'UNIT' | 'BUILDING';

export interface CellCoord {
  x: number;
  y: number;
}

export interface CellState {
  x: number;
  y: number;
  zone: CellZone;
}

export interface GridState {
  rows: number;
  cols: number;
  cells: CellState[][];
}
