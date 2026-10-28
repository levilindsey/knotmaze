# K926: Cursive v5.4, e after high exits and the word-final e

Stage brief (coordinator, 2026-10-27). Parent: K863. It covers K926 and
K929. Previous stage: K930 (`docs/design/K930_cursive_smooth.md`). Read its
`## Handoff`, then `.claude/probes/K863/trace/NOTES.md` `## v5.3`, before
anything else.

## What Levi saw

Levi, 2026-10-27, on `cursive_v51_words.svg`:
- "ending e's should have a bit of the exiting segment drawn."
- "exit segments coming from high exits (like v) curve incorrectly to join
  with e."

The coordinator's crops are in
`.claude/probes/K863/trace/work12/coordinator_e_joins.png` (288 DPI, with
the font in grey). The readings below come from those crops; check them
against the font's outlines.

1. **The word-final e** (people, knotmaze, the, cursive).
   - Our stroke stops where the eye closes, about 25 u up, with no bowl
     and no exit.
   - Why: the generator draws e's bowl as part of the red connector to
     the next letter, and a final e has no next letter. words_report.txt
     says: "no tail after e (no free end of the font's .fin leaves along
     the exit tangent)".
   - The font's final e goes on round the bowl and exits up and to the
     right, to about 30 u.
   - Final o, s and w (bow, boxes, hippo) end as the font's do. Check
     them, but e is the letter that loses part of its body.
2. **e after a high exit** (ve in woven, over and cursive).
   - Our connector from v's high exit dives to the standard e's eye
     crossing, at about 27 u. In cursive it crosses e's left side on the
     way, at 21 deg.
   - The font uses a different e after a high exit (e.ful.med_o_ and
     e.ful.fin_o_). Its connector comes down to meet the eye at about
     60 u, then turns up into a shorter eye.
   - Distances from the font: ve 31.2 u, be and oe about 31 u.
   - ze (knotmaze) is 66.9 u off. The font runs one diagonal from z's
     descender loop up into the eye (e.ful.fin_g_). Ours wobbles.

## Order

1. **e's high entry.**
   - Generate it from the standard e. Levi's calls in `K863_trace.md` say
     so: "Variants are the generator's", and keeping G2 "may bend a bit
     of the following letter's body".
   - Use the font's variants as the target. The connector leaves the high
     exit tangentially, meets e where the font's does, and never crosses
     e's body.
   - Measure every pair into e, from ae to ze, against the font before
     and after. The low-entry pairs must not move.
   - Then ze, and ge, je and ye if the font treats them the same way. Say
     which entry mode they take and why.
2. **The word-final e (K929).**
   - e keeps its bowl and draws the start of its exit. The exit is as
     long as the tails the generator already draws after m, n, y and d
     (orange).
   - Fix the reason the tail search fails rather than special-casing e.
   - Check final o, s and w the same way and report.
3. **The joins out of e, and the rest of K926.**
   - en is 7.1 u and er 8.4 u off the font in the words sheet.
   - bk and br are worse under fair than under blend.
4. **Build v5.4.**
   - `out12/cursive_v54_words.svg`, plus the template if it changes.
   - An `out12/e_joins.svg` review sheet: every pair into e and each
     final e, o, s and w, drawn large over the font.
   - Add a line of words to the words sheet so that every pair this
     stage changes appears, for example "be we shoe maze huge bye".

Not this stage:
- K927;
- K928 (Levi's call);
- capitals (K931).

## Rules

- **Tools and outputs.**
  - New tools are `tools/*_k926.py`, copied from `*_k930.py`.
  - Outputs go in `work12/` and `out12/`, and the record goes in
    `NOTES.md` `## v5.4` with its rerun commands.
  - Leave v5.3's tools and outputs untouched.
- **K930's writer.** Every new curve, connectors and tails included, goes
  through K930's writer: few nodes, G2.
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
    `NOTES.md` `## v5.4`.
  - On stopping, append a `## Handoff` to this brief (the coordinator
    commits it), then report, ending with a `Ledger items` list.

## Handoff

Stage agent a62b721e8acb0bad6 of claude session
bf876705-c9fa-4b1f-83ea-e173dac6cff3, stopped 2026-10-27 at 20:12
(cap 20:46) with the four steps built. The record and every rerun
command are in the probe's `NOTES.md` `## v5.4`. The whole build reruns
with `pwsh -NoProfile -File
.claude/probes/K863/trace/work12/dbg/run_v54.ps1` (about 5 min).
Nothing was committed: the probe directory is untracked.

Done:
- **Step 1, e's high entry.** `tools/evar_k926.py` generates the font's
  two entry variants from the standard e.
  - The o entry (`e.ful.med_o_` / `fin_o_`, after b o v w) is a
    near-level stroke from 252 fu. The g entry (`med_g_` / `fin_g_`,
    after c g j y z) rises from 146 fu at 34°.
  - A G2 start curve (3-4 cubics, K930's writer) runs from where the
    entry line meets the body's left side to s 298 of 1052, then the
    standard body goes on. `fitp_k926` refits the e join sets into the
    variants.
  - The font draws `med_o_`'s body 31 fu right of the glyph origin
    (advance 600 against 569), and v5.4 places it there.
  - ze, ge, je and ye take the g entry because the font does: it
    substitutes `med_g_` after exactly c g j y z, whose exits arrive at
    mid-height, rising.
  - Distance from the font's connector (u, v5.3 -> v5.4, medial /
    alone): be 31.17 -> 2.89 / 3.00, oe 31.07 -> 5.72 / 5.67, ve 31.17
    -> 3.46, we 31.15 -> 2.23 / 2.03; ce 11.93 -> 1.06, ge je ye 12.48
    -> 1.50, ze 12.45 -> 2.05 / 1.96.
  - The low-entry pairs are unmoved (0.34-0.67 u): ae de he ie ke le me
    ne pe qe re se te ue xe. No join crosses e's body (v5.3's ve did).
- **Step 2, the word-final e (K929).** `join_k925` took a tail's start
  tangent from its first 30 fu. e's exit sits on a skeleton junction,
  so the cos fell to 0.65 and the 0.7 gate rejected it.
  - `tails_k926 --skip 20` fits the tangent past the junction (cos
    0.98), for every letter, with no e case.
  - `--cap rise` stops the exit where it has risen as much as the m / n
    / y / d tails (median 23.2 u): 51.1 u from the lowest point, ending
    1.46 u from the font's exit.
  - Max off the font: ne 1.82, the 1.77, cursive 3.29 u (m 1.24, n
    1.31, d 1.59, y 3.58).
  - A final e after a high exit is sheared, not shifted, because the
    font's `fin_o_` moves only the eye (+31 fu). The shear is affine,
    so G2 holds. Body mean 2.68 -> 1.36 u, tail 1.20 u.
  - Final o, s and w (and b) have no tail by structure: o's skeleton
    has no free end, and the free ends of s, w and b lie on their own
    bodies. They end as the font's do.
- **Step 3.** en went from 7.08 to 1.15 u and er from 8.35 to 2.36 u:
  the body had been drawn 31 fu left of the font's.
  - bk (7.85 u) and br (5.52 / 5.63 u) are not fixed. b's exit and k's
    and r's entry frames are identical in every build.
  - With blend's L=b params swapped in, br gives 5.20 / 5.31, so its
    gap is the bound-limited fit. bk gives 8.49, so its gap is not the
    params alone.
- **Step 4, v5.4.**
  - `out12/cursive_v54_words.svg` (+ `.png`): a new words line, "be we
    shoe maze huge bye" and "ice jet even", holds every changed pair.
  - `out12/e_joins.svg`: the review sheet, with every pair into e and
    each final over the font, v5.3 dashed. Its numbers are in
    `work12/e_joins.txt`.
  - The template is byte-identical to `out11/cursive_v53.svg`, so
    out12 has none.
  - No SVG embeds an image. Crops were viewed.

Remains (NOTES residuals 1-10):
- oe at 5.7 u is the worst o entry. ee (6.9 u) and fe (18.8 u) are not
  addressed.
- br needs a refit off its bounds. For bk, check the reference cut near
  k's loop entry.
- y's final tail is 3.58 u off. b f p v o s w have no final tails.
- Rise or length for the exit cap is Levi's call.
- The titles still say v5.3. After a template round trip, rerun evar ->
  fitp -> tails.
- No v5.4 review PNG with the chart.
