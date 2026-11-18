// K1474 trace, Node side: rebuild GfLookTable from trace.mjs's dump and print, for the traced sample,
// the value at each step: knotSection at the bracketing sample ctrls, kSectionAtArc (today's ribbon
// colour at the arc), lookColour (gf's table reading at segment k, fractions 0 / u / 1), and the raw
// table texels under the sample's position. Args: <dump.json> [todayHex gfHex]
import { readFileSync } from "node:fs";
import { GfLookTable, lookColour } from "../../../src/render/gpu_field/gf_look";
import { kCtrlOfArc, kSectionAtArc, knotSection, type KChain, type KData } from "../../../src/render/paint_math";

import { knotUniforms } from "../../../src/render/paint_model";
const dump = JSON.parse(readFileSync(process.argv[2], "utf8"));
// GfLookTable.build reads the module-global uniforms: set them to the page's dumped values first.
{
  const grp = knotUniforms().uniforms as unknown as Record<string, { value?: Float32Array } | Float32Array>;
  for (const [name, entry] of Object.entries(dump.uniforms as Record<string, unknown>)) {
    const raw = (entry as { value?: unknown }).value ?? entry;
    const vals = Array.isArray(raw) ? raw : Object.keys(raw as object).sort((a, b) => +a - +b).map((k) => (raw as Record<string, number>)[k]);
    const target = grp[name] as { value?: Float32Array } | Float32Array | undefined;
    const arr = (target as { value?: Float32Array })?.value ?? (target as Float32Array);
    if (arr && typeof arr.set === "function" && vals.length <= arr.length) arr.set(vals);
  }
}
const kd: KData = {
  stat: new Float32Array(dump.stat), geom: new Float32Array(dump.geom),
  reveal: new Float32Array(0), paint: new Float32Array(0),
};
const U = dump.uniforms;
const kcv: KChain[] = dump.chains.map((c: unknown) => c as KChain);
const src = { kd, kcv, chainSamples: dump.samples.map((s: { count: number; positions: number[] } | null) =>
  s ? { count: s.count, positions: new Float32Array(s.positions) } : null) };
const T = new GfLookTable();
T.build(src);
const P = T.positions(src);
const { c, k } = dump.best as { c: number; k: number };
const ch = kcv[c];
const rgb255 = (v: ArrayLike<number>): string => [0, 1, 2].map((i) => Math.round(255 * Math.max(0, Math.min(1, v[i])))).join(",");
const out = new Float32Array(3);
knotSection(kd, U, ch, kCtrlOfArc(kd, ch, k * ch.arcPer), out);
console.log(`chain ${c} sample ${k}/${ch.count} closed=${ch.closed} arcPer=${ch.arcPer} total=${ch.total}`);
const uv = (e: unknown): string => { const raw = (e as { value?: unknown }).value ?? e; const vals = Array.isArray(raw) ? raw : Object.keys(raw as object).sort((a, b) => +a - +b).map((k) => (raw as Record<string, number>)[k]); return vals.join(","); };
console.log(`uniforms uKBase=${uv(U.uKBase)} uKSect=${uv(U.uKSect)} uKGamut=${uv(U.uKGamut)}`);
console.log(`mirror (page): sectionAt=${rgb255(dump.mirror.sectionAt)} sectionExact=${rgb255(dump.mirror.sectionExact)} ctrl=${dump.mirror.ctrl}`);
console.log(`node knotSection@ctrlOfArc(k)      = ${rgb255(out)}`);
const seed = kSectionAtArc(kd, U, ch, k * ch.arcPer, -1, out);
console.log(`node kSectionAtArc(k*arcPer)       = ${rgb255(out)} (seed ctrl ${seed})`);
kSectionAtArc(kd, U, ch, (k + 0.5) * ch.arcPer, -1, out);
console.log(`node kSectionAtArc((k+.5)*arcPer)  = ${rgb255(out)}`);
for (const u of [0, 0.5, 1]) {
  const col = lookColour(T, P, c, k, u);
  console.log(`node lookColour(k, u=${u})           = ${col ? rgb255(col) : "null"}`);
}
// raw positions + table slots for this chain
let pb = 0;
for (let i = 0; i < c; i++) if (dump.samples[i]) pb += dump.samples[i].count + (kcv[i].closed ? 1 : 0);
console.log(`position[${k}] = ${P[pb + k]}, position[${k + 1}] = ${P[pb + k + 1]}`);
// the run record knotSection reads at the sample's slot
const sl = Math.floor(Math.max(0, Math.min(ch.nCtrl - 1, dump.mirror.ctrl)));
const io = (ch.idx + sl) * 4;
const run = Math.round(kd.stat[io]);
const b = (Math.round(U.uKBase[0]) + 4 * run) * 4;
console.log(`slot ${sl}: CTRLIDX=${Array.from(kd.stat.slice(io, io + 4))} run=${run} R0=${Array.from(kd.stat.slice(b, b + 4))} R1=${Array.from(kd.stat.slice(b + 4, b + 8))} R2=${Array.from(kd.stat.slice(b + 8, b + 12))} R3=${Array.from(kd.stat.slice(b + 12, b + 16))}`);
if (process.argv[3]) console.log(`screenshots: today #${process.argv[3]} gf #${process.argv[4] ?? ""}`);
