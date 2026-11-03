import type { Metadata } from "next";
import { BRAND } from "@rallied/shared";
import { BotInviteProvider } from "@/components/BotInviteProvider";
import { OpsChrome } from "@/components/OpsChrome";
import { resolveBotInviteHref } from "@/lib/bot-invite";

export const metadata: Metadata = {
  title: `Ops — ${BRAND.name}`,
  description: "Rallied staff ops — feedback inbox and usage",
  robots: { index: false, follow: false },
};

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  const inviteHref = resolveBotInviteHref();
  return (
    <div className="min-h-screen bg-slate text-white">
      <BotInviteProvider href={inviteHref}>
        <OpsChrome inviteHref={inviteHref} />
        {children}
      </BotInviteProvider>
    </div>
  );
}
