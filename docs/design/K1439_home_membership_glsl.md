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

### Handoff K1439

Stopped 2026-11-16 22:45 at the 2 h cap (started 21:06). Branch `worktree-agent-ab538fa67ad6c86dd` (worktree
`.claude/worktrees/agent-ab538fa67ad6c86dd`), from master cfb1f30b. The source has not changed since 963029e8:
`gf_glsl.ts` (`homeForm`), `gf_keys.ts` (arms widened by aHome when `T.homeOn`), `gf_pass.ts` (`{ home: true }`,
`uHomeZ`), `gf_app.ts` (`pass.homeFade = lookFade(r)` each frame, `__knotGf.home`), `frame_loop.ts` (reads `gfh=1`).
The flag is `gfh=1`, off by default, and needs `rp=gf`, for example `?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1`.

Done, item by item (measured unless marked inferred):
1. GPU = mirror: holds on def, and partly on muse_hash. Measured with `k1439_parity.ts`, not `gpucensus_cmp`
   (`out/parity_p80.json`, RX 6800 XT, ppu 80). def sits at the flag-off control floor at fl 0 / 0.14 / 1.2
   (ink max 3.0e-3 / 1.7e-3 / 6.9e-4, 0 px past 1e-2). muse_hash at fl 1.2 sits at the floor (6.1e-3, 0 px).
   At fl 0, 1 px is past 1e-2 (0.219), out of 151526 px that home changes. At fl 0.14, 2 px are past it (max
   0.0386), out of 168745. `k1439_why.ts` explains two of those pixels; the third (the second at fl 0.14) is
   unexamined:
   - the fl 0 pixel is a hard step at a depth tent's foot: s is 9.6e-6 from the foot, and f32 projection error
     reaches 8.7e-6;
   - one fl 0.14 pixel is a fold tie: two segments 1.1e-6 apart, with a predicted ink difference of 0.039
     against 0.0386 measured.
2. Flag off: the shader text, keys and pack hold, pinned to master's digests by `test/render/gf_home_glsl.test.ts`.
   The pixels were not compared, so "as on master" is inferred from those pins. `k1439_offab.ps1` failed twice
   (`out/offab.log`):
   - the master page stuck in "loading" for 120 s (cause not found; a later load went live in 8 s);
   - then it waited on Muse's perf lock until the cap.
3. Live: holds. Every fl change (0, 0.14, 1.2) and a 25-step sweep from 0 to 1.2 read `rebuilds +0`, on both
   scenes. `__knotGf.home.fade` tracked fl. Each site has a screenshot at each fl (`out/sheets.log`).
4. Cost: `out/bench_r1.json`, `out/bench_r2.json`. Two rounds of `k1362c1_bench.ps1`, in alternating order, on
   `b` and `p9ar6`; drag p50 in ms as frame / work / GPU net:

   | link | build | R1 | R2 |
   |---|---|---|---|
   | b | master | 16.1 / 15.6 / 13.05 | 15.7 / 14.9 / 13.22 |
   | b | flag off | 5.9 / 15.9 / 3.99 (outlier, cause unknown) | 15.8 / 15.1 / 13.26 |
   | b | gfh=1 | 16.2 / 18.2 / 13.05 | 15.5 / 14.9 / 13.04 |
   | p9ar6 | master | 16.0 / 16.5 / 13.23 | 15.8 / 15.6 / 13.22 |
   | p9ar6 | flag off | 16.0 / 16.6 / 13.25 | 15.7 / 15.6 / 13.22 |
   | p9ar6 | gfh=1 | 15.6 / 16.2 / 12.64 | 15.8 / 15.2 / 12.98 |

   - Flag off is within about 1% of master on the clean pairs.
   - gfh=1 costs nothing measurable. Inferred: GPU net reads about 13 ms on every page, likely the GPU clock
     governor at app pacing, so this bench cannot resolve a pass's cost.
   - b R1 gfh=1's work 18.2 (tables 15.6) did not repeat in R2. The Pixel was not measured.
5. Sheets: `.claude/probes/K1439/out/sheets/`, on the census capture links, real GPU, headed, real time:
   - `sheet_muse_hash.png` and `sheet_g41_user_tw64.png`: flag off | gfh=1 at fl 0 / 0.14 / 1.2 | rp=outline;
   - `sheet_offfl_*.png`: flag off at each fl beside gfh=1 at each fl;
   - spot crops `<scene>_<spot>_*.png`.

   On g41, the gfh=1 page settled at the census state 0d51331b, but the off and outline pages settled at c1b63637
   (in-thread, `stb=0`). So on that sheet off against on is not a same-state comparison. rp=gf draws ink only on
   both scenes, which is master's rp=gf look (`out/look/`).
6. Tests: `npm test` green, 249 files and 3098 tests (`npm_test.txt`). No existing pin moved. The new
   `gf_home_glsl.test.ts` pins master's flag-off programs, keys and pack.

Next:
- Levi judges the sheets' junction shapes and decides whether home becomes the default.
- If the flag-off pixels need observing, rerun `k1439_offab.ps1 -Branch 963029e8` (builds under
  `$env:TEMP\k1439pv`; it takes the perf lock).
