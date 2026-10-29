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

### F3 · The fillet's centre from the tracked feet and the rule (04:16-04:40)

Definition change, WIP commit 65ff32c9 (04:40). Gate (04:32-04:39):
`logs/gate_f3.txt`, `table_f2_f3.txt`, `mech_f3_merge.txt`,
`corner_why_f3.txt`.

- **The change.**
  - θ is the oracle's armDir: the chord at 2h from the scene arm's s
    (an END arm bases it at arm.s, not the extended sR).
  - The rule radius is r0 = style·(cr/3)·min(2h, 1.5h·tan(θ/2)).
  - The feet are tracked from the bisector (footT, newtonT, advance),
    and r is the trapezoid ∫S over 32 nodes of S, the running min of
    the margin, steep and cap gates. This replaces the root pick and
    the radius bisection: nothing is chosen, so r moves with the
    geometry.
  - Two pins moved: the acute pin's cap part and the curved arm's θ.
- **The gate**, against F2:
  - Pins 22 of 22, npm 2532 passed, q5 0 defects.
  - Pops: 118 / 1979 px -> 37 / 471 px. corner_why: root (21 / 674),
    radius bisect (23 / 378), tangent foot (7 / 261), room-dV and r0
    are gone. Left: room-L 6 / 99, arm L 0 (gone 2 / 14, new 2 / 13)
    and V off arm (gone 3 / 14).
  - #1: 472 -> 198 px. muse_hash 94 -> 26, muse_default_tw 171 -> 55,
    def 31 -> 2, g41_def_tw64 89 -> 34, g41_user_tw64 87 -> 55. But
    g41_ring_tw42 0 -> 24 and g41_ring_tw64 0 -> 2: F4.
  - Free ends 159 -> 112. Shared checks: each fails on the same scenes.

### F4 · ω fades only the overlap past the margin gate's band (04:48)

Definition change, WIP commit b023d85e (with F5). `logs/gate_f4.txt`,
`table_f3_f4.txt`, `omega_census_f3.txt`, `omega_census_f4.txt`.

- **Why.** r = ∫S stops the ball where another part of an arm comes up
  to 0.05h nearer q than its foot (the margin gate), and ω faded the
  same overlap over the same 0.05h. So ω was partial at every corner
  the margin gate bound: 109 corners on the 12 scenes under F3. At
  g41_ring_tw42's junction 1 the two corners read ω 0.469 and 0.140
  (0 under F2; `ab_g41_ring_tw42_j1.txt`): F3's 24 px of #1 there.
- **The change.** ω = ss(0, 1, 1 − (ov − 0.05h)/ovw): only overlap
  past the band fades. Partial ω: 109 -> 2 corners.
- **The gate**, against F3:
  - #1 198 -> 147: g41_ring_tw42 24 -> 0, g41_ring_tw64 2 -> 0,
    muse_hash 26 -> 2, def 2 -> 1, g41_user_tw64 55 -> 52,
    muse_default_tw 55 -> 58.
  - Free ends 112 -> 112. #5 and #9 (walks) each fail on one scene
    fewer.
  - Pops 37 -> 37 (485 px).
  - No look question: #1 is 0 at g41_ring_tw42 again, as under F2 and
    S1c F5.

### F5 · θ from the interpolated tangent; a pass past L still cuts (04:50)

Definition change, WIP commit b023d85e. Gate (04:49:40-04:55:54):
`logs/gate_f5.txt`, `table_f4_f5.txt`, `table_s1cf5_f5.txt`,
`mech_f5_merge.txt`; Lcut: `lcut_f5_*.txt`.

- **Why.** Each crossing pass's θ came from pointAt's per-segment
  tangent, so a crossing sliding over a vertex turned θ, and Lcut
  (through cot(θ/2)), in a step. And the Lcut loop skipped a pass
  past L, so L jumped as a pass slid over L.
- **The change.** θ takes the oracle's K1000 tanAt (vertex tangents
  interpolated along the segment). The Lcut loop skips only a pass
  behind the root (d < −1e-12), so a pass past L cuts while its cut
  lies short of L.
- **lcut_why:** no L jump at muse_flow 28-29 j37 or muse_drag 31-32
  j162; at muse_flow 5-6 j37 L moves by at most 0.0018 per 1/64 step.
- **The gate**, against F4:
  - Pins 22 of 22, npm 2532 passed, q5 0 defects.
  - Pops 37 / 485 px -> 20 / 191 px. No corner switch is left:
    corner_why lists none. mech_f5_merge: smooth motion 12 / 60 px,
    scene chain samples 6 / 123, scene junction arms 1 / 4, a fade tie
    1 / 4.
  - #1 147 -> 156: muse_hash 2 -> 4, g41_user_tw64 52 -> 59. Not
    attributed site by site. Inferred: F5's θ moves Lcut, and with it
    L, at those arms.
  - Free ends 112 -> 114: g41_def_tw42 1 -> 2, g41_user_tw64 22 -> 26;
    muse_default_tw, user_tw42.lightpaper and g41_user_tw42 each −1.
  - Against S1c F5 (`table_s1cf5_f5.txt`): #1 861 -> 156, better or
    equal on every scene; free ends 169 -> 114; #5 and #9 (walks) each
    fail on one scene fewer, the other shared checks on the same scenes.

### F6 · A through pass's two arms bury each other: tried, reverted (04:59-05:10)

Definition change, WIP commit d6d53448; reverted at 05:09:49
(`src/render/field/form_b.ts` is b023d85e's again, F5). Gate
(05:03-05:09): `logs/gate_f6.txt`, `gate_f6_mech.txt`,
`table_f5_f6.txt`, `table_s1cf5_f6.txt`; b_rate: `rate/rate_f6.txt`.

- **Why.** b_rate's breaches start at F2: the base (2dacd08d) breaches
  on 0 of 36 sites and F2 on 9 of 36 (`rate/rate_form_b_s1d_base.txt`,
  `rate_form_b_s1d_f2.txt`); F5 breaches on 9 of 161
  (`rate/rate_f5.txt`). F2 dropped the through pass's own corner, and
  with it S1b F9's burial of one arm's outline by the other at the bend.
- **The change.** The two arms of a through pass bury each other's
  outline over the whole partner arm, wt = 1 − ss(h − 2aa, h, d) with d
  the distance to the partner arm, with no gate on the bend.
- **What it gained.** b_rate 9 -> 6 of 161 sites. The g41_ring_tw42
  bend at (9.375, 0.978) inks 0 again (`bend_g41_ring_tw42.txt` beside
  `bend_g41_ring_tw42_f6.txt`). Pins 22 of 22, npm 2532 passed, q5 0
  defects; pops 20 / 191 px and #1 156, both as under F5.
- **What it cost.**
  - muse_hash #6, the max end error, 9.942 -> 12.877 px, worse than S1c
    F5's 9.942. The site is crossing 71, chain 9 over itself at (1.269,
    20.039): the under's ink (s 10.07) ends 12.877 px before the over's
    (s 20.17) inner band edge. The crossing is 0.758 (1.9 h) from
    junction 32, chain 9's through pass at s 11.139, whose two arms are
    0.170 and 0.653 long (`logs/corner_cmp_muse_hash_j32.txt`), so the
    under lies past both arms. How the burial reached it is not traced;
    the burial does not read the crossing's depth.
  - Free ends 114 -> 118, all at junctions: ring (6.727, 7.284) chain
    1; g41_ring_tw42 (9.344, 1.005) chain 1, at the buried bend;
    g41_def_tw42 (6.914, 25.199) chain 71 and (34.739, 17.46) chain 82.
- **The residual (observed).** The breaches left under F5 sit at
  through-pass bends, where the D1 fold merges one chain's minima
  within σ and keeps the nearer one, a discrete pick. In
  `bend_user_tw42_x.txt`, one step along the probe line (u −0.00857 ->
  −0.00429) moves the winning foot from s 23.316 to s 23.368 and the
  ink from 0.993 to 0.675.
- **Look.** At a through pass's bend (user_tw42.lightpaper junction
  31, (11.695, 1.622)), the base drew the through pair's rounded
  fillet; from F2 on, form B draws the sharp inner corner the oracle
  draws. Crops (form B ink | oracle ink | form B top):
  `crops/user_tw42.lightpaper_11.695_1.622_base.png`, `_f5.png`
  (05:13, the final definition) and `_f6.png`.

## Handoff

Stopped at 05:16 (cap 05:48:35); npm test on the final tree: 2532
passed (`logs/npm_test_final.txt`). The final definition is F5 (WIP
commit b023d85e); F6 is reverted.

**Done:** steps 1-6 of the Order.
- F1, free ends (7a12e6f9); F2, V off the arm (a2978ed7); F3, the
  fillet's centre from the tracked feet and the integrated rule
  (65ff32c9); F4, ω past the margin band, and F5, θ from the
  interpolated tangent with a pass past L still cutting (b023d85e);
  F6, tried and reverted.
- The gate on F5 (`logs/gate_f5.txt`, `table_s1cf5_f5.txt`): pins 22
  of 22, npm 2532 passed, q5 0 defects; pops 20 / 191 px (S1c F5 209 /
  3875), with no corner switch left; #1 156 (S1c F5 861), better or
  equal on every scene; free ends 114 (S1c F5 169); #5 and #9 each fail
  on one scene fewer, the other shared checks on the same scenes.
- Not done: step 7 (the K1048 probe gaps, R2, R3).

**Next**, in order:
1. The rate rule at through-pass bends: 9 of 161 b_rate sites breach
   (`rate/rate_f5.txt`), at the D1 fold's nearer-kept pick (F6's
   residual). Either blend the merged minima with continuous weights,
   or bury locally and by depth at the bend. F6 (d6d53448) is a start
   for the second; it has to leave muse_hash's crossing 71 and the 4
   junction free ends alone.
2. The discrete edges left in the corner solve: solveCorner's null
   gates (L ≤ 1e-9, no V, V's dV outside the arm, the wedge's
   orientation), ω's ±0.5h candidate exclusion, and the Lcut loop's
   d < −1e-12 edge where a pass wraps past the root. No pop on the
   four sequences is a corner switch (`mech_f5_merge.txt`;
   `corner_why_f5.txt` is empty), but each can switch one in a step.
3. F5's #1 +9 (muse_hash 2 -> 4, g41_user_tw64 52 -> 59) and its free
   ends on g41_def_tw42 and g41_user_tw64: not attributed site by site.
4. The look question above waits on Levi.
5. Probe upkeep: omega_rate.ts imports a stale `form_b_f4j`;
   corner_ab.ts and omega_census.ts import an untracked
   `form_b_head.ts` (make it with `git show
   HEAD:src/render/field/form_b.ts`, imports pointed at src).

**How to rerun** (PowerShell, from the worktree; every script's header
gives its arguments; outputs go under `.claude/probes/K1040/s1/out/s1d/`):
- The gate: `.claude/probes/K1040/s1/run_s1d_gate.ps1 -Tag <t> -What
  pins,pops,scenes,npm,q5,q4 -MaxMin 30`, then `-What mech -MaxMin 15`;
  compare two scene logs with `gate_table.ps1 <before.txt> <after.txt>`.
- b_rate: `b_rate.ts` on the working tree (env OUT, TAG, PARAMS, R,
  STEP, LIM, SITES); `b_rate_form_b_s1d_base.ts` and
  `b_rate_form_b_s1d_f2.ts` run the base and F2.
- One site: `bend_why.ts` (base, F2 and the working tree along a short
  line), `corner_cmp.ts` (form B's arms and corners beside the
  oracle's), `corner_ab.ts`, `ov_why.ts`, `lcut_why.ts`,
  `pops_switch.ts`, `corner_why.ts`, `eye_probe.ts`, `fe_own.ts`.
- Crops: `b_crop.ts <scene> <x> <y>` (env FORMB=s1d_base|s1b, OUT).
