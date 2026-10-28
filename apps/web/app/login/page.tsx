import Link from "next/link";
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

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const oauth = discordOAuthConfigured();
  const mock = mockAuthEnabled();
  const problems = !oauth ? oauthConfigProblems() : [];

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
        guild where Rallied is installed.
      </p>

      {sp.error ? (
        <p className="mt-4 rounded-brand border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">
          {formatLoginError(sp.error, problems)}
        </p>
      ) : null}

      {!oauth && problems.length > 0 && !sp.error ? (
        <p className="mt-4 rounded-brand border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">
          OAuth not ready on this Worker: {problems.join("; ")}.
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3">
        <a
          href="/api/auth/discord"
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
            Continues to Discord authorize, then lists servers you can manage
            where Rallied is installed.
          </p>
        ) : null}
        <Link href="/" className="text-center text-sm text-muted hover:text-coral">
          ← Back to marketing
        </Link>
      </div>
    </div>
  );
}
