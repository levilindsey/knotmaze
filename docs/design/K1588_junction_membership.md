# K1588: a junction keeps its under thread near the joint (Claude agent stage; tables, CPU mirror, GLSL)

## Why

Levi named six places on A_3 (2026-11-24): a border that runs across the under thread and pinches it (x195, x338,
x37), and a sliver or notch of border into a junction (x303, x227, x132). He asked why the border construction
makes these when the geometry would not, and ruled out reshaping the under pass. The audit (page:
https://claude.ai/artifact/FWGCtjSn8UGDvyKLoeGi7d) found one cause for all six.

`member()` decides which pieces are one junction shape. Inside an arm's home interval that is `homeRamp(|z|)`
(K1438): full below `zt`, none above `fadeLength * amp / win`. When a crossing sits within about 1 to 1.5 thread
widths of the junction, the under thread is already past that depth at the joint, so it drops out of its own
junction, and the joining arm's border is inked across it. At x195's worst pixel (10.2600, 15.6033): chain 45 (the
under thread) z -0.387, home group 101, ramp 0; chain 76 group 101, ramp 1; ink 1.0. At x227 (22.5017, 10.9485):
chain 77 z -0.175, ramp 0.115, ink 0.79. `layers()` itself is sound: given the right members it draws the edge of
the merged shape. s28 and s34 patched sub-cases of this same failure.

## The probe (a starting point, not a spec)

`.claude/probes/K1588/audit/eval_probe.patch` (against stage 4's `eval.ts`), mode `AUDIT_HOME=3`: a home sample
within `2h` of its arm's root is a full member whatever its depth, unless the crossing that cuts the arm is with a
thread of the arm's own group (K1438's worse site: two arms of one junction crossing each other). CPU mirror, A_3,
1200 x 1200, no gaps: 400 ink px change at 54 places, every one a removal; the six named places clean; the 12
largest viewed, each cleaner or unchanged. Mode 1 (full member over the whole home interval) removes real borders
near x49, x337, x207 and x110; mode 3 changes 0 px there. Not tested: the shader, the gap pass (it keys on the
pixel's label piece), the fill order (the probe compared ink only), any other maze. Tools in that folder: `mir.ts`
(mirror dump of a window), `why.mts` (per-piece record at a point, `x_y`), `clus.py` (changed places),
`place.py` and `sheet2.py` (pictures), `near.mts` (gap class against the distance to the nearest junction root).
Run them from the worktree root with `GF_SRC` set to it.

## Goal

Levi's look, in the real render (rp=gf, gaps on): the six named places clean, and no border lost that should
stay, on all 21 test mazes. The technique is yours. The `2h` length is a guess (the joint's footprint may need to
follow the sibling angles), and so is the same-group exception. A surface's key is the highest of its members', so
check the fill order where the over thread passes inside the footprint.

Binding: the under pass keeps its width and its heading; never remove a thread's border; never trade a hook for a
point; the crossing fade (`fadeLength`) stays live with no table rebuild, and past the footprint membership follows
it as today; gf's border look is its own.

## Done

1. **The rule in `src/`.** `tables.ts` (one float per arm if needed; report the table size), `eval.ts` `member()`,
   and the GLSL mirror (`gf_glsl.ts` `member` / `homeForm`; `gf_keys.ts` bins if the reach changes). CPU and GPU
   agree by the existing parity tests. `npm test` green; name every pin you re-freeze.
2. **The six named places**, real render at 4x, stage 4 | new, on one sheet. Look at each yourself.
3. **Every changed place on A_3** (whole-frame diff against stage 4's capture): sheets of all of them, each viewed;
   a list by kind (stub gone, notch gone, unchanged to the eye, border lost, other). A lost border is not done.
4. **The other 20 mazes:** changed-place counts per maze, sheets of all places, the 12 largest per maze viewed;
   say which sheets you did not view.
5. **Gaps, measured only:** stage 4's counter (`.claude/probes/K1584/s4/counts.ps1`, `cntsum4.py`) on the 21
   mazes, stage 4 against new: full, reduced, window-cut, closed, reads closed. Change no gap rule.
6. **Cost:** no new loop in `member()`; member calls and segments per active pixel on def and muse_hash, before
   and after.

## How to work

- `Get-Date`. Then `git fetch origin`, `git reset --hard e8aab8b50` (K1584 stage 4, the look Levi is reviewing),
  `git merge origin/master` (this brief and the probe tools). If `node_modules` is missing, make it a junction to
  `C:\Users\lsl\Repositories\knotmaze\node_modules`.
- Yours: `tables.ts`, `eval.ts`, `gf_glsl.ts`, `gf_keys.ts`, `gf_pack.ts`, their tests, `.claude/probes/K1588/`.
  Not yours: `gf_look.ts`, `gf_app.ts` (the K1584 stage 5 agent works there in another worktree), `LEDGER.md`.
- Stage 4's captures and counts are in
  `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a2dfb242b056cf793\.claude\probes\K1584\s4\`
  (`out\s4g\<maze>\`, `cnt\<maze>_s4.json`): read them, write nothing there. Its tools and recipe: the handoff in
  `docs/design/K1584_s4_brief.md` (captures: `.claude/probes/K1584/s3/capmany.ps1` under `scripts/perf_lock.ps1`;
  the other agent captures too, so wait for the lock inside one blocking command). Preview ports 5610 to 5619.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Commit WIP at every milestone, broken or not (`git add -f` for probe tools, never for their outputs). Never
  push. Never use bare `git stash`. Never touch the phone. No Chrome `--virtual-time-budget`.
- Helpers on sonnet, mechanical work only, with this stop rule. Looks are yours.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone), whichever
comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`## Handoff K1588` here, commit, and report what holds, the sheet paths, the numbers, a `Ledger items` list and
K1588's handle fields (owner, branch, last commit, evidence, next).
