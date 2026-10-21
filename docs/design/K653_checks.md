# K653, K650, K645: checks owed on merged work

Ledger: K653 holds the handle; the stage also covers K650 and K645. One
stage, sonnet, 1 h cap. Probes only, except the fix step 1 allows.

Do the three in this order and stop at the cap. Whatever is left stays
open.

## 1. K653: syncMinotaur's layer reorder

K525's agent read, but did not measure, a possible bug:
`syncMinotaur`'s layer reorder in `src/render/fabric_maze_renderer.ts`
(about lines 1495-1499) may undo itself on every other sync while the
fog bleeds.

- **Read** the reorder and its callers (Grep -n first).
- **Probe it on the page:**
  - run a real-time chase with the fog on (the fog lore names the
    params);
  - log the minotaur layer's index among its siblings, frame by frame,
    while the fog bleeds;
  - read the index through the existing probe hooks if they reach it.
    Otherwise use a temporary patch in your worktree and revert it
    before you commit.
- **If confirmed,** say what the player sees (a pair of stills) and
  give the fix.
  - Build the fix only if it is a few lines inside syncMinotaur, and a
    same-state A/B shows only the intended change.
  - Commit it, with a test if one fits.
- **If refuted,** say why the read was wrong.

## 2. K650: K525's two unrun checks

Context: the Handoff of `docs/design/K525_telegraph.md`, about lines 392
and 415.

- **The census.** Run the GPU-vs-mirror census for the TELE paint item.
  Adapt `census_rim.mjs` from K525's probes in the main checkout.
- **The SwiftShader compile** of the two longer shader texts. Load a
  telegraph scene in Chrome with `--use-angle=swiftshader`. Check that
  every program compiles and links, with no console errors.

## 3. K645: K336's unrun checks

Context: the Handoff of `docs/design/K336_cannons.md`.

- **The sheets.** Shoot the before-and-after sheets and the streamer
  curl strip with `.claude/probes/K336/sheet.mjs`, which has never run.
  - "Before" is master just before K336's first commit.
  - Check that the finish spray throws no streamers.
- **The A/B.** Run K140's GPU frame A/B at amounts 1 and 3, cannons on
  and off, under the perf lock.

## Constraints

- **Files.**
  - Change nothing in `src/` except the fix step 1 allows. No tests,
    docs or lore except that fix's.
  - Copy the harnesses you need from the main checkout's
    `.claude/probes/` into your worktree's `.claude/probes/K653/`.
  - Don't write to the main checkout, and don't touch other agents'
    worktrees.
- **Agents beside you.** Stay out of their files:
  - K324 stage 3 (the minotaur);
  - K580 stage 3 (the ribbon mesh);
  - K441 (`drawFire`);
  - K139 (gameplay, `syncExplore`).
- **Locks.**
  - Hold the perf lock (`$env:TEMP\claude-perf.lock`) for any frame-time
    measurement, and wait for it inside one blocking command.
  - The census, the compile check and the layer log need no lock.
  - Never use `--virtual-time-budget`.
  - Give every Chrome a fresh temp profile.
  - Use ports 5653-5656.

## Stop rule

Stop when the three are done or at the 1 h wall-clock cap, whichever
comes first. Run `Get-Date` at the start and at each milestone. Commit
any fix to your branch, and never push.

A compaction is not a stop: after one, re-read this brief before going
on. Keep reads narrow (Grep -n, then Read with offset/limit).

When you stop:
- append a "Handoff" section to this brief, with the results per item,
  what is left and the handle fields;
- commit it;
- report, ending with the handle fields and a `Ledger items` list.
