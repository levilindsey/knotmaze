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
