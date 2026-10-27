import Link from "next/link";
import { discordOAuthConfigured, mockAuthEnabled } from "@/lib/auth/config";

type Props = { searchParams: Promise<{ error?: string; next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const oauth = discordOAuthConfigured();
  const mock = mockAuthEnabled();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/rallied-wm-dark.jpg"
        alt="Rallied"
        className="mb-8 h-10 w-auto self-start"
      />
      <h1 className="font-display text-3xl tracking-wide">Admin login</h1>
      <p className="mt-2 text-sm text-muted">
        Discord only — no email/password. You need Manage Server (or Admin) on a
        guild where Rallied is installed.
      </p>

      {sp.error ? (
        <p className="mt-4 rounded-brand border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">
          Login error: {sp.error}
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
            OAuth secrets missing — this button seeds a <strong className="text-lime">mock</strong>{" "}
            admin session so you can browse `/app`.
          </p>
        ) : null}
        <Link href="/" className="text-center text-sm text-muted hover:text-coral">
          ← Back to marketing
        </Link>
      </div>
    </div>
  );
}
