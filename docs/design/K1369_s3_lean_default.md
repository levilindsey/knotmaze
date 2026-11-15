# K1369 stage 3: lean by default under rp=gf, and the Pixel table

Coordinator brief, 2026-11-14. Stage 2's brief and handoff (the numbers, the runner call):
`K1369_s2_motion_rate.md`.

## Where it stands

- **Levi's targets (2026-11-14):** on the Pixel, 30 moves a second in motion is acceptable and 60 is better; the
  intro's physics matters most.
- **Stage 2** (merged at c23261b9): under rp=gf, main skips `renderer.update()` while builds are in flight and the
  hidden fans are off. Two more cuts are exact but probe-only (`__knotGfOpts.lean`): the gap solve writes only
  `bindingPoint(over)`, and the fill mesh's extrude is skipped. Lean is probe-only because the pluck footprint
  reads `eraseExtentPos` / `overHalfPos`, which only the full solve writes. `depth: 2` keeps two builds in flight
  (default 1).
- **Desktop, phone viewport:** in the drag, depth 2 + lean (gf2l) installs 46.5-48 builds a second, against today's
  35-37 fps, with main at 520-550 ms/s against 930. Its sim/wall is about .015 under today's; the physics' cost per
  substep tracks main plus the gf worker's busy time (inferred contention).
- **The Pixel has not been measured:** the phone was in use both times.

## Goal

rp=gf's motion path is lean by default, and the Pixel table says which depth to ship. The technique is yours.

## Done

1. **Lean is the default under gf,** as a mode flag on the renderer (`ribbon_renderer.ts`,
   `ribbon/strip_pass.ts`), not as instance patches from `gf_app.ts`.
   - The full solve runs whenever a pluck is live (or its footprint is still decaying), so the pluck looks the same
     as it does in today's look. Show it: a desktop screenshot pair, mid-pluck, today's look against gf.
   - `k1369s2_lean.mjs` stays exact (rest and mid-drag), and the probe knob still turns lean off for A/Bs.
2. **The Pixel table,** ABBA with equal rests, at the build that holds step 1. Use stage 2's runner call
   (`k1369s2_phone.ps1`, cells today / gf2l / gfl in the intro with the default appearance, the intro with
   `am=instant`, and the drag), with builds per second, sim/wall, touch-to-install latency, thermal status and every
   core's clock per cell.
3. **The depth, decided by that table:**
   - Set `DEPTH` to 2 if, at a matched thermal state, gf2l's builds per second beat today's fps in every cell and
     its sim/wall is within the noise of today's in the intros (the drag may trail by the noise).
   - Otherwise keep 1. Either way, record why.
   - If the Pixel's drag sim/wall falls further at depth 2 than the desktop's, say so; that is the snapshot
     channel's case (the next stage, not this one).
4. **Nothing else moves:**
   - with rp=gf off, today's look is unchanged (the goldens, `byte_identity` included);
   - `npm test` green;
   - the K1362 tables digest (`.claude/probes/K1362/k1362t1_digest.ts`) bit-identical;
   - the pass program unchanged;
   - rp=gf stays off by default;
   - today's desktop main ms per frame no worse.

## Rules

- **Order:** do steps 1 and 4 on the desktop first. Commit, then do the phone.
- **The phone:** the same rules as stage 2's brief.
  - Never wake, unlock or rotate it; never press Home or send it any input; never restart Chrome on it. Open and
    close only your own tabs, through DevTools.
  - Wait at most 30 minutes per attempt.
  - Hold the phone lock for each phone part.
  - No device serials, IP addresses or Tailscale names anywhere.
  - If the phone never comes free, the stage ends with steps 1 and 4 done and the table not run. Say so, and leave
    `DEPTH` at 1.
- **Shell:** PowerShell. Read code through the shell (Select-String, then 40-80-line ranges of Get-Content), with
  outputs under about 40 lines. Use the Read tool only right before an Edit, and to view images.
  - Never pipe a long-running command into `Select-Object -First`.
  - Junction `node_modules` from the main checkout; never `npm ci` or `npm install`.
  - Delete junctions with `(Get-Item <path>).Delete()` before removing a directory.
- **Your files:**
  - `src/render/ribbon_renderer.ts` and `src/render/ribbon/strip_pass.ts` (the lean mode flag only);
  - `src/render/gpu_field/gf_app.ts`;
  - their tests;
  - `.claude/probes/K1369/k1369s3_*` (copy stage 2's tools as needed).
  - Untracked inputs are in the main checkout's `.claude/probes/`: copy them, never write there.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for outputs.
  - Never push, never edit `LEDGER.md`, never touch the main checkout.
  - Never kill a process you did not start. No helpers.
- **Perf lock:** `$env:TEMP\claude-perf.lock` for desktop timings, one line (owner, start time, what), held only
  while timing. If another owner holds it, wait inside one blocking command.
- **Stop:** when Done holds or 2 h after your start, whichever comes first.
  - Run `Get-Date` at the start (put the time in your first commit message) and at each milestone.
  - Leave the last 20 minutes for the write-up: commit WIP, append a handoff to this brief with your start and stop
    times, release the locks, report.
  - Neither a compaction nor context size is a stop.

## Report

Under 30 lines:
- what changed;
- the pluck screenshot pair's path;
- the Pixel table, with the clocks;
- the depth decision and why;
- the checks;
- your verdict on Levi's targets (30 and 60 a second in motion, the intro first) and what the next stage needs;
- your last SHA.

End with `Ledger items` and K1369's handle fields.
