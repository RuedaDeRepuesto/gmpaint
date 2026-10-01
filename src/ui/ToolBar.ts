import { CanvasEngine } from '../core/CanvasEngine.ts';
import { HistoryManager } from '../core/HistoryManager.ts';
import { ICONS } from './Icons.ts';
import { AppActions } from './MenuBar.ts';

export class ToolBar {
  private element: HTMLElement;
  private undoBtn!: HTMLButtonElement;
  private redoBtn!: HTMLButtonElement;
  private gridBtn!: HTMLButtonElement;

  constructor(
    container: HTMLElement,
    engine: CanvasEngine,
    historyManager: HistoryManager,
    actions: AppActions
  ) {
    this.element = document.createElement('div');
    this.element.className = 'action-toolbar';
    container.appendChild(this.element);

    this.createButtons(engine, historyManager, actions);
  }

  private createButtons(
    engine: CanvasEngine,
    historyManager: HistoryManager,
    actions: AppActions
  ): void {
    // 1. Confirmar / Guardar (Checkmark verde de GM8)
    this.createBtn(ICONS.check, 'Confirm / Save (Ctrl+S)', () => actions.onSave(), 'confirm-btn');

    // 2. Nuevo
    this.createBtn(ICONS.new, 'New Image (Ctrl+N)', () => actions.onNew());

    // 3. Abrir
    this.createBtn(ICONS.open, 'Open Image (Ctrl+O)', () => actions.onOpen());

    // 4. Insertar desde archivo
    this.createBtn(ICONS.insert, 'Insert Image from File...', () => actions.onInsertFromFile());

    // 5. Guardar
    this.createBtn(ICONS.save, 'Save PNG (Ctrl+S)', () => actions.onSave());

    this.createSeparator();

    // 6. Undo
    this.undoBtn = this.createBtn(ICONS.undo, 'Undo (Ctrl+Z)', () => actions.onUndo());

    // 7. Redo
    this.redoBtn = this.createBtn(ICONS.redo, 'Redo (Ctrl+Y)', () => actions.onRedo());

    this.createSeparator();

    // 8. Cortar
    this.createBtn(ICONS.cut, 'Cut (Ctrl+X)', () => actions.onCut());

    // 9. Copiar
    this.createBtn(ICONS.copy, 'Copy (Ctrl+C)', () => actions.onCopy());

    // 10. Pegar
    this.createBtn(ICONS.paste, 'Paste (Ctrl+V)', () => actions.onPaste());

    this.createSeparator();

    // 11. Zoom Menos
    this.createBtn(ICONS.zoomOut, 'Zoom Out (-)', () => engine.zoomOut());

    // 12. Zoom 100%
    this.createBtn(ICONS.zoomEqual, 'Zoom 100% (1)', () => engine.resetZoom());

    // 13. Zoom Mas
    this.createBtn(ICONS.zoomIn, 'Zoom In (+)', () => engine.zoomIn());

    this.createSeparator();

    // 14. Toggle Grid
    this.gridBtn = this.createBtn(ICONS.grid, 'Toggle Pixel Grid', () => {
      const active = engine.toggleGrid();
      this.gridBtn.classList.toggle('active', active);
    });
    this.gridBtn.classList.toggle('active', engine.isGridVisible());

    // 15. Toggle Background
    this.createBtn(ICONS.background, 'Toggle Checkerboard / Solid Background', () => {
      engine.toggleBackground();
    });

    // Suscripción al historial para habilitar/deshabilitar botones
    historyManager.subscribe((canUndo, canRedo) => {
      this.undoBtn.disabled = !canUndo;
      this.redoBtn.disabled = !canRedo;
    });
  }

  private createBtn(
    svg: string,
    title: string,
    onClick: () => void,
    extraClass?: string
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `tb-btn${extraClass ? ' ' + extraClass : ''}`;
    btn.innerHTML = svg;
    btn.title = title;
    btn.onclick = onClick;
    this.element.appendChild(btn);
    return btn;
  }

  private createSeparator(): void {
    const sep = document.createElement('div');
    sep.className = 'tb-separator';
    this.element.appendChild(sep);
  }
}
