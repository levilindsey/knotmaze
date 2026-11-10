# K1247 stage 3: make the redesigned outline fast

Ledger: K1247 (K1240's frame cost). One Claude Opus agent in its own worktree, on its own branch. Cap 2 h.

## Why

K1240 is the redesign: one outline (offset-polyline borders, cuts, corner arcs) for both looks.
`structure()` decides the diagram once; `frame()` computes the points every frame. Levi, 2026-11-09:
keep the redesign and "explore more ways to speed up the redesign" (no fallback to K1040's GPU field).

- Stage 1 (`docs/design/K1247_fast_frame.md`) took def's frame from 322 to 38 ms.
- Stage 2 (`docs/design/K1247_s2_speed.md`, Handoff 1, code at 1346ad87 on master) took it to 20.7 ms median and
  22.6 ms p95, with bit-identical output. Phases: corners 8.4, setupBorders 4.7, cutsEyesExposure 4.5,
  regions 2.1, pieces 1.3.

Exact micro-cuts are spent. What's left is call counts: per frame, `footNearM` runs 31.8k times and
`marginOfC` 16.7k, because 386 corners each take 32 Newton steps and every step re-foots both arms. The
frame also allocates about 25 MB.

## Goal

`frame()` on def: ≤3 ms median and ≤6 ms p95 under the lock. The technique is yours. Measure each idea,
keep what gains, revert what doesn't. Handoff 1's leads, roughly by size:

1. **Corners (the biggest phase).** Any of these:
   - fewer steps;
   - a better solve (the corner is a smooth one-parameter curve: a higher-order method, a closed form,
     or a fit);
   - warm starts with a proof. Read Handoff 2 of `K1247_fast_frame.md` first, for how the unproven
     ones broke.
2. **WebAssembly** for `footNearM`, `marginOfC`, `scanRange` and other tight loops. Any toolchain that
   `node scripts/run_node.mjs` can run. Note what Vite's app build would need.
3. **Cuts:** a uniform grid over border segments, built once per frame, in place of the block scan.
4. **Allocation:** 25 MB a frame becomes GC pauses in the phone's p95. Reuse buffers wherever the output
   needn't be fresh.
5. **Decide more in `structure()`:** anything that depends only on the diagram.

## Accuracy (Claude's call, 2026-11-09)

Bit-exactness is no longer required; the look is.
- **Allowed:** every face, region and piece within 1e-3 h of stage 2's output (h = halfWidth), on every
  check scene. Counts, piece kinds and order stay the same.
- **Cold = warm** within 1e-6 h: a frame never lands on a different answer because of earlier frames.
- **The exact checks** (verify, faces, cmp_*) then report distances instead of matches. Read them
  against these bounds, and report the largest distance per scene.

## Checks

All in `.claude/probes/K1240/proto/`. Stage 2's "Same output" section applies:
- `k1247c_final.ps1`. From your worktree, pass
  `-Base ../../../../muse-k1240-s1/.claude/probes/K1240/out/k1247/base`. Read each log's last line.
- Run `k1247c_dump.ts` once before your first change.
- `k1247c_coldwarm.ts`.
- `k1247c_time.ts` under the lock (`run_locked_k1247s2.ps1`).

Stage 2's tools are there too: `k1247s2_prof.ts` (with `K1247_AB=1` for A/Bs), `k1247s2_heap.ts`,
`k1247s2_cpuagg.mjs` and `k1247s2_lines.mjs`.

## Done

Two timing runs under the lock, before and after, with def's phases. Every check passes within the
bounds above, and `npm test` is green. If 3 / 6 ms isn't reached by the cap, commit the fastest version
that passes, with its numbers and what each route gained.

## Rules

- PowerShell. Read code through the shell (`Select-String`, ranges of `Get-Content`). Use the Read
  tool only right before an Edit. No helpers.
- Junction `node_modules` from the main checkout (`New-Item -ItemType Junction`). Never run `npm ci`.
- Perf lock: `$env:TEMP\claude-perf.lock`, one line (owner, start time, what).
  - Take it for every timing and delete it when you're done.
  - While someone else holds it, wait inside one blocking command.
  - A lock older than 30 min is stale.
- Your files: `.claude/probes/K1240/proto/` (`outline.ts`, the checks, any WASM sources and builds).
  No `src/` changes. Commit WIP on your branch at each milestone, with `git add -f` for tools and
  sources, never for outputs. Never push, never edit `LEDGER.md`, and never touch the main checkout.
- Stop when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Then commit WIP, append a handoff to this brief, and report. A compaction is not a
  stop: re-read this brief and `git log`.

## Report

Short and plain:
- def's median and p95, and its phases, before and after;
- each route you tried and what it gained;
- the checks' results, with the largest distance per scene;
- what's left;
- your last SHA.

End with `Ledger items` and K1247's handle fields (owner, branch, last commit, evidence, next).

## Handoff 1 (stage 3 agent, 2026-11-09 16:05 to 16:50)

Stopped 75 minutes before the cap with the gate not reached. Seven bit-exact cuts took def from 22.7 to
18.4 ms median (p95 33.7 to 21.4-22.8). The last cuts gained 0.1 ms or nothing, and each route still
open (flat output, WASM, a corner-solve rework) is bigger than the remaining time with its checks.
Branch `worktree-agent-a59c008133b174d03`. The timed code is at `fca455fb`; the last commit (`5613de0d`)
adds only the floor probe.

### Numbers (locked `k1247c_time.ts`; `out/k1247c_time/time_s3*.json`)

The "before" run is stage 2's code (def7274a), timed in this session. It reads about 2 ms slower than
stage 2's own after-run of the same code (20.76), so compare runs within one session.

| | before (s3before1, def7274a) | after (s3after1 / s3after2, fca455fb) |
|---|---|---|
| def median / p95 | 22.67 / 33.67 | 18.35 / 22.79, 18.36 / 21.36 |
| def setupBorders | 5.72 | 4.90, 4.65 |
| def corners | 9.96 | 6.88, 6.56 |
| def cutsEyesExposure | 5.52 | 4.18, 4.17 |
| def regions | 2.57 | 2.03, 1.89 |
| def piecesCapsEtc | 1.63 | 1.37, 1.47 |
| ring median / p95 | 4.87 / 5.64 | 4.26 / 7.08, 4.38 / 7.08 |
| fat median / p95 | 29.48 / 38.32 | 28.49 / 38.63, 27.72 / 39.60 |
| def (consistent) median / p95 | 29.35 / 31.25 | 26.52 / 34.85, 26.35 / 37.50 |

### Routes (route 4, allocation and boxing; every cut bit-exact)

After each cut, verify showed 54/54 lines at 0.00e+0. Gains are from unlocked A/Bs of
`k1247s2_prof.ts` against the previous commit, on def, by phase.

| Cut | Commit | What | Gain |
|---|---|---|---|
| 1 | ee2059c4 | `footWinFast` without a closure; `solveVC`'s foot searches pruned by the last foot | about 0.1 |
| 2 | c20e52d3 | `footNearM` and `marginOfC` take no double arguments (x, y in `kfXY`; the hint is out's own foot) | corners 8.5 to 7.2 |
| 3 | 3feaa1ea | `footWinFast` and `fwScan` take arguments and state through Float64Arrays (`fwA`, `fwS`) | corners 0.25 |
| 4 | a114d3ed | crossings without per-crossing closures and arrays (`pickCand`, module scratch); border inserts in typed arrays with counts | cuts 0.25 |
| 5 | de884211 | `segsNearC` and `sliceSegsE` fill in place and return counts | cuts 0.3 |
| 6 | ddd572fe | `cutFoldsC`'s fold sequence in an Int32Array scratch with a manual splice | setupBorders 0.1-0.3 |
| 7 | fca455fb | `setupFrame`'s depth pins through `addPinC`, not a closure per crossing | none measurable |

Two V8 facts did most of the work:
- **Boxing.** A double passed to or returned from a call that is not inlined is boxed as a HeapNumber,
  and so is a double stored in a module-level `let`. Float64Array slots and object fields are not. The
  corner integrator's hot calls passed doubles about 50k times a frame.
- **`arr.length = 0`** on a `number[]` drops its backing store, so the next pushes regrow it from empty.
  Filling in place and keeping a count avoids that.

Allocation fell from 21.3 to about 10 MB a frame (`k1247s2_heap.ts`). Most of what is left is the
output itself: `regionSeqEmit` 2.6 MB, `regionsPhaseC` 0.9, `piecesPhaseC` 0.9, `crossingsPhaseC` 0.8.

Ruled out:
- `kfGN` = 16 corner nodes: fails accuracy at about 0.5 h. The node count guards the branch tracking,
  not just the integration error.
- Newton tolerance in `advanceToC`: it averages 1.87 pair evaluations per advance, near the floor.
- A Lipschitz skip in `marginOfC`: `footWinFast` already prunes at the current distance, and the walk
  dominates.
- `buildBorderC`: about 35 ns per border vertex, already tight.
- `mergeBorders` (6% of the frame): it copies 63k border points through five arrays and is close to
  memory-bound.

### The output format is a floor (`k1247s3_floor.ts`, locked)

The probe takes def's real output and rebuilds the same shape:

| def (517k numbers, 4 MB as doubles) | median | p95 |
|---|---|---|
| fresh objects, arrays grown by push | 7.07 | 9.97 |
| fresh objects, exact-size `slice` per array | 2.05 | 4.86 |
| one flat Float64Array plus offsets | 1.16 | 1.32 |

On fat the same three read 4.52 / 1.25 / 0.84 ms median. In today's shape (`number[]` per piece,
region and face), the output alone takes about 2 ms median and 5 ms p95, almost the whole 3 / 6 ms
budget. The gate therefore needs a flat output (typed arrays plus offset tables) whatever happens to
the compute. That is the same format Route 5 (the physics worker) needs for its snapshot.

### Where the 18.4 ms goes (self time, `--cpu-prof`, def)

`marginOfC` 9%, `footNearM` 8%, `crossingsPhaseC` 6%, `mergeBorders` 6%, `fwScan` 5%, `buildBorderC`
5%, GC 5%, `cutFoldsC` 4%, `regionsPhaseC` 4%, `setupFrame` 4%, `eyeComboC` 3%. No function is above
about 1.7 ms.

### Checks at fca455fb

- `k1247c_final.ps1 -Base ../../../../muse-k1240-s1/...` (`out/k1247c_final/`): every step exits 0.
  - verify: ALL KEYS AND FIELDS MATCH. All 54 lines are at 0.00e+0, so the largest distance is 0 on
    every scene (def, ring, fat, g41_def/ring/user tw42 and tw64, muse_default_tw, muse_hash,
    user_tw42.lightpaper).
  - faces: no diffs.
  - coldwarm: COLD = WARM (worst 0.00e+0).
  - structure: STRUCTURE IS THE DIAGRAM.
  - pieces: ordered keys identical.
  - move_def: rigid maxDiff 4.8e-9.
  - outline_test: ALL PASS.
  - cmprows still / 0.1 / 0.5: ALL WITHIN TOLERANCE.
  - cmp_cold, warm and move show the same fast-versus-builder distances as stage 2 (def max point
    1.4e-9), because the output is bit-identical.
- `npm test` is green: 220 files, 2887 tests.

### Tools (committed, `.claude/probes/K1240/proto/`)

- `k1247s3_floor.ts`: the output-format floor above.
- `k1247s3_inst.ts`: per-function times through an instrumented `outline_ab.ts`, for relative numbers
  only.
- `run_locked_k1247s3.ps1`: the perf-lock wrapper.

### Next

3 ms is a 6x cut. No single-threaded JS route left gets there with exact or near-exact output, so
these need Levi's word or a bigger stage:
1. **Flat output** (the floor above). It changes what the renderer reads, so it touches `src/` when it
   lands; in the probe it means a flat writer plus check adapters. Against exact-size slices it saves about 0.9 ms median and
   3.5 ms p95, and Route 5 needs it anyway.
2. **WASM for the corner integrator** (`footNearM`, `marginOfC`, `fwScan`, `advanceToC`). No toolchain
   is installed (no AssemblyScript, wabt, clang/emcc, rustc or zig). AssemblyScript as a devDependency
   is the lightest; Vite loads `.wasm` through `?init` imports. With the boxing gone, the gain is
   uncertain, so measure one kernel before porting.
3. **A corner-solve rework under the 1e-3 h bound**: fewer foot evaluations per node, or fewer nodes
   with a bracket that keeps the branch (16 nodes lost it).
4. **Decision for Levi: the gate.** def's everything-moves benchmark is the worst case. A real drag
   moves a few chains, and the sim sleeps at rest. An incremental frame (dirty chains only) plus the
   worker might meet a realistic-drag gate without meeting this one.
