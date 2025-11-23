(function() {
    'use strict';

    const API_URL = 'https://jade-proxy.onrender.com/chat';
    
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

    function appendMessage(sender, textContent, isTyping = false) {
        const el = createMessageElement(sender, textContent, isTyping);
        chatbox.appendChild(el);
        chatbox.scrollTop = chatbox.scrollHeight;
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

        // User message
        if (imageInput.files.length > 0) {
            appendMessage('Você', `${message || ''} [Imagem Anexada]`);
            image_base64 = await fileToBase64(imageInput.files[0]);
            clearImagePreview();
        } else {
            appendMessage('Você', message);
        }
        userInput.value = '';

        // Bot typing
        const jadeTypingMessage = appendMessage('J.A.D.E.', '', true);

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

            updateBotMessage(jadeTypingMessage, botResponse);
            chatbox.scrollTop = chatbox.scrollHeight;

        } catch (err) {
            console.error(err);
            updateBotMessage(jadeTypingMessage, `Falha ao conectar com J.A.D.E. (${err.message})`);
        }
    }

    // Initialize the application
    setupEventListeners();

})();
