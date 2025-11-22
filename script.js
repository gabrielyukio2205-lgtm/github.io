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
        html = html.replace(/\*(.*?)\*/g, '<b>$1</b>');
        html = html.replace(/_(.*?)_/g, '<i>$1</i>');
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');
        return html;
    }

    function appendMessage(sender, textContent, isTyping = false) {
        const senderClass = sender === 'Você' ? 'user' : 'bot';
        const el = document.createElement('div');
        el.className = `message ${senderClass} new-message`;

        let innerHTML = isTyping
            ? `<div class="sender">${sender}</div><div class="text"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`
            : `<div class="sender ${senderClass}">${sender}</div><div class="text">${renderMarkdown(textContent)}</div>`;

        el.innerHTML = innerHTML;
        chatbox.appendChild(el);
        chatbox.scrollTop = chatbox.scrollHeight;

        setTimeout(() => el.classList.remove('new-message'), 400);
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

    async function sendMessage() {
        const message = userInput.value.trim();
        let image_base64 = null;
        if (!message && imageInput.files.length === 0) return;

        if (imageInput.files.length > 0) {
            appendMessage('Você', `${message || ''} [Imagem Anexada]`);
            image_base64 = await fileToBase64(imageInput.files[0]);
            clearImagePreview();
        } else {
            appendMessage('Você', message);
        }
        userInput.value = '';

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

            jadeTypingMessage.innerHTML = `<div class="sender">J.A.D.E.</div><div class="text">${renderMarkdown(botResponse)}</div>`;
        } catch (err) {
            console.error(err);
            const thinkingMsg = Array.from(chatbox.querySelectorAll('.message.bot')).pop();
            if (thinkingMsg && thinkingMsg.querySelector('.typing-indicator')) {
                thinkingMsg.innerHTML = `<div class="sender">Erro do Sistema</div><div class="text">Falha ao conectar com J.A.D.E. (${err.message})</div>`;
            }
        }
    }

    // Initialize the application
    setupEventListeners();

})();
