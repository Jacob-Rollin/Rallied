import { Suspense } from "react";
import { BotInviteProvider } from "@/components/BotInviteProvider";
import { DemoShell } from "@/components/DemoShell";
import { resolveBotInviteHref } from "@/lib/bot-invite";

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
  const inviteHref = resolveBotInviteHref();
  return (
    <Suspense fallback={<div className="p-8 text-muted">Loading demo…</div>}>
      <BotInviteProvider href={inviteHref}>
        <DemoShell inviteHref={inviteHref}>{children}</DemoShell>
      </BotInviteProvider>
    </Suspense>
  );
}
