import { ITool, ToolContext } from './BaseTool.ts';
import { getPixel, Point, rgbToHex } from '../core/PixelOps.ts';

export class PickerTool implements ITool {
  public id = 'picker';
  public name = 'Color Picker';
  public cursor = 'crosshair';

  public onPointerDown(e: MouseEvent, pixel: Point, ctx: ToolContext): void {
    if (e.button !== 0 && e.button !== 2) return;

    const img = ctx.engine.getImageData();
    if (pixel.x < 0 || pixel.x >= img.width || pixel.y < 0 || pixel.y >= img.height) return;

    const picked = getPixel(img.data, img.width, pixel.x, pixel.y);
    const hex = rgbToHex(picked.r, picked.g, picked.b);

    if (e.button === 0) {
      ctx.colorManager.setLeftColor(hex);
    } else {
      ctx.colorManager.setRightColor(hex);
    }
    ctx.colorManager.setOpacity(picked.a);
  }

  public onPointerMove(_e: MouseEvent, _pixel: Point, _ctx: ToolContext): void {}
  public onPointerUp(_e: MouseEvent, _pixel: Point, _ctx: ToolContext): void {}
}
