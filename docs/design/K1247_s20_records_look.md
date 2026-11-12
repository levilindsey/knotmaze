# K1247 stage 20: the record fill draws what today's fill draws, then becomes the default

Ledgers: K1247 (this), K1310 (the gate), K1240 (the redesign). One Claude Opus agent in its own worktree, on
its own branch from master. Cap 2 h. Read first: `docs/design/K1240_gate.md`, and the handoffs at the end
of `docs/design/K1247_s18_records.md` and `docs/design/K1247_s19_shader_fill.md`.

## Why

Stages 18 and 19 built the record fill behind `oe=1`. The worker places only each strip's end columns,
and main places the rest by transform feedback. On def the worker frame fell from 190-193 to 156-164 ms
p50, and the reply from 32 to 22.6 MB. It is still a switch because its look differs from today's fill in
two ways:
- **Cracks:** 1-4 px of paper along strip sides. The census against form B (fill / paper px, on vs off)
  reads def 52/177 vs 44/60, muse_hash 253/471 vs 243/266, and g41_user_tw64 15/131 vs 13/55. The
  vertices sit on the border, so the cracks are between vertices. Stage 18's handoff lists the probes
  already tried (SAG, ARC) and the next one to run.
- **Moved section boundaries at junctions:** where two sections meet inside a junction, the boundary
  moves. Claude saw it in the crops `.claude/probes/K1247/out/s19/crops/def.png` rows 2-3 and
  `muse_hash.png` row 3. Those crops use per-chain hues. Stage 1 of K1314 found that in the app's paint
  the junction colours converge, so check first whether these shifts show in the app's paint at all.

This stage moves the gate's first speed line for the default `rp=outline` by making the record fill the
default.

## Done

1. **The cracks closed:** the census against form B with `oe=1` is within 1% of off on def, muse_hash and
   g41_user_tw64, in both fill and paper px.
2. **The junction boundaries:** at each crop spot, the app's paint (rp=outline, its own colours) with
   `oe=1` against off. Fix every spot where they differ visibly. Report the ones that only show in the
   per-chain hues.
3. **The default flipped:** `rp=outline` uses the record fill unless `oe=0`. Today's look stays
   byte-identical. Re-freeze `outline_port.test.ts`'s pins only where the flip moves them, and name them
   in the commit.
4. **Speed:** the desktop worker frame on def and fat, ABBA under the perf lock, master against your
   final commit, both at their defaults. Also the main frame at rest and mid-drag (no worse than master
   beyond the run-to-run spread) and the reply MB.
5. **Crops:** off | on | |difference| at the five worst spots per drag, from your final commit, in
   `.claude/probes/K1247/out/s20/crops/`, in the app's paint as well as the per-chain hues. I view them
   before merging.
- **Checks:** `npm test` green and the golden snapshots unchanged.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never
  print a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long
  results to a file and read only the lines you need). The Read tool only right before an Edit, and for
  viewing crops. Junction `node_modules` from the main checkout; never `npm ci`. Read
  `.claude/rules/probes.md` before probing: a bare URL is today's daily. Real-time headed Chrome only;
  never `--virtual-time-budget`.
- **Your files:** the record code, meaning `chain_frame.ts`, `rec_glsl.ts`, `fill_tri.ts`'s record code,
  `outline_app.ts`, `outline_model.ts` and `outline_worker.ts`; tests; your tools under
  `.claude/probes/K1247/`. The K1314 stage 2 agent is fixing ink spikes in `outline.ts`, `draw.ts` and
  `fill_tri.ts`'s non-record code at the same time. Stay out of those. If a crack's cause is in that code,
  say so in the report and don't edit it.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did
  not start. Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time,
  and delete it after. While someone else holds it, wait inside one blocking command; a lock older than
  30 min is stale.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Leave the last 25 minutes for the checks. Then commit WIP, append a handoff to this
  brief and report. Neither a compaction nor context size is a stop; after a compaction, re-read this
  brief and `git log`.

## Report

Under 40 lines:
- the crack census, before and after;
- the junction boundary findings;
- whether the default flipped;
- the speed numbers;
- the crop paths;
- what is left;
- your last SHA.

End with `Ledger items` and K1247's handle fields.
