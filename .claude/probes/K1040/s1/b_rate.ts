// K1040 S1b, step 3: the rate rule in the image. Around each site, form B's
// ink is sampled on a grid of STEP device px (default 1/8) over +-R px
// (default 3), and |grad ink| is taken from forward differences. A grid edge
// steeper than LIM per px (default 3: |grad d| <= 2 read through the band's
// AA, whose steepest legitimate edge is 1.5/px) is a breach. Each breach is
// refined by bisection down to 1/1024 px and classed: a jump (the change
// stays above JUMP, default 0.02, at that length) or a steep ramp; and by
// what changes across it: the winning term and fade bits on each side, and
// whether the top surface changes.
// Sites: q4worst's (out/q4/<scene>.json, every "fade" key's first 3 worst)
// and the #1 mouth sites (out/scenes/<scene>.json, check1deep.sites).
// Run: npx vite-node .claude/probes/K1040/s1/b_rate.ts [scene...]
// Env: OUT (default out/s1b/rate), TAG (file suffix), PARAMS (JSON merged
// into FormBParams), R, STEP, LIM, SITES=q4|deep|both (default both).
// Writes rate<TAG>.txt and rate<TAG>.json.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB, TERM_NAMES, type FormBParams, type PixelEval } from "../../../../src/render/field/form_b";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.OUT ?? join(here, "out", "s1b", "rate");
mkdirSync(outDir, { recursive: true });
const TAG = process.env.TAG ?? "";
const extra = JSON.parse(process.env.PARAMS ?? "{}") as FormBParams;
const R = Number(process.env.R ?? 3);
const STEP = Number(process.env.STEP ?? 1 / 8);
const LIM = Number(process.env.LIM ?? 3);
const JUMP = 0.02;
const SITES = process.env.SITES ?? "both";
const sceneDir = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const ALL = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const scenes = process.argv.slice(2).length ? process.argv.slice(2) : ALL;

const side = (r: PixelEval) => `${r.term ? TERM_NAMES[r.term.kind] : "none"}${r.fade ? "+f" + r.fade : ""}`;
interface Breach { at: [number, number]; dir: "x" | "y"; slope: number; jump: number; cls: string; a: string; b: string; corner: number; chain: number }
const json: Record<string, { sites: { at: [number, number]; src: string; maxSlope: number; breaches: number; classes: Record<string, number>; worst: Breach[] }[] }> = {};
const total = new Map<string, number>();
const lines: string[] = [];
const t0 = Date.now();
for (const name of scenes) {
  const s = JSON.parse(readFileSync(join(sceneDir, `${name}.json`), "utf8")) as FieldScene;
  s.look.ctrlArc ??= 0.47;
  const fb = new FormB(s, { ...extra });
  const px = 1 / fb.ppuDev;
  const sites: { at: [number, number]; src: string }[] = [];
  const q4f = join(here, "out", "q4", `${name}.json`);
  if (SITES !== "deep" && existsSync(q4f)) {
    const q4 = JSON.parse(readFileSync(q4f, "utf8")) as { table: Record<string, { worst: { at: [number, number] }[] }> };
    for (const [k, row] of Object.entries(q4.table)) if (k.includes("fade")) for (const w of row.worst.slice(0, 3)) sites.push({ at: w.at, src: `q4 ${k}` });
  }
  const scf = join(here, "out", "scenes", `${name}.json`);
  if (SITES !== "q4" && existsSync(scf)) {
    const sc = JSON.parse(readFileSync(scf, "utf8")) as { check1deep?: { sites: { at: [number, number]; k: string }[] } };
    for (const w of sc.check1deep?.sites ?? []) sites.push({ at: w.at, src: `#1 ${w.k}` });
  }
  json[name] = { sites: [] };
  const n = Math.round((2 * R) / STEP) + 1;
  const g = new Float64Array(n * n);
  for (const site of sites) {
    const x0 = site.at[0] - R * px;
    const y0 = site.at[1] - R * px;
    const P = (i: number, j: number): [number, number] => [x0 + i * STEP * px, y0 + j * STEP * px];
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const [x, y] = P(i, j);
        g[j * n + i] = fb.evalPoint(x, y).ink;
      }
    let maxSlope = 0;
    const classes: Record<string, number> = {};
    const worst: Breach[] = [];
    let breaches = 0;
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        for (const dir of ["x", "y"] as const) {
          const i2 = dir === "x" ? i + 1 : i;
          const j2 = dir === "y" ? j + 1 : j;
          if (i2 >= n || j2 >= n) continue;
          const dv = g[j2 * n + i2] - g[j * n + i];
          const slope = Math.abs(dv) / STEP;
          maxSlope = Math.max(maxSlope, slope);
          if (slope <= LIM) continue;
          breaches++;
          // Refine: bisect toward the half with the larger change.
          let [ax, ay] = P(i, j);
          let [bx, by] = P(i2, j2);
          let va = g[j * n + i];
          let vb = g[j2 * n + i2];
          while (Math.hypot(bx - ax, by - ay) > px / 1024) {
            const mx = 0.5 * (ax + bx);
            const my = 0.5 * (ay + by);
            const vm = fb.evalPoint(mx, my).ink;
            if (Math.abs(vm - va) >= Math.abs(vb - vm)) {
              bx = mx;
              by = my;
              vb = vm;
            } else {
              ax = mx;
              ay = my;
              va = vm;
            }
          }
          const ra = fb.evalPoint(ax, ay);
          const rb = fb.evalPoint(bx, by);
          const jump = Math.abs(vb - va);
          const kind = jump > JUMP ? "jump" : "ramp";
          const [lo, hi] = [side(ra), side(rb)].sort();
          const cls = `${kind} ${lo} | ${hi}${ra.top !== rb.top ? " (top changes)" : ""}`;
          classes[cls] = (classes[cls] ?? 0) + 1;
          total.set(cls, (total.get(cls) ?? 0) + 1);
          const tm = (ra.term?.v ?? 0) >= (rb.term?.v ?? 0) ? ra.term : rb.term;
          worst.push({ at: [ax, ay], dir, slope, jump, cls, a: `${side(ra)} top ${ra.top} ink ${va.toFixed(3)}`, b: `${side(rb)} top ${rb.top} ink ${vb.toFixed(3)}`, corner: tm?.corner ?? -1, chain: tm?.chain ?? -1 });
        }
      }
    worst.sort((u, v) => v.jump - u.jump || v.slope - u.slope);
    json[name].sites.push({ at: site.at, src: site.src, maxSlope, breaches, classes, worst: worst.slice(0, 6) });
    lines.push(`${name} (${site.at[0]}, ${site.at[1]}) [${site.src}]: max |grad ink| ${maxSlope.toFixed(2)}/px, ${breaches} breaches${breaches ? ": " + Object.entries(classes).map(([k, v]) => `${v} ${k}`).join("; ") : ""}`);
    for (const w of worst.slice(0, 2)) lines.push(`    worst at (${w.at[0].toFixed(4)}, ${w.at[1].toFixed(4)}) ${w.dir} jump ${w.jump.toFixed(3)}: ${w.a} || ${w.b} corner ${w.corner} chain ${w.chain}`);
  }
  console.log(`${name}: ${sites.length} sites, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
const head = [`b_rate: R ${R} px, step ${STEP} px, LIM ${LIM}/px, jump > ${JUMP} at 1/1024 px; params ${JSON.stringify(extra)}`, `totals by class (grid edges):`];
for (const [k, v] of [...total].sort((u, v) => v[1] - u[1])) head.push(`  ${String(v).padStart(6)} ${k}`);
let nSites = 0;
let nBad = 0;
for (const v of Object.values(json)) for (const st of v.sites) {
  nSites++;
  if (st.breaches) nBad++;
}
head.push(`sites ${nSites}, with breaches ${nBad}`);
writeFileSync(join(outDir, `rate${TAG}.txt`), `${head.join("\n")}\n\n${lines.join("\n")}\n`);
writeFileSync(join(outDir, `rate${TAG}.json`), JSON.stringify(json, null, 1));
console.log(head.join("\n"));
