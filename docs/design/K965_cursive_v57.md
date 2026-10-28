# K965: Cursive v5.7, smoother bodies before Levi's review (agent brief)

Stage brief (coordinator, 2026-10-28). Parent: K863
(`docs/design/K863_trace.md`; its `## Levi's calls` bind every stage).
Previous stage: v5.6 (`docs/design/K959_cursive_v56.md`). Read its
`## Handoff`, and `NOTES.md` `## v5.6` in `.claude/probes/K863/trace/`,
before anything else.

## Why

Levi's order (K928, 2026-10-27): the curves get smoother, Levi reviews,
the pipeline learns to read Levi's edits as drawn (K944), then Levi
hand-edits the template. After the hand edits the pipeline never changes
a body again. Levi: "I want them to even be smoother than you currently
have them."

v5.6 fixed the exit ends (K959) and lowered the peaks on 18 of 30
strokes. It left (ledger K960, K961, K963, K965):
- **K965, peaks and ceilings.** Peak |dk/ds| above v5.4's at f 9.90 (its
  end tie), k 6.58 (its leg), q 7.04 (its exit hook), r 8.88 (its start
  hook) and y 1.53; i rose from 2.88 to 4.83 (not located); o's exit turn
  is tight (6.90). q and r fail the roughness ceilings (q band 0.84,
  wobble 0.0168; r wobble 0.0203), and r's comb spikes where its start
  hook meets the shoulder (`work14/combs/crops/rows_18_r.png`).
- **K960, eye flags.** New: r@669 9.9, w@618 8.6 and k@2136 4.2. r@669
  and w@618 come with the band. Inferred: at these crotches the medial
  axis bends toward the ink junction, and the band pulls the curve onto
  that bend. k@2136 comes from the few-node fit.
- **K961, nodes.** 12 strokes have more than 12 (m 28, h 20, k 19, p 19,
  n 17, w 17, y 17, a 15, d 14, f 14, q 14, u 14).
- **K963.** f's hairpin sits 1.48 u off the axis, with three nodes in
  its last 23 u and a tighter turn than v5.5's.

The 1 u budget is what holds most of these: the smoothest band fair
inside it still peaks f 15.0, k 8.3, q 8.1, r 11.4 and y 6.1, and o's
softer exit turn sits 1.5-2.3 u off the axis.

**Coordinator's call (technical, from Levi's "smoother"):** the budget
widens to 2.5 u from the font's axis. That is inside the 3 u half-width
of the drawn line, so the line still covers the font's own centreline.
Inside the budget, smoothness wins over closeness to the font. o's exit
turn softens under it. Added at 00:45, during the stage: inside the K960
junction stretches only, the limit is 3.0 u from the bent medial axis
(the drawn line's half-width); 2.5 u stays hard everywhere else, and each
stroke is reported with its largest distance inside and outside the
stretches.

## Goal

v5.7: every body stroke is smooth along its whole length.
- Peak |dk/ds| at or below v5.4's on every stroke, and no stroke above
  its v5.6 peak unless a fix elsewhere costs it (explain each).
- q and r under the roughness ceilings, which stay at v5.6's or tighten.
- No eye flag over 3 except the intended corners and cusps.
- At most 12 nodes a stroke wherever the shape allows.
- Within 2.5 u of the font's axis, the writer's error included. Report
  each stroke's largest distance.
- Kept from earlier stages: the e and o ends (K959), the a/g/q stem tops
  at the font's V (K939), the joins G2 with the bodies.

## Order

1. **A reference that knows the ink junctions (K960).** Where the medial
   axis of the merged ink bends toward a branch point (crotches,
   bowl-to-stem joins, crossings), the band should not pull. Find those
   stretches from the axis itself (the branch's extent), then drop the
   band there and let the fair bridge them, or continue the pen path
   into them from both sides. Choose by the checks. Check: r@669 and
   w@618 are gone, and the bowl bottoms and stem feet are no rougher.
2. **The 2.5 u budget (K965).** Rerun the per-letter band choice under
   it. For each stroke above its v5.4 peak (f, k, q, r, y), i, o's exit
   and any new flag: the cause, then a fix at the source, or a
   measurement showing the font's own shape needs that turn even at
   2.5 u. Fix f's hairpin on the way (K963): a softer tie with its nodes
   spread.
3. **Few nodes (K961).** At most 12 a stroke wherever the shape allows,
   with the writer's tolerance chosen so that the total distance from
   the font's axis stays within 2.5 u. G2 except at cusps and the a/g/q
   corners. Where a stroke needs more than 12, say why. Remove k@2136's
   flag.
4. **Build v5.7** as v5.6 was built (`work14/dbg/run_v56.ps1`): refit the
   joins on the new end frames, then rerun evar, fitp and tails, in that
   order. The titles say v5.7. Outputs:
   - `out15/cursive_v57.svg` (the template);
   - `cursive_v57_words.svg` (+ `.png`);
   - `combs_v57.svg`;
   - `cursive_v57_nodes.svg`, as v5.6's (each body at 3x the template's
     size, its nodes as dots, its node count beside it, no chart);
   - the review PNG, which stays local.
5. **Checks.**
   - Rerun fidelity to the font, `split_check`, the eye check and the
     roughness check. Explain every result that changes, and every
     fidelity change over 0.25 u.
   - Combs at 288 DPI, v5.6 beside v5.7, for every stroke that changed
     and the words "minimum" and "hippo". Crop and look at each.
   - Crop and look at every changed letter at the nodes sheet's scale:
     it still reads as the font's letter. Name any that reads
     differently.
   - The stem tops stay at the V (`work13/vtops/`).

Not this stage: K944 (reading Levi's edits as drawn), K962 (the join seams
and the join regressions), K946, K948, K949, K937, K950's side-by-side and
capitals (K931). They come in the next stage, which runs while Levi
reviews.

## Rules

- **Tools and outputs.**
  - New tools are `tools/*_k965.py`, copied from the latest versions.
  - Outputs go in `work15/` and `out15/`, and the record goes in
    `NOTES.md` `## v5.7` with its rerun commands.
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
  - At 1 h 30 min, if step 4 has not started, build v5.7 from what you
    have and say what is missing.
  - A compaction is not a stop. After one, re-read this brief and
    `NOTES.md` `## v5.7`.
  - On stopping, append a `## Handoff` to this brief, then report.
- **The final report** gives:
  - per stroke, v5.6 against v5.7: node count, roughness, peak |dk/ds|
    (and v5.4's peak) and the largest distance from the font's axis;
  - K960, K961, K963 and K965, each: the cause, the fix or why not, and a
    crop;
  - the eye flags and the fidelity changes, each explained;
  - the paths of the outputs and of the crops you looked at;
  - a `Ledger items` list (follow-ups and residuals; a question for Levi
    only about what shows on screen, in plain words);
  - K863's current handle fields.

## Handoff

Stage agent, 2026-10-28 00:10 to 01:37. Steps 1-5 done; v5.7 built. Record and rerun commands:
`.claude/probes/K863/trace/NOTES.md` `## v5.7` and its `### v5.7 rerun commands`; work in `work15/`, outputs in
`out15/`; new tools `tools/bodies_k965.py`, `fair_k965.py` (generated by `work15/dbg/mk_bodies_k965.py`,
`mk_fair_k965.py`), `fewnode_k965.py` (K959's, byte for byte), `combs_`, `ejoins_`, `nodes_`, `review_`,
`template_`, `words_k965.py` (`mk_tools_k965.py`); selection `work15/dbg/select_k965.py`, table `table_k965.py`,
distances `dev2_k965.py`, build `build_v57.ps1`.

**What v5.7 is.** K959's fair (each body extended past its smooth cuts, a band pulling it toward the font's medial
axis) with a looser band, hinge 1.3 or 1.7 u (v5.6: 0.80-0.98), and the K960 junction stretches: within 1.5 ball
radii of each skeleton branch point the pull drops to 0.1 of itself (tapered over 8 fu) under a 1.9-2.0 u hinge.
Bending length 30, 45 or 60 per letter; five letters (k, o, t, v, w) took the fair without stretches. Bodies are
written with few nodes at 0.6-1.6 u from the fair (soft frames, no places). Per letter, `select_k965.py` keeps the
candidates within 2.5 u of the font's axis outside the stretches and 3.0 u inside, under the roughness ceilings,
with no eye flag over 3; then, among those under min(v5.6, v5.4 peak), the fewest strokes over 12 nodes; then
peaks within 10% of the lowest; then the fewest nodes (`work15/fewnode/selection.txt`). Joins refitted
(join_k925), G2: gap 4.0e-12 fu, 1.2e-6 deg, curvature jump 2.5e-11 /fu.

**Per stroke, v5.6 -> v5.7** (nodes; peak |dk/ds|, v5.4's in brackets):
a 15->12, 1.63->1.26 [3.93] · b 11->12, 2.01->1.91 [11.49] · c 3->3, 0.25->0.13 [0.24] · d 14->11, 1.39->1.07
[5.88] · e 4->4, 0.57->0.46 [0.62] · f 14->14, 9.90->5.21 [4.29] · g 11->10, 0.73->0.46 [2.63] · h 20->16,
1.54->1.37 [6.30] · i 4->5, 4.83->0.92 [5.53] · i2 5->5 · j 7->8, 1.82->0.65 [5.60] · j2 5->5 · k 19->18,
6.58->2.24 [4.10] · l 7->9, 1.11->0.75 [3.52] · m 28->21, 1.92->1.07 [4.74] · n 17->13, 1.68->1.37 [4.78] ·
o 8->6, 6.90->5.08 [8.54] · p 19->14, 2.11->1.40 [2.54] · q 14->12, 7.04->3.14 [4.39] · r 8->7, 8.88->2.88 [3.40]
· s 8->7, 1.69->1.11 [1.64] · t 7->6, 1.45->1.23 [5.30] · t2 2->2, 0.37->0.26 [0.71] · u 14->12, 1.56->0.84
[2.04] · v 11->11, 5.16->1.86 [9.12] · w 17->16, 3.41->2.10 [5.89] · x 4->2, 1.81->1.53 [2.20] · x2 2->2,
0.13->0.16 [0.23] · y 17->15, 1.53->0.45 [0.94] · z 7->8, 0.88->0.46 [4.91].
Roughness: q band 0.84->0.60 and wobble 0.0168->0.0121, r wobble 0.0203->0.0155 (both pass now: 0 of 30 strokes
over a ceiling), k wobble 0.0159->0.0104, o 0.0158->0.0127, f band 0.49->0.41, s 0.71->0.47, y 0.39->0.14.
Largest distance from the font's axis, outside / inside the stretches: v5.6 at most 1.63 / 1.76 u, v5.7 at most
2.49 / 2.77 u (both q); every stroke within 2.5 / 3.0. Full table `work15/fewnode/table.txt`. One-cubic strokes
(x, x2, t2) from `work15/dbg/peak1_all.txt`: rough_k945 reads a one-cubic stroke as 0 (`pieces()` flushes only
when `len(P) > 1`), in every check so far.

**K960, eye flags: fixed.** v5.6's six flags over 3 are gone and none is new (`out15/split_check.txt`; K916's own
scale 9 -> 4, extra sign changes 24 -> 16, cusp sides over 3 5 -> 0): r@669 9.9->2.88 and r's cusp 5.0->2.88 (one
feature, where the start hook meets the shoulder), w@618 8.6->1.73, w@3113 4.1->2.13, k@2136 4.2/3.4 ->
0.42/0.54, p@619 3.1->2.16, b's cusp 3.7->1.91, v's cusp 6.7->1.86. Cause, now tested: the 0.9 u band pulled the
curve onto the medial axis where it bends toward the ink junction. The looser band alone clears w@618 and k@2136
(every fair without stretches is flag-free on w and k); r needs the stretches: without them every r keeps a flag
of 3.1-4.2 there, with them (d190_t12) none, and v5.6's comb spike at r's hook is gone. Crops
`work15/combs/crops/rows_18_r.png`, `zoom_r_jx.png`, `rows_23_w.png`, `zoom_w_full.png`, `rows_11_k.png`.

**K961, nodes: partly.** Strokes over 12 nodes 12 -> 8 (m 21, k 18, h 16, w 16, y 15, f 14, p 14, n 13; a, d, q,
u now 12 or fewer); median 10. Why not fewer: k (18) and p (14) are at the fewest any candidate has; fewer-node
h (12-13: peak 1.74-7.12, its cap 1.54), n (11: 2.23 or more, cap 1.68) and f (12: 5.98-6.29) peak above their
caps or f's 5.21; m (19 at 1.31), y (13 at 0.92) and w (15 at 2.35) fall outside the 10% window of their lowest
peak (1.07, 0.45, 2.09). Crops `work15/nodes_crops/n1_abdfgh.png` .. `n4_uvwxy.png`,
`work15/combs/crops/m5_mnstuz.png`.

**K963, f's hairpin: partly.** Peak 9.90 -> 5.21, still above v5.4's 4.29; f's last cubic (c12, the hook) max
|k| 62.9 -> 50.8 /kfu; the hook's apex 15 u before the end (792 of 807 u) still has three nodes around it (781/793/807
u; v5.6 777/788/800), closest pair 11.7 -> 12.9 u; there it is 2.64 u from the axis (v5.6 1.48), inside a stretch.
Why not lower: the axis hooks about 150 deg at a radius near 22 fu, and every fair winds up an S
before the hook (k +5 to +7 /kfu, 28-38 u back), visible as a small comb lobe just below the tie. Inferred,
untested: a clothoid exit reference (a run-in of about 72 fu) would peak near 3.1 and move the curve about 2.5 u.
K963's other parts were not this stage (fewnode's G2 tally at g's and q's V corners; the stale `--end-budget`
header, now also in `bodies_k965.py`); m's first foot has no flag over 3. Crops `work15/combs/crops/rows_6_f.png`,
`m1_rqfko.png`; `work15/dbg/fhair_v56_v57.txt`.

**K965, peaks and ceilings: mostly.** v5.6's peaks above v5.4's: k 6.58->2.24, q 7.04->3.14, r 8.88->2.88, y
1.53->0.45 and i 4.83->0.92 are now under v5.4's; f 9.90->5.21 is not (K963). Every stroke is at or below its
v5.6 peak except x2 (0.13->0.16; see Open). q and r pass the ceilings. o's exit is still its tightest spot (6.90 ->
5.08 [8.54]; its p90 rose 221.5 -> 274.6 /Mfu², the shoulder a little more pointed). Crops
`work15/combs/crops/m1_rqfko.png` .. `m5_mnstuz.png`, `rows_15_o.png`, `rows_17_q.png`.

**Checks.** Eye: alphabet median p90 131.7 -> 108.7 /Mfu²; a@352 0.32 -> 1.30 and i@624 0.08 -> 0.64 (with an
extra sign change) rose under 3 (a has 12 nodes from 15, i 5 from 4); f@473/490 fell 0.32-0.70 -> 0.00 (not
looked into). Fidelity over the join rows (`work15/dbg/fid_cmp_v57.txt`): mean 1.667 -> 1.737 u, 12 rows better by
over 0.25 u (among them bo 1.83->1.00, ox, by, pu, ic twice, ur, do, oe, mi), 17 worse (among them fo 3.10->4.19,
ot, br, be, og, ow/op, es, ov, ev, ug, ju, kn, qu, py); `work15/dbg/ends_v56_v57.txt` puts each on a moved body end: o's exit (moved 0.88 u,
turned +8 deg), b's (0.81 u, -10 deg), f's (1.58 u, -18 deg), j's, q's, and the entry curvature of y, g, v, s;
kn unexplained (n's entry turned -2.2 deg, or the refit). The joins are K962's. Stem tops still at the V (a 0.13,
d 0.00, g 0.26, q 0.00 u; a's turn there 83.3 -> 91.7 deg; `work15/vtops/vtops.txt`, `vtops.png`). Words:
"minimum"'s um cusp tooth is longer and its last m's body-to-tail comb has a new two-way spike
(`work15/combs/crops/zoom_min_um.png`, `zoom_min_tail.png`); neither shows at the words sheet's scale
(`work15/words_crops/minimum_end.png`); "hippo" as v5.6.

**Outputs.** `out15/cursive_v57.svg`, `cursive_v57_nodes.svg`, `cursive_v57_words.svg` (+ `.png`),
`combs_v57.svg`, `split_combs.svg`, `split_check.txt`, `e_joins.svg`; `cursive_v57_review.png` holds the chart and
stays local. Bodies and checks: `work15/fewnode/` (`bodies.json`, `selection.txt`, `table.txt`, `eye.txt`,
`rough.txt`), `work15/join/`, `work15/rough/check_v57.txt` (0 of 30 strokes over a ceiling; nodes median 10, max
21). Nothing uploaded.

**Open.** f above v5.4's peak (a clothoid exit reference to try); x: the selection read x1's one cubic as peak 0,
its true 1.53 is under both caps but the rule on true values takes d150e45_t06 (x1 6 nodes at peak 1.18, 1.63 u
off the axis; x2 0.07), which also puts x2 back under v5.6's 0.13 (call: the one-curve x or the rule's pick; fix
rough_k945's flush to `len(P) >= 1` and rerun select + build, about 10 min); 8 strokes over 12 nodes (above); k's
crotch ripple, a's comb corner at its bowl's leftmost node and a notch at its bottom right, f's bottom-loop comb
lobe, small steps at z's top, y and b's exit; the 17 worse join rows and minimum's spikes (K962, K944);
`eye_k925` checks only letters common to every label passed, and `fid_cmp_k965` misnames phrase pairs;
`nodes_pairs_k965` misses z's one-cell row.
