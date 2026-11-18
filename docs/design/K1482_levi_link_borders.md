# K1482: rp=gf's border look on Levi's own link, junction by junction (Claude agent stage)

Levi judges rp=gf on `https://levi.dev/knotmaze/?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1` (border look, dark page)
and said on 2026-11-17: "I still see plenty of border artifacts." Since then the reveal's ink and the warm
repeat visit landed (K1472 stage 2, 2b0fe219), so the link now reaches gf's rest look and can be judged. Nobody
has swept this exact link at rest in the border look. That is this stage.

**The bar is Levi's approved look, not today's renderer's strokes:** at junctions and under-tail ends the over
thread's outline runs on unbroken, with no dot, stub, wedge, tick, notch, sliver, break or stray dash. gf's
border look itself (darker and heavier than today's) stays as it is (Levi, 2026-11-17: "Keep gf as it is");
never move it toward today's strokes. Today's renderer is a reference for where a stroke should run, and it
has faults of its own (wedge blobs at junctions): a spot where gf is clean and today is not is not a fault.

Rest link for captures: `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` ("link A"). A build's frozen
state lands on one of two physics hashes per link (fff8c9e5 / 10104c64 on link A): compare only frames in the
same state (retry the load until they match, as `.claude/probes/K1458/dragcheck.mjs` does).

Known from K1436 stage 3's screen scan (`.claude/probes/K1436/out/s3/worklist_named.tsv`, sheets
`out/s3/sheets/worklist_h1_*.png`, columns today fill | gf fill || today border | gf border; lore paragraph
"K1436 s3" in `.claude/rules/render-gpu-field.md`): gf's border stroke breaks at a junction where the arc
should run through (`g41_ring_tw42` j8, `user_tw42.lightpaper` j29), ends in a wedge or a notch
(`muse_hash` j81, lightpaper j23), and leaves isolated dashes (`g41_def_tw42` j132, j89). The scan's
precision is 75%, so every find needs your eyes. One class is already queued for Muse and is NOT yours: the
under thread's stroke tapering to a point and stopping past a crossing (ring x68, `g41_ring_tw64` j24, x67;
K1477, run 26H). If that class shows on link A, list its sites in the handoff and move on.

## Do

1. **Sweep.** On origin/master, link A at rest, 1600x900 DSF 2: one 4x tile per junction and per under-tail
   end (take the sites from the scene's graph, not from the scan), border look, with today's renderer on the
   same link and state beside it. Look at every tile and class each site: clean, or the fault by name (break,
   stub, wedge, tick, notch, sliver, dot, stray dash). Write the table (`sites.tsv`: site, x, y, class, px of
   the fault) and a sheet of the faults, largest first.
2. **Fix the largest classes**, one cause at a time: name the cause in the code, make a number that fails on
   master at that class's sites (pixels of fault inside a named box, or a count of sites), fix it, re-shoot
   every site of the sweep and check no clean site turned.
3. Carry each fix across: the same sheets with `gfh=1` removed, at Crossing fade 0, 0.14 and 1.2 (Levi drags
   it live; `fl` in the link), and on `?3&xp=off&am=instant&rp=gf` (default width).

## Done

1. `sites.tsv` and the fault sheet for master under `.claude/probes/K1482/out/`, every tile looked at.
2. For each class fixed: the cause in one sentence, its number failing on master and passing on your tip, and
   4x tiles today | master gf | your gf at each of its sites. Look at them yourself and name each site fixed,
   same as master or open. A fix whose tiles do not look fixed is not one, whatever its number says.
3. The sweep re-run on your tip: no site that was clean on master has a fault.
4. `hold.mjs` (`.claude/probes/K1450/`) 60/60 warm on link A; `npm test` green; the K1436 bar on two census
   scenes for a sanity check (`pwsh -NoProfile -File .claude/probes/K1436/k1436_bar.ps1 -Ref <tip> -Base
   origin/master -HomeFlag 1 -Scenes ring,def -Port <p> -Tag k1482` with `STRICT=1`): PASS, or each new
   site named.

A partial result lands: the sweep alone (Done 1) is worth merging, and one class fixed and seen is worth
more than three half done. Say plainly which commits are confirmed on the tiles.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- Files: the border and junction code in `gf_look.ts`, `eval.ts`, `tables.ts`, `gf_keys.ts`, their tests.
  Others at work: an agent on frame time (K1468 stage 2) edits the packed target's writes in `gf_pass.ts`,
  `gf_app.ts`, `gf_split.ts`, `gf_glsl.ts`; Muse batch 26 works in the main checkout on the pluck ripple, the
  reach windows' build time in `tables.ts`, the fill colour and the j64 fill line in `gf_look.ts`, then K1477.
  Keep the diff small and rebase on origin/master before the handoff. Do not change any file in the main
  checkout.
- **Memory and disk.** C: free space swings by 10 GB within minutes (the pagefile under commit spikes). One
  Chrome at a time, at most two preview builds (`scripts/preview.ps1 -Port <p> -Ref <commit>`), profiles
  under `$env:TEMP\k1482-*`, all deleted when you stop. Before each build or Chrome launch wait in ONE
  blocking loop (15 minutes at most) while `FreeVirtualMemory` is under 3 GB or `(Get-PSDrive C).Free` is
  under 8 GB. Stop to report only if C: is still under 5 GB after that wait.
- A profile is warm only for the exact links it has loaded; a cold gf load takes 85 s or more before gf
  composes, a warm one about 2 s. A gf frame counts only once gf composes (`composites` rising in its stats).
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5680-5699. Headed, real-time Chrome, never `--virtual-time-budget`. No perf numbers: do not take the
  perf lock.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files and sheets, not raw frames).
  Never push. Never edit LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Own the technique; do not stop at the cause. For anything open at the stop line, report what you tried
  and why each attempt fell short.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone),
whichever comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP,
append `### Handoff K1482` here, commit, and report: the sweep's table (sites per class), the sheets' paths
(each site named fixed, same as master or open), the numbers, which commits are confirmed on screen, a
`Ledger items` list and K1482's handle fields.
