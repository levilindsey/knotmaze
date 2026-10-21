# K698 + K713: toasts clear of the controls, and the walker's leftovers

Ledger: K698 (phone toasts cover the bottom controls) and K713 (the K114
walker's leftovers). One stage, opus, 2 h cap; it should take about an
hour. Probes only beyond the files under "Yours".

## What to build

1. **Toasts clear of the controls (K698).** There is one toast:
   `showToast` (`src/ui/share.ts`), styled `.km-toast` in
   `src/ui/maze_hud.ts` (fixed, bottom-centred). On the phone (411x753,
   dsf 2.625) it covers the bottom controls:
   - the cut refusal over Undo (K703: gone by 1.7 s, and a touch still
     reaches Undo);
   - the lives toasts over the move pad;
   - the walker toasts over `.km-walk` and the pad.

   The stills are in the main checkout's `.claude/probes/K717/out/lives/`
   and `out/walker/`, and K703's in `.claude/probes/K703/out/`.

   Rec, build it unless the code shows a better way: at show time, place
   the toast above the highest visible bottom-anchored control (Undo, the
   move pad, `.km-walk`, and any HUD row down there), centred, keeping the
   safe-area floor; recompute on resize while it shows. A toast never
   covers a control and never takes a touch. Check the desktop (1400x900)
   and a landscape phone (753x411) too: nothing covered, nothing cut off.
2. **The walker's dot glow (K713).** `docs/design/K114_walker.md` line 51:
   "the head dot with a glow of its own, in the walker's colour (as 2.8
   gives the minotaur its red highlight), so it reads as not you". Only
   the route rims show today. Reuse the minotaur's highlight path; find it
   from the walker's route code and K80's 2.8 rows.
3. **No move pad in walker modes (K713).** The pad shows in Lead and
   Delay, but moves are refused there. Hide it while a walker mode is on,
   and show it again when the mode goes off. Keys keep refusing with
   the toast, as now.
4. **An upper-bound par reads `par ≤ n` (K713).** The par search reports
   `exact: false` past its budget; that par shows as a plain par today.
   Mark it in the HUD, the banner and the share, only when inexact. No
   daily hits one, so pin it with unit tests on the formatters. K706 call
   6 (par 0) stays as built.

## Done when

- Toasts: page stills under phone emulation (411x753, dsf 2.625, touch)
  of the cut refusal, a lives toast (a minotaur catch with `mlv=3`) and a
  walker toast ("It's going in circles."), each with its controls in
  view. A probe check that the toast's rect meets no visible control's
  rect, on the phone emulation, the landscape phone and the desktop.
- The glow: stills of Lead on seed 7, before Go and while walking
  (desktop and phone emulation).
- The pad: stills with no pad in Lead and Delay, and the pad back in free
  play after the mode goes off.
- `par ≤ n`: unit tests.
- The K114 walker page driver passes again: copy
  `.claude/probes/K114/walker/page/` from the main checkout into your
  probes (`walker_page.mjs <desktop|phone> <lead|delay> 7`).
- `npm test` and `npm run build` pass, and the golden stays
  byte-identical.

## Constraints

- **Agents beside you.** Stay out of their files. If a change seems to
  need one, stop and report. The coordinator updates this table at
  launch.

  | Agent | Files |
  |---|---|
  | K137 s2, the player's aids (until about 03:20) | new spool, hint, compass and chalk modules and their tests; its rows in `fabric_controller.ts`, `maze_hud.ts`, `maze_stats.ts` and `share_text.ts`; the yarn's reel-in in `fabric_maze_renderer.ts`; the chalk tick in `marker_glyphs.ts` and `marker_mesh.ts`; its buttons, keys, params, panel rows and lore |
  | K137 s3c, after s2 (sprint, more than one monster, sleepers, the follower) | `minotaur.ts`, `minotaur_turns.ts`, `mino_feedback.ts`; new sprint, monster-list, sleeper and follower modules; `syncMinotaur` and the monster markers; main.ts's catch code, the minotaur frame and sprint's state; sprint's button and key; its rows in the shared files above |
  | K138 s1, the rule kit, ice runs and the color rule (until about 04:16) | `rule_search.ts`, `ice.ts`, `color_rule.ts` and their tests; its rows in `fabric_controller.ts`, `maze_hud.ts`, `maze_stats.ts`, `share_text.ts` and `src/app/rule_loss.ts`; the run-table override in `src/app/scene.ts` and `section_colors.ts`; cycle's glyphs in `marker_glyphs.ts` and `marker_mesh.ts`; `carryStep`'s gate and its refusal toast in `src/main.ts`; its params, panel rows, probe hooks and lore |
  | K726, phone sitting (probes only, main checkout, until about 03:16) | `.claude/probes/K726/`; the phone |

  Your par rows share `maze_hud.ts` and `share_text.ts` with K137 and
  K138; add your own rows rather than reshaping theirs, and keep both
  sides when you rebase. The walker's glow reuses the minotaur's
  highlight path, which K137 s3c owns: call it or add beside it, and
  don't change what it draws for the minotaur.

- **Yours:** `showToast` and the `.km-toast` CSS; the pad's visibility
  rule (`src/ui/move_pad.ts` and its call site); the walker's glow (its
  rows in the renderer); the par formatting (your rows in `maze_hud.ts`
  and `share_text.ts`); your probes and lore.
- **Out of scope:** the toasts' wording; the walker's rules; Levi's calls
  K706 and K707; the K714 balance probe; K138's new refusal toast (it
  goes through `showToast`, so your placement covers it); a real phone
  pass.
- **Probes and ports.** Probes go in `.claude/probes/K698/` in your
  worktree (untracked). Use ports 5698-5701. Never use
  `--virtual-time-budget`. Give every Chrome a fresh temp profile. Every
  link carries `&snd=none`; never load the bare URL (it is today's
  daily). Take no performance measurements.
- **Rebase** onto master before your final report (`git fetch`, then
  `git rebase origin/master`), and check that `npm test` passes.

## Stop rule

Stop when the stage is done or at the 2 h wall-clock cap, whichever comes
first. Run `Get-Date` at the start and at each milestone. Commit WIP to
your branch at every milestone, green or not, and never push.

A compaction is not a stop: after one, re-read this brief and `git log`
before going on. Keep reads narrow (Grep -n, then Read with
offset/limit). Any helper runs on sonnet with a 1 h cap under this same
rule.

When you stop:
- commit WIP;
- append a "Handoff" section to this brief: what landed, the stills, the
  rect checks, the residuals and the handle fields;
- report, ending with the K698 handle fields and a `Ledger items` list.

## Handoff (2026-10-21, 03:30)

The stage is done, inside the cap (start 02:31). Seven WIP commits on
`worktree-agent-aef1574433a327ce7`, rebased onto origin/master `af225069`
(only docs and the ledger came in), then this handoff.

### What landed

1. **Toasts clear of the controls (K698).** `src/ui/toast_place.ts`
   `toastBottom` (pure; `test/ui/toast_place.test.ts`) lifts the toast
   10 px (TOAST_GAP) above the highest shown control in its column at the
   bottom of the screen, never below the CSS floor and never past the top
   margin. `src/ui/share.ts` `placeToast` places it when it shows and again
   on a resize while it shows. It finds the controls by class:
   **`km-control` (`TOAST_AVOID_CLASS`, exported from `src/ui/share.ts`)**,
   plus `.km-cut`, `.km-walk`, `.km-aid`, `.km-pad`, `.km-banner` and
   `.km-ind`, plus the chrome the edge indicators avoid
   (`setToastAvoid(() => indicators.chrome())` in main.ts;
   `OffscreenIndicators.chrome()`). A control counts when it is laid out,
   visible, opaque and takes touches. **For K137 s3c: give the sprint
   button (or its group) the class `km-control`; nothing else is needed.**
   K138's new refusal toast goes through showToast, so it is placed too.
   On a landscape phone the toasts stay at the floor: no control sits in
   their column.
2. **The walker's dot glow (K713).** `placeWalkerGlow`
   (`fabric_maze_renderer.ts`): the minotaur highlight's radial gradient in
   WALKER_COLOR (`walkerGlowTexture`), at MINO_GLOW_DIAM_HUNT (3.8 radii)
   and WALKER_GLOW_ALPHA 1, in overContainer just under the head marker,
   whenever `controller.walkerMode` is set (Lead and Delay: before Go,
   walking and after). syncMinotaur and the minotaur's texture are
   untouched. At the minotaur's plain size (3 radii, alpha 0.9) it read
   only as a faint fringe past the head's rings
   (`shots/zoom_walker_glow_phone.png` against `zoom_mino_glow_phone.png`,
   both from before the change), hence the hunting size.
3. **No move pad in walker modes (K713).** `src/app/frame_loop.ts`: the
   pad shows only while no walker mode is on
   (`!scene.fabricController?.walkerMode`); the keys still toast why.
4. **`par ≤ P` (K713).** `WalkerScore.upper` (`walker.ts`), set in main.ts
   when `leadPar`'s `exact` is false, reaches the HUD and banner row
   ("cuts N · par ≤ P", maze_hud `ruleEntries`), the share tag
   (", par ≤ P", share_text `walkerTag`) and the stars' popover ("par is
   at most P"; `rateCuts`'s `upper` changes the words, not the stars).
   Tests: `test/ui/maze_hud.test.ts`, `test/game/share_text.test.ts`,
   `test/game/star_rating.test.ts`. Par 0 stays as built (K706 call 6).
   Seed 7's par is exact, as on dailies 1-30, so the stills read
   "par 1".
5. **Lore:** gameplay-indicators.md (THE TOASTS), gameplay-mechanisms.md
   (the walker's glow, pad and par), gameplay-moves.md (the pad),
   gameplay-stars.md (`upper`), probes.md (the K698 probe) and
   `docs/lore_index.md` (share.ts and toast_place.ts now attach
   gameplay-indicators.md).

### Gate (after the rebase)

- `npm test`: 134 files and 1936 tests pass (1 skipped: the manual sweep).
- `npm run build` (tsc, notices, vite): passes.
- The golden `test/physics/byte_identity.test.ts`: 2/2, byte-identical.
- The K114 walker driver (`.claude/probes/K698/walker_page/walker_page.mjs`,
  seed 7): Lead 20/20 on desktop and phone, Delay 12/12 on desktop and
  phone.

### Rect checks

`.claude/probes/K698/k698.mjs <case> <phone|land|desk> [seed]` (seed 7;
`run.ps1 case:vp ...` runs a batch) writes `out/k698_<case>_<vp>.json`
and `shots/k698_<case>_<vp>_<name>.png`. Every run: 0 FAIL, 0 errors.
Rects are [left, top, right, bottom] in CSS px. Phone is 411x753, dsf
2.625, touch; land is 753x411; desk is 1400x900. Each case also checks
every toast the app showed on its own during the run.

| Case | Phone | Land | Desk |
|---|---|---|---|
| Cut refusal (a real tap on the entrance run) | [46,563,366,596], 10 px above the pad [263,605,395,737] (8/8) | [217,360,537,393], at the floor (8/8) | [540,849,860,882], at the floor; [340,569,660,602] after a resize to 1000x620 (12/12) |
| Lives, a real catch (`mt=hunter&mlv=3`) | [130,563,282,596], 10 px above the pad (6/6) | [301,360,453,393] (6/6) | [624,849,776,882] (6/6) |
| Walker, "It's going in circles." (Lead, Go) | [135,639,276,672], 10 px above the walker buttons [16,681,191,729] (7/7) | [306,360,447,393] (7/7) | [630,849,770,882] (7/7) |
| Aids (`hn=3`, chalk on), cut refusal | [46,563,366,596]; aids group [16,621,122,669] clear (9/9) | | |
| The sword's three toasts (K726's report) | 10 px above the pad (22/22) | at the floor, clear of the pad [605,263,737,395] (22/22) | |
| The pad | none in Lead and Delay; back at [263,605,395,737] with the mode off, and in free play (5/5) | | |
| The glow (Lead) | before Go and walking: under the head, at the head, same parent; none in free play (3/3) | | the same (3/3) |

Stills (in `.claude/probes/K698/shots/`):

- **Toasts, phone:** `k698_cut_phone_refusal.png`,
  `k698_lives_phone_caught.png`, `k698_walker_phone_circles.png`,
  `k698_aids_phone_refusal.png`,
  `k698_sword_phone_sword_{pickup,slain,spent}.png`.
- **Toasts, land and desk:** the `_land` and `_desk` equivalents.
- **Pad:** `k698_pad_phone_{lead,delay,mode_off,free_play}.png`.
- **Glow:** `k698_glow_{phone,desk}_{before_go,walking,free_play}.png`,
  each with a `_crop`.
- **Walker driver:** `walker_*.png`.

The panel stamp in the stills reads the dev server's start SHA
(`cd1f4476`), but the server served the working tree. The glow re-shoot
shows 613c8e9b's size: its JSON gives gsize 1.976, which is 3.8 radii.

### Residuals

- **Mid-toast controls.** A control that appears while a toast shows does
  not move it: placement runs at show time and on resize only.
- **Panel and sheet.** The panel and the phone's settings sheet are not
  avoided. An open sheet covers the bottom controls anyway, and at
  1400 wide the desktop's side panel is outside the toast's column.
- **Aids and the indicators.** `aidButtons.el` is not in the indicators'
  avoid list. That list is K137's; the toast finds the aids by `.km-aid`.
- **New bottom controls.** They must carry `km-control` (K137 s3c's sprint
  button).
- **cutRules().** It still says "the fewest cuts" for an upper-bound par.
- **Glow tuning.** The glow's size and alpha are open to tuning (Levi).
- **Sword toasts.** They were shown through the app's own showToast on
  the sword's layout, not after a walked pickup.
- **No hints left.** "No hints left" can't be reached by a tap: the Hint
  button disables at 0.
- **Refusal kind.** On seed 7 the probe found no run whose cut is refused
  for "no way out" (`refused: null`), so the refusal shown is the
  entrance-run toast. Both go through the same showToast path.

### Handle fields

- owner: nobody since 2026-10-21 03:30 (claude agent
  `agent-aef1574433a327ce7` of claude session
  91b19e11-7759-4638-ba60-4705b011b94f; stage done)
- branch: `worktree-agent-aef1574433a327ce7`, worktree
  `.claude/worktrees/agent-aef1574433a327ce7`; last commit: this handoff
  (on 613c8e9b), unpushed
- evidence: `.claude/probes/K698/` in the worktree (untracked): `k698.mjs`,
  `run.ps1`, `out/`, `shots/`, `walker_page/`
- next: merge (coordinator); Levi judges the walker glow's size and alpha
- brief: `docs/design/K698_polish.md`
