// K99's own copy of K19-K20/vite.private-cache.config.ts: the SERVED
// checkout's vite config with a PRIVATE dep cache beside this file
// (K99/vite-cache), so this agent's server never re-optimizes deps under
// another agent's server. Run from the checkout to serve:
//   npx vite --config .claude/probes/K99/vite.private-cache.config.ts --port 5320 --strictPort --host 127.0.0.1
// Since K122 the checkout's vite.config.ts imports an extensionless .ts
// module (notices/vite_plugin), which a native import() cannot resolve, so
// this loads it through vite's own config loader (esbuild-bundled).
// The cache lands beside this file (vite-cache/).
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
