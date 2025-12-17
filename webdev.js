/**
 * Jade Web Dev - AI Vibe Coder
 * Premium frontend logic with Tailwind CSS generation
 */

(function () {
    'use strict';

    // API Configuration - uses same proxy as main chat
    const PROXY_BASE_URL = 'https://jade-proxy.onrender.com';
    const API_URL = `${PROXY_BASE_URL}/webdev/generate`;

    // State
    let currentCode = '';
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

        // Prompt hints click
        document.querySelectorAll('.hint').forEach(hint => {
            hint.addEventListener('click', () => {
                promptInput.value = hint.dataset.prompt;
                promptInput.focus();
            });
        });

        // Allow Ctrl+Enter to generate
        promptInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
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

        // Close modal on backdrop click
        codeModal.addEventListener('click', (e) => {
            if (e.target === codeModal || e.target.classList.contains('modal-backdrop')) {
                hideCodeModal();
            }
        });
    }

    async function generateSite() {
        const prompt = promptInput.value.trim();
        if (!prompt) {
            promptInput.focus();
            return;
        }

        showLoading();
        startLoadingAnimation();

        try {
            const response = await fetch(API_URL, {
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
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro de conexão. Verifique se o backend está rodando.');
        } finally {
            stopLoadingAnimation();
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
        startLoadingAnimation();

        try {
            const response = await fetch(API_URL, {
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
            } else {
                alert('Erro ao refinar: ' + (data.error || 'Tente novamente'));
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro de conexão.');
        } finally {
            stopLoadingAnimation();
            hideLoading();
        }
    }

    function startLoadingAnimation() {
        const steps = document.querySelectorAll('.loading-steps .step');
        let currentStep = 0;

        loadingInterval = setInterval(() => {
            steps.forEach((s, i) => s.classList.toggle('active', i <= currentStep));
            currentStep = (currentStep + 1) % steps.length;
        }, 2000);
    }

    function stopLoadingAnimation() {
        if (loadingInterval) {
            clearInterval(loadingInterval);
            loadingInterval = null;
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
            const originalHTML = copyCodeBtn.innerHTML;
            copyCodeBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
                Copiado!
            `;
            setTimeout(() => {
                copyCodeBtn.innerHTML = originalHTML;
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
