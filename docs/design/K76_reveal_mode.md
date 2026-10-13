# K76 design: the thread-reveal exploration mode

Stage 1 (design and prototype), 2026-10-12. Brief: `docs/design/K76.md`
(Levi's request, verbatim). Nothing merges from this stage: the prototype
lives on `worktree-agent-aea102de995e1ce30` (WIP commits 1fbc0d2 and
23907a5). The implementation is stage 2, after K73 (codec v4, UI files)
and K75 (paint shader, pulse reach) merge.

Contact sheet: `.claude/probes/K76/out/contact.html` (open it locally),
with the PNGs beside it (`contact_desk.png`, `contact_glance.png`,
`contact_phone.png`, `contact_phonefull.png`) and the motion filmstrip
(`contact_motion.png`). The raw frames are in `out/desk/` and
`out/phone/`. Probe paths below are relative to `.claude/probes/K76/`.
Every look was rendered on one frozen state: seed `b` at codec v3's
defaults, physics off (the hidden settle is deterministic, so desktop and
phone show the same layout), 11 real clicks with two detours and
backtracks, paint clock pinned, pointer parked. Desktop is 1400x900; the
phone is emulated at 412x915 and DPR 2.625, with touch taps. The small
dark tick inside the 4-way merge near the top of each crop is G1's known
residual (b) (`.claude/rules/render-gaps.md`), not this mode.

## 0. Recommendation and the decisions for Levi

The mode works as a per-pixel visibility layer over the existing renderer.
The prototype plays end to end through a probe hook (no params or panel
yet): crossings, junction webs, markers, hit-testing and the camera all
follow what is shown.

**Decision 1: the unvisited-end look.** Pick one from the contact sheet.
My recommendation is **Beacon**, which is dots plus a halo:

- **Dots** say what an end means: the thread goes on. The solid thread
  ends in a round cap and continues as a dotted line that shrinks and
  fades. This is Levi's in-thread idea with its own fade design: the
  fade-out becomes the dots.
- **The halo** makes every end findable at a glance. It is a soft, cool
  glow beneath the weave. At the phone's fit scale the dots are only a few
  pixels across, but the halo still shows.
- Nothing else on screen is dotted. The halo's cool cyan is unlike the
  warm head glow and the white and gold pulse crests.
- Neither part is a translucent overlay on the thread. The dots are
  opaque coverage; the halo sits under the weave. So neither can add the
  overlap artifacts described in section 2.4.

Runners-up:

- **Halo alone**, if the dots read as clutter. It keeps Levi's plain
  fade.
- **Dots alone**, if the halo reads as noise. These are hard to find on
  a phone at the fit scale.

Not recommended:

- **Ring**. It is the most findable at a glance, but it reads as an
  object on the thread. It competes with the start and exit discs and
  the head dot, and it crowds the short stubs at the head.
- **Glow tip**. It is subtle, and it competes with the pulse crests on
  the head's arms.
- **Needle** and **Fray** read as thorns and claws.

If Levi wants to keep two looks, add one appended choice param,
`revealEnds` (section 4). Otherwise the chosen look is a constant.

**Decision 2: the params.** All are appended to the codec table that is
current at implementation (v4 once K73 lands). With their defaults the
mode is off, so every existing link and every daily keeps its meaning.

| Param | Type | Range, step | Default | Legacy override key |
|---|---|---|---|---|
| `threadReveal` | flag | | false | `trv` |
| `revealDistance` | lattice units | [1, 12], 0.25 | 2.5 | `rvd` |
| `revealFade` | lattice units | [0.35, 4], 0.05 | 1 | `rvf` |

- `revealDistance` is how far a visited junction's arms show. It includes
  the fade: the shown length is revealDistance, and its last revealFade
  fades out.
- The distances are fixed, not a share of the run (Levi's spec). Like
  junctionBlend, they are lattice units converted to ctrl per run.
- **Why 2.5.** Median runs are about 3.7 lattice units, so most arms show
  a direction but not where they lead. A junction's web already covers
  about 1.1 units (section 2.4).
- **Panel.** In the Maze folder, one `exploration` dropdown (off | fog |
  threads) replaces the fogOfWar checkbox. It is a VIEW over the two
  flags, like gridAlign's slider view, so links stay append-only. The
  dependent rows show below it: fowRadius for fog; revealDistance and
  revealFade for threads; fowIntro for both, relabeled "intro in the
  open".
- **Minimal alternative.** Keep the fogOfWar checkbox and add a
  threadReveal checkbox under it; checking one unchecks the other.

**Decision 3: fog of war.** Make the two exclusive: one exploration mode
at a time.

- They hide different things. Fog hides space around unexplored places;
  thread reveal hides threads by maze adjacency.
- Composed, fog adds almost nothing. Hidden threads are already hidden,
  and a fogged pixel shows the background (K21), which is what a hidden
  thread shows too. All fog would add is clipping the visible stubs past
  its radius, and hiding the exit.
- With both flags set (a hand-edited link), sanitize keeps threadReveal.
- `fowIntro` serves both modes (section 2.8).

**Decision 4: dailies.** Is the mode allowed on a daily? Levi to answer.
Recommendation: not as a player toggle; as a daily THEME later.

- threadReveal is not a playback preference: it changes the puzzle and
  the stats (backtracking costs more when you cannot see). So, like fog,
  turning it on leaves the daily, with the usual "Left Daily #N" toast.
- The way in is K46's direction (2026-10-12): daily themes as
  parameter-constraint sets, revisited after the feature churn. A
  "thread reveal" theme would turn the mode on in that day's frozen
  definition, so everyone plays the same game that day. K46's original
  proposal already rotated fog, the Ariadne thread and the memory trail
  as play modifiers, one a day.
- Making it an exempt preference is the one choice to avoid: two players
  of "the same" daily would play different games.

**Decision 5 (smaller): what a stub may show.** Recommended: Levi's
literal rule.

- Only the arms of VISITED junctions show, out to revealDistance.
- An unvisited junction is never drawn; a stub fades out into it.
- Dead-end tips and the exit and decoy tails within reach show solid to
  the tip. A fade means the thread continues; a plain end means it ends
  there.
- The alternative is "sight along threads": a flood of revealDistance
  over the walk graph from everything explored. It also shows junctions
  within reach and their arms' first stretch. It gives more information
  and is a little more complex. The prototype implements the literal
  rule.

**Decision 6 (K73): the off-screen exit indicator.** Under thread
reveal, hide it until the exit marker has been seen. Otherwise it gives
away the direction. K73 asks the same question about fog.

## 1. What the player sees

The visibility of every point of thread, as built in the prototype
(`src/game/explore_view.ts`):

1. **Explored runs show whole.** These are the runs the player has
   walked: the controller's `taps`, backtracks included.
2. **Stubs.** Every run incident to a VISITED vertex shows from that
   vertex out to revealDistance, its last revealFade fading out.
   - Visited means the entrance, plus every junction and dead-end tip the
     head has reached since the last reset, plus the exit once solved.
   - Distances are lattice units, converted to ctrl through the run's own
     lattice length, so the visible part rides the material as the
     threads relax.
3. **A stub ends inside its run.**
   - If the far vertex is an END (a dead-end tip, or the exit or a decoy
     tail) within reach, the stub shows solid to the tip.
   - Otherwise the fade ends no later than the far vertex. An unvisited
     junction's web is never drawn.
4. **Meeting stubs.** A run whose two visited ends reach each other shows
   whole.
5. **Joints are binary.** A stub stays solid through its own junction's
   web domain, so a fade never runs under that junction's fans (section
   2.4).
   - The web domain is the fillet reach, at most half the run.
   - A fade is at least 0.35 lattice units long. It may run past the
     reach into a hidden junction's area, but never past the run.
6. **Arrival.** When the dot arrives at a new junction, the junction
   appears whole and its arms grow from the web domain out to the reach
   over 0.45 s, eased. A restore or replay adds several vertices at once
   and shows them already grown.
7. **The walk.** The run being walked shows behind the dot, fading just
   ahead of it. Its stub loses its end marker; the dot is the frontier
   now.
8. **Never shown.** Threads that no walk run covers never show
   (decorative loops, if a design has any). They are not part of the
   maze.

**Frontiers.** The "unvisited segment ends" are the fading ends of stubs.
The prototype exports them (`ExploreView.frontiers`: chain, run, fade
start and end) for the marks drawn beside the thread.

`contact_motion.png` shows a move into the unknown. The dot uncovers its
run, the far junction pops in with the dot's arrival, and its arms grow
out.

## 2. Mechanism

### 2.1 Why not the appearance reveal itself

The brief's first guess was the appearance reveal: since G2.1 it hides
threads, gates crossings and fades, per pixel. Its machinery is the right
model, but its sources are the wrong ones:

- **Different drivers.** The reveal is driven by time: one plan of fronts
  is built once per intro, each source has a start time and a rate, and a
  finished front ends hard. Exploration is driven by state, and its pieces
  change with every move.
- **Shared clocks.** The reveal's sources share the FX clocks, speed
  knots, show-time gates and burn and rainbow styling with the intro.
  Both run at once whenever an intro plays under the mode.

So exploration is its own channel built the G2 way:

- a declaration in a data texture;
- a per-pixel evaluation in the section shader;
- a CPU twin for everything the CPU decides.

It composes with the intro by multiplication.

### 2.2 Data and the shader

- **Declaration.** The visible pieces travel in the gameplay paint
  declaration (KPAINT) as a new item type, `PI_VIS`.
  - Item texels: T0 = (VIS, c0, c1, f0), T1 = (f1, tip flags, -, -).
  - c0 and c1 bound the solid stretch, as unwrapped ctrls. f0 and f1 are
    the fade lengths below and above it.
  - Each item is referenced from every control slot it touches, like
    spans. `setPaintItems` uploads only the texels that changed: a move
    frame sends a few.
  - kPaintAt skips the new type.
- **Evaluation.** `kExploreAt(chain, ctrl)` walks the slot's references
  and returns the largest visibility:
  - 1 inside a piece;
  - a smoothstep across each fade;
  - 0 elsewhere.

  Ring chains compare ctrls unwrapped toward the piece's middle. Globals
  report the frontier fade a point lies in (its progress u, where the fade
  starts, the point's unwrapped ctrl) for the end looks.
- **Section shader.** Visibility multiplies the premultiplied alpha. A
  frontier fade lets the look reshape it: dots compare the point's world
  arc past the fade start and its side across the ribbon against round
  dots.
- **Culling.** A chain with no piece is not drawn at all
  (`renderable = false`). Early in a solve most of the maze costs nothing.
- **CPU twin.** `pieceVis` / `exploreVisAt` mirror the shader. Stage 2
  adds the parity test that G2's mirrors have.
- **The uniform.** `uKExplore` = (on, look, breath, threadWidth).
- **Mode off.** No VIS items exist and `uKExplore.x` is 0, so the
  per-pixel work is skipped. The code is still compiled in: sections 5
  and 9 cover what that costs.

### 2.3 Crossing gaps (G1): a hidden over thread must not cut

The rule: **a crossing's gap strength is the OVER pass's visibility.**

- A hidden over thread cuts nothing.
- A fading over thread cuts in proportion to its alpha. Where it is half
  transparent the under thread shows through it half as much, and its
  casing's dark band is half as dark, so the composite is continuous.
- If the under pass is hidden, the gap does not matter.

How this fits G1:

- `gapStrength` already accepts plain strengths in [0, 1], so no shader
  change was needed. The prototype multiplies the plain strength by
  vis(over) at the over's render ctrl, and clears the slot when either
  pass is hidden.
- Emergent crossings follow the same rule.
- Protect, the far-branch smooth-min and the junction clearance are
  unaffected.
- **underWindows.** The windows the yarn and the fillet flanks read are
  pushed only where the over pass shows (vis > 0.5). So the Ariadne
  string dips under shown threads only.
- **Intro gates.** A slot whose reveal gate is still pending keeps its
  gated encoding; the explore factor applies once the gate opens. The
  only difference is in a fade region during the first second of an
  intro, which is negligible.

Stage 2 change: the prototype pays for each visibility change with a full
`update()` (all slots re-solved; 8.0 ms mean on the desktop, section 5).
Stage 2 makes it a STRENGTH PATCH instead:

- keep every slot solved as in mode off (crossing geometry does not
  depend on visibility);
- write vis(over) into texel 1.w of the slots whose visibility changed
  (`GapMaskTable.setStrength`) and upload those rows;
- add an early-out in `gapKeepAt` for strength 0, right after texel 1.

A visibility change then never needs `update()`, and arms can grow every
frame for free.

### 2.4 Junction webs: joints are binary

The first prototype faded a short arm straight through its junction's
web. The fans drew over the translucent arm and doubled its alpha, and
the fan polygons showed as faceted smudges
(`out/try2/z_head_fade.png`). Overlapping translucent primitives are
order-dependent, and the joinery overlaps its own arms by design: seal
disc, wedge flanks, tucked-tip discs. So the fix is a rule, not a shader
trick:

- **Visibility is constant inside every web domain.** A stub stays solid
  through its own junction's domain: the fillet reach
  `fillHalf x 1.25 x cuspRadius`, at least the discs, with a 15% margin,
  and at most half the run. That is 1.12 lattice units at the defaults.
- **Fans gate binary.** A joint draws only when every arm is solid at
  slot +- 0.8, which means visited. An unvisited junction draws no fans,
  so a stub can fade into its area over bare ribbon.
- **Arrival pops the joint in whole** with the dot, and growth starts
  from the domain edge. A dissolving joint would double its alpha the
  same way.
- **Belt and braces.** The arm strips (arm_strip.ts) carry the visibility
  in their alpha. The junction field blends premultiplied, and fans and
  free-tip caps multiply it in. A web is then never more opaque than its
  arms, whatever the domain estimate. A dead-end tip's cap fades with its
  thread.

### 2.5 Markers, pulses, paint, yarn

- **Head dot, start disc, gold path, junction caps.** Always on shown
  material: the start is visited, and caps sit on explored runs.
- **Exit marker and its gap.** Shown once the exit's tail is in sight
  (vis >= 0.98 at the exit), through the same gate the intro uses
  (`revealQuery` / `renderMarkerGaps`). Decoy tails have no markers.
- **Pulses and hover.** These paint the choice arms. Past the stub the
  material is hidden, so the crests vanish with it, and K75's pulse reach
  keeps them near the junction anyway. Recommended: pulseReach no longer
  than revealDistance.
- **The yarn (pv=string).** It lies on walked runs, which are always
  shown, and dips only under shown threads (section 2.3).
- **Trail mode (recentPath).** Explored runs stay shown in their section
  colors after the gold trail has faded. That is the map memory, and
  intended.

### 2.6 Hit-testing and gestures: hidden means empty

The prototype:

- `edgeAt` counts only samples with vis >= 0.5, so a choice can be
  tapped only on its shown stub.
- `pickThread` skips hidden chains and rejects hidden points, so hidden
  threads never pluck.
- The exit marker and its gap wait for vis.

Probe check, physics off (`out/hits.json`, `probe_hits.mjs`):

- 6 of 6 clicks on hidden thread moved nothing and plucked nothing.
- A shown choice stub moved the player.

Stage 2 also needs:

- **Presses.** The press handler treats hidden material as empty space:
  a drag pans, and a double-tap resets the view. It picks with the
  visibility-aware `pickThread`, not `ps.nearest`. A tug grabs the
  picked visible thread's particle; `ps.grab` alone would tug a hidden
  thread.
- **The hover cursor** follows the same test.
- **Plucks** clip their vibrating unit (`pluckUnit`'s reach and span) to
  the shown interval. pluck_overlay draws the lobe it is given, hidden or
  not.
- **Known oddity.** Hidden threads are still physically there. A tug can
  make shown threads move against invisible neighbors. The physics stays
  untouched.

### 2.7 The camera

With cameraMode fit, the fit target is the world box of everything shown:
explored runs and stubs, plus 1.0 lattice unit of room for the marks.
That is `FabricMazeRenderer.exploreVisibleBounds()`, used in place of the
whole knot, following the fog-of-war precedent. It widens as you explore
and eases as before.

- **Cost fix (stage 2).** The prototype re-samples every piece every
  third frame. The main thread costs 0.2 ms per frame at rest with
  everything shown, against 0.05 ms with the mode off; the sampling is the
  likely cause (inferred, not profiled). Stage 2 caches the box per
  declaration and per `update()`.
- **Follow mode** is unchanged: FOLLOW_SPAN around the head. Fog frames
  its radius instead; a reveal analog, 2 x (revealDistance + 2), is an
  option to try in stage 2.
- **Phones.** A portrait phone is width-bound, so the cluster often sits
  small in the middle (`contact_phonefull.png`). Fog behaves the same
  way. This is the reason for the halo half of Beacon.

### 2.8 The intro, restore, reset

- **The intro with threadReveal on.**
  - With fowIntro OFF, the appearance animation plays inside the shown
    set: the intro's mask times the explore mask, so only the entrance
    stub draws in.
  - With fowIntro ON ("intro in the open"), the intro plays unmasked, and
    then the hidden material dissolves over FOG_INTRO_DUR (1.6 s). This
    is a hold uniform: vis = max(vis, hold), with hold going from 1 to 0.
  - During that dissolve, overlapping hidden threads double their alpha
    (section 2.4). It is a transient; A/B it in stage 2.
- **K47 restore and replay.** The explored state is a pure function of
  `taps` and the controller's visited sets, so a restore rebuilds it
  exactly, shown fully grown. The prototype's test: more than one new
  vertex in one sync means a restore.
- **Reset path.** It clears taps, so the explored memory restarts from
  the entrance, as fog's does.
- **A daily's Reset path** (retreatToStart) keeps the taps, so the
  explored memory stays: it is the same attempt.

## 3. The end-marker looks (contact sheet)

| Look | What it is | At a glance (desktop / phone fit) | Fits the visual language | Cost |
|---|---|---|---|---|
| fade | plain smoothstep alpha fade | weak / weak | yes (Levi's baseline) | none |
| halo | cool cyan radial sprite beneath the weave at the fade middle, 3.8 thread widths | good / good | yes; unlike the warm head glow | one sprite per frontier |
| glow | the end brightens cool-white, alpha fade delayed | fair / weak | collides with the pulse crests near the head | per pixel, fade regions only |
| ring | hollow white ring with a dark outline where the solid thread ends | best / good | reads as an object; competes with the start, exit and head markers | Graphics, per frontier |
| dots | round cap, then 2-3 dots shrinking and fading | fair / weak | yes; nothing else is dotted | per pixel, fade regions only |
| needle | width taper to a glowing point (coverage, not alpha) | fair / fair | thorny | per pixel |
| fray | three thinning fibers | fair / weak | reads as claws | per pixel |
| **beacon** | dots + halo | **good / good** | yes | sum of the two |

Notes:

- All looks act only in FRONTIER fades, the stubs' fading ends. The
  walk's lead fade stays plain.
- The halo could breathe slowly to pull the eye (alpha about 0.6 to 0.85
  over 2.5 s; static under reduced motion). The sheet shows it static,
  and a still scene with a dozen breathing glows may be busy. Decide on
  the live build.

## 4. Params, codec, panel, daily (details)

- **Codec.** Append the three params to the table that is current at
  implementation (CODEC_V4 after K73). If Levi wants two looks, also
  append `choice("revealEnds", "beacon", [...])`.
  - `test/ui/param_codec.test.ts` requires every new PARAM_DEFAULTS key
    in the table.
  - The defaults keep every v1-v4 link and every DAILY_V1 day unchanged.
- **url_state.**
  - PARAM_DEFAULTS and the UrlParams docs.
  - The legacy override keys `trv`, `rvd` and `rvf`, so probes can write
    `&trv=1`.
  - Sanitize: `fogOfWar = false` when threadReveal is on; revealFade is
    used as min(revealFade, revealDistance).
- **Panel.** The exploration dropdown and its dependent rows (Decision
  2), in the Maze folder's refreshCond visibility map. Labels differ from
  keys on purpose, as K73 does for pathViz.
- **Tooltips:**
  - revealDistance: "How far the arms of the junctions you have reached
    show, in lattice units; the last part fades out. Applies live."
  - revealFade: "How long that fade-out is."
- **Daily.** No change to DAILY_EXEMPT_KEYS. Add a daily_link test that
  turning threadReveal on leaves the daily.

## 5. Cost and the phone gate

Measured on the prototype: desktop RX 6800 XT, D3D11, 3200x1800, physics
off, flow 0, vellum background, seed `b` after 11 clicks; perf lock held,
CPU idle (`out/gpu1.json`, `out/cpu1.json`).

| State | GPU draw ms / frame | Draw calls | Fit scale |
|---|---|---|---|
| mode off (whole maze) | 2.78, 2.84 | 110 | 22.3 px/unit |
| mode on, mid-solve | 1.29 | 15 | 50.7 px/unit |
| mode on, everything visited (shader bound) | 3.47 | 110 | 21.8 px/unit |

- **The common case is cheaper than mode off**: hidden chains are culled
  and fans skipped.
- **The bound is +0.63 to 0.69 ms (+23%)**, when every ribbon pixel walks
  its slot's references. Part of it is kPaintAt now running on every shown
  pixel: the prototype's paintHere includes the mode, and VIS items set
  the per-chain paint flag.
- **Stage 2 removes most of the bound** with a per-chain visibility flag
  in KGEOM G0, next to fxDone and paintOn: 0 = hidden (not drawn),
  1 = whole (skip the loop, vis 1), 0.5 = partial (loop). Late in a solve
  most visible chains are whole. kPaintAt should also stay gated on the
  chain's real paint (VIS items must not set its flag).

CPU per declaration (one move frame or one growth frame) is 0.22 ms
mean on the desktop: the model, the KPAINT diff and the marks. The
prototype then pays a full `renderer.update()` per change, 8.0 ms mean
(p50 8.5, max 10.7). That is the strength-patch item in section 2.3, and
it is what keeps growth frames cheap.

Mode off against master: +0.3 to 0.45 ms of GPU for the explore code
compiled in but never taken (section 9). Stage 2 compiles the mode as a
shader variant, so mode off runs master's program.

**Phone gate** (Pixel 11 over `scripts/phone.ps1`, `__knotPerf`; no GPU
timer there). The mode ships only if:

1. At rest, mid-solve and everything visited: 60 fps median (master
   holds 58-60).
2. A move frame and a growth frame: main thread under 4 ms with the
   strength patch, no `update()`, and no frame over 33 ms.
3. Arrival: the fan rebuild plus the strip pass fit one frame.
4. The intro with fowIntro on: no frame over 50 ms during the dissolve.

If (1) fails with everything visited, the per-chain whole flag is the
lever; then the dots' per-pixel arc lookups.

## 6. Where stage 2 touches K73 and K75

| Area | Files | Why | Merge note |
|---|---|---|---|
| K75 paint | `paint_glsl.ts` (kPaintAt's item loop; `PI_VIS` beside it; kExploreAt), `paint_math.ts` (the CPU twin + parity test), `paint_const.ts` (`PAINT_ITEM.VIS`), `paint_model.ts` (`uKExplore`) | the declaration and evaluation | K75 rewrites kPulseV and adds pulseReach in the same loop. Rebase VIS onto K75's loop; recommend pulseReach no longer than revealDistance |
| K75 / G2 webs | `arm_strip.ts`, `junction_field.ts` | strip alpha, premultiplied field | independent of K75's change |
| K73 codec | `param_codec.ts` (append to v4), `url_state.ts` (defaults, keys, sanitize) | params | strictly after K73's v4 |
| K73 panel | `tweakpane_panel.ts` | exploration dropdown and rows | K73 relabels pathViz in the same folder |
| K73 HUD | off-screen exit indicator | hide until the exit is seen (Decision 6) | follows K73's fog decision |
| G1 gaps | `gap_mask.ts` (`setStrength`, strength-0 early-out), `ribbon_renderer.ts` gates | section 2.3 | no K73 or K75 overlap |
| gameplay | `fabric_maze_renderer.ts`, `main.ts` (input, camera, wiring), `game/explore_view.ts` | sections 2.5-2.8 | K73 edits main.ts wiring too |
| K81 junction paint | `arm_strip.ts`, `junction_field.ts` | the strip alpha (section 2.4) | K81 reworks the traveled band in the webs, after K75; rebase the alpha onto it |
| K80 minotaur | gameplay overlays | does the minotaur's red highlight show on hidden thread? (a K80 decision; showing it through, like a sound you hear, keeps the threat readable) | K80 is research only so far |

## 7. Stage 2 plan

1. **Model.** `game/explore_view.ts` with unit tests: explored runs
   whole; a stub; an END tip in reach; meeting stubs; a short bridge's
   web domain; growth; the walk's lead fade; wrap runs and self-loops on
   rings.
2. **Paint.**
   - `PI_VIS` and kExploreAt, with the CPU twin and a parity test.
   - The per-chain visibility flag in KGEOM.
   - The chosen look.
   - The mode as a shader variant (section 9): mode off is a
     byte-identical same-state A/B against master, at master's GPU ms.
3. **Gaps.** The strength patch, the strength-0 early-out, emergent
   crossings, markers, underWindows.
   - A new census probe: no casing on a shown under thread from a hidden
     over thread; partial casings scale with vis(over).
4. **Joints.** Binary gating keyed on the shown-joint set: rebuild on
   arrivals, not growth frames. The strip alpha stays.
   - Census: vis = 1 along every shown joint's arms out to its domain.
5. **Input and camera** (sections 2.6 and 2.7). Probes: `probe_hits`
   (hidden = empty, choices tap), a tug never grabs hidden thread, the fit
   box.
6. **Params, panel, codec, sanitize, the daily test, the K73 indicator.**
7. **The intro and fowIntro dissolve.** A/B the doubled-alpha transient.
8. **Phone gate (section 5), tsc, vitest, build.** Then a contact sheet
   of the final look on desktop and phone for Levi's sign-off.

## 8. The prototype (what is on the branch)

- **The model:** `src/game/explore_view.ts` (pure).
- **The paint path:** `PI_VIS` items, `kExploreAt` and the looks in
  SECTION_FRAG (ribbon_renderer.ts).
- **The CPU twin and its users:** `setExplore` / `exploreVisAt`, gap
  gating, fans, caps, pickThread.
- **The joinery:** strip alpha (arm_strip.ts, junction_field.ts).
- **The game side:** explored state, growth, the halo and ring marks,
  `exploreVisibleBounds`, the exit gate and edgeAt
  (fabric_maze_renderer.ts).
- **main.ts:** the camera fit, update requests and the probe hook
  `__knotExplore({on, reach, fade, look, visitAll})`.

Prototype-only shortcuts that stage 2 replaces:

- the full `update()` per change (section 2.3);
- the bounds every third frame (section 2.7);
- no params and no panel;
- no press, tug or pluck clipping (section 2.6);
- no intro handling (gated slots skip the explore factor).

Probes, in `.claude/probes/K76/`:

| Probe | What it does |
|---|---|
| `probe_explore.mjs` | the contact-sheet capture |
| `mk_contact.mjs` | the sheets |
| `probe_motion.mjs` + `mk_strip.mjs` | the filmstrip |
| `probe_gpu.mjs` | GPU per state |
| `probe_cpu.mjs` | declaration and update ms |
| `probe_hits.mjs` | hidden threads are untappable |
| `vite.private-cache.config.ts` | serves the worktree on 5276 with a private dep cache |

## 9. Mode off against master, and what is still open

**Mode off costs GPU in the prototype** (`out/gpu_ab_master.json`): the
same state, interleaved, two rounds, perf lock held, the same probe.
Master is 009d508, a production build served by `scripts/preview.ps1`
on 5277; the prototype is the worktree's dev server. The shader strings
differ only by the change, and the timer query measures the GPU alone.

| Build | GPU draw ms / frame, mode off |
|---|---|
| master 009d508 | 2.35, 2.38, 2.32, 2.37 |
| prototype | 2.62, 2.78, 2.72, 2.80 |

That is +0.3 to 0.45 ms (+13 to 19%) for code that never runs: the
explore chunk in the section shader, and the premultiplied strip and fan
path. It is G1's register-pressure lesson again.

**Stage 2 fix: compile the mode as a shader VARIANT.** A second program
carries the explore chunk, and the renderer swaps programs when the mode
toggles, so with the mode off the program is master's exactly. The same
holds for the strip and fan shaders. The gate: a same-state A/B against
master at 0 px and the same GPU ms.

**Still open:**

- the phone gate (section 5), which needs the Pixel 11 on USB or
  Tailscale;
- GPU per program (`gpu_by_program.mjs`) with the variant in place;
- the two census probes of section 7.