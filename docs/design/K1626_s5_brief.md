# K1626 stage 5: round a joint eye's inner tip (the narrow end)

Read first: `K1626_s4_brief.md` with its `## Handoff (stage 4)` (landed on master in 2bca35b65) and the tools
under `.claude/probes/K1626/` (`cap4.mjs`, `compose4.py`, `seq4.ps1`, `s4_meas.py`, `s4_census.ps1`,
`jeye.ts`, `eyetab.py`, `widthjump.ts`, `bench.ts`). Stage 4's pictures, read only:
`...\worktrees\k1626-s4\.claude\probes\K1626\out\sheet4.png`, `sheet4_zoom\zz28.png`, `zz132.png`: look at
them first. Base: `origin/master`.

## Levi, 2026-11-26, on stage 4's pictures

Told that at J28 (the salmon triangle) "the eye's inner tip is still a small narrow notch", he answered:
"More would be better if it's not too much cost". So: round the eyes' inner tips further, as far as it is
cheap. Link: `?3.FCBQ1H6L4-6NPbeg8HHN09w&rp=gf&gfh=1`.

## This stage

At J28xX64 the two arms meet at the eye's narrow end in a slit (zz28.png, right half, the tip at the bottom
of the triangle); J149xX305's upper tip is pointed the same way. Make the eye's narrow end a round bottom,
not a slit: the paper inside should end in a curve about as wide as the eye's corners elsewhere. Stage 4's
lead: the eye pressure's lens shape at the narrow end (the target goes to 0 at both ends of the lens; the
end by the crossing must close, the arms cross there, but how fast it opens is free), since a stronger arm
bend moved 8 to 65 openings. You own the technique, in `src/physics/`. Confirm on a frozen settled state
before building.

Cost lines ("not too much cost"), all must hold or you stop and show the trade: step cost within 3% of
master (`bench.ts` and `perf2.ts`-style A/B, under the perf lock); every maze still sleeps, his link within
6.0 s (5.5 s now), the width jump re-sleeps (`joint_crossing.test.ts` as written); sleep and quiescence
tests as written; openings: J138, J64, J13 within 0.15 widths of master, at most 2 eyes under 1.5 over his
link and `?1`..`?a`, at most 3 eyes narrowed by more than 0.15; sharp turns (over 60 degrees) do not rise
(94 now; `?8` 7). Keep out of `src/render/`.

## Done

1. A tip measure (the eye's paper width at a fixed small distance from its narrow end, or the tip's radius),
   master against yours, for every eye on his link; sharp-turn and opening tables as in stage 4.
2. Src, tests, `npm test` green, `npm run build` passes, pins named (the maze goldens will move).
3. For Levi: `master | yours`, device scale 2, settled, real time, viewed by you: 1:1 zooms of J28 and J149
   like `zz28.png`, and stage 4's sheet rows (J132, J28, J138, J64, J149, J140, J144, whole maze).
4. Step cost and time to sleep, master against yours.

## How to work

`Get-Date` first. PowerShell. New worktree `...\worktrees\k1626-s5`, branch `k1626-s5`, from
`origin/master`; `node_modules` as a directory junction to the main checkout's (never `npm install`). Write
only inside your worktree. Read code through the shell; the Read tool only just before an Edit, and for
images. Real-time captures only, under the perf lock (`scripts/perf_lock.ps1`; a capture agent shares it:
read a lock before touching it, wait inside one blocking command, never delete another owner's), ports 5655
to 5659. Commit WIP at every milestone (`git add -f` for probe tools, never their outputs). Never push,
never bare `git stash`, never edit LEDGER.md, never touch the phone, no Chrome `--virtual-time-budget`.
Helpers on sonnet, mechanical only.

## Stop rule

Stop when every Done holds or after 2 h of wall clock, whichever first. A compaction is not a stop: re-read
this brief and `git log`. If the tip cannot round inside the cost lines, land nothing in src and show the
best trade with pictures and numbers. On stopping: commit WIP, append `## Handoff (stage 5)` here, commit,
and report: verdict first (safe to land or not), picture paths, numbers, a `Ledger items` list and the
handle fields.

## Handoff (stage 5)

2026-11-26, 14:37 (stopped at Done, inside the 2 h). Verdict: **safe to land** `f3e4ef3c8`. Every
cost line holds, though the narrowing line is exactly at its limit (3 of 3). J28's inner tip is now a U.
J149's upper tip barely moved and looks the same in the pictures.

**The law.** `applyJointEyeHookRadius` (particle_system.ts) runs after the s4 arm bend. Pairs of interior
eye-arm particles 2 to 4 apart want at least the chord of a circle of radius R = 1.3 tw:
`2R sin(s/2R)`, or 2R once the arc passes a half circle. It only pushes pairs apart, at stiffness 0.6.
Pins moved: the byte_identity maze fingerprints `default` and `fat`. The knot snapshot did not move.

**Tips on his link** (`s5_tiptab.py`, paper width 0.25 / 0.5 widths from the apex, master -> s5):

| Eye | Arm | w25 / w50, master | w25 / w50, s5 |
|---|---|---|---|
| J28xX64 | 0 | 0.40 / 0.57 | 0.86 / 1.18 |
| J140xX292 | 0 | 0.64 / 0.90 | 0.83 / 1.10 |
| J149xX305 | 0 | 0.91 / 1.14 | 0.98 / 1.24 |
| J81xX134 | 1 | 0.76 | 0.86 |

- No tip narrows by more than 0.11 (J152's arm 1: 1.66 -> 1.56).
- Tips the law leaves narrow:
  - J145xX301 arm 0: 0.41 -> 0.46.
  - J13xX38 arm 1: 0.42.
  - J27xX63: 0.46.
  - J81xX134 arm 0 (apex 0.54): 0.54.

**Census** (fresh, L plus `?1`..`?a`, master -> s5):

| Measure | Result |
|---|---|
| Sharp turns | 94 -> 91 (L 53 -> 51; `?8` 7 -> 7; `?9` 4 -> 5; `?2` and `?a` each down 1) |
| Eyes under 1.5 widths | 0 -> 0 |
| J138, J64, J13 | unchanged |
| Eyes with an arm turn over 45 degrees | 112 -> 86 |
| L's largest hook | 69 -> 63 degrees |

Eyes narrowed by more than 0.15, three in all:

- `?4` J5xX19: -0.36.
- `?4` J92xX138: -0.35.
- `?5` J98xX110: -0.16.

I checked the first two at 14:36 (`out/s4v_d4_r13k6_f`, `b0d6b7165`'s switch):

- With the law switched on after a plain settle (frozen), both move by +0.00.
- With the law on from the start, the run reproduces -0.36 / -0.35.

So the law changes the settle path, but its own force does not hold those two eyes narrow.

**Sleep.**

- Census, L: 5.50 -> 5.00 sim s.
- Census, `?a`: 5.00 -> 5.40. Every other maze stays at 5.00.
- Page shots: master froze at 5.41, s5 at 5.00.
- `npm test` is green: 252 files, 3231 tests, including sleep, quiescence and joint_crossing's width jump.
- `npm run build` passes.

**Step cost, s5 / master.**

bench.ts:

| Maze | Mean | Median step |
|---|---|---|
| L | 0.996 | |
| `?1` | 0.983 | |
| `?4`, 5 rounds | 1.042 | |
| `?4`, 9 rounds, under the lock | 1.025 | 1.040 |

`?4` varies a lot from round to round. The B - A difference of the round means is -6.4 to +9.1 ms on about
150 ms.

perf5.ts (one process, alternating, 40 frames):

| Maze | Total |
|---|---|
| L | -1.58%, then -0.33% |
| `?1` | -1.35% |
| `?4` | +0.41% |

The law's own timed share of the step is 0.08%.

The rest of the `?4` bench gap is inferred, not tested: it would come from the different settle state.

**Pictures** (untracked, `.claude/probes/K1626/out/`, DSF 2, real time, settled, viewed):

- `sheet5.png`: stage 4's rows plus the whole maze, master | s5.
- `sheet5_zoom/zz28_2x.png` and `zz149_2x.png`: zz28.png's 2x framing.
- `sheet5_zoom/zz28.png` and `zz149.png`: 1:1.
- Capture hashes: master 2aca4f06 (s4's), s5 29cee13b.

**Lesson (capture scripts).** Stage 4's vite preview servers on 5655 and 5656 outlived seq4.ps1. Its
finally kills two levels of children, and vite's node sat one level deeper. The new servers failed
`--strictPort`, the wait loop saw the old listeners, and the first s5 sheet silently showed s4's two
builds. seq5.ps1 now:

- refuses an occupied port;
- checks that the listener's command line names this build's outDir;
- kills by outDir in finally.

**Open.**

- J149's tip: R 1.6 rounds it to 1.21 (and J28 to about 1.10), but narrows 11 eyes by more than 0.15
  (J152's tip 0.93 -> 0.57). R 1.45 narrows 6.
- The narrow tips listed above.
- A same-state step-cost probe would settle the `?4` bench reading.
