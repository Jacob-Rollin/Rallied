import Link from "next/link";
import { BRAND } from "@rallied/shared";

const LINKS = [
  { href: "/guide", label: "Guide" },
  { href: "/pricing", label: "Pricing" },
  { href: "/servers", label: "Servers" },
  { href: "/changelog", label: "Changelog" },
  { href: "/demo", label: "Demo" },
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

        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {LINKS.map((item) => (
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
      </div>
    </footer>
  );
}
