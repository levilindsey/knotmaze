# K525: the minotaur's telegraph lights the route's rims

Ledger: K525. One stage, opus, 2 h cap. Build on master (K409 merged at
3231d59).

## Levi's call

From `docs/ledger_notes.md` (K525), verbatim: "The minotaur's telegraph
(Levi 2026-10-20): a treatment dropdown (a param appended to the codec)
whose new default lights the run's rims the way the hover highlight does,
with today's line kept as an option; roam must read on the phone at fit
zoom (the line: about 0.7 on touch, 0.45 on desktop, hunt 0.95); K546's
first phone sheet shows roam, a catch and the fog glow together. Today:
`.claude/probes/K80/stage3b/contact_sheet_real.png` (K524)."

The coordinator's summary of the same call: "Levi took the rec AND wants a
telegraph-treatment dropdown whose new default highlights the run's
sides/rims the same way the hover highlight does; roam must read on the
phone at fit zoom". K546's question 8 is answered by this item: the
telegraph's look is K525's.

## Where it stands

Line numbers are master's at 1407b85.

- **The telegraph today** (`src/render/fabric_maze_renderer.ts`):
  - the constants `TELEGRAPH_COLOR` 0xff2418, `WIDTH` 0.55, `ALPHA` 0.95,
    `RING_R` 1.45, `RING_W` 0.32, `STEP` 0.5 (:163-168);
  - `teleGfx` (:681), a Graphics redrawn every frame because the threads
    move under it;
  - `drawTelegraph` (:1632), turns by runs: one stroke per run, each with
    its alpha from `telegraphAlphas(hunting, n)` (`src/game/mino_feedback.ts`
    :11-17: roam 0.45, hunt 0.95, the second run at half), and a ring
    where it ends its turn;
  - `drawTelegraphLength` (:1528), turns by length (K481): the route
    starts at `fromSpot`, which can be mid-run, and each step's
    `segLens[s]` can end mid-run; tick rings at each choice's stop
    (`telegraphTickLook`); on a coarse pointer the tint fallback (:1563);
  - the bleed branch (:1478-1504): under fog, when the fog rule hides the
    minotaur, no marker and no telegraph, only its glow at
    `MINO_FOG_BLEED_ALPHA` 0.16.
- **The input** is `TurnTelegraph` (`src/game/minotaur_turns.ts`
  :872-893): `from`, `steps` (`[edge, to]` pairs), `dest`, and for by-length
  `fromSpot`, `segLens`, `stops`, `factor`, `catchDist`, `player`. Its
  producer is `telegraph()` (:1287). K546 stage 1 owns that file now:
  read it, don't edit it.
- **Only the turn minotaur has a telegraph.** K324 stage 2 will give the
  real-time one a telegraph from its `ChasePlan` (`lead: {edge, pos, dir}
  | null`, `steps`, `dest`, `hunting`; `docs/design/K324_realtime_minotaur.md`).
  Build the rims' input so that stage 2 only converts its plan.
- **The hover glow, the look to copy** (`src/render/ribbon_renderer.ts`):
  - `PaintRim` (:311) and the single `paintRim` (:583);
  - `setRim` (:2553), `setRimAt` (:2559), `rimItemKey` (:2564; KPAINT is
    rewritten only when this key moves), `syncRimItem` (:2571), `rimGap`
    (:2581, the junction web's reach along an arm);
  - the item, written last: `PAINT_ITEM.RIM, c0, c1, gap, 0, 0, 0, 0`
    (:3670), so its second texel is spare; its strength is `uKReach.z`
    (:3470).
- **The hover glow's GLSL** (`src/render/paint_glsl.ts`):
  - the `PI_RIM` branch (:823-837). Along the run it falls off from the
    hover point over `uKSect.z`. At each end it skips the gap, then fades
    in over `clamp(RIM_END_SHARE * (half the run - gap), 1e-4,
    max(uKSect.w, 1e-4))`;
  - across the ribbon, `kRimAcross` scaled by `uKGold.w` =
    `kRimScale(hoverGlowWidth)`, the viewer's width;
  - `kRimOver` (:895) whitens the composed paint after the paint.
- **The item ids** are in `src/render/paint_const.ts` :128-129
  (`PAINT_ITEM` SPAN 1, CAP 2, PULSE 3, RIM 4; `ITEM_FLAG` INWARD 1,
  HOVER 4), emitted into the GLSL at :148-151.
- **The mirror** is `src/render/paint_math.ts`: RIM at :1391, `kRimScale`
  :1279, `kRimAcross` :1288, the composition at :1807. The parity tests
  are `test/render/paint_gameplay.test.ts`.
- **The param.** `minoTelegraph` (`mtg`, codec index 110, a flag) is the
  telegraph's switch:
  - panel row "Show its next move" (`src/ui/tweakpane_panel.ts` :1584),
    hidden unless the turn minotaur is on (:2556);
  - a live effect in `src/ui/undo_stack.ts` :172;
  - `src/ui/url_state.ts` :605, :882, :1016 and :1535;
  - not daily-exempt.
- **The baseline** is K524's real-phone sheet,
  `.claude/probes/K80/stage3b/contact_sheet_real.png` (master 5558669:
  roam at turn 2, hunt at 47, caught at 48), made by `turns_phone_real.mjs`
  beside it; `turns_page.mjs` is the emulated version.
- **Probes to reuse.** They are untracked in the main checkout,
  `C:\Users\lsl\Repositories\knotmaze\.claude\probes\`; copy them into
  your `.claude/probes/K525/`.
  - `K298/census_rim.mjs` compares GPU against the mirror across the
    ribbon.
  - `K298/rim_sheet.mjs` and `K298/gpu_by_program.mjs`.
  - `K298/png.mjs`: its `decodePNG` returns `{W, H, ch, data}`.

## The design

- **The param.** Append `minoTelegraphLook` (`mtl`), an enum: `rims` |
  `line` | `both`, default `rims`.
  - `mtg` stays the on/off switch.
  - Its row is "Telegraph look", under "Show its next move", and hidden
    whenever that row is hidden or `mtg` is off.
  - It is a live effect, like `mtg`, and not daily-exempt, also like
    `mtg`.
- **The rims.** Add a new paint item, `PAINT_ITEM.TELE`, with one item
  per route piece (a whole run, or part of one). Choose the packing, but
  each item must carry:
  - its ctrl range;
  - its alpha;
  - a gap at each end. An end at a junction gets `rimGap()`. An end at
    the minotaur's spot, or at a by-length stop mid-run, gets 0 and a
    short fade.

  The hover's `RIM` item stays last.
- **The colour.** Add one uniform: rgb = `TELEGRAPH_COLOR`, w = the
  strength. Don't store the colour per item. A uniform also lets the sheet
  show a white variant.
- **The shader.**
  - `st` is full: x is the paint, y the family, z the band, w the hover
    rim. So the TELE branch needs its own accumulator: a module-level
    global, as `kHcD` and `kHcPx` are, or an out parameter.
  - A `kTeleOver(c, tele)` mixes toward the colour after the paint.
  - Across the ribbon, use the same `kRimAcross`, at the viewer's
    `hoverGlowWidth`.
  - Along the run, light the whole piece: no hover-point falloff.
  - At the ends, behave as the hover does: skip the gap, then fade.
  - The order against the hover's whitening comes from the sheet. The
    default is red first and the hover's white over it, so a hovered run
    on the route shows both.
- **The keys.** The telegraph items join the item key, as `rimItemKey`
  does, so KPAINT is rewritten only when the route or a look input
  changes, never every frame. The turn minotaur's route changes only on a
  tap.
- **What stays in `teleGfx`, for every look:** the destination ring, the
  by-length ticks and the coarse tint fallback.
  - `rims` draws no line.
  - `line` draws today's line.
  - `both` draws the line and the rims.
- **Roam on the phone.**
  - The line's roam alpha is 0.7 on a coarse pointer (`telegraphCoarse`,
    :607) and 0.45 on a fine one. Hunt stays 0.95, and the second run is
    still at half. `telegraphAlphas` takes the coarse input.
  - The rims get their own strengths (roam coarse, roam fine, hunt),
    tuned on the phone sheet so that roam reads at fit zoom.
- **Fog, reveal and rebuilds.**
  - The rims follow the line's rule: no telegraph while bleeding, and
    none while the minotaur isn't shown. Every path that clears or hides
    `teleGfx` clears the rims too; grep `teleGfx.clear` and
    `teleGfx.visible = false`.
  - Under the thread reveal, a rim on a hidden run draws nothing, because
    the ribbon isn't there.
  - A rebuild, a new maze or a reset clears the items, since their chain
    indices go stale.

## Steps

1. **Baseline (no code).**
   - On master, rebuild K524's states with the emulated probe at 1400x900
     (mouse) and 411x753 (touch, coarse): roam, hunt, by-length with
     ticks, and the fog bleed.
   - Save them in `.claude/probes/K525/baseline/`.
2. **The param.**
   - Append `mtl` as in the design.
   - Re-freeze `test/ui/param_codec.test.ts`'s key-order pin and
     `test/ui/url_codec.test.ts`'s defaults table, and name both in the
     commit.
   - **Commit.**
3. **The paint.**
   - Add `TELE` to `paint_const.ts`.
   - Add the branch, the accumulator and `kTeleOver` to `paint_glsl.ts`.
   - Add the item writer and the uniform to `paint_model.ts` and
     `ribbon_renderer.ts`, as a `setTelegraph(pieces | null)` beside
     `setRim`.
   - Mirror it all in `paint_math.ts`, line for line.
   - Add parity tests to `paint_gameplay.test.ts`:
     - a whole run, a lead partial, a tail partial, and both on one run;
     - widths 0.3, 0.85 and 1;
     - alphas 0.45 and 0.95;
     - a seam run (`ctrlB = n`, K299).
   - **Commit.**
4. **The route.**
   - Add a pure helper (for example `src/render/telegraph_route.ts`,
     with tests) that turns a `TurnTelegraph` into pieces:
     - by runs: whole runs from `from`;
     - by length: the entry at `fromSpot`, and ends at `segLens`;
     - plus a `lead` partial run in the `ChasePlan` shape, tested with a
       synthetic route.
   - Wire the look switch into `drawTelegraph` and `drawTelegraphLength`,
     and the clears into the bleed branch and the hide paths.
   - **Commit.**
5. **The alphas.**
   - Give the line its coarse roam alpha of 0.7.
   - Add the rims' strength constants with first values.
   - **Commit.**
6. **Sheets and numbers.**
   - Shoot the baseline's states for `rims`, `line` and `both`. Also
     shoot:
     - a run on the route whose section colour is red;
     - the gold trail under the route;
     - a hovered run on the route;
     - High contrast on;
     - the rims in white as well as red (uniform override, sheet only).
   - Run the census: GPU against the mirror, at most 2/255.
   - Same-state A/B against master (`hm_probe.mjs ab`):
     - with `mtg` off, 0 px;
     - with `line` at 1400x900, 0 px.
   - Measure the GPU cost under the perf lock (`gpu_by_program.mjs`): the
     ribbon program's ms/frame at rest with the minotaur on, master
     against branch, two rounds.
   - Tune the strengths and the fades. **Commit.**
7. **The phone sheet.**
   - Take the phone lock (`pwsh -NoProfile -File .claude/probes/agents/phone_lock_take.ps1 -Owner "K525" -What "telegraph sheet" -MaxWaitMin 40`).
     The K578 check holds it until about 18:03.
   - On the real Pixel 11, with K524's probe, shoot roam, hunt, a catch
     and the fog glow in one sheet, beside K524's.
   - If the lock waits past 40 min, skip this and report it as a ledger
     item.
8. **Verify and lore.**
   - `npm test` and `npm run build` pass.
   - Only the codec pins move, and only by `mtl`. The golden dailies, K87
     and the knot-mode golden don't move.
   - Add a TELEGRAPH RIMS entry beside HOVER GLOW in `render-paint.md`.
   - Update the telegraph lines in `gameplay-minotaur.md`.
   - Add the panel and link rows to `gameplay-panel.md` and
     `gameplay-links.md`.
   - Record the paint programs' new text lengths where the lore keeps
     them, as K409 did.
   - **Commit.**

## Constraints

- **Pre-launch, no back-compat** (CLAUDE.md, Key Design Decisions).
  - Append the param, and don't bump the codec version.
  - Re-freeze every pin a change moves, and name each one in the commit.
- **The param hotspot.** K324 stage 1 appends `mhn` to `mtn`, the confetti
  lane `cfc`, `cfn` and `cfs`, and K137 stage 1 `fg`, `pa` and `par`.
  Whoever merges later:
  - rebases on master;
  - re-appends its rows after the others' and renumbers the index
    comments;
  - re-freezes `param_codec.test.ts`'s key-order pin and
    `url_codec.test.ts`'s defaults table.

  Check that `mtl` is still free right before you append. The Minotaur
  folder in `tweakpane_panel.ts` and `undo_stack.ts`'s minotaur rows are
  K324 stage 1's too, so keep your rows next to "Show its next move" and
  expect a small rebase there.
- **Agents beside you.** Stay out of their files. If a change seems to
  need one, stop and report.

  | Agent | Files |
  |---|---|
  | K324 stage 1 | `src/game/minotaur.ts` and its test, the minotaur rows in the param files, `undo_stack.ts`'s minotaur rows, `probe_hooks.ts`'s `__knotChase` |
  | K546 stage 1 | `src/game/minotaur_turns.ts` and its test (read only for you), main.ts's catch code |
  | K137 stage 1 | `fabric_controller.ts`, `fragile.ts`, `par.ts`, `walk_graph.ts`, `maze_hud.ts`, `maze_stats.ts`, `share_text.ts`, `shader_warmup.ts`; in `fabric_maze_renderer.ts` `syncExplore`, the pick and the `litArms` predicate (beside `setRim` at :2990); main.ts call sites; `__knotFabric` |
  | The confetti lane (K336 + K186) | `src/render/confetti*.ts`, main.ts's `throwConfetti` and `showFabricWin`, `daily_link.ts`'s exempt keys |
  | K244 | `src/app/input_pointer.ts`, `src/app/auto_audio.ts`, `src/app/audio_map.ts`, `src/render/pluck_*.ts` |
  | K580 stage 2 | `src/core/glyphs/` |

  - In `fabric_maze_renderer.ts`, keep to the telegraph (`drawTelegraph`,
    `drawTelegraphLength`, the bleed branch and the minotaur sync's
    clears) and your call to the ribbons. Leave `rimDecl`, the `litArms`
    gate and `syncExplore` alone.
  - `main.ts` should need no edit. Make any `probe_hooks.ts` edit last,
    after rebasing.
  - After you, K409 stage 4 (the ember over the smoke) and K620 (K580
    stage 3, the root's paint) touch the same paint files and rebase on
    you.
- **No new program variant.** The TELE branch lives in `kPaintAt`'s item
  loop, so it is compiled into every SECTION_FRAG variant, explore ones
  included, which K307's warm-up already compiles. If a new variant turns
  out to be needed, register it in `program_registry.ts` and warm it in
  `shader_warmup.ts` for games with the minotaur on. Otherwise the first
  telegraph compiles cold and freezes the screen.
- **The ring-lap rule (K299).** Any lap math goes through `kLapOf` and
  `kWrap`. `test/render/paint_ring_lap.test.ts` fails on a new rounded
  quotient.
- **Out of scope:**
  - K546's catch look and contact effect;
  - the chevrons (K324 stage 2);
  - the real-time telegraph's plumbing and a moving lead (K324 stage 2).
    In the handoff, note that a moving end could ride a uniform, as the
    hover point does, so that a moving minotaur rewrites no texel;
  - the line drawing over unrevealed threads under the thread reveal.
    Report it as a ledger item, and don't change it;
  - High contrast looks, beyond checking that the rims draw under them.
- **Locks.**
  - Hold the perf lock (`$env:TEMP\claude-perf.lock`: one line with the
    owner, the start time and what) for the GPU numbers.
  - Hold the phone lock for the phone.
  - Wait for either inside one blocking command.
- **Probes:**
  - Never use `--virtual-time-budget`, and use fresh temp Chrome
    profiles.
  - A bare URL is today's daily, so pass a query that turns the turn
    minotaur on.
  - Probes and results go in `.claude/probes/K525/`, untracked.

## Stop rule

Stop when the stage is done or at the 2 h wall-clock cap, whichever comes
first. Run `Get-Date` at the start and at each milestone. If time runs
short, land the rims end to end at the default look (steps 2-4) before
tuning, and leave the phone sheet as a ledger item.

When you stop:
- commit WIP;
- append a "Handoff" section to this doc, with:
  - what landed and the strengths picked;
  - the sheets' paths, the census and the GPU numbers;
  - the pins moved;
  - what's left;
  - the item's handle fields;
- report.

Commit to your branch at every milestone (the param, the paint, the
route, the sheets), and never push. A compaction is not a stop: after
one, re-read this brief and `git log` before going on. Any helper runs on
sonnet with a 1 h cap under this same rule.

End your report with the item's handle fields and a `Ledger items` list.

## Handoff (2026-10-20, 18:54, inside the 2 h cap)

Steps 1-5 and 8 are done, step 6 is partial, and step 7 was skipped:
K409/K631 held the phone lock from 18:25, so the coordinator's rule (skip
it if the phone is not free with 20 min left) applied.

**What landed** on branch `worktree-agent-ae18c5a4888bb8280`, rebased onto
master 62a70c1 (after K324 stage 1, K546 stage 1, K580's glyphs and
K336's cannons) and never pushed:
- `fd4b723`, the param: `minoTelegraphLook` (`mtl`: rims | line | both,
  default rims), appended at codec index 181, after K324's 171-177 and
  K336's 178-180. CODEC_VERSION stays 8. Its message body still says 158
  and v6, from before the rebases.
- `a70c380` and `7a06607`, the paint:
  - PAINT_ITEM_TELE 9 lives in kPaintAt's item loop, so it is in every
    SECTION_FRAG variant. There is no new program and nothing new to
    warm.
  - Also `kTeleOver`, `uKTele` (rgb, w = strength) and
    `ribbons.setTelegraph(pieces | null)` beside setRim. KPAINT is
    rewritten only on a `teleItemKey` change.
  - The mirror is in paint_math.ts. Parity tests in
    paint_gameplay.test.ts cover a whole run, lead and tail partials,
    both on one run, widths 0.3/0.85/1, alphas 0.45/0.95 and a seam run.
- `aec2be6`, the route: `src/render/telegraph_route.ts`
  `telegraphPieces(g, runs, t, lead)` covers by runs, by length, and a
  `lead` in the ChasePlan shape (tested on a synthetic route). Also the
  look switch in drawTelegraph and drawTelegraphLength, and the clears in
  the bleed branch and syncMinotaur's three hides.
- `65952a6`, the alphas: the line roams at 0.7 on a coarse pointer, and
  `telegraphRimStrength`.
- `7bad589`, the lore: TELEGRAPH RIMS in render-paint.md, the K525 bullet
  in render-shaders.md, gameplay-minotaur.md, gameplay-panel.md and
  gameplay-links.md. Its message cites the pre-rebase SHAs 4f02843 and
  757b378.
- `d930111` adds this handoff and puts the A/B results in the lore.
- The last commit moves `mtl` from 178 to 181 in the lore and this
  handoff, after the rebase onto 62a70c1. Code and pins took 181 in the
  rebased `fd4b723`. No pixel changes.

**Strengths and ends** (first values, untuned):
- **Rims:** roam 0.6, roam on a coarse pointer 0.8, hunt 1. Each piece's
  alpha is 1 for the first run (or the lead) and 0.5
  (TELEGRAPH_LATER_SHARE) for later runs.
- **Ends:**
  - A junction end skips rimGap and fades in over 0.2 world.
  - A mid-run end (the minotaur's spot, a by-length stop) has no gap and
    fades over 0.3.
  - Both are clamped as the hover glow's are.
  - A run shorter than two gaps (1.95 world) shows no rims, only the
    ring.
- **The line look:** desktop alphas are unchanged (roam 0.45, hunt 0.95).
  On a coarse pointer it roams at 0.7, and so does 3b's destination ring,
  which takes the first run's alpha. The by-length ticks keep K481's
  alphas.

**Numbers:**
- **Tests:** `npm test` after the third rebase (onto 62a70c1, `mtl` at
  181) passed 117 files and 1672 tests, with 1 skipped
  (`.claude/probes/K525/vitest_rebased3.log`).
- **Build:** `tsc`, `tsc -p notices` and `vite build` pass on the same
  tree (`build_rebased3.log`).
- **Pins moved:**
  - `param_codec.test.ts`'s key-order pin, and `url_codec.test.ts`'s
    defaults table and OVERRIDE_KEYS, by `mtl` only.
  - `k320_slim.test.ts`'s budgets, now 46,900 and 63,300 (it measures
    46,844 and 63,259).
  - The knot-mode golden snapshot, the golden dailies and K87 did not
    move.
- **Section texts:**
  - section-rgb grew from 46014 to 46811 characters, and its explore
    variant from 62429 to 63226.
  - Arm-strip, junction-field and the plucks are unchanged byte for
    byte.
  - Compiled on D3D11. SwiftShader was not run.
- **GPU** (`gpu_k525.mjs`, perf lock, RX 6800 XT, 3200x1800, the hunter
  after 3 moves, phw=0; `s6/gpu_r{1,2}_{base,branch}.log`). The
  differences are noise.

  | ms per frame, rounds 1 / 2 | master | branch |
  |---|---|---|
  | ribbon program | 2.818 / 2.852 | 2.813 / 2.799 |
  | fans | 0.601 / 0.627 | 0.619 / 0.607 |
  | frame | 3.85 / 3.91 | 3.92 / 3.85 |

- **Same-state A/Bs against master** (`hm_probe.mjs ab`, 1400x900, phy=0,
  clocks pinned; four phases plus a hovered choice and a hovered rim):
  - No minotaur: 24 of 24 at 0 px (`s6/hm_desktop.log`).
  - `&mt=hunter&mtl=line`: 24 of 24 at 0 px (`s6/hm_line.log`). The
    minotaur did draw: 3735 px against the run without it.
  - `&mt=hunter&mtg=0` (the brief's "mtg off"), final code 1b7bd12
    (step 8 before the rebase onto 62a70c1, now 7bad589) against master
    635ae58: 24 of 24 at 0 px (`s6/hm_mtg0.log`,
    `s6_mtg_ab.ps1`). The minotaur drew: 880 px against the no-minotaur
    run, and 2895 px against the line run, whose telegraph it lacks.
  - The first two pairs are master 8b7411e against the branch's
    pre-rebase 4efb91b, which holds the same K525 code.
- **Census:** not run (`census_rim.mjs` is not adapted for TELE).

**Sheets** (separate runs, not same-state):
- `.claude/probes/K525/s6/K525_sheet_desktop.png`: 1400x900, with roam,
  hunt, by length and the fog bleed, for master and the three looks.
- `s6/K525_zoom_desktop.png`: roam and hunt at 1.5x (`crop_zoom.ps1`).
- `s6/K525_sheet_phone.png`: an EMULATED 411x753 dsf 2 coarse pointer,
  not the Pixel; master, rims and line.
- `baseline/`: master 8b7411e's shots.
- **Findings:**
  - Roaming at desktop zoom, the rims read on both edges of the route.
  - On the hunt shot's short route, the rims show only a short mid-run
    piece: the junction gaps and fades eat the short runs. The line draws
    the whole route.
  - On the emulated phone at fit zoom, the rims are faint at roam (0.8)
    and short at hunt, and the line reads more clearly.
  - Tuning (step 6's last bullet) is not done.

**What's left:**
- **Step 7:** the Pixel sheet (roam, hunt, a catch and the fog glow),
  beside K524's.
- **Step 6's extras:**
  - a red-section run on the route;
  - the gold trail under it;
  - a hovered run on the route (the red-then-white order is unchecked on
    screen);
  - High contrast;
  - white rims.
- The GPU vs mirror census for TELE.
- **Tuning:** the strengths and fades, and the junction-end call.
  Consider gap 0 at the route's interior junctions, so that the short
  hunt runs light.
- **A moving end** (K324 stage 2) could ride a uniform, as the hover point
  does (`uKReach.w`, an unwrapped ctrl the RIM item reads through kArcU).
  A moving minotaur would then rewrite no texel: KPAINT keeps the route's
  fixed pieces, and the TELE branch clamps the lead piece's moving end to
  the uniform. Today a changed `lead` changes `teleItemKey` and rewrites
  KPAINT.
- **Report only** (the brief): the line draws over unrevealed threads
  under the thread reveal.

**Handle fields:**
- owner: nobody since 18:54 2026-10-20 (claude agent ae18c5a4888bb8280
  of claude session 91b19e11, stopped at its stage end; resumed at 19:00
  only to rebase onto 62a70c1 and move `mtl` to 181)
- branch: `worktree-agent-ae18c5a4888bb8280`, worktree
  `.claude/worktrees/agent-ae18c5a4888bb8280`; last commit: the 181
  renumber, on d930111 (unpushed)
- evidence: `.claude/probes/K525/` (baseline/, s6/, s6_batch.ps1,
  s6_line_ab.ps1, s6_mtg_ab.ps1, crop_zoom.ps1, gpu_k525.mjs,
  tele_states.mjs, hm_probe.mjs, mksheet.mjs, pxdiff.mjs)
- next: the coordinator merges. Then the Pixel sheet, the census, the
  extras and the tuning.
- brief: `docs/design/K525_telegraph.md`
