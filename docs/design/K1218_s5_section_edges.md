# K1218 S5: the section colours' edges, cross ji 33's pulse seam, and the last spots

Ledger: K1218. One Claude Opus stage agent in its own worktree, the only code agent in junction files
while it runs. Cap 2 h. Ports 5980-5989.

## Goal

Levi, 2026-11-05: "These junctions need to appear as though they are one whole fused seamless
unit." S2 (5a12c51f) took out the zigzags and slivers, S3 (e8cb5264) anti-aliased the gap edges,
and S4 (master 73be7c90) gave the gold path's edge a 2.5 px ramp where it meets an arm's colour in
a web or on a cover strip (`ROUTE_BAND_RAMP`, `junction_field.ts`, its mirror in `joinery.ts`).
S4's handoff (the end of `docs/design/K1218_s4_route_edge.md`) names what is left:

1. **Section colours' staircases**: where two sections' colours meet inside a junction, at cross ji
   155 and loop ji 113 (S4 saw them, did not look further). Make that edge as smooth as the gold
   band's edge now is, at rest and pulsing, at every junction that shows one (find the others).
2. **Cross ji 33's pulse seam** at (647,830)-(660,821) frame px, at t0, t5 and t6: along the fan's
   edge the web's pulse reads 5-8 levels above the ribbon's. Hiding the fans removes it; with no
   pulse the window is flat. Make the web's pulse meet the ribbon's there without a seam.
3. **Loop ji 123's oval edge** and **x4 ji 101's edge at the frame's left**: look, and fix any
   staircase, edge or line on or inside the junction.
4. **Cross ji 51's hairline** at (1019,1136): 4 px of background between two ribbons in every build,
   unchanged with fans, strips and the gap mask off. Find which two ribbons; fix it if the drawing
   is at fault, and name it if the threads really stand that far apart.
5. **Where a gold band leaves a cover strip**: check that S4's ramp doesn't shift the edge 1-2 px.

Not in this stage: cross ji 112's lip (MSAA on a web's near-level rim; ribbons' edges step the same
way, so it stays unless Levi asks).

Looks that stay: S2's fused gold, S3's smooth gap edges, S4's gold edge, and everything under
"Looks that stay" in `docs/design/K1218_s2_fused_junctions.md` (the pulse's split and run, no dark
wedge between lit siblings, never the whole junction lit, the gold path's round edge, no gold nub
in an off-route arm). Mode 0.

## Authority

Every technical decision is yours: the technique, the masks, coverage and fades, the section and
gold composite, the paint (and its CPU mirror, `paint_math.ts`), the pulse terms, the fan's
geometry and records, the rims. No numeric gate: the tests you keep or add pin what you built; they
don't define done. When you find a cause, fix it; don't stop to report it. Where a call above leaves
a look open, pick what reads closest to one fused unit and say what you picked. Re-freeze any pin
your change moves and name it in the commit message.

## Start

- Your worktree starts at master 73be7c90.
  `New-Item -ItemType Junction -Path node_modules -Target C:\Users\lsl\Repositories\knotmaze\node_modules`
- S4's tools are tracked in `.claude/probes/K1218/s4/` (`run_shots_s4.ps1`, `sheets_s4.mjs`,
  `near_s2.mjs`, `attr_s4.mjs`, `nomark_s4.mjs`, `lumawin_s4.mjs`; headers give usage). Copy any you
  change into `.claude/probes/K1218/s5/`. Read-only shots in the main checkout: master's (S4's
  branch) in `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1218\s4\out\b2\`, 7474d09b's in
  `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1211\out6\r7474\`.
- A staircase shows in nearest-neighbour crops at zoom 4 or more; a ribbon's own edge beside it is
  the smooth reference.

## Done

1. Per spot (cross ji 155, loop ji 113 and the other section edges you find; cross ji 33; loop ji
   123; x4 ji 101; cross ji 51; one band leaving a strip), a sheet at K1190's four pulse moments,
   zoom 4, three rows: 7474d09b, master, your branch; plus an at-rest row, master and branch. In
   `.claude/probes/K1218/s5/out/sheets/`.
2. At rest, `near_s2.mjs` master against your branch for x4, loop and cross; you viewed every
   junction it lists with a visible change.
3. You viewed every crop at full size. Iterate until no spot shows a staircase, seam, hairline, edge
   or line on or inside a junction, at rest or pulsing, or the cap comes. Name any you could not
   remove, and why.
4. `npm test` green after `git fetch -q origin` and a rebase onto `origin/master` (where only a
   pin's number conflicts, take master's side and re-freeze it to what your change gives).

## Rules

- PowerShell. Read code through the shell (Select-String, Get-Content ranges); the Read tool only
  right before an Edit, and to view crops. No helpers.
- Write only in your worktree. Output to `.claude/probes/K1218/s5/out/`; never `git add -f` a
  probe's outputs (a script may go in).
- Commit WIP on your branch at every milestone, broken or not; never push; never edit LEDGER.md.
- Shots in real time (never `--virtual-time-budget`) under the perf lock (owner `K1218-S5`; wait
  for it inside one blocking command), at most two browsers, ports 5980-5989. A dev server's stamp
  is the SHA it started from: check the served code with a mark, as S4's tools do. Stop your
  servers.
- Out of scope (name it if a crop shows it; don't fix it): the text forks (K1220), fire and
  collapse (K1210), the pulse's timing (K1224).
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and each milestone); then
  commit WIP and report. A compaction is not a stop: re-read this brief and `git log`.

## Report

Short, in plain words: what you built; per spot, what you see against the top row and master; the
sheets' paths, with the two or three to show Levi first; the pins you moved; anything out of scope
a crop showed; the rebase; your last SHA. Commit messages carry the record. End with
`Ledger items` and K1218's handle fields (owner, branch, last commit, evidence, next).

## Handoff (S5 agent, stopped 2026-11-06 03:00, inside the 2 h cap)

Landed on the branch `worktree-agent-aad78f17014e89727`: f56af96c (a web paints each arm at the
arc its ribbon gives the pixel: `sweptArc` in `junction_field.ts`, mirrored in
`ribbon/joinery.ts`; it finds, within 7 segments of the projected arc, the centreline point whose
normal passes through the pixel, the nearest root by lateral distance, and hands back to the
projection between `uJParams.x` and twice that from the centreline), a7cb287d (its pins), then
probe tools only. `npm test` green on 2723523b (217 files, 2879 tests), which sits on origin/master
ceff3b43 (fetched again at 02:50: unchanged).

Rows: 7474d09b = K1211's `out6/r7474`; master = S4's `out/b2` (stamp e8cb5264+, S4's final code);
branch = `out/b`.

**The branch is not a clean win yet.** It removes cross 33's seam and ji 115's line, and adds a
line at ji 80 and a streak at cross 155 (below). Merge after those two go, or with Levi's look at
`cross_80.png` beside `c33_seam.png`.

Spots:
1. Staircases. loop ji 113 is smooth on the branch at every t (nomark shots; on the sheet the
   marker covers its centre). cross ji 155: the branch ADDS a light streak at device x 777-789,
   y 679-682, t2-t5, not on master. Every pixel there blends chains 61 and 71 and arm B's arc jumps
   17.2 to 17.07; a second mechanism bounds its right edge, not found (the fold weight and a
   19-segment window each changed 0 px). It lies under the marker's rings (inferred).
2. cross ji 33's pulse seam: gone at t0, t5 and t6 (|gpu - nofan| <= 1-2 luma, `out/seam/c33.log`;
   `out/zoom/c33_seam.png` shows the step in 7474d09b and master, not on the branch). A softer
   crease is left at x 652-674, y 804-814, +-5-7 luma. Inferred cause: sweptArc's no-root fallback
   at the first segment. Not built: at g == 0, clamp u < 0 to 0 (l = |q|, arc = b.z).
3. loop ji 123 and x4 ji 101: no change from master. Their eye edges step pixel by pixel in every
   row: not addressed. loop 123 has a soft corner and a violet sliver along the band, x4 101 a
   violet fringe along the gold/blue edge, in every row. x4 101's junction is off frame (CSS
   -25.4, 278.4), so its sheet is cut at @60,0 and its left strip is magenta.
4. cross ji 51's hairline at (1019,1136) is ONE ribbon, chain 61, and the drawing is at fault.
   `ribbons_s5.mjs`: every pixel of 1015-1023 x 1132-1140 is nearest chain 61; the next chain (25)
   is 12-23 px outside its edge. The spur's pixels lie inside chain 61's half-width (23.4 px):
   (1017,1136) edge -2.0 px, luma 66; (1016,1136) -3.0, 101; (1015,1135) -4.1, 136; the ribbon reads
   170 there, the backdrop 27-28. `bend_s5.mjs`: chain 61 turns about 40 degrees left on screen
   over samples 532-533 (-20.6, -19.5; R 19-21 px against the 23.4 px half-width) and the apex is
   on the inside of that turn. The green and teal "ribbons" are chain 61's two runs either side of
   the junction. Inferred, not tested: the ribbon mesh's concave-side clamp (render-ribbon.md
   P3.34) leaves a notch 3-4 px deep at the inner corner. Same in every row (S4: unchanged with
   fans, strips and mask off). The fix is in `ribbon_mesh.ts`, render-wide; not attempted.
5. A band leaving a cover strip: the branch matches master within 0.03 px. Master against
   7474d09b: at loop ji 122 master's strip edge (blue 120) sits 1.0-1.2 px inside for x <= 828
   (x 780: 274.95 vs 273.78; 800: 282.03 vs 281.00; 820: 281.40 vs 280.32) and matches from x 830
   (277.21 vs 277.26), at t3-t6 and at rest; from the slopes at 828-830, master kinks about
   0.4-0.5 px inward of the ribbon edge's line and 7474d09b about 0.5 px outward. x4 ji 149: master
   1.0-1.35 px inside at x 1230-1275 (t3/t4), a 0.4 px kink at x 1274. The ramp is centred on the
   half-width in the code, so a half-ramp offset is not the cause; not attributed.

near_s2 at rest, master against branch (junctions at max 9 or more; all others <= 8):

| Stand | Changed px | Groups | Far max | Junctions (ji: max) |
|---|---|---|---|---|
| x4 | 189,374 | 74 | 7 | 65: 15, 115: 13, 59: 13, 80: 11 |
| loop | 116,449 | 56 | 9 | 47: 16, 80: 16, 57: 10, 64: 9, 106: 9 |
| cross | 129,708 | 59 | 8 | 51: 16, 115: 13, 54: 12, 80: 11, 34: 9, 65: 9 |

Viewed, every listed junction with a sheet (`seamscan_s5.mjs` gives the steps):
- ji 80 (cross and x4; the same design there): the branch ADDS a vertical line in the green ramp
  at offset (84-85, 29-35) of the 96 px window on the junction (centre about device 2052, 236):
  a 7-level step between neighbouring pixels against <= 2 on master and 7474d09b, at every t and
  at rest. A sweptArc regression, cause not found.
- ji 115 (cross and x4): the branch REMOVES a horizontal line at offset (86, 54): 5 levels in
  7474d09b and master, 2 on the branch.
- cross 54, cross 34, loop 47, loop 80, loop 57, x4 65, x4 59: no difference I can see between
  master and the branch. The gap edges that step in 7474d09b's row (cross 54, cross 80) are smooth
  on both.
- No sheet: cross 65, loop 64, loop 106.

Out of scope seen: cross 155's grey-teal web sliver against the backdrop is MSAA (cross 112's
class). K307: the junction shader's text grew, so it and its explore variant compile cold once per
player; not timed.

Pins moved (a7cb287d): `test/render/k320_slim.test.ts` JUNCTION_FRAG budget 32,884 to 34,759;
`test/render/paint_ring_lap.test.ts` ROUNDED_QUOTIENTS gained `junction_field.ts: int(rp /
uJParams2.x)`.

Sheets: `.claude/probes/K1218/s5/out/sheets/<stand>_<ji>.png` (rows: 7474d09b t3-t6, master t3-t6,
branch t3-t6, then master and branch at rest; zoom 4). Show Levi first: `out/zoom/c33_seam.png`,
`sheets/cross_80.png` (the new line: row 3 and the last cell), `sheets/cross_115.png`, then
`sheets/loop_122.png` for the band edge. Tools (headers give usage): `run_shots_s5.ps1`,
`shoot_s5.mjs`, `locked_s5.ps1`, `live_s5.mjs` and its modules (`arcs_s5`, `arcs2_s5`, `blend_s5`,
`seam_s5`, `ribbons_s5`, `bend_s5`), `nomark_s5`, `diff_s5`, `zoom_s5`, `edge_s5`, `seamscan_s5`,
`png.mjs`, `lib.mjs`, `vite.private-cache.config.ts`.

Next: (1) ji 80's line and cross 155's streak (`blend_s5.mjs` over each, as at 155: a root
switching segments, or the handover); (2) the u-clamp at g == 0 for cross 33's crease, then
reshoot; (3) item 5's attribution; (4) cross 51's inner turn in `ribbon_mesh.ts`; (5) item 3's
eye edges.
