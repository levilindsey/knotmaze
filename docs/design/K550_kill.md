# K550 kill brief: revert K320's gap split

Ledger item K550. Levi (2026-10-20): "K550: Go with your kill rec." The
recommendation is `docs/design/K550_stage3.md`, Recommendation, item 2:
kill the split, keep Stage 1, revert 2a and 2b. The split has been dark
on master since K551 (`f18dd07`): no shipped frame draws through it.
Removing it should change no pixel, and this stage proves that.

## What to revert

Six code commits, newest first. No later commit touches their files
(checked 2026-10-20 at `020d29d`), so the revert should apply cleanly:

| Commit | What it did |
|---|---|
| `a688909` | K553 WIP: `fitGapTarget`, the mask's sizing rule |
| `4b5085d` | K553 WIP: the gap mask in device pixels |
| `f18dd07` | K551: the split stays dark; the warm-up follows the draw flag |
| `5bfba38` | K320 2b: the split off by default |
| `f485641` | K320 stage 2b: the paint samples the gap mask |
| `ffd3864` | K320 stage 2a: the gap pre-pass data plane |

```
git revert --no-commit a688909 4b5085d f18dd07 5bfba38 f485641 ffd3864
git checkout HEAD -- LEDGER.md
```

**Keep:**
- Stage 1 (`6c592e6`, the slim) and its guard
  `test/render/k320_slim.test.ts`. The revert puts the guard back to its
  Stage 1 form; check that its budgets still hold.
- Every doc: `docs/design/K553.md` (`60511ed` is docs only; do not
  revert it), `K320_stage2.md`, `K550_stage3.md`. They are the record.
- `LEDGER.md` exactly as HEAD has it (`f485641` touched it). Do not edit
  the ledger.

**Then remove what still refers to the split:**
- grep `src/`, `test/`, `scripts/` and `.claude/rules/` for `gapSplit`,
  `GapSplit`, `gap_prepass`, `GAP_PREPASS`, `gapMaskUniforms`,
  `setGapMaskSize`, `K320 stage 2`, `K551` and `K553`;
- the probe hooks (`src/app/probe_hooks.ts`, `window.__knot*`) if they
  expose the split's switch;
- lore that describes the split as live (likely `render-gaps.md`,
  `render-shaders.md`, `render-loop.md`; `docs/lore_index.md`): keep
  each entry, add one line saying K550 killed the split on 2026-10-20
  and naming the revert commit.

## Verify

1. **The suite:** `npm test` and `npm run build`, both green. The suite
   was 1554 passed and 1 skipped at `020d29d`; report the new count and
   which tests left with the split (`gap_split.test.ts` and any others).
2. **Shader sources:** dump the GLSL the renderer compiles on the default
   path (every program `program_registry.ts` builds, vertex and
   fragment), before (`020d29d`) and after, with a Node script that
   imports the modules, and diff them. Byte-identical sources prove the
   pixels on their own; report any difference with its lines.
3. **Pixels:** a same-state A/B of the two builds, headed, on the real
   GPU, under the perf lock (`$env:TEMP\claude-perf.lock`).
   - Build each commit with `pwsh scripts/preview.ps1 -Port <p> -Ref
     <commit>`. Ports 5250-5259 are yours; check that a port is free
     before binding, and leave 5173 alone (Levi's).
   - The revert touches render code only and the physics is
     fixed-substep, so a scene at sleep is the same state on both builds
     (K63). Pin the animation clocks and park the pointer as
     `.claude/rules/probes.md` describes; K551's and K553's probes
     (`.claude/probes/K551/`, `.claude/probes/K553/`) compared builds
     this way.
   - Scenes: a knot, a maze design, the thread reveal and a burn, at
     device scale 1 and 2.
   - Pass: 0 px differ in every scene. Any difference is a finding:
     attribute it before going on.

## Out of scope

- The stage 3 branch's code (the try and the three keeps): none of it
  merges. Its Handoff is already on master (`9e2dd4a`).
- K567 (a future revival) and K561 (2c's pre-flip checks): the
  coordinator drops or keeps them in the ledger.

## Where and how

- **Your branch starts from origin/master** (the harness made your
  worktree). Run `git log -1 --oneline` first; if this brief is missing,
  run `git merge --ff-only origin/master`.
- Work only in your worktree, with absolute paths. Never edit the main
  checkout (`C:\Users\lsl\Repositories\knotmaze`).
- **Shell:** PowerShell. **`node_modules`** is a junction to the main
  checkout's: before removing anything that contains it, run
  `(Get-Item node_modules).Delete()`.
- **Chrome:** headed, never `--virtual-time-budget`, each instance with
  its own `--user-data-dir` under `.claude/probes/K550/kill/` and the
  off-screen window flags; delete the profiles when done. Never touch
  Levi's Chrome profile.
- **Files:** probes and results go in `.claude/probes/K550/kill/`
  (untracked), never the session scratchpad.
- **Git:** commit at every milestone (the revert, the cleanup); never
  push. End every commit message with the session's `Co-Authored-By`
  and `Claude-Session` lines.

## Stop rule

- Run `Get-Date` at the start and at each milestone.
- Stop when Verify passes or at the one-hour cap, whichever comes first.
- A compaction is not a stop. After one, re-read this brief and
  `git log --oneline -5`, then go on.
- At the stop, commit, append a `## Handoff` section to this file (what
  is done, the test count, the A/B result and its evidence paths),
  commit it, and report.

The report ends with a `Ledger items` list and the K550 handle fields
(branch, last commit, evidence, next).

## Handoff

Written 2026-10-20 about 12:09 by the K550 kill agent (agent
`aabae6dc5db6e48b5`, worktree `.claude/worktrees/agent-aabae6dc5db6e48b5`,
branch `worktree-agent-aabae6dc5db6e48b5`, started 11:14:38). It stopped at
Verify pass, inside the 12:14:38 cap. Nothing is pushed. Probe folder (all
untracked, in the worktree): `.claude/probes/K550/kill/`.

### Done

- **The revert is one commit, `9c17bde`** (13 files, +66/-1280). It undoes the
  six code commits `a688909 4b5085d f18dd07 5bfba38 f485641 ffd3864`
  (stage 2a, 2b and the K551/K553 follow-ups): it deletes
  `src/render/gap_prepass.ts` and `test/render/gap_split.test.ts` and takes
  the split out of `explore_glsl.ts`, `fabric_sdf.ts`, `gap_mask.ts`,
  `program_registry.ts`, `ribbon/ribbon_shader.ts`, `ribbon_renderer.ts`,
  `shader_warmup.ts` and the tests `k320_slim`, `paint_explore`,
  `program_registry`, `shader_warmup`.
- **Kept as `c6a0d7e` had them:** Stage 1 (`6c592e6`, the slim) and its guard
  `test/render/k320_slim.test.ts` (its budgets still pass), every doc and
  `LEDGER.md` (`git diff c6a0d7e 9c17bde -- LEDGER.md docs` is empty).
- **Leftover sweep: nothing to remove, so there is no cleanup commit and no
  lore edit.** A case-insensitive grep of `src test scripts notices
  .claude/rules` for `gap_prepass`, `GAP_SPLIT`, `gapSplit`, `gap_split`,
  `K320 2a`/`2b`, `K320 stage 2` and `gap pre-pass` has no match, and
  `docs/lore_index.md` has none. The remaining matches are in docs that stay
  (`K320_stage2`, `K553`, `K550_stage3`, `K115_stage6`, `ledger_notes`). Code
  still names only "K320 stage 1" (the kept slim): `k320_slim.test.ts`,
  `paint_ring_lap.test.ts:328`, `explore_glsl.ts:849`, `gap_mask.ts:717`,
  `paint_glsl.ts:333,949`. No rules file describes the split as live, so
  there is no line to add.

### Verify

- **(a) Suite and build.** `npm test`: 1554 passed + 1 skipped before, **1534
  passed + 1 skipped after** (112 files: 111 passed + 1 skipped; 117 s). The
  20 that left: all 17 of `gap_split.test.ts`; "splits the search out of
  paint (brief 9 invariants)" from `k320_slim.test.ts` (6 to 5); "K320 2b: the
  paint half takes only the visibility edits, no search" from
  `paint_explore.test.ts` (14 to 13); "K551: selects the gap programs only
  while the split is on" from `shader_warmup.test.ts` (14 to 13).
  `program_registry.test.ts` was edited and its count is unchanged (6).
  `npm run build` is green (565 ms, the usual chunk-size warning only).
- **(b) Shader sources of every program on the default path, `020d29d`
  against `9c17bde`** (`shaders_before/`, `shaders_after/`, `dump_programs.ts`
  with `vite.node.config.mjs`; 29 programs in each of eight contexts: daily,
  knot, reveal, burn, burnKnot, fog, reduced, reducedReveal): 27 of the 29
  are byte-identical and every fragment shader is byte-identical. The two
  that differ are the vertex shaders of `section-rgb` and
  `section-rgb-explore`, by two removed lines each (`flat out highp int
  vChain;` at line 33, `vChain = int(aKey.x + 0.5);` at line 450); no
  fragment shader in the dump reads `vChain`. The rest of the dump differs
  only as expected: `index.tsv` and `by_context.tsv` change only those two
  programs' vertex hashes (`by_context.tsv`: all 32 changed lines are
  `section-rgb` or `section-rgb-explore` rows), `index.tsv` also loses
  `section-rgb-gap` and `section-rgb-gap-explore` (the split's programs; no
  context listed them on the default path), and `waves.txt` loses its one
  `gapSplitActive default: false` line. `020d29d` is code-identical to
  `c6a0d7e` (no path under src, test, scripts, notices, package files or the
  vite config differs).
- **(c) Same-state headed pixel A/B: all eight cells are 0 px, with a 0 px
  control.** Scenes knot (`mf=0`), maze, thread reveal (`xp=threads`) and
  burn (`fi=fuse&fsp=0.9&fdl=0`), each at device scale 1 and 2 (1400x900 and
  2800x1800 frames), seed 7, `am=instant&fw=0&snd=manual&phy=0`. Each cell
  loads A (`020d29d`), B (`9c17bde`) and A again and diffs A1~A2 (the
  control), A1~B and A2~B. Results are px differing, control | A1~B | A2~B:
  - knot dsf 1: 0 | 0 | 0, 18/18 checks (`out_f4/`, `knot1_run.log`)
  - knot dsf 2: 0 | 0 | 0, 18/18 (`out_f1/`, `final_run.log`)
  - maze dsf 1 and 2: 0 | 0 | 0 each, 19/19 (`out_f2/`, `final_run.log`)
  - reveal and burn, dsf 1 and 2: 0 | 0 | 0 in all four, 19/19 (`out_f3/`,
    `final_run.log`)

  Checks per cell: asleep with a bit-exact `__knotView()`; the build stamp's
  SHA is the commit under test; no page error, context loss or GL warning;
  the scene's params; only the `section-rgb` fragment program draws on the
  default path in all three loads; the same frozen state, the same nested
  state hashes (positions, prev, zPos, passes) and the same drawn geometry
  (mirror positions, `chainSamples`) in every load; a second frame 400 ms
  later on the same page identical (no clock runs); a clean warm-up; a
  non-blank frame; control 0; A1~B 0; A2~B 0; and a SENSITIVITY check (the
  paint debug view changes 51k to 1.27M px and back again is 0 px; knot mode
  draws no paint terms in debug view 5, so its control hides `renderer.root`
  instead: 329780 px at dsf 1). The log lines that contain "FAIL" are the
  "warm-up reports no failure" passes; there is no failing check.
- **Pins** (K83, K8 and K76 recipes): physics frozen through
  `__knotPhysFreeze(true)`, `__knotLoop({continuous: true})`, `advanceClocks`
  as a no-op with `paintClock` 100, `pulseBorn` 0, `flowTime` 0, the explore
  clock at 1000 with `tickExplore` forwarded 0, the background layer's tick
  and clock pinned and re-rendered, non-canvas body children hidden, the
  pointer at (2,2), reduced motion emulated as no-preference, a bit-exact
  view wait, `webglcontextlost` recorded. The burn scene's FX particles run
  on real time, so it also pins them: `F.tickFireFx = function () {}` and
  `F.fireFx.clear()`.
- **Setup deviations from the brief, stated:** the two builds
  (`builds/020d29d`, `builds/9c17bde`) are served by an in-script static
  server on 127.0.0.1:5250 (A) and :5251 (B), not by `scripts/preview.ps1` or
  `vite preview`. Chrome was headed at `--window-position=2200,50`,
  `--use-angle=d3d11`, one fresh `--user-data-dir` per cell under
  `profiles/` (deleted). The perf lock was held for every GPU run
  (`locked.ps1`) and released; no Chrome or server of this agent is left.

### The harness finding (read before reusing `ab_probe.mjs`)

**On the default worker host (K7) two loads of one link freeze at different
sim times (4.96667, 5.0, 5.01667 s) with different nested state hashes**, so a
same-build control is NOT 0 px there and a cross-build A/B reads thousands of
px of "difference". Observed: `diag_run.log` and `out_d_default/` (knot dsf 1:
control 3334, A1~B 3545, A2~B 3574 px, nested hashes differ per load);
`ab_run.log`, `out_p1/` and `out_p2/` (the first runs on that host: the
control was nonzero in six of the eight cells, 88 to 8039 px, and A1~B ran
from 0 to 7856 px; in reveal and burn at dsf 2 the control was 0 while A1~B
was 184 and 6223 px, which I infer, without a check, is A1 and A2 freezing
alike with B not, since those runs recorded no per-load hashes). `&phw=0`
(the in-thread host, the same numerics) gives 0 | 0 | 0 in
every load (`out_d_phw0/`), and so does `&phy=0` (physics off: one `settle`
message, freezes at sim 5.000000000000038 s with the stamp "asleep (physics
off)"), which the final runs use for speed (`out_d_phy0/`: knot dsf 1,
17/18, the only miss being the old knot sensitivity check, which cannot work
in knot mode). K8's lore line that the physics is deterministic, so two
loads of one link sleep in the same state, holds in-thread and with physics
off, not on the worker host.
`ab_probe.mjs <dirA> <dirB> <outDir> [scenes] [dsfs]` reads env `K550_EXTRA`
(here `&phy=0`) and `K550_ASLEEP_MS`; `run_final.ps1` and `run_knot1.ps1` ran
it under `locked.ps1`. `diff_view.mjs` (a heatmap of a failing diff) dies at
its PNG write (`png.mjs:34`, `data.copy` on a Uint8Array: wrap `out` in
`Buffer.from`); its stats print first and no final cell needed it.

### Deploy note (K307)

The revert removes the `vChain` pair from the vertex source of `section-rgb`
and `section-rgb-explore`, and Chrome's GPU program cache is keyed by source,
so each player recompiles those two once (K307: `section-rgb` is about 2.8 s
cold). No other program's source changed. A push touching `src/` deploys
(`npm test` first, green here).

### Next

The coordinator merges `9c17bde` and this Handoff to `master` (the branch
stands on `c6a0d7e`; rebase if master moved) and pushes, then closes K550
with the resolving commit. K567 and K561 are the coordinator's call; this
agent did not touch them.
