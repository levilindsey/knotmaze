# K1482 stage 4: rp=gf's border faults on Levi's link, notches, dots, ticks, breaks (Claude agent stage)

Read `### Handoff K1482 s3` in `docs/design/K1482_s3_borders.md` and `### Handoff K1482 s2` in
`docs/design/K1482_s2_end_caps.md` whole, and the bar in `docs/design/K1482_levi_link_borders.md` (Levi's
approved look: at junctions and under-tail ends the over thread's outline runs on unbroken, with no dot, stub,
wedge, tick, notch, sliver, break or stray dash; gf's border look itself stays as it is). Stage 3 (merged
3b524da2, fix 059b5a04: the tip sink tapers over the tail's last half width) took link A's sweep from 54 to 46
faulted sites of 327.

**The scoreboard is the sweep**: link A (`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`) at rest, border
look, 327 sites, faulted count by your own eyes on the 4x tiles. Master: 46 (wedge 11, notch 9, sliver 7,
dot 6, tick 5, dash 3, stub 3, break 2; `.claude/probes/K1482/out/s3/classes_tip.txt`). Report that number on
your tip.

## Do, in this order

0. **A card for Levi, first, within 20 minutes** (commit it, then carry on): stage 3 found that the wedge
   sites (j15 j50 j82 j143 j158 t23e t59s t73e t84e) and four sliver sites (j95 j147 t43s t56s) are two
   outlines converging at a sharp V: the ink runs together into a dark wedge, or leaves a light sliver under a
   pixel wide between them. One picture, `.claude/probes/K1482/out/s4/card_sharp_v.png`: six of those sites at
   4x on master, each labelled, the wedge or sliver circled. No other columns, no numbers. Levi decides
   whether that is a fault; until he does, leave those sites alone.
1. **Notch** (9: j4 j14 j41 j47 j59 and the rest in `classes_tip.txt`). Find what draws each (the CPU mirror's
   winning term at those pixels, `eval.ts`), group them by cause, make a count that fails on master for the
   largest group, fix it; then the next group.
2. **Dot (6), tick (5), break (2), dash (3)** and t81s's step, the same way, the largest shared cause first.

Not yours: K1477's stub past a crossing (j81, j138, t70s; Muse run 26H), j71's seam shape and the tail that
stops just short of the thread it meets (looks waiting on Levi), the sharp-V sites of item 0.

## Done

- Item 0's card.
- For each cause fixed: the cause in one sentence, its number failing on master and passing on your tip, and
  4x tiles master | tip | diff at every site whose screen changed, each looked at and named fixed, same as
  master or open. A fix whose tiles do not look fixed is not one. No site clean on master turns faulty.
- The sweep's faulted count on your tip, by class.
- The K1436 bar with `STRICT=1` (`pwsh -NoProfile -File .claude/probes/K1436/k1436_bar.ps1 -Ref <tip> -Base
  3b524da2 -HomeFlag 1 -Scenes ring,def -Port <p> -Tag k1482s4`): no new find, or each new find shown and
  named. Stage 2's gate still holds (`mirror_caps.py`: sliver sites with at least 20 px of cap ink stay 0).
- `hold.mjs` (`.claude/probes/K1450/`) 60/60 warm on link A; `npm test` green; the carry-across sheets with
  `gfh=1` removed at Crossing fade (`fl`) 0 and 1.2.

A partial result lands. Say plainly which commits are confirmed on the tiles.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`. If a fetch
  fails, retry a few times, then carry on from what you have.
- Files: the key and composite code in `gf_glsl.ts`, `eval.ts`, `tables.ts`, `gf_keys.ts`, the border code in
  `gf_look.ts`, their tests. Others at work: an agent on the first visit's wait (`gf_app.ts`, `gf_pass.ts`,
  `gf_compile_worker.ts`, `gf_split.ts`); Muse batch 26 in the main checkout (the fill colour and the j64 fill
  line in `gf_look.ts`, then K1477's stub, then a frame-time bisect). Keep the diff small and rebase on
  origin/master before the handoff. Do not change any file in the main checkout.
- **Memory and disk.** One Chrome at a time, at most two preview builds (`scripts/preview.ps1 -Port <p> -Ref
  <commit>`; it needs the worktree's node_modules complete), profiles under `$env:TEMP\k1482s4-*`, all deleted
  when you stop. Before each build or Chrome launch wait in ONE blocking loop (15 minutes at most) while
  `FreeVirtualMemory` is under 3 GB or `(Get-PSDrive C).Free` is under 8 GB.
- Captures of one build differ load to load by tens of thousands of 1-2 level pixels (stroke edges): compare
  frames in the same physics hash and count dark-ink pixels in a site's box, not whole-frame differences.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5680-5699. Headed, real-time Chrome, never `--virtual-time-budget`. No perf numbers: do not take the
  perf lock.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files and sheets, not raw frames).
  Never push. Never edit LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Own the technique; do not stop at the cause. For anything open at the stop line, report what you tried and
  why each attempt fell short.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone), whichever
comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`### Handoff K1482 s4` here, commit, and report: the sweep's faulted count by class, the sheets' paths (each
site named), the numbers, which commits are confirmed on screen, a `Ledger items` list and K1482's handle
fields.
