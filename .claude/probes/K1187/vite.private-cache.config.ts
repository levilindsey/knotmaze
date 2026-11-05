// K1187 probe server (copied from K657's under rule 11): the checkout's
// own vite config with a PRIVATE dep cache, so this server never
// re-optimizes the shared .vite deps.
// Run: npx vite --config .claude/probes/K1187/vite.private-cache.config.ts --port 5660 --strictPort --host 127.0.0.1
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfigFromFile } from "vite";

const loaded = await loadConfigFromFile(
  { command: "serve", mode: "development" },
  resolve(process.cwd(), "vite.config.ts")
);

export default {
  ...(loaded?.config ?? {}),
  cacheDir: fileURLToPath(new URL("./vite-cache", import.meta.url)),
};
