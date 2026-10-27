import Link from "next/link";
import { BRAND, COMMUNITY_PRICE_USD, buildBotInviteUrl } from "@rallied/shared";

export default function MarketingPage() {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "";
  const inviteHref = clientId
    ? buildBotInviteUrl(clientId)
    : "#add-bot";

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/rallied-wm-dark.jpg"
          alt="Rallied"
          className="h-9 w-auto sm:h-11"
        />
        <div className="flex items-center gap-2">
          <a
            href="/api/auth/discord"
            className="rounded-brand border border-white/15 px-3 py-1.5 text-sm text-muted transition hover:border-coral/50 hover:text-white"
          >
            Log in with Discord
          </a>
        </div>
      </header>

      <section className="relative mx-auto flex min-h-[78vh] max-w-5xl flex-col justify-center px-4 pb-16 pt-6">
        <div className="animate-rise absolute inset-x-0 top-8 -z-10 flex justify-center opacity-30 sm:opacity-40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/rallied-square-dark.jpg"
            alt=""
            className="h-[min(52vw,420px)] w-[min(52vw,420px)] object-cover"
          />
        </div>

        <p className="font-display text-5xl leading-none tracking-wide text-white sm:text-7xl md:text-8xl">
          {BRAND.name}
        </p>
        <h1 className="mt-6 max-w-xl text-xl text-white/90 sm:text-2xl">
          {BRAND.tagline}
        </h1>
        <p className="mt-3 max-w-md text-muted">
          Parties, Vibe Check, and Ghostless reliability — scoped to each Discord
          server. No global shame board.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={inviteHref}
            className="rounded-brand bg-coral px-5 py-2.5 font-semibold text-slate transition hover:brightness-110"
          >
            Add to Discord
          </a>
          <a
            href="#how-it-works"
            className="rounded-brand border border-white/25 px-5 py-2.5 font-semibold text-white/90 transition hover:border-lime/50 hover:text-lime"
          >
            Learn more
          </a>
          <Link
            href="/login"
            className="rounded-brand border border-lime/50 px-5 py-2.5 font-semibold text-lime transition hover:bg-lime/10"
          >
            Log in with Discord
          </Link>
        </div>
        <p className="mt-6 text-sm text-muted">
          Example public server (mock):{" "}
          <Link href="/s/demo-esports" className="text-coral hover:underline">
            /s/demo-esports
          </Link>
          {" · "}
          <Link href="/s/founding-beta" className="text-lime/90 hover:underline">
            Founding Pro page
          </Link>
          {" · "}
          <Link href="/pricing" className="text-white/80 hover:underline">
            Pricing
          </Link>
          {" · "}
          <Link href="/me" className="text-lime/90 hover:underline">
            Your cards
          </Link>
        </p>
      </section>

      <section id="how-it-works" className="border-t border-white/10 bg-black/20 py-16">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 sm:grid-cols-3">
          {[
            {
              title: "LFG",
              body: "Create a party in Discord. Join, fill, close — without another free LFG clone war.",
            },
            {
              title: "Play",
              body: "Ready checks and grace windows cut accidental no-shows before they become drama.",
            },
            {
              title: "Vibe Check",
              body: "Post-session showed-up + vibe tags. Ghostless badge stays on this server only.",
            },
          ].map((step, i) => (
            <div key={step.title} className="animate-rise" style={{ animationDelay: `${i * 80}ms` }}>
              <p className="font-display text-coral">{String(i + 1).padStart(2, "0")}</p>
              <h2 className="mt-2 font-display text-2xl tracking-wide">{step.title}</h2>
              <p className="mt-2 text-sm text-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="add-bot" className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="font-display text-3xl tracking-wide">Community · ${COMMUNITY_PRICE_USD}/mo</h2>
        <p className="mt-2 max-w-lg text-muted">
          Full strikes, lockouts, and admin web per server. Wire Stripe later —
          this scaffold shows the placeholder only.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={inviteHref}
            className="rounded-brand bg-coral px-5 py-2.5 font-semibold text-slate"
          >
            Add to Discord
          </a>
          <a
            href="/api/auth/discord"
            className="rounded-brand border border-white/20 px-5 py-2.5 text-sm text-muted hover:text-white"
          >
            Open dashboard
          </a>
        </div>
        {!clientId ? (
          <p className="mt-4 text-sm text-muted">
            Set <code className="text-coral">NEXT_PUBLIC_DISCORD_CLIENT_ID</code> to
            make Add to Discord open the real invite URL. See root README.
          </p>
        ) : null}
      </section>
    </div>
  );
}
