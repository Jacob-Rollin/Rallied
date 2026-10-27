/**
 * Register slash commands with Discord.
 * Guild-scoped when DISCORD_DEV_GUILD_ID is set (instant); else global (~1h).
 *
 * Usage (monorepo root): npm run register-commands
 *
 * Phone-friendly alternative: deploy Worker with REGISTER_COMMANDS_SECRET,
 * then open GET /register-commands?key=… (see apps/bot/README.md).
 */
import { putApplicationCommands } from "../src/lib/register-commands.js";

const token = process.env.DISCORD_BOT_TOKEN;
const appId = process.env.DISCORD_APP_ID || process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_DEV_GUILD_ID;

if (!token || !appId) {
  console.error("Set DISCORD_BOT_TOKEN and DISCORD_APP_ID (or DISCORD_CLIENT_ID)");
  process.exit(1);
}

const result = await putApplicationCommands({
  token,
  appId,
  guildId: guildId || null,
});

if (!result.ok) {
  console.error("Register failed", result.error, result.status ?? "", result.detail ?? "");
  process.exit(1);
}

console.log(
  result.guildId
    ? `Registered ${result.count} guild commands → ${result.guildId}`
    : `Registered ${result.count} global commands`,
);
