import type { CellCoord, GridState } from '../../engine/game/types';
import type { GridLayout } from './types';

const GRID_MAP_SCALE = 4;
const GRID_CELL_SCALE = 0.5;
const GRID_ZOOM_MIN = 0.5;
const GRID_ZOOM_MAX = 2;

export class CanvasViewport {
  private sizeCssPx = { width: 0, height: 0 };
  private layout: GridLayout = { cellSizePx: 1, gridLeftPx: 0, gridTopPx: 0, gridWidthPx: 0, gridHeightPx: 0 };
  private panPx = { x: 0, y: 0 };
  private zoom = GRID_ZOOM_MIN;

  public resizeToCssPixels(width: number, height: number): void {
    this.sizeCssPx = { width, height };
  }

  public getSizeCssPx(): { width: number; height: number } {
    return { ...this.sizeCssPx };
  }

  public getLayout(grid: GridState): GridLayout {
    const baseLayout = this.getBaseLayout(grid, this.zoom);
    this.panPx = this.clampPan(baseLayout, this.panPx);
    const gridLeftPx = baseLayout.gridLeftPx + this.panPx.x;
    const gridTopPx = baseLayout.gridTopPx + this.panPx.y;
    this.layout = { ...baseLayout, gridLeftPx, gridTopPx };
    return this.layout;
  }

  public getPan(): { x: number; y: number } {
    return { x: this.panPx.x, y: this.panPx.y };
  }

  public getZoom(): number {
    return this.zoom;
  }

  public setPan(grid: GridState, panX: number, panY: number): void {
    const baseLayout = this.getBaseLayout(grid, this.zoom);
    this.panPx = this.clampPan(baseLayout, { x: panX, y: panY });
  }

  public panBy(grid: GridState, dx: number, dy: number): void {
    this.setPan(grid, this.panPx.x + dx, this.panPx.y + dy);
  }

  public setZoom(grid: GridState, zoom: number): void {
    const clampedZoom = this.clampZoom(zoom);
    this.zoom = clampedZoom;
    const baseLayout = this.getBaseLayout(grid, clampedZoom);
    this.panPx = this.clampPan(baseLayout, this.panPx);
  }

  public setZoomAt(grid: GridState, zoom: number, anchorX: number, anchorY: number): void {
    const layout = this.getLayout(grid);
    if (layout.cellSizePx <= 0) return;
    const gridX = (anchorX - layout.gridLeftPx) / layout.cellSizePx;
    const gridY = (anchorY - layout.gridTopPx) / layout.cellSizePx;

    const clampedZoom = this.clampZoom(zoom);
    this.zoom = clampedZoom;
    const baseLayout = this.getBaseLayout(grid, clampedZoom);
    const panX = anchorX - baseLayout.gridLeftPx - gridX * baseLayout.cellSizePx;
    const panY = anchorY - baseLayout.gridTopPx - gridY * baseLayout.cellSizePx;
    this.panPx = this.clampPan(baseLayout, { x: panX, y: panY });
  }

  public zoomBy(grid: GridState, factor: number, anchorX: number, anchorY: number): void {
    if (!Number.isFinite(factor) || factor === 0) return;
    this.setZoomAt(grid, this.zoom * factor, anchorX, anchorY);
  }

  public cellToCanvasCenter(grid: GridState, cell: CellCoord): { x: number; y: number } {
    const layout = this.getLayout(grid);
    return this.cellToCanvasCenterWithLayout(layout, cell);
  }

  public canvasToCell(grid: GridState, canvasX: number, canvasY: number): CellCoord | null {
    const layout = this.getLayout(grid);
    const localX = canvasX - layout.gridLeftPx;
    const localY = canvasY - layout.gridTopPx;
    if (localX < 0 || localY < 0 || localX >= layout.gridWidthPx || localY >= layout.gridHeightPx) return null;
    const x = Math.floor(localX / layout.cellSizePx);
    const y = Math.floor(localY / layout.cellSizePx);
    if (x < 0 || x >= grid.cols || y < 0 || y >= grid.rows) return null;
    return { x, y };
  }

  public cellToCanvasCenterWithLayout(layout: GridLayout, cell: CellCoord): { x: number; y: number } {
    return {
      x: layout.gridLeftPx + (cell.x + 0.5) * layout.cellSizePx,
      y: layout.gridTopPx + (cell.y + 0.5) * layout.cellSizePx,
    };
  }

  private getBaseLayout(grid: GridState, zoom: number): GridLayout {
    const { width, height } = this.sizeCssPx;
    const cellSizePx = Math.max(4, Math.min(width / grid.cols, height / grid.rows) * GRID_MAP_SCALE * GRID_CELL_SCALE * zoom);
    const gridWidthPx = grid.cols * cellSizePx;
    const gridHeightPx = grid.rows * cellSizePx;
    return {
      cellSizePx,
      gridLeftPx: (width - gridWidthPx) / 2,
      gridTopPx: (height - gridHeightPx) / 2,
      gridWidthPx,
      gridHeightPx,
    };
  }

  private clampZoom(zoom: number): number {
    if (!Number.isFinite(zoom)) return this.zoom;
    return Math.min(GRID_ZOOM_MAX, Math.max(GRID_ZOOM_MIN, zoom));
  }

  private clampPan(baseLayout: GridLayout, pan: { x: number; y: number }): { x: number; y: number } {
    const { width, height } = this.sizeCssPx;
    const maxX = Math.max(0, (baseLayout.gridWidthPx - width) / 2 + baseLayout.cellSizePx * 2);
    const maxY = Math.max(0, (baseLayout.gridHeightPx - height) / 2 + baseLayout.cellSizePx * 2);
    return { x: Math.min(maxX, Math.max(-maxX, pan.x)), y: Math.min(maxY, Math.max(-maxY, pan.y)) };
  }
}
