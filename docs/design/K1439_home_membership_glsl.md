# K1439: the GLSL mirror of home membership, live behind a URL switch (Claude agent stage)

## Why

K1438 (merged; read `### Handoff K1438` in `docs/design/K1438_home_membership.md` whole) put junction membership
from the arms' home intervals into `tables.ts` and `eval.ts`, behind a switch (`GF_HOME=1` /
`buildTables(scene, { home: true })`) that is off. The fade follows `fadeLength` live (`GfEval.fadeLength`).
On the CPU it took tie+ramp smudge finds from 1797 to 435 over the 12 census scenes and left 28 of 29 spots
clean.

This stage mirrors it in the shader so Levi can look at it live, with the `fadeLength` slider, on his own
links. Levi has NOT yet chosen it as the default: the look at a few sites changes (a rounded corner where
rp=outline draws a dive shadow; a soft band at `g41_user_tw64:17.80:9.55`). So it ships behind a URL switch,
off by default, and master's default pixels do not change.

## What to build

1. `gf_glsl.ts`: `member()` (line 871) gains the depth argument, reads aHome from the arm record's `.y`,
   applies the home test and the ramp from a new fade uniform; the call sites (1368, 1467, 1488) pass the
   piece's depth. Review the "no ramps" depth class (309, 316, 1497) and `MAXR`, as the handoff says.
2. `gf_keys.ts:76`: `dHi = max(L, aHome) + mD` when home is on.
3. The switch: one query flag in the style of the repo's other render probes (find how `rp=gf` and its
   debug flags are read; do not add a codec param). With the flag: tables built with `home: true`, the shader
   path on, the fade uniform fed from the live `fadeLength` every frame without a table rebuild. Without it:
   today's shader text and tables, byte for byte (pin this in a test).
4. The uniform plumbing in `gf_pass.ts` / `gf_app.ts` is yours but keep it to the few lines needed: Muse batch
   24 is working in `gf_look.ts`, `gf_pass.ts` and `gf_app.ts` in the main checkout. Do not touch
   `gf_look.ts`, `gf_reveal.ts` or `gf_explore.ts`.

## Done

1. **GPU = mirror.** With the flag on, the GPU render equals `eval.ts` with home on, by the repo's existing
   parity tools (the GPU census compare c5 used, `gpucensus_cmp`), on def and muse_hash at `fadeLength` 0,
   the default and 1.2.
2. **Flag off.** Shader text, tables and pixels as on master; a test pins it.
3. **Live.** Dragging `fadeLength` with the flag on changes the junction fade with no table rebuild (show the
   rebuild counter or log, and three screenshots of one site).
4. **Cost.** `k1362c1_bench.ps1` under the perf lock (`$env:TEMP\claude-perf.lock`), flag off against
   master (within 5%), and flag on against flag off, on the bench's two links, two rounds in alternating
   order. Report the on-cost plainly; it is not a gate here.
5. **Sheets.** Real GPU screenshots (headed, real time, never `--virtual-time-budget`) of the four open spots
   and the worse site, flag off | flag on at 0, default, 1.2 | rp=outline, under `.claude/probes/K1439/out/`.
6. **Tests.** `npm test` green, with every pin that moves named.

## How to work

- Work in your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5520-5539. Stop preview servers before a GPU census, and run no CPU census beside it.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files). Never push. Never edit
  LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Helpers run on sonnet for mechanical work, with this stop rule.
- Look at every sheet yourself. A junction's shape is Levi's to judge: show it, don't pick it.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone),
whichever comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP,
append `### Handoff K1439` here, commit, and report: what holds, the flag's name and an example link, sheet
paths, numbers, a `Ledger items` list and K1439's handle fields.
