import type { GameAction } from '../../engine/game/actions';
import type { CellCoord, GameState } from '../../engine/game/types';
import type { Store } from '../../engine/state/Store';
import type { CanvasRenderer } from '../rendering/CanvasRenderer';

export interface CellLongPressParams {
  cell: CellCoord;
  clientX: number;
  clientY: number;
}

export interface CanvasInputOptions {
  canvas: HTMLCanvasElement;
  store: Store<GameState, GameAction>;
  renderer: CanvasRenderer;
  requestRender?: () => void;
  onCellLongPress?: (params: CellLongPressParams) => void;
}

export type GameActionDispatcher = (action: GameAction) => void;
