(function() {
    'use strict';

    const API_URL = 'https://jade-proxy.onrender.com/chat';
    
    // State Management
    let conversations = [];
    let currentChatId = null;
    
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
    
    // Sidebar Elements
    const sidebar = document.getElementById('sidebar');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const chatHistoryList = document.getElementById('chat-history-list');

    function setupEventListeners() {
        sendBtn.addEventListener('click', sendMessage);
        userInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        imageBtn.addEventListener('click', () => imageInput.click());
        imageInput.addEventListener('change', handleImageSelection);
        removeImageBtn.addEventListener('click', clearImagePreview);
        
        // Sidebar Events
        toggleSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));
        mobileMenuBtn.addEventListener('click', () => sidebar.classList.add('open'));
        newChatBtn.addEventListener('click', startNewChat);
    }

    // --- State & Storage ---

    function init() {
        loadConversations();
        if (conversations.length > 0) {
            // Load most recent chat or create new if empty
            loadChat(conversations[0].id);
        } else {
            startNewChat();
        }
        renderHistoryList();
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
            timestamp: Date.now()
        };
        conversations.unshift(newChat); // Add to top
        saveConversations();
        
        // Clear UI
        chatbox.innerHTML = '';
        appendWelcomeMessage();
        
        // Close mobile sidebar if open
        sidebar.classList.remove('open');
    }

    function loadChat(id) {
        const chat = conversations.find(c => c.id === id);
        if (!chat) return;

        currentChatId = id;
        chatbox.innerHTML = '';
        
        // If empty (just created), show welcome
        if (chat.messages.length === 0) {
            appendWelcomeMessage();
        } else {
            chat.messages.forEach(msg => {
                appendMessage(msg.sender, msg.text, false, false); // false = not typing, false = don't save (already saved)
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
            
            // Auto-title if it's the first user message
            if (sender === 'Você' && chat.title === 'Nova conversa') {
                chat.title = text.length > 30 ? text.substring(0, 30) + '...' : text;
            }
            
            // Move to top of list
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
                if (conversations.length > 0) {
                    loadChat(conversations[0].id);
                } else {
                    startNewChat();
                }
            }
        }
    }

    // --- UI Rendering ---

    function renderHistoryList() {
        chatHistoryList.innerHTML = '';
        conversations.forEach(chat => {
            const div = document.createElement('div');
            div.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;
            div.textContent = chat.title;
            div.onclick = () => loadChat(chat.id);
            
            // Optional: Delete button (hidden by default, maybe add on hover later)
            // For now simple click to switch
            
            chatHistoryList.appendChild(div);
        });
    }

    function appendWelcomeMessage() {
        const el = document.createElement('div');
        el.className = 'message bot welcome-message';
        el.innerHTML = `
            <div class="avatar">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>
            </div>
            <div class="content">
            <div class="sender-name">J.A.D.E.</div>
            <div class="text">Olá. Eu sou J.A.D.E., sua assistente de inteligência artificial avançada. Como posso ajudar você hoje?</div>
            </div>
        `;
        chatbox.appendChild(el);
    }

    function handleImageSelection() {
        if (imageInput.files && imageInput.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreviewContainer.classList.remove('hidden');
            };
            reader.readAsDataURL(imageInput.files[0]);
        }
    }

    function clearImagePreview() {
        imageInput.value = '';
        imagePreviewContainer.classList.add('hidden');
    }

    function renderMarkdown(text) {
        let html = escapeHtml(text);
        html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>'); // Bold with **
        html = html.replace(/\*(.*?)\*/g, '<b>$1</b>'); // Bold with *
        html = html.replace(/_(.*?)_/g, '<i>$1</i>');
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');
        html = html.replace(/\n/g, '<br>');
        return html;
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
            textHTML = `<div class="text"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
        } else {
            textHTML = `<div class="text">${renderMarkdown(content)}</div>`;
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

    function escapeHtml(s) {
        return s.replace(/[&<>"']/g, ch => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[ch]));
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
        }
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        let image_base64 = null;
        if (!message && imageInput.files.length === 0) return;

        // Ensure we have a chat selected (should handle edge cases)
        if (!currentChatId) startNewChat();

        // User message
        if (imageInput.files.length > 0) {
            const msgText = `${message || ''} [Imagem Anexada]`;
            appendMessage('Você', msgText);
            image_base64 = await fileToBase64(imageInput.files[0]);
            clearImagePreview();
        } else {
            appendMessage('Você', message);
        }
        userInput.value = '';

        // Bot typing (don't save yet)
        const jadeTypingMessage = appendMessage('J.A.D.E.', '', true, false);

        try {
            const resp = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_input: message, image_base64: image_base64 })
            });

            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            
            const json = await resp.json();
            let botResponse;

            if (json.success) {
                botResponse = json.bot_response;
                if (json.audio_base64) {
                    audioPlayer.src = `data:audio/mpeg;base64,${json.audio_base64}`;
                    audioPlayer.play();
                }
            } else {
                botResponse = `[Erro: ${json.error || 'Desconhecido'}]`;
            }
            
            if (botResponse === undefined) {
                botResponse = "[Erro de comunicação: O texto da resposta não foi encontrado.]";
            }

            // Update typing message to real text
            updateBotMessage(jadeTypingMessage, botResponse);
            
            // Save bot response to history
            saveMessageToCurrentChat('J.A.D.E.', botResponse);
            
            chatbox.scrollTop = chatbox.scrollHeight;

        } catch (err) {
            console.error(err);
            const errorText = `Falha ao conectar com J.A.D.E. (${err.message})`;
            updateBotMessage(jadeTypingMessage, errorText);
            saveMessageToCurrentChat('J.A.D.E.', errorText);
        }
    }

    // Initialize the application
    setupEventListeners();
    init();

})();
