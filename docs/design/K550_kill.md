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
