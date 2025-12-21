(function () {
    'use strict';

    // API Base URL
    const API_URL = 'https://jade-proxy.onrender.com/anything';

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

    // State
    let currentProvider = 'openrouter';
    let currentModel = PROVIDERS.openrouter.models[0].id;
    let messages = [];
    let isProcessing = false;

    // DOM Elements
    const chatbox = document.getElementById('chatbox');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const providerSelect = document.getElementById('provider-select');
    const modelSelect = document.getElementById('model-select');
    const modelBadge = document.getElementById('current-model-badge');
    const sidebar = document.getElementById('sidebar');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');

    // Initialize
    function init() {
        populateModels();
        updateModelBadge();
        setupEventListeners();
        appendWelcomeMessage();
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

        if (toggleSidebarBtn) {
            toggleSidebarBtn.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
        }
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
        }
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
        modelBadge.innerHTML = `
            <span style="color: ${provider.color}">●</span>
            ${provider.name}: ${model.name}
        `;
    }

    function appendWelcomeMessage() {
        const el = document.createElement('div');
        el.className = 'message bot';
        el.innerHTML = `
            <div class="avatar">🌐</div>
            <div class="content">
                <div class="sender-name">Chat Anything</div>
                <div class="text">
                    <p>Olá! Eu sou o <strong>Chat Anything</strong> - converse com qualquer modelo de IA!</p>
                    <p>Escolha um provider e modelo acima para começar. Modelos gratuitos do OpenRouter, Groq ultrarrápido, Cerebras potente e Mistral versátil.</p>
                </div>
            </div>
        `;
        chatbox.appendChild(el);
    }

    function appendMessage(sender, text, isTyping = false) {
        const isUser = sender === 'user';
        const el = document.createElement('div');
        el.className = `message ${isUser ? 'user' : 'bot'}`;

        const provider = PROVIDERS[currentProvider];
        const model = provider.models.find(m => m.id === currentModel) || provider.models[0];

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
                <div class="avatar" style="color: ${provider.color}">${provider.name.charAt(0)}</div>
                <div class="content">
                    <div class="sender-name">
                        ${model.name}
                        <span class="model-tag">${provider.name}</span>
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

    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message || isProcessing) return;

        isProcessing = true;
        sendBtn.disabled = true;

        // Add user message
        appendMessage('user', message);
        messages.push({ role: 'user', content: message });

        userInput.value = '';
        userInput.style.height = 'auto';

        // Add typing indicator
        const typingEl = appendMessage('bot', '', true);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: currentProvider,
                    model: currentModel,
                    messages: messages
                })
            });

            const data = await response.json();

            if (data.success && data.response) {
                messages.push({ role: 'assistant', content: data.response });
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
