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
