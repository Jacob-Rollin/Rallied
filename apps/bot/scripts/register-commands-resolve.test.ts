/**
 * Tiny assert script: npx tsx apps/bot/src/lib/register-commands.resolve.test.ts
 */
import { resolveRegisterGuildId } from "../src/lib/register-commands.js";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const a = resolveRegisterGuildId({});
assert(a.guildId === null && !a.error, "default is global");

const b = resolveRegisterGuildId({
  guildIdQuery: "111",
  scopeQuery: "global",
  devGuildId: "999",
});
assert(b.guildId === "111", "guild_id query wins");

const c = resolveRegisterGuildId({
  scopeQuery: "guild",
  devGuildId: "1564716956198899824",
});
assert(c.guildId === "1564716956198899824", "scope=guild uses dev id");

const d = resolveRegisterGuildId({ scopeQuery: "guild" });
assert(d.error && d.guildId === null, "scope=guild without dev fails");

const e = resolveRegisterGuildId({
  scopeQuery: undefined,
  devGuildId: "1564716956198899824",
});
assert(
  e.guildId === null && !e.error,
  "DISCORD_DEV_GUILD_ID alone must NOT force guild scope",
);

console.log("resolveRegisterGuildId ok");
