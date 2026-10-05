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

    // 1. Si hace click dentro de la selección existente (flotante o estática), iniciar arrastre
    if (selMgr.pointInsideBounds(pixel.x, pixel.y)) {
      if (!selMgr.hasFloating()) {
        ctx.historyManager.pushState(img);
        selMgr.liftSelection(img);
      }
      this.isDraggingSelection = true;
      this.lastDragPoint = pixel;
      ctx.engine.getContainer().style.cursor = 'grabbing';
      ctx.engine.render();
      return;
    }

    // 2. Si hace click fuera de una selección flotante, el click la estampa / coloca en el lienzo
    if (selMgr.hasFloating()) {
      ctx.historyManager.pushState(img);
      selMgr.commit(img);
      ctx.engine.render();
      return;
    }

    // 3. Si no hay capa flotante, iniciar una nueva selección rectangular
    this.isSelecting = true;
    this.startPoint = pixel;
    selMgr.startSelection(pixel.x, pixel.y);
    ctx.engine.render();
  }

  public onPointerMove(_e: MouseEvent, pixel: Point, ctx: ToolContext): void {
    const selMgr = ctx.selectionManager;
    const container = ctx.engine.getContainer();

    if (this.isDraggingSelection && this.lastDragPoint) {
      const dx = pixel.x - this.lastDragPoint.x;
      const dy = pixel.y - this.lastDragPoint.y;
      if (dx !== 0 || dy !== 0) {
        selMgr.moveFloating(dx, dy);
        this.lastDragPoint = pixel;
        ctx.engine.render();
      }
      container.style.cursor = 'grabbing';
      return;
    }

    if (this.isSelecting && this.startPoint) {
      selMgr.updateSelection(this.startPoint.x, this.startPoint.y, pixel.x, pixel.y);
      ctx.engine.render();
      container.style.cursor = 'crosshair';
      return;
    }

    // Indicador visual de cursor: 'move' si está sobre la selección, o 'crosshair'
    if (selMgr.hasSelection() && selMgr.pointInsideBounds(pixel.x, pixel.y)) {
      container.style.cursor = 'move';
    } else {
      container.style.cursor = 'crosshair';
    }
  }

  public onPointerUp(_e: MouseEvent, _pixel: Point, ctx: ToolContext): void {
    const selMgr = ctx.selectionManager;
    const container = ctx.engine.getContainer();

    // Si fue un simple click sin arrastrar sobre el fondo, descartar selección de 1px
    if (this.isSelecting) {
      const bounds = selMgr.getBounds();
      if (bounds && bounds.width <= 1 && bounds.height <= 1) {
        selMgr.cancel(ctx.engine.getImageData());
      }
    }

    this.isSelecting = false;
    this.isDraggingSelection = false;
    this.startPoint = null;
    this.lastDragPoint = null;
    container.style.cursor = 'crosshair';
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

  public cleanup(ctx: ToolContext): void {
    if (ctx.selectionManager.hasFloating()) {
      ctx.historyManager.pushState(ctx.engine.getImageData());
      ctx.selectionManager.commit(ctx.engine.getImageData());
      ctx.engine.render();
    }
    this.isSelecting = false;
    this.isDraggingSelection = false;
    this.startPoint = null;
    this.lastDragPoint = null;
    ctx.engine.getContainer().style.cursor = 'crosshair';
  }
}
