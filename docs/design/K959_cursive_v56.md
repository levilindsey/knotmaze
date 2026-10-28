# K959: Cursive v5.6, the template ready for Levi's review (agent brief)

Stage brief (coordinator, 2026-10-27). Parent: K863
(`docs/design/K863_trace.md`; its `## Levi's calls` bind every stage).
Previous stage: v5.5 (`docs/design/K945_cursive_v55.md`). Read its
`## Handoff`, and `NOTES.md` `## v5.5` in `.claude/probes/K863/trace/`,
before anything else.

## Why

Levi's order (K928, 2026-10-27): the curves get smoother, Levi reviews,
the pipeline learns to read Levi's edits as drawn (K944), then Levi
hand-edits the template. After the hand edits the pipeline never changes
a body again, so each body stroke has to be as smooth and as easy to edit
as the pipeline can make it before the review. Levi: "I want them to even
be smoother than you currently have them."

v5.5 put the centreline on the font's axis and the a/g/q stem tops at the
font's V. It left these (ledger K959-K963):
- **K959, the exit ends.** o's last 15 u lean 3.1 u inside the stroke and
  end in a short hook. The fair causes it; its evaluation cap does not
  (tested). Inferred: the fair holds the end to the stored exit frame.
  e's last 5 u turn 8.2 deg, against 1.0 in v5.4; cause untested.
- **K960, eye flags over 3.** The exit-brace curls b@3076 26.5, v@1879
  17.7 and w@3111 11.5 (they grew from v5.4); p's entry p@621 5.0 (new);
  p's bowl join p@3562 5.0; t's cusp 4.3.
- **K961, nodes.** 17 of 30 strokes have more than 12 (k 27, m 25, p 22,
  q 20, a 19, f 18, h 18). The hard nodes at the frames, cusps and
  corners cut a stroke into 3-8 pieces.
- **K963, small ones.** f's hairpin sits 1.30 u off the axis with three
  nodes clustered at its top; a's fair stops at its evaluation cap.
- **Peaks.** Peak |dk/ds| rose in a, u, m, k, l, d and f, mostly at the
  exit curls and k's start. Inferred: the new centreline builds curvature
  into each curl over a shorter stretch.

## Goal

v5.6: every body stroke is smooth along its whole length, ends included,
and easy to edit. No eye flag over 3 except the intended corners and
cusps; peak |dk/ds| no higher than v5.4's on any stroke; at most 12 nodes
a stroke wherever the shape allows; within 1 u of the font's axis. Where
smoothness and fidelity to the font pull apart, smoothness wins inside
the 1 u budget.

## Order

1. **The exit ends (K959).** Find what bends o's and e's ends and fix it
   at its source. The frames were measured on the raster trace: check
   that they still match the new centreline, and re-derive them from it
   if not. Each end stays G2 with the join that leaves it.
2. **The eye flags and the peaks (K960).** For each flag over 3 and each
   stroke whose peak is above v5.4's: the cause, then a fix at the
   source, or a measurement showing it is the font's own shape and why
   the 1 u budget cannot smooth it.
3. **Few nodes (K961).** Test whether the frames have to be hard nodes
   (the joins could attach at a parameter along a cubic instead). At most
   12 nodes a stroke wherever the shape allows; G2 except at cusps and
   the a/g/q corners; within 1 u of the centreline (report the largest
   deviation). Where a stroke needs more, say why. Fix f's hairpin and
   a's evaluation cap on the way (K963).
4. **Build v5.6** as v5.5 was built (`work13/dbg/run_v55.ps1`): refit the
   joins, then rerun evar, fitp and tails, in that order. The titles say
   v5.6. Outputs:
   - `out14/cursive_v56.svg` (the template);
   - `cursive_v56_words.svg` (+ `.png`);
   - `combs_v56.svg`;
   - `cursive_v56_nodes.svg`: each letter's body at 3x the template's
     size, its nodes as dots, its node count beside it, no chart (what
     Levi will look at before editing);
   - the review PNG, which stays local.
5. **Checks.**
   - Rerun fidelity to the font, `split_check`, the eye check and the
     roughness check (the ceilings stay at v5.5's or tighten). Explain
     every result that changes, and every fidelity change over 0.25 u.
   - Combs at 288 DPI, v5.5 beside v5.6, for every stroke that changed
     and the words "minimum" and "hippo". Crop and look at each.
   - The stem tops stay at the V (`work13/vtops/`).

Not this stage: K944 (reading Levi's edits as drawn), K962 (the join seams
and the join regressions), K946, K948, K949, K937, K950's side-by-side and
capitals (K931). They come in the next stage, which runs while Levi
reviews.

## Rules

- **Tools and outputs.**
  - New tools are `tools/*_k959.py`, copied from the latest versions.
  - Outputs go in `work14/` and `out14/`, and the record goes in
    `NOTES.md` `## v5.6` with its rerun commands.
  - Leave earlier versions' tools and outputs untouched.
- **K930's writer.** Every new curve goes through it: few nodes, G2.
- **Software.**
  - Python: `.claude/probes/K863/trace/venv/Scripts/python.exe -I`.
  - Inkscape: `C:\Program Files\Inkscape\bin\inkscape.com`.
  - Read code through the shell (`Select-String`, then `Get-Content |
    Select-Object -Skip -First`).
  - Downloads: none should be needed. If one is, put it in a new, empty
    directory and run Python on it with `-I`.
- **Levi's chart.** `ref/chart.jpg` is never committed, uploaded or
  embedded in an SVG, and the review PNG contains it. Upload nothing: the
  coordinator uploads the SVGs.
- **Tracked files.** Everything lives in the untracked probe directory, so
  there is nothing to commit. The `## Handoff` you append to this brief is
  the coordinator's to commit. `LEDGER.md` is the coordinator's. Don't
  touch other tracked files.
- **Not allowed.** No phone, no timing, no `npm run build` in the main
  checkout, no processes you did not start, and never Levi's Chrome
  profile.
- **Crop and look** at your own renders before you call a visual fix done.
- **Helpers.** Only if needed: `model: sonnet`, a 1 h cap and these rules.
- **Stop rule.**
  - Stop when steps 1-5 are done or 2 h after your start, whichever comes
    first. Run `Get-Date` at the start and at each milestone.
  - At 1 h 30 min, if step 4 has not started, build v5.6 from what you
    have and say what is missing.
  - A compaction is not a stop. After one, re-read this brief and
    `NOTES.md` `## v5.6`.
  - On stopping, append a `## Handoff` to this brief, then report.
- **The final report** gives:
  - per stroke, v5.5 against v5.6: node count, roughness and peak
    |dk/ds| (and v5.4's peak);
  - K959-K961 and K963, each: the cause, the fix or why not, and a crop;
  - the eye flags and the fidelity changes, each explained;
  - the paths of the outputs and of the crops you looked at;
  - a `Ledger items` list (follow-ups and residuals; a question for Levi
    only about what shows on screen, in plain words);
  - K863's current handle fields.

## Handoff

Stage agent, 2026-10-27 22:39 to 2026-10-28 00:03. Steps 1-5 done; v5.6 built. Record and rerun commands:
`.claude/probes/K863/trace/NOTES.md` `## v5.6`; work in `work14/`, outputs in `out14/`; new tools
`tools/bodies_k959.py`, `fair_k959.py`, `fewnode_k959.py`, `nodes_k959.py` (the first two generated by
`work14/dbg/mk_*_k959.py`), selection `work14/dbg/select_k959.py`.

**What v5.6 is.** Each body is faired on the body extended 40 fu past each smooth cut, with a band pulling it
to within about 0.9 u of the font's medial axis over the whole stroke (`--end-ext 40 --end-budget all`, band
0.80-0.98 u chosen per letter, `work14/fewnode/selection.txt`), then written with few nodes (soft frames, no
designer places, 1 u from the fair). The joins were refitted on the new end frames and stay G2.

**Per stroke, v5.5 -> v5.6** (nodes; peak |dk/ds|, v5.4's peak in brackets; roughness changes):
a 19->15, 7.26->1.63 [3.93] · b 16->11, 7.72->2.01 [11.49] · c 7->3, 0.29->0.25 [0.24] · d 17->14, 6.85->1.39
[5.88] · e 6->4, 1.01->0.57 [0.62] · f 18->14, 5.19->9.90 [4.29], band 0.41->0.49 · g 15->11, 2.70->0.73 [2.63] ·
h 18->20, 4.18->1.54 [6.30] · i 5->4, 2.88->4.83 [5.53] · i2 5->5 · j 7->7, 3.44->1.82 [5.60] · j2 5->5 ·
k 27->19, 5.89->6.58 [4.10], wobble 0.0123->0.0159 · l 9->7, 4.94->1.11 [3.52] · m 25->28, 6.14->1.92 [4.74] ·
n 17->17, 4.62->1.68 [4.78] · o 13->8, 4.95->6.90 [8.54], wobble 0.0132->0.0158 · p 22->19, 2.46->2.11 [2.54] ·
q 20->14, 4.36->7.04 [4.39], band 0.71->0.84 and wobble 0.0141->0.0168 (FAIL) · r 11->8, 2.78->8.88 [3.40],
wobble 0.0157->0.0203 (FAIL) · s 14->8, 1.30->1.69 [1.64], band 0.50->0.71 · t 6->7, 4.20->1.45 [5.30] ·
t2 3->2 · u 17->14, 5.06->1.56 [2.04] · v 14->11, 5.14->5.16 [9.12] · w 17->17, 5.72->3.41 [5.89] · x 5->4,
1.94->1.81 [2.20] · x2 2->2 · y 15->17, 1.41->1.53 [0.94], band 0.25->0.39 · z 11->7, 2.00->0.88 [4.91].
Full table `work14/rough/check_v56.txt`.

**K959, exit ends: fixed.** The fair held each smooth end at its cut with the trace's frame there: e's sat just
after a junction wiggle (k +14.1 /kfu), o's on the tail of the 95 deg turn where the exit leaves the bowl
(k -23.6 /kfu), and the pull, stiffened near a held end, bent o's last 15 u 3.1 u inside into a hook. Fix: fair
the end as an interior point (extended past the cut), re-take the end frames from the faired centreline, refit
the joins (G2: gap 6.4e-12 fu, 1.5e-6 deg). e: end k +4.9 /kfu, peak 0.57. o: no hook, 0.75 u from the axis; a
tight exit turn is left (peak 6.90 under v5.4's 8.54; a softer turn sits 1.5-2.3 u off the axis). Crops
`work14/dbg/ends/o_*__exit.png`, `work14/combs/crops/rows_15_o.png`, `rows_5_e.png`.

**K960, eye flags and peaks: partly.** Over 3 in v5.5 -> v5.6: b's curl 26.5 -> gone (3.7 at its cusp), v's 17.7
-> gone (6.7 at its cusp), w's 11.5 -> 4.1 (3.4/4.1 at its cusp), p@619 5.0 -> 3.1, p@3562 and t's cusp gone.
New: r@669 9.9 (+ r's cusp 5.0), w@618 8.6, k@2136 4.2/3.4. r@669 and w@618 come with the band: every
whole-stroke fair has them, the ends-only fair does not but sits 2-4 u off the axis there. Inferred: at these
crotches the medial axis bends toward the ink junction, and the band pulls the curve onto that bend. k@2136
comes from the few-node fit. Peaks above v5.4's: f (its end tie), k (its leg), q (its exit hook), r (its start
hook), y; the smoothest band fair inside 1 u still peaks f 15.0, k 8.3, q 8.1, r 11.4, y 6.1, so not fixed
this stage. Crops `rows_18_r.png`, `rows_23_w.png`, `rows_11_k.png`, `rows_17_q.png`, `rows_2_b.png`,
`rows_22_v.png`, `rows_16_p.png`, `rows_20_t.png`.

**K961, nodes: partly.** Frames as soft nodes work (the joins attach along a cubic, G2). Strokes over 12 nodes:
17 -> 12 (a 15, d 14, f 14, h 20, k 19, m 28, n 17, p 19, q 14, u 14, w 17, y 17); median 10. These turn
tightly 4-8 times and need about 2-3 nodes a turn at 1 u (inferred); h, m and y gained nodes because their fairs
now follow the axis's tighter turns. Largest distance from the font's axis 0.48-1.76 u (p), so the 1 u target
is not met: the fair is about 0.9 u off and the writer adds up to 1 u (v5.5 was up to 4.10 u off). Crop
`work14/build/dbg/nodes.png` (= `out14/cursive_v56_nodes.svg`).

**K963.** a's evaluation cap: a still stops at 600 evaluations, but 4000 moves it 0.017 u at most, so the cap
does not matter. f's hairpin (its end tie at the waist): 4.09 -> 1.48 u from the axis, still three nodes in its
last 23 u, and its turn is tighter (peak 5.19 -> 9.90). Not fixed. Crop `rows_6_f.png`.

**Checks.** Roughness: q and r fail the v5.5 ceilings (every candidate does). Fidelity over the 88 join rows:
mean 1.865 -> 1.667 u; 11 rows better by over 0.25 u (et 19.71 -> 4.40, from e's exit; br, ev, ju, mu, wn, og,
si, ui, be, hi), 14 worse (fo 2.48 -> 3.10, ck 0.57 -> 1.08, pp, qu, mp, es, ip, up, mi, an, bo, by), cause
untested (inferred: the re-taken end frames moved the joins' ends). Stem tops still at the V. Words: "minimum"
169 -> 169 nodes, "hippo" 129 -> 105. Crops: `work14/combs/crops/rows_*.png`, `sheet_1..6.png`.

**Outputs.** `out14/cursive_v56.svg` (+ `.png`), `cursive_v56_nodes.svg`, `cursive_v56_words.svg` (+ `.png`),
`combs_v56.svg`, `split_combs.svg`, `split_check.txt`; `cursive_v56_review.png` holds the chart and stays local.

**Open.** q and r over the roughness ceilings; r's comb spike where its start hook meets the shoulder; peaks over
v5.4's at f, k, q, r, y and the new flags at r@669, w@618, k@2136 (follow-up: a band reference that knows the ink
junctions, e.g. drop the medial branch near each junction); strokes 1.3-1.8 u off the axis; 12 strokes over 12
nodes; the 14 worse join rows (K962 territory); o's tight exit turn (a question for Levi, on screen).