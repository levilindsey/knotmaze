// K1341 s1: Node timing of zChains and fill over the s18 drags (def, muse_hash, fat), the worker's update
// steps in order (frame, zChains, fill, paint, band) with the app's look flags (fillRec 2, bandRec 1,
// bandRecGpu 1). Per drag: each part's p50 / mean over R passes (after 2 warm passes) and the GC time
// (PerformanceObserver gc entries) that fell inside the zChains and fill calls, per frame.
//   node .claude/probes/K1247/k1247s28_build.mjs .claude/probes/K1341/k1341s1_time.ts <outDir>
//   node <outDir>/k1341s1_time.mjs <s18 drag root> [R=6] [drags=def,muse_hash,fat] [mode=all|zf]
// mode zf (for a .cpuprofile): the tables computed once, then only zChains + fillFrame, R passes.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PerformanceObserver, performance } from "node:perf_hooks";
import type { SceneIn } from "../../../src/render/outline/outline";
import { OB_DI, alignJunctionArms, frame } from "../../../src/render/outline/outline";
import { OutlineModel } from "../../../src/render/outline/outline_model";
import { fillFrame } from "../../../src/render/outline/fill_tri";
import { paintFrame, zChains } from "../../../src/render/outline/draw";
import { sectionPaint } from "../../../src/render/outline/paint";
const [root, Rs = "6", dl = "def,muse_hash,fat", mode = "all"] = process.argv.slice(2);
const R = Number(Rs);
const gcs: [number, number][] = [];
new PerformanceObserver((l) => { for (const e of l.getEntries()) gcs.push([e.startTime, e.startTime + e.duration]); }).observe({ entryTypes: ["gc"] });
const inWin = (a: number, b: number): number => { let t = 0; for (const [s, e] of gcs) { const lo = Math.max(s, a); const hi = Math.min(e, b); if (hi > lo) t += hi - lo; } return t; };
const q = (a: number[], p: number): number => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
const mean = (a: number[]): number => a.reduce((s, v) => s + v, 0) / a.length;
const res: Record<string, Record<string, number>> = {};
for (const nm of dl.split(",")) {
  const dir = join(root, nm);
  const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
  const scenes = files.map((f) => {
    const s = JSON.parse(readFileSync(join(dir, f), "utf8")) as SceneIn;
    (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
    Object.assign(s.look, { fillRec: 2, bandRec: 1, bandRecGpu: 1 });
    return s;
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = new OutlineModel(scenes[0]) as any;
  const buf = {};
  if (mode === "zf") {
    const pre = scenes.slice(1).map((s) => { const sc = alignJunctionArms(m.st, s); OB_DI.on = true; return { sc, table: frame(m.st, sc) }; });
    const t0 = performance.now();
    for (let r = 0; r < R; r++) for (const { sc, table } of pre) fillFrame(m.fs, m.st, table, sc, zChains(sc), buf);
    console.log(`${nm} zf ${R} passes ${(performance.now() - t0).toFixed(0)} ms`);
    continue;
  }
  const P: Record<string, number[]> = { frame: [], zChains: [], fill: [], paint: [], band: [], gcZ: [], gcF: [] };
  for (let r = 0; r < R + 2; r++) for (let i = 1; i < scenes.length; i++) {
    const t0 = performance.now();
    const scene = alignJunctionArms(m.st, scenes[i]);
    OB_DI.on = m.bandRec !== null;
    m.table = frame(m.st, scene);
    const t1 = performance.now();
    const zz = zChains(scene);
    const t2 = performance.now();
    const fr = fillFrame(m.fs, m.st, m.table, scene, zz, buf);
    const t3 = performance.now();
    paintFrame(m.pd, fr, sectionPaint(scene, "app", m.baseHue), m.rec ? m.rec.nDyn : undefined);
    m.recFrame = fr.rec ?? null;
    const t4 = performance.now();
    m.band = m.bandOf(scene, zz);
    const t5 = performance.now();
    if (r < 2) continue;
    P.frame.push(t1 - t0); P.zChains.push(t2 - t1); P.fill.push(t3 - t2); P.paint.push(t4 - t3); P.band.push(t5 - t4);
    // GC entries arrive asynchronously; keep the windows and attribute at the end.
    P.gcZ.push(t1); P.gcZ.push(t2); P.gcF.push(t2); P.gcF.push(t3);
  }
  await new Promise((r) => setTimeout(r, 50));
  const g = (w: number[]): number => { let t = 0; for (let k = 0; k < w.length; k += 2) t += inWin(w[k], w[k + 1]); return t / (w.length / 2); };
  const o: Record<string, number> = {};
  for (const k of ["frame", "zChains", "fill", "paint", "band"]) { o[`${k}50`] = q(P[k], 0.5); o[`${k}Mean`] = mean(P[k]); }
  o.gcZ = g(P.gcZ); o.gcF = g(P.gcF);
  res[nm] = o;
  console.log(`${nm.padEnd(9)} ` + ["frame", "zChains", "fill", "paint", "band"].map((k) => `${k} ${o[`${k}50`].toFixed(2)}/${o[`${k}Mean`].toFixed(2)}`).join("  ") + `  gcZ ${o.gcZ.toFixed(3)} gcF ${o.gcF.toFixed(3)}`);
}
if (mode !== "zf") console.log("JSON " + JSON.stringify(res));
