# K1314 stage 5: the finds left at the joins, the hard wedges, and stray-ink classes a and c in rp=outline

Ledgers: K1314 (this), K1310 (the gate), K1240 (the redesign). One Claude Opus agent in its own worktree, on
its own branch from master. Cap 2 h. Read first: `docs/design/K1240_gate.md` and the handoffs at the end of
`docs/design/K1314_s4_bends_eyes.md` and `docs/design/K1314_s2_spikes.md`.

## Why

Stage 4 joined the last 5 through bends to the next junction's corner, opened the K1045 eyes, and took the
census from 59 to 45 (`.claude/probes/K1314/out/s1/census_s4b.{txt,json}`). This stage takes the next block of
finds. It moves the gate's look line, the census total.

The finds in scope, in order (scene, kind, junction):
1. **Left at stage 4's joins:** muse_hash: the j78 hard wedge and its stray cut; stray cut at j77, j135,
   j20 and j154; broken "cut short" at j77, j20 and j154. g41_user_tw64: the j49 stray cut. Five were there
   before stage 4. At j154, the ink's inner edge at that junction's own corner is round in the outline and
   pointed in the reference. Crops: `.claude/probes/K1314/out/s4/left/`. At j78, master still draws two
   black wedges on the right edge and one at the top-left (`out/s4/after/spot_002.png`, right column).
2. **The other hard wedges:** g41_ring_tw64 x67 and x68 (crossings), and g41_user_tw64 j71.
3. **Stray class (c), rounded fans where form B is square:** g41_def_tw64 j45 and j48, and g41_user_tw64
   j39. Stage 2's note: at j39 V is "outside spans", so cSA is clamped and the fan's first ray (78°) misses
   the run's normal (84-90°). Its suggestion: start and end the fan at the arms' normals.
4. **Stray class (a), notch corners:** def j174, ring j12, g41_ring_tw42 j12, and g41_user_tw64 j28 (#1).
   These are near-straight or reflex failed corners whose fan form B leaves as a V notch. Stage 2 found no
   clean rule yet (`k1314_s2_fans.ts --all`).

Out of scope:
- the K1315 under-tail ends (the other broken_ink "cut short" finds; waiting on Levi);
- the j73 eye tip (waiting on Levi);
- classes (b) and (d);
- the known false positives (muse_hash j29, g41_user_tw64 j28 #0).

## Goal

Every in-scope find gone, by rules in the code that builds corners, pieces and fans, with no new artifact of
any kind. Work in the order above. Where form B itself is the odd one (a smear, a notch the outline draws
better), show it in the crops and say so; don't copy a form B flaw. The technique is yours. Today's look
(no `rp=outline`) stays byte-identical.

## Done

- **Census** (`k1314_run.ps1 -Lock`): the in-scope finds at 0, and no kind's count above stage 4's
  (stray_ink 25, hard_edge 4, paper 0, broken_ink 16, k1049 0, less what you clear).
- **Crops:** reference | before (master) | after, from your final commit, for each in-scope spot and every
  new find of any kind, in `.claude/probes/K1314/out/s5/`. I view them before merging.
- **The gate's per-stage checks:**
  - the desktop worker frame on def, ABBA under the perf lock: not worse than master by more than the
    run-to-run spread (`k1314_s3_bench.ps1`);
  - `npm test` green;
  - the golden snapshots unchanged;
  - `outline_port.test.ts`'s pins re-frozen only where your fix moves them, named in the commit.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never
  print a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long
  results to a file and read only the lines you need). The Read tool only right before an Edit, and for
  viewing crops. Junction `node_modules` from the main checkout; never `npm ci`. Read
  `.claude/rules/probes.md` before probing: a bare URL is today's daily. Real-time headed Chrome only;
  never `--virtual-time-budget`.
- **Your files:** `src/render/outline/outline.ts`, `fill_tri.ts` outside its record code, tests, and your
  tools and outputs under `.claude/probes/K1314/`. The K1247 stage 23 agent works at the same time in
  `band_rec.ts`, `draw.ts`, `band_gpu.ts`, the record code (`chain_frame.ts`, `rec_glsl.ts`, `fill_tri.ts`'s
  `fillStructure`/`recStrip`/`stripNb`, `outline_app.ts`, `outline_model.ts`, `outline_worker.ts`) and
  `src/app/frame_loop.ts`. Stay out of those. It may add hooks behind `ob` in `outline.ts` (`OB_DI`), so keep
  your edits off them. If your fix needs the band or the record code to follow, say so in the report and
  don't edit it.
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
- each rule and where it lives (file and function);
- the worker frame on def, before and after;
- the crop paths;
- what is left;
- your last SHA.

End with `Ledger items` and K1314's handle fields.

## Handoff (2026-11-11 18:23, paused by Levi; stage NOT done)

Done: no `src/` change (outline.ts equals 6a9e7415). One probe-only change to the census reference,
committed in 6b010f54:
- `filletHere` (k1314_census.ts): the fillet yields to form B inside another junction's ok corner's wedge
  (`inWedge`).
- Why: form_b_fillet draws a thru bend's circle with no end. muse_hash j78's (r 3.1 h) ran across j77, and
  j20 and j154 behave the same way, so a translucent band crossed the next junction's thread and the
  census counted that against the outline. The s4 crops in the main checkout's `out/s4/left/` (spot_004,
  spot_008, spot_010) show the smear.
- `--noyield` restores the old reference. k1314_crops.ts uses the same rule, and `k1314_s5_ref.ts` samples
  plain B | fillet | hybrid | outline along a segment.

Diagnosed, not fixed (`out/s5/before/` holds the 19 master crops, and `out/s5/spots.txt` holds the spot
list, in the worktree, untracked):
- muse_hash j135 is a real outline fault. Arc piece 1621 (corner 409, thru bend, r 1.2856,
  q (4.079,25.592)) has points 0-5 all at the s4 join X (4.7593,24.5019), with feet dirs -8..-58 (the
  thruJoinFan). Point 6 is at (4.5630,24.4016), dir -68, so the band skips dir about -61. That leaves ink
  0 at (4.76-4.81, 24.25-24.33), where both references ink 1.0, and tails 1988 and 1989 have alpha 0
  there.
  - Next: in piecesPhaseC's arc branch (outline.ts ~7545-7575, thruJoinFan ~7336), make the first arc
    point after the fan start at the fan's last ray. Check with
    `k1314_s5_ref.ts muse_hash '4.62,24.46' '4.90,24.18' --n=15` (the outline should ink to about 4.81).
- Class (c) at def j45/j48 and user j39 is form B's flaw: square band ends plus a gray smear wedge. The
  outline draws a crisp round join (`out/s5/dbg/c_old`).
  - Tried and reverted: fanning from the arm normals. It left a white hairline seam at j39 and kept the
    mid-fan bulge.
- Class (a) at def j174, ring j12, ring_tw42 j12 and user j28 #1 is form B's V notch, which the outline
  fills (`out/s5/dbg/z/`). Outline side-notes:
  - gray run-end fades inside the black near the corners;
  - a pink sliver outside the black at ring j12;
  - a green sliver at j28.
- Not analysed:
  - j49, a hairpin cap: a narrower, pointed hole, and a white seam at the upper-left;
  - j154's inner edge;
  - the j78 black wedges, from failed corners 235/236 ("V outside spans") and tails 1878/1879;
  - group 2 (j71, x67, x68), which are fill:strip ownership edges in fill_tri.ts.

In flight: the s5ref census (master's outline under the new reference) was stopped part-way. Its
`out/s1/census_s5ref_1/_2.json` files are partial, so don't use them. The perf lock was released.

Next step:
1. Rerun `k1314_run.ps1 -Tag s5ref -Lock` and diff it against s4b with `k1314_ll_diff.ps1 -Near`. That
   confirms which group 1 finds the reference yield clears, so the before counts become s4b re-taken
   under the new reference.
2. Then fix j135, and continue the brief's order.
