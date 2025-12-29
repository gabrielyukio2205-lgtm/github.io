(function () {
    'use strict';

    // API Base URL
    const API_URL = 'https://jade-proxy.onrender.com/anything';
    const STORAGE_KEY = 'anything_conversations';
    const GEMS_KEY = 'anything_gems';

    // Provider Models Config
    const PROVIDERS = {
        openrouter: {
            name: 'OpenRouter',
            color: '#22c55e',
            models: [
                { id: 'xiaomi/mimo-v2-flash:free', name: 'Xiaomi MiMo V2 Flash' },
                { id: 'nvidia/nemotron-3-nano-30b-a3b:free', name: 'Nemotron 3 Nano 30B' },
                { id: 'mistralai/devstral-2512:free', name: 'Devstral 2512' },
                { id: 'nex-agi/deepseek-v3.1-nex-n1:free', name: 'DeepSeek V3.1 NEX' },
                { id: 'arcee-ai/trinity-mini:free', name: 'Arcee Trinity Mini' },
                { id: 'kwaipilot/kat-coder-pro:free', name: 'KAT Coder Pro' },
                { id: 'nvidia/nemotron-nano-12b-v2-vl:free', name: 'Nemotron Nano 12B VL' },
                { id: 'alibaba/tongyi-deepresearch-30b-a3b:free', name: 'Tongyi DeepResearch 30B' },
                { id: 'openai/gpt-oss-120b:free', name: 'GPT-OSS 120B' },
                { id: 'z-ai/glm-4.5-air:free', name: 'GLM 4.5 Air' },
                { id: 'qwen/qwen3-coder:free', name: 'Qwen3 Coder' },
                { id: 'moonshotai/kimi-k2:free', name: 'Kimi K2' },
                { id: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', name: 'Dolphin Mistral 24B' },
                { id: 'tngtech/deepseek-r1t2-chimera:free', name: 'DeepSeek R1T2 Chimera' },
                { id: 'deepseek/deepseek-r1-0528:free', name: 'DeepSeek R1' },
                { id: 'google/gemma-3-27b-it:free', name: 'Gemma 3 27B' },
                { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B' },
                { id: 'qwen/qwen-2.5-vl-7b-instruct:free', name: 'Qwen 2.5 VL 7B' },
                { id: 'nousresearch/hermes-3-llama-3.1-405b:free', name: 'Hermes 3 Llama 405B' }
            ]
        },
        groq: {
            name: 'Groq',
            color: '#f97316',
            models: [
                { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
                { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick 17B' },
                { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B' },
                { id: 'moonshotai/kimi-k2-instruct-0905', name: 'Kimi K2 Instruct' }
            ]
        },
        cerebras: {
            name: 'Cerebras',
            color: '#a855f7',
            models: [
                { id: 'qwen-3-235b-a22b-instruct-2507', name: 'Qwen 3 235B' },
                { id: 'zai-glm-4.6', name: 'ZAI GLM 4.6' },
                { id: 'qwen-3-32b', name: 'Qwen 3 32B' }
            ]
        },
        mistral: {
            name: 'Mistral',
            color: '#3b82f6',
            models: [
                { id: 'mistral-large-latest', name: 'Mistral Large' },
                { id: 'mistral-medium-latest', name: 'Mistral Medium' },
                { id: 'magistral-medium-latest', name: 'Magistral Medium' },
                { id: 'pixtral-large-latest', name: 'Pixtral Large (Vision)' },
                { id: 'mistral-small-latest', name: 'Mistral Small' }
            ]
        },
        chutes: {
            name: 'Chutes',
            color: '#06b6d4',
            models: [
                { id: 'deepseek-ai/DeepSeek-V3-0324-TEE', name: 'DeepSeek V3' },
                { id: 'zai-org/GLM-4.7-TEE', name: 'GLM 4.7' },
                { id: 'moonshotai/Kimi-K2-Thinking-TEE', name: 'Kimi K2 Thinking' },
                { id: 'MiniMaxAI/MiniMax-M2.1-TEE', name: 'MiniMax M2.1' }
            ]
        }
    };

    // State
    let currentProvider = 'openrouter';
    let currentModel = PROVIDERS.openrouter.models[0].id;
    let currentGem = null; // GEM ativa (null = sem GEM)
    let conversations = [];
    let currentChatId = null;
    let messages = [];
    let gems = [];
    let isProcessing = false;

    // DOM Elements
    const chatbox = document.getElementById('chatbox');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const providerSelect = document.getElementById('provider-select');
    const modelSelect = document.getElementById('model-select');
    const gemSelect = document.getElementById('gem-select');
    const createGemBtn = document.getElementById('create-gem-btn');
    const modelBadge = document.getElementById('current-model-badge');
    const sidebar = document.getElementById('sidebar');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const chatHistoryList = document.getElementById('chat-history-list');

    // GEM Modal Elements
    const gemModal = document.getElementById('gem-modal');
    const gemForm = document.getElementById('gem-form');
    const gemNameInput = document.getElementById('gem-name');
    const gemEmojiInput = document.getElementById('gem-emoji');
    const gemPromptInput = document.getElementById('gem-prompt');
    const gemContextInput = document.getElementById('gem-context');
    const gemIdInput = document.getElementById('gem-id');
    const cancelGemBtn = document.getElementById('cancel-gem-btn');
    const deleteGemBtn = document.getElementById('delete-gem-btn');

    // Initialize
    function init() {
        loadGems();
        loadConversations();
        populateModels();
        populateGems();
        updateModelBadge();
        setupEventListeners();

        // Load last chat or start new
        if (conversations.length > 0) {
            loadChat(conversations[0].id);
        } else {
            startNewChat();
        }

        renderHistoryList();
    }

    function setupEventListeners() {
        sendBtn.addEventListener('click', sendMessage);

        userInput.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });

        userInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        providerSelect.addEventListener('change', (e) => {
            currentProvider = e.target.value;
            populateModels();
            updateModelBadge();
        });

        modelSelect.addEventListener('change', (e) => {
            currentModel = e.target.value;
            updateModelBadge();
        });

        if (gemSelect) {
            gemSelect.addEventListener('change', (e) => {
                const gemId = e.target.value;
                currentGem = gemId ? gems.find(g => g.id === gemId) : null;
                updateModelBadge();
            });
        }

        if (createGemBtn) {
            createGemBtn.addEventListener('click', () => openGemModal());
        }

        if (cancelGemBtn) {
            cancelGemBtn.addEventListener('click', closeGemModal);
        }

        if (deleteGemBtn) {
            deleteGemBtn.addEventListener('click', deleteCurrentGem);
        }

        if (gemForm) {
            gemForm.addEventListener('submit', saveGem);
        }

        // Close modal on backdrop click
        if (gemModal) {
            gemModal.addEventListener('click', (e) => {
                if (e.target === gemModal) closeGemModal();
            });
        }

        if (toggleSidebarBtn) {
            toggleSidebarBtn.addEventListener('click', toggleSidebar);
        }
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', toggleSidebar);
        }
        if (newChatBtn) {
            newChatBtn.addEventListener('click', startNewChat);
        }
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

    // ========== STORAGE ==========

    function loadConversations() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                conversations = JSON.parse(stored);
            } catch (e) {
                conversations = [];
            }
        }
    }

    function saveConversations() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
        renderHistoryList();
    }

    function loadGems() {
        const stored = localStorage.getItem(GEMS_KEY);
        if (stored) {
            try {
                gems = JSON.parse(stored);
            } catch (e) {
                gems = [];
            }
        }
    }

    function saveGems() {
        localStorage.setItem(GEMS_KEY, JSON.stringify(gems));
        populateGems();
    }

    // ========== GEMS ==========

    function openGemModal(gem = null) {
        if (!gemModal) return;

        gemModal.classList.add('active');

        if (gem) {
            // Edit mode
            gemIdInput.value = gem.id;
            gemNameInput.value = gem.name;
            gemEmojiInput.value = gem.emoji;
            gemPromptInput.value = gem.prompt;
            gemContextInput.value = gem.context || '';
            deleteGemBtn.classList.remove('hidden');
            document.querySelector('.modal-title').textContent = 'Editar GEM';
        } else {
            // Create mode
            gemIdInput.value = '';
            gemNameInput.value = '';
            gemEmojiInput.value = '✨';
            gemPromptInput.value = '';
            gemContextInput.value = '';
            deleteGemBtn.classList.add('hidden');
            document.querySelector('.modal-title').textContent = 'Criar GEM';
        }

        gemNameInput.focus();
    }

    function closeGemModal() {
        if (gemModal) {
            gemModal.classList.remove('active');
        }
    }

    function saveGem(e) {
        e.preventDefault();

        const id = gemIdInput.value || createId();
        const gem = {
            id,
            name: gemNameInput.value.trim(),
            emoji: gemEmojiInput.value.trim() || '✨',
            prompt: gemPromptInput.value.trim(),
            context: gemContextInput.value.trim()
        };

        if (!gem.name || !gem.prompt) {
            alert('Nome e Prompt são obrigatórios!');
            return;
        }

        const existingIndex = gems.findIndex(g => g.id === id);
        if (existingIndex >= 0) {
            gems[existingIndex] = gem;
        } else {
            gems.push(gem);
        }

        saveGems();
        closeGemModal();

        // Select the new/edited GEM
        currentGem = gem;
        if (gemSelect) gemSelect.value = gem.id;
        updateModelBadge();
    }

    function deleteCurrentGem() {
        const id = gemIdInput.value;
        if (!id) return;

        if (confirm('Excluir esta GEM?')) {
            gems = gems.filter(g => g.id !== id);
            saveGems();
            closeGemModal();

            if (currentGem && currentGem.id === id) {
                currentGem = null;
                if (gemSelect) gemSelect.value = '';
            }
            updateModelBadge();
        }
    }

    function populateGems() {
        if (!gemSelect) return;

        gemSelect.innerHTML = '<option value="">Sem GEM</option>';
        gems.forEach(gem => {
            const option = document.createElement('option');
            option.value = gem.id;
            option.textContent = `${gem.emoji} ${gem.name}`;
            gemSelect.appendChild(option);
        });

        // Add edit options for existing gems
        if (currentGem) {
            gemSelect.value = currentGem.id;
        }
    }

    // ========== CONVERSATIONS ==========

    function createId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    function startNewChat() {
        currentChatId = createId();
        messages = [];

        const newChat = {
            id: currentChatId,
            title: 'Nova conversa',
            messages: [],
            provider: currentProvider,
            model: currentModel,
            gemId: currentGem ? currentGem.id : null,
            timestamp: Date.now()
        };

        conversations.unshift(newChat);
        saveConversations();

        chatbox.innerHTML = '';
        appendWelcomeMessage();

        if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
        }
    }

    function loadChat(id) {
        const chat = conversations.find(c => c.id === id);
        if (!chat) return;

        currentChatId = id;
        messages = chat.messages.map(m => ({ role: m.role, content: m.content }));

        // Restore settings
        if (chat.provider && PROVIDERS[chat.provider]) {
            currentProvider = chat.provider;
            providerSelect.value = currentProvider;
            populateModels();
        }
        if (chat.model) {
            currentModel = chat.model;
            modelSelect.value = currentModel;
        }
        if (chat.gemId) {
            currentGem = gems.find(g => g.id === chat.gemId) || null;
            if (gemSelect) gemSelect.value = chat.gemId;
        } else {
            currentGem = null;
            if (gemSelect) gemSelect.value = '';
        }

        updateModelBadge();

        // Render messages
        chatbox.innerHTML = '';
        if (chat.messages.length === 0) {
            appendWelcomeMessage();
        } else {
            chat.messages.forEach(msg => {
                appendMessage(msg.role, msg.content, false, msg.modelName, msg.providerName);
            });
        }

        renderHistoryList();

        if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
        }
    }

    function deleteChat(e, id) {
        e.stopPropagation();
        if (confirm('Excluir esta conversa?')) {
            conversations = conversations.filter(c => c.id !== id);
            saveConversations();

            if (currentChatId === id) {
                if (conversations.length > 0) {
                    loadChat(conversations[0].id);
                } else {
                    startNewChat();
                }
            }
        }
    }

    function saveMessageToChat(role, content, modelName = '', providerName = '') {
        const chatIndex = conversations.findIndex(c => c.id === currentChatId);
        if (chatIndex !== -1) {
            const chat = conversations[chatIndex];
            chat.messages.push({ role, content, modelName, providerName, timestamp: Date.now() });
            chat.provider = currentProvider;
            chat.model = currentModel;
            chat.gemId = currentGem ? currentGem.id : null;

            // Update title from first user message
            if (role === 'user' && chat.title === 'Nova conversa') {
                chat.title = content.length > 35 ? content.substring(0, 35) + '...' : content;
            }

            // Move to top
            conversations.splice(chatIndex, 1);
            conversations.unshift(chat);

            saveConversations();
        }
    }

    // ========== UI ==========

    function renderHistoryList() {
        if (!chatHistoryList) return;

        chatHistoryList.innerHTML = '';

        conversations.forEach(chat => {
            const div = document.createElement('div');
            div.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;

            const gem = chat.gemId ? gems.find(g => g.id === chat.gemId) : null;
            const emoji = gem ? gem.emoji : '💬';

            div.innerHTML = `
                <span class="history-emoji">${emoji}</span>
                <span class="history-title">${chat.title}</span>
                <button class="delete-chat-btn" title="Excluir">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            `;

            div.querySelector('.delete-chat-btn').onclick = (e) => deleteChat(e, chat.id);
            div.onclick = () => loadChat(chat.id);

            chatHistoryList.appendChild(div);
        });
    }

    function populateModels() {
        modelSelect.innerHTML = '';
        const provider = PROVIDERS[currentProvider];

        provider.models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            modelSelect.appendChild(option);
        });

        currentModel = provider.models[0].id;
    }

    function updateModelBadge() {
        const provider = PROVIDERS[currentProvider];
        const model = provider.models.find(m => m.id === currentModel) || provider.models[0];
        const gemInfo = currentGem ? `${currentGem.emoji} ${currentGem.name} · ` : '';
        modelBadge.innerHTML = `
            <span style="color: ${provider.color}">●</span>
            ${gemInfo}${model.name}
        `;
    }

    function appendWelcomeMessage() {
        const el = document.createElement('div');
        el.className = 'message bot';

        let welcomeText = '';
        if (currentGem) {
            welcomeText = `
                <p><strong>${currentGem.emoji} ${currentGem.name}</strong> está ativa!</p>
                <p>${currentGem.prompt.substring(0, 100)}${currentGem.prompt.length > 100 ? '...' : ''}</p>
            `;
        } else {
            welcomeText = `
                <p>Olá! Escolha um <strong>provider</strong> e <strong>modelo</strong> acima.</p>
                <p>Você pode criar uma <strong>GEM</strong> para personalizar o comportamento do chat com prompts customizados.</p>
            `;
        }

        el.innerHTML = `
            <div class="avatar">${currentGem ? currentGem.emoji : '🌐'}</div>
            <div class="content">
                <div class="sender-name">Chat Anything</div>
                <div class="text">${welcomeText}</div>
            </div>
        `;
        chatbox.appendChild(el);
    }

    function appendMessage(role, text, isTyping = false, modelName = '', providerName = '') {
        const isUser = role === 'user';
        const el = document.createElement('div');
        el.className = `message ${isUser ? 'user' : 'bot'}`;

        const provider = PROVIDERS[currentProvider];
        const model = provider.models.find(m => m.id === currentModel) || provider.models[0];

        const displayModelName = modelName || model.name;
        const displayProviderName = providerName || provider.name;
        const avatar = currentGem ? currentGem.emoji : provider.name.charAt(0);

        if (isUser) {
            el.innerHTML = `
                <div class="content">
                    <div class="text">${escapeHtml(text)}</div>
                </div>
            `;
        } else {
            const textContent = isTyping
                ? '<div class="typing-indicator"><span></span><span></span><span></span></div>'
                : renderMarkdown(text);

            el.innerHTML = `
                <div class="avatar">${avatar}</div>
                <div class="content">
                    <div class="sender-name">
                        ${currentGem ? currentGem.name : 'Assistente'}
                        <span class="model-tag">${displayProviderName} · ${displayModelName}</span>
                    </div>
                    <div class="text">${textContent}</div>
                </div>
            `;
        }

        chatbox.appendChild(el);
        chatbox.scrollTop = chatbox.scrollHeight;
        return el;
    }

    function updateBotMessage(el, text) {
        const textEl = el.querySelector('.text');
        if (textEl) {
            textEl.innerHTML = renderMarkdown(text);
        }
    }

    // ========== MESSAGING ==========

    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message || isProcessing) return;

        isProcessing = true;
        sendBtn.disabled = true;

        // Add user message
        appendMessage('user', message);
        messages.push({ role: 'user', content: message });
        saveMessageToChat('user', message);

        userInput.value = '';
        userInput.style.height = 'auto';

        // Add typing indicator
        const typingEl = appendMessage('bot', '', true);

        const provider = PROVIDERS[currentProvider];
        const model = provider.models.find(m => m.id === currentModel) || provider.models[0];

        try {
            // Build messages with system prompt from GEM
            const apiMessages = [];

            if (currentGem) {
                let systemPrompt = currentGem.prompt;
                if (currentGem.context) {
                    systemPrompt += '\n\nContexto adicional:\n' + currentGem.context;
                }
                apiMessages.push({ role: 'system', content: systemPrompt });
            }

            apiMessages.push(...messages);

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: currentProvider,
                    model: currentModel,
                    messages: apiMessages
                })
            });

            const data = await response.json();

            if (data.success && data.response) {
                messages.push({ role: 'assistant', content: data.response });
                saveMessageToChat('assistant', data.response, model.name, provider.name);
                updateBotMessage(typingEl, data.response);
            } else {
                updateBotMessage(typingEl, `❌ Erro: ${data.error || 'Falha ao obter resposta'}`);
            }
        } catch (error) {
            console.error('Error:', error);
            updateBotMessage(typingEl, `❌ Erro de conexão: ${error.message}`);
        }

        isProcessing = false;
        sendBtn.disabled = false;
        userInput.focus();
    }

    // ========== UTILS ==========

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function renderMarkdown(text) {
        if (typeof marked !== 'undefined') {
            return marked.parse(text);
        }
        return escapeHtml(text).replace(/\n/g, '<br>');
    }

    // Expose openGemModal to edit from select
    window.editCurrentGem = function () {
        if (currentGem) {
            openGemModal(currentGem);
        }
    };

    // Start
    init();

})();
