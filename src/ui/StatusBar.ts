import { CanvasEngine } from '../core/CanvasEngine.ts';
import { ColorManager } from '../core/ColorManager.ts';
import { SelectionManager } from '../core/SelectionManager.ts';

export class StatusBar {
  private element: HTMLElement;
  private coordCell: HTMLElement;
  private sizeCell: HTMLElement;
  private zoomCell: HTMLElement;
  private modeCell: HTMLElement;
  private selCell: HTMLElement;

  constructor(
    container: HTMLElement,
    engine: CanvasEngine,
    colorManager: ColorManager,
    selectionManager: SelectionManager
  ) {
    this.element = document.createElement('div');
    this.element.className = 'status-bar';

    this.coordCell = this.createCell('[0, 0]');
    this.sizeCell = this.createCell(`${engine.getWidth()}x${engine.getHeight()}`);
    this.zoomCell = this.createCell(`${engine.getZoom() * 100}%`);
    this.modeCell = this.createCell(`Mode: ${colorManager.getMode().toUpperCase()}`);
    this.selCell = this.createCell('', true);

    container.appendChild(this.element);

    engine.subscribeViewport((state) => {
      this.coordCell.textContent = `[${state.cursorX}, ${state.cursorY}]`;
      this.sizeCell.textContent = `${state.width}x${state.height}`;
      this.zoomCell.textContent = `${state.zoom * 100}%`;
    });

    colorManager.subscribe((state) => {
      this.modeCell.textContent = `Mode: ${state.mode.toUpperCase()}`;
    });

    selectionManager.setOnChange(() => {
      const bounds = selectionManager.getBounds();
      if (bounds) {
        this.selCell.textContent = `Selection: ${bounds.width}x${bounds.height} at (${bounds.x}, ${bounds.y})`;
      } else {
        this.selCell.textContent = '';
      }
    });
  }

  private createCell(text: string, flexible: boolean = false): HTMLElement {
    const cell = document.createElement('div');
    cell.className = `status-cell${flexible ? ' flexible' : ''}`;
    cell.textContent = text;
    this.element.appendChild(cell);
    return cell;
  }
}
