# Recreating the Supabase project — workspace-app

The schema is reconstructed from the application code (`schema.sql`,
`migration_hour_booking.sql`, `migration_security_hardening.sql`,
`migration_messages.sql` in the project root — these are SQL scripts you
paste into the Supabase SQL Editor, they aren't run automatically). Old data
(users, workspaces, reservations, images) is **not recoverable** this way —
this only recreates the structure.

## 1. Create the project

1. https://supabase.com/dashboard → **New project**.
2. Get the **Project URL** and the key from the **Connect** dialog (button at
   the top of the project dashboard) — or from **Settings** (gear icon, side
   menu) → **API Keys**.
   - Supabase migrated from `anon`/`service_role` to `publishable`/`secret`
     keys. The `publishable key` (format `sb_publishable_...`) works as a
     drop-in replacement for the `anon key` in `supabase-js` — no code
     changes needed, just use it directly (not the legacy `anon` JWT).
   - The **Project URL** also appears in the dashboard's own URL, between
     `/project/` and `/settings/...`.

## 2. Run the schema (in this order — each script depends on the previous one)

1. SQL Editor → paste the contents of `schema.sql` → **Run**.
   Creates the `profiles`, `workspaces`, `reservations`, `reviews` tables,
   the RLS policies, and the public `workspaces` Storage bucket.
2. Paste the contents of `migration_hour_booking.sql` → **Run**.
   Adds support for hourly-rate spaces (`open_hour`/`close_hour` on
   workspaces, `start_hour`/`end_hour` on reservations).
3. Paste the contents of `migration_security_hardening.sql` → **Run**.
   Tightens the RLS policies (they stop being `using (true)`) and creates the
   `get_all_reservation_slots()` function used by the public booking
   calendar. **Without running this script, `space_details.html` breaks**
   (the function doesn't exist).
4. Paste the contents of `migration_messages.sql` → **Run**.
   Adds the renter↔owner messaging system (`conversations`,
   `conversation_participants`, `messages`, RLS policies, and the
   `create_or_get_conversation()` / `get_unread_message_count()` functions).
   Depends on `workspaces` and `reservations` existing, so it must run after
   the three scripts above.
5. Check **Settings → Integrations → Data API** to confirm the new tables are
   exposed to the API (on new projects this is usually enabled by default via
   "Default privileges for new entities" — but worth double-checking, or
   `supabase-js` calls will return a 404/permission error).

## 3. Configure Auth

The app uses `supabase.auth.signUp` / `signInWithPassword` and expects a
valid session immediately after signup (there's no email-confirmation screen
in the frontend).

- Authentication → Providers → Email → uncheck **Confirm email**
  (otherwise login fails until the user manually confirms their email).
- Authentication → URL Configuration → **Redirect URLs** → add BOTH of these
  (this is one shared Supabase project used by local dev and production, so
  both need to be listed together, not one or the other):
  - `http://localhost:3000/reset_password.html`
  - `https://workspace-ap.vercel.app/reset_password.html`

  Without this, `resetPasswordForEmail`'s `redirectTo` (set dynamically in
  `forgot_password.js` from `window.location.origin`, so it's already correct
  for whichever environment sent the request) gets silently ignored by
  Supabase, and the reset link falls back to landing on **Site URL** instead
  (root `/`, with the token stuck in the URL fragment) - if that's what's
  happening, this is the fix, not a code change.
  - Optional but more convenient long-term: use wildcards instead
    (`http://localhost:3000/**` and `https://workspace-ap.vercel.app/**`) so
    new pages never need to be re-added here individually.
  - Also check **Site URL** on this same screen - it's the fallback target
    described above, so it's worth pointing it at whichever of the two
    environments you consider the "main" one.

## 4. Check Storage

- Storage → confirm the `workspaces` bucket exists and is **Public**.
- No need to manually create the `spaces/` and `avatars/` folders — the app
  creates them on the fly on upload.

## 5. Update credentials

`.env` (local) and the environment variables on Vercel (Project Settings →
Environment Variables) — both are excluded from git:

```
SUPABASE_URL=<new Project URL>
SUPABASE_KEY=<new anon public key>
```

Then redeploy on Vercel to apply the new variables.

## 6. Validate

Test in this order (each step depends on the previous one):

1. User registration (`register.html` → `/api/users/user_login/register`)
2. Login (`login.html` → `/api/users/user_login`)
3. Update profile (`user_profile_update.html`) — creates the row in `profiles`
4. Register a workspace (`space_manage.html`, no `space_id` in the URL) — try
   both a Day-rate and an Hour-rate space (the latter needs a valid
   opening/closing hour window)
5. Upload a workspace image
6. List/filter workspaces on the home page (`index.html`)
7. View details + calendar (`space_details.html`) — for an Hour-rate space,
   confirm the hour-slot grid appears after picking a day
8. Create a reservation
9. "Forgot password" (`forgot_password.html`) → confirm the email arrives and
   the link lands on `reset_password.html` with a working reset form
10. As the workspace owner, open the reservations report for one of your
    spaces (`space_reservations.html`) and confirm it shows the booking made
    in step 8
11. On `space_details.html`, click "Falar com o proprietário" as the renter,
    send a message, then log in as the owner and confirm it shows up in
    Mensagens with a badge on the navbar icon; reply and confirm the renter
    sees the reply without refreshing (Realtime)

## Security notes

RLS policies are ownership-based, built on `auth.uid()`
(`migration_security_hardening.sql`), not the earlier permissive
`using (true)` policies from `schema.sql`. This works because the backend
forwards each authenticated request's JWT to a per-request Supabase client
(see `api/middleware/auth.js`), so `auth.uid()` resolves correctly inside
policies instead of always being null (which it would be under the plain
anon key).

Session tokens are stored as httpOnly cookies, not `localStorage` — client-side
JS never has direct access to the raw access token, which limits what an XSS
bug could steal. A separate, non-httpOnly CSRF cookie is issued alongside the
session, and every mutating request must echo its value back in an
`X-CSRF-Token` header (double-submit cookie pattern) — see
`api/middleware/auth.js` (`requireCsrf`) and `public/scripts/auth-fetch.js`
(`apiFetch`) for both sides of this.

If you ever need to recreate this project from scratch again, running
`schema.sql` alone reproduces the *early*, permissive state described above —
you must also run `migration_security_hardening.sql` to reach the secure
state the app expects today.
