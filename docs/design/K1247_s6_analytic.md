# K1247 stage 6: corners in closed form

Ledger: K1247 (K1240's frame cost). One Claude Opus agent in its own worktree, on its own branch. Cap 2 h.

## Why

K1240 is the redesign: one outline (offset-polyline borders, cuts, corner arcs) for both looks. Levi's
sketch asked for corner arcs "in closed form from each frame"; the prototype grows them by stepping
instead. The gate is def's `frame()` at ≤3 ms median and ≤6 ms p95; it takes about 17.5 ms, and corners
are the biggest phase.

Stage 5 (`docs/design/K1247_s5_growth.md`, Handoff 1 and its addendum) found:
- **Stepping can't get there.** Its 16-node growth with checked refinement took corners from 6.6 to 5.7
  ms. With the margin removed entirely they would still take 4.1 ms. The Newton steps and foot searches
  on every advance are the cost: about 14 µs a corner, and 1 ms leaves 0.8 µs.
- **A corner is about 10 pieces.** It crosses about 10 segments, with 9 state changes over 17 nodes. The
  margin is 0 in 95% of calls, and w = 1 on 27% of def's corners.
- **Today's 1e-3 h landing floor was the branch loss.** At 0.1 h (`kfJump`) the growth converges with N.
- **What's left is ties, not convergence.** Near-tied foot branches flip with N (muse_default_tw 0
  c303, 0.49 h).

## Goal

Replace the growth with closed-form pieces along the medial path. Between a segment and a segment the
path is a line; between a segment and a vertex it is a parabola. Each piece gives its feet and w in
closed form, so no Newton steps or foot searches remain. Where possible, bound the margin per corner or
per piece instead of walking it. If time allows, make the V solve cheaper too (about 0.8 ms on def).

Target: def's corners phase ≤1 ms median, under the lock, with the whole frame. The technique is yours.

**This stage is the rewrite.** Build it even if it won't finish in 2 h, and commit WIP at each
milestone. Don't spend the stage sizing or measuring alternatives.

## Start

Stage 5's branch holds the reference, the tools and the 0.1 h landing floor. Merge it into your
worktree first: `git merge --ff-only worktree-agent-a3deb5723f8c1b194`. Its growth is not on master;
you replace it.

## Accuracy (Claude's call, technical)

1. **Corners.** Within 0.01 h of the converged reference (`k1247s5_mkref.mjs`, `k1247s5_ref.ts`,
   `k1247s5_cmp.ts`) in every corner where the reference converges. List the ones where it doesn't.
   Near ties need a rule that doesn't depend on the previous frame (cold = warm). Say which rule you
   chose.
2. **Outside corners.** Run interiors stay within 1e-3 h of master (`k1247s5_outside.ts`). Run ends move
   with their corners. Counts, piece kinds and order stay the same; explain any change.
3. **No gap between fill and outline.** Stage 5's crop `out/k1247s5/pics/2_user_tw42.lightpaper_0_c31.png`
   shows a 1-pixel white sliver between the fill and the new corner (the middle panel's left edge).
   Find why, and show that none remains on any scene.
4. **Cold = warm** within 1e-6 h.
5. **Pictures.** Crop the 6 corners that move most from master (`k1247s5_pics.ts`). Claude looks at them.

## Checks

In `.claude/probes/K1240/proto/`:
- `k1247c_final.ps1` with
  `-Base ../../../../muse-k1240-s1/.claude/probes/K1240/out/k1247/base`. Corner moves will exceed
  its tolerances by design; judge them against the reference instead, per scene.
- `k1247c_coldwarm.ts`.
- `k1247c_time.ts` under the lock (`run_locked_k1247s4.ps1`), master against yours in one session.

## Done

Corners ≤1 ms with the checks above, from two locked runs, and `npm test` green. If you don't get there
by the cap, commit the fastest version that passes, or the rewrite as WIP with where it stands.

## Rules

- PowerShell. Read code through the shell (`Select-String`, ranges of `Get-Content`). Use the Read
  tool only right before an Edit. No helpers.
- Junction `node_modules` from the main checkout (`New-Item -ItemType Junction`). Never run `npm ci`.
- Perf lock: `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it for every
  timing and delete it when you're done. A lock older than 30 min is stale.
- Your files: `.claude/probes/K1240/proto/` only. No `src/` changes. Don't touch
  `.claude/probes/K1240/wasm/`. Commit WIP on your branch at each milestone, with `git add -f` for
  tools, never for outputs. Never push, never edit `LEDGER.md`, and never touch the main checkout.
- **Use the full 2 h.** Stop early only when Done holds.
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and at each milestone). Then
  commit WIP, append a handoff to this brief, and report. A compaction is not a stop: re-read this
  brief and `git log`.

## Report

Short and plain:
- def's median and p95, and its phases, before and after;
- per scene, the largest distance to the reference and the largest move from master;
- the tie rule;
- the sliver's cause;
- the crops' paths;
- what's left;
- your last SHA.

End with `Ledger items` and K1247's handle fields (owner, branch, last commit, evidence, next).

## Handoff 1 (2026-11-09, 19:53-21:50, claude agent a6d87ee5c93000b6e)

**Done does not hold.** The closed-form growth is built and is the default (`K1247_CF=0` in the
environment, or `setClosedForm(false)`, runs stage 5's stepping growth). It is the most accurate
growth so far: 58 corners over 0.01h against the reference and none over 0.1h, against stage 5's
286 and 36 and master's 567 and 39. It is not faster: def's corners phase is 7.3-7.5 ms, master's
6.5-6.7, stage 5's stepping growth 5.8-5.9. The 1 ms target needs the structural work under What's
left. As the Done rule allows, the rewrite is committed as WIP with where it stands (last code commit
2e5ce91a, then this handoff).

### What was built (`outline.ts`, the `cf*` functions from line ~4326)

- **Pieces along the medial path**, each in closed form, made lazily (`cfAt`, `cfStep`) as the
  growth asks for a rho:
  - line (`ty 0`, both feet on segments): q is linear in rho;
  - parabola (`ty 1/2`, one foot on a vertex): q on the vertex-segment parabola;
  - point-point (`ty 3`, both feet on vertices): q on the bisector.
- **Events** (`cfNext`): a foot leaving its segment for a vertex (kinds 1/2), a vertex foot handing
  on to the next segment (3/4), a lag switch at a concave vertex (5/6; closed form on line pieces,
  `cfLagLine`, piecewise quadratic between linear breakpoints; Illinois only on parabolas), and the
  path end (9). The smallest root wins; the exit-root rule (a piece is left at the root where the
  foot exits, never re-entered at the same rho) ended the transition ping-pong.
- **Feet in closed form** from the piece; w from `wOfC`, unchanged equations.
- **The growth** (`growCFC`): an adaptive trapezoid over the running min of w(rho) on [h, h + r0].
  An interval is split while its trapezoid error is over E, while it holds a jump of q (`cfJumpIn`,
  `cfJumpTol` 1e-3h: w dips just before a jump and recovers after, between any two nodes), or while
  a piece's fSteep minimum lies inside it under min(w(a), w(b)) (`cfDipIn`: fSteep is constant on a
  line piece and monotone on a parabola or point-point piece, so each piece's minimum is known;
  user_tw42 c143 had plateaus of 0.47 and 0.34 between nodes at 0.69 and 0.44). It refines up to a
  path end (the foot leaves the window there; the stepping growth pins the foot and refines on).
  A jump splits its interval wherever it lies inside, even within Lmin of a node (2e5ce91a; see
  def 0.5 c12 below).
- **Not done: the margin bound.** The margin is still evaluated per node (`marginOfC`, 2.0 ms of
  the 7.3).

Stats per corner in def's motion (`cfStats`, `k1247s6_qt.ts`): 16.3 pieces (6.1 of them lag
switches), 18.6 w evaluations; 28% of corners are free (w = 1 at every node), 53% end at w = 0,
1.2% at a path end; 1792 dip splits over 110736 corners.

### Timing (k1247c_time, def in motion, under the perf lock, master and mine in one lock)

Master is 2d452e0e's `outline.ts`, run as scratch `_s6time_base.ts`. Rounds 1-2 (one lock): master,
cf (1ccfb58f), stepping (`K1247_CF=0`). Rounds 3-4 (a second lock): master, cf (a595f5db; same
outputs as 1ccfb58f, plus the skip of intervals already at w = 0).

| | median ms | p95 ms | setupBorders | corners | cutsEyesExposure | regions | piecesCapsEtc |
|---|---|---|---|---|---|---|---|
| master 1 | 17.92 | 22.87 | 4.90 | 6.66 | 4.18 | 2.07 | 1.36 |
| cf 1 | 19.12 | 25.21 | 4.91 | 7.44 | 4.07 | 2.22 | 1.33 |
| stepping 1 | 17.00 | 19.99 | 4.90 | 5.87 | 4.11 | 1.95 | 1.31 |
| master 2 | 18.06 | 22.73 | 4.72 | 6.45 | 4.12 | 2.00 | 1.43 |
| cf 2 | 18.71 | 25.12 | 4.77 | 7.26 | 3.92 | 2.18 | 1.27 |
| stepping 2 | 17.05 | 21.94 | 4.77 | 5.84 | 3.97 | 2.14 | 1.29 |
| master 3 | 19.03 | 25.61 | 4.84 | 6.59 | 4.08 | 2.17 | 1.39 |
| cf 3 | 19.05 | 26.15 | 4.80 | 7.37 | 3.99 | 2.20 | 1.45 |
| master 4 | 18.77 | 25.31 | 4.82 | 6.51 | 4.20 | 1.96 | 1.47 |
| cf 4 | 18.95 | 30.64 | 4.87 | 7.54 | 3.88 | 2.10 | 1.41 |

- Rounds 3-4 read master slower too (load); the w = 0 skip showed 7.09 -> 6.82 ms unlocked
  (`k1247s6_qt.ts`, rough) and nothing under the lock.
- 2e5ce91a (the jump fix) was not timed under the lock: its evaluations are unchanged (18.6 a
  corner) and `k1247s6_qt.ts` read 7.00 ms unlocked against 6.82 for a595f5db, within that tool's
  noise.
- Before the dip split (9b8514e9), a locked cf run read corners 6.77 ms; the dip test costs about
  0.5 ms (q and both feet twice on each non-line piece).

**Where the corners' time goes** (a CPU profile of cf at 9b8514e9, 7.28 ms a frame under the
profiler): pieces (`cfStep`) 2.18 ms, of which finding the next event (`cfNext`) 1.34; q and feet
reads 0.6; w (`wOfC`) 2.34, of which `marginOfC` 2.02; the cold V solve (`solveVC`) 0.77; the
fallback and the rest 0.9.

### Accuracy (`k1247s5_cmp.ts --tag=_s6h`, `out/k1247s5/cmp_s6h.json`, stage 5's references, 2e5ce91a)

Largest distance (max of dq, dta, dtb, in h) to the converged reference, master's, and the largest
move from master; `*` = reference not converged.

| scene | mult | new -> ref | master -> ref | move from master | corners > 0.01h (master) |
|---|---|---|---|---|---|
| muse_hash* | 0 | 0.0251 | 0.5282 | 0.5276 | 4 (22) |
| muse_hash* | 0.1 | 0.0250 | 0.1910 | 0.1916 | 3 (26) |
| muse_default_tw | 0 | 0.0639 | 0.0922 | 0.0958 | 7 (55) |
| muse_default_tw | 0.1 | 0.0468 | 0.0946 | 0.0932 | 7 (52) |
| def | 0 | 0.0692 | 0.5119 | 0.5139 | 2 (40) |
| def | 0.1 | 0.0104 | 0.5165 | 0.5178 | 1 (23) |
| def | 0.5 | 0.0571 | 0.4341 | 0.4908 | 3 (34) |
| fat | all | 0 | 0 | 0 | 0 (0) |
| ring | 0 | 0.0072 | 0.1172 | 0.1235 | 0 (5) |
| ring | 0.1 | 0.0056 | 0.0932 | 0.0922 | 0 (7) |
| ring | 0.5 | 0.0051 | 0.0852 | 0.0851 | 0 (8) |
| user_tw42 | 0 | 0.0566 | 0.5094 | 0.5083 | 4 (24) |
| user_tw42* | 0.1 | 0.0750 | 0.6558 | 0.6551 | 4 (25) |
| g41_def_tw42* | 0 | 0.0770 | 0.8818 | 0.8813 | 3 (36) |
| g41_def_tw42 | 0.1 | 0.0787 | 0.8756 | 0.8751 | 2 (32) |
| g41_def_tw64 | 0 | 0.0121 | 0.3887 | 0.3893 | 1 (29) |
| g41_def_tw64 | 0.1 | 0.0570 | 0.3845 | 0.3867 | 6 (27) |
| g41_ring_tw42 | 0 | 0.0027 | 0.1885 | 0.1906 | 0 (8) |
| g41_ring_tw42 | 0.1 | 0.0021 | 0.3963 | 0.3959 | 0 (9) |
| g41_ring_tw64 | 0 | 0.0028 | 0.0783 | 0.0779 | 0 (4) |
| g41_ring_tw64 | 0.1 | 0.0041 | 0.0760 | 0.0757 | 0 (6) |
| g41_user_tw42 | 0 | 0.0566 | 0.5101 | 0.5089 | 3 (25) |
| g41_user_tw42* | 0.1 | 0.0751 | 0.6566 | 0.6559 | 5 (25) |
| g41_user_tw64* | 0 | 0.0783 | 0.1572 | 0.0804 | 2 (19) |
| g41_user_tw64* | 0.1 | 0.0617 | 0.2099 | 0.2104 | 1 (26) |

All scenes, corners over 0.01 / 0.03 / 0.1 / 0.3h: **58 / 17 / 0 / 0**, worst 0.0787h (g41_def_tw42 0.1
c3: its q is 0.010h from the reference (jump split), 247 / 128 / 40 / 14 at 26696ccd (refine to
the path end), stepping 286 / 149 / 36 / 12, master 567 / 211 / 39 / 15. **The error budget E** (measured at a595f5db, before the jump fix; `setGrowKnobs`, `k1247s5_cmp.ts --E=`, `k1247s6_qt.ts --E=` for the rough
unlocked corners phase), against the reference:

| E (h) | > 0.01 / 0.03 / 0.1 / 0.3h | worst | w evaluations a corner | corners ms (rough, unlocked) |
|---|---|---|---|---|
| 1e-3 (default) | 64 / 19 / 0 / 0 | 0.0848 | 18.6 | 6.83 |
| 2.5e-4 | 24 / 9 / 0 / 0 | 0.0796 | 23.3 | 7.88 |
| 1e-4 | 16 / 5 / 0 / 0 | 0.0793 | 27.6 | 8.28 |

E stays 1e-3: below it the count falls but the worst corner does not move. At 1e-4 the corners
left in converged scenes are def 0.5 c12 (0.079h), g41_ring_tw64 0.1 c14 (0.029), muse_default_tw
0 c323 (0.018) and 0.1 c151 (0.012); the rest are in non-converged scenes.

**def 0.5 c12, the worst at every E: a jump the nodes hid (fixed in 2e5ce91a).** cf and stepping
agreed (r 0.7872h and 0.7874h), the reference is 0.7280h. `k1247s6_dbg.ts --scene=def --mult=0.5
--n=0 --wci=12 --gn=256` shows w falling smoothly from 0.997 at rho 0.67h to 0 at
0.7773h; the default nodes read 0.8925 at 0.6965h and 0.5511 at 0.7960h. The piece trace (`--ci=12`)
has a lag switch at 0.7955h where q jumps 0.065h (foot A from s86 to s90), 0.0005h short of the
node, and `cfJumpIn` skipped jumps within Lmin (1e-3h) of an interval's end, so the node's w after
the jump hid w's fall to 0 before it. It now takes any jump strictly inside the interval: c12 0.0807h
-> under 0.01h, def 0's worst 0.0848h (c88) -> 0.0692h (c68), g41_ring_tw64 0.1 0.0290h -> 0.0041h; 64 / 19 corners -> 58 / 17; evaluations unchanged (18.6 a corner).

Tried and reverted: 8 nodes
in place of 16 (96 / 30 / 12 / 1, worst 0.466h). The 0.01h goal holds in ring, fat and g41_ring_tw42
only. The rest are node spacing: user_tw42 c143 read 0.0044h with 256 uniform nodes
(`k1247s6_dbg.ts --gn=256`) and 0.1061h before the dip split; user_tw42 c121 is not investigated.

**Non-converged references** (stage 5's list): muse_hash, user_tw42 0.1, g41_def_tw42 0,
g41_user_tw42 0.1 and g41_user_tw64. Near-tied foot branches flip there as the reference's N grows,
so no growth is held to 0.01h against them.

**The tie rule.** The sites come from the cold V solve's global feet, and every piece after that
from the geometry alone: the smallest event root wins, by the exit-root rule. No state carries from
the previous frame, so where two branches tie the frame picks the same one cold or warm.
`k1247c_coldwarm.ts`: cold = warm 0.00e+0 in every scene, one frame away and over the walk.

**Run interiors** (`k1247s5_outside.ts`): piece keys identical in every scene (same counts, kinds,
order); interior points 0.00e+0h from master; run curves worst 3.81e-2h, only at one-point run ends
that ride their corner (muse_default_tw 0 piece 265). Face key sets differ by one region key in
def 0.5, g41_def_tw64 0 and 0.1, and ring 0 (a moved corner).

### The sliver (`out/k1247s5/pics/2_user_tw42.lightpaper_0_c31.png`)

The pastel fill in the pictures is form B's top surface (`src/render/field/form_b.ts`), not the
outline. Form B still grows its corners over 32 fixed nodes (around lines 1052-1065), master's
growth, so it matches master's outline (0.000h in every scene but muse_hash, 0.05/0.08h) and not the
new one. `k1247s6_sliver.ts`: form B against the new corners is 0.233h (3.3 device px) at that
corner, 0.257h (3.7 px) at mult 0.1, and up to 0.88h (8.3 px) at g41_def_tw42 c35. Where the new
corner moved toward q, white shows between the fill and the outline (the sliver); where it moved
away, the outline overlaps the fill. The outline is right (its corner is within 0.001h of the
reference there). The fix is form B taking the outline's corner, in `src/`, outside this stage.

### Crops (`out/k1247s5/pics_s6/`, `k1247s5_pics.ts --tag=_s6f --out=pics_s6`)

The 6 corners that moved most, each a row of master | new | both (master red, new blue), over form
B's fill; `index.txt` lists them. In all six master was 0.39-0.88h off the reference and the new
corner is 0.000-0.001h off:
1. `1_g41_def_tw42_0_c35.png` (0.881h): master's arc is a short stub near the junction's upper edge;
   the new arc is longer and turns the corner.
2. `2_g41_user_tw42_0.1_c31.png` (0.656h): the sliver corner; the new arc sits further into the eye
   than master's and form B's fill edge.
3. `3_g41_def_tw42_0_c354.png` (0.550h), 4. `4_muse_hash_0_c99.png` (0.528h),
5. `5_g41_ring_tw42_0.1_c19.png` (0.396h), 6. `6_g41_def_tw64_0_c12.png` (0.389h).

### Checks

- `k1247c_final.ps1 -Base ../../../../muse-k1240-s1/.claude/probes/K1240/out/k1247/base` (on
  1ccfb58f, and again on 2e5ce91a with the same results): every step exit 0. verify 48 failures (stage 5: 48;
  keys ok, the failures are corner-driven point counts and face order); coldwarm 0; cmp cold, warm
  and move keyDiff 0; structure, pieces, move_def (rigid 4.8e-9) and outline_test pass; cmprows
  16 / 14 / 2 failures (stage 5: 19 / 16 / 3), corner-driven. Outputs in `out/k1247c_final/`.
- `k1247c_coldwarm.ts`: 0.00e+0. `k1247s5_outside.ts` on 2e5ce91a: piece keys identical, interiors 0, run curves worst 3.81e-2h.
  `npm test` (on 2e5ce91a): green, 220 files passed and 2 skipped, 2887 tests passed and 9 skipped.

### What's left

1. **The 1 ms target**, in order of expected gain:
   - a margin bound per corner (or per piece), so the 28% free corners and most nodes skip
     `marginOfC` (2.0 ms);
   - fewer pieces: 16.3 a corner, 6.1 of them lag switches; one piece per polyline segment crossed
     would about halve `cfStep` (2.2 ms);
   - reuse fSteep's end values across piece boundaries (the dip test's 0.5 ms);
   - a cheaper cold V solve (0.77 ms); then WASM.
2. **Form B**: grow its corners with the outline's growth (or read them from the outline) in
   `src/render/field/form_b.ts`, so fill and outline agree (the sliver).
3. **The remaining 58 corners over 0.01h**: the worst (g41_def_tw42 0.1 c3, 0.079h) is a foot
   tangent, its q within 0.010h, so a near tie of foot branches; then user_tw42 c121 (0.057h), def 0
   c68 (0.069h), muse_default_tw 0 c290 (0.064h). user_tw42 c143 said node spacing (0.0044h at 256
   nodes); a lower E (table above) halves the count and leaves the worst.

Files: `proto/outline.ts` (the `cf*` growth, `setClosedForm`, `setCfJumpTol`, `setCfDip`,
`cfStats`, `wDbg`), `k1247s6_dbg.ts` (per-corner cf vs stepping vs the reference; `--gn` runs
uniform nodes, `--wci` dumps w per node), `k1247s6_qt.ts` (rough unlocked on/off timing),
`k1247s6_sliver.ts`, `k1247s5_pics.ts` (`--out=`). Scratch, never committed: `outline_base.ts`,
`_s6time_base.ts` (master's outline for the timing).
