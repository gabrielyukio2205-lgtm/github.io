(function () {
    'use strict';

    const message = 'Geração de vídeos pausada. OpenRouter, Groq e Cerebras estão ativos apenas para tarefas de texto.';
    const generateButton = document.getElementById('generate-btn');
    const promptInput = document.getElementById('prompt-input');
    const emptyState = document.querySelector('.result-empty');
    const mobileMenuButton = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');

    if (generateButton) {
        generateButton.disabled = true;
        generateButton.title = message;
    }
    if (promptInput) {
        promptInput.disabled = true;
        promptInput.placeholder = message;
    }
    if (emptyState) {
        const description = emptyState.querySelector('p');
        if (description) description.textContent = message;
    }
    if (mobileMenuButton && sidebar) {
        mobileMenuButton.addEventListener('click', () => sidebar.classList.toggle('open'));
    }
})();
