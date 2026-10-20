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

Items stay short (the diet, K353, 2026-10-15): one to three lines; an
In progress handle is its six fields, one line each; a Done entry is
one line, `- **K<n>** · <what>. Done in <commit> (<date>).` Shortened
items keep their full text in `docs/ledger_notes.md`, and older Done
entries move to `docs/ledger_done.md`.

Next free ID: K559.

## Waiting on Levi




- **K261** · K74 stage 2's two calls, built as recommended (Levi may
  change either): the H-cut share is 1; a partial share cuts an even
  stride. `docs/design/K74.md` ("Calls for Levi").
- **K260** · The burn race's calls 2-4 (K114), built as rec.: Reset keeps the fire (fuse relit); the
  fire and the turn minotaur are exclusive; fog stays its own param. `docs/design/K114_burn.md`
  ("Calls for Levi").
- **K280** · The burn race's heat (K114): built `fireSpeed` 0.75, `fireDelay` 0 is hot for careless
  players; rec. r 0.6, h 0. `docs/design/K114_burn.md` ("R.6.1"); numbers
  `.claude/probes/K114/burn/results_tuning_rebased.md`.
- **K282** · The HUD's stats have no explanation during play (only the
  end banners explain them). Add an info button or a long press, or
  leave it (rec.)? `docs/design/K274_K277.md`.
- **K251** · A displaced edge indicator crosses the open phone panel in a 0.25 s slide (K198): keep
  it, or fade the disc out and back in? `docs/design/K198.md` ("Stage 2 handoff"); sheet
  `.claude/probes/K198/stage2/out/contact_sheet.png`.
- **K245** · How hard should the minotaur roam toward the player (K174)?
  `minoToward` sets roamPull 0.5 (63% of games meet it). Keep 0.5; add a
  slider? `docs/design/K174.md`.
- **K244** · Should auto plucks and a drag's release go silent in
  junction cores too (K235 silenced taps)? Its agent left them.
  `render-pluck.md` (K235).
- **K241** · Should a reset's gold webs fade out too (K191's call 1)?
  Only a backtrack fades; a fade needs a second shader base.
  `docs/design/K154_K169.md` ("Stage 2 handoff").
- **K238** · K111 stage 1's four calls, for review: High contrast's look, the Accessibility folder
  first, "Reduced motion" driving Motion, OS reduced motion stilling the flow. `docs/design/K111.md`
  ("Stage 1 handoff"); screenshots `.claude/probes/K111/out/`.
- **K229** · K92's badge row puts the open panel's top at 90 px (100 on
  phones, was 50). Accept it, or move the badge elsewhere while the
  panel is open? `.claude/probes/K92/out/phone_open.png`.
- **K225** · The markers' default size (K98): `markerSize` 1.08 is about
  5 CSS px on the phone and barely reads. Keep it, raise it, or add a
  minimum on-screen size? `.claude/probes/K98/sheet_k98.png`.
- **K90** · Min bend radius (1a-1b merged 6f97b92..feb12a0): ship, tune or stop (rec. stop)? Test
  `__knotSplineBend(true)`. `docs/design/K90_bend_radius.md`, `docs/design/K90.md`,
  `.claude/probes/K90/out_1b/`. K213 first, never with K8; G3-2 waits (K361 q13; Levi: not sure).



- **K194** · K180's calls: defaults (crossings `through`, glow `off` or `fallback`); (2) moot
  (K235). If `fallback` ships, time `peakEstimate` on the Pixel. `docs/design/K180.md` ("Stage 1
  handoff"); play https://levi.dev/knotmaze/?7&pw=1&pcx=ride&pgl=fallback
- **K162** · K147's calls: the slow-motion first settle, the defaults
  (`settleBudget` 12 ms, `loadSettle` 0.45 s), daily-exempt, a drag
  budget. Levi plays first. `docs/design/K147.md`.
- **K184** · K155's star calls, built as noted: exactly two stars for
  greedy solves; catches cap a finish at two; "2.2× the shortest route",
  not a percent. `docs/design/K155.md` ("Stage 1 handoff").
- **K185** · The still pluck's cold-link stall (about 340 ms, first
  use): (a) accept it (rec.), (b) `KHR_parallel_shader_compile`, or (c)
  warm it at load? `docs/design/K104.md` ("Stage 1c handoff").
- **K186** · K140's confetti calls: reduced motion's slow spray or none; confetti on every win
  banner or only a live finish; the colors and amount. `docs/design/K140.md` ("Stage 1 handoff");
  play https://levi.dev/knotmaze/?7 (`&cfa=3` for the most).



- **K394** · The overnight of 2026-10-14/15 (`docs/design/overnight_2026-10-15.md`): eight
  calls (F1-F8), each built as recommended (rec: keep all). Its six questions are answered
  (2026-10-15) except K339's and K361's spline bend (K90).
- **K400** · K114 s2 (`docs/design/K114_stage2.md` "Questions"; recs build unless Levi objects):
  realtime dot at constant pace, moveSpeed unused (rec. (a)); one fireSpeed/fireDelay, both clocks;
  lose when the fire reaches you; realtime queues taps; `fireClock` a Burn race row (K323).
- **K401** · K80 turns s3 (`docs/design/K80_turns_stage3.md` "Questions"; recs build unless Levi
  objects): 3a now, 3b after K290 3b, chevrons after K324 s2; guard/stalker rows per model (rec.
  (c)); wait keys `.`, Space; pad center waits; turn pull own param (0); K293 (d), (f) stay lore.
- **K406** · K395's CAP_ROUND: 1.5 (as built, = COLLAPSE_ROUND) or 3 (tip inner edge turns +19° to
  +42° not +31° to +56°, flat arch, 0.02-0.03 world less inner swing; 6 looks like 3). Live as
  `PluckOverlay.capRound`; sheets `.claude/probes/K395/out/`. Stays 1.5 until Levi picks.
- **K409** · The fire's widths are in ctrl (band 0.7, ember 0.25/0.55), a 2.6x spread; on the phone
  the gone ember is a ~1.7 px rim. Options: world units; ember onto the unburnt side under gone; no
  band under gone; ember over smoke (rec.: all but the third). `K114_burn.md` 3c handoff item 4.
- **K421** · The stalker's accuracy default (K294: 0.45) overshoots section 0 on the dailies at 80%
  and fog-4 (27.9 and 28.5% caught against 20 and 12); stage 2's dailies-only criterion would
  keep 0.25-0.3. Keep 0.45? `docs/design/K80_turns_stage3.md` ("Stage 3a handoff").

- **K515** · K480 stage 2's look, built as recommended (Levi may change): a hovered tap's whole route at the hover breath, its tapped run keeping the rim glow, non-route branched arms keeping their trains; plus page-probing the hover route with a real pointer (desktop, and in K500's phone pass). `docs/design/K480.md` ("Stage 2 handoff").

- **K525** · Levi's look call on K80 turns 3b, built as recommended: telegraph roam 0.45 / hunt 0.95 with the second run at half, the 0.45 s catch ring burst, and the fog bleed at 0.16. `.claude/probes/K80/stage3b/contact_sheet.png`. The real-phone sheet is now `.claude/probes/K80/stage3b/contact_sheet_real.png` (K524): hunt 0.95 reads clearly at fit zoom, roam 0.45 is effectively invisible at fit zoom, the catch ring had mostly faded by the shot, and fog bleed 0.16 is unexercised (fog off in this design).
- **K545** · K481 stage 3's look for Levi (built as recommended in 31b2238): lit tick + moved ring on hover/press, phone bigger ticks with the caught-choice tint at the head (desktop ticks alone); the real-phone sheet rides the next phone window (this stage was emulated 411x753 only) and Levi's call whether the tint should show on desktop too. `docs/design/K481.md` (Stage 3 handoff); `.claude/probes/K481/stage3/`.

## In progress

- **K114** · Gameplay round 2, designed in
  `docs/design/K80_gameplay_additions.md` section R: burn race, cut
  verb, beat rider, spider, Pluck Hero MVP. Levi took the recs (calls
  1-6, 8-10; call 7: a separate spider enemy, a no-spiders setting that
  swaps its icon). Burn stage 1 merged (`src/game/fire.ts`; calls K260,
  K280, residuals K281).
  - owner: nobody since 2026-10-15 12:31 (stage 2 merged at cebb75e; agent `a58dfc230583f43e4` of claude session 05e60da0, worktree since removed, K161)
  - branch: mainline; last commit: `cebb75e`
  - evidence: `.claude/probes/K114/stage2/` (`burn_sim_rt.ts`, `proposal.md`, `results_rt*.md`, `rt_page.mjs`, `perf_attr.ps1`, `vref_probe.mjs`, shots `out_rt*/`); stage 1's: `.claude/probes/K114/burn/` (`results_tuning_rebased.md`, `burn_sim.ts`, `burn_page.mjs`)
  - next: K441's profile (K461 done: `rt_page.mjs` passes `fsr` / `fdr`). Stage 3: the burn look as a shader with K290's burnt toggle; the spider follows the minotaur's controls (K174). Stage 2's residuals K442-K447
  - brief: `docs/design/K114_stage2.md` (Stage 2 handoff); stage 1's handoff: `docs/design/K114_burn.md`
- **K115** · Cursive text (Hershey Script Simplex + Greek; `docs/design/K115_cursive_text.md`). Stages 1b-6c done
  2026-10-18: 1b cb7d006..bc357c4, walk 354f8ce, title 6625160, cartouche 1e0a2eb, emblems 2c19d10+dc9bbd0,
  capitals e64f4d6, accents fa1b1ae, Greek 54612f2 (suite 1521 green). Levi (2026-10-19, Daily #8): redesign first.
  - owner: agent `ac64a844a1d15b9d7` of claude session 91b19e11 (opus, started 2026-10-19 20:00, 2 h cap ~22:00)
  - branch: `worktree-agent-ac64a844a1d15b9d7`, worktree `.claude/worktrees/agent-ac64a844a1d15b9d7`; last commit: `c24cc97`
  - evidence: `.claude/probes/K115/stage8/`
  - next: stage 8 (research, docs only): defect attribution, junction census, the glyph design docs/design/K115_glyphs.md, metrics harness, the stage 9 brief; Levi's look call on stage 9 before any mass authoring; then stage 7's live dates (docs/design/K115_stage7.md), K557
  - brief: `docs/design/K115_stage8.md`; the design so far: `docs/design/K115_cursive_text.md`
- **K74** · Maze design, decided (Levi, 2026-10-13;
  `docs/design/K74_maze_design.md`): every mechanism gets params whose
  neutral value turns it off. Stage 1 (long-tail dead ends) and stage 2
  (H1, the fused arm cut; calls K261, residuals K278) merged; stage 3 is
  the trap-zone finish, stage 4 the greedy-trap search and K46's bands.
  - owner: nobody since 2026-10-15 08:31 (stage 3's brief merged in 9f1ada2; docs agent
    `ae4714d103b5fd3bf` of claude session 05e60da0, worktree removed 2026-10-19, K161). Stage 2's agent
    a2c61932e9e358104 (session d8031183) finished; worktrees removed by the K161 sweep
    2026-10-15, branches kept
  - branch: mainline; last commit: `49efe76` (stage 4 sim-first; stage 3 9ccf360, stages 1-2 fbf5b5c..faa9a52)
  - evidence: `.claude/probes/K74/` (stage 2 in `stage2/`, sheets in
    `out/`); the design agent's probes, copied from its swept worktree 2026-10-15 (its branch,
    patch-identical with master, deleted 2026-10-19)
  - next: K521 done in 4098946; stage 4 build half done in 7d794b5 (K527/K532: greedy-trap search behind `greedyTrap`, H1-in-loop only; gF median 2.86 -> 3.38, within-1.5x 20.0% -> 11.7%, both-targets 38.8% -> 59.2%, generation 25 -> 74 ms median; off = byte-identical). Left: the before/after sheet K543 and the phone timing K544.
    Dead-end branches as deeper traps are out of scope; K80's brief does not settle them
  - brief: `docs/design/K74_stage3.md`; stage 2's handoff: `docs/design/K74.md`; stage 4's brief: `docs/design/K74_stage4.md`
- **K80** · The minotaur, decided (Levi, 2026-10-13; design
  `docs/design/K80_gameplay_additions.md` section 0, his answers in
  `docs/design/levi_notes_2026-10-13.md`): a telegraphed hunter with
  guard and stalker variants, real time as its own mode, turn-aligned as
  a modifier. Real time merged (`5fed5c1`); turns stages 1, 2 and 3a merged (3a: the wait on
  every input, the give-up and roam-min knobs, the turn pull, K294, K293); stalker call K421.
  - owner: nobody since 2026-10-15 10:15 (turns 3a done, merged 10:15; agent `ad4536aff31e4c7ba`
    of claude session 05e60da0, worktree on K161's sweep list). Stage 2's agent a1579d5c460af2d20 of claude
    d8031183 (earlier agents af5995f5900f0f945 and a9c90f15cd6a55710; worktrees removed by the
    K161 sweep 2026-10-15, branches kept)
  - branch: mainline; last commit: `dcdfaf4` (turns 3b; 3a is 1bd49f8..e6e1734). Merged before: turns
    0047148..68524e1 and 86d404e..02194b4, K174 ecf2169..6ec8275
  - evidence: main checkout `.claude/probes/K80/` (`stage3/`: `wait_inputs.mjs`, `banner/`,
    `compare_after.ts`, `sim.ts`, sweeps, `shots/`, `rerun/K120`, `rerun/K329`; `turns2/`,
    `turns/`, `rt/`) and `.claude/probes/K174/rt/`; the research's branch
    `worktree-agent-a25726c24f262b138` (5 commits not on master; worktree swept 2026-10-15)
  - next: turns 3b done in dcdfaf4 (per-run telegraph alphas, catch feedback with K270 diagnosed and fixed, section 2.10's sounds and fog bleed; the contact sheet `.claude/probes/K80/stage3b/contact_sheet.png` is emulated - the real-phone sheet is K524, Levi's look call K525).
    Next: the chevrons after K324 stage 2. Check its main.ts overlap with K114 stage 2 and K5 M3
    before running them together.
    Before a daily pins a minotaur, waits enter `fc.taps` and K47's fingerprint covers its
    params; real time's phone check is K177
  - brief: `docs/design/K80_turns_stage3.md` (3b: sections 2.7, 2.8, 2.10; "Stage 3a handoff");
    `docs/design/K80_turns.md`; `docs/design/K80_realtime.md`; `docs/design/K80.md`
- **K156** · The round phone pass, `scripts/phone_pass.ps1` (K152 (1),
  from K81's gate kit): two builds run interleaved through a frame bench
  and a JSON looks list into a summary and sheets. Stages 3a-3c merged
  (6521bb2..de5f39e); rounds 2026-10-14, 14b and 14c are done (14c
  merged e6c6034..aa3cdd1).
  - owner: nobody since 2026-10-14 19:45 (round 14c's agent
    a04122e6bc4e56b02 (sonnet) finished; worktree removed by the K161 sweep 2026-10-15, branch kept)
  - branch: mainline; last commit: `aa3cdd1`
  - evidence: `.claude/probes/rounds/2026-10-14c-0e865bf/`,
    `.../2026-10-14-48da84d/`, `.../2026-10-14-81d31a5/`;
    `.claude/probes/K156/3c/`; the A/A in `.claude/probes/K253/aa3/`
  - next: the next phone window Levi lends: frames (done 2026-10-16 after K513's gate fix: `-Phase frames -Reps 2` A/A on 65a7787, emulation REAL, all cells within noise; fabric ~59.5-60 fps, knot ~60.3 fps, load first sleep 16.3-17.5 s; evidence `.claude/probes/rounds/2026-10-16-65a7787/`; `-Phase frames -Reps
    2` on K253's portrait floor; K300's `-Moves` fix waits for the next
    A/A), K307's phone measures, the finish frame rate under K317's
    confetti, K98 and K92 (K230), the 14 dropped looks (K233), K232's
    load cells at 3 reps; looks cope with
    K301's width flip
  - brief: `docs/design/K156.md` ("Round 2026-10-14c handoff"; the next
    round gets its own section); K7 stage 5's phone plan is
    `docs/design/K7_worker.md` Design 10
  - env: none; the pass builds and serves both builds itself (ports
    5480-5489); check nobody is using the phone first (K234)
- **K268** · Shaped crossing gaps under thread reveal (K76; Levi, 2026-10-14):
  no gap until the over thread is seen, a dynamic gap for a stub's overlap and
  dead ends. Stages 1-2 merged (stage 2: 189b024..f799991; MAX fixed, joints fade).
  - owner: nobody since 2026-10-15 11:22 (stage 3a's agent `a5d9b049e72746ad2` of claude session 05e60da0 finished; merged 11:26, worktree on K161's sweep list). Stage 2's agent `a42c63c2db0401edb` (session d8031183): worktree swept; stage 1's `ab65d913a3b9a3dcb` is left, locked by the live Claude process (K161); branches kept
  - branch: mainline; last commit: `377bc41` (K430 ramp; G3-1 3465090 before it)
  - evidence: `.claude/probes/K268/stage3a/` (census3a.mjs, 31/31 on master; sheet3a.mjs; the k76_probe.mjs copy with the bit-exact view wait; `out/`); `.claude/probes/K268/stage2/`; stage 1's beside it
  - next: Stage 2 item 2 is COMPLETE (ramp 377bc41, PROTECT 1fc9458, far-branch this commit: the smooth-min blends vis-weighted cuts, census3a 22/31 = baseline, K537's 9 fails unchanged; evidence `.claude/probes/K268/stage3a/out/census_far1/`). Left: items 5/6 by eye (intro close-in; phone proof rides K156's next window). Probe fixes: K431 (narrowed), K432; far-branch GPU isolation is K547
  - brief: `docs/design/K268.md`, Stage 3a handoff (2026-10-15 11:35), For the next stage
- **K7** · Physics in a Web Worker with render-side interpolation (K28; Levi's
  calls K302). Stages 1-7 merged: the worker is the default (stage 6, call F6), `&phw=0` runs
  in-thread. Stage 7 (6cfb416..fdb38ac) builds the first scene from the Worker's name and
  modulepreloads its chunk: ready 139-165 ms in on the desktop (master 363-396), first visible
  unchanged (K307's compiles set it). The phone (K411's window) still misses the 250 ms gate: the
  worker is ready 311-459 ms after the main chunk (master 454-764); its module alone evaluates at 233-364.
  - owner: nobody since 2026-10-15 10:32 (the phone pass, done in K411's window by claude session 05e60da0; stage 7's agent `a29b026fa5e2829ee` finished 08:57, merged 09:00, worktree on K161's sweep list)
  - branch: mainline; last commit: `fdb38ac`
  - evidence: `.claude/probes/K7/stage7/` (`run_s7.ps1`, `phone_run.ps1`, `s7_desktop.txt`, `s7_phone.txt`, `k7_results.jsonl`, `table_s7.mjs`, `spike/`); stages 3-6 beside it
  - next: Levi's F6 review with the phone numbers (above); then K412
  - brief: `docs/design/K7_worker.md`, "Stage 7 handoff" ("Not done", "For the next stage")
  - env: the phone, under the phone lock (`phone_run.ps1` takes it and runs `stage5/phone_setup.ps1`)
- **K307** · The daily intro's freezes are cold shader compiles (Levi, K302 (8):
  prioritize). Stage 2 merged (ce5e4d9..14d34b5): a program registry and a warm-up that links
  every program blocking (parallel links never reach Chrome's disk cache, K385; call F8).
  - owner: nobody since 2026-10-15 05:39 (stage 2 done; agent `a11d7ce60428b687d` of claude session d8031183, worktree removed by the K161 sweep 2026-10-15, branch kept)
  - branch: mainline; last commit: `e83f203` (stage 3 late enable)
  - evidence: `.claude/probes/K307/` (stage 1's tools and traces; `stage2/`: `trace_intro.mjs`, `run_s2.ps1`, batches 1-7, `runs/`, two A/B builds, `k366_firsttap.mjs`); the throwaway branch `k307-proto` (51f7480), never merged; lore `.claude/rules/render-shaders.md` ("THE WARM-UP")
  - next: stage 3 done in e83f203 (late enable shipped, K517 (b); K385 ships with it - crbug (d) drafted at `.claude/probes/K307/stage3/crbug.md` for Levi to submit; cold first visible 3.27 s, warm restart 0.80 s, suite 1379). Remaining: phone measures only (persistence, Android cache cap, DrDc presents) with K156's next pass. K366 done as measured/attributed in the same commit; its fix is K535
  - brief: `docs/design/K307_intro_freezes.md`, "Stage 2 handoff" and "K385" (the mechanism and the plan)
- **K8** · G3: SDF ribbons drawn from one shared sample texture
  (`docs/design/G3G4_sdf_geometry.md`). G3-0 merged (b3917ca..f6d10e3): the four G3
  tables, capture/restore, `scripts/bench_frame.mjs`; no visual change.
  - owner: nobody since 2026-10-15 14:18 (the phone agent `a2c95d8bde8feeea8` of claude session 05e60da0 finished its bench; G3-0's `af653fa7f942f2f1e` (session d8031183) finished, its worktree left, locked by the live Claude process (K161))
  - branch: mainline; last commit: `3465090` (G3-1; G3-0 f6d10e3)
  - evidence: `.claude/probes/K8/G3-1/` (the brief's texture sizes); `.claude/probes/K8/stage2/` (`notes.md`, `g3_probe.mjs`, `batch3.ps1`-`batch6.ps1`, `phone6.ps1`, results); stage 1's `.claude/probes/K8/stage1/notes.md`
  - next: G3-1 done in 3465090 and browser-verified in K536 (brute vs pruned 0 px, GAP GL readback bit-exact; phone half K539, cold first-visible gap K540). Lane next: R3, R4, G3-2, R5; never beside an R stage, K268 item 4, K90 or another GPU measurement; it may run beside K7. G3-2 needs K90's bend decided
  - brief: `docs/design/K8_G3-1.md`; G3-0's handoff: `docs/design/K8_stage1.md` ("Stage 2 handoff")
- **K5** · Split `main.ts` and `ribbon_renderer.ts` along K1-K3's data lines, with seams so G3 becomes a module
  swap; K6 rides it (`docs/design/K5_K6_split.md`, calls K377). Merged M1-M4 (`src/app/`: camera, frame_loop,
  lifecycle, scene, audio_map; M4 at 9f08bf0): main.ts 5709 → 3725 lines; R1-R2 (`src/render/ribbon/`; R2 at 52faab8): ribbon_renderer.ts 7747 → 5989.
  - owner: nobody since 2026-10-15 15:00 (merged)
  - branch: mainline; last commit: `3166d8f` (R5 1c666ec + e53e4d9, M5 3166d8f)
  - evidence: M4's `.claude/probes/K5/M4/` and R2's `.claude/probes/K5/R2/`; M3's `.claude/probes/K5/M3/` (`checks/`, `frames/`, `step2/`, `k7_results.jsonl` and `k7_table.mjs`, `checks_m3.ps1`, `remap_e6e1734.md`), `.claude/probes/K5/R2/brief/` (the R2 brief's maps), `.claude/probes/K5/R1/` (`checks/`, `checks2/`; `checks3.ps1`, the fog B-vs-B control, never run; R2's inventory `parts.md`, `probe_surface.md`, `surface.json`), `.claude/probes/K5/M2/`; stage 1's tools in `.claude/probes/K5/stage1/`; the design's region maps in `.claude/probes/K5/design/`
  - next: K6-2 done in 926fdfe (2026-10-16); G3-1 done in 3465090 and browser-verified (K536); then R3 (`reveal_fx.ts`, `paint_state.ts`). M4 leftovers K506.
  - brief: `docs/design/K5_K6_split.md` (Stage M4 brief); the R lane `docs/design/K5_R2.md`
- **K290** · Burnt threads, a toggle (Levi, 2026-10-14): `burnt` (`fbt`), gone
  (default: cut out of the reveal's pieces, so gaps close and fans drop the arm) or
  char (CHAR items in the explore programs). Stage 3a merged (b83d1b1..ef92a6a); 3b merged (5913f4f..f7dd57e).
  - owner: nobody since 2026-10-15 11:29 (stage 3c's agent `ab1de7b1a6f3f605a` of claude session 05e60da0 finished; merged 11:30, worktree on K161's sweep list). Stage 3b's agent `a7c0069bafcb78c52` finished 08:53, merged 08:56, worktree on K161's sweep list
  - branch: mainline; last commit: `9636263`
  - evidence: `.claude/probes/K290/stage3c/` (`out/sheets/`: phone, fog, unseen-front and width sheets; `out/width_phone/` and `out/width_desk/` measure.txt; scripts incl. `width_probe.mjs`; `builds/e6e1734`), `stage3b/` and `stage3a/`; burn stage 1's `.claude/probes/K114/`
  - next: Levi's width call K409 (3c's facts), the change if any, then K410 (the mirror). K5 R1's split is not re-probed under a burn: K114 s2 (from 12c5e0a, past R1) shoots burnt frames on it. Open: the grown explore variant's cold-link timing and a cold-cache first-burn trace. K408 rides K114 s2
  - brief: `docs/design/K114_burn.md`, Stage 3c handoff (item 4: the width facts)
- **K397** · The thread reveal's stub artifacts (Levi, 2026-10-15 08:01 and 08:06, phone, `?2gozcj.MgaM`):
  stage 2 fixed issues 1, 2, 4 and 5 (092aca0); left is issue 3, the dark U at a tucked tip's root. At 13:39
  (`.claude/probes/K397/levi_1339.png`) truncated dots and issue 3 still show sometimes; the dot vibration is gone.
  - owner: nobody since 2026-10-15 16:17 (merged; agent `a2806c50953dec23d` of claude session 05e60da0)
  - branch: mainline; last commit: `e0bcad8`
  - evidence: `.claude/probes/K397/stage3/`
  - next: phone pass done (2026-10-16, master dcdfaf4, Pixel 11): issue 3's dark U and the truncated dots not seen on 13 frontiers of Levi's link; the free cap's look is K477's, narrowed there. Nothing else owed; close when K477 lands. Evidence `.claude/probes/K397/stage6/out/`.
  - brief: `docs/design/K397.md`
  - env: the phone, only if the desktop can't reproduce: `scripts/phone.ps1`, under the phone lock (`.claude/probes/agents/phone_lock_take.ps1`)
- **K459** · A pluck at a stub stops short of its end: Levi wants the vibration on the whole solid
  stub, its rounded cap included (2026-10-15 13:39, `?2gozcj.MgaM`, `.claude/probes/K397/levi_1339.png`).
  With K397's truncated dots and Levi's rule that a pluck sound shows the pluck effect (`docs/design/K459.md`).
  - owner: nobody since 2026-10-15 16:30 (merged; agent `a21ef2f5cb56d9def` of claude session 05e60da0)
  - branch: mainline; last commit: `3c92598`
  - evidence: `.claude/probes/K459/`
  - next: test the truncated dots' hypothesis (iii), a marker's gap ring biting dot 2, then (i) and (ii) (`docs/design/K459.md`, Handoff); the free cap's checks are K477
  - brief: `docs/design/K459.md`
- **K552** · Title-thread flag (Levi, 2026-10-19): dailies draw no title thread by default; a checkbox param
  (default off, appended to the codec) draws it, with the maze topology the same either way (the title attaches after
  the plan: `src/core/scene_graph.ts` 175-196). Generalizes stage 3's 3b (`docs/design/K115_stage3.md` 208). Brief:
  `docs/design/K552.md`.
  - owner: agent `a2068d642ae85e250` of claude session 91b19e11 (opus, started 2026-10-19 20:00, 2 h cap ~22:00)
  - branch: `worktree-agent-a2068d642ae85e250`, worktree `.claude/worktrees/agent-a2068d642ae85e250`; last commit: `c24cc97`
  - evidence: `.claude/probes/K552/`
  - next: the stage per the brief: the daily-exempt flag (default off), the sceneTitle gate, the topology pin, maze-form attempts; then the coordinator merges K552 before K558
  - brief: `docs/design/K552.md`
- **K558** · Pen-order crossings (Levi, 2026-10-19): at every text crossing the later stroke in writing order goes
  over; a checkbox param (default off) reverses it. Text only: the maze and the emblems keep alternation. Brief:
  `docs/design/K558.md`.
  - owner: agent `ac645b913261ef81e` of claude session 91b19e11 (opus, started 2026-10-19 20:00, 2 h cap ~22:00)
  - branch: `worktree-agent-ac645b913261ef81e`, worktree `.claude/worktrees/agent-ac645b913261ef81e`; last commit: `c24cc97`
  - evidence: `.claude/probes/K558/`
  - next: the stage per the brief: pen-time keys on SegIn, the pen-order assignment for text, the reverse param, the checkAlternation exemption; merge after K552 (param order K552 then K558)
  - brief: `docs/design/K558.md`
- **K553** · Why K320's split drew no crossing gaps when capability turned it on (K551; D3D11 desktop, live
  2026-10-18): off, the same build draws them. Undiagnosed; gates K320 2c together with K550. Evidence
  `.claude/probes/K551/` (`gaps_check.mjs`; shots `out/` before the fix, `out_fix/`, `out_live/`).
  - owner: agent `ab57cd38a8b19fba4` of claude session 91b19e11 (opus, started 2026-10-19 20:02, 2 h cap ~22:02)
  - branch: `worktree-agent-ab57cd38a8b19fba4`, worktree `.claude/worktrees/agent-ab57cd38a8b19fba4`; last commit: `7d2f943`
  - evidence: `.claude/probes/K553/`
  - next: diagnose the capability path's empty gaps on the broken build (f18dd07^), fix if contained, add the guard; then K550's next stage (Levi took the rec, 2026-10-19)
  - brief: `docs/design/K553.md`

## Next, in order

Binding for every stage:
- It merges after desktop verification. The phone checks each merge
  round in one scripted pass (K152); small UI items get unit tests and a
  screenshot only; render prototypes skip the CPU mirror and parity
  tests until Levi picks a look.
- The phone stays on its charger, awake and unlocked. A pass checks the
  lock first, and its watchdog stops on any touch.
- At most three code agents at once; research and docs agents run on
  top. Briefs are one stage each, with a wall-clock cap (opus 2 h,
  sonnet 1 h; a compaction is not a stop).
- Pre-launch, when two stages append to the link codec, the second to
  merge renumbers.
- Usage: pause at 92% of the week (Levi, 2026-10-15): launch nothing
  new, and pause running agents with their WIP committed. The week
  reset Monday 2026-10-19 11:59 (about 1% at the start); the next reset
  is Monday 2026-10-26 11:59.

Running agents are listed under In progress, each with its own next step.
The queue (coordinator, overnight 2026-10-15/16):
1. Overnight run 2 done (2026-10-16): K507 (7c5daa9), K502+K505 (66fe538), K499 gamepad (9a6f63d, close dde7b83), K510/M6 (c268a9b, close 8808a15), K6-2 with K509 measured 0 px (926fdfe); phone pass: K500 targetAt measured (no budget problem), K156 frames blocked as K513 (fixed 2026-10-16, see Done). Waiting-on-Levi untouched.
2. K480 stage 2 done (2026-10-16, the light: pulses + hover branching to the reach, shader + CPU mirror; `docs/design/K480.md` Stage 2 handoff; look call K515). Next: K481 stage 2 (param/row, animation, telegraph) plus the K501 difficulty call for Levi.

3. K6-3 (= K24) done in 1654ef0 (2026-10-16; phone check K516); G3-1 waits on K399. Overnight residuals wait in their sections; K513 fixed the gate; the K156 frames spot check ran 2026-10-16 (A/A 65a7787, all within noise).

4. Overnight run 3 done (2026-10-16): K513 (6eb0a84), K480 stage 2 (6aaed30), K6-3 (1654ef0, close 7c952cd) all on master; K307 stage 3 probes point Levi at branch (b) late enable (K517); K397's census runs but its dots-cut PROOF stays vacuous and its probe needs a frame-flag port (K518). K481 stage 2 still waits on Levi's K501 difficulty call; G3-1 on K399; K74 stage 3 (K402) and the thread-reveal chain (K76 2c, K268 stage 2, K290, K76 2d) remain queued. Waiting-on-Levi untouched.
5. Overnight run 4 done (2026-10-16): K518 (8215349; residuals K519), K514+K516 (11309be; residual K520), K76 criterion 2 (5da3f5c), K74 stage 3 (9ccf360; residual K521, K284/K402/K278(a) closed). What remains needs Levi first: K501 (K481 stage 2 after it), K517, K515, K399 (G3-1 after it) and the other Waiting calls; then K521's measurement or K74 stage 4, and K397's phone pass + Levi's link (K519).
6. Overnight run 5 done (2026-10-16): K519 (9926525; residuals K522, K523), K521 (4098946; the greedy bar fails on dailies 1-240, owned by K527), K80 turns 3b (dcdfaf4; K270 done, residuals K524-K526), the K397 phone pass (no commit; K397 advanced, K477 narrowed) and K74 stage 4's sim-first half (49efe76; build half K527). Next queue: Levi first - K515 (K480's look), K525 (K80 3b's look), K399 (G3-1 after it) and the rest of Waiting on Levi; then ungated, in order: K527 once its brief's six calls land, K524 in the next phone window (K522/K523 done, Stage 6 handoff in `docs/design/K397.md`).

7. Overnight run 6 done (2026-10-16, final run): K522+K523 (5558669; census2d flicker floor + attributedUW/lifted-exit port, m10 30/30) and K524 (real-Pixel sheet, no commit). Residual K528 (census2d first-frame drift, localize only if it grows). Next queue: Levi first - K515 (K480's look), K525 (K80 3b's look, real sheet now in), K399 (G3-1 after it), K527's six calls, and the rest of Waiting on Levi; then ungated work in their sections.
8. Batch close (2026-10-16): fixes ea2e468 (K398/K346/K436/K454/K469/K314/K373/K526/K461/K500; residual K529), K481 stage 2 a69b5cb (stage 3 = K530), K307 stage 3 e83f203 (K366 measured/attributed, fix = K535; K386 narrowed), G3-1 3465090 (browser verification = K536), K430 ramp 377bc41 (K268 stays In progress; residuals K537, K538; K431 narrowed). Levi answered K210 (-> K531, folds K82), K527 in full (-> K532) and K339/K323 (-> K534, Stage A unlocked); backend dailies filed as K533. Refreshed queue by value - Levi gates first: K515 (K480's look), K525 (K80 3b's look, real sheet in), then the rest of Waiting on Levi; then ungated, in order: K530 (K481 stage 3), K534 (panel Stage A), K527's build half (after the render lane), K536 (G3-1 browser verification), K268's remaining item-2 parts, then work in their sections.
9. Batch 2 close (2026-10-16): K481 stage 3 31b2238 (K530/K481 done; look call K545), panel Stage A1 35f3ec2 (K534 done; A2 = K541), K74 stage 4 build 7d794b5 (K527/K532 done; sheet K543, phone timing K544), G3-1 verified (K536 done in c946ae2; residuals K539, K540), K268 PROTECT 1fc9458 (far-branch smooth-min remains). Queue by value - Levi gates first: K515 (K480's look), K525 (K80 3b's look, real sheet in), K545 (K481 stage 3's look), then the rest of Waiting on Levi; K531 (daily determinism) lands at launch prep and K533 (backend dailies) with the backend/accounts work; then ungated: K268's far-branch smooth-min, K543/K544 when wanted / in K156's next phone window, then work in their sections.
10. New week (2026-10-19): Levi's calls - final ς gets its own glyph; dailies draw no title thread unless a flag asks (K552, maze topology the same either way); the cursive is redesigned before any mass generation (K115: crossings only, later-over-earlier in pen order with a reverse checkbox, smooth paths). K551 done (f18dd07, gaps back live). Next: K552 and K115's redesign stage 1 (agents), claude-config's dedupe fix (CC81); K161 done. Later: K553, then K550.

Levi's order of 2026-10-14 23:00-23:55, kept as history (most of it has
merged):
1. K7 stages 3-5, the physics worker.
2. The thread-reveal chain, one at a time: K76 2c, K268 stage 2, K290,
   K76 2d.
3. K8 (G3): stage 1 re-bases its design doc (docs only), then G3-0 at
   the next free code slot.
4. K5 and K6, as soon as K7 stage 5 merges.
5. K9 (G4) after G3-0; K345 and probably K328 fold into its G4-1.
6. K279 stage 2 (K288's picks), checked against K344's fix.
7. K321.
8. K307's warm-up, then K313.
9. K331 with K330.
10. K111 stage 5 with K265.
11. K332.
12. K323's Stage A (with K339's rebuild; codec 7), then K324 stage 1.
13. K326 A.
14. K318, K336, K337.

- **K410** · The fire's FRONT and SMOLDER paint items into `paint_math`'s mirror and the parity
  tests, once K409 settles the look (K152 item 3; `K114_burn.md` 3b handoff).
- **K412** · K7's worker-chunk modulepreload on a real network (measured only on localhost): a
  fresh-profile load of https://levi.dev/knotmaze/ through `stage7/k7_frames.mjs`; its `wk` column
  reads `c` when the worker's fetch came from the cache through the proxy. Rides K7's phone pass.

Every other item below waits on the trigger it names.

- **K557** · `RUN_FLAG.TEXT`: one text color for the cursive, optionally a reading-order gradient, plus a paint
  override for lent segments (`docs/design/K115_cursive_text.md` 572-583; deferred by `K115_stage4.md` 252-266).
  After K115's redesign.




- **K531** · Daily determinism at launch (K210 answered by Levi, 2026-10-16): past dailies must be deterministically reconstructible as (app version -> that version's frozen PARAM_DEFAULTS) merged with (daily-specific params/custom overrides for that day); post-launch changes must not significantly alter previous dailies. Implementation: frozen per-version defaults table + per-day override table, published days immutable; folds K82 in; lands at launch prep.
- **K533** · Backend daily precomputation (Levi, 2026-10-16, future): regularly precompute and cache daily designs on the backend and serve current + previous dailies, moving daily-calculation logic server-side so future dailies cannot be anticipated client-side. Explore/design/implement later alongside accounts/logins/data persistence (K144). Depends on K531's determinism design.
- **K345** · The hover rim stops `rimGap` (0.975 world) short of junctions;
  Levi (2026-10-14) wants it to follow the fillets. Goes in K9's G4-1 (K8
  s1: piece SDFs give webs an across coordinate; fan work now is wasted).
- **K240** · High contrast for the DOM chrome (K111 follow-up): a CSS layer on
  `:root[data-contrast="high"]` (already set) for the panel, HUD and badge (TS-injected styles).
  Small; after K238's review.
- **K137** · K80 section 4's cheap (S, S-M) mechanisms, each toggled (Levi 10-13), after the
  minotaur: 4.3, 4.7, 4.9, 4.10, 4.13-4.17, 4.21 (after K85), 4.26, 4.28-4.30, 4.32-4.34, plus
  Levi's sleeper variant. `docs/design/K80_gameplay_additions.md`; M: K138, M-L and L: K141.
- **K138** · K80 section 4's M mechanisms (Levi 10-13, `docs/design/levi_notes_2026-10-13.md`),
  after K137: 4.1, 4.2, 4.4 (then 4.5), 4.6 (simulate first), 4.11, 4.12, 4.18-4.20, 4.23, 4.24,
  4.27, 4.31; 4.1, 4.2, 4.4, 4.11, 4.24, 4.31 change generation (check solvability). M-L, L: K141.
- **K139** · Collapse mode (Levi 10-13, `docs/design/levi_notes_2026-10-13.md`): no backtracking,
  each run collapses behind you. `collapse` (off | finish | free); rides 4.3's snap (`fragile`,
  K137) and R.3.4's longest thread (`docs/design/K80_gameplay_additions.md`). S-M, after 4.3.
- **K46** · Daily variety: no weekly arc; THEMES (constraint sets); per-day overrides later (K82).
  Engine-exact (K108); memory-trail themes: trailLength 5 (K73). `docs/design/K46_daily_variety.md`
  (8b1eb90), `docs/design/K46.md`, `.claude/probes/K46/`, branch `worktree-agent-a78c73cec4770a14d`.
- **K78** · The Knotmaze handbook: algorithms, architecture, decisions, a per-param reference,
  figures; written once the churn settles. Public Markdown, later Levi's Blogger devlog: standalone
  figures, no repo links or internal IDs (Levi 10-13). `docs/design/K78_handbook_plan.md`.

- **K297** · A pared-down panel for most players (Levi, 2026-10-14): most rows move behind an
  advanced view, a short set stays in front. Which rows, and how the advanced view opens, come after
  the churn; K292's marks and K84 / K57 feed it.
- **K340** · Nested folders that look distinct from their parents (Levi 10-14). Looks: K339's stage
  (`docs/design/K339_panel_audit.md` section 5, its sheet), rec. look F (K339 call 3). Once Levi
  picks, build its CSS first, check under High contrast; with K339's rebuild.
- **K341** · The second panel audit after the design iteration (Levi 10-14): rerun K339's inventory
  (`scripts/panel_inventory.ts`, `docs/design/K339_inventory.md`) and checklist, feed K297's
  pared-down set (`docs/design/K339_panel_audit.md` item 8).
- **K9** · G4: smooth-union SDF junction webs (cuspRadius = blend radius); A/B crops at cr 1, 3, 6
  before the fans are deleted. Also closes G1's x160 leftover (`.claude/rules/render-gaps.md`); webs
  carry the traveled route as the smooth union of the traveled pieces only (K81).
- **K116** · Pluck instruments, accompaniment, lowest priority (`docs/design/K116_instruments.md`,
  2e60b00, `docs/design/levi_notes_2026-10-13.md`): skeleton (drone, bass, `pluckVoice` presets),
  then marimba, bells; `pvc`, `acc`, `acl` daily-exempt; Pixel audio probe first; loop K125.
- **K144** · Accounts and shared stats, a stretch goal (Levi 10-13): OAuth, cross-device stats,
  opt-in sharing, percentile bands, replay anti-cheat (K108, K47). Backends: Cloudflare Workers + D1
  or the SnoringCat platform (Nakama). Next: design doc. `docs/design/levi_notes_2026-10-13.md`.
- **K10** · Phone benchmark after every stage (Pixel 11; baseline 2026-10-11: 30 fps at rest, 51
  with `fw=0`; K79 stage A 60). Rerun `scripts/preview.ps1` per ref, `scripts/phone.ps1 -Ports ...`,
  `.claude/probes/K10/phone_bench.mjs`; numbers `.claude/probes/K10/bench_*.txt`.
- **K292** · Mark the panel's maze rows with a subtle top-right dog-ear triangle (Levi 10-14), a key
  at the panel's top; personal settings (`DAILY_EXEMPT_KEYS`, localStorage prefs) unmarked; sheet
  for Levi first. After K298; replaces K84's section; K57 settles edge cases; leads to K297.
- **K265** · High contrast's own highlight (K111 s5; Levi 10-14): white rim on both edges, hard
  inner edge; looks 1-3 go (`hcl`, `__knotHcLook`). After K298; never beside K299, K76 2c, K268 s2.
  `docs/design/K111.md` ("Levi's pick", "For stage 5"); looks `.claude/probes/K111/stage4/sheet/`.
- **K309** · Check K299's ring-lap fix on the phone (PowerVR rounds float division its own way; only
  the desktop GPU was checked): in K156's next round, Levi's link `?qoietk.KSIeBoGlf4-` at node_2
  and the seam cases of K299's A/B. `docs/design/K299_choice_pulse_bug.md` ("Not done").
- **K312** · Add K299's lesson to claude-config `rules/lessons.md` (WebGL): GPU float division is
  approximate (ANGLE D3D11 `floor(k*n/n)` = k-1 in 3275 of 16384 pairs), so ring and lap math must
  be integer-corrected. Held while Levi is away (config edits wait for approval).
- **K313** · A loader that looks like the maze (`docs/design/K313_loader.md`; Levi 10-14, approved):
  a trefoil maze with over/under gaps, fixed-length trail, drawn by an OffscreenCanvas worker
  inlined in `index.html` (static SVG first). After K307's warm-up; measure the phone's first frame.
- **K324** · Real-time minotaur, more alive and tunable (`docs/design/K324_realtime_minotaur.md`,
  091e4dc; Levi took section 7's recs): s1 (sim) after K323 s1; s2 (render) after s1, K7 s2, K307
  s2, K329 (checks K270's band); s3 (guard, stalker) after s1. Rel. K245 K247 K271 K293 K294 K296.
- **K326** · Drop knot mode (`mazeFabric`; `docs/design/K323_game_mode.md` s4-5): A freezes a golden
  (after K7 s2); B deletes (after A, K323 s1, K307 s2, K329), retargets `scripts/fold_census.*`,
  `test/physics/byte_identity.test.ts`; optional C: knot paint (after B, K111 s5).
- **K327** · Labels that say what they size (Levi 10-14): `indicatorSize` (edge arrows, a viewer
  pref) and `markerSize` (maze icons) sound alike; proposed "Edge arrow size" and "Maze icon size";
  Touch & feel mixes words with camelCase keys. In K323's design; rel. K247, K292, K297.
- **K328** · Hover rim profile (Levi, 10-14): an opaque outer band, then a
  fade from further in; High contrast reuses it at fade 0. Paint library
  only (K8 s1), with K111 s5 and K265; and hide the glow at strength 0 (K298).
- **K332** · Arrow-key hints (Levi 10-14): a small key icon (or chord, K333) near each choice's
  start, shown after the first arrow key press. After K329. Hooks: `key_moves.ts` (`keyMap`,
  `chordMap`, `keyStep`, `stepWaiting`), K83's `MarkerMesh`, `marker_glyphs.ts`.
- **K331** · Touch gets K298's pick margins (Levi, 2026-10-14): touch moves from world-unit radii to
  the mouse's form, with its own margin row beside `pickMargin` at ~4 px, so zones stop growing
  under a pinch zoom. With K330 after K329 (`docs/design/K298_hover_glow.md`, "Notes").
- **K321** · The credits page (`docs/design/K321_credits.md`; Levi 10-14, approved): page and panel
  link become Credits (`credits.html`): his name and copyright line, art, icon and music credits,
  "Built with Claude Code" (not prominent), then techniques, licenses, research. Small sonnet stage.
- **K318** · Win effects (Levi 10-14): one show, many themes; thirteen themes in a Win effects
  folder (Theme dropdown, Party default), built in twelve stages. Stage 1 after the confetti stage
  and K111 s5. `docs/design/K318_win_effects.md` ("Build stages").
- **K336** · Side cannons (Levi 10-14): finish confetti and streamers blast in from both edges. With
  K335, K337 (`docs/design/K335_confetti.md`); deferred. Draft `docs/design/K336_K337_draft.patch`
  (on K335's merge); codec `cfc`/`cfn`/`cfs`/`cfh`/`cff`; phone fps rides K156's next pass.
- **K337** · Confetti shine (Levi 10-14): spin and flip give each piece a 3D normal lit by one
  upper-left light (diffuse plus a Blinn-Phong flash); reduced motion keeps the diffuse term. With
  K335, K336 (`docs/design/K335_confetti.md`); deferred with K336 (draft in its patch).
- **K365** · K279's phone round: run the fixed `k279_phone.mjs`, pick the
  ripple's CSS floor (56 or 68; rec 56 unless it reads small), and only if the
  phone drops frames, a bbox replay (K279.md "Stage 2 handoff").



- **K370** · Worker input latency, p50 (target 50 ms): desktop 105 on the daily,
  70 on the knot (in-thread 285; K7 s4); phone 231, first motion 173 (in-thread
  872; K7 s5). Measure each stage first (`k7_latency.mjs`); levers: newest snapshot while grabbed, more drag substeps.
- **K376** · Look at the reveal's intro close-in, joints now fading with their
  arms (K268 s2, desktop only so far), on the desktop and the phone; fix any of
  the stage's four small residuals that show (`docs/design/K268.md`, "Stage 2 handoff").
- **K396** · A `scripts/dev.ps1` for Levi's LAN dev server on 5173 (`vite --host 0.0.0.0 --port
  5173 --strictPort`, after checking `node_modules`), so an `env:` line names a script instead of a
  session's memory (claude-config `rules/sessions.md`, "Environment belongs in scripts").
- **K368** · A ring for the ripple under High contrast (K289 e; Levi, 2026-10-15: yes):
  `HIGH_CONTRAST_OVERRIDES` (`src/ui/accessibility.ts`); the glint has little room on light threads over black (inferred, not shot; fallback a stronger glint). Small: a unit test and a screenshot.
- **K441** · The real-time fire's frame cost (K114 s2 item 6): 0.6-1.2 ms more a frame than turn
  (drawFire's re-declare 0.6, HUD writes 0.1, 0.5 unattributed). CPU-profile a turn and a realtime
  stand at one burnt share (K461 first), then decide a re-declare throttle. `docs/design/K114_stage2.md`.
- **K485** · Pixel pass for the phone sheet and row help (scripts/phone.ps1): the sheet query, Back,
  the peek, help taps; K467 ran only in phone emulation
- **K486** · Touch help for the panel's buttons: Reset path, Replay settle, Reset to defaults, the
  seed row, the dice, Daily, stats (K467 covered the 161 rows only)
- **K543** · K74 stage 4's before/after sheet of three finishes (searched vs shipped, dailies 1-3) was not made in the build stage; make it from `.claude/probes/K74/stage4/build_measure.ts` output or a diag_screenshot pair when Levi wants the look check. Sheet: `.claude/probes/K74/stage4/sheet/contact_sheet.png` (`notes.md` beside it).
- **K544** · Phone timing for searched designs (`greedyTrap` on: generation median 74 ms desktop Node, p90 197 ms) rides K156's next phone window, as stage 3's did.
- **K546** · Loss effects (Levi, 2026-10-16): a catch ends early today - animate the player and the minotaur/fire all the way to their meeting point first (contact t is computed in by-length mode; turn and realtime catches leave a visual gap), then a gratuitous contact effect at the meeting point plus a whole-screen loss effect akin to the win confetti. Levi's seeds: an explosion; a flare-up and burn-away; the player indicator ripped in half and falling over. Base to build on: K80 3b's catch feedback (dcdfaf4) and K270's fix; the fire side is K114. Design: `docs/design/K546_loss_effects.md`.

- **K548** · Overnight runner has no usage gate: the 92% weekly pause (Next binding rule) is checked by hand only; 2026-10-15/16 runs 1-6 launched at 88% (under the line, audit 2026-10-18) but nothing stops a launch over it. Add a /usage check to the runner before each batch, or a ledger-stamped usage line per run close.
- **K549** · Text scene fit ignores the open panel: a wide word's exit side sits under the panel (stage 2 probe stalled at tn97 by mouse; programmatic walk solved). Fit text scenes against the panel-cleared range like mazes (K198 view clamp), or close the panel for text scenes.

## Residuals (known, not fixed)

- **K413** · The phone lock (`.claude/probes/agents/phone_lock_take.ps1`) is one line, owner | time |
  what, with no waiter field, so the briefs' "release it between items when K290 or K395 waits"
  never triggers (K7 s7 handoff). Add a waiter line, or drop the rule; claude-config CC62.
- **K414** · Since K7 s7's modulepreload, a `phw=0` page downloads the worker chunk it never runs
  (90 KB raw, beside the 1.0 MB main chunk).
- **K416** · `docs/design/K5_K6_split.md` is stale beyond §2.3 (R1 updates its table): §1.3 ranges
  (f04aa4b), the strip block, §5.1 pins (`paint_explore.test.ts`, `paint_ring_lap.test.ts`), §5.3
  and §6 sequencing, `__knotRenderer`'s move to `src/app/probe_hooks.ts` (K5 R1 brief).
- **K417** · R lane vs the probes (K5 R1 brief): ~80 probes call the sampling helpers through the
  renderer and break as R moves them; the probes that edit `ribbon_renderer.ts` are K425.



- **K271** · The turn telegraph is unchecked under K76's thread reveal:
  `syncMinotaur` hides the minotaur until `revealQuery` >= 0.98, but its
  line may still draw over hidden thread. For K76 2c (K257 (2)).
- **K266** · The hover rim's short-run limits (K248): runs under 2 x rimGap never glow, and a short
  run lit under a crossing's over thread shows nothing; `census_rim.mjs`'s open-chain terminal
  sample (k = 235) reads a probe triangle. `docs/design/K111.md` ("Stage 3 handoff").
- **K267** · Stale `highlightMode` mentions after K248 in `docs/design/` (K76, K76_reveal_mode,
  K174, K193, K198, levi_notes_2026-10-13), and v4 `.J` probe links in rules files (gameplay-motion,
  probes-phone, render-pluck, probes.md (K80)), play links in K174, K180, K198, brief templates.
- **K263** · `minotaur.ts` exports `undoAllowed`, but nothing in `src` calls it, no move undo
  exists, and `docs/design/K80_turns.md` step 2 cites it as real time's behavior. Delete it, or wire
  it when an undo lands.
- **K262** · K132 (41e81b5) broke two harnesses: K80's `.claude/probes/K80/lib.ts` (removed
  `codecDefaults(3)`; see `.claude/probes/K174/rt/rt_lib.ts`) and K100's `vite.fogdaily.config.ts`
  (removed `DAILY_V1`). K114 fixes its copy (`docs/design/K114_burn.md`).
- **K258** · K76 s2a's residuals: (a) in flight, KPAINT items are redeclared per frame and the
  per-slot refs shift (check `lastPaintUpload` in 2d); (b) so is growth, 0.45 s after each arrival;
  (c) the model is probe-only until 2c. `docs/design/K76.md` ("Stage 2a handoff", "Residuals").
- **K276** · K76 s2b's residuals (a)-(e): a visited END at growth 0 shows nothing at its tip; the
  census may miss a long shallow gap's far end; the mode-off-again failure is unexplained; mode-on
  costs are up slightly. `docs/design/K76.md` ("Stage 2b handoff", "Residuals").
- **K278** · K74 s2's residuals: (a) done in 9ccf360 (H1 exit guard); (b) generation ~30% slower; (d)
  heart and ring designs cut no bridges; (e) H1 can shorten the optimal route; (f) 494f2fe says
  codec 108, it is 117; (c) done 86d404e..02194b4. `docs/design/K74.md` ("Stage 2 handoff").
- **K285** · Citation details K277 left out until a record confirms them: Jakobsen's venue, Müller
  et al.'s volume and pages, Jaffe and Smith's pages, the Elias DOI, the editor of Perlin's course
  notes. `docs/design/K274_K277.md` ("Stage 1 handoff").
- **K281** · The burn race's s1 residuals (K114): (a) `drawFire` costs ~2.5 ms a frame; (b) it
  ignores K76's reveal; (c) char stroke draws over crossing gaps ((a)-(c) wait for s3's shader
  look); (d)-(h) small (c014a83: codec is 118-120). `docs/design/K114_burn.md` ("Stage 1 handoff").
- **K254** · K193 s1's phone-pass residuals (`docs/design/K193.md`, "Stage 1 handoff"): (a) desktop
  `-Dry -Looks scripts/phone_pass/looks.example.json` unrun, check `looks_report.json`; (b) docked
  landscape unverified (`-Viewport portrait`); (c) is K234.
- **K252** · K198 s2's residuals: (a) `RANGE_EASE` is a per-frame ease (0.15), so resize and fit
  drift settle faster at higher fps; (b) the head's 0.45 s show delay rests on five blips (longest
  0.33 s): K156's next phone pass can check more. `docs/design/K198.md` ("Stage 2 handoff").
- **K246** · K174's residuals (`docs/design/K174.md`, "Stage 1 handoff"): pace links unclamped (old
  `mhp=25` = 25x pace); K80 rt probes (`.claude/probes/K80/rt/`) lack K132's `rt_lib.ts` fix;
  `rt_chase.mjs` uses OS temp (fixed in `.claude/probes/K174/rt/`); panel labels clip `mino*` keys.
- **K242** · K191's residuals (`docs/design/K154_K169.md`, "Stage 2 handoff"): the fan program's GPU
  cost during fades and stage 1's phone hash cost are unmeasured; the tap-time fade-out and a full
  web restored on load are unit-tested only; the knot and fog A/B against stage 1 was not rerun.
- **K236** · K145's hover glow, now K248's rim: a pluck's overlay hides it (`pluckColor` has no
  across coordinate; fix: an across varying in the overlay strip and mirror compose). Other gaps
  settled in 3321592. `docs/design/K111.md` ("Stage 3 handoff"), `docs/design/K93_K145.md`.
- **K234** · `scripts/phone_pass.ps1`'s `-Phase check` and `-WaitReady` treat a phone in use as
  ready (round 2026-10-14b saw Gmail in front); wait for 120 s without user activity (`dumpsys
  power` activity ages). `docs/design/K156.md` ("Round 2026-10-14b handoff").
- **K232** · Round 2026-10-14b (K156): the default link's load (`?b.J`, 54a2b43 vs 48da84d) is
  borderline worse: p95 33.4 -> 50.0 ms, first sleep 18.4 -> 19.6 s (2 reps). Rerun with 3 reps once
  the floor matches (K193, K195, K197). `.claude/probes/rounds/2026-10-14-48da84d/pass/summary.md`
- **K230** · K92 did not check the badge's last fit level (bare icon) with the panel open; its phone
  checks were desktop emulation, so K156's next phone pass covers K92 (`gameplay-badge.md`). No
  phone look reaches the badge's fit levels at 411 px: use an emulated narrower viewport.
- **K228** · A choice's hover stays lit after the mouse leaves the canvas
  (`src/main.ts`; seen by K145's agent, whose glow clears there).
- **K226** · K98's spider glyph and role have no mesh (`MeshRole` excludes
  it in `src/render/marker_glyphs.ts`) until K114's call 7 decides what
  the spider marks.
- **K223** · Tooling after K198: K149's `.claude/probes/K148_K149/probe.mjs slack` checks the old
  0.3-screen rule and fails by design (`.claude/probes/K198/pan.mjs` replaces it); K173's
  `scripts/split_rules.json` still anchors on the old FIT CAMERA PAN SLACK entry.
- **K222** · K198's maze edge leaves out the win ring (~5 px past the disc), the head's glow and the
  minotaur, and the range ignores the panel's height (`docs/design/K198.md`, The calls).
- **K221** · K198's range reads the maze's right edge, which creeps while the knot settles (~0.3 fit
  px per 200 ms): at the left limit the gap to the open panel shrinks 0.2-1.2 px
  (`docs/design/K198.md`).
- **K220** · Tooling: K75's `census_fan.mjs` misreads routed joints since K81 (`fieldProbe.at`
  without `px` and `strip`: 0.21 where the fans agree to 0.006). Use K169's `census_k81.mjs` or
  K93's `census_k81h.mjs` (`.claude/probes/K93/`); fix or retire it.
- **K218** · In trail mode, a junction cap inside the fade holds a flat p
  over its 0.31 radius, then steps at its edge (pre-existing, mostly
  under the web; `docs/design/K93_K145.md`, Stage 1 handoff).
- **K217** · K93's trail split is placed linearly in ctrl but the trail measures lattice length and
  the paint is linear in arc, so the fade start sits slightly off; a fading part under a pixel
  blends at the split (`docs/design/K93_K145.md`, Stage 1 handoff). Pre-existing.
- **K216** · The rules split's hand-kept parts: `docs/lore_index.md` and
  each area file's topic list are maintained by hand, and 26 design docs
  still name the area files, one hop from the topic (`docs/design/K173.md`).
- **K214** · `particle_system.ts` and `forces.ts` still attach 30.8 KB of
  lore after the split: all the physics lore is about them, so only
  trimming the text would cut it (`docs/design/K173.md`).
- **K213** · Before K90's bend bound ships: the min regression (hard clamp worsens 24 of 585 scans,
  soft 4; `k90_minrows.mjs`), `controlArcLengths`, tests and a CPU mirror, hit tests on moved
  samples, the phone's rebuild cost (`docs/design/K90.md`, Stage 1b handoff).
- **K212** · PixiJS warns "Attribute aGap/aGapId/aUV is not present in the shader" on every
  load (K132's probes; Levi's console 2026-10-14, K311). Find which mesh binds attributes its
  program does not declare (`docs/design/K299_choice_pulse_bug.md`).
- **K208** · `restoreYarn` keeps its own copy of the travel-direction
  rule; it could share `travelOrder` / `moveEnds` (`src/render/fog_arc.ts`,
  K100).
- **K207** · Fog stamps grow without bound within a solve: the spacing filter checks only the last
  stamp, and `renderFog` redraws every stamp. A spatial dedupe fixes both
  (`src/render/fabric_maze_renderer.ts`; `docs/design/K100.md`, Stage 1 handoff).
- **K206** · A restored attempt stamps its fog right after the intro, while the threads re-settle,
  so with physics it differs from the live fog (IoU ~0.96). Option: stamp after the first sleep
  (`docs/design/K100.md`, Stage 1 handoff).
- **K205** · K120's leftovers (`docs/design/K120.md`): the follow camera doesn't keep the dot clear
  of the move pad (K148, K149); small maze at the phone's fit zoom; a 411 px toast can overlap the
  pad; an arrow after clicking the panel's empty area still moves; a hold could loop runs.
- **K202** · A bare-URL daily left open past midnight with no move becomes practice when begun the
  next day (K146). An unstarted daily the bare URL opened could roll over to the new day instead
  (`docs/design/K146_K151.md`, "Open").
- **K201** · History's "Played" chip counts any record, practice included, so it can exceed the
  played tile (24 against 21 in K146's probe); a practice row's count shows only in its tooltip,
  which phones lack (`src/ui/daily_stats_view.ts`).
- **K197** · The phone's load settles later over ab6d330..54a2b43 (K156, 2026-10-14): first sleep
  8.0 -> 19.3 s, p95 33 -> 50 ms; likely K147's settle budget (b0a1c49..97293e7): attribute with the
  frames phase `-Base b0a1c49~1 -Head 97293e7`. Is 19 s acceptable? Levi's call.
- **K190** · Unmeasured costs from K154+K169 (aaa3dda): the new hash adds 37-60% to the drifting
  backgrounds on the desktop; the phone and the fan program in a web fade are unmeasured. Measure at
  K79's K52 phone gate, vellum-drift first (`docs/design/K154_K169.md`, "Stage 1 handoff").
- **K195** · Phone pass gaps (K156 3c, `docs/design/K156.md`, "Stage 3c handoff"): noise floor is
  one 3-rep A/A pass for `-Moves 0,7,13` (rerun if orientation, phone or load changes); knot-mode
  render swings 7.5-20.5 ms in A/A; K80's indicator look never tapped. Fixed: K193, K253 (459cc11).
- **K196** · K180's crossings options at phone scale: `ride` and `pinch` leave most taps unreadable
  in the census (dense `ride` 93.8%, fabric `pinch` 71.1%); `through` reads best
  (`docs/design/K180.md`, "Stage 1 handoff"; `.claude/probes/K180/`).
- **K123** · `.claude/probes/K10/phone_bench.mjs` drives the first visible `http://localhost:` tab
  on any port, so it can navigate one of Levi's own tabs. Use `.claude/probes/K79/phone/bench.mjs`
  (ports 5371-5374 only), or filter by port.
- **K124** · Marker gaps keep their CPU reveal gate, so they still pop
  during the reveal (pre-existing; G2 agent a7d1f998's report,
  2026-10-12 18:43; from the LEDGERS inbox).
- **K125** · Scarborough Fair's loop is 50 beats (`src/audio/songs.ts`; K116 found it), not whole
  3/4 bars, so a part that keeps bars would slip each loop. Grow its closing rest from 2 beats to 3
  before any band part (K116's call 6).
- **K128** · `src/render/marker_mesh.ts:32` declares `in vec2 aUV;` but never reads it while the
  marker geometry carries it, so PixiJS warns "Attribute aUV is not present" per marker mesh on
  every load (K83; found by K81 stage 3a). Read it in the shader or drop it from the geometry.
- **K130** · Rows with a slider step (`backgroundIntensity`, `pulseReach`, `settleBudget`,
  `loadSettle`) snap to Tweakpane's step grid from the row's first value: after an off-grid link,
  "Reset to defaults" writes a wrong default (intensity 0.48). `src/ui/tweakpane_panel.ts`; K79 B1.
- **K131** · Phone probe kit (`.claude/probes/K79/phone/`, untracked): `drift.mjs` and `frames.mjs`
  take slow full-size PNG shots (10-25 s; use JPEG or clipped); `bench.mjs`'s `thermal()` reads the
  stale temperatures block (`.claude/probes/K81/phone/lib.mjs` reads the live one).
- **K11** · Ring + gridAlign: buckles lopsided below strength ~1.8e-3,
  wanders without sleeping at 5e-4..1.6e-3, never sleeps at ga=1.
- **K12** · Shaped-lattice sleep failures: star with e-w anchors sleeps on 6/8 seeds; K46's scans at
  gs 20-24: star 4/60 never sleep, tree 4/60, fish 2/60; heart, ring, rect clean. The circle at gs
  18 with n/s anchors: 3 of 7 seeds never sleep. Repro: `?4.c&shp=circle&sa=n&xa=s&am=instant`.
- **K62** · The `branchDensity` and `fourWayFraction` rows do nothing at the default
  `junctionSpacing` 2 (K46 finding; K74: 0.2-0.6 and 0.4-0.7 build the identical maze). They look
  broken: rescale, relabel or hide them; `junctionSpacing` is the real density knob.
- **K13** · Post-violent-play loud attractor at fat params (the open P3
  problem; fingerprint in `.claude/rules/physics-collision.md`).
- **K14** · Latent seam-window wraps on open chains
  (applyTransversality's window, the slide/project windows,
  updatePassCover's +-12 slots): agent-measured, unfixed.
- **K15** · During a reveal, a joint's fan can turn opaque while a fill beside it is still striped
  (K4 fixes it by construction). May be moot: G1 (99443cb) deleted the over-fills. Re-check fan vs
  base ribbon during a reveal.
- **K16** · Settle is slow: 100-190 ms/frame at gs 18, 7 sim-s in 14 s on the phone (sleeps at ~5
  sim-s since K63). K279's wake check (`.claude/probes/K279/wake/`): every wake (drag, tap, bare)
  spirals to the 100 ms cap. K162 (4): do drags get K147's budget? K7's worker is the full fix.
- **K65** · Low-gridAlign knots (`ga=0`) creep under the quiet threshold (a fresh settle ~1.5 world
  over ~50 s, a cinch up to 0.9 world/s) and every sleep gate freezes them mid-creep. A
  net-displacement test would catch it but keep them awake for tens of seconds. Related: K11 (K63).
- **K29** · Boxed kinks at tw 0.64: 3 of ~152 kinks (8 seeds) rest at 0.56-0.78 thread widths of eye
  hole, boxed by a fused joint and the 1.6 corridor floor; eye pressure 2.6, 2.8 doesn't lift them;
  smaller since K41. K49 is the size decision. `.claude/rules/physics-kinks.md` ("KINK EYES").
- **K30** · Very wide threads (tw >= 0.72) never sleep, standing riders; after K41, 7/8 seeds sleep
  at tw .72 (was 4/8). Seed 1q2w3e's kink X360 cycles material through its crossing at mv ~0.09;
  turning eye pressure off doesn't stop it. The slider reaches 0.8.
- **K50** · The riders gate measures overlap before the fusion snap, so
  a resting overlap of up to about 0.04 at joints can go unflagged;
  measure the end-of-substep state instead (K41 agent idea).
- **K59** · Two visible windows with interleaved moves on one daily end with the last writer's
  attempt winning: a tab adopts a newer saved attempt only when it comes into view. Adopting on the
  `storage` event fixes it but rebuilds the other window (intro included) on every move.
- **K54** · Background contrast varies with the palette: ember roughly
  halves mist's (luma spread 11.4 -> 6.1). Normalizing the accents'
  brightness would even it out.
- **K51** · Knot-mode braids: where one pass sits between two twist
  twins, the two ratchets still clamp one after the other. K41's
  ratchet-intersection rule could apply there; no failure seen yet.
- **K26** · Plucks at tight loops, zoomed in: only the concave side of the swing is capped, so a
  loop's eye gets a slightly ragged, enlarged rim during the ring. A symmetric cap fixed the eye but
  lumped every hook's outer blur at normal zoom, so it was rejected.
- **K27** · Plucks near junctions. Lobes inside a junction's fillet-web footprint (~1 world at cr 3)
  keep their base intact, so they ring as a crisp thread with a halo rather than a blur, as crossing
  footprints already do.
- **K42** · Silhouette-level cyclic overlaps: three ribbons over one pixel, each over the next (user
  links x170/x93 after repeated cinches, x134/x135). G1's per-pixel protect can't break a cycle; it
  needs a per-pixel winner.
- **K43** · A fused tail riding its host (user link tips 0/1) is still
  sensitive to draw order. Predates G1.
- **K44** · Probe tooling quirks: the gap census drifts between captures of one frozen state; a hold
  probe must move past the 4 CSS px tug threshold (df373b5; `.claude/probes/K41/` moves 12 px); A/B
  at `fw=0`; pair `phy=0` builds on one side of K63; 4x throttle is for ratios.
- **K69** · String mode (`pv=string`) on pre-G2.3 builds drew a 1-px diagonal sliver from the start
  to the exit marker (`?b.c&pv=string`, 6 moves); G2.3 doesn't show it, never attributed (G2 doc
  section 7, Follow-ups). Since K83 (45aac50) that Graphics draws only the win ring.
- **K95** · Below about 340 px wide, the mode badge drops below the
  hamburger and covers the header of an open panel (K73; the fit levels
  are measured in `.claude/rules/gameplay-badge.md`, MODE BADGE).
- **K103** · Below 10 fps the fit camera, moves, paint clock and pluck overlay still slow down
  (fixed fit ease; `tickAnim`, paint and `tickPlucks` read Pixi's capped `deltaMS`). K96 (d8b9175)
  moved only the follow camera. Since K101 (e9e01ae) a note's string trails its sound.
- **K106** · A dark spike inside a hook's tight bend while it rings (the
  ribbon's inner corner). Present with the base collapse off, so not
  K77's: `.claude/probes/K77/out/s2r/s2r_hookspike.png`.
- **K107** · A dark "X" at the center of big knot-mode attack-lobe blurs,
  also present with the collapse off:
  `.claude/probes/K77/out/abknot/sheet_zoomL.png`.
- **K112** · Motion setting residuals (K79, 9ffda8a): no cross-tab sync (another tab picks a change
  up on reload; `src/ui/motion.ts`), and the camera's reduced-motion jump on an edge-indicator tap
  was code-reviewed, not probed.
- **K133** · Crossed join bridges: plans built before K110 can hold two crossing join bridges (108
  plans, 20 dailies); K110's joins skip such a splice, older code doesn't. Fixing moves those plans;
  first see whether a crossing reads wrong (`.claude/probes/K110/verify_run3.txt`).
- **K136** · A gs 6 tree maze with dead ends never sleeps (140 s of sim) on 7e41a02 and ade3537
  alike, so not K110's doing; maybe the K13 attractor. Repro `?12l&gs=6&shp=tree` (K74's agent saw
  it at the new defaults too); `.claude/probes/K110/sheet/results_run1_tree_awake.json`.
- **K142** · The A/B harness's first case in a fresh browser can read nonzero (1 of 11 runs: K79
  B2b's `none_desk`, specks on thread edges); cause not found (a cold server or GPU cache?). Rerun
  before trusting it; a warm-up case is untested (`docs/design/K79.md`, "The 18/19 run").
- **K143** · Vellum's fibers read as long crossing hatching near scale
  2, the slider's max (K129; merged in 58b77cf). A look for K156's phone
  pass (sheets in `.claude/probes/K79/out/view/`).
- **K150** · Probes clash across agents (fix: claude-config `rules/lessons.md`): one Chrome profile
  (`scripts/diag_screenshot.mjs`), TEMP builds unless `-Root` (`scripts/preview.ps1 -Ref`, K156 s1,
  1f8be97), tmpdir profiles (`scripts/bench_frame.mjs`, `probe_gpudraw.mjs`).
- **K157** · K79 B's color rows on the phone (B3): accent 3's picker opens 8 px below the viewport
  until the panel scrolls, and a second tap on a swatch doesn't close Tweakpane's popup (check the
  older color rows too). `docs/design/K79.md` ("Stage B3 results").
- **K158** · Switching a design to custom colors isn't
  byte-identical: up to 2/255 on 5.3% of a strip (suspected: hex rounding
  of the design's colors). (`docs/design/K79.md`, "Stage B3 results")
- **K159** · K79's probe residuals: the `__knotSetBackgroundParams`
  hook doesn't sanitize its input; B2's sheet script has a first-frame
  wobble; B3's mist A/B got 1 rep of 3. (`.claude/probes/K79/`)
- **K163** · A first-frame hitch after load: two long tasks of about
  1.6 s, likely shader compilation; compile behind the loader instead.
  Found by K147 (`docs/design/K147.md`).
- **K164** · At 4x CPU throttle, rendering alone costs about 76 ms a
  frame, so the intro stays slow there whatever physics does. Found by
  K147 (`docs/design/K147.md`).
- **K165** · Two pre-existing loader bugs: `loadingTick` overwrites the
  HALTED stamp with " | loading", and the physics-off loader's
  `loadWall0` counts hidden-tab time. Found by K147.
- **K166** · K81's render residuals (`docs/design/K81.md`, "Residuals to report"): the pluck overlay
  draws over the gold band; band edge cases (cover cap past a non-route arm, varying-width ribbons,
  non-adjacent routes, skipped wedges); setPaint runs a frame ahead of tickPaint at a tap.
- **K167** · K81's fan costs a +0.055 ms floor (+0.34 ms, about 9%, at
  15-20 moves); the early-out and the strip trim were deferred
  (`docs/design/K81.md`).
- **K168** · K81's untested ranges: more than 20 routed records, zoomed in, and a full web on the
  phone (the gate walks the cheapest route, so a full web was certified on the desktop only). K156's
  looks can cover some.
- **K170** · `scripts/phone.ps1` sends KEYCODE_WAKEUP, against the phone rule (no key events; the
  phone stays awake on its charger). Proposed: no wake by default and a `-Wake` switch to opt in
  (K156 3a proposed a `-NoWake` switch instead; `retry_quiet.ps1` already drops its copy).
- **K172** · K156's screenshot sheets have no text labels, and its drift
  looks show drift only inside the intro window (3c checked the speed-8
  looks on the phone: they show motion).
- **K175** · K80's UI gaps (5fed5c1): a queued tap has no visual; the
  choice pulses go quiet during a move; the bull glyph is a placeholder
  (K98); its off-screen indicator ignores `finishIndicator` (K84).
- **K176** · K80's entrance-tail trap: after losing a player on the
  entrance tail, the minotaur pauses at that tail's junction and catches
  them about 3 s later (`.claude/probes/K80/rt/results.md`).
- **K177** · K80's last unrun check: the minotaur's indicator on the phone itself (K174 checked it
  on the desktop in 411x753 emulation); the next phone pass shows it. Chases are not saved or
  replayable (`replayChase` exists; the dailies stay turn-based).
- **K178** · Since K122 the private-cache vite wrappers of K19-K20, K79, K99 and K104 fail with
  ERR_MODULE_NOT_FOUND; K80's (`.claude/probes/K80/rt/vite.private-cache.config.ts`, which loads the
  config with `loadConfigFromFile`) works (`.claude/rules/probes.md`).
- **K181** · K104's residuals: the phone's "can't tell" share stays high in fabric and dense (26%,
  41%); sound-only and hide-zone taps show only through a cue; G1's soft edge shows the under ribbon
  at 80-90 degrees. `docs/design/K104.md` ("Stage 1b handoff", "Stage 1c handoff").
- **K188** · K140's residuals (`docs/design/K140.md`, "Stage 1 handoff"): `restartSolve()` leaves
  pieces in the air; the open desktop panel covers the spray when the exit is at the lower right;
  the rain takes 5.5-6.2 s to fall out, longer below 10 fps.
- **K189** · Fabric mode's `sceneAnimating()` is always true, so K24's
  ticker stop never fires in fabric: about 10 ms of JS a frame at 1x CPU,
  64 ms at 4x (K140's measurement, `docs/design/K140.md`).
- **K287** · K268 s1 residuals (a)-(g): full proof sweep unrun; MAX case and an over thread's tip
  lack GPU checks; no mode-off A/B after the K114 rebase; phone slot proof needs `__knotExplore`
  (K156 10-14c census passed). `docs/design/K268.md` ("Not done in stage 1", Calls).
- **K289** · K279 stage 1's last residual: (g) no webm clips of the plucks.
  Stage 2 closed a, c (a cull, not a bounded filterArea), d, i, j and k; (e)
  is K368. `docs/design/K279.md` ("Stage 2 handoff").
- **K291** · CI: ad2618a's deploy warned that checkout@v4, setup-node@v4 and wrangler-action@v3
  target Node 20, and `ubuntu-latest` becomes Ubuntu 26 on 2026-10-19. Bump them to Node 24
  releases; if the next deploy fails, pin `ubuntu-24.04`. `.github/workflows/deploy.yml`.
- **K295** · `.claude/probes/K155/probe_stars.mjs` is stale: it expects 4 rules lines in the stars
  popover (stat lines follow since K274) and today among the History rows (own row since K146). Only
  `.claude/probes/K80/turns2/banner/probe_stars.mjs` is fixed.
- **K300** · `scripts/phone_pass.ps1`'s `-Moves` default 0,7,13 now hits the finish (K74 s2: `?b.J`
  solves on move 12), so fabric@13 times the stars and confetti. Change it to 0,7,11 with the next
  A/A (K253's floor). `docs/design/K156.md` ("Round 2026-10-14c handoff", Step 7).
- **K301** · The phone pass tab flips from 411x753 to 412x755 CSS px after its first tap or move
  (K193's CDP emulation), shearing same-state baselines and crops (K279's run 1 was invalid). Cause
  unknown; re-pin after a tap. `docs/design/K156.md` ("Round 2026-10-14c handoff", call 6).
- **K303** · 48 probe files freeze the sim with the `__knotPS().step`
  patch, which a worker will not honor; K7's stage 4 ports the
  load-bearing ones (`docs/design/K7_worker.md`, "Design handoff").
- **K304** · `.claude/probes/K73/probe_follow.mjs` calls
  `__knotExitPointer`, which no build defines (found by K7's design).
- **K305** · In the daily's intro, k7_frames' frame-callback p50 (24.7 ms) exceeds its rAF-interval
  p50 (18 ms), unexplained; K7's summaries report fps, interval p95 and render alone
  (`docs/design/K7_worker.md`, "What was measured").
- **K308** · `mod(floor(v + 0.5), 5.0)` in the background contours is a float quotient like K299's,
  allowlisted in `ROUNDED_QUOTIENTS` (`test/render/paint_ring_lap.test.ts`); fix it when the
  sha256-pinned programs are next re-pinned. `docs/design/K299_choice_pulse_bug.md` ("Residuals").
- **K315** · `__knotPhys` calls `sys.readSlideStats()`, which resets the counters it reads; under
  K7's mirror it needs the diagnostic bridge or a worker-side count (decide in K7 s2 or s4).
  `docs/design/K7_worker.md` ("Stage 1 handoff", "For stage 2").
- **K319** · ANGLE's Vulkan backend lacks `KHR_parallel_shader_compile` (K307 s1) and phones may
  too: K307's warm-up then links blocking and stalls for the longest compile (section-rgb, ~2.8 s
  cold on D3D11). The phone's answer rides K156's next pass.
- **K330** · A touch press on a choice lights no hover glow until the
  finger moves: the `pendingTap` path in `src/main.ts` sets no glow run
  (K298's stage 1). Built with K331 (touch picks), after K329.
- **K342** · The snore link (K325) is verified on desktop Chrome only. Unchecked: Android Chrome
  (the touch delay's feel, a tab switch cutting the sound; rides K156's next phone pass),
  Safari/iOS, other desktop browsers. `gameplay-audio.md`, THE SNORING CAT LINK.
- **K343** · K325's snore is silent before the first activation (no AudioContext: a first hover is
  silent, and the gesture that opens the audio gate plays nothing, the MP3 undecoded). Fix: decode
  on an OfflineAudioContext before the gate. `gameplay-audio.md`, THE SNORING CAT LINK.
- **K348** · Key-move edges left by K329/K333/K334: the X assignment switches only past KEY_TIE, a
  hold shorter than HOLD_DELAY pauses at the first junction, a wait tap mid-move isn't queued, and
  four smaller ones. Lore: TIE CYCLES, CHORDS AND THE MOVE WAIT in `gameplay-moves.md`.
- **K349** · K120's key probe (`.claude/probes/K120/keys.mjs`, old copy `keys.pre-k329.mjs`) lags
  K329: "a held key keeps adding inputs" fails on master too; poll the queued-run check in the page.
  A first-press miss was not reproduced (`.claude/probes/K329/k120/out/keys-run2.log`).
- **K351** · The "Read by" column of K339's inventory
  (`scripts/panel_inventory.ts`, `docs/design/K339_inventory.md`) misses
  params read through the `*Of` helpers.
- **K354** · A dark three-armed star in a kink loop's eye under the pluck blur, the uncovered middle
  (a thin Y with the concave-side cap off); K77's "dark X" family? `docs/design/K344_pluck_cusp.md`
  (stage 1 handoff). K395 (2026-10-15): the X became a rounded square, still there.
- **K355** · Zoomed in, the wide outer pluck blur shows staircase bands (inferred: affine
  interpolation over wide quads), before and after K344 and untouched by K395 (2026-10-15).
  `docs/design/K344_pluck_cusp.md`.
- **K356** · At another chain's crossing, the pluck clip's straight line
  misses a curving over thread: zoomed in, a blur sliver shows over it
  (`.claude/probes/K344/out/nc/`). Fix: an arc clip, or over passes on top.
- **K358** · The physics worker's modules reach the notices collector
  before main's `generateBundle` (inferred in K7 stage 3, nothing depends
  on it yet): add a check when a worker-only package arrives.
- **K363** · K76 2c's residuals (`K76.md` "Stage 2c handoff"): a K47 restore
  shows a caught partial's run whole and ignores refogs; the minotaur's
  telegraph can draw over hidden thread; the fit box is cached per declaration.
- **K364** · Master's fog intro (`fow=1&fwi=1`) zooms out to s 11.7 before
  it closes in (seen in K76 2c's probes; not investigated).
- **K367** · Ripple burst oddities (K279 s2): the wave phase reads +0.4-0.5 ms
  outside the ripple's draws (one unpinned run per build; rerun interleaved),
  and every ripple phase has a 9.5-10.7 ms worst frame (4.2-5.1 without).
- **K372** · Fabric `?b` doesn't sleep again within 30 s after a drag, on any
  host, master included (K7 s4). Rec: a short sonnet probe of whether and when
  it sleeps.
- **K374** · 31 freeze-patch probes and 6 timing wrappers still patch `ps.step` and run
  only with `&phw=0` (`.claude/probes/K7/stage4/ports/FREEZE_PATCH_FILES.md`), and K8's
  `g3_probe.mjs` (496, 553) and `g3_probe_batch4.mjs` (470) throw on a default build. Port each when next needed.
- **K375** · The reveal's sheet probe (`k76_probe.mjs`): pin the halo breath as
  `census.mjs` now does, and find the 192 px by which a mode-off frame differs
  from the frame before it, master too (K268 s2). Rec: a small sonnet probe.
- **K378** · Main's long task about 0.36 s into the load grew 30-40 ms between
  `f4c1d5f` and `de22867` (K7 s5, observed; the merge is unknown, K279 s2's ripple
  warm-up a guess); on the desktop main hears the worker's `ready` only at ~600 ms. Rec: bisect (K373 nearby).
- **K379** · No phone cold start on levi.dev yet: K7 s5 skipped it, since `phone_lib`
  clears the origin's storage and would wipe Levi's daily records. Rec: a mode
  that keeps storage, then one cold load of the live site.
- **K380** · G3-0's small residuals (`docs/design/K8_stage1.md`, stage 2 handoff):
  dense update() +0.2-0.3 ms, at its +0.3 limit; the desktop bench's branch means
  +0.04-0.16 ms, unattributed; uploads 0.23/0.44 MB against 0.19/0.35 estimated. Rec: only if G3-1's budget needs it.
- **K382** · A fire race's frames are measured (K290 3b: frame interval unchanged; drawFire 0.18-0.21 ms
  desktop, 0.85-0.89 at 4x throttle, master 0.06 and 0.26). Still untimed: the first burn on a cold cache
  and the grown section explore variant's cold link (`trace_intro.mjs`). Realtime's: K114 s2 item 6.
- **K384** · K290 3a's small residuals: picking uses pickThread for the rest of a race
  once anything burns, even under char; `pieceVis`'s ring unwrap is ill-defined past
  n - 2 fade (pre-existing; a guard and a test); 13 Pixi attribute warnings at load (master too).
- **K385** · K307 s2: links under KHR_parallel_shader_compile skip Chrome's disk cache, so warm-up links block. (b) late enable shipped in e83f203 (K307 s3); crbug (d) drafted at `.claude/probes/K307/stage3/crbug.md` for Levi to submit.


- **K386** · K307 s2's small residuals (gateOpenAt stamping fixed by the s3 poll path in e83f203; remainder open): 131/212 ms frames after visible (parallel build);
  Pixi's Graphics program unregistered (<45 ms cold); `report()` stamps the blocking read's
  start; the pre-settle relink (8-26 ms a program); stray cache entries from one run.
- **K387** · With the flow on, its half-rate `update()` at rest costs about 20 ms a call on
  the phone (9.8 ms a frame mean, reveal on or off; K76 2d's gate run 1). CLAUDE.md's perf
  lever (2), now measured on the phone; the full fix is shader displacement.
- **K388** · K76 2d's probe residuals: gate2's in-page `arriveS` races the tap (use CDP
  arrivals; rAF stamps can hide a late Android frame); census2d says PROOF FAILED when off; k290_ab
  compares stamps, not SHAs; k111.L's shaped-slot count varied; `restoreScene` may keep HC's x = 2.
- **K390** · Fog A/B recipe (`probes.md`'s K83 recipe, `k83_ab`) isn't deterministic: K5 M1's
  same-build controls differ by 4054-7979 px (start marker flips states). `&phw=0` cuts it to ~700
  px (K5 R1 `checks2/pairs_fog3.txt`): pass it in the recipe. `.claude/probes/K5/stage1/fogbisect/`
- **K391** · K5 M1's probe residuals: `k83_ab` has no knot-mode path (exits 1 at :149); diag's 12 s
  capture vs the worker's first sleep (about 9.9 s; recheck); `probe_daily` `front` fails 10/14
  (expects `#maze-hud .km-title`; its `?daily=1.aBMge` and `?1471kin.c` predate K132).
- **K392** · K5 M1's code residuals: `host_seam.test.ts` matches names and misses nested
  binding patterns and element access; 25 lines of `src/app/probe_hooks.ts` pass 80 columns.
- **K393** · Nothing type-checks `test/`: tsconfig includes `src` only and vitest strips types,
  so a test's type error goes unseen (K5 M1). Fix: a tsconfig over `test/`, run by `npm test`.
- **K403** · Doc drift from the K74/K80/K114 briefs: `minotaur_turns.ts` 41-42 puts abbott in stage
  3 (`K80_turns.md`: stage 4); `gameplay-minotaur.md` cites "codec v5 108-116"; `main.ts` 3177-3179
  says tapsWait is off (on, 3283); `K74.md` 104 and 114-116 misname stage 3's sections.
- **K404** · Inferred, unchecked: the hover path ignores onHead, so a hover can light a choice
  a click would not take (found writing K80 turns 3's brief; its hover cue item is where to look).
- **K405** · After K395, a "M" at a kink loop's tip: the inner edge turns +31° to +56° (stations
  75-89, `?7` chain 9) as the 5-station circumradius follows the control spacing. Try a smooth
  radius envelope or wider min window. `.claude/rules/render-pluck.md` ("Pluck loop tip (K395)").
- **K407** · K344's probe link `?qoietk.KIiHgRRXwRlRt8fGrST4sf` builds another design since later
  default changes (its chain 21 no longer self-crosses), so probes and lore citing that loop no
  longer reproduce it; K395 used `?7&am=instant&snd=none&fw=0`, chain 9 (key 133). Re-pin them.
- **K420** · `.claude/probes/K19-K20/probe_daily.mjs front` fails 10 of 14 checks on every build: it reads
  `#maze-hud .km-title` (gone from src) and expects `?daily=1.aBMge` and `?1471kin.c` to stay tokens (seen in K5 M2 and M3).
- **K422** · Two K120 probe checks fail on master too (K80 3a): keys.mjs realtime "a held key keeps
  adding inputs" (the seed-7 maze may have changed) and pad.mjs desktop "the stored choice shows it"
  (the pad hides under the open panel since K224, 86dc0cf). `.claude/probes/K80/stage3/rerun/K120/`.
- **K424** · Thread reveal: some junctions stay hidden while one of their arms turns visible 0.5-1
  ctrl out, so their webs are missing beside thread about to show (junctions 87 and 160 on
  `?2gozcj.MgaM`, K397 stage 1). `docs/design/K397.md`, Stage 1 handoff.
- **K425** · Probes editing `ribbon_renderer.ts`: `K290/stage3b/dump_variants.ts` + copies (K76 2d,
  K290 3a), `variant_build.ps1` (`g2/`, `K4/`), `K154_K169/edit_rr2.ps1`, `edit_rr3.ps1`. Repoint to
  `src/render/ribbon/ribbon_shader.ts` (R1's copy `.claude/probes/K5/R1/dump_variants.ts`); R2's gap files too (notes).
- **K426** · `docs/lore_index.md`'s render-paint row lacks
  `test/render/paint_ring_lap.test.ts` (drift from before K5 R1).
- **K427** · `warmup.mjs`'s unregistered-program check works only on a dev build
  (checkLinks defaults to `import.meta.env.DEV`), so a prod A/B cannot catch an
  unregistered program (K5 R1 handoff, `checks/`).
- **K428** · Thread-reveal same-state A/Bs don't repeat: captures land 17-67551 px apart (k83_ab
  with K381's explore-clock pin, `k5ab&phy=0&am=instant&fw=0&snd=none&xp=threads`); a clock is
  unpinned, so take several per build (K5 R1 `checks/`, `checks2/pairs_threads3.txt`).
- **K431** · Probes' three-decimal `viewStill` isn't pixel-still under cam=follow (frames change for 0.6-1 s more; bit-exact stop ~10 s later, K268 3a). Narrowed in 377bc41: the bit-exact wait is ported to census3a's prepare (plus the probes.md lore line); other probes with three-decimal `viewStill` remain.


- **K432** · A pinned backdrop went black with no `webglcontextlost` in 2 of 3 unlocked k76 sheets
  (K268 3a, beside K290 3c's phone run). Rerun the sheet alone under the perf lock to attribute it;
  until then pixel-exact sheets take the lock (probes.md, K76 2b). Add a lore line.
- **K433** · Master's compositing isn't monotone in a gap's strength by one 8-bit level
  at some AA pixels (crossing 100; 84 px in census3a's KSWEEP=100 clip; K268 3a).
  census3a allows one level; which layer rounds is unattributed.
- **K435** · Lore (K290 3c): render-explore.md THE BURN says the band darkens the unburnt side under
  char only, but the code does it under both looks (check THE EMBER DRAWS); probes.md: a true FX-off
  frame needs a no-op tickFireFx, fireFx.clear() and two frames (stage3c `width_probe.mjs`).
- **K437** · Rules prose names main.ts for code K5 M3 moved to `src/app/frame_loop.ts`: gameplay-indicators.md 25,
  gameplay-audio.md 32, render-backgrounds.md 35, render-web-fade.md 39, render-explore.md 373, render-shaders.md
  134-136; nothing documents flow's half rate (`flowParity`). For the docs batch with K425, K426, K431, K432, K435.
- **K439** · The G3-0 probe hooks (g3DataState, g3TableRows, g3Expected, captureScene, restoreScene; ribbon_renderer.ts
  4924-5182 at 4afb8dc) stay on the renderer's facade through K5 R2; R5 gives them a part, e.g. `ribbon/scene_probe.ts`
  (`docs/design/K5_R2.md`, Questions 1).
- **K442** · `src/game/maze_stats.ts` STATS: the walked and fire lead lines are false under the
  real-time fire (K114 s2).
- **K443** · Two panel rows labelled `clock`: K80's in Maze (turn-based | real time) and the fire's
  in Burn race (turn | realtime). Match the wording or rename one (K114 s2).
- **K444** · K408's start-marker fade: the gap slot moves in one frame when the fade starts, and the
  exit marker still hides without a fade (K114 s2; `.claude/rules/render-markers.md`).
- **K445** · K114 s2's real-time burn sim (`.claude/probes/K114/stage2/burn_sim_rt.ts`) models
  neither pauses at forced vertices nor queued taps, and real players' junction think times are
  unmeasured; K440's proposal rests on it.
- **K446** · The real-time fire clock is not re-synced after a replay; unreachable today, since only
  dailies replay and they run with the fire off (K114 s2).
- **K447** · K114 s2's real-time fire has no hardware phone pass (shot in Chrome at 411x753 only);
  take it in the next phone window (K411), with K440's 1.7 s head start.
- **K450** · K279's tug (`ptg`, default 0) ignores the thread reveal (K397 stage 2;
  `docs/design/K397.md`, Stage 2 handoff, Residuals).
- **K451** · Plucks under the reveal (K397 stage 2's frets): a fretted lobe's node end doesn't
  follow drift (stored arcs); a re-pluck after the stub grows rings both keys ([a,b], [a,-1]); a
  fade tap's pluck point clamps to BETA_MIN/MAX (`docs/design/K397.md`, Stage 2 handoff).
- **K452** · The stub dots' cap is 0.5 tw per side, the thread's half-width only while hO = 0.5 tw:
  under a width multiplier it would meet the edge at a step (inferred, not seen; render-explore.md,
  THE DOTS).
- **K453** · K397's survey flags 1x2y3z f1 and f6 in stages 1 and 2: the dots end at about 0.85 of
  the fade. Inferred occlusion, not inspected (`.claude/probes/K397/stage2/out_s2/`).
- **K455** · At fw=0 the worker's exact sleep state is never drawn: gateFrame applies the snapshot
  after that frame's geometry pass (inferred; K6-1 measures it, K6-2's GEOM gating would draw it).
- **K456** · No webglcontextlost / webglcontextrestored handler anywhere in `src/` (K6-1's brief
  research); what a lost context does to the page is untested.
- **K457** · `probe_daily.mjs` (K19-K20) has stale front expectations (K6-1's brief research).
- **K458** · K6-3's stopped ticker must keep the wall-clock animations: the camera's follow delay
  and tween hold (camera.ts 153), tickFireFx (fabric 1443), the key hold and step timers (main
  3133-3339). K6-1's wall-clock audit lists them all (`docs/design/K6_1.md`).
- **K460** · Phone probe tooling: `phone6.ps1` holds the phone lock while it waits for perf and
  logs the tailnet address unmasked; `scripts/phone.ps1` wakes the phone, leaves a 9222 forward;
  `phone_run.ps1` hardcodes owner and hosts (live variant: K395's `phone_run_live.ps1`).
- **K462** · K323 Stage A's design (`docs/design/K323_game_mode.md`: the params table ~l.89, the
  undo list ~l.222) predates `fireClock`, `burnt` and K440's real-time pair (`fsr`, `fdr`): Stage A
  carries the pair and labels it (its proposed labels describe the turn pair).
- **K464** · K5 R2's leftovers (`docs/design/K5_R2.md`, Stage R2 handoff): the G3 and
  FILLET_REACH_PER_HALF facade getters (with R4 or G3's data plane), stale facade comments, the G3-0
  hooks' home (R5), GapSource solve() (R3 or G3-1).
- **K470** · No app-level WebGL context-loss handling: only `probe_hooks.ts` listens for
  `webglcontextlost`, to count losses. What a lost context does to the custom data textures on a
  phone is untested (K6-1).
- **K473** · Unverified: `fusedTips`' `hostOf` takes the group's first other member, so at a joint
  of 3+ threads the host can be a stub (K397 s3; `docs/design/K397.md`, Stage 3 handoff).
- **K474** · An 18 px notch at stub 79's joint (host 56), which K397 s3's fix removes, has no gap
  slot of its own; not attributed (`docs/design/K397.md`, Stage 3 handoff).
- **K475** · Unconfirmed: the third slash band at the left edge of Levi's 08:06 shot of 2026-10-15
  (`docs/design/K397.md`, Stage 3 handoff).
- **K476** · `census_fan.mjs` (via g2lib, `.claude/probes/K397/stage3/g2/`) never deletes its Chrome
  profile (K161).
- **K477** · K459's free cap, narrowed by the phone pass (2026-10-16, dcdfaf4): the free-cap look is seen on the phone (chain 48 fade pluck, lobe keyB -1, blur reaches the cap tip at t 0.06) and a reveal-off pluck draws unfretted on the phone. Still open: the base collapse under a free cap (this stub's swing never engages it; overlay-hidden diff 0 px), a strict reveal-off 0-px A/B against a pre-K459 build, the rounded tip's AA along the strip's end, and a cap a node pins staying still, as in K397
  (`docs/design/K459.md`, Handoff; phone evidence `.claude/probes/K397/stage6/out/`).

- **K484** · Sheet history entries (K467): a stale entry after a reload or discard with the sheet
  open, an extra one on a fast close-then-reopen, and a live switch pushing one without a gesture
  (docs/design/K467.md Handoff)
- **K487** · The shipped probes .claude/probes/K92/undo.mjs and K198/stage2/pan.mjs predate the
  phone sheet; sheet-aware copies are in .claude/probes/K467/
- **K490** · A console "Failed to load resource ... 404" on every load of K465's preview build (not
  a pageerror; cause not investigated): check master's build and name the URL.
  K466 saw it on a vite dev server too (`.claude/probes/K466/sheet/key.txt`), so it is not
  preview-only.
- **K491** · K465's exit marker over unseen thread is pixel-verified only at 2600x1600 `&gs=4` (the
  exit is never on screen unseen at 411x753); no phone walk brings it on screen
- **K494** · K466 B (`rve=past|back`): up to 4.67 ctrl of unexplored thread shows; three covered
  ends do not move, and 1x2y3z f0 stays flagged after a 3.27 ctrl move (undiagnosed); a moved fade
  changes its length and its dots' size; the keep-out cache can go stale after a tug or a settle;
  the pad may count the gap's fade twice (docs/design/K466.md Handoff).
- **K495** · The panel's end-glow row (`rvg`, K466) shows for every reveal-end look; hide it for the
  looks without a halo (gameplay-panel.md EXPLORATION ROWS).
- **K497** · Tap preference (K479) on touch: a touch press lights no glow, and touch hover/tap
  parity and a real touch tap are unverified; a mid-flight tap ahead of the dot is empty space, and
  `setGlowRun` may center the glow in that stretch (cosmetic). docs/design/K479.md Handoff.
- **K498** · Tap preference (K479) limits: HEAD_EXCLUDE caps the bias at the dot (28.7% of
  inside-both taps still backtrack); sample-based distances break the inside-one-ribbon rule on
  0.066% of taps; no mid-move census (gameplay-camera.md TAP PREFERENCE).


- **K503** · The G3-0 probe hooks (g3DataState, g3TableRows, g3Expected, captureScene, restoreScene) still sit on the RibbonRenderer facade; R5 left them there because they read reveal/paint state R3/R4 have not homed yet - give them a part (e.g. ribbon/scene_probe.ts) once R3/R4 land.
- **K504** · K425 - a variant_build.ps1 -Subst naming ribbon_renderer.ts for joinery code (rebuildFillets, cpuJunctionField, the FILLET constants) must now name src/render/ribbon/joinery.ts; normArc likewise lives in ribbon/sampling.ts.
- **K506** · Stage M4 handoff leftovers not folded into M5 (filed, not done): FrameLoopDeps still reads physState/settleWall0/warmHoldFrom through main.ts getters instead of taking life; ProbeCtx could take life/scene/audioMap whole; stale lore prose in physics-settle.md and render-shaders.md still names main.ts for lifecycle code; the A/B harness physon step should wait for asleep, not frozen.
- **K512** · The cross-build threads round trip's 0 px expectation only holds across builds whose threads defaults match: K466 (2aea912) added `rve`/`rvg` with new defaults, so c22de79-vs-post-K466 pairings differ by 43,385 px unless the query pins the legacy look (`&rve=under&rvg=soft`, 0 px both ways, K507). Future prescribed pairings spanning 2aea912 must pin both, or expect the frontier diff.
- **K508** · K5 R2's checks_r2.ps1/checks_threads.ps1 hardcode the deleted worktree agent-a695f82540244625a and cannot rerun as-is; K463's repo-relative k463_checks.ps1 supersedes them for these two checks.
- **K520** · K516's legacy timing harnesses not rerun in continuous mode: k7_latency (stage-5 batch setup), K174/K114 perf (rt_page first needs K461's fsr/fdr fix), k96_cam (desktop-Chrome launcher). Continuous-mode frame timings were measured instead (`.claude/probes/K516/results.md`); rerun the harnesses when next needed.
- **K511** · K334/K348 note (2026-10-15): K334's pointer queueing is superseded by Levi's correction in 3b1612f; K348's mid-move wait-tap leftover is now intentional for pointers.

- **K528** · census2d's long-sequence drift against the FIRST mode-off frame (K522): 11,343 exact px (1,077 hard) over the m10 census while visitAll vs the contemporaneous mode-off-again frame is exactly 0 px; candidates are the follow-camera tail and one-level backdrop flicker (K519) - localize only if it grows (`.claude/probes/K76/stage2d/out_k522_m10e/`, `docs/design/K397.md` Stage 6 handoff).
- **K535** · First-tap residual after K366's attribution (K307 stage 3): fabric tap 1 costs one ~39 ms callback frame (27 ms with glint) and ~50 ms of first pointerup handling on desktop, knot unaffected, ripple program not involved; inferred first-pluck allocation and the fabric paint's first re-declare, not traced to a function. Traced 2026-10-18 (`.claude/probes/K307/stage2/k535_results.md`): ~25 ms first-gesture AudioContext creation in `KnotSynth.ensure()` + ~14 ms first fabric paint re-declare (rebuildFillets/computeGapSlot). Fix candidates listed there; not yet fixed.
- **K539** · G3-1's phone half, unrun in K536's pass (phone locked, Chrome closed, 2026-10-16): dense / max-fabric / knot gs24 links on the Pixel with gl.getError 0, no lost context, gaps as on master, plus the phone frame bench at rest; rides K156's next phone window.
- **K540** · Cold first-visible is ~0.7-0.9 s later on 3465090 than on its parent e83f203 in two interleaved trace_intro pairs (3.36/3.45 s vs 4.10/4.22 s, fresh profiles, phw=0), while section-rgb(-explore) link-status times are equal (43.7-48.3 vs 46.0 ms; explore 61.4 vs 51.7 ms, one run) - unattributed (not the section compile); bisect the load path before calling it a regression. Evidence `.claude/probes/K8/G3-1/` (`k536*` trace runs) and `.claude/probes/K307/runs/k536*/`. Attributed 2026-10-18: real cold-only regression, +0.39 s mean over 8 interleaved pairs (median +0.51, 7/8 positive; K536's pairs overstated it — the parent's own spread is 1.2 s); the wave-1 gate waits on the cold FXC compile of G3-1's enlarged gap-search shaders (section-rgb fs +1,117 chars), warm restart and Vulkan show no gap. Full record `.claude/probes/K8/G3-1/k540_results.md`; fixing (trimming the GAP search's GLSL cost) is the K8 lane's call.
- **K537** · census3a's 9 pre-existing fails on master (probe sanity 21-23/29 vs 80% bar; solid crossings' mode-on cuts 0-14px vs 109-142 off; slot restore; three 434px attribution restores; visitAll/mode-off-again ~11.3k px lower-half bbox; PROOF vacuous since G3-1) - identical on baseline 3465090 (22/31 with the K430 ramp vs 20/31 without; ramp-specific judgements pass). Next census owner ports census2d's K522/K523 judgements wholesale or retires census3a for census2d; may share K432's backdrop mechanism.
- **K538** · Pluck footprints (overHalf/eraseExtent) still step binary at vis 0.5; only underWindows ramp (by design in the K430 stage). Evidence `.claude/probes/K268/stage3a/out/census_ramp6/`.
- **K547** · The far-branch blend has no isolating GPU census yet: census3a's shaped slots cut 0 px at reach 2.5 in its state (PROOF vacuous since G3-1, K537), so it is proved by the farBlendCut formula tests, shader-text pins and the 22/31 no-regression census, not a pixel diff at a tight over bend with one branch shown and the other hidden. Build that state (a shaped slot whose over polyline bends back within farK, one branch across a frontier) and judge hidden (no dip) vs shown (master's blended cut, weighted). Evidence .claude/probes/K268/stage3a/out/census_far1/. Census attempt 2026-10-18 (build 0f8e277, far_census.mjs, out/far_k547/, results_K547.md): state unbuildable in the walked state - bend-back pairs and 1-vs-0 cover splits exist (0.53-0.83 world), but medial fragments are never mid-fade inside the window (CPU joint count 0; GPU both-shown vs sminK=0 = 0 hard px on 10 candidates, incl. fl=0.3 and over-branch cinch attempts), and every bend candidate's reject control is 0 px (neighbour-covered cuts). No defect found; the blend remains formula/text-pin proved only. Missing: a strong slot whose over chain rides parallel at 0.66-0.75 (e.g. fat-thread adjacent-corridor state or a held tug).
- **K542** · PROTECT's biting-triangle GPU census is still owed: in walked fabric states at rest the waiver's range is empty (protect intervals overlap slot windows on 137/570 sides, but no on-screen fragment sits in the margin band over B - the triangles are not world-squeezed until a cinch/tug), so the protect stage proved the chain by the CPU census (706 sides, factors = vis(B) exactly, incl. 544 hidden / 22 shown) plus the shader-text unit tests, and a manufactured bite changed 0 px for the same reason. Build a squeezed state (a cinched cyclic triangle under the reveal, e.g. a physics tug on fabric) and judge hidden (on == waiver-off) vs shown (on == waiver-full) there. Evidence .claude/probes/K268/stage3a/out/protect_final/ + census_protect2/ (22/31, the ramp baseline). Census attempt 2026-10-18 (build 0f8e277, protect_bite.mjs, out/protect_k542/, results_K542.md): shown state marginally built - cinching B onto A at off* on slot 3 side 0 (sin ~ 1) yields 6 faithful bite points (first non-zero in this state family); judged on == waiver-full (5 hard px vs 2 A/A churn, correct direction) but on vs waiver-off also only 5 px, below the decisive bar. Hidden state unbuildable here (no on-screen over-shown + A-shown + perpendicular slot with B hidden). No defect found; decisive census still owed - needs a bigger bite (held tug, iterated cinch), a zoomed bite clip and differing A/B section colors.
- **K555** · K115 residuals its redesign must absorb or re-check: the joins λγ λη λθ λψ τυ meet a glyph stroke
  (`docs/design/K115_stage6.md` 971-975), 6a's five CAPITAL_OVERRIDES (800-809), the digit-6 conflict
  (`docs/design/K115_stage3.md` 376-381), and 1b's same-slash crossings that rely on overFirst alone.
- **K556** · K115 emblems: a shape under MIN_EMBLEM_DIA (6 LU) is refused silently
  (`docs/design/K115_stage5.md` 261, 620), and the triquetra shows gap slivers (594-596).
## Approved, to schedule (2026-10-11)

- **K22** · Dynamic resolution scaler (2x up to 3x when frame time
  allows; down when struggling). Part of K6, refined after G3.
- **K23** · GPU particles (G2.4), GPU fog-of-war accumulation, the yarn as
  a gap-masked ribbon (G3-5).
- **K322** · Art, sound and music by people (Levi, 2026-10-14 21:47): commission or license better
  icon art, sound effects and music before launch; credit each artist on the credits page (K321)
  with their terms (`notices/credits.ts`).

## Ideas (not scheduled)

- **K259** · With explore mode on, a chain with any visible piece draws its whole mesh, so hidden
  fragments still run the shader; drawing only the visible index range is cheaper. Not needed yet
  (`docs/design/K76.md`, "Stage 2a handoff").
- **K255** · Fold K193's `wait_then_aa.ps1` (`.claude/probes/K193/`) into `scripts/phone_pass.ps1`
  as `-WaitQuiet`: it tolerates touches until a full quiet window can no longer end before a
  deadline; `retry_quiet.ps1` gives up at the first touch that leaves less than one.
- **K256** · The phone warms ~6 C in a pass's first rep, so cells run at different temperatures
  (K193's A/A). A warm-up, or a temperature column in the summary, would separate heat from noise
  (`docs/design/K193.md`, "Stage 1 handoff").
- **K247** · K174's ideas: readable labels in the Minotaur folder (`mino*` keys clip, K246); a catch
  toast saying the fog came back; homing or the rejected "closest" roam pick, if over ~2/3 of games
  should meet the minotaur. `docs/design/K174.md` ("Stage 1 handoff").
- **K233** · The phone pass's full spec (26 looks, 3 reps) takes ~55-60 min. Trim it per round, or
  add a spec `deadline` so no look starts after it (`pass/state/watchdog.trip` already stops a pass;
  `docs/design/K156.md`, "Round 2026-10-14b handoff").
- **K231** · Keyboard shortcuts for K92's undo and redo (Ctrl+Z,
  Ctrl+Shift+Z / Ctrl+Y), proposed by K92's agent (`src/main.ts`,
  `src/ui/undo_buttons.ts`).
- **K227** · The head's glow stays a fixed 4.2 world units across; it
  could follow K98's `markerSize`, so a small player dot doesn't sit in
  a large glow (`render-markers.md`, K98).

Offers from 2026-10-10 that Levi hasn't answered yet (filed from the
audit inbox; the first-tap sound offer is done, 82b6b6b).

- **K32** · Bigger tap targets for maze choices on touch screens; choices
  are tight at full-maze zoom on a small phone.
- **K33** · A general "share this design" button that opens the phone's
  native share sheet with the link (the link holds the whole design);
  the daily's result share shipped with K20.
- **K34** · The settings panel as a bottom sheet in portrait on phones.
- **K35** · A short vibration on pluck (Android only; `navigator.vibrate`).
- **K36** · Add to home screen: a web app manifest and icons, blocked on icon art (which also fixes
  the `/favicon.ico` 404). K122 found unreferenced template leftovers (`public/favicon.svg`,
  `public/icons.svg`, `src/assets/hero.png`): delete them or wire up the favicon.
- **K37** · Fog-of-war edge wobble: stronger, or a slider (Stage 25b wobbles
  about 14 screen px).
- **K38** · Focus fade: softer, longer gap fades near the player's dot
  (depth-of-field feel), prototyped with a strength slider.
- **K39** · A manual battery/quality toggle for phones (fewer intro
  particles, lower resolution); may fold into K22's automatic scaler.
- **K60** · The panel's Daily button always opens today's daily. After
  leaving an older day, the way back is its stats-history row or
  `?daily=N`; the button could name the day you left.
- **K55** · An optional parallax background mode: it pans and zooms at a
  fraction of the camera, for depth. Today it is screen-fixed on
  purpose. (K21 agent idea.)
- **K66** · Why do bridges at joints, open tails and kink neighborhoods end the settle ramp near an
  unstable point (a snap to a new rest 3.5-5 s in forces K63's 2.5 s window; fixing it could make
  0.75 s safe, K64)? Harness `.claude/probes/K63/`.
- **K84** · After the churn, a pass over every param (Levi, 2026-10-13): viewer preference or design
  param, in its concept's folder, marked (K292); audit worth, names, tooltips; place
  `finishIndicator`, `tapToPan` (K73), Motion (K79), High contrast (K111). Meets K57, feeds K78.
- **K85** · Replay links (Levi, 2026-10-13): record a playthrough in a link and replay it with the
  path animating, to watch a finished session or pick up an unfinished one. Builds on K47 (tap list
  plus walk-graph fingerprint); the link needs the design token, the taps and per-move timing.
- **K91** · A shorter quiet window for physics-off loads (they never wake): hidden settle from 5.0
  toward 3.25 sim-s. Cost: ~4% of designs lay out 1-4 px differently from physics-on, which K57's
  exempt physics toggle assumes is the same (K64 follow-up).
- **K88** · Validate K74's difficulty measures (greedy walks, route
  turns, decision counts) against real daily solves: moves, backtracks
  and time. Only local results exist today. (K74 idea.)
- **K89** · Fisher-style pacing: loops in series with mid-maze
  bottlenecks, then a calm home stretch. Needs strand cuts and its own
  prototype (`docs/design/K74_maze_design.md`). (K74 idea.)



- **K68** · If junction-web edges look soft at deep zoom (about 4x), size the arm material strip
  rows from the camera's world-per-pixel (re-packed on zoom) instead of raising the 64-texel width
  for everyone (K4 agent idea).
- **K70** · A more dramatic hero settle (P2 polish): splines round the lattice corners from frame
  one, so the settle reads as a gentle tightening, not zigzags turning into curves. Blend sampled
  positions toward the control polyline while progress is low (`docs/history.md`, Follow-ups).
- **K71** · Wobbly threads at slack ~0 (P2 polish): waviness along runs and rope-tight twist chains.
  Candidate knobs: constraint iterations, pullOnly bending, repulsion/structural balance
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
- **K113** · Two-layer vellum: render the fibers and grain once into a static texture (1 texel per
  CSS px) and drift only the mottling in a low-res pass; the drift pass costs about 2.1 ms at
  1600x900 today (K79, `.claude/probes/K79/out/gpu_k79.log`).
- **K118** · Native mobile apps, eventually (Levi, 2026-10-13): not
  before everything else is iterated and finished. The mobile web app
  stays alongside them.
- **K119** · i18n, at the end (Levi, 2026-10-13): there is little text, and an LLM will drive the
  translations. Strings are mostly in `src/ui/` and `src/game/share_text.ts`; text drawn as threads
  is K115's question.
- **K126** · The K21 background breathes with the band's bass, gated
  by the Motion setting, once K116's accompaniment exists
  (`docs/design/K116_instruments.md`).
- **K134** · Forbid equal start and exit anchors in the panel: they
  cause most of K110's exit re-picks and rect moves.
- **K135** · Keep the start/exit pair when a join reaches the other
  flank of an untrimmed cut: 98 tiny designs (gs 2-4) got a longer
  optimal under K110, typically 4.563 -> 5.270.
- **K141** · K80 section 4's costlier mechanisms, deferred (Levi, 2026-10-13): 4.8 sentries (call
  9's "validated sentries"), 4.22 two-player (M hot-seat, L networked), 4.25 over-under swap
  (`docs/design/K80_gameplay_additions.md`). The M ones are K138.
- **K153** · Licenses page extras (K122's ideas): list the packages in
  the dev server too (it shows a placeholder; the module graph has the
  list), and a diffable `licenses.txt` beside the page.
- **K160** · The background speed slider is linear over 0-8; a curve like gridAlign's
  (`src/ui/grid_align_curve.ts`) would give the slow end room. At 8x the 10-15 Hz texture pass may
  look steppy (unchecked on the phone): then scale the re-render rate with speed. A look for K156.
- **K179** · K80 ideas: reversing mid-run in the real-time mode. (The
  roaming bias toward the player was decided on 2026-10-14 and is part
  of K174's work.)
- **K182** · K104 ideas: G1's exact mask for moving plucks too (today
  only still plucks use it), the curvature-aware clip as its fallback;
  check the still strip's concave-side clamp.
- **K57** · Confirm the daily's exempt settings (`src/ui/daily_link.ts`), parked with K46, K84
  (Levi; `docs/design/levi_notes_2026-10-14.md` item 13). Open: `settleBudget`, `loadSettle` (K162
  (3)), confetti settings, `markerSize`; stale comment at `daily_link.ts:153` (K237, K264).
- **K117** · Repo visibility (`docs/design/levi_notes_2026-10-13.md`): private on Levi's word,
  parked until near launch (rest done in a756ca5: `LICENSE`, `package.json`): `gh repo edit
  --visibility private --accept-visibility-change-consequences` (reversible). K122 needed anyway.
- **K187** · K155's History rows explain their stars only on hover, which
  phones lack; add a tap to explain (`docs/design/K155.md`, "Stage 1
  handoff").
- **K199** · A follow camera that holds a panned-away view: today it has
  no pan clamp and returns to the head 2.2 s after a gesture (K148's
  handoff). A new decision for Levi, not a fix.
- **K204** · A key press that matches nothing or ties gives no feedback
  (K120; in its census presses match nothing 1.9% of the time and tie
  9.4%): maybe a nudge or a toast.
- **K209** · Fog of war on dailies? Off today; since K132 a daily is
  today's defaults, so turning it on is a default change or a daily
  override. A call for Levi whenever he wants it (raised by K100).
- **K211** · Drop the retired `snappiness` from `CODEC_PARAMS` at the
  next codec version bump; removing it now would bump the version (K132).
- **K215** · Move the per-feature probe recipes (K73, K79 B, K80, K104,
  K140, K146 + K151, K147, K100) out of `probes.md` (15.5k chars, attached
  by every script or probe read) into narrow files (K173).
- **K296** · Roam 0 as a "sentry": the turn minotaur stands guard while
  it roams, a meaning for 0 instead of K272's minimum of 1. K80 turns
  stage 2's handoff ("For stage 3").
- **K306** · Dead surface in `particle_system.ts`: `twistFillBias`,
  `hasCarve`, and `chainArcLength` (used only by tests). Found by K7's
  design.
- **K310** · K299's leftover shots: its seam sheet shows two pulse
  phases, not three or four, and its rim was injected rather than a real
  hovered choice (K298 builds that). `.claude/probes/K299/sheet/`.
- **K316** · Single-threaded WASM for the collision narrow-phase (~40% of a drag's physics; the
  audit's 2-4x takes gs 18 from 0.76x to real time), only if K7 s5's phone numbers show physics, not
  rendering, as the limit. No threads (Gauss-Seidel can't be colored; SAB needs COOP/COEP).
- **K320** · Split section-rgb (design `docs/design/K320_section_rgb.md`, stage 2 brief `docs/design/K320_stage2.md`): stage 0 PASS (split saves ~1.84 s cold), stage 1 slim done (6c592e6), 2a data plane done (ffd3864), 2b paint-samples-mask landed (this commit; cold paint 29,414 chars/1,735 ms vs combined 46,361/3,217 ms, D3D11 medians); 2c after K550. Was: at 46,850 characters it is the cold critical path (~2.8 s on
  the desktop, K307 s1; K540 attributed G3-1's +0.39 s cold regression to the enlarged gap
  shaders' FXC compile gating first paint — this item is its fix). A deploy that changes a shader costs every player one cold compile
  (programs are cached by source), so a smaller or split program shortens every such load.
  Design + measurements at bd3933a (frag now 48,737): `docs/design/K320_section_rgb.md` — rec: bundle the slim (Stage 1), prototype the split compile-only first (Stage 0 gate); four calls for Levi at its end.
  Stage 0 verdict (eac12a3, probe-only): the split PASSES the >=0.5s gate — cold medians full 3.74s vs paint-only 1.90s / gap-only 0.51s (saving ~1.84s); `.claude/probes/K320/stage0_results.md`.
  Stage 1 done (this commit): the bundled slim (O1+O3; O4 waits on call 1, O7 unmeasured) — section-rgb frag 48,737 -> 46,310, junction-field 29,599 -> 26,305, arm-strip 33,122 -> 31,049, pluck-still 21,075 -> 19,960; budget guard `test/render/k320_slim.test.ts`; evidence `.claude/probes/K320/results.md`. Stage 2 (the split) remains, through the Stage 0 gate and Levi's calls.
  Stage 2 brief (docs only): `docs/design/K320_stage2.md` — gap pre-pass into a canvas-sized RGBA16F mask (keep + draw index, dirty-gated like the arm strips), paint-only section sampling it; master + explore split, fans/still keep the library; fallback to the combined programs where no half-float target; sub-steps 2a data plane / 2b split / 2c registry + gate measure; five calls at its end (rec: build as designed).
- **K550** · K320 2b parity blocker: split stays dark; 2c must not start until the A/B is 0px (or K433 one-level). Diagnosis .claude/probes/K320/k550_diagnosis.md (probes `k550_*.mjs`). Session 1: the shipped mask row is off by one (`- 2 -` -> `- 1 -` = the `gapMaskTexel` twin; def 40,829 -> 12,353). Session 2 (finisher): the row fix + a three-keep mask (owner / under / deep gap passes, chain+arc-turn fragment identity in mask B) solves the stacking AND the dominant same-chain double-coverage term (def 12,353 -> 5,603, darker 6,246 -> 714; fat 6,789, user 3,051, knot 6,773; explore unmeasured - its single-capture control is 36,252, needs the K428 multi-capture form). WIP preserved uncommitted in `.claude/probes/K320/k550_two_keep.patch` (`git apply`-verified on ca60b72; tree left at HEAD). BLOCKER for the flip: MSAA sample coverage - canvas edge fragments (`>=` 1 sample, center-extrapolated varyings) are never recorded by the center-rule mask and paint at 1.0; temp `antialias: false` collapses def to 2,020 / gt1 343, and even that floor fails the brief's gt1 = 0 gate. No exact fix exists in this architecture (WebGL2 cannot sample an unresolved MSAA target; expansion/SSAA measured worse). Levi's call: waive the gate for 1-px edge diffs via the brief's contact sheets, or kill the split and keep Stage 1.
- **K554** · K115 6d: Greek tonos and dialytika (dropped today) and glyphs for U+03AA/03AB/03CA/03CB, or
  Cyrillic (`docs/design/K115_cursive_text.md` C6, 520-526). `docs/design/K115_stage6.md` 6c items 1 and 3 (917-942).
- **K338** · K324's side ideas (`docs/design/K324_realtime_minotaur.md`):
  a real-time close-calls stat (section 5), a Search speed knob (4.4),
  and a real-time sentry (roam 0, K296's analog).
- **K347** · Type-check the tests in `npm test` or CI: the root tsconfig
  includes only `src`, so a test's type errors go unseen. K7 stage 2's
  `.claude/probes/K7/stage2/tsconfig.tests.json` shows how.
- **K350** · Key-move ideas from K329: 8-way sectors on the move pad
  (diagonals are chords today), and a re-run of K120's 24-maze census
  under the new rules (`censusPress()` covers one maze).
- **K352** · Type `LIVE_EFFECTS`'s keys (`src/ui/undo_stack.ts`) as
  `keyof UrlParams`, so a renamed param fails the build (from K339).
- **K359** · Replace the pre-settle's spent-prediction shim
  (`presettleFrame`, K7 stage 3) with an explicit "settling in the worker"
  signal from the physics host.
- **K360** · Ledger diet pass 2 (K353's handoff): CC67 (b5027d8) cut the 165 long open items. Left:
  long In progress items (`ledger.mjs lint`), Done one-liners to ~160 bytes, the "Approved" heading;
  then drop `docs/ledger_diet/`, keep `scripts/ledger_diet.mjs`.
- **K371** · Let the worker run ahead of main's frames in the pre-settle, so it settles through
  K307's compile freezes (K7 s4); watch its phone saturation (97% busy, lagS 1.04 s by 8 s). K7 s7's
  name build could start it (scene ready ~0.15 s in); drop that settle when `prebuild` is `differs`.
- **K415** · Spawn K7's worker before the main chunk evaluates (main spawns it 80-106 ms after
  the chunk lands on the desktop): a small entry reads the link and spawns first; the name then
  needs the link's params (the codec there, or the raw query for the worker to parse). K7 s7 handoff.
- **K389** · Keep comments out of shader text (K76 2d): a comment edit in `EXPLORE_VIS_GLSL`
  changes the strip-explore program, so every returning player links it cold (K307). Move it into TS.
- **K419** · `computeFitTarget` reads `scene.ps` through the SceneRef getter three times per particle
  (`src/app/camera.ts` 64-66); hoist `const ps = scene.ps` at a stage that allows logic edits. No cost
  measured (K5 M2 handoff).
- **K429** · Pixi warns `Attribute aGap / aGapId is not present in the shader` once per
  pluck-overlay pool mesh (its geometry carries them, pluck_overlay.ts 692-693; pluck-blur's program
  doesn't declare them): 1-4 pairs of console noise per probe (K5 R1 handoff).
- **K434** · Snap the follow camera's spring tail (`src/app/camera.ts` 395-420) below
  ~1e-3 px of offset and speed, so the view stops bit-exactly instead of easing on ~10 s
  by sub-pixel steps (K268 3a). It changes every follow camera's tail: Levi's call.
- **K438** · ProbeCtx takes the frame loop itself (its four getters, `invalidate`,
  `wake`, `frameCost`, `revealCost`), with frame_loop.ts exporting `type FrameLoop =
  ReturnType<typeof createFrameLoop>` (`docs/design/K5_K6_split.md`, Stage M3 handoff).
- **K472** · Should forces.ts's emergent collector skip fused-joint pairs too? Today only the
  renderer does (K397 s3: `crossing_gaps.ts` `isJointPair`; forces.ts l.316-347 has no junction
  exclusion; `docs/design/K397.md`, Stage 3 handoff).
- **K478** · A fade tap whose nearer lobe is under LOBE_MIN_LEN is silent since K459; it could pluck
  the next lobe inward (`docs/design/K459.md`, Handoff).
- **K493** · Thread reveal ends, candidate C (K466): draw an end through the over thread at its
  crossing. Needs shader text, so every explore variant would compile cold (render-explore.md THE
  ENDS; docs/design/K466.md Handoff).

- **K529** · K500's other half: a touch press on a beyond run lighting its glow, in the realtime chase (desktop mouse hover verified; touch unprobed).

## Done

- **K551** · Crossing gaps gone on every half-float GPU since 2026-10-18 (K320's split turned on by capability and drew no gaps on D3D11): the split stays dark, the warm-up follows the draw flag. Done in f18dd07 (2026-10-19).
- **K161** · Disk cleanup: profiles and 78 worktrees swept 2026-10-15; the last three worktrees, the empty folder and two dead branches went 2026-10-19 (`.claude/probes/K161/cleanup.log`). Profiles return until K150 lands. Done in this commit (2026-10-19).
- **K243** · Paused instant intro draws no threads: beginSettle instant branch now draws its first frame. Done in 0f8e277 (2026-10-18).
- **K489** · Dead finishIndicator.gate() hook removed (visible() composes the hold; never wired). Done in 0f8e277 (2026-10-18).
- **K369** · Favicon linked relatively (./favicon.svg) in index.html. Done in 0f8e277 (2026-10-18).

- **K541** · Panel Stage A2: remaining moves, word labels (at most 23 chars) on every row, desktop width 320 px, inventory rerun. Done in 2c351ae (2026-10-16).

- **K530** · K481 stage 3: telegraph hover/press + wait tick, phone ticks/tint, toggle-off A/Bs. Done in 31b2238 (2026-10-16).
- **K481** · Turns by length (toggle `minoByLength`, stages 1-3): stage 3 done in 31b2238 (K530); item complete - close or keep only the K545 look call. Done in 31b2238 (2026-10-16).
- **K527** · K74 stage 4 build half (`docs/design/K74_stage4.md`): greedy-trap search shipped H1-in-loop only behind `greedyTrap`. Done in 7d794b5 (2026-10-16).
- **K532** · K527 answered in full by Levi (2026-10-16): all calls taken, every threshold a slider beside `greedyTrap`. Done in 7d794b5 (2026-10-16).
- **K268 (stage 2 item 2, PROTECT part)** · The protect waiver scales by the covered thread B's visibility per side under the thread reveal: computeGapSlot records B's chain/pass per slot side (slotProtChain/slotProtCtrl), applyExploreGaps writes the clamped vis as a per-slot factor into spare gap texels (texel 3.x / 9.w, solved at 1; GapMaskTable.setProtVis/protVisOf), and only the explore shader variants multiply the waiver by it (EXPLORE_PROT_GLSL; master's gap text and mode-off cost untouched, fans never run it). Mode off restores 1. Proof: unit tests (gap table texels, protVisScale, shader texts incl. fan/still undo), CPU census in a walked fabric state (706 sides, 0 mismatches; 544 hidden / 22 shown / 4 partial), protect probe 5/5 and census3a 22/31 = the K430 ramp baseline (the 3 extra fails in one run moved off on rerun - variance inside K537). The biting-triangle GPU census is K542; the far-branch smooth-min is the item's remaining part. Done in this commit (2026-10-16); evidence .claude/probes/K268/stage3a/out/protect_final/ + census_protect2/.
- **K268 (stage 2 item 2, FAR-BRANCH part - item 2 complete)** · The far-branch smooth-min blends vis-weighted cuts instead of distances in the explore programs only: each branch's geometric cut times its own coverage (the far branch's at its own projection through exploreCutCover), combined as the stronger weighted cut plus the smooth-min dip scaled by the visibility both branches share (farBlendCut; equal coverages reproduce master's blended cut weighted, a hidden branch contributes nothing). Dots frontiers and non-shaped slots keep master's path; master's gap text and mode-off cost untouched. Proof: farBlendCut + shader-text/undo unit tests, all explore variants compile in WebGL2, census3a 22/31 = the ramp/PROTECT baseline (same 9 K537 fails, 0 page errors). With this, K268 stage 2 item 2 is complete. Done in this commit (2026-10-16); evidence .claude/probes/K268/stage3a/out/census_far1/ + far_variants/.
- **K534** · Panel Stage A1 (K323 stage 1 + K339 merges, codec 7): `gameMode` (classic/minotaur/burn) in a new Game folder after Design, exploration in Game, Real time as a checkbox over `clock` (`clockOf`), burn as a mode, `minoPull` slider for `minoToward`, minotaur without off, confetti/deadEnds/snappiness/fire codec entries gone (density 0 = braided, amount 0 = none), K340 look F CSS, K263 closed. Golden dailies and K74 pins unchanged (no default moves a maze). Done in this commit (2026-10-16); the rest of Stage A is K541.
- **K536** · G3-1's browser verification: brute vs pruned 0 px on all 10 G1 links (phw=0) and on def/user/ring on the worker host; G1 census unchanged parent vs 3465090 (naked 0 on the clean set, overcut within ~1%); census2d 23/30 parent vs 24/30 G3-1 (same fail families, PROOF passes only on G3-1), census3a 21/30 on G3-1 within K537's pre-existing set; held still pluck (still:true) and routed web (6 moves) brute 0 px on both builds, cross-build diffs single-level casing edges (gt8 = 4 px); GAP GL readback GPU == CPU mirror exactly (25-texel rows, 4 links x worker + phw=0, gl.getError 0, no lost context); frame bench at rest unchanged (default p50 0.2 ms both, dense mean 5.32 vs 5.24 ms). Section cold compiles equal; the cold first-visible gap is K540 and the phone half is K539. Done 2026-10-16 (verification only, no code commit; evidence `.claude/probes/K8/G3-1/`).
- **K366** · The first-tap residual measured and attributed on the shipped K307 stage 3 build (e83f203): the 35-54 ms frame reproduces only on fabric (39 ms, ripple off; ~50 ms first pointerup handling), so it is not a shader link (inferred first-pluck allocation / paint re-declare; no fix this stage). Done in e83f203 (2026-10-16); the fix is K535.
- **K210** · Daily determinism answered by Levi (2026-10-16): past dailies reconstructible as (app version -> frozen PARAM_DEFAULTS) merged with per-day overrides; post-launch changes must not significantly alter previous dailies. Done (answered 2026-10-16); the implementation item is K531 (folds K82, launch prep).
- **K339** · The settings panel's audit answered by Levi (2026-10-16): all recommendations taken. Done (answered 2026-10-16); Stage A unlocked as K534, K340's nested-folder look follows (rec. look F).
- **K323** · Game folder / `gameMode` answered by Levi (2026-10-16, with K339): all recommendations taken. Done (answered 2026-10-16); Stage A (panel rebuild, codec 7) unlocked as K534.
- **K82** · Manually override the daily maze for a given day. Done: folded into K531 (2026-10-16; frozen per-day override table, published days immutable).
- **K500** · The realtime chase's multi-run tap is page-probed: real clicks walk the whole route in order, uncaught, with the hover glow on the tapped beyond run (desktop; build 5011adf). Done 2026-10-16 (probe only, .claude/probes/K500/; no commit). Touch-press half is K529.
- **K461** · rt_page.mjs (and perf_batch/perf_attr via its default) now pass the realtime pair &fsr=0.3&fdr=40, not the turn pair. Done 2026-10-16 (probe only, .claude/probes/K114/stage2/; no commit).
- **K526** · Footsteps pan by screen x: KnotSynth gains a StereoPanner pan on pluck (clampPan), and the turn minotaur's footstep pans by its vertex's screen x (footstepPan in mino_feedback). Done in this commit (2026-10-16).
- **K373** · Boot fixes: safeAreaInsets is cached and read lazily on the first indicator update (was a forced layout at boot), and formatDayDate reuses one Intl formatter per locale. Done in this commit (2026-10-16).
- **K436** · Regenerate clears the frame loop's halted flag on the main thread (lifecycle beginLoading/beginSettle), so a halted page recovers without a reload; K454, K469 and K314 were the same defect. Done in this commit (2026-10-16).
- **K454** · Same defect as K436. Done in this commit (2026-10-16).
- **K469** · Same defect as K436. Done in this commit (2026-10-16).
- **K314** · Same defect as K436 (the watchdog comment now holds). Done in this commit (2026-10-16).
- **K346** · A NaN displacement now raises the frame's max move (particle_system's Verlet loop), so maxMove reads non-finite and the physics halt fires on a NaN state. Done in this commit (2026-10-16).
- **K398** · Link values clamp to the panel ranges (PARAM_RANGES in param_codec.ts: on encode, and in url_state's readers; the codec's decode stays lossless, hueShift/background sentinels/junctionBlend's floor keep their pins), so a gs 66+ knot link can no longer overflow the GAP texture. Done in this commit (2026-10-16).
- **K524** · K80 turns 3b's real-phone contact sheet: shot 2026-10-16 on the real Pixel 11 at 411x753 (master 5558669, PowerVR Vulkan; roam turn 2, hunt turn 47, caught turn 48, all checks pass). `.claude/probes/K80/stage3b/contact_sheet_real.png` beside the emulated sheet; frames + look notes in `shots/phone_real/` (probe `turns_phone_real.mjs`). Done 2026-10-16 (probe evidence only, no commit).
- **K521** · K74 stage 3 items 7-8 measured: prototype port byte-identical 640/640 (K109/K110 exception list empty); greedy bar fails on dailies 1-240 (gF median 2.86x, 20.0% within 1.5x vs the 15% bar) - owned by stage 4's search (K527), not a stage-3 retune. Done in 4098946 (2026-10-16; evidence `.claude/probes/K74/stage3/out/results_k521.md`).
- **K270** · K80 turns 3b diagnosed the lavender band: a stale pre-catch telegraph/glow frame at the catch site; turnCaught now re-syncs the minotaur in the same call. Done in dcdfaf4 (2026-10-16).

- **K402** · K74 stage 3's questions, built as recommended (corridor 24, away flank, exit taper off; codec 152-155, never daily-exempt). Done in 9ccf360 (2026-10-16).
- **K284** · K74's sources credited (Pullen; Zhao and Marquez 2013) in `src/` and RESEARCH. Done in 9ccf360 (2026-10-16).
- **K76** · Thread-reveal mode, stage 2: criterion 2 fixed (applyExploreGaps re-derives underWindows/pluck footprints from the last solve ungated slot data, no update() per move; phone gate2 fw=0: 0 updates/move, was 1-5), K362 start view widened to 2x(revealDistance+2), HC phone shot taken (capture tiles, K513 path). Done in 5da3f5c (2026-10-16; evidence .claude/probes/K76/stage2e/).

- **K514** · Looks screenshots no longer tile with the phone sitting in landscape: `shotViewport` captures at a surface-fitting scale on the page's emulation CDP session (464x850 for 411x753). Done in this commit (2026-10-16).
- **K516** · K6-3 phone cadence check: knot fw=0 draws 0/s at rest (ticker stopped), fabric ambient cadence 23.8 drawn/s (rAF p95 16.9 ms, smooth), continuous mode 60.2 / 44.0 drawn/s; load first sleep 10.5-12.9 s. Done in 11309be (2026-10-16; `.claude/probes/K516/results.md`). Residual K520.

- **K518** · K397/K76 census ported after K6-3 (continuous `__knotLoop` + freeze of the per-frame slot re-derivation during mutation shots; stale PROOF_UNTIL default removed) and re-run on master: dots-cut PROOF PASS non-vacuous (32 shaped slots, 11,381 px, ghosts/under 0, dots p95 err 0.059). Done (probes + docs only, 2026-10-16; evidence `.claude/probes/K397/stage4/out_k518_m10c/`, `docs/design/K397.md` Stage 4 handoff). Residuals K519; phone/Levi link still owed under K397.
- **K519** · K518's census leftovers attributed (no product bug; no `src/` change): visible cuts, hidden leaks, c214's restore and visitAll/off-again are one-level capture flicker (slot bytes identical off/on); JOINTS (2d) is census3a's attributedUW case; MARKERS i1 is K465's lifted exit by design; the 1,633 px attribution restore reads 0 px now. Done in this commit (2026-10-16; evidence `.claude/probes/K397/stage5/`, `docs/design/K397.md` Stage 5 handoff). Residuals K522, K523.
- **K399** · G3-1's launch gates answered by Levi (2026-10-16): G3-1 before K268 item 4 and never beside it; a gap slot over 64 SAMP points strides at most 3, never a cut reach; GAP stays one slot a row, K398 clamps links. G3-1 unlocked.
- **K517** · K385's branches answered by Levi (2026-10-16): ship (b) late enable in K307 stage 3 proper and file crbug (d); (a) was probe-only, (c) parked. Evidence `.claude/probes/K307/stage3/`.
- **K501** · K481 by-length difficulty answered by Levi (2026-10-16): add a travel scale, tuned on the turn sim toward today's nine-cell catch rates, not a by-length-only retune and not shipping it deadlier; K481 stage 2 tunes it. Evidence `.claude/probes/K481/sweep_length_32.md`.
- **K522** · census2d taught the measured flicker floor (hard diffs >1 level, `FLOOR_CLIP_PX` 23 from K519, edge/colour tolerance, contemporaneous restore references; first-frame diff is a drift report, K528). Done in this commit (2026-10-16; probe + docs only, evidence `.claude/probes/K76/stage2d/out_k522_m10e/`).
- **K523** · census2d ported census3a's `attributedUW` underWindows swap + `fadeModel` and an exit-aware MARKERS rule (K465's lifted exit passes at vis 0); m10 recipe 30/30 (was 17/29), joints' product side stays K268's K430 ramp after G3-1. Done in this commit (2026-10-16; `docs/design/K397.md` Stage 6 handoff).

- **K6** · One frame loop driven by what-changed flags: K6-1 shadow flags, K6-2 skip-CPU (926fdfe), K6-3 (= K24) skip-draw/stop-ticker/30 fps rest cadence, screen-aware CAMERA scale bound, continuous `__knotLoop` + pre-load global, idle stamp refresh, diag `idle`. Done in 1654ef0 (2026-10-16; evidence `.claude/probes/K6/K6-3/`). Residual K516.

- **K480** · Multi-run taps (Levi 2026-10-15): stage 2, the light - pulses and hover branch through short runs to `pulseReach` (`litArms` in route_plan.ts; `kPulseV` phases by global distance in shader + CPU mirror), and a hover lights the whole route its tap would take. Done (stage 2, this commit, 2026-10-16; stage 1 in 3b1612f; evidence `.claude/probes/K480/stage2/`). Residuals K500, look K515.

- **K513** · Phone-pass frames gate: the 88-row flat strip was Android capture tiling (landscape surface 2125x1017 repeated every 1017 rows), not a blank render; `emulation.mjs` re-checks a strip at dpr 1 and frames then ran A/A 2 reps on 65a7787 within noise. Done (this commit, 2026-10-16; evidence `.claude/probes/K513/`, `.claude/probes/rounds/2026-10-16-65a7787/`).
- **K509** · K6-1 Q2 sleep-trip GEOM miss measured 0 px (knot fw=0 with worker, first-sleep shot vs after invalidate(), controls 0 px, before and after K6-2) - GEOM gating loses nothing. Done in 926fdfe (2026-10-16; evidence `.claude/probes/K6/K6-2/`).
- **K510** · K5 M6: pointer input, auto audio and keys moved to `src/app/input_pointer.ts`, `auto_audio.ts`, `input_keys.ts` (pure move; tsc clean, 1333 tests, scripted-input A/B knot/fabric 0 px, fog/threads within same-build controls, k7_frames rest+drag within noise on both hosts). Done in c268a9b (2026-10-16).
- **K499** · Gamepad support: d-pad + left stick (deadzone, eight sectors) feed the key picker as held keys, held-at-arrival like keys; A/confirm is a tap-class step (no mid-move queue). Pure mapping `src/ui/gamepad.ts`, lore GAMEPAD in `gameplay-moves.md`; unprobed on real hardware. Done in 9a6f63d (2026-10-16).
- **K502** · K5 R5 same-state pixel proof (48fc9ee vs 1c666ec, perf lock, &phw=0): knot 0 px, fabric 0 px, fog 258 px vs 283 px same-build control, threads load-state 0 px (post-move divergence 572,889 px below its 604,864 px control - follow-camera non-repeatability, K428); rebuildFillets(true) on fabric 4.23 -> 4.30 ms mean (+1.6%), median 4.355 = 4.355 ms. No regression. Done (probes only, 2026-10-16; evidence `.claude/probes/K5/K502K505/`).
- **K505** · K5 M5 same-state pixel proof (e53e4d9 vs 3166d8f, perf lock, scripted input): knot 0 px, fabric 0 px, fog 43 px vs 8,555 px control, threads load-state 0 px (post-move divergence in the same-build control's range); hook inventory identical (50 `__knot*` hooks, renderer prototype/own surface, 153 params, panel labels). No regression. Done (probes only, 2026-10-16; evidence `.claude/probes/K5/K502K505/`).
- **K471** · K6-1's unrun checks: &phw=0 PHYS clear at rest on both hosts; the fabric/chase/reduced non-tug was a loop_shadow probe bug (pressed the entrance choice run), fixed in the probe; m2_input_ab's pins fixed (pluck clock, syncExplore, fogTime, waitStill) - controls now 0 px. Done in fb54535 (2026-10-15).
- **K507** · K507 isolated: c22de79-vs-52faab8 round trip 0 px both ways (R2 cleared); the 43,385 px vs 3166d8f bisects to K466's 2aea912 (new `rve`/`rvg` defaults), and pins to 0 px with `&rve=under&rvg=soft` - intentional, not a code-move regression; follow-up K512. Done (probes only, this commit, 2026-10-16; evidence `.claude/probes/K5/R2/checks/k507/`, original pairing preserved in `checks/k463_c22_3166/`).
- **K463** · K5 R2's unrun checks under the perf lock (c22de79 vs 3166d8f): fog phw=0 PASS (same-state cross-build 0 px; branch spread was capture noise, K390); cross-build threads round trip FAIL filed as K507 (capture transfer faithful, render differs). Done (probes only, HEAD 3166d8f, 2026-10-15).
- **K482** · Desktop panel: row-help labels are buttons only on coarse pointers and in the sheet (the desktop keeps the title tooltip, one Tab stop per row). Done in 3c509ec (2026-10-15).
- **K483** · Phone sheet font 13 px under SHEET_QUERY only (the side panel stays at 11). Done in 3c509ec (2026-10-15).
- **K488** · The finish indicator's tap became a peek: zoom out to frame the exit, hold 2.5 s, ease back; the label says so. Done in be36622 (2026-10-15).
- **K496** · Tap preference (K479): Levi kept all three calls as built (the retraced run stays an ordinary choice, a tap inside both ribbons at a crossing goes outgoing, ARRIVAL_BIAS 1.5 for both pointers). Done in 796e158 (2026-10-15).
- **K492** · Thread reveal ends (K466): Levi kept A (`rvg=bright`, `rve=under`) as the default; B stays opt-in (K494). Done in 554f2af (2026-10-15).
- **K479** · Taps prefer the outgoing runs (Levi 2026-10-15: taps meant for the next run take the arrival run): in `edgeAt` the arrival run should win only by a clear margin, and the hover must pick what a tap takes. Done in 796e158 (2026-10-15).
- **K466** · Thread reveal: emphasize unexplored thread ends more, especially ends that lie under a crossing (Levi 2026-10-15 15:49). Done in 554f2af (2026-10-15).
- **K465** · Thread reveal: show the finish marker and its off-screen indicator by default (Levi 2026-10-15 15:49); K76 decision 6 hides both until the exit's thread is seen (drawMarkers, main.ts finishIndicator, EXPLORE_MARKER_VIS). Done in 76fb5ea (2026-10-15).
- **K468** · Settings menu full screen on mobile (Levi 2026-10-15 ~15:58): a top bar with close, undo and redo; Android back closes it; phones in landscape too. Done in 2c066d4 (2026-10-15).
- **K467** · Mobile row help: show each row's tooltip text on touch (Levi 2026-10-15 ~15:58). Done in 2c066d4 (2026-10-15).
- **K448** · Real-time fire tooltips give seconds: the delay its head start (20 is about 1.7 s, 40 about 3.3 s), the speed its units a second (K440). Done in bb40ae2 (2026-10-15).
- **K440** · Real-time fire defaults: real time plays its own pair, 0.2 / 20 (`fsr`, `fdr`); turn keeps 0.75 / 0; speed floor 0.1. Done in bb40ae2 (2026-10-15).
- **K395** · Pluck blur seam and heart pinch at a kink loop's tip; the phone check passed on live 8f81faf. Done in cd62db6 (2026-10-15).
- **K449** · K397 stage 2's looks: Levi keeps the cap and two dots, and the fade tap's pluck ("If we make a pluck sound, then we should show the pluck effect"); his 13:39 report is K397's and K459. Done in 092aca0 (2026-10-15).
- **K411** · A phone window for K8's bench: Levi lent the phone 2026-10-15 13:45 (K395, K8). Done.
- **K408** · The start marker fades out once the fire passes its thread point (K114 s2). Done in 7d29319 (2026-10-15).
- **K430** · The underWindows step (K268 3a): when a crossing's over pass reaches vis 0.5, the under thread's junction web retracts in one frame while the gap fades in. Dropped: Levi picked the ramp (2026-10-15); K268's next stage builds it (`docs/design/K268.md`, Stage 3a handoff, item 1) (2026-10-15).
- **K423** · Levi: dots (c), always two sized to fit; the vibration stops at the stub's solid end. Done in 2254b50 (2026-10-15).
- **K418** · ledger_diet.mjs archives undated Done items silently. Dropped: superseded by CC65's `ledger.mjs archive` (claude-config fdbcf79), which leaves undated entries in place and warns (2026-10-15).
- **K294** · Per-model minotaur defaults: guard sight 4, accuracy 0.3; stalker accuracy 0.45; the hunter keeps 2 and 0.3 (stalker call K421). Done in c2ebabc (2026-10-15).
- **K293** · K80 turns stage 2's residuals: (a), (c), (e) fixed in 8df33a2; (b), (g), (h) needed no code; (d), (f) kept by design and written into lore. Done in e6e1734 (2026-10-15).
- **K311** · Pixi's aGap/aGapId/aUV warnings at load. Dropped: duplicate of K212 (2026-10-15).
- **K361** · G3/G4's calls. Answered by Levi (2026-10-15): recs taken except the spline bend (q13), which stays open in K90; recorded in `G3G4_sdf_geometry.md` §6.
- **K362** · K76 2c's calls. Answered by Levi (2026-10-15): recs taken; recorded in `K76.md` ("Stage 2c handoff"); the start view's widening is in K76's next.
- **K377** · K5/K6's seven calls. Answered by Levi (2026-10-15): all seven recs taken; recorded in `K5_K6_split.md` 8.
- **K383** · K290 3a's calls. Answered by Levi (2026-10-15): as built, except the start marker hides once its thread has burnt (sent to stage 3b); 3b draws unseen fronts as nothing; recorded in `K114_burn.md` ("Stage 3a handoff").
- **K357** · Is K344's cusp gone? Answered by Levi (2026-10-15 07:04, on the phone): not quite, a seam and a pinch remain at a loop's tip; K395 carries it.
- **K381** · The K83 PIN recipe (`probes.md`) and `k83_ab` pin the fabric's explore clock. Done in 7a17355 (2026-10-15).
- **K24** · Render on demand when the scene is static. Dropped: folded into K6-3 (`docs/design/K5_K6_split.md`, 5.4), 2026-10-15.

- **K279** · Plucks you can see, feel and hear: the ripple (glint by default), vibration, an optional tug, quieter auto plucks. Done in 50c1aab, ad2618a and b1524de..810af10 (2026-10-15); follow-ups K365-K369.

- **K353** · The ledger diet: `scripts/ledger_diet.mjs` shortened the open items and made Done one-liners; the originals are in `docs/ledger_notes.md` and `docs/ledger_done.md`. Done in 300c995..c4a0280, applied in 6c85a38 (2026-10-15).

- **K344** · The pluck blur's sharp cusp in a self-crossing loop: an under node's clip now stops short of the loop's own over pass. Done in 93d0e4d..810b462 (2026-10-15).

- **K257** · K76 section 10's questions: Levi took every recommendation; K76 2c builds them. Done (2026-10-14).

- **K286** · K268's draw order in a fading crossing: kept as built (Levi took the recommendation). Done (2026-10-14).

- **K288** · K279's pluck picks: glint is the default ripple (`prp`), the rest stays as built, and the wave keeps bending the markers, trail and fog; K279 stage 2 builds them. Done (2026-10-14).

- **K329** · The arrow keys at a 4-way junction: each run now gets at most one key (at an X, the diagonal arm clockwise of the key; differences under KEY_TIE ignored), in `src/ui/key_moves.ts` (lore `gameplay-moves.md`, TIE CYCLES, CHORDS AND THE MOVE WAIT). Leftovers K348-K350. Done in 56ddd6a..2c81a92 (2026-10-14).

- **K333** · Diagonal chords: two adjacent keys within 80 ms pick from the four diagonals, opposite keys never chord, and the move pad chords the same way; built with K329. Done in 56ddd6a..2c81a92 (2026-10-14).

- **K334** · No snap on a second press: a key, pad press, tap or click during a move waits (`MoveWait`, the latest wins) and is taken on the arrival frame; built with K329. Done in 56ddd6a..2c81a92 (2026-10-14).

- **K335** · The confetti rain's top edge: the rain's releases taper over 2.2 s and a later piece starts up to 0.12 screen heights higher, so the wave thins out raggedly (`src/render/confetti_model.ts`; lore `render-confetti.md`). K336 and K337 stay deferred. Done in 79c5a97..c7dacce (2026-10-14).

- **K325** · The snoring cat on the panel's credit link: Levi's own recording plays on hover and touch-down (`src/audio/snore_sfx.ts`, `src/ui/snore_link.ts`; lore `gameplay-audio.md`, THE SNORING CAT LINK). Leftovers K342, K343. Done in b8ee851..33f7a38 (2026-10-14).

- **K298** · The hover glow, its own stage: `hoverGlowLength` (`hgl`), `hoverGlowFade` (`hgf`), the glow also on a hovered choice, and mouse pick margins in screen px (`pickMargin` `pkm`, `pickChoiceRatio` `pkr`; touch keeps today's, K331). Left over: K327, K328, K330, K331; `docs/design/K298_hover_glow.md`. Done in 44b19a3..813e098 (2026-10-14).
- **K317** · More confetti by default (the rain per amount 140 -> 280, the finish's spray 40 -> 160; reduced motion keeps its 16 pieces); the phone's frame rate rides K156's next pass. Done in ab8b78f (2026-10-14).
- **K253** · K193's portrait A/A floor, taken on a quiet phone (`aa4`, 36 of 36 samples at 411x753), installed as `scripts/phone_pass/noise.json` (lore `probes-phone.md`, THE PORTRAIT FLOOR; evidence `.claude/probes/K253/aa4/`). Done in 459cc11 (2026-10-14).
- **K193** · The phone pass's orientation: it emulates a 411x753 portrait viewport over CDP (`-Viewport portrait|native`, `scripts/phone_pass/emulation.mjs`; stage 1 c36b57c..763067a); K253 took the portrait floor. Left over: K300, K254-K256; `docs/design/K193.md`. Done in 459cc11 (2026-10-14).
- **K302** · K7's 11 calls (`docs/design/K7_worker.md`, "Levi's calls"): all yes, as recommended; his multithreaded-WASM question went to K316 and call (4) led to K313. Done (2026-10-14).
- **K299** · The choice pulses and the trail misdrawn at one junction: `kArcOfCtrl` wrapped a closed chain's ctrl through a float division the GPU rounds; fixed with integer-corrected laps (`kLapOf`, `kWrap`; lore `render-paint.md`, RING LAPS; `docs/design/K299_choice_pulse_bug.md`). Done in 74ad307..e5acafb (2026-10-14).
- **K264** · The hover rim's width becomes a slider: `hoverGlowWidth` (`hgw`, codec 130, daily-exempt, default 0.85); his follow-up is K298 (`docs/design/K111.md`, "Stage 4 handoff"). Done in a47642d..f294247 (2026-10-14).
- **K273** · What a minotaur catch resets: `minoRestart` (`mrs`, off) restarts the level, `minoLair` (`mlr`, on) off leaves the minotaur where it caught you, `minoRefog` stays the fog's toggle (`docs/design/K80_turns.md`, "Stage 2 handoff"). Done in 86d404e..02194b4 (2026-10-14).
- **K272** · The turn minotaur's sliders at 0 (roam 0 stood still, territory 0 was a random walk): both now start at 1 (`MINO_RUNS_MIN`); roam 0 as a sentry is K296. Done in 86d404e..02194b4 (2026-10-14).
- **K283** · The real game's end banners after K274, checked from a live solve (`.claude/probes/K80/turns2/banner/`; the original probe's two stale checks are K295). Done in 86d404e..02194b4 (2026-10-14).
- **K274** · Explain each stat behind the win banner's info button: a `STATS` table in `src/game/maze_stats.ts`, the banners' "What the numbers mean" list and the stats view's legend (`docs/design/K274_K277.md`). Follow-ups K282, K283. Done in 71a7c25..79805af (2026-10-14).
- **K277** · Credit the research and techniques on the credits page: eleven `RESEARCH` entries in `notices/credits.ts`, worded as use, never endorsement. Follow-ups K284, K285. Done in 71a7c25..79805af (2026-10-14).
- **K275** · Junction joints and dead-end caps fade with their thread under thread reveal (K76): Levi said yes to the fade (`docs/design/K76.md`, "Stage 2b handoff"); K268 stage 2 and K76 stage 2c build it. Done (2026-10-14).
- **K237** · The hover rim's strength: `hoverGlow` stays 0.4 and daily-exempt (K57), as built. Done in 6588ec0 (2026-10-14).
- **K269** · The turn hunter's catch rates on today's mazes: Levi said retune; sight 4 -> 2 and accuracy 0.9 -> 0.3 take the hunter to 1.0% / 13.1% on H1 mazes. The stalker and the treelike sets paid for it: K294. Done in 86d404e..02194b4 (2026-10-14).
- **K248** · Levi's highlight pick: the choices keep the pulses and a hovered choice keeps today's look; `highlightMode` and its modes went (CODEC_VERSION 5), and a hover off the choices gets K145's rim reshaped (lore `render-paint.md`, HOVER GLOW; `docs/design/K111.md`, "Stage 3 handoff"). Calls: K264, K265, K237. Done in 365bc45..6588ec0 (2026-10-14).
- **K249** · K111's rims and contrast modes stopped hard at junction webs and fans. Dropped: the modes were removed in 365bc45 (2026-10-14).
- **K250** · An idle-render skip for the steady highlight modes. Dropped: the modes were removed in 365bc45 (2026-10-14).
- **K198** · The fit camera's pan and the off-screen indicators: the pan range lets the maze's edge reach the open panel's edge (`src/ui/view_clamp.ts`), the finish, head and minotaur indicators get show/hide switches and one size slider, the head's disc waits 0.45 s off screen, and the panel limit and displaced indicators tween (lore `gameplay-camera.md`, `gameplay-indicators.md`; `docs/design/K198.md`). The disc's slide across the panel is K251, residuals K252. Stage 1 5f6ceb9..d7373a4. Done in 96fa13a..af0f054 (2026-10-14).
- **K111** · Accessibility: an Accessibility folder first in the panel with High contrast and Reduced motion master checkboxes (`src/ui/accessibility.ts`; stage 1 0e5a138..9c6cab3, review K238); stage 2's highlight modes were later removed (K248). Done in 36d280a..5438a60 (2026-10-14).
- **K174** · The minotaur's controls (Levi's K80 stage 1 calls): the paces as fractions of `playerPace` (`mwp` 0.5, `mhp` 0.7), and `minoToward` (`mtw`) and `minoRefog` (`mrf`) checkboxes, tuned on the K80 sim (lore `gameplay-minotaur.md`; `docs/design/K174.md`). Follow-ups K245-K247. Done in ecf2169..6ec8275 (2026-10-14).
- **K235** · Taps inside junction cores make no sound (`tapLobes()` in `pluck_model.ts`; lore `render-pluck.md`; `docs/design/K235_K239.md`). Done in 08d1383..05e6d4d (2026-10-14).
- **K239** · A fresh static page drew its first frame before the renderer had its fade and flow: `handRendererLook()` in `main.ts` now hands the renderer every look param before each `update()` (lore `gameplay-motion.md`). A paused page with the instant intro is K243. Done in 08d1383..05e6d4d (2026-10-14).
- **K191** · K169's two calls: a web that stops being full fades its gold out over the same 0.25 s, and reduced Motion keeps the fade (`web_fade.ts`; lore `render-web-fade.md`; `docs/design/K154_K169.md`). Done in fafa340..3467117 (2026-10-14).
- **K145** · A subtle hover glow on runs that aren't choices: `hoverGlow` (`hg`, codec 105, default 0.4, daily-exempt), a G2 rim term with its `paint_math` mirror (lore `render-paint.md`, HOVER GLOW; `docs/design/K93_K145.md`). Residuals K236; the default and exemption K237. Done in 06edef4..56b6f2d (2026-10-14).
- **K219** · Whether the choice hover needs a floor at low `pulseReach`: Levi, "Hover should honor the slider." No floor; nothing to change. Done (2026-10-14).
- **K92** · Undo and redo for design changes: a 100-step history (`src/ui/undo_stack.ts`), buttons beside the panel button (`src/ui/undo_buttons.ts`), the badge on its own row (lore `gameplay-panel.md`, `gameplay-badge.md`; `docs/design/K92.md`). The panel's lower top is K229. Done in d707bc1..e78ddcc (2026-10-14).
- **K224** · The K120 move pad drew over the open panel on the phone; K92 hides the pad while the panel is open. Done in d707bc1..e78ddcc (2026-10-14).
- **K98** · Marker sizes and two new glyphs: a `markerSize` slider (`mks`, codec 104, daily-exempt, default 1.08), colored dots back at the start and finish, a horns glyph for the minotaur (lore `render-markers.md`; `docs/design/K98.md`). The spider glyph is K226, the default size K225. Done in 68a9622..f5982cd (2026-10-14).
- **K93** · Trail fade and hover reach: the trail piece holding the fade start splits in two (`src/render/trail_paint.ts`), and the choice hover stops at `pulseReach` and fades in every path mode (`docs/design/K93_K145.md`). Follow-ups K217-K220; stage 2 is K145. Done in 82ca7d9..ed8f284 (2026-10-14).
- **K173** · Split the `.claude/rules/` lore by topic: 32 new topic files with narrow `paths:`, moved verbatim by `scripts/split_rules.mjs` and indexed in `docs/lore_index.md` (`docs/design/K173.md`). Follow-ups K214, K216; idea K215. Done in 62e7d5b..1fe468d (2026-10-14).
- **K132** · Drop link and daily back-compat: one live codec table (`CODEC_PARAMS`), CODEC_V1-V4, the delta blobs and DAILY_V1 removed, an all-default design writes `?<seed>`; no pin moved (`docs/design/K132.md`). Follow-ups K210-K212. Done in 402eb4b (2026-10-14).
- **K100** · The fog of war resets on a restart only (walking back, a daily's Reset path and a K80 catch keep it): the controller counts restarts and the renderer clears the stamps when the count moves (`docs/design/K100.md`). Follow-ups K206-K209. Done in 458e1e5 (2026-10-14).
- **K61** · `encodeDelta` (the old `?daily=N.<delta>` writer), used only by tests. Done in 402eb4b (2026-10-14): K132 removed it and the delta reader.
- **K203** · K120's calls (`docs/design/K120.md`): the move pad on by default on coarse pointers, bottom right at 132 px, the 15 deg tie rule and the 200 ms hold; Levi confirmed ("ok"), nothing to change. Done (2026-10-14).
- **K200** · K146 + K151's calls (`docs/design/K146_K151.md`): free play's X always shows, and the practice banner, share text, badge tap, labels' daily numbers, History's rows and v2's late results; Levi confirmed ("ok"). Done in 7950c7f (2026-10-14).

- **K120** · Faster, smoother input: arrow keys and WASD move by direction (`src/ui/key_moves.ts`: 70 deg match, 15 deg tie, 200 ms hold) and a touch move pad (`src/ui/move_pad.ts`). Calls K203; idea K204; residuals K205. Done in ba8b198..0acbce0 (2026-10-14).
- **K146** · Past dailies, playable without credit: daily store v3 (a late attempt finishes as practice, outside every aggregate), a History listing every past daily, a practice banner and share title. Calls K200; residuals K201, K202. Done in df8929c..b9cf882 (2026-10-14).
- **K151** · The mode badge: one badge always shows (`src/ui/mode_badge.ts`: Free play, Daily #N, replay, practice) and free play's X fades in on hover. Calls K200. Done in df8929c..b9cf882 (2026-10-14, with K146).
- **K148** · An off-screen indicator for the player: the head is K73's third indicator client (`src/ui/head_indicator.ts`; a tap returns the camera to the head). Calls K198; idea K199. Done in 2afca1d..fcc402b (2026-10-14).
- **K149** · Room to pan the maze partly off screen at the fit zoom (`src/ui/view_clamp.ts`, `PAN_SLACK`). Calls K198. Done in 2afca1d..fcc402b (2026-10-14, with K148).
- **K180** · K104's tuning calls as params: pluckWhole (`pw`), pluckCrossings (`pcx`) and pluckGlow (`pgl`), codec v4 indices 101-103, daily-exempt; 0 px against master at the defaults. Calls K194; residual K196. Done in 048e06c..0250564 (2026-10-14).
- **K154** · Our own hash in place of PCG2D, whose credit goes: `src/render/hash2d.ts` (tests in `test/render/hash2d.test.ts`; GPU parity 0 of 524288 words off). The desktop cost is K190. Done in 64d3296..aaa3dda (2026-10-14).
- **K169** · Fade K127's gold web in over about 0.25 s: `src/render/web_fade.ts`, a smoothstep from the untraveled base to the gold one. Calls K191; probes that pin `paintClock`: K192. Done in 64d3296..aaa3dda (2026-10-14).
- **K140** · Finish confetti: a rain from the top plus a spray from the finish, render-only; `cf` and `cfa` at codec 99-100, daily-exempt. Calls K186; residuals K188, K189. Done in 99b7161..bb55c9a (2026-10-14).
- **K155** · A star rating for each finish: stars from the distance walked over the shortest route (three at 1.5x or less and never caught, two at 4x or less, one for any finish). Calls K184; the History rows' hover-only explanation K187. Done in 18c9a2e..edfb65f (2026-10-14).
- **K104** · Plucks you can see at a glance: a set-amount vibration of the whole segment with today's local lobes on top, a gentler collapse and its own reduced-motion version. Tuning calls went to K180, the cold-link stall to K185, residuals to K181. Done in 5d672ec (2026-10-14).
- **K183** · The phone was asleep and locked at 23:14 (2026-10-13); Levi left it awake and unlocked on its charger and K156 3c launched at about 00:56. Done (2026-10-14).
- **K152** · Leaner verification: one scripted phone pass per merge round (K156), small UI items without a perf lock or phone gate, render prototypes skipping the CPU mirror until a look is picked; the pins, sleep checks and GPU parity stay. Levi approved all of it; the Next intro carries it. Done (2026-10-14).
- **K171** · The phone pass's retry never wakes or unlocks the phone, so with the phone asleep it exits 3. Dropped: folded into K156 3c, which builds a read-only wait for the phone (Levi chose a pass that waits, 2026-10-14).
- **K81** · The traveled highlight at junctions: a smooth gold arc from the arrival arm to the departure arm (`src/render/junction_routes.ts`) and K127's fully traveled web (`docs/design/K81.md`). Residuals K166-K168, call K169. Done in 3c8433a (2026-10-13).
- **K127** · Fill a web with gold when every arm is traveled (K81's decision 4), built in K81's stage 3d. Done in 5d3170d (2026-10-13), with K81 (3c8433a).
- **K147** · A smooth intro on load: a per-frame physics budget (`src/physics/settle_budget.ts`) from the first visible frame to the first sleep, and the hidden pre-settle in chunks behind the loader (`stb`, `lds`; `docs/design/K147.md`). Calls K162; residuals K163-K165. Done in 97293e7 (2026-10-13).
- **K122** · Third-party license notices (K117): the build emits `licenses.html` from the packages the bundle really contains, the panel's credit line links to it, and the build and `npm test` fail on an unlicensed package; hand-written credits live in `notices/credits.ts` (`docs/design/K122.md`, `.claude/rules/notices.md`). Levi's calls on them: K154. Done in f0ef0e4 (2026-10-13).

- **K79** · Backgrounds: `backgroundSpeed` (`bgs`, max 8), vellum drift, the Motion setting (`src/ui/motion.ts`, K53), and per-effect params and custom colors as codec v4 appends 72-81 (`docs/design/K79.md`). Residuals K157-K159, idea K160. Done in 58b77cf (2026-10-13).
- **K110** · Join every piece of the maze to the start: one join per unreachable piece (a splice or a merge), else the exit moves to the next-nearest edge; the K87 pin was re-frozen. Done in b9038c7 (2026-10-13).
- **K129** · K79 stage B's two calls: the custom colors keep their proposed defaults, and the vellum scale's max drops from 3 to 2 (the fiber floor stays). Done in 281b22b and b2ccfaf (2026-10-13), with K79 stage B (58b77cf).
- **K121** · The player's disc hides the start of each move pulse (K98's call 4). Dropped: Levi keeps it as is (2026-10-13).
- **K86** · Long dead ends (Levi: "ensure longer dead end paths with no junctions"). Dropped: folded into K74 stage 1 (Levi's decision 5, 2026-10-13).
- **K105** · Scale a pluck's sympathetic lobes from the tapped lobe's capped amplitude (K77 finding). Dropped: folded into K104 (its goal 4), done in f883c75 (2026-10-13).
- **K49** · Kink eye size: Levi kept 2.6 widths over 2.8 (`.claude/probes/K49/`); the 2.8 one-liner stays on branch `worktree-agent-ac664e8a9e271757a` (4fa22e2). Decided, no change (2026-10-13).
- **K52** · Default background: Levi kept `vellum`, static at auto speed. Decided, no change (2026-10-13).
- **K94** · The mouse wheel still zooms on Levi's hardware, so the fractional-delta test in `src/main.ts` stays. Decided, no change (2026-10-13).
- **K109** · Every maze has a route from the start to the exit: a piece model (`planTailsJoined`) predicts the walk graph's verdict before surgery, and a plan whose tails do not meet is rebuilt with `repairTailRoute` (`test/core/maze_solvable.test.ts`). Follow-up K110. Done in b722a12 (2026-10-13).
- **K108** · Generation builds the same maze in every browser: only spec-exact operations plus `src/util/det_math.ts` (`hypot2` = V8's Math.hypot), guarded by `test/core/deterministic_math.test.ts` and `test/util/det_math.test.ts`. Follow-up K109. Done in b62cea3 (2026-10-13).

- **K87** · The maze plan's `pickFarthest` rescanned every candidate against every placed point; it now keeps a running minimum per candidate, pick-for-pick identical (CI pin `test/core/maze_plan_identity.test.ts`). Follow-up K108. Done in 62dd16d (2026-10-13).

- **K77** · Plucks showed sharp, wedge-like depressions: `roundCollapse` now opens the collapse depth with raised-cosine bumps, so the narrowed edge bends no tighter than 1 h. Follow-ups K104-K107. Done in eec4854 + 6e3f124 (2026-10-13).

- **K101** · Music mode timed its notes from the render tick, so onsets landed up to a frame late and the tempo stretched; notes are now scheduled 0.3 s ahead on the audio clock. Residual in K103. Done in e9e01ae (2026-10-13).
- **K83** · Placeholder marker icons: black discs with white stroked glyphs for the start, finish and head; the finish's off-screen indicator wears the same glyph. Follow-ups K98, K99. Done in 45aac50 + 5592f8c (2026-10-13).
- **K96** · The follow camera reaches the head at the same real speed at any frame rate (real elapsed time, substeps of at most 0.05 s). Follow-up K103. Done in d8b9175 (2026-10-13).
- **K99** · The fog of war lifts at fixed stations along a move's run, the same at any frame rate, move speed or mid-flight tap. Follow-up K100. Done in 0097801 (2026-10-13).
- **K73** · Levi's UI batch: pathViz labels, codec v4 (recentPath lights twice as far, trailLength 5 -> 10, dailies keep 5), the mode badge, and off-screen indicators (the finish points the way). Follow-ups K92, K94, K95, K96. Done in f917282, a99967e, 0772f63 and ce331bc (2026-10-13).
- **K75** · recentPath's yellow pulse banding: pulses now brighten the thread's own paint, and `pulseReach` ends the junction's pulse trains a set distance out (default 3). Follow-up K93. Done in 8b1ae7c and 59cba84 (2026-10-13).
- **K67** · G2's visible changes (`docs/design/G2_shader_paint.md` 3.8, plus the fan fix's one-strip-step edge ramps): signed off by Levi, no change needed. Done (2026-10-13).
- **K64** · Sleep window: Levi kept the recommended 2.5 sim-s, no change needed (K91 is the physics-off follow-up). Done (2026-10-13).
- **K58** · Reset path inside a daily stays a timed backtrack with one backtrack per retracted run (Levi); no change needed. Done (2026-10-13).

- **K48** · Desktop Share keeps copying to the clipboard (Levi); no change needed. Done (2026-10-13).
- **K53** · Reduced motion: Levi chose an in-app Motion setting (follow system / full / reduced, a viewer preference); built in K79. Done (2026-10-13).

- **K45** · CLAUDE.md slimmed from 2,250 lines (about 39k tokens) to about 240 (about 5k): history moved verbatim to `docs/history.md`, subsystem lore to path-scoped `.claude/rules/` files. Done in 436eb37 and 6866d4b (2026-10-12).

- **K4** · G2: per-sample color work runs in the shaders. Section colors, the reveal and its FX, and gameplay paint are evaluated per pixel from data textures (CPU mirror `src/render/paint_math.ts`), and junction fans read per-arm material strips (`src/render/arm_strip.ts`); record `docs/design/G2_shader_paint.md` section 7. Sign-off K67; G2.4 (GPU particles) is K23. Done in 72041df..a001b34 (2026-10-12).

- **K63** · The sleep gate counted 45 still frames, so every real settle slept at exactly sim 7.0; it now counts 2.5 simulated seconds of quiet (`src/physics/sleep_gate.ts`), on every device. K64 is the speed trade. Done in 66b4db5, ed53344 and 7f75e8f (2026-10-12).

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

- **K21** · Shader noise backgrounds: a `background` dropdown (none, vellum, mist, wash, silk, aurora, contours) and an intensity slider; screen-fixed, low-res and low-rate, and `none` is pixel-identical to master. Done in 66e80e9 (2026-10-12).

- **K41** · Since the kink eyes (9920fab), Levi's rect link and the fat link never slept: the capsule test now solves its closest points in 3D, the eye pressure follows a chord law (2.6 widths), ratchets intersect at every pass, and crossing coverage continues through fused joints (`test/physics/sleep.regression.test.ts`). Done in 0e98804 and cb73eb5 (2026-10-12).

  Results: both links asleep at sim 7.0-7.3, and frame cost at rest
  111-119 -> 5.0-7.5 ms. Browser sweeps 32/32 asleep and gesture battery
  48/48. Guarded by `test/physics/sleep.regression.test.ts`.

- **K19 + K20** · Maze stats (time, efficiency, junctions, dead ends) in
  the HUD and win banner, and a Wordle-style daily maze: `?daily`, Daily
  #1 = 2026-10-12, pinned by the frozen `DAILY_V1`, results and streaks
  in localStorage, emoji-grid share. Also: the last three MazeParams
  joined the codec, and the app now starts with storage blocked. Done in
  3b3e028 and 29b42a1 (2026-10-12). Probes: `.claude/probes/K19-K20/`.

