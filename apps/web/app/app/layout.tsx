import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="p-8 text-muted">Loading…</div>}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
