# K902: cursive v4, join frames on the connector side (agent brief)

Coordinator, 2026-10-27 09:50. One stage, opus, 2 h cap. Follows
K886 (`K886_cursive_v3.md`, v3).

## Why

K886's v3 (`.claude/probes/K863/trace/out6/`; Drive `K863/cursive_v3.svg`)
built the model Levi's K878 answers called for: 26 letter bodies, each with
an entry and an exit frame, and a quintic Hermite G2 connector for each
pair, calibrated per font connector class on 102 pairs. Every join is exact
G2, but 17 pairs in the test words are more than 4 u from the font's own
connector:

- 6 need a body variant that the font swaps in: ve 43.1, ze 73.9, ot 22.0,
  er 8.4, en 7.3 and ov 4.4 u. Whether Levi draws those variants or the
  generator handles them is his decision (ledger K901), not this stage's.
- 11 are the generator's: ma 14.3, la 11.1, ic 6.9, fo 6.6, po 6.3, wo 6.2,
  pp 6.1, ps 5.6, hi 5.1, og 4.8 and bo 4.4 u.

K886 found the cause of most of the 11 at its end (`NOTES.md`, "09:30
FINDING"). The frames were taken at the middle of the body/connector
overlap, inside the junction blob, so they carry the blob's own turn:

- Exit tangents point 14-61° below the start of the font's connector
  (frame vs the font over its first 4 fu: a 0/22, d −10/20, i 6/20, n 1/19,
  p −40/21°).
- d, o and p turn at a radius of 4-5 fu where the font's connector starts
  near 100 fu, and the entry frames of a (r 11 fu), c (17) and d (20) look
  the same.
- The connectors match these frames exactly, so they leave in the blob's
  direction and swing onto the font's within about 40 fu. 7 of the 11
  (ma, la, ic, po, pp, ps, og) touch one of these frames.

Levi edits the template next, and every frame on it is a tick he reads and
may move, so the frames must be right before he starts. The leads and tails
are the other large residuals: leads u 48.5 and z 27.8 u; tails b 24.2,
c 22.6, p 19.4, l 18.0, t 16.0 and s 14.1 u.

## Setup

- Everything is in `.claude/probes/K863/trace/` (untracked). Read
  `NOTES.md`'s `## v3` first (line 166), including "### Rerun commands
  (K886 v3)" at its end, then K886's brief for the model.
- v3's tools: `tools/trace_k886.py`, `bodies_k886.py` (the frames and cuts;
  the join-point rule is here), `k886lib.py`, `join_k886.py`,
  `template_k886.py`, `gen_k886.py` (ticks), `words_k886.py` (the sheet and
  `--from-svg`), `review_k886.py` and `work6/dbg/rerun_check.ps1`.
- Leave v1-v3 outputs as they are (`work4`-`work6`, `out4`-`out6`). Write v4
  to `work7/` and `out7/`, and new tools as `tools/*_k902.py` (copies of
  v3's, so v3 still reruns). v4 may reuse `work6/trace/traced.json`; the
  tracer does not change.
- The font and `OFL.txt` are in `font/`, the venv in `venv/`. Run Python
  with the venv's interpreter and `-I`, scripts from `tools/`, data paths as
  arguments.
- The chart (`ref/chart.jpg`) is for review sheets only: never commit,
  upload alone or ship it.
- Inkscape: `C:\Program Files\Inkscape\bin\inkscape.com`
  (`inkscape.exe` returns before the PNG exists).
- View images as small crops (1000 px or less, cut by script into
  `work7/dbg/`), never whole sheets. Keep `NOTES.md` current under a new
  `## v4` heading.

## Order

1. **Frames on the connector side.** In `bodies_k902.py`, take each join
   frame where the connector leaves the junction, not mid-overlap. The
   candidates are the overlap's far end on the connector's side, or a fit
   over the connector's first 15-40 fu. Choose by which lands closest to
   the font connector's start over the 102 calibration pairs, and say why.
   Re-cut each body at its new join point.
   - Cusp-start entries (a c d g i j o p q r s t u w y) keep their cusp
     rule. Check that a, c and d's entry radii come out near the font's.
   - b, o, v and w keep their exits at the font's junction (y 440-447 fu)
     by default, behind a switch (`--high-exit junction|cusp`, cusp being
     the top cusp near y 491 fu). Likewise the guides: outline heights by
     default (244.6 / −124.6 u), `--guides centreline` for 240 / −120 u.
     Levi's K901 answers then become a rerun.
   - Report each letter's frames against the font reference (tangent
     angle, curvature radius), v3 and v4.
2. **Rebuild as v4.** Rerun K886's steps 2-6 on the new bodies: the
   calibration, `out7/cursive_v4.svg`, `out7/cursive_v4_words.png`, step
   5's `--from-svg` rerun (tested as v3's was: an unedited copy within
   0.05 u, a moved letter re-derives its frames) and
   `out7/cursive_v4_review.png`.
3. **Generator pairs still over 4 u** (fo, wo, hi and bo are the ones the
   finding does not explain). Find each cause. Where it is the class's
   shared parameters, give the pair its own set (split the class by left
   letter, as v3 split by right letter where that helped).
4. **If time: leads and tails.** v3 notes that the font's word-initial and
   word-final bodies differ from its medial ones (.ini: z 30.6 fu, e 51.2;
   .fin: b 26.6, f 22.6, l 37.3 fu). Say which leads and tails are the
   generator's and fix those, or say what the rest would need (a body
   variant, as in K901).
5. **The review sheet's notes.** v3's review footer reused v2's
   font-vs-chart notes (`work/diffs.txt`), whose p line describes ss01's
   looped p, not `p.jmc`. Write v4's notes as `work7/diffs.txt` and use
   them in v4's review sheet.

Write every rerun command at the end of `NOTES.md` under "### Rerun
commands (K902 v4)", and check them with `work7/dbg/rerun_check.ps1` as v3
did.

## Checks (report the numbers, v3 and v4)

- Frames against the font connector's start, per letter and end: tangent
  angle and curvature radius.
- Per-class largest distance in the calibration; the test-word pairs over
  4 u, split into body variants and generator.
- G2 at both ends of every connector, lead-in and tail: gap, angle and the
  largest curvature jump.
- Bodies: at most 1 u from the centre of the font's wght-100 stroke.
- Crossings: every body crossing is a true X (v3: 12 font X's, 9 inside
  bodies, 3 at joins: b, e and z). In the test words, every
  connector-body crossing (v3: 72, 12 at 20° or more) and whether the font
  has it too.
- Template: every body and its context inside its cell; the guides; open,
  stroked, unfilled paths with v3's layer names and ids; Inkscape exports
  with exit 0 and empty stderr; the tick round trip.
- Pen order and direction unchanged from v3.
- Leads and tails per letter.

## Rules

- Stop rule: run `Get-Date` at the start and at every milestone. Stop when
  steps 1-5 are done or 2 h after the start, whichever comes first. Steps 1
  and 2 come first. A compaction is not a stop: after one, re-read this
  brief and `NOTES.md`'s `## v4` before going on.
- No commits, no Drive uploads (the coordinator uploads v4's SVG), no npm
  or repo dependencies, and no edits to tracked files, except a
  `## Handoff` appended to this brief if the stage stops unfinished (leave
  it uncommitted, for the coordinator).
- Never touch processes you did not start, and never use Levi's Chrome
  profile.
- Use PowerShell for local commands. Read repo code through the shell
  (`Select-String`, `Get-Content | Select-Object`).
- Helpers only if needed: `model: sonnet`, a 1 h cap and these rules.
- The final report gives what was built, the frame rule chosen and why,
  the check numbers for v3 and v4, the pairs still over 4 u and the fix for
  each, the rerun commands, and a `Ledger items` list (follow-ups,
  residuals, decisions for Levi).
