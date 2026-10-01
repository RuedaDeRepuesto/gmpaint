import { ColorManager } from '../core/ColorManager.ts';
import { ToolManager } from '../tools/ToolManager.ts';
import { ICONS } from './Icons.ts';
import { i18n, t } from '../i18n/i18n.ts';

export class ToolPalette {
  private element: HTMLElement;
  private toolButtons: Map<string, HTMLButtonElement> = new Map();
  private sizeButtons: HTMLButtonElement[] = [];

  constructor(
    container: HTMLElement,
    toolManager: ToolManager,
    colorManager: ColorManager
  ) {
    this.element = document.createElement('div');
    this.element.className = 'left-palette';
    container.appendChild(this.element);

    const render = () => {
      this.element.innerHTML = '';
      this.toolButtons.clear();
      this.sizeButtons = [];
      this.renderToolsGrid(toolManager);
      this.renderSizePanel(colorManager);

      const activeTool = toolManager.getActiveTool();
      const activeBtn = this.toolButtons.get(activeTool.id);
      if (activeBtn) activeBtn.classList.add('active');

      const currentSize = colorManager.getBrushSize();
      this.sizeButtons.forEach((btn) => {
        const size = parseInt(btn.dataset.size || '1', 10);
        btn.classList.toggle('active', size === currentSize);
      });
    };

    render();

    i18n.subscribe(() => {
      render();
    });

    toolManager.subscribe((activeId) => {
      this.toolButtons.forEach((btn, id) => {
        btn.classList.toggle('active', id === activeId);
      });
    });

    colorManager.subscribe((state) => {
      this.sizeButtons.forEach((btn) => {
        const size = parseInt(btn.dataset.size || '1', 10);
        btn.classList.toggle('active', size === state.brushSize);
      });
    });
  }

  private renderToolsGrid(toolManager: ToolManager): void {
    const toolsGrid = document.createElement('div');
    toolsGrid.className = 'tools-grid';

    const toolsDef: { id: string; icon: string; nameKey: string }[] = [
      { id: 'pencil', icon: ICONS.pencil, nameKey: 'tools.pencil' },
      { id: 'line', icon: ICONS.line, nameKey: 'tools.line' },
      { id: 'eraser', icon: ICONS.eraser, nameKey: 'tools.eraser' },
      { id: 'picker', icon: ICONS.picker, nameKey: 'tools.picker' },
      { id: 'fill', icon: ICONS.fill, nameKey: 'tools.fill' },
      { id: 'rect', icon: ICONS.rect, nameKey: 'tools.rect' },
      { id: 'circle', icon: ICONS.circle, nameKey: 'tools.circle' },
      { id: 'rect-fill', icon: ICONS.rectFill, nameKey: 'tools.rectFill' },
      { id: 'circle-fill', icon: ICONS.circleFill, nameKey: 'tools.circleFill' },
      { id: 'select', icon: ICONS.select, nameKey: 'tools.select' },
      { id: 'text', icon: ICONS.text, nameKey: 'tools.text' }
    ];

    for (const def of toolsDef) {
      const btn = document.createElement('button');
      btn.className = 'tool-btn';
      btn.innerHTML = def.icon;
      btn.title = t(def.nameKey);
      btn.onclick = () => toolManager.setActiveTool(def.id);

      this.toolButtons.set(def.id, btn);
      toolsGrid.appendChild(btn);
    }

    this.element.appendChild(toolsGrid);
  }

  private renderSizePanel(colorManager: ColorManager): void {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'brush-size-panel';
    const legend = document.createElement('legend');
    legend.textContent = t('tools.size');
    fieldset.appendChild(legend);

    const sizesGrid = document.createElement('div');
    sizesGrid.className = 'brush-sizes-grid';

    // 6 tamaños clásicos de GameMaker 8: 1px, 2px, 3px, 5px, 7px, 9px
    const sizes = [
      { size: 1, dotPx: 2 },
      { size: 2, dotPx: 4 },
      { size: 3, dotPx: 6 },
      { size: 5, dotPx: 9 },
      { size: 7, dotPx: 13 },
      { size: 9, dotPx: 17 }
    ];

    for (const item of sizes) {
      const btn = document.createElement('button');
      btn.className = `brush-size-btn${item.size === colorManager.getBrushSize() ? ' active' : ''}`;
      btn.dataset.size = item.size.toString();
      btn.title = t('tools.brushSize', { size: item.size });

      const dot = document.createElement('div');
      dot.className = 'brush-dot';
      dot.style.width = `${item.dotPx}px`;
      dot.style.height = `${item.dotPx}px`;

      btn.appendChild(dot);
      btn.onclick = () => colorManager.setBrushSize(item.size);

      this.sizeButtons.push(btn);
      sizesGrid.appendChild(btn);
    }

    fieldset.appendChild(sizesGrid);
    this.element.appendChild(fieldset);
  }
}
