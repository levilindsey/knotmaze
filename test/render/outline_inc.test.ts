// K1247 s30 (K1338), s31: the incremental frame's caches are exact. On a
// snapped scene (snapScene, as OutlineModel.update snaps with KF_INC.snap),
// frameSnapped gives the same table, bit for bit, with the caches (KF_INC.cache:
// borders, corners) on and off, across the frames of a drag: a synthetic drag
// of the committed ring fixture (one chain dragged, the rest creeping under T),
// and the app's captured def, muse_hash and fat drags when they are on disk
// (.claude/probes/K1247/out/s18/drag, untracked; k1247s18_capture.mjs),
// interpolated to SUB frames per captured pair (~60 Hz at 10; the captures are
// ~170 ms apart, so most chains would move past T every frame).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { OutlineModel } from "../../src/render/outline/outline_model";
import { frameSnapped, KF_INC, newSnapState, snapScene } from "../../src/render/outline/outline";
import type { DiagramStructure, SceneIn } from "../../src/render/outline/outline";
import { digest, loadScene } from "./outline_digest";

const appLook = (s: SceneIn): SceneIn => {
  const look = s.look as SceneIn["look"] & Record<string, number>;
  look.ctrlArc ??= 0.47; look.fillRec = 2; look.bandRec = 1; look.bandRecGpu = 1;
  return s;
};
const stOf = (s: SceneIn): DiagramStructure => (new OutlineModel(s) as unknown as { st: DiagramStructure }).st;

/** Per frame: the table's digest with the caches off and on (each its own structure, one snap for both). */
function compare(frames: SceneIn[]): { off: string[]; on: string[]; hits: number; misses: number; cHits: number; cMisses: number } {
  const A = stOf(frames[0]); const B = stOf(frames[0]);
  const S = newSnapState();
  const off: string[] = []; const on: string[] = [];
  KF_INC.hits = 0; KF_INC.misses = 0; KF_INC.cHits = 0; KF_INC.cMisses = 0;
  for (const s0 of frames) {
    const s = snapScene(S, s0);
    KF_INC.cache = false; off.push(digest(frameSnapped(A, s)));
    KF_INC.cache = true; on.push(digest(frameSnapped(B, s)));
  }
  KF_INC.cache = false;
  return { off, on, hits: KF_INC.hits, misses: KF_INC.misses, cHits: KF_INC.cHits, cMisses: KF_INC.cMisses };
}

/** Linear in-betweens of two captured frames (points, crossing s, junction centres and arm s), as k1247s30_inc.ts. */
function lerp(a: SceneIn, b: SceneIn, t: number): SceneIn {
  const s = structuredClone(b);
  s.chains.forEach((c, i) => { const p = a.chains[i].pts; if (p.length === c.pts.length) for (let k = 0; k < p.length; k++) c.pts[k] = p[k] + (c.pts[k] - p[k]) * t; });
  s.crossings.forEach((x, i) => { const y = a.crossings[i]; if (y) { x.a.s = y.a.s + (x.a.s - y.a.s) * t; x.b.s = y.b.s + (x.b.s - y.b.s) * t; } });
  s.junctions.forEach((j, i) => {
    const k = a.junctions[i];
    if (k) { j.c = [k.c[0] + (j.c[0] - k.c[0]) * t, k.c[1] + (j.c[1] - k.c[1]) * t]; j.arms.forEach((r, q) => { if (k.arms[q]) r.s = k.arms[q].s + (r.s - k.arms[q].s) * t; }); }
  });
  return s;
}

afterEach(() => { KF_INC.snap = false; KF_INC.cache = false; KF_INC.T = 0.5; });

describe("K1338 / K1247 s31 incremental frame: the caches are exact", () => {
  it("ring (committed fixture): a synthetic drag, caches on = off every frame", () => {
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
  const SUB = 4;
  for (const [name, nCap] of [["def", 6], ["muse_hash", 6], ["fat", 6]] as const) {
    const d = join(dragDir, name);
    it.skipIf(!existsSync(d))(`${name} (captured drag on disk, ${SUB} frames per pair): caches on = off every frame`, () => {
      const files = readdirSync(d).filter((f) => /^f\d+\.json$/.test(f)).sort().slice(0, nCap);
      const cap = files.map((f) => appLook(JSON.parse(readFileSync(join(d, f), "utf8")) as SceneIn));
      const frames: SceneIn[] = [cap[0]];
      for (let i = 1; i < cap.length; i++) { for (let k = 1; k < SUB; k++) frames.push(lerp(cap[i - 1], cap[i], k / SUB)); frames.push(cap[i]); }
      const r = compare(frames);
      expect(r.on).toEqual(r.off);
      expect(r.hits).toBeGreaterThan(0);
      if (cap[0].junctions.length > 0) expect(r.cHits).toBeGreaterThan(0); // fat is a knot: no corners
    }, 120000);
  }
});
