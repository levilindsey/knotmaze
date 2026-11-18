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

### Handoff K1482 s4

Stopped 02:45 (2 h cap ~03:32; stopped early: no fix can land with its Done evidence in the time left).
No src change: `git diff origin/master...HEAD -- src` is empty, so the tip renders as master (sweep 46:
wedge 11, notch 9, sliver 7, dot 6, tick 5, dash 3, stub 3, break 2; bar, hold, mirror_caps and the
carry-across sheets equal master's and were not re-run). Running notes: `.claude/probes/K1482/s4/notes.md`.

- **Item 0 done** (d47ad7b8): `.claude/probes/K1482/out/s4/card_sharp_v.png`.
- **The page's tables.** gfh=1 builds tables with no home (`buildTables(scene, {aa})`: gf_app.ts:416,
  gf_worker.ts:405, gf_build.ts:55) and gf_pass.ts:782 uploads `{...T, homeOn: true}`, so K1451 s3's pin clip
  (tables.ts, only when built with home) never reaches the screen. The page-exact mirror is
  `HOME1=2` in `.claude/probes/K1482/scene_tables.ts` (equal to the page's tables in every array). Home-off
  mirror runs (older K1482 tools, mirror_caps.py) do not match gfh=1.
- **Item 1, notches: cause found, not fixed.** At a T junction a crossing pin near the junction cuts the
  through arm's Lcut to ~0-0.3, solveGfCorners rejects the concave pair (L0 or feet-out gate), and the home
  membership still joins the cut arm out to aHome: the outlines meet in a sharp V or notch, the same family
  as item 0's sharp V. Gate tally on master: corner pass 157, feet out 144, th out 76, L0 70, null r 47.
  Retrying the pair with arms extended to Lcut + KEXT h (mirror only, reverted): KEXT 1.5 fixes j14 j47
  t58e, rounds t4s, slightly improves t16e, leaves j4 j41 j59 t45s; it also rounds the sharp-V sites
  (j50 j158 t73e j147) and many tail corners, and unconditionally (home off) it draws wedges and blobs.
  Sheets: `out/s4/sheets/notch_shH1.png`, `notch_shH15*.png`, `notch_shH2.png`. Landing needs Levi's
  sharp-V answer (K1490) and corners keyed on home (a buildTables home option in gf_app.ts, another
  agent's file).
- **Item 2: the mirror cannot see the dots.** The probe GLSL equals eval.ts (0.000 at t1s t37e j4 j47,
  `gpu_home.mjs`), but the screen lacks ink the mirror draws at 187 of 327 sites (>= 5 px). The difference
  is the look's crossing gap (gf_look.ts lkGap / lkCut / lkFringe with the K1423 window and K1458 bake),
  which eval.ts does not model: `gap_emul.ts` (a crude cut, no window) brings mirror-only ink from 3102 to
  1082 px and the item-2 fault sites from 1-46 to 1-8 px (`out/s4/gm_mir_pageexact.txt`,
  `gm_gap_emul.txt`; sheets `dots_screen_vs_mirror.png`, `dots_screen_vs_mirror_gap.png`). The dots,
  ticks and dashes sit where that gap cuts an under thread's border. j58's tick: chain 43's side stroke
  inside chain 23's fill at a T with no corner at all (nK 0, also at KEXT 1.5).
- **Next:** a mirror that carries the real lkGap (export the GfGapTable bake so eval can read the window
  and slot), then attribute each dot/tick/dash to the gap term that leaves its fragment, then fix the
  largest group. K1451's gpu.mjs live/full variants read all black on lookable passes (harness bug).
