import Link from "next/link";

type Props = {
  /** Transparent over hero vs solid strip on inner pages. */
  variant?: "hero" | "solid";
};

const NAV = [
  { href: "/#how-it-works", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/guide", label: "Guide" },
  { href: "/demo", label: "Demo" },
] as const;

export function SiteHeader({ variant = "solid" }: Props) {
  return (
    <header
      className={`relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-5 ${
        variant === "hero" ? "bg-transparent" : ""
      }`}
    >
      <Link href="/" className="shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/rallied-wm-transparent-dark.png"
          alt="Rallied"
          className="h-12 w-auto bg-transparent sm:h-14"
        />
      </Link>

      <nav
        className="hidden items-center gap-5 text-sm text-white/70 md:flex"
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

      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/guide"
          className="rounded-brand border border-transparent px-2.5 py-2 text-sm font-medium text-white/70 transition hover:text-white md:hidden"
        >
          Guide
        </Link>
        <a
          href="/api/auth/discord"
          className="rounded-brand border border-white/20 px-3 py-2 text-sm font-medium text-white/90 transition hover:border-coral/50 hover:text-white sm:px-4 sm:py-2.5 sm:text-base"
        >
          Log in
        </a>
      </div>
    </header>
  );
}
