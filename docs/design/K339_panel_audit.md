# K339-K340: the settings panel's audit, reorganization and nested folders

One design stage, Opus, with a two-hour cap. It audits every row of the
settings panel, proposes a reorganization (moves, removals, merges,
labels), and prototypes a look that sets nested folders apart from their
parents. Its output is this document's new sections, an inventory table
and a screenshot sheet. Code changes come in a later build stage, after
Levi answers.

## Levi's words (2026-10-14, verbatim)

About 22:48:

> Ohhh, I didn't notice the nested folders before in the settings panel. We should do something to make these look more distinct from parent folders. Not sure what.
>
> We should also audit the current list of settings in this panel, and reorganize them now. We should also consider whether any properties are worth removing now, or combining/refactoring. We should also plan to do this again when we're all done iterating through all these designs.

Earlier, about 19:03 (K297):

> Eventually, we'll end up hiding most of these settings, and exposing a more paired-down set of settings for the average user.

Pre-launch rule (CLAUDE.md): "Breaking changes are 100% fine." A removal
or merge may break old links. Say what moves, and re-freeze the pins.

## What is there today

- `src/ui/tweakpane_panel.ts` builds the panel on Tweakpane:
  - the folder helper is near line 563 (`host.addFolder({ title, expanded })`);
  - the rows follow;
  - the visibility sync is near lines 1930-2040 (`row.hidden = ...`). It
    hides a dependent row while its parent is off. This is the hidden-row
    pattern that K323, K335 and K318 reuse.
- `src/ui/url_state.ts` holds `PARAM_DEFAULTS`, every param with its
  default.
- `src/ui/param_codec.ts` holds `CODEC_PARAMS`, the link codec's live
  table. It is at version 5, and indices up to 134 are taken. Its header
  is the format spec.
- `src/ui/daily_link.ts` holds `DAILY_EXEMPT_KEYS`, the viewer
  preferences that a daily keeps.
- Lore:
  - `.claude/rules/gameplay-panel.md` covers the panel rules, the
    pathViz labels, live recolor, gridAlign, the background rows and the
    Accessibility folder. It attaches by itself when you read the panel
    file.
  - `docs/lore_index.md` lists the other rules files.
- **Designs in flight that move or add rows.** Read their panel sections.
  The audit must agree with them, or say what it changes and why.
  - **K323**, `docs/design/K323_game_mode.md`: the Game folder,
    `gameMode`, `minoPull`, the labels (K327), and knot mode's removal
    (K326, sections 4-5). Section 6's questions 1, 3 and 4 move into this
    audit: the folder's name and place, fog moving into Game, and the
    labels. The other K323 questions went to Levi separately.
  - **K324**, `docs/design/K324_realtime_minotaur.md`: ten new knobs in a
    collapsed tuning subfolder.
  - **K318**, `docs/design/K318_win_effects.md`: 13 themes and their
    layers, each with dependent rows. This will be the panel's largest
    block.
  - **K335**, `docs/design/K335_confetti.md`, being built now: rows for
    the cannons, the streamers and the shine in the confetti folder.
  - **K331**, approved: a touch pick-margin row beside K298's
    `pickMargin` and `pickChoiceRatio`.
  - **K328**: rows for the hover glow's rim profile.
  - **K111 stage 5**: Accessibility rows, including K265's high contrast.
  - **K297**: the pared-down set, later.

## The stage

1. **Inventory.** Build a table of every row with these columns:
   - folder path, label and param key;
   - codec index and short key;
   - type and default, with the range or the options;
   - viewer preference (in `DAILY_EXEMPT_KEYS`) or design param;
   - when it shows (its hidden rule);
   - the ledger item that added it (from `git log -S` or the lore);
   - who reads it.

   Generate the table with a script, so K341 can rerun it after the
   design churn. Make it tracked (`scripts/panel_inventory.mjs` or
   `.ts`, run by node or tsx), outside the build. Commit the table as
   `docs/design/K339_inventory.md`.
2. **Findings.** From the inventory, list:
   - rows that nothing reads, or that do nothing at today's defaults;
   - rows that matter only in knot mode, which go with K326;
   - developer and debug rows: a Developer folder, last and collapsed?
   - overlaps:
     - two rows for one idea;
     - several booleans that are really one dropdown;
     - sliders whose useful range is a small part of their range;
   - labels that don't say what they do. K327's rule: a label says what
     it sizes or changes, in words, with no camelCase;
   - rows in the wrong place, such as a viewer preference in a design
     folder or a design param in Accessibility;
   - mismatches with `DAILY_EXEMPT_KEYS`.
3. **A proposed tree.** Give:
   - the top-level folders in order;
   - the nested folders;
   - which folders start open;
   - where each row goes;
   - a home for each incoming row listed above.

   Give each move a reason, and keep the panel's existing rules in
   `gameplay-panel.md`.
4. **Removals and merges, and their codec cost.** For each one, say:
   - what goes and what replaces it;
   - what old links lose;
   - the codec change.

   Fold all of them into one bump, shared with K323 stage 1's (5 to 6).
   K76 stage 2c also bumps the codec; whichever merges second bumps
   again. List the pins to re-freeze: the codec pin, the golden dailies,
   and any others.
5. **Nested folders (K340).** Today a nested folder looks like its
   parent. Prototype three or four looks with CSS, for example:
   - an indent with a thin left rule in the panel's accent color;
   - a lighter or darker title bar with a smaller, non-bold title;
   - a different chevron, or a "›" before the title;
   - a background tint that deepens with depth.

   Combine what works. Inject the CSS from your probe (puppeteer
   `addStyleTag`) rather than editing `src`, so the branch holds only
   `docs/` and `scripts/`. The look must hold at depths 2 and 3, because
   K324's tuning subfolder will sit inside Game.

   Screenshot each look at 1400x900 and at 411x753 (the phone layout),
   with a parent folder open and a nested folder open inside it. If the
   panel has more than one theme, cover each theme. Put the sheet in
   `.claude/probes/K339/sheet/`, and recommend one look.
6. **Questions for Levi.** Ask as few as you can, each with your
   recommendation, in a section titled "Questions".
7. **The build plan.** Lay out the stages and their order against the
   agents now in flight:
   - K329 (the arrow keys) edits `src/main.ts`;
   - K335 (confetti) adds panel rows and codec entries;
   - K321 (credits) edits the panel's credit link.

   Recommend whether K323's stage 1 and this reorganization ship as one
   stage, with one panel rewrite and one codec bump. The coordinator
   expects yes.
8. **The second audit (K341).** Levi wants this audit again once the
   design iteration is done. Write what that pass reruns: the inventory
   script and the findings checklist. Then say how it feeds K297's
   pared-down set, meaning which rows a casual player sees and how the
   rest are reached.

## Verification

- The inventory script runs clean. Check its table against the live
  panel: spot-check ten rows against a screenshot.
- The sheet for item 5.
- Nothing tracked outside `docs/` and `scripts/` changes, so `npm test`
  needs no run. If you add a test for the inventory script, run it.

## Setup

- **Your branch starts from master.** Run `git log -1 --oneline` first.
  If this file is missing, run `git merge --ff-only origin/master`.
- **`node_modules`:** link it to the main checkout's with a junction
  (`New-Item -ItemType Junction node_modules -Target
  C:\Users\lsl\Repositories\knotmaze\node_modules`). Before you remove
  anything that contains the junction, run
  `(Get-Item node_modules).Delete()`. A recursive delete or
  `git worktree remove --force` follows the junction and empties the main
  checkout's packages.
- **Servers:** use ports 5880-5889, and give your vite server a private
  cacheDir (see `probes.md`). Leave port 5173 alone; it is Levi's.
- **Chrome:** give each instance you launch its own `--user-data-dir` in
  your probes folder, and delete it when you are done (K161).
- **Files:** probes, logs and notes go in `.claude/probes/K339/`. It is
  untracked; the coordinator copies it at the merge.
- **The phone is off-limits.**

## Process

- **One stage.**
  - Run `Get-Date` at the start and at each milestone.
  - Commit WIP on your branch at every milestone, and never push.
  - Don't edit `LEDGER.md`.
- **The stop.** Stop when items 1-8 are done and verified, or at your
  cap, whichever comes first. The cap is two hours on Opus.
  - Neither a compaction nor context size is a stop. After a compaction,
    re-read this brief and `git log`, then go on.
  - Read large files in ranges.
  - At the stop, commit WIP, append a "Stage 1 handoff" section to this
    file, commit it and report.
- **The final report covers:**
  - the findings and the proposed tree, in short;
  - the recommended nested-folder look, with the sheet's path;
  - the questions;
  - a `Ledger items` list;
  - the handle fields: branch, last commit, evidence and next.

  Keep what you observed apart from what you inferred.
