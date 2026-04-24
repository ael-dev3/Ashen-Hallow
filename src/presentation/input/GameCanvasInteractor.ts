import type { GameAction } from '../../engine/game/actions';
import { getUnitAt } from '../../engine/game/grid';
import type { CellCoord, GameState } from '../../engine/game/types';

export const dispatchCellAction = (params: {
  state: GameState;
  cell: CellCoord;
  dispatch: (action: GameAction) => void;
}): void => {
  const { state, cell, dispatch } = params;
  const unit = getUnitAt(state.units, cell);
  if (unit && unit.team === 'PLAYER') {
    const canSelect = (state.phase === 'DEPLOYMENT' || state.phase === 'INTERMISSION') && !state.matchResult;
    if (canSelect) {
      dispatch({ type: 'SELECT_PLACED_UNIT', unitId: unit.id });
    }
    return;
  }
  if (state.selectedPlacementKind === 'BUILDING') {
    dispatch({ type: 'PLACE_BUILDING', cell });
    return;
  }
  dispatch({ type: 'PLACE_UNIT', cell });
};
