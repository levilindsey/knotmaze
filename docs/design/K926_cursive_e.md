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
