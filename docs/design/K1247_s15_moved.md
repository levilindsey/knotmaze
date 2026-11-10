# K1247 stage 15: recompute only what moved (K1268)

Ledgers: K1247 (the frame's speed), K1268 (the lever) and K1240 (the redesign). One Claude Opus agent in
its own worktree, on its own branch from master. Cap 2 h.

## Why

Stages 12-14 are merged (88503be2). The structure is now decided once: stations are ordered by
structure, regions and underlays have structural ids, and the outline is no worse than master against
form B on all 12 scenes (stage 14's census). The speed has not moved: def's frame is about 21 ms
median at eps 0, and stage 8's model (7.6 + 11.2 × the fraction of points kept, ms) puts a 7.6 ms floor
under any amount of reduction. The 3 ms gate needs a lever past it. K1268: recompute only what moved,
per junction (or whatever unit the outline's structure makes natural), with the outline's continuity
bounding how far a unit you skip can be off.

Stable structural ids are what make a cache possible, so this is the first stage where it can be tried.

## Goal

def's `frame()` at ≤3 ms median and ≤6 ms p95 on real motion, with the drawn outline matching a full
recompute within the 0.25 device px bar on every frame. Levi's rule binds: the structure is decided once,
and only positions follow the frame. No piece that comes and goes, and no decision made from positions
about which pieces exist. Whether a unit recomputes may follow positions, as long as what is drawn stays
within the bar of the full frame. The technique is yours.

In this order:
1. **Real motion.** The timing model (`k1247s8_time.ts`) cycles every point from S to the 0.5h S' and
   back, so every unit moves every frame and this lever gives nothing on it by construction. Record real
   consecutive frames on def: a grab, a pull, a release and the settle until the sim sleeps, from the
   app's physics headless in Node (`src/physics/physics_host.ts`'s core is Node-testable; read only) or
   from the page. Add fat and muse_hash if it is cheap.
2. **The bound, before building.** Per recorded frame: how many units have inputs that moved more than
   the δ that keeps a skipped unit's drawn change under 0.25 px, and the frame cost that projects from
   each unit's measured cost. If the projection can't reach 3 ms median, report that with what it can
   reach (a negative result is a result), and stop there.
3. **Build it** if the projection holds: a unit reuses its last pieces while its inputs stay within δ of
   the positions it was last computed at, and recomputes otherwise. Watch the seams between a reused unit
   and a recomputed neighbour.

## Done

- **Setup.**
  - Check HEAD, then `git reset --hard <the master SHA the coordinator gives you>`.
  - Copy stage 14's untracked inputs from its worktree,
    `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-ad3e63c62ac810610\.claude\probes\K1240\`:
    the list in stage 14's brief (`docs/design/K1247_s14_seam.md`, Setup), plus `out/s14n` and `out/s14`.
- **Bars:**
  - Every recorded frame: the drawn outline against a full recompute of the same frame, no drawn
    difference over 0.25 px, and no paper or fill the full frame doesn't have (stage 14's census
    measure, per frame).
  - At rest: identical to master (the census per scene, `k1247s12_facecrops.ts` 0 px).
  - `k1247s9_union.ts --d=0.001,0.01`, still and `--cyc`: no worse than stage 14's handoff.
  - `k1247s5_cmp`: 44/8/0/0.
  - A locked timing pair (`k1247s8_run_locked.ps1`), master against yours, on the recorded drag and on
    the old S to S' cycle: def's median and p95, and the phase where the change lands.
  - `npm test` green.

## Rules

The Rules of `docs/design/K1247_s10_reduce.md` (your files: `outline.ts`, the `k1247s8_*` to
`k1247s15_*` tools and the check tools in `.claude/probes/K1240/proto/`; no `src/`, and form B is read
only), plus:
- **Load.** Other agents time things on this machine. While anyone else holds
  `$env:TEMP\claude-perf.lock`, run one scoring process at a time, at Idle priority. Take the lock yourself
  only for the timing pair.
- **Commit WIP at every milestone,** broken or not, and read code through the shell (`Select-String`, ranges
  of `Get-Content`), using Read only just before an Edit.

## Not this stage

Stage 14's leftovers stay open in the ledger: the 2 px speck at a tight inside turn on muse_hash (a fold
the even-odd fill drops; `K14_TRIM` closes it but decides from positions, so the fix belongs where the
border is built), the tail that comes and goes at g41_def_tw64 corner 105 (eps 0.1's worst, 7.103 px),
and the seam's fallback to its key's midpoint when the free stretch is closed.

## Report

The recorded motion (what, how many frames); the bound from step 2 (units moved per frame, projected
cost); what you built and its numbers; the bars; the timing pair; what's left; your last SHA. End with
`Ledger items` and K1247's handle fields.

## Handoff (stage 15, 2026-11-10, stopped at step 2)

Stopped by the stop rule: step 2's projection says this lever can't reach the goal on def. Nothing was
built; `outline.ts` is unchanged, so the at-rest bars (census, facecrops, union, s5cmp, `npm test`) are
master's by construction and were not re-run, and there is no timing pair to take.

**The recorded motion.** `k1247s15_record.mjs` drives the page's own in-thread physics (phw=0, the clock
frozen, one 1/60 s `__knotStepUntil` per frame) and exports a FieldScene per frame: a grab at the middle
particle of the chain nearest the centroid, a 30-frame pull across the chain to L·tanh(3) (L = tugLimit ×
threadWidth = 1.04), 30 frames held, the release, then the settle until the sleep gate's 2.5 s quiet.
- def: 226 frames (pull 30, hold 30, release 1, settle 164). Drawn motion per frame: pull 0.2-4.2 px,
  hold under 0.17, release 12.4, settle under 0.06 after frame 90. The diagram is the same throughout
  except chain 16's sample count (34 to 36 at frame 25, back at 32).
- fat: 217 frames (settle 155). muse_hash not recorded.
- `out/s15/rec_<name>/` (gzipped scenes + meta.json; outputs, not committed); `k1247s15_motion.mjs`
  lists per-frame motion and diagram changes.

**The bound (`k1247s15_bound.ts`).** Per frame, which units' inputs moved more than δ since the unit was
last computed, and the frame cost apportioned from frame()'s measured phases (unlocked, on the recorded
frames: def 27.6-28.4 ms median, setupBorders 6.0-6.8, corners 9.2-10.0, cuts/eyes 4.7-4.8, regions
4.4, pieces 4.0-4.4). Units: 32-point blocks (inputs ±16 points), chains, junctions (points within 6h),
crossings (points within ±4h of arc, plus the s of each pass), and chain closure (a chain recomputes when
its own points, or any corner or cut on it, moved: the grain the outline's phases have today).

| def, δ | moved p95 (block / chain / junction / crossing) | projected median / p95, ms of ~28 |
|---|---|---|
| 0.25 px | 0.116 / 0.297 / 0.200 / 0.224 | block 0.00 / 4.72; chain 0.00 / 7.80; closure 0.00 / 14.96 |
| 0.125 px | 0.211 / 0.391 / 0.308 / 0.337 | block 0.00 / 7.92; chain 0.00 / 11.19; closure 0.00 / 19.56 |
| 0.01 px | 0.795 / 0.879 / 0.870 / 0.858 | block 2.58 / 22.84; chain 4.16 / 24.34; closure 12.34 / 26.99 |

The medians are the settle tail (164 of 226 frames), not the drag. Removing the frame's mean
translation ("rigid") doesn't help: translation is 0.0006 px per frame. fat at 0.25 px: block p95
11.72 of 18.0 (0.60 of the frame), closure 0.999 (6 chains, so a chain is most of the knot).

**What δ the bar allows (`k1247s15_gain.ts`).** The bound needs the δ that keeps a skipped unit's drawn
change under 0.25 px. frame() on every frame, faces matched by region id, each vertex's drawn move
against the largest input move within 2h:
- def's gain (the frame's worst vertex): median 4.4 in the pull, 1.3 in the hold, up to 26. 33 places,
  all 0.8-2.6h from a junction centre, jump over 0.25 px while every input within 2h moves under
  0.1 px (377 vertices in 74 frame pairs, worst 1.355 px; j181 jumps 0.35 px on 0.006 px of input).
- A whole-frame gate (reuse the last table while no input moved over δ) breaks the bar at 0.25 px
  (69 frames over, max 1.24 px) and at 0.0625 px (54 frames, max 0.34 px). It holds only at 0.01 px,
  where 217 of 226 frames recompute. No δ is safe in principle while the outline jumps: a reused unit
  misses a jump whatever its δ.
- fat (no junctions) is continuous: gain at most 2.86, no jumps, the gate holds at 0.0625 px.

So on def the lever is bounded by the outline's continuity first and by cost second: at the δ the bar
allows today (0.01 px) the buildable grain projects a 12.3 ms median; with the jumps fixed and a gain
near 1 (δ = 0.25 px), chain closure still projects a p95 of 0.49 of the frame, and only 32-point blocks
(0.155, about 3.3 ms of a 21 ms locked frame, before any glue) reach the p95, which needs every phase,
regions and pieces included, incremental per block. A gain near 1 is optimistic: fat's continuous outline
has a gain of 1.4-1.6 median and 2.9 at worst, which puts δ at 0.09-0.18 px; at 0.125 px even blocks
project a p95 of 0.26 of the frame (about 5.5 ms of 21).

**The two jump mechanisms seen in the records.**
- Observed: a station whose s sits on a centreline sample vertex jumps by h × that vertex's turn when its
  s crosses the vertex. j47: chain 61, s 150.055, vertex 1965 within 0.03 px, turn 0.1045 rad, h × turn
  1.21 px, the station moved 1.24 px (pieces 712/713) while its s moved 0.01 px. j146: chain 58,
  s 12.7345, vertex 174, turn 0.086 rad, 1.00 px, observed 1.0 px. Inferred, not tested:
  `borderPointAtBase`/`borderPointAtFinal` interpolate the border by foot s, and an outside turn's two
  offset points share one foot s, so no s lands on the bevel between them. j67's junction region 2056
  (vertex 10 moves 2.5 px) is not diagnosed.
- Observed: corner 191 at j91 (chain 35's END arm onto chain 67's border) moves its arc end 0.46 px along
  the border, and run piece 920's start 0.34 px, while the inputs within 2h move 0.03 px. It repeats
  every ~3 frames through the whole settle (52 frame pairs, 0.33 px): the full recompute shimmers there
  at rest.
- Also seen: faces are drawn in depth order (`regionsPhaseC`, the sort by `depthAtC`), and near-equal
  depths swap order between frames (7 pairs between settle frames 200 and 201). That is a draw-order
  decision made from positions; whether any swapped pair overlaps with different owners was not checked.

**Left.** The lever (K1268) waits on the outline being continuous: fix the station-on-vertex jump and
the j91 corner's sensitivity, then re-run `k1247s15_gain.ts def` until it lists no jumps and the
gain is near 1, then `k1247s15_bound.ts def` at δ = 0.25 / gain. Even then only block-grained reuse in
every phase reaches the p95; chain-grained reuse doesn't. Tools: `k1247s15_record.mjs`,
`k1247s15_motion.mjs`, `k1247s15_bound.ts`, `k1247s15_gain.ts` (headers have the usage). The dev server
for recording: `npx vite --port 5363 --strictPort --host 127.0.0.1` in the worktree.