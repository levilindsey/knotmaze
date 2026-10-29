// K1040 S1b, step 2: trace one junction hole (F12). Prints the group's
// junctions, arms and corners, then the pieces, surfaces and coverages at the
// site, and an ASCII map of the top surface around it.
// Run: npx vite-node .claude/probes/K1040/s1/b_hole.ts [scene] [x] [y] [dpr] [half]
import { readFileSync } from "node:fs";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB, OWN, TERM_NAMES, type Piece } from "../../../../src/render/field/form_b";
import { candidates, type Cand } from "../../../../src/render/field/geom";

const [name = "muse_hash", xs = "26.675", ys = "1.096", ds = "2", hs = "0.5"] = process.argv.slice(2);
const s = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
s.look.ctrlArc ??= 0.47;
const fb = new FormB(s, { dpr: Number(ds) });
const X = Number(xs);
const Y = Number(ys);
const half = Number(hs);
const f3 = (v: number) => (Number.isFinite(v) ? v.toFixed(3) : String(v));
console.log(`${name} dpr ${ds}: h ${f3(fb.h)} W ${f3(fb.W)} aa ${fb.aa.toFixed(4)} sigma ${f3(fb.sigma)} ppuDev ${f3(fb.ppuDev)}`);
const r0 = fb.evalPoint(X, Y);
const top = (t: number) => (t < 0 ? "paper" : t >= OWN ? `own${t - OWN}` : `g${t}`);
console.log(`at (${X}, ${Y}): ink ${f3(r0.ink)} top ${top(r0.top)} term ${r0.term ? TERM_NAMES[r0.term.kind] : "none"} fade ${r0.fade} nSurf ${r0.nSurf}`);
// The groups near the site.
const groups = new Set<number>();
for (const ci of fb.cornersNear(X, Y)) groups.add(fb.corners[ci].g);
const P: Piece[] = [];
fb.pieces(X, Y, P);
for (const p of P) if (p.g >= 0) groups.add(p.g);
for (const g of groups) {
  console.log(`-- group ${g}`);
  fb.groupOf.forEach((gg, ji) => {
    if (gg !== g) return;
    const j = s.junctions[ji];
    console.log(` junction ${ji} id ${j.id} c (${f3(j.c[0])}, ${f3(j.c[1])}) arms ${j.arms.length}`);
  });
  fb.arms.forEach((a, ai) => {
    if (a.g !== g) return;
    console.log(`  arm ${ai}: j ${a.j} chain ${a.pi} ${a.kind} dir ${a.dir} sR ${f3(a.sR)} L ${f3(a.L)} Lcut ${f3(a.Lcut)} ang ${((a.ang * 180) / Math.PI).toFixed(1)}`);
  });
  fb.corners.forEach((c, ci) => {
    if (c.g !== g) return;
    console.log(
      `  corner ${ci}: arms ${c.a},${c.b} th ${((c.theta * 180) / Math.PI).toFixed(1)} r0 ${f3(c.r0)} r1 ${f3(c.r1)} r ${f3(c.r)} room ${f3(c.room)} V (${f3(c.Vx)}, ${f3(c.Vy)}) q (${f3(c.qx)}, ${f3(c.qy)}) rV ${f3(c.rV)} ta (${f3(c.tax)}, ${f3(c.tay)}) tb (${f3(c.tbx)}, ${f3(c.tby)}) dVa ${f3(c.dVa)} dVb ${f3(c.dVb)} dA ${f3(c.dA)} dB ${f3(c.dB)} om ${f3(c.omega)} ov ${f3(c.ov)}`,
    );
  });
}
// The candidates and pieces at the site.
const cb: Cand[] = [];
candidates(fb.grid, X, Y, fb.h + fb.W + 2 * fb.aa, cb);
console.log(`candidates within h+W+2aa:`);
for (const c of cb.sort((u, v) => u.d - v.d)) console.log(`  chain ${c.chain} s ${f3(c.s)} d/h ${(c.d / fb.h).toFixed(3)}`);
console.log(`pieces:`);
for (const p of P) console.log(`  #${p.idx} chain ${p.chain} s ${f3(p.s)} d/h ${(p.d / fb.h).toFixed(3)} z ${f3(p.z)} g ${p.g} surf ${top(p.surf)} ramp ${f3(p.ramp)} selfW ${f3(p.selfW)}`);
for (const g of groups) {
  const al = fb.alphaOf(g, X, Y, P);
  console.log(`alphaOf g${g}: a ${f3(al.a)} fade ${al.fade}`);
  for (const ci of fb.cornersNear(X, Y)) {
    const c = fb.corners[ci];
    if (c.g !== g) continue;
    const dq = Math.hypot(X - c.qx, Y - c.qy);
    console.log(`  corner ${ci}: dq ${f3(dq)} r ${f3(c.r)} rV ${f3(c.rV)} inWedge ${fb.inWedge(c, X, Y)} inFill ${fb.inFill(c, X, Y)}`);
  }
}
// ASCII map of the top surface: '.' paper, letters per group, digits per own piece.
const N = 49;
const syms = new Map<number, string>();
const pool = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const fadeMap: string[] = [];
const lines: string[] = [];
for (let j = 0; j < N; j++) {
  let line = "";
  let fl = "";
  for (let i = 0; i < N; i++) {
    const x = X - half + (2 * half * i) / (N - 1);
    const y = Y - half + (2 * half * j) / (N - 1);
    const r = fb.evalPoint(x, y);
    if (i === (N - 1) / 2 && j === (N - 1) / 2) {
      line += "*";
      fl += "*";
      continue;
    }
    if (r.top < 0) line += ".";
    else {
      if (!syms.has(r.top)) syms.set(r.top, r.top >= OWN ? String(syms.size % 10) : pool[syms.size % 26]);
      line += syms.get(r.top);
    }
    fl += r.fade & 1 ? "f" : r.ink > 0.5 ? "#" : r.top < 0 ? "." : " ";
  }
  lines.push(line);
  fadeMap.push(fl);
}
console.log(`map ±${half} (rows y down), symbols: ${[...syms].map(([k, v]) => `${v}=${top(k)}`).join(" ")}`);
for (let j = 0; j < N; j++) console.log(`${lines[j]}   ${fadeMap[j]}`);
