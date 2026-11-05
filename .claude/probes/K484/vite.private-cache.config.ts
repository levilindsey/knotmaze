// K484's private-cache dev server (the K1139 shape): loads the checkout's
// vite.config.ts through vite's own loader and keeps the dep cache beside
// this file. Run from the checkout:
//   npx vite --config .claude/probes/K484/vite.private-cache.config.ts --port 5580 --strictPort --host 127.0.0.1
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
