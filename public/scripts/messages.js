// Messages page (the "Central de mensagens" - section 9 of the request): a two-pane inbox on
// desktop (conversation list + open thread side by side), one pane at a time on mobile (see
// styles_messages.css' .thread-open toggle). Loaded as a module (see messages.html) so it can
// import the shared Realtime helper directly instead of a dynamic import.

import { subscribeToMessages, unsubscribe } from '/scripts/realtime.js';

const userId = localStorage.getItem('user_id');
if (!userId) {
    window.location.href = 'login.html';
}

const FALLBACK_SPACE_IMAGE = '/images/logo.png';
const GROUPED_WINDOW_MS = 5 * 60 * 1000; // messages from the same sender within 5 min sit closer together

// ---- DOM refs -----------------------------------------------------------------------------
const messagesPageEl = document.getElementById('messagesPage');

const conversationsListEl = document.getElementById('conversationsList');
const conversationsLoadingEl = document.getElementById('conversationsLoading');
const conversationsEmptyEl = document.getElementById('conversationsEmpty');
const conversationsErrorEl = document.getElementById('conversationsError');
const conversationsRetryBtn = document.getElementById('conversationsRetryBtn');

const threadPlaceholderEl = document.getElementById('threadPlaceholder');
const threadContentEl = document.getElementById('threadContent');
const threadBackBtn = document.getElementById('threadBackBtn');
const threadSpaceImg = document.getElementById('threadSpaceImg');
const threadSpaceTitle = document.getElementById('threadSpaceTitle');
const threadPersonName = document.getElementById('threadPersonName');
const threadBookingBanner = document.getElementById('threadBookingBanner');
const threadMessagesEl = document.getElementById('threadMessages');
const threadLoadMoreBtn = document.getElementById('threadLoadMoreBtn');
const threadMessagesListEl = document.getElementById('threadMessagesList');
const threadErrorEl = document.getElementById('threadError');
const threadComposer = document.getElementById('threadComposer');
const threadComposerInput = document.getElementById('threadComposerInput');
const threadSendBtn = document.getElementById('threadSendBtn');

// ---- State ----------------------------------------------------------------------------------
let conversations = [];
let activeConversationId = null;
let currentThreadMessages = [];
let hasMoreOlder = false;
let isSending = false;

const urlParams = new URLSearchParams(window.location.search);
const initialConversationId = urlParams.get('conversation_id') ? Number(urlParams.get('conversation_id')) : null;

// ---- Small DOM helper: always textContent for anything user-supplied (space titles, names,
// message bodies are all user input) - never innerHTML with interpolated data (section 22: XSS).
function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function formatClock(iso) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isSameDay(a, b) {
    const da = new Date(a), db = new Date(b);
    return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function formatDayLabel(iso) {
    const date = new Date(iso);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    if (isSameDay(date, now)) return 'Today';
    if (isSameDay(date, yesterday)) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function formatListTimestamp(iso) {
    const date = new Date(iso);
    const now = new Date();
    if (isSameDay(date, now)) return formatClock(iso);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatBookingDate(dateStr) {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}


// ================================================================================================
// Conversations list (left pane)
// ================================================================================================
function showConversationsState(state) {
    conversationsListEl.style.display = state === 'list' ? 'block' : 'none';
    conversationsLoadingEl.style.display = state === 'loading' ? 'block' : 'none';
    conversationsEmptyEl.style.display = state === 'empty' ? 'block' : 'none';
    conversationsErrorEl.style.display = state === 'error' ? 'block' : 'none';
}

async function loadConversations() {
    showConversationsState('loading');
    try {
        const response = await apiFetch('/api/messages/list', { method: 'POST' });
        if (!response.ok) throw new Error('Failed to load conversations');
        conversations = await response.json();
        renderConversationsList();
        showConversationsState(conversations.length === 0 ? 'empty' : 'list');
    } catch (error) {
        console.error('Error loading conversations:', error);
        showConversationsState('error');
    }
}

function renderConversationsList() {
    conversationsListEl.innerHTML = '';

    conversations.forEach(conv => {
        const isActive = conv.conversation_id === activeConversationId;
        const isUnread = conv.unread_count > 0;

        const item = el('button', `conversation-item${isActive ? ' active' : ''}${isUnread ? ' unread' : ''}`);
        item.type = 'button';
        item.dataset.conversationId = String(conv.conversation_id);

        const img = document.createElement('img');
        img.className = 'conversation-item-img';
        img.alt = '';
        img.src = conv.space?.image_01 || FALLBACK_SPACE_IMAGE;
        item.appendChild(img);

        const body = el('div', 'conversation-item-body');

        const top = el('div', 'conversation-item-top');
        top.appendChild(el('div', 'conversation-item-space', conv.space?.title || 'Space'));
        top.appendChild(el('div', 'conversation-item-time', conv.last_message ? formatListTimestamp(conv.last_message.created_at) : ''));
        body.appendChild(top);

        body.appendChild(el('div', 'conversation-item-person', conv.other_participant?.full_name || 'User'));

        const previewRow = el('div', 'conversation-item-top');
        const previewText = conv.last_message
            ? `${conv.last_message.sender_id === userId ? 'You: ' : ''}${conv.last_message.message}`
            : 'No messages yet';
        previewRow.appendChild(el('div', 'conversation-item-preview', previewText));
        if (isUnread) {
            previewRow.appendChild(el('div', 'conversation-item-unread-badge', conv.unread_count > 9 ? '9+' : String(conv.unread_count)));
        }
        body.appendChild(previewRow);

        item.appendChild(body);
        item.addEventListener('click', () => openConversation(conv.conversation_id));
        conversationsListEl.appendChild(item);
    });
}

function highlightActiveConversationItem(id) {
    [...conversationsListEl.children].forEach(item => {
        item.classList.toggle('active', Number(item.dataset.conversationId) === id);
    });
}

// Applies a message event to the list in place (no full reload) - keeps the list fast and
// correct as Realtime events arrive (last preview text, ordering, unread badge).
function upsertConversationFromMessage(message) {
    const conv = conversations.find(c => c.conversation_id === message.conversation_id);

    if (!conv) {
        // A conversation we don't have loaded yet (e.g. it was just created against us in
        // another tab/device) - simplest correct move is a full resync.
        loadConversations();
        return;
    }

    conv.last_message = { message: message.message, created_at: message.created_at, sender_id: message.sender_id };
    conv.last_message_at = message.created_at;

    if (message.sender_id !== userId && message.conversation_id !== activeConversationId) {
        conv.unread_count = (conv.unread_count || 0) + 1;
    }

    conversations.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
    renderConversationsList();
}


// ================================================================================================
// Thread pane (right pane)
// ================================================================================================
async function openConversation(id) {
    activeConversationId = id;
    currentThreadMessages = [];
    hasMoreOlder = false;

    messagesPageEl.classList.add('thread-open');
    highlightActiveConversationItem(id);

    threadPlaceholderEl.style.display = 'none';
    threadContentEl.style.display = 'flex';
    threadErrorEl.style.display = 'none';
    threadMessagesListEl.innerHTML = '';
    threadMessagesListEl.appendChild(el('p', 'conversations-state', 'Loading messages…'));
    threadLoadMoreBtn.style.display = 'none';

    try {
        const response = await apiFetch('/api/messages/thread', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversation_id: id }),
        });
        if (!response.ok) throw new Error('Failed to load conversation');
        const data = await response.json();

        renderThreadHeader(data);
        currentThreadMessages = data.messages;
        hasMoreOlder = data.has_more;
        threadLoadMoreBtn.style.display = hasMoreOlder ? 'inline-block' : 'none';
        renderMessageList();
        scrollThreadToBottom();

        markConversationRead(id);
        subscribeToOpenThread(id);

    } catch (error) {
        console.error('Error opening conversation:', error);
        threadMessagesListEl.innerHTML = '';
        threadErrorEl.textContent = 'Could not load this conversation. Please try again.';
        threadErrorEl.style.display = 'block';
    }
}

function renderThreadHeader(data) {
    threadSpaceImg.src = data.space?.image_01 || FALLBACK_SPACE_IMAGE;
    threadSpaceTitle.textContent = data.space?.title || 'Space';

    const roleLabel = data.conversation.my_role === 'tenant' ? 'Owner' : 'Renter';
    threadPersonName.textContent = `${data.other_participant?.full_name || 'User'} · ${roleLabel}`;

    if (data.booking) {
        const b = data.booking;
        const when = b.lease_time === 'hour'
            ? `${formatBookingDate(b.start_time)}, ${String(b.start_hour).padStart(2, '0')}:00–${String(b.end_hour).padStart(2, '0')}:00`
            : `${formatBookingDate(b.start_time)} to ${formatBookingDate(b.end_time)}`;
        threadBookingBanner.textContent = `Reservation #${b.id} · ${when} · Status: ${b.status}`;
        threadBookingBanner.style.display = 'block';
    } else {
        threadBookingBanner.style.display = 'none';
    }
}

function renderMessageList() {
    threadMessagesListEl.innerHTML = '';

    if (currentThreadMessages.length === 0) {
        threadMessagesListEl.appendChild(el('p', 'conversations-state', 'Send the first message to start this conversation.'));
        return;
    }

    let previous = null;
    currentThreadMessages.forEach(message => {
        if (!previous || !isSameDay(previous.created_at, message.created_at)) {
            threadMessagesListEl.appendChild(el('div', 'thread-day-divider', formatDayLabel(message.created_at)));
        }

        const grouped = !!previous
            && previous.sender_id === message.sender_id
            && isSameDay(previous.created_at, message.created_at)
            && (new Date(message.created_at) - new Date(previous.created_at)) < GROUPED_WINDOW_MS
            && !message.__pending && !previous.__pending;

        threadMessagesListEl.appendChild(buildMessageRow(message, grouped));
        previous = message;
    });
}

function buildMessageRow(message, grouped) {
    const isMine = message.sender_id === userId;
    const row = el('div', `thread-msg-row ${isMine ? 'mine' : 'theirs'}${grouped ? ' grouped' : ''}${message.__pending ? ' pending' : ''}`);

    const bubbleWrap = el('div');
    bubbleWrap.appendChild(el('div', 'thread-msg-bubble', message.message));

    const meta = el('div', 'thread-msg-meta');
    if (message.__failed) {
        meta.appendChild(el('span', null, 'Failed to send.'));
        const retryBtn = el('button', 'thread-msg-retry-btn', 'Retry');
        retryBtn.type = 'button';
        retryBtn.addEventListener('click', () => retrySendMessage(message.__tempId));
        meta.appendChild(retryBtn);
    } else if (message.__pending) {
        meta.appendChild(el('span', null, 'Sending…'));
    } else {
        meta.appendChild(el('span', null, formatClock(message.created_at)));
        if (isMine) {
            meta.appendChild(el('span', null, message.read_at ? '· Read' : '· Sent'));
        }
    }
    bubbleWrap.appendChild(meta);
    row.appendChild(bubbleWrap);
    return row;
}

function scrollThreadToBottom() {
    threadMessagesEl.scrollTop = threadMessagesEl.scrollHeight;
}

function isScrolledNearBottom() {
    return threadMessagesEl.scrollHeight - threadMessagesEl.scrollTop - threadMessagesEl.clientHeight < 120;
}

async function loadOlderMessages() {
    if (!hasMoreOlder || currentThreadMessages.length === 0) return;

    const oldest = currentThreadMessages[0];
    const previousScrollHeight = threadMessagesEl.scrollHeight;

    try {
        const response = await apiFetch('/api/messages/thread', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversation_id: activeConversationId, before_id: oldest.id }),
        });
        if (!response.ok) throw new Error('Failed to load older messages');
        const data = await response.json();

        currentThreadMessages = [...data.messages, ...currentThreadMessages];
        hasMoreOlder = data.has_more;
        threadLoadMoreBtn.style.display = hasMoreOlder ? 'inline-block' : 'none';
        renderMessageList();

        threadMessagesEl.scrollTop = threadMessagesEl.scrollHeight - previousScrollHeight;

    } catch (error) {
        console.error('Error loading older messages:', error);
    }
}

async function markConversationRead(id) {
    try {
        await apiFetch('/api/messages/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversation_id: id }),
        });
        const conv = conversations.find(c => c.conversation_id === id);
        if (conv && conv.unread_count) {
            conv.unread_count = 0;
            renderConversationsList();
        }
    } catch (error) {
        console.error('Error marking conversation as read:', error);
    }
}

function closeThread() {
    messagesPageEl.classList.remove('thread-open');
    activeConversationId = null;
    currentThreadMessages = [];
    unsubscribe('thread');
    highlightActiveConversationItem(null);
}


// ================================================================================================
// Composer (sending messages)
// ================================================================================================
function autoGrowTextarea() {
    threadComposerInput.style.height = 'auto';
    threadComposerInput.style.height = `${Math.min(threadComposerInput.scrollHeight, 120)}px`;
}

async function sendMessage(text, tempId) {
    isSending = true;
    threadSendBtn.disabled = true;

    try {
        const response = await apiFetch('/api/messages/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversation_id: activeConversationId, message: text }),
        });

        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.error || 'Failed to send message');
        }

        const saved = await response.json();
        const idx = currentThreadMessages.findIndex(m => m.__tempId === tempId);
        if (idx !== -1) currentThreadMessages[idx] = saved;
        renderMessageList();
        upsertConversationFromMessage(saved);

    } catch (error) {
        console.error('Error sending message:', error);
        const idx = currentThreadMessages.findIndex(m => m.__tempId === tempId);
        if (idx !== -1) {
            currentThreadMessages[idx].__pending = false;
            currentThreadMessages[idx].__failed = true;
        }
        renderMessageList();
    } finally {
        isSending = false;
        threadSendBtn.disabled = false;
    }
}

function retrySendMessage(tempId) {
    const message = currentThreadMessages.find(m => m.__tempId === tempId);
    if (!message || isSending) return;
    message.__pending = true;
    message.__failed = false;
    renderMessageList();
    scrollThreadToBottom();
    sendMessage(message.message, tempId);
}

threadComposer.addEventListener('submit', (event) => {
    event.preventDefault();

    const text = threadComposerInput.value.trim();
    if (!text || !activeConversationId || isSending) return;

    const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    currentThreadMessages.push({
        __tempId: tempId,
        __pending: true,
        conversation_id: activeConversationId,
        sender_id: userId,
        message: text,
        created_at: new Date().toISOString(),
        read_at: null,
    });
    renderMessageList();
    scrollThreadToBottom();

    threadComposerInput.value = '';
    autoGrowTextarea();

    sendMessage(text, tempId);
});

threadComposerInput.addEventListener('input', autoGrowTextarea);

// Enter sends, Shift+Enter adds a newline - standard chat composer behavior.
threadComposerInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        threadComposer.requestSubmit();
    }
});


// ================================================================================================
// Realtime wiring
// ================================================================================================
function subscribeToInbox() {
    // No filter: RLS on public.messages already restricts this to conversations the logged-in
    // user participates in (see migration_messages.sql), so this is exactly "any new activity
    // across all of my conversations" without needing to know their ids up front.
    subscribeToMessages('inbox', {
        onInsert: (message) => upsertConversationFromMessage(message),
        onUpdate: (message) => upsertConversationFromMessage(message),
    });
}

function subscribeToOpenThread(id) {
    subscribeToMessages('thread', {
        filter: `conversation_id=eq.${id}`,
        onInsert: (message) => {
            if (message.sender_id === userId) return; // already shown optimistically by sendMessage()
            const wasNearBottom = isScrolledNearBottom();
            currentThreadMessages.push(message);
            renderMessageList();
            if (wasNearBottom) scrollThreadToBottom();
            markConversationRead(id);
        },
        onUpdate: (message) => {
            const idx = currentThreadMessages.findIndex(m => m.id === message.id);
            if (idx === -1) return;
            currentThreadMessages[idx] = message;
            renderMessageList();
        },
    });
}


// ================================================================================================
// Boot
// ================================================================================================
async function init() {
    await loadConversations();

    if (initialConversationId) {
        openConversation(initialConversationId);
    } else if (window.matchMedia('(min-width: 769px)').matches && conversations.length > 0) {
        openConversation(conversations[0].conversation_id);
    }

    subscribeToInbox();

    threadBackBtn.addEventListener('click', closeThread);
    conversationsRetryBtn.addEventListener('click', loadConversations);
    threadLoadMoreBtn.addEventListener('click', loadOlderMessages);
}

document.addEventListener('DOMContentLoaded', init);
