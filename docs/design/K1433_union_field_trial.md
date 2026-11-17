# K1433: is rp=gf's outline built the right way? A one-day trial (Claude agent stage, probes only)

## Why

Levi, 2026-11-16: "Taking a step back: do we have the right overall design and approach? ... We've essentially
spent weeks going nowhere on this (though, it seems like our latest design might be better)." He approved this
trial ("go").

The bar is Levi's (`docs/design/K1407_c1_bar.md`, first section): at a junction or under-tail end, the over
thread's outline runs on unbroken, with no dot, stub, wedge, tick, notch or sliver. Form B is not the bar.

The coordinator's reading, to test and not to assume:
- `eval.ts` step 4 assembles the outline from pieces: each member's side foot and each fillet's arc is a term, and
  burial rules hide the parts under a neighbour. Every gap between two rules shows as a notch, wedge or stub, and
  each fix is another rule (c3's vertex cap, c4's fillBur ratio). The mesh renderer failed the same way
  (`joinery.ts`).
- Steps 2, 3 and 5 decide membership and over/under per pixel by blending (ramps, the equal-depth tie). Spot 6,
  spot 16 and the smudges come from there (Handoffs c3 and c4).
- The census (`k1407c1_bar.ps1`) counts differences from form B, with 25 exceptions. Nothing tests the bar itself.

K1407 c5 is running on `eval.ts` and `gf_glsl.ts` in another worktree, and Muse works in the main checkout.
**You change no file under `src/` or `test/`.** Everything you write goes under `.claude/probes/K1433/` and this
brief. Import from `src/` freely; subclass or copy `GfEval` into the probe directory to change it.

## Part 1: a direct test of the bar (do this first; it judges part 2)

Build a probe that scores one rendered scene with no reference image. From the CPU evaluator's per-pixel output
(ink, cov, label, at 4 px per aa or finer), find:
- **breaks**: stretches of a covered surface's exposed edge where the outline's ink falls well below the ideal
  band's;
- **stray ink**: ink farther than the band's width plus aa from any exposed edge, inside a fill or on paper.

How you define "exposed edge" and the thresholds is yours. It is validated, not argued:
1. It flags each known open spot on master: spot 16, spot 6, the two smudges (`K1407_c5_bar.md` lists them).
2. It flags the def seam notches on d547dab6 and not on master (c4 fixed them), and the muse_hash eye on
   13365909 and not on d547dab6 (c3 fixed it).
3. On master it does not flag the 23 spots c2 fixed (`.claude/probes/K1407/out/c4/spots.txt` holds all 29).
4. Run it over the 12 census scenes on master. Report the count, and look at a sample of 20 finds at 4x: how many
   are real misses of the bar by eye. State that precision.

## Part 2: the outline as the contour of one field per surface

In a probe copy of the evaluator, keep steps 1, 2, 3 and 5 as they are and replace step 4:
- Per surface, compute ONE signed distance to the union of its members' tubes and its corner fills.
- Coverage is a step on that distance, and the outline's ink is the band at its edge. No per-piece outline terms,
  no burial, no vertex cap, no fillBur.
- The union's inside distance is not the min of the members' at concave corners. Choose how to handle it (a smooth
  union, the fillet shapes as members of the union, an exact concave-vertex term) and say what each choice does to
  the corner's shape. A corner shape is a look that Levi judges: show it, don't pick it by a metric.

Then compare master's evaluator and yours:
1. The 29 spots at 4x: master gf | union | rp=outline, plus today's fill where c4 captured it. Name each spot as
   better, the same or worse by eye.
2. Part 1's test on the 12 scenes: breaks and stray ink, both evaluators.
3. A cost proxy per pixel (terms evaluated, loop trips) on two scenes, both evaluators.
4. Which of master's rules the union makes unnecessary, by name, and which open spots it does not touch.

## Part 3: grouping and over/under at table time (written assessment only)

For spot 6, spot 16 and the two smudges, say what per-pixel decision causes each (the handoffs have the arms and
keys). Then say whether the knot's graph (junction, crossing and end nodes; `tables.ts` builds from it) could
decide that grouping and order when the tables are built, what would still need a per-pixel blend (sliding
crossings, the cap ramps), and what it would cost to try. No code.

## Done

1. Part 1's probe, its validation table (the four checks above), and its numbers on master.
2. Part 2's sheets, numbers and rule list.
3. Part 3's assessment.
4. A recommendation at the top of the handoff, in plain words: replace step 4 with the union, keep patching rules,
   or a mix; what Levi would have to judge by eye (with the picture paths); and the first two stages you would
   brief next.

## How to work

- Start with `git merge --ff-only origin/master` in your worktree and `Get-Date`.
- Use PowerShell. Read code through the shell; the Read tool only just before an Edit.
- CPU only: no browser is needed. If you do render in one, use ports 5520-5539, never `--virtual-time-budget`,
  and never touch the phone.
- For a run of more than a few minutes on all cores, take `$env:TEMP\claude-perf.lock` (one line: owner, start,
  what), wait inside one blocking command if it is held, and delete it after.
- Commit WIP at every milestone, broken or not. Never push. Never edit LEDGER.md. Never use bare `git stash`.
- Helpers run on sonnet for mechanical work, with this stop rule.
- Report what you measured apart from what you infer.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone), whichever
comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`### Handoff K1433` here, commit, and report. End the report with the recommendation, the sheet paths, the
numbers, a `Ledger items` list and K1433's handle fields.
