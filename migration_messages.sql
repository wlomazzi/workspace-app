-- ============================================================================
-- Migration: messaging system (renter <-> owner, contextualized to a space)
-- ============================================================================
-- Run this AFTER schema.sql, migration_hour_booking.sql and
-- migration_security_hardening.sql (it references public.workspaces,
-- public.reservations and auth.uid()-based RLS conventions from those files).
--
-- Design summary
-- --------------
-- Conversation -> Space (required) -> Booking (optional) -> Owner
-- A conversation always belongs to exactly one workspace and has exactly two
-- participants: the renter who started it (tenant_id) and that workspace's
-- owner (owner_id) at the time it was created. It MAY also reference a
-- specific reservation, but never must - a renter can message an owner
-- before ever booking anything.
--
-- Why tenant_id/owner_id are denormalized onto conversations (beyond what
-- was originally sketched as just space_id/booking_id/created_by):
--   - It lets us enforce "one reusable active conversation per (space, renter)"
--     with a single partial unique index, instead of a cross-table constraint
--     Postgres can't express directly.
--   - It makes the common list/read queries (Fase 6/9) a single-table scan
--     instead of a join through conversation_participants every time.
-- conversation_participants is still the SOURCE OF TRUTH used by every RLS
-- policy below (not the denormalized columns) - so if this app ever needs
-- more than 2 participants per conversation later, the security model
-- doesn't need to change, only the uniqueness/listing convenience layer does.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. CONVERSATIONS
-- ----------------------------------------------------------------------------
create table if not exists public.conversations (
    id               bigint generated always as identity primary key,
    space_id         bigint not null references public.workspaces(id) on delete cascade,
    booking_id       bigint references public.reservations(id) on delete set null,
    tenant_id        uuid not null references auth.users(id) on delete cascade,
    owner_id         uuid not null references auth.users(id) on delete cascade,
    created_by       uuid not null references auth.users(id),
    status           text not null default 'active' check (status in ('active', 'archived')),
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now(),
    last_message_at  timestamptz not null default now(),

    constraint conversations_tenant_owner_distinct check (tenant_id <> owner_id)
);

-- One reusable ACTIVE conversation per (space, renter). Archiving a
-- conversation frees up the slot for a fresh one if the renter reaches out
-- again after being archived - but under normal use conversations are never
-- deleted, so history is never lost (see section 13 of the request).
create unique index if not exists conversations_active_space_tenant_uniq
    on public.conversations (space_id, tenant_id)
    where status = 'active';

create index if not exists conversations_owner_id_idx on public.conversations (owner_id);
create index if not exists conversations_tenant_id_idx on public.conversations (tenant_id);
create index if not exists conversations_space_id_idx on public.conversations (space_id);
create index if not exists conversations_booking_id_idx on public.conversations (booking_id);
create index if not exists conversations_last_message_at_idx on public.conversations (last_message_at desc);

alter table public.conversations enable row level security;


-- ----------------------------------------------------------------------------
-- 2. CONVERSATION_PARTICIPANTS
-- The authoritative "who can access this conversation" table. Always exactly
-- 2 rows per conversation today (tenant + owner), inserted atomically by
-- create_or_get_conversation() below - never directly by the client.
-- ----------------------------------------------------------------------------
create table if not exists public.conversation_participants (
    conversation_id  bigint not null references public.conversations(id) on delete cascade,
    user_id          uuid not null references auth.users(id) on delete cascade,
    role             text not null check (role in ('tenant', 'owner')),
    joined_at        timestamptz not null default now(),

    primary key (conversation_id, user_id)
);

create index if not exists conversation_participants_user_id_idx
    on public.conversation_participants (user_id);

alter table public.conversation_participants enable row level security;


-- ----------------------------------------------------------------------------
-- 3. MESSAGES
-- ----------------------------------------------------------------------------
create table if not exists public.messages (
    id               bigint generated always as identity primary key,
    conversation_id  bigint not null references public.conversations(id) on delete cascade,
    sender_id        uuid not null references auth.users(id),
    message          text not null check (char_length(btrim(message)) > 0 and char_length(message) <= 4000),
    created_at       timestamptz not null default now(),
    read_at          timestamptz,
    status           text not null default 'sent' check (status in ('sent', 'delivered', 'read'))
);

create index if not exists messages_conversation_id_created_at_idx
    on public.messages (conversation_id, created_at desc);
create index if not exists messages_sender_id_idx on public.messages (sender_id);
-- Speeds up "count unread for me" (badge) queries: partial index, only rows
-- that are actually still unread need to be indexed.
create index if not exists messages_unread_idx
    on public.messages (conversation_id, sender_id)
    where read_at is null;

alter table public.messages enable row level security;


-- ----------------------------------------------------------------------------
-- 4. RLS — conversation_participants
-- A user may only ever see their OWN membership rows - never the other
-- participant's row directly through this table.
-- ----------------------------------------------------------------------------
create policy "conversation_participants_select_own" on public.conversation_participants
    for select using (user_id = auth.uid());

-- No direct INSERT/UPDATE/DELETE policy is created for regular users on
-- purpose - participants are only ever written by create_or_get_conversation()
-- (SECURITY DEFINER, section 6 below), which bypasses RLS by design.


-- Helper used by every other policy below: is auth.uid() a participant of
-- conversation p_conversation_id? A plain "exists(select 1 from
-- conversation_participants where conversation_id = ... and user_id =
-- auth.uid())" would already work correctly here even without SECURITY
-- DEFINER (the filter matches conversation_participants' own SELECT policy
-- above, so RLS never actually hides the row this checks for). This is
-- marked SECURITY DEFINER for two practical reasons instead: it's reused by
-- 4+ policies below (one function to audit instead of the same subquery
-- copy-pasted everywhere), and it stays correct even if
-- conversation_participants' own SELECT policy is ever loosened later
-- (e.g. to let participants see each other's row) without needing to
-- revisit every policy that depends on it.
create or replace function public.is_conversation_participant(p_conversation_id bigint)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1
        from public.conversation_participants cp
        where cp.conversation_id = p_conversation_id
          and cp.user_id = auth.uid()
    );
$$;

grant execute on function public.is_conversation_participant(bigint) to authenticated;


-- ----------------------------------------------------------------------------
-- 5. RLS — conversations
-- ----------------------------------------------------------------------------
create policy "conversations_select_participant" on public.conversations
    for select using (public.is_conversation_participant(id));

-- Only status (archive/unarchive) is meant to change from the client.
-- last_message_at/updated_at are maintained by the trg_touch_conversation
-- trigger below, never trusted from the client.
create policy "conversations_update_participant" on public.conversations
    for update
    using (public.is_conversation_participant(id))
    with check (public.is_conversation_participant(id));

-- No direct INSERT policy - conversations are only created through
-- create_or_get_conversation() (SECURITY DEFINER, section 6), which is what
-- enforces "space_id is required" and the reuse/uniqueness rule atomically
-- (a plain unique index alone would still race under concurrent double-clicks).


-- ----------------------------------------------------------------------------
-- 6. create_or_get_conversation() — the ONLY way to create a conversation.
-- Reused if an active one already exists for (space_id, caller); otherwise
-- creates it plus both participant rows in one atomic transaction. Returns
-- the conversation id either way. This is what the "Enviar mensagem ao
-- proprietário" button (section 16 of the request) calls.
-- ----------------------------------------------------------------------------
create or replace function public.create_or_get_conversation(
    p_space_id bigint,
    p_booking_id bigint default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
    v_tenant_id uuid := auth.uid();
    v_owner_id uuid;
    v_conversation_id bigint;
begin
    if v_tenant_id is null then
        raise exception 'Not authenticated' using errcode = '28000';
    end if;

    select user_id into v_owner_id from public.workspaces where id = p_space_id;
    if v_owner_id is null then
        raise exception 'Space not found' using errcode = 'P0002';
    end if;

    if v_owner_id = v_tenant_id then
        raise exception 'Cannot message yourself about your own space' using errcode = '22023';
    end if;

    -- Optional: if a booking_id was given, make sure it actually belongs to
    -- this tenant and this space (never trust it blindly from the client).
    if p_booking_id is not null then
        perform 1 from public.reservations
            where id = p_booking_id and workspace_id = p_space_id and user_id = v_tenant_id;
        if not found then
            raise exception 'Booking does not belong to this user/space' using errcode = '22023';
        end if;
    end if;

    -- Reuse the existing active conversation for this (space, tenant) pair.
    select id into v_conversation_id
        from public.conversations
        where space_id = p_space_id and tenant_id = v_tenant_id and status = 'active';

    if v_conversation_id is not null then
        -- If a booking_id is newly available and the conversation didn't have
        -- one yet, attach it now (pre-booking chat that just turned into a
        -- real reservation).
        if p_booking_id is not null then
            update public.conversations
                set booking_id = p_booking_id, updated_at = now()
                where id = v_conversation_id and booking_id is null;
        end if;
        return v_conversation_id;
    end if;

    insert into public.conversations (space_id, booking_id, tenant_id, owner_id, created_by)
        values (p_space_id, p_booking_id, v_tenant_id, v_owner_id, v_tenant_id)
        returning id into v_conversation_id;

    insert into public.conversation_participants (conversation_id, user_id, role)
        values
            (v_conversation_id, v_tenant_id, 'tenant'),
            (v_conversation_id, v_owner_id, 'owner');

    return v_conversation_id;
end;
$$;

grant execute on function public.create_or_get_conversation(bigint, bigint) to authenticated;


-- ----------------------------------------------------------------------------
-- 7. RLS — messages
-- INSERT requires: caller is a participant AND sender_id = auth.uid() (never
-- trusted from the body - this is what stops "send as someone else").
-- UPDATE is restricted to the RECIPIENT marking read_at/status - a trigger
-- (section 8) additionally blocks changing the message text itself on update,
-- so "mark as read" can never be abused to edit someone else's message.
-- ----------------------------------------------------------------------------
create policy "messages_select_participant" on public.messages
    for select using (public.is_conversation_participant(conversation_id));

create policy "messages_insert_participant" on public.messages
    for insert with check (
        sender_id = auth.uid()
        and public.is_conversation_participant(conversation_id)
    );

create policy "messages_update_mark_read" on public.messages
    for update
    using (
        public.is_conversation_participant(conversation_id)
        and sender_id <> auth.uid()   -- only the recipient marks it read, never the sender
    )
    with check (
        public.is_conversation_participant(conversation_id)
        and sender_id <> auth.uid()
    );


-- ----------------------------------------------------------------------------
-- 8. Triggers
-- ----------------------------------------------------------------------------

-- 8a. Prevent editing message/sender_id/conversation_id after insert - the
-- update RLS policy above only exists to let the recipient set read_at/
-- status, this trigger makes sure that's ALL it can do even if the policy
-- above is ever loosened by mistake later.
create or replace function public.prevent_message_content_edit()
returns trigger
language plpgsql
as $$
begin
    if new.message is distinct from old.message
        or new.sender_id is distinct from old.sender_id
        or new.conversation_id is distinct from old.conversation_id then
        raise exception 'Message content cannot be modified after creation';
    end if;
    return new;
end;
$$;

drop trigger if exists trg_prevent_message_content_edit on public.messages;
create trigger trg_prevent_message_content_edit
    before update on public.messages
    for each row execute function public.prevent_message_content_edit();


-- 8b. Keep conversations.last_message_at/updated_at in sync automatically -
-- never trust the client to set these itself.
create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.conversations
        set last_message_at = new.created_at,
            updated_at = now(),
            status = 'active'  -- a new message reactivates an archived conversation
        where id = new.conversation_id;
    return new;
end;
$$;

drop trigger if exists trg_touch_conversation_on_message on public.messages;
create trigger trg_touch_conversation_on_message
    after insert on public.messages
    for each row execute function public.touch_conversation_on_message();


-- ----------------------------------------------------------------------------
-- 9. Unread-count helper — used by the navbar badge (section 8/15 of the
-- request). SECURITY DEFINER + narrow return shape, same precedent as
-- get_all_reservation_slots() in migration_security_hardening.sql.
-- ----------------------------------------------------------------------------
create or replace function public.get_unread_message_count()
returns integer
language sql
security definer
set search_path = public
stable
as $$
    select count(*)::int
    from public.messages m
    join public.conversation_participants cp on cp.conversation_id = m.conversation_id
    where cp.user_id = auth.uid()
      and m.sender_id <> auth.uid()
      and m.read_at is null;
$$;

grant execute on function public.get_unread_message_count() to authenticated;
