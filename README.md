# Shadow Reader Workspace

A privacy-first, zero-server local PDF reader built as a single static file. Designed with a strict, utility-first design system, Shadow Reader allows you to read heavy documents, syllabi, and research papers in high-resolution dark mode entirely within your browser.

## Features

* **Privacy by Design:** No backend, no telemetry, and no external tracking. Your files never leave your device.
* **Local Storage (IndexedDB):** Remembers your recently opened files instantly without requiring a local web server or configuration files.
* **Smart Dark Mode:** Uses CSS inversion and hue-rotation to flip black/white text while preserving colors in charts and images. Includes a quick toggle to snap back to light mode for complex data visualizations.
* **High-DPI Rendering:** Automatically scales canvas internal resolution to match your device pixel ratio, ensuring crystal-clear text on modern screens.
* **Text Selection:** Generates a hidden text layer perfectly mapped over the PDF canvas, allowing you to highlight, select, and copy text naturally.
* **Secure Environment:** Implements a strict Content Security Policy (CSP) and sanitizes inputs to prevent XSS and malicious file execution.
* **System-Aware Favicon:** Uses an inline SVG favicon that adapts to the user's OS-level light/dark mode preferences.

## Usage

Because Shadow Reader is completely static, you have two ways to use it:

**Option 1: Local File**
1. Download `index.html`.
2. Double-click the file to open it in any modern browser (Chrome, Edge, Brave, Firefox).
3. Select a PDF to start reading.

**Option 2: GitHub Pages (Recommended)**
1. Fork or clone this repository.
2. Enable GitHub Pages in your repository settings (deploying from the `main` branch).
3. Access your reader from anywhere. Since it runs 100% client-side, it is completely safe to host publicly.

## License

Open-source under the MIT License.
