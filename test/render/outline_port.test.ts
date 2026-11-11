// src/render/outline's outputs, pinned as a change detector: the table, the
// paint data and the per-vertex band, at the first frame (OutlineModel's
// constructor) and at a second, moved frame (OutlineModel.update). Ring from
// a committed fixture, g41_ring_tw42 when its scene is on disk
// (.claude/probes/K868/scenes, untracked).
// History: K1240 S4 pinned these as equal to the prototype
// (.claude/probes/K1240/proto; k1240s4_eq.ts, eq.txt in out/s4/). Since
// K1283 the prototype is history, not the reference: src is judged against
// form B (k1279_census.ts, k1283_crops.ts), and its own outputs are pinned.
// K1283 moved the arc pieces' cpts to the thread side (r + h from Q), which
// moved f0's table and band; paint and the moved frame did not move (the
// test's rigid 0.3 rad turn leaves every corner degenerate at f1, so f1
// has no arc to move).
// An outline change that moves an output fails here: check it against form
// B, then re-pin on purpose (.claude/probes/K1240/proto/k1283_pins.ts
// prints the digests).
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { OutlineModel, diagramKey } from "../../src/render/outline/outline_model";
import type { SceneIn } from "../../src/render/outline/outline";
import { bandData, zChains } from "../../src/render/outline/draw";
import { digestOut, loadScene } from "./outline_digest";

type Pin = { f0: { table: string; paint: string; band: string }; f1: { table: string; paint: string; band: string } };

// K1283 (2026-11-10): src's outputs, from k1283_pins.ts. Stage 2 re-pinned
// both frames: a corner with no arc now draws a round join (sharpJoinFan),
// and a tail shows only past TAIL_MARGIN (ring's paint digest moved with them).
// K1293: f1 now moves the junction centres too, so its corners are real.
// K1278 s2 re-pinned every paint digest on purpose: fill_tri's s at junction
// mouths and on pieceless strip rows is now the vertex's foot on its thread,
// and a tail over its fan paints the fan's runs; on top of K1283 s2 only the
// paint digests moved (coordinator re-pin at the merge).
// K1283 s3 re-pinned on purpose: tails carry form B's alpha (piece.alpha, in
// the table and the band) and run on to where it reaches 0 (margin -zt, ramp 1),
// so the tails' points moved; g41_ring_tw42's tails are all unburied (alpha 1),
// so only its table (the alpha arrays and the fill stretch) moved. The fill
// keeps stage 2's cut (piece.fpts), so every paint digest is back to stage 2's.
const PINS: Record<string, Pin> = {
  ring: { f0: { table: "c889ab688dbaf96a", paint: "b8170b0df0a1b9e8", band: "816a44d69ee052dd" }, f1: { table: "17e6147e61e758b3", paint: "d85300304eb3c41f", band: "9d3f93d7f1284139" } },
  g41_ring_tw42: { f0: { table: "c19bec9cad36772e", paint: "4297de14331c8db3", band: "28b346eaaf964948" }, f1: { table: "a880ab3f2faabad3", paint: "e213861f4ff64060", band: "819dbecf09c86769" } },
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
  // K1293: the junction centres move with the chains (frame reads j.c), so
  // f1 is f0's rigid image with real corners, not every corner degenerate.
  for (const j of t.junctions) {
    const [x, y] = j.c;
    j.c = [1.3 + Math.cos(0.3) * x - Math.sin(0.3) * y, -0.7 + Math.sin(0.3) * x + Math.cos(0.3) * y];
  }
  return t;
};

// The app draws the band from band_gpu (band_gpu.test.ts ties it to this);
// the pin keeps the prototype's per-vertex band, built from the model's table.
const run = (s0: SceneIn): Pin => {
  const m = new OutlineModel(s0);
  let sc = s0;
  const out = () => digestOut({
    table: m.table,
    paint: { idx: m.pd.idx, run: m.pd.run, src: m.pd.src, pos: m.pd.pos, key: m.pd.key, w: m.pd.w, s: m.pd.s, tex: m.pd.tex, copies: m.pd.copies, ks: m.ks },
    band: bandData(m.table, sc, zChains(sc)),
  });
  const f0 = out();
  const s1 = moved(s0);
  expect(diagramKey(s1)).toBe(m.key);
  m.update(s1);
  sc = s1;
  return { f0, f1: out() };
};

describe("K1240 S4 / K1283 outline pins", () => {
  it("ring (committed fixture) matches the pinned outputs", () => {
    const s0 = loadScene(fileURLToPath(new URL("./fixtures/outline_ring.json.gz", import.meta.url)));
    expect(run(s0)).toEqual(PINS.ring);
  }, 60_000);

  const dir = fileURLToPath(new URL("../../.claude/probes/K868/scenes/", import.meta.url));
  const extra = join(dir, "g41_ring_tw42.json");
  it.skipIf(!existsSync(extra))("g41_ring_tw42 (scene on disk) matches the pinned outputs", () => {
    expect(run(loadScene(extra))).toEqual(PINS.g41_ring_tw42);
  }, 60_000);
});
