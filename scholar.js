/**
 * Scholar NoteBook - Main JavaScript
 * Notion + NotebookLM inspired workspace for learning
 */

// ========== Configuration ==========
const PROXY_BASE_URL = 'https://jade-proxy.onrender.com';
const API_BASE = PROXY_BASE_URL;

// ========== State Management ==========
const state = {
    userId: localStorage.getItem('scholar_user_id') || `user_${Date.now()}`,
    notebooks: [],        // [{id, name, createdAt}]
    currentNotebook: 'default',
    sources: [],          // [{id, type, name, preview, notebookId}]
    selectedSources: [],  // IDs of selected sources
    chatHistory: [],
    currentQuiz: null,
    quizIndex: 0,
    quizXP: 0,
    currentFlashcards: null,
    flashcardIndex: 0,
    showingAnswer: false
};

// Save user ID
localStorage.setItem('scholar_user_id', state.userId);

// ========== Local Storage Helpers ==========
function saveNotebooksLocally() {
    localStorage.setItem('scholar_notebooks', JSON.stringify(state.notebooks));
}

function loadNotebooksLocally() {
    try {
        const saved = localStorage.getItem('scholar_notebooks');
        if (saved) {
            state.notebooks = JSON.parse(saved);
        }
        // Ensure default notebook exists
        if (!state.notebooks.find(n => n.id === 'default')) {
            state.notebooks.unshift({ id: 'default', name: 'Meus Estudos', createdAt: Date.now() });
            saveNotebooksLocally();
        }
    } catch (e) {
        console.error('Error loading notebooks:', e);
        state.notebooks = [{ id: 'default', name: 'Meus Estudos', createdAt: Date.now() }];
    }
}

function saveSourcesLocally() {
    localStorage.setItem('scholar_sources', JSON.stringify(state.sources));
    localStorage.setItem('scholar_selected', JSON.stringify(state.selectedSources));
    localStorage.setItem('scholar_current_notebook', state.currentNotebook);
}

function loadSourcesLocally() {
    try {
        const savedSources = localStorage.getItem('scholar_sources');
        const savedSelected = localStorage.getItem('scholar_selected');
        const savedNotebook = localStorage.getItem('scholar_current_notebook');
        if (savedSources) {
            state.sources = JSON.parse(savedSources);
        }
        if (savedSelected) {
            state.selectedSources = JSON.parse(savedSelected);
        }
        if (savedNotebook) {
            state.currentNotebook = savedNotebook;
        }
    } catch (e) {
        console.error('Error loading local sources:', e);
    }
}

function getSourcesForCurrentNotebook() {
    return state.sources.filter(s => !s.notebookId || s.notebookId === state.currentNotebook);
}

// ========== DOM Elements ==========
const elements = {
    // Theme
    themeToggle: document.getElementById('theme-toggle'),
    sunIcon: document.getElementById('sun-icon'),
    moonIcon: document.getElementById('moon-icon'),

    // Sidebar
    sourcesList: document.getElementById('sources-list'),
    addSourceBtn: document.getElementById('add-source-btn'),

    // Main Content
    notebookTitle: document.getElementById('notebook-title'),
    sourcesCount: document.getElementById('sources-count'),
    sourcesGrid: document.getElementById('sources-grid'),
    addSourceCard: document.getElementById('add-source-card'),
    toolCards: document.querySelectorAll('.tool-card'),
    outputContent: document.getElementById('output-content'),

    // Chat Panel
    chatPanel: document.getElementById('chat-panel'),
    toggleChatBtn: document.getElementById('toggle-chat-btn'),
    closeChatBtn: document.getElementById('close-chat-btn'),
    chatMessages: document.getElementById('chat-messages'),
    chatInput: document.getElementById('chat-input'),
    sendChatBtn: document.getElementById('send-chat-btn'),

    // Source Modal
    sourceModal: document.getElementById('source-modal'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    pdfInput: document.getElementById('pdf-input'),
    urlInput: document.getElementById('url-input'),
    youtubeInput: document.getElementById('youtube-input'),
    topicInput: document.getElementById('topic-input'),
    pdfDropZone: document.getElementById('pdf-drop-zone'),
    pdfFileInput: document.getElementById('pdf-file-input'),
    pdfFileName: document.getElementById('pdf-file-name'),
    urlValue: document.getElementById('url-value'),
    youtubeValue: document.getElementById('youtube-value'),
    topicValue: document.getElementById('topic-value'),
    cancelSourceBtn: document.getElementById('cancel-source-btn'),
    confirmSourceBtn: document.getElementById('confirm-source-btn'),

    // Quiz Modal
    quizModal: document.getElementById('quiz-modal'),
    quizProgressText: document.getElementById('quiz-progress-text'),
    quizXP: document.getElementById('quiz-xp'),
    quizQuestion: document.getElementById('quiz-question'),
    quizOptions: document.getElementById('quiz-options'),
    quizFeedback: document.getElementById('quiz-feedback'),
    nextQuestionBtn: document.getElementById('next-question-btn'),

    // Loading
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingText: document.getElementById('loading-text'),

    // Audio
    audioPlayer: document.getElementById('audio-player')
};

// ========== Theme Management ==========
function initTheme() {
    const savedTheme = localStorage.getItem('scholar_theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        elements.sunIcon.classList.add('hidden');
        elements.moonIcon.classList.remove('hidden');
    }
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('scholar_theme', isLight ? 'light' : 'dark');

    elements.sunIcon.classList.toggle('hidden', isLight);
    elements.moonIcon.classList.toggle('hidden', !isLight);
}

// ========== UI Helpers ==========
function showLoading(text = 'Processando...') {
    elements.loadingText.textContent = text;
    elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    elements.loadingOverlay.classList.add('hidden');
}

function showModal(modal) {
    modal.classList.remove('hidden');
}

function hideModal(modal) {
    modal.classList.add('hidden');
}

function updateSourcesCount() {
    const count = getSourcesForCurrentNotebook().length;
    elements.sourcesCount.textContent = `${count} fonte${count !== 1 ? 's' : ''}`;
}

function updateToolsState() {
    const hasSelectedSources = state.selectedSources.length > 0;
    elements.toolCards.forEach(card => {
        card.disabled = !hasSelectedSources;
    });
}

// ========== Sources Management ==========
function getSourceIcon(type) {
    const icons = {
        pdf: '📄',
        url: '🔗',
        youtube: '🎥',
        topic: '🔍'
    };
    return icons[type] || '📁';
}

function renderSources() {
    // Filter sources for current notebook
    const notebookSources = getSourcesForCurrentNotebook();

    // Render in sidebar
    if (notebookSources.length === 0) {
        elements.sourcesList.innerHTML = `
            <div class="empty-state">
                <span>Nenhuma fonte ainda</span>
                <small>Adicione PDFs, URLs ou tópicos</small>
            </div>
        `;
    } else {
        elements.sourcesList.innerHTML = notebookSources.map(source => `
            <div class="source-item ${state.selectedSources.includes(source.id) ? 'selected' : ''}" 
                 data-id="${source.id}">
                <span class="source-type">${getSourceIcon(source.type)}</span>
                <span class="source-name">${source.name}</span>
                <button class="icon-btn remove-source" data-id="${source.id}" title="Remover">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `).join('');
    }

    // Render in main grid
    const cardsHtml = notebookSources.map(source => `
        <div class="source-card ${state.selectedSources.includes(source.id) ? 'selected' : ''}" 
             data-id="${source.id}">
            <button class="icon-btn delete-btn" data-id="${source.id}" title="Remover">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            <div class="source-icon">${getSourceIcon(source.type)}</div>
            <div class="source-title">${source.name}</div>
            <div class="source-preview">${source.preview || ''}</div>
        </div>
    `).join('');

    elements.sourcesGrid.innerHTML = cardsHtml + `
        <div class="add-source-card" id="add-source-card">
            <div class="add-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </div>
            <span>Adicionar Fonte</span>
            <small>PDF, URL, YouTube ou Tópico</small>
        </div>
    `;

    // Re-bind add source card event
    document.getElementById('add-source-card').addEventListener('click', () => showModal(elements.sourceModal));

    updateSourcesCount();
    updateToolsState();
}

function toggleSourceSelection(sourceId) {
    const idx = state.selectedSources.indexOf(sourceId);
    if (idx === -1) {
        state.selectedSources.push(sourceId);
    } else {
        state.selectedSources.splice(idx, 1);
    }
    saveSourcesLocally();
    renderSources();
}

async function deleteSource(sourceId) {
    try {
        // Use POST since proxy only supports GET/POST
        const response = await fetch(`${API_BASE}/scholar/source/${sourceId}/delete?user_id=${state.userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: state.userId })
        });

        const data = await response.json();
        if (data.success) {
            state.sources = state.sources.filter(s => s.id !== sourceId);
            state.selectedSources = state.selectedSources.filter(id => id !== sourceId);
            saveSourcesLocally();
            renderSources();
        }
    } catch (error) {
        console.error('Error deleting source:', error);
    }
}

async function loadSources() {
    // First load from localStorage (for offline/fast startup)
    loadSourcesLocally();
    renderSources();

    // Then try to sync with server
    try {
        const response = await fetch(`${API_BASE}/scholar/sources?user_id=${state.userId}`);
        const data = await response.json();

        if (data.success && data.sources && data.sources.length > 0) {
            // Merge server sources with local (server is source of truth)
            state.sources = data.sources;
            saveSourcesLocally();
            renderSources();
        }
    } catch (error) {
        console.error('Error loading sources from server:', error);
        // Keep local sources if server fails
    }
}

// ========== Add Source Modal ==========
let currentSourceType = 'pdf';
let selectedPdfFile = null;

function switchSourceType(type) {
    currentSourceType = type;

    // Update tabs
    elements.tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });

    // Show/hide input sections
    elements.pdfInput.classList.toggle('hidden', type !== 'pdf');
    elements.urlInput.classList.toggle('hidden', type !== 'url');
    elements.youtubeInput.classList.toggle('hidden', type !== 'youtube');
    elements.topicInput.classList.toggle('hidden', type !== 'topic');
}

function resetSourceModal() {
    currentSourceType = 'pdf';
    selectedPdfFile = null;
    elements.pdfFileName.textContent = '';
    elements.urlValue.value = '';
    elements.youtubeValue.value = '';
    elements.topicValue.value = '';
    switchSourceType('pdf');
}

async function addSource() {
    let content = '';

    switch (currentSourceType) {
        case 'pdf':
            if (!selectedPdfFile) {
                alert('Selecione um arquivo PDF');
                return;
            }
            // Convert to base64
            content = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.readAsDataURL(selectedPdfFile);
            });
            break;

        case 'url':
            content = elements.urlValue.value.trim();
            if (!content) {
                alert('Digite uma URL válida');
                return;
            }
            break;

        case 'youtube':
            content = elements.youtubeValue.value.trim();
            if (!content || !content.includes('youtube')) {
                alert('Digite um link do YouTube válido');
                return;
            }
            break;

        case 'topic':
            content = elements.topicValue.value.trim();
            if (!content) {
                alert('Digite um tópico para pesquisar');
                return;
            }
            break;
    }

    hideModal(elements.sourceModal);
    showLoading('Processando fonte...');

    try {
        const response = await fetch(`${API_BASE}/scholar/ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                source_type: currentSourceType,
                content: content,
                user_id: state.userId
            })
        });

        const data = await response.json();

        if (data.success) {
            state.sources.push({
                id: data.source_id,
                type: currentSourceType,
                name: data.source_name,
                preview: data.preview,
                notebookId: state.currentNotebook
            });
            state.selectedSources.push(data.source_id);
            saveSourcesLocally();
            renderSources();
            resetSourceModal();
        } else {
            alert(`Erro: ${data.error}`);
        }
    } catch (error) {
        console.error('Error adding source:', error);
        alert('Erro ao adicionar fonte. Verifique sua conexão.');
    } finally {
        hideLoading();
    }
}

// ========== Generation ==========
async function generateOutput(type) {
    if (state.selectedSources.length === 0) {
        alert('Selecione pelo menos uma fonte primeiro');
        return;
    }

    const loadingMessages = {
        summary: 'Gerando resumo estratégico...',
        podcast: 'Produzindo podcast (isso pode levar alguns minutos)...',
        quiz: 'Criando quiz gamificado...',
        flashcards: 'Gerando flashcards...',
        mindmap: 'Renderizando mapa mental...'
    };

    showLoading(loadingMessages[type] || 'Gerando conteúdo...');

    try {
        const response = await fetch(`${API_BASE}/scholar/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                output_type: type,
                source_ids: state.selectedSources,
                user_id: state.userId
            })
        });

        const data = await response.json();

        if (data.success) {
            renderOutput(type, data);
        } else {
            alert(`Erro: ${data.error}`);
        }
    } catch (error) {
        console.error('Error generating:', error);
        alert('Erro ao gerar conteúdo. Tente novamente.');
    } finally {
        hideLoading();
    }
}

function renderOutput(type, data) {
    let html = '';

    switch (type) {
        case 'summary':
            html = `
                <div class="output-header">
                    <h2>📝 Resumo Estratégico</h2>
                </div>
                <div class="markdown-content">
                    ${marked.parse(data.content || '')}
                </div>
            `;
            break;

        case 'podcast':
            html = `
                <div class="output-header">
                    <h2>🎧 Podcast Gerado</h2>
                </div>
                <div class="audio-player-container">
                    <audio controls src="data:audio/mp3;base64,${data.audio_base64}"></audio>
                </div>
                <div class="script-section">
                    <h3>Roteiro</h3>
                    ${data.script ? data.script.map(line => `
                        <p><strong>${line.speaker}:</strong> ${line.text}</p>
                    `).join('') : ''}
                </div>
            `;
            break;

        case 'quiz':
            state.currentQuiz = data.questions || [];
            state.quizIndex = 0;
            state.quizXP = 0;
            if (state.currentQuiz.length > 0) {
                showQuizModal();
            } else {
                alert('Não foi possível gerar o quiz.');
            }
            return;

        case 'flashcards':
            state.currentFlashcards = data.cards || [];
            state.flashcardIndex = 0;
            state.showingAnswer = false;

            if (state.currentFlashcards.length > 0) {
                renderFlashcardStudy(data.file_base64, data.filename);
            } else {
                alert('Não foi possível gerar flashcards.');
            }
            return;

        case 'mindmap':
            html = `
                <div class="output-header">
                    <h2>🗺️ Mapa Mental</h2>
                    <a href="data:image/png;base64,${data.image_base64}" 
                       download="mindmap.png" 
                       class="btn-primary">
                        ⬇️ Baixar Imagem
                    </a>
                </div>
                <div class="mindmap-container">
                    <img src="data:image/png;base64,${data.image_base64}" alt="Mapa Mental">
                </div>
            `;
            break;
    }

    elements.outputContent.innerHTML = html;

    // Apply syntax highlighting
    document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
    });
}

// ========== Quiz Modal ==========
function showQuizModal() {
    showModal(elements.quizModal);
    renderQuizQuestion();
}

function renderQuizQuestion() {
    if (!state.currentQuiz || state.quizIndex >= state.currentQuiz.length) {
        finishQuiz();
        return;
    }

    const q = state.currentQuiz[state.quizIndex];

    elements.quizProgressText.textContent = `Questão ${state.quizIndex + 1} de ${state.currentQuiz.length}`;
    elements.quizXP.textContent = state.quizXP;
    elements.quizQuestion.textContent = q.question;
    elements.quizFeedback.classList.add('hidden');
    elements.nextQuestionBtn.disabled = true;

    elements.quizOptions.innerHTML = (q.options || []).map((opt, i) => `
        <button class="quiz-option" data-option="${String.fromCharCode(65 + i)}">
            ${opt}
        </button>
    `).join('');

    // Bind option events
    elements.quizOptions.querySelectorAll('.quiz-option').forEach(btn => {
        btn.addEventListener('click', () => checkAnswer(btn.dataset.option, q.correct_option, q.explanation));
    });
}

function checkAnswer(selected, correct, explanation) {
    const buttons = elements.quizOptions.querySelectorAll('.quiz-option');

    // Extract just the letter from correct answer (handles 'C)', 'C', 'C.' formats)
    const correctLetter = typeof correct === 'string' ? correct.charAt(0).toUpperCase() : correct;

    buttons.forEach(btn => {
        btn.disabled = true;
        if (btn.dataset.option === correctLetter) {
            btn.classList.add('correct');
        } else if (btn.dataset.option === selected) {
            btn.classList.add('incorrect');
        }
    });

    const isCorrect = selected === correctLetter;

    if (isCorrect) {
        state.quizXP += 100;
        elements.quizXP.textContent = state.quizXP;
    }

    elements.quizFeedback.textContent = isCorrect
        ? '✨ Correto! +100 XP'
        : `❌ Errado. ${explanation || `A resposta correta era ${correct}`}`;
    elements.quizFeedback.className = `quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    elements.quizFeedback.classList.remove('hidden');

    elements.nextQuestionBtn.disabled = false;
}

function nextQuestion() {
    state.quizIndex++;
    renderQuizQuestion();
}

function finishQuiz() {
    elements.quizQuestion.textContent = '🏆 Quiz Finalizado!';
    elements.quizOptions.innerHTML = `
        <div class="quiz-results">
            <h3>Sua pontuação: ${state.quizXP} XP</h3>
            <p>Você respondeu ${state.currentQuiz.length} questões.</p>
        </div>
    `;
    elements.quizFeedback.classList.add('hidden');
    elements.nextQuestionBtn.textContent = 'Fechar';
    elements.nextQuestionBtn.disabled = false;
    elements.nextQuestionBtn.onclick = () => {
        hideModal(elements.quizModal);
        elements.nextQuestionBtn.textContent = 'Próxima Questão';
        elements.nextQuestionBtn.onclick = nextQuestion;
    };
}

// ========== Chat ==========
function toggleChat() {
    elements.chatPanel.classList.toggle('hidden');
}

function addChatMessage(content, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isUser ? 'user' : 'bot'}`;
    messageDiv.innerHTML = `
        <div class="message-content">
            ${isUser ? content : marked.parse(content)}
        </div>
    `;
    elements.chatMessages.appendChild(messageDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

async function sendChatMessage() {
    const message = elements.chatInput.value.trim();
    if (!message) return;

    elements.chatInput.value = '';
    addChatMessage(message, true);

    try {
        const response = await fetch(`${API_BASE}/scholar/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                source_ids: state.selectedSources,
                user_id: state.userId,
                history: state.chatHistory
            })
        });

        const data = await response.json();

        if (data.success) {
            addChatMessage(data.response);
            state.chatHistory.push({ role: 'user', content: message });
            state.chatHistory.push({ role: 'assistant', content: data.response });
        } else {
            addChatMessage(`Erro: ${data.error}`);
        }
    } catch (error) {
        console.error('Chat error:', error);
        addChatMessage('Erro ao enviar mensagem. Verifique sua conexão.');
    }
}

// ========== Event Listeners ==========
function initEventListeners() {
    // Theme
    elements.themeToggle.addEventListener('click', toggleTheme);

    // Source Modal
    elements.addSourceBtn.addEventListener('click', () => showModal(elements.sourceModal));
    elements.addSourceCard.addEventListener('click', () => showModal(elements.sourceModal));
    elements.cancelSourceBtn.addEventListener('click', () => {
        hideModal(elements.sourceModal);
        resetSourceModal();
    });
    elements.confirmSourceBtn.addEventListener('click', addSource);

    // Close modal on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', () => {
            hideModal(backdrop.parentElement);
        });
    });

    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            hideModal(btn.closest('.modal'));
        });
    });

    // Source type tabs
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchSourceType(btn.dataset.type));
    });

    // PDF file input
    elements.pdfFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            selectedPdfFile = file;
            elements.pdfFileName.textContent = file.name;
        }
    });

    // Drag and drop for PDF
    elements.pdfDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.pdfDropZone.classList.add('dragover');
    });

    elements.pdfDropZone.addEventListener('dragleave', () => {
        elements.pdfDropZone.classList.remove('dragover');
    });

    elements.pdfDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.pdfDropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            selectedPdfFile = file;
            elements.pdfFileName.textContent = file.name;
        }
    });

    // Source selection (using event delegation)
    elements.sourcesGrid.addEventListener('click', (e) => {
        const sourceCard = e.target.closest('.source-card');
        const deleteBtn = e.target.closest('.delete-btn');

        if (deleteBtn) {
            e.stopPropagation();
            deleteSource(deleteBtn.dataset.id);
        } else if (sourceCard) {
            toggleSourceSelection(sourceCard.dataset.id);
        }
    });

    elements.sourcesList.addEventListener('click', (e) => {
        const sourceItem = e.target.closest('.source-item');
        const removeBtn = e.target.closest('.remove-source');

        if (removeBtn) {
            e.stopPropagation();
            deleteSource(removeBtn.dataset.id);
        } else if (sourceItem) {
            toggleSourceSelection(sourceItem.dataset.id);
        }
    });

    // Tool cards
    elements.toolCards.forEach(card => {
        card.addEventListener('click', () => {
            if (!card.disabled) {
                generateOutput(card.dataset.type);
            }
        });
    });

    // Chat
    elements.toggleChatBtn.addEventListener('click', toggleChat);
    elements.closeChatBtn.addEventListener('click', toggleChat);
    elements.sendChatBtn.addEventListener('click', sendChatMessage);
    elements.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });

    // Quiz
    elements.nextQuestionBtn.addEventListener('click', nextQuestion);

    // Notebooks - event delegation
    document.getElementById('notebooks-list').addEventListener('click', (e) => {
        const notebookItem = e.target.closest('.notebook-item');
        const deleteBtn = e.target.closest('.delete-notebook');

        if (deleteBtn) {
            e.stopPropagation();
            deleteNotebook(deleteBtn.dataset.id);
        } else if (notebookItem) {
            selectNotebook(notebookItem.dataset.id);
        }
    });

    // New notebook button
    document.getElementById('new-notebook-btn').addEventListener('click', createNotebook);
}

// ========== Flashcard Interactive Study ==========
function renderFlashcardStudy(fileBase64, filename) {
    const card = state.currentFlashcards[state.flashcardIndex];
    const total = state.currentFlashcards.length;

    elements.outputContent.innerHTML = `
        <div class="output-header flashcard-header">
            <h2>🃏 Estudar Flashcards</h2>
            <div class="flashcard-actions">
                ${fileBase64 ? `
                    <a href="data:application/octet-stream;base64,${fileBase64}" 
                       download="${filename}" 
                       class="btn-secondary">
                        ⬇️ Anki
                    </a>
                ` : ''}
            </div>
        </div>
        
        <div class="flashcard-study">
            <div class="flashcard-progress">
                <span>Card ${state.flashcardIndex + 1} de ${total}</span>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${((state.flashcardIndex + 1) / total) * 100}%"></div>
                </div>
            </div>
            
            <div class="flashcard-interactive ${state.showingAnswer ? 'flipped' : ''}" id="study-card">
                <div class="card-front">
                    <span class="card-label">Pergunta</span>
                    <p>${card.question}</p>
                    <small>Clique para ver a resposta</small>
                </div>
                <div class="card-back">
                    <span class="card-label">Resposta</span>
                    <p>${card.answer}</p>
                </div>
            </div>
            
            <div class="flashcard-controls">
                <button class="btn-secondary" id="prev-card" ${state.flashcardIndex === 0 ? 'disabled' : ''}>
                    ← Anterior
                </button>
                <button class="btn-primary" id="flip-card">
                    ${state.showingAnswer ? '🔄 Virar' : '👁️ Ver Resposta'}
                </button>
                <button class="btn-secondary" id="next-card" ${state.flashcardIndex >= total - 1 ? 'disabled' : ''}>
                    Próximo →
                </button>
            </div>
        </div>
    `;

    // Bind events
    document.getElementById('study-card').addEventListener('click', flipFlashcard);
    document.getElementById('flip-card').addEventListener('click', flipFlashcard);
    document.getElementById('prev-card').addEventListener('click', prevFlashcard);
    document.getElementById('next-card').addEventListener('click', nextFlashcard);
}

function flipFlashcard() {
    state.showingAnswer = !state.showingAnswer;
    const card = document.getElementById('study-card');
    card.classList.toggle('flipped', state.showingAnswer);
    document.getElementById('flip-card').textContent = state.showingAnswer ? '🔄 Virar' : '👁️ Ver Resposta';
}

function prevFlashcard() {
    if (state.flashcardIndex > 0) {
        state.flashcardIndex--;
        state.showingAnswer = false;
        renderFlashcardStudy();
    }
}

function nextFlashcard() {
    if (state.flashcardIndex < state.currentFlashcards.length - 1) {
        state.flashcardIndex++;
        state.showingAnswer = false;
        renderFlashcardStudy();
    }
}

// ========== Notebooks Management ==========
function renderNotebooks() {
    const notebooksList = document.getElementById('notebooks-list');
    notebooksList.innerHTML = state.notebooks.map(nb => `
        <div class="notebook-item ${nb.id === state.currentNotebook ? 'active' : ''}" data-id="${nb.id}">
            <span class="notebook-icon">📓</span>
            <span class="notebook-name">${nb.name}</span>
            ${nb.id !== 'default' ? `
                <button class="icon-btn delete-notebook" data-id="${nb.id}" title="Excluir">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            ` : ''}
        </div>
    `).join('');

    // Update title
    const currentNb = state.notebooks.find(n => n.id === state.currentNotebook);
    if (currentNb && elements.notebookTitle) {
        elements.notebookTitle.textContent = currentNb.name;
    }
}

function createNotebook() {
    const name = prompt('Nome do novo notebook:');
    if (!name || !name.trim()) return;

    const newNotebook = {
        id: `nb_${Date.now()}`,
        name: name.trim(),
        createdAt: Date.now()
    };

    state.notebooks.push(newNotebook);
    saveNotebooksLocally();
    selectNotebook(newNotebook.id);
}

function selectNotebook(notebookId) {
    state.currentNotebook = notebookId;
    state.selectedSources = []; // Clear selection when switching
    saveSourcesLocally();
    renderNotebooks();
    renderSources();

    // Update title to be editable
    const currentNb = state.notebooks.find(n => n.id === state.currentNotebook);
    if (currentNb && elements.notebookTitle) {
        elements.notebookTitle.textContent = currentNb.name;
    }
}

function deleteNotebook(notebookId) {
    if (notebookId === 'default') return;

    if (!confirm('Excluir este notebook e todas as suas fontes?')) return;

    // Remove notebook
    state.notebooks = state.notebooks.filter(n => n.id !== notebookId);

    // Remove sources from this notebook
    state.sources = state.sources.filter(s => s.notebookId !== notebookId);

    // Switch to default if we deleted the current one
    if (state.currentNotebook === notebookId) {
        state.currentNotebook = 'default';
    }

    saveNotebooksLocally();
    saveSourcesLocally();
    renderNotebooks();
    renderSources();
}

// ========== Initialize ==========
function init() {
    initTheme();
    loadNotebooksLocally();
    initEventListeners();
    loadSources();
    renderNotebooks();
    renderSources();
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
