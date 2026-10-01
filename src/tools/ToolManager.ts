import { ITool, ToolContext } from './BaseTool.ts';
import { PencilTool } from './PencilTool.ts';
import { LineTool } from './LineTool.ts';
import { EraserTool } from './EraserTool.ts';
import { PickerTool } from './PickerTool.ts';
import { FillTool } from './FillTool.ts';
import { RectTool } from './RectTool.ts';
import { CircleTool } from './CircleTool.ts';
import { SelectTool } from './SelectTool.ts';
import { TextTool } from './TextTool.ts';

type ToolChangeListener = (toolId: string) => void;

export class ToolManager {
  private tools: Map<string, ITool> = new Map();
  private activeTool: ITool;
  private ctx: ToolContext;
  private listeners: Set<ToolChangeListener> = new Set();

  constructor(ctx: ToolContext) {
    this.ctx = ctx;

    const defaultTools: ITool[] = [
      new PencilTool(),
      new LineTool(),
      new EraserTool(),
      new PickerTool(),
      new FillTool(),
      new RectTool(false),
      new RectTool(true),
      new CircleTool(false),
      new CircleTool(true),
      new SelectTool(),
      new TextTool()
    ];

    for (const tool of defaultTools) {
      this.tools.set(tool.id, tool);
    }

    this.activeTool = this.tools.get('pencil')!;
    this.initCanvasListeners();
  }

  public getActiveTool(): ITool {
    return this.activeTool;
  }

  public getTool(id: string): ITool | undefined {
    return this.tools.get(id);
  }

  public setActiveTool(id: string): void {
    const nextTool = this.tools.get(id);
    if (!nextTool || nextTool.id === this.activeTool.id) return;

    if (this.activeTool.cleanup) {
      this.activeTool.cleanup(this.ctx);
    }
    this.activeTool = nextTool;
    this.notify();
  }

  public subscribe(listener: ToolChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.activeTool.id);
    return () => this.listeners.delete(listener);
  }

  private initCanvasListeners(): void {
    const container = this.ctx.engine.getContainer();

    // Desactivar menú contextual para permitir pintar con click derecho
    container.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    container.addEventListener('mousedown', (e) => {
      if (e.button === 1 || this.ctx.engine.isSpaceActive()) return; // reservado para Pan
      const pixel = this.ctx.engine.screenToCanvasPixel(e.clientX, e.clientY);
      this.activeTool.onPointerDown(e, pixel, this.ctx);
    });

    window.addEventListener('mousemove', (e) => {
      const pixel = this.ctx.engine.screenToCanvasPixel(e.clientX, e.clientY);
      this.activeTool.onPointerMove(e, pixel, this.ctx);
    });

    window.addEventListener('mouseup', (e) => {
      const pixel = this.ctx.engine.screenToCanvasPixel(e.clientX, e.clientY);
      this.activeTool.onPointerUp(e, pixel, this.ctx);
    });

    window.addEventListener('keydown', (e) => {
      if (this.activeTool.onKeyDown) {
        this.activeTool.onKeyDown(e, this.ctx);
      }
    });
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.activeTool.id);
    }
  }
}
