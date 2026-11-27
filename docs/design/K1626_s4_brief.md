# K1626 stage 4: round the hooks the open joint eyes leave (and carry K1622 over)

Read first: `K1626_s2_brief.md` and `K1626_s3_brief.md` with their handoffs (landed on master), the tools
under `.claude/probes/K1626/` (`jeye.ts`, `eyetab.py`, `widthjump.ts`, `bench.ts`, `cap3.mjs`, `compose3.py`,
`seq3.ps1`), and ledger item K1622 with branch `k1622-s1` (its `fairJunctionArms` / `updateArmBends` in
`particle_system.ts`, tools under `.claude/probes/K1622/`, `perf2.ts`). Base: `origin/master`.

## Levi, 2026-11-26, on the sheet `master | stage 1 | stage 2`

"stage 2 is best! Row 5 and 6 though have some pretty sharply angled triangular hooks because of it though,
and it might be good to round that a bit". Rows 5 and 6 are J132xX254 and J28xX64 on
`?3.FCBQ1H6L4-6NPbeg8HHN09w&rp=gf&gfh=1`: the open eye is a triangle whose arm turns sharply at a corner
(J132: the blue thread's hook around the eye; J28: the salmon triangle's pointed lower corner). The sheet is
`...\worktrees\k1626-s2\.claude\probes\K1626\out\K1626_s2_sheet.png` (read only): look at it first.

## This stage

1. Carry K1622's arm-bend fix over from `k1622-s1` onto master by `git cherry-pick` of its src and test
   commits (or re-apply by hand; the same file moved under it). Measure: does it round those two hooks?
   Sharp turns on arms, his link and `?1`..`?a`, master against carried.
2. If the hooks are still sharp, round them: an eye's arm should turn through its corner over several
   particles, not at one (you own the technique, in `src/physics/`; the eye pressure's lens shape and
   K1622's bend spreading are the two obvious places). Confirm on a frozen settled state before building.
3. Keep: every eye's opening within 0.15 widths of master's (his J138 2.05, J64 1.84, J13 2.02; at most 2
   eyes under 1.5 over his link and `?1`..`?a`); `joint_crossing.test.ts` as written, width jump included;
   sleep and quiescence tests as written; step cost within 5% of master with K1622 included (`perf2.ts` and
   `bench.ts`, under the perf lock); no new pinches or stretched arms (`?8` has 7 sharp turns now: do not
   add). Keep out of `src/render/`. If K1622's carry-over costs the sleep or the 5%, leave it out and say so.

## Done

1. Sharp-turn counts and the two hooks' tightest turn (radius or angle per particle), master against yours.
2. Src, tests, `npm test` green, `npm run build` passes, pins named (the maze golden will move).
3. For Levi: one picture `master | yours`, crops at least 600 px wide at device scale 2, of J132, J28, J138,
   J64 and two other eyes with a hook, his link's look, settled, real time, viewed by you; plus his spot for
   K1622 (world (24.67, 35.10), `pairs.py` on `k1622-s1`).
4. Step cost and time to sleep, master against yours.

## How to work

`Get-Date` first. PowerShell. New worktree `...\worktrees\k1626-s4`, branch `k1626-s4`, from
`origin/master`; `node_modules` as a directory junction to the main checkout's (never `npm install`). Write
only inside your worktree. Read code through the shell; the Read tool only just before an Edit, and for
images. Real-time captures only, under the perf lock (`scripts/perf_lock.ps1`; read a lock before touching
it), ports 5655 to 5659. Commit WIP at every milestone (`git add -f` for probe tools, never their outputs).
Never push, never bare `git stash`, never edit LEDGER.md, never touch the phone, no Chrome
`--virtual-time-budget`. Helpers on sonnet, mechanical only.

## Stop rule

Stop when every Done holds or after 2 h of wall clock, whichever first. A compaction is not a stop: re-read
this brief and `git log`. If rounding costs the openings or the sleep, stop and show the trade with
pictures. On stopping: commit WIP, append `## Handoff (stage 4)` here, commit, and report: verdict first
(safe to land or not), picture paths, numbers, a `Ledger items` list and the handle fields.

## Handoff (stage 4)

Stopped 2026-11-26 08:25 (start 07:42), every Done item measured. Branch `k1626-s4`, worktree
`.claude\worktrees\k1626-s4`; the law is `ada1ca40a`, the picture tools `eb6ce3d38`.

**Verdict: safe to land on the checks; the look is Levi's call.** Both hooks turn rounder, nothing pinches
and no named eye moves. Two trades: his link sleeps 0.5 s of sim later, and one wide eye (J144) narrows
0.155 widths. J28's outside is a round U now, but the eye's inner tip is still a narrow notch.

**K1622 is not carried.** Cherry-picked onto master (`73db0900d`..`aa5c4c989`), it closed J28 by 0.60
widths, narrowed 5 eyes by more than 0.15 and added sharp turns (94 to 97). The law commit takes its src
back out. The branch keeps K1622 s1's tools and handoff, so land with `git merge --squash`, or check out
only `src/physics/particle_system.ts`, the snapshot, `.claude/probes/K1626/` and this brief.

**The law** (`particle_system.ts`, `JOINT_EYE_ARM_BEND = 0.6`, `applyJointEyeArmBends`, called after
`applyJointEyePressure` each iteration):
- For each joint-eye arm, take the mean turn over its interior particles.
- Give each interior particle a pull-only chord between its two neighbours, sized
  sqrt(l1² + l2² + 2 l1 l2 cos(mean turn)), so a corner spreads over the arm.
- Skip the seams and the parked eyes (`jeyeOff`).

On a frozen settled state (`s4v_n8m_f`), J28 went 98.9° to 68.9° with 0 openings moved. Stronger laws
cost more:
- 0.8 and 1.0: 8 to 10 openings moved, sharp turns 101.
- The a/m variants: 30 to 65 openings moved.
(`.claude/probes/K1626/out/s4v_*`, `s4_meas.py`)

**1. Sharp turns, and the hooks' tightest turn** (headless census, his link and `?1`..`?a`, master → law):
- Sharp turns over 60°: 94 → 94 (`?8` 7 → 7).
- Eyes under 1.5 widths: 1 → 0.
- J28 98.9° → 69.1° (radius 0.62 → 0.83 widths).
- J132 60.1° → 50.3°.
- J149 76.3° → 62.7°; J152 68.1° → 54.8°; J140 69.1° → 65.9° (little change).

Openings, in widths:
- The named eyes: J138 2.05 → 2.05; J64 1.84 → 1.87; J13 2.02 → 1.97.
- Narrowed by more than 0.15: only L J144, 3.031 → 2.876. D_1 J124 moved 1.877 → 1.728 (-0.149).
- Widened by more than 0.15: D_2 J132 +0.21, D_4 J5 +0.39, D_4 J92 +0.24, D_7 J116 +0.20, D_7 J174 +0.26.

**2. Src and tests.** Changed: `src/physics/particle_system.ts`.
- `npm test`: 253 files and 3231 tests pass (`out/s4_npmtest.txt`). `joint_crossing.test.ts`, the sleep
  tests and the quiescence test pass as written.
- `npm run build` passes.
- Pins moved: maze golden "default" and "fat", all three checkpoints each (re-frozen). The knot golden is
  unchanged.

**3. Picture.** `.claude/probes/K1626/out/sheet4.png` (untracked, 1672x8088), `master | K1626 s4`:
- Crops are 720 px at DSF 2, of his link in rp=gf, settled in real time under the perf lock, and frozen.
- Rows: J132, J28, J138, J64, J149, J140, J144, K1622's spot, then the whole maze.
- Hashes: master 5efb5d6c (sim 5.00), mine 2aca4f06 (sim 5.41). plucks 0, context losses 0, view still,
  gf passes > 0.
- On-thread fractions are 0.91-1.00 in every crop.
- 1:1 zooms are in `out/sheet4_zoom/` (`zz28.png`, `zz132.png` are the hooks at 2x).

What I saw:
- J132: the inner corner and the top round off.
- J28: the outer U rounds; the inner tip stays a notch.
- J149: the lower corner rounds; the upper tip stays pointed.
- J138, J64, J140, J144 and K1622's spot: no visible change.
- The white speck inside J140 is in both builds.

**4. Step cost and sleep** (under the perf lock; `out/perf4/`):
- `perf2.ts`, total change against master: L +2.30% (median +1.62%), `?1` -0.25%, `?4` +0.53%,
  `?8` -2.19%.
- `bench.ts`, 5 rounds, mean B/A: L 1.012, D_1 0.997, D_4 0.979.
- Sleep: L 5.0 → 5.5 s; D_2 5.6 → 5.0 s; every other maze 5.0 → 5.0 s.

**Next:** Levi looks at `sheet4.png` and picks master, s4, or more rounding at J28's inner tip.
- That tip turns inside one particle pair at the eye's narrow end. A stronger arm bend cannot reach it
  without moving openings.
- If he wants it, the next stage works on the eye pressure's lens shape at that end.
