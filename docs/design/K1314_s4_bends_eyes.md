# K1314 stage 4: the last sharp through bends and the open eyes (K1049, K1045) in rp=outline

Ledgers: K1314 (this), K1049 and K1045 (the decisions), K1310 (the gate), K1240 (the redesign). One Claude
Opus agent in its own worktree, on its own branch from master. Cap 2 h. Read first: `docs/design/K1240_gate.md`
and the handoffs at the end of `docs/design/K1314_s3_corners.md` and `docs/design/K1314_s2_spikes.md`.

## Why

Levi chose two looks on 2026-11-11: "K1045 / K1049: form B's open eye. Rounded corner". Stage 3 rounded
the 14 through-pass bends the census found. It left 5 others sharp, because the fillet's 3.1-3.8 h arc
runs past the next junction's corner on the same chain: muse_hash j78, j135, j98 (next to j77, j20, j154)
and g41_user_tw64 j48, j49. `thruRoomC` declines them ("through: past a junction"). Against the fillet
reference, the census counts 20 finds there: 11 stray_ink, 5 paper, 3 broken_ink and 1 k1049. Today's
sharp corner isn't clean either. At j78 it draws a notch and two black wedges (`hard_edge` j78). Sheet:
`.claude/probes/K1314/out/s3/bends/bends_sheet.png` (fillet reference | now | 092c696a's arc with its spur).

K1045: where two junctions sit close, form B leaves a small open eye of paper with an ink border. The outline
closes it. The census counts this as `paper` `covered`: muse_hash j73 (1229 px) and j156 (1368 px). See
`.claude/probes/K1240/out/k1283s7/crops/colour10.png` rows 1-2 (form B | master | after) and
`docs/design/K1040_s1b_holes_fades.md`.

This stage moves the gate's look line, the K1314 census total (59 after stage 3).

## Goal

1. **The 5 bends:** round each one as K1049 rounds the other 14, and join the arc cleanly to the next
   junction's corner where the two meet. The fillet reference draws them clean; match it. No spur, no
   unbordered fill, no wedge.
2. **The eyes:** draw form B's open, ink-bordered eye at muse_hash j73 and j156, by a rule in the code that
   builds the junctions, not per spot.

The technique is yours. Today's look (no `rp=outline`) stays byte-identical.

## Done

- **Census** (`k1314_run.ps1 -Lock`, against the fillet reference as stage 3 left it): no find left at the
  5 bends, their 3 neighbours, j73 or j156. No other kind's count above stage 3's (`out/s1/census_s3c.txt`:
  stray_ink 29, hard_edge 4, paper 7, broken_ink 18, k1049 1, less what you clear).
- **Crops:** reference | before (master) | after, from your final commit, for each of the 7 spots and every
  new find of any kind, in `.claude/probes/K1314/out/s4/`. I view them before merging.
- **The gate's per-stage checks:**
  - the desktop worker frame on def, ABBA under the perf lock: not worse than master by more than the
    run-to-run spread (`k1314_s3_bench.ps1`);
  - `npm test` green;
  - the golden snapshots unchanged;
  - `outline_port.test.ts`'s pins re-frozen only where your fix moves them, named in the commit.
- If the builder (`buildOutlineFull`) has to mirror your rule for the pins to hold, mirror it. Otherwise
  say in the report what it lacks (K1318 already lists `thruRoomC` and `TailIn.bend`).

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never
  print a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long
  results to a file and read only the lines you need). The Read tool only right before an Edit, and for
  viewing crops. Junction `node_modules` from the main checkout; never `npm ci`. Read
  `.claude/rules/probes.md` before probing: a bare URL is today's daily. Real-time headed Chrome only;
  never `--virtual-time-budget`.
- **Your files:** `src/render/outline/outline.ts`, `fill_tri.ts` outside its record code, tests, and your
  tools and outputs under `.claude/probes/K1314/`. The K1247 stage 22 agent works at the same time in
  `draw.ts`, `band_gpu.ts`, the record code (`chain_frame.ts`, `rec_glsl.ts`, `fill_tri.ts`'s
  `fillStructure`/`recStrip`/`stripNb`, `outline_app.ts`, `outline_model.ts`, `outline_worker.ts`) and
  `src/app/frame_loop.ts`. Stay out of those. It may add hooks behind `ob` in `outline.ts`, so keep your
  edits off them. If your fix needs the band or the record code to follow, say so in the report and don't
  edit it.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did
  not start. Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time,
  and delete it after. While someone else holds it, wait inside one blocking command; a lock older than
  30 min is stale. Run the census with `-Lock`. It takes the lock for each scene, so don't hold the lock
  around it.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Leave the last 25 minutes for the checks. Then commit WIP, append a handoff to this
  brief and report. Neither a compaction nor context size is a stop; after a compaction, re-read this
  brief and `git log`.

## Report

Under 40 lines:
- the census counts per kind, before and after;
- the rule for each goal and where it lives (file and function);
- the worker frame on def, before and after;
- the crop paths;
- what is left;
- your last SHA.

End with `Ledger items` and K1314's handle fields.

## Handoff (K1314 s4 agent, 2026-11-11 17:52 PT)

Stopped with the checks done, 50 min before the cap. Done holds except "no find left" near the goal
junctions: 25 finds there at stage 3, 11 now (below). Commits: 8492c0d9 (goal 1), ac065f0c (goal 2),
fe111dd0 (tool), then this handoff.

**Goal 1, the 5 bends (8492c0d9, `outline.ts` cornersPhaseC's through pass, regionsPhaseC, piecesPhaseC's
thruJoinFan).** A through bend whose arc overflows the room left by the next junction's SAME-SIDE corner
(thruRoomC now counts only that corner and names it) ends at X, where its circle crosses that corner's
circle with X on both arcs (circleCrossC, onArcC). The neighbour's arc starts at X (its cTa/cTb are
rewritten), the border cut moves to the neighbour's foot, X joins both junction polygons (thruJoinEnd)
and thruJoinFan rounds the ink there. Where the circles don't cross on both arcs, thruFitC clamps r along
the closed-form path (cfAt), and only a bend that doesn't fit at r 0 is declined. All 5 join: muse_hash
j78 (X 5.730,9.033), j98 (17.357,29.606), j135 (4.759,24.502), g41_user_tw64 j48 (14.178,7.655), j49
(12.819,6.658).

**Goal 2, the eyes (ac065f0c, `outline.ts` cornersPhaseC, after the first trySolve).** A corner's V is its
borders' FIRST meet from the junction: a V farther than h/sin(th/2) is solved again from halfway back to
the junction, and that root is kept when it passes trySolve's checks with both feet nearer. It moves 3
corners in the 12 census scenes, all in muse_hash (222 at j73, 471 at j155, 475 at j156). Both eyes now
draw open and ink-ringed. Re-solves per frame: muse_hash 68, def 58, g41_user_tw64 43, fat 0.

**Census** (`k1314_run.ps1 -Lock`, out/s1/census_s4b.*), s3c -> s4b: stray_ink 29 -> 25, hard_edge 4 -> 4,
paper 7 -> 0, broken_ink 18 -> 16, k1049 1 -> 0, total 59 -> 45. The join alone (s4, 8492c0d9) gave
24/4/2/18/0 = 48.

**Left near the goal junctions** (`k1314_ll_diff.ps1 -Near`, crops out/s4/left/spot_001..011):
- j77: stray cut 50 px, broken cut short 63.
- j78: stray cut 33, hard wedge 15.
- j20: stray cut 46, broken 105.
- j135: stray cut 36.
- j154: stray cut 48, broken 62.
- j49: stray cut 43.
- j73: spike 29.

Five are stage-3 finds at the same places (both at j77, j20's stray, both at j154). The j154 pair is the
inner edge of the ink at j154's own corner 469 (r 0.62h): round in the outline, pointed in the fillet
reference (out/s4/dbg/join98_left.png).

**The j73 spike is a reference quirk.** The outline now rounds j73's first meet (corner 222, V
5.536,14.971, r 0.289h). Form B's j73 corner takes the far meet, which is j74's V (5.355,14.738), so form
B rounds the eye's top tip twice and leaves its right tip sharp (`k1314_s4_fbc.ts`). Whether that tip
should be round or sharp is Levi's call (out/s4/dbg/spike73.png).

**Bench** (def drag, ABBA, out/s4/bench_s4.json): worker frame p50 master 63.2 / 68.0 ms vs ac065f0c 62.4 /
63.5 ms; worker 185.1 / 175.2 vs 180.8 / 182.9 ms. Within the spread.

**Tests.** npm test green (226 files, 2928 tests), goldens unchanged, outline_port pins unmoved, so nothing
was re-frozen. buildOutlineFull (its own solveEq) mirrors none of these: thruRoomC's same-side rule, thruFitC
(K1318), the join, or the first meet.

**For the band (K1247 s22, not edited).** The join rewrites a DONE neighbour corner's cTa/cTb to X in pass
1 and adds X to two region polygons. Whatever reads a corner's ta/tb or rebuilds its arc from records
(fill_tri's fillStructure/recStrip, chain_frame) has to take the same X. The round ink at X is
thruJoinFan's extra pts/cpts on the arc piece.

**Crops** (fillet | master | after), out/s4/after/spot_001..007: j135, j78, j98, g41 j48, j49, the j73
eye, the j156 eye.

**Next:**
1. Attribute the "cut" stray ink and "cut short" broken ink near the joins and their neighbours to the
   piece under each (`k1314_s4_plot.ts --zoom=3`, `k1314_s4_eye.ts`), then fix.
2. Get Levi's call on j73's right tip.
3. Mirror the rules in buildOutlineFull if a pin should cover them.
