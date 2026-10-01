# Guía para Agentes de IA en GMPaint

Este documento sirve como referencia rápida de contexto, arquitectura y reglas para futuras sesiones de agentes de IA trabajando en este repositorio.

---

## 1. Visión General del Proyecto

**GMPaint** es una recreación moderna pero fiel en espíritu del clásico editor de sprites de **GameMaker 8**. Está pensado como una herramienta ligera de pixel art y edición rápida de imágenes PNG.

- **Frontend**: Vanilla TypeScript + HTML5 Canvas API (sin frameworks como React, Vue o Angular; manipulación directa de DOM y Canvas para máximo rendimiento y simplicidad).
- **Bundler**: Vite.
- **Desktop Wrapper**: Tauri v2 (Rust).
- **Estilos**: CSS Vanilla moderno con variables temáticas CSS (`src/styles/theme.css` y `src/styles/layout.css`).

---

## 2. Reglas del Usuario y Convenciones de Código

1. **Mensajes de commit**: **SIEMPRE en español** (ejemplo: `feat: agregar herramienta de selección circular`, `fix: corregir cálculo de coordenadas con zoom`).
2. **Estilo de código**:
   - Código lineal de arriba a abajo, claro y fácil de leer.
   - Extraer helpers/servicios reutilizables para tareas repetitivas (ej. diálogos modales, operaciones de píxeles, alertas) en lugar de duplicar lógica.
   - Usar `async` / `await` en lugar de `.then()` / `.catch()`.
   - No llenar el código de comentarios obvios línea por línea. Usar JSDoc únicamente para funciones largas, complejas o algoritmos de negocio (Bresenham, flood fill, matrices de anclaje, etc.).
3. **Comandos shell**:
   - **NUNCA usar comandos `cd`**. Usar el parámetro `Cwd` de la herramienta.

---

## 3. Estructura del Código

```text
gmpaint/
├── src/
│   ├── core/                      # Lógica principal del motor gráfico y estado
│   │   ├── CanvasEngine.ts        # Lienzo virtual offscreen + viewport interactivo (pan/zoom)
│   │   ├── ColorManager.ts        # Pinceles izquierdo/derecho, opacidad (0-255), Blend vs Replace
│   │   ├── HistoryManager.ts      # Deshacer / Rehacer (pila de ImageData)
│   │   ├── PixelOps.ts            # Bresenham, Flood Fill (iterativo), dibujo de primitivas
│   │   ├── SelectionManager.ts    # Selección rectangular, flotante, mover, hormigas marchantes
│   │   └── ClipboardManager.ts    # Copiar/pegar interno y con el Clipboard API del navegador/sistema
│   ├── dialogs/                   # Modales de interfaz estilo clásico
│   │   ├── CanvasSizeDialog.ts    # Redimensión con matriz de anclaje 3x3
│   │   ├── GridSettingsDialog.ts  # Configuración de tamaño y colores de grilla de transparencia
│   │   ├── NewImageDialog.ts      # Creación de nuevo lienzo (ancho/alto)
│   │   ├── StretchDialog.ts       # Escalado (Nearest Neighbor o Bilinear)
│   │   └── TextDialog.ts          # Inserción de texto rasterizado
│   ├── i18n/                      # Sistema de localización
│   │   ├── i18n.ts                # Gestor i18n reactivo con auto-detección y eventos
│   │   └── locales/
│   │       ├── en.json            # Textos en inglés
│   │       └── es.json            # Textos en español
│   ├── styles/
│   │   ├── layout.css             # Disposición flexible en pantalla completa
│   │   └── theme.css              # Variables de colores (paleta retro inspirada en GM8)
│   ├── ui/
│   │   ├── ColorPalette.ts        # Selector visual de colores primario/secundario y opacidad
│   │   ├── MenuBar.ts             # Barra de menú superior (Archivo, Edición, Imagen, Opciones, Idioma)
│   │   ├── StatusBar.ts           # Barra inferior (coordenadas del mouse, zoom, tamaño de imagen)
│   │   └── ToolBar.ts             # Barra lateral de herramientas
│   └── main.ts                    # Punto de entrada y enlace de componentes
├── src-tauri/                     # Empaquetado nativo con Tauri v2
│   ├── src/                       # Código Rust del backend Tauri
│   ├── Cargo.toml                 # Dependencias del backend nativo
│   └── tauri.conf.json            # Configuración de ventana, empaquetado y bundles
├── package.json
└── tsconfig.json
```

---

## 4. Detalles de Implementación Críticos

### A. Lienzo Dual (Offscreen vs Viewport)
`CanvasEngine` mantiene dos lienzos:
1. **Lienzo virtual (`offscreenCanvas`)**: Representa la imagen real a resolución 1:1 en píxeles. Todas las operaciones de edición se dibujan aquí.
2. **Lienzo visible (`viewportCanvas`)**: Escucha eventos del mouse/rueda, dibuja la cuadrícula de fondo, traslada y escala la imagen según el `zoom` y `panOffset`, y renderiza la capa de selección activa (`SelectionManager`). `imageSmoothingEnabled` siempre está en `false` para preservar el pixel art nítido.

### B. Cuadrícula de Transparencia Independiente del Zoom
A diferencia de editores donde hacer zoom agranda la cuadrícula de ajedrez hasta tapar los píxeles, aquí la cuadrícula se renderiza en **espacio de pantalla** (screen pixels) usando un `CanvasPattern`. Al hacer zoom a 16x o 32x, los cuadros de transparencia mantienen su tamaño constante en pantalla.
Los colores y tamaño se configuran desde `GridSettingsDialog` y se persisten en `localStorage` con la clave `gmpaint_grid_settings`.

### C. Modos de Color: Blend vs Replace
- **Blend**: Composición alfa normal (`source-over`), mezclando el nuevo color con los píxeles existentes según su canal alfa.
- **Replace**: Sobrescribe el valor RGBA exacto (incluyendo el alfa) de forma destructiva (`copy` en canvas o asignación directa de canal en buffers `Uint8ClampedArray`).

### D. Selección y Marching Ants
`SelectionManager` maneja la selección rectangular con borde punteado animado (`lineDashOffset`). Si el usuario selecciona y arrastra, la selección se convierte en flotante (`floatingCanvas`). Cuando se cambia de herramienta o se deselecciona (`Escape`), la selección se aplica automáticamente al lienzo base (`commitFloatingSelection`).

### E. Soporte de Localización (i18n)
`I18nService` (`src/i18n/i18n.ts`) detecta el idioma del navegador del usuario (`navigator.language`) y carga `es` o `en`. Permite cambiar dinámicamente de idioma disparando un evento `change` que actualiza los títulos, botones y diálogos sin necesidad de recargar la página.

---

## 5. Comandos de Desarrollo y Compilación

- `npm run dev`: Inicia el servidor de desarrollo web con Vite en `http://localhost:5173/`.
- `npm run build`: Valida TypeScript con `tsc` y compila la versión web a `dist/` (con `base: './'`).
- `npm run deploy`: Compila y despliega manualmente la carpeta `dist/` a la rama `gh-pages` con el paquete `gh-pages`.
- `npm run tauri:dev`: Lanza la aplicación nativa en ventana de escritorio con recarga en vivo (requiere tener Rust en PATH: `source "$HOME/.cargo/env"`).
- `npm run tauri:build`: Compila y genera el empaquetado nativo (ej. `.app` y `.dmg` en macOS en `src-tauri/target/release/bundle/`).

### Despliegue Continuo (CI/CD)
El archivo `.github/workflows/deploy.yml` ejecuta automáticamente el build y despliegue a la rama `gh-pages` con `JamesIves/github-pages-deploy-action@v4` en cada `push` a la rama `main`.
