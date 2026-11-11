// K1283 s7: how far an end arm's chain end lies from its junction's centre (form B's disk centre vs the outline's).
import { loadScene } from "./k1279_census";
const nm = process.argv[2] ?? "muse_hash"; const want = (process.argv[3] ?? "").split(",").filter(Boolean).map(Number);
const scene = loadScene(nm) as any; const h = scene.look.halfWidth;
const ds: number[] = [];
scene.junctions.forEach((J: any, ji: number) => {
  for (const a of J.arms) {
    if (a.kind !== "end") continue;
    const ch = scene.chains.find((c: any) => c.id === a.chain); if (!ch) continue;
    const p = ch.pts; const n = p.length / 2;
    const e0 = [p[0], p[1]]; const e1 = [p[2 * n - 2], p[2 * n - 1]];
    const d0 = Math.hypot(e0[0] - J.c[0], e0[1] - J.c[1]); const d1 = Math.hypot(e1[0] - J.c[0], e1[1] - J.c[1]);
    const d = Math.min(d0, d1); ds.push(d / h);
    if (want.includes(ji)) console.log(`j${ji} chain ${a.chain} s ${a.s.toFixed(3)} dir ${a.dir}: end ${d0 < d1 ? "start" : "end"} at ${(d / h).toFixed(3)} h from c; c (${J.c[0].toFixed(3)}, ${J.c[1].toFixed(3)}); h ${h}`);
  }
});
ds.sort((a, b) => a - b);
console.log(`${nm}: ${ds.length} end arms; chain end to centre / h: median ${ds[ds.length >> 1].toFixed(3)} p90 ${ds[Math.floor(ds.length * 0.9)].toFixed(3)} max ${ds[ds.length - 1].toFixed(3)}`);
