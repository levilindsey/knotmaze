# K1314 stage 2: no stray ink spikes in rp=outline's band

Ledgers: K1314 (this), K1310 (the gate), K1240 (the redesign). One Claude Opus agent in its own worktree, on
its own branch from master. Cap 2 h. Read first: `docs/design/K1240_gate.md` and the handoff at the end of
`docs/design/K1314_s1_census.md`.

## Why

Levi on rp=outline (2026-11-11): "plenty of unacceptable artifacts". The gate's look bar is zero
artifacts by the K1314 census. Stage 1's census found 57; the largest group with an unambiguous fix is
group 2 of its fix plan: **19 stray ink spikes in the band**. These are black bars, blocks, flecks and
notches that are not a border or a cut's end:
- 9 at corner arcs (outline.ts `cornersPhaseC`, `cornerFallbackC`);
- 9 in run pieces (muse_hash j58, j78, x15, x22, x304; outline.ts run pieces, draw.ts `bandData` and
  `zChains`);
- 1 in a tail.

See `.claude/probes/K1314/out/s1/crops/sheets/stray_ink_01.png` and `_02.png` in the main checkout. Copy
`out/s1/` into your worktree if your tools need it. This stage moves the gate's look line: the census's
stray_ink count.

## Goal

Every stray-spike find of census s1d gone, with no new artifact of any kind. Fix the cause in the code
that draws each spike, with the same rule everywhere rather than a patch per spot. The technique is yours;
form B shows what each spot should look like.

## Done

- **Census** (`k1314_run.ps1`, then its merge): stray_ink at 0, apart from finds that the crops show are
  not spikes. Stage 1 named two false positives: g41_user_tw64 j28's hook and muse_hash j29's tail. No
  other kind's count rises.
- **Crops:** form B | before | after for every stray_ink find of s1d, from your final commit, in
  `.claude/probes/K1314/out/s2/`. I view them before merging. Include any new find of any kind.
- **The gate's per-stage checks:**
  - the desktop worker frame on def, ABBA under the perf lock: not worse than master by more than the
    run-to-run spread (`k1283s11_bench.ps1`);
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
- **Your files:** `src/render/outline/outline.ts` and `draw.ts`, and `fill_tri.ts` outside its `oe` record
  code; tests; your outputs under `.claude/probes/K1314/`. The K1247 stage 19 agent is changing the `oe`
  path at the same time: `chain_frame.ts`, `fill_tri.ts`'s record code, `band_gpu.ts`, `outline_app.ts`,
  `outline_model.ts` and `outline_worker.ts`. Stay out of those. If a spike's cause lives in `band_gpu.ts`'s
  shader twin of `bandData`, change `bandData` and tell me in the report; don't edit `band_gpu.ts`.
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
- each cause you found and its fix (file and function);
- the worker frame on def, before and after;
- the crop paths;
- what is left;
- your last SHA.

End with `Ledger items` and K1314's handle fields.
