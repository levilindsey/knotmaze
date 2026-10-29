// K1040 S1b, step 3: the fill key's bisector jump (S1 Handoff, smaller
// residuals). Inside a corner's fill the key is the nearer tangent point's
// z - h/K, so it jumps from zA's to zB's on the bisector of t_a t_b. The jump
// matters where it changes the top surface. For every corner with r > 0 and
// omega > 0, every device pixel centre where evalPoint gives the fill a key
// (dq > r - aa, dq <= rV, in the wedge) is evaluated with the key held at
// A's z and at B's z (FormBParams.fillKey): a pixel whose top differs is one
// where the choice matters, and one within a device px of the bisector is
// one where the jump shows. Pixels are counted once per scene.
// Run: npx vite-node .claude/probes/K1040/s1/b_bisector.ts [scene...] (env OUT,
// DPR). Writes bisector.txt to out/s1b/bisector.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB } from "../../../../src/render/field/form_b";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.OUT ?? join(here, "out", "s1b", "bisector");
mkdirSync(outDir, { recursive: true });
const DPR = process.env.DPR ? Number(process.env.DPR) : undefined;
const ALL = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const scenes = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
const lines: string[] = [];
let tot = { px: 0, diff: 0, near: 0, inkNear: 0 };
for (const name of scenes) {
  const s = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
  s.look.ctrlArc ??= 0.47;
  const fbN = new FormB(s, { dpr: DPR });
  const fbA = new FormB(s, { dpr: DPR, fillKey: "a" });
  const fbB = new FormB(s, { dpr: DPR, fillKey: "b" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const F = fbN as any;
  const px = 1 / fbN.ppuDev;
  const seen = new Set<string>();
  const row = { px: 0, diff: 0, near: 0, inkNear: 0, keyDiff: 0, dzMax: 0, inkAny: 0, inkMax: 0 };
  const sites: string[] = [];
  F.corners.forEach((c: { r: number; omega: number; qx: number; qy: number; rV: number; tax: number; tay: number; tbx: number; tby: number }, ci: number) => {
    if (!(c.r > 0 && c.omega > 0)) return;
    const tl = Math.hypot(c.tbx - c.tax, c.tby - c.tay);
    const i0 = Math.floor((c.qx - c.rV) / px);
    const i1 = Math.ceil((c.qx + c.rV) / px);
    const j0 = Math.floor((c.qy - c.rV) / px);
    const j1 = Math.ceil((c.qy + c.rV) / px);
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const x = (i + 0.5) * px;
        const y = (j + 0.5) * px;
        const dq = Math.hypot(x - c.qx, y - c.qy);
        if (!(dq > c.r - fbN.aa) || dq > c.rV * (1 + 1e-9) + 1e-12 || !F.inWedge(c, x, y)) continue;
        const key = `${i},${j}`;
        if (seen.has(key)) continue;
        seen.add(key);
        row.px++;
        const ra = fbA.evalPoint(x, y);
        const rb = fbB.evalPoint(x, y);
        if (ra.top === rb.top && ra.top >= 0 && ra.key !== rb.key) {
          row.keyDiff++;
          row.dzMax = Math.max(row.dzMax, Math.abs(ra.key - rb.key));
        }
        if (Math.abs(ra.ink - rb.ink) > 1 / 255) {
          row.inkAny++;
          row.inkMax = Math.max(row.inkMax, Math.abs(ra.ink - rb.ink));
          if (sites.length < 4) sites.push(`ink (${x.toFixed(4)}, ${y.toFixed(4)}) corner ${ci}: top ${ra.top} | ${rb.top}, ink ${ra.ink.toFixed(3)} | ${rb.ink.toFixed(3)}, fade ${ra.fade} | ${rb.fade}`);
        }
        if (ra.top === rb.top) continue;
        row.diff++;
        const dA2 = (x - c.tax) ** 2 + (y - c.tay) ** 2;
        const dB2 = (x - c.tbx) ** 2 + (y - c.tby) ** 2;
        const dBis = tl > 0 ? Math.abs(dA2 - dB2) / (2 * tl) : 0;
        if (dBis <= px) {
          row.near++;
          if (Math.abs(ra.ink - rb.ink) > 1 / 255) row.inkNear++;
          if (sites.length < 6) sites.push(`(${x.toFixed(4)}, ${y.toFixed(4)}) corner ${ci}: top ${ra.top} | ${rb.top}, ink ${ra.ink.toFixed(3)} | ${rb.ink.toFixed(3)}`);
        }
      }
  });
  tot = { px: tot.px + row.px, diff: tot.diff + row.diff, near: tot.near + row.near, inkNear: tot.inkNear + row.inkNear };
  lines.push(`${name}: ${row.px} keyed fill px; top differs A vs B at ${row.diff}; within 1 px of the bisector ${row.near} (ink differs > 1/255 at ${row.inkNear}); same top, key differs at ${row.keyDiff} (max ${row.dzMax.toFixed(4)}); ink differs A vs B at ${row.inkAny} (max ${row.inkMax.toFixed(3)})`);
  for (const st of sites) lines.push(`    ${st}`);
  console.log(lines.slice(-1 - sites.length).join("\n"));
}
const head = `b_bisector (dpr ${DPR ?? "scene"}): ${tot.px} keyed fill px; top differs A vs B at ${tot.diff}; within 1 px of the bisector ${tot.near} (ink differs at ${tot.inkNear})`;
writeFileSync(join(outDir, "bisector.txt"), `${head}\n\n${lines.join("\n")}\n`);
console.log(head);
