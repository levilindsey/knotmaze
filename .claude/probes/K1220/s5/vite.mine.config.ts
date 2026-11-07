// K1220 S5: Run N's vite.private-cache.config.ts, for THIS worktree on
// port 5981; its own dep cache (vite-cache-mine/) so it never re-optimizes
// under the other server.
// The SERVED checkout's own vite config with a PRIVATE dep cache: worktrees
// share node_modules through junctions, and a plain `vite` started in one
// checkout re-optimizes the shared node_modules/.vite deps under every
// other running dev server. Run it from the checkout to serve:
//   npx vite --config <this file> --port 5981 --strictPort --host 127.0.0.1
// Since K122 the checkout's vite.config.ts imports an extensionless .ts
// module (notices/vite_plugin), which a native import() cannot resolve, so
// this loads it through vite's own config loader (esbuild-bundled).
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfigFromFile } from "vite";

const loaded = await loadConfigFromFile(
  { command: "serve", mode: "development" },
  resolve(process.cwd(), "vite.config.ts")
);

export default {
  ...(loaded?.config ?? {}),
  cacheDir: fileURLToPath(new URL("./vite-cache-mine", import.meta.url)),
};
