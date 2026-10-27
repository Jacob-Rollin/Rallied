# Rallied — Phase 1 + 1.5 scaffold

**Rallied** (rallied.gg) — Discord LFG + per-server **Vibe Check** / **Ghostless** + admin web (Discord OAuth).

Strikes, lockouts, and Ghostless stay **this server only**. Plans: **Community $5.99** · **Pro $9.99** · **Founding Pro $8.99** locked (≤50, Pro features — not Community $3.99). No cross-server grade DB.

Copy this folder into a new GitHub repo when ready. Wire Cloudflare + Supabase + Discord via env — `npm run dev:web` works with **mock data / mock auth** when secrets are missing.

**Launch checklist (platforms, outreach, what not to build):**  
→ [`../docs/rallied-launch-checklist.md`](../docs/rallied-launch-checklist.md) (in the Project store: `/cursor/stores/self/docs/rallied-launch-checklist.md`)

---

## Layout

```
rallied/
  apps/web/          Next.js App Router (marketing + OAuth-gated dashboard)
  apps/bot/          Discord Interactions HTTP (slash + buttons)
  packages/shared/   Types & constants
  supabase/          001_init + 002_phase15 migrations
```

---

## Quick start (local web UI)

```bash
cd rallied
npm install
npm run dev:web
# → http://localhost:3000
```

- No Supabase env → mock LFG / People / Disputes / Settings / **public pages**
- No Discord OAuth env (or `MOCK_AUTH=1`) → visiting `/app` or **Log in with Discord** seeds a mock admin session
- Real OAuth: set `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`, `SESSION_SECRET` (≥32 chars)

### Public player routes (strikes never shown)

| Route | What |
| --- | --- |
| `/s/[slugOrGuildId]` | Public server page — open LFG, weekly soft stats, Ghostless spotlight |
| `/s/[slugOrGuildId]/u/[discordUserId]` | Shareable Ghostless card (this server only; no strike history) |
| `/me` | Light list of your card links (session or mock) |

Mock example: [`/s/demo-esports`](http://localhost:3000/s/demo-esports) · card [`/s/demo-esports/u/user-aria`](http://localhost:3000/s/demo-esports/u/user-aria)

Settings toggles: `public_page_enabled`, `public_member_list`, vanity `slug` → migration `003_public_pages.sql`.

### Plans & Pro (mock)

| Plan | Price | Notes |
| --- | --- | --- |
| Community | $5.99/mo | Full LFG + Ghostless + strikes |
| Pro | $9.99/mo | Analytics export, vanity, priority |
| Founding Pro | $8.99/mo locked | Pro SKU · ≤50 seats · `004_pro_plan.sql` |

Routes: `/pricing` · `/app/billing` · `/app/analytics` · Pro vanity on Settings + `/s/founding-beta`. Stripe = placeholders only (`STRIPE_*` in `.env.example`).

---

## Discord OAuth (admin gating)

| | |
| --- | --- |
| Scopes | `identify`, `guilds` — **no** email/password accounts |
| Session | `iron-session` encrypted cookie (`SESSION_SECRET`) |
| Access | Guilds where user has **Manage Guild** or **Administrator** **and** bot is present |
| Routes | `/api/auth/discord` → Discord → `/api/auth/callback` → `/app` |
| Empty | Authenticated but no bot guilds → Add to Discord CTA |

### Test OAuth with secrets

1. Portal → OAuth2 Redirects → `http://localhost:3000/api/auth/callback`
2. Fill `apps/web/.env.local` from `.env.example`
3. `npm run dev:web` → `/login` → Log in with Discord
4. Confirm `/app` server switcher shows real guilds

Bot presence check: `DISCORD_BOT_TOKEN` (bot’s guild list) or rows in Supabase `servers`.

---

## Bot invite URL

```text
https://discord.com/api/oauth2/authorize?client_id=YOUR_APP_ID&permissions=2415919104&scope=bot%20applications.commands
```

Or `buildBotInviteUrl(clientId)` from `@rallied/shared`. Set `NEXT_PUBLIC_DISCORD_CLIENT_ID` so the landing **Add to Discord** button works.

---

## Slash commands (Phase 1.5)

| Command | Notes |
| --- | --- |
| `/lfg create\|find\|close` | Create posts a **rich embed** (game, slots, host, Ghostless) |
| `/vibe @user` | Omit `showed_up` → **button message** (Showed up / Vibes / Ghosted / Dispute) |
| `/ghostless [@user]` | Compact **player-card embed** (this server) |
| `/strikes list\|add\|remove` | Mods; lockout uses `server_settings.strike_threshold` |
| `/dispute open\|resolve` | Dispute queue; also Dispute button on Vibe Check |

Register: `npm run register-commands`  
Weekly digest stub: `npx tsx apps/bot/scripts/weekly-digest.ts`

---

## Setup checklist (platforms)

### 1. Discord app
Bot token, public key, app id, OAuth client id/secret, redirect URI, Interactions Endpoint URL — see launch checklist.

### 2. Supabase
Run `001_init.sql` → `002_phase15.sql` → `003_public_pages.sql` → `004_pro_plan.sql`.

### 3. Env
```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
```

### 4. Deploy
| Piece | Host |
| --- | --- |
| Web | Cloudflare Workers (OpenNext) — see below |
| Bot | Separate Cloudflare Worker (`apps/bot`) or Node |
| DB | Supabase |

### Cloudflare Workers (website)

Monorepo: wrangler must target **`apps/web`**, not the repo root (or you get “workspace instead of targeting a specific project”).

**Dashboard → Workers → your web Worker → Settings → Builds** (paste these):

| Field | Value |
| --- | --- |
| Root directory / Path | `/` |
| Build command | `npm run build:web:cf` |
| Deploy command | `npm run deploy:web` |
| Non-production deploy (optional) | `cd apps/web && npx wrangler versions upload` |
| Node | Pin **20** via Build variable `NODE_VERSION=20` (repo also has `.nvmrc`) |

Runtime / build secrets for the **web** Worker (not the bot):

- `NEXT_PUBLIC_DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI` (production callback, e.g. `https://your-domain/api/auth/callback`)
- `SESSION_SECRET` (≥32 chars)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` (canonical site URL)

Optional web: `DISCORD_BOT_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`. Bot secrets stay on the **bot** Worker (`apps/bot/wrangler.toml`).

Local CF preview (Workers runtime):

```bash
npm run build:web:cf
npm run preview:web
```

`npm run build` / `npm run dev:web` / `npm start` stay plain Next.js (Node).

---

## Scripts

| Command | What |
| --- | --- |
| `npm run dev:web` | Next.js (Node) |
| `npm run build:web:cf` | Shared + OpenNext Worker bundle for web |
| `npm run deploy:web` | `wrangler deploy` for `apps/web` (expects prior CF build) |
| `npm run preview:web` | OpenNext build + local Workers preview |
| `npm run dev:bot` | Bot HTTP `:8787` |
| `npm run typecheck` | All workspaces |
| `npm run register-commands` | Push slash commands |

---

## Product rules

- Per-server strikes / Ghostless / disputes only  
- Community price placeholder **$5.99/mo**  
- Brand: coral `#FF5A3D`, Ghostless lime `#B8F000`, slate `#0F1419` — not purple  
