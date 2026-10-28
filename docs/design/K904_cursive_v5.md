# K904: cursive v5, fused entries and the high entry mode (agent brief)

Coordinator, 2026-10-27 11:40. One stage, opus, 2 h cap. Follows K902
(`K902_cursive_frames.md`, v4: its `## Handoff` and `## Results`).

## Why

v4 (`.claude/probes/K863/trace/out7/`, Drive `K863/cursive_v4.svg`) takes
every join frame by the walk rule and fuses a's entry onto its body. Levi
edits the template next, so the template's structure has to follow Levi's
calls before Levi starts (`K863_trace.md` ## Levi's calls, binding):

- a, c, d, g, o and q get a junction where the entry meets the body, about
  halfway between the baseline and the x-height (about 60 u). Above it the
  entry and the start of the body are one fused thread up to the cusp. v4
  fuses only a, and at the font's junction (47.5 u up).
- Each letter has two entry modes, from the baseline and from high up
  (after b, o, v and w). Keeping G2 may bend the start of the next body.
- The generator makes every variant (e after o, b, v, w and z; t, m, n, v
  after o). Levi draws none.
- Still open (ledger K901): whether r dips after a high exit, as the font
  does, or goes straight in.

v4's leads and tails also follow wrong references (b's tail is 138 u off),
which shows on the words sheet Levi reads.

## Setup

- Everything is in `.claude/probes/K863/trace/` (untracked). Read
  `NOTES.md`'s `## v4`, including "### Rerun commands (K902 v4)", then
  K902's brief from `## Handoff` on.
- v4's tools are `tools/*_k902.py`. Write v5's as `tools/*_k904.py` (copies,
  so v4 still reruns), and v5's outputs to `work8/` and `out8/`. Leave
  `work4`-`work7` and `out4`-`out7` as they are. Reuse
  `work6/trace/traced.json`; the tracer does not change.
- The font, `OFL.txt` and the venv are as in K902. Run Python with the
  venv's interpreter and `-I`, scripts from `tools/`, data paths as
  arguments. Inkscape: `C:\Program Files\Inkscape\bin\inkscape.com`.
- The chart (`ref/chart.jpg`) is for review sheets only: never commit,
  upload alone or ship it, and keep it out of every SVG.
- View images as small crops (1000 px or less, cut by script into
  `work8/dbg/`), never whole sheets. Keep `NOTES.md` current under a new
  `## v5` heading.

## Order

1. **Fuse all six** (a, c, d, g, o, q). The junction defaults to Levi's
   height (about 60 u, halfway between the baseline and the x-height),
   with a switch for the font's own junction (a's is at 47.5 u). Above it
   the entry and the body are one thread from the junction to the cusp;
   the template draws that stretch once, as part of the body. Report each
   letter's junction height and K902's entry-to-body table (max / mean u
   above the junction, against the font's). Re-measure og, oq, ng and nq,
   which fusing g and q may fix (K902: "or fuse g and q").
2. **The high entry**, from K902's design (`## Results`, "Design for the
   two entry modes"): a high-entry frame per letter by the walk, one per
   letter where the after-o and after-b frames agree, otherwise one per
   class; for the fused letters, the high junction where the after-high
   connector merges into the fused stretch; h's and k's after-o entries
   fixed (one falls short, one is rejected). Template: high-entry ticks,
   each high junction marked, the fused stretch highlighted, the font's
   oe, ot and oa in the context layer; step 5 (`--from-svg`) reads the
   high ticks like the low ones.
3. **Rebuild as v5** with K902's checks: `out8/cursive_v5.svg`,
   `out8/cursive_v5_words.png` plus the same sheet as
   `out8/cursive_v5_words.svg` (no chart in it), the `--from-svg` rerun,
   and `out8/cursive_v5_review.png`. Add `out8/r_after_high.svg`: or, br,
   vr and wr, with r dipping as the font does and with r going straight in
   (a switch, the font's dip by default), for Levi's K901 answer.
4. **Leads and tails** (K902's handoff, step 4): a lead from a free end
   left of the entry whose path leaves the body, else no lead-in; a tail
   from the free end that leaves along the exit tangent, else no tail;
   then refit and rebuild.
5. **The generated e**: after o, b, v and w, and after z, bend the loop
   toward the font's variant and keep the exit stretch (and its frame)
   fixed. Report the distance to the font's variant over the body, and
   confirm t, m, n and v need no bend.

Steps 1-3 come first. Write every rerun command at the end of `NOTES.md`
under "### Rerun commands (K904 v5)" and check them with
`work8/dbg/rerun_check.ps1`, which must stop at the next `###` heading
(v3's checker ran on into v4's commands, ledger K913).

## Checks (report the numbers, v4 and v5)

- K902's checks: frames against the font connector's start, the
  per-class largest calibration distance, the test-word pairs over 4 u
  (body variants and generator), G2 at both ends of every connector,
  lead-in and tail, bodies within 1 u of the font's centreline, crossings,
  the template checks, pen order and direction.
- The six junctions: height, entry-to-body distance above them.
- The high entries: frames against the font's after-o and after-b
  connectors; the test-word pairs after b, o, v and w.
- Leads and tails per letter.

## Rules

- Stop rule: run `Get-Date` at the start and at every milestone. Stop
  when steps 1-5 are done or 2 h after the start, whichever comes first. A
  compaction is not a stop: after one, re-read this brief and `NOTES.md`'s
  `## v5` before going on.
- No commits, no Drive uploads (the coordinator uploads the SVGs), no npm
  or repo dependencies, and no edits to tracked files, except a
  `## Handoff` appended to this brief if the stage stops unfinished (leave
  it uncommitted, for the coordinator).
- Never touch processes you did not start, and never use Levi's Chrome
  profile.
- Use PowerShell for local commands. Read repo code through the shell
  (`Select-String`, `Get-Content | Select-Object`).
- Helpers only if needed: `model: sonnet`, a 1 h cap and these rules.
- The final report gives what was built, the check numbers for v4 and v5,
  the pairs still over 4 u with a cause for each, the rerun commands, and
  a `Ledger items` list (follow-ups, residuals, decisions for Levi).

## Redirect (2026-10-27 11:55)

Levi on v4: "a discontinuous bump at the junction point where overstroking
starts/stops", on the right side of a, d, g, q, u and y and in h, m, n, w,
p and others; "I'm going to want our eventual letter strokes/threads to
look smooth and continuous" (binding, `K863_trace.md`). On a it sits about
62 u up, where the bowl's climb meets the stem; on n about 55 u up, where
the arch leaves the retraced stem. Coordinator's guess, not verified: the
traced centreline of the ink union bends into the crotch where the passes
part. After steps 1-2 and before the v5 rebuild:

1. List every split (where an overstroked, retraced or fused, stretch
   starts or stops) in all 26 letters, the six new fused junctions
   included, and diagnose the bump from the data.
2. The overstroked stretch is one smooth curve, drawn once; each pass
   leaves it tangentially with continuous curvature (G2), with no detour
   toward the skeleton's junction point. Fit near a split from each pass's
   own centreline away from it, inside the font's ink. Exempt split
   regions from the 1 u centreline check and report the move there.
3. A check per split: tangent and curvature jumps, and the peak curvature
   within about 20 u against the letter's curvature away from splits; v4
   and v5, split by split.

Then step 3. Steps 4-5 only as time allows: v5 must not carry the bumps.

## Handoff (K904 stage agent, 2026-10-27 13:10)

Stopped before the 13:40 cap: steps 1-3 and the redirect are done, steps 4 and 5 not started. All of it is in
the untracked `.claude/probes/K863/trace/`: `NOTES.md` `## v5` (status, `### Results (v5)`, `### Rerun commands
(K904 v5)`), the tools `tools/*_k904.py` (plus `split_k904.py`, the split smoothing), outputs in `work8/` and
`out8/`, read-only checks in `work8/dbg/` (`q_splits.py`, `q_cmp45.py`, `q_hs.py`, `q_grpmax.py`, `q_ofset.py`,
`q_fairref.py`). `work8/dbg/rerun_check.ps1` runs the rerun section verbatim; last run 13:04-13:08: 15 lines,
every exit 0, all 15 outputs byte-identical.

- Built: `out8/cursive_v5.svg` (the template), `out8/cursive_v5_words.png` and `.svg`,
  `out8/cursive_v5_review.png`, `out8/r_after_high.svg`.
- Steps 1-2: a, c, d, g, o, q fused at 60 u (`--fuse-junction font` puts each at the font's own, 47.5-58.1 u);
  one high entry per letter, or one per class (after o; after b, v, w) where the two differ.
- Redirect: the bump is the ink union's centreline bending into the crotch at the skeleton's junction node (the
  guess, confirmed). Every split is now a quintic G2 blend between the passes' own frames, inside the ink. The
  peak-curvature ratio was median 1.9, max 120.5 in v4 (26 of 52 splits over 2) and is median 0.2, max 4.8 in v5
  (8 of 51). The blends move the body up to 3.73 u off the trace inside the windows, 0.069 u outside.

Next, in order:
1. The high-smooth regression, where v5 is worse than v4 (NOTES Results, the last bullet). Multi-start the class
   fits in `join_k904.py`: of, ol and ob read 3.9 u, and v4's sets give 2.0-2.4 u on the same frames. Fit the
   variant pairs after a high exit on their own: on 4.2, wn 5.1, om 3.1, bn 4.7 u, per-pair best 0.6-1.5 u. Then
   rerun from the join down and run `rerun_check.ps1`.
2. Count the retraced stretch in the pair measure of a fused entry: eo reads 27.6 u, and 5.8 u with the stretch
   credited (`q_fairref.py`).
3. Step 4, leads and tails: crossings of 20 deg or more went 14 -> 17 (leads into fused a, d, q cross their
   bowls; tails after s, d, x; ot at 34 deg).
4. Step 5, the generated e: ze 66.9, oe 53.7, be 51.5, ve 51.3, er 8.4 and en 7.1 u are the font's body variants
   of e (after z, o, b, v), which only a generated e can match.

Decisions for Levi:
- eo: the font's e-to-o connector merges into o's up pass near 86 u, above the 60 u junction (5.8 u apart with
  the retrace credited). One junction height for every entry, or a higher one after e?
- c's fused entry arrives 19.0 deg and 4.47 u off the font's up pass at 60 u (d 12.6 deg / 3.20 u, g 9.5 deg /
  2.90 u); c's own junction would be 58.1 u.
- r after a high exit (K901): dip (the default, within 5.2-6.5 u of the font's) or straight in (`--r-straight`).
