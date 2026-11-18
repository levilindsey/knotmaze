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

### Handoff K1482 s3

Agent stage 3, 2026-11-18 00:37-01:40, branch `worktree-agent-a3b732fc927c3682b`, rebased on 517f508c.
The fix is 059b5a04; the rest are probes and sheets.

**Cause (items 1 and 2, one cause).** Stage 2's tip sink stepped from 0 to 10·zt at the tip's perpendicular,
so the end piece's key jumped there. Each jump drew a hard edge: square ink knobs where a tail meets the
thread it runs into, the hairlines at j77/t64e, j102/t62e, t30e, j126/t55s and t20e, and ring's fill-look
block. 059b5a04 tapers the sink with a smoothstep over the last h/2 of arc length, in `eval.ts` and
`gf_glsl.ts` (`tipSink`). `gf_home_glsl.test.ts`'s digests were re-frozen.

**Numbers.**
- Mirror, all 327 link A sites, step vs taper (`mt_diff.py`): ink flips at 312 sites, all of them removals
  except 2 px at j61/t25e, 2 at t6s/j21 and 1 at j55. Ink only the step drew: j77/t64e 40 px, j102/t62e 34,
  j126/t55s 36, t20e 33, t30e 33, t81s 12. The taper draws none of it.
- Stage 2's gate holds: `mirror_caps.py` sliver sites with at least 20 px of cap ink, 0.
- The K1436 bar, `STRICT=1`, ring+def against 7c739b42 (`.claude/probes/K1436/out/bar/k1482s3/`): FAIL by the
  script, new 1, gone 13. Stage 2's three new finds are gone: ring 1.77,15.26 and both def relabels.
  - The one new find is def 23.55,13.09, 3 px, mirror dstray:tie. It sits 0.09 from a gone 20 px vdip:plain
    (23.63,13.13). Its tile (`sheet.png`) is stage 2's tail-stops-short look: the gap now ends short of the
    thread. Levi left that look as it is. Read it as a relabel, not a fault.
  - The screen finds are equal on both scenes (ring: the one cut x68 in base and ref; same hashes 910ff135
    and 50dd4ffd).
- Link A screen, stage 2's tip vs 059b5a04, hash fff8c9e5: 595 px in 23 spots, every one ink removed.
  `out/s3/chg_00.png` and `chg_01.png` hold the 4x tiles. Each spot was looked at: a knob or bridge at a tail
  tip is gone, and the over thread's outline is smooth there. `out/s3/hair_00.png` shows pre-s2 | stage 2 |
  tip at the item 2 and 3 sites.
- Carry-across without gfh=1, against stage 2's tip: fl 0 changed 805 px in 28 spots, fl 1.2 changed 885 px
  in 27. Every spot was ink removed at a tail tip and was looked at. Sheets: `out/s3/nogfh_fl0_0*.png` and
  `nogfh_fl1.2_0*.png`.
- hold.mjs, warm, on link A: 60/60 PASS.
- npm test: 254 files, 3169 tests green.

**Sites.**
- Fixed: j77, t64e, j102, t62e, t30e, j126, t55s (all sliver) and t20e (dash). j126, t55s and t20e now stop
  short; that is the look Levi left as it is.
- Same as master: t81s's step (wedge) and everything else in `out/s3/classes_tip.txt`.
- No site clean on master turned faulty.

**Sweep on the tip: 46 faulted** (master 54): wedge 11, notch 9, sliver 7, dot 6, tick 5, dash 3, stub 3,
break 2.

**Item 3: open, no cause found.** `wk_map.py` gives each site's mirror winning term and chain:
- Wedge sites (j15 j50 j82 j143 j158 t23e t59s t73e t84e): plain strokes (winKind 1) where two outlines
  converge at an acute angle. A few winKind 2 blocks sit at j82, j143, t59s and t84e, and winKind 3/6 px at
  j158, t73e and t59s. No one term is shared across the sites.
- Sliver sites (j95 j147 t43s t56s): also winKind 1. The bright sliver is the paper between two outlines
  narrowing below a pixel.
- Both look like gf's border look at acute V junctions, not a cap. Changing them would change the border look
  itself, which Levi said to keep. Ask him before stage 4 touches them.
- t81s's step is unchanged by the taper; its 12 mirror px came from the old step.

**Next.** Show Levi j15, j95, j147 and t43s at 4x and ask whether converging outlines at an acute V are faults
or gf's look. If they are faults, the largest group is wedge.
