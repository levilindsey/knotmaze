// K1291 s3: the IoUs and past-front counts of k1291_reveal.mjs runs, side by side.
// node .claude/probes/K1291/s3_iou.mjs <dir>... (each holding reveal.json)
import fs from "node:fs";
import path from "node:path";
const rows = new Map();
const dirs = process.argv.slice(2);
for (const d of dirs) {
  const r = JSON.parse(fs.readFileSync(path.join(d, "reveal.json"), "utf8"));
  const cases = Array.isArray(r) ? r : r.cases;
  for (const c of cases) {
    const st = c.states;
    const list = Array.isArray(st) ? st : Object.entries(st ?? {}).map(([k, v]) => ({ key: k, ...v }));
    for (const s of list) {
      const key = `${c.name} ${s.state ?? s.key ?? "?"}`;
      if (!rows.has(key)) rows.set(key, {});
      const iou = s.iou ?? s.IoU;
      rows.get(key)[d] = `${typeof iou === "number" ? iou.toFixed(4) : "?"} p${s.past ?? "?"}`;
    }
  }
}
console.log(["case", ...dirs.map((d) => path.basename(d))].join(" | "));
for (const [k, v] of rows) console.log([k, ...dirs.map((d) => v[d] ?? "-")].join(" | "));
