// K1324 s3: what the fill draws around a spot (the census's CPU raster, fill_tri rasterFill + rasterPaint):
// per cell, the top item as a letter (legend below: item kind, chain, piece), then the paint's luminance as a
// digit next to form B's. --at=x:y,... lists the top triangle there: item, vertices, keys, slots.
//   node scripts/run_node.mjs .claude/probes/K1324/k1324_s3_fill.ts <scene> <x> <y> [--r=0.3] [--ppu=480] [--cell=8]
import { buildModel, rasterFormB } from "../K1314/k1314_census";
import * as F from "../../../src/render/outline/fill_tri";

const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [nm, xs, ys] = args.filter((a) => !a.startsWith("--"));
const ppu = Number(opt("ppu") ?? 480); const cell = Number(opt("cell") ?? 8); const R = Number(opt("r") ?? 0.3);
const m = buildModel(nm); const x = Number(xs); const y = Number(ys);
const c0 = Math.floor((x - R) * ppu); const r0 = Math.floor((y - R) * ppu); const W = Math.ceil(2 * R * ppu); const H = W;
const x0 = c0 / ppu; const y0 = r0 / ppu;
const win = { tri: new Int32Array(W * H).fill(-1), bary: new Float32Array(3 * W * H) };
F.rasterFill(m.fs, m.fr, x0, y0, W, H, ppu, win);
const pr = F.rasterPaint(m.fs, m.fr, m.runs, m.sp, x0, y0, W, H, ppu);
const B = rasterFormB(m, c0, r0, W, H, ppu);
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const seen = new Map<number, string>();
const lum = (r: Float32Array, i: number): number => 0.3 * r[3 * i] + 0.59 * r[3 * i + 1] + 0.11 * r[3 * i + 2];
const LO = Number(opt("lo") ?? 0); const HI = Number(opt("hi") ?? 1);
const dig = (v: number): string => (v < 0 ? " " : String(Math.min(9, Math.max(0, Math.floor(((v - LO) / (HI - LO)) * 10)))));
const nc = Math.floor(W / cell); const nr = Math.floor(H / cell);
console.log(`origin (${x0.toFixed(3)}, ${y0.toFixed(3)}) step ${(cell / ppu).toFixed(4)}; item | lum(outline) | lum(form B)`);
for (let r = 0; r < nr; r++) {
  let a = ""; let b = ""; let c = "";
  for (let q = 0; q < nc; q++) {
    const i = (r * cell + (cell >> 1)) * W + q * cell + (cell >> 1);
    const t = win.tri[i]; const it = t >= 0 ? m.vItem[m.fs.idx[t]] : -1;
    if (it >= 0 && !seen.has(it)) seen.set(it, letters[seen.size % letters.length]);
    a += it >= 0 ? seen.get(it) : " ";
    b += dig(pr.own[i] > 0 ? lum(pr.rgb, i) : -1); c += dig(B.ink[i] > 0.5 ? 0 : lum(B.rgb, i));
  }
  console.log(`${String(r).padStart(3)} ${a} | ${b} | ${c}`);
}
for (const [it, L] of seen) {
  const I = m.fs.items[it] as F.FillItem & Record<string, unknown>;
  const extra = Object.entries(I).filter(([k]) => k !== "kind" && k !== "arms").map(([k, v]) => `${k}=${v}`).join(" ");
  console.log(`${L}: item ${it} ${I.kind} ${extra}`);
}
for (const at of (opt("at") ?? "").split(",").filter(Boolean)) {
  const [px, py] = at.split(":").map(Number);
  const i = Math.floor((py - y0) * ppu) * W + Math.floor((px - x0) * ppu); const t = win.tri[i];
  if (t < 0) { console.log(`at ${at}: paper`); continue; }
  const v = [m.fs.idx[t], m.fs.idx[t + 1], m.fs.idx[t + 2]];
  console.log(`at ${at}: tri ${t / 3} item ${m.vItem[v[0]]} lum ${lum(pr.rgb, i).toFixed(3)} bary ${Array.from(win.bary.subarray(3 * i, 3 * i + 3)).map((q) => q.toFixed(2)).join(" ")}`);
  for (const vi of v) {
    const sl = [0, 1, 2, 3].map((k) => `${m.runs[4 * vi + k]}:${m.fr.w4[4 * vi + k].toFixed(2)}@${m.fr.s4[4 * vi + k].toFixed(2)}`).join(" ");
    console.log(`  v${vi} (${m.fr.pos[2 * vi].toFixed(4)}, ${m.fr.pos[2 * vi + 1].toFixed(4)}) key ${m.fr.key[vi].toFixed(4)} across ${m.fr.across[vi].toFixed(2)} ch ${m.fs.vChain[vi]} slots ${sl}`);
  }
}
