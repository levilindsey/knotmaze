// K1247 s13: what covers a through pass's span on one chain: the junction of
// two arms, its scene arms, and the faces/regions holding sample points
// along the chain between two cS values.
// Usage: node scripts/run_node.mjs <this> <scene> <arm1> <arm2> [cs0 cs1]
import { structure, frame, debugCache } from "./outline";
import { load } from "./k1247s5_scenes";
import { writeFileSync } from "fs";
const [nm, a1S, a2S, c0S, c1S] = process.argv.slice(2);
const sc = load(nm);
const st = structure(sc) as any;
const T = frame(st, sc) as any;
const C = debugCache(st) as any;
const arms = [+a1S, +a2S];
for (const ai of arms) {
  const a = st.arms[ai];
  console.log(`arm${ai}: ${JSON.stringify(a)} scene ${JSON.stringify(sc.junctions[a.ji]?.arms[a.ei])}`);
}
const ji = st.arms[arms[0]].ji; const J = sc.junctions[ji];
console.log(`junction ${ji} id=${J.id} c=${J.c} arms:`);
J.arms.forEach((x: any, ei: number) => { const ai = st.arms.findIndex((q: any) => q.ji === ji && q.ei === ei); console.log(`  e${ei} arm${ai} chain${x.chain} s=${x.s.toFixed(4)} dir${x.dir} ${x.kind}`); });
const pi = st.arms[arms[0]].pi;
const p = sc.chains[pi];
// chain point at cS (approx: polyline arc length from first sample)
const pts = p.pts; const segs: number[] = [0];
for (let i = 0; i + 3 < pts.length; i += 2) segs.push(segs[segs.length - 1] + Math.hypot(pts[i + 2] - pts[i], pts[i + 3] - pts[i + 1]));
const at = (s: number): [number, number] => { for (let k = 0; k + 1 < segs.length; k++) if (s <= segs[k + 1]) { const t = (s - segs[k]) / Math.max(1e-12, segs[k + 1] - segs[k]); return [pts[2 * k] + t * (pts[2 * k + 2] - pts[2 * k]), pts[2 * k + 1] + t * (pts[2 * k + 3] - pts[2 * k + 1])]; } return [pts[pts.length - 2], pts[pts.length - 1]]; };
const inPoly = (q: number[], x: number, y: number): boolean => { let c = false; const n = q.length / 2; for (let i = 0, j = n - 1; i < n; j = i++) { const xi = q[2 * i]; const yi = q[2 * i + 1]; const xj = q[2 * j]; const yj = q[2 * j + 1]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const c0 = c0S ? +c0S : 1.4; const c1 = c1S ? +c1S : 2.0;
for (let s = c0; s <= c1 + 1e-9; s += (c1 - c0) / 8) {
  const [x, y] = at(s);
  const fs = T.faces.map((f: any, i: number) => ({ f, i })).filter((q: any) => inPoly(q.f.pts, x, y)).map((q: any) => `f${q.i}(own${q.f.ownerChain} g${q.f.group}${q.f.hole ? " hole" : ""})`);
  const rs = T.regions.filter((r: any) => inPoly(r.pts, x, y)).map((r: any) => `r${r.id}(own${r.ownerChain} g${r.group}${r.hole ? " hole" : ""})`);
  console.log(`s=${s.toFixed(3)} (${x.toFixed(3)},${y.toFixed(3)}): faces ${fs.join(" ") || "-"} | regions ${rs.join(" ") || "-"}`);
}
// regions owned by the junction (ownerChain < 0?) near the centre
const near = T.regions.filter((r: any) => { for (let i = 0; i + 1 < r.pts.length; i += 2) if (Math.hypot(r.pts[i] - J.c[0], r.pts[i + 1] - J.c[1]) < 1.2) return true; return false; });
console.log("regions near the junction centre:");
for (const r of near) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (let i = 0; i + 1 < r.pts.length; i += 2) { x0 = Math.min(x0, r.pts[i]); x1 = Math.max(x1, r.pts[i]); y0 = Math.min(y0, r.pts[i + 1]); y1 = Math.max(y1, r.pts[i + 1]); }
  console.log(`  r${r.id} own${r.ownerChain} g${r.group} n${r.pts.length / 2} pieces[${r.pieces.join(",")}] bbox ${x0.toFixed(2)},${y0.toFixed(2)}..${x1.toFixed(2)},${y1.toFixed(2)}${r.hole ? " hole" : ""}`);
}
void C;
// Grid mode (env HOLE_GRID=x0,y0,x1,y1): faces (non-hole, owned) covering
// each grid point; prints the points' cover as region ids, so two runs
// (K12_CSORDER=1 and not) can be diffed by the caller.
const G = (process.env.HOLE_GRID ?? "").split(",").map(Number);
if (G.length === 4) {
  const step = 0.025; const outL: string[] = [];
  for (let y = G[1]; y <= G[3]; y += step) for (let x = G[0]; x <= G[2]; x += step) {
    const fs = T.faces.filter((q: any) => !q.hole && q.ownerChain >= 0 && inPoly(q.pts, x, y));
    const rs = T.regions.filter((r: any) => !r.hole && inPoly(r.pts, x, y)).map((r: any) => r.id);
    outL.push(`${x.toFixed(3)},${y.toFixed(3)} ${fs.length ? 1 : 0} ${rs.join("/")}`);
  }
  writeFileSync(process.env.HOLE_OUT ?? "hole_grid.txt", outL.join("\n"));
}
// Band mode (env HOLE_BAND=<grid file of diff points "x,y" per line>): for
// each point, the nearest chain centreline, its distance and s, against h.
if (process.env.HOLE_BAND) {
  const lines = (await import("fs")).readFileSync(process.env.HOLE_BAND, "utf8").split(/\r?\n/).filter(Boolean);
  const h = T.h; const hist = new Map<string, number>();
  for (const l of lines) {
    const [x, y] = l.split(",").map(Number);
    let best = Infinity; let bc = -1; let bs = 0;
    for (const ch of sc.chains) {
      const q = ch.pts; let acc = 0;
      const n = q.length / 2; const segN = ch.closed ? n : n - 1;
      for (let i = 0; i < segN; i++) {
        const j = (i + 1) % n; const ax = q[2 * i]; const ay = q[2 * i + 1]; const bx = q[2 * j]; const by = q[2 * j + 1];
        const dx = bx - ax; const dy = by - ay; const L2 = dx * dx + dy * dy; const L = Math.sqrt(L2);
        const t = L2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)) : 0;
        const d = Math.hypot(ax + t * dx - x, ay + t * dy - y);
        if (d < best) { best = d; bc = ch.id; bs = acc + t * L; }
        acc += L;
      }
    }
    const k = `chain${bc} ${best <= h ? "inBand" : "outside"} s~${(Math.round(bs * 4) / 4).toFixed(2)}`;
    hist.set(k, (hist.get(k) ?? 0) + 1);
  }
  console.log(`h=${h}`);
  [...hist.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${v} ${k}`));
}
// Form B mode (env HOLE_FB=<points file>): how many points form B covers.
if (process.env.HOLE_FB) {
  const { FormB } = await import("../../../../src/render/field/form_b");
  const fb = new FormB(sc as never, { dpr: 2 }) as any;
  const lines = (await import("fs")).readFileSync(process.env.HOLE_FB, "utf8").split(/\r?\n/).filter(Boolean);
  let cov = 0; const tops = new Map<number, number>();
  for (const l of lines) { const [x, y] = l.split(",").map(Number); const ev = fb.evalPoint(x, y); if (ev.top >= 0) { cov++; tops.set(ev.top, (tops.get(ev.top) ?? 0) + 1); } }
  console.log(`form B covers ${cov} of ${lines.length} points; tops ${[...tops.entries()].map(([k, v]) => k + ":" + v).join(" ")}`);
}
