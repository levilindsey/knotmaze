// K1247 s2: write a module as Vite's SSR transform serves it, so a
// .cpuprofile's line numbers (run_node.mjs runs this code) map to source.
//   node .claude/probes/K1240/proto/k1247s2_xf.mjs /<path from repo root>.ts <out.js>
import { createServer } from "vite";
import { writeFileSync } from "node:fs";
const server = await createServer({ configFile: false, logLevel: "error", server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true } });
const r = await server.transformRequest(process.argv[2], { ssr: true });
writeFileSync(process.argv[3], r.code);
await server.close();
