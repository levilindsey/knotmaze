// K1482 s30: top-level keys (and one level down) of a JSON dump.
//   node keys30.mjs <file.json>
import { readFileSync } from "node:fs";
const j = JSON.parse(readFileSync(process.argv[2], "utf8"));
for (const [k, v] of Object.entries(j)) {
  const t = Array.isArray(v) ? `array ${v.length}` : v && typeof v === "object" ? `{${Object.keys(v).slice(0, 30).join(",")}}` : String(v).slice(0, 60);
  console.log(k, ":", t);
}
