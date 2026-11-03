import { SetupNeededPanel } from "@/components/SetupNeededPanel";
import { getSession } from "@/lib/auth/session";
import { resolveBotInviteHref } from "@/lib/bot-invite";
import { GUILD_QUERY } from "@/lib/guild-params";
import { BotInviteReturnCleanup } from "@/components/BotInviteReturnCleanup";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function one(
  v: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

/**
 * Post–Add-to-Discord landing. Discord Advanced Bot Auth redirects here with
 * `guild_id` (and unused `code` / `permissions` / `iss` which we strip client-side).
 * Also reachable as `/app/setup?guild=…` or `/app?installed=1`.
 */
export default async function AppSetupPage({ searchParams }: Props) {
  const sp = await searchParams;
  const session = await getSession();
  const guildId =
    one(sp.guild_id)?.trim() ||
    one(sp[GUILD_QUERY])?.trim() ||
    "";
  const installed =
    one(sp.installed) === "1" || Boolean(one(sp.guild_id)) || Boolean(one(sp.code));
  const guilds = session.guilds ?? [];
  const match = guildId ? guilds.find((g) => g.id === guildId) : undefined;
  const inviteHref = resolveBotInviteHref(
    guildId ? { guildId, disableGuildSelect: true } : undefined,
  );

  return (
    <>
      <BotInviteReturnCleanup guildId={guildId || null} />
      <SetupNeededPanel
        guildId={guildId || null}
        guildName={match?.name ?? null}
        guilds={guilds}
        inviteHref={inviteHref}
        installed={installed}
        authenticated={Boolean(session.user)}
      />
    </>
  );
}
