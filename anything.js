(function () {
    'use strict';

    // API Base URL
    const API_URL = 'https://jade-proxy.onrender.com/anything';
    const STORAGE_KEY = 'anything_conversations';
    const CHARS_KEY = 'anything_characters';

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
        }
    };

    // Default Characters/Personas
    const DEFAULT_CHARACTERS = [
        { id: 'default', name: 'Padrão', emoji: '🤖', prompt: 'Você é um assistente útil e amigável.' },
        { id: 'coder', name: 'Programador', emoji: '💻', prompt: 'Você é um programador senior especialista em múltiplas linguagens. Responda sempre com código limpo, bem comentado e boas práticas. Use markdown para formatar código.' },
        { id: 'creative', name: 'Criativo', emoji: '🎨', prompt: 'Você é um artista criativo e imaginativo. Seja poético, use metáforas e pense fora da caixa. Inspire criatividade em suas respostas.' },
        { id: 'professor', name: 'Professor', emoji: '📚', prompt: 'Você é um professor paciente e didático. Explique conceitos de forma clara, use exemplos práticos e analogias. Estimule o pensamento crítico.' },
        { id: 'coach', name: 'Coach', emoji: '🧠', prompt: 'Você é um coach motivacional e psicólogo. Seja empático, faça perguntas poderosas e ajude a pessoa a encontrar suas próprias respostas.' },
        { id: 'comedian', name: 'Comediante', emoji: '😂', prompt: 'Você é um comediante brasileiro. Use humor, piadas, trocadilhos e referências da cultura pop. Mantenha o clima leve e divertido.' },
        { id: 'rpg', name: 'Mestre de RPG', emoji: '🐉', prompt: 'Você é um mestre de RPG épico. Narre histórias imersivas, crie cenários fantásticos e desafios. Use descrições vívidas e mantenha o suspense.' }
    ];

    // State
    let currentProvider = 'openrouter';
    let currentModel = PROVIDERS.openrouter.models[0].id;
    let currentCharacter = DEFAULT_CHARACTERS[0];
    let conversations = [];
    let currentChatId = null;
    let messages = [];
    let characters = [];
    let isProcessing = false;

    // DOM Elements
    const chatbox = document.getElementById('chatbox');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const providerSelect = document.getElementById('provider-select');
    const modelSelect = document.getElementById('model-select');
    const characterSelect = document.getElementById('character-select');
    const modelBadge = document.getElementById('current-model-badge');
    const sidebar = document.getElementById('sidebar');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const chatHistoryList = document.getElementById('chat-history-list');

    // Initialize
    function init() {
        loadCharacters();
        loadConversations();
        populateModels();
        populateCharacters();
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

        if (characterSelect) {
            characterSelect.addEventListener('change', (e) => {
                const char = characters.find(c => c.id === e.target.value);
                if (char) {
                    currentCharacter = char;
                    updateModelBadge();
                }
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

    function loadCharacters() {
        const stored = localStorage.getItem(CHARS_KEY);
        if (stored) {
            try {
                const custom = JSON.parse(stored);
                characters = [...DEFAULT_CHARACTERS, ...custom];
            } catch (e) {
                characters = [...DEFAULT_CHARACTERS];
            }
        } else {
            characters = [...DEFAULT_CHARACTERS];
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
            character: currentCharacter.id,
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
        if (chat.character) {
            const char = characters.find(c => c.id === chat.character);
            if (char) {
                currentCharacter = char;
                if (characterSelect) characterSelect.value = char.id;
            }
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
            chat.character = currentCharacter.id;

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

            const char = characters.find(c => c.id === chat.character) || DEFAULT_CHARACTERS[0];

            div.innerHTML = `
                <span class="history-emoji">${char.emoji}</span>
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

    function populateCharacters() {
        if (!characterSelect) return;

        characterSelect.innerHTML = '';
        characters.forEach(char => {
            const option = document.createElement('option');
            option.value = char.id;
            option.textContent = `${char.emoji} ${char.name}`;
            characterSelect.appendChild(option);
        });
    }

    function updateModelBadge() {
        const provider = PROVIDERS[currentProvider];
        const model = provider.models.find(m => m.id === currentModel) || provider.models[0];
        modelBadge.innerHTML = `
            <span style="color: ${provider.color}">●</span>
            ${currentCharacter.emoji} ${model.name}
        `;
    }

    function appendWelcomeMessage() {
        const el = document.createElement('div');
        el.className = 'message bot';
        el.innerHTML = `
            <div class="avatar">${currentCharacter.emoji}</div>
            <div class="content">
                <div class="sender-name">${currentCharacter.name}</div>
                <div class="text">
                    <p>Olá! Eu sou <strong>${currentCharacter.name}</strong> - ${currentCharacter.prompt.substring(0, 80)}...</p>
                    <p>Escolha um provider e modelo acima, ou mude minha persona para começar!</p>
                </div>
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
                <div class="avatar">${currentCharacter.emoji}</div>
                <div class="content">
                    <div class="sender-name">
                        ${currentCharacter.name}
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
            // Build messages with system prompt from character
            const apiMessages = [
                { role: 'system', content: currentCharacter.prompt },
                ...messages
            ];

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

    // Start
    init();

})();
