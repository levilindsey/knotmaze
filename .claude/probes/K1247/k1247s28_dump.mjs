// K1247 s28: write Vite's SSR-transformed code of the given modules (the code run_node.mjs runs, so a
// .cpuprofile's line numbers read against it).
//   node .claude/probes/K1247/k1247s28_dump.mjs <outDir> <src/...ts>...
import { createServer } from "vite";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
const [, , out, ...mods] = process.argv;
mkdirSync(out, { recursive: true });
const server = await createServer({ configFile: false, logLevel: "error", server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true, include: [] }, appType: "custom" });
try {
  for (const m of mods) {
    const r = await server.ssrTransform ? null : null;
    void r;
    const res = await server.environments.ssr.transformRequest("/" + m.replace(/\\/g, "/"));
    writeFileSync(join(out, basename(m) + ".js"), res.code);
    console.log(`${m}: ${res.code.split("\n").length} lines`);
  }
} finally { await server.close(); }
