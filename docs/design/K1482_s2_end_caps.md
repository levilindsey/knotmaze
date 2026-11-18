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
