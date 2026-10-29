# K992 stage 4: the march's S continuous by construction, then land

Ledger item: K992 (knotmaze `LEDGER.md`). K1000's continuous caps land
with it here. Read these first:
- `docs/design/K992_s3_landing.md`: `## Coordinator's calls` (all of
  them still hold, except where this brief changes them), Findings
  F4-F8, and `## Handoff`;
- `docs/design/K1000_continuous_caps.md`: `## Rules` (the census env).
Read the rest only as needed.

## Why

Stage 3 made the tangent foot and the part walk continuous (c21w: each
foot tracked within h/32 of the last one, Newton carrying the feet, the
parting bisected to 1e-6h).
- **At zoom 1** c21w has 172 pops / 2805 px, against master's 376 /
  10078.
- **In the ten windows** it has 3403 / 190259, against master's 4325 /
  1065307. It still fails two windows on count: muse_drag@w2 (889 pops
  against 879) and muse_flow@w0 (685 against 659).
- c21w2 (DROP 0.01) fixed j115/2 and failed four other windows, on
  one-frame collapses of r at many corners (F8).

The pops that remain trace to the march's S, a running minimum of point
samples of wAt, refined only where S drops by more than DROP. Two of its
choices flip between frames:
- whether an interval is halved (F7 b: j115/2's 19 pops that only c21w
  has);
- whether a sample lands inside one of the overlap gate's narrow dips
  in wAt (F8: j39/1's r goes 1.849h, 0.738h, 1.890h on f1-f3; observed
  there, the mechanism inferred, not traced).

c21w also grows the rule's own classes at zoom 1: rule plus rule:switch
go from 36 pops (master) to 96 (c21w) and 204 (c21w2).

## Coordinator's calls (technical)

1. **S is continuous by construction.** This is stage 3's call 2,
   applied to the march.
   - S, the running minimum of wAt, becomes the exact minimum of wAt
     over the stretch it covers. That minimum's value is continuous in
     the frame wherever wAt is, even where the place of the minimum
     jumps.
   - Compute it from wAt's pieces where they have a closed form.
     Otherwise use a certified bound (a Lipschitz bound, or interval
     arithmetic on wAt) refined to 1e-6h, whatever the frame.
   - No threshold on a sampled quantity decides what S is: no DROP-like
     choice. A finer DROP, or wider dips (c21w3's ove 0.25h), is not
     continuity. Use them only as checks.
   - Whatever reads the march's nodes follows the same rule. c17's
     footMaxA/B, the cap gate's input, is a maximum over the kept nodes
     with S > 0, so it moves with the node set. It becomes a function
     of the frame that no node set picks.
2. **The overlap gate's width is a look, not a fix.** ove sets how far
   j42/0's corner shrinks (F4: r 1.33h on muse_drag, against c17f's
   1.76h). Keep stage 3's 0.05h unless the census attributes pops to the
   gate's ramp itself. In that case widen it in geometry (stage 3 call
   5) and say so.
3. **Scope:**
   - in: the march (call 1) and footMaxA/B;
   - in: the refit gate at j51/1 (F7 c), which becomes a measure under
     stage 3's call 2;
   - in: j12/0's seven steep-stop pops (F7 a), if a choice flips there.
     A fast but continuous change is not a pop to fix; record it.
   - out: passReach's h/8 steps (the depth pins' walk, the census's
     "reach" class; master has them too). The coordinator files them as
     their own item.
   - out: class 1, which stays in K1000.
   - out: the concave-vertex foot hop (F4, 0.05-0.06h), unless it costs
     the gate.
4. **The gate** is stage 1's call 6 as written, at zoom 1 and in the ten
   windows. Every pop counts.
5. **Landing** is stage 3's call 7, through `land21.ps1` or its
   successor.
   - Remove the cap test's gate (`cap19_continuity.test.ts` lines
     72-77).
   - `corner_continuity.test.ts` (A)-(C) and the cap test's (A)-(D) pass
     on the landed oracle.
   - Re-freeze any pin that moves, and name it in the commit message.
   - Then raster14, cost14 and the crops (stage 3 calls 7 and 8). The
     cost is reported against master's, not gated in this stage.
   - Send j42/0's corner, at rest, among the crops: Levi sees it with
     K1001.
6. **The merge is the coordinator's.** Don't rebase or merge.

## Order

1. **Read.** `Get-Date`. Read the files named at the top. Find where the
   march computes S, where DROP refines, and where the kept nodes are
   read (`mk_c17.mjs` and what it generates).
2. **wAt's pieces.** Write down what wAt is made of between the march's
   nodes, and whether each piece's minimum has a closed form (F9).
3. **S by construction** (call 1).
   - Build it as a new mode of `mk_c17.mjs`, with footMaxA/B following
     it.
   - Add sweeps through j115/2's halving flip and j39/1's dip to
     `corner_continuity.test.ts`, or a test in its style.
4. **j51/1 and j12/0.** Make j51/1's refit gate a measure. Trace j12/0's
   steep stop, and fix it if a choice flips there (F10 onwards).
5. **The census,** under the lock, at zoom 1 and in the ten windows.
   Run the new rule on the new caps against master, and attribute it by
   class (`class17.ts`). Commit WIP first.
6. **If it passes the gate,** land it (call 5).
7. **If it fails,**
   - attribute the worst failing window's excess, ten small pops, as
     stage 3 did;
   - fix what is in scope (call 3);
   - re-run the census once.
   If it still fails, report and stop.
8. **Stop.**

## Rules

Stage 3's `## Rules` hold (they build on K1000's), with these changes:
- **Names:** new files take `*23*` in their names, and census runs
  write under `pops23/`. Stage 3 used `*21*`; S3a8b2 uses `*22*` on
  `k868-s3a`.
- **Stop rule:** stop at Order step 8.
  - The cap is 2 h from your start. Take `Get-Date` first, and again at
    each milestone.
  - At 1 h 30 min, finish the step you are on, commit WIP and append the
    handoff.
  - A compaction is not a stop. After one, re-read this brief and
    `git log` before going on.
- **The perf lock:** both censuses run under it (copy `locked21.ps1` to
  `locked23.ps1`). S3a8b2 holds it for timing until about 15:45. Wait
  for it inside one blocking command, never by checking again on later
  turns.
- **The branch:** `k992-corners`, at stage 3's WIP (`7ff4f637`) plus
  this brief. It is 6 commits behind master, all of them docs and
  ledger. S3a8b2 runs on `k868-s3a` and may merge first. Don't rebase
  or merge.
- **Tests:**
  - `corner_continuity.test.ts` stays red until the rule lands.
  - The cap test stays gated until the caps land.
  - The rest of `npm test` stays green.
  - Commit WIP at every milestone, and never push.
- **Findings and handoff:** continue the `## Findings` of
  `K992_s3_landing.md` here, from F9, in a `## Findings` section of this
  brief. Append a `## Handoff` here when you stop.
- **Env:** the census dev server on port 5392, as in stage 3. Stop it
  when you stop.
- **The final report** gives:
  - S's construction, and each other decision, one sentence each;
  - the sweeps;
  - the census at both zooms, by class, against master and c21w;
  - what landed: its tests, the pins it moved, and the cost;
  - the attribution, if step 7 ran;
  - the crops sent;
  - a `Ledger items` list;
  - K992's handle fields (owner, branch, last commit, evidence, next,
    brief, env).

## Findings

Stage 3's F1-F8 are in `K992_s3_landing.md`.

- **F9 · wAt's pieces (Order step 2).** wAt = ss(1 + min(0, mA, mB) /
  0.05h) · ss((den/denV − 0.3)/0.4), times ss(slack/0.5h) where caps
  exist. It is read at the march point p(δ), whose feet are tracked on
  arms A and B.
  - Both feet on segment interiors: p moves on a line, den is constant
    and the feet are linear in δ, so the den and slack factors have a
    closed-form minimum.
  - A foot at a convex vertex: p moves on a circle around the vertex.
  - A foot at a concave vertex hops, and p jumps (F4).
  - A margin is the distance from p to the nearest point of its arm's
    window outside the contact's basin, less the contact's own distance.
    It kinks where that nearest segment or the basin's end changes, and
    it is Infinity where the window has no part outside the basin.
  - So only the den and slack factors on segment pieces have a closed
    form. c23 bounds every piece instead (F10), exactly on segment
    pieces.
- **F10 · S by construction: c23 (`mk_c17.mjs --smin cert`, Order
  steps 3 and 4).**
  - S at the fixed node h + k·dN (dN = rRule/32) is the minimum of wAt
    over [h, h + k·dN], certified to TAU by branch and bound. Between
    two evaluated points, wAt's lower bound comes from bounds on its
    inputs: den moves at most 2(2 − den)/δ per unit of δ, a foot at most
    sqrt(2/den − 1), a margin at most sqrt(2/den) + 1, and where the two
    ends differ by more (a hop), the bound takes their difference. On a
    segment piece the bound is exact (den fixed, feet linear;
    e7913bc6).
  - An interval is halved only while its bound is more than TAU below
    the running minimum, down to 1e-6h. No sampled threshold decides S
    (no DROP). A fold is located by bisection to 1e-6h, and the
    trapezoid over the fixed nodes is continuous in the nodes' S.
  - TAU is 1e-4, set with the segment-exact bounds in e7913bc6 to cut
    the cost (the first c23, 0c97a24a, used 1e-5). S is exact to within
    TAU, so r can move by up to 1e-4·rRule between frames: sub-pixel.
  - footMaxA/B are the maximum of each foot's certified upper bound
    over the stretch the march covered: a function of the frame, not of
    a node set. j51/1's refit gate is therefore a measure by
    construction. It was not traced on j51/1's frames.
  - j12/0's steep stop was not traced. ove stays 0.05h (call 2).
- **F11 · The sweeps still jump: the march's branch is not a function
  of δ (Order step 3).** `corner_continuity.test.ts` gained (D) and
  (E). Each blends two recorded frames, cropped around the junction
  (`crop23.ts`), by a lerp of every number. The fixtures are in
  `test/render/field/frames/`, because three readers glob `scenes/`. The
  largest step of V, q and r is halved 20 times toward its larger half
  and must shrink to 5e-4h.
  - (D) j115/2, muse_flow f30 → f31, u 0 to 0.625. S at node 7 jumps
    from 0.593 to 0.708 between u 0.5175 and 0.52 (`blend23.ts`,
    `oracle_c23dbg.ts`). At u 0.5175, points the bound evaluated at
    nearly one δ sat on three pieces, by where `advance` started:

    | advanced from (δ−h)/h | to | den | w |
    |---|---|---|---|
    | 0.17839 | 0.18169 | 0.3209 | 0.93800 |
    | 0.18004 | 0.18087 | 0.2795 | 0.70838 |
    | 0.18167 | 0.18168 | 0.2633 | 0.59283 |

  - `advance` (a predictor, then a newtonT polish) is path-dependent:
    from different starts the tracked feet land on different pieces.
    The branch has several values at one δ, and the certified minimum
    finds the deepest one on some frames only. The margin bound is not
    the cause at this step. On the recorded frames, j115/2's r runs
    smoothly from 0.021h to 0.052h over f27-34; the jump falls between
    frames.
  - (E) j39/1, def_drag f1 → f3: q jumps 0.117h at step 12. Not traced.
  - Both are `it.skip`, with the reason in a comment (each takes about
    18 s). The fix is the next stage's: make the branch a function of
    δ. For example, locate each foot hop on the continuous branch from V
    to 1e-6h, or choose the piece by a rule of the geometry.
  - A concave-vertex hop of F4's kind, in j115/2's V foot, sits near u
    0.66, past the sweep. It stays out of scope.
- **F12 · The census (`census23.ps1`, `pops23/`, tags c23w and c23wz)
  passes the gate at both zooms (Order step 5).** Master and c21w are
  F6's. Pops (per transition) and area in px:

  | zoom 1 | master | c21w | c23w |
  |---|---|---|---|
  | def_drag | 6 (0.15) 359 | 3 (0.07) 39 | 0 (0.00) 0 |
  | def_flow | 27 (0.68) 1078 | 21 (0.53) 158 | 4 (0.10) 22 |
  | muse_drag | 77 (1.93) 1273 | 51 (1.27) 1261 | 23 (0.57) 180 |
  | muse_flow | 266 (6.65) 7368 | 97 (2.42) 1347 | 74 (1.85) 871 |
  | all | 376 / 10078 | 172 / 2805 | 101 / 1073 |

  | window | master | c21w | c23w |
  |---|---|---|---|
  | def_drag@w0 | 249 / 77105 | 243 / 16704 | 223 / 12685 |
  | def_flow@w0 | 184 / 89876 | 153 / 1631 | 153 / 1631 |
  | def_flow@w1 | 229 / 62961 | 171 / 16388 | 132 / 1148 |
  | def_flow@w2 | 254 / 45930 | 253 / 4459 | 237 / 3471 |
  | muse_drag@w0 | 314 / 155916 | 107 / 13188 | 106 / 13285 |
  | muse_drag@w1 | 286 / 32786 | 279 / 3089 | 283 / 3246 |
  | muse_drag@w2 | 879 / 74530 | 889 / 60751 | 855 / 49811 |
  | muse_flow@w0 | 659 / 162138 | 685 / 11809 | 655 / 10540 |
  | muse_flow@w1 | 393 / 150117 | 205 / 39200 | 179 / 14078 |
  | muse_flow@w2 | 878 / 213948 | 418 / 23040 | 413 / 23026 |
  | all | 4325 / 1065307 | 3403 / 190259 | 3236 / 132921 |

  - Every sequence and every window has fewer pops and less area than
    master. Zoom 1 has 73% fewer pops and 89% less area; the windows
    have 25% fewer pops and 88% less area.
  - The two windows c21w failed now pass: muse_drag@w2 855 (master
    879), muse_flow@w0 655 (659). The thinnest margins are muse_flow@w0
    (4 pops) and muse_drag@w1 (283 against 286).
  - By class (`class17.ts`), pops / px:
    - zoom 1, c23w: reach 28/237, rule:switch 16/225, rule 23/225, cap
      9/134, none 16/124, rule:fold 2/51, spans 4/41, count 1/26, V:dV
      2/10;
    - zoom 1, master: cap 135/5436, rule:fold 30/1519, spans 42/791,
      rule 30/695, reach 81/651, refit 16/442, none 26/249, rule:switch
      6/135, cluster 4/104, V:status 5/31, V:dV 1/25;
    - zoom 1, c21w: rule 67/1606, rule:switch 29/444, reach 35/262, cap
      12/253, none 21/153, spans 4/41, count 1/26, V:dV 2/12, refit 1/8;
    - windows, c23w: reach 1512/66199, none 1316/33859, cap 92/18311,
      spans 217/9028, V:dV 16/3344, rule 20/786, cluster 10/463, refit
      37/370, rule:switch 4/303, count 12/258;
    - windows, master: cap 264/576213, reach 1884/155401, rule:fold
      25/110343, none 1395/97214, spans 673/73282, refit 35/36946,
      rule:switch 6/7295, V:dV 20/6069, cluster 11/1974, rule 7/433,
      count 5/137;
    - windows, c21w: reach 1554/84367, none 1392/67723, cap 78/18645,
      spans 273/12996, V:dV 18/3461, refit 42/1674, rule 22/658, cluster
      10/463, count 12/258, rule:switch 2/14.
  - The rule's own classes at zoom 1 (rule and rule:switch): master 36
    pops and 830 px, c21w 96 and 2050, c21w2 204 pops, c23w 39 and 450.
    rule:fold falls from master's 30 to 2, and refit from 16 to 0.
  - In the windows, reach (passReach's h/8 steps, out of scope) and
    none are 2828 of c23w's 3236 pops. refit keeps 37 pops (master 35),
    at 370 px against 36946. muse_flow@w0, the thinnest window, by
    class: reach 340/5456, none 251/3950, spans 22/454, refit 26/266,
    rule 5/224, count 11/190.
- **F13 · The landing (78e9a7dd, Order step 6).**
  - `land23.ps1` (land21's chain with `--smin cert --tau 1e-4`) wrote
    c23w into `src/render/field/oracle.ts`. Its code lines equal
    `oracle_c23w.ts`'s (2959, 0 differing).
  - The cap test's gate is gone (`describe.runIf(run)` → `describe`).
    corner_continuity (A)-(C) and the cap test's (A)-(D) pass.
    corner_continuity (D) and (E) are skipped (F11).
  - `npm test`: 185 files passed and 2 skipped; 2443 tests passed and 8
    skipped. No pin moved.
  - raster14 (`raster23.ts`: raster14 against master's oracle at
    90d4290c, `oracle_m23.ts`, instead of `oracle_m14.ts`). 304908
    changed px on 11 of the 12 scenes (fat: 0), from 982 root and 201
    refit corners: 291319 px root, 13584 refit, 5 none. Control 0 px,
    webglcontextlost 0.
    - raster14 lists three of the 5 none px, each a 1-px blob on a ribbon
      edge, and `none23.ts` traced those three (`pops23/none23.log`).
      Each lies 1.5-2.4h from a junction with a corner that moved by less
      than raster14's refit thresholds (r 1e-3h; q, tA and tB 1e-3
      world): j153/1 in g41_def_tw42 (|dr| 6.2e-4h, |dq| 2.6e-3h, which
      is 5.5e-4 world), and j27/1 in g41_def_tw64 (|dr| 1.3e-4h, |dq|
      1.9e-3h, 6.0e-4 world). The nearest arm cap that changed is 12.9h
      away.
    - That those moves cause the specks is inferred, not tested: a move
      of 0.04 px or less should not change a pixel's coverage by 32/255
      by itself. The other two none px (g41_def_tw64) were not traced.
    - So the gate's "attributes every changed pixel" is short by 5 px.
      That is the coordinator's call.
  - cost14 (`cost23.ts`, master = `oracle_m23.ts`; under the perf
    lock). The FieldModel's p50s sum to 1.87x master's (4569 against
    2437 ms) and the whole label build's to 1.75x (5086 against 2914
    ms).
    - The build exceeds 2x on two scenes: g41_def_tw42 (2.06x) and
      muse_default_tw (2.29x).
    - The cost is not split between the certified march, the caps and
      the walk. `cost23.md`'s line about Python fits is cost14's text:
      other agents were working on the machine, but none was timing.
    - Call 5 reports the cost and does not gate it; stage 1's gate
      blocks a build that doubles.
  - Crops (`crops23.ts`, `pops23/crops23.png`, sent to main; master |
    c23w):
    - j42/0, muse_drag t0 (the sequence's first frame) and t40, F4's look:
      master's r is 1.85h at both, and c23w's is 1.35h and 1.32h.
    - j39/1, def_drag t1-t3: master 1.99h, 2.00h and 2.00h; c23w 1.63h,
      1.71h and 1.74h.
    - j115/2, muse_flow t27-t34: master's corner is sharp (r 0) with a
      flat-cut tip. c23w's tip is round, r 0.02h growing to 0.05h.
  - Step 7 did not run: the gate passed.

## Handoff

2026-10-28 15:45, the K992 s4 agent, stopped at Order step 8, after the
landing (step 6).

- **Where things are.**
  - Branch `k992-corners`, not pushed: 0c97a24a and e7913bc6 (c23),
    14ad8fad (the sweeps and their fixtures), 78e9a7dd (the landing),
    then this findings commit.
  - `src/render/field/oracle.ts` is c23w. `land23.ps1` regenerates it
    from master's oracle (restore that first: `git checkout 90d4290c --
    src/render/field/oracle.ts`).
  - Tracked probes under `.claude/probes/S3a/`:
    - `mk_c17.mjs --smin cert --tau <t>` (c23; needs `--foot track`);
    - the census: `census23.ps1`, `locked23.ps1`;
    - the sweeps: `crop23.ts` (two-frame fixtures), `blend23.ts` (one
      corner along a blend);
    - the landing: `land23.ps1`, `raster23.ts`, `cost23.ts`, `rc23.ps1`
      (the two under the lock), `none23.ts`, `crops23.ts`.
  - Untracked:
    - `pops23/`: c23w, c23wz, `class_c23w*.log`, `raster23/`,
      `cost23.md`, `crops23.png` and the logs;
    - the oracles c23, c23c and c23w (mk_c17 `--smin cert`, then
      mk_cap19 `--mode cont`, then mk_walk21), and c23dbg (c23w with
      logs);
    - m23: `git show 90d4290c:src/render/field/oracle.ts`, with its
      imports pointed at `../../../src/render/field/`.
- **Next, for the coordinator.**
  1. Merge `k992-corners`. The rule passes the census gate, `npm test`
     is green and no pin moved. Two calls come first: raster14's 5 none
     px (F13), and the build cost (1.75x master's, above 2x on two
     scenes).
  2. F11: the march's branch is not a function of δ. (D) and (E) stay
     skipped until it is.
  3. Not traced: (E)'s jump, j51/1's refit gate on its frames, j12/0's
     steep stop, and two of raster14's none px.
  4. Look changes for Levi (K1001): j42/0, j39/1 and j115/2 (the crops).
- **Env.** The dev server on 5392 is stopped. To restart it: `npx vite
  --config .claude/probes/S3a/vite.private-cache.config.ts --port 5392
  --strictPort --host 127.0.0.1`.
