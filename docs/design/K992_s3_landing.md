# K992 stage 3: the foot and the part walk continuous, then land c17f on the new caps

Ledger item: K992 (knotmaze `LEDGER.md`). K1000's continuous caps land
with it here. Read these first:
- `docs/design/K1000_continuous_caps.md`: its `## Coordinator's calls`,
  Findings H4, H5 and step 5, and its `## Handoff`;
- `docs/design/K992_s2_continuous_stops.md`: its `## Coordinator's
  calls` and `## Handoff` (item 3 is the landing chain);
- `docs/design/K992_corner_rules.md`: call 6 (the gate) and `## Rules`.
Read the rest only as needed.

## Why

c19fb (stage 2's c17f on K1000's continuous caps) is close to the gate.
- **In the ten windows** it fails only muse_flow@w0, on count: 721 pops
  against master's 659. Its totals there are 3353 pops and 305033 px,
  against master's 4325 and 1065307.
- **At zoom 1** it fails muse_drag: 197 pops and 3021 px, against
  master's 77 and 1273.

Both trace to one cause in c17f's corner rule: the tangent foot toggles
between frames.
- j112 corner 1 moves its arm-1 foot between 0.99h and 2.57h on
  alternate frames of muse_drag t2-t7; master's stays near 7.51h. The
  part walk, the cluster and the cut set follow it. So j100/1 goes from
  r 1.50h to sharp and back (and j112/2 too, under c19fb), and the whole
  stroke layout around both corners changes on even frames (K1000's
  `pops19/crops19.png`).
- j42 corner 0 toggles the same way. It drives the span pops on chains
  66 and 67: 54 of muse_flow@w0's 70 excess small pops.

The caps' last jump is the part walk's `const step = h / 8` in
`partExtents`, where the reach R moves in steps. m19bs (the same walk at
h/128) passes all four of the cap test's sweeps.

## Coordinator's calls (technical)

1. **The gate is stage 1's call 6, as written,** and every pop counts
   (K1000 call 1). It covers zoom 1 and the ten windows.
2. **The foot is a pure function of the frame,** continuous in the
   geometry, as the caps are (K1000 calls 2 and 3).
   - Each choice the corner rule makes in placing the foot (a candidate,
     an arm, a branch of a solve) does one of two things:
     - it becomes a measure that moves the foot from one answer to the
       other over a span of geometry;
     - or the geometry is shown to cross it only where both answers
       place the same foot.
   - No hysteresis, no state between frames, no smoothing in time.
3. **The part walk is continuous.** The reach R either interpolates
   between the walk's steps or is solved exactly. A finer step is not
   continuity; use h/128 only as a check.
4. **K1000's open choices are accepted:** the ramp on the root side,
   partial joins over λ, Rp + 64h in place of an infinite base, and
   partial holders inside the pad. The cap test reads them. One
   exception: K1000 found new V folds and switch pops under m19b (its
   Handoff, Next item 2: muse_drag at (905, 288) t1-t17 and (766, 349)
   t30-t31; def_flow at (254, 645) t31-t32). If c19fb's successor shows
   them too, they are in this stage. If only m19b does, record them and
   move on.
5. **A steep cap is not limited per frame.** That would be state
   between frames. If steep ramps cost the gate, widen them in geometry
   (σ, λ, τ), which keeps the cap pure.
6. **Scope:**
   - in: the foot toggles at j112/1 and j42/0, any other site where the
     census shows the same cause, and the part walk;
   - in, if the attribution shows it costing pops: the refit's 0.02h
     quantization and the refit gate that flips without a cap change
     (K992 stage 2's Handoff, item 4);
   - out: class 1 (V's folds, live/unsolved flips). That stays in K1000.
7. **Landing.** If the rule passes the gate, land it, with the caps, in
   `src/render/field/oracle.ts`.
   - Use stage 2's `--src` chain (its Handoff item 3) plus a `--src`
     mode in the cap generator.
   - `corner_continuity.test.ts` and the cap test go green, with the cap
     test's gate removed.
   - Re-freeze any pin that moves, and name it in the commit message.
     Pre-launch, nothing needs back-compat.
   - Then the 12-scene raster census (`raster14.ts`) and the cost
     (`cost14.ts`).
   - Then crop pairs at rest and a motion strip, for Levi (stage 1,
     call 7). They do not block the landing.
8. **Looks.** The label is behind `lbi` (default off), so landing does
   not change the default look. When a corner looks different at rest:
   - crop it;
   - send the coordinator the path (SendMessage to `main`), one line per
     crop;
   - go on without waiting.
   K1001 (sharp or round) is open with Levi, so tune toward neither.

## Order

1. **Trace the toggles.**
   - Sites: j112 corner 1 in muse_drag t2-t7, and j42 corner 0 at
     muse_flow@w0's span pops on chains 66 and 67.
   - For each site, write one finding (F1, F2, ...): which choice in
     c17f's foot placement flips, and on what quantity.
   - Start from `ext19.ts`, `corner19.ts` and `pick17.ts --detail`.
2. **A continuous foot** (call 2).
   - Generate it from `mk_c17.mjs`, as a new mode or a new refine.
   - Add a sweep through each traced flip to `corner_continuity.test.ts`,
     or a test in its style.
3. **A continuous part walk** (call 3). The cap test passes all four of
   its sweeps on the result.
4. **The census,** under the perf lock, at zoom 1 and in the ten
   windows. Run the new rule on the new caps against master, and
   attribute it by class (`class17.ts`).
5. **If it passes the gate,** land it (call 7).
6. **If it fails,**
   - attribute the worst failing window's excess, ten small pops, as
     K1000's step 5 did;
   - fix what is in scope (calls 4 to 6);
   - re-run the census once.
   If it still fails, report and stop.
7. **Stop.**

## Rules

K1000's `## Rules` hold, with these changes:
- **Stop rule:** stop at Order step 7.
  - The cap is 2 h from your start. Take `Get-Date` first, and again at
    each milestone.
  - At 1 h 30 min, finish the step you are on, commit WIP and append the
    handoff.
  - A compaction is not a stop. After one, re-read this brief and
    `git log` before going on.
- **Names:** new files take `*21*` in their names, and census runs write
  under `pops21/`. (S3a8b uses `*20*` on `k868-s3a`.)
- **Findings and handoff:** write findings into a `## Findings` section
  of this brief, and append a `## Handoff` here when you stop.
- **Tests:**
  - `corner_continuity.test.ts` stays red until the rule lands.
  - The cap test stays gated until the caps land.
  - The rest of `npm test` stays green.
  - Commit WIP at every milestone, and never push.
- **The branch:** the coordinator rebased `k992-corners` onto master at
  `6b5c082a`. 55bfdbce was dropped, since master has it as a41af955, so
  `scripts/label_pops.ts` is master's. S3a8b is running on `k868-s3a`
  (the label's strips and switch lines, port 5381) and will merge
  first. Don't rebase or merge.
- **The perf lock:** both censuses run under the lock (copy
  `locked19.ps1` to `locked21.ps1`). S3a8b holds it for timing until
  about 14:05. Wait for it inside one blocking command, never by
  checking again on later turns.
- **Code:** read it through the shell. Use the Read tool only right
  before an Edit.
- **Images:** view an image by copying it to `$env:TEMP\k992_view\`
  and reading the copy. A Read under `.claude/probes/**` attaches 51 KB
  of probe lore.
- **Helpers:** none.
- **Env:** the census dev server on port 5392, as in K1000's `## Rules`.
  Stop it when you stop.
- **The final report** gives:
  - per site, the choice that flips;
  - the foot rule and the part walk's rule, one sentence per decision;
  - the sweeps;
  - the census at both zooms, by class;
  - what landed: its tests and the pins it moved;
  - the attribution, if step 6 ran;
  - a `Ledger items` list;
  - K992's handle fields (owner, branch, last commit, evidence, next,
    brief, env).

## Findings

- **F1 · j112/1 (muse_drag t2-t7, arms 1 and 2): the final foot is a
  fresh nearest point from q, and q sits on a medial-axis triple point.**
  - The march's steep gate stops the ball where its arm-A foot jumps
    along the arm: den/denV falls from 0.98 to 0.21 at δ − h ≈ 0.405h,
    where the nearest point on arm A moves from 0.99h to 2.58h. The ball
    touches arm A twice and arm B once there (distance ≈ 1.406h). Neither
    the cap gate (no caps in reach) nor a fold is involved.
  - On the last refined interval [d0, d1] the trapezoid gives area =
    (d0 − h) + (d1 − d0)/2, so δ* is that interval's midpoint, within
    Δ/2 (dN/2048) of the tie, on either side of it from frame to frame.
  - The final feet are `footInWindow`'s nearest points from q. Before
    the tie that is the near contact (0.99h); past it, the far one
    (2.57h), since advance() also uses nearest points and past the tie
    follows the A2-B bisector. r moves less than Δ.
  - Arm B's cap follows (32.03h against 4.85h), then the part walk, the
    cluster and the cut set.
  - Probes: `trace21.ts` (r, the feet, every local minimum of |q − arm|),
    with `oracle_c21dbg.ts` (c17f with the march's S and drops logged).
- **F2 · j42/0 (arms 0 and 1): the same choice.** The steep gate stops
  at δ − h ≈ 1.765h (den/denV 0.93 to 0.135), where the arm-A nearest
  point jumps from 3.08h to 6.33h.
  - muse_drag t2-t7: the q foot alternates 6.33h and 3.08h; arm B's cap
    3.14h and 14.43h.
  - muse_flow (whole frames f0-f40): the foot sits at 2.93h on most
    frames and at 5.78h-6.21h on f5-f7, f15, f24, f28, f33, f35, f37 and
    f39, while r moves smoothly (1.61h to 1.73h). Arm B's cap moves with
    it (14.5h against 2.96h), which moves chains 66 and 67's span ends.
- **F3 · A fold is safe; a steep stop is not.** Where the far contact
  folds the branch (advance() fails), q stays at the last node before
  the tie and nothing flips. corner_continuity's (B) graze, whose END's
  far part runs parallel, stops by a fold and passes. With the far part
  rising at 10° the stop is steep: c17f's arm-B foot moves 0.51h in one
  0.01h step, between the far part (sTB 5.02h, past leg 1's 2H) and the
  rising part (4.67h). That sweep is test (C), red on c17f
  (`graze21.ts --rise 10` prints it).
- **F4 · The tracked foot (c21: `mk_c17.mjs --refine 10 --foot track`).**
  - A tangent foot is tracked, not chosen. It is the nearest point of its
    arm within h/32 of the last foot, and the window re-centres while the
    foot sits on its edge. So it follows one local minimum of |q − arm|
    from V's own foot, and never jumps to another part of the arm that
    comes as near.
  - The branch's Newton carries each foot from iterate to iterate. The
    final feet are tracked from q's, not a fresh nearest point (F1).
  - den, the steep gate's measure, is taken from the tracked feet.
  - An overlap gate joins the steep gate: ss(1 − ov/0.05h), where ov is
    how much nearer the arm's nearest point is than the tracked contact.
    Where another part of an arm comes as near, the ball stops over 0.05h
    of ov instead of the foot jumping (call 2's measure).
  - A closed chain's arc lengths unwrap into the window's domain, so the
    seam does not move a foot.
  - Result: j112/1 (muse_drag t2-t7) and j42/0 (muse_flow f0-f40) no
    longer toggle, and corner_continuity (A), (B) and (C) pass.
  - Residual: at a concave polyline vertex the feet of the two adjacent
    segments tie, so the foot hops by about d·α (0.05-0.06h) while r and q
    stay continuous. Seen at j42/0 muse_flow f19→f20 (1.391h→1.328h) and
    f37→f38 (1.395h→1.458h), and at j112/1 muse_drag f5→f6
    (1.002h→1.057h). fmax hops with it. A window of h/64 hops the same,
    so it is the polyline, not the track. An interpolated-normal
    projection would remove it.
  - Look change: j42/0's arm A is nearly concentric with q, with minima
    at 2.08h-2.11h. The nearest point is 0.025h nearer than the tracked
    foot, so the overlap gate sits near 0.5 and the ball stops earlier:
    r 1.33h on muse_drag (c17f 1.76h), 1.11h-1.30h on muse_flow.
- **F5 · The part walk solved (`mk_walk21.mjs`, c21w = c21 on K1000's
  continuous caps).** The walk's h/8 steps only find the last overlapping
  step. The parting is then bisected between it and the next step to
  1e-6h; where the next step lies past the walk's limit, the limit stands
  in. The cap test passes all four sweeps, and corner_continuity passes
  all three.
  - Left alone: passReach (the depth pins' walk) still steps by h/8.
    Its rL/rR do not reach the corners or caps, but the label's depth
    reads them (`depth.ts`'s plateaus, the pin table in
    `label_tables.ts`), and the census books their steps as "reach".
    Master steps the same. Call 3's reach R is partExtents', so it stays
    out of this stage. The σ march already bisects.
- **F6 · The census of c21w (`census21.ps1`, `pops21/`, tags c21w and
  c21wz) fails the gate in two windows.** Master is pops16's before16
  and before16z; master's oracle on this tree (m21) reproduces before16
  exactly. Pops (per transition) and area in px:

  | zoom 1 | master | c21w |
  |---|---|---|
  | def_drag | 6 (0.15) 359 | 3 (0.07) 39 |
  | def_flow | 27 (0.68) 1078 | 21 (0.53) 158 |
  | muse_drag | 77 (1.93) 1273 | 51 (1.27) 1261 |
  | muse_flow | 266 (6.65) 7368 | 97 (2.42) 1347 |
  | all | 376 / 10078 | 172 / 2805 |

  | window | master | c21w |
  |---|---|---|
  | def_drag@w0 | 249 / 77105 | 243 / 16704 |
  | def_flow@w0 | 184 / 89876 | 153 / 1631 |
  | def_flow@w1 | 229 / 62961 | 171 / 16388 |
  | def_flow@w2 | 254 / 45930 | 253 / 4459 |
  | muse_drag@w0 | 314 / 155916 | 107 / 13188 |
  | muse_drag@w1 | 286 / 32786 | 279 / 3089 |
  | muse_drag@w2 | 879 / 74530 | **889** / 60751 |
  | muse_flow@w0 | 659 / 162138 | **685** / 11809 |
  | muse_flow@w1 | 393 / 150117 | 205 / 39200 |
  | muse_flow@w2 | 878 / 213948 | 418 / 23040 |
  | all | 4325 / 1065307 | 3403 / 190259 |

  - Zoom 1 passes on every run. In the windows the area falls on every
    window (82% in all), but muse_flow@w0 has 26 more pops than master
    and muse_drag@w2 10 more, so the gate fails.
  - By class (class17, pops/px). Zoom 1, master: cap 135/5436,
    rule:fold 30/1519, spans 42/791, rule 30/695, reach 81/651, refit
    16/442, none 26/249, rule:switch 6/135, cluster 4/104, V:status
    5/31, V:dV 1/25. Zoom 1, c21w: rule 67/1606, rule:switch 29/444,
    reach 35/262, cap 12/253, none 21/153, spans 4/41, count 1/26, V:dV
    2/12, refit 1/8.
  - Windows, master: cap 264/576213, reach 1884/155401, rule:fold
    25/110343, none 1395/97214, spans 673/73282, refit 35/36946,
    rule:switch 6/7295, V:dV 20/6069, cluster 11/1974, rule 7/433, count
    5/137. Windows, c21w: reach 1554/84367, none 1392/67723, cap
    78/18645, spans 273/12996, V:dV 18/3461, refit 42/1674, rule 22/658,
    cluster 10/463, count 12/258, rule:switch 2/14.
  - So the caps, folds, refits and spans mostly go. What stays is reach
    and none (master's own size), and at zoom 1 the rule's own class
    grows (rule 30 to 67 pops, rule:switch 6 to 29).
- **F7 · The attribution of muse_flow@w0's excess (step 6).** By cause,
  c21w against master there: none 243/4147 against 140/1989, reach
  357/6365 against 249/4588, count 11/190 against 4/69, spans 49/850
  against 200/3547, refit 25/257 against 33/133829, jump:fold 0 against
  33/18116. Sites, with `pops_near21.cjs` (the pops near a pixel per
  tag) and `near21.ts` (the corners near it, frame by frame):
  - (a) j12/0, 2h from (504, 445). c17f's foot A toggles here too (1.009h,
    then 3.856h at f28, 1.025h, 3.868h at f32): F1's choice at a third
    site. Under c17f and c19fb that made pops of −2231, +511, −420 and
    +514 px (t27, t28, t31, t32). c21w's foot moves 1.008h to 1.047h and
    its r 0.818h to 0.850h, smoothly, and those pops are gone. Seven
    small ones stay at the same areas under c17f, c19fb and c21w (t24
    +41/−4, t25 +9, t29 +24/−21/−6, t30 −17; master has only t34 +4):
    they belong to c17's steep stop there (r 0.82h against master's
    1.62h), not to the foot, the caps or the walk. c21w adds two (t27
    −7, t28 −18).
  - (b) j115/2 at (75, 745), θ 58°: 19 pops only c21w has (t30-t34, 4 to
    208 px). The march's r jumps over f28-f33 (0.224, 0.180, 0.229,
    0.138, 0.146, 0.160h), the fit's r with it (0.025, 0.027, 0.029,
    0.010, 0.038, 0.020h; "crossing 110's pass 3.4h out"), and foot A
    (0.749, 0.744, 0.739, 0.694, 0.733, 0.628h). It is not the overlap
    gate: ove 0.25 and 1e6 give the same numbers. Nor the node count:
    with 128 nodes the fit and the feet are smooth but the march still
    jumps. It is the march's refinement choice. An interval is halved
    only where S drops more than DROP (0.125) across it, so whether a
    dip gets resolved flips from frame to frame. That is a choice of
    call 2's kind, so it is in scope. With DROP 0.01 (`mk_c17.mjs
    --drop 0.01`, c21d) the march's r is 0.131-0.154h, the fit's 0.025h
    to 0.044h and foot A 0.749h to 0.730h, all smooth. c19fb's march is
    smooth here (0.224, 0.226, 0.200, 0.194h), because the tracked foot
    changes the integrand (denT).
  - (c) A refit gate at j51/1 (t25): r 2.0h to 1.99977h under c21w,
    where c19fb keeps 2.0h. 5 small pops, 34 px. Call 6 puts it in
    scope, but it is not fixed here.
  - (d) The "reach" pops are passReach's h/8 steps (F5), which master
    has too. Out of scope.
  - muse_drag@w2's 10 extra pops are not attributed (none 355 against
    344, reach 343 against 426, spans 131 against 63, jump:amp 44
    against 31, cluster 7 against 0).
  - The fix for the single re-run is (b): c21w2 = c21w with DROP 0.01
    (`mk_c17.mjs --refine 10 --foot track --drop 0.01`, then
    `mk_cap19.mjs --mode cont` and `mk_walk21.mjs`). It passes
    corner_continuity 3/3 and the cap test 4/4. At j115/2 its final r
    is 0.021, 0.023, 0.026, 0.029, 0.033, 0.038, 0.043, 0.048h over
    f27-f34 and foot A 0.750h to 0.725h. The march's r still steps
    0.119h to 0.131h at f27 to f28. DROP 0.01 makes the choice's jump
    smaller; it does not make it a measure. j12/0 is unchanged.