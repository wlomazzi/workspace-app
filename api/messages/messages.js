import express from 'express';
import { supabase } from '../../lib/supabase.js';
import { requireAuth, requireCsrf } from '../middleware/auth.js';

const router = express.Router();

router.use(express.json());

const MESSAGE_MAX_LENGTH = 4000;
const DEFAULT_PAGE_SIZE = 30;

// Friendly mapping for the errors create_or_get_conversation() (see migration_messages.sql)
// can raise - the DB is the source of truth for these checks, this just avoids leaking a raw
// Postgres error message to the frontend.
function mapConversationRpcError(error) {
    const message = error?.message || '';
    if (message.includes('Not authenticated')) return { status: 401, error: 'Not authenticated. Please log in.' };
    if (message.includes('Space not found')) return { status: 404, error: 'Space not found.' };
    if (message.includes('Cannot message yourself')) return { status: 400, error: 'You cannot message yourself about your own space.' };
    if (message.includes('Booking does not belong')) return { status: 400, error: 'This booking does not belong to you on this space.' };
    console.error('Unexpected error from create_or_get_conversation:', error);
    return { status: 500, error: 'Failed to start the conversation.' };
}

// Small helper shared by /list and /thread: turns a raw conversation row into the
// "other participant" id (the person who ISN'T the requesting user).
function otherParticipantId(conversation, userId) {
    return conversation.tenant_id === userId ? conversation.owner_id : conversation.tenant_id;
}


// ================================================================================================
// POST /api/messages/start
// Body: { space_id, booking_id? }
// Creates (or reuses, if one is already active) the conversation between the logged-in user and
// the workspace's owner. This is what the "Falar com o proprietário" button on space_details.html
// calls - see section 5/16 of the request. All the actual rules (space must exist, can't message
// yourself, booking must belong to you, reuse-if-active) live in the create_or_get_conversation()
// Postgres function so they hold even if this endpoint is ever bypassed.
// ================================================================================================
router.post('/start', requireAuth, requireCsrf, async (req, res) => {
    const { space_id, booking_id } = req.body;

    if (!space_id) {
        return res.status(400).json({ error: 'space_id is required' });
    }

    try {
        const { data: conversationId, error } = await req.supabaseAuthed.rpc('create_or_get_conversation', {
            p_space_id: space_id,
            p_booking_id: booking_id || null,
        });

        if (error) {
            const mapped = mapConversationRpcError(error);
            return res.status(mapped.status).json({ error: mapped.error });
        }

        res.json({ conversation_id: conversationId });

    } catch (error) {
        console.error('Error starting conversation:', error.message);
        res.status(500).json({ error: 'Failed to start the conversation.' });
    }
});


// ================================================================================================
// POST /api/messages/list
// Returns every conversation the logged-in user participates in, newest activity first, with
// enough context to render the conversation list (section 10/11/12 of the request) without a
// second round-trip per row: the space, the other participant, a preview of the last message, the
// unread count, and (when present) the linked booking.
//
// Uses POST (not GET) to match this project's existing convention for authenticated reads that
// don't map to a single resource id (see owner_spaces/coworker_spaces in workspaces.js).
// ================================================================================================
router.post('/list', requireAuth, async (req, res) => {
    const userId = req.userId;

    try {
        // RLS (conversations_select_participant) already restricts this to the caller's own
        // conversations - no extra .eq() needed here.
        const { data: conversations, error: conversationsError } = await req.supabaseAuthed
            .from('conversations')
            .select('*')
            .order('last_message_at', { ascending: false });

        if (conversationsError) {
            return res.status(500).json({ error: 'Error fetching conversations.' });
        }

        if (!conversations || conversations.length === 0) {
            return res.json([]);
        }

        const conversationIds = conversations.map(c => c.id);
        const spaceIds = [...new Set(conversations.map(c => c.space_id))];
        const otherUserIds = [...new Set(conversations.map(c => otherParticipantId(c, userId)))];
        const bookingIds = [...new Set(conversations.map(c => c.booking_id).filter(Boolean))];

        // Workspaces and profiles are both public-readable (see schema.sql) - the plain anon
        // client is fine here, no need for the JWT-scoped one.
        const [{ data: spaces, error: spacesError }, { data: profiles, error: profilesError }] = await Promise.all([
            supabase.from('workspaces').select('id, title, neighborhood, image_01').in('id', spaceIds),
            supabase.from('profiles').select('id, full_name, avatar_url').in('id', otherUserIds),
        ]);

        if (spacesError) return res.status(500).json({ error: 'Error fetching space details.' });
        if (profilesError) return res.status(500).json({ error: 'Error fetching participant profiles.' });

        // Bookings: reservations RLS only allows rows where the caller is the renter or owns the
        // workspace - both are true here by construction (a conversation only exists between a
        // space's owner and a tenant), so req.supabaseAuthed sees exactly the rows we need.
        let bookings = [];
        if (bookingIds.length > 0) {
            const { data: bookingRows, error: bookingsError } = await req.supabaseAuthed
                .from('reservations')
                .select('id, start_time, end_time, status')
                .in('id', bookingIds);
            if (bookingsError) return res.status(500).json({ error: 'Error fetching booking details.' });
            bookings = bookingRows || [];
        }

        // Last message preview per conversation - fetch every message on these conversations
        // ordered newest-first and keep only the first one seen per conversation_id. Fine at this
        // scale; if the message volume per conversation grows large, this should become a
        // dedicated view/RPC (e.g. DISTINCT ON (conversation_id) ... ORDER BY conversation_id,
        // created_at DESC) instead of pulling every row over the wire.
        const { data: recentMessages, error: messagesError } = await req.supabaseAuthed
            .from('messages')
            .select('conversation_id, message, created_at, sender_id')
            .in('conversation_id', conversationIds)
            .order('created_at', { ascending: false });

        if (messagesError) return res.status(500).json({ error: 'Error fetching message previews.' });

        const lastMessageByConversation = new Map();
        for (const message of recentMessages || []) {
            if (!lastMessageByConversation.has(message.conversation_id)) {
                lastMessageByConversation.set(message.conversation_id, message);
            }
        }

        // Unread counts: messages addressed to me (sender is the OTHER participant) that I
        // haven't read yet. messages_unread_idx (migration_messages.sql) keeps this cheap.
        const { data: unreadRows, error: unreadError } = await req.supabaseAuthed
            .from('messages')
            .select('conversation_id')
            .in('conversation_id', conversationIds)
            .neq('sender_id', userId)
            .is('read_at', null);

        if (unreadError) return res.status(500).json({ error: 'Error fetching unread counts.' });

        const unreadCountByConversation = new Map();
        for (const row of unreadRows || []) {
            unreadCountByConversation.set(row.conversation_id, (unreadCountByConversation.get(row.conversation_id) || 0) + 1);
        }

        const result = conversations.map(conversation => {
            const otherId = otherParticipantId(conversation, userId);
            const space = (spaces || []).find(s => s.id === conversation.space_id) || null;
            const otherParticipant = (profiles || []).find(p => p.id === otherId) || null;
            const lastMessage = lastMessageByConversation.get(conversation.id) || null;
            const booking = conversation.booking_id ? (bookings.find(b => b.id === conversation.booking_id) || null) : null;

            return {
                conversation_id: conversation.id,
                status: conversation.status,
                last_message_at: conversation.last_message_at,
                my_role: conversation.tenant_id === userId ? 'tenant' : 'owner',
                space,
                other_participant: otherParticipant,
                last_message: lastMessage,
                unread_count: unreadCountByConversation.get(conversation.id) || 0,
                booking,
            };
        });

        res.json(result);

    } catch (error) {
        console.error('Error listing conversations:', error.message);
        res.status(500).json({ error: error.message });
    }
});


// ================================================================================================
// POST /api/messages/thread
// Body: { conversation_id, before_id?, limit? }
// Returns the header context for one conversation (space, other participant, booking - section
// 6/13 of the request) plus a page of messages, oldest-first within the page. Pass the id of the
// oldest message you already have as before_id to load older history incrementally (section 19 -
// never load the full history at once).
// ================================================================================================
router.post('/thread', requireAuth, async (req, res) => {
    const userId = req.userId;
    const { conversation_id, before_id } = req.body;
    const limit = Math.min(Math.max(parseInt(req.body.limit, 10) || DEFAULT_PAGE_SIZE, 1), 100);

    if (!conversation_id) {
        return res.status(400).json({ error: 'conversation_id is required' });
    }

    try {
        // RLS makes this return nothing (not an error) if the caller isn't a participant -
        // .single() turns that into a clean 404 instead of a confusing empty 200.
        const { data: conversation, error: conversationError } = await req.supabaseAuthed
            .from('conversations')
            .select('*')
            .eq('id', conversation_id)
            .single();

        if (conversationError || !conversation) {
            return res.status(404).json({ error: 'Conversation not found.' });
        }

        const otherId = otherParticipantId(conversation, userId);

        // maybeSingle() (not single()) for both - space should always exist (workspaces cascade-
        // deletes its conversations), but profiles rows are only created lazily the first time a
        // user saves their profile (see schema.sql), so the other participant may legitimately
        // have none yet. single() would turn that into a hard error; maybeSingle() just gives null
        // and the frontend falls back to a generic label.
        const [{ data: space, error: spaceError }, { data: otherParticipant, error: profileError }] = await Promise.all([
            supabase.from('workspaces').select('id, title, neighborhood, image_01, address').eq('id', conversation.space_id).maybeSingle(),
            supabase.from('profiles').select('id, full_name, avatar_url').eq('id', otherId).maybeSingle(),
        ]);

        if (spaceError) return res.status(500).json({ error: 'Error fetching space details.' });
        if (profileError) return res.status(500).json({ error: 'Error fetching participant profile.' });
        if (!space) return res.status(404).json({ error: 'The space for this conversation no longer exists.' });

        let booking = null;
        if (conversation.booking_id) {
            const { data: bookingRow, error: bookingError } = await req.supabaseAuthed
                .from('reservations')
                .select('id, start_time, end_time, status, lease_time, start_hour, end_hour')
                .eq('id', conversation.booking_id)
                .maybeSingle(); // booking_id is set null by the DB if the reservation is ever deleted, but guard the race anyway
            if (bookingError) return res.status(500).json({ error: 'Error fetching booking details.' });
            booking = bookingRow;
        }

        let messagesQuery = req.supabaseAuthed
            .from('messages')
            .select('*')
            .eq('conversation_id', conversation_id)
            .order('created_at', { ascending: false })
            .limit(limit + 1); // fetch one extra row to know whether there's more history

        if (before_id) {
            messagesQuery = messagesQuery.lt('id', before_id);
        }

        const { data: messagesDesc, error: messagesError } = await messagesQuery;
        if (messagesError) return res.status(500).json({ error: 'Error fetching messages.' });

        const hasMore = (messagesDesc || []).length > limit;
        const page = (messagesDesc || []).slice(0, limit).reverse(); // oldest-first for rendering

        res.json({
            conversation: {
                id: conversation.id,
                status: conversation.status,
                my_role: conversation.tenant_id === userId ? 'tenant' : 'owner',
            },
            space,
            other_participant: otherParticipant,
            booking,
            messages: page,
            has_more: hasMore,
        });

    } catch (error) {
        console.error('Error fetching conversation thread:', error.message);
        res.status(500).json({ error: error.message });
    }
});


// ================================================================================================
// POST /api/messages/send
// Body: { conversation_id, message }
// sender_id always comes from the verified session (req.userId), never the request body - the
// messages_insert_participant RLS policy enforces this too, server-side, regardless of what this
// route does, but checking it here first gives a much friendlier error than a raw RLS rejection.
// ================================================================================================
router.post('/send', requireAuth, requireCsrf, async (req, res) => {
    const userId = req.userId;
    const { conversation_id, message } = req.body;

    if (!conversation_id) {
        return res.status(400).json({ error: 'conversation_id is required' });
    }

    const trimmed = typeof message === 'string' ? message.trim() : '';
    if (!trimmed) {
        return res.status(400).json({ error: 'Message cannot be empty.' });
    }
    if (trimmed.length > MESSAGE_MAX_LENGTH) {
        return res.status(400).json({ error: `Message cannot be longer than ${MESSAGE_MAX_LENGTH} characters.` });
    }

    try {
        const { data, error } = await req.supabaseAuthed
            .from('messages')
            .insert({
                conversation_id,
                sender_id: userId,
                message: trimmed,
            })
            .select('*')
            .single();

        if (error) {
            // RLS rejection (not a participant) surfaces here as a permission-denied error.
            console.error('Error sending message:', error);
            return res.status(403).json({ error: 'You cannot send messages in this conversation.' });
        }

        res.status(201).json(data);

    } catch (error) {
        console.error('Error sending message:', error.message);
        res.status(500).json({ error: error.message });
    }
});


// ================================================================================================
// POST /api/messages/read
// Body: { conversation_id }
// Marks every message in the conversation that was sent TO the caller (i.e. not by them) as read.
// Mirrors section 8 of the request: never marks the caller's own messages as read.
// ================================================================================================
router.post('/read', requireAuth, requireCsrf, async (req, res) => {
    const userId = req.userId;
    const { conversation_id } = req.body;

    if (!conversation_id) {
        return res.status(400).json({ error: 'conversation_id is required' });
    }

    try {
        const { data, error } = await req.supabaseAuthed
            .from('messages')
            .update({ read_at: new Date().toISOString(), status: 'read' })
            .eq('conversation_id', conversation_id)
            .neq('sender_id', userId)
            .is('read_at', null)
            .select('id');

        if (error) {
            console.error('Error marking messages as read:', error);
            return res.status(500).json({ error: 'Failed to mark messages as read.' });
        }

        res.json({ updated: (data || []).length });

    } catch (error) {
        console.error('Error marking messages as read:', error.message);
        res.status(500).json({ error: error.message });
    }
});


// ================================================================================================
// GET /api/messages/unread_count
// Powers the navbar badge (section 8 of the request). Delegates to the get_unread_message_count()
// SQL function (migration_messages.sql) rather than reimplementing the same join/filter here.
// ================================================================================================
router.get('/unread_count', requireAuth, async (req, res) => {
    try {
        const { data, error } = await req.supabaseAuthed.rpc('get_unread_message_count');

        if (error) {
            console.error('Error fetching unread message count:', error);
            return res.status(500).json({ error: 'Failed to fetch unread count.' });
        }

        res.json({ count: data || 0 });

    } catch (error) {
        console.error('Error fetching unread message count:', error.message);
        res.status(500).json({ error: error.message });
    }
});

export default router;
