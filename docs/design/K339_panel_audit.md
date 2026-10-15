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

# Stage 1 results (2026-10-14)

"Observed" marks what the inventory, a probe or a grep showed;
"inferred" marks a reading of it. The inventory is `K339_inventory.md`,
generated by `scripts/panel_inventory.ts`. The probes are in
`.claude/probes/K339/` (untracked; the coordinator copies it at the
merge).

## Findings

**The panel today (observed).**
- 149 rows and 4 buttons in 12 folders. Three are nested: Maze › Burn
  race, Maze › Minotaur, and Maze › Minotaur › Minotaur behavior (depth
  3).
- By kind: 94 design params (the seed included), 41 viewer preferences
  in the link (`DAILY_EXEMPT_KEYS`), and 14 settings kept per browser,
  never in a link.
- At first load (maze mode, every folder at its default fold), 58 rows
  and buttons show: Accessibility 2, Design 8, Maze 31, Look 17. 45 rows
  are hidden at today's defaults.
- Folder bars compute the same at depths 1, 2 and 3: background
  `rgba(187,188,196,0.1)`, `500 11px Roboto Mono`, 24 px tall on the
  desktop and 34 px on the phone. Depth shows only as Tweakpane's 4 px
  indent strip. The panel has one theme. (`computed.json`)
- Labels: 139 rows show their camelCase key, 8 show words, and 2 show
  the key plus a unit ("(x your pace)").
- On the desktop the panel is 256 px wide, Tweakpane's default (its root
  view measures 246), with a 160 px value column, so a label shows about
  70 px, about 10 characters. 62 of the 150 labels measured are cut,
  `weaveDensity`, `deadEndDensity`, `entranceClearance`, Reduced motion
  and High contrast among them. On the phone the panel is 320 px (the
  coarse-pointer rule, `tweakpane_panel.ts` 408-409) with a 150 px value
  column: a label gets about 154 px, 23 characters, and 2 are cut. Of 13
  word labels from K323 and K327, 2 fit the desktop column and 11 fit the
  phone's. (`labels.mjs`, `labels.json`, `computed.json`)

**1. Unread rows, and rows that do nothing at today's defaults.**
- Observed: `snappiness` (codec index 33, key `snpy`,
  `url_state.ts:1060`; `param_codec.ts:110` marks it "Retired") has no
  row and no reader. K323 2.5 deletes it, with `mazeFabric` (45) and
  `fire` (118), in one bump.
- Observed: every row has a reader. The fire and minotaur rows that the
  inventory lists without one are read through `fireSettingsOf`,
  `turnMinoParamsOf` and `chaseParamsOf` (`url_state.ts` 715, 761 and
  780; the inventory's reader column is a heuristic).
- Observed: off at today's defaults: `pluckTug` 0 (so `tugAuto`
  hides), `temperature` 0, `minoSleep` 0, `fireDelay` 0, and `fowIntro`
  (fog is off). `backgroundDetail` hides on the default vellum backdrop,
  which doesn't read it.
- Inferred: none is worth removing now. Each is a designed knob that is
  off by default; K341 looks again at any still at 0.

**2. Rows that matter only in knot mode.**
- Observed: none shows only in knot mode. 68 rows show in knot mode (71
  with the three buttons), and every one of them shows in maze mode too.
  38 rows and the Reset path button carry `!fab`, and so does the
  Minotaur folder. Burn race's `!turnClock`, `playerPace`'s `!realtime`
  and `minotaurIndicator`'s `!minoOn` imply it through their helpers.
- Not checked: whether a row that shows in both modes does anything in
  maze mode. K326's removal is the place for that census.
- Inferred: K326 removes the `mazeFabric` row, every `!fab` term and the
  `fab` inside those helpers, and no other row.

**3. Developer and debug rows.**
- Observed: Advanced (collapsed, last) holds `showDebug`, `showStats`
  and Reset to defaults. `simSpeed` (a design param, so links carry it)
  is in Physics. `settleBudget` and `loadSettle` (K147's tuning, exempt;
  K162 (3) asks whether they stay) are in Motion & intro.
- Inferred: a Developer folder, last and collapsed, takes all five.
  Reset to defaults is a player's way out of a lost state, so it leaves
  the collapsed folder for the panel's root, after the last folder.

**4. Overlaps.**
- Two rows for one idea (observed):
  - `confetti` (on/off) and `confettiAmount`: amount 0 already means
    none, as its tooltip says.
  - `deadEnds` (on/off) and `deadEndDensity`: with `deadEnds` off,
    `scene_graph.ts:62` passes density 0, and `maze_plan.ts:17` defines
    density 0 as "no dead ends anywhere (pure braided)". The plan can't
    tell the two apart. The density slider starts at 0.05 today.
  - `reducedMotion` and `motion` (the Motion dropdown): one answer in
    two rows by K111's design (the box is the master switch, the
    dropdown the detail), but in two folders, Accessibility and Motion &
    intro.
- Not overlaps (inferred):
  - `moveSpeed` multiplies the turn clock's travel animation
    (`MOVE_CTRL_PER_S`, `fabric_maze_renderer.ts`); `playerPace` is the
    real-time pace in units per second. Each shows only on its clock.
  - The three edge-arrow toggles are independent, so one dropdown can't
    hold them.
  - Already planned: `fogOfWar` and K76's reveal become one
    `exploration` dropdown (K76 2c); `clock`, `minotaur` and `fire`
    become `gameMode` (K323).
- Sliders whose default sits at an end, or low in a wide range
  (observed defaults; whether the rest of the range is useful needs
  tuning data):
  - at an end: `gap` 0.04 (its minimum), `hCutShare` 1 (its maximum);
  - low in a wide range: `junctionBlend` 0.88 of [0, 6], `pulseReach` 3
    of [0.5, 15], `hoverGlowLength` 3 of [0.5, 15], `minoDetect` 15 of
    [0, 100], `minoLose` 25 of [0, 150], `minoRoam` 30 of [5, 150],
    `minoSleep` 0 of [0, 99], `fireDelay` 0 of [0, 40].
  - Inferred: narrow them at K341, with tuning data. A range change
    costs nothing in the codec, which is self-describing.

**5. Labels.** Observed above: 139 keys, 62 labels cut on the desktop.
`gameplay-panel.md` (K298) says unifying the labels is open. Inferred:
K327's rule (words that say what the row sizes or changes) can't fit
today's desktop column of about 10 characters. See question 4.

**6. Rows in the wrong place.**
- Observed: Maze (36 rows and the Reset path button, open) mixes six
  concepts:
  - the mode switch (`mazeFabric`) and the maze's generation (10 rows);
  - the game: `clock`, `playerPace`, `moveSpeed`, the three fog rows,
    Reset path (7);
  - the path's display: `pathViz`, `trailLength`, `tension`, the two
    pulse rows, `cameraMode`, `markerSize` (7);
  - the hover glow (4 rows);
  - on-screen aids: the stats readout, the three edge arrows and their
    size, tap to pan, the move pad (7 settings);
  - the finish's confetti (2 rows).
- Observed: `startAnchor` and `exitAnchor` (where the entrance and the
  exit go) sit in Design, away from the maze's other generation rows.
- Observed: Motion & intro mixes the Motion setting (Accessibility's
  other half), the design's intro and flow rows, and K147's two settle
  prefs.
- Observed: Physics holds `physics` (exempt, on/off) and `simSpeed`
  beside the design's tuning.
- Observed: `pathColor` sits in Look but hides on `pathViz`, in Maze.
  `minoFog` and `minoRefog` (Minotaur) hide on `fogOfWar` (Maze).
- Observed: `autoPluckGain` (how loud auto plucks play) sits in Touch &
  feel, away from Sound's loudness rows. `temperature` (the agitation,
  read by the physics) also sits in Touch & feel.
- Not a misplacement: a preference among a concept's design rows. Levi
  chose that over a separate section (K292, 18:40); a dog-ear will mark
  the design rows instead.

**7. `DAILY_EXEMPT_KEYS`.** Levi parked this list for the late review
(K57: "Let's review this list later, after all the other gameplay and
system churn, when we're doing all the other late-stage wrap-up
stuff."), so this stage only lists what that review needs. Observed,
the keys added after Levi's list:
- Two Levi has answered: `hoverGlow` (K237, 15:46: "0.4 is good ... and
  personal setting."; the comment at `daily_link.ts:153` still says
  "Proposed for Levi's review") and `hoverGlowWidth` (K264, quoted at
  `daily_link.ts:155`: "personal setting").
- Still marked "Proposed for Levi's review" in `daily_link.ts`:
  `settleBudget` and `loadSettle` (K147; K162 (3) asks "whether both
  stay daily-exempt"), `confetti` and `confettiAmount` (K140), and
  `markerSize` (K98).
- Added by K298: `hoverGlowLength`, `hoverGlowFade`, `pickMargin` and
  `pickChoiceRatio`.

Also for that review:
- Observed: not exempt, though they change only the look: `tension`,
  `pulseSpacing`, `pulseReach`. They are design params, like every Look
  row; whether a look-only row stays in the daily is K57's question.
- Inferred: `simSpeed`, a developer knob, rides in links as a design
  param.
- The confetti merge below takes `confetti` out of the set.

## Proposed tree

Rules it keeps (inferred from Levi's words and the lore):
- Each row stays with its concept (K292). A preference among design
  rows is fine; K292's dog-ear marks the design rows.
- The folders a player meets first are open and short. Tuning sits in
  collapsed subfolders, never deeper than depth 2.
- `gameplay-panel.md`'s rules stand: Accessibility first and open; a
  label may change, a key or a value may not (K323 3.2;
  `gameplay-panel.md`, pathViz); undo's `LIVE_EFFECTS` are keyed by
  callback, so a move changes nothing there; live recolor; the
  `refresh()` guard; the slider views (gridAlign, the background's speed
  and angle); Mouse pick margin always shows (its reason, knot mode,
  goes with K326, but the row still sizes the choices' pick zone).
- Fold state is kept per browser by folder title
  (`knotmaze.panelFolds`). A new or renamed folder starts at its default
  fold; the old titles' entries are dead and harmless (K323 3.1).

The tree, top to bottom; `[...]` is when a row shows.

1. **Accessibility** (open, first): `reducedMotion`, `motion` (from
   Motion & intro), `highContrast`. K111 stage 5's rows land here. Why:
   the box and the dropdown are one answer (K111); side by side, the
   dropdown reads as the box's detail.
2. **Design** (open): `gridSize`, `shape`, `weaveDensity`, `turnBias`,
   the seed, Daily. Why: the knot under every maze, then the seed and
   the daily, which K323 keeps above Game. The anchors move to Maze.
3. **Game** (open; K323 3.1, except as noted): Game mode; the
   exploration rows (today `fogOfWar`, `fowRadius` and `fowIntro`; K76
   2c's `exploration` dropdown and reveal rows once it merges);
   `moveSpeed` [turn clock]; each
   mode's rows as K323 3.1 lists them, Your speed (`playerPace`) among
   the real-time ones; Reset path. Child, collapsed: **Minotaur tuning**
   (K323 3.1, with K324's rows).
   - Change to K323: `moveSpeed` joins Game, where K323 kept it in Maze
     as a feel setting. Maze becomes generation only, and how fast you
     move is how the game plays: it is a design param, and the solve
     time it changes is a stat. Whichever clock is on shows one speed
     row.
   - Change to K323's question 3: the exploration rows move into Game
     in this build, right under Game mode, not in a later stage. K76 2c
     (running since 23:39; its brief is `docs/design/K76.md`, step 3, on
     master since 79c5a97) replaces the fog checkbox in place, in Maze,
     with one `exploration` dropdown (off, fog, threads) and the reveal
     rows shown under threads, and bumps the codec from 5 to 6. Levi's
     23:00 order (ledger commit 2ae3180) runs 2c long before K323 stage
     1, so 2c merges first: Stage A moves its rows from Maze to Game and
     takes v7. If 2c hasn't merged when Stage A starts, Stage A moves the
     fog rows and 2c replaces them in place, in Game.
   - Reset path moves from Maze: it restarts the solve.
4. **Maze** (open; generation only): `startAnchor`, `exitAnchor` (from
   Design), `deadEndDensity` (merged with `deadEnds`), `deadEndLength`
   [density above 0], `hCutShare`, `branchDensity`, `fourWayFraction`,
   `junctionSpacing`, `entranceClearance`, `exitClearance`. Why: every
   row regenerates the maze.
5. **Path & view** (open; new; the name is part of question 1):
   `pathViz`, `trailLength` [recent path], `tension` [string],
   `pathColor` [not string] (from Look), `cameraMode`, `pulseSpacing`,
   `pulseReach`, `markerSize`, `showMazeStats`, `movePad`. Why: what you
   see of your path, and around it, while you play; `pathColor` joins the
   row it depends on. Two children, both collapsed:
   - **Hover glow**: `hoverGlow`, `hoverGlowLength`, `hoverGlowFade`,
     `hoverGlowWidth`, then K328's rim rows, which K111 stage 5 builds
     with K265. That stage also hides the glow's other rows at strength 0
     (K298's leftover);
   - **Off-screen arrows**: `finishIndicator`, `headIndicator`,
     `minotaurIndicator` [minotaur], `indicatorSize`, `tapToPan`. K323
     3.3's group of four, plus tap to pan, which says what a tap on them
     does.
6. **Look** (open): `colorScheme`, `junctionBlend`, `hueShift`,
   `gamutArc`, `palette`, `threadWidth`, `gap`, `fadeLength`,
   `cuspRadius`, `background`, `backgroundIntensity` [a backdrop]. Child,
   collapsed: **Backdrop tuning**, the other 11 background rows (speed,
   scale, detail, fibers, grain, angle, color mode, base, accents 1-3),
   their hidden rules unchanged. Why: 7 of Look's 17 first-load rows are
   the backdrop's, and 5 of those are its tuning.
7. **Win effects** (collapsed; new, K318's folder): `confettiAmount`
   (merged with `confetti`). K335 merged at 23:32 with no panel rows (the
   rain's taper only); the rows its doc's "5. Settings" lists belong to
   K336 and K337, deferred to the end with K318. K318 stage 1 puts its
   Theme dropdown first, with each theme's rows under it. Why: K318
   names the folder.
8. **Motion & intro** (collapsed): `flowStrength`, `flowSpeed`,
   `appearMode`, `appearSequence`, `appearSpeed`, `appearFx`, Replay
   settle. Motion moves to Accessibility, the two settle prefs to
   Developer.
9. **Touch & feel** (collapsed), by concept: the plucks (`pluckSize`,
   `pluckReach`, `pluckGhost`, `pluckWhole`, `pluckCrossings`,
   `pluckGlow`, `pluckSheen`); the ripple (`pluckRipple`,
   `rippleStrength`, `rippleAuto`); the tug (`pluckStyle`, `tugLimit`,
   `snapBack`, `pluckTug`, `tugAuto`); the pick margins (`pickMargin`,
   K331's touch margin, `pickChoiceRatio`). `autoPluckGain` moves to
   Sound, `temperature` to Physics.
10. **Sound** (collapsed): `muted`, `volume`, `autoPluckGain` (from Touch
    & feel), `soundMode`, `soundSpeed`, the pitch rows (`pitchSpace`,
    `octaves`, `rootNote`, `tonicEmphasis`), the timbre rows (`reverb`,
    `brightness`, `sustain`, `shimmer`, `pickPosition`). Why: the
    loudness rows first, together.
11. **Physics** (collapsed): `physics`, `slack`, `drag`, `repulsion`,
    `bend`, `stiffness`, `smooth`, `gridAlign`, `temperature` (from Touch
    & feel). `simSpeed` moves to Developer.
12. **Developer** (collapsed, last; Advanced renamed): `showDebug`,
    `showStats`, `simSpeed`, `settleBudget`, `loadSettle`.

Then, at the root after the last folder: **Reset to defaults**.

At first load in classic mode, the tree shows 43 rows and buttons
against today's 58: Reset to defaults at the root, Accessibility 3,
Design 6, Game 4, Maze 10, Path & view 8, Look 11 (inferred: counted
from the inventory under the rules above; Stage A's rerun confirms it).
In classic mode K323's Game shows only Game mode; this tree adds
`fogOfWar`, `moveSpeed` and Reset path.

Homes for the incoming rows:

| Incoming | Home |
|---|---|
| K323: `gameMode` and each mode's rows | Game (K323 3.1) |
| K324: ten knobs | Game › Minotaur tuning |
| K76 2c: the `exploration` dropdown (in place of `fogOfWar`), `revealDistance`, `revealFade` and the end look (its brief, step 3) | Game, under Game mode. It lands in Maze, and Stage A moves it |
| K318: Theme, each theme's rows, the layers | Win effects, Theme first. If a layer group needs a subfolder, it sits at depth 2 |
| K336, K337 (deferred, with K318): their confetti rows | Win effects, under `confettiAmount` |
| K331: the touch pick margin | Touch & feel, between `pickMargin` and `pickChoiceRatio` |
| K328: the rim rows | Path & view › Hover glow |
| K111 stage 5: accessibility rows | Accessibility |
| K297: the pared-down set | see K341 below |

## Removals and merges, and their codec cost

All of them ride K323 stage 1's bump, in one build (Stage A below). A
version bump already makes every older link read as its seed at today's
defaults, with a warning (K132), so the merges cost old links nothing
beyond the bump. K76 2c (running) takes 5 to 6, so Stage A takes 6 to 7.
The ledger's order says K323 stage 1's bump is "shared with 2c's", but
2c's v6 deploys with its merge, and a removal must bump the version
(`param_codec.ts`'s header), so Stage A's deletions need a bump of their
own unless the two land in one push.

| Change | What goes, what replaces it | What old data loses | Codec |
|---|---|---|---|
| Remove `snappiness` (K323) | Index 33: no row, no reader | Nothing; it did nothing | Delete 33 |
| Merge `confetti` into `confettiAmount` | `confetti` (`cf`, 99, default on) goes. `confettiAmount` (`cfa`, 100, [0, 3], default 1) at 0 means none, as its tooltip says. K336's and K337's rows will hide at 0 | A stored "confetti off" in the daily prefs (`daily_store.ts` keeps the exempt keys) stops applying, so that viewer sees amount 1 again | Delete 99 |
| Merge `deadEnds` into `deadEndDensity` | `deadEnds` (`de`, 46, default on) goes. `deadEndDensity` (`ded`, 43) widens from [0.05, 1] to [0, 1]: 0 is braided, as `maze_plan.ts:17` defines it. `deadEndLength` hides at 0 | Links only; a v5 link reads as its seed anyway | Delete 46; the range change is free |
| K323's own | `mazeFabric`'s entry (45), `fire` (118), minotaur's `off`, `minoToward` to `minoPull`, `gameMode` appended | K323 2.5 | K323 |

Code the dead-end merge touches (lines at `7effaae`; on master K329
moved `main.ts`'s down by 9):
- `main.ts` 2330 and 2564, `params.deadEnds ? c.deadEndTips.size :
  null`, the dead-end stat: test `deadEndDensity > 0` instead.
  `daily_store` and `maze_hud` carry its null-means-off unchanged.
- `scene_graph.ts:62`, which passes density 0 when `deadEnds` is off:
  pass the density through.
- `daily_link.ts:97` in `mazeKey` (density and length print "-" when
  off), and `MAZE_PARAM_KEYS` (line 85), which lists `deadEnds`.
  `mazeKey` and `sameMaze` are used only in `daily_link.ts`, never
  stored.
- `tweakpane_panel.ts` 737-740 (the row) and 1936-1938 (the hide
  rules).
- `url_state.ts` 298 (the type), 602 (`deadEnds: true, // K74 (was
  off).`) and 1079 (the reader).

At today's defaults no plan changes, and density 0 builds what
`deadEnds` off builds today: the same value reaches the plan.

Pins and checks to re-freeze in Stage A:
- `test/ui/param_codec.test.ts`, the key-order pin: the deleted
  indices, `minoPull`'s type, `gameMode` appended.
- `test/ui/url_codec.test.ts`: every link that carries `cf`, `de`,
  `snpy`, `mf` or `fi`.
- `test/ui/daily_link.test.ts`: the exempt-set test loses `confetti`.
  The golden dailies must not move (no default changes); verify.
- `test/core/maze_plan_identity.test.ts` (K87): unchanged. Add a case:
  density 0 builds today's dead-ends-off plan.
- The daily_store and HUD tests: grep `test/` for `deadEnds:` and
  `confetti:`. Their records carry the stat, which doesn't change.
- `src/ui/undo_stack.ts` `LIVE_EFFECTS` (line 135) maps each live
  callback to its params, so a move changes nothing. The merge drops
  `confetti` from `onConfettiChange` (line 173) by hand: the table is
  typed `satisfies Record<string, readonly string[]>`, so a stale key is
  silent. `deadEnds` isn't listed, since `onModeChange` rebuilds.
- Probes and lore with `cf=` or `de=` links (grep `.claude/` and
  `docs/`), and probes that open folders by title: K79's
  `k79b_smoke.mjs`, K174's `k174_page.mjs panel`, and this stage's
  `nested.mjs` and `labels.mjs`.

## Nested folders (K340)

Observed: the bars are identical at depths 1 to 3, and the only cue is a
4 px indent strip.

Six looks were prototyped with CSS injected by
`.claude/probes/K339/nested.mjs` (nothing under `src/` changed). Each
was shot at 1400x900 and 411x753 with Maze open, Burn race closed,
Minotaur open and Minotaur behavior (depth 3) open. The panel has one
theme, so there is one sheet: **`.claude/probes/K339/sheet/K340_sheet.png`**
(columns today and A to F, desktop above phone). `index.html`, each
look's PNGs and full-page shots of today, E and F sit beside it.

- A, an indent and an accent rule: subtle. The child's bar stays filled
  like its parent's, so only a 2 px line differs.
- B, a sub-heading bar (no fill; smaller, lighter, not bold): clear at
  depth 2, but depth 3 differs from depth 2 only by its indent.
- C, a "↳" before the title and a chevron for the triangle: the weakest
  cue; the bar is unchanged.
- D, a dark well that deepens with depth: groups a child's rows well,
  but its title bar reads like a parent's.
- E, combined: the child's bar loses its fill and bold and takes lighter
  text, a 2 px accent rule runs down its left edge, and its body sits 6
  px in, in a dark well that deepens at depth 3. It reads at both depths
  and both sizes, but a closed subfolder (Burn race) left a stub of the
  rule under its bar.
- **F, recommended: E, with the rule's strip and the well drawn only
  while the subfolder is open.** The stub is gone. A closed subfolder
  keeps its lighter bar and the rule on the bar.

F's CSS, as `nested.mjs` injects it. `D2` is `.tp-fldv_c>.tp-fldv`, a
folder inside any folder, so every rule applies at depths 2 and 3;
`ACC` is `142,160,192`, the panel's accent `#8ea0c0`. The well needs no
depth-3 rule: a depth-3 folder's translucent background stacks on its
parent's (alpha .14 twice, about .26):

```css
D2{margin-left:6px;background-color:rgba(0,0,0,.14);border-radius:0 3px 3px 0}
D2>.tp-fldv_i{color:rgba(ACC,.55)}
D2>.tp-fldv_i::before{width:2px}
D2>.tp-fldv_b{background-color:transparent;font-weight:400;color:#b4c0d6;box-shadow:inset 2px 0 0 rgba(ACC,.55)}
D2>.tp-fldv_b:hover{background-color:rgba(255,255,255,.05)}
D2>.tp-fldv_b::before{border-top-color:rgba(ACC,.8)}
D2:not(.tp-fldv-expanded){background-color:transparent}
D2:not(.tp-fldv-expanded)>.tp-fldv_i::before{opacity:0}
```

The build: these eight rules (E's six and F's two) join the panel's
style block in `src/ui/tweakpane_panel.ts` (the `style.textContent`
string from line 319), with no TypeScript change. Folders at depths 2 and 3 exist today,
so it can ship alone, before Stage A. Its check: rerun `nested.mjs`
against the build with the injection empty and compare with F's shots,
also with High contrast on (not checked here).

## Questions

1. **The tree.** The folders, their order, names and open states above,
   including:
   - Game at the top level and open, between Design and Maze (K323's
     question 1);
   - the exploration rows moving into Game in this build, right under
     Game mode: K76 2c's dropdown and reveal rows if it has merged, as
     the order expects, or else today's fog rows, which 2c then replaces
     in place (K323's question 3, sooner than it proposed);
   - `moveSpeed` into Game, and Maze kept to generation;
   - a new "Path & view" folder (a better name is welcome), Developer in
     place of Advanced, and Reset to defaults at the panel's root.

   Recommended: yes.
2. **The merges.** Confetti on/off into the confetti amount (0 = none),
   and dead ends on/off into the dead-end density (0 = none, a braided
   maze), with `snappiness` removed as K323 planned. Recommended: yes.
3. **The nested look.** F: a lighter bar without fill, an accent rule,
   and a dark well while open, 6 px in. Recommended: F.
4. **Labels and the panel's width.** Every row gets a word label by
   K327's rule, at most 23 characters, with K323 3.3's labels
   ("Off-screen arrow size", "Maze marker size", "Arrow to the finish /
   you / the minotaur"; K327 proposed "Edge arrow size" and "Maze icon
   size" and defers to them: "In K323's design"). The desktop panel
   widens from 256 to 320 px, the phone's
   width, so the labels fit: about 10 characters fit today, 23 then. It
   covers 64 px more of the maze. Recommended: yes.

The exempt set is not asked here: Levi parked it for K57's late review,
and finding 7 is that review's input.

## Build plan

- **K340's CSS ships first, alone.** It is small and touches only the
  panel's style string, so it collides only with a panel rewrite running
  at the same time.
- **Stage A is K323 stage 1 plus this reorganization**: one panel
  rewrite, one codec bump, one re-freeze of the pins, one merge.
  Recommended: one stage, as the coordinator expected. It holds:
  - K323 stage 1 as designed: `gameMode`, the Game folder, the bump's
    deletions and `minoPull`, its rows' labels;
  - the merges and the moves above, the new folders, and Reset to
    defaults at the root;
  - K327's labels on every row, and the desktop width (if question 4 is
    yes).

  If one run won't fit the cap, split it into two runs, one after the
  other, on one branch: A1 the codec bump and the Game folder (K323
  stage 1 plus the merges), A2 the moves, the labels and the width.
  Never two agents on the panel at once.
- **The order against the work in flight.** Levi's 23:00 order (ledger
  2ae3180) puts K323 stage 1 with this rebuild after the worker, the
  thread reveal and the night's other items.
  - Stage A waits for Levi's answers: K323's and these.
  - It edits `main.ts`, `url_state.ts`, `param_codec.ts` and the panel,
    so it runs after K7 stage 3 merges (the worker, running 23:22-01:22,
    in `main.ts`; it appends a `phw` codec param), and never beside K76
    2c (the same files, and a codec bump).
  - K76 2c runs before Stage A and takes v6; Stage A takes v7 and moves
    2c's rows into Game.
  - K329 merged at 23:38 (`main.ts` only, no rows) and K335 at 23:32 (no
    panel rows), so neither holds Stage A back.
  - K321 (credits) can run beside it: it edits the panel's credit link,
    which Stage A doesn't move. Expect a small merge.
  - K331 (with K330), K111 stage 5 (with K265) and K328 come before K323
    stage 1 in the order. They add their rows where today's panel puts
    their neighbors (Touch & feel, Accessibility, Maze's hover glow
    rows), and Stage A moves them with the rest.
  - K324's knobs come with K323 or after it, into Game › Minotaur
    tuning. K318, K336 and K337 come last, into Win effects.
  - K341 comes after the design churn.
- **Stage A's checks:** `npm test`; the inventory rerun into a new table
  and diffed against `K339_inventory.md`, with every row accounted for
  (moved, merged or removed); a panel probe per mode and clock (the rows
  shown, and `labels.mjs` for cut labels at both sizes); the K340 look
  at both sizes; K87's plans and the golden dailies unchanged.

## The second audit (K341)

When the design iteration is done (Levi: "plan to do this again when
we're all done iterating"):

1. Rerun the inventory into `docs/design/K341_inventory.md` and diff it
   against this one:
   `node node_modules/vite-node/vite-node.mjs --config
   scripts/panel_inventory.vite.config.mjs scripts/panel_inventory.ts
   docs/design/K341_inventory.md`.
2. Run the findings checklist, sections 1 to 7 above: unread or inert
   rows; rows only one mode uses; developer rows; overlaps (one idea in
   two rows, booleans that are one dropdown, ranges much wider than their
   use, now with tuning data); labels; rows out of place; the exempt set,
   with K57.
3. Optionally, teach the script to flag them: camelCase labels, labels
   over 23 characters, folders with more than about a dozen rows at
   defaults, depth over 2, and folders that mix kinds.
4. Rerun `labels.mjs` and the K340 sheet.

How it feeds K297, the pared-down set: each row gets a "casual" tag in
the panel's row table, and an "All settings" switch at the top (a
setting kept per browser) shows the rest, through the panel's
hidden-row pattern. A folder with no casual row vanishes while the
switch is off. A starting casual set (inferred, for Levi to cut):
Accessibility; Daily and the seed; Game mode, Real time, Behavior and
Show its next move (K323 3.4); Fog of war, or K76's Exploration;
`cameraMode`; `muted` and `volume`; and K318's Theme. K292's dog-ears
still mark design rows under "All settings".

## Verification notes

- The inventory script ran clean at `7effaae`. A spot check of the
  Design and Maze rows (labels, values, hidden state) against the live
  panel matched (`.claude/probes/K339/spot_rows.json`,
  `spot_desktop_top.png`, `spot_desktop_maze.png`).
- `nested.mjs` (the sheet, run under the perf lock) and `labels.mjs`
  (the label widths) ran against this checkout's dev server on ports
  5881 and 5882, each with a private vite cache (deleted at the
  handoff) and its own Chrome profile (deleted after each run).
- After a context compaction, every number in this section was checked
  again against the inventory, `labels.json`, `computed.json` and the
  sources; the corrections are in `81e7e14`.
- Line numbers are at `7effaae`. On master (2c81a92, 23:38) the
  panel's own files (`tweakpane_panel.ts`, `url_state.ts`,
  `param_codec.ts`, `daily_link.ts`, `undo_stack.ts`) are unchanged
  since then; only `main.ts` moved (K329's key moves, no rows), so the
  inventory is still current.
- Only `docs/` and `scripts/` changed (`git diff --stat 7effaae`), so
  `npm test` was not run.

## Stage 1 handoff (2026-10-14, 23:45)

The stage is done, inside its cap (started 22:54:13, cap about 00:54).
Nothing under `src/` changed, and nothing was pushed.

- owner: nobody since 23:45 (agent of claude session d8031183, stage
  done).
- branch: `worktree-agent-a2f8f74cd5425c4ef`, worktree
  `.claude/worktrees/agent-a2f8f74cd5425c4ef`, from master `7effaae`.
  Commits: `9aeb7bb` (the inventory script and table), `81e7e14` (the
  results above), then this handoff.
- evidence, tracked: `scripts/panel_inventory.ts`,
  `scripts/panel_inventory_stub.ts`,
  `scripts/panel_inventory.vite.config.mjs` and
  `docs/design/K339_inventory.md`.
- evidence, untracked, in the worktree's `.claude/probes/K339/`; copy
  it to the main checkout's `.claude/probes/K339/` before the worktree
  goes:
  - `nested.mjs`, the looks (`node .claude/probes/K339/nested.mjs
    [looks=all] [port=5881]`, under the perf lock), and its output:
    `sheet/K340_sheet.png` (the sheet), `sheet/index.html`, each look's
    PNGs, `computed.json` and `spot_rows.json`;
  - `labels.mjs`, the label widths (`node .claude/probes/K339/labels.mjs
    [port=5882]`), and `labels.json`;
  - `spot_desktop_top.png` and `spot_desktop_maze.png`;
  - `vite.private-cache.config.ts`, through which both probes serve the
    checkout.
- The worktree's `node_modules` is a junction to the main checkout's:
  remove it with `(Get-Item node_modules).Delete()` before removing the
  worktree.
- Not done: look F with High contrast on (K340's build checks it); the
  tree's first-load count (43) is counted by hand, for Stage A's rerun
  to confirm.
- next: Levi's answers to the four questions. Then K340's CSS, alone,
  once he picks a look; then the Stage A brief (K323 stage 1 plus this
  rebuild), after K7 stage 3 and K76 2c merge.
- brief: this file.
