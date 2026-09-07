/* Shared icon and page-identification layer for the J.A.D.E. platform. */
(function () {
    'use strict';

    const ICONS = new Map([
        ['🤖', 'bot'], ['📊', 'chart-no-axes-combined'], ['💾', 'save'],
        ['🌙', 'moon'], ['☀️', 'sun'], ['📁', 'folder'], ['📂', 'folder-open'],
        ['🔄', 'refresh-cw'], ['✏️', 'pencil'], ['🌳', 'git-branch'],
        ['🚀', 'rocket'], ['💬', 'message-square'], ['➕', 'plus'],
        ['📋', 'clipboard-list'], ['🗑️', 'trash-2'], ['🔐', 'lock-keyhole'],
        ['⏳', 'loader-circle'], ['❌', 'x'], ['✅', 'check'],
        ['⚠️', 'triangle-alert'], ['📝', 'file-pen-line'], ['📎', 'paperclip'],
        ['🔍', 'search'], ['🗺️', 'map'], ['📄', 'file-text'],
        ['🎥', 'video'], ['⬇️', 'download'], ['👁️', 'eye'],
        ['✨', 'sparkles'], ['📚', 'book-open'], ['💻', 'terminal'],
        ['🎨', 'palette'], ['🖼️', 'image'], ['✍️', 'pen-line'],
        ['🎬', 'clapperboard'], ['🧠', 'brain-circuit'], ['☁️', 'cloud'],
        ['⚡', 'zap'], ['🧪', 'flask-conical'], ['🔬', 'microscope'],
        ['🎤', 'mic'], ['🔊', 'volume-2'], ['🧹', 'eraser'],
        ['🎭', 'masks'], ['📸', 'camera'], ['😊', 'smile'],
        ['🔒', 'lock'], ['⏱️', 'timer'], ['🌐', 'globe-2'],
        ['⬅️', 'arrow-left'], ['▶️', 'play'], ['▶', 'play'],
        ['✕', 'x'], ['×', 'x'], ['☑️', 'square-check'],
        ['🛠️', 'wrench'], ['🧭', 'compass'], ['💡', 'lightbulb'],
        ['🎯', 'target'], ['📧', 'mail'], ['⭐', 'star'],
        ['💰', 'badge-dollar-sign'], ['🌈', 'palette'], ['🎲', 'dices'],
        ['🕐', 'clock-3'], ['🔇', 'volume-x'], ['🎚️', 'sliders-horizontal'],
        ['📢', 'megaphone'], ['⌨️', 'keyboard'], ['📜', 'scroll-text'],
        ['🪟', 'panel-top'], ['🍞', 'bell'], ['📦', 'package'],
        ['🐛', 'bug'], ['📱', 'smartphone'], ['♿', 'accessibility'],
        ['🎮', 'gamepad-2'], ['🖱️', 'mouse-pointer-2'], ['🔢', 'binary']
    ]);

    const EXACT_ICON_HOSTS = [
        '.nav-icon', '.logo-icon', '.feature-icon', '.tool-icon', '.menu-icon',
        '.empty-icon', '.model-icon', '.mode-icon', '.example-icon', '.welcome-icon',
        '.msg-icon', '.drop-icon', '.tab-icon', '.repo-icon', '.chat-icon',
        '.login-icon', '.send-icon', '.loading-icon', '.save-indicator', '.brain-pulse',
        '.notebook-icon', '.source-type', '.source-icon', '.lock-icon', '.chat-delete'
    ].join(',');

    const LEADING_ICON_HOSTS = [
        'button', 'h1', 'h2', 'h3', '.hint', '.editor-title', '.terminal-title',
        '.panel-title', '.modal-tab', '.loading-text', '#file-name',
        '.thinking-header > span:first-child', '.sidebar-header > span', '.chat-header span',
        '.sessions-header > span', '.feature-item', '.file-item', '.attachment-chip',
        '.diff-header > span', '.quiz-feedback', '.btn-primary', '.btn-secondary',
        '.message.tool', '.message.system', '.message.assistant', '.message.bot .text'
    ].join(',');

    const iconKeys = [...ICONS.keys()].sort((a, b) => b.length - a.length);
    let refreshQueued = false;
    let lucidePromise;

    function identifyPage() {
        const filename = (location.pathname.split('/').pop() || 'index.html')
            .replace(/\.html$/i, '') || 'index';
        document.body.dataset.page = filename.toLowerCase();
        document.documentElement.dataset.platformUi = 'precision';
        syncThemeToRoot();
    }

    function syncThemeToRoot() {
        const theme = document.body?.dataset.theme;
        if (theme) {
            document.documentElement.dataset.theme = theme;
        } else {
            delete document.documentElement.dataset.theme;
        }
    }

    function loadLucide() {
        if (window.lucide?.createIcons) return Promise.resolve(window.lucide);
        if (lucidePromise) return lucidePromise;
        lucidePromise = new Promise((resolve, reject) => {
            const existing = document.querySelector('script[data-jade-lucide]');
            if (existing) {
                existing.addEventListener('load', () => resolve(window.lucide), { once: true });
                existing.addEventListener('error', reject, { once: true });
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/lucide@latest/dist/umd/lucide.js';
            script.defer = true;
            script.dataset.jadeLucide = 'true';
            script.onload = () => resolve(window.lucide);
            script.onerror = reject;
            document.head.appendChild(script);
        });
        return lucidePromise;
    }

    function makeIcon(name) {
        const icon = document.createElement('i');
        icon.dataset.lucide = name;
        icon.className = 'ui-icon';
        icon.setAttribute('aria-hidden', 'true');
        return icon;
    }

    function matchingEmoji(text) {
        const value = text.trim();
        return iconKeys.find(key => value.startsWith(key)) || null;
    }

    function replaceExactIcon(element) {
        if (element.closest('pre, code, textarea, option')) return;
        const value = element.textContent.trim();
        const name = ICONS.get(value);
        if (!name) return;
        element.replaceChildren(makeIcon(name));
        element.dataset.uiIconized = 'true';
    }

    function replaceLeadingIcon(element) {
        if (element.closest('pre, code, textarea, option')) return;
        for (const node of element.childNodes) {
            if (node.nodeType !== Node.TEXT_NODE || !node.nodeValue.trim()) continue;
            const emoji = matchingEmoji(node.nodeValue);
            if (!emoji) return;
            const leadingWhitespace = node.nodeValue.match(/^\s*/)?.[0] || '';
            node.nodeValue = leadingWhitespace + node.nodeValue
                .slice(leadingWhitespace.length + emoji.length)
                .replace(/^\s+/, '');
            element.insertBefore(makeIcon(ICONS.get(emoji)), node);
            element.classList.add('ui-leading-icon');
            return;
        }
    }

    function process(root = document) {
        const exact = [];
        const leading = [];
        if (root.nodeType === Node.ELEMENT_NODE && root.matches(EXACT_ICON_HOSTS)) exact.push(root);
        if (root.nodeType === Node.ELEMENT_NODE && root.matches(LEADING_ICON_HOSTS)) leading.push(root);
        root.querySelectorAll?.(EXACT_ICON_HOSTS).forEach(element => exact.push(element));
        root.querySelectorAll?.(LEADING_ICON_HOSTS).forEach(element => leading.push(element));
        exact.forEach(replaceExactIcon);
        leading.forEach(replaceLeadingIcon);
    }

    let isRendering = false;

    function renderIcons(root = document) {
        if (isRendering) return;
        isRendering = true;
        try {
            process(root);
            window.lucide?.createIcons({
                attrs: {
                    'aria-hidden': 'true',
                    'stroke-width': 1.8
                }
            });
        } finally {
            requestAnimationFrame(() => {
                isRendering = false;
            });
        }
    }

    function queueRefresh(mutations) {
        if (isRendering) return;
        if (mutations && mutations.length > 0) {
            const onlyInternalIcons = mutations.every(m => {
                if (m.type === 'childList' && m.addedNodes.length > 0) {
                    let hasExternal = false;
                    for (const node of m.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const isIcon = node.classList?.contains('ui-icon') || node.classList?.contains('lucide') || node.tagName === 'SVG' || node.tagName === 'I';
                            if (!isIcon) hasExternal = true;
                        }
                    }
                    return !hasExternal;
                }
                return false;
            });
            if (onlyInternalIcons) return;
        }
        if (refreshQueued) return;
        refreshQueued = true;
        requestAnimationFrame(() => {
            refreshQueued = false;
            renderIcons(document);
        });
    }

    /* --- SPOTLIGHT CURSOR TRACKER --- */
    function initSpotlight() {
        document.addEventListener('pointermove', (e) => {
            const card = e.target?.closest?.('.app-card, .feature-card, .tool-card, .template-card');
            if (!card) return;
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
            card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
        }, { passive: true });
    }

    /* --- GLOBAL COMMAND PALETTE (CTRL + K) --- */
    const COMMANDS = [
        { id: 'chat', title: 'Chat Principal', desc: 'Assistente multimodal com memória ShoreStone', icon: 'bot', href: 'index.html', keywords: 'ia jade conversa chat' },
        { id: 'scholar', title: 'Scholar NoteBook', desc: 'RAG acadêmico, PDFs, podcasts neurais e flashcards', icon: 'book-open', href: 'scholar.html', keywords: 'estudo resumo anki podcast' },
        { id: 'webdev', title: 'Web Dev Studio', desc: 'Gerador de sites HTML + Tailwind com live preview', icon: 'terminal', href: 'webdev.html', keywords: 'codigo site html css vibe coder' },
        { id: 'codejade', title: 'CodeJade Agent', desc: 'Agente de código autônomo com E2B Sandbox e Git', icon: 'git-branch', href: 'codejade.html', keywords: 'programador cursor github' },
        { id: 'sandbox', title: 'Code Sandbox', desc: 'Execução de código Python segura e isolada na nuvem', icon: 'cloud', href: 'sandbox.html', keywords: 'e2b python terminal execucao' },
        { id: 'analyst', title: 'Data Analyst', desc: 'Análise exploratória automática e modelos de Machine Learning', icon: 'chart-no-axes-combined', href: 'analyze.html', keywords: 'automl eda csv dataset' },
        { id: 'anything', title: 'Chat Anything', desc: 'Playground com Groq, Cerebras, OpenRouter e Mistral', icon: 'sparkles', href: 'anything.html', keywords: 'modelos llm groq cerebras' },
        { id: 'apps', title: 'Catálogo de Apps', desc: 'Painel central com todas as ferramentas da J.A.D.E.', icon: 'panel-top', href: 'apps.html', keywords: 'ferramentas hub dashboard' },
        { id: 'about', title: 'Sobre a J.A.D.E.', desc: 'Arquitetura cognitiva, specs técnicas e criador', icon: 'target', href: 'about.html', keywords: 'arquitetura sistema specs gabriel' },
        { id: 'theme', title: 'Alternar Tema (Claro / Escuro)', desc: 'Trocar entre modo escuro profundo e modo claro aquecido', icon: 'sun', action: 'toggleTheme', keywords: 'tema dark light cor' }
    ];

    let paletteModal = null;
    let selectedIndex = 0;
    let activeCommands = [...COMMANDS];

    function toggleThemeAction() {
        const toggleBtn = document.getElementById('theme-toggle-btn') || document.getElementById('themeBtn');
        if (toggleBtn) {
            toggleBtn.click();
        } else {
            const current = document.body.getAttribute('data-theme') || 'dark';
            const next = current === 'light' ? 'dark' : 'light';
            document.body.setAttribute('data-theme', next);
            localStorage.setItem('jade_theme', next);
            syncThemeToRoot();
        }
    }

    function buildCommandPalette() {
        paletteModal = document.createElement('div');
        paletteModal.className = 'cmd-palette-backdrop hidden';
        paletteModal.setAttribute('aria-hidden', 'true');
        paletteModal.innerHTML = `
            <div class="cmd-palette-dialog" role="dialog" aria-modal="true">
                <div class="cmd-palette-header">
                    <div class="cmd-palette-icon">
                        <i data-lucide="search" class="ui-icon" aria-hidden="true"></i>
                    </div>
                    <input type="text" class="cmd-palette-input" placeholder="O que você deseja abrir ou fazer? (Ctrl+K)" autocomplete="off" spellcheck="false" />
                    <span class="cmd-palette-badge">ESC</span>
                </div>
                <div class="cmd-palette-list" role="listbox"></div>
                <div class="cmd-palette-footer">
                    <span>Navegação Rápida J.A.D.E.</span>
                    <div class="cmd-palette-shortcuts">
                        <span><kbd>↑</kbd><kbd>↓</kbd> Navegar</span>
                        <span><kbd>↵</kbd> Abrir</span>
                        <span><kbd>ESC</kbd> Fechar</span>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(paletteModal);

        const input = paletteModal.querySelector('.cmd-palette-input');

        paletteModal.addEventListener('click', (e) => {
            if (e.target === paletteModal) closeCommandPalette();
        });

        input.addEventListener('input', () => {
            filterCommands(input.value.trim().toLowerCase());
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % (activeCommands.length || 1);
                updateSelectedUI();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = (selectedIndex - 1 + activeCommands.length) % (activeCommands.length || 1);
                updateSelectedUI();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                executeCommand(activeCommands[selectedIndex]);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeCommandPalette();
            }
        });

        renderCommandList();
        renderIcons(paletteModal);
    }

    function filterCommands(query) {
        if (!query) {
            activeCommands = [...COMMANDS];
        } else {
            activeCommands = COMMANDS.filter(cmd => {
                const haystack = `${cmd.title} ${cmd.desc} ${cmd.keywords}`.toLowerCase();
                return haystack.includes(query);
            });
        }
        selectedIndex = 0;
        renderCommandList();
    }

    function renderCommandList() {
        if (!paletteModal) return;
        const list = paletteModal.querySelector('.cmd-palette-list');
        if (!list) return;
        list.innerHTML = '';
        if (activeCommands.length === 0) {
            list.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: var(--ui-text-3, #7e8982); font-size: 0.9rem;">Nenhuma ação ou app encontrada.</div>`;
            return;
        }
        activeCommands.forEach((cmd, idx) => {
            const item = document.createElement('div');
            item.className = `cmd-palette-item ${idx === selectedIndex ? 'active' : ''}`;
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', idx === selectedIndex ? 'true' : 'false');
            item.innerHTML = `
                <div class="cmd-item-icon">
                    <i data-lucide="${cmd.icon}" class="ui-icon" aria-hidden="true"></i>
                </div>
                <div class="cmd-item-info">
                    <span class="cmd-item-title">${cmd.title}</span>
                    <span class="cmd-item-desc">${cmd.desc}</span>
                </div>
                <span class="cmd-item-arrow">→</span>
            `;
            item.addEventListener('mouseenter', () => {
                selectedIndex = idx;
                updateSelectedUI();
            });
            item.addEventListener('click', () => {
                executeCommand(cmd);
            });
            list.appendChild(item);
        });
        renderIcons(list);
    }

    function updateSelectedUI() {
        if (!paletteModal) return;
        const items = paletteModal.querySelectorAll('.cmd-palette-item');
        items.forEach((item, idx) => {
            const isSel = idx === selectedIndex;
            item.classList.toggle('active', isSel);
            item.setAttribute('aria-selected', isSel ? 'true' : 'false');
            if (isSel) {
                item.scrollIntoView({ block: 'nearest' });
            }
        });
    }

    function executeCommand(cmd) {
        if (!cmd) return;
        closeCommandPalette();
        if (cmd.action === 'toggleTheme') {
            toggleThemeAction();
        } else if (cmd.href) {
            window.location.href = cmd.href;
        }
    }

    function openCommandPalette() {
        if (!paletteModal) buildCommandPalette();
        paletteModal.classList.remove('hidden');
        paletteModal.setAttribute('aria-hidden', 'false');
        const input = paletteModal.querySelector('.cmd-palette-input');
        if (input) {
            input.value = '';
            input.focus();
        }
        filterCommands('');
    }

    function closeCommandPalette() {
        if (!paletteModal) return;
        paletteModal.classList.add('hidden');
        paletteModal.setAttribute('aria-hidden', 'true');
    }

    function toggleCommandPalette() {
        if (!paletteModal || paletteModal.classList.contains('hidden')) {
            openCommandPalette();
        } else {
            closeCommandPalette();
        }
    }

    function initCommandPalette() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault();
                toggleCommandPalette();
            } else if (e.key === 'Escape' && paletteModal && !paletteModal.classList.contains('hidden')) {
                closeCommandPalette();
            }
        });
    }

    async function initialize() {
        identifyPage();
        const themeObserver = new MutationObserver(syncThemeToRoot);
        themeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
        try {
            await loadLucide();
            renderIcons(document);
            const observer = new MutationObserver(queueRefresh);
            observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        } catch (error) {
            console.warn('J.A.D.E. icon library unavailable; keeping text fallbacks.', error);
        }
        initSpotlight();
        initCommandPalette();
    }

    window.JadePlatformUI = {
        refresh: queueRefresh,
        openCommandPalette,
        toggleCommandPalette
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }
})();
