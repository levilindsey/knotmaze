# K1040 S1c: the hand-off to OWN, and what the pops are

Ledger K1040, stage S1c: S1b continued, before S2. One stage: Opus, 2 h
cap. Branch `k1040-field`, worktree
`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k1040-field` (at
master, node_modules joined to the main checkout's). Work only there.
Brief written 2026-10-29 by the coordinating session.

## Why

S1b (merged at a98938c5) found that the holes are the look's eyes, not a
defect. It made six definition changes for the rate rule, which cut the
rate census from 132 sites to 23, and it reran the gate
(`docs/design/K1040_s1b_holes_fades.md`). Two things stand between
form B and S2:

- **One structure behind two failures (S1b F14, R1).** At an arm's end,
  a foot that is fading out of its group loses its burial along with it.
  So its band shows inside a full member's tube. This is the foot+f2
  class, 1540 of check #1's 2832 px. Past the cut, the piece switches to
  OWN in one step: R1, a jump of 0.75 ink in 1/40 px, which the cap pin
  tracks as `it.fails`. One site is traced; the class is not counted.
- **Nobody knows what the pops are.**
  - The full run counts 225 pops (4051 px), against S1's 123 (1764 px).
    In the same run the unexplained pixels fell by 37%.
  - S1b inferred, without testing, that most of the rise is F2's
    relabel: pixels that S1 excused under f1 now count.
  - Nobody has said which mechanisms the 225 pops come from, so nobody
    can say how far form B is from 0 pops.

S1c fixes F14 and R1 together. Then it answers the second point with a
table that assigns every pop pixel to a mechanism. At S1c's merge the
coordinator uses that table to decide whether S2 starts or the
definition needs another stage. Levi does not look at this stage.

## Calls that bind

- **Earlier calls.**
  - S1's calls and S1b's still bind. S1b's `## Calls that bind` are:
    watertight at every fade value, the rate rule, and each definition
    change written down as its own Finding.
  - The eyes stay as they are (S1b F1).
- **F14 and R1 get one definition change** if the count shows they share
  a mechanism:
  - A foot stays buried at full weight while a full member's tube holds
    it; its burial weight is not scaled by its own ramp.
  - The hand-off to OWN fades instead of switching.
  - If the count shows another mechanism for part of the class, that part
    gets its own fix, also within the rate rule.
- **Mechanisms, not pixels.** A pop's mechanism is the term or decision
  whose change moves the ink between its two frames. It is one of:
  - a change of winner (term X to term Y);
  - a fade weight (name which decision);
  - a burial weight;
  - a gate;
  - the tie mix;
  - motion beyond what label_pops' rule allows.
- **Count and fix by mechanism.**
  - Count pops and px per mechanism and per place: junction, crossing of
    60° or more, elsewhere.
  - A mechanism that is a hard switch in the definition is fixed in the
    definition, as R1 is.
  - A fade too narrow for the motion is widened, and the width is recorded
    as in S1b's rate rule.

## Order

Take `Get-Date` at the start and at each milestone, and write the times
into Findings. Append `## Findings` (F1, F2, ...) to this brief as you go.

1. **Read (about 10 min).**
   - S1b's F13, F14, Residuals and Handoff.
   - S1b's change to form_b.ts: `git diff 27cfb2e1 a98938c5 --
     src/render/field/form_b.ts`, read in slices.
   - The headers of pops.ts, b_trace_bur.ts and b_rate.ts.
2. **The pops accounting (about 15 min).**
   - Run S1b's test. Count S1b's pop px where two same-chain minima merge
     within σ: the pixels S1 excused under f1.
   - Report how many of the 225 pops and 4051 px it explains. Commit.
3. **F14 and R1 (about 40 min).**
   - Count F14's mechanism over every foot+f2 #1 site: check1deep's
     sites with A.ramp < 1 and the burier's winW near 1.
   - Crop the deepest sites on muse_hash and the g41 tw64 scenes.
   - Make the definition change. Flip the cap pin's `it.fails` to `it`.
   - Rerun the pins, #1 on all 12 scenes, and `b_rate.ts`. Commit.
4. **The mechanism table (about 35 min).**
   - Rerun the full pops on the new definition.
   - Write a probe that evaluates form B, with the term trace, at both
     frames of every pop pixel, and assigns each pixel its mechanism.
   - Put the table in Findings: rows are mechanisms, columns are places,
     and each cell gives pops, px and the worst site with a crop.
   - Fix any hard switch the table finds that a short definition change
     can fix, within the rule. List the rest. Commit.
5. **The gate (about 20 min).**
   - The pins.
   - `scenes.ts` on all 12 scenes.
   - The full pops run, if step 4 changed the definition after its rerun.
   - `q5holes.ts`: expect S1b's 44 eyes and 0 holes the oracle covers.
   - `q4.ts` on all 12 scenes (S1b ran it on three).
   - Report each against S1b's numbers (its F13). Commit.
6. **If time remains:** R2 (muse_hash chain 52's tie jump), then R3.

Then write `## Handoff`. Stop at the cap wherever the Order stands. The
mechanism table matters more than the rest of the gate. If time runs
short after step 4, run the pins on the final definition, and leave
scenes.ts and q4 to the Handoff.

## Where things are

- **S1b:** `docs/design/K1040_s1b_holes_fades.md`.

  | Section | Line |
  |---|---|
  | F13, the gate against S1 | 384 |
  | F14, one #1 site | 457 |
  | Residuals R1-R6 | 497 |
  | Handoff | 521 |

  The Handoff ends with the rerun commands.
- **S1:** `docs/design/K1040_s1_reference.md`. Its Findings start at line
  217, its Handoff at 679, and `### How to rerun` at 792.
- **The definition:** `docs/design/K1040_junction_field.md`, F2 (line 238)
  and F3 (line 350). S1's and S1b's definition-change Findings amend it,
  and `src/render/field/form_b.ts` is the current definition.
- **The code:** `src/render/field/form_b.ts` and
  `test/render/field/form_b.test.ts`.
- **The probes** are S1's and S1b's, in `.claude/probes/K1040/s1/`:
  b_crop, b_hole, b_sweep, b_rate, b_bisector, b_trace_bur and
  b_site.mjs.
  - b_site.mjs's junction lines missed an arm on g41_user_tw64. Check
    the scene's arm fields before trusting them.
  - PowerShell's `[IO.File]` resolves a relative path against the process
    directory, not `Set-Location`, so pass absolute paths.
- **Outputs:** write S1c's runs under `s1/out/s1c/`. S1's `out/` and S1b's
  `out/s1b/` are the baselines. Commit the summaries and the crops your
  Findings cite, and leave the rest untracked. Logs of `npm test` stay
  untracked.
- **The scenes and the recordings:** where S1's brief says (the probes
  already point at them). Both are read-only.

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
- **Builds and other checkouts.** Don't run `npm run build` in the main
  checkout, and write nothing in other worktrees.
- **Reading code and output.**
  - Read code through the shell: `Select-String` finds the lines, and
    `Get-Content <file> | Select-Object -Skip <n> -First <m>` reads them.
    Every Read of a `src/render/` file attaches about 20k tokens of
    rules, so use the Read tool only right before an Edit, and make
    mechanical edits as PowerShell string replacements.
  - Keep probe output in files, and print only short summaries into the
    conversation, about 30 lines per call at most. S1b compacted six
    times in its first hour.
- **Commits.** Commit WIP to `k1040-field` at every milestone, broken or
  not. Never push. Never skip hooks. Use no helpers (no subagents).
- **Timing.** Nothing here is timed. If you do time something, take the
  machine-wide perf lock first (`$env:TEMP\claude-perf.lock`, one line:
  owner K1040-S1c, start time, what), and delete it after.
- **Stop rule.** Stop when the Order is done or 2 h after your start
  (`Get-Date`), whichever comes first. A compaction is not a stop. After
  one, re-read this brief and `git log --oneline -5`, then go on. When you
  stop:
  1. Commit WIP.
  2. Append `## Handoff` to this brief: what is done, what is next, and
     how to rerun.
  3. Commit.
  4. Report.
- **The report.** Your final report ends with `Ledger items` (new
  follow-ups, residuals, decisions for Levi) and K1040's handle fields:
  owner, branch, last commit, evidence, next, brief, env.

## Findings

Times are local (PDT). Start 02:05:12, cap 04:05:12.

**F1 · The pops accounting: f1's relabel is most of S1b's rise
(step 2, 02:05-02:25).** S1b's definition reproduces F13 exactly
(225 pops / 4051 px; #1 2832 px). `pops_mech.ts` re-evaluates both
frames of every pop pixel and marks it merged when two same-chain
candidates lie within σ there (the merge in `pieces()`; S1's f1).
1768 of the 4051 px (44%) are merged in either frame, but only 16 of
the 225 pops are wholly merged. With the merged px excused, 145 pops
of 4 px or more remain (1934 px), against S1's 123 (1764 px). So f1's
relabel accounts for 80 of the 102 extra pops and 2117 of the 2287
extra px, as S1b inferred. The flag says where a pixel sits, not what
switched there; step 4 assigns mechanisms by what changes between the
frames. Output: `out/s1c/pops_s1b/` (`pops.ts` with `DUMP=1` keeps
each pop's pixels), `out/s1c/pops_s1b/mech/mech.txt`.

**F2 · The cap mix: one definition change fixes F14 and R1 (step 3,
02:25-02:38).**
- **The count.** `b_f14.ts` traced every #1 deep pixel won by a side
  foot with F_CAP on S1b's dump of all 12 scenes: 1542 px. In 1047
  (68%, mean ink 0.741) the foot's own ramp is below 1 while a full
  member's tube holds it (U ≥ 0.99): S1b's burial weight
  B.ramp · B.selfW · A.ramp let the foot's own ramp unbury it (F14). In
  441 (29%, mean ink 0.704) the foot is full and its burier is the one
  in its ramp, the mirror case. 51 px are both, through the burier's
  ramp; 1 has no burier; 2 are F9's fill. So 1540 of 1542 share one
  mechanism, a burial scaled by a cap ramp. R1 (the cap pin: the END's
  piece switched to OWN at L, 0.75 in 1/40 px) is the same ramp's far
  end, where the piece's surface changed in one step.
- **The change** (`form_b.ts`, the header's Q2). A piece with g ≥ 0
  inside its arm's cap ramp (ramp < 1) is a unit. With the units' ramps
  sorted, one u in [0, 1) makes each unit whose ramp exceeds u a full
  member of its group (surf = g) and the rest OWN (surf = OWN + idx):
  n + 1 complete composites for n units, weighted by the gaps between
  the sorted ramps (w_k = r_k − r_(k−1), with r_(−1) = 0 and r_n = 1).
  The ink is their weighted sum; the labels come from the heaviest
  composite and the term from the largest w · ink; the fade bits are
  their union, plus F_CAP where their inks differ by more than 1e-9.
  Inside a composite a burial weighs B.selfW alone, so a foot stays
  buried at full weight while a full member's tube holds it. A unit
  entering (ramp → 1) or reaching L (ramp → 0) takes its composite's
  weight to 0, so both ends are continuous, whether OWN lies over the
  group or under it. Without units the evaluation is S1b's, bit for bit
  (now `evalLayers`). The `capBoth` param (S1b's A.ramp factor) is
  gone. Cost: one more composite per unit, inside caps only.
- **The pins.** The cap rate pin passes now (`it.fails` → `it`: 1.62
  per px against 3, F_CAP shown); 22 of 22 form B tests. `npm test`:
  188 files, 2532 tests (`logs/npm_test_f2.txt`).
- **#1 on all 12** (`scenes.ts`; `out/s1c/scenes_f2/gate_table.txt`):
  2832 → 861 px. By term: foot+f2 1540 → 0, foot 396 → 3, tB+f2
  32 → 0; the rest stay (tB 322 → 320, arc 255 → 251, tA 217 → 216,
  foot+f8 62 → 59). Per scene: muse_hash 1012 → 173, g41_user_tw64
  783 → 289, g41_def_tw64 348 → 89, g41_ring_tw64 189 → 0 (passes
  now), muse_default_tw 193 → 171, ring 101 → 40, user_tw42.lightpaper
  71 → 32, g41_user_tw42 70 → 31, def 65 → 36. Free ends 345 → 169. No
  other check changed its outcome on any scene. `b_f14.ts` on the new
  dump finds 2 foot px with F_CAP left (muse_hash, both with F_TIE too).
- **The rate** (`b_rate.ts`, 161 sites; `out/s1c/rate/rate_f2.txt`):
  sites with breaches 23 → 3. The 1105 foot jumps are gone (647 + 307
  + 75 foot+f2 | foot+f4, 74 foot | foot+f4, 2 more); the 3 sites left
  are muse_hash corner 209's sliver (R3, 84 arc jumps, as before).
- **Crops** (`out/s1c/crops/<scene>_<x>_<y>_<class>_{s1b,f2}.png`, the
  deepest site of each class on muse_hash and the three g41 tw64
  scenes; `b_crop.ts` with `FORMB=s1b` renders `form_b_s1b.ts`, S1b's
  form B with its imports re-rooted). The dark band where a buried arm
  showed through its group's interior is gone. What stays is a faint
  grey: the arm's outline fading in across its cap ramp, the hand-off
  itself (`g41_user_tw64_3.227_14.632_own_f2.png`,
  `muse_hash_15.461_21.814_own_f2.png`).

**F3 · The mechanism table: the hard switches are the corner solve's
(step 4, 02:38-03:00).** `pops_mech.ts` takes every pop of F2's
definition (209 pops / 3875 px over the four recordings; S1b 225 /
4051), finds its pixel with the largest ink step and bisects the frame
pair's interpolated scene there (8 coarse steps, then 30 halvings:
2^-33 of a frame). A step above 0.02 at that width is a hard switch;
otherwise the pop is smooth: motion beyond label_pops' rule, or a fade
(named by the fade bits seen between the frames). At a switch it diffs
the corners that reach the pixel (dq ≤ rV + W + 4aa) on either side, by
junction and arm pair. A pair whose frames cannot be interpolated (a
chain resampled, a junction's arms changed) is a scene change, not form
B's. Cells: pops / px; the worst site (recording from>to, world point,
px). Its crop is `out/s1c/pops_f2/mech_<seq>/crops/<seq>_<mechanism>_<place>_<from>.png`
(the `switch-gate-*`, `switch-winner-*` crops there are the same pops
seen by the decision that changed, from the pass before the corner diff).

| Mechanism | junction | crossing ≥ 60° | elsewhere |
|---|---|---|---|
| corner appears | 36 / 714; muse_flow 3>4 (23.095, 10.572) 48 | 3 / 131; muse_flow 24>25 (23.085, 10.572) 46 | - |
| corner goes | 33 / 656; muse_flow 23>24 (23.103, 10.536) 49 | 2 / 88; muse_flow 0>1 (23.085, 10.575) 45 | - |
| corner root (q jumps, same r) | 9 / 549; def_drag 1>2 (11.064, 4.897) 99 | 12 / 125; muse_drag 10>11 (34.806, 6.578) 17 | - |
| corner radius (r jumps) | 38 / 484; def_flow 17>18 (11.094, 4.822) 86 | - | - |
| corner tangent foot jumps | 5 / 254; def_flow 16>17 (11.102, 4.863) 102 | 3 / 15; muse_flow 32>33 (34.717, 7.046) 6 | - |
| scene: a chain resampled | 33 / 523; def_flow 6>7 (11.122, 4.819) 88 | 15 / 205; muse_flow 19>20 (23.096, 10.579) 49 | - |
| scene: a junction's arms changed | 5 / 54; muse_flow 26>27 (4.098, 1.124) 26 | - | - |
| motion beyond the rule | - | 8 / 32; muse_drag 1>2 (19.335, 15.027) 4 | 2 / 10; muse_drag 26>27 (16.017, 19.534) 6 |
| fade weight ω (the overlap gate) | 2 / 23; muse_drag 0>1 (18.903, 18.337) 17 | - | - |
| the tie mix | 1 / 4; muse_drag 22>23 (19.241, 18.595) | 1 / 4; muse_drag 31>32 (25.203, 19.44) | - |
| gate: surfaces none → foot | 1 / 4; muse_flow 5>6 (26.33, 22.749) | - | - |

- **By family.** Corner-solve switches 141 pops / 3016 px (78% of the
  px), scene changes 53 / 782 (20%), smooth 14 / 73, one gate 1 / 4.
  Every corner pop sits at a junction; its crossing ≥ 60° cells are
  junction corners with a crossing within 3 h. No hard switch was found
  in the per-pixel decisions (winner, fold, cap, burial, tie) beyond
  that one gate pop. The two ω pops and two tie pops are fades that ran
  from one end to the other inside one frame pair.
- **Why the corners jump** (`corner_why.ts`: at each corner pop's
  bisected switch, the gate or field that flipped;
  `out/s1c/pops_f2/corner_why.txt`, `corner_why_dv.txt`):
  - *V off arm*, 72 pops / 1543 px (38 appear / 822, 34 go / 721).
    solveCorner drops a corner when V's feet leave an arm. Every one is
    a pair opening toward straight (θ at V's feet 2.89-3.07) with a full
    fill (r 0.33-1.6, ω 1). On the present side one of V's feet is
    already at its arm's end (dV < 0.0005) and the other 0.03-0.08 from
    it; on the absent side both are at 0. The margin slides to 0
    continuously, and the corner, fill and all, goes in one step at the
    gate. F4 tried a fade for it and did not keep it.
  - *root*, 21 / 674. In a near-parallel channel Newton's equidistance
    solve has several roots and the one it reaches flips. def_drag
    corner 141/431/432 (θ 1.508, r 0.300, h 0.26; feet 1.24 down arms
    about 2(h + r) apart) has three on both sides of the switch:
    (11.187, 5.335) kB 17, (11.189, 5.342) kB 18, (11.216, 5.428) kB 19.
    The pick moves q by 0.008 (rV 0.691 → 0.698), and the wedge and fill
    edges cross pixels: chain 56's outline goes buried ↔ exposed (ink
    0 ↔ 1), 99 px at (11.064, 4.897), 69 at (11.186, 5.733)
    (`pops_switch.ts` with `ROOTS=141/431/432`).
  - *radius bisect*, 24 / 387: r1 is infeasible and the bisection's
    largest feasible r jumps (feasibility in r is not an interval).
  - *tangent foot*, 8 / 269 (corner_why's "none": q and r hold): q's
    nearest point on an arm flips between segments (corner 141/431/432
    dB 1.17 → 1.199; def_flow 66/204/202 dB 1.173 → 0.275).
  - *room-L*, 9 / 63: an arm's L jumps (Lcut counts a pass only while
    its cut lies in [0, L]), so room and r1 jump. Also arm L 0, 2 / 46
    (muse_flow 37/113/114); r0, 2 / 20; room-dV, 3 / 14.
- **Listed, not fixed.** Root, radius bisect and tangent foot (53 pops,
  1330 px) are one problem: in a near-parallel channel the fillet's
  center is a discrete choice (a root, a feasible r, a nearest foot),
  and no short change makes it continuous. Fixing it needs a fillet
  that is unique there (for example r capped by the channel's
  half-width, so the circle cannot reach the far wall) or a blend over
  the candidates. room-L is Lcut's gate. Scene changes are the
  recorder's input (the physics resampled a chain), not form B's.

**F4 · ω's V margin (F4j): fewer pops, wrong at rest, not kept (step
4, 03:00-03:30).** F3's largest mechanism, a corner that appears or
goes (74 pops / 1589 px; corner_why: V off arm 72 / 1543), is the
solve's gate `dVa > tol && dVa < A.L - tol && ...`: as a pair opens,
V's feet slide to an arm's end and the gate drops the corner and its
whole fill in one frame. F4j faded ω over the margin instead:
ω = ss(0, 1, 1 − ov/ovw) · ss(tol, vw, min(dVa, dVb)), vw = 0.25h (a
new FormBParams `vw`). For straight arms dV = h·cot(θ/2), so the fade
starts at θ ≈ 152°. A first trial faded all four margins (L − dV
too): `omega_rate.ts` counted 177 rule breaches in 8361 corner-frame
pairs, 68+ at the far end, where L jumps with Lcut's gate and the fade
jumps with it, and no recorded corner left by the far end. F4j keeps
the junction end only. It is commit c38d2319, kept as the probe
`form_b_f4j.ts`.
- **Pops** (pops.ts, WINDOWS 0, WLEN 41), F2 → F4j: def_drag 21 / 771
  → 8 / 405, def_flow 69 / 1615 → 27 / 915, muse_drag 28 / 310 → 26 /
  227, muse_flow 91 / 1179 → 60 / 459; all 209 / 3875 → 121 / 2006. By
  mechanism (`out/s1c/pops_f4j/mech/mech.txt`): appear/go 74 / 1589 →
  2 / 46 (one arm reaching L 0, muse_flow 5>6 and 18>19 at (26.8,
  23.3)); chain resampled 48 / 728 → 35 / 438 and junction arms 5 / 54
  → 2 / 18 (corner switches a scene change set off, now faded); root
  21 / 674, radius 38 / 484, tangent foot 8 / 269, motion 10 / 42, ω
  2 / 23, tie 2 / 8 and gate 1 / 4 unchanged. Changed px inside
  F_OMEGA alone: 54 → 99, 1288 → 1664, 27 → 80, 104 → 1036. Pins 22 /
  22, npm test passed (2532 tests).
- **Rate** (`omega_rate.ts`: every corner in two consecutive frames
  whose margin factor is below 1 on a side; |Δω| per px of label_pops'
  local motion at V, t_a and t_b; rate2 floors the motion with the
  junction centre's own):

  | vw | pairs | median | p99 | max | > 3 | rate2 > 3 |
  |---|---|---|---|---|---|---|
  | 0.25h | 4626 | 0.153 | 3.83 | 76.6 | 84 | 65 |
  | 0.5h | 7815 | 0.055 | 1.97 | 24.7 | 35 | 19 |
  | 1h | 30528 | 0.027 | 1.51 | 100.8 | 146 | 64 |

  Widening does not clear it. The worst pairs are θ turning fast on
  short arms (L 0.3-0.5h) while the chain samples near the corner
  barely move: dV = h·cot(θ/2) is ill-conditioned as θ → π
  (d(dV)/dθ = −h / (2 sin²(θ/2))), and a fade keyed on dV inherits it.
  0.5h would start the fade at θ ≈ 127° and 1h at 90°, fading fills
  that show at rest.
- **At rest the fade is wrong where the fill is big.** scenes.ts #1
  (form B ink deeper than W + 1 px inside one oracle label), F2 → F4j:
  muse_hash 173 → 131, muse_default_tw 171 → 173, def 36 → 41, ring
  40 → 48, user_tw42.lightpaper 32 → 0, g41_def_tw42 0 → 27,
  g41_ring_tw64 0 → 44, g41_user_tw42 31 → 0, g41_user_tw64 289 →
  274, the rest 0 → 0 or 89 → 89; all 861 → 827. Every new px is
  `foot+f8`. At g41_def_tw42 (592, 159), dpr 1, S1b and F2 fill the
  mouth (top 1, ink 0); F4j shows arm 1's edge band through the faded
  fill (ink 0.915; `hole_check.ts g41_def_tw42 1 592 159 1`). The px it
  removed were a fill's own band where the oracle has none
  (user_tw42.lightpaper, chain 29's corner, tB and arc, F 4-5 px). So
  V at an arm's junction end does not mean the fill is small: the
  oracle keeps some of these fills and not others, and the fade is a
  rate fix laid over a definition that is wrong both ways. The shared
  checks, free ends (169 → 164) and q5holes (43 counted, F5) move
  nowhere else.
- **Not kept.** F4j is clearly better on the pops, not on the gate:
  two clean scenes gain a band across a filled mouth. src keeps F2, by
  the coordinator's rule. The fix belongs in the definition: decide
  the corner by its fill, not by dV. Check what the oracle's corner
  does when V passes the junction end and continue form B's the same
  way (V's foot along the arm's tangent past its end), or fade on the
  fill's size, which is continuous in θ. Listed for the next stage.

**F5 · The gate on F2, the kept definition, against S1b's F13 (step 5,
03:26-03:35).** src is F2 (608327af; `git diff 608327af HEAD -- src
test` is empty), so F2's pops run (F3: 209 pops / 3875 px over the four
recordings; S1b 225 / 4051) is the gate's pops run. scenes.ts ran on
608327af (`logs/scenes_f2.txt`); the pins, `npm test`, q5holes and q4
ran on 11c3ecfb (`logs/*_f2k.txt`; `q5_f2k/`, `q4_f2k_1/`,
`q4_f2k_2/`). Paths are under `.claude/probes/K1040/s1/out/s1c/`.

- **Pins** 22/22 (`logs/pins_f2k.txt`). **`npm test`** passes: 188
  files, 2532 tests, 8 skipped (`logs/npm_test_f2k.txt`).
- **scenes.ts, #1 failing px, S1b → F2:** muse_hash 1012 → 173,
  muse_default_tw 193 → 171, def 65 → 36, fat 0 → 0, ring 101 → 40,
  user_tw42.lightpaper 71 → 32, g41_def_tw42 0 → 0, g41_def_tw64
  348 → 89, g41_ring_tw42 0 → 0, g41_ring_tw64 189 → 0, g41_user_tw42
  70 → 31, g41_user_tw64 783 → 289; all 2832 → 861 (S1 2187).
  `scenes_f2/gate_table.txt`.
- **Free ends** 345 → 169 (muse_hash 113 → 39, g41_def_tw64 65 → 16,
  g41_user_tw64 42 → 24). F2 now reads below the oracle's own count on
  seven of the ten scenes F13 gives it for (muse_hash 39 against 108,
  g41_def_tw64 16 against 64), where S1b sat at or above it, so fewer
  is not plainly better here. Not attributed. Inferred, untested: OWN,
  a surface no chain owns, may read as a join to the counter, as it
  hides a hole from q5holes (below).
- **The shared checks** fail on the same number of scenes as in F13,
  check by check: #2 11, #3 1, #4 11, #5 11, #6 5, #7 2, #8 0,
  #9 sections 5, #9 walks 11, #11 1, #14 1, #15 0, #16 2. The values
  were not compared.
- **q5holes:** 43 holes inside one group, every one an eye (the oracle
  leaves at least half of it paper), 0 defects: 38 at dpr 1, 5 in
  muse_hash at dpr 2 (`logs/q5holes_f2k.txt`). F13's 44th eye
  (muse_hash, dpr 2, 2 px at world (19.147, 33.518), px (1290,
  1563-1564)) is still paper under F2, but part of its rim is now OWN,
  so it is not "inside one group" and goes uncounted: a probe gap, not
  a change in the eye (`hole_check.ts muse_hash 2 1290 1563 2`). That
  makes S1b's 44 eyes and 0 holes the oracle covers.
- **q4** (exact area coverage against the AA, as F13), S1b → F2: px
  with |Δ| > 0.5, def 41 → 32, fat 0 → 0, ring 10 → 10, g41_def_tw64
  2 → 2, muse_hash 26 → 20; with |Δ| > 0.1, def 1332 → 1229, fat
  1716 → 1716, ring 536 → 498, g41_def_tw64 453 → 313, muse_hash
  1970 → 1458. The scenes S1b did not run have 0 px over 0.5, and over
  0.1: muse_default_tw 1296, user_tw42.lightpaper 607, g41_def_tw42
  293, g41_user_tw42 620, g41_user_tw64 335. q4's crop for the g41
  scenes (640x640 device px at (1540, 1030), dpr 3) holds no ink on
  g41_ring_tw42 and g41_ring_tw64, so those two read 0 px measured: a
  probe gap. F4j, for comparison: over 0.5, def 30, ring 1,
  g41_def_tw64 2, muse_hash 15 (`logs/q4_f4j_*.txt`).
- **Incident.** The first launch of this run executed its jobs in the
  main checkout for about 30 s: the launcher's loop variable `$w`
  overwrote `$W`, the worktree's path (PowerShell names ignore case).
  The pins and the start of `npm test` ran there before the jobs were
  killed; its `git status` is clean. `run_s1c_gate.ps1` now names the
  loop variable `$item`, and each job stops on a failed `Set-Location`.
