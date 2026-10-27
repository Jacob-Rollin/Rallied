import { Hono } from "hono";
import type { Context } from "hono";
import type { BotEnv } from "./lib/env.js";
import { discordAppId } from "./lib/env.js";
import { createServiceClient } from "./lib/supabase.js";
import { verifyDiscordRequest } from "./lib/verify.js";
import {
  InteractionResponseType,
  InteractionType,
  type Interaction,
} from "./lib/discord.js";
import {
  putApplicationCommands,
  secretsMatch,
} from "./lib/register-commands.js";
import { routeCommand, routeComponent } from "./handlers/router.js";

export type AppBindings = { Bindings: BotEnv };
type AppContext = Context<AppBindings>;

function registerCommandsKey(c: AppContext): string | undefined {
  const q = c.req.query("key");
  if (q) return q;
  const header = c.req.header("X-Register-Commands-Key");
  if (header) return header;
  const auth = c.req.header("Authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return undefined;
}

/** Phone-friendly slash-command registration (secret-gated). */
async function handleRegisterCommands(c: AppContext) {
  const expected = c.env.REGISTER_COMMANDS_SECRET;
  if (!expected) {
    return c.json({ ok: false, error: "Not found" }, 404);
  }

  const provided = registerCommandsKey(c);
  if (!secretsMatch(expected, provided)) {
    return c.json({ ok: false, error: "Unauthorized" }, 401);
  }

  const guildId =
    c.req.query("guild_id")?.trim() || c.env.DISCORD_DEV_GUILD_ID || null;
  const appId = discordAppId(c.env);
  const result = await putApplicationCommands({
    token: c.env.DISCORD_BOT_TOKEN,
    appId,
    guildId,
  });

  if (!result.ok) {
    return c.json(result, 502);
  }

  return c.json(result);
}

export function createApp() {
  const app = new Hono<AppBindings>();

  app.get("/", (c) =>
    c.json({
      ok: true,
      service: "rallied-bot",
      interactions: "/interactions",
    }),
  );

  app.get("/register-commands", (c) => handleRegisterCommands(c));
  app.post("/register-commands", (c) => handleRegisterCommands(c));

  app.post("/interactions", async (c) => {
    const env = c.env;
    const signature = c.req.header("X-Signature-Ed25519") ?? null;
    const timestamp = c.req.header("X-Signature-Timestamp") ?? null;
    const body = await c.req.text();

    const valid = verifyDiscordRequest(
      body,
      signature,
      timestamp,
      env.DISCORD_PUBLIC_KEY,
    );
    if (!valid) {
      return c.text("invalid request signature", 401);
    }

    const interaction = JSON.parse(body) as Interaction;

    if (interaction.type === InteractionType.PING) {
      return c.json({ type: InteractionResponseType.PONG });
    }

    const sb = createServiceClient(env);

    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const response = await routeCommand(interaction, sb, env);
      return c.json(response);
    }

    if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
      const response = await routeComponent(interaction, sb, env);
      return c.json(response);
    }

    return c.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: "Unsupported interaction type.", flags: 64 },
    });
  });

  return app;
}
