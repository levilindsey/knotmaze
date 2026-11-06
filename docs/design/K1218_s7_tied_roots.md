# K1218 S7: the swept arc continuous where its roots tie, and the branch ready to merge

Ledger: K1218. One Claude Opus stage agent in its own worktree, the only code agent in junction files
while it runs. Cap 2 h. Ports 5980-5989.

## Goal

Levi, 2026-11-05: "These junctions need to appear as though they are one whole fused seamless
unit." S5 and S6 (branch `worktree-agent-ae639b326ea18b921` at 626a5a21, not merged) built
`sweptArc`: a web paints each arm at the arc its own ribbon gives the pixel (GLSL in
`junction_field.ts`, its mirror in `ribbon/joinery.ts`). It smooths many of master's steps (ji 80,
ji 115, loop ji 113, cross ji 33's pulse seam, x4 ji 108 and 147, loop ji 89, 88, 80 and 47), but two
flaws hold its merge. S6's handoff, at the end of `docs/design/K1218_s6_swept_arcs.md` on that
branch, has the evidence. Make the branch mergeable:

1. **Cross ji 155's streak** at device (777-789, 679-682), t2-t5, seen without markers: where
   several roots tie (row 680: segments 0, 2 and 3 at rho 0.311, |l| beyond fh), the winner flips
   from row to row and the arc jumps (0.172, then 0.021, then the joint). Make the arc continuous
   through such ties, wherever they occur. S6's untested leads: blend near-tied roots' arcs; hand
   over to the projection where the candidates' arcs disagree; kappa = max(kappa at rho, kappa at
   the winner's foot). The technique is yours.
2. **Cross ji 33's crease** in (650-676, 802-816) at t5 and t6: the largest luma second
   difference reads 3.2-5.6 on the branch against master's 1.9-2.9 (`ramp_s6.mjs`), worst at
   (656-659, 806-808). S6's lead: the same root switch.
3. **Every other junction**: S6 viewed only the largest groups of master against the branch;
   about 50 more per stand are unviewed (`s6/out/mvc/`). Build a check that scores, per group, at
   rest and t3-t6, where the branch is rougher than master (edges both builds share dominate a
   box's maximum: compare the two builds' second differences pixel by pixel). View every group it
   flags at full size, and fix what reads as a line, streak, step or crease master lacks.

Not in this stage: dark edges inside junctions and x4 ji 101's violet sliver (K1231), cross ji 51's
spur (K1228), web rims' MSAA steps (K1227), a strip edge's 1 px offset (K1229).

Looks that stay: S2's fused gold, S3's smooth gap edges, S4's gold edge, every spot the branch
smooths (above), and everything under "Looks that stay" in `docs/design/K1218_s2_fused_junctions.md`
(the pulse's split and run, no dark wedge between lit siblings, never the whole junction lit, the
gold path's round edge, no gold nub in an off-route arm). Mode 0.

## Authority

Every technical decision is yours: the technique, the masks, coverage and fades, the section and
gold composite, the paint and its CPU mirror (`paint_math.ts`), the pulse terms, the fan's geometry
and records. No numeric gate: tests pin what you built, they don't define done. When you find a
cause, fix it; don't stop to report it. Where a call leaves a look open, pick what reads closest to
one fused unit and say what you picked. Re-freeze any pin your change moves and name it in the
commit message.

## Start

- Your worktree starts at master. Take the branch first:
  `git merge --ff-only worktree-agent-ae639b326ea18b921` (626a5a21 sits on master's e72e6768).
  `New-Item -ItemType Junction -Path node_modules -Target C:\Users\lsl\Repositories\knotmaze\node_modules`
- Tools: S6's in `.claude/probes/K1218/s6/` (`swept_s6`, `ramp_s6`, `row_s6`, `windiff_s6`,
  `sheets_s6.ps1`, `run_shots_s6.ps1`; headers give usage), S4's in `s4/` (`near_s2`,
  `nomark_s4`). Copy any you change into `s7/`.
- Read-only shots: master's in the main checkout's `.claude/probes/K1218/s4/out/b2/`; the branch's
  shots, no-marker shots, diff tables and sheets in
  `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-ae639b326ea18b921\.claude\probes\K1218\s6\out\`;
  7474d09b's in `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1211\out6\r7474\`. Shoot
  master's no-marker shots yourself if you need them.

## Done

1. Cross ji 155 without markers, at t2-t5 and at rest, and cross ji 33 at t3-t6: sheets at zoom 4
   with rows master, S6's branch, yours, in `.claude/probes/K1218/s7/out/sheets/`. Neither shows a
   streak or crease master lacks.
2. The check from item 3 for x4, loop and cross, its table in `s7/out/`; you viewed every group it
   flags, and none shows a line, streak, step or crease master lacks.
3. Re-shot on your branch, S6's `cross_80` and `x4_80` and S5's `cross_115` and `loop_113` still
   read smooth.
4. You viewed every crop at full size. Name any flaw you could not remove, and why.
5. `npm test` green after `git fetch -q origin` and a rebase onto `origin/master` (where only a
   pin's number conflicts, take master's side and re-freeze it to what your change gives).

## Rules

- PowerShell. Read code through the shell (Select-String, Get-Content ranges); the Read tool only
  right before an Edit, and to view crops. No helpers.
- Write only in your worktree. Output to `.claude/probes/K1218/s7/out/`; never `git add -f` a
  probe's outputs (a script may go in).
- Commit WIP on your branch at every milestone (each tool, each src change that renders), broken or
  not; never push; never edit LEDGER.md.
- Shots in real time (never `--virtual-time-budget`) under the perf lock (owner `K1218-S7`; wait
  for it inside one blocking command), at most two browsers, ports 5980-5989. A dev server's stamp
  is the SHA it started from: check the served code with a mark, as S4's tools do. Stop your
  servers.
- Out of scope (name it if a crop shows it; don't fix it): the text forks (K1220), fire and
  collapse (K1210), the pulse's timing (K1224), shader compile time (K1230).
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and each milestone); then
  commit WIP, append your handoff to this brief (after your final rebase) and report. A compaction
  is not a stop: re-read this brief and `git log`.

## Report

Short, in plain words: what you built; per spot, what you see against master; the sheets' paths,
with the two or three to show Levi first; the pins you moved; anything out of scope a crop showed;
the rebase; your last SHA. Commit messages carry the record. End with `Ledger items` and K1218's
handle fields (owner, branch, last commit, evidence, next).

## Handoff (S7, 2026-11-06, 04:39-06:00)

Done holds: items 1-5 below. The sheets and tables are untracked, in
`.claude/probes/K1218/s7/out/`.

**Built** (src; each commit changes the GLSL in `junction_field.ts` and its CPU mirror,
`cpuJunctionField` in `ribbon/joinery.ts`, together):
- `19c968f1`: cross ji 155's streak came from S6's nearest-root pick. Where several profile roots
  tie (the cut locus of arm 0's kink at vertex 2), the nearest root flipped from row to row, and
  the arc jumped with it. sweptArc now walks its candidates in arc order and weighs every unfolded
  root, so tied roots blend instead of flipping. A root's weight is the product of three terms:
  - smoothstep(0, ROOT_SEP 0.1, sep), where sep is its arc gap to the next folded root (0 where
    a caustic makes or ends it);
  - the reach cut, 1 - smoothstep(1.5 fh, 2 fh, l);
  - exp((fh - l) / FIELD_TIE_TAU), with FIELD_TIE_TAU 0.02.

  Coverage is the strongest weight without the exp, faded by the weighted mean length (fh to
  2 fh). The fold hand-over now reads each profile segment's own fan toward its bend's focus
  (z, o, dist). It used to read kappa at the pixel's radius, which missed the kink segment.
- `af626445`: the fan term faded from 0.5 to 1.5 fh past a fan's edge. The fans of nearby
  segments, which bend about twice as hard, then folded cross ji 115's and ji 80's arcs over to
  the projection, and the branch lost S6's smoothing there. The fade now runs from the fan's edge
  to 0.5 fh past it. Offline (`tie_s7.mjs` on the cross records), there is no arc jump beyond the
  natural slope at ji 155, 33, 115, 80 or 65 (max 0.0072). A tighter margin (0-0.25 fh) brings
  jumps back at ji 80 and 65.
- Pins:
  - K320's JUNCTION_FRAG budget (`test/render/k320_slim.test.ts`) went from S6's 35,635 to
    36,238, then to 36,225.
  - The junction-field text changed, so that program compiles cold once for every player
    (K307).
- Tools in `.claude/probes/K1218/s7/` (each header gives its usage):
  - `dump_s7.mjs` and `tie_s7.mjs`: a stand's junction records, and sweptArc run offline on them
    (S6's rule or this one), giving arc jumps and a window's d2;
  - `rough_s7.mjs` and `rough_all_s7.ps1`: the item-3 check over every stand, at rest and at
    t3-t6, both ways. It takes each pixel's luma second difference less master's largest within
    1 px, groups the pixels where that excess is at least 2 by the nearest junction within 70 px,
    and flags a group of 6 or more such pixels, or one whose largest excess is at least 6;
  - `flagsheet_s7.mjs`: a flagged spot's rows (master, S6, this branch, and this branch with the
    excess tinted);
  - `sheets_s7.ps1`, `nm155_s7.ps1`, `nm113_s7.ps1`: the sheets;
  - `run_shots_s7.ps1`, `locked_s7.ps1`, `vite.private-cache.config.ts`: the shots, under the
    perf lock.

**Spots.** This branch's shots are in `out/b2/`, on the same links, moves and frames as master's
`s4/out/b2` and S6's `s6/out/c`.
1. **Cross ji 155, no markers: fixed.** `sheets/cross_155_nomark.png` has rows for master, S6 and
   this branch at t2-t5, then an at-rest row. S6's row has the horizontal streak at device
   (777-789, 679-682); this branch's row matches master's.
2. **Cross ji 33's crease at t5 and t6: gone.** The table gives the window's largest luma second
   difference, x / y (650-676, 802-816; `ramp_s6`):

   | Moment | Master | S6 | This branch |
   |---|---|---|---|
   | t3, t4 | 1.4 / 1.5 | 1.4 / 1.4 | 1.4 / 1.5 |
   | t5 | 1.9 / 2.2 | 3.2 / 4.5 | 1.7 / 2.6 |
   | t6 | 2.0 / 2.9 | 4.9 / 5.6 | 2.1 / 3.1 |

   This branch is within 0.4 of master, a difference that does not show; `sheets/cross_33.png`
   matches master.
3. **The check (item 3).**
   - The table is `out/rough/summary_b2.txt`: a line per stand and moment, then its flagged
     groups. The per-run files are in `out/rough/b2/`.
   - Forward flags: cross has 2 groups at every moment (ji 65, ji 80). x4 has 6-9 per moment.
     Loop has none at rest and 2-3 per moment.
   - `out/rough/viewed_b2.txt` maps every flagged group to its row in `out/flags/A_cross.png`
     to `H_x4far.png`. I viewed them all at full size.
   - Every flagged pixel sits on a dark silhouette edge, where a casing or the background meets
     the fused field. There, the field's light side is 3-12 luma lighter than master's, flat up
     to the edge, with no rim. That is edge contrast, not a line, streak, step or crease.
   - The reverse runs show creases in master that the branch smooths: x4 ji 108, 147 and 80, x4
     @785,165 and @1615,62, and loop ji 88, 89 and 113.
4. **Looks that stay: smooth.**
   - `sheets/cross_80.png` and `x4_80.png` (ji 80): this branch's row matches S6's.
   - `cross_115.png`, `cross_115_50_15.png` and `cross_80_35_-15.png` still read smooth.
   - Loop ji 113 without markers (`loop_113_nomark.png`, `loop_113_nomark_top.png`): master's
     vertical staircase above the centre, at t0 and t3-t7, is gone here. In the marked
     `loop_113.png`, the head marker covers the centre.
5. **Flaws left:** none that master lacks. **Out of scope seen:** none.

**Show Levi first:** `sheets/cross_155_nomark.png`, `sheets/cross_33.png`,
`sheets/loop_113_nomark_top.png`.

**Rebase:** `git fetch -q origin`, then a rebase onto origin/master 478fd78a (a LEDGER-only
commit). All 22 commits replayed cleanly, with no conflict and no pin to re-freeze.

**npm test** on the rebased branch: green. 217 files passed and 2 were skipped; 2879 tests passed
and 9 were skipped.

**Next:** Levi views the three sheets, then this branch (S6 and S7) merges to master. K1231,
K1228, K1227 and K1229 are still open and untouched.
