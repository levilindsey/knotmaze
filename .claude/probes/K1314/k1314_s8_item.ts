// K1314 s8: fill items' scalar fields: node scripts/run_node.mjs .claude/probes/K1314/k1314_s8_item.ts <scene> <item>[,<item>...]
import { buildModel } from "./k1314_census";
const m = buildModel(process.argv[2]);
for (const i of process.argv[3].split(",").map(Number)) {
  const it = m.fs.items[i] as Record<string, unknown>;
  console.log(`item ${i} ` + Object.entries(it).filter(([, v]) => typeof v !== "object" || v === null).map(([k, v]) => `${k}=${typeof v === "number" ? +(+v).toFixed(3) : v}`).join(" "));
}
