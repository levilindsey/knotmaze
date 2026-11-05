// K1179 S1 spike, criterion 3 (recordings): per frame, no boundary point
// moves more than its skeleton's motion plus 1 device px (dpr 2). An edge
// point is (arm, s, side); a round point is (corner, fraction from foot A
// to foot B), its skeleton motion the larger of its two feet's. Appear and
// vanish events are counted by cause. Streams the seq13 recordings line by
// line (they are ~25 MB gz each; loadSeq would hold every frame at once).
// Run: npx.cmd vite-node .claude/probes/K1179/spike_motion.ts [name,...]
import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FormB } from "../../../src/render/field/form_b";
import { pointAt } from "../../../src/render/field/geom";
import type { FieldScene } from "../../../src/render/field/scene";
import { armFrame, fmt, isBuried, RECORDINGS } from "./outline";
import { sameScene } from "./seq13_lib";

const HERE = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, "/");
const OUT = `${HERE}/out`;
mkdirSync(OUT, { recursive: true });
const SEQ_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/S3a/seq13";

interface TP { x: number; y: number; cx: number; cy: number; chain: number; sAbs: number; cx2?: number; cy2?: number; chain2?: number; sAbs2?: number; buried: boolean }
type MapT = Map<string, TP>;

function trackedMap(fb: FormB, sc: FieldScene): MapT {
  const h = fb.h;
  const m: MapT = new Map();
  const step = 0.1 * h;
  sc.junctions.forEach((j, ji) => {
    void j;
    for (let ai = 0; ai < fb.arms.length; ai++) {
      const a = fb.arms[ai];
      if (a.j !== ji) continue;
      for (const side of [1, -1]) {
        for (let d = 0, di = 0; d <= a.L + 1e-9; d += step, di++) {
          const f = armFrame(fb, ai, d);
          const px = f.cx + f.nx * side * h;
          const py = f.cy + f.ny * side * h;
          m.set(`E|${ji}|${a.ei}|${side}|${di}`, {
            x: px, y: py,
            cx: f.cx, cy: f.cy, chain: a.pi, sAbs: f.sAbs, buried: isBuried(fb, px, py),
          });
        }
      }
    }
  });
  for (const c of fb.corners) {
    const A = fb.arms[c.a];
    const B = fb.arms[c.b];
    const key0 = `R|${c.j}|${A.ei}-${B.ei}|`;
    const live = c.r > 1e-12 && c.omega > 0;
    const a0 = Math.atan2(c.tay - c.qy, c.tax - c.qx);
    let a1 = Math.atan2(c.tby - c.qy, c.tbx - c.qx);
    while (a1 - a0 > Math.PI) a1 -= 2 * Math.PI;
    while (a1 - a0 < -Math.PI) a1 += 2 * Math.PI;
    let aV = Math.atan2(c.Vy - c.qy, c.Vx - c.qx);
    while (aV - a0 > Math.PI) aV -= 2 * Math.PI;
    while (aV - a0 < -Math.PI) aV += 2 * Math.PI;
    if ((aV - a0) * (a1 - a0) < 0) a1 += a1 > a0 ? -2 * Math.PI : 2 * Math.PI;
    for (let fi = 0; fi <= 20; fi++) {
      const f = fi / 20;
      const p = live
        ? { x: c.qx + c.r * Math.cos(a0 + (a1 - a0) * f), y: c.qy + c.r * Math.sin(a0 + (a1 - a0) * f) }
        : { x: c.Vx, y: c.Vy };
      const fa = pointAt(fb.polys[A.pi], c.sA);
      const fbq = pointAt(fb.polys[B.pi], c.sB);
      m.set(`${key0}${fi}`, {
        x: p.x, y: p.y, cx: fa.x, cy: fa.y, chain: A.pi, sAbs: c.sA,
        cx2: fbq.x, cy2: fbq.y, chain2: B.pi, sAbs2: c.sB, buried: isBuried(fb, p.x, p.y),
      });
    }
  }
  return m;
}

function cornerAbsenceCause(fb: FormB, sc: FieldScene, ji: number, ea: number, eb: number): string {
  const jid = sc.junctions[ji]?.id;
  const hasA = fb.arms.some((a) => a.j === ji && a.ei === ea);
  const hasB = fb.arms.some((a) => a.j === ji && a.ei === eb);
  if (!hasA || !hasB) return "arm gone";
  if (fb.diagnostics.some((d) => d.includes(`j${jid}`) && d.includes(`${ea},${eb}`))) return "no V (solveEq)";
  const A = fb.arms.find((a) => a.j === ji && a.ei === ea)!;
  const B = fb.arms.find((a) => a.j === ji && a.ei === eb)!;
  if (!(A.L > 1e-9 && B.L > 1e-9)) return "arm span empty";
  return "window/wedge null (inferred)";
}

async function runRecording(name: string): Promise<Record<string, unknown>> {
  const path = `${SEQ_DIR}/${name}.jsonl.gz`;
  const rl = createInterface({ input: createReadStream(path).pipe(createGunzip()), crlfDelay: Infinity });
  let first = true;
  let prevScene: FieldScene | null = null;
  let prevFb: FormB | null = null;
  let prevMap: MapT | null = null;
  let frames = 0;
  let kept = 0;
  let pairs = 0;
  let compared = 0;
  let exceeded = 0;
  let exceededEdge = 0;
  let exceededRound = 0;
  let comparedRound = 0;
  let maxExcess = 0;
  const worst: { key: string; frame: number; excessDev: number; dispDev: number; skelDev: number }[] = [];
  const appear = new Map<string, number>();
  const vanish = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  const buildMs: number[] = [];
  let frameIdx = -1;
  for await (const line of rl) {
    if (!line) continue;
    if (first) {
      first = false;
      continue; // meta line
    }
    frames++;
    const fr = JSON.parse(line) as { i: number; t: number; scene: FieldScene };
    fr.scene.look.ctrlArc ??= 0.47;
    if (prevScene && sameScene(prevScene, fr.scene)) continue;
    kept++;
    frameIdx = fr.i;
    const t0 = performance.now();
    const fb = new FormB(fr.scene);
    buildMs.push(performance.now() - t0);
    const map = trackedMap(fb, fr.scene);
    if (prevFb && prevMap) {
      pairs++;
      const dev = fb.ppuDev;
      for (const [k, cur] of map) {
        const prv = prevMap.get(k);
        if (!prv) {
          bump(appear, k.startsWith("R|") ? `round: ${cornerAbsenceCause(prevFb, prevScene!, Number(k.split("|")[1]), Number(k.split("|")[2].split("-")[0]), Number(k.split("|")[2].split("-")[1].split("|")[0]))}` : "edge: span grew / arm appeared");
          continue;
        }
        if (prv.buried || cur.buried) {
          if (prv.buried && !cur.buried) bump(appear, "exposure gained (was buried)");
          if (!prv.buried && cur.buried) bump(vanish, "exposure lost (buried)");
          continue;
        }
        compared++;
        if (k.startsWith("R|")) comparedRound++;
        const disp = Math.hypot(cur.x - prv.x, cur.y - prv.y);
        const skelA = Math.hypot(cur.cx - prv.cx, cur.cy - prv.cy);
        let skel = skelA;
        if (cur.cx2 !== undefined && prv.cx2 !== undefined) {
          // Feet positions in the *current* frame at the same absolute s,
          // against the stored previous feet: recompute current feet from
          // the current polys (stored cx is already current for cur; the
          // previous map stored its own frame's feet, which is prv.cx).
          skel = Math.max(skelA, Math.hypot(cur.cx2 - prv.cx2, cur.cy2! - prv.cy2!));
        }
        const excess = (disp - skel) * dev;
        if (excess > maxExcess) maxExcess = excess;
        if (excess > 1) {
          exceeded++;
          if (k.startsWith("R|")) exceededRound++;
          else exceededEdge++;
          worst.push({ key: k, frame: frameIdx, excessDev: +excess.toFixed(3), dispDev: +(disp * dev).toFixed(3), skelDev: +(skel * dev).toFixed(3) });
        }
      }
      for (const k of prevMap.keys()) {
        if (map.has(k)) continue;
        if (k.startsWith("R|")) {
          const parts = k.split("|");
          bump(vanish, `round: ${cornerAbsenceCause(fb, fr.scene, Number(parts[1]), Number(parts[2].split("-")[0]), Number(parts[2].split("-")[1]))}`);
        } else {
          bump(vanish, "edge: span shrank / arm gone");
        }
      }
    }
    prevScene = fr.scene;
    prevFb = fb;
    prevMap = map;
  }
  worst.sort((u, v) => v.excessDev - u.excessDev);
  const res = {
    recording: name, frames, keptDistinct: kept, pairs, pointsCompared: compared, roundCompared: comparedRound,
    exceeded1DevPx: exceeded, exceededEdge, exceededRound, maxExcessDevPx: +maxExcess.toFixed(3),
    buildMsP50: +fmt(buildMs.length ? buildMs.sort((x, y) => x - y)[Math.floor(buildMs.length / 2)] : NaN, 1),
    worst: worst.slice(0, 10),
    appear: Object.fromEntries(appear), vanish: Object.fromEntries(vanish),
  };
  console.log(`${name}: frames ${frames}, kept ${kept}, pairs ${pairs}, compared ${compared}, over 1 devpx ${exceeded}, max excess ${fmt(maxExcess, 3)} devpx`);
  console.log(`  appear ${JSON.stringify(res.appear)} vanish ${JSON.stringify(res.vanish)}`);
  for (const w of res.worst.slice(0, 5)) console.log(`  worst ${w.key} frame ${w.frame} excess ${w.excessDev} (disp ${w.dispDev}, skel ${w.skelDev}) devpx`);
  return res;
}

const names = process.argv[2] ? process.argv[2].split(",") : RECORDINGS;
const all: Record<string, unknown>[] = [];
for (const n of names) all.push(await runRecording(n));
writeFileSync(`${OUT}/motion.json`, JSON.stringify(all, null, 1));
const lines = all.map((r) => `${r.recording}: frames ${r.frames} kept ${r.keptDistinct} pairs ${r.pairs} compared ${r.pointsCompared} over ${r.exceeded1DevPx} maxExcess ${r.maxExcessDevPx} devpx appear ${JSON.stringify(r.appear)} vanish ${JSON.stringify(r.vanish)}`);
writeFileSync(`${OUT}/motion.txt`, lines.join("\n") + "\n");
