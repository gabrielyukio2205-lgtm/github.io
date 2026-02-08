// CodeJade - Cursor AI Style Frontend

const API_BASE = 'https://madras1-jade-port.hf.space';

// Get JWT token from localStorage
function getAuthToken() {
    return localStorage.getItem('jade_token');
}

// Auth headers for all requests
function authHeaders() {
    const token = getAuthToken();
    if (!token) return { 'Content-Type': 'application/json' };
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// State
let editor = null;
let currentFile = null;
let currentRepo = null;
let openFiles = {};

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

// Check if user is logged in
function checkAuth() {
    const token = getAuthToken();
    if (!token) {
        addMessage('assistant', '⚠️ Você precisa fazer login para usar o CodeJade. <a href="/login">Login com GitHub</a>');
        return false;
    }
    return true;
}

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
        const res = await fetch(`${API_BASE}/codejade/status`, { headers: authHeaders() });
        const data = await res.json();
        if (data.sandbox || data.available) {
            statusBadge.className = 'status-badge online';
            statusText.textContent = 'E2B Online';
        } else {
            statusBadge.className = 'status-badge';
            statusText.textContent = 'Offline';
        }

        if (data.current_repo && !currentRepo) {
            currentRepo = data.current_repo;
            repoName.textContent = currentRepo;
            loadFilesFromR2();
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
    if (!checkAuth()) return;

    const repo = repoInput.value.trim();
    if (!repo) return;

    cloneModal.classList.add('hidden');
    addMessage('user', `Clone: ${repo}`);
    addMessage('tool', '⏳ Clonando repositório...');

    try {
        const res = await fetch(`${API_BASE}/codejade/clone`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ repo_url: repo })
        });
        const data = await res.json();

        if (data.success) {
            currentRepo = data.repo;
            repoName.textContent = currentRepo;
            addMessage('assistant', `✅ Clonado! ${data.files_count} arquivos salvos.`);
            loadFilesFromR2();
        } else {
            addMessage('assistant', `❌ Erro: ${data.error}`);
        }
    } catch (e) {
        addMessage('assistant', `❌ Erro: ${e.message}`);
    }
};

// Load files DIRECTLY from R2 (auth required)
async function loadFilesFromR2(path = '') {
    if (!currentRepo) {
        fileTree.innerHTML = '<div class="empty-state">Clone um repositório<br>para começar</div>';
        return;
    }

    if (!checkAuth()) return;

    try {
        const url = `${API_BASE}/codejade/files/${encodeURIComponent(currentRepo)}?path=${encodeURIComponent(path)}`;
        const res = await fetch(url, { headers: authHeaders() });
        const data = await res.json();

        if (!data.success) {
            fileTree.innerHTML = `<div class="empty-state">${data.error}</div>`;
            return;
        }

        fileTree.innerHTML = '';

        const files = data.files.sort((a, b) => {
            if (a.type === 'dir' && b.type !== 'dir') return -1;
            if (a.type !== 'dir' && b.type === 'dir') return 1;
            return a.name.localeCompare(b.name);
        });

        files.forEach(f => {
            const item = document.createElement('div');
            item.className = `file-item ${f.type === 'dir' ? 'folder' : ''}`;
            item.innerHTML = `${f.type === 'dir' ? '📁' : '📄'} ${f.name}`;
            item.onclick = () => {
                if (f.type === 'dir') {
                    loadFilesFromR2(path ? `${path}/${f.name}` : f.name);
                } else {
                    openFileFromR2(path ? `${path}/${f.name}` : f.name);
                }
            };
            fileTree.appendChild(item);
        });

        if (files.length === 0) {
            fileTree.innerHTML = '<div class="empty-state">Pasta vazia</div>';
        }
    } catch (e) {
        console.error('Load files error:', e);
        fileTree.innerHTML = `<div class="empty-state">Erro: ${e.message}</div>`;
    }
}

// Open file DIRECTLY from R2 (auth required)
async function openFileFromR2(filePath) {
    if (!currentRepo || !checkAuth()) return;

    if (openFiles[filePath]) {
        switchToFile(filePath);
        return;
    }

    try {
        const url = `${API_BASE}/codejade/file/${encodeURIComponent(currentRepo)}/${filePath}`;
        const res = await fetch(url, { headers: authHeaders() });
        const data = await res.json();

        if (!data.success) {
            addMessage('tool', `❌ ${data.error}`);
            return;
        }

        openFiles[filePath] = {
            content: data.content,
            modified: false
        };

        addTab(filePath);
        switchToFile(filePath);
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

    document.querySelectorAll('.tab').forEach(t => {
        t.classList.toggle('active', t.dataset.path === path);
    });

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
        // Send file content directly - backend does RAG processing
        const fileContent = (currentFile && openFiles[currentFile])
            ? openFiles[currentFile].content
            : null;

        const res = await fetch(`${API_BASE}/codejade/chat`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                message,
                repo: currentRepo,
                file: currentFile,
                file_content: fileContent
            })
        });
        const data = await res.json();

        const loading = chatMessages.querySelector('.message.tool:last-child');
        if (loading && loading.textContent.includes('⏳')) loading.remove();

        if (data.tools_used && data.tools_used.length > 0) {
            addMessage('tool', `⚡ ${data.tools_used.join(' → ')}`);

            // Check if any file was modified - refresh Monaco if needed
            const editTools = ['write_file', 'ast_edit', 'ast_rename'];
            const hasEdits = data.tools_used.some(t => editTools.some(e => t.includes(e)));

            if (hasEdits) {
                // Refresh file list
                await loadFilesFromR2();

                // If current file was edited, reload it
                if (currentFile && data.modified_files?.includes(currentFile)) {
                    await refreshCurrentFile();
                    addMessage('tool', '🔄 Arquivo atualizado no editor');
                }
            }
        }

        addMessage('assistant', data.response || 'OK');

        if (message.toLowerCase().includes('clone')) {
            setTimeout(loadFilesFromR2, 500);
        }
    } catch (e) {
        addMessage('assistant', `❌ Erro: ${e.message}`);
    } finally {
        sendBtn.disabled = false;
    }
}

// Refresh current file from R2 (after LLM edits)
async function refreshCurrentFile() {
    if (!currentFile || !currentRepo) return;

    try {
        const url = `${API_BASE}/codejade/file/${encodeURIComponent(currentRepo)}/${currentFile}`;
        const res = await fetch(url, { headers: authHeaders() });
        const data = await res.json();

        if (data.success && data.content) {
            openFiles[currentFile].content = data.content;
            openFiles[currentFile].modified = false;

            // Update Monaco if this is the active file
            if (editor) {
                editor.setValue(data.content);
            }
        }
    } catch (e) {
        console.error('Refresh file error:', e);
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
    chatMessages.innerHTML = '<div class="message assistant"><p>Chat limpo.</p></div>';
};

document.getElementById('refresh-files').onclick = () => loadFilesFromR2();

// Diff modal
const diffModal = document.getElementById('diff-modal');
document.getElementById('diff-btn').onclick = async () => {
    diffModal.classList.remove('hidden');
    document.getElementById('diff-content').textContent = 'Carregando...';

    try {
        const res = await fetch(`${API_BASE}/codejade/chat`, {
            method: 'POST',
            headers: authHeaders(),
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
    addMessage('tool', '⏳ Commit + Push...');

    try {
        const res = await fetch(`${API_BASE}/codejade/chat`, {
            method: 'POST',
            headers: authHeaders(),
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
checkAuth();
checkStatus();
setInterval(checkStatus, 30000);
