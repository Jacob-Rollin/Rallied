# Rallied — Phase 1 + 1.5 scaffold

**Rallied** (rallied.gg) — Discord LFG + per-server **Vibe Check** / **Ghostless** + admin web (Discord OAuth).

Strikes, lockouts, and Ghostless stay **this server only**. Path B plans: **Starter** (free under caps) · **Community $4.99** · **Pro $9.99** · **Founding Pro $8.99** locked (≤10). No cross-server grade DB.

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
  supabase/          migrations 001–006 (init → phase15 → public → pro → threads → ready check)
```

---

## Quick start (local web UI)

```bash
cd rallied
npm install
npm run dev:web
# → http://localhost:3000
```

- No Supabase **service role** → `/app` shows empty live states (or mock for demo guilds); public `/s/demo-*` stays mock
- Real guild (e.g. Official Rallied) + `SUPABASE_SERVICE_ROLE_KEY` → Overview / LFG / People / Disputes / Analytics / Settings / Billing read live rows
- **Explore live demo** → [`/demo`](http://localhost:3000/demo) admin board (mock fixtures, no OAuth, does not write a session)
- Public player demos stay at `/s/demo-esports` (linked from the admin demo banner)
- Local preview only: mock auth guilds or `/app?mock=1` — never re-enable silent production mock login
- Explicit `MOCK_AUTH=1` (or local + OAuth missing) → `/app` can seed a mock admin session
- Real OAuth: set `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`, `SESSION_SECRET` (≥32 chars)

### Public player routes (strikes never shown)

| Route | What |
| --- | --- |
| `/demo` | Demo **admin** dashboard (Overview / LFG / People / Disputes / Analytics…) |
| `/s/[slugOrGuildId]` | Public server page — open LFG, weekly soft stats, Ghostless spotlight |
| `/s/[slugOrGuildId]/u/[discordUserId]` | Shareable Ghostless card (this server only; no strike history) |
| `/me` | Light list of your card links (session or mock) |

Demo admin: [`/demo`](http://localhost:3000/demo) · public: [`/s/demo-esports`](http://localhost:3000/s/demo-esports) · card [`/s/demo-esports/u/user-aria`](http://localhost:3000/s/demo-esports/u/user-aria)

Settings toggles: `public_page_enabled`, `public_member_list`, vanity `slug` → migration `003_public_pages.sql`.

### Plans & Pro (Path B)

| Plan | Price | Notes |
| --- | --- | --- |
| Starter (`free` / `lapsed`) | $0 | Max 2 open parties · 5 creates/24h · no Ghostless |
| Trial | 14 days | Full Community features |
| Community | $4.99/mo ($49/yr) | Unlimited LFG + Ghostless + strikes |
| Pro | $9.99/mo | Analytics export, vanity, priority |
| Founding Pro | $8.99/mo locked | Pro SKU · ≤10 seats · `004_pro_plan.sql` |

Routes: `/pricing` · `/app/billing` · `/app/analytics` · Pro vanity on Settings + `/s/founding-beta`. Stripe Checkout + Portal + webhooks (`STRIPE_*` on web Worker; test mode first). Migration `012_stripe_billing.sql`. Dogfood: `DOGFOOD_GUILD_IDS` + Official forever Pro.

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
https://discord.com/api/oauth2/authorize?client_id=YOUR_APP_ID&permissions=311671409680&scope=bot%20applications.commands
```

Or `buildBotInviteUrl(clientId)` from `@rallied/shared`. Set `NEXT_PUBLIC_DISCORD_CLIENT_ID` so the landing **Add to Discord** button works.

---

## Slash commands (Phase 1.5)

| Command | Notes |
| --- | --- |
| `/lfg create\|find\|close\|desk` | Create posts a **rich embed**; `/lfg desk` same Manage Server perm as `/setup` |
| `/vibe @user` | Omit `showed_up` → **button message** (Showed up / Ghosted + vibe 1–5); Dispute is ratee-facing after Ghosted strike |
| `/ghostless [@user]` | Compact **player-card embed** (this server) |
| `/strikes list\|add\|remove` | Mods; lockout uses `server_settings.strike_threshold` |
| `/dispute open\|resolve` | Ratee opens; mods resolve in Discord (`/dispute resolve`) |

Register: `npm run register-commands`  
Weekly digest stub: `npx tsx apps/bot/scripts/weekly-digest.ts`

---

## Setup checklist (platforms)

### 1. Discord app
Bot token, public key, app id, OAuth client id/secret, redirect URI, Interactions Endpoint URL — see launch checklist.

### 2. Supabase
Run migrations **001→006** in order:
`001_init.sql` → `002_phase15.sql` → `003_public_pages.sql` → `004_pro_plan.sql` → `005_party_thread.sql` → `006_ready_check.sql`.

Phone paste: Project store `docs/rallied-supabase-all.sql` (combined) or `docs/lfg-desk-setup.md` §3 for 005/006 ALTERs + indexes.

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
| Node | Pin **22** via Build variable `NODE_VERSION=22` (repo also has `.nvmrc`; Wrangler requires ≥22) |

Runtime / build secrets for the **web** Worker (not the bot) — set in CF dashboard, then redeploy:

| Var | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_DISCORD_CLIENT_ID` | yes | OAuth / invite button |
| `DISCORD_CLIENT_ID` | yes | OAuth |
| `DISCORD_CLIENT_SECRET` | yes | Secret |
| `DISCORD_REDIRECT_URI` | yes | e.g. `https://your-domain/api/auth/callback` |
| `SESSION_SECRET` | yes | ≥32 chars |
| `NEXT_PUBLIC_APP_URL` | yes | Canonical site URL |
| `NEXT_PUBLIC_SUPABASE_URL` | yes (live) | Project base only (`https://<ref>.supabase.co`) — not `…/rest/v1` (PGRST125) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes (live) | Public; RLS still blocks table reads |
| `SUPABASE_SERVICE_ROLE_KEY` | **yes for live /app** | Secret — server-only dashboard + public `/s/[real]` reads |
| `DISCORD_BOT_TOKEN` | optional | `bot_present` via Discord API; else uses `servers` rows |

Bot secrets stay on the **bot** Worker (`apps/bot/wrangler.toml`). After bot joins a guild and runs a slash command, a `servers` row appears → web marks `bot_present` and loads that guild’s data.

`keep_vars = true` in `apps/web/wrangler.toml` (and the bot Worker), and `npm run deploy:web` / `deploy:cf` always pass `--keep-vars` (OpenNext full deploy uses `-- --keep-vars`), so dashboard Runtime variables/secrets survive each deploy. Plaintext public values may live in `[vars]`; secrets stay in dashboard **Secrets** (Runtime, not Build-only). Without `keep_vars`, CI deploy clears dashboard bindings not listed in the toml.

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
- Community **$4.99/mo** · Pro **$9.99** · Founding **$8.99** locked  

- Brand: coral `#FF5A3D`, Ghostless lime `#B8F000`, slate `#0F1419` — not purple  
