import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

type Section = {
  id: string;
  title: string;
  children: ReactNode;
};

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  sections: Section[];
};

export function LegalDoc({ eyebrow, title, description, sections }: Props) {
  return (
    <div className="min-h-screen">
      <SiteHeader variant="solid" />

      <main className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:pt-12">
        <p className="font-display text-xs tracking-[0.16em] text-coral">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-wide sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 max-w-xl text-white/75">{description}</p>
        <p className="mt-2 font-mono text-xs tabular-nums text-white/45">
          Last updated: October 30, 2026
        </p>

        <aside
          className="mt-8 border-l-2 border-coral/70 bg-slate-elevated/50 px-4 py-3 text-sm leading-relaxed text-white/80"
          role="note"
        >
          <strong className="font-semibold text-white">Draft</strong> for product
          use — not legal advice; have counsel review before relying on this as
          binding policy.
        </aside>

        <nav
          aria-label="On this page"
          className="mt-10 border-b border-white/10 pb-8"
        >
          <p className="font-display text-xs tracking-[0.14em] text-white/45">
            SECTIONS
          </p>
          <ol className="mt-3 columns-1 gap-x-8 sm:columns-2">
            {sections.map((section, i) => (
              <li key={section.id} className="mb-1.5 break-inside-avoid">
                <a
                  href={`#${section.id}`}
                  className="text-sm text-white/70 transition hover:text-lime"
                >
                  <span className="font-mono text-white/40">
                    {String(i + 1).padStart(2, "0")}
                  </span>{" "}
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-12">
          {sections.map((section, i) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-28"
            >
              <p className="font-display text-xs tracking-[0.14em] text-coral">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-1 font-display text-2xl tracking-wide text-white sm:text-3xl">
                {section.title}
              </h2>
              <div className="legal-prose mt-4 space-y-3 text-sm leading-relaxed text-white/75">
                {section.children}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-14 text-sm text-white/50">
          <Link href="/privacy" className="text-coral hover:underline">
            Privacy
          </Link>
          {" · "}
          <Link href="/terms" className="text-coral hover:underline">
            Terms
          </Link>
          {" · "}
          <Link href="/guide" className="text-coral hover:underline">
            Guide
          </Link>
          {" · "}
          <Link href="/pricing" className="text-coral hover:underline">
            Pricing
          </Link>
          {" · "}
          <Link href="/changelog" className="text-coral hover:underline">
            Changelog
          </Link>
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
