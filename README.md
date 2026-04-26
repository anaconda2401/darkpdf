# DarkPDF

DarkPDF is a privacy-focused, client-side PDF reader designed for clean, distraction-free reading with high-quality dark mode rendering. The application runs entirely in the browser with no server interaction, ensuring that all documents remain local to the user.



## Overview

DarkPDF provides a minimal and efficient interface for viewing PDF documents with enhanced readability. It leverages browser-native capabilities and PDF.js to deliver smooth rendering, persistent local storage, and customizable viewing modes.



## Features

- Dark mode rendering using optimized canvas filters
- Multiple reading filters (Default, Sepia, Peach, Soft)
- Local file handling with no uploads or external processing
- Recent files stored using IndexedDB
- Smooth zoom controls with fit-to-width support
- Automatic page tracking during scroll
- Lightweight and fast rendering via PDF.js
- Fully client-side with no data collection



## Project Structure

```
DarkPDF/
│
├── index.html     # Application structure and UI layout
├── style.css      # Styling system and theme configuration
├── app.js         # Core logic and PDF rendering engine
└── README.md
```



## Getting Started

### Clone the Repository

```bash
git clone https://github.com/anaconda2401/darkpdf.git
cd darkpdf
```

### Run the Application

Open `index.html` in any modern browser.



## Technology Stack

- HTML5
- CSS3 (Custom Properties)
- Vanilla JavaScript
- PDF.js (via CDN)



## Design Principles

- Fully client-side execution
- Minimal and consistent interface
- Privacy-first approach
- Performance-focused rendering



## Future Enhancements

- Bookmarks
- Annotations and highlights
- Search within PDFs
- Table of contents navigation
- Mobile optimization



## License

MIT License
