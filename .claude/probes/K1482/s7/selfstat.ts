import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const [tp, sp, names, Rs] = process.argv.slice(2);
const raw = JSON.parse(readFileSync(tp, "utf8")); const T: any = {};
for (const [k, v] of Object.entries<any>(raw)) { if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; T[k] = C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); } else T[k] = v; }
T.homeOn = true; const E: any = new GfEval(T); const h = T.h; const aa = T.aa;
const SJ = JSON.parse(readFileSync(sp, "utf8")); const [a, , , d, e, f] = SJ.toDevA; const R = +(Rs ?? 24);
const list = names === "all" ? SJ.sites.map((s: any) => s.site) : names.split(",");
// per pixel inked by a piece side: the own-fold segment nearest q (depth, index gap, turn between)
for (const nm of list) {
  const s = SJ.sites.find((q: any) => q.site === nm); const cx = Math.round(s.x), cy = Math.round(s.y);
  let n = 0; let best: any = null; const hist: Record<string, number> = {};
  for (let py = cy - R; py < cy + R; py++) for (let px = cx - R; px < cx + R; px++) {
    const x = (px + 0.5 - e) / a, y = (py + 0.5 - f) / d; const P = E.eval(x, y);
    if (!(P.ink >= 0.5) || P.winKind !== 1) continue;
    for (let j = 0; j < E.np; j++) {
      if (E.pc[j] !== P.winA) continue; const X = E.pd[j]; if (!(X > h - T.W - aa && X < h + aa)) continue;
      const c = E.pc[j]; const v0 = T.cV0[c]; const nseg = T.cNV[c] - 1; const closed = T.cClosed[c] === 1;
      const qx = E.pfx[j] + (h * (x - E.pfx[j])) / X, qy = E.pfy[j] + (h * (y - E.pfy[j])) / X;
      let kf = -1, df = Infinity, kb = -1, db = Infinity;
      for (let kk = E.plo[j]; kk <= E.phi[j]; kk++) {
        let k = kk; if (closed) k = ((k % nseg) + nseg) % nseg; else if (k < 0 || k >= nseg) continue;
        const v = v0 + k; const ax = T.vx[v], ay = T.vy[v], dx = T.vx[v + 1] - ax, dy = T.vy[v + 1] - ay; const l2 = dx * dx + dy * dy;
        const dist = (X0: number, Y0: number) => { const u = l2 > 0 ? Math.min(1, Math.max(0, ((X0 - ax) * dx + (Y0 - ay) * dy) / l2)) : 0; return Math.hypot(X0 - ax - dx * u, Y0 - ay - dy * u); };
        const dp = dist(x, y); if (dp < df) { df = dp; kf = kk; }
        const dq = dist(qx, qy); if (dq < db) { db = dq; kb = kk; }
      }
      const depth = h - db; if (!(depth > 2 * aa)) continue;
      // turn from segment kf to kb (sum of signed vertex turns)
      let turn = 0; const lo = Math.min(kf, kb), hi = Math.max(kf, kb);
      for (let kk = lo + 1; kk <= hi; kk++) { const k = closed ? ((kk % nseg) + nseg) % nseg : kk; const km = closed ? (((kk - 1) % nseg) + nseg) % nseg : kk - 1;
        const v = v0 + k, w = v0 + km; const a1 = Math.atan2(T.vy[w + 1] - T.vy[w], T.vx[w + 1] - T.vx[w]), a2 = Math.atan2(T.vy[v + 1] - T.vy[v], T.vx[v + 1] - T.vx[v]);
        let t = a2 - a1; while (t > Math.PI) t -= 2 * Math.PI; while (t < -Math.PI) t += 2 * Math.PI; turn += t; }
      n++; const g = Math.abs(kb - kf); const key = `gap${Math.min(g, 9)} turn${Math.round(Math.abs(turn) * 180 / Math.PI / 15) * 15}`;
      hist[key] = (hist[key] ?? 0) + 1;
      if (!best || depth > best.depth) best = { depth: +depth.toFixed(3), gap: g, turn: +(turn * 180 / Math.PI).toFixed(0), px, py };
    }
  }
  if (n) console.log(nm, n, JSON.stringify(best), JSON.stringify(hist));
}
