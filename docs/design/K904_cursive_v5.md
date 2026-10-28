# K904: cursive v5, fused entries and the high entry mode (agent brief)

Coordinator, 2026-10-27 11:40. One stage, opus, 2 h cap. Follows K902
(`K902_cursive_frames.md`, v4: its `## Handoff` and `## Results`).

## Why

v4 (`.claude/probes/K863/trace/out7/`, Drive `K863/cursive_v4.svg`) takes
every join frame by the walk rule and fuses a's entry onto its body. Levi
edits the template next, so the template's structure has to follow his
calls before he starts (`K863_trace.md` ## Levi's calls, binding):

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
