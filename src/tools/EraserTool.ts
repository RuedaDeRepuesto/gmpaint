import { ITool, ToolContext } from './BaseTool.ts';
import { getBresenhamPoints, getBrushOffsets, Point, RGBA, setPixel } from '../core/PixelOps.ts';

export class EraserTool implements ITool {
  public id = 'eraser';
  public name = 'Eraser';
  public cursor = 'crosshair';

  private isErasing = false;
  private lastPoint: Point | null = null;
  private readonly clearColor: RGBA = { r: 0, g: 0, b: 0, a: 0 };

  public onPointerDown(e: MouseEvent, pixel: Point, ctx: ToolContext): void {
    if (e.button !== 0 && e.button !== 2) return;

    if (ctx.selectionManager.hasFloating()) {
      ctx.selectionManager.commit(ctx.engine.getImageData());
    }

    ctx.historyManager.pushState(ctx.engine.getImageData());
    this.isErasing = true;
    this.lastPoint = pixel;

    this.eraseStamp(pixel, ctx);
    ctx.engine.render();
  }

  public onPointerMove(_e: MouseEvent, pixel: Point, ctx: ToolContext): void {
    if (!this.isErasing || !this.lastPoint) return;

    const points = getBresenhamPoints(this.lastPoint.x, this.lastPoint.y, pixel.x, pixel.y);
    for (const pt of points) {
      this.eraseStamp(pt, ctx);
    }

    this.lastPoint = pixel;
    ctx.engine.render();
  }

  public onPointerUp(_e: MouseEvent, _pixel: Point, _ctx: ToolContext): void {
    this.isErasing = false;
    this.lastPoint = null;
  }

  private eraseStamp(center: Point, ctx: ToolContext): void {
    const size = ctx.colorManager.getBrushSize();
    const shape = ctx.colorManager.getBrushShape();
    const offsets = getBrushOffsets(size, shape);
    const img = ctx.engine.getImageData();

    for (const off of offsets) {
      const px = center.x + off.x;
      const py = center.y + off.y;
      if (px >= 0 && px < img.width && py >= 0 && py < img.height) {
        setPixel(img.data, img.width, px, py, this.clearColor, 'replace');
      }
    }
  }
}
