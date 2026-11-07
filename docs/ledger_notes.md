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
80% at 08:37, 82% at 09:04, 83% at 09:28, 84% at 09:36, 88% at 10:01 (the 09:37 batch was told to wrap up by 10:30 and launches stopped) and 91% at 10:56, when Levi said "Let's ignore the usage limits until 97%. Proceed"; at 13:40 on 10-13 Levi said keep going at full speed, and on 10-14
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
(Levi may reorder). Running: K7's stage 3 from 23:22 (cap 01:22, opus),
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
1. The round's phone pass (K156): the 01:53 pass on head f054bbb (K79 B,
   K122, K147, K81, K80 stage 1, K104 stage 1c, K155, K140, K154, K169
   and K180 against base af88b89) is done (K197 filed), and so is round
   2026-10-14b's (10:12-10:42, head f2fc583, with looks for K146, K151,
   K148, K198, K100, K93 and K120; K232-K234 filed), and so is round
   2026-10-14c's (18:53-19:37, head dea013f: K279, K268 and k140 looks;
   merged at 19:48). The next window covers K98 and K92 and the frames,
   on the portrait floor K253 installed at 21:24 (54ef27a).
2. K80's real-time chase, its own mode (Levi, about 15:30: "I really
   want the real-time prototype... Do implement it."): stage 1 merged in
   113ae4d, and its controls (K174, Levi's answers of 2026-10-14 about
   11:10) in 52a4e53..f258161 (12:53); roamPull's strength is K245.
   K324 (2026-10-14 22:05) adds a telegraph, pauses at every junction
   and more controls.
3. K146 + K151 and K148 + K149: merged 2026-10-14 (a8bbb5f, 18b76be).
4. K120: merged 2026-10-14 (47d9223).
5. K90 stage 1b: merged 2026-10-14 (be9cdba, flag off); Levi's call
   (ship, tune or stop) is in Waiting on Levi.
6. K132 and K100: merged 2026-10-14 (cf5bcde, 354fadc).
7. K93 + K145 (`docs/design/K93_K145.md`): merged 2026-10-14 (c2eefd5,
   d0503b9..c795b42).
8. K92 + K224: merged 2026-10-14 (525819d). K111 stage 1 (the panel):
   merged 2026-10-14 (698aba5..1da3cbc), and its stage 2, the highlight
   modes, at 13:03 (ce66042..a2b2f1a); Levi picked at about 13:28, and
   stage 3 built the pick (K248), merged at 14:58 (d199033..3de7cdb).
   Levi answered its calls at 15:46: K237 as built, and stage 4 (K264's
   width slider, K265's High contrast prototypes) runs from 17:53
   (`docs/design/K111.md`, c233d09; K264's handle).
9. K98: merged 2026-10-14 (c9df8c9); its default size waits on Levi (K225).
10. Levi's answers of 2026-10-14 about 11:10 (placed here by the
    coordinator; Levi may reorder): K174's controls (merged 2026-10-14
    12:53, 52a4e53..f258161), K198 stage 2 (merged 2026-10-14 14:03,
    cf7010f..36f9ea7), K191's
    fade-out (merged 2026-10-14 12:04, 07bb21b..72faa82), K235 with K239
    (merged 2026-10-14 12:44, f0268b2..8960c18), and K193's portrait
    emulation (merged 2026-10-14 14:10, d0bbfad..7b17da5; its portrait
    floor installed at 21:24 in 54ef27a, K253).
11. K76 stage 2, in four stages (`docs/design/K76.md`, 7538ac9): 2a (the
    re-base, the model, the paint variant) merged at 14:15 and 2b
    (crossing gaps and junction joints) at 16:04 (a2bd3ca..59a107f).
    K268 stage 1, the shaped gaps Levi asked for at 15:16, merged at
    17:50 (2e341b0..f9ac1bc; `docs/design/K268.md`). 2c and K268 stage 2
    come after the physics worker (K7, below this list), one at a time
    and never alongside K298, K299 or K111 stage 5 (K265), since all of
    them change the paint shaders (K111 stage 4 merged at 19:11 and took `uKBase.y` and
    `uKGold.w`); then 2d, each from the handoff before it. 2c's codec removal
    is version 6, since
    K111 stage 3 took 5 (the codec note in
    `docs/design/K76_reveal_mode.md` still says 5).
12. K80's turn-aligned hunter, a modifier of the normal maze, in four
    stages (`docs/design/K80_turns.md`, c6514ae; four since dfd0996):
    stage 1 (the model and the mode) merged at 15:19 (81892d4..0036d03);
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
    (ed6ea5c..e5cc612); stages 2 (real-time burning), 3 (the look, with
    K290's burnt toggle, after K76 2c and K268 stage 2) and 4 (the daily)
    follow, each from the handoff before it and never
    alongside another agent changing how a tap becomes a turn. Then the
    spider (its own enemy; Levi, 2026-10-14 about 11:10).
14. K74 stages 3 and 4, each after the one before. Stage 2 merged at
    16:13 (4dee276..30a949a); stage 3's brief comes from its handoff
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
    (`.claude/worktrees/agent-a2f8f74cd5425c4ef`, from bd7c146); last
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
  paler streak; motion needs Levi's eye on the phone. `ptg=0.3` stutters
  3-5 s at 5-12 fps there, so the tug stays off. Levi, 22:32: "What?";
  re-explained at 22:45, recommending glint as the default look, the rest
  as built, and the wave (when picked) still bending the markers, trail
  and fog.

## K279 (2026-10-15, owner and next replaced)

  - owner: nobody since 2026-10-14 18:20 (stage 1 merged; stage 2 waits on
    Levi's picks, K288). Its agent abf68d906aaae3609 of session d8031183
    finished; its worktree is kept, and the pre-rebase history is the
    local branch `k279-stage1-prerebase` (4da36d5).
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
  does not fix it. K302 (6) put that to Levi as a priority call; their
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
  `?qoietk.KIiHgRRXwRlRt8fGrST4sf`; their inspect: crossing 104, chain 21
  crossing itself, over at ctrl 102 and under at ctrl 110.205). The fix
  covers the general case, not this loop alone. One opus stage in the
  confetti stage's slot: `docs/design/K344_pluck_cusp.md`.
  - owner: agent a67c6d4d11a9ea6b4 (opus) of claude session d8031183,
    from 23:30 (cap 01:30; ports 5890-5899).
  - branch: `worktree-agent-a67c6d4d11a9ea6b4`
    (`.claude/worktrees/agent-a67c6d4d11a9ea6b4`, from a7eb4a5); last
    commit: `a7eb4a5` (master; none of its own yet).
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
  Levi a sheet; stage 2 finishes what Levi picks. Stage 1 built all six
  behind ten daily-exempt params (seven codec appends; the vibration
  defaults rose to `psz` 2, `pgh` .5, `pw` .75) and the sheet, sent to
  Levi at 17:52 (their picks are K288, the residuals K289). Merged
  2026-10-14 18:20 (2600523..c6f15f9, 925 tests; codec rows 121-127) with the
  tug off by default (`ptg` 0; `&ptg=0.3` is the built strength): the
  follow-up timed a tap with the tug, a drag and a bare wake at the same
  7-9 fps on an idle desktop, the physics' own wake cost (K16), with no
  wake-path bug.
  - owner: nobody since 2026-10-14 23:55; stage 2 is ready to launch
    (K288 picked). Stage 1's worktree (agent abf68d906aaae3609) is kept.
  - branch: mainline; last commit: `c6f15f9`.
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
  - The design (merged 2026-10-14 20:10, 319fe52..7848dd8; desktop,
    measured on 4039f70): the daily's intro at about 56 fps instead of
    22.7, smooth but not a locked 60; its two freezes (2.7 s at 1.1 s,
    2.0 s at 3.8 s) stay, since they happen with physics paused too
    (cold shader compiles, traced by K307); the first sleep at about 12 s
    instead of 20.7; drags at gs 18 at 55-60 fps instead of 7, in 0.76x
    real time; dense render-bound at about 30 fps (K8); the phone likely
    40-60 fps, unproven until stage 5. Transferred buffers (no SAB, no
    COOP/COEP), a mirror ParticleSystem on main, fallbacks on error or a
    3 s timeout. Levi's 11 calls: K302, all yes (2026-10-14 21:18).
  - stage 1 (the in-thread physics host) merged at 22:04
    (0db7473..dc7d3fd, deployed): `PhysicsHost`, `PhysicsCore` and
    `InThreadHost` in
    `src/physics/physics_host.ts`, `grabAt`, `buildSceneGraph` in
    `src/core/scene_graph.ts`, every physics write in `main.ts` through
    `host` (`ps` is a read alias), and the guard
    `test/physics/host_seam.test.ts`. 941 tests pass, no snapshot moved,
    and the hidden loads end bit-identical to master's. The A/B matched:
    the daily's first sleep 20.96/20.68 s against master's 20.68/20.66,
    drags 7.0 fps on both, the knot's first sleep 16.69 s against 16.56.
    Residuals K314 and K315.
  - stage 2 (the worker core, in Node) merged at 23:21 (079e5ac..68b2fdf): the
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
    (`.claude/worktrees/agent-a9f593eca9038e6d3`, from 68b2fdf); last
    commit: `68b2fdf` (master) until its first WIP commit.
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

- **K339** · The settings panel's audit, merged in b81fd25..4d39553:
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
  stage 4. Levi's catch-reset toggle for the minotaur is K273. Levi answered
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
  The tuning section is cited as "R.6.1".

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
  buttons while the panel is open (Levi's spec), so the open panel now
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
  - stage 1a MERGED in b6635b4..927a789 (2026-10-14 07:32; no behavior
    change).
  - stage 1b MERGED in a8f269e..be9cdba (2026-10-14 09:03; flag off, no
    behavior change; 689 tests). The folds are the Catmull-Rom's own
    overshoot at the particle polyline's corners. A render-side bend
    bound (`boundBend`, `src/geometry/spline_generator.ts`: 1.2 h, each
    sample moved at most 0.5 h, 3 passes, a hard clamp or an optional
    soft one) takes fresh windows under 1.0 h from 2357 to 10, for +5-9%
    per ribbon rebuild. Try it live: `__knotSplineBend(true)`.
  - Levi's call (sent 2026-10-14 about 09:05 with the sheet
    `.claude/probes/K90/out_1b/sheet/sheet.png`): ship, tune or stop;
    default on or off; hard or soft clamp. Before it ships: K213.
  - Levi, 2026-10-14 about 09:20: they can't tell from the sheet and will
    test it live later (desktop console at levi.dev/knotmaze/:
    `__knotSplineBend(true)` / `(false)`). Told Levi no visible bug
    started it: K90 came from G3's filled-lobe-or-pinch question (K8),
    and the old seam (P3.34) stays fixed by the miter clamp. The
    coordinator recommends stopping it.
  - record `docs/design/K90_bend_radius.md`; handoff `docs/design/K90.md`
    ("Stage 1b handoff"); evidence `.claude/probes/K90/out_1b/`. Never
    alongside K8 (the same fold definition).
  - G3-2 needs the answer (K361 q13; Levi, 2026-10-15: "not sure on the spline bend yet").

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
  - 2026-10-14 about 00:22: Levi will test it later (item 7). Levi asked
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
  22:14-22:44 (`docs/design/K323_game_mode.md`, merged as 3841332): a
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
  Codec 7 clashes with the rows K74 s3, K80 3a and K114 s2 append after row 139: whichever lands later rebases and re-freezes the codec pins.

## K114 (2026-10-15, shortened by the diet)

- **K114** · Gameplay round 2 (Levi's notes, 2026-10-13) is designed
  in section R of `docs/design/K80_gameplay_additions.md` (ff1a314).
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
  - the burn race's stage 1 MERGED in ed6ea5c..e5cc612 (2026-10-14
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
  - branch: mainline; last commit: `e5cc612` (stage 1's handoff).
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

- **K74** · Maze design, decided (Levi, 2026-10-13 13:17; their answers
  verbatim in `docs/design/levi_notes_2026-10-13.md`): every mechanism
  gets params whose neutral value turns it off, so difficulty and feel
  stay adjustable. Design: `docs/design/K74_maze_design.md` (9fb419a).
  Four stages from `docs/design/K74.md`, each re-freezing the pins it
  moves and running the K63 sleep checks:
  - stage 1 MERGED in 8ba8834..ad5995a (2026-10-13 about 16:25; it
    deploys): `exitClearance` 12; long-tail dead ends (`deadEndLength`
    20, codec v4 index 71; 0 = the old placement, byte for byte), on at
    density 0.5 for links and the daily. Greedy median 1.96x -> 3.12x
    optimal; every daily moved (saved attempts refuse cleanly). Results
    and pins: the brief's "Stage 1 handoff"; the delegated pick, for
    Levi to review if they want:
    `.claude/probes/K74/out/K74_stage1_before_after.png`;
  - stage 2 MERGED in 4dee276..30a949a (2026-10-14 16:13; it deploys):
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
  - branch: mainline; last commit: `30a949a`.
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
  `docs/design/K80_gameplay_additions.md` section 0, 2803a0b). The
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
  - stage 1 MERGED in 63a4d42..113ae4d (2026-10-13 23:11; deployed): the
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
  - turns stage 1 MERGED in 81892d4..0036d03 (2026-10-14 15:19;
    deployed): the turn-aligned minotaur behind `minotaur` (`mt`: off |
    hunter | guard | stalker; off by default) and eight tuning params
    (`msp mtg msi mro mtr mac mpa msl`; codec v5 108-116), in
    `src/game/minotaur_turns.ts`, an exact port of the research harness
    (0 trace mismatches in 9600 games). One accepted tap is one turn, a
    tap on your own junction waits, a catch respawns you at that tap,
    there is no undo (Reset path restarts), and a first-look telegraph
    draws a red line and a ring (`drawTelegraph`). 865 tests. Its catch
    rates on today's mazes are K269, its residuals K270-K272.
  - turns stage 2 MERGED in 40f74d1..dea013f (2026-10-14 18:50;
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
  - branch: mainline; last commit: `dea013f` (turns stage 2 is
    40f74d1..dea013f; its worktree
    `.claude/worktrees/agent-a1579d5c460af2d20` is kept). Turns stage 1
    is 81892d4..0036d03, real time `113ae4d`, K174 52a4e53..f258161.
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
  - 3a and 3b MERGED in 737ac58..63a4d42 (2026-10-13 about 21:50; sonnet
    agents a262df65dcc1489a7 and a957f7f1407f5df9f, desktop dry runs
    only). 3c MERGED in d9f3f0b..9ab8a01 (2026-10-14 01:46; sonnet agent
    a595ec530724dbba1, on the phone): the A/A smoke test, `-WaitReady`
    (K171 b: a read-only check every 3 min, two ready in a row start the
    pass; `retry_quiet.ps1` waits up to 240 min), the tracked noise floor
    (landscape then, now `noise.landscape.json` beside K253's portrait
    floor), defaults `-Moves 0,7,13` and `-LoadSeconds 30`, clean-origin
    looks, and the round's new looks. Its worktree is kept.
  - the round pass of 2026-10-14 01:55-02:20 (base af88b89, head
    d402ade = f054bbb's code; 3 reps, landscape, no watchdog trip):
    every at-rest cell (fabric at 0, 7 and 13 moves, knot) is within
    noise. Load: the longest frame fell 684 -> 167 ms (`?b.J`) and
    667 -> 150 ms (`gs=18`); first sleep rose 8.0 -> 19.3 s and
    9.3 -> 22.5 s, fps fell 46 -> 41 and 44 -> 35, p95 33 -> 50 ms, and
    `gs=18`'s frames over 50 ms 48 -> 84 (K197). Looks: all 18 ran on
    head (base lacks the new features).
  - round 2026-10-14b's pass, 10:12-10:42 (base d402ade, head f2fc583,
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
    `storage` field and the walk's `pick` option merged in c427d7c..ab66f7d
    (10:50).
  - round 2026-10-14c's pass, 18:53-19:37 (base f2fc583, head dea013f,
    portrait; merged 772e48a..e1c2a80 at 19:48): K279's looks hold 60 fps
    through a tap, with no first-tap stall and under 1% of the frame
    flashing (K289), and `ptg=0.3` wakes the knot for 3-5 s at 5-12 fps
    (K279); K268's shaped-gaps census shows 0 mismatches on the PowerVR
    (K287); k140's confetti held 60 fps on head (base 54, but the two
    builds made different mazes from `?b.J`). Frames, K98 and K92 (K230)
    and the 14 dropped looks did not run: the window went to K253's A/A,
    which tripped at 19:37:05 on Levi's touch. `summary.mjs` now records
    each cell's pairs and marks a stopped A/A partial (97c93df).
  - owner: nobody since 2026-10-14 19:45 (round 2026-10-14c's agent
    a04122e6bc4e56b02 (sonnet) finished; worktree kept). Round
    2026-10-14b's agent ad24cee1cd83ebe88 ended 10:47; worktree kept.
  - branch: mainline; last commit: `e1c2a80`.
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
  - brief: `docs/design/K156.md`, "Round 2026-10-14c handoff" (e1c2a80);
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
  until the exit is seen); and, at Levi's suggestion, fog and the reveal
  are the options of one `exploration` dropdown (off | fog | threads),
  which replaces the fog toggle in place (pre-launch, no back-compat).
  Design: `docs/design/K76_reveal_mode.md` (714d724); contact sheet
  `.claude/probes/K76/out/contact.html`. After K81. It must build the
  mode as a separate shader variant: compiled in, it costs mode-off
  frames 2.3 -> 2.8 ms on the desktop (measured while two of K74's CPU
  scans ran; re-time).
  Stage 2 runs in four stages, 2a to 2d, each from the handoff before it
  (`docs/design/K76.md`, 7538ac9).
  Stage 2a merged 2026-10-14 14:15 (`fc81a66..1b8d49f`, 835 tests):
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
  Stage 2b merged 2026-10-14 16:04 (`a2bd3ca..59a107f`, 880 tests): the
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
    (aea102de995e1ce30; its prototype WIP is 9fd1e80 and 82dbdb1).
  - branch: `worktree-agent-a58040d5b7b031c80` (`.claude/worktrees/agent-a58040d5b7b031c80`, from
    2014dd0); last commit: `2014dd0` (master) until its first WIP commit.
  - evidence: `.claude/probes/K76/stage2c/` in its worktree; 2a's and
    2b's in the main checkout's `.claude/probes/K76/`.
  - next: stage 2c (the move-event feed, input and the camera, the
    `exploration` dropdown with codec 6, the K73 indicator, the intro,
    K257's and K286's recommendations, a census walk), its handoff, the
    merge; then K268 stage 2, K290 and 2d in turn.
  - brief: `docs/design/K76.md` ("Stage 2c", a7eb4a5), then
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
  2e341b0..f9ac1bc); stage 2 the fans, pluck-still, protect, the
  smooth-min, the underWindows and the caps (fading with their thread,
  K275).
  - owner: nobody since 2026-10-14 17:50 (stage 1 merged). Its agent
    ab65d913a3b9a3dcb's worktree `.claude/worktrees/agent-ab65d913a3b9a3dcb`
    is kept.
  - branch: mainline; last commit: `f9ac1bc` (stage 1 is
    2e341b0..f9ac1bc, rebased from 36fe894 on 4dee276; 921 tests).
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
    86a4f0f, docs and lore only); stage 2 waits for a code slot.
  - branch: mainline; last commit: `86a4f0f`. The local `k307-proto`
    (d1aefae) holds the throwaway prototypes and is never merged.
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
  The list is `docs/design/K80_gameplay_additions.md` section 4.

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
  Levi's short form: "Let's do all the M items".

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
  proposal, with Levi's direction at the top, is
  `docs/design/K46_daily_variety.md` (10edc14). Its probes are in
  `.claude/probes/K46/`, and the proposal agent's worktree
  (`.claude/worktrees/agent-a78c73cec4770a14d`) is kept. Pre-launch,
  the daily changes in place, with no `DAILY_V2` or `fromDay` (K132).
  Validation must use engine-exact math only (K108,
  `src/util/det_math.ts`). Today's trailLength default is 10, so
  memory-trail themes set 5 (K73). Brief: `docs/design/K46.md`.
  The proposal agent's worktree was removed 2026-10-15 (K161), its probes copied; branch `worktree-agent-a78c73cec4770a14d` kept.

## K78 (2026-10-15, shortened by the diet)

- **K78** · The Knotmaze handbook: algorithms, architecture, decisions
  and trade-offs, and a per-param reference with figures (the
  half-lattice units diagram first). Write it once the churn settles.
  Levi (2026-10-13): public; Markdown, later also posted on their Blogger
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
  The looks are in `docs/design/K339_panel_audit.md` section 5.

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
  `docs/design/K115_cursive_text.md`, 7e0fbf0). Its staged plan goes
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
  priority (Levi, 2026-10-13 13:30; their calls at 14:39 are verbatim in
  `docs/design/levi_notes_2026-10-13.md`; design
  `docs/design/K116_instruments.md`, 04ebd28). First the band skeleton
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
  Params `pvc`, `acc`, `acl` are daily-exempt.

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
  - K75 + K73 (7a6bba2) vs 8b703a9, 2026-10-13: 58.3-60.5 vs 58.3-60.5
    with flow, 60.3 vs 60.3 flow off, 59.3 vs 60.3 with `pv=trail`; both
    sleep at sim 5.0 s (wall 9-20 s is load noise)
    (`bench_2026-10-13_K75K73*.txt`). The bench now records a sample
    from a hidden tab (screen timed out) as null instead of crashing.
  - K83 (2c4c603) vs 7a6bba2, 2026-10-13: 60.3 vs 60 with flow, 60.3 vs
    60.3 flow off, 60.5 vs 60.5 with `pv=trail`, p90 16.7 ms everywhere;
    every run asleep by sim 5.0 s on both (`bench_2026-10-13_K83.txt`).
  - K79 stage A (ac18b5b vs ce59840, 2026-10-13 11:06-12:03, wireless
    adb): PASS. 60.0-60.5 fps, p50 16.7 ms, on both builds at default,
    `fw=0` and `pv=trail`, all 36 runs asleep; frames 0 px in fabric,
    knot, mist and none; vellum at `bgs=1` costs less than the phone
    resolves (about 0.18 ms/frame, +-2 ms); the panel row 16/16
    (`.claude/probes/K79/phone/results.md`).
  Rerun: `scripts/preview.ps1` per ref, `scripts/phone.ps1 -Ports ...`, `.claude/probes/K10/phone_bench.mjs`, with the knot asleep, the phone unlocked and cool (`dumpsys thermalservice` status 0). Numbers in `.claude/probes/K10/bench_*.txt`.

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
  should get new treatment"). K111 stage 4 (80042d9..169835a, merged at
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
  Held while Levi is away (claude-config edits wait for their approval).

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
  (`docs/design/K324_realtime_minotaur.md`, merged as 3841332): a
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
  and D9 (chevrons) waits until Levi sees stage 2.

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
  The stages are in `docs/design/K323_game_mode.md` (sections 4-5).

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
  rights reserved." (Levi set up the LLC and assigns this IP to it;
  LICENSE already names it); then Levi's art, icon and music credits, still
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

- **K262** · Two probe harnesses K132 (530dfdc) broke, both untracked in
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
  (c) done in 40f74d1..dea013f (K80 turns stage 2): K174's test runs on
  H1 mazes over mazes 100-119 x 6 seeds, and the turn rates were
  re-measured on them; (d) most skipped
  cuts hit a host self-crossing or a same-strand splice, so the dense
  heart and ring designs cut no bridges (a lever for stage 3 or 4); (e)
  H1 can shorten the optimal route (tree `1l6e`, 89.6 -> 78.3); (f)
  ad7f030's message says codec index 108; it is 117.
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
  (c) the short-run fade and (d) view 5 were done in 46115c6 (K111 stage
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
  cells, both in the default link's load (`?b.J`, base d402ade vs head
  f2fc583): p95 33.4 -> 50.0 ms (floor 0.1) and first sleep
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
  K156's next phone pass covers K92.

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

- **K197** · The phone's load settles later over af88b89..d402ade
  (K156's round pass of 2026-10-14): first sleep 8.0 -> 19.3 s, and
  over the first 30 s fps 46 -> 41 and p95 33 -> 50 ms, while the
  longest frame fell 684 -> 167 ms. K147's settle budget (23bccd4..b1897da)
  is in the range and trades frame time for settle time (its own phone
  measure: first sleep about 17.5 s); the likely cause, unconfirmed.
  To attribute: the pass's frames phase with `-Base 23bccd4~1 -Head
  b1897da`; then whether 19 s is acceptable is Levi's call.

## K190 (2026-10-15, shortened by the diet)

- **K190** · Unmeasured costs from K154+K169 (e03bbd2). The new hash
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
  - 2026-10-14: the white strip is fixed by K193 (d0bbfad..7b17da5: screenshots
    clip to the viewport). The portrait floor was taken by K253
    (installed 2026-10-14 21:24 in 54ef27a).
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
  Since K83 (21a525e) that Graphics draws only the win ring; the markers
  are SDF quads.

## K103 (2026-10-15, shortened by the diet)

- **K103** · Below 10 fps the fit camera, the move animation and the paint
  clock still slow down. The fit camera eases by a fixed fraction per
  frame (0.08 / 0.15), and `tickAnim` and the paint read the ticker's
  `deltaMS`, which Pixi caps at 100 ms. K96 (a24f104) moved only the
  follow camera onto real elapsed time. Making the fit easing time-based
  would change its feel at the refresh rate it was tuned on. The pluck
  overlay too (`tickPlucks(ticker.deltaMS / 1000)`): since K101
  (a913d58) a music note's string motion waits lead + latency for its
  scheduled sound, and below 10 fps it trails the sound by (frame /
  100 ms - 1) x that delay, about 0.15 s at 150 ms frames.
  The pluck overlay (`tickPlucks`) still slows down too.

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
  still moving), on both 70dbc6c and ade3537, so not K110's doing; maybe
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
  scale 2, the slider's new max (K129). K79 B merged with it (bbd71dc);
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
    folder (K156 stage 1, 46019dd). Callers that omit it still share the
    TEMP folder, and `diag_screenshot.mjs` still uses one fixed profile.
  `scripts/bench_frame.mjs` and `probe_gpudraw.mjs` default their Chrome profile to the OS tmpdir (found writing K8 G3-1's brief), and `scripts/preview.ps1 -Ref` needs `-Root <dir>` for a per-run folder.

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

- **K175** · K80's UI gaps (113ae4d): a queued tap has no visual; the
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
  `src/render` change since 4dee276 was K114's 157 lines in
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
  (b44a7d9, 89383c3, ac27a56, 255a287) exist only on the local branch
  `k279-stage1-prerebase`: re-cite them as 2600523; (k) the phone probe
  `k279_phone.mjs` reads `ripples` 1.9 s after the tap, so always 0. The
  phone pass (K156 round 2026-10-14c) closed (f), flash safety (under 1%
  of the frame changes in every look: no area guard), and (h) (every
  look 60 fps, the tug's wake measured); it saw no first-tap stall on
  the phone, so (a) and (i) are desktop-only. `docs/design/K279.md`
  ("Stage 1 handoff", "Wake follow-up"); `docs/design/K156.md` ("Round
  2026-10-14c handoff").

## K291 (2026-10-15, shortened by the diet)

- **K291** · CI: the deploy run of c6f15f9 (2026-10-14) carried two
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
  real time has no close-call or seen stats; (h) the messages of 3ef237e
  and 4a51942 say codec 121-122; the rows are 128-129.
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
  4274 at 54ef27a) says `halted` is "Cleared on regenerate", and the
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
  Meets K57 (the daily's exempt keys) and feeds K78's param reference.

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
  The comment at `daily_link.ts:153` still calls `hoverGlow` proposed, though K237 and K264 answered it.

## K117 (2026-10-15, shortened by the diet)

- **K117** · Repo visibility (Levi's notes, 2026-10-13;
  `docs/design/levi_notes_2026-10-13.md`). Levi: private later, on their
  word; they won't share it for a while. Done in d2adf8a: the panel's
  GitHub link is gone, `LICENSE` says all rights reserved (Snoring Cat
  LLC. holds them: f063f60, Levi 2026-10-13), package.json
  says UNLICENSED, and a push touching only the ledger, docs, `.claude/`,
  README or LICENSE skips the deploy (Actions minutes count against the
  plan once private; deploys used about 330 minutes in the last 7 days,
  and the free plan has 2,000 a month). Obfuscating the bundle: not worth
  it (answered 2026-10-13; it is minified and ships no sourcemaps). K122
  (the bundled packages' license notices) is needed either way. On Levi's
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
  - branch: `worktree-agent-a18f9a57206d9475d` (`.claude/worktrees/agent-a18f9a57206d9475d`); last commit: none yet (base `9b4f3e6`)
  - evidence: its worktree's `scripts/ledger_diet.mjs`, `docs/ledger_diet/map.jsonl` and `.claude/probes/K353/`
  - next: when it reports, apply the map to master at a quiet point (`apply --dry-run`, then `apply`, then `verify` against the pre-apply copy); tomorrow with Levi, the same diet for claude-config's and the other repos' ledgers, plus the claude-config side (the `rules/ledger.md` convention, a shared `tools/ledger.mjs`, the merge script closing items, a nightly hygiene job), filed in claude-config's ledger (Levi, 2026-10-15 00:05)
  - brief: `docs/design/K353_ledger_diet.md`

## K8 (2026-10-15, stage 1 merged)

- **K8** · G3: SDF ribbons drawn from one shared sample texture
  (`docs/design/G3G4_sdf_geometry.md`). Decided: flat caps on anchored
  tails, a 2x phone cap, today's fold pinch, and G1's GPU levers fold in.
  - owner: agent `a35a43cee74c92b93` (opus) of claude session d8031183, from 2026-10-15 00:13 (cap 02:13; docs only, ports 5880-5889)
  - branch: `worktree-agent-a35a43cee74c92b93` (`.claude/worktrees/agent-a35a43cee74c92b93`); last commit: none yet (base `9b4f3e6`)
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
    (`.claude/worktrees/agent-a58040d5b7b031c80`, from 2014dd0); last
    commit: `2014dd0` (master) until its first WIP commit
  - evidence: `.claude/probes/K76/stage2c/` in its worktree; 2a's and
    2b's in the main checkout's `.claude/probes/K76/` (sheets
    `stage2a/out/sheet/`, `stage2b/out/`); lore `render-explore.md`
  - next: stage 2c (move-event feed, input gating and camera, the
    `exploration` dropdown with codec 6, K73 indicator, intro, K257's
    and K286's recommendations, a census walk), its handoff, the merge
  - brief: `docs/design/K76.md` ("Stage 2c", a7eb4a5), then
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
  - branch: mainline; last commit: `f9ac1bc` (stage 1 is
    2e341b0..f9ac1bc)
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
  (off: its wake cost is K7's), quieter auto plucks. Stage 1: c6f15f9.
  - owner: agent `a910830b0197dd699` (opus) of claude session d8031183, from 2026-10-15 00:42 (cap 02:42; ports 5900-5909)
  - branch: `worktree-agent-a910830b0197dd699` (`.claude/worktrees/agent-a910830b0197dd699`); last commit: none yet (base `a59c74b`)
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
  (b44a7d9, 89383c3, ac27a56, 255a287) that exist only on the local
  branch `k279-stage1-prerebase`: re-cite them as 2600523; (k)
  `k279_phone.mjs` reads `ripples` 1.9 s after the tap, so always 0.
  `docs/design/K279.md` ("Stage 1 handoff", "Wake follow-up").

## K7 (2026-10-15, stage 4 merged, stage 5 started)

- **K7** · Physics in a Web Worker with render-side interpolation, so the
  intro runs at full frame rate while physics settles (K28). Levi's calls:
  K302. Stages 1-3 merged; stage 3 put the worker behind `phw` (7e0cdcb..6f1a519).
  - owner: agent `abee0faca59fb8636` (opus) of claude session d8031183, from 2026-10-15 00:48 (cap 02:48; ports 5796-5797; owns `main.ts`)
  - branch: `worktree-agent-abee0faca59fb8636` (`.claude/worktrees/agent-abee0faca59fb8636`); last commit: none yet (base `6f1a519`)
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
  - branch: mainline; last commit: `86a4f0f`; the local `k307-proto`
    (d1aefae) holds throwaway prototypes and is never merged
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
  - branch: `worktree-agent-a42c63c2db0401edb` (`.claude/worktrees/agent-a42c63c2db0401edb`, from `a203db4`); last commit: `a203db4` (master) until its first WIP commit
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
  - branch: `worktree-agent-aa60ed52201f75682` (`.claude/worktrees/agent-aa60ed52201f75682`, from `0810b6a`); last commit: `0810b6a` (master) until its first WIP commit
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
  desktop acceptance (eefdbc2..8d051ae). Stage 5: the phone, then the default.
  - owner: agent `adf244f47f53e8230` (opus) of claude session d8031183, stage 5 from 02:35 (cap 04:35; ports 5798-5799; owns `main.ts`; the phone first, under the phone lock); stage 4's worktree `abee0faca59fb8636` kept
  - branch: `worktree-agent-adf244f47f53e8230` (`.claude/worktrees/agent-adf244f47f53e8230`, from `8d051ae`); last commit: `8d051ae` (master) until its first WIP commit
  - evidence: `.claude/probes/K7/` (`stage3/`; `stage4/` with `k7_frames.mjs`, `k7_latency.mjs`, `run_s4.ps1`, `table_s4.mjs`, `k307/`, `ports/`); stage 5's in its worktree's `.claude/probes/K7/stage5/`
  - next: stage 5: the worker start gate, the phone pass (Design 10's criteria, plus touch latency), then `phw` on by default if it passes, K147's budget bypass and the lore; then K5 and K6
  - brief: `docs/design/K7_worker.md`, "Stage 5" and the stage 4 handoff's "For stage 5"

## K370 (2026-10-15, the phone numbers)

- **K370** · The worker's input latency (K7 s4): p50 105 ms on the daily, 70 on
  the knot (in-thread 285), against a 50 ms target. Measure each stage first
  (`k7_latency.mjs`); levers: newest snapshot while grabbed, more drag substeps.

## K8 (2026-10-15, G3-0 merged)

- **K8** · G3: SDF ribbons drawn from one shared sample texture
  (`docs/design/G3G4_sdf_geometry.md`, re-based by stage 1, 9c927ca..9b1e273). G3-1
  waits for K268 s2 and K290, G3-2 for the reveal chain (K76 2c to 2d).
  - owner: agent `af653fa7f942f2f1e` (opus) of claude session d8031183, stage 2 (G3-0) from 02:04 (cap 04:04; ports 5830-5839); stage 1's docs worktree `a35a43cee74c92b93` kept
  - branch: `worktree-agent-af653fa7f942f2f1e` (`.claude/worktrees/agent-af653fa7f942f2f1e`, from `028b1d4`); last commit: `028b1d4` (master) until its first WIP commit
  - evidence: `docs/design/G3G4_sdf_geometry.md`, `docs/design/K8_stage1.md` ("Stage 1 handoff"); stage 1's notes in `.claude/probes/K8/stage1/notes.md`; stage 2's in its worktree's `.claude/probes/K8/stage2/`
  - next: G3-0 (the capture/restore hook, the sample table, the frame bench, the pixel A/B, a phone pass if reachable), never alongside K90; Levi's calls are K361 (none blocks G3-0)
  - brief: `docs/design/K8_stage1.md`, "Stage 2 (G3-0)"

## K307 (2026-10-15, stage 2 launched)

- **K307** · The daily intro's freezes are cold shader compiles (Levi, K302 (8):
  prioritize). K7 s4's trace: GPU compile waits (bg-vellum's 190 ms queued behind
  12-15 small links); the worker can't hide them; its 6.1 s frame is gone.
  - owner: nobody since 2026-10-14 21:39 (stage 1 merged at 22:06; agent a119ffbc187f24aad (opus) of claude d8031183); stage 2 waits for a code slot
  - branch: mainline; last commit: `86a4f0f`; the local `k307-proto` (d1aefae) holds throwaway prototypes and is never merged
  - evidence: `.claude/probes/K307/` (`trace_intro.mjs`, traces, `builds/`, patches); K7 s4's traces in `.claude/probes/K7/stage4/k307/`; lore `.claude/rules/render-shaders.md`
  - next: stage 2, the warm-up (`program_registry.ts`, `shader_warmup.ts`, `__knotWarmup()`, a 15 s gate on `finishPresettle`, wave 1 then wave 2), not alongside K7 s5 (both edit `main.ts`); K366 rides it, and so do K268 s2's three explore variants (`render-shaders.md`); the phone's measures ride K156's next pass
  - brief: `docs/design/K307_intro_freezes.md` ("Stage 1 handoff", "Stage 2: the warm-up"); K7's in `docs/design/K7_worker.md` ("Stage 4 handoff")

## K290 (2026-10-15, stage 3a merged)

- **K290** · Burnt threads, a toggle (Levi, 2026-10-14): a `burnt` dropdown,
  gone (default: not drawn, under threads' gaps close, fans drop the arm) or
  char (a burnt coloring in the shader). Burn stage 3a; 3b is the front's FX.
  - owner: agent `adb9f09e19dfd0c55` (opus) of claude session d8031183, stage 3a from 03:27 (cap 05:27; ports 5820-5829)
  - branch: `worktree-agent-adb9f09e19dfd0c55` (`.claude/worktrees/agent-adb9f09e19dfd0c55`, from `0fd6282`); last commit: `0fd6282` (master) until its first WIP commit
  - evidence: its worktree's `.claude/probes/K290/stage3a/`; burn stage 1's `.claude/probes/K114/`
  - next: stage 3a: the param, gone through the explore VIS machinery reversed, char in the shader, a desktop sheet of both looks; then 3b (the front's char band and embers, the `burn` FX on `tipsAt`, the fuse, the fire's light under fog, the phone sheet)
  - brief: `docs/design/K114_burn.md`, "The stages" (Stage 3) and "Stage 1 handoff"; the stage 3a handoff once written

## K76 (2026-10-15, stage 2d launched)

- **K76** · Thread-reveal mode, stage 2 (Levi, 2026-10-13): `exploration`
  (off | fog | threads) and an end look, a separate shader variant. 2a-2c
  merged, so the mode is in the panel (off by default); 2d after K268 s2, K290.
  - owner: nobody since 2026-10-15 01:08 (stage 2c done; agent `a58040d5b7b031c80` of claude session d8031183; worktrees kept: 2c's, 2b `ac6e354b85922e7aa`, 2a `a5d63452980ed9fa3`, stage 1 `aea102de995e1ce30`)
  - branch: mainline; last commit: `a203db4` (2c is `fe4994a..a203db4`)
  - evidence: `.claude/probes/K76/stage2c/` (2a's and 2b's beside it); lore `render-explore.md`
  - next: stage 2d ("For stage 2d": High contrast dots, the census on K268's shaped slots, the held frame, step 8's phone gate and GPU, the final sheets) after K268 s2 and K290; Levi's calls are K362
  - brief: `docs/design/K76.md`, "Stage 2c handoff"; design `docs/design/K76_reveal_mode.md`

## K7 (2026-10-15, stage 6 merged)

- **K7** · Physics in a Web Worker with render-side interpolation (K28; Levi's
  calls K302). Stages 1-5 merged (stage 5: 5913b95..35542e7, the start gate and the phone
  pass, which missed only the 250 ms gate). Call F6: the default anyway.
  - owner: agent `a6023a3244ff623cc` (sonnet) of claude session d8031183, stage 6 (the flip) from 03:49 (cap 04:49; ports 5850-5859); stage 5's worktree `adf244f47f53e8230` kept
  - branch: `worktree-agent-a6023a3244ff623cc` (`.claude/worktrees/agent-a6023a3244ff623cc`, from `9882a38`); last commit: `9882a38` (master) until its first WIP commit
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
  - branch: mainline; last commit: `fd5c6be`
  - evidence: `.claude/probes/K5/design/` (eight region maps of main.ts and ribbon_renderer.ts)
  - next: stage M1 once K7 stage 5 merges (re-map main.ts first), then section 5's stages: M1-M8, and R1-R5 (R1 after G3-0 merges); section 6 orders them against the queue
  - brief: `docs/design/K5_K6_split.md`, "7. Stage 1 brief"

## K307 (2026-10-15, stage 2 merged)

- **K307** · The daily intro's freezes are cold shader compiles (Levi, K302 (8):
  prioritize). K7 s4's trace: GPU compile waits (bg-vellum's 190 ms queued behind
  12-15 small links); the worker can't hide them. Stage 2: the warm-up.
  - owner: agent `a11d7ce60428b687d` (opus) of claude session d8031183, stage 2 from 03:55 (cap 05:55; ports 5830-5839)
  - branch: `worktree-agent-a11d7ce60428b687d` (`.claude/worktrees/agent-a11d7ce60428b687d`, from `4dee252`); last commit: `4dee252` (master) until its first WIP commit
  - evidence: `.claude/probes/K307/` (`trace_intro.mjs`, traces, `builds/`, patches; the local branch `k307-proto` (d1aefae) holds throwaway prototypes, never merged); K7 s4's traces in `.claude/probes/K7/stage4/k307/`; lore `.claude/rules/render-shaders.md`; stage 2's in its worktree's `.claude/probes/K307/stage2/`
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
  - branch: `worktree-agent-adbaac6a024e6d144` (`.claude/worktrees/agent-adbaac6a024e6d144`, from `7e3881d`); last commit: `7e3881d` (master) until its first WIP commit
  - evidence: `.claude/probes/K76/stage2c/` (2a's and 2b's beside it); stage 2d's in its worktree's `.claude/probes/K76/stage2d/`; lore `render-explore.md`
  - next: stage 2d: High contrast dots, step 8 (the phone gate, GPU per program, the final sheets), the census on K268's shaped slots, the held frame; the start zoom stays Levi's (K362)
  - brief: `docs/design/K76.md`, "Stage 2c handoff" ("For stage 2d") and "Stage 2d launch notes"; design `docs/design/K76_reveal_mode.md`
  - env: the phone: `scripts/phone_pass.ps1`, under the phone lock (`.claude/probes/agents/phone_lock_take.ps1`)

## K5 (2026-10-15, stage M1 merged)

- **K5** · Split `main.ts` and `ribbon_renderer.ts` along K1-K3's data lines,
  with seams so G3 becomes a module swap; K6 rides it. Design merged:
  `docs/design/K5_K6_split.md` (its calls: K377). Stage M1 running.
  - owner: agent `a871cd9d98d4f1bf0` (opus) of claude session d8031183, stage M1 from 04:46 (cap 06:46; ports 5840-5849); the design's worktree `aa60ed52201f75682` kept
  - branch: `worktree-agent-a871cd9d98d4f1bf0` (`.claude/worktrees/agent-a871cd9d98d4f1bf0`, from `03dcfdf`); last commit: `03dcfdf` (master) until its first WIP commit
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

## K309 (2026-10-15, shortened by the diet)

- **K309** · Check K299's ring-lap fix on the phone: PowerVR rounds
  float division its own way, and only the desktop GPU was checked. In
  K156's next round: Levi's link `?qoietk.KSIeBoGlf4-` at node_2 and the
  seam cases of K299's A/B. `docs/design/K299_choice_pulse_bug.md` ("Not
  done").

## K416 (2026-10-15, shortened by the diet)

- **K416** · `docs/design/K5_K6_split.md` is stale beyond §2.3 (R1 updates its table): §1.3's
  line ranges are from 0810b6a; the strip block gained `sectionProgram`, `sameBurn`, `sameSpans`;
  §5.1 misses pins (PROGRAM_SITES/RIBBON, `paint_explore.test.ts` reading the source,
  `paint_ring_lap.test.ts`'s non-recursive scan); the sequencing text (§5.3, §6) is stale;
  `__knotRenderer` now lives in `src/app/probe_hooks.ts` (K5 R1 brief).

## K417 (2026-10-15, shortened by the diet)

- **K417** · The R lane vs the probes: about 80 probe files call the sampling helpers through the
  renderer (renderCtrl 30, paintArcAt 18, sampleAtSafe 17, sampleAt 15), so R1's façade forwarders
  stay while those probes live; probes that read or edit `ribbon_renderer.ts` by path break once
  code moves (K76 2d and K290 3a `dump_variants.ts`, `variant_build.ps1` in `g2/` and `K4/`,
  `K154_K169/edit_rr2.ps1`, `edit_rr3.ps1`). Fix each when it next runs (K5 R1 brief).

## K285 (2026-10-15, shortened by the diet)

- **K285** · Citation details K277 left out until a record confirms
  them: Jakobsen's venue, Müller et al.'s volume and pages, Jaffe and
  Smith's pages, the Elias DOI and the editor of Perlin's course notes.
  `docs/design/K274_K277.md` ("Stage 1 handoff").

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

## K213 (2026-10-15, shortened by the diet)

- **K213** · Before K90's bend bound ships (if Levi ships it): the min
  regression (the hard clamp tightens the worst window in 24 of 585
  scans, the soft one in 4; done when `k90_minrows.mjs` reports 0),
  `controlArcLengths`, unit tests and a CPU mirror, hit tests on the
  moved samples, the phone's rebuild cost (`docs/design/K90.md`, Stage
  1b handoff).

## K207 (2026-10-15, shortened by the diet)

- **K207** · Fixed in 16b1c56f (2026-11-03): fog stamps are deduped
  spatially, so the list stops growing within a solve, and a walked-back
  path keeps its first walk's clearing (softer edges, a bit tighter).
  Open: keep the new look or clear more (LEDGER.md K207;
  `docs/asks/K207.md`).

## K205 (2026-10-15, shortened by the diet)

- **K205** · K120's leftovers (`docs/design/K120.md`): the follow camera
  doesn't keep the dot clear of the move pad (a camera inset, K148's and
  K149's area); the maze is small at the phone's fit zoom; a toast at
  411 px wide can briefly overlap the pad; clicking the panel's empty
  area and then pressing an arrow moves in the maze instead of scrolling
  the panel; in principle a hold could loop around a cycle of runs that
  all match its key (not observed). Probe gotcha: alternately tapping and
  holding the best key can cycle forever.

## K196 (2026-10-15, shortened by the diet)

- **K196** · K180's crossings options at phone scale: `ride` and `pinch`
  leave most taps unreadable in the census (dense `ride` 93.8%, fabric
  `pinch` 71.1%); `through` reads best (`docs/design/K180.md`, "Stage 1
  handoff"; `.claude/probes/K180/`).

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

## K15 (2026-10-15, shortened by the diet)

- **K15** · During a reveal, a joint's fan can turn opaque while a fill
  beside it is still striped (K4 fixes it by construction). May be moot:
  G1 (99443cb) deleted the over-fills. Re-check fan vs base ribbon during
  a reveal.

## K27 (2026-10-15, shortened by the diet)

- **K27** · Plucks near junctions. Lobes inside a junction's fillet-web
  footprint (about 1 world at cr 3) keep their base intact, so they ring
  as a crisp thread with a halo rather than a blur, as crossing
  footprints already do.

## K112 (2026-10-15, shortened by the diet)

- **K112** · Motion setting residuals (K79, 4a89e63): no cross-tab sync
  (another tab picks a change up on reload; `src/ui/motion.ts`), and the
  camera's reduced-motion jump on an edge-indicator tap was
  code-reviewed, not probed.

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

## K188 (2026-10-15, shortened by the diet)

- **K188** · K140's residuals (`docs/design/K140.md`, "Stage 1 handoff"):
  `restartSolve()` leaves pieces in the air; the open desktop panel covers
  the spray when the exit is at the lower right; the rain takes 5.5-6.2 s
  to fall out, longer below 10 fps.

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

## K346 (2026-10-15, shortened by the diet)

- **K346** · The physics halt misses NaN: the check
  `Number.isFinite(maxMove)` (`src/physics/particle_system.ts`, about
  lines 2281-2287) only catches an infinite move, and a NaN displacement
  fails `d * d > max`, so a state that turns NaN without an infinite move
  never halts. Predates K7; found by K7's stage 2 (2026-10-14).

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
  918c929; store `knotmaze.panelOpen` "0"). `.claude/probes/K80/stage3/rerun/K120/`.

## K425 (2026-10-15, shortened by the diet)

- **K425** · Probes that read the section shader's source still read or edit
  `ribbon_renderer.ts`: `K290/stage3b/dump_variants.ts` (and its K76 2d and K290 3a
  copies), `g2/` and `K4/` `variant_build.ps1`, `K154_K169/edit_rr2.ps1` and
  `edit_rr3.ps1`. Repoint them at `src/render/ribbon/ribbon_shader.ts` when next used
  (R1's copy: `.claude/probes/K5/R1/dump_variants.ts`). A `variant_build.ps1 -Subst` on moved
  text must name the new file. K5 R2 (b88376c) moved the crossing and explore gaps to
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

## K255 (2026-10-15, shortened by the diet)

- **K255** · Fold K193's `wait_then_aa.ps1` (`.claude/probes/K193/`) into
  `scripts/phone_pass.ps1` as `-WaitQuiet`: it tolerates touches until a
  full quiet window can no longer end before a deadline, where
  `retry_quiet.ps1` only runs after a trip and gives up at the first
  touch that leaves less than a full window.

## K70 (2026-10-15, shortened by the diet)

- **K70** · A more dramatic hero settle (P2 polish): the splines round
  the lattice corners from the first frame, so the settle reads as a
  gentle tightening, not zigzags turning into curves. Blend the sampled
  positions toward the control polyline while settle progress is low
  (`docs/history.md`, Follow-ups).

## K113 (2026-10-15, shortened by the diet)

- **K113** · Two-layer vellum: render the fibers and grain once into a
  static texture (1 texel per CSS px) and drift only the mottling in a
  low-res pass; the drift pass costs about 2.1 ms at 1600x900 today
  (K79, `.claude/probes/K79/out/gpu_k79.log`).

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

K320 2b parity blocker: split stays dark; 2c must not start until the A/B is 0px (or K433 one-level). Diagnosis .claude/probes/K320/k550_diagnosis.md (probes `k550_*.mjs`). Session 1: the shipped mask row is off by one (`- 2 -` -> `- 1 -` = the `gapMaskTexel` twin; def 40,829 -> 12,353). Session 2 (finisher): the row fix + a three-keep mask (owner / under / deep gap passes, chain+arc-turn fragment identity in mask B) solves the stacking AND the dominant same-chain double-coverage term (def 12,353 -> 5,603, darker 6,246 -> 714; fat 6,789, user 3,051, knot 6,773; explore unmeasured - its single-capture control is 36,252, needs the K428 multi-capture form). WIP preserved uncommitted in `.claude/probes/K320/k550_two_keep.patch` (`git apply`-verified on c381a81; tree left at HEAD). BLOCKER for the flip: MSAA sample coverage - canvas edge fragments (`>=` 1 sample, center-extrapolated varyings) are never recorded by the center-rule mask and paint at 1.0; temp `antialias: false` collapses def to 2,020 / gt1 343, and even that floor fails the brief's gt1 = 0 gate. No exact fix exists in this architecture (WebGL2 cannot sample an unresolved MSAA target; expansion/SSAA measured worse). Levi's call: waive the gate for 1-px edge diffs via the brief's contact sheets, or kill the split and keep Stage 1.

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
## K525 (2026-10-20, shortened)

The minotaur's telegraph (Levi 2026-10-20): a treatment dropdown (a param appended to the codec)
whose new default lights the run's rims the way the hover highlight does, with today's line kept as
an option; roam must read on the phone at fit zoom (the line: about 0.7 on touch, 0.45 on desktop,
hunt 0.95); K546's first phone sheet shows roam, a catch and the fog glow together. Today:
`.claude/probes/K80/stage3b/contact_sheet_real.png` (K524).

## Next free ID line (2026-10-26, shortened)

The history that had accumulated after the ID on the ledger's Next free ID line, verbatim:

(K865 = SDF union-field border prototype (option C scoped to junctions, behind ?rp=sdf&sfb=1) - brief docs/design/K865_sdf_field_border.md; K864 = K862 follow-up: cosine-warped rim sampling (rendered tip chord sin p90 0.161 -> 0.024) + per-side junction side-cut windows (merged window cut the lesser side past its tip); K862 = G1 fillet rims at the flank tips, split through the old corner midpoint; K863 = cursive clean slate, pen-order strokes.) (K857 = borders still crossing junctions, across the joining thread's end - Levi, by 2026-10-23, after K854; in In progress.) (K854 border-mode junction outline, measured: side-cut window now reaches the flank tips, rims solid and straddling; interior strokes at the three probed 4-arm junctions -36/-32/-46%, SDF path also improved - see Done. Residuals there.) (K853 loader spin mode + speed cap: codec-appended loaderMove "spin" (centroid pinned at screen centre, knot turns around it, marker directly below it); loading-speed max 3 -> 9 (Levi: x3) - see Done.) (K852 loader motion + loader-only params: codec-appended loaderMove "above" + loaderGap/loaderThreadWidth/loaderThreadColor/loaderBgColor/loaderIndicatorSize/loaderFill/loaderTrail; the loader's look no longer borrows the maze's gap/threadWidth/pathColor/backgroundBase; defaults reproduce the pre-K852 drawing bit-for-bit - see Done.) (2026-10-23: K847 cursive rethink: a re-silhouetted as a single-story cursive a (apex top-right, proven shipped segment proportions, integer tangents, lint-clean), i entry one sweep (arrival hin 4->3, entry hout 1.5->1.6 of LOW), flares longer (a 30->46, i 34->50 GU) with cosine falloff; stills .claude/probes/K847/after. K846 border junctions: junction side cut (ribbon edges hand over to wedge rims at every junction arm, both ribbon programs; entries from the joinery's drawn wedges via RANGES segment space) + tangent-continuous cubic fillet rims; glyph junctions keep one joinery arm each so they are unchanged there (taper/cap machinery, K847+). K844 look-chip same row as dropped badge, left vs right (5bb339e3, revises K837); K845 hint draws a set distance (HINT_DISTANCE 6) along the route, spilling past short runs.) (2026-10-23 night batch: K836 cursive-a tangent attachments + landTangent (791a4f4b); K837 look-chip offset (9477616a); K838 hint lasts until the move + one at a time, codec v9 (7f683b43); K839 Show-shortest-path checkbox (3199c9af); K840 fragile ends break (0484e32f); K841 loader follow unwraps continuously (952e37b9, c62ea5f0); K842 overlays dive under crossings (8c82ff73); K843 junction flares (387c373a). (K828 loader params + keep-loading preview; K829 taper lean (K718 call 1); K830 corner share slider; K831 a/i letterform redesign; K832 SDF/junction residuals; K833 border junction disc rims + semicircle dead-end caps (f99d4693); K834 intro chrome gating on loader persistence + reset confirmation (d5aefd25); K835 path irregularity + excursion sliders (16689838); K831 dot ellipse (e6b5f96e).) (K812 preview effect buttons; K813 border-look highlights; K814 shape-injection param collection; K815 junction border fans; K816 SDF ribbons; K817 gap kStart rounding (K592); K818 shape-injection collection (K814 stages 1-3); K819 cannonSpread param + LOOK_KEYS backdrop/path colors; K820 borderWidth/borderColor/goldTextureStrength params (uKBorder, uKLook.w, uKHlPulse.w); K821-K822 panel restructure (Maze before Game; End effects, Text & emblem, Exit traps, Exploration, Burn race, Classic rules subfolders; Thread look above its rows; Path color beside the gold rows).)

## K867 (2026-10-26, shortened)

- **K867** · Pluck sound "out of tune" on local test links is the LEGACY synth fallback, not a regression (Levi 2026-10-26). AudioWorklet (the sample-exact harp, knot_synth.ts) requires a secure context; plain-HTTP Tailscale/LAN links (<desktop tailnet IP>, <desktop LAN IP>) are not secure, so ctx.audioWorklet is undefined and the synth falls back for the whole session to the legacy native-node KS loop - the voice knot_synth.ts documents as transposed down up to ~-1600 cents. Measured: engine_check2.mjs - 127.0.0.1 -> harp, <desktop tailnet IP> -> legacy, same build. No audio/physics/geometry diff vs master; physics hash unchanged (733ee14a). Production (https levi.dev) and 127.0.0.1 (incl. phone via scripts/phone.ps1 USB tunnel) get the harp.
  - owner: agent (2026-10-26)
  - status 2026-10-26 (later): (b) DONE (Levi picked b). pluckLegacy is now an in-tune oscillator course: two PeriodicWave oscillators (Jaffe-Smith pick-position comb spectrum) detuned by the shimmer amount, sweeping lowpass, the harp T60 curve, same buses/pan/future teardown. Verified: unit pin (oscillators created at the exact pluck freq, +-1.2 cents course; test/audio/knot_synth.test.ts, 17 green) and offline-render measurement in Chrome (.claude/probes/K862/legacy_pitch.mjs + probe_legacy.html): fundamentals within +-1 cent at 110/164.81/220/261.63/440/659.25/880 Hz (the KS loop measured up to ~-1600). Notices research mark kept (the comb is still Jaffe-Smith). Full suite green after the mark fix. NOT committed.
  - next: Levi pick: (a) accept (test with localhost links / phone tunnel); (b) harden pluckLegacy into an in-tune oscillator voice so insecure contexts degrade in timbre, not pitch (verify via the offline render harness, knot_synth.ts diag). NOT committed.
  - status 2026-10-26 (Claude coordinator): parked as 5ae5a1d1 on the desktop-only branch `park/muse-2026-10-26`. The 5319 server that served Muse's build stopped with all of Muse's processes (Levi's request). To judge the timbre, run `pwsh scripts/preview.ps1 -Port <p> -Ref 5ae5a1d1` and open it from the laptop or phone over plain HTTP (a Tailscale or LAN address, not localhost), so the fallback voice plays.

## K866 (2026-10-26, shortened)

- **K866** · Global union-field border (Levi 2026-10-26: windowed K865 still leaves butt notches, border lines across branch mouths, short-arm caps, dead-end mismatch, arm/segment misalignment - "take a different approach"; go given). Design: ONE field owns every border stroke: render/fabric_border.ts packs every fabric centreline segment into grid tiles (FloatRows, JSEG-shaped); a tile-quad layer evaluates F = min dist - threadHalf everywhere; ribbons and junction fans draw NO border under uFbd (fabric_sdf setFbd; gates in ribbon_shader, ribbon_sdf, junction_field). Capsule ends exist only at true chain ends, so dead-end rounds are the same field. Flag ?fbd=1 (scene.ts), sfb path untouched.
  - owner: agent (2026-10-26)
  - branch: mainline
  - status 2026-10-26: built; npm run build clean; packer/oracle gates in test/render/fabric_border.test.ts (tile-local field == brute-force global field; T-junction mouth inside the union; caps only at chain ends); k320 char budgets bumped +235 with the K866 note; program registered (fabric-border). A/B/C probes running (.claude/probes/K862/fbd_shot.mjs: off/sfb/fbd at junctions 123/49, sim-locked hashes).
  - status 2026-10-26 (later): WORKING. Two-field cover rule: the fragment splits the field into under-marked segments (chainWins tight slot windows, code -(slot+1)) vs rest; an under border draws only where the rest centreline is farther than the casing half (the fills gap-mask cover as a field property). Segments near chain endpoints (junction nodes) are exempt from marking - the junction union owns its disc. Band half is look-aware (thread half in border look, casing half in fill looks). Sim-locked crops: junctions 123/49 fused with continuous borders, dead-end round is the same field, fill look band sits on the casing edge (.claude/probes/K862/fbd_shot.mjs, fbd_only.mjs, tip_fbd.mjs; Drive fbd_border_j123/j49, fbd_fill_j123, fbd_tip_border). Desktop settled fps parity (11.8 plain vs 12.3 fbd, mid-settle rAF, this machine only). Residuals: emergent crossings are unmarked (border wraps them union-style); look switch while asleep may lag a rebuild; phone fps unmeasured. Suite 2,346 green. NOT committed.
  - next: Levi: A/B/C crops + test link (?fbd=1 vs ?sfb=1 vs plain, tlk=border); crossing-gap residual and phone fps still to measure before any default-on talk. NOT committed.
  - status 2026-10-26 (artifact hunt, Levi: "lots of issues" on the Drive crops - confirmed by direct inspection): five causes found and fixed in fabric_border.ts/ribbon_renderer.ts. (1) Tile quads overlapped by reach; a foreign tile's subset could draw band pieces the own tile suppressed (the fleck/blade class, tile-straight edges, apparent curve steps) - quads now exactly their tile. (2) Junction mark exemption was a 3x3-tile neighbourhood (~1.4 ctrl around every endpoint), un-marking ordinary crossings near junctions - now per-chain own-endpoint radius (casingHalf+half); through chains keep marks. (3) Crossing marks were placed by uniform-spacing arc; now by true arc (arcCum: cumulative chord rescaled to totalLength). (4) Field arm tips were the ribbon-tucked samples, short of the node; now extended to fusedJunction/maze-junction centroids (nodeOf snap). (5) Suppression triggered on ANY rest thread within the gate, over-erasing in dense weave; now paired: under segments -(slot+1) hide only where their own over pass +(slot+1) (renderer tags over arcs via slotOverChain/slotOverArc + tangent sin) covers, rest-field fallback; node discs re-coded 10000 (slot codes share the texel); gate = half + bandW*0.75 + node-proximity boost (bdN). A solid-silhouette mode was tried and reverted (misread of master: its bands are edge bands + paint interiors). Verified: hash-locked (733ee14a) off-vs-fbd crops at 123/49/tip (cmp_hash.mjs; Drive fbd2_*), shard shrunk to a sliver, centre debris reduced, arcs smooth; suite 2350 green (3 new packer tests). RESIDUALS: dense-weave choppiness (49/tip: short under pieces read as chips - outline suppression still eats more than ribbon bodies do); small debris/beaks at junction centres; fill look shows a white fringe between ribbon fill and the casing band; phone fps unmeasured this round; DIAG hooks (__fbdChains/__fbdPacked/__fbdHalf/__fbdDebug, renderer DIAG-FBD) still in tree. NOT committed.
  - next: Levi verdict on fbd2_* crops + link; then either (a) interior/paint parity for the field (fill the silhouette with the section colour like ribbons, band on top) to kill the chip read, or (b) accept sfb as the junction answer and retire fbd. NOT committed.
  - status 2026-10-26 (plan steps 1-2, Levi "do it"): step 1 done in corrected form - master's interiors measured hollow (BG-valued), so NO interior fill (would deviate); the chip cause was branch-by-nearest: over-band pixels nearer the under centreline took the under branch and were suppressed. Both fields' bands now evaluate independently, stronger wins. Node discs no longer feed bdR (they drew rings once both bands evaluated); bdN only. Pairing redone GEOMETRICALLY in the renderer (nearest other chain through the window centre; slotOver* tables are overwritten by later solves and mis-tagged arcs by ~5 ctrl - the ring cause: window-end caps of marked stretches at shallow crossings). Paired gate widened by (half+W)*0.9 (ribbon cut is by arc; caps bulge laterally past any centreline gate). Interior-fill parity skipped by measurement. Result: hash-locked crops Drive fbd3_* (123/49/tip vs master): rings gone, dense weave continuous, dead-end junction fused with rounded lobes, arcs smooth. New visible difference: sub-width centreline loops (twist eyes) render as outline donuts where master's self-overlapping ribbon mesh reads filled - geometrically honest, Levi to judge. Step 2 (fan polygons in field + chain-id smin mouth rounding) NOT done: remaining centre debris is now small (tiny flecks at 2-3 spots/crop, small mouth points); smin needs a chain-id texel (layout change) - do only if Levi flags mouths after this round. Suite 2350 green. DIAG hooks still in tree. NOT committed.
  - next: Levi verdict on fbd3_* + link; if mouths flagged: chain-id texel + node-local smin; then fps (phone), DIAG cleanup, default-on decision. NOT committed.
  - status 2026-10-26 (presentation correction, Levi: "it's worse"): Levi was right - at full frame the outline presentation (bands at thread silhouette 0.8 wide) reads fat/wormy vs master. Measured master properly this time: border look = SOLID centreline band, total width ~0.17 ctrl = borderWidth*casingHalf (fans' bandSpan), flat-cut at crossings, ABSENT at junctions (every node an empty hole - the original complaint). fbd now renders exactly that band as a union in border look (solid mode: sHalf = borderWidth*casingWidth/4, gate base sHalf+0.1, wide term sHalf): same weight as master (dark frac 0.186 vs 0.130; the delta is the fused junctions + continuous under bands, i.e. the point), fused at nodes, rounded dead-ends. Fill looks keep the casing edge band (white-fringe residual stands). Hash-locked Drive fbd4_* (full frame + 123/49/tip, master vs fbd) + cmp_full.mjs. Tests: fabric_border/k320/thread_look/program_registry 23 green; full suite not re-run this round (last full 2350 green before solid mode). Residuals: 1-2 tiny flecks per crop; donuts gone in border look (solid fills loops like master); fill-look fringe; phone fps; DIAG hooks. NOT committed.
  - next: Levi verdict on fbd4_* + link. If accepted in principle: full suite, phone fps, fill-look fringe, DIAG cleanup, default-on decision. NOT committed.

## K865 (2026-10-26, shortened)

- **K865** · SDF union-field border prototype (research option C scoped to junctions; brief: `docs/design/K865_sdf_field_border.md`).
  - owner: agent (2026-10-24)
  - branch: mainline
  - evidence: `.claude/probes/K862/research_fusion.md`, `docs/design/K865_sdf_field_border.md`
  - verdict 2026-10-25: full C built (ribbons evaluate the union field in junction windows, fans the same band) but MEASURED A VISUAL NO-OP: settled/drag/fat(tw1.1)/high-cusp(cr6) zoomed A/B at junctions are pixel-identical (junction 123 zoom diff = 0 px; all 933 changed px in the cr6 crop sit under the start marker; all 784 flank tips covered with sfb off). K864's cosine-warped rims already trace the curve the field computes. Levi confirmed no visible difference on the test link. RECOMMENDATION: do not default-on; keep dormant behind ?sfb=1 or remove. The originally reported fillet gap is NOT reproduced in any state tested on the current build - if it persists for Levi, need the exact design (seed/params) or a screenshot from their device. Suite 2,339 green at build time. NOT committed.
  - CORRECTION 2026-10-26: the no-op verdict was an artifact. The JSEG FloatRows were never flushed (g3List omits them; only first-bind data ever reached the GPU), so every A/B compared the rim fallback against itself - and two probe generations compounded it (stale crop filenames, wheel-zoom at unmatched scales). Fixed: g3FlushNow also flushes jsegRows. Post-fix, sim-locked A/B (__knotStepUntil, identical physics hash) at junctions 49/110/123 shows sfb=1 fusing junction outlines into the continuous union contour where sfb=0 ends strands at cut windows (.claude/probes/K862/zoom_servo3.mjs, sv3_* crops). Research math was right; the implementation never delivered the field to the GPU. sfb stays behind ?sfb=1 pending Levi's look + phone fps; cover discs (aFlank 6) replace wedge fans under sfb. Suite 2,339 green. NOT committed.
  - fixes 2026-10-26 (later): Levi: junction branches showed CLOSED ROUNDED ENDS inside adjacent segments, and dead-end tips lost their rounds. (1) Arm polylines now run past the flank reach, beyond the cover-disc rim (sampled along the arm to min(domain, coverR + fillHalf)) - the capsule cap lands outside every region evaluating that record, so branches leave junctions open. (2) The fan field branch only trusts recs inside the JSEG header region (rec < uFieldBorder.w): free-tip cap fans carry record bases past it, where jsegAt reads segment texels as a header and the field ate the cap. Verified: tip crops (border + fill) show the round cap with sfb on; junction 123/110 crops re-shot. Suite 2,344 green. NOT committed.
  - fixes 2026-10-26 (later still): Levi: branch arms read FATTER than adjacent segments, branch-arm border ends misalign with segment border ends, and SHORT-segment branch arms still show round caps. Root causes: (1) the union was a polynomial smooth-min (k=0.12), which dilates every surface by up to k/4 past the ribbon width - the field silhouette is wider than the ribbon it must meet at the window edge, so arms printed fat with a step at the seam; jFieldAt now takes an exact min (sminPoly GLSL + sminPolyCpu removed; field_border.test mirrors the min). (2) The arm polyline extension was capped at the segment domain, so on short arms the capsule cap sat inside the disc and drew mid-arm; cap removed (armAt follows the chain past the next joint; steps retargeted to ~0.15 world spacing, cap 40; JSEG shader loop cap 192 to 256). Re-shot sv3_123/49 + tip crops. NOT committed.
  - next: Levi: look at sv3 A/B crops + test link (?sfb=1, tlk=border and default look); decide default-on (needs phone fps check) vs keep flagged. Open: field segments lag one rebuild behind fans during drags; JSEG repack cost per rebuild unmeasured on phone.
  - brief: `docs/design/K865_sdf_field_border.md`

## K864 (2026-10-26, shortened)

- **K864** · K862 follow-up (Levi 2026-10-24: curve match still off in places + gap between fillets and thread). (1) Rendered kink: the G1 rim's uniform 16-step polyline kinked at the tips (settled seed-3 chord sin p50 0.083 / p90 0.161); rim samples are now cosine-warped to the tips (same curve; joinery flankArr warped to match) - p50 0.013 / p90 0.024 / max 0.035, gated in `test/render/rim_curve.test.ts`. (2) Detached fillets: each arm's two side-cut windows were merged into one, so the side needing the longer cut (shallow wedge) cut the other side's border far past its flank tip; windows are now per-side (`joinery.ts` packs chain-left/right extents in lo/hi, `fabric_sdf.ts` kJunctionSideCut decodes per side; slim budgets bumped). Classifier (unsettled protocol): j49 599 -> 607, j110 794, j164 565 -> 567 - no interior regression. At-tip stroke coverage on the settled build is complete at band scale (0/784 tips); the remaining breaks past tips are crossing windows (weave-correct) and fan gap-mask fades. Full suite 2327 passed; build clean. Probes: `.claude/probes/K862/gap_*`.

## K863 (2026-10-26, shortened)

- **K863** · Cursive clean slate (Levi 2026-10-24: K850/K861 attempts rejected, "start over with a clean approach"; general systems researched first). Proposal: pen-order stroke itineraries per glyph (no body+spur branches), fairing solved offline and baked to integer cubics, no flares/taper roots for a/i, touch points as joins; baked swept outline only if seams survive. Design + gates + three calls for Levi: `docs/design/K863_cursive_clean_slate.md`.
  - owner: agent (2026-10-24)
  - branch: mainline
  - evidence: `docs/design/K863_cursive_clean_slate.md`, `.claude/probes/K862/` (rim work), K861 stills in `.claude/probes/weekend-review/`
  - status 2026-10-25 (later): SHAPE PASS 2 done. Itinerary knots re-authored (upright domed a, touch (28,44)/R (80,44); straighter i stem J (20,48) -> top (29,75), shipped smooth-U bottom adapted, tittle (35,105)); handles fitted by coordinate descent (.claude/probes/K863/fit_itin.mts). All fused edges minR >= 6.5 GU (thread half), excess <= 0.0073; intrinsic bottom flips remain (a 6, i 3, pinned in tests). CPU union-field oracle still regenerated (Drive k863_field_ai.png: old left, new right). Next: Levi shape verdict, then the in-app GPU field pass.
  - status 2026-10-26: SHAPE PASS 3 (Hershey-proportioned interiors) had landed unmeasured; tests re-pinned to it. Fitted handles baked (fit_itin.mts, two rounds): i all edges >= 6.48 GU, a bottom 8.42 / exit 10.78 - but the a's top/right fused edges measure minR 5.07 / 5.15 / 3.00, BELOW the 6.25 GU thread-half floor. Handle descent cannot lift them; the knot positions themselves are too tight on the bowl's top-right arc. Per-edge measured radii pinned in test/core/glyph_itinerary.test.ts as report (not blessing). Levi dislikes the current letterforms; reference choice (Hershey plotter forms vs a penmanship model) is their call before knot repositioning. In-app GPU per-glyph field render (decided) still unbuilt; strand-pipeline emission remains provisional.
  - status 2026-10-26 (later still): SHAPE PASS 4 + GPU render. Levi rejected pass-3 shapes; letterforms re-authored from a standalone pen-stroke proof (.claude/probes/K863/cursive_proof.html/png: one continuous stroke, no thread constraints - entry/connector single right-then-up swooshes), then mapped to knots. a exit / i entry meet flat at baseline so the builder joins directly (no connector cubic; the old right-up-right-up staircase is gone). Every fused edge clears the 6.25 GU floor (tightest 6.37); declared pen-turn corners listed in the data test. GPU per-glyph field render BUILT (render/glyph_field.ts, GlyphFieldLayer behind #glyphs2=itin, ?gfield=0 A/B): ?txt=ai renders fused flat ink; stills in Drive (cursive_proof.png, k863_gfield_on/off.png). Residuals: flat colour (no section/reveal paint on the field layer), dot reads large, word fit runs under the panel at this size. Suite 2,344 green. NOT committed.
  - status 2026-10-26 (later): in-app GPU per-glyph union-field render BUILT (render/glyph_field.ts, GlyphFieldLayer): per glyph chain one quad, fragment evaluates min-distance over the chain's sampled centreline segments (FloatRows texture, flushed at build), flat ink where F < 0. Behind #glyphs2=itin (style.glyphField from scene.ts; ?gfield=0 A/B off). Packer + CPU-oracle gates in test/render/glyph_field.test.ts (touch fills as one union, retraced stem one line); program registered for warm-up (program_registry). Verified live: ?txt=ai#glyphs2=itin renders fused flat ink incl. the tittle; gfield on/off A/B in Drive (k863_gfield_on/off.png). Residuals: flat knotChainRgb colour (no section/reveal/paint integration yet), overlay draws over the glyph ribbons (ribbons remain traversal/paint bookkeeping per section 9), border look not honoured by the layer.
  - status 2026-10-26 (proof v3): Levi rejected pass-4 letterforms in the app AND in the standalone proof (a read as o; exits cusped where the near-vertical stem met the connector). Diagnosis: the proof hand-placed a was a closed oval plus a stub stem outside it - structurally an o. Proof rebuilt on the Hershey Script Simplex structure (the repo measured font data; rendered as a reference panel inside the proof): entry lands at the top point, bowl clockwise and closed, short crown retrace, full-height straight stem retraced down, foot tangent horizontal at the baseline into the exit (no cusp). v2 (crown-to-stem left open) read as e; v3 reads ai at text size. Proof: .claude/probes/K863/cursive_proof.html/png (Drive cursive_proof_v3.png). Next: Levi verdict on v3, then port itinerary knots to this structure. NOT committed.
  - next: Levi: pick the letterform reference (or verdict pass-3 shapes from the still + k863_gfield_on.png); then knot repositioning for the a's sub-floor edges, and the walk-routing call at touches (pen-guided vs free, word-wiring time)
  - brief: `docs/design/K863_cursive_clean_slate.md`

## K862 (2026-10-26, shortened)

- **K862** · G1 fillet rims (Levi 2026-10-24: fillet and thread must meet at the same angle). The de-facto quadratic rim's end tangents pointed at the straight-line corner: tangent mismatch on the frozen seed-3 maze was sin median 0.23 / p90 0.52 over 392 wedges (`.claude/probes/K862/wedge_dump.mjs`). The fallback rim is now two cubic Hermite halves through the old quadratic's midpoint (`src/render/ribbon/rim_curve.ts`): G1 at both flank tips by construction and at the shared midpoint, arc-fit handles per half (the routeCubic form), so it stays on the proven outline where K859's single Hermite bulged - sampled Hausdorff to the old rim max 0.13 world over all 392 wedges (`.claude/probes/K862/analyze.py`), and the corner-projection cubic branch is unchanged. `FILLET_BEZIER_STEPS` 8 -> 16 (at 8 the first rim chord still sat median sin 0.16 off tangent; the tips keep their K854 flank value 0.75 at any step count). Verified: `test/render/rim_curve.test.ts` (real-wedge G1 + midpoint anchor), full suite 2326 passed, build clean; classifier on rebuilt before/after (seed 3): j49 interior 632 -> 599, j110 810 -> 794, j164 557 -> 565 (the j164 rise is the new outline against the old-rim oracle; ribbon-owned interiors unchanged everywhere, no bulge in the crops).

## K861 (2026-10-26, shortened)

- **K861** · Fair re-authoring of a/i (cursive research shortlist 1, data half). CANDIDATE SHIPPED, awaiting Levi's visual verdict (supersedes K850 as the candidate; acceptance NOT claimed). Measured descent (`.claude/probes/K861/fit2.mts`) over handles/positions/tangent dirs with lint in the loop; key structural find: the (1, 3) tangent at L stood steeper than both neighbouring chords and forced an S-wiggle on the a's rise - L and the spur landing now share (1, 2). K860 fairness before -> after: a body flips 5 -> 3, pieces 10 -> 6, excess 0.0339 -> 0.0074, minR 11.2 -> 13.0 GU; a spur flips 2 -> 2, pieces 8 -> 4, excess -> 0.0022; i body flips 4 -> 4, pieces 6 -> 4, excess 0.0085 -> 0.0033, minR 12.1 GU. PRE-REGISTERED FLIP TARGETS (2/1/2) NOT MET: knot-local search cannot remove the remaining flips - the a-rise wiggle straddles L and the i's entry-blend/fold/exit flips are intrinsic to this knot placement; reaching them needs a re-placed-knot redesign, Levi's call whether to pursue. Gates: lint 0 errors xh 2/3, full suite green, stills `.claude/probes/K861/ai2.png` + `ai3.png` (settled, asleep) for the verdict. REJECTED by Levi 2026-10-24 ("they are bad"); the whole hand-authored body+spur line is superseded by the clean-slate K863 - no re-placed-knot nudging.
  - owner: agent (2026-10-26)
  - branch: mainline
  - evidence: `.claude/probes/K860/measure.mts`, `.claude/probes/K858/research_cursive.md` §4.1

## K814

Shortened in LEDGER.md 2026-10-27 (it was a numbered line no tool parsed). Full text:

- **K814** · A params collection for cursive and the other pre-defined-shape injections (Levi, 2026-10-22). Today the knobs are scattered single fields in the flat param table (`text`, `cartouche`, `emblem`, `cartoucheShape`, `shape`, the anchors and the K115 look params in `src/ui/url_state.ts`), and the shape definitions live apart (`src/core/shapes.ts` SHAPES/SHAPE_FNS analytic masks; the Hershey glyph data and emblem ids in the text code). Wanted: one collected home - a shape-injection param group (a typed subset the panel, codec and daily rules consume from one place) and a shape registry beside it, so a new pre-defined shape (cursive word, cartouche emblem, silhouette mask, title thread) is added in one spot with its params, choices and tags. Design first; no behavior change, defaults and links bit-identical. Stages 1-3 done in K818: src/core/shape_injection.ts (ShapeInjectionParams, SHAPE_INJECTION_PARAMS descriptors, SHAPE_REGISTRY) with test/core/shape_injection.test.ts pinning defaults/codec indices 1,2,3,163-168/daily flags; UrlParams extends the group (flat, EMBLEM_CHOICES re-exported); SceneParams picks the subset. Stage 4 done in K822 as the Text & emblem subfolder (the five rows grouped in Design; building the rows from SHAPE_INJECTION_PARAMS themselves remains a tidy-up); stage 5 (folding SHAPE_FNS into registry entries) stays optional.

## K610

Shortened in LEDGER.md 2026-10-27 (malformed: no `·`, code in backslashes or Done text left open). Full text:

- **K610** Raised in K827: the \gcr\ try key (K792) rides PhysicsTuning.grabChase into both hosts; MAX_SLIDE_GRABBED 0.6 -> 0.8 on measures (desktop daily drag probe .claude/probes/K823/gcr_measure.mjs: frame p50 72.3 ms at 0.6, 55.1 at 0.8, 55.1 at 1.0, 0.8 repeated 55.2). The feel call on the drag itself stays Levi's; \&gcr=1.0\ tries the higher cap. (Was: · Grab chase rate, a feel A/B (0.6 per constraint iteration; try 0.8 and 1.0): 4 substeps
  reach 90% of a drag step today; at 2 the daily's physics work drops from 53 to about 26 ms.
  A feel call (K370's 50 ms needs it or 2.5x cheaper substeps). Levi (2026-10-22): the recs stand - raise the chase rate and measure. `docs/design/K370.md`.

## K313

Shortened in LEDGER.md 2026-10-27 (malformed: no `·`, code in backslashes or Done text left open). Full text:

- **K313** Stage 1 (desktop) done in K824: src/loader/ (geometry + tests, OffscreenCanvas worker, boot, vite plugin inlining into index.html, static SVG first paint measured 90-110 ms); main adopts via window.__knotBootLoader, createLoader stays the fallback. Left: stage 2 phone measures in K156's next pass, then camera/trail tuning with Levi. (Was: · A loader that looks like the maze (`docs/design/K313_loader.md`; Levi 10-14, approved):
  a trefoil maze with over/under gaps, fixed-length trail, drawn by an OffscreenCanvas worker
  inlined in `index.html` (static SVG first). After K307's warm-up; measure the phone's first frame.

## K830

Shortened in LEDGER.md 2026-10-27 (malformed: no `·`, code in backslashes or Done text left open). Full text:

- **K830** Junction corner style (Levi, 2026-10-22). Done in a89f8203 (2026-10-23); stills `.claude/probes/K830/`. One `cornerRoundShare` slider (codec 245, `crs`, LOOK_KEYS; default 1 = today's rounded wedges, 0 = every wedge's flanks meet at the clamped miter). Intermediate shares rank wedges once from construction geometry: broad gaps round first, narrow points stay sharp, addressed by directed arm pair so settling cannot flip a corner. Builders pin where authorable (`Node.cornerPin`; glyph spur root/landing pins) through `ParticleSystem.fusedJunctionPins`; emergent mask junctions follow the global share.

## K831

Shortened in LEDGER.md 2026-10-27 (malformed: no `·`, code in backslashes or Done text left open). Full text:

- **K831** Cursive a/i redesign (Levi, 2026-10-22). Done in 1c6eb062 (2026-10-23); design: `docs/design/K831.md`, stills `.claude/probes/K831/`. FOLLOW-UP (Levi rejected the first stills, 2026-10-23): entry moved low to (14, 8) so it rises north-east tangentially into BL; a's top levelled into the corner; tail is one segment from a second declared corner at BR (two-segment tails floor at R 10.8 GU); the i's shipped form is the exact tangent join (fork 0, all three arms collinear on (1, 3), J raised to (22, 50) so the folded arms part); the tittle is a dedicated closed dot loop (`dotLoop`, `Glyph.dots`), not a segment; landing-spur tips no longer strand a degree-2 END node. Stills `.claude/probes/K831/followup2/`; lint pins moved in `test/core/glyph_lint.test.ts`. The a is one strand: entry joins LOW at the oval's bottom-left (BL) collinear with the bottom arc, body forks up the left side, declared corner (`Glyph.corners`) turns down the stem, bottom arc lands on the stem at BR (`SpurDef.land`), exit tangential; zero crossings. i's entry fork is the default 15 degrees at a lower J. Deviation from the brief as first recorded: BL draws as a fork, not a K580 tapered root — the root's width grew 0.022-0.033 LU toward J in every searched variant (bound 0.01, K643-calibrated); the pre-K831 tangent a survives as `A_TANGENT` (`#glyphs2=atangent`) carrying the K580/K643 tests. General letter rule stands: skeleton corners join as cusp corners, stroke overlaps stay crossings, stroke landings stay tangent/fork merges. K718 calls 2/3 still open.

## K832

Shortened in LEDGER.md 2026-10-27 (malformed: no `·`, code in backslashes or Done text left open). Full text:

- **K832** SDF + border residuals (Levi, 2026-10-22). Done in 4b02e2dc (2026-10-23). (a) SDF gaps: bindGap points fabric_sdf's gapSource at the scene's gap table (SDF shaders bind/re-point from it), and `CrossingGaps.assignGapIds` now packs G3 RANGES per chain instead of per strip fill (SdfPass has no fills, so it wrote zero entries; live probe after: 365 windows / 52 chains in rp=sdf, matching strip; regression test in `test/render/sdf_gap_bind.test.ts`). (b) Junction interiors: fans draw rim only in border; ribbons cut within the joinery wedge reach of fused ends (`kJunctionCut`; caps carry +4 at fused ends via `capWithFused`) in both passes; highlights still draw inside. (c) SDF border darkness/aliasing: the across coordinate comes from the winning cone (`side01`). Stills `.claude/probes/K832/`; G3-3 SDF-by-default flip still gated on Levi's phone look.

## K962

Shortened in LEDGER.md 2026-10-28 (v5.8's numbers added).

- **K962** · Cursive joins: v5.5's seam spikes ("minimum", "hippo": p to o, h's entry) and m's exit hook; v5.7's 17
  rows worse by over 0.25 u (fo 3.10 -> 4.19, ot, br, be, og, ow, op, es, ov, ev, ug, ju, kn, qu, py; each on a moved
  body end, kn unexplained); minimum's um tooth and last m spike. `work15/dbg/fid_cmp_v57.txt` in K863's probes.

## K1085

Shortened in LEDGER.md 2026-10-30 (over three lines). Full text:

- **K1085** · Under reduced motion the camera's fit still eases (about 1 s) where K198's panel tween snaps:
  updateCamera's 0.08/frame ease (`src/app/camera.ts:436-438`) and easeView's range ease (:257) have no
  reduced path; only stepPanel (:229) has one. K549 (48cf34fa) adds a trigger: a panel toggle now re-fits a
  text scene. Fix: snap both when reduced (resize and reset then snap too).

## K1086

Shortened in LEDGER.md 2026-10-30 (over three lines). Full text:

- **K1086** · K412 probe: the first reload in each warm profile started the app's main script 3.5 s (levi.dev)
  and 3.2 s (pages.dev) late, against 68-216 ms on reloads 3-5. All of it comes before main (main to DCL 30-75
  ms), on both origins, with no service worker. Unexplained: record navigation timing on that reload to split
  the old page's teardown from a first cache read (`.claude/probes/K412/k412_run.mjs`, records in
  `k412_results.jsonl`).

Update 2026-11-02 (Muse batch 5, run D): each warm profile's first reload starts main ~3.4 s (levi.dev) / ~3.7 s
(pages.dev) late vs 57-116 ms on reloads 3-5. Navigation timing: responseEnd ~85 ms, unload instant, chunk transfers 0;
the delay is responseEnd -> domInteractive, so the parser itself waited. Inferred, unchecked: the renderer busy tearing
down the first page, perhaps its WebGL context waiting on the GPU process's cold shader compiles (later reloads hit the
program cache). Next: a performance trace of that reload, and runs that reload only after the first page sleeps, or
with salted shaders (`.claude/probes/K412/k412_results.jsonl`).

## K1094

The K1091 planner's ledger-hygiene list (2026-11-02), unverified by the coordinator:
- K443: superseded by K795 (the beat rows and tunables).
- K404: likely stale.
- K497: its first clause was done by K330.
- K604: moot.
- K801: duplicates K789's tail.
- K1064-K1074: near-duplicate Done lines (the nightly archive takes them after a week anyway).
- The Next section's "queue" narrative is stale.
- K1081-K1083 still point at K1077, which is Done.
- Checked and wrong: K1086 sits in Residuals, not the Approved region.

## K863 (2026-11-02, the evidence line as of v6.6)

- evidence: `.claude/probes/K863/trace/` (per stage: `tools/*_k<ID>.py`, `work<n>/`, `out<n>/`; `NOTES.md` has a section per version with its rerun commands); Drive `K863/` (each version's SVGs; v5.1: `cursive_v51.svg`, `cursive_v51_words.svg`, `split_combs.svg`, `k917_junctions.svg`; v5.2: `cursive_v52.svg`, `cursive_v52_words.svg`; v5.3: `cursive_v53.svg`, `cursive_v53_words.svg`, `combs_v53.svg`; v5.4: `cursive_v54_words.svg`, `e_joins_v54.svg`; v5.5: `cursive_v55.svg`, `cursive_v55_words.svg`, `combs_v55.svg`; v5.6: `cursive_v56.svg`, `cursive_v56_nodes.svg`, `cursive_v56_words.svg`, `combs_v56.svg`; v5.7: `cursive_v57.svg`, `cursive_v57_nodes.svg`, `cursive_v57_words.svg`, `combs_v57.svg`; v5.8: `cursive_v58.svg`, `cursive_v58_nodes.svg`, `cursive_v58_words.svg`, `combs_v58.svg`; K944: `e_tails_k950.svg`, `words_edit_test.svg`, `combs_edit_test.svg`; J1 uploaded nothing, no visible change; v5.9 = J2: `cursive_v59_words.svg`, `combs_v59.svg`; v6.0 = B1: `cursive_v60.svg`, `cursive_v60_words.svg`, `combs_v60.svg`, `letters_v60.svg`; v6.1 = J3a: `o_exits_v61.svg`, `ot_v61.svg`, `low_v61.svg`, `cursive_v61<a|b|c>_words.svg`; v6.2 = B2: `corners_v62.svg`, `gq_words_v62.svg`, `cursive_v62_words.svg`; v6.3 = B3: `g_top_v63.svg`, `high_joins_v63.svg`, `gq_words_v63.svg`, `cursive_v63_words.svg`; v6.4 = J3b: `o_exits_v64.svg`, `ot_v64.svg`, `cursive_v64_words.svg`; v6.5 = B4: `aq_top_v65.svg`, `aq_joins_v65.svg`, `cursive_v65_words.svg`; v6.6 = J3c: `o_joins_v66.svg`, `ot_v66.svg`, `cursive_v66_words.svg`); Levi's file to edit: `out25/cursive_template.svg` (`out26/`'s is the same file; K1029 passed 2026-10-29; B4's a and q tops on `out24/`'s,J3a's 4 u edit of o on `out23/`'s, B3's g top on `out22/`'s, B2's g and q on `out20/cursive_template.svg`, which `work20/dbg/build_from_svg.ps1 -Name k990` built on B1's join sets, `work20/template_map_k990.json`); B1's census `out20/census_v60.txt`, distances `work20/fit/bodydist_k990.txt`, locality `work20/local/b1/sensitivity.txt` and `work20/cmp_j2_b1.txt`, debug scripts `work20/dbg/temp_k990/` (rerun list: B1's handoff); J2's census `work19/dbg/census_k962.py`, crops `work19/crops/`, locality harness `work19/dbg/sensitivity_k962.py` (rerun list: J2's handoff); J3a's census `work21/dbg/census_k1009.py`, rerun `work21/dbg/checks2_batch_k1009.ps1`, Levi's two pictures `work21/levi/` (made by `levi_crops_k1009.ps1` there); B2's record `NOTES.md` `## K1012` (N1-N10 with rerun commands), build `work22/base`, rerun `work22/dbg/checks_k1012.ps1` (census, compare, distances, word sheets, guard), the high-entry check sheets `work22/sheets/`; B3's record `NOTES.md` `## K1019` (N1-N6 with rerun commands), builds `work23/base_a` (v6.3a) and `work23/base` (v6.3), reader `work23/dbg/asdrawn_k1019.py`, census `work23/dbg/census_k1019.py`, rerun `work23/dbg/checks_k1019.ps1`; J3b's record `NOTES.md` `## K1009b` (N1-N7), ports `work24/ports_k1009b.json` (v6.4 = H; ot's tangent = Ht), the before build `work24/b0` (built through B3's reader, `work24/b0_build.log`), sheets `out24/` (v6.4) and `work24/sheets/`, tools `work24/dbg/{gen,census,sheet,locality}_k1009b.py`, checks `work24/dbg/checks_k1009b.ps1`, locality `work24/locality_k1009b.txt`; B4's record `NOTES.md` `## K1029`, tools `work25/dbg/*_k1029.*`, build `work25/base` (v6.5), sheets `out25/`; J3c's record `NOTES.md` `## K1009c` (N1-N5 with rerun commands), ports `work26/ports_k1009c.json` (v6.6 = K), census `work26/census_v66.txt`, ot's clearance `work26/clearance_ot.txt`, locality `work26/locality_k1009c.txt`, checks `work26/dbg/checks_k1009c.ps1` (logs `work26/checks_logs/`), tools `work26/dbg/*_k1009c.*`, sheets `out26/` (v6.6) and `work26/sheets/`

## K1139

Choice pulses across junctions. Levi 2026-11-03: "Pulse reach is good. BUT, we have to make pulses animate correctly across junctions. This will be important to get right, so take some time to properly plan what this should look like, how to verify it, and how to implement it." Stage 1 (Claude Opus, planning only): a design doc with the look, the checks and the implementation plan, plus pictures of today's behavior. Pointers: `docs/design/K299_choice_pulse_bug.md`, K175, K189, `src/render/junction_field.ts`, `junction_routes.ts`. Cover a route pulse (one path through several junctions) for K1140. Launch when the S3c agent ends (pacing: 19% of the week used at day 1).

S3b fix (2026-11-04, a Claude agent on `worktree-agent-abc94fe39cb25940c`, eb615c2f; stopped 12:30 with no passing
rule; record: the Handoff of `docs/design/K1139_s3b_fix.md` on that branch). Master's S3b (df30a7f3) seams: (a) tau
jumps within one band where the nearest point flips between legs on a turn's inner side (most of cross's), (b) fork
siblings alternating on their shared arrival arm (cross e150), (c) shared/drawing band switches (x4 ji 125, 149); its
dark wedge is bare quiet base between two drawing bands. fix1 (d5fb1f62: two-leg feet, a second candidate) made about
4x the seams, radial spokes from the far leg's foot, and k320 40,147 against the 37,100 ceiling: blend only
quantities continuous wherever their weight is above 0. Residuals the next stage carries: the band-switch seams at x4
ji 125 and 149; the sibling stripes on cross e150; x4 ji 28's GPU wedges 2.7x the CPU twin's (cover strips in the
footprint mask?, not checked); for S4, cycle arms e79 (node_386) and e134 (node_378) get no band (pulseTree declares
bands only to tree children).

Levi's answers (2026-11-03, the plan's Q1-Q3): the light splits at a fork (A); behind you it runs toward you; through
your own junction it goes straight through, with no dim moment. The fix for S3b (`docs/design/K1139_s3b_fix.md`,
branch `worktree-agent-a8280f4d14ebd8ad1`, its worktree kept) merged at 71eedb94 on 2026-11-04; its record is Stage
4's handoff there. Its three look calls are K1190, its leftovers K1191.

S4 and S4b (2026-11-04, Claude agents; merged at 36aed2d5). S4 (`docs/design/K1139_s4_cycles.md`) lights loops and
cycles: a two-ended arm runs trains from both ends that meet in phase at the ridge and fade over 0.5 world
(`PULSE_RIDGE_FADE`), and bands are appended for non-tree arms and self-loops. S4b
(`docs/design/K1139_s4b_ridge_fade.md`) gives those bands the ribbon's ridge fade (R2.w carries the arm's ridge):
node_218's band on cyc e210 reads 0 past the ridge, where S4 read 0.986. Locality: 0 px outside the touched arms on
all 8 stands. Shader text: junction field 40,342 of 40,350, section 59,001 of 59,050 (the k320_slim budgets raised
to the measured lengths). K307 cold compile, 12 interleaved runs: S4b 6.709 s mean against S4's 6.545 (U 12, within
noise and inside the base's 6.52-6.75 s spread). The rest bench (start head, one-ended pulses): 7.15 against 7.10
ms; two-ended timing is K1196. Left over: the dark stretch where two trains meet on a loop (K1200, Levi's look), the
joint step (K1201), a step on cyc e210's kymograph (K1202) and the band's end window (K1203).

## K1162

Found by the six ask-card agents on 2026-11-03 (their cards are in `docs/asks/`); not re-checked by Claude:
- K636 cites `6d79a79`; the hunt-pace change is `ce95d403`, which its card cites.
- `docs/design/K324_s3.md` gives the turn stalker's accuracy as 0.45; the code (K421) and K667's text have 0.3.
- K400's text says the fire speed default is 0.75; it is 0.6.
- K545's wording in `docs/ledger_done.md` is off.
- K626's pointer "K525's sheet shows white too" does not resolve: the sheet is red only, and K525's handoff lists white rims as undone.
- K1128 says sprint has no real phone pass yet; K749's Done entry (`cdd3ed53`) says it passed on both clocks on the real phone.
- K777's handoff dates report v7 2026-10-21 09:27; K887 says 2026-10-22 09:27.
- Two SHAs do not resolve on master (rewritten at merge): `4c682fbf` (`docs/design/K1040_s1g_gates.md` line 555) and `adb27a13` (`docs/design/K1114_s1h_crops.md` line 89). The merged ones are among 6ed0fd55, aa049a13, e73a0317, f58553ac and 523c91a8.
- K656's "40 of 50" strand figure predates K840 (Snap made harsher), and the K137 lore repeats it; not re-measured.
- K207's `docs/ledger_notes.md` text no longer matches the look question the item asks now.
- K610: the `gcr` key lives in `src/main.ts`, not `url_state.ts`, and is not a codec param.
- K606: `docs/design/K580.md`'s "Where it stands" predates the taper build.
- K693: the ledger's load times (45-54 s against 27-33 s) and K620's handoff baseline (20-30 s) disagree.
- No phone doc says the phone must stay on its charger, unlocked and awake, through the guard's 120 s quiet window, which is why 31 tries failed; say it in `docs/design/K1142_phone_guard.md`.
- `.claude/probes/K804/shots/k804_pulse_vs_ring.png` has no script that makes it; `.claude/probes/K1100/out/k1127/stills/zz_throwaway.png` is a stray.

## K1132

After you press an arrow key (or WASD) once, small arrows sit at the start of each run at your junction, showing which key takes it. At the default marker size they sit mostly under your own marker, and only their tips show. Move them out past the marker, or keep them as they are? Pictures, sent 2026-11-03: `.claude/probes/K1132/shots/` (sheet_desk.png, left now, right out; the out placement is `__knotKeyHintPlace("out")`, f2c79236). On hold until K1170 (Muse run 15D) lands: the hints become the d-pad's four directions, and its sheets (`.claude/probes/K1170/shots/`) replace these pictures. Levi chose out, 2026-11-03: “The d-pad markers should move out past the current location marker”. Muse chain run 15H makes the out placement the only one, removes the reach placement and `__knotKeyHintPlace`, and keeps K1170's rule for which hint a run shows (`hintMap`).

## K1171

One Rules dropdown for Fragile runs and Collapse: off, crack, snap, collapse, collapse (free); one link param; the Par rows greyed under the collapse options (Levi 2026-11-03: “Seems like we should maybe combine these two param drop downs?”). Muse chain run 15E, after 15B (K778 edits the same folder and the codec).

## K1172

Walker modes, Levi's brainstorm (2026-11-03, five messages): guide it, program it (board-game command cards), a flock (Lemmings-like; under snap its par is a max flow), stop them (several walkers, a third knob for K707; and a tower defense, four twists, the coordinator's pick the one you play by moving the knot), steer it live, bend and tilt. Which family first? (`docs/design/K1172_walker_modes.md`)

## K737 (2026-11-04, shortened at batch 17's close)

- **K737** · K137 s2 (K137_s2.md Handoff): with fragile runs or collapse the
  spool can leave no legal move at its limit (Undo or restart gets out); a
  lit hint hides the minotaur warning up to 2 s; the path-display row does
  nothing under the spool; a catch restart keeps hints used and chalk; the
  aids are off in walker modes; saved attempts keep no chalk or hints used
  (store version); the compass shares the hint mint. Fixed since: hints and
  the compass no longer name a run the fire refuses (03b559cf, batch 17 run
  D).

## K782 (2026-11-04, shortened at batch 17's close)

- **K782** · K137 s4 lure and snare residuals (docs/design/K137_s4.md
  Handoff): an armed tool lights any run on hover; a live switch to travel
  by length keeps snares that never spring, rings drawn; under length a lure
  clears one hop late (read, untested); untested under clk=beat; the ring is
  a stand-in for a glyph. Fixed since: the follower's first step is
  snare-checked (4b1886c7, batch 17 run E); the Snared toast waits for the
  monster's arrival (8ba8dc69, batch 18 run B); a waiting follower's first
  step is mud-cut (b806f9fb, batch 19 run E): it crosses and spends its next
  turn in the mud, as an awake follower's does.

## K1186

Muse batch 19 run B (19B, f657ac15) counted the flips, probes only, in `.claude/probes/K1186/` (`flips.mjs`, `out/summary.md`, the raw dumps; the step PNGs were deleted after tabulation, 302 MB, and come back by rerunning the batch). Stands: seed3 (`?3&am=instant&snd=none&fw=0&phw=0`) and fat11 (`?11&am=instant&snd=none&fw=0&phw=0&tw=0.72&cr=4.5`); per stand three scripted drags, then sweeps of cr 0.25-6 (24 steps) and tw 0.20-0.80 (11 steps), one rebuild per step.
- Drags: seed3 37 flips over 570 rebuilds (0.99/s), fat11 44 over 392 (0.58/s); 13 of them fillet-vote and 12 reach-bound flips. Most-flipping junctions: seed3 ji116 (72), fat11 ji55 (48).
- Ink: geometric worst wedge 3177 dev px (cover 2153, reachBound 1532, disc 509); a bare armVote flip moves 0 by construction. Drawn (crop diff minus the non-flip median minus the control median, 4484 and 8641 px): median 0 for every kind on both stands; worst single 4314 px (seed3, reachBound, n = 1).
- Sweeps flip 65-159 pieces per rebuild knot-wide; their drawn ink is only a full-frame upper bound, since a parameter move redraws the whole knot.
- Limits: seed3's ji2 drag barely moved its crop; the reach bounds were recomputed from the live `underWindows`, not checked against drawn flank lengths.

Claude's reading: the drawn median sits under the control's noise floor (whole-knot motion of 4484 and 8641 px per step), so the case for the hold-and-fade fix rests on whether the few large flips pop at their junction. Crop the five worst drawn flips (before and after, 3x) and judge them before briefing the fix.

Muse batch 20 run D (20D, 75fddf77) cropped the five worst drawn flips at 3x on master 94404dd2, before, after and held, in `.claude/probes/K1186/out20d/` (sheet.png, sheet_key.md, crops.json, ranking.md; `phw=0`, 260 CSS px crops). Excess px against held: ji6 reachBound 14397 (reproduced at its ranked step: bound 0 -> 1, reach 0.975 -> 0.93261), ji4 cover 10504 (reproduced), ji104 cover 3561 and 3539 (both the step-14 0 -> 1 flip; the ranked step-1 and step-4 flips did not reproduce), ji55 cover 4867 (not reproduced on this master: motion only); the control (seed3 ji0, no flip) 4614.

Claude's judgment (2026-11-05): the crops cannot show a pop. Before and after are one 140 ms step apart, and held is the drag paused at the before sample (crops.json's holdMethod), so each pair carries 140 ms of drag and the excess counts that motion too: the control's 4614 px is motion alone. At 3x with a change map, each row's change is mostly edge displacement; flip1's arm loses a pale highlight and flip3's arc shifts, neither separable from the drag. By the code, `armReach` (rebuildFillets, joinery.ts) is min(dom, max(0.3 L, near - pad)), continuous in the geometry, so a reachBound flip is the clamp starting to bind, not a jump. flip1's trace agrees: reach 0.975 -> 0.933 at the flip, then 0.933 -> 0.820 on the next step with no flip. It can jump only where `near` does (a window appearing in underWindows). The layer vote is a hard threshold (the vote's `Math.abs(d) >= voteReach` test), so a wedge changes layer in one frame: the one real candidate. Next: a probe-only override in rebuildFillets (default off and 0 px, like `skipJointPairs`) that forces one arm's vote, then a same-state A/B (captureScene, restoreScene) at each vote flip's frame, whose diff is the flip's own ink with no motion; crops at 3x, with ji116's and ji55's chatter. reachBound leaves the fix's scope unless that A/B finds a `near` jump.

## K1198 (2026-11-04, the full numbers)

c's exit under the one join rule: J3h's port (v7.1) with J3i's cusp-entry rule (v7.2 = Plc2m, B = 2 u; v7.2b = Plc3m, B = 3 u). Sources: `docs/design/K1112_cursive_j3i.md` Handoff and `.claude/probes/K863/trace/work32/NOTES_k1112cusp.md`.
- Over budget: ci 1.20 -> 3.79 u from the font (v7.2b 4.99) against its 2.5 u budget; the census's over-budget count 399 -> 400.
- Font distance (dmax, v7.1 -> v7.2 / v7.2b). Further: ci 1.20 -> 3.79 / 4.99, cr 3.40 -> 6.02 / 8.25, cs 2.75 -> 5.43 / 6.89, cy 2.52 -> 3.46 / 3.97, er 7.54 -> 10.07 / 11.71, es 5.91 -> 7.63 / 8.52; c's mean 11.02 -> 11.36 / 11.57. Nearer: ai 9.83 -> 8.61 / 8.14, ar 15.68 -> 14.39 / 13.72, ei 13.17 -> 9.43 / 10.41, ni 9.03 -> 7.47.
- Interior solves the new window re-parametrizes move their attach by up to 3 u at nearly the same distance (ct 34.95 -> 32.90 u, et 35.95 -> 33.36, np 7.88 -> 10.30, ej 20.00 -> 16.85).
- ij has no port solve: 71 of the 72 low-exit pairs into a cusp window solve.
- Untried: Plc1m (B = 1 u with maxfev 8000); Plc1 (B = 1 u, the old cap) left 5 solves at MAXFEV.
- The 6 undesigned seams left are q's word-end exits.

## K1191 (2026-11-04, Run D's findings)

Muse batch 19 Run D (d740e698) examined Stage 4's three leftovers; summaries and raw tables in `.claude/probes/K1191/` (task2_records.md, task3_unlit_arm.md, task4_wedges52.md). No code changed, and none of the three blocks K1139's merge.
- Records 2129 and 2668 are ji 27 (centre 25.342, 3.850) and ji 34 (1.026, 18.831): neighbouring fans drawn later over ji 28's foot and over the cross t7 box, as the cover model has it. The live anchors (ji 28 rb 2206, ji 33 rb 2591) match exactly on both stands.
- ji 147's unlit arm 1: no pulse band declares it (its bands are 0>3 and 0>2), and rule (d)'s side factor is 0 at all 276 px, so the crotch fill cannot reach it; its fan is the uniform quiet base (luma 148), not a dark base. The bright GPU colours there at bright phases are not explained by the cover model (candidate: its unmodelled gk discard); recorded, not attributed.
- ji 147's 52 wedges are threshold flips: the GPU sits 0.11-1.00 luma under the float model at all 52 (51 are fan x4, with no other record), and at a census line of T = 1 none stays GPU-only.
- Stage 4's `out/s4/d/` dumps were read as they were: nothing retaken, the `__k1139diag` hook not checked out.

## K1202 (2026-11-05, Run C's attribution)

Muse batch 20 Run C (5f9c3207), as Muse proposed it:
A step at columns 20 to 21 of cyc e210's kymograph (up to 43 luma), the same before and after K1139 S4b: the cover edge of node_218's other pulse band (e39->e209, record 5363) crossing e210's centreline inside the fan — within its strip cover the pixel takes that band's crest (read on e39, cr ~1.0), past it (dnow over the 0.303 strip reach, tau 0.239 to 0.251) it falls to the e39->e210 band's own field; the CPU twin ramps the same cover over cols 18-20 (master: 40.3 luma, 34/72 rows; `.claude/probes/K1202/out/SUMMARY.md`); a fix is a later stage behind a switch.

Claude's judgment of batch 21 Run C (2026-11-05, 5e0d5914, `.claude/probes/K1202/out21c/`):
- Observed: the GPU's cover already matches the CPU twin's at pixel centres (pxW 0.0287 world on both, `cov21c.mjs`); the kymograph samples about 0.011 world a column, finer than a screen pixel, so a 1 pxW ramp shows as a one-column jump. The switch's 2 pxW ramp turns the 41-luma step at columns 20 to 21 (29 of 72 rows over 10) into 23 there plus 27 at 17 to 18: the same rise, spread over two pixels.
- Observed: real frames off and on at kymograph rows 13, 24 and 71 (`frames21c_claude.mjs`, `out21c/claude_frames/`, row 24's strip and its 6x crop committed; an off/off control 0 px) differ in 182, 186 and 189 px, max 50, 47 and 53/255, in one-pixel lines along the band cover edges; at 1x they look the same, and at 6x the bright patch's edge is still there with the switch on.
- Call: the switch stays off (no visible change, for 86 more characters of junction shader, `k320_slim.test.ts`'s budget). The step is a brightness mismatch between the two bands' fields across the cover edge, not the edge's sharpness, so a softer front needs the fields blended over a distance, not a wider ramp. K1190's spot 1 (sharp fronts at forks) is the same kind of front, not checked to be the same cause. The switch comes out in batch 22 (K1207); Run D's switch sits beside it.

## K1201 (2026-11-05, Run E)

Muse batch 20 Run E (9637302e; `.claude/probes/K1201/out/SUMMARY.md`). Census: every standable head that lights the two stands' two-ended arms, on the CPU: cyc e210 at node_218 and node_221 (xR 2.066 at its A end, 0.680 at its B end) and loop e102 at node_635, mnode_77 and node_649 (3.835 at both ends), so play met xR < 0.5 at 0 of 5 heads (S4b's uniform-ridge guess: 0.36 of head positions at e210, 0.13 at e102). Why: for e210 both heads give dB - dA = 1.386, the drawn span of the alternative e39 path, so xR >= (W - 1.386)/2 = 0.680; a self-loop's dB is its dist0 (`pulse_path.ts`), so dB = dA and its ridge sits at W/2 (xR < 0.5 only when W < 1).
Shown by injection at node_218 (dB 2.346, so xR 0.2; `ridge_joint.ts` predicts a step of 0.54): the CPU band steps 0.3885 (0.54 times the reach window 0.72), the GPU's debug 5 steps 0.435 against the twin's 0.454 at tau -0.03/+0.03, and it shows on screen (`out/crop_joint_injected_normal.png`). GPU against the twin: within 3/255 except 5 and 10/255 at tau +0.03 and +0.1 on the child side, where the GPU also takes the e39->e209 band's crest through its cover (K1202's effect; the natural control shows it too).
Claude's call (2026-11-05): count xR over every head and two-ended arm of a few mazes (CPU, `pulseTree`) before any fix (Muse batch 21); fix (b) behind a switch only where play meets it.

## K1205 (2026-11-05, K1139's S5 passes on the Pixel)

Observed: K1139's S5 pass (`.claude/probes/rounds/2026-11-05-k1139s5/`, 3 reps, 00:52-01:07) ran at thermal status 1 throughout (VIRTUAL-SKIN 39.0 -> 39.8 C). In the same reps, fabric at rest drew at 30 fps at 0 moves (p50 33.1 on base 36aed2d5, 33.2 on head fbc1b212, asleep 1.00) and at the finish (13 moves, 33.1 / 33.2), but at 60 at 7 moves (p50 16.7 on both); knot mode held 60. The same two builds rerun from a cool phone (`-k1139s5b`, 4 reps, 01:20-01:41, status 0 at 32.9 C -> status 1 at 39.4 C) drew 0 moves at 60 (p50 16.7 on both); 36aed2d5 drew 0 moves at 60 in S4's pass too (27 -> 38 C, `.claude/probes/K1139/out/s4cyc/pixel_batch_plan.md`), and the S3b fix's pass, which ended at status 1 and 39.5 C, read 16.7 at 0 moves.
Inferred, not tested: the throttled clocks push the at-rest frame at 0 moves (and at the finish) past 16.7 ms, so it does more per frame than 7 moves', although one synchronous render (render ms, about 40 ms) is cheaper at 0 moves (40.5 against 42.0 in the warm pass). First step: what an at-rest frame draws and runs at 0 and at 7 moves (the desktop's per-pass split, the frame's JS), then a warm-phone pass that confirms the 30 fps before and after any fix. K256 (heat across a pass's cells) is the measuring side of the same heat.

## K1198 (2026-11-05, Run G's Plc1m and ij)

Muse batch 20 Run G (c3ab0a46, `.claude/probes/K1198/SUMMARY.md`) measured Plc1m: every cusp entry (i j p r s t u w y) stretch [1, hi], maxfev 8000.
- Font distance (dmax, v7.1 / Plc1m / v7.2 / v7.2b): ci 1.20 / 2.31 / 3.79 / 4.99 (budget 2.5), cr 3.40 / 4.01 / 6.02 / 8.25, cs 2.75 / 4.04 / 5.43 / 6.89, cy 2.52 / 2.98 / 3.46 / 3.97, er 7.54 / 8.72 / 10.07 / 11.71, es 5.91 / 7.29 / 7.63 / 8.52.
- Solves: 71 of 72, none at MAXFEV (v7.1 4), 22 at a lower bound (v7.2 24, v7.2b 34); er in 903 evaluations (v7.2 1168, v7.2b 3827). Census hooks / spikes / rough FAIL 50 / 77 / 147 under all four; undesigned seams 6, q's word ends (v7.1 29); over budget 399 (v7.2 400); side none below -0.05 u; locality PASS.
- Claude's judgment: Plc1m wins on the checks that picked v7.2 over v7.2b (`docs/asks/K1197.md`), so it replaces v7.2 if its sheet reads as well. Not yet measured: ai, ar, ei and ni (v7.2 brought them nearer the font than v7.1), the fr and fs pins under Plc1m, and the largest word moves. K1197's question is the same under any variant.
- ij: HarfBuzz shapes "ij" as one ligature glyph (`ij.jmc`), so the kit places one letter and never builds the join; both ports exist (ii and aj solve; ji takes the preset path). Claude's call: list every pair the font ligates, shape with those ligatures off everywhere (the one rule takes no per-pair data), and solve the joins they hid through the ports under the census gates. Both pieces are Muse batch 21's (K1204).

## K1190 (2026-11-05, K1202's finding)

If Levi picks spot 1 (soften the sharp fronts): K1202's judgment (5e0d5914; its notes) found that widening a band's cover ramp to 2 pxW spreads a front's step over two pixels and changes nothing visible at 1x; the step there was the two bands' fields disagreeing across the cover edge. Check each front for that mismatch first.

## K1203 (2026-11-05, Claude's judgment of Run D)

Run D (a0f1d634) put the child arm's end window into a pulse band behind `setPulseBandEndWindow` (off by default, on `uJParams.w`; R3.w holds the child's span for a one-ended, non-cont child at its near end, else 0), and its copy of `table_cyc.mjs` reads BAND EXTENT past the arm. Claude's verdict: the switch goes on, and K1207 makes it the only path in Muse batch 22 (K1208).
- Muse's checks (`.claude/probes/K1203/out/`): x4's mnode_27 e135 to e18 reads 0.0170 off and 0.0000 on in the CPU table and 0 px on the GPU at every phase; that band's R3.w forced to 0.95 read 0 px too (`check_gpu5.mjs`: distJ 6.811 of reach 8, so the reach window crushes its crest).
- Claude's frames (`.claude/probes/K1203/claude21d/frames21d.mjs`, `out21d_log.txt` beside it): 0 px off/on over 36 clocks across 1.5 periods, off/off 0 px, no context loss.
- Claude's positive control (`claude21d/posctl.mjs`, with `posctl_log.txt` and the strip `posctl/t0_on_onhack_diff.png` beside it): all 11 of x4's bands' R3.w forced to 0.05 at four clocks a quarter period apart reads 0 px with the switch off and 958 to 1479 px (max 105 to 111 of 255) with it on, in three fans; every band's distJ moved to 0.5 with the switch off reads 3021 to 3855 px (a record hack reaches the GPU); the controls read 0 px and each hack was intact after its shot.
- Why on: it is a correctness fix (the band equals the child's ribbon pulse to 1e-9: `test/render/paint_gameplay.test.ts`, "pulse band end window (K1203)"), it adds 127 characters of fragment shader (`test/render/k320_slim.test.ts`) and no measurable cold compile (K307: 6.078 base, 6.061 edited; base spread 5.934 to 6.154), and the GPU applies it.
- Open: `check_field.mjs`'s CPU twin moved about 2.3/255 at tau 0.91, from (0.5052, 0.8065, 0.6131) off to (0.4960, 0.8030, 0.6059) on (`out/check_field.txt`), where the GPU showed 0 px: either the fan does not draw that point or the twin and the GPU disagree. K1207's run says which.

## K1186 (2026-11-05, Claude's judgment of Run E)

Muse batch 21 Run E (080d4b49) put a probe-only `voteOverride` on the fillet layer vote (`src/render/ribbon/joinery.ts`, default null; `test/render/vote_override.test.ts` pins it) and rendered each vote flip both ways at the flip's own captured drag state: restoreScene, the override forcing the arm's vote from before the flip, rebuildFillets(true), 250 ms, a clipped screenshot; changed px = any channel over 8, 20D's threshold (`.claude/probes/K1186/out21e/`: sheet.png, sheet_key.md, ab21e_log.txt, pc21e_log.txt; stands seed3 and fat11 as 19B's).
- 34 forced votes, every one 0 px (max 0): seed3 6 (ji116 x4, ji7 x2), fat11 28 (ji55 x12, ji104 x9, ji4 x4, ji1 x3). Each stand's control (rendered twice, override unset) 0 px.
- Positive control (pc21e_log.txt): fat11 ji0's arm 45:158:-1 forced from [1,0] to [0,0] ([top, dives]) moved 320 vertices from the top fan mesh to the bottom one (24294 -> 24614 and 28818 -> 28498) and drew 0 px; a bogus key 0 px; no context lost.
- 16 of the 34 are not flips: ji55's 12 rows and ji104's 4 marked NEAR-JUMP are the junction's arms rotating through the arm indices from one rebuild to the next, and ab21e.mjs compares arms by index (its lines 120-122: the key from the after rebuild, nearBefore from the before rebuild's same index). Each key keeps its vote and near across the rows (ji55: 45:88:1 [0,1] near 0.54, 45:88:-1 [1,0] near 2.60, 23:0:1 [0,0] none; ji104: 64:46:1 [0,1] near 0.36, 64:46:-1 [0,0] near 1.96). Their forced A/Bs still render a vote the arm did not have, so they count as evidence; the 18 real flips are seed3's 6, ji104's other 5, ji4's 4 and ji1's 3. Every NEAR-JUMP is a rotation, so Run E saw no `near` jump.

Claude's judgment (2026-11-05): the 0 px is the code's answer, not a blind probe. The renderer's root draws the base ribbons, the bottom fillet layer, an empty container, the top fillet layer and another empty container, in that order, with only the plucks and the reveal FX added after, above them (`src/render/ribbon_renderer.ts`, the layer setup), and the votes only choose a mesh: layerFor (the discs), the wedge's fm and the round-join strip's fm; `dives` is read nowhere else. joinery.ts's TWO-LAYER JOINERY comment says so: with no erase layer between them the choice no longer changes coverage. A vote therefore only reorders fans among themselves, and at all 35 forced states the reorder drew nothing. 20D's crops differed by their 140 ms of drag. No hold-and-fade: K1186 closed with 080d4b49. 19B's per-junction flip counts (ji55 48) may hold rotations too (`.claude/probes/K1186/flips.mjs` not read).

Filed K1209: retire the vote, one fan layer (the vote loop with underNear, overNear and voteReach; layerFor and the fm routing; filletTopMesh and filletTopLayer, which `src/render/ribbon_renderer.ts`, `src/render/ribbon/explore_gaps.ts`, `src/render/ribbon/paint_state.ts` and `scripts/phone_pass/walk.mjs` also read; `voteOverride` and its test). The near gap (gapNearOf) stays: armReach and coverCap read it too. First check the comment's "kept for the junction-shader merge" reason. Probes that hide filletTopMesh (probes.md's layer-toggle note, the web-pixel recipe beside debug view 5) change with it. A pin may move only where fans overlap; each one that moves is re-frozen and named (pre-launch).

## K1201 (2026-11-05, Claude's judgment of Run F)

Muse batch 21 Run F (8e0c5a1c; `.claude/probes/K1201/out/census21f.txt` and `census21f.json`, scripts `census21f.ts` and `census21f_check.ts`). CPU only, lattice spans (`WalkEdge.length`), `pulseTree` from every non-end head of ten mazes: cyc, loop and x4 (links verbatim from the folder's `stands_cyc.mjs`; loop and x4 at `pr=8`) and dailies #19-#25 (`dailyParams`, reach 3). At play reach: 1776 heads, 930 two-ended arm-ends, 121 with xR < 0.5 at 116 heads (cyc 0, loop 46 ends at 43 heads, x4 31 at 30, the dailies 2-10 ends each); smallest xR -0.0005 (loop mnode_64 on e205), largest metric step 0.90. Checks: the metric reproduces `ridge_joint.txt`; an independent recomputation through `walkDistances` matches all 930 ends (worst 4.7e-4); `pulse_path.test.ts` passes unedited; `npm test` green. 20E's two rows moved past the brief's 0.05 because 20E read drawn spans (cyc e210 0.765 lattice against 0.680 drawn; loop e102 4.004 against 3.835). The brief misquoted two figures the run did not use: `PULSE_RIDGE_FADE` is 0.5 (`paint_const.ts`), not 0.2, and `ridge_joint.txt` reads 0.36/0.54/0.72 at xR 0.3/0.2/0.1.

Claude's check (2026-11-05; `.claude/probes/K1201/claude21f/windowed.ps1`, output `windowed.txt`): the census's step column is `ridge_joint.ts`'s metric without the reach window (`census21f.ts` sets `uKReach` to 1e6, so rows whose joint sits at dB 2.943 under reach 3 read 0.90). Weighted by `kReachWin` at each meeting end's joint (fade min(1, reach/2), `paint_state.ts`), 99 of the 121 ends still step over 0.3. In the seven dailies at the default reach: 32 ends over 0.3 at 31 heads, 2-6 per daily, up to 0.77 (daily #25: node_216 and node_218 on e251 and node_741 and node_743 on e51 at 0.77; mnode_0 and node_735 on e15, xR 0.14, at 0.65). 24 of those 32 are equal-length cycles: the head at the arm's near end, the ridge at its far joint (span 2.236, dB 2.236, xR 0). Drawn spans break the lattice tie by a little, which should leave |xR| near 0 either way (item 3 or item 4 of `docs/design/K1139_s4b_ridge_fade.md`); the fix run dumps it.

Claude's call: play meets the step in every daily, so fix (b) (the band crossfade, `docs/design/K1139_s4b_ridge_fade.md` "Fix options") is batch 22's K1201 run. It sits behind a switch that defaults to today's picture and starts from the K1207 run's commit (both change `junction_field.ts`). It dumps the drawn-span xR at two natural stands (daily #25's node_216 on e251, x4's mnode_130 on e35) first, then shoots off/on sheets there and at 20E's injected stand (cyc's node_218 on e210).

## K1198 (2026-11-05, Claude's judgment of Run G)

Run G (Muse batch 21, 21G; e43b2cfc; `.claude/probes/K1198/SUMMARY_21G.md`), probes only: nothing under `src/`, `test/` or `.claude/probes/K863/` changed.

- The look: Plc1m's sheets (`.claude/probes/K1198/sheets21g/`: c, cusp and words) read as well as v7.2's. Claude compared it, fi, ct, et, ft and ni side by side at one scale.
- The numbers (`distances_21g.txt`; 20G's table in `SUMMARY.md`): Plc1m is nearer the font than v7.2 on ci 2.31 u (v7.2 3.79; budget 2.5), cr 4.01 (6.02), cs 4.04 (5.43), cy 2.98 (3.46), er 8.72 (10.07), es 7.29 (7.63) and ei 8.63 (9.43); farther on ai 9.18 (8.61) and ar 15.04 (14.39); level on ni 7.47. The four pairs 20G never measured average 10.08 u against v7.2's 9.98 (+0.10 u). The largest word moves against v7.1 are i's exits in it, hit and fruit (9.82 u) and fi (9.79 u).
- Verdict: Plc1m replaces v7.2 as the variant K863 lands once Levi answers K1197 (ports: `.claude/probes/K1198/ports_k1112cusp.json`, record Plc1m). K1197's joins (into a, d, e, g, k, o and q) enter no cusp, so both variants draw them the same and the question stands; its card now gives Plc1m's numbers.
- The fr/fs pins under Plc1m (`pins_21g.txt`) are not the v7.2 no-op: with them fr and fs attach at 2.00 u (fr 6.34 u from the font, fs 9.36), without them at the rule's 1.00 u bound (fr 5.30, fs 9.38). fr is 1.03 u nearer the font without them, fs 0.01 u farther. Whether they go is a look: batch 22's K1198 run sheets fr, fs and their words both ways.
- ij (`ligature_21g.txt`, `ij_Plc1m.txt`, `gates_21g.txt`): of the 676 lowercase pairs only ij ligates (`ij.jmc`), through GSUB ligature lookup 26, which this font files under calt (it has no liga feature; liga, clig, dlig, hlig, rlig, ccmp and ss02 off each leave the ligature). Through the ports the hidden join solves under both variants (Plc1m: status 0, 716 evaluations, attach 3.20 u, side 0.0010 u; v7.2: 713, 3.97 u, 0.0014). But calt also makes every cursive connector: shaping with calt off everywhere leaves all 334 joins' font distances nan and moves all 234 census strings. The global rule fails, and nothing lands.
- Determinism: the calt-off census ran twice with the same hashes (txt 73287907e1a0d9b8, json 894cb964bde8b949); the ligature list ran twice byte-identical.
- Run G's first calt-off censuses died at the end (StopIteration: the e-variant medial glyphs exist only with calt on); it shaped the variant rows normally (`census_21g_off.py`) and reran them.
- Next (item 2 of `docs/design/K1208_muse_batch22_run_a.md`): keep calt and empty only the font's ligature-substitution lookups (by lookup type, no per-pair data), or re-shape only the clusters that ligate; census under Plc1m with every join but ij unchanged and ij solved through the ports; sheets of ij and of fr/fs with and without the pins for Claude's look.

## K1211 (2026-11-05, Levi's call)

Levi, 2026-11-05 (verbatim): "To be clear, the pictures I've been seeing of highlights over
junctions are bad. There are clear lines/edges of the highlight within the interior of the
junction. These seem to be artifacts of how the original threads are constructed before the
threads were fused and/or the rounding was applied. These junctions need to appear as though they
are one whole fused seamless unit." Then: "I believe we addressed this problem previously for
blending segment colors across junctions?"

The pictures were K1190's sheets (K1139 S4); this item supersedes K1190. Section colors meet
seamlessly because every arm ramps to one converged junction color (src/core/section_colors.ts,
the blending contract). The gold path (K81's route bands) and the pulses (K1139's pulse bands)
instead draw a thread-wide band with a one-pixel edge through the web. S1
(docs/design/K1211_seamless_junction_light.md) builds A (one light per junction, the colors'
rule) and B (a soft field that keeps the turn) behind a switch, with sheets for Levi. Held
meanwhile: K1201's fix (b), Muse Run 22D. Run 22H (K1210) is data only: its bar was "like the
pulse".

## K1210 (2026-11-05)

Levi, 2026-11-05 (verbatim): "I also want to make sure that fire and segment collapsing effects also
correctly transition across segments--similar to the highlights".

Run H (Muse batch 22, d31f08c6; `.claude/probes/K1210/SUMMARY.md` and `STANDS.md`; sheets
`out/sheet_S3_fire.png`, `sheet_S3_collapse.png`, `sheet_S4_fire.png`, `sheet_S4_collapse.png`; frames
untracked): stands S3 = node_218 (3 arms), S4 = node_378 (4 arms). Pops (a fan pixel changing by more
than 32 luma in one frame): fire 9 and 13, collapse 22 and 23, the pulse 0 at both. The jump at S4 is
like the pulse's; lag has no pulse reference.

Claude by eye (2x crops of the sheets, 2026-11-05): fire at 3 arms burns the fused shape away in straight
radial wedges with ember lines along them, and small dark spikes stick out at the fan's corners (L113.5,
L113.9); at 4 arms a thread-wide ember block crosses the fused shape, a spike sits on its left corner,
and the two new fronts meet in a stair-stepped notch (L101.6, L102.1). Collapse at 3 arms leaves the rest
of the junction with a concave bite and a hard straight side (D-0.40 to D+0.37); at 4 arms, a ragged
stair-stepped cut with stray yellow specks and a feathered tuft (D+0.37 to D+1.20). The pulses on the
same sheets show the band edges and radial bars K1211 is about.

Next: K1211 S1 picks the light's rule inside a junction; fire's burn edge and ember band and the
collapse's cut then follow the same rule through the fused shape, as a stage after Levi's pick.

## K1209 (2026-11-05, Run C reviewed)

The item's text before Run C: Retire the fillet layer vote (21E: a flip only reorders fans, 0 px; K1186): one fan layer, once joinery.ts's "kept for the junction-shader merge" is checked. Removes the vote loop, layerFor, the fm routing, filletTopMesh, `voteOverride` and its test; a moved pin is re-frozen and named.

Run C (Muse batch 22, 22C; 2d68f787; `.claude/probes/K1186/`: ab22c.mjs, batch22c.txt, wip22c.patch; out22c/ untracked): task 1 found nothing that still needs two fan layers. The retired tree (joinery.ts, ribbon_renderer.ts, explore_gaps.ts, paint_state.ts, scripts/phone_pass/walk.mjs; test/render/vote_override.test.ts deleted): tsc clean, npm test green (216 files). Task 4, base (Run B's 0af054cc) against retired: controls 0 px; seed3 all 6 flip states 0 px; fat11 26 of 28 states 0 px; ji104 drag3 f20 23 px (max 35) and f28 14 px (max 24), in the rightmost columns at a fan boundary. The run stopped there, as its brief said, and did not push the retirement.

Claude's review by eye (out22c/fat11_f20_ji104_crop.png and fat11_f28_ji104_crop.png, base left, retired right, 3x): the base draws a stair-step boundary between the salmon and purple areas at the fan boundary; the retired fan runs smooth there. Accepted: it removes an edge inside the junction, which is what K1211 asks for.

Landing: after K1211 S1 merges (its switch at 0 must stay 0 px against master, and S1 edits joinery.ts and junction_field.ts too), a Muse run re-applies wip22c.patch onto that master, keeps S1's code where the two meet, reruns task 4's stands (expect 0 px but the accepted ji104 change), re-freezes and names any moved pin, and pushes.

## K863 (2026-11-05, J3j merged)

J3j (stage agent of claude session 7301c55b, 09:22 to 10:48; merged as f5424660 after a rebase onto efabc2ce; the brief's Handoff is the record) rebuilt v6.8 as `.claude/probes/K863/trace/work33/`: the template is byte-identical to J3e's; every SVG, PNG and JSON equals work28/base; the census compared 349 pieces with 0 differences, the det rerun too. c against v7.0: 101 of 110 raw pieces equal; the 9 that differ are the joins bc, vc, wc, cb, cv, cw (the last three numeric only) and c's stroke after bc, vc and wc; every join out of c is v7.0's, which are K1197's old joins.

The account (234 words, 1356 pieces per version): J3f (v6.8 to v6.9) moved 301, 29 unlisted, largest 88.2 u (wl); J3g (to v7.0) 244, 16 unlisted, largest 30 u; J3h (to v7.1) 78, all listed, largest 34.2 u (ct); J3i (to v7.2) 180, all listed, largest 7.18 u. All 45 unlisted pieces come from b's, v's and w's new bodies as the second letter of a pair. Cusp corners: v6.8 has 19 among its 25 undesigned seams (the other 6 are the q$ tails, K1213), every one an entry into r, s or i, the largest 0.0462/u (nr, dr, er); v7.1 has 23, v7.2 none.

Sheets (`.claude/probes/K863/trace/out33/png/`, tracked): b_v68, v_v68, w_v68, aq_joins_v68 and e_after_bvw_v68 (font, approved = v6.8, v6.9, v7.0); c_v68 (font, approved, v7.1, v7.2); cusp_v68 and corners_v68 (font, approved, v7.2) with two crops; cursive_v68_words. Claude's check by eye (the tops of b_v68 and c_v68 at full size): the approved column is v6.8. b's joins are blue U sags lying on the font's join where v6.9's run near-straight and v7.0's hump and then bend into an S; c's approved joins are smooth rising arcs along the font's, where v7.1's run along the baseline and v7.2's add a dip.

The rebase needed `-c core.autocrlf=false`: work33's and out33's `.gitattributes` (`* -text`, added by the stage's fourth commit) made the earlier commits' CRLF checkouts look like local changes, and agent_merge.ps1's rebase stopped at the fifth commit.

## K1112 (2026-11-05, re-scoped)

The item's text before: Cursive: one join rule for every pair (the answer to Levi's step-back question of 2026-11-02, `K863_trace.md` "Levi's calls"): port the exits J3 has not (b c g j k l m p q r s t u v w x y z), letter by letter, b, v and w first; then delete J2's presets (join_params `cnct.*`) and the six pins (og, oe, fo, fv, fr, fs). No per-pair data: a fix goes into a letter's body or ports. Gates: the census's smoothness and locality; font distance reported per letter; Levi judges one sheet per letter.

Why: Levi on K1119's sheets (2026-11-05): "the v6.8 versions are WAY better in all cases. The others are grossly incorrect and unsmooth"; on K1197: "the old one is better". The rule's ports of b's, v's and w's exits (J3f, J3g) and of c's (J3h) were what Levi rejected, so those presets stay. The other exits may still be ported, one letter at a time, each judged by eye against v6.8 (the approved base, K863's J3j); a preset or pin is deleted only when the rule's port draws v6.8's join.

## K1198 (2026-11-05, the corner rule not taken)

The item's text before: Cursive v7.2's leftovers (J3i), held 2026-11-05: Plc1m and the ij work were built on v7.2, whose b, v, w and c joins Levi rejected (K1119, K1197); re-judge them on the approved base once K863's next stage restores it. 21G's notes: `.claude/probes/K1198/SUMMARY_21G.md` (e43b2cfc).

Claude's crops of `.claude/probes/K863/trace/out33/png/corners_v68.png` (font, v6.8, v7.2; nr, dr, er and ds at 2x, the tops of r and s at 5x): v6.8's entry corners at the tops of r and s are sharp points the font draws too, and v7.2's smoothed ones can't be told from them at either zoom. Plc1m and Plc2m add nothing visible on the approved base, so they are not taken. ij is still open: the font's ligature draws no j; it gets a stage of its own on v6.8. Batch 22's Run G (Plc1m's census and ij, both on v7.2) is dropped; a redraft would do ij on v6.8 only.

## K1208 (2026-11-05, Run E's gate)

Run E (22E) started at 10:47:42. Its agent went idle at 10:59:31 saying it would report once its timing completes: the ABBA bench it started at 10:53:49 under the perf lock was still running. The chain's gate counted any commit since the run started, so J3j's merge and Claude's ledger push let 22E pass at 11:00:35, and Run F started at 11:00:42. Fixed in `.claude/probes/K1053/chain.ps1` (untracked): after a run, a commit since its start must name the run's tag (Muse's commits end "(Muse batch 22 Run E, 22E)"). The running chain keeps the old gate until its next start. E's timings are taken under load (K1211 S1's previews and shoots, Run F); its report must say so.

## K1191 (2026-11-05, Run F)

The item's text before: K1139 Stage 4 leftovers (`docs/design/K1139_s3b_fix.md`): the full model's 12/6/11 threshold flips; no arc-true tau rate or obliqueness in the classifier; ji 147 arm 1's bright GPU colours, unexplained (candidate gk). Batch 19 Run D examined the rest: none blocks K1139's merge (`.claude/probes/K1191/`)

Run F (Muse batch 22, 22F; 4c7867da, its ledger update 4ef96746; `.claude/probes/K1191/gk147.mjs`, `gk147.txt` and `gk147.md`) modelled gk at ji 147 arm 1's bright pixel-phases from K1139 Stage 4's x4 dump; npm test green (217 files, 2896 tests). The report's proposed text for the item: "ji 147 arm 1's bright GPU colours: not found in `4c7867da` (gk modelled at the 276 px-phases from Stage 4's x4 dump, `.claude/probes/K1191/gk147.mjs`/`gk147.md`: binary discard under the foot/debug/for readings reaches 0-10 of 36 at the bright phases, a fitted per-pixel keep 30-31; the dump holds no gap-slot centreline, strength or per-sample under-colour)." So gk as recorded does not make the colours, and a fuller model needs data the dump does not hold. K1211's rework of the junction light may change what this models.

## K1211 (2026-11-05, Levi on K1190's card)

Levi answered K1190's card (asked 2026-11-04; `docs/asks/K1190.md`, deleted in eb476bc5 when K1211 superseded K1190): "K1190: All four". The card's four spots, each judged against the sheets' top row (before K1139's change; `.claude/probes/K1139/out/s4/sheets/`):
1. Sharp curved fronts. `t4_ji33_cross_n.png`, bottom row: where the light crosses the fork, its front is a hard curve. `t6_ji149_x4_n_c34_2x.png`, middle and bottom rows: the light stops at a sharp curve running from the gold path's corner down to the dark gap. Before the change both faded softly.
2. Straight edges. `t4_ji33_cross_n.png`, bottom row, the two right columns: a paler wedge with straight sides at the top left of the light (the 3x crop shows it); the middle row has them too.
3. The gold path's edge. `t6_ji149_x4_n.png`: round in the top row, a straight line with a corner in the middle and bottom rows.
4. A small bite. `t6_ji149_x4_n.png`, the two right columns of the middle and bottom rows: a small bite missing from the light at the right edge.
K1211's looks must fix all four. Claude checks each by name in S1's crops (today, A, B, the colors alone) before the look card, and the card shows them.

## K1001 (2026-11-05, Levi's answer)

The item's text before: Corners, sharp or round: where two threads split, the corner is a sharp point (K1040 F1 row 8: r goes to 0 as the room closes); stage 1's b16 rounded it into a small arch (not landed). Levi sees it in motion at K1040 S4b, behind its flag; there is nothing to look at before then. Levi disliked losing rounding at K1114 (2026-11-03): lean round.

Levi, 2026-11-05 (verbatim): "a while back I said that ideally, in general, some corners between adjacent threads should be rounded while some should be sharp. I think you had a good heuristic for determining when to do one vs the other. Let's keep that."

The earlier words are Levi's of 2026-10-22 (`docs/design/K868_field_border.md`, its 10-22 corners quote). The heuristic is K830's (a89f8203; `## K830` above): round or sharp per corner, builder pins first (`Node.cornerPin`, the glyph spur root and landing pins, carried by `ParticleSystem.fusedJunctionPins`), then the `crs` share's ranking from construction geometry, broad gaps rounding first and narrow points staying sharp, addressed by directed arm pair so settling cannot flip a corner. K1040's form B carries it as each corner's style bit (F1 row 7; F2's r0). At the default share (1) every corner is styled round and the radius does the rest: it grows with the gap's angle and shrinks with the room on the arms, so a split's crotch, a narrow point, closes to the sharp point F2 draws (F1 row 8). So there is no floor on r and b16's arch is not built (the card's "Sharp needs no change"). Levi still sees the corners in motion behind S4b's flag with the rest of form B. K1049 (the inner corner of one thread's bend through a junction, not a corner between two threads) stays open for S4b: this rule does not decide it.

## K1211 (2026-11-05, S1 reviewed)

S1 (stage agent of claude session 7301c55b, 10:05 to about 12:05; branch `worktree-agent-a775d9bee91f23536`, last commit 0ea697e8, unmerged, worktree kept; the brief's Handoff on that branch is the record) put two looks behind a switch (`setJunctionLight` in `junction_field.ts`, carried by `uJParams.z`: 0 today, 1 A, 2 B; probe hook `window.__knotJunctionLight`). A gives each junction one level, the arms' |L|²-weighted mean, ramped over 2 fh. B covers the band softly (solid to the half-width, then a smoothstep over 1.5 fh) and eases the light off the other arms. Cost: `k320_slim` 40,495 to 43,758 characters. Three stands (cross ji 33, x4 ji 149, loop ji 113) at 24 pulse phases: the zero check 0 px; check (c) 0 px outside 8 fh; checks (a) and (b) reject nothing, because today fails both (uncalibrated).

Where K1190's spots come from: 1, the band's cover in the fan; 2, the light stepping between fan wedges; 3, the traveled partition where the fan's arm domains meet (the walked gold, `paintTraveled` on K127's routed arms, is lit on one side only, and the pulse band follows the partition); 4, the web, which doesn't carry the pulse's light (the bite goes with the webs off). At rest A and B both push a gold nub about 1 fh into the off-route arm. The T (loop ji 89) and the four (loop ji 12) show straight zigzags in its colours-only shots, which keep the traveled gold; x4 ji 125's gold is broken by a teal strip, and loop ji 12 has a small dark triangle, both on master too.

Claude's verdict: neither look ships, and Levi gets no A-or-B card. A lights the whole fork, against K1139's "it splits", floods the gold and nubs; B nubs too; and the switch costs K320 budget. Plan: S2 (`docs/design/K1211_s2_gold_edge.md`) makes the walked gold end in one round edge in every junction kind, with no nub, in the default mode; it removes A and calibrates the checks. S3, after Run I (K1209) lands, makes the webs carry the light (spot 4), gives the pulse B's soft front or the colours' own rule per route (spots 1 and 2), and checks A's line about 2 fh out (`coverCap`). Then K1210 (fire and collapse).

## K1196 (2026-11-05, 22E reviewed)

The item's text before it closed: Two-ended pulses (K1139 S4) on the desktop, 20F (345a189f, `.claude/probes/K1196/out/`): frame p50 at rest 7.50 (cyc e210), 7.82 (loop e102), start head 7.07; in play 7.25, 7.22, 6.95 (spread 0.2, 0.1). Other stands, so not S4's own cost: next, those stands on S4's base and head (ABBA), the Pixel if it costs.

Run E (Muse batch 22, 22E; 34d1e863; `.claude/probes/K1196/out22e/SUMMARY.md`) timed S4's base and head on 20F's stands. Head minus base, frame p50 (ms): at rest baseline +0.22, cyc +0.05, loop -0.02; in play +0.18, +0.03, -0.10. Control spreads: base 0.00, head 0.20. S4 alone (95fcf3b7): +0.05 at the baseline stand, +0.15 at rest at cyc and loop, +0.04 to +0.10 in play; S4b's span about 0 in play.

Claude's review: the builds were timed one after another (base 10:54-11:09, head 11:09-11:25, S4 alone 11:37-11:52), the ABBA running over stands rather than builds, while Run F (11:00-11:16), J3k (from about 11:11) and Run G (from 11:24) loaded the machine. The baseline stand, which S4 does not touch, moved +0.22: that is the drift between sessions, and S4's own numbers sit inside it. Verdict: S4 costs nothing measurable on the desktop, at rest or in play; no Pixel run. The tail watch E ran beside it was interleaved and shows a real signal: K1214.

## K1214 (2026-11-05, filed from 22E's tail watch)

Run E's tail watch (stand `b.J&am=instant&fw=0&snd=none&phw=0`, fabric 7 moves, ABBA within each pair; ms):

- 1fe793f5 to 71eedb94 (K1139 Stages 3 and 4: junction_field.ts, junction_routes.ts, joinery.ts, +503/-107): base p95 10.43, p99 12.10, max 15.1, 3 frames over twice the median; head 12.00, 13.98, 19.8, 6; control spread 0.50; head p50 6.90 to 7.93.
- 36aed2d5 to fbc1b212 (K1139 S5: b05e7a5a and fbc1b212): base p95 8.45, p99 9.28, max 19.6, 1 frame; head 10.03, 11.38, 18.4, 2; spread 1.30.

Both pairs ran under J3k's and Run G's load, so the absolute numbers are high, but the order was interleaved and both p95 steps (+1.57, +1.58) exceed the spreads. K1139's handle already has its next Pixel pass watch fabric 7 moves' frames over 25 ms (+14 and +15 in the fix's and S5's passes, floor 13). Next: name the piece that costs (the per-frame CPU of route records and joinery, or the fan shader's new text) in a probes-only profiling run, a Muse candidate, after K1211 S2 lands, since S2 edits the same code.

## K1198 (2026-11-05, 22G reviewed)

Run G (Muse batch 22, 22G; 5f5025de; scripts and outputs in `.claude/probes/K1198/`, sheets in `out_22g/`) showed i and j on v6.8: the trace kit's font copy has its type-4 (ligature) lookups emptied by type, calt kept, so shaping gives i.mod.ini, cnct.mod_n_n, j.jmc.fin where the stock font gave the ij.jmc ligature. Only ij moved: 712 pieces equal, 0 differ. ij's rule solved: status 0, attach s_u 3.04 u, font distance 5.99 u, class cnct.mod_n_n.

Claude viewed ij_22g.png at full size (font ligature | font unligated | v6.8 today: i only, no j, no join | v6.8 with the rule): the last draws i, a join and j with its descender loop, close to the font's unligated form. The dots are drawn as ticks (K1213).

The six hand-set pins (pins_22g.txt; font distance dmax in u, with the pin / without): og 7.18 / 5.29 (with the pin o's exit port sits 4.00 u from the end, seam angle 180 degrees; without, 2.00 u, angle 0), oe 12.74 / 5.31 (port-merge 4.96), fo 7.80 / 9.85, fv 6.59 / 9.92, fr 6.34 / 4.23, fs 9.37 / 9.40. Every join moves without its pin, so they stay: K1112's rule removes a preset only when its port draws v6.8's join, and v6.8 with its pins is the look Levi approved (K1119); distance to the font is not the bar. Viewed: fr's two v6.8 columns are nearly identical; oe's join from o's top into e differs slightly.

Closed: the kit draws ij now. K863's next stage adopts the unligated font copy in the kit and the app's cursive.

## K1112 (2026-11-05, 22G's six pins)

Run G (K1198's notes) drew the six hand-set pins og, oe, fo, fv, fr, fs without their pins: every join moves, so by this item's rule each pin stays. Without them og, oe and fr come closer to the font, fo and fv move away and fs is unchanged; a port that draws v6.8's join is what would make a pin removable, and none does yet.

## K1213 (2026-11-05, J3k's candidates; card filed)

The item before the card: "Cursive v6.8 (K863 work33): the six q$ word-final tails are undesigned seams (dk
10.6/u in J3j's census); p and s end with no tail; the i and j dots are drawn as ticks.
`docs/design/K863_cursive_j3j.md` Handoff."

J3k (merged 0136f455; Handoff in `docs/design/K863_cursive_j3k.md`, evidence in
`.claude/probes/K863/trace/work34/` and `out34/png/`) drew one candidate per spot. None moves a piece
outside its spot over the 232 test words (`local_k863k`).

| Candidate | Pieces | At the spot, against v6.8 |
|---|---|---|
| S1: s cut at the curl | 14 | ends 2.93 u from the skeleton's end (v6.8 runs 77.41 u past it) |
| S2: s cut at the font's end | 14 | ends 0.19 u from it |
| P1: p's bowl closed into the stem | 13 | ends 0.26 u from the skeleton (v6.8 runs 82 u past) |
| Q1: q's tail refit | 6 | exit dk 10.6 to smooth; hooks 1 to 0; distance max/mean 1.06/0.75 to 1.17/0.84 u; badness 270 to 44-84 |
| D1: round dot | 41 in 38 words | overlap with the font's dot 0.570 to 0.805; ink outside 23 to 0 |
| D2: the font's oval dot | 41 | overlap 0.967-0.970; ink outside 5-6 u2; uncovered 5 u2 |

ALL = S2+P1+Q1+D2: 74 pieces in 68 words. J3k leaned S2 (or S1), P1, Q1 and D2.

For the stage that adopts the picks (not items yet):
- Q1 has a slight S within about 1.5 u of q's exit: facet 0.030 against the limit 0.0053 (v6.8: 1.233);
  it can't be seen at 5x.
- q's tail is shorter and lower than the font's in both v6.8 and Q1 (34.42 to 33.08 u).

Card: `docs/asks/K1213.md`. Its picture, `.claude/probes/K863/trace/work34/look/card_k1213.png`, stacks
J3k's crops (crop_spot_s_boxes, crop_spot_p_ap, crop_dots_it_3x, crop_spot_q_oq); `card_k1213.py` beside
it rebuilds it.

## K1208 (2026-11-05, Run K reviewed)

Run K (22K, 0f63e3d5; `.claude/probes/K1208/run_k/SUMMARY.md`) shot master at 79014b00. Claude viewed each
crop at full size against its item:
- K744: no blip at K749's junctions, alternate and cycle (desktop; the phone was not re-shot). Closed.
- K734: the hairline is gone, closed. At real size (the crop at 1/3, dsf 3) the i fork shows a pale disc
  with a round edge and two steps in its outline where the arms' straight cuts meet the fan. Run K called it
  "smooth gradient, faint wide rim shading only" from its 1-px step metric (0 steps above 6/255), which a
  ramp a few device px wide passes. Filed as K1220, with K836 (c)'s pale discs at the a's L and R.
- K424: present; Run K named the joint gate (`exploreJointShown`, explore_gaps.ts). Stays.
- K15: gone, closed. K218: gone at 7 stands, closed. K678: unreachable, dropped.

## K863 (2026-11-05, Run L reviewed)

Run L (22L, 734c55b9) re-measured 30 cursive leftovers on the approved v6.8:
`.claude/probes/K863/audit_22l/SUMMARY.md` has each item's then and now, 18 crops and the kit
gaps. Claude viewed 7 crops (be, f, ip, b, lead e, k's X, oe) and filed:
- Done: K990 (J3e's corner exit, 636bd685).
- Dropped: K987 and K938 (gone), K927 and K912 (superseded by the per-pair port solves), K948 (oe
  solved anew with no hook; be, we and ve keep the presets Levi kept, K1112).
- Re-worded with v6.8's numbers: K903, K937, K947, K949, K986, K991, K998, K1006, K1014, K1044.
- Unchanged text, v6.8's numbers in SUMMARY.md: K913, K951, K961, K977, K978, K982, K989, K997,
  K1021, K1035, K1036, K1090, K1116, K1194.
The crops: f no longer curls into its exit, and its swoop runs higher than the font's; the p entry
in "ip" joins from one side with no crossing, right of the font's; the lead e and the b's bowl
show no knee or notch at 2-3x; the o-to-k join runs along the top, far from the font's lower
diagonal (ok 34.77 u), and k's two strokes part where the font's nearly coincide; the connector
into e after o comes in higher than the font's (oe 12.69 u).

## K1211 (2026-11-05, S3 reviewed)

S3 (`docs/design/K1211_s3_lit_edge_web.md`, its Handoff; b15816f6 and fe2aef12, merged at 66752e75) fixed the lit edge's dark line (in mode 0 the pulse bands now go under the walked gold; pin `test/render/gold_edge.test.ts`) and spot 4, the web's bite at x4 ji 149 (a drawing band lights the web inside its turn; pin `test/render/web_light.test.ts`, 15 tests). K320 42,174 to 42,888; no other pin moved. Checks against c0a72eb8 (before S1 and S2): edge dips 0 at x4 and cross, 1 at loop (ji 88, in master and S2 too); (c) 47,884 px at x4 within 4.22 fh, 83 at cross, 24,891 at loop within 3.63 fh; the no-pulse, pure, fan-bands-off and webs-off controls 0 px; nub 0; sharpest corner 98 degrees.

Claude viewed S3's sheets at full size (`.claude/probes/K1211/out3/sheets/` in S3's kept worktree): the 1-px darker line along the lit arc shows in S2's column and is gone in the branch's; the ")" teal sliver at x4 ji 149's right rim is gone; at rest the columns match. Spot 1's sharp curved light boundary below the gold remains, and spot 2's wedges: S4's (`docs/design/K1211_s4_soft_light.md`).

Filed: K1221 (S3's leftovers). The (b) jumps S2 raised (the largest jump between moments: x4 ji 125 27.1 to 39.5, x4 ji 149 20.2 to 33.7, loop ji 88 27.9 to 43.2) go into S4's checks rather than a new item, since S4 rewrites the light they measure.

## K1214 (2026-11-05, 22M reviewed)

Run M (22M, 04ff7cad; `.claude/probes/K1214/SUMMARY.md`) re-timed 22E's stand on a quiet desktop, ABBA x4 under the perf lock, control spread 0.20 ms: K1139 S3+S4 (1fe793f5 to 71eedb94) p50 +1.00, p95 +1.13, p99 +1.43; S5 (36aed2d5 to fbc1b212) +0.07; master 734c55b9 (K1211 S2 in) against fbc1b212 -0.22. 22E's S5 step was its load's. Every CPU measure is flat or down across the builds (submit time, the JS phases, the CDP profile: joinery 42 to 32 ms over the window); what grows is the GPU stall (first draw to the readPixels return), 6.15 to 6.82 ms on pair 1, and hiding the junction fans removes most of it (+0.67/+0.60 to +0.18/+0.21). So the fan's fragment shader (`junction_field.ts`) carries about two thirds to three quarters of the step, on every frame (hence p50 too). Desktop frames stay near 8 ms at p95. Next: re-time after K1211 S4, which rewrites the fan's light (its brief asks what it adds per fan fragment), and watch the phone's frames in K1097's Pixel pass; a fix only if the phone's tail moves.

## K1220 (2026-11-05, 22N reviewed)

First seen in Run K's `.claude/probes/K1208/run_k/out/k734_on.png`: a pale disc shows its round edge inside the fork, and the outline steps where the arms' straight cuts meet it (the i fork in "ai" at xh 3, real size; the a's L and R discs, K836 (c)).

Run N (22N, 655eb6a9; `.claude/probes/K1220/run_n/SUMMARY.md`) measured the text forks on master 02805d13. The largest outline step per fork: the i fork in "ai" 28.1 at xh 3 (at 1.18 half-widths from the joint) and 32.1 at xh 2; a's L 29.8 and 34.0; a's R 6.7 and 8.5; the maze's x4 ji 102 1.4, with no disc. Colours at the i fork (xh 3): inside 203,163,201 against the arms' 176,129,183, 212,177,211 and 176,129,184.

The cause: a text arm shorter than 0.15 world is dropped (`joinery.ts:1336`, `if (len < 0.15) continue;`), so the fork writes no field record (`joinery.ts:1409`) and falls back to a disc on the host chain's axis (`joinery.ts:1880`, radius `fillHalf * 0.99`, `tip.hostChain`), painted by the AXIS strip lookup (`junction_field.ts:366`), which blends no arm. The maze's seal disc is a separate path (`joinery.ts:2317`, `fillHalf * 0.92`, over the arm blend at `junction_field.ts:437`). Each arm ends in a straight perpendicular cap (`ribbon_mesh.ts:164`), and the wedge loop skips these forks, so K830's corner rule never reaches a text crotch. N's proofs: growing the disc from 0.99 to 1.35 moved its rim from 1.49 to 1.85 fh; forcing the AXIS return to red turned the centre 255,0,0.

Claude viewed the 3x crops (`ai_xh3_ji0_normal_3x.png`, `a_xh3_ji1_normal_3x.png`): a round disc of a different colour with a visible edge inside the stroke, and the arms' straight end cuts sticking out of it as a notch and a ledge.

What a fix would take (N's task 4). Colour with no edge: give text forks real field records (retune the 0.15 drop for glyph scale, so they take the maze's composed blend and per-arm strips), or teach the AXIS disc to blend the fork's arms (per-disc arm rows and weights the shader does not carry today). An outline with no step: grow or recentre the disc to cover the cuts' corners (the `TIP_DISC_SIDE` stadium clamp shows the bulge risk), draw wedges at text forks (then K830's rule styles their crotches), or round the ribbon's terminal cap (`extrudeRibbon`; moves every open end, glyphs and maze). Files: joinery.ts, junction_field.ts, arm_strip.ts, ribbon_mesh.ts; the pins, K320 and the fan vertex counts move, and K836's a-discs share the path. A look, in K1211 S4's files: a Claude stage after S4 merges.

## K1218 (2026-11-05, 22O reviewed)

Run O (22O, f9f625a5; `.claude/probes/K1218/run_o/SUMMARY.md`) read the slot table on master c32f20de through the probe hook (`renderer.gaps.describeSlot/readSlot`, `slotOverChain`, `chainWins`, `ps.crossings`, `paintState`), with no src edit, and proved each spot by clearing one slot after its solve (`proof_*.png`).

The zigzags. Inside a junction, a crossing's gap slot hides the fan within its over thread's silhouette (a tube of 0.260w around the over SAMP polyline, inset 1 px, no window clip), so the over ribbon's own paint shows through: its crest shading, and a straight gold/untraveled split at the joint, since gold spans end at walk-edge ends (`walked_gold.ts:172`, `fabric_maze_renderer.ts:4194`, `paint_math.ts:1685`). Loop ji 89: slot 73 (over ch38@45.53, under ch60@4.40; its tube passes 0.073w from the joint), split at ch38's ctrl 42 (sample 263), two straight segments of 45 px at 45 degrees and 17 px at 135. Loop ji 12: twin slots 27 (over ch38@65.43, under ch5@4.65) and 28 (over ch38@56.39, under ch5@10.00), straddling the joint at ctrl 62 (sample 374), three segments. Loop ji 88: slot 73 again (ji 88 and 89 sit 0.92w apart and their fans overlap), split at ctrl 40; ji 88's own fan slot 66 draws nothing there. On a ribbon a slot is the casing tube (hOver + margin, 0.330w) plus a 0.140w fade, clipped to its window along the under ribbon.

The triangle (loop ji 12, K1219): 16 px at 158,139,58, ch5's gold at a partial gap keep (about 0.67) in the casing fade, 0.385w from slot 28's over centreline, at under arc 4.249 inside its window (4.23 to 5.81): the straight window end and the fade band make the lens (`gap_mask.ts:802`, `:810`, `ribbon_shader.ts:321`). Clearing slot 28 erases it; clearing 27 leaves it.

The notch (x4 ji 149, K1219): not the mask. It is the fan's untraveled web (the ch69 arm's teal; live 188,200,111, pure 122,195,169) between the gold band's round edge and the dark crossing lane (`junction_field.ts:358`, junctionBase). Clearing slot 224, 227 or 228 leaves it byte-identical; hiding the fans moves it.

Claude viewed the 3x crops. Loop ji 89: a straight-edged paler gold bar (the ribbon's crest) crosses the gold diagonally, with a straight gold/purple boundary; with slot 73 cleared, a smooth S. Loop ji 12: a straight zigzag peak in the gold's upper edge, a small dark triangle and a dark fade at the right end; with slot 28 cleared the triangle and the fade are gone and the zigzag stays (slot 27's). x4 ji 149: a teal crescent inside the gold U.

O's fix options (task 5). Zigzags: (a) leave the junction's footprint to the fan, extending `jointMask`'s clearance (joinery.ts) to slots whose over tube crosses a fan, so the fan's round band covers the split; its cost is the casing of crossings that hug a joint. (b) Rounded gold-span ends that follow the band (walked_gold.ts and the gold feed), which touches every gold end and leaves the crest. Triangle: waive the fade (not the casing) where the under ribbon is inside a junction's `fanReach`, or start the window past the fan (`gap_mask.ts`, `crossing_gaps.ts`); `k320_slim` and the gap pins move. Notch: grow the band's cover over the web sliver inside the turn (`bandLightsWeb`/`bandTurnSide`) or shrink the fan to the band, in junction_field.ts. The zigzags and the triangle go to K1218 S1 (`docs/design/K1218_s1_gap_in_junctions.md`), a Claude stage alongside K1211 S4, which works in junction_field.ts; the notch waits for S4.

## K1211 (2026-11-05, S4 reported)

S4 (`docs/design/K1211_s4_soft_light.md`, its Handoff; branch `worktree-agent-a222ff792a21132ec`, 42e2a7cc, rebased onto 97e7a041, unmerged and kept) ran from 15:18 to 16:43 and stopped in task 3 at its brief's stop rule (a change to how K81's route band is built). Tasks 4 (checks) and 5 (sheets) did not run, so nothing merged.

Look B out (b4596bf1): switch 2 and everything only it used, in the shader, the twin, the hook and `junction_light.test.ts`; no pin moved; K320 JUNCTION_FRAG 42,888 to 41,396.

The reference numbers (master's light on the desktop GPU; the largest step over 3 device px, in 8-bit levels). The bar, along a plain arm's crest: cross 15, x4 8, loop 15. Inside a lit junction, over its 8 moments: cross ji 33 36 (2.4x the bar, r 1.18 fh), x4 ji 149 111 (13.9x, r 1.17), x4 ji 125 111 (r 2.51), loop ji 89 124 (8.3x, r 1.35), loop ji 88 101 (r 1.91 and 4.0), loop ji 113 35 (r 2.04), loop ji 13 6, loop ji 12 0. At cross ji 33 and x4 ji 149 a band's light ends in one pixel at its tube's edge; the steps out along the arms are unattributed.

The soft field (09bfee81, shader and twin in step, mode 0): each pulse band lends the web its light at its nearest foot and falls off past its tube over 2.5 fill half-widths; overlapping falls blend, weighted by the inverse square of the distance past each tube, so at a tube's edge that band's own light rules; only named arms take it; never darker than master's. Per fan fragment: no texture read, no loop pass, no branch; per band a smoothstep, a max, a division, three multiply-adds and a bit-or. K320 41,396 to 42,123 (explore variant 51,808). The model (`test/render/soft_light.test.ts`, bar 0.085 of the pulse colour per px), on the gold tube's edge: x4 ji 149's shape 0.861 to 0.688, T fork 0.745 to 0.408, sharp fork 0.969 to 0.320, the four with two children lit 0.713 to 0.496; every stand still 1.6x to 8x the bar, kept as 5 expected fails. Off the gold edge only the sharp fork grew (0.098 to 0.135). An off-route arm near the joint centre takes up to 0.31 of the pulse colour where junctionBase's min-width blend mixes in a named neighbour. GPU smoke (x4, plain and xp=threads): it drew, with no console error and no lost context.

Why it stopped: K81's composite paints the gold band's own crest over everything on its tube (`c = cg + gT*(c - c0)`), so the field can narrow the step at the tube's edge only from the off side; and two bands sharing an arm read different taus near the joint (pivot ray against projection: 1.4 against -14 at a T fork's (-14, 14) px). S4's way out: one tau for every band near the joint, and a composite that blends the gold band's light at the tube's edge. It said the shared tau would also serve fire's and collapse's fronts (K1210).

The coordinator's call: build both, a technical route; the look is judged against K1190's top row, with a card to Levi only if a choice the calls don't settle comes up. S5 (`docs/design/K1211_s5_shared_tau.md`) cherry-picks S4's commits, builds the two, then runs S4's checks and sheets. K1220 S1 starts alongside instead of after S4's merge (it works in the text forks' records, S5 in the light). Filed: K1222 (S4's leftovers).
## K1240 (2026-11-06, Levi's stroke-piece sketch)

Levi asked whether this would make junctions easier: threads as node polylines, junctions at nodes, only the border offsets drawn, corner-rounding polylines spliced into the borders as one joined outline, curvature matched by constraint rules, and physics constraints keeping opposing border nodes within a distance range. The analysis (claude session 09c7a672-a414-402a-97da-b3176839a2e5):

- Most of it is K1040 already: the borders are S4a's tube-edge strips, the corner polylines are form B's rolling-ball fillets, and the splice is the MAX blend (the max of the pieces' bands is the band of the whole outline, so no closed loops are needed; loops matter only for something that runs continuously around the outline, such as a dash or a pencil texture).
- The part worth testing: form B's burial weight (w = 1 - max inside(f_A, B) * ramp_B) depends only on the foot f_A, so it is a function along A's border. The CPU can find each border piece's exposed interval by closed-form segment-against-tube intersections, only against the arms the junction tables name, and each crossing's clip from the crossing table (D4's tie as a weight). The GPU then draws each piece's strip with its own distance and weight, and clips an under against the over's tube with a distance test or two: no burial search (up to 14 tests a pixel today) and, if it holds, no label pass for the ink (S3f5: 4.1-9.7 ms on the Pixel against 2). S7's tints and hover rim may still need a top surface.
- Cost: the FieldModel (S3a) spent its 256-474 ms on iterative corner re-fits and on h/8-step walks (partExtents 51/110 ms, passReach 53/81 ms; `docs/design/K868_s3a5_incremental.md`), not on the outline as such. The closed-form trim is unmeasured, and it adds to a prep S5 has yet to bring in budget (243-339 ms per build in the app today). It can run off main.
- Keep from the sketch: one outline table that every consumer reads (K1239 is that kind of seam). Change: construct the corners (G1 by construction; G2 as an end-matched quintic), never fit them with a constraint solver; insert splice points at fractional positions, never snap them to nodes (about 4 px hops at dpr 2); derive the borders from the centreline each frame, never simulate them (the solver residual reads as width wobble, more soft modes fight sleep, and collision is already about 40% of drag CPU).
- Test as K1040 S5: check #12 against form B on the 12 scenes, the pop census over the recordings, the prep's p95 in a Pixel drag, and check #13.

## K1240 (2026-11-06, Levi's corrections; the prototype)

Levi corrected three points of the first analysis:
- Pops: the structure is defined once (the pieces, which crossing cuts which border, which corner joins which arms, sharp or round), and only positions follow the frame. Cut and tangent points are fractional, since crossings slide and arm angles change, but computed in closed form from each frame alone they move continuously, and nothing flips. The old FieldModel popped from its h/8 steps and warm-started re-fits, not from the idea.
- Cost: segment intersections are cheap, and the crossing and junction tables name which segments can meet, so every cut is a few local tests.
- Scope: one system for both looks. The borders bound the interiors (the strip between a thread's two borders plus one polygon per junction, cut at crossings by the same cuts), and paint blending across junctions (K1139, K1211) is paint on that geometry, not a second one. Today's five junction definitions grew one patch at a time: ribbons from P2 (2026-07-16) with their joinery, the junction field (10-11), arm strips (10-12), route bands (10-13), then the field's export. K1239 found the export accurate and the looks differing in their cut models.

Levi then asked for "a new prototype of this approach, without all the tech debt of the current systems", verified there. S1's brief: `docs/design/K1240_s1_outline_proto.md`.

## K1242 (2026-11-06, Levi: "Are there parts of our architecture and systems we would ideally redesign?")

Claude's answer, from that day's src line counts (126.8k lines; src/render 57.9k):
1. The threads' shape is derived many times: the filled look (ribbon stack, joinery, fans, arm strips, route bands, gap masks; about 17.7k lines), the border look (`render/field` + `render/label`, about 17.9k: the CPU oracle, form B, several generations of label and band passes), and each overlay placing itself on the ribbon. K1240 is the redesign; S1 tests it.
2. Paint twice: `paint_glsl.ts` (1.2k) and its CPU copy `paint_math.ts` (2.2k), kept in step by fixture tests, so every K1139/K1211 paint change is made twice. Write it once and test it by rendering (headless Chrome, readPixels; CI has no GPU, so software WebGL with small tolerances).
3. `fabric_maze_renderer.ts` (5.3k) is the file every gameplay look passes through (markers, yarn, fog, trail): agents on different looks collide in it. Split it per overlay once the outline exists. Also big: `main.ts` 4.7k, `tweakpane_panel.ts` 4.2k.
4. Probe tools copied per run: K1243.
Left alone: the physics (measured and pinned; a rewrite would rediscover its constants), the physics worker (the phone needs it; K1240 S2 decides where the outline builds), the URL, daily and UI code. Cursive: K1112's per-pair presets are the same kind of debt, retired by K863's letters with consistent exits. The call it sets up (K1240's next): if S1 holds, no new stages in the seam lanes.

## K1247 (2026-11-06, S3c's text; shortened in the ledger)

K1240 frame cost (S3b Done 3, carried through S3c): target ≤3 ms median / ≤6 ms p95 on def. S3c (decide-once, 1beb956a; frame re-evaluation, 08390186) removed per-frame exposure classification and pruned corner foot searches, but def still reads frame med 42.5-44.2 ms / p95 81-118 ms locked on a loaded machine (first phase read 26.4-27.2 ms locked / 17.8 ms unlocked; corners 18.3-21.6 ms and pieces 7.9-10.3 ms now dominate — the 32-node gate integral plus the per-frame stretch/cap candidate scans; final locked bench def med 37.5-37.7 ms / p95 87-111 ms after fca93b74's depth-first verdicts). Needs the algorithmic cut: incremental gate evaluation across nodes or a spatial margin index, gated on still exact staying 24/24. Evidence: .claude/probes/K1240/out/s3c/bench_run{1,2}.json (now in the main checkout's .claude/probes/K1240/s3c_out/); Handoff in docs/design/K1240_s3c_decide_once.md.

Claude's re-run on fca93b74 under the lock (2026-11-06 22:38, two runs): def frame median 31.4 / 30.8 ms, p95 76.1 / 79.0 ms (the slowest of 15 frames), structure 437 / 556 ms; corners 16.8 / 15.8, pieces 9.5 / 9.4, setup 4.2 / 4.0, offsets 3.6 / 3.7, crossingCuts 1.6, regions 1.5 / 1.4, exposure 0 ms. The first part's profile (73558807) had pieces at 0.5 ms: the 9 ms are 08390186's per-frame re-tests. S3d (docs/design/K1240_s3d_cheap_frame.md) restores the decide-once frame and makes it cheap with its output unchanged.

## K1248 (2026-11-06, S3c's text; shortened in the ledger)

K1240 moved-frame residual (S3b Done 2, carried through S3c): decide-once frame(structure(S), S') vs fresh at 0.1h now fails 12/24 rows (was 15/24 after S3c's first phase, 19/24 under S3b); frame() re-tests recorded covering candidates per frame (buried stretches emit their longest uncovered sub-range, run ends trim while covered, corner span/wedge feasibility is re-checked, cap exposure is reclassified), but tolerances are fresh+1 on low-count scenes and still fail (def A 13->21, B 7->14; ring A 53->66; g41_user_tw64 A 189->211 with p99 delta 0.090). At 0.5h all 6 rows fail (def A 41->120, B 34->163). Decision differences are measured per scene in out/s3c/decisions.json (def at 0.1h: 161 exposure segments of ~77k, 5 corner ok flips, 12/182 cap runs; g41_user_tw64: 34 ok flips + 110 pair changes; ring: 25/51 pair changes). The pair changes are enumeration-order permutations, NOT adjacency changes: a tested frame-side re-pairing (solve frame-adjacent pairs, suppress non-adjacent structure corners) fired 0-1 extra arcs at 0.1h on def/ring/g41_user_tw64/muse_hash and moved no row — reverted. Remaining cost concentrates in exposure flips where structure recorded no covering candidate and in borders whose point count changes (def: only 119/184 borders stable at 0.1h). Ideas: record degenerate (zero-length) pieces for fully covered caps/runs so a flip can expand from a solved edge, or accept fresh-structure rebuilds when the decision-difference count is high. Evidence: .claude/probes/K1240/out/s3c/move*_exact_*.json vs fresh*_exact_*.json (now in the main checkout's .claude/probes/K1240/s3c_out/); Handoff in docs/design/K1240_s3c_decide_once.md.

Claude's re-run on fca93b74 reproduced every row (all 42 exact, move and fresh files equal Muse's; decisions.json identical); a rigid motion is exact (4.809e-9). Per-frame re-decision is against Levi's rule ("The structure is defined once ... Only positions follow the frame"), so S3d drops it; the moving-frame stage after it records every corner (r -> 0 continuously) and zero-length pieces for covered caps and stretches in structure().