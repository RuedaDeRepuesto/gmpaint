import { ITool, ToolContext } from './BaseTool.ts';
import { Point } from '../core/PixelOps.ts';

export class SelectTool implements ITool {
  public id = 'select';
  public name = 'Select';
  public cursor = 'crosshair';

  private isSelecting = false;
  private isDraggingSelection = false;
  private startPoint: Point | null = null;
  private lastDragPoint: Point | null = null;

  public onPointerDown(e: MouseEvent, pixel: Point, ctx: ToolContext): void {
    if (e.button !== 0) return;

    const selMgr = ctx.selectionManager;
    const img = ctx.engine.getImageData();

    // Si hace click dentro de la selección existente, moverla
    if (selMgr.pointInsideBounds(pixel.x, pixel.y)) {
      if (!selMgr.hasFloating()) {
        ctx.historyManager.pushState(img);
        selMgr.liftSelection(img);
      }
      this.isDraggingSelection = true;
      this.lastDragPoint = pixel;
      ctx.engine.render();
      return;
    }

    // Si hace click fuera de la selección, confirmar la anterior e iniciar una nueva
    if (selMgr.hasFloating()) {
      ctx.historyManager.pushState(img);
      selMgr.commit(img);
    }

    this.isSelecting = true;
    this.startPoint = pixel;
    selMgr.startSelection(pixel.x, pixel.y);
    ctx.engine.render();
  }

  public onPointerMove(_e: MouseEvent, pixel: Point, ctx: ToolContext): void {
    const selMgr = ctx.selectionManager;

    if (this.isDraggingSelection && this.lastDragPoint) {
      const dx = pixel.x - this.lastDragPoint.x;
      const dy = pixel.y - this.lastDragPoint.y;
      if (dx !== 0 || dy !== 0) {
        selMgr.moveFloating(dx, dy);
        this.lastDragPoint = pixel;
      }
      return;
    }

    if (this.isSelecting && this.startPoint) {
      selMgr.updateSelection(this.startPoint.x, this.startPoint.y, pixel.x, pixel.y);
    }
  }

  public onPointerUp(_e: MouseEvent, _pixel: Point, ctx: ToolContext): void {
    this.isSelecting = false;
    this.isDraggingSelection = false;
    this.startPoint = null;
    this.lastDragPoint = null;
    ctx.engine.render();
  }

  public onKeyDown(e: KeyboardEvent, ctx: ToolContext): void {
    const selMgr = ctx.selectionManager;
    const img = ctx.engine.getImageData();

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selMgr.hasSelection()) {
        e.preventDefault();
        ctx.historyManager.pushState(img);
        selMgr.deleteSelection(img);
        ctx.engine.render();
      }
    } else if (e.key === 'Enter' || e.key === 'Escape') {
      if (selMgr.hasFloating()) {
        ctx.historyManager.pushState(img);
        selMgr.commit(img);
        ctx.engine.render();
      } else {
        selMgr.cancel(img);
        ctx.engine.render();
      }
    }
  }

  public cleanup(_ctx: ToolContext): void {
    this.isSelecting = false;
    this.isDraggingSelection = false;
    this.startPoint = null;
    this.lastDragPoint = null;
  }
}
