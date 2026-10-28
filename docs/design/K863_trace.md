# K863 trace: a starting alphabet traced from a real school-cursive model

Brief for one agent stage. Coordinator: the knotmaze Claude session that
filed K863's handle. Written 2026-10-26.

## Why

Levi rejected every authored a/i so far (K850, K861, K863 passes 3-4). Muse's
"model alphabets" (`.claude/probes/K863/gen_alphabets.mts`) were its own
from-memory imitations of Zaner-Bloser, Palmer and D'Nealian, plus the
Hershey plotter font; none was a trace of a real model. Muse's last plan had
Levi draw all 26 letters in `cursive_template.svg`. Levi, 2026-10-26: "Can we
not have you start this alphabet by tracing something like this, and then I
made more targeted edits to fix lettering to match my goals?", linking a US
school cursive chart (Teacher Created Resources). That image is 648 px at
source, about 10 px per lowercase letter: too coarse to trace. The same
traditional US school model exists as a vector font with its joins designed
in: **Playwrite US Trad** (TypeTogether, Google Fonts, SIL OFL 1.1, variable
`wght` 100-400).

This stage traces its lowercase into the template's format for Levi to edit.
Shapes only: no knot, thread-width, radius-floor or physics constraint here.
Mapping letters onto knot threads comes after Levi has edited them.

## Inputs

- Font: `https://github.com/google/fonts/raw/main/ofl/playwriteustrad/PlaywriteUSTrad[wght].ttf`
  and `OFL.txt` from the same folder. Download into a new, empty directory
  (`.claude/probes/K863/trace/font/`); keep scripts in a different directory
  and pass paths as arguments. Run Python that reads it with `-I`.
- Template: Drive `cursive_template.svg` (fetch it; a local copy and its
  generator are `.claude/probes/K863/cursive_template.svg` and
  `make_template.py`). 1844x2896; a-z plus one joined-word cell, 340x430
  each; per cell ascender, x-height (green dashed, 120 above the baseline),
  baseline (blue) and descender lines; layers "Guides - do not draw here" and
  "Letters - draw here". Its rules: one open stroked path per pen stroke, pen
  order = path order, no fills.
- Levi's chart, for the comparison sheet only (never commit, upload alone or
  ship it): `.claude/probes/K863/trace/ref/chart.jpg`.

## Deliverables

1. `cursive_traced_v1.svg`: the template with its Letters layer filled.
   - a-z as centreline open paths, in the order and direction a pen writes
     them, scaled so the font's x-height is the template's (120 units) and
     placed on the template's baseline, keeping the font's slant.
   - Trace the in-word form: the glyph a letter takes between two
     neighbours (shaping `n?n` and taking the middle glyph is one way to get
     it). Note any other contextual forms the font has.
   - Keep the font's own entry and exit strokes. Do not stretch them to the
     cell edges, and do not move the high exits of traditional cursive (b, o,
     v, w leave at the x-height) down to the baseline. Mark each letter's
     join points (where the font joins it to its neighbours) on a third
     layer, "Joins - reference", and list the high-exit letters.
   - Pen logic the outline cannot show: retraced strokes (a's stem, d, t,
     i...) stay one path that runs down and back up; dots (i, j) and crosses
     (t, x) are their own, last strokes.
   - Joined-word cell: "and", shaped by the font (HarfBuzz) and traced the
     same way.
2. `cursive_traced_v1_review.png`: for each letter, the traced centrelines
   over the font's glyph (wght 100 and 400), numbered strokes with direction
   arrows, and the chart's letter beside it at the same x-height. End with a
   short list of the letters where the font and the chart differ visibly.
3. Both uploaded to Drive folder `K863/` and verified by listing:
   `rclone copy <dir> gdrive:K863 --drive-root-folder-id=1FkjZTpzwaJf8kdfgN07BMbMvRE1rVXKK`.
   rclone is
   `C:\Users\lsl\AppData\Local\Microsoft\WinGet\Packages\Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe\rclone-v1.75.1-windows-amd64\rclone.exe`
   (the WinGet shim does not launch). It prints a NOTICE about the shared
   client_id and can exit 1 for it, hence the listing.
4. The tracer under `.claude/probes/K863/trace/` (untracked). Its own
   dependencies go in that directory (a venv or a package.json there), never
   in the repo's package.json.

## Checks (report the numbers)

- Fidelity: at template scale, the largest distance from a traced path to
  the centre of the font's wght-100 stroke is at most 1 unit, and every ink
  pixel of that glyph lies within half its stroke width plus 1 unit of a
  traced path.
- Format: every path is open, stroked and unfilled; the template's layers
  and ids are intact; Inkscape
  (`C:\Program Files\Inkscape\bin\inkscape.exe`) exports the file to PNG
  without errors.
- Pen order: entry first, dots and crosses last, retraces kept, as the
  review sheet's numbered arrows show.

## Out of scope

App code, knot mapping, thread-width fitting, capitals, other fonts, and
commits. Do not edit `LEDGER.md` or other tracked files, except to append
a handoff to this brief if the stage stops unfinished; leave it uncommitted,
for the coordinator to commit.

## Stop rule

Note `Get-Date` at the start and at each milestone. Stop when the
deliverables are uploaded and verified, or at 2 hours of wall clock,
whichever comes first. A compaction is not a stop; after one, re-read this
brief and the probe directory before going on. At the stop, report: what
was built, the check numbers, the Drive listing, the high-exit letters and
the font-vs-chart differences, then a `Ledger items` list (follow-ups,
residuals, decisions for Levi). Use PowerShell for local commands, never
Levi's Chrome profile (temp profiles only), and read repo code through the
shell (`Select-String`, `Get-Content | Select-Object`).

## Levi's calls (2026-10-27, K901)

Binding on every later cursive stage:

- **Variants are the generator's.** e after o, v, w, b and z, t after o,
  and m, n and v after o: the generator bends the standard letters. Levi
  draws none.
- **Two entry modes per letter.** Each letter takes an entry from the
  baseline and one from higher up (after b, o, v and w). Keeping G2 may
  bend a bit of the following letter's body, not only the connector, as
  the font's own variants do (ledger K904).
- **a, c, d, g, o and q: a junction where the entry meets the body.** It
  sits about halfway between the baseline and the x-height (about 60 u).
  Above it, the entry and the start of the body are one fused thread, so
  the two strokes follow about the same path from the junction to the
  cusp. v3's a entry runs a bit below its body curve.
- **Guides stay at the ink edge** (Levi, 2026-10-27: "sgtm"). The
  template's ascender and descender lines sit where the font's ink
  ends, 244.6 and -124.6 u, about 4.6 u past the stroke-centre paths.
- **Smooth, continuous strokes** (Levi, 2026-10-27: "I'm going to want our
  eventual letter strokes/threads to look smooth and continuous"). Where an
  overstroked (retraced or fused) stretch starts or stops, each pass leaves
  the shared curve tangentially, with continuous curvature: no bump. v4 has
  one at such splits on the right of a, d, g, q, u and y, and in h, m, n, w,
  p and others (K904's redirect).
- **r dips after a high exit** (Levi, 2026-10-27, K901: "dip"). After o, b,
  v and w, r's entry dips about 50 u below the x-height, as the font's
  does, then runs into the standard r: v5's default (`out8/r_after_high.svg`
  shows both).
- **Junction heights** (Levi, 2026-10-27, K917: "sgtm"). The fused junction
  of a, c, d, g and q sits at 60 u, not at each letter's own height: 60 u is
  closer to the font on every pair measured (`out9/k917_junctions.svg`). o's
  sits at 86 u, where the font's e-to-o join meets it (eo 5.14 u off the
  font at 60 u, 1.13 u at 86 u), if the other pairs into o agree (K925
  measures them).
