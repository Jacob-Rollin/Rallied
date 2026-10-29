import Link from "next/link";
import { buildBotInviteUrl } from "@rallied/shared";
import {
  discordOAuthConfigured,
  mockAuthEnabled,
  oauthConfigProblems,
} from "@/lib/auth/config";

type Props = { searchParams: Promise<{ error?: string; next?: string }> };

function formatLoginError(error: string, liveProblems: string[]): string {
  if (error === "session_expired") {
    return "Demo session cleared — log in with Discord for your real servers.";
  }
  if (error.startsWith("oauth_not_configured")) {
    const fromQuery = error.includes(":")
      ? error
          .slice("oauth_not_configured:".length)
          .split(/[|,]/)
          .map((p) => p.trim())
          .filter(Boolean)
      : [];
    const problems = liveProblems.length > 0 ? liveProblems : fromQuery;
    return problems.length > 0
      ? `Discord OAuth is not ready on this Worker: ${problems.join("; ")}. Check Variables and Secrets on the Worker that serves this URL (exact name SESSION_SECRET, 32+ chars), then redeploy with keep_vars.`
      : "Discord OAuth is not configured on the web Worker.";
  }
  return `Login error: ${error}`;
}

function safeAppNext(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const path = raw.trim();
  if (!path.startsWith("/app")) return undefined;
  if (path.startsWith("//") || path.includes("://")) return undefined;
  return path;
}

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const oauth = discordOAuthConfigured();
  const mock = mockAuthEnabled();
  const problems = !oauth ? oauthConfigProblems() : [];
  const nextPath = safeAppNext(sp.next);
  const discordHref = nextPath
    ? `/api/auth/discord?next=${encodeURIComponent(nextPath)}`
    : "/api/auth/discord";
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "";
  const inviteHref = clientId ? buildBotInviteUrl(clientId) : "#add-bot";

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/rallied-wm-transparent-dark.png"
        alt="Rallied"
        className="mb-8 h-12 w-auto bg-transparent self-start sm:h-14"
      />
      <h1 className="font-display text-3xl tracking-wide">Admin login</h1>
      <p className="mt-2 text-sm text-muted">
        Discord only — no email/password. You need Manage Server (or Admin) on a
        guild where Rallied is installed. After authorize you land on{" "}
        <code className="text-coral">/app</code> and pick your server from the
        switcher.
      </p>

      {sp.error ? (
        <p className="mt-4 rounded-brand border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">
          {formatLoginError(sp.error, problems)}
        </p>
      ) : null}

      {!oauth && problems.length > 0 && !sp.error ? (
        <p className="mt-4 rounded-brand border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">
          OAuth not ready on this Worker: {problems.join("; ")}. Set{" "}
          <code className="text-white/80">SESSION_SECRET</code> (32+), Discord
          OAuth secrets, and{" "}
          <code className="text-white/80">SUPABASE_SERVICE_ROLE_KEY</code> on
          the web Worker — do not expect silent mock login in production.
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3">
        <a
          href={discordHref}
          className="rounded-brand bg-[#5865F2] px-4 py-3 text-center font-semibold text-white transition hover:brightness-110"
        >
          Log in with Discord
        </a>
        {mock && !oauth ? (
          <p className="text-xs text-muted">
            Dev mock mode — this button seeds a{" "}
            <strong className="text-lime">demo</strong> admin session (set{" "}
            <code className="text-coral">MOCK_AUTH=1</code> only when intentional).
          </p>
        ) : null}
        {oauth ? (
          <p className="text-xs text-muted">
            Continues to Discord authorize, then returns to{" "}
            <code className="text-coral">{nextPath || "/app"}</code> with
            servers you can manage.
          </p>
        ) : null}
        <a
          href={inviteHref}
          className="rounded-brand border border-coral/70 px-4 py-3 text-center font-semibold text-coral transition hover:bg-coral/10"
        >
          Add to Discord first
        </a>
        <Link
          href="/demo"
          className="text-center text-sm text-muted hover:text-lime"
        >
          Or explore the /demo sandbox (fixture data)
        </Link>
        <Link href="/" className="text-center text-sm text-muted hover:text-coral">
          ← Back to marketing
        </Link>
      </div>
    </div>
  );
}
