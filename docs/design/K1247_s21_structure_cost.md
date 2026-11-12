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

## Handoff (K1247 s21 agent, 2026-11-11)

**Why s20's first structure was slow.** OutlineModel's constructor ran
two fills: fillRec 1, which places every record column on the CPU one
colAt at a time, and then fillRec 2's. On top of that, recLayout copied
the paint vertex by vertex, which took 52-76 ms (node).

**What changed** (all in my files):
- `fillRec 3` (fill_tri.ts, the record code). It is fillRec 2's frame
  and strip table, plus columns 2..N-2 placed on the CPU the way the
  shader places them: `colRow` (chain_frame.ts) runs on the table's
  float32 ranges. colRow is colAt for a column range, bit for bit: one
  span, one walk along V, and a two-vertex corner cache.
- The constructor now runs one fillFrame(fillRec 3).
- recLayout copies by runs of consecutive vertices with
  TypedArray.set, about 6 000 runs. Def drops from 76 to 20 ms. The
  output is bit for bit the same.
- `OutlineModel.structureParts` rides the worker's reply into the
  app's stats, and `k1247s18_bench.mjs` records it.

**Is the first frame equal?**
- fillRec 3's strip table, fallback rows and non-shader vertices equal
  fillRec 2's bit for bit (`k1247s21_paint.ts`).
- The paint after recLayout has the same src, runs, idx, w and S.yzw as
  s20's. Only pos, key and S.x of the shader's vertices differ, by at
  most 0.03 px, and main's placement overwrites them every frame.
- The first frame does not draw by the old path.

**Speed.** ABBA under the perf lock, at the defaults, run order
positions 1-4. Master is 2d547152; the branch builds are c64603c6
(bench3, bench4) and bfd8d7f7 (bench5). There is a strong position
effect: position 1 is slow and position 4 is fast, so bench4 swaps the
order.

First structure in ms (rounds 3-5):

| | def | fat |
|---|---|---|
| Master | 753, 677 / 558, 533 / 572, 620 (mean 619) | 663, 652 / 551, 537 / 530, 542 (mean 579) |
| Branch | 698 / 609, 618, 640, 625 / 627 (mean 636) | 689 / 610, 572, 541, 567 / 554 (mean 589) |

The branch is +17 ms on def and +10 ms on fat. Both are inside
master's run-to-run spread: 533-753 on def, 530-663 on fat. s20's
68789c82 in bench1-2 was def about 652 against 600, and in node it was
about 80 ms over master.

Browser structure parts on the branch (bench5, def):
- frame 235-246 ms;
- fill 122-127 (cold JIT);
- band 82-93;
- paintData 59-76;
- zChains 42;
- fillStructure 41;
- recLayout 19-20.

The other numbers, branch against master:

| | Branch | Master |
|---|---|---|
| Worker p50, def | 160-185 | 179-204 |
| Worker p50, fat | 167-176 | 183-205 |
| Fill p50, def | 27.5-31.4 | 42-47 |
| Fill p50, fat | 30.6-33.7 | 44-53 |
| Rest frame | 5.8-6.2 / 6.2-6.7 | same |
| Drag frame p95 | 10.8-11.4 | 12.9-13.3 |
| Reply, def / fat (MB) | 22.8 / 23.3 | 32.1-32.8 |

**Census** against form B (`k1247s19_fillcensus.ts rest <scene>
--ppu=40`) equals s20's: def 44/61, muse_hash 242/259, g41_user_tw64
13/56.

**Checks.**
- `npm test` is green at bfd8d7f7: 226 files and 2928 tests, including
  the new `test/render/rec_col_row.test.ts` (colRow = colAt).
- The tree was clean after the run, so no snapshot moved and
  outline_port's pins are untouched.

**Tools** (`.claude/probes/K1247/`):
- `k1247s21_ctor.ts`: the constructor's parts, fillRec 0 against 2.
- `k1247s21_parts.ts <srcRoot> <frame.json> <fillRec> <R>`: the same
  for any source tree. Master's tree is
  `$env:TEMP/k1247s20m/src-2d547152`.
- `k1247s21_mvb.ts`: master's ctor against the branch's in one process.
- `k1247s21_colrow.ts`: colRow against colAt on captured chains.
- `k1247s21_paint.ts`: frame 0, s20 against s21.
- `k1247s21_reclayout.ts`: recLayout against the per-vertex copy.
- `k1247s21_bench.ps1`.

Outputs are in `out/s21/` (bench1-5).

**Left.**
- The browser's first frame (`frame`, 235 ms) and its cold fill
  (122 ms) dominate the structure on both branches. Master's parts in
  the browser are not recorded, because 2d547152 has no
  structureParts.
- A further cut would come from `frame` (outline.ts) or from warming
  the fill's JIT, not from the records.
