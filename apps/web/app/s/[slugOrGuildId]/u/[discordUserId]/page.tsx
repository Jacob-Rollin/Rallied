import { notFound } from "next/navigation";
import { isProPlan } from "@rallied/shared";
import {
  DemoPublicPlayerCard,
  LivePublicPlayerCard,
} from "@/components/DemoPublicPlayerCard";
import { isDemoGuildId } from "@/lib/guild-params";
import { resolvePublicPlayer } from "@/lib/public-data";

type Props = {
  params: Promise<{ slugOrGuildId: string; discordUserId: string }>;
};

const DEMO_PUBLIC_KEYS = new Set([
  "demo-esports",
  "night-queue",
  "founding-beta",
]);

export default async function PublicPlayerCardPage({ params }: Props) {
  const { slugOrGuildId, discordUserId } = await params;
  const result = await resolvePublicPlayer(slugOrGuildId, discordUserId);
  if (!result) notFound();

  const { bundle, member, ghostless, inGoodStanding } = result;
  const key = slugOrGuildId.toLowerCase();
  const isDemoSurface =
    DEMO_PUBLIC_KEYS.has(key) ||
    DEMO_PUBLIC_KEYS.has(bundle.pathKey) ||
    isDemoGuildId(bundle.server.discord_guild_id);

  const cardProps = { bundle, member, ghostless, inGoodStanding };

  if (isDemoSurface && !isProPlan(bundle.server.plan)) {
    return (
      <div className="min-h-screen">
        <DemoPublicPlayerCard {...cardProps} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <LivePublicPlayerCard {...cardProps} />
    </div>
  );
}
