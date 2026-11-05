// K1191 (Muse batch 19 Run D, task 2): which junctions are aRec 2129 and
// 2668 - offline half. Reads Stage 4's dumps (diag_s4.mjs's triangle
// captures in .claude/probes/K1139/out/s4/d/, read only) and, per capture,
// lists every aRec it carries with its triangle count, the world centroid
// of its fan triangles, and (for the target records) how many of the host
// record's box pixels / MSAA samples it owns and where they sit.
// The live half (records_live.mjs) names the junction at that centroid by
// fieldProbe.record(ji)/center(ji) on the same stands.
//   node records.mjs <dumpDir> <hostJi> <targetRec,targetRec>
import { readFileSync } from "fs";
import { join } from "path";
import { coverage, pickOrient, owners } from "./cover_lib.mjs";

const [DIR, JI, TARGETS] = process.argv.slice(2);
const meta = JSON.parse(readFileSync(join(DIR, "meta.json"), "utf8"));
const targets = TARGETS.split(",").map(Number);
const rc = meta.recs.find((r) => r.ji === Number(JI));
const A = meta.aff;
const toWorld = (devX, devY) => {
  const sx = devX / meta.dsf, sy = devY / meta.dsf;
  return [A.ax + A.bx * sx + A.cx * sy, A.ay + A.by * sx + A.cy * sy];
};
const buf = readFileSync(join(DIR, `r${rc.ji}.tri.bin`));
const T = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
const byRec = new Map();
for (let t = 0; t < T.length / 14; t++) {
  const o = t * 14;
  const rec = T[o + 11];
  const e = byRec.get(rec) ?? { tris: 0, fanTris: 0, stripTris: 0, cx: 0, cy: 0, n: 0 };
  e.tris++;
  const strip = rec - Math.floor(rec) > 0.125;
  if (strip) e.stripTris++; else e.fanTris++;
  if (!strip) {
    e.cx += (T[o + 2] + T[o + 4] + T[o + 6]) / 3;
    e.cy += (T[o + 3] + T[o + 5] + T[o + 7]) / 3;
    e.n++;
  }
  byRec.set(rec, e);
}
console.log(`dump ${DIR} host ji ${rc.ji} rb ${rc.rb} centre ${rc.c.map((v) => v.toFixed(3)).join(",")} box ${JSON.stringify(rc.box)}`);
for (const [rec, e] of [...byRec.entries()].sort((a, b) => a[0] - b[0])) {
  const w = e.n ? toWorld(e.cx / e.n, e.cy / e.n) : [NaN, NaN];
  console.log(`  aRec ${rec}: triangles ${e.tris} (fan ${e.fanTris}, strip ${e.stripTris}), fan centroid world ${w.map((v) => v.toFixed(3)).join(",")}`);
}
const kinds = coverage(DIR, rc);
const po = pickOrient(DIR, meta, rc, kinds, [0, 1, 2, 3, 4, 5, 6, 7]);
const own = owners(DIR, rc, po.or);
const { w: BW, h: BH } = rc.box;
for (const target of targets) {
  let px = 0, samples = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
  for (let Y = 0; Y < BH; Y++)
    for (let X = 0; X < BW; X++) {
      let s = 0;
      for (let k = 0; k < 4; k++) if (Math.floor(own[(Y * BW + X) * 4 + k] + 0.5) === target) s++;
      if (s) { px++; samples += s; x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y); }
    }
  console.log(`  target ${target} in ji ${rc.ji}'s box: ${px} px, ${samples} samples, box-x ${x0}..${x1}, box-y ${y0}..${y1} (orientation ${po.or})`);
}
