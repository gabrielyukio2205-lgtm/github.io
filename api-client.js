(function () {
    'use strict';

    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const API_BASE = isLocal ? 'http://localhost:7860' : 'https://madras1-jade-port.hf.space';
    const TOKEN_KEY = 'jade_session_token';
    const TOKEN_FRAGMENT_KEY = 'jade_session';
    let volatileToken = null;
    let authPromise = null;

    function readStoredToken() {
        try {
            return sessionStorage.getItem(TOKEN_KEY) || volatileToken;
        } catch (_) {
            return volatileToken;
        }
    }

    function storeToken(token) {
        volatileToken = token;
        try {
            sessionStorage.setItem(TOKEN_KEY, token);
        } catch (_) { }
    }

    function clearToken() {
        volatileToken = null;
        try {
            sessionStorage.removeItem(TOKEN_KEY);
        } catch (_) { }
        authPromise = null;
    }

    function captureTokenFromFragment() {
        if (!window.location.hash) return;
        const params = new URLSearchParams(window.location.hash.slice(1));
        const token = params.get(TOKEN_FRAGMENT_KEY);
        if (!token) return;

        // JWTs have three base64url segments. Refuse malformed or oversized data.
        if (token.length <= 4096 && token.split('.').length === 3) {
            storeToken(token);
        }
        params.delete(TOKEN_FRAGMENT_KEY);
        const remainingHash = params.toString();
        const cleanUrl = `${window.location.pathname}${window.location.search}${remainingHash ? `#${remainingHash}` : ''}`;
        window.history.replaceState(null, document.title, cleanUrl);
    }

    function withAuthorization(headersInit) {
        const headers = new Headers(headersInit || {});
        const token = readStoredToken();
        if (token) headers.set('Authorization', `Bearer ${token}`);
        return headers;
    }

    captureTokenFromFragment();

    async function getAuthState(force = false) {
        if (!authPromise || force) {
            authPromise = fetch(`${API_BASE}/auth/me`, {
                credentials: 'omit',
                headers: withAuthorization({ Accept: 'application/json' })
            }).then(async response => {
                if (!response.ok) {
                    clearToken();
                    return { authenticated: false, required: true, user: null, csrf_token: null };
                }
                const state = await response.json();
                if (!state.authenticated && readStoredToken()) clearToken();
                return state;
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
        const headers = withAuthorization(options.headers);
        headers.set('Accept', headers.get('Accept') || 'application/json');

        const url = /^https?:\/\//i.test(urlOrPath)
            ? urlOrPath
            : `${API_BASE}${urlOrPath.startsWith('/') ? '' : '/'}${urlOrPath}`;

        const response = await fetch(url, {
            ...options,
            method,
            headers,
            credentials: 'omit'
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
        getToken: readStoredToken,
        clearToken,
        logout: async () => {
            try {
                if (readStoredToken()) {
                    await apiFetch('/auth/logout', { method: 'POST' });
                }
            } finally {
                clearToken();
                sessionStorage.removeItem('jade_auth_user_id');
                sessionStorage.removeItem('jade_csrf_token');
            }
        },
        login: (returnUrl = window.location.href) => {
            const returnTo = encodeURIComponent(returnUrl);
            window.location.assign(`${API_BASE}/auth/login?return_to=${returnTo}`);
        }
    });
})();
