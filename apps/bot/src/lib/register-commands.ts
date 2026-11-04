import {
  putApplicationCommands,
  type RegisterCommandsErr,
  type RegisterCommandsOk,
  type RegisterCommandsResult,
} from "@rallied/shared";

export {
  putApplicationCommands,
  type RegisterCommandsErr,
  type RegisterCommandsOk,
  type RegisterCommandsResult,
};

/**
 * Resolve register target for HTTP / CLI.
 *
 * - `guild_id` query / explicit id → that guild (instant)
 * - `scope=guild` → DISCORD_DEV_GUILD_ID (error if unset)
 * - default / `scope=global` → **global** (all guilds; Discord may take up to ~1h)
 *
 * Important: DISCORD_DEV_GUILD_ID alone must NOT force guild scope on the HTTP
 * route — that left new invite servers without slash commands.
 */
export function resolveRegisterGuildId(opts: {
  guildIdQuery?: string | null;
  scopeQuery?: string | null;
  devGuildId?: string | null;
}): { guildId: string | null; error?: string } {
  const guildQ = opts.guildIdQuery?.trim() || "";
  if (guildQ) {
    return { guildId: guildQ };
  }

  const scope = (opts.scopeQuery?.trim() || "global").toLowerCase();
  if (scope === "guild" || scope === "dev") {
    const dev = opts.devGuildId?.trim() || "";
    if (!dev) {
      return {
        guildId: null,
        error:
          "scope=guild requires DISCORD_DEV_GUILD_ID or an explicit guild_id query",
      };
    }
    return { guildId: dev };
  }

  if (scope !== "global") {
    return {
      guildId: null,
      error: `Unknown scope "${scope}" (use global or guild)`,
    };
  }

  return { guildId: null };
}

/** Constant-time-ish compare for secrets (Workers / Node). */
export function secretsMatch(
  expected: string,
  provided: string | null | undefined,
): boolean {
  if (!provided || expected.length === 0) return false;
  if (expected.length !== provided.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}
