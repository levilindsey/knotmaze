// The SERVED checkout's own vite config with a PRIVATE dep cache (K137 s3c's
// wrapper): worktrees share node_modules through junctions, and a plain
// `vite` re-optimizes the shared node_modules/.vite deps under every other
// dev server. Run from the worktree:
//   npx.cmd vite --config <this file> --port 5961 --strictPort --host 127.0.0.1
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
