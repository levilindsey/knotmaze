# K879: cursive trace v2, true crossings and answer-ready options (agent brief)

A stage of K863. Coordinator: the knotmaze Claude session that holds K879's
handle. Written 2026-10-26. Opus, 2 h.

## Why

The trace stage (`K863_trace.md`) delivered v1 (Drive
`K863/cursive_traced_v1.svg`). Its coverage check failed where a letter
crosses itself: f, k, q and the word "and" (worst excess 4.147 u, at q;
25,627 failing pixels; limit 1 u). The skeleton of an oblique X is two Y
junctions joined by a short bridge, so both passes share the bridge and the
traced path bends there instead of crossing. The letters become knot threads
after Levi edits them, and a thread crossing must be a true X. Levi edits v2,
so v2 has to be right before he starts.

Levi is also answering three questions (K878): p's descender (the font's loop
or the chart's retraced stem), the exits (rising to the next letter at the
x-height as traced, or short like the chart), and the size (ascenders pass
the template's ascender line; m is wider than its cell). This stage turns each
answer into a tracer option, so v2 is one rerun once he answers.

## Setup

- Everything lives in `.claude/probes/K863/trace/` (untracked). Read
  `NOTES.md` first: v1's decisions, tools and log. v1 shipped from
  `tools/trace_tool_v2.py` in hybrid mode (`work4/`, `out4/`, copied to
  `out/`); its waypoint routes are in `tools/trace_tool.py` `ROUTES`. The font
  and `OFL.txt` are in `font/`, the venv (PIL) in `venv/`.
- Leave v1's outputs (`out/`, `work4/`, `out4/`) as they are. Write v2 to new
  directories (`work5/`, `out5/`).
- Run Python with the venv's interpreter and `-I`, scripts from `tools/`,
  data paths as arguments.
- The chart (`ref/chart.jpg`) is for the review sheet only: never commit,
  upload alone or ship it.
- View images as small crops (1000 px or less, cut by script), never whole
  sheets. Keep `NOTES.md` current under a new `## v2` heading.

## Order

1. **Crossing repair.** Find each place where two passes of one unit share a
   bridge between two skeleton junctions (the X collapsed into two Ys), and
   route each pass straight through instead: drop the bridge, join each
   incoming branch to the outgoing branch that continues it (the smallest
   turn), and pass both through one crossing point with tangents that match
   the branches. The two passes must then cross once, transversally, at an
   angle close to the font's. Fix f, k, q and "and", and any other unit where
   the pattern appears. Report each repaired crossing: unit, position,
   crossing angle, and the coverage excess before and after.
2. **Options**, as command-line flags whose defaults reproduce v1's choices:
   - `--xheight <u>` (default 120). Report the ascender top and m's width at
     120, and the largest x-height at which every unit fits its cell and stays
     under the ascender line (a suggestion for Levi).
   - `--exits full|short`. `full` is v1: the exit runs to the next letter's
     start at the x-height. `short` ends it like the chart's isolated letters;
     choose the cut (for example where the exit reaches half the x-height),
     say why, and show both on the review sheet. Entries stay as they are.
   - p: find out whether a contextual alternate or a stylistic set (ss01-07,
     ss19, ss20) draws p with a retraced stem instead of a loop. If one does,
     add `--p loop|stem`. If none does, say so, and don't synthesize one;
     Levi draws it by hand.
3. **Stylistic-set survey** (for K880 and the p question): which lowercase
   letters each set and each contextual alternate changes, as a short table,
   plus a small sheet of the changed glyphs if time allows.
4. **v2 at the defaults** (v1's choices plus the repair):
   `out5/cursive_traced_v2.svg`, `out5/cursive_traced_v2_review.png` (v1's
   layout, with the repaired crossings marked), and a sheet of each repaired
   crossing at 6x, before and after.
5. **The rerun command** for each combination of the options, written at the
   end of `NOTES.md` and in your report, so the coordinator can produce v2
   from Levi's answers without you.

## Checks (report the numbers)

- Fidelity: at most 1 u from the centre of the font's wght-100 stroke.
- Coverage: at most 1 u excess on all 27 units, or each remaining failure
  explained.
- Crossings: the number of self-intersections in each unit's traced paths
  equals the number of crossings in the font's glyph, and each is
  transversal.
- Format: open, stroked, unfilled paths; the template's layers and ids
  intact; Inkscape (`C:\Program Files\Inkscape\bin\inkscape.exe`) exports
  the SVG to PNG without errors.
- Pen order, stroke count and direction per unit unchanged from v1 (compare
  with `tools/compare_tool.py`).

## Rules

- Stop rule: run `Get-Date` at the start and at every milestone. Stop when
  steps 1-5 are done or 2 h after the start, whichever comes first. A
  compaction is not a stop: after one, re-read this brief and `NOTES.md`
  before going on.
- No commits, no Drive uploads (the coordinator uploads v2 after Levi
  answers), no npm or repo dependencies, and no edits to tracked files,
  except a `## Handoff` appended to this brief if the stage stops unfinished
  (leave it uncommitted, for the coordinator).
- Never touch processes you did not start, and never use Levi's Chrome
  profile.
- PowerShell for local commands; read repo code through the shell
  (`Select-String`, `Get-Content | Select-Object`).
- Your final report gives what was built, the check numbers, the repaired
  crossings, the options and what each does, the survey, the p finding, the
  rerun commands, then a `Ledger items` list (follow-ups, residuals,
  decisions for Levi).
