import { ITool, ToolContext } from './BaseTool.ts';
import { getBresenhamPoints, getBrushOffsets, Point, RGBA, setPixel } from '../core/PixelOps.ts';

export class PencilTool implements ITool {
  public id = 'pencil';
  public name = 'Pencil';
  public cursor = 'crosshair';

  private isDrawing = false;
  private lastPoint: Point | null = null;
  private activeColor: RGBA = { r: 0, g: 0, b: 0, a: 255 };

  public onPointerDown(e: MouseEvent, pixel: Point, ctx: ToolContext): void {
    if (e.button !== 0 && e.button !== 2) return;

    // Si había una selección flotante, confirmarla
    if (ctx.selectionManager.hasFloating()) {
      ctx.selectionManager.commit(ctx.engine.getImageData());
    }

    ctx.historyManager.pushState(ctx.engine.getImageData());
    this.isDrawing = true;
    this.lastPoint = pixel;
    this.activeColor = e.button === 0 ? ctx.colorManager.getLeftRgba() : ctx.colorManager.getRightRgba();

    this.drawStamp(pixel, ctx);
    ctx.engine.render();
  }

  public onPointerMove(_e: MouseEvent, pixel: Point, ctx: ToolContext): void {
    if (!this.isDrawing || !this.lastPoint) return;

    const points = getBresenhamPoints(this.lastPoint.x, this.lastPoint.y, pixel.x, pixel.y);
    for (const pt of points) {
      this.drawStamp(pt, ctx);
    }

    this.lastPoint = pixel;
    ctx.engine.render();
  }

  public onPointerUp(_e: MouseEvent, _pixel: Point, _ctx: ToolContext): void {
    this.isDrawing = false;
    this.lastPoint = null;
  }

  private drawStamp(center: Point, ctx: ToolContext): void {
    const size = ctx.colorManager.getBrushSize();
    const shape = ctx.colorManager.getBrushShape();
    const offsets = getBrushOffsets(size, shape);
    const mode = ctx.colorManager.getMode();
    const img = ctx.engine.getImageData();

    for (const off of offsets) {
      const px = center.x + off.x;
      const py = center.y + off.y;
      if (px >= 0 && px < img.width && py >= 0 && py < img.height) {
        setPixel(img.data, img.width, px, py, this.activeColor, mode);
      }
    }
  }
}
