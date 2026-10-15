# K344: a cusp in the pluck vibration on a self-crossing loop

One build stage, Opus, two-hour cap. Ports 5890-5899; probes in
`.claude/probes/K344/`.

## Levi's report

2026-10-14 about 23:04, verbatim: "There's a sharp discontinuous cusp
with the vibration effect on this loop along the bottom of the loop. Can
we fix this general problem?"

- His link (he was on the LAN dev server; serve it on your own port):
  `?qoietk.KIiHgRRXwRlRt8fGrST4sf`
- His crossing inspect, verbatim:

  ```
  CROSSING INSPECT {"crossing":104,"slot":104,"selfCross":true,"over":{"chain":21,"ctrl":102},"under":{"chain":21,"ctrl":110.205},"sign":1,"overCenter":58.891,"underCenter":62.764,"split":[null,1.857],"uCaps":[1.857,0.584],"oCaps":[1.347,1.857],"cut":[0.336,0.323],"win":[0.866,0.584],"reach":[1.19,1.26],"polyPts":34,"strength":1,"mode":"perp"}
  ```

- His screenshot (not available to you; reproduce it): a twisted kink
  loop, chain 21 crossing itself, during a pluck's vibration blur, with a
  sharp, discontinuous cusp in the blur along the bottom of the loop.

He asked for the general problem to be fixed, not this loop alone.

## What is there

- The pluck is render-only. `src/render/pluck_overlay.ts` draws the
  time-exposure strip and the base collapse; `src/render/pluck_model.ts`
  is the pure plucked-string math (modes, envelope, lobes), tested in
  `test/render/pluck_model.test.ts`.
- K279's knobs: `prp` (the look: wave, glint, ring, off), `psz`, `pgh`
  and `pw`. Read their meanings and ranges in `src/ui/url_state.ts`.
- Lore: `.claude/rules/render-pluck.md` (it attaches when you read the
  pluck files) and `.claude/rules/probes-pluck.md` (open it before you
  probe).
- The loop: crossing 104 is chain 21 passing over itself at ctrl 102 and
  under at ctrl 110.205, so the loop is about 8 ctrl long.

## Hypotheses (unverified: test them, don't assume them)

1. The strip's normal displacement is larger than the local radius of
   curvature at the loop's tight bottom, so the offset curve folds past
   the evolute and draws a cusp.
2. The vibrating span or its mode shape has a slope break where it
   starts or ends at the self-crossing (ctrl 102 or 110.205).
3. The base collapse, or the strip's join, where a chain passes over
   itself.
4. The overlay drawn across the crossing's gap cut, so the under pass's
   cut shows as a hard edge.

## The work

1. **Reproduce** at 1400x900 in real time (`scripts/diag_screenshot.mjs`
   or a probe built the same way; never Chrome's
   `--virtual-time-budget`). Make a before sheet: the loop mid-vibration
   over several frames, with a close-up of the cusp.
2. **Find the cause by measurement.** Dump the strip's geometry at the
   cusp: offsets, normals, the curvature radius, and the span's ends. In
   your notes and report, keep what you observed apart from what you
   inferred.
3. **Fix the general case:** any loop, any crossing, every `prp` look,
   and the knobs at both ends of their ranges.
4. **A unit test** that fails before the fix and passes after.
5. **An after sheet:** Levi's link, `?7`, a fat-thread maze, and the
   knob range ends.
6. **`npm test` and `npm run build`.** The pluck is render-only, so the
   golden, the K87 pin and the golden dailies must not move.
7. **Lore** in `render-pluck.md`: the cause, the rule the fix keeps, and
   how to check it.

## Setup

- **Your branch starts from master.** Run `git log -1 --oneline` first;
  if this file is missing, run `git merge --ff-only origin/master`.
- **`node_modules`:** link it to the main checkout's with a junction
  (`New-Item -ItemType Junction node_modules -Target
  C:\Users\lsl\Repositories\knotmaze\node_modules`). Before removing
  anything that contains it, run `(Get-Item node_modules).Delete()`: a
  recursive delete or `git worktree remove --force` follows the junction
  and empties the main checkout's packages.
- **Servers:** ports 5890-5899. Give your vite server a private cacheDir
  (see `probes.md`). Leave port 5173 alone: it is Levi's.
- **Chrome:** any instance you launch gets its own `--user-data-dir` in
  your probes folder. Delete it when you are done (K161).
- **Files:** probes, logs and notes go in `.claude/probes/K344/`
  (untracked; the coordinator copies them at the merge).
- **Timing:** if you time frames, hold the perf lock (`probes.md`).
- **Neighbors:** other agents are working on `src/main.ts` and the
  physics (K7 stage 3) and on the paint shaders and `main.ts` (K76 stage
  2c). Keep to the pluck files; if the fix needs `main.ts`, keep that
  edit small.
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
- **The final report covers:**
  - the cause, observed apart from inferred;
  - what changed and where, and the test that pins it;
  - the before and after sheets;
  - the test count and the build;
  - the lore you added;
  - a `Ledger items` list;
  - the handle fields: branch, last commit, evidence and next.

## Stage 1 handoff

2026-10-15, agent `a67c6d4d11a9ea6b4` of claude session d8031183,
23:30 to about 00:40. Items 1-7 are done. Branch
`worktree-agent-a67c6d4d11a9ea6b4`: the fix is `f4c05d5`, the lore and
this handoff the commit after it. Evidence: `.claude/probes/K344/`
(untracked; `probes-pluck.md` lists the tools).

- **Cause, observed.** The plucked lobe on chain 21 runs from crossing
  104's over pass (arc 58.77) to its under pass (62.62). On one frozen
  page, zeroing the under-node clip removes a long straight cut through
  the blur along the loop's lower left and bottom, ending in a sharp
  corner, and changes nothing else (`out/tog/strip_z0.png`: base |
  noclip | nocap | noclip+nocap). The under node's clip line is the over
  pass's position and tangent, written into every station of the lobe,
  and the shader hides blur within a casing of it out to a reach of 1.5.
  On a self-crossing that over pass is the loop's own, where the lobe
  starts, so the clip cut the loop's own blur.
- **Inferred.** That cut is the cusp Levi saw: his screenshot was not
  available, and it is the only straight, sharp-cornered edge in the
  loop's blur.
- **Ruled out by measurement.** Hypothesis 1, a fold past the evolute:
  no station of the lobe is tight (a 0.05 radius was a three-point
  curvature artifact). Hypotheses 2 and 3, the span's ends and the base
  collapse: the clip toggle alone removes the whole cut. Hypothesis 4
  was close: the overlay's own under-node clip, not the crossing's gap
  cut.
- **Fix (`f4c05d5`).** An under node's clip acts on its own under pass
  only. On a self-crossing its weight falls from 1 to 0 by G1's
  same-chain split, max(0.12, half the arc to the over pass less 0.08),
  through a smoothstep over min(0.3, half the split). Foreign crossings
  keep weight 1, which is the old clip exactly. `pluck_model.ts`
  (`selfPassAhead`, `underClipWeight`, `clipKeep`), `pluck_overlay.ts`
  (per-station weights in layout(), aClipF as a vec4, the shader's
  weight), `ribbon_renderer.ts` (pluckNodes tags a self-crossing's under
  node with `selfArc`). The pluck-blur program compiles cold once per
  player (K307); no new program.
- **Test.** `test/render/pluck_model.test.ts`, "under-node clip on a
  self-crossing (K344)", five tests. With the weight forced to 1 two
  fail, "never hides the loop's own over pass" with 45266 hidden samples
  (`fail_before.log`).
- **Before.** `out/repro1/` (zoom 0 and 3, t 0.03-0.4, with strip dumps),
  `out/annot/` (stations, strip edges, reach and clip lines drawn over a
  shot), `out/tog/strip_z0.png`.
- **After.** `out/after/*_strip.png`, each [forced | fixed | diff] of one
  frozen page, and `results_pair_*.json`. Forced (every weight 1) equals
  the pre-fix build to the pixel: `node xcmp.mjs out/before out/after`,
  0 px on 15 shots. Changed pixels: Levi's loop 6.0-6.2k at the default zoom,
  65-67k at zoom step 2, 16-20k at step 1 over every knob end and look
  (`psz` 3, `pgh` 0 and 1, `pw` 0 and 15, ride, pinch, wave, glint, ring,
  off; `psz` 0 turns plucks off); three more kink loops of his design
  5.7-6.2k; `?7` two of ten loops (ch 57's small kink loop 1955, the same
  straight cut, filled; 414); crossings with other chains, big loops,
  knot mode and the fat-thread loops tried 0 px.
- **Suite and build.** `npm test`: 77 files passed and 1 skipped, 1035
  tests passed and 1 skipped; the golden, the K87 pin and the golden
  dailies are green. `npm run build` passes (the usual chunk-size
  warning).
- **Lore.** `render-pluck.md` "Pluck cusp (K344)"; a K344 entry in
  `probes-pluck.md`; a pointer in `render-gaps.md`'s G1 entry; the index
  lines in `render.md`, `probes.md` and `docs/lore_index.md`.
- **Residuals, unchanged by the fix.** (a) A dark three-armed star in a
  kink loop's eye (the uncovered middle; `nocap` shrinks it). (b)
  Staircase concentric bands across the wide outer blur when zoomed in.
  (c) At a crossing with another chain, the clip's straight line against
  a curving over thread leaves a thin straight-edged sliver of blur on
  the over thread when zoomed in (`out/nc/z2_nc_crop2.png`,
  `z2_nc_diff2.png`: noclip | fixed, and their diff). A fix would follow
  the over thread's curve (an arc instead of a line) or draw the over
  passes above the blur.
- **Next.** The coordinator reviews and merges; Levi looks at his link on
  the merged build.
