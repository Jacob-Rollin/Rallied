# Rallied Discord bot (Interactions HTTP)

Slash commands + message component buttons. Runs as a **Cloudflare Worker** or **Node** HTTP server.

## Commands (Phase 1.5)

| Command | Who | What |
| --- | --- | --- |
| `/lfg create` | anyone | Rich embed party (game, slots, host, Ghostless field) |
| `/lfg find` / `close` | anyone / host | List or close |
| `/vibe` | party member | Buttons if `showed_up` omitted; else direct submit |
| `/ghostless` | anyone | Compact player-card embed **this guild** |
| `/strikes` | mod | list / add / remove; lockout from `server_settings` |
| `/dispute` | anyone / mod | open appeal; resolve upheld/overturned |

**Buttons:** Showed up · Vibes · Ghosted · Dispute (`vibe:*` / `dispute:open:*` custom_ids).

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
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

## Local Node

```bash
npm run dev -w @rallied/bot
# http://localhost:8787/interactions
```

Tunnel → Discord **Interactions Endpoint URL**.

## Cloudflare Workers

```bash
cd apps/bot
npx wrangler secret put DISCORD_PUBLIC_KEY
# … BOT_TOKEN, APP_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
npx wrangler deploy
```

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

   Expect JSON like `{ "ok": true, "count": 5, "guildId": "…" }`. Wrong/missing key → `401`; secret unset → `404`.
4. In Discord, try a slash command (e.g. `/lfg` or `/ghostless`) in that guild — guild commands appear within seconds.
5. **Remove or rotate** `REGISTER_COMMANDS_SECRET` in CF after use so the route stops working.

You can also send `X-Register-Commands-Key: <secret>` or `Authorization: Bearer <secret>` instead of `?key=`.

## Weekly digest

```bash
npx tsx apps/bot/scripts/weekly-digest.ts
```

Wire Cloudflare Cron / external cron to the same entry.
