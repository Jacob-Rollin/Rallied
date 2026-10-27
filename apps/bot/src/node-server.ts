import { createServer } from "node:http";
import { createApp } from "./app.js";
import { readNodeEnv, type BotEnv } from "./lib/env.js";

/**
 * Local / Railway / Fly Node entry.
 * Uses Node http + Hono fetch so we stay dependency-light.
 */
const base = createApp();
const env: BotEnv = readNodeEnv();
const port = Number(process.env.PORT ?? 8787);

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    const body = Buffer.concat(chunks);

    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (v === undefined) continue;
      if (Array.isArray(v)) v.forEach((item) => headers.append(k, item));
      else headers.set(k, v);
    }

    const request = new Request(url, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : body,
    });

    const response = await base.fetch(request, env);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    const buf = Buffer.from(await response.arrayBuffer());
    res.end(buf);
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.end("internal error");
  }
}).listen(port, () => {
  console.log(`Rallied bot listening on http://localhost:${port}/interactions`);
  if (!env.DISCORD_PUBLIC_KEY) {
    console.warn("DISCORD_PUBLIC_KEY missing — signature verify will fail.");
  }
  if (!env.SUPABASE_URL) {
    console.warn("SUPABASE_URL missing — commands return soft errors.");
  }
});
