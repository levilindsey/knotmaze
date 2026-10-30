// Run a probe .ts entry in Node through Vite's SSR module loader.
// vitest 4 dropped vite-node, so the old probe recipes
// (`node node_modules\vite-node\vite-node.mjs --config <folder>\vite.node.config.mjs <entry.ts> ...`)
// no longer run; this does the same job (TS + extensionless imports via
// ssrLoadModule), tracked with the repo so every machine has it (K1057;
// the runner was .claude/probes/K708/run_node.mjs in K1053 run A).
//
//   node scripts/run_node.mjs [--config <file>] <entry.ts> <args...>
//
// The entry sees process.argv as [node, <entry>, <args...>], as under
// vite-node, and its exit code and output are this process's. Without
// --config it reads no config: the old per-folder vite.node.config.mjs
// files all set the same three things (a private deps cache beside the
// config, logLevel "error", optimizeDeps noDiscovery), which are baked
// in below. The private cache is per-process under
// node_modules/.cache (git-ignored), so parallel slices and other
// agents' dev servers never share it. A bare {} config that only
// stopped vite-node loading the checkout's vite.config.ts is likewise
// covered (configFile: false).
// With --config <file> (before the entry, as vite-node had) it loads
// that Vite config instead: where the config sets something the runner
// also sets (cacheDir, logLevel, optimizeDeps in both tracked
// configs), the config's value wins, and its other settings (such as
// a resolve alias) are honoured.
import { createServer, loadConfigFromFile, mergeConfig } from "vite";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const argv = process.argv.slice(2);
let configPath;
let restArgs = argv;
if (argv[0] === "--config") {
  if (!argv[1]) throw new Error("usage: run_node.mjs [--config <file>] <entry.ts> <args...>");
  configPath = resolve(argv[1]);
  restArgs = argv.slice(2);
} else if (argv[0]?.startsWith("--config=")) {
  configPath = resolve(argv[0].slice("--config=".length));
  if (!argv[0].slice("--config=".length)) throw new Error("usage: run_node.mjs [--config <file>] <entry.ts> <args...>");
  restArgs = argv.slice(1);
}
const [entry, ...rest] = restArgs;
if (!entry) throw new Error("usage: run_node.mjs [--config <file>] <entry.ts> <args...>");
const entryPath = resolve(entry);
process.argv = [process.argv[0], entryPath, ...rest];

const defaults = {
  configFile: false,
  root,
  cacheDir: join(root, "node_modules", ".cache", `run-node-${process.pid}`),
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: "custom",
  // No HMR socket and no file watcher: parallel slices otherwise collide
  // on the HMR port and drown each other's SSR transport (60 s timeouts).
  server: { middlewareMode: true, hmr: false, watch: null },
};
let serverConfig = defaults;
if (configPath) {
  const loaded = await loadConfigFromFile({ command: "serve", mode: "development" }, configPath, root, "error");
  if (!loaded) throw new Error(`run_node.mjs: could not load config ${configPath}`);
  serverConfig = mergeConfig(defaults, loaded.config);
}

const server = await createServer(serverConfig);
try {
  await server.ssrLoadModule(pathToFileURL(entryPath).href);
} finally {
  await server.close();
}
