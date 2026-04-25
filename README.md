# DarkPDF

A privacy-first, zero-server local PDF reader built as a single static file. Designed with a strict, utility-first design system, DarkPDF allows you to read heavy documents, syllabi, and research papers in high-resolution dark mode entirely within your browser.

**Live Environment:** [https://anaconda2401.github.io/darkpdf/](https://anaconda2401.github.io/darkpdf/)

## Features

* **Privacy by Design:** No backend, no telemetry, and no external tracking. Your files never leave your device.
* **Local Storage (IndexedDB):** Remembers your recently opened files instantly without requiring a local web server or configuration files.
* **Smart Dark Mode:** Uses CSS inversion and hue-rotation to flip black/white text while preserving colors in charts and images. Includes a quick toggle to snap back to light mode for complex data visualizations.
* **High-DPI Rendering:** Automatically scales canvas internal resolution to match your device pixel ratio, ensuring crystal-clear text on modern screens.
* **Text Selection:** Generates a hidden text layer perfectly mapped over the PDF canvas, allowing you to highlight, select, and copy text naturally.
* **Secure Environment:** Implements a strict Content Security Policy (CSP) and sanitizes inputs to prevent XSS and malicious file execution.
* **System-Aware Favicon:** Uses an inline SVG favicon that adapts to the user's OS-level light/dark mode preferences.

## Usage

Because DarkPDF is completely static, you have two ways to use it:

**Option 1: Live Web App (Recommended)**
1. Navigate to [DarkPDF](https://anaconda2401.github.io/darkpdf/).
2. Select a PDF from your local machine to start reading securely in the browser.

**Option 2: Local File**
1. Clone this repository or download the `index.html` file.
2. Double-click the file to open it in any modern browser (Chrome, Edge, Brave, Firefox).

## License

Open-source under the MIT License.
