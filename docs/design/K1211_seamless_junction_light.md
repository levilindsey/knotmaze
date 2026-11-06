# K1211 S1: the light inside a junction as one seamless unit

Stage S1 of K1211 (LEDGER.md): one Claude Opus agent in its own worktree, 2 h stop rule (end).

## Why

Levi, 2026-11-05 (verbatim):

> To be clear, the pictures I've been seeing of highlights over junctions are bad. There are
> clear lines/edges of the highlight within the interior of the junction. These seem to be
> artifacts of how the original threads are constructed before the threads were fused and/or
> the rounding was applied. These junctions need to appear as though they are one whole fused
> seamless unit.

> I believe we addressed this problem previously for blending segment colors across junctions?

Earlier that day (K1210): "I also want to make sure that fire and segment collapsing effects
also correctly transition across segments--similar to the highlights".

The pictures Levi saw are K1190's sheets in `.claude/probes/K1139/out/s4/sheets/` (main
checkout, untracked): `t4_ji33_cross_n_c34_3x.png` and `t6_ji149_x4_n_c34_2x.png`, with
`t4_ji33_cross_n.png`, `t6_ji149_x4_n.png`, the debug view `t4_ji33_cross_d.png` and the
location `.claude/probes/K1139/out/s4/look/loc_cross33_n.png`; the card's text is under
`## K1190` in `docs/ledger_notes.md`. The coordinator sees in them: a thread-wide band of light
with a hard, stair-stepped edge across the junction; a paler wedge with straight sides where the
band meets the rest of the web; the gold path's edge a straight line where it was a round arc.
A line like these anywhere inside a junction is the defect, whatever draws it.

## The reference: section colors already meet seamlessly

`src/core/section_colors.ts`, THE BLENDING CONTRACT: each junction gets ONE converged color and
every incident run ramps from its own color to it near its ends (the junctionBlend distance, the
same at every junction, eased), so any number of arms meet in one shared color and the web's
angular blend (`junctionBase` in `src/render/junction_field.ts`) has no contrast to draw a line
with. That is the look Levi calls seamless.

## What the light does today

- The gold path: K81's ROUTE BANDS (`.claude/rules/render-routes.md`; `junction_routes.ts`,
  `junction_field.ts`): one thread-wide band from the arrival arm to the departure arm over the
  untraveled base, its edge a one-pixel ramp at the thread's half-width, plus cover strips that
  redraw the arms beside the web.
- The choice pulses: K1139's PULSE BANDS (S3b to S5; `docs/design/K1139_pulse_junctions.md` and
  the Handoffs of `K1139_s3b_fix.md`, `K1139_s4_cycles.md`, `K1139_s4b_ridge_fade.md`): the same
  band shape, the crest evaluated along the band over a quiet base.
- Before K81 the web lit the gold through the angular blend of the arms' composed paint. Levi
  rejected that on 2026-10-12 (`.claude/probes/K81/levi_junction_nub.png`): the gold-to-section
  change ran as a straight line ("a discontinuous flat nub"), and gold filled wedges the route
  never crossed. A strong light through an angular blend draws straight radial lines; the colors
  look seamless because the arms already agree at the joint.

## Goal

Two candidate looks for the pulses and the gold path, behind one switch whose default is today's
look, and the sheets Levi chooses from by eye. No phone, no performance pass, and no fire or
collapse code in this stage (note what would carry over).

- A, one light per junction (the colors' rule): at each moment a junction has one level for each
  kind of light (pulse light, gold amount), and every arm's light ramps into it over a fixed
  distance near its joint, eased like junctionBlend; the web shows the arms' ramped light through
  the same blend the colors use, with no band. Expected: the light passes through the junction as
  a whole, and reaches a short way into the arms the path did not take.
- B, a soft field that keeps the turn: the light follows the route through the junction, with no
  edge anywhere inside the fused shape (for instance the band's sideways falloff widened to the
  junction's own size, or a smooth interpolation of the arms' light at their mouths). Try what
  you need; show the one that reads most seamless.

Both: continuous with the arms' light where they leave the junction; the crest moves without a
jump and paints no radial bars; the trail fades (K93, trail mode) and the web fade (K169) still
follow. K1040's junction redesign (`docs/design/K1040_s3f4_bound.md`) may replace the web's
geometry later: keep the light's rule independent of how the web is built where you can.

## Tasks

1. Edge map. At K1190's two junctions, name where each interior line of today's look comes from
   (band edge, band-to-base wedge, cover strip end, paint caps, the fan-to-ribbon seam, fillet
   layers), with one gradient-view sheet (the size of the color step between neighbouring
   pixels) that makes them visible. A few lines of notes.
2. The switch: a `junction_field.ts` setter reached through the probe hooks the way K1139's
   switches were (`src/app/probe_hooks.ts`): 0 = today, 1 = A, 2 = B. At 0: `npm test` green, the
   golden byte-identity guards unchanged, 0 px against master on the stands.
3. Build A, then B, with the CPU twin wherever the GLSL has one (`src/render/ribbon/joinery.ts`,
   `paint_math.ts`) and unit tests for any pure piece.
4. Sheets in `.claude/probes/K1211/out/`, each crop at full size and 3x, today / A / B side by
   side, plus the same junction with no light (the colors alone) as the reference:
   - pulses, three moments each (arriving, at the joint, leaving): K1139 plan 4.4's `cross` and
     `x4` stands (K1190's ji 33 and ji 149), and K1200's loop (`stands_cyc.mjs`; the sheet
     `out/s4cyc/sheets/loop_e102_moments.png`);
   - the gold path at rest through a junction: straight through, a sharp turn, a T, a 4-arm;
   - one wide view per stand so the junction's place is plain.
   View every crop yourself at full size and write your own verdict spot by spot: where a line
   or edge remains inside a junction in today, A and B, judged against the colors' reference.
5. Checks, which only reject (the eye picks): inside each web, no color step between
   neighbouring pixels larger than the arms' own largest step on the same frame; the crest's
   position continuous from frame to frame; outside each junction's ramp zone, the arms' pixels
   equal today's.
6. Handoff, appended to this brief: what A and B do and in which files, the checks' numbers, your
   spot-by-spot verdict, the expected cost (shader work per web pixel, data texels), what would
   carry over to fire and collapse (K1210), open questions.

## Where and how

- Work in your worktree. Dev server on ports 5960-5969 only (copy the pattern of
  `.claude/probes/K1139/vite.private-cache.config.ts`); 5173, 5480-5489, 5620-5639 and
  5880-5959 belong to others.
- Probe tools: `.claude/probes/K1139/` (`lib.mjs`, `strips.mjs`, `crop.mjs`, `sheet.mjs`,
  `sheets_s4.mjs`; K1139 plan section 6 lists them). Put the ones you write or change in
  `.claude/probes/K1211/` and add them with `git add -f`; large outputs stay untracked.
- Shoot in real time, never with `--virtual-time-budget` (`scripts/diag_screenshot.mjs` explains
  why); at most two browsers at once.
- Muse works in the main checkout on master: never touch its files or git state; read from it by
  absolute path only.
- Commit WIP on your branch at every milestone, broken or not. Never push. Never edit LEDGER.md.
  No helpers.
- Stop rule: stop when the stage is done or after 2 h of wall clock (`Get-Date` at the start and
  at each milestone), whichever comes first; then commit WIP, append the Handoff, commit, report.
  Neither a compaction nor context size is a stop; after a compaction re-read this brief and
  `git log`.
- Report: what you built, the sheet paths, your verdict, and a `Ledger items` list.

## Handoff (S1, 2026-11-05, Claude agent a775d9bee91f23536; draft while the shots wait on the perf lock)

### What was built, and where

- **The switch.** `src/render/junction_field.ts`: `setJunctionLight(mode)` / `junctionLight()`
  (`JUNCTION_LIGHTS`), carried by `uJParams.z`. 0 = today (the default), 1 = look A, 2 = look
  B; it rounds first and falls back to 0 out of range. Probe hook
  `window.__knotJunctionLight(n?)` (`src/app/probe_hooks.ts`) sets it, calls
  `rebuildFillets(true)` and returns the mode worn. The looks apply only to lit records with
  arms (routed or pulse-banded, `hd.z > 0`) and never in paint debug views 3 / 4.
- **Look A, one light per junction** (`jLightA` in FIELD_GLSL; CPU twin `lightA` in
  `src/render/ribbon/joinery.ts` `cpuJunctionField`). Per record, the level LJ is the
  |L|^2-weighted mean over its arms of L_i = composed minus untraveled at the arm's joint texel
  (`lightLevel`: a dark arm carries no weight, two equal lights average, the brighter
  dominates). At a web pixel each bracketing arm shows untrav(s) + mix(LJ, L(s), ease(s / ramp))
  with ramp = `LIGHT_RAMP_FH` (2.0) fh and ease = `lightEase` (junctionBlend's kEase: linear at
  0, smoothstep at 1), and the two arms blend by junctionBase's own weight t, exactly as the
  colors do. No band is drawn: the gold route bands and the pulse bands are skipped while A is
  on. A routed web that is fully traveled (J1.z >= 0.5, no pulse band) keeps its composed rows.
- **Look B, a soft field that keeps the turn** (`jLightSoft`, `jLightAllow` in FIELD_GLSL;
  twin `allow` / `covL` in joinery.ts). The bands stay (gold and pulse), but a band's cover
  becomes `lightSoftCover(d)` (solid to the half-width, then a smoothstep to 0 over
  `LIGHT_SOFT_FH` (1.5) fh more) times `lightAllowance`: 1 on the band's own arms, and on the
  other arms 1 - ease(s / ramp), blended by junctionBase's t. The light keeps the route's
  turn, has no hard lateral edge, and enters an arm the route did not take only near the joint.
- **Cover strips.** While a look is on, every routed arm's cover strip reaches at least
  `LIGHT_STRIP_FH` (2.25) fh, still capped by `coverCap`, so the ramps end inside what the
  junction pass draws (joinery.ts `want`).
- **Tests.** `test/render/junction_light.test.ts` (the switch, lightEase, lightSoftCover,
  lightAllowance, lightLevel, the shader copies by text); `test/render/k320_slim.test.ts`: the
  junction program's budget 40,495 -> 43,758 (+3,263 characters).
- **Probe tools** (`.claude/probes/K1211/`, tracked): `shoot.mjs <stand> <outDir> [nf]` (one
  settled same-state page per stand, every clock pinned, `phw=0` and `fw=0`; every look, nf
  pulse phases, webs off, the gold at rest, colors only, background; `meta.json` with the
  records, their arms and routes and the world-to-screen affine), `analyze.mjs` (`zero`,
  `checks`, `sheets`, `grad`, `gold`, `wide`), `lib.mjs`, `png.mjs`, `sheet.mjs`,
  `vite.private-cache.config.ts`. Outputs stay untracked in `out/`.

### Cost

- **Shader text.** JUNCTION_FRAG grows 3,263 characters, and junction-field and
  junction-field-explore (`#define JCOL vec4` there) both compile cold once for every player
  (K307), mode 0 included: shipping one look should delete the other's text, and shipping
  neither should revert all of it.
- **Mode 0, per web pixel:** two uniform tests (`uJParams.z > 0.5`), no texel read.
- **Look A, per web pixel:** 2n strip reads for LJ (n arms) plus four for the two bracketing
  arms (composed and untraveled each) and the two profArc reads junctionBase already makes;
  the band loops are skipped, which pays part of it back. LJ is the same for every pixel of a
  record: if A ships, compute it once per record on the CPU into one texel.
- **Look B, per web pixel:** per band, two eases and one smoothstep; no new texel read.
- **Data:** no new texels. The cover strips are longer while a look is on (at most 2.25 fh per
  routed arm), so the strip pass draws more fragments.

### What carries over to fire and collapse (K1210)

- The rule is the colors' BLENDING CONTRACT, applied to an effect: one converged value per
  junction, each arm ramping to it over a fixed distance near its joint, eased like
  junctionBlend, the arms then blended by junctionBase's own t. Look A is that rule written for
  a light; the same three pieces (`lightLevel` at the joints, `lightEase` over a fixed ramp,
  junctionBase's t) apply to any per-arm scalar an effect carries (the char amount, a collapse
  width), with no band and no polygon edge inside the web.
- Look B's piece is the travelling one: an effect that follows a route through the junction
  (a fire front) keeps its turn with a soft lateral falloff, let into the other arms only near
  the joint.
- No fire or collapse code was touched.
