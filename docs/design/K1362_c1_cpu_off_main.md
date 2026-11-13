# K1362 CPU lane, stage 1: rp=gf's per-frame CPU work off main and cut

Ledger: K1362. One Claude Opus agent in its own worktree, on its own branch from master. Cap 2 h. Read first: the
stage 4 handoff at the end of `docs/design/K1362_s4_shader.md` (its frame interval paragraph); the Muse tables
lane's handoff at the end of `docs/design/K1362_t1_muse_tables.md` (what made `buildTables` faster, and the floors
it measured); the stage 2 handoff's "(b) Table build" bullet in `docs/design/K1362_s2_glsl.md`; and
`.claude/rules/physics-worker.md` (K7).

## Where it stands

Each frame of a drag under rp=gf, main runs the export (`gatherSceneInput` and `buildFieldScene` in
`src/render/field/`, called from `gf_app.ts`'s `rebuild`) and `buildTables` (`src/render/gpu_field/tables.ts`).
- **On the Pixel** (stage 4, before the Muse speedup) that is about 22 ms of export plus 28 ms of tables. The drag
  frame reads 83.5 ms p50 under rp=gf against 50.1 for today's look. Stage 4 timed it with a DevTools touch drag,
  not the K156 kit's replay. Today's look holding flat at 50.1 (three vsyncs) may come from that method.
- **On the desktop:** the export is 9-11.5 ms. Since the Muse lane, `buildTables` is 9.0 ms on def, bit-identical
  (corners 6.0, a fixed 24-node integral per corner; the rest 2.9).
- **The gate** is 3 ms of main CPU on the desktop and a 16 ms p50 frame on the Pixel.

## Goal

rp=gf's main-thread CPU per frame at or under 3 ms on the desktop def drag, with the tables the pass receives
unchanged. The total work must shrink too, not just move: on the Pixel the physics worker has its own frame to keep,
so report the worker's step time and the sim/wall rate before and after. You own the technique. Candidates:
- **An export that reads the sample buffers directly** instead of gathering a scene object that the tables walk
  again (stage 1's "vtx to about 0");
- **The build in the physics worker,** from its own state, the tables transferred with the snapshot. phw=0 must
  still build in-thread to the same result;
- **The corners only where their arms moved,** or a cheaper exact corner. Muse measured the 1e-9 tolerance route
  failing; an exact reuse is not a tolerance.

## Done

1. **Output unchanged:** `.claude/probes/K1362/k1362t1_digest.ts` (the Muse lane's) shows the tables bit-identical to
   master's on the 12 scenes and every s18 drag frame. If the build moves, also check that the tables the pass
   receives in the app equal an in-thread build of the same state, on def at rest and mid-drag.
2. **Speed, desktop,** under the perf lock, before and after on the def, muse_hash and fat drags:
   - main CPU per frame for rp=gf (export, tables, pack, upload);
   - the worker's step time and sim/wall;
   - the frame interval for rp=gf and for today's look.
3. **Speed, Pixel:** the same through the K156 kit's drag replay, if the phone lock is free. Another agent uses the
   phone tonight; take the lock for one short run and release it.
4. `npm test` green, the goldens unchanged, `host_seam.test.ts` and the physics host tests included.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print a
  whole file. Keep each tool output under about 40 lines. Use the Read tool only right before an Edit and to view
  images. Junction `node_modules` from the main checkout; never `npm ci` or `npm install`. Before deleting any
  directory, delete each junction inside it with `(Get-Item <path>).Delete()`.
- **Your files:**
  - `tables.ts` and `gf_app.ts` in `src/render/gpu_field/`, plus new files there;
  - the physics worker files (`src/physics/physics_worker*.ts`, `worker_host.ts`, `physics_host.ts`, `snapshot.ts`)
    for the build's move;
  - additive exports in `src/render/field/scene_export*.ts`. That code is shared with form B and the census, so
    don't change what it returns;
  - tests;
  - `.claude/probes/K1362/k1362c1_*`.
- Another Claude agent works on `gf_glsl.ts`, `gf_pass.ts` and `gf_pack.ts`; stay out of those, and keep `GfTables`'
  fields and layout as they are.
- **The phone:**
  - Never wake it, unlock it, rotate it, or send it input, and never restart Chrome on it.
  - Run `scripts/phone_pass.ps1 -Phase check -AllowChrome` first.
  - Hold the phone lock (`.claude/probes/agents/phone_lock_take.ps1` / `phone_lock_release.ps1`) only for your run.
  - Keep device serials, IP addresses and Tailscale names out of every tracked file, commit and report.
- **Untracked inputs** (scenes, drags) are in the main checkout's `.claude/probes/`. Copy what you need; never write
  there.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for outputs. Never
  push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not start.
- **Perf lock** for desktop timings: `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only
  to time, and delete it after. If another owner holds it, wait inside one blocking command.
- **Stop** when Done holds or 2 h after your start, whichever comes first. Run `Get-Date` at the start, write the time
  into your first commit message, and run it at each milestone; before stopping for the cap, check that 2 h have
  really passed. Leave the last 20 minutes for the write-up. Then commit WIP, append a handoff to this brief with your
  start and stop times, and report. Neither a compaction nor context size is a stop.

## Report

Under 30 lines:
- the before/after table (main CPU, worker, frame interval; desktop and Pixel);
- the digest result;
- what moved and what shrank;
- your verdict and what the next stage needs;
- your last SHA.

End with `Ledger items` and K1362's handle fields.
