pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const views = { home: document.getElementById('home-view'), reader: document.getElementById('reader-view') };
const elements = {
    uploadCard: document.querySelector('.upload-card'),
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
let defaultViewport = null; 

const renderedPages = new Set();
const renderingQueue = new Set();
const renderTasks = new Map();

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const pageId = entry.target.id.split('-')[1];
            elements.pageNum.textContent = pageId;
        }
    });
}, { root: null, rootMargin: '0px', threshold: 0.5 });

const renderObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const pageNum = parseInt(entry.target.id.split('-')[1]);
        if (entry.isIntersecting) {
            renderPage(pageNum);
        } else {
            cleanupPage(pageNum);
        }
    });
}, { root: null, rootMargin: '10% 0px 10% 0px', threshold: 0 });

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
        
        if (currentPdfDoc) {
            renderToken++; 
            renderedPages.clear();
            renderingQueue.clear();
            renderTasks.forEach(task => { try { task.cancel(); } catch(e){} });
            renderTasks.clear();
            for (let i = 1; i <= currentPdfDoc.numPages; i++) {
                const wrapper = document.getElementById(`page-${i}`);
                if (wrapper) {
                    renderObserver.unobserve(wrapper);
                    renderObserver.observe(wrapper);
                }
            }
        }
    });
});

elements.filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        document.body.className = `${document.body.classList[0]} ${btn.dataset.filterVal}`;
        localStorage.setItem('dp-filter', btn.dataset.filterVal);
        updateSettingsUI();
    });
});

// --- ZOOM CONTROLS ---

function updateZoomUI() { elements.zoomText.textContent = isFitToWidth ? 'Fit' : `${Math.round(currentScale * 100)}%`; }

elements.btnZoomIn.addEventListener('click', () => { 
    isFitToWidth = false; 
    applyZoom(Math.min(4.0, currentScale + 0.25)); 
});
elements.btnZoomOut.addEventListener('click', () => { 
    isFitToWidth = false; 
    applyZoom(Math.max(0.5, currentScale - 0.25)); 
});
elements.zoomText.addEventListener('click', () => { 
    isFitToWidth = true; 
    applyZoom(null); 
});

let zoomTimeout;
window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        e.preventDefault(); 
        if (!currentPdfDoc || !defaultViewport) return;

        isFitToWidth = false;
        
        const zoomSensitivity = 0.01;
        const newScale = Math.min(4.0, Math.max(0.5, currentScale - (e.deltaY * zoomSensitivity)));
        
        const scaleRatio = newScale / currentScale;
        const scrollCenter = window.scrollY + (window.innerHeight / 2);
        const newScrollCenter = scrollCenter * scaleRatio;
        
        currentScale = newScale;
        updateZoomUI();

        for (let i = 1; i <= currentPdfDoc.numPages; i++) {
            const wrapper = document.getElementById(`page-${i}`);
            if (wrapper) {
                wrapper.style.width = `${Math.floor(defaultViewport.width * currentScale)}px`;
                wrapper.style.height = `${Math.floor(defaultViewport.height * currentScale)}px`;
                const oldCanvas = wrapper.querySelector('canvas');
                if (oldCanvas) {
                    oldCanvas.style.width = '100%';
                    oldCanvas.style.height = '100%';
                }
            }
        }

        window.scrollTo(0, newScrollCenter - (window.innerHeight / 2));

        clearTimeout(zoomTimeout);

        zoomTimeout = setTimeout(() => {
            renderToken++; 
            renderedPages.clear();
            renderingQueue.clear();
            renderTasks.forEach(task => { try { task.cancel(); } catch(e){} });
            renderTasks.clear();
            
            for (let i = 1; i <= currentPdfDoc.numPages; i++) {
                const wrapper = document.getElementById(`page-${i}`);
                if (wrapper) {
                    renderObserver.unobserve(wrapper);
                    renderObserver.observe(wrapper);
                }
            }
        }, 200);
    }
}, { passive: false });

function applyZoom(targetScale) {
    if (!currentPdfDoc || !defaultViewport) return;
    renderToken++; 
    renderedPages.clear();
    renderingQueue.clear();
    renderTasks.forEach(task => { try { task.cancel(); } catch(e){} });
    renderTasks.clear();

    const prevScale = currentScale;
    const availableWidth = window.innerWidth - 64;
    
    if (isFitToWidth || targetScale === null) {
        currentScale = Math.min(2.0, availableWidth / defaultViewport.width);
    } else {
        currentScale = targetScale;
    }
    
    const scaleRatio = currentScale / prevScale;
    const scrollCenter = window.scrollY + (window.innerHeight / 2);
    const newScrollCenter = scrollCenter * scaleRatio;

    updateZoomUI();

    for (let i = 1; i <= currentPdfDoc.numPages; i++) {
        const wrapper = document.getElementById(`page-${i}`);
        if (wrapper) {
            const oldCanvas = wrapper.querySelector('canvas');
            if (oldCanvas) {
                oldCanvas.style.width = '100%';
                oldCanvas.style.height = '100%';
            }
            wrapper.style.width = `${Math.floor(defaultViewport.width * currentScale)}px`;
            wrapper.style.height = `${Math.floor(defaultViewport.height * currentScale)}px`;
            
            renderObserver.unobserve(wrapper);
            renderObserver.observe(wrapper);
        }
    }
    
    window.scrollTo(0, newScrollCenter - (window.innerHeight / 2));
}

function setView(viewName) {
    Object.values(views).forEach(v => v.classList.remove('is-active'));
    views[viewName].classList.add('is-active');
    if (viewName === 'home') {
        elements.pdfContainer.innerHTML = ''; 
        elements.fileInput.value = ''; 
        currentPdfDoc = null;
        renderToken++;
        renderedPages.clear();
        renderingQueue.clear();
        renderTasks.forEach(task => { try { task.cancel(); } catch(e){} });
        renderTasks.clear();
        updateRecentFilesList(); 
    }
}

elements.btnClose.addEventListener('click', () => setView('home'));

// --- DATABASE & FILE HANDLING ---

let db;
const request = indexedDB.open("DocumentStore", 1);
request.onupgradeneeded = (e) => { db = e.target.result; if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'name' }); };
request.onsuccess = (e) => { db = e.target.result; updateRecentFilesList(); };

// Core function to process the file whether clicked or dragged
function handleFileSelection(file) {
    if (!file || file.type !== 'application/pdf') { 
        elements.fileInput.value = ''; 
        return; 
    }
    const reader = new FileReader();
    reader.onload = (event) => {
        const arrayBuffer = event.target.result;
        const safeName = file.name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        if (arrayBuffer.byteLength > 30 * 1024 * 1024) {
            alert('File is larger than 30MB. It will be opened but not saved to Recent Files to preserve storage quota.');
        } else {
            saveFileToDB(safeName, arrayBuffer);
        }
        
        loadDocument(arrayBuffer);
    };
    reader.readAsArrayBuffer(file);
}

// Event 1: Standard click-to-upload
elements.fileInput.addEventListener('change', (e) => handleFileSelection(e.target.files[0]));

// Event 2: Drag and Drop support
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    elements.uploadCard.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    }, false);
});

['dragenter', 'dragover'].forEach(eventName => {
    elements.uploadCard.addEventListener(eventName, () => elements.uploadCard.classList.add('is-dragover'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    elements.uploadCard.addEventListener(eventName, () => elements.uploadCard.classList.remove('is-dragover'), false);
});

elements.uploadCard.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    handleFileSelection(file);
}, false);


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

// --- PDF RENDERING CORE ---

function loadDocument(arrayBuffer, password = '') {
    setView('reader');
    elements.pdfContainer.innerHTML = `<div class="skeleton-page"></div><div class="skeleton-page" style="opacity: 0.5;"></div>`;
    renderedPages.clear();
    renderingQueue.clear();
    renderTasks.forEach(task => { try { task.cancel(); } catch(e){} });
    renderTasks.clear();

    pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer), password: password }).promise.then(pdf => {
        currentPdfDoc = pdf;
        isFitToWidth = true;
        elements.pageCount.textContent = pdf.numPages;
        elements.pageNum.textContent = '1';
        
        return pdf.getPage(1);
    }).then(page1 => {
        defaultViewport = page1.getViewport({ scale: 1.0 });
        setupScaffolding();
    }).catch(error => {
        if (error.name === 'PasswordException') {
            const promptMsg = error.code === 2 ? 'Incorrect password. Please try again:' : 'This PDF is password protected. Please enter the password:';
            const enteredPassword = prompt(promptMsg);
            if (enteredPassword !== null && enteredPassword.trim() !== '') {
                loadDocument(arrayBuffer, enteredPassword);
            } else {
                elements.pdfContainer.innerHTML = `<div class="empty-state">Document requires a password to open.</div>`;
            }
        } else {
            elements.pdfContainer.innerHTML = `<div class="empty-state">Failed to render document.</div>`;
        }
    });
}

function setupScaffolding() {
    elements.pdfContainer.innerHTML = ''; 
    const availableWidth = window.innerWidth - 64;
    
    if (isFitToWidth) {
        currentScale = Math.min(2.0, availableWidth / defaultViewport.width);
    }
    updateZoomUI();

    const scaledWidth = Math.floor(defaultViewport.width * currentScale);
    const scaledHeight = Math.floor(defaultViewport.height * currentScale);

    for (let i = 1; i <= currentPdfDoc.numPages; i++) {
        const wrapper = document.createElement('div');
        wrapper.className = 'pdf-page-wrapper';
        wrapper.id = `page-${i}`;
        wrapper.style.width = `${scaledWidth}px`;
        wrapper.style.height = `${scaledHeight}px`;
        
        elements.pdfContainer.appendChild(wrapper);
        counterObserver.observe(wrapper);
        renderObserver.observe(wrapper);
    }
}

function cleanupPage(pageNum) {
    if (renderTasks.has(pageNum)) {
        try { renderTasks.get(pageNum).cancel(); } catch (e) {}
        renderTasks.delete(pageNum);
        renderingQueue.delete(pageNum);
    }
    if (!renderedPages.has(pageNum)) return;
    const wrapper = document.getElementById(`page-${pageNum}`);
    if (wrapper) {
        wrapper.querySelectorAll('canvas').forEach(canvas => {
            canvas.width = 0;
            canvas.height = 0;
        });
        wrapper.innerHTML = ''; 
    }
    renderedPages.delete(pageNum);
}

function renderPage(pageNum) {
    if (!currentPdfDoc || renderedPages.has(pageNum) || renderingQueue.has(pageNum)) return;
    
    renderingQueue.add(pageNum);
    const currentToken = renderToken;

    currentPdfDoc.getPage(pageNum).then(page => {
        if (currentToken !== renderToken) {
            renderingQueue.delete(pageNum);
            return;
        }

        const viewport = page.getViewport({ scale: currentScale });
        const outputScale = Math.min(2, window.devicePixelRatio || 1);

        const wrapper = document.getElementById(`page-${pageNum}`);
        if (!wrapper) return;

        wrapper.style.width = Math.floor(viewport.width) + 'px';
        wrapper.style.height = Math.floor(viewport.height) + 'px';

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + 'px';
        canvas.style.height = Math.floor(viewport.height) + 'px';

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        const isDarkMode = document.body.classList.contains('theme-dark');
        const pageColors = isDarkMode ? { background: '#161616', foreground: '#d0d0d0' } : undefined;

        const renderTask = page.render({
            canvasContext: context,
            transform: transform,
            viewport: viewport,
            intent: 'print',
            pageColors: pageColors
        });
        
        renderTasks.set(pageNum, renderTask);

        renderTask.promise.then(() => {
            if (currentToken !== renderToken) return;
            
            wrapper.innerHTML = ''; 
            wrapper.appendChild(canvas);
            
            return page.getTextContent();
        }).then(textContent => {
            if (currentToken !== renderToken || !textContent) return;

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

            renderedPages.add(pageNum);
            renderingQueue.delete(pageNum);
            renderTasks.delete(pageNum);
        }).catch(err => {
            if (err.name !== 'RenderingCancelledException') {
                console.error('Render error:', err);
            }
            renderingQueue.delete(pageNum);
            renderTasks.delete(pageNum);
        });
    });
}