// K1314 s13: run another probe with K1314S13's flags set from K1314S13_SET ("liftOwn=0,thruGate=1";
// unnamed flags keep src's values), without editing src.
//   [K1314S13_SET=...] node scripts/run_node.mjs .claude/probes/K1314/k1314s13_set.ts <probe.ts> [its args]
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import * as O from "../../../src/render/outline/outline";
for (const kv of (process.env.K1314S13_SET ?? "").split(",").filter(Boolean)) {
  const [k, v] = kv.split("=");
  (O.K1314S13 as Record<string, boolean>)[k] = v === "1";
}
const [mod] = process.argv.splice(2, 1);
await import(pathToFileURL(resolve(mod)).href);
