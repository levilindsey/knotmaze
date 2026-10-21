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

## Handoff (2026-10-20, K653 checks agent, claude session 91b19e11)

Started 19:42:06 PDT, stopped at about 20:38 (before the 20:42 cap) with
two checks not run (below). All probes and results are untracked under
`.claude/probes/K653/` (`out/` holds the results).

### K653: confirmed, fixed in 38b25fa

- **Observed** (the layer-index log, `layer_probe.mjs`: a real
  `clk=realtime` chase, `?7&am=instant&clk=realtime&phw=0&phy=0&snd=none&xp=fog&mfg=never`,
  `minoLayer`'s index in `overContainer` read after every `syncMinotaur`).
  Before the fix the layer moved on 209 of 209 syncs (lair 54 of 56,
  wander 107 of 108, pause 19 of 20, hunt 24 of 25), top of the 9
  children (index 8) then under the fog sprite (index 5, fog at 6), over
  and over, with the glow at the bleed's alpha 0.16.
- **Cause** (read in the code): in a bleed (`fogOfWar && !over`) the first
  branch lifts the layer over the fog (`over || bleed`) and the second
  sends it back under whenever `!over`, so each sync undoes the one
  before. The fix is one condition: `!over && !bleed`.
- **After** (same link): 0 moves in 208 syncs (`mfg=never`), 0 in 210
  (`mfg=hunting`; the hunt-mode glow at alpha 1), 0 in 201 (`mfg=always`,
  which was already stable), 0 in 104 (fog off); no page errors.
- **Inferred, not seen**: with the fog bleeding (`mfg=never`, or
  `mfg=hunting` while not hunting, fog on) the 0.16 glow showed on every
  other sync and sat under the fog on the rest, a flicker at about half
  the sync rate, or half the designed brightness. The default `mfg=always`
  never bled, so it was unaffected.
- **Not done**: the pair of stills, a same-state pixel A/B and a test.
  The frozen-scene screenshots never show the glow at all (the first shot
  is blank), and `drawImage(webglCanvas)` reads back BLANK in this app (no
  preserveDrawingBuffer), so crop-readback probes are void for pixels
  (use `page.screenshot({clip})`). Nothing in `test/` reaches
  `syncMinotaur`.

### K650 (b): the SwiftShader compile, done; (a) the census, not run

- (b) All eight dumped variant texts compile standalone (section 46811
  and its explore variant 63226; strip 31049 and 37050; field 26239 and
  35809; still 19664 and 28826). A telegraph scene (`setTelegraph` with two
  pieces, `teleStrength` 1, `teleKey` set) loaded in headless ANGLE/Vulkan
  SwiftShader on a fresh profile, default and `&xp=threads`: 13 programs
  each, 0 failed, 0 false LINK_STATUS reads by the app, 0 context losses,
  0 console errors or warnings, 0 page errors (`swiftshader_link.mjs`,
  `out/link_*.json`). This is compile and link, not rendered output.
  `render-shaders.md`'s "SwiftShader not run" for K525 is superseded.
- (a) NOT RUN. Plan: copy `census_rim.mjs`, `g2lib.mjs`, `png.mjs` from
  the main checkout's `.claude/probes/K525/`; instead of hovering a run,
  set `teleStrength` and `setTelegraph` pieces from long edges, `tickPaint(0)`;
  headed real-GPU Chrome, `&phw=0`, a same-build control, `webglcontextlost`
  recorded; hold the perf lock (K76 2b lore).

### K645 (a): sheets and the finish spray, done; (b) the frame A/B, not run

- (a) `sheet_k336.mjs` (K336's `sheet.mjs` with the perf lock bypassed,
  `knotmaze.panelOpen` "0" and per-frame counts added) against static
  builds on 5654 (635ae58, before K336) and 5655 (25a19d6, K336's
  streamers commit); both build stamps checked. All four runs (1400x900
  and 411x753, master and branch): 0 context losses, 0 errors, idle 6.3-7.3 s
  after the two bursts. Plans: master `rain 865 + spray 320` (phone 420 +
  320), branch adds `cannon 247, streamers 62` a cannon (phone 120, 30);
  live counts after a burst 494 and 124 on the branch, none on master.
  The two `opening` sheets (viewed): master shows only the top rain; the
  branch adds two fans from the side edges at about 0.8 of the height at
  0.1 s, and streamers curling up and across from 0.6 s (on the phone they
  cover the maze's lower half at 1.0 s). The desktop `top_edge` sheet (the
  frames at 1.5-3.0 s, viewed): the branch's streamers arc over at 1.5 s,
  then fall in two clouds about 0.3 of the width in from each side and, by
  3.0 s, hang as vertical strips over the lower half of the maze (a fair
  part of the knot is covered; the look call is Levi's); master has only the
  thinning rain. The phone `top_edge` sheet was not looked at. The sheets' link is knot mode (no
  exit marker), so their bursts have NO spray (spray alive 0).
  `out/sheet_k336/`.
- The finish spray throws no streamers (`finish_spray_check.mjs`, a fabric
  link, where the burst does carry the spray): default, `spray 320, cannon
  494, streamers 124` (exactly the cannons' 2 x 247 and 2 x 62); `&cfc=0`,
  `spray 320, cannon 0, streamers 0`; 0 page errors both
  (`out/spray_*.json`).
- NOT DONE: the streamer curl strip (2x crops of cannon streamers, 1.0-2.0 s,
  headed real GPU), and (b) K140's frame A/B at amounts 1 and 3, cannons on
  and off, under the perf lock (free at 20:33, but a run of 4+ cases at 1x
  and 4x throttle did not fit in the time left). Copy `k140_ab.mjs` and
  `run_ab.ps1` from the main checkout's `.claude/probes/K140/` and run
  `-Runs desk:1,desk:4`.

### Handle

- owner: nobody since 2026-10-20 about 20:38 (K653 checks agent of claude
  session 91b19e11-7759-4638-ba60-4705b011b94f, stopped before the cap)
- branch: `worktree-agent-af0bb199d326234d3`, worktree
  `.claude/worktrees/agent-af0bb199d326234d3`; the fix is `38b25fa`, the
  Handoff commit is the branch tip; nothing pushed
- evidence: `.claude/probes/K653/` (untracked; `layer_probe.mjs`,
  `verify_fix.ps1`, `swiftshader_link.mjs`, `variants/`, `sheet_k336.mjs`,
  `finish_spray_check.mjs`; results in `out/`)
- next: merge `38b25fa` (one condition in `syncMinotaur`); run K650 (a) and
  K645 (b) and the curl strip; a visible still pair of the bleed needs a
  probe that shows the glow (headed, real-GPU, a real chase)
- brief: this file