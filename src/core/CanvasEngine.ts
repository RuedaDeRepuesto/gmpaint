import { HistoryManager } from './HistoryManager.ts';
import { SelectionManager } from './SelectionManager.ts';
import { AnchorPosition, Point, resizeCanvas, stretchImage } from './PixelOps.ts';

export type BackgroundType = 'checkerboard' | 'solid';

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
  cursorX: number;
  cursorY: number;
  width: number;
  height: number;
}

type ViewportListener = (state: ViewportState) => void;

export class CanvasEngine {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private imageBuffer: ImageData;
  private width: number;
  private height: number;

  private zoom: number = 8; // Zoom inicial cómodo de 800%
  private panX: number = 0;
  private panY: number = 0;

  private backgroundType: BackgroundType = 'checkerboard';
  private solidBgColor: string = '#808080';
  private showGrid: boolean = true;

  private historyManager: HistoryManager;
  private selectionManager: SelectionManager;

  private isPanning: boolean = false;
  private isSpaceDown: boolean = false;
  private startPan: Point = { x: 0, y: 0 };
  private cursorPos: Point = { x: 0, y: 0 };

  private previewPoints: { x: number; y: number; color: string }[] | null = null;
  private marchOffset: number = 0;
  private animationFrameId: number | null = null;

  private listeners: Set<ViewportListener> = new Set();

  constructor(
    container: HTMLElement,
    width: number = 32,
    height: number = 32,
    historyManager: HistoryManager,
    selectionManager: SelectionManager
  ) {
    this.container = container;
    this.width = width;
    this.height = height;
    this.historyManager = historyManager;
    this.selectionManager = selectionManager;

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'gmpaint-viewport-canvas';
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;

    this.imageBuffer = new ImageData(this.width, this.height);
    this.centerCanvas();
    this.initEvents();
    this.startMarchingAntsLoop();
    this.render();
  }

  public getContainer(): HTMLElement {
    return this.container;
  }

  public isSpaceActive(): boolean {
    return this.isSpaceDown;
  }

  public getWidth(): number {
    return this.width;
  }

  public getHeight(): number {
    return this.height;
  }

  public getImageData(): ImageData {
    return this.imageBuffer;
  }

  public setImageData(newData: ImageData, pushHistory: boolean = true): void {
    if (pushHistory) {
      this.historyManager.pushState(this.imageBuffer);
    }
    this.width = newData.width;
    this.height = newData.height;
    this.imageBuffer = newData;
    this.render();
    this.notify();
  }

  public getZoom(): number {
    return this.zoom;
  }

  public setZoom(zoomFactor: number, anchorScreenX?: number, anchorScreenY?: number): void {
    const minZoom = 1;
    const maxZoom = 48;
    const newZoom = Math.max(minZoom, Math.min(maxZoom, zoomFactor));
    if (newZoom === this.zoom) return;

    if (anchorScreenX !== undefined && anchorScreenY !== undefined) {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = anchorScreenX - rect.left;
      const mouseY = anchorScreenY - rect.top;

      const canvasX = (mouseX - this.panX) / this.zoom;
      const canvasY = (mouseY - this.panY) / this.zoom;

      this.panX = mouseX - canvasX * newZoom;
      this.panY = mouseY - canvasY * newZoom;
    } else {
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      const canvasX = (centerX - this.panX) / this.zoom;
      const canvasY = (centerY - this.panY) / this.zoom;
      this.panX = centerX - canvasX * newZoom;
      this.panY = centerY - canvasY * newZoom;
    }

    this.zoom = newZoom;
    this.render();
    this.notify();
  }

  public zoomIn(): void {
    if (this.zoom < 4) this.setZoom(this.zoom + 1);
    else if (this.zoom < 16) this.setZoom(this.zoom + 2);
    else this.setZoom(this.zoom + 4);
  }

  public zoomOut(): void {
    if (this.zoom <= 4) this.setZoom(this.zoom - 1);
    else if (this.zoom <= 16) this.setZoom(this.zoom - 2);
    else this.setZoom(this.zoom - 4);
  }

  public resetZoom(): void {
    this.setZoom(8);
    this.centerCanvas();
  }

  public toggleGrid(): boolean {
    this.showGrid = !this.showGrid;
    this.render();
    return this.showGrid;
  }

  public isGridVisible(): boolean {
    return this.showGrid;
  }

  public toggleBackground(): BackgroundType {
    this.backgroundType = this.backgroundType === 'checkerboard' ? 'solid' : 'checkerboard';
    this.render();
    return this.backgroundType;
  }

  public setSolidBgColor(color: string): void {
    this.solidBgColor = color;
    if (this.backgroundType === 'solid') {
      this.render();
    }
  }

  public resizeCanvasWithAnchor(newW: number, newH: number, anchor: AnchorPosition): void {
    this.selectionManager.commit(this.imageBuffer);
    this.historyManager.pushState(this.imageBuffer);
    const resized = resizeCanvas(this.imageBuffer, newW, newH, anchor);
    this.setImageData(resized, false);
    this.centerCanvas();
  }

  public stretchCanvas(newW: number, newH: number, mode: 'nearest' | 'bilinear'): void {
    this.selectionManager.commit(this.imageBuffer);
    this.historyManager.pushState(this.imageBuffer);
    const stretched = stretchImage(this.imageBuffer, newW, newH, mode);
    this.setImageData(stretched, false);
    this.centerCanvas();
  }

  public clearCanvas(): void {
    this.selectionManager.commit(this.imageBuffer);
    this.historyManager.pushState(this.imageBuffer);
    this.imageBuffer.data.fill(0);
    this.render();
  }

  public centerCanvas(): void {
    const rect = this.container.getBoundingClientRect();
    const displayW = this.width * this.zoom;
    const displayH = this.height * this.zoom;
    this.panX = Math.round((rect.width - displayW) / 2);
    this.panY = Math.round((rect.height - displayH) / 2);
    this.render();
    this.notify();
  }

  public setPreviewPoints(points: { x: number; y: number; color: string }[] | null): void {
    this.previewPoints = points;
    this.render();
  }

  /**
   * Convierte coordenadas de pantalla del ratón en coordenadas del píxel del lienzo.
   */
  public screenToCanvasPixel(screenX: number, screenY: number): Point {
    const rect = this.canvas.getBoundingClientRect();
    const canvasScreenX = screenX - rect.left - this.panX;
    const canvasScreenY = screenY - rect.top - this.panY;
    const px = Math.floor(canvasScreenX / this.zoom);
    const py = Math.floor(canvasScreenY / this.zoom);
    return { x: px, y: py };
  }

  public subscribeViewport(listener: ViewportListener): () => void {
    this.listeners.add(listener);
    this.notify();
    return () => this.listeners.delete(listener);
  }

  public render(): void {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    this.ctx.fillStyle = '#6e7074';
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.save();
    this.ctx.translate(this.panX, this.panY);
    this.ctx.scale(this.zoom, this.zoom);

    // 1. Fondo de transparencia o color sólido
    this.renderBackground();

    // 2. Imagen principal
    this.renderImageBuffer();

    // 3. Capa flotante de selección si existe
    this.renderFloatingLayer();

    // 4. Previsualización de herramienta activa
    this.renderPreview();

    // 5. Cuadrícula de píxeles
    if (this.showGrid && this.zoom >= 4) {
      this.renderPixelGrid();
    }

    // 6. Selección activa (marching ants)
    this.renderSelectionMarquee();

    this.ctx.restore();
  }

  private renderBackground(): void {
    if (this.backgroundType === 'solid') {
      this.ctx.fillStyle = this.solidBgColor;
      this.ctx.fillRect(0, 0, this.width, this.height);
      return;
    }

    // Cuadrícula clásica de ajedrez (8x8 píxeles lógicos por celda o 1px si es muy chico)
    const tileSize = 8;
    for (let y = 0; y < this.height; y += tileSize) {
      for (let x = 0; x < this.width; x += tileSize) {
        const isEven = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0;
        this.ctx.fillStyle = isEven ? '#ffffff' : '#cccccc';
        const w = Math.min(tileSize, this.width - x);
        const h = Math.min(tileSize, this.height - y);
        this.ctx.fillRect(x, y, w, h);
      }
    }
  }

  private renderImageBuffer(): void {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.width;
    tempCanvas.height = this.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(this.imageBuffer, 0, 0);

    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(tempCanvas, 0, 0);
  }

  private renderFloatingLayer(): void {
    const floating = this.selectionManager.getFloating();
    if (!floating) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = floating.imageData.width;
    tempCanvas.height = floating.imageData.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(floating.imageData, 0, 0);

    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(tempCanvas, floating.x, floating.y);
  }

  private renderPreview(): void {
    if (!this.previewPoints) return;
    for (const pt of this.previewPoints) {
      if (pt.x >= 0 && pt.x < this.width && pt.y >= 0 && pt.y < this.height) {
        this.ctx.fillStyle = pt.color;
        this.ctx.fillRect(pt.x, pt.y, 1, 1);
      }
    }
  }

  private renderPixelGrid(): void {
    this.ctx.save();
    this.ctx.lineWidth = 1 / this.zoom;
    this.ctx.strokeStyle = 'rgba(128, 128, 128, 0.4)';
    this.ctx.beginPath();

    for (let x = 0; x <= this.width; x++) {
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
    }

    for (let y = 0; y <= this.height; y++) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
    }

    this.ctx.stroke();
    this.ctx.restore();
  }

  private renderSelectionMarquee(): void {
    const bounds = this.selectionManager.getBounds();
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return;

    this.ctx.save();
    this.ctx.lineWidth = 1 / this.zoom;
    this.ctx.setLineDash([4 / this.zoom, 4 / this.zoom]);
    this.ctx.lineDashOffset = this.marchOffset / this.zoom;
    this.ctx.strokeStyle = '#000000';
    this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineDashOffset = (this.marchOffset + 4) / this.zoom;
    this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    this.ctx.restore();
  }

  private startMarchingAntsLoop(): void {
    const loop = () => {
      if (this.selectionManager.hasSelection()) {
        this.marchOffset = (this.marchOffset + 0.3) % 8;
        this.render();
      }
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private initEvents(): void {
    // Zoom con rueda del ratón centrado en el cursor
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomDelta = e.deltaY < 0 ? 1 : -1;
      const factor = this.zoom <= 4 ? 1 : this.zoom <= 12 ? 2 : 4;
      this.setZoom(this.zoom + zoomDelta * factor, e.clientX, e.clientY);
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !this.isSpaceDown) {
        this.isSpaceDown = true;
        this.container.style.cursor = 'grab';
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.isSpaceDown = false;
        if (!this.isPanning) {
          this.container.style.cursor = 'crosshair';
        }
      }
    });

    // Desplazamiento (Pan) con botón central o espacio
    this.container.addEventListener('mousedown', (e) => {
      if (e.button === 1 || (e.button === 0 && this.isSpaceDown)) {
        this.isPanning = true;
        this.startPan = { x: e.clientX - this.panX, y: e.clientY - this.panY };
        this.container.style.cursor = 'grabbing';
        e.preventDefault();
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        this.panX = e.clientX - this.startPan.x;
        this.panY = e.clientY - this.startPan.y;
        this.render();
      }

      const pixel = this.screenToCanvasPixel(e.clientX, e.clientY);
      this.cursorPos = pixel;
      this.notify();
    });

    window.addEventListener('mouseup', (e) => {
      if (this.isPanning && (e.button === 1 || e.button === 0)) {
        this.isPanning = false;
        this.container.style.cursor = 'crosshair';
      }
    });

    window.addEventListener('resize', () => {
      this.render();
    });

    this.selectionManager.setOnChange(() => {
      this.render();
    });
  }

  private notify(): void {
    const state: ViewportState = {
      zoom: this.zoom,
      panX: this.panX,
      panY: this.panY,
      cursorX: this.cursorPos.x,
      cursorY: this.cursorPos.y,
      width: this.width,
      height: this.height
    };
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
