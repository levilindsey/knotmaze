# K1247 stage 23: main places the band records, then the band records become the default

Ledgers: K1247 (this), K1310 (the gate), K1240 (the redesign). One Claude Opus agent in its own worktree, on
its own branch from master. Cap 2 h. Read first: `docs/design/K1240_gate.md`, and the handoffs at the end of
`docs/design/K1247_s22_band_records.md`, `K1247_s19_shader_fill.md` and `K1247_s20_records_look.md`.

## Why

Stage 22 gave the band one fixed layout per structure behind `ob=1` (`src/render/outline/band_rec.ts`). It
restructures on 0 frames of the bench's drags, down from 27 of 28 on def. The worker still places every
record on the CPU and ships 44 B per vertex. So `ob=1` costs more than today: def band part 62-65 → 69-72 ms,
worker frame 174-179 → 183-190 ms, reply 22.7 → 28.8 MB, band vertices 457k → 603k. The fill solved the same
problem in stages 19-20: main places the record columns by transform feedback (`REC_PLACE_VS`), from
`chainTex`. This stage does the same for the band, and moves the gate's first speed line.

## Goal

With `ob=1`, the worker sends the band's layout and per-record parameters, not placed vertices. Main places
the tied runs and ghosts on the GPU, as it places the fill's records. Make `ob=1` cheaper than `ob=0` on the
worker frame and the reply, then make it the default. The technique is yours. Today's look (no `rp=outline`)
stays byte-identical.

## Done

1. **Speed:** ABBA under the perf lock, `ob` on against off, on def and fat. Report the band part, the worker
   frame, the reply MB, the band vertices, the placement pass's GPU cost, and the main frame at rest and
   mid-drag. The bar: worker frame and reply below off by more than the run-to-run spread; main frame no
   worse than off beyond the spread.
2. **Fidelity:** every band vertex within 1/4 device px of today's band over the drags, run ends included.
   Stage 22's worst were run-end columns: muse_hash c71 at 1.155 px, def c24 at 0.533. Its inferred cause,
   not checked: today's end vertex sits on the clipping border, the record's on the chain normal. The 5
   through bends that K1314 stage 4 joined are included too: muse_hash j78, j98, j135 and g41_user_tw64 j48,
   j49. That join rewrites a finished neighbour corner's arc end to the meet point X, and adds X to two
   junction polygons. The census against form B with `ob=1` equals `ob=0` within 1%.
3. **Slack:** trim the spare capacity for runs that fall back when a structure is built, so the band
   vertices with `ob=1` are no more than `ob=0`'s plus what the fixed layout needs. Report both.
4. **The flip:** if 1 and 2 hold, `rp=outline` uses the band records unless `ob=0`. Re-freeze
   `outline_port.test.ts`'s pins only where the flip moves them, and name them in the commit. If 1 or 2
   doesn't hold, leave the default and report what blocks it.
5. **Crops:** off | on | |difference| at the five worst spots per drag, from your final commit, in
   `.claude/probes/K1247/out/s23/`. Do the same in the app's paint at rest (`k1247s20_appdiff.mjs`). I view
   them before merging.
- **Checks:** `npm test` green and the golden snapshots unchanged. Delete any copied form B cache before
  you stop (stage 22's was 3.5 GB).

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never
  print a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long
  results to a file and read only the lines you need). The Read tool only right before an Edit, and for
  viewing crops. Junction `node_modules` from the main checkout; never `npm ci`. Read
  `.claude/rules/probes.md` before probing: a bare URL is today's daily. Real-time headed Chrome only;
  never `--virtual-time-budget`.
- **Your files:** `band_rec.ts`, `draw.ts` (`bandData`, `zChains`), `band_gpu.ts`, the record code
  (`chain_frame.ts`, `rec_glsl.ts`, `fill_tri.ts`'s `fillStructure`/`recStrip`/`stripNb`, `outline_app.ts`,
  `outline_model.ts`, `outline_worker.ts`), `src/app/frame_loop.ts`, new files of your own, tests, and your
  tools under `.claude/probes/K1247/`.
- **`outline.ts` is shared.** The K1314 stage 5 agent works in its corners and pieces at the same time
  (`cornersPhaseC`, `thruRoomC`, `thruFitC`, `piecesPhaseC`, `cutFoldsC`). In `outline.ts`, add hooks and
  fields only, behind `ob`. Don't change what it draws. If a fidelity miss comes from ink logic there, say
  so in the report with the function and line.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did
  not start. Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time,
  and delete it after. While someone else holds it, wait inside one blocking command; a lock older than
  30 min is stale.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Leave the last 25 minutes for the checks. Then commit WIP, append a handoff to this
  brief and report. Neither a compaction nor context size is a stop; after a compaction, re-read this
  brief and `git log`.

## Report

Under 40 lines:
- the speed numbers on and off;
- the fidelity numbers, and what the run-end miss was;
- the band vertices before and after the trim;
- whether the default flipped;
- the crop paths;
- what is left;
- your last SHA.

End with `Ledger items` and K1247's handle fields.

## Handoff (paused by Levi)

Paused 2026-11-11 at about 23:26, partway through the stage. The default did not flip; Done 1, 3, 4 and 5 were not started.

**What 1512b6d7 does.** `ob=1` (`__knotOutlineBandRec`) now sends band_rec's per-piece table instead of placed vertices, and main places the band.
- The worker sends: a BT = 5 texels a piece table, the quads it still places itself (faded runs and non-record pieces, compact, in `fb`/`fbSl`), and the fan-step prefix (`pf`).
- Main places every vertex of the fixed layout in one transform-feedback pass per reply: new `src/render/outline/band_place.ts` (BAND_PLACE_VS, built on REC_GLSL's recCol/recZ), run by `outline_app.ts` `placeBand`.
- `BandRecState(gpu)` in band_rec.ts; outline_worker's OutlineReply carries `bandRec`; outline_model passes `look.bandRecGpu`.
- The K299 list (paint_ring_lap.test.ts) has band_place's `mod(d, L)`.
- tsc is clean. `npm test` has not been run.

**What the twin measured** (`.claude/probes/K1247/k1247s23_twin.ts` (WIP ee10f587), real BAND_PLACE_VS in headed Chrome, RX 6800 XT):

| Check | def (29 frames) | fat (34 frames) |
|---|---|---|
| GPU vs CPU records, device px | p99 2e-4 | p99 3e-4 |
| dC, alpha, chain | exact | exact |
| Padding quads with area | none | none |
| Quads with other slots | 2 | 65 |
| Fidelity vs today, GPU (ppu 40) | max 0.533, 83 of 56827 pieces > 0.25 px | max 0.225, 0 > 0.25 px |
| Fidelity vs today, CPU records | same as GPU | same as GPU |

- The GPU adds no fidelity loss: the misses are the records' own.
- The few GPU vs CPU vertex gaps (def f23 d775, 3.8 px; fat f9 d387, 5.4 px) are one fan column landing one column later. This is a float32 vs float64 tie in recCs's `floor(x + 0.5)`. Both versions sit on the same border vertices, so the band shape does not move.
- The fat slot differences come from the past-4 nearest-in-s rule or the same tie. They are not attributed yet.
- muse_hash did not run: the session restart killed it.

**Untested.**
- The app path: `rp=outline&ob=1` in a page, GL errors, and whether the band draws.
- `npm test`.
- muse_hash and the K1314 through-bends (muse_hash j78, j98, j135; g41_user_tw64 j48, j49).
- The run-end miss: def c24 0.533 is still there, and its cause is still unchecked.

**Left.**
- Done 2: run the twin on muse_hash, then fix the run-end miss in band_rec (column 0/N on the clipping border vs the chain normal).
- Done 3: the slack trim, with band vertex counts before and after.
- Done 1: the ABBA bench under the perf lock, plus the TF pass's GPU cost.
- The census (ob=1 vs ob=0 within 1%).
- Done 4: the flip in frame_loop.ts, with the outline_port pins.
- Done 5: the crops and the app diff.

**Exact next step.**
1. `node scripts/run_node.mjs .claude/probes/K1247/k1247s23_twin.ts C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1247\out\s22\drag\muse_hash --out=.claude/probes/K1247/out/s23/twin_muse_hash.json`
2. `npm test`.
3. A headed smoke of `?<seed>&am=instant&rp=outline&ob=1` on a private dev server.

## Handoff (s23 resumed, 2026-11-12, 23:56-01:35)

Commits on `worktree-agent-aa65540a6e30e2162`: 8e20b975 (run-end arcs placed as today's: band_rec endFans,
band_place texels 5-7), bea6e03c (one-vertex fan pieces; a polyline test for the arc's offset end), d278dcf8 (a
two-point piece lerps its end columns), e5182672 (a present arc's floor 12 vertices), 79f206e0 (twin slot split).
Outputs (untracked): `.claude/probes/K1247/out/s23/`, census in `out/s22/census/census_s23{R,G}.*`.

**Speed (Done 1), ABBA on e5182672, RX 6800 XT, `k1247s23_bench.ps1`; off -> on, both runs each.**
| | def `?b` | fat `?p9ar6.FHFUnxp1_T-IDyQ9` |
|---|---|---|
| worker drag p50 ms | 146.8 / 127.6 -> 97.3 / 103.4 | 126.6 / 130.0 -> 98.2 / 98.0 |
| band part ms | 45.9 / 43.9 -> 11.1 / 13.1 | 39.8 / 39.3 -> 12.8 / 13.0 |
| reply | 22.74 -> 5.94 MB | 23.25 -> 6.68 MB |
| main frame mid-drag ms | 8.8 / 8.4 -> 6.5 / 6.4 | 8.4 / 8.4 -> 6.7 / 6.7 |
| main frame at rest ms | 5.6 / 5.8 -> 5.8 / 5.7 | 5.8 all |
| band vertices | 457158 -> 572754 | 465498 -> 570096 |
| buffer resizes mid-drag | 24-26 -> 0 | 26-27 -> 0 |
The bar holds (worker and reply far below off, main no worse). Caveat: def off run 1 overlapped a 3.6 GB file copy
(146.8 vs 127.6); even the faster off run beats on by 24 ms. The TF pass (`tfprobe.txt`, a readPixels sync per
pass, taken under CPU load) costs p50 4.8 ms def / 4.7 fat, max 14.5, and is NOT in the bench's frame clock.

**Fidelity (Done 2), `k1247s23_twin.ts` on the s22 drags, GPU = CPU records.** Pieces over 1/4 px: def 2 of 56827
(max 0.296), fat 0 of 58208 (0.212), muse_hash 2 of 39585 (0.488). def c61 d730 f10/f14: v109 (s 8.2792) lies
inside the clipped span but colRow gives its two-point fan no column (r0 jumps to v110's fan at s 8.3555); moving
the span start to the clip point's footS changed nothing (reverted). muse_hash c8 d121 f4 0.488 / f7 0.416:
duplicated end points, uneven steps, the clip at radius 0.416. The K1314 through-bends: the mh junctions sit in the
muse_hash drag the twin covers whole; g41_user_tw64 j48/j49 were NOT checked (no captured drag of it; the
K1040 `g41_user_tw64.json` files are census results, not scenes).
Slots: quads whose slot list differs from today's split into the recCs float32 tie (a moved vertex, max 3.4-4 px,
same border) and slots only: def 1 + 0, fat 22 + 31 (one adjacent pass more or fewer at s 200-440, the float32
window edge, inferred), muse_hash 26 + 4925. The 4925 are the documented past-BAND_SLOTS rule (GPU keeps the passes
nearest in s; CPU and today keep footNear, band_rec.ts:450). The CPU census below cannot see them.

**Census (ob=1 CPU records vs ob=0, `k1247s22_census.ts`, ppu 160, min 40): identical.** def 3, fat 0, muse_hash
20, TOTAL 23 (stray_ink 15, broken_ink 7, hard_edge 1); owner_only 701, tail_look 114 on both.

**Slack (Done 3), `k1247s23_slack.ts`, 6Q max:** def 560220 -> 535710 (1.171 x today's 457326), muse_hash 575994 ->
554202 (1.220 x 454308), fat 354168 unchanged (1.061 x 333702). No new decimation; still decimated: mh record runs
past q0+2 mid-drag (137 piece-frames) and 7 wide pieces, def 3 record runs.

**Crops (Done 5):** `out/s23/crops/crops_{def,fat,muse_hash}.png` (off | on | |diff| at the five worst per drag;
worst def f14 c61, fat f17 c3, mh f4 c8): thin one-pixel edge slivers. App paint at rest (`k1247s20_appdiff.mjs`,
`out/s23/smoke2/rest_off_vs_ob1.png`): 398 of 5.76M px differ, scattered single pixels.

**Flip (Done 4): NOT done, blocked by** (1) 4 pieces over 1/4 px (def c61 d730, mh c8 d121); (2) the GPU's
past-4 slot rule differs from today's in 4925 mh quads, which no census measures; (3) g41_user_tw64's
through-bends unchecked. `npm test` green, golden snapshots unchanged.

**Next, in order.** Port footNear's past-4 choice to BAND_PLACE_VS (or add a GPU-record census mode and show it
moves nothing); fix colRow's column for a fan just inside a start clip (def c61 d730 v109); fix mh c8 d121; capture
a g41_user_tw64 drag and run the twin; count the TF pass in the bench's frame clock; then the flip in frame_loop.ts
and the outline_port pins.
