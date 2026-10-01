# GMPaint 🎨

Un editor de imágenes y sprites sencillo, directo y sin vueltas, fuertemente inspirado en el mítico editor de imágenes de **GameMaker 8** (de la época dorada de Mark Overmars / YoYo Games).

Este proyecto nació como un experimento personal de fin de semana: una herramienta rápida para abrir un PNG, retocar unos píxeles con clic izquierdo o derecho, rellenar un color, cambiar el tamaño del lienzo con una cuadrícula de anclaje de 3x3 y exportarlo al toque, sin tener que esperar a que abra Photoshop ni lidiar con las mil opciones de editores más pesados.

---

## 🕹️ La Inspiración: GameMaker 8

Quienes hayan usado GameMaker 7 u 8 recordarán ese editor de sprites grisáceo con estética Windows clásica:
- **Doble pincel**: El color principal con clic izquierdo y el secundario con clic derecho.
- **Canal Alfa directo**: Un deslizador simple de opacidad de 0 a 255.
- **Modos Blend vs Replace**: Elegir si al pintar querías mezclar con transparencia o reemplazar el píxel a lo bruto.
- **Redimensionar con anclaje 9 puntos**: La ventanita con la cuadrícula de 3x3 donde elegías hacia dónde crecía o se recortaba la imagen.
- **Cuadrícula de transparencia fija**: La cuadrícula de ajedrez no se convertía en bloques gigantes al hacer zoom al 1600%, sino que mantenía su tamaño relativo a la pantalla para poder ver qué estabas pintando.

Todo eso está implementado aquí, pero corriendo en la web moderna y en el escritorio.

---

## 🛠️ Cómo levantarlo

El proyecto se puede correr de dos formas: como aplicación web tradicional en el navegador o como app de escritorio nativa con **Tauri**.

### Requisitos previos
- **Node.js** (v18 o superior).
- *(Opcional, solo para Tauri)* **Rust y Cargo** instalados si quieres compilar la app de escritorio (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`).

### 1. En la Web (Rápido y liviano)
```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción (archivos estáticos en /dist)
npm run build
```
Abre `http://localhost:5173/` en tu navegador y listo.

### 2. En el Escritorio con Tauri (macOS / Windows / Linux)
```bash
# Modo desarrollo con recarga en vivo en ventana nativa
npm run tauri:dev

# Empaquetar la app (.app / .dmg en Mac, .exe / .msi en Windows)
npm run tauri:build
```

### 3. Despliegue en GitHub Pages 🚀
El proyecto está configurado para compilarse y desplegarse automáticamente en la rama `gh-pages`:

- **Automático (CI/CD)**: Cada vez que haces `push` a la rama `main`, la GitHub Action (`.github/workflows/deploy.yml`) compila el bundle estático y lo sube directamente a la rama `gh-pages`.
- **Manual desde consola**: Si prefieres subirlo a mano:
  ```bash
  npm run deploy
  ```
- **Configuración en el repositorio de GitHub**:
  En **Settings** > **Pages** de tu repo en GitHub:
  - Source: **Deploy from a branch**
  - Branch: **`gh-pages`** / Folder: **`/ (root)`**

---

## 🧠 Detalles Técnicos de la Implementación

Para mantenerlo rápido y con código entendible, no se usaron frameworks pesados (ni React, ni Angular, ni Vue). Es **TypeScript puro**, manipulación directa del DOM y la API nativa de **HTML5 Canvas**.

### 1. Arquitectura de doble lienzo (Offscreen vs Viewport)
- **Lienzo virtual (`offscreenCanvas`)**: Es el buffer de memoria donde vive la imagen real en sus dimensiones exactas (por ejemplo, 32x32 píxeles). Todas las operaciones destructivas de dibujo se ejecutan aquí en escala 1:1.
- **Lienzo visible (`viewportCanvas`)**: Es lo que ves en pantalla. Escucha los eventos del mouse, maneja el pan (arrastrar con barra espaciadora o botón del medio) y el zoom con la rueda (hasta 32x). Dibuja el offscreen escalado con `imageSmoothingEnabled = false` para que los píxeles nunca se vean borrosos.

### 2. Cuadrícula de transparencia en espacio de pantalla
Uno de los problemas típicos al hacer un editor de pixel art en canvas es que si dibujas la cuadrícula de transparencia dentro del lienzo escalado, al meter 16x de zoom los cuadritos de ajedrez quedan gigantes.
Aquí se resuelve renderizando la cuadrícula usando un `CanvasPattern` generado al vuelo en **coordenadas de pantalla** (viewport), recortado a la caja proyectada de la imagen. Así, no importa cuánto zoom metas, los cuadritos siempre mantienen un tamaño cómodo. Además, el tamaño y los colores de la cuadrícula son configurables y se guardan en `localStorage`.

### 3. Operaciones de Píxeles
- **Lápiz y Líneas**: Algoritmo clásico de **Bresenham** para no dejar huecos al mover rápido el mouse.
- **Relleno (Flood Fill)**: Implementación iterativa basada en pila (evitando recursión profunda para no reventar la pila de llamadas en imágenes grandes), con soporte de tolerancia y respeto al canal alfa.
- **Modos de color**:
  - `Blend`: Aplica composición estándar (`source-over`).
  - `Replace`: Reemplaza directamente los bytes RGBA en el búfer de píxeles (`ImageData`) o con composición `copy`.

### 4. Selección y Hormigas Marchantes
- Herramienta de selección rectangular con borde animado (*marching ants*) mediante `lineDashOffset` en un bucle `requestAnimationFrame`.
- Cortar, copiar, mover y pegar con capas flotantes temporales que se aplican automáticamente al cambiar de herramienta o presionar `Escape`.
- Soporte para pegar imágenes directamente desde el portapapeles del sistema operativo (`Ctrl+V` / `Cmd+V`).

### 5. Diálogos clásicos integrados
- **Nuevo lienzo**: Dimensiones personalizadas.
- **Tamaño del lienzo**: Expansión o recorte eligiendo el punto de anclaje en una matriz de 3x3.
- **Estirar / Escalar**: Redimensionar la imagen completa eligiendo entre interpolación por vecino más cercano (*Nearest Neighbour*) o bilineal.
- **Insertar Texto**: Permite escribir texto, elegir fuente, tamaño, negrita/cursiva y estamparlo en la imagen.
- **Configuración de Grilla**: Cambiar colores y tamaño de la cuadrícula de transparencia.

### 6. Idiomas (i18n)
Detección automática del idioma del sistema/navegador entre **Español** e **Inglés**, con selector manual en la barra de menú superior y diccionarios JSON desacoplados.

---

## 📄 Licencia

MIT. Siéntete libre de clonarlo, romperlo, mejorarlo o usarlo como base para tus propias herramientas retro.
