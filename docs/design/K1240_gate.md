# K1240 gate: when the outline (rp=outline) becomes the default

Ledgers: K1310 (this gate), K1240 (the redesign), K1247 (its frame cost). Levi approved writing it on
2026-11-11 ("Let's do it", K1310). `rp=outline` replaces today's look as the default only when every line
below holds on master. Ink is judged against form B, paint, overlays and reveals against today's look.

## Speed

| Gate | Now (2026-11-11) | Bar |
|---|---|---|
| Desktop, def, mid-drag: the outline's work per moved frame (worker p50 / p95; `k1283s11_bench.ps1`, ABBA under the perf lock) | 183-193 ms p50 | <= 3 / 6 ms (K1247) |
| Pixel, def and dense, mid-drag: the same per moved frame | not measured | <= 16 ms p50 (keeps up with the physics) |
| Pixel, render sync (`k539_g31.mjs`, `QHEAD=rp=outline`, ITER 60, ABBA) on dense / max fabric / knot gs 24 | not measured | <= today's look + 10% (today 110 / 283 / 31 ms) |
| Desktop main frame, at rest and mid-drag, nothing revealing (first draw to readPixels) | 5.8 / 8.5 ms | <= today's look |
| Structure build (once per diagram, in the worker) | 410 ms desktop | first outline frame within 1 s of load on the Pixel |

## Look

Levi on the crop sheet (2026-11-11): "in general rp=outline looks a little better for most cases. But
there are still plenty of unacceptable artifacts." So the outline's own look is the target. Form B is no
longer the bar, only a reference for what an artifact's spot should look like.

- **Zero artifacts:** the K1314 artifact census counts stray ink (blocks, flecks, bars, spikes), hard
  colour edges inside a fill where colours should blend, paper holes or notches, and broken or missing
  ink. Its total must reach 0, and Levi signs off its last crop sheet.
- The first sheet: `.claude/probes/K1240/out/k1310/sheet.png` (form B | rp=outline, master c0531aa1,
  `.claude/probes/K1240/proto/k1310_sheet.ps1`).
- Regression guards, at stage 11's numbers. Each may only improve, except a census change that removes an
  artifact:
  - census against form B (`k1279_census.ts`): total <= 4312, no crossing worse by more than 12 px;
  - end-arm sweep (`k1283s5_sweep.ps1`): no stray ink, muse_hash j59 <= 510, j58 <= 571;
  - outline paint seams (`k1278s2_seam.ts --hist --fbstep`, 12 scenes): <= 5411 over 1/255, <= 444
    steeper than form B;
  - colour census (`k1283s7_colour.ts`): <= 26067;
  - palette and overlays (`s2_guards.ps1 -AbBase`): no worse than K1291 s3;
  - reveal IoUs (`s3_iou.mjs`): no worse than K1291 s3;
  - K1277 (`k1277_check.ts`): missingArmEnds 0, nonfinite 0;
  - jump places (`k1247s15_gain.ts`) on def, fat and muse_hash: no worse than master's.
- App paint seams across junctions (K1278's seam test, once it lands): no junction steeper than today's
  look by over 1 level.
- Today's look stays byte-identical until the flip: shader text, `test/render/paint_*`, the golden
  snapshots.

## Rules for every stage from now on

- The brief names the gate line the stage moves; the report gives that number before and after. A stage
  that moves no gate number does not merge.
- Per stage: the stage's own check, the desktop worker frame on def (ABBA) and `npm test`. The full set
  above runs at merge only.
- A gate number that gets worse blocks the merge, unless the brief named the trade and Levi agreed to it.
