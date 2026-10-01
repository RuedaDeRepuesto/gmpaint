import { ITool, ToolContext } from './BaseTool.ts';
import { getRectanglePoints, Point, RGBA, rgbToHex, setPixel } from '../core/PixelOps.ts';

export class RectTool implements ITool {
  public id: string;
  public name: string;
  public cursor = 'crosshair';

  private isFilled: boolean;
  private isDrawing = false;
  private startPoint: Point | null = null;
  private activeColor: RGBA = { r: 0, g: 0, b: 0, a: 255 };

  constructor(isFilled: boolean = false) {
    this.isFilled = isFilled;
    this.id = isFilled ? 'rect-fill' : 'rect';
    this.name = isFilled ? 'Filled Rectangle' : 'Rectangle';
  }

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

    const points = getRectanglePoints(
      this.startPoint.x,
      this.startPoint.y,
      pixel.x,
      pixel.y,
      this.isFilled
    );
    const hex = rgbToHex(this.activeColor.r, this.activeColor.g, this.activeColor.b);

    const previewList = points.map((p) => ({ x: p.x, y: p.y, color: hex }));
    ctx.engine.setPreviewPoints(previewList);
  }

  public onPointerUp(_e: MouseEvent, pixel: Point, ctx: ToolContext): void {
    if (!this.isDrawing || !this.startPoint) return;

    ctx.historyManager.pushState(ctx.engine.getImageData());
    const points = getRectanglePoints(
      this.startPoint.x,
      this.startPoint.y,
      pixel.x,
      pixel.y,
      this.isFilled
    );
    const mode = ctx.colorManager.getMode();
    const img = ctx.engine.getImageData();

    for (const pt of points) {
      if (pt.x >= 0 && pt.x < img.width && pt.y >= 0 && pt.y < img.height) {
        setPixel(img.data, img.width, pt.x, pt.y, this.activeColor, mode);
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
