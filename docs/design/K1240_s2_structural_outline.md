# K1240 S2: the outline from the scene's own structure

Ledger: K1240. Claude sent this run: one Muse run, started through Paseo from this committed brief,
which is the authority. Work only in `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\muse-k1240-s1`
(reused, detached at this brief's commit, `node_modules` junctioned; never `npm ci`). Ports 5980-5989.
Cap 2 h.

## Why S2

S1 (`docs/design/K1240_s1_outline_proto.md`, its Handoff) split every one of def's 75,889 border
segments wherever any other crossed it, traced 1,994 faces, and guessed each face's owner from a
sample point. That re-derives the structure every build, which Levi's binding rule forbids (the
structure is defined once; only positions follow the frame). S1's failures come from that route:
- 0.24-2.6 s per build;
- holes between threads filled with a neighbour's colour (main checkout:
  `.claude/probes/K1240/s1_out/page_def_top.png`);
- exposed borders missing (def: chain 41 beside j107, 58 px from any of ours) and our borders 8-9 px
  off form B's beside j184, j9 and j135.

What held: plain borders lie on form B's (median 0.000 px), and the border look draws in under 0.1 ms.

## Goal

Rewrite `outline.ts`'s core so that every cut comes from a feature the scene names. Keep the table
format, so `draw.ts`, the page and the checks still work. No global split, no face tracing, no
sampled owners.
- **Borders:** each chain's two offsets at h. Where an offset folds back at a tight bend, cut its
  swallowtail at the self-intersection, searched inside that bend only.
- **Crossings:** for each crossing in the scene, intersect the under's two borders with the over's
  two borders near it, starting from the crossing's s on each chain. The under's borders and its
  strip end on the over's borders; the over's run on.
- **Eyes:** where two crossings of the same pair, or a kink's self-crossing, leave the tubes
  overlapping between them, the top changes at the depth tie, a closed-form point from the diagram's
  depth. Cut there, and crop how it looks.
- **Junctions:** arms in angular order. Each neighbouring pair's facing borders meet at a corner,
  where the arc of form B's radius rule (`docs/design/K1040_junction_field.md` F2) is spliced in
  tangent to both. The junction is one polygon.
- **Dead ends:** round caps.
- **Regions:** each piece of a chain's strip between its cuts, and each junction polygon. A region's
  owner is the chain or junction it came from.
- **Features that reach each other** (a crossing inside a junction's reach, a corner arc near
  another thread): apply the same rules in order along the border. Count and crop those spots.

Read first: S1's brief and Handoff, S1's `outline.ts` (its table format), K1040 F2-F3,
`src/render/field/scene.ts`, and `.claude/rules/probes.md` and `render.md` (Muse does not load them).

## Done

1. **The builder** as above, still with zero imports. Synthetic tests: a straight tube, an X
   crossing, a closed eye, T and Y junctions, a fold and a dead end.
2. **Exact** on the 12 scenes, both ways, outside F3's fade widths, in device px at dpr 2: p99 at
   most 1/8 px, max at most 1/2 px.
   - Fix the check first. It drops every sample where form B gives no distance (Dexp = infinity:
     23,817 of def's 56,060 ours-to-B samples; `form_b.ts` `inkOf` leaves Dexp infinite unless a
     weight there reaches 0.5). Find out what those samples are, and measure them.
   - Report measured and dropped counts per direction. Crop and name every spot over target.
3. **The page's tests from S1, passing:** fill owner, overlap ownership from the cuts, border band,
   fill edge on the stroke centre.
4. **Cheap:** builder median and p95 per scene on the desktop, under the lock. Target: def's median
   at most 3 ms. Draw GPU time at dpr 2.
5. **Sheets Levi can read**, at zoom 4, in `out/s2/sheets/`: no test text over the picture, and
   strokes that stand out from the background. def's junctions, its closed eyes, and S1's spots
   (j184, j9, j135, j107), each beside form B's border look (`&fbb=1`) and today's look. Name the two
   to show Levi first.
6. **A Handoff** appended to this brief: the numbers, what failed, and the commands.

## How to work

- Commit finished, tested parts and push them to master yourself: `git fetch`, rebase on
  origin/master, `npm test` green, then push `HEAD:master`.
- Stage files by name. Never force-push, skip hooks, or add anything under `out/`. Outputs go to
  `.claude/probes/K1240/out/s2/`.
- Never rewrite `outline.ts` through PowerShell text IO (S1's 101 MB accident). Write it through Node
  or the editor.
- Browser and timing jobs: under the perf lock (`$env:TEMP\claude-perf.lock`, owner `K1240-S2`),
  waiting inside one blocking command. At most two headed, real-time browsers. Kill every browser,
  dev server and runner of yours, and release the lock, before you stop.
- Ledger follow-ups go through `node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs add --repo . ...`.
  Leave K1240's handle alone; Claude keeps it.
- No subagents.
- Stop when Done holds or at 2 h, whichever comes first. Run `Get-Date` at the start and at each
  milestone. When you stop, commit your WIP, append the Handoff, push, and report.

## Handoff (S2, Muse session 01a1b389, 2026-11-06 17:04-19:04 PT)

**Verdict: S2 does not hold.** The structural rewrite is in and is far closer than S1 (def ours-to-B p99 3.334 px in S1 is now 0.000 px; B-to-ours def p99 32.8 px is now 0.122 px), but the max, most scenes' border-band page counts, muse_hash, and the 3 ms target still fail. The perf target missed by two orders of magnitude: def median 396 ms (target at most 3 ms). Nothing here should ship as the junction renderer yet; it is a much better prototype and a check that now measures what it says.

### What was built

`proto/outline.ts` was rewritten (zero imports; the synthetic guard still passes). Every cut now comes from a named feature: per-chain offsets with fold cuts searched only inside curvature bends (`radius < h` on the concave side); per-crossing under/over border intersections searched from the crossing's `s` windows on both chains (the over is also stationed at the under's sides, so strips tile at the lens instead of overlapping); consecutive crossing pairs of one pair searched for facing-border intersections between them, with a closed-form depth tie (hats are linear in the matched fraction between the two crossings) cut on the facing borders where they do not meet; junction corners solved as form B solves them (tracked ball along V's medial branch; `r` is the integral of the margin/steep/cap/root gates over 32 growth steps, using form B's quadratic reach and `dEdgeTip` behind-root span rule, so arm spans match form B's); regions are strip pieces between stations plus one polygon per junction (arms with no solved corner bound it at their root border points); round caps. Segment burial is piece-level (one local minimum per chain within `sigma = pi*h`, classified by its nearest foot, by diagram depth and by the cap-ramp member group), applied in order along each border — this is also the rule that handles features that reach each other. def counts: chains 92, eyes 41 with 4,750 eye border cuts, kink self-crossings 72, crossings in a junction span 0, corner arcs near another thread 51 (counted; their arcs are not themselves cut — see Open work).

### The check fix (Done 2)

S1 dropped samples where `Dexp = infinity` (def 25,802 of 61,719 ours-to-B samples are now measured, 0 dropped here). They are, in the main, points exactly on an outline: a point on its own border is not covering (`d = h`, not `< h`), so `evalPoint`'s label top is another surface (or paper) whose `Dexp` stays infinite even though the point's own foot term inks at `D = 0`. def categories: `foot:own:topPaper` 21,326; topGroup foot/V/arc own-term samples about 3,900; the rest other-term or no-term. They are measured by the least `|Dexp|` of any surface whose ink still shows (per-surface `inkOf` after higher-key coverage), also taking form B's winning term (its tangent-point `Dexp` misses its own endpoint disc when coverage there is a hair under 1/2): 25,570 of def's 25,575 inf samples measure by term, 5 by nearest direction-B candidate, 0 dropped in any scene. Direction B is filtered the same way (a candidate merely within 1 px of an outline is a buried point near its covering outline, not an outline sample — those go to `buried`). Measured/dropped per direction for all 12 scenes is in `out/exact_summary.md` (and `out/exact_<scene>.json` worst lists):

| scene | A p99 | A max | A over 1/8 | B p99 | B max | B over 1/8 |
|---|---|---|---|---|---|---|
| muse_hash | 3.034 | 25.10 | 1279/52263 | 0.123 | 9.48 | 589/59523 |
| muse_default_tw | 0.000 | 3.74 | 12/59496 | 0.158 | 4.13 | 948/71999 |
| def | 0.000 | 10.02 | 25/61719 | 0.122 | 4.38 | 740/75253 |
| fat | 0.000 | 0.07 | 0/45981 | 0.044 | 1.87 | 160/55212 |
| ring | 0.000 | 19.41 | 105/18165 | 0.113 | 1.81 | 113/14271 |
| user_tw42.lightpaper | 0.000 | 2.53 | 15/35308 | 0.109 | 5.31 | 274/33990 |
| g41_def_tw42 | 0.000 | 18.90 | 9/64242 | 0.129 | 3.53 | 821/79943 |
| g41_def_tw64 | 0.000 | 24.95 | 167/58695 | 0.114 | 4.21 | 626/70265 |
| g41_ring_tw42 | 0.000 | 2.30 | 4/19670 | 0.110 | 0.62 | 125/15638 |
| g41_ring_tw64 | 0.000 | 27.84 | 105/17594 | 0.116 | 1.61 | 122/13787 |
| g41_user_tw42 | 0.000 | 2.53 | 15/35285 | 0.108 | 5.31 | 273/33990 |
| g41_user_tw64 | 0.097 | 27.13 | 285/30081 | 0.100 | 2.62 | 229/29153 |

Named spots over target (worst per scene; full lists are the `worst` arrays in the JSONs): A — muse_hash j83 (run ch75, 25.1 px), j36 and j58; def j34 (run ch8, 10.0); ring j10 (cap ch12, 19.4); g41_def_tw42 j15 (run ch2, 18.9); g41_def_tw64 j34 (25.0) and j161 (15.5, both runs kept inside a junction where form B solves no corner for that arm); g41_ring_tw64 j24 (27.8); g41_user_tw64 j33 (27.1), j71, j27. B — muse_hash j156/j155 (junction cluster: side points 9.5/8.5 px); muse_default_tw j130; def j3/j151 (`mid k0` points at a chain's first segment inside its junction, 4.4/4.3); fat has no junction spot above 1.9 px. These A spots cluster at junctions where one arm's span is 0 in form B, and in clusters of two junctions joined by one short chain.

### Page tests (Done 3)

Not passing. Counts (all scenes in `out/page_results.json`; border misses now recorded in `tests.borderBand.misses`):

| scene | fill | overlap | band in | band out | fill edge | draw fill ms |
|---|---|---|---|---|---|---|
| muse_hash | 1384/1429 | 350/350 | 20107/20612 | 16876/20612 | 18354/20612 | 5.9 |
| muse_default_tw | 1459/1472 | 350/350 | 21076/21720 | 18994/21720 | 18865/21720 | 5.9 |
| def | 1517/1531 | 353/353 | 21933/22677 | 19838/22677 | 19572/22677 | 6.3 |
| fat | 1289/1293 | 428/428 | 16528/16783 | 14525/16783 | 15323/16783 | 5.3 |
| ring | 323/324 | 86/87 | 4393/4511 | 3957/4511 | 4025/4511 | 1.6 |
| user_tw42.lightpaper | 657/659 | 156/156 | 9870/10160 | 8982/10160 | 8838/10160 | 2.7 |
| g41_def_tw42 | 1528/1529 | 353/353 | 22704/23491 | 20857/23491 | 20167/23491 | 6.3 |
| g41_def_tw64 | 1496/1517 | 353/353 | 21265/21950 | 18718/21950 | 19085/21950 | 5.7 |
| g41_ring_tw42 | 326/326 | 87/87 | 4606/4707 | 4215/4707 | 4147/4707 | 1.2 |
| g41_ring_tw64 | 319/322 | 87/87 | 4347/4456 | 3875/4456 | 3969/4456 | 1.1 |
| g41_user_tw42 | 657/659 | 156/156 | 9877/10163 | 8982/10163 | 8837/10163 | 2.7 |
| g41_user_tw64 | 641/651 | 156/156 | 9233/9518 | 8056/9518 | 8324/9518 | 2.6 |

Overlap now passes 11 of 12 scenes (ring 86/87). Fill passes g41_ring_tw42 only; the rest sit near 99% — interval ends and junction-centre samples lost to a face that covers the same centreline point. Band-in is 96-98%, band-out 82-88%, fill-edge 86-88%: the outside misses concentrate on the first long chains in every scene (chain 0/1 runs where another thread's band sits within 1.6 device px outside the outline). These did not pass in this run and should be treated as open, not as noise. GPU draw at dpr 2 on the desktop is the draw-fill column (border 0.0 ms everywhere in the page's timing). Page noise: one `Failed to load resource: 404` console line per run (favicon), no page errors.

### Cheap (Done 4)

Builder median/p95 under the lock (`proto/bench.ts`, `out/bench.json`): def median 396 ms, p95 500 ms, pieces 3053 — the 3 ms target is missed by about 130x. Others: fat 2945/3205 ms (its eye and self-crossing work scales with 260 self-crossings and 34,836 eye border cuts), muse_hash 483/715, muse_default_tw 427/562, g41_def_tw64 411/499, g41_def_tw42 315/405, g41_user_tw64 185/289, user 118/185, ring 97/126, g41_ring_tw64 97/169, g41_ring_tw42 74/99 ms. Most time is in corner solves (32-step tracked growth with margin fits), piece-level covering over every border segment, and eye intersection searches.

### Sheets (Done 5)

In `out/s2/sheets/` (untracked output): nine combined panels at zoom 4, produced by `proto/s2_sheets.ts` (each file is [S2 outline | form B ink | S2 fill + outline]; form B's dark paper is recoloured white and labels live in `index.md`, never over the picture): junctions j184, j9, j135, j107, j152, j34 and three closed-eye spots (`eye1..eye3`). **Show Levi first: `j184_ours-formb-fill.png` (a clean junction where the three panels agree) and `eye1_ours-formb-fill.png` (the kink loop at left, where S2's loop reads wider than form B's).** The app's `&fbb=1` look and today's app look are *not* in these files: per-spot app crops at a matched world position could not be reproduced inside the session (the app's camera for the def link is not the frozen scene camera, so an app screenshot cannot be cropped to the same junction at zoom 4 without guessing). That part of Done 5 is unmet and is listed as open work, not disguised as a substitute.

### Commands

- `node scripts/run_node.mjs .claude/probes/K1240/proto/outline.test.ts` — ALL PASS (S1's synthetic straight/X/T, plus new closed-eye, Y-junction, fold and dead-end tests).
- Exact: `& .claude/probes/K1240/proto/run_locked.ps1 -Script check_exact.ts` (all 12).
- Page: `& .claude/probes/K1240/proto/run_locked.ps1 -ScriptName run_page.mjs` (all 12, headed).
- Bench: `& .claude/probes/K1240/proto/run_locked.ps1` (bench.ts, all 12).
- Sheets: `& .claude/probes/K1240/proto/run_locked.ps1 -Script s2_sheets.ts`.
- `npm test` — see the landing commit's verification note.

### Open work

1. The `L = 0` junction arms and junction clusters (muse_hash j155/j156, def j34, g41_user_tw64 j33/j71/j27): borders kept inside a junction that form B ends at a cap.
2. Performance: a structural builder hitting even 30 ms on def needs its corner integral and covering work cut down — 3 ms is not a tuning step away.
3. Per-spot app sheets beside `&fbb=1` and today's look need the app to expose a stable world-point camera for a frozen link.
4. Border-band outside misses on close parallel threads (every scene's chain 0/1 runs) need a decision: is a point 1.6 px outside an outline but inside a neighbour's band a miss, or is the test's outside direction wrong there?
5. Eye depth-tie cuts were taken as border intersections; no scene produced a tie-only cut (def tie cuts 0), so the closed-form tie path is exercised only by construction.
