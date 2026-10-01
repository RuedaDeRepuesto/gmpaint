import { CanvasEngine } from '../core/CanvasEngine.ts';
import { ColorManager } from '../core/ColorManager.ts';
import { HistoryManager } from '../core/HistoryManager.ts';
import { SelectionManager } from '../core/SelectionManager.ts';
import { ClipboardManager } from '../core/ClipboardManager.ts';
import { flipHorizontal, flipVertical, invertColors, rotate90CCW, rotate90CW } from '../core/PixelOps.ts';
import { i18n, t } from '../i18n/i18n.ts';

export interface AppActions {
  onNew: () => Promise<void>;
  onOpen: () => Promise<void>;
  onSave: () => Promise<void>;
  onInsertFromFile: () => Promise<void>;
  onUndo: () => void;
  onRedo: () => void;
  onCut: () => Promise<void>;
  onCopy: () => Promise<void>;
  onPaste: () => Promise<void>;
  onDelete: () => void;
  onSelectAll: () => void;
  onCanvasSize: () => Promise<void>;
  onStretch: () => Promise<void>;
  onGridSettings: () => Promise<void>;
}

export class MenuBar {
  private element: HTMLElement;
  private activeMenu: HTMLElement | null = null;

  constructor(
    container: HTMLElement,
    engine: CanvasEngine,
    _colorManager: ColorManager,
    historyManager: HistoryManager,
    selectionManager: SelectionManager,
    clipboardManager: ClipboardManager,
    actions: AppActions
  ) {
    this.element = document.createElement('div');
    this.element.className = 'menu-bar';
    container.appendChild(this.element);

    this.renderMenus(engine, historyManager, selectionManager, clipboardManager, actions);
    this.initGlobalShortcuts(actions);

    i18n.subscribe(() => {
      this.element.innerHTML = '';
      this.renderMenus(engine, historyManager, selectionManager, clipboardManager, actions);
    });
  }

  private renderMenus(
    engine: CanvasEngine,
    historyManager: HistoryManager,
    _selectionManager: SelectionManager,
    _clipboardManager: ClipboardManager,
    actions: AppActions
  ): void {
    const isEs = i18n.getLanguage() === 'es';

    const menus = [
      {
        title: t('menu.file'),
        items: [
          { label: t('menu.new'), shortcut: 'Ctrl+N', action: () => actions.onNew() },
          { label: t('menu.open'), shortcut: 'Ctrl+O', action: () => actions.onOpen() },
          { label: t('menu.save'), shortcut: 'Ctrl+S', action: () => actions.onSave() },
          { label: t('menu.insert'), action: () => actions.onInsertFromFile() },
          { separator: true },
          { label: t('menu.exit'), action: () => window.close() }
        ]
      },
      {
        title: t('menu.edit'),
        items: [
          { label: t('menu.undo'), shortcut: 'Ctrl+Z', action: () => actions.onUndo() },
          { label: t('menu.redo'), shortcut: 'Ctrl+Y', action: () => actions.onRedo() },
          { separator: true },
          { label: t('menu.cut'), shortcut: 'Ctrl+X', action: () => actions.onCut() },
          { label: t('menu.copy'), shortcut: 'Ctrl+C', action: () => actions.onCopy() },
          { label: t('menu.paste'), shortcut: 'Ctrl+V', action: () => actions.onPaste() },
          { separator: true },
          { label: t('menu.delete'), shortcut: 'Del', action: () => actions.onDelete() },
          { label: t('menu.selectAll'), shortcut: 'Ctrl+A', action: () => actions.onSelectAll() }
        ]
      },
      {
        title: t('menu.view'),
        items: [
          { label: t('menu.zoomIn'), shortcut: '+', action: () => engine.zoomIn() },
          { label: t('menu.zoomOut'), shortcut: '-', action: () => engine.zoomOut() },
          { label: t('menu.zoomNormal'), shortcut: '1', action: () => engine.resetZoom() },
          { separator: true },
          { label: t('menu.toggleGrid'), shortcut: 'G', action: () => engine.toggleGrid() },
          { label: t('menu.toggleBg'), action: () => engine.toggleBackground() },
          { separator: true },
          { label: t('menu.gridSettings'), action: () => actions.onGridSettings() }
        ]
      },
      {
        title: t('menu.transform'),
        items: [
          {
            label: t('menu.mirrorH'),
            action: () => {
              historyManager.pushState(engine.getImageData());
              const flipped = flipHorizontal(engine.getImageData());
              engine.setImageData(flipped, false);
            }
          },
          {
            label: t('menu.flipV'),
            action: () => {
              historyManager.pushState(engine.getImageData());
              const flipped = flipVertical(engine.getImageData());
              engine.setImageData(flipped, false);
            }
          },
          {
            label: t('menu.rotateCw'),
            action: () => {
              historyManager.pushState(engine.getImageData());
              const rotated = rotate90CW(engine.getImageData());
              engine.setImageData(rotated, false);
              engine.centerCanvas();
            }
          },
          {
            label: t('menu.rotateCcw'),
            action: () => {
              historyManager.pushState(engine.getImageData());
              const rotated = rotate90CCW(engine.getImageData());
              engine.setImageData(rotated, false);
              engine.centerCanvas();
            }
          },
          { separator: true },
          {
            label: t('menu.invertColors'),
            action: () => {
              historyManager.pushState(engine.getImageData());
              const inverted = invertColors(engine.getImageData());
              engine.setImageData(inverted, false);
            }
          }
        ]
      },
      {
        title: t('menu.image'),
        items: [
          { label: t('menu.canvasSize'), action: () => actions.onCanvasSize() },
          { label: t('menu.stretch'), action: () => actions.onStretch() },
          { separator: true },
          { label: t('menu.clear'), action: () => engine.clearCanvas() }
        ]
      },
      {
        title: t('menu.language'),
        items: [
          {
            label: `Español ${isEs ? '✓' : ''}`,
            action: () => i18n.setLanguage('es')
          },
          {
            label: `English ${!isEs ? '✓' : ''}`,
            action: () => i18n.setLanguage('en')
          }
        ]
      }
    ];

    for (const menu of menus) {
      const menuItem = document.createElement('div');
      menuItem.className = 'menu-item';
      menuItem.textContent = menu.title;

      const dropdown = document.createElement('div');
      dropdown.className = 'menu-dropdown';

      for (const item of menu.items) {
        if ('separator' in item && item.separator) {
          const sep = document.createElement('div');
          sep.className = 'menu-separator';
          dropdown.appendChild(sep);
        } else if ('label' in item && item.label) {
          const actionRow = document.createElement('div');
          actionRow.className = 'menu-action';

          const labelSpan = document.createElement('span');
          labelSpan.textContent = item.label;
          actionRow.appendChild(labelSpan);

          if (item.shortcut) {
            const scSpan = document.createElement('span');
            scSpan.className = 'menu-shortcut';
            scSpan.textContent = item.shortcut;
            actionRow.appendChild(scSpan);
          }

          actionRow.onclick = (e) => {
            e.stopPropagation();
            this.closeAllMenus();
            if (item.action) item.action();
          };

          dropdown.appendChild(actionRow);
        }
      }

      menuItem.appendChild(dropdown);

      menuItem.onclick = (e) => {
        e.stopPropagation();
        if (this.activeMenu === menuItem) {
          this.closeAllMenus();
        } else {
          this.closeAllMenus();
          menuItem.classList.add('active');
          this.activeMenu = menuItem;
        }
      };

      menuItem.onmouseenter = () => {
        if (this.activeMenu && this.activeMenu !== menuItem) {
          this.closeAllMenus();
          menuItem.classList.add('active');
          this.activeMenu = menuItem;
        }
      };

      this.element.appendChild(menuItem);
    }

    window.addEventListener('click', () => {
      this.closeAllMenus();
    });
  }

  private closeAllMenus(): void {
    if (this.activeMenu) {
      this.activeMenu.classList.remove('active');
      this.activeMenu = null;
    }
  }

  private initGlobalShortcuts(actions: AppActions): void {
    window.addEventListener('keydown', (e) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          actions.onRedo();
        } else {
          actions.onUndo();
        }
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        actions.onRedo();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        actions.onSave();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        actions.onOpen();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        actions.onNew();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'c') {
        // Permitir copiar del canvas si no hay campo de texto enfocado
        if (!(e.target instanceof HTMLInputElement)) {
          e.preventDefault();
          actions.onCopy();
        }
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'x') {
        if (!(e.target instanceof HTMLInputElement)) {
          e.preventDefault();
          actions.onCut();
        }
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'v') {
        if (!(e.target instanceof HTMLInputElement)) {
          e.preventDefault();
          actions.onPaste();
        }
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'a') {
        if (!(e.target instanceof HTMLInputElement)) {
          e.preventDefault();
          actions.onSelectAll();
        }
      }
    });
  }
}
