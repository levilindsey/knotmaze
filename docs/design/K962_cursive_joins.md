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
