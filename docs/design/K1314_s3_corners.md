# K1314 stage 3: rounded corners at through-pass bends (K1049) in rp=outline

Ledgers: K1314 (this), K1049 (the decision), K1310 (the gate), K1240 (the redesign). One Claude Opus agent in
its own worktree, on its own branch from master. Cap 2 h. Read first: `docs/design/K1240_gate.md`, the
handoffs at the end of `docs/design/K1314_s1_census.md` and `docs/design/K1314_s2_spikes.md`.

## Why

Levi chose the look at junctions where a thread passes through and bends (2026-11-11, K1049):
"Rounded corner". This is the fillet that K1040's S1b and S1c drew (`docs/design/K1040_s1d_corner.md`
F2, and F6's Look with crops). Form B and rp=outline both still draw the sharp inner corner. The census
counts 14 of these (k1049, 6 on g41_ring_tw42): `.claude/probes/K1314/out/s1/crops/sheets/k1049_01.png`
in the main checkout (form B | today, misframed: ignore it | rp=outline). The census plan's group 3 says
where they come from: outline.ts skips the through pair's corner in `buildOutlineFull` (~662, the skips
at ~907 and ~1066) and in `diagramOf` (~3023, skip ~3043). fill_tri.ts's junction fan must then follow
the rounded corner. This stage moves the gate's look line: the census's k1049 count.

Stage 2 also left one port: `band_gpu.ts`'s tied quad (~241) must pass `p.alpha` (when
`p.alpha.length === 2*np`) and `i`, as `draw.ts` `bandData`'s tied branch now does. Until then, the GPU
path still draws the black bars at muse_hash j78. Do it first, and check it against the CPU twin
(`alphaCpu`).

## Goal

Every k1049 find becomes the rounded corner, drawn by one rule in the code that builds the corners, with
no new artifact of any kind. The technique is yours. At these spots, the reference is the fillet of
S1b/S1c, not form B. Make the census compare the corner against the fillet there, so the rounding does
not count as ink or fill out of place.

## Done

- **Census** (`k1314_run.ps1`, then its merge): k1049 at 0, and no other kind's count above stage 2's
  (stray_ink 19, hard_edge 4, paper 2, broken_ink 15). Say in the report what the census compares at the
  K1049 spots, and how.
- **The port:** the GPU band against `alphaCpu` at muse_hash j78, within its existing tolerance.
- **Crops:** fillet reference | before | after for each of the 14 finds, plus any new find of any kind,
  from your final commit, in `.claude/probes/K1314/out/s3/`. I view them before merging.
- **The gate's per-stage checks:**
  - the desktop worker frame on def, ABBA under the perf lock: not worse than master by more than the
    run-to-run spread (`k1314_s2_bench.ps1`);
  - `npm test` green;
  - the golden snapshots unchanged and today's look byte-identical;
  - `outline_port.test.ts`'s pins re-frozen only where your fix moves them, named in the commit.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never
  print a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long
  results to a file and read only the lines you need). The Read tool only right before an Edit, and for
  viewing crops. Junction `node_modules` from the main checkout; never `npm ci`. Read
  `.claude/rules/probes.md` before probing: a bare URL is today's daily. Real-time headed Chrome only;
  never `--virtual-time-budget`.
- **Your files:** `src/render/outline/outline.ts`, `draw.ts`, `band_gpu.ts`, and `fill_tri.ts` outside its
  record code; tests; your tools and outputs under `.claude/probes/K1314/`. The K1247 stage 21 agent is
  changing the record code at the same time: `chain_frame.ts`, `rec_glsl.ts`, `fill_tri.ts`'s record code
  (`fillStructure`, `recStrip`, `stripNb`), `outline_app.ts`, `outline_model.ts`, `outline_worker.ts` and
  `src/app/frame_loop.ts`. Stay out of those. If the junction fan's change needs the record code to
  follow, say so in the report and don't edit it.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did
  not start. Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time,
  and delete it after. While someone else holds it, wait inside one blocking command; a lock older than
  30 min is stale. The census renders: don't run it while another owner holds the lock.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Leave the last 25 minutes for the checks. Then commit WIP, append a handoff to this
  brief and report. Neither a compaction nor context size is a stop; after a compaction, re-read this
  brief and `git log`.

## Report

Under 40 lines:
- the census counts per kind, before and after;
- the port's check;
- the rule you used and where it lives (file and function);
- the worker frame on def, before and after;
- the crop paths;
- what is left;
- your last SHA.

End with `Ledger items` and K1314's handle fields.

## Handoff (s3 agent, 2026-11-11)

Branch `worktree-agent-a4e6c1c337ca465db` (worktree `.claude/worktrees/agent-a4e6c1c337ca465db`), from
c51244ea. Not pushed. Code and tools at 08f25f4b; this handoff is the commit after it. Stopped at the
cap with Done NOT reached: k1049 is 0 at all 14 stage-2 finds, but 5 other through bends stay sharp
(below) and the census counts 20 finds at them.

**The port (done, 30911dc1):** `band_gpu.ts`'s tied quad reads the run's own `p.alpha` (as draw.ts
`bandData`'s tied branch since s2); the shader multiplies the tie by attr `.w`. Check
(`k1314_s3_band.ts muse_hash 78`): worst |alphaCpu*w - tie*own| 2.6e-9 within 3 h of j78 (7 faded tied
quads), 5.4e-8 over the scene, tolerance 1e-3; before the port the GPU drew those quads at the tie
alone, off by up to 1.0 (the black bar). `band_gpu.test.ts`'s .w test covers tied runs too.

**The rule (`outline.ts`):**
- `diagramOf` keeps a through pass's two arms at a junction as a corner flagged `thru` (form B and the
  old outline skipped the pair: the sharp V, K1049).
- `cornersPhaseC` solves a thru corner like any other (same fillet solver, so r equals the S1b/S1c
  fillet's); it is dead (`cornerDeadThruC`, no fan, no fallback: stage 2's sharp V) when an arm span is
  0, when theta >= pi (reflex), or when the solve fails. The builder mirrors that much (`cornerPairs.thru`,
  `thruDead`).
- 08f25f4b: `cornersPhaseC` now solves every other corner first, then the through bends; a through
  bend also dies ("through: past a junction") when its tangent foot on either arm passes `thruRoomC`:
  the next junction's root on that chain less that junction's corner foot back along the same stretch.
  Without it muse_hash j135/j78/j98's r 3.1-3.8 h arcs ran into j20/j77/j154's corners (a border spur,
  that junction's fill unbordered; crops in 092c696a's run). Fast path only: the builder does not
  mirror it. It kills 3 bends on muse_hash and 2 on g41_user_tw64 (j48, j49), none of the 14; the
  ring and g41_ring_tw42 pins did not move.
- A stub's end-cap tail buried under X at such a bend reads the arc as X's inner edge
  (`TailIn.bend`, `bendDist` in `tailAlphaAt`; `piecesPhaseC` finds X's ok thru corner). Without it the
  cap's fade zone showed as a dark blotch under the new arc (g41_ring_tw42 j4, g41_def_tw42 j174).
  Fast path only, like `alt`.

**The census at the K1049 spots:** `k1314_census.ts` rasters `form_b_fillet.ts` (a probe copy of form B
with the corner loop's through skip removed) and uses it in place of form B at every pixel whose
`cornersNear` includes a thru corner (cached in `out/fbf/`); elsewhere form B as before. The k1049
detector compares the outline's corner for the same thru arm pair (08f25f4b: it took the nearest
same-chain corner, which falsely matched a chain's end-to-through corner at g41_ring_tw42 j13/j22) with
the fillet's reach, 2.5 px. `--nofillet` keeps s2's form B reference.

**Census (`k1314_run.ps1`, s2b -> s3c at 08f25f4b):** stray_ink 19 -> 29, hard_edge 4 -> 4, paper 2 -> 7,
broken_ink 15 -> 18, k1049 14 -> 1, total 54 -> 59. Against s2b: gone all 14 k1049 and 1 stray_ink;
new 20, every one at the 5 declined bends: muse_hash j78, j135, j98 and their neighbours j77, j20, j154
(9 stray, 3 paper, 3 broken) and g41_user_tw64 j48, j49 (2 stray, 2 paper, 1 k1049). There the outline
keeps stage 2's sharp V and the fillet reference draws its big arc. Nothing moved anywhere else.
(s3b, 092c696a, before the rule: the same 14 gone, 5 new finds at the spurs.)

**Bench (def, mid-drag, desktop worker, ABBA, `k1314_s3_bench.ps1`, out/s3/bench_def.json):** outline
frame p50 A c51244ea 62.8 / 61.7 ms, B 08f25f4b 62.4 / 57.4; worker reply p50 A 184.5 / 188.4, B
194.2 / 176.0; rest frame 5.9 both. B within A's run-to-run spread.

**Crops:** `.claude/probes/K1314/out/s3/spot_001..014.png` (fillet | before c51244ea | after 08f25f4b);
spots in the order user_tw42.lightpaper j27, g41_def_tw42 j15, j65, j174, g41_ring_tw42 j4, j9,
j12, j14, j15, j20, g41_ring_tw64 j4, j14, g41_user_tw42 j27, g41_user_tw64 j28. No crops of the 20
new finds yet (they are the 5 sharp bends).

**Tests:** `npm test` green at 08f25f4b (225 files, 2928 tests); golden snapshots unchanged; today's
look byte-identical by construction (outline code loads only under rp=outline).

**Left:**
- The 5 declined bends (muse_hash j78, j135, j98; g41_user_tw64 j48, j49): round them without the spur.
  The arc's foot lies 0.6-0.8 h short of the next junction and overlaps that junction's corner; the
  outline must join the two (the fillet reference draws it clean). Or Levi decides whether a 3 h arc
  along a long gentle bend is the look he wants there.
- ring_tw64 j4: the thru corner is dead "V outside spans" and the fillet has none either (no find).
- The builder (`buildOutlineFull`) mirrors neither `thruRoomC` nor `TailIn.bend`.

**Evidence** (`.claude/probes/K1314/`, tools committed with `-f`): `form_b_fillet.ts`,
`k1314_s3_thru.ts` (`--list` prints each thru corner's r against the fillet's), `k1314_s3_extra.ts`
(the fillet's arms and corners at a junction next to the outline's), `k1314_s3_band.ts`,
`k1314_crops.ts --before=<dir>`, `k1314_s3_bench.ps1`; census `out/s1/census_s3c.{json,txt}`.
