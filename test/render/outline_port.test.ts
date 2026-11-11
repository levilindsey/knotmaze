// K1240 S4: src/render/outline equals the prototype's default path.
// .claude/probes/K1240/s4/k1240s4_eq.ts checked the port against the
// prototype (.claude/probes/K1240/proto) on K1240's 12 scenes, bit for bit,
// at the first frame (the page: buildOutline + buildDrawData(.., "app")) and
// at a second, moved frame in the carried order (OutlineModel.update). Its
// digests are pinned here: ring from a committed fixture, g41_ring_tw42 when
// its scene is on disk (.claude/probes/K868/scenes, untracked); eq.txt in
// .claude/probes/K1240/out/s4/ has all twelve.
// A port or prototype change that moves an output fails here; re-run the
// tool, check EQUAL against the prototype, then re-pin.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { OutlineModel, diagramKey } from "../../src/render/outline/outline_model";
import type { SceneIn } from "../../src/render/outline/outline";
import { digestOut, loadScene } from "./outline_digest";

type Pin = { f0: { table: string; paint: string; band: string }; f1: { table: string; paint: string; band: string } };

// From .claude/probes/K1240/out/s4/eq.txt (k1240s4_eq.ts, 2026-11-10: all
// 12 scenes EQUAL to the prototype at frames 0 and 1).
const PINS: Record<string, Pin> = {
  ring: { f0: { table: "eb8d71ed276b39a3", paint: "d576e92f8dc923ff", band: "d60de7814e62c01d" }, f1: { table: "ff804403e48659c1", paint: "649fb47c4cce79d8", band: "090775f172b680ad" } },
  g41_ring_tw42: { f0: { table: "fb41a33853c68f12", paint: "4c0e7a971b3ff09d", band: "f676f6ddb859356c" }, f1: { table: "5f9432ea1beea2c2", paint: "730e817437d2d5b8", band: "42cfed2f285c467a" } },
};

// The tool's second frame: every chain point rotated 0.3 rad and moved.
const moved = (s: SceneIn): SceneIn => {
  const t = structuredClone(s);
  for (const c of t.chains) for (let i = 0; i < c.pts.length; i += 2) {
    const x = c.pts[i];
    const y = c.pts[i + 1];
    c.pts[i] = 1.3 + Math.cos(0.3) * x - Math.sin(0.3) * y;
    c.pts[i + 1] = -0.7 + Math.sin(0.3) * x + Math.cos(0.3) * y;
  }
  return t;
};

const run = (s0: SceneIn): Pin => {
  const m = new OutlineModel(s0);
  const out = () => digestOut({
    table: m.table,
    paint: { idx: m.pd.idx, run: m.pd.run, src: m.pd.src, pos: m.pd.pos, key: m.pd.key, w: m.pd.w, s: m.pd.s, tex: m.pd.tex, copies: m.pd.copies, ks: m.ks },
    band: { bandPos: m.band.bandPos, bandCol: m.band.bandCol, bandAlpha: m.band.bandAlpha, bandCount: m.band.bandCount },
  });
  const f0 = out();
  const s1 = moved(s0);
  expect(diagramKey(s1)).toBe(m.key);
  m.update(s1);
  return { f0, f1: out() };
};

describe("K1240 S4 outline port", () => {
  it("ring (committed fixture) equals the prototype's pinned outputs", () => {
    const s0 = loadScene(fileURLToPath(new URL("./fixtures/outline_ring.json.gz", import.meta.url)));
    expect(run(s0)).toEqual(PINS.ring);
  }, 60_000);

  const dir = fileURLToPath(new URL("../../.claude/probes/K868/scenes/", import.meta.url));
  const extra = join(dir, "g41_ring_tw42.json");
  it.skipIf(!existsSync(extra))("g41_ring_tw42 (scene on disk) equals the prototype's pinned outputs", () => {
    expect(run(loadScene(extra))).toEqual(PINS.g41_ring_tw42);
  }, 60_000);
});
