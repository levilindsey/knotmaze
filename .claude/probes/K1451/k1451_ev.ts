// K1451: GfEval on a live page's dumped tables (dump.mjs). Renders device-px crops of the mirror's ink (and the
// winning term's kind) to PNG, and prints the pieces / surfaces / composite swaps at chosen device pixels.
//   node scripts/run_node.mjs .claude/probes/K1451/k1451_ev.ts <dump.json> <outPrefix> <cx,cy,size>... [--px=x,y ...] [--fade=f]
import { readFileSync } from "node:fs";
import { GfEval } from "../../../src/render/gpu_field/eval";
import { writePng } from "../K1314/k1314_crops";

export function loadDump(file: string): { T: any; view: { x: number; y: number; s: number }; dpr: number; fade: number } {
  const J = JSON.parse(readFileSync(file, "utf8"));
  const T: any = {};
  const conv = (x: unknown): number => (x === "inf" ? Infinity : x === "-inf" ? -Infinity : (x as number));
  for (const [k, v] of Object.entries(J.T as Record<string, any>)) {
    if (v && typeof v === "object" && "t" in v && "d" in v) {
      if (v.t === "num") T[k] = Number(v.d === "Infinity" ? Infinity : v.d === "-Infinity" ? -Infinity : v.d);
      else { T[k] = new (globalThis as any)[v.t](v.d.map(conv)); if (process.env.F32 === "1" && v.t === "Float64Array") T[k] = Float64Array.from(new Float32Array(T[k])); }
    } else T[k] = process.env.F32 === "1" && typeof v === "number" ? Math.fround(v) : v;
  }
  return { T, view: J.view, dpr: J.dpr ?? 2, fade: J.fade };
}

export function worldOf(D: ReturnType<typeof loadDump>, dx: number, dy: number): [number, number] {
  return [((dx + 0.5) / D.dpr - D.view.x) / D.view.s, ((dy + 0.5) / D.dpr - D.view.y) / D.view.s];
}

const WK: [number, number, number][] = [[0, 0, 0], [255, 255, 255], [80, 160, 255], [255, 220, 60], [80, 255, 120], [255, 80, 255], [255, 60, 60]];

export function renderCrop(E: GfEval, D: ReturnType<typeof loadDump>, cx: number, cy: number, size: number, tint: boolean): Uint8Array {
  const px = new Uint8Array(size * size * 3);
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    const [x, y] = worldOf(D, cx - size / 2 + c, cy - size / 2 + r);
    const o = E.eval(x, y); const i = 3 * (r * size + c);
    const base = o.chain < 0 ? [30, 30, 40] : [130 + ((o.chain * 53) % 100), 110 + ((o.chain * 97) % 100), 150 + ((o.chain * 31) % 90)];
    if (process.env.COVMAP === "1") { px[i] = Math.round(255 * o.ink); px[i + 1] = Math.round(120 * o.cov * (1 - o.ink)); px[i + 2] = Math.round(200 * o.cov * (1 - o.ink)); continue; }
    const ink = o.ink; const col = tint ? WK[o.winKind] ?? [0, 0, 0] : [10, 10, 20];
    for (let k = 0; k < 3; k++) px[i + k] = Math.round(base[k] * (1 - ink) + col[k] * ink);
  }
  return px;
}

export function dumpPx(E: GfEval, D: ReturnType<typeof loadDump>, dx: number, dy: number): void {
  const [x, y] = worldOf(D, dx, dy); const o = E.eval(x, y); const A = E as any; const T = D.T;
  console.log(`px ${dx},${dy} world ${x.toFixed(4)},${y.toFixed(4)} ink ${o.ink.toFixed(3)} cov ${o.cov.toFixed(3)} chain ${o.chain} s ${o.s.toFixed(3)} wk ${o.winKind} wa ${o.winA} wb ${o.winB}`);
  for (let j = 0; j < A.np; j++) console.log(`  piece ${j}: c ${A.pc[j]} s ${A.ps[j].toFixed(3)} d ${A.pd[j].toFixed(4)} z ${A.pz[j].toFixed(4)} key ${A.pkey[j].toFixed(4)} g ${A.pg[j]} ramp ${A.pramp[j].toFixed(3)} surf ${A.psurf[j]} seg ${A.plo[j]}..${A.phi[j]} len ${T.cLen[A.pc[j]].toFixed(2)} closed ${T.cClosed[A.pc[j]]}`);
  for (let i = 0; i < A.nk; i++) { const k = A.kk[i]; console.log(`  corner ${k}: g ${T.kG[k]} ca ${T.kCa[k]} cb ${T.kCb[k]} r ${T.kR[k].toFixed(3)} rho ${A.krho[i].toFixed(3)} in ${A.kIn[i]} za ${T.kZa[k].toFixed(3)} zb ${T.kZb[k].toFixed(3)} thru ${T.kThru[k]}`); }
  for (let i = 0; i < A.ns; i++) { const e = A.sord[i]; console.log(`  surf#${i} id ${A.sid[e]} key ${A.skey[e].toFixed(4)} a ${A.sa[e].toFixed(3)} v ${A.sv[e].toFixed(3)} wk ${A.swk[e]} wa ${A.swa[e]} wb ${A.swb[e]}`); }
}

if (process.argv[1]?.includes("k1451_ev")) {
  const args = process.argv.slice(2);
  const D = loadDump(args[0]); const pre = args[1];
  const E = new GfEval(D.T);
  const fa = args.find((a) => a.startsWith("--fade=")); E.fadeLength = fa ? Number(fa.slice(7)) : D.fade ?? E.fadeLength;
  console.log(`zt ${D.T.zt} h ${D.T.h} fade ${E.fadeLength} homeOn ${D.T.homeOn}`);
  for (const a of args.slice(2)) {
    if (a.startsWith("--px=")) { const [px, py] = a.slice(5).split(",").map(Number); dumpPx(E, D, px, py); continue; }
    if (a.startsWith("--")) continue;
    const [cx, cy, size] = a.split(",").map(Number);
    writePng(`${pre}_${cx}_${cy}.png`, renderCrop(E, D, cx, cy, size, false), size, size);
    writePng(`${pre}_${cx}_${cy}_wk.png`, renderCrop(E, D, cx, cy, size, true), size, size);
    console.log(`wrote ${pre}_${cx}_${cy}.png`);
  }
}
