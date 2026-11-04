/**
 * Register slash commands with Discord.
 *
 * Default: **global** (all guilds; Discord may take up to ~1h to show).
 * Guild-scoped (instant): `--guild <id>` or `--scope guild` / `REGISTER_SCOPE=guild`
 * with `DISCORD_DEV_GUILD_ID`.
 *
 * Usage (monorepo root):
 *   npm run register-commands
 *   npm run register-commands -- --guild 1234567890
 *   REGISTER_SCOPE=guild npm run register-commands
 *
 * Phone-friendly: GET /register-commands?key=… (defaults global)
 *   &guild_id=<id> for one server · &scope=guild for DISCORD_DEV_GUILD_ID
 */
import { putApplicationCommands } from "../src/lib/register-commands.js";

const token = process.env.DISCORD_BOT_TOKEN;
const appId = process.env.DISCORD_APP_ID || process.env.DISCORD_CLIENT_ID;

const argv = process.argv.slice(2);
function flagValue(name: string): string | undefined {
  const i = argv.indexOf(name);
  if (i === -1) return undefined;
  return argv[i + 1];
}

const guildFromFlag = flagValue("--guild")?.trim();
const scopeFlag = flagValue("--scope")?.trim().toLowerCase();
const envScope = process.env.REGISTER_SCOPE?.trim().toLowerCase();
const scope = scopeFlag || envScope || "global";
const envGuild = process.env.DISCORD_DEV_GUILD_ID?.trim() || "";

let guildId: string | null = null;
if (guildFromFlag) {
  guildId = guildFromFlag;
} else if (scope === "guild" || scope === "dev") {
  if (!envGuild) {
    console.error("Guild scope needs --guild <id> or DISCORD_DEV_GUILD_ID");
    process.exit(1);
  }
  guildId = envGuild;
} else if (scope !== "global") {
  console.error(`Unknown scope "${scope}" (use global or guild)`);
  process.exit(1);
}

if (!token || !appId) {
  console.error("Set DISCORD_BOT_TOKEN and DISCORD_APP_ID (or DISCORD_CLIENT_ID)");
  process.exit(1);
}

const result = await putApplicationCommands({
  token,
  appId,
  guildId,
});

if (!result.ok) {
  console.error("Register failed", result.error, result.status ?? "", result.detail ?? "");
  process.exit(1);
}

console.log(
  result.guildId
    ? `Registered ${result.count} guild commands → ${result.guildId}`
    : `Registered ${result.count} global commands (may take up to ~1h in Discord)`,
);
