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
// K1283 s4 re-pinned on purpose: fill_tri paints a round end at every end arm
// (DiskItem, decided in fillStructure), so every paint digest moved; the tail's
// band walks on past X's arm start onto X's other arm and wherever it lies in
// X's tube (wCut 0, tailAlpha fades it), so the tails' points (table, band) moved.
// K1283 s4 (blots, 2f091862): the band's alpha is read at the point it draws, 0 outside
// X's tube and on E's side within X's border band, so the tails moved again.
// K1283 s5 re-pinned on purpose (2026-11-11): a fold away from an arm root is cut into
// form B's chevron (cutFoldsC: the border's points, so the table, the fill and its paint
// moved), and the band's side gate fades by 1 - ramp instead of dropping to 0 outside X's
// arm stretch (the tails' alpha: table and band). Checked against form B (census, sweep).
// K1283 s6 re-pinned on purpose (2026-11-11): a round end is DISK_R rings, keyed just under
// its fan and sampling the fan's paint where it lies over it, so only the paint digests
// moved (table and band unchanged). Checked against form B (seam --fbstep, census, sweep).
// K1283 s8 re-pinned on purpose (2026-11-11): a fold cut keeps its uncut meet (the cut
// mirror, MEET_MIRROR: the chevron's points, so table, paint and band moved); s8's no-meet
// burial (NOMEET_BURY) leaves ring unchanged. The meet and the paint both read the chevron's
// interpolated s (CF_S2_PAINT on; off, tried in 7d0ae1a0, failed the colour bar).
// Checked against form B (census, sweep, seam).
// K1283 s9 re-pinned on purpose (2026-11-11): frame tails and fill strips paint their foot's
// s (fill_tri footS, every 8 columns; CF_TIE, tried, is off and leaves ring unchanged),
// and an untied run at a failed corner fades into its tail (runEndFade): table, paint and
// band moved. Checked against form B (census, sweep, seam).
// K1283 s11 re-pinned on purpose (2026-11-11): a run fades into its tail at a failed corner
// whose end arm is B too (RUN_FADE_B: table and band), and a chain lying inside another's
// tube with no crossing between them is tied there (draw.ts CONTACT_PASSES: band). Paint
// is unchanged on ring; g41_ring_tw42's paint pins were already stale at master f1a39b95
// (its scene is not committed, so the test skipped there) and take master's own digests.
// Checked against form B (census, sweep, seam).
// K1314 s2 re-pinned on purpose (2026-11-11): sharpJoinFan draws no fan whose short way
// turns against the border (da > 0), and runEndFade fades no run at a near-straight or
// reflex failed corner (RUN_FADE_TH) or whose faded points all lie within 0.15 h of the
// run's end (RUN_FADE_MIN): table (ring and g41_ring_tw42, f0 and f1). A tied run's band
// reads its own p.alpha (draw.ts bandData), but no band pin moved with these. Paint is
// unchanged on both. Checked against form B (census s2b, crops).
// K1314 s3 re-pinned on purpose (2026-11-11): a through pass's bend at a junction is a
// corner (K1049: diagramOf flags it thru, cornersPhaseC rounds it like any corner under
// pi, else dead), and a stub's end-cap tail under that bend reads the arc as X's inner
// edge (TailIn.bend): table, paint and band (ring and g41_ring_tw42, f0 and f1). Checked
// against the S1b/S1c fillet (form_b_fillet; census, crops in out/s3).
// K1314 s5 re-pinned on purpose (2026-11-12): a fill strip whose two border pieces span
// different s ranges keys each border row by its own side's s and its centre by the higher
// of the row's and the mid s's depth (fill_tri fillFrame): paint only, f0 and f1, on ring
// and g41_ring_tw42 (its scene is untracked, so s5's run skipped it; re-pinned at the
// merge after the pre-s5 master was checked to pass with the scene on disk).
// K1314 s6 re-pinned on purpose (2026-11-12): an ok corner's arc takes the run's foot at
// each end it shares with a run (outline arcEndFeet: table and band), and a fill strip
// whose border pieces span different s ranges samples both on one s scale, its centre
// keyed at the mid s unless the ranges part at a junction end (fill_tri fillFrame JEND_GATE:
// paint): every digest, f0 and f1, on ring and g41_ring_tw42. Checked against form B (census s6, crops in out/s6).
// K1314 s8 re-pinned on purpose (2026-11-12): cutFoldsC cuts a bend within h of an arm root
// unless it also lies within h of an open end, and an end fold's chord normal faces the end's
// centre: table, paint and band on ring (f0 and f1), table on g41_ring_tw42 (f0 and f1).
// Checked against form B (census s8f, crops in out/s8).
// K1324 s1 re-pinned on purpose (2026-11-12): a contact pass between two FULL members of one
// junction group (form B's member(): cap ramp 1) is no tie (draw.ts CONTACT_GROUPS, groupArms,
// groupMember): band only, f0 and f1, on ring and g41_ring_tw42 (the j12 specks). Table and
// paint unchanged. Checked against form B (census k1324g, crops in .claude/probes/K1324/out/s1).
// K1247 s27 re-pinned on purpose (2026-11-12, coordinator at the merge): a junction fan's mid-mouth
// vertex takes its arm centreline's cone key, and an unmatched strip's border row puts its edge's
// midpoint on the cone (fill_tri FLOOR_EDGE, c8's quad): paint only, f0 and f1, on ring and
// g41_ring_tw42. Checked against form B (census s27a, crops in .claude/probes/K1247/out/s27).
const PINS: Record<string, Pin> = {
  ring: { f0: { table: "276636e58a693c3b", paint: "e57b025dc17996ca", band: "c7d0acec83f744ae" }, f1: { table: "884b7cf4c709b5c6", paint: "a32ea02671fd16bb", band: "18d50ba8e6dde409" } },
  g41_ring_tw42: { f0: { table: "11c7cdb8da1b9891", paint: "c06a2bc79a0cc3d1", band: "04aed65d7f33bcd6" }, f1: { table: "1f89393aff28b751", paint: "cc9e773970557908", band: "4591b35dc2e61f25" } },
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
