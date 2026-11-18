# Handoff 26A — K1456: rp=gf's cold first load (Muse batch 26 Run A)

Levi: rp=gf's cold first load no longer freezes the page. A fresh profile that used to sit
on a 105 s main-thread block (gf's programs compiling one after another, nothing drawing)
now shows the maze the whole time: today's renderer draws while gf's programs compile in
the background, and gf takes over only when the program the first frame needs can draw.
The main thread never blocked longer than 0.7 s in the cold runs. What is not yet proven
is listed under "Left for the next run" — the warm-restart time, the second guard link and
the two slider guards still need a quiet machine.

## What shipped

- `src/render/gpu_field/gf_pass.ts`: the app's `GfPass` (not the probe, split or bench
  forms, which are unchanged) no longer compiles in its constructor. Its programs are
  *specs* (sources) until issued. `pollPrograms()` runs once a frame: it issues *one*
  program at a time without reading any status (`startProgram`), then finishes a program
  only when `COMPLETION_STATUS_KHR` (KHR_parallel_shader_compile) reports it complete
  (`finishProgram` reads the statuses and uniform locations). Issue order: the routed
  set's **full** program first (it draws every pixel exactly on its own), then the tier
  the frame routes to, then its other tier, then the other sets (look, reveal,
  look+reveal, prewarmed one set at a time). While a newly routed set still compiles,
  `draw()` falls back to the best ready set, so the maze never leaves the screen. A failed
  link lands in `compileError()`. `GfComposite`'s two programs compile the same way.
  On a context without the extension the completion poll is `LINK_STATUS` itself, which
  can still wait (documented in the file; the measured desktop has the extension).
- `src/render/gpu_field/gf_compile_worker.ts` (new) + `GfPass.compileSources()` +
  `gf_app`: a compile that *completes* on the app context (poll-resolved) stays in the
  in-memory program cache only (K385's lesson), so the next visit would recompile. Once
  gf's own queue has drained, a small worker links every gf program once, blocking, on
  its own OffscreenCanvas context (never asking for the extension), which is the flow
  whose binaries reach the disk cache. Starting it only after the queue drains matters:
  with the worker compiling concurrently, a gf status read behind its compile waited
  23 s (measured). The worker is best-effort (`__knotGf.stats.compileWorker` /
  `compileWarmed` report its state).
- `src/render/gpu_field/gf_app.ts`: `attach()` (which hides today's ribbons) no longer
  runs at renderer change. Today's renderer keeps drawing — ribbons, fans, its own
  update (`busy()` never gates before the switch) — until the frame gf can draw:
  the routed set's full program and the needed composite program are ready
  (`stats.switchedMs`, `compileIssued`, `compileReady`, `compileFirstMs`). The hide
  itself lands two presented composites later (`hidePending` in `after()`): the first
  composite presentation lags a frame or two, and hiding at once presented background
  for the first hold frames. A compile failure falls back to today's renderer for good.
- Shader text is unchanged: `gf_home_glsl.test.ts`'s digest pin moved to the distinct,
  sorted sources (same four strings as master's; verified against master's six, below).
- Tests: `test/render/gf_compile.test.ts` (new, 4 tests): nothing is issued at
  construction; only the full program is issued first, the routed tier only after it;
  a failed link surfaces; `compileSources` lists 12 programs look-first. Updated
  `test/render/gf_home_glsl.test.ts` to flush the async pass (the sources it pins are
  the same set).

Commits: afcedaee (the compile rework) and 58349500 (the deferred hide), on master.

## Numbers

Machine note: this session's desktop was heavily contended (other agents' GPU work,
a full disk at one point), so absolute GPU compile times ran 2-5x the K1450 session's.
The block times, not the compile times, are the run's claim.

Cold, fresh profiles, the committed build's predecessors (same code except where noted):

- `?3&xp=off&am=instant&rp=gf`: first gf composite 87.6 s, 69.7 s and 85.3 s across three
  fresh profiles (K1450's baseline on the earlier build: 114.8 s; the master baseline
  re-run this session never finished inside 300 s under the contention). Longest
  main-thread longtask 671 ms / 680 ms; total link-wait 236-372 ms. (One run with the
  compile worker started up front showed a 23.5 s task — that is why the worker now
  starts only after gf's queue drains; the runs after that change are the 85.3 s one
  and the timeline below.)
- `?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1` through its reveal (timeline probe): switch at
  91 s, no longtask over 280 ms in 227 s; the reveal was still running when the probe
  stopped. An earlier contended run of the same link showed 20 s tasks in *today's*
  programs at a scene transition — not reproduced in the clean run; watch for it.
- Today's renderer is what draws during all of that (the switch is the first gf frame).

Source identity: master's app-pass sources sorted-digest matches the new distinct set
(master `9e1374...` over six sources; the new pin `632795...` over the four distinct
strings — one vertex, three fragments).

Tests: `npm test` green (252 files / 3132 tests) before the worker and sequencing
changes; after them the touched files' tests pass and a full `npx vitest run` rerun is
green (one full-suite run under a concurrent Chrome probe flaked 7 files; the clean
rerun passed all — re-run `npm test` once on a quiet tree to be sure).

Guards, committed build 58349500, port 5497, one profile kept across the runs
(`$env:TEMP\k1456-prof-guards`):

- hold `?3&xp=off&am=instant&rp=gf` (60 frames, 250 ms, wait 5000): **PASS**, all 60
  frames show the maze; first composite 1326 ms on that (by then warm) profile. The
  first attempt, before the deferred-hide fix, failed frames 0-1 (background) — the
  fix is what 58349500 adds.
- hold `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`: **FAIL** on this machine.
  Frame f10 plainly shows the maze (dim red explore threads — the intended unvisited
  look), but its Canny counts (1600-2900) sit under the probe's 4000 minimum, and at
  frame ~42 the browser lost the graphics context ("Graphics paused") for the rest of
  the run. Not chased: the run stopped at the time line. Next run: re-run this one
  first on a quiet machine and look at f10 vs what master scores on the same link
  before touching code — the dim-explore counts may be the probe's threshold, not a
  missing maze.

## What did not get verified (next run, in order)

1. **Warm restart (Done 3)**: without the worker, a warm profile's first composite was
   38-41 s (the recompiles). With the worker, the proof needs: load link A fresh, keep
   the page open until `__knotGf.stats.compileWorker` is "done" (the queue alone drains
   at roughly a program per 20-30 s on this machine, then the worker's 12), close, and
   reload the same profile: first composite must be under 2 s. `warmwait.mjs` does the
   waiting and prints the stats. The 1326 ms hold above hints the cache does land, but
   that profile's history is mixed — do not cite it as the proof.
2. **0 px (Done 3)**: `cap26.mjs` on master gf and new gf (`?3&xp=off&am=instant&rp=gf&phw=0&fw=0`,
   same state), then `pxdiff.mjs` — the pixels were never compared this run.
3. **dragcheck** for `gf` and `gfh` (Done 5): never ran (its fresh pages each wait out
   a compile on a cold profile; keep one browser/profile so the worker's cache lands).
4. Crops (today | master gf | new gf) with `crops26.mjs` — captures were never taken.
5. `npm test` once more, quiet, and the deploy run after the push checked green.

Probes are under `.claude/probes/K1456/` (cold26, timeline26, warmwait, cap26, pxdiff,
crops26; outputs in `out/26A/`). Perf-lock etiquette and the load-bearing floor are in
the batch brief as before. K1456 stays open in the Ledger; K1452 stays as the residual
it describes until the warm proof lands.
