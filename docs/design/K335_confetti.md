# K335-K337: the rain's top edge, side cannons and streamers, and shine

One stage, Opus, with a two-hour cap. It builds three of Levi's confetti
asks together, because they all touch the same two files. K318's win
effects build on it next: Party's finish is "a confetti cannon and
streamers" (`docs/design/K318_win_effects.md`).

## Levi's words (2026-10-14, verbatim)

K335, about 22:22:

> Also, with the confetti from the top, I like the abrupt wave of confetti at the start, but then we also have an abrupt cut-off stopping the confetti, and we see an abrupt line at the top of the wave of confetti that I don't like. Can we more of a fade-out of confetti particles along the top?

K336, about 22:24:

> Let's also add some blasts of confetti and streamers from specific points just outside the left and rigth sides of the screen, angled in and up, and then apply gravity to make these fall in an arc

K337, about 22:32:

> Also, with the confetti, I'd like to explore adding a shimmer/shine reflection effect to them, so some flash as they rotate the right way. I bet we make make this even resemble vaguely realistic directional light physics without too much effort or perf cost?

## What is there today

- `src/render/confetti_model.ts` is the pure part: counts
  (`confettiPlan`), launches (`spawnRain`, `spawnSpray`) and motion
  (`stepRain`, `stepSpray`) in Float32Array pools, plus `pieceLook`.
  Pieces spin in the screen's plane and flutter by a cos flip that
  narrows each piece. Today's shading, `shadeHex(color, 0.55 + 0.45 * w)`
  with `w` = |cos| of the flip, is a rough diffuse term.
- `src/render/confetti.ts` is the view: two ParticleContainers, the rain
  in screen space and the spray in world space (it copies the world
  root's transform). Rotation and tint are already per-frame (dynamic)
  properties.
- The lore is `.claude/rules/render-confetti.md`. It attaches by itself
  when you read these files, and covers the counts, reduced motion, the
  trigger (`throwConfetti()` at the end of `showFabricWin` in
  `src/main.ts`), the idle return, the costs and the probes.
- The tests are `test/render/confetti_model.test.ts`. The probes are in
  `.claude/probes/K140/` (untracked; read them there or copy what you
  need): `k140_page.mjs`, `k140_ab.mjs` with `run_ab.ps1`, and
  `bench_sim.mjs`. The page hooks are `__knotConfetti()` and
  `__knotConfettiBurst()`.

## The stage

1. **The rain's top edge (K335).** Keep the sudden start: the first
   wave's density stays. Replace the hard top line and the abrupt stop
   with a ragged fade:
   - the releases taper over the window's tail instead of cutting off;
   - the release heights above the top edge spread out, so the wave's
     top thins out rather than ending in a straight line.
   Show the line is gone: a row-density profile of a mid-fall frame,
   master against the branch, has no step at the wave's top.
2. **Side cannons (K336).** At the finish, fire blasts from points just
   off the left and right edges, angled in and up. The pieces arc under
   gravity, with some drag, and fall out of the bottom of the screen.
   - Use screen space, like the rain, so the blasts look the same at any
     zoom and on any screen. Scale the counts with the screen as the rain
     does (`rainScreenScale`).
   - Pick the launch points, angles, speeds, spread and timing (one
     blast per side, or a short volley) from a frame sheet. The arcs'
     tops should land well inside the screen.
   - Build a cannon as a reusable emitter: a launch point, a direction,
     a spread, a count, a speed and a mix of pieces. Don't hard-wire it
     to the screen's edges, because K318's themes will aim cannons at
     other places.
3. **Streamers (K336).** Add a new kind of piece: a long, thin strip
   that curls. Its head flies the ballistic path with drag, its body
   trails behind it, and it twists and flutters along its length.
   - Draw streamers with a program the game already has if you can (a
     pixi `MeshRope` or another mesh on the default shader). A new
     custom program compiles cold at the finish and freezes the win
     (K307; `.claude/rules/render-shaders.md`). If one is unavoidable,
     say so in the handoff so K307's warm-up can include it.
   - Fire streamers from the cannons. Should the finish's spray throw a
     few too? Decide from the sheet.
4. **Shine (K337).** Light every piece (the rain, the spray, the cannons
   and each streamer segment) with one directional light:
   - Give each piece a real 3D orientation. Its spin in the screen's
     plane and its flip about its long axis define a unit normal `n`. A
     piece showing its back flips `n`, so both faces light.
   - Put the light at the upper left, toward the viewer; the eye looks
     straight down the screen's normal, `V` = (0, 0, 1).
   - Shade = ambient + diffuse·max(0, n·L), which replaces today's
     `0.55 + 0.45·w`, plus a specular flash (n·H)^p with H =
     normalize(L + V), mixed toward white.
   - Two materials: paper (low `p`, a soft sheen) and foil (high `p`, a
     bright, short flash). Each piece draws its material from a foil
     share.
   - Compute it on the CPU, per piece and per frame, into the tint the
     view already sets. This needs no new shader and adds only a few
     multiplies per piece. Measure that with `bench_sim.mjs`.
5. **Settings.** Add rows to the confetti's panel folder:
   - the cannons, on/off and amount;
   - the streamers' share;
   - the shine's strength and the foil share.
   Show a dependent row only while its parent is on, for example the
   cannon rows only while the cannons are on (the panel's hidden-row
   pattern, if one exists; K318 and K323 will reuse yours).
   Append the codec entries after the last index (134 today, if nothing
   else has landed), and add them to `DAILY_EXEMPT_KEYS` as viewer
   preferences like `cf` and `cfa`.
6. **Reduced motion.** No rain, no cannons and no streamers. The spray
   keeps at most its 16 pieces at amount 1, with no spin or flutter, as
   today. The shine keeps its diffuse term and drops the specular
   flashes, since a flash is what reduced motion avoids.
7. **Bounded lives.** Every new piece dies within a fixed time, and
   `sceneAnimating()` goes false once the last one does, as today.

## Verification

- `npm test` and `npm run build` green, with the test count.
  - New model tests: the taper (the release density decays, with no
    step); the cannons fire inward and upward from off-screen; the arcs
    peak inside the screen and the pieces leave by the bottom; every
    life is bounded; the shine's maths (the specular peak at n = H, the
    back face flipped, foil sharper than paper); reduced motion; the
    counts at amounts 0, 1 and 3.
  - `param_codec.test.ts`'s pin grows by the appended keys only, and
    the golden dailies and the knot-mode golden don't move.
- Sheets in `.claude/probes/K335/sheet/`, at 1400x900 and 411x753:
  - the burst at about 0.1, 0.3, 0.6, 1.0, 1.5 and 2.5 s, master and
    branch;
  - the rain's top edge, with the density profile;
  - a close-up strip of shining pieces over several frames, paper and
    foil;
  - the streamers' curl.
- A desktop frame A/B (`k140_ab.mjs`, under the perf lock; read
  `probes.md`) at amounts 1 and 3, and the pure sim's cost per frame. The
  phone's frame rate goes to K156's next pass.
- In your report, keep what you observed apart from what you inferred.

## Setup

- **Your branch starts from master.** Run `git log -1 --oneline` first;
  if this file is missing, run `git merge --ff-only origin/master`.
- **`node_modules`:** link it to the main checkout's with a junction
  (`New-Item -ItemType Junction node_modules -Target
  C:\Users\lsl\Repositories\knotmaze\node_modules`). Before removing
  anything that contains it, run `(Get-Item node_modules).Delete()`: a
  recursive delete or `git worktree remove --force` follows the junction
  and empties the main checkout's packages.
- **Servers:** ports 5860-5869. Give your vite server a private cacheDir
  (see `probes.md`). Leave port 5173 alone: it is Levi's.
- **Chrome:** any instance you launch gets its own `--user-data-dir` in
  your probes folder. Delete it when you are done (K161).
- **Files:** probes, logs and notes go in `.claude/probes/K335/`
  (untracked; the coordinator copies them at the merge).
- **Neighbors:** other agents are working on `src/main.ts` (the arrow
  keys, K329) and the physics (K7). Keep your `main.ts` edits small; the
  trigger is already `throwConfetti()`.
- **The phone is off-limits.**

## Process

- **One stage.**
  - Run `Get-Date` at the start and at each milestone.
  - Commit WIP on your branch at every milestone, and never push.
  - Don't edit `LEDGER.md`.
- **The stop.** Stop when items 1-7 are done and verified, or at your
  cap, whichever comes first. The cap is two hours on Opus.
  - Neither a compaction nor context size is a stop. After a compaction,
    re-read this brief and `git log`, then go on.
  - At the stop, commit WIP, append a "Stage 1 handoff" section to this
    file, commit it and report.
- **Lore** goes to `.claude/rules/render-confetti.md`.
- **The final report covers:**
  - what changed and where;
  - the chosen defaults, with the sheets that chose them;
  - the A/B, the sim's cost and the test count;
  - the lore you added;
  - a `Ledger items` list;
  - the handle fields: branch, last commit, evidence and next.
