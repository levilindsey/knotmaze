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

## Stage 1 handoff (2026-10-14 about 20:45, agent a6d727eb)

**Status: fixed and verified, ready to merge.** Branch
`worktree-agent-a6d727eb21ef341d5`: `70c6385` (the fix), `a2c8b5e` (the
tests), `4d2b2d5` (lore), then this handoff. Its files don't overlap
master's since `7a87cae` (checked against `9a5eaa8`). Evidence, probes
and notes: `.claude/probes/K299/` (`notes.md` is the running record).

### Root cause

OBSERVED:
- **The link** (`qoietk.KSIeBoGlf4-`): seed 1613290376, gridSize 18 -> 10,
  markerSize 1.08 -> 1.57, hoverGlow 0.4 -> 1.
- **The junction.** After the first move the head is node_2. e15 (up-right)
  is chain 4 ctrl 0..4; e18 (down-left) is chain 4 ctrl 22..28. Chain 4
  is closed, n 28, total arc 12.509, and its seam (ctrl 0 = 28) sits on
  node_2. e18's pulse is declared from cJunction 28. After the move down
  e18 the trail holds the span (4, 22..28) and a cap at (4, 28).
- **The mechanism.** Master's `kArcOfCtrl` (`paint_glsl.ts`, since G2.0
  `72041df`, 2026-10-12, so not a K111 stage 4 regression) wraps a
  closed chain's ctrl with `i0 = int(fl - n * floor(fl / n))`. GPU float
  division is approximate: a WebGL2 test on this GPU (ANGLE D3D11, RX
  6800 XT) gave floor(float(k n) / float(n)) = k - 1 in 3275 of 16384
  pairs (k -4..59, n 1..256); k = 1 fails at n 3, 6, 7, 12, 13, 14, 15,
  24, 26, 28, 30, ... So ctrl 28 on chain 4 read entry 28, one past the
  chain's arc table: chain 5's header total (28.160), an arc of 3.143
  (ctrl 5.63, just past node_4 on e15). The screen point was predicted
  from that before it was shot.
- **Levi's three symptoms, one cause.** e18's pulse starts at that garbage
  arc instead of the junction, so e18 has none and the pulse runs
  backward over e15, brightest away from the junction ("double/backward
  with an artifact in the middle"). After the move the span 22..28 ends
  below its start, wraps, and paints gold on e15 from the seam up to the
  garbage arc (the "travelled-path artifact"). Same state, moving only
  ctrl 28 to 28 - 1e-4 (the same point) removes all three.
- **The class is wider than seam runs.** Any paint ctrl in [k n, k n + 1),
  k != 0, on a chain whose n fails: the in-flight span while the dot
  crosses a run that wraps the seam (injected, 1334-2110 px), and the
  hover rim on a seam run or hovered past the seam on a wrap run (the
  glow is missing, 1438-1897 px).
- **n % 4 == 2** reads the table's padding 0, which is the right arc at
  ctrl n exactly (seed 4: 0 px). n % 4 == 0 reads the next chain's header.
- **Why the tests missed it:** the float64 CPU mirror divides exactly, so
  the G2 parity census could never see it.
- **His console.** The PixiJS attribute warnings print on master too
  (`out_attr/console.txt`): unrelated. CROSSING INSPECT is the Alt+click
  diagnostic (`main.ts` `requestInspect`); his crossing 34 sits on chain 16
  ctrl 7.4, on the arrival run about 2.6 ctrl before node_2. It marks a
  spot, nothing more.

INFERRED, not tested:
- an n % 4 == 2 chain at a ctrl inside (n, n + 1) reads arc total * t;
- every other GPU has its own list of failing n (the phone is unchecked);
- kGlow's reveal front, a trail-mode fade start and a live hover point in
  [n, n + 1) reach the same functions, so the fix covers them by
  construction.

### What changed

- `src/render/paint_glsl.ts`: `kLapOf(fl, n)` (the floor quotient, then
  corrected by one either way from the integer remainder) and
  `kWrap(x, m)` (a result in [0, m)), with the globals kRingLap and
  kRingArc. kArcOfCtrl, kArcU, kCtrlNear and kSectionAtArc use them.
  PULSE spans the unwrapped run and wraps its distance with kWrap; RIM
  takes `u0 + kWrap(arc - u0, total)`.
- `src/render/paint_math.ts`: the mirror. Its kLapOf and kWrap take an
  optional quotient, so tests can feed GPU-like rounding.
- `src/render/arm_strip.ts` (chainMaterial) and
  `src/render/ribbon_renderer.ts` (cpuChainMaterial): kWrap.
- **The one change on a correct GPU (named, as asked):** a full-lap
  run (a closed strand with one walk vertex, ctrlB = ctrlA + n) had a
  pulse span of x mod total = 0, so its choice pulse never drew, on the
  CPU mirror and every GPU. It now draws over the whole lap. Such runs
  are in 49 of dailies 1..300, 59 of seeds 1..300 at defaults and 44 at
  gridSize 10. Covered by a mirror test; not shot on a page.

### Tests and build

- `test/render/paint_ring_lap.test.ts`, 10 tests: kLapOf under quotients
  one short and one long, kWrap, the old formula reading one past the
  table, seam semantics for SPAN, PULSE (any lap), the full-lap pulse,
  RIM and CAP, and a scan of every `src/render/*.ts` for a rounder of a
  quotient (floor, mod, fract, int, ...). A new site fails until it uses
  kLapOf or kWrap or joins `ROUNDED_QUOTIENTS` with its reason, and a
  listed site that is gone fails too.
- Full suite 947 passed, 1 skipped (948), including the knot-mode golden
  and the golden dailies. `tsc` clean. `npm run build` green (the usual
  chunk-size warning).

### Same-state A/Bs

Desktop RX 6800 XT, dsf 1.5, under the perf lock, plucks 0, no context
loss. Each case against the same points one lap down. Master `7a87cae`
was served by `scripts/preview.ps1 -Ref`.

| case | master | fix |
|---|---|---|
| his link, head on node_2 (d5) | 6967 px | 42 px, all at 1/255 |
| his link, after the move down e18 | 2076 px | 0-2 px |
| span ending at 28.5 / 28.9 | 2110 / 1334 px | 0 |
| span starting at 28.25 | 1969 px | 0 |
| rim, seam run hovered at 25 | 1438 px | 0 |
| rim, wrap run hovered at 28.5 | 1849 px | 0 |
| rim control, hovered at 26 | 0 | 0 |
| seed 47 (`?1b`, chain 0, n 28): pulse at t 100 / 100.45, span | 0 / 1654, 356 px | 0 |
| seed 160 (`?4g`, chain 5, n 60): pulse, span | 0 / 1421, 681 px | 0 |
| seed 4 (`?4`, chain 7, n 82, padding): pulse, span | 0 | 0 |

The fix's residue against the nudge is the nudge's own rounding; master
and the fix render the references within 0-7 px in d5 (up to 110 px in
the normal view, nearly all at 1/255). A single pulse
phase can hide the pulse case (no crest on the run at t 100): shoot two.
Master's reproduction with four pulse phases is `out_attr/`.

Sheets, in `.claude/probes/K299/sheet/`:
- `K299_seam_ab.png`: his link, both states;
- `K299_midmove_ab.png`: the in-flight spans;
- `K299_rim_ab.png`: the hover rim;
- `K299_hits_ab.png`: seeds 47 and 160.

A pink d5 band in the first, noisy master A/B (`out_ab/`) is gone from
the clean rerun (plucks 0). By its normal colors it was an auto pluck's
overlay: plucks ignore paintDebug, and that run left music mode's plucks
on.

### Census

`census.ts` builds each maze as `test/core/maze_solvable.test.ts` does
and lists every closed-strand walk run. "Bad n" is this GPU's list.

| set | seam runs (mazes) | on a bad n | garbage arc | wrap runs on a bad n (mazes) |
|---|---|---|---|---|
| dailies 1..300 | 49 | 11 | 5 | 70 |
| seeds 1..300, defaults | 51 | 14 | 9 | 76 |
| seeds 1..300, gridSize 10 | 21 | 4 | 0 | 40 |

After the fix: 0 by construction (kLapOf is exact for any quotient within
one of the truth), and 0 px on the GPU above. The bare `?qoietk`
(gridSize 18) builds another maze, with no seam run and 2 wrap runs on a
bad n, so the static bug needs the link's gridSize 10. markerSize changes
no paint, and hoverGlow gates only the rim.

### Not done

- Brief step 1's real hovered-choice shots. The rim was injected
  instead, and a hovered choice's pulse goes through the fixed PULSE
  path.
- The seam sheet shows two pulse phases, not three or four (master's
  reproduction in `out_attr/` has four).
- The bare seed was checked by the census only, not in a browser.
- The phone (PowerVR) was not checked; it rounds division its own way.

### Residuals

- The background contours' `mod(floor(v + 0.5), 5.0)`: exact on this
  GPU and listed in `ROUNDED_QUOTIENTS`. Unfixed, because the background
  programs are sha256-pinned.
- The rounding sites judged benign, now listed in the scan: kHeadLeave's
  lap and seed floors (one lap short gives the same point), the
  round-to-nearest sites (kCtrlNear, `gap_mask.ts`, `explore_glsl.ts`),
  kPulseV's phase, hue wraps and junction_field's TAU wrap.

### Next

The coordinator reviews and merges to master. K298 (the hover glow)
builds on this: master drew no rim on a seam run.
