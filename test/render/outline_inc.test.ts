// K1247 s30 (K1338): the incremental frame's border cache is exact. With the
// snap on (KF_INC.snap), frame() gives the same table, bit for bit, with the
// cache on and off, across the frames of a drag: a synthetic drag of the
// committed ring fixture (one chain dragged, the rest creeping under T), and
// the app's captured def and muse_hash drags when they are on disk
// (.claude/probes/K1247/out/s18/drag, untracked; k1247s18_capture.mjs).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { OutlineModel } from "../../src/render/outline/outline_model";
import { alignJunctionArms, frame, KF_INC } from "../../src/render/outline/outline";
import type { DiagramStructure, SceneIn } from "../../src/render/outline/outline";
import { digest, loadScene } from "./outline_digest";

const appLook = (s: SceneIn): SceneIn => {
  const look = s.look as SceneIn["look"] & Record<string, number>;
  look.ctrlArc ??= 0.47; look.fillRec = 2; look.bandRec = 1; look.bandRecGpu = 1;
  return s;
};
const stOf = (s: SceneIn): DiagramStructure => (new OutlineModel(s) as unknown as { st: DiagramStructure }).st;

/** Per frame: the table's digest with the cache off and on (each its own structure, both snapped). */
function compare(frames: SceneIn[]): { off: string[]; on: string[]; hits: number; misses: number } {
  const A = stOf(frames[0]); const B = stOf(frames[0]);
  const off: string[] = []; const on: string[] = [];
  KF_INC.hits = 0; KF_INC.misses = 0;
  for (const s of frames) {
    KF_INC.snap = true;
    KF_INC.cache = false; off.push(digest(frame(A, alignJunctionArms(A, s))));
    KF_INC.cache = true; on.push(digest(frame(B, alignJunctionArms(B, s))));
  }
  KF_INC.snap = false; KF_INC.cache = false;
  return { off, on, hits: KF_INC.hits, misses: KF_INC.misses };
}

afterEach(() => { KF_INC.snap = false; KF_INC.cache = false; KF_INC.T = 0.5; });

describe("K1338 incremental frame: the border cache is exact", () => {
  it("ring (committed fixture): a synthetic drag, cache on = off every frame", () => {
    const s0 = appLook(loadScene(fileURLToPath(new URL("./fixtures/outline_ring.json.gz", import.meta.url))));
    const px = s0.camera.pxPerUnit * s0.camera.dpr;
    let seed = 7;
    const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff - 0.5; };
    const frames: SceneIn[] = [];
    for (let f = 0; f < 12; f++) {
      const s = structuredClone(s0);
      s.chains.forEach((c, i) => {
        for (let k = 0; k < c.pts.length; k += 2) {
          // chain 0 dragged 0.3 px a frame near its start; the rest creep by under 0.1 px
          const w = i === 0 ? Math.max(0, 1 - k / 40) : 0;
          c.pts[k] += (w * 0.3 * f + 0.1 * rnd()) / px; c.pts[k + 1] += (w * 0.2 * f + 0.1 * rnd()) / px;
        }
      });
      for (const x of s.crossings) { x.a.s += (0.05 * rnd()) / px; x.b.s += (0.05 * rnd()) / px; }
      frames.push(s);
    }
    const r = compare(frames);
    expect(r.on).toEqual(r.off);
    expect(r.hits).toBeGreaterThan(0);
    expect(r.misses).toBeGreaterThan(s0.chains.length);
  });

  const dragDir = fileURLToPath(new URL("../../.claude/probes/K1247/out/s18/drag/", import.meta.url));
  for (const name of ["def", "muse_hash"]) {
    const d = join(dragDir, name);
    it.skipIf(!existsSync(d))(`${name} (captured drag on disk): cache on = off every frame`, () => {
      const files = readdirSync(d).filter((f) => /^f\d+\.json$/.test(f)).sort().slice(0, 10);
      const frames = files.map((f) => appLook(JSON.parse(readFileSync(join(d, f), "utf8")) as SceneIn));
      const r = compare(frames);
      expect(r.on).toEqual(r.off);
      expect(r.hits).toBeGreaterThan(0);
    }, 60000);
  }
});
