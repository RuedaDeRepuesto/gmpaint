import { CanvasEngine } from '../core/CanvasEngine.ts';
import { ColorManager } from '../core/ColorManager.ts';
import { HistoryManager } from '../core/HistoryManager.ts';
import { SelectionManager } from '../core/SelectionManager.ts';
import { ClipboardManager } from '../core/ClipboardManager.ts';
import { flipHorizontal, flipVertical, invertColors, rotate90CCW, rotate90CW } from '../core/PixelOps.ts';

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
  }

  private renderMenus(
    engine: CanvasEngine,
    historyManager: HistoryManager,
    _selectionManager: SelectionManager,
    _clipboardManager: ClipboardManager,
    actions: AppActions
  ): void {
    const menus = [
      {
        title: 'File',
        items: [
          { label: 'New...', shortcut: 'Ctrl+N', action: () => actions.onNew() },
          { label: 'Open...', shortcut: 'Ctrl+O', action: () => actions.onOpen() },
          { label: 'Save...', shortcut: 'Ctrl+S', action: () => actions.onSave() },
          { label: 'Insert from file...', action: () => actions.onInsertFromFile() },
          { separator: true },
          { label: 'Exit', action: () => window.close() }
        ]
      },
      {
        title: 'Edit',
        items: [
          { label: 'Undo', shortcut: 'Ctrl+Z', action: () => actions.onUndo() },
          { label: 'Redo', shortcut: 'Ctrl+Y', action: () => actions.onRedo() },
          { separator: true },
          { label: 'Cut', shortcut: 'Ctrl+X', action: () => actions.onCut() },
          { label: 'Copy', shortcut: 'Ctrl+C', action: () => actions.onCopy() },
          { label: 'Paste', shortcut: 'Ctrl+V', action: () => actions.onPaste() },
          { separator: true },
          { label: 'Delete', shortcut: 'Del', action: () => actions.onDelete() },
          { label: 'Select All', shortcut: 'Ctrl+A', action: () => actions.onSelectAll() }
        ]
      },
      {
        title: 'View',
        items: [
          { label: 'Zoom In', shortcut: '+', action: () => engine.zoomIn() },
          { label: 'Zoom Out', shortcut: '-', action: () => engine.zoomOut() },
          { label: 'Normal (100%)', shortcut: '1', action: () => engine.resetZoom() },
          { separator: true },
          { label: 'Toggle Grid', shortcut: 'G', action: () => engine.toggleGrid() },
          { label: 'Toggle Background', action: () => engine.toggleBackground() },
          { separator: true },
          { label: 'Grid Settings...', action: () => actions.onGridSettings() }
        ]
      },
      {
        title: 'Transform',
        items: [
          {
            label: 'Mirror (Horizontal)',
            action: () => {
              historyManager.pushState(engine.getImageData());
              const flipped = flipHorizontal(engine.getImageData());
              engine.setImageData(flipped, false);
            }
          },
          {
            label: 'Flip (Vertical)',
            action: () => {
              historyManager.pushState(engine.getImageData());
              const flipped = flipVertical(engine.getImageData());
              engine.setImageData(flipped, false);
            }
          },
          {
            label: 'Rotate 90° CW',
            action: () => {
              historyManager.pushState(engine.getImageData());
              const rotated = rotate90CW(engine.getImageData());
              engine.setImageData(rotated, false);
              engine.centerCanvas();
            }
          },
          {
            label: 'Rotate 90° CCW',
            action: () => {
              historyManager.pushState(engine.getImageData());
              const rotated = rotate90CCW(engine.getImageData());
              engine.setImageData(rotated, false);
              engine.centerCanvas();
            }
          },
          { separator: true },
          {
            label: 'Invert Colors',
            action: () => {
              historyManager.pushState(engine.getImageData());
              const inverted = invertColors(engine.getImageData());
              engine.setImageData(inverted, false);
            }
          }
        ]
      },
      {
        title: 'Image',
        items: [
          { label: 'Canvas Size...', action: () => actions.onCanvasSize() },
          { label: 'Stretch / Scale...', action: () => actions.onStretch() },
          { separator: true },
          { label: 'Clear Image', action: () => engine.clearCanvas() }
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
