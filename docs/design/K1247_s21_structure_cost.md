# K1247 stage 21: the record fill without a slower first frame

Ledgers: K1247 (this), K1310 (the gate), K1240 (the redesign). One Claude Opus agent in its own worktree.
First bring in stage 20's branch: `git merge --no-edit worktree-agent-a095e7cff519b9abd` (its last commit is
13abc7e1) in your fresh worktree, then commit on your own branch. Cap 1 h 30. Read first: `docs/design/K1240_gate.md`
and the handoff at the end of `docs/design/K1247_s20_records_look.md`.

## Why

Stage 20 made the record fill rp=outline's default. On def, the worker frame fell from 187-191 to 168-172
ms p50, and the reply from 32 to 22.8 MB. Its crops match today's fill in the app's paint. But the first
structure got slower: def from 594-672 to 875-880 ms, and fat from 532-620 to 701-723 ms. The gate's
structure line is the first outline frame within 1 s of load on the Pixel, so this blocks the merge. This
stage wins it back. Stage 20 merges together with it.

## Goal

The first outline frame on def and fat no later than master's (2d547152), with stage 20's per-frame
numbers kept. The technique is yours. Two examples: make the record build cheaper (a walk along s
instead of a search per vertex), or build the records after the first frame, which then draws by the old
path.

## Done

- **Speed:** ABBA under the perf lock, master 2d547152 against your final commit, at the defaults, on def
  and fat. The bar is the first structure (or first outline frame) no worse than master beyond the
  run-to-run spread. Also report the worker frame, the worker fill, the main frame at rest and mid-drag,
  and the reply MB; none may lose stage 20's gains.
- **Look:** the census against form B on def, muse_hash and g41_user_tw64 equal to stage 20's (44/61,
  242/259, 13/56). If the first frame now draws by the old path, show that frame matches the next.
- **Checks:** `npm test` green, the golden snapshots unchanged, and `outline_port.test.ts`'s pins
  unchanged.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never
  print a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long
  results to a file and read only the lines you need). The Read tool only right before an Edit. Junction
  `node_modules` from the main checkout; never `npm ci`. Read `.claude/rules/probes.md` before probing: a
  bare URL is today's daily. Real-time headed Chrome only; never `--virtual-time-budget`.
- **Your files:** the record code, meaning `chain_frame.ts`, `rec_glsl.ts`, `fill_tri.ts`'s record code,
  `outline_app.ts`, `outline_model.ts`, `outline_worker.ts` and `src/app/frame_loop.ts`; tests; your tools
  under `.claude/probes/K1247/`. The K1314 stage 2 agent is fixing ink spikes in `outline.ts`, `draw.ts`
  and `fill_tri.ts`'s non-record code at the same time. Stay out of those.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did
  not start. Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time,
  and delete it after. While someone else holds it, wait inside one blocking command; a lock older than
  30 min is stale.
- **Stop** when Done holds or 1 h 30 after your start, whichever comes first (`Get-Date` at the start and
  at each milestone). Leave the last 25 minutes for the checks. Then commit WIP, append a handoff to this
  brief and report. Neither a compaction nor context size is a stop; after a compaction, re-read this
  brief and `git log`.

## Report

Under 30 lines:
- the first-structure numbers, master against yours;
- the other speed numbers;
- the census;
- what you changed;
- your last SHA.

End with `Ledger items` and K1247's handle fields.
