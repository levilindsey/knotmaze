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
