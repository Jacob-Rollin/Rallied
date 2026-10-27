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

```bash
npm run register-commands   # from monorepo root
```

## Weekly digest

```bash
npx tsx apps/bot/scripts/weekly-digest.ts
```

Wire Cloudflare Cron / external cron to the same entry.
