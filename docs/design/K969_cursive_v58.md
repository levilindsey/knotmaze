# K969: Cursive v5.8, the last bumps before Levi's review (agent brief)

Stage brief (coordinator, 2026-10-28). Parent: K863
(`docs/design/K863_trace.md`; its `## Levi's calls` bind every stage).
Previous stage: v5.7 (`docs/design/K965_cursive_v57.md`). Read its
`## Handoff`, and `NOTES.md` `## v5.7` in `.claude/probes/K863/trace/`,
before anything else.

## Why

Levi's order (K928, 2026-10-27): the curves get smoother, Levi reviews,
the pipeline learns to read Levi's edits as drawn (K944), then Levi
hand-edits, and after that the pipeline does not change the bodies. So
every smoothing has to land before Levi's review.

v5.7 brought every stroke but one to or below v5.4's peak, cleared the
ceilings and K960's eye flags, and stays within the distance budget
(2.5 u from the font's axis, 3.0 u inside the junction stretches). What
is left:
- f's hook still peaks above v5.4's (5.21 against 4.29; K963). The
  handoff's untested idea is a clothoid exit reference.
- Small comb bumps (K969): k's crotch ripple, a's corner at its bowl's
  leftmost node and a notch at its bottom right, f's bottom-loop lobe,
  steps at z's top, y's and b's exits. o's exit is still its tightest
  spot (5.08), though under v5.4's 8.54.
- The roughness check reads a one-cubic stroke as 0 (K968), and three
  tools have gotchas (K970).

Levi reviews whichever of v5.7 and v5.8 is newest when they look.

**Coordinator's call (technical, K968):** x stays v5.7's, both strokes.
Its first stroke is one cubic: 2 nodes, true peak 1.53, 0.87 u off the
axis. The rule on true values would take d150e45_t06 (6 nodes, 1.18,
1.63 u), but both peaks are far under the alphabet's tightest (f 5.21),
and fewer nodes serve Levi's hand edits.

## Goal

v5.8 is v5.7 with its last bumps gone:
- f's peak at or below v5.4's 4.29, its hook's nodes spread.
- Each K969 bump gone, or a measurement showing the font's own shape
  needs it at the budget.
- No stroke above its v5.7 peak, no node count up, unless a fix
  elsewhere costs it (explain each).
- Kept from v5.7: the roughness ceilings, no eye flag over 3 except the
  intended corners and cusps, the distance limits (2.5 u, and 3.0 u in
  the junction stretches), x, the e and o ends (K959), the a/g/q stem
  tops at the font's V (K939), the joins G2 with the bodies.

## Order

1. **The tools (K968, K970, K963's tool parts).**
   - `rough`: flush a piece when `len(P) >= 1`. Rerun v5.7's roughness
     check with it and report what changes (x, x2, t2).
   - `eye`: check every letter each label has, not only the letters
     common to every label passed.
   - `fid_cmp`: name the phrase pairs right. `nodes_pairs`: draw z's
     one-cell row.
   - fewnode's G2 tally: don't count g's and q's V corners as joints.
   - The stale `--end-budget` headers in `bodies_k959.py` and
     `bodies_k965.py`'s copies: fix them in your copies.
2. **f's hook (K963).** Try the clothoid exit reference (a run-in of
   about 72 fu), and any better idea the measurements suggest. Choose by
   the checks. Spread the hook's nodes.
3. **The small bumps (K969).** For each one: the cause, then a fix at
   the source (node placement, a local band, a per-letter fair), or a
   measurement showing the font needs it. Soften o's exit only if the
   fix is local and costs nothing elsewhere.
4. **Build v5.8** as v5.7 was built (`work15/dbg/build_v57.ps1`): refit
   the joins on the new end frames, then the rest of the build, in the
   same order. The titles say v5.8. Outputs in `out16/`:
   - `cursive_v58.svg` (the template);
   - `cursive_v58_words.svg` (+ `.png`);
   - `combs_v58.svg`;
   - `cursive_v58_nodes.svg`, as v5.7's;
   - the review PNG, which stays local.
5. **Checks.**
   - Rerun fidelity to the font, `split_check`, the eye check and the
     roughness check. Explain every result that changes, and every
     fidelity change over 0.25 u.
   - Combs at 288 DPI, v5.7 beside v5.8, for every stroke that changed
     and the words "minimum" and "hippo". Crop and look at each.
   - Crop and look at every changed letter at the nodes sheet's scale,
     v5.7 beside v5.8: it still reads as the font's letter. Name any
     that reads differently.
   - The stem tops stay at the V.

Not this stage: K944 (reading Levi's edits as drawn), K962 (the join
seams and the join regressions), K961's remaining node counts unless a
fix lowers them, K946, K948, K949, K937, K950's side-by-side and capitals
(K931).

## Rules

- **Tools and outputs.**
  - New tools are `tools/*_k969.py`, copied from the latest versions.
  - Outputs go in `work16/` and `out16/`, and the record goes in
    `NOTES.md` `## v5.8` with its rerun commands, every label list
    written out.
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
  - At 1 h 30 min, if step 4 has not started, build v5.8 from what you
    have and say what is missing.
  - A compaction is not a stop. After one, re-read this brief and
    `NOTES.md` `## v5.8`.
  - On stopping, append a `## Handoff` to this brief, then report.
- **The final report** gives:
  - per stroke, v5.7 against v5.8: node count, roughness, peak |dk/ds|
    (and v5.4's peak) and the largest distance from the font's axis,
    outside and inside the junction stretches;
  - K963, K968, K969 and K970, each: the cause, the fix or why not, and
    a crop;
  - the eye flags and the fidelity changes, each explained;
  - the paths of the outputs and of the crops you looked at;
  - a `Ledger items` list (follow-ups and residuals; a question for Levi
    only about what shows on screen, in plain words);
  - K863's current handle fields.
