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

### Handoff K1482

2026-11-17, Claude agent, branch `worktree-agent-a9a536be366802d97` (rebased on b01cc37b). No source change survives:
src/ and test/ equal origin/master. Evidence: `.claude/probes/K1482/` (scripts in its root, results in `out/`).

**Sweep (Do 1, done).** Master 0007c8df, link A at hash fff8c9e5, 327 sites, every 4x tile looked at:
clean 242, sliver 33, wedge 19, notch 11, dot 7, tick 5, dash 4, break 3, stub 3. Files: `out/sites.tsv`,
`classes_master.txt`, sheets `out/master/sheets/gf_00..10.png`, faults largest first `faults_00..03.png`.
Today's renderer on link A draws fragmentary strokes whose geometry differs from gf's, so it cannot serve as
the "where a stroke runs" reference here.

**Fix 1 tried and reverted.** bd6ca0e5 (a 2x2 grey opening of the border alpha in LOOK_COMP_FS): specks in the
site tiles 519 -> 13, but `pieces.py` finds 14 sites whose 1-px sliver necks it cut into dashes (j0 j3 j60 j71
j77 j139 t0s t1e t25s t25e t30e t46e t64e t77s, two of them master-clean), and the visible classes are unchanged
(`out/tip/sheets/ab_00..04.png`, `newbreaks.png`, `zoom8.png`). Reverted in 4c76c6b5. Every site therefore
stays "same as master".

**The sliver class's cause (diagnosed, not fixed).** Falsified first: crossing angle (sliver tails' median
89 deg against clean 87, `out/master/angles.txt`) and the gap window (a uGwLive=0 probe build, branch
`k1482-gwoff` 6dc43631, never merge: it removes only the K1477-like eyes at j81 j138 j139 and breaks 49 sites,
`out/gwoff/`). The CPU mirror (GfEval, form B, no look) shows it: at 32 of 33 sliver sites a winKind 3 term
(an open end's round cap, `eval.ts` `wk = this.pend[j] ? 3 : 1`) draws ink; 23 of them put >= 20 px of it on
screen, against 10 of 242 clean sites (`mirror_caps.py`, `out/master/mirror_caps.tsv`,
`zoom/mirror_slivers.png`). `cap_surfaces.ts` (`out/master/cap_surfaces.txt`) shows the same layering at
t55s, t64e, t0s and j62: the chain's END piece sits in a junction-group surface (S149, S79, S150, S63) at
the group's key, about -0.09, and outranks a neighbouring under thread still in its dip (key -0.12 to -0.20,
its own surface), while an over thread sits above both (+0.3 to +0.45). So the end's cap outline is drawn
across the neighbour's body, and the eye between it and the neighbour's edge stroke is the sliver. The wedge
class shares it at 9 of 19 sites.

**Next.** Make the end piece's cap yield to a covering neighbour it should pass under: either give an end
piece its own chain's depth key instead of its group's flat key (tables.ts arm groups; this moves the K1362
tables digest), or bury a cap term under any higher-ranked surface whose tube holds the cap's edge point
(form B: gf_glsl.ts, another agent's file, plus the eval.ts mirror). Gate it with `mirror_caps.py` (sliver
sites with on-screen cap ink, 23 -> 0, clean 10 not rising), then the 4x today | master | tip sheets, Do 3's
carry-across, hold.mjs 60/60 and the K1436 bar. Not run this session, because no fix was kept: Do 3, hold.mjs
and the bar.
