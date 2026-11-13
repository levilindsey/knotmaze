// K1247 s28: bundle a probe entry with Vite's build (rollup: direct bindings, as the browser runs them,
// where run_node.mjs's ssrLoadModule makes every imported name a getter call), unminified, so a
// .cpuprofile reads against readable lines.
//   node .claude/probes/K1247/k1247s28_build.mjs <entry.ts> <outDir>
import { build } from "vite";
import { resolve } from "node:path";
const [, , entry, out] = process.argv;
await build({
  configFile: false, logLevel: "warn",
  build: { ssr: resolve(entry), outDir: resolve(out), emptyOutDir: true, minify: false, target: "esnext", rollupOptions: { output: { format: "esm", entryFileNames: "[name].mjs" } } },
});
