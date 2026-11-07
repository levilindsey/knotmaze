// K1220 S6: Run N's vite.private-cache.config.ts, for the S4 export
// (s2/master, git archive of e4075024) on port 5962; its own dep cache
// (vite-cache-s4/) so it never re-optimizes under the other server.
// The SERVED checkout's own vite config with a PRIVATE dep cache: worktrees
// share node_modules through junctions, and a plain `vite` started in one
// checkout re-optimizes the shared node_modules/.vite deps under every
// other running dev server. Run it from the checkout to serve:
//   npx vite --config <this file> --port 5962 --strictPort --host 127.0.0.1
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
  cacheDir: fileURLToPath(new URL("./vite-cache-s4", import.meta.url)),
};
