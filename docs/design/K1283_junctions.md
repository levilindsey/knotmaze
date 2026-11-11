# K1283: the outline's junction borders against form B (in `src/`)

Ledgers: K1283 (this), K1240 (the redesign), K1281 (its jumps), K1278 (its paint, run in parallel). One
Claude Opus agent in its own worktree, on its own branch from master. Cap 2 h.

## Why

The redesign is in the app behind `rp=outline` (K1240 S4/S4b, 8d56f5c0; code in `src/render/outline/`,
equal to the prototype's default path and pinned in `test/render/outline_port.test.ts`). Its crossings
now match form B (K1279), so every remaining difference sits at a junction. Two kinds:
- **Concave corners bite** where form B's corner is round: the border steps in at the corner arc's foot
  and leaves a notch. Spots: def j55, j156, j91, j45, j54, j73, j30, x81. Crops:
  `.claude/probes/K1240/out/k1290/crops/fail_j55_j156.png`, `rest_feet.png`, `fail_census.png`, and the
  app's `.claude/probes/K1240/out/s4/crops/def_j156.png`, `def_j16.png`, `muse_j150.png`.
- **End-arm round ends and tails** don't cover where form B shows them (muse_hash x47, x73, x349; K1278
  stage 1's handoff in `docs/design/K1278_paint.md`).

The 25 worst census crossings all sit at junctions (muse_hash x77, 846 px, is the worst).

## Goal

At rest, the outline's borders at junctions match form B at every spot above. Form B is the approved look:
judge spot by spot against it, not against today's outline. The technique is yours, including the corner
construction; K1290 (`docs/design/K1290_forward.md`) found that forward-placed arc ends don't remove the
bites. Levi's rule binds: the structure is decided once, and only positions follow the frame.

## Done

- **Tools on `src/`.** `k1279_census.ts`, `k1277_census.ts rest` and `k1247s15_gain.ts` read
  `src/render/outline/`, not the prototype; point them through a flag of yours, or copy them as `k1283_*`.
  Show they reproduce the prototype's numbers on today's code before you change anything.
- **Look.** Census against form B: the total, and the junction crossings before and after. Crop rows
  form B | before | after at every spot above and at the census's 10 worst, in
  `.claude/probes/K1240/out/k1283/crops/`. I view them before merging.
- **Nothing gets worse.** No crossing worse by more than 12 px, K1277's triangle-fill bars hold, the jump
  places (`k1247s15_gain.ts` on def, fat and muse_hash) are no worse than today's, and the worker frame on
  def stays within 10% (S4b's `k1240s4b_bench.mjs`, under the perf lock).
- **Tests.** `npm test` green, the golden snapshots unchanged, and `outline_port.test.ts`'s pin updated on
  purpose (the prototype is now history, not the reference).

## Rules

- PowerShell. Read code through the shell; the Read tool only right before an Edit. Junction
  `node_modules` from the main checkout; never `npm ci`.
- **Your files:** `src/render/outline/outline.ts` and `outline_model.ts`, tests under `test/`, your
  `k1283_*` tools. `paint.ts`, `fill_tri.ts`, `draw.ts` and `band_gpu.ts` belong to K1278 stage 2's agent,
  working in parallel: if you need a change there, report it rather than making it. The prototype is read
  only.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did
  not start.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time,
  delete it after. While someone else holds it, wait inside one blocking command; older than 30 min is
  stale. Never touch the phone.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Then commit WIP, append a handoff to this brief and report. Neither a compaction nor
  context size is a stop; after a compaction, re-read this brief and `git log`.

## Report

What the bite was and what fixed it; census and crop paths, before and after; the guard numbers; what's
left; your last SHA. End with `Ledger items` and K1283's handle fields.

## Handoff (K1283 agent, 2026-11-10 20:15)

**The bite.** piecesPhaseC's arc pieces (and buildOutlineFull's) put their feet (cpts) at Q, so draw.ts and
band_gpu laid the arc's ink on the paper side, r - W..r from Q, while every run's band lies on the thread
side. That left a step of W at each corner's feet (TA, TB). Fix (`2c2cb6d5`, outline.ts): an arc point's
foot is Q + (r + h) dir, so the arc's band is r..r + W, form B's. The non-frame `cornerWork` pass (frameMode
false only) still feeds Q; app frames never run it.

**Tools on src.** `.claude/probes/K1240/proto/k1283_vite.config.mjs` points the proto tools' `./outline`,
`./draw`, `./fill_tri`, `./paint` at src (run_node `--config`). On 8f7004bf src reproduces the prototype:
census p0 (proto) = s0 (src) 27528 px. New tools: `k1283_crops.ts` (form B | before | after rows),
`k1283_before_outline.ts` (outline.ts at 8f7004bf), `k1283_pins.ts` (port-test digests), `k1283_failed.ts`
(differing crossings by nearby failed corner), `k1283_spot.ts` (corners and pieces at one point).

**Census** (`out/k1279/census_k1283{p0,s0,s1}.json`, text `out/k1283/census/census_s1.txt`): total 27528 ->
17756 px (ink 26860 -> 17088, fill 668 = 668); crossings over tolerance 458 -> 325; 270 better, 0 worse.
muse_hash 14273 -> 10152, def 1781 -> 978, g41_def_tw64 4902 -> 3265, g41_user_tw64 2798 -> 1440.

**Crops** (`.claude/probes/K1240/out/k1283/crops/`, |ink - form B| px): rest_spots.png j55 5032 -> 1774,
j156 11195 -> 1650, j91 3697 -> 1217, j45 4930 -> 2155, j54 5869 -> 2612, j73 8430 -> 1488, j30 3893 -> 1619,
x81 3169 -> 1964, def j16 10723 -> 1441, def j156 10172 -> 1539, muse j150 7855 -> 1416. moved_spots.png
j55 f21/f22 4933/4927 -> 1781/1788, j156 f26/f27 11250/11242 -> 1654/1653. worst10.png x77 8176 -> 7083,
x64 3907 -> 3777, u64 x143 4484 -> 2836, x292 2579 -> 2440, the rest unchanged. fail_census.png u64 x132
3870 -> 1379, ring x10 2308 -> 1267, r42 x65 2239 -> 1301. tails.png x47 3269, x73 2507, x349 1602:
unchanged (census x47 107, x73 122, x349 3).

**Guards.** k1277 triangle bars: s1 = s0, no worse than master on every scene. Gain (`out/k1283/gain/`):
def and fat s1 = s0; muse_hash (recorded here, `out/s15/rec_muse_hash`, 233 frames) s1 = p0, 35 jump places,
411 vertices in 51 frame pairs. Bench (`k1240s4b_bench.mjs`, def mid-drag, ABBA under the perf lock,
`out/k1283/bench_abba_summary.txt`): worker p50 before 110.4 / 116.7 (mean 113.6 ms), after 112.5 / 113.9
(mean 113.2), within 10%. npm test green, golden snapshots unchanged; outline_port.test.ts re-pinned to
src's own f0 outputs (`7513ae7e`; f1 did not move because the test's rigid 0.3 rad turn leaves every corner
degenerate at f1, so it has no arc).

**What's left** (`k1283_failed.ts`, s1, crossings over 12 px): 221 of 325 sit within R of a failed corner:
"V outside spans" 153 / 6495 px (x177 187, x71 139, x303 130), "arm span 0" 59 / 3607 px (x182 294, x77 260,
x292 208, x73 122), both 9 / 1051 px (x64 411, x346 156); junctions with no failed corner 104 / 4362 px
(x134 328, x6 324, x176 197).
- Problem (2), end-arm round ends: at x73 the corner is 212 (j103, chains 45 and 81, "arm span 0"): chain
  81 is open and its end0 sits inside j103. Form B has no corner there (form_b.ts ~863 returns null on a
  0 span) and draws chain 81's round end: the disk's fill over chain 45 and its border at the tie fade. The
  outline draws a 1-point degenerate arc plus an 11-point tail (endTailPts covers u <= l1 + pi h / 2, the
  apex only, and stops where tailF's fW or depth margin falls to 0), and the fill has a straight colour
  seam between the two chains. Matching it needs (a) outline.ts: at an "arm span 0" corner whose zero arm
  is a chain end, a cap around the whole round end in place of the fallback corner and tail (draw.ts
  fades a band that is near a tie, tiedSeg in bandData), and (b) K1278's files: the disk filled in the end
  chain's colour (paint / fill_tri) and the soft burial shading. Not attempted: it changes structure and
  regions, and half of it is in K1278's files.
- Much of the rest is form B's soft burial and tie fades, which the outline draws as hard ink or dark tail
  wedges (draw.ts tieAlpha, K1278's).

**Next:** design the span-0 end cap with K1278 stage 2's agent (outline.ts emits it, paint and fill_tri
colour the disk), then the "V outside spans" class (x177, x71, x303).
