# K1247 stage 16: the outline continuous in motion

Ledgers: K1247 (the frame's speed), K1280 and K1281 (the jumps), K1240 (the redesign). One Claude Opus
agent in its own worktree, on its own branch from master. Cap 2 h.

## Why

Stage 15 (`docs/design/K1247_s15_moved.md`, its handoff) recorded real motion on def (226 frames) and fat
(217). It found def's outline is not continuous. At 33 places within 0.8-2.6 half-widths of a junction,
the drawn outline jumps more than 0.25 px while the inputs nearby move less than 0.1 px (worst 1.355 px).
fat, which has no junctions, is continuous. The jumps show in motion as flicker. They also block K1268's
lever: no δ holds the bar while they exist.

Mechanisms found so far:
- **K1280:** a station whose s crosses a centreline vertex jumps by h × the vertex's turn (j47 chain 61
  1.24 px, j146 chain 58 1.0 px). The suspect is `borderPointAtBase`/`borderPointAtFinal` interpolating
  by foot s, where a convex vertex's two offset points share one s.
- **K1281:** corner 191 at j91 moves its arc end 0.46 px along chain 67's border per 0.03 px of input. It
  shimmers 0.33 px every ~3 frames through the whole settle, so the full recompute flickers at rest. Also
  j67's region 2056 moves 2.5 px on under 0.1 px of input (undiagnosed).
- **K1279's jitter check**, shared with master: muse_hash x61 and x182, g41_user_tw64 x54, g41_def_tw64
  x309 (cyc10).

## Goal

`k1247s15_gain.ts def` lists no jump: no drawn vertex moves more than 0.25 px between consecutive
recorded frames while every input within 2h moves less than 0.1 px. Do the same on fat, and on muse_hash
if you record it (`k1247s15_record.mjs`). The look at rest stays as it is. Levi's rule binds: the
structure is decided once, and only positions follow the frame. No piece that comes and goes, and no
decision made from positions. The technique is yours. A fix that makes a quantity continuous (an offset
that turns with the vertex, an arc end that slides) is in scope; a threshold that hides a jump is not.

Then, with the jumps gone, re-run `k1247s15_bound.ts def` at δ = 0.25 px ÷ the measured gain, and
report what recomputing only what moved would project.

## Done

- **Setup.**
  - Check HEAD, then `git reset --hard <the master SHA the coordinator gives you>`.
  - Copy the untracked inputs from K1279's worktree,
    `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a70157fa5e512c8ef\.claude\probes\K1240\`:
    `out/` (all of it) and `proto/outline_master.ts`, `proto/outline_base.ts`.
  - If your worktree lacks `.claude/probes/K868/scenes/`, copy it from the main checkout.
- **Bars:**
  - The gain tool: no jumps on def and fat. List each place you fixed, with its jump before and after.
  - At rest: the K1279 census (`k1279_census.ts`) is no worse than master on any crossing, and
    `k1247s12_facecrops.ts` changes nothing beyond edge pixels. Any scene that differs gets a
    before/after crop pair.
  - Stage 14's census: no scene worse than master.
  - `k1247s9_union.ts --d=0.001,0.01`, still and `--cyc`: no worse than master. `k1279_motion.ts`: fewer
    jump pixels than master.
  - `k1247s5_cmp`: 44/8/0/0.
  - `npm test` green.

## Rules

The Rules of `docs/design/K1247_s10_reduce.md`. Your files: `outline.ts`, your `k1247s16_*` tools and
the check tools in `.claude/probes/K1240/proto/`. No `src/`; form B is read only. Plus:
- **Not yours:** `draw.ts`, and the faces' draw order (K1282). K1277's agent is changing both in
  parallel. Leave `regionsPhaseC`'s sort as it is.
- **Load.** Another agent runs on this machine. While anyone else holds `$env:TEMP\claude-perf.lock`,
  run one scoring process at a time, at Idle priority.
- **Commit WIP at every milestone,** broken or not. Read code through the shell (`Select-String`,
  ranges of `Get-Content`), using Read only just before an Edit.
- **Stop** when the stage is done or at 2 h from your start, whichever comes first. Check `Get-Date` at
  the start and at each milestone. Then commit WIP, append a handoff to this brief and report. Neither a
  compaction nor context size is a stop; after a compaction, re-read this brief and `git log`.

## Report

Report these:
- each jump: its cause, the fix, and its size before and after;
- the gain tool's result on each scene;
- the bound at the new δ;
- the bars, with the crop pairs' paths;
- what's left;
- your last SHA.

End with `Ledger items` and K1247's handle fields.

## Handoff (stage 16, 2026-11-10, agent ad757402004124445, stopped at the 2 h cap)

**State.** `outline.ts`'s default ("B") is three continuity fixes: the K1280 tie spread (continuous
s arrays `bc`/`sc`), the END arm's extension foot blended across a concave vertex's bisector (EB), and
the growth corner's arc ends on the centre's smooth feet. Corners still take the nearest foot. Four
env switches (probe-only) A/B the rest: `K16_CB` = `0` (default) | `band` | `loc` (corner feet blended
across concave bisectors; `loc` blends only where the foot would jump), `K16_EB=0` (no extension-foot
blend), `K16_TS=0` (no tie spread), `K16_PS=1` (addPointAtC's pick adds the s distance). With every fix
off the output is master's: census 27594 crossings, all identical. A ref's s is now `sc` (the domain
the end lookup searched): neutral on every bar. The stage is NOT done: def keeps 18 jump places.

**Jumps** (`k1247s15_gain.ts`; fat had 0 in every mode). Def: master 33 places, max 1.355 px; B 18;
`loc` 8.

| place | cause | fix | before | after (B) |
|---|---|---|---|---|
| j67 (3 places) | END arm's extension foot = the polyline's nearest point, which jumps across a concave vertex's bisector | EB: tangent-interpolated root (fab58dba) + the foot blended across the bisector | 1.355, 1.355, 0.948 | gone |
| j59, j156, j134 | same | EB | 0.638, 0.322, 0.266 | gone |
| j47, j146, j158 | a tie run's points share one s, so a piece end crossing the run's edge jumped by the run's spread | K1280: each tie run gets a continuous s | 1.243, 1.007, 0.264 | gone |
| 6 more | a growth corner's arc ends on the polyline's nearest feet, and the root | 9bf6d959, fab58dba | (in those commits) | gone |

Left in B (largest worst first): j176 1.004 / 0.980 (a long-range dependency through Lcut, the cut
length is decided from positions far off), j45 0.727, j30 0.708, j87 0.661, j0 0.634, j54 0.608, j42
0.548, j73 0.517, j39 0.358 / 0.334, j181 0.350, j178 0.338, j91 0.335 (52 frame pairs), j135 0.306,
plus 3 unprinted. j91, j30, j87, j54, j42, j73, j181, j178, j135 (and j105, j90) are the corner foot
jumping across a concave bisector: `K16_CB=loc` fixes them. j176, j45, j0 and j39 are not diagnosed.

**Gain** (B, r = 2h): def pull med 3.31 max 25.97, hold med 1.33 max 12.06, whole frame med 1.13
max 10.11 (the max is a remaining jump over a near-zero input); gate rung 0.25 px leaves 68 frames
over. Fat: pull med 1.63 max 2.85, hold med 1.43 max 1.98, whole frame med 0.97 max 2.82, 0 jumps, the
gate holds at 0.125. `loc` on def: whole-frame max 3.56, 8 places, rung 0.25 leaves 5 frames over.

**Bound** (`k1247s15_bound.ts def`, δ = 0.25 / 2.86 (fat's gain) = 0.0875 px and 0.25 / 3.56 (`loc`'s
def gain) = 0.07 px). Taken under load: frame() median 48.88 ms against s15's ~21 ms locked, so read
the shares, not the ms.

| δ | mode | block p95 | chain p95 | closure p95 |
|---|---|---|---|---|
| 0.0875 | raw | 0.324 | 0.419 | 0.709 |
| 0.0875 | rigid | 0.415 | 0.502 | 0.793 |
| 0.07 | raw | 0.362 | 0.465 | 0.757 |
| 0.07 | rigid | 0.518 | 0.556 | 0.840 |

At 0.0875 raw: hold medians block 0.026, chain 0.079, closure 0.416; pull block 0.194, closure
0.772; settle 0. s15 read block p95 0.155 at δ 0.25 px, so a δ small enough for the measured gain
about doubles what moves at p95. "Recompute only what moved" projects, at p95, block-grained 32-52%
of the frame (a 2-3x saving) but a chain closure 71-84% (1.2-1.4x); hold frames' median block share
is 0.026-0.041.

**Bars** (B unless named; outputs under `.claude/probes/K1240/out/`, never committed):

| bar | master | B | `loc` | `band` |
|---|---|---|---|---|
| gain jumps def / fat | 33 / 0 | 18 / 0 | 8 / 0 | (not run in full) |
| k1279_census vs master (worse / better) | 0 / 0 | 7 / 6 (27528 vs 27594) | 42 / 7 | 42 / 7 |
| k1247s14_census | - | WORSE: muse_hash 4 px in 4, def 2 px in 1 | worse on 8 scenes | - |
| k1247s5_cmp | 44/8/0/0 | 44/8/0/0 | 670/354/134/16 | - |
| union drawn > 0.25 px still / cyc10 / cyc18 | 4 / 14 / 5 | 2 / 16 / 8 | 2 / 11 / 6 | - |
| k1279_motion jump px (3 scenes) | 6/191, 9/106, 5/84 | 0/118, 0/22, 0/7 | - | - |
| facecrops | - | edge pixels only (muse_hash 454 px, ring 4 px) | - | - |
| npm test | green | green (probe-only changes) | | |

B's census-worse crossings: muse_hash x308 65.7 -> 75.1 (EB), user_tw42.lightpaper x14 and
g41_user_tw42 x14 17.7 -> 20, muse_default_tw x338 20.1 -> 21.9, muse_hash x61 80.8 -> 82.2,
muse_hash x182 292.7 -> 294, g41_def_tw64 x174 53 -> 54.2. Crop pairs: `out/s16/crops_d0` (B),
`crops_dloc`, `crops_dband`; per-mode bar outputs in `out/k1279/bars/{final, s16z (B), s16 (loc),
s16b (band), s16k (K1280 only), s16r (B + refS = sc)}`; censuses `out/k1279/census_s16*.json`.

**The conflict.** Every continuous foot departs from the exact nearest foot near a concave bisector,
so continuity moves the look at rest exactly where the old foot jumped. B keeps that change small
(cmp passes, motion passes) but misses census (7 worse), s14 (muse_hash, def) and union cyc (16 / 8
against 14 / 5). `loc` fixes 10 more jumps and breaks cmp. Needs Levi: accept the at-rest change of
continuous feet (B, or `loc` for the corners), or keep master's feet.

**Union regression.** K1280 drives it. muse_hash cyc10 #200 (1.311 px) is addPointAtC's
nearest-segment pick flipping between two border branches that sit within ~0.01 px on a fold (border
25, side index 0): a decision from positions. `K16_PS=1` cuts it to 0.669 px but adds union hits on
g41_def_tw64 still and lightpaper / g41_user_tw42 cyc18 (3 / 14 / 9), so it stays off.

**Next.** (1) Levi's call on the at-rest change. (2) j176: make the Lcut dependency continuous (the
cut length must follow positions, not be chosen from them). (3) Diagnose j45, j0, j39 with
`k1247s16_jumps` / `_cdump` / `_pdump` at the frames the gain tool names. (4) A fold-robust ref
placement in addPointAtC (pick the branch from structure, the ref's run, not from distance). Tools:
`k1247s16_udump.ts` (one union piece before and after its jitter), `_jumps`, `_cdump`, `_polydump`,
`_rdump`, `_capdump`, `_bdump` (a border's s map near an s), `_pdump` (pieces' s and ends over two
frames).
