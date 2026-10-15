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

## Stage 1 handoff (2026-10-14, 23:28)

**Scope.** At about 23:00 Levi deferred K336 and K337 ("Let's defer the
more-complex celebratory effects to after other tasks"), so this stage
built item 1 (K335) alone, with its tests, sheets and lore. Items 2-6
were not built; item 7 holds for the rain.

**Shipped** on `worktree-agent-a5a499658319bedf9`, from master `7effaae`:
- `70854ee`: `src/render/confetti_model.ts`. The rain releases over
  `RAIN_WINDOW` 2.2 s (was 1.1) at a rate of (m+1)/W·(1 - t/W)^m with
  `RAIN_TAPER` m = 4, high at the start and zero, with zero slope, at
  the end (`rainDelay` inverts its CDF, `rainReleaseDensity` is the
  rate). A piece released d s in starts up to `RAIN_TOP_SPREAD`
  0.12·d/W screen heights above K140's 0.05 h jitter. `RAIN_LIFE_MAX`
  6 -> 6.5 s. Counts, per-piece code and the spray are unchanged.
  `test/render/confetti_model.test.ts` (24 tests): the sampled delays
  follow the CDF, the rate integrates to 1, falls monotonically and
  never steps, spawnRain's releases tail off, the start heights spread
  with the delay, and the idle bound is 7 s.
- `affdefe`: the lore, THE RAIN'S TAPER in
  `.claude/rules/render-confetti.md`.
- `npm test`: 75 files passed, 1 skipped; 1010 tests passed, 1 skipped.
  The golden dailies and the knot golden hold. `npm run build` is green.
  No `main.ts`, panel or codec edits.

**Measured** (probes, results and sheets in `.claude/probes/K335/`):
- Census (pure model): 21% of the pieces leave in the first 0.1 s
  (master 20%), 52% by 0.3 s (43%); on screen against master
  0.89/1.13/1.14/1.06/0.98 at 0.25/0.5/0.75/1/1.5 s. The top edge,
  from the first 2%-of-height row at 5% of the peak row to the first at
  50%, spans 10-12 rows (master 2-6), and its largest single-row rise
  is 8-13% of the peak (master up to 29%).
- Run-out: 5.57-6.78 s after a finish, medians 5.9-6.2 s (master
  5.40-5.93, medians 5.6-5.7; 60 seeds x amounts 1 and 3 x three
  viewports). The oldest piece dies at 5.1 s; the fade starts at 6.0 s.
- Sheets, `sheet/`: `sheet_{desk,phone}_opening.png` (0.1, 0.3, 0.6 and
  1.0 s) and `sheet_{desk,phone}_top_edge.png` (1.5, 2.0, 2.5 and 3.0 s,
  plus the census's density chart). Knot mode, 1400x900 and 411x753,
  master above, branch below; stamps 7effaae and 70854ee; no context
  loss, no page errors. Page run-outs: 1400x900 master 5.75/5.58 s,
  branch 6.47/6.24; 411x753 master 5.67/5.56, branch 5.85/5.92.
- Sim cost (`bench_sim.mjs`, 1400x900, two interleaved runs): amount 1
  master 33.5 us a frame over 343 frames, branch 31.5 us over 368;
  amount 3 master 100 us over 345, branch 92.7 us over 373; p95 54 and
  162-164 us for both; the same total per burst (11.5 and 34.5 ms).
- Not run: the desktop frame A/B. Nothing per frame changed, and K140's
  A/B could not resolve tens of microseconds under the fabric's ~10 ms
  frame noise.

**Deferred: K336 (side cannons and streamers) and K337 (shine)**, until
after the other tasks.
- Their model-only draft is saved as
  `.claude/probes/K335/deferred/k336_k337.patch`. It touches only
  `src/render/confetti_model.ts` and applies cleanly on K335
  (`git apply .claude/probes/K335/deferred/k336_k337.patch`). It holds
  the reusable cannon emitter (`CannonSpec`, `aimCannon`,
  `finishCannons`, `spawnCannon`, `stepCannon`), the streamers
  (`stepStreamers`, `streamerSegLook`), the shine (`pieceShade` with
  paper and foil, `litHex`) and the plan's new settings. The same file
  in full is `deferred/confetti_model.k336_k337_on_k335.ts`. The first
  draft, `deferred/confetti_model.k335_k336_k337.ts`, still has the
  older rain.
- Applied on K335, it typechecks except one unused constant
  (`CANNON_FADE`), and 3 of the 24 confetti tests fail: they compare
  `confettiPlan` with `toEqual` against the old shape, and the draft's
  plan has more fields. Today's `confetti.ts` compiles against it.
- Still to do: the draft's own tests, the view (`confetti.ts`: the
  cannons' pool, streamers as a `MeshRope` or another default-shader
  mesh, the shine into the tint), the panel rows and codec entries,
  reduced motion, the sheets and the frame A/B. The planned params are
  `confettiCannons`/`cfc`, `cannonAmount`/`cfn`, `streamerShare`/`cfs`,
  `confettiShine`/`cfh` and `foilShare`/`cff`, appended after the
  codec's last index (135-139 if nothing lands first) and added to
  `DAILY_EXEMPT_KEYS`.
- The draft gives the finish's spray no streamers. That is a draft
  choice, not yet checked on a sheet.

**Next:** merge K335 (`70854ee`, `affdefe`, and this handoff). K336 and
K337 restart from this brief, items 2-7, and the saved patch.
