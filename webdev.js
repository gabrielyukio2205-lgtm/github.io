/**
 * Jade Web Dev - AI Vibe Coder
 * Supports HTML and React (Sandpack) modes
 */

(function () {
    'use strict';

    // API Configuration
    const PROXY_BASE_URL = 'https://jade-proxy.onrender.com';
    const API_URL = `${PROXY_BASE_URL}/webdev/generate`;

    // State
    let currentMode = 'html'; // 'html' or 'react'
    let currentCode = '';
    let currentFiles = {}; // For React mode
    let activeFile = 'App.tsx';
    let loadingInterval = null;

    // DOM Elements
    const promptInput = document.getElementById('promptInput');
    const generateBtn = document.getElementById('generateBtn');
    const previewFrame = document.getElementById('previewFrame');
    const emptyState = document.getElementById('emptyState');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const codeBtn = document.getElementById('codeBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const codeModal = document.getElementById('codeModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    const codeDisplay = document.getElementById('codeDisplay').querySelector('code');
    const refineSection = document.getElementById('refineSection');
    const refineInput = document.getElementById('refineInput');
    const refineBtn = document.getElementById('refineBtn');
    const themeBtn = document.getElementById('themeBtn');
    const htmlModeBtn = document.getElementById('htmlModeBtn');
    const reactModeBtn = document.getElementById('reactModeBtn');
    const modeDescription = document.getElementById('modeDescription');
    const modeIndicator = document.getElementById('modeIndicator');
    const fileExplorer = document.getElementById('fileExplorer');
    const fileList = document.getElementById('fileList');
    const modalTabs = document.getElementById('modalTabs');
    const sandpackContainer = document.getElementById('sandpackContainer');

    // Initialize
    function init() {
        loadTheme();
        setupEventListeners();
        updateModeUI();
    }

    function setupEventListeners() {
        generateBtn.addEventListener('click', generateSite);
        codeBtn.addEventListener('click', showCodeModal);
        closeModalBtn.addEventListener('click', hideCodeModal);
        copyCodeBtn.addEventListener('click', copyCode);
        downloadBtn.addEventListener('click', downloadCode);
        refreshBtn.addEventListener('click', refreshPreview);
        refineBtn.addEventListener('click', refineSite);
        themeBtn.addEventListener('click', toggleTheme);
        fullscreenBtn.addEventListener('click', openFullscreen);

        // Mode toggle
        htmlModeBtn.addEventListener('click', () => setMode('html'));
        reactModeBtn.addEventListener('click', () => setMode('react'));

        // Prompt hints
        document.querySelectorAll('.hint').forEach(hint => {
            hint.addEventListener('click', () => {
                promptInput.value = hint.dataset.prompt;
                promptInput.focus();
            });
        });

        // Template cards - use mode-specific prompts
        document.querySelectorAll('.template-card').forEach(card => {
            card.addEventListener('click', () => {
                const prompt = currentMode === 'react'
                    ? card.dataset.reactPrompt
                    : card.dataset.htmlPrompt;
                promptInput.value = prompt;
                generateSite();
            });
        });

        // Keyboard shortcuts
        promptInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                generateSite();
            }
        });

        refineInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') refineSite();
        });

        // Modal backdrop click
        codeModal.addEventListener('click', (e) => {
            if (e.target === codeModal || e.target.classList.contains('modal-backdrop')) {
                hideCodeModal();
            }
        });
    }

    function setMode(mode) {
        currentMode = mode;
        // Reset state when switching modes
        currentCode = '';
        currentFiles = {};
        updateModeUI();
        resetPreview();
    }

    function updateModeUI() {
        // Toggle buttons
        htmlModeBtn.classList.toggle('active', currentMode === 'html');
        reactModeBtn.classList.toggle('active', currentMode === 'react');

        // Update description
        if (currentMode === 'react') {
            modeDescription.textContent = 'Gere apps React com componentes e hooks';
            modeIndicator.textContent = 'React';
            modeIndicator.classList.add('react');
        } else {
            modeDescription.textContent = 'Gere código HTML + Tailwind CSS funcional';
            modeIndicator.textContent = 'HTML';
            modeIndicator.classList.remove('react');
        }

        // File explorer visibility
        fileExplorer.classList.toggle('hidden', currentMode !== 'react');
    }

    function resetPreview() {
        emptyState.classList.remove('hidden');
        previewFrame.classList.add('hidden');
        refineSection.classList.add('hidden');
        fileList.innerHTML = '';
    }

    async function generateSite() {
        const prompt = promptInput.value.trim();
        if (!prompt) {
            promptInput.focus();
            return;
        }

        showLoading();

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    mode: currentMode
                })
            });

            const data = await response.json();

            if (data.success) {
                if (data.mode === 'react' && data.files) {
                    currentFiles = data.files;
                    activeFile = 'App.tsx';
                    renderFileExplorer();
                    renderReactPreview();
                } else {
                    currentCode = data.code;
                    renderHtmlPreview(currentCode);
                }
                showPreview();
            } else {
                alert('Erro ao gerar: ' + (data.error || 'Tente novamente'));
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro de conexão.');
        } finally {
            hideLoading();
        }
    }

    async function refineSite() {
        const feedback = refineInput.value.trim();
        if (!feedback) return;

        if (currentMode === 'react' && Object.keys(currentFiles).length === 0) {
            alert('Gere um app primeiro!');
            return;
        }
        if (currentMode === 'html' && !currentCode) {
            alert('Gere um site primeiro!');
            return;
        }

        showLoading();

        try {
            const existingCode = currentMode === 'react'
                ? JSON.stringify(currentFiles, null, 2)
                : currentCode;

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: feedback,
                    existing_code: existingCode,
                    mode: currentMode
                })
            });

            const data = await response.json();

            if (data.success) {
                if (data.mode === 'react' && data.files) {
                    currentFiles = data.files;
                    renderFileExplorer();
                    renderReactPreview();
                } else {
                    currentCode = data.code;
                    renderHtmlPreview(currentCode);
                }
                refineInput.value = '';
            } else {
                alert('Erro ao refinar: ' + (data.error || 'Tente novamente'));
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro de conexão.');
        } finally {
            hideLoading();
        }
    }

    function renderFileExplorer() {
        fileList.innerHTML = '';

        // Sort files: App.tsx first, then components folder
        const fileNames = Object.keys(currentFiles).sort((a, b) => {
            if (a === 'App.tsx') return -1;
            if (b === 'App.tsx') return 1;
            if (a.includes('/') && !b.includes('/')) return 1;
            if (!a.includes('/') && b.includes('/')) return -1;
            return a.localeCompare(b);
        });

        let lastFolder = '';

        fileNames.forEach(fileName => {
            // Check if it's in a folder
            if (fileName.includes('/')) {
                const folder = fileName.split('/')[0];
                if (folder !== lastFolder) {
                    // Add folder item
                    const folderItem = document.createElement('div');
                    folderItem.className = 'file-item folder';
                    folderItem.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                        </svg>
                        ${folder}/
                    `;
                    fileList.appendChild(folderItem);
                    lastFolder = folder;
                }
            }

            const fileItem = document.createElement('div');
            fileItem.className = `file-item ${fileName === activeFile ? 'active' : ''}`;
            fileItem.dataset.file = fileName;

            const displayName = fileName.includes('/')
                ? '  ' + fileName.split('/').pop()
                : fileName;

            const icon = fileName.endsWith('.css')
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>';

            fileItem.innerHTML = `${icon} ${displayName}`;
            fileItem.addEventListener('click', () => selectFile(fileName));
            fileList.appendChild(fileItem);
        });
    }

    function selectFile(fileName) {
        activeFile = fileName;
        document.querySelectorAll('.file-item').forEach(item => {
            item.classList.toggle('active', item.dataset.file === fileName);
        });
    }

    function renderHtmlPreview(code) {
        const blob = new Blob([code], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        previewFrame.src = url;
        previewFrame.classList.remove('hidden');
        sandpackContainer.classList.add('hidden');
    }

    function renderReactPreview() {
        // Create a standalone HTML that runs React with Babel
        // All code must be in ONE script to avoid async compilation issues

        const appCode = currentFiles['App.tsx'] || currentFiles['App.jsx'] || '';
        const customStyles = currentFiles['styles.css'] || '';

        // Get all component files (not App.tsx)
        const componentEntries = Object.entries(currentFiles)
            .filter(([name]) => {
                return name !== 'App.tsx' &&
                    name !== 'App.jsx' &&
                    name !== 'styles.css' &&
                    (name.endsWith('.tsx') || name.endsWith('.jsx'));
            });

        // Build all code into one script
        let allCode = '';

        // First, add all components
        componentEntries.forEach(([name, code]) => {
            const componentName = name.split('/').pop().replace('.tsx', '').replace('.jsx', '');
            // Convert: export default function X -> const X = function
            // Remove all imports
            let cleanCode = code
                .replace(/import\s+.*?from\s+['"].*?['"]\s*;?/g, '')
                .replace(/import\s+['"].*?['"]\s*;?/g, '')
                .replace(/export\s+default\s+function\s+(\w+)/g, 'const $1 = function')
                .replace(/export\s+default\s+/g, `const ${componentName} = `)
                .replace(/export\s+/g, '');
            allCode += `\n// ${name}\n${cleanCode}\n`;
        });

        // Then add App code
        let cleanAppCode = appCode
            .replace(/import\s+.*?from\s+['"].*?['"]\s*;?/g, '')
            .replace(/import\s+['"].*?['"]\s*;?/g, '')
            .replace(/export\s+default\s+function\s+App/g, 'function App')
            .replace(/export\s+default\s+/g, 'const App = ')
            .replace(/export\s+/g, '');

        allCode += `\n// App.tsx\n${cleanAppCode}\n`;

        // Add render call
        allCode += `
// Render
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
`;

        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
        body { margin: 0; }
        .error-box { background: #450a0a; color: #fca5a5; padding: 20px; border-radius: 8px; margin: 20px; font-family: monospace; white-space: pre-wrap; }
        ${customStyles}
    </style>
</head>
<body class="bg-slate-900 text-white min-h-screen">
    <div id="root"><div style="padding: 40px; text-align: center; color: #888;">Compilando React...</div></div>
    <script>
        window.onerror = function(msg, url, line, col, error) {
            document.getElementById('root').innerHTML = '<div class="error-box"><strong>Erro JavaScript:</strong>\\n' + msg + '\\n\\nLinha: ' + line + '</div>';
            return true;
        };
    </script>
    <script type="text/babel" data-presets="react,typescript">
        try {
${allCode}
        } catch(e) {
            document.getElementById('root').innerHTML = '<div class="error-box"><strong>Erro React:</strong>\\n' + e.message + '</div>';
        }
    </script>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        previewFrame.src = url;
        previewFrame.classList.remove('hidden');
        sandpackContainer.classList.add('hidden');
    }

    function showLoading() {
        loadingOverlay.classList.remove('hidden');
    }

    function hideLoading() {
        loadingOverlay.classList.add('hidden');
    }

    function showPreview() {
        emptyState.classList.add('hidden');
        previewFrame.classList.remove('hidden');
        refineSection.classList.remove('hidden');
    }

    function showCodeModal() {
        if (currentMode === 'react') {
            if (Object.keys(currentFiles).length === 0) {
                alert('Gere um app primeiro!');
                return;
            }
            // Build tabs for each file
            modalTabs.innerHTML = Object.keys(currentFiles).map((fileName, i) =>
                `<span class="modal-tab ${i === 0 ? 'active' : ''}" data-file="${fileName}">${fileName}</span>`
            ).join('');

            // Click handlers for tabs
            modalTabs.querySelectorAll('.modal-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    modalTabs.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    codeDisplay.textContent = currentFiles[tab.dataset.file];
                });
            });

            // Show first file
            const firstFile = Object.keys(currentFiles)[0];
            codeDisplay.textContent = currentFiles[firstFile];
        } else {
            if (!currentCode) {
                alert('Gere um site primeiro!');
                return;
            }
            modalTabs.innerHTML = '<span class="modal-tab active">📄 index.html</span>';
            codeDisplay.textContent = currentCode;
        }
        codeModal.classList.remove('hidden');
    }

    function hideCodeModal() {
        codeModal.classList.add('hidden');
    }

    function copyCode() {
        const codeToCopy = currentMode === 'react'
            ? codeDisplay.textContent
            : currentCode;

        if (!codeToCopy) return;

        navigator.clipboard.writeText(codeToCopy).then(() => {
            const original = copyCodeBtn.innerHTML;
            copyCodeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copiado!`;
            setTimeout(() => copyCodeBtn.innerHTML = original, 2000);
        });
    }

    function downloadCode() {
        if (currentMode === 'react') {
            if (Object.keys(currentFiles).length === 0) {
                alert('Gere um app primeiro!');
                return;
            }
            // Download as JSON with all files
            const blob = new Blob([JSON.stringify(currentFiles, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'react-app.json';
            a.click();
            URL.revokeObjectURL(url);
        } else {
            if (!currentCode) {
                alert('Gere um site primeiro!');
                return;
            }
            const blob = new Blob([currentCode], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'site.html';
            a.click();
            URL.revokeObjectURL(url);
        }
    }

    function refreshPreview() {
        if (currentMode === 'react' && Object.keys(currentFiles).length > 0) {
            renderReactPreview();
        } else if (currentCode) {
            renderHtmlPreview(currentCode);
        }
    }

    function openFullscreen() {
        if (currentMode === 'react' && Object.keys(currentFiles).length === 0) {
            alert('Gere um app primeiro!');
            return;
        }
        if (currentMode === 'html' && !currentCode) {
            alert('Gere um site primeiro!');
            return;
        }

        if (currentMode === 'react') {
            // Re-render and open
            const iframe = previewFrame;
            window.open(iframe.src, '_blank');
        } else {
            const blob = new Blob([currentCode], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        }
    }

    function loadTheme() {
        const saved = localStorage.getItem('jadeTheme') || 'dark';
        document.body.setAttribute('data-theme', saved);
        updateThemeIcon(saved);
    }

    function toggleTheme() {
        const current = document.body.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', next);
        localStorage.setItem('jadeTheme', next);
        updateThemeIcon(next);
    }

    function updateThemeIcon(theme) {
        document.getElementById('darkIcon').classList.toggle('hidden', theme !== 'dark');
        document.getElementById('lightIcon').classList.toggle('hidden', theme === 'dark');
    }

    init();
})();
