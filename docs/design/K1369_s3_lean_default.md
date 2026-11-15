# K1369 stage 3: lean by default under rp=gf, and the Pixel table

Coordinator brief, 2026-11-14. Stage 2's brief and handoff (the numbers, the runner call):
`K1369_s2_motion_rate.md`.

## Where it stands

- **Levi's targets (2026-11-14):** on the Pixel, 30 moves a second in motion is acceptable and 60 is better; the
  intro's physics matters most.
- **Stage 2** (merged at c23261b9): under rp=gf, main skips `renderer.update()` while builds are in flight and the
  hidden fans are off. Two more cuts are exact but probe-only (`__knotGfOpts.lean`): the gap solve writes only
  `bindingPoint(over)`, and the fill mesh's extrude is skipped. Lean is probe-only because the pluck footprint
  reads `eraseExtentPos` / `overHalfPos`, which only the full solve writes. `depth: 2` keeps two builds in flight
  (default 1).
- **Desktop, phone viewport:** in the drag, depth 2 + lean (gf2l) installs 46.5-48 builds a second, against today's
  35-37 fps, with main at 520-550 ms/s against 930. Its sim/wall is about .015 under today's; the physics' cost per
  substep tracks main plus the gf worker's busy time (inferred contention).
- **The Pixel has not been measured:** the phone was in use both times.

## Goal

rp=gf's motion path is lean by default, and the Pixel table says which depth to ship. The technique is yours.

## Done

1. **Lean is the default under gf,** as a mode flag on the renderer (`ribbon_renderer.ts`,
   `ribbon/strip_pass.ts`), not as instance patches from `gf_app.ts`.
   - The full solve runs whenever a pluck is live (or its footprint is still decaying), so the pluck looks the same
     as it does in today's look. Show it: a desktop screenshot pair, mid-pluck, today's look against gf.
   - `k1369s2_lean.mjs` stays exact (rest and mid-drag), and the probe knob still turns lean off for A/Bs.
2. **The Pixel table,** ABBA with equal rests, at the build that holds step 1. Use stage 2's runner call
   (`k1369s2_phone.ps1`, cells today / gf2l / gfl in the intro with the default appearance, the intro with
   `am=instant`, and the drag), with builds per second, sim/wall, touch-to-install latency, thermal status and every
   core's clock per cell.
3. **The depth, decided by that table:**
   - Set `DEPTH` to 2 if, at a matched thermal state, gf2l's builds per second beat today's fps in every cell and
     its sim/wall is within the noise of today's in the intros (the drag may trail by the noise).
   - Otherwise keep 1. Either way, record why.
   - If the Pixel's drag sim/wall falls further at depth 2 than the desktop's, say so; that is the snapshot
     channel's case (the next stage, not this one).
4. **Nothing else moves:**
   - with rp=gf off, today's look is unchanged (the goldens, `byte_identity` included);
   - `npm test` green;
   - the K1362 tables digest (`.claude/probes/K1362/k1362t1_digest.ts`) bit-identical;
   - the pass program unchanged;
   - rp=gf stays off by default;
   - today's desktop main ms per frame no worse.

## Rules

- **Order:** do steps 1 and 4 on the desktop first. Commit, then do the phone.
- **The phone:** the same rules as stage 2's brief.
  - Never wake, unlock or rotate it; never press Home or send it any input; never restart Chrome on it. Open and
    close only your own tabs, through DevTools.
  - Wait at most 30 minutes per attempt.
  - Hold the phone lock for each phone part.
  - No device serials, IP addresses or Tailscale names anywhere.
  - If the phone never comes free, the stage ends with steps 1 and 4 done and the table not run. Say so, and leave
    `DEPTH` at 1.
- **Shell:** PowerShell. Read code through the shell (Select-String, then 40-80-line ranges of Get-Content), with
  outputs under about 40 lines. Use the Read tool only right before an Edit, and to view images.
  - Never pipe a long-running command into `Select-Object -First`.
  - Junction `node_modules` from the main checkout; never `npm ci` or `npm install`.
  - Delete junctions with `(Get-Item <path>).Delete()` before removing a directory.
- **Your files:**
  - `src/render/ribbon_renderer.ts` and `src/render/ribbon/strip_pass.ts` (the lean mode flag only);
  - `src/render/gpu_field/gf_app.ts`;
  - their tests;
  - `.claude/probes/K1369/k1369s3_*` (copy stage 2's tools as needed).
  - Untracked inputs are in the main checkout's `.claude/probes/`: copy them, never write there.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for outputs.
  - Never push, never edit `LEDGER.md`, never touch the main checkout.
  - Never kill a process you did not start. No helpers.
- **Perf lock:** `$env:TEMP\claude-perf.lock` for desktop timings, one line (owner, start time, what), held only
  while timing. If another owner holds it, wait inside one blocking command.
- **Stop:** when Done holds or 2 h after your start, whichever comes first.
  - Run `Get-Date` at the start (put the time in your first commit message) and at each milestone.
  - Leave the last 20 minutes for the write-up: commit WIP, append a handoff to this brief with your start and stop
    times, release the locks, report.
  - Neither a compaction nor context size is a stop.

## Report

Under 30 lines:
- what changed;
- the pluck screenshot pair's path;
- the Pixel table, with the clocks;
- the depth decision and why;
- the checks;
- your verdict on Levi's targets (30 and 60 a second in motion, the intro first) and what the next stage needs;
- your last SHA.

End with `Ledger items` and K1369's handle fields.

## Stage 3 handoff (K1369 s3 agent, start 2026-11-14 20:03:24, stop 20:54)

Done holds: lean is gf's default, the Pixel table ran, `DEPTH` stays 1, and nothing else moved.

**What changed** (895619f3, src; probes after it):
- `RibbonRenderer.lean` (default false) is a mode flag. gf_app's attach sets it unless `__knotGfOpts.lean === false`
  (the A/B knob); detach clears it. No instance patches from gf_app (`test/render/lean_mode.test.ts` pins that).
- An update is lean when `lean` is on and no pluck is active (`plucks.activeCount === 0`, which holds while a
  pluck's footprint decays): the gap solve writes only diagData's x, y from `bindingPoint(over)`, and
  `StripPass.extrude` skips the fill mesh. With a pluck live, every update is the full solve.
- `leanFresh()`: after a lean update, `pluck()` and `pickThread()` first run one full update, so the footprints
  (`eraseExtent*`, `overHalf*`) and `underWindows` they read are the full solve's.
- Checks: `k1369s3_lean.mjs` is exact at rest and mid-drag (F/L and F2/L2 0 differences, the F/F2 control 0). A pick
  and a pluck after a lean update read the full solve's values bitwise; a live pluck runs the full solve and, once
  cleared, it is lean again; `lean: false` turns it off; today's look has it off.

**The pluck pair** (`k1369s3_pluck.mjs`; untracked `.claude/probes/K1369/out/s3_pluck7/pair_p6.png`,
`pair_p18.png`): seed 7 at today's defaults, phone viewport, the pluck at chain 72 ctrl 106, frames 6 and 18. Both
looks draw the same pluck U at the same site; the palettes differ (gf is form B's cream). The s1/s2 link
b.FMKB4DIQ is no look pair: its threadLook is "border", which today's look draws as outlines only and gf as filled
threads.

**Done 4:**
- `npm test` green at 895619f3 (238 files, 3023 passed, 18 skipped); only probes changed after it.
- The K1362 tables digest is bit-identical, HEAD against 1a3db8ad (5446 lines, 0 differ); no change to gf_glsl,
  gf_pass, gf_pack or tables; rp=gf is still query-only (frame_loop.ts untouched).
- Today's desktop main ms/frame (seed 7, the today setting, ABBA 2 reps, `k1369s2_desk.mjs`): master 1a3db8ad
  intro 28.29 / drag 26.95, head intro 28.38 / drag 26.88, within run noise (main about 930 ms/s in every run).

**The Pixel table** (20:38-20:50 at 395d2206, whose src is 895619f3; `k1369s3_phone.ps1`, the s2 runner under this
stage's lock owner; stage 2's cells on link b.FMKB4DIQ, ABBA 2 reps, before each cell a rest to thermal status 0 and
skin at most 37.5 C, up to 120 s). JSON and table text are untracked: `.claude/probes/K1369/out/motion_s3a.json`,
`motion_s3a_table.txt`. Rate is today's app fps or gf's installs per second. Each cell gives rep 0 / rep 1. The
Pixel has 7 cpufreq cores: cpu0-1 (max 2649 MHz), cpu2-5 (3379) and cpu6 (4109). Clocks are p50 MHz.

| cell | rate | sim/wall | ms/substep | touch p50/p90 ms | thermal (skin C) | cpu0-1 | cpu2-5 | cpu6 | GPU |
|---|---|---|---|---|---|---|---|---|---|
| today intro-d | 32.9 / 30.2 | .710 / .675 | 11.0 / 12.0 | - | 0 (31.0) / 0 (38.0) | 787-691 / 691-614 | 3148 / 2899 | 4109 / 3898 | 1286 |
| gf2l intro-d | 50.9 / 54.3 | .767 / .694 | 10.3 / 11.7 | - | 0 (31.5) / 0 (37.3) | 883 / 883 | 3379 / 3379 | 4109 / 4013 | 883 / 940 |
| today intro-i | 18.0 / 17.8 | .840 / .794 | 9.5 / 10.1 | - | 0 (32.3) / 0 (37.1) | 533-614 / 691 | 2035-2169 / 2035 | 4109 | 1286 |
| gf2l intro-i | 53.4 / 52.4 | .795 / .773 | 10.3 / 10.4 | - | 0 (33.3) / 1 (37.2) | 883-787 / 691-614 | 3379 / 3379 | 4109 | 825 / 940 |
| today drag | 17.6 / 17.7 | .707 / .671 | 11.0 / 11.6 | 62/79, 62/79 | 0 (34.1) / 1 (37.3) | 533 / 394 | 768 / 394 | 4109 / 3898 | 1286 |
| gf2l drag | 43.6 / 40.3 | .505 / .488 | 15.3 / 15.8 | 48/76, 46/76 | 0 (37.5) / 1 (37.3) | 691 / 1344-1036 | 3148 / 3148 | 4013 / 4013 | 825 / 940 |
| gfl drag | 20.6 / 19.4 | .807 / .737 | 9.6 / 10.6 | 78/97, 78/99 | 0 (36.8) / 0 (37.8) | 1152-1036 / 1344 | 2304 / 2035 | 4109 / 4013 | 460 |

gf's app fps was 56.8-59.8 in every gf cell. The threads, as run / run-queue wait in ms per wall second:

| thread | gf2l drag | gfl drag | today drag | intros |
|---|---|---|---|---|
| physics worker | 689/239, 623/335 | 883/39, 898/72 | 819/156, 780/171 | gf2l 802-884 / 53-96, today 706-806 / 71-169 |
| main | 604/113, 570/156 | 422/30, 425/43 | 416/79, 401/80 | |
| gf builder | 711-732 | 456-473 | | gf2l intros 689-746 |

**The depth: `DEPTH` stays 1** (`gf_app.ts`).
- gf2l beats today's rate in every cell: 52.6 against 31.5, 52.9 against 17.9 and 42.0 against 17.6 (means).
- Its sim/wall is within the noise of today's in the intros: intro-d .730 against .693, and intro-i .784 against
  .817. The intro-i gap is -.033, against a spread between reps of .022 to .073 per cell.
- The drag fails. Sim/wall falls to .496, against today's .689 and gfl's .772: -.19, which is 3 to 8 times that
  spread. Both reps are at matched thermal states (rep 0 both status 0, rep 1 both 1). The brief lets the drag
  trail only by the noise. The table tool's bar also reads intro-i as "below", but its rule is a strict
  sim/wall >= today's, with no noise allowance.
- **The snapshot channel's case:** on the Pixel, depth 2 costs the drag's sim/wall .19 against today's look and
  .28 against depth 1. On the desktop it cost .015 (s2), so the Pixel falls much further.
  - Under gf2l's drag, the physics worker's run-queue wait rises to 239-335 ms/s (gfl: 39-72), and its time per
    substep to 15.3-15.8 ms (gfl: 9.6-10.6).
  - Meanwhile main runs 570-604 ms/s (gfl: 422-425) and the builder 711-732 ms/s.
  - Reading: the three threads contend for the cores, inferred from schedstat. Which cut frees the physics is not
    isolated.
  - In the intros, depth 2 costs the physics nothing measurable.

**Levi's targets** (30 a second in motion, 60 better, the intro first):
- **Intro.** Depth 2 reaches 52-54 installs a second (app about 59.5 fps), with the physics within noise of
  today's. 30 is met, and 60 is close. Today draws 31.5 fps with the default appearance and 17.9 with
  `am=instant`.
- **The shipped depth 1 has no intro row.** Stage 2's runner call puts gfl in the drag only. Its 20 a second in
  the drag (a ~50 ms round trip) suggests about 20 in the intros too (inferred).
- **Drag.** Depth 1 runs 20 a second with the physics whole, below 30. Depth 2 runs 42 a second with the physics
  at half speed. Neither meets 30 with the physics whole.
- **Latency.** Touch to install is 47 ms p50 at depth 2 and 78 ms at depth 1, against today's 62 ms touch to
  pixels.

**Residuals:**
- (a) siteTester (`input_pointer.ts:875`, `auto_audio.ts:114`) reads footprint widths that lean leaves stale.
- (b) Under lean, `underWindows` is empty, so rp=gf loses the under-gap gating of:
  - the reveal FX frontier sparks;
  - the telegraph rim ends;
  - burn sparks;
  - the yarn's under-gap visibility;
  - underClipBand (`fabric_maze_renderer.ts`);
  - `joinery.ts:1575`.
- (c) K1385 is unchanged: after detach, lean-stale fills and gaps stay until the next awake update.
- (d) gf ignores threadLook "border". So every today-vs-gf row on b.FMKB4DIQ (s1, s2 and this table) compares
  today's outline-only look against gf's filled threads.

**Next:**
1. The snapshot channel: the physics worker posts positions to the gf worker, and main only uploads. Then re-run
   this table at depth 2 for the drag (`k1369s3_phone.ps1`, the same cells plus gfl in the intros).
2. A choice for Levi: depth 2 while no pointer is down, where the intro's physics holds, and depth 1 during a drag.
   Not built: this brief sets one depth.
3. Add gfl intro cells to any later table: the shipped default has no intro row.
