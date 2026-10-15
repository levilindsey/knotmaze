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
