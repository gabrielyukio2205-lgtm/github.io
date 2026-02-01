/**
 * CodeJade - Cursor AI Style
 */
(function () {
    'use strict';

    const API_BASE = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:7860'
        : 'https://madras1-jade-port.hf.space';

    const CHAT_URL = `${API_BASE}/codejade/chat`;
    const CONTEXT_URL = `${API_BASE}/codejade/context`;
    const STATUS_URL = `${API_BASE}/codejade/status`;

    // Elements
    const codeEditor = document.getElementById('code-editor');
    const runBtn = document.getElementById('run-btn');
    const outputContainer = document.getElementById('output-container');
    const execTime = document.getElementById('exec-time');
    const statusBadge = document.getElementById('status-badge');
    const themeToggle = document.getElementById('theme-toggle');
    const clearBtn = document.getElementById('clear-btn');
    const copyBtn = document.getElementById('copy-btn');

    // Modal elements
    const examplesBtn = document.getElementById('examples-btn');
    const examplesModal = document.getElementById('examples-modal');
    const examplesClose = document.getElementById('examples-close');
    const contextBtn = document.getElementById('context-btn');
    const contextModal = document.getElementById('context-modal');
    const contextClose = document.getElementById('context-close');
    const contextInput = document.getElementById('context-input');
    const contextSave = document.getElementById('context-save');
    const contextCancel = document.getElementById('context-cancel');

    let isRunning = false;
    let lastOutput = '';

    // Examples
    const examples = {
        hello: `Crie um programa Python que imprime "Hello, World!" e depois mostra a data e hora atual.`,
        fibonacci: `Crie um gráfico da sequência de Fibonacci mostrando os primeiros 20 números. Use matplotlib e salve como imagem.`,
        search: `Busque informações sobre as novidades do Python 3.12 e me dê um resumo.`,
        api: `Faça uma requisição GET para a API do GitHub (https://api.github.com/repos/python/cpython) e mostre as stars e forks do repositório.`,
        pandas: `Crie um DataFrame com dados de vendas fictícios (5 vendedores, vendas por mês) e mostre estatísticas básicas.`,
        complex: `Crie uma API Flask simples com 2 endpoints: GET /health e POST /echo. Depois teste localmente e mostre o resultado.`
    };

    // Init
    function init() {
        checkStatus();
        setupEventListeners();
        loadTheme();
    }

    // Check status
    async function checkStatus() {
        try {
            const resp = await fetch(STATUS_URL);
            const data = await resp.json();
            if (data.available) {
                statusBadge.classList.add('online');
                statusBadge.innerHTML = `<span class="status-dot"></span><span>E2B Online</span>`;
            }
        } catch (e) {
            statusBadge.innerHTML = `<span class="status-dot"></span><span>Offline</span>`;
        }
    }

    // Execute
    async function execute() {
        const prompt = codeEditor.value.trim();
        if (!prompt || isRunning) return;

        isRunning = true;
        runBtn.disabled = true;
        runBtn.textContent = '⏳ Executando...';
        runBtn.classList.add('loading');
        execTime.textContent = '';

        showOutput('🔄 Processando...', 'loading');

        const startTime = Date.now();

        try {
            const resp = await fetch(CHAT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: prompt })
            });

            const data = await resp.json();
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
            execTime.textContent = `${elapsed}s`;

            // Render response
            renderOutput(data);

        } catch (error) {
            showOutput(`❌ Erro: ${error.message}`, 'error');
        } finally {
            isRunning = false;
            runBtn.disabled = false;
            runBtn.textContent = '▶ Executar';
            runBtn.classList.remove('loading');
        }
    }

    // Render output with markdown and images
    function renderOutput(data) {
        const container = outputContainer;
        container.innerHTML = '';

        // Parse markdown-like content
        let html = parseMarkdown(data.response || '');

        const content = document.createElement('div');
        content.className = 'output-content success';
        content.innerHTML = html;
        container.appendChild(content);

        // Add tool badges
        if (data.tools_used && data.tools_used.length > 0) {
            const toolsDiv = document.createElement('div');
            toolsDiv.className = 'tools-used';
            data.tools_used.forEach(tool => {
                const badge = document.createElement('span');
                badge.className = 'tool-badge';
                badge.textContent = `⚡ ${tool}`;
                toolsDiv.appendChild(badge);
            });
            container.appendChild(toolsDiv);
        }

        // Check for base64 images in response
        if (data.images && data.images.length > 0) {
            data.images.forEach(img => {
                const imgEl = document.createElement('img');
                imgEl.src = `data:image/png;base64,${img}`;
                imgEl.alt = 'Generated image';
                content.appendChild(imgEl);
            });
        }

        lastOutput = data.response;
        container.scrollTop = container.scrollHeight;
    }

    // Simple markdown parser
    function parseMarkdown(text) {
        return text
            // Code blocks
            .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Headers
            .replace(/^### (.*)$/gm, '<h4>$1</h4>')
            .replace(/^## (.*)$/gm, '<h3>$1</h3>')
            .replace(/^# (.*)$/gm, '<h2>$1</h2>')
            // Bold
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            // Lists
            .replace(/^\* (.*)$/gm, '• $1')
            .replace(/^- (.*)$/gm, '• $1')
            // Line breaks
            .replace(/\n/g, '<br>');
    }

    // Show simple output
    function showOutput(text, type = 'success') {
        outputContainer.innerHTML = `<div class="output-content ${type}">${escapeHtml(text)}</div>`;
    }

    // Set context
    async function setContext() {
        const context = contextInput.value.trim();
        if (!context) return;

        try {
            await fetch(CONTEXT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ context })
            });
            closeModal(contextModal);
            showOutput(`📄 Contexto definido (${context.length} chars)`, 'success');
        } catch (e) {
            alert('Erro ao definir contexto');
        }
    }

    // Clear
    function clearOutput() {
        outputContainer.innerHTML = `
            <div class="welcome">
                <div class="welcome-icon">🤖</div>
                <h2>CodeJade</h2>
                <p>Agente de código com E2B Sandbox, Web Search e DAG Planning</p>
                <div class="features">
                    <span>🔲 E2B Sandbox</span>
                    <span>🌐 Web Search</span>
                    <span>📊 DAG</span>
                    <span>📄 CAT</span>
                </div>
            </div>
        `;
        execTime.textContent = '';
    }

    // Copy
    function copyOutput() {
        if (lastOutput) {
            navigator.clipboard.writeText(lastOutput);
            copyBtn.textContent = '✓ Copiado';
            setTimeout(() => copyBtn.textContent = 'Copiar', 1500);
        }
    }

    // Modal helpers
    function openModal(modal) { modal.classList.remove('hidden'); }
    function closeModal(modal) { modal.classList.add('hidden'); }

    // Theme
    function toggleTheme() {
        const theme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
        document.body.dataset.theme = theme;
        themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
        localStorage.setItem('codejade-theme', theme);
    }

    function loadTheme() {
        const saved = localStorage.getItem('codejade-theme');
        if (saved) {
            document.body.dataset.theme = saved;
            themeToggle.textContent = saved === 'dark' ? '🌙' : '☀️';
        }
    }

    // Escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Event listeners
    function setupEventListeners() {
        runBtn.addEventListener('click', execute);
        codeEditor.addEventListener('keydown', e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                execute();
            }
        });

        clearBtn.addEventListener('click', clearOutput);
        copyBtn.addEventListener('click', copyOutput);
        themeToggle.addEventListener('click', toggleTheme);

        // Examples modal
        examplesBtn.addEventListener('click', () => openModal(examplesModal));
        examplesClose.addEventListener('click', () => closeModal(examplesModal));
        examplesModal.querySelector('.modal-backdrop').addEventListener('click', () => closeModal(examplesModal));

        document.querySelectorAll('.example-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                codeEditor.value = examples[btn.dataset.example];
                closeModal(examplesModal);
            });
        });

        // Context modal
        contextBtn.addEventListener('click', () => openModal(contextModal));
        contextClose.addEventListener('click', () => closeModal(contextModal));
        contextCancel.addEventListener('click', () => closeModal(contextModal));
        contextModal.querySelector('.modal-backdrop').addEventListener('click', () => closeModal(contextModal));
        contextSave.addEventListener('click', setContext);

        // Escape to close modals
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                closeModal(examplesModal);
                closeModal(contextModal);
            }
        });
    }

    init();
})();
