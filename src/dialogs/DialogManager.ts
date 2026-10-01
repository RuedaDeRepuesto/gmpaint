import { AnchorPosition } from '../core/PixelOps.ts';
import { imageBlobToImageData, imageDataToBlob } from '../core/ClipboardManager.ts';

export interface NewImageConfig {
  width: number;
  height: number;
  background: 'transparent' | 'white';
}

export interface CanvasSizeConfig {
  width: number;
  height: number;
  anchor: AnchorPosition;
}

export interface StretchConfig {
  width: number;
  height: number;
  mode: 'nearest' | 'bilinear';
}

export interface TextConfig {
  text: string;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
}

export class DialogManager {
  /**
   * Crea y muestra una ventana modal genérica estilo GameMaker 8 / Win32.
   */
  private static showModal<T>(
    title: string,
    buildContent: (container: HTMLElement) => () => T | null
  ): Promise<T | null> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';

      const windowEl = document.createElement('div');
      windowEl.className = 'modal-window';

      const titleBar = document.createElement('div');
      titleBar.className = 'modal-titlebar';
      titleBar.innerHTML = `<span>${title}</span>`;

      const closeBtn = document.createElement('button');
      closeBtn.className = 'modal-close-btn';
      closeBtn.textContent = '✕';
      titleBar.appendChild(closeBtn);

      const content = document.createElement('div');
      content.className = 'modal-content';

      const getResult = buildContent(content);

      const btnRow = document.createElement('div');
      btnRow.className = 'modal-buttons';

      const okBtn = document.createElement('button');
      okBtn.className = 'modal-btn';
      okBtn.textContent = 'OK';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'modal-btn';
      cancelBtn.textContent = 'Cancel';

      btnRow.appendChild(okBtn);
      btnRow.appendChild(cancelBtn);
      content.appendChild(btnRow);

      windowEl.appendChild(titleBar);
      windowEl.appendChild(content);
      overlay.appendChild(windowEl);
      document.body.appendChild(overlay);

      const cleanup = (val: T | null) => {
        document.body.removeChild(overlay);
        resolve(val);
      };

      okBtn.onclick = () => {
        const res = getResult();
        if (res !== null) cleanup(res);
      };

      cancelBtn.onclick = () => cleanup(null);
      closeBtn.onclick = () => cleanup(null);
      overlay.onclick = (e) => {
        if (e.target === overlay) cleanup(null);
      };
    });
  }

  /**
   * Diálogo para crear una nueva imagen.
   */
  public static async showNewDialog(defaultW: number = 32, defaultH: number = 32): Promise<NewImageConfig | null> {
    return this.showModal<NewImageConfig>('New Image', (container) => {
      container.innerHTML = `
        <div class="modal-row">
          <label class="modal-label">Width:</label>
          <input type="number" id="new-w" value="${defaultW}" min="1" max="4096" style="width: 80px;" />
          <span>pixels</span>
        </div>
        <div class="modal-row">
          <label class="modal-label">Height:</label>
          <input type="number" id="new-h" value="${defaultH}" min="1" max="4096" style="width: 80px;" />
          <span>pixels</span>
        </div>
        <div class="modal-row">
          <label class="modal-label">Background:</label>
          <select id="new-bg" style="width: 120px;">
            <option value="transparent">Transparent</option>
            <option value="white">White</option>
          </select>
        </div>
      `;

      return () => {
        const w = parseInt((container.querySelector('#new-w') as HTMLInputElement).value, 10);
        const h = parseInt((container.querySelector('#new-h') as HTMLInputElement).value, 10);
        const bg = (container.querySelector('#new-bg') as HTMLSelectElement).value as 'transparent' | 'white';
        if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return null;
        return { width: w, height: h, background: bg };
      };
    });
  }

  /**
   * Diálogo de tamaño de lienzo con selector de anclaje de 9 posiciones.
   */
  public static async showCanvasSizeDialog(currentW: number, currentH: number): Promise<CanvasSizeConfig | null> {
    return this.showModal<CanvasSizeConfig>('Canvas Size', (container) => {
      let selectedAnchor: AnchorPosition = 'center';

      container.innerHTML = `
        <fieldset>
          <legend>Current Size</legend>
          <div style="padding: 2px;">${currentW} x ${currentH} pixels</div>
        </fieldset>
        <fieldset>
          <legend>New Size</legend>
          <div class="modal-row" style="margin-bottom: 4px;">
            <label class="modal-label">Width:</label>
            <input type="number" id="cs-w" value="${currentW}" min="1" max="4096" style="width: 80px;" />
            <span>pixels</span>
          </div>
          <div class="modal-row">
            <label class="modal-label">Height:</label>
            <input type="number" id="cs-h" value="${currentH}" min="1" max="4096" style="width: 80px;" />
            <span>pixels</span>
          </div>
        </fieldset>
        <fieldset>
          <legend>Anchor Position</legend>
          <div class="anchor-grid">
            <button type="button" class="anchor-btn" data-anchor="top-left">↖</button>
            <button type="button" class="anchor-btn" data-anchor="top-center">↑</button>
            <button type="button" class="anchor-btn" data-anchor="top-right">↗</button>
            <button type="button" class="anchor-btn" data-anchor="middle-left">←</button>
            <button type="button" class="anchor-btn active" data-anchor="center">•</button>
            <button type="button" class="anchor-btn" data-anchor="middle-right">→</button>
            <button type="button" class="anchor-btn" data-anchor="bottom-left">↙</button>
            <button type="button" class="anchor-btn" data-anchor="bottom-center">↓</button>
            <button type="button" class="anchor-btn" data-anchor="bottom-right">↘</button>
          </div>
        </fieldset>
      `;

      const anchorBtns = container.querySelectorAll<HTMLButtonElement>('.anchor-btn');
      anchorBtns.forEach((btn) => {
        btn.onclick = () => {
          anchorBtns.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          selectedAnchor = btn.dataset.anchor as AnchorPosition;
        };
      });

      return () => {
        const w = parseInt((container.querySelector('#cs-w') as HTMLInputElement).value, 10);
        const h = parseInt((container.querySelector('#cs-h') as HTMLInputElement).value, 10);
        if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return null;
        return { width: w, height: h, anchor: selectedAnchor };
      };
    });
  }

  /**
   * Diálogo para escalar / estirar la imagen existente.
   */
  public static async showStretchDialog(currentW: number, currentH: number): Promise<StretchConfig | null> {
    return this.showModal<StretchConfig>('Stretch / Scale Image', (container) => {
      const aspectRatio = currentW / currentH;

      container.innerHTML = `
        <fieldset>
          <legend>New Dimensions</legend>
          <div class="modal-row" style="margin-bottom: 4px;">
            <label class="modal-label">Width:</label>
            <input type="number" id="st-w" value="${currentW}" min="1" max="4096" style="width: 80px;" />
            <span>px</span>
          </div>
          <div class="modal-row" style="margin-bottom: 6px;">
            <label class="modal-label">Height:</label>
            <input type="number" id="st-h" value="${currentH}" min="1" max="4096" style="width: 80px;" />
            <span>px</span>
          </div>
          <div class="modal-row">
            <input type="checkbox" id="st-ratio" checked />
            <label for="st-ratio">Keep aspect ratio</label>
          </div>
        </fieldset>
        <fieldset>
          <legend>Quality / Resampling</legend>
          <div class="modal-row">
            <select id="st-mode" style="width: 100%;">
              <option value="nearest">Nearest Neighbor (Pixel Art crisp)</option>
              <option value="bilinear">Bilinear (Smooth)</option>
            </select>
          </div>
        </fieldset>
      `;

      const wInput = container.querySelector('#st-w') as HTMLInputElement;
      const hInput = container.querySelector('#st-h') as HTMLInputElement;
      const ratioCheck = container.querySelector('#st-ratio') as HTMLInputElement;

      wInput.oninput = () => {
        if (ratioCheck.checked) {
          const w = parseInt(wInput.value, 10);
          if (!isNaN(w) && w > 0) {
            hInput.value = Math.max(1, Math.round(w / aspectRatio)).toString();
          }
        }
      };

      hInput.oninput = () => {
        if (ratioCheck.checked) {
          const h = parseInt(hInput.value, 10);
          if (!isNaN(h) && h > 0) {
            wInput.value = Math.max(1, Math.round(h * aspectRatio)).toString();
          }
        }
      };

      return () => {
        const w = parseInt(wInput.value, 10);
        const h = parseInt(hInput.value, 10);
        const mode = (container.querySelector('#st-mode') as HTMLSelectElement).value as 'nearest' | 'bilinear';
        if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return null;
        return { width: w, height: h, mode };
      };
    });
  }

  /**
   * Diálogo para insertar texto tipográfico en el lienzo.
   */
  public static async showTextDialog(): Promise<TextConfig | null> {
    return this.showModal<TextConfig>('Insert Text', (container) => {
      container.innerHTML = `
        <div class="modal-row">
          <label class="modal-label">Text:</label>
          <input type="text" id="tx-str" value="GM8" style="flex: 1;" />
        </div>
        <div class="modal-row">
          <label class="modal-label">Font:</label>
          <select id="tx-font" style="flex: 1;">
            <option value="Arial">Arial</option>
            <option value="'Courier New', monospace">Courier New</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
            <option value="Impact">Impact</option>
            <option value="Tahoma">Tahoma</option>
          </select>
        </div>
        <div class="modal-row">
          <label class="modal-label">Size:</label>
          <input type="number" id="tx-size" value="16" min="6" max="120" style="width: 70px;" />
          <span>pt</span>
        </div>
        <div class="modal-row">
          <input type="checkbox" id="tx-bold" />
          <label for="tx-bold" style="margin-right: 12px;">Bold</label>
          <input type="checkbox" id="tx-italic" />
          <label for="tx-italic">Italic</label>
        </div>
      `;

      return () => {
        const text = (container.querySelector('#tx-str') as HTMLInputElement).value;
        const font = (container.querySelector('#tx-font') as HTMLSelectElement).value;
        const size = parseInt((container.querySelector('#tx-size') as HTMLInputElement).value, 10);
        const bold = (container.querySelector('#tx-bold') as HTMLInputElement).checked;
        const italic = (container.querySelector('#tx-italic') as HTMLInputElement).checked;

        if (!text.trim() || isNaN(size) || size <= 0) return null;
        return { text, fontFamily: font, fontSize: size, bold, italic };
      };
    });
  }

  /**
   * Abre un archivo de imagen local y lo convierte a ImageData.
   */
  public static async openImageFileDialog(): Promise<{ name: string; imageData: ImageData } | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png, image/jpeg, image/webp, image/bmp, image/gif';

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        try {
          const imgData = await imageBlobToImageData(file);
          resolve({ name: file.name, imageData: imgData });
        } catch {
          resolve(null);
        }
      };

      input.click();
    });
  }

  /**
   * Guarda y descarga el ImageData actual como archivo PNG.
   */
  public static async saveImageDataAsPng(imageData: ImageData, filename: string = 'sprite0.png'): Promise<void> {
    const blob = await imageDataToBlob(imageData);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
