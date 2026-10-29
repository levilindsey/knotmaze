# K992: corner rules continuous in the geometry (stage brief)

Stage brief (coordinator, 2026-10-28). Parent: K868
(`docs/design/K868_field_border.md`). Before anything else, read S3a6's
(`docs/design/K868_s3a6_motion.md`) Coordinator's calls, F2-F6, F10 and
`## Handoff`, then K883's (`docs/design/K883_oracle_borders.md`). Ledger
items: K992 (this stage), K868, K993 (the census's blind spots).

In parallel, S3a7 (`docs/design/K868_s3a7_pieces.md`, branch `k868-s3a`)
moves the label's pieces to the GPU on master's corner rules. It does not
touch the corner rules, and this stage does not touch the pieces.

## Why

A corner of the border is a G1 rolling-ball fillet between two arms: its
vertex V, the contact q, the feet and the radius r, with K883's re-fit
where the ball would cross the cap. In motion, master's corners make
65-100% of the pop area on S3a6's pop census (`scripts/label_pops.ts`;
master pops 0.15-6.65 times a transition, F3). Both causes are in the
rules, not in the data:

- **First contact flips at grazes** (F6). Where two contacts nearly tie,
  the chosen one alternates between frames: j152/1's q alternates between
  two contacts 0.64 world apart.
- **K883's over(r) jumps and is not monotone** (F5). On def j13/0 it goes
  from -0.24 to +0.46 between r = 1.384 h and 1.51 h. On def j118/1
  master's walk stops at 0.878 h and the solve at 0.564 h.

S3a6 tried two stated rules. Calls 1-2 (a first-contact march and an
Illinois solve on over(r)) popped 5.2-9.8x master's area, and the first
exit (grow r from 0) 2.6-4.8x (F10). Neither is continuous: both still
choose among the roots of a discontinuous function.

## Coordinator's calls (technical)

1. **The criterion is continuity in the geometry.** V, q, the feet, r and
   whether the corner is live are continuous functions of the arms'
   points, except at discrete geometric events (an arm ends, a cluster
   splits or merges, two arms' order changes).
   - Where a rule chooses between candidates (two contacts, two roots),
     either the choice cannot flip without a finite change in the
     geometry, or the candidates blend continuously across the swap.
   - State each rule in one sentence, in the findings and in the code's
     comment.
2. **G1 rolling-ball fillets stay** (K881). A new re-fit must be
   continuous and monotone in the geometry, for example a closed form in
   the junction angle and the arc length to the cap. It is not a walk or
   a solve on over(r).
3. **A pure function of the frame** (S3a6 call 1): no carried root, and
   no hysteresis keyed on the last frame.
4. **Call 2 alone first:** master's root with only the Illinois re-fit
   solve from `39a295aa`. S3a6 never censused it.
5. **Candidates live in probe copies** (`oracle_*16.ts`, made as
   `oracle_nx14.ts` was) and run through the census's `--oracle`.
   - A rule lands in `src/render/field/oracle.ts` only after it passes the
     gate (call 6).
   - It lands with unit tests of its continuity: an arm swept through a
     graze, and a corner swept through the cap, with V, q and r moving by
     no more than the sweep's step allows.
   - Name the pins it moves in the commit message.
6. **The gate.** A rule lands only if all of these hold:
   - On every sequence, at zoom 1 and in the maximum zoom's windows, it
     has no more pops a transition and no more pop area than master,
     beyond the noise floor, and less pop area in total at each zoom.
   - The 12-scene raster census (`raster14.ts`, S3a6 F8) attributes every
     changed pixel.
   - `npm test` is green.
   - Its build cost is reported (S3a6 F7's method, `cost14.ts`). Cost
     blocks only if the build doubles.
7. **Changes in look** (say, a corner that was a V going round, or a
   different radius at rest) are Levi's call. Make crop pairs at rest and
   a frame strip in motion, and the coordinator takes them to Levi. They
   do not block the gate.

## Goal

A corner rule set that beats master's on the pop census at both zooms,
landed in `oracle.ts` with continuity tests. If none does, the findings
say what in the geometry stops it and what to try next.

## Order

1. **Setup, and the census windows.**
   - Start the dev server on port 5392 (K868's `env:` command with
     `--port 5392`). Every census run takes `--port 5392`.
   - Rerun master's census at zoom 1 and compare it with
     `pops14/before14/`. Any difference is the census's noise floor;
     report it.
   - **The maximum zoom** is follow mode's 277 px a world unit (S3a6 F1):
     12.4x def's fit and 13.0x muse's. Fit mode stops at 8x the fit. Check
     that frame 0's camera is the fit.
   - `--zoom` scales about the view's centre, which need not hold
     junctions. Add fixed windows to `scripts/label_pops.ts`: a committed
     list per sequence, at most three windows, centred on the junction
     clusters with the most corner pop area in `before14`. Every run uses
     the same list, and zoom 1's results stay unchanged.
   - Commit this alone, first, titled `K992: census windows`. S3a7
     cherry-picks it.
   - Run master there: `pops16/before16z/`.
2. **Call 2 alone** (`oracle_c16.ts`), censused at zoom 1.
3. **Master's discontinuities,** in Node (`fx14.ts`, `refit14.ts`,
   `dbg14_*.ts`). For each corner that jumps, list the cause (a contact
   flip, an over(r) jump, a re-fit that starts or stops, a status flip)
   and how far it jumps.
4. **Design the root and re-fit rules.** Prove each continuous on
   synthetic Node sweeps before running the census.
5. **The census,** at zoom 1, then in the windows. Iterate steps 4 and 5.
6. **If a rule beats master:** land it in `src/render/field/oracle.ts`
   with its tests. Then run the raster census, `npm test` and the cost.

## Rules

- **Branch and probes.**
  - Work on branch `k992-corners`, in worktree
    `.claude/worktrees/k992-corners`, made from master with this brief.
    Its `node_modules` is a junction to the main checkout's.
  - Commit at every milestone, broken or not, and never push.
  - The coordinator copied S3a6's probe kit into this worktree's
    `.claude/probes/S3a/` (untracked):
    - the recordings (`seq13/`), the 12 scenes (`scenes/`) and master's
      census (`pops14/before14/`);
    - the probe oracles (`oracle_m14.ts` is master's);
    - the harnesses (`fx14.ts`, `fx14_run.ps1`, `refit14.ts`,
      `raster14.ts`, `cost14.ts`, `cmp14_roots.ts`, `dbg14_*.ts`).
    `fx14_run.ps1` and `dbg14_pix.ts` are fixed to this worktree and
    port; `raster14.ts` takes the port as its third argument (`5392`).
    The other harnesses' default output paths still say `pops14`, so
    pass them a `pops16` path.
  - New files take `*16*` in their names. Census runs take `--out
    .claude/probes/S3a/pops16`.
  - The census and its page are tracked (`scripts/`). Name every change
    to them in its commit message.
  - Write each finding into a `## Findings` section of this brief as you
    get it, not at the end. It survives a compaction.
  - Stop the dev server at the end.
- **Timing and the census.**
  - Every timing, and every census run, goes under the perf lock
    (`$env:TEMP\claude-perf.lock`). Use `.claude\probes\S3a\locked16.ps1`
    (made from S3a6's `locked14.ps1`, with this stage's owner name). It
    waits inside one call while another owner holds the lock.
  - S3a7's agent runs the census on this machine too, and the cursive
    agent runs Python fits. Take each pair you compare back to back, and
    label the numbers taken under load.
- **Code.**
  - Read code through the shell (`Select-String`, then `Get-Content |
    Select-Object -Skip -First`). A Read attaches the render lore every
    time.
  - Update the tests and pins that your changes move, and name each one in
    the commit message.
- **Not allowed:**
  - the phone;
  - `npm run build` in the main checkout;
  - processes you did not start;
  - Levi's Chrome profile;
  - `LEDGER.md`;
  - the label's pieces, strips and passes (S3a7, S3a8).
- **Crop and look** at your own renders before you call a visual result
  done.
- **Levi** is named, never "he" or "his", even where older notes say so.
- **Helpers.** Only if needed: `model: sonnet`, a 1 h cap and these rules.
- **Stop rule.**
  - Stop when step 6 is done, or when no rule beats master and the
    findings say why, or 2 h after your start, whichever comes first. Run
    `Get-Date` at the start and at each milestone.
  - At 1 h 30 min, finish the step you are on and write down what is
    missing. What is left becomes the next stage.
  - A compaction is not a stop. After one, re-read this brief, its
    `## Findings` and `git log`.
  - On stopping:
    1. commit;
    2. append a `## Handoff` to this brief (committed);
    3. report.
- **The final report** gives:
  - the noise floor, the windows, and master's census in them;
  - call 2's census;
  - master's discontinuities by cause, with counts;
  - each rule tried, in one sentence, with its census at both zooms;
  - the rule that landed, if any, with its tests, the raster census and
    the cost;
  - the changes in look, with the crops' paths;
  - a `Ledger items` list (follow-ups and residuals; a question for Levi
    only about what shows on screen, in plain words);
  - K992's current handle fields (branch, last commit, evidence, next).

## Findings

Probe files are in `.claude/probes/S3a/` (untracked, `*16*`); census output
is in `pops16/`.

**F1. The noise floor at zoom 1 is zero.** `pops16/before16/` matches
`pops14/before14/` pop for pop (cause, area and centre on every
transition), and the changed-pixel sums are identical (def_drag 133126,
def_flow 686562, muse_drag 263057, muse_flow 506333). The windows run the
same pipeline; their floor was not measured separately.

**F2. Windows, maximum zoom and the fit check.**
- The maximum zoom is follow mode's `4·min(w, h)/13` = 276.92 px a world
  unit, which is 12.40x def's fit and 13.00x muse's. Fit mode stops at 8x.
- Frame 0's camera is the fit: centred, with the height binding and about
  0.55 world of padding.
- `scripts/label_pops.ts --windows` (commit 55bfdbce) runs each sequence
  in its committed windows at the maximum zoom. Runs are named
  `<seq>@w<k>`, and zoom 1 is unchanged. The windows are centred on the
  clusters with the most corner pop area in `before14`:
  - def_drag: j175;
  - def_flow: j43, j175, j172;
  - muse_drag: j116-j117, j12, j105;
  - muse_flow: j12, j116-j117, j112.

**F3. Master's census.**

At zoom 1:

| sequence | pops | a transition | area (px) |
|---|---|---|---|
| def_drag | 6 | 0.15 | 359 |
| def_flow | 27 | 0.68 | 1078 |
| muse_drag | 77 | 1.93 | 1273 |
| muse_flow | 266 | 6.65 | 7368 |

In the windows (`before16z`):

| window | pops | a transition | area (px) | largest corner causes (pops / px) |
|---|---|---|---|---|
| def_drag@w0 | 249 | 6.22 | 77105 | fold 11/55378 |
| def_flow@w0 | 184 | 4.60 | 89876 | switch 8/42123, fold 9/44116 |
| def_flow@w1 | 229 | 5.72 | 62961 | fold 6/32793 |
| def_flow@w2 | 254 | 6.35 | 45930 | refit 4/28415 |
| muse_drag@w0 | 314 | 7.85 | 155916 | refit 7/68831, fold 15/12886, switch 4/11214 |
| muse_drag@w1 | 286 | 7.15 | 32786 | refit 24/28753 |
| muse_drag@w2 | 879 | 21.98 | 74530 | fold 6/15312, amp 31/11846, refit 9/7842 |
| muse_flow@w0 | 659 | 16.48 | 162138 | refit 33/133829, fold 33/18116 |
| muse_flow@w1 | 393 | 9.82 | 150117 | refit 8/85086, fold 4/15334, amp 5/13212 |
| muse_flow@w2 | 878 | 21.95 | 213948 | fold 48/62219, switch 44/39019, amp 12/5925 |

Corner causes total 8283 px at zoom 1 and 737299 px in the windows.

**F4. Master's discontinuities, by cause** (`disc16.ts`; output in
`pops16/disc16_m.txt` and `.json`). Each corner that jumps between two
frames is classified in this order: V continued from frame t
(fold/switch), an r jump over 0.05h (subclassed: the re-fit starting or
stopping, the rule's r, a cap change over 0.05h, a jump in over(r) itself,
or else master's iteration), then q continued at the new r (fold/switch),
then amp. Census pops join on transition, key and cause. Counts are per
sequence (def_drag/def_flow/muse_drag/muse_flow); areas are zoom 1 |
windows.

| class | count | largest jump | pop area (px) |
|---|---|---|---|
| V fold | 4 (2/0/2/0) | dq 1.674 | 0 \| 0 |
| amp | 54 (7/0/45/2) | dq 0.726 | 66 \| 385 |
| q fold | 13 (2/4/2/5) | dq 2.553 | 1781 \| 186810 |
| q switch | 3 (0/2/1/0) | dq 0.503 | 271 \| 53337 |
| r: cap change | 44 (0/3/16/25) | dr 1.299h | 426 \| 62245 |
| r: master's iteration | 60 (0/9/0/51) | dr 1.130h | 895 \| 0 |
| r: over(r) jump | 3 (0/0/3/0) | | 0 \| 1615 |
| r: re-fit starts | 58 (0/1/11/46) | dr 2h | 488 \| 42396 |
| r: re-fit stops | 59 (0/2/15/42) | | 670 \| 37069 |
| r: the rule's r | 29 (6/0/23/0) | dr 0.487h | 7 \| 264 |
| rekey | 11 (0/2/6/3) | | 0 \| 0 |
| re-fit start (event) | 85 (0/12/12/61) | | 1602 \| 162742 |
| re-fit stop (event) | 81 (0/10/15/56) | | 2046 \| 190436 |
| appeared / vanished | 11 / 11 | | 0 \| 0 |
| live -> q unsolved / back | 19 / 18 | | 22, 9 \| 0 |

Shares:
- In the windows, re-fit start and stop events cover 432643 px (59%), q
  fold and switch 240147 px (33%), and cap changes 62245 px (8%).
- At zoom 1, re-fit start and stop events cover 4806 px (58%), q fold and
  switch 2052 px (25%), master's iteration 895 px (11%), and caps 426 px
  (5%).

Two mechanisms produce the jumps:
1. **q's root.** The branch from V folds where the ball reaches the
   largest ball the arms admit. Master's bisector guesses then find a far
   root, or the march finds one, or neither solves. The far root's feet
   pass the caps and the re-fit starts.
2. **The re-fit.** The over() > 1e-9h gate, the `!c.ok` skip, the
   0.02h minimum step and the snap of r < 1e-3h to 0 are each discrete
   choices.

The top sites:
- muse_flow t0 and t1 j116/2: re-fit, about 50k px each in the windows;
- muse_drag t19 j116/2;
- def_flow t8 j43/1: q fold;
- muse_flow j12/0 at t19, 30, 31 and 34;
- def_flow t0 j43/1: q switch;
- j175/1: q fold at def_flow t16 and def_drag t0 and t31;
- muse_flow j112/1 at t9, t11 (cap) and t12;
- muse_drag t30 j105/0;
- def_flow j172/1 at t26 and t32.

**F5. Call 2 alone is worse than master** (`oracle_c16.ts`, made by
`mk_c16.mjs`: master's root, with S3a6's Illinois re-fit solve in place of
the six-step iteration; `pops16/c16`, `pops16/c16z`; `cmp16.cjs`).

At zoom 1 (pops / a transition / area px, master first):

| sequence | master | call 2 |
|---|---|---|
| def_drag | 6 / 0.15 / 359 | 56 / 1.40 / 2287 |
| def_flow | 27 / 0.68 / 1078 | 74 / 1.85 / 2579 |
| muse_drag | 77 / 1.93 / 1273 | 226 / 5.65 / 5879 |
| muse_flow | 266 / 6.65 / 7368 | 532 / 13.30 / 19948 |
| all | 376 / 2.35 / 10078 | 888 / 5.55 / 30693 |

- By cause, only the re-fit's own area falls (3648 -> 2981 px). Every
  other cause grows: reach 651 -> 9991, spans 791 -> 3302, unexplained
  249 -> 2677, q fold 2765 -> 5649, cluster 104 -> 934.
- The windows were stopped after 5 of 10, to free the lock for a16:
  1230 pops / 431788 px for master against 1247 / 600235 for call 2.
  def_flow@w2 alone went from 45930 to 251848 px. muse_drag@w0 improved
  (155916 -> 118219), and def_flow@w0 is unchanged.
- The largest new pop (`c16/muse_flow_crops/pop_reach_0_t2.png`, 205 px)
  is a corner whose border changes from a square notch to a round arc in
  one frame.
- Inferred, not tested: the solve lands r exactly on over(r) = 0, and
  over(r) jumps wherever master's q changes root as r varies, so the
  solved r follows those jumps. Master's six coarse steps often stop
  short of them. Call 2 needs a continuous root under it (R1).

**F6. Rules, and their Node sweeps** (`sweep16.ts`: frame t is blended
into t + 1 in K steps, every number in the scene lerped, and the corner is
followed by key).

- **R1, the grown ball.** q is V's root continued along the medial axis
  as the ball grows from h to h + r: tangent predictor, then Newton held
  near the prediction, halving the step on a miss. Where that branch
  folds, r stops at the fold, so q never changes branch.
- **R2, the closed-form fit.** r = min(R1's r, max(0, cap − W − |V's
  foot|)·tan(θ/2)) on the tighter arm, always: no over() gate and no
  iteration. The windows use the rule's r.

`oracle_a16.ts` is R1 + R2 (`mk_a16.mjs --fit tan`). `oracle_f16.ts` is
R1 with master's re-fit (`--fit master`).

Sweeps at K = 16, except K = 12 for the first. Each cell is the largest
step in q, then that step over the arms' step near the junction:

| site | arms' step | m14 | a16 | f16 |
|---|---|---|---|---|
| def_drag t0 j175/1 | 1.78e-2 | 1.536 (86x) | 0.027 (1.5x) | 0.027 (1.5x) |
| def_flow t0 j43/1 | 1.60e-3 | 0.491 (307x) | 0.0006 (0.4x) | same |
| def_flow t8 j43/1 | 1.77e-3 | 0.517 (292x) | 0.0004 (0.3x) | same |
| muse_flow t0 j116/2 | 1.29e-3 | 2.362 (1825x) | 0.557 (431x) | same |
| muse_flow t34 j12/0 | 1.40e-3 | 1.363 (975x) | 0.0004 (0.3x) | same |
| muse_flow t11 j112/1 | 5.19e-4 | 1.345 (2589x) | 0.0089 (17x) | same |
| muse_drag t30 j105/0 | 6.74e-2 | 1.163 (17x) | 0.0185 (0.3x) | 0.314 (4.7x) |
| def_flow t26 j172/1 | 1.28e-3 | 0.830 (646x) | 0.0082 (6.4x) | same |

- a16 stays live at every step of every sweep, and its r moves under
  0.001h a step except at j116/2.
- At def_drag t0 j175/1, R1 folds at r 1.13h against the rule's 1.14h.
  Master's q sat on the far root for steps 0-9.
- f16 still jumps at muse_drag t30 j105/0 (0.314, with r 0.88h -> 0.79h ->
  0.86h). That jump comes from master's re-fit, so R2 is needed as well.
- **j116/2 is the caps, not the corner rule** (`cap16.ts`). Crossing
  225's cut takes arm 2's cap from 13.96h to 0 (the pass is 3.58h out,
  inside h·cot(θ/2) + margin), so r goes to 0, sharp.
  - In master, the cut comes in once, at step 5.
  - Under a16 it flickers on and off from step 5 to step 13. The cut
    loop's holders test (spans plus pad) sits at its threshold, and the
    spans depend on the corners.
  - At the recorded frames, both ends of a16's sweep are uncut (r 0.472h
    -> 0.476h), where master pops (0.79h -> 0).

  A cut that appears is a discrete event, like a cluster merge. Making
  r continuous across it would need a continuous cap from the cut loop,
  which is outside these rules.

**F7. R1 + R2 (`oracle_a16.ts`) fails the gate.** It removes the two
causes it targets, but its fold stop makes new jumps.

At zoom 1 (`pops16/a16/`; pops, pops a transition, area in px):

| sequence | master | a16 |
|---|---|---|
| def_drag | 6 (0.15) 359 | 104 (2.60) 3802 |
| def_flow | 27 (0.68) 1078 | 75 (1.88) 1398 |
| muse_drag | 77 (1.93) 1273 | 393 (9.82) 16994 |
| muse_flow | 266 (6.65) 7368 | 789 (19.73) 32600 |
| all | 376 (2.35) 10078 | 1361 (8.51) 54794 |

a16's area by cause: fold 20219, reach 7443, amp 6911, spans 5964,
refit 5443, none 4240, switch 3480, cluster 987, count 107.

In the windows (`pops16/a16z/`):

| window | master | a16 |
|---|---|---|
| def_drag@w0 | 249 (6.22) 77105 | 280 (7.00) 33862 |
| def_flow@w0 | 184 (4.60) 89876 | 153 (3.83) 1631 |
| def_flow@w1 | 229 (5.72) 62961 | 276 (6.90) 40587 |
| def_flow@w2 | 254 (6.35) 45930 | 285 (7.13) 32721 |
| muse_drag@w0 | 314 (7.85) 155916 | 253 (6.33) 38958 |
| muse_drag@w1 | 286 (7.15) 32786 | 293 (7.33) 292339 |
| muse_drag@w2 | 879 (21.98) 74530 | 908 (22.70) 320654 |
| muse_flow@w0 | 659 (16.48) 162138 | 641 (16.02) 18352 |
| muse_flow@w1 | 393 (9.82) 150117 | 264 (6.60) 27880 |
| muse_flow@w2 | 878 (21.95) 213948 | 790 (19.75) 612284 |
| all | 4325 (10.81) 1065307 | 4143 (10.36) 1419268 |

- By cause, master to a16 in the windows: switch 92356 -> 1091 and refit
  353178 -> 83788 (the two causes R1 and R2 target). But reach 155401 ->
  549507, none 97214 -> 247456, spans 73282 -> 160328, amp 34819 ->
  82844, cluster 1974 -> 23334, fold 256946 -> 270698.
- **Why: the fold stop is ill-conditioned.** Sweep def_drag t12 j172/1
  (K 16, `fold16.ts`): master is sharp at every step (its re-fit took r
  1.253h -> 0, "the next junction"). a16's r alternates 1.182h / 1.195h
  between steps, and q jumps up to 1.22 world a step (1431x the arms'
  step, median 0.32 world). Near a fold, q's speed per unit of δ,
  |u| = sqrt(2/den) with den = 1 + nA·nB, has no bound. So a stop found
  where Newton misses lands at δs a halving apart, and q follows.
- The same at a16's other new jump sites (`sweep16.ts`, K 16, largest q
  step over the arms' step): def_drag t13 j172/1 1852x, t22 j172/1 396x,
  t23 j172/1 410x, t31 j38/0 409x, t15 j49/2 1590x, t2 j45/1 1341x.
- **A change in look, too.** Where master's re-fit made a corner sharp,
  a16 rounds it at the fold (r 1.18h at j172/1). R2's straight-arm
  closed form misses that the curved arms carry the tangent points past
  the cap.

**F8. b16 (`oracle_b16.ts`) passes zoom 1 and nine of the ten windows,
but fails muse_drag@w2 on pops. Not landed.** b16 is a16 with two stops
in place of the fold stop and R2 (`mk_b16.mjs`, κ 0.5):

- **Rule 1, the steep stop.** The grown ball stops where its branch
  turns steep, where den = 1 + nA·nB falls to half its value at V, so q's
  speed per unit of δ at a stop is at most √2 times its speed at V.
- **Rule 2, the cap stop.** A corner whose tangent feet pass cap − W is
  grown again with each foot held to cap − W, so r stops where a foot
  first reaches cap − W, measured along its arm from the root.
- Both stops are found by the march's step halving, to 1e-5 h. over() > 0
  now only decides whether the cap stop runs; nothing iterates on it.
- **For the coordinator (call 2's letter).** The cap stop finds over = 0
  along R1's branch, so it is arguably a solve on over(r). It has no
  iteration count and is monotone in the caps. But it is a first
  crossing, and classes 2 and 3 below come from that.

Sweeps (`sweeps16.ps1`, output `pops16/sweeps_b16.txt`; K 16, 12 for the
first). Each cell is the largest step in q, then that step over the arms'
step; the last column is r/h at the sweep's two ends:

| site | arms' step | m14 | a16 | b16 | r/h m14 / b16 |
|---|---|---|---|---|---|
| def_drag t0 j175/1 | 1.78e-2 | 1.536 (86x) | 0.027 (1.5x) | 0.004 (0.2x) | 1.14..1.12 / 0.75..0.72 |
| def_flow t0 j43/1 | 1.60e-3 | 0.491 (307x) | 0.0006 (0.4x) | 0.0006 (0.4x) | 1.88..1.89 / 1.88..1.88 |
| def_flow t8 j43/1 | 1.77e-3 | 0.517 (292x) | 0.0004 (0.3x) | 0.0004 (0.3x) | 1.92..1.92 / 1.91..1.92 |
| muse_flow t0 j116/2 | 1.29e-3 | 2.362 (1825x) | 0.557 (431x) | 0.0007 (0.5x) | 0.79..0 / 0.30..0.30 |
| muse_flow t34 j12/0 | 1.40e-3 | 1.363 (975x) | 0.0004 (0.3x) | 0.0002 (0.2x) | 1.62..0.27 / 0.84..0.84 |
| muse_flow t11 j112/1 | 5.19e-4 | 1.345 (2589x) | 0.0089 (17x) | 0.0003 (0.5x) | 0.67..0.58 / 0.48..0.48 |
| muse_drag t30 j105/0 | 6.74e-2 | 1.163 (17x) | 0.0185 (0.3x) | 0.100 (1.5x) | 0..0.87 / 0.52..0.51 |
| def_flow t26 j172/1 | 1.28e-3 | 0.830 (646x) | 0.0082 (6.4x) | 0.0004 (0.3x) | 0..1.18 / 0.74..0.73 |
| def_drag t12 j172/1 | 8.53e-4 | <1e-4 (0.1x) | 1.221 (1432x) | <1e-4 (0.1x) | 0..0 / 0.77..0.77 |
| def_drag t13 j172/1 | 8.30e-4 | <1e-4 (0.0x) | 1.537 (1853x) | <1e-4 (0.0x) | 0..0 / 0.77..0.77 |
| def_drag t22 j172/1 | 8.24e-4 | <1e-4 (0.0x) | 0.326 (396x) | <1e-4 (0.1x) | 0..0 / 0.77..0.77 |
| def_drag t23 j172/1 | 7.97e-4 | <1e-4 (0.1x) | 0.327 (410x) | 0.0001 (0.1x) | 0..0 / 0.77..0.77 |
| def_drag t31 j38/0 | 2.05e-3 | 0.0002 (0.1x) | 0.841 (409x) | 0.0002 (0.1x) | 0..0 / 0.63..0.63 |
| def_drag t15 j49/2 | 3.67e-4 | <1e-4 (0.0x) | 0.583 (1590x) | 0.0001 (0.2x) | 0..0 / 0.47..0.47 |
| def_drag t2 j45/1 | 7.75e-4 | <1e-4 (0.0x) | 1.039 (1341x) | 0.0003 (0.3x) | 0..0 / 0.61..0.60 |
| muse_drag t21 j139/2 | 7.43e-3 | 0.078 (10x) | 0.437 (59x) | 0.453 (61x) | 0.34..0.39 / 0.59..1.67 |
| muse_drag t0 j139/2 | 2.63e-2 | 0.093 (3.5x) | 0.120 (4.6x) | 0.093 (3.6x) | 1.19..0.18 / 1.24..0.39 |
| muse_drag t13 j139/2 | 1.46e-2 | 0.017 (1.2x) | 0.029 (2.0x) | 0.019 (1.3x) | 0.04..0.23 / 0.19..0.45 |
| muse_drag t25 j105/1 | 2.89e-3 | 0.175 (61x) | 0.175 (61x) | 0.287 (99x) | 0.24..0.80 / 0.27..1.16 |
| def_flow t21 j56/1 | 1.74e-3 | 0.0007 (0.4x) | 0.0007 (0.4x) | 0.573 (329x) | 1.79..1.79 / 1.79..0.39 |

- b16 stays live at every step of every sweep.
- At every F6 and F7 site b16 moves q at most 1.5x the arms' step,
  including all of a16's fold-stop jumps (j172/1, j38/0, j49/2, j45/1).
- The last five rows are the sites of b16's new jumps in muse_drag@w2 and
  def_flow@w2 (below).

Unit sweeps (`unit16.ts --oracles m14,b16 --n 100`; the largest step
over the sweep's step):
- (A) t90's END cut through the cap: b16 1.41; r goes from 1.5h to 0.
- (B) acute30's graze: b16 1.93, master 905. Round throughout (r 0.150h
  to 0.402h).
- (A') a curved END through the cap: b16 4.50 (12.35 at N 400). r jumps
  1.653h -> 1.512h (q 0.167h) between L 2.150h and 2.145h. Master's q
  jumps about 0.74h there.
- `test/render/field/corner_continuity.test.ts` is (A) and (B). On
  master, (B) fails (q jumps 905 sweep steps). b16 passes both.

At zoom 1 (`pops16/b16/`; pops, pops a transition, area in px):

| sequence | master | b16 |
|---|---|---|
| def_drag | 6 (0.15) 359 | 6 (0.15) 130 |
| def_flow | 27 (0.68) 1078 | 6 (0.15) 108 |
| muse_drag | 77 (1.93) 1273 | 62 (1.55) 1044 |
| muse_flow | 266 (6.65) 7368 | 97 (2.42) 2438 |
| all | 376 (2.35) 10078 | 171 (1.07) 3720 |

By cause, master -> b16 (px): refit 3648 -> 1310, fold 2765 -> 330, amp
1225 -> 719, spans 791 -> 1005, reach 651 -> 211, switch 614 -> 0, none
249 -> 105, cluster 104 -> 40, status 31 -> 0.

In the windows (`pops16/b16z/`):

| window | master | a16 | b16 |
|---|---|---|---|
| def_drag@w0 | 249 (6.22) 77105 | 280 (7.00) 33862 | 220 (5.50) 12617 |
| def_flow@w0 | 184 (4.60) 89876 | 153 (3.83) 1631 | 153 (3.83) 1631 |
| def_flow@w1 | 229 (5.72) 62961 | 276 (6.90) 40587 | 117 (2.92) 19188 |
| def_flow@w2 | 254 (6.35) 45930 | 285 (7.13) 32721 | 239 (5.97) 3524 |
| muse_drag@w0 | 314 (7.85) 155916 | 253 (6.33) 38958 | 105 (2.63) 13269 |
| muse_drag@w1 | 286 (7.15) 32786 | 293 (7.33) 292339 | 260 (6.50) 2855 |
| muse_drag@w2 | 879 (21.98) 74530 | 908 (22.70) 320654 | **950 (23.75)** 65514 |
| muse_flow@w0 | 659 (16.48) 162138 | 641 (16.02) 18352 | 659 (16.48) 13156 |
| muse_flow@w1 | 393 (9.82) 150117 | 264 (6.60) 27880 | 174 (4.35) 16341 |
| muse_flow@w2 | 878 (21.95) 213948 | 790 (19.75) 612284 | 400 (10.00) 44424 |
| all | 4325 (10.81) 1065307 | 4143 (10.36) 1419268 | 3277 (8.19) 192519 |

By cause, master -> b16 (px): refit 353178 -> 31802, fold 256946 ->
3057, reach 155401 -> 69242, none 97214 -> 40078, switch 92356 -> 147,
spans 73282 -> 6138, amp 34819 -> 41775, cluster 1974 -> 22, count
137 -> 258.

**The windows' noise floor is zero** (measured on muse_drag's three
windows; F1 had not measured it). Master's muse_drag windows, rerun
(`pops16/floor16z/`), match `before16z` exactly: pops, area and area by
cause. So muse_drag@w2's 71 extra pops are real, and b16 fails the gate
there. muse_flow@w0 ties at 659.

**Why muse_drag@w2.** By cause, master -> b16 (pops / px): amp 31 / 11846
-> 82 / 20111, reach 426 / 24019 -> 454 / 28374, spans 63 / 3111 -> 85 /
2505, none 344 / 12400 -> 323 / 14468, refit 9 / 7842 -> 6 / 56, fold
6 / 15312 -> 0. Most are tiny: p50 10 px, and 776 of the 950 are under
50 px. `cap16.ts` traces b16's new jumps to three classes:

1. **The caps jump (the cut loop: F6's class, outside these rules).**
   muse_drag t21 j139/2: arm 2's cap at crossing 292's pass goes
   1.506h -> 1.632h at step 8, then 1.612h -> 2.259h at step 13, where the
   cut goes and the cap becomes the next junction. b16's r follows each:
   0.613h -> 0.704h, then 0.699h -> 1.650h. Master's r jumps at step 8
   (0.34h -> 0.51h), but its six-step walk never reaches the step-13 cap
   (r stays 0.52h). The caps jump the same way at t0 j139/2 (steps 10
   and 14; both oracles follow) and t25 j105/1 step 16 (1.946h ->
   2.225h: master's r 0.453h -> 0.796h, b16's 0.588h -> 1.163h). b16 is
   continuous in the caps, so it shows each cap jump in full where
   master's walk sometimes damped it.
2. **The cap stop's first crossing.** At t25 j105/1 step 7 the caps move
   smoothly (1.833h -> 1.845h), but b16's r jumps 0.344h -> 0.482h;
   master's moves smoothly. A foot's arc position is not monotone along
   the branch, so the first δ at which it reaches cap − W jumps when a
   local maximum passes the level. Unit (A') is the same.
3. **The steep stop's first crossing.** def_flow t21 j56/1 step 12 (in
   def_flow@w2): no fit runs and the caps are smooth, yet b16's r drops
   from the rule's 1.792h to 0.390h. den is not monotone along the branch
   either, and a local minimum crossed half its value at V.

Classes 2 and 3 are one flaw: a stop at the first crossing of a quantity
that is not monotone along the branch. A continuous stop has to blend
over the crossings. One untried form: δ* = h plus the measure of the δs
in [h, h + r] where both quantities pass, each gated smoothly.

**Changes in look** (b16 against master, from the sweeps; no crop pairs,
since nothing landed):
- Corners that master's walk makes sharp are round under b16: j172/1
  0.77h (0.74h in def_flow), j38/0 0.63h, j45/1 0.61h, j49/2 0.47h.
- The steep stop rounds less in places: j175/1 0.75h against 1.14h.
- Corners held by a cap are rounder, because master's walk stops below
  the largest ball that fits: j139/2 0.59h-0.70h against 0.34h-0.52h,
  j105/1 0.27h-0.59h against 0.24h-0.45h.

## Handoff

2026-10-28, stopped at 09:42 (started 08:19:52) by the stop rule's second
clause: no rule beats master, and F5, F7 and F8 say why. Nothing landed
in `src/`.

- **Branch.** `k992-corners`, worktree
  `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k992-corners`.
  The last commit is the one that adds this handoff. Never pushed.
- **Committed.**
  - The census windows, `55bfdbce` (S3a7 cherry-picks it).
  - F1-F8 in this brief.
  - `test/render/field/corner_continuity.test.ts`, sweeps (A) and (B).
    It is **red** on this branch, because src's oracle is still master's:
    in sweep (B), the graze, q jumps 905 sweep steps. b16 passes both
    sweeps (`unit16.ts`). Merge the test only together with a rule that
    turns it green, since a red suite blocks the deploy.
- **Evidence.** It is in the worktree's untracked `.claude/probes/S3a/`,
  so keep the worktree.
  - Oracles: `oracle_m14.ts` (master), `oracle_c16.ts` (call 2),
    `oracle_a16.ts` (R1 + R2), `oracle_f16.ts` (R1 + master's re-fit),
    `oracle_b16.ts`.
  - Their generators: `mk_c16.mjs`, `mk_a16.mjs`, `mk_b16.mjs`.
  - Landing copies on src's imports: `oracle_b16src.ts.txt` and
    `oracle_a16src.ts.txt`. To remake them, run
    `node .claude/probes/S3a/mk_a16.mjs --src --out <a>`, then
    `node .claude/probes/S3a/mk_b16.mjs --src --in <a> --out <b>`.
  - Node probes: `sweep16.ts`, `sweeps16.ps1`, `unit16.ts`, `fold16.ts`,
    `cap16.ts`, `disc16.ts`.
  - Census readers: `cmp16.cjs`, `popsby16.cjs`, `jumpev16.cjs`.
  - Census output in `pops16/`: `before16`, `before16z`, `floor16z`,
    `c16`, `c16z` (5 of 10 windows), `a16`, `a16z`, `b16`, `b16z`.
  - Also in `pops16/`: `sweeps_b16.txt` and `disc16_m.txt` / `.json`.
- **Not done.** The gate failed, so there is no raster census
  (`raster14.ts`), no build cost (`cost14.ts`), and no crop pairs or
  motion strip.
- **Next stage.**
  1. Make both of b16's stops continuous across non-monotone crossings
     (F8's classes 2 and 3). A first crossing jumps when a local
     extremum passes the level, and so does a running max or min. One
     untried form: δ* = h plus the measure of the δs in [h, h + r]
     where both tests pass, each gated smoothly. That measure grows from
     zero as an extremum crosses the level.
  2. Sweep F8's four new sites and unit (A'):
     - muse_drag t21 and t0 j139/2;
     - muse_drag t25 j105/1;
     - def_flow t21 j56/1.
  3. Rerun the census at both zooms. muse_drag@w2 is the window to beat:
     master has 879 pops.
  4. If the rule passes, land it with the continuity test. Then run the
     raster census and the cost, and make the crop pairs and motion
     strip for Levi.
- **Outside these rules.** The caps' own jumps (F6's j116/2 and F8's
  class 1) need a continuous cap from the cut loop.
- **Env.** All commands run from the worktree.
  - Dev server: `npx vite --config
    .claude/probes/S3a/vite.private-cache.config.ts --port 5392
    --strictPort --host 127.0.0.1`.
  - Census runs and timings go under the perf lock: `pwsh
    .claude/probes/S3a/locked16.ps1 -What <what> -Cmd <cmd>`.
  - Census: `node node_modules\vite-node\vite-node.mjs
    scripts\label_pops.ts <seq> [--windows] --oracle <oracle> --out
    .claude/probes/S3a/pops16 --tag <tag> --port 5392 [--crops 0]`.
  - Sweeps run in Node and need no lock: `node
    node_modules\vite-node\vite-node.mjs .claude\probes\S3a\sweep16.ts
    <seq> <t> <key> --k 16 --oracles m14,b16`.