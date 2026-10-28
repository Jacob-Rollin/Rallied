import { createApp } from "./app.js";
import type { BotEnv } from "./lib/env.js";
import { runBotHygiene } from "./lib/hygiene.js";

/** Cloudflare Workers entry — wrangler.toml `main`. */
const app = createApp();

export default {
  fetch: app.fetch,

  /** Cron: expire stale LFG parties + resolve ready-check grace. */
  async scheduled(
    _event: ScheduledEvent,
    env: BotEnv,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(
      (async () => {
        try {
          const result = await runBotHygiene(env);
          console.log("bot hygiene", result);
        } catch (err) {
          console.error("bot hygiene failed", err);
        }
      })(),
    );
  },
};
