# Muse batch 22 Run K (22K): six junction residuals on today's master

Master's sha, named once: **79014b00** (full
79014b00f6d36e00a6de94ed8e997c900d86a51d). Every shot below reads that
build in its page stamp (`P4 v0.4.0 79014b00`); all runs were probes
only (`&snd=none&phw=0` on every link), shot headed in real time at
dsf 1.5 unless a row says otherwise, under the perf lock (owner 22K,
`.claude/probes/K1208/run_k/run_locked.ps1`). Master advanced during
the run by ledger/docs-only commits (47bf0d9d, c0a72eb8); no `src/`
changed, so every result still reads 79014b00's code. One same-state
control pair was not run per item; the same-build determinism control
that was run is K424's: its 12-move walk reproduced identically on a
second load (same hidden count, same candidates, same numbers).

Looks stay with Claude: this table says what was measured, never
whether it looks right.

| Item | Stand (link, moves) | Present or gone | The number | Crop | What draws it |
|---|---|---|---|---|---|
| K744 | `?7&am=instant&fw=0&snd=none&phw=0&cru=alternate` and `&cru=cycle` (K138 s1 seed 7; K749's named junctions mnode_109, node_259, mnode_125 / mnode_156) | **Gone** | Dark-patch pixels (>45 RGB from local median, >20 luma below) inside 1.3 half-widths: alternate 15/32/32 of ~2900 px webs-on vs 16/63/50 webs-off; cycle 3/0/14 vs 3/53/29. At fit view, 0 dark px at 8 junctions × 2 rules | `out/k744_alternate_on.png` (mnode_109 zoomed: smooth pink→magenta fan blend) | Nothing draws a patch: the fan (junction field over the fillet meshes) blends smoothly; the remaining dark pixels are ribbon edges/casing, present with the fans hidden (`filletMesh`/`filletTopMesh` `renderable=false`) and slightly more numerous there |
| K734 | `?7&txt=ai&am=instant&snd=none&fw=0&phw=0#glyphs2` (K643 desk verbatim except snd=manual→none; 1600x1000 dsf 3, xh 3) | **Gone** | Interior annulus (0.3–0.75 half-widths) of all 3 junctions: 0 sharp pixels (1-px RGB step >6), largest step 2.2/255 webs-on | `out/k734_on.png` (ji0, the i fork: smooth gradient, faint wide rim shading only) | No hairline remains for anything to draw; with the fans hidden the step rises to 10.1/255 (the ribbons' straight cuts under the fan), so today's fan smooths rather than seams. On the record it showed on adc6535b's era build (K643 Handoff); no bisect run, it is gone |
| K424 | `?2gozcj&xp=threads&snd=none&fw=0&am=instant&phw=0` + K397's deterministic 12-move walk (salt 3), explore clock pinned at 1000 (K397 jgate copied; only host/port and +phw=0 changed) | **Present** | 171 of 183 junctions hidden after the walk; 2 candidates hidden while an arm shows: jn81 (vis 0.091 at 0.5 ctrl, 0.313 at 1.0 ctrl) and jn161 (0.5 at 0.5 ctrl, 1.0 at 1.0 ctrl). Junctions 87 and 160 are both still hidden; the candidate beside them is indexed jn161 today (index drift since c4e6ccd) | `out/k424_crop.png` (jn81 zoomed: the visible arm ends, reveal dots beyond it, no web at the junction) | The thread reveal's joint gate: `exploreJointShown` (src/render/ribbon/explore_gaps.ts) hides a junction until every arm's gate visibility at its slot passes EXPLORE_JOINT_MIN (0.002); the fan pass then draws nothing for it (src/render/ribbon/joinery.ts gate skips). Read directly through `r.exploreJointState()` / `r.exploreVisAt`. Shows since at least c4e6ccd (K397 stage 1, 2026-10-15, on the record; no bisect run) |
| K15 | `?7&am=trace-roots&as=0.3&fw=0&snd=none&phw=0` (trace-roots slowed to speed 0.3, named here) | **Gone** | Pixel polls (6 frames × 8 junctions): the fan reads fully opaque only once its arm reads ≥0.917, and at ji34 the fan reads 0 while the arm already reads 0.583. CPU gate polls (66 × 11 junctions): worst fan-alpha lead over the arms' reveal masks 0.016 | `out/k15_crop.png` (ji34 at the measured frame: arm 58% shown, fan absent) | Nothing draws it now: the fan's alpha is `knotFanAlpha` of the joint gate (invisible until every arm is revealed at slot+0.8 ctrl, src/render/ribbon/reveal_fx.ts), so the fan follows the base ribbon instead of jumping ahead of it. The over-fills G1 deleted are not involved (no fill turns opaque early) |
| K218 | `?k111&am=instant&fw=0&snd=none&phw=0&pv=trail&trl=5` + K1139 cyc moves 0, 246, 82, 83, 199, 150, 151, 38, 155, 211 (plus cross5, loop13 and seeds 2–5 walks; 7 stands) | **Gone** (at every stand tried) | 12 declared faded caps across 7 stands: mirror p with caps declared vs caps removed (`setPaint` without caps, probe-only) differs by 0.0000 everywhere along every cap's chain. The step at the worst cap's radius (0.028 p per 0.02 arc) is the span's own fade and is unchanged with caps off | `out/k218_crop.png` (the worst cap's junction: band and ribbons, no cap disc) | The caps are declared (`buildTrail` in src/render/fabric_maze_renderer.ts, radius max(0.22, tw·0.6) = 0.312) but at routed junctions `writePaintItems` (src/render/ribbon/paint_state.ts) skips them — the route band and the spans draw the junction's p. No tried stand produced a surviving faded cap (a fully-traveled or fading-web junction), so the flat-p step draws nowhere tried |
| K678 | 50 seeds (`?1..50&txt=ai…` text scenes read for joins; the count itself on `?<seed>&am=instant&fw=0&snd=none&phw=0` fabric at rest through the settle) | **Not reached** (none of 50 seeds) | Prototype counter patched before the scene builds (probe-only), counted through each settle: 35,288 coverPairs calls, 0 round-join samples inside cover strips, 0 fallbacks (room < 9). Settled fills carry 0 round joins on 45 seeds, 1–2 on the other 5 | — (no stand reached it, so no crop) | The fallback (`RibbonMesh.coverPairs`, src/render/ribbon_mesh.ts:462, room < 1 + ROUND_ARC_SEGMENTS) needs a routed junction whose cover strip (src/render/ribbon/joinery.ts:2605) contains a round-join sample near its end. Fabric strips never contain one (settled ribbons turn too gently), and text scenes carry joins (1 per "ai") but no routes, so no cover strips. The path is exercised only by its unit test (test/render/ribbon_round.test.ts:536) |

## Notes per item

- K744 stands: at rest (0 moves), not K749's walked state; the named
  junctions and both rules are K749's. Colour distance measured against
  the local 5x5 median, so smooth fan blends do not count as patches.
- K734: all three "ai" junctions measured; ji0 is the i fork (K643's
  sheet geometry). xh 2 was not shot; the item names xh 3 only.
- K424: the walk, the candidate rule (vis > 0.002 at slot or vis05 >
  0.05) and the clock pin are K397's jgate, copied; the crop is jn81
  because jn161's point sat outside the first crop's zoom window. Both
  runs of the walk agreed exactly.
- K15: `as=0.3` slows the frontier; the reveal still completes in
  about 9 s of wall time because the hidden pre-settle runs it ahead
  (K147). Two independent reads (pixels, gate alphas) agree.
- K218: "gone" is bounded by the stands tried: seven trail stands, 12
  caps, all at routed junctions. A faded cap at a fully-traveled
  junction (K127) would still draw; no walk tried produced one within
  the trail length.
- K678: the counting stand is fabric through the settle (the only
  scenes with cover strips at rest, via the head's pulse bands). Text
  and knot scenes were read for joins as context (text 1, knot 0,
  fabric settled 0–2).

## Scripts

Copied from K1211's kit (read-only from its worktree, never edited
there): `lib.mjs`, `png.mjs`, `vite.private-cache.config.ts` (host env
renamed to K22K_HOST, profile prefix to k22k-). New: `crop.mjs`,
`k744.mjs`/`k744b.mjs`, `k734.mjs`, `k424.mjs`, `k15.mjs`/`k15b.mjs`/
`k15c.mjs`, `k218.mjs`–`k218d.mjs`, `k678.mjs`/`k678b.mjs`/
`k678diag.mjs`/`k678diag2.mjs`, `run_locked.ps1`. Numbers live in
`out/*.json` beside the scripts. The dev server was Vite on port 5980
(the run's range is 5980–5989) with the private-cache config, stopped
when the run ended.

Perf lock: held for every shot/count above (owner 22K). The lock was
shared in turn with K1211-S2's runs; two waits (~100 s and ~50 s)
are inside the runs' wall times. `ctxLost` read 0 on every page.
