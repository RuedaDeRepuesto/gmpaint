import { CanvasEngine } from '../core/CanvasEngine.ts';
import { ColorManager } from '../core/ColorManager.ts';
import { SelectionManager } from '../core/SelectionManager.ts';
import { i18n, t } from '../i18n/i18n.ts';

export class StatusBar {
  private element: HTMLElement;
  private coordCell: HTMLElement;
  private sizeCell: HTMLElement;
  private zoomCell: HTMLElement;
  private modeCell: HTMLElement;
  private selCell: HTMLElement;

  private colorManager: ColorManager;

  constructor(
    container: HTMLElement,
    engine: CanvasEngine,
    colorManager: ColorManager,
    selectionManager: SelectionManager
  ) {
    this.colorManager = colorManager;

    this.element = document.createElement('div');
    this.element.className = 'status-bar';

    this.coordCell = this.createCell('[0, 0]');
    this.sizeCell = this.createCell(`${engine.getWidth()}x${engine.getHeight()}`);
    this.zoomCell = this.createCell(`${engine.getZoom() * 100}%`);
    this.modeCell = this.createCell(`${t('statusBar.mode')}: ${colorManager.getMode().toUpperCase()}`);
    this.selCell = this.createCell('', true);

    container.appendChild(this.element);

    engine.subscribeViewport((state) => {
      this.coordCell.textContent = `[${state.cursorX}, ${state.cursorY}]`;
      this.sizeCell.textContent = `${state.width}x${state.height}`;
      this.zoomCell.textContent = `${state.zoom * 100}%`;
    });

    colorManager.subscribe((state) => {
      this.modeCell.textContent = `${t('statusBar.mode')}: ${state.mode.toUpperCase()}`;
    });

    const updateSelectionText = () => {
      const bounds = selectionManager.getBounds();
      if (bounds) {
        this.selCell.textContent = t('statusBar.selection', {
          width: bounds.width,
          height: bounds.height,
          x: bounds.x,
          y: bounds.y
        });
      } else {
        this.selCell.textContent = '';
      }
    };

    selectionManager.setOnChange(updateSelectionText);

    i18n.subscribe(() => {
      this.modeCell.textContent = `${t('statusBar.mode')}: ${this.colorManager.getMode().toUpperCase()}`;
      updateSelectionText();
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
