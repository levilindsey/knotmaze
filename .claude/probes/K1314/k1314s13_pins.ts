// K1314 s13: outline_port.test.ts's digests (k1283_pins.ts) with K1314S13's flags set from K1314S13_SET
// ("liftOwn=0,thruGate=1"; unnamed flags keep src's values), to name which flag moves which pin.
//   [K1314S13_SET=...] node scripts/run_node.mjs .claude/probes/K1314/k1314s13_pins.ts
import * as O from "../../../src/render/outline/outline";
for (const kv of (process.env.K1314S13_SET ?? "").split(",").filter(Boolean)) {
  const [k, v] = kv.split("=");
  (O.K1314S13 as Record<string, boolean>)[k] = v === "1";
}
await import("../K1240/proto/k1283_pins");
