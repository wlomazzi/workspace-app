// Shared auth/CSRF middleware for the whole API.
//
// Session model: on login, the server sets the Supabase access token as an httpOnly cookie
// (sb_access_token) - client-side JS never sees it, which is what makes it resistant to theft via
// XSS (unlike the old approach of storing it in localStorage). A second, non-httpOnly cookie
// (csrf_token) is set alongside it purely so the frontend can read it and echo it back as a
// header on state-changing requests (the "double-submit cookie" pattern) - since browsers attach
// cookies to requests automatically (including cross-site ones), a plain cookie alone doesn't
// prove the request actually came from our own frontend; requiring the same value to also show up
// in a custom header does, because a third-party page has no way to read csrf_token itself.
//
// No cookie-parsing npm package is used here on purpose - the raw cookie header is trivial to
// parse and this keeps the dependency list (and the "did you remember to npm install" risk) down.

import { supabase } from '../../lib/supabase.js';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const ACCESS_TOKEN_COOKIE = 'sb_access_token';
export const REFRESH_TOKEN_COOKIE = 'sb_refresh_token';
export const CSRF_COOKIE = 'csrf_token';

export function parseCookies(req) {
    const header = req.headers.cookie;
    const cookies = {};
    if (!header) return cookies;

    header.split(';').forEach(pair => {
        const idx = pair.indexOf('=');
        if (idx === -1) return;
        const key = pair.slice(0, idx).trim();
        const value = pair.slice(idx + 1).trim();
        if (!key) return;
        try {
            cookies[key] = decodeURIComponent(value);
        } catch {
            cookies[key] = value;
        }
    });

    return cookies;
}

// Requires a valid session cookie. On success, attaches:
//   req.userId          - the authenticated user's UUID (from the verified token, never from the
//                          request body - the whole point of this middleware is that the client
//                          can no longer just claim to be any user_id it wants)
//   req.userEmail        - the authenticated user's email
//   req.supabaseAuthed   - a Supabase client scoped to that user's JWT, so RLS's auth.uid() checks
//                          on inserts/updates/deletes actually resolve to this user
//   req.accessToken      - the raw JWT itself. Not used by most routes (they should go through
//                          req.supabaseAuthed instead) - the one legitimate use today is
//                          GET /api/messages/realtime_token, which hands this to the browser so it
//                          can authenticate its own direct Supabase Realtime websocket connection
//                          (Realtime subscriptions have to come from the browser itself, so there's
//                          no way around it briefly holding a copy of the token in JS memory for
//                          that one purpose - see that route for the full reasoning).
export async function requireAuth(req, res, next) {
    const cookies = parseCookies(req);
    const accessToken = cookies[ACCESS_TOKEN_COOKIE];

    if (!accessToken) {
        return res.status(401).json({ error: 'Not authenticated. Please log in.' });
    }

    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data?.user) {
        return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
    }

    req.userId = data.user.id;
    req.userEmail = data.user.email;
    req.accessToken = accessToken;
    req.supabaseAuthed = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
        auth: { persistSession: false }
    });

    next();
}

// CSRF protection for state-changing requests (double-submit cookie pattern). Must run after
// requireAuth is not required, but in practice every route that needs this also needs requireAuth.
export function requireCsrf(req, res, next) {
    const cookies = parseCookies(req);
    const cookieToken = cookies[CSRF_COOKIE];
    const headerToken = req.headers['x-csrf-token'];

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return res.status(403).json({ error: 'Invalid or missing CSRF token. Please refresh the page and try again.' });
    }

    next();
}

// Generates a random CSRF token (used at login/register time).
export function generateCsrfToken() {
    return crypto.randomBytes(24).toString('hex');
}

// Sets the three session cookies after a successful login/register. secure:false is required for
// plain http://localhost development - Express won't send Secure cookies over http, so the login
// cookie would silently never be stored if this were hardcoded to true. In production (deployed
// behind https, e.g. Vercel) this correctly switches to Secure cookies.
export function setSessionCookies(res, { accessToken, refreshToken, csrfToken, maxAgeMs }) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: maxAgeMs,
        path: '/'
    });

    if (refreshToken) {
        res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: maxAgeMs,
            path: '/'
        });
    }

    // Intentionally NOT httpOnly - the frontend needs to read this one to echo it back as a header.
    res.cookie(CSRF_COOKIE, csrfToken, {
        httpOnly: false,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: maxAgeMs,
        path: '/'
    });
}

export function clearSessionCookies(res) {
    res.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
    res.clearCookie(CSRF_COOKIE, { path: '/' });
}
