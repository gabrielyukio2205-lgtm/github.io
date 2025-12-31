/**
 * Model Selector - Custom Dropdown
 * Uses fixed positioning to escape stacking context issues
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

    // Position menu using fixed positioning to escape stacking context
    function positionMenu() {
        const rect = modelTrigger.getBoundingClientRect();
        modelMenu.style.position = 'fixed';
        modelMenu.style.top = (rect.bottom + 8) + 'px';
        modelMenu.style.left = rect.left + 'px';
        modelMenu.style.width = Math.max(rect.width, 280) + 'px';
        modelMenu.style.right = 'auto';
    }

    // Toggle dropdown
    modelTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = modelSelector.classList.toggle('open');
        if (isOpen) {
            positionMenu();
        }
    });

    // Reposition on scroll/resize when open
    window.addEventListener('scroll', () => {
        if (modelSelector.classList.contains('open')) {
            positionMenu();
        }
    }, true);

    window.addEventListener('resize', () => {
        if (modelSelector.classList.contains('open')) {
            positionMenu();
        }
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
        if (!modelSelector.contains(e.target) && !modelMenu.contains(e.target)) {
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
