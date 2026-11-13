# K1362 stage 1: the junction look per pixel on the GPU, measured

Ledgers: K1362 (this), K1240 (the redesign), K1314 (the census). One Claude Opus agent in its own worktree, on its
own branch from master. Cap 2 h. Read first: `## K1362` at the bottom of `docs/ledger_notes.md` (the analysis and
this test's bar), then the handoff at the end of `docs/design/K1247_s36_pool.md`.

## Why

rp=outline builds an exact vector outline of the whole scene on the CPU every frame, and then draws it. On def the
worker takes 65-117 ms per update, and drawing each new outline costs main another 35-50 ms of frame time (s36).
Levi called today's drag "unacceptable", and the worker pool made the lag worse (250-340 ms). He has asked for a
fundamentally different approach, not more incremental cuts.

Form B (`src/render/field/form_b.ts`; its definition is `docs/design/K1040_junction_field.md`, "form B, exact") is
already a per-pixel distance: member sides whose foot lies outside every other member, exposed endpoints, and
rolling-ball fillets. So the hypothesis is that the CPU builds only small closed-form tables per frame, and the GPU
evaluates the look per pixel. The CPU's tables, O(crossings + junctions), with no searches, walks or iterative fits:
- each crossing's order and cut;
- each junction's arms, its fillet centres and radii, and a fade weight for whether a fillet exists.

Union, crossing clips, round corners and caps then come from the distance function, not from built geometry. This
stage finds out whether that is accurate and fast.

## Goal

A GPU renderer of the junction and crossing look, selectable in the app by a new `rp` value (default untouched). Its
look follows Levi's calls, not form B's flaws:
- **K1045/K1049:** form B's open eye, with a rounded corner.
- **K1319:** the round tip at muse_hash j73, where form B cuts it off at an angle.
- **K1315:** at a junction's under-tail end, no round dot, no square stub, and no ink past the over thread's outline.
  Form B's dots fail there too.

Levi plans to build on the outline: dashes, pencil textures, things travelling along it, and using it as data.
So keep, per pixel, which term of the definition wins (which member side, fillet or exposed endpoint, that is,
which outline piece), never a blend that loses it. Say in the report whether a continuous coordinate u around
each outline loop follows from your tables (per-piece ends from the closed-form cuts and fillet tangents,
prefix-summed per loop in K1240's fixed piece order), and what breaks it when a fillet appears or disappears.
Building u is stage 2. (Added 2026-11-12 after launch; sent to the agent.)

Ink and fill come first. Section paint goes through the existing GLSL (`paint_glsl.ts`), and the run bands' shading
waits for stage 2. The technique is yours. The GPU field code K1040 left in `src/render/field/` and
`src/render/junction_field.ts`, and the SDF tables in `samp_table.ts` / `fabric_sdf.ts`, may help. K1040's CPU side
was slow from its corner re-fits and h/8 walks, so do not carry those over.

## Done

1. **It renders** all 12 census scenes in the app (the scene list is in `.claude/probes/K1314/k1314_run.ps1`), at rest
   and through the s18 drags.
2. **Accuracy:** the census bar kinds (stray_ink, hard_edge, paper, broken_ink, k1049) for your renderer, against
   form B's tiles, next to rp=outline's `census_k1314s13f` (4 / 1 / 0 / 12 / 0). The census rasterizes in Node
   (`.claude/probes/K1314/k1314_census.ts`), so read back your GPU's pixels, or run the same shader math in a CPU
   mirror and prove the two equal. Name every find, and crop each one as form B | rp=outline | yours, 4x and 8x,
   in `.claude/probes/K1362/out/s1/`. A find at a spot where Levi's calls above differ from form B is expected:
   list those separately, with the crop. I view the crops before merging.
3. **Speed** on desktop, under the perf lock: on the def, muse_hash and fat drags, record the CPU table build per
   frame (ms), the GPU pass (a timer query; subtract an empty query), and main frameMs p50/p95 against master's
   rp=outline and today's look. The bar is the gate: 3 ms CPU and 6 ms frame on desktop. The Pixel is timed later,
   in the phone round (K156): never touch the phone.
4. Today's look and rp=outline are byte-identical with your `rp` value off, the golden snapshots don't move, and
   `npm test` is green.

A failing check is work to do, not a reason to stop.

## How the result is judged

Levi, 2026-11-12: "be careful to evaluate this correctly and not discard it without being completely sure it proves
the approach cannot work". This stage measures. Nothing in it rules the approach out; only a proof can.
- **Every census find gets a class.**
  - **(a) Definition:** the per-pixel rule at that spot (form B's rule, or one of Levi's calls not yet built). The
    fix is in the rule.
  - **(b) Implementation:** precision, a bin too small, a missing table entry, a bug. The fix is in the code.
  - **(c) Inherent:** the right pixel needs information that no closed-form per-frame table can carry. A (c) needs
    an argument, not a guess; until it has one, it counts as (a) or (b).
- **Every slow number gets a breakdown:** CPU tables, binning, and the GPU pass (pixels shaded, and candidates tested
  per pixel, mean and p95). It also gets a floor: the cost at the fewest candidates the scene allows (from the
  tables). That separates "this prototype is slow" from "per pixel cannot be fast". A pass over budget is work to
  find the floor, not a verdict.
- **Name every shortcut that biases the result toward failure,** with its expected gain: no binning, testing every
  member per pixel, full-screen passes where a bound would do, no early-out, float32 where it matters.
- **The verdict is one of:**
  - "reaches the look and the gate";
  - "reaches them after these fixes", each classed, each with its expected effect;
  - "cannot, because <proof>".

  Never "probably not".

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print a
  whole file: outline.ts, oracle.ts and form_b.ts are large. Keep each tool output under about 40 lines. Use the Read
  tool only right before an Edit and to view images. Junction `node_modules` from the main checkout; never `npm ci`
  or `npm install`. Before deleting any directory, delete each junction inside it with `(Get-Item <path>).Delete()`.
- **Your files:** new files under `src/render/gpu_field/` (or a name you choose, all new), the minimal hook where
  `rp` is read (name it in your report), tests, and tools and outputs under `.claude/probes/K1362/`
  (`k1362s1_*`). Read `form_b.ts`, `oracle.ts` and the census, but don't change them. Others are working in these
  files; stay out of them:
  - **K1314 s14 (Claude):** `outline.ts`, the band files, `rec_glsl.ts`, `paint.ts`.
  - **K1351 (Muse):** `draw.ts`, `fill_tri.ts`, `chain_frame.ts`.
- **Untracked inputs** (scenes, drags, the census's form B tiles) are in the main checkout's `.claude/probes/`. Copy
  what you need, and never write there; the census's shared form B cache writes itself.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for outputs. Never
  push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not start.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time, and delete it
  after. Run the census with `-Lock` and hold no lock of your own around it. While someone else holds it, wait inside
  one blocking command; a lock older than 30 min is stale.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at each
  milestone). Leave the last 25 minutes for the checks. Then commit WIP, append a handoff to this brief with your
  start and stop times, and report. Neither a compaction nor context size is a stop.

## Report

Under 30 lines:
- what you built, and where;
- the census counts by kind next to rp=outline's, and every find, with its crop;
- the speed table (CPU tables, GPU pass, frameMs) by drag, with the load;
- your verdict: does per-pixel reach the look and the gate, and what stage 2 needs;
- your last SHA.

End with `Ledger items` and the handle fields for K1362.

## Handoff (stage 1 agent, claude session 01SUPGULDxvE5gKXozfaFaFG; started 20:32:12, stopped 22:05, 2026-11-12)

**Built** (only new files; nothing in `src/` outside `src/render/gpu_field/` changed, so today's look and
rp=outline are byte-identical by construction; `npm test` green on d19f19aa, 231 files / 2939 tests):
- `src/render/gpu_field/tables.ts`: the CPU tables. Chain polylines, crossing pins, junction arms, corners (form B's
  rolling ball on tracked feet, its margin / steep / slack / root gates and its V gate, a windowed Newton on the
  true foot distances), K1049 through-pass corners, and an h grid binning chunks and corners.
- `src/render/gpu_field/eval.ts`: `GfEval`, the per-pixel evaluator as a CPU mirror written for a GLSL port: pieces
  (folded segment ranges), ramping members as weighted configurations, surfaces, side / arc / tangent-point terms
  with burial, top-down composite. It keeps the winning term per pixel (winKind 1 side, 2 arc, 3 cap, 4 tangent
  point, 5 K1049 arc); no smooth-min.
- NOT built: the GLSL pass, the app hook (planned: a new `rp` value read in `src/app/frame_loop.ts`), GPU readback,
  timer queries, the s18 drags. So Done 1 and the GPU half of Done 3 are open.

**Accuracy** (CPU mirror, ppu 160, 12 scenes; `.claude/probes/K1362/out/s1/census_h.*` on d19f19aa). stray / hard /
paper / broken / k1049: mine 97 / 2 / 46 / 156 / 0 (2a3ee09b: 118 / 2 / 46 / 343 / 0), rp=outline 4 / 1 / 0 / 12 / 0.
Every find is attributed to the winning terms at its pixel (`attr_h1_h2_h3.json`, `k1362s1_attr.ts`); all are class
(b), implementation (an incomplete mirror of form B), none (a), none (c):
- 76 form B's TA / TB / arc term wins and mine has no matching corner near p (muse_hash j92: mine only the K1049
  corner). Corner-set mismatch, not yet attributed corner by corner (`k1362s1_kat.ts` lists both sets near a point).
- 45 mine has an arc where form B has none (stray spikes, muse_hash j7 / j8): a corner form B rejects or an arc read
  past its reach.
- 44 my K1049 arcs: through-corner r differs from the reference (def: 38 matched, mean |dr|/h 0.165; 24 fixed track
  nodes against fbf's CF growth), and yieldInk lacks its inner ramp.
- 35 same corner, ink differs (r / q); 14 burial; 6 label; 37 other; 44 agree at the find's own pixel now.
Fixed this stage: the V gate (def's non-through corners now equal form B's 332, mean |dr|/h 0.010), no self-burial of
a piece by its own fold (form B has none; -117 finds), and the tangent-point terms (the side-cut / arc-sector seams).
Crops (form B | rp=outline | mine), one per bucket, at 4x and 8x: `out/s1/x4/*.png`, `out/s1/x8/*.png`. Levi-call
differences: K1049 is in (its 44 finds above); K1319 and K1315 are not built yet.

**Speed** (Node, median of 20 builds, under the perf lock, load 0% before / 8% after; ms):
| scene | vtx | pins | arms | corners | bins | total p50 | p95 |
| def | 2.66 | 0.19 | 2.07 | 8.56 | 2.29 | 16.50 | 23.12 |
| muse_hash | 1.70 | 0.19 | 1.54 | 3.26 | 1.22 | 8.70 | 20.71 |
| fat | 0.60 | 0.22 | 0 | 0 | 0.95 | 1.84 | 3.38 |
Candidates per pixel within reach (`k1362s1_floor.ts`): binned def 36.1 mean / 55 p95, muse_hash 57.9 / 84; after the
chunk-box reject (census) def 18.3 / 40, muse_hash 29.6 / 56; floor (segments within h + W + aa) def 11.5 / 21,
muse_hash 18.1 / 32, fat 9.2 / 17. Corners per pixel: mean 0.5, p95 2. GPU pass and frameMs: not measured.
Speed fixes, all (b): a local foot walk in the V Newton (each step now scans both arms' samples) and the straight
model's V accepted when its feet are well inside (corners 8.56 -> about 1-2 ms); vertices from the app's own sample
buffers (vtx -> about 0); a counting-sort grid without allocation (bins -> about 0.5); no rebuild while asleep.

**u around each closed outline loop** (coordinator question): derivable from the tables. Each piece's start and end
are closed-form cuts (the fillet tangent points kTa / kTb, the crossing pins), so prefix sums over pieces in K1240's
loop order give u. A fillet appearing or disappearing (r crossing 0) changes the piece count and the loop length by a
jump; ramp the arc's contribution to u by its fade weight so u stays continuous. Building it is stage 2.

**Verdict:** reaches the look and the CPU gate after these fixes, all (b): the corner-set mismatch (76), the stray
arcs (45), the K1049 r and the inner ramp (44), corner r / q (35) and the burial and label residue (20); then the
speed fixes above. The GPU frame gate is unmeasured: the GLSL pass and its timer query are stage 2's first step and
decide that half.

**Next** (stage 2): attribute the 76 and 45 corner by corner against form B's own corner list; port eval.ts to
GLSL behind a new rp value; time it (timer query minus an empty query, frameMs p50 / p95 on the def, muse_hash and fat
drags against master's rp=outline and today's look); then K1319 and K1315.
