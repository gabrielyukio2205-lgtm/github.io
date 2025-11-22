const API_URL = 'https://jade-proxy.onrender.com/chat';
const chatbox = document.getElementById('chatbox');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const imageInput = document.getElementById('imageInput');
const imageBtn = document.getElementById('imageBtn');
const audioPlayer = document.getElementById('audioPlayer');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const removeImageBtn = document.getElementById('remove-image-btn');

imageBtn.addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', () => {
    if (imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreviewContainer.style.display = 'block';
        };
        reader.readAsDataURL(imageInput.files[0]);
    }
});
removeImageBtn.addEventListener('click', () => {
    imageInput.value = '';
    imagePreviewContainer.style.display = 'none';
});

function appendMessage(sender, textContent, isTyping = false){
  const senderClass = sender === 'Você' ? 'user' : 'bot';
  const el = document.createElement('div');
  el.className = `message ${senderClass} new-message`;
  let innerHTML = isTyping
    ? `<div class="sender">${sender}</div><div class="text"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`
    : `<div class="sender ${senderClass}">${sender}</div><div class="text">${escapeHtml(textContent)}</div>`;
  el.innerHTML = innerHTML;
  chatbox.appendChild(el);
  chatbox.scrollTop = chatbox.scrollHeight;
  setTimeout(() => el.classList.remove('new-message'), 400);
  return el;
}

function escapeHtml(s){ return s.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[ch])); }
function fileToBase64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve(reader.result); reader.onerror = error => reject(error); }); }

async function sendMessage(){
  const message = userInput.value.trim();
  let image_base64 = null;
  if (!message && imageInput.files.length === 0) return;

  if (imageInput.files.length > 0) {
    appendMessage('Você', `${message || ''} [Imagem Anexada]`);
    image_base64 = await fileToBase64(imageInput.files[0]);
    imageInput.value = '';
    imagePreviewContainer.style.display = 'none';
  } else {
    appendMessage('Você', message);
  }
  userInput.value = '';

  try {
    const jadeTypingMessage = appendMessage('J.A.D.E.', '', true);

    const resp = await fetch(API_URL, {
        method:'POST',
        // A CORREÇÃO MÁGICA ESTÁ AQUI:
        headers:{'Content-Type':'application/json'},
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
    } else { botResponse = `[Erro: ${json.error || 'Desconhecido'}]`; }

    if (botResponse === undefined) {
        botResponse = "[Erro de comunicação: O texto da resposta não foi encontrado.]";
    }

    jadeTypingMessage.innerHTML = `<div class="sender">J.A.D.E.</div><div class="text">${escapeHtml(botResponse)}</div>`;
  } catch (err) {
    console.error(err);
    const thinkingMsg = Array.from(chatbox.querySelectorAll('.message.bot')).pop();
    if(thinkingMsg && thinkingMsg.querySelector('.typing-indicator')){
      thinkingMsg.innerHTML = `<div class="sender">Erro do Sistema</div><div class="text">Falha ao conectar com J.A.D.E. (${err.message})</div>`;
    }
  }
}

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(); }});
