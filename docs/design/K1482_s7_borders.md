# K1482 stage 7: rp=gf's border faults on Levi's link, the fragments, on master's tables (Claude agent stage)

Read `### Handoff K1482 s5` in `docs/design/K1482_s5_borders.md` and `.claude/probes/K1482/s5/notes.md` whole,
and the bar in `docs/design/K1482_levi_link_borders.md` (Levi's approved look: at junctions and under-tail ends
the over thread's outline runs on unbroken, with no dot, stub, wedge, tick, notch, sliver, break or stray dash;
gf's border look itself stays as it is).

**The scoreboard is the sweep**: link A (`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`) at rest, border
look, 327 sites, faulted count by your own eyes on the 4x tiles. Master: 46 (wedge 11, notch 9, sliver 7,
dot 6, tick 5, dash 3, stub 3, break 2; `.claude/probes/K1482/out/s3/classes_tip.txt`, `classes_master.txt`).
Two stages have now tried to land the page's home build and it did not land (stage 6: branch
`worktree-agent-ad03e8b65a2afa540`, last commit 67d8d743, handoff in that branch's
`docs/design/K1482_s6_borders.md`). **It stays parked: do not cherry-pick it.** This stage lowers the count on
master as it is, where the page builds its tables with home off and then sets `homeOn` (the mirror's
`HOME1=2` in `.claude/probes/K1482/scene_tables.ts` is that page exactly; check it against the screen at your
first site before trusting it).

## Not yours

- The 22 sharp-V and notch sites (wedges j15 j50 j82 j143 j158 t23e t59s t73e t84e, slivers j95 j147 t43s t56s,
  and the nine notches): a look question waiting on Levi (K1490). Leave them as they are.
- Dead-end tails stopping short of the thread they meet: waiting on Levi (K1485). Leave them short.
- j71's seam shape (K1470). The stub past a crossing (K1477, Muse run 26H). `gf_look.ts` (an agent on the
  crossing fade, then Muse 26G and 26H).

## Do, in this order

1. **The T triangle** (j58 and t23s, one fragment): chain 43's side stroke drawn inside chain 23's fill at a T
   with no corner. Print the winning term at the fragment's pixels in the mirror, write a count in `eval.ts`
   terms that fails on master, fix it, then run the count over every link A site and fix what else it flags.
2. **Re-read six sites** on 4x tiles: j2, j22, j29, j64, t65s, t80s (stage 3 classed them dot, tick or dash;
   stage 5 saw no fragment). Name what each shows and correct the class table.
3. **The remaining fragments** (dots, ticks, dashes, stubs, breaks that are not K1490's or K1477's), one
   family at a time, the largest first. For each family: the cause in one sentence from the mirror (which
   term wins at the fragment's pixels and why), a count that fails on master, the fix, tiles.

Each family's fix is its own commit, so a partial result can merge.

## Done

- For each fix: the cause in a sentence, its count failing on master and passing on your tip, 4x tiles
  master | tip | diff at every link A site whose screen changed, each looked at and named. No site clean on
  master turns faulty.
- The sweep's faulted count on your tip, by class, by your own eyes, with the corrected class table.
- The K1436 bar with `STRICT=1`, once, at the end (`pwsh -NoProfile -File .claude/probes/K1436/k1436_bar.ps1
  -Ref <tip> -Base <your starting commit> -HomeFlag 1 -Scenes ring,def,muse_hash,g41_user_tw64 -Port <p> -Tag
  k1482s7`): no new find, or each one shown at 4x and named. Its two captures of a scene must share a physics
  hash (stage 6's g41 pair did not: c1b63637 against 0d51331b); re-take the one that does not.
- `hold.mjs` (`.claude/probes/K1450/`) 60/60 warm on link A; `npm test` green.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`. If a fetch
  fails, retry a few times, then carry on from what you have.
- Files: `tables.ts`, `eval.ts`, `gf_keys.ts`, the key and composite code in `gf_glsl.ts`, their tests. Others
  at work: an agent on the crossing fade (`gf_look.ts`, the look's uniforms in `gf_pass.ts`); Muse batch 26 in
  the main checkout (`gf_look.ts`, then the look program's compile time in `gf_glsl.ts`'s `layers()`). Keep
  the diff small and rebase on origin/master before the handoff. Do not change any file in the main checkout.
- **Time.** Stage 6 ran out of time on builds and bar runs. Iterate in the mirror (seconds per site), build a
  preview only when the mirror says a fix holds, capture link A with `.claude/probes/K1482/cap.mjs`, and keep
  the last 35 minutes for the bar, the hold check and the handoff. The look program compiles for 60-120 s on a
  cold profile and again after every shader edit: batch edits, warm each profile once per link.
- **Memory and disk.** One Chrome at a time, at most two preview builds (`scripts/preview.ps1 -Port <p> -Ref
  <commit>`; it needs the worktree's node_modules complete), profiles under `$env:TEMP\k1482s7-*`, each
  deleted as soon as you are done with it. Stage 6 left a build of 82405bf9 (see its handoff): delete it if
  you do not use it. Before each build or Chrome launch wait in ONE blocking loop (15 minutes at most) while
  `FreeVirtualMemory` is under 3 GB or `(Get-PSDrive C).Free` is under 8 GB.
- Captures of one build differ load to load by tens of thousands of 1-2 level pixels (stroke edges): compare
  frames in the same physics hash (link A rests at fff8c9e5) and count dark-ink pixels in a site's box, not
  whole-frame differences.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5740-5759. Headed, real-time Chrome, never `--virtual-time-budget`. No perf numbers: do not take the
  perf lock.
- Commit WIP at every milestone, broken or not. Stage probe files with `git add -f` on the exact files or on
  your own new directory `.claude/probes/K1482/s7`, never on `.claude/probes` as a whole, and never raw
  frames. Never push. Never edit LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Own the technique; do not stop at the cause. For anything open at the stop line, report what you tried and
  why each attempt fell short.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone), whichever
comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`### Handoff K1482 s7` here, commit, and report: the sweep's faulted count by class, the sheets' paths (each
site named), the numbers, which commits are confirmed on screen, a `Ledger items` list and K1482's handle
fields.

### Handoff K1482 s7

Claude agent, 2026-11-18. The coordinator narrowed the finish line on resume: no work on the gap family, which
the next stage takes from here. Branch `worktree-agent-a59d82bf7d4d1b8cf`, rebased on origin/master ec2cada0.

**Landed.**
- 204aa6db: the fold fix (`eval.ts`, `gf_glsl.ts` `foldD`). A hairpin's side face is now buried by the
  piece's own far segments, the ones turned more than 120 degrees from the nearest. This applies only inside
  another piece of the same surface. It fixes j58 (a tick) and t23s (a dash). Muse's c6b0e770 (one corner-face
  loop) does not touch the fold line, which sits in the side-face loop: the full program holds `foldD` once
  and the `3 * nk` loop. Re-frozen pins in `test/render/gf_home_glsl.test.ts`.
- 55fb23d2: the class table, `.claude/probes/K1482/out/s7/classes.txt`. It is a probe-only commit.

**Confirmed on screen (rebased tip 55fb23d2 against ec2cada0, link A, both at hash fff8c9e5).**
- `out/s7/rb_fold_00.png` (master | tip | diff): j58 and t23s each lose their 16-pixel fault; t23e is
  unchanged (a K1490 wedge).
- The site diff at a 1-pixel threshold changes no other site of the 327, so no clean site turns faulty.
- `out/s7/mm_tiles_00.png` and `mm_gap3.png` show 593a7388 against ec2cada0. Muse's 5dfb8810 adds ink at 13
  sites. To my eye it fixes three gap sites: j81 (a wedge), j138 (a sliver) and t18e (a stub).

**Faulted count on the tip.** 41 by eye, not re-swept.
- By class: wedge 10, notch 9, sliver 6, dot 6, tick 3, stub 2, break 3, dash 1, pocket 1.
- By owner: K1490 22, GAP 17, K1470 1 (j71), PIN 1 (j64).

**Checks.**
- The K1436 bar ran with `STRICT=1`, Ref 55fb23d2, Base ec2cada0, Tag k1482s7 (`.claude/probes/K1436/out/
  bar/k1482s7/bar.txt`). Result: PASS, new 0, grown 0, gone 1. The gone find is the mirror rstray at
  muse_hash 4.73,33.55 (128 px), likely the fold fix in `eval.ts`; it was not viewed.
- Each scene's two captures share a hash: ring 50dd4ffd, def 910ff135, muse_hash 733ee14a, g41_user_tw64
  0d51331b. ring and g41 needed the script's retry: their first loads gave 0a0ee15e and c1b63637.
- `hold.mjs`: 60/60 warm on link A. Edge pixels ranged from 6759 to 8608; no fallback.
- `npm test`: 254 files, 3173 passed, 18 skipped.

**The gap family, for the next stage.**

*Sites (17 on the tip).*
- dots: j2, j88, t1s, t24s, t46e
- ticks: j49, j55, j87
- stubs: j36, t79s
- dash: t39s
- breaks: j22, j29, t65s
- pocket: t80s
- wedge: t81s
- sliver: t70s

A site is "GAP" when switching the cut off restores the outline. Switch it off with the patch
`.claude/probes/K1482/s5/patch/nogap.json`, which replaces `float lkg = lkKb < BIG ? lkGap(lkKb, p, lq, lab) :
0.0;` with `float lkg = 0.0;` (3 sources; `lkFringe` stays on). Run it through `cap.mjs` with
`$env:PATCH=<absolute path>` and `HASH=fff8c9e5`. Sheets of master | nogap | diff: `out/s7/gap_tiles_00.png`
and `rest_tiles_00.png`. Context: `ctx_tiles_00.png`, `dots_*.png`, `brk_gm.png`.

*What `lkGap` does at each class, as seen on those sheets.* Green in the diff is ink that nogap restores.
- **Dot, dash:** a short island of under-thread outline is left between two cuts, or between a cut and
  another end. At t1s, chain 28 (under) is cut by chain 41's gap at margin distance 0.43-0.50, and the island
  sits before chain 1's start. The mirror has no gap, which is why it draws these sites solid.
- **Tick, stub:** the cut removes a corner wedge where one outline joins another at a junction. The end left
  behind is a soft, faded tip: the window-end fade `fs` in `lkCut`, plus fc96656e's fade over the whole ramp.
  So the gap is cutting at a join, not at a crossing.
- **Break:** a few-pixel cut in the middle of an outline with no visible over thread at that point.
- **Pocket, wedge, sliver:** the same cut beside an oblique crossing.

*What I would change in `gf_look.ts`, and why.* These are untested hypotheses; check each at the sites with
the patch loop above.
1. **Ticks and stubs:** do not let a piece of the same surface, or of the joined arm, cut at a junction.
   `lkGap` cuts by every piece with `pkey[j] > key + uZt`, and a key order alone does not mean "crosses over".
   Muse's K1477/K1502 found that form B's key order makes the border stub past a crossing, and that the reach
   key windows (`pinReach`) are baked only with home on (`tables.ts:582`), while the page builds home off.
   Separate the two causes first: rebuild with those windows baked, and see whether the ticks and stubs go.
2. **Dots and dashes:** when two gap windows on one under thread leave less than about 2W of outline between
   them, or between a window and a thread end, merge them in the bake. That is `gapWindow`, gf_look.ts:440,
   called near :610. This is the job the K1458/K1476 window extension already half does.
3. **Breaks and slivers:** check whether the over piece that cuts is itself buried at that point. A cut should
   not show where its over thread is not drawn. Also check the fade floor `max(sinT, 0.2)` in `lkCut` at
   oblique crossings.

Compare each site with today's renderer (`rp` default) before choosing a look.

**j64 (pin).** Chains 28 and 56 (one surface, group 64) part at the junction, and their union leaves a pinhole
about 0.1 wide that the outline rings (`out/s7/j64_gm.png`, world 5.14,3.16). The mirror draws it too, so it
comes from the field's geometry, not the look. Open decision: fill holes in one surface's union narrower than
about W in the key/composite, or accept it.

**Not mine, left as filed.** K1490 (22 sharp-V wedges and notches) and K1470 (j71).
