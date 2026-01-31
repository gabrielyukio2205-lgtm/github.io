/**
 * CodeJade - Frontend JavaScript
 */

(function () {
    'use strict';

    // API Configuration
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:7860'
        : 'https://madras1-jade-port.hf.space';

    const CHAT_URL = `${API_BASE}/codejade/chat`;
    const CONTEXT_URL = `${API_BASE}/codejade/context`;
    const STATUS_URL = `${API_BASE}/codejade/status`;

    // DOM Elements
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const clearBtn = document.getElementById('clear-btn');
    const contextBtn = document.getElementById('context-btn');
    const statusBadge = document.getElementById('status-badge');
    const modeIndicator = document.getElementById('mode-indicator');
    const themeToggle = document.getElementById('theme-toggle');

    // Modal elements
    const contextModal = document.getElementById('context-modal');
    const contextInput = document.getElementById('context-input');
    const contextSave = document.getElementById('context-save');
    const contextCancel = document.getElementById('context-cancel');
    const modalClose = document.getElementById('modal-close');
    const contextIndicator = document.getElementById('context-indicator');
    const contextRemove = document.getElementById('context-remove');

    // State
    let isLoading = false;
    let hasContext = false;

    // Initialize
    function init() {
        checkStatus();
        setupEventListeners();
        loadTheme();
        autoResizeInput();
    }

    // Check agent status
    async function checkStatus() {
        try {
            const response = await fetch(STATUS_URL);
            const data = await response.json();

            if (data.available) {
                statusBadge.classList.add('online');
                statusBadge.querySelector('.status-text').textContent =
                    data.sandbox ? 'E2B Online' : 'Online (no sandbox)';

                if (data.has_context) {
                    hasContext = true;
                    contextIndicator.classList.remove('hidden');
                }
            } else {
                statusBadge.querySelector('.status-text').textContent = 'Offline';
            }
        } catch (error) {
            console.error('Status check failed:', error);
            statusBadge.querySelector('.status-text').textContent = 'Desconectado';
        }
    }

    // Send message
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message || isLoading) return;

        // Clear welcome message if present
        const welcome = chatMessages.querySelector('.welcome-message');
        if (welcome) welcome.remove();

        // Add user message
        addMessage(message, 'user');
        chatInput.value = '';
        autoResizeInput();

        // Show loading
        isLoading = true;
        sendBtn.disabled = true;
        const loadingMsg = addMessage('Pensando', 'assistant loading');

        try {
            const response = await fetch(CHAT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });

            const data = await response.json();

            // Remove loading
            loadingMsg.remove();

            // Update mode indicator
            updateModeIndicator(data.mode);

            // Add response
            addMessage(data.response, 'assistant', data.tools_used);

        } catch (error) {
            console.error('Chat error:', error);
            loadingMsg.remove();
            addMessage(`❌ Erro: ${error.message}`, 'assistant');
        } finally {
            isLoading = false;
            sendBtn.disabled = false;
        }
    }

    // Add message to chat
    function addMessage(content, type, tools = []) {
        const msg = document.createElement('div');
        msg.className = `message ${type}`;

        // Parse markdown-like content
        let html = escapeHtml(content)
            .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');

        msg.innerHTML = html;

        // Add tool badges
        if (tools && tools.length > 0) {
            const toolsDiv = document.createElement('div');
            toolsDiv.className = 'message-tools';
            tools.forEach(tool => {
                const badge = document.createElement('span');
                badge.className = 'tool-badge';
                badge.innerHTML = `⚡ ${tool}`;
                toolsDiv.appendChild(badge);
            });
            msg.appendChild(toolsDiv);
        }

        chatMessages.appendChild(msg);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        return msg;
    }

    // Update mode indicator
    function updateModeIndicator(mode) {
        const icon = modeIndicator.querySelector('.mode-icon');
        const text = modeIndicator.querySelector('.mode-text');

        if (mode === 'dag') {
            modeIndicator.classList.add('dag');
            icon.textContent = '📊';
            text.textContent = 'DAG';
        } else if (mode === 'react') {
            modeIndicator.classList.remove('dag');
            icon.textContent = '⚡';
            text.textContent = 'ReAct';
        } else {
            modeIndicator.classList.remove('dag');
            icon.textContent = '💬';
            text.textContent = 'Chat';
        }
    }

    // Save context
    async function saveContext() {
        const context = contextInput.value.trim();
        if (!context) return;

        try {
            const response = await fetch(CONTEXT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ context })
            });

            const data = await response.json();

            if (data.success) {
                hasContext = true;
                contextIndicator.classList.remove('hidden');
                closeModal();
                addMessage(`📄 Contexto definido: ${context.length} caracteres`, 'assistant');
            } else {
                alert(`Erro: ${data.error}`);
            }
        } catch (error) {
            console.error('Context error:', error);
            alert(`Erro: ${error.message}`);
        }
    }

    // Clear context
    function clearContext() {
        hasContext = false;
        contextIndicator.classList.add('hidden');
        contextInput.value = '';
    }

    // Clear chat
    function clearChat() {
        chatMessages.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">🤖</div>
                <h2>CodeJade</h2>
                <p>Agente de código com execução segura, busca web e planejamento inteligente.</p>
                <div class="features-grid">
                    <div class="feature"><span class="feature-icon">🔲</span><span>E2B Sandbox</span></div>
                    <div class="feature"><span class="feature-icon">🌐</span><span>Web Search</span></div>
                    <div class="feature"><span class="feature-icon">📊</span><span>DAG Planning</span></div>
                    <div class="feature"><span class="feature-icon">📄</span><span>CAT Context</span></div>
                </div>
            </div>
        `;
    }

    // Modal controls
    function openModal() {
        contextModal.classList.remove('hidden');
    }

    function closeModal() {
        contextModal.classList.add('hidden');
    }

    // Theme
    function toggleTheme() {
        const newTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
        document.body.dataset.theme = newTheme;
        localStorage.setItem('codejade-theme', newTheme);
    }

    function loadTheme() {
        const saved = localStorage.getItem('codejade-theme');
        if (saved) document.body.dataset.theme = saved;
    }

    // Auto-resize textarea
    function autoResizeInput() {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
    }

    // Escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Event Listeners
    function setupEventListeners() {
        // Send
        sendBtn.addEventListener('click', sendMessage);
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                sendMessage();
            }
        });
        chatInput.addEventListener('input', autoResizeInput);

        // Clear
        clearBtn.addEventListener('click', clearChat);

        // Context
        contextBtn.addEventListener('click', openModal);
        contextSave.addEventListener('click', saveContext);
        contextCancel.addEventListener('click', closeModal);
        modalClose.addEventListener('click', closeModal);
        contextRemove.addEventListener('click', clearContext);
        contextModal.querySelector('.modal-backdrop').addEventListener('click', closeModal);

        // Theme
        themeToggle.addEventListener('click', toggleTheme);

        // Escape to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !contextModal.classList.contains('hidden')) {
                closeModal();
            }
        });
    }

    // Start
    init();
})();
