/**
 * Register slash commands with Discord.
 * Guild-scoped when DISCORD_DEV_GUILD_ID is set (instant); else global (~1h).
 *
 * Usage (monorepo root): npm run register-commands
 */
import { commandDefinitions } from "../src/commands/definitions.js";

const token = process.env.DISCORD_BOT_TOKEN;
const appId = process.env.DISCORD_APP_ID;
const guildId = process.env.DISCORD_DEV_GUILD_ID;

if (!token || !appId) {
  console.error("Set DISCORD_BOT_TOKEN and DISCORD_APP_ID");
  process.exit(1);
}

const url = guildId
  ? `https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`
  : `https://discord.com/api/v10/applications/${appId}/commands`;

const res = await fetch(url, {
  method: "PUT",
  headers: {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(commandDefinitions),
});

const text = await res.text();
if (!res.ok) {
  console.error("Register failed", res.status, text);
  process.exit(1);
}

console.log(
  guildId
    ? `Registered ${commandDefinitions.length} guild commands → ${guildId}`
    : `Registered ${commandDefinitions.length} global commands`,
);
console.log(text.slice(0, 500));
