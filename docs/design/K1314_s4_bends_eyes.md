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
