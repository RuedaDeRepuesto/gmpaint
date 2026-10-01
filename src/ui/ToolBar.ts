import { CanvasEngine } from '../core/CanvasEngine.ts';
import { HistoryManager } from '../core/HistoryManager.ts';
import { ICONS } from './Icons.ts';
import { AppActions } from './MenuBar.ts';
import { i18n, t } from '../i18n/i18n.ts';

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

    i18n.subscribe(() => {
      this.element.innerHTML = '';
      this.createButtons(engine, historyManager, actions);
    });
  }

  private createButtons(
    engine: CanvasEngine,
    historyManager: HistoryManager,
    actions: AppActions
  ): void {
    // 1. Confirmar / Guardar (Checkmark verde de GM8)
    this.createBtn(ICONS.check, t('toolbar.confirm', { key: 'Ctrl+S' }), () => actions.onSave(), 'confirm-btn');

    // 2. Nuevo
    this.createBtn(ICONS.new, t('toolbar.new', { key: 'Ctrl+N' }), () => actions.onNew());

    // 3. Abrir
    this.createBtn(ICONS.open, t('toolbar.open', { key: 'Ctrl+O' }), () => actions.onOpen());

    // 4. Insertar desde archivo
    this.createBtn(ICONS.insert, t('toolbar.insert'), () => actions.onInsertFromFile());

    // 5. Guardar
    this.createBtn(ICONS.save, t('toolbar.save', { key: 'Ctrl+S' }), () => actions.onSave());

    this.createSeparator();

    // 6. Undo
    this.undoBtn = this.createBtn(ICONS.undo, t('toolbar.undo', { key: 'Ctrl+Z' }), () => actions.onUndo());

    // 7. Redo
    this.redoBtn = this.createBtn(ICONS.redo, t('toolbar.redo', { key: 'Ctrl+Y' }), () => actions.onRedo());

    this.createSeparator();

    // 8. Cortar
    this.createBtn(ICONS.cut, t('toolbar.cut', { key: 'Ctrl+X' }), () => actions.onCut());

    // 9. Copiar
    this.createBtn(ICONS.copy, t('toolbar.copy', { key: 'Ctrl+C' }), () => actions.onCopy());

    // 10. Pegar
    this.createBtn(ICONS.paste, t('toolbar.paste', { key: 'Ctrl+V' }), () => actions.onPaste());

    this.createSeparator();

    // 11. Zoom Menos
    this.createBtn(ICONS.zoomOut, t('toolbar.zoomOut'), () => engine.zoomOut());

    // 12. Zoom 100%
    this.createBtn(ICONS.zoomEqual, t('toolbar.zoomNormal'), () => engine.resetZoom());

    // 13. Zoom Mas
    this.createBtn(ICONS.zoomIn, t('toolbar.zoomIn'), () => engine.zoomIn());

    this.createSeparator();

    // 14. Toggle Grid
    this.gridBtn = this.createBtn(ICONS.grid, t('toolbar.grid'), () => {
      const active = engine.toggleGrid();
      this.gridBtn.classList.toggle('active', active);
    });
    this.gridBtn.classList.toggle('active', engine.isGridVisible());

    // 15. Toggle Background
    this.createBtn(ICONS.background, t('toolbar.bg'), () => {
      engine.toggleBackground();
    });

    // 16. Configurar cuadrícula de transparencia
    this.createBtn(ICONS.gridSettings, t('toolbar.gridSettings'), () => {
      actions.onGridSettings();
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
