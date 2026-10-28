# K886: cursive v3, letter bodies with generated joins (agent brief)

Brief for one agent stage. Coordinator: the knotmaze Claude session that
filed K886's handle. Written 2026-10-27. Follows K863 (`K863_trace.md`, v1)
and K879 (`K879_trace_v2.md`, v2).

## Why

Levi answered v2's three questions (K878) on 2026-10-27:

1. "I like the retraced stem, but we also still need the exit segment
   without a pen lift." ss01's stem p (`p.mod`) does not join: the font
   lifts the pen after it. ss02's `p.jmc` is the same retraced stem and
   closed bowl plus a baseline tail, and the font joins it to the next
   letter (`cnct.mod_n_n`; `work5/ss_survey.txt` line 76, `ss_sheet.png`).
   Use `p.jmc`.
2. "Do whatever makes sense for correct connections to the next letters.
   It seems like having the exit segment rise too far isn't helpful?" Levi is
   right, and neither full nor short exits is correct: v1 and v2 trace each
   letter between two n's with both connectors attached (from the previous
   n's foot, and up to the next n's top). Two such units side by side draw
   the connection between them twice, and the exit to an n fits only an
   n-like next letter. The font itself draws a word as letter bodies plus a
   connector glyph between each pair, picked by `calt` from both letters'
   classes (313 `cnct.<family>_<from>_<to>` glyphs such as `cnct.mod_n_o`,
   eight `entr_*` entry strokes, and body variants such as `e.*.med_b_`,
   `e.*.med_o_`, `f.*.med_o_`, `t.mod.med_o_`). So the right connection
   depends on both letters, and the alphabet should not bake one in.
3. "Is there any reason we need to preserve the templates dimensions?" No.
   Muse chose them for hand drawing; nothing reads them, and mapping letters
   onto threads rescales anyway. v3 keeps x-height 120 u (so v1/v2
   comparisons hold) and takes every other proportion from the font.

The decision (coordinator, from answer 2): **a letter is its body plus two
join frames; connections are generated per pair when a word is assembled.**

- Body: the stroke of the font's medial body glyph, from the point where the
  incoming connector meets it to the point where the outgoing one leaves.
- Entry frame: that first point, with the arriving connector's tangent and
  curvature there (for letters that start at a cusp, such as i, u, a, c, the
  body then leaves in the opposite direction, as in the font). Exit frame:
  the last point, with the departing connector's tangent and curvature.
  b, o, v and w exit at the x-height.
- Connector: a G2 curve from the left letter's exit frame to the right
  letter's entry frame (position, tangent and curvature matched at both
  ends), such as the quintic Hermite of K868 S2 (`docs/design/K868_s2_g2.md`).
  Its free parameters are calibrated against the font's own connectors.
- Word start and end: a generated lead-in from the baseline and a short
  tail, calibrated against the font's word-initial and word-final forms.

Levi then edits 26 bodies, and every pair joins correctly by construction,
including pairs Levi's edits change. Shapes only, as before: no knot,
thread-width, cusp or physics constraint in this stage.

## Setup

- Everything lives in `.claude/probes/K863/trace/` (untracked). Read
  `NOTES.md` first (v1 and v2 decisions, tools, logs, rerun commands). v2's
  tracer is `tools/trace_k879.py` (crossing repair, `--p`, `--exits`,
  `--xheight`), its review tool `tools/review_k879.py`, the survey
  `work5/ss_survey.txt`. The font and `OFL.txt` are in `font/`, the venv in
  `venv/`.
- Leave v1 and v2 outputs as they are. Write v3 to `work6/` and `out6/`.
- Run Python with the venv's interpreter and `-I`, scripts from `tools/`,
  data paths as arguments.
- The chart (`ref/chart.jpg`) is for review sheets only: never commit,
  upload alone or ship it.
- View images as small crops (1000 px or less, cut by script), never whole
  sheets. Keep `NOTES.md` current under a new `## v3` heading.

## Order

1. **Bodies and frames.** For a-z, take the medial body glyph the font uses
   between two n's (p: `p.jmc.med`), trace its centreline with v2's tracer
   (crossing repair included), and cut it at the join points with the
   neighbouring connector glyphs. Record each letter's entry and exit frames
   from the connectors' traced centrelines. Also record the arriving
   connector's frame after a high exit (shape `o?`) where it differs from
   after `n`, and note which letters the font swaps for a body variant after
   a high exit.
2. **Join generator** (`tools/join_k886.py`): exit frame + entry frame ->
   connector; lead-in and tail. Calibrate against the font's connectors (all
   class pairs that occur in the test words, plus every letter after n and
   after o). Report, per pair class, the largest distance between the
   generated connector and the font's.
3. **Template v3** (`out6/cursive_v3.svg`): new guides from the font
   (x-height 120 u; ascender and descender lines at the font's heights at
   that scale), cells sized so every body and its context fit. Layers:
   Guides; "Letters - draw here" (the bodies: one open stroked path per pen
   stroke, pen order = path order; dots and crosses last); "Joins -
   reference" (each frame as a dot plus a short tangent tick); "Context -
   reference" (generated connectors from and to an n, light grey, so each
   letter reads as in a word). Keep a word cell, "and", built by the
   generator.
4. **Word sheet** (`out6/cursive_v3_words.png`): test words drawn twice,
   the font's own shaping (HarfBuzz, `calt` on, wght 100 centreline) and the
   traced bodies at the font's positions with generated connectors, then
   both overlaid. Cover every exit class into every entry class: at least
   "minimum", "bow", "woven", "boxes", "people", "hippo", "puppy", "and",
   "knotmaze", "cursive", "quick brown fox", "jumps over the lazy dog". Mark
   the pairs where the generated join is visibly off, and say whether a body
   variant (as the font uses) or a generator change would fix each.
5. **Rerun for edits:** a command that rebuilds the word sheet from an edited
   copy of `cursive_v3.svg` (bodies and frames read from its layers), so
   Levi's Inkscape edits can be checked. Write it, and every other rerun
   command, at the end of `NOTES.md`.
6. **Review sheet** (`out6/cursive_v3_review.png`): v2's layout (body,
   frames, context, numbered strokes and arrows beside the chart crop).

## Checks (report the numbers)

- Bodies: at most 1 u from the centre of the font's wght-100 stroke.
- Joins: at both ends of every generated connector, position gap 0, tangent
  angle 0, and the curvature jump (report the largest); the largest distance
  from the font's connector per pair class.
- Crossings: every body crossing a true X, as in v2 (report any change from
  v2's 13, and p's); in the test words, list every crossing between a
  connector and a body, and whether the font has it too.
- Template: every body and its context inside its cell; the guides at the
  font's heights.
- Format: open, stroked, unfilled paths; layer names and ids as specified;
  Inkscape (`C:\Program Files\Inkscape\bin\inkscape.exe`) exports the SVG to
  PNG without errors.
- Pen order and direction per letter unchanged from v2's bodies.
- Residuals: re-report K885's as they stand in v3 (k's 61 deg X where the
  font's passes run about 3 deg apart, coverage up to 4.3 u where a stroke
  touches back in f and q and 1-3 u at retrace forks, the stem p kink, the
  repair windows in template units).

## Rules

- Stop rule: run `Get-Date` at the start and at every milestone. Stop when
  steps 1-6 are done or 2 h after the start, whichever comes first. A
  compaction is not a stop: after one, re-read this brief and `NOTES.md`
  before going on. Steps 1-5 come first; the review sheet is last.
- No commits, no Drive uploads (the coordinator uploads v3), no npm or repo
  dependencies, and no edits to tracked files, except a `## Handoff`
  appended to this brief if the stage stops unfinished (leave it
  uncommitted, for the coordinator).
- Never touch processes you did not start, and never use Levi's Chrome
  profile.
- PowerShell for local commands; read repo code through the shell
  (`Select-String`, `Get-Content | Select-Object`).
- Your final report gives what was built, the check numbers, the join
  model as built (frames, generator, calibration), the pairs that join
  badly and the fix for each, the rerun commands, then a `Ledger items`
  list (follow-ups, residuals, decisions for Levi).
