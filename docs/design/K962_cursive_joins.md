# K962: Cursive J2, the joins (agent brief)

Stage brief (coordinator, 2026-10-28). Parent: K863
(`docs/design/K863_trace.md`; its `## Levi's calls` bind every stage).
Previous stage: J1, K980 (`docs/design/K980_cursive_local.md`). Read its
`## Handoff`, and `NOTES.md` `## K980` in `.claude/probes/K863/trace/`,
before anything else. Ledger items: K962 (this stage), K948, K946, K949,
K937 and K988, the join defects it fixes.

## Why

Levi wants the curves smooth, "even smoother than you currently have
them", and then hand-edits the letters (K928). J1 made every derived piece
local: a join now depends only on its two letters' drawn ends and on
constants in the map. What is left is the quality of the derived pieces.
The open defects, with their pointers:
- **K962.** Seam spikes ("minimum", "hippo": p to o, h's entry), m's exit
  hook, minimum's um tooth and its last m spike. v5.7's 17 join rows that
  got worse by over 0.25 u (fo 3.10 -> 4.19 the worst; kn unexplained).
  v5.8's ma +0.36 u and la -0.29 u (a's entry moved 0.59 u).
  `work15/dbg/fid_cmp_v57.txt`, `work16/dbg/fid_cmp_v58.txt`.
- **K948.** The e after o, b, v and w turns from its level crossbar up
  into the eye's back in a short span: an elbow where the font turns
  smoothly. evar's start curve meets the body at s 298 of 1052, and oe is
  5.7 u off. `e_joins_v54.svg` (v5.4's outputs).
- **K946.** Generator hooks (`gen_k925`): d's entry (curvature 194 1/u),
  the hippo lead-in (6408 1/u), b's word-initial lead-in (a small step),
  and the na and nq joins (G1 only). `K930_cursive_smooth.md` `## Handoff`.
- **K949.** Joins far off the font: fe 15.34 u, bk 7.85 (check the
  reference cut near k's loop entry), ee 6.9, br 5.5 (its refit sat on its
  bounds), y's final tail 3.58. `K926_cursive_e.md` `## Handoff`.
- **K937.** The connector into o at its 86 u junction (`cnct.mod_n_o`) was
  fitted with the others: v5.2's shared refit moved ho, to, io, do, mo, nd
  and ng about 1 u off the font (ho 1.78 -> 2.87 u).
  `K925_cursive_v52.md` `## Handoff`, `NOTES.md` `## v5.2`.
- **K988.** maze's z exit node is a near-cusp. Its comb is a capped spike
  (v5.8 and J1), and its teeth fan differently after a 0.016 u join move.

## Coordinator's calls (technical)

1. **Nothing is fitted at build time.** A derived piece is a fixed
   construction on the drawn letters. Its settings are chosen now (fit
   them against the font where that helps), then frozen in the map
   (`template_map_k962.json`, key `k962`). After Levi's edits the drawing
   is the only target, so a build-time fit toward an old curve or toward
   the font is out.
   - This settles J1's open question. The e variants drop the continuous
     fit toward v5.8's curve, and apply frozen settings to the drawn e.
   - State each setting so it names the same place after an edit: an arc
     length from a stroke end or from a feature, never a node index.
   - J1 found the font's objective flat around v5.8's point (optima
     3.4-3.8 u apart at the same distance). Inside the budget (call 4),
     pick by smoothness.
2. **Seams are G2 by construction.**
   - Each join, entry, lead-in, tail, variant and fused connector reads
     the position, tangent and curvature of the drawn end it meets, and
     matches all three. Then no edit can put a kink or a curvature step
     at a seam.
   - A cusp entry (J1's list: i j p r s t u w y) keeps its corner, and so
     does any seam the font draws as a corner. Name each.
3. **Bodies stay as drawn.** Levi edits them next (K928).
   - A defect that sits in a body (the drawn letter, not a derived piece)
     is reported with a crop and the node edit you would make. Don't
     apply it.
   - Then Levi can start editing at any time, and this stage's pieces
     follow the edits.
4. **The distance budget.** Within 2.5 u of the font's path (3.0 u inside
   the K960 junction stretches), smoothness wins: no comb spike, and the
   lowest peak |dk/ds|. A piece that cannot be inside the budget needs a
   reason, with a crop: the font joins elsewhere, or the drawn end sits
   off the font's.
5. **Locality holds.** J1's harness (`work18/dbg/sensitivity_k980.py`)
   passes all nine edits at the end, with untouched pieces at 0 u.

## Goal

- **A join census,** `work19/dbg/census_k962.py`, reusable by later
  stages. It covers every derived piece in the words and combs sheets.
  For each piece:
  - its distance to the font (max and mean, against the budget);
  - each seam's tangent and curvature gap;
  - its peak |dk/ds|, comb spikes and kinks;
  - rough's result.

  It ranks them worst first.
- **Each listed defect** fixed, or explained with a crop, with its
  numbers before and after.
- **J1's harness** passes all nine edits.
- **In `out19/`:**
  - `cursive_v59_words.svg`;
  - `combs_v59.svg` (minimum, hippo, the e joins be, we, ve and oe, and
    every pair this stage changed);
  - `census_v59.txt` (before and after);
  - the template, only if it changed. Its Letters layer stays byte for
    byte out18's.

## Order

1. **The census, baseline,** on J1's build. Write the table into
   `NOTES.md` `## K962` as you go.
2. **The e variants** (calls 1 and 2, and K948). Rerun the harness and the
   census.
3. **G2 seams** (call 2) for every join, entry, lead-in, tail and fused
   connector. Rerun.
4. **The listed defects,** worst first by the census: K962, K946, K949,
   K937 and K988. For each, give:
   - where it lives (a derived piece or a body);
   - the fix;
   - the numbers before and after;
   - a crop.

   Rerun after each.
5. **Build and look.**
   - The unedited build against J1's: which pieces moved, and by how much.
   - The census after, and the harness.
   - Crop and look at every listed defect, before and after.

Not this stage:
- the bodies (call 3);
- K981's G2 follow-up (K987);
- rough on K944's n edit (K986);
- transport's node alignment (K989);
- K927;
- capitals (K931);
- K950's choice.

## Rules

- **Tools and outputs.**
  - New tools are `tools/*_k962.py`, copied from J1's latest versions.
  - `work19/dbg/build_from_svg.ps1`, copied from J1's, runs the whole
    build.
  - Outputs go in `work19/` and `out19/`.
  - The record goes in `NOTES.md` `## K962`, with its rerun commands and
    every label list written out.
    - Write each finding there when you have it, not at the end. It
      survives a compaction, and a transcript is a poor place to dig
      results back out of.
    - Scripts go in `work19/dbg/`, never the session scratchpad.
  - Leave earlier versions' tools and outputs untouched.
- **K930's writer.** Every new curve goes through it: few nodes, G2.
- **Software.**
  - Python: `.claude/probes/K863/trace/venv/Scripts/python.exe -I`.
  - Inkscape: `C:\Program Files\Inkscape\bin\inkscape.com`, from the
    command line only. Never open its window, and don't change its
    preferences.
  - Read code through the shell (`Select-String`, then `Get-Content |
    Select-Object -Skip -First`).
  - Downloads: none should be needed. If one is, put it in a new, empty
    directory and run Python on it with `-I`.
- **Levi's chart.**
  - `ref/chart.jpg` is never committed, uploaded or embedded in an SVG.
  - The review PNG contains the chart.
  - Upload nothing: the coordinator uploads the SVGs.
- **Tracked files.**
  - Everything lives in the untracked probe directory, so there is
    nothing to commit.
  - The `## Handoff` you append to this brief is the coordinator's to
    commit.
  - `LEDGER.md` is the coordinator's.
  - Don't touch other tracked files.
- **Another agent** (K868's S3a6) times the label until about 08:10. You
  time nothing, so never take the perf lock, and run one Python build at
  a time.
- **Not allowed:**
  - the phone;
  - timing;
  - `npm run build` in the main checkout;
  - processes you did not start;
  - Levi's Chrome profile.
- **Crop and look** at your own renders before you call a visual result
  done.
- **Levi** is named, never "he" or "his", even where older notes say so.
- **Helpers.** Only if needed: `model: sonnet`, a 1 h cap and these rules.
- **Stop rule.**
  - Stop when steps 1-5 are done or 2 h after your start, whichever comes
    first. Run `Get-Date` at the start and at each milestone.
  - At 1 h 30 min, finish the step you are on. Rerun the harness and the
    census, and say what is missing. What is left becomes the next stage.
  - A compaction is not a stop. After one, re-read this brief and
    `NOTES.md` `## K962`.
  - On stopping, append a `## Handoff` to this brief, then report.
- **The final report** gives:
  - the census before and after, in short: the worst rows, and each
    listed defect's numbers;
  - per defect: where it lived, the fix, and the crops you looked at;
  - the defects in bodies, each with its proposed node edit and crop;
  - the harness at the end;
  - the unedited build against J1's: the largest moves;
  - the outputs;
  - anything Levi should know, in plain words;
  - a `Ledger items` list (follow-ups and residuals; a question for Levi
    only about what shows on screen, in plain words);
  - K863's current handle fields.

## Handoff

J2 stage agent, 2026-10-28 06:54 to 08:26, stopped at the 1 h 30
checkpoint. Nothing is committed, and this section is the only tracked
edit. Paths are relative to `.claude/probes/K863/trace/`. The record,
every rerun command and every crop's label list are in `NOTES.md`
`## K962`.

### What was built

- **The census tool**, `work19/dbg/census_k962.py` (`run`, `cmp`).
  - It measures every derived piece of the 14 sheet words: 88 joins,
    14 leads, 5 virtual leads, 23 tails and the 2 e variants.
  - Per piece: the distance against the budget (joins against
    `pair_reference`, leads and tails against the font), the seam's gap,
    angle and dk at both ends, the peak |dk/ds|, comb spikes, internal
    kinks, hooks (a turn over 20° within 0.5 u) and rough's band, ranked
    by a badness score.
  - The o exit seams get their own line (Levi's cusp call) and never
    count as undesigned non-G2 seams.
- **The frozen settings** (call 1).
  - `work19/dbg/joinfit_k962.py` chose one set per key, once: smoothness
    first inside the budget, plus a penalty on any speed under 0.3 of the
    mean (the seam micro-hooks).
  - `work19/dbg/freeze_k962.py` writes `work19/template_map_k962.json`:
    work18's map plus key `k962`, with 22 join sets, 5 leads and 6 tails
    (no e tail: K950). The e variants are J1's, restated, not refitted.
  - The take rule: a set changes only when J1's has a defect, the
    objective drops by 5% or more, and, if it is still over budget, it is
    no rougher.
  - Seven sets keep J1's anyway (`--keep-j1`):
    - `ful_b_e|e` (be, we, ve), `ful_o_e|e` (oe) and `ful_b_r|r` (br),
      by look: their new sets dipped into a U or went farther (crops
      `work19/crops/words_bewe.png`, `words_shoe.png`, `words_br.png`,
      `words_row14.png`);
    - the o exits `ful_o_x|x`, `mod_o_n`, `mod_o_o` and `cnt_o_n`, by
      Levi's cusp call (`mod_o_t` was J1's already).
  - `tools/gen_k962.py`'s `params_for` reads the key. Nothing is fitted
    at build time.
- **The build** (`work19/dbg/build_from_svg.ps1`): 83 body strokes, 0
  moved. The template's Letters layer is identical to out18's, so there
  is no new template.

### Outputs (`out19/`)

- `cursive_v59_words.svg`: the 14 sheet words.
- `combs_v59.svg`: combs of the same 14 words, J1 above J2. They include
  minimum, hippo, and "be we shoe maze huge bye" (be, we, ve, oe), and
  all 77 pieces this stage moved. Pairs outside these words that share a
  re-chosen set (to, io, mo and ng share `mod_n_o`) changed too, but are
  not drawn.
- `census_v59.txt`: the census before (J1, `work18/build_k980`), after
  (J2) and the compare.
- None of them holds an `<image>`, "chart" or `.jpg`.

### Census, J1 to J2

| Measure | J1 | J2 |
|---|---|---|
| Hooks | 28 | 10 |
| a0 or a1 at the 0.02 floor | 20 | 7 |
| Over budget | 34 | 32 |
| Comb spikes | 62 | 16 |
| Rough FAIL (body limits, noisy on connectors) | 78 | 44 |
| Seams not G2, internal kinks | 0, 0 | 0, 0 |

- The 10 hooks left all belong to J1-kept sets: be, we, ve ×4, oe, br
  and ox ×2.
- Over budget after (u): ot 6.56, tail t 6.53, lead f 6.46, oe 5.29,
  br 5.18, fo 4.64 (fused, budget 3.0), lead h 3.59 ×2, tail y 3.55 ×2,
  e after_o 3.55, be 3.47, e tails 3.39 (K950), lead s 3.28, lead l 3.16,
  ur 3.16, ve 3.14-3.16, et 3.12, lead b 2.96, e after_g 2.87, ox 2.66.

### The harness and the unedited build

- **The harness.** J1's harness ran on gen_k962
  (`work19/dbg/derive_k962.ps1`, then `sensitivity_k962.py local`;
  results in `work19/local/j2/sensitivity.txt`).
  - All 9 edits PASS.
  - Untouched pieces moved 0 u on every edit, and no word without an
    edited letter changed.
  - The touched maxima equal J1's, except e_end 2.524 u (J1 2.530) and
    d_fused's gain 0.96 (J1 1.48).
- **The unedited build against J1's** (`work19/cmp_j1.txt`).
  - 77 of 510 pieces moved, all of them connectors: joins 55 of 88,
    leads 14 of 19, tails 8 of 23.
  - No body, frame, junction or split moved.
  - Largest moves (u): fo 7.44, lead f 5.47, ic 5.44, lead c 5.43,
    nd 3.29, lead d 3.27, tail r 3.09, lead l 3.09, es 2.81, tail d 2.57,
    et 2.47, lead b 2.25 ×5, wo 2.06, tail k 2.04.

### The listed defects

- **K962's seam spikes.**
  - Where they lived: micro-hooks at the seams, not in the seam frames.
    A connector whose a0 (or a1) sits at the floor, with b0 < 0 (or
    b1 > 0), reverses its speed within 0.05 u of the seam. That makes a
    hairpin too small to read as a loop, which the comb draws as a fan
    of red teeth (`work19/crops/base_hooks1.png`).
  - The fix is the frozen sets above.
  - minimum: the m tail's hook and its 18 spikes are gone (1.00 to
    1.20 u), and so are mu's 4 spikes. um has no hook or spike in either
    build (0.76 u, unchanged).
  - hippo's p to o: po's hook is gone (1.74 to 2.64 u, fused).
  - h's entry: not fixed (note 2 below).
- **v5.7's worse rows, fo and kn.**
  - fo: the hairpin (174° at 0.04 u) is gone and its spikes went from 58
    to 38. It is not fixed: a burst of curvature stays at the seam (the
    red fan in `work19/crops/over_j2.png`, panel "fo 4.64 S"). It sits
    4.64 u off (was 4.17; fused budget 3.0), and its peak away from the
    seam rose from 0.114 to 0.146 1/u².
  - Where fo's burst lives: f's lower loop ends mid-turn, so fo has to
    start at the loop's tight curvature (G2) and unwind at once. That is
    a body defect (below).
  - kn: 1.02 u, no defect, unchanged.
- **v5.8's ma +0.36 and la −0.29.**
  - ma: 2.20 to 2.89 u; peak 0.344 to 0.017; spikes 7 to 0.
  - la: 1.66 to 2.56 u; peak 0.347 to 0.018.
  - Both are fused and inside 3.0 u. Smoothness won (call 4), so both
    moved farther from the font.
- **K948, e after o, b, v and w.** Not fixed.
  - The new sets looked worse (a U dip under the exit; oe farther and
    still hooked), so J1's stay: be 3.47, we 2.01, ve 3.14-3.16 and
    oe 5.29 u, each with J1's seam hairpin (152-159°).
  - Where it lives: the start of e's after_o variant, not the connector.
    o's exit is level (+8°) and still hooks into e, while b, v and w end
    17-22° below level.
  - The fix, for the next stage: re-choose the after_o variant's settings
    (`k962.evar.o`: J's arc length before e's top, 48.05 u, and C's
    curvature) together with `ful_b_e|e` and `ful_o_e|e`, scored for
    hooks and dips. The other route is to redesign the variant's start
    (K948's elbow).
- **K946.**
  - d's entry: nd's two hooks are gone (1.53 to 2.88 u, fused), and
    lead d's too.
  - hippo's lead-in: not fixed (note 2).
  - b's word-initial lead: its 31-39 comb spikes are gone (3.06 to
    2.96 u), but a smooth bend remains (note 1).
  - na and nq: not in the 14 words, so not measured. Every measured seam
    is G2.
- **K949.**
  - br: 5.18 u, J1's set kept by look (the new set made a deeper V, at
    6.62 u).
  - y's final tail: 3.55 u, J1's set kept (no gain).
  - fe 15.34, bk 7.85 and ee 6.9: not in the 14 words, so not measured.
- **K937.**
  - The `mod_n_o` group (ma la ug no ho do po ro) lost its curvature
    peaks (0.12-0.57 down to 0.016-0.028 1/u²).
  - The cost is distance: ho 1.90 to 2.85, no 1.95 to 2.89, do 1.78 to
    2.76 and ro 2.00 to 2.89 u. All are fused and inside 3.0 u.
  - to, io, mo and ng share the set and are not in the 14 words.
  - nd's hooks are gone (above).
- **K988.**
  - maze's z exit: ze's hook is gone (2.05 to 2.28 u).
  - The capped comb spike and the fan of teeth after a 0.016 u join move
    are the same seam micro-hook (a set at the a0/a1 floor). The 7
    pieces still at the floor are the J1-kept be, we, ve ×4 and oe.

### Levi's v5.8 join notes (crops: J1 above, J2 below)

1. **b's entry, "a strange bend"** (`work19/crops/notes_leads_j1_j2.png`,
   panels bow and be). Partly fixed.
   - J1's red spike at the lead's middle node is gone.
   - A smooth bend stays at that node, as in the font's own lead,
     because the lead is held 2.96 u from the font's.
   - A straighter lead would sit farther from the font's: Levi's call.
2. **h's entry** (the same crop, panels hippo and huge; and
   `notes_entries_j1_j2.png`, panels sh and th). Not fixed: lead h is
   J1's (3.59 u).
   - The word-initial lead curls in its last 2-3 u to reach h's start
     curvature. Mid-word sh and th arrive straight.
   - Fix: give lead h a longer arrival (b1), which costs distance, or
     start h's body where it curves less (a body edit).
3. **p's exit** (`notes_pexit_j1_j2.png`, panels pp, po, py, pl and ps).
   - The seam is G2 in both builds. J2 removed po's hook and py's spikes.
   - The comb peaks at the seam because p's drawn end runs long and
     flat, so the exit has to turn at once.
   - The fix is the body's. The exit frame is read at the drawn end
     (`asdrawn_k980` ~926), so once p's end is shorter, rerun joinfit and
     freeze for the p exit sets. No code change is needed.
4. **The cusp entries, t and p** (`notes_entries_j1_j2.png`, panels ip,
   pp, up, mp, ot and et; `notes_pexit_j1_j2.png`, panel op). Not fixed.
   - J2 removed J1's curl at the cusp (peak 0.024-0.026 down to
     0.0045-0.0075), and et's red tooth.
   - The arrival angle is unchanged: p 159°, t 143°, py 166°, op 169°,
     and i, u, s, r 165-172° (collinear is 180°).
   - The connector arrives steeper than the stem leaves. It lies on the
     stem's right just under the cusp, and crosses the stem about 20 u
     lower.

   The rule for i j p r s t u w y, in this construction:
   - **(a) Arrival tangent.** Make it −(the drawn stem's start tangent),
     exactly 180°: in `asdrawn_k980` ~917-921 and in the after_o and
     after_b arrivals ~935-940.
     - The arrival then stops being a fitted per-letter constant
       (`bodies_k902 --cusp-arrival`).
     - That also removes K944's arrival jump at the first edit (7.6-37°).
   - **(b) Arrival curvature.** Avoiding a crossing near the cusp needs
     k_c + k_s > 0, where k_s is the stem's start curvature and k_c the
     connector's, each signed to its own travel. The p and t stems curve
     toward vertical (k_s > 0), so any approach that turns left passes.
   - **(c) A hard no-crossing check.** Every connector sample stays on the
     previous letter's side of the stem, taken as the first ~25 u of R's
     body as a polyline. It is a rejection in joinfit_k962 and a FAIL
     column in census_k962.
   - **(d) Re-choose the cusp-entry sets** with joinfit and freeze: the
     low-cusp group, `ful_n_r|r`, `ful_e_r`, `ful_n_s`, `ful_e_s|s`,
     `mod_o_t`, and so on.
   - Caveat: after a high exit (o b v w), a collinear arrival from the
     x-height may need a dip. Check each pair.

### o's exit (Levi's cusp call)

No o exit seam was smoothed or tuned: all six o-exit sets are J1's.
These read o's end frame and change once o ends in a cusp (K976):

1. `gen_k962.assemble`: `fL = L.frame_at(B[Lk]["exit"], xL)`, the start
   frame every connector is G2 to.
2. `asdrawn_k980` ~926 and `gen_k962.read_template`'s exit branch: the
   exit frame is always the drawn end, smooth. Only entries have a cusp
   branch.
3. `params_for`: the six o-exit sets (ox, oe, ow/op, og, ot, ov), chosen
   against today's S-bend. ox, oe and ow/op carry J1's micro-hooks.
4. `join_k926.entry_rec`: o is in `L.HIGH`, so the next letter takes its
   after_o record (e's variant `k962.evar.o`; x, w, p, v, t, g). All of
   them were fitted to today's exit.
5. `join_k926.pair_reference`: it already has a cusp-exit branch (K902).
6. census_k962 and joinfit_k962: the seam and hook tests would flag a
   designed cusp at o's exit.

If K976 puts the cusp inside o's body, only 3 and 4 need re-choosing. If
the cusp sits at the seam, the exit needs the kind "cusp": asdrawn and
read_template keep a departing (T, k), and the census and joinfit skip
the hook test there.

### Body defects (proposed, not applied)

- **p's end runs long and flat** (note 3): its last cubic runs 130 fu
  along the baseline (x 340 to 470 fu). Shorten it, ending near x 430,
  so the exit turns up sooner. Crop `notes_pexit_j1_j2.png`.
- **f's lower loop ends mid-turn** (fo): end it either before the turn or
  after it, where it curves less, so fo starts gentler. Crop
  `over_j2.png`, panel "fo 4.64 S".
- **h's start** (note 2): begin h's body where it curves less, so the
  lead's G2 target is gentler. Crop `notes_leads_j1_j2.png`.
- **e after o, b, v and w** (K948): the start of e's after_o variant
  (above). b, v and w's exit hooks end 17-22° below level. Crops
  `words_bewe.png`, `words_shoe.png`, `words_row14.png`.
- **o's exit cusp**: K976.
- a's top turnaround and k's leg are Levi's notes; not measured here.

### What is missing

- K949's fe, bk and ee and K946's na and nq are not in the 14 words, so
  they are not measured. Add words that hold them to the census.
- Pairs outside the 14 words that share a re-chosen set changed, but are
  neither drawn nor measured.
- K948 (be, we, ve, oe, br) is still open (above).
- The cusp-entry rule (note 4) is designed above, not built.
- fo and tail t were taken because they lost J1's hooks, though the
  census's peak away from the seam rose: fo 0.114 to 0.146, tail t 0.044
  to 0.169. joinfit's roughness counted the hooks.
  - The take rule should read the census's peak, with the hook as its own
    term.
  - tail t has not been cropped yet.
- Over-budget pieces still need a reason and a crop, or a re-choice:
  - ot (an o exit, J1's);
  - tail t 6.53;
  - lead f 6.46 (smooth now, and 6.46 u in both builds; why it sits that
    far is not yet explained);
  - fo 4.64, lead h, tail y, lead s, lead l, ur, et and lead b.

### Rerun

From the trace directory, with `$py = ".\venv\Scripts\python.exe"` and
`$font = "font\PlaywriteUSTrad[wght].ttf"`:

    & $py -I work19\dbg\joinfit_k962.py $font work18\build_k980\bodies.json work18\build_k980\join_params.json work19\joinfit_k962.json work19\joinfit_k962.txt
    & $py -I work19\dbg\freeze_k962.py work18\template_map_k980.json work18\build_k980\bodies.json work19\joinfit_k962.json work19\template_map_k962.json --report work19\joinfit_k962.txt --keep-j1 "prm:cnct.ful_b_e|e,prm:cnct.ful_o_e|e,prm:cnct.ful_b_r|r,prm:cnct.ful_o_x|x,prm:cnct.mod_o_n,prm:cnct.mod_o_o,prm:cnct.cnt_o_n"
    pwsh -NoProfile -File work19\dbg\build_from_svg.ps1 out18\cursive_template.svg -Name k962
    & $py -I work19\dbg\census_k962.py run $font work19\build_k962\bodies.json work19\build_k962\join_params.json work19\census_k962.txt work19\census_k962.json --gen gen_k962 --label "J2"
    & $py -I work19\dbg\census_k962.py cmp work19\census_base.json work19\census_k962.json work19\census_cmp.txt
    pwsh -NoProfile -File work19\dbg\derive_k962.ps1 -Stage j2
    & $py -I work19\dbg\sensitivity_k962.py local work19\local\j2 work19\local\j2\sensitivity.txt
