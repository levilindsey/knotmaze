# K1247 stage 9: make the outline continuous in its points

Ledgers: K1247 (the frame's speed) and K1240 (the redesign). One Claude Opus agent in its own
worktree, on its own branch. Cap 2 h.

## Why

The outline (`.claude/probes/K1240/proto/outline.ts`) jumps when its input points move by almost
nothing. Stage 8 (`docs/design/K1247_s8_density.md`, Handoff 1) measured it with
`k1247s8_jitter.ts`: moving every chain point by 0.001 device px at random moves def's pieces 9.0 px
and muse_default_tw's 8.7 px; 0.01 px moves them 21.8 and 24.7 px.

That jump is two problems:
- **A look defect.** In motion, a corner or tail can pop.
- **The speed block.** Point reduction can't hold 0.25 px while 0.001 px moves a piece 9 px, so the
  frame can't drop from 18.8 ms to the 11.5-13 ms that plain reduction at eps 0.1-0.2 would give.

Round 4 (`docs/design/K1240_s3f_round4.md`, its handoff) added the end tails and one more jump.

## Goal

The outline's pieces move continuously with the points, while the K1240 rows and K1247 checks
hold. Levi's rule still binds: the structure is decided once, and only positions follow the frame.
No piece that comes and goes, and no decision made from positions. The technique is yours.

The known causes (first re-measure each one on today's master):
1. **The end arm's root kink** (def corners 34 and 38): arm A's foot ua pins at 0 instead of
   sliding, and r drops from the 2h cap to 0.197h (`k1247s8_corner.ts`, `k1247s8_wrows.ts`).
2. **Foot sensitivity:** a corner's foot moves 9-20x the change in its arm's L, through the
   crossing cut `d - h cot(theta/2) - h` (def corner 182, muse_default_tw corner 277;
   `k1247s8_cornred.ts`).
3. **Region ids** shift when a sliver polygon (fewer than 3 points) is skipped (def cycle frame
   18; `k1247s8_regions.ts`).
4. **The tails' first-interval rule** (def corner 35's tail, 17.3 px at 0.01 px): a new positive
   interval of f opens at the corner and becomes "the first" (`_r4_tailjit.ts`).

Form B (`src/render/field/`) is the reference. Where form B itself jumps at a spot, the outline may
jump with it: show it, with form B evaluated at the two jittered scenes.

## Done

0. **Baselines first, on master's outline before any change** (this is K1263):
   - Run `k1247c_dump.ts <sub>` to make verify's tables, and `k1247_exact.ts --out=<sub>` at still,
     0.1 and 0.5 for the row baselines.
   - Then `k1247c_final.ps1 -Base <yours>` reads verify 0 and every cmprows row in tolerance.
   - Read each step's log: the script's steps exit 0 even when they fail.
1. **Continuity:** `k1247s8_jitter.ts --d=0.001,0.01`, on every scene, still and with `--cyc`.
   - No key changes.
   - No piece moves over 0.25 device px at 0.01 px, unless form B jumps at that spot too.
   - List what's left, with its place and cause.
2. **The redesign holds:**
   - `s3f_claude_checks.ps1`: every row stays within tolerance of S3d's baseline.
   - K1247's checks, against the step 0 baselines: verify, coldwarm, `k1247s5_cmp` (no worse than
     48/9/0/0), `k1247s5_outside` and `k1257_sliver`.
   - Every difference is a corner you changed on purpose: list them.
3. **Crops:** before and after at each place you change (`s3f_claude_pics.ts`, with AT= or tags).
   Claude looks at them.
4. **The payoff, measured:**
   - `k1247s8_acc.ts` at plain eps 0.1 and 0.2: the failures and the worst piece on every scene.
   - A locked `k1247s8_pair.mjs` pair, master against yours, through `k1247s8_run_locked.ps1`, at
     eps 0 and the best passing eps.
   - Name the phase where any change in def's eps 0 frame lands.
   - A negative result is a result.
5. `npm test` green.

## Rules

- PowerShell. Read code through the shell (`Select-String`, ranges of `Get-Content`). Use the Read
  tool only right before an Edit. No helpers.
- Junction `node_modules` from the main checkout (`New-Item -ItemType Junction`). Never run `npm ci`.
- **Your files:** `outline.ts`, the `k1247s8_*` and `k1247s9_*` tools, and the check tools in
  `.claude/probes/K1240/proto/`. No `src/` changes: form B is the reference.
- **Commits:** WIP on your branch at each milestone. Use `git add -f` for tools, never for outputs.
  Never push, never edit `LEDGER.md`, and never touch the main checkout or any Muse worktree.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what).
  - Take it only to time something, and delete it when you're done.
  - While someone else holds it, wait inside one blocking command.
  - A lock older than 30 min is stale.
- **Stopping:** stop when Done holds or 2 h after your start (`Get-Date` at the start and at each
  milestone). Then commit WIP, append a handoff to this brief, and report. A compaction is not a
  stop: re-read this brief and `git log`.

## Report

Short and plain:
- each cause: what it was, what you changed, and the jitter numbers before and after;
- what's left over 0.25 px;
- the checks;
- the crops' paths;
- the eps 0.1 / 0.2 accuracy and the timing pair;
- your last SHA.

End with `Ledger items` and K1247's handle fields (owner, branch, last commit, evidence, next).

## Handoff (stage 9, 2026-11-10)

Started 00:25:42, stopped at 01:32 to leave time for the report (cap 02:25). Branch
`worktree-agent-a3d3322f457790ce3`. Done does not hold yet: fat's twist cut (cause 3), a few end
tails and two corners are left. They're listed below.

**The measure.** `k1247s8_jitter`'s per-piece Hausdorff counts a split point that slides along an
unchanged curve as a move of both pieces. That is a corner's tangent point moving between its arc
and its run, and it caused most of that tool's rows over 0.25 px. `k1247s9_union.ts` measures what
is drawn instead: each piece's points against every piece of the other frame. The numbers below
are drawn moves at 0.01 px unless they say otherwise. `k1247s9_where.ts` locates a row: the point
of the piece's largest move, plus the nearest outline and form B corners and their moves.

**Causes fixed, in commit order:**
1. **Vertex lag (1d124028).**
   - Before: at a vertex foot, the closed form stayed on the vertex when the next segment was
     shorter than footNearM's window and the vertex after it was concave. The margin walk then
     dropped the rest of the arm, and w fell to 0.
   - Change: it now takes footNearM's switch onto the segment beyond.
   - Per-piece max, still scenes, at 0.001 / 0.01 px:
     - muse_default_tw 8.687 / 24.722 → 0.276 / 1.039
     - def 8.995 / 21.835 → 1.891 / 21.835 (the rest is cause 4)
     - muse_hash 0.179 / 32.630 → 0.179 / 20.916
2. **Settle cycles (e7a46707).**
   - Before: two loops failed to settle. At def corner 35 the settle loop never settled. At
     muse_hash corner 106 a segment lag and the vertex lag kept undoing each other until CF_MAXP.
   - Change: both now settle the arms on footNearM's own feet at that rho.
   - Results:
     - def 35: r 0.07079 still, 0.07086 at 0.01 (before, the loop ended the growth);
     - muse_hash 106: r 1.6 at 0.001 and 0.01 (before, 0.064).
3. **V by restarts (3ad3f5b7).**
   - Before: solveEq and solveVC ran plain Newton from a far bisector guess, so they found V or
     missed it by chance.
   - Change: on a failure they restart from points on the line from the junction to the guess.
     Corners that converged before are bit-identical.
   - muse_hash cyc10 corner 299: r 0.07009 still, 0.07017 at 0.01 (before, it lost its V under
     jitter).
   - Corners changed on purpose:
     - g41_user_tw64 63: no V → ok r 0.0498;
     - g41_user_tw64 cyc18 105: no V → ok;
     - muse_hash cyc18 234: no V → V outside spans.
4. **End-arm roots (14672111).**
   - Before: an extended END arm's first raw segment (pt0→pt1) can be sub-pixel (0.035-0.64 px
     seen). Its direction set the root's joins and swung under 0.01 px of jitter.
   - Change: the builder and the frame path both drop the interior point of a terminal segment
     shorter than 0.1 h.
   - Drawn moves over 0.25 px, count (max), before → after:

| Scene | still | cyc10 | cyc18 |
|---|---|---|---|
| def | 3 (≥5.8) → 0 | 2 (≥5.8) → 0 | 3 (≥5.8) → 1 (0.825) |
| muse_hash | 8 (4.60) → 1 (4.60) | 10 (1.776) → 4 (1.187) | 6 (0.977) → 2 (0.571) |
| g41_def_tw64 | 6 (1.33) → 3 (0.459) | 8 (1.332) → 4 (0.514) | 4 (1.334) → 1 (0.403) |
| user_tw42 and g41_user_tw42 | 1 (0.40) → 0 | 3 (1.000) → 2 (0.268) | 1 (1.000) → 0 |
| muse_default_tw | 1 (0.535) → 0 | 1 (0.511) → 0 | → 0 |

**What's left over 0.25 px drawn** (12 scenes; keys change nowhere else):
- **fat cyc18, cause 3.**
  - Jitter 0.01: 368 keys change. Jitter 0.001: 3 drawn, run/2 4.224 px.
  - The place is crossing 310's twist cut. Its under and over side −1 borders pass 0.0035 h
    apart. Still, the cut is synthesized and the over station (real cuts only) stays off. At
    0.01 px the borders cross, the station turns on and the region ids shift
    (`k1247s9_regions.ts`).
- **muse_hash still: tail/23 at corner 121, 4.60 px.**
  - The corner reads no(arm span 0), at (5.23, 31.97). The move is at the tail's end point.
  - Probably the end tails, causes 2/4 of the stage 8 handoff. Not diagnosed further.
- **muse_hash cyc10.** Undiagnosed except the tails:
  - run/54, 1.187 px, at corner 255 (no(V outside spans));
  - tail/5/1/30, 0.803 px, and tail/30/-1/144, 0.408 px: tails.
- **muse_hash cyc18:** 2, max 0.571.
- **def cyc18: arc/72/0/327, 0.825 px.** Corner 327's q moves 0.039 px, yet the arc's first point
  moves 0.825. Undiagnosed.
- **g41_def_tw64:**
  - still: 3, max 0.459;
  - cyc10: tail/22/-1/35 0.514, run/61 0.445, run/18 0.368;
  - cyc18: 1, 0.403.
- **user_tw42.lightpaper and g41_user_tw42 cyc10:** 2, 0.268 at 0.01 and 0.265 at 0.001.
- **g41_ring_tw42:** cyc10 0.275, cyc18 0.269. Corner 21's r moves 0.134 px, and form B's moves
  the same amount.
- **g41_def_tw42 cyc18:** tail/61/316, 0.273.

**Form B** (`k1247s9_formb.ts`):
- It jumps where the outline stays continuous:
  - def 34/35: r 2.0 → 0.765 h under jitter (visible in the def crops);
  - muse_hash corner 105: r 3.325 → 1.168 h, q 43 px.
- It has no V at g41_user_tw64 63/105, and it loses muse_hash cyc10 299.

**Checks, at 14672111:**
- `s3f_claude_checks` (tag s9c5): ALL PASS.
- `k1247s5_cmp`: 44/8/0/0, against a limit of 48/9/0/0.
- `k1257_sliver`: 0.
- `k1247c_final -Base out/k1247/s9base`:
  - coldwarm 0;
  - verify: 44 failures (4 before step 4), on every case but fat and g41_def_tw42. All of them
    are point counts at the dropped roots, face pairs that swap index (e.g. muse_hash 0.1 faces
    122/123) and small point moves. Max point move per case: muse_hash 0.056 h, g41_def_tw64
    0.029 h, g41_user_tw64 0.065 h (corner 63), the others ≤ 0.013 h;
  - cmprows: one failure each at still and 0.1, g41_user_tw64 B over2 0 → 3 (corner 63, on
    purpose); 0.5 is within tolerance.
- `k1247s5_outside --base=k1247c_base`: the key sets are the same. Faces and regions differ in
  point counts at the roots, and face indices move by 0-6.
- Every difference is a deliberate corner change: the V-restart corners, or a dropped end-root
  point.

**Crops**, in `.claude/probes/K1240/out/s3f/`:
- def root (6.5, 32.0) at 0.01 px: `s9c5_def_j01_pre/def_A0.png` vs `s9c5_def_j01/def_A0.png`.
  - Before, a spike and a cap cross the root; after, the root lies on form B's border.
  - Unjittered, `s9c5_def_still_pre` and `s9c5_def_still` are identical.
- g41_def_tw64 run/20 (32.54, 1.71) at 0.01 px: `s9c5_d64_j01_pre/` vs `s9c5_d64_j01/`.
- From before step 4, mine vs master: `s9_def_j01{,_master}`, `s9_hash_j001{,_master}` and
  `s9_u64{,_master}`.
- How the `_pre` crops were made: `_s9_pics_pre.ts`, untracked scratch, runs s3f_claude_pics on
  7be7116b's outline.

**Accuracy** (`k1247s8_acc`):
- eps 0.1: 25 failures, 54.0% of points kept. eps 0.2: 28 failures, 39.8% kept.
  - The same before and after step 4, and the same as master.
  - Worst scene: g41_user_tw64. At 0.1, max 5.13 px. At 0.2, max 25.56 px and piece 34's key
    changes.
- No eps passes every scene (before step 4, the same as master): eps 0.02 has 21 failures
  (81.8% kept), eps 0.05 has 25 (67.9%).

**Timing** (a locked pair on def, before step 4):
- eps 0: master 21.13 / 20.67 ms, mine 21.73 / 21.26 ms. That's +0.6 ms, with no phase resolvable
  above the noise.
- eps 0.02: no consistent difference.
- Step 4 allocates only when a root triggers. Not re-timed.

**npm test**, at 14672111: green. 220 files passed, 2 skipped; 2887 tests passed, 9 skipped.

**Next:**
1. Cause 3: decide the twist cut's station existence from the structure, not from whether the
   borders really cross (fat cyc18, crossing 310).
2. The end tails (causes 2/4 of stage 8): muse_hash tail/23 at corner 121, cyc10's tails 5 and 30,
   g41_def_tw64 tail/22/35.
3. Diagnose muse_hash cyc10 run/54 (corner 255) and def cyc18 arc/72 (corner 327).
4. Port steps 1-4 to form B (`src/render/field/`), or decide not to. Until then, verify and
   cmprows differ from the baseline at corner 63 and the end roots.
5. Measure jitter with `k1247s9_union`, not `k1247s8_jitter`.

Tools: `k1247s9_trace`, `_arm`, `_tail`, `_v`, `_flip`, `_regions`, `_formb`, `_union` and
`_where`. Outputs: `.claude/probes/K1240/out/s9/`.
