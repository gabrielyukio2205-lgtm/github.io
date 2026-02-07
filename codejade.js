// CodeJade - Cursor AI Style Frontend

const API_BASE = window.location.hostname === 'localhost' ? '' : '';

// State
let editor = null;
let currentFile = null;
let openFiles = {};
let repoCloned = false;

// Elements
const statusBadge = document.getElementById('status-badge');
const statusText = document.getElementById('status-text');
const repoBtn = document.getElementById('repo-btn');
const repoName = document.getElementById('repo-name');
const fileTree = document.getElementById('file-tree');
const editorContainer = document.getElementById('editor-container');
const monacoContainer = document.getElementById('monaco-editor');
const welcomeEditor = document.getElementById('welcome-editor');
const editorTabs = document.getElementById('editor-tabs');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

// Initialize Monaco
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
require(['vs/editor/editor.main'], function () {
    const isDark = document.body.dataset.theme === 'dark';
    editor = monaco.editor.create(monacoContainer, {
        value: '',
        language: 'python',
        theme: isDark ? 'vs-dark' : 'vs',
        fontSize: 13,
        fontFamily: "'JetBrains Mono', monospace",
        minimap: { enabled: true },
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
    });
    console.log('Monaco initialized');
});

// Check status
async function checkStatus() {
    try {
        const res = await fetch(`${API_BASE}/codejade/status`);
        const data = await res.json();
        if (data.sandbox || data.available) {
            statusBadge.className = 'status-badge online';
            statusText.textContent = 'E2B Online';
        } else {
            statusBadge.className = 'status-badge';
            statusText.textContent = 'Sandbox Offline';
        }
    } catch (e) {
        statusBadge.className = 'status-badge error';
        statusText.textContent = 'Desconectado';
    }
}

// Clone modal
const cloneModal = document.getElementById('clone-modal');
const repoInput = document.getElementById('repo-input');

repoBtn.onclick = () => cloneModal.classList.remove('hidden');
document.getElementById('clone-close').onclick = () => cloneModal.classList.add('hidden');
document.getElementById('clone-cancel').onclick = () => cloneModal.classList.add('hidden');

document.getElementById('clone-confirm').onclick = async () => {
    const repo = repoInput.value.trim();
    if (!repo) return;

    cloneModal.classList.add('hidden');
    addMessage('user', `Clone: ${repo}`);
    addMessage('tool', '⏳ Clonando repositório...');

    try {
        const res = await fetch(`${API_BASE}/codejade/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `clone o repositório ${repo}` })
        });
        const data = await res.json();
        addMessage('assistant', data.response || 'Repo clonado!');
        repoName.textContent = repo.split('/').pop();
        repoCloned = true;
        loadFiles('');
    } catch (e) {
        addMessage('assistant', `❌ Erro: ${e.message}`);
    }
};

// Load files
async function loadFiles(path = '') {
    try {
        const res = await fetch(`${API_BASE}/codejade/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `liste os arquivos em ${path || 'raiz'}` })
        });
        const data = await res.json();

        // Parse file list from response
        const lines = (data.response || '').split('\n');
        fileTree.innerHTML = '';

        lines.forEach(line => {
            const match = line.match(/(📁|📄)\s*(.+)/);
            if (match) {
                const isDir = match[1] === '📁';
                const name = match[2].trim();
                const item = document.createElement('div');
                item.className = `file-item ${isDir ? 'folder' : ''}`;
                item.innerHTML = `${match[1]} ${name}`;
                item.onclick = () => {
                    if (isDir) {
                        loadFiles(path ? `${path}/${name}` : name);
                    } else {
                        openFile(path ? `${path}/${name}` : name);
                    }
                };
                fileTree.appendChild(item);
            }
        });

        if (fileTree.children.length === 0) {
            fileTree.innerHTML = '<div class="empty-state">Nenhum arquivo</div>';
        }
    } catch (e) {
        console.error('Load files error:', e);
    }
}

// Open file
async function openFile(path) {
    if (openFiles[path]) {
        switchToFile(path);
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/codejade/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `leia o arquivo ${path}` })
        });
        const data = await res.json();

        openFiles[path] = {
            content: data.response || '',
            modified: false
        };

        addTab(path);
        switchToFile(path);
    } catch (e) {
        console.error('Open file error:', e);
    }
}

// Add tab
function addTab(path) {
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.path = path;
    tab.innerHTML = `<span>${path.split('/').pop()}</span>`;
    tab.onclick = () => switchToFile(path);
    editorTabs.appendChild(tab);
}

// Switch to file
function switchToFile(path) {
    currentFile = path;

    // Update tabs
    document.querySelectorAll('.tab').forEach(t => {
        t.classList.toggle('active', t.dataset.path === path);
    });

    // Show editor
    welcomeEditor.style.display = 'none';
    monacoContainer.style.display = 'block';

    if (editor && openFiles[path]) {
        const ext = path.split('.').pop();
        const langMap = { py: 'python', js: 'javascript', ts: 'typescript', html: 'html', css: 'css', json: 'json', md: 'markdown' };
        const language = langMap[ext] || 'plaintext';

        monaco.editor.setModelLanguage(editor.getModel(), language);
        editor.setValue(openFiles[path].content);
    }
}

// Chat
async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    chatInput.value = '';
    sendBtn.disabled = true;
    addMessage('user', message);
    addMessage('tool', '⏳ Processando...');

    try {
        const res = await fetch(`${API_BASE}/codejade/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        const data = await res.json();

        // Remove loading message
        const loadingMsg = chatMessages.querySelector('.message.tool:last-child');
        if (loadingMsg && loadingMsg.textContent.includes('⏳')) {
            loadingMsg.remove();
        }

        // Add tools used
        if (data.tools_used && data.tools_used.length > 0) {
            addMessage('tool', `⚡ ${data.tools_used.join(' → ')}`);
        }

        addMessage('assistant', data.response || 'OK');

        // Refresh files if github operation
        if (message.toLowerCase().includes('clone') || message.toLowerCase().includes('commit')) {
            loadFiles('');
        }
    } catch (e) {
        addMessage('assistant', `❌ Erro: ${e.message}`);
    } finally {
        sendBtn.disabled = false;
    }
}

function addMessage(type, content) {
    const msg = document.createElement('div');
    msg.className = `message ${type}`;
    msg.innerHTML = formatMessage(content);
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatMessage(text) {
    // Simple markdown-like formatting
    return text
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
}

// Event listeners
sendBtn.onclick = sendMessage;
chatInput.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
};

document.getElementById('clear-chat').onclick = () => {
    chatMessages.innerHTML = '<div class="message assistant"><p>Chat limpo. Como posso ajudar?</p></div>';
};

document.getElementById('refresh-files').onclick = () => loadFiles('');

// Diff modal
const diffModal = document.getElementById('diff-modal');
document.getElementById('diff-btn').onclick = async () => {
    diffModal.classList.remove('hidden');
    document.getElementById('diff-content').textContent = '(carregando...)';

    try {
        const res = await fetch(`${API_BASE}/codejade/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'mostre o git diff' })
        });
        const data = await res.json();
        document.getElementById('diff-content').textContent = data.response || '(sem mudanças)';
    } catch (e) {
        document.getElementById('diff-content').textContent = `Erro: ${e.message}`;
    }
};
document.getElementById('diff-close').onclick = () => diffModal.classList.add('hidden');

// Commit modal
const commitModal = document.getElementById('commit-modal');
document.getElementById('commit-btn').onclick = () => commitModal.classList.remove('hidden');
document.getElementById('commit-close').onclick = () => commitModal.classList.add('hidden');
document.getElementById('commit-cancel').onclick = () => commitModal.classList.add('hidden');

document.getElementById('commit-confirm').onclick = async () => {
    const message = document.getElementById('commit-message').value.trim() || 'Update via CodeJade';
    commitModal.classList.add('hidden');

    addMessage('user', `Commit: ${message}`);
    addMessage('tool', '⏳ Fazendo commit e push...');

    try {
        const res = await fetch(`${API_BASE}/codejade/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `faça commit com mensagem "${message}" e push` })
        });
        const data = await res.json();
        addMessage('assistant', data.response || 'Commit realizado!');
    } catch (e) {
        addMessage('assistant', `❌ Erro: ${e.message}`);
    }
};

// Theme toggle
document.getElementById('theme-toggle').onclick = () => {
    const isDark = document.body.dataset.theme === 'dark';
    document.body.dataset.theme = isDark ? 'light' : 'dark';
    document.getElementById('theme-toggle').textContent = isDark ? '☀️' : '🌙';

    if (editor) {
        monaco.editor.setTheme(isDark ? 'vs' : 'vs-dark');
    }
};

// Init
checkStatus();
setInterval(checkStatus, 30000);
