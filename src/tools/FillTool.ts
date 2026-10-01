import { ITool, ToolContext } from './BaseTool.ts';
import { floodFill, Point } from '../core/PixelOps.ts';

export class FillTool implements ITool {
  public id = 'fill';
  public name = 'Fill';
  public cursor = 'crosshair';

  public onPointerDown(e: MouseEvent, pixel: Point, ctx: ToolContext): void {
    if (e.button !== 0 && e.button !== 2) return;

    if (ctx.selectionManager.hasFloating()) {
      ctx.selectionManager.commit(ctx.engine.getImageData());
    }

    const img = ctx.engine.getImageData();
    if (pixel.x < 0 || pixel.x >= img.width || pixel.y < 0 || pixel.y >= img.height) return;

    ctx.historyManager.pushState(img);
    const color = e.button === 0 ? ctx.colorManager.getLeftRgba() : ctx.colorManager.getRightRgba();
    const mode = ctx.colorManager.getMode();

    floodFill(img, pixel.x, pixel.y, color, mode, 0);
    ctx.engine.render();
  }

  public onPointerMove(_e: MouseEvent, _pixel: Point, _ctx: ToolContext): void {}
  public onPointerUp(_e: MouseEvent, _pixel: Point, _ctx: ToolContext): void {}
}
