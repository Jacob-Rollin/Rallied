# Rallied Discord bot (Interactions HTTP)

Slash commands + message component buttons. Runs as a **Cloudflare Worker** or **Node** HTTP server.

## Commands (Phase 1.5)

| Command | Who | What |
| --- | --- | --- |
| `/setup` or `/lfg desk` | mod | Post the LFG desk panel (Create / Find / My parties / How it works) — pin in `#lfg-board` |
| `/lfg create` | anyone | Rich embed party (game autocomplete, slots, host, Ghostless) + Join/Leave/Close/Vibe buttons |
| `/lfg find` / `close` | anyone / host | Find with optional game filter + join select; close |
| `/vibe` | party member | Buttons + 1–5 score select if `showed_up` omitted; else direct submit |
| `/ghostless` | anyone | Compact player-card embed **this guild** |
| `/strikes` | mod | list / add / remove; lockout from `server_settings` |
| `/dispute` | anyone / mod | open appeal; resolve upheld/overturned |

**LFG desk (no slash needed):** Create → modal (game + size + notes; aliases like `val` normalize) → party embed. Find → game filter → join select (filter/join messages **update in place**, no leftover dropdowns). My parties → ephemeral list + Close for hosts (Close updates that message / clears party-card buttons). How it works → short ephemeral help. Slash `/lfg create|find` and `/vibe` stay as backups.

**Game autocomplete:** `/lfg create` and `/lfg find` `game` options use Discord autocomplete against a curated catalog + aliases (`val`→Valorant). Desk create uses a modal text field + the same normalize. Parties store the canonical name so find matches create.

**Components:** Desk buttons; create modal; find game select (in-place update); party embed Join · Leave · Close · Vibe Check; find join select; Vibe Showed up · Ghosted · Dispute + score 1–5 select (`lfg:*` / `vibe:*` / `dispute:open:*` custom_ids).

**Grace window:** `server_settings.grace_minutes` (default 5) — late arrivals within grace are not treated as ghosts for vibe/strike paths.

**Ghostless role:** if `ghostless_role_id` set and threshold met → `maybeAssignGhostlessRole` (skips when unset).

**Digest:** `scripts/weekly-digest.ts` posts to `digest_channel_id` or logs.

## Env

```
DISCORD_PUBLIC_KEY=
DISCORD_BOT_TOKEN=
DISCORD_APP_ID=
DISCORD_DEV_GUILD_ID=
REGISTER_COMMANDS_SECRET=
SUPABASE_URL=                 # project URL only: https://xxx.supabase.co (not …/rest/v1)
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_URL` must be the **project URL** from Supabase → Project Settings → API (`https://<ref>.supabase.co`). Do not paste the REST endpoint (`…/rest/v1`) — supabase-js appends that itself; a doubled path returns PostgREST `PGRST125`. The bot strips a trailing `/rest/v1` if present, but set the project URL correctly.

## Local Node

```bash
npm run dev -w @rallied/bot
# http://localhost:8787/interactions
```

Tunnel → Discord **Interactions Endpoint URL**.

## Cloudflare Workers

`keep_vars = true` in `wrangler.toml` so CI/`wrangler deploy` does **not** wipe dashboard Runtime bindings. Put plaintext public values in `[vars]` or the dashboard; keep secrets in dashboard **Secrets** (or `wrangler secret put`). Do not commit secret values or guild IDs.

`compatibility_flags = ["nodejs_compat"]` for tweetnacl / supabase-js on Workers.

Slash commands, buttons, and modal submits **defer immediately** (interaction type 5, ephemeral when needed), then finish via webhook edit/follow-up under `executionCtx.waitUntil` so Supabase work cannot blow Discord’s 3s reply window. PING, autocomplete, and create-game → **modal** (type 9) stay synchronous.

```bash
cd apps/bot
npx wrangler secret put DISCORD_PUBLIC_KEY
# … BOT_TOKEN, APP_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
npx wrangler deploy
```

Required Runtime secrets: `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`, `DISCORD_APP_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. A missing public key returns 401 on verify (Discord shows “The application did not respond”) even if the Interactions URL still looks green from an earlier save.

## Register commands

### CLI (laptop)

```bash
npm run register-commands   # from monorepo root
```

Guild-scoped when `DISCORD_DEV_GUILD_ID` is set (instant); otherwise global (~1h).

### Phone-friendly (Worker HTTP)

Use this when you cannot run the CLI. No bot token goes in the browser URL — only a one-shot register secret.

1. In **Cloudflare → Workers → rallied-bot → Settings → Variables and Secrets**, set:
   - `REGISTER_COMMANDS_SECRET` — long random string (secret)
   - `DISCORD_DEV_GUILD_ID` — your test server ID (plain text is fine)
   - Confirm `DISCORD_BOT_TOKEN` and `DISCORD_APP_ID` (or `DISCORD_CLIENT_ID`) are already set
2. **Redeploy** the Worker (or save secrets and wait for the next deploy if auto-deploy is on).
3. On your phone, open once:

   `https://<your-worker-host>/register-commands?key=<REGISTER_COMMANDS_SECRET>`

   Optional override: `&guild_id=<id>` if the env guild is unset.

   Expect JSON like `{ "ok": true, "count": 6, "guildId": "…" }` (includes `/setup`). Wrong/missing key → `401`; secret unset → `404`.
4. In Discord, try a slash command (e.g. `/setup`, `/lfg desk`, or `/ghostless`) in that guild — guild commands appear within seconds.
5. **Remove or rotate** `REGISTER_COMMANDS_SECRET` in CF after use so the route stops working.

You can also send `X-Register-Commands-Key: <secret>` or `Authorization: Bearer <secret>` instead of `?key=`.

## Weekly digest

```bash
npx tsx apps/bot/scripts/weekly-digest.ts
```

Wire Cloudflare Cron / external cron to the same entry.
