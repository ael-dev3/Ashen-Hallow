import type { CellZone } from '../../engine/game/types';

export const ZONE_FILL: Record<CellZone, string> = {
  PLAYER: 'rgba(46, 204, 113, 0.10)',
  NEUTRAL: 'rgba(241, 196, 15, 0.08)',
  ENEMY: 'rgba(231, 76, 60, 0.10)',
};

export const TEAM_STROKE: Record<'PLAYER' | 'ENEMY', string> = {
  PLAYER: 'rgba(46, 204, 113, 0.95)',
  ENEMY: 'rgba(231, 76, 60, 0.95)',
};

export const FLANK_TINT_ENEMY_DEPLOY = 'rgba(231, 76, 60, 0.16)';
export const FLANK_TINT_PLAYER_DEPLOY = 'rgba(46, 204, 113, 0.16)';
export const FLANK_TINT_LOCKED = 'rgba(148, 156, 166, 0.14)';
export const INACTIVE_UNIT_FILL = 'rgba(148, 156, 166, 0.65)';
