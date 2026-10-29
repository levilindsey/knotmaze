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