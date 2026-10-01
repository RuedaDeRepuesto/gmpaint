import { ITool, ToolContext } from './BaseTool.ts';
import { getBresenhamPoints, getBrushOffsets, Point, RGBA, rgbToHex, setPixel } from '../core/PixelOps.ts';

export class LineTool implements ITool {
  public id = 'line';
  public name = 'Line';
  public cursor = 'crosshair';

  private isDrawing = false;
  private startPoint: Point | null = null;
  private activeColor: RGBA = { r: 0, g: 0, b: 0, a: 255 };

  public onPointerDown(e: MouseEvent, pixel: Point, ctx: ToolContext): void {
    if (e.button !== 0 && e.button !== 2) return;

    if (ctx.selectionManager.hasFloating()) {
      ctx.selectionManager.commit(ctx.engine.getImageData());
    }

    this.isDrawing = true;
    this.startPoint = pixel;
    this.activeColor = e.button === 0 ? ctx.colorManager.getLeftRgba() : ctx.colorManager.getRightRgba();
  }

  public onPointerMove(_e: MouseEvent, pixel: Point, ctx: ToolContext): void {
    if (!this.isDrawing || !this.startPoint) return;

    const points = getBresenhamPoints(this.startPoint.x, this.startPoint.y, pixel.x, pixel.y);
    const size = ctx.colorManager.getBrushSize();
    const shape = ctx.colorManager.getBrushShape();
    const offsets = getBrushOffsets(size, shape);
    const hex = rgbToHex(this.activeColor.r, this.activeColor.g, this.activeColor.b);

    const previewList: { x: number; y: number; color: string }[] = [];
    for (const pt of points) {
      for (const off of offsets) {
        previewList.push({ x: pt.x + off.x, y: pt.y + off.y, color: hex });
      }
    }

    ctx.engine.setPreviewPoints(previewList);
  }

  public onPointerUp(_e: MouseEvent, pixel: Point, ctx: ToolContext): void {
    if (!this.isDrawing || !this.startPoint) return;

    ctx.historyManager.pushState(ctx.engine.getImageData());
    const points = getBresenhamPoints(this.startPoint.x, this.startPoint.y, pixel.x, pixel.y);
    const size = ctx.colorManager.getBrushSize();
    const shape = ctx.colorManager.getBrushShape();
    const offsets = getBrushOffsets(size, shape);
    const mode = ctx.colorManager.getMode();
    const img = ctx.engine.getImageData();

    for (const pt of points) {
      for (const off of offsets) {
        const px = pt.x + off.x;
        const py = pt.y + off.y;
        if (px >= 0 && px < img.width && py >= 0 && py < img.height) {
          setPixel(img.data, img.width, px, py, this.activeColor, mode);
        }
      }
    }

    this.isDrawing = false;
    this.startPoint = null;
    ctx.engine.setPreviewPoints(null);
  }

  public cleanup(ctx: ToolContext): void {
    this.isDrawing = false;
    this.startPoint = null;
    ctx.engine.setPreviewPoints(null);
  }
}
