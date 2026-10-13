# Knotmaze ledger

The to-do surface for work that isn't done yet: follow-ups, known
residuals, decisions waiting on Levi, and ideas. Claude Code sessions and
their agents keep it current (the convention lives in claude-config,
`rules/ledger.md`). Add an item the moment something is deferred,
proposed, or left over. Close it by moving it to **Done** with the commit
that resolved it. The daily transcript audit reconciles against this file.

Binding rules stay in `CLAUDE.md`; history and measurements live in
`docs/history.md` and the commit messages, subsystem lore in the
path-scoped `.claude/rules/` files, and design documents in
`docs/design/`. IDs are stable (`K<n>`)
and never reused.

## Waiting on Levi

- **K74** · Maze design: seven decisions, in
  `docs/design/K74_maze_design.md` "Decisions for Levi" (dad40f8;
  conclusions first, diagrams in `docs/design/K74/`).
  - The target band: proposed greedy walk >= 2.5x optimal, <= 15% of
    dailies greedy-solvable within 1.5x (today 1.96x, 25%).
  - The finish: an empty zone (`exitClearance` 12-16, no code), a trap
    zone (corridor + taper, new code), or both.
  - Ship `exitClearance 12` now: in DAILY_V2 only, or codec v4 too?
  - H shapes: H1 fused arm cut, H3 `fourWayFraction` 0.9-1, H6 compound
    move, or H6 now and H1 later (the free-tip cut breaks sleep).
  - Dead ends: long-tail placement with a 20 u (or 30 u) reserve; on in
    DAILY_V2, and at what density?
  - The greedy-trap search: acceptable? At load or offline?
  - K46's greedy band: 1.1x -> far-end 1.5x / heading 2x?

  Probes `.claude/probes/K74/` (`out/scan_final.jsonl` holds the option
  tables); worktree `.claude/worktrees/agent-aeaf1e61bcecaaf0b` kept.
  Fisher's books, Abbott's essays and Buck's book-only chapters are
  unverified (doc section 1). K80's decision 6: dead-end BRANCHES
  several runs behind one bridge make deeper minotaur traps; settle
  their depth together with K80.
- **K76** · The thread-reveal mode's decisions: the stage 1 design is in
  `docs/design/K76_reveal_mode.md` (0474300). The contact sheet of eight
  end looks is `.claude/probes/K76/out/contact.html` (desktop and phone
  PNGs beside it). Decisions:
  - the end look (recommended "Beacon": a round cap continuing as fading
    dots over a soft halo);
  - the params (`threadReveal`, `revealDistance` 2.5, `revealFade` 1,
    and an exploration dropdown off | fog | threads);
  - exclusive with fog;
  - dailies via a theme, not a toggle;
  - the literal reveal rule;
  - hiding the exit indicator until the exit is seen.

  Stage 2 (doc section 7) follows K73, K75 and K81. It must build the
  mode as a separate shader variant: compiled in, it costs mode-off
  frames 2.3 -> 2.8 ms on the desktop (two of K74's CPU scans ran during
  that measurement; re-time in stage 2).
  - owner: nobody since 2026-10-13 00:01 (stage 1 done; the agent of
    session d8031183 can resume while the worktree is kept).
  - branch: `worktree-agent-aea102de995e1ce30`
    (`.claude/worktrees/agent-aea102de995e1ce30`); prototype WIP 1fbc0d2
    and 23907a5, doc c05dbfc (on master as 0474300).
  - evidence: `.claude/probes/K76/`.
  - env: the prototype server is in the doc's handle (port 5276, private
    cacheDir).
  - brief: `docs/design/K76.md`, then `docs/design/K76_reveal_mode.md`.
- **K49** · Kink eye size after K41's chord-law pressure: keep 2.6
  widths (shipped), or 2.8? The side-by-side is done (2026-10-13, 87
  kinks on five links, deterministic same-state A/B): 2.8 opens every
  eye, by +0.05 to +0.31 widths (mean +0.14; median 1.25 -> 1.43; knot
  mode most, 1.26 -> 1.47), but it widens the whole population rather
  than closing the tail: each link's smallest eye gains only +0.07 to
  +0.10 (tw .64 0.85 -> 0.94; the boxed X304 0.74 -> 0.84, which
  measures 0.74 at 2.6 on e7d43f4, not the 0.78 recorded earlier). No
  artifact in any crop pair; all five designs slept at 2.8.
  - Look at `.claude/probes/K49/sheet.png` (12 pairs, 2.6 left),
    `full_pair.png` and `notes.md`; extras there: `sheet_rings.png`,
    `full_pair_marked.png`, `all_L1..L5.png`, raw frames in `out/`.
  - The 2.8 one-liner is `4fa22e2` on `worktree-agent-ac664e8a9e271757a`
    (keep it until the call). If 2.8: rerun K41's sleep sweep (8 seeds x
    default, tw .64, fat fabric, fat knot; flat-law 2.8 pumped on 2/8
    fat seeds, chord-law 2.8 has only these five) and the gesture
    battery, regenerate the knot-mode golden, and update the KINK EYES
    lore and the constant's comment.
- **K52** · Default background: K21 shipped `vellum` at intensity 0.5
  (static parchment grain plus vignette; the page stays navy on average),
  so every existing link and every daily shows it. Keep it, or default
  to `none`? Changing the default later needs codec v4.
- **K57** · (Levi, 2026-10-13: revisit after all other changes, in the
  careful daily review with K46 and K84.) Confirm the daily's exempt
  settings: the ones a player may change without leaving the daily
  (`DAILY_EXEMPT_KEYS` in `src/ui/daily_link.ts`, persisted across
  dailies).
  - Levi's list: volume, soundMode, cameraMode, showStats, panel
    open/close/scroll.
  - The agent added: the rest of the Sound folder (pitchSpace, octaves,
    rootNote, tonicEmphasis, soundSpeed, reverb, brightness, sustain,
    shimmer, pickPosition), Touch & feel (pluckSize, pluckGhost,
    pluckReach, pluckStyle, tugLimit, snapBack), and physics on/off (the
    settled layout is the same).
  - Everything else leaves the daily, including moveSpeed, pathViz, fog,
    the intro and flow, and the physics tuning.
- **K92** · Two calls the K73 agent made (merged 2026-10-13): (1) a tap on
  the "Free play" badge does what the Daily button does and REPLACES the
  design's link, so an unshared custom design is lost; alternatives: an
  undo toast, or pushState + a popstate handler so Back returns to it.
  (2) Under fog of war, a tap on the finish indicator only shows a toast
  and does not pan (direction only, like the indicator itself).
  `.claude/rules/gameplay.md` (MODE BADGE, OFF-SCREEN INDICATORS).
- **K93** · Two calls from K75 (merged 2026-10-13): (1) the trail fade is
  not "linear over the oldest 30%" as K4 decided: a span's gold is linear
  between its two ends, so the run holding the fade start fades all the
  way from the head junction; splitting it in `buildTrail` (gold up to
  the fade start, then linear) would match the decision - cheap, but it
  changes the look. (2) Hover is exempt from `pulseReach` (it lights the
  whole run a tap would take); keep that, or limit hover too? Sheets:
  `.claude/probes/K75/` (`NOTES.txt` indexes them).
- **K94** · Check on real hardware: does the mouse wheel still ZOOM at a
  browser zoom other than 100%, or at fractional display scaling? The
  wheel test in `src/main.ts` (`Number.isInteger(e.deltaY)`, about line
  2182) reads a fractional delta as a two-finger trackpad pan, and K73's
  synthetic wheel (-300 arriving as -449.99998 at DPR 1.5) did exactly
  that. If it pans, the likely fix is a tick test in physical pixels
  (deltaY x devicePixelRatio), whose trackpad side needs his laptop too.
- **K98** · K83's placeholder markers are in (black discs, white stroked
  glyphs; play / flag / ring-and-dot). Four calls:
  (1) the glyphs: keep, pick alternatives from
  `.claude/probes/K83/sheet_glyphs.png`, or send replacements (a new
  glyph is one design entry in `src/render/marker_glyphs.ts`; try one
  live with `__knotFabricRenderer().setMarkerStyle({start, exit, head,
  scale})`);
  (2) the size: 0.75x, 1x (shipped: 1.5 thread widths, about 14 CSS px on
  the phone) or 1.25x;
  (3) at the entrance the head marker sits above the start marker ("you
  are here"); or the start on top;
  (4) the head disc (0.78 world) covers the starts of the arms, so their
  pulses begin under it.
  Sheets: `sheet_glyphs.png`, `sheet_verify.png`.
- **K80** · The minotaur and gameplay-additions design is on master
  (`docs/design/K80_gameplay_additions.md`, 17b729b; the minotaur
  simulated on 110 real walk graphs). Nine calls in its section 0: the
  movement rule (recommended: a telegraphed "hunter", with "guard" and
  "stalker" variants), telegraph on by default, what a catch does (back
  to the entrance, counted), undo in free play only, a wait move (puzzle
  modes only), dead ends as its hunting ground (depth shared with K74),
  dailies as a modifier later, the first music and rhythm experiment,
  and the order after the minotaur (section 5). For the implementation
  brief: glyphs on runs need a phone minimum size (threads are 4-5 px at
  fit scale), and fleeing critters need a simulation first (a perfect
  fleer is uncatchable at equal speed on our looped mazes).
  - next: Levi's section 0 calls, then an implementation brief for the
    hunter.
  - evidence: `.claude/probes/K80/` (copied from the worktree; doc
    section 7 reruns it); worktree
    `.claude/worktrees/agent-a25726c24f262b138` kept.
- **K100** · The fog of war forgets what was explored whenever the path
  empties: a manual backtrack to the entrance, and a daily's backtrack
  Reset path (K47's `retreatToStart`), re-fog everything (`update()` in
  `src/render/fabric_maze_renderer.ts` clears the stamps when
  `pathEdges` is empty; `exploredRuns` in `src/game/daily_attempt.ts`
  mirrors it). Stage 25's spec says "explored stays visible"
  (`docs/history.md`), and the code's comment names Reset path as the
  reset. Keep, or clear only on a restart (recommended; the explored
  runs become every tap since the restart)?
- **K104** · K77's look, live since eec4854: the rounded pluck collapse
  bends no tighter than a radius of 1 h (the A/B's 0.5 h left shoulders,
  2 h erased most of the thinning), and the tap amplitude floor stays at
  0.65 h. Both were the recommendation; confirm, or pick another radius
  (`COLLAPSE_ROUND` in `src/render/pluck_overlay.ts`). Sheet:
  `.claude/probes/K77/K77_before_after.png`.

## In progress

- **K81** · The traveled highlight at junctions: a smooth gold arc from
  the arrival arm to the departure arm instead of the angular blend's
  flat nub (Levi's screenshot in `.claude/probes/K81/`). K75 is merged
  (same paint code): pulses now brighten the thread's own paint, and
  `PulseArm.onPath` is gone.
  - owner: the K81 agent (a8c2a999e6c2d5a8e) of session d8031183,
    started 2026-10-13 01:07.
  - branch: `worktree-agent-a8c2a999e6c2d5a8e`
    (`.claude/worktrees/agent-a8c2a999e6c2d5a8e`), on 457b494; last
    commit: none yet.
  - evidence: `.claude/probes/K81/` in its worktree (copied at merge).
  - next: read the junction paint path (`setPaint`, the fan arm strips),
    then prototype the arc.
  - brief: `docs/design/K81.md`.
  - env: its dev servers on ports 5311-5314.
- **K79** · Backgrounds: speed, params, colors, Motion. Stage A (this
  agent): the speed slider (0 = static, default = today's speeds), vellum
  motion (static by default, K52), the in-app Motion setting (K53: follow
  system / full / reduced, localStorage; also the pluck's reduced swing),
  codec v4 appends, GPU cost. Stage B, another agent after the merge:
  per-effect params and custom colors (brief items 3-4).
  - owner: the K79 stage A agent (a7e566f4ba72a9d2d) of session
    d8031183, started 2026-10-13 02:50.
  - branch: `worktree-agent-a7e566f4ba72a9d2d`
    (`.claude/worktrees/agent-a7e566f4ba72a9d2d`), on 6e3f124; last
    commit: none yet.
  - evidence: `.claude/probes/K79/` in its worktree (copied at merge).
  - next: the speed slider, then vellum's motion.
  - brief: `docs/design/K79.md`.
  - env: its dev servers on ports 5331-5334.

## Next, in order

Overnight order, 2026-10-12 (Levi: proceed through the night with the
remaining shader work). Every stage merges only after desktop
verification AND the phone gate (K10); the phone stays on its charger,
awake, over Tailscale.
Overnight order, 2026-10-13 (Levi: "keep running through the night until
you've addressed all bits that you don't need my input on"). At most three
code agents at once, research on top. Stop launching once the week
passes about 45% (37% at 02:45).
1. Merge the running five as they finish: K80 (docs) is left; K73 and
   K75 merged 2026-10-13 01:00, K83 at 01:30, K74 in dad40f8.
2. K77 merged (eec4854). K81 (the smooth arc, running since 01:07) and
   K79 stage A (running since 02:50); K79 stage B after its merge.
   K49's comparison is done (Waiting on Levi).
3. K87 (the plan's pickFarthest cost, same mazes; in the main session
   from 02:50), K90 stage 1 (measure over-tight folds, prototype a bend
   limit), then K86 (long dead ends behind params that default to
   today's maze).
4. The GPU pipeline: K8 (G3-0 + G3-1 first) and K23, then K9 (G4) and
   K42.

From 00:45, at most TWO code agents at once (Levi asked about tokens):
the same total, at a gentler rate on the 5-hour window (14% used in its
first half hour), so fewer agents die mid-task at the limit. A one-shot
wake-up at 05:07 resumes the run if the limit stalled it.

Waiting for Levi (not started overnight):
- decisions: K74, K76 stage 2, K52, K49, K78;
- deletions: the G3-3 and G4-2 old paths;
- after the churn: K46, K57, K84.

K5-K7 (split, frame loop, worker) follow.

- **K46** · Daily variety, revisited after the feature churn (Levi,
  2026-10-12): no weekly or regular arc; THEMES, each a set of parameter
  constraints; manual per-day overrides later (K82). The measured
  proposal, with his direction at the top, is
  `docs/design/K46_daily_variety.md` (8b1eb90). Its probes are in
  `.claude/probes/K46/`, and the proposal agent's worktree
  (`.claude/worktrees/agent-a78c73cec4770a14d`) is kept. The
  implementation is a `DAILY_V2` from a future `fromDay`. Validation
  must not depend on `Math.hypot` rounding. A DAILY_V2 built on codec v4
  gets trailLength 10 unless it overrides it; the memory-trail days were
  designed around 5 (K73). Brief: `docs/design/K46.md`.

- **K90** · A physical minimum bend radius (Levi, 2026-10-13: "ideally
  we'd have a more physics-based constraint to prevent loops from
  becoming too tight in the first place"). A thread should never fold
  tighter than half its width, so neither the pinch nor the filled lobe
  (K8) ever shows.
  - Stage 1: measure how often over-tight folds occur at rest and under
    tugs (the P3.34 repro), then prototype a one-sided bend constraint.
    Same-chain collision skips +-2 ctrl, so it cannot catch folds that
    short.
  - Guards: the K63 sleep battery, the kink-eye censuses, the gesture
    battery, and the knot-mode golden. An inactive constraint must leave
    the golden byte-identical.
  - Brief: `docs/design/K90.md`.
- **K86** · Long dead ends (Levi: "ensure longer dead end paths with no
  junctions"): port K74's option F to `src/core/maze_plan.ts` (cut each
  dead end where its free tail is longest, place dead ends before the
  choice junctions, reserve a tail; prototype median tail 4.5 -> 22.8 u)
  behind appended params (`deadEndPlacement`, `deadEndTail`) whose
  defaults build today's maze: identity tests on the plan and the
  dailies. Defaults and DAILY_V2 use wait on K74's decision 5. Brief:
  `docs/design/K74_maze_design.md` sections 4 (option F) and 5; the
  prototype is the hooked plan copy in `.claude/probes/K74/`.
- **K87** · The maze plan takes about 250 ms, mostly in `pickFarthest`
  (K74, inferred, not profiled). A running minimum distance per candidate
  would make it nearly free: faster loads, K46's rerolls and K74's
  greedy-trap search. Profile first; the result must be the same maze
  for every seed (identity tests, the golden dailies). Brief:
  `docs/design/K87.md`.
- **K78** · The Knotmaze handbook: algorithms, architecture, decisions
  and trade-offs, and a per-param reference with figures (the
  half-lattice units diagram first). Write it once the churn settles;
  the plan and Levi's open questions (audience, format) are in
  `docs/design/K78_handbook_plan.md`.

- **K5** · Split `main.ts` and `ribbon_renderer.ts` along the new data
  lines, once K1-K3 land.
- **K6** · One frame loop driven by what-changed flags (after K5).
  Replaces K21's stand-in `sceneAnimating()` in main.ts, and the
  render-on-demand loop (K24) asks `background.needsFrame()`.
- **K7** · Physics in a Web Worker, with render-side interpolation between
  physics steps (after K6). Smooths the UI; it does not speed up physics.
  Acceptance includes K28: the intro runs at full frame rate WHILE
  physics settles (no settle-first loader wait).
- **K8** · G3: SDF ribbons drawn from one shared sample texture
  (`docs/design/G3G4_sdf_geometry.md`). Defaults: anchored tails keep
  flat caps, phones stay at a 2x resolution cap. Over-tight folds keep
  today's pinch, not the doc's filled lobe (Levi, 2026-10-13: "Pinching
  is probably better"): shrink the per-sample radii to the local bend
  radius inside the CPU-flagged fold windows. K90 aims to make such
  folds physically impossible. Fold in G1's GPU levers: a loop-free protect test
  (about 0.15 ms of register pressure at 3200x1800), a zoom-aware
  polyline tolerance, a per-point far-branch gate, and dropping the
  globals fetch.
- **K9** · G4: smooth-union SDF junction webs (cuspRadius = blend
  radius); A/B crops at cr 1, 3, 6 before the fans are deleted. Also
  closes G1's x160 leftover: a faint tick where a wedge flank meets a
  tucked bridge, and the merge-core hairline dashes at 4-way merges
  (`.claude/rules/render-gaps.md`), which K74's H3 (`fourWayFraction`
  0.9+) would multiply.
- **K10** · Phone benchmark after every stage. Baseline (Pixel 11, Chrome
  154, 2026-10-11, default maze settled): 30 fps at rest with defaults,
  51 fps with `fw=0`. Flow at rest halves the frame rate today. Compare
  builds only with the knot asleep (or `phy=0`): a stale K1 preview that
  had not slept after 19 s on the phone ran 5.8 fps on physics alone
  (158 ms/frame), while master at Levi's link settled and ran 40 fps.
  Measured 2026-10-12, Pixel 11 over Tailscale, `?b.c&am=instant&snd=none`
  settled, medians of 2 (`.claude/probes/K10/bench_2026-10-12.txt`):
  - pre-G1 40.5 fps with flow, 60 with flow off;
  - G1 58-60 with flow (the regression flow caused is gone);
  - master 56-59 with flow;
  - backgrounds: none 58-59, vellum 56-59, mist 55-58 (a small cost);
  - G2 about 44 with flow on or off (K4);
  - G2 with the fan fix, on K63 (merged): 59.5 with flow, 60.3 flow off
    (master 59.5 / 59.3).
  - K75 + K73 (ce331bc) vs 182b2cf, 2026-10-13: 58.3-60.5 vs 58.3-60.5
    with flow, 60.3 vs 60.3 flow off, 59.3 vs 60.3 with `pv=trail`; both
    sleep at sim 5.0 s (wall 9-20 s is load noise)
    (`bench_2026-10-13_K75K73*.txt`). The bench now records a sample
    from a hidden tab (screen timed out) as null instead of crashing.
  - K83 (5592f8c) vs ce331bc, 2026-10-13: 60.3 vs 60 with flow, 60.3 vs
    60.3 flow off, 60.5 vs 60.5 with `pv=trail`, p90 16.7 ms everywhere;
    every run asleep by sim 5.0 s on both (`bench_2026-10-13_K83.txt`).

  Rerun after every stage: `scripts/preview.ps1` builds per ref,
  `scripts/phone.ps1 -Ports ...`, then `.claude/probes/K10/phone_bench.mjs`.
  The phone must be unlocked and awake. It heats up under back-to-back
  runs (light throttling at 39 C skin, on its charger), which lowers
  flow-on fps for every build alike: check `adb shell dumpsys
  thermalservice` (status 0) and park the tab between runs
  (`.claude/probes/K4/phone_blank.mjs`). Vsync-capped fps cannot show the
  headroom left; a load-amplified bench (a higher render resolution)
  would.

## Residuals (known, not fixed)

- **K11** · Ring + gridAlign: buckles lopsided below strength ~1.8e-3,
  wanders without sleeping at 5e-4..1.6e-3, never sleeps at ga=1.
- **K12** · Star shape, e-w anchors: 6/8 seeds sleep; 2 hover at the
  threshold. Broader per K46's scans at gs 20-24: star fails to sleep on
  4/60 seeds, tree 4/60 and fish 2/60, some with a loud visible thrash
  of about 1 unit per substep. Heart 0/60, ring 0/60, rect 0/400.
  The circle (2026-10-12, gs 18) is clean on its default nw/se anchors
  (7/7) and w/e (6/6), but with n/s anchors 3 of 7 seeds never sleep:
  seeds 1 and 4 thrash at mv 2-6e-2 (about 108 ms of physics per
  frame), and seed 7 holds a standing rider at mv 1e-3. The ring at seed
  7 n/s sleeps. Repro: `?4.c&shp=circle&sa=n&xa=s&am=instant`.
- **K62** · The `branchDensity` and `fourWayFraction` panel rows do
  nothing at the default `junctionSpacing` 2: the same maze for all 150
  seeds tested across 0.25-0.70. They look broken; rescale, relabel or
  hide them. `junctionSpacing` is the real density knob. (K46 finding.)
  K74 refines it: `branchDensity` 0.2-0.6 and `fourWayFraction` 0.4-0.7
  build the identical maze; 0.1, 0 and 0.8 or more change it.
- **K13** · Post-violent-play loud attractor at fat params (the open P3
  problem; fingerprint in `.claude/rules/physics.md`).
- **K14** · Latent seam-window wraps on open chains
  (applyTransversality's window, the slide/project windows,
  updatePassCover's +-12 slots): agent-measured, unfixed.
- **K15** · During a reveal, a joint's fan can turn opaque while a fill
  beside it is still striped (K4 fixes it by construction). May be moot:
  G1 (99443cb) deleted the over-fills. Re-check fan vs base ribbon during
  a reveal.
- **K16** · Physics settle is slow: 100-190 ms/frame at gs 18 on a loaded
  desktop; on the phone 7 sim-seconds took 14 s. K6/K7 fix the UI side.
  It matters more now: the daily (K20) makes the 18x18 default design
  the front door, at about 6 fps for its first seconds on a loaded
  desktop. Every design used to sleep at exactly sim 7.0 s, set by the
  gate rather than the design; since K63 it is about 5.0 (phone: 8.8 s
  wall instead of 13), so settle cost is particles x thread width.
  Thread width costs +25% per substep at 0.58 and +47% at 0.64. Intro
  wall time also stretches with slow settle frames.
- **K65** · Low-gridAlign knots (`ga=0`, e.g. Levi's rect link) creep
  under the quiet threshold: a fresh settle drifts about 1.5 world over
  about 50 s, and a cinch up to about 0.9 world/s. Every sleep gate, old
  or new, freezes them mid-creep. A net-displacement test over the window
  would catch it, but would keep such knots awake for tens of seconds.
  Related: K11. (K63 finding.)
- **K29** · Boxed kinks at tw 0.64: 3 of ~152 kinks (8 seeds) rest at
  0.56-0.78 thread widths of eye hole - boxed in by a fused joint on one
  side and the 1.6 corridor floor on the other, they keep only lattice
  material. A stronger eye pressure (2.6) doesn't lift them; 2.8 left 2/8
  fat seeds awake. See "KINK EYES" in `.claude/rules/physics.md`. Since K41's chord law they
  rest a little smaller, because the flat law had pried their crossings
  open: five at 0.64-0.74 at tw .64, and X304 (seed 3zz2a1) at 0.78-0.80
  at the default width (was 0.83-0.86). K49 is the size decision.
- **K30** · Very wide threads (tw >= 0.72) never sleep - standing riders;
  the same counts as before the kink fix (2/4 seeds at 0.72, 0/4 at 0.8).
  After K41, 7/8 seeds sleep at tw .72 (was 4/8). Seed 1q2w3e's kink X360
  cycles material through its crossing at mv about 0.09 (df373b5 did the
  same); turning eye pressure off doesn't stop it. The slider reaches 0.8.
- **K50** · The riders gate measures overlap after the first final
  collision sweep but before the fusion snap, so a resting overlap of up
  to about 0.04 at joints can go unflagged. Measure the end-of-substep
  state instead. (K41 agent idea.)
- **K59** · Two windows that are BOTH visible, with moves interleaved on
  one daily, end with the last writer's attempt winning. A tab adopts a
  newer saved attempt only when it comes into view; adopting on the
  `storage` event would fix it, at the price of rebuilding the other
  window (intro included) on every move.
- **K54** · Background contrast varies with the palette: ember roughly
  halves mist's (luma spread 11.4 -> 6.1). Normalizing the accents'
  brightness would even it out.
- **K51** · Knot-mode braids: where one pass sits between two twist
  twins, the two ratchets still clamp one after the other. K41's
  ratchet-intersection rule could apply there; no failure seen yet.
- **K26** · Plucks at tight loops, seen zoomed in. Only the concave side
  of the swing is capped, so the time exposure leans outward and a loop's
  eye gets a slightly ragged, enlarged rim during the ring. A symmetric
  cap fixed the eye but carved every hook's outer blur into lumps at
  normal zoom, so it was rejected.
- **K27** · Plucks near junctions. Lobes inside a junction's fillet-web
  footprint (about 1 world at cr 3) keep their base intact, so they ring
  as a crisp thread with a halo rather than a blur, as crossing
  footprints already do.
- **K42** · Silhouette-level cyclic overlaps: three ribbons over one
  pixel, each over the next (user link x170/x93 after repeated cinches,
  x134/x135 in one squeezed cinch: chains 1 > 2 > 0 > 1). G1's per-pixel
  protect can't break a cycle; it needs a per-pixel winner. 52-198
  naked px in those captures.
- **K43** · A fused tail riding its host (user link tips 0/1) is still
  sensitive to draw order. Predates G1.
- **K44** · Probe tooling: the gap census stops a crossing's ideal over
  polyline at 0.5 of the neighbor gap where the renderer uses 0.8 (the
  false overcut at user x57), and its totals drift between two captures
  of one frozen state (cause unknown). Same-state pixel diffs are exact.
  Also: `.claude/probes/K19-K20/probe_daily.mjs`'s time-zone mode hung
  once in `browser.close()` after writing its report (not since, in
  three K47 runs). And a 4x CPU-throttled desktop runs about 5x slower
  than the Pixel 11 (68 s vs 14 s to sleep at V1): use it for ratios
  only. And any hold probe
  must first move past the 4 CSS px tug threshold: since df373b5 a still
  press is a pluck, so the KINK EYES battery's holds did nothing (the
  K41 copy in `.claude/probes/K41/` moves 12 px first). And with flow on,
  a kink census of one frozen state varies by about 0.1 widths between
  captures: A/B at `fw=0`, replacing a link's own `fw=` (a second copy
  is ignored). K63 moved where a `phy=0` link's hidden settle stops, so
  a same-state A/B must pair builds on the same side of K63. The fan
  census's per-arm debug views can swap the two bracketing arms where
  their angles tie (f32 on the GPU, f64 on the CPU); the blended field
  agrees there.
- **K69** · String mode (`pv=string`) on pre-G2.3 builds drew a 1-px
  diagonal sliver from the start to the exit marker inside the markers
  Graphics after a few moves (`?b.c&pv=string`, 6 moves; hiding that
  Graphics removes it). G2.3 does not show it, but it was never
  attributed; look again if it comes back (G2 doc section 7, Follow-ups).
  Since K83 (45aac50) that Graphics draws only the win ring; the markers
  are SDF quads.
- **K95** · Below about 340 px wide, the mode badge drops below the
  hamburger and covers the header of an open panel (K73; the fit levels
  are measured in `.claude/rules/gameplay.md`, MODE BADGE).
- **K103** · Below 10 fps the fit camera, the move animation and the paint
  clock still slow down. The fit camera eases by a fixed fraction per
  frame (0.08 / 0.15), and `tickAnim` and the paint read the ticker's
  `deltaMS`, which Pixi caps at 100 ms. K96 (d8b9175) moved only the
  follow camera onto real elapsed time. Making the fit easing time-based
  would change its feel at the refresh rate it was tuned on. The pluck
  overlay too (`tickPlucks(ticker.deltaMS / 1000)`): since K101
  (e9e01ae) a music note's string motion waits lead + latency for its
  scheduled sound, and below 10 fps it trails the sound by (frame /
  100 ms - 1) x that delay, about 0.15 s at 150 ms frames.
- **K106** · A dark spike inside a hook's tight bend while it rings (the
  ribbon's inner corner). Present with the base collapse off, so not
  K77's: `.claude/probes/K77/out/s2r/s2r_hookspike.png`.
- **K107** · A dark "X" at the center of big knot-mode attack-lobe blurs,
  also present with the collapse off:
  `.claude/probes/K77/out/abknot/sheet_zoomL.png`.

## Approved, to schedule (2026-10-11)

- **K22** · Dynamic resolution scaler (2x up to 3x when frame time
  allows; down when struggling). Part of K6, refined after G3.
- **K23** · GPU particles (G2.4), GPU fog-of-war accumulation, the yarn as
  a gap-masked ribbon (G3-5).
- **K24** · Render on demand when the scene is fully static (battery);
  part of K6. An animated background (K21) must not defeat it.

## Ideas (not scheduled)

Offers from 2026-10-10 that Levi hasn't answered yet (filed from the
audit inbox; the first-tap sound offer is done, 82b6b6b).

- **K32** · Bigger tap targets for maze choices on touch screens; choices
  are tight at full-maze zoom on a small phone.
- **K33** · A share button that opens the phone's native share sheet with
  the link (the link holds the whole design). The daily's result share
  shipped with K20 (win banner and stats view); a general "share this
  design" button is what remains.
- **K34** · The settings panel as a bottom sheet in portrait on phones.
- **K35** · A short vibration on pluck (Android only; `navigator.vibrate`).
- **K36** · Add to home screen: a web app manifest and icons. Blocked on
  icon art (Levi has the prompt for another model). The same art fixes
  the `/favicon.ico` 404 on every load.
- **K37** · Fog-of-war edge wobble: stronger, or a slider (Stage 25b wobbles
  about 14 screen px).
- **K38** · Focus fade: softer, longer gap fades near the player's dot
  (depth-of-field feel), prototyped with a strength slider.
- **K39** · A manual battery/quality toggle for phones (fewer intro
  particles, lower resolution); may fold into K22's automatic scaler.
- **K60** · The panel's Daily button always opens today's daily. After
  leaving an older day, the way back is its stats-history row or
  `?daily=N`; the button could name the day you left.
- **K61** · `encodeDelta` (the old `?daily=N.<delta>` writer) is used
  only by tests now; retire it at the next codec cleanup and keep the
  reader for old links.
- **K55** · An optional parallax background mode: it pans and zooms at a
  fraction of the camera, for depth. Today it is screen-fixed on
  purpose. (K21 agent idea.)
- **K66** · Why do bridges at joints, open tails and kink neighborhoods
  end the settle ramp near an unstable point? They snap to a new rest
  3.5-5 s in, mostly under the quiet threshold, which is what forces
  K63's 2.5 s window. Fixing it could make a 0.75 s window safe (K64).
  (K63 agent idea; harness in `.claude/probes/K63/`.)
- **K84** · After the churn: a pass over EVERY param (Levi, 2026-10-13).
  - Classify each as a viewer preference (localStorage) or a design param
    (the link).
  - Move the preferences into their own panel section.
  - Re-evaluate each param's worth and grouping, and audit names and
    tooltips.
  - Place K73's two viewer preferences, `finishIndicator` and
    `tapToPan` (localStorage, panel checkboxes).

  It meets K57 (the daily's exempt keys are mostly preferences) and
  feeds K78's param reference.
- **K85** · Replay links (Levi, 2026-10-13): record a playthrough, put it
  in a link, and replay it with the path animating. The link works for a
  finished session (watch) or an in-progress one (pick up where it left
  off). Builds on K47: an attempt already IS its tap list plus a
  walk-graph fingerprint, and choice indices encode in a few bits per
  move. A link needs the design token, the taps, and per-move timing for
  a faithful replay. The share link stays as it is.
- **K91** · A shorter quiet window for physics-off loads. They never wake,
  so a freeze 1-4 px short of rest can't snap later, and their hidden
  settle would drop from 5.0 sim-s back toward 3.25. The cost: for about
  4% of designs, the layout differs by 1-4 px from physics-on, which
  K57's exempt physics toggle assumes is the same. (K64 follow-up.)
- **K88** · Validate K74's difficulty measures (greedy walks, route
  turns, decision counts) against real daily solves: moves, backtracks
  and time. Only local results exist today. (K74 idea.)
- **K89** · Fisher-style pacing: loops in series with mid-maze
  bottlenecks, then a calm home stretch. Needs strand cuts and its own
  prototype (`docs/design/K74_maze_design.md`). (K74 idea.)
- **K82** · Manually override the daily maze for a given day (Levi,
  2026-10-12; "could be a follow-up thing"). It fits the pinned-daily
  model as a frozen per-day override table beside the versioned
  definitions. A published day's override must never change, like a
  definition (`.claude/rules/gameplay.md`, daily rule 1).
- **K68** · If junction-web edges look soft at deep zoom, size the arm
  material strip rows from the camera's world-per-pixel (re-packed on
  zoom) instead of raising the 64-texel width for everyone. About 4x the
  default zoom puts a cr 3 median strip step near 1.5 CSS px. (K4 agent
  idea.)
- **K70** · A more dramatic hero settle (P2 polish): the splines round
  the lattice corners from the first frame, so the settle reads as a
  gentle tightening, not zigzags turning into curves. Blend the sampled
  positions toward the control polyline while settle progress is low
  (`docs/history.md`, Follow-ups).
- **K71** · Wobbly threads at slack ~0 (P2 polish): small waviness along
  runs and rope-tight twist chains at the taut end. Candidate knobs:
  constraint iterations, pullOnly bending, repulsion/structural balance
  (`docs/history.md`, Follow-ups).
- **K72** · Twist-eye openness as a user param instead of a constant
  (MIN_PASS_SEPARATION is the main compactness lever; P3.17,
  `docs/history.md`).
- **K97** · Promote K49's `kinkCensusPage` (`.claude/probes/K49/lib.mjs`,
  an in-page port of K41's kink census, within 0.009 of the node
  harness) to tracked `scripts/` for same-state browser A/Bs of eye size.
- **K102** · `src/audio/songs.ts` holds one song (Scarborough Fair): a
  small library of public-domain tunes would serve K80's melody path and
  a song per day (K80 doc section 3).
- **K105** · Scale a pluck's sympathetic lobes from the tapped lobe's
  CAPPED amplitude. They scale from the pre-cap tap amplitude, while the
  tapped lobe is usually clearance-capped (74 of 80 fabric taps), so a
  neighbor can out-swing the lobe that was tapped
  (`src/render/pluck_overlay.ts`, the `sympatheticAmplitude` callers;
  K77 finding).

## Done

(items move here with the commit that resolved them)

- **K77** · Plucks showed sharp, wedge-like depressions (Levi): the base
  collapse met its limits (footprint ramps, tight bends, gap fades) in
  min()s. `roundCollapse` now opens the collapse depth with raised-cosine
  bumps, so the narrowed edge bends no tighter than 1 h; same-state worst
  second difference -5.7 -> -0.98 (bound -1). Cost per pluck layout
  (desktop, `.claude/probes/K77/k77_cost.ts`): 0.02-0.3 ms; a whole chain
  at full depth costs n x h/per (1 ms at n 2000, h/per 8). Done in
  eec4854 + 6e3f124 (2026-10-13; `.claude/probes/K77/`). Follow-ups
  K104-K107.

- **K101** · Music mode timed its notes from `performance.now()` in the
  render tick, so onsets landed up to a frame late and the tempo
  stretched (1.8% at 60 fps, 13.4% with 150 ms frames). Notes are now
  scheduled 0.3 s ahead on the audio clock and start sample-accurately
  in the worklet; measured at 60 fps and 150 ms frames, the interval
  error is at most 0.02 ms and the stretch is 0. Done in e9e01ae
  (2026-10-13; `.claude/probes/K101/`). Residual in K103.
- **K83** · Placeholder marker icons (Levi): black discs with white
  stroked glyphs for the start, finish and head; the finish's off-screen
  indicator wears the same glyph. Phone gate passed (K10, 2026-10-13).
  Done in 45aac50 + 5592f8c (2026-10-13; `.claude/probes/K83/`).
  Follow-ups K98, K99.
- **K96** · The follow camera reaches the head at the same real speed at
  any frame rate: it steps by real elapsed time in substeps of at most
  0.05 s. t95 at 151 ms frames went 8.6 s -> 4.4 s; 60 Hz is unchanged.
  Done in d8b9175 (2026-10-13; `.claude/probes/K96/`). Follow-up K103.
- **K99** · The fog of war lifts at fixed stations along a move's run,
  the same at any frame rate, move speed or mid-flight tap (0097801,
  2026-10-13; `.claude/probes/K99/`). Follow-up K100.
- **K73** · Levi's UI batch: pathViz labels read fullPath / recentPath
  (f917282); codec v4, recentPath lights twice as far, trailLength
  5 -> 10, dailies keep 5 (a99967e); the mode badge, "Free play" off the
  daily and "Replay · not scored" (0772f63); off-screen indicators, the
  finish points the way (ce331bc). Done 2026-10-13; follow-ups K92, K94,
  K95, K96.
- **K75** · recentPath's yellow pulse banding: pulses now brighten the
  thread's own paint (8b1ae7c); `pulseReach` ends the junction's pulse
  trains a set distance out, default 3 (59cba84). Done 2026-10-13; phone
  gate in K10; follow-up K93.
- **K67** · G2's visible changes (`docs/design/G2_shader_paint.md` 3.8,
  plus the fan fix's one-strip-step edge ramps): signed off by Levi on
  2026-10-13. No change needed.
- **K64** · Sleep window: Levi kept the recommended 2.5 sim-s
  (2026-10-13). No change needed; K91 is the physics-off follow-up.
- **K58** · Reset path inside a daily stays a timed backtrack with one
  backtrack per retracted run (Levi, 2026-10-13). No change needed.

- **K48** · Desktop Share keeps copying to the clipboard (Levi,
  2026-10-13). No change needed.
- **K53** · Reduced motion: Levi chose an in-app Motion setting (follow
  system / full / reduced, a viewer preference) on 2026-10-13. Built in
  K79.

- **K45** · CLAUDE.md slimmed from 2,250 lines (about 39k tokens) to
  about 240 (about 5k). History moved verbatim to `docs/history.md`, and
  subsystem lore to six path-scoped `.claude/rules/` files (physics,
  render, render-gaps, gameplay, generation, probes; the largest about
  7.6k tokens), which load only when matching files are touched.
  `.claude/rules/` is tracked; the rest of `.claude/` is ignored. Done in
  436eb37 and 6866d4b (2026-10-12).
  - 717 of 720 old sentences sit in exactly one new file; the other 3
    are pointer rewrites (`.claude/probes/K45/verify.py`).
  - Rules load checked in a `claude -p` transcript; vitest 315.

- **K4** · G2: per-sample color work runs in the shaders. Section colors,
  the reveal and its FX, and gameplay paint are evaluated per pixel from
  data textures (CPU mirror: `src/render/paint_math.ts`), and junction
  fans read per-arm material strips rendered once per frame
  (`src/render/arm_strip.ts`). Done in 72041df..a001b34 (2026-10-12).
  - Phone (Pixel 11, on K63): 59.5 fps with flow, 60.3 flow off (master
    59.5 / 59.3). Without the strips the fans had cost 60 -> 44 fps.
  - Desktop GPU (3200x1800, 5 moves): draw phase 2.07 (master) -> 2.14
    ms; fans 0.59 ms. CPU at rest: tickPaint 0.19 -> 0.01 ms, uploads
    151 -> 0 KB/frame.
  - Censuses against the CPU mirror within 2/255; vitest 315. Record:
    `docs/design/G2_shader_paint.md` section 7; probes
    `.claude/probes/K4/`. Sign-off of the visible changes: K67. G2.4
    (GPU particles) is K23.

- **K63** · The sleep gate counted 45 still FRAMES, so every real settle
  (physics-bound under 10 fps, frames capped at 0.1 s) slept at exactly
  sim 7.0. It now counts 2.5 SIMULATED seconds of quiet
  (`src/physics/sleep_gate.ts`), on every device. Done in 66b4db5,
  ed53344 and 7f75e8f (2026-10-12).
  - Sleep at about 5.0 sim-s on every set (8 seeds x default, fat, tw
    .64, and the five shapes at their daily sizes); desktop wall 12.3 ->
    8.9 s at the default; phone 13.0 -> 8.8 s.
  - The window is the shortest with no false sleep in about 250 harness
    settles and 130 gestures, each frozen state compared with a run that
    kept stepping, plus a margin (K64 is the speed trade).
  - Gap scans and kink censuses identical before and after; gesture
    battery 45/45 re-slept. Guarded by `test/physics/sleep_gate.test.ts`
    and the sleep regression test (a 10 vs 60 fps check).

- **K47 + K56** · Saved daily attempts, and the daily as the front door.
  Done in ba908bb and a72d91d (2026-10-12).
  - A bare URL opens today's daily; any other query, or a non-exempt
    panel edit, leaves it with a "your attempt is saved" toast.
  - The attempt (its taps, fingerprinted) is saved on every move and on
    hide, and restored with a paused clock. Reset path inside a daily is
    a timed backtrack.
  - Schema v2 with v1 migration; exempt preferences persist across
    dailies.
  - Verified: vitest 287, and 99/99 browser checks across 18 modes.
    Probes: `.claude/probes/K19-K20/` (results in `results_K47/`).

- **K21** · Shader noise backgrounds: `background` dropdown (none,
  vellum, mist, wash, silk, aurora, contours) and an intensity slider;
  screen-fixed, low-res and low-rate, colors from the design's gamut;
  fog draws the background in fogged areas; `none` is pixel-identical to
  master. Each effect adds 0.24-0.34 ms of GPU per frame at 3200x1800.
  Done in 66e80e9 (2026-10-12). Probes and contact sheets:
  `.claude/probes/K21/out/final/`.

- **K41** · Since the kink eyes (9920fab), Levi's rect link and the fat
  link never slept (93-95 ms of physics per frame at rest). Done in
  0e98804 and cb73eb5 (2026-10-12):
  - the capsule test solves its closest points in 3D (its 2D solve
    double-pushed twist-eye pairs, a cycle that predates the kink eyes);
  - the eye pressure follows a chord law, 2.6 widths;
  - ratchets intersect at every pass with both a joint and a twist twin;
  - crossing coverage continues through fused joints.

  Results: both links asleep at sim 7.0-7.3, and frame cost at rest
  111-119 -> 5.0-7.5 ms. Browser sweeps 32/32 asleep and gesture battery
  48/48. Guarded by `test/physics/sleep.regression.test.ts`.

- **K19 + K20** · Maze stats (time, efficiency, junctions, dead ends) in
  the HUD and win banner, and a Wordle-style daily maze: `?daily`, Daily
  #1 = 2026-10-12, pinned by the frozen `DAILY_V1`, results and streaks
  in localStorage, emoji-grid share. Also: the last three MazeParams
  joined the codec, and the app now starts with storage blocked. Done in
  3b3e028 and 29b42a1 (2026-10-12). Probes: `.claude/probes/K19-K20/`.

- **K40** · The lane-cut limiter stack (likely a no-op). Done in 99443cb:
  G1 deleted it along with the erase grid.

- **K1** · GPU migration G1: per-pixel crossing gaps. Done in 99443cb
  (casing masks in the ribbon fragment shader replace the erase grid,
  over-fills and fade strip; per-pixel protect for cyclic triangles,
  far-branch smooth-min for concave creases) and 0f25f0f (fused-tip cap
  cover) (2026-10-11). User URL: overcut 1098 -> 1 px and naked 510 -> 5
  (asleep, df373b5), draw calls 419 -> 47, update() 12.0 -> 5.7 ms; GPU
  0.79 -> 1.78 ms/frame at 3200x1800; phone defaults 39 -> 60 fps.
  History: "PER-PIXEL CROSSING GAPS" in `.claude/rules/render-gaps.md`.

- **K31** · Levi's phone collapsed crossing 305 (`?k88dtb.oHFEfg`) to
  3.37 ctrl. Re-checked on the phone (Pixel 11, USB) with the kink fix
  (9920fab): 305 rests at 8.58 ctrl with an open eye and a clean
  gap-faded crossing; all 22 kinks 8.0-15.0 ctrl (median 8.69); asleep
  at sim 7.0 s, wall 10.1 s. Closed in the commit that moved this item
  here (probe: `.claude/probes/probe_k31.mjs`).

- **K28** · Intro vs physics settle: Levi chose option (b) - no interim
  settle-first loader; the intro stays over the live settle until K7's
  worker lets it run at full frame rate (folded into K7's acceptance).

- **K25** · Pluck size default: Levi chose bigger. Done in the commit that
  moved this item here - pluckSize defaults to 1.75 (codec v3; v2 links
  keep 1), panel max 2 -> 3.

- **K2** · Kink loops squished shut. Done in 9920fab: an eye ratchet (7
  thread widths of rest length, rising at the twist-ratchet rate), eye
  pressure across each loop, and no fairing inside kink loops. Every
  kink eye at rest is now >= 0.8 thread widths on the five census URLs
  (user URL: min 0.17 -> 0.97, 16/21 -> 0 under target); fat + default
  sweeps 16/16 asleep (was 13/16).
- **K18** · vitest rewrote the byte-identity snapshot's line endings on
  Windows. Done in the commit that moved this item here: `.gitattributes`
  keeps `*.snap` LF in the working tree.
- **K3** · Render-only plucks plus a physics-off mode (settle, stop
  simulating, then the appear animation; pluck only, no tug). Done in
  df373b5.
- **K17** · Deep URLs such as `levi.dev/knotmaze/foo/bar` failed (the SPA
  fallback served the page under the wrong relative base). Done in the
  commit that moved this item here: `public/404.html` turns off Pages'
  SPA fallback and sends any unknown path to the app root, keeping the
  link's token.
