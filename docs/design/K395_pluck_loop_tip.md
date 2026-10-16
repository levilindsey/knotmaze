# K395: the pluck blur at a kink loop's tip, on the phone

One build stage, Opus, two-hour cap. Ports 5910-5919; probes in
`.claude/probes/K395/`. The follow-up to K344 (`K344_pluck_cusp.md`).

## Levi's report

2026-10-15 about 07:04, on his phone (Pixel 11, Chrome), on the live site
in Free play. Verbatim: "Pluck cusps still have a bit of weirdness in
loops. It seems like there is a bit of discontinuity with the vibration
effect at times from the middle of the loop tip to an edge, and there is
still a bit of jagged pinching at the tip with the vibration effect--in
this case it seems to not be somewhat heart shaped, with a pointy
protrusion on the inside of the loop and a dimple on the outside"

- "not" is probably "now" (inferred).
- His screenshot is in the main checkout, untracked, so it is not in your
  worktree: `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K395\levi_phone_2026-10-15_0704.png`
  (open it with the Read tool). The plucked kink loop is at the lower
  left, glowing yellow-white, with a heart-shaped outline. The dark mark
  in the loop's eye is probably K354's star, a separate residual. No URL
  shows; a free-play design is a seed at the defaults.
- Two symptoms: (a) a seam in the blur from the middle of the loop's tip
  to an edge, at times; (b) a pinch at the tip, a point on the inside of
  the loop and a dimple on the outside.
- The live build at 07:04 was `12709e5` (deployed about 06:23), which
  holds K344's fix (93d0e4d..810b462). The stamp at the bottom left of
  his screenshot may confirm it.

## What is there

- K344 (`docs/design/K344_pluck_cusp.md`, "Stage 1 handoff"; lore
  `render-pluck.md`, "Pluck cusp (K344)"). The cusp on Levi's earlier link
  was the under-node clip on a self-crossing, cutting the loop's own blur.
  The fix weights that clip by the arc from the over pass: `selfPassAhead`,
  `underClipWeight` and `clipKeep` in `pluck_model.ts`; per-station
  weights and `aClipF` as a vec4 in `pluck_overlay.ts`; `selfArc` on the
  under node in `ribbon_renderer.ts`'s pluckNodes. It measured no fold
  past the evolute, at 1400x900, on that one loop. Its residuals: K354 (a
  dark star in a kink loop's eye), K355 (staircase bands when zoomed in),
  K356 (the clip's straight line at another chain's crossing).
- The pluck files: `src/render/pluck_overlay.ts`, `src/render/pluck_model.ts`
  (tests in `test/render/pluck_model.test.ts`); the knobs `prp`, `psz`,
  `pgh` and `pw` in `src/ui/url_state.ts`. Lore: `render-pluck.md`, and
  `probes-pluck.md` (read it before you probe).
- K344's probe tools are in the main checkout's `.claude/probes/K344/`
  (`lib.mjs`, `sheet.mjs`, `xcmp.mjs`, the strip dumps and the toggles).
  Copy what you use into your own folder; don't edit them in place.

## Hypotheses (unverified: test them, don't assume them)

1. **Scale.** The pluck's size follows the screen, so on the phone's
   zoomed-out view its world amplitude can exceed the radius of curvature
   at a loop's tip. The inner offset then folds past the evolute and the
   strip's concave-side cap pins the fold into a point (the protrusion
   inside), while the outer edge dimples. K344 ruled a fold out at
   1400x900, on one loop.
2. **A corner in the displacement at the tip:** the pluck's initial
   shape (a triangle's apex at the plucked point), or a lobe or mode
   boundary there.
3. **A seam from the tip to the edge:** K344's clip-weight ramp, a lobe
   join, the cap switching on, or a normal that flips across the strip.
4. **The phone's GPU** (PowerVR, mediump; K309): a precision artifact
   the desktop does not show.

## The work

1. **Reproduce.** At the phone's viewport in desktop Chrome (411x753,
   device scale factor 2.625, mobile and touch emulation) and at
   1400x900, in real time (`scripts/diag_screenshot.mjs`, or a probe
   built the same way; never `--virtual-time-budget`). Use kink loops of
   free-play designs at the defaults (several seeds), K357's link
   `?qoietk.KIiHgRRXwRlRt8fGrST4sf` at crossing 104, and `?7`, and pluck
   at the loop's tip, as a tap does. Make a before sheet: the loop
   mid-vibration over several frames, with a close-up of the tip.
2. **Find the cause by measurement.** Dump the strip at the tip at both
   viewports: offsets, normals, the radius of curvature, where the cap
   and the clip act, and the lobe and mode boundaries. In your notes and
   report, keep what you observed apart from what you inferred.
3. **Fix the general case:** any loop, any zoom and screen, every `prp`
   look, and the knobs at both ends of their ranges.
4. **A unit test** that fails before the fix and passes after.
5. **An after sheet** at both viewports: the loops of item 1 and the knob
   range ends. Then, after 08:30 and under the phone lock (Setup), the
   same kind of loop on the phone itself, on the master build and yours.
6. **`npm test` and `npm run build`.** The pluck is render-only, so the
   golden, the K87 pin and the golden dailies must not move.
7. **Lore** in `render-pluck.md`: the cause, the rule the fix keeps, and
   how to check it.

If neither viewport reproduces it, try the phone (after 08:30, under the
lock) before you conclude. If it still does not show, stop and report
what you tried; the coordinator will ask Levi for his link.

## Setup

- **Your branch starts from master.** Run `git log -1 --oneline` first;
  if this file is missing, run `git merge --ff-only origin/master`.
- **`node_modules`:** a junction to the main checkout's (`New-Item
  -ItemType Junction node_modules -Target
  C:\Users\lsl\Repositories\knotmaze\node_modules`). Before removing
  anything that contains it, run `(Get-Item node_modules).Delete()`: a
  recursive delete or `git worktree remove --force` follows the junction
  and empties the main checkout's packages.
- **Servers:** ports 5910-5919, each vite server with a private cacheDir
  (`probes.md`). Leave port 5173 alone: it is Levi's.
- **Chrome:** every instance you launch gets its own `--user-data-dir`
  in your probes folder, and the off-screen window flags. Delete the
  profile when you are done (K161).
- **Files:** probes, logs and notes go in your worktree's
  `.claude/probes/K395/` (untracked; the coordinator copies them at the
  merge).
- **Timing:** if you time frames, hold the perf lock (`probes.md`).
- **The phone.** Levi has it until 08:30: don't touch it before then.
  After that, use `scripts/phone.ps1` under the phone lock. Take it with
  `pwsh C:\Users\lsl\Repositories\knotmaze\.claude\probes\agents\phone_lock_take.ps1
  -Owner "K395 <your agent id>" -What "<what>"` (it waits inside the
  call) and release it with `phone_lock_release.ps1 -Owner "K395 <your
  agent id>"` beside it as soon as your shots are done. Hold it at most
  20 minutes at a time: two other agents need the phone this morning.
  Never print the phone's IP address.
- **Neighbors:** K7 stage 7 (`src/main.ts`'s boot and the physics
  worker) and K290 stage 3b (the explore shaders, `fabric_maze_renderer.ts`,
  `appear_fx.ts`, `ribbon_renderer.ts`'s explore code). Keep to the
  pluck files; an edit to `ribbon_renderer.ts` stays inside pluckNodes.

## Process

- **One stage.**
  - Run `Get-Date` at the start and at each milestone.
  - Commit WIP on your branch at every milestone, and never push.
  - Don't edit `LEDGER.md`.
  - Helpers, if any: `model: sonnet`, with this stop rule and a 1-hour
    cap.
- **The stop.** Stop when items 1-7 are done and verified, or at your
  cap, whichever comes first. The cap is two hours on Opus.
  - Neither a compaction nor context size is a stop. After a compaction,
    re-read this brief and `git log`, then go on.
  - At the stop, commit WIP, append a "Stage 1 handoff" section to this
    file, commit it and report.
- **The final report covers:**
  - the cause of each symptom, observed apart from inferred;
  - what changed and where, and the test that pins it;
  - the before and after sheets, the phone's included;
  - the test count and the build;
  - the lore you added;
  - a `Ledger items` list;
  - the handle fields: branch, last commit, evidence and next.

## Stage 1 handoff

Agent `agent-ac0d0267cdf7467ec` (claude; coordinating session
403049c5-8dc2-4171-8fdf-ec446586ae05), 2026-10-15 07:24 to 08:45
PDT. Branch `worktree-agent-ac0d0267cdf7467ec`: bcbe914 (the fix and
its test), f8ca9e0 (lore) and this handoff. Evidence: the worktree's
`.claude/probes/K395/` (untracked; `probes-pluck.md` lists the scripts).

- **Reproduced** on one frozen page per case, at the phone viewport
  (411x753 @2.625, mobile and touch) and at 1400x900:
  `?7&am=instant&snd=none&fw=0` chain 9's kink loop (key 133) plucked
  at its tip, at zoom steps 0, 3 and 4, and the kink loops 3:95 and
  62:539 of `?qoietk.KIiHgRRXwRlRt8fGrST4sf`. The heart is there: a V
  pointing into the eye at the middle of the tip.
- **Cause, observed:** the concave-side cap. `nocap` removes the V; the
  ghost and W toggles leave it. The cap follows the 5-station
  circumradius (min over +-2), which oscillates with the control-point
  spacing (chain 9: 5.6 at the tip between shoulders of 0.38-0.41).
  CAP_SLOPE turns the plateaus into ramps that meet in a triangle at the
  tip (stations 80-84: 0.083, 0.153, 0.223, 0.173, 0.103), and the
  strip's inner edge turned -112 and -85 degrees at the apex stations.
  The seam, at zoom step 3: a straight radial streak from the V's apex
  through the bands toward the outer edge, plus a crease into the eye.
- **Inferred, not measured:** the apex station's sharp inner edge creases
  the strip's interpolation across its width (the streak), and Levi's
  "dimple on the outside" is where the streak meets the outer bands; no
  separate outer dimple showed. Ruled out: a dependence on screen size
  (tapAmplitude is in world units, so the brief's hypothesis 1 is false).
- **Fix:** `roundCap` (`src/render/pluck_model.ts`), run per lobe run in
  `pluck_overlay.ts` layout() after the slope limit. CAP_ROUND 1.5,
  live as `PluckOverlay.capRound` (0 = the pre-K395 cap). It is a
  min(cap, ceil) of nested raised-cosine bumps, ceil = the run's
  largest swing + h: the cap only goes DOWN (the clearance holds), and
  its second difference stays >= -per^2/(CAP_ROUND h). Apex edge turns
  after: -0.2, -17.1, -11.1 and +9.5 degrees at stations 69, 73, 82 and
  91 (before: -112, -52.6, -85.3, -54.5); the tip's cap 0.223 -> 0.101.
- **Test:** `test/render/pluck_model.test.ts`, "rounded concave cap
  (K395)"; the slope limit alone fails it. `npm test`: 84 files and
  1159 tests pass (1 and 1 skipped). `npm run build` passes. The golden,
  the K87 pin and the golden dailies did not move.
- **Sheets** (`.claude/probes/K395/out/`, `pair_*.png` = cr0 | base, one
  frozen state each): `ab_c9`, `ab_c9z3` (the seam, zoomed), `ab_desk`,
  `ab_knobA` (psz 3, pgh 1, pw 1.5, ride, wave), `ab_knobB` (psz 0.5,
  pgh 0, pw 0, pinch, ring), `ab_levi_3k95`, `ab_levi_62k539`. The V and
  the seam are gone in every case; knobB is mild in both and keeps small
  "ears".
- **Phone: not run.** K7 stage 7 held the phone lock from 08:30; I took
  it at 08:36 and the phone was dozing with the keyguard showing.
  `phone_run.ps1` checks readiness read-only and never wakes the phone,
  so it skipped and released the lock at once. To run it with the phone
  awake and unlocked, serve the pre-K395 build on 5911 and this branch's
  build on 5912 (the `vite preview` lines below), then run, from the
  worktree root, `pwsh -NoProfile -File .claude/probes/K395/phone_run.ps1
  [-WaitMin <n>]`. It shoots `?7` chain 9's loop (zoom step 3, t 0.2, in
  and out) as `out/phone/pre` (base) and `out/phone/k395` (base, cr0);
  `node .claude/probes/K395/pairs.mjs .claude/probes/K395/out/phone/k395`
  writes the pairs. Servers: `npx vite preview --config
  .claude/probes/K395/vite.private-cache.config.ts --outDir
  .claude/probes/K395/builds/21d701e --port 5911 --strictPort --host
  127.0.0.1`, and the same with `--outDir dist --port 5912` after
  `npm run build`.
- **Residuals:** (1) a soft "M" at the tip: where an rMin plateau meets
  a rise, the opening keeps a valley (it only lowers), and the inner
  edge turns +31..+56 degrees at stations 75, 79, 85 and 89, much
  milder than the heart. The root is the circumradius's oscillation; a
  smooth envelope of the radius or a wider rMin window would treat it.
  (2) CAP_ROUND 3 takes those turns to +19..+42 with a flat arch, for
  0.02-0.03 world less inner swing at the tip: a call for Levi (1.5
  kept, as COLLAPSE_ROUND). (3) K354's dark star in the eye changed shape
  (an X became a rounded square) and remains. (4) The brief's link
  builds another design now: its chain 21 has no self-crossing.
- **Next:** the coordinator's review and the merge to master; then
  Levi's look at a kink loop on his phone, and the CAP_ROUND call.
