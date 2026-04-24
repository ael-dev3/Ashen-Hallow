import type { Team, UnitType } from './primitives';

export type SfxEventKind =
  | 'KNIGHT_HIT_KNIGHT'
  | 'KNIGHT_HIT_ARCHER'
  | 'KNIGHT_HIT_MAGE'
  | 'GOBLIN_SPAWN'
  | 'VICTORY';

export interface SfxEvent {
  kind: SfxEventKind;
  count: number;
}

export interface UiMessage {
  kind: 'info' | 'error' | 'success';
  text: string;
}

export interface BattleResult {
  winner: Team | 'DRAW';
  reason: 'ELIMINATION' | 'TIME';
}

export interface RoundUnitSummary {
  type: UnitType;
  tier: number;
  count: number;
  damagePerUnit: number;
  totalDamage: number;
}

export interface RoundSummary {
  round: number;
  winner: Team | 'DRAW';
  playerDamage: number;
  enemyDamage: number;
  playerUnits: RoundUnitSummary[];
  enemyUnits: RoundUnitSummary[];
}

export interface MatchResult {
  winner: Team | 'DRAW';
  reason: 'HP';
}
