import { CanvasEngine } from './core/CanvasEngine.ts';
import { ColorManager } from './core/ColorManager.ts';
import { HistoryManager } from './core/HistoryManager.ts';
import { SelectionManager } from './core/SelectionManager.ts';
import { ClipboardManager } from './core/ClipboardManager.ts';
import { ToolManager } from './tools/ToolManager.ts';
import { TextTool } from './tools/TextTool.ts';
import { DialogManager } from './dialogs/DialogManager.ts';
import { AppActions, MenuBar } from './ui/MenuBar.ts';
import { ToolBar } from './ui/ToolBar.ts';
import { ToolPalette } from './ui/ToolPalette.ts';
import { ColorPanel } from './ui/ColorPanel.ts';
import { StatusBar } from './ui/StatusBar.ts';
import { i18n, t } from './i18n/i18n.ts';

document.addEventListener('DOMContentLoaded', () => {
  const viewportContainer = document.getElementById('viewport-container')!;
  const menubarContainer = document.getElementById('menubar-container')!;
  const toolbarContainer = document.getElementById('toolbar-container')!;
  const toolpaletteContainer = document.getElementById('toolpalette-container')!;
  const colorpanelContainer = document.getElementById('colorpanel-container')!;
  const statusbarContainer = document.getElementById('statusbar-container')!;

  let currentFilename = 'sprite0.png';

  const updateTitle = (name: string) => {
    document.title = t('app.title', { name });
  };
  updateTitle('sprite0');

  i18n.subscribe(() => {
    updateTitle(currentFilename.replace(/\.[^/.]+$/, ''));
  });

  // 1. Inicialización de los gestores del núcleo
  const historyManager = new HistoryManager();
  const selectionManager = new SelectionManager();
  const colorManager = new ColorManager();
  const clipboardManager = new ClipboardManager(selectionManager);

  // 2. Motor de renderizado del lienzo (32x32 estándar de GM8 para sprites iniciales)
  const engine = new CanvasEngine(
    viewportContainer,
    32,
    32,
    historyManager,
    selectionManager
  );

  // 3. Gestor de herramientas
  const toolManager = new ToolManager({
    engine,
    colorManager,
    selectionManager,
    historyManager
  });

  // Conectar el diálogo de texto con la herramienta de texto
  const textTool = toolManager.getTool('text') as TextTool;
  if (textTool) {
    textTool.setPromptHandler(async () => {
      return await DialogManager.showTextDialog();
    });
  }

  // 4. Implementación de acciones de la aplicación
  const actions: AppActions = {
    onNew: async () => {
      const config = await DialogManager.showNewDialog(engine.getWidth(), engine.getHeight());
      if (!config) return;

      selectionManager.commit(engine.getImageData());
      const newImg = new ImageData(config.width, config.height);
      if (config.background === 'white') {
        newImg.data.fill(255);
      }

      currentFilename = 'sprite0.png';
      updateTitle('sprite0');
      engine.setImageData(newImg, true);
      engine.centerCanvas();
    },

    onOpen: async () => {
      const result = await DialogManager.openImageFileDialog();
      if (!result) return;

      selectionManager.commit(engine.getImageData());
      currentFilename = result.name;
      updateTitle(result.name.replace(/\.[^/.]+$/, ''));
      engine.setImageData(result.imageData, true);
      engine.centerCanvas();
    },

    onSave: async () => {
      selectionManager.commit(engine.getImageData());
      engine.render();
      await DialogManager.saveImageDataAsPng(engine.getImageData(), currentFilename);
    },

    onInsertFromFile: async () => {
      const result = await DialogManager.openImageFileDialog();
      if (!result) return;

      selectionManager.commit(engine.getImageData());
      historyManager.pushState(engine.getImageData());
      selectionManager.paste(result.imageData, 0, 0);
      engine.render();
    },

    onUndo: () => {
      const prev = historyManager.undo(engine.getImageData());
      if (prev) {
        selectionManager.cancel(engine.getImageData());
        engine.setImageData(prev, false);
      }
    },

    onRedo: () => {
      const next = historyManager.redo(engine.getImageData());
      if (next) {
        selectionManager.cancel(engine.getImageData());
        engine.setImageData(next, false);
      }
    },

    onCut: async () => {
      await clipboardManager.cutSelectionToSystem(engine.getImageData());
      engine.render();
    },

    onCopy: async () => {
      await clipboardManager.copySelectionToSystem(engine.getImageData());
    },

    onPaste: async () => {
      await clipboardManager.pasteFromSystemOrInternal(0, 0);
      engine.render();
    },

    onDelete: () => {
      if (selectionManager.hasSelection()) {
        historyManager.pushState(engine.getImageData());
        selectionManager.deleteSelection(engine.getImageData());
        engine.render();
      }
    },

    onSelectAll: () => {
      toolManager.setActiveTool('select');
      selectionManager.updateSelection(0, 0, engine.getWidth() - 1, engine.getHeight() - 1);
      engine.render();
    },

    onCanvasSize: async () => {
      const config = await DialogManager.showCanvasSizeDialog(engine.getWidth(), engine.getHeight());
      if (config) {
        engine.resizeCanvasWithAnchor(config.width, config.height, config.anchor);
      }
    },

    onStretch: async () => {
      const config = await DialogManager.showStretchDialog(engine.getWidth(), engine.getHeight());
      if (config) {
        engine.stretchCanvas(config.width, config.height, config.mode);
      }
    },

    onGridSettings: async () => {
      const current = engine.getCheckerSettings();
      const updated = await DialogManager.showGridConfigDialog(current);
      if (updated) {
        engine.setCheckerSettings(updated);
      }
    }
  };

  // 5. Montaje de la interfaz de usuario
  new MenuBar(
    menubarContainer,
    engine,
    colorManager,
    historyManager,
    selectionManager,
    clipboardManager,
    actions
  );

  new ToolBar(
    toolbarContainer,
    engine,
    historyManager,
    actions
  );

  new ToolPalette(
    toolpaletteContainer,
    toolManager,
    colorManager
  );

  new ColorPanel(
    colorpanelContainer,
    colorManager
  );

  new StatusBar(
    statusbarContainer,
    engine,
    colorManager,
    selectionManager
  );

  // 6. Soporte de pegado global desde otras fuentes (Ctrl+V con imágenes del portapapeles)
  window.addEventListener('paste', async (e: ClipboardEvent) => {
    const handled = await clipboardManager.handlePasteEvent(e, 0, 0);
    if (handled) {
      toolManager.setActiveTool('select');
      engine.render();
    }
  });
});
