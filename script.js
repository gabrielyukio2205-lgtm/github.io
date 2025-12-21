(function () {
    'use strict';

    // 1. URL DA API (Se estiver rodando local, mude para http://localhost:7860)
    // Se estiver no Hugging Face, use a URL direta do Space ou Proxy
    const PROXY_BASE_URL = 'https://jade-proxy.onrender.com';
    const API_URL = `${PROXY_BASE_URL}/chat`;

    // State Management
    let conversations = [];
    let currentChatId = null;
    let currentAgent = 'jade'; // Default agent

    // Cache DOM elements
    const chatbox = document.getElementById('chatbox');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const imageInput = document.getElementById('imageInput');
    const imageBtn = document.getElementById('imageBtn');
    const audioPlayer = document.getElementById('audioPlayer');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const removeImageBtn = document.getElementById('remove-image-btn');
    const voiceBtn = document.getElementById('voiceBtn');
    const audioVisualizer = document.getElementById('audio-visualizer');

    // Audio Control Elements
    const stopAudioBtn = document.getElementById('stop-audio-btn');
    const muteBtn = document.getElementById('mute-btn');
    const volOnIcon = document.getElementById('vol-on-icon');
    const volOffIcon = document.getElementById('vol-off-icon');

    // Audio State
    let isMuted = false;

    // Web Search State
    let webSearchEnabled = false;
    const webSearchBtn = document.getElementById('webSearchBtn');

    // Thinking Mode State
    let thinkingModeEnabled = false;
    const thinkingBtn = document.getElementById('thinkingBtn');

    // Sidebar Elements
    const sidebar = document.getElementById('sidebar');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const chatHistoryList = document.getElementById('chat-history-list');
    const agentSwitcher = document.getElementById('agent-switcher');

    // Header Elements
    const headerTitle = document.getElementById('header-title');

    // Theme Elements
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');

    // Init Marked & Highlight.js
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            highlight: function (code, lang) {
                const language = hljs.getLanguage(lang) ? lang : 'plaintext';
                return hljs.highlight(code, { language }).value;
            },
            langPrefix: 'hljs language-'
        });
    }

    function setupEventListeners() {
        sendBtn.addEventListener('click', sendMessage);

        // Auto-resize textarea
        userInput.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            if (this.value === '') this.style.height = 'auto';
        });

        // Paste Image Support
        userInput.addEventListener('paste', handlePaste);

        userInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
                // Reset height
                userInput.style.height = 'auto';
            }
        });
        imageBtn.addEventListener('click', () => imageInput.click());
        imageInput.addEventListener('change', handleImageSelection);
        removeImageBtn.addEventListener('click', clearImagePreview);

        // Voice Mode
        if (voiceBtn) {
            voiceBtn.addEventListener('click', toggleVoiceRecognition);
        }

        // Audio Controls
        if (stopAudioBtn) stopAudioBtn.addEventListener('click', stopSpeaking);
        if (muteBtn) muteBtn.addEventListener('click', toggleMute);

        // Web Search Toggle
        if (webSearchBtn) webSearchBtn.addEventListener('click', toggleWebSearch);

        // Thinking Mode Toggle
        if (thinkingBtn) thinkingBtn.addEventListener('click', toggleThinkingMode);

        // Sidebar Events
        toggleSidebarBtn.addEventListener('click', toggleSidebar);
        mobileMenuBtn.addEventListener('click', toggleSidebar);
        newChatBtn.addEventListener('click', startNewChat);

        // Agent Switcher Events (legacy - se existir)
        if (agentSwitcher) {
            const buttons = agentSwitcher.querySelectorAll('.agent-btn');
            buttons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const agent = btn.getAttribute('data-agent');
                    switchAgent(agent);
                });
            });
        }

        // Agent Mode Selector (novo dropdown)
        const agentModeSelect = document.getElementById('agent-mode-select');
        if (agentModeSelect) {
            agentModeSelect.addEventListener('change', (e) => {
                switchAgent(e.target.value);
            });
        }

        // Check URL params for agent selection (from Apps page)
        const urlParams = new URLSearchParams(window.location.search);
        const agentFromUrl = urlParams.get('agent');
        if (agentFromUrl && ['jade', 'scholar', 'heavy'].includes(agentFromUrl)) {
            currentAgent = agentFromUrl;
        }

        // Theme Event
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // --- Identity Management ---

    function getPersistentUserId() {
        let userId = localStorage.getItem('jade_master_user_id');
        if (!userId) {
            userId = 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
            localStorage.setItem('jade_master_user_id', userId);
        }
        return userId;
    }

    // --- Theme Management ---

    function initTheme() {
        const savedTheme = localStorage.getItem('jade_theme');
        // Default to Dark if null
        if (savedTheme === 'light') {
            document.body.setAttribute('data-theme', 'light');
            updateThemeIcons(true);
        } else {
            // Force dark as default
            document.body.removeAttribute('data-theme');
            localStorage.setItem('jade_theme', 'dark');
            updateThemeIcons(false);
        }
    }

    function toggleTheme() {
        const isLight = document.body.getAttribute('data-theme') === 'light';
        if (isLight) {
            document.body.removeAttribute('data-theme');
            localStorage.setItem('jade_theme', 'dark');
            updateThemeIcons(false);
        } else {
            document.body.setAttribute('data-theme', 'light');
            localStorage.setItem('jade_theme', 'light');
            updateThemeIcons(true);
        }
    }

    function updateThemeIcons(isLight) {
        // Update highlight.js theme for code blocks
        const hljsLink = document.getElementById('highlight-theme');
        if (hljsLink) {
            if (isLight) {
                hljsLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-light.min.css';
            } else {
                hljsLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css';
            }
        }

        if (isLight) {
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        } else {
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
        }
    }

    // --- Agent Management ---

    function switchAgent(agent) {
        if (currentAgent === agent) return;
        currentAgent = agent;

        // Update UI
        updateAgentUI();

        // Reload history and start new chat or load latest
        renderHistoryList();

        // Try to find the most recent chat for this agent
        const lastChat = conversations.find(c => (c.agent || 'jade') === currentAgent);
        if (lastChat) {
            loadChat(lastChat.id);
        } else {
            startNewChat();
        }

        // Close sidebar on mobile if open
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
        }
    }

    function updateAgentUI() {
        // Update Sidebar Buttons (legacy - se existir)
        if (agentSwitcher) {
            const buttons = agentSwitcher.querySelectorAll('.agent-btn');
            buttons.forEach(btn => {
                if (btn.getAttribute('data-agent') === currentAgent) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        // Update Agent Mode Dropdown (novo)
        const agentModeSelect = document.getElementById('agent-mode-select');
        if (agentModeSelect) {
            agentModeSelect.value = currentAgent;
        }

        // Update Header Title and Input Placeholder
        if (currentAgent === 'scholar') {
            headerTitle.textContent = 'Scholar Graph';
            userInput.placeholder = 'Envie uma mensagem para Scholar Graph...';
        } else if (currentAgent === 'heavy') {
            // ✨ Configuração Heavy ✨
            headerTitle.textContent = 'J.A.D.E. HEAVY';
            userInput.placeholder = 'Modo Raciocínio Profundo. Pergunte algo complexo...';
        } else {
            headerTitle.textContent = 'J.A.D.E.';
            userInput.placeholder = 'Envie uma mensagem para J.A.D.E...';
        }
    }

    // --- State & Storage ---

    function init() {
        initTheme();
        loadConversations();

        updateAgentUI();

        // Load initial chat
        const lastChat = conversations.find(c => (c.agent || 'jade') === currentAgent);
        if (lastChat) {
            loadChat(lastChat.id);
        } else {
            startNewChat();
        }
        renderHistoryList();
    }

    function toggleSidebar() {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            sidebar.classList.toggle('open');
        } else {
            sidebar.classList.toggle('collapsed');
            document.body.classList.toggle('sidebar-closed');
        }
    }

    function loadConversations() {
        const stored = localStorage.getItem('jade_conversations');
        if (stored) {
            try {
                conversations = JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse conversations', e);
                conversations = [];
            }
        }
    }

    function saveConversations() {
        localStorage.setItem('jade_conversations', JSON.stringify(conversations));
        renderHistoryList();
    }

    function createId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    function startNewChat() {
        currentChatId = createId();
        const newChat = {
            id: currentChatId,
            title: 'Nova conversa',
            messages: [],
            timestamp: Date.now(),
            agent: currentAgent // Save current agent to chat
        };
        conversations.unshift(newChat); // Add to top
        saveConversations();

        chatbox.innerHTML = '';
        appendWelcomeMessage();
        sidebar.classList.remove('open');
    }

    function loadChat(id) {
        const chat = conversations.find(c => c.id === id);
        if (!chat) return;

        currentChatId = id;

        // Ensure we switch the agent context if we load a chat from history
        const chatAgent = chat.agent || 'jade';
        if (chatAgent !== currentAgent) {
            currentAgent = chatAgent;
            updateAgentUI();
            renderHistoryList();
        }

        chatbox.innerHTML = '';

        if (chat.messages.length === 0) {
            appendWelcomeMessage();
        } else {
            chat.messages.forEach(msg => {
                appendMessage(msg.sender, msg.text, false, false);
            });
        }

        renderHistoryList();
        sidebar.classList.remove('open');
    }

    function saveMessageToCurrentChat(sender, text) {
        const chatIndex = conversations.findIndex(c => c.id === currentChatId);
        if (chatIndex !== -1) {
            const chat = conversations[chatIndex];
            chat.messages.push({ sender, text, timestamp: Date.now() });

            // Ensure agent is set
            if (!chat.agent) chat.agent = 'jade';

            if (sender === 'Você' && chat.title === 'Nova conversa') {
                chat.title = text.length > 30 ? text.substring(0, 30) + '...' : text;
            }

            conversations.splice(chatIndex, 1);
            conversations.unshift(chat);

            saveConversations();
        }
    }

    function deleteChat(e, id) {
        e.stopPropagation();
        if (confirm('Tem certeza que deseja excluir esta conversa?')) {
            conversations = conversations.filter(c => c.id !== id);
            saveConversations();

            if (currentChatId === id) {
                const nextChat = conversations.find(c => (c.agent || 'jade') === currentAgent);
                if (nextChat) {
                    loadChat(nextChat.id);
                } else {
                    startNewChat();
                }
            }
        }
    }

    // --- UI Rendering ---

    function renderHistoryList() {
        chatHistoryList.innerHTML = '';
        const filteredConversations = conversations.filter(c => (c.agent || 'jade') === currentAgent);

        filteredConversations.forEach(chat => {
            const div = document.createElement('div');
            div.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;

            const span = document.createElement('span');
            span.textContent = chat.title;
            span.style.flex = '1';
            span.style.overflow = 'hidden';
            span.style.textOverflow = 'ellipsis';

            const delBtn = document.createElement('button');
            delBtn.className = 'delete-chat-btn';
            delBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
            delBtn.title = "Excluir conversa";
            delBtn.onclick = (e) => deleteChat(e, chat.id);

            div.appendChild(span);
            div.appendChild(delBtn);
            div.onclick = () => loadChat(chat.id);

            chatHistoryList.appendChild(div);
        });
    }

    function appendWelcomeMessage() {
        let agentName = 'J.A.D.E.';
        let welcomeText = 'Olá. Eu sou J.A.D.E., sua assistente de inteligência artificial avançada. Como posso ajudar você hoje?';

        // Lógica de Boas Vindas
        if (currentAgent === 'scholar') {
            agentName = 'Scholar Graph';
            welcomeText = 'Olá. Eu sou Scholar Graph, seu assistente de pesquisa. Como posso ajudar em seus estudos?';
        } else if (currentAgent === 'heavy') {
            agentName = 'Jade Heavy';
            welcomeText = 'Iniciando módulo **Heavy Reasoning** (ToT/CoT). Estou pronta para resolver problemas complexos com pensamento estratégico. Qual o desafio?';
        }

        const el = document.createElement('div');
        el.className = 'message bot welcome-message';
        el.innerHTML = `
            <div class="avatar">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>
            </div>
            <div class="content">
            <div class="sender-name">${agentName}</div>
            <div class="text">${renderMarkdown(welcomeText)}</div>
            </div>
        `;
        chatbox.appendChild(el);
    }

    function handleImageSelection() {
        if (imageInput.files && imageInput.files[0]) {
            showImagePreview(imageInput.files[0]);
        }
    }

    function handlePaste(e) {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let index in items) {
            const item = items[index];
            if (item.kind === 'file' && item.type.includes('image/')) {
                const blob = item.getAsFile();
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(blob);
                imageInput.files = dataTransfer.files;

                showImagePreview(blob);
            }
        }
    }

    function showImagePreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreviewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    function clearImagePreview() {
        imageInput.value = '';
        imagePreviewContainer.classList.add('hidden');
    }

    function renderMarkdown(text) {
        // Parse thinking blocks first
        let thinkingContent = '';
        let mainContent = text;

        const thinkingMatch = text.match(/<thinking>([\s\S]*?)<\/thinking>/i);
        if (thinkingMatch) {
            thinkingContent = thinkingMatch[1].trim();
            mainContent = text.replace(/<thinking>[\s\S]*?<\/thinking>/i, '').trim();
        }

        let html = '';

        // Render thinking block if exists
        if (thinkingContent) {
            const thinkingHtml = typeof marked !== 'undefined' ? marked.parse(thinkingContent) : escapeHtml(thinkingContent).replace(/\n/g, '<br>');
            html += `
                <div class="thinking-block">
                    <div class="thinking-header" onclick="this.parentElement.classList.toggle('collapsed')">
                        <span>🧠 Pensando...</span>
                        <span class="thinking-toggle">▼</span>
                    </div>
                    <div class="thinking-content">${thinkingHtml}</div>
                </div>
            `;
        }

        // Render main content
        if (typeof marked !== 'undefined') {
            html += marked.parse(mainContent);
        } else {
            let mainHtml = escapeHtml(mainContent);
            mainHtml = mainHtml.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
            mainHtml = mainHtml.replace(/\*(.*?)\*/g, '<b>$1</b>');
            mainHtml = mainHtml.replace(/`(.*?)`/g, '<code>$1</code>');
            mainHtml = mainHtml.replace(/\n/g, '<br>');
            html += mainHtml;
        }

        // Links de arquivos gerados
        const regex = /href="\/generated\/(.*?)"/g;
        html = html.replace(regex, `target="_blank" href="${PROXY_BASE_URL}/generated/$1"`);
        html = html.replace(/<a href="http/g, '<a target="_blank" href="http');

        return html;
    }

    function escapeHtml(s) {
        return s.replace(/[&<>"']/g, ch => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[ch]));
    }

    function createMessageElement(sender, content, isTyping = false) {
        const isUser = sender === 'Você';
        const senderClass = isUser ? 'user' : 'bot';

        const el = document.createElement('div');
        el.className = `message ${senderClass}`;

        const avatarHTML = isUser
            ? `<div class="avatar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>`
            : `<div class="avatar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg></div>`;

        let textHTML;
        if (isTyping) {
            // Heavy Mode gets special loading indicator
            if (sender === 'Jade Heavy') {
                textHTML = `<div class="text heavy-processing">
                    <div class="heavy-loading">
                        <div class="heavy-spinner"></div>
                        <div class="heavy-phases">
                            <span class="phase-label">Orquestrando modelos...</span>
                            <div class="phase-steps">
                                <span class="phase active" data-phase="1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Planejando</span>
                                <span class="phase" data-phase="2"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg> Selecionando</span>
                                <span class="phase" data-phase="3"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> Expandindo</span>
                                <span class="phase" data-phase="4"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Refinando</span>
                                <span class="phase" data-phase="5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M3 12h18M5.64 5.64l12.72 12.72M18.36 5.64L5.64 18.36"/></svg> Sintetizando</span>
                            </div>
                        </div>
                    </div>
                </div>`;
            } else {
                textHTML = `<div class="text"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
            }
        } else {
            // Add Heavy Mode badge if applicable
            const heavyBadge = sender === 'Jade Heavy' ? '<span class="heavy-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a8 8 0 0 0-8 8c0 3.5 2.5 6.5 6 7.5V22h4v-4.5c3.5-1 6-4 6-7.5a8 8 0 0 0-8-8z"/></svg> Multi-Model</span>' : '';
            textHTML = `<div class="text">${heavyBadge}${renderMarkdown(content)}</div>`;
        }

        const contentHTML = `
            <div class="content">
                <div class="sender-name">${sender}</div>
                ${textHTML}
            </div>
        `;

        el.innerHTML = isUser ? (contentHTML + avatarHTML) : (avatarHTML + contentHTML);
        return el;
    }

    function appendMessage(sender, textContent, isTyping = false, save = true) {
        const el = createMessageElement(sender, textContent, isTyping);
        chatbox.appendChild(el);
        chatbox.scrollTop = chatbox.scrollHeight;

        if (save && !isTyping) {
            saveMessageToCurrentChat(sender, textContent);
        }

        return el;
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    function updateBotMessage(messageEl, text) {
        const textEl = messageEl.querySelector('.text');
        if (textEl) {
            textEl.innerHTML = renderMarkdown(text);
            addCopyButtons(textEl);
        }
    }

    function addCopyButtons(container) {
        if (!container) return;
        const preBlocks = container.querySelectorAll('pre');

        preBlocks.forEach(pre => {
            if (pre.querySelector('.copy-btn')) return;

            const btn = document.createElement('button');
            btn.className = 'copy-btn';
            btn.textContent = 'Copiar';
            btn.addEventListener('click', () => {
                const code = pre.querySelector('code');
                const text = code ? code.innerText : pre.innerText;

                navigator.clipboard.writeText(text).then(() => {
                    const originalText = btn.textContent;
                    btn.textContent = 'Copiado!';
                    setTimeout(() => {
                        btn.textContent = originalText;
                    }, 2000);
                }).catch(err => {
                    console.error('Falha ao copiar:', err);
                });
            });

            pre.appendChild(btn);
        });
    }

    function toggleMute() {
        isMuted = !isMuted;
        if (isMuted) {
            volOnIcon.classList.add('hidden');
            volOffIcon.classList.remove('hidden');
            window.speechSynthesis.cancel();
        } else {
            volOnIcon.classList.remove('hidden');
            volOffIcon.classList.add('hidden');
        }
    }

    function toggleWebSearch() {
        webSearchEnabled = !webSearchEnabled;
        if (webSearchBtn) {
            if (webSearchEnabled) {
                webSearchBtn.classList.add('active');
                webSearchBtn.title = 'Busca Web ATIVADA (Tavily)';
                console.log('🔍 Web Search: ON');
            } else {
                webSearchBtn.classList.remove('active');
                webSearchBtn.title = 'Ativar Busca Web (Tavily)';
                console.log('🔍 Web Search: OFF');
            }
        }
    }

    function toggleThinkingMode() {
        thinkingModeEnabled = !thinkingModeEnabled;
        if (thinkingBtn) {
            if (thinkingModeEnabled) {
                thinkingBtn.classList.add('active');
                thinkingBtn.title = 'Modo Thinking ATIVADO';
                console.log('🧠 Thinking Mode: ON');
            } else {
                thinkingBtn.classList.remove('active');
                thinkingBtn.title = 'Modo Thinking (CoT)';
                console.log('🧠 Thinking Mode: OFF');
            }
        }
    }

    function stopSpeaking() {
        window.speechSynthesis.cancel();
        if (audioPlayer && !audioPlayer.paused) {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
        }

        if (stopAudioBtn) stopAudioBtn.classList.add('hidden');

        const inputWrapper = document.querySelector('.input-wrapper');
        if (audioVisualizer) audioVisualizer.classList.add('hidden');
        if (inputWrapper) inputWrapper.classList.remove('speaking');
    }

    function speakText(text) {
        if ('speechSynthesis' in window && !isMuted) {
            window.speechSynthesis.cancel();

            let speechText = text.replace(/```[\s\S]*?```/g, ' [Código] ');
            speechText = speechText.replace(/[#*`\[\]]/g, '').replace(/\(http.*?\)/g, '');

            const utterance = new SpeechSynthesisUtterance(speechText);
            utterance.lang = 'pt-BR';
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(v => v.lang.includes('pt-BR') && v.name.includes('Google'));
            if (preferredVoice) utterance.voice = preferredVoice;

            const inputWrapper = document.querySelector('.input-wrapper');
            utterance.onstart = () => {
                if (audioVisualizer) audioVisualizer.classList.remove('hidden');
                if (inputWrapper) inputWrapper.classList.add('speaking');
                if (stopAudioBtn) stopAudioBtn.classList.remove('hidden');
            };
            utterance.onend = () => {
                if (audioVisualizer) audioVisualizer.classList.add('hidden');
                if (inputWrapper) inputWrapper.classList.remove('speaking');
                if (stopAudioBtn) stopAudioBtn.classList.add('hidden');
            };
            utterance.onerror = () => {
                if (audioVisualizer) audioVisualizer.classList.add('hidden');
                if (inputWrapper) inputWrapper.classList.remove('speaking');
                if (stopAudioBtn) stopAudioBtn.classList.add('hidden');
            };

            window.speechSynthesis.speak(utterance);
        }
    }

    // --- Speech Recognition ---
    let recognition = null;

    function toggleVoiceRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Seu navegador não suporta reconhecimento de voz.');
            return;
        }

        if (recognition && recognition.started) {
            recognition.stop();
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            voiceBtn.classList.add('listening');
            voiceBtn.style.color = '#ef4444';
            recognition.started = true;
        };

        recognition.onend = () => {
            voiceBtn.classList.remove('listening');
            voiceBtn.style.color = '';
            recognition.started = false;
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            userInput.value += (userInput.value ? ' ' : '') + transcript;
            userInput.focus();
            userInput.style.height = 'auto';
            userInput.style.height = (userInput.scrollHeight) + 'px';
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            recognition.stop();
        };

        recognition.start();
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        let image_base64 = null;
        if (!message && imageInput.files.length === 0) return;

        if (!currentChatId) startNewChat();

        // NOME CORRETO PARA O CHAT
        let agentName = 'J.A.D.E.';
        if (currentAgent === 'scholar') agentName = 'Scholar Graph';
        if (currentAgent === 'heavy') agentName = 'Jade Heavy';

        if (imageInput.files.length > 0) {
            const msgText = `${message || ''} [Imagem Anexada]`;
            appendMessage('Você', msgText);
            image_base64 = await fileToBase64(imageInput.files[0]);
            clearImagePreview();
        } else {
            appendMessage('Você', message);
        }
        userInput.value = '';

        const jadeTypingMessage = appendMessage(agentName, '', true, false);

        // Start Heavy Mode phase animation if applicable
        let heavyPhaseInterval = null;
        if (currentAgent === 'heavy') {
            let phaseIndex = 0;
            const phases = [1, 2, 3, 4, 5];

            heavyPhaseInterval = setInterval(() => {
                phaseIndex++;
                if (phaseIndex < phases.length) {
                    const phaseSteps = jadeTypingMessage.querySelectorAll('.phase');
                    phaseSteps.forEach((el, idx) => {
                        el.classList.toggle('active', idx <= phaseIndex);
                        el.classList.toggle('done', idx < phaseIndex);
                    });
                }
            }, 5000); // Change phase every 5 seconds (more realistic)
        }

        const masterUserId = getPersistentUserId();

        try {
            console.log(`📡 Enviando para: ${API_URL}`);

            const resp = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_input: message,
                    image_base64: image_base64,
                    user_id: masterUserId,
                    agent_type: currentAgent, // ENVIA 'jade', 'scholar' ou 'heavy'
                    web_search: webSearchEnabled && currentAgent === 'jade', // Só ativa busca no modo J.A.D.E.
                    thinking_mode: thinkingModeEnabled && currentAgent === 'jade' // Só ativa thinking no modo J.A.D.E.
                })
            });

            if (!resp.ok) {
                const errorText = await resp.text();
                throw new Error(`HTTP ${resp.status} - ${errorText.substring(0, 100)}`);
            }

            const json = await resp.json();
            let botResponse;

            if (json.success) {
                botResponse = json.bot_response;
                if (json.audio_base64) {
                    if (!isMuted) {
                        audioPlayer.src = `data:audio/mpeg;base64,${json.audio_base64}`;

                        const inputWrapper = document.querySelector('.input-wrapper');

                        audioPlayer.onplay = () => {
                            if (audioVisualizer) audioVisualizer.classList.remove('hidden');
                            if (inputWrapper) inputWrapper.classList.add('speaking');
                            if (stopAudioBtn) stopAudioBtn.classList.remove('hidden');
                        };

                        audioPlayer.onended = () => {
                            if (audioVisualizer) audioVisualizer.classList.add('hidden');
                            if (inputWrapper) inputWrapper.classList.remove('speaking');
                            if (stopAudioBtn) stopAudioBtn.classList.add('hidden');
                        };

                        audioPlayer.onpause = audioPlayer.onended;

                        audioPlayer.play();
                    }
                } else {
                    speakText(botResponse);
                }
            } else {
                botResponse = `[Erro: ${json.error || 'Desconhecido'}]`;
            }

            if (botResponse === undefined) {
                botResponse = "[Erro de comunicação]";
            }

            // Stop Heavy Mode phase animation
            if (heavyPhaseInterval) {
                clearInterval(heavyPhaseInterval);
            }

            updateBotMessage(jadeTypingMessage, botResponse);
            saveMessageToCurrentChat(agentName, botResponse);
            chatbox.scrollTop = chatbox.scrollHeight;

        } catch (err) {
            console.error(err);
            // Stop Heavy Mode phase animation on error too
            if (heavyPhaseInterval) {
                clearInterval(heavyPhaseInterval);
            }
            const errorText = `Falha ao conectar (${err.message}).`;
            updateBotMessage(jadeTypingMessage, errorText);
            saveMessageToCurrentChat(agentName, errorText);
        }
    }

    setupEventListeners();
    init();

})();
