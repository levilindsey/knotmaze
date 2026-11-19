// K1482 s8: which gap window cuts where. Rebuilds GfGapTable from the page's dump (cap.mjs DUMPGW=1) and, for the
// pixels that the gap removes near a site (ink in the nogap frame, none in master's), names the chains there, the
// crossing whose window wins on each (its over / under chain, window ends, kept fraction) and today's windows on it.
//   python removed.py <sites.json> <master.png> <nogap.png> <sites> <removed.json>
//   node scripts/run_node.mjs gwprobe.ts <gw_gf.json> <gw_today.json> <sites.json> <removed.json>
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const [, , gp, tp, sp, rp] = process.argv;
const SRC = resolve(import.meta.dirname, "../../../..");
const L = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_look.ts")).href);
const PM = await import(pathToFileURL(join(SRC, "src/render/paint_math.ts")).href);
const dec = (v: any): any => {
  if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; return C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); }
  if (v && typeof v === "object" && v.__m) return new Map(v.__m.map(([k, x]: any) => [k, dec(x)]));
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === "object") { const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; }
  return v === "Inf" ? Infinity : v === "-Inf" ? -Infinity : v === "NaN" ? NaN : v;
};
const G = dec(JSON.parse(readFileSync(gp, "utf8"))); const T = dec(JSON.parse(readFileSync(tp, "utf8")));
const fillHalf = G.style.threadWidth / 2;
const src = {
  kd: G.kd, kcv: G.kcv, chainSamples: G.chainSamples, crossings: G.crossings, fillHalf,
  margin: L.lookGap(G), fade: L.lookFade(G), joints: G.junctionArcCtrls,
  jointClear: L.gfJointClear(fillHalf, G.FILLET_REACH_PER_HALF, G.cuspRadius, L.lookGap(G)),
};
const tab = new L.GfGapTable(); tab.wins = []; tab.values(src);
const D = G.kd, Gm = D.geom;
const geo = (ch: number) => { const c = G.kcv[ch]; return { closed: c.closed, total: Gm[c.geom * 4], arcPer: Gm[c.geom * 4 + 1] }; };
type W = { i: number; o: number; u: number; uC: number; wn: number; wp: number; cn: number; cp: number };
const wins: W[] = [];
for (let k = 0; k < tab.wins.length; k += 5) {
  const i = tab.wins[k], x = G.crossings[i];
  wins.push({ i, o: x.overChain, u: x.underChain, uC: PM.kArcOfCtrl(D, G.kcv[x.underChain], x.underCtrl), wn: tab.wins[k + 1], wp: tab.wins[k + 2], cn: tab.wins[k + 3], cp: tab.wins[k + 4] });
}
console.log(`h ${fillHalf.toFixed(3)} margin ${src.margin.toFixed(3)} fade ${src.fade.toFixed(3)} jointClear ${src.jointClear.toFixed(3)} crossings ${G.crossings.length} windows ${wins.length}`);
const off = (ch: number, a: number, c: number) => { const g = geo(ch); let d = a - c; if (g.closed) { d = ((d % g.total) + g.total) % g.total; if (d > g.total / 2) d -= g.total; } return d; };
const S = JSON.parse(readFileSync(sp, "utf8")); const A = S.toDevA; const det = A[0] * A[3] - A[1] * A[2];
const toW = (x: number, y: number) => { const X = x - A[4], Y = y - A[5]; return [(A[3] * X - A[2] * Y) / det, (-A[1] * X + A[0] * Y) / det]; };
const RM = JSON.parse(readFileSync(rp, "utf8"));
for (const nm of Object.keys(RM)) {
  const [cx, cy] = RM[nm].c;
  // the removed ink: nogap ink with no master ink within 1 px
  const groups = new Map<string, { n: number; sx: number; sy: number; info: string }>();
  for (const [x, y] of RM[nm].px as [number, number][]) {
    const [wx, wy] = toW(x, y);
    // chains whose centreline lies within h + 0.02 of the pixel (its label candidates), nearest sample
    const hits: string[] = []; let key = "";
    for (let ch = 0; ch < G.chainSamples.length; ch++) {
      const sm = G.chainSamples[ch]; if (!sm) continue; const P = sm.positions; let bd = Infinity, bk = -1;
      for (let k = 0; k < sm.count; k++) { const d = Math.hypot(P[2 * k] - wx, P[2 * k + 1] - wy); if (d < bd) { bd = d; bk = k; } }
      if (bd > fillHalf + 0.02) continue;
      const a = bk * geo(ch).arcPer;
      let best: W | null = null, bv = -Infinity;
      for (const w of wins) { if (w.u !== ch) continue; const o = off(ch, a, w.uC); const v = (o >= 0 ? w.wp : w.wn) - Math.abs(o); if (v > bv) { bv = v; best = w; } }
      const tw: string[] = [];
      const uw = T.underWindows?.get?.(ch); if (uw) for (let q = 0; q < uw.length; q += 3) { const o = off(ch, a, uw[q]); if (Math.abs(o) < 1.5) tw.push(`c${uw[q].toFixed(2)}[-${uw[q + 1].toFixed(2)},+${uw[q + 2].toFixed(2)}]`); }
      const cc = T.chainCuts?.get?.(ch); const tc: string[] = []; if (cc) for (let q = 0; q < cc.length; q += 4) { const o = off(ch, a, cc[q + 1]); if (Math.abs(o) < 1.5) tc.push(`s${cc[q]}@${cc[q + 1].toFixed(2)}[-${cc[q + 2].toFixed(2)},+${cc[q + 3].toFixed(2)}]`); }
      const wtxt = best && bv > -0.3 ? `win x${best.i} over ${best.o} at ${best.uC.toFixed(2)} [-${best.wn.toFixed(2)},+${best.wp.toFixed(2)}] caps ${best.cn.toFixed(2)}/${best.cp.toFixed(2)} winM ${bv.toFixed(2)} off ${off(ch, a, best.uC).toFixed(2)}` : "no win";
      hits.push(`ch${ch} d${bd.toFixed(2)} s${a.toFixed(2)} ${wtxt} | today uw ${tw.join(" ") || "-"} cuts ${tc.join(" ") || "-"}`);
      if (best && bv > -0.3) key += `ch${ch}:x${best.i} `;
    }
    const k = key || "none"; const g = groups.get(k) ?? { n: 0, sx: 0, sy: 0, info: hits.join("\n      ") };
    g.n++; g.sx += x - cx; g.sy += y - cy; groups.set(k, g);
  }
  console.log(`== ${nm} (${cx},${cy})`);
  for (const [k, g] of [...groups.entries()].sort((a, b) => b[1].n - a[1].n)) console.log(`  ${g.n} px at (${(g.sx / g.n).toFixed(0)},${(g.sy / g.n).toFixed(0)}) [${k.trim()}]\n      ${g.info}`);
}
// OVERLAY=<out.json>: per site, every chain's centreline (device px) inside the box, the crossings (under point,
// over/under chains, window ends) and the fused joints, for overlay.py
if (process.env.OVERLAY) {
  const { writeFileSync } = await import("node:fs");
  const toD = (x: number, y: number) => [A[0] * x + A[2] * y + A[4], A[1] * x + A[3] * y + A[5]];
  const ptAt = (ch: number, a: number) => { const sm = G.chainSamples[ch]; const g = geo(ch); const fi = Math.max(0, Math.min(sm.count - 1, a / g.arcPer)); const i0 = Math.floor(fi), i1 = Math.min(i0 + 1, sm.count - 1), u = fi - i0; const P = sm.positions; return toD(P[2 * i0] * (1 - u) + P[2 * i1] * u, P[2 * i0 + 1] * (1 - u) + P[2 * i1 + 1] * u); };
  const box = 48; const out: any = {};
  for (const nm of Object.keys(RM)) {
    const [cx, cy] = RM[nm].c; const inB = (p: number[]) => Math.abs(p[0] - cx) < box && Math.abs(p[1] - cy) < box;
    const lines: any[] = [];
    for (let ch = 0; ch < G.chainSamples.length; ch++) { const sm = G.chainSamples[ch]; if (!sm) continue; let cur: number[][] = []; for (let k = 0; k < sm.count; k++) { const p = toD(sm.positions[2 * k], sm.positions[2 * k + 1]); if (inB(p)) cur.push([p[0], p[1], k * geo(ch).arcPer]); else if (cur.length) { lines.push({ ch, pts: cur }); cur = []; } } if (cur.length) lines.push({ ch, pts: cur }); }
    const xs: any[] = [];
    for (const w of wins) { const p = ptAt(w.u, w.uC); if (!inB(p)) continue; xs.push({ i: w.i, o: w.o, u: w.u, p, a: ptAt(w.u, w.uC - w.wn), b: ptAt(w.u, w.uC + w.wp) }); }
    const js: any[] = [];
    if (G.junctionArcCtrls) for (const [ch, l] of G.junctionArcCtrls as Map<number, { ctrl: number }[]>) for (const jc of l) { const p = ptAt(ch, PM.kArcOfCtrl(D, G.kcv[ch], jc.ctrl)); if (inB(p)) js.push({ ch, p }); }
    out[nm] = { c: [cx, cy], lines, xs, js };
  }
  writeFileSync(process.env.OVERLAY, JSON.stringify(out));
}
