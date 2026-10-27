import { commandDefinitions } from "../commands/definitions.js";

export type RegisterCommandsOk = {
  ok: true;
  count: number;
  guildId: string | null;
};

export type RegisterCommandsErr = {
  ok: false;
  error: string;
  status?: number;
  detail?: string;
};

export type RegisterCommandsResult = RegisterCommandsOk | RegisterCommandsErr;

/** PUT Discord application commands (guild-scoped when guildId set). */
export async function putApplicationCommands(opts: {
  token: string;
  appId: string;
  guildId?: string | null;
}): Promise<RegisterCommandsResult> {
  const { token, appId, guildId } = opts;
  if (!token || !appId) {
    return {
      ok: false,
      error: "Missing DISCORD_BOT_TOKEN or application id (DISCORD_APP_ID)",
    };
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
    return {
      ok: false,
      error: "Discord register failed",
      status: res.status,
      detail: text.slice(0, 800),
    };
  }

  return {
    ok: true,
    count: commandDefinitions.length,
    guildId: guildId ?? null,
  };
}

/** Constant-time-ish compare for secrets (Workers / Node). */
export function secretsMatch(expected: string, provided: string | null | undefined): boolean {
  if (!provided || expected.length === 0) return false;
  if (expected.length !== provided.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}
