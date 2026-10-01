import { ColorManager } from '../core/ColorManager.ts';
import { ToolManager } from '../tools/ToolManager.ts';
import { ICONS } from './Icons.ts';

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

    this.renderToolsGrid(toolManager);
    this.renderSizePanel(colorManager);

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

    const toolsDef: { id: string; icon: string; name: string }[] = [
      { id: 'pencil', icon: ICONS.pencil, name: 'Pencil' },
      { id: 'line', icon: ICONS.line, name: 'Line' },
      { id: 'eraser', icon: ICONS.eraser, name: 'Eraser' },
      { id: 'picker', icon: ICONS.picker, name: 'Color Picker (Left / Right click)' },
      { id: 'fill', icon: ICONS.fill, name: 'Fill (Bucket)' },
      { id: 'rect', icon: ICONS.rect, name: 'Rectangle (Outline)' },
      { id: 'circle', icon: ICONS.circle, name: 'Ellipse (Outline)' },
      { id: 'rect-fill', icon: ICONS.rectFill, name: 'Rectangle (Filled)' },
      { id: 'circle-fill', icon: ICONS.circleFill, name: 'Ellipse (Filled)' },
      { id: 'select', icon: ICONS.select, name: 'Select (Rectangular marquee)' },
      { id: 'text', icon: ICONS.text, name: 'Insert Text' }
    ];

    for (const def of toolsDef) {
      const btn = document.createElement('button');
      btn.className = 'tool-btn';
      btn.innerHTML = def.icon;
      btn.title = def.name;
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
    legend.textContent = 'Size';
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
      btn.title = `Brush Size: ${item.size}px`;

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
