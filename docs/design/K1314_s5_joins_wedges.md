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
