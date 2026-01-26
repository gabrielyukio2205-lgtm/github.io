(() => {
  const STORAGE_KEY = 'jade_theme';
  const LEGACY_KEYS = ['jade_theme', 'jadeTheme', 'jade-theme'];
  const VALID_THEMES = new Set(['light', 'dark']);

  const getStoredTheme = () => {
    for (const key of LEGACY_KEYS) {
      const value = localStorage.getItem(key);
      if (VALID_THEMES.has(value)) {
        return value;
      }
    }
    return null;
  };

  const getSystemTheme = () => {
    if (!window.matchMedia) return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const setHighlightTheme = (theme) => {
    const hljsLink = document.getElementById('highlight-theme');
    if (!hljsLink) return;
    const lightHref = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-light.min.css';
    const darkHref = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css';
    hljsLink.href = theme === 'light' ? lightHref : darkHref;
  };

  const updateIcons = (theme) => {
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');
    if (!sunIcon || !moonIcon) return;
    sunIcon.classList.toggle('hidden', theme === 'dark');
    moonIcon.classList.toggle('hidden', theme !== 'dark');
  };

  const applyTheme = (theme, persist) => {
    document.body.setAttribute('data-theme', theme);
    updateIcons(theme);
    setHighlightTheme(theme);
    if (persist) {
      localStorage.setItem(STORAGE_KEY, theme);
    }
  };

  const init = () => {
    const storedTheme = getStoredTheme();
    let hasExplicit = Boolean(storedTheme);
    const initialTheme = storedTheme || getSystemTheme();

    applyTheme(initialTheme, hasExplicit);

    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const current = document.body.getAttribute('data-theme') || 'dark';
        const next = current === 'light' ? 'dark' : 'light';
        hasExplicit = true;
        applyTheme(next, true);
      });
    }

    if (window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      media.addEventListener('change', (event) => {
        if (hasExplicit) return;
        applyTheme(event.matches ? 'dark' : 'light', false);
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
