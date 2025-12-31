/**
 * Model Selector - Custom Dropdown
 * Appends menu to body to escape ALL stacking contexts
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

    // Move menu to body to escape all stacking contexts
    document.body.appendChild(modelMenu);

    // Apply critical styles
    modelMenu.style.position = 'fixed';
    modelMenu.style.zIndex = '99999';

    // Position menu below trigger
    function positionMenu() {
        const rect = modelTrigger.getBoundingClientRect();
        modelMenu.style.top = (rect.bottom + 8) + 'px';
        modelMenu.style.left = rect.left + 'px';
        modelMenu.style.minWidth = Math.max(rect.width, 280) + 'px';
    }

    // Open/close dropdown
    function openMenu() {
        positionMenu();
        modelSelector.classList.add('open');
        modelMenu.style.opacity = '1';
        modelMenu.style.visibility = 'visible';
        modelMenu.style.transform = 'translateY(0)';
    }

    function closeMenu() {
        modelSelector.classList.remove('open');
        modelMenu.style.opacity = '0';
        modelMenu.style.visibility = 'hidden';
        modelMenu.style.transform = 'translateY(-8px)';
    }

    // Toggle dropdown
    modelTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (modelSelector.classList.contains('open')) {
            closeMenu();
        } else {
            openMenu();
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

            // Update hidden input
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
            closeMenu();
        });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!modelSelector.contains(e.target) && !modelMenu.contains(e.target)) {
            closeMenu();
        }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMenu();
        }
    });

    // Mark initial selection
    const initialValue = modelSelect.value;
    const initialOption = modelMenu.querySelector(`[data-value="${initialValue}"]`);
    if (initialOption) {
        initialOption.classList.add('selected');
    }

    // Initial state - closed
    closeMenu();
})();
