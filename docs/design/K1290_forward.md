# K1290: border vertices placed forward from the centreline (an experiment)

Ledgers: K1290 (this), K1281 (the outline's jumps), K1288 (the fold flip), K1247 (the frame's speed),
K1240 (the redesign). One Claude Opus agent in its own worktree, on its own branch from master. Cap 2 h.

## Why

Stages 9-17 removed the outline's jumps one place at a time (def 33 -> 15, muse_hash 34 -> 17), and what
is left is one kind of jump: a border vertex placed at a NEAREST point (a corner's foot, an end arm's
extension foot, `addPointAtC`'s branch pick on a fold). A nearest point jumps across a concave bisector,
so every vertex placed on one inherits the jump. Form B's distance stays continuous there even though its
foot doesn't, which is why form B doesn't flicker. Making the foot continuous moves the look at rest at
exactly those spots (stage 17: `K16_CB=arc` takes def to 3 places, census vs form B +212, 3 crossings
over 12 px). The nearest-point searches are also much of `frame()`'s cost (corners were 7.3 of 13 ms
at S3d), and the frame is still about 21 ms against ≤3 median / ≤6 p95.

## The question

Can every border vertex be placed FORWARD instead: a station keeps its s from the structure, its position
is centre(s) ± h·n(s) with a normal continuous across centreline vertices, and the corners, cuts and caps
are closed-form intersections of those forward borders, with the structure choosing which ones? On a
concave side the forward borders overlap rather than being trimmed; the triangle fill's depth key and
draw order, which come from the diagram, may already handle that. If the look holds, the jump class is gone
by construction, the searches go, and the per-vertex work is the kind a vertex shader does.

Levi's rule binds: the structure is decided once, and only positions follow the frame. The technique is
yours, including where the forward placement stops and the existing code takes over.

## Done

An answer with evidence; I judge it from these:
- **Jumps:** `k1247s15_gain.ts` on def, fat and muse_hash against master's default.
- **Look at rest against form B:** `k1279_census.ts` total and worst crossings, the triangle fill on your
  table (`k1277_census.ts rest`), and crop rows form B | master | yours at the 3 worst crossings and at
  the corner-foot spots (def j91, j45, j54, j73, j30) in `.claude/probes/K1240/out/k1290/crops/`.
- **Cost:** `frame()` on def, median and p95, against master's, under the perf lock.
- **Where it fails,** with a crop of each failure.
- **Setup:** check HEAD, then `git reset --hard <the master SHA the coordinator gives you>`. Copy
  `.claude/probes/K1240/out/` (with `out/k1247s5/ref_*`) and `.claude/probes/K868/scenes/` from the main
  checkout if missing. `k1279_bars.ps1 -SkipMaster` leaves its s14 census empty; run
  `k1247s14_census.ts` directly.

## Rules

- PowerShell. Read code through the shell; the Read tool only right before an Edit. Junction
  `node_modules` from the main checkout; never `npm ci`.
- **Your files:** a new `.claude/probes/K1240/proto/outline_fwd.ts` (start from a copy of `outline.ts` if
  you like) and your `k1290_*` tools; point the check tools at your table through a flag of your own.
  `outline.ts`, `fill_tri.ts`, `paint.ts`, `draw.ts` and `src/` are read only: K1240 S4's agent is
  porting them into the app in parallel.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time,
  delete it after; while someone else holds it, wait inside one blocking command; older than 30 min is
  stale. While anyone else holds it, run one scoring process at a time, at Idle priority.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Then commit WIP, append a handoff to this brief and report. Neither a compaction nor
  context size is a stop; after a compaction, re-read this brief and `git log`.

## Report

The placement rule you used and where it stops; the four answers above with the crops' paths; your
recommendation (adopt, adopt in part, or drop) and why; your last SHA. End with `Ledger items` and
K1290's handle fields.

## Handoff (K1290 agent a78fafb07699a0d0b, 2026-11-10, stopped at 16:12 with the four answers in)

Branch `worktree-agent-a78fafb07699a0d0b`. Tools: `.claude/probes/K1240/proto/outline_fwd.ts` (the forward copy;
its `K1290_*` env flags are listed at `const FWD_ON`), `k1290_vite.config.mjs` (it points `./outline` at
`outline_fwd.ts`, so every check tool runs on the forward table through
`node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1290_vite.config.mjs <tool>`), `k1290_time.ts`,
`k1290_fastcheck.ts`, `k1290_crops.ts`, `k1290_corner.ts` and `k1290_censusdiff.mjs` (each header gives its usage).
Outputs (not committed) are in `.claude/probes/K1240/out/k1290/`: `gain/`, `census/`, `crops/` and `time_*.txt`.

### The rule, and where it stops

Forward placement covers the **corner-arc ends only**: the TA and TB that `cornersPhaseC` inserts for each
corner arc. growCFC's centre Q and radius r are unchanged.
- **s:** a root of f(s) = n(s) x (Q - c(s)), meaning Q lies on the border's normal line at s. The normal
  is each segment's normal. At a concave vertex it turns linearly over a window
  w = min(1.5 |Q - v| tan(|a|/2), L-/2, L+/2), so it is continuous there. At a convex vertex it jumps, and a
  root inside the jump is a fan root at that vertex.
- **Which root:** among the distance minima (f changes sign the right way, g > 0), the one nearest the
  junction along the arm (`PICK=near`). The search covers +-6 segments around master's foot segment. When
  there is no root, master's foot is kept; that never happened (def: 0 of 1.2 M tries).
- **Position:** on a plain stretch, c(s) + h n. Near a concave vertex, within the miter reach h tan(|a|/2),
  the miter point. At a fan root, v + h unit(Q - v).
- **Where the end is inserted:** still master's `addPointAtC` (nearest segment). Forward placement changes
  only the inserted point's s and position. An insert chosen by s (`K1290_SC=1`) changed the vertex
  topology between frames and jumped.
- **What stays master's:** the border stations, cuts, caps, crossings, eyes, the end arms' extension feet
  and `addPointAtC`'s branch pick on folds. I did not get past the corner ends in 2 h. They are where
  the jump class lived, and even there forward placement does not remove master's search, because the
  insert still needs it.
- **Fast search (`K1290_FAST`, on by default):** on a plain stretch the root is closed-form, and in a
  window it is found by Illinois regula falsi. It matches the first version's bisection to 2e-13
  (`fastcheck_{def,muse_hash,fat}.txt`, 0 shape differences).

### The four answers

1. **Jumps** (`k1247s15_gain.ts`, master -> forward; `gain/<scene>_{m,fwd}.txt`):

   | Scene | Places | Frame pairs | Vertices | Whole-frame drawn/input max |
   |---|---|---|---|---|
   | def | 15 -> 5 | 66 -> 4 | 230 -> 31 | 10.11 -> 2.97 |
   | fat | 0 -> 0 | 0 -> 0 | 0 -> 0 | identical |
   | muse_hash | 17 -> 11 | 33 -> 14 | 141 -> 55 | 7.28 -> 4.62 |

   - **def gain:** the hold gain r=2h median rises from 1.33 to 2.38, and its max from 3.34 to 7.70.
   - **muse_hash gain:** the pull gain max falls from 27.40 to 5.88, and the hold max from 27.73 to 5.09.
   - **def places left:**
     - j156 (0.974 px, 2 pairs) and j55 (0.870 px): the concentric case, see Failures.
     - j176 twice (about 1.0 px): master has the same two; they are not corner ends.
     - j175 (0.252 px).
   - **muse_hash's new places (j1, j67, j29):** the arc end follows Q's own motion, so they are gain,
     not discontinuities. At j1 f85, Q moves 0.297 px and TA 0.529 px.
2. **Look at rest against form B:**
   - **`k1279_census.ts`:** the total rises from 27528 to 28024 (+495, +1.8%) and 46 crossings change
     (`census/k1290{m,fwd}.txt`; `k1290_censusdiff.mjs`). By scene:

     | Scene | Master | Forward |
     |---|---|---|
     | def | 1781 | 1895 |
     | ring | 443 | 522 |
     | muse_default_tw | 1523 | 1542 |
     | muse_hash | 14273 | 14267 |
     | fat | 261 | 261 |

   - **The 3 worst crossings are unchanged** (muse_hash x77 845.5, x64 410.7, x278 371): 0 px of
     difference, `crops/worst3.png`.
   - **Rises:**
     - def x81: 21.3 -> 105.9
     - g41_user_tw64 x132: 41.5 -> 122.6
     - ring x10: 48.5 -> 121.7
     - g41_user_tw64 x54: 75.6 -> 125.7
     - g41_ring_tw42 x65: 0.2 -> 37.5
   - **Largest drop:** muse_hash x301, 179.2 -> 143.3.
   - **`k1277_census.ts rest`:** "triangles no worse than master on every scene" on both tables. The B-only
     spills rise by a few px (g41_ring_tw42: 1 -> 5).
   - **Corner feet** (def j91, j45, j54, j73, j30, `crops/rest_feet.png`): forward and master look about the
     same. Counting pixels where one is off form B by 0.2 more than the other:

     | Foot | Forward worse | Forward better |
     |---|---|---|
     | j91 | 1 | 26 |
     | j45 | 88 | 0 |
     | j54 | 13 | 1 |
     | j73 | 0 | 29 |
     | j30 | 106 | 0 |

     Neither table fixes the corner-foot bites.
3. **Cost** (`frame()` on def, `k1290_time.ts`: rec_def, interleaved passes, under the perf lock):

   | Run | Master median / p95 | Forward median / p95 | Difference |
   |---|---|---|---|
   | First version | 35.60 / 47.11 ms | 40.55 / 54.02 ms | +4.95 / +6.9 ms |
   | Fast search | 28.90 / 43.12 ms | 30.67 / 45.76 ms | +1.77 / +2.64 ms (+6.1%) |
   | Repeat while the S4 agent's smoke probe ran (under load) | 31.53 / 43.05 ms | 33.60 / 47.27 ms | |

   (`time_def.txt`, `time_def_fast.txt`, `time_def_fast2.txt`.) Forward placement adds cost rather than
   saving it, because master's nearest-point search still runs to choose the insert.
4. **Where it fails:**
   - **Concentric corners (def j55, j156).** When Q sits near the centreline's centre of curvature, the
     normal lines from many s pass near Q. Near-equidistant roots appear and vanish in pairs, so any
     single-root pick switches roots. Crops: `crops/fail_motion.png` (j55 f21/f22: a wider wedge notch
     than master's, 1155 and 2096 px worse; j156 f26: 23 px worse, 73 px better) and
     `crops/fail_j55_j156.png`.
   - **The census rises.** A larger bite at a corner foot: `crops/fail_census.png` (712, 522, 574 and
     570 px where forward is worse than master).
   - **muse_hash j1 f85 and j67 f69/f70.** Q's motion amplified, with no discontinuity:
     `crops/fail_gain_muse.png` (294, 280 and 103 px worse; both tables miss form B's curve there alike).
   - **Two tries that failed (both behind flags, off by default):**
     - **A C1 window** (smoothstep turn, `K1290_SMOOTH=1`): def has 5 places and 5 pairs, and the
       whole-frame max is 6.99 against 2.97.
     - **A soft pick** (`K1290_PICK=soft`): s is the weighted mean of the minima, with weight
       |f'|/(|f'| + kappa) exp(-(d - dmin)/(tau h)), so a root enters and leaves at zero weight. On def
       this gives 7-8 places and 20-30 pairs, with new jumps at j54, j45, j91, j42 and j66. The blend is
       continuous but steep: it sweeps s across the gap between two roots. `gain/def_soft*.txt`,
       `def_nearsm.txt`.

### Recommendation: adopt in part

Adopt the forward corner-arc ends (near pick, linear window, R=6, fast search) as a fix for the jumps:
- def's jump pairs fall from 66 to 4 and muse_hash's from 33 to 14;
- the whole-frame maximum gain falls from 10.1 to 3.0 on def and from 7.3 to 4.6 on muse_hash;
- the cost is +1.8% on the census, in five corner feet, and +6% on `frame()`.

Before landing it, fix the census rises and look at the higher hold gain on def. Don't extend forward
placement to every vertex on this evidence:
- it does not remove the searches, since the insert needs master's;
- it does not change the corner-foot look;
- the concentric case defeats any root picked per frame.

### Next

- **Concentric case:** let the structure choose the root, in keeping with Levi's rule. Record the
  chosen root's branch once, in `structure()`, and continue it frame to frame by Newton from the last s.
  A frame where that branch dies falls back to master's foot.
- **The census rises** (def x81, g41_user_tw64 x132 and x54, ring x10, g41_ring_tw42 x65): find the
  corner whose forward s at rest differs from master's foot. They should agree on a plain stretch, so
  suspect a concave window or a fan root. `k1290_corner.ts <scene> <x> <y>` traces it.
- **j176:** jumps on both tables and is not a corner end; it is out of this rule's reach.
- **Process note:** earlier in the run I killed node PIDs 20972 and 27736, which I took for my own stale
  runs. If another agent lost a node process during 15:12-16:00, that may have been the cause.
