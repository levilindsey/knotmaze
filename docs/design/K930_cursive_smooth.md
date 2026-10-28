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
   quality.
5. **Checks.**
   - Rerun the existing ones: fidelity to the font, `split_check`, and
     the eye check K925 rescaled. Explain any result that changes.
   - Add a roughness check per stroke (the comb's roughness and the node
     count). It must fail v5.1 and pass v5.3.
   - Show combs before and after, at 288 DPI, for m, a, e, p and w and
     for the words "minimum" and "hippo".
6. **Build v5.3.**
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
