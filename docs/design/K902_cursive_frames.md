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

## Handoff

K902 stage agent, 2026-10-27 11:21 (cap 11:48). Uncommitted, for the
coordinator. Steps 1, 2, 3 and 5 are done. Step 4 is diagnosed but not
built.

From the coordinator's 10:46 message:
- Item 3 is built: a's fused entry, `--fuse-entry`.
- Item 4 is measured: r after a high exit.
- Items 1 and 2 are a design in the report.

Everything is untracked, under `.claude/probes/K863/trace/`:
- `NOTES.md`, `## v4`: status entries 10:11 to 11:19.
- Its "### Rerun commands (K902 v4)": `work7/dbg/rerun_check.ps1` checked
  them at 11:18. All 12 lines exit 0 and all 11 outputs are byte-identical.
- `tools/*_k902.py`, `work7/` and `out7/`.

Step 4, still to build:
- **Leads** (NOTES 11:19). The lead reference in `join_k902.py` takes the
  .ini glyph's lowest-left free end.
  - a, c, d, i, p, q, t, u and x have no lead-in stroke. Their reference is
    therefore the body run backwards (u 52 u; the 88 u word-start leads of
    a, d and q).
  - m and n do have a lead-in, from (17, 376), but the `y < 150` filter
    skips it.
  - Fix: use a free end left of the entry whose path leaves the body; if
    there is none, give the letter no lead-in. Then refit.
- **Tails** (NOTES 10:44). The .fin reference runs back through the body
  for b, c, d, f, l, p, s and t (b 138 u).
  - Fix: use the free end whose path leaves along the exit tangent; if
    there is none, give the letter no tail. Then refit.
- The word-start and word-end bodies (.ini: e, z; .fin: b, f, l) need a
  bent body (K901).

Then:
- per-class o and b exit frames (oh, ok, or, os, br);
- an angle-aware walk for f (fo);
- the two entry modes (design in the report).

## Results (coordinator's copy of the final report, 2026-10-27 11:27)

The data is untracked under `.claude/probes/K863/trace/` (`NOTES.md`
## v4, `work7/`, `out7/`); the template is on Drive as `K863/cursive_v4.svg`.

**Frame rule: walk.** From the overlap's far end on the connector's side,
walk along the letter's trace until within 1.5 fu of the font connector's
centreline, at most 40 fu. Scored over 121 pair ends against each pair's
own font connector start (angle mean / median / p90 / max, deg; radius
ratio as mean |log|):

| candidate | angle | radius |
|---|---|---|
| **walk** | **9.70 / 4.66 / 17.44 / 106.7** | 0.52 |
| mid (v3) | 29.84 / 22.99 / 58.19 / 131.2 | 0.97 |
| far end | 10.69 / 4.66 / 28.24 / 112.1 | 0.50 |
| fit over 15 / 30 / 40 fu | mean 10.51 / 10.34 / 10.25, p90 27.07 / 25.23 / 24.05 | 0.45 / 0.41 / 0.40 |

The walk has the best mean and p90, and its point lies on the connector
where the font's starts; the fits match curvature slightly better, but
their points lie off the glyph. Cusp entries keep the cusp rule with a
quadratic arrival fitted over 25 fu (calibration 3.020 -> 2.924 u). c's
and d's entry radii come out near the font's; a's hook does not, so a got
the fused entry.

**Checks, v3 -> v4.**
- Smooth-end frames (37 ends): angle mean / median / p90 / max 22.1 / 22.8
  / 42.7 / 63.5 -> 4.7 / 2.9 / 11.1 / 29.5 deg (f's exit); radius ratio
  0.95 -> 0.42. Worst after f: a's entry 22.4, k's entry 17.7, o's exit
  12.7 deg.
- Calibration (94 non-variant pairs): mean 3.218 -> 2.175 u, over 4 u 23
  -> 10, max 14.29 -> 10.85 u; all 102 pairs 4.990 -> 3.701 u. 13 of 17
  per-left splits kept.
- Test-word pairs over 4 u: 22 -> 10. Generator: og 7.2, fo 4.7, br 4.6
  (ma, la, ic, po, wo, pp, ps, hi and bo are now under 4 u; og rose from
  4.8, br is new). Body variants: ve 44.7 (x3), ze 66.9, ot 8.0, er 8.4,
  en 7.1.
- G2 at every connector, lead-in and tail: gap 7.3e-12 fu, angle 1.2e-6
  deg, curvature jump 2.1e-11 /fu at most.
- Bodies within 0.675 u (k) of the font's centreline; pen order and
  direction unchanged.
- All 12 font X's lie inside a body (v3: 9), each a true X. Test words: 72
  connector-body crossings (v3: 72), 14 at 20 deg or more (v3: 13); og's
  two are the font's too, ot's (36 deg) is not, and the other 11 are leads
  and tails (step 4's reference bugs).
- Template: 466 ids, 64 ticks, 153 open stroked unfilled paths, v3's layers
  and ids, every body inside its cell (closest 26.1 u); the round trip moves
  bodies 0.001 u and tangents 0.0106 deg; Inkscape exits 0, stderr empty.
  Step 5: an unedited copy comes back within 0.010 u; moving n 6 u up
  re-derives its frames (an 5.9, nd 8.1, ni 6.4 u).
- Leads and tails, against references step 4 shows are wrong: leads a
  61.5, u 52.1, z 25.3 u; tails b 138.2, p 35.8, c 26.4 u.

**Pairs still over 4 u (calibration): cause, fix.**
- oh, ok (10.9 u): o's shared high exit feeds the looped connector; h's
  after-o walk falls short and k's is rejected. Fix: o's exit frames per
  class, plus h's and k's after-o entries.
- og, oq (7.2, 7.0): the font's connector merges into g's and q's body and
  retraces it. Fix: end the connector at the merge; the body carries the
  retrace.
- or, os (6.5, 4.8): o's shared high exit. Fix: per class (or also
  depends on the r answer, K901).
- fo (4.6): f's exit frame is 29.5 deg off the font. Fix: a walk that also
  checks the tangent.
- br (4.6): b's shared exit at the junction. Fix: per class
  (`--high-exit cusp` gives 3.8).
- ng, nq (4.4, 4.2): the entry hook, 42-52 fu before the cusp. Fix: end
  the connector at the hook, or fuse g and q (untested).

**The fused entry** (built for a; `--fuse-entry a|<letters>|none`).
Entry-to-body distance above the junction, after n, max / mean u: a 16.2
/ 7.78 (v3) -> 0.3 / 0.12 (font 2.5); unfused in v4: c 7.0 / 1.46 (font
4.1), d 4.8 / 2.10 (2.8), g 5.7 / 2.36 (2.9), o 8.3 / 1.52 (6.7), q 5.6 /
2.49 (2.5). a's entry connector ends at the font's junction, 47.5 u up,
and a's body runs from there to the cusp, so the entry and the start of
the body are one thread. Word-start lead-ins sit on the body for a (0.3
u), c (1.5) and o (1.4), but 88 u off for d and q (step 4's lead bug).
Crop: `work7/dbg/fuse_check.png`.

**r after a high exit** (`work7/dbg/r_after_high.png`, `.txt`). The font
swaps in no contextual r for or, br, vr or wr (all `r.ful.med`). Its
connector dips 49.7 u below the x-height after o and 51.6 u after b, v and
w, and ends about 7.8 u below it; r's point stands 13.3-13.6 u above the
connector's end (after n: 17.0) and 55-57 u above its lowest point. The
font dips and keeps its standard r.

**Variants** (`work7/dbg/variants.txt`). Only e bends: after o, b, v and
w the font's e differs over 93% of the body, by up to 28.9 u; after z,
over 88%, by up to 10.0 u. t's variant differs over 2%, by 1.1 u (no bend).
m, n and v's variants share the standard outline; only the connector
differs.

**Design for the two entry modes (K904).**
- Body bend: only e. Bend the loop, not the exit stretch (so the exit
  frame stays), toward the font's after-o e (after o, b, v, w) and its
  after-z e. No other letter bends.
- High-entry frame: shape o-X-n and b-X-n and apply the walk against the
  variant body where the font has one, the standard body elsewhere. One
  high frame per letter when the after-o and after-b frames agree,
  otherwise one per class. For fused letters, the high junction is where
  the after-high connector merges into the shared stretch. After o today:
  c, o and s reuse their after-n frame; d, g and q retrace; i, j, p, u, w
  and y use the cusp; r uses its point; a, b, f, h, l, x and z get a smooth
  frame; h's falls short and k's is rejected.
- Template: the 12 after-o entry ticks become the high-entry frames; mark
  each high junction and highlight the fused stretch; put the font's oe,
  ot and oa in the context layer; step 5 reads the high ticks like the low
  ones. K902 proposed the bent e as a second editable body; Levi's call
  (2026-10-27) is that the generator makes every variant, so it is
  generated instead.
