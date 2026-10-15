# K298: the hover glow's own length, end fade, thickness, choices and pick margins

Levi, 2026-10-14 about 19:13, verbatim:

> Ok, I take it back. Let's give hoverGlow it's own length setting. Also,
> let's make the length of its fade-out near the end of the segment be
> much shorter--give this a slider too. It should also have a slider for
> its thickness. Let's also render it in-addition to the
> adjacent-to-current-juction highlight for those segments. Can we also
> reduce the amount of mouse margin we allow for clicking/hovering over a
> thread? And add a slider to control this.

"I take it back" most likely reverses K219 ("Hover should honor the
slider."), which made the glow's length follow `pulseReach`. That is a
reading, not something he said. His answers to the coordinator's two
questions (about 20:25) are quoted in items 4 and 5.

## What is there today

The lore is `.claude/rules/render-paint.md`, "HOVER GLOW" (it attaches
when you read the paint files). In short:

- **Item and uniforms.** The glow is one KPAINT item, `(RIM, c0, c1,
  gap)`, written last. Its strength (`hoverGlow`, `hg=`, codec 105,
  default 0.4, 0 = off and no item) and the hover point are uniforms
  (`uKReach.z`, `.w`, set in `ribbon_renderer.ts` near the other
  `uKReach` writes).
- **ALONG.** `1 - smooth(d / pulseReach)` from the hover point, with no
  floor (K219). `pulseReach` (`pr=`, codec 69, default 3, panel range
  0.5-15 in steps of 0.25) is `uKReach.x`, shared with the choice pulses.
- **ENDS.** An end gap at each end (`rimGap`, the junction web's reach
  along an arm: 0.975 world at defaults), because the webs draw over the
  ribbons. Then a fade-in over `min(RIM_END_FADE 0.75, RIM_END_SHARE 0.6
  x (half the run - gap))`, with a floor of 1e-4. The constants are in
  `src/render/paint_const.ts`; the GLSL `fade` line is in `paint_glsl.ts`'s
  rim code, and the mirror is in `paint_math.ts`.
- **ACROSS.** `hoverGlowWidth` (`hgw=`, codec 130, a viewer preference,
  default 0.85, range [0.3, 1]) rides `uKGold.w` as the scale
  `kRimScale`. Its panel row is "Hover glow width", next to "Hover glow"
  in `tweakpane_panel.ts`. K111 stage 4 added it at 19:11, two minutes
  before his message, so he had most likely not seen it yet (inferred).
- **Choices.** A run that is one of the player's choices draws no glow.
  It keeps its pulses and its own, stronger hover look.
- **Picking: two radii, the same for mouse and touch.**
  - **The current junction's choices** are hovered and tapped through
    `fabric.edgeAt` (`src/render/fabric_maze_renderer.ts`), whose radius
    from the centerline is `max(0.9, 1.6 x threadWidth)` world units: 0.9
    at the default thread width (0.52), wider past about 0.56.
    `fabric.runDistance` (K80's wait tap) uses the same radius.
  - **Every other run, and the knot,** use `GRAB_RADIUS = 0.7`
    (`src/main.ts`) through `renderer.pickThread`, `ps.nearest` and
    `ps.grab`: the hover glow (`setGlowAt`, only when no choice is under
    the pointer), the pluck and grab press, the drag grab and the thread
    cursor.
  - So a choice is already about 1.3x easier to hit (0.9 / 0.7). In
    `main.ts` a touch press on a choice sets `pendingTap`, and a mouse
    press calls `handleFabricTap` (the chase tap, then `fabric.edgeAt`,
    then `moveAlong`).

**The worked example.** `hoverGlowWidth`'s path is the one to follow for
a new viewer-preference param. It runs through `url_state.ts`
(`PARAM_DEFAULTS`, the clamp, the `key=value` reader), `param_codec.ts`
(appended), `daily_link.ts` (the exempt list), `undo_stack.ts`,
`tweakpane_panel.ts` and `main.ts`'s sync, plus their tests. K111's stage
4 handoff (`docs/design/K111.md`) records it.

## Stage 1 (this stage)

Codec appends start at index 131, in the order below: 131 the glow's
length, 132 its end fade, 133 the mouse margin, 134 the choices' ratio
(if master has appended more by then, follow them). Every new param is
a viewer preference: daily-exempt and live, with its own panel row. The
glow's rows sit under "Hover glow"; item 5 says where the margins go.

1. **The glow's own length.**
   - Add a param (e.g. `hoverGlowLength`) that replaces `pulseReach` in
     ALONG.
   - Default 3, today's effective length, so the default frame does not
     move here. Range as `pulseReach`'s, unless the sheets argue for
     another.
   - Uniform slots are scarce, and K76 stage 2c and K268 stage 2 come
     later and need some too (they avoid `uKBase.y` and `uKGold.w`).
     Record every slot you take in `render-paint.md`.
2. **A much shorter end fade, with a slider.**
   - Add a param for the fade-in length past the end gap. It replaces
     `RIM_END_FADE` (0.75).
   - Pick a much shorter default from a sheet. Shoot at least 0.1, 0.2,
     0.3 and today's 0.75 at the default zoom, mouse at 1400x900.
   - Keep `RIM_END_SHARE` as the short-run guard unless the sheets show a
     reason not to, and say what you chose.
   - The end gap is not the fade: it stays.
3. **Thickness.**
   - Relabel the `hoverGlowWidth` row "Hover glow thickness" and reword
     its tooltip.
   - Keep the param name and `hgw=`: the codec reads names and indices.
4. **The glow on a hovered choice too.**
   - A hovered choice run draws the glow in addition to its pulses.
   - It also keeps its own hover look. Asked at 19:21 whether the glow
     should replace that look, Levi answered at about 20:25: "Keep both."
     So a hovered choice draws its pulses, its own hover look and the
     glow.
   - Check how the rim item composes with the pulses and the choice's
     hover (max, add or over) on the GPU and in the mirror. The glow must
     stay visible at every pulse phase without blowing out.
5. **Pick margins, with sliders.**
   - **Do this item last.** K7's stage 1 (the physics host) runs
     alongside you and rewrites `main.ts`'s physics call sites (`nearest`,
     `grab`, `dragTo`, `release`). Route the radius through one helper
     (e.g. `pickRadius(pointerType)`) that every pick site calls, so the
     merge onto stage 1 stays mechanical. If stage 1 has reached master
     by the time you get here (`git fetch`, then look for "K7 stage 1" in
     `git log origin/master`), rebase onto it first.
   - **What exists:** the two radii under "Picking" above. A choice is
     already about 1.3x easier to hit than any other run.
   - **Levi's answers** (2026-10-14 about 20:25, verbatim): "Sure. For
     pick margin, do we have a wider margin for choosing adjacent
     segments to the current junction vs other segments? We probably
     should? I guess we should have a separate slider for that ratio."
     ("Sure" answers the 19:21 question: touch keeps today's margins.)
   - **The mouse margin.** Add a param for the mouse's pick radius on
     every run that is not a choice: hover, click, the thread cursor and
     the drag grab, so the cursor never promises a grab that the click
     then misses. Its default sits below today's 0.7.
   - **The choices' ratio.** Add a second param: the choices' margin as a
     multiple of the mouse margin. It sets the radius of `fabric.edgeAt`
     and `fabric.runDistance` for the mouse. Default near today's ratio
     (0.9 / 0.7, about 1.3), unless the sheet argues for another. Today
     the choices' margin grows with the thread width (`1.6 x threadWidth`
     past about 0.56); keep that property, and say how the ratio combines
     with it.
   - **Touch keeps both of today's margins exactly** (0.7, and the
     choices' `max(0.9, 1.6 x threadWidth)`). Say in your report whether
     the ratio should reach touch later.
   - **Measure first.** Find what 0.7 and 0.9 are in CSS px at the default
     zoom, against the ribbon's half-width (about 5.7 CSS px at 1400x900).
   - **Then decide the unit.** Should the margin be in screen px rather
     than world units, given that a world-unit margin grows and shrinks
     with zoom? Say which you chose and why. The ratio has no unit.
   - Propose defaults that hug the ribbon.
   - The mouse margin applies in knot mode too, so its row must show
     there (not in the maze folder, which hides outside fabric). The
     ratio's row may hide outside fabric, where there are no choices.
6. **The mirror and parity.**
   - `paint_math.ts` follows every shader change.
   - Parity tests (`paint_gameplay.test.ts`) cover several lengths, end
     fades and a hovered choice.
7. **A census.**
   - GPU vs mirror (the rim census from K111 stage 4; find
     `census_rim.mjs` in `.claude/probes/`).
   - Cover the new params at several values and a hovered choice. None
     over 2/255.
8. **A same-state A/B, master vs branch, at the defaults.**
   - The default frame should change only at the run ends (the new end
     fade) and on a hovered choice. Name anything else that moves.
   - One GPU timing of the ribbon program at rest and mid-hover, under
     the perf lock (`probes.md`).
9. **Sheets in `.claude/probes/K298/sheet/`:**
   - lengths;
   - end fades;
   - a hovered choice at three or four pulse phases;
   - both pick radii (a choice's and any other run's) drawn around the
     pointer against a ribbon, old and new, at 1400x900 and 411x753.

### Verification

- `npm test` green with the count, and `npm run build` green.
  - The knot-mode golden (`test/physics/byte_identity.test.ts`) and the
    golden dailies stay as they are.
  - `param_codec.test.ts`'s pin grows by the appended keys only.
- Census: GPU vs mirror within 2/255.
- **Name the change.** List every default frame that moved, and why.
- In your report, keep what you observed apart from what you inferred.

### Setup

- **Your branch starts from master,** after K299's merge. Run
  `git log -1 --oneline` first; if this file is missing, run
  `git merge --ff-only origin/master`.
- **`node_modules`:** link it to the main checkout's with a junction
  (`New-Item -ItemType Junction node_modules -Target
  C:\Users\lsl\Repositories\knotmaze\node_modules`). Before removing
  anything that contains it, run `(Get-Item node_modules).Delete()`: a
  recursive delete or `git worktree remove --force` follows the junction
  and empties the main checkout's packages.
- **Servers:** ports 5800-5809. Give your vite server a private cacheDir
  (see `probes.md`). Leave port 5173 alone: it is Levi's.
- **Chrome:** any instance you launch gets its own `--user-data-dir` in
  your probes folder. Delete it when you are done (K161).
- **Files:** probes, logs and notes go in `.claude/probes/K298/`
  (untracked; the coordinator copies them at the merge).
- **`main.ts`:** keep your edits there small (the pick radius and the
  syncs). K7's stage 1 runs alongside and rewrites that file's physics
  call sites; see item 5.
- **The phone is off-limits.**

### Process

- **One stage.**
  - Run `Get-Date` at the start and at each milestone.
  - Commit WIP on your branch at every milestone, and never push.
  - Don't edit `LEDGER.md`.
- **The stop.** Stop when the five items are done and verified, or at
  your cap, whichever comes first. The cap is two hours on Opus.
  - Neither a compaction nor context size is a stop. After a compaction,
    re-read this brief and `git log`, then go on.
  - At the stop, commit WIP, append a "Stage 1 handoff" section to this
    file, commit it and report.
- **The final report covers:**
  - what changed and where;
  - the chosen defaults, with the sheets that chose them;
  - the census, the A/B, the GPU timing and the test count;
  - the lore you added;
  - a `Ledger items` list;
  - the handle fields: branch, last commit, evidence and next.
