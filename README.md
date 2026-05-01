# DarkPDF

> A privacy-first, zero-server PDF reader with high-quality dark mode rendering — built entirely in the browser.

DarkPDF is a lightweight, client-side PDF reader that runs entirely in your browser. No file uploads, no servers, no tracking. Your documents stay on your device.

---

## Features

- **Dark Mode Rendering** — Inverts and colour-shifts PDF pages using optimised CSS canvas filters for comfortable low-light reading
- **Reading Filters** — Four built-in filters: Default, Sepia, Peach, and Soft
- **Light / Dark Theme** — Full UI theming with smooth transitions, persisted via `localStorage`
- **Drag & Drop** — Drop a PDF directly onto the upload card to open it instantly
- **Recent Files** — Up to 10 recently opened files stored locally using IndexedDB, with timestamps and one-click re-open
- **Lazy Rendering** — Pages are rendered on demand using `IntersectionObserver`, keeping memory usage low for large documents
- **Page Cleanup** — Off-screen canvases are destroyed and recreated on scroll to reclaim GPU memory
- **Smooth Zoom** — `+` / `−` buttons and `Ctrl + Scroll` zoom with scroll-position preservation; click the zoom label to snap back to Fit-to-Width
- **Fit to Width** — Automatically scales each document to fill the available viewport width
- **Live Page Tracking** — Current page updates in real time as you scroll
- **High-Resolution Rendering** — Uses `devicePixelRatio` (up to 2×) for sharp text and crisp graphics on HiDPI displays
- **Text Layer** — Selectable, copy-able text rendered over each page using PDF.js's text layer
- **Fully Offline** — Works without an internet connection once the page is loaded (PDF.js is served via CDN on first load)

---

## Project Structure

```
darkpdf/
├── index.html     # Application markup, layout, and inline SVG icons
├── style.css      # Design system — CSS custom properties, themes, filters, and all component styles
├── app.js         # Core logic — PDF loading, rendering pipeline, zoom, IndexedDB, drag & drop
└── README.md
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/anaconda2401/darkpdf.git
cd darkpdf
```

### 2. Open in your browser

```bash
# macOS / Linux
open index.html

# Windows
start index.html
```

Or just double-click `index.html` — no build step, no dependencies to install.

---

## How It Works

### PDF Rendering Pipeline

1. **File input** — User selects a file via the upload card (click or drag & drop).
2. **IndexedDB storage** — The raw `ArrayBuffer` is saved to an IndexedDB store (`DocumentStore`) keyed by filename with a timestamp.
3. **Scaffolding** — PDF.js reads the document, calculates the natural viewport from page 1, and creates a placeholder `div` for every page with exact pixel dimensions.
4. **Intersection-based rendering** — A `renderObserver` fires `renderPage()` for any page wrapper entering a 50%-expanded viewport margin, and `cleanupPage()` for wrappers leaving it.
5. **Canvas + text layer** — Each page is drawn onto a `<canvas>` at `devicePixelRatio` resolution. A PDF.js text layer is overlaid for text selection.
6. **Token-based invalidation** — A `renderToken` integer is incremented on every zoom or document change. In-flight renders that detect a stale token are discarded, preventing flickering.

### Dark Mode Rendering

PDF pages are rendered as standard white-background canvases. Dark mode is applied entirely through CSS `filter` chains on `.pdf-page-wrapper`:

| Filter | CSS Applied |
|---|---|
| Default | `invert(100%) hue-rotate(180deg) contrast(90%) brightness(95%)` |
| Soft | `invert(90%) hue-rotate(180deg) contrast(85%) brightness(105%)` |
| Sepia | `invert(90%) hue-rotate(180deg) sepia(50%) contrast(85%) brightness(100%)` |
| Peach | `invert(90%) hue-rotate(180deg) sepia(50%) saturate(200%) contrast(85%)` |

Light mode filter overlays (Sepia, Peach, Soft) use a `::after` pseudo-element with `mix-blend-mode: multiply`.

### Zoom System

- **Fit to Width** — `currentScale` is computed as `min(2.0, availableWidth / defaultViewport.width)`.
- **Manual zoom** — Steps of `0.25` with a range of `0.5×` – `4.0×`.
- **Ctrl + Scroll** — Continuous zoom at `0.01` per `deltaY` unit with a 200 ms debounce before re-rendering.
- **Scroll preservation** — When scale changes, `window.scrollY` is adjusted by the scale ratio to keep the reading position centered.

### Recent Files

Recent files are persisted in IndexedDB under the key `name`. On each open, the file's `timestamp` is updated. The list is capped at 10 entries — older entries are automatically removed. Files can be manually removed with the `×` button on each list item.

---

## Technology Stack

| Technology | Role |
|---|---|
| HTML5 | Markup, semantic structure |
| CSS3 (Custom Properties) | Design system, theming, filter effects |
| Vanilla JavaScript (ES2020) | Core application logic |
| [PDF.js 3.4.120](https://mozilla.github.io/pdf.js/) | PDF parsing, canvas rendering, text layer |
| IndexedDB | Local persistent storage for recent files |
| IntersectionObserver | Lazy render and page-cleanup triggers |

---

## Design Principles

- **Zero server interaction** — Files never leave the browser; no analytics, no telemetry.
- **Minimal footprint** — Three files, one CDN dependency. No framework, no build tool.
- **Privacy by default** — All data is stored in the user's own browser storage.
- **Performance-conscious rendering** — Lazy page rendering and canvas cleanup prevent memory growth on large documents.

---

## Browser Compatibility

Requires a modern browser with support for:

- [IndexedDB](https://caniuse.com/indexeddb)
- [IntersectionObserver](https://caniuse.com/intersectionobserver)
- [FileReader API](https://caniuse.com/filereader)
- [Canvas 2D](https://caniuse.com/canvas)

Tested in Chrome, Firefox, Edge, and Safari (latest versions).

---

## Planned Enhancements

- [ ] Bookmarks
- [ ] Text search within documents
- [ ] Annotations and highlights
- [ ] Table of contents / outline navigation
- [ ] Keyboard shortcuts
- [ ] Mobile layout optimisation

---

## License

[MIT](https://opensource.org/licenses/MIT)
