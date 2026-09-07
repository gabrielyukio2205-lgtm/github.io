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
    }

    window.JadePlatformUI = { refresh: queueRefresh };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }
})();
