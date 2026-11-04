# K1040 S1i (K1114): bring back the corner rounding, keep the pop fixes

## Why

Levi looked at S1h's picture (`.claude/probes/K1040/s1/out/s1h/old_new.png`:
sites 02 j36, 16 j131 and 17 j99 at zoom 4, S1f's final | today) and said,
2026-11-03: "I don't like that we've lost corner rounding with the new
junction changes."

The changes are S1g's (merged at `52945e6e`; `docs/design/K1040_s1g_gates.md`,
F1 and F2), both in `src/render/field/form_b.ts`:
- **F1, the d-edge** (`dEdge: "near"`): a pass behind an arm's root cuts
  the arm at its arc distance (c = u), so L is continuous at d = 0. Before
  it, L popped from its span to 0 as a pass slid over the root (S1f F6; the
  tee and ring sweeps' ink step 1.000). At rest it moved 607 arms and 100
  corners, and 4 lost fill (muse_hash j0 0-1, j36 109-110 with r 2.721h ->
  0, j155 471-472, j156 475-473). It also drove sites 16-18's tip moves
  (0.34-0.75h; F2 0.000h there).
- **F2, the root gate** (`rootBand: 0.5`): r goes to 0 as a corner's foot
  reaches its root, so 699's window null is reached only at r = 0. Before
  it, r stepped 2.000 -> 0 at the null. At rest it moved 155 corners' r by
  0.036-0.096h measured from the corner (S1h's Findings); no fill lost.

So F1 is what took the rounding Levi saw. F2's at-rest moves are small, but
they shrink rounding too.

## The goal

At rest, the corners round as they did in S1f's final, and every pop S1g
removed stays removed:

1. **Rounding, at rest.** Against S1f's final (`FormB({dEdge: "skip",
   rootBand: 0})`, which reproduces the frozen S1f ink exactly, S1h's
   Findings): no corner loses fill, and the ink at S1h's 18 sites returns to
   S1f's or within a few device pixels of it. The F1 sites (01-05, 16-18)
   come first. Report the F2 sites (06-15) as well.
2. **The pops, in motion.** S1g's checks get no worse:
   - the tee and ring sweeps' ink step (`dedge_s1g.ts`: coarse 0.148 and
     0.174, which is the sweeps' ordinary rate; fine 0);
   - gate699's (`gate699_s1g.ts`: r's coarse step 0.030, ink 0.125, fine
     0.0006).
3. **The gate.** S1g's gate (F6) is no worse on any scene without an
   attribution. Its commands are under S1g's Handoff "Reproduce", run
   against `-Tag g1`.

There may be a real conflict. Continuity at d = 0 makes L reach 0 as a pass
nears the root, and a corner whose pass sits close behind its root at rest
then has no room. Look for a definition that avoids the conflict before
trading one goal against the other. Two directions to look at:
- the corner keeps its own room and the cut only clips its ink;
- the cut eases from S1f's span to 0 over a band at the root.

If no definition meets 1 and 2 together, stop. Show the trade-off as
pictures for Levi, rounding kept against how fast the span's end sweeps.
Don't pick a look that loses rounding on your own.

## The deliverable

`out/s1i/sheet.png`: per site, S1f's final | today | restored, at zoom 4,
with S1h's framing (`s1h_pair.ts`: zoom 4 at +-3.5h around V, dpr 2, the
same scenes and centres). Sites 02, 16 and 17 go first, because Levi saw
them. Also write play-size triples (zoom 1) and `out/s1i/index.md`, with one
row per site: the pixels that differ from S1f, and against today.

## Order

1. Measure. Find which part of the corner solve loses the room at j36
   109-110, j131 397-398 and j99 301-299 under `near`: L, the window, or the
   foot. Commit what you learn as a Finding.
2. Make the candidate definitions, behind a param as S1g did (default
   unchanged until one passes), and give each one the checks under The goal.
3. Make the winner the default, and re-run the pins and `npm test`.
4. Build the sheet and the index, then write the Handoff.

## Rules

- Work in your own worktree from master. Commit WIP at every milestone,
  broken or not, and never push. Keep harnesses and results in
  `.claude/probes/K1040/s1/` (`out/s1i/`).
- Read code through the shell: `Select-String` finds the lines and
  `Get-Content <file> | Select-Object -Skip <n> -First <m>` reads them. Use
  Read only just before an Edit.
- Lane: `src/render/field/form_b.ts`, its tests, `.claude/probes/K1040/s1/`
  and this brief. S1g changed only `form_b.ts`. If the GPU label pass
  (`src/render/field/`, `src/render/label/`) computes the same corner, say
  whether it needs the matching change, and list it under Ledger items
  instead of making it.
- Scenes are read in place from the main checkout's
  `.claude/probes/K868/scenes`. The worktree has no node_modules, and Node
  finds the main checkout's.
- Ports 5405-5409 if a server is needed.
- Don't edit LEDGER.md. End the final report with a `Ledger items` list
  (follow-ups, residuals, decisions) and K1114's handle fields (branch,
  last commit, evidence, next).
- Helpers: sonnet for mechanical work, under the same stop rule.

## Stop rule

Opus, 2 h cap. Run `Get-Date` at the start and at each milestone. Stop when
the stage is done or at the cap, whichever comes first. A compaction is not
a stop, and neither is context size. After a compaction, re-read this brief
and `git log` before going on. When you stop, commit the WIP, append a
Handoff to this brief (what landed, by commit; the sites; commands;
findings; what is left) and report.

## Findings

### F1 (16:27): it is L, through the cap gate; the window and the feet hold

`s1i_room.ts` (on `form_b_s1i_tr.ts`, the worktree's form B with read-only
hooks, built by `s1i_mk_tr.mjs`; the copy reproduces every corner's r, room
and ω and every arm's L exactly) traces the three corners' solves under
S1f's final, near with rootBand 0, and today (`out/s1i/room.txt`):

| site | cut arm | its cutting pass (near) | L S1f -> near | V's feet dVa, dVb | where S stops (near) | r S1f -> near |
|---|---|---|---|---|---|---|
| 02 j36 109-110 | 109 (closed chain 11) | 1.112h behind, θ 0.300 | 2.950h -> 1.112h | 0.842h, 0.918h | at V: slack −0.109h | 2.721h -> 0 |
| 16 j131 397-398 | 397 | 2.135h behind, θ 1.386 | 3.208h -> 2.135h | 0.985h, 0.945h | ρ − h = 0.597h: slack −0.060h | 3.183h -> 0.392h |
| 17 j99 301-299 | 301 | 1.598h behind, θ 1.425 | 2.569h -> 1.598h | 0.752h, 0.805h | ρ − h = 0.750h: slack −0.018h | 2.518h -> 0.350h |

- **The window holds** at all three: V's feet lie inside (0, L) on both arms
  under near, and V sits in the wedge.
- **The feet hold:** the margin and steep gates are 1 at every node, and
  the root gate (rootBand 0.5) is 1 too, since no foot comes within 0.5h
  of its root. Today's r equals near-alone's r at all three: F2 plays no
  part here.
- **L takes the room, through the cap gate.** The slack, L − W − the foot's
  distance from the root, is the one factor that falls, on the cut arm. W
  is 0.380h. Near's L is the behind pass's arc distance u, and S1f's
  corners end with feet at 2.338h, 2.330h and 1.918h, beyond the cut.
  At j36, u − W is already short of V's foot, so S is 0 at V.
- The cut also ends the arm's group membership at L (the cap ramp, then
  OWN), so restoring r alone would leave the arm's own outline drawn past
  the cut. That is S1h's red wedge at site 02. Restoring the look at rest
  means restoring L itself there, not only the corner's room.

### F2 (16:46) Definition change: a uniform k on near's cut (not taken)

`dEdgeK` (WIP 46b9a823, default 1) scales near's behind cut: c = k·u. At
S1h's 18 sites against S1f's final (px differing / strongly / max px from
S1f's contour / beyond 3 px; `out/s1i/sites_k123.txt`):

| k | all 18 sites | site 02 | tee, ring coarse (L; ink) | census vs S1f |
|---|---|---|---|---|
| 1 (today) | 2323 / 1400 / 13 / 233 | 392 / 251 / 6 / 33 | 0.148, 0.174 | |
| 2 | 814 / 389 / 6 / 29 | 391 / 261 / 6 / 29 | 0.020; 0.148 and 0.020; 0.174 | arms 228 (38 L), corners 156 |
| 3 | 423 / 128 / 1 / 0 | 0 | 0.030; **0.211** and 0.030; **0.214** | arms 141 (2 L), corners 155 |

- At k 2 site 02 does not move: 2u = 2.224h is still short of S1f's L,
  2.950h. j36 needs k ≥ 2.950/1.112 = 2.65.
- k 3 restores the sites and fails goal 2: the tee's ink step is 0.2113 at
  (1.6, 1.25). Under the cap gate the corner's foot follows L 1:1 (F1), and
  its tip moves g = tan((π − θ)/4) per unit of foot, so the tip moves k·g
  per unit of the pass. The tee's 60° corner has g 0.577: k·g = 1.73 > 1,
  a tip faster than the pass, the pop S1g removed. That corner allows
  k ≤ 1.73, j36 needs 2.65: no one k does both, so k comes from the arm's
  corners (F3).

### F3 (17:04) Definition change: near's behind cut takes its slope from the arm's corners (`dEdgeTip` 1, the default)

af04cd34. Near's behind cut is c = k·u (u as S1g's F1: the pass's arc
distance behind the root), with

- k = clamp(dEdgeTip / g_max, 1, dEdgeKMax 4), g = tan((π − θ)/4);
- g_max over the arm's two cyclic-neighbour corners with θ < π. A through
  pass's own two arms (one chain, both through, equal s) are not a corner;
  an arm with no corner takes k = 4.
- `dEdgeTip: 0` is S1g's cut (c = u), bit for bit the frozen
  `form_b_s1g_q.ts` ("today" below).

**Why this k.** A round corner of radius r at θ has its feet r·cot(θ/2)
from the vertex and its tip r(1/sin(θ/2) − 1) in, so the tip moves
(1 − sin(θ/2))/cos(θ/2) = tan((π − θ)/4) per unit of foot. The foot follows
L 1:1 under the cap gate, so the tip moves k·g ≤ dEdgeTip = 1 per unit of
the pass's slide: no tip outruns the pass, S1g's bound. The tee's sweep
reads L's slopes 1.73 = cot 30° (its 60° corner) and 3.73 = cot 15° (120°),
the ring's 1.86 and 4.00 (the clamp).

**Continuous by construction.** c = 0 at u = 0 for every k, so L does not
step as a pass slides onto the root. As θ → π, g → 0 and k → 4, the
no-corner value. At an arm swap θ → 0 on both sides, so g_max → 1 from
both. The through-pass skip changes only with the topology.

**At rest, the sites** (`out/s1i/sites_tip.txt`, `sheet.png`):

- F1 sites 01, 02, 05, 16, 17, 18: 0 px from S1f's.
- 03 and 04: 2 px (5 at play size), one spot at (8.80, 7.67), about 3.3h
  below both V's: another corner's root gate, |Δink| < 0.5.
- F2 sites 06-15: today's, 24-76 px each, max 1 px from S1f's contour.
- All 18: 423 / 128 / 1 / 0 against today's 2323 / 1400 / 13 / 233; at
  play size 546 px, none beyond 3 px (today 2601, 233).

| site | r S1f | today | restored |
|---|---|---|---|
| 02 | 2.721h | 0 (empty) | 2.721h |
| 16 | 3.183h | 0.392h | 3.183h |
| 17 | 2.518h | 0.350h | 2.518h |
| 05 | 2.438h | 1.431h | 2.438h |
| 18 | 0.297h | 0.460h | 0.297h |
| 01 | 0.043h | none | 0.043h |
| 03 | 0.120h | empty | 0.120h |
| 04 | 0.125h | none | 0.125h |

The F2 sites keep today's r, S1f -> today = restored: 06 4.000h -> 0.678h
(θ 2.820), 07 4.000 -> 1.252, 08 4.000 -> 1.283, 09 4.000 -> 1.362, 10
3.993 -> 1.683, 11 4.000 -> 1.716, 12 2.000 -> 0.028, 13 2.000 -> 0.037,
14 2.000 -> 0.037, 15 1.967 -> 0.078. They are near-straight (θ 2.2-3.0),
where the tip sits r(1/sin(θ/2) − 1) in: these drops move the outline at
most 1 px.

**The room** (`out/s1i/room_restored.txt`): the cut lands past S1f's L, so
L is S1f's at all three.

| arm | u | g_max | k | k·u | L restored = S1f's |
|---|---|---|---|---|---|
| j36 arm 109 | 1.112h | 0.348 | 2.877 | 3.200h | 2.950h |
| j131 arm 397 | 2.135h | 0.397 | 2.519 | 5.378h | 3.208h |
| j99 arm 301 | 1.598h | 0.293 | 3.417 | 5.461h | 2.569h |

**Census against S1f** (`out/s1i/dedge_tip1.txt`): 175 arms' L or Lcut
differ (S1g's F1: 607), 12 of them L (the largest user_tw42 arm 14,
8.317h -> 6.100h); 155 corners differ, the root gate's set; no corner loses
fill; 192 corners as S1f's (today 190). With rootBand 0
(`dedge_tip1rb0.txt`) the same 175 arms differ and 0 corners: the 12 L
moves change no corner. The tracer copy differs from form B by 0.

**In motion** (the brief's targets in brackets):

- tee coarse: L+1 0.0173, L−1 0.0373, ink 0.1480 [0.148]; fine: L 0.0002
  and 0.0004, ink 0.
- ring coarse: L+1 0.0186, L−1 0.0400, ink 0.1737 [0.174]; fine: L 0.0002
  and 0.0017, ink 0. S1f's own: ink 1.000.
- gate699 (`gate699_tip1.txt`): r 0.0300 (e 0.395), ink 0.1270 at (0, 1),
  fine r 0, ink 0.0007: to the digit today's on the same probe
  (`gate699_today.txt`; S1g's doc quotes 0.125 and 0.0006). 699 has no
  pass behind a root.
- dEdgeTip 1.15 (`dedge_tip115.txt`) changes nothing at the sites (tee
  ink 0.1480, ring 0.1736): 1 is enough and keeps S1g's bound.

### F4 (17:31): S1g's F6 gate, i1 against g1 (`run_s1i_gate.ps1 -Tag i1`)

| check | g1 | i1 |
|---|---|---|
| pins | 25/25 | 27/27 (F3's two) |
| npm test | 2576 (S1g's base) | 2756 passed, 8 skipped; tsc clean |
| b_rate (161 sites) | 0 breaches, max 2.92 | 0 breaches, max 2.92 (muse_default_tw (22.787, 2.605), mean 1.201); g41_def_tw64's two 2.01, 2.02 -> 2.08 |
| pops def | 0 | 0 |
| pops muse_drag | 6 (36 px) | 6 (36 px) |
| pops muse_flow | 11 (137 px) | 10 (132 px) |
| mech merge | 17 (173 px) | 16 (168 px) |
| q4 muse_hash, \|Δ\| > 0.5 | 11 | 7 |
| scenes #1 | 154 | 158 |
| free ends | 102 | 110 |

No worse without an attribution: every item that rises against g1 is
S1f's own, value for value, which S1g's F1 had taken away. Scenes #1 and
the free ends equal `scenes_q`'s (S1f's); the q5 holes equal
`q5holes_q`'s (muse_hash 4, muse_default_tw 5, def 4, fat 0; all eyes, 0
defects); q4's over+fade is 1 px (max 0.537, n 2449) and its unexplained
fades 218 and 639 px, as S1f's. q5's blobs, 448 (24268 px) against S1f's
451 (24304), have no g1 line to compare.

### F5 (17:31): the label pass needs no change

The app's GPU label pass (`src/render/label/`) builds on the oracle's
`FieldModel` (`src/render/field/oracle.ts`), whose spans (K883) have no
d-edge and no root gate (no `dEdge`, `rootBand` or `Lcut` there): it never
took S1g's cut, so S1i's has nothing to match. Form B's own label sketch,
`label_b.ts`, computes no span: it reads form B's `a.L` and `a.Lcut`
(line 122's breakpoints) and follows F3 as is. (`label_b_verdict.ts`'s
`dEdge` is a local distance to an edge.)

### F6 (17:31): the whole scene at rest

`s1i_whole.ts`: every device px at dpr 2 over each K868 scene's bounds +
2h, against S1f's final. Px with |Δink| > 0.02 (lost / gained: by more
than 0.5), and the largest distance from S1f's 0.5 contour (device px,
4-connected). `out/s1i/whole_da.txt`, `whole_db.txt` (with the
distances), `whole_a.txt`, `whole_b.txt` (with rootBand 0).

| scene | today | restored | restored, rootBand 0 |
|---|---|---|---|
| def | 1278 (142/194), 4 px | 353 (2/3), 0 px | 0 |
| fat | 0 | 0 | 0 |
| ring | 349 (11/19), 1 | 234 (7/16), 1 | 0 |
| user_tw42.lightpaper | 1457 (233/310), 4 | 571 (29/39), 1 | 0 |
| g41_def_tw42 | 319 (14/27), 1 | 207 (1/2), 0 | 0 |
| g41_def_tw64 | 1670 (258/387), 4 | 320 (7/8), 1 | 0 |
| muse_hash | 4571 (1325/1440), 13 | 633 (68/56), 3 | 0 |
| muse_default_tw | 2665 (495/589), 5 | 920 (48/66), 1 | 0 |
| g41_ring_tw42 | 252 (15/10), 1 | 159 (6/7), 1 | 0 |
| g41_ring_tw64 | 414 (56/66), 3 | 210 (16/18), 2 | 0 |
| g41_user_tw42 | 1457 (229/311), 4 | 573 (28/39), 1 | 0 |
| g41_user_tw64 | 1669 (318/438), 7 | 856 (63/89), 2 | 0 |
| **all** | **16101 (3096/3791), max 13 px, 405 beyond 3** | **5036 (275/343), max 3 px, 0 beyond 3** | **0** |

Restored with rootBand 0 is S1f's ink at every px of every scene. All of
restored's remaining difference is the root gate's (S1g's F2), within
3 px of S1f's outline.

### For Levi: the root gate at the F2 sites

F3 keeps rootBand 0.5. At the ten F2 sites (06-15) it shrinks
near-straight corners whose feet come within 0.5h of a root: r 4.000h ->
0.68-1.72h, 2.000h -> 0.03-0.08h. On screen that is at most 1 px at the
sites (3 px at worst over the twelve scenes, muse_hash), 275 px lost and
343 gained in all. rootBand 0 gives back every px, and gate699's r step
of 2.000 with it, which S1g's F2 removed. Keep 0.5, or open a stage for a
softer gate: sheet rows 06-15 show what is at stake.

## Handoff (17:33)

**Landed** on `worktree-agent-af4c9ecd37b7bc266` (not pushed):

- 7f3428c4 F1 WIP: the tracer (`s1i_mk_tr.mjs`), the room probe.
- 46b9a823 F2 WIP: the uniform `dEdgeK` (default 1, inert; unused once
  `dEdgeTip` > 0, so it can go).
- af04cd34 F3, the default: `dEdgeTip` 1, `dEdgeKMax` 4.
- 948886ac the pins (`form_b.test.ts`: the cut at stems of 150, 90 and
  30°; L continuous at slope k) and `s1i_whole.ts`.
- The next commit: these findings and this handoff, the whole-scene
  contour distances.

**The sites:** `.claude/probes/K1040/s1/out/s1i/sheet.png` (S1f | today |
restored; 02, 16 and 17 first), the zoom-1 triples and `index.md`.

**Commands** (from the worktree):

- pictures: `node .claude/probes/K1040/s1/s1i_mk_pair.mjs`, then
  `npx.cmd vite-node .claude/probes/K1040/s1/s1i_pair.ts`; site
  measures: `s1i_sites.ts` (env CANDS, TAG, ZOOM1, ONLY).
- the room: `node .claude/probes/K1040/s1/s1i_mk_tr.mjs`, then
  `$env:RESTORED='1'; npx.cmd vite-node .claude/probes/K1040/s1/s1i_room.ts`.
- census and sweeps: `$env:PARAMS='<json>'; $env:TAG='<tag>'; npx.cmd
  vite-node .claude/probes/K1040/s1/dedge_s1i.ts`; `gate699_s1i.ts` the
  same way.
- whole scenes: `npx.cmd vite-node .claude/probes/K1040/s1/s1i_whole.ts
  [scene,...]` (env TAG, SKIP_RB0).
- the gate: `pwsh .claude/probes/K1040/s1/run_s1i_gate.ps1 -Tag i1`, then
  `-What mech`.
- tests: `npx.cmd vitest run test/render/field/form_b.test.ts`;
  `npm.cmd test`.

**Left:**

- Levi looks at `sheet.png`: 02, 16 and 17 have S1f's round back.
- Levi decides the root gate at the F2 sites (above).
- The coordinator merges: af04cd34 changes form B's default.
- `dEdgeK`: remove it, or keep it as a probe knob.
- `s1i_angles.ts` prints its "today r" column misaligned (cosmetic).
