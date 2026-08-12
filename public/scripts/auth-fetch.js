// Shared helper for every page that talks to the authenticated API.
//
// The session token itself now lives in an httpOnly cookie (set by the server at login) - page
// JS can no longer read it, which is the whole point (protects it from theft via XSS). What page
// JS still keeps in localStorage (user_id, user_email, name, avatar, etc.) is just a display hint
// for instant UI feedback - it is NEVER trusted by the server for authorization. Every protected
// action re-verifies the real session cookie server-side regardless of what localStorage says.
//
// Mutating requests (anything that isn't a plain GET) also need a matching CSRF header - the
// server issues a random csrf_token cookie at login (readable by JS on purpose) and compares it
// against an X-CSRF-Token header on the way in (the "double-submit cookie" pattern). This file
// must load BEFORE any other page script that calls apiFetch().

// Reads the (non-httpOnly) csrf_token cookie set at login.
function getCsrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : '';
}

// Drop-in replacement for fetch() that always sends cookies and, for non-GET requests,
// automatically attaches the CSRF header.
function apiFetch(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const headers = new Headers(options.headers || {});

    if (method !== 'GET' && method !== 'HEAD') {
        headers.set('X-CSRF-Token', getCsrfToken());
    }

    return fetch(url, {
        ...options,
        headers,
        credentials: 'include' // always send the session cookie, even if this ever becomes cross-origin
    });
}

// Asks the server whether the current visitor is logged in (their JS has no way to know this on
// its own anymore, since the session cookie is httpOnly). Small and cheap - safe to call on every
// page load. Returns { loggedIn, user, csrfToken } - csrfToken is included as a convenience but
// getCsrfToken() above already reads it straight from the cookie whenever it's needed.
async function checkSession() {
    try {
        const response = await apiFetch('/api/users/user_login/whoami');
        return await response.json();
    } catch (error) {
        console.error('Error checking session:', error);
        return { loggedIn: false };
    }
}
