# K1451: rp=gf's crossing-tie ticks, dashes and wedges (Claude agent stage)

The goal and Levi's bar are those of `docs/design/K1407_c1_bar.md` (read its first section): at a junction or
under-tail end the over thread's outline runs on unbroken, with no dot, stub, wedge, tick, notch or sliver.
Levi, 2026-11-17, on rp=gf live: "I still see plenty of border artifacts." rp=gf's junction spots being truly
correct is the most important thing in the project right now.

## Where it stands (master c5fc87d1, live)

- K1449's scan of `gfh=1` at the default fade reads 368 finds; **246 are crossing-tie wedges and dashes that the
  flag-off renderer draws too** (ledger K1451; Handoff K1449 in `docs/design/K1449_home_leftovers.md`, tools
  `.claude/probes/K1449/`, scan table `out/map2/table.txt` in worktree `agent-a02a2023ec92cd84f`).
- One of them on the live page, an ordinary load of `?3&xp=off&am=instant&rp=gf`: **a dashed dark tick across
  the top of the blue kink loop**, at every Crossing fade value, with and without `gfh=1`; today's renderer
  draws a clean thread there (`.claude/probes/K1458/live/zoom0_a.png`, `zoom_a.png`: today | gf | gf + gfh 1).
  The same crops show a small notch where the pink arm meets the blue thread (lower right).
- Their cause is composite()'s equal-depth tie blend over the zt window (Handoff c5 in
  `docs/design/K1407_c5_bar.md`: the smudges, what was tried and why each failed; its "Next": find what
  rp=outline keys on for an own piece whose arm is cut at the root, and port that as the tie's discriminator).
  A kink loop is one chain crossing itself, so start there: the tick sits where the loop's two passes tie.

## Do

1. Reproduce the kink-loop tick and the notch in the CPU mirror (`eval.ts`) and name the pieces and the term
   that draws each. Then classify K1449's 246 by cause (how many share the tick's, how many the notch's).
2. Fix the causes in `tables.ts` / `eval.ts` / the field evaluation in `gf_glsl.ts`, the largest class first,
   flag off and `gfh=1` alike where the code is shared.
3. Keep what holds: c5's 29 spots, the bar census, GPU = mirror.

## Done

1. The kink-loop tick and the notch are gone on an ordinary load of a local build of your branch, at fade 0,
   0.14 and 1.2, with and without `gfh=1`: a 4x sheet (today | master gf | your gf) under
   `.claude/probes/K1451/out/`. Look at every tile yourself next to today's.
2. K1449's scan at the default fade: the crossing-tie class at most half of 246, none of the other classes
   higher; ten of the fixed finds on a 4x sheet (master gf | your gf | rp=outline), looked at.
3. The bar census (`k1407c1_bar.ps1`, exceptions file) no category above master's; c5's 29 spots none worse;
   GPU census equal to the mirror. Stop preview servers before the GPU census and run no CPU census beside it.
4. If `tables.ts` changes: the new digest, the pins updated, pooled builds equal to cold (`k1362t2_digest`).
5. `hold.mjs` (`.claude/probes/K1450/`) 60/60 on `?3&xp=off&am=instant&rp=gf` and
   `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`. `npm test` green.
6. Bench last and alone (`k1362c1_bench.ps1`, perf lock: wait for it inside one blocking command, never
   overwrite another owner's lock): GPU and work p50 within 5% of c5fc87d1. If the machine is too loaded for a
   clean round, say so and report the round you got.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- Files: `tables.ts`, `eval.ts`, `gf_keys.ts`, the field evaluation in `gf_glsl.ts`, the census tools and
  `.claude/probes/K1451/`. Stay out of `gf_look.ts`, `gf_pass.ts`, `gf_app.ts`, `gf_reveal.ts`,
  `gf_explore.ts` (Muse batch 25 and the K1460 agent).
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5540-5559. Headed, real-time Chrome, never `--virtual-time-budget`.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files). Never push. Never edit
  LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Helpers run on sonnet for mechanical work (scans, sheets), with this stop rule.
- Own the technique; do not stop at the cause. Measure a discriminator in the CPU mirror and the census before
  it goes into src. For anything open at the stop line, report what you tried and why each attempt fell short.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone),
whichever comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP,
append `### Handoff K1451` here, commit, and report: what holds, the sheets' paths (each spot named fixed or
open), the numbers, a `Ledger items` list and K1451's handle fields.
