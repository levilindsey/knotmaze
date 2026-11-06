# Muse batch 22 Run N (22N): what draws the text forks' disc and steps (K1220)

Master's sha, named once: **02805d13** (full
`02805d1319cf921f86d8174daaa6f156cd28f7f2`, the page stamp
`P4 v0.4.0 02805d13` on every shot). HEAD advanced past it during the
run by ledger/docs-only commits; `git diff 02805d13 HEAD -- src/ test/`
is empty, so every number below reads that code. All shots: seed 7,
1600x1000 at dsf 3, once the sim sleeps (k734.mjs's `__knotPerf().asleep`
wait), headed in real time (never `--virtual-time-budget`), under the
perf lock (owner `K1220-N`, `run_locked.ps1`). `ctxLost` read 0 on every
page. Probes only: no `src/` or `test/` change is committed (the three
proof edits in Task 2 were restored; `git status` is clean there).

Looks stay with Claude: this table says what was measured, never
whether it looks right.

Method (Tasks 1-3, `shoot.mjs` + `measure.mjs`): each stand shot four
ways (normal; fans hidden, `filletMesh.mesh.renderable = false`;
crossing-gap mask off, `maskEnabled = false` then `update()` and
`rebuildFillets(true)`, as `shoot2.mjs` does; knot hidden,
`root.renderable = false`, the background). Junction centres come from
`fieldProbe.center(ji)` (the hooks `k734.mjs` uses). Disc profiles: 16
rays in device px out to 2.5 half-widths or the ink edge (first pixel
within 12 RGB of the background shot), whichever first; the reported
step is the largest RGB distance between pixels 3 apart inside the ink
(the stroke's own edge ramp, last 6 px, excluded), so a ramp a few
device px wide counts (Run K's review point). Outline: radial ink edge
(dist to background > 30) at 720 angles, 5-pt smoothed; a corner turns
more than 45° over ±4 steps (~3.5 device px). Corners past 2.0
half-widths are neighbouring strokes at the search cap and are not
listed; the crotch between two arms is the smallest-radius corner in
each list.

| Stand | Junction | Step / radius (normal) | Inside | Arms just past the edge | Corners (fans on / hidden) | Crops (normal) |
|---|---|---|---|---|---|---|
| `ai` xh 3, ji 0 (i fork) | field arms 1/3, record −1 | 28.1 med / 76.4 max @ 83 px (1.18 fh) | 203,163,201 | 176,129,183; 212,177,211; 176,129,184 | 2 / 3 at r ≈ 1.0 fh | `out/ai_xh3_ji0_normal_1x.png`, `out/ai_xh3_ji0_normal_3x.png` |
| `ai` xh 2, ji 0 (i fork) | field arms 0/3, record −1 | 32.1 / 48.5 @ 84 px (1.20 fh) | 188,138,186 | 180,144,195; 196,146,195; 180,144,195 | 3 / 5 | `out/ai_xh2_ji0_normal_1x.png`, `out/ai_xh2_ji0_normal_3x.png` |
| `a` xh 3, ji 0 (L) | field arms 1/3, record −1 | 29.8 / 68.6 @ 84 px (1.20 fh) | 197,154,196 | 176,129,184; 207,168,206; 176,129,184 | 3 / 3 | `out/a_xh3_ji0_normal_1x.png` (3x untracked, 316 KB) |
| `a` xh 3, ji 1 (R) | field arms 1/3, record −1 | 6.7 / 34.7 @ 84 px (1.20 fh) | 179,122,177 | 178,122,177; 174,122,178; 174,122,178 | 3 / 3 | `out/a_xh3_ji1_normal_1x.png`, `out/a_xh3_ji1_normal_3x.png` |
| `a` xh 2, ji 0 (L) | field arms 0/3, record −1 | 34.0 / 56.1 @ 84 px (1.20 fh) | 190,140,189 | 180,144,195; 201,155,199; 180,144,195 | 4 / 5 | `out/a_xh2_ji0_normal_1x.png`, `out/a_xh2_ji0_normal_3x.png` |
| `a` xh 2, ji 1 (R) | field arms 1/3, record −1 | 8.5 / 32.4 @ 83 px (1.18 fh) | 179,122,177 | 178,122,177; 174,122,178; 174,122,179 | 3 / 4 | `out/a_xh2_ji1_normal_1x.png`, `out/a_xh2_ji1_normal_3x.png` |
| maze `x4`, ji 102 (no moves) | field arms 3/3, record 7904 | 1.4 / 13.0 @ 60 px (0.70 fh) | 130,154,204 | 129,155,204; 129,158,204; 129,155,204 | 0 / 2 | `out/maze_x4_ji102_normal_1x.png`, `out/maze_x4_ji102_normal_3x.png` |

Fans hidden / mask off, same step measure (median over 16 rays):
text forks fall to 3.3-4.9 with the fans hidden (the disc step is a fan
step; what remains is ribbon-to-ribbon change) and stay at normal
levels with the mask off (20.5 at the i fork xh 3; the a's L junction
reads lighter inside with the mask off, 231,214,231 against
197,154,196, its arms lighter too). The maze junction reads 1.4 in
all three ways. Full per-profile numbers: `out/measure.json`
(untracked beside the tracked `meta.json` summary in `shoot.mjs`'s
log; the crops above are the tracked set, 23 PNGs, each under 300 KB;
full-viewport shots and the remaining crops stay untracked in `out/`).

## Task 2: the disc

What paints it, in order of the code that decides:

- Text junctions get **no junction-field record**. The records loop
  drops any arm whose 0.8-ctrl probe falls within 0.15 world of the
  centre ([joinery.ts:1336](/C:/Users/lsl/Repositories/knotmaze/src/render/ribbon/joinery.ts:1336):
  `if (len < 0.15) continue;`), and a record is written only with at
  least two surviving arms ([joinery.ts:1409](/C:/Users/lsl/Repositories/knotmaze/src/render/ribbon/joinery.ts:1409):
  `if (n < 2) continue;`). Every text junction above keeps 0-1 of its
  3 arms (probe: `fieldProbe.record(ji)` = −1), at xh 3 as at xh 2.
  The joinery header's xh-2 note is the same path; xh 3's glyph arms
  are short in world units too (half-width 0.26 world).
- With no record within reach, each fused tip at the fork takes the
  **host-axis fallback disc**: [joinery.ts:1880](/C:/Users/lsl/Repositories/knotmaze/src/render/ribbon/joinery.ts:1880)
  `pushDisc(cx, cy, fillHalf * 0.99, tip.hostChain, ...)` over an AXIS
  record written by `writeAxis` ([joinery.ts:983](/C:/Users/lsl/Repositories/knotmaze/src/render/ribbon/joinery.ts:983)),
  plus the glyph stadium band on a second axis record (fan census at
  the i fork: records 8 and 12, 35 and 37 vertices, farthest vertex
  1.49 and 1.25 half-widths from the junction centre; neither apex
  sits on the centre, so the disc's own centre is offset from it).
- The disc's colour is therefore **one arm's colour** (the host
  chain's), read by the shader's AXIS branch as a 1D strip lookup by
  axis projection: [junction_field.ts:366](/C:/Users/lsl/Repositories/knotmaze/src/render/junction_field.ts:366):
  `return stripAt(int(hx.y + 0.5), (dot(e, ax.yz) + hx.w) * hx.z);`.
  It is not a blend of the arms and not a junction colour of its own:
  inside the i fork at xh 3 it reads 203,163,201 against arms of
  176,129,183 / 212,177,211 / 176,129,184 just past the edge (a point
  on the host's own section ramp, constant across the axis). Its
  **edge is the disc rim**: radius `fillHalf * 0.99` about the tip
  point (a 16-gon, `DISC_SEGS`), which the profiles find at 1.18-1.20
  half-widths from the junction centre (rim radius plus the centre
  offset, varying by ray). The a's R junctions step least (6.7-8.5)
  because all three arms there share 179,122,177's ramp.
- The maze junction **does** carry a field record, and its centre is
  sealed by a different disc: [joinery.ts:2317](/C:/Users/lsl/Repositories/knotmaze/src/render/ribbon/joinery.ts:2317):
  `pushDiscField(rec, jx, jy, fillHalf * 0.92);`, painted by the
  field's angular blend of the bracketing arms' composed materials,
  [junction_field.ts:437](/C:/Users/lsl/Repositories/knotmaze/src/render/junction_field.ts:437):
  `return mix(cA, cB, t);`. At ji 102 all arms read the same blue, so
  no step shows (1.4). The disc step is not text-only as geometry; it
  shows in text because the fallback disc wears one arm's ramp where
  three different ramps meet.

Proofs (probe-only edits, each shot under the lock, each restored
before committing; `proof.mjs`, clips `out/proof_*_1x.png`):

- Radius: `fillHalf * 0.99` → `1.35` in the fallback call moved the
  disc record's farthest fan vertex from 1.49 to 1.85 half-widths
  (+0.36 for a +0.36 edit); the stadium record stayed at 1.25.
- Colour: the AXIS branch's return → `vec3(1.0, 0.0, 0.0)` (with its
  explore-variant pair) turned the fork's centre to 255,0,0; the
  chain swap `tip.hostChain` → `tip.chain` in the same call moved it
  only 206,170,205 → 201,160,200 (neighbouring arms share the ramp).
  No `window.__knot*` switch reaches this disc; the edits are the
  proof, and `git status` shows `src/` clean again.

## Task 3: the steps

Every arm is one chain's ribbon strip. A strip ends at its joint
sample with a straight edge between its two extruded vertices: the
extrusion gives an open end `a plain perpendicular cap` ([ribbon_mesh.ts:164](/C:/Users/lsl/Repositories/knotmaze/src/render/ribbon_mesh.ts:164):
`// gets a plain perpendicular cap (dot = 1 -> w = halfWidth).`) and
writes the pair at [ribbon_mesh.ts:258](/C:/Users/lsl/Repositories/knotmaze/src/render/ribbon_mesh.ts:258):
`let lx = cx + ox * wLeft;` (and its right twin). That straight cut is
what sticks out: the fallback disc (0.99 half-widths about an offset
tip point) does not reach the cut's corners (a full half-width from
the centre, laterally), and no wedge covers the mouth because the
wedge loop also skips sub-2-arm records ([joinery.ts:2294](/C:/Users/lsl/Repositories/knotmaze/src/render/ribbon/joinery.ts:2294):
`if (arms.length < 2) continue;`).

Corners over 45° within ~3.5 device px, at radius ≤ 2.0 half-widths
(angle° / turn° @ radius, side lengths in device px from
`measure.json`; fans on, then hidden):

- i fork xh 3: on 19°/60° @ 1.00 fh (5.4, 2.4 px), 218°/62° @ 1.04 fh
  (2.6, 9.6); hidden the same two plus 48°/48° @ 1.04 fh.
- i fork xh 2: on a 138-155° cluster (56-77° @ 1.64-1.89 fh, sides
  4.6-6.1 px); hidden adds 47°/49° @ 1.01 fh and 226°/49° @ 1.42 fh.
- a L (xh 3 / xh 2): on 24°/50° @ 0.98 fh and 220°/62-70° @ 1.05-1.54
  fh (xh 2 shows the same 138-155° cluster as the i fork); hidden
  reads the same corners within a degree.
- a R (xh 3 / xh 2): on 54°/97° @ 1.70 fh (7.1, 6.3 px), 155°/51° @
  1.13 fh, 336°/49° @ 1.58 fh; hidden the same (xh 2 adds 151°/87° @
  0.95 fh).
- maze ji 102: on, no local corner (the outline stays round to the
  3-half-width search cap); hidden, 174°/108° @ 0.99 fh (3.6, 13.6 px)
  and 277°/88° @ 1.51 fh — the ribbons' straight cuts, which the seal
  disc and wedges cover there.

So each text corner has the arm's straight cut on at least one side
(the corner survives with the fans hidden, at the same angle), and
the fan's rim or the stadium edge on the other where they differ.
The crotch between two arms is in each list as its smallest-radius
corner (at ~1.0 fh in text: the disc rim crosses the crotch there
instead of a wedge rim). Does K830's corner rule make it sharp? The
rule (`roundedCornerKeys` in [corner_share.ts](/C:/Users/lsl/Repositories/knotmaze/src/render/ribbon/corner_share.ts),
used at [joinery.ts:2475](/C:/Users/lsl/Repositories/knotmaze/src/render/ribbon/joinery.ts:2475):
`const roundedWedge = this.r.cornerWedgeRounded(rec.jn, A, B);`,
sharp at [joinery.ts:2490](/C:/Users/lsl/Repositories/knotmaze/src/render/ribbon/joinery.ts:2490):
`pushPt(cx, cy);`) only styles wedges the wedge loop draws. Text
forks draw no wedges (above), so the rule never reaches their
crotches in either setting; where wedges do draw, the renderer's
share defaults to 1 (every wedge rounded).

## Task 4: what a fix would take

Colour with no edge: the fork needs a real field record, or a disc
that blends. Either stop dropping short glyph arms (the 0.15-world
probe at joinery.ts:1336 against glyph-scale arms; the profile grid
and `FIELD_BLEND_MIN` blending already exist for the field path), so
text junctions take the maze path (`junctionBase`'s composed blend,
arm strips per arm), or teach the AXIS fallback to blend the fork's
arms (new per-disc data: each arm's strip row plus a weight; the
shader's AXIS branch would need the arm count and rows it does not
carry today). Files: `src/render/ribbon/joinery.ts` (records, discs),
`src/render/junction_field.ts` (AXIS branch or record layout),
`src/render/arm_strip.ts` (rows per disc arm). What else moves: fan
vertex counts and rebuild cost at every glyph junction, the
`pre_g23` / golden pins and `k320_slim` budgets if shader text grows,
and K836's a-discs (same path). The maze's junctions already blend
and would not change, unless the arm-drop itself is retuned globally
(then maze records with short arms change too — a pin-moving change
to census first).

Outline staying round where an arm ends: cover the cut's corners.
Either the disc grows/recentres to reach them (radius and centre are
the tip point's today; the stadium clamp `TIP_DISC_SIDE` shows the
bulge risk past the arm's sides), or wedges draw at text forks too
(the same record fix as above; then K830's share styles their
crotches, round by default), or the ribbon end itself stops being
straight at joints (a round-join-style arc at the terminal sample in
`extrudeRibbon`, which moves every open end in the app, glyphs and
maze alike). Files: `joinery.ts` (discs/wedges),
`src/render/ribbon_mesh.ts` (terminal caps), `rim_curve.ts` if the
wedge rim is the cover. What else moves: the same pins and budgets;
`k320_slim`'s fan budgets count vertices the wedges add.

## Scripts

Copied from Run K's kit (never edited there): `lib.mjs`, `png.mjs`,
`crop.mjs`, `vite.private-cache.config.ts` (host env `K1220N_HOST`,
default port 5970, the run's 5970-5979 range). New: `shoot.mjs`
(5 stands × 4 ways, full shots + clips), `measure.mjs` (this table),
`proof.mjs` (Task 2's proof clips), `run_locked.ps1` (owner
`K1220-N`; its step splitter now passes every argument). The dev
server was Vite on port 5970 with the private-cache config, stopped
when the run ended. Numbers live in `out/meta.json` (targets, fan
census) and `out/measure.json` (profiles, corners), untracked.
