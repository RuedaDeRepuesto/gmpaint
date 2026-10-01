import { ColorMode, hexToRgb, RGBA } from './PixelOps.ts';

export type ColorChangeEvent = {
  leftColor: string;
  rightColor: string;
  opacity: number;
  mode: ColorMode;
  brushSize: number;
  brushShape: 'circle' | 'square';
};

type Listener = (state: ColorChangeEvent) => void;

export class ColorManager {
  private leftColor: string = '#000000';
  private rightColor: string = '#ffffff';
  private opacity: number = 255;
  private mode: ColorMode = 'blend';
  private brushSize: number = 1;
  private brushShape: 'circle' | 'square' = 'circle';
  private listeners: Set<Listener> = new Set();

  public getLeftColor(): string {
    return this.leftColor;
  }

  public getRightColor(): string {
    return this.rightColor;
  }

  public getOpacity(): number {
    return this.opacity;
  }

  public getMode(): ColorMode {
    return this.mode;
  }

  public getBrushSize(): number {
    return this.brushSize;
  }

  public getBrushShape(): 'circle' | 'square' {
    return this.brushShape;
  }

  public getLeftRgba(): RGBA {
    const rgb = hexToRgb(this.leftColor);
    return { ...rgb, a: this.opacity };
  }

  public getRightRgba(): RGBA {
    const rgb = hexToRgb(this.rightColor);
    return { ...rgb, a: this.opacity };
  }

  public setLeftColor(hex: string): void {
    this.leftColor = hex;
    this.notify();
  }

  public setRightColor(hex: string): void {
    this.rightColor = hex;
    this.notify();
  }

  public setOpacity(value: number): void {
    this.opacity = Math.max(0, Math.min(255, Math.round(value)));
    this.notify();
  }

  public setMode(mode: ColorMode): void {
    this.mode = mode;
    this.notify();
  }

  public setBrushSize(size: number): void {
    this.brushSize = Math.max(1, size);
    this.notify();
  }

  public setBrushShape(shape: 'circle' | 'square'): void {
    this.brushShape = shape;
    this.notify();
  }

  public swapColors(): void {
    const temp = this.leftColor;
    this.leftColor = this.rightColor;
    this.rightColor = temp;
    this.notify();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private getState(): ColorChangeEvent {
    return {
      leftColor: this.leftColor,
      rightColor: this.rightColor,
      opacity: this.opacity,
      mode: this.mode,
      brushSize: this.brushSize,
      brushShape: this.brushShape
    };
  }

  private notify(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}
