// K1283 s6: a round end (DiskItem) and its fan, as a character map. For the junction nearest (x, y):
// its arms, the fan ring's points (polar about J.c in units of h, slot weights), and a grid over
// [-1.3h, 1.3h]^2 marking the top item per point: J fan, D disk, T tail (this fan's), S strip, C cap,
// . paper; lower case where that point's paint steps (vs its right neighbour) by over 1/255.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1283s6_disk.ts <scene> <x> <y> [--n=53]
import * as O from "../../../../src/render/outline/outline";
import * as F from "../../../../src/render/outline/fill_tri";
import * as D from "../../../../src/render/outline/draw";
import { sectionPaint, paintAt } from "../../../../src/render/outline/paint";
import { loadScene } from "./k1279_census";

const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith("--"));
const nm = pos[0]; const qx = Number(pos[1]); const qy = Number(pos[2]);
const N = Number(args.find((a) => a.startsWith("--n="))?.slice(4) ?? 53);
const scene = loadScene(nm); const st = O.structure(scene); const table = O.frame(st, scene);
const fs = F.fillStructure(st, F.fillResolution(st, table)); const fr = F.fillFrame(fs, st, table, scene);
const sp = sectionPaint(scene, "app", D.baseHueFor(nm)); const runs = F.fillRuns(fs, st, fr, sp);
const h = table.h;
let bj = -1; let bd = Infinity;
scene.junctions.forEach((J, ji) => { const d = Math.hypot(J.c[0] - qx, J.c[1] - qy); if (d < bd) { bd = d; bj = ji; } });
const J = scene.junctions[bj];
const jIt = fs.items.findIndex((it) => it.kind === "junc" && it.ji === bj);
const ju = fs.items[jIt] as F.JuncItem;
console.log(`${nm} j${bj} c (${J.c[0].toFixed(3)}, ${J.c[1].toFixed(3)}) h ${h.toFixed(3)} item ${jIt} arms ${ju.arms.map((a, k) => `${k}:ai${a.ai} ch${a.pi} ${st.arms[a.ai].kind}`).join(", ")}`);
const P = fr.pos; const W4 = fr.w4; const S4 = fr.s4;
const pol = (v: number): string => { const dx = P[2 * v] - J.c[0]; const dy = P[2 * v + 1] - J.c[1]; return `${(Math.hypot(dx, dy) / h).toFixed(2)}@${Math.round((Math.atan2(dy, dx) * 180) / Math.PI)}`; };
const wv = (v: number): string => `[${[0, 1, 2, 3].map((k) => W4[4 * v + k].toFixed(2)).join(",")}]`;
const sv = (v: number): string => `[${[0, 1, 2, 3].map((k) => S4[4 * v + k].toFixed(2)).join(",")}]`;
console.log(`hub ${pol(ju.base)} w ${wv(ju.base)} s ${sv(ju.base)}`);
for (let i = 1; i <= ju.R; i++) { const v = ju.base + i; if ((i - 1) % 19 < 3 || (i - 1) % 19 === 10) console.log(`  ring ${i - 1} ${pol(v)} w ${wv(v)} s ${sv(v)} key ${fr.key[v].toFixed(3)}`); }
const disks = fs.items.map((it, q) => ({ it, q })).filter((e) => e.it.kind === "disk" && (e.it as F.DiskItem).jItem === jIt);
for (const { it, q } of disks) {
  const d = it as F.DiskItem;
  console.log(`disk item ${q} ch${d.pi} ai${d.ai} arm ${d.arm} base ${d.base} hub key ${fr.key[d.base].toFixed(3)}`);
  const nV = F.itemVerts(d);
  for (let v = d.base; v < d.base + nV; v += Math.max(1, Math.floor(nV / 12))) console.log(`  v${v - d.base} ${pol(v)} w ${wv(v)} s ${sv(v)} key ${fr.key[v].toFixed(3)}`);
}
// Item of each vertex.
const itemOf = new Int32Array(fs.nV).fill(-1);
fs.items.forEach((it, q) => { for (let v = it.base; v < it.base + F.itemVerts(it); v++) itemOf[v] = q; });
const I = fs.idx; const K = fr.key;
const x0 = J.c[0] - 1.3 * h; const y0 = J.c[1] - 1.3 * h; const st0 = (2.6 * h) / (N - 1);
const tris: number[] = [];
for (let t = 0; t < I.length; t += 3) {
  let ok = true; let near = false;
  for (let e = 0; e < 3; e++) { const v = I[t + e]; if (!(K[v] > -999)) ok = false; if (Math.abs(P[2 * v] - J.c[0]) < 4 * h && Math.abs(P[2 * v + 1] - J.c[1]) < 4 * h) near = true; }
  if (ok && near) tris.push(t);
}
const top = (px: number, py: number): { t: number; b: number[] } => {
  let best = -1; let bk = -Infinity; let bb = [0, 0, 0];
  for (const t of tris) {
    const a = I[t]; const b = I[t + 1]; const c = I[t + 2];
    const ax = P[2 * a]; const ay = P[2 * a + 1]; const bx = P[2 * b]; const by = P[2 * b + 1]; const cx = P[2 * c]; const cy = P[2 * c + 1];
    const dd = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay); if (Math.abs(dd) < 1e-14) continue;
    const w1 = ((px - ax) * (cy - ay) - (cx - ax) * (py - ay)) / dd; const w2 = ((bx - ax) * (py - ay) - (px - ax) * (by - ay)) / dd; const w0 = 1 - w1 - w2;
    if (w0 < -1e-9 || w1 < -1e-9 || w2 < -1e-9) continue;
    const k = w0 * K[a] + w1 * K[b] + w2 * K[c];
    if (k > bk || (k === bk && t > best)) { bk = k; best = t; bb = [w0, w1, w2]; }
  }
  return { t: best, b: bb };
};
const r4 = new Int32Array(4); const w4 = new Float64Array(4); const s4 = new Float64Array(4);
const colour = (t: number, b: number[]): number[] => {
  F.vertexPaint(fs, fr, runs, [I[t], I[t + 1], I[t + 2]], b, r4, w4, s4);
  return paintAt(sp, r4, w4, s4);
};
const ch = (t: number): string => {
  if (t < 0) return ".";
  const q = itemOf[I[t]]; const it = fs.items[q];
  if (q === jIt) return "J";
  if (it.kind === "disk") return (it as F.DiskItem).jItem === jIt ? "D" : "d";
  if (it.kind === "tail") return (it as F.TailItem).jItem === jIt ? "T" : "t";
  if (it.kind === "strip") return "S"; if (it.kind === "cap") return "C"; if (it.kind === "junc") return "K";
  return "?";
};
const rows: string[] = [];
for (let j = N - 1; j >= 0; j--) {
  let line = ""; let prev: number[] | null = null; let prevT = -2;
  for (let i = 0; i < N; i++) {
    const px = x0 + i * st0; const py = y0 + j * st0; const tp = top(px, py);
    let c = ch(tp.t);
    if (tp.t >= 0) {
      const col = colour(tp.t, tp.b);
      if (prev && prevT >= 0 && itemOf[I[prevT]] !== itemOf[I[tp.t]]) { const dmax = 255 * Math.max(...[0, 1, 2].map((k) => Math.abs(col[k] - prev![k]))); if (dmax > 1.5) c = c.toLowerCase() === c ? "*" : c.toLowerCase(); }
      prev = col;
    } else prev = null;
    prevT = tp.t; line += c;
  }
  rows.push(line);
}
console.log(rows.join("\n"));

// --line=x0:y0:x1:y1:n  prints, along the segment, the top item and its interpolated slots and colour.
const la = args.find((a) => a.startsWith("--line="));
if (la) {
  const [lx0, ly0, lx1, ly1, ln] = la.slice(7).split(":").map(Number);
  for (let k = 0; k <= ln; k++) {
    const px = lx0 + ((lx1 - lx0) * k) / ln; const py = ly0 + ((ly1 - ly0) * k) / ln; const tp = top(px, py);
    if (tp.t < 0) { console.log(`${px.toFixed(4)} ${py.toFixed(4)} paper`); continue; }
    F.vertexPaint(fs, fr, runs, [I[tp.t], I[tp.t + 1], I[tp.t + 2]], tp.b, r4, w4, s4);
    const col = paintAt(sp, r4, w4, s4).map((c) => Math.round(255 * c));
    const vs = [I[tp.t], I[tp.t + 1], I[tp.t + 2]].map((v) => `v${v - fs.items[itemOf[v]].base}${pol(v)}`).join(" ");
    console.log(`${px.toFixed(4)} ${py.toFixed(4)} ${ch(tp.t)} it${itemOf[I[tp.t]]} r[${[...r4].join(",")}] w[${[...w4].map((x) => x.toFixed(2)).join(",")}] s[${[...s4].map((x) => x.toFixed(3)).join(",")}] col ${col.join(",")} ${vs}`);
  }
}
