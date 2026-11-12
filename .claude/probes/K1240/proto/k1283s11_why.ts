// K1283 s11: where the outline inks darker than form B in a crop, which outline piece's band is it, and
// what does form B do there (its term, fade bits, the ink it gives)?
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1283_vite.config.mjs .claude/probes/K1240/proto/k1283s11_why.ts <scene>:<x>:<y> [--ppu=280] [--w=1.6] [--thr=0.3] [--pts]
// Per piece (the nearest band polyline within W + 0.02 of each excess pixel): pixel count, summed excess,
// form B's mean ink there, fade-bit counts (fold 1, cap 2, tie 4, omega 8, merge 16), form B term kinds
// (foot 1, TA 2, TB 3, V 4, arc 5), and the piece (kind, chain, side, s0, s1, corner, tied, alpha min).
// --pts also prints up to 8 sample pixels per piece (world x, y, outline ink, form B ink, fade, term).
import { FormB } from "../../../../src/render/field/form_b";
import * as O from "./outline";
import * as D from "./draw";
import { loadScene, rScene, rasterR } from "./k1279_census";

const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith("--"));
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const ppu = Number(opt("ppu") ?? 280); const Wd = Number(opt("w") ?? 1.6); const thr = Number(opt("thr") ?? 0.3);
const P = Math.round(Wd * ppu);
const cache = new Map<string, { fb: FormB; t: O.OutlineTable; y: ReturnType<typeof rScene>; zz: ReturnType<typeof D.zChains> }>();
for (const spec of pos) {
  const [nm, xs, ys] = spec.split(":"); const cx = +xs; const cy = +ys;
  let e = cache.get(nm);
  if (!e) {
    const scene = loadScene(nm);
    const fb = new FormB(JSON.parse(JSON.stringify(scene)) as never, { dpr: 2 });
    const st = O.structure(scene); const t = O.frame(st, scene);
    const zz = D.zChains(scene as never);
    e = { fb, t, y: rScene(t, scene, D), zz }; cache.set(nm, e);
  }
  const { fb, t, zz } = e;
  const c0 = cx * ppu - P / 2; const r0 = cy * ppu - P / 2;
  const ry = rasterR(e.y, c0, r0, P, ppu);
  const W = t.W;
  // Nearest piece by distance to its band's outer polyline (the band spans [0, W] inward).
  const segD = (px: number, py: number, ax: number, ay: number, bx: number, by: number): number => {
    const ex = bx - ax; const ey = by - ay; const l2 = ex * ex + ey * ey;
    const u = l2 > 0 ? Math.min(1, Math.max(0, ((px - ax) * ex + (py - ay) * ey) / l2)) : 0;
    return Math.hypot(px - ax - u * ex, py - ay - u * ey);
  };
  const x0 = cx - Wd / 2 - 0.2; const x1 = cx + Wd / 2 + 0.2; const y0 = cy - Wd / 2 - 0.2; const y1 = cy + Wd / 2 + 0.2;
  const near: number[] = [];
  t.pieces.forEach((p, i) => { for (let k = 0; k < p.pts.length; k += 2) if (p.pts[k] > x0 && p.pts[k] < x1 && p.pts[k + 1] > y0 && p.pts[k + 1] < y1) { near.push(i); return; } });
  type G = { n: number; ex: number; fbI: number; fade: number[]; term: number[]; smp: string[] };
  const grp = new Map<number, G>();
  for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
    const i = r * P + c; const x = (c0 + c + 0.5) / ppu; const y = (r0 + r + 0.5) / ppu;
    const ev = fb.evalPoint(x, y); const bI = Math.min(1, Math.max(0, ev.ink));
    const d = ry.ink[i] - bI; if (!(d > thr)) continue;
    let best = Infinity; let bp = -1;
    for (const pi of near) { const p = t.pieces[pi]; for (let k = 0; k + 3 < p.pts.length; k += 2) { const dd = segD(x, y, p.pts[k], p.pts[k + 1], p.pts[k + 2], p.pts[k + 3]); if (dd < best) { best = dd; bp = pi; } } }
    if (best > W + 0.02) bp = -1;
    let g = grp.get(bp); if (!g) { g = { n: 0, ex: 0, fbI: 0, fade: [0, 0, 0, 0, 0], term: [0, 0, 0, 0, 0, 0], smp: [] }; grp.set(bp, g); }
    g.n++; g.ex += d; g.fbI += bI;
    for (let b = 0; b < 5; b++) if (ev.fade & (1 << b)) g.fade[b]++;
    g.term[ev.term ? ev.term.kind : 0]++;
    if (args.includes("--pts") && g.n % 7 === 1 && g.smp.length < 8) g.smp.push(`(${x.toFixed(3)}, ${y.toFixed(3)}) out ${ry.ink[i].toFixed(2)} fb ${bI.toFixed(2)} fade ${ev.fade} term ${ev.term ? `${ev.term.kind} ch${ev.term.chain} s${ev.term.s.toFixed(2)} w${ev.term.w.toFixed(2)} D${ev.term.D.toFixed(3)} c${ev.term.corner}` : "-"}`);
  }
  console.log(`${spec}: W ${W.toFixed(3)} h ${t.h.toFixed(3)}`);
  for (const [pi, g] of [...grp.entries()].sort((a, b) => b[1].ex - a[1].ex)) {
    const p = pi >= 0 ? t.pieces[pi] : null;
    const tied = p && (p.kind === "run" || p.kind === "ghost") && p.chain >= 0 && zz.passes[p.chain]?.length > 0;
    const am = p?.alpha ? Math.min(...p.alpha).toFixed(2) : "-";
    console.log(`  piece ${pi} ${p ? `${p.kind} ch${p.chain} side ${p.side} s ${p.s0.toFixed(2)}..${p.s1.toFixed(2)} corner ${p.corner} tied ${tied} alphaMin ${am}` : "(none)"}: ${g.n} px, excess ${g.ex.toFixed(0)}, fb mean ${(g.fbI / g.n).toFixed(2)}, fade fold/cap/tie/omega/merge ${g.fade.join("/")}, terms none/foot/TA/TB/V/arc ${g.term.join("/")}`);
    for (const s of g.smp) console.log(`    ${s}`);
  }
}
