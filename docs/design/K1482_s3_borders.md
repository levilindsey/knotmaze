# K1482 stage 3: rp=gf's border faults on Levi's link, the next classes (Claude agent stage)

Read `### Handoff K1482 s2` in `docs/design/K1482_s2_end_caps.md` whole, and the bar in
`docs/design/K1482_levi_link_borders.md` (Levi's approved look: at junctions and under-tail ends the over
thread's outline runs on unbroken, with no dot, stub, wedge, tick, notch, sliver, break or stray dash; gf's
border look itself stays as it is). Stage 2 (merged 16e0c573, fix 0a84d3d1: a junction group's open end sinks
one pass, `tipSink` in `gf_glsl.ts` and `eval.ts`) took link A's sweep from 85 to 54 faulted sites of 327.

**The scoreboard is the sweep**: link A (`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`) at rest, border
look, 327 sites, faulted count by your own eyes on the 4x tiles. Master: 54 (sliver 14, wedge 11, notch 9,
dot 6, tick 5, dash 4, stub 3, break 2; `.claude/probes/K1482/out/s2/classes_tip.txt`). Report that number on
your tip.

## Do, in this order

1. **The regression stage 2 left in** (fill look, census scene `ring`, world (1.77, 15.26), 17 px, the K1436
   bar's one new find): a hard-edged dark block in the thread's fill where master before 0a84d3d1 had a soft
   band. Coverage is unchanged (`.claude/probes/K1482/ring_cut.ts`), so it is shading. Print the composite's
   layers and key gap at that pixel with and without the sink, then fix it (taper the sink over the end
   piece's last stretch, or keep the blend's gap test on the unsunk key, or what the print shows). Number:
   the bar passes (`pwsh -NoProfile -File .claude/probes/K1436/k1436_bar.ps1 -Ref <tip> -Base 7c739b42
   -HomeFlag 1 -Scenes ring,def -Port <p> -Tag k1482s3` with `STRICT=1`: no new find except the two `def`
   relabels stage 2 named), and stage 2's gate still holds (`mirror_caps.py`: sliver sites with at least 20 px
   of cap ink stay 0).
2. **The hairlines that are not cap ink**: j77/t64e, j102/t62e, the step at t81s, and the shortened j126,
   t55s, t20e. Find what draws each (the CPU mirror's winning term at those pixels), make a count that fails
   on master, fix it.
3. **The rest of the sliver and wedge classes** (same as master on stage 2's sheets: j71 j95 j147 t30e t43s
   t56s; j15 j50 j82 j143 j158 t23e t59s t73e t84e), then **notch** (9). One cause at a time, the largest
   group first. Not yours: K1477's stub past a crossing (j81, j138, t70s; Muse run 26H) and j71's seam shape
   (a look waiting on Levi).

Stage 2's fix also changed a look that waits on Levi: a tail that used to fuse into the thread it meets now
stops just short of it, like an under pass (j3, j61, j76, j51, j103). Leave that as it is.

## Done

- Item 1's bar result and gate.
- For each cause fixed: the cause in one sentence, its number failing on master and passing on your tip, and
  4x tiles master | tip | diff at every site whose screen changed, each looked at and named fixed, same as
  master or open. A fix whose tiles do not look fixed is not one. No site clean on master turns faulty.
- The sweep's faulted count on your tip, by class.
- `hold.mjs` (`.claude/probes/K1450/`) 60/60 warm on link A; `npm test` green; the carry-across sheets with
  `gfh=1` removed at Crossing fade (`fl`) 0 and 1.2.

A partial result lands. Say plainly which commits are confirmed on the tiles.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`. The desktop's
  network drops connections tonight: retry a failed fetch a few times, then carry on from what you have.
- Files: the key and composite code in `gf_glsl.ts`, `eval.ts`, `tables.ts`, `gf_keys.ts`, the border code in
  `gf_look.ts`, their tests. Others at work: an agent on the first visit's wait (`gf_app.ts`, `gf_pass.ts`,
  `gf_compile_worker.ts`, `gf_split.ts`); Muse batch 26 in the main checkout (`tables.ts` reach windows, then
  the fill colour and the j64 fill line in `gf_look.ts`, then K1477). Keep the diff small and rebase on
  origin/master before the handoff. Do not change any file in the main checkout.
- **Memory and disk.** One Chrome at a time, at most two preview builds (`scripts/preview.ps1 -Port <p> -Ref
  <commit>`; it needs the worktree's node_modules complete), profiles under `$env:TEMP\k1482s3-*`, all deleted
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
`### Handoff K1482 s3` here, commit, and report: the sweep's faulted count by class, the sheets' paths (each
site named), the numbers, which commits are confirmed on screen, a `Ledger items` list and K1482's handle
fields.
