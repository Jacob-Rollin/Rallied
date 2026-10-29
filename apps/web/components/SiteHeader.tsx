import Link from "next/link";
import { buildBotInviteUrl } from "@rallied/shared";
import { AddToDiscordButton } from "./AddToDiscordButton";

type Props = {
  /** Translucent over hero vs solid strip on inner pages. */
  variant?: "hero" | "solid";
};

const NAV = [
  { href: "/#how-it-works", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/guide", label: "Guide" },
  { href: "/demo", label: "Demo" },
] as const;

export function SiteHeader({ variant = "solid" }: Props) {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "";
  const inviteHref = clientId ? buildBotInviteUrl(clientId) : "#add-bot";

  return (
    <header
      className={`sticky top-0 z-30 w-full border-b ${
        variant === "hero"
          ? "border-white/10 bg-slate/75 backdrop-blur-md"
          : "border-white/10 bg-slate/90 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-2.5 sm:py-3">
        <Link href="/" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/rallied-wm-transparent-dark.png"
            alt="Rallied"
            className="h-9 w-auto bg-transparent sm:h-10"
          />
        </Link>

        <nav
          className="hidden items-center gap-4 text-sm text-white/70 lg:flex"
          aria-label="Primary"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <Link
            href="/pricing"
            className="hidden rounded-brand border border-transparent px-2 py-1.5 text-sm font-medium text-white/70 transition hover:text-white sm:inline md:hidden"
          >
            Pricing
          </Link>
          <Link
            href="/guide"
            className="rounded-brand border border-transparent px-2 py-1.5 text-sm font-medium text-white/70 transition hover:text-white lg:hidden"
          >
            Guide
          </Link>
          <a
            href="/api/auth/discord"
            className="rounded-brand border border-white/20 px-2.5 py-1.5 text-sm font-medium text-white/90 transition hover:border-coral/50 hover:text-white sm:px-3 sm:py-2"
          >
            Log in
          </a>
          <AddToDiscordButton
            href={inviteHref}
            className="!px-3 !py-1.5 !text-sm sm:!px-4 sm:!py-2"
          />
        </div>
      </div>
    </header>
  );
}
