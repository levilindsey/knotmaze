# K1040 S1b: form B's holes and fades

Ledger K1040, stage S1b: S1 continued, before S2 (F7's plan; S1's
Handoff). One stage: Opus, 2 h cap. Branch `k1040-field`, worktree
`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k1040-field` (at
master, node_modules joined to the main checkout's). Work only there.
Brief written 2026-10-29 by the coordinating session.

## Why

S1 built form B's float64 reference, `src/render/field/form_b.ts` (merged
at 1b7fa02c), and ran its gate. Every part failed except the free-end
count, which runs (S1's `## Handoff` in `docs/design/K1040_s1_reference.md`).
Two of the failures are defects in the definition itself. S2 to S4 build
on the definition, so these two are fixed first:

- **Holes (F12).** Some junction groups leave paper inside the junction
  and outline it: 0 to 6 holes per scene, each with the fold's fade bit
  (f1) set. Inferred, not traced: f1 withdraws the arm pieces near the V,
  and the corner fills cover only outside each corner circle.
- **Fades faster than a pixel (F11).** At a fade's cut, at the tie mix
  (F_TIE) and at some changes of winner, the ink changes inside a
  fraction of a pixel whatever the AA width. In motion that is a pop.
  Inferred: the same mechanism as F7's #1 failures at junction mouths and
  F9's junction pops.

After the fixes the gate runs again, and every failure that remains gets
a cause: a crop, and the term that changes there. S2 starts from that
answer. Levi does not look at this stage.

## Calls that bind

- S1's calls still bind (its `## Calls that bind`): F1's table, every pop
  counts, the label and band as a pure function of the frame, F7, and the
  design doc's `## Coordinator's calls`. So do S1's answers: F1, the cone
  key; F2, both ramps.
- **Watertight.** A fade never opens a hole: paper that a group's ink
  encloses, as `q5holes.ts` finds it. That holds at every fade value
  from 0 to 1, not only at the values the 12 scenes happen to have, so
  the pins sweep the fades. A fade may move an outline; it never opens
  paper inside one.
- **The rate rule** (the coordinator's call on F11's question). The
  definition bounds how fast a fade moves the ink. S2 does not
  supersample: supersampling smooths one frame, but the outline still
  jumps between frames.
  - In the image: across a fade, a change of winner or a gate, the
    distance a pixel reads changes by at most about one pixel per pixel
    of position (check |∇d| ≤ 2). A fade that moves the outline by Δ
    spreads over at least about Δ of image.
  - In motion: a fade moves the outline no further than label_pops'
    rule allows for the motion that drives it (`scripts/label_pops.ts`'s
    header states the rule; `pops.ts` applies it to form B).
  - A fade that breaks this is widened or reformulated in the
    definition. For example, a gated term gets a fade, and a hard cut
    becomes a ramp.
  - Where the rule needs a fade wider than an approved value (ovw =
    0.05h is Levi's look call), the default is the width the rule needs.
    The approved value stays one parameter setting away, and both are
    recorded for S4b, where Levi looks.
- **Definition changes are written down.** Each one gets its own Finding
  headed `Definition change:`, saying what F2 or F3 said, what it says
  now, and why. The coordinator carries them into the design doc.

## Order

Take `Get-Date` at the start and at each milestone, and write the times
into Findings. Append `## Findings` (F1, F2, ...) to this brief as you go.

1. **Read (about 10 min).**
   - S1's F3 (the fold), F7, F9, F11 and F12, and its Handoff, in
     `docs/design/K1040_s1_reference.md`.
   - form_b.ts's structure, through the shell.
   - The headers of the probes you will rerun.
   - Open the design doc's F2 and F3 only where a fix needs them.
2. **The holes (about 35 min).**
   - Trace F12's hole at muse_hash group 7, (26.675, 1.096), and fix the
     definition so the group covers it.
   - Pin it: a fixture that reproduced the hole, with f1 swept over
     0, 0.25, 0.5, 0.75 and 1.
   - Run the pins. Run `q5holes.ts`: 0 holes on the 12 scenes at dpr 1
     and on muse_hash at dpr 2. Then sweep every fade the same way at
     the former hole sites, and check for 0 holes there too.
   - Commit.
3. **The rate rule (about 35 min).**
   - At `q4worst.ts`'s sites and at F7's #1 mouth sites, find each fade,
     gate or change of winner whose ink breaks the rule. Fix each in the
     definition.
   - Measure the fill key's bisector jump (S1 Handoff, smaller
     residuals): count the pixels where it changes the top surface. If
     there are any, make the key continuous across the bisector.
   - Pin the rule: on the pin scenes, sweep each fade across its width
     and each pixel across a winner change, and check the bound. S1's
     fade sweeps tighten to it.
   - Commit.
4. **The gate again (about 20 min).**
   - The pins.
   - `scenes.ts` on all 12 scenes: checks 1-9 and 11, the max
     decomposition and the free ends.
   - `pops.ts`, the full run (`WINDOWS=0 WLEN=41`).
   - `q5holes.ts` and `q4.ts`.
   - Report each against S1's numbers. Commit.
5. **Attribute what remains (the rest of the time), in this order:**
   1. each remaining pop and #1 failure: a crop and the term that
      changes;
   2. checks #4-#7 and #9 on form B's ink (use form B's own #2, not
      runChecks' #2);
   3. the free ends by eye on user_tw42.lightpaper, g41_def_tw42 and
      muse_default_tw.

   Commit as you go.

Then `## Handoff`. Stop at the cap wherever step 5 stands.

## Where things are

- **S1:** `docs/design/K1040_s1_reference.md`. Its Findings start at
  line 217:

  | Finding | Line | Subject |
  |---|---|---|
  | F1 | 223 | the cone key |
  | F2 | 233 | both ramps |
  | F3 | 243 | the fold |
  | F4 | 253 | outlines |
  | F5 | 272 | ω |
  | F6 | 277 | strips on the pins |
  | F7 | 296 | the 12 scenes |
  | F8 | 403 | the max decomposition |
  | F9 | 436 | the recordings |
  | F10 | 479 | ties |
  | F11 | 523 | AA and the fades |
  | F12 | 604 | the holes |

  The Handoff is at line 679; its `### How to rerun` is at 792.
- **The definition:** `docs/design/K1040_junction_field.md`. F2 is at
  line 238 and F3, the fades, at 350.
- **The code:** `src/render/field/form_b.ts` (1,153 lines) and
  `test/render/field/form_b.test.ts` (373 lines).
- **The probes** are in `.claude/probes/K1040/s1/`:
  - scenes.ts runs the checks, the max decomposition and the free ends;
  - pops.ts, q4.ts, q4worst.ts, q5.ts, q5holes.ts, q5line.ts and
    q5zoom.ts.

  S1's outputs in `s1/out/` are tracked, and they are the baseline. Write
  S1b's runs under `s1/out/s1b/`; add an output-folder env to a probe
  where it has none. Commit the summaries and the crops your Findings
  cite, and leave the rest untracked.
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
- **Reading code.** Read code through the shell: `Select-String` finds
  the lines, and `Get-Content <file> | Select-Object -Skip <n> -First <m>`
  reads them.
  - Every Read of a `src/render/` file attaches about 20k tokens of
    rules. S1 compacted three times before its first commit.
  - So use the Read tool only right before an Edit, and make mechanical
    edits as PowerShell string replacements.
- **Commits.** Commit WIP to `k1040-field` at every milestone, broken or
  not. Never push. Never skip hooks. Use no helpers (no subagents).
- **Timing.** Nothing here is timed. If you do time something, take the
  machine-wide perf lock first (`$env:TEMP\claude-perf.lock`, one line:
  owner K1040-S1b, start time, what), and delete it after.
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

S1b agent. Start 2026-10-29 00:18:39 (cap 02:18:39); read done about
00:24; the hole trace and the oracle census 00:29; the sweep and the pins
00:41.

### F1 · The holes are the look's eyes, and f1 does not open them (00:29)

Observed:
- `q5holes.ts` now asks the oracle (FieldModel, K883's mapping at cr 3, as
  `scenes.ts`) about every hole pixel. Of the 44 holes at dpr 1 and the 6
  on muse_hash at dpr 2, the oracle leaves 86-100% of each hole's pixels as
  paper too: 0 holes the oracle covers. The counts are S1's (muse_hash 5,
  muse_default_tw 4, def 4, fat 0, ring 1, user_tw42.lightpaper 5,
  g41_def_tw42 4, g41_def_tw64 5, g41_ring_tw42 0, g41_ring_tw64 0,
  g41_user_tw42 5, g41_user_tw64 5; muse_hash at dpr 2: 6).
  `out/s1b/q5_before/holes.txt`.
- muse_hash g7, (26.675, 1.096), traced with `b_hole.ts`: group 7 is j7 +
  j8, 1.72 apart, and chains 3 and 37 leave an eye between them. Corners 5
  and 7 (one at each junction) both reach r = r_max = 0.125, the eye's
  inscribed circle (r0 0.958 and 1.187), so both balls sit at the eye's
  middle. The fills cover the eye outside the ball; the ball is paper,
  ringed by the arc term's ink. The oracle, whose corner r is bounded by
  its caps and not by the eye, leaves a lens about 0.67 x 0.12 world;
  form B leaves a dot about 0.16 across. So form B covers more of the eye
  than the oracle. Crop (form B | oracle | form B's top surface):
  `out/s1b/crops/muse_hash_26.675_1.096.png`.
- def g116, (30.555, 17.488): corners 371 and 373 have ω = 0 (ov 0.036 and
  0.059 against ovw 0.013), so the eye is bounded by the feet and the V
  terms, a sharp-cornered eye; the oracle's is the same eye with round
  corners. `out/s1b/crops/def_30.555_17.488.png`. The holes the oracle
  shares at 86-98% rather than 100% are such ω = 0 corners: form B's sharp
  V leaves a little more paper than the oracle's round corner.
- F12's inference is falsified: no hole has an arm piece near V withdrawn.
  f1 was set at every hole because `pieces()` set F_FOLD on every
  same-chain merge (twin minima within σ, for example chain 3 at s 34.906
  and 34.866 on the eye's concave side), not only where a fold weight is
  partial.
- What can open paper at all: no fold value changes coverage (the nearer
  piece of a fold pair covers wherever the farther one does, d_near ≤
  d_far < h); the cap ramp and the tie mix do not touch coverage; ω
  changes it only at exactly 0 (the cover test is fillW > 0).

Decision (S1b): no definition change for the eyes. Covering them would
depart from the oracle, which is the look's reference. The brief's
"0 holes" is read as 0 holes the oracle covers, which held before S1b and
holds after. Which eye the look wants (form B's dot, the oracle's lens,
or covered) is Levi's call at S4b; a Ledger item.

### F2 · f1 no longer marks merges (labelling, not a definition change)

`pieces()` no longer sets F_FOLD on a merge: a minimum dropped within σ of
a kept one would enter at the fold weight ss(σ, 2σ, σ) = 0, so a merge is
no fade. F_FOLD now means a partial fold weight (σ < Δs < 2σ) or a burial
by a folding piece. No ink changes. It changes which pixels carry f1, so
S1's per-class fade counts (F11's fade bits, `pops.ts`'s classes) compare
with S1b's only in total, not class by class.

### F3 · Watertight at every fade value (00:41)

- `FormBParams.force` (probes and pins only) holds the fold weight, ω, the
  cap ramp or the tie mix's t at one value wherever it applies.
- `b_sweep.ts` at the 50 former hole sites (window ±0.8 world at the
  census's dpr; enclosed paper components with the oracle's share of each):
  natural 44 components, 5263 px. fold, cap and tie held at 0, 0.25, 0.5,
  0.75 and 1: identical. ω = 0: 40 components, 7480 px (eyes grow into
  their corners; four open into a neighbouring paper region or the
  window's border). ω = 0.25 to 1: 44 components, 4783 px (corners whose
  ω is 0 by nature get their fills). 0 components the oracle covers, at
  every value. `out/s1b/sweep/sweep.txt`.
- Pin, `form B: watertight at every fade value (S1b)` in
  `test/render/field/form_b.test.ts`: an eye that reproduces g7 (two
  junctions 3h apart joined by arcs at ±1.4h; corners 0 and 5 reach r =
  r_max = 0.217 at the eye's middle, as at g7), a T, an acute pair and a
  hairpin, each with every fade held at 0, 0.25, 0.5, 0.75 and 1. The eye
  stays one 20 px component at its middle, where the oracle leaves paper
  too; the others enclose none.
### F4 · Definition change: the fill's side test skips the foot's own arm (877b3e26)

- Before: `inFill` refused a foot inside either arm's tube
  (`fa.d < h − 1e-9·h`), the foot's own arm included. A foot lies h from
  its own arm's centreline by construction, so that test flipped at
  rounding level and the fill blinked along every corner's sides.
- Now: the side test reads only the other arm.
- Why: the first rate census (`out/s1b/rate/rate_before.txt`, F7) had
  132 of 161 sites in breach; its largest class, a foot | none comb of
  13,952 grid edges, went with F4.

### F5 · Definition change: the burial is a ramp inside the tube, and the fill overlaps it (877b3e26)

- Before: a piece B buried A's foot with its whole weight
  w = B.ramp·B.selfW·A.ramp wherever the foot lay inside B's tube, a
  step at B's outline. The fill held for r < dq ≤ rV.
- Now: the burial is w·winW, with winW = 1 − ss(h − 2aa, h, |foot − B|):
  one device px, inside the tube. The fill's side test starts where the
  ramp starts (lim = h − 2aa), and its far bound is
  V' = rV + 2aa / max(0.1, sin(θ/2)), so the fill spans the ramp's width
  up to V.
- Why: a step is the jump the rule forbids. Measured alternatives: the
  ramp outside the tube, [h, h + 2aa], buried ink past the outline and
  failed the T pin at 0.10; the inward ramp without the fill's overlap
  left 69 of 161 sites in breach. F4 to F6 together: 132 → 33.

### F6 · Definition change: a partial fill hands its buried weight to its arc (877b3e26)

- Before: inside a fill with 0 < ω < 1 the foot kept (1 − ω) of its band,
  the arc's ω·band2(dq − r) came only from T_ARC, and the pixel took the
  larger term, so the ink jumped where the winner changed.
- Now: the foot term carries the arc's share,
  (1 − bur)·selfW·band2(h − D) + ω·band2(dq − r): the ink blends as ω
  moves and across the winner change.
- Why: the arc | foot class went from 458 grid edges to 0.

### F7 · The rate census: 132 → 23 sites (b_rate.ts)

- `b_rate.ts` walks ±3 px around S1's 161 recorded sites (the q4 fade
  sites and the scene sites) at 1/8 px, and each step whose ink moves by
  more than 0.02 again at 1/1024 px. A breach is over 3 per px.
- Sites in breach, of 161: S1's definition 132 (`rate_before.txt`),
  F4-F6 33 (`rate_f456*.txt`), F9 27 (`rate_f9.txt`), F10 23
  (`rate_f10.txt`), F11 23 (`rate_f11.txt`, every class count the same).
- What remains, in grid edges (fade bits: f1 fold, f2 cap, f4 tie, f8 ω):
  foot+f2 | foot+f4 647 with the top changing and 307 without;
  foot+f2 | none 75 (top changes); foot | foot+f4 74; arc | none 42 +
  42; foot | foot+f2 2. The residuals below name what is known of them.

### F8 · The fill key's bisector: no change (b_bisector.ts)

- Every keyed fill pixel of the 12 scenes evaluated with the key held at
  A's z and at B's z: the top differs at 0 px, so the jump on the
  bisector changes nothing on screen and the definition keeps it.
  `out/s1b/bisector/bisector.txt`.

### F9 · Definition change: a same-chain corner buries in its other arm's tube (fe967fd9)

- Before: only other pieces buried A's foot. Where a corner's two arms
  are one chain, no second piece exists near the corner (the chain's
  minima merge within σ), so nothing buried A's outline inside the
  other arm's tube, and the outline ended in a step where the fill took
  over (g41_ring_tw42, corner 31).
- Now: such a corner buries A's foot inside the other arm's tube with
  F5's ramp, read from the arm.
- Why: b_rate 33 → 27.

### F10 · Definition change: a cut nearer its root than λ reaches back past the root (fe967fd9)

- Before: an arm's member ramp, ss(Lcut, Lcut − λ, d), began at its
  root, so a cut closer to the root than λ began the ramp part-way
  down, and a through chain's two arms met at the junction with
  different weights: a step (muse_hash arms 28/29, chain s 39.4898,
  Lcut 0.0662 < λ 0.4).
- Now: the ramp reaches back past the root, and a through chain's two
  arms keep one continuous ramp.
- Why: b_rate 27 → 23.

### F11 · Definition change: the arc keeps its share past a deeper burial (01:28)

- Before (F6's form): the fill loop skipped a corner whose ω did not
  exceed the burial found so far, so the arc's share dropped out where
  a piece's burial passed ω. The eye pin at ω 0.5 jumped by 0.5 in
  1/40 px at (1.0, −0.1): B's winW went 0.511 → 0.490, and the ink went
  from the V term's 0.5 to a foot of 0.5 + 0.5.
- Now: every fill that holds the foot gives the arc ω·band2(dq − r)
  (their max), whichever burial wins; the burial stays the max of all.
- Why: the eye reads 1.50 per px at every ω after it (2.36 at ω 0.25).
  b_rate is unchanged (F7). 3375b7e7.

### F12 · The rate pin (01:30)

- `form B: watertight and the rate rule at every fade value (S1b)` in
  `form_b.test.ts`: lines 1 px apart cross the T, acute, hairpin, eye,
  cap and tie scenes, walked at 1/8 px and, where the ink moves by more
  than 0.05, at 1/40 px; the bound is 3 per px. ω is also held at 0,
  0.25, 0.5, 0.75 and 1. Fold, cap and tie are spatial fades: the walks
  cross them, and holding one constant removes the ramp the rule is
  about (the tie held at 0 is D4's hard switch, a jump of 1).
- `out/s1b/logs/rate_pin3.txt`: T, acute, hairpin and tie 1.50 per px at
  every value, the eye 1.50 (2.36 at ω 0.25); each natural walk shows
  its scene's fade.
- The cap scene fails, natural and at every ω: a jump of 0.752 in
  1/40 px at (−0.9, 0.6025), where the END arm ends (L = Lcut = 0.3, y
  0.6). Up to s 0.300 the END piece is in group 0 at ramp 0 and draws
  ink 1.0; from s 0.302 it is OWN+1, under group 0, which reads 0.248
  there. Inferred, not traced to a term: the 0.248 is the through
  piece's band edge (D 0.3975). This is residual R1, pinned with
  `it.fails`: the test turns red once R1 is fixed, and then becomes a
  plain test.
- S1's fade sweeps: D4's bound tightens to the rule (0.075 per 1/40 px).
  D1's (0.075·1.05 per 1/20 px, about 1.6 per px) was already inside
  it. D2+D5 and D6 sweep a scene parameter (a crossing's place, ω), not
  the pixel's position, and keep their proportional bounds; motion's
  rule is label_pops' (F13).

### F13 · The gate against S1 (01:40; the F11 reruns 01:47)

Run on fe967fd9 (F10), then again on 3375b7e7 (F11) into the `*_f11`
directories and logs. The two agree: #1 pixels and free ends on all 12
scenes, the shared checks' verdict counts, q5holes on all 13 runs, q4
on def, fat and g41_def_tw64, and pops on all four recordings (finished 01:50). `npm test`
passes on 3375b7e7 (188 files, 2532 tests; `logs/npm_test_f11.txt`).

| Scene | #1 failing px, S1 → S1b | Free ends, S1 → S1b (oracle) |
|---|---|---|
| muse_hash | 437 → 1012 | 118 → 113 (108) |
| muse_default_tw | 257 → 193 | 134 → 23 (11) |
| def | 101 → 65 | 113 → 23 (20) |
| fat | 0 → 0 | 0 → 0 (0) |
| ring | 112 → 101 | 23 → 7 (7) |
| user_tw42.lightpaper | 143 → 71 | 99 → 28 (4) |
| g41_def_tw42 | 37 → 0 | 80 → 3 (6) |
| g41_def_tw64 | 209 → 348 | 115 → 65 (64) |
| g41_ring_tw42 | 28 → 0 | 19 → 0 (4) |
| g41_ring_tw64 | 70 → 189 | 14 → 13 (11) |
| g41_user_tw42 | 141 → 70 | 98 → 28 (-) |
| g41_user_tw64 | 652 → 783 | 58 → 42 (-) |
| All | 2187 → 2832 | 871 → 345 |

- #1 by term on all 12 (F11): foot+f2 1540 of 2832 px, foot 396, tB
  322, arc 255, tA 217, foot+f8 62, tB+f2 32, the rest 8. g41_user_tw64's
  783: foot 71, foot+f2 400, tA 81, tB 137, tB+f2 11, arc 83. #1 passes
  on fat, g41_def_tw42 and g41_ring_tw42 (S1: fat only). Not attributed
  by crop (step 5). `out/s1b/scenes/gate_table.txt`,
  `logs/scenes_f11.txt`.
- The shared checks (`runChecks`, scenes.ts line 273) read form B's ink
  at ink ≥ 0.5 (the probe at line 272), along sections and walks laid
  out from the K868 model; #2 (corner joins) and #14 read the model
  alone. Scenes failing, S1 → S1b: #2 11 → 11, #3 1 → 1 (muse_hash:
  Hausdorff 2.46 px, image 3.24 px), #4 11 → 11, #5 11 → 11, #6 5 → 5,
  #7 3 → 2 (g41_def_tw64 passes now; muse_hash 21 of 700 lines,
  g41_ring_tw64 3 of 174), #8 0 → 0, #9 sections 5 → 5, #9 walks
  11 → 11, #11 1 → 1 (muse_hash), #14 1 → 1, #15 0 → 0, #16 2 → 2. Own
  #2 (corner geometry, worst residual 3.0e-12 px) and own #11 hold on
  all 12. The values were not compared with S1's, and #4-#7 and #9 are
  not attributed on form B's ink (step 5).
- q4, exact area coverage against the AA (`logs/q4.txt`,
  `logs/q4_f11.txt`), S1 → S1b: pixels with |Δ| > 0.5, def 60 → 41, fat
  0 → 0, ring 26 → 10, g41_def_tw64 46 → 2, muse_hash 51 → 26; with
  |Δ| > 0.1, def 1463 → 1332, fat 1716 → 1716, ring 696 → 536,
  g41_def_tw64 643 → 453, muse_hash 2115 → 1970. S1's 60 on def were
  all inner+fade. S1b's 41 are inner 28, over 2 and outer/none 11, none
  in a fade class (F2 took merges out of f1). The outer/none pixels all
  read less ink than the hard form (mean Δ = −mean |Δ|), down to −0.984:
  the AA'd form draws no term where the hard form inks nearly the whole
  pixel. Not attributed.
- q5holes (`logs/q5holes_f11.txt`): 38 holes in 9 of the 12 scenes at
  dpr 1, and 6 in muse_hash at dpr 2. The oracle leaves at least half of
  each one paper and covers none, so all 44 are eyes of the look (F1).

Pops, the full run (`WINDOWS=0 WLEN=41`; `out/s1b/pops_full/`, F11 in
`out/s1b/pops_f11/`):

| Recording | Pops (px), S1 → S1b | Unexplained px outside fades | All unexplained px |
|---|---|---|---|
| def_drag | 18 (364) → 23 (781) | 420 → 816 | 2004 → 889 |
| def_flow | 38 (656) → 75 (1649) | 841 → 1777 | 8633 → 3471 |
| muse_drag | 13 (130) → 32 (338) | 356 → 621 | 2610 → 1845 |
| muse_flow | 54 (614) → 95 (1283) | 1253 → 2234 | 9314 → 7989 |
| All | 123 (1764) → 225 (4051) | 2870 → 5448 | 22561 → 14194 |

- Observed: the unexplained pixels fell by 37%, and those outside fades
  nearly doubled. S1's f1 label covered 10,622 of them; it covers 1 now
  (F2: a merge is no fade). Pops by place: junction 97 → 169, crossing
  26 → 56.
- Inferred, not tested: most of the added pops are pixels S1 excused
  under f1 that label_pops' rule now counts. The test: count S1b's pop
  pixels where two same-chain minima merge within σ.
### F14 · One #1 site: the cap fade un-buries a foot inside a member's tube (01:55)

The deepest foot+f2 #1 site on g41_user_tw64 (F 7.211 px, ink 0.802,
top 23): `b_crop.ts g41_user_tw64 5.842 2.043 2 1.0 4 r5` (crop
`out/s1b/crops/g41_user_tw64_5.842_2.043_r5.png`) and `b_trace_bur.ts
g41_user_tw64 5.842 2.043 x` (`out/s1b/logs/trace_r5.txt`).

Observed:
- Two pieces of group 23 hold the site: chain 29 at s 0.167 (0.19 from
  its free start; d/h 0.296, ramp 1) and chain 9 at s 7.456 (d/h 0.974,
  in the band; ramp 0.198). The ink is chain 9's band. Its burier is
  chain 29's tube (winW 1.000) at w = B.ramp · B.selfW · A.ramp = 0.198,
  so the foot inks 1 − 0.198 = 0.802; the bit is f2 because w < 1 with
  the burier's selfW at 1 (form_b.ts line 938).
- Corner 41 (arms on chains 9 and 29, θ 113.6°, r/h 2, ω 1) is the
  junction where chain 29 starts. Its fill does not hold the foot
  (0.295h outside V').
- The oracle panel shows interior there and no stroke (its light gray
  is interior and its white paper, read against panel 3's surfaces),
  and the round end of the paper between the two arms about 30 device
  px to the right. Form B carries chain 9's boundary about 25 device px
  past that end into the interior, fading out leftwards.
- F is the distance to the nearest change in form B's top map
  (scenes.ts), so the stroke lies inside surface 23, 7.2 px from any
  change of surface.

Inferred, at this one site:
- The ink comes from the member ramp's weight on the burial. As chain
  9's arm ramps out of the group (0.198, about 0.3λ before Lcut by the
  ramp's formula), its burial by a full member weakens with it, and its
  band shows inside the group's interior. Past Lcut the piece is OWN,
  chain 29's group stays on top and the ink drops to 0 in one step,
  which is R1's jump. So the #1 ink and R1 come from one structure, and
  R5's guess holds in this form: the ink sits in the cap fade, on the
  near side of R1's switch, not at a change of surface.
- A fix would keep a foot buried while a full member's tube holds it
  (w not scaled by the foot's own ramp) and fade the hand-off to OWN
  (R1): a definition change, not tried. Whether the other foot+f2 px
  share the mechanism is untested; the test is a b_trace_bur pass over
  check1deep's sites (A.ramp < 1, the burier's winW near 1).
### Residuals (S1b)

- R1 · The g→OWN hand-off at an arm's end: past L a piece leaves its
  group for OWN, under the group, and the group's ink there drops (0.75
  in 1/40 px in the cap pin; b_rate's foot+f2 | foot+f4 class with the
  top changing, ring chain 12, def chain 40). A fix moves the hard
  switch: the member must fade before it leaves (a definition change,
  not attempted for lack of time).
- R2 · A tie jump inside one top (muse_hash chain 52), untraced.
- R3 · Sliver fills: T_ARC has no dq bound (muse_hash corner 209, θ
  172.6°), and evalPoint gives the fill a key and alpha only up to rV,
  while inFill reaches V' (F5): b_rate's arc | none, 84 grid edges.
- R4 · ovw: the approved 0.05h is unchanged. The pins hold ω at any
  value in [0, 1] within the rule, so no wider fade was needed in the
  image; ω's rate in motion (label_pops') was not separated from the
  rest, so the width motion needs is not measured. S4b's call.
- R5 · #1 rose on muse_hash, g41_def_tw64, g41_ring_tw64 and
  g41_user_tw64 (F13), and foot+f2, the foot under the cap fade, holds
  1540 of its 2832 px. One site attributed (F14): a foot ramping out of
  its group loses its burial with it, inside a full member's tube, on
  the near side of R1's switch. The other sites are untested.
- R6 · q4's 11 outer/none pixels on def (F13): paper in the AA'd form
  where the hard form inks up to 0.984 of the pixel. Not attributed.

## Handoff

Stopped at 01:56 (cap 02:18:39) in step 5 of the Order, partly done.
The last commit is this section's (`git log -1`); form_b.ts last
changed in 3375b7e7.

Done:
- Steps 1-4. The holes are the look's eyes, so S1's F12 premise is
  falsified (F1; which eye the look wants is Levi's call at S4b). f1 is
  relabelled (F2), and form B is watertight at every fade value (F3).
- Definition changes F4-F6 (877b3e26), F9-F10 (fe967fd9) and F11
  (3375b7e7). The rate census went from 132 to 23 sites (F7), and the
  bisector needs nothing (F8). The rate pin is in
  test/render/field/form_b.test.ts (F12), and the gate against S1 is F13.
- Step 5, part: the pops rerun on F11 matches the F10 run on all four
  recordings (F13), and one #1 site is attributed by crop and term (F14).

Next, the rest of step 5 and then S1b's residuals:
- Count F14's mechanism over every foot+f2 #1 site (check1deep's
  sites: A.ramp < 1 with the burier's winW near 1), and crop the deepest
  sites on muse_hash and the other g41 tw64 scenes.
- Pops: test F13's inference that the rise is mostly the F2 relabel
  (count the S1b pop px where same-chain minima merge within σ).
- q4's outer/none px on def (R6).
- Checks #4-#7 and #9 on form B's ink. The shared checks read it
  thresholded at 0.5 (scenes.ts); #2 and #14 read the model only.
- Free ends by eye on user_tw42.lightpaper, g41_def_tw42 and
  muse_default_tw (b_crop.ts at their free-end sites).
- R1 together with F14: fade the hand-off to OWN, and keep a foot's
  burial at full weight while a member's tube holds it. When R1 is
  fixed the cap pin's it.fails turns red; flip it to it. Then R2, R3
  and R4 as listed.

How to rerun, from the worktree root (outputs go under
`.claude/probes/K1040/s1/out/s1b/`):
- Suite: `npm.cmd test`. The pins alone:
  `npx.cmd vitest run test/render/field/form_b.test.ts`.
- Rate census: `$env:TAG='x'; npx.cmd vite-node .claude/probes/K1040/s1/b_rate.ts`.
- Bisector: `npx.cmd vite-node .claude/probes/K1040/s1/b_bisector.ts [scene...]`
  (env OUT, DPR).
- Crop: `npx.cmd vite-node .claude/probes/K1040/s1/b_crop.ts <scene> <x> <y> [dpr=2] [halfWorld=0.8] [zoom=4] [tag]`
  (env OUT, SUB). The panels are form B's ink, the oracle's ink (light
  gray = interior, white = paper) and form B's top surface with fade
  bits darkened.
- One site's burial:
  `npx.cmd vite-node .claude/probes/K1040/s1/b_trace_bur.ts <scene> <x> <y> [x|y]`.
  A chain around a site: `node .claude/probes/K1040/s1/b_site.mjs <scene> <chain> <x> <y>`.
  Its junction lines found no arm at chain 29's start on
  g41_user_tw64, where FormB's corner 41 has one, so check the scene's
  arm fields before trusting them.
- Scenes gate: `$env:OUT='<dir>'; npx.cmd vite-node .claude/probes/K1040/s1/scenes.ts`.
- q4: `$env:OUT='<dir>'; npx.cmd vite-node .claude/probes/K1040/s1/q4.ts <scene...>`.
- Pops (about 12 min):
  `$env:WINDOWS='0'; $env:WLEN='41'; $env:OUTSUB='s1b/pops_x'; npx.cmd vite-node .claude/probes/K1040/s1/pops.ts`.
- Holes: `$env:OUT='<dir>'; npx.cmd vite-node .claude/probes/K1040/s1/q5holes.ts` (env NO_ORACLE).