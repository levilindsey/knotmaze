# K1362 tables lane, stage 2 (Muse): the gf worker's build per rebuild cut to a third, output unchanged

Ledgers: K1370 (this), K1362. One Muse run, started by Claude through Paseo from this committed brief. Cap 2 h.
Read first: the handoffs at the end of `docs/design/K1362_t1_muse_tables.md` (your stage 1: what is already fast,
and why a 1e-13 drift is not allowed) and `docs/design/K1362_c1_cpu_off_main.md` (the gf build worker); then
`.claude/rules/render-gpu-field.md`, `.claude/rules/render.md` and `.claude/rules/probes.md` (Claude's area rules;
Muse does not load them by itself); then the headers of `src/render/gpu_field/gf_build.ts`, `gf_worker.ts` and
`tables.ts`.

## Why

rp=gf draws the junction look per pixel on the GPU (K1362, the main speed route). Since c1 its tables build in a
module worker (`gf_worker.ts` runs `gfBuild`: the lean scene export, then `buildTables`) and main pays 1.6 ms per
frame. But each rebuild takes the worker 11-15 ms on the desktop drags (def 11.2, fat 14.9) and 22.7 ms on the
Pixel (tables 20.0, of which the corner solve is most). At a 16 ms frame the drawn tables then trail the physics by
about two frames on the phone. The corner solve is exact and its per-node cost is near its floor (t1), so the
remaining levers change how much of it runs per rebuild, or where.

## Goal

The worker's wall time per rebuild (request posted to tables received, as gf_app.ts measures it) at or under a
third of today's on the def and fat desktop drags, muse_hash no slower, every frame's tables bit-identical to a
cold `buildTables` of the same scene, and main's CPU per frame still at or under 3 ms. The technique is yours.
Candidates, in the order I'd try them:

1. **Split the build across workers.** Corners are independent of one another: a small pool (2-4 workers, sized from
   `navigator.hardwareConcurrency`) each solving a slice of the corners, merged in order. Every slice must give the
   bits a single build gives (check that no scratch state or segment hint carries a result across corners).
2. **Reuse corners whose input bits did not change.** First measure on the s18 drags what fraction of corners have
   bit-identical inputs (their arms' samples, the window the solve reads) from one frame to the next. Build it only
   if the fraction is worth it; a reused corner must equal its cold solve bit for bit.
3. Anything else that keeps Done 1.

## Done

1. **Output unchanged:** `.claude/probes/K1362/k1362t1_digest.ts` gives `all ae1d2392...a85a27` on the 12 scenes and
   every s18 drag frame, the same as master. For a pool or reuse, add the digest of the tables the new path returns
   (pool merge, reuse across the drag's frames in order) and show it equals the cold build's on every frame.
   `test/render/gf_build.test.ts` extended to cover the new path.
2. **Speed:** the worker's wall time per rebuild and main's ms per frame, before and after, on the def, muse_hash and
   fat desktop drags with `.claude/probes/K1362/k1362c1_bench.ps1` (c1's tool). Take the perf lock for it (below).
   Report p50 and p90, and the machine's load.
3. `npm test` green, the goldens unchanged.

## How to work

- **Your worktree** is `.claude/worktrees/muse-k1362-t2` (detached, at master). `node_modules` is a junction to the
  main checkout's; never `npm ci` or `npm install`.
- **Exports of master** go under `$env:TEMP\k1362t2m\`, never inside the worktree. If an export needs
  `node_modules`, junction it. Before deleting the export, delete that junction alone with
  `(Get-Item <path>).Delete()`: a recursive delete or `git worktree remove` follows a junction into the main
  checkout and deletes its packages.
- **Your files:** `tables.ts`, `gf_build.ts`, `gf_worker.ts` and `gf_app.ts` (its worker plumbing only) in
  `src/render/gpu_field/`, new files there, their tests, and tools under `.claude/probes/K1362/` named `k1362t2_*`.
  A Claude agent is working on the shader (`gf_glsl.ts`, `gf_pass.ts`, `gf_pack.ts`) and the phone; stay out of
  those. Don't change `GfTables`' fields or layout.
- **Untracked inputs:** copy `.claude/probes/K868/scenes/`, `.claude/probes/K1247/out/s18/` and anything else the
  digest or bench reads from the main checkout's `.claude/probes/`; never write there.
- PowerShell. Read code with Select-String and 40-80 line ranges of Get-Content; never print a whole file. Write
  TypeScript through Node or the editor, never through PowerShell text IO.
- **Perf lock** for the in-app bench: `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only
  to time, delete it after. If another owner holds it, wait inside one blocking command (poll each minute, up to 30
  minutes). Node A/B runs need no lock. Never touch the phone.
- **Commits:** commit finished, tested parts and push them yourself: `git fetch`, rebase on origin/master,
  `npm test` green, then `git push origin HEAD:master`. Stage files by name; scripts under `.claude/` need
  `git add -f`. Never force-push, skip hooks, or add outputs (`out/`, `out_*`) or probe JSON.
- **Ledger:** leave K1362 and K1370 to Claude. File new items only with
  `node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs add --repo . ...`.
- No subagents. Run `Get-Date` at the start and at each milestone. **Stop** at the 2 h cap or when every Done
  holds. A Done that looks out of reach is not a stop: spend the time on the next most promising part.
- When you stop: append a Handoff to this brief (start and stop times, the before/after table, the digest result,
  what changed, what is left), commit and push it, and report. A stopped run pushes only its finished part. Keep
  unfinished code as a patch under `.claude/probes/K1362/` (untracked).

## Handoff (Muse t2, 2026-11-13 02:50:45 to 04:10, ~80 min of the 2 h cap)

Commits on this worktree, to be pushed to master: `ebd0ccaa` (pool),
`4e550786` (trimmed slice prefixes), `3a6f8d11` + `6cd88036` (measured
pool gates; the shipped gate is >= 28000 scene points), plus this handoff.
Files: `src/render/gpu_field/tables.ts`, `gf_worker.ts`,
`gf_slice_worker.ts` (new), `gf_app.ts` (plumbing: `pool` opt + stat),
`test/render/gf_build.test.ts`; tools `k1362t2_digest.ts`,
`k1362t2_measure.ts`, `k1362t2_prof.ts`, `k1362t2_run.ps1`,
`k1362t2_check.mjs`. `GfTables` fields/layout unchanged; the shader
files untouched.

**Done 1 (output unchanged): holds.** `k1362t2_digest.ts` builds every
census scene and s18 drag frame with `buildTablesPooled` at slice counts
1/3/6 and compares line by line with cold `buildTables`:
`all ae1d23920dd9bd6f7614e7bf3ca3c1893537de7bd76640b41b34494865a85a27`,
5445 lines, 297 pooled builds, 0 mismatches — the same digest as master.
`gf_build.test.ts` extended (pooled = cold at slices 1/2/3/5 on the full
and lean scenes; trimmed slice prefixes assemble to cold; partition
coverage): 10 tests pass. In-app VERIFY=1 on the pooled build (bench
step): verified with 0 mismatches. Corner-audit, as the brief asked: the
corner solve's scratch (SP, Q buffers, the arm-sample map) is fresh per
`solveGfCorners` call, every segment hint is per corner pair, and no
result carries across corners; slices merge in enumeration order.

**Done 2 (speed): the one-third goal is NOT reached; no link is slower.**
Candidate 2 (exact reuse) was measured first and is dead: on every s18
drag frame pair the fraction of bit-identical vertices is 0.000 (def,
muse_hash, fat), so no corner's input bits survive a frame
(`k1362t2_measure.ts`). Candidate 1 (pool) is built: the gf worker is a
coordinator that splits raw chain vertices by chain, corners by junction
range and chunk bins by chunk range across up to 8 slice workers
(`hardwareConcurrency`-sized), merged in order. In the browser the
coordinator's serial floor (lean export, the prefix's pins/arms/final
vertices, chunk merge + assembly; ~1.8 ms per-slice prefix clone before
trimming, `k1362t2_prof.ts`) eats the corner saving on corner-bound
scenes. Desktop, perf lock, `k1362t2_run.ps1` driving c1's
`k1362c1_bench.mjs` (before = master `2b964a6c` preview, after = this
build; machine shared with other agents, load high throughout; p50,
workMs = worker wall per rebuild as gf_app reports it):

| link | before work p50/p95 | shipped after p50/p95 | pool ungated p50 | main ms/frame before -> after |
|---|---|---|---|---|
| def | 11.8 / 22.2 | 12.1 / 19.0 | 11.9 | 1.57 -> 1.56 |
| muse_hash | 6.7 / 12.0 | 7.5 / — | 8.9 | 1.45 -> 1.51 |
| fat | 14.5 / 20.3 | 14.4 / — | 11.2 | 1.70 -> 1.50 |

Shipped, the pool engages only on builds with >= 28000 scene points
(none of the three links today), so the shipped after column is the
single build within noise of before and main stays <= 1.6 ms/frame
(under the 3 ms bound). Ungated, the pool measured fat 14.5 -> 11.2 ms
(-23%, the vertex/bin-bound win), def neutral, muse_hash slower
(6.7 -> 8.9) — hence the gate rather than a regression. Frame interval
and physics sim/wall were unchanged within noise in every run
(physics-bound drags, ~0.62 sim/wall on def/fat).

**Done 3: holds.** `npm test` green after the final edit: 233 files /
2963 tests passed, 9 skipped; goldens unchanged.

**What is left.** The one-third cut needs the coordinator's serial
prefix partitioned too: pins and arms by chain (arms by junction once
final vertices are broadcast), and the chunk-list merge off the
coordinator (or per-cell merges in slices). With corners at ~1 ms per
slice in Node, the browser floor is export (~1.4) + prefix (~2-3) +
merge/assembly (~1-2); only shrinking that floor moves def/fat toward
a third. Reuse stays dead unless the solve's inputs stop changing
every frame. No unfinished code; nothing left as a patch.
