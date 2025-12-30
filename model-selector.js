/**
 * Model Selector - Custom Dropdown
 * Handles model selection with smooth animations
 */

(function () {
    'use strict';

    const modelSelector = document.getElementById('modelSelector');
    const modelTrigger = document.getElementById('modelTrigger');
    const modelMenu = document.getElementById('modelMenu');
    const modelSelect = document.getElementById('modelSelect');
    const selectedModelName = document.getElementById('selectedModelName');
    const selectedModelBadge = document.getElementById('selectedModelBadge');

    if (!modelTrigger || !modelMenu) return;

    // Toggle dropdown
    modelTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        modelSelector.classList.toggle('open');
    });

    // Select model option
    modelMenu.querySelectorAll('.model-option').forEach(option => {
        option.addEventListener('click', () => {
            const value = option.dataset.value;
            const name = option.dataset.name;
            const badge = option.dataset.badge;

            // Update hidden input (used by existing code)
            modelSelect.value = value;

            // Update trigger display
            selectedModelName.textContent = name;
            selectedModelBadge.textContent = badge;

            // Update badge styling
            selectedModelBadge.className = 'model-badge';
            if (['Cerebras', 'Groq'].includes(badge)) {
                selectedModelBadge.classList.add('fast');
            } else if (badge === 'Pipeline') {
                selectedModelBadge.classList.add('pipeline');
            }

            // Mark as selected
            modelMenu.querySelectorAll('.model-option').forEach(o => {
                o.classList.remove('selected');
            });
            option.classList.add('selected');

            // Close dropdown
            modelSelector.classList.remove('open');
        });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!modelSelector.contains(e.target)) {
            modelSelector.classList.remove('open');
        }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modelSelector.classList.remove('open');
        }
    });

    // Mark initial selection
    const initialValue = modelSelect.value;
    const initialOption = modelMenu.querySelector(`[data-value="${initialValue}"]`);
    if (initialOption) {
        initialOption.classList.add('selected');
    }
})();
