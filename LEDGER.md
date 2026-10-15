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

Next free ID: K382.

## Waiting on Levi

- **K339** · The settings panel's audit (merged dc4a1a7..2ee40a4): four
  calls, each recommended yes, in `docs/design/K339_panel_audit.md`
  ("Questions"; subfolder looks
  `.claude/probes/K339/sheet/K340_sheet.png`). Builds as K323's Stage A.
- **K261** · K74 stage 2's two calls, built as recommended (Levi may
  change either): the H-cut share is 1; a partial share cuts an even
  stride. `docs/design/K74.md` ("Calls for Levi").
- **K260** · The burn race's calls 2-4 (K114), built as recommended:
  Reset keeps the fire (fuse relit), the fire and the turn minotaur are
  exclusive, fog stays its own param. `docs/design/K114_burn.md` ("Calls
  for Levi").
- **K280** · The burn race's heat (K114): the built `fireSpeed` 0.75,
  `fireDelay` 0 is hot for careless players; its agent recommends r 0.6,
  h 0. `docs/design/K114_burn.md` ("R.6.1"); numbers
  `.claude/probes/K114/burn/results_tuning_rebased.md`.
- **K282** · The HUD's stats have no explanation during play (only the
  end banners explain them). Add an info button or a long press, or
  leave it (rec.)? `docs/design/K274_K277.md`.
- **K251** · A displaced edge indicator crosses the open phone panel in
  a 0.25 s slide (K198). Keep the slide, or fade the disc out and back
  in? `docs/design/K198.md` ("Stage 2 handoff"); sheet
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
- **K238** · K111 stage 1's four calls, for review: High contrast's
  look, the Accessibility folder first, "Reduced motion" driving Motion,
  OS reduced motion stilling the flow. `docs/design/K111.md` ("Stage 1
  handoff"); screenshots `.claude/probes/K111/out/`.
- **K229** · K92's badge row puts the open panel's top at 90 px (100 on
  phones, was 50). Accept it, or move the badge elsewhere while the
  panel is open? `.claude/probes/K92/out/phone_open.png`.
- **K225** · The markers' default size (K98): `markerSize` 1.08 is about
  5 CSS px on the phone and barely reads. Keep it, raise it, or add a
  minimum on-screen size? `.claude/probes/K98/sheet_k98.png`.
- **K90** · A physical minimum bend radius; stages 1a and 1b merged
  (6f97b92..feb12a0), flag off. Ship, tune or stop? Levi tests it live
  (`__knotSplineBend(true)`); rec.: stop. Record
  `docs/design/K90_bend_radius.md`, handoff `docs/design/K90.md`, sheet
  `.claude/probes/K90/out_1b/`; K213 first, never with K8.
- **K210** · Near launch: a daily is today's `PARAM_DEFAULTS` (K132), so
  a default change moves that day's maze. Re-pin the daily at launch, or
  accept it? `docs/design/K132.md`.
- **K194** · K180's calls: the defaults once played (crossings
  `through`, glow `off` as built, or `fallback`); call (2) is moot since
  K235. `docs/design/K180.md` ("Stage 1 handoff"); play
  https://levi.dev/knotmaze/?7&pw=1&pcx=ride&pgl=fallback. If fallback
  becomes a default, time `peakEstimate` on the Pixel.
- **K162** · K147's calls: the slow-motion first settle, the defaults
  (`settleBudget` 12 ms, `loadSettle` 0.45 s), daily-exempt, a drag
  budget. Levi plays first. `docs/design/K147.md`.
- **K184** · K155's star calls, built as noted: exactly two stars for
  greedy solves; catches cap a finish at two; "2.2× the shortest route",
  not a percent. `docs/design/K155.md` ("Stage 1 handoff").
- **K185** · The still pluck's cold-link stall (about 340 ms, first
  use): (a) accept it (rec.), (b) `KHR_parallel_shader_compile`, or (c)
  warm it at load? `docs/design/K104.md` ("Stage 1c handoff").
- **K186** · K140's confetti calls: reduced motion's slow spray or none;
  confetti on every win banner or only a live finish; the colors and
  amount. `docs/design/K140.md` ("Stage 1 handoff"); play
  https://levi.dev/knotmaze/?7 (`&cfa=3` for the most).
- **K323** · A Game folder with a `gameMode` dropdown
  (`docs/design/K323_game_mode.md`). Questions 2 and 5-8 taken as
  recommended; 1, 3, 4 are in K339's calls. Stage A (with K339's
  rebuild, codec 7) waits on them, K7 stage 3 and K76 2c.
- **K357** · Is the cusp gone? Open `?qoietk.KIiHgRRXwRlRt8fGrST4sf` on
  the live build and pluck at crossing 104 (K344's fix, 93d0e4d).
  Recommended: close it unless the cusp still shows.
- **K361** · G3/G4's calls (K8 stage 1; `G3G4_sdf_geometry.md` §6), none
  blocking G3-0. Recs: smin webs (sheet first), webs inset 1 px, accept the
  yarn taper, 2x until K22, drop `rp`/`jp` after the phone check; K90 by G3-2.
- **K362** · K76 2c's calls (`K76.md` "Stage 2c handoff"). Recs: the intro
  stays off by default; 2d widens the start view (at the 90 cap) to a ~2 x
  (revealDistance + 2) span. Called: the mode stays in the panel before the MAX fix.
- **K368** · High contrast's ripple (K289 e): rec ring under High contrast
  (`HIGH_CONTRAST_OVERRIDES`, `src/ui/accessibility.ts`); glint has little room
  on light threads over black. Inferred, not shot; fallback a stronger glint.
- **K377** · K5/K6's seven calls (`docs/design/K5_K6_split.md` 8), each with a
  rec: 30 fps rest cadence, idle probes, R lane before G3/G4 stages, K290 before
  R2/R5, CLAUDE.md lines, drift pause, `@internal ribbon`. None blocks M1.

## In progress

- **K114** · Gameplay round 2, designed in
  `docs/design/K80_gameplay_additions.md` section R: burn race, cut
  verb, beat rider, spider, Pluck Hero MVP. Levi took the recs (calls
  1-6, 8-10; call 7: a separate spider enemy, a no-spiders setting that
  swaps its icon). Burn stage 1 merged (`src/game/fire.ts`; calls K260,
  K280, residuals K281).
  - owner: nobody since 2026-10-14 16:35 (stage 1 merged; agent
    af79edbe2a4677ff5 of session d8031183, worktree kept)
  - branch: mainline; last commit: `ba6d574` (stage 1 is
    801c22b..ba6d574)
  - evidence: main checkout `.claude/probes/K114/burn/`
    (`results_rebased.md`, `results_tuning_rebased.md`, `burn_sim.ts`,
    `burn_page.mjs`)
  - next: stage 2, real-time burning behind `fireClock`, its brief
    written from stage 1's handoff (queue item 13); stage 3's look is a
    shader and carries K290's burnt toggle; the spider follows the
    minotaur's controls (K174)
  - brief: `docs/design/K114_burn.md` ("Stage 1 handoff"; stage 2's
    brief goes there)
- **K74** · Maze design, decided (Levi, 2026-10-13;
  `docs/design/K74_maze_design.md`): every mechanism gets params whose
  neutral value turns it off. Stage 1 (long-tail dead ends) and stage 2
  (H1, the fused arm cut; calls K261, residuals K278) merged; stage 3 is
  the trap-zone finish, stage 4 the greedy-trap search and K46's bands.
  - owner: nobody since 2026-10-14 16:13 (stage 2 merged; agent
    a2c61932e9e358104 of session d8031183, worktrees kept)
  - branch: mainline; last commit: `faa9a52` (stage 1 fbf5b5c..8ba0c32,
    stage 2 4d3efe6..faa9a52)
  - evidence: `.claude/probes/K74/` (stage 2 in `stage2/`, sheets in
    `out/`); the design agent's worktree
    `.claude/worktrees/agent-aeaf1e61bcecaaf0b` is kept
  - next: stage 3, the trap-zone finish, with H1 at 1 and measured on
    dailies 1-240, plus H1's exit-clearance guard (K278 (a)); dead-end
    branches as deeper traps are a later param, settled with K80's brief
  - brief: `docs/design/K74.md` ("Stage 2 handoff"; stage 3's brief goes
    there)
- **K80** · The minotaur, decided (Levi, 2026-10-13; design
  `docs/design/K80_gameplay_additions.md` section 0, his answers in
  `docs/design/levi_notes_2026-10-13.md`): a telegraphed hunter with
  guard and stalker variants, real time as its own mode, turn-aligned as
  a modifier. Real time merged (`5fed5c1`), turns stages 1 and 2 merged;
  residuals K293, per-model accuracy waits on Levi (K294).
  - owner: nobody since 2026-10-14 18:48 (turns stage 2 merged; agent
    a1579d5c460af2d20 of claude d8031183; earlier agents
    af5995f5900f0f945 and a9c90f15cd6a55710; worktrees kept)
  - branch: mainline; last commit: `02194b4` (turns 0047148..68524e1 and
    86d404e..02194b4, K174 ecf2169..6ec8275)
  - evidence: main checkout `.claude/probes/K80/` (`turns2/`, `turns/`,
    `rt/`) and `.claude/probes/K174/rt/`; the research's worktree
    `.claude/worktrees/agent-a25726c24f262b138`
  - next: stage 3's brief from stage 2's handoff ("For stage 3": final
    telegraph 2.7, catch feedback 2.8/K270, sound and fog 2.10, wait key
    and pad, hover cue, turn minoToward), K293, K294; before a daily
    pins a minotaur, waits enter `fc.taps` and K47's fingerprint covers
    its params; real time's phone check is K177
  - brief: `docs/design/K80_turns.md` ("The stages", "Stage 2 handoff");
    `docs/design/K80_realtime.md`; `docs/design/K80.md`
- **K156** · The round phone pass, `scripts/phone_pass.ps1` (K152 (1),
  from K81's gate kit): two builds run interleaved through a frame bench
  and a JSON looks list into a summary and sheets. Stages 3a-3c merged
  (6521bb2..de5f39e); rounds 2026-10-14, 14b and 14c are done (14c
  merged e6c6034..aa3cdd1).
  - owner: nobody since 2026-10-14 19:45 (round 14c's agent
    a04122e6bc4e56b02 (sonnet) finished; worktree kept)
  - branch: mainline; last commit: `aa3cdd1`
  - evidence: `.claude/probes/rounds/2026-10-14c-0e865bf/`,
    `.../2026-10-14-48da84d/`, `.../2026-10-14-81d31a5/`;
    `.claude/probes/K156/3c/`; the A/A in `.claude/probes/K253/aa3/`
  - next: the next phone window Levi lends: frames (`-Phase frames -Reps
    2` on K253's portrait floor; K300's `-Moves` fix waits for the next
    A/A), K307's phone measures, the finish frame rate under K317's
    confetti, K98 and K92 (K230), the 14 dropped looks (K233), K232's
    load cells at 3 reps; sweep the 3a/3b worktrees with
    `.claude/probes/K161/cleanup.ps1` (`-DryRun` first); looks cope with
    K301's width flip
  - brief: `docs/design/K156.md` ("Round 2026-10-14c handoff"; the next
    round gets its own section); K7 stage 5's phone plan is
    `docs/design/K7_worker.md` Design 10
  - env: none; the pass builds and serves both builds itself (ports
    5480-5489); check nobody is using the phone first (K234)
- **K161** · Disk: `$env:TEMP` held about 1100 `knotmaze-*` Chrome
  profiles (about 33 GB) that probe runs never delete, plus stale
  worktrees (C: had 19.6 GB free, 2026-10-14). Levi approved the cleanup
  (item 2): delete profiles older than a day, sweep stale worktrees,
  probe libraries delete their profile on exit (K150).
  - owner: claude session d8031183 (the coordinator), a background
    cleanup script under the perf lock
  - branch: mainline (no code); last commit: n/a
  - evidence: `.claude/probes/K161/cleanup.ps1` (`-DryRun` first) and
    `cleanup.log`; the 2026-10-14 01:17 run swept the five merged
    worktrees
  - next: run `cleanup.ps1` again for the profiles (it was due after
    16:20 on 10-14, none was a day old at 01:17); the libraries'
    delete-on-exit goes with K150
- **K76** · Thread-reveal mode, stage 2 (Levi, 2026-10-13): `exploration`
  (off | fog | threads) and an end look, a separate shader variant. 2a-2c
  merged, so the mode is in the panel (off by default); 2d after K268 s2, K290.
  - owner: nobody since 2026-10-15 01:08 (stage 2c done; agent `a58040d5b7b031c80` of claude session d8031183; worktrees kept: 2c's, 2b `ac6e354b85922e7aa`, 2a `a5d63452980ed9fa3`, stage 1 `aea102de995e1ce30`)
  - branch: mainline; last commit: `82c1f23` (2c is `e6e151d..82c1f23`)
  - evidence: `.claude/probes/K76/stage2c/` (2a's and 2b's beside it); lore `render-explore.md`
  - next: stage 2d ("For stage 2d": High contrast dots, the census on K268's shaped slots, the held frame, step 8's phone gate and GPU, the final sheets) after K268 s2 and K290; Levi's calls are K362
  - brief: `docs/design/K76.md`, "Stage 2c handoff"; design `docs/design/K76_reveal_mode.md`
- **K268** · Shaped crossing gaps under thread reveal (K76; Levi, 2026-10-14):
  no gap until the over thread is seen, a dynamic gap for a stub's overlap and
  dead ends. Stages 1-2 merged (stage 2: 189b024..f799991; MAX fixed, joints fade).
  - owner: nobody since 2026-10-15 02:42 (stage 2 done, item 4 not started; agent `a42c63c2db0401edb` of claude session d8031183; worktrees kept: stage 2's, stage 1's `ab65d913a3b9a3dcb`)
  - branch: mainline; last commit: `f799991`
  - evidence: `.claude/probes/K268/stage2/` (probes, `run_batch2.ps1` to `run_batch5.ps1`, `out/`, builds); stage 1's beside it
  - next: stage 3: the census fixes first (`census.mjs`: judge shaped slots by S/R/F, skip rather than fail when no crossing shows both threads, a fading joint scales by vis; attribute junctions 56-58 and 161, which mismatch on master too), then item 4 a part at a time (protect, the far-branch smooth-min, underWindows: a crop for Levi before building the clip); never alongside K290 (both edit `gap_mask.ts`, `explore_glsl.ts`)
  - brief: `docs/design/K268.md`, "Stage 2 handoff" ("For the next stage")
- **K7** · Physics in a Web Worker with render-side interpolation (K28; Levi's
  calls K302). Stages 1-5 merged (stage 5: 3e6b7c5..988be6a, the start gate and the phone
  pass, which missed only the 250 ms gate). Call F6: the default anyway.
  - owner: agent `a6023a3244ff623cc` (sonnet) of claude session d8031183, stage 6 (the flip) from 03:49 (cap 04:49; ports 5850-5859); stage 5's worktree `adf244f47f53e8230` kept
  - branch: `worktree-agent-a6023a3244ff623cc` (`.claude/worktrees/agent-a6023a3244ff623cc`, from `8b3b401`); last commit: `8b3b401` (master) until its first WIP commit
  - evidence: `.claude/probes/K7/` (`stage5/`: the phone tooling, `s5_gate.txt`, `run_s5.ps1`, `table_s5.mjs`; `stage4/`, `stage3/`)
  - next: stage 6 (sonnet): `phw` on by default, its pins and lore, the 21 shared probe libraries ported (K374); then K5 M1; then stage 7 (opus; after M1, since both edit main.ts's boot): the start-gate lever (params and tuning in the Worker's `name`, main adopts gen 0), the phone pass again and the spike page `?d=gs18`
  - brief: `docs/design/K7_worker.md`, "Stage 6 brief: the flip (call F6)"; stage 7 from "Stage 5 handoff" ("For the next stage")
  - env: the phone: `.claude/probes/K7/stage5/phone_setup.ps1` and `phone_teardown.ps1`, under the phone lock
- **K307** · The daily intro's freezes are cold shader compiles (Levi, K302 (8):
  prioritize). K7 s4's trace: GPU compile waits (bg-vellum's 190 ms queued behind
  12-15 small links); the worker can't hide them. Stage 2: the warm-up.
  - owner: agent `a11d7ce60428b687d` (opus) of claude session d8031183, stage 2 from 03:55 (cap 05:55; ports 5830-5839)
  - branch: `worktree-agent-a11d7ce60428b687d` (`.claude/worktrees/agent-a11d7ce60428b687d`, from `97d7c31`); last commit: `97d7c31` (master) until its first WIP commit
  - evidence: `.claude/probes/K307/` (`trace_intro.mjs`, traces, `builds/`, patches; the local branch `k307-proto` (51f7480) holds throwaway prototypes, never merged); K7 s4's traces in `.claude/probes/K7/stage4/k307/`; lore `.claude/rules/render-shaders.md`; stage 2's in its worktree's `.claude/probes/K307/stage2/`
  - next: stage 2: `program_registry.ts`, `shader_warmup.ts`, `__knotWarmup()`, a 15 s gate on `finishPresettle`, wave 1 then wave 2; K366 and K268 s2's three explore variants ride it, K290's variants follow; the phone's measures ride K156's next pass
  - brief: `docs/design/K307_intro_freezes.md` ("Stage 2: the warm-up", "Stage 1 handoff", "Stage 2 launch notes")
- **K8** · G3: SDF ribbons drawn from one shared sample texture
  (`docs/design/G3G4_sdf_geometry.md`). G3-0 merged (b3917ca..f6d10e3): the four G3
  tables, capture/restore, `scripts/bench_frame.mjs`; no visual change.
  - owner: nobody since 2026-10-15 03:50 (G3-0 done; agent `af653fa7f942f2f1e` of claude session d8031183, worktree kept)
  - branch: mainline; last commit: `f6d10e3`
  - evidence: `.claude/probes/K8/stage2/` (`notes.md`, `g3_probe.mjs`, `batch3.ps1`-`batch6.ps1`, `phone6.ps1`, results); stage 1's `.claude/probes/K8/stage1/notes.md`
  - next: the phone's dense bench again at rest (`phone6.ps1`, its 30000 ms rest raised to 90000); then G3-1 after K290 (R1-R2 first if Levi takes K377 q3); G3-1's textures must fit the Pixel's 8192 max; check capture/restore under the worker (default from K7 s6); Levi's calls: K361
  - brief: `docs/design/K8_stage1.md` (its stage 2 handoff, at the end); G3-1 still needs a brief, from `docs/design/G3G4_sdf_geometry.md`
- **K5** · Split `main.ts` and `ribbon_renderer.ts` along K1-K3's data lines,
  with seams so G3 becomes a module swap; K6 rides it. Design merged:
  `docs/design/K5_K6_split.md` (its calls: K377).
  - owner: nobody since 2026-10-15 03:14 (design done and merged; agent `aa60ed52201f75682` of claude session d8031183, worktree kept)
  - branch: mainline; last commit: `4931204`
  - evidence: `.claude/probes/K5/design/` (eight region maps of main.ts and ribbon_renderer.ts)
  - next: stage M1 once K7 stage 5 merges (re-map main.ts first), then section 5's stages: M1-M8, and R1-R5 (R1 after G3-0 merges); section 6 orders them against the queue
  - brief: `docs/design/K5_K6_split.md`, "7. Stage 1 brief"
- **K290** · Burnt threads, a toggle (Levi, 2026-10-14): a `burnt` dropdown,
  gone (default: not drawn, under threads' gaps close, fans drop the arm) or
  char (a burnt coloring in the shader). Burn stage 3a; 3b is the front's FX.
  - owner: agent `adb9f09e19dfd0c55` (opus) of claude session d8031183, stage 3a from 03:27 (cap 05:27; ports 5820-5829)
  - branch: `worktree-agent-adb9f09e19dfd0c55` (`.claude/worktrees/agent-adb9f09e19dfd0c55`, from `f799991`); last commit: `f799991` (master) until its first WIP commit
  - evidence: its worktree's `.claude/probes/K290/stage3a/`; burn stage 1's `.claude/probes/K114/`
  - next: stage 3a: the param, gone through the explore VIS machinery reversed, char in the shader, a desktop sheet of both looks; then 3b (the front's char band and embers, the `burn` FX on `tipsAt`, the fuse, the fire's light under fog, the phone sheet)
  - brief: `docs/design/K114_burn.md`, "The stages" (Stage 3) and "Stage 1 handoff"; the stage 3a handoff once written

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
- Usage: agents aren't held back until the week reaches 97% (it resets
  Mondays about 12:00).

Running agents are listed under In progress. The order for the next
free slots (Levi, 2026-10-14 23:00-23:55):
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

Every other item below waits on the trigger it names.

- **K345** · The hover rim stops `rimGap` (0.975 world) short of junctions;
  Levi (2026-10-14) wants it to follow the fillets. Goes in K9's G4-1 (K8
  s1: piece SDFs give webs an across coordinate; fan work now is wasted).
- **K294** · Per-model minotaur tuning for K80 turns stage 3 (Levi,
  2026-10-14: "Yes."): hunter, guard and stalker share sight and
  accuracy, so the hunter's retune moved the others (stalker 20% to 1%).
  Give each its own defaults, tuned to section 0's rates.
  `docs/design/K80_turns.md` ("Stage 2 handoff": Calls, the table under
  Verification).
- **K284** · Credit K74's sources (K277):
  `docs/design/K74_maze_design.md` builds on Pullen (*Think Labyrinth*)
  and Zhao and Marquez 2013 (arXiv:1307.5713), but `src/` names neither,
  and a `RESEARCH` entry needs a file that carries its mark. K74 stage 3
  adds a comment naming each where the code follows it, then the
  entries.
- **K240** · High contrast for the DOM chrome (K111 follow-up): a CSS
  layer on `:root[data-contrast="high"]` (already set) for the panel,
  HUD and badge, whose styles are TS-injected strings. Small; after
  K238's review.
- **K137** · K80 section 4's cheap (S, S-M) mechanisms, each behind a
  toggle (Levi, 2026-10-13), after the minotaur: 4.3, 4.7, 4.9, 4.10,
  4.13-4.17, 4.21 (after K85), 4.26, 4.28-4.30, 4.32-4.34, plus Levi's
  sleeper variant (an enemy appears at a junction a turn or two after
  you leave it, then follows you). The M ones are K138, the M-L and L
  ones K141. `docs/design/K80_gameplay_additions.md` section 4.
- **K138** · K80 section 4's M mechanisms, each behind a toggle (Levi,
  2026-10-13: "Let's do all the M items",
  `docs/design/levi_notes_2026-10-13.md`), after K137: 4.1, 4.2, 4.4
  (then 4.5), 4.6 (simulate first), 4.11, 4.12, 4.18-4.20, 4.23, 4.24,
  4.27, 4.31. Those that change generation (4.1, 4.2, 4.4, 4.11, 4.24,
  4.31) need a solvability check. The M-L and L ones are K141.
- **K139** · Collapse mode (Levi, 2026-10-13,
  `docs/design/levi_notes_2026-10-13.md`): no backtracking, each run
  collapses behind you; collapse as much as you can and still reach the
  finish (variant: without it). Param `collapse` (off | finish | free);
  rides on 4.3's snap (`fragile`, K137) and R.3.4's longest thread
  (`docs/design/K80_gameplay_additions.md`); par by depth-first search
  at generation (time it on the phone). S-M after 4.3.
- **K46** · Daily variety (Levi, 2026-10-12): no weekly arc; THEMES,
  each a set of parameter constraints; manual per-day overrides later
  (K82). Proposal `docs/design/K46_daily_variety.md` (8b1eb90), brief
  `docs/design/K46.md`, probes `.claude/probes/K46/` (the proposal
  agent's worktree `.claude/worktrees/agent-a78c73cec4770a14d` is kept).
  Validation uses engine-exact math only (K108); memory-trail themes set
  trailLength 5 (K73).
- **K78** · The Knotmaze handbook: algorithms, architecture, decisions
  and a per-param reference with figures; write it once the churn
  settles. Public Markdown, later also on Levi's Blogger devlog, so
  figures are standalone images and the text has no repo links or
  internal IDs (Levi, 2026-10-13). `docs/design/K78_handbook_plan.md`.

- **K297** · A pared-down panel for most players (Levi, 2026-10-14):
  most rows move behind an advanced view and a short set stays in front.
  Which rows, and how the advanced view opens, come after the churn;
  K292's marks and K84 / K57 feed it.
- **K340** · Nested folders that look distinct from their parents (Levi,
  2026-10-14). Looks are prototyped in K339's stage
  (`docs/design/K339_panel_audit.md` section 5, its sheet); the audit
  recommends look F (K339 call 3). Once Levi picks, build its CSS first
  and check it under High contrast; built with K339's rebuild.
- **K341** · The second panel audit, once the design iteration is done
  (Levi, 2026-10-14): rerun K339's inventory
  (`scripts/panel_inventory.ts`, table `docs/design/K339_inventory.md`)
  and checklist, then feed K297's pared-down set
  (`docs/design/K339_panel_audit.md`, item 8). Optionally teach the
  script to flag dead rows and cut-off labels.
- **K6** · One frame loop driven by what-changed flags
  (`docs/design/K5_K6_split.md`, 4 and 5.4): K6-1, shadow flags, after M3;
  K6-2 (skip CPU work) and K6-3 (= K24, skip the draw) after M6.
- **K9** · G4: smooth-union SDF junction webs (cuspRadius = blend
  radius); A/B crops at cr 1, 3, 6 before the fans are deleted. Also
  closes G1's x160 leftover (a faint tick at a wedge flank, merge-core
  hairline dashes at 4-way merges; `.claude/rules/render-gaps.md`), and
  the webs carry the traveled route as the smooth union of the traveled
  pieces only (K81).
- **K115** · Cursive text and shapes, decided (Levi, 2026-10-13;
  `docs/design/K115_cursive_text.md`, ded57f7; answers in
  `docs/design/levi_notes_2026-10-13.md`): Hershey Script Simplex,
  capitals via generated connectors then hand-made joins, a
  junction+spur where a join meets a letter's body (a real dead end),
  text in the link token (a codec string type); no stage 1a legibility
  test. Next: the builder's stage 1 brief. K122: set `shipped: true` on
  `hershey-fonts` in `notices/credits.ts` in the commit that adds the
  Hershey data. Evidence `.claude/probes/K115/`.
- **K116** · Alternate pluck instruments and accompaniment, lowest
  priority (Levi, 2026-10-13; `docs/design/K116_instruments.md`,
  2e60b00; calls in `docs/design/levi_notes_2026-10-13.md`): first the
  band skeleton, a drone and bass, four `pluckVoice` presets, then
  marimba and bells; band on by default, 10-14 dB under the pluck;
  samples deferred. Params `pvc`, `acc`, `acl` are daily-exempt; first a
  Pixel 11 audio-CPU probe; the loop length is K125.
- **K144** · Accounts and shared stats, a stretch goal after everything
  else (Levi, 2026-10-13, `docs/design/levi_notes_2026-10-13.md`): OAuth
  login, stats across devices, an opt-in share, percentile bands per
  metric and level, silent cheap anti-cheat (the server replays a
  submitted walk via K108 and K47). Backends: Cloudflare Workers + D1 or
  the SnoringCat platform (Nakama). Next: a design doc.
- **K10** · Phone benchmark after every stage (Pixel 11, Chrome 154;
  baseline 2026-10-11: 30 fps at rest with defaults, 51 with `fw=0`; K79
  stage A passed at 60). Rerun: `scripts/preview.ps1` per ref,
  `scripts/phone.ps1 -Ports ...`, `.claude/probes/K10/phone_bench.mjs`,
  with the knot asleep, the phone unlocked and cool (`dumpsys
  thermalservice` status 0). Numbers in
  `.claude/probes/K10/bench_*.txt`.

  Rerun after every stage: `scripts/preview.ps1` builds per ref,
  `scripts/phone.ps1 -Ports ...`, then `.claude/probes/K10/phone_bench.mjs`.
  The phone must be unlocked and awake. It heats up under back-to-back
  runs (light throttling at 39 C skin, on its charger), which lowers
  flow-on fps for every build alike: check `adb shell dumpsys
  thermalservice` (status 0) and park the tab between runs
  (`.claude/probes/K4/phone_blank.mjs`). Vsync-capped fps cannot show the
  headroom left; a load-amplified bench (a higher render resolution)
  would.
- **K292** · Mark the panel's personal settings (Levi, 2026-10-14):
  every row stays in its concept's folder; the MAZE rows carry a subtle
  dog-ear triangle in the top-right corner, explained by a key at the
  panel's top and the row tooltip, while personal settings
  (`DAILY_EXEMPT_KEYS`, localStorage prefs) stay unmarked. A sheet for
  Levi: size and color, all maze rows against only rows changed from the
  link or daily. After K298 or in its own module; replaces K84's
  section; K57 settles edge cases; leads to K297.
- **K265** · High contrast's own highlight, built by K111 stage 5 (Levi,
  2026-10-14; confirmed 22:32): a white rim on both edges with the
  thread's own color between (about 0.35 of the half-width), a hard
  inner edge, steady. Looks 1-3 go with `hcl` and `__knotHcLook`; the
  run's ends hard or with K298's end fade, on a sheet for Levi; width
  default 0.85 and range 0.3-1 stay (unanswered). After K298, never
  beside K298, K299, K76 2c or K268 stage 2. `docs/design/K111.md`
  ("Levi's pick", "For stage 5"); the three old looks
  `.claude/probes/K111/stage4/sheet/`.
- **K309** · Check K299's ring-lap fix on the phone: PowerVR rounds
  float division its own way, and only the desktop GPU was checked. In
  K156's next round: Levi's link `?qoietk.KSIeBoGlf4-` at node_2 and the
  seam cases of K299's A/B. `docs/design/K299_choice_pulse_bug.md` ("Not
  done").
- **K312** · Add K299's lesson to claude-config `rules/lessons.md`
  (WebGL): GPU float division is approximate (ANGLE D3D11 gave
  `floor(k*n/n)` = k-1 in 3275 of 16384 pairs), so ring and lap math
  must be integer-corrected. Held while Levi is away (claude-config
  edits wait for his approval).
- **K313** · A loader that looks like the maze (Levi, 2026-10-14,
  approved "sgtm", "Trail should be a fixed length"): a trefoil maze
  with over/under gaps, fixed head and trail, drawn by a tiny
  OffscreenCanvas worker inlined in `index.html` (a static SVG trefoil
  from first paint; today's CSS trefoil is the fallback). Follows K307's
  warm-up; measure the phone's first frame and the frames through the
  freezes. `docs/design/K313_loader.md`.
- **K324** · The real-time minotaur, more alive and more tunable (Levi,
  2026-10-14): a real-time telegraph, a short seeded pause at every
  junction (hunting included), many labeled knobs in K323's Game folder.
  Designed with K323's (`docs/design/K324_realtime_minotaur.md`,
  091e4dc); Levi took section 7's recs (D3: it speeds up to keep catch
  rates; D9 chevrons wait for stage 2). Stage 1 (the sim) follows K323
  stage 1; stage 2 (render) follows stage 1, K7 stage 2, K307 stage 2
  and K329, and checks K270's band; stage 3 (guard, stalker) follows
  stage 1; LOSE_MARGIN and ROAM_MIN become knobs with K294. Relates to
  K245, K247, K271, K293, K296.
- **K326** · Remove knot mode (`mazeFabric`, `mf=0`) entirely (Levi,
  2026-10-14). Stages in K323's design (`docs/design/K323_game_mode.md`
  sections 4-5): A freezes a maze golden (after K7 stage 2); B deletes
  knot mode (after K323 stage 1, stage A, K7 stage 2, K307 stage 2,
  K329) and retargets the tracked knot cells (`scripts/fold_census.*`,
  the phone pass); optional C reworks the knot paint path (after B and
  K111 stage 5). The golden `test/physics/byte_identity.test.ts` moves
  to a maze design.
- **K327** · Labels that say what they size (Levi, 2026-10-14):
  `indicatorSize` (edge arrows, a viewer preference) and `markerSize`
  (maze icons) sound the same; proposed "Edge arrow size" and "Maze icon
  size". Touch & feel also mixes words with camelCase keys. In K323's
  design; relates to K247, K292, K297.
- **K328** · Hover rim profile (Levi, 10-14): an opaque outer band, then a
  fade from further in; High contrast reuses it at fade 0. Paint library
  only (K8 s1), with K111 s5 and K265; and hide the glow at strength 0 (K298).
- **K332** · Arrow-key hints (Levi, 2026-10-14): a small key icon (or
  chord, K333) near the start of each choice, shown only once an arrow
  key was pressed this session (a module flag, not localStorage). The
  stage after K329. Hooks: `keyMap` / `chordMap` in `key_moves.ts`,
  K83's `MarkerMesh` and `marker_glyphs.ts` at KEY_REACH, refresh in
  `keyStep` / `stepWaiting`.
- **K331** · Touch gets K298's pick margins (Levi, 2026-10-14: "yes and
  yes."): touch moves from world-unit radii to the mouse's form
  (half-width plus a px margin, times `pickChoiceRatio` on a choice)
  with its own margin row beside `pickMargin` at about 4 px, so zones
  stop growing under a pinch zoom. Built with K330 after K329
  (`docs/design/K298_hover_glow.md`, "Notes").
- **K321** · The credits page (Levi, 2026-10-14; "Proceed, with my above
  notes"): the page and the panel's link become Credits
  (`credits.html`): "Created by Levi Lindsey", "(c) 2026 Snoring Cat
  LLC. All rights reserved.", his art, icon and music credits (to come),
  then "Built with Claude Code" (not prominent, linked like the others),
  then techniques, licenses, research. A small sonnet stage:
  `docs/design/K321_credits.md`.
- **K318** · Win effects (Levi, 2026-10-14): one show in many themes, a
  runner with momentum replaying the walk, lighting the path, popping
  each junction, blasting the finish. Levi: prototype all thirteen
  themes and every layer behind a Win effects folder (a Theme dropdown
  with Random, Party the default, conditional rows), in twelve stages
  one at a time. Stage 1 (the show and Party) follows the confetti stage
  and K111 stage 5. `docs/design/K318_win_effects.md` ("Build stages").
- **K336** · Side cannons (Levi, 2026-10-14): at the finish, blasts of
  confetti and streamers from points just off the left and right edges,
  fired inward and up, falling in arcs. Designed with K335, K337
  (`docs/design/K335_confetti.md`); deferred to after the other tasks
  (Levi, 23:00). Model-only draft `docs/design/K336_K337_draft.patch`
  (applies on K335's merge); still to do: tests, view, panel rows, codec
  entries (`cfc`/`cfn`/`cfs`/`cfh`/`cff`), reduced motion, sheets, frame
  A/B; the phone's fps rides K156's next pass.
- **K337** · Confetti shine (Levi, 2026-10-14): each piece's spin and
  flip give it a 3D normal lit by one upper-left directional light, a
  diffuse term plus a Blinn-Phong flash, computed on the CPU into the
  tint (no new shader); reduced motion keeps the diffuse term. Designed
  with K335, K336 (`docs/design/K335_confetti.md`); deferred with K336,
  its draft is in K336's patch.
- **K365** · K279's phone round: run the fixed `k279_phone.mjs`, pick the
  ripple's CSS floor (56 or 68; rec 56 unless it reads small), and only if the
  phone drops frames, a bbox replay (K279.md "Stage 2 handoff").
- **K366** · With K307 stage 2 (K279 s2): move the ripple's `warm()` onto the
  program registry, and take the first-tap residual: one 35-54 ms frame among
  tap 1's first five, on both builds, ripple or not.
- **K370** · Worker input latency, p50 (target 50 ms): desktop 105 on the daily,
  70 on the knot (in-thread 285; K7 s4); phone 231, first motion 173 (in-thread
  872; K7 s5). Measure each stage first (`k7_latency.mjs`); levers: newest snapshot while grabbed, more drag substeps.
- **K373** · Two cheap boot fixes from K7 s4's trace: the `safeAreaInsets`
  forced layout (`offscreen_indicators.ts` 797-809, ~35 ms) and `formatDayDate`
  (`daily_calendar.ts:75`, ~8 ms). Rec: do both.
- **K376** · Look at the reveal's intro close-in, joints now fading with their
  arms (K268 s2, desktop only so far), on the desktop and the phone; fix any of
  the stage's four small residuals that show (`docs/design/K268.md`, "Stage 2 handoff").

## Residuals (known, not fixed)

- **K270** · After a turn-aligned catch, a lavender band shows at the
  catch site in the next frame (K80 turns stage 1; undiagnosed, probably
  a fade). `.claude/probes/K80/turns/shots/`. K80 turns stage 3.
- **K271** · The turn telegraph is unchecked under K76's thread reveal:
  `syncMinotaur` hides the minotaur until `revealQuery` >= 0.98, but its
  line may still draw over hidden thread. For K76 2c (K257 (2)).
- **K266** · The hover rim's short-run limits (K248): runs shorter than
  2 x rimGap (1.95 world at defaults) never glow, and a short run whose
  lit window sits under a crossing's over thread shows nothing (run
  187). `census_rim.mjs`'s open-chain terminal sample (k = 235) reads a
  probe triangle on both builds. `docs/design/K111.md` ("Stage 3
  handoff").
- **K267** · Stale highlight-mode mentions after K248: `highlightMode`
  in `docs/design/` (K76, K76_reveal_mode, K174, K193, K198,
  levi_notes_2026-10-13), and the rules files' historical `.J` v4 probe
  links (gameplay-motion, probes-phone, render-pluck, probes.md's K80
  bullet), which load with a warning; the design docs' play links (K174,
  K180, K198, brief templates) are v4 too.
- **K263** · `minotaur.ts` exports `undoAllowed`, but nothing in `src`
  calls it and no move undo exists, while `docs/design/K80_turns.md`
  step 2 cites it as real time's behavior. Delete it, or wire it when an
  undo lands (found 2026-10-14 by the burn-race brief's docs agent).
- **K262** · Two probe harnesses K132 (41e81b5) broke, both untracked in
  the main checkout: K80's research harness (`.claude/probes/K80/lib.ts`
  `designParams` calls the removed `codecDefaults(3)`; fix with
  `paramsFromValues(seed, {...})` as in
  `.claude/probes/K174/rt/rt_lib.ts`) and K100's
  `vite.fogdaily.config.ts` (patches the removed `DAILY_V1`; set
  `fogOfWar` in the design instead). The burn race's agent fixes its own
  copy of the first (`docs/design/K114_burn.md`).
- **K258** · K76 stage 2a's residuals: (a) in flight, the piece
  re-declares the KPAINT items every frame and the per-slot refs shift
  (check `lastPaintUpload` in 2d); (b) for 0.45 s after each arrival the
  growth re-declares every frame; (c) the model is probe-only until 2c
  feeds it from move events. `docs/design/K76.md` ("Stage 2a handoff",
  "Residuals").
- **K276** · K76 stage 2b's residuals: (a) a visited END at growth 0
  shows nothing at its tip (the game never produces that state); (b) the
  census clips a fixed window per crossing and may miss a long shallow
  gap's far end; (c) the ten-move census covered only two moves' ground
  (2c's walks somewhere new); (d) its mode-off-again failure (77% of the
  frame) is unexplained and did not reproduce (lead: the backdrop
  changing under load); (e) mode-on strip cost 0.082 ms against 0.066
  and 2b's fans 0.58 against 0.55, uninvestigated. `docs/design/K76.md`
  ("Stage 2b handoff", "Residuals").
- **K278** · K74 stage 2's residuals: (a) H1 ignores the exit clearance
  (dailies 1-80: 36 new junctions inside the 12 u radius, 23 more turn
  plain); guard it with stage 3's corridor guard; (b) the pass costs a
  median 8.9 ms (max 13.5) at gs 18, about +30% on generation
  (per-strand caches, a node -> strand map); (d) most skipped cuts hit a
  host self-crossing or a same-strand splice, so dense heart and ring
  designs cut no bridges (a lever for stage 3 or 4); (e) H1 can shorten
  the optimal route (tree `1l6e`, 89.6 -> 78.3); (f) 494f2fe's message
  says codec index 108, it is 117; (c) is done (86d404e..02194b4).
  `docs/design/K74.md` ("Stage 2 handoff").
- **K285** · Citation details K277 left out until a record confirms
  them: Jakobsen's venue, Müller et al.'s volume and pages, Jaffe and
  Smith's pages, the Elias DOI and the editor of Perlin's course notes.
  `docs/design/K274_K277.md` ("Stage 1 handoff").
- **K281** · The burn race's stage 1 residuals (K114): (a) `drawFire`
  costs about 2.5 ms a frame on the desktop (11 ms at 4x throttle) once
  all is burnt; (b) it ignores K76's thread reveal; (c) the char stroke
  draws over crossing gaps ((a)-(c) go with stage 3's shader look); (d)
  `runPoints` is approximate on mixed diagonal runs; (e) at h 0 the
  HUD's fire lead reads 0 until the first move; (f) a backtrack right
  after a move is refused as smouldering, with odd toast wording; (g) a
  link setting both fire and minotaur silently plays the minotaur; (h)
  c014a83's subject says codec 117-119 (it is 118-120).
  `docs/design/K114_burn.md` ("Stage 1 handoff").
- **K254** · K193 stage 1's residuals in the phone pass: (a) the looks
  phase is unexercised with the new code (`shotViewport`,
  `report.viewport`, `emu`, `shotStats`): run a desktop `-Dry -Looks
  scripts/phone_pass/looks.example.json` and check `looks_report.json`
  and the sheet; (b) the docked-landscape case is unverified (one
  `-Viewport portrait` pass from a docked phone); (c) `-Phase check`
  counts an awake, unlocked phone as ready with another app in front or
  a person using it: also require the launcher or Chrome in front and a
  quiet touchscreen for a few seconds. `docs/design/K193.md` ("Stage 1
  handoff").
- **K252** · K198 stage 2's residuals: (a) `RANGE_EASE` is still a
  per-frame ease (0.15 a frame) for a resize and the fit's drift, so
  those settle faster at higher frame rates; (b) the head's 0.45 s show
  delay rests on five measured blips, the longest 0.33 s, and K156's
  next phone pass can check more. `docs/design/K198.md` ("Stage 2
  handoff").
- **K246** · K174's residuals (`docs/design/K174.md`, "Stage 1
  handoff"): pace links aren't clamped (an old `mhp=25` now means 25x
  the player's pace); the K80 rt probes in the main checkout
  (`.claude/probes/K80/rt/`) lack K132's `rt_lib.ts` fix and
  `rt_chase.mjs` puts its Chrome profile in OS temp (fixed only in
  `.claude/probes/K174/rt/`); at desktop width the panel's label column
  clips the `mino*` keys.
- **K243** · A paused page with the instant intro draws no threads at
  load (`?b.J&am=instant&fw=0&sp=0`, 393k px off a refreshed frame; same
  on master): `beginSettle()`'s instant branch shows the root without an
  `update()`, and a paused page never runs the awake step. Likely fix:
  `handRendererLook(); renderer.update(); fabric.update(...)` in that
  branch, after a physics-on pinned-frame A/B.
  `docs/design/K235_K239.md` ("Stage 1 handoff");
  `.claude/probes/K235/k239_paused.mjs`.
- **K242** · K191's residuals (`docs/design/K154_K169.md`, "Stage 2
  handoff"): the fan program's GPU cost during fades and stage 1's phone
  hash cost are unmeasured; the tap-time fade-out and a full web
  restored on load are unit-tested only; the knot and fog A/B against
  stage 1 was not rerun (byte identity covers it).
- **K236** · K145's hover glow, now K248's rim: a pluck's overlay hides
  it on the plucked run (`pluckColor` composes one color per arc with no
  across coordinate; the fix needs an across varying in the overlay
  strip and an across-aware compose in the mirror). Its other gaps are
  settled (webs never glowing is now the design; the short-run fade and
  view 5 landed in 3321592). `docs/design/K111.md` ("Stage 3 handoff"),
  `docs/design/K93_K145.md`.
- **K234** · `scripts/phone_pass.ps1`'s `-Phase check` and `-WaitReady`
  treat a phone in use as ready: round 2026-10-14b's agent saw Gmail in
  front and waited by hand for 120 s without user activity (`dumpsys
  power` activity ages); the check should do the same.
  `docs/design/K156.md` ("Round 2026-10-14b handoff").
- **K232** · Round 2026-10-14b's pass (K156) found two borderline worse
  cells in the default link's load (`?b.J`, base 54a2b43 vs head
  48da84d): p95 33.4 -> 50.0 ms and first sleep 18.4 -> 19.6 s, from 2
  reps on a hot phone in portrait against the landscape floor. Rerun
  with 3 reps once the floor matches the orientation (K193, K195); K197
  is the morning's load shift
  (`.claude/probes/rounds/2026-10-14-48da84d/pass/summary.md`).
- **K230** · K92 did not check the badge's last fit level (the bare icon
  below the hamburger) with the panel open; its phone checks were
  desktop emulation, so K156's next phone pass covers K92
  (`gameplay-badge.md`). No phone look reaches the badge's fit levels at
  411 px: check them in an emulated narrower viewport.
- **K228** · A choice's hover stays lit after the mouse leaves the canvas
  (`src/main.ts`; seen by K145's agent, whose glow clears there).
- **K226** · K98's spider glyph and role have no mesh (`MeshRole` excludes
  it in `src/render/marker_glyphs.ts`) until K114's call 7 decides what
  the spider marks.
- **K223** · Tooling after K198: K149's
  `.claude/probes/K148_K149/probe.mjs slack` checks the old 0.3-screen
  rule and fails by design (`.claude/probes/K198/pan.mjs` replaces it);
  K173's `scripts/split_rules.json` still anchors on the old FIT CAMERA
  PAN SLACK entry (matters only if the split is re-run).
- **K222** · K198's maze edge leaves out the win ring (about 5 px past
  the disc), the head's glow and the minotaur, and the range ignores the
  panel's height, so a maze lower than a short panel still has to clear
  it (`docs/design/K198.md`, The calls).
- **K221** · K198's range reads the maze's right edge, which creeps while
  the knot settles (about 0.3 fit px per 200 ms), so at the left limit
  the gap to the open panel shrinks by zoom times the creep (0.2-1.2 px
  measured) (`docs/design/K198.md`).
- **K220** · Tooling: K75's `census_fan.mjs` misreads routed joints since
  K81 (it calls `fieldProbe.at` without `px` and `strip`, so it reports
  0.21 where the fans agree to 0.006). Use K169's `census_k81.mjs` or
  K93's `census_k81h.mjs` (`.claude/probes/K93/`); fix or retire it.
- **K218** · In trail mode, a junction cap inside the fade holds a flat p
  over its 0.31 radius, then steps at its edge (pre-existing, mostly
  under the web; `docs/design/K93_K145.md`, Stage 1 handoff).
- **K217** · K93's trail split is placed linearly in ctrl, but the trail
  measures lattice length and the paint is linear in arc, so the fade
  start sits slightly off (pre-existing), and a fading part narrower
  than a pixel blends sub-pixel at the split (`docs/design/K93_K145.md`,
  Stage 1 handoff).
- **K216** · The rules split's hand-kept parts: `docs/lore_index.md` and
  each area file's topic list are maintained by hand, and 26 design docs
  still name the area files, one hop from the topic (`docs/design/K173.md`).
- **K214** · `particle_system.ts` and `forces.ts` still attach 30.8 KB of
  lore after the split: all the physics lore is about them, so only
  trimming the text would cut it (`docs/design/K173.md`).
- **K213** · Before K90's bend bound ships (if Levi ships it): the min
  regression (the hard clamp tightens the worst window in 24 of 585
  scans, the soft one in 4; done when `k90_minrows.mjs` reports 0),
  `controlArcLengths`, unit tests and a CPU mirror, hit tests on the
  moved samples, the phone's rebuild cost (`docs/design/K90.md`, Stage
  1b handoff).
- **K212** · PixiJS warns "Attribute aGap/aGapId/aUV is not present in the
  shader" on every load, on master too (seen by K132's probes,
  `.claude/probes/K132/`).
- **K208** · `restoreYarn` keeps its own copy of the travel-direction
  rule; it could share `travelOrder` / `moveEnds` (`src/render/fog_arc.ts`,
  K100).
- **K207** · Fog stamps grow without bound within a solve: the spacing
  filter checks only the last stamp, and `renderFog` redraws every stamp.
  A spatial dedupe fixes both (`src/render/fabric_maze_renderer.ts`;
  `docs/design/K100.md`, Stage 1 handoff).
- **K206** · A restored attempt stamps its fog right after the intro,
  while the threads re-settle, so with physics it differs from the live
  fog (IoU about 0.96). Option: stamp after the first sleep
  (`docs/design/K100.md`, Stage 1 handoff).
- **K205** · K120's leftovers (`docs/design/K120.md`): the follow camera
  doesn't keep the dot clear of the move pad (a camera inset, K148's and
  K149's area); the maze is small at the phone's fit zoom; a toast at
  411 px wide can briefly overlap the pad; clicking the panel's empty
  area and then pressing an arrow moves in the maze instead of scrolling
  the panel; in principle a hold could loop around a cycle of runs that
  all match its key (not observed). Probe gotcha: alternately tapping and
  holding the best key can cycle forever.
- **K202** · A bare-URL daily left open past midnight with no move
  becomes practice when begun the next day (K146). An unstarted daily
  the bare URL opened could roll over to the new day instead
  (`docs/design/K146_K151.md`, "Open").
- **K201** · History's "Played" chip counts any record, practice
  included, so it can exceed the played tile (24 against 21 in K146's
  probe); a practice row's count shows only in its tooltip, which phones
  lack (`src/ui/daily_stats_view.ts`).
- **K197** · The phone's load settles later over ab6d330..54a2b43
  (K156's round pass of 2026-10-14): first sleep 8.0 -> 19.3 s, fps 46
  -> 41, p95 33 -> 50 ms, while the longest frame fell 684 -> 167 ms;
  K147's settle budget (b0a1c49..97293e7) is the likely, unconfirmed
  cause. To attribute: the frames phase with `-Base b0a1c49~1 -Head
  97293e7`; then whether 19 s is acceptable is Levi's call.
- **K190** · Unmeasured costs from K154+K169 (aaa3dda): the new hash
  costs the drifting backgrounds' programs 37-60% more on the desktop
  (vellum-drift 0.352 -> 0.50 ms at 3200x1800); the phone, and the fan
  program during a web fade, are unmeasured. Measure at K79's K52 phone
  gate, vellum-drift first; if the phone pays, a cheaper hash needs
  another shape (`docs/design/K154_K169.md`, "Stage 1 handoff").
- **K195** · The phone pass's gaps (K156 3c, `docs/design/K156.md`,
  "Stage 3c handoff"): the noise floor is one 3-rep A/A pass for `-Moves
  0,7,13` only (rerun A/A when the orientation, the phone or the load
  changes); knot-mode render ms swings 7.5-20.5 ms in A/A, no use at
  rest; K80's indicator look shows the indicator but never taps it.
  Fixed since: the white strip (K193), the portrait floor (K253,
  459cc11), and the watchdog's touch trip works (2026-10-14 19:37).
- **K196** · K180's crossings options at phone scale: `ride` and `pinch`
  leave most taps unreadable in the census (dense `ride` 93.8%, fabric
  `pinch` 71.1%); `through` reads best (`docs/design/K180.md`, "Stage 1
  handoff"; `.claude/probes/K180/`).
- **K123** · `.claude/probes/K10/phone_bench.mjs` drives the first
  visible `http://localhost:` tab on any port, so it can navigate one of
  Levi's own tabs. Use `.claude/probes/K79/phone/bench.mjs` (ports
  5371-5374 only), or filter by port.
- **K124** · Marker gaps keep their CPU reveal gate, so they still pop
  during the reveal (pre-existing; G2 agent a7d1f998's report,
  2026-10-12 18:43; from the LEDGERS inbox).
- **K125** · Scarborough Fair's loop is 50 beats
  (`src/audio/songs.ts`; K116 found it), not whole 3/4 bars, so a part
  that keeps bars would slip each loop. Grow its closing rest from 2
  beats to 3 before any band part (K116's call 6).
- **K128** · `src/render/marker_mesh.ts:32` declares `in vec2 aUV;`
  but never reads it while the marker geometry carries it, so PixiJS
  warns "Attribute aUV is not present" for each of the three marker
  meshes on every load (K83; found by K81 stage 3a). Read it in the
  shader or drop it from the geometry.
- **K130** · Panel rows with a slider step (`backgroundIntensity`,
  `pulseReach`, `settleBudget`, `loadSettle`, ...) snap to Tweakpane's
  step grid, which starts at the row's first value: after a link with an
  off-grid value, "Reset to defaults" can write a wrong default (e.g.
  intensity 0.48). Existing behavior (`src/ui/tweakpane_panel.ts`),
  found by K79 stage B1.
- **K131** · The phone probe kit (`.claude/probes/K79/phone/`,
  untracked): `drift.mjs` and `frames.mjs` take full-size PNG shots,
  10-25 s each over Tailscale (use JPEG or clipped shots); `bench.mjs`'s
  `thermal()` reads the stale "Cached temperatures" block, not the live
  HAL one (K81's `.claude/probes/K81/phone/lib.mjs` reads the live one,
  in K81's worktree). Untested: whether the watchdog's 2 s `dumpsys`
  poll and CDP traffic add to the bursty frame stalls. The phone has no
  GPU timer, so a tighter A/B needs many interleaved reps.
- **K11** · Ring + gridAlign: buckles lopsided below strength ~1.8e-3,
  wanders without sleeping at 5e-4..1.6e-3, never sleeps at ga=1.
- **K12** · Shaped-lattice sleep failures: star with e-w anchors sleeps
  on 6/8 seeds; K46's scans at gs 20-24: star 4/60 never sleep, tree
  4/60, fish 2/60 (some thrash about 1 unit per substep); heart, ring
  and rect are clean. The circle at gs 18 is clean on its default and
  w/e anchors, but with n/s anchors 3 of 7 seeds never sleep (seeds 1
  and 4 thrash, seed 7 holds a standing rider). Repro:
  `?4.c&shp=circle&sa=n&xa=s&am=instant`.
- **K62** · The `branchDensity` and `fourWayFraction` panel rows do
  nothing at the default `junctionSpacing` 2 (K46 finding; K74:
  `branchDensity` 0.2-0.6 and `fourWayFraction` 0.4-0.7 build the
  identical maze, 0.1, 0 and 0.8+ change it). They look broken; rescale,
  relabel or hide them. `junctionSpacing` is the real density knob.
- **K13** · Post-violent-play loud attractor at fat params (the open P3
  problem; fingerprint in `.claude/rules/physics-collision.md`).
- **K14** · Latent seam-window wraps on open chains
  (applyTransversality's window, the slide/project windows,
  updatePassCover's +-12 slots): agent-measured, unfixed.
- **K15** · During a reveal, a joint's fan can turn opaque while a fill
  beside it is still striped (K4 fixes it by construction). May be moot:
  G1 (99443cb) deleted the over-fills. Re-check fan vs base ribbon during
  a reveal.
- **K16** · Physics settle is slow: 100-190 ms/frame at gs 18 on a
  loaded desktop, 7 sim-seconds in 14 s on the phone; it matters more
  since the daily's 18x18 design is the front door (sleep at sim about
  5.0 s since K63; cost is particles x thread width). K279's wake check
  (`.claude/probes/K279/wake/`): a drag, a tap with the tug and a bare
  wake cost the same (8.2 / 10.5 / 20-23 ms per substep at 2592 / 3011 /
  5448 particles), so every wake spirals to the 100 ms cap and runs at
  7-9 fps (3-4 dense) for 3-8 s. K162 (4) asks whether drags get K147's
  budget; K7's worker is the full fix. A regression since the 2026-10-10
  audit (40 fps mid-drag) is unconfirmed; a bare-wake probe on that
  commit would settle it (offered to Levi, 2026-10-14 18:25).
- **K65** · Low-gridAlign knots (`ga=0`, e.g. Levi's rect link) creep
  under the quiet threshold: a fresh settle drifts about 1.5 world over
  about 50 s, a cinch up to 0.9 world/s, and every sleep gate freezes
  them mid-creep. A net-displacement test over the window would catch it
  but keep such knots awake for tens of seconds. Related: K11 (K63
  finding).
- **K29** · Boxed kinks at tw 0.64: 3 of ~152 kinks (8 seeds) rest at
  0.56-0.78 thread widths of eye hole, boxed in by a fused joint and the
  1.6 corridor floor and keeping only lattice material; stronger eye
  pressure (2.6, 2.8) doesn't lift them. Since K41's chord law they rest
  a little smaller (X304 of seed 3zz2a1: 0.78-0.80 at default width).
  K49 is the size decision. `.claude/rules/physics-kinks.md` ("KINK
  EYES").
- **K30** · Very wide threads (tw >= 0.72) never sleep, standing riders;
  after K41, 7/8 seeds sleep at tw .72 (was 4/8). Seed 1q2w3e's kink
  X360 cycles material through its crossing at mv about 0.09; turning
  eye pressure off doesn't stop it. The slider reaches 0.8.
- **K50** · The riders gate measures overlap before the fusion snap, so
  a resting overlap of up to about 0.04 at joints can go unflagged;
  measure the end-of-substep state instead (K41 agent idea).
- **K59** · Two visible windows with interleaved moves on one daily end
  with the last writer's attempt winning: a tab adopts a newer saved
  attempt only when it comes into view. Adopting on the `storage` event
  fixes it but rebuilds the other window (intro included) on every move.
- **K54** · Background contrast varies with the palette: ember roughly
  halves mist's (luma spread 11.4 -> 6.1). Normalizing the accents'
  brightness would even it out.
- **K51** · Knot-mode braids: where one pass sits between two twist
  twins, the two ratchets still clamp one after the other. K41's
  ratchet-intersection rule could apply there; no failure seen yet.
- **K26** · Plucks at tight loops, zoomed in: only the concave side of
  the swing is capped, so a loop's eye gets a slightly ragged, enlarged
  rim during the ring. A symmetric cap fixed the eye but lumped every
  hook's outer blur at normal zoom, so it was rejected.
- **K27** · Plucks near junctions. Lobes inside a junction's fillet-web
  footprint (about 1 world at cr 3) keep their base intact, so they ring
  as a crisp thread with a halo rather than a blur, as crossing
  footprints already do.
- **K42** · Silhouette-level cyclic overlaps: three ribbons over one
  pixel, each over the next (user links x170/x93 after repeated cinches,
  x134/x135). G1's per-pixel protect can't break a cycle; it needs a
  per-pixel winner.
- **K43** · A fused tail riding its host (user link tips 0/1) is still
  sensitive to draw order. Predates G1.
- **K44** · Probe tooling quirks: the gap census's totals drift between
  captures of one frozen state and it ends a crossing's ideal at 0.5 of
  the neighbor gap (the renderer uses 0.8); a hold probe must first move
  past the 4 CSS px tug threshold (df373b5; `.claude/probes/K41/` moves
  12 px); with flow on, A/B at `fw=0`; pair `phy=0` builds on one side
  of K63; a 4x CPU throttle is for ratios only.
- **K69** · String mode (`pv=string`) on pre-G2.3 builds drew a 1-px
  diagonal sliver from the start to the exit marker after a few moves
  (`?b.c&pv=string`, 6 moves). G2.3 does not show it but it was never
  attributed; look again if it returns (G2 doc section 7, Follow-ups).
  Since K83 (45aac50) that Graphics draws only the win ring.
- **K95** · Below about 340 px wide, the mode badge drops below the
  hamburger and covers the header of an open panel (K73; the fit levels
  are measured in `.claude/rules/gameplay-badge.md`, MODE BADGE).
- **K103** · Below 10 fps the fit camera, the move animation, the paint
  clock and the pluck overlay still slow down: the fit eases by a fixed
  fraction per frame, and `tickAnim`, the paint and `tickPlucks` read
  Pixi's `deltaMS` (capped at 100 ms). K96 (d8b9175) moved only the
  follow camera onto real time; a time-based fit ease would change its
  feel at the refresh rate it was tuned on. Since K101 (e9e01ae) a music
  note's string motion trails its sound below 10 fps.
- **K106** · A dark spike inside a hook's tight bend while it rings (the
  ribbon's inner corner). Present with the base collapse off, so not
  K77's: `.claude/probes/K77/out/s2r/s2r_hookspike.png`.
- **K107** · A dark "X" at the center of big knot-mode attack-lobe blurs,
  also present with the collapse off:
  `.claude/probes/K77/out/abknot/sheet_zoomL.png`.
- **K112** · Motion setting residuals (K79, 9ffda8a): no cross-tab sync
  (another tab picks a change up on reload; `src/ui/motion.ts`), and the
  camera's reduced-motion jump on an edge-indicator tap was
  code-reviewed, not probed.
- **K133** · Crossed join bridges: plans built before K110 can hold two
  join bridges that cross (the diagonals of one cell; 108 plans, 20 of
  them dailies). K110's joins skip such a splice, the older join code
  has no check. Fixing it moves those plans, which the pre-launch policy
  allows; first look at whether a crossing reads wrong
  (`.claude/probes/K110/verify_run3.txt`).
- **K136** · A gs 6 tree maze with dead ends never sleeps (140 s of sim,
  still moving), on 7e41a02 and ade3537 alike, so not K110's doing;
  maybe the K13 attractor. Repro `?12l&gs=6&shp=tree` (K74's agent saw
  it at the new defaults and the old placement too);
  `.claude/probes/K110/sheet/results_run1_tree_awake.json`.
- **K142** · The A/B harness's first case in a fresh browser can read
  nonzero (1 of 11 runs: K79 B2b's `none_desk`, specks on thread edges);
  cause not found (a cold server or GPU cache?). Rerun before trusting
  it; a warm-up case is untested (`docs/design/K79.md`, "The 18/19
  run").
- **K143** · Vellum's fibers read as long crossing hatching near scale
  2, the slider's max (K129; merged in 58b77cf). A look for K156's phone
  pass (sheets in `.claude/probes/K79/out/view/`).
- **K150** · Probe tooling isn't safe for concurrent agents:
  `scripts/diag_screenshot.mjs` uses one fixed Chrome profile and an
  on-screen window, and `scripts/preview.ps1 -Ref` builds into fixed
  TEMP folders unless given `-Root <dir>` (K156 stage 1, 1f8be97). Fix:
  per-run profiles, off-screen windows (claude-config
  `rules/lessons.md`). Give each agent a disjoint port range, and a
  probe must not release the perf lock between samples (gaps let another
  agent's builds land).
- **K157** · K79 B's color rows on the phone (B3): accent 3's picker
  opens 8 px below the viewport until the panel scrolls, and a second tap
  on a swatch doesn't close Tweakpane's popup (check the older color rows
  too). (`docs/design/K79.md`, "Stage B3 results")
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
- **K166** · K81's render residuals (`docs/design/K81.md`, "Residuals
  to report"): the pluck overlay draws over the gold band; band edge
  cases (a ribbon patch past a non-route arm's cover cap, a fixed-width
  band on a ribbon whose width varies, clipping at non-adjacent routes
  and skipped wedges, caps dropped past MAX_ROUTES and MAX_ARMS); and at
  a tap, setPaint runs a frame ahead of tickPaint.
- **K167** · K81's fan costs a +0.055 ms floor (+0.34 ms, about 9%, at
  15-20 moves); the early-out and the strip trim were deferred
  (`docs/design/K81.md`).
- **K168** · K81's untested ranges: more than 20 routed records, zoomed
  in, and a full web on the phone (the gate walks the cheapest route, so
  a full web was certified on the desktop only). K156's looks can cover
  some.
- **K170** · `scripts/phone.ps1` sends KEYCODE_WAKEUP, against the phone
  rule (no key events; the phone stays awake on its charger). Proposed:
  no wake by default and a `-Wake` switch to opt in (K156 3a proposed a
  `-NoWake` switch instead; `retry_quiet.ps1` already drops its copy).
- **K172** · K156's screenshot sheets have no text labels, and its drift
  looks show drift only inside the intro window (3c checked the speed-8
  looks on the phone: they show motion).
- **K175** · K80's UI gaps (5fed5c1): a queued tap has no visual; the
  choice pulses go quiet during a move; the bull glyph is a placeholder
  (K98); its off-screen indicator ignores `finishIndicator` (K84).
- **K176** · K80's entrance-tail trap: after losing a player on the
  entrance tail, the minotaur pauses at that tail's junction and catches
  them about 3 s later (`.claude/probes/K80/rt/results.md`).
- **K177** · K80's last unrun check: the minotaur's indicator on the
  phone itself (K174 checked it on the desktop in 411x753 emulation);
  the next phone pass shows it. Chases are not saved or replayable
  (`replayChase` exists; the dailies stay turn-based).
- **K178** · Since K122 the private-cache vite wrappers of K19-K20, K79,
  K99 and K104 fail with ERR_MODULE_NOT_FOUND; K80's
  (`.claude/probes/K80/rt/vite.private-cache.config.ts`, which loads the
  config with `loadConfigFromFile`) works (`.claude/rules/probes.md`).
- **K181** · K104's residuals: the phone's "can't tell" share stays high
  in fabric and dense (26%, 41%); W deepens the raw collapse; sound-only
  taps in junction cores, and taps bound by hide zones, can show only
  through a cue; the cue constants are unreviewed. G1's soft edge shows
  the under ribbon inside casing + CUT_BIAS at fabric and dense
  crossings of 80-90 degrees. `docs/design/K104.md` ("Stage 1b handoff",
  "Stage 1c handoff").
- **K188** · K140's residuals (`docs/design/K140.md`, "Stage 1 handoff"):
  `restartSolve()` leaves pieces in the air; the open desktop panel covers
  the spray when the exit is at the lower right; the rain takes 5.5-6.2 s
  to fall out, longer below 10 fps.
- **K189** · Fabric mode's `sceneAnimating()` is always true, so K24's
  ticker stop never fires in fabric: about 10 ms of JS a frame at 1x CPU,
  64 ms at 4x (K140's measurement, `docs/design/K140.md`).
- **K287** · K268 stage 1's residuals: (a) the brief's full proof sweep
  (reach steps over perpendicular, shallow and kink-eye crossings,
  growth 0.1-0.9, over-thread tips) is not run (the proof ran 11
  configurations on one state); (b) the two-piece (MAX) case and (c) an
  over thread's own tip inside a footprint have no GPU check; (d) the
  contact sheet is the proof's crops only; (e) fray's cut flickers along
  its center fiber's sine; (f) the mode-off A/B was not re-run after the
  rebase onto K114 (coordinator's call); (g) the per-slot cut proof on
  the phone needs `__knotExplore` to expose slot positions (the K156
  2026-10-14c phone census itself passed). `docs/design/K268.md` ("Not
  done in stage 1", Calls).
- **K289** · K279 stage 1's last residual: (g) no webm clips of the plucks.
  Stage 2 closed a, c (a cull, not a bounded filterArea), d, i, j and k; (e)
  is K368. `docs/design/K279.md` ("Stage 2 handoff").
- **K291** · CI: the deploy run of ad2618a carried two annotations:
  checkout@v4, setup-node@v4 and wrangler-action@v3 target Node 20
  (forced on Node 24), and `ubuntu-latest` moves to Ubuntu 26 on
  2026-10-19. Bump each action to a Node 24 release; if the first deploy
  after the 19th fails, pin `ubuntu-24.04` (a red run leaves the
  previous deployment live). `.github/workflows/deploy.yml`.
- **K293** · K80 turns stage 2's residuals, for stage 3: (a) under
  minoRestart the stars rate only the last life, while the popover says
  the walk before it counts; (b) the ox emoji shows only in the share
  grid, never under minoRestart; (c) markCaught on an empty move log
  pushes `x`, so the moves read 1; (d) with minoLair off the minotaur
  can camp the first junction past the entrance; (e) the minoSleep
  tooltip is wrong with minoLair off; (f) a Reset path restart shows no
  toast; (g) real time has no close-call or seen stats; (h) the messages
  of c021177 and e571894 say codec 121-122, the rows are 128-129.
  `docs/design/K80_turns.md` ("Stage 2 handoff", "For stage 3").
- **K295** · `.claude/probes/K155/probe_stars.mjs` is stale in two
  checks: it expects 4 rules lines in the stars popover (stat lines
  follow them since K274) and today among the History rows (own row
  since K146). Only the copy
  `.claude/probes/K80/turns2/banner/probe_stars.mjs` is fixed.
- **K300** · `scripts/phone_pass.ps1`'s `-Moves` default 0,7,13 (line
  110) now lands on the finish: master's `?b.J` is solved on its 12th
  move since K74 stage 2 (inferred), so fabric@13 times the stars and
  confetti. K253's portrait floor was taken at 0,7,13 too, so change the
  default to 0,7,11 together with the next A/A, which then takes a
  fabric@11 floor (`docs/design/K156.md`, "Round 2026-10-14c handoff",
  Step 7).
- **K301** · The phone pass tab's layout flips from 411x753 to 412x755
  CSS px after its first real tap or move (under K193's CDP emulation),
  so same-state baselines and fixed-size crops shear (K279's run-1 flash
  numbers were invalid). Cause not found; the pass's looks and probes
  should cope, or re-pin the metrics after a tap (`docs/design/K156.md`,
  "Round 2026-10-14c handoff", call 6).
- **K303** · 48 probe files freeze the sim with the `__knotPS().step`
  patch, which a worker will not honor; K7's stage 4 ports the
  load-bearing ones (`docs/design/K7_worker.md`, "Design handoff").
- **K304** · `.claude/probes/K73/probe_follow.mjs` calls
  `__knotExitPointer`, which no build defines (found by K7's design).
- **K305** · In the daily's intro, k7_frames' frame-callback p50 (24.7
  ms) exceeds its rAF-interval p50 (18 ms); unexplained, so K7's
  summaries report fps, interval p95 and render alone
  (`docs/design/K7_worker.md`, "What was measured").
- **K308** · The background contours' `mod(floor(v + 0.5), 5.0)` is a
  float quotient like K299's: exact on the desktop GPU and allowlisted in
  `ROUNDED_QUOTIENTS` (`test/render/paint_ring_lap.test.ts`), unfixed
  because the background programs are sha256-pinned. Fix it with the
  next change that re-pins them. `docs/design/K299_choice_pulse_bug.md`
  ("Residuals").
- **K311** · PixiJS warns at load that attributes aGap / aGapId / aUV
  are not present in the shader (Levi's console, 2026-10-14). Find which
  mesh binds attributes its program does not declare and tidy it
  (`docs/design/K299_choice_pulse_bug.md`).
- **K314** · `src/main.ts`: the non-finite watchdog's comment (about
  line 4274 at 459cc11) and stamp say `halted` is cleared on regenerate,
  but nothing sets it back to false (its only `= false` is the
  declaration). Noted by K7's stage 1.
- **K315** · `__knotPhys` calls `sys.readSlideStats()`, which resets the
  slide counters it reads. Under K7's mirror it needs the diagnostic
  bridge or a worker-side count; decide in K7's stage 2 or 4
  (`docs/design/K7_worker.md`, "Stage 1 handoff", "For stage 2", on K7's
  branch until it merges).
- **K319** · ANGLE's Vulkan backend does not expose
  `KHR_parallel_shader_compile` (K307 stage 1), and phones may not
  either: there K307's warm-up falls back to blocking links and the
  screen stalls for the longest compile (section-rgb, about 2.8 s cold
  on D3D11). The phone's answer rides K156's next pass.
- **K330** · A touch press on a choice lights no hover glow until the
  finger moves: the `pendingTap` path in `src/main.ts` sets no glow run
  (K298's stage 1). Built with K331 (touch picks), after K329.
- **K342** · The snore link (K325) is verified on desktop Chrome only.
  Unchecked: Android Chrome (the touch delay's feel; whether it cuts the
  sound when the tab switches; rides K156's next phone pass),
  Safari/iOS, other desktop browsers. `gameplay-audio.md`, THE SNORING
  CAT LINK.
- **K343** · The snore's first-input limit (K325): no AudioContext
  exists before the first activation, so a hover before any click or key
  is silent, and the gesture that opens the audio gate plays nothing
  (the MP3 is not yet decoded). Fix: decode on an OfflineAudioContext
  before the gate. `gameplay-audio.md`, THE SNORING CAT LINK.
- **K346** · The physics halt misses NaN: the check
  `Number.isFinite(maxMove)` (`src/physics/particle_system.ts`, about
  lines 2281-2287) only catches an infinite move, and a NaN displacement
  fails `d * d > max`, so a state that turns NaN without an infinite move
  never halts. Predates K7; found by K7's stage 2 (2026-10-14).
- **K348** · Key-move edges left by K329/K333/K334: the clockwise X
  assignment switches only once arms move past KEY_TIE; at a T a chord
  can pick a run by elimination; a sloppy chord whose first key is clear
  alone gives that move plus a queued second; a hold whose first run is
  shorter than HOLD_DELAY pauses at the first junction; a turn-minotaur
  wait tap during a move isn't queued; the tap and pointer hovers may
  fight while a tap waits; the arrival frame's overshoot is dropped.
  Lore: TIE CYCLES, CHORDS AND THE MOVE WAIT in `gameplay-moves.md`.
- **K349** · K120's key probe lags the new rules
  (`.claude/probes/K120/keys.mjs`, K329's `waiting` patch in; old copy
  `keys.pre-k329.mjs`): its realtime check "a held key keeps adding
  inputs" fails on master too (the `?7.J` hold from node_14 stops after
  one move; it needs a start where holds chain), and its queued-run
  check should poll inside the page. One real-time first-press miss
  under load was not reproduced in 10 tries
  (`.claude/probes/K329/k120/out/keys-run2.log`).
- **K351** · The "Read by" column of K339's inventory
  (`scripts/panel_inventory.ts`, `docs/design/K339_inventory.md`) misses
  params read through the `*Of` helpers.
- **K354** · A dark three-armed star in a kink loop's eye under the
  pluck blur, the uncovered middle (concave-side cap off: a thin Y); K77's
  "dark X" family? `docs/design/K344_pluck_cusp.md` (stage 1 handoff).
- **K355** · Zoomed in, the wide outer pluck blur shows staircase bands
  (inferred: affine interpolation over wide quads); before and after
  K344. `docs/design/K344_pluck_cusp.md`.
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
- **K369** · `index.html` links no icon while `public/favicon.svg` ships
  unlinked, so Chrome asks for `/favicon.ico` (a 404 in every probe log; K279
  s2, unchecked). The link must be relative (the levi.dev proxy).
- **K372** · Fabric `?b` doesn't sleep again within 30 s after a drag, on any
  host, master included (K7 s4). Rec: a short sonnet probe of whether and when
  it sleeps.
- **K374** · 52 freeze-patch probes and 5 timing wrappers still patch `ps.step`
  and run only with `&phw=0` (`.claude/probes/K7/stage4/ports/FREEZE_PATCH_FILES.md`):
  port each when next needed, `k279_ab` first; re-run g2_smoke and livefabric.
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
- **K381** · The K83 PIN recipe (`probes.md`) and `k83_ab` don't pin the fabric's
  explore clock: a thread-reveal A/B differs by 22050 px without it (G3-0). Rec:
  add `F.exploreClock = 1000` and `tickExplore` forwarded with 0 (probes.md's K8 bullet has it).

## Approved, to schedule (2026-10-11)

- **K22** · Dynamic resolution scaler (2x up to 3x when frame time
  allows; down when struggling). Part of K6, refined after G3.
- **K23** · GPU particles (G2.4), GPU fog-of-war accumulation, the yarn as
  a gap-masked ribbon (G3-5).
- **K322** · Art, sound and music by people (Levi, 2026-10-14 21:47):
  commission or license better icon art, sound effects and music before
  launch, and credit each artist on the credits page (K321) with the
  terms their work ships under (`notices/credits.ts`).

## Ideas (not scheduled)

- **K259** · With the explore mode on, a chain with any visible piece
  draws its whole mesh, so hidden fragments still run the shader;
  drawing only the visible index range would make it cheaper. Not needed
  yet (2a's cost never exceeds master's program; `docs/design/K76.md`,
  "Stage 2a handoff").
- **K255** · Fold K193's `wait_then_aa.ps1` (`.claude/probes/K193/`) into
  `scripts/phone_pass.ps1` as `-WaitQuiet`: it tolerates touches until a
  full quiet window can no longer end before a deadline, where
  `retry_quiet.ps1` only runs after a trip and gives up at the first
  touch that leaves less than a full window.
- **K256** · The phone warms about 6 C in a pass's first rep, so cells
  run at different temperatures (K193's A/A). A warm-up before the
  bench, or a temperature column in the summary, would separate heat
  from noise (`docs/design/K193.md`, "Stage 1 handoff").
- **K247** · K174's ideas: readable labels in the Minotaur folder (the
  `mino*` keys clip, K246); a catch toast that says the fog came back;
  homing or the rejected "closest" roam pick, if more than about 2/3 of
  games should meet the minotaur. `docs/design/K174.md` ("Stage 1
  handoff").
- **K233** · The phone pass's full spec (26 looks, 3 reps) takes about
  55-60 min. Trim it per round, or add a spec `deadline` so no look
  starts after it (`pass/state/watchdog.trip` already stops a pass
  gracefully; `docs/design/K156.md`, "Round 2026-10-14b handoff").
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
- **K36** · Add to home screen: a web app manifest and icons. Blocked on
  icon art (Levi has the prompt for another model), which also fixes the
  `/favicon.ico` 404 on every load. K122 found the Vite template's
  unreferenced leftovers (`public/favicon.svg`, `public/icons.svg`,
  `src/assets/hero.png`): delete them or wire up the real favicon.
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
- **K66** · Why do bridges at joints, open tails and kink neighborhoods
  end the settle ramp near an unstable point? They snap to a new rest
  3.5-5 s in, which forces K63's 2.5 s window; fixing it could make a
  0.75 s window safe (K64). K63 agent idea; harness in
  `.claude/probes/K63/`.
- **K84** · After the churn, a pass over EVERY param (Levi, 2026-10-13):
  classify each as a viewer preference (localStorage) or a design param
  (the link); keep each in its concept's folder and mark preferences
  instead of a separate section (K292); re-evaluate worth and grouping;
  audit names and tooltips; place `finishIndicator` and `tapToPan`
  (K73), the Motion setting (K79) and High contrast (K111). Meets K57
  (the daily's exempt keys) and feeds K78's param reference.

  It meets K57 (the daily's exempt keys are mostly preferences) and
  feeds K78's param reference.
- **K85** · Replay links (Levi, 2026-10-13): record a playthrough in a
  link and replay it with the path animating, for a finished session
  (watch) or an in-progress one (pick up where it left off). Builds on
  K47 (an attempt is its tap list plus a walk-graph fingerprint); a link
  needs the design token, the taps and per-move timing. The share link
  stays as it is.
- **K91** · A shorter quiet window for physics-off loads (they never
  wake), dropping their hidden settle from 5.0 sim-s toward 3.25. Cost:
  about 4% of designs would lay out 1-4 px differently from physics-on,
  which K57's exempt physics toggle assumes is the same (K64 follow-up).
- **K88** · Validate K74's difficulty measures (greedy walks, route
  turns, decision counts) against real daily solves: moves, backtracks
  and time. Only local results exist today. (K74 idea.)
- **K89** · Fisher-style pacing: loops in series with mid-maze
  bottlenecks, then a calm home stretch. Needs strand cuts and its own
  prototype (`docs/design/K74_maze_design.md`). (K74 idea.)
- **K82** · Manually override the daily maze for a given day (Levi,
  2026-10-12: "could be a follow-up thing"): a frozen per-day override
  table beside the versioned definitions, which a published day's entry
  must never change (`.claude/rules/gameplay-daily.md`, daily rule 1).
- **K68** · If junction-web edges look soft at deep zoom (about 4x),
  size the arm material strip rows from the camera's world-per-pixel
  (re-packed on zoom) instead of raising the 64-texel width for everyone
  (K4 agent idea).
- **K70** · A more dramatic hero settle (P2 polish): the splines round
  the lattice corners from the first frame, so the settle reads as a
  gentle tightening, not zigzags turning into curves. Blend the sampled
  positions toward the control polyline while settle progress is low
  (`docs/history.md`, Follow-ups).
- **K71** · Wobbly threads at slack ~0 (P2 polish): waviness along runs
  and rope-tight twist chains. Candidate knobs: constraint iterations,
  pullOnly bending, repulsion/structural balance (`docs/history.md`,
  Follow-ups).
- **K72** · Twist-eye openness as a user param instead of a constant
  (MIN_PASS_SEPARATION is the main compactness lever; P3.17,
  `docs/history.md`).
- **K97** · Promote K49's `kinkCensusPage` (`.claude/probes/K49/lib.mjs`,
  an in-page port of K41's kink census, within 0.009 of the node
  harness) to tracked `scripts/` for same-state browser A/Bs of eye size.
- **K102** · `src/audio/songs.ts` holds one song (Scarborough Fair): a
  small library of public-domain tunes would serve K80's melody path and
  a song per day (K80 doc section 3).
- **K113** · Two-layer vellum: render the fibers and grain once into a
  static texture (1 texel per CSS px) and drift only the mottling in a
  low-res pass; the drift pass costs about 2.1 ms at 1600x900 today
  (K79, `.claude/probes/K79/out/gpu_k79.log`).
- **K118** · Native mobile apps, eventually (Levi, 2026-10-13): not
  before everything else is iterated and finished. The mobile web app
  stays alongside them.
- **K119** · i18n, at the end (Levi, 2026-10-13): there is little text,
  and an LLM will drive the translations. Strings are mostly in
  `src/ui/` and `src/game/share_text.ts`; text drawn as threads is
  K115's question.
- **K126** · The K21 background breathes with the band's bass, gated
  by the Motion setting, once K116's accompaniment exists
  (`docs/design/K116_instruments.md`).
- **K134** · Forbid equal start and exit anchors in the panel: they
  cause most of K110's exit re-picks and rect moves.
- **K135** · Keep the start/exit pair when a join reaches the other
  flank of an untrimmed cut: 98 tiny designs (gs 2-4) got a longer
  optimal under K110, typically 4.563 -> 5.270.
- **K141** · K80 section 4's costlier mechanisms, deferred (Levi,
  2026-10-13): 4.8 sentries (call 9's "validated sentries"), 4.22
  two-player (M hot-seat, L networked), 4.25 over-under swap
  (`docs/design/K80_gameplay_additions.md`). The M ones are K138.
- **K153** · Licenses page extras (K122's ideas): list the packages in
  the dev server too (it shows a placeholder; the module graph has the
  list), and a diffable `licenses.txt` beside the page.
- **K160** · The background speed slider is linear over 0-8; a curve
  like gridAlign's (`src/ui/grid_align_curve.ts`) would give the slow
  end room. At 8x the 10-15 Hz texture pass may look steppy (unchecked
  on the phone): if so, scale the re-render rate with the speed. A look
  for K156's phone pass.
- **K179** · K80 ideas: reversing mid-run in the real-time mode. (The
  roaming bias toward the player was decided on 2026-10-14 and is part
  of K174's work.)
- **K182** · K104 ideas: G1's exact mask for moving plucks too (today
  only still plucks use it), the curvature-aware clip as its fallback;
  check the still strip's concave-side clamp.
- **K57** · Confirm the daily's exempt settings (`DAILY_EXEMPT_KEYS` in
  `src/ui/daily_link.ts`): the ones a player may change without leaving
  the daily. Parked for the late-stage review with K46 and K84 (Levi,
  2026-10-14; `docs/design/levi_notes_2026-10-14.md` item 13). Still
  open: `settleBudget`, `loadSettle` (K162 (3)), the two confetti
  settings and `markerSize`. The comment at `daily_link.ts:153` still
  calls `hoverGlow` proposed, though K237 and K264 answered it.
- **K117** · Repo visibility (`docs/design/levi_notes_2026-10-13.md`):
  private later, on Levi's word, parked until near launch to save CI
  churn cost (2026-10-14). Done in a756ca5: the panel's GitHub link is
  gone, `LICENSE` says all rights reserved (Snoring Cat LLC.),
  package.json says UNLICENSED, doc-only pushes skip the deploy. No
  bundle obfuscation. On his word: `gh repo edit --visibility private
  --accept-visibility-change-consequences` (reversible; the Pages deploy
  keeps working). K122 is needed either way.
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
- **K316** · Single-threaded WASM for the collision narrow-phase: the
  audit's 2-4x on that slice (about 40% of a drag's physics), about
  enough to bring gs 18 from 0.76x to real time under K7. Only if K7
  stage 5's phone numbers show physics, not rendering, is the
  bottleneck. Threads are ruled out (the Gauss-Seidel solver must not be
  colored, and SharedArrayBuffer needs COOP/COEP through every host,
  proxy and the beacon).
- **K320** · Slim or split section-rgb: at 46,850 characters it is the
  cold critical path (about 2.8 s on the desktop, K307 stage 1). A
  deploy that changes a shader costs every player one cold compile (the
  browser caches programs by source), so a smaller or split program
  shortens every such load.
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
- **K360** · Ledger diet pass 2 (K353's handoff): the open items still over
  three lines (about 150), the skipped K7 and K279, Done one-liners to ~160
  bytes; then drop `docs/ledger_diet/` (keep `scripts/ledger_diet.mjs`).
- **K371** · Let the worker run ahead of main's frames during the pre-settle, so
  it settles through K307's compile freezes (K7 s4); watch its saturation on
  the phone (97% busy, lagS 1.04 s by 8 s).

## Done

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
