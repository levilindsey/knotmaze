# K1314 stage 1: the artifact census of rp=outline (find, classify, count; no fixes)

Ledgers: K1314 (this), K1310 (the gate), K1240 (the redesign). One Claude Opus agent in its own worktree, on
its own branch from master. Cap 2 h. Read first: `docs/design/K1240_gate.md` and the stage 11 handoff at
the end of `docs/design/K1283_s11.md`.

## Why

Levi, after a crop sheet of form B against rp=outline (`.claude/probes/K1240/out/k1310/sheet.png`):
"in general rp=outline looks a little better for most cases. But there are still plenty of unacceptable
artifacts." So the outline's own look is the target, and the bar is zero artifacts. Today no check counts
them: the census measures distance to form B, which also penalises places where the outline is better,
and the sweep reported "no stray ink" while j59 shows black bars. The fix stages need a count to drive to 0.

## Goal

A census that finds every artifact rp=outline draws at rest, says what kind it is and which part of the
outline draws it, and counts them. Artifacts, by kind (examples are from the sheet):
- **Stray ink:** dark ink that is not a thread's border or a cut's end, such as blocks, flecks, bars and
  spikes (x134's block at the salmon thread's end, j59's bars, j58's spike, the flecks in K1045's eye at
  muse_hash j73/j74).
- **Hard colour edges:** a sharp colour boundary inside a thread's fill where colours should blend or not
  meet (the teal wedges at g41_user_tw64 j8/j9; x201, x292 and x325's corners).
- **Paper holes:** paper showing inside a fill, or a notch bitten out of a border.
- **Broken ink:** a border that stops short, a gap in a border, or a cut that does not close.

The detection technique is yours. Today's look and form B can serve as references (where both agree and
the outline departs sharply, look closer), but an artifact is judged on its own: a spot where the outline
differs from form B and looks right is not one. This stage does not change `src/`.

## Done

- **The census tool** under `.claude/probes/K1314/`: one command that renders rp=outline on master's src
  and prints the count per kind, per scene. The scenes are the seam test's 12 plus def, fat, ring and
  muse_hash. It writes a JSON list of artifacts: scene, place (world and crossing or junction id), kind,
  size in px, and the part that draws it (border, cut, corner arc, fan, fill strip, tail or band, with its
  file).
- **Validated:** it finds the sheet's examples (x134, j59, j58, g41 j8 and j9, x201, x292, x325) and the
  K1045 eye. Its false positives are measured by viewing a random 20 of its finds; report how many were
  not artifacts, and tune until at most 2 are.
- **Crop sheets:** numbered crops, form B | today | rp=outline with the artifact circled, for every find,
  grouped by kind, in `.claude/probes/K1314/out/s1/`. Write the totals on the first sheet. I view them
  before reporting to Levi.
- **The fix plan:** the artifacts grouped by cause (the same part and the same reason), largest group
  first, each with the file and function it lives in. This is the next stages' list.
- **Checks:** `npm test` green (nothing in `src/` changes).

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never
  print a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long
  results to a file and read only the lines you need). The Read tool only right before an Edit, and for
  viewing crops. Junction `node_modules` from the main checkout; never `npm ci`. Read
  `.claude/rules/probes.md` before probing: a bare URL is today's daily. Real-time headed Chrome only;
  never `--virtual-time-budget`.
- **Your files:** your tools and outputs under `.claude/probes/K1314/`. Reuse the tools in
  `.claude/probes/K1240/proto/` (`k1283s11_crops.ts`, `k1279_census.ts`, `k1278s2_seam.ts`, the
  `k1283_vite.config.mjs` config) by copying them. `src/` is read only: the K1247 agent is changing
  `src/render/outline/` at the same time.
- **Load:** the K1247 agent times frames under `$env:TEMP\claude-perf.lock`. While that lock is held by
  someone else, don't run renders or builds; wait inside one blocking command (older than 30 min is
  stale). You don't time anything, so you never take the lock.
- **Commits:** WIP on your branch at each milestone. `git add -f` for tools, never for outputs. Never push,
  never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not start. Never
  touch the phone.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Then commit WIP, append a handoff to this brief and report. Neither a compaction nor
  context size is a stop; after a compaction, re-read this brief and `git log`.

## Report

The counts per kind and scene; the validation (found or missed, false positives in 20); the fix plan's
groups with their files; crop paths; your last SHA. Under 40 lines. End with `Ledger items` and K1314's
handle fields.

## Handoff (stage 1 agent, 2026-11-11)

**Tools** (`.claude/probes/K1314/`, headers give usage): `k1314_census.ts` (the census; `--merge=` re-tallies
saved JSON without rendering), `k1314_run.ps1` (three parallel groups at ppu 160 then the merge, ~10 min
with form B cached under `out/fb/`), `k1314_crops.ts` (form B | today | rp=outline crops; `--sample`,
`--top`, `--spots`; waits out the perf lock), `k1314_sheet.ps1` (sheets), `k1314_peek.ts` (ASCII map of a
spot). Outputs (untracked) in `out/s1/`: `census_s1d.{json,txt}` is the current census (s1b's render
with s1's tuning, `reclassS1`, applied).

**Method.** The CPU twin of rp=outline (structure, frame, fill_tri fills, section paint, band ink) and
form B (`FormB.evalPoint`) rasterized at 160 px/unit in 1280 px tiles; per-pixel detectors (ink where
form B has none, ink missing, paper holes and covered paper, owner and colour steps); connected
components of at least 40 px (paper 10), attributed to the nearest crossing or junction and to the
outline part under the pixels. K1049 is geometric: a through-pass bend with no corner record, counted
when a rounded corner would move the inner edge 5 screen px or more at the scene's camera. The scenes
are the 12 whose scene JSON exists (def, fat, ring, muse_hash, muse_default_tw, user_tw42 and the six g41).

**Counts (census_s1d):** stray_ink 22, hard_edge 4, paper 2, broken_ink 15, k1049 14: **57 finds at 47
spots** (a square end can count as stray and broken; j156 three times). By scene: muse_hash 18,
g41_user_tw64 10, g41_ring_tw42 7, g41_def_tw64 5, g41_ring_tw64 4, muse_default_tw 4, def 3,
g41_def_tw42 3, ring 1, user_tw42 1, g41_user_tw42 1, fat 0. Informational: owner_only 2326, tail_look 151.

**Validation.** Found: j58/j59 (one spot: stray spikes, band:run), the K1045 eyes (muse_hash j73
covered + j74 spike; j156 covered), K1049's bends. Found only as owner_only (not counted):
g41_user_tw64 j8/j9, x201, x292, x325. Their wedges show in the K1310 sheet's per-chain hues; in the
app paint the junction colours converge (diff at most 0.016). Found as tail_look (not counted): x134's
square block, a band:tail end this pixel test can't tell from the acceptable short tails. Missed:
hairline paper cracks at junction arm roots (g41_ring j7/j9/j15, g41_def j174, g41_user_tw64 j26), under
the paper minimum. False positives in a random 20: sample 1, 12; sample 2 (seed 2), 11; sample 3
(seed 3), 8 (6 of 8 broken_ink, all band:run or fill:strip under-tail ends); each tuned by `reclassS1`;
sample 4 (seed 4, s1d, after the last tuning): **4 of 20, above the bar of 2**. The four: a junction tail
dot that rp=outline omits cleanly (def j76, broken_ink); a stray hook at g41_user_tw64 j28 (band:run,
86 px) and a short dark tail at muse_hash j29 (band:tail, 53 px) that read as tail ends; a K1049 bend
(g41_ring_tw64 j14, 5.7 px) whose small paper eye already reads round. Real stray finds go down to 45
px and FP ones up to 86, so no size cut separates them; s2 needs the end-shape test.

**Fix plan (by cause, largest first).**
1. Square under-tail ends at junctions (15 fill:junc + 3 stray cut, e.g. muse_default_tw j150,
   g41_user_tw64 j63/j64, g41_def_tw64 j97; x134 belongs here): rp=outline ends a junction's under-tail
   with a square bar or hook where form B ends it with a round dot. fill_tri.ts `fillFrame` (junction
   fan, ~564), `fillStructure` (~299), `stripNb` (~439); outline.ts tails `runEndFade` (~7153),
   `tailFoot` (~7725), `tailAt` (~7794), `tailRamp` (~7815), `tailF` (~7829); draw.ts `tieAlpha` (~612).
   The 151 tail_look finds are shorter tails that look right; leave them.
2. Stray spikes in the band ink (19): corner arcs 9 (outline.ts `cornersPhaseC` ~6155,
   `cornerFallbackC` ~6077), run pieces 9 (muse_hash j58, j78, x15, x22, x304: black bars across a strand
   at a junction or crossing; outline.ts run pieces, draw.ts `bandData` ~638 and `zChains` ~189), tail 1.
3. K1049 sharp inner corners at through-pass bends (14, 6 on g41_ring_tw42): outline.ts skips the
   through pair's corner in `buildOutlineFull` (~662; the skips at ~907 and ~1066) and `diagramOf`
   (~3023, skip ~3043); the fill_tri.ts junction fan must follow the rounded corner. Spec: K1040
   S1b/S1c, `K1040_s1d_corner.md` F2/F6.
4. Hard colour wedges (4: g41_ring_tw64 x67/x68, g41_user_tw64 j71, muse_hash j78; on the sheet the
   first three read as hard, j78's disk barely): fill ownership in fill_tri.ts `fillFrame` (strip 3, disk 1).
5. K1045 covered eyes (2 spots: muse_hash j73, j156; 5 finds): the junction fan covers the eye where
   Levi chose form B's open eye with a border. fill_tri.ts `fillFrame`; outline.ts must border the eye.
6. Not counted yet: the hairline cracks (fill_tri junction fan seams) and x134's square tail block. s2
   needs a line detector and an end-shape test.

**Crops:** `out/s1/crops/sheets/` (every counted find, `000_totals.png` first), `out/s1/crops_info/sheets/`
(the 18 largest owner_only and tail_look), FP samples `out/s1/fp2`, `fp3`, `fp4`, named spots
`out/s1/named2/`.

**Next:** Levi views the sheets; then a fix stage per group, each rerunning `k1314_run.ps1` (then the
merge) to drive its group's count to 0. Detector debts: x134's end shape, the hairline cracks.