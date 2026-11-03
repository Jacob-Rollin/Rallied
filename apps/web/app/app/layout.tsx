import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { BotInviteProvider } from "@/components/BotInviteProvider";
import { resolveBotInviteHref } from "@/lib/bot-invite";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const inviteHref = resolveBotInviteHref();
  return (
    <Suspense fallback={<div className="p-8 text-muted">Loading…</div>}>
      <BotInviteProvider href={inviteHref}>
        <AppShell inviteHref={inviteHref}>{children}</AppShell>
      </BotInviteProvider>
    </Suspense>
  );
}
