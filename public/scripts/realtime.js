// Shared Supabase Realtime client for the messaging system.
//
// This is the SECOND legitimate spot in the app (besides reset_password.js) where a client-side
// Supabase client talks directly to Supabase instead of going through the Express backend. It has
// to: Realtime subscriptions are opened by the browser itself over its own websocket.
//
// To keep that websocket subject to the same RLS policies as everything else (so a user's browser
// can only ever receive INSERT/UPDATE events for conversations they actually participate in -
// see migration_messages.sql section 5/7), it needs to authenticate with the user's own JWT via
// supabase.realtime.setAuth(token). That token is fetched from GET /api/messages/realtime_token
// (see api/messages/messages.js for why that endpoint exists) and kept ONLY in the module-level
// variable below - never written to localStorage/sessionStorage - and refreshed shortly before it
// expires. Anything importing this file gets the same shared client/subscription bookkeeping, so
// pages never accidentally open two separate Realtime connections for the same tab.
//
// Requires <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> to have
// already loaded (window.supabase) before any of this runs.

let clientPromise = null;
let refreshTimer = null;

// Every open subscription channel, keyed by the name passed to subscribe(), so a caller can
// re-subscribe (e.g. switching the open conversation in the messages page) without ever leaking
// the previous channel - subscribe() below automatically tears down any existing channel with the
// same key first.
const activeChannels = new Map();

async function fetchRealtimeToken() {
    const response = await fetch('/api/messages/realtime_token', { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch realtime token');
    return response.json();
}

async function fetchSupabaseConfig() {
    const response = await fetch('/api/config');
    if (!response.ok) throw new Error('Failed to fetch Supabase config');
    return response.json();
}

async function scheduleTokenRefresh(client, expiresAt) {
    if (refreshTimer) clearTimeout(refreshTimer);

    // Refresh 60s before expiry, falling back to a 4-minute cadence if we couldn't read the
    // token's exp claim for some reason (still well under Supabase's default 1h token lifetime).
    const nowSeconds = Date.now() / 1000;
    const delayMs = expiresAt
        ? Math.max((expiresAt - nowSeconds - 60) * 1000, 5000)
        : 4 * 60 * 1000;

    refreshTimer = setTimeout(async () => {
        try {
            const { access_token, expires_at } = await fetchRealtimeToken();
            client.realtime.setAuth(access_token);
            scheduleTokenRefresh(client, expires_at);
        } catch (error) {
            console.error('Error refreshing realtime auth token:', error);
            // Try again shortly rather than leaving the socket to silently go stale.
            refreshTimer = setTimeout(() => scheduleTokenRefresh(client, null), 30 * 1000);
        }
    }, delayMs);
}

// Returns a ready-to-use, already-authenticated Supabase client (creating + authenticating it on
// first call, reusing it after). Resolves to null if the visitor isn't logged in - callers should
// treat that as "no realtime available", not throw.
export function getRealtimeClient() {
    if (!clientPromise) {
        clientPromise = (async () => {
            if (typeof window === 'undefined' || !window.supabase) {
                console.error('supabase-js is not loaded - realtime.js requires the CDN script tag.');
                return null;
            }

            const [config, tokenInfo] = await Promise.all([
                fetchSupabaseConfig(),
                fetchRealtimeToken().catch(() => null), // not logged in, or session expired
            ]);

            if (!tokenInfo) return null;

            const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
                auth: { persistSession: false }, // this client is ONLY for Realtime, never for querying tables
            });

            client.realtime.setAuth(tokenInfo.access_token);
            scheduleTokenRefresh(client, tokenInfo.expires_at);

            return client;
        })();
    }
    return clientPromise;
}

// Subscribes to postgres_changes on public.messages. `key` identifies this subscription slot -
// calling subscribe() again with the same key (e.g. the user switched conversations) automatically
// unsubscribes the previous channel first, so callers never have to remember to clean up manually
// mid-session. Returns an unsubscribe() function for explicit cleanup too (e.g. on page teardown).
//
// filter: optional Postgres Changes filter string, e.g. `conversation_id=eq.42`. Omit it to
// receive every change the caller's RLS allows them to see (used for the navbar badge / the
// conversation list, which care about ALL of the user's conversations at once, not just one).
export async function subscribeToMessages(key, { filter, onInsert, onUpdate } = {}) {
    unsubscribe(key);

    const client = await getRealtimeClient();
    if (!client) return () => {};

    let channel = client.channel(`messages:${key}`);

    if (onInsert) {
        channel = channel.on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages', ...(filter ? { filter } : {}) },
            payload => onInsert(payload.new)
        );
    }
    if (onUpdate) {
        channel = channel.on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'messages', ...(filter ? { filter } : {}) },
            payload => onUpdate(payload.new)
        );
    }

    channel.subscribe();
    activeChannels.set(key, channel);

    return () => unsubscribe(key);
}

export async function unsubscribe(key) {
    const existing = activeChannels.get(key);
    if (!existing) return;
    activeChannels.delete(key);
    const client = await getRealtimeClient();
    if (client) client.removeChannel(existing);
}

// Tears down every open subscription - not usually needed (a full page navigation already
// destroys the whole JS context and the websocket with it), but useful for SPA-like transitions
// within messages.html and handy in tests.
export async function unsubscribeAll() {
    for (const key of [...activeChannels.keys()]) {
        await unsubscribe(key);
    }
}
