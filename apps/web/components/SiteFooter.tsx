import Link from "next/link";
import { BRAND } from "@rallied/shared";

const PRODUCT = [
  { href: "/#how-it-works", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/demo", label: "Demo" },
] as const;

const LEARN = [
  { href: "/guide", label: "Guide" },
  { href: "/guide#ghostless", label: "Ghostless" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-display text-lg tracking-wide text-white">
            {BRAND.name}
          </p>
          <p className="mt-1 text-sm text-white/55">{BRAND.domain}</p>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:gap-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/45">
              Product
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {PRODUCT.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-white/75 transition hover:text-lime"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/45">
              Learn
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {LEARN.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-white/75 transition hover:text-lime"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
