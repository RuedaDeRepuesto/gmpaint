import { CanvasEngine } from '../core/CanvasEngine.ts';
import { ColorManager } from '../core/ColorManager.ts';
import { HistoryManager } from '../core/HistoryManager.ts';
import { SelectionManager } from '../core/SelectionManager.ts';
import { Point } from '../core/PixelOps.ts';

export interface ToolContext {
  engine: CanvasEngine;
  colorManager: ColorManager;
  selectionManager: SelectionManager;
  historyManager: HistoryManager;
  setActiveTool?: (id: string) => void;
}

export interface ITool {
  id: string;
  name: string;
  cursor: string;
  onPointerDown(e: MouseEvent, pixel: Point, ctx: ToolContext): void;
  onPointerMove(e: MouseEvent, pixel: Point, ctx: ToolContext): void;
  onPointerUp(e: MouseEvent, pixel: Point, ctx: ToolContext): void;
  onKeyDown?(e: KeyboardEvent, ctx: ToolContext): void;
  cleanup?(ctx: ToolContext): void;
}
