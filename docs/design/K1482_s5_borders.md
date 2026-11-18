# K1482 stage 5: rp=gf's border faults on Levi's link, the page builds with home, then the dots (Claude agent stage)

Read `### Handoff K1482 s4` in `docs/design/K1482_s4_borders.md` whole, and the bar in
`docs/design/K1482_levi_link_borders.md` (Levi's approved look: at junctions and under-tail ends the over
thread's outline runs on unbroken, with no dot, stub, wedge, tick, notch, sliver, break or stray dash; gf's
border look itself stays as it is). Stage 4 changed no source and found two things: on the page `gfh=1`
builds its tables with home off, so K1451's pin clip (`clipPinWindows`, `tables.ts`) has never drawn on
screen; and the CPU mirror (`eval.ts`) has no look crossing gap, so it cannot attribute the dots, ticks and
dashes.

**The scoreboard is the sweep**: link A (`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`) at rest, border
look, 327 sites, faulted count by your own eyes on the 4x tiles. Master: 46 (wedge 11, notch 9, sliver 7,
dot 6, tick 5, dash 3, stub 3, break 2; `.claude/probes/K1482/out/s3/classes_tip.txt`). Report that number on
your tip.

## Do, in this order

0. **The page builds with home when `gfh=1`.** Pass the home flag into every table build the page runs:
   `gf_app.ts` (the `buildTables(scene, { aa })` call), `gf_worker.ts` (the single build and the pooled
   build's slices) and `gf_build.ts`. Then, at `gfh=1`, the page's tables must equal the Node build with
   `home: true` in every array (the `HOME1=1` mirror of `.claude/probes/K1482/scene_tables.ts`), pooled and
   single; without `gfh=1` the tables and the screen stay as on master (0 px at the same physics hash, with a
   master-against-master control). Commit that, then re-run the sweep on screen: the count may move either
   way. Show every site whose screen changed (master | tip | diff at 4x), name each fixed, same or worse, and
   look at K1451 stage 4's spots 5 and 7 (`docs/design/K1451_s4_spots_5_7.md`) on screen. A site the clip
   turns faulty is yours to fix in the clip; if the count cannot be brought to 46 or under, do not hand over
   the home builds as confirmed: say so and leave them as a separate commit.
1. **Dots (6), ticks (5), dashes (3), breaks (2).** Give the mirror the real crossing gap of the look
   (`lkGap` / `lkCut` / `lkFringe` in `gf_look.ts`, with the K1423 window and the K1458 bake: export the
   GfGapTable bake so `eval.ts` reads the same window and slot), until mirror and screen agree at those sites
   (stage 4: 187 of 327 sites differed by 5 px or more; `gap_emul.ts` was a crude cut). Then print which gap
   term leaves each fragment, group the sites by cause, make a count that fails on master for the largest
   group, fix it; then the next group.

Not yours: the sharp-V sites and the notches (j15 j50 j82 j143 j158 t23e t59s t73e t84e, j95 j147 t43s t56s;
rounding them with longer corner arms waits on Levi's answer to the sharp-V card), K1477's stub past a
crossing (j81, j138, t70s; Muse run 26H), j71's seam shape and the tail that stops just short of the thread
it meets (looks waiting on Levi).

## Done

- Item 0: the table equality at `gfh=1`, the 0 px without it, the sweep's count by class on the tip, the
  changed sites' tiles each named, spots 5 and 7 named, the page's build time for link A before and after
  (labelled if under load).
- For each cause fixed in item 1: the cause in one sentence, its number failing on master and passing on
  your tip, and 4x tiles master | tip | diff at every site whose screen changed, each looked at and named
  fixed, same as master or open. A fix whose tiles do not look fixed is not one. No site clean on master
  turns faulty.
- The K1436 bar with `STRICT=1` (`pwsh -NoProfile -File .claude/probes/K1436/k1436_bar.ps1 -Ref <tip> -Base
  9f2c226f -HomeFlag 1 -Scenes ring,def -Port <p> -Tag k1482s5`): no new find, or each new find shown and
  named.
- `hold.mjs` (`.claude/probes/K1450/`) 60/60 warm on link A; `npm test` green; the carry-across sheets with
  `gfh=1` removed at Crossing fade (`fl`) 0 and 1.2.

A partial result lands: item 0 alone is worth merging. Say plainly which commits are confirmed on the tiles.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`. If a fetch
  fails, retry a few times, then carry on from what you have. Keep a running notes file
  (`.claude/probes/K1482/s5/notes.md`) and commit it at each milestone.
- Files: `tables.ts`, `eval.ts`, `gf_keys.ts`, the key and composite code in `gf_glsl.ts`, the border and gap
  code in `gf_look.ts`, `gf_worker.ts`, `gf_build.ts`, their tests, and in `gf_app.ts` ONLY the table build's
  option (another agent is rewriting that file's compile start, K1456: keep your change there to that call).
  Leave `gf_pass.ts` alone (its upload sets `homeOn` and stays correct). Also at work: Muse batch 26 in the
  main checkout (the fill colour and the j64 fill line in `gf_look.ts`, K1477's stub, a frame-time bisect,
  then the compile time of `layers()` in `gf_glsl.ts`). Keep the diff small and rebase on origin/master
  before the handoff. Do not change any file in the main checkout.
- **Memory and disk.** One Chrome at a time, at most two preview builds (`scripts/preview.ps1 -Port <p> -Ref
  <commit>`; it needs the worktree's node_modules complete: `npm ci` first if it is not), profiles under
  `$env:TEMP\k1482s5-*`, all deleted when you stop. Before each build or Chrome launch wait in ONE blocking
  loop (15 minutes at most) while `FreeVirtualMemory` is under 3 GB or `(Get-PSDrive C).Free` is under 8 GB.
- Captures of one build differ load to load by tens of thousands of 1-2 level pixels (stroke edges): compare
  frames in the same physics hash and count dark-ink pixels in a site's box, not whole-frame differences.
- PowerShell. Read code through the shell (narrow ranges); the Read tool only just before an Edit, and for
  images.
- Ports 5680-5699. Headed, real-time Chrome, never `--virtual-time-budget`. The build time is the one perf
  number: take the perf lock (`$env:TEMP\claude-perf.lock`) for it only if it is free; otherwise label it
  under load.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files and sheets, not raw frames).
  Never push. Never edit LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Own the technique; do not stop at the cause. For anything open at the stop line, report what you tried and
  why each attempt fell short.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone), whichever
comes first. A compaction is not a stop: re-read this brief, your notes and `git log`. On stopping: commit WIP,
append `### Handoff K1482 s5` here, commit, and report: the sweep's faulted count by class, the sheets' paths
(each site named), the numbers, which commits are confirmed on screen, a `Ledger items` list and K1482's
handle fields.

### Handoff K1482 s5

Stopped 04:30 on 2026-11-18 (started 02:53), before the 2 h line, with item 1 unfixed. Branch
`worktree-agent-a5dca968eeb3d79f3`, rebased on origin/master 82405bf9. The src commit is 3b2bde03 (69a63364
before the rebase; the bar and the captures ran on 69a63364, same tree). Running notes, numbers and every sheet:
`.claude/probes/K1482/s5/notes.md`.

- **Item 0, the page builds with home at gfh=1 (3b2bde03).** On the page at gfh=1, both pooled and single, the
  tables equal Node `buildTables(scene, {aa, home: true})` in all 58 arrays, within 1e-12 (ULPs from the scene
  export). Master's page equals home false. Without gfh=1, the tip's tables equal master's exactly, and ink at all
  327 sites is unchanged (0 px; the master-against-master control is also 0). On link A (gfh=1), 4 of 327 sites
  change:
  - t18e: the tail that stopped short now joins the other outline as a T (the stub fault is gone);
  - t50s: joins as a Y;
  - t21e and t2s: 3-4 px edge changes.

  So link A falls from 46 to 45 faults: wedge 11, notch 9, sliver 7, dot 6, tick 5, dash 3, stub 2, break 2. K1451
  s4's spots 5 and 7 are fixed on screen (out/s5/spots_5_7_j71.png). **But the STRICT bar FAILs** on the census
  scenes:
  - g41_user_tw64 x154: the cut's fill edge turns ragged (59 px), which is worse;
  - g41 j25: a small extra step;
  - muse_hash j49: a tail drawn into the junction as a T, the same look question as t18e;
  - the remaining finds only change class at the same px.

  Not confirmed for landing until x154 is fixed or judged.
- **Item 1: no fix.** The look's crossing gap is not the cause. Switching off the shader terms on the page (nogap,
  nofringe) changes 0-2 px at all 16 dot, tick, dash and break sites. With the page's home tables, the mirror equals
  the screen there (extra 0, a few px missed). Stage 4's "the mirror cannot see the dots" came from home-off tables.
  The fragments are field ink. The j58/t23s triangle is chain 43's side (winKind 1) inside chain 23 at a T with no
  corner. It is not the vertex cap (switching vtx off in the mirror leaves it).
- **Crossing fade (coordinator's addition).** On master and on the tip alike, fl 0 to 1.2 only pulls the under
  outline's ends back a few px; nothing ramps over the ~51 device px that fl 1.2 asks for. The home-off build was not
  why the slider looks dead. From the code (not measured): lkCut's ramp lives only inside the h + gap band of the
  over piece, so that band bounds the fade. Sheets: out/s5/fade_sheet_wide.png and fade_sheet.png.
- **Other checks:**
  - hold: 60/60 on link A, tip build;
  - npm test: green (254 files, 3170 tests) on 69a63364;
  - carry-across with gfh=1 removed: 0 of 327 sites change at fl 0 and at fl 1.2 (no sheet: nothing to tile);
  - build time under the perf lock: tablesMs master [17.7, 14.0, 20.4, 14.1], tip [15.5, 16.2, 23.5, 26.4]. These
    are one load each, and the spread is as large as the difference.
- **Next:**
  1. Attribute x154's ragged cut, the g41_user_tw64 7.22:15.51 site in the bar's captures (probably `clipPinWindows`
     against the cut), fix it, and re-run the bar.
  2. For item 1, take the j58/t23s triangle: a count in eval.ts of chain-43 side ink inside chain 23 at the T,
     which fails on master.
