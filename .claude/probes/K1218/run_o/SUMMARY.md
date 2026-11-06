# K1218 Run O — what the crossing-gap mask draws inside the junctions

Muse batch 22 Run O (chain tag `22O`), probes only: nothing in `src/` or
`test/` was changed. Slot table read through the `__knotRenderer()` probe
hook (`renderer.gaps.describeSlot/readSlot`, `renderer.slotOverChain`,
`renderer.chainWins`, `renderer.ps.crossings`, `renderer.paintState`) —
no probe-only `src/` edit was needed. Shots in real time (never
`--virtual-time-budget`) under the perf lock (`$env:TEMP\claude-perf.lock`,
owner `K1218-O`), dev server on port 5980 (Run O range 5980-5989), S2's stands
copied (`shoot_o.mjs` from `shoot2.mjs`, `lib.mjs`/`png.mjs`/`crops_o.mjs`
verbatim from `.claude/probes/K1211/`). At rest (phase 0, look 0): view
rest-exact, no drift, junction-light hook present on both stands.

Master (named once): `c32f20def34e76246f733a2031738e3f5a30a0c0`
(stamp `P4 v0.4.0 c32f20de 2026-11-05 23:36`, both stands asleep, `ctxLost 0`).
Shots per stand: live `L0_t0`, `w0_t0`, `nb_t0`, `np`, `pure`, `nomask`, `bg`
(full-viewport PNGs stay untracked under `out/`; only the crops below are
tracked). Crops are 200 device px at S2's size/dsf (1700x950, dsf 1.5,
60 CSS px/world = 90 device px/world, `fh 0.26` world = 23.4 device px).

## Answers by spot

| Spot (stand) | Slot(s) whose footprint covers it | Ribbon whose paint shows | Split on that ribbon | Zigzag segments (device px) | Crops |
|---|---|---|---|---|---|
| loop ji 89 (T) | 73: cross over ch38@45.53 / under ch60@4.40, sign +1; fan slot (dist 1.009w) + under-ch60 casing; hOver 0.260, margin 0.070, fade 0.140, SAMP n40 stride1 | ch38 (over) | ctrl 42.00, arc 20.995, sample 263 — at the joint (arm slot 42, 0 ctrls away) | 2: 45 @ 45°, 17 @ 135° (slot73 casing edge, mid-dist 0.2px / 4.2px) | `loop89_1x.png`, `loop89_3x.png`, `ov_loop89_slot73.png`, `proof_loop89_noslot73.png` |
| loop ji 12 (four) | 27: over ch38@65.43 / under ch5@4.65; 28: over ch38@56.39 / under ch5@10.00; both fan slots (0.799w / 0.410w); hOver 0.260, margin 0.070, fade 0.140, n43/44 | ch38 (over) | ctrl 62.00, arc 29.911, sample 374 — at the joint (arm slot 62) | 3: 33 @ -16° (slot27 silhouette+, 0.4px), 43 @ 62° (split line, 1.3px), 36 @ -34° (slot27 silhouette-, 2.5px) | `loop12_1x.png`, `loop12_3x.png`, `ov_loop12_slot27.png`, `ov_loop12_slot28.png`, `proof_loop12_noslot27.png`, `proof_loop12_noslot28.png` |
| loop ji 88 | 73 (same slot as ji 89; ji 88's own fan slot 66 over ch38@11.58 / under ch45@3.30 draws nothing here — disabling it changes 0 px at the flaw) | ch38 (over of 73; gold S itself ends at ji 88) | ctrl 40.00, sample 244 — at ji 88's joint (arm slot 40); the hole is slot73's, the split is ji 88's own | 2: 46 @ 148°, 22 @ -114° (bottom wedge in ji 88's crop = ji 89's edge, centres 0.92w apart) | `loop88_1x.png`, `loop88_3x.png`, `ov_loop88_slot73.png`, `proof_loop88_noslot73.png` |
| x4 ji 149 (notch, no zigzag) | fan 224: over ch58@35.82 / under ch58@128.73 (self, selfExcl 0.78) + fan 227: over ch58@76.36 / under ch69@2.65, sign -1; ribbon 228: over ch58@123.10 / under ch58@78.55 (self) | fan web (ch69 arm's untraveled teal), not a ribbon through a slot | 224/227: no gold boundary inside their over ranges; ribbon 228's split ctrl 126.00, arc 65.18, sample 796 at the joint — gold edge only | — (gold segments match slot228 casing/split, notch does not move with any slot) | `x149_1x.png`, `x149_3x.png`, `ov_x149_slot224.png`, `proof_x149_noslot224.png` |

Slot shape at each spot: on a junction fan a slot is the over silhouette
only — tube radius `hOver` (0.260w) around the over SAMP polyline, inset
1 px, no window clip; on a ribbon it is the casing tube radius
`hOver+margin` (0.330w) plus fade 0.140w, clipped to the window
`centreArc -winNeg .. +winPos` along the under ribbon (ji 12 slot27 window
under arcs 1.12..3.02, slot28 4.23..5.81; ji 89 slot73 1.37..3.14).
Footprints are drawn white=centreline / red=silhouette / orange=casing /
cyan=split / magenta=window ends in the `ov_*.png` overlays.

## Task 2 — slots (detail)

- Loop ji 89: only slot 73's tube passes through the joint (over distance
  0.073w from centre). Slot 67 (self ch38/ch38, over@37.10) covers the top
  arm's ribbon but is self-excluded there and moves nothing at the flaw.
- Loop ji 12: twin crossings 27 and 28 share over ch38; their over stretches
  straddle the joint (ctrls 65.43 / 56.39 around joint ctrl 62). Each cuts a
  different half: disabling 27 rounds the centre peak/valley, disabling 28
  fills the right gold end.
- Loop ji 88: fan mask is slot 66 alone, but the bottom zigzag belongs to
  slot 73 (next junction's slot; ji 88/89 centres 0.92w apart, fans overlap).
  Disabling 66 or 67 at ji 88: no visible change. Disabling 73: wedge fills.
- X4 ji 149: fan slots 224 (window centred on the joint, dist 0.000w) and
  227 cover the web; neither draws the notch (see task 4).

## Task 3 — zigzags, paint, split

The paint showing through every loop slot is the over ribbon's (ch38 in all
three loop spots): gold on the walked side of its split, untraveled section
colour (purple 171,123,188 at ji 12) on the other. The split sits exactly at
the junction joint (ctrls 42 / 62 / 40 above, 0 ctrls from the arm slot)
because gold spans end at walk-edge ends:

- src/render/walked_gold.ts:172 — `spans.push({ chain: e.chain, c0: e.ctrlA, c1: e.ctrlB });`
- src/render/fabric_maze_renderer.ts:4194 — `? [...gold.spans, ...this.mudSpans(controller, gold.walked)]`
- src/render/paint_math.ts:1685 — `const inside = wraps ? arc >= a0 || arc <= a1 : arc >= a0 && arc <= a1;`

Proved per spot by one hook change (wrap `renderer.computeGapSlot` so the
slot is cleared after its solve, then `update()`; bound radius 1.9-> -1):
loop slot 27 off rounds ji 12's peak, slot 28 off fills its right end and
erases the triangle, slot 73 off turns ji 89's straight diagonal into the
smooth S and fills ji 88's bottom wedge (`proof_*.png`, live left / off right).

## Task 4 — triangle and notch

**Triangle (loop ji 12), 16 px, dx +38..+43, dy +13..+16.** Centre colour
(158,139,58); without the mask gold (236,204,65); pure (113,88,138);
background (27,30,46). It is the under ribbon ch5's gold at partial gap
keep (~0.67) over background — the gap's casing fade (under-shadow), not
background alone and not untraveled paint. The point sits 0.125w from ch5's
centreline, 0.385w from slot28's over centreline (fade band 0.330..0.470w),
under arc 4.249 inside slot28's window (4.23..5.81) and outside slot27's
(1.12..3.02); the straight window end + fade band make the triangular lens.
Disabling slot 28 erases it; disabling 27 leaves it.

- src/render/gap_mask.ts:802 — `highp float k = clamp((e + 0.5 * pxW) / max(fadeP, pxW), 0.0, 1.0);`
- src/render/gap_mask.ts:810 — `highp float cut = full ? (1.0 - k) * inWin * inFoot * fs : 0.0;`
- src/render/ribbon/ribbon_shader.ts:321 — `finalColor = vec4(rgb, 1.0) * vColor * (aM * gk * lookA * frayA);`

**Notch (x4 ji 149), teal.** Crescent inside the gold U at (-20,-40):
live (188,200,111), pure teal (122,195,169), webs-hidden background
(24,31,44), mask-off unchanged. Teal point under gold at (-15,+18):
live = pure (122,193,180), webs-hidden gold (236,204,65). Layer: the
junction fan's untraveled base (ch69 arm's section colour) showing between
the gold band's round edge and the dark crossing lane. No gap slot draws
it: disabling 224, 227 or 228 leaves both pixels byte-identical
(188,200,111 / 122,193,180); hiding the fans moves it. Fan silhouette code
is therefore not its author; the fan base is:

- src/render/junction_field.ts:358 — `vec3 junctionBase(int rec, vec2 p, vec4 hd, bool untrav) {`
- src/render/gap_mask.ts:96 — `// <= -2 encodes slot (-id - 2) for a JUNCTION fan: the over SILHOUETTE`

## Task 5 — what a fix would take (no fix here)

- **Zigzags (ji 89/12/88):** the hole is correct casing behaviour at a
  crossing; it only reads wrong because inside a junction it exposes the
  over ribbon's straight split at the joint while the fan's gold band above
  it is round. Cheapest true fix: leave the junction footprint alone —
  extend the junction-clearance idea in `joinery.ts:jointMask` so slots
  whose over tube crosses a fan (not just whose window does) are dropped
  from that fan and from arm ribbons within `fanReach`, letting the fan's
  round band cover the split. Costs: crossings hugging a joint lose their
  casing (threads visually merge into the web — the fused look S1/S2 were
  removing), so it wants the fan band to carry the crossing's over/under
  read itself. Alternative: make the ribbon split follow the band — feed
  gold spans rounded ends (caps already exist in paint) so the exposed
  edge is an arc, in `walked_gold.ts` + `fabric_maze_renderer.ts` gold feed;
  touches every gold end, not just junctions. Data the shader needs is
  already present (slot table + spans); no new tables either way.
- **Triangle (ji 12):** slot28's fade band lands on ch5's gold just inside
  its window end. Fix by waiving fade (not casing) where the under ribbon
  is inside a junction's `fanReach`, mirroring the existing clearance in
  `crossing_gaps.ts` window clamps, or by starting the window past the fan.
  Moves: `src/render/gap_mask.ts` keep formula + `crossing_gaps.ts` window
  maths; expect `k320_slim` casing measurements and crossing pins in
  `test/` (paint/gap suites) to move, and shallow crossings near joints
  everywhere to lose their shadow.
- **Notch (x4 ji 149):** not a mask flaw — the fan's untraveled web shows
  past the gold band's round edge against a dark lane. Fix in the fan:
  grow the band's cover over the web sliver inside the turn (the
  `bandLightsWeb`/`bandTurnSide` test in `junction_field.ts`, whose header
  already names this spot's bite) or shrink the fan mesh to the band.
  Moves: junction fan colour only; S3's band-under-gold tests and the
  x4 ji 149 rest row move with it. No slot-table change.

## Scripts

`shoot_o.mjs` (stands + slot dump), `proof_o.mjs` (single-slot off),
`analyze_o.mjs` (edges/slots/masks/fan/match/maskdiff/notch/holes/pixel/
near/overlay/layers), `candidates.mjs`, `crops_o.mjs`, `lib.mjs`, `png.mjs`,
`run_o.ps1` (perf lock, owner `K1218-O`), `vite.private-cache.config.ts`.
Reproduce: start the dev server on 5980 with that config, then
`run_o.ps1 -What shots -Jobs "shoot_o.mjs loop out/loop","shoot_o.mjs x4 out/x4"`
with `K1211_HOST=http://127.0.0.1:5980`, then the `analyze_o.mjs` commands
above; proofs via `proof_o.mjs <stand> <slot> out/proof_<stand><slot>`.
