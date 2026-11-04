# K1171: one dropdown for fragile runs and collapse (Muse run 15E)

The coordinator's brief, 2026-11-03. One run for Muse, on master, after
run 15B (K778), which adds its undo row to the same panel folder and its
entry to the same codec table.

## Why

Levi, 2026-11-03, about the Rules folder's Fragile runs and Collapse
rows: "Seems like we should maybe combine these two param drop downs?"

Since K840 the two share their moves: snap and collapse both break every
run after one crossing (END runs too, title runs never), so both walks
are trails, stranded when no unbroken route to the exit is left. What
differs is the goal: snap is the classic maze (reach the exit; Par
applies), collapse wants the longest trail (the share collapsed, against
`collapsePar`). Collapse overrides Fragile runs and Par (`setRules`), so
the two rows allow pairs where one of them silently does nothing.

## The run

1. One param replaces `fragile` and `collapse`. Its options, in this
   order and with these panel labels: off, crack, snap, collapse and
   collapse (free), the last two being today's Collapse finish and
   free. Name the param, its values and its type as you see fit. The
   controller keeps its two fields, derived from
   the one param where params reach it (`fabricRulesOf`) and wherever
   else `params.fragile` or `params.collapse` is read (main.ts, maze_hud,
   rule_loss, share_text, undo_stack, param_tags, the renderer, shader
   warmup, pluck_overlay, probe_hooks). Every option gives the controller
   exactly the rules its old pair gave.
2. The link: one codec entry where `fragile`'s is; remove `collapse`'s and
   bump `CODEC_VERSION` by one (a removal; CLAUDE.md's pre-launch rule, no
   back-compat). key=value links read the merged param from `fg`; `cl`
   goes. Re-freeze the pins this moves and name them in the commit. Both
   defaults are off, so the dailies do not move: the golden dailies stay
   as they are.
3. The panel: one row, label "Fragile runs", in Fragile runs' place. Its
   help joins the two rows' help (what each option does; the collapse
   options override Par; a change restarts the solve). While a collapse
   option is chosen the Par rows are disabled (still shown, as K139's
   call 4 keeps them). The cracked-run rows (tint, width) stay
   hidden under off, as today (`tweakpane_panel.ts` hides them when
   fragile is off); hide them under another option only where nothing
   draws a cracked run (read what draws them first). Panel search finds the row by both old names
   (param_tags).
4. Fix the K137 comment in `src/game/fabric_controller.ts`: since K840
   END runs break like any other run (game/fragile.ts's header is right).
5. Tests: move every test that sets `fragile` or `collapse` to the one
   param, and the panel search fixture. Add one that maps each of the
   five options to its old pair of rules, and a link round trip of each
   option.
6. A desktop probe (desktop Chrome only, never the phone): for each
   option, set it through the panel, read the controller's rules through
   the probe hooks, and round-trip the link. One screenshot of the Rules
   folder under snap and one under collapse, to
   `.claude/probes/K1171/shots/`.
7. `npm test`, then commit and push. CI green after the push.

Ports: 5580-5584.

## How to work

Batch 15's How to work (`docs/design/K1169_muse_batch15.md`) applies,
with one change: update K1171's handle, not K1169's:
`ledger.mjs handle K1171 --last-commit <sha8> --next "Run 15E done; Claude reviews the Rules folder shots"`.
Area rules: `.claude/rules/gameplay-links.md` (the codec, url_state),
`.claude/rules/gameplay-panel.md`, and the rules file that
`docs/lore_index.md` lists for `src/game/fragile.ts`.

Report: the option-to-rules table, the codec version and the pins that
moved, the test counts, the commit, and the shots' paths.
