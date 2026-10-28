/**
 * Cron entry: run weekly digests for all servers with digest_channel_id
 * (or log-only when unset).
 *
 *   DISCORD_BOT_TOKEN=… SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=…
 *   npx tsx apps/bot/scripts/weekly-digest.ts
 */
import { runWeeklyDigest } from "../src/lib/digest.js";
import { readNodeEnv } from "../src/lib/env.js";
import { createServiceClient } from "../src/lib/supabase.js";

const env = readNodeEnv();
const sb = createServiceClient(env);
if (!sb) {
  console.error("Need SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const { data: servers, error } = await sb
  .from("servers")
  .select("id, discord_guild_id, name");

if (error) {
  console.error(error);
  process.exit(1);
}

for (const server of servers ?? []) {
  const result = await runWeeklyDigest(
    env,
    sb,
    server.id,
    server.discord_guild_id,
  );
  console.log(server.name, result.posted ? "posted" : "logged", result.summary);
}
