(function () {
    'use strict';

    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const API_BASE = isLocal ? 'http://localhost:7860' : 'https://madras1-jade-port.hf.space';
    let authPromise = null;

    async function getAuthState(force = false) {
        if (!authPromise || force) {
            authPromise = fetch(`${API_BASE}/auth/me`, {
                credentials: 'include',
                headers: { Accept: 'application/json' }
            }).then(async response => {
                if (!response.ok) return { authenticated: false, required: true, user: null, csrf_token: null };
                return response.json();
            }).catch(() => ({ authenticated: false, required: true, user: null, csrf_token: null }));
        }
        return authPromise;
    }

    function goToLogin() {
        const current = `${window.location.pathname}${window.location.search}`;
        const loginUrl = new URL('login.html', window.location.href);
        loginUrl.searchParams.set('return_to', current);
        window.location.assign(loginUrl.toString());
    }

    async function apiFetch(urlOrPath, options = {}) {
        const authState = await getAuthState();
        if (!authState.authenticated && authState.required !== false) {
            goToLogin();
            throw new Error('Authentication required');
        }

        const method = (options.method || 'GET').toUpperCase();
        const headers = new Headers(options.headers || {});
        headers.set('Accept', headers.get('Accept') || 'application/json');
        if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && authState.csrf_token) {
            headers.set('X-CSRF-Token', authState.csrf_token);
        }

        const url = /^https?:\/\//i.test(urlOrPath)
            ? urlOrPath
            : `${API_BASE}${urlOrPath.startsWith('/') ? '' : '/'}${urlOrPath}`;

        const response = await fetch(url, {
            ...options,
            method,
            headers,
            credentials: 'include'
        });

        if (response.status === 401) {
            await getAuthState(true);
            goToLogin();
        }
        return response;
    }

    window.JadeAPI = Object.freeze({
        base: API_BASE,
        fetch: apiFetch,
        getAuthState,
        login: () => {
            const returnTo = encodeURIComponent(window.location.href);
            window.location.assign(`${API_BASE}/auth/login?return_to=${returnTo}`);
        }
    });
})();
