export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number; // 0 a 255
}

export interface Point {
  x: number;
  y: number;
}

export type AnchorPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type ColorMode = 'blend' | 'replace';

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '');
  const parsed = parseInt(cleanHex.length === 3
    ? cleanHex.split('').map((char) => char + char).join('')
    : cleanHex, 16);
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Combina un color fuente sobre un color destino según el modo Blend o Replace.
 * En modo Blend se usa mezcla alfa convencional (porter-duff source-over).
 * En modo Replace se sobrescriben directamente todos los canales RGBA.
 */
export function blendPixel(dest: RGBA, src: RGBA, mode: ColorMode): RGBA {
  if (mode === 'replace') {
    return { ...src };
  }

  const srcAlpha = src.a / 255;
  const destAlpha = dest.a / 255;
  const outAlpha = srcAlpha + destAlpha * (1 - srcAlpha);

  if (outAlpha <= 0) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  const outR = Math.round((src.r * srcAlpha + dest.r * destAlpha * (1 - srcAlpha)) / outAlpha);
  const outG = Math.round((src.g * srcAlpha + dest.g * destAlpha * (1 - srcAlpha)) / outAlpha);
  const outB = Math.round((src.b * srcAlpha + dest.b * destAlpha * (1 - srcAlpha)) / outAlpha);

  return {
    r: Math.max(0, Math.min(255, outR)),
    g: Math.max(0, Math.min(255, outG)),
    b: Math.max(0, Math.min(255, outB)),
    a: Math.round(outAlpha * 255)
  };
}

export function getPixel(data: Uint8ClampedArray, width: number, x: number, y: number): RGBA {
  const index = (y * width + x) * 4;
  return {
    r: data[index],
    g: data[index + 1],
    b: data[index + 2],
    a: data[index + 3]
  };
}

export function setPixel(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  color: RGBA,
  mode: ColorMode = 'replace'
): void {
  const index = (y * width + x) * 4;
  if (mode === 'blend') {
    const dest = {
      r: data[index],
      g: data[index + 1],
      b: data[index + 2],
      a: data[index + 3]
    };
    const blended = blendPixel(dest, color, 'blend');
    data[index] = blended.r;
    data[index + 1] = blended.g;
    data[index + 2] = blended.b;
    data[index + 3] = blended.a;
  } else {
    data[index] = color.r;
    data[index + 1] = color.g;
    data[index + 2] = color.b;
    data[index + 3] = color.a;
  }
}

/**
 * Traza una línea recta continua entre dos puntos usando el algoritmo de Bresenham.
 */
export function getBresenhamPoints(x0: number, y0: number, x1: number, y1: number): Point[] {
  const points: Point[] = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let currX = x0;
  let currY = y0;

  while (true) {
    points.push({ x: currX, y: currY });
    if (currX === x1 && currY === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      currX += sx;
    }
    if (e2 < dx) {
      err += dx;
      currY += sy;
    }
  }

  return points;
}

/**
 * Genera los offsets relativos de un pincel según su tamaño y forma (redondo o cuadrado).
 */
export function getBrushOffsets(size: number, shape: 'square' | 'circle' = 'circle'): Point[] {
  if (size <= 1) return [{ x: 0, y: 0 }];

  const offsets: Point[] = [];
  const radius = size / 2;
  const offsetStart = -Math.floor(size / 2);
  const offsetEnd = offsetStart + size;

  for (let dy = offsetStart; dy < offsetEnd; dy++) {
    for (let dx = offsetStart; dx < offsetEnd; dx++) {
      if (shape === 'square') {
        offsets.push({ x: dx, y: dy });
      } else {
        const cx = dx + 0.5;
        const cy = dy + 0.5;
        if (cx * cx + cy * cy <= radius * radius) {
          offsets.push({ x: dx, y: dy });
        }
      }
    }
  }

  return offsets.length > 0 ? offsets : [{ x: 0, y: 0 }];
}

/**
 * Algoritmo de flood fill (bote de pintura) con soporte de tolerancia y modo Blend/Replace.
 */
export function floodFill(
  imageData: ImageData,
  startX: number,
  startY: number,
  fillColor: RGBA,
  mode: ColorMode,
  tolerance: number = 0
): void {
  const { width, height, data } = imageData;
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

  const targetColor = getPixel(data, width, startX, startY);

  if (
    tolerance === 0 &&
    targetColor.r === fillColor.r &&
    targetColor.g === fillColor.g &&
    targetColor.b === fillColor.b &&
    targetColor.a === fillColor.a
  ) {
    return;
  }

  const visited = new Uint8Array(width * height);
  const queue: Point[] = [{ x: startX, y: startY }];
  visited[startY * width + startX] = 1;

  const matches = (color: RGBA): boolean => {
    const diffR = Math.abs(color.r - targetColor.r);
    const diffG = Math.abs(color.g - targetColor.g);
    const diffB = Math.abs(color.b - targetColor.b);
    const diffA = Math.abs(color.a - targetColor.a);
    return (diffR + diffG + diffB + diffA) / 4 <= tolerance;
  };

  while (queue.length > 0) {
    const current = queue.shift()!;
    setPixel(data, width, current.x, current.y, fillColor, mode);

    const neighbors: Point[] = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 }
    ];

    for (const n of neighbors) {
      if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
        const idx = n.y * width + n.x;
        if (!visited[idx]) {
          visited[idx] = 1;
          const pixelColor = getPixel(data, width, n.x, n.y);
          if (matches(pixelColor)) {
            queue.push(n);
          }
        }
      }
    }
  }
}

/**
 * Puntos perimetrales o rellenos para rectángulos.
 */
export function getRectanglePoints(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  fill: boolean
): Point[] {
  const points: Point[] = [];
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (fill || x === minX || x === maxX || y === minY || y === maxY) {
        points.push({ x, y });
      }
    }
  }

  return points;
}

/**
 * Puntos para círculos / elipses usando algoritmo de punto medio.
 */
export function getEllipsePoints(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  fill: boolean
): Point[] {
  const points: Point[] = [];
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);

  const rx = (maxX - minX) / 2;
  const ry = (maxY - minY) / 2;
  const cx = minX + rx;
  const cy = minY + ry;

  if (rx <= 0 && ry <= 0) return [{ x: minX, y: minY }];
  if (rx <= 0) {
    for (let y = minY; y <= maxY; y++) points.push({ x: minX, y });
    return points;
  }
  if (ry <= 0) {
    for (let x = minX; x <= maxX; x++) points.push({ x, y: minY });
    return points;
  }

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const dist = dx * dx + dy * dy;

      if (fill) {
        if (dist <= 1.0) {
          points.push({ x, y });
        }
      } else {
        const innerDx = (x + 0.5 - cx) / Math.max(0.1, rx - 1);
        const innerDy = (y + 0.5 - cy) / Math.max(0.1, ry - 1);
        const innerDist = innerDx * innerDx + innerDy * innerDy;
        if (dist <= 1.1 && innerDist >= 0.75) {
          points.push({ x, y });
        }
      }
    }
  }

  return points;
}

/**
 * Redimensiona el lienzo con un anclaje de 9 posiciones.
 * No deforma la imagen existente: calcula el offset del contenido previo y rellena el nuevo espacio con transparente.
 */
export function resizeCanvas(
  source: ImageData,
  newWidth: number,
  newHeight: number,
  anchor: AnchorPosition
): ImageData {
  const result = new ImageData(newWidth, newHeight);
  const srcW = source.width;
  const srcH = source.height;

  let offsetX = 0;
  let offsetY = 0;

  if (anchor.includes('center')) {
    offsetX = Math.floor((newWidth - srcW) / 2);
  } else if (anchor.includes('right')) {
    offsetX = newWidth - srcW;
  }

  if (anchor.startsWith('middle') || anchor === 'center') {
    offsetY = Math.floor((newHeight - srcH) / 2);
  } else if (anchor.startsWith('bottom')) {
    offsetY = newHeight - srcH;
  }

  for (let sy = 0; sy < srcH; sy++) {
    const dy = sy + offsetY;
    if (dy < 0 || dy >= newHeight) continue;

    for (let sx = 0; sx < srcW; sx++) {
      const dx = sx + offsetX;
      if (dx < 0 || dx >= newWidth) continue;

      const srcIdx = (sy * srcW + sx) * 4;
      const dstIdx = (dy * newWidth + dx) * 4;

      result.data[dstIdx] = source.data[srcIdx];
      result.data[dstIdx + 1] = source.data[srcIdx + 1];
      result.data[dstIdx + 2] = source.data[srcIdx + 2];
      result.data[dstIdx + 3] = source.data[srcIdx + 3];
    }
  }

  return result;
}

/**
 * Escala y estira la imagen a un nuevo tamaño.
 * Soporta 'nearest' (pixel art perfecto) y 'bilinear' (suave).
 */
export function stretchImage(
  source: ImageData,
  newWidth: number,
  newHeight: number,
  mode: 'nearest' | 'bilinear' = 'nearest'
): ImageData {
  const result = new ImageData(newWidth, newHeight);
  const srcW = source.width;
  const srcH = source.height;

  if (mode === 'nearest') {
    for (let dy = 0; dy < newHeight; dy++) {
      const sy = Math.min(srcH - 1, Math.floor((dy / newHeight) * srcH));
      for (let dx = 0; dx < newWidth; dx++) {
        const sx = Math.min(srcW - 1, Math.floor((dx / newWidth) * srcW));

        const srcIdx = (sy * srcW + sx) * 4;
        const dstIdx = (dy * newWidth + dx) * 4;

        result.data[dstIdx] = source.data[srcIdx];
        result.data[dstIdx + 1] = source.data[srcIdx + 1];
        result.data[dstIdx + 2] = source.data[srcIdx + 2];
        result.data[dstIdx + 3] = source.data[srcIdx + 3];
      }
    }
    return result;
  }

  for (let dy = 0; dy < newHeight; dy++) {
    const gy = (dy / newHeight) * (srcH - 1);
    const y0 = Math.floor(gy);
    const y1 = Math.min(srcH - 1, y0 + 1);
    const fy = gy - y0;

    for (let dx = 0; dx < newWidth; dx++) {
      const gx = (dx / newWidth) * (srcW - 1);
      const x0 = Math.floor(gx);
      const x1 = Math.min(srcW - 1, x0 + 1);
      const fx = gx - x0;

      const p00 = getPixel(source.data, srcW, x0, y0);
      const p10 = getPixel(source.data, srcW, x1, y0);
      const p01 = getPixel(source.data, srcW, x0, y1);
      const p11 = getPixel(source.data, srcW, x1, y1);

      const dstIdx = (dy * newWidth + dx) * 4;
      for (const channel of ['r', 'g', 'b', 'a'] as const) {
        const top = p00[channel] * (1 - fx) + p10[channel] * fx;
        const bottom = p01[channel] * (1 - fx) + p11[channel] * fx;
        const value = Math.round(top * (1 - fy) + bottom * fy);
        const offset = channel === 'r' ? 0 : channel === 'g' ? 1 : channel === 'b' ? 2 : 3;
        result.data[dstIdx + offset] = Math.max(0, Math.min(255, value));
      }
    }
  }

  return result;
}

/**
 * Operaciones geométricas instantáneas (voltear, rotar e invertir).
 */
export function flipHorizontal(source: ImageData): ImageData {
  const result = new ImageData(source.width, source.height);
  const { width, height, data } = source;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = (y * width + (width - 1 - x)) * 4;
      result.data[dstIdx] = data[srcIdx];
      result.data[dstIdx + 1] = data[srcIdx + 1];
      result.data[dstIdx + 2] = data[srcIdx + 2];
      result.data[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  return result;
}

export function flipVertical(source: ImageData): ImageData {
  const result = new ImageData(source.width, source.height);
  const { width, height, data } = source;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = ((height - 1 - y) * width + x) * 4;
      result.data[dstIdx] = data[srcIdx];
      result.data[dstIdx + 1] = data[srcIdx + 1];
      result.data[dstIdx + 2] = data[srcIdx + 2];
      result.data[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  return result;
}

export function rotate90CW(source: ImageData): ImageData {
  const result = new ImageData(source.height, source.width);
  const { width, height, data } = source;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstX = height - 1 - y;
      const dstY = x;
      const dstIdx = (dstY * height + dstX) * 4;
      result.data[dstIdx] = data[srcIdx];
      result.data[dstIdx + 1] = data[srcIdx + 1];
      result.data[dstIdx + 2] = data[srcIdx + 2];
      result.data[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  return result;
}

export function rotate90CCW(source: ImageData): ImageData {
  const result = new ImageData(source.height, source.width);
  const { width, height, data } = source;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstX = y;
      const dstY = width - 1 - x;
      const dstIdx = (dstY * height + dstX) * 4;
      result.data[dstIdx] = data[srcIdx];
      result.data[dstIdx + 1] = data[srcIdx + 1];
      result.data[dstIdx + 2] = data[srcIdx + 2];
      result.data[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  return result;
}

export function invertColors(source: ImageData): ImageData {
  const result = new ImageData(source.width, source.height);
  const { data } = source;
  for (let i = 0; i < data.length; i += 4) {
    result.data[i] = 255 - data[i];
    result.data[i + 1] = 255 - data[i + 1];
    result.data[i + 2] = 255 - data[i + 2];
    result.data[i + 3] = data[i + 3];
  }
  return result;
}
