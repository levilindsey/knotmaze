// K1139 S3b fix: same-band tau jumps in a diag_s3b.mjs dump (adjacent pixel pairs, one winning band, full cover, whose tau steps).
//   node taujump.mjs <dumpDir> <ji> <phase>
import { readFileSync } from "fs";
const [dir, ji, k] = process.argv.slice(2);
const meta = JSON.parse(readFileSync(dir + "/meta.json", "utf8"));
const rc = meta.recs.find((r) => r.ji == ji);
const BW = rc.box.w, BH = rc.box.h, PX = 46;
const u8 = new Uint8Array(readFileSync(`${dir}/r${ji}_t${k}.u8`));
const f32 = new Float32Array(new Uint8Array(readFileSync(`${dir}/r${ji}_t${k}.f32`)).buffer);
const hits = [];
for (let Y = 1; Y < BH - 1; Y++) for (let X = 1; X < BW - 1; X++) {
  const i = Y * BW + X, w = u8[i * PX + 45] - 1;
  if (w < 0 || u8[i * PX + w * 9 + 1] < 255) continue;
  for (const [dx, dy] of [[1, 0], [0, 1]]) {
    const j = i + dy * BW + dx, wj = u8[j * PX + 45] - 1;
    if (wj !== w || u8[j * PX + w * 9 + 1] < 255) continue;
    const dv = Math.abs(u8[i * PX + w * 9] - u8[j * PX + w * 9]);
    const dt = Math.abs(f32[(i * 4 + w) * 2 + 1] - f32[(j * 4 + w) * 2 + 1]);
    if (dt > 0.03) hits.push({ X, Y, w, dv, dt: +dt.toFixed(3), ti: +f32[(i * 4 + w) * 2 + 1].toFixed(3), tj: +f32[(j * 4 + w) * 2 + 1].toFixed(3), di: +f32[(i * 4 + w) * 2].toFixed(3) });
  }
}
hits.sort((a, b) => b.dt - a.dt);
console.log(`tau jumps > 0.03 within one band: ${hits.length}`);
const byW = {}; for (const h of hits) byW[h.w] = (byW[h.w] ?? 0) + 1; console.log(JSON.stringify(byW));
for (const h of hits.slice(0, 6)) console.log(JSON.stringify(h));
// world position of the worst, relative to the record centre
const A = meta.aff, h = hits[0];
if (h) { const cx = (rc.box.x + h.X + 0.5) / 1.5, cy = (rc.box.y + h.Y + 0.5) / 1.5; const wx = A.ax + A.bx * cx, wy = A.ay + A.cy * cy; console.log("worst at world", (wx - rc.c[0]).toFixed(3), (wy - rc.c[1]).toFixed(3), "from c"); }
const b = rc.bands.map((b) => ({ nv: b.nv, m: +b.m.toFixed(3), tau0: +b.verts[0][2].toFixed(3), tauN: +b.verts[b.nv - 1][2].toFixed(3) }));
console.log(JSON.stringify(b));