// K1218 S7 (a copy of S6's vite.private-cache.config.ts): the cache lands in
// out/vite-cache-<served checkout's folder name>/ beside this file, so two
// servers (the branch and a master copy) never share one.
// The SERVED checkout's own vite config with a PRIVATE dep cache: worktrees
// share node_modules through junctions, and a plain `vite` started in one
// checkout re-optimizes the shared node_modules/.vite deps under every
// other running dev server. Run it from the checkout to serve:
//   npx vite --config <this file> --port 5982 --strictPort --host 127.0.0.1
// Since K122 the checkout's vite.config.ts imports an extensionless .ts
// module (notices/vite_plugin), which a native import() cannot resolve, so
// this loads it through vite's own config loader (esbuild-bundled).
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfigFromFile } from "vite";

const loaded = await loadConfigFromFile(
  { command: "serve", mode: "development" },
  resolve(process.cwd(), "vite.config.ts")
);

export default {
  ...(loaded?.config ?? {}),
  cacheDir: fileURLToPath(new URL(`./out/vite-cache-${basename(process.cwd())}`, import.meta.url)),
};