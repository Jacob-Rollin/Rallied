import { putApplicationCommands } from "@rallied/shared";
import { getRuntimeEnv } from "@/lib/runtime-env";

/**
 * Register slash commands for one guild right after Add-to-Discord.
 * Interactions-only bots never see GUILD_CREATE; this closes that gap so
 * `/setup` appears immediately without waiting for a global deploy.
 *
 * Fail-open: missing token/app id or Discord errors are logged, never thrown.
 */
export async function ensureGuildSlashCommands(
  guildId: string,
): Promise<{ ok: boolean; detail?: string }> {
  const id = guildId.trim();
  if (!id) return { ok: false, detail: "missing guild id" };

  const token = getRuntimeEnv("DISCORD_BOT_TOKEN");
  const appId =
    getRuntimeEnv("DISCORD_APP_ID") ||
    getRuntimeEnv("DISCORD_CLIENT_ID") ||
    getRuntimeEnv("NEXT_PUBLIC_DISCORD_CLIENT_ID");

  if (!token || !appId) {
    console.warn(
      "ensureGuildSlashCommands: DISCORD_BOT_TOKEN or app id missing on web Worker",
    );
    return { ok: false, detail: "missing bot credentials on web" };
  }

  const result = await putApplicationCommands({
    token,
    appId,
    guildId: id,
  });

  if (!result.ok) {
    console.error(
      "ensureGuildSlashCommands failed",
      result.error,
      result.status,
      result.detail,
    );
    return { ok: false, detail: result.error };
  }

  return { ok: true };
}
