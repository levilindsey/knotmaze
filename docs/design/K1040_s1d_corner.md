# K1040 S1d: a continuous corner solve

Ledger K1040, stage S1d: S1c continued, before S2. One stage: Opus, 2 h
cap. Branch `k1040-field`, worktree
`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k1040-field` (at
master, node_modules joined to the main checkout's). Work only there.
Brief written 2026-10-29 by the coordinating session.

## Why

S1c (merged at f6ad6990) made form B's per-pixel decisions continuous.
Its mechanism table (`docs/design/K1040_s1c_handoff_pops.md` F3) found
no hard switch in the winner, fold, cap, burial or tie. Besides 14
smooth pops (73 px) and one gate pop (4 px), what is left is the corner
solve. 141 of F2's 209 pops (3016 of its 3875 px) are hard switches in
`solveCorner`:

- **V off arm**, 72 pops / 1543 px. solveCorner drops a corner, fill and
  all, the moment V's feet leave an arm. Every one is a pair opening
  toward straight (θ at V's feet 2.89-3.07) with a full fill.
- **The fillet's center**, 53 / 1330 px:
  - Newton's root;
  - the radius bisection's largest feasible r;
  - the tangent foot's nearest segment.

  In a near-parallel channel each one is a discrete choice that flips.
- **Lcut's gate**, 11 / 109 px (room-L, arm L 0). An arm's L jumps,
  because a pass counts only while its cut lies in [0, L].
- **Two smaller gates**, 5 / 34 px (r0, room-dV).

S1c's F4 tried a fade for the largest row (F4j). It cut the pops from
209 to 121, but it also faded fills the oracle keeps at rest, and it
broke the rate rule at every fade width tried. A fade on a discrete
outcome does not fix a switch. The solve itself has to be continuous.

S1's gate (`docs/design/K1040_junction_field.md` F7) asks label_pops'
rule to hold on the four recordings, and S2 and S3 wait for that gate.

The other 53 pops (782 px) are scene changes in the recordings: a chain
resampled, or a junction's arms changed. Form B cannot be continuous
across those, and they are filed apart (K1047). Every pop still counts
(K992).

Levi does not look at this stage.

## Calls that bind

- **Earlier calls.** S1's, S1b's and S1c's calls still bind:
  - watertight at every fade value;
  - the rate rule;
  - each definition change written down as its own Finding;
  - the eyes as they are (S1b F1).
- **Continuous by construction.**
  - The corner's fill is a continuous function of the chain geometry.
  - No gate, root pick, bisection or nearest-segment choice may have an
    outcome that can jump.
  - A fade on a discrete outcome is not a fix (S1c F4).
  - Where a choice cannot be removed, blend over every candidate with
    weights that are continuous in the geometry.
- **The oracle is the look at rest.**
  - Where the corner changes, it matches the oracle's.
  - Past an arm's junction end, form B does what the oracle's corner
    does there.
  - #1 and the shared checks get no worse than S1c's F5 on any scene,
    unless a Finding attributes the change.
- **The candidates.** Pick between them by the checks.
  1. **Patches in solveCorner**, as S1c's Handoff proposes:
     - V's foot continues along the arm's tangent past the arm's end, so
       the corner leaves with its fill as θ nears π, not at a gate;
     - a unique fillet in a near-parallel channel: cap r by the
       channel's half-width, so the circle cannot reach the far wall;
     - Lcut continuous in the cut's position.
  2. **A closed form per pixel**, if a patch cannot be made continuous:
     the fill as a rolling-ball blend of the two arms' distances,
     evaluated at the pixel with no solve. If you take it, say in its
     Finding what it moves between S3's and S5's work (the corner prep
     on the CPU, the cost per fragment).

  Prefer whichever reaches 0 corner switches with the checks at rest
  held. If neither does within the cap, write down why and what the
  next stage should try.
- **A look question.** The only continuous corner might change a filled
  corner mouth at rest, as F4j did by showing a band through it. If so:
  - crop it beside the oracle's;
  - say so in the report.

  Levi decides it as a look.

## Order

Take `Get-Date` at the start and at each milestone, and write the times
into Findings. Append `## Findings` (F1, F2, ...) to this brief as you go.

1. **Read (about 10 min).**
   - S1c's F3, F4, F5 and Handoff.
   - solveCorner and its gates in form_b.ts, in slices.
   - The headers of corner_why.ts, pops_mech.ts and pops_switch.ts.
   - The oracle's corner (oracle30, in the `k868-s3a` worktree,
     read-only): what it does past an arm's end.
2. **Free ends (about 10 min).**
   - In S1c's F5 the free ends fell below the oracle's count on seven
     scenes.
   - Test the guess that the counter reads OWN as a join, on muse_hash.
   - If it does, fix the counter and record the corrected counts. Commit.
3. **V off arm (about 35 min).**
   - Crop the worst sites beside the oracle: muse_flow 3>4 at (23.095,
     10.572) and muse_flow 23>24 at (23.103, 10.536).
   - Make the definition change.
   - Rerun the pins, #1 on all 12 scenes, the pops on the four
     recordings, and corner_why. Commit.
4. **The fillet's center (about 35 min).**
   - Do the same for root, radius bisect and tangent foot.
   - Start from the worst sites:
     - def_drag 1>2, corner 141/431/432 (`pops_switch.ts` with
       `ROOTS=141/431/432`);
     - def_flow 17>18;
     - def_flow 16>17.
   - Commit.
5. **Lcut's gate and the two small gates (about 10 min).** Commit.
6. **The gate (about 20 min).** Report each item against S1c's F3 and
   F5:
   - the pins and `npm test`;
   - `scenes.ts` on all 12 scenes, with the free ends;
   - the full pops run and pops_mech's table;
   - `b_rate.ts`;
   - q5holes, and q4 on all 12 scenes.

   Commit.
7. **If time remains:**
   1. S1c's other probe gaps (K1048): q5holes skips a hole whose rim is
      partly OWN, and q4's crop holds no ink on the g41 ring scenes.
   2. R2.
   3. R3.

Then write `## Handoff`. Stop at the cap wherever the Order stands.

The corner work (steps 3-5) matters more than the rest of the gate. If
time runs short after step 5, run the pins and the pops on the final
definition, and leave the rest to the Handoff.

## Where things are

- **S1c:** `docs/design/K1040_s1c_handoff_pops.md`.

  | Section | Line |
  |---|---|
  | F3, the mechanism table | 255 |
  | F4, F4j (not kept) | 329 |
  | F5, the gate on F2 | 395 |
  | Handoff, with How to rerun | 448 |
- **The earlier stages:** S1b is `docs/design/K1040_s1b_holes_fades.md`,
  and S1 is `docs/design/K1040_s1_reference.md`.
- **The definition:** `docs/design/K1040_junction_field.md` F2 and F3,
  amended by the stages' definition-change Findings.
  `src/render/field/form_b.ts` is the current definition.
- **The code:** `src/render/field/form_b.ts` and
  `test/render/field/form_b.test.ts`.
- **The probes,** in `.claude/probes/K1040/s1/`:
  - S1c's `run_s1c_gate.ps1`. It runs the pins, `npm test`, pops,
    scenes, q5holes, q4, mech and rate as parallel jobs, and writes
    under `out/s1c/`. Give it an output root, or copy it, for S1d.
  - `gate_table.ps1`, pops_mech.ts, corner_why.ts, pops_switch.ts,
    hole_check.ts and omega_rate.ts.
  - The frozen copies `form_b_s1b.ts`, `form_b_f2.ts` and
    `form_b_f4j.ts`.
  - S1's and S1b's probes.
- **Outputs:**
  - Write S1d's runs under `s1/out/s1d/`. `out/`, `out/s1b/` and
    `out/s1c/` are the baselines.
  - Commit the summaries and the crops your Findings cite, and leave
    the rest untracked.
  - Logs of `npm test` stay untracked.
- **The scenes and the recordings:** where S1's brief says. Both are
  read-only.

## Rules

- **Files you may change:**
  - `src/render/field/form_b.ts`;
  - `test/render/field/form_b.test.ts` and fixtures beside it;
  - the probes in `.claude/probes/K1040/s1/`, plus new ones there (add
    them with `git add -f`);
  - this brief's Findings and Handoff.

  Change no other file under `src/`, `test/` or `scripts/`. Nothing in
  the app imports form_b.ts, and nothing may start to.
- **Tests.** `npm test` (tsc included) passes at every commit you call
  done. master deploys on merge.
- **Builds and other checkouts.**
  - Don't run `npm run build` in the main checkout.
  - Write nothing in other checkouts.

  S1c's gate launcher ran its jobs in the main checkout for 30 s. Its
  loop variable `$w` overwrote `$W`, the worktree's path, because
  PowerShell variable names ignore case. So:
  - give every variable a distinct name, not just a distinct case;
  - every script that runs jobs or writes files first checks that
    `git rev-parse --show-toplevel` prints
    `C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/k1040-field`,
    and stops if it doesn't;
  - pass absolute paths to .NET calls such as `[IO.File]`.
- **Reading code and output.**
  - Read code through the shell: `Select-String` finds the lines, and
    `Get-Content <file> | Select-Object -Skip <n> -First <m>` reads them.
  - Every Read of a `src/render/` file attaches about 20k tokens of
    rules. Use the Read tool only right before an Edit, and make
    mechanical edits as PowerShell string replacements.
  - Keep probe output in files, and print short summaries of at most
    about 30 lines per call. S1c compacted eight times in 80 minutes.
- **Commits.**
  - Commit WIP to `k1040-field` at every milestone, broken or not.
  - Never push, and never skip hooks.
  - Use no helpers (no subagents).
- **Timing.** Nothing here is timed. If you do time something, take the
  machine-wide perf lock first (`$env:TEMP\claude-perf.lock`, one line:
  owner K1040-S1d, start time, what), and delete it after.
- **Stop rule.** Stop when the Order is done or 2 h after your start
  (`Get-Date`), whichever comes first. A compaction is not a stop: after
  one, re-read this brief and `git log --oneline -5`, then go on. When
  you stop:
  1. Commit WIP.
  2. Append `## Handoff` to this brief: what is done, what is next, and
     how to rerun.
  3. Commit.
  4. Report.
- **The report** ends with:
  - `Ledger items`: new follow-ups, residuals, and decisions for Levi;
  - K1040's handle fields: owner, branch, last commit, evidence, next,
    brief, env.

## Findings

Start 03:48:35 (cap 05:48:35).

### F1 · Free ends: the counter does not read OWN as a join (03:56)

The guess is refuted on muse_hash. Probe: `fe_own.ts`; output
`out/s1d/fe_own_muse_hash.txt`.

- **Lost sites.** S1b has 113 free ends and F2 has 39. Of S1b's sites,
  75 have no F2 free end within 2W.
  - At all 75, F2's ink at the site is below 0.5. The counter walks
    only inked points, so these sites are not candidates under F2 at
    all. The counter reads ink only, never a surface, and F2 does not
    draw ink there.
  - Reading OWN ink as paper makes 0 of the 75 free again.
  - The oracle (FieldModel.evalPoint) inks 1 of the 75, and that one
    is a free end in the oracle too.
  - So S1b's extra free ends were S1b's own stray outline ink. The
    oracle has none of it, and F2 matches the oracle at 74 of the 75.
- **F2's own 39 free ends,** read like for like at the same sites: the
  oracle inks 9 of them, and only 2 are free ends in the oracle. So 30
  of F2's free ends are form B ink that the oracle does not draw at
  all, and 7 are ink that joins in the oracle.
- **The counter is unchanged,** and F2's counts stand: 169 in all, 39
  on muse_hash.
- **For a later stage:** the oracle column (108 on muse_hash) is K900's
  census, not like for like. `fe_own.ts`'s second line is the
  like-for-like measure: a free end in form B and in the oracle at the
  same site.

### F2 · The two arms of one through pass get no corner (04:10)

Definition change. Crops in `out/s1d/crops/`; corner_cmp's listings in
`out/s1d/cmp_*.txt`.

- **What popped.** At muse_flow 3>4 (23.095, 10.572) and 23>24
  (23.103, 10.536), the corner that comes and goes is the one between
  the two arms of one through pass: θ 2.9-3.07, V's feet at the root.
  Its arc inks a stroke inside the oracle's group interior
  (`muse_flow_23.095_10.572_f4_f2.png`, made with S1c's F2).
- **The oracle never makes that corner.** Its corner loop skips a pair
  whose arms are one chain, both through, at one s (`oracle.ts`, the
  corner loop). corner_cmp lists the corner in form B and not in the
  oracle (`cmp_muse_flow_3_j11.txt`, `cmp_muse_flow_4_j11.txt`).
- **The change.** Form B's corner loop skips the same pair (`form_b.ts`,
  after `eb`). The corner is gone for every geometry, so its V-off-arm
  gate has no outcome left to jump. Two passes of one chain, and a
  chain's two ends, keep their corners. The Y pin now expects 2 corners:
  the through pass's bend at 270° gets none.
- **After** (`muse_flow_23.095_10.572_f4_s1dF2.png`): the arc is gone.
  In the crop, form B inks 138 px and the oracle 139 px.
- **The gate** (`run_s1d_gate.ps1 -Tag f2`), against S1c's F5:
  - Pins 22 of 22.
  - #1: 861 -> 472 px. muse_hash 173 -> 94, def 36 -> 31, ring 40 -> 0,
    user_tw42.lightpaper 32 -> 0, g41_user_tw42 31 -> 0, g41_user_tw64
    289 -> 87. The other scenes hold.
  - Free ends: 169 -> 159.
  - Pops: 209 / 3875 px -> 118 / 1979 px (def_drag 8 / 405, def_flow
    24 / 888, muse_drag 26 / 227, muse_flow 60 / 459).
  - corner_why (`out/s1d/pops_f2/corner_why.txt`): V off arm 72 / 1543
    -> 0. Still there: root 21 / 674, radius bisect 23 / 378, tangent
    foot ("none") 7 / 261, room-L 9 / 63, arm L 0 2 / 46, r0 2 / 20 and
    room-dV 3 / 14.
  - Shared checks: each fails on the same scenes as before. Their
    values improve or hold on every scene but one. On g41_ring_tw64,
    #5 goes from 138 to 141 of 5536 walks, and its longest walk is
    unchanged at 7.079 px.
    - Observed: those 3 walks are not located, because scenes.ts's JSON
      keeps only the longest walk.
    - Inferred: the skip is the only change, so the 3 walks sit at a
      through pass's bend that lost its fillet. The oracle draws no
      fillet there either.