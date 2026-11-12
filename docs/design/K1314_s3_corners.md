# K1314 stage 3: rounded corners at through-pass bends (K1049) in rp=outline

Ledgers: K1314 (this), K1049 (the decision), K1310 (the gate), K1240 (the redesign). One Claude Opus agent in
its own worktree, on its own branch from master. Cap 2 h. Read first: `docs/design/K1240_gate.md`, the
handoffs at the end of `docs/design/K1314_s1_census.md` and `docs/design/K1314_s2_spikes.md`.

## Why

Levi chose the look at junctions where a thread passes through and bends (2026-11-11, K1049):
"Rounded corner". This is the fillet that K1040's S1b and S1c drew (`docs/design/K1040_s1d_corner.md`
F2, and F6's Look with crops). Form B and rp=outline both still draw the sharp inner corner. The census
counts 14 of these (k1049, 6 on g41_ring_tw42): `.claude/probes/K1314/out/s1/crops/sheets/k1049_01.png`
in the main checkout (form B | today, misframed: ignore it | rp=outline). The census plan's group 3 says
where they come from: outline.ts skips the through pair's corner in `buildOutlineFull` (~662, the skips
at ~907 and ~1066) and in `diagramOf` (~3023, skip ~3043). fill_tri.ts's junction fan must then follow
the rounded corner. This stage moves the gate's look line: the census's k1049 count.

Stage 2 also left one port: `band_gpu.ts`'s tied quad (~241) must pass `p.alpha` (when
`p.alpha.length === 2*np`) and `i`, as `draw.ts` `bandData`'s tied branch now does. Until then, the GPU
path still draws the black bars at muse_hash j78. Do it first, and check it against the CPU twin
(`alphaCpu`).

## Goal

Every k1049 find becomes the rounded corner, drawn by one rule in the code that builds the corners, with
no new artifact of any kind. The technique is yours. At these spots, the reference is the fillet of
S1b/S1c, not form B. Make the census compare the corner against the fillet there, so the rounding does
not count as ink or fill out of place.

## Done

- **Census** (`k1314_run.ps1`, then its merge): k1049 at 0, and no other kind's count above stage 2's
  (stray_ink 19, hard_edge 4, paper 2, broken_ink 15). Say in the report what the census compares at the
  K1049 spots, and how.
- **The port:** the GPU band against `alphaCpu` at muse_hash j78, within its existing tolerance.
- **Crops:** fillet reference | before | after for each of the 14 finds, plus any new find of any kind,
  from your final commit, in `.claude/probes/K1314/out/s3/`. I view them before merging.
- **The gate's per-stage checks:**
  - the desktop worker frame on def, ABBA under the perf lock: not worse than master by more than the
    run-to-run spread (`k1314_s2_bench.ps1`);
  - `npm test` green;
  - the golden snapshots unchanged and today's look byte-identical;
  - `outline_port.test.ts`'s pins re-frozen only where your fix moves them, named in the commit.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never
  print a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long
  results to a file and read only the lines you need). The Read tool only right before an Edit, and for
  viewing crops. Junction `node_modules` from the main checkout; never `npm ci`. Read
  `.claude/rules/probes.md` before probing: a bare URL is today's daily. Real-time headed Chrome only;
  never `--virtual-time-budget`.
- **Your files:** `src/render/outline/outline.ts`, `draw.ts`, `band_gpu.ts`, and `fill_tri.ts` outside its
  record code; tests; your tools and outputs under `.claude/probes/K1314/`. The K1247 stage 21 agent is
  changing the record code at the same time: `chain_frame.ts`, `rec_glsl.ts`, `fill_tri.ts`'s record code
  (`fillStructure`, `recStrip`, `stripNb`), `outline_app.ts`, `outline_model.ts`, `outline_worker.ts` and
  `src/app/frame_loop.ts`. Stay out of those. If the junction fan's change needs the record code to
  follow, say so in the report and don't edit it.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did
  not start. Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time,
  and delete it after. While someone else holds it, wait inside one blocking command; a lock older than
  30 min is stale. The census renders: don't run it while another owner holds the lock.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Leave the last 25 minutes for the checks. Then commit WIP, append a handoff to this
  brief and report. Neither a compaction nor context size is a stop; after a compaction, re-read this
  brief and `git log`.

## Report

Under 40 lines:
- the census counts per kind, before and after;
- the port's check;
- the rule you used and where it lives (file and function);
- the worker frame on def, before and after;
- the crop paths;
- what is left;
- your last SHA.

End with `Ledger items` and K1314's handle fields.
