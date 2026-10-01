import { ColorManager } from '../core/ColorManager.ts';
import { ColorMode, rgbToHex } from '../core/PixelOps.ts';

export class ColorPanel {
  private element: HTMLElement;
  private leftSwatch!: HTMLElement;
  private rightSwatch!: HTMLElement;
  private opacityInput!: HTMLInputElement;
  private opacityBarFill!: HTMLElement;
  private blendRadio!: HTMLInputElement;
  private replaceRadio!: HTMLInputElement;
  private spectrumCanvas!: HTMLCanvasElement;
  private spectrumCtx!: CanvasRenderingContext2D;

  private colorManager: ColorManager;

  constructor(container: HTMLElement, colorManager: ColorManager) {
    this.colorManager = colorManager;
    this.element = document.createElement('div');
    this.element.className = 'right-palette';
    container.appendChild(this.element);

    this.renderColorsBox();
    this.renderPresetGrid();
    this.renderSpectrumPicker();
    this.renderOpacityBox();
    this.renderColorModeBox();

    this.colorManager.subscribe((state) => {
      this.updateUI(state.leftColor, state.rightColor, state.opacity, state.mode);
    });
  }

  private renderColorsBox(): void {
    const fieldset = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = 'Colors';
    fieldset.appendChild(legend);

    const swatchesBox = document.createElement('div');
    swatchesBox.className = 'color-swatches-box';

    // Left Swatch
    const leftWrapper = document.createElement('div');
    leftWrapper.className = 'color-swatch-wrapper';
    leftWrapper.innerHTML = '<span>Left:</span>';
    this.leftSwatch = document.createElement('div');
    this.leftSwatch.className = 'color-swatch';
    this.leftSwatch.title = 'Left-click color';
    leftWrapper.appendChild(this.leftSwatch);

    // Right Swatch
    const rightWrapper = document.createElement('div');
    rightWrapper.className = 'color-swatch-wrapper';
    rightWrapper.innerHTML = '<span>Right:</span>';
    this.rightSwatch = document.createElement('div');
    this.rightSwatch.className = 'color-swatch';
    this.rightSwatch.title = 'Right-click color';
    rightWrapper.appendChild(this.rightSwatch);

    // Native color inputs invisibles para abrir selector de sistema si se hace doble click
    const leftNative = document.createElement('input');
    leftNative.type = 'color';
    leftNative.style.display = 'none';
    leftNative.onchange = () => this.colorManager.setLeftColor(leftNative.value);

    const rightNative = document.createElement('input');
    rightNative.type = 'color';
    rightNative.style.display = 'none';
    rightNative.onchange = () => this.colorManager.setRightColor(rightNative.value);

    this.leftSwatch.onclick = () => leftNative.click();
    this.rightSwatch.onclick = () => rightNative.click();

    swatchesBox.appendChild(leftWrapper);
    swatchesBox.appendChild(rightWrapper);
    swatchesBox.appendChild(leftNative);
    swatchesBox.appendChild(rightNative);

    fieldset.appendChild(swatchesBox);
    this.element.appendChild(fieldset);
  }

  private renderPresetGrid(): void {
    const grid = document.createElement('div');
    grid.className = 'palette-preset-grid';

    // 24 colores clásicos ordenados estilo paleta GM8
    const presets = [
      '#000000', '#808080', '#800000', '#808000', '#008000', '#008080',
      '#000080', '#800080', '#808040', '#004040', '#0080ff', '#004080',
      '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff',
      '#0000ff', '#ff00ff', '#ffff80', '#00ff80', '#80ffff', '#ff80c0'
    ];

    for (const color of presets) {
      const chip = document.createElement('div');
      chip.className = 'preset-chip';
      chip.style.backgroundColor = color;
      chip.title = `${color} (Left click: Izq / Right click: Der)`;

      chip.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.colorManager.setRightColor(color);
      });

      chip.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
          this.colorManager.setLeftColor(color);
        } else if (e.button === 2) {
          this.colorManager.setRightColor(color);
        }
      });

      grid.appendChild(chip);
    }

    this.element.appendChild(grid);
  }

  private renderSpectrumPicker(): void {
    this.spectrumCanvas = document.createElement('canvas');
    this.spectrumCanvas.className = 'spectrum-canvas';
    this.spectrumCanvas.width = 120;
    this.spectrumCanvas.height = 70;
    this.element.appendChild(this.spectrumCanvas);

    this.spectrumCtx = this.spectrumCanvas.getContext('2d', { willReadFrequently: true })!;
    this.drawSpectrumGradient();

    const handlePick = (e: MouseEvent) => {
      const rect = this.spectrumCanvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(this.spectrumCanvas.width - 1, Math.round((e.clientX - rect.left) * (this.spectrumCanvas.width / rect.width))));
      const y = Math.max(0, Math.min(this.spectrumCanvas.height - 1, Math.round((e.clientY - rect.top) * (this.spectrumCanvas.height / rect.height))));

      const pixel = this.spectrumCtx.getImageData(x, y, 1, 1).data;
      const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);

      if (e.buttons === 1 || e.button === 0) {
        this.colorManager.setLeftColor(hex);
      } else if (e.buttons === 2 || e.button === 2) {
        this.colorManager.setRightColor(hex);
      }
    };

    this.spectrumCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.spectrumCanvas.addEventListener('mousedown', handlePick);
    this.spectrumCanvas.addEventListener('mousemove', (e) => {
      if (e.buttons === 1 || e.buttons === 2) {
        handlePick(e);
      }
    });
  }

  private drawSpectrumGradient(): void {
    const w = this.spectrumCanvas.width;
    const h = this.spectrumCanvas.height;

    // Gradiente horizontal con todo el arcoíris
    const hGrad = this.spectrumCtx.createLinearGradient(0, 0, w, 0);
    hGrad.addColorStop(0, '#ff0000');
    hGrad.addColorStop(0.17, '#ffff00');
    hGrad.addColorStop(0.33, '#00ff00');
    hGrad.addColorStop(0.5, '#00ffff');
    hGrad.addColorStop(0.67, '#0000ff');
    hGrad.addColorStop(0.83, '#ff00ff');
    hGrad.addColorStop(1, '#ff0000');

    this.spectrumCtx.fillStyle = hGrad;
    this.spectrumCtx.fillRect(0, 0, w, h);

    // Gradiente vertical de blanco a transparente y a negro
    const vGrad = this.spectrumCtx.createLinearGradient(0, 0, 0, h);
    vGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    vGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    vGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    vGrad.addColorStop(1, 'rgba(0, 0, 0, 1)');

    this.spectrumCtx.fillStyle = vGrad;
    this.spectrumCtx.fillRect(0, 0, w, h);
  }

  private renderOpacityBox(): void {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'opacity-container';
    const legend = document.createElement('legend');
    legend.textContent = 'Opacity';
    fieldset.appendChild(legend);

    const inputsRow = document.createElement('div');
    inputsRow.className = 'opacity-inputs';

    this.opacityInput = document.createElement('input');
    this.opacityInput.type = 'number';
    this.opacityInput.className = 'opacity-number-input';
    this.opacityInput.min = '0';
    this.opacityInput.max = '255';
    this.opacityInput.value = this.colorManager.getOpacity().toString();

    this.opacityInput.oninput = () => {
      const val = parseInt(this.opacityInput.value, 10);
      if (!isNaN(val)) {
        this.colorManager.setOpacity(val);
      }
    };

    inputsRow.appendChild(this.opacityInput);

    const barWrapper = document.createElement('div');
    barWrapper.className = 'opacity-bar-wrapper';
    this.opacityBarFill = document.createElement('div');
    this.opacityBarFill.className = 'opacity-bar-fill';
    barWrapper.appendChild(this.opacityBarFill);

    barWrapper.onclick = (e) => {
      const rect = barWrapper.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      this.colorManager.setOpacity(Math.round(fraction * 255));
    };

    fieldset.appendChild(inputsRow);
    fieldset.appendChild(barWrapper);
    this.element.appendChild(fieldset);
  }

  private renderColorModeBox(): void {
    const fieldset = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = 'Color Mode';
    fieldset.appendChild(legend);

    const options = document.createElement('div');
    options.className = 'color-mode-options';

    const blendLabel = document.createElement('label');
    blendLabel.className = 'color-mode-label';
    this.blendRadio = document.createElement('input');
    this.blendRadio.type = 'radio';
    this.blendRadio.name = 'color-mode';
    this.blendRadio.value = 'blend';
    this.blendRadio.checked = this.colorManager.getMode() === 'blend';
    blendLabel.appendChild(this.blendRadio);
    blendLabel.appendChild(document.createTextNode('Blend'));

    const replaceLabel = document.createElement('label');
    replaceLabel.className = 'color-mode-label';
    this.replaceRadio = document.createElement('input');
    this.replaceRadio.type = 'radio';
    this.replaceRadio.name = 'color-mode';
    this.replaceRadio.value = 'replace';
    this.replaceRadio.checked = this.colorManager.getMode() === 'replace';
    replaceLabel.appendChild(this.replaceRadio);
    replaceLabel.appendChild(document.createTextNode('Replace'));

    const handleChange = (mode: ColorMode) => {
      this.colorManager.setMode(mode);
    };

    this.blendRadio.onchange = () => handleChange('blend');
    this.replaceRadio.onchange = () => handleChange('replace');

    options.appendChild(blendLabel);
    options.appendChild(replaceLabel);
    fieldset.appendChild(options);
    this.element.appendChild(fieldset);
  }

  private updateUI(leftColor: string, rightColor: string, opacity: number, mode: ColorMode): void {
    this.leftSwatch.style.backgroundColor = leftColor;
    this.rightSwatch.style.backgroundColor = rightColor;

    if (this.opacityInput.value !== opacity.toString()) {
      this.opacityInput.value = opacity.toString();
    }
    this.opacityBarFill.style.width = `${(opacity / 255) * 100}%`;

    this.blendRadio.checked = mode === 'blend';
    this.replaceRadio.checked = mode === 'replace';
  }
}
