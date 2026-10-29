import { notFound } from "next/navigation";
import { isProPlan } from "@rallied/shared";
import { DemoPublicServerPage } from "@/components/DemoPublicServerPage";
import { PublicServerView } from "@/components/PublicServerView";
import { isDemoGuildId } from "@/lib/guild-params";
import { resolvePublicServer } from "@/lib/public-data";

type Props = { params: Promise<{ slugOrGuildId: string }> };

const DEMO_PUBLIC_KEYS = new Set([
  "demo-esports",
  "night-queue",
  "founding-beta",
]);

export default async function PublicServerPage({ params }: Props) {
  const { slugOrGuildId } = await params;
  const bundle = await resolvePublicServer(slugOrGuildId);
  if (!bundle) notFound();

  const key = slugOrGuildId.toLowerCase();
  const isDemoSurface =
    DEMO_PUBLIC_KEYS.has(key) ||
    DEMO_PUBLIC_KEYS.has(bundle.pathKey) ||
    isDemoGuildId(bundle.server.discord_guild_id);

  // Community/trial demo pages: Upgrade unlocks Pro vanity preview (no Stripe).
  // Live guilds and already-Pro demo founding stay plan-gated.
  if (isDemoSurface && !isProPlan(bundle.server.plan)) {
    return <DemoPublicServerPage bundle={bundle} />;
  }

  return <PublicServerView bundle={bundle} />;
}
