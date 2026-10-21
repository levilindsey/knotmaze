# K441: the real-time fire's frame cost, profiled on post-K409 code

Ledger: K441, the next step of K114's handle. One stage, sonnet, 1 h cap.
Build on master. Measure first; build only an invisible fix, and only in
the files named below.

## The call

K114's handle (Levi took round 2's recs; the burn race is his first
round-2 prototype) says: "next: K441's profile (K461 done: `rt_page.mjs`
passes `fsr` / `fdr`)". K441 itself, from the ledger: "The real-time
fire's frame cost (K114 s2 item 6): 0.6-1.2 ms more a frame than turn
(drawFire's re-declare 0.6, HUD writes 0.1, 0.5 unattributed). CPU-profile
a turn and a realtime stand at one burnt share (K461 first), then decide a
re-declare throttle."

## Where it stands

- **The stage 2 numbers** are `docs/design/K114_stage2.md`, item 6 and
  "The attribution run":
  - drawFire's re-declare costs about 0.6 ms (0.9 at 4x CPU throttling),
    and the HUD writes about 0.1;
  - about 0.5 ms (1.5 at 4x) is unattributed;
  - it was not a same-burnt-share comparison: the turn stand sat at L
    18.7 and realtime ran L from 25 to 73;
  - no throttle was added, because one "would recover at most drawFire's
    share and would step the front".
- **K409 has since rebuilt the fire look** (6b9eb8f..3231d59: world-unit
  fronts, the Gone ember ahead of the cut, the band kept). Every number
  above predates it, so measure again before deciding anything.
- **Why realtime pays every frame** (master,
  `src/render/fabric_maze_renderer.ts`):
  - `drawFire` (:1760) builds a key from L (:1782). Under the real-time
    clock L is `controller.fireNow`, which moves every frame. A turn
    stand keeps the key and returns early (:1785), running only
    `tickFireFx`.
  - On a new key, drawFire rebuilds every edge's spans and fronts, then
    calls `setBurn` (:2001). That calls `syncExplore` (:3265), whose
    burning branch builds `burnOnlyPieces` (:2027) for every chain and
    re-declares them through `ribbons.setExplore` (:3274).
  - main.ts advances the clock at :1717 and reads L at :1728.
- **The tools** are in the main checkout's `.claude/probes/K114/stage2/`:
  `perf_attr.ps1`, `perf_batch.ps1`, `burn_page.mjs`, and the old results
  in `out_attr/` and `out_perf/`. Copy what you need into
  `.claude/probes/K441/`.
  - `rt_page.mjs` takes `CLOCK=turn|realtime` (the `fck` key). Its
    `EXTRA` defaults to the realtime pair `&fsr=0.3&fdr=40` (K461).
    `fsp` / `fdl` set only the turn pair.
  - Its query is `?<seed>&am=instant&fi=fuse&fck=<clock>` plus `EXTRA`.

## Steps

1. **Same-share stands.**
   - Pick one burnt share, for example L about 40.
   - Turn: walk to L about 40 and stand there.
   - Realtime: stand still while the fire passes that L. Use a window
     short enough that the burnt share stays close, for example L from
     35 to 45.
2. **Frame cost.** For each clock, record the median and p90 frame time
   on desktop and at 4x CPU throttling, under the perf lock. Two rounds.
3. **The profile.**
   - Take a CPU profile (Chrome's Profiler domain) over the same windows.
   - Attribute the difference: drawFire's own rebuild, `setBurn`,
     `syncExplore` + `burnOnlyPieces`, `ribbons.setExplore` (the
     re-declare and its uploads), the HUD, main.ts's fire frame, and
     anything else over 0.1 ms.
   - Save the profiles and a `results.md` in `.claude/probes/K441/`.
4. **Decide.**
   - **Build** a fix only when:
     - the cost is redundant work;
     - the fix is invisible: the same output each frame, and a
       same-state A/B at 0 px;
     - it sits in drawFire's own body or main.ts's fire frame lines.

     For example, rebuilding edges whose spans can't have changed, or a
     HUD write of an unchanged string. **Commit.**
   - **Write up, don't build,** a fix that needs `setBurn`, `syncExplore`,
     `burnOnlyPieces`, `ribbon_renderer.ts` or `src/render/ribbon/`. One
     example is a fronts-only update when no span changed. K137 stage 1
     and K525 are editing those files. Put the site, the expected saving
     and a sketch in `results.md` and the handoff. It becomes K441 s2,
     after both merge.
   - **A throttle that steps the front is a look call.** Write its
     numbers and the option in `results.md`, and don't build it.
5. **Verify.** `npm test` and `npm run build` pass, and no pin moves.

## Constraints

- **Agents beside you.** Stay out of their files. If a fix needs one,
  write it up (step 4) instead.

  | Agent | Files |
  |---|---|
  | K137 stage 1 | `fabric_controller.ts`, `fragile.ts`, `par.ts`, `walk_graph.ts`, `maze_hud.ts`, `maze_stats.ts`, `share_text.ts`, `shader_warmup.ts`; in `fabric_maze_renderer.ts`, `syncExplore`, the pick and the `litArms` predicate; main.ts call sites; `__knotFabric` |
  | K525 | `fabric_maze_renderer.ts`'s telegraph (`drawTelegraph*`, its constants, `rimDecl`), `src/render/paint_*.ts`, `ribbon_renderer.ts`, `src/render/ribbon/`, `mino_feedback.ts`, its param row |
  | K324 stage 1, then stage 3 | `src/game/minotaur.ts` and its test, the param files, `undo_stack.ts`, `__knotChase` |
  | K546 stage 1 | `minotaur_turns.ts` and its test, main.ts's catch code |
  | The confetti lane (K336 + K186) | `src/render/confetti*.ts`, main.ts's `throwConfetti` and `showFabricWin`, the param files, `daily_link.ts` |

  - In `fabric_maze_renderer.ts`, keep to drawFire's body and its key.
  - In `main.ts`, keep to the fire's frame lines (about :1717-1728).
  - K442 and K443 are not yours. K442 waits for K137 stage 1, and K443
    is a label in the panel, which rides a later param stage.
- **No params.** This stage appends nothing to the codec.
- **Locks.**
  - Hold the perf lock for every timing. It is
    `$env:TEMP\claude-perf.lock`, one line: the owner, the start time and
    what.
  - Wait for it inside one blocking command. K525 and the confetti lane
    take it too.
  - Label any number taken under load as such.
- **Probes:**
  - Never use `--virtual-time-budget`, and use fresh temp Chrome
    profiles.
  - A bare URL is today's daily, so use the query above.
  - Probes and results go in `.claude/probes/K441/`, untracked.

## Stop rule

Stop when the stage is done or at the 1 h wall-clock cap, whichever comes
first. Run `Get-Date` at the start and at each milestone.

When you stop:
- commit WIP;
- append a "Handoff" section to this doc, with:
  - the attribution table (desktop and 4x);
  - what you fixed and its A/B;
  - K441 s2's site, saving and sketch, if any;
  - the throttle option's numbers, if any;
  - the item's handle fields;
- report.

Never push. A compaction is not a stop: after one, re-read this brief and
`git log` before going on. Run no helpers.

End your report with the item's handle fields and a `Ledger items` list.
