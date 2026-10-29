# K992 stage 2: continuous stops

Ledger item: K992 (knotmaze `LEDGER.md`). Stage 1's brief, findings
(F1-F8) and handoff are in `docs/design/K992_corner_rules.md` on this
branch. Read its `## Coordinator's calls`, `## Rules`, F6-F8 and
`## Handoff` first, and the rest only as needed.

## Why

Stage 1's b16 is R1, the grown ball, with two stops: the steep stop and
the cap stop.
- At zoom 1 it beat master: 171 pops and 3720 px, against 376 and 10078.
- In the windows it beat master in nine of the ten, and cut their pop area
  5.5x.
- It failed one window, muse_drag@w2, on pop count: 950 pops against 879.
  Its area there was lower, 65514 px against 74530.

Its new jumps fall into three classes:
1. The caps themselves jump when the cut loop adds or removes a cut, and
   b16 follows each jump in full.
2. The cap stop takes the first point along the branch where a foot
   reaches cap - W, but a foot's position is not monotone along the
   branch.
3. The steep stop takes the first point where den falls to half its value
   at V, which has the same flaw.

b16 also raised two areas: spans at zoom 1 (791 -> 1005 px) and amp in
the windows (34819 -> 41775). Keep them in the attribution.

## Coordinator's calls (technical)

1. **Stage 1's calls 1-7 stand,** the gate (call 6) included. b16 does
   not land with its one failing window.
2. **Call 2 is read by its test, not its words.** A stop or re-fit must be
   continuous and monotone in the geometry, however it is computed.
   - The first crossing, along a branch, of a quantity that is not
     monotone along it fails that test. b16's two stops, as written, fail
     it.
   - A smoothly gated measure passes, if the sweeps show it. One example is
     your handoff's δ* = h plus the measure of the δs in [h, h + r] where
     both tests pass. Another closed form passes too.
3. **Class 1 is out of scope.** The cut loop's caps are a separate
   residual (K1000). Count class 1 separately in the attribution: a pop
   caused by a cap jump that the rule follows faithfully belongs to the
   cap, not the rule. The same goes for V's folds and its live/unsolved
   flips.
4. **Look first.** Changes in look are Levi's call (stage 1, call 7), and
   b16 already makes some:
   - corners that master makes sharp go round;
   - j175/1 gets less round;
   - corners that a cap holds get rounder.
   Levi weighs in before the rule is tuned further, so the crops come first
   (Order step 1).

## Order

1. **Crops of b16 against master,** in one composite PNG.
   - **Rows:** one labelled row per site: master on the left, b16 on the
     right, at a zoom where the corner reads at a glance.
   - **Sites:** j172/1, j38/0, j45/1, j49/2 (sharp to round); j175/1;
     j139/2 and j105/1 (cap-held).
   - **Strips:** for j12/0 and j116/2, where master pops and b16 holds, a
     short frame strip of each.
   - **Check:** crop and look at them yourself.
   - **Send:** send the coordinator a message (SendMessage to `main`) with
     the composite's path and one line per row on what changes. Go on
     without waiting for an answer.
2. **Continuous stops.**
   - Replace the two stops with forms that pass call 2, and state each in
     one sentence.
   - Sweep them through:
     - the four new sites: muse_drag t21 j139/2, muse_drag t0 j139/2,
       muse_drag t25 j105/1 and def_flow t21 j56/1;
     - the curved-end unit sweep (A');
     - stage 1's 20 sweep sites.
3. **The census.**
   - Run it at zoom 1 and in the ten windows, under the perf lock.
   - The number to beat is muse_drag@w2's 879 pops.
   - Attribute what remains by class.
4. **If the rule passes the gate:**
   - land it in `src/render/field/oracle.ts`, with
     `corner_continuity.test.ts` green;
   - run the raster census and measure the build cost;
   - make a frame strip in motion (stage 1's step 6 and calls 5-7).
5. **If it does not pass:** report the numbers by class and stop. Do not
   start on the cut loop's caps.

## Rules

Stage 1's `## Rules` hold, with these changes:
- **Stop rule:** stop at Order step 4 or 5.
  - The cap is 2 h from your start; take `Get-Date` first.
  - At 1 h 30 min, finish the step you are on.
- **Names:** new files take `*17*` in their names, and census runs write
  under `pops17/`.
- **Findings and handoff:**
  - write findings into a `## Findings` section of this brief (G1, G2,
    ...);
  - on stopping, append a `## Handoff` here.
- **Red test:** `corner_continuity.test.ts` stays red on this branch until
  a rule lands; that is expected. Commit WIP at every milestone anyway, and
  never push.
- **Images:** view an image by copying it to `$env:TEMP\k992_view\` and
  reading the copy. A Read under `.claude/probes/**` attaches 51 KB of
  probe lore (K999).
- **The final report** gives:
  - the composite's path;
  - each rule in one sentence, with its sweeps and its census at both
    zooms, by class;
  - the rule that landed, if any: its tests, the raster census, the cost
    and the pins it moved;
  - a `Ledger items` list;
  - K992's handle fields.

## Findings

**G1 (Order step 1, the crops).** `crops17.ts` renders master (oracle_m14)
and b16 through the census page's label coverage, one labelled row per
site, into `.claude/probes/S3a/pops17/crops17.png` (ring = the corner's
ball, r about q; red master, blue b16). What changes:
- j172/1 (t12), j38/0 (t31), j45/1 (t2), j49/2 (t15), def_drag: master
  draws a sharp V; b16 rounds it, r 0.77h, 0.63h, 0.61h and 0.47h.
- j175/1, def_drag t1: master r 1.12h, b16 0.72h, visibly less round.
- j139/2, muse_drag t21/t23: master 0.34h/0.48h, b16 0.59h/1.80h. At t23
  the drawn outline still shows a sharp V inside b16's 1.80h ring: the
  drawing and the ball disagree there (not chased).
- j105/1, muse_drag t28/t33: master 1.03h/0.87h, b16 1.55h/1.31h, a wider
  round bend.
- j12/0, muse_flow t29-t35: master flips between a 1.62h ball on a far
  root and a 0.33h/0.27h ball at the near V (pops at t31, t32, t35); b16
  holds 0.83-0.84h throughout.
- j116/2, muse_flow t0-t3: master flips from a 0.79h ball on a far root to
  a sharp V at t1 and back; b16 holds 0.30-0.33h.
Sent to the coordinator at 10:08; step 2 went on without waiting.

**G2 (the j139/2 t23 mismatch, chased: the drawing follows the ball).**
`fillmap17.ts` (the CPU label, `visibleAt`, and `inFill` on a grid about
q) and a 250 px/world close-up, `pops17/j139_t23_17.png` (master, b16,
b16nc = b16 without the cap re-fit, c17; green dots = the tangent points
q + uA, q + uB), show:
- The ink inside b16's 1.80h ring at t23 is another thread: chains 46 and
  84 (cluster 58), 0.82-0.88h from q, the same bend in every panel. The
  corner's own arms (chains 66, 77) touch the ring at the tangent points,
  and the drawn inner edge follows the ring's arc between them under b16
  (1.80h), b16nc (2.00h) and c17 (1.37h).
- With a foot past cap − W (b16nc: |footA| 0.797 > 0.751; arm A's cap is
  0.903, the next junction) the census draws the same thing. The label's
  fill (`inFill`) reads q, r, vq, uA, uB and the arm windows, never the
  caps, and the fill and its arc keep the corner's cluster label wherever
  the cluster's spans reach. Here they run through the cap (chain 66's
  span 65.33..73.04 passes the cap at 69.62: the next junction is in the
  same cluster). A foot past the end of its cluster's span would lose the
  arc there; none of the swept corners has one.
- So the census measures the rule at cap-held corners: the drawn arc is
  the ball's arc. What no rule checks (master, b16, c17 alike) is the ball
  against other threads. A large r can enclose a neighbour, and the
  drawing never shows it (the ball is empty space and the neighbour draws
  over it) unless the neighbour enters the fill between the arc and V.
- The r jump at j139/2 between t21 and t22 (b16 0.59h → 1.67h, c17 0.31h →
  1.27h) is arm A's cap moving from crossing 292's pass (0.607 from the
  root) to the next junction (0.903): a cap jump followed faithfully
  (class 1). Master keeps the pass cap there; why the cut loop answers
  differently is the cut loop's question (K1000), not chased.
- Also seen in the close-up: c17 draws the neighbour's apex (chains 46/84)
  with a fan of white radial hairlines where b16 draws it round and master
  cuts it; master's panel shows the same fan at another corner. The
  census attributes it (below).

**G3 (Order step 2: the continuous stops, c17 and c17f).** Probe oracles
from `mk_c17.mjs` (on b16): `oracle_c17.ts` (32 nodes, trapezoid) and
`oracle_c17f.ts` (`--refine 10`). The rule, one sentence per part:
- **Steep stop:** the ball grows from δ = h by the integral, over V's
  branch up to h + r, of the running minimum of a smoothstep of
  den/den(V) (0 at 0.3, 1 at 0.7; den = 1 + nA·nB), so a branch that
  turns steep lowers r in proportion, with no first crossing (r ≤ rRule,
  the integral's range).
- **Cap stop:** the same integrand is multiplied by a smoothstep of the
  cap slack (cap − W minus the foot's arc length, the smaller over the
  two arms; 0 at slack 0, 1 at 0.5h), so r shrinks continuously as
  either foot nears cap − W and never passes it. The cap pass runs only
  on corners whose first march came within 0.5h of cap − W (footMaxA/B);
  for the rest the factor is 1 and r is unchanged.
- **c17f's refinement:** an interval where the integrand drops by more
  than 0.125, or where the branch folds, is halved, down to 1/1024 of a
  node interval, so r follows the drop's location continuously. Why: a
  foot can jump along its arm inside one node interval (j54/1, muse_drag
  t18-23: sB 4.910 → 3.471, den/den(V) 0.011), and c17's trapezoid then
  moves r by a node interval (rRule/32) when the jump crosses a node: c17
  flips 1.350h ↔ 1.407h there, c17f holds 1.38h. Same at j12/0
  (muse_flow t3, t16, t22: c17 0.89 → 0.84 → 0.78 → 0.84h; c17f follows
  b16, 0.88 → 0.81h, smoothly).

Sweeps (largest step; `pops17/sweeps_c17.txt` has master, b16 and c17,
`sweeps_c17f.txt` c17 and c17f; every step live under both):
- **The four new sites:** def_flow t21 j56/1: b16 1.40h, c17 0.018h,
  c17f 0.0085h (2.0x the arms' step). muse_drag t0 j139/2: b16 0.167h,
  c17 0.12h, c17f 0.11h; t21 j139/2: b16 0.95h, c17 and c17f 0.79h;
  muse_drag t25 j105/1: b16 0.575h, c17 and c17f 0.475h. The last three
  are cap jumps the rule follows (`cap16.ts`: the pass caps jump inside
  one source and switch sources, class 1, K1000).
- **Stage 1's 20 sites:** c17 steps at def_flow t0 and t8 j43/1 (0.058h
  and 0.060h, 11x the arms) and muse_flow t0 j116/2 (3.4x): the node
  quantization; c17f 0.0009h, 0.0008h and 0.0002h (≤ 0.5x). Besides the
  cap sites, c17f's largest step is def_drag t2 j45/1, 0.011h (8.3x the
  arms' step; r 0.58h → 0.59h).
- **The unit sweeps (sweep steps; the test's bound is 3):** A t90: dr
  1.00, dq 1.42. A' curved: master 12.34 / 14.74, b16 4.19 / 4.98, c17
  and c17f 2.03 / 2.45. B acute30: c17 dr 1.51, dq 5.82, over the test's
  bound (q moves 1/sin 15° = 3.86 times r on the 30° corner, and c17's
  step there is the node quantization); c17f 0.50 / 1.93, as b16.

**G4 (Order step 3: the census. Neither rule passes, so this is step 5).**
`scripts/label_pops.ts --oracle .claude/probes/S3a/oracle_c17.ts` (and
`oracle_c17f.ts`), at zoom 1 (`pops17/c17`, `c17f`) and with `--windows`
(`pops17/c17z`, `c17fz`), each under the perf lock. Master and b16 are
stage 1's runs (`pops16/before16`, `b16`, `before16z`, `b16z`).
`class17.ts` sorts every pop into a class (`pops17/class17_<tag>.txt`).
Gate: no more pops per transition and no more pop area than master at
zoom 1 and in every window, and less total area at each zoom.

Zoom 1, pops (per transition) and area:

| Sequence | master | b16 | c17 | c17f |
|---|---|---|---|---|
| def_drag | 6 (0.15) 359 | 6 (0.15) 130 | 2 (0.05) 114 | 0 (0.00) 0 |
| def_flow | 27 (0.68) 1078 | 6 (0.15) 108 | 3 (0.07) 18 | 3 (0.07) 18 |
| muse_drag | 77 (1.93) 1273 | 62 (1.55) 1044 | 50 (1.25) 918 | **163 (4.08) 2600** |
| muse_flow | 266 (6.65) 7368 | 97 (2.42) 2438 | 151 (3.77) 2798 | 137 (3.42) 2358 |
| all | 376 / 10078 | 171 / 3720 | 206 / 3848 | 303 / 4976 |

The windows:

| Window | master | b16 | c17 | c17f |
|---|---|---|---|---|
| def_drag@w0 | 249 (6.22) 77105 | 220 (5.50) 12617 | 216 (5.40) 21171 | 215 (5.38) 12676 |
| def_flow@w0 | 184 (4.60) 89876 | 153 (3.83) 1631 | 153 (3.83) 1631 | 153 (3.83) 1631 |
| def_flow@w1 | 229 (5.72) 62961 | 117 (2.92) 19188 | 106 (2.65) 1435 | 94 (2.35) 867 |
| def_flow@w2 | 254 (6.35) 45930 | 239 (5.97) 3524 | 237 (5.92) 3471 | 237 (5.92) 3471 |
| muse_drag@w0 | 314 (7.85) 155916 | 105 (2.63) 13269 | 108 (2.70) 13228 | 112 (2.80) 13206 |
| muse_drag@w1 | 286 (7.15) 32786 | 260 (6.50) 2855 | 265 (6.63) 2859 | 273 (6.83) 20636 |
| muse_drag@w2 | 879 (21.98) 74530 | **950 (23.75)** 65514 | **986 (24.65)** 54975 | **990 (24.75)** 54825 |
| muse_flow@w0 | 659 (16.48) 162138 | 659 (16.48) 13156 | **716 (17.90)** 113677 | **731 (18.27)** 71445 |
| muse_flow@w1 | 393 (9.82) 150117 | 174 (4.35) 16341 | 195 (4.88) 13091 | 181 (4.53) 12761 |
| muse_flow@w2 | 878 (21.95) 213948 | 400 (10.00) 44424 | 449 (11.22) 79298 | 500 (12.50) 125903 |
| all | 4325 / 1065307 | 3277 / 192519 | 3431 / 304836 | 3486 / 317421 |

- **c17** passes at zoom 1. It fails two windows on pop count:
  muse_drag@w2 (986 against 879) and muse_flow@w0 (716 against 659).
- **c17f** fails at zoom 1 on muse_drag (163 pops against 77) and the
  same two windows (990, 731). b16 also fails muse_drag@w2 (950).
- Area passes everywhere for both, and the totals fall to 0.38 and 0.49
  of master's at zoom 1, and to 0.29 and 0.30 in the windows.

By class (`class17.ts`), as pops/area. Class 1 is the cut loop's cap
jumps that the rule follows (cap) plus V's own moves, folds and live
flips (V). The rule's own pops are rule:switch and rule:fold (V stayed
with the arms, so these are c17's node quantization), rule, and refit
without a cap change. The rest are not corner events.

| Class | zoom 1 c17 | zoom 1 c17f | windows c17 | windows c17f |
|---|---|---|---|---|
| class 1: cap | 49/1649 | 120/3628 | 111/81610 | 121/111803 |
| class 1: V | 2/9 | 2/12 | 21/4788 | 22/4602 |
| rule:switch, rule:fold | 48/1206 | 0/0 | 18/50444 | 0/0 |
| rule, refit | 12/187 | 10/163 | 55/2673 | 22/594 |
| reach | 44/308 | 40/238 | 1553/95101 | 859/48522 |
| spans | 25/237 | 114/790 | 451/26987 | 1813/120481 |
| none | 21/140 | 15/92 | 1210/42097 | 631/26424 |
| cluster, count | 5/112 | 2/53 | 12/1136 | 18/4995 |

What fails, and why:
- **muse_drag@w2** fails on small pops: under 50 px, master has 719 of
  879, c17 819 of 986 and c17f 823 of 990. Against master (by the
  census's cause), c17 has 81 jump:amp against 31; class17 puts 66 of its
  pops there in cap and 16 in V, so that excess is class 1. It also has
  reach 459 against 426 and spans 95 against 63. Without its class-1
  pops, c17 still has 904.
- **muse_flow@w0 under c17** is the node quantization at j12/0: rule:fold
  14/33796 and rule:switch 4/16648, which add up to 18023, 15773 and
  16648 px of pops at t3, t16 and t22. c17f removes it (the largest pop falls
  from 10877 to 2231 px; b16's is 994), but its count rises to 731, and
  the census now attributes those pops to spans (453/40731; c17's spans
  is 133/14559).
- **c17f moves the attribution to spans.** Its window total barely
  changes (3486 against 3431), but 1813 pops go to spans (c17: 451), and
  fewer to reach and none (in muse_drag@w2: spans 691 against 95, reach
  167 against 459, none 45 against 341). So c17f changes a pass's spans
  on many more frames. The largest spans events are at the census's spans
  keys 66, 67, 45 and 84 (`jumpev16.cjs`, not traced further). Its
  class-1 cap area also grows: 111803 against 81610 in the windows, and
  muse_flow@w2 cap 47/101774 against 29/58734.
- **c17f tips the cut loop at j100.** That is the zoom-1 failure: in
  muse_drag, class17 puts cap at 65/1947 and spans at 71/472. j100/2
  flips between r 0.873h and sharp at t4, t5, t6, t8, t10, t11, t13,
  t14, t19, t33, t34 and t36, and j100/1 flips between sharp and about
  1.49h (t10, t28-30). At t4, `cap16.ts` gives c17f's arm-A cap at
  j100/2 as 1.186h (crossing 216's pass, 3.29h out). b16 and c17 give
  3.822h (crossing 348's pass, 6.05h out), and c17f is back to 3.823h at
  t5. With the cap at 1.186h, the re-fit finds no room past V and draws
  the corner sharp. The cut loop reads the first solve's corners, and
  c17f's first solve differs from c17's only by the refinement, so the
  cut loop tips on a small change in the first solve. The suspect is the
  side choice `fa >= fb`, but this was not traced: that is the cut loop's
  caps (K1000), which this stage does not start on. footMaxA/B feed only
  the re-fit gate (oracle_c17f.ts about line 1021), not the cut loop.

Verdict: neither rule lands. `src/render/field/oracle.ts` is unchanged,
`corner_continuity.test.ts` stays red, and there was no raster14, cost14
or motion strip. The cost was not measured: the census logs' build p50s
were taken under load. c17f's unit sweeps are inside the test's bound
(G3), but the test was not run against c17f, because nothing landed.

## Handoff

Stopped at Order step 5 on 2026-10-28, inside the cap. Agent
`a8ee2b8f6b53cc951` of claude session
bf876705-c9fa-4b1f-83ea-e173dac6cff3.
- **Branch:** `k992-corners`, worktree `.claude/worktrees/k992-corners`.
  Commits: G1 `49545c96`, G2 `8dc3236a`, G3 `5badf654`, and G4 plus this
  handoff on top. Only this brief is tracked. No change to `src/`,
  tracked `scripts/`, tests or pins.
- **Evidence (untracked) in `.claude/probes/S3a/`:**
  - The rule's generator: `mk_c17.mjs`, with `--refine` (0 = c17,
    10 = c17f) and `--drop` (0.125). Its outputs are `oracle_c17.ts` and
    `oracle_c17f.ts`, plus the checks `oracle_c17chk.ts` and
    `oracle_c17dbg.ts`.
  - Probes: `class17.ts` (the classes above), `pick17.ts` (per-frame r, q
    and fit under several oracles; `--detail`), `cap16.ts` (a corner's
    caps and their sources), `nodes17.ts`, `fillmap17.ts`, `crops17.ts`,
    `sweeps17.ps1` (the 20 sites plus the unit sweeps), and
    `locked17.ps1` (one command under the perf lock).
  - Results in `pops17/`: the census directories and logs, the
    `class17_*.txt` files, `sweeps_c17*.txt`, `pick17_*.txt`,
    `crops17.png` and `j139_t23_17.png`.
- **To re-run:**
  - The census: `pwsh .claude/probes/S3a/locked17.ps1 -What "<what>"
    -Cmd "node node_modules\vite-node\vite-node.mjs scripts\label_pops.ts
    --oracle .claude/probes/S3a/oracle_c17f.ts --out
    .claude/probes/S3a/pops17 --tag <tag> --port 5392 [--windows]"`.
  - The classes: `node node_modules\vite-node\vite-node.mjs
    .claude\probes\S3a\class17.ts .claude/probes/S3a/pops17 <tag>
    --oracle .claude/probes/S3a/oracle_<x>.ts`.
  - The comparison: `node .claude\probes\S3a\cmp16.cjs .claude/probes/S3a
    <dirs...>`.
  - Env: `npx vite --config .claude/probes/S3a/vite.private-cache.config.ts
    --port 5392 --strictPort --host 127.0.0.1`.
- **Open for the next stage:**
  1. The gate. muse_drag@w2 fails for b16, c17 and c17f alike, mostly on
     small reach, none and spans pops plus class 1. The coordinator or
     Levi decides whether the gate counts class 1 and pops that are not
     corner events.
  2. Why c17f's first solve tips the cut loop at j100 (muse_drag t4/t5,
     `cap16.ts muse_drag 4 j100/2 --k 2 --oracles b16,c17,c17f`), and
     what changes the spans so often under c17f. Both lead into the cut
     loop (K1000).
  3. Landing c17f needs a `--src` mode in `mk_c17.mjs`: the chain
     mk_a16 `--src`, then mk_b16 `--src`, then mk_c17, with b16's header
     rep skipped.
  4. Smaller items:
     - c17f's footMax counts only nodes with S > 0.
     - def_drag t2 j45/1 steps 0.011h (8.3x the arms).
     - The refit gate flips without a cap change (c17: 30 pops, 405 px
       in the windows).
     - class17's cap class is a lower bound, and its V/q split is a
       proxy.
- The dev server on port 5392 is stopped.
