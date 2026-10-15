# K299: the choice pulses and the trail misdrawn at one junction

Levi, 2026-10-14 about 19:15, verbatim:

> Also, There's some bugs here.
>
> - The top-right segment from this current intersection renders the
>   pulse in a weird double/backward way with an artifact in the middle
>   of the segment.
> - The bottom-left segment has no pulse
> - And after travelling down the bottom-left segment, there's a
>   travelled-path artifact in the top-right segment.

His link: `http://192.168.0.3:5173/?qoietk.KSIeBoGlf4-` (the coordinator's
dev server, which serves the main checkout's working tree). Locally:
`http://localhost:<port>/?qoietk.KSIeBoGlf4-`.

## What is known

- **His console:**
  - `KnotMaze P4 v0.4.0 0e865bf 2026-10-15 01:43 | dpr 1.5 | gpu WebKit WebGL`
    (desktop Chrome at dpr 1.5);
  - `KnotMaze: seed 1613290376, 299 nodes, 427 edges, 23 strands.`
- **The code he ran.** The stamp is the dev server's start (18:43). The
  server serves the working tree, so his page most likely ran `f294247`:
  K111 stage 4 merged at 19:11 and touched the paint shaders (High
  contrast's looks, the rim width `hgw`). That is not established. If
  the cause isn't obvious, build the commit before K111 stage 4 (`a47642d^`)
  with `scripts/preview.ps1 -Ref` and compare.
- **Also in his console:**
  - PixiJS warnings at load ("Attribute aGap / aGapId / aUV is not
    present in the shader"). Probably unrelated; note whether master
    prints them too.
  - `CROSSING INSPECT {"crossing":34,"slot":34,"selfCross":false,"over":{"chain":2,"ctrl":19.843},"under":{"chain":16,"ctrl":7.425},...}`
    from `ribbon_renderer.ts:3252`. Find what triggers that log; it may
    mark a spot he clicked.
- **His two screenshots,** which exist only in the chat, described:
  1. **One move in.** The start marker (a play triangle) is up-left. The
     yellow trail runs from it right and then down into the head (the
     target glyph), which sits on the first junction. Of the choices
     from the head:
     - the up-right run shows a whitish streak with a brighter patch
       partway along;
     - the down-left run shows no pulse.
  2. **After moving down the down-left run.** The trail runs start →
     junction → down-left to the new head. A short yellow trail mark
     sits on the up-right run, a little way up and right of the
     junction.
- **A hypothesis, not a finding.** The two arms might be one thread
  passing through the junction, with an arc-length origin (a closed
  chain's seam, or a wrapped run range) on or near them. One run's range
  would then wrap, and its pulse and trail would be painted onto the
  other arm. Other candidates:
  - a reversed direction for one arm;
  - a K111 stage 4 regression;
  - something else.

  Claude-config's `rules/lessons.md` records a related class: "modulo
  (ring) index math on an OPEN polyline maps the terminal point onto the
  start", which knotmaze paid for four times.

## Stage 1: diagnose and fix (this stage)

1. **Reproduce his state on master:**
   - desktop Chrome at `--force-device-scale-factor=1.5`;
   - his link;
   - the first move, from the start to that junction;
   - then the move down the down-left run (the K120 key moves or a click;
     check the head lands where his shot 2 shows).

   Shoot each state with the pointer parked off the canvas, then once
   hovering each choice, since a hovered choice changes its look. Shoot
   the pulses at several phases, or pin their clock if a hook exists.
2. **Decode the link** (`src/ui/param_codec.ts`) and list its non-default
   settings. Say which of them the bug needs: try it on the bare
   `?qoietk` seed too.
3. **Attribute before fixing.** For each choice run at that junction,
   record what the paint receives:
   - run id and chain;
   - whether the chain is closed or open, and where its arc-length
     origin sits;
   - the run's arc range and its direction toward the junction;
   - the pulse's origin and phase.

   After the move, do the same for the trail spans (`trail_paint.ts`).
   Name the exact primitive under each bad pixel: which run's paint
   lands there, and why.
4. **Fix at the root,** in the shader and its CPU mirror
   (`paint_math.ts`) together. If the cause is a range or index-wrap
   class, fix that class everywhere it reaches: pulses, the trail, the
   fog, the hover rim and the route bands.
5. **A regression test** that builds the failing case: a synthetic one,
   plus this link's run if that is cheap. Keep the parity tests green.
6. **A census.** Count the choice runs and trail spans that meet the
   failing condition:
   - before and after the fix;
   - over the default design and this link's settings;
   - on about 50 seeds each.
7. **Same-state before/after sheets:**
   - his link at the junction (pulses at three or four phases) and after
     the move;
   - two or three other census hits.

   Put them in `.claude/probes/K299/sheet/`.

### Verification

- `npm test` green, with the count, and `npm run build` green. The
  knot-mode golden (`test/physics/byte_identity.test.ts`) and the dailies
  stay as they are.
- The census numbers before and after: zero hits after.
- **Name the change.** If the fix changes the paint of any run that drew
  correctly before, say which and why.
- In your report, keep what you observed apart from what you inferred.

### Setup

- **Your branch starts from master.** Run `git log -1 --oneline` first;
  if this file is missing, `git merge --ff-only origin/master`.
- **`node_modules`:** link it to the main checkout's with a junction
  (`New-Item -ItemType Junction node_modules -Target
  C:\Users\lsl\Repositories\knotmaze\node_modules`). Before removing
  anything that contains it, run `(Get-Item node_modules).Delete()`: a
  recursive delete or `git worktree remove --force` follows the junction
  and empties the main checkout's packages.
- **Servers:** ports 5790-5799. Give your vite server a private cacheDir
  (see `probes.md`). Leave port 5173 alone: it is Levi's.
- **Chrome:** any instance you launch gets its own `--user-data-dir` in
  your probes folder. Delete it when you are done (K161).
- **Files:** probes, logs and notes go in `.claude/probes/K299/`
  (untracked; the coordinator copies them at the merge).
- **Running alongside you:**
  - the K7 physics-worker design stage, which takes frame timings under
    the perf lock until about 21:05;
  - a phone pass. The phone is off-limits.
  - The hover glow stage (K298) waits for this fix, because it touches
    the same shader code.

### Process

- **One stage.**
  - Run `Get-Date` at the start and at each milestone.
  - Commit WIP on your branch at every milestone, and never push.
  - Don't edit `LEDGER.md`.
- **The stop.** Stop when the fix is done and verified, or at your cap,
  whichever comes first. The cap is two hours on Opus.
  - Neither a compaction nor context size is a stop. After a compaction,
    re-read this brief and `git log`, then go on.
  - At the stop, commit WIP, append a "Stage 1 handoff" section to this
    file, commit it and report.
- **The final report covers:**
  - the root cause, observed apart from inferred;
  - what changed and where;
  - the census and the test count;
  - the sheets;
  - a `Ledger items` list;
  - the handle fields: branch, last commit, evidence and next.
