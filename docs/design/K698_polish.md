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
