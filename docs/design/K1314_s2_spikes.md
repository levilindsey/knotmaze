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

## Handoff (K1314 s2 agent, 2026-11-11, stopped for the checks before the 2 h cap)

Branch `worktree-agent-ae44cdbece648f3d2` (worktree `.claude/worktrees/agent-ae44cdbece648f3d2`),
from 27d4c722. Not pushed. Done does not hold: stray_ink 22 -> 19 (census s1d -> s2b); 14 real spikes are left (below). Every other kind is unchanged (hard_edge 4, paper 2, broken_ink 15, k1049 14; total 57 -> 54); tail_look (informational) 151 -> 176, as tied runs now fade. npm test green; byte_identity unchanged (rp=outline only); outline_port re-pinned (ring table f0/f1, g41_ring_tw42 table f0/f1). Worker frame on def, drag p50 ABBA: base 27d4c722 186.4 / 189.0, final 0ee79a3c 186.8 / 201.1 (an earlier run: base 190.1 / 196.4, 585f4a0b 196.3 / 184.8), within the base's own 10 ms spread.

**Fixes (same rule at every corner; checked against form B):**
- `draw.ts` `bandData`, tied branch: a tied run's band reads its own `p.alpha`
  (outer/inner per point, lerped along t and across u), as the untied branch
  did. runEndFade's fade at a failed corner never reached tied runs: the black
  bars at muse_hash j78 (#78, #102). **`band_gpu.ts`'s tied quad needs the same
  (pass `p.alpha && p.alpha.length === 2 * np ? p.alpha : null` and `i`, about
  line 241); not edited (K1247 s19's file), so the GPU path still shows j78.**
- `outline.ts` `sharpJoinFan`: no fan whose short way turns against the
  border (`da > 0`; 424 of 425 census fans sweep da < 0): muse_hash j74 (#170).
- `outline.ts` `RUN_FADE_TH` (piecesPhaseC's runFade push): no run-end fade at
  a near-straight or reflex failed corner (theta >= 3/4 pi). Form B inks every
  faded sample at all six such corners; without it the draw.ts change put
  new gaps at ring/g41_ring j12, def j174, g41_user j4, j27, j28.
- `outline.ts` `runEndFade` `RUN_FADE_MIN`: no fade whose faded points all lie
  within 0.15 h of the run's end (j39: 0.003 h; j78's real fade: 0.31). The
  draw.ts change had put thin light slits at g41_def_tw64 j45, j48 and
  g41_user_tw64 j39 (a run's 1 -> 0 ramp straddling V, outside the fan).

**Left (stray_ink):**
- (a) Notch corners, near-straight or reflex failed corners whose fan form B
  leaves as a V notch: ring and g41_ring j12, def j174, g41_user j28 (#1).
  B's chain end sits 0.21-0.32 from V (V on B's end cap), but j4 (A's end at
  0.32) is fully inked by form B, so no clean rule yet (`k1314_s2_fans.ts --all`
  prints fan shares and chain-end distances).
- (b) Uncut swallowtail loops near roots and ends: muse_hash x15 (form B a
  smooth spiral, rp a square loop) and j58 x2 (needle). cutFoldsC skips them by
  design (K1283 s5's x300 blot).
- (c) g41_def j45, j48, g41_user j39: form B has a sharp square corner with a
  gray fade, rp a rounded fan of radius W (chain end about 0.32 from V). At j39
  V is "outside spans": cSA is clamped, so the fan's first ray (78 deg) misses
  the run's normal (84-90 deg). Try: start/end the fan at the arms' normals.
- (d) muse_hash j55 (a notch spike in rp), x22 (like form B's own smear),
  x304 (a tail look), g41_user j30 (a hook overshoot).
- Known FPs: g41_user j28 #0, muse_hash j29. Out of scope cuts: muse_hash j49,
  g41_user j63, j64.

**Evidence** (`.claude/probes/K1314/`, tools committed with `-f`): census
`out/s1/census_s2b.{json,txt}` (`k1314_run.ps1 -Tag s2b`); crops
`out/s2/fin_before`, `fin_after`, `fin_ba` (form B | before | after; the sheet
header's "today | rp=outline" reads before | after) and `fin_ba/sheets/`;
probes `k1314_s2_spot.ts`, `_ba.ts`, `_fans.ts`, `_corners.ts`, `_fades.ts`,
`_diff.ts`, `_bench.ps1`. Bench: `out/s2/bench_def_final.json` (and `bench_def.json`, before RUN_FADE_MIN).

