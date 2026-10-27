import { createApp } from "./app.js";

/** Cloudflare Workers entry — wrangler.toml `main`. */
const app = createApp();

export default {
  fetch: app.fetch,
};
