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

## Handoff (S1, 2026-11-05, Claude agent a775d9bee91f23536)

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
  `vite.private-cache.config.ts`, `run_shots.ps1` (every stand on both builds, under the perf
  lock), `run_analyze.ps1` (every offline step). Outputs stay untracked in `out/`.

### Shots: one settled state, every clock pinned

- Builds: the branch at 607bee12 (its `src/` and `test/` are HEAD's; later commits hold only
  probe tools and this brief) and master at eb476bc5, both `vite preview` builds (5962, 5961).
- Stands (`shoot.mjs`): **cross**, `?k111&am=instant&fw=0&snd=none&phw=0` after five moves,
  sheets on ji 33 (the pulse fork of K1190's spots 1 and 2); **x4**, the same link with `&pr=8`
  after nine moves, sheets on ji 149 (spots 1, 3 and 4); **loop**,
  `?1&am=instant&fw=0&snd=none&phw=0&pr=8` after thirteen moves, sheets on ji 113 (the head's
  junction, half under its marker).
- Headed off-screen Chrome (d3d11), 1700x950 at dsf 1.5, continuous loop, zoomed to 90 device
  px per world unit (fh = 23 px), a bit-exact view wait (K431), then the PIN (advanceClocks
  off, paintClock 100, pulseBorn 0, the background pinned, the DOM hidden) and 24 pulse phases
  over one period per look, under the perf lock. Every stand: exact view, no drift, no context
  loss, asleep.

### The zero check

- Look 0 on the branch against master: **0 px** on all 55 files of each stand (cross, x4,
  loop).
- Switched back to 0 after A and B: **0 px** against the first look-0 shot, on every stand.

### Checks (they only reject)

- **(a) Steps inside the web.** The light is the shot minus the colours-only shot, in 8-bit
  levels; each cell is the worst frame's excess of the web's largest step over the arms'
  largest / the web's p99.5 step.

  | web | today | A | B |
  |---|---|---|---|
  | cross 33 | 29 / 25 | 26 / 24 | 26 / 24 |
  | cross 34 | 74 / 16 | 28 / 5 | 21 / 6 |
  | cross 155 | 84 / 12 | 9 / 12 | 9 / 12 |
  | x4 147 | 107 / 64 | 106 / 30 | 106 / 38 |
  | x4 146 | 109 / 30 | 18 / 7 | 109 / 17 |
  | x4 28 | 100 / 31 | 12 / 9 | 16 / 9 |
  | loop 113 | 73 / 12 | 18 / 12 | 23 / 12 |
  | loop 88 | 138 / 72 | 113 / 50 | 113 / 52 |

  The other webs in the clips read the same on all three looks. Every look fails (a) on most
  frames, today included, because the arms' own largest step is 0-1 level, so (a) rejects
  nothing here. A and B lower the worst step at most lit webs; what stays high (x4 147, loop
  88, and B at x4 146) is what neither look reaches: the traveled partition and the webs
  (below). ji 149 is not in the table: its web does not fit inside the x4 clip.
- **(b) No jump.** The light centroid's largest frame-to-frame step in the web, against the
  crest's own 9.4 px a frame (today / A / B): cross 33 6.8 / 5.9 / 6.9; cross 155 13.2 on all
  three; x4 147 11.6 / 11.7 / 11.6; x4 146 14.8 / 7.6 / 14.8; x4 28 8.3 / 9.0 / 7.9; loop 113
  8.4 on all three. Every step over 9.4 px is today's too (the centroid hopping between two
  pulses), so neither look adds a jump. (b)'s frame count (the web's largest frame-to-frame
  change against the arms') fails today wherever the arms carry no pulse, so it rejects
  nothing either.
- **(c) Local.** 0 changed px outside the zones (8 fh around each web) on every stand and
  look; the furthest change is 3.7-4.3 fh from a web's centre (cross A 3.98, B 3.72; x4
  4.25; loop 4.10-4.19). Changed px against today (the whole frame at phase 0 / the gold at
  rest / colours only): cross A 23102 / 20854 / 14561, B 12127 / 11429 / 7869; x4 A 45407 /
  38252 / 16935, B 19556 / 18242 / 7263; loop A 35558 / 34479 / 13901, B 16447 / 16134 /
  4863. The colours-only shot changes because it keeps `paintTraveled`, the walked gold,
  which both looks treat as light.

### Where each line inside the light comes from (today)

From the edge maps (`*_edgemap_3x.png`: the shot, its step map, the light's step map, webs
off, its step map; rings at fanR, the fan's reach and the box):

- **Band edge (K1190 spot 1).** The crescent across the fork at cross ji 33 (k 17) and the
  curve at the gold's corner at x4 ji 149: in the light's step map, and still there with the
  webs off. The band's cover in the fan draws them.
- **Band-to-base wedge (spot 2).** Straight radial bars in the light at cross ji 33 (k 20),
  and a comb of radial rays under that curve at x4 ji 149: the light steps from one wedge of
  the fan to the next, webs on or off. Not isolated further (an arm's wedge, or a triangle of
  the fan).
- **The traveled partition (spot 3).** The straight Y at the centre of x4 ji 149: in the
  shot, the light's step map, the webs-off map and the colours-only shot. It is where the
  fan's arm domains meet: the walked gold (`paintTraveled`, the routed arms of K127) is lit on
  one side only, and the pulse band follows the same partition. Not the bands.
- **Fillet layers (spot 4).** The ")" at the right edge of the light at x4 ji 149: in the
  shot and the light's step map, gone with the webs off. The web over that edge does not carry
  the pulse light.
- **Cover strip end, paint caps, fan-to-ribbon seam.** Faint steps across each arm near the
  box ring (fanR + 2 fh) show in every column, today included; candidates are the cover
  strip's end and the fan-to-ribbon seam. I could not see them in the 3x crops. No other line
  sits on a ring.

### Verdict, spot by spot

My own view of every 3x crop of cross and x4, the native-3x zoom and the 1x sheets, against
K1190's top row (before K1139's change) and the colours' seam. Note the names: Levi's K1139
answer "A" is the light that splits along the paths; this stage's look A is the fused one.

K1190's four spots:

1. **Sharp curved fronts** (cross ji 33, x4 ji 149). Today: there (a crisp crescent at cross
   k 17; the curve from the gold's corner down to the dark gap at x4). Look A: gone at cross
   ji 33, where the light fuses softly across the fork; at x4 ji 149 gone only because the gold
   floods the junction (spot 3). Look B: softened, not gone: the edge still reads at 3x.
2. **Straight edges** (the paler straight-sided wedge, cross ji 33). Today: there (a sawtooth
   notch at the light's top left and radial bars, k 20). A: gone. B: weaker; a faint notch and
   wedge remain. The colours-only shot has a straight-sided light-blue diamond in this fork
   too: the colours' own, not the light's.
3. **The gold's edge at x4 ji 149** (straight, with a corner). Today: there, and in the
   colours-only shot. A: covered, not fixed: the gold floods the junction and the start of
   the off-route teal arm, which is K1139's C (rejected) and the nub K81 removed. B:
   unchanged. Neither look can fix it in this stage: the traveled partition draws it, and
   neither look moves that partition. It needs the walked gold to follow the route band's
   round corner, as before K1139.
4. **The bite at the right edge** (x4 ji 149). Today: there. A: under the flood. B:
   unchanged. Neither look can fix it in this stage: the web draws it (gone with the webs
   off), and neither look touches the webs.

The moments (arriving, at the joint, leaving; `*_moments_1x.png` and the 3x crops):

- **cross ji 33.** A reads as one fused light, but it lights the whole fork (close to the
  rejected C) and adds a crisp straight line across an arm about 2 fh out (clearest at k 17).
  B keeps the split Levi chose and softens its edges; spots 1 and 2 are weaker but visible.
- **x4 ji 149.** A floods it gold: not acceptable. B is close to today.
- **loop ji 113** (1x only). The head marker covers half the junction; the three looks are
  hard to tell apart at 1x. I did not view its 3x crops.
- **Wide views.** Nothing changes away from the junctions (check (c)); in x4's wide view, A's
  gold around the head reads as a fat bright blob.

The gold at rest (`*_gold_3x.png`: today | A | B | colours-only):

- **Straight (cross ji 113) and sharp (x4 ji 102, loop ji 13).** Today is clean: a round edge
  where the gold meets the off-route arm, as in colours-only. A and B both push a soft gold
  nub about 1 fh into the off-route arm (A more). A regression on both.
- **T (loop ji 89) and four (loop ji 12).** Today has hard straight zigzags between the gold
  and the other arms, in colours-only too (the traveled partition). A and B soften part of
  them and add the nub; the straight sides stay.
- **T at x4 ji 125.** Today's gold is broken: a teal strip with a straight edge separates the
  incoming and the outgoing gold, in colours-only too. A joins it (with the nub below it); B
  keeps the strip.

**Overall: neither look should ship as it is.** A fuses the light but floods the gold (C, and
K81's nub) and adds a line; B keeps the turn and softens the fronts, but leaves spots 3 and 4
and nubs the gold at rest. Spots 3 and 4, and the gold's zigzags and break, are not drawn by
the bands at all: the next stage has to work in the traveled partition and the webs.

### Sheets

All in `.claude/probes/K1211/out/sheets/` (untracked; `run_analyze.ps1` rebuilds them from
`out/b607/` and `out/eb476/`):

- K1190's spots side by side: `zoom_cross33_x4149_native3x.png` (rows cross k 17, cross k 20,
  x4 k 13, x4 k 16; columns today | A | B | colours-only).
- Moments: `cross_ji33_moments_1x.png`, `x4_ji149_moments_1x.png`, `loop_ji113_moments_1x.png`
  (rows arriving, at the joint, leaving; columns today | A | B | colours-only) and the 3x
  crops `cross_ji33_k17/k20/k23_3x.png`, `x4_ji149_k10/k13/k16_3x.png`,
  `loop_ji113_k12/k15/k18_3x.png`.
- Edge maps: `cross_ji33_edgemap_3x.png`, `x4_ji149_edgemap_3x.png`,
  `loop_ji113_edgemap_3x.png`.
- The gold at rest: `cross_gold_1x.png` / `_3x.png` (straight), `x4_gold_*` (sharp, T),
  `loop_gold_*` (sharp, T, four).
- Wide views: `cross_wide.png`, `x4_wide.png`, `loop_wide.png` (today | A / B | colours-only,
  half size).

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

### Open questions, and what is missing

- **Waiting on Levi:** which way to take the light, B's split with soft edges or A's one fused
  light, knowing that both nub the gold at rest and A floods it. Ask with
  `zoom_cross33_x4149_native3x.png` and `x4_gold_3x.png`.
- **Spot 3, and the gold's zigzags and break:** make the fan's traveled partition (K127)
  follow the route band's round corner instead of the arms' wedges. Not built.
- **Spot 4:** carry the junction light into the webs, or run the fan's light under the web's
  edge. Not built.
- **A per route, not per junction:** a level taken from the routed arms only would keep the
  split and keep the gold on its path. Not tried.
- **A's line about 2 fh out** (cross ji 33). Inferred from the code, not tested: `coverCap`
  can end an arm's cover strip before the 2 fh ramp does, and the arm then jumps from the
  ramp's value to its own light.
- **The references:** the colours-only shot keeps `paintTraveled`, so it is not colours only;
  a pure one clears traveled too. Checks (a) and (b) reject nothing on these stands, since
  today fails both: (a) needs a threshold set on the colours' own seam.
- **Not covered:** explore mode (the junction-field-explore program); the loop's 3x crops and
  edge map (made, not viewed); K1190's `t4_ji33_cross_n_c34_3x.png`; gold kinds the stands
  lack (a straight at x4 and the loop; a T, sharp or four at cross; a four at x4). The x4 and
  loop crops run past their clips' edges: re-centre the clips on ji 149 and ji 113 next time.
- **If a look ships:** delete the other look's shader text (both junction programs compile
  the 3,263 characters cold), and for A, compute LJ once per record on the CPU.
