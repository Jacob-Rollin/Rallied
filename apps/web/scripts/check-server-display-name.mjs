/**
 * Smoke checks for resolveServerDisplayName priority / placeholders.
 * Run: node apps/web/scripts/check-server-display-name.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tsPath = path.join(root, "lib/server-display-name.ts");

// Compile the tiny module with tsc via ts-node/tsx if present; else transpile with esbuild-ish strip.
const require = createRequire(import.meta.url);
let mod;
try {
  // Prefer tsx if available from the monorepo.
  const r = spawnSync(
    "npx",
    ["--yes", "tsx", "-e", `import * as m from ${JSON.stringify(tsPath)}; console.log(JSON.stringify({
      a: m.resolveServerDisplayName({ guildId: "1564716956198899824", dbName: "Discord server", oauthName: "Official Rallied" }),
      b: m.resolveServerDisplayName({ guildId: "1564716956198899824", dbName: "1564716956198899824", oauthName: "Official Rallied" }),
      c: m.resolveServerDisplayName({ guildId: "1564716956198899824", dbName: "Discord server", oauthName: null }),
      d: m.resolveServerDisplayName({ guildId: "1564716956198899824", dbName: "Official Rallied", oauthName: null }),
      e: m.resolveServerDisplayName({ guildId: "1564716956198899824", dbName: "", oauthName: "", fallback: "Discord server" }),
      f: m.isUsableServerName("Discord server", "1564716956198899824"),
      g: m.isUsableServerName("Official Rallied", "1564716956198899824"),
    }))`],
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
  assert.equal(results.c, "Selected server", "placeholder DB alone is not shown");
  assert.equal(results.d, "Official Rallied", "real DB name used when no OAuth");
  assert.equal(results.e, "Selected server", "never emit Discord server fallback");
  assert.equal(results.f, false, "Discord server is not usable");
  assert.equal(results.g, true, "Official Rallied is usable");
  console.log("ok", results);
} catch (err) {
  console.error(err);
  process.exit(1);
}
