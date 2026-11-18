# K1482 stage 2: an open end's cap yields to the thread it passes under (Claude agent stage)

Stage 1 (`docs/design/K1482_levi_link_borders.md`: read the brief and Handoff K1482 whole) swept Levi's link
at rest in rp=gf's border look: 327 sites, 85 faulted (sliver 33, wedge 19, notch 11, dot 7, tick 5, dash 4,
break 3, stub 3; `.claude/probes/K1482/out/sites.tsv`, `out/master/sheets/faults_00..03.png`). It found the
sliver class's cause and fixed nothing. This stage fixes it.

**The bar is Levi's approved look:** at junctions and under-tail ends the over thread's outline runs on
unbroken, with no dot, stub, wedge, tick, notch, sliver, break or stray dash. gf's border look itself stays
as it is (Levi, 2026-11-17). Rest link: `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` ("link A"),
1600x900 DSF 2, physics hash fff8c9e5 (retry the load until the state matches).

## The cause (stage 1, from the CPU mirror `eval.ts`)

A chain's END piece sits in a junction group's surface and takes the group's flat depth key, about -0.09. A
neighbouring thread that is still dipping under an over thread has keys of -0.12 to -0.20 on its own surface,
so the end piece outranks it. The end's round cap (`eval.ts`: `wk = this.pend[j] ? 3 : 1`, winKind 3) is then
drawn across the neighbour's body, and the eye between the cap's outline and the neighbour's edge stroke is
the sliver. Cap ink shows at 32 of 33 sliver sites (23 with 20 px or more on screen), at 10 of 242 clean
sites and at 9 of the 19 wedge sites (`mirror_caps.py`, `out/master/mirror_caps.tsv`,
`zoom/mirror_slivers.png`, `cap_surfaces.ts`, `out/master/cap_surfaces.txt`).

## Do

1. **Make the cap yield.** Two routes from stage 1; pick by what the tiles show, or find a better one:
   give an end piece its own chain's depth key in place of its group's flat key (`tables.ts` arm groups;
   this moves the tables digest, which is fine: re-freeze it and say so), or hide a cap term under any
   higher-ranked surface whose tube holds the cap's edge point (`gf_glsl.ts` with its mirror in `eval.ts`).
   The shader and the mirror must stay in step (their parity tests).
2. Gate: `mirror_caps.py`'s count of sliver sites with cap ink on screen, 23 on master, 0 on your tip, and
   the 10 clean sites' count not rising. Then the screen: re-run the sweep's capture and classing on your
   tip (`cap.mjs`, `tiles.py`, `sweep_table.py`), and look at every tile of the 33 sliver sites and the 19
   wedge sites yourself.
3. With time left, the next class down by sites (wedge's other 10, then notch), same method: cause in code,
   a number failing on master, the fix, the tiles.

## Done

1. 4x tiles master gf | your gf at all 33 sliver sites and the 19 wedge sites under
   `.claude/probes/K1482/out/s2/`, each site named fixed, same as master or open. A fix whose tiles do not
   look fixed is not one, whatever its number says.
2. The gate's numbers on master and on your tip; the re-sweep's class table beside stage 1's; no site that
   was clean on master has a fault (name any that does).
3. The same tiles with `gfh=1` removed, at Crossing fade 0 and 1.2 (`fl` in the link), and on
   `?3&xp=off&am=instant&rp=gf`: the fix holds, or say where it does not.
4. `hold.mjs` (`.claude/probes/K1450/`) 60/60 warm on link A; `npm test` green (digests re-frozen and named);
   the K1436 bar with `STRICT=1` on `ring,def` (`pwsh -NoProfile -File .claude/probes/K1436/k1436_bar.ps1
   -Ref <tip> -Base origin/master -HomeFlag 1 -Scenes ring,def -Port <p> -Tag k1482s2`): PASS, or each new
   site named and looked at.

A partial result lands: one class fixed and seen on the tiles is the goal. Do not stop at the cause, and do
not stop because the fix is in a file another stream also edits: keep the diff small and rebase.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- Files: `tables.ts`, `eval.ts`, `gf_glsl.ts`, `gf_keys.ts`, the junction and border code in `gf_look.ts`,
  their tests. Others at work: the frame-time agent (K1468 stage 2) is finishing in the packed target's
  writes in `gf_pass.ts`, `gf_app.ts`, `gf_split.ts`, `gf_glsl.ts` (fetch origin/master again before you
  first edit `gf_glsl.ts`); Muse batch 26 works in the main checkout on the reach windows' build time in
  `tables.ts`, the fill colour and the j64 fill line in `gf_look.ts`, then K1477 (the stub past a crossing:
  not yours; j138, t36s, t70s, j81 and j139 look like its class). Rebase on origin/master before the
  handoff. Do not change any file in the main checkout. Never merge the probe branch `k1482-gwoff`.
- **Memory and disk.** One Chrome at a time, at most two preview builds (`scripts/preview.ps1 -Port <p> -Ref
  <commit>`), profiles under `$env:TEMP\k1482s2-*`, all deleted when you stop. Before each build or Chrome
  launch wait in ONE blocking loop (15 minutes at most) while `FreeVirtualMemory` is under 3 GB or
  `(Get-PSDrive C).Free` is under 8 GB. Stop to report only if C: is still under 5 GB after that wait.
- A profile is warm only for the exact links it has loaded; a gf frame counts only once gf composes.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5680-5699. Headed, real-time Chrome, never `--virtual-time-budget`. No perf numbers: do not take the
  perf lock.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files and sheets, not raw frames).
  Never push. Never edit LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Own the technique. For anything open at the stop line, report what you tried and why each attempt fell
  short.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone),
whichever comes first; not before, while a fix is still untried. A compaction is not a stop: re-read this
brief and `git log`. On stopping: commit WIP, append `### Handoff K1482 s2` here, commit, and report: what
holds, the sheets' paths (each site named), the numbers, which commits are confirmed on screen, a `Ledger
items` list and K1482's handle fields.

### Handoff K1482 s2

Agent worktree `agent-a8d924c8a5107064c`, branch `worktree-agent-a8d924c8a5107064c`, rebased on origin/master
7c739b42. The fix is 0a84d3d1 (was 8afa59e9 before the rebase): in form B, an END piece whose foot is the open
chain's first or last vertex and which belongs to a junction group (`mg >= 0`) sinks its key by `10 * zt` (= amp,
one full pass), so a fused tail's round cap passes UNDER the thread it meets instead of drawing its outline over
it. `tipSink()` in `gf_glsl.ts` (three key loops: SPLITK, default, PGRP/PKS) and its mirror in `eval.ts`. The
digests in `test/render/gf_home_glsl.test.ts` were re-frozen: app sources 96a8eb14... -> 9064f282..., probe sources
4390c49c... -> eca8fee6.... Confirmed on real screens (link A, 1600x900 DSF 2, hash fff8c9e5, master 056e1e0e vs
the tip's preview, tables identical apart from timing).

**The gate** (`mirror_caps.py`, screen + frozen-table mirror; `out/s2/scr/mirror_caps_{master,tip}.tsv`): sites with
>= 20 px of on-screen cap ink, master -> tip: sliver 23 -> 0, clean 10 -> 3, wedge 9 -> 0, break 1 -> 0, dash 1 -> 0,
dot 1 -> 0, notch 2 -> 0 (stub, tick 0 -> 0). Sites with any cap ink on screen: sliver 32 -> 13, clean 155 -> 146,
wedge 13 -> 4.

**The sweep, the scoreboard** (`out/s2/classes_tip.txt`: stage 1's eye classes minus the sites the sheets show
fixed; only sites whose screen changed can change class, and every one of them was looked at): **85 -> 54 of 327
faulted.** By class (stage 1 -> tip): sliver 33 -> 14, wedge 19 -> 11, notch 11 -> 9, dot 7 -> 6, break 3 -> 2,
dash 4 -> 4, stub 3 -> 3, tick 5 -> 5.

**Sheets** (`.claude/probes/K1482/out/s2/`, master | tip | diff, 4x, red = tip darker, green = tip lighter):
- `sliver_00..04.png` (gfh=1). Fixed (19): j0 j3 j21 j61 j62 j76 j120 j139 j157 t0s t1e t6s t25e t26s t36e t41s t51e
  t77s t83e. Open, improved (a hairline stays where the cap was): j77/t64e, j102/t62e. Same as master, not a cap:
  j71 j95 j138 j147 t30e t43s t56s t70s; j126 and t55s shortened, still open (j138, t70s are K1477's).
- `wedge_00..02.png`. Fixed (8): j6 j52 j101 t19e t36s t42s t53e t76e. Open, improved: t81s (a small step stays).
  Same as master: j15 j50 j81 j82 j143 j158 t23e t59s t73e t84e (j81 is K1477's).
- `changed_other_00.png`: the 12 other sites whose screen changed. Fixed: j5 (break), t37e and j123 (notch), j54
  (dot); t20e (dash) shorter, still open; j84 j83 t19s j51 j103 t14e j42 clean on master and still clean (a
  tail-cap merge removed). No master-clean site turned faulty.
- Carry-across: `nogfh_fl0_00..02.png`, `nogfh_fl1.2_00..02.png` (gfh off, Crossing fade 0 and 1.2; 2014 and 2894
  px changed): the same fixes at the same sites, nothing new. `s3_sites_00.png`: the bare `?3&xp=off&am=instant&
  rp=gf` design moves between captures (master vs master differs 146k px), so its third column is the frozen-table
  mirror's ink diff; 30 of 327 sites change, cap ink 750 -> 36 px, ink only REMOVED (0 px added anywhere); on screen
  the tail's dark cap no longer crosses the over thread at j76 j139 j103 j3 j84 j126 j101 t36s j83 j0 j95 j157 t81s,
  and j51's stray speck is gone.

**Checks.** `hold.mjs` on link A against the tip: 60/60 cold and 60/60 warm (min 7108 edges, max 8862). `npm test`
green after the rebase (254 files, 3169 tests). K1436 bar: see below.

**Look question for Levi.** Where a tail used to fuse into the thread it meets, its border now stops just short of
that thread, like an ordinary under pass (j76, j3, t25e, t26s). That is what the fix is, but it changes how a
dead end reads.

**Next.** The open slivers and wedges are no longer cap faults: on the tip each carries 0-4 px of cap ink (the
tsv's `cap_px`), and the remnants at j77/t64e (1 px), j102/t62e (0) and t81s (0) are not cap pixels either: what draws the hairline is untraced (inferred, not checked: the under
pass's border end where it meets the junction group); it needs its own trace (`tail_geom.ts` + the mirror's winKind per pixel, as stage 1 did for the cap). Then the 10 non-cap
wedges and the notch class (9 left), same method.