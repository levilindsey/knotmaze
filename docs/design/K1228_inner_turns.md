# K1228: a ribbon covers its half-width on the inside of a tight turn

Ledger: K1228. One Muse fix run, which Claude starts through Paseo from this committed brief. It
works in its own worktree and pushes to master when Done holds. Cap 2 h. Ports 5940-5949.

## Goal

Levi (window 84): junctions must "appear as though they are one whole fused seamless unit". At
cross ji 51 (the `cross` stand of K1218 S5's tools, device px (1019, 1136)), 2-4 px of background
show inside chain 61's half-width (23.4 px), on the inside of a 40° left turn whose radius
(19-21 px, samples 532-533) is under the half-width. K1218 S5's Handoff, item 4
(`docs/design/K1218_s5_section_edges.md`, line 124), measured it and inferred the cause without
testing it: `ribbon_mesh.ts`'s CONCAVE-SIDE CLAMP caps the inner offset at max(0.95 R, 0.3 h), so
the ribbon thins into the turn and leaves a notch.

Test the cause first. Then make the ribbon cover its full half-width on the inside of a tight
turn, without bringing back what the clamp is for: P3.34's sawtooth seam, where the inner strip
folds over itself. The way is yours (for example, the inner vertices of the folding samples
collapse onto the point where the two legs' inner offset lines cross). If the cause is elsewhere,
fix it there.

## Read first

- K1218 S5's Handoff item 4, and the headers of the tools named below.
- `.claude/rules/render-ribbon.md`: the P3.34 clamp entry (line 133), the K580 entries on the
  round outer side past ROUND_DOT_START and the cusp's 0.3 h, and THE PARTS. Also `render.md` and
  `probes.md`.
- `src/render/ribbon_mesh.ts` around `CONCAVE-SIDE CLAMP`, and the tests that cover it.

## Setup

- Work only in `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\muse-k1228`. Claude made it,
  detached at this brief's commit, with `node_modules` junctioned. Never run `npm ci`.
- K1218 S5's tools are tracked in `.claude/probes/K1218/s5/`: `live_s5.mjs` with its modules
  `ribbons_s5.mjs` (which ribbon a pixel lies in, and how deep) and `bend_s5.mjs` (a chain's turn
  and radius per sample); `shoot_s5.mjs`, `run_shots_s5.ps1`, `diff_s5.mjs`. K1220 S2's text
  stands are in `.claude/probes/K1220/s2/`. Copy what you use to `.claude/probes/K1228/`, with lock
  owner `K1228`, master on port 5940 (served from a `git archive` export of this brief's commit
  in `.claude/probes/K1228/master`, `node_modules` junctioned) and yours on 5941.
- Every browser job runs under the perf lock through your copy of the runner: real time, headed,
  at most two browsers.

## Done

1. The cause, tested: ji 51's notch on master, and with the clamp off.
2. At ji 51, no pixel inside chain 61's half-width (edge < -1 px) reads as background, at rest
   and at K1190's four pulse moments.
3. Every turn on the cross, loop and x4 stands whose radius is under the half-width, at rest: the
   background pixels inside the half-width, master's and yours. Yours: 0, or each spot cropped and
   named.
4. No fold: no strip triangle flips (negative area) on the three stands, at rest and in a pluck
   frame. A unit test in `test/render/` pins a turn with R < h: the inner side covers the
   half-width and no triangle flips.
5. Whole-frame diffs at rest, master against yours, on the three stands, the knot-mode default
   link and K1220 S2's a and i text stands: every changed pixel lies within one half-width of a
   turn with R < 1.05 h, or you crop and name it. Crops at zoom 4, master over yours, of ji 51 and
   the five tightest turns, in `.claude/probes/K1228/out/sheets/`, for Claude to judge.
6. `npm test` is green after `git fetch -q origin` and `git rebase origin/master`. Then
   `git push origin HEAD:master` and watch that commit's deploy (`gh run list -R
   levilindsey/knotmaze -L 3`) until it is green. If the push is rejected: fetch, rebase, test,
   push again. Never force, never skip hooks. If Done 2-5 don't hold by the cap, don't push: keep
   the patch in `.claude/probes/K1228/`.

## Rules

- PowerShell. Stage files by name. Never `git add -f` a probe's outputs (PNG, JSON, tables, logs,
  the master export). The copied tools may go in with the fix's commit.
- Don't touch:
  - the main checkout (Claude merges there), or any other worktree;
  - `src/render/field/` (K1040, another run), and `joinery.ts` or `ribbon_renderer.ts` beyond a
    few lines (K1220 S3, another Muse run, until about 10:10);
  - port 5173, ports 5960-5969 and 5980-5989, or the phone.
- Don't edit LEDGER.md.
- Out of scope (name it if you see it, don't fix it): the dark edges that step at MSAA levels
  (K1231), the section colours' staircases and cross ji 33's seam (K1218), the junction field
  (K1040), how a cursive cusp's spur is filled (K1220), the junction fans and webs.
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and at each milestone).
  Stop your servers and browsers.

## Report

Append a Handoff to this brief, in the last push: the cause, the fix, Done's tables, the sheets
to show first, anything out of scope you saw, your last SHA. Commit messages carry the record.

## Handoff (Muse fix run, 2026-11-06)

Started 08:48 PT (2 h cap 10:48). Servers: master export of 787e24b5 on
5940, this worktree on 5941, both with private vite caches; killed by me
before the commit (verified down), they do not outlive this run. The
worktree is left for Claude's merge.

### The cause, tested

The concave-side clamp, as charged. At cross ji 51 on master, (1017,1136)
reads luma 66 against ribbon 170 and backdrop 27 (ribbons_s5 window:
101 at (1015,1135) and (1016,1136), 135 at (1018,1137)). My census
(`census.mjs`: a pixel inside edge < -1 whose colour is within 42 a
channel of a background-only shot, ribbon root hidden) finds master
with exactly 1 such pixel at ji 51, (1017,1136) at edge -2.0, at rest
and at t3-t6. With the clamp temporarily removed (`wInner = w`, fix
disabled), the same census reads 0; with the fix, 0. At unit level the
ji51-shaped kink (40 deg over two samples, R 0.33 against h 0.39)
leaves the ideal stroke 0.071 uncovered under master's vertices.

### The fix

`extrudeRibbon` (`src/render/ribbon_mesh.ts`): a run of consecutive
folding samples (the cap binds, per-sample turn at most 60 deg, same
inner side, no lean; widthMul narrows the legs with the strip) has its
inner vertices collapsed onto P, the crossing of the run's entering
and leaving legs' inner offset lines, each at its own width from its
leg. Plain or folding neighbours whose inner vertex already lies past
P join the fan. A run stands only if every strip triangle it touches
keeps the strip's winding and every one of its samples keeps its
centre covered (rechecked in a final sweep), and P stays within 4h;
otherwise the clamped vertices stay, exactly as before. Vertices slide
from clamped to P by a smoothstep of the deepest sample's fold depth
(`1 - innerCap / w`, full at 0.1), so a tightening turn moves
continuously. Sharper single samples (> 60 deg) keep the cap: they are
cusps on the way to a round join, and the 80-120 deg continuity sweep
in `ribbon_round.test.ts` stays bit-exact there. `ribbon_round`'s
wiggle bit-identity test now uses non-folding loops (16 deg kinks, no
radius jitter) - its old scene was itself full of R < h turns, i.e. it
pinned master's clamp, not round joins; the 85/89.9 deg tests are
untouched.

### Done, item by item

1. Cause: above. Master notch at (1017,1136); clamp off: no notch.
2. ji 51 inside chain 61's half-width, background pixels (census):
   master 1 at rest and 1 at each of t3, t4, t5, t6; yours 0 at rest
   and 0 at each of t3-t6 (measured again on the final build).
3. Every R < h turn at rest (census, tight-only: cross 88 such
   samples, loop 77, x4 88). Background pixels inside the half-width
   within h of an R < h sample: master cross 2 - (1017,1136) and
   (2305,17) chain 58; loop 338 in one cluster; x4 2 - (944,957)
   chain 32 and (1018,988) chain 58. Yours: cross 0, x4 0, loop 338,
   the same single cluster at (459,1335) chain 58, cropped in
   out/sheets/loop_bg338.png: the pink thread's crossing gap under the
   purple thread, whose dark casing reads within tolerance of the dark
   backdrop in both builds, identically. It is the crossing-gap look,
   not ribbon coverage, and it is not the clamp. Named, left as is.
4. No fold. Unit: `test/render/ribbon_inner.test.ts`, eight scenes
   (ji51 kink and mirrored, 40 and 55 deg corners, arcs at R 0.85h,
   0.5h and 0.5h over 120 deg): no negative-area strip triangle, and
   the ideal stroke's bare depth < 0.01 on every scene (master:
   0.071 on the ji51 kink). Browser, over the real fills' buffers
   (`tight.mjs`): master flips at rest cross 8/47854, loop 15/45860,
   x4 8/47854, the same triangles in a pluck frame; yours 0 at rest
   and 0 in a pluck frame (tightest chain) on all three stands. One
   loop pluck flip on the plucked chain under its widthMul envelope
   was found and fixed by letting the collapse run under widthMul;
   re-measured 0.
5. Look elsewhere unchanged. Sheets in .claude/probes/K1228/out/sheets/
   (zoom 4, master over mine, 96 px windows): ji51.png first, then
   tight_loop_c79j178, tight_cross_c23j42, tight_x4_c13j41,
   tight_loop_c5j528, tight_loop_c74j185 - the five tightest on-screen
   turns - all smooth, ji51's notch gone and no edge sawtoothing.
   Whole-frame diffs at rest (`diffa.mjs`, attribution to samples with
   R < 1.05h): cross np 60 changed, loop np 20, x4 np 53, knot-mode
   default link 1, K1220 text a_xh3 0, a_xh2 0, i_xh3 1, i_xh2 0.
   Changed pixels beyond h of the nearest such sample point: cross
   (2306,17) 5 px, (588,1256) 3, (1019,1138) 2, (1942,137) 1; loop
   (1754,785), (530,788), (479,1352) 1 each; x4 (1019,988) 3,
   (655,1109) 1. Every one is cropped (out/sheets/un_*.png) and was
   viewed: each is the inner apex of a tight turn, where master carries
   the tiny notch spur and yours fills it (attribution measured to
   sample points; the turns are arcs, so apex pixels sit just over h
   from the nearest tight point). Nothing else in any frame moved.
6. `npm test` green at the fix commit (218 files, 2880 tests) and
   again after the rebase (below). Fix and tests on master, tools
   under .claude/probes/K1228/ (scripts only; no outputs, no master
   export staged). Last SHA: see the commit carrying this handoff.

### Boundaries found, for the ledger if Claude wants them

A per-sample turn over 60 deg with R < h keeps the clamped inner
vertex by design (the gate above); a folding run whose fan would flip
a triangle or bare a centre keeps master's vertices by design (the
fallback) - on the three stands neither boundary left a measured
background pixel or a flipped triangle. The blend band means a turn
passing through fold depth 0-0.1 is part-way covered while it moves;
at rest every measured fold is at full depth. The loop (459,1335)
crossing-gap spot (item 3) is the one spot left, by name.
