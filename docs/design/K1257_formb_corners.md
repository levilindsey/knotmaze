# K1257: form B's corners take the closed-form growth

Ledger: K1257 (from K1247 stage 6). One Claude Opus agent in its own worktree, on its own branch. Cap 2 h.

## Why

K1240's outline (`.claude/probes/K1240/proto/outline.ts`) now grows corners in closed form along the
medial path (K1247 stage 6, `docs/design/K1247_s6_analytic.md`, Handoff 1). Against the converged
reference, its corners are off by more than 0.01 h in 58 places, where the old 32-node growth was off
in 567 and by up to 0.88 h.

Form B (`src/render/field/`) still grows corners the old way. It is the float64 reference every K1240
check compares against, and its top surface is the fill in the check pictures. So:
- each picture shows a sliver of white or an overlap wherever a corner moved (up to 8.3 px;
  `k1247s6_sliver.ts` counts them);
- the checks flag the moved corners as failures (`k1247c_final.ps1`'s verify: 48).

## Goal

Form B grows its corners with the same closed-form pieces as the outline, so the two agree at every
corner. Port the growth from `outline.ts` into form B's own code: `src/` must not import the probe.
The technique is yours. If form B shares an equation with the outline, the outline's version is the
one to match.

## Done

1. `k1247s6_sliver.ts`: no corner more than 0.5 device px from the outline's, on every scene. Each
   one left over gets a cause.
2. Outside corners, form B's output is unchanged: bit-identical, or within 1e-9 where an operation's
   order had to change. Say which outputs you compared and how.
3. `k1247c_final.ps1 -Base ../../../../muse-k1240-s1/.claude/probes/K1240/out/k1247/base`: verify's
   corner failures are gone. List whatever remains, with its cause.
4. `npm test` green. A test that pins form B's corners is re-frozen in the same commit, and the commit
   message names what moved and why.
5. The app's form B path (`field_b_app.ts`, the fbb flag) still draws. Take one screenshot with the
   flag on (`scripts/diag_screenshot.mjs`) and look at it.
6. Pictures: re-crop the 6 corners from stage 6 (`k1247s5_pics.ts`, the list in stage 6's
   `out/k1247s5/pics_s6/index.txt`), with form B's fill now under the new outline. Claude looks at
   them.

## Start

Branch from master. Stage 6 is merged there.

## Rules

- PowerShell. Read code through the shell (`Select-String`, ranges of `Get-Content`). Use the Read
  tool only right before an Edit. No helpers.
- Junction `node_modules` from the main checkout (`New-Item -ItemType Junction`). Never run `npm ci`.
- Your files: `src/render/field/` and its tests, plus check tools in `.claude/probes/K1240/proto/`
  that are new or yours. Another agent is changing `outline.ts` (K1247 stage 7), so don't edit it.
  Commit WIP on your branch at each milestone, with `git add -f` for probe tools, never for outputs.
  Never push, never edit `LEDGER.md`, and never touch the main checkout.
- Perf lock (`$env:TEMP\claude-perf.lock`): take it only to time something. Correctness checks don't
  need it.
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and at each milestone). Then
  commit WIP, append a handoff to this brief, and report. A compaction is not a stop: re-read this
  brief and `git log`.

## Report

Short and plain:
- the sliver count per scene, before and after;
- what changed outside corners, and how you know;
- verify's failures, before and after;
- `npm test`, and the fbb screenshot's path;
- the crops' paths;
- what's left;
- your last SHA.

End with `Ledger items` and K1257's handle fields (owner, branch, last commit, evidence, next).
