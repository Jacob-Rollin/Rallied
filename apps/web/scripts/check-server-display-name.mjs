/**
 * Smoke checks for resolveServerDisplayName priority / placeholders.
 * Run: node apps/web/scripts/check-server-display-name.mjs
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sharedPath = path.resolve(root, "../../packages/shared/src/server-name.ts");

const r = spawnSync(
  "npx",
  [
    "--yes",
    "tsx",
    "-e",
    `import * as m from ${JSON.stringify(sharedPath)}; console.log(JSON.stringify({
      a: m.resolveServerDisplayName({ guildId: "1564716956198899824", dbName: "Discord server", oauthName: "Official Rallied" }),
      b: m.resolveServerDisplayName({ guildId: "1564716956198899824", dbName: "1564716956198899824", oauthName: "Official Rallied" }),
      c: m.resolveServerDisplayName({ guildId: "1564716956198899824", dbName: "Discord server", oauthName: null }),
      d: m.resolveServerDisplayName({ guildId: "1564716956198899824", dbName: "Official Rallied", oauthName: null }),
      e: m.resolveServerDisplayName({ guildId: "1564716956198899824", dbName: "", oauthName: "", fallback: "Discord server" }),
      f: m.isUsableServerName("Discord server", "1564716956198899824"),
      g: m.isUsableServerName("Official Rallied", "1564716956198899824"),
      h: m.isUsableServerName("Selected server", "1564716956198899824"),
      i: m.resolveServerDisplayName({ guildId: "1564716956198899824", dbName: "Selected server", oauthName: null }),
      j: m.resolveServerDisplayName({ guildId: "1564716956198899824", dbName: "Selected server", oauthName: "Official Rallied" }),
    }))`,
  ],
  { encoding: "utf8", cwd: root },
);
if (r.status !== 0) {
  console.error(r.stderr || r.stdout);
  process.exit(r.status || 1);
}
const line = (r.stdout || "").trim().split("\n").filter(Boolean).pop();
const results = JSON.parse(line);
assert.equal(results.a, "Official Rallied", "OAuth wins over Discord server placeholder");
assert.equal(results.b, "Official Rallied", "OAuth wins over snowflake DB name");
assert.equal(results.c, "", "placeholder DB alone yields empty (never Selected server)");
assert.equal(results.d, "Official Rallied", "real DB name used when no OAuth");
assert.equal(results.e, "", "never emit Discord server fallback");
assert.equal(results.f, false, "Discord server is not usable");
assert.equal(results.g, true, "Official Rallied is usable");
assert.equal(results.h, false, "Selected server is not usable");
assert.equal(results.i, "", "Selected server DB alone yields empty");
assert.equal(results.j, "Official Rallied", "OAuth wins over Selected server");
console.log("ok", results);
