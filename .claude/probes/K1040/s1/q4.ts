// K1040 S1, question 4: the outer edge's AA. Form B's coverage (ss(−aa, aa, ·)
// on each surface, composited front to back over what lies below, which is the
// fetch-across in reference form, F4) against exact area coverage: the mean of
// a hard-edged form B (aa = 1e-4 device px) over 8x8 subsamples per pixel.
// Pixels are device px (SCALE = the camera's dpr), in a CROP x CROP window at
// the frame's centre. Only pixels whose hard ink differs among the centre and
// four corners, or whose AA ink differs from it, are supersampled.
// Classes, from the hard subsamples: outer (paper and a surface both appear),
// over (covered throughout, the top surface changes: an outline over another
// surface), inner (one top throughout: the band's inner edge, fades). Outer is
// split by the AA eval's winning term (foot = a straight edge; tA, tB, V, arc =
// corners and ends).
// Run: npx vite-node .claude/probes/K1040/s1/q4.ts [scene...]  (env CROP, default 640)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB, TERM_NAMES } from "../../../../src/render/field/form_b";

const here = dirname(fileURLToPath(import.meta.url));
const sceneDir = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const outDir = join(here, "out", "q4");
mkdirSync(outDir, { recursive: true });
const CROP = Number(process.env.CROP ?? 640);
const SUB = 8;

function loadScene(name: string): FieldScene {
  const s = JSON.parse(readFileSync(join(sceneDir, `${name}.json`), "utf8")) as FieldScene;
  s.look.ctrlArc ??= 0.47;
  return s;
}

interface Acc {
  n: number;
  sumAbs: number;
  sumSigned: number;
  max: number;
  over01: number;
  over05: number;
  abs: number[];
  worst: { at: [number, number]; aa: number; exact: number }[];
}
const acc = (): Acc => ({ n: 0, sumAbs: 0, sumSigned: 0, max: 0, over01: 0, over05: 0, abs: [], worst: [] });

function run(name: string) {
  const t0 = Date.now();
  const s = loadScene(name);
  const dpr = s.camera.dpr;
  const fbAA = new FormB(s);
  const fbHard = new FormB(s, { aa: 1e-4 / fbAA.ppuDev });
  const [a, b, c, d, e, f] = s.camera.worldToCss;
  const det = a * d - b * c;
  const [vw, vh] = s.camera.viewport;
  const SCALE = dpr;
  const nx = Math.round(vw * SCALE);
  const ny = Math.round(vh * SCALE);
  const i0 = Math.max(0, Math.floor(nx / 2 - CROP / 2));
  const j0 = Math.max(0, Math.floor(ny / 2 - CROP / 2));
  const i1 = Math.min(nx, i0 + CROP);
  const j1 = Math.min(ny, j0 + CROP);
  const world = (x: number, y: number): [number, number] => {
    const u = x / SCALE - e;
    const v = y / SCALE - f;
    return [(d * u - c * v) / det, (-b * u + a * v) / det];
  };
  const classes: Record<string, Acc> = {};
  const get = (k: string) => (classes[k] ??= acc());
  let supersampled = 0;
  for (let j = j0; j < j1; j++) {
    for (let i = i0; i < i1; i++) {
      const [cx, cy] = world(i + 0.5, j + 0.5);
      const rAA = fbAA.evalPoint(cx, cy);
      const hc = fbHard.evalPoint(cx, cy).ink;
      let same = Math.abs(rAA.ink - hc) < 0.002;
      if (same) {
        for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
          const [wx, wy] = world(i + ox, j + oy);
          if (Math.abs(fbHard.evalPoint(wx, wy).ink - hc) > 1e-9) {
            same = false;
            break;
          }
        }
      }
      if (same) continue;
      supersampled++;
      let sum = 0;
      let paper = 0;
      let covered = 0;
      const tops = new Set<number>();
      for (let sj = 0; sj < SUB; sj++) {
        for (let si = 0; si < SUB; si++) {
          const [wx, wy] = world(i + (si + 0.5) / SUB, j + (sj + 0.5) / SUB);
          const r = fbHard.evalPoint(wx, wy);
          sum += r.ink;
          if (r.top < 0) paper++;
          else {
            covered++;
            tops.add(r.top);
          }
        }
      }
      const exact = sum / (SUB * SUB);
      const delta = rAA.ink - exact;
      let cls: string;
      if (paper > 0 && covered > 0) cls = `outer/${rAA.term ? TERM_NAMES[rAA.term.kind] : "none"}${rAA.nSurf >= 2 ? "+2surf" : ""}`;
      else if (covered === SUB * SUB && tops.size > 1) cls = "over";
      else cls = "inner";
      if (rAA.fade) cls += "+fade";
      for (const k of [cls, cls.startsWith("outer") ? "outer(all)" : "", "all"]) {
        if (!k) continue;
        const A = get(k);
        A.n++;
        A.sumAbs += Math.abs(delta);
        A.sumSigned += delta;
        A.max = Math.max(A.max, Math.abs(delta));
        if (Math.abs(delta) > 0.1) A.over01++;
        if (Math.abs(delta) > 0.5) A.over05++;
        A.abs.push(Math.abs(delta));
        if (Math.abs(delta) > 0.25 && A.worst.length < 6) A.worst.push({ at: [Math.round(cx * 1000) / 1000, Math.round(cy * 1000) / 1000], aa: Math.round(rAA.ink * 1000) / 1000, exact: Math.round(exact * 1000) / 1000 });
      }
    }
  }
  const lines = [`== ${name}: dpr ${dpr}, crop ${i1 - i0}x${j1 - j0} device px at (${i0}, ${j0}), ${supersampled} px supersampled ${SUB}x${SUB}, ${((Date.now() - t0) / 1000).toFixed(0)} s`];
  const table: Record<string, unknown> = {};
  for (const [k, A] of Object.entries(classes).sort((x, y) => y[1].n - x[1].n)) {
    A.abs.sort((x, y) => x - y);
    const p99 = A.abs[Math.min(A.abs.length - 1, Math.floor(0.99 * A.abs.length))];
    const row = { n: A.n, meanAbs: +(A.sumAbs / A.n).toFixed(4), meanSigned: +(A.sumSigned / A.n).toFixed(4), p99: +p99.toFixed(3), max: +A.max.toFixed(3), over01: A.over01, over05: A.over05, worst: A.worst };
    table[k] = row;
    lines.push(`  ${k}: n ${row.n}, mean |Δ| ${row.meanAbs}, mean Δ ${row.meanSigned}, p99 ${row.p99}, max ${row.max}, |Δ|>0.1 ${row.over01}, |Δ|>0.5 ${row.over05}`);
  }
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify({ scene: name, crop: [i0, j0, i1, j1], sub: SUB, table }, null, 1));
  return lines;
}

const names = process.argv.slice(2).length ? process.argv.slice(2) : ["def", "fat", "g41_def_tw64"];
const all: string[] = [];
for (const nm of names) {
  const l = run(nm);
  console.log(l.join("\n"));
  all.push(...l);
}
writeFileSync(join(outDir, "summary.txt"), `${all.join("\n")}\n`);
