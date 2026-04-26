pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

const views = { home: document.getElementById('home-view'), reader: document.getElementById('reader-view') };
const elements = {
    fileInput: document.getElementById('file-input'),
    pdfContainer: document.getElementById('pdf-container'),
    recentList: document.getElementById('recent-list'),
    btnClose: document.getElementById('btn-close'),
    btnSettingsList: document.querySelectorAll('.btn-settings'),
    settingsPanel: document.getElementById('settings-panel'),
    themeBtns: document.querySelectorAll('#theme-toggles .toggle-btn'),
    filterBtns: document.querySelectorAll('#filter-toggles .toggle-btn'),
    btnZoomIn: document.getElementById('btn-zoom-in'),
    btnZoomOut: document.getElementById('btn-zoom-out'),
    zoomText: document.getElementById('zoom-text'),
    pageNum: document.getElementById('page-num'),
    pageCount: document.getElementById('page-count')
};

const savedTheme = localStorage.getItem('dp-theme') || 'theme-dark';
const savedFilter = localStorage.getItem('dp-filter') || 'filter-default';
document.body.className = `${savedTheme} ${savedFilter}`;

let currentPdfDoc = null;
let currentScale = 1.0;
let isFitToWidth = true;
let renderToken = 0;

const observerOptions = { root: null, rootMargin: '0px', threshold: 0.5 };
const pageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const pageId = entry.target.id.split('-')[1];
            elements.pageNum.textContent = pageId;
        }
    });
}, observerOptions);

function updateSettingsUI() {
    elements.themeBtns.forEach(btn => btn.classList.toggle('is-active', btn.dataset.themeVal === document.body.classList[0]));
    elements.filterBtns.forEach(btn => btn.classList.toggle('is-active', btn.dataset.filterVal === document.body.classList[1]));
}
updateSettingsUI();

elements.btnSettingsList.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.settingsPanel.classList.toggle('is-open');
    });
});

document.addEventListener('click', (e) => {
    let clickedSettings = false;
    elements.btnSettingsList.forEach(btn => { if (btn.contains(e.target)) clickedSettings = true; });
    if (!elements.settingsPanel.contains(e.target) && !clickedSettings) {
        elements.settingsPanel.classList.remove('is-open');
    }
});

elements.themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        document.body.className = `${btn.dataset.themeVal} ${document.body.classList[1]}`;
        localStorage.setItem('dp-theme', btn.dataset.themeVal);
        updateSettingsUI();
    });
});

elements.filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        document.body.className = `${document.body.classList[0]} ${btn.dataset.filterVal}`;
        localStorage.setItem('dp-filter', btn.dataset.filterVal);
        updateSettingsUI();
    });
});

elements.btnZoomIn.addEventListener('click', () => { isFitToWidth = false; currentScale = Math.min(3.0, currentScale + 0.25); renderPages(); });
elements.btnZoomOut.addEventListener('click', () => { isFitToWidth = false; currentScale = Math.max(0.5, currentScale - 0.25); renderPages(); });
elements.zoomText.addEventListener('click', () => { isFitToWidth = true; renderPages(); });

function updateZoomUI() { elements.zoomText.textContent = isFitToWidth ? 'Fit' : `${Math.round(currentScale * 100)}%`; }

function setView(viewName) {
    Object.values(views).forEach(v => v.classList.remove('is-active'));
    views[viewName].classList.add('is-active');
    if (viewName === 'home') {
        elements.pdfContainer.innerHTML = ''; 
        elements.fileInput.value = ''; 
        currentPdfDoc = null;
        renderToken++;
        updateRecentFilesList(); 
    }
}

elements.btnClose.addEventListener('click', () => setView('home'));

let db;
const request = indexedDB.open("DocumentStore", 1);
request.onupgradeneeded = (e) => { db = e.target.result; if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'name' }); };
request.onsuccess = (e) => { db = e.target.result; updateRecentFilesList(); };

elements.fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') { this.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (event) => {
        const arrayBuffer = event.target.result;
        const safeName = file.name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        saveFileToDB(safeName, arrayBuffer);
        loadDocument(arrayBuffer);
    };
    reader.readAsArrayBuffer(file);
});

function saveFileToDB(fileName, arrayBuffer) {
    const tx = db.transaction(['files'], 'readwrite');
    tx.objectStore('files').put({ name: fileName, data: arrayBuffer, timestamp: Date.now() });
    tx.oncomplete = updateRecentFilesList;
}

function deleteFileFromDB(fileName) {
    const tx = db.transaction(['files'], 'readwrite');
    tx.objectStore('files').delete(fileName);
    tx.oncomplete = updateRecentFilesList;
}

function updateRecentFilesList() {
    const tx = db.transaction(['files'], 'readonly');
    const req = tx.objectStore('files').getAll();
    req.onsuccess = () => {
        const files = req.result.sort((a, b) => b.timestamp - a.timestamp);
        if (files.length > 10) {
            const deleteTx = db.transaction(['files'], 'readwrite');
            for (let i = 10; i < files.length; i++) deleteTx.objectStore('files').delete(files[i].name);
        }
        if (files.length === 0) { elements.recentList.innerHTML = '<div class="empty-state">No files opened recently.</div>'; return; }
        elements.recentList.innerHTML = '';
        files.slice(0, 10).forEach(file => {
            const date = new Date(file.timestamp);
            const dateStr = date.toDateString() === new Date().toDateString() ? date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div class="list-item-title" title="${file.name}">
                    <svg class="list-item-icon" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                    ${file.name}
                </div>
                <div class="list-item-meta-container">
                    <div class="list-item-meta">${dateStr}</div>
                    <button class="delete-btn" title="Remove file"><svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>
                </div>`;
            item.addEventListener('click', (e) => {
                if (e.target.closest('.delete-btn')) return deleteFileFromDB(file.name);
                const getReq = db.transaction(['files'], 'readonly').objectStore('files').get(file.name);
                getReq.onsuccess = () => { if (getReq.result) { saveFileToDB(file.name, getReq.result.data); loadDocument(getReq.result.data); } };
            });
            elements.recentList.appendChild(item);
        });
    };
}

function loadDocument(arrayBuffer) {
    setView('reader');
    elements.pdfContainer.innerHTML = `<div class="skeleton-page"></div><div class="skeleton-page" style="opacity: 0.5;"></div>`;

    pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise.then(pdf => {
        currentPdfDoc = pdf;
        isFitToWidth = true;
        elements.pageCount.textContent = pdf.numPages;
        elements.pageNum.textContent = '1';
        
        elements.pdfContainer.innerHTML = ''; 
        for (let i = 1; i <= pdf.numPages; i++) {
            const wrapper = document.createElement('div');
            wrapper.className = 'pdf-page-wrapper';
            wrapper.id = `page-${i}`;
            elements.pdfContainer.appendChild(wrapper);
            pageObserver.observe(wrapper);
        }
        renderPages();
    }).catch(error => elements.pdfContainer.innerHTML = `<div class="empty-state">Failed to render document.</div>`);
}

function renderPages() {
    if (!currentPdfDoc) return;
    const currentToken = ++renderToken;
    const availableWidth = window.innerWidth - 64; 

    for (let pageNum = 1; pageNum <= currentPdfDoc.numPages; pageNum++) {
        currentPdfDoc.getPage(pageNum).then(page => {
            if (currentToken !== renderToken) return;

            const unscaledViewport = page.getViewport({ scale: 1.0 });
            if (isFitToWidth && pageNum === 1) {
                currentScale = Math.min(2.0, availableWidth / unscaledViewport.width);
                updateZoomUI();
            }

            const viewport = page.getViewport({ scale: currentScale });
            const outputScale = Math.max(2, window.devicePixelRatio || 1); 

            const wrapper = document.getElementById(`page-${pageNum}`);
            if (!wrapper) return;

            wrapper.style.width = Math.floor(viewport.width) + 'px';
            wrapper.style.height = Math.floor(viewport.height) + 'px';

            const primaryCanvas = wrapper.querySelector('canvas:not(.incoming-canvas)');
            if (primaryCanvas) {
                primaryCanvas.style.width = Math.floor(viewport.width) + 'px';
                primaryCanvas.style.height = Math.floor(viewport.height) + 'px';
            }
            const primaryTextLayer = wrapper.querySelector('.textLayer:not(.incoming-text)');
            if (primaryTextLayer) primaryTextLayer.style.setProperty('--scale-factor', viewport.scale);

            wrapper.querySelectorAll('.incoming-canvas, .incoming-text').forEach(el => el.remove());

            const canvas = document.createElement('canvas');
            canvas.className = 'incoming-canvas';
            const context = canvas.getContext('2d');
            canvas.width = Math.floor(viewport.width * outputScale);
            canvas.height = Math.floor(viewport.height * outputScale);
            canvas.style.width = Math.floor(viewport.width) + 'px';
            canvas.style.height = Math.floor(viewport.height) + 'px';
            canvas.style.position = 'absolute'; 
            canvas.style.top = '0'; canvas.style.left = '0';
            wrapper.appendChild(canvas);

            page.render({
                canvasContext: context,
                transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null,
                viewport: viewport,
                intent: 'print' 
            }).promise.then(() => {
                if (currentToken !== renderToken) return;
                if (primaryCanvas) primaryCanvas.remove();
                canvas.classList.remove('incoming-canvas');
                canvas.style.position = 'relative';
                return page.getTextContent();
            }).then(textContent => {
                if (currentToken !== renderToken || !textContent) return;
                if (primaryTextLayer) primaryTextLayer.remove();

                const textLayerDiv = document.createElement('div');
                textLayerDiv.className = 'textLayer';
                textLayerDiv.style.setProperty('--scale-factor', viewport.scale);
                wrapper.appendChild(textLayerDiv);

                pdfjsLib.renderTextLayer({
                    textContentSource: textContent,
                    container: textLayerDiv,
                    viewport: viewport,
                    textDivs: []
                });
            });
        });
    }
}