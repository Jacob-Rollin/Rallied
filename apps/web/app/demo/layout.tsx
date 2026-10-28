import { Suspense } from "react";
import { DemoShell } from "@/components/DemoShell";

export const metadata = {
  title: "Demo admin · Rallied",
  description:
    "Explore the Rallied server-owner dashboard with mock data — no Discord login required.",
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="p-8 text-muted">Loading demo…</div>}>
      <DemoShell>{children}</DemoShell>
    </Suspense>
  );
}
