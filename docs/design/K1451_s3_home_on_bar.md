# K1451 stage 3: the reach window's home-on leftovers (Claude agent stage)

Stage 2 (`docs/design/K1451_s2_reach_window.md` on branch `worktree-agent-a53218bf2f47c89c2`, read it whole,
Handoff K1451 s2 above all) built the per-pin, per-side key window (max(0.658, 1.15 x the reach)) into
`tables.ts`, `eval.ts`, `gf_glsl.ts` and `gf_pack.ts`, **only with home membership (`gfh=1`)**; home off is
master's, bit for bit. It is not merged. The coordinator looked at its GPU sheets
(`.claude/probes/K1451/out/s2/sheet_a.png`, `sheet_b.png`): at spots 1-8 master's grey smear over the under
thread is gone and the over outline runs on. That gain stays. What blocks the merge:

1. **The home-on bar census regresses**: master 14/0/11/399 (stray/hard/paper/broken), stage 2 21/11/11/393.
   Seven new stray finds (the largest near crossing x68 in the two ring scenes, 1987 and 3687 px, and near
   muse_hash junctions j50, 2943 px, and j36, 1911 px) and eleven new hard edges (7 in muse_hash, 4 in the
   g41 tw64 scenes); list in `.claude/probes/K1451/out/s2/bar_home_new.txt`. Nobody has looked at them.
2. **Fade 0**: 16 new thin finds; on the GPU bigger dark crescents than master at g41_def_tw64:34.66:13.94
   and :6.26:32.46, and a notch at g41_user_tw64:16.20:5.30.
3. **Spot 7** (muse_hash:16.17:18.39): the ink is fixed, the chain colour changed (pink to lilac, a pink
   fragment left).
4. Owed: the GPU census (one of six scene groups wrote output, cause unknown) and the bench (the first link
   timed out after 120 s of loading). The table build is 39% slower over 12 scenes and 295% on fat.

Not in this stage: sheet spots 9-12 (the cfg dashes, K1462) and windows with home off.

The bar is Levi's: at a crossing or junction the over thread's outline runs on unbroken, with no dot, stub,
wedge, tick, notch, sliver or smear; and nothing drawn that today's renderer does not draw.

## Do

1. Crop each of the 18 new home-on finds at 4x on the GPU (today | master gf, home on | stage 2, home on),
   look at each, and name what it is. Then fix the cause, keeping spots 1-8: candidates are a cap on the
   reach, a reach that stops at the next pin or at a junction's home, and the same key depth where
   `member()` splits a crossing's ribbons into blocks. Decide by the crops, not by the count.
2. The same for the fade-0 crescents and the notch, and spot 7's colour.
3. Cut the reach calculation's build time (a tandem walk bounded by the next pin; reuse per crossing).
4. Then the owed checks.

## Done

1. Home-on bar census: no category above master's, find by find (a matched find no larger than master's by
   more than 10%); home off still equal to master (141 finds matched, c5's 29 spots identical).
2. The scan at `gfh=1`: tie at most 45 (stage 2 had 35, master 176), all at most master's, no new find; at
   fade 0 and 1.2 no class above master's and the three fade-0 spots no worse than master on the GPU.
3. A 4x GPU sheet under `.claude/probes/K1451/out/s3/` of spots 1-8, spot 7 close up, the 18 finds of Do 1
   and the three fade-0 spots (today | master gf | your gf), every tile looked at and named fixed, same as
   master, or open.
4. GPU census equal to the mirror (find out why five groups wrote nothing; stop preview servers first and
   run no CPU census beside it).
5. Tables digest, pins, pooled builds equal to cold (`k1362t2_digest`); the tables build within 10% of
   master over 12 scenes and on fat, home on.
6. `hold.mjs` (`.claude/probes/K1450/`) 60/60 on `?3&xp=off&am=instant&rp=gf` and
   `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`. `npm test` green.
7. Bench last and alone (`k1362c1_bench.ps1`, perf lock: wait for it inside one blocking command, never
   overwrite another owner's lock): GPU and work p50 within 5% of master. If the load step times out, find
   out why before retrying (a new build's first gf load takes about two minutes to compile).

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, then
  `git merge worktree-agent-a53218bf2f47c89c2` (stage 2's branch; resolve pins toward stage 2's and re-take
  them), `Get-Date`.
- Files: `tables.ts`, `eval.ts`, `gf_keys.ts`, `gf_pack.ts`, the field evaluation in `gf_glsl.ts`, their
  tests, the census tools and `.claude/probes/K1451/`. Stay out of `gf_look.ts`, `gf_pass.ts`, `gf_app.ts`,
  `gf_reveal.ts`, `gf_explore.ts`, `gf_split.ts` (Muse batch 26 and the K1460 agent). Muse batch 26 run A
  is touching `test/render/gf_home_glsl.test.ts` in the main checkout: rebase on origin/master before the
  handoff and re-take the pins.
- Another agent builds a new scan under `.claude/probes/K1436/`; leave it alone and use stage 2's tools.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5540-5559. Headed, real-time Chrome, never `--virtual-time-budget`.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files and sheets, not scan dumps).
  Never push. Never edit LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Helpers run on sonnet for mechanical work (scans, sheets), with this stop rule.
- Own the technique; do not stop at the cause. For anything open at the stop line, report what you tried
  and why each attempt fell short.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone),
whichever comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP,
append `### Handoff K1451 s3` here, commit, and report: what holds, the sheets' paths (each spot named
fixed, same or open), the numbers, a `Ledger items` list and K1451's handle fields.

### Handoff K1451 s3

Stopped at the 2 h line (13:53 to 15:53, 2026-11-17). Code: 1329b88d (the arm clip `clipPinWindows` in
`tables.ts`, `GF_NOCLIP=1` turns it off; pinReach's walk starts at `win / GF_REACH_K` and its partner search
is linear). Sheets: 09599829 and 06ed6c9d. Not rebased on origin/master; the pins were not re-taken.

**The fix.** A pin inside a junction arm's or home's interval keeps `win` on both sides; any other pin's
reach window stops at the nearest arm interval. That removes stage 2's in-arm hard edges, the j78/j62/x301
strays and the fade-0 crescents. It also takes spots 5 and 7 back to master; I found no rule that separates
the two cases.

**Sheets** (`.claude/probes/K1451/out/s3/`, columns today | master gf | this gf, 4x on the GPU):
- `spots14_clip.png`: spots 1-4 fixed.
- `spots58_clip.png`: spots 6 and 8 fixed, 5 and 7 same as master (open).
- `spots58_close.png`: spots 5 and 7 at span 3, 0 px against master. Same as master (open): spot 7's colour
  wedge is master's.
- `finds_0.png`:
  - muse 5.869:8.912 and 22:18.59 are the same as master;
  - muse 30.52:20.278, muse 21.764:34.337 and ring 19.619:20.254 are fixed (a crisp over-outline where
    master smudges).
- `finds_1.png`:
  - g41_ring 19.773:20.227 and 18.08:20.722 are fixed (master's smudge is gone);
  - muse_hash 29.189:24.015, 16.796:3.917 and 16.827:4.187 are the same as master (0 px).
- `finds_2.png`, `finds_3.png`: the muse and g41 tw64 finds, all 0 px against master, so the same as master.
- `fade0.png` (fade 0): the three fade-0 spots, 0 px against master, so the same as master.
- `new18_s2.png`: stage 2's look at the 18 finds, for reference.

**Numbers.**
- Bar census, home on (`k1407c1_bar.ps1 k1451mh k1451s3a`; JSON in
  `.claude/probes/K1362/out/s1/census_k1451s3a*`):

  | Census | stray | hard | paper | broken | total | excepted |
  |---|---|---|---|---|---|---|
  | master | 14 | 0 | 11 | 399 | 424 | 57 |
  | this | 19 | 0 | 11 | 394 | 424 | 57 |

  The five extra strays are x68/x67 (ring, g41_ring) and j36/j50 (muse). In the crops they are crisp
  over-outlines where form B and master shade softly, so they read as fixed, but stray stays above master by
  count. Every master stray is still there with identical px. Home off is equal by construction (the windows
  sit inside `if (home)`), and the digest confirms it.
- Digest (`k1362t2_digest`): b0fc8ce3377f..., 5643 lines, 297 pooled builds equal to cold, 0 mismatches.
- Tables build (`k1451_buildtime.ts 5`, no load): 12 scenes 166.3 to 182.8 ms (+9.9%, inside 10%). Fat 5.44 to
  7.11 ms (+30.6%), def +30.9% and user_tw42.lightpaper +37.1% are outside it. Under census load the 12 scenes
  were +19% and fat +55%. Open: the cost is pinReach's walk plus the partner search at every exit step.
- hold.mjs: 60/60 on both links (`?3&xp=off&am=instant&rp=gf` and the gfh=1 link), on a `preview.ps1` build
  of 1329b88d. Against the dev server, hold timed out in `waitForFunction`: a CDP protocol timeout while the
  dev server compiled. The first composite took 129-148 s even on the build.
- `npm test`: green (251 files, 3120 tests). An earlier run, with 878 MB free on C:, ended with 2 worker errors and 249 files; with the disk freed it passes.
- GPU against the mirror at the sheet spots: max|ink| 0.9-0.9998 at several muse/g41 spots, identical on
  master and this build (pre-existing, not from this stage).

**Not run (open).**
- The GPU census, and why five groups wrote nothing. Inferred, not proven: my first CPU census lost four of
  six groups to "Fatal process out of memory: Zone" under commit-memory pressure (node 11 GB, Chrome 4.7 GB),
  and the same may have hit the GPU census groups. Two groups at a time completed.
- The scan at gfh=1 and at fade 0/1.2 against 1329b88d.
- The bench (`k1362c1_bench.ps1`).
- The rebase on origin/master and the re-taken pins.

**Machine.** Disk C: ran full twice (33 MB, then 878 MB free); other agents' Chrome profiles in `%TEMP%` refill
it. I deleted only K1451's own stale profiles.

**Next.**
1. Find a discriminator that keeps the spots 5/7 fix without the in-arm hard edges. Candidates: clip only
   the side of the window that faces the arm, or clip by the arm's z rather than its interval.
2. Cut pinReach's build time (fat +31%).
3. Run the GPU census two groups at a time, the scan and the bench.
4. Rebase, then re-take the pins.
