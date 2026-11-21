// K1482 s33 step 1: where s31's ungated runT (GfEval.S33 = "all") changes ink, grouped per (band chain C, over chain
// M), and each pair's tangent run: the arc of C's outline (the side the changed pixels sit on) that stays within tol
// of M's tube boundary, found around the vertex of least |gap| near the changed pixels. Units: h and px (px = this
// scan's pixel: link A's device px, or 2 aa for a K868 scene, the page's DSF 2 scale).
//   npx tsx run33.ts A <scene_gf.json> <sites_gf.json> <out.json>     (link A, device frame)
//   npx tsx run33.ts K <k868 scene name> - <out.json>                  (a bar maze, from K868/scenes)
// env GF_KRETRY=1. Prints one line per pair, longest run first.
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; } return v; };
const [, , mode, sp, sitesP, outp] = process.argv;
let T: any; let a: number, d: number, e: number, f: number; let X0: number, Y0: number, X1: number, Y1: number; let sites: any[] = [];
if (mode === "A") {
  const scene = dec(JSON.parse(readFileSync(sp, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
  T = withHome(buildTables(scene, { aa: 0.011738963274354473, kRetry: true }), true);
  const SJ = JSON.parse(readFileSync(sitesP, "utf8")); [a, , , d, e, f] = SJ.toDevA; sites = SJ.sites; [X0, Y0, X1, Y1] = [0, 0, 3200, 1800];
} else {
  const { modelOf } = await import(pathToFileURL(join(SRC, ".claude/probes/K1433/k1433_lib.ts")).href);
  const m = modelOf(sp); const sc = m.scene; const aa = 0.5 / (sc.camera.pxPerUnit * 2);
  T = withHome(buildTables(sc, { aa, kRetry: true }), true);
  a = d = 1 / (2 * aa); let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < T.vx.length; i++) { const x = T.vx[i], y = T.vy[i]; if (!(x === x) || !(y === y)) continue; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  e = -(x0 - 2 * T.h) * a; f = -(y0 - 2 * T.h) * d; X0 = 0; Y0 = 0; X1 = Math.ceil((x1 - x0 + 4 * T.h) * a); Y1 = Math.ceil((y1 - y0 + 4 * T.h) * d);
}
const h = T.h; const pxh = h * a; // px per h
// every chain gets a gate entry so "all" mode fires on every pair
const E: any = new GfEval(T); const orig = E.runT; let tMin = 1, pc = -1, pm = -1;
E.runT = function (...args: number[]): number { const t = orig.apply(this, args); if (t < tMin) { tMin = t; pc = this.rtC; pm = this.rtM; } return t; };
const ev = (x: number, y: number, on: string): number => { GfEval.S33 = on; tMin = 1; pc = -1; pm = -1; return E.eval((x + 0.5 - e) / a, (y + 0.5 - f) / d).ink; };
const Wf = X1 - X0, Hf = Y1 - Y0; const hit = new Uint8Array(Wf * Hf); const S = 3; const t0 = Date.now();
for (let y = Y0; y < Y1; y += S) for (let x = X0; x < X1; x += S) { ev(x, y, "all"); if (tMin < 1) hit[(y - Y0) * Wf + (x - X0)] = 1; }
const R = 9; const want = new Uint8Array(Wf * Hf);
for (let i = 0; i < hit.length; i++) if (hit[i]) { const y = Math.floor(i / Wf), x = i % Wf; for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < Hf && xx >= 0 && xx < Wf) want[yy * Wf + xx] = 1; } }
const pairs = new Map<string, { C: number; M: number; px: [number, number, number][] }>();
for (let i = 0; i < want.length; i++) if (want[i]) {
  const y = Math.floor(i / Wf) + Y0, x = (i % Wf) + X0; const i1 = ev(x, y, "all"); if (!(tMin < 1)) continue; const C = pc, M = pm; const i0 = ev(x, y, "0");
  if (Math.abs(i1 - i0) > 0.02) { const k = `${C}:${M}`; if (!pairs.has(k)) pairs.set(k, { C, M, px: [] }); pairs.get(k)!.px.push([x, y, i1 - i0]); }
}
// a pair's pixels may sit at several places: split into 8-connected clusters of 12 px cells
const rows: any[] = [];
for (const P of pairs.values()) {
  const cell = new Map<string, [number, number, number][]>(); const Cc = 12;
  for (const p of P.px) { const k = `${Math.floor(p[0] / Cc)},${Math.floor(p[1] / Cc)}`; if (!cell.has(k)) cell.set(k, []); cell.get(k)!.push(p); }
  const seen = new Set<string>();
  for (const k0 of cell.keys()) { if (seen.has(k0)) continue; const st = [k0]; seen.add(k0); const ps: [number, number, number][] = [];
    while (st.length) { const c = st.pop()!; ps.push(...cell.get(c)!); const [cx, cy] = c.split(",").map(Number); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const kk = `${cx + dx},${cy + dy}`; if (cell.has(kk) && !seen.has(kk)) { seen.add(kk); st.push(kk); } } }
    const mx = ps.reduce((s, p) => s + p[0], 0) / ps.length, my = ps.reduce((s, p) => s + p[1], 0) / ps.length;
    rows.push({ C: P.C, M: P.M, n: ps.length, lost: ps.filter((p) => p[2] < 0).length, x: Math.round(mx), y: Math.round(my), wx: (mx + 0.5 - e) / a, wy: (my + 0.5 - f) / d, box: [Math.min(...ps.map((p) => p[0])), Math.min(...ps.map((p) => p[1])), Math.max(...ps.map((p) => p[0])), Math.max(...ps.map((p) => p[1]))] });
  }
}
// the run: C's outline on the pixels' side against M's tube boundary
const dM = (M: number, x: number, y: number): number => { let best = Infinity; const m0 = T.cV0[M]; for (let k = 0; k + 1 < T.cNV[M]; k++) { const v = m0 + k; const ax = T.vx[v], ay = T.vy[v], dx = T.vx[v + 1] - ax, dy = T.vy[v + 1] - ay; const l2 = dx * dx + dy * dy; const u = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0; const dd = Math.sqrt((x - ax - dx * u) ** 2 + (y - ay - dy * u) ** 2); if (dd < best) best = dd; } return best; };
for (const r of rows) {
  const C = r.C, M = r.M; const v0 = T.cV0[C], N = T.cNV[C]; const closed = T.cClosed[C] === 1;
  let kb = 0, bd = Infinity; for (let k = 0; k < N; k++) { const dd = (T.vx[v0 + k] - r.wx) ** 2 + (T.vy[v0 + k] - r.wy) ** 2; if (dd < bd) { bd = dd; kb = k; } }
  const nrm = (k: number): [number, number] => { const kp = Math.max(0, k - 1), kn = Math.min(N - 1, k + 1); let tx = T.vx[v0 + kn] - T.vx[v0 + kp], ty = T.vy[v0 + kn] - T.vy[v0 + kp]; const l = Math.sqrt(tx * tx + ty * ty) || 1; return [-ty / l, tx / l]; };
  const [n0x, n0y] = nrm(kb); const s = n0x * (r.wx - T.vx[v0 + kb]) + n0y * (r.wy - T.vy[v0 + kb]) >= 0 ? 1 : -1;
  const gk = (k: number): number => { const [nx, ny] = nrm(k); return (dM(M, T.vx[v0 + k] + s * nx * h, T.vy[v0 + k] + s * ny * h) - h) / h; };
  const seg = (k: number): number => Math.sqrt((T.vx[v0 + k + 1] - T.vx[v0 + k]) ** 2 + (T.vy[v0 + k + 1] - T.vy[v0 + k]) ** 2);
  // window: vertices within 2 h of arc from kb; the seed is the least |g| there
  let wlo = kb, whi = kb, al = 0; while (wlo > 0 && al < 2 * h) { al += seg(wlo - 1); wlo--; } al = 0; while (whi < N - 1 && al < 2 * h) { al += seg(whi); whi++; }
  let ks = kb, gs = Infinity; for (let k = wlo; k <= whi; k++) { const g = Math.abs(gk(k)); if (g < gs) { gs = g; ks = k; } }
  const run = (tol: number): { len: number; lo: number; hi: number } => {
    if (!(Math.abs(gk(ks)) < tol)) return { len: 0, lo: ks, hi: ks };
    let lo = ks, hi = ks, len = 0; while (lo > 0 && Math.abs(gk(lo - 1)) < tol) { len += seg(lo - 1); lo--; } while (hi < N - 1 && Math.abs(gk(hi + 1)) < tol) { len += seg(hi); hi++; }
    return { len: len / h, lo, hi };
  };
  const r1 = run(1 / 17), r2 = run(2 / 17), r3 = run(0.25);
  // what lies past each end of the 1/17 run: the gap 0.5 h further along (in h), or "end" at the chain's end
  const past = (k: number, dir: number): string => { let al2 = 0, kk = k; while (kk + dir >= 0 && kk + dir <= N - 1 && al2 < 0.5 * h) { al2 += seg(Math.min(kk, kk + dir)); kk += dir; } return al2 < 0.5 * h && !closed ? `end@${(al2 / h).toFixed(2)}` : gk(kk).toFixed(2); };
  // slope of g over the 0.25 run (|dg/ds|, a least-squares line)
  let sx = 0, sy = 0, sxx = 0, sxy = 0, n = 0, acc = 0; for (let k = r3.lo; k <= r3.hi; k++) { const g = gk(k); sx += acc; sy += g; sxx += acc * acc; sxy += acc * g; n++; if (k < r3.hi) acc += seg(k) / h; }
  const slope = n > 2 ? Math.abs((n * sxy - sx * sy) / (n * sxx - sx * sx)) : NaN;
  // fine: C's polyline sampled every 0.02 h (segment normals), the same seed window, runs at 0.03 / 0.06 / 0.12 h
  const fs: number[] = []; const fk: number[] = []; const st = 0.02 * h;
  for (let k = wlo; k < whi; k++) { const L = seg(k); if (!(L > 0)) continue; const ux = (T.vx[v0 + k + 1] - T.vx[v0 + k]) / L, uy = (T.vy[v0 + k + 1] - T.vy[v0 + k]) / L;
    for (let u = 0; u < L; u += st) { const px = T.vx[v0 + k] + ux * u, py = T.vy[v0 + k] + uy * u; fs.push((dM(M, px - s * uy * h, py + s * ux * h) - h) / h); fk.push(k); } }
  let fi = 0, fg = Infinity; for (let i = 0; i < fs.length; i++) if (Math.abs(fs[i]) < fg) { fg = Math.abs(fs[i]); fi = i; }
  const frun = (tol: number): number => { if (!(Math.abs(fs[fi]) < tol)) return 0; let lo = fi, hi = fi; while (lo > 0 && Math.abs(fs[lo - 1]) < tol) lo--; while (hi < fs.length - 1 && Math.abs(fs[hi + 1]) < tol) hi++; return (hi - lo) * 0.02; };
  const sp0 = (seg(Math.max(0, ks - 1)) + seg(Math.min(N - 2, ks))) / 2 / h;
  // centerline to centerline: C's least distance to M within 1.5 h of arc of the seed, and over all of C (in h)
  const cw = (lo: number, hi: number): number => { let m = Infinity; for (let k = lo; k < hi; k++) { const L = seg(k); if (!(L > 0)) continue; for (let u = 0; u < L; u += st) { const px = T.vx[v0 + k] + ((T.vx[v0 + k + 1] - T.vx[v0 + k]) * u) / L, py = T.vy[v0 + k] + ((T.vy[v0 + k + 1] - T.vy[v0 + k]) * u) / L; m = Math.min(m, dM(M, px, py)); } } return m / h; };
  let clo = ks, chi = ks, al3 = 0; while (clo > 0 && al3 < 1.5 * h) { al3 += seg(clo - 1); clo--; } al3 = 0; while (chi < N - 1 && al3 < 1.5 * h) { al3 += seg(chi); chi++; }
  r.dCMnear = cw(clo, chi); r.dCMall = cw(0, N - 1);
  Object.assign(r, { kb, ks, N, s, g0: gs, run1: r1.len, run2: r2.len, run25: r3.len, lo1: r1.lo, hi1: r1.hi, pastLo: past(r1.lo, -1), pastHi: past(r1.hi, 1), slope, f03: frun(0.03), f06: frun(0.06), f12: frun(0.12), fg, sp0, fWinLo: fi, fWinN: fs.length });
  if (sites.length) { const b = sites.reduce((bb: any, q: any) => ((q.x - r.x) ** 2 + (q.y - r.y) ** 2 < (bb.x - r.x) ** 2 + (bb.y - r.y) ** 2 ? q : bb), sites[0]); r.site = `${b.site}:${r.x - b.x}:${r.y - b.y}`; } else r.site = "-";
}
rows.sort((p, q) => q.f06 - p.f06 || q.run1 - p.run1 || q.n - p.n);
console.log("FINE (0.02 h samples): site C M px(lost) | run@.03h run@.06h run@.12h (h) | px@.06h | min|g| | vertex spacing (h)");
for (const r of rows) console.log(`F ${r.site.split(":")[0]} ${r.C} ${r.M} ${r.n}(${r.lost}) | ${r.f03.toFixed(2)} ${r.f06.toFixed(2)} ${r.f12.toFixed(2)} | ${(r.f06 * pxh).toFixed(1)} | ${r.fg.toFixed(3)} | ${r.sp0.toFixed(3)} | dCM near ${r.dCMnear.toFixed(2)} all ${r.dCMall.toFixed(2)} | past ${r.pastLo} / ${r.pastHi}`);
console.log(`${mode} ${sp} h ${h.toFixed(4)} (${pxh.toFixed(1)} px) aa ${T.aa.toExponential(3)} pairs ${pairs.size} places ${rows.length} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
console.log("site C M px(lost) at | run@1/17h run@2/17h run@.25h (h) | px@1/17 | |g| seed | slope | past lo / hi (g h or end) | k seed / N");
for (const r of rows) console.log(`${r.site} ${r.C} ${r.M} ${r.n}(${r.lost}) ${r.x},${r.y} | ${r.run1.toFixed(2)} ${r.run2.toFixed(2)} ${r.run25.toFixed(2)} | ${(r.run1 * pxh).toFixed(1)} | ${r.g0.toFixed(3)} | ${r.slope.toFixed(3)} | ${r.pastLo} / ${r.pastHi} | k${r.ks}/${r.N} s${r.s}`);
writeFileSync(outp, JSON.stringify({ mode, scene: sp, sites: sitesP, h, pxh, map: [a, d, e, f], aa: T.aa, rows }));
