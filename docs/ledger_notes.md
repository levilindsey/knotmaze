# Ledger notes

Text moved out of `LEDGER.md` by the ledger diet (K353, from 2026-10-15),
verbatim: the full text of items that were shortened, moved or closed,
under their ID, and the old prose they replaced. The ledger keeps each
item short and this file keeps the rest. New entries go at the bottom.

## Next, in order: the preamble (2026-10-15, replaced by a short one)

Every stage merges after desktop verification, and the phone checks
each merge round in one scripted pass instead of a gate per feature
(K152 (1), Levi 2026-10-13 about 17:55: "sgtm"). Small UI items get
unit tests and a screenshot only, and render prototypes skip the CPU
mirror and parity tests until Levi picks a look (K152 (2) and (3),
Levi 2026-10-14 about 00:22: "Yes to both."). The phone stays on its
charger, awake and unlocked (Levi, 2026-10-13 10:40), and a pass's
watchdog stops it on any touch. A pass checks the lock first and stops
at once if the phone is locked (K81's gate waited 47 min on a locked
phone, 2026-10-13). At most three code agents at once, research on
top. Pre-launch, nothing keeps old links or dailies (Levi, 2026-10-13
13:17; CLAUDE.md "Pre-launch: no back-compat"), so codec appends no
longer wait for each other: the second branch to merge renumbers its
appends. Usage: don't hold agents back until the week nears 97% (Levi,
2026-10-13 07:40, raised from 90% at about 23:53 and to 97% on 10-14 at about 10:57; 42% at 07:17, 54% at
13:35, 57% at 15:33, 61% at 17:48, 63% at 19:15, 66% at 23:13, 68% at
23:54; on 10-14 69% at 00:25, 72% at 01:49, 76% at 07:38, 78% at 08:05,
80% at 08:37, 82% at 09:04, 83% at 09:28, 84% at 09:36, 88% at 10:01 (the 09:37 batch was told to wrap up by 10:30 and launches stopped) and 91% at 10:56, when Levi said "Let's ignore the usage limits until 97%. Proceed"; at 13:40 on 10-13 he said keep going at full speed, and on 10-14
at about 07:53 "Keep going at full pace."; 95% at 11:54, and at about
11:59 Levi reset the week to 0%; 17% at 17:55; it resets Mondays at about 12:00).
Long work runs in stages from
committed briefs (Levi, 2026-10-13; the coordinator oversees it): each
brief names its stage boundary, where the agent writes a "Stage N
handoff" into the brief, commits and stops, and a fresh agent continues
from it. K81 alone was about a third of the overnight spend. From
2026-10-13 23:35 each brief stops at a wall-clock cap (2 h Opus, 1 h
Sonnet; a compaction is not a stop), and a watcher flags agents past it
(claude-config CC38). Sonnet agents don't compact at 200k yet
(claude-config CC45), so the cap is what bounds them.

Order from 2026-10-13 15:45, after Levi's answers at 09:35, 13:17,
13:30, 14:31-14:39 and 15:30-15:40, and on 2026-10-14 at about 00:22
(he may reorder). Running: K7's stage 3 from 23:22 (cap 01:22, opus),
K76's stage 2c from 23:39 (cap 01:39, opus), K344 (the pluck cusp) from
23:30 (cap 01:30, opus) and K339's panel audit from 22:54 (cap 00:54,
opus, docs only). K329 (the arrow keys, with K333 and K334) merged at
23:38, K335 (the confetti's top edge) at 23:32, K7's stage 2 at 23:21, K325 at 22:53, the K323/K324 design at 22:44,
K298 at 22:20, K307's stage 1 at 22:06 and K7's stage 1 at 22:04. The order
from 2026-10-14 23:00 (Levi, verbatim: "Let's defer the more-complex
celebratory effects to after other tasks. ... I think I'd like to get
thread appear/disappear support working as a close second priority
after the web worker."; at about 23:09, going to bed: "I'll leave the
phone available. Proceed through the night."): K7's stages 3-5 in turn;
then thread appear/disappear, one at a time since all four edit the
paint shaders: K76 2c (running), K268 stage 2, K290 (burn stage 3)
and K76 2d. Then
K321 (the credits page, sonnet), K307's warm-up (K313's loader follows
it), K331 with K330, K111 stage 5 with K265, K328 and K345, K332 (the
key hints), K323 stage 1 with K339's rebuild (one codec bump, shared
with 2c's), K326 stage A, and last K318, K336 and K337. K317 (more confetti) shipped at
21:53. K253's portrait A/A finished at 21:02 (the floor installed at
21:24), K299 merged at 20:45, K7's design at 20:10, K111 stage 4 at
19:11 and K156's round 2026-10-14c pass at 19:48. K279's
stage 2
waits for Levi's picks (K288). At about 10:57 Levi lifted
the usage hold: launches go on until the week reaches 97% (Levi reset
it to 0% at about 11:59; it resets Mon 2026-10-19 11:59). K100, K132,
K90 stage 1b, K173
(the rules split), K93, K198 stage 1, K98 and K92 merged at
08:39-10:08, K145 and K111 stage 1 at 11:55 and 11:58, K191 at 12:04,
K235 + K239 at 12:44, K174 at 12:53, K111 stage 2 at 13:03, K198
stage 2 at 14:03, K193 at 14:10, K76 stage 2a at 14:15, the
burn-race and K74 stage 2 briefs at 14:38, K111 stage 3 at 14:58, K80
turns stage 1 at 15:19, K76 stage 2b at 16:04, K74 stage 2 at 16:13,
the burn race's stage 1 at 16:35, K274 with K277 at 17:37, K268
stage 1 at 17:50 and K279 stage 1 at 18:20; the coordinator carries the running agents' rules edits into the topic
files at their merges. Then, as code slots free up:
1. The round's phone pass (K156): the 01:53 pass on head 81d31a5 (K79 B,
   K122, K147, K81, K80 stage 1, K104 stage 1c, K155, K140, K154, K169
   and K180 against base ab6d330) is done (K197 filed), and so is round
   2026-10-14b's (10:12-10:42, head 48da84d, with looks for K146, K151,
   K148, K198, K100, K93 and K120; K232-K234 filed), and so is round
   2026-10-14c's (18:53-19:37, head 02194b4: K279, K268 and k140 looks;
   merged at 19:48). The next window covers K98 and K92 and the frames,
   on the portrait floor K253 installed at 21:24 (459cc11).
2. K80's real-time chase, its own mode (Levi, about 15:30: "I really
   want the real-time prototype... Do implement it."): stage 1 merged in
   5fed5c1, and its controls (K174, Levi's answers of 2026-10-14 about
   11:10) in ecf2169..6ec8275 (12:53); roamPull's strength is K245.
   K324 (2026-10-14 22:05) adds a telegraph, pauses at every junction
   and more controls.
3. K146 + K151 and K148 + K149: merged 2026-10-14 (b9cf882, fcc402b).
4. K120: merged 2026-10-14 (0acbce0).
5. K90 stage 1b: merged 2026-10-14 (feb12a0, flag off); Levi's call
   (ship, tune or stop) is in Waiting on Levi.
6. K132 and K100: merged 2026-10-14 (402eb4b, 458e1e5).
7. K93 + K145 (`docs/design/K93_K145.md`): merged 2026-10-14 (ed8f284,
   06edef4..56b6f2d).
8. K92 + K224: merged 2026-10-14 (e78ddcc). K111 stage 1 (the panel):
   merged 2026-10-14 (0e5a138..9c6cab3), and its stage 2, the highlight
   modes, at 13:03 (36d280a..5438a60); Levi picked at about 13:28, and
   stage 3 built the pick (K248), merged at 14:58 (365bc45..6588ec0).
   Levi answered its calls at 15:46: K237 as built, and stage 4 (K264's
   width slider, K265's High contrast prototypes) runs from 17:53
   (`docs/design/K111.md`, 0faad0e; K264's handle).
9. K98: merged 2026-10-14 (f5982cd); its default size waits on Levi (K225).
10. Levi's answers of 2026-10-14 about 11:10 (placed here by the
    coordinator; Levi may reorder): K174's controls (merged 2026-10-14
    12:53, ecf2169..6ec8275), K198 stage 2 (merged 2026-10-14 14:03,
    96fa13a..af0f054), K191's
    fade-out (merged 2026-10-14 12:04, fafa340..3467117), K235 with K239
    (merged 2026-10-14 12:44, 08d1383..05e6d4d), and K193's portrait
    emulation (merged 2026-10-14 14:10, c36b57c..763067a; its portrait
    floor installed at 21:24 in 459cc11, K253).
11. K76 stage 2, in four stages (`docs/design/K76.md`, bcb969e): 2a (the
    re-base, the model, the paint variant) merged at 14:15 and 2b
    (crossing gaps and junction joints) at 16:04 (3ffed34..8d671ba).
    K268 stage 1, the shaped gaps Levi asked for at 15:16, merged at
    17:50 (1e55365..61c8859; `docs/design/K268.md`). 2c and K268 stage 2
    come after the physics worker (K7, below this list), one at a time
    and never alongside K298, K299 or K111 stage 5 (K265), since all of
    them change the paint shaders (K111 stage 4 merged at 19:11 and took `uKBase.y` and
    `uKGold.w`); then 2d, each from the handoff before it. 2c's codec removal
    is version 6, since
    K111 stage 3 took 5 (the codec note in
    `docs/design/K76_reveal_mode.md` still says 5).
12. K80's turn-aligned hunter, a modifier of the normal maze, in four
    stages (`docs/design/K80_turns.md`, 7699995; four since 67c8cb0):
    stage 1 (the model and the mode) merged at 15:19 (0047148..68524e1);
    stage 2 (K269's retune, K278 (c), K273's catch resets, K272, section
    2.9's stats with a `STATS` line each, K283's banner check) running
    from 17:40; then stage 3 (the final telegraph, the catch feedback
    with K270, sound and fog, the wait key and pad, the contact sheet)
    and stage 4 (Abbott's puzzle mode, with Abbott's Theseus and the
    Minotaur rule in `RESEARCH`, K277); then K137's toggles, K138's M
    mechanisms and K139. Stage 3 follows K323's game-mode design (the
    minotaur's rows move into the Game folder).
13. K114's round 2, free play first: the burn race in four stages
    (`docs/design/K114_burn.md`). Stage 1 merged at 16:35
    (801c22b..ba6d574); stages 2 (real-time burning), 3 (the look, with
    K290's burnt toggle, after K76 2c and K268 stage 2) and 4 (the daily)
    follow, each from the handoff before it and never
    alongside another agent changing how a tap becomes a turn. Then the
    spider (its own enemy; Levi, 2026-10-14 about 11:10).
14. K74 stages 3 and 4, each after the one before. Stage 2 merged at
    16:13 (4d3efe6..faa9a52); stage 3's brief comes from its handoff
    (`docs/design/K74.md`).
15. The GPU pipeline: K8 (G3-0 + G3-1 first) and K23, then K9 (G4) and
    K42. K90's spline fix touches K8: never run the two at once.
16. K115's builder stages (no stage 1a: Levi, about 15:30).
17. K116, lowest priority.
18. K144, accounts and shared stats, after everything else (a stretch
    goal).

Waiting for Levi: K90's bend bound (Levi tests it live); the G3-3 and
G4-2 old-path deletions; K162 and K184-K186 (play, then call); K194's
defaults (after playing); K225 (the markers' size); K229 (the open
panel's top); K238 (K111's calls);
K241, K244 and K245 (a reset's web fade, quiet cores, the roam pull);
K251 (the displaced disc's slide across the panel); K257 (K76's
questions for stage 2c); K260 and K261
(the burn race's
calls 2-4, and K74 stage 2's calls, built as recommended); K280 (the
fire's heat); K282 (an explanation for the HUD's stats during play);
K323 and K324 (the game modes'
fourteen questions, sent at 23:22 with K257, K286 and K288 in one
questions file);
near launch, K117 and K210; after the churn, K46, K57 and
K84. The 2026-10-14 email (08:25, plus 10:11; the draft is in
`.claude/probes/levi_email/`, untracked) was answered in session at
about 11:10 for calls 1-7 (K114 call 7, K174, K191, K193, K194's 5.2,
K198 and CC39); 9.1 (K225) and 10.1 (K229) are still open. A second
email (16:45; `2026-10-14b_waiting.*` there) explains the fifteen items
Levi listed at 16:06 (K225, K229, K238 with K240, K241, K244, K245,
K251, K260 with K280, K261, K194, K162, K184-K186 and K90): 32 calls,
answered by number.

K7 (the physics worker) comes next, ahead of K76 2c and K268 stage 2
(Levi, 2026-10-14 about 19:00: "1. Yes."). Its design merged at 20:10:
five build stages, in order (`docs/design/K7_worker.md`, "Build
stages"). K5 and K6 are not needed first and come after stage 5, with
K24. Stages 1 and 4 own `main.ts` (K298's small edits run beside stage
1). K307 (the intro's freezes; Levi, about 20:43: "Let's prioritize
this too.") traced them beside stage 1 (done at 21:39: cold shader
compiles; merged at 22:06), and its warm-up follows stage 1 and K298,
both merged. Stage 1 merged at 22:04 (deployed) and stage 2 runs from
22:14; all of K302's calls are yes. K313 (a loader that looks like the
maze; approved at about 21:20) follows K307's warm-up.

Game modes (Levi, 2026-10-14 22:05-22:12): K323 (a Game folder with a
Game mode dropdown), K326 (knot mode removed), K324 (the real-time
minotaur's telegraph, junction pauses and controls) and K327 (labels)
are designed together first (K323's handle), then built in stages that
never collide on `main.ts`, the panel or `src/ui/url_state.ts`. K80
turns stage 3 follows that design, since it shares the minotaur's rows.

## K339 (2026-10-15, moved to Waiting on Levi)

- **K339** · Audit and reorganize the settings panel (Levi, 2026-10-14
  about 22:48: "We should also audit the current list of settings in
  this panel, and reorganize them now. We should also consider whether
  any properties are worth removing now, or combining/refactoring. We
  should also plan to do this again when we're all done iterating
  through all these designs."): an inventory of every row from a tracked
  script (K341 reruns it), findings, a proposed tree, removals and
  merges with their codec cost (folded into K323 stage 1's bump), and
  K340's nested-folder look. Design only; the rebuild ships with K323
  stage 1.
  - owner: agent a2f8f74cd5425c4ef (opus) of claude session d8031183,
    from 22:54 (cap 00:54; ports 5880-5889; docs and scripts only),
    with a sonnet helper.
  - branch: `worktree-agent-a2f8f74cd5425c4ef`
    (`.claude/worktrees/agent-a2f8f74cd5425c4ef`, from 7effaae); last
    commit: `9aeb7bb` (WIP: the inventory script and table).
  - evidence: `.claude/probes/K339/` in its worktree (the looks' sheet
    in `sheet/`).
  - next: findings, the tree, the codec cost, the nested-folder sheet,
    questions and the build plan; then Levi's calls; then the rebuild
    with K323 stage 1.
  - brief: `docs/design/K339_panel_audit.md`.

## K257 (2026-10-15, closed)

- **K257** · K76 section 10's questions, for stage 2c (none blocks 2b;
  2c builds the recommendation where no answer has come): (1) a catch
  under thread reveal re-hides explored thread as `minoRefog` says, one
  setting for both modes (rec.); (2) the minotaur shows through hidden
  thread under `minoFog`'s setting (rec. yes); (3) a catch mid-run
  shows that run only up to the dot (rec. yes, as the fog does); (4)
  pulses and the hover glow on a fading stub fade with the thread (rec.
  yes; 2a multiplies alpha); (5) `pulseReach` is clamped to
  `revealDistance` (rec. yes); (6) explored runs keep their section
  colors while the K93 trail fades on its own (rec. yes); (9) reduced
  motion stills the beacon's breath; under High contrast the halo and
  the dots draw at full strength in pure white (rec.). Asked in session
  2026-10-14 14:19. `docs/design/K76_reveal_mode.md` section 10.

## K286 (2026-10-15, closed)

- **K286** · K268's draw order in a fading crossing (thread reveal):
  stage 1 cuts the under thread by the over thread's coverage everywhere,
  so while a crossing fades, whichever thread was drawn first shows
  through the partial cut, as 2b's fade and the intro already do. The
  alternative keeps the full over/under silhouette once the over thread
  is more than half visible and fades only its casing. Built: the first
  (rec.: keep it, the proof's ideal). `docs/design/K268.md` ("Stage 1
  design", Calls).

## K288 (2026-10-15, closed)

- **K288** · K279's picks from the plucks sheet (sent 2026-10-14 17:52;
  `.claude/probes/K279/sheet2/`): the ripple look (off, wave, glint,
  ring; built default wave) and its strengths (a tap's `prs` 1, an auto
  pluck's `pra` 0.35), the sheen (`psh` 0.5), the tug (`ptg`, off by
  default since the wake check, K279; built at 0.3), the vibration
  (`psz` 2, `pgh` .5, `pw` .75 against master's 1.75 / .35 / .5) and the
  auto-pluck volume (`pag` 0.5, -6 dB); and whether the wave keeps
  bending the markers, trail and fog or bends the ribbon layer only.
  Live since 18:20:
  `?7&prp=wave` (glint, ring, off), `?7&prs=2&pra=1`, `?7&psh=1`,
  `?7&ptg=1`, `?7&pag=1`. `docs/design/K279.md` ("Stage 1 handoff").
  The phone (round 2026-10-14c, stills at 411x753; sheets sent at 19:54,
  `.claude/probes/rounds/2026-10-14c-0e865bf/k279_shots/` and
  `k279_shots2/`): every look holds 60 fps through a tap; glint reads
  best, ring faintly, the wave not at all (its ring is about 41 CSS px
  across, its bend 1.6 px; K289 (d)), vib close to the old look, sheen a
  paler streak; motion needs his eye on the phone. `ptg=0.3` stutters
  3-5 s at 5-12 fps there, so the tug stays off. Levi, 22:32: "What?";
  re-explained at 22:45, recommending glint as the default look, the rest
  as built, and the wave (when picked) still bending the markers, trail
  and fog.

## K279 (2026-10-15, owner and next replaced)

  - owner: nobody since 2026-10-14 18:20 (stage 1 merged; stage 2 waits on
    Levi's picks, K288). Its agent abf68d906aaae3609 of session d8031183
    finished; its worktree is kept, and the pre-rebase history is the
    local branch `k279-stage1-prerebase` (88ae781).
  - next: Levi's picks (K288), then stage 2 builds them. The phone pass
    ran in round 2026-10-14c (K289 (h) closed): every look holds 60 fps,
    and `ptg=0.3` stutters 3-5 s at 5-12 fps, so the tug stays off.

## K8 (2026-10-15, rewritten)

- **K8** · G3: SDF ribbons drawn from one shared sample texture
  (`docs/design/G3G4_sdf_geometry.md`). Defaults: anchored tails keep
  flat caps, phones stay at a 2x resolution cap. Over-tight folds keep
  today's pinch, not the doc's filled lobe (Levi, 2026-10-13: "Pinching
  is probably better"): shrink the per-sample radii to the local bend
  radius inside the CPU-flagged fold windows. K90 aims to make such
  folds physically impossible. Fold in G1's GPU levers: a loop-free protect test
  (about 0.15 ms of register pressure at 3200x1800), a zoom-aware
  polyline tolerance, a per-point far-branch gate, and dropping the
  globals fetch. K7's design (2026-10-14): dense (5448 particles) is
  render-bound at about 30 fps (render alone 31-34 ms), so the worker
  does not fix it. K302 (6) put that to Levi as a priority call; his
  "Yes." is read as noted, so K8 keeps its place.

## K8 (2026-10-15, moved to In progress)

- **K8** · G3: SDF ribbons drawn from one shared sample texture
  (`docs/design/G3G4_sdf_geometry.md`). Stage 1 (docs only) re-bases the
  doc's plan on today's master and writes G3-0's brief
  (`docs/design/K8_stage1.md`); G3-0, the data plane, takes the next free
  code slot. Decided: anchored tails keep flat caps, phones keep a 2x
  resolution cap, over-tight folds keep today's pinch (Levi, 2026-10-13:
  "Pinching is probably better"), and G1's GPU levers fold in. Dense
  (5448 particles) is render-bound at about 30 fps, which K7 doesn't fix.

## K344 (2026-10-15, closed)

- **K344** · A sharp cusp in the pluck vibration on a self-crossing loop
  (Levi, 2026-10-14 about 23:04: "There's a sharp discontinuous cusp
  with the vibration effect on this loop along the bottom of the loop.
  Can we fix this general problem?"; on the LAN dev server,
  `?qoietk.KIiHgRRXwRlRt8fGrST4sf`; his inspect: crossing 104, chain 21
  crossing itself, over at ctrl 102 and under at ctrl 110.205). The fix
  covers the general case, not this loop alone. One opus stage in the
  confetti stage's slot: `docs/design/K344_pluck_cusp.md`.
  - owner: agent a67c6d4d11a9ea6b4 (opus) of claude session d8031183,
    from 23:30 (cap 01:30; ports 5890-5899).
  - branch: `worktree-agent-a67c6d4d11a9ea6b4`
    (`.claude/worktrees/agent-a67c6d4d11a9ea6b4`, from 79c5a97); last
    commit: `79c5a97` (master; none of its own yet).
  - evidence: `.claude/probes/K344/` in its worktree.
  - next: reproduce on Levi's link at 1400x900, measure the cusp's
    geometry, fix the general case with a test that fails first, the
    after sheet, lore and the handoff; then the merge.
  - brief: `docs/design/K344_pluck_cusp.md`.

## K279 (2026-10-15, stage 2 launched)

- **K279** · Plucks you can see, feel and hear (Levi, 2026-10-14 about
  16:11 and 16:12, verbatim: "I want to make plucks visualizations more
  emphasized. Can we add a new non-physics-based shock-wave/ripple sort
  of undulation sort of effect around pluck points? This should be made
  more subtle around autoplucks than player plucks. Also, I wonder if
  there is something else more we can do to show the plucked segment
  vibrating. Maybe add a bit of the physics-based tug to it as
  well,.and also increase the default visual vibration effect?" and
  "Also, I want manual plucks to be louder than auto plucks"). Stage 1
  prototypes each ask behind params (a ripple dropdown with a weaker
  auto-pluck strength, more vibration looks, a physics tug for player
  plucks, a stronger default vibration, an auto-pluck gain) and shows
  Levi a sheet; stage 2 finishes what he picks. Stage 1 built all six
  behind ten daily-exempt params (seven codec appends; the vibration
  defaults rose to `psz` 2, `pgh` .5, `pw` .75) and the sheet, sent to
  Levi at 17:52 (his picks are K288, the residuals K289). Merged
  2026-10-14 18:20 (50c1aab..ad2618a, 925 tests; codec rows 121-127) with the
  tug off by default (`ptg` 0; `&ptg=0.3` is the built strength): the
  follow-up timed a tap with the tug, a drag and a bare wake at the same
  7-9 fps on an idle desktop, the physics' own wake cost (K16), with no
  wake-path bug.
  - owner: nobody since 2026-10-14 23:55; stage 2 is ready to launch
    (K288 picked). Stage 1's worktree (agent abf68d906aaae3609) is kept.
  - branch: mainline; last commit: `ad2618a`.
  - evidence: `.claude/probes/K279/` (copied at the merge): the sheet in
    `sheet2/`, the wake probe `k279_wake.mjs` with `wake.log` and
    `wake/wake_1400x900x2.json`, `test_run5.txt`; stage 1's neutral A/B
    was 0 px in 6 cases.
  - next: stage 2 builds K288's picks (glint the default `prp`); check
    it against K344's pluck-overlay fix first. Phone: 60 fps in every
    look; `ptg=0.3` stutters, so the tug stays off.
  - brief: `docs/design/K279.md` ("Stage 1 handoff", "Wake follow-up").

## K7 (2026-10-15, stage 3 merged, stage 4 launched)

- **K7** · Physics in a Web Worker, with render-side interpolation between
  physics steps. Smooths the UI; it does not speed up physics. Acceptance
  includes K28: the intro runs at full frame rate WHILE physics settles
  (no settle-first loader wait). K147's per-frame budget is the
  main-thread interim (a smooth intro over a slow-motion settle); the
  worker gives the settle a whole core. Levi asked when it lands
  (2026-10-14 about 18:56), approved it as the next build at about 19:00
  ("1. Yes."), ahead of K76 2c and K268 stage 2, and asked at about 19:01
  whether the intro will then run at normal frame rates; the design
  answers that with numbers.
  - The design (merged 2026-10-14 20:10, 0c3c694..eab4287; desktop,
    measured on 0d88091): the daily's intro at about 56 fps instead of
    22.7, smooth but not a locked 60; its two freezes (2.7 s at 1.1 s,
    2.0 s at 3.8 s) stay, since they happen with physics paused too
    (cold shader compiles, traced by K307); the first sleep at about 12 s
    instead of 20.7; drags at gs 18 at 55-60 fps instead of 7, in 0.76x
    real time; dense render-bound at about 30 fps (K8); the phone likely
    40-60 fps, unproven until stage 5. Transferred buffers (no SAB, no
    COOP/COEP), a mirror ParticleSystem on main, fallbacks on error or a
    3 s timeout. Levi's 11 calls: K302, all yes (2026-10-14 21:18).
  - stage 1 (the in-thread physics host) merged at 22:04
    (67c0604..e0980b5, deployed): `PhysicsHost`, `PhysicsCore` and
    `InThreadHost` in
    `src/physics/physics_host.ts`, `grabAt`, `buildSceneGraph` in
    `src/core/scene_graph.ts`, every physics write in `main.ts` through
    `host` (`ps` is a read alias), and the guard
    `test/physics/host_seam.test.ts`. 941 tests pass, no snapshot moved,
    and the hidden loads end bit-identical to master's. The A/B matched:
    the daily's first sleep 20.96/20.68 s against master's 20.68/20.66,
    drags 7.0 fps on both, the knot's first sleep 16.69 s against 16.56.
    Residuals K314 and K315.
  - stage 2 (the worker core, in Node) merged at 23:21 (86708b4..472ef83): the
    step split into `beginFrame` and `runSubstep` (identical bits, the
    same speed within noise), `src/physics/snapshot.ts` (40,936 bytes at
    `?7`), `MirrorSystem` (`src/physics/mirror_system.ts`) and
    `PhysicsWorkerCore` (`src/physics/physics_worker_core.ts`), its clock
    per Design 4. 973 tests pass and no snapshot moved; the worker core
    and `InThreadHost` run bit-identical in lockstep on every frame. Its
    departures from the brief and its "For stage 3" list are in the
    brief's "Stage 2 handoff". Residual K346, idea K347.
  - owner: agent a9f593eca9038e6d3 (opus) of claude session d8031183, stage 3
    from 23:22 (cap 01:22; ports 5792-5795).
  - branch: `worktree-agent-a9f593eca9038e6d3`
    (`.claude/worktrees/agent-a9f593eca9038e6d3`, from 472ef83); last
    commit: `472ef83` (master) until its first WIP commit.
  - evidence: the design's `.claude/probes/K7/design/`
    (`k7_results.jsonl`, `frames/`, `summarize.mjs`, `run_k7.ps1`,
    `k7_frames.mjs`, `transport/`, `spike/`); stage 1's
    `.claude/probes/K7/stage1/` (`load_probe.mjs`, `input_probe.mjs`,
    the A/B); stage 2's `.claude/probes/K7/stage2/` (`results.md`, the
    split timing) and `test/physics/physics_host.test.ts`,
    `snapshot.test.ts` and `fabric_scene.ts`; stage 3's probes under
    `.claude/probes/K7/stage3/` in its worktree.
  - next: stage 3 (the worker in the browser behind `phw`, off by
    default), then 4 and 5. Stage 3 checks that pre-settle slices
    answered from a `settled` message arrive a frame late. Stage 4 also
    attributes the main-thread JS that K307's trace left unexplained
    (about 86 ms in the first freeze, 47 ms in the second, and an
    80-96 ms frame at about 6.1 s). Stages 1 and 4 own `main.ts`; stage 5
    needs the phone.
  - brief: `docs/design/K7_worker.md`, "Stage 2 handoff" and "Stage 3:
    the worker in the browser, behind `phw`".

## K339 (2026-10-15, shortened by the diet)

- **K339** · The settings panel's audit, merged in dc4a1a7..2ee40a4:
  four calls, each recommended yes (sent 2026-10-15 00:06), listed in
  `docs/design/K339_panel_audit.md` ("Questions"); the subfolder looks
  are in `.claude/probes/K339/sheet/K340_sheet.png`. They build as
  K323's Stage A.

## K261 (2026-10-15, shortened by the diet)

- **K261** · K74 stage 2's two calls, built as recommended (merged
  2026-10-14 16:13; Levi may change either): (1) the H-cut share's
  default is 1, the largest share that keeps decision 1's greedy bar on
  dailies 1-80 (exactly: 15.0% within 1.5x; taps per solve 4.76 ->
  1.31), which is also the "1 regardless" option; dailies 81-240 miss
  the bar at every share, share 0 included; (2) a partial share cuts an
  even stride in strand order (not smoothest corners first, or nearest
  the exit first; at share 1 the order doesn't matter).
  `docs/design/K74.md` ("Stage 2 handoff", "Calls for Levi").

## K260 (2026-10-15, shortened by the diet)

- **K260** · The burn race's calls 2-4 (K114), built as recommended
  (stage 1 merged 2026-10-14 16:35; Levi may change any; the 16:45
  email's section 8): (2) Reset path with the fire on restarts, the
  fuse relit; (3) the fire and the turn-aligned minotaur are mutually
  exclusive (the panel turns one off; a link that sets both plays the
  minotaur, K281 (g)); (4) fog stays its own param, and R.6.1 backs it:
  on dailies 1-30 the fire bites without fog (80-100% of the optimal
  route's wins come within a run of the fire at r 0.75-0.9), while a
  fogged explorer is trapped on 90-97% until stage 3 models the fire's
  light. Levi answered 1, 5 and 6
  on 2026-10-14 at about 15:46 as recommended (verbatim: "Burn race:
  banne is good. Reset the level when burnt." and "5 and 6 sound
  good."): (1) a loss shows a "Burnt" banner, then restarts with the
  fuse relit; (5) the HUD shows the fire's lead in its own units (x10,
  so 9.2 reads 92; the share line is stage 4's); (6) `sparks` waits for
  stage 4. His catch-reset toggle for the minotaur is K273. He answered
  call 7 on 2026-10-14 at
  about 14:46 (verbatim): "Burn race: we should probably have a fire
  effect show at the start, but only actually start moving it after the
  player makes their first move. Will we have a toggle for turn-aligned
  vs realtime burning? I think we should!" So stage 1 shows the lit fuse
  from the load, and stage 2 builds real-time burning behind the fire's
  own toggle, `fireClock` (`clk=realtime` is the real-time chase).
  `docs/design/K114_burn.md` ("Calls for Levi").

## K280 (2026-10-15, shortened by the diet)

- **K280** · The burn race's heat (K114; the 16:45 email's 8.4): the
  default `fireSpeed` r and `fireDelay` h. Built: r 0.75, h 0, which
  stage 1's agent calls hot. Its full-view players, taking a wrong arm
  with chance 0.1 / 0.2 / 0.3 at each junction, are trapped at h 0: r 0.5
  7 / 28 / 55%, r 0.6 16 / 43 / 64%, r 0.75 33 / 61 / 80%, r 0.9 54 / 81
  / 91%; a delay of 10 or 20 takes the near miss from careful play. The
  agent recommends r 0.6, h 0. `docs/design/K114_burn.md` ("Stage 1
  handoff", "R.6.1: the measurement and the verdict");
  `.claude/probes/K114/burn/results_tuning_rebased.md`.

## K282 (2026-10-15, shortened by the diet)

- **K282** · The HUD's stats have no explanation during play: the HUD is
  `pointer-events: none`, so its rows (the fire lead among them) are
  explained only on the end banners and in the daily stats legend
  (K274). Options: an info button in the panel, a long press on the HUD,
  or leave it (rec.: leave it; the banner that ends a run explains every
  row the HUD showed). `docs/design/K274_K277.md` ("Stage 1 handoff").

## K251 (2026-10-15, shortened by the diet)

- **K251** · On the phone, a displaced edge indicator crosses the open
  panel during its 0.25 s slide to its panel-offset place (K198 stage 2,
  merged 2026-10-14). Keep the slide, or fade the disc out and back in
  instead? Sheet `.claude/probes/K198/stage2/out/contact_sheet.png`;
  `docs/design/K198.md` ("Stage 2 handoff").

## K245 (2026-10-15, shortened by the diet)

- **K245** · How hard should the minotaur roam toward the player
  (K174's call)? `minoToward` (on) sets roamPull 0.5: on the K80 sim 63%
  of games meet it and a game averages 1.68 catches; 0.25 gives 60% and
  1.62, 1 gives 66% and 1.94. Keep 0.5 or pick another, and should the
  strength get a slider (none was built; `mtw` is on or off)? Meetings
  top out near 2/3 because about a fifth of solves finish inside 30 s.
  `docs/design/K174.md` ("Stage 1 handoff"), `gameplay-minotaur.md`.

## K244 (2026-10-15, shortened by the diet)

- **K244** · Should auto plucks and a drag's release go silent in
  junction cores too (K235's call)? K235 silenced taps there, but the
  random and music modes' plucks and a drag's release can still land in
  a core and sound with nothing drawn. Its agent left them: auto plucks
  are the instrument and sound whatever the geometry, and a release is a
  real tug with its own snap-back. A tap on a degenerate lobe
  (`skipOther`) also still sounds (none in 7752 probe taps).
  `render-pluck.md` (K235).

## K241 (2026-10-15, shortened by the diet)

- **K241** · Should a reset's gold webs fade out too (K191's call 1)?
  As merged, a backtrack fades a web out over 0.25 s, but a web that
  leaves the routes as it stops being full (a reset, a string-mode
  switch, the trail aging out, a path backing off the junction
  entirely) drops at once with its arms' gold, as before K191, and a
  fading web that loses its last route mid-fade pops. A fade there needs
  the shader to blend a non-routed record (a second base for it), or the
  arms' gold kept alive through the fade. `docs/design/K154_K169.md`
  ("Stage 2 handoff").

## K238 (2026-10-15, shortened by the diet)

- **K238** · K111 stage 1's calls (merged 2026-10-14 11:58), for review:
  (1) High contrast wears a black page (`background` none,
  `backgroundBase` #000000), the pastel palette, a yellow route
  (#ffff00), fade 0, a gap of at least 0.12 and markers of at least 1.5;
  not overridden: `threadWidth` (it would change the simulation),
  `colorScheme`, `junctionBlend`, `gamutArc` and the fog's look; (2) the
  Accessibility folder is the panel's first, open by default; (3) the
  "Reduced motion" box drives the Motion setting; (4) a viewer whose OS
  asks for reduced motion now also gets a still flow. The table:
  `docs/design/K111.md` ("Stage 1 handoff"); screenshots
  `.claude/probes/K111/out/` (`desktop_hc_off_panel_open.png`,
  `desktop_hc_on_panel_open.png`, the `_panel_closed` and `_canvas`
  pairs, `desktop_both_on_panel_open.png`, and the same with `phone_`).

## K229 (2026-10-15, shortened by the diet)

- **K229** · K92 put the mode badge on its own row below the undo
  buttons while the panel is open (his spec), so the open panel now
  starts 90 px from the top on the desktop and 100 on phones (was 50):
  about 1.5 fewer visible rows on a phone. Accept it, or put the badge
  somewhere else while the panel is open? Screenshots:
  `.claude/probes/K92/out/phone_open.png`, `desktop_open_load.png`.
  Emailed 2026-10-14 10:11 as 10.1.

## K225 (2026-10-15, shortened by the diet)

- **K225** · The markers' default size (K98, merged 2026-10-14 10:03;
  sheet sent to Levi at 10:04): at `markerSize` 1.08 the markers are
  about 5 CSS px across on the phone (K83's were 14) and 12 on the
  1400x900 desktop, and the glyphs barely read. Keep 1.08, raise the
  default, or add a minimum on-screen size (K98 has no floor, so the
  slider means the same at every zoom)? Sheet:
  `.claude/probes/K98/sheet_k98.png`; lore: `render-markers.md`.
  Emailed 2026-10-14 10:11 as 9.1.

## K90 (2026-10-15, shortened by the diet)

- **K90** · A physical minimum bend radius, stage 1 (Levi, 2026-10-13:
  "ideally we'd have a more physics-based constraint to prevent loops
  from becoming too tight in the first place"). No thread folds tighter
  than half its width, so neither the pinch nor the filled lobe (K8)
  ever shows. Stage 1: a census of over-tight folds on the rendered
  centerline (fresh, gestures, violent play), then prototypes behind a
  flag that defaults OFF (not a codec param), and
  `docs/design/K90_bend_radius.md` with a recommendation. Guards: the K63
  sleep battery, the kink-eye censuses, the gesture battery, and the
  knot-mode golden (byte-identical with the flag off). Same-chain
  collision skips +-2 ctrl, so it cannot catch folds that short.
  - stage 1a MERGED in 6f97b92..ac5b880 (2026-10-14 07:32; no behavior
    change).
  - stage 1b MERGED in 10ddcac..feb12a0 (2026-10-14 09:03; flag off, no
    behavior change; 689 tests). The folds are the Catmull-Rom's own
    overshoot at the particle polyline's corners. A render-side bend
    bound (`boundBend`, `src/geometry/spline_generator.ts`: 1.2 h, each
    sample moved at most 0.5 h, 3 passes, a hard clamp or an optional
    soft one) takes fresh windows under 1.0 h from 2357 to 10, for +5-9%
    per ribbon rebuild. Try it live: `__knotSplineBend(true)`.
  - Levi's call (sent 2026-10-14 about 09:05 with the sheet
    `.claude/probes/K90/out_1b/sheet/sheet.png`): ship, tune or stop;
    default on or off; hard or soft clamp. Before it ships: K213.
  - Levi, 2026-10-14 about 09:20: he can't tell from the sheet and will
    test it live later (desktop console at levi.dev/knotmaze/:
    `__knotSplineBend(true)` / `(false)`). Told him no visible bug
    started it: K90 came from G3's filled-lobe-or-pinch question (K8),
    and the old seam (P3.34) stays fixed by the miter clamp. The
    coordinator recommends stopping it.
  - record `docs/design/K90_bend_radius.md`; handoff `docs/design/K90.md`
    ("Stage 1b handoff"); evidence `.claude/probes/K90/out_1b/`. Never
    alongside K8 (the same fold definition).

## K210 (2026-10-15, shortened by the diet)

- **K210** · Near launch: since K132 a daily is today's `PARAM_DEFAULTS`,
  so a deployed default change moves that day's maze mid-day (a stale tab
  and a fresh load differ; saved attempts are refused, results stay).
  Re-pin the daily to a frozen definition at launch, or accept it
  (`docs/design/K132.md`, Stage 1 handoff).

## K194 (2026-10-15, shortened by the diet)

- **K194** · K180's calls (`docs/design/K180.md`, "Stage 1 handoff";
  play: https://levi.dev/knotmaze/?7&pw=1&pcx=ride&pgl=fallback): (1)
  the defaults once you have played: crossings `through` (built; the
  census favours it), and the glow `off` (built) or `fallback`; (2)
  should sound-only taps in junction cores glow under fallback (21 of 284
  fabric taps get none now)? Its agent's calls: the 0-1.5 range; fallback
  decides once, at pluck time and zoom, and keeps W; `instead` and `with`
  light the glow even at pw 0; still plucks ignore all three params.
  - if fallback becomes a default: time `peakEstimate` under the perf
    lock and on the Pixel (unlocked on the desktop: 0.79-1.17 ms a tap at
    desktop size, 1.75 ms at phone size, `.claude/probes/K180/sheet*.log`;
    deduplicating its times halves the work).
  - 2026-10-14 about 11:10 (email 5.x): 5.1 "haven't tried yet" (still
    open); 5.2 "I think nothing makes sense": junction-core taps get no
    glow, as built. Levi asked whether those taps sound ("Probably
    shouldn't"): K235 silenced them (merged 2026-10-14 12:44), so
    call (2) is moot.

## K162 (2026-10-15, shortened by the diet)

- **K162** · K147's calls (`docs/design/K147.md`): (1) the trade: the
  first settle now plays in slow motion (first sleep 11.6 -> 21 s; at 4x
  CPU throttle 40 -> about 100 s) for a smooth intro (p95 159 -> 31 ms;
  719 -> 159 ms at 4x) with the knot on screen at 2.6 s instead of 4.3 s;
  (2) the defaults, `settleBudget` 12 ms and `loadSettle` 0.45 s (its max,
  5, settles first); (3) whether both stay daily-exempt; (4) whether drags
  at gs 18 get a budget too (165-170 ms frames, sim/wall 0.6).
  - 2026-10-14 about 00:22: Levi will test it later (item 7). He asked
    whether the web worker changes this; answered in session: K7's worker
    would keep frames smooth whatever the physics costs, and K7 is not
    scheduled.
  - On the phone (K156 3c, 2026-10-14): the first sleep came at 17.5-21.6
    s on both load links, the default and `gs=18`, so the settle budget,
    not the maze, sets it.
  - K7's design (merged 2026-10-14 20:10): (4) becomes moot once the
    worker ships (close it then); K147's budget retires in worker mode at
    K7's stage 5, and `stb` stays for the in-thread fallback.

## K184 (2026-10-15, shortened by the diet)

- **K184** · K155's star calls (`docs/design/K155.md`, "Stage 1
  handoff"; play: https://levi.dev/knotmaze/?7): (1) greedy solves:
  exactly two stars (built: two up to 4x, which 52-53% of greedy solves
  earn) or at least two (the line moves to about 2.5x)? (2) catches cap a
  finish at two stars (built), or each catch takes one star off (the
  real-time two-star share goes 47% -> 33%)? (3) the banner shows "2.2×
  the shortest route" (built) or a percent?

## K185 (2026-10-15, shortened by the diet)

- **K185** · The still pluck's cold-link stall: the first time reduced
  motion is switched on in a fresh profile, the still pluck's shader
  program links on the spot, about 340 ms. (a) Accept it (recommended),
  (b) `KHR_parallel_shader_compile`, or (c) warm it at load (+340 ms to
  the load)? (`docs/design/K104.md`, "Stage 1c handoff" step 6)

## K186 (2026-10-15, shortened by the diet)

- **K186** · K140's confetti calls (`docs/design/K140.md`, "Stage 1
  handoff"; play: https://levi.dev/knotmaze/?7, `&cfa=3` for the most):
  (1) reduced motion: no rain and a 40% slow spray
  (`reduced_phone_1b_spray.png` in K140's probes), or no confetti? (2)
  confetti on every win banner, including a reload of a solved attempt
  (`pendingWin`, `src/main.ts` about line 2079) and the Reset path during
  the winning move, or only on a live finish? (3) the colors (a festive
  set built from the gold 0xffd23f) and the default amount, 1?

## K323 (2026-10-15, shortened by the diet)

- **K323** · A Game folder (Levi, 2026-10-14 about 22:05: "I was
  expecting something like "gameMode" with dropdown values like
  classic/minotaur/..., and then with a additional conditionally-shown
  mode-specific controls like a realtime checkbox... Probably "Game" or
  "Gameplay" or "Game mode" should be a separate group."). Designed
  22:14-22:44 (`docs/design/K323_game_mode.md`, merged as 091e4dc): a
  `gameMode` param (`gm`: classic, minotaur, burn) heads a new Game
  folder after Design, each mode's rows shown only under it; `clk` is
  read through `clockOf(p)`; one codec bump, 5 -> 6 (7 if K76 2c bumps
  first), in which `mt` loses `off`, `fire`, `mazeFabric` and
  `snappiness` leave, and `mtw` becomes K324's `minoPull`; old key=value
  links infer the mode; K263's `undoAllowed` goes or takes the mode.
  Section 6's questions 1, 3 and 4 (the folder's place, fog into Game,
  the labels) moved into K339's audit; 2 and 5-8 (real time as a
  checkbox, burn race as one option, the models in real time, dailies
  stay classic, knot mode gone) were sent at 23:22. Stage 1 (the codec,
  the folder, the labels) is built with K339's rebuild after the
  answers, and coordinates its bump with K76 2c. Levi took 2 and 5-8 as
  recommended (2026-10-14 about 23:55). Stage A is stage 1 plus K339's
  rebuild (labels, width, merges, Developer, Reset at the root); it runs
  after K339's calls, once K7 stage 3 and K76 2c merge, and takes codec
  7 (2c takes 6) unless the two land in one push. Its brief is still to
  write: fog rows and `moveSpeed` go in Game, not Maze as this design
  says, and the probes that open folders by title need updating
  (`k79b_smoke.mjs`, `k174_page.mjs`, `nested.mjs`, `labels.mjs`).

## K114 (2026-10-15, shortened by the diet)

- **K114** · Gameplay round 2 (Levi's notes, 2026-10-13) is designed
  in section R of `docs/design/K80_gameplay_additions.md` (9f0a9c3).
  Shortlist: the burn race (turn-based), the cut verb with an
  auto-walker ("Lead the walker" first), the beat rider, the spider, a
  Pluck Hero MVP. Ten calls in R.0: the first prototype (burn race), a
  `clock` param (turn | beat | realtime; with the beat rider), what a
  cut does (deletes the whole run), render + walk-graph cuts rather than
  splitting the thread, the cut gesture (a scissors button), healing
  cuts against monsters, the spider's form and an arachnophobia option,
  Pluck Hero as an MVP first, round 2 in free play first (the burn race
  as the first K46 modifier), and flow as a separate stat.
  - for the briefs: balance probes for "Keep it in" and burn-race
    tension; hiding runs needs an inverted reveal mask or per-run hiding
    (a new G2 term and its paint_math mirror, shared with K76), plus the
    cut's render details; `clock` brings timed, typed attempts (daily
    store v4; v3 since K146). R.7's sources are unverified leads from
    memory (the Pac-Man speed figures among them). K80 sections 1 and
    3.2 are stale
    since K101 (bracket notes added).
  - 2026-10-14 about 00:22: Levi took the recommendations for calls 1-6
    and 8-10 (`docs/design/levi_notes_2026-10-14.md` item 12: "Recs,
    plus a spider answer"). Call 7 waits: the spider's form (a
    `minotaur=spider` mode or its own enemy), its look, and an
    arachnophobia option (R.0 and R.3.2 of the design).
  - 2026-10-14 about 11:10, call 7 (email 1.x): 1.1 "yes" (build the
    spider; the design recommends it after the minotaur); 1.2 "separate"
    (its own enemy, not a `minotaur=spider` mode); 1.3 "sure, we could
    have a toggle in settings for no spiders, and then swap the icon to
    something else that makes sense" (an arachnophobia setting swaps its
    icon; the brief designs both icons).
  - the burn race's stage 1 MERGED in 801c22b..ba6d574 (2026-10-14
    16:35; 898 tests; deployed, run 38655008470): the turn-clock fuse in
    `src/game/fire.ts` behind `fire` (`fi`: off | fuse), `fireSpeed` 0.75
    and `fireDelay` 0 (codec v5 118-120) in a Burn race folder;
    smouldering arms refuse the tap, a trap shows the Burnt banner (Try
    again relights the fuse), and the HUD shows the fire lead, then the
    closest call. `clk=realtime` turns the fire off until stage 2. Its
    calls are K260 (built as recommended) and K280 (the heat), its
    residuals K281.
  - owner: nobody since 2026-10-14 16:35 (stage 1 merged). Its agent
    af79edbe2a4677ff5 of session d8031183 finished; its worktree
    `.claude/worktrees/agent-af79edbe2a4677ff5` is kept.
  - branch: mainline; last commit: `ba6d574` (stage 1's handoff).
  - evidence: the main checkout's `.claude/probes/K114/burn/` (copied at
    the merge: `results_rebased.md`, `results_tuning_rebased.md`,
    `shots_rebased/`, `burn_sim.ts`, `burn_page.mjs`).
  - next: stage 2, real-time burning behind `fireClock` (Levi's call 7),
    its brief written from stage 1's handoff, in the queue's order (item
    13). Stage 3's look belongs in a shader (per-run burn data, as K76's
    VIS items), carries K290's burnt toggle (char or gone) and models
    the fire's light under fog; stage 4's share
    line could use the exit margin `h + opt/r - walked`. K80 turns stage
    2 no longer waits for this. The spider after the minotaur's controls
    (K174).
  - brief: `docs/design/K114_burn.md` ("Stage 1 handoff"; stage 2's
    brief is to be written there).

## K74 (2026-10-15, shortened by the diet)

- **K74** · Maze design, decided (Levi, 2026-10-13 13:17; his answers
  verbatim in `docs/design/levi_notes_2026-10-13.md`): every mechanism
  gets params whose neutral value turns it off, so difficulty and feel
  stay adjustable. Design: `docs/design/K74_maze_design.md` (dad40f8).
  Four stages from `docs/design/K74.md`, each re-freezing the pins it
  moves and running the K63 sleep checks:
  - stage 1 MERGED in fbf5b5c..8ba0c32 (2026-10-13 about 16:25; it
    deploys): `exitClearance` 12; long-tail dead ends (`deadEndLength`
    20, codec v4 index 71; 0 = the old placement, byte for byte), on at
    density 0.5 for links and the daily. Greedy median 1.96x -> 3.12x
    optimal; every daily moved (saved attempts refuse cleanly). Results
    and pins: the brief's "Stage 1 handoff"; the delegated pick, for
    Levi to review if he wants:
    `.claude/probes/K74/out/K74_stage1_before_after.png`;
  - stage 2 MERGED in 4d3efe6..faa9a52 (2026-10-14 16:13; it deploys):
    H1, the fused arm cut (decision 4), on at `hCutShare` 1 (codec index
    117, not daily-exempt). On dailies 1-80, taps per solve 4.76 -> 1.31
    and the greedy median 3.12x -> 2.65x optimal, 15.0% within 1.5x
    (decision 1's bar, exactly); dailies 81-240 miss the bar at every
    share, share 0 included, so stage 4's trap search is needed either
    way. Every daily moved (#1 86.68 -> 97.11); saved attempts refuse
    cleanly. Its calls are K261, its residuals K278; results in the
    brief's "Stage 2 handoff";
  - stage 3: the trap-zone finish (corridor and taper, away flank) beside
    the empty zone, with params for which and how much (decision 2);
  - stage 4: the greedy-trap search at load (decision 6: about 60 ms
    median on the desktop, engine-exact; time it on the phone), K46's
    greedy bands as difficulty params (decision 7), then the target band
    (greedy >= 2.5x optimal, <= 15% within 1.5x; decision 1) checked at
    the defaults.
  - owner: nobody since 2026-10-14 16:13 (stage 2 merged). Its agent
    a2c61932e9e358104 of session d8031183 finished; its worktree is
    kept, as is stage 1's (`afe7e8d13a4b8112b`).
  - branch: mainline; last commit: `faa9a52`.
  - evidence: `.claude/probes/K74/` (stage 1: `out/analyze_stage1.txt`,
    `out/phys1.jsonl`, `out/verify_*.txt`, `out/k47_refuse.txt`, the
    sheet; the design's `out/scan_final.jsonl` and the hooked plan copy
    `proto_plan_src.ts`); the design agent's worktree
    `.claude/worktrees/agent-aeaf1e61bcecaaf0b` is kept. Fisher's books,
    Abbott's essays and Buck's book-only chapters are unverified (doc
    section 1). Stage 2's are in `.claude/probes/K74/stage2/` (sheets
    `out/K74_stage2_before_after.png`, `out/K74_stage2_closeups.png`).
  - next: stage 3, the trap-zone finish, with H1 at 1 and measured on
    dailies 1-240, plus H1's exit-clearance guard beside its corridor
    guard (K278 (a)); its brief comes from stage 2's handoff. K80's
    call 6 (Levi, 14:31:
    "Absolutely"): dead ends are the
    minotaur's hunting ground. Dead-end branches, several runs behind
    one bridge, would make deeper traps: a later K74 param, settled with
    K80's brief.
  - brief: `docs/design/K74.md` ("Stage 2 handoff"; stage 3's brief is
    to be written there).

## K80 (2026-10-15, shortened by the diet)

- **K80** · The minotaur, decided (Levi, 2026-10-13 14:31, verbatim in
  `docs/design/levi_notes_2026-10-13.md`; design
  `docs/design/K80_gameplay_additions.md` section 0, 17b729b). The
  telegraphed hunter, with the guard and stalker variants, and Abbott's
  rule as a puzzle mode (call 1); the telegraph on by default, as a
  param (call 2). Turn-aligned and real-time movement (call 3). In real
  time it has a wander pace and an approach pace, randomized pauses at
  junctions (maybe randomized paces), and detection starts and ends at
  distances measured along the threads to the player, not in runs.
  Every distance and speed is a param. A catch sends you back to the
  entrance and is counted (call 3). No undo with it, even in free play
  (call 4). A wait move only in turn-aligned mode (call 5). Dead ends
  stay its hunting ground (call 6). Dailies later (call 7: "Let's not
  worry yet"). The first music and rhythm experiment (call 8: "I do want
  to be able to play with alternate modes"). Section 5's order after it
  (call 9). Real time comes first, as a dedicated mode rather than a
  toggle on another (Levi, about 15:30: "I really want the real-time
  prototype. Maybe it's not a modifier of another gameplay mode, but
  rather a dedicated mode itself. Do implement it."); the turn-aligned
  hunter stays a modifier of the normal maze, later.
  - stage 1 MERGED in ae49553..5fed5c1 (2026-10-13 23:11; deployed): the
    `clk=realtime` mode and `src/game/minotaur.ts` (a 120 Hz fixed step,
    exact math, `replayChase`, `undoAllowed(clock)`; 15 tests); codec v4
    appends 84-98 (clock, playerPace, minoWanderPace, minoHuntPace,
    minoPaceJitter, minoPauseChance, minoPauseMin, minoPauseMax,
    minoDetect, minoLose, minoCatch, minoDeadEnds, minoRoam, minoWake,
    minoFog; legacy keys clk plp mwp mhp mpj mpc mpn mpx mdt mls mct mde
    mrm mwk mfg); `respawn()`, the marker and its glow, the panel's
    "Minotaur" folder, the HUD's caught row, a toast and an off-screen
    indicator; approachPace 8 -> 7 from the simulation. `clock` is not
    daily-exempt, so the dailies stay turn-based.
  - turns stage 1 MERGED in 0047148..68524e1 (2026-10-14 15:19;
    deployed): the turn-aligned minotaur behind `minotaur` (`mt`: off |
    hunter | guard | stalker; off by default) and eight tuning params
    (`msp mtg msi mro mtr mac mpa msl`; codec v5 108-116), in
    `src/game/minotaur_turns.ts`, an exact port of the research harness
    (0 trace mismatches in 9600 games). One accepted tap is one turn, a
    tap on your own junction waits, a catch respawns you at that tap,
    there is no undo (Reset path restarts), and a first-look telegraph
    draws a red line and a ring (`drawTelegraph`). 865 tests. Its catch
    rates on today's mazes are K269, its residuals K270-K272.
  - turns stage 2 MERGED in 86d404e..02194b4 (2026-10-14 18:50;
    deployed): the retune (K269: sight 4 -> 2 and accuracy 0.9 -> 0.3
    take the hunter from 18% / 36% of today's dailies, for an attentive
    explorer and one at 80%, to 1.0% / 13.1%); K174's real-time tests on
    H1 mazes (K278 (c)); the catch resets on both clocks (K273:
    `minoRestart` `mrs`, off, and `minoLair` `mlr`, on; codec v5
    128-129); roam and territory at least 1 (K272); close calls, seen and
    restarts with their `STATS` lines, the ox emoji for a caught move in
    the share grid and a minotaur tag in its title, and a catch caps the
    stars at two (2.9); K283's banner check passed. 934 tests. Its
    residuals are K293; per-model accuracy waits on Levi (K294).
  - owner: nobody since 2026-10-14 18:48 (turns stage 2 done and merged;
    it was agent a1579d5c460af2d20 of claude
    d8031183-cd9e-4b70-9968-661d70634c84, worktree kept). Turns stage 1
    was agent af5995f5900f0f945 and real time a9c90f15cd6a55710; both
    worktrees are kept.
  - branch: mainline; last commit: `02194b4` (turns stage 2 is
    86d404e..02194b4; its worktree
    `.claude/worktrees/agent-a1579d5c460af2d20` is kept). Turns stage 1
    is 0047148..68524e1, real time `5fed5c1`, K174 ecf2169..6ec8275.
  - evidence: stage 2's `.claude/probes/K80/turns2/` in the main checkout
    (the retune's sweeps and `compare_after.md`, real time's `rt/`, the
    banner check's `banner/`); stage 1's
    `.claude/probes/K80/turns/` (`compare.ts` with the harness copies
    and `compare_rebased.md`; `turns_page.mjs`, its logs and `shots/`;
    `k174_page.mjs`); real time's `.claude/probes/K80/rt/` and K174's
    `.claude/probes/K174/rt/`; the research's `.claude/probes/K80/` and
    its kept worktree `.claude/worktrees/agent-a25726c24f262b138`.
  - next: stage 3's brief, written from stage 2's handoff ("Next", "For
    stage 3"): the final telegraph (2.7), the catch feedback (2.8, K270),
    sound and fog (2.10), the wait key, the pad's wait and a hover cue, a
    turn minoToward and the contact sheet, plus stage 2's residuals
    (K293) and Levi's answer on per-model accuracy (K294). Before any
    daily pins a minotaur, waits enter `fc.taps` and the attempt saves,
    and K47's fingerprint covers the minotaur params. Real time's phone
    check is K177.
  - brief: `docs/design/K80_turns.md` ("The stages"; "Stage 2 handoff",
    where stage 3's brief goes); real time's
    `docs/design/K80_realtime.md`; the research brief
    `docs/design/K80.md` and its doc
    `docs/design/K80_gameplay_additions.md`.

## K156 (2026-10-15, shortened by the diet)

- **K156** · The round phone pass (K152 (1)): `scripts/phone_pass.ps1`,
  built from K81's gate kit. Two builds (the round's base and head) run
  interleaved through a frame bench (knot, fabric at 0, 10 and 21 moves,
  and a load scenario for K147), then looks from a JSON list, into a
  summary table and screenshot sheets.
  - 3a and 3b MERGED in 6521bb2..ae49553 (2026-10-13 about 21:50; sonnet
    agents a262df65dcc1489a7 and a957f7f1407f5df9f, desktop dry runs
    only). 3c MERGED in 74ce373..de5f39e (2026-10-14 01:46; sonnet agent
    a595ec530724dbba1, on the phone): the A/A smoke test, `-WaitReady`
    (K171 b: a read-only check every 3 min, two ready in a row start the
    pass; `retry_quiet.ps1` waits up to 240 min), the tracked noise floor
    (landscape then, now `noise.landscape.json` beside K253's portrait
    floor), defaults `-Moves 0,7,13` and `-LoadSeconds 30`, clean-origin
    looks, and the round's new looks. Its worktree is kept.
  - the round pass of 2026-10-14 01:55-02:20 (base ab6d330, head
    54a2b43 = 81d31a5's code; 3 reps, landscape, no watchdog trip):
    every at-rest cell (fabric at 0, 7 and 13 moves, knot) is within
    noise. Load: the longest frame fell 684 -> 167 ms (`?b.J`) and
    667 -> 150 ms (`gs=18`); first sleep rose 8.0 -> 19.3 s and
    9.3 -> 22.5 s, fps fell 46 -> 41 and 44 -> 35, p95 33 -> 50 ms, and
    `gs=18`'s frames over 50 ms 48 -> 84 (K197). Looks: all 18 ran on
    head (base lacks the new features).
  - round 2026-10-14b's pass, 10:12-10:42 (base 54a2b43, head 48da84d,
    master at 09:37; 2 reps, in PORTRAIT 411x753 against the landscape
    floor, on a hot phone; stopped at its deadline before k140-confetti):
    fabric fps holds about 59.5 on head where base falls 57.3 -> 49.0
    from 0 to 13 moves (better at 0, 7 and 13 moves); knot render ms
    19.8 -> 11.0 (better, marginal); the default link's load fps
    29.4 -> 34.5 and frames 882 -> 1035 (better), but its p95 and first
    sleep came out worse, borderline (K232); `gs=18` within noise. 11 of
    12 looks ran clean, 8 of them new (K151 free play and a daily's
    replay, K146 practice, K148, K198, K100, K93, K120's pad); the
    coordinator checked the K198, K100 and K151 sheets. The looks'
    `storage` field and the walk's `pick` option merged in 8d672ee..b72b3e9
    (10:50).
  - round 2026-10-14c's pass, 18:53-19:37 (base 48da84d, head 02194b4,
    portrait; merged e6c6034..aa3cdd1 at 19:48): K279's looks hold 60 fps
    through a tap, with no first-tap stall and under 1% of the frame
    flashing (K289), and `ptg=0.3` wakes the knot for 3-5 s at 5-12 fps
    (K279); K268's shaped-gaps census shows 0 mismatches on the PowerVR
    (K287); k140's confetti held 60 fps on head (base 54, but the two
    builds made different mazes from `?b.J`). Frames, K98 and K92 (K230)
    and the 14 dropped looks did not run: the window went to K253's A/A,
    which tripped at 19:37:05 on Levi's touch. `summary.mjs` now records
    each cell's pairs and marks a stopped A/A partial (b43ad29).
  - owner: nobody since 2026-10-14 19:45 (round 2026-10-14c's agent
    a04122e6bc4e56b02 (sonnet) finished; worktree kept). Round
    2026-10-14b's agent ad24cee1cd83ebe88 ended 10:47; worktree kept.
  - branch: mainline; last commit: `aa3cdd1`.
  - evidence: round c's `.claude/probes/rounds/2026-10-14c-0e865bf/`
    (`k279_tables.txt`, `k279_shots*/`, `sheets/`, `install_floor.mjs`)
    and its A/A's `.claude/probes/K253/aa3/`; round b's
    `.claude/probes/rounds/2026-10-14-48da84d/` (`pass/summary.md`,
    `pass/looks_report.json`, `pass/sheets/`, its `looks.json`,
    `looks_run.json`, `make_looks.mjs` and the adb recovery logs); the
    morning's `.claude/probes/rounds/2026-10-14-81d31a5/`; 3c's
    `.claude/probes/K156/3c/`.
  - next: the next phone window Levi lends: frames (`-Phase frames -Reps
    2`, on K253's portrait floor; K300's `-Moves` fix waits for the next
    A/A), K307's phone measures (its "Stage 1 handoff"), the frame
    rate at the finish under K317's confetti, K98's markers and K92's
    badge (K230), the 14 dropped looks
    (K233; spec in round b's `looks.json`) and K232's two load cells with
    3 reps. Looks and probes must cope with K301's width flip, and a
    confetti A/B needs one maze on both builds. Sweep the 3a and 3b
    worktrees (`.claude/worktrees/agent-a262df65dcc1489a7`,
    `.claude/worktrees/agent-a957f7f1407f5df9f`) with
    `.claude/probes/K161/cleanup.ps1` (`-DryRun` first).
  - brief: `docs/design/K156.md`, "Round 2026-10-14c handoff" (aa3cdd1);
    the next round gets its own section.
  - K7's stage 5 brings its own phone plan (`docs/design/K7_worker.md`,
    Design 10): the worker's frame rates and its substep cost on the
    phone (big.LITTLE placement unknown) before it becomes the default.
  - env: none; the pass builds and serves both builds itself (ports
    5480-5489). Check that nobody is using the phone first (K234).

## K161 (2026-10-15, shortened by the diet)

- **K161** · Disk: C: had 24.4 GB free (2026-10-13 about 19:30, before
  K81's 1.6 GB probe copy). `$env:TEMP` holds 1145 `knotmaze-*` Chrome
  profiles (about 36.5 GB) that probe runs never delete; the worktrees
  take 3.8 GB and the probes 2.7 GB. Proposed: delete the profiles older
  than a day, sweep the stale worktrees, and have the probe libraries
  delete their profile on exit (with K150). Levi approved it on 2026-10-14 at about 00:22 ("Yes.", item 2); C: had 19.6 GB free at 00:32.
  - owner: claude session d8031183 (the coordinator), a background
    cleanup script under the perf lock.
  - branch: mainline (no code); last commit: n/a.
  - evidence: `.claude/probes/K161/cleanup.ps1` (`-DryRun` first) and
    `cleanup.log`. Run 2026-10-14 01:17: the five merged worktrees are
    swept (probes copied and verified first, branches kept); no profile
    was a day old yet (1094 of 1177 date from 10-13 13:16-16:16).
  - next: after 16:20 on 10-14, run `cleanup.ps1` again for the
    profiles (about 33 GB). The probe libraries' delete-on-exit goes
    with K150.

## K76 (2026-10-15, shortened by the diet)

- **K76** · The thread-reveal mode, stage 2 (doc section 7), decided
  (Levi, 2026-10-13): the end look is a dropdown (fade, halo, glow, dots,
  fray, beacon; default beacon); the doc's other recommendations stand
  (`threadReveal`, `revealDistance` 2.5, `revealFade` 1; dailies via a
  theme, not a toggle; the literal reveal rule; the exit indicator hidden
  until the exit is seen); and, at his suggestion, fog and the reveal
  are the options of one `exploration` dropdown (off | fog | threads),
  which replaces the fog toggle in place (pre-launch, no back-compat).
  Design: `docs/design/K76_reveal_mode.md` (0474300); contact sheet
  `.claude/probes/K76/out/contact.html`. After K81. It must build the
  mode as a separate shader variant: compiled in, it costs mode-off
  frames 2.3 -> 2.8 ms on the desktop (measured while two of K74's CPU
  scans ran; re-time).
  Stage 2 runs in four stages, 2a to 2d, each from the handoff before it
  (`docs/design/K76.md`, bcb969e).
  Stage 2a merged 2026-10-14 14:15 (`5fe6fe1..4e384fc`, 835 tests):
  the model (`src/game/explore_view.ts`), the paint variant
  (`src/render/explore_glsl.ts`: `withExplore` splices four anchors
  into SECTION_FRAG for a lazily built second program,
  `section-rgb-explore`; the `kExploreAt` mirror and its parity
  test) and the probe hook `__knotExplore` (main.ts). Mode off: 0 px,
  and its GPU A/B equals master's. Six-look sheet
  `.claude/probes/K76/stage2a/out/sheet/K76_2a_looks.png`; lore
  `render-explore.md`; handoff `docs/design/K76.md` ("Stage 2a
  handoff"). Section 10's questions are K257, 2a's residuals K258. 2c
  also gates input: hidden thread still takes taps, tugs and hover.
  Stage 2b merged 2026-10-14 16:04 (`3ffed34..8d671ba`, 880 tests): the
  gap gate (one strength per gap slot: vis(over) at the over pass),
  markers that show once their point is solid (vis 0.98) and the joint
  gate (unvisited junctions hide); no shader change, so mode off is
  master's frame. Sheet `.claude/probes/K76/stage2b/out/K76_2b_sheet.png`;
  handoff `docs/design/K76.md` ("Stage 2b handoff"). Joints and caps fade
  with their thread (K275, answered 16:50); 2b's residuals are K276. Levi's shaped
  gaps (2026-10-14 15:16) are K268 (stage 1 merged 17:50).
  - owner: agent a58040d5b7b031c80 (opus) of claude session d8031183, stage 2c from
    23:39 (cap 01:39; ports 5810-5819). Earlier stages' worktrees are kept:
    2b's (ac6e354b85922e7aa), 2a's (a5d63452980ed9fa3) and stage 1's
    (aea102de995e1ce30; its prototype WIP is 1fbc0d2 and 23907a5).
  - branch: `worktree-agent-a58040d5b7b031c80` (`.claude/worktrees/agent-a58040d5b7b031c80`, from
    2c81a92); last commit: `2c81a92` (master) until its first WIP commit.
  - evidence: `.claude/probes/K76/stage2c/` in its worktree; 2a's and
    2b's in the main checkout's `.claude/probes/K76/`.
  - next: stage 2c (the move-event feed, input and the camera, the
    `exploration` dropdown with codec 6, the K73 indicator, the intro,
    K257's and K286's recommendations, a census walk), its handoff, the
    merge; then K268 stage 2, K290 and 2d in turn.
  - brief: `docs/design/K76.md` ("Stage 2c", 79c5a97), then
    `docs/design/K76_reveal_mode.md`.

## K268 (2026-10-15, shortened by the diet)

- **K268** · Shaped crossing gaps under thread reveal (K76; Levi,
  2026-10-14 15:16, verbatim): "For the mode where threads only appear as
  you travel along them, we should make sure we handle gaps well. If
  there is a crossing, and we travel the thread along the bottom of the
  crossing, but we've not explored the upper thread of the crossing yet
  (and that part of the upper thread isn't yet visible from the stub
  indicators we should from adjacent traveled intersections), then we
  shouldn't show the gap yet. I suspect This means we'll need to revisit
  how gaps are rendered for this. Also, stubs from adjacent traveled
  intersections could have a variable amount over overlap over
  crossings, and we'd ideally be able to handle that variable and
  dynamic gap shape accordingly. There's probably a similar edgecase
  problem with dead ends. We should put some care into designing this
  gap treatment correctly". Stage 2b's gate (one strength per slot,
  vis(over) at the crossing) covers a hidden over thread, not a stub's
  fade, end or growth front inside a crossing's footprint. The design
  (2b's handoff, "Shaped gaps (Levi, 15:16)" in `docs/design/K76.md`)
  cuts each under-thread pixel by the over thread's drawn coverage at
  its projection onto the over pass. Stage 1 builds the ribbon's shaped
  cut with its proof and a desktop sheet (merged 2026-10-14 17:50,
  1e55365..61c8859); stage 2 the fans, pluck-still, protect, the
  smooth-min, the underWindows and the caps (fading with their thread,
  K275).
  - owner: nobody since 2026-10-14 17:50 (stage 1 merged). Its agent
    ab65d913a3b9a3dcb's worktree `.claude/worktrees/agent-ab65d913a3b9a3dcb`
    is kept.
  - branch: mainline; last commit: `61c8859` (stage 1 is
    1e55365..61c8859, rebased from 36fe894 on 4d3efe6; 921 tests).
  - evidence: `.claude/probes/K268/` (copied to the main checkout at the
    merge, 171 files): the proof (0 ghosts, 0 under-cuts, max error
    0.016), the census (hidden 405, solid 5, shaped 2), the GPU timings
    (+3% in total with every vertex visited) and the partial sheet.
  - next: stage 2 ("For stage 2" in the brief, with K275's fade: joints
    and caps fade with the premultiplied strip alpha), after the physics
    worker and never alongside K76 stage 2c, K298, K299 or K111 stage 5
    (all change the paint shaders). K111 stage 4 merged at 19:11 and took `uKBase.y` (High
    contrast's look) and `uKGold.w` (the rim's width scale). Residuals are
    K287; the draw order waits on Levi
    (K286). Burn stage 3 runs the shaped cut in reverse (K290), so drive
    it by a visibility that can also shrink.
  - brief: `docs/design/K268.md` ("Stage 1 design", "Stage 1 handoff
    (2026-10-14 17:41)", "For stage 2").

## K307 (2026-10-15, shortened by the diet)

- **K307** · The daily intro's freezes are cold shader compiles (stage
  1's trace, 2026-10-14 21:39; the desktop's RX 6800 XT, ANGLE D3D11):
  bg-vellum about 0.28 s at 0.3 s, section-rgb about 2.8 s at 1.0 s,
  arm-strip and junction-field about 2.2 s at 3.9 s; `am=instant` links
  freeze 3.1-5.4 s cold in their first frame. FXC compiles them and Pixi
  reads LINK_STATUS right after `linkProgram`, so main blocks until the
  link ends, and the GPU's wait stops every present: nothing on the page
  animates through it, a worker's canvas, CSS or a GIF included. With a
  warm cache the first frame shows at 0.70-0.74 s. A throwaway prototype
  that compiles in parallel (`KHR_parallel_shader_compile`) kept the
  screen presenting at about 56 frames a second with the CSS trefoil
  turning throughout, and the intro ran smoothly from about 3.6 s instead
  of 6.2 s; the maze's first frame moves from about 1.0 s to about 3.3 s,
  behind the loader. Levi, 2026-10-14 about 20:43, answering K302 (8):
  "Let's prioritize this too." Split from K9.
  - owner: nobody since 2026-10-14 21:39 (agent a119ffbc187f24aad (opus)
    of claude session d8031183 finished stage 1, merged at 22:06 in
    b72d5dd, docs and lore only); stage 2 waits for a code slot.
  - branch: mainline; last commit: `b72d5dd`. The local `k307-proto`
    (51f7480) holds the throwaway prototypes and is never merged.
  - evidence: `.claude/probes/K307/` (`trace_intro.mjs`, the traces,
    `builds/`, patches); lore `.claude/rules/render-shaders.md`.
  - next: stage 2, the warm-up (`src/render/program_registry.ts`,
    `src/render/shader_warmup.ts`, `__knotWarmup()`, a 15 s gate on
    `finishPresettle`, the background held, wave 1 then wave 2). K7's
    stage 1 and K298, which also edit `main.ts`, have landed; K329 may
    still touch it. Wave 2 covers the programs nobody has timed
    yet (the explore variant, the other backgrounds, bg-fog, pluck-still,
    the DisplacementFilter, the confetti); `trace_intro.mjs` measures
    them. The phone's measures ride K156's next pass: the renderer
    string, whether the extension is exposed, per-program cold waits
    through a shader-salt probe build (never wipe Levi's Chrome data),
    presents during the waits, and the first frame.
  - brief: `docs/design/K307_intro_freezes.md`, "Stage 1 handoff" and
    "Stage 2: the warm-up".

## K290 (2026-10-15, shortened by the diet)

- **K290** · Burnt threads, a toggle (Levi, 2026-10-14 about 18:08,
  verbatim: "Ooh, with the burn away, I'd like to support toggling how
  burnt segments are treated--leave the threads rendered but with burnt
  coloring vs actually stop rendering the threads (and then update how
  gaps are rendered for other threads that used to be on the underside
  of a crossing with a now-burnt thread--just the opposite of the
  appear-as-you-go thread rendering)."). A `burnt` dropdown: char (drawn
  in a burnt coloring, stage 1's char moved into the shader) or gone
  (not drawn; the under threads' gaps close, K268's shaped cut in
  reverse; fans drop the arm). Burn stage 3 builds both on K76's
  visibility and K268's shaped gaps, so it follows K76 2c and K268 stage
  2, whose briefs must not assume a thread's visibility only grows. Its
  sheet shows both. The default is gone (Levi, 2026-10-14 about 18:27,
  verbatim: "Gone should be the burnt away dedault").
  `docs/design/K114_burn.md` ("The stages", stage 3).

## K345 (2026-10-15, shortened by the diet)

- **K345** · The hover rim through the junction fillets (Levi,
  2026-10-14 about 23:06: "Why do we not render the hover rim
  hightlight closer to junctions? Does this have to do with the filets?
  Can we make these edge-rim hightlights instead work with and follow
  the curve of the fillets?"): the rim stops at `rimGap`, the junction
  web's reach along an arm (0.975 world at defaults), because the webs
  draw over the ribbons from arm strips that carry no across coordinate,
  and K145 kept it off webs, fans and arm strips by design (Levi then:
  "clipped to not show anything outside the segment bounds";
  `render-paint.md`, the hover rim entry). Following the fillets means an
  edge-distance term in the fan shader and a rule for where the rim ends
  on the web. Probably folds into K9's G4-1 with K328, since G4-2
  deletes the fan shaders it would change (K8's stage 1 confirms).

## K294 (2026-10-15, shortened by the diet)

- **K294** · Per-model minotaur tuning, for K80 turns stage 3 (Levi,
  2026-10-14 about 19:00: "Yes."): the hunter, guard and stalker share
  sight and accuracy, so the retune aimed at the hunter on the dailies
  (sight 2, accuracy 0.3) moved the others too: the stalker fell from 20%
  to 1% (dailies, an attentive explorer), and the hunter fell below
  section 0's rates on the treelike and dead-end sets (treelike at 80%
  attention: 8% against 27%). Each model gets its own defaults, tuned to
  section 0's rates. `docs/design/K80_turns.md` ("Stage 2 handoff":
  Calls, and the table under Verification).

## K284 (2026-10-15, shortened by the diet)

- **K284** · Credit K74's sources (K277): `docs/design/K74_maze_design.md`
  builds its goals on Pullen (*Think Labyrinth*, "Making Difficult
  Mazes") and Zhao and Marquez 2013 (arXiv:1307.5713), but `src/` names
  neither, and a `RESEARCH` entry needs a file that carries its mark. K74
  stage 3 adds a comment naming each where the code follows it, then the
  entries.

## K240 (2026-10-15, shortened by the diet)

- **K240** · High contrast for the DOM chrome (a K111 follow-up): a CSS
  layer on `:root[data-contrast="high"]`, which K111 already sets, for
  the panel, the HUD and the badge (their styles live in TS-injected
  strings). Small; after K238's review.

## K137 (2026-10-15, shortened by the diet)

- **K137** · K80 section 4's cheap mechanisms, each behind a toggle
  (Levi, 2026-10-13 14:31: "I'd love to prototype all of these and have
  controls to toggle them"), after the minotaur. Sized S or S-M in the
  doc: 4.3 crack-then-break, 4.7 the sword, 4.9 sleepers, 4.10 lure
  plucks, 4.13 tunnels, 4.14 par, 4.15 Ariadne's spool, 4.16 chalk
  marks, 4.17 the lantern, 4.21 ghost race (after K85), 4.26 sonar
  pluck, 4.28 hints, 4.29 sprint, 4.30 snares, 4.32 lives, 4.33 mud,
  4.34 scent. Plus Levi's sleeper variant: an enemy that appears at a
  junction a turn or two after you leave it, then follows you, with
  some variance. The M ones are K138; the M-L and L ones wait in K141.

## K138 (2026-10-15, shortened by the diet)

- **K138** · K80 section 4's M mechanisms, each behind a toggle
  (Levi, 2026-10-13 about 15:30, verbatim in
  `docs/design/levi_notes_2026-10-13.md`: "Let's defer those M-L or L
  items. Let's do all the M items."), after K137: 4.1 locks and keys
  and 4.2 one-way runs (both in call 9's order), 4.4 required pickups
  (then 4.5 stars, S), 4.6 fleeing critters (simulate first: K80's
  brief notes), 4.11 switches, 4.12 turnstiles, 4.18 color rules, 4.19
  ice, 4.20 rescue, 4.23 the myth, 4.24 tides, 4.27 hidden runs, 4.31
  more exits. The ones that change generation (4.1, 4.2, 4.4, 4.11,
  4.24, 4.31) need a solvability check there. The M-L and L ones are
  K141.

## K139 (2026-10-15, shortened by the diet)

- **K139** · Collapse mode (Levi, 2026-10-13 about 15:10, verbatim in
  `docs/design/levi_notes_2026-10-13.md`): no backtracking, each run
  collapses behind you; collapse as much of the maze as you can and
  still reach the finish, or, a variant, without reaching it. It rides
  on 4.3's one-shot snap (`fragile`, in K137) and R.3.4's "longest
  thread" (`docs/design/K80_gameplay_additions.md`). A 3-way junction
  can be passed only once, and its third run stays standing unless the
  route ends there, so 100% is usually out of reach: the puzzle is which
  run to leave at each junction. With the finish, a dead end strands
  you; without it, a long dead end (K74's tails) is the best last move.
  Par at generation by depth-first search (exact for a few dozen
  junctions, R.3.4; time it on the phone). Arms that would cut you off
  from the finish draw cracked (R.3.3's smoldering rule). Score and
  share: thread collapsed vs par. Param `collapse` (off | finish |
  free). S-M after 4.3.

## K46 (2026-10-15, shortened by the diet)

- **K46** · Daily variety, revisited after the feature churn (Levi,
  2026-10-12): no weekly or regular arc; THEMES, each a set of parameter
  constraints; manual per-day overrides later (K82). The measured
  proposal, with his direction at the top, is
  `docs/design/K46_daily_variety.md` (8b1eb90). Its probes are in
  `.claude/probes/K46/`, and the proposal agent's worktree
  (`.claude/worktrees/agent-a78c73cec4770a14d`) is kept. Pre-launch,
  the daily changes in place, with no `DAILY_V2` or `fromDay` (K132).
  Validation must use engine-exact math only (K108,
  `src/util/det_math.ts`). Today's trailLength default is 10, so
  memory-trail themes set 5 (K73). Brief: `docs/design/K46.md`.

## K78 (2026-10-15, shortened by the diet)

- **K78** · The Knotmaze handbook: algorithms, architecture, decisions
  and trade-offs, and a per-param reference with figures (the
  half-lattice units diagram first). Write it once the churn settles.
  Levi (2026-10-13): public; Markdown, later also posted on his Blogger
  devlog (devlog.levi.dev), so figures are standalone images and the text
  needs no repo links or internal IDs. Plan:
  `docs/design/K78_handbook_plan.md`.

## K297 (2026-10-15, shortened by the diet)

- **K297** · A pared-down panel for most players (Levi, 2026-10-14 about
  19:03, verbatim: "Eventually, we'll end up hiding most of these
  settings, and exposing a more paired-down set of settings for the
  average user."). Most rows move behind an advanced view, and a short
  set stays in front. Which rows, and how the advanced view opens, come
  later, after the churn; K292's marks and K84 / K57 feed it.

## K340 (2026-10-15, shortened by the diet)

- **K340** · Nested folders that look distinct from their parents (Levi,
  2026-10-14 about 22:48: "Ohhh, I didn't notice the nested folders
  before in the settings panel. We should do something to make these
  look more distinct from parent folders. Not sure what."): looks
  prototyped in K339's stage (its section 5 and sheet), built with K339's
  rebuild. The audit recommends look F (K339's call 3); once Levi picks,
  build its CSS first and check it under High contrast.

## K341 (2026-10-15, shortened by the diet)

- **K341** · The second panel audit, once the design iteration is done
  (Levi, 2026-10-14 about 22:48: "We should also plan to do this again
  when we're all done iterating through all these designs."): rerun
  K339's inventory script and findings checklist, then feed K297's
  pared-down set (`docs/design/K339_panel_audit.md`, item 8). Tools:
  `scripts/panel_inventory.ts` (with `panel_inventory.vite.config.mjs`
  and `panel_inventory_stub.ts`), table `docs/design/K339_inventory.md`;
  optionally teach the script to flag dead rows and cut-off labels.

## K5 (2026-10-15, shortened by the diet)

- **K5** · Split `main.ts` and `ribbon_renderer.ts` along the new data
  lines (K1-K3 are done). K7's design: not needed first; after K7's
  stage 5 (it conflicts with stages 1, 3 and 4, and the host makes it
  smaller). First in line once K7 stage 5 merges (Levi, 2026-10-14
  23:46, would like it sooner).

## K6 (2026-10-15, shortened by the diet)

- **K6** · One frame loop driven by what-changed flags (after K5).
  Replaces K21's stand-in `sceneAnimating()` in main.ts, and the
  render-on-demand loop (K24) asks `background.needsFrame()`. K7's
  design: not needed first; after K7's stage 5. First in line with K5
  (Levi, 2026-10-14 23:46).

## K9 (2026-10-15, shortened by the diet)

- **K9** · G4: smooth-union SDF junction webs (cuspRadius = blend
  radius); A/B crops at cr 1, 3, 6 before the fans are deleted. Also
  closes G1's x160 leftover: a faint tick where a wedge flank meets a
  tucked bridge, and the merge-core hairline dashes at 4-way merges
  (`.claude/rules/render-gaps.md`), which K74's H3 (`fourWayFraction`
  0.9+) would multiply. From K81 (2026-10-13): the webs should carry the
  traveled route as the smooth union of the traveled pieces only. The
  intro's two freezes and their shader warm-up moved to K307
  (2026-10-14).

## K115 (2026-10-15, shortened by the diet)

- **K115** · Cursive text and shapes, decided (Levi, 2026-10-13 14:32,
  verbatim in `docs/design/levi_notes_2026-10-13.md`; design
  `docs/design/K115_cursive_text.md`, ded57f7). Its staged plan goes
  ahead without stage 1a's legibility test (Levi, about 15:30: "We can
  assume that text reads at phone zoom. You don't need to test that."):
  the text builder and a standalone welcome/credits scene, the title
  thread, text inside a maze, then shapes. Calls: pinned text (1).
  Junction+spur where a join meets a letter's body (a c d e g o q), the
  spur a real, travelable dead end, not decoration (2). Text first in
  the standalone scene (3). Hershey Script Simplex for Latin (4): its
  lowercase letters all join at mid x-height, so a word is one thread.
  Its capitals don't join, and Levi wants capitals (about 15:30: "I want
  to support capitals."): first a generated connector for every capital
  (a curve from the capital's last stroke to the next letter's lead-in,
  matching both directions), then hand-made joins (the capital's last
  stroke redrawn in the glyph data) where one measures badly, which also
  fixes the D's self-touching flourish. Text inside the one link token,
  so the codec gains a string type (5). No foreign threads inside words
  (6).
  - for the briefs: an explicit over-pass field on CROSSING nodes (the
    lattice keeps its path, so the golden stays byte-identical); a
    decorative walk-graph flag for dots and accents (spurs are walkable
    now); K109's piece model must count a text bridge and
    `repairTailRoute` (K110) must not cut it; `buildCellMask` keeps only
    the largest component; a TEXT run flag. Hershey's acknowledgements
    ship with the data (K122). The connector's worst case: W to e spans
    19 HU, about two letter widths, so the curve swoops and can cross
    letters at shallow angles. With stage 1a dropped, the builder
    calibrates the doc's section 3.4 thresholds as it goes. Evidence:
    `.claude/probes/K115/` (Hershey data and its license; SVG-proxy
    measurements, not the real renderer).
  - next: the builder's stage 1 brief, at its place in the order.
  - K122: in the commit that adds the Hershey data, set `shipped: true`
    on `hershey-fonts` in `notices/credits.ts` (a test fails while
    `src/` or `public/` names Hershey and the flag is false).

## K116 (2026-10-15, shortened by the diet)

- **K116** · Alternate pluck instruments and accompaniment, lowest
  priority (Levi, 2026-10-13 13:30; his calls at 14:39 are verbatim in
  `docs/design/levi_notes_2026-10-13.md`; design
  `docs/design/K116_instruments.md`, 2e60b00). First the band skeleton
  (buses, ducking, a limiter, one clock), a drone and bass, and four
  `pluckVoice` presets: harp, koto-like, muted pizzicato and a bright
  12-string-like voice (3-4 days; calls 1-2); then marimba and bells on
  the modal engine. The band is on by default at first (call 3), about
  10-14 dB under the pluck (call 4); samples are deferred (call 5); a
  song's loop is whole bars, so Scarborough Fair's closing rest grows
  from 2 beats to 3 (call 6). For the brief: `pluckVoice` (pvc),
  `accompaniment` (acc: off|drone|band) and `accompLevel` (acl) are
  daily-exempt codec appends; first a Pixel 11 audio-CPU and voice-count
  probe. Section 6's sources are unverified leads from memory (the
  VSCO-2, FluidR3_GM and MusyngKite licenses, the mode ratios, iOS
  `navigator.audioSession`, Opus on Safari). The loop length is K125.

## K144 (2026-10-15, shortened by the diet)

- **K144** · Accounts and shared stats, a stretch goal after
  everything else (Levi, 2026-10-13 about 15:40, verbatim in
  `docs/design/levi_notes_2026-10-13.md`): log in through an OAuth
  provider and keep stats across devices; an opt-in checkbox to share
  them (maybe only when logged in); simple backend services that scale
  cheaply; averages and percentile bands per metric and level for
  opted-in players; cheap anti-cheat that silently flags suspect
  accounts and leaves them out of the aggregates.
  - for the design: K108's determinism and K47's move records let the
    server replay a submitted walk (valid moves, a plausible time for
    `moveSpeed`), a cheap check. Backends to weigh: Cloudflare Workers +
    D1 beside the Pages site, or the SnoringCat platform (Nakama on
    Hetzner, hopnbop's). Accounts bring a privacy policy and account
    deletion.
  - next: a design doc, after everything else.

## K10 (2026-10-15, shortened by the diet)

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
  - K79 stage A (7225930 vs e25d202, 2026-10-13 11:06-12:03, wireless
    adb): PASS. 60.0-60.5 fps, p50 16.7 ms, on both builds at default,
    `fw=0` and `pv=trail`, all 36 runs asleep; frames 0 px in fabric,
    knot, mist and none; vellum at `bgs=1` costs less than the phone
    resolves (about 0.18 ms/frame, +-2 ms); the panel row 16/16
    (`.claude/probes/K79/phone/results.md`).

## K292 (2026-10-15, shortened by the diet)

- **K292** · Mark the panel's personal settings (Levi, 2026-10-14 about
  18:40, verbatim: "For local-specific personal preferences vs
  maze-instance-specific gamemode-altering settings, I was originally
  thinking it'd be good to keep them in separate sections. But in
  retrospect, I guess it makes more sense to keep each setting param
  grouped with its concept. Let's instead give some sort of UI indicator
  to differentiate between one param type vs the other."). Every row
  stays in its concept's folder. Then, about 19:02: "I was thinking a
  more subtle indicator, like a dog-ear triangle in the top-right
  corner. And maybe we should actually put the indicator on
  non-personal-preference rows, since it's probably better to call-out
  the ones that actually deviate the maze from the current URL/daily."
  So the MAZE rows carry the mark, a small dog-ear triangle in the row's
  top-right corner, which a key at the top of the panel and the row's
  tooltip explain; the personal settings (`DAILY_EXEMPT_KEYS` plus the
  localStorage prefs: Motion, High contrast, `finishIndicator`,
  `tapToPan`, the move pad) stay unmarked. A sheet for Levi: the
  dog-ear's size and color, on every maze row, against a variant that
  marks only the rows changed from the link or the daily. K111 stage 4
  merged at 19:11; K298 adds rows too, so run after it or keep the mark
  in its own module. It replaces K84's separate
  section, K57 settles the edge cases, and K297 is the pared-down panel
  this leads to.

## K265 (2026-10-15, shortened by the diet)

- **K265** · High contrast's own highlight, built by K111 stage 5
  (Levi, 2026-10-14 about 15:46: "Maybe the high contrast highlights
  should get new treatment"). K111 stage 4 (a47642d..f294247, merged at
  19:11) built three looks behind a probe param (sheets
  `.claude/probes/K111/stage4/sheet/`). Levi's pick, about 20:25,
  verbatim: "Let's not do the black center. Instead, let's do a bit
  thicker rim, but with no fade-out, just an abrupt edge". The
  coordinator's reading, confirmed by Levi at 22:32 ("Yes."): a white rim on
  both edges with the thread's own color between them, thicker than look
  2's outline (about 0.35 of the half-width), a hard inner edge, steady.
  The run's ends are unasked: stage 5's sheet shows them hard and with
  K298's end fade, for Levi to pick. Looks 1-3 go, with `hcl` and `__knotHcLook`. The width default 0.85
  and range 0.3-1 stay (that part is unanswered; K298 relabels the row
  as the glow's thickness). Runs after K298, never beside K298, K299,
  K76 2c or K268 stage 2 (the paint shaders). Brief:
  `docs/design/K111.md`, "Levi's pick" and "For stage 5".

## K312 (2026-10-15, shortened by the diet)

- **K312** · Add K299's lesson to claude-config `rules/lessons.md`
  (WebGL): GPU float division is approximate (ANGLE D3D11 gave
  `floor(k*n/n)` = k-1 in 3275 of 16384 pairs), so ring and lap math
  must be integer-corrected, and a float64 CPU mirror will not catch it.
  Held while Levi is away (claude-config edits wait for his approval).

## K313 (2026-10-15, shortened by the diet)

- **K313** · A loader that looks like the maze (Levi, 2026-10-14 about
  20:58; approved at about 21:20: "sgtm", "Trail should be a fixed
  length"): a trefoil-shaped maze with over/under gaps, the head fixed at
  the center and a fixed-length trail, the maze turning and sliding
  beneath it; drawn procedurally by a tiny OffscreenCanvas worker inlined
  in `index.html` (plus a static SVG trefoil from the first paint), so it
  shows before the bundle loads and keeps moving while main is busy;
  today's CSS trefoil is the fallback. Follows K307's warm-up: K307's
  trace found that on Windows no loader of any kind animates through a
  blocking shader link (the GPU's wait stops every present), and with
  the parallel warm-up today's CSS trefoil turned throughout. The build
  measures on the phone the first frame after navigation and the frames
  through the freezes. `docs/design/K313_loader.md`.

## K324 (2026-10-15, shortened by the diet)

- **K324** · The real-time minotaur, more alive and more tunable (Levi,
  2026-10-14 about 22:05: "with realtime, we can still telegraph the
  minotaur's next move. Also, there should be at least a small pause of
  the minotaur at each junction, but with some random variance. We should
  have a lot of param controls for the minotaur actually."): a telegraph
  like the turn-based one, a short pause at every junction (hunting
  included) from the seeded RNG, and many controls with readable labels
  in K323's Game folder. Today it pauses only while wandering: always at
  its destination, and at a passing junction with chance 0.3, for 0.5-2 s
  (`DEFAULT_CHASE_PARAMS` in `src/game/minotaur.ts`; `mpc`, `mpn`,
  `mpx`); it has no real-time telegraph. Relates to K80 turns stage 3
  (K293, K294, K270), K245, K247 and K296. Designed with K323's
  (`docs/design/K324_realtime_minotaur.md`, merged as 091e4dc): a
  read-only `MinotaurChase.plan(reach)` drives a live telegraph (the
  current run plus `minoTelegraphRuns`, faint roaming, bright hunting);
  junction stops of 0.2-0.6 s roaming and half that hunting, from their
  own counter-based stream (a range of 0 replays K80 bit for bit); the
  next roam target picked on arrival; ten new knobs. Section 7's nine
  questions were sent at 23:22. Stage 1 (the sim) follows K323 stage 1;
  stage 2 (the render) follows stage 1, K7 stage 2, K307 stage 2 and
  K329, and checks K270's band at a real-time catch (K271 applies to its
  telegraph); stage 3 (guard and stalker in real time) follows stage 1.
  The turn rules' LOSE_MARGIN and ROAM_MIN become knobs with K294.
  Levi took section 7's recommendations (2026-10-14 about 23:55): D3
  keeps today's catch rates, so the minotaur speeds up to compensate,
  and D9 (chevrons) waits until he sees stage 2.

## K326 (2026-10-15, shortened by the diet)

- **K326** · Remove knot mode (`mazeFabric`, `mf=0`) entirely (Levi,
  2026-10-14 about 22:10: "mazeFabric should go away and become another
  "gameMode" option. And it should be renamed to be clearer that it's
  just the threads, with no actual game. Actually, let's get rid of it
  entirely"). The golden byte-identity test
  (`test/physics/byte_identity.test.ts`) moves to a maze design, probes
  that pass `mf=0` go stale, and CLAUDE.md's knot-mode lines go. The
  inventory and stages are in K323's design (sections 4-5): stage A
  freezes a maze golden (after K7 stage 2); stage B deletes knot mode
  (after K323 stage 1, stage A, K7 stage 2, K307 stage 2 and K329) and
  retargets or drops the tracked knot cells (`scripts/fold_census.*`,
  the phone pass's bench, emulation and summary); an optional stage C
  reworks the knot paint path at paletteMode 0, the G2 fixtures and a
  closed-chain census (after stage B and K111 stage 5). About 346 stale
  `mf=0` probe files stay stale by design.

## K327 (2026-10-15, shortened by the diet)

- **K327** · Labels that say what they size (Levi, 2026-10-14 about
  22:11: "indicatorSize and markerSize sound the same"): `indicatorSize`
  sizes the edge arrows (a viewer preference) and `markerSize` the maze's
  icons; proposed "Edge arrow size" and "Maze icon size". Touch & feel
  also mixes words (K298's pick rows) with camelCase keys (`pluckRipple`,
  `tugLimit`). In K323's design; relates to K247, K292 and K297.

## K328 (2026-10-15, shortened by the diet)

- **K328** · The hover glow's rim profile (Levi, 2026-10-14 about 22:12:
  "hoverGlowWidth at 1.0 is still not emphasizes enough. I think we
  should support moving the start of the fade-out gradient in a bit, and
  showing a region of fully opaque at the outside" and "Perhaps we can
  parameterize this to combine well with the high-contrast version, and
  then resuse them for that"): a fully opaque band at the rim's outside,
  then a fade that starts further in, as knobs that High contrast reuses
  with the fade at 0 (K265's pick: a thicker rim with an abrupt edge).
  Today's profile across the ribbon: kRimAcross = 1 - smooth((1 - e) /
  RIM_EDGE * scale), RIM_EDGE 0.85, `hgw` in [0.3, 1] (`render-paint.md`);
  K298's end fade (`hgf`) runs along the run, not across. Also hide the
  glow's rows at strength 0 (K298's leftover). Probably folds into K9's
  G4-1 with K345 (K8's stage 1 checks whether it needs G3); otherwise
  K111 stage 5 with K265.

## K332 (2026-10-15, shortened by the diet)

- **K332** · Arrow-key hints (Levi, 2026-10-14 about 22:20: "it's often
  unclear with arrow key direction will correspond to which segment. We
  should add support for rendering an arrow-key indicator icon/marker
  near the start  of each current segment option to help indicate which
  key to press. We should only show these if the player has pressed an
  arrow key at some point previously in the session."): a small key icon
  (or chord, K333) near the start of each choice. The stage after K329.
  Hooks (K329's report): which key takes which run is `keyMap` /
  `chordMap` in `key_moves.ts` (fed by main.ts `keyDepartures` ->
  `departureVectors`); draw near each choice run's start at KEY_REACH
  with K83's `MarkerMesh` and `marker_glyphs.ts`; "pressed an arrow
  this session" is a module flag set in main.ts's keydown and
  `keyPress` (the pad too), not localStorage; refresh on arrival in
  `keyStep` / `stepWaiting`.

## K331 (2026-10-15, shortened by the diet)

- **K331** · Touch gets K298's pick margins (Levi, 2026-10-14 about
  22:50: "yes and yes."): touch moves from today's world-unit radii
  (0.7, and max(0.9, 1.6 x threadWidth) on a choice) to the mouse's form
  (half-width plus a px margin, times `pickChoiceRatio` on a choice),
  with its own margin row beside `pickMargin` at about 4 px (today's
  zones at the default zoom reach about 3.9 / 5.7 px past the edge), so
  the zones stop growing under a pinch zoom. Built with K330 after K329
  (`docs/design/K298_hover_glow.md`, "Notes").

## K321 (2026-10-15, shortened by the diet)

- **K321** · The credits page (Levi, 2026-10-14 21:47: "In the credits
  section, we can also reference Claude Code." and "We should also list
  me in the credits."; at 22:40, "Proceed, with my above notes"). The
  page and the panel's link become Credits (`credits.html`). From the
  top: "Created by Levi Lindsey" and "(c) 2026 Snoring Cat LLC. All
  rights reserved." (he set up the LLC and assigns this IP to it;
  LICENSE already names it); then his art, icon and music credits, still
  to come; then "Built with Claude Code", linked like the other credits
  ("We don't need to put the "Built with Claude Code" bit that
  prominently at the top"); then the techniques, the open-source
  licenses and the research. A small sonnet stage:
  `docs/design/K321_credits.md`.

## K318 (2026-10-15, shortened by the diet)

- **K318** · Win effects (Levi, 2026-10-14 21:37-21:38: "some gratuitous
  effect along the entire length of the path traveled" and "We could
  probably support multiple options for gratuitous game-win effects...
  Again, please think of a bunch of ideas, and themes"): one show in many
  themes. A runner with momentum replays the walk, braking into tight
  curves, lights the path behind it, pops each junction and blasts the
  finish. Levi's answers: at 22:32, "I kinda want to prototype all of
  these. Again, dropdown params for all these, and please add
  appropriate conditionally-visible dependent params for each."; at
  22:40, of the layers, "Let's implement all these too, again with param
  controls."; the first themes and the default, "You pick."; the runner,
  "The whole thing." (the whole walk). So: all thirteen themes and every
  layer, behind a Win effects folder (a Theme dropdown with Random; Party
  the default; conditional rows), in twelve stages run one at a time.
  Stage 1, the show and Party, follows the confetti stage and K111 stage
  5. `docs/design/K318_win_effects.md` ("Build stages").

## K336 (2026-10-15, shortened by the diet)

- **K336** · Side cannons (Levi, 2026-10-14 about 22:24: "Let's also add
  some blasts of confetti and streamers from specific points just outside
  the left and rigth sides of the screen, angled in and up, and then
  apply gravity to make these fall in an arc"): at the finish, blasts of
  confetti and streamers (new: long curling strips) from points just off
  the left and right edges, fired inward and upward, falling in arcs
  under gravity. Reduced motion keeps its 16 pieces; the phone's frame
  rate at the finish rides K156's next pass. Designed with K335 and K337
  (`docs/design/K335_confetti.md`). Deferred to after the other tasks
  (Levi, 2026-10-14 about 23:00: "Let's defer the more-complex
  celebratory effects to after other tasks."); the confetti stage was
  narrowed to K335 at 23:01. Its model-only draft of K336 and K337 is
  `docs/design/K336_K337_draft.patch` (applies on K335's merge with `git
  apply`); still to do: the draft's tests, the view, panel rows, codec
  entries (`cfc`/`cfn`/`cfs`/`cfh`/`cff`, appended and daily-exempt),
  reduced motion, the sheets and the frame A/B (the brief's items 2-7).
  The draft gives the finish's spray no streamers, unchecked on a sheet.

## K337 (2026-10-15, shortened by the diet)

- **K337** · Confetti shine (Levi, 2026-10-14 at 22:32: "Also, with the
  confetti, I'd like to explore adding a shimmer/shine reflection effect
  to them, so some flash as they rotate the right way. I bet we make make
  this even resemble vaguely realistic directional light physics without
  too much effort or perf cost?"): each piece's spin and flip give it a
  3D normal, lit by one directional light from the upper left: a diffuse
  term plus a Blinn-Phong flash, sharp on foil and soft on paper,
  computed on the CPU into the tint the view already sets (no new shader,
  no cold compile). Reduced motion keeps the diffuse term only. Designed
  with K335 and K336 (`docs/design/K335_confetti.md`). Deferred with
  K336 (Levi, 23:00); its draft is in K336's patch.

## K271 (2026-10-15, shortened by the diet)

- **K271** · The turn telegraph is unchecked under K76's thread reveal:
  `syncMinotaur` hides the minotaur until `revealQuery` >= 0.98, but the
  telegraph's line may still draw over hidden thread. For K76 2c, which
  settles the minotaur under thread reveal (K257 (2)).

## K266 (2026-10-15, shortened by the diet)

- **K266** · The hover rim's short-run limits (K248): runs shorter than
  2 x rimGap (1.95 world at the defaults) never glow, because the end
  gaps meet, and a short run whose lit window sits under a crossing's
  over thread shows nothing (seen on run 187). Probe note:
  `census_rim.mjs`'s open-chain terminal sample (k = 235, inside the end
  gap) reads a probe triangle on both builds; the rim is 0 there.
  `docs/design/K111.md` ("Stage 3 handoff").

## K267 (2026-10-15, shortened by the diet)

- **K267** · Stale highlight-mode mentions after K248: `highlightMode`
  and "highlight modes" in `docs/design/` (K76, K76_reveal_mode, K174,
  K193, K198, levi_notes_2026-10-13), and the rules files' historical
  `.J` probe links (gameplay-motion, probes-phone, render-pluck,
  probes.md's K80 bullet), v4 links that now load with a warning. The
  design docs' play links (K174, K180, K198 and the briefs' templates)
  are v4 too; the ledger's were rewritten on 2026-10-14.

## K263 (2026-10-15, shortened by the diet)

- **K263** · `minotaur.ts` exports `undoAllowed` (K80 turns stage 1 added
  its `minotaur` argument and tests it), but nothing in `src` calls it
  and no move undo exists for it to turn off, while
  `docs/design/K80_turns.md` step 2 cites it as real time's behavior.
  Delete it, or wire it when an undo lands. Found by the docs agent
  that drafted the burn-race brief (2026-10-14).

## K262 (2026-10-15, shortened by the diet)

- **K262** · Two probe harnesses K132 (41e81b5) broke, both untracked in
  the main checkout: K80's research harness (`.claude/probes/K80/lib.ts`
  `designParams` calls the removed `codecDefaults(3)`, so `run.ts`
  throws before playing; the fix is `paramsFromValues(seed, {...})`, as
  in `.claude/probes/K174/rt/rt_lib.ts`), and K100's
  `vite.fogdaily.config.ts`, which patches the removed `DAILY_V1` (to
  fog a daily now, set `fogOfWar` in the design). The burn race's agent
  fixes its own copy of the first (`docs/design/K114_burn.md`).

## K258 (2026-10-15, shortened by the diet)

- **K258** · K76 stage 2a's residuals: (a) while a move is in flight, the
  in-flight piece re-declares the KPAINT items every frame and the
  per-slot refs shift (check the upload size, `lastPaintUpload`, in 2d);
  (b) for 0.45 s after each arrival, the growth re-declares every frame;
  (c) the model is probe-only until 2c feeds it from move events.
  `docs/design/K76.md` ("Stage 2a handoff", "Residuals").

## K276 (2026-10-15, shortened by the diet)

- **K276** · K76 stage 2b's residuals: (a) a visited END at growth 0
  shows nothing at its tip (the model gives an END no web domain; the
  game never produces that state); (b) the census clips a fixed window
  per crossing, so it may miss the far end of a long shallow crossing's
  gap; (c) the ten-move census covered only two moves' ground (its away
  filter is fixed; 2c's census walks somewhere new); (d) the first
  ten-move census's mode-off-again failure (77% of the frame) is
  unexplained and did not reproduce (lead: the pinned backdrop changing
  under load; the census now saves both frames); (e) not investigated:
  with the mode on, the strip costs 0.082 ms against 0.066, and at the
  bound 2b's fans 0.58 against 0.55. The whole-texture gap upload went
  row-partial in K268 stage 1 (5.42 MB against 30.9 MB a move). `docs/design/K76.md` ("Stage 2b handoff",
  "Residuals").

## K278 (2026-10-15, shortened by the diet)

- **K278** · K74 stage 2's residuals: (a) H1 ignores the exit
  clearance: on dailies 1-80 it puts 36 new junctions inside the 12 u
  radius and turns 23 there into plain turns (135 -> 148 inside; share
  0 already has 135, the nearest 2.24 u from the exit; which joins, not
  checked); guard it with stage 3's corridor guard; (b) the pass costs a
  median 8.9 ms (at most 13.5) at gs 18, about +30% on generation:
  per-strand caches and a node -> strand map, checked by the walk pins;
  (c) done in 86d404e..02194b4 (K80 turns stage 2): K174's test runs on
  H1 mazes over mazes 100-119 x 6 seeds, and the turn rates were
  re-measured on them; (d) most skipped
  cuts hit a host self-crossing or a same-strand splice, so the dense
  heart and ring designs cut no bridges (a lever for stage 3 or 4); (e)
  H1 can shorten the optimal route (tree `1l6e`, 89.6 -> 78.3); (f)
  494f2fe's message says codec index 108; it is 117.
  `docs/design/K74.md` ("Stage 2 handoff").

## K281 (2026-10-15, shortened by the diet)

- **K281** · The burn race's stage 1 residuals (K114): (a) `drawFire`
  costs about 2.5 ms a frame on the desktop and about 11 ms at 4x CPU
  throttle once everything is burnt; (b) it ignores K76's thread reveal
  (the fog sprite covers it); (c) the char stroke draws over crossing
  gaps; (d) `runPoints` is approximate on mixed diagonal runs; (e) at h 0
  the HUD's fire lead reads 0 until the first move; (f) a backtrack right
  after a move is refused as smouldering, with odd toast wording; (g) a
  link that sets both the fire and the minotaur silently plays the
  minotaur; (h) c014a83's subject says codec 117-119 (it is 118-120).
  (a)-(c) go with stage 3's shader look. `docs/design/K114_burn.md`
  ("Stage 1 handoff").

## K254 (2026-10-15, shortened by the diet)

- **K254** · K193 stage 1's residuals in the phone pass: (a) the looks
  phase is unexercised with the new code (`shotViewport`,
  `report.viewport`, `emu`, `shotStats`): run a desktop `-Dry -Looks
  scripts/phone_pass/looks.example.json` (output to a file) and check
  `looks_report.json` and the sheet; (b) the docked-landscape case is
  unverified (the phone sat off the dock in portrait all stage): one
  `-Viewport portrait` pass from a docked phone, where the proof is the
  check; (c) `-Phase check` counts an awake, unlocked phone as ready
  with another app in front or a person using it, and the start then
  trips (13:21): it should also require the launcher or Chrome in front
  and a quiet touchscreen for a few seconds. `docs/design/K193.md`
  ("Stage 1 handoff").

## K252 (2026-10-15, shortened by the diet)

- **K252** · K198 stage 2's residuals: (a) `RANGE_EASE` is still a
  per-frame ease (0.15 a frame) for a resize and the fit's drift, so
  those settle faster at higher frame rates (the panel's edge is
  time-based since stage 2); (b) the head's 0.45 s show delay rests on
  five measured blips, the longest 0.33 s; the next phone pass (K156)
  can check more. `docs/design/K198.md` ("Stage 2 handoff").

## K246 (2026-10-15, shortened by the diet)

- **K246** · K174's residuals (`docs/design/K174.md`, "Stage 1
  handoff"): pace links aren't clamped, so an old probe link like
  `mhp=25` now means 25x the player's pace; the K80 rt probes in the
  main checkout (`.claude/probes/K80/rt/`) lack K132's `rt_lib.ts` fix
  (`paramsFromValues(seed, {...overrides})`), and `rt_chase.mjs` puts
  its Chrome profile in OS temp (both fixed only in the copies in
  `.claude/probes/K174/rt/`); at desktop width the panel's label column
  clips the `mino*` keys.

## K243 (2026-10-15, shortened by the diet)

- **K243** · A paused page with the instant intro draws no threads at
  load (`?b.J&am=instant&fw=0&sp=0`, 393k px off a refreshed frame; the
  same on master): `beginSettle()`'s instant branch shows the root
  without an `update()`, and a paused page never runs the awake step.
  One manual `update()` brings it to 1.7k px. Likely fix:
  `handRendererLook(); renderer.update(); fabric.update(...)` in that
  branch, after a physics-on pinned-frame A/B. `docs/design/K235_K239.md`
  ("Stage 1 handoff"); probe `.claude/probes/K235/k239_paused.mjs`.

## K242 (2026-10-15, shortened by the diet)

- **K242** · K191's residuals (`docs/design/K154_K169.md`, "Stage 2
  handoff"): the fan program's GPU cost during fades and stage 1's phone
  hash cost are unmeasured; the tap-time fade-out (a 3-arm junction
  passed twice, the head on the second arrival) and a full web restored
  on load are unit-tested only; the knot and fog A/B against stage 1 was
  not rerun (byte identity covers it; no shader change).

## K236 (2026-10-15, shortened by the diet)

- **K236** · K145's hover glow, now K248's rim: a pluck's overlay hides
  it on the plucked run (`pluckColor` composes one color per arc with no
  coordinate across the width; the fix needs an across varying in the
  overlay strip and an across-aware compose in the mirror). Of its other
  gaps, (b) webs, fans and arm strips never glowing is now the design
  (Levi: "clipped to not show anything outside the segment bounds"), and
  (c) the short-run fade and (d) view 5 were done in 3321592 (K111 stage
  3). `docs/design/K111.md` ("Stage 3 handoff"),
  `docs/design/K93_K145.md`.

## K234 (2026-10-15, shortened by the diet)

- **K234** · `scripts/phone_pass.ps1`'s `-Phase check` and `-WaitReady`
  treat a phone in use as ready. Round 2026-10-14b's agent saw Gmail in
  front at 10:10 and waited by hand for 120 s without user activity
  (`dumpsys power` activity ages) before starting; the check should do
  the same (`docs/design/K156.md`, "Round 2026-10-14b handoff").

## K232 (2026-10-15, shortened by the diet)

- **K232** · Round 2026-10-14b's pass (K156) found two borderline worse
  cells, both in the default link's load (`?b.J`, base 54a2b43 vs head
  48da84d): p95 33.4 -> 50.0 ms (floor 0.1) and first sleep
  18.4 -> 19.6 s (floor 1.2). Two reps, late in the pass on a hot phone
  (skin 31 -> 39 C), in portrait against the landscape floor; `gs=18`
  and the fabric cells don't echo them. Rerun with 3 reps once the floor
  matches the phone's orientation (K193, K195); K197 is the morning's
  load shift (`.claude/probes/rounds/2026-10-14-48da84d/pass/summary.md`).

## K230 (2026-10-15, shortened by the diet)

- **K230** · K92 did not check the badge's last fit level (the bare icon
  below the hamburger) with the panel open; its phone checks were desktop
  emulation, so the next phone pass covers K92 (`gameplay-badge.md`).
  No phone look reaches the badge's fit levels (shorter label, one word,
  the icon) at 411 px (round 2026-10-14b): check them in an emulated
  narrower viewport.

## K223 (2026-10-15, shortened by the diet)

- **K223** · Tooling after K198: K149's `.claude/probes/K148_K149/probe.mjs
  slack` checks the old 0.3-screen rule and now fails by design (K198's
  `.claude/probes/K198/pan.mjs` replaces it), and K173's
  `scripts/split_rules.json` still anchors on the old FIT CAMERA PAN
  SLACK entry, which matters only if the split is re-run.

## K222 (2026-10-15, shortened by the diet)

- **K222** · K198's maze edge leaves out the win ring (about 5 px past
  the disc, inside the 10 px gap), the head's glow and the minotaur, and
  the range ignores the panel's height, so a maze lower than a short
  panel still has to clear it (`docs/design/K198.md`, The calls).

## K217 (2026-10-15, shortened by the diet)

- **K217** · K93's trail split is placed linearly in ctrl, but the trail
  measures lattice length and the paint is linear in arc, so the fade
  start sits slightly off in arc (pre-existing: the partial oldest span
  does the same), and a fading part narrower than a pixel blends
  sub-pixel at the split (`docs/design/K93_K145.md`, Stage 1 handoff).

## K206 (2026-10-15, shortened by the diet)

- **K206** · A restored attempt stamps its fog right after the intro,
  while the threads are still re-settling, so with physics it differs
  from the live fog by an IoU of about 0.96. Option: stamp after the
  first sleep (`docs/design/K100.md`, Stage 1 handoff).

## K202 (2026-10-15, shortened by the diet)

- **K202** · A bare-URL daily left open past midnight with no move
  becomes practice when it is begun the next day (K146: begun after its
  day). An unstarted daily the bare URL opened could roll over to the new
  day instead (`docs/design/K146_K151.md`, "Open").

## K201 (2026-10-15, shortened by the diet)

- **K201** · History's "Played" chip counts any record, practice
  included, so it can exceed the played tile (24 against 21 in K146's
  history probe); a practice row's count ("Practiced K times") shows only
  in its tooltip, which phones lack (`src/ui/daily_stats_view.ts`).

## K197 (2026-10-15, shortened by the diet)

- **K197** · The phone's load settles later over ab6d330..54a2b43
  (K156's round pass of 2026-10-14): first sleep 8.0 -> 19.3 s, and
  over the first 30 s fps 46 -> 41 and p95 33 -> 50 ms, while the
  longest frame fell 684 -> 167 ms. K147's settle budget (b0a1c49..97293e7)
  is in the range and trades frame time for settle time (its own phone
  measure: first sleep about 17.5 s); the likely cause, unconfirmed.
  To attribute: the pass's frames phase with `-Base b0a1c49~1 -Head
  97293e7`; then whether 19 s is acceptable is Levi's call.

## K190 (2026-10-15, shortened by the diet)

- **K190** · Unmeasured costs from K154+K169 (aaa3dda). The new hash
  costs the drifting backgrounds' programs 37-60% more on the desktop
  (vellum-drift 0.352 -> 0.50 ms a frame at 3200x1800; static vellum
  pays nothing); the phone, and the junction fan program during a web
  fade, are unmeasured. Measure at K79's K52 phone gate, vellum-drift
  first. If the phone pays, a cheaper hash needs another shape (three
  multiplies per lane fail the avalanche test) that avoids PCG2D's
  structure (`docs/design/K154_K169.md`, "Stage 1 handoff").

## K195 (2026-10-15, shortened by the diet)

- **K195** · The phone pass's gaps (K156 3c, `docs/design/K156.md`,
  "Stage 3c handoff"): the watchdog's touch trip is untested (it needs a
  person); the noise floor is one 3-rep A/A pass, in landscape, for
  `-Moves 0,7,13` only (rerun A/A when the orientation, the phone or the
  load changes); every phone frame carries a blank white strip at the
  bottom (the screenshot is 387 CSS px high, the page 331); knot-mode
  render ms swings 7.5-20.5 ms in A/A, no use at rest; K80's indicator
  look shows the indicator but never taps it.
  - 2026-10-14: the white strip is fixed by K193 (c36b57c..763067a: screenshots
    clip to the viewport). The portrait floor was taken by K253
    (installed 2026-10-14 21:24 in 459cc11).
  - 2026-10-14 19:37: the watchdog's touch trip works. Levi's touch
    stopped K253's second A/A after 22 of 36 samples, and the pass's
    cleanup ran clean (K156, "Round 2026-10-14c handoff", Step 7).

## K123 (2026-10-15, shortened by the diet)

- **K123** · `.claude/probes/K10/phone_bench.mjs` drives the first
  visible `http://localhost:` tab on any port, so it can navigate one of
  Levi's own tabs. Use `.claude/probes/K79/phone/bench.mjs` (ports
  5371-5374 only), or filter by port (K79 stage A's gate, 2026-10-13).

## K130 (2026-10-15, shortened by the diet)

- **K130** · Panel rows with a slider step (`backgroundIntensity`,
  `pulseReach`, ...) snap to Tweakpane's step grid, which starts at the
  row's first value: after a link with an off-grid value, "Reset to
  defaults" can write a wrong default (e.g. intensity 0.48). Existing
  behavior (`src/ui/tweakpane_panel.ts`), found by K79 stage B1,
  2026-10-13. K147's `settleBudget` and `loadSettle` rows are stepped too.

## K131 (2026-10-15, shortened by the diet)

- **K131** · The phone probe kit (`.claude/probes/K79/phone/`,
  untracked): `drift.mjs` and `frames.mjs` take full-size PNG shots,
  10-25 s each over Tailscale (frames took 10 min, drift 8; "10 s"
  windows ran 35-65 s): use JPEG or clipped shots. `bench.mjs`'s
  `thermal()` reads the stale "Cached temperatures" block, not "Current
  temperatures from HAL". Untested: whether the watchdog's 2 s `dumpsys`
  poll and the CDP traffic add to the phone's bursty frame stalls (seen
  with no background too). The phone has no GPU timer, so a tighter
  cost A/B needs many interleaved reps. K79 stage A's gate, 2026-10-13.
  K81's gate kit reads the live HAL block (`.claude/probes/K81/phone/lib.mjs`
  in K81's worktree); K79's `bench.mjs` and `lib.mjs` still read the stale
  one.

## K12 (2026-10-15, shortened by the diet)

- **K12** · Star shape, e-w anchors: 6/8 seeds sleep; 2 hover at the
  threshold. Broader per K46's scans at gs 20-24: star fails to sleep on
  4/60 seeds, tree 4/60 and fish 2/60, some with a loud visible thrash
  of about 1 unit per substep. Heart 0/60, ring 0/60, rect 0/400.
  The circle (2026-10-12, gs 18) is clean on its default nw/se anchors
  (7/7) and w/e (6/6), but with n/s anchors 3 of 7 seeds never sleep:
  seeds 1 and 4 thrash at mv 2-6e-2 (about 108 ms of physics per
  frame), and seed 7 holds a standing rider at mv 1e-3. The ring at seed
  7 n/s sleeps. Repro: `?4.c&shp=circle&sa=n&xa=s&am=instant`.

## K62 (2026-10-15, shortened by the diet)

- **K62** · The `branchDensity` and `fourWayFraction` panel rows do
  nothing at the default `junctionSpacing` 2: the same maze for all 150
  seeds tested across 0.25-0.70. They look broken; rescale, relabel or
  hide them. `junctionSpacing` is the real density knob. (K46 finding.)
  K74 refines it: `branchDensity` 0.2-0.6 and `fourWayFraction` 0.4-0.7
  build the identical maze; 0.1, 0 and 0.8 or more change it.

## K16 (2026-10-15, shortened by the diet)

- **K16** · Physics settle is slow: 100-190 ms/frame at gs 18 on a loaded
  desktop; on the phone 7 sim-seconds took 14 s. K6/K7 fix the UI side.
  It matters more now: the daily (K20) makes the 18x18 default design
  the front door, at about 6 fps for its first seconds on a loaded
  desktop. Every design used to sleep at exactly sim 7.0 s, set by the
  gate rather than the design; since K63 it is about 5.0 (phone: 8.8 s
  wall instead of 13), so settle cost is particles x thread width.
  Thread width costs +25% per substep at 0.58 and +47% at 0.64. Intro
  wall time also stretches with slow settle frames. K279's wake check
  (2026-10-14, an idle desktop, `.claude/probes/K279/wake/`): a drag, a
  tap with the tug and a bare wake cost the same, 8.2 / 10.5 / 20-23 ms
  per 1/120 s substep (knot `?7k&mf=0`, 2592 particles; fabric `?b`,
  3011; dense, 5448), so every wake spirals to the 100 ms cap (12
  substeps a frame) and runs at 7-9 fps (3-4 dense) for 3-8 s. K162 (4)
  asks whether drags get K147's budget; K7's worker is the full fix.
  K279 suspected a regression since the 2026-10-10 audit (40 fps
  mid-drag), unconfirmed: the audit timed a different design. Offered to
  Levi at 18:25: a bare-wake probe on 2026-10-10's commit would settle it.

## K65 (2026-10-15, shortened by the diet)

- **K65** · Low-gridAlign knots (`ga=0`, e.g. Levi's rect link) creep
  under the quiet threshold: a fresh settle drifts about 1.5 world over
  about 50 s, and a cinch up to about 0.9 world/s. Every sleep gate, old
  or new, freezes them mid-creep. A net-displacement test over the window
  would catch it, but would keep such knots awake for tens of seconds.
  Related: K11. (K63 finding.)

## K29 (2026-10-15, shortened by the diet)

- **K29** · Boxed kinks at tw 0.64: 3 of ~152 kinks (8 seeds) rest at
  0.56-0.78 thread widths of eye hole - boxed in by a fused joint on one
  side and the 1.6 corridor floor on the other, they keep only lattice
  material. A stronger eye pressure (2.6) doesn't lift them; 2.8 left 2/8
  fat seeds awake. See "KINK EYES" in `.claude/rules/physics-kinks.md`. Since K41's chord law they
  rest a little smaller, because the flat law had pried their crossings
  open: five at 0.64-0.74 at tw .64, and X304 (seed 3zz2a1) at 0.78-0.80
  at the default width (was 0.83-0.86). K49 is the size decision. K90's
  census (2026-10-13): the boxed kink in `t64_1471kin` falls to 0.767
  widths after the r 2.5 drags.

## K30 (2026-10-15, shortened by the diet)

- **K30** · Very wide threads (tw >= 0.72) never sleep - standing riders;
  the same counts as before the kink fix (2/4 seeds at 0.72, 0/4 at 0.8).
  After K41, 7/8 seeds sleep at tw .72 (was 4/8). Seed 1q2w3e's kink X360
  cycles material through its crossing at mv about 0.09 (df373b5 did the
  same); turning eye pressure off doesn't stop it. The slider reaches 0.8.

## K50 (2026-10-15, shortened by the diet)

- **K50** · The riders gate measures overlap after the first final
  collision sweep but before the fusion snap, so a resting overlap of up
  to about 0.04 at joints can go unflagged. Measure the end-of-substep
  state instead. (K41 agent idea.)

## K59 (2026-10-15, shortened by the diet)

- **K59** · Two windows that are BOTH visible, with moves interleaved on
  one daily, end with the last writer's attempt winning. A tab adopts a
  newer saved attempt only when it comes into view; adopting on the
  `storage` event would fix it, at the price of rebuilding the other
  window (intro included) on every move.

## K26 (2026-10-15, shortened by the diet)

- **K26** · Plucks at tight loops, seen zoomed in. Only the concave side
  of the swing is capped, so the time exposure leans outward and a loop's
  eye gets a slightly ragged, enlarged rim during the ring. A symmetric
  cap fixed the eye but carved every hook's outer blur into lumps at
  normal zoom, so it was rejected.

## K42 (2026-10-15, shortened by the diet)

- **K42** · Silhouette-level cyclic overlaps: three ribbons over one
  pixel, each over the next (user link x170/x93 after repeated cinches,
  x134/x135 in one squeezed cinch: chains 1 > 2 > 0 > 1). G1's per-pixel
  protect can't break a cycle; it needs a per-pixel winner. 52-198
  naked px in those captures.

## K44 (2026-10-15, shortened by the diet)

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

## K69 (2026-10-15, shortened by the diet)

- **K69** · String mode (`pv=string`) on pre-G2.3 builds drew a 1-px
  diagonal sliver from the start to the exit marker inside the markers
  Graphics after a few moves (`?b.c&pv=string`, 6 moves; hiding that
  Graphics removes it). G2.3 does not show it, but it was never
  attributed; look again if it comes back (G2 doc section 7, Follow-ups).
  Since K83 (45aac50) that Graphics draws only the win ring; the markers
  are SDF quads.

## K103 (2026-10-15, shortened by the diet)

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

## K133 (2026-10-15, shortened by the diet)

- **K133** · Crossed join bridges: 108 plans built before K110 hold two
  join bridges that cross (the two diagonals of one cell), 20 of them
  dailies (#12 #32 #39 #60 #107 #113 #123 #131 #139 #151 #213 #260 #292
  #302 #338 #361 #370 #374 (twice) #380 #391). K110's joins skip such a
  splice; the older join code has no bridge-crossing check. Fixing it
  moves those plans and dailies, which the pre-launch policy allows;
  look first at whether a crossing reads wrong. Found by K110
  (`.claude/probes/K110/verify_run3.txt`).

## K136 (2026-10-15, shortened by the diet)

- **K136** · Tree gs6 1389 with dead ends never sleeps (140 s of sim,
  still moving), on both 7e41a02 and ade3537, so not K110's doing; maybe
  the K13 attractor. The repro was `?12l.IS3ygt`; since K74 stage 1 it is
  `?12l&gs=6&shp=tree`, and K74's agent saw it at the new defaults and
  with the old placement too. Evidence:
  `.claude/probes/K110/sheet/results_run1_tree_awake.json`.

## K142 (2026-10-15, shortened by the diet)

- **K142** · The A/B harness's first case in a fresh browser can read
  nonzero: 1 of 11 such runs (K79 B2b's `none_desk`, 274 px, max delta
  46, specks on thread edges). The master frame differed and the camera
  views matched; the cause is not found (a cold server or GPU cache is a
  suspect). Rerun before trusting it; a warm-up case is untested
  (`docs/design/K79.md`, "The 18/19 run").

## K143 (2026-10-15, shortened by the diet)

- **K143** · Vellum's fibers read as long crossing hatching near
  scale 2, the slider's new max (K129). K79 B merged with it (58b77cf);
  a look for the round's phone pass (K156; sheets in
  `.claude/probes/K79/out/view/`).

## K150 (2026-10-15, shortened by the diet)

- **K150** · Probe tooling isn't safe for concurrent agents (seen
  2026-10-13): `scripts/diag_screenshot.mjs` uses one fixed Chrome
  profile and an on-screen window, and `scripts/preview.ps1 -Ref` builds
  into fixed TEMP folders per commit (`src-<sha>`, `<sha>`), so two
  agents probing at once collide. Fix: per-run profiles and folders,
  off-screen windows (claude-config `rules/lessons.md`).
  - 2026-10-13: the coordinator gave K122's and K147's briefs the same
    port (5431); give each agent a disjoint port range. A probe that
    releases and re-takes the perf lock between samples leaves gaps
    another agent's builds can land in (K122 saw one in K81 3d's run).
  - 2026-10-13: `scripts/preview.ps1 -Root <dir>` builds into a per-run
    folder (K156 stage 1, 1f8be97). Callers that omit it still share the
    TEMP folder, and `diag_screenshot.mjs` still uses one fixed profile.

## K168 (2026-10-15, shortened by the diet)

- **K168** · K81's untested ranges: more than 20 routed records,
  zoomed in, and a full web on the phone (the gate walks the cheapest
  route, so a full web was certified on the desktop only and never
  timed). The round's looks can cover some (K156).

## K170 (2026-10-15, shortened by the diet)

- **K170** · `scripts/phone.ps1` sends KEYCODE_WAKEUP, against the
  phone rule (no key events; the phone stays awake on its charger).
  Proposed: no wake by default, a `-Wake` switch to opt in. (K156's
  `retry_quiet.ps1` drops its copy of the block.)
  - K156 3a proposed the same fix, as a `-NoWake` switch.

## K172 (2026-10-15, shortened by the diet)

- **K172** · K156's screenshot sheets have no text labels, and its drift
  looks show drift only inside the intro window. (3c checked the speed-8
  looks on the phone: they show motion, consecutive frames differing by
  8k-190k of 2.16M px.)

## K175 (2026-10-15, shortened by the diet)

- **K175** · K80's UI gaps (5fed5c1): a queued tap has no visual; the
  choice pulses go quiet during a move; the bull glyph is a placeholder
  (K98 has the glyph work); its off-screen indicator ignores
  `finishIndicator` (K84).

## K177 (2026-10-15, shortened by the diet)

- **K177** · K80's last unrun check: the minotaur's indicator on the
  phone itself, which the next round's pass shows (K174 checked it on
  the desktop in 411x753 emulation). K174 ran the other three: the fog
  modes; a non-instant intro (no chase tick before the first tap, and
  the minotaur wakes 2 s after it); desktop frame time (median 17.6 ms,
  the same as turn mode; the chase's own work under 0.1 ms). Chases are
  not saved or replayable: `replayChase` exists, and the dailies stay
  turn-based.

## K178 (2026-10-15, shortened by the diet)

- **K178** · Since K122, the private-cache vite wrappers of K19-K20, K79
  and K99 (and K104's, after its rebase) fail with ERR_MODULE_NOT_FOUND.
  K80's wrapper (`.claude/probes/K80/rt/vite.private-cache.config.ts`)
  loads the config with `loadConfigFromFile` and works
  (`.claude/rules/probes.md`).

## K181 (2026-10-15, shortened by the diet)

- **K181** · K104's residuals (`docs/design/K104.md`, "Stage 1b
  handoff"): the phone "can't tell" share stays 26% in fabric and 41% in
  dense; W deepens the raw collapse (+12% at pluckSize 1.75, +7% at 3);
  sound-only taps in junction cores, and taps bound by hide zones, can
  show only through a cue; the cue constants are unreviewed.
  - K104 stage 1c (`docs/design/K104.md`, "Stage 1c handoff"): G1's soft
    edge shows the under ribbon inside casing + CUT_BIAS at fabric and
    dense crossings of about 80-90 degrees, and still plucks brighten
    it; the census's outlier knot c3@523.23 (+2.87 px).

## K287 (2026-10-15, shortened by the diet)

- **K287** · K268 stage 1's residuals: (a) the brief's full proof sweep
  (0.05 ctrl reach steps over perpendicular, shallow and kink-eye
  crossings, growth 0.1-0.9, over-thread tips around a footprint) is not
  run: the proof ran 11 configurations on one state and exercised one
  slot; (b) the two-piece (MAX) case is unmeasured on the GPU
  (unit-tested only); (c) an over thread's own tip inside a footprint
  (item 5) has no GPU check; (d) the contact sheet is the proof's crops
  only; (e) fray's cut follows its wandering center fiber, so it
  flickers along the fiber's sine; (f) the mode-off A/B was not re-run
  after the rebase onto K114 (the coordinator's call: master's only
  `src/render` change since 4d3efe6 was K114's 157 lines in
  `fabric_maze_renderer.ts`, none on the gaps, and the A/B before the
  rebase was 25/25 at 0 px); (g) the phone check ran (K156 round
  2026-10-14c): the census's mismatch is 0 at every reach and look on
  the PowerVR, with no ghost notch or missing cut by eye; the per-slot
  cut proof there needs `__knotExplore` to expose slot positions.
  `docs/design/K268.md` ("Not done in stage 1", Calls).

## K289 (2026-10-15, shortened by the diet)

- **K289** · K279 stage 1's residuals: (a) the first ripple costs a
  10.3 ms spike on the desktop; (b) closed by the follow-up: fabric's
  real click was a move (`handleFabricTap`), not a pluck; (c) the ripple
  filter covers the whole root (bound its filterArea to the live discs,
  most of all for phones); (d) the ripple is sized in world units, so it
  shrinks on a phone (a CSS-px floor?): on the phone its ring is about
  41 CSS px across and the wave unreadable in stills; (e) no High
  contrast tie-in (ring off, or glint only?); (g) no webm clips; (i) once
  per load, the first tap's first frame spends 30-36 ms more in pixi's
  tick on the desktop (likely the ripple filter's compile: warm it at
  load); (j) the pre-rebase SHAs cited in `render-pluck.md` and K279.md
  (0f08f68, 2d905d0, da1333a, 4eb20a7) exist only on the local branch
  `k279-stage1-prerebase`: re-cite them as 50c1aab; (k) the phone probe
  `k279_phone.mjs` reads `ripples` 1.9 s after the tap, so always 0. The
  phone pass (K156 round 2026-10-14c) closed (f), flash safety (under 1%
  of the frame changes in every look: no area guard), and (h) (every
  look 60 fps, the tug's wake measured); it saw no first-tap stall on
  the phone, so (a) and (i) are desktop-only. `docs/design/K279.md`
  ("Stage 1 handoff", "Wake follow-up"); `docs/design/K156.md` ("Round
  2026-10-14c handoff").

## K291 (2026-10-15, shortened by the diet)

- **K291** · CI: the deploy run of ad2618a (2026-10-14) carried two
  annotations. Its actions (checkout@v4, setup-node@v4,
  wrangler-action@v3) target Node 20 and run forced on Node 24, and
  `ubuntu-latest` moves to Ubuntu 26 from 2026-10-19. Bump each action
  to a release that runs on Node 24; if the first deploy after the 19th
  fails, pin `ubuntu-24.04` until it is fixed (a red run leaves the
  previous deployment live). `.github/workflows/deploy.yml`.

## K293 (2026-10-15, shortened by the diet)

- **K293** · K80 turns stage 2's residuals, for stage 3: (a) under
  minoRestart the stars rate only the last life (reset() zeroes the
  walked meter), while the popover says the walk before it counts; (b)
  the ox emoji shows only in the share grid (the banner has no move
  grid), and never under minoRestart, whose restart empties the move
  log; (c) markCaught on an empty move log pushes `x`, so the moves read
  1; (d) with minoLair off the minotaur can camp the first junction past
  the entrance (the start is a sanctuary); (e) the minoSleep tooltip is
  wrong with minoLair off; (f) a Reset path restart shows no toast; (g)
  real time has no close-call or seen stats; (h) the messages of c021177
  and e571894 say codec 121-122; the rows are 128-129.
  `docs/design/K80_turns.md` ("Stage 2 handoff", "For stage 3").

## K295 (2026-10-15, shortened by the diet)

- **K295** · `.claude/probes/K155/probe_stars.mjs` is stale in two
  checks: it expects 4 rules lines in the stars popover (the stat lines
  follow them since K274) and today among the History rows (today keeps
  its own row since K146). K80 turns stage 2 fixed only its copy,
  `.claude/probes/K80/turns2/banner/probe_stars.mjs`.

## K300 (2026-10-15, shortened by the diet)

- **K300** · `scripts/phone_pass.ps1`'s `-Moves` default 0,7,13 (line
  110; the header, line 49, says `?b.J` is solved on its 14th move) now
  lands on the finish: master's `?b.J` is solved on its 12th move (since
  K74 stage 2, inferred), so fabric@13 times the stars and confetti and
  the bench only logs "made only 12 of 13". The summary already flags a
  sample taken at the finish. K253's portrait floor was taken at 0,7,13
  (fabric@13 on the finish in 6 of 6 samples), so change the default to
  0,7,11 together with the next A/A, which then takes a fabric@11 floor
  (`docs/design/K156.md`, "Round 2026-10-14c handoff", Step 7).

## K301 (2026-10-15, shortened by the diet)

- **K301** · The phone pass tab's layout flips from 411x753 to 412x755
  CSS px after its first real tap or move (round 2026-10-14c, under
  K193's CDP emulation): same-state baselines and fixed-size crops shear
  (K279's run-1 flash numbers were invalid; `k268_crops.mjs` now copies
  by each tile's row stride). Cause not found. The pass's looks and
  probes should cope, or re-pin the metrics after a tap
  (`docs/design/K156.md`, "Round 2026-10-14c handoff", call 6).

## K311 (2026-10-15, shortened by the diet)

- **K311** · PixiJS warns at load: "Attribute aGap / aGapId / aUV is not
  present in the shader" (in Levi's console, 2026-10-14; noted by K299's
  brief). Find which mesh binds attributes its program does not declare,
  and tidy it. `docs/design/K299_choice_pulse_bug.md`.

## K314 (2026-10-15, shortened by the diet)

- **K314** · `src/main.ts`: the non-finite watchdog's comment (about line
  4274 at 459cc11) says `halted` is "Cleared on regenerate", and the
  stamp says "(regenerate to reset)", but nothing sets it back to false
  (its only `= false` is the declaration). Noted by K7's stage 1.

## K315 (2026-10-15, shortened by the diet)

- **K315** · `__knotPhys` calls `sys.readSlideStats()`, which resets the
  slide counters it reads (a read that writes telemetry). Under K7's
  mirror it needs the diagnostic bridge or a worker-side count; decide in
  K7's stage 2 or 4 (`docs/design/K7_worker.md`, "Stage 1 handoff", "For
  stage 2", on K7's branch until it merges).

## K319 (2026-10-15, shortened by the diet)

- **K319** · ANGLE's Vulkan backend does not expose
  `KHR_parallel_shader_compile` (K307's stage 1), and phones may not
  either, so there K307's warm-up falls back to blocking links and the
  screen still stalls for the longest compile (section-rgb, about 2.8 s
  cold on the desktop's D3D11). The phone's answer rides K156's next pass
  (K307's measures).

## K342 (2026-10-15, shortened by the diet)

- **K342** · The snore link (K325) is verified on desktop Chrome only:
  Android Chrome and Safari/iOS on a device are unchecked (the touch
  delay's feel, and whether Android cuts the sound when the tab
  switches), as are other desktop browsers. Android rides K156's next
  phone pass. `gameplay-audio.md`, THE SNORING CAT LINK.

## K343 (2026-10-15, shortened by the diet)

- **K343** · The snore's first-input limit (K325): no AudioContext
  exists before the first activation, so a hover before any click or key
  is silent, and the gesture that opens the audio gate plays nothing
  (the MP3 is not decoded yet). The fix: decode on an
  OfflineAudioContext before the gate, so a first touch can play.
  `gameplay-audio.md`, THE SNORING CAT LINK.

## K348 (2026-10-15, shortened by the diet)

- **K348** · Key-move edges left by K329/K333/K334: the clockwise X
  assignment switches only once arms move past KEY_TIE; at a T a chord
  can pick a run by elimination; a sloppy chord whose first key is clear
  alone gives that move plus a queued second (absorbed only when the
  chord picks the same run); a hold whose first run is shorter than
  HOLD_DELAY pauses at the first junction; a turn-minotaur wait tap
  during a move isn't queued; the tap and pointer hovers may fight while
  a tap waits; the arrival frame's overshoot (under a frame of travel
  per chained junction) is dropped. Lore: TIE CYCLES, CHORDS AND THE
  MOVE WAIT in `gameplay-moves.md`.

## K349 (2026-10-15, shortened by the diet)

- **K349** · K120's key probe lags the new rules. Its hold loops got
  K329's `waiting` patch on 2026-10-14 (`.claude/probes/K120/keys.mjs`;
  the old copy is `keys.pre-k329.mjs`), but its realtime check "a held
  key keeps adding inputs" fails on master too (today's `?7.J` hold
  from node_14 stops after one move; it needs a start where holds
  chain), and its queued-run check should poll inside the page. One
  real-time first-press miss under load (sim 3.3 s against wall 20.5 s)
  was not reproduced in 10 tries
  (`.claude/probes/K329/k120/out/keys-run2.log`).

## K322 (2026-10-15, shortened by the diet)

- **K322** · Art, sound and music by people (Levi, 2026-10-14 21:47: "we
  can have a follow-up item to get better icon art and to get better sfx
  and music from actual people. We'll also want to credit them."):
  commission or license better icon art, sound effects and music before
  launch, and credit each artist on the credits page (K321) with the
  terms their work ships under (`notices/credits.ts`).

## K259 (2026-10-15, shortened by the diet)

- **K259** · With the explore mode on, a chain with any visible piece
  draws its whole mesh, so hidden fragments still run the shader; drawing
  only the visible index range would make mode on cheaper. Not needed
  yet: 2a's cost bound never exceeds master's program (K76 stage 2a's
  report; `docs/design/K76.md`, "Stage 2a handoff").

## K256 (2026-10-15, shortened by the diet)

- **K256** · The phone warms about 6 C in a pass's first rep, so cells
  run at different temperatures (K193's A/A: rep 0's base fabric at
  32-34 C, head at 35-36.5 C, and the next rep reverses the order). A
  warm-up before the bench, or a temperature column in the summary,
  would separate heat from noise (`docs/design/K193.md`, "Stage 1
  handoff").

## K247 (2026-10-15, shortened by the diet)

- **K247** · K174's ideas: readable labels in the Minotaur folder (the
  `mino*` keys clip, K246); a catch toast that says the fog came back;
  for more than about 2/3 of games to meet the minotaur, homing or the
  rejected "closest" roam pick (2.11 catches a game at 0.5).
  `docs/design/K174.md` ("Stage 1 handoff").

## K233 (2026-10-15, shortened by the diet)

- **K233** · The phone pass's length: the full spec (26 looks, 3 reps)
  takes about 55-60 min (frames about 6.7 min a rep, looks about 80 s
  each; round 2026-10-14b). Trim it per round, or add a spec `deadline`
  so no look starts after it (`pass/state/watchdog.trip` already stops a
  pass gracefully; `docs/design/K156.md`, "Round 2026-10-14b handoff").

## K33 (2026-10-15, shortened by the diet)

- **K33** · A share button that opens the phone's native share sheet with
  the link (the link holds the whole design). The daily's result share
  shipped with K20 (win banner and stats view); a general "share this
  design" button is what remains.

## K36 (2026-10-15, shortened by the diet)

- **K36** · Add to home screen: a web app manifest and icons. Blocked on
  icon art (Levi has the prompt for another model). The same art fixes
  the `/favicon.ico` 404 on every load.
  - K122 found the Vite template's leftovers: `public/favicon.svg` (the
    Vite logo, shipped but never referenced), `public/icons.svg` and
    `src/assets/hero.png` (unreferenced). Delete them, or wire up the
    real favicon.

## K66 (2026-10-15, shortened by the diet)

- **K66** · Why do bridges at joints, open tails and kink neighborhoods
  end the settle ramp near an unstable point? They snap to a new rest
  3.5-5 s in, mostly under the quiet threshold, which is what forces
  K63's 2.5 s window. Fixing it could make a 0.75 s window safe (K64).
  (K63 agent idea; harness in `.claude/probes/K63/`.)

## K84 (2026-10-15, shortened by the diet)

- **K84** · After the churn: a pass over EVERY param (Levi, 2026-10-13).
  - Classify each as a viewer preference (localStorage) or a design param
    (the link).
  - Keep each param in its concept's folder and mark the preferences
    instead (K292): Levi dropped the separate section on 2026-10-14 at
    about 18:40.
  - Re-evaluate each param's worth and grouping, and audit names and
    tooltips.
  - Place K73's two viewer preferences, `finishIndicator` and
    `tapToPan` (localStorage, panel checkboxes), and K79's Motion
    setting (`knotmaze.motion`, today in Motion & intro).
  - K111 adds High contrast (`knotmaze.contrast`, in the Accessibility
    folder). No viewer preference follows a change made in another tab
    (no `storage` listener).

## K85 (2026-10-15, shortened by the diet)

- **K85** · Replay links (Levi, 2026-10-13): record a playthrough, put it
  in a link, and replay it with the path animating. The link works for a
  finished session (watch) or an in-progress one (pick up where it left
  off). Builds on K47: an attempt already IS its tap list plus a
  walk-graph fingerprint, and choice indices encode in a few bits per
  move. A link needs the design token, the taps, and per-move timing for
  a faithful replay. The share link stays as it is.

## K91 (2026-10-15, shortened by the diet)

- **K91** · A shorter quiet window for physics-off loads. They never wake,
  so a freeze 1-4 px short of rest can't snap later, and their hidden
  settle would drop from 5.0 sim-s back toward 3.25. The cost: for about
  4% of designs, the layout differs by 1-4 px from physics-on, which
  K57's exempt physics toggle assumes is the same. (K64 follow-up.)

## K82 (2026-10-15, shortened by the diet)

- **K82** · Manually override the daily maze for a given day (Levi,
  2026-10-12; "could be a follow-up thing"). It fits the pinned-daily
  model as a frozen per-day override table beside the versioned
  definitions. A published day's override must never change, like a
  definition (`.claude/rules/gameplay-daily.md`, daily rule 1).

## K68 (2026-10-15, shortened by the diet)

- **K68** · If junction-web edges look soft at deep zoom, size the arm
  material strip rows from the camera's world-per-pixel (re-packed on
  zoom) instead of raising the 64-texel width for everyone. About 4x the
  default zoom puts a cr 3 median strip step near 1.5 CSS px. (K4 agent
  idea.)

## K71 (2026-10-15, shortened by the diet)

- **K71** · Wobbly threads at slack ~0 (P2 polish): small waviness along
  runs and rope-tight twist chains at the taut end. Candidate knobs:
  constraint iterations, pullOnly bending, repulsion/structural balance
  (`docs/history.md`, Follow-ups).

## K119 (2026-10-15, shortened by the diet)

- **K119** · i18n, at the end (Levi, 2026-10-13): there is little
  text, and an LLM will drive the translations and other i18n work. The
  strings are mostly in `src/ui/` and `src/game/share_text.ts`; text
  drawn as threads is K115's question.

## K141 (2026-10-15, shortened by the diet)

- **K141** · K80 section 4's costlier mechanisms, deferred (Levi,
  2026-10-13 about 15:30: "Let's defer those M-L or L items."): 4.8
  sentries (call 9's "validated sentries"), 4.22 two-player (M
  hot-seat, L networked), 4.25 over-under swap
  (`docs/design/K80_gameplay_additions.md`). The M ones are K138.

## K160 (2026-10-15, shortened by the diet)

- **K160** · The background speed slider is linear over 0-8 (about
  0.09 a pixel); a curve like gridAlign's (`src/ui/grid_align_curve.ts`)
  would give the slow end room. At 8x the 10-15 Hz texture pass may look
  steppy (not checked on the phone); if it does, scale the re-render rate
  with the speed. A look for the round's phone pass (K156).

## K57 (2026-10-15, shortened by the diet)

- **K57** · Confirm the daily's exempt settings: the ones a player may
  change without leaving the daily (`DAILY_EXEMPT_KEYS` in
  `src/ui/daily_link.ts`, persisted across dailies). Parked for the
  late-stage review with K46 and K84 (Levi, 2026-10-14 about 00:22,
  `docs/design/levi_notes_2026-10-14.md` item 13: "Let's review this
  list later, after all the other gameplay and system churn, when we're
  doing all the other late-stage wrap-up stuff.").
  - Levi's list: volume, soundMode, cameraMode, showStats, panel
    open/close/scroll.
  - The agent added: the rest of the Sound folder (pitchSpace, octaves,
    rootNote, tonicEmphasis, soundSpeed, reverb, brightness, sustain,
    shimmer, pickPosition), Touch & feel (pluckSize, pluckGhost,
    pluckReach, pluckStyle, tugLimit, snapBack), and physics on/off (the
    settled layout is the same).
  - Everything else leaves the daily, including moveSpeed, pathViz, fog,
    the intro and flow, and the physics tuning. K79's `backgroundSpeed`
    is not exempt either, like background and its intensity.
  - Exempt since: K140's confetti on/off and amount (`cf`, `cfa`), and
    K147's `settleBudget` and `loadSettle` (K162 (3) asks whether they
    stay); K180 adds its pluck params; K98 adds `markerSize` (`mks`);
    K145 adds `hoverGlow` (`hg`; K237 asks whether it stays).
  - K111's Reduced motion stills the flow by an override, not an edit,
    so the daily stays; moving the flow sliders still leaves it.
  - The comment at `src/ui/daily_link.ts:153` still calls `hoverGlow`
    "Proposed for Levi's review", though K237 and K264 answered it.
    Still open: `settleBudget`, `loadSettle`, the two confetti settings
    and `markerSize`.

## K117 (2026-10-15, shortened by the diet)

- **K117** · Repo visibility (Levi's notes, 2026-10-13;
  `docs/design/levi_notes_2026-10-13.md`). Levi: private later, on his
  word; he won't share it for a while. Done in a756ca5: the panel's
  GitHub link is gone, `LICENSE` says all rights reserved (Snoring Cat
  LLC. holds them: 7a63ec4, Levi 2026-10-13), package.json
  says UNLICENSED, and a push touching only the ledger, docs, `.claude/`,
  README or LICENSE skips the deploy (Actions minutes count against the
  plan once private; deploys used about 330 minutes in the last 7 days,
  and the free plan has 2,000 a month). Obfuscating the bundle: not worth
  it (answered 2026-10-13; it is minified and ships no sourcemaps). K122
  (the bundled packages' license notices) is needed either way. On his
  word: `gh repo edit --visibility private
  --accept-visibility-change-consequences` (reversible; hides the code,
  history, docs and this ledger from then on, not copies already made;
  the Pages deploy keeps working).
  - Parked until near launch (Levi, 2026-10-14 about 00:22, item 11:
    "wait until we're closer to done to save on CI churn cost.").

## K310 (2026-10-15, shortened by the diet)

- **K310** · K299's leftover shots: its seam sheet shows two pulse
  phases, not three or four, and its rim was injected rather than a real
  hovered choice (K298 builds the hovered choice).
  `.claude/probes/K299/sheet/`.

## K316 (2026-10-15, shortened by the diet)

- **K316** · Single-threaded WASM for the collision narrow-phase: the
  audit's 2-4x on that slice (about 40% of a drag's physics), about
  enough to bring gs 18 from 0.76x to real time under K7. Only if K7
  stage 5's phone numbers show that physics, not rendering, is the
  bottleneck. Threads are ruled out: the Gauss-Seidel solver must not be
  colored (CLAUDE.md's architecture audit), only the collision pass could
  split, and SharedArrayBuffer needs COOP/COEP on pages.dev, through the
  levi.dev proxy and on the dev server, with Cloudflare's injected beacon
  allowed. Levi asked on 2026-10-14 at about 21:18; answered at about
  21:20.

## K320 (2026-10-15, shortened by the diet)

- **K320** · Slim or split section-rgb: at 46,850 characters it is the
  cold critical path (about 2.8 s on the desktop, K307's stage 1). Every
  deploy that changes a shader costs every player one cold compile (the
  browser caches programs by their source), so a smaller or split
  program shortens every such load, not only the first.

## K353 (2026-10-15, closed)

- **K353** · The ledger diet: shorten every item over three lines and
  archive the originals (`docs/ledger_notes.md`, `docs/ledger_done.md`).
  - owner: agent `a18f9a57206d9475d` (sonnet) of claude session d8031183, from 2026-10-15 00:13 (cap 01:13; scripts and docs only)
  - branch: `worktree-agent-a18f9a57206d9475d` (`.claude/worktrees/agent-a18f9a57206d9475d`); last commit: none yet (base `d741412`)
  - evidence: its worktree's `scripts/ledger_diet.mjs`, `docs/ledger_diet/map.jsonl` and `.claude/probes/K353/`
  - next: when it reports, apply the map to master at a quiet point (`apply --dry-run`, then `apply`, then `verify` against the pre-apply copy); tomorrow with Levi, the same diet for claude-config's and the other repos' ledgers, plus the claude-config side (the `rules/ledger.md` convention, a shared `tools/ledger.mjs`, the merge script closing items, a nightly hygiene job), filed in claude-config's ledger (Levi, 2026-10-15 00:05)
  - brief: `docs/design/K353_ledger_diet.md`

## K8 (2026-10-15, stage 1 merged)

- **K8** · G3: SDF ribbons drawn from one shared sample texture
  (`docs/design/G3G4_sdf_geometry.md`). Decided: flat caps on anchored
  tails, a 2x phone cap, today's fold pinch, and G1's GPU levers fold in.
  - owner: agent `a35a43cee74c92b93` (opus) of claude session d8031183, from 2026-10-15 00:13 (cap 02:13; docs only, ports 5880-5889)
  - branch: `worktree-agent-a35a43cee74c92b93` (`.claude/worktrees/agent-a35a43cee74c92b93`); last commit: none yet (base `d741412`)
  - evidence: its worktree's `docs/design/G3G4_sdf_geometry.md` and `docs/design/K8_stage1.md`
  - next: stage 1 re-bases the doc's plan on today's master and writes the "Stage 2 (G3-0)" brief; then G3-0 takes the next free code slot
  - brief: `docs/design/K8_stage1.md`

## K328 (2026-10-15, K8 stage 1: no G3/G4 need)

- **K328** · The hover glow's rim profile (Levi, 2026-10-14): a fully
  opaque band at the rim's outside, then a fade starting further in, as
  knobs that High contrast reuses with the fade at 0 (K265's pick).
  Today's profile is kRimAcross (`render-paint.md`); also hide the
  glow's rows at strength 0 (K298's leftover). Probably folds into K9's
  G4-1 with K345 (K8's stage 1 checks whether it needs G3); otherwise
  K111 stage 5 with K265.

## K345 (2026-10-15, K8 stage 1: G4-1)

- **K345** · The hover rim stops at `rimGap` (0.975 world) short of
  junctions; Levi (2026-10-14) wants it to follow the fillets. That
  needs an edge-distance term in the fan shader and a rule for where the
  rim ends on the web (K145 kept it off webs; `render-paint.md`).
  Probably folds into K9's G4-1 with K328 (K8's stage 1 confirms).

## K76 (2026-10-15, stage 2c merged)

- **K76** · The thread-reveal mode, stage 2 (Levi, 2026-10-13): an
  end-look dropdown (default beacon) and one `exploration` dropdown (off
  | fog | threads) replacing the fog toggle, built as a separate shader
  variant. Design `docs/design/K76_reveal_mode.md`; 2a and 2b merged
  (residuals K258, K276; joints fade with their thread, K275), 2c
  running, then K268 stage 2, K290 and 2d.
  - owner: agent a58040d5b7b031c80 (opus) of claude session d8031183,
    stage 2c from 23:39 (cap 01:39; ports 5810-5819); earlier worktrees
    kept (2b `ac6e354b85922e7aa`, 2a `a5d63452980ed9fa3`, stage 1
    `aea102de995e1ce30`)
  - branch: `worktree-agent-a58040d5b7b031c80`
    (`.claude/worktrees/agent-a58040d5b7b031c80`, from 2c81a92); last
    commit: `2c81a92` (master) until its first WIP commit
  - evidence: `.claude/probes/K76/stage2c/` in its worktree; 2a's and
    2b's in the main checkout's `.claude/probes/K76/` (sheets
    `stage2a/out/sheet/`, `stage2b/out/`); lore `render-explore.md`
  - next: stage 2c (move-event feed, input gating and camera, the
    `exploration` dropdown with codec 6, K73 indicator, intro, K257's
    and K286's recommendations, a census walk), its handoff, the merge
  - brief: `docs/design/K76.md` ("Stage 2c", 79c5a97), then
    `docs/design/K76_reveal_mode.md`

## K268 (2026-10-15, stage 2 started)

- **K268** · Shaped crossing gaps under thread reveal (K76; Levi,
  2026-10-14 15:16): a gap must not show until the over thread is seen,
  and a stub's variable overlap and dead ends need a dynamic gap shape.
  Stage 1 (the ribbon's shaped cut, proof, desktop sheet) merged; stage
  2 is the fans, pluck-still, protect, smooth-min, underWindows and
  caps.
  - owner: nobody since 2026-10-14 17:50 (stage 1 merged; agent
    ab65d913a3b9a3dcb, worktree
    `.claude/worktrees/agent-ab65d913a3b9a3dcb` kept)
  - branch: mainline; last commit: `61c8859` (stage 1 is
    1e55365..61c8859)
  - evidence: `.claude/probes/K268/` (the proof, the census, GPU
    timings, the partial sheet)
  - next: stage 2 ("For stage 2", with K275's fade), after the physics
    worker and never alongside K76 2c, K298, K299 or K111 stage 5 (all
    change the paint shaders); residuals K287, draw order waits on Levi
    (K286); burn stage 3 runs the cut in reverse (K290)
  - brief: `docs/design/K268.md` ("Stage 1 handoff (2026-10-14 17:41)",
    "For stage 2"); the design is in `docs/design/K76.md` ("Shaped gaps
    (Levi, 15:16)")

## K279 (2026-10-15, closed: stage 2 merged)

- **K279** · Plucks you can see, feel and hear (Levi, 2026-10-14): a
  ripple at pluck points (glint by default, K288), more vibration, a tug
  (off: its wake cost is K7's), quieter auto plucks. Stage 1: ad2618a.
  - owner: agent `a910830b0197dd699` (opus) of claude session d8031183, from 2026-10-15 00:42 (cap 02:42; ports 5900-5909)
  - branch: `worktree-agent-a910830b0197dd699` (`.claude/worktrees/agent-a910830b0197dd699`); last commit: none yet (base `9b977d8`)
  - evidence: `.claude/probes/K279/` (stage 1: `sheet2/`, `k279_wake.mjs`); stage 2's in its worktree's `.claude/probes/K279/stage2/`
  - next: stage 2 makes glint the default `prp`, bounds and warms the ripple filter, checks glint's phone size and K289 (j, k); then the merge and the next phone round
  - brief: `docs/design/K279.md`, "Stage 2: glint by default"

## K289 (2026-10-15, K279 stage 2 closed a, c, d, i, j, k)

- **K289** · K279 stage 1's open residuals: (a, i) the first ripple
  costs a 10 ms spike and the first tap's first frame 30-36 ms more on
  the desktop (likely the ripple filter's compile: warm it at load; no
  stall on the phone); (c) the ripple filter covers the whole root
  (bound its filterArea to the live discs, most of all for phones); (d)
  the ripple is sized in world units, so it shrinks on a phone (a CSS-px
  floor?); (e) no High contrast tie-in (ring off, or glint only?); (g)
  no webm clips; (j) `render-pluck.md` and K279.md cite pre-rebase SHAs
  (0f08f68, 2d905d0, da1333a, 4eb20a7) that exist only on the local
  branch `k279-stage1-prerebase`: re-cite them as 50c1aab; (k)
  `k279_phone.mjs` reads `ripples` 1.9 s after the tap, so always 0.
  `docs/design/K279.md` ("Stage 1 handoff", "Wake follow-up").

## K7 (2026-10-15, stage 4 merged, stage 5 started)

- **K7** · Physics in a Web Worker with render-side interpolation, so the
  intro runs at full frame rate while physics settles (K28). Levi's calls:
  K302. Stages 1-3 merged; stage 3 put the worker behind `phw` (63603bd..7f4c1bd).
  - owner: agent `abee0faca59fb8636` (opus) of claude session d8031183, from 2026-10-15 00:48 (cap 02:48; ports 5796-5797; owns `main.ts`)
  - branch: `worktree-agent-abee0faca59fb8636` (`.claude/worktrees/agent-abee0faca59fb8636`); last commit: none yet (base `7f4c1bd`)
  - evidence: `.claude/probes/K7/` (stage 3: `stage3/` with `run_s3.ps1`, `k7_frames.mjs`, the results); stage 4's in its worktree's `.claude/probes/K7/stage4/`
  - next: stage 4, the diagnostic bridge and desktop acceptance under the perf lock, with K307's unexplained main-thread JS; then stage 5 (the phone, the worker by default); then K5 and K6
  - brief: `docs/design/K7_worker.md`, "Stage 4" and the stage 3 handoff's "For stage 4"

## K307 (2026-10-15, K7 stage 4 traced the freezes)

- **K307** · The daily intro's freezes are cold shader compiles (stage
  1's trace, 2026-10-14; Pixi blocks on `linkProgram` and the wait stops
  every present). A `KHR_parallel_shader_compile` prototype kept the
  screen presenting, so stage 2 builds the warm-up (Levi, K302 (8):
  "Let's prioritize this too").
  - owner: nobody since 2026-10-14 21:39 (stage 1 merged at 22:06; agent
    a119ffbc187f24aad (opus) of claude d8031183); stage 2 waits for a
    code slot
  - branch: mainline; last commit: `b72d5dd`; the local `k307-proto`
    (51f7480) holds throwaway prototypes and is never merged
  - evidence: `.claude/probes/K307/` (`trace_intro.mjs`, traces,
    `builds/`, patches); lore `.claude/rules/render-shaders.md`
  - next: stage 2, the warm-up (`src/render/program_registry.ts`,
    `src/render/shader_warmup.ts`, `__knotWarmup()`, a 15 s gate on
    `finishPresettle`, wave 1 then wave 2 for untimed programs); K329
    may still touch `main.ts`; the phone's measures ride K156's next
    pass
  - brief: `docs/design/K307_intro_freezes.md` ("Stage 1 handoff",
    "Stage 2: the warm-up")

## K5 (2026-10-15, the design started)

- **K5** · Split `main.ts` and `ribbon_renderer.ts` along the new data
  lines (K1-K3 done). After K7's stage 5 (it conflicts with stages 1, 3
  and 4; the host makes it smaller); first in line once that merges
  (Levi, 2026-10-14 23:46, would like it sooner).

## K268 (2026-10-15, stage 2 merged)

- **K268** · Shaped crossing gaps under thread reveal (K76; Levi,
  2026-10-14): no gap until the over thread is seen, and a dynamic gap for
  a stub's overlap and dead ends. Stage 1 merged; stage 2 runs.
  - owner: agent `a42c63c2db0401edb` (opus) of claude session d8031183, stage 2 from 01:15 (cap 03:15; ports 5820-5829); stage 1's worktree `ab65d913a3b9a3dcb` kept
  - branch: `worktree-agent-a42c63c2db0401edb` (`.claude/worktrees/agent-a42c63c2db0401edb`, from `82c1f23`); last commit: `82c1f23` (master) until its first WIP commit
  - evidence: `.claude/probes/K268/` (stage 1's); stage 2's in its worktree's `.claude/probes/K268/stage2/`
  - next: first the MAX defect K76 2c found (crossing 275, both threads walked: the mode on cuts 0 px of gap against 1010 px off, so the threads fuse; `.claude/probes/K76/stage2c/out/census_new2/shaped_c275.png`), then K275's fade, the fans and still pluck, protect, smooth-min, underWindows; never alongside K298, K299 or K111 s5; K290 next in the chain
  - brief: `docs/design/K268.md` ("For stage 2"); `docs/design/K76.md` ("Stage 2c handoff", "For K268 stage 2")

## K290 (2026-10-15, burn stage 3a started)

- **K290** · Burnt threads, a toggle (Levi, 2026-10-14): a `burnt`
  dropdown, char (drawn in a burnt coloring) or gone (not drawn; the
  under threads' gaps close, K268's shaped cut in reverse; fans drop the
  arm); default gone. Burn stage 3 builds both on K76's visibility and
  K268's shaped gaps, so those briefs must not assume visibility only
  grows. `docs/design/K114_burn.md` (stage 3).

## K5 (2026-10-15, the design merged)

- **K5** · Split `main.ts` and `ribbon_renderer.ts` along K1-K3's data lines,
  with seams so G3 becomes a module swap; K6 (one frame loop) is designed with
  it. Levi wants both soon (2026-10-14 23:46).
  - owner: agent `aa60ed52201f75682` (opus) of claude session d8031183, the design (docs only) from 02:37 (cap 04:37)
  - branch: `worktree-agent-aa60ed52201f75682` (`.claude/worktrees/agent-aa60ed52201f75682`, from `f04aa4b`); last commit: `f04aa4b` (master) until its first WIP commit
  - evidence: its worktree's `.claude/probes/K5/design/`
  - next: the design and stage 1's brief in `docs/design/K5_K6_split.md`; stage 1 starts after K7 stage 5 merges (about 04:40)
  - brief: this item, K6's and `docs/design/K7_worker.md` (lines 20-35); the design doc once merged

## K6 (2026-10-15, staged by the K5 design)

- **K6** · One frame loop driven by what-changed flags (after K5):
  replaces K21's stand-in `sceneAnimating()` in main.ts, and the
  render-on-demand loop (K24) asks `background.needsFrame()`. After K7's
  stage 5; first in line with K5.

## K24 (2026-10-15, folded into K6-3)

- **K24** · Render on demand when the scene is fully static (battery);
  part of K6. An animated background (K21) must not defeat it. After
  K7's stage 5; it reads `host.asleep`.

## K7 (2026-10-15, stage 5 merged)

- **K7** · Physics in a Web Worker with render-side interpolation (K28; Levi's
  calls K302). Stages 1-4 merged: the worker behind `phw`, the probe bridge and
  desktop acceptance (4d39a1f..de22867). Stage 5: the phone, then the default.
  - owner: agent `adf244f47f53e8230` (opus) of claude session d8031183, stage 5 from 02:35 (cap 04:35; ports 5798-5799; owns `main.ts`; the phone first, under the phone lock); stage 4's worktree `abee0faca59fb8636` kept
  - branch: `worktree-agent-adf244f47f53e8230` (`.claude/worktrees/agent-adf244f47f53e8230`, from `de22867`); last commit: `de22867` (master) until its first WIP commit
  - evidence: `.claude/probes/K7/` (`stage3/`; `stage4/` with `k7_frames.mjs`, `k7_latency.mjs`, `run_s4.ps1`, `table_s4.mjs`, `k307/`, `ports/`); stage 5's in its worktree's `.claude/probes/K7/stage5/`
  - next: stage 5: the worker start gate, the phone pass (Design 10's criteria, plus touch latency), then `phw` on by default if it passes, K147's budget bypass and the lore; then K5 and K6
  - brief: `docs/design/K7_worker.md`, "Stage 5" and the stage 4 handoff's "For stage 5"

## K370 (2026-10-15, the phone numbers)

- **K370** · The worker's input latency (K7 s4): p50 105 ms on the daily, 70 on
  the knot (in-thread 285), against a 50 ms target. Measure each stage first
  (`k7_latency.mjs`); levers: newest snapshot while grabbed, more drag substeps.

## K8 (2026-10-15, G3-0 merged)

- **K8** · G3: SDF ribbons drawn from one shared sample texture
  (`docs/design/G3G4_sdf_geometry.md`, re-based by stage 1, 05aac8e..cbeb963). G3-1
  waits for K268 s2 and K290, G3-2 for the reveal chain (K76 2c to 2d).
  - owner: agent `af653fa7f942f2f1e` (opus) of claude session d8031183, stage 2 (G3-0) from 02:04 (cap 04:04; ports 5830-5839); stage 1's docs worktree `a35a43cee74c92b93` kept
  - branch: `worktree-agent-af653fa7f942f2f1e` (`.claude/worktrees/agent-af653fa7f942f2f1e`, from `fa7f9dc`); last commit: `fa7f9dc` (master) until its first WIP commit
  - evidence: `docs/design/G3G4_sdf_geometry.md`, `docs/design/K8_stage1.md` ("Stage 1 handoff"); stage 1's notes in `.claude/probes/K8/stage1/notes.md`; stage 2's in its worktree's `.claude/probes/K8/stage2/`
  - next: G3-0 (the capture/restore hook, the sample table, the frame bench, the pixel A/B, a phone pass if reachable), never alongside K90; Levi's calls are K361 (none blocks G3-0)
  - brief: `docs/design/K8_stage1.md`, "Stage 2 (G3-0)"

## K307 (2026-10-15, stage 2 launched)

- **K307** · The daily intro's freezes are cold shader compiles (Levi, K302 (8):
  prioritize). K7 s4's trace: GPU compile waits (bg-vellum's 190 ms queued behind
  12-15 small links); the worker can't hide them; its 6.1 s frame is gone.
  - owner: nobody since 2026-10-14 21:39 (stage 1 merged at 22:06; agent a119ffbc187f24aad (opus) of claude d8031183); stage 2 waits for a code slot
  - branch: mainline; last commit: `b72d5dd`; the local `k307-proto` (51f7480) holds throwaway prototypes and is never merged
  - evidence: `.claude/probes/K307/` (`trace_intro.mjs`, traces, `builds/`, patches); K7 s4's traces in `.claude/probes/K7/stage4/k307/`; lore `.claude/rules/render-shaders.md`
  - next: stage 2, the warm-up (`program_registry.ts`, `shader_warmup.ts`, `__knotWarmup()`, a 15 s gate on `finishPresettle`, wave 1 then wave 2), not alongside K7 s5 (both edit `main.ts`); K366 rides it, and so do K268 s2's three explore variants (`render-shaders.md`); the phone's measures ride K156's next pass
  - brief: `docs/design/K307_intro_freezes.md` ("Stage 1 handoff", "Stage 2: the warm-up"); K7's in `docs/design/K7_worker.md` ("Stage 4 handoff")

## K290 (2026-10-15, stage 3a merged)

- **K290** · Burnt threads, a toggle (Levi, 2026-10-14): a `burnt` dropdown,
  gone (default: not drawn, under threads' gaps close, fans drop the arm) or
  char (a burnt coloring in the shader). Burn stage 3a; 3b is the front's FX.
  - owner: agent `adb9f09e19dfd0c55` (opus) of claude session d8031183, stage 3a from 03:27 (cap 05:27; ports 5820-5829)
  - branch: `worktree-agent-adb9f09e19dfd0c55` (`.claude/worktrees/agent-adb9f09e19dfd0c55`, from `f799991`); last commit: `f799991` (master) until its first WIP commit
  - evidence: its worktree's `.claude/probes/K290/stage3a/`; burn stage 1's `.claude/probes/K114/`
  - next: stage 3a: the param, gone through the explore VIS machinery reversed, char in the shader, a desktop sheet of both looks; then 3b (the front's char band and embers, the `burn` FX on `tipsAt`, the fuse, the fire's light under fog, the phone sheet)
  - brief: `docs/design/K114_burn.md`, "The stages" (Stage 3) and "Stage 1 handoff"; the stage 3a handoff once written

## K76 (2026-10-15, stage 2d launched)

- **K76** · Thread-reveal mode, stage 2 (Levi, 2026-10-13): `exploration`
  (off | fog | threads) and an end look, a separate shader variant. 2a-2c
  merged, so the mode is in the panel (off by default); 2d after K268 s2, K290.
  - owner: nobody since 2026-10-15 01:08 (stage 2c done; agent `a58040d5b7b031c80` of claude session d8031183; worktrees kept: 2c's, 2b `ac6e354b85922e7aa`, 2a `a5d63452980ed9fa3`, stage 1 `aea102de995e1ce30`)
  - branch: mainline; last commit: `82c1f23` (2c is `e6e151d..82c1f23`)
  - evidence: `.claude/probes/K76/stage2c/` (2a's and 2b's beside it); lore `render-explore.md`
  - next: stage 2d ("For stage 2d": High contrast dots, the census on K268's shaped slots, the held frame, step 8's phone gate and GPU, the final sheets) after K268 s2 and K290; Levi's calls are K362
  - brief: `docs/design/K76.md`, "Stage 2c handoff"; design `docs/design/K76_reveal_mode.md`

## K7 (2026-10-15, stage 6 merged)

- **K7** · Physics in a Web Worker with render-side interpolation (K28; Levi's
  calls K302). Stages 1-5 merged (stage 5: 3e6b7c5..988be6a, the start gate and the phone
  pass, which missed only the 250 ms gate). Call F6: the default anyway.
  - owner: agent `a6023a3244ff623cc` (sonnet) of claude session d8031183, stage 6 (the flip) from 03:49 (cap 04:49; ports 5850-5859); stage 5's worktree `adf244f47f53e8230` kept
  - branch: `worktree-agent-a6023a3244ff623cc` (`.claude/worktrees/agent-a6023a3244ff623cc`, from `8b3b401`); last commit: `8b3b401` (master) until its first WIP commit
  - evidence: `.claude/probes/K7/` (`stage5/`: the phone tooling, `s5_gate.txt`, `run_s5.ps1`, `table_s5.mjs`; `stage4/`, `stage3/`)
  - next: stage 6 (sonnet): `phw` on by default, its pins and lore, the 21 shared probe libraries ported (K374); then K5 M1; then stage 7 (opus; after M1, since both edit main.ts's boot): the start-gate lever (params and tuning in the Worker's `name`, main adopts gen 0), the phone pass again and the spike page `?d=gs18`
  - brief: `docs/design/K7_worker.md`, "Stage 6 brief: the flip (call F6)"; stage 7 from "Stage 5 handoff" ("For the next stage")
  - env: the phone: `.claude/probes/K7/stage5/phone_setup.ps1` and `phone_teardown.ps1`, under the phone lock

## K374 (2026-10-15, stage 6 ported the shared libraries)

- **K374** · 52 freeze-patch probes and 5 timing wrappers still patch `ps.step`
  and run only with `&phw=0` (`.claude/probes/K7/stage4/ports/FREEZE_PATCH_FILES.md`):
  port each when next needed, `k279_ab` first; re-run g2_smoke and livefabric.

## K381 (2026-10-15, done)

- **K381** · The K83 PIN recipe (`probes.md`) and `k83_ab` don't pin the fabric's
  explore clock: a thread-reveal A/B differs by 22050 px without it (G3-0). Rec:
  add `F.exploreClock = 1000` and `tickExplore` forwarded with 0 (probes.md's K8 bullet has it).

## K5 (2026-10-15, stage M1 launched)

- **K5** · Split `main.ts` and `ribbon_renderer.ts` along K1-K3's data lines,
  with seams so G3 becomes a module swap; K6 rides it. Design merged:
  `docs/design/K5_K6_split.md` (its calls: K377).
  - owner: nobody since 2026-10-15 03:14 (design done and merged; agent `aa60ed52201f75682` of claude session d8031183, worktree kept)
  - branch: mainline; last commit: `4931204`
  - evidence: `.claude/probes/K5/design/` (eight region maps of main.ts and ribbon_renderer.ts)
  - next: stage M1 once K7 stage 5 merges (re-map main.ts first), then section 5's stages: M1-M8, and R1-R5 (R1 after G3-0 merges); section 6 orders them against the queue
  - brief: `docs/design/K5_K6_split.md`, "7. Stage 1 brief"

## K307 (2026-10-15, stage 2 merged)

- **K307** · The daily intro's freezes are cold shader compiles (Levi, K302 (8):
  prioritize). K7 s4's trace: GPU compile waits (bg-vellum's 190 ms queued behind
  12-15 small links); the worker can't hide them. Stage 2: the warm-up.
  - owner: agent `a11d7ce60428b687d` (opus) of claude session d8031183, stage 2 from 03:55 (cap 05:55; ports 5830-5839)
  - branch: `worktree-agent-a11d7ce60428b687d` (`.claude/worktrees/agent-a11d7ce60428b687d`, from `97d7c31`); last commit: `97d7c31` (master) until its first WIP commit
  - evidence: `.claude/probes/K307/` (`trace_intro.mjs`, traces, `builds/`, patches; the local branch `k307-proto` (51f7480) holds throwaway prototypes, never merged); K7 s4's traces in `.claude/probes/K7/stage4/k307/`; lore `.claude/rules/render-shaders.md`; stage 2's in its worktree's `.claude/probes/K307/stage2/`
  - next: stage 2: `program_registry.ts`, `shader_warmup.ts`, `__knotWarmup()`, a 15 s gate on `finishPresettle`, wave 1 then wave 2; K366, K268 s2's three explore variants and a fire race's first burn (K290: it moves every chain onto the explore programs) ride it; the phone's measures ride K156's next pass
  - brief: `docs/design/K307_intro_freezes.md` ("Stage 2: the warm-up", "Stage 1 handoff", "Stage 2 launch notes")

## K366 (2026-10-15, the registry half done in K307 s2)

- **K366** · With K307 stage 2 (K279 s2): move the ripple's `warm()` onto the
  program registry, and take the first-tap residual: one 35-54 ms frame among
  tap 1's first five, on both builds, ripple or not.

## K382 (2026-10-15, the fire link added from K307 s2)

- **K382** · A fire race's frame cost is unmeasured (K290 3a): from its first burn every
  ribbon, strip and fan draws through the explore programs, reveal off too. Rec:
  `burn_page.mjs perf` on both builds, under the lock.

## K76 (2026-10-15, stage 2d merged)

- **K76** · Thread-reveal mode, stage 2 (Levi, 2026-10-13): `exploration`
  (off | fog | threads) and an end look, a separate shader variant. 2a-2c
  merged, so the mode is in the panel (off by default); 2d running.
  - owner: agent `adbaac6a024e6d144` (opus) of claude session d8031183, stage 2d from 04:41 (cap 06:41; ports 5820-5829)
  - branch: `worktree-agent-adbaac6a024e6d144` (`.claude/worktrees/agent-adbaac6a024e6d144`, from `e7951cd`); last commit: `e7951cd` (master) until its first WIP commit
  - evidence: `.claude/probes/K76/stage2c/` (2a's and 2b's beside it); stage 2d's in its worktree's `.claude/probes/K76/stage2d/`; lore `render-explore.md`
  - next: stage 2d: High contrast dots, step 8 (the phone gate, GPU per program, the final sheets), the census on K268's shaped slots, the held frame; the start zoom stays Levi's (K362)
  - brief: `docs/design/K76.md`, "Stage 2c handoff" ("For stage 2d") and "Stage 2d launch notes"; design `docs/design/K76_reveal_mode.md`
  - env: the phone: `scripts/phone_pass.ps1`, under the phone lock (`.claude/probes/agents/phone_lock_take.ps1`)

## K5 (2026-10-15, stage M1 merged)

- **K5** · Split `main.ts` and `ribbon_renderer.ts` along K1-K3's data lines,
  with seams so G3 becomes a module swap; K6 rides it. Design merged:
  `docs/design/K5_K6_split.md` (its calls: K377). Stage M1 running.
  - owner: agent `a871cd9d98d4f1bf0` (opus) of claude session d8031183, stage M1 from 04:46 (cap 06:46; ports 5840-5849); the design's worktree `aa60ed52201f75682` kept
  - branch: `worktree-agent-a871cd9d98d4f1bf0` (`.claude/worktrees/agent-a871cd9d98d4f1bf0`, from `1646491`); last commit: `1646491` (master) until its first WIP commit
  - evidence: `.claude/probes/K5/stage1/` (in the main checkout, as the brief says); the design's region maps in `.claude/probes/K5/design/`
  - next: stage M1: the re-map, `src/app/scene_ref.ts`, the loader, stamp and probe hooks moved, host_seam over `src/app/**`, the lore paths; then section 5's stages (M2-M8, R1-R5; section 6 orders them)
  - brief: `docs/design/K5_K6_split.md`, "7. Stage 1 brief" and "Stage 1 launch notes"

## K161 (2026-10-15, the hand-off)

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

## K161 (2026-10-15, the profile sweep done)

- **K161** · Disk: probe runs leave `knotmaze-*` Chrome profiles in `$env:TEMP` (1177 on 10-15,
  1173 a day old, about 33 GB; C: 14.5 GB free) and stale worktrees (79). Levi approved the
  cleanup (2026-10-14, item 2); the probe libraries' delete-on-exit goes with K150.
  - owner: nobody since 2026-10-15 06:30 (auto mode denied the coordinator's 06:24 run of `cleanup.ps1`; claude session d8031183)
  - branch: mainline (no code); last commit: n/a
  - evidence: `.claude/probes/K161/cleanup.ps1` (`-DryRun` first) and `cleanup.log` (the 10-14 01:17 run swept five merged worktrees)
  - next: Levi runs `pwsh -NoProfile -File .claude/probes/K161/cleanup.ps1` (or allows it); then the worktree sweep: a cleared session's agents cannot be messaged, so a worktree holds only untracked probes, which the script copies first (it keeps branches): list the ids in its `$worktreeIds`. It skips unmerged ones; look at those first: K80 `a25726c24f262b138` (5 ahead), K323 `a806933f7eb6fb661` (4), K74 `aeaf1e61bcecaaf0b` (1), K76 stage 1 `aea102de995e1ce30` (26, likely pre-rebase copies). 13 branches ahead of master have no worktree.
  - brief: the header of `.claude/probes/K161/cleanup.ps1`

## K339 (2026-10-15, shortened by the diet)

- **K339** · The settings panel's audit (merged dc4a1a7..2ee40a4): four
  calls, each recommended yes, in `docs/design/K339_panel_audit.md`
  ("Questions"; subfolder looks
  `.claude/probes/K339/sheet/K340_sheet.png`). Builds as K323's Stage A.

## K260 (2026-10-15, shortened by the diet)

- **K260** · The burn race's calls 2-4 (K114), built as recommended:
  Reset keeps the fire (fuse relit), the fire and the turn minotaur are
  exclusive, fog stays its own param. `docs/design/K114_burn.md` ("Calls
  for Levi").

## K280 (2026-10-15, shortened by the diet)

- **K280** · The burn race's heat (K114): the built `fireSpeed` 0.75,
  `fireDelay` 0 is hot for careless players; its agent recommends r 0.6,
  h 0. `docs/design/K114_burn.md` ("R.6.1"); numbers
  `.claude/probes/K114/burn/results_tuning_rebased.md`.

## K251 (2026-10-15, shortened by the diet)

- **K251** · A displaced edge indicator crosses the open phone panel in
  a 0.25 s slide (K198). Keep the slide, or fade the disc out and back
  in? `docs/design/K198.md` ("Stage 2 handoff"); sheet
  `.claude/probes/K198/stage2/out/contact_sheet.png`.

## K238 (2026-10-15, shortened by the diet)

- **K238** · K111 stage 1's four calls, for review: High contrast's
  look, the Accessibility folder first, "Reduced motion" driving Motion,
  OS reduced motion stilling the flow. `docs/design/K111.md` ("Stage 1
  handoff"); screenshots `.claude/probes/K111/out/`.

## K90 (2026-10-15, shortened by the diet)

- **K90** · A physical minimum bend radius; stages 1a and 1b merged
  (6f97b92..feb12a0), flag off. Ship, tune or stop? Levi tests it live
  (`__knotSplineBend(true)`); rec.: stop. Record
  `docs/design/K90_bend_radius.md`, handoff `docs/design/K90.md`, sheet
  `.claude/probes/K90/out_1b/`; K213 first, never with K8. G3-2 needs the
  answer (K361 q13; Levi, 2026-10-15: "not sure on the spline bend yet").

## K194 (2026-10-15, shortened by the diet)

- **K194** · K180's calls: the defaults once played (crossings
  `through`, glow `off` as built, or `fallback`); call (2) is moot since
  K235. `docs/design/K180.md` ("Stage 1 handoff"); play
  https://levi.dev/knotmaze/?7&pw=1&pcx=ride&pgl=fallback. If fallback
  becomes a default, time `peakEstimate` on the Pixel.

## K186 (2026-10-15, shortened by the diet)

- **K186** · K140's confetti calls: reduced motion's slow spray or none;
  confetti on every win banner or only a live finish; the colors and
  amount. `docs/design/K140.md` ("Stage 1 handoff"); play
  https://levi.dev/knotmaze/?7 (`&cfa=3` for the most).

## K323 (2026-10-15, shortened by the diet)

- **K323** · A Game folder with a `gameMode` dropdown
  (`docs/design/K323_game_mode.md`). Questions 2 and 5-8 taken as
  recommended; 1, 3, 4 are in K339's calls. Stage A (with K339's
  rebuild, codec 7) waits on them, K7 stage 3 and K76 2c. Codec 7
  clashes with the rows K74 s3, K80 3a and K114 s2 append after row 139:
  whichever lands later rebases and re-freezes the codec pins.

## K399 (2026-10-15, shortened by the diet)

- **K399** · G3-1's launch gates (`docs/design/K8_G3-1.md`, "Gates"; gate 1 is K377 q3, taken):
  (2) G3-1 before K268 item 4, never beside it; (3) a gap slot needing more than 64 SAMP points
  takes a per-slot stride of at most 3, never a silently cut reach; (4) GAP stays one slot a
  row, and K398 clamps links. Recs, all three.

## K400 (2026-10-15, shortened by the diet)

- **K400** · K114 stage 2's questions (`docs/design/K114_stage2.md`, "Questions"; the recs
  build unless Levi says otherwise): realtime's dot runs at a constant pace, moveSpeed unused
  (rec. (a)); one fireSpeed and fireDelay for both clocks; you lose when the fire reaches you,
  not when no safe arm is left; realtime always queues taps; `fireClock` stays a Burn race
  row under K323.

## K401 (2026-10-15, shortened by the diet)

- **K401** · K80 turns stage 3's questions (`docs/design/K80_turns_stage3.md`, "Questions";
  the recs build unless Levi says otherwise): 3a now, 3b after K290 3b, the chevrons after
  K324 stage 2; per-model rows for the guard's and stalker's knobs, shown for that model only
  (rec. (c)); wait keys `.` and Space (unless a button has focus); the pad's center waits (a
  ~22 px radius); the turn pull its own param, default 0; K293 (d) and (f) stay, in lore.

## K402 (2026-10-15, shortened by the diet)

- **K402** · K74 stage 3's questions (`docs/design/K74_stage3.md`, "Questions"; the recs
  build unless Levi says otherwise): defaults in C3's shape (corridor 24, away flank,
  exitClearance 12; the taper only if it measurably helps); `xcr` [0, 32], `xfl`, `xtr`
  [0, 32], `xtk` [0, 2], never daily-exempt; the exit guard gets no param; the corridor caps
  at 32; deeper traps out of scope.

## K406 (2026-10-15, shortened by the diet)

- **K406** · K395's CAP_ROUND: 1.5 (as built, the same as COLLAPSE_ROUND) or 3 (the tip's inner
  edge turns +19° to +42° instead of +31° to +56° and the arch is flat, for 0.02-0.03 world less
  inner swing at the tip; 6 looks like 3). Live as `PluckOverlay.capRound`; sheets in
  `.claude/probes/K395/out/`. Stays 1.5 until Levi picks.

## K409 (2026-10-15, shortened by the diet)

- **K409** · The fire's widths are in ctrl (band 0.7, ember 0.25/0.55): a 2.6x spread with
  curvature; on the phone the gone ember is a ~1.7 device px rim, a third under the smoke; the
  front's char band darkens the unburnt side under both looks. Options: world units; the ember onto
  the unburnt side under gone; no band under gone; the ember over the smoke (rec.: all but the
  third). `K114_burn.md` 3c handoff item 4.

## K411 (2026-10-15, shortened by the diet)

- **K411** · A phone window for K8's bench (`.claude/probes/K8/stage2/phone6.ps1`: its refs, times and
  preview paths are stale; refresh them and raise the rest to 90000 ms). The 2026-10-15 window (10:07,
  "at least the next hour") ran K7's phone pass (10:32) and K290 3c's sheet (to 11:15); the phone was
  free at 11:19 and handed back. The probes never wake or unlock the phone.

## K284 (2026-10-15, shortened by the diet)

- **K284** · Credit K74's sources (K277):
  `docs/design/K74_maze_design.md` builds on Pullen (*Think Labyrinth*)
  and Zhao and Marquez 2013 (arXiv:1307.5713), but `src/` names neither,
  and a `RESEARCH` entry needs a file that carries its mark. K74 stage 3
  adds a comment naming each where the code follows it, then the
  entries.

## K240 (2026-10-15, shortened by the diet)

- **K240** · High contrast for the DOM chrome (K111 follow-up): a CSS
  layer on `:root[data-contrast="high"]` (already set) for the panel,
  HUD and badge, whose styles are TS-injected strings. Small; after
  K238's review.

## K137 (2026-10-15, shortened by the diet)

- **K137** · K80 section 4's cheap (S, S-M) mechanisms, each behind a
  toggle (Levi, 2026-10-13), after the minotaur: 4.3, 4.7, 4.9, 4.10,
  4.13-4.17, 4.21 (after K85), 4.26, 4.28-4.30, 4.32-4.34, plus Levi's
  sleeper variant (an enemy appears at a junction a turn or two after
  you leave it, then follows you). The M ones are K138, the M-L and L
  ones K141. `docs/design/K80_gameplay_additions.md` section 4.

## K138 (2026-10-15, shortened by the diet)

- **K138** · K80 section 4's M mechanisms, each behind a toggle (Levi,
  2026-10-13: "Let's do all the M items",
  `docs/design/levi_notes_2026-10-13.md`), after K137: 4.1, 4.2, 4.4
  (then 4.5), 4.6 (simulate first), 4.11, 4.12, 4.18-4.20, 4.23, 4.24,
  4.27, 4.31. Those that change generation (4.1, 4.2, 4.4, 4.11, 4.24,
  4.31) need a solvability check. The M-L and L ones are K141.

## K139 (2026-10-15, shortened by the diet)

- **K139** · Collapse mode (Levi, 2026-10-13,
  `docs/design/levi_notes_2026-10-13.md`): no backtracking, each run
  collapses behind you; collapse as much as you can and still reach the
  finish (variant: without it). Param `collapse` (off | finish | free);
  rides on 4.3's snap (`fragile`, K137) and R.3.4's longest thread
  (`docs/design/K80_gameplay_additions.md`); par by depth-first search
  at generation (time it on the phone). S-M after 4.3.

## K46 (2026-10-15, shortened by the diet)

- **K46** · Daily variety (Levi, 2026-10-12): no weekly arc; THEMES,
  each a set of parameter constraints; manual per-day overrides later
  (K82). Proposal `docs/design/K46_daily_variety.md` (8b1eb90), brief
  `docs/design/K46.md`, probes `.claude/probes/K46/` (the proposal
  agent's worktree was removed 2026-10-15 (K161), its probes copied; branch `worktree-agent-a78c73cec4770a14d` kept).
  Validation uses engine-exact math only (K108); memory-trail themes set
  trailLength 5 (K73).

## K78 (2026-10-15, shortened by the diet)

- **K78** · The Knotmaze handbook: algorithms, architecture, decisions
  and a per-param reference with figures; write it once the churn
  settles. Public Markdown, later also on Levi's Blogger devlog, so
  figures are standalone images and the text has no repo links or
  internal IDs (Levi, 2026-10-13). `docs/design/K78_handbook_plan.md`.

## K297 (2026-10-15, shortened by the diet)

- **K297** · A pared-down panel for most players (Levi, 2026-10-14):
  most rows move behind an advanced view and a short set stays in front.
  Which rows, and how the advanced view opens, come after the churn;
  K292's marks and K84 / K57 feed it.

## K340 (2026-10-15, shortened by the diet)

- **K340** · Nested folders that look distinct from their parents (Levi,
  2026-10-14). Looks are prototyped in K339's stage
  (`docs/design/K339_panel_audit.md` section 5, its sheet); the audit
  recommends look F (K339 call 3). Once Levi picks, build its CSS first
  and check it under High contrast; built with K339's rebuild.

## K341 (2026-10-15, shortened by the diet)

- **K341** · The second panel audit, once the design iteration is done
  (Levi, 2026-10-14): rerun K339's inventory
  (`scripts/panel_inventory.ts`, table `docs/design/K339_inventory.md`)
  and checklist, then feed K297's pared-down set
  (`docs/design/K339_panel_audit.md`, item 8). Optionally teach the
  script to flag dead rows and cut-off labels.

## K9 (2026-10-15, shortened by the diet)

- **K9** · G4: smooth-union SDF junction webs (cuspRadius = blend
  radius); A/B crops at cr 1, 3, 6 before the fans are deleted. Also
  closes G1's x160 leftover (a faint tick at a wedge flank, merge-core
  hairline dashes at 4-way merges; `.claude/rules/render-gaps.md`), and
  the webs carry the traveled route as the smooth union of the traveled
  pieces only (K81).

## K115 (2026-10-15, shortened by the diet)

- **K115** · Cursive text and shapes, decided (Levi, 2026-10-13;
  `docs/design/K115_cursive_text.md`, ded57f7; answers in
  `docs/design/levi_notes_2026-10-13.md`): Hershey Script Simplex,
  capitals via generated connectors then hand-made joins, a
  junction+spur where a join meets a letter's body (a real dead end),
  text in the link token (a codec string type); no stage 1a legibility
  test. Next: the builder's stage 1 brief. K122: set `shipped: true` on
  `hershey-fonts` in `notices/credits.ts` in the commit that adds the
  Hershey data. Evidence `.claude/probes/K115/`.

## K116 (2026-10-15, shortened by the diet)

- **K116** · Alternate pluck instruments and accompaniment, lowest
  priority (Levi, 2026-10-13; `docs/design/K116_instruments.md`,
  2e60b00; calls in `docs/design/levi_notes_2026-10-13.md`): first the
  band skeleton, a drone and bass, four `pluckVoice` presets, then
  marimba and bells; band on by default, 10-14 dB under the pluck;
  samples deferred. Params `pvc`, `acc`, `acl` are daily-exempt; first a
  Pixel 11 audio-CPU probe; the loop length is K125.

## K144 (2026-10-15, shortened by the diet)

- **K144** · Accounts and shared stats, a stretch goal after everything
  else (Levi, 2026-10-13, `docs/design/levi_notes_2026-10-13.md`): OAuth
  login, stats across devices, an opt-in share, percentile bands per
  metric and level, silent cheap anti-cheat (the server replays a
  submitted walk via K108 and K47). Backends: Cloudflare Workers + D1 or
  the SnoringCat platform (Nakama). Next: a design doc.

## K10 (2026-10-15, shortened by the diet)

- **K10** · Phone benchmark after every stage (Pixel 11, Chrome 154;
  baseline 2026-10-11: 30 fps at rest with defaults, 51 with `fw=0`; K79
  stage A passed at 60). Rerun: `scripts/preview.ps1` per ref,
  `scripts/phone.ps1 -Ports ...`, `.claude/probes/K10/phone_bench.mjs`,
  with the knot asleep, the phone unlocked and cool (`dumpsys
  thermalservice` status 0). Numbers in
  `.claude/probes/K10/bench_*.txt`.

## K292 (2026-10-15, shortened by the diet)

- **K292** · Mark the panel's personal settings (Levi, 2026-10-14):
  every row stays in its concept's folder; the MAZE rows carry a subtle
  dog-ear triangle in the top-right corner, explained by a key at the
  panel's top and the row tooltip, while personal settings
  (`DAILY_EXEMPT_KEYS`, localStorage prefs) stay unmarked. A sheet for
  Levi: size and color, all maze rows against only rows changed from the
  link or daily. After K298 or in its own module; replaces K84's
  section; K57 settles edge cases; leads to K297.

## K265 (2026-10-15, shortened by the diet)

- **K265** · High contrast's own highlight, built by K111 stage 5 (Levi,
  2026-10-14; confirmed 22:32): a white rim on both edges with the
  thread's own color between (about 0.35 of the half-width), a hard
  inner edge, steady. Looks 1-3 go with `hcl` and `__knotHcLook`; the
  run's ends hard or with K298's end fade, on a sheet for Levi; width
  default 0.85 and range 0.3-1 stay (unanswered). After K298, never
  beside K298, K299, K76 2c or K268 stage 2. `docs/design/K111.md`
  ("Levi's pick", "For stage 5"); the three old looks
  `.claude/probes/K111/stage4/sheet/`.

## K309 (2026-10-15, shortened by the diet)

- **K309** · Check K299's ring-lap fix on the phone: PowerVR rounds
  float division its own way, and only the desktop GPU was checked. In
  K156's next round: Levi's link `?qoietk.KSIeBoGlf4-` at node_2 and the
  seam cases of K299's A/B. `docs/design/K299_choice_pulse_bug.md` ("Not
  done").

## K312 (2026-10-15, shortened by the diet)

- **K312** · Add K299's lesson to claude-config `rules/lessons.md`
  (WebGL): GPU float division is approximate (ANGLE D3D11 gave
  `floor(k*n/n)` = k-1 in 3275 of 16384 pairs), so ring and lap math
  must be integer-corrected. Held while Levi is away (claude-config
  edits wait for his approval).

## K313 (2026-10-15, shortened by the diet)

- **K313** · A loader that looks like the maze (Levi, 2026-10-14,
  approved "sgtm", "Trail should be a fixed length"): a trefoil maze
  with over/under gaps, fixed head and trail, drawn by a tiny
  OffscreenCanvas worker inlined in `index.html` (a static SVG trefoil
  from first paint; today's CSS trefoil is the fallback). Follows K307's
  warm-up; measure the phone's first frame and the frames through the
  freezes. `docs/design/K313_loader.md`.

## K324 (2026-10-15, shortened by the diet)

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

## K326 (2026-10-15, shortened by the diet)

- **K326** · Remove knot mode (`mazeFabric`, `mf=0`) entirely (Levi,
  2026-10-14). Stages in K323's design (`docs/design/K323_game_mode.md`
  sections 4-5): A freezes a maze golden (after K7 stage 2); B deletes
  knot mode (after K323 stage 1, stage A, K7 stage 2, K307 stage 2,
  K329) and retargets the tracked knot cells (`scripts/fold_census.*`,
  the phone pass); optional C reworks the knot paint path (after B and
  K111 stage 5). The golden `test/physics/byte_identity.test.ts` moves
  to a maze design.

## K327 (2026-10-15, shortened by the diet)

- **K327** · Labels that say what they size (Levi, 2026-10-14):
  `indicatorSize` (edge arrows, a viewer preference) and `markerSize`
  (maze icons) sound the same; proposed "Edge arrow size" and "Maze icon
  size". Touch & feel also mixes words with camelCase keys. In K323's
  design; relates to K247, K292, K297.

## K332 (2026-10-15, shortened by the diet)

- **K332** · Arrow-key hints (Levi, 2026-10-14): a small key icon (or
  chord, K333) near the start of each choice, shown only once an arrow
  key was pressed this session (a module flag, not localStorage). The
  stage after K329. Hooks: `keyMap` / `chordMap` in `key_moves.ts`,
  K83's `MarkerMesh` and `marker_glyphs.ts` at KEY_REACH, refresh in
  `keyStep` / `stepWaiting`.

## K331 (2026-10-15, shortened by the diet)

- **K331** · Touch gets K298's pick margins (Levi, 2026-10-14: "yes and
  yes."): touch moves from world-unit radii to the mouse's form
  (half-width plus a px margin, times `pickChoiceRatio` on a choice)
  with its own margin row beside `pickMargin` at about 4 px, so zones
  stop growing under a pinch zoom. Built with K330 after K329
  (`docs/design/K298_hover_glow.md`, "Notes").

## K321 (2026-10-15, shortened by the diet)

- **K321** · The credits page (Levi, 2026-10-14; "Proceed, with my above
  notes"): the page and the panel's link become Credits
  (`credits.html`): "Created by Levi Lindsey", "(c) 2026 Snoring Cat
  LLC. All rights reserved.", his art, icon and music credits (to come),
  then "Built with Claude Code" (not prominent, linked like the others),
  then techniques, licenses, research. A small sonnet stage:
  `docs/design/K321_credits.md`.

## K318 (2026-10-15, shortened by the diet)

- **K318** · Win effects (Levi, 2026-10-14): one show in many themes, a
  runner with momentum replaying the walk, lighting the path, popping
  each junction, blasting the finish. Levi: prototype all thirteen
  themes and every layer behind a Win effects folder (a Theme dropdown
  with Random, Party the default, conditional rows), in twelve stages
  one at a time. Stage 1 (the show and Party) follows the confetti stage
  and K111 stage 5. `docs/design/K318_win_effects.md` ("Build stages").

## K336 (2026-10-15, shortened by the diet)

- **K336** · Side cannons (Levi, 2026-10-14): at the finish, blasts of
  confetti and streamers from points just off the left and right edges,
  fired inward and up, falling in arcs. Designed with K335, K337
  (`docs/design/K335_confetti.md`); deferred to after the other tasks
  (Levi, 23:00). Model-only draft `docs/design/K336_K337_draft.patch`
  (applies on K335's merge); still to do: tests, view, panel rows, codec
  entries (`cfc`/`cfn`/`cfs`/`cfh`/`cff`), reduced motion, sheets, frame
  A/B; the phone's fps rides K156's next pass.

## K337 (2026-10-15, shortened by the diet)

- **K337** · Confetti shine (Levi, 2026-10-14): each piece's spin and
  flip give it a 3D normal lit by one upper-left directional light, a
  diffuse term plus a Blinn-Phong flash, computed on the CPU into the
  tint (no new shader); reduced motion keeps the diffuse term. Designed
  with K335, K336 (`docs/design/K335_confetti.md`); deferred with K336,
  its draft is in K336's patch.

## K416 (2026-10-15, shortened by the diet)

- **K416** · `docs/design/K5_K6_split.md` is stale beyond §2.3 (R1 updates its table): §1.3's
  line ranges are from f04aa4b; the strip block gained `sectionProgram`, `sameBurn`, `sameSpans`;
  §5.1 misses pins (PROGRAM_SITES/RIBBON, `paint_explore.test.ts` reading the source,
  `paint_ring_lap.test.ts`'s non-recursive scan); the sequencing text (§5.3, §6) is stale;
  `__knotRenderer` now lives in `src/app/probe_hooks.ts` (K5 R1 brief).

## K417 (2026-10-15, shortened by the diet)

- **K417** · The R lane vs the probes: about 80 probe files call the sampling helpers through the
  renderer (renderCtrl 30, paintArcAt 18, sampleAtSafe 17, sampleAt 15), so R1's façade forwarders
  stay while those probes live; probes that read or edit `ribbon_renderer.ts` by path break once
  code moves (K76 2d and K290 3a `dump_variants.ts`, `variant_build.ps1` in `g2/` and `K4/`,
  `K154_K169/edit_rr2.ps1`, `edit_rr3.ps1`). Fix each when it next runs (K5 R1 brief).

## K266 (2026-10-15, shortened by the diet)

- **K266** · The hover rim's short-run limits (K248): runs shorter than
  2 x rimGap (1.95 world at defaults) never glow, and a short run whose
  lit window sits under a crossing's over thread shows nothing (run
  187). `census_rim.mjs`'s open-chain terminal sample (k = 235) reads a
  probe triangle on both builds. `docs/design/K111.md` ("Stage 3
  handoff").

## K267 (2026-10-15, shortened by the diet)

- **K267** · Stale highlight-mode mentions after K248: `highlightMode`
  in `docs/design/` (K76, K76_reveal_mode, K174, K193, K198,
  levi_notes_2026-10-13), and the rules files' historical `.J` v4 probe
  links (gameplay-motion, probes-phone, render-pluck, probes.md's K80
  bullet), which load with a warning; the design docs' play links (K174,
  K180, K198, brief templates) are v4 too.

## K263 (2026-10-15, shortened by the diet)

- **K263** · `minotaur.ts` exports `undoAllowed`, but nothing in `src`
  calls it and no move undo exists, while `docs/design/K80_turns.md`
  step 2 cites it as real time's behavior. Delete it, or wire it when an
  undo lands (found 2026-10-14 by the burn-race brief's docs agent).

## K262 (2026-10-15, shortened by the diet)

- **K262** · Two probe harnesses K132 (41e81b5) broke, both untracked in
  the main checkout: K80's research harness (`.claude/probes/K80/lib.ts`
  `designParams` calls the removed `codecDefaults(3)`; fix with
  `paramsFromValues(seed, {...})` as in
  `.claude/probes/K174/rt/rt_lib.ts`) and K100's
  `vite.fogdaily.config.ts` (patches the removed `DAILY_V1`; set
  `fogOfWar` in the design instead). The burn race's agent fixes its own
  copy of the first (`docs/design/K114_burn.md`).

## K258 (2026-10-15, shortened by the diet)

- **K258** · K76 stage 2a's residuals: (a) in flight, the piece
  re-declares the KPAINT items every frame and the per-slot refs shift
  (check `lastPaintUpload` in 2d); (b) for 0.45 s after each arrival the
  growth re-declares every frame; (c) the model is probe-only until 2c
  feeds it from move events. `docs/design/K76.md` ("Stage 2a handoff",
  "Residuals").

## K276 (2026-10-15, shortened by the diet)

- **K276** · K76 stage 2b's residuals: (a) a visited END at growth 0
  shows nothing at its tip (the game never produces that state); (b) the
  census clips a fixed window per crossing and may miss a long shallow
  gap's far end; (c) the ten-move census covered only two moves' ground
  (2c's walks somewhere new); (d) its mode-off-again failure (77% of the
  frame) is unexplained and did not reproduce (lead: the backdrop
  changing under load); (e) mode-on strip cost 0.082 ms against 0.066
  and 2b's fans 0.58 against 0.55, uninvestigated. `docs/design/K76.md`
  ("Stage 2b handoff", "Residuals").

## K278 (2026-10-15, shortened by the diet)

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

## K285 (2026-10-15, shortened by the diet)

- **K285** · Citation details K277 left out until a record confirms
  them: Jakobsen's venue, Müller et al.'s volume and pages, Jaffe and
  Smith's pages, the Elias DOI and the editor of Perlin's course notes.
  `docs/design/K274_K277.md` ("Stage 1 handoff").

## K281 (2026-10-15, shortened by the diet)

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

## K254 (2026-10-15, shortened by the diet)

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

## K252 (2026-10-15, shortened by the diet)

- **K252** · K198 stage 2's residuals: (a) `RANGE_EASE` is still a
  per-frame ease (0.15 a frame) for a resize and the fit's drift, so
  those settle faster at higher frame rates; (b) the head's 0.45 s show
  delay rests on five measured blips, the longest 0.33 s, and K156's
  next phone pass can check more. `docs/design/K198.md` ("Stage 2
  handoff").

## K246 (2026-10-15, shortened by the diet)

- **K246** · K174's residuals (`docs/design/K174.md`, "Stage 1
  handoff"): pace links aren't clamped (an old `mhp=25` now means 25x
  the player's pace); the K80 rt probes in the main checkout
  (`.claude/probes/K80/rt/`) lack K132's `rt_lib.ts` fix and
  `rt_chase.mjs` puts its Chrome profile in OS temp (fixed only in
  `.claude/probes/K174/rt/`); at desktop width the panel's label column
  clips the `mino*` keys.

## K243 (2026-10-15, shortened by the diet)

- **K243** · A paused page with the instant intro draws no threads at
  load (`?b.J&am=instant&fw=0&sp=0`, 393k px off a refreshed frame; same
  on master): `beginSettle()`'s instant branch shows the root without an
  `update()`, and a paused page never runs the awake step. Likely fix:
  `handRendererLook(); renderer.update(); fabric.update(...)` in that
  branch, after a physics-on pinned-frame A/B.
  `docs/design/K235_K239.md` ("Stage 1 handoff");
  `.claude/probes/K235/k239_paused.mjs`.

## K242 (2026-10-15, shortened by the diet)

- **K242** · K191's residuals (`docs/design/K154_K169.md`, "Stage 2
  handoff"): the fan program's GPU cost during fades and stage 1's phone
  hash cost are unmeasured; the tap-time fade-out and a full web
  restored on load are unit-tested only; the knot and fog A/B against
  stage 1 was not rerun (byte identity covers it).

## K236 (2026-10-15, shortened by the diet)

- **K236** · K145's hover glow, now K248's rim: a pluck's overlay hides
  it on the plucked run (`pluckColor` composes one color per arc with no
  across coordinate; the fix needs an across varying in the overlay
  strip and an across-aware compose in the mirror). Its other gaps are
  settled (webs never glowing is now the design; the short-run fade and
  view 5 landed in 3321592). `docs/design/K111.md` ("Stage 3 handoff"),
  `docs/design/K93_K145.md`.

## K234 (2026-10-15, shortened by the diet)

- **K234** · `scripts/phone_pass.ps1`'s `-Phase check` and `-WaitReady`
  treat a phone in use as ready: round 2026-10-14b's agent saw Gmail in
  front and waited by hand for 120 s without user activity (`dumpsys
  power` activity ages); the check should do the same.
  `docs/design/K156.md` ("Round 2026-10-14b handoff").

## K232 (2026-10-15, shortened by the diet)

- **K232** · Round 2026-10-14b's pass (K156) found two borderline worse
  cells in the default link's load (`?b.J`, base 54a2b43 vs head
  48da84d): p95 33.4 -> 50.0 ms and first sleep 18.4 -> 19.6 s, from 2
  reps on a hot phone in portrait against the landscape floor. Rerun
  with 3 reps once the floor matches the orientation (K193, K195); K197
  is the morning's load shift
  (`.claude/probes/rounds/2026-10-14-48da84d/pass/summary.md`).

## K230 (2026-10-15, shortened by the diet)

- **K230** · K92 did not check the badge's last fit level (the bare icon
  below the hamburger) with the panel open; its phone checks were
  desktop emulation, so K156's next phone pass covers K92
  (`gameplay-badge.md`). No phone look reaches the badge's fit levels at
  411 px: check them in an emulated narrower viewport.

## K223 (2026-10-15, shortened by the diet)

- **K223** · Tooling after K198: K149's
  `.claude/probes/K148_K149/probe.mjs slack` checks the old 0.3-screen
  rule and fails by design (`.claude/probes/K198/pan.mjs` replaces it);
  K173's `scripts/split_rules.json` still anchors on the old FIT CAMERA
  PAN SLACK entry (matters only if the split is re-run).

## K222 (2026-10-15, shortened by the diet)

- **K222** · K198's maze edge leaves out the win ring (about 5 px past
  the disc), the head's glow and the minotaur, and the range ignores the
  panel's height, so a maze lower than a short panel still has to clear
  it (`docs/design/K198.md`, The calls).

## K221 (2026-10-15, shortened by the diet)

- **K221** · K198's range reads the maze's right edge, which creeps while
  the knot settles (about 0.3 fit px per 200 ms), so at the left limit
  the gap to the open panel shrinks by zoom times the creep (0.2-1.2 px
  measured) (`docs/design/K198.md`).

## K220 (2026-10-15, shortened by the diet)

- **K220** · Tooling: K75's `census_fan.mjs` misreads routed joints since
  K81 (it calls `fieldProbe.at` without `px` and `strip`, so it reports
  0.21 where the fans agree to 0.006). Use K169's `census_k81.mjs` or
  K93's `census_k81h.mjs` (`.claude/probes/K93/`); fix or retire it.

## K217 (2026-10-15, shortened by the diet)

- **K217** · K93's trail split is placed linearly in ctrl, but the trail
  measures lattice length and the paint is linear in arc, so the fade
  start sits slightly off (pre-existing), and a fading part narrower
  than a pixel blends sub-pixel at the split (`docs/design/K93_K145.md`,
  Stage 1 handoff).

## K213 (2026-10-15, shortened by the diet)

- **K213** · Before K90's bend bound ships (if Levi ships it): the min
  regression (the hard clamp tightens the worst window in 24 of 585
  scans, the soft one in 4; done when `k90_minrows.mjs` reports 0),
  `controlArcLengths`, unit tests and a CPU mirror, hit tests on the
  moved samples, the phone's rebuild cost (`docs/design/K90.md`, Stage
  1b handoff).

## K207 (2026-10-15, shortened by the diet)

- **K207** · Fog stamps grow without bound within a solve: the spacing
  filter checks only the last stamp, and `renderFog` redraws every stamp.
  A spatial dedupe fixes both (`src/render/fabric_maze_renderer.ts`;
  `docs/design/K100.md`, Stage 1 handoff).

## K206 (2026-10-15, shortened by the diet)

- **K206** · A restored attempt stamps its fog right after the intro,
  while the threads re-settle, so with physics it differs from the live
  fog (IoU about 0.96). Option: stamp after the first sleep
  (`docs/design/K100.md`, Stage 1 handoff).

## K205 (2026-10-15, shortened by the diet)

- **K205** · K120's leftovers (`docs/design/K120.md`): the follow camera
  doesn't keep the dot clear of the move pad (a camera inset, K148's and
  K149's area); the maze is small at the phone's fit zoom; a toast at
  411 px wide can briefly overlap the pad; clicking the panel's empty
  area and then pressing an arrow moves in the maze instead of scrolling
  the panel; in principle a hold could loop around a cycle of runs that
  all match its key (not observed). Probe gotcha: alternately tapping and
  holding the best key can cycle forever.

## K202 (2026-10-15, shortened by the diet)

- **K202** · A bare-URL daily left open past midnight with no move
  becomes practice when begun the next day (K146). An unstarted daily
  the bare URL opened could roll over to the new day instead
  (`docs/design/K146_K151.md`, "Open").

## K201 (2026-10-15, shortened by the diet)

- **K201** · History's "Played" chip counts any record, practice
  included, so it can exceed the played tile (24 against 21 in K146's
  probe); a practice row's count shows only in its tooltip, which phones
  lack (`src/ui/daily_stats_view.ts`).

## K197 (2026-10-15, shortened by the diet)

- **K197** · The phone's load settles later over ab6d330..54a2b43
  (K156's round pass of 2026-10-14): first sleep 8.0 -> 19.3 s, fps 46
  -> 41, p95 33 -> 50 ms, while the longest frame fell 684 -> 167 ms;
  K147's settle budget (b0a1c49..97293e7) is the likely, unconfirmed
  cause. To attribute: the frames phase with `-Base b0a1c49~1 -Head
  97293e7`; then whether 19 s is acceptable is Levi's call.

## K190 (2026-10-15, shortened by the diet)

- **K190** · Unmeasured costs from K154+K169 (aaa3dda): the new hash
  costs the drifting backgrounds' programs 37-60% more on the desktop
  (vellum-drift 0.352 -> 0.50 ms at 3200x1800); the phone, and the fan
  program during a web fade, are unmeasured. Measure at K79's K52 phone
  gate, vellum-drift first; if the phone pays, a cheaper hash needs
  another shape (`docs/design/K154_K169.md`, "Stage 1 handoff").

## K195 (2026-10-15, shortened by the diet)

- **K195** · The phone pass's gaps (K156 3c, `docs/design/K156.md`,
  "Stage 3c handoff"): the noise floor is one 3-rep A/A pass for `-Moves
  0,7,13` only (rerun A/A when the orientation, the phone or the load
  changes); knot-mode render ms swings 7.5-20.5 ms in A/A, no use at
  rest; K80's indicator look shows the indicator but never taps it.
  Fixed since: the white strip (K193), the portrait floor (K253,
  459cc11), and the watchdog's touch trip works (2026-10-14 19:37).

## K196 (2026-10-15, shortened by the diet)

- **K196** · K180's crossings options at phone scale: `ride` and `pinch`
  leave most taps unreadable in the census (dense `ride` 93.8%, fabric
  `pinch` 71.1%); `through` reads best (`docs/design/K180.md`, "Stage 1
  handoff"; `.claude/probes/K180/`).

## K123 (2026-10-15, shortened by the diet)

- **K123** · `.claude/probes/K10/phone_bench.mjs` drives the first
  visible `http://localhost:` tab on any port, so it can navigate one of
  Levi's own tabs. Use `.claude/probes/K79/phone/bench.mjs` (ports
  5371-5374 only), or filter by port.

## K125 (2026-10-15, shortened by the diet)

- **K125** · Scarborough Fair's loop is 50 beats
  (`src/audio/songs.ts`; K116 found it), not whole 3/4 bars, so a part
  that keeps bars would slip each loop. Grow its closing rest from 2
  beats to 3 before any band part (K116's call 6).

## K128 (2026-10-15, shortened by the diet)

- **K128** · `src/render/marker_mesh.ts:32` declares `in vec2 aUV;`
  but never reads it while the marker geometry carries it, so PixiJS
  warns "Attribute aUV is not present" for each of the three marker
  meshes on every load (K83; found by K81 stage 3a). Read it in the
  shader or drop it from the geometry.

## K130 (2026-10-15, shortened by the diet)

- **K130** · Panel rows with a slider step (`backgroundIntensity`,
  `pulseReach`, `settleBudget`, `loadSettle`, ...) snap to Tweakpane's
  step grid, which starts at the row's first value: after a link with an
  off-grid value, "Reset to defaults" can write a wrong default (e.g.
  intensity 0.48). Existing behavior (`src/ui/tweakpane_panel.ts`),
  found by K79 stage B1.

## K131 (2026-10-15, shortened by the diet)

- **K131** · The phone probe kit (`.claude/probes/K79/phone/`,
  untracked): `drift.mjs` and `frames.mjs` take full-size PNG shots,
  10-25 s each over Tailscale (use JPEG or clipped shots); `bench.mjs`'s
  `thermal()` reads the stale "Cached temperatures" block, not the live
  HAL one (K81's `.claude/probes/K81/phone/lib.mjs` reads the live one,
  in K81's worktree). Untested: whether the watchdog's 2 s `dumpsys`
  poll and CDP traffic add to the bursty frame stalls. The phone has no
  GPU timer, so a tighter A/B needs many interleaved reps.

## K12 (2026-10-15, shortened by the diet)

- **K12** · Shaped-lattice sleep failures: star with e-w anchors sleeps
  on 6/8 seeds; K46's scans at gs 20-24: star 4/60 never sleep, tree
  4/60, fish 2/60 (some thrash about 1 unit per substep); heart, ring
  and rect are clean. The circle at gs 18 is clean on its default and
  w/e anchors, but with n/s anchors 3 of 7 seeds never sleep (seeds 1
  and 4 thrash, seed 7 holds a standing rider). Repro:
  `?4.c&shp=circle&sa=n&xa=s&am=instant`.

## K62 (2026-10-15, shortened by the diet)

- **K62** · The `branchDensity` and `fourWayFraction` panel rows do
  nothing at the default `junctionSpacing` 2 (K46 finding; K74:
  `branchDensity` 0.2-0.6 and `fourWayFraction` 0.4-0.7 build the
  identical maze, 0.1, 0 and 0.8+ change it). They look broken; rescale,
  relabel or hide them. `junctionSpacing` is the real density knob.

## K15 (2026-10-15, shortened by the diet)

- **K15** · During a reveal, a joint's fan can turn opaque while a fill
  beside it is still striped (K4 fixes it by construction). May be moot:
  G1 (99443cb) deleted the over-fills. Re-check fan vs base ribbon during
  a reveal.

## K16 (2026-10-15, shortened by the diet)

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

## K65 (2026-10-15, shortened by the diet)

- **K65** · Low-gridAlign knots (`ga=0`, e.g. Levi's rect link) creep
  under the quiet threshold: a fresh settle drifts about 1.5 world over
  about 50 s, a cinch up to 0.9 world/s, and every sleep gate freezes
  them mid-creep. A net-displacement test over the window would catch it
  but keep such knots awake for tens of seconds. Related: K11 (K63
  finding).

## K29 (2026-10-15, shortened by the diet)

- **K29** · Boxed kinks at tw 0.64: 3 of ~152 kinks (8 seeds) rest at
  0.56-0.78 thread widths of eye hole, boxed in by a fused joint and the
  1.6 corridor floor and keeping only lattice material; stronger eye
  pressure (2.6, 2.8) doesn't lift them. Since K41's chord law they rest
  a little smaller (X304 of seed 3zz2a1: 0.78-0.80 at default width).
  K49 is the size decision. `.claude/rules/physics-kinks.md` ("KINK
  EYES").

## K30 (2026-10-15, shortened by the diet)

- **K30** · Very wide threads (tw >= 0.72) never sleep, standing riders;
  after K41, 7/8 seeds sleep at tw .72 (was 4/8). Seed 1q2w3e's kink
  X360 cycles material through its crossing at mv about 0.09; turning
  eye pressure off doesn't stop it. The slider reaches 0.8.

## K59 (2026-10-15, shortened by the diet)

- **K59** · Two visible windows with interleaved moves on one daily end
  with the last writer's attempt winning: a tab adopts a newer saved
  attempt only when it comes into view. Adopting on the `storage` event
  fixes it but rebuilds the other window (intro included) on every move.

## K26 (2026-10-15, shortened by the diet)

- **K26** · Plucks at tight loops, zoomed in: only the concave side of
  the swing is capped, so a loop's eye gets a slightly ragged, enlarged
  rim during the ring. A symmetric cap fixed the eye but lumped every
  hook's outer blur at normal zoom, so it was rejected.

## K27 (2026-10-15, shortened by the diet)

- **K27** · Plucks near junctions. Lobes inside a junction's fillet-web
  footprint (about 1 world at cr 3) keep their base intact, so they ring
  as a crisp thread with a halo rather than a blur, as crossing
  footprints already do.

## K42 (2026-10-15, shortened by the diet)

- **K42** · Silhouette-level cyclic overlaps: three ribbons over one
  pixel, each over the next (user links x170/x93 after repeated cinches,
  x134/x135). G1's per-pixel protect can't break a cycle; it needs a
  per-pixel winner.

## K44 (2026-10-15, shortened by the diet)

- **K44** · Probe tooling quirks: the gap census's totals drift between
  captures of one frozen state and it ends a crossing's ideal at 0.5 of
  the neighbor gap (the renderer uses 0.8); a hold probe must first move
  past the 4 CSS px tug threshold (df373b5; `.claude/probes/K41/` moves
  12 px); with flow on, A/B at `fw=0`; pair `phy=0` builds on one side
  of K63; a 4x CPU throttle is for ratios only.

## K69 (2026-10-15, shortened by the diet)

- **K69** · String mode (`pv=string`) on pre-G2.3 builds drew a 1-px
  diagonal sliver from the start to the exit marker after a few moves
  (`?b.c&pv=string`, 6 moves). G2.3 does not show it but it was never
  attributed; look again if it returns (G2 doc section 7, Follow-ups).
  Since K83 (45aac50) that Graphics draws only the win ring.

## K103 (2026-10-15, shortened by the diet)

- **K103** · Below 10 fps the fit camera, the move animation, the paint
  clock and the pluck overlay still slow down: the fit eases by a fixed
  fraction per frame, and `tickAnim`, the paint and `tickPlucks` read
  Pixi's `deltaMS` (capped at 100 ms). K96 (d8b9175) moved only the
  follow camera onto real time; a time-based fit ease would change its
  feel at the refresh rate it was tuned on. Since K101 (e9e01ae) a music
  note's string motion trails its sound below 10 fps.

## K112 (2026-10-15, shortened by the diet)

- **K112** · Motion setting residuals (K79, 9ffda8a): no cross-tab sync
  (another tab picks a change up on reload; `src/ui/motion.ts`), and the
  camera's reduced-motion jump on an edge-indicator tap was
  code-reviewed, not probed.

## K133 (2026-10-15, shortened by the diet)

- **K133** · Crossed join bridges: plans built before K110 can hold two
  join bridges that cross (the diagonals of one cell; 108 plans, 20 of
  them dailies). K110's joins skip such a splice, the older join code
  has no check. Fixing it moves those plans, which the pre-launch policy
  allows; first look at whether a crossing reads wrong
  (`.claude/probes/K110/verify_run3.txt`).

## K136 (2026-10-15, shortened by the diet)

- **K136** · A gs 6 tree maze with dead ends never sleeps (140 s of sim,
  still moving), on 7e41a02 and ade3537 alike, so not K110's doing;
  maybe the K13 attractor. Repro `?12l&gs=6&shp=tree` (K74's agent saw
  it at the new defaults and the old placement too);
  `.claude/probes/K110/sheet/results_run1_tree_awake.json`.

## K142 (2026-10-15, shortened by the diet)

- **K142** · The A/B harness's first case in a fresh browser can read
  nonzero (1 of 11 runs: K79 B2b's `none_desk`, specks on thread edges);
  cause not found (a cold server or GPU cache?). Rerun before trusting
  it; a warm-up case is untested (`docs/design/K79.md`, "The 18/19
  run").

## K150 (2026-10-15, shortened by the diet)

- **K150** · Probe tooling isn't safe for concurrent agents:
  `scripts/diag_screenshot.mjs` uses one fixed Chrome profile and an
  on-screen window, and `scripts/preview.ps1 -Ref` builds into fixed
  TEMP folders unless given `-Root <dir>` (K156 stage 1, 1f8be97). Fix:
  per-run profiles, off-screen windows (claude-config
  `rules/lessons.md`). Give each agent a disjoint port range, and a
  probe must not release the perf lock between samples (gaps let another
  agent's builds land).
  `scripts/bench_frame.mjs` and `probe_gpudraw.mjs` default their Chrome
  profile to the OS tmpdir (found writing K8 G3-1's brief).

## K157 (2026-10-15, shortened by the diet)

- **K157** · K79 B's color rows on the phone (B3): accent 3's picker
  opens 8 px below the viewport until the panel scrolls, and a second tap
  on a swatch doesn't close Tweakpane's popup (check the older color rows
  too). (`docs/design/K79.md`, "Stage B3 results")

## K166 (2026-10-15, shortened by the diet)

- **K166** · K81's render residuals (`docs/design/K81.md`, "Residuals
  to report"): the pluck overlay draws over the gold band; band edge
  cases (a ribbon patch past a non-route arm's cover cap, a fixed-width
  band on a ribbon whose width varies, clipping at non-adjacent routes
  and skipped wedges, caps dropped past MAX_ROUTES and MAX_ARMS); and at
  a tap, setPaint runs a frame ahead of tickPaint.

## K168 (2026-10-15, shortened by the diet)

- **K168** · K81's untested ranges: more than 20 routed records, zoomed
  in, and a full web on the phone (the gate walks the cheapest route, so
  a full web was certified on the desktop only). K156's looks can cover
  some.

## K170 (2026-10-15, shortened by the diet)

- **K170** · `scripts/phone.ps1` sends KEYCODE_WAKEUP, against the phone
  rule (no key events; the phone stays awake on its charger). Proposed:
  no wake by default and a `-Wake` switch to opt in (K156 3a proposed a
  `-NoWake` switch instead; `retry_quiet.ps1` already drops its copy).

## K177 (2026-10-15, shortened by the diet)

- **K177** · K80's last unrun check: the minotaur's indicator on the
  phone itself (K174 checked it on the desktop in 411x753 emulation);
  the next phone pass shows it. Chases are not saved or replayable
  (`replayChase` exists; the dailies stay turn-based).

## K178 (2026-10-15, shortened by the diet)

- **K178** · Since K122 the private-cache vite wrappers of K19-K20, K79,
  K99 and K104 fail with ERR_MODULE_NOT_FOUND; K80's
  (`.claude/probes/K80/rt/vite.private-cache.config.ts`, which loads the
  config with `loadConfigFromFile`) works (`.claude/rules/probes.md`).

## K181 (2026-10-15, shortened by the diet)

- **K181** · K104's residuals: the phone's "can't tell" share stays high
  in fabric and dense (26%, 41%); W deepens the raw collapse; sound-only
  taps in junction cores, and taps bound by hide zones, can show only
  through a cue; the cue constants are unreviewed. G1's soft edge shows
  the under ribbon inside casing + CUT_BIAS at fabric and dense
  crossings of 80-90 degrees. `docs/design/K104.md` ("Stage 1b handoff",
  "Stage 1c handoff").

## K188 (2026-10-15, shortened by the diet)

- **K188** · K140's residuals (`docs/design/K140.md`, "Stage 1 handoff"):
  `restartSolve()` leaves pieces in the air; the open desktop panel covers
  the spray when the exit is at the lower right; the rain takes 5.5-6.2 s
  to fall out, longer below 10 fps.

## K287 (2026-10-15, shortened by the diet)

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

## K291 (2026-10-15, shortened by the diet)

- **K291** · CI: the deploy run of ad2618a carried two annotations:
  checkout@v4, setup-node@v4 and wrangler-action@v3 target Node 20
  (forced on Node 24), and `ubuntu-latest` moves to Ubuntu 26 on
  2026-10-19. Bump each action to a Node 24 release; if the first deploy
  after the 19th fails, pin `ubuntu-24.04` (a red run leaves the
  previous deployment live). `.github/workflows/deploy.yml`.

## K295 (2026-10-15, shortened by the diet)

- **K295** · `.claude/probes/K155/probe_stars.mjs` is stale in two
  checks: it expects 4 rules lines in the stars popover (stat lines
  follow them since K274) and today among the History rows (own row
  since K146). Only the copy
  `.claude/probes/K80/turns2/banner/probe_stars.mjs` is fixed.

## K300 (2026-10-15, shortened by the diet)

- **K300** · `scripts/phone_pass.ps1`'s `-Moves` default 0,7,13 (line
  110) now lands on the finish: master's `?b.J` is solved on its 12th
  move since K74 stage 2 (inferred), so fabric@13 times the stars and
  confetti. K253's portrait floor was taken at 0,7,13 too, so change the
  default to 0,7,11 together with the next A/A, which then takes a
  fabric@11 floor (`docs/design/K156.md`, "Round 2026-10-14c handoff",
  Step 7).

## K301 (2026-10-15, shortened by the diet)

- **K301** · The phone pass tab's layout flips from 411x753 to 412x755
  CSS px after its first real tap or move (under K193's CDP emulation),
  so same-state baselines and fixed-size crops shear (K279's run-1 flash
  numbers were invalid). Cause not found; the pass's looks and probes
  should cope, or re-pin the metrics after a tap (`docs/design/K156.md`,
  "Round 2026-10-14c handoff", call 6).

## K305 (2026-10-15, shortened by the diet)

- **K305** · In the daily's intro, k7_frames' frame-callback p50 (24.7
  ms) exceeds its rAF-interval p50 (18 ms); unexplained, so K7's
  summaries report fps, interval p95 and render alone
  (`docs/design/K7_worker.md`, "What was measured").

## K308 (2026-10-15, shortened by the diet)

- **K308** · The background contours' `mod(floor(v + 0.5), 5.0)` is a
  float quotient like K299's: exact on the desktop GPU and allowlisted in
  `ROUNDED_QUOTIENTS` (`test/render/paint_ring_lap.test.ts`), unfixed
  because the background programs are sha256-pinned. Fix it with the
  next change that re-pins them. `docs/design/K299_choice_pulse_bug.md`
  ("Residuals").

## K314 (2026-10-15, shortened by the diet)

- **K314** · `src/main.ts`: the non-finite watchdog's comment (about
  line 4274 at 459cc11) and stamp say `halted` is cleared on regenerate,
  but nothing sets it back to false (its only `= false` is the
  declaration). Noted by K7's stage 1.

## K315 (2026-10-15, shortened by the diet)

- **K315** · `__knotPhys` calls `sys.readSlideStats()`, which resets the
  slide counters it reads. Under K7's mirror it needs the diagnostic
  bridge or a worker-side count; decide in K7's stage 2 or 4
  (`docs/design/K7_worker.md`, "Stage 1 handoff", "For stage 2", on K7's
  branch until it merges).

## K319 (2026-10-15, shortened by the diet)

- **K319** · ANGLE's Vulkan backend does not expose
  `KHR_parallel_shader_compile` (K307 stage 1), and phones may not
  either: there K307's warm-up falls back to blocking links and the
  screen stalls for the longest compile (section-rgb, about 2.8 s cold
  on D3D11). The phone's answer rides K156's next pass.

## K342 (2026-10-15, shortened by the diet)

- **K342** · The snore link (K325) is verified on desktop Chrome only.
  Unchecked: Android Chrome (the touch delay's feel; whether it cuts the
  sound when the tab switches; rides K156's next phone pass),
  Safari/iOS, other desktop browsers. `gameplay-audio.md`, THE SNORING
  CAT LINK.

## K343 (2026-10-15, shortened by the diet)

- **K343** · The snore's first-input limit (K325): no AudioContext
  exists before the first activation, so a hover before any click or key
  is silent, and the gesture that opens the audio gate plays nothing
  (the MP3 is not yet decoded). Fix: decode on an OfflineAudioContext
  before the gate. `gameplay-audio.md`, THE SNORING CAT LINK.

## K346 (2026-10-15, shortened by the diet)

- **K346** · The physics halt misses NaN: the check
  `Number.isFinite(maxMove)` (`src/physics/particle_system.ts`, about
  lines 2281-2287) only catches an infinite move, and a NaN displacement
  fails `d * d > max`, so a state that turns NaN without an infinite move
  never halts. Predates K7; found by K7's stage 2 (2026-10-14).

## K348 (2026-10-15, shortened by the diet)

- **K348** · Key-move edges left by K329/K333/K334: the clockwise X
  assignment switches only once arms move past KEY_TIE; at a T a chord
  can pick a run by elimination; a sloppy chord whose first key is clear
  alone gives that move plus a queued second; a hold whose first run is
  shorter than HOLD_DELAY pauses at the first junction; a turn-minotaur
  wait tap during a move isn't queued; the tap and pointer hovers may
  fight while a tap waits; the arrival frame's overshoot is dropped.
  Lore: TIE CYCLES, CHORDS AND THE MOVE WAIT in `gameplay-moves.md`.

## K349 (2026-10-15, shortened by the diet)

- **K349** · K120's key probe lags the new rules
  (`.claude/probes/K120/keys.mjs`, K329's `waiting` patch in; old copy
  `keys.pre-k329.mjs`): its realtime check "a held key keeps adding
  inputs" fails on master too (the `?7.J` hold from node_14 stops after
  one move; it needs a start where holds chain), and its queued-run
  check should poll inside the page. One real-time first-press miss
  under load was not reproduced in 10 tries
  (`.claude/probes/K329/k120/out/keys-run2.log`).

## K354 (2026-10-15, shortened by the diet)

- **K354** · A dark three-armed star in a kink loop's eye under the
  pluck blur, the uncovered middle (concave-side cap off: a thin Y); K77's
  "dark X" family? `docs/design/K344_pluck_cusp.md` (stage 1 handoff).
  K395 (2026-10-15): the star changed shape (an X became a rounded square) but is still there.

## K355 (2026-10-15, shortened by the diet)

- **K355** · Zoomed in, the wide outer pluck blur shows staircase bands
  (inferred: affine interpolation over wide quads); before and after
  K344. `docs/design/K344_pluck_cusp.md`.
  K395 (2026-10-15) left the bands untouched.

## K385 (2026-10-15, shortened by the diet)

- **K385** · K307 s2: links under KHR_parallel_shader_compile never reach Chrome's disk
  cache (D3D11), so the warm-up links blocking and wave 2 is off. The cause, read from Chromium's
  source (inferred until (a)): the completion query's link resolves in MakeCurrent's poll,
  outside the program cache's disk scope, and the per-context path that always writes is off
  by default. Plan: (a) the flag probe, (b) late enable (to ship), (c) no extension with late
  reads, (d) a crbug once (a) confirms (Levi's call). Also untested: the extension on master; a draw mid-compile. Rides K307 stage 3;
  `docs/design/K307_intro_freezes.md` ("K385").

## K390 (2026-10-15, shortened by the diet)

- **K390** · The fog A/B recipe (`probes.md`, `k83_ab`) is not deterministic: K5 M1's same-build
  controls differ by 4054-7979 px (maxΔ up to 49), the start marker flipping between two states
  (exactly 148 px). Unexplained. `&phw=0` cuts it to about 700 px per capture (maxΔ 53; K5 R1
  `checks2/pairs_fog3.txt`), so probes.md's K83 recipe should pass it. `.claude/probes/K5/stage1/fogbisect/`

## K398 (2026-10-15, shortened by the diet)

- **K398** · The GAP texture passes the Pixel's 8192-row limit at gs 66 and up in knot mode
  (wd 1: 8580 crossings, 16384 rows), and past it the phone's allocation fails and every gap
  vanishes (K8 G3-1's brief, `.claude/probes/K8/G3-1/`). Pre-existing: `readNumber` and the
  codec's `num` don't clamp a link's values to the panel's ranges (gs [4, 24]). Fix: clamp them.

## K403 (2026-10-15, shortened by the diet)

- **K403** · Doc and comment drift found writing the K74/K80/K114 briefs (2026-10-15):
  `minotaur_turns.ts` 41-42 says stage 3 adds abbott (`K80_turns.md`: stage 4);
  `gameplay-minotaur.md` cites "codec v5 108-116"; `main.ts` 3177-3179 says tapsWait is off
  (it is on, 3283); `K74.md` 104 calls stage 3 "doc 4.2-4.5" (4.4 and 4.5 are stage 4's), and
  114-116 put handoffs in K74.md (the stage 3 brief uses its own file).

## K405 (2026-10-15, shortened by the diet)

- **K405** · After K395, a soft "M" at a kink loop's tip, much milder than the heart: where a
  flat stretch of the concave cap meets a rise a dip stays (`roundCap` only lowers the cap), and
  the inner edge turns +31° to +56° (stations 75, 79, 85, 89 of `?7` chain 9). Root: the
  5-station circumradius follows the control spacing. Follow-up: a smooth envelope of the
  radius, or a wider min window (`.claude/rules/render-pluck.md`, "Pluck loop tip (K395)").

## K422 (2026-10-15, shortened by the diet)

- **K422** · Two K120 regression probe checks fail on master too (seen by K80 3a): keys.mjs realtime
  "a held key keeps adding inputs" (2 → 3; untested guess: the seed-7 maze changed under it) and
  pad.mjs desktop "the stored choice shows it" (the pad hides under the open panel since K224,
  86dc0cf; store `knotmaze.panelOpen` "0"). `.claude/probes/K80/stage3/rerun/K120/`.

## K425 (2026-10-15, shortened by the diet)

- **K425** · Probes that read the section shader's source still read or edit
  `ribbon_renderer.ts`: `K290/stage3b/dump_variants.ts` (and its K76 2d and K290 3a
  copies), `g2/` and `K4/` `variant_build.ps1`, `K154_K169/edit_rr2.ps1` and
  `edit_rr3.ps1`. Repoint them at `src/render/ribbon/ribbon_shader.ts` when next used
  (R1's copy: `.claude/probes/K5/R1/dump_variants.ts`). A `variant_build.ps1 -Subst` on moved
  text must name the new file. K5 R2 (52faab8) moved the crossing and explore gaps to
  `src/render/ribbon/crossing_gaps.ts` and `explore_gaps.ts`; a `-Subst` on that text names them.

## K428 (2026-10-15, shortened by the diet)

- **K428** · Thread-reveal same-state A/Bs don't repeat: one build's captures
  (`k5ab&phy=0&am=instant&fw=0&snd=none&xp=threads`, 3 moves, k83_ab with K381's
  explore-clock pin) land in a few discrete states 17-67551 px apart, with or without
  `&phw=0`. A clock is still unpinned; until it is found, take several captures per
  build (K5 R1 `checks/`, `checks2/pairs_threads3.txt`). K5 R2 (2026-10-15): beacon halo
  sprites differ by 30-185k px between captures of one build, and the dots' reveal has two
  states about 115k px apart (`.claude/probes/K5/R2/checks/`).

## K431 (2026-10-15, shortened by the diet)

- **K431** · Probes' three-decimal `viewStill` isn't pixel-still under cam=follow:
  frames change for 0.6-1 s after it passes, and the view stops bit-exactly ~10 s later
  (K268 3a). Port stage3a `k76_probe.mjs`'s bit-exact wait (EXACT) to census3a's prepare
  and the other probes with that wait; add the probes.md lore line.

## K432 (2026-10-15, shortened by the diet)

- **K432** · A pinned backdrop went black with no `webglcontextlost` in 2 of 3 unlocked
  k76 sheets (K268 3a, 11:11-11:13, beside K290 3c's phone run); no census lost it.
  Rerun the sheet alone under the perf lock to attribute it; until then pixel-exact
  sheets take the perf lock (probes.md, K76 2b). Lore line.

## K435 (2026-10-15, shortened by the diet)

- **K435** · Lore fixes from K290 3c: render-explore.md THE BURN says the front's band
  darkens the unburnt side under char only, but the code does it under both looks (check
  THE EMBER DRAWS too); probes.md: `container.visible = false` doesn't stop the burn FX,
  so a true FX-off frame shadows tickFireFx with a no-op, calls fireFx.clear() and waits
  two frames (stage3c `width_probe.mjs`).

## K322 (2026-10-15, shortened by the diet)

- **K322** · Art, sound and music by people (Levi, 2026-10-14 21:47):
  commission or license better icon art, sound effects and music before
  launch, and credit each artist on the credits page (K321) with the
  terms their work ships under (`notices/credits.ts`).

## K259 (2026-10-15, shortened by the diet)

- **K259** · With the explore mode on, a chain with any visible piece
  draws its whole mesh, so hidden fragments still run the shader;
  drawing only the visible index range would make it cheaper. Not needed
  yet (2a's cost never exceeds master's program; `docs/design/K76.md`,
  "Stage 2a handoff").

## K255 (2026-10-15, shortened by the diet)

- **K255** · Fold K193's `wait_then_aa.ps1` (`.claude/probes/K193/`) into
  `scripts/phone_pass.ps1` as `-WaitQuiet`: it tolerates touches until a
  full quiet window can no longer end before a deadline, where
  `retry_quiet.ps1` only runs after a trip and gives up at the first
  touch that leaves less than a full window.

## K256 (2026-10-15, shortened by the diet)

- **K256** · The phone warms about 6 C in a pass's first rep, so cells
  run at different temperatures (K193's A/A). A warm-up before the
  bench, or a temperature column in the summary, would separate heat
  from noise (`docs/design/K193.md`, "Stage 1 handoff").

## K247 (2026-10-15, shortened by the diet)

- **K247** · K174's ideas: readable labels in the Minotaur folder (the
  `mino*` keys clip, K246); a catch toast that says the fog came back;
  homing or the rejected "closest" roam pick, if more than about 2/3 of
  games should meet the minotaur. `docs/design/K174.md` ("Stage 1
  handoff").

## K233 (2026-10-15, shortened by the diet)

- **K233** · The phone pass's full spec (26 looks, 3 reps) takes about
  55-60 min. Trim it per round, or add a spec `deadline` so no look
  starts after it (`pass/state/watchdog.trip` already stops a pass
  gracefully; `docs/design/K156.md`, "Round 2026-10-14b handoff").

## K36 (2026-10-15, shortened by the diet)

- **K36** · Add to home screen: a web app manifest and icons. Blocked on
  icon art (Levi has the prompt for another model), which also fixes the
  `/favicon.ico` 404 on every load. K122 found the Vite template's
  unreferenced leftovers (`public/favicon.svg`, `public/icons.svg`,
  `src/assets/hero.png`): delete them or wire up the real favicon.

## K66 (2026-10-15, shortened by the diet)

- **K66** · Why do bridges at joints, open tails and kink neighborhoods
  end the settle ramp near an unstable point? They snap to a new rest
  3.5-5 s in, which forces K63's 2.5 s window; fixing it could make a
  0.75 s window safe (K64). K63 agent idea; harness in
  `.claude/probes/K63/`.

## K84 (2026-10-15, shortened by the diet)

- **K84** · After the churn, a pass over EVERY param (Levi, 2026-10-13):
  classify each as a viewer preference (localStorage) or a design param
  (the link); keep each in its concept's folder and mark preferences
  instead of a separate section (K292); re-evaluate worth and grouping;
  audit names and tooltips; place `finishIndicator` and `tapToPan`
  (K73), the Motion setting (K79) and High contrast (K111). Meets K57
  (the daily's exempt keys) and feeds K78's param reference.

## K85 (2026-10-15, shortened by the diet)

- **K85** · Replay links (Levi, 2026-10-13): record a playthrough in a
  link and replay it with the path animating, for a finished session
  (watch) or an in-progress one (pick up where it left off). Builds on
  K47 (an attempt is its tap list plus a walk-graph fingerprint); a link
  needs the design token, the taps and per-move timing. The share link
  stays as it is.

## K91 (2026-10-15, shortened by the diet)

- **K91** · A shorter quiet window for physics-off loads (they never
  wake), dropping their hidden settle from 5.0 sim-s toward 3.25. Cost:
  about 4% of designs would lay out 1-4 px differently from physics-on,
  which K57's exempt physics toggle assumes is the same (K64 follow-up).

## K82 (2026-10-15, shortened by the diet)

- **K82** · Manually override the daily maze for a given day (Levi,
  2026-10-12: "could be a follow-up thing"): a frozen per-day override
  table beside the versioned definitions, which a published day's entry
  must never change (`.claude/rules/gameplay-daily.md`, daily rule 1).

## K68 (2026-10-15, shortened by the diet)

- **K68** · If junction-web edges look soft at deep zoom (about 4x),
  size the arm material strip rows from the camera's world-per-pixel
  (re-packed on zoom) instead of raising the 64-texel width for everyone
  (K4 agent idea).

## K70 (2026-10-15, shortened by the diet)

- **K70** · A more dramatic hero settle (P2 polish): the splines round
  the lattice corners from the first frame, so the settle reads as a
  gentle tightening, not zigzags turning into curves. Blend the sampled
  positions toward the control polyline while settle progress is low
  (`docs/history.md`, Follow-ups).

## K71 (2026-10-15, shortened by the diet)

- **K71** · Wobbly threads at slack ~0 (P2 polish): waviness along runs
  and rope-tight twist chains. Candidate knobs: constraint iterations,
  pullOnly bending, repulsion/structural balance (`docs/history.md`,
  Follow-ups).

## K113 (2026-10-15, shortened by the diet)

- **K113** · Two-layer vellum: render the fibers and grain once into a
  static texture (1 texel per CSS px) and drift only the mottling in a
  low-res pass; the drift pass costs about 2.1 ms at 1600x900 today
  (K79, `.claude/probes/K79/out/gpu_k79.log`).

## K119 (2026-10-15, shortened by the diet)

- **K119** · i18n, at the end (Levi, 2026-10-13): there is little text,
  and an LLM will drive the translations. Strings are mostly in
  `src/ui/` and `src/game/share_text.ts`; text drawn as threads is
  K115's question.

## K141 (2026-10-15, shortened by the diet)

- **K141** · K80 section 4's costlier mechanisms, deferred (Levi,
  2026-10-13): 4.8 sentries (call 9's "validated sentries"), 4.22
  two-player (M hot-seat, L networked), 4.25 over-under swap
  (`docs/design/K80_gameplay_additions.md`). The M ones are K138.

## K160 (2026-10-15, shortened by the diet)

- **K160** · The background speed slider is linear over 0-8; a curve
  like gridAlign's (`src/ui/grid_align_curve.ts`) would give the slow
  end room. At 8x the 10-15 Hz texture pass may look steppy (unchecked
  on the phone): if so, scale the re-render rate with the speed. A look
  for K156's phone pass.

## K57 (2026-10-15, shortened by the diet)

- **K57** · Confirm the daily's exempt settings (`DAILY_EXEMPT_KEYS` in
  `src/ui/daily_link.ts`): the ones a player may change without leaving
  the daily. Parked for the late-stage review with K46 and K84 (Levi,
  2026-10-14; `docs/design/levi_notes_2026-10-14.md` item 13). Still
  open: `settleBudget`, `loadSettle` (K162 (3)), the two confetti
  settings and `markerSize`. The comment at `daily_link.ts:153` still
  calls `hoverGlow` proposed, though K237 and K264 answered it.

## K117 (2026-10-15, shortened by the diet)

- **K117** · Repo visibility (`docs/design/levi_notes_2026-10-13.md`):
  private later, on Levi's word, parked until near launch to save CI
  churn cost (2026-10-14). Done in a756ca5: the panel's GitHub link is
  gone, `LICENSE` says all rights reserved (Snoring Cat LLC.),
  package.json says UNLICENSED, doc-only pushes skip the deploy. No
  bundle obfuscation. On his word: `gh repo edit --visibility private
  --accept-visibility-change-consequences` (reversible; the Pages deploy
  keeps working). K122 is needed either way.

## K316 (2026-10-15, shortened by the diet)

- **K316** · Single-threaded WASM for the collision narrow-phase: the
  audit's 2-4x on that slice (about 40% of a drag's physics), about
  enough to bring gs 18 from 0.76x to real time under K7. Only if K7
  stage 5's phone numbers show physics, not rendering, is the
  bottleneck. Threads are ruled out (the Gauss-Seidel solver must not be
  colored, and SharedArrayBuffer needs COOP/COEP through every host,
  proxy and the beacon).

## K320 (2026-10-15, shortened by the diet)

- **K320** · Slim or split section-rgb: at 46,850 characters it is the
  cold critical path (about 2.8 s on the desktop, K307 stage 1). A
  deploy that changes a shader costs every player one cold compile (the
  browser caches programs by source), so a smaller or split program
  shortens every such load.

## K371 (2026-10-15, shortened by the diet)

- **K371** · Let the worker run ahead of main's frames during the pre-settle, so
  it settles through K307's compile freezes (K7 s4); watch its saturation on
  the phone (97% busy, lagS 1.04 s by 8 s). K7 s7's name build could start it
  (scene ready ~0.15 s in); drop that settle when `prebuild` is `differs`.

## K429 (2026-10-15, shortened by the diet)

- **K429** · Pixi warns `Attribute aGap / aGapId is not present in the shader` once per
  pluck-overlay pool mesh (its geometry carries them, pluck_overlay.ts 692-693;
  pluck-blur's program doesn't declare them), so every probe console carries 1-4 pairs.
  Console noise (K5 R1 handoff).

## K10 (2026-10-15, the paragraph the diet left after the item)

Rerun after every stage: `scripts/preview.ps1` builds per ref,
`scripts/phone.ps1 -Ports ...`, then `.claude/probes/K10/phone_bench.mjs`.
The phone must be unlocked and awake. It heats up under back-to-back
runs (light throttling at 39 C skin, on its charger), which lowers
flow-on fps for every build alike: check `adb shell dumpsys
thermalservice` (status 0) and park the tab between runs
(`.claude/probes/K4/phone_blank.mjs`). Vsync-capped fps cannot show the
headroom left; a load-amplified bench (a higher render resolution)
would.

## K550 (2026-10-19, shortened at stage 3's launch)

K320 2b parity blocker: split stays dark; 2c must not start until the A/B is 0px (or K433 one-level). Diagnosis .claude/probes/K320/k550_diagnosis.md (probes `k550_*.mjs`). Session 1: the shipped mask row is off by one (`- 2 -` -> `- 1 -` = the `gapMaskTexel` twin; def 40,829 -> 12,353). Session 2 (finisher): the row fix + a three-keep mask (owner / under / deep gap passes, chain+arc-turn fragment identity in mask B) solves the stacking AND the dominant same-chain double-coverage term (def 12,353 -> 5,603, darker 6,246 -> 714; fat 6,789, user 3,051, knot 6,773; explore unmeasured - its single-capture control is 36,252, needs the K428 multi-capture form). WIP preserved uncommitted in `.claude/probes/K320/k550_two_keep.patch` (`git apply`-verified on ca60b72; tree left at HEAD). BLOCKER for the flip: MSAA sample coverage - canvas edge fragments (`>=` 1 sample, center-extrapolated varyings) are never recorded by the center-rule mask and paint at 1.0; temp `antialias: false` collapses def to 2,020 / gt1 343, and even that floor fails the brief's gt1 = 0 gate. No exact fix exists in this architecture (WebGL2 cannot sample an unresolved MSAA target; expansion/SSAA measured worse). Levi's call: waive the gate for 1-px edge diffs via the brief's contact sheets, or kill the split and keep Stage 1.

## K567 (2026-10-19)

If K320's split is revived (K550): use it only while cold: draw with the split while the combined program pre-compiles off-thread (KHR_parallel_shader_compile; Chrome's program cache is keyed by source, so Pixi's later link of the same text should read ~25 ms, K307), then swap. Or the cheaper try forms (stencil early reject, 2 offsets, owner keep only, an edge band), a paint that reads neighbouring mask texels on a miss, sample positions read at boot (`docs/design/K550_stage3.md` Recommendation). All untested.

## K571 (2026-10-20)

The title toggle leaves the daily (Levi 2026-10-20: "What actually counts as the "daily" for score-keeping credit, is either with or without the title. Toggling the title should switch the maze mode to custom, _and_ should reset progress."). Asked: the title setting is remembered (a DAILY_EXEMPT pref, `daily_link.ts:219`), so after a flip the daily reopens in the new form from scratch and that run counts; OK? Then build it (`daily_link.ts`, `daily_attempt.ts`, main.ts `savePrefsNow`, `tweakpane_panel.ts`).

## K595 (2026-10-20, shortened at filing)

Same-chain collision by rest material, not slot count: `applySegmentCollision` skips
same-chain pairs by a fixed 2 slots (`src/physics/forces.ts` ~272); skip or fade the floor where
the rest material between two segments is below `collisionDist`. Fixes K596 (skip 3 on chain 56 or
45 alone ends the cycle). First a kink-loop and eye-width census (KINK EYES), `byte_identity` as
the guard; regression `?b&am=instant`, 5 s central drag, sleep within +5 s; a browser check on
both hosts. Symptom levers (results.md `Levers`) only if this fails. `docs/design/K372.md`
(Handoff).

## K590 (2026-10-20, shortened)

- **K590** · G3-1's phone gap search, the rest: with K573 step 2 knot is still 2.0x the pre-G3-1
  build (19.3 vs 9.7 ms; 2.9x with step 1 alone). Untried levers, each its own brief: a per-chunk
  stride (a layout change; helps dense too), drop gapSeg's per-segment division (store u = d/|d|^2
  per point), cheaper `sampAt` index math. Knot's walk halved but its search fell only 30%: measure
  what lies outside the walk first. `docs/design/K573.md` (`Next, if knot must reach 1.5x`).

## K594 (2026-10-20, shortened)

- **K594** · Phone kit flakes in K573's run: the adb server died 3x at 12:45-12:47 (unexplained);
  starting the kit in the foreground hangs the tool; `cleanup.mjs` timed out (exit 2) after a
  watchdog trip with Chrome in the background; two stale reverse tunnels (5960, 5961) stayed on the
  phone. `.claude/probes/K573/logs/`.
