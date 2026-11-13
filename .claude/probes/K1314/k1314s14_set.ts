// K1314 s14: k1314s13_set.ts with any outline flag object: K1314_SET="liftEnd=1,K1314S14.rootTie=0" (a bare
// name is K1314S13's; Obj.name for another exported flag object), then runs the probe.
//   [K1314_SET=...] node scripts/run_node.mjs .claude/probes/K1314/k1314s14_set.ts <probe.ts> [its args]
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import * as O from "../../../src/render/outline/outline";
for (const kv of (process.env.K1314_SET ?? "").split(",").filter(Boolean)) {
  const [k, v] = kv.split("=");
  const [o, n] = k.includes(".") ? k.split(".") : ["K1314S13", k];
  (O as unknown as Record<string, Record<string, boolean>>)[o][n] = v === "1";
}
const [mod] = process.argv.splice(2, 1);
await import(pathToFileURL(resolve(mod)).href);
