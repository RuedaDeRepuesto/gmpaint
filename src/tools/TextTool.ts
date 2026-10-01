import { ITool, ToolContext } from './BaseTool.ts';
import { Point, RGBA } from '../core/PixelOps.ts';

export interface TextOptions {
  text: string;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
}

export type TextPromptHandler = (pos: Point) => Promise<TextOptions | null>;

export class TextTool implements ITool {
  public id = 'text';
  public name = 'Text';
  public cursor = 'crosshair';

  private promptHandler?: TextPromptHandler;

  constructor(promptHandler?: TextPromptHandler) {
    this.promptHandler = promptHandler;
  }

  public setPromptHandler(handler: TextPromptHandler): void {
    this.promptHandler = handler;
  }

  public async onPointerDown(e: MouseEvent, pixel: Point, ctx: ToolContext): Promise<void> {
    if (e.button !== 0 || !this.promptHandler) return;

    if (ctx.selectionManager.hasFloating()) {
      ctx.selectionManager.commit(ctx.engine.getImageData());
    }

    const options = await this.promptHandler(pixel);
    if (!options || !options.text.trim()) return;

    this.renderTextAsFloating(options, pixel, ctx, e.button === 0 ? ctx.colorManager.getLeftRgba() : ctx.colorManager.getRightRgba());
  }

  public onPointerMove(_e: MouseEvent, _pixel: Point, _ctx: ToolContext): void {}
  public onPointerUp(_e: MouseEvent, _pixel: Point, _ctx: ToolContext): void {}

  private renderTextAsFloating(
    options: TextOptions,
    pos: Point,
    ctx: ToolContext,
    color: RGBA
  ): void {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;

    const stylePrefix = `${options.italic ? 'italic ' : ''}${options.bold ? 'bold ' : ''}`;
    tempCtx.font = `${stylePrefix}${options.fontSize}px ${options.fontFamily}`;

    const metrics = tempCtx.measureText(options.text);
    const textW = Math.max(1, Math.ceil(metrics.width));
    const textH = Math.max(1, Math.ceil(options.fontSize * 1.3));

    tempCanvas.width = textW;
    tempCanvas.height = textH;

    tempCtx.font = `${stylePrefix}${options.fontSize}px ${options.fontFamily}`;
    tempCtx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 255})`;
    tempCtx.textBaseline = 'top';
    tempCtx.fillText(options.text, 0, 0);

    const imgData = tempCtx.getImageData(0, 0, textW, textH);

    ctx.historyManager.pushState(ctx.engine.getImageData());
    ctx.selectionManager.paste(imgData, pos.x, pos.y);
    ctx.engine.render();
  }
}
