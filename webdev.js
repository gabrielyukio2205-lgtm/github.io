/**
 * Jade Web Dev - AI Vibe Coder
 * Supports HTML and React (Sandpack) modes
 */

(function () {
    'use strict';

    // API Configuration
    const PROXY_BASE_URL = 'https://jade-proxy.onrender.com';
    const API_URL = `${PROXY_BASE_URL}/webdev/generate`;
    const SANDPACK_IMPORT_URLS = [
        'https://esm.sh/@codesandbox/sandpack-client@2?bundle',
        'https://cdn.jsdelivr.net/npm/@codesandbox/sandpack-client@2/+esm',
        'https://cdn.skypack.dev/@codesandbox/sandpack-client@2',
        'https://esm.sh/@codesandbox/sandpack-client@1?bundle',
        'https://cdn.jsdelivr.net/npm/@codesandbox/sandpack-client@1/+esm',
        'https://cdn.skypack.dev/@codesandbox/sandpack-client@1'
    ];
    const SANDPACK_UMD_URLS = [
        'https://sandpack.codesandbox.io/sandpack-client.js',
        'https://unpkg.com/@codesandbox/sandpack-client@2/dist/index.umd.js',
        'https://cdn.jsdelivr.net/npm/@codesandbox/sandpack-client@2/dist/index.umd.js',
        'https://unpkg.com/@codesandbox/sandpack-client@2/dist/index.umd.min.js',
        'https://cdn.jsdelivr.net/npm/@codesandbox/sandpack-client@2/dist/index.umd.min.js',
        'https://unpkg.com/@codesandbox/sandpack-client@1/dist/index.umd.js',
        'https://cdn.jsdelivr.net/npm/@codesandbox/sandpack-client@1/dist/index.umd.js'
    ];

    // State
    let currentMode = 'html'; // 'html' or 'react'
    let currentCode = '';
    let currentFiles = {}; // For React mode
    let currentDependencies = {};
    let activeFile = 'src/App.jsx';
    let loadingInterval = null;
    let sandpackClient = null;
    let sandpackImportPromise = null;
    let sandpackCtor = null;
    let reactPreviewMode = 'sandpack';

    // Agentic auto-fix state
    const MAX_FIX_ATTEMPTS = 3;
    let fixAttempts = 0;
    let lastError = null;
    let originalPrompt = '';

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
    const modelSelect = document.getElementById('modelSelect');
    const qualityBadge = document.getElementById('qualityBadge');

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

        // Listen for errors from iframe (for auto-fix)
        window.addEventListener('message', handleIframeMessage);

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
        currentDependencies = {};
        updateModeUI();
        resetPreview();
    }

    function updateModeUI() {
        // Toggle buttons
        htmlModeBtn.classList.toggle('active', currentMode === 'html');
        reactModeBtn.classList.toggle('active', currentMode === 'react');

        // Update description
        if (currentMode === 'react') {
            modeDescription.textContent = 'Gere projetos React com imports e dependencias';
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
        sandpackContainer.classList.add('hidden');
        sandpackContainer.innerHTML = '';
        sandpackClient = null;
        reactPreviewMode = 'sandpack';
        refineSection.classList.add('hidden');
        fileList.innerHTML = '';
    }

    function getBackendMode() {
        return currentMode === 'react' ? 'react_project' : 'html';
    }

    function isReactPayload(data) {
        if (!data || !data.files) return false;
        const fallbackMode = currentMode === 'react' ? 'react' : '';
        const mode = data.mode || fallbackMode;
        return mode.startsWith('react');
    }

    function extractDependenciesFromPackage(files) {
        if (!files) return {};
        const pkgRaw = files['package.json'] || files['/package.json'];
        if (!pkgRaw) return {};
        try {
            const pkg = typeof pkgRaw === 'string' ? JSON.parse(pkgRaw) : pkgRaw;
            if (pkg && typeof pkg.dependencies === 'object') {
                return pkg.dependencies;
            }
        } catch (error) {
            console.warn('Failed to parse package.json dependencies', error);
        }
        return {};
    }

    function pickDefaultFile() {
        const candidates = [
            'src/App.jsx',
            'src/App.js',
            'App.jsx',
            'App.js',
            'index.html'
        ];

        for (const name of candidates) {
            if (currentFiles[name]) return name;
        }
        return Object.keys(currentFiles)[0] || '';
    }

    function normalizeSandpackFiles(rawFiles) {
        const files = {};

        Object.entries(rawFiles || {}).forEach(([name, code]) => {
            if (!name) return;
            const normalized = name.startsWith('/') ? name : `/${name}`;
            let content = typeof code === 'string'
                ? code
                : (code && code.code) ? code.code
                    : (code && code.content) ? code.content
                        : (code && code.contents) ? code.contents
                            : (code && typeof code === 'object') ? JSON.stringify(code, null, 2)
                                : '';

            if (typeof code === 'object' && code !== null && typeof content === 'string') {
                rawFiles[name] = content;
            }
            files[normalized] = content;
        });

        if (!files['/index.html']) {
            files['/index.html'] = buildDefaultIndexHtml();
        }

        if (!files['/src/App.jsx'] && !files['/src/App.js']) {
            files['/src/App.jsx'] = buildDefaultApp();
        }

        if (!files['/src/main.jsx'] && !files['/src/main.js']) {
            const hasStyles = Boolean(files['/src/styles.css'] || files['/src/index.css'] || files['/src/App.css']);
            files['/src/main.jsx'] = buildDefaultMain(hasStyles);
        }

        return files;
    }

    function buildDefaultIndexHtml() {
        return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-slate-900 text-white">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;
    }

    function buildDefaultMain(hasStyles) {
        const styleImport = hasStyles ? "import './styles.css';\n" : '';
        return `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
${styleImport}
const root = createRoot(document.getElementById("root"));
root.render(<App />);
`;
    }

    function buildDefaultApp() {
        return `export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-3">React Project</h1>
        <p className="text-slate-300">Start editing to see changes.</p>
      </div>
    </div>
  );
}
`;
    }

    function resolveDependencies() {
        const base = { react: '18.2.0', 'react-dom': '18.2.0' };
        const pkgDeps = extractDependenciesFromPackage(currentFiles);
        return Object.assign({}, base, pkgDeps, currentDependencies);
    }

    function buildPackageJson(dependencies) {
        const payload = {
            name: 'jade-sandpack',
            version: '0.0.0',
            private: true,
            dependencies
        };
        return JSON.stringify(payload, null, 2);
    }

    function ensurePackageJson(files, dependencies) {
        const pkgPath = files['/package.json'] ? '/package.json' : (files['package.json'] ? 'package.json' : null);
        if (pkgPath) {
            const content = files[pkgPath];
            if (typeof content !== 'string' || !content.trim()) {
                files[pkgPath] = buildPackageJson(dependencies);
                return;
            }
            try {
                JSON.parse(content);
            } catch (error) {
                files[pkgPath] = buildPackageJson(dependencies);
            }
        } else {
            files['/package.json'] = buildPackageJson(dependencies);
        }
    }

    function getSandpackEntry(files) {
        if (files['/src/main.jsx']) return '/src/main.jsx';
        if (files['/src/main.js']) return '/src/main.js';
        if (files['/src/index.jsx']) return '/src/index.jsx';
        if (files['/src/index.js']) return '/src/index.js';
        return '/src/main.jsx';
    }

    async function loadSandpackClient() {
        if (sandpackCtor) return sandpackCtor;
        if (!sandpackImportPromise) {
            sandpackImportPromise = (async () => {
                for (const url of SANDPACK_UMD_URLS) {
                    try {
                        await loadScript(url);
                        const ctor = resolveSandpackCtor(window) ||
                            (window.sandpack && resolveSandpackCtor(window.sandpack));
                        if (ctor) return ctor;
                    } catch (error) {
                        console.warn('Sandpack script failed', url, error);
                    }
                }

                for (const url of SANDPACK_IMPORT_URLS) {
                    try {
                        const mod = await import(url);
                        const ctor = resolveSandpackCtor(mod);
                        if (ctor) return ctor;
                        if (mod) {
                            console.warn('Sandpack module missing SandpackClient', url, Object.keys(mod));
                        }
                    } catch (error) {
                        console.warn('Sandpack import failed', url, error);
                    }
                }

                return null;
            })();
        }
        sandpackCtor = await sandpackImportPromise;
        return sandpackCtor;
    }

    function loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
            document.head.appendChild(script);
        });
    }

    function resolveSandpackCtor(mod) {
        if (!mod) return null;
        if (typeof mod === 'function') return mod;
        if (mod.SandpackClient) return mod.SandpackClient;
        if (mod.sandpackClient) return mod.sandpackClient;
        if (mod.createSandpackClient) return mod.createSandpackClient;
        if (mod.createClient) return mod.createClient;
        if (mod.Client) return mod.Client;
        if (mod.default) {
            if (typeof mod.default === 'function') return mod.default;
            if (mod.default.SandpackClient) return mod.default.SandpackClient;
            if (mod.default.sandpackClient) return mod.default.sandpackClient;
            if (mod.default.createSandpackClient) return mod.default.createSandpackClient;
            if (mod.default.createClient) return mod.default.createClient;
        }
        const match = Object.values(mod).find((value) => {
            return typeof value === 'function' && value.name === 'SandpackClient';
        });
        return match || null;
    }

    function buildSandpackFrame() {
        sandpackContainer.innerHTML = '';
        const frame = document.createElement('iframe');
        frame.className = 'preview-frame';
        frame.title = 'React Preview';
        frame.setAttribute('sandbox', 'allow-forms allow-modals allow-popups allow-scripts allow-same-origin');
        sandpackContainer.appendChild(frame);
        return frame;
    }

    function showSandpackError(message) {
        sandpackContainer.innerHTML = `<div class="sandpack-error">${message}</div>`;
        sandpackContainer.classList.remove('hidden');
        previewFrame.classList.add('hidden');
        hideLoading();
    }

    function scheduleSandpackHide() {
        setTimeout(() => {
            if (!loadingOverlay.classList.contains('hidden')) {
                hideLoading();
            }
        }, 1200);
    }

    async function generateSite() {
        const prompt = promptInput.value.trim();
        if (!prompt) {
            promptInput.focus();
            return;
        }

        // Save for auto-fix and reset attempts
        originalPrompt = prompt;
        fixAttempts = 0;
        lastError = null;

        showLoading();

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    mode: getBackendMode(),
                    model: modelSelect.value
                })
            });

            const data = await response.json();

            if (data.success) {
                if (isReactPayload(data)) {
                    currentFiles = data.files || {};
                    currentDependencies = data.dependencies || extractDependenciesFromPackage(currentFiles);
                    activeFile = pickDefaultFile();
                    renderFileExplorer();
                    await renderReactPreview();

                    // Set a timeout to hide loading if iframe doesn't respond
                    setTimeout(() => {
                        if (!loadingOverlay.classList.contains('hidden')) {
                            console.log('⏱️ Timeout: hiding loading after 8s');
                            hideLoading();
                        }
                    }, 8000);
                } else {
                    currentCode = data.code;
                    renderHtmlPreview(currentCode);
                }
                showPreview();

                // Show quality score if available (Compound PRO)
                if (data.quality_score) {
                    showQualityScore(data.quality_score);
                } else {
                    hideQualityScore();
                }
            } else {
                alert('Erro ao gerar: ' + (data.error || 'Tente novamente'));
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro de conexão.');
            hideLoading();
        } finally {
            // For HTML mode, hide loading immediately
            // For React mode, loading is hidden after Sandpack boots
            if (currentMode === 'html') {
                hideLoading();
            }
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
                ? JSON.stringify({ files: currentFiles, dependencies: currentDependencies }, null, 2)
                : currentCode;

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: feedback,
                    existing_code: existingCode,
                    mode: getBackendMode(),
                    model: modelSelect.value
                })
            });

            const data = await response.json();

            if (data.success) {
                if (isReactPayload(data)) {
                    currentFiles = data.files || {};
                    currentDependencies = data.dependencies || extractDependenciesFromPackage(currentFiles);
                    activeFile = pickDefaultFile();
                    renderFileExplorer();
                    await renderReactPreview();
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

        // Sort files: root essentials first, then src files
        const fileNames = Object.keys(currentFiles).sort((a, b) => {
            const priority = (name) => {
                if (name === 'index.html') return 0;
                if (name === 'package.json') return 1;
                if (name === 'src/main.jsx' || name === 'src/main.js') return 2;
                if (name === 'src/App.jsx' || name === 'src/App.js') return 3;
                if (name.startsWith('src/')) return 4;
                return 5;
            };
            const pa = priority(a);
            const pb = priority(b);
            if (pa !== pb) return pa - pb;
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
        sandpackContainer.innerHTML = '';
    }

    async function renderReactPreview() {
        // Sandpack CDNs are completely broken (404s, parsing errors)
        // Use direct Babel + React CDN approach instead
        renderReactFallback();
    }

    function renderReactFallback(message) {
        reactPreviewMode = 'iframe';
        if (message) {
            showSandpackError(message);
        }

        const html = buildReactHtml();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        previewFrame.src = url;
        previewFrame.classList.remove('hidden');
        sandpackContainer.classList.add('hidden');

        previewFrame.onload = () => {
            hideLoading();
        };

        setTimeout(() => {
            if (!loadingOverlay.classList.contains('hidden')) {
                hideLoading();
            }
        }, 3000);
    }

    function buildReactHtml() {
        // Get app code (prefer App.jsx/js)
        const appKey = Object.keys(currentFiles).find(k =>
            k.includes('App.jsx') || k.includes('App.js')
        );
        let appCode = currentFiles[appKey] || buildDefaultApp();

        // Get styles
        let stylesCode = '';
        const styleKey = Object.keys(currentFiles).find(k => k.endsWith('.css'));
        if (styleKey) {
            stylesCode = currentFiles[styleKey];
        }

        // Clean up imports (remove everything before the component)
        appCode = appCode
            .replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '')
            .replace(/^import\s+['"].*?['"];?\s*$/gm, '')
            .trim();

        // If code starts with "export default" function/class, wrap it
        if (appCode.startsWith('export default')) {
            appCode = appCode.replace('export default', 'const App =');
        }

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
        body { margin: 0; padding: 0; }
        ${stylesCode}
    </style>
</head>
<body class="bg-slate-900 text-white">
    <div id="root"></div>
    <script type="text/babel">
        const { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } = React;

        ${appCode}

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
    </script>
</body>
</html>`;
    }

    // Handle messages from iframe (for auto-fix)
    function handleIframeMessage(event) {
        if (!event.data || !event.data.type) return;

        if (event.data.type === 'react-error' && currentMode === 'react') {
            lastError = event.data.error;

            // Only auto-fix if we haven't exceeded max attempts
            if (fixAttempts < MAX_FIX_ATTEMPTS) {
                autoFixReact(event.data.error);
            } else {
                // Max attempts reached - stop loading and show error
                console.log('🛑 Max fix attempts reached, showing code as-is');
                hideLoading();
                alert(`O código React tem erro de compilação após ${MAX_FIX_ATTEMPTS} tentativas de correção.\n\nErro: ${event.data.error}\n\nVeja o código para debug.`);
            }
        } else if (event.data.type === 'react-success') {
            // Reset fix attempts on success
            fixAttempts = 0;
            lastError = null;
            hideLoading(); // Make sure to hide loading on success!
        }
    }

    // Agentic auto-fix for React errors
    async function autoFixReact(errorMessage) {
        fixAttempts++;

        console.log(`🔧 Auto-fix attempt ${fixAttempts}/${MAX_FIX_ATTEMPTS}: ${errorMessage}`);

        // Update loading overlay to show fixing status
        const loadingText = loadingOverlay.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = `Corrigindo erro (${fixAttempts}/${MAX_FIX_ATTEMPTS})...`;
        }
        showLoading();

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: originalPrompt,
                    existing_code: JSON.stringify({ files: currentFiles, dependencies: currentDependencies }),
                    mode: getBackendMode(),
                    error_message: errorMessage,
                    model: modelSelect.value
                })
            });

            const data = await response.json();

            if (data.success && isReactPayload(data)) {
                currentFiles = data.files || {};
                currentDependencies = data.dependencies || extractDependenciesFromPackage(currentFiles);
                activeFile = pickDefaultFile();
                renderFileExplorer();
                renderReactPreview();
            } else {
                console.error('Auto-fix failed:', data.error);
                hideLoading();
            }
        } catch (error) {
            console.error('Auto-fix error:', error);
            hideLoading();
        }
    }

    function showLoading() {
        loadingOverlay.classList.remove('hidden');
    }

    function hideLoading() {
        loadingOverlay.classList.add('hidden');
        // Reset loading text
        const loadingText = loadingOverlay.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = 'Gerando...';
        }
    }

    function showPreview() {
        emptyState.classList.add('hidden');
        if (currentMode === 'react') {
            if (reactPreviewMode === 'iframe') {
                sandpackContainer.classList.add('hidden');
                previewFrame.classList.remove('hidden');
            } else {
                sandpackContainer.classList.remove('hidden');
                previewFrame.classList.add('hidden');
            }
        } else {
            sandpackContainer.classList.add('hidden');
            previewFrame.classList.remove('hidden');
        }
        refineSection.classList.remove('hidden');
    }

    function showQualityScore(score) {
        if (!qualityBadge) return;

        const scoreEl = qualityBadge.querySelector('.score');
        if (scoreEl) {
            scoreEl.textContent = score.toFixed(1);
        }

        // Color based on score
        qualityBadge.classList.remove('score-low', 'score-mid', 'score-high');
        if (score >= 8) {
            qualityBadge.classList.add('score-high');
        } else if (score >= 6) {
            qualityBadge.classList.add('score-mid');
        } else {
            qualityBadge.classList.add('score-low');
        }

        qualityBadge.classList.remove('hidden');
    }

    function hideQualityScore() {
        if (qualityBadge) {
            qualityBadge.classList.add('hidden');
        }
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
            // Download as JSON with files + dependencies
            const payload = { files: currentFiles, dependencies: currentDependencies };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'react-project.json';
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
            const iframe = reactPreviewMode === 'iframe'
                ? previewFrame
                : sandpackContainer.querySelector('iframe');
            if (iframe && iframe.src) {
                window.open(iframe.src, '_blank');
            } else {
                alert('Preview ainda nao esta pronto.');
            }
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
