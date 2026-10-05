import { SelectionManager } from './SelectionManager.ts';

/**
 * Convierte un ImageData en un Blob de tipo image/png.
 */
export async function imageDataToBlob(imageData: ImageData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Fallo al generar Blob de imagen'));
    }, 'image/png');
  });
}

/**
 * Convierte un Blob o File de imagen en un ImageData.
 */
export async function imageBlobToImageData(blob: Blob): Promise<ImageData> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
}

export class ClipboardManager {
  private selectionManager: SelectionManager;

  constructor(selectionManager: SelectionManager) {
    this.selectionManager = selectionManager;
  }

  /**
   * Copia la selección actual al portapapeles del sistema y al portapapeles interno.
   */
  public async copySelectionToSystem(canvasData: ImageData): Promise<boolean> {
    const copied = this.selectionManager.copy(canvasData);
    if (!copied) return false;

    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const blob = await imageDataToBlob(copied);
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
      }
      return true;
    } catch {
      // Fallback silencioso: se mantiene en el portapapeles interno
      return true;
    }
  }

  /**
   * Corta la selección actual al portapapeles del sistema e interno.
   */
  public async cutSelectionToSystem(canvasData: ImageData): Promise<boolean> {
    const cutData = this.selectionManager.cut(canvasData);
    if (!cutData) return false;

    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const blob = await imageDataToBlob(cutData);
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
      }
      return true;
    } catch {
      return true;
    }
  }

  /**
   * Obtiene la imagen del portapapeles del sistema o interno como ImageData sin pegarla directamente.
   */
  public async getImageFromClipboard(): Promise<ImageData | null> {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((type) => type.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            return await imageBlobToImageData(blob);
          }
        }
      }
    } catch {
      // Fallback a portapapeles interno
    }

    return this.selectionManager.getInternalClipboard();
  }

  /**
   * Extrae el ImageData de un evento nativo de pegado (ClipboardEvent).
   */
  public async getImageFromPasteEvent(event: ClipboardEvent): Promise<ImageData | null> {
    const items = event.clipboardData?.items;
    if (!items) return null;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          event.preventDefault();
          return await imageBlobToImageData(file);
        }
      }
    }
    return null;
  }

  /**
   * Lee una imagen desde el portapapeles del sistema o interno y la pega como capa flotante.
   */
  public async pasteFromSystemOrInternal(targetX: number = 0, targetY: number = 0): Promise<ImageData | null> {
    const imgData = await this.getImageFromClipboard();
    if (imgData) {
      this.selectionManager.paste(imgData, targetX, targetY);
      return imgData;
    }
    return null;
  }

  /**
   * Maneja el evento nativo paste (Ctrl+V / Cmd+V).
   */
  public async handlePasteEvent(event: ClipboardEvent, targetX: number = 0, targetY: number = 0): Promise<ImageData | null> {
    const imgData = await this.getImageFromPasteEvent(event);
    if (imgData) {
      this.selectionManager.paste(imgData, targetX, targetY);
      return imgData;
    }
    return null;
  }
}
