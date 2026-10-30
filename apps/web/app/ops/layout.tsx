import type { Metadata } from "next";
import { BRAND } from "@rallied/shared";
import Link from "next/link";

export const metadata: Metadata = {
  title: `Ops — ${BRAND.name}`,
  description: "Rallied staff feedback inbox",
  robots: { index: false, follow: false },
};

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/ops" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/rallied-wm-transparent-dark.png"
              alt="Rallied"
              className="h-9 w-auto bg-transparent sm:h-10"
            />
            <span className="font-display text-xs tracking-[0.14em] text-coral">
              OPS
            </span>
          </Link>
          <a
            href="/api/auth/logout"
            className="text-xs text-muted hover:text-coral"
          >
            Log out
          </a>
        </div>
      </header>
      {children}
    </div>
  );
}
