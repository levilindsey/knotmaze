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
