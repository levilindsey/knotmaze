# K930: Cursive v5.3, smooth curves with few nodes

Stage brief (coordinator, 2026-10-27). Parent: K863. Previous stage: K925
(`docs/design/K925_cursive_v52.md`). Read its `## Handoff`, then
`.claude/probes/K863/trace/NOTES.md` `## v5.2`, before anything else.
After this stage comes K926 (`docs/design/K926_cursive_e.md`), which builds
on yours.

## Why

Levi, 2026-10-27, on `cursive_v51_words.svg`: "The bulbous crotches look
fixed. It does seem like letters are, in general, a bit jittery and
unsmooth. Are these defined with bezier curves? I guess there are a lot of
control points in these curves? If needed, I guess I can clean these later
to have fewer control points".

Levi should not have to. The coordinator measured v5.1 (script and combs in
`.claude/probes/K863/trace/work11/`: `coordinator_jitter.py`,
`coordinator_comb_m.png`, `coordinator_comb_minimum.png`):

- Every stroke is a dense chain of short cubic segments, about 5 u long,
  with the handles at the chord's thirds. The template has 33 to 176 per
  letter (median 108, so about 325 points to drag), and the words sheet
  about 53 per stroke. The nodes come from sampling, not from the
  letter's shape, so nobody can usefully edit them.
- The curvature is ragged. On minimum's m, the comb's envelope is
  saw-toothed along the arches. Along the stems it flips side several
  times, where the font's stroke is straight or one gentle S. At normal
  zoom that reads as the jitter Levi sees. The script's band measure
  (curvature smoothed over 3 u minus over 15 u, divided by the curvature
  level) has a median of 0.45 and a p90 of 1.11 over the words sheet. p's
  long stem is the worst at 5.4.

Nobody knows yet where the noise enters. It could be the centreline
trace, the fit (16 of 26 letters stop at nfev 600, K927), fair, the
generator or the writer.

## Goal

Every stroke is a cubic Bezier spline with few nodes. That covers the
template and the words sheet: bodies, connectors, lead-ins and tails.

- **Nodes go where a type designer would put them.** Those places are:
  - cusps;
  - the ends of fused and retraced stretches;
  - the joins;
  - curvature extremes along a bowl or arch;
  - inflections;
  - the extremes of the slanted letter.

  That comes to roughly 4 to 12 per stroke.
- **Smoothness.** Curvature is continuous through every node except a
  deliberate cusp (G2), and the comb's envelope is smooth.
- **Editable.** Levi edits these curves in Inkscape, so dragging a node
  or handle should move the curve the way a designer expects.

The spline is the letter itself. The generator, the checks and the
mapping onto threads later all sample from it; none of them should depend
on a dense copy written to disk.

## Order

1. **Find where the noise enters.** Measure the same roughness at each
   step on m, a, e, p and w. The steps are:
   - the traced centreline;
   - the fit;
   - fair;
   - the generator's output;
   - the written SVG.

   As a reference, the font's outline is a few designed quadratics per
   side, so a centreline taken from those curves should be about as
   smooth as they are. Put the numbers in `NOTES.md` `## v5.3`.
2. **Fix it at the source.**
   - If the centreline comes off a raster or a dense sampling, take it
     from the font's vector outline.
   - If the fit has more freedom than the shape needs, cut it (that may
     settle K927).
   - A final smoothing pass is the last resort, only for noise that
     cannot be removed upstream.
3. **The few-node writer.** Fit each stroke as a cubic spline with G2
   joins. Choose the node count per stroke: start from the designer's
   places above, and add a node only where the curve leaves the
   tolerance. Minimize curvature variation (the integral of (dk/ds)^2)
   within a tolerance of the faired curve. Start at 1 u and report the
   largest deviation. Keep these exact:
   - cusps and retraces;
   - the fused junctions (60 u; o at 86 u as v5.2 builds it);
   - the overstroke splits, where each pass still leaves the shared curve
     tangentially, with continuous curvature (`K863_trace.md`, "Smooth,
     continuous strokes").
4. **`--from-svg`.** It reads Levi's edited file, so it must take any
   Inkscape path (few or many nodes, lines, arcs) and give the same
   quality. It must also keep his edits. K925 measured that today's
   smoothing keeps only 23% of a 3 u node drag (a setting of 15 keeps
   38%; 8 keeps 70% but fails its check). So:
   - hold every node and handle Levi moved exactly where he put it, and
     fit only the rest around it;
   - find his edits by comparing his file with the one the pipeline
     wrote. He may also add or delete nodes;
   - his edit wins over smoothness. If what he moved makes a corner, keep
     the corner and report it.

   Test it on a copy: drag a few nodes and handles by 1 to 5 u, and show
   that each stays where it was put and the curve around it stays G2.
5. **Checks.**
   - Rerun the existing ones: fidelity to the font, `split_check`, and
     the eye check K925 rescaled. Explain any result that changes.
   - Add a roughness check per stroke (the comb's roughness and the node
     count). It must fail v5.1 and pass v5.3.
   - Show combs before and after, at 288 DPI, for m, a, e, p and w and
     for the words "minimum" and "hippo".
6. **Build v5.3** the way v5.2 was built (`--split fair`, o's junction
   at 86 u, the rest at 60 u: `work10/dbg/run_v52_o86.ps1`).
   - `out11/cursive_v53.svg` (the template);
   - `cursive_v53_words.svg`;
   - the review PNG;
   - `out11/combs_v53.svg`.

Not this stage:
- the e joins and the word-final e (K926 and K929, next);
- `--split fair` as the default (K928, Levi's call);
- capitals (K931).

## Rules

- **Tools and outputs.**
  - New tools are `tools/*_k930.py`, copied from `*_k925.py`.
  - Outputs go in `work11/` and `out11/`, and the record goes in
    `NOTES.md` `## v5.3` with its rerun commands.
  - Leave v5.2's tools and outputs untouched.
- **Software.**
  - Python: `.claude/probes/K863/trace/venv/Scripts/python.exe -I`.
  - Inkscape: `C:\Program Files\Inkscape\bin\inkscape.com`.
  - Read code through the shell (`Select-String`, then `Get-Content |
    Select-Object -Skip -First`).
- **Levi's chart.** `ref/chart.jpg` is never committed, uploaded or
  embedded in an SVG, and the review PNG contains it. Upload nothing: the
  coordinator uploads the SVGs.
- **Tracked files.** Everything lives in the untracked probe directory,
  so there is nothing to commit. `LEDGER.md` is the coordinator's. Don't
  touch other tracked files.
- **Crop and look** at your own renders before you call a visual fix
  done.
- **Stop rule.**
  - Stop when the stage is done or 2 h after your start, whichever comes
    first. Run `Get-Date` at the start and at each milestone.
  - A compaction is not a stop. After one, re-read this brief and
    `NOTES.md` `## v5.3`.
  - On stopping, append a `## Handoff` to this brief (the coordinator
    commits it), then report, ending with a `Ledger items` list.

## Handoff

Stage agent a51dfafcc0709f787 of claude session
bf876705-c9fa-4b1f-83ea-e173dac6cff3, stopped 2026-10-27 at 18:35
(cap 19:02). The record and every rerun command are in the probe's
`NOTES.md` `## v5.3`. Nothing was committed: the probe directory is
untracked.

Done:
- **Step 1.** Roughness at every step (`work11/rough/stages.txt`). The
  noise enters with the raster trace, and the fair halves it. v5.2
  already measures smoother than the font's own outline edges. The rest
  of the problem was the node count: 29-176 cubics on a main stroke.
- **Step 3.** `tools/fewnode_k930.py`.
  - Bodies have 2-26 nodes (median 13). They are G2 everywhere except
    the cusps, to 2e-11 1/fu, and at most 0.94 u from v5.2.
  - The cusps, the fused and retraced ends and the stored frames are
    held exactly.
  - Connectors are 3-7 G2 cubics within 0.05 u of gen_k925's quintics.
- **Step 5.**
  - Combs in `out11/combs_v53.svg`, rendered at 288 DPI; the crops were
    viewed.
  - The roughness check `rough_k930.py check`: v5.1 and v5.2 fail
    (exit 1), v5.3 passes.
  - The eye check, the fidelity check and `split_check` were rerun, and
    the changes are explained in NOTES.
- **Step 6.** v5.3 is built (`work11/dbg/run_v53.ps1`):
  - `out11/cursive_v53.svg`, `cursive_v53_words.svg` and
    `combs_v53.svg` embed no image;
  - `cursive_v53_review.png` stays local, because it holds the chart.
- **Step 4, a prototype.** `tools/hold_k930.py <tools> <written svg>
  <edited svg> <out svg> <report>` refits a window around each node
  Levi moved: up to 3 unmoved nodes each side, stopping at stroke ends
  and corners.
  - His nodes and handles are fixed. The unmoved nodes' tangents and
    handle lengths are solved for G2 at every node of the window, by
    least squares toward his drawn curve plus the integral of
    (dk/ds)^2.
  - A handle he turns off the tangent is a corner he made: kept and
    reported.
  - `work11/dbg/run_hold_v53.ps1` runs nine scripted edits (drags of
    1-5 u in a, n, o and p, a 4 deg handle turn, a lengthened handle, a
    corner), then the words sheet and the combs; reports in
    `work11/hold/report_*.txt`.

  Results:
  - In all nine his node and handles stay exactly where he put them.
    The curvature jump at his node (up to 0.019 1/fu as drawn) falls
    below 1e-14.
  - The window's peak |dk/ds| on the eye scale (flag 3) falls from
    2.1-9.9 as drawn to 0.5-2.9.
  - The window moves 0.19-0.99 u off his drawn curve on the drags, and
    2.1 u on the handle turn.
  - Read by `words_k930 --from-svg --split blend`
    (`work11/fromsvg/measure.txt`, the hold rows): 18 cubics, the drag
    kept 100%, no curvature jump, eye 0.8-1.0 (as drawn 2.5-9.5).
  - The comb crops (`work11/hold/crops/`) lose the spike at his node,
    and the rest of the stroke is unchanged.

Open:
1. **Step 4: wire the hold in.** Still to do:
   - a `--split hold` in words_k930, in place of the pre-pass;
   - added and deleted nodes (a path whose node count changed is
     skipped);
   - windows that stop at the hard nodes (fused and retraced ends,
     frames), which the SVG does not mark: store them in
     `template_map.json`;
   - a node inserted where a handle would go non-positive;
   - closeness by nearest point, not by matching parameters;
   - a real Inkscape save (only scripted edits so far);
   - the deviation on handle turns (2.1 u at 4 deg).

   It passes when:
   - his nodes and handles are within 1e-6 u;
   - every node except a corner has dk at most 1e-9 1/fu;
   - the eye check passes on the edited strokes;
   - the other strokes are unchanged.
2. **The template's 3 decimals.** A stroke read back from the template
   jumps in curvature at smooth nodes with short handles, up to 7.9e-3
   1/fu (w node 3, handle 0.42 u). This is verified: rounding the G2
   bodies to 3 decimals reproduces it (`work11/hold/round_check.txt`).
   Write 6 decimals or more; until then the 1e-9 line above cannot
   hold on a whole path.
3. **Step 2 at the source.** A centreline traced from the font's vector
   outline was not tried. The fair still stops at nfev 600 (K927).
4. **Nodes over 12** in 17 of 30 strokes: m 26, k 25, q 25, p 23, n 21,
   g 20, h 20, a 19 and others. Hard nodes alone are 2-8 a stroke; the
   rest are designer places and nodes added for the 1 u tolerance.
5. **The comb is not smooth everywhere.**
   - The stems' S-wiggles in m, a and p stay. They are in v5.2's
     centreline and larger than the 0.6 u offset budget.
   - The facet measure rises on 21 of 30 strokes, from G2's slope steps
     at the nodes.
   - Eye flags: b@3076 17.9 and v@1879 12.9 are worse and not
     diagnosed; t's cusp is 5.6; a@2317 is new at 3.16.
6. **Connector hooks.** gen_k925's quintics turn hard in their last
   1-2 u:
   - into a, c, d, e, g, o, q and r, and at the lead-ins and tails;
     this predates v5.3;
   - v5.3 copies them within 0.05 u, sharper in places (hippo's lead-in
     reaches 6408 1/u);
   - n->a and n->q keep one G1 joint inside (dk 0.0089 1/fu).

   The fix belongs in the generator, not the writer.
7. **Small items.**
   - o's last cubic has a 0.21 u handle.
   - f's after_o and after_b share a node (after_b moved 0.118 u).
   - `bodies.json` passes through 4.5 MB of v5.2's font reference data.
   - The rough check's ceilings sit just above v5.3's worst stroke: a
     regression guard, not a smoothness standard.
   - The pp and mp connectors now cross p's body at 20 deg, where the
     font crosses too.
   - `--split fair` re-densifies an edited stroke (18 cubics to 105).
