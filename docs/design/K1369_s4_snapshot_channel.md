# K1369 stage 4: depth by gesture, and the physics-to-gf snapshot channel

Coordinator brief, 2026-11-14. Stage 3's brief and handoff (the Pixel table, the runner `k1369s3_phone.ps1`):
`K1369_s3_lean_default.md`; stage 2's: `K1369_s2_motion_rate.md`.

## Where it stands

- **Levi's targets (2026-11-14):** on the Pixel, 30 moves a second in motion is acceptable and 60 is better; the
  intro's physics matters most.
- **Stage 3** (merged at bbdb28d2): lean is rp=gf's default, and `DEPTH` stays 1. On the Pixel (def, ABBA, thermal 0-1):

  | Cell | today: fps, sim/wall | depth 2 (gf2l): builds/s, sim/wall | depth 1 (gfl): builds/s, sim/wall |
  |---|---|---|---|
  | intro, default appearance | 30.2-32.9, .675-.710 | 50.9-54.3, .694-.767 | not measured |
  | intro, am=instant | 17.8-18.0, .794-.840 | 52.4-53.4, .773-.795 | not measured |
  | drag | 17.6-17.7, .671-.707 | 40.3-43.6, .488-.505 | 19.4-20.6, .737-.807 |

  - At depth 2 in the drag, the physics worker waits for a core 239-335 ms per second (depth 1: 39-72), and a
    substep takes 15.5 ms instead of 10. Main, the physics worker and the gf worker are competing for cores
    (inferred, not isolated).

## Goal

Under rp=gf on the Pixel, the knot moves faster than today's look in every cell, with sim/wall at least today's:
- first, by choosing the depth by gesture;
- then, toward 30 a second in the drag, by taking main out of the path from the physics to the gf worker.

The technique is yours.

## Done

1. **Depth by gesture.** Depth 2 while no pointer is down, depth 1 during a drag (or a better rule the table
   supports).
   - The Pixel table gets depth-1 intro cells too, so the choice rests on measurements.
2. **The snapshot channel,** or the measured reason it does not pay.
   - The physics worker hands its state straight to the gf worker (a MessageChannel), and the gf worker samples the
     splines and builds. Main only installs and uploads.
   - Main still needs its samples for what it draws over gf: the markers, the yarn, fog and the pluck. Get them to
     main without a second sampling on main (for example, returned with the build).
   - The tables digest stays bit-identical: the gf worker's samples must equal main's `chainSamples` bit for bit.
     Prove it with a check like `k1369s2_lean.mjs`.
   - The physics worker's stepping is unchanged: `byte_identity` and the golden pass, and `phw=0` (the physics on
     main) still works with rp=gf.
3. **A Pixel table,** ABBA with equal rests, using the `k1369s3_phone.ps1` runner extended as needed.
   - Cells: today, the shipped setting, and any variant you need, in the intro with the default appearance, the
     intro with `am=instant`, and the drag.
   - Columns: builds installed per second, sim/wall, touch-to-install latency, the physics worker's wait for a core,
     the thermal status, and every core's clock per cell.
4. **Nothing else moves:**
   - with rp=gf off, today's look is unchanged (the goldens, `byte_identity` included);
   - `npm test` green;
   - the K1362 tables digest bit-identical;
   - the pass program unchanged;
   - rp=gf stays off by default;
   - today's desktop main ms per frame no worse.

## Rules

- **Order:**
  - Do the desktop part of step 1 and commit.
  - Then the desktop part of step 2 and commit.
  - Then one phone run covering both. A phone run in between is fine if the phone is free.
- **The phone:** the same rules as stage 3's brief.
  - Never wake, unlock or rotate it; never press Home or send it any input; never restart Chrome on it. Open and
    close only your own tabs, through DevTools.
  - Wait at most 30 minutes per attempt.
  - Hold the phone lock for each phone part.
  - No device serials, IP addresses or Tailscale names anywhere.
  - If the phone never comes free, ship what the desktop proves, with the depth rule off by default, and say so.
- **Shell:** PowerShell. Read code through the shell (Select-String, then 40-80-line ranges of Get-Content), with
  outputs under about 40 lines. Use the Read tool only right before an Edit, and to view images.
  - Never pipe a long-running command into `Select-Object -First`.
  - Junction `node_modules` from the main checkout; never `npm ci` or `npm install`.
  - Delete junctions with `(Get-Item <path>).Delete()` before removing a directory.
- **Your files:**
  - `src/render/gpu_field/gf_app.ts`, `gf_worker.ts`, `gf_build.ts`, `gf_slice_worker.ts`;
  - the snapshot channel in `src/physics/worker_host.ts`, `physics_worker.ts`, `physics_worker_core.ts`;
  - the gf branches of `src/app/frame_loop.ts`;
  - the spline sampling, if the gf worker needs to import it (move it, do not copy it);
  - their tests;
  - `.claude/probes/K1369/k1369s4_*`.
  - Untracked inputs are in the main checkout's `.claude/probes/`: copy them, never write there.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for outputs.
  - Never push, never edit `LEDGER.md`, never touch the main checkout.
  - Never kill a process you did not start. No helpers.
- **Perf lock:** `$env:TEMP\claude-perf.lock` for desktop timings, one line (owner, start time, what), held only
  while timing. If another owner holds it, wait inside one blocking command.
- **Stop:** when Done holds or 2 h after your start, whichever comes first.
  - Run `Get-Date` at the start (put the time in your first commit message) and at each milestone.
  - A lever that does not pay is a result: record it and move to the next.
  - Leave the last 20 minutes for the write-up: commit WIP, append a handoff to this brief with your start and stop
    times, release the locks, report.
  - Neither a compaction nor context size is a stop.

## Report

Under 30 lines:
- what changed;
- the Pixel table, with the clocks;
- the depth rule and why;
- the checks;
- your verdict on Levi's targets (30 and 60 a second in motion, the intro first) and what the next stage needs;
- your last SHA.

End with `Ledger items` and K1369's handle fields.

## Stage 4 handoff (K1369 s4 agent, start 2026-11-14 20:58:33, stop 22:09:27)

Done 1 and 2 hold, Done 3 ran (four Pixel tables), Done 4 holds. Depth by gesture shipped; the snapshot channel is
built, exact and opt-in (`__knotGfOpts.chan`, off by default; rp=gf itself stays off by default).

**What changed:**
- c27f5dc9, depth by gesture: `gfDepth(o, grabbed)` is `GF_DEPTH_IDLE` 2 at rest and through the intros,
  `GF_DEPTH_DRAG` 1 while a thread is grabbed; `__knotGfOpts.depth` overrides it. cc6522b9 added `stats.postDepth`
  and the runner (`k1369s4_phone.ps1`, `k1369s4_motion.mjs`).
- effc15f0, the snapshot channel:
  - `WorkerHost.gfPort()` opens a MessageChannel: one end to the physics worker (`{type: "gfPort"}`), the other,
    with the scene graph, to the gf worker. phw=0 has no port: `stats.chan` reads "unavailable" and gf posts builds
    as before.
  - The physics worker posts `{type: "snap", gen, buf}` from a pool of its own (`GF_POOL` 2): the current state on
    connect, then the newest state whenever the gf worker gives a buffer back. A dry pool waits; it never allocates.
    Main's own snapshots are untouched (`test/physics/gf_port.test.ts`).
  - The gf worker keeps a MirrorSystem, samples the splines itself (the tuck moved from StripPass into
    `sampling.ts`, `tuckTrim` / `tuckClamp`: same code and scratch, StripPass calls it), fills the lean diagData
    (`src/render/field/lean_input.ts`, `gatherLeanSkeleton`), builds with `assembleLeanInput`, and posts the tables
    with the samples.
  - Main installs through the same `install()`, writes the samples into `chainSamples`, runs fabricFollow and acks
    (`{done, depth}`). While the channel is open main skips `renderer.update()`. It closes for a live pluck,
    flow > 0 and splineBend.

**The Pixel tables** (`k1369s4_phone.ps1`, the s3 runner under this stage's lock owner; link b.FMKB4DIQ; ABBA, 2
reps; before each cell the same rest, to thermal status 0 and skin at most 37.5 C, up to 120 s). JSON is untracked:
`.claude/probes/K1369/out/motion_s4{a,b,c,d}.json`; `k1369s4_md.mjs` prints these rows, `k1369s2_table.mjs` the
per-run lines. Settings: today = today's look; gfd1 / gfd2 = rp=gf at a fixed depth; gfg = rp=gf as shipped (depth
by gesture); gfc = gfg plus the channel; gfc1 / gfc2 = the channel at a fixed depth 1 / 2. Rate is today's app fps or
gf's installs per second; each cell gives rep 0 / rep 1. "phys wait" is the physics worker's wait for a core (ms per
wall s). Clocks are p50 MHz: cpu0-1 (max 2649), cpu2-5 (3379), cpu6 (4109), GPU (1286).

s4a, 21:04-21:28 at cc6522b9 (src c27f5dc9), all at thermal 0:

| cell | rate | sim/wall | ms/substep | phys wait ms/s | touch p50/p90 ms | thermal (skin C) | cpu0-1 | cpu2-5 | cpu6 | GPU |
|---|---|---|---|---|---|---|---|---|---|---|
| today intro-d | 33.8 / 31.3 | .787 / .670 | 10.3 / 11.9 | 180 / 185 | - | 0 (30.6) / 0 (37.2) | 533-614 / 614 | 3148 / 2899 | 4109 / 4013 | 1286 |
| gfd1 intro-d | 20.5 / 20.4 | .887 / .774 | 8.9 / 10.4 | 48 / 46 | - | 0 (31.5) / 0 (38.0) | 1632 / 1440 | 2649 / 2649-2899 | 4109 / 4013 | 691 / 460 |
| gfd2 intro-d | 52.3 / 50.6 | .727 / .661 | 10.7 / 11.9 | 82 / 52 | - | 0 (32.6) / 0 (37.5) | 883 | 3379 | 4109 | 883 / 1094 |
| gfg intro-d | 51.4 / 50.0 | .787 / .762 | 10.0 / 10.4 | 88 / 74 | - | 0 (31.2) / 0 (37.2) | 691 / 960 | 3379 | 4109 | 883 / 940 |
| today intro-i | 17.9 / 17.8 | .835 / .767 | 9.7 / 10.5 | 67 / 79 | - | 0 (33.4) / 0 (37.0) | 614-691 / 614 | 2035 / 1804-2035 | 4109 | 1286 |
| gfd1 intro-i | 20.3 / 20.5 | .855 / .880 | 9.4 / 9.0 | 31 / 39 | - | 0 (34.8) / 0 (36.9) | 1440 | 2035-2169 / 2169 | 4109 | 1190 / 614 |
| gfd2 intro-i | 50.9 / 53.4 | .755 / .694 | 10.6 / 11.8 | 51 / 46 | - | 0 (35.4) / 0 (38.0) | 1036 / 614 | 3379 | 4109 | 1017 / 883 |
| gfg intro-i | 52.7 / 53.0 | .759 / .764 | 10.5 / 10.7 | 61 / 40 | - | 0 (34.3) / 0 (36.9) | 960-1036 / 883 | 3379 | 4109 | 883 / 825 |
| today drag | 17.5 / 17.6 | .700 | 11.1 | 154 / 159 | 63/80 / 62/79 | 0 (36.0) / 0 (36.7) | 533 | 921-1920 / 394 | 4109 | 1286 |
| gfd1 drag | 20.7 / 21.7 | .723 / .828 | 10.8 / 9.5 | 64 / 44 | 78/97 / 63/98 | 0 (37.7) / 0 (36.7) | 1248 / 1920 | 2035-2169 / 2169-2304 | 4109 | 460 |
| gfd2 drag | 50.4 / 40.9 | .645 / .451 | 12.1 / 17.1 | 122 / 338 | 43/60 / 49/76 | 0 (36.9) / 0 (37.7) | 787 | 3379 / 3148 | 4109 / 4013 | 1094 / 883 |
| gfg drag | 20.2 / 20.9 | .795 / .740 | 9.7 / 10.5 | 39 / 49 | 77/97 / 68/97 | 0 (36.5) / 0 (37.5) | 1036 / 1152-1248 | 1804 / 1920 | 4109 / 4013 | 460 |

s4b, 21:31-21:42 at effc15f0. Rep 1 ran warm: the 120 s rests did not bring the phone back to thermal 0, so compare
within a rep:

| cell | rate | sim/wall | ms/substep | phys wait ms/s | touch p50/p90 ms | thermal (skin C) | cpu0-1 | cpu2-5 | cpu6 | GPU |
|---|---|---|---|---|---|---|---|---|---|---|
| today intro-d | 33.7 / 22.2 | .746 / .460 | 10.7 / 17.9 | 180 / 45 | - | 0 (30.7) / 1 (39.1) | 533 / 2150 | 3148 / 1804 | 4109 / 1843 | 1286 |
| gfc intro-d | 44.7 / 25.4 | .818 / .391 | 9.7 / 20.7 | 50 / 64 | - | 0 (31.6) / 1 (39.1) | 1152-1248 / 1536 | 3379 / 1920 | 4109 / 1843 | 825 |
| gfg intro-d | 50.4 / 31.2 | .810 / .441 | 9.9 / 18.4 | 92 / 104 | - | 0 (31.0) / 1 (39.2) | 883 / 1632 | 3379 / 1804 | 4109 / 1843 | 940 / 883 |
| today intro-i | 17.8 / 17.6 | .854 / .483 | 9.5 / 16.7 | 74 / 37 | - | 0 (32.3) / 1 (39.0) | 614 / 2227 | 2304-2649 / 614-768 | 4109 / 1843 | 1286 |
| gfc intro-i | 46.4 / 31.8 | .779 / .489 | 10.5 / 16.5 | 48 / 27 | - | 0 (34.1) / 1 (38.9) | 1248 / 2496 | 3379 / 2304 | 4109 / 1843 | 825 / 940 |
| gfg intro-i | 49.9 / 36.1 | .775 / .439 | 10.1 / 18.4 | 44 / 94 | - | 0 (33.5) / 1 (38.9) | 691 / 1344-1440 | 3379 / 2169 | 4109 / 1843 | 825 |
| today drag | 17.5 / 16.4 | .704 / .329 | 10.9 / 23.6 | 157 / 255 | 62/79 / 89/89 | 0 (34.7) / 1 (38.4) | 614 / 2073 | 394-1036 / 394 | 4109 / 1843 | 1286 / 1190 |
| gfc drag | 27.0 / 18.8 | .746 / .502 | 10.2 / 15.2 | 50 / 35 | 71/88 / 89/122 | 0 (38.9) / 1 (39.3) | 1248 / 960 | 2169 / 2035 | 3340 / 2150 | 825 / 1286 |
| gfg drag | 19.0 / 17.7 | .746 / .392 | 10.4 / 19.6 | 44 / 144 | 78/110 / 81/99 | 0 (37.5) / 1 (38.5) | 1632 / 787-1152 | 2035 / 1920 | 4013 / 1843 | 460 / 748 |

s4c, 21:50-21:54 at effc15f0, intros only, all at thermal 0:

| cell | rate | sim/wall | ms/substep | phys wait ms/s | touch p50/p90 ms | thermal (skin C) | cpu0-1 | cpu2-5 | cpu6 | GPU |
|---|---|---|---|---|---|---|---|---|---|---|
| today intro-d | 32.8 / 34.0 | .739 / .745 | 10.9 / 10.8 | 174 / 105 | - | 0 (33.2) / 0 (36.2) | 533 | 3148 / 3379 | 4109 | 1286 |
| gfc intro-d | 43.5 / 46.9 | .768 / .723 | 10.3 / 10.8 | 44 / 45 | - | 0 (33.9) / 0 (35.7) | 787 / 883-960 | 3379 | 4109 | 883 / 1017 |
| gfc1 intro-d | 27.9 / 27.1 | .877 / .830 | 9.3 | 47 / 24 | - | 0 (34.6) / 0 (35.2) | 1152 | 2899 / 2649-2899 | 4109 | 691 / 460 |
| today intro-i | 17.6 / 17.9 | .907 / .766 | 8.8 / 10.6 | 64 / 59 | - | 0 (31.5) / 0 (38.0) | 691 / 533 | 2035 | 4109 / 4013 | 1286 |
| gfc intro-i | 44.5 / 47.1 | .882 / .728 | 9.1 / 11.0 | 48 / 30 | - | 0 (31.9) / 0 (37.6) | 960 / 1036 | 3379 | 4109 | 883 |
| gfc1 intro-i | 27.0 / 27.3 | .874 / .821 | 8.9 / 9.7 | 26 / 23 | - | 0 (32.5) / 0 (36.7) | 1248 / 883-960 | 2649-2899 / 2899 | 4109 | 614 / 825 |

s4d, 21:55-22:04 at effc15f0, drag only:

| cell | rate | sim/wall | ms/substep | phys wait ms/s | touch p50/p90 ms | thermal (skin C) | cpu0-1 | cpu2-5 | cpu6 | GPU |
|---|---|---|---|---|---|---|---|---|---|---|
| today drag | 17.6 / 16.2 | .784 / .352 | 9.8 / 21.9 | 139 / 241 | 62/79 / 88/89 | 0 (31.6) / 1 (38.5) | 394 / 2073 | 691-1036 / 394 | 4109 / 1843 | 1286 / 1190 |
| gfc drag | 27.9 / 22.8 | .838 / .514 | 9.2 / 15.1 | 22 / 54 | 54/74 / 71/116 | 0 (34.6) / 1 (39.1) | 691-787 / 1536 | 2649 / 2169 | 4109 / 2150 | 825 / 748 |
| gfc2 drag | 48.3 / 20.6 | .674 / .440 | 11.4 / 17.4 | 24 / 86 | 70/88 / 173/189 | 0 (37.4) / 1 (39.5) | 787 / 1344 | 3379 / 768 | 4109 / 1843 | 940 / 1017 |

Bars (means over reps; PASS = rate above today's and sim/wall at least today's):
- s4a: gfg passes intro-d (51/s, sw .775 vs .729) and the drag (20.6/s vs 17.6, sw .768 vs .700); intro-i is below on
  sim/wall (.762 vs .801) at 53/s. gfd1 passes intro-i and the drag but not intro-d's rate (20.5 vs 32.6).
- s4b: gfg and gfc pass intro-d and the drag (gfc 22.9/s, sw .624 vs .516); both are below on intro-i's sim/wall
  (.607 / .634 vs .668).
- s4c: gfc passes intro-d (45.2/s, sw .746 vs .742) and is below on intro-i (45.8/s, sw .805 vs .837); gfc1 passes
  intro-i (27.1/s, sw .847) and misses intro-d's rate (27.5 vs 33.4, sw .853 vs .742).
- s4d: gfc passes the drag (25.4/s vs 16.9, sw .676 vs .568, touch p50 63 vs 75 ms); gfc2 does not (34.5/s, sw
  .557; rep 0 .674 vs .784, touch p90 88-189 ms).

**Why intro-i's sim/wall falls (observed, the per-thread core samples):** sim/wall follows how much of the time the
physics worker runs on cpu6, the prime core. Today's look keeps it there 0.73-1.00 of its samples; depth 1 keeps the
gf worker off cpu6 or nearly (0.00 in every gfd1 and gfc1 run, 0.10-0.11 in s4d's gfc drag) and the physics there
0.67-1.00; at depth 2 the gf worker is busy enough (73-91% of a core at 45-50 builds a second) that the scheduler
puts it on cpu6 0.15-0.50 of the time, and the physics' share drops to 0.33-0.62 (s4b rep 1 gfc intro-i .33 / .489,
s4c rep 1 .33 / .728 against today's .75 / .766; s4d rep 0 gfc2 drag .40 / .674 against gfc's .89 / .838). Inferred: Android's scheduler places threads by utilisation, and nothing in a page can pin one.
In intro-d today's main is busy enough that the physics waits 105-185 ms a second for a core, which is why depth 2
still passes there.

**The depth rule and why:** shipped (c27f5dc9), depth 2 at rest and through the intros, 1 while a thread is grabbed:
depth 2 in a drag starves the physics (s3: sim/wall .49-.51), depth 1 in the intros halves the rate. s4c shows the
intros split: depth 2 is needed to beat today's intro-d rate (33/s), depth 1 to keep intro-i's sim/wall. A rule
that passes every measured cell is depth 2 while the reveal runs and 1 otherwise (each part measured above, the rule
itself not run); the drag stays at depth 1. s4d's gfc2 (the channel at depth 2 in the drag) installs 48 a second
at thermal 0 but drops sim/wall to .674 against today's .784 (the gf worker on cpu6 0.30 of the time, the physics
0.40) and touch p90 to 88 ms (70 p50); depth 1 with the channel gives sim/wall .838.

**Done 4, the checks:**
- `npm test` green at effc15f0 (239 files, 3027 passed, 18 skipped; byte_identity and the goldens in it); tsc
  clean. `test/physics/gf_port.test.ts` (3 tests): the current state on connect, a dry pool waits at GF_POOL, a give
  sends the newest, an unchanged state is kept, a wrong-size buffer is let go, a new port gets a full pool and the
  old one is closed, and stepping and main's snapshots are bit-identical with a port (and equal a reference
  `ParticleSystem.step`).
- The channel is exact (`k1369s4_chan.mjs`, phone viewport, interpolation off): the gf worker's samples and tables
  against main's own path (renderer.update() from its mirror, then a posted build) from the same state, at rest and
  frozen mid-drag: 92 chains (count, closed, totalLength, positions, tangents, controlArcLengths) and 73 table
  fields, 0 differences; the control (rest against drag) differs on 92 of 92 chains. phw=0: `chan` "unavailable",
  gf builds the posted way, no fallback.
- The K1362 tables digest is bit-identical, HEAD against 85b0d1b7 (5446 lines, 0 differ). `gf_glsl`, `gf_pass`,
  `gf_pack`, `tables`, `frame_loop.ts` and `url_state.ts` have no diff: the pass program is unchanged and rp=gf is
  still query-only and off by default. With rp=gf off the only change on today's path is StripPass's tuck, moved to
  `sampling.ts` verbatim (same `samples.totalLength`, scratch and `sampleAt`).
- Desktop main ms per frame, today's look (`k1369s4_desk.mjs`, 411x753 at DPR 2.625, ABBA under the perf lock, 21:44-
  21:47): base 85b0d1b7 intro 29.48 / 29.07, drag 27.27 / 26.60; HEAD intro 29.12 / 27.35, drag 26.54 / 25.09. No
  worse. Same runs, the drag under gf: gfg main 5.56 / 5.92 ms a frame (307 / 325 ms/s), gfc 2.25 / 1.83 (124 / 100),
  both 27 installs a second at 55 fps, sim/wall gfc .589 / .578 against today's .563 / .567.

**Verdict on Levi's targets:**
- The intro first: gfc installs 43-47 a second in both intros at thermal 0, against today's 33 (intro-d) and 18
  (intro-i), with intro-d's sim/wall level and intro-i's .03 below; depth 1 there keeps sim/wall (.847 vs .837) at
  27 a second. So 30 a second in the intro holds with the physics intact only by switching depth with the reveal.
- In motion (the drag): the channel passes, below 30. gfc installs 27.9 / 22.8 a second against today's 17.6 / 16.2
  fps, sim/wall .838 / .514 against .784 / .352, touch p50 54 / 71 ms against 62 / 88 (s4d; s4b 27.0 / 18.8). Depth
  2 reaches 48 a second but takes the physics' prime core (above). 30 in the drag needs a cheaper build, not more
  depth.
- 60 is out of reach with one builder: the gf worker spends 16-19 ms on a build at 3379 MHz (the intros, gfc2's drag)
  and 23-28 ms when the governor holds the mid cores at 2.0-2.9 GHz (the depth-1 drag, 66-76% busy), so 60 needs a
  build under about 12 ms, or the junction scene split across workers (the slice pool still takes only junction-free
  builds; def's 185 arms build whole).

**Residuals (for the ledger):**
- The channel fills diagData for every crossing; main's gap solve gates them by the reveal (GATE_LEAD), so during a
  reveal the channel's tables may differ from main's. The exactness check ran on am=instant only (unverified in an
  intro-d).
- Channel builds use the newest snapshot, not main's interpolated state (interpolation off in the exactness check).
- While the channel is open main skips renderer.update(), so `updateCount` and the reveal FX's lifecycle do not
  advance on main.
- The channel closes for a live pluck, flow > 0 and splineBend (the posted path runs then).
- gfc / gfg at depth 2 are .03-.07 below today's intro-i sim/wall (the prime-core placement above).

**Next (stage 5):** (1) depth by the reveal: 2 while the reveal runs, 1 otherwise (rest, intro-i, the drag), with
the channel on, measured in all three cells; (2) close the channel's reveal gap (gate diagData as the gap solve
does, then the exactness check during an intro-d), so `chan` can become rp=gf's path; (3) 30+ a second in the drag:
profile the gf worker's 23 ms drag build (sampling, gather, `assembleLeanInput`, the table pack) and cut it, or split
the junction scene across two builders, watching cpu6: every busy thread added competes with the physics for it.
Rests: s4b and s4d's 120 s rests left rep 1 at thermal 1; the next table needs longer rests or one rep per sitting.
