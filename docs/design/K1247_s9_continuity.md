# K1247 stage 9: make the outline continuous in its points

Ledgers: K1247 (the frame's speed) and K1240 (the redesign). One Claude Opus agent in its own
worktree, on its own branch. Cap 2 h.

## Why

The outline (`.claude/probes/K1240/proto/outline.ts`) jumps when its input points move by almost
nothing. Stage 8 (`docs/design/K1247_s8_density.md`, Handoff 1) measured it with
`k1247s8_jitter.ts`: moving every chain point by 0.001 device px at random moves def's pieces 9.0 px
and muse_default_tw's 8.7 px; 0.01 px moves them 21.8 and 24.7 px.

That jump is two problems:
- **A look defect.** In motion, a corner or tail can pop.
- **The speed block.** Point reduction can't hold 0.25 px while 0.001 px moves a piece 9 px, so the
  frame can't drop from 18.8 ms to the 11.5-13 ms that plain reduction at eps 0.1-0.2 would give.

Round 4 (`docs/design/K1240_s3f_round4.md`, its handoff) added the end tails and one more jump.

## Goal

The outline's pieces move continuously with the points, while the K1240 rows and K1247 checks
hold. Levi's rule still binds: the structure is decided once, and only positions follow the frame.
No piece that comes and goes, and no decision made from positions. The technique is yours.

The known causes (first re-measure each one on today's master):
1. **The end arm's root kink** (def corners 34 and 38): arm A's foot ua pins at 0 instead of
   sliding, and r drops from the 2h cap to 0.197h (`k1247s8_corner.ts`, `k1247s8_wrows.ts`).
2. **Foot sensitivity:** a corner's foot moves 9-20x the change in its arm's L, through the
   crossing cut `d - h cot(theta/2) - h` (def corner 182, muse_default_tw corner 277;
   `k1247s8_cornred.ts`).
3. **Region ids** shift when a sliver polygon (fewer than 3 points) is skipped (def cycle frame
   18; `k1247s8_regions.ts`).
4. **The tails' first-interval rule** (def corner 35's tail, 17.3 px at 0.01 px): a new positive
   interval of f opens at the corner and becomes "the first" (`_r4_tailjit.ts`).

Form B (`src/render/field/`) is the reference. Where form B itself jumps at a spot, the outline may
jump with it: show it, with form B evaluated at the two jittered scenes.

## Done

0. **Baselines first, on master's outline before any change** (this is K1263):
   - Run `k1247c_dump.ts <sub>` to make verify's tables, and `k1247_exact.ts --out=<sub>` at still,
     0.1 and 0.5 for the row baselines.
   - Then `k1247c_final.ps1 -Base <yours>` reads verify 0 and every cmprows row in tolerance.
   - Read each step's log: the script's steps exit 0 even when they fail.
1. **Continuity:** `k1247s8_jitter.ts --d=0.001,0.01`, on every scene, still and with `--cyc`.
   - No key changes.
   - No piece moves over 0.25 device px at 0.01 px, unless form B jumps at that spot too.
   - List what's left, with its place and cause.
2. **The redesign holds:**
   - `s3f_claude_checks.ps1`: every row stays within tolerance of S3d's baseline.
   - K1247's checks, against the step 0 baselines: verify, coldwarm, `k1247s5_cmp` (no worse than
     48/9/0/0), `k1247s5_outside` and `k1257_sliver`.
   - Every difference is a corner you changed on purpose: list them.
3. **Crops:** before and after at each place you change (`s3f_claude_pics.ts`, with AT= or tags).
   Claude looks at them.
4. **The payoff, measured:**
   - `k1247s8_acc.ts` at plain eps 0.1 and 0.2: the failures and the worst piece on every scene.
   - A locked `k1247s8_pair.mjs` pair, master against yours, through `k1247s8_run_locked.ps1`, at
     eps 0 and the best passing eps.
   - Name the phase where any change in def's eps 0 frame lands.
   - A negative result is a result.
5. `npm test` green.

## Rules

- PowerShell. Read code through the shell (`Select-String`, ranges of `Get-Content`). Use the Read
  tool only right before an Edit. No helpers.
- Junction `node_modules` from the main checkout (`New-Item -ItemType Junction`). Never run `npm ci`.
- **Your files:** `outline.ts`, the `k1247s8_*` and `k1247s9_*` tools, and the check tools in
  `.claude/probes/K1240/proto/`. No `src/` changes: form B is the reference.
- **Commits:** WIP on your branch at each milestone. Use `git add -f` for tools, never for outputs.
  Never push, never edit `LEDGER.md`, and never touch the main checkout or any Muse worktree.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what).
  - Take it only to time something, and delete it when you're done.
  - While someone else holds it, wait inside one blocking command.
  - A lock older than 30 min is stale.
- **Stopping:** stop when Done holds or 2 h after your start (`Get-Date` at the start and at each
  milestone). Then commit WIP, append a handoff to this brief, and report. A compaction is not a
  stop: re-read this brief and `git log`.

## Report

Short and plain:
- each cause: what it was, what you changed, and the jitter numbers before and after;
- what's left over 0.25 px;
- the checks;
- the crops' paths;
- the eps 0.1 / 0.2 accuracy and the timing pair;
- your last SHA.

End with `Ledger items` and K1247's handle fields (owner, branch, last commit, evidence, next).
