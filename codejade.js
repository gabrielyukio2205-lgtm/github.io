// CodeJade - Cursor AI Style Frontend

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:7860'
    : 'https://madras1-jade-port.hf.space';
localStorage.removeItem('jade_token');
const authState = {
    authenticated: false,
    csrfToken: sessionStorage.getItem('jade_csrf_token') || '',
    user: null
};

function getCsrfToken() {
    return authState.csrfToken || sessionStorage.getItem('jade_csrf_token') || '';
}

// Auth headers for all requests
function authHeaders(method = 'GET') {
    const normalizedMethod = method.toUpperCase();
    const headers = {};

    if (normalizedMethod !== 'GET' && normalizedMethod !== 'HEAD') {
        headers['Content-Type'] = 'application/json';
        headers['X-CSRF-Token'] = getCsrfToken();
    }

    return headers;
}

function apiFetch(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const headers = {
        ...authHeaders(method),
        ...(options.headers || {})
    };

    return fetch(url, {
        ...options,
        method,
        credentials: 'include',
        headers
    });
}

async function refreshAuthState() {
    try {
        const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
        const data = await res.json();

        authState.authenticated = !!data.authenticated;
        authState.user = data.user || null;
        authState.csrfToken = data.csrf_token || '';

        if (authState.csrfToken) {
            sessionStorage.setItem('jade_csrf_token', authState.csrfToken);
        } else {
            sessionStorage.removeItem('jade_csrf_token');
        }

        if (data.user?.id) {
            sessionStorage.setItem('jade_auth_user_id', `github_${data.user.id}`);
        } else {
            sessionStorage.removeItem('jade_auth_user_id');
        }
    } catch (e) {
        authState.authenticated = false;
        authState.user = null;
        authState.csrfToken = '';
        sessionStorage.removeItem('jade_csrf_token');
        sessionStorage.removeItem('jade_auth_user_id');
    }

    return authState.authenticated;
}

// State
let editor = null;
let currentFile = null;
let currentRepo = null;
let openFiles = {};
let chatHistory = []; // Current chat messages
let currentChatId = null; // Current chat ID

// ========== MULTI-CHAT HISTORY PER REPO ==========
// Cada repo pode ter MÚLTIPLOS históricos de chat
// "Novo Chat" salva o atual e cria um novo
// Painel de sessões mostra todos os chats do repo atual

// Generate chat ID
function generateChatId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Get all repos that have saved chats
function getAllReposWithChats() {
    return JSON.parse(localStorage.getItem('codejade_all_repos') || '[]');
}

// Add repo to global list
function addRepoToGlobalList(repoName) {
    let repos = getAllReposWithChats();
    if (!repos.find(r => r.name === repoName)) {
        repos.unshift({ name: repoName, updatedAt: Date.now() });
        localStorage.setItem('codejade_all_repos', JSON.stringify(repos.slice(0, 50)));
    }
}

// Update repo in global list
function updateRepoInGlobalList(repoName) {
    let repos = getAllReposWithChats();
    const idx = repos.findIndex(r => r.name === repoName);
    if (idx >= 0) {
        repos[idx].updatedAt = Date.now();
    } else {
        repos.unshift({ name: repoName, updatedAt: Date.now() });
    }
    localStorage.setItem('codejade_all_repos', JSON.stringify(repos.slice(0, 50)));
}

// Get chats for ANY repo (not just current)
function getChatsForRepo(repoName) {
    const key = `codejade_chats_${repoName}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
}

// Get all chats for current repo
function getRepoChats() {
    if (!currentRepo) return [];
    return getChatsForRepo(currentRepo);
}

// Save chat list for repo
function saveRepoChats(chats) {
    if (!currentRepo) return;
    localStorage.setItem(`codejade_chats_${currentRepo}`, JSON.stringify(chats));
    updateRepoInGlobalList(currentRepo);
}

// Save Indicator
function showSaveIndicator(state = 'saved') {
    const indicator = document.getElementById('save-indicator');
    if (!indicator) return;
    indicator.className = 'save-indicator ' + state;
    if (state === 'saved') setTimeout(() => indicator.className = 'save-indicator', 2000);
}

// Save current chat
function saveChatHistory() {
    if (!currentRepo || !currentChatId || chatHistory.length === 0) return;
    showSaveIndicator('saving');

    // Save messages
    localStorage.setItem(`codejade_msg_${currentRepo}_${currentChatId}`, JSON.stringify(chatHistory.slice(-100)));

    // Update chat metadata in list
    let chats = getRepoChats();
    const idx = chats.findIndex(c => c.id === currentChatId);
    const chatData = {
        id: currentChatId,
        title: chatHistory[0]?.content?.substring(0, 40) || 'Chat',
        count: chatHistory.length,
        updatedAt: Date.now()
    };

    if (idx >= 0) {
        chats[idx] = chatData;
    } else {
        chats.unshift(chatData);
    }

    saveRepoChats(chats.slice(0, 30)); // Max 30 chats per repo
    setTimeout(() => showSaveIndicator('saved'), 300);
}

// Load chat by ID
function loadChatById(chatId) {
    if (!currentRepo) return;
    currentChatId = chatId;

    const saved = localStorage.getItem(`codejade_msg_${currentRepo}_${chatId}`);
    chatMessages.innerHTML = '';

    if (saved) {
        try {
            chatHistory = JSON.parse(saved);
            chatHistory.forEach(msg => renderMessage(msg.type, msg.content, false));
            showSaveIndicator('saved');
        } catch (e) {
            chatHistory = [];
            renderWelcomeMessage();
        }
    } else {
        chatHistory = [];
        renderWelcomeMessage();
    }
}

// Load most recent chat or create new
function loadChatHistory() {
    if (!currentRepo) return;

    const chats = getRepoChats();
    if (chats.length > 0) {
        // Load most recent
        loadChatById(chats[0].id);
    } else {
        // Create first chat for repo
        startNewChat();
    }
}

// Start new chat (saves current first)
function startNewChat() {
    // Save current chat if exists
    if (currentChatId && chatHistory.length > 0) {
        saveChatHistory();
    }

    // Create new
    currentChatId = generateChatId();
    chatHistory = [];
    chatMessages.innerHTML = '';
    renderWelcomeMessage();

    // Add to chats list
    let chats = getRepoChats();
    chats.unshift({
        id: currentChatId,
        title: 'Novo chat',
        count: 0,
        updatedAt: Date.now()
    });
    saveRepoChats(chats.slice(0, 30));
}

// Delete chat
function deleteChat(chatId) {
    if (!currentRepo) return;
    localStorage.removeItem(`codejade_msg_${currentRepo}_${chatId}`);
    let chats = getRepoChats().filter(c => c.id !== chatId);
    saveRepoChats(chats);
}

// Welcome message
function renderWelcomeMessage() {
    chatMessages.innerHTML = `
        <div class="message assistant welcome-msg">
            <div class="msg-icon">🤖</div>
            <div class="msg-content">
                <strong>CodeJade</strong>
                <p>Olá! Me peça para editar código.</p>
            </div>
        </div>
    `;
}

// Clear current chat
function clearChatHistory() {
    if (currentChatId) {
        deleteChat(currentChatId);
    }
    startNewChat();
}

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

// Check if user is logged in and update UI accordingly
function checkAuth() {
    const loginBanner = document.getElementById('login-banner');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');

    if (!authState.authenticated) {
        // Show login banner, hide repo name
        if (loginBanner) loginBanner.classList.remove('hidden');
        if (repoName) repoName.textContent = 'Não conectado';

        // Show nice message instead of adding to chat
        fileTree.innerHTML = `
            <div class="unauthorized-msg">
                <div class="lock-icon">🔐</div>
                <p>Faça login para ver seus repositórios</p>
                <a href="login.html">Entrar com GitHub</a>
            </div>
        `;

        // Disable input
        if (chatInput) chatInput.disabled = true;
        if (sendBtn) sendBtn.disabled = true;

        return false;
    }

    // User is logged in
    if (loginBanner) loginBanner.classList.add('hidden');
    if (chatInput) chatInput.disabled = false;
    if (sendBtn) sendBtn.disabled = false;

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
        const res = await apiFetch(`${API_BASE}/codejade/status`);
        const data = await res.json();
        if (data.sandbox || data.available) {
            statusBadge.className = 'status-badge online';
            statusText.textContent = 'E2B Online';
        } else {
            statusBadge.className = 'status-badge';
            statusText.textContent = 'Offline';
        }

        if (typeof data.authenticated === 'boolean') {
            authState.authenticated = data.authenticated;
            if (!data.authenticated) {
                authState.user = null;
                authState.csrfToken = '';
                sessionStorage.removeItem('jade_csrf_token');
                sessionStorage.removeItem('jade_auth_user_id');
                checkAuth();
            }
        }

        if (data.current_repo && !currentRepo) {
            currentRepo = data.current_repo;
            repoName.textContent = currentRepo;
            loadChatHistory(); // Restore chat history for this repo
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

    // Save current chat before switching repos
    if (currentRepo && chatHistory.length > 0) {
        saveChatHistory();
    }

    // Clear current chat
    chatHistory = [];
    chatMessages.innerHTML = '';

    // Show clone message
    addMessage('user', `Clone: ${repo}`, false);
    addMessage('tool', '⏳ Clonando repositório...', false);

    try {
        const res = await apiFetch(`${API_BASE}/codejade/clone`, {
            method: 'POST',
            body: JSON.stringify({ repo_url: repo })
        });
        const data = await res.json();

        if (data.success) {
            // Switch to new repo
            currentRepo = data.repo;
            repoName.textContent = currentRepo;

            // Remove loading message
            const loading = chatMessages.querySelector('.message.tool:last-child');
            if (loading && loading.textContent.includes('⏳')) loading.remove();

            // Start fresh chat for this repo
            chatHistory = [];
            addMessage('assistant', `✅ Clonado ${data.repo}! ${data.files_count} arquivos. O que deseja fazer?`);

            loadFilesFromR2();
        } else {
            addMessage('assistant', `❌ Erro: ${data.error}`);
            // Restore previous repo if clone failed
            if (previousRepo) {
                currentRepo = previousRepo;
                repoName.textContent = previousRepo;
            }
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
        const res = await apiFetch(url);
        const data = await res.json();

        if (!data.success) {
            fileTree.innerHTML = `<div class="empty-state">${data.error}</div>`;
            return;
        }

        fileTree.innerHTML = '';

        // Add back button if in subfolder
        if (path) {
            const backBtn = document.createElement('div');
            backBtn.className = 'file-item folder back-btn';
            backBtn.innerHTML = '⬅️ .. (voltar)';
            backBtn.onclick = () => {
                const parentPath = path.includes('/')
                    ? path.substring(0, path.lastIndexOf('/'))
                    : '';
                loadFilesFromR2(parentPath);
            };
            fileTree.appendChild(backBtn);
        }

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
            fileTree.innerHTML += '<div class="empty-state">Pasta vazia</div>';
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
        const res = await apiFetch(url);
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

// Add tab with close button
function addTab(path) {
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.path = path;
    tab.innerHTML = `
        <span class="tab-name">${path.split('/').pop()}</span>
        <span class="tab-close" title="Fechar">×</span>
    `;

    // Click on tab name to switch
    tab.querySelector('.tab-name').onclick = (e) => {
        e.stopPropagation();
        switchToFile(path);
    };

    // Click on X to close
    tab.querySelector('.tab-close').onclick = (e) => {
        e.stopPropagation();
        closeTab(path);
    };

    editorTabs.appendChild(tab);
}

// Close tab
function closeTab(path) {
    // Remove from openFiles
    delete openFiles[path];

    // Remove tab element
    const tab = editorTabs.querySelector(`[data-path="${path}"]`);
    if (tab) tab.remove();

    // If this was the current file, switch to another or show welcome
    if (currentFile === path) {
        const remainingTabs = Object.keys(openFiles);
        if (remainingTabs.length > 0) {
            switchToFile(remainingTabs[remainingTabs.length - 1]);
        } else {
            currentFile = null;
            welcomeEditor.style.display = 'flex';
            monacoContainer.style.display = 'none';
        }
    }
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

        const res = await apiFetch(`${API_BASE}/codejade/chat`, {
            method: 'POST',
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

        // Check if response contains a plan that needs approval
        if (data.pending_plan && data.pending_plan.length > 0) {
            addMessage('assistant', '📋 O agente elaborou um plano. Revise antes de executar:');
            showPlanApproval(data.pending_plan);
            return;
        }

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

// Refresh current file from R2 (after LLM edits) with visual diff
async function refreshCurrentFile() {
    if (!currentFile || !currentRepo) return;

    try {
        const url = `${API_BASE}/codejade/file/${encodeURIComponent(currentRepo)}/${currentFile}`;
        const res = await apiFetch(url);
        const data = await res.json();

        if (data.success && data.content) {
            const oldContent = openFiles[currentFile]?.content || '';
            const newContent = data.content;

            // Show visual diff if content changed
            if (oldContent && oldContent !== newContent) {
                showVisualDiff(currentFile, oldContent, newContent);
            }

            openFiles[currentFile].content = newContent;
            openFiles[currentFile].modified = false;

            // Update Monaco if this is the active file
            if (editor) {
                editor.setValue(newContent);
            }
        }
    } catch (e) {
        console.error('Refresh file error:', e);
    }
}

// Show visual diff in chat
function showVisualDiff(filename, oldContent, newContent) {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    let diffHtml = `<div class="diff-container">`;
    diffHtml += `<div class="diff-header"><span>📝 ${filename}</span><span class="status-chip done">Atualizado</span></div>`;
    diffHtml += `<div class="diff-content">`;

    // Simple line-by-line diff (first 20 lines changed)
    let changesShown = 0;
    const maxChanges = 10;

    for (let i = 0; i < Math.max(oldLines.length, newLines.length) && changesShown < maxChanges; i++) {
        const oldLine = oldLines[i] || '';
        const newLine = newLines[i] || '';

        if (oldLine !== newLine) {
            if (oldLine) {
                diffHtml += `<span class="diff-line diff-remove">- ${escapeHtml(oldLine)}</span>`;
            }
            if (newLine) {
                diffHtml += `<span class="diff-line diff-add">+ ${escapeHtml(newLine)}</span>`;
            }
            changesShown++;
        }
    }

    if (changesShown >= maxChanges) {
        diffHtml += `<span class="diff-line" style="color: var(--text-secondary)">... mais mudanças</span>`;
    }

    diffHtml += `</div></div>`;

    // Add to chat as custom HTML
    const msg = document.createElement('div');
    msg.className = 'message assistant';
    msg.innerHTML = diffHtml;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Render message to DOM (without saving to history)
function renderMessage(type, content, scroll = true) {
    const msg = document.createElement('div');
    msg.className = `message ${type}`;
    msg.innerHTML = formatMessage(content);
    chatMessages.appendChild(msg);
    if (scroll) chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Add message to chat (and save to history)
function addMessage(type, content, persist = true) {
    renderMessage(type, content);

    // Save to history (skip temporary messages like loading)
    if (persist && !content.includes('⏳')) {
        chatHistory.push({ type, content, timestamp: Date.now() });
        saveChatHistory();
    }
}

function formatMessage(text) {
    // Handle code blocks
    text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>');
    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bold
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Line breaks
    text = text.replace(/\n/g, '<br>');
    return text;
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
    clearChatHistory();
    chatMessages.innerHTML = '';
    addMessage('system', '🗑️ Chat limpo', false);
};

document.getElementById('refresh-files').onclick = () => loadFilesFromR2();

// Diff modal
const diffModal = document.getElementById('diff-modal');
document.getElementById('diff-btn').onclick = async () => {
    diffModal.classList.remove('hidden');
    document.getElementById('diff-content').textContent = 'Carregando...';

    try {
        const res = await apiFetch(`${API_BASE}/codejade/chat`, {
            method: 'POST',
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
        const res = await apiFetch(`${API_BASE}/codejade/chat`, {
            method: 'POST',
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

// Plan Approval Modal (Jules-style)
const planModal = document.getElementById('plan-modal');
const planStepsContainer = document.getElementById('plan-steps');
let pendingPlan = null;

function showPlanApproval(plan) {
    pendingPlan = plan;
    planStepsContainer.innerHTML = '';

    plan.forEach((step, idx) => {
        const stepEl = document.createElement('div');
        stepEl.className = 'plan-step pending';
        stepEl.innerHTML = `
            <div class="plan-step-number">${idx + 1}</div>
            <div class="plan-step-content">
                <div>${step.action || step.description || 'Ação'}</div>
                ${step.tool ? `<div class="plan-step-tool">${step.tool}(${JSON.stringify(step.args || {}).substring(0, 50)}...)</div>` : ''}
            </div>
        `;
        planStepsContainer.appendChild(stepEl);
    });

    planModal.classList.remove('hidden');
}

document.getElementById('plan-close').onclick = () => {
    planModal.classList.add('hidden');
    pendingPlan = null;
};

document.getElementById('plan-cancel').onclick = () => {
    planModal.classList.add('hidden');
    addMessage('system', '❌ Plano cancelado pelo usuário');
    pendingPlan = null;
};

document.getElementById('plan-approve').onclick = async () => {
    if (!pendingPlan) return;

    planModal.classList.add('hidden');
    addMessage('tool', '⏳ Executando plano aprovado...');

    try {
        // Execute the approved plan
        const res = await apiFetch(`${API_BASE}/codejade/chat`, {
            method: 'POST',
            body: JSON.stringify({
                message: `execute o plano aprovado`,
                repo: currentRepo,
                approved_plan: pendingPlan
            })
        });
        const data = await res.json();

        const loading = chatMessages.querySelector('.message.tool:last-child');
        if (loading && loading.textContent.includes('⏳')) loading.remove();

        if (data.tools_used && data.tools_used.length > 0) {
            addMessage('tool', `✅ ${data.tools_used.join(' → ')}`);
            await loadFilesFromR2();
            if (currentFile && data.modified_files?.includes(currentFile)) {
                await refreshCurrentFile();
            }
        }

        addMessage('assistant', data.response || 'Plano executado com sucesso!');
    } catch (e) {
        addMessage('assistant', `❌ Erro: ${e.message}`);
    }

    pendingPlan = null;
};

// ========== CHAT HISTORY PANEL ==========
// Shows all saved chats for CURRENT REPO

function loadSessionsList() {
    const sessionsList = document.getElementById('sessions-list');
    if (!sessionsList) return;

    const allRepos = getAllReposWithChats();

    if (allRepos.length === 0 && !currentRepo) {
        sessionsList.innerHTML = '<div class="no-sessions">Clone um repositório primeiro</div>';
        return;
    }

    // Build hierarchical HTML
    let html = '';

    // Add current repo first if it exists and has chats
    if (currentRepo) {
        const currentChats = getRepoChats();
        html += buildRepoSection(currentRepo, currentChats, true);
    }

    // Add other repos
    allRepos.forEach(r => {
        if (r.name !== currentRepo) {
            const chats = getChatsForRepo(r.name);
            if (chats.length > 0) {
                html += buildRepoSection(r.name, chats, false);
            }
        }
    });

    if (!html) {
        sessionsList.innerHTML = '<div class="no-sessions">Nenhum histórico de chat</div>';
        return;
    }

    sessionsList.innerHTML = html;

    // Repo click handlers (to expand/switch)
    sessionsList.querySelectorAll('.repo-header').forEach(header => {
        header.onclick = () => {
            const repoName = header.dataset.repo;
            const chatsList = header.nextElementSibling;

            // If clicking different repo, switch to it
            if (repoName !== currentRepo) {
                // Save current chat first
                if (chatHistory.length > 0) saveChatHistory();

                // Switch repo
                currentRepo = repoName;
                repoName && (document.getElementById('repo-name').textContent = repoName);
                loadChatHistory();
                loadFilesFromR2();
                loadSessionsList(); // Refresh to show new active
            } else {
                // Toggle expand for current repo
                chatsList?.classList.toggle('hidden');
            }
        };
    });

    // Chat click handlers
    sessionsList.querySelectorAll('.chat-item').forEach(item => {
        item.onclick = (e) => {
            if (e.target.classList.contains('chat-delete')) return;
            e.stopPropagation();

            const repoName = item.dataset.repo;
            const chatId = item.dataset.chatId;

            // Save current first
            if (chatHistory.length > 0) saveChatHistory();

            // Switch to repo if different
            if (repoName !== currentRepo) {
                currentRepo = repoName;
                document.getElementById('repo-name').textContent = repoName;
                loadFilesFromR2();
            }

            // Load chat
            loadChatById(chatId);
            document.getElementById('chat-sessions').classList.add('hidden');
        };
    });

    // Delete handlers
    sessionsList.querySelectorAll('.chat-delete').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const repoName = btn.dataset.repo;
            const chatId = btn.dataset.chatId;

            // Temporarily switch context to delete
            const origRepo = currentRepo;
            currentRepo = repoName;
            deleteChat(chatId);
            currentRepo = origRepo;

            loadSessionsList();
        };
    });
}

// Build HTML for one repo section
function buildRepoSection(repoName, chats, isExpanded) {
    const isActive = repoName === currentRepo;
    const chatCount = chats.length;

    let html = `
        <div class="repo-section ${isActive ? 'active' : ''}">
            <div class="repo-header" data-repo="${repoName}">
                <span class="repo-icon">${isActive ? '📂' : '📁'}</span>
                <span class="repo-name">${repoName}</span>
                <span class="repo-count">${chatCount} chats</span>
            </div>
            <div class="chats-list ${isExpanded ? '' : 'hidden'}">
    `;

    chats.forEach(c => {
        const isCurrent = isActive && c.id === currentChatId;
        html += `
            <div class="chat-item ${isCurrent ? 'active' : ''}" data-repo="${repoName}" data-chat-id="${c.id}">
                <span class="chat-icon">${isCurrent ? '▶️' : '💬'}</span>
                <div class="chat-info">
                    <div class="chat-title">${c.title || 'Chat'}...</div>
                    <div class="chat-meta">${c.count || 0} msgs • ${formatTimeAgo(c.updatedAt)}</div>
                </div>
                ${!isCurrent ? `<span class="chat-delete" data-repo="${repoName}" data-chat-id="${c.id}">🗑️</span>` : ''}
            </div>
        `;
    });

    html += '</div></div>';
    return html;
}

function formatTimeAgo(timestamp) {
    if (!timestamp) return '';
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min`;
    if (hrs < 24) return `${hrs}h`;
    return `${days}d`;
}

// Buttons
document.getElementById('sessions-btn')?.addEventListener('click', () => {
    const panel = document.getElementById('chat-sessions');
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) loadSessionsList();
});

document.getElementById('close-sessions')?.addEventListener('click', () => {
    document.getElementById('chat-sessions').classList.add('hidden');
});

document.getElementById('new-chat-btn')?.addEventListener('click', () => {
    if (!currentRepo) {
        alert('Clone um repositório primeiro!');
        return;
    }
    // Create new chat (saves current automatically)
    startNewChat();
});

// Init
(async function initAuthAndStatus() {
    await refreshAuthState();
    checkAuth();
    await checkStatus();
    setInterval(checkStatus, 30000);
})();

// ========== PANEL RESIZE HANDLERS ==========
(function () {
    const mainContent = document.querySelector('.main-content');
    const sidebar = document.getElementById('sidebar');
    const chatPanel = document.getElementById('chat-panel');
    const resizeLeft = document.getElementById('resize-left');
    const resizeRight = document.getElementById('resize-right');

    if (!mainContent || !resizeLeft || !resizeRight) return;

    let isDragging = null; // 'left' or 'right'
    let startX = 0;
    let startWidth = 0;

    // Left divider (sidebar resize)
    resizeLeft?.addEventListener('mousedown', (e) => {
        isDragging = 'left';
        startX = e.clientX;
        startWidth = sidebar.offsetWidth;
        resizeLeft.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    // Right divider (chat panel resize)
    resizeRight?.addEventListener('mousedown', (e) => {
        isDragging = 'right';
        startX = e.clientX;
        startWidth = chatPanel.offsetWidth;
        resizeRight.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const dx = e.clientX - startX;
        const totalWidth = mainContent.offsetWidth;
        const minEditor = 300; // Editor minimum in pixels

        if (isDragging === 'left') {
            // Sidebar: min 150px, max 35% of screen or leave room for editor
            const maxSidebar = Math.min(500, totalWidth * 0.35);
            const newWidth = Math.min(Math.max(startWidth + dx, 150), maxSidebar);

            // Ensure editor has space
            if (totalWidth - newWidth - chatPanel.offsetWidth - 4 >= minEditor) {
                mainContent.style.gridTemplateColumns = `${newWidth}px 2px 1fr 2px ${chatPanel.offsetWidth}px`;
            }
        } else if (isDragging === 'right') {
            // Chat: min 250px, max 50% of screen or leave room for editor
            const maxChat = Math.min(700, totalWidth * 0.5);
            const newWidth = Math.min(Math.max(startWidth - dx, 250), maxChat);

            // Ensure editor has space
            if (totalWidth - sidebar.offsetWidth - newWidth - 4 >= minEditor) {
                mainContent.style.gridTemplateColumns = `${sidebar.offsetWidth}px 2px 1fr 2px ${newWidth}px`;
            }
        }

        // Trigger Monaco editor resize
        if (editor) editor.layout();
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            resizeLeft.classList.remove('dragging');
            resizeRight.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            isDragging = null;

            // Save sizes to localStorage
            localStorage.setItem('codejade_sidebar_width', sidebar.offsetWidth);
            localStorage.setItem('codejade_chat_width', chatPanel.offsetWidth);
        }
    });

    // Restore saved sizes
    const savedSidebar = localStorage.getItem('codejade_sidebar_width');
    const savedChat = localStorage.getItem('codejade_chat_width');
    if (savedSidebar || savedChat) {
        const sw = savedSidebar ? parseInt(savedSidebar) : 220;
        const cw = savedChat ? parseInt(savedChat) : 320;
        mainContent.style.gridTemplateColumns = `${sw}px 2px 1fr 2px ${cw}px`;
    }
})();
