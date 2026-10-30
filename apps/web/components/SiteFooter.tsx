import Link from "next/link";
import { BRAND } from "@rallied/shared";

const PRODUCT_LINKS = [
  { href: "/guide", label: "Guide" },
  { href: "/pricing", label: "Pricing" },
  { href: "/servers", label: "Servers" },
  { href: "/changelog", label: "Changelog" },
  { href: "/demo", label: "Demo" },
] as const;

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-lg tracking-wide text-white">
            {BRAND.name}
          </p>
          <p className="mt-1 text-sm text-white/55">{BRAND.domain}</p>
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm sm:justify-end">
              {PRODUCT_LINKS.map((item) => (
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
          </nav>
          <nav aria-label="Legal">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm sm:justify-end">
              {LEGAL_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-white/55 transition hover:text-lime"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
