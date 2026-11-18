# K1482 stage 6: rp=gf's border faults, land the home build, then the T triangle (Claude agent stage)

Read `### Handoff K1482 s5` in `docs/design/K1482_s5_borders.md` whole (and `.claude/probes/K1482/s5/notes.md`),
and the bar in `docs/design/K1482_levi_link_borders.md` (Levi's approved look: at junctions and under-tail ends
the over thread's outline runs on unbroken, with no dot, stub, wedge, tick, notch, sliver, break or stray dash;
gf's border look itself stays as it is).

Stage 5 made the page build its tables with home at `gfh=1` (src commit 3b2bde03 on branch
`worktree-agent-a5dca968eeb3d79f3`, NOT on master): the page's tables then equal Node's `home: true` build, the
CPU mirror equals the screen at the fault sites, K1451's spots 5 and 7 are fixed on screen, and link A's sweep
reads 45 (master 46). It did not land because the K1436 bar (STRICT, ring, def, muse_hash, g41_user_tw64)
found sites that got worse.

**The scoreboard is the sweep**: link A (`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`) at rest, border
look, 327 sites, faulted count by your own eyes on the 4x tiles. Master: 46 (wedge 11, notch 9, sliver 7,
dot 6, tick 5, dash 3, stub 3, break 2).

## Do, in this order

0. `git cherry-pick 3b2bde03` (the home build; src and its test only).
1. **Make the home build land.** With home tables, against master, on the bar's four scenes and on link A:
   - g41_user_tw64 x154 (7.22:15.51): the cut's fill edge turns ragged (59 px). Find what draws it (the
     mirror now equals the screen: print the winning term and the pin window there, with and without
     `clipPinWindows`), make a count that fails on 3b2bde03, fix it.
   - g41_user_tw64 j25: a small extra step. The same way.
   - **Tails keep master's look.** With home, three tails that stop just short of the thread they meet on
     master join it as a T or Y (link A t18e, t50s; muse_hash j49). Which of the two Levi wants is an open
     question (K1485), so this stage changes neither way: those tails stop short as on master. If that cannot
     hold without losing spots 5 and 7, say so with tiles and leave the home build unlanded.
   - j71 (g41_user_tw64 4.981:7.472) keeps the shape K1451 stage 4 gave it (a look waiting on Levi).

   Number: the bar passes with `STRICT=1` (`pwsh -NoProfile -File .claude/probes/K1436/k1436_bar.ps1 -Ref <tip>
   -Base 82405bf9 -HomeFlag 1 -Scenes ring,def,muse_hash,g41_user_tw64 -Port <p> -Tag k1482s6`): no new find,
   or each one shown at 4x and named a relabel of the same pixels by your own eyes (stage 5 named six; show
   them). Link A's sweep: no site clean on master turns faulty.
2. **The T triangle** (j58 and t23s, one fragment): chain 43's side stroke inside chain 23's fill at a T with
   no corner. A count in `eval.ts` terms that fails on master, the fix, then every other link A site the same
   count flags.
3. **Re-read six sites** on your tip's tiles: j2, j22, j29, j64, t65s, t80s (stage 3 classed them dot, tick
   or dash; stage 5 saw no fragment). Name what each shows, and correct the class table.

Not yours: `gf_look.ts` (another agent is on the border look's crossing fade there), the sharp-V sites and the
notches (they wait on Levi, K1490), K1477's stub past a crossing (Muse run 26H).

## Done

- Item 1's bar result, the count for x154, 4x tiles master | tip | diff at every site whose screen changed on
  the four scenes and link A, each looked at and named. Without `gfh=1`: 0 px against master at all 327 sites.
- The sweep's faulted count on your tip, by class, with the corrected class table.
- For item 2: the cause in one sentence, its number failing on master and passing on your tip, tiles.
- `hold.mjs` (`.claude/probes/K1450/`) 60/60 warm on link A; `npm test` green.

A partial result lands: item 1 alone is worth merging. Say plainly which commits are confirmed on the tiles.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`. If a fetch
  fails, retry a few times, then carry on from what you have.
- Files: `tables.ts`, `eval.ts`, `gf_keys.ts`, the key and composite code in `gf_glsl.ts`, `gf_worker.ts`,
  `gf_build.ts`, the one build call in `gf_app.ts`, their tests. Others at work: an agent on the crossing fade
  (`gf_look.ts`); Muse batch 26 in the main checkout (the fill colour in `gf_pass.ts`, the j64 fill line in
  `gf_look.ts`, K1477's stub, then the look program's compile time in `gf_glsl.ts`'s `layers()`). Keep the
  diff small and rebase on origin/master before the handoff. Do not change any file in the main checkout.
- **Memory and disk.** One Chrome at a time, at most two preview builds (`scripts/preview.ps1 -Port <p> -Ref
  <commit>`; it needs the worktree's node_modules complete), profiles under `$env:TEMP\k1482s6-*`, all deleted
  when you stop. Before each build or Chrome launch wait in ONE blocking loop (15 minutes at most) while
  `FreeVirtualMemory` is under 3 GB or `(Get-PSDrive C).Free` is under 8 GB.
- Captures of one build differ load to load by tens of thousands of 1-2 level pixels (stroke edges): compare
  frames in the same physics hash and count dark-ink pixels in a site's box, not whole-frame differences.
- Mirror tools must build the page's tables: `HOME1=1` in `.claude/probes/K1482/scene_tables.ts` on your tip.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5680-5699. Headed, real-time Chrome, never `--virtual-time-budget`. No perf numbers: do not take the
  perf lock.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files and sheets, not raw frames).
  Never push. Never edit LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Own the technique; do not stop at the cause. For anything open at the stop line, report what you tried and
  why each attempt fell short.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone), whichever
comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`### Handoff K1482 s6` here, commit, and report: the sweep's faulted count by class, the sheets' paths (each
site named), the numbers, which commits are confirmed on screen, a `Ledger items` list and K1482's handle
fields.
