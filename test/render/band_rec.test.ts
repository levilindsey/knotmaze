// K1247 s22: the band as a fixed layout of records (band_rec.ts, ob=1). On the committed ring fixture, with
// the threads moved by a wave over several frames, the layout keeps one vertex count and is laid out once per
// structure; its vertices stay finite with alpha in [0, 1]; and the hook it needs in outline.ts (OB_DI, the
// pieces' diagram index) changes nothing today's band (ob=0) draws.
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { OB_DI, frame, structure, type SceneIn } from "../../src/render/outline/outline";
import { zChains } from "../../src/render/outline/draw";
import { bandGpu } from "../../src/render/outline/band_gpu";
import { BandRecState } from "../../src/render/outline/band_rec";
import { loadScene } from "./outline_digest";

const ring = (): SceneIn => loadScene(fileURLToPath(new URL("./fixtures/outline_ring.json.gz", import.meta.url)));
/** The scene with every chain point moved by a smooth wave of amplitude a, phase t. */
const wave = (sc: SceneIn, a: number, t: number): SceneIn => ({
  ...sc,
  chains: sc.chains.map((c) => {
    const p = c.pts.slice();
    for (let i = 0; i + 1 < p.length; i += 2) { const x = p[i]; const y = p[i + 1]; p[i] = x + a * Math.cos(0.7 * y + t); p[i + 1] = y + a * Math.sin(0.9 * x + 1.3 * t); }
    return { ...c, pts: p };
  }),
});
const hash = (a: ArrayLike<number>, n: number): number => { let h = 2166136261; for (let i = 0; i < n; i++) { h ^= Math.round(a[i] * 1e6) | 0; h = Math.imul(h, 16777619); } return h >>> 0; };

describe("K1247 s22 band records (ob=1)", () => {
  afterEach(() => { OB_DI.on = false; });

  it("keeps one layout and one vertex count while the threads move", () => {
    const sc0 = ring(); OB_DI.on = true;
    const st = structure(sc0); const h = frame(st, sc0).h;
    const S = new BandRecState(); const counts: number[] = []; let lay: unknown = null; let same = true;
    for (let f = 0; f < 8; f++) {
      const sc = f === 0 ? sc0 : wave(sc0, 0.15 * h * Math.min(1, f / 4), 0.4 * f);
      const tb = frame(st, sc); const zz = zChains(sc);
      expect(tb.pieces.filter((p) => typeof p.di !== "number").length).toBe(0);
      const b = S.band(st, tb, sc, zz);
      counts.push(b.count);
      if (f > 0 && S.lay !== lay) same = false;
      lay = S.lay;
      expect(b.count).toBe(6 * S.lay!.Q);
      let bad = 0;
      for (let i = 0; i < 2 * b.count; i++) if (!Number.isFinite(b.pos[i])) bad++;
      for (let v = 0; v < b.count; v++) { const al = b.attr[4 * v + 3]; if (!(al >= 0 && al <= 1 + 1e-6)) bad++; }
      expect(bad).toBe(0);
    }
    expect(new Set(counts).size).toBe(1);
    expect(same).toBe(true);
    expect(S.relayouts).toBe(1);
  });

  it("the ob hook leaves today's band (ob=0) unchanged", () => {
    const sc = wave(ring(), 0.01, 0.3);
    const run = (on: boolean): number[] => {
      OB_DI.on = on; const st = structure(sc); const tb = frame(st, sc); const b = bandGpu(tb, sc, zChains(sc));
      return [b.count, hash(b.pos, 2 * b.count), hash(b.attr, 4 * b.count), hash(b.slots, 4 * b.count), hash(b.passTex, b.passTex.length), tb.pieces.length];
    };
    const off = run(false); const on = run(true);
    expect(on).toEqual(off);
  });
});
