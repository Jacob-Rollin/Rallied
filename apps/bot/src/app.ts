import { Hono } from "hono";
import type { Context } from "hono";
import type { BotEnv } from "./lib/env.js";
import { discordAppId } from "./lib/env.js";
import { createServiceClient } from "./lib/supabase.js";
import { verifyDiscordRequest } from "./lib/verify.js";
import {
  ephemeral,
  InteractionResponseType,
  InteractionType,
  type Interaction,
} from "./lib/discord.js";
import {
  deferredAck,
  deliverDeferredResponse,
  deliverErrorFollowup,
  shouldDeferEphemeral,
} from "./lib/followup.js";
import { formatError } from "./lib/errors.js";
import {
  putApplicationCommands,
  secretsMatch,
} from "./lib/register-commands.js";
import {
  lfgCreateGameSelectMessage,
  lfgCreateModalResponse,
  lfgHowItWorksMessage,
} from "./lib/embeds.js";
import { handleAutocomplete } from "./handlers/autocomplete.js";
import {
  routeCommand,
  routeComponent,
  routeModal,
} from "./handlers/router.js";

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

/**
 * Fast-path component replies that must not rely on defer + webhook edit:
 * - Create/Find/Help desk taps (no DB) → immediate ephemeral UI
 * - Game select → modal (Discord forbids deferring then opening a modal)
 */
function syncComponentResponse(interaction: Interaction) {
  const customId = interaction.data?.custom_id;
  if (!customId) return null;

  if (customId === "lfg:desk:create") {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: lfgCreateGameSelectMessage(),
    };
  }
  // desk:find needs Supabase — handled via defer (lists all open parties).
  if (customId === "lfg:desk:help") {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: lfgHowItWorksMessage(),
    };
  }

  if (customId === "lfg:creategame") {
    const selected = interaction.data?.values?.[0];
    if (!selected) {
      return ephemeral("Pick a game from the list.");
    }
    return lfgCreateModalResponse(selected);
  }

  return null;
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
    try {
      const env = c.env;
      if (!env.DISCORD_PUBLIC_KEY) {
        console.error(
          "DISCORD_PUBLIC_KEY missing — Discord will show did not respond",
        );
      }

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

      // Keep PING fast and synchronous (Discord URL verification).
      if (interaction.type === InteractionType.PING) {
        return c.json({ type: InteractionResponseType.PONG });
      }

      // Autocomplete cannot be deferred — reply with choices within 3s.
      if (interaction.type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE) {
        return c.json(handleAutocomplete(interaction));
      }

      // Desk Create/Find/Help + create-game → modal: reply sync (no defer).
      if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
        const sync = syncComponentResponse(interaction);
        if (sync) {
          return c.json(sync);
        }
      }

      if (
        interaction.type !== InteractionType.APPLICATION_COMMAND &&
        interaction.type !== InteractionType.MESSAGE_COMPONENT &&
        interaction.type !== InteractionType.MODAL_SUBMIT
      ) {
        return c.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: "Unsupported interaction type.", flags: 64 },
        });
      }

      // ACK within Discord’s 3s window; finish work in the background.
      const ack = deferredAck(interaction);
      const deferredEphemeral = shouldDeferEphemeral(interaction);

      const background = (async () => {
        try {
          const sb = createServiceClient(env);
          let response;
          if (interaction.type === InteractionType.APPLICATION_COMMAND) {
            response = await routeCommand(interaction, sb, env);
          } else if (interaction.type === InteractionType.MODAL_SUBMIT) {
            response = await routeModal(interaction, sb, env);
          } else {
            response = await routeComponent(interaction, sb, env);
          }
          await deliverDeferredResponse(
            env,
            interaction,
            response,
            deferredEphemeral,
          );
        } catch (err) {
          const msg = formatError(err);
          console.error("deferred interaction failed", msg, err);
          // Ephemeral error follow-up even when the deferred ACK was public.
          await deliverErrorFollowup(env, interaction, msg, deferredEphemeral);
        }
      })();

      const waitUntil = c.executionCtx?.waitUntil?.bind(c.executionCtx);
      if (waitUntil) {
        waitUntil(background);
      } else {
        // Node / local: fire-and-forget so the defer JSON still returns immediately.
        background.catch((err) => console.error("background interaction", err));
      }

      return c.json(ack);
    } catch (err) {
      const msg = formatError(err);
      console.error("/interactions uncaught", msg, err);
      return c.json(
        {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Bot error: ${msg}`,
            flags: 64,
          },
        },
        200,
      );
    }
  });

  return app;
}
