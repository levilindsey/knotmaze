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

## Handoff (c1, 2026-11-13: start 02:06:38, stop 02:47; branch `worktree-agent-a161f441f698339ef`)

All four Done items hold.

**What was built:**
- **A lean export.** `buildFieldSceneLean` is in `scene_export.ts`, and `gatherSceneInputLean` is in
  `scene_export_hook.ts`. Both are additive; the full export is untouched. The lean pair skips everything only the
  diagnostics read: the particle mean, end offsets, z, the depth tent and field-at-arc. It reads none of zPos,
  physics positions or junction particles, and takes only the length of each chain's particle list. The tables
  read only the look, the chains (id, pts, closed), the crossings and the junctions.
- **A second module worker.** `gf_worker.ts` runs `gf_build.ts`'s `gfBuild` (lean scene, then `buildTables`, then
  the tables' buffers transferred back). The physics worker is untouched. It can't build the tables, because the
  chain samples are made on main from the interpolated mirror.
- **`gf_app.ts`:**
  - It keeps one build in flight and uploads the tables on the frame after they arrive (about a one-frame latency).
  - The first build after a renderer change runs in-thread, so no frame is stale or blank.
  - It falls back to the same `gfBuild` in-thread when the worker is not ready or fails, or when
    `__knotGfOpts.worker === false`.
  - `__knotGfOpts.verify` (or `__knotGf.verify`) checks every build against the old full path, bit for bit.
    `__knotGf.rebuild()` forces a build.
  - `GfTables` and the pass are unchanged.

**Output unchanged:**
- The digest (`k1362t1_digest.ts`, 12 scenes plus every s18 drag frame) gives
  `all ae1d2392...85a27`, 5445 lines, the same as master's.
- `test/render/gf_build.test.ts` checks that lean tables equal the full tables bit for bit, that the lean input
  reads nothing it skips, and that the tables survive a transfer.
- In the app (`VERIFY=1`), worker builds were checked against the in-thread full path on def, muse_hash and fat: at
  rest with a forced rebuild, then through the drag. Over 958 builds there were 0 mismatches.

**Desktop** (perf lock; `k1362c1_run.ps1`, `k1362c1_table.mjs`). Master 13c997b5 is "before", d3712a82 is "after",
p50 of the drag:

| link | main ms/frame (rp=gf) | per rebuild: main + worker | export | iv rp=gf | iv today's look | phys ms/substep, sim/wall (rp=gf) |
|---|---|---|---|---|---|---|
| def | 31.4 → 1.64 | 33.6 → 2.2 + 11.2 | 18.7 → 1.3 | 76.5 → 43.8 | 37.2 / 36.6 | 13.28 → 13.27, 0.62 → 0.62 |
| muse_hash | 18.4 → 1.48 | 18.0 → 1.5 + 7.0 | 11.3 → 1.3 | 61.3 → 44.3 | 50.1 / 46.5 | 22.5 → 22.8, 0.37 → 0.36 |
| fat | 29.3 → 1.43 | 30.4 → 1.8 + 14.9 | 18.7 → 1.8 | 70.2 → 38.9 | 40.9 / 40.4 | 13.1 → 13.1, 0.63 → 0.63 |

- With the worker off (`GFOPTS={"worker":false}`), the lean build in-thread costs 15.0 / 7.7 / 14.4 ms of main per
  frame. The lean export alone saves about 90% of the export.
- The physics worker runs flat out in every drag, at 982-992 ms per wall second. A drag is physics-bound on the
  desktop.
- Ms per worker frame falls from 71.8 to 41.1 on def only because main's frames got shorter: a frame grants more sim
  the longer it is.

**Pixel** (`k1362c1_phone.ps1` runs `k1362c1_drag.mjs`: one K156 pass, both builds, s4's 3 s CDP touch drag on
`?b.J`, ABAB x2, GPU at 1286 MHz, thermal status 0 throughout). It is not the K156 kit's replay, which has no drag.

| | today's look p50 | rp=gf p50 / p90 | gf main ms/frame | worker build (export + tables) | phys sim/wall rp=gf (today's look) |
|---|---|---|---|---|---|
| master | 50.0 / 50.0 | 50.3, 66.6 / 66.8 | 31.9, 33.0 | (on main: 16.5-17.2 + 12.2-12.7) | 0.30, 0.29 (0.71, 0.62) |
| branch | 50.0 / 50.0 | 33.3, 33.3 / 33.4 | 0.97, 1.25 | 22.7 (2.7 + 20.0), latency 34 | 0.32, 0.32 (0.67, 0.63) |

**Residuals:**
- **The Pixel's physics.** It runs at half its sim rate under rp=gf on both builds (sim/wall 0.29-0.32 against
  0.62-0.71 for today's look), with the GPU at 1286 MHz and no thermal throttling. On the branch the physics worker
  steps about 790 ms per wall second against about 930 under today's look, so each sim second costs it about 1.8
  times the CPU. These are estimates from the frame sums. Not diagnosed.
  The CPU clocks weren't recorded; that is the next cheap check (`/sys/devices/system/cpu/cpu*/cpufreq/scaling_cur_freq`
  beside the GPU clock). On the desktop the same comparison moves 0.67 to 0.62.
- **The tables in the worker.** On the Pixel they take 20 ms against 12.5 on main, likely a slower core; that is
  inferred, not measured. On the desktop they take 9.8 on def. At a 16 ms frame the tables would lag two frames.
  Corners only where their arms moved, done as an exact reuse, is the remaining CPU lever.
- **Display latency.** The drawn tables trail the physics by one build: p50 18-19 ms on the desktop, 34 on the
  Pixel.
- **The lean export's coverage.** If `buildTables` ever reads a scene field the lean export skips (z, the particle
  mean, field-at-arc), only the test fixture and the in-app verify would catch it, not the digest. The digest reads
  the full export.

**Next stage needs:**
- **On the Pixel the gate is now the GPU pass plus the physics,** not main's CPU. The branch's 33.3 p50 is two vsyncs
  at a 20-25 ms pass.
- **The physics slowdown under rp=gf** needs a cause before its fix.
- **The tables' corners** are what shrinks the worker build.

**Rerun:**
- `pwsh -NoProfile -File .claude/probes/K1362/k1362c1_run.ps1 -OutDir <dir> -Before <master preview> -After <branch
  preview> [-Steps verify,before,after,thread]`. The previews listen on `localhost`, not 127.0.0.1.
- Then `node .claude/probes/K1362/k1362c1_table.mjs <dir>`.
- The phone: `pwsh -NoProfile -File .claude/probes/K1362/k1362c1_phone.ps1 -Base <sha> -Head <sha>`.
