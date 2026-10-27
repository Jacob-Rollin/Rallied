import { Hono } from "hono";
import type { BotEnv } from "./lib/env.js";
import { createServiceClient } from "./lib/supabase.js";
import { verifyDiscordRequest } from "./lib/verify.js";
import {
  InteractionResponseType,
  InteractionType,
  type Interaction,
} from "./lib/discord.js";
import { routeCommand, routeComponent } from "./handlers/router.js";

export type AppBindings = { Bindings: BotEnv };

export function createApp() {
  const app = new Hono<AppBindings>();

  app.get("/", (c) =>
    c.json({
      ok: true,
      service: "rallied-bot",
      interactions: "/interactions",
    }),
  );

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
