/**
 * Jade Web Dev - Vibe Coder
 * Frontend logic for AI-powered web generation
 */

(function () {
    'use strict';

    // API Configuration
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:7860'
        : 'https://gabrielyukio2205-jade-port.hf.space';

    // State
    let currentCode = '';

    // DOM Elements
    const promptInput = document.getElementById('promptInput');
    const generateBtn = document.getElementById('generateBtn');
    const previewFrame = document.getElementById('previewFrame');
    const emptyState = document.getElementById('emptyState');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const codeBtn = document.getElementById('codeBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const codeModal = document.getElementById('codeModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    const codeDisplay = document.getElementById('codeDisplay').querySelector('code');
    const refineSection = document.getElementById('refineSection');
    const refineInput = document.getElementById('refineInput');
    const refineBtn = document.getElementById('refineBtn');
    const themeBtn = document.getElementById('themeBtn');

    // Initialize
    function init() {
        loadTheme();
        setupEventListeners();
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

        // Allow Enter to generate
        promptInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                generateSite();
            }
        });

        // Allow Enter to refine
        refineInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                refineSite();
            }
        });

        // Close modal on outside click
        codeModal.addEventListener('click', (e) => {
            if (e.target === codeModal) hideCodeModal();
        });
    }

    async function generateSite() {
        const prompt = promptInput.value.trim();
        if (!prompt) {
            alert('Digite uma descrição para o site!');
            return;
        }

        showLoading();

        try {
            const response = await fetch(`${API_BASE}/webdev/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            const data = await response.json();

            if (data.success) {
                currentCode = data.code;
                renderPreview(currentCode);
                showPreview();
            } else {
                alert('Erro ao gerar: ' + (data.error || 'Tente novamente'));
                hideLoading();
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro de conexão. Verifique se o backend está rodando.');
            hideLoading();
        }
    }

    async function refineSite() {
        const feedback = refineInput.value.trim();
        if (!feedback) return;
        if (!currentCode) {
            alert('Gere um site primeiro!');
            return;
        }

        showLoading();

        try {
            const response = await fetch(`${API_BASE}/webdev/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: feedback,
                    existing_code: currentCode
                })
            });

            const data = await response.json();

            if (data.success) {
                currentCode = data.code;
                renderPreview(currentCode);
                refineInput.value = '';
                hideLoading();
            } else {
                alert('Erro ao refinar: ' + (data.error || 'Tente novamente'));
                hideLoading();
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro de conexão.');
            hideLoading();
        }
    }

    function renderPreview(code) {
        const blob = new Blob([code], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        previewFrame.src = url;
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
        hideLoading();
    }

    function showCodeModal() {
        if (!currentCode) {
            alert('Gere um site primeiro!');
            return;
        }
        codeDisplay.textContent = currentCode;
        codeModal.classList.remove('hidden');
    }

    function hideCodeModal() {
        codeModal.classList.add('hidden');
    }

    function copyCode() {
        if (!currentCode) return;
        navigator.clipboard.writeText(currentCode).then(() => {
            copyCodeBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
                Copiado!
            `;
            setTimeout(() => {
                copyCodeBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                    Copiar
                `;
            }, 2000);
        });
    }

    function downloadCode() {
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

    function refreshPreview() {
        if (currentCode) {
            renderPreview(currentCode);
        }
    }

    function loadTheme() {
        const savedTheme = localStorage.getItem('jadeTheme') || 'dark';
        document.body.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }

    function toggleTheme() {
        const current = document.body.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', next);
        localStorage.setItem('jadeTheme', next);
        updateThemeIcon(next);
    }

    function updateThemeIcon(theme) {
        const darkIcon = document.getElementById('darkIcon');
        const lightIcon = document.getElementById('lightIcon');
        if (theme === 'dark') {
            darkIcon.classList.remove('hidden');
            lightIcon.classList.add('hidden');
        } else {
            darkIcon.classList.add('hidden');
            lightIcon.classList.remove('hidden');
        }
    }

    // Start
    init();
})();
