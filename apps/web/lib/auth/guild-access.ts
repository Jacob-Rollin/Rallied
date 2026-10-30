import type { AdminGuild, DashboardAccess } from "@rallied/shared";
import type { SessionData } from "./session-options";

/** Resolve access for a guild already on the session. */
export function guildAccessOnSession(
  session: SessionData,
  discordGuildId: string,
): DashboardAccess | null {
  const guild = (session.guilds ?? []).find((g) => g.id === discordGuildId);
  if (!guild) return null;
  return guild.access === "mod" ? "mod" : "owner";
}

/** Session must include the guild (any access). */
export function requireGuildOnSession(
  session: SessionData,
  discordGuildId: string,
): AdminGuild | null {
  return (session.guilds ?? []).find((g) => g.id === discordGuildId) ?? null;
}

/** Owner-only mutations (Settings write, Billing checkout/portal). */
export function requireOwnerGuild(
  session: SessionData,
  discordGuildId: string,
): AdminGuild | null {
  const guild = requireGuildOnSession(session, discordGuildId);
  if (!guild) return null;
  if (guild.access === "mod") return null;
  return guild;
}
