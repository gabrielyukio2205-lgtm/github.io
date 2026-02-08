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
let chatHistory = []; // Chat persistence

// Save Indicator
function showSaveIndicator(state = 'saved') {
    const indicator = document.getElementById('save-indicator');
    if (!indicator) return;

    indicator.className = 'save-indicator ' + state;
    if (state === 'saved') {
        setTimeout(() => { indicator.className = 'save-indicator'; }, 2000);
    }
}

// Chat Persistence Functions
function saveChatHistory() {
    if (!currentRepo) return;

    showSaveIndicator('saving');

    const key = `codejade_chat_${currentRepo}`;
    localStorage.setItem(key, JSON.stringify(chatHistory.slice(-50))); // Keep last 50 messages

    // Also save to sessions index
    saveToSessionsIndex(currentRepo);

    setTimeout(() => showSaveIndicator('saved'), 300);
}

function saveToSessionsIndex(repoName) {
    const sessionsKey = 'codejade_sessions';
    let sessions = JSON.parse(localStorage.getItem(sessionsKey) || '[]');

    // Update or add session
    const existing = sessions.findIndex(s => s.repo === repoName);
    const sessionData = {
        repo: repoName,
        lastMessage: chatHistory.length > 0 ? chatHistory[chatHistory.length - 1].content.substring(0, 50) : '',
        messageCount: chatHistory.length,
        updatedAt: Date.now()
    };

    if (existing >= 0) {
        sessions[existing] = sessionData;
    } else {
        sessions.unshift(sessionData);
    }

    // Keep only last 10 sessions
    sessions = sessions.slice(0, 10);
    localStorage.setItem(sessionsKey, JSON.stringify(sessions));
}

function loadChatHistory() {
    if (!currentRepo) return;
    const key = `codejade_chat_${currentRepo}`;
    const saved = localStorage.getItem(key);
    if (saved) {
        try {
            chatHistory = JSON.parse(saved);
            // Render saved messages
            chatMessages.innerHTML = '';
            chatHistory.forEach(msg => {
                renderMessage(msg.type, msg.content, false);
            });
            showSaveIndicator('saved');
        } catch (e) {
            console.error('Error loading chat history:', e);
        }
    }
}

function clearChatHistory() {
    chatHistory = [];
    if (currentRepo) {
        localStorage.removeItem(`codejade_chat_${currentRepo}`);
    }
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
    const token = getAuthToken();
    const loginBanner = document.getElementById('login-banner');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');

    if (!token) {
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

    // IMPORTANT: Clear current chat before cloning new repo
    const previousRepo = currentRepo;
    chatHistory = [];
    chatMessages.innerHTML = '';  // Clear visually

    // Show clone message in fresh chat
    addMessage('user', `Clone: ${repo}`, false);
    addMessage('tool', '⏳ Clonando repositório...', false);

    try {
        const res = await fetch(`${API_BASE}/codejade/clone`, {
            method: 'POST',
            headers: authHeaders(),
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

            // Start fresh session for this repo
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
        const res = await fetch(url, { headers: authHeaders() });
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
        const res = await fetch(url, { headers: authHeaders() });
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
        const res = await fetch(`${API_BASE}/codejade/chat`, {
            method: 'POST',
            headers: authHeaders(),
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

// ========== SESSIONS PANEL ==========

function loadSessionsList() {
    const sessionsList = document.getElementById('sessions-list');
    if (!sessionsList) return;

    const sessions = JSON.parse(localStorage.getItem('codejade_sessions') || '[]');

    if (sessions.length === 0) {
        sessionsList.innerHTML = '<div class="no-sessions">Nenhuma sessão salva ainda</div>';
        return;
    }

    sessionsList.innerHTML = sessions.map(s => `
        <div class="session-item ${s.repo === currentRepo ? 'active' : ''}" data-repo="${s.repo}">
            <span class="session-icon">💬</span>
            <div class="session-info">
                <div class="session-name">${s.repo}</div>
                <div class="session-date">${s.messageCount} mensagens • ${formatTimeAgo(s.updatedAt)}</div>
            </div>
        </div>
    `).join('');

    // Add click handlers
    sessionsList.querySelectorAll('.session-item').forEach(item => {
        item.onclick = () => {
            const repo = item.dataset.repo;

            // Close sessions panel
            document.getElementById('chat-sessions').classList.add('hidden');

            if (repo !== currentRepo) {
                // Save current chat first
                if (currentRepo && chatHistory.length > 0) {
                    saveChatHistory();
                }

                // Switch to new repo
                currentRepo = repo;
                repoName.textContent = repo;

                // Clear and load new chat
                chatMessages.innerHTML = '';
                chatHistory = [];

                // Show transition message
                addMessage('system', `📂 Sessão: ${repo}`, false);

                // Load history for this repo
                loadChatHistory();
                loadFilesFromR2();

                showSaveIndicator('saved');
            }
        };
    });
}

function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'agora';
    if (minutes < 60) return `${minutes}min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return `${days}d atrás`;
}

// Sessions button handlers
document.getElementById('sessions-btn')?.addEventListener('click', () => {
    const sessionsPanel = document.getElementById('chat-sessions');
    sessionsPanel.classList.toggle('hidden');
    if (!sessionsPanel.classList.contains('hidden')) {
        loadSessionsList();
    }
});

document.getElementById('close-sessions')?.addEventListener('click', () => {
    document.getElementById('chat-sessions').classList.add('hidden');
});

document.getElementById('new-chat-btn')?.addEventListener('click', () => {
    // SAVE current chat before clearing
    if (chatHistory.length > 0) {
        saveChatHistory();
    }

    // Clear and start fresh
    chatHistory = [];
    chatMessages.innerHTML = `
        <div class="message assistant welcome-msg">
            <div class="msg-icon">🤖</div>
            <div class="msg-content">
                <strong>CodeJade</strong>
                <p>Nova conversa iniciada. Me peça para editar código!</p>
            </div>
        </div>
    `;
});

// Init
checkAuth();
checkStatus();
setInterval(checkStatus, 30000);
