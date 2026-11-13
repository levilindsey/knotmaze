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
