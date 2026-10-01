import { blendPixel, RGBA } from './PixelOps.ts';

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FloatingLayer {
  x: number;
  y: number;
  imageData: ImageData;
}

export class SelectionManager {
  private bounds: SelectionRect | null = null;
  private floating: FloatingLayer | null = null;
  private internalClipboard: ImageData | null = null;
  private onSelectionChangeCallback?: () => void;

  public setOnChange(cb: () => void): void {
    this.onSelectionChangeCallback = cb;
  }

  public getBounds(): SelectionRect | null {
    return this.bounds;
  }

  public getFloating(): FloatingLayer | null {
    return this.floating;
  }

  public hasSelection(): boolean {
    return this.bounds !== null || this.floating !== null;
  }

  public hasFloating(): boolean {
    return this.floating !== null;
  }

  public startSelection(x: number, y: number): void {
    this.bounds = { x, y, width: 0, height: 0 };
    this.notify();
  }

  public updateSelection(x0: number, y0: number, x1: number, y1: number): void {
    const minX = Math.min(x0, x1);
    const minY = Math.min(y0, y1);
    const width = Math.abs(x1 - x0) + 1;
    const height = Math.abs(y1 - y0) + 1;
    this.bounds = { x: minX, y: minY, width, height };
    this.notify();
  }

  public liftSelection(canvasData: ImageData): void {
    if (!this.bounds || this.floating) return;
    const { x, y, width, height } = this.bounds;
    if (width <= 0 || height <= 0) return;

    const floatingData = new ImageData(width, height);
    for (let sy = 0; sy < height; sy++) {
      for (let sx = 0; sx < width; sx++) {
        const cx = x + sx;
        const cy = y + sy;
        if (cx >= 0 && cx < canvasData.width && cy >= 0 && cy < canvasData.height) {
          const srcIdx = (cy * canvasData.width + cx) * 4;
          const dstIdx = (sy * width + sx) * 4;

          floatingData.data[dstIdx] = canvasData.data[srcIdx];
          floatingData.data[dstIdx + 1] = canvasData.data[srcIdx + 1];
          floatingData.data[dstIdx + 2] = canvasData.data[srcIdx + 2];
          floatingData.data[dstIdx + 3] = canvasData.data[srcIdx + 3];

          // Borrar el origen dejándolo transparente
          canvasData.data[srcIdx] = 0;
          canvasData.data[srcIdx + 1] = 0;
          canvasData.data[srcIdx + 2] = 0;
          canvasData.data[srcIdx + 3] = 0;
        }
      }
    }

    this.floating = { x, y, imageData: floatingData };
    this.notify();
  }

  public moveFloating(dx: number, dy: number): void {
    if (!this.floating) return;
    this.floating.x += dx;
    this.floating.y += dy;
    if (this.bounds) {
      this.bounds.x += dx;
      this.bounds.y += dy;
    }
    this.notify();
  }

  public setFloatingPos(x: number, y: number): void {
    if (!this.floating) return;
    this.floating.x = x;
    this.floating.y = y;
    if (this.bounds) {
      this.bounds.x = x;
      this.bounds.y = y;
    }
    this.notify();
  }

  /**
   * Pega la capa flotante directamente en el ImageData del lienzo principal.
   */
  public commit(canvasData: ImageData): boolean {
    if (!this.floating) {
      this.bounds = null;
      this.notify();
      return false;
    }

    const { x, y, imageData } = this.floating;
    for (let sy = 0; sy < imageData.height; sy++) {
      for (let sx = 0; sx < imageData.width; sx++) {
        const cx = x + sx;
        const cy = y + sy;
        if (cx >= 0 && cx < canvasData.width && cy >= 0 && cy < canvasData.height) {
          const srcIdx = (sy * imageData.width + sx) * 4;
          const dstIdx = (cy * canvasData.width + cx) * 4;

          const srcAlpha = imageData.data[srcIdx + 3];
          if (srcAlpha > 0) {
            const destPixel: RGBA = {
              r: canvasData.data[dstIdx],
              g: canvasData.data[dstIdx + 1],
              b: canvasData.data[dstIdx + 2],
              a: canvasData.data[dstIdx + 3]
            };
            const srcPixel: RGBA = {
              r: imageData.data[srcIdx],
              g: imageData.data[srcIdx + 1],
              b: imageData.data[srcIdx + 2],
              a: srcAlpha
            };
            const blended = blendPixel(destPixel, srcPixel, 'blend');
            canvasData.data[dstIdx] = blended.r;
            canvasData.data[dstIdx + 1] = blended.g;
            canvasData.data[dstIdx + 2] = blended.b;
            canvasData.data[dstIdx + 3] = blended.a;
          }
        }
      }
    }

    this.floating = null;
    this.bounds = null;
    this.notify();
    return true;
  }

  public cancel(canvasData: ImageData): void {
    if (this.floating) {
      this.commit(canvasData);
    }
    this.bounds = null;
    this.floating = null;
    this.notify();
  }

  public copy(canvasData: ImageData): ImageData | null {
    if (this.floating) {
      this.internalClipboard = this.cloneImageData(this.floating.imageData);
      return this.internalClipboard;
    }
    if (!this.bounds || this.bounds.width <= 0 || this.bounds.height <= 0) return null;

    const { x, y, width, height } = this.bounds;
    const copied = new ImageData(width, height);

    for (let sy = 0; sy < height; sy++) {
      for (let sx = 0; sx < width; sx++) {
        const cx = x + sx;
        const cy = y + sy;
        if (cx >= 0 && cx < canvasData.width && cy >= 0 && cy < canvasData.height) {
          const srcIdx = (cy * canvasData.width + cx) * 4;
          const dstIdx = (sy * width + sx) * 4;
          copied.data[dstIdx] = canvasData.data[srcIdx];
          copied.data[dstIdx + 1] = canvasData.data[srcIdx + 1];
          copied.data[dstIdx + 2] = canvasData.data[srcIdx + 2];
          copied.data[dstIdx + 3] = canvasData.data[srcIdx + 3];
        }
      }
    }

    this.internalClipboard = copied;
    return copied;
  }

  public cut(canvasData: ImageData): ImageData | null {
    const copied = this.copy(canvasData);
    if (!copied) return null;

    if (this.floating) {
      this.floating = null;
      this.bounds = null;
      this.notify();
      return copied;
    }

    if (this.bounds) {
      const { x, y, width, height } = this.bounds;
      for (let sy = 0; sy < height; sy++) {
        for (let sx = 0; sx < width; sx++) {
          const cx = x + sx;
          const cy = y + sy;
          if (cx >= 0 && cx < canvasData.width && cy >= 0 && cy < canvasData.height) {
            const idx = (cy * canvasData.width + cx) * 4;
            canvasData.data[idx] = 0;
            canvasData.data[idx + 1] = 0;
            canvasData.data[idx + 2] = 0;
            canvasData.data[idx + 3] = 0;
          }
        }
      }
      this.bounds = null;
      this.notify();
    }

    return copied;
  }

  public paste(imageData: ImageData, targetX: number = 0, targetY: number = 0): void {
    this.floating = {
      x: targetX,
      y: targetY,
      imageData: this.cloneImageData(imageData)
    };
    this.bounds = {
      x: targetX,
      y: targetY,
      width: imageData.width,
      height: imageData.height
    };
    this.notify();
  }

  public deleteSelection(canvasData: ImageData): boolean {
    if (this.floating) {
      this.floating = null;
      this.bounds = null;
      this.notify();
      return true;
    }
    if (this.bounds) {
      const { x, y, width, height } = this.bounds;
      for (let sy = 0; sy < height; sy++) {
        for (let sx = 0; sx < width; sx++) {
          const cx = x + sx;
          const cy = y + sy;
          if (cx >= 0 && cx < canvasData.width && cy >= 0 && cy < canvasData.height) {
            const idx = (cy * canvasData.width + cx) * 4;
            canvasData.data[idx] = 0;
            canvasData.data[idx + 1] = 0;
            canvasData.data[idx + 2] = 0;
            canvasData.data[idx + 3] = 0;
          }
        }
      }
      this.bounds = null;
      this.notify();
      return true;
    }
    return false;
  }

  public getInternalClipboard(): ImageData | null {
    return this.internalClipboard ? this.cloneImageData(this.internalClipboard) : null;
  }

  public pointInsideBounds(x: number, y: number): boolean {
    if (!this.bounds) return false;
    return (
      x >= this.bounds.x &&
      x < this.bounds.x + this.bounds.width &&
      y >= this.bounds.y &&
      y < this.bounds.y + this.bounds.height
    );
  }

  private cloneImageData(source: ImageData): ImageData {
    const copy = new ImageData(source.width, source.height);
    copy.data.set(source.data);
    return copy;
  }

  private notify(): void {
    if (this.onSelectionChangeCallback) {
      this.onSelectionChangeCallback();
    }
  }
}
