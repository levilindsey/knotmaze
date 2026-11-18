# K1469: put Muse 26B's reveal cut on screen (Claude agent stage, captures only)

Muse run 26B landed K1459 (01c72dfc, live since aad94eb7): during the appearance reveal, rp=gf's interior
fill is cut at junctions by today's own cuts (`lkJCut` in `gf_look.ts`; per-side cut margins in
`GfFxTable` from `g3Caps` and `junctionCutEntries`; `gf_app.ts`; `test/render/gf_fx.test.ts`). Only its unit
test and a rest frame were checked: its pinned reveal frames came out blank or frontier-glow only, with gf's
stats resetting between polls. That was most likely the cold-load GPU kill, fixed since (K1468, fc520c2d: a
cold load stays up with the watchdog on; gf's first composite takes 85-180 s cold, and a profile is warm
only for the exact links it has loaded). Read Handoff 26B in `docs/design/K1464_muse_batch26.md` first.

Nobody has seen this change on screen. Your job is the pictures and the counts, not a fix.

## Do

1. Copy Muse's probes from the main checkout, read-only source:
   `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1459\` (`k1459_cap`, `k1459_guard2`) and
   `.claude\probes\K1431\` (`k1431_inkcmp`) into your worktree if they are not tracked. Do not change any
   file in the main checkout.
2. Three builds: `01c72dfc~1` (before the change), origin/master, and today's
   renderer on origin/master (no `rp=gf`). Warm one profile per build with the exact links.
3. Pinned reveal frames (the handoff's pins) at three or more reveal times on the handoff's links: today |
   gf before | gf now, whole frame and 4x crops at the two junction spots the handoff names, plus six more
   junctions you pick (fused ends and wedge sides both). Confirm first that a pinned gf frame is not blank:
   if it is, find out why (gf's stats, context loss, the pin and the async compile) before anything else,
   and report that as the finding.
4. The handoff's counts: `k1459_cap` + `k1459_guard2`, `k1431_inkcmp`'s counts and ghost, and an instant
   (`am=instant`) sheet pair showing the rest frame is unchanged by 01c72dfc.
5. Look at every tile. For each junction say: the cut sits where today's does / on the wrong side (lkJCut's
   lateral sign) / missing / over-cut, and whether 01c72dfc made the spot closer to today, the same or worse.

## Done

Sheets under `.claude/probes/K1395/out/26B/` in your worktree (committed with `git add -f`), the counts, and
a plain verdict per spot. If the cut is wrong, say exactly where and how; do not edit `src/`.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- Files: `.claude/probes/` only. Nothing under `src/` or `test/`.
- **Memory and disk.** One Chrome at a time, at most two preview builds at a time, profiles under
  `$env:TEMP\k1469-*`, all deleted when you stop. Before each build or Chrome launch read
  `Get-CimInstance Win32_OperatingSystem` and wait (one blocking loop, 10 minutes at most) while
  `FreeVirtualMemory` is under 3 GB. Stop to report if `(Get-PSDrive C).Free` is under 5 GB.
- PowerShell. Read code through the shell; the Read tool only for images.
- Ports 5620-5639. Headed, real-time Chrome, never `--virtual-time-budget`. No perf numbers: do not take the
  perf lock.
- Commit WIP at every milestone. Never push. Never edit LEDGER.md. Never use bare `git stash`. Never touch
  the phone.

**Stop rule.** Stop when Done holds, or after 1 h of wall clock (`Get-Date` at each milestone), whichever
comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`### Handoff K1469` here, commit, and report: the sheets' paths, the counts, the verdict per spot, a
`Ledger items` list and K1469's handle fields.

### Handoff K1469 (Claude agent ab2cc2513ac20a475, 2026-11-17, stopped at 1 h: the first confirm failed, so the cut check itself was not run)

Started 19:08 PST, stopped about 20:00 PST. **Finding: on origin/master (cc1ee890) rp=gf's reveal draws NO thread ink at all, only the frontier glows/particles, so there is no reveal cut on screen to judge.** Not the cold-load kill (K1468: 0 `webglcontextlost` in every run), not the pin, not compile lag:
- Pinned frames (burn `b.FMKB4DIQ` and trace-rainbow, 8 times each, today next to gf): `.claude/probes/K1395/out/26B/cap/M_def_{today,gf}_{0-7}`, `M_tr_{today,gf}_*`, `M2_def_gf_*`; montages `M_def_f4_whole.png`, `M_tr_f257.png`, `M2_def_f245.png`. Today shows full thread ink (f4: ~50 threads); gf shows only grey glow blobs at the frontiers and nothing else at any of the 8 times, both looks. The gf stats climb normally (composites, rvPasses, rvKnots 100-300, rvActive 10-20).
- UNPINNED (live) reveal on a warm profile: `live/M*_def_gf_*`, `M_def_live_234.png`, `M2_live.png`: the same, glows only, no ink, from clock 1 to the end.
- Compile lag ruled out: each program takes about 30-90 s to compile on this machine under load and a reload restarts the compile queue (stats `compileIssued 2 / compileReady 1` for the first 90 s of every load; the disk cache did not carry the reveal programs across loads here), so I held a pin at t=7.984 from load until `compileReady` 9 (about 230 s), then dropped the pin (`delete renderer.advanceClocks`, `delete revealFx.revealAnim.tick`) and let the reveal run live: `pw/pw_r{1-9}.png` (pinned, all programs ready: glows only), `pw/live_*.png`, montage `pw_live.png` (live, all ready: glows only, no ink, even as the reveal covers the maze). So with every compile finished gf's reveal on master still draws no ink. Muse's own 26B handoff saw the same ("only frontier glow") and put it down to the pin; it is not the pin.
- Not found: why. Candidates to read next: `gfRevealing(r)` / `rvDrawn` (gf_app.ts ~958) is true (rvPasses rises), so the reveal form draws; the ink goes missing in the look composite's `uFxLive` branch or the FX interior fill (K1395 24D, `fxShow`/`fxSnap`: `LOOK_COMP_FS` uRvFx), or the K1456 async-compile gate routes the reveal to a set whose composite reads an empty look table. b42188db (synchronous compile) drew ink per Muse, so bisect the K1456 commits for the first frame with ink (`k1469_pinwatch.mjs` + `k1469_live.mjs` are the harness: pin, wait for `compileReady`, shoot).

Not done (stopped before them): the `01c72dfc~1` (before) build's frames, the 4x crops at the two junction spots and six more junctions, `k1459_cap` + `k1459_guard2` counts, `k1431_inkcmp` counts/ghost, the `am=instant` pair. Per-spot verdicts: none can be given (the cut is not visible because the ink is not drawn); 01c72dfc's cut is neither confirmed nor refuted, and the lateral-sign question is open. The previous summary's reading that today's frames show ink is the reference: today f4 `cap/M_def_today_4.png`.
Probes written (all `.claude/probes/K1459/`): `k1469_cap.mjs` (cap with context-loss count, XARGS, NOWARM, `r >= 2` gf wait, direct re-pin), `k1469_live.mjs` (unpinned frames with stats), `k1469_pinwatch.mjs` (pin from load, shoot at each compile, then unpin and shoot live), `k1469_warm.mjs`, `k1469_rest.mjs`. Cleaned up: servers 5620/5621 stopped, `$env:TEMP\k1469-*` profiles deleted, the worktree's `node_modules` junction removed.
