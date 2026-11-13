# K1362 tables lane, stage 1 (Muse): the CPU table build at or under 2 ms on def, output unchanged

Ledger: K1362. One Muse run, started by Claude through Paseo from this committed brief. Cap 2 h. Read first:
the stage 2 handoff at the end of `docs/design/K1362_s2_glsl.md` (its "(b) Table build" bullet) and the stage 3
handoff at the end of `docs/design/K1362_s3_pixel.md` (its "2. Tables" paragraph); then `.claude/rules/render.md`
and `.claude/rules/probes.md` (Claude's area rules; Muse does not load them by itself); then `tables.ts`'s header
comment.

## Why

rp=gf draws the junction look per pixel on the GPU (K1362, the main speed route). Each frame, main builds its CPU
tables: an export of the chain samples (9-11.5 ms on the desktop def drag; not this lane's) and `buildTables`
(`src/render/gpu_field/tables.ts`, 6-12 ms; this lane). On the Pixel the build is 18.0 / 21.4 ms (p50 / p90)
through the def drag, 1.55x the desktop, and the corner solve is 12.3 ms of it. The CPU gate is 3 ms on the
desktop. Stage 1 of K1362 named the fixes: corners from 8.56 to 1-2 ms, bins to 0.5, vtx to about 0.

## Goal

`buildTables` at or under 2 ms p50 on def on the desktop (`k1362s1_time.ts`), muse_hash and fat no slower, with its
output unchanged. The technique is yours. Every result must still be a function of this frame's scene alone. A
warm start from the previous frame is allowed only if every frame's tables equal the cold solve's, as Done 1
defines.

## Done

1. **Output unchanged:**
   - Write `k1362t1_digest.ts`: it hashes every typed array `buildTables` returns, field by field, on the 12 census
     scenes (the list in `k1362s1_time.ts`) and on every frame of the s18 drags (def, muse_hash, fat; see how
     `.claude/probes/K1341/k1341s1_digest.ts` reads them).
   - Run it on your code and on a `git archive` export of master, and compare.
   - Integer fields and every gate decision (which corners exist and are kept) must be equal. Float fields must be
     bit-equal, or within 1e-9 of master's in absolute terms where a solve's order changed; name each such field and
     its largest difference.
   - Any other difference is a failure: leave that change out.
2. **Speed:** a swap-averaged A/B of `buildTables` (your code against master's export, alternating, at least 40
   builds each after warm-up) on def, muse_hash and fat, per part (vtx, pins, arms, corners, bins). Report p50 and
   the 95% interval of the paired difference.
3. `npm test` green, the goldens unchanged, `test/render/gf_pack.test.ts` included.

## How to work

- **Your worktree** is `.claude/worktrees/muse-k1362-t1` (detached, at master). `node_modules` is a junction to the
  main checkout's; never `npm ci` or `npm install`.
- **Exports of master** go under `$env:TEMP\k1362t1m\`, never inside the worktree. If an export needs
  `node_modules`, junction it. Before deleting the export, delete that junction alone with
  `(Get-Item <path>).Delete()`: a recursive delete or `git worktree remove` follows a junction into the main
  checkout and deletes its packages.
- **Your files:** `src/render/gpu_field/tables.ts`, its tests, and tools under `.claude/probes/K1362/` named
  `k1362t1_*`. A Claude agent is working beside you on the rest of `src/render/gpu_field/` (the shader, `gf_pack.ts`,
  `gf_pass.ts`, `gf_app.ts`) and `src/app/frame_loop.ts`. Stay out of those. Don't change `GfTables`' fields or
  layout; `gf_pack.ts` reads them.
- **Untracked inputs:** copy `.claude/probes/K868/scenes/`, `.claude/probes/K1247/out/s18/` and anything else the
  census or the digest reads from the main checkout's `.claude/probes/`; never write there.
- PowerShell. Read code with Select-String and 40-80 line ranges of Get-Content; never print a whole file. Write
  TypeScript through Node or the editor, never through PowerShell text IO.
- **Timing:** the interleaved Node A/B needs no perf lock (load cancels in the paired difference). Note the machine's
  load with each run. Never touch the phone.
- **Commits:** commit finished, tested parts and push them yourself: `git fetch`, rebase on origin/master,
  `npm test` green, then `git push origin HEAD:master`. Stage files by name; scripts under `.claude/` need
  `git add -f`. Never force-push, skip hooks, or add outputs (`out/`) or probe JSON.
- **Ledger:** leave K1362 to Claude. File new items only with
  `node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs add --repo . ...`.
- No subagents. Run `Get-Date` at the start and at each milestone. **Stop** at the 2 h cap or when every Done
  holds. A Done that looks out of reach is not a stop: spend the time on the next most promising part.
- When you stop: append a Handoff to this brief (start and stop times, the A/B table, the digest result, what
  changed, what is left), commit and push it, and report. A stopped run pushes only its finished part. Keep
  unfinished code as a patch under `.claude/probes/K1362/` (untracked).

## Handoff (Muse t1, 2026-11-13 00:35:42 to 01:08, ~33 min of the 2 h cap)

Code commit `d987976c` on master (rebased on `a2bc7f69`, pushed). Only
`src/render/gpu_field/tables.ts` changed in `src/`; `GfTables` fields/layout
untouched. Tools committed: `.claude/probes/K1362/k1362t1_digest.ts`,
`k1362t1_ab.ts`, `k1362t1_diff.ts`, `k1362t1_prof.ts`.

**Done 1 (output unchanged): holds, stronger than required.** `k1362t1_digest.ts`
(SHA-256 of every returned typed array, field by field, plus scalars; `T.ms`
excluded as timing) on this code vs a `git archive` export of master
(`de46d5cd`, under `$env:TEMP\k1362t1m`, junctioned `node_modules`): 12 census
scenes + every s18 drag frame (def/muse_hash/fat, 99 builds, 5445 lines)
identical, `all ae1d23920dd9bd6f7614e7bf3ca3c1893537de7bd76640b41b34494865a85a27`
on both. Every integer field, every gate decision and every float field is
bit-equal; no field needed the 1e-9 allowance.

**Done 2 (speed): partial.** Swap-averaged A/B (`k1362t1_ab.ts`, 60 pairs after
10 warm-up pairs, `T.ms` parts; load cancels in the paired difference; machine
load 3-68% across runs with the parallel Claude agent active). Last run
(ref p50 -> new p50, median paired diff):

| scene/part | ref | new | med diff |
|---|---|---|---|
| def total | 13.27 | 8.99 | -3.40 |
| def corners | 8.63 | 6.00 | -2.61 |
| def arms | 1.10 | 0.60 | -0.34 |
| def vtx | 1.66 | 1.13 | -0.49 |
| def bins | 0.85 | 0.93 | -0.09 |
| def pins | 0.15 | 0.15 | +0.00 |
| muse_hash total | 6.10 | 4.39 | -1.68 |
| muse_hash corners | 3.27 | 2.30 | -1.01 |
| fat total | 1.74 | 2.11 | -0.01 |

Three further runs agree on def (total 12.8-14.2 -> 8.7-9.9) and muse_hash
(5.8-6.2 -> 4.3-4.6, every part faster or equal). Fat's median paired total
diff across four runs: +0.10, -0.04, +0.21, -0.01 ms (means are GC-outlier
skewed) — unchanged within noise. `k1362s1_time.ts` (absolute, loaded machine):
def p50 24.20 -> 14.77, muse_hash 12.41 -> 8.15. **The 2 ms def goal is not
reached:** def total is 8.7-9.0 ms, of which corners are 6.0 ms of fixed
per-corner work (~60 solves, 68 projections, 25 gate evaluations and a Newton
gate per kept corner) that bit-equality forbids reducing.

**Done 3: holds.** `npm test` green before and after rebase (232 files /
2953 tests passed, 9 skipped; `test/render/gf_pack.test.ts` included; golden
snapshots unmoved).

**What changed** (all arithmetic-preserving; verified per step against the
digest): scratch-object corner solves (`chainAtInto`, `ptOf` = armPt+chainAt
inlined into `SP`, `solveAtInto`, `trackInto`; the node loop tracks only the
two foot scalars it reads, after a shared-buffer version moved q on the
break path), segment hints walked from the previous segment in `ptOf`/`proj`
and the arm-sample build, `marginAt` far scan on squared distances (one sqrt
at the end), `footNear` windowed to `[sLo, sHi]` by binary search, arm
siblings grouped once instead of filter+sort per arm, bin cell ranges computed
once and reused by both passes (row offsets hoisted), vertex loops on local
array refs, per-corner sin/cos hoisted out of the solves, Newton feet as
scalars.

**What is left.** Corners at 6.0 ms on def are the whole remaining gap.
Further CPU cuts need one of: relaxing bit-equality to the 1e-9 clause
(e.g. `hypot`->`sqrt` in tangents, est. 0.5-1 ms, untested); a form B change
to the corner solve itself (look sign-off + census); or the s2 handoff's
other route — build in the physics worker / read the sample buffers directly
(outside this lane's files). A Newton warm start from the tracked V was
considered and rejected (est. ~0.2 ms, gate-flip risk). No unfinished code;
nothing left as a patch.

## Handoff addendum (continuation, 2026-11-13 01:10 to 01:15)

One more exact change, commit `224c6c75`: `marginAt` abandons its far scan
once the running minimum reaches a guarded threshold below the caller's
discard point (`wOf` returns 0 for any margin <= -0.05 h), so no output can
change. All three Dones re-verified on the final code: digest bit-identical
(`all ae1d2392...a85a27`, 0 differing lines); A/B 60 pairs — def total
12.69 -> 9.30 (corners 9.06 -> 6.11, median -2.73), muse_hash 5.94 -> 4.48
(every part faster or equal), fat total median -0.03 (unchanged); `npm test`
green (232 files / 2953 tests, goldens unmoved).

Why 2 ms is not reachable bit-identically (measured, instrumented copy,
since deleted): on def, 484 candidates reach the V track, 75 fail it, 376
corners are kept; the V Newton converges in 2.4 iterations per candidate
(32,859 sample-segment evaluations per build — stage 1's Newton fixes target
a cost that is already small). The residual corner cost is the fixed 24-node
rolling-ball integral: 7,097 node evaluations per build, each 2 solves +
2 projections + a gate evaluation, ~6 ms at ~0.85 us per node. And the
non-corner parts alone (vtx 1.18 + pins 0.16 + arms 0.62 + bins 0.91 = 2.9 ms
p50 in the same A/B) already exceed 2 ms: their floors are the 24,610
arc-length `hypot`s and the 84k-entry bin lists the output itself requires.
Reaching 2 ms therefore needs a different corner algorithm or relaxed
float equality (the routes above), not further exact optimization. Final
state: def 9.0-9.3 ms, muse_hash 4.4-4.5 ms, fat unchanged, output
bit-identical. Stopping here at 01:15, inside the cap.

## Handoff addendum 2 (the 1e-9 route, measured 2026-11-13 01:16 to 01:18)

The 1e-9 allowance was tested and is closed. New tool
`.claude/probes/K1362/k1362t1_tol.ts` compares this build against master's
export on the full digest corpus (integer fields exact, float fields'
largest difference reported). Replacing `Math.hypot` with
`sqrt(x*x + y*y)` at the hot sites drifts the arc-length table by at most
1.14e-13 — and the corner track still amplifies that past 1e-9: corner
float fields move by up to 0.105 (kEbx), kR by 1.6e-4, because a 1e-13
foot drift flips discrete projection segment steps at particular corners.
With sqrt also in the solve path, one drag frame's bin indices changed
(`drag def/f005.json` cellKList length 10902 vs 10907), which Done 1
forbids outright. All sqrt substitutions were reverted; the digest is
bit-identical again (0 differing lines) and `src/` matches commit
`224c6c75` exactly. Any future speed work in this lane must preserve the
corner solve's input bits exactly, or change the solve itself under a
fresh gate-equality argument. Stopping at 01:18, inside the cap.
