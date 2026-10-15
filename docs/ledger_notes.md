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
