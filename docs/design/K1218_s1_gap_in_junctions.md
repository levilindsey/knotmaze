# K1218 S1: inside a junction the fan draws alone, with no ribbon showing through a crossing's gap

Ledger: K1218 (the gold zigzags in the T and the four), plus K1219's triangle. Stage agent: Claude
Opus in its own worktree, started by the coordinator while K1211 S4 runs in other code; cap 2 h;
ports 5980-5989.

## Start

Your worktree starts from master, which holds Run O's record (f9f625a5,
`.claude/probes/K1218/run_o/`). If it lacks this brief, `git fetch -q origin` and
`git merge --ff-only origin/master`. For `node_modules`, make a junction to the main checkout's:
`New-Item -ItemType Junction -Path node_modules -Target C:\Users\lsl\Repositories\knotmaze\node_modules`.

## Why

Levi, 2026-11-05 (K1211): "There are clear lines/edges of the highlight within the interior of the
junction. These seem to be artifacts of how the original threads are constructed before the
threads were fused and/or the rounding was applied. These junctions need to appear as though they
are one whole fused seamless unit."

K1211 S2 found two flaws at rest that its fix didn't reach, and Run O (22O,
`.claude/probes/K1218/run_o/SUMMARY.md`) found their cause:

- **The zigzags** (loop ji 89, 12 and 88). Inside a junction, a crossing's gap slot masks the fan
  within the over thread's silhouette (`gap_mask.ts:96`: a tube of 0.260w around the over SAMP
  polyline, inset 1 px, no window clip). The over ribbon's own paint shows through: its crest
  shading, and a straight gold/untraveled split at the joint, since gold spans end at walk-edge
  ends (`walked_gold.ts:172`). At loop ji 89, slot 73 (over ch38@45.53, under ch60@4.40) passes
  0.073w from the joint. At ji 12, twin slots 27 and 28 (over ch38, under ch5) straddle it. Ji 88
  shows ji 89's slot 73, since their fans overlap. Claude, at 3x: a straight-edged paler bar
  across the gold and a straight gold/purple boundary at ji 89; with slot 73 cleared, a smooth S
  (`proof_loop89_noslot73.png`).
- **The triangle** (loop ji 12, K1219). It is ch5's gold at a partial keep (about 0.67) in slot
  28's casing fade, at under arc 4.249, inside its window (4.23 to 5.81). The window's straight
  end and the fade band make the lens (`gap_mask.ts:802`, `:810`; `ribbon_shader.ts:321`).
  Clearing slot 28 erases it.

The line numbers are f9f625a5's.

O's leads (its task 5):

- **(a)** Leave the junction's footprint to the fan. Extend `jointMask`'s clearance
  (`src/render/ribbon/joinery.ts`, near line 1632, with `fanReach`) to slots whose over tube
  crosses a fan, so the fan's round band covers the split. Its cost: the casing of crossings that
  hug a joint.
- **(b)** Round the gold spans' ends to follow the band (`walked_gold.ts` and the gold feed). It
  touches every gold end and leaves the crest.
- **The triangle.** Waive the fade, but not the casing, where the under ribbon is inside a
  junction's `fanReach`, or start the window past the fan (`gap_mask.ts`,
  `ribbon/crossing_gaps.ts`).

Calls that bind every change here:

- Levi, above: a junction reads as one fused piece. Inside its footprint, nothing of a thread from
  before the fusing shows: no ribbon's cut, crest or casing.
- K81: gold never reaches into an off-route arm ("a discontinuous flat nub"). S2's nub check's bar
  is 0.
- K1211 S2's and S3's fixes hold (`test/render/gold_edge.test.ts`, `test/render/web_light.test.ts`).
- Every crossing keeps its over/under read and its casing outside the junction's footprint. A
  crossing away from every junction doesn't change, pixel for pixel.
- A spot is judged against the approved version, never against the last step. Inside the
  junction, that is what the fan draws alone (O's proofs, with the slot cleared). Outside it, it
  is master's crossings.

## Goal

At rest, inside every junction's footprint, the fan draws alone. The gold is the fan's round band,
with no straight cut, crest bar, zigzag or casing triangle. Each crossing near a junction still
reads over and under outside the footprint, and its casing ends at the fan without a new edge.
Nothing changes at a crossing away from every junction.

## Read first

- Run O's `SUMMARY.md`, whole.
- K1211 S2's Handoff (`docs/design/K1211_s2_gold_edge.md`): its nub and corner checks.
- `docs/ledger_notes.md`, the entry `## K1218 (2026-11-05, 22O reviewed)` (Select-String it; read
  to the next `## `).
- The headers of `src/render/gap_mask.ts`, `src/render/ribbon/crossing_gaps.ts`,
  `src/render/ribbon/joinery.ts` and `src/render/walked_gold.ts`. Then read `jointMask` and the
  code at O's locations.

## Tasks

Do these in order. If the cap comes first, the Handoff says what is left.

1. **Census.** Use O's three stands (loop, x4 and cross, as O's `shoot_o.mjs` sets them).
   - List every gap slot whose footprint (a fan slot, or a ribbon's casing or fade) reaches inside
     a junction's footprint.
   - For each, give its over and under threads, and whether each is an arm of that junction
     (passes through its joint, or ends at it).
   - Say which slots show a flaw at rest (a straight edge, a crest bar, a fade), with O's segment
     measure.

   This tells whether the flaws are crossings between two of the junction's own arms, as Levi
   suspects ("how the original threads are constructed before the threads were fused").
2. **The fix.** Keep the CPU twin in step where one exists (`paint_math.ts` mirrors the paint; say
   if the gap mask has none).
   - Try lead (a) first. If the fan no longer being masked leaves a new edge where the crossing's
     casing meets the fan, say where and how large. Fix that in the same files (a ramp at the
     fan's edge, for instance).
   - Fix the triangle by waiving the fade inside `fanReach`, or by starting the window past the
     fan.
   - If a choice of look comes up that the calls above don't settle (how close to a joint a
     crossing keeps its casing, for instance), build at most two variants, the second behind a
     probe switch. Leave the choice to the coordinator.
   - Pin it with a unit test: no slot masks a fan inside the junction's footprint (or the rule you
     land), and a crossing away from every junction keeps its slot unchanged.
   - Re-freeze a pin only where a crossing gap meets a junction, and name it. A pin that moves at a
     crossing away from every junction is a stop.
   - Don't edit `src/render/junction_field.ts`: K1211 S4 is rewriting it. If the fix needs it, stop
     at the cause and say what it would take.
3. **Checks.** Copy O's tools to new names (from `.claude/probes/K1218/run_o/`: `shoot_o.mjs`,
   `lib.mjs`, `png.mjs`, `crops_o.mjs`, `analyze_o.mjs`, `proof_o.mjs`, `run_o.ps1`,
   `vite.private-cache.config.ts`). Also copy S2's `checks2.mjs`, and S3's `shoot3.mjs` and
   `run_shots3.ps1` for the pulse moments (all three from `.claude/probes/K1211/`). Never edit the
   originals. The checks only reject; report the numbers:
   - **The flaws.** At each census junction, run O's straight-segment measure on the gold's edge
     inside the footprint (master: 2-3 segments of 17-46 px at ji 89, 12 and 88). Also give the
     largest difference inside the footprint from the reference (the same shot with that
     junction's slots cleared, as `proof_o.mjs` does).
   - **The triangle.** Its 16 px at loop ji 12, before and after.
   - **Locality.** At rest on the three stands, every pixel more than 2 fh outside a junction's
     footprint is identical to master's. Inside that band, count the changed pixels per junction,
     and name every crossing whose casing changed.
   - **S2's checks.** The nub (bar 0) and the corner check, at rest.
   - **The pulse.** Loop ji 89 and ji 12 at K1190's four moments, master | branch: say whether
     anything changed outside the footprint.
   - **Tests.** `npm test` green, with the moved pins named.
   - **Cost.** What the change adds per fragment in the ribbon and fan shaders (texture reads, loop
     passes, branches). No timing.
   - **Explore mode.** One shot: it draws, and the console has no error.
4. **Sheets.**
   - Columns: master | branch (| the variant) | the reference (slots cleared).
   - Spots: loop ji 89, 12 and 88; x4 ji 149 (its notch is K1219's: say whether it moved); and
     every census junction with a flaw.
   - At 1x and 3x.
   - View every crop yourself at full size, and say per spot what you see against the reference.
     Pick nothing.
5. **Handoff**, appended below.

## K1211 S4 in parallel

K1211 S4 runs in its own worktree. It is rewriting the fan's light (`junction_field.ts` and its CPU
twin), the pulse inputs near the top of `joinery.ts` (lines 80-820), and
`test/render/k320_slim.test.ts`. It should merge before you end. Keep your `joinery.ts` edits to
`jointMask` and the code it calls.

At your end, `git fetch -q origin`, rebase onto `origin/master`, then run `npm test` again. Where
only a pin's number conflicts (`k320_slim`, for instance), take master's side, re-run the pin, and
re-freeze it to what your change gives; name it. If the rebase needs more than that, don't do it:
say what it would take.

## Muse in the main checkout

Muse runs in the main checkout on master during your stage (a Python run, no server) and may push.

## Out of scope

- The fan's colour and light (`junction_field.ts`): the notch (K1219) and the pulse (K1211).
- The text forks (K1220), fire and collapse (K1210), the glyphs (K863, K1112, K1213).
- Anything for Levi.

## Rules

- PowerShell. Read code through the shell (Select-String, Get-Content ranges). Use the Read tool
  only right before an Edit, and to view crops.
- Never touch the main checkout, another worktree or another probe folder. O's untracked full shots
  in the main checkout's `.claude/probes/K1218/run_o/out/` are read-only references. Write your
  own output to `.claude/probes/K1218/s1/`.
- Commit WIP on your branch at every milestone, broken or not. Never push, and never edit
  LEDGER.md.
- No helpers.
- Shoot in real time (never `--virtual-time-budget`), under the perf lock through your copy of the
  shot runner (owner `K1218-S1`). K1211 S4 takes the same lock: wait for it inside one blocking
  command. Run at most two browsers at a time, on ports 5980-5989 only. A dev server's build stamp
  is the SHA it started from, so check the served code.
- Stop rule: stop when the tasks are done or 2 h after your start, whichever comes first
  (`Get-Date` at the start and at each milestone). Then commit WIP, append the Handoff and report.
  A compaction is not a stop: after one, re-read this brief and `git log`.

## Report

In plain words, report:

- the census: how many slots reach inside a footprint, and whether their threads are the
  junction's own arms;
- the fix (and the variant, if any), and what it adds per fragment;
- the checks' numbers per spot, before and after;
- the moved pins, by name;
- the sheets' paths, and what you see at each spot against the reference;
- the rebase;
- your last commit's SHA.

Then give `Ledger items` and K1218's handle fields (owner, branch, last commit, evidence, next).

## Handoff

(The stage agent appends here.)
