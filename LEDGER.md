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

Next free ID: K1079.

## Waiting on Levi

- **K1001** · Corners, sharp or round: where two threads split, the corner is a sharp point (K1040 F1 row 8: r goes to 0
  as the room closes); stage 1's b16 rounded it into a small arch (not landed). Levi sees it in motion at K1040 S4b,
  behind its flag; there is nothing to look at before then.
- **K867** · Plain-HTTP links (no AudioWorklet) fall back to the legacy synth, which played out of
  tune. Muse's in-tune voice is parked at 69e079eb, awaiting Levi's timbre verdict (cherry-pick or
  drop); its 5319 server stopped with Muse, so re-serve it with `scripts/preview.ps1` (ledger_notes).
- **K623** · K409's glow covers the dark band under Gone (only a browner tail shows): A as merged, B
  the glow down the middle only, C a faster glow fade, D a longer band (1.0 ctrl) with a dark rim
  past the glow. Rec: D. Sheet: `.claude/probes/K409/out/options/K409_glow_band_options.png`.
- **K617** · HIGH_CONTRAST_MARKER_MIN (1.5) now sits under the default markerSize 2 (K225), so High
  contrast no longer enlarges the markers. Rec: raise it to about 2.75 (the old 1.4x ratio).
  `src/ui/accessibility.ts`; `docs/design/K194_defaults.md` (Handoff).
- **K585** · Mark picks in the open-work report (https://claude.ai/artifact/63Q6FoNk7Bux3BhYQBt5g2):
  Sooner marks, answers, test results and notes save to its db (`picks/<id>`, `tests/<id>`,
  `notes/general`). Read them with ArtifactData, then reorder the ledger. Refresh it from the
  `docs/design/K777.md` Handoff: next when K138 s4 slice 2 merges (the K789 try link) or after
  the next marks from Levi.
- **K261** · K74 stage 2's two calls, built as rec. (Levi may change either): the H-cut share is 1;
  a partial share cuts an even stride. `greedyTrap` is off, so dailies 1-240 sit at 20.0% within
  1.5x (bar 15%). `docs/design/K74.md` ("Calls for Levi").
- **K260** · The burn race's calls 2-4 (K114), built as rec.: Reset keeps the fire (fuse relit); the
  fire and the turn minotaur are exclusive (structural since K534's `gameMode`); fog stays its own
  param. `docs/design/K114_burn.md` ("Calls for Levi").
- **K251** · A displaced edge indicator crosses the open phone panel in a 0.25 s slide (K198): keep
  it, or fade the disc out and back in? `docs/design/K198.md` ("Stage 2 handoff"); sheet
  `.claude/probes/K198/stage2/out/contact_sheet.png`. The phone half is moot since K468's
  full-screen sheet: desktop and tablet only.
- **K245** · How hard should the minotaur roam toward the player (K174)?
  K534's `minoPull` slider defaults to 0.5 (63% of games meet it); only
  that default needs confirming. `docs/design/K174.md`.
- **K241** · Should a reset's gold webs fade out too (K191's call 1)?
  Only a backtrack fades; a fade needs a second shader base.
  `docs/design/K154_K169.md` ("Stage 2 handoff").
- **K238** · K111 stage 1's four calls, for review: High contrast's look, the Accessibility folder
  first, "Reduced motion" driving Motion, OS reduced motion stilling the flow. `docs/design/K111.md`
  ("Stage 1 handoff"); screenshots `.claude/probes/K111/out/`.
- **K229** · K92's badge row puts the open panel's top at 90 px (100 on
  phones, was 50). Accept it, or move the badge elsewhere while the
  panel is open? `.claude/probes/K92/out/phone_open.png`. The phone side is moot since
  K468's full-screen sheet: only the desktop and tablet side panel loses the row.



- **K162** · K147's calls: the slow-motion first settle, the defaults (`settleBudget` 12 ms,
  `loadSettle` 0.45 s), daily-exempt, a drag budget. Levi plays first. Since K7 the budget runs
  only in-thread (`phw=0` or a failed worker): calls 1-3 cover that fallback. `docs/design/K147.md`.
- **K184** · K155's star calls, built as noted: exactly two stars for
  greedy solves; catches cap a finish at two; "2.2× the shortest route",
  not a percent. `docs/design/K155.md` ("Stage 1 handoff").
- **K185** · The still pluck's cold-link stall (about 340 ms, first use): (a) accept it (rec.),
  (b) `KHR_parallel_shader_compile`, or (c) warm it at load? Probably moot: a later shader warm-up
  links its program early (unmeasured). `docs/design/K104.md` ("Stage 1c handoff").



- **K394** · The overnight of 2026-10-14/15 (`docs/design/overnight_2026-10-15.md`): eight
  calls (F1-F8), each built as recommended (rec: keep all). Its six questions are answered
  (2026-10-15) except the spline bend (K90; asked in K339 and K361).
- **K400** · K114 s2 (`docs/design/K114_stage2.md` "Questions"; recs build unless Levi objects):
  realtime dot at constant pace, moveSpeed unused (rec. (a)); one fireSpeed/fireDelay (K440 split it:
  `fsr`/`fdr`); lose when the fire reaches you; realtime queues taps; `fireClock` a Burn race row (K323).
- **K401** · K80 turns s3 (`docs/design/K80_turns_stage3.md` "Questions"), all six built as rec.;
  only the chevrons wait (on K696): 3a, 3b after K290 3b; guard/stalker rows per model (rec. (c));
  wait keys `.`, Space; pad center waits; turn pull own param (0); K293 (d), (f) stay lore.
- **K406** · K395's CAP_ROUND: 1.5 (as built, = COLLAPSE_ROUND) or 3 (tip inner edge turns +19° to
  +42° not +31° to +56°, flat arch, 0.02-0.03 world less inner swing; 6 looks like 3). Live as
  `PluckOverlay.capRound`; sheets `.claude/probes/K395/out/`. Stays 1.5; decide with K405 (same tip).

- **K515** · K480 stage 2's look, built as recommended (Levi may change): a hovered tap's whole route at the hover breath, its tapped run keeping the rim glow, non-route branched arms keeping their trains; plus page-probing the hover route with a real pointer (desktop, and in K500's phone pass). `docs/design/K480.md` ("Stage 2 handoff"). The page probe is partly done: desktop by K500, the touch half in K529.

- **K545** · K481 stage 3's look for Levi (built as recommended in 31b2238): lit tick + moved ring on hover/press, phone bigger ticks with the caught-choice tint at the head (desktop ticks alone); the real-phone sheet is in (round 2026-10-20, `.claude/probes/rounds/2026-10-20-d0406df/k545/sheet_k545.png`: a press lights choice 0, the lit tick subtle on a still) and Levi's call whether the tint should show on desktop too. `docs/design/K481.md` (Stage 3 handoff); `.claude/probes/K481/stage3/`.
- **K571** · The title is part of the maze (Levi 2026-10-20: "a fundamental maze-model-altering
  setting"): `dtt` leaves the daily-exempt set and the saved prefs, turning it on makes an ordinary
  design (fresh progress, no daily credit), and the daily is the plain form. Asked: what a titled
  custom design's thread says (rec. "Knotmaze"). The build revisits K565, K566 and K552's C1-C3
  (K581). `docs/ledger_notes.md` (K571).
- **K581** · K558's C1 (lifted-pen strokes after the whole text's body, left to right) and C2 (pnr
  exempt from the daily, a look preference) stand as built unless vetoed (`docs/design/K558.md`,
  Calls). K552's C1-C3 are revisited by K571's build.
- **K586** · Confetti shine strength (`cfh`, default 1, range 0-2) and foil share (`cff`, default
  0.3): pick from `.claude/probes/K337/sheet/strengths_phone.png` or `strengths_desk.png`, or try
  `&cfh=` / `&cff=` live. Built at the defaults (K337); nobody has watched it live yet.
- **K601** · K456's three cover calls, built as rec. (Levi may change any): the ink cover hides the
  HUD and panel for the whole loss; its message and Reload wait 3 s of visible loss; no automatic
  reload, so a failing GPU cannot loop the page. `docs/design/K456.md` (Handoff).
- **K606** · K580's rest: Q3, the wider i and a (i 40 -> 58 GU, a 104 -> 120; built so, reversible);
  and my reading of Q2: the fork rule (15 deg, 1.2 LU) stays for ordinary forks, waived for tangent
  joins. `docs/design/K115_stage9.md` (Handoff).
- **K610** · Grab chase rate, a feel call: K827 raised the cap 0.6 -> 0.8 on measures (daily drag
  frame p50 72.3 ms at 0.6, 55.1 at 0.8 and at 1.0). Levi's feel call on the drag stays open;
  `&gcr=1.0` tries the higher cap. `docs/design/K370.md`; full text: `docs/ledger_notes.md`, K610.
- **K624** · The lit fuse keeps the ember on both sides and no band under both looks (K409; Levi's
  calls don't cover it). Give it Gone's shape too? Rec: yes, one fire look.
- **K625** · K137's calls (`sooner_20261020.md`): (a) stages s2 helpers, s3a/s3b minotaur, s4 looks;
  (b) a broken run blocks the minotaur and fire; (c) strict par's slack: K155's middle profile
  strict half the time; (d) dead ends exempt from snaps. Rec: all yes.
- **K626** · K525's telegraph styles (`mtl`): rims, line, both (or a fourth), in red or white like
  the hover. Red can't pass for your hover but reads worse on a red section. Rec: the three, in red;
  K525's sheet shows white too.
- **K627** · K114's spider (call 7): S, the minotaur engine with its own icon, or M, which adds
  spinning webs. Rec: S first.
- **K628** · Confetti: (C-1) does the finish spray throw streamers? Rec: K336's sheet decides. (C-2)
  when does K579 (GPU confetti) go? The phone check: the fall is ~50 fps, not CPU-bound (a tenfold
  CPU cut gave +0.5 fps). Rec: after K318 s1.
- **K629** · K546's Q1-Q7 (`K546_loss_effects.md`) set stages 2-4. Levi (2026-10-22): the recs stand; for the side cannons Levi wants more spread (K812 follow-up in the param batch). Rec, the design's: sparks; contact, 0.35 s, ~1 s, no
  skip; ash + vignette; a `lossAmount` slider; fire ends Burnt at the beat's end; full beat, then
  restart; dull pluck + thump (fire too).
- **K630** · K244: should a press in a junction core also silence its release when the grabbed
  particle's site draws? Today 8 of 12 core presses pluck a drawn neighbour. Rec: no; what sounds
  always draws, at the grabbed site.
- **K636** · K324 s1's two calls (`docs/design/K324_s1.md`, Handoff): (a) hunt pace 0.9 of yours
  restores the greedy player's catches, the fleers within 4-5 points; rec keep (revert: `git revert
  fd230f1`); (b) five panel labels cut to 23 characters; rec keep.
- **K647** · Path 8 (K336): Reset path during the winning move throws the confetti and records the
  result, but shows no banner. Rec: show the banner, since the result counts.
  `docs/design/K336_cannons.md` Handoff.
- **K655** · K137's slack default: shipped 1 in [0, 1] (greedy makes strict par 30%, careful 89%);
  the brief's half-of-greedy target needs 3 in [0, 4] (48% / 100%). Rec: 3 in [0, 4].
  `docs/design/K137_s1.md` Handoff.
- **K656** · K137's snap strands 40 of 50 greedy and explorer games (crack: none; the design
  expected about 2 in 3): healing runs, a hard label, or a way out under the chase or fire (no Undo
  there). Rec: the hard label.
- **K664** · K74 s3's trap-zone finish (9ccf360, K637) lengthens greedy games: 3+ catches 23% to
  33%, solve p90 181 to 310 s, 6% of no-minotaur greedy walks unfinished at 900 s; the dailies ship
  it. Wanted? Rec: keep (it is the trap).
- **K667** · K324 s3's real-time defaults: stalker accuracy 0.45, guard sight 20 / 30 u, guard
  accuracy 0.4 (the turn clock's: 0.3, 30 / 40, 0.3). Rec: keep; greedy catches then match the
  hunter's, 2.5-2.7 a game (sim table: `docs/design/K324_s3.md` Handoff).
- **K671** · Remove 16 merged, clean agent worktrees (a035f2e7 a3a9d69f a57e1aa8 a5b99d86 a5c384f5
  a90a739a aa8bfad6 ab57cd38 ab96ea9e ac1c3e02 ac645b91 ac64a844 adaaf5d4 adfeea92 ae12adbf
  ae18c5a4) with `.claude/probes/K161/cleanup.ps1` (DryRun first; copies probes, keeps branches).
  Rec: yes.
- **K680** · Streamer coverage: on desk the K336 streamers cover a fair part of the knot at 2-3 s
  (K653 sheets; the Pixel's at 0.35 and 0.85 s: `.claude/probes/K662/out/sheet_conf.png`). Keep, or
  thin them? Rec: keep; on the Pixel the cost is flat in the amount, so thinning buys no frames.
- **K681** · K139 collapse mode, six calls, each built as recommended (`docs/design/K139.md`,
  Design): score by length collapsed; free ends only when stranded; a finish strand = Stranded +
  Undo; overrides fragile and par; chase and fire allowed (Restart only); snap look + sound (plays
  every move).
- **K693** · K620: per-side stroke effects on the glyph root, not only the colours? 3fa7aab had
  them, but its shader compiled slowly (loads 45-54 s against 27-33 s). Rec: no, keep the colour
  blend (`docs/design/K620.md`)
- **K694** · K114 cut calls, built as rec (`docs/design/K114_cut.md` Handoff): 1 scissors and Undo
  bottom left, U undoes (Z also moves on AZERTY); 2 a cut tapped mid-move waits for the move; 3 a
  cut counts only toward the cuts row and the share tag. Phone (K703): 15 of 15 checks pass
- **K695** · K324 s2 is live: real-time games show the minotaur next move by default (mtg=0 off).
  Brightness: built B, the lead and the first whole run full, later runs half; A counts the lead as
  run 1. Rec B (`docs/design/K324_s2.md` Handoff). Phone sheet: `.claude/probes/K703/out/rt_p34b/sheet.png`
- **K696** · K324 question 9 (`docs/design/K324_realtime_minotaur.md` section 7): K80 2.7 flowing
  chevrons for both telegraphs, now that stage 2 is live? The last open look piece of K80. Rec:
  decide after seeing stage 2 on the phone
- **K705** · K137 s3a calls (docs/design/K137_s3a.md, Calls for Levi): 1 a minotaur on a breaking
  run finishes it; 2 a catch under lives returns you to the entrance; 3 the sword in real time, runs
  or seconds; 4 a pale-blue flee telegraph; 5 sprint reach in by-length mode; 6 the hearts tag shows
  with no heart lost
- **K706** · K114 walker calls, built as rec (docs/design/K114_walker.md, Calls for Levi): 1 the
  walker keeps right at a strand end; 2 Lead is a puzzle, Go locks the cuts; 3 the whole route
  shows, the next run full; 4 Lead stars 3 at par, 2 at par+1, else 1; 5 in Delay each cut or pass
  is a turn; 6 nothing special for par 0. R.6.2 phone strip: `.claude/probes/K717/out/walker/r62_sheet.png`
- **K707** · Keep it in balance (K114 walker probe): R.3.9 says moat 3 tips it to the walker, but
  the cutter wins 30 of 30 at radius 0-3 at one run a turn, 27-29 of 30 at two; pick the knob and
  define moat (.claude/probes/K114/walker/balance.md)
- **K718** · K580 s5 calls (`docs/design/K580_s5.md` Handoff): the tapered a J bite (0.031-0.059
  LU): accept the square-offset root outline, or lean it (a taper change)? Waist spikes vs T
  (0.012-0.023): accept U as the target? The notaper J seam colour: glyph-only fix (joinery.ts) or
  leave to G4? K643 measured against the bounds (K643.md Handoff): the J bite is 3.1-5.9x the 0.01
  bound but broad, and smooth in stills; the waist spikes are 1.2-2.3x vs T, 0.001-0.003 vs U.
  Phone (K726, Pixel real size): the J bite shows only on ai xh2 tapered (~7 device px); the notaper
  disc is a faint ellipse at xh2; waist spikes 1-4 device px, invisible at 1x; aland at a xh3 has a
  2 px tooth, a hairline arc seam and a 1-3 px waist ledge. Sheets: `.claude/probes/K726/out/glyph/`
- **K715** · adb deaths: a Muse hopnbop session ran headless Godot 4.7.2 (--import, GUT); an editor
  exit runs adb kill-server (shutdown_adb_on_exit, default true; editor settings written at death 2,
  23:50:21; a Godot crash 23:31:56 before death 1). Set it false (claude-config Setup-GodotAndroid.ps1)?
  No deaths during K726 (2026-10-21 02:16-03:02).
- **K721** · K137 sword calls (s3a calls 3, 4), built as recommended: in real time the flee counts
  runs walked (alt: seconds); while it flees the telegraph turns pale blue 0x8fd0ff (alt: no
  telegraph, the glow alone). `K137_s3b.md` Handoff, The calls
- **K722** · The sword glyph is a placeholder (`marker_glyphs.ts` sword, K137 s3b) until Levi
  designs it
- **K724** · K138 plan questions 1-6, all rec yes: rules start in classic play (minotaur and fire in
  s6); an ice backtrack undoes the whole slide; color rule alternate first, then cycle; par rates
  the best legal route; only 4.31 changes generation; turnstiles and tides step on the move clock.
  `K138_plan.md` Questions
- **K727** · K708 defaults call: lives 3 (rec keep: about a third of blind real-time games reach 3
  catches; the turn clock bites only at 2) and swordMoves 8 (a turn-clock breather: a seeker touches
  the minotaur in 0.5%, 19.3% at 20; real-time seeker (K728): taken ~100%, touches 4.4-8.9%;
  if it should slay, change the flee rule or its pace) (docs/design/K708.md, 'K783 and K728')
- **K730** · K720 call 1: the minotaur sounds (catch notes, growl, heartbeat, footsteps) ignored
  Muted and none and played under both; they are now silent with sound off like every other sound.
  Keep that (rec), or give them their own setting? (docs/design/K720.md Handoff)
- **K731** · K720 call 2: the daily address-bar rewrite drops snd, so a reload of a snd=none daily
  plays music. Options: keep snd (or every DAILY_EXEMPT_KEYS preference) in the rewritten daily
  address; save the sound mode per viewer the way Motion is saved; or document it
  (docs/design/K720.md Handoff)
- **K736** · K137 s2 calls, built as rec (docs/design/K137_s2.md Handoff): 1 the spool holds par
  runs plus a 0.3 slack (seed 7: 17 runs); 2 the compass is its own setting (cmp, off), not an
  endless hint; 3 on the phone Hint and Chalk sit bottom left above the cut buttons; 4 the chalk
  tick glyph is a placeholder
- **K739** · K698 walker glow (K713): the minotaur highlight in the walker cyan under the head, at
  its hunting size (3.8 radii) and full opacity, since the plain size read as a faint fringe. Right
  size and opacity? Stills `.claude/probes/K698/shots/` (`docs/design/K698_polish.md` Handoff)
  - Real phone sheet (K749): `.claude/probes/K749/out/glow/sheet_glow.png`; on seed 7 the
    minotaur's start marker sits about 5 css px from the start dot, so its glow is partly hidden
- **K742** · K138 s1 calls (`docs/design/K138_s1.md` Handoff): call 5 built differently, the rules
  turn off while the spool is on (alt: a slide pays its whole length to the spool); hints and the
  compass follow the best legal route; refusals go through K480 targetAt, not a
  refused-runs-in-reach check; cycle glyphs on the head runs deferred (call 4). No grayscale or
  colorblind review of the rule colors yet (alternate 0.8/0.3, cycle 0.8/0.5/0.22)
- **K746** · K137 sprint calls (`docs/design/K137_s3c.md` Handoff, alternatives there): by length
  the pair turn travels half their summed length; in real time a press arms the next two runs, not
  the one under way; key F (Q sits on A in AZERTY); a catch while armed spends it; a restart gives
  it back
- **K753** · K114 beat: the default turn fire burns a hesitant beat player at 0:14 (every forced
  move steps it; `fsp=0.1&fdl=40` passed 12/12). Want a beat-specific fire pace? (Handoff of
  `docs/design/K114_beat.md`)
- **K754** · K114 beat: feel the tempo at 80, 100 and 132 bpm and L 2 vs 3
  (`?7&clk=beat&btp=<bpm>&btl=<L>&am=instant`); at L 2 about a quarter of runs hit the 4-beat cap
  (`btc`). Calls 1-10 in the Handoff of `docs/design/K114_beat.md`
- **K759** · K138 s2 calls 1-5, built as recommended (Handoff of `docs/design/K138_s2.md`): the
  turnstile clock is the move count in every mode, real time too; each turnstile starts at its own
  seeded phase; only a pluck on the same note within 3 runs reveals a hidden run (taps and
  music-mode auto plucks do not); Undo past a reveal hides the run again; par, strict mode and stars
  rate the maze without hidden runs
- **K766** · K114 beat x K138 rules: ice, the color rule, turnstiles and hidden runs pass through
  under `clk=beat` (`fabricRulesOf`), never designed or played against the rider (a refused
  auto-move may stall it). Drop the rules under the beat, or have the rider take the next legal arm?
  (`docs/design/K114_beat.md` decision 7 drops only the cut, the walker and Undo)
- **K768** · K137 s3d calls 1-4 and 8, built as recommended (Handoff of `docs/design/K137_s3d.md`,
  The calls): a catch resets everything but keeps the woken count; no warning before the extra
  monsters move; the follower waits 1-2 moves with a 0.25 shortcut chance (the harshest piece: the
  greedy sim player goes from 2.22 to 9.40 catches a game, 15% unfinished at 600 moves); the
  follower looks like a sleeper asleep, amber waiting, red awake; the share tag shows N woken
  whenever a sleeper plays, 0 included
- **K778** · K138 s3: no Undo control shows while the rules are on (Undo works only inside the
  controller; the Stranded banner needs fragile runs or collapse, which turn the rules off), so a
  regretted one-way move leaves only Restart. An Undo control beside the rules, or a Stranded-style
  check that offers it? (docs/design/K138_s3.md, Residuals)
- **K779** · K137 s4 lures and snares: 20 calls built as recommended, alternatives in the
  docs/design/K137_s4.md Handoff. The weightiest: both tools take no turn; a lure carries 6 runs and
  a cut or broken run blocks it; a lured minotaur drops its hunt; a snare goes only on a run at your
  junction and holds 3 turns; a held monster can still catch you; stocks refill only on a level
  restart
- **K789** · Locks and keys calls (K138 s4 slice 2: built, not page-checked or merged yet): a
  backtrack drops a key its move took, so keys sit only at core junctions; an open lock is hidden
  rather than drawn open; the key and padlock glyphs are placeholders for you to replace
  (`docs/design/K138_s4.md`, its Handoff)
- **K790** · Turnstile dim call (K138 s4 slice 1, live at 3dad5914): arriving at a turnstile by its
  closed arm leaves the dimmed arm as the only legal move, and the yarn covers the dim. Keep it that
  way? (`docs/design/K138_s4.md`, its Handoff)
- **K801** · K138 s4 slice 2 calls (`docs/design/K138_s4.md`, Handoff): keys are placed only at core
  junctions, since walking back out of an off-core key would drop it; and the key and padlock icons
  are placeholders.
- **K806** · K795 beat timing default: one beat per run as built (your first ask: every run takes
  the same time, so the dot speed varies with the run), or whole beats by run length (an even speed;
  junctions still land on beats)? Both stay, as a panel toggle; its options read "same per run" and
  "by run length" (Beats per run goes 1-4), a one-line rename. Rec: one per run (`docs/design/K795.md`)
- **K808** · K795's audit: which constants become params? The beat note's loudness (0.8; rec: a
  param), FIRE_V_REF (12), the sprint's count and factor (2, 2), BY_LENGTH_TRAVEL_SCALE (0.65),
  LAIR_TELL (0.5; rec: no param) (the audit table in `docs/design/K795.md`, on K795's branch)
- **K809** · Panel search on your phone (K793): typing in the box must not jump or zoom the maze, the
  keyboard must not cover the box, results scroll under the sticky bar, and Enter closes the keyboard
  and outlines the best row (an inferred risk, not seen; `docs/design/K793.md`)
- **K1045** · Junction eyes, by look at K1040 S4b: where two junctions sit close, their threads close in a
  small eye of paper. Form B leaves a dot about 0.16 across, today's look a thin lens (0.67 x 0.12), or it
  could be covered (`docs/design/K1040_s1b_holes_fades.md` F1). Nothing to look at before S4b.
- **K1049** · Through-pass bends, by look at K1040 S4b: where a thread passes through a junction and bends, form B
  now draws today's sharp inner corner; S1b and S1c rounded it (`docs/design/K1040_s1d_corner.md` F2, and F6's Look
  with crops). Nothing to look at before S4b.
- **K1051** · Turn on Dependabot for knotmaze (GitHub setting; K994 follow-up, audit clean 732ab944).
- **K1075** · K137 sounds unchecked: the snap pluck and the strand glissando need an ear (left by K658; K658
  doc Findings filed).
- **K1078** · Hand K1040's gated stages to Muse, one per run: S3 (label pass) now, as S1e changes only band
  and corner rules; S1e stays with Claude after Nov 2. S3, S4a and S5 time on the Pixel, which Levi plugs in
  (docs/design/K1040_junction_field.md F7).

## In progress

- **K1040** · Junction renderer redesign (K868's goals): the label, borders and corners as a per-pixel function of the
  frame on the GPU, in two raster passes (a depth-tested label, band strips MAX-blended), checked against form B's
  float64 reference. Plan S1-S8, about 15 h (F7); supersedes K868 and K992. S1 to S1d merged (e8944f2f); S1e waits for the weekly limit.
  - owner: nobody since 2026-10-29 05:24 (S1d merged; S1e waits for the weekly usage limit, which resets Nov 2 11:00; S1d was agent `a370717011c6a40c5` of claude session bf876705-c9fa-4b1f-83ea-e173dac6cff3)
  - branch: mainline; last commit: `e8944f2f`
  - evidence: the design's F1-F7 (`docs/design/K1040_junction_field.md`); `.claude/probes/K1040/` (the timing prototype; the stages' driver in `s1/`, baselines in `s1/out/` (S1), `s1/out/s1b/` and `s1/out/s1c/`, S1d's runs in `s1/out/s1d/`); worktrees `k868-s3a` (oracle30, the recordings `.claude/probes/S3a/seq13/`) and `k992-corners` (the census kit), kept
  - next: S1e (Opus; launch after the Nov 2 11:00 reset): the rate rule at through-pass bends (continuous weights for D1's merged minima, or a burial at the bend that reads depth; F6 is a start), then the corner solve's last discrete edges, F5's #1 +9 and S1's gate (the brief's Handoff, Next 1-3); write its brief first
  - brief: `docs/design/K1040_s1d_corner.md`
  - env: from the worktree, `npx vite --config .claude/probes/K1040/vite.private-cache.config.ts --port 5401 --strictPort --host 127.0.0.1`
- **K863** · Cursive clean slate: trace a real school model's lowercase (Playwrite US Trad, OFL;
  credit it in `notices/credits.ts` if traced data ships) into `cursive_template.svg`'s format, for
  Levi to edit instead of drawing all 26 (Levi, 2026-10-26). Muse's prototype parked at 6639009c.
  - owner: nobody since 2026-10-28 21:07 (agent `a75a5a08dc609c935` of claude session bf876705-c9fa-4b1f-83ea-e173dac6cff3, B4, finished its Order); v6.5 approved 2026-10-29 (K1029); J3c waits for the weekly usage reset, Nov 2 11:00
  - branch: mainline, no code (outputs untracked in `.claude/probes/K863/trace/`: B4's `work25/`, `out25/`); last commit: `67e1bf84` (Levi's v6.4 calls in `K863_trace.md`; B4's Handoff `b6288800`)
  - evidence: `.claude/probes/K863/trace/` (per stage: `tools/*_k<ID>.py`, `work<n>/`, `out<n>/`; `NOTES.md` has a section per version with its rerun commands); Drive `K863/` (each version's SVGs; v5.1: `cursive_v51.svg`, `cursive_v51_words.svg`, `split_combs.svg`, `k917_junctions.svg`; v5.2: `cursive_v52.svg`, `cursive_v52_words.svg`; v5.3: `cursive_v53.svg`, `cursive_v53_words.svg`, `combs_v53.svg`; v5.4: `cursive_v54_words.svg`, `e_joins_v54.svg`; v5.5: `cursive_v55.svg`, `cursive_v55_words.svg`, `combs_v55.svg`; v5.6: `cursive_v56.svg`, `cursive_v56_nodes.svg`, `cursive_v56_words.svg`, `combs_v56.svg`; v5.7: `cursive_v57.svg`, `cursive_v57_nodes.svg`, `cursive_v57_words.svg`, `combs_v57.svg`; v5.8: `cursive_v58.svg`, `cursive_v58_nodes.svg`, `cursive_v58_words.svg`, `combs_v58.svg`; K944: `e_tails_k950.svg`, `words_edit_test.svg`, `combs_edit_test.svg`; J1 uploaded nothing, no visible change; v5.9 = J2: `cursive_v59_words.svg`, `combs_v59.svg`; v6.0 = B1: `cursive_v60.svg`, `cursive_v60_words.svg`, `combs_v60.svg`, `letters_v60.svg`; v6.1 = J3a: `o_exits_v61.svg`, `ot_v61.svg`, `low_v61.svg`, `cursive_v61<a|b|c>_words.svg`; v6.2 = B2: `corners_v62.svg`, `gq_words_v62.svg`, `cursive_v62_words.svg`; v6.3 = B3: `g_top_v63.svg`, `high_joins_v63.svg`, `gq_words_v63.svg`, `cursive_v63_words.svg`; v6.4 = J3b: `o_exits_v64.svg`, `ot_v64.svg`, `cursive_v64_words.svg`; v6.5 = B4: `aq_top_v65.svg`, `aq_joins_v65.svg`, `cursive_v65_words.svg`); Levi's file to edit: `out25/cursive_template.svg` (K1029 passed 2026-10-29; B4's a and q tops on `out24/`'s,J3a's 4 u edit of o on `out23/`'s, B3's g top on `out22/`'s, B2's g and q on `out20/cursive_template.svg`, which `work20/dbg/build_from_svg.ps1 -Name k990` built on B1's join sets, `work20/template_map_k990.json`); B1's census `out20/census_v60.txt`, distances `work20/fit/bodydist_k990.txt`, locality `work20/local/b1/sensitivity.txt` and `work20/cmp_j2_b1.txt`, debug scripts `work20/dbg/temp_k990/` (rerun list: B1's handoff); J2's census `work19/dbg/census_k962.py`, crops `work19/crops/`, locality harness `work19/dbg/sensitivity_k962.py` (rerun list: J2's handoff); J3a's census `work21/dbg/census_k1009.py`, rerun `work21/dbg/checks2_batch_k1009.ps1`, Levi's two pictures `work21/levi/` (made by `levi_crops_k1009.ps1` there); B2's record `NOTES.md` `## K1012` (N1-N10 with rerun commands), build `work22/base`, rerun `work22/dbg/checks_k1012.ps1` (census, compare, distances, word sheets, guard), the high-entry check sheets `work22/sheets/`; B3's record `NOTES.md` `## K1019` (N1-N6 with rerun commands), builds `work23/base_a` (v6.3a) and `work23/base` (v6.3), reader `work23/dbg/asdrawn_k1019.py`, census `work23/dbg/census_k1019.py`, rerun `work23/dbg/checks_k1019.ps1`; J3b's record `NOTES.md` `## K1009b` (N1-N7), ports `work24/ports_k1009b.json` (v6.4 = H; ot's tangent = Ht), the before build `work24/b0` (built through B3's reader, `work24/b0_build.log`), sheets `out24/` (v6.4) and `work24/sheets/`, tools `work24/dbg/{gen,census,sheet,locality}_k1009b.py`, checks `work24/dbg/checks_k1009b.ps1`, locality `work24/locality_k1009b.txt`; B4's record `NOTES.md` `## K1029`, tools `work25/dbg/*_k1029.*`, build `work25/base` (v6.5), sheets `out25/`
  - next: J3c (Sonnet; after the Nov 2 11:00 usage reset; its brief is not written yet) on v6.5's bodies: o's joins from b0, og from v6.4 and ot's tangent entry (Ht), per Levi's calls of 2026-10-28 (`K863_trace.md`), with b0's maxfev stops, oe's crossings and Ht's 0.0017 u clearance fixed and each visible change shown beside b0; every other exit (b, v and w high; into g at v6.3's attach, K1026), the joins into a and q (K1027), J3a's, J3b's and B4's leftovers (K1014, K1035, K1036, K1044), the leads and tails (K1006), f's lower-loop end into its exit (K990), K991 and K948 for the remaining pairs, K937, K997, K998, and the join sets removed; then Levi reviews again; Levi edits the newest `cursive_template.svg` once the letters look right and `build_from_svg.ps1` builds from it; K927; then map the letters onto threads (the a/c/d/g/o/q junctions and the top corners of a, g and q, `K863_trace.md` ## Levi's calls); capitals are K931
  - brief: `docs/design/K863_trace.md` (## Levi's calls); stages: v3 `K886_cursive_v3.md`, v4 `K902_cursive_frames.md`, v5 `K904_cursive_v5.md`, v5.1 `K916_cursive_v51.md`, v5.2 `K925_cursive_v52.md`, v5.3 `K930_cursive_smooth.md`, v5.4 `K926_cursive_e.md`, v5.5 `K945_cursive_v55.md`, v5.6 `K959_cursive_v56.md`, v5.7 `K965_cursive_v57.md`, v5.8 `K969_cursive_v58.md`, K944 `K944_cursive_asdrawn.md`, J1 `K980_cursive_local.md`, J2 `K962_cursive_joins.md`, B1 `K990_cursive_bodies.md` (## Handoff), J3a `K1009_cursive_ports.md` (## Handoff), B2 `K1012_cursive_gq_corner.md` (## Handoff), B3 `K1019_cursive_b3.md` (## Handoff), J3b `K1009_cursive_j3b.md` (## Handoff), B4 `K1029_cursive_b4.md` (## Handoff)
- **K114** · Gameplay round 2, designed in
  `docs/design/K80_gameplay_additions.md` section R: burn race, cut
  verb, beat rider, spider, Pluck Hero MVP. Levi took the recs (calls
  1-6, 8-10; call 7: a separate spider enemy, a no-spiders setting that
  swaps its icon). Burn stage 1 merged (`src/game/fire.ts`; calls K260,
  K280, residuals K281).
  - owner: nobody since 2026-10-21 13:04 (merged; agent `a178a00897a4044dc` of claude session 91b19e11-7759-4638-ba60-4705b011b94f)
  - branch: mainline; last commit: `cf41f919`
  - evidence: `.claude/probes/K114/beat/`
  - next: a real phone pass and Levi feel of tempo/L and the pulse (the spoken-finish-time quirk located 2026-10-21: no speech code exists; a clock switch from any mode restarts the solve, symmetrically - switch_probe.mjs; the While-riding page order passes 12/12 - see the K114_beat.md tail note)
  - brief: `docs/design/K114_beat.md`
- **K115** · Cursive text (Hershey Script Simplex + Greek; `docs/design/K115_cursive_text.md`). Stages 1b-6c done
  2026-10-18: 1b cb7d006..bc357c4, walk 354f8ce, title 6625160, cartouche 1e0a2eb, emblems 2c19d10+dc9bbd0,
  capitals e64f4d6, accents fa1b1ae, Greek 54612f2 (suite 1521 green). Levi (2026-10-19, Daily #8): redesign first.
  - owner: nobody since 2026-10-20 13:01 (stage 9 merged at b90c5df; waits on Levi's calls, K580)
  - branch: mainline; last commit: `b90c5df`
  - evidence: .claude/probes/K115/stage9/ (main checkout since the merge: stills shots1-4, the a search, suite_final.log); stage 8's .claude/probes/K115/stage8/
  - next: Levi's calls (K580); then the rest of the set under the lint, the class-pair lint and items 5-7 (reveal, metrics, sheets); then Levi's look, the final ς (K582), stage 7's live dates, K557, K569
  - brief: `docs/design/K115_stage9.md`
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
  `docs/design/K80_gameplay_additions.md` section 0, Levi's answers in
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
    Next: the chevrons, once Levi answers K696 (K324 stage 2 merged in 031e09a). Check their main.ts
    overlap with the K114 walker before running them together.
    Before a daily pins a minotaur, waits enter `fc.taps` and K47's fingerprint covers its
    params; real time's phone check is K177
  - brief: `docs/design/K80_turns_stage3.md` (3b: sections 2.7, 2.8, 2.10; "Stage 3a handoff");
    `docs/design/K80_turns.md`; `docs/design/K80_realtime.md`; `docs/design/K80.md`
- **K156** · The round phone pass, `scripts/phone_pass.ps1` (K152 (1),
  from K81's gate kit): two builds run interleaved through a frame bench
  and a JSON looks list into a summary and sheets. Stages 3a-3c merged
  (6521bb2..de5f39e); rounds 2026-10-14, 14b and 14c are done (14c
  merged e6c6034..aa3cdd1).
  - owner: nobody since 2026-10-27 13:23 (round 27c merged in a9c4dfec)
  - branch: mainline; last commit: `a9c4dfec`
  - evidence: .claude/probes/rounds/2026-10-27-01df23a5/ and its -g31 twin, .claude/probes/rounds/2026-10-27c/ (main checkout, untracked); the kit is scripts/phone_pass/
  - next: a later phone window: K568's confetti recheck (K896), the kit fixes with an m11 A/A floor (K895), K919's compile-out if one is built, and `k539_g31.mjs` and `pixdiff_g31.mjs` once (only parse-checked, K907). The d0406df..01df23a5 bisect is done (K893, K906).
  - brief: docs/design/K156.md, "Round 2026-10-27"
  - env: none; the pass builds and serves both builds itself (ports
    5480-5489); check nobody is using the phone first (K234)
- **K268** · Shaped crossing gaps under thread reveal (K76; Levi, 2026-10-14):
  no gap until the over thread is seen, a dynamic gap for a stub's overlap and
  dead ends. Stages 1-2 merged (stage 2: 189b024..f799991; MAX fixed, joints fade).
  - owner: nobody since 2026-10-15 11:22 (stage 3a's agent `a5d9b049e72746ad2` of claude session 05e60da0 finished; merged 11:26, worktree on K161's sweep list). Stage 2's agent `a42c63c2db0401edb` (session d8031183): worktree swept; stage 1's `ab65d913a3b9a3dcb` is left, locked by the live Claude process (K161); branches kept
  - branch: mainline; last commit: `377bc41` (K430 ramp; G3-1 3465090 before it)
  - evidence: `.claude/probes/K268/stage3a/` (census3a.mjs, 31/31 on master; sheet3a.mjs; the k76_probe.mjs copy with the bit-exact view wait; `out/`); `.claude/probes/K268/stage2/`; stage 1's beside it
  - next: Stage 2 item 2 is COMPLETE (ramp 377bc41, PROTECT 1fc9458, far-branch this commit: the smooth-min blends vis-weighted cuts, census3a 22/31 = baseline, K537's 9 fails unchanged; evidence `.claude/probes/K268/stage3a/out/census_far1/`). Items 5/6 closed 2026-10-21: item 6 already landed (program_registry.ts registers arm-strip-explore, junction-field-explore, pluck-still-explore); item 5's desktop eye passed (`.claude/probes/K268/intro_eye/` r0/r2: joints emerge with their arms in the close-in, no popping fans). Left: the phone proof, riding K156's next window. Probe fixes: K431 (narrowed), K432; far-branch GPU isolation is K547
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
  - next: G3-1 (`34650901`) stays despite +24.5 to +48.0 ms of phone render sync until K868 settles the gap search (Levi, K892). G3-2 landed (957ba833 seam, K816 855bea23 ribbon_sdf, K825 explore variant, K826 mitered silhouette; the residual A/B diff is uniform and needs the same-state capture). Desktop bench 2026-10-22: SDF frame p50 0.3 ms / 10 draws vs strip 1.1 ms / 102. G3-3 (default flip + strip deletion) waits on Levi's phone look and on a phone render-sync measurement of `?rp=sdf`. Lane: G4-1 is replaced for the border look by K868; never beside an R stage, K268 item 4 or another GPU measurement; may run beside K7. K90 stopped (Levi 2026-10-20)
  - brief: `docs/design/K8_G3-1.md`; G3-0's handoff: `docs/design/K8_stage1.md` ("Stage 2 handoff")
- **K5** · Split `main.ts` and `ribbon_renderer.ts` along K1-K3's data lines, with seams so G3 becomes a module
  swap; K6 rides it (`docs/design/K5_K6_split.md`, calls K377). Merged M1-M4 (`src/app/`: camera, frame_loop,
  lifecycle, scene, audio_map; M4 at 9f08bf0): main.ts 5709 → 3725 lines; R1-R2 (`src/render/ribbon/`; R2 at 52faab8): ribbon_renderer.ts 7747 → 5989.
  - owner: nobody since 2026-10-15 15:00 (merged)
  - branch: mainline; last commit: `3166d8f` (R5 1c666ec + e53e4d9, M5 3166d8f)
  - evidence: M4's `.claude/probes/K5/M4/` and R2's `.claude/probes/K5/R2/`; M3's `.claude/probes/K5/M3/` (`checks/`, `frames/`, `step2/`, `k7_results.jsonl` and `k7_table.mjs`, `checks_m3.ps1`, `remap_e6e1734.md`), `.claude/probes/K5/R2/brief/` (the R2 brief's maps), `.claude/probes/K5/R1/` (`checks/`, `checks2/`; `checks3.ps1`, the fog B-vs-B control, never run; R2's inventory `parts.md`, `probe_surface.md`, `surface.json`), `.claude/probes/K5/M2/`; stage 1's tools in `.claude/probes/K5/stage1/`; the design's region maps in `.claude/probes/K5/design/`
  - next: R4 done 2026-10-21 (pluck_host 98d96fa5, strip_pass; Handoff in `docs/design/K5_R4.md`); next in the lane is K8 G3-2, then G4-1 before R5. M4 leftovers K506.
  - brief: `docs/design/K5_K6_split.md` (Stage M4 brief); the R lane `docs/design/K5_R2.md`
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
  - next: item 1 CLOSED 2026-10-21 (hypothesis (iii) rejected, 0-px slot-reject diff; no truncation reproduced at 20 moves - see the Handoff's Open list) and item 3's silence landed in cb4f9199. Left: the free cap's checks (K477: base collapse, tip AA, pinned cap) and the phone free-end look, both Wave 5/eye work
  - brief: `docs/design/K459.md`
- **K370** · Worker input latency, p50 (target 50 ms). Stage 1 merged (8feca6b): raw pointer
  input on; desktop means daily 118 -> 110 ms, knot 93; phone about 185 (before 0753b3c). 50 ms
  needs fewer or cheaper substeps (K610, K316), main's drag frame under 12 ms (K611), and B.
  - owner: nobody since 2026-10-20 15:55 (merged; agent `aa8bfad6d1cc3d6bf` of claude session 91b19e11-7759-4638-ba60-4705b011b94f)
  - branch: mainline; last commit: `8feca6b`
  - evidence: `.claude/probes/K370/`
  - next: stage 2 briefed (`docs/design/K370_s2.md`); desktop half done 2026-10-21: the worker substep premium does not reproduce (daily +4%, knot +4% per substep; no lever built; Handoff in the brief). Left: the phone half in the Wave 5 window (re-measure post-`0753b3c`, cpu6 clock, paused-render drag)
  - brief: `docs/design/K370.md`
- **K580** · The a's J join, Levi's call (2026-10-20): tangent, its shared stretch a TAPERED spur that
  leaves the junction as wide as both merging strokes and narrows to normal where they turn collinear.
  Open calls: K606; the paint stage is K620. `docs/design/K580.md`; stage 9's handoff `docs/design/K115_stage9.md`.
  - owner: nobody since 2026-10-21 00:58 (merged; agent `a01b18429832678fd` of claude session 91b19e11-7759-4638-ba60-4705b011b94f)
  - branch: mainline; last commit: `e92ce80`
  - evidence: `.claude/probes/K580/s5/`
  - next: Levi calls K718 and K606, then a stage for the chosen fixes; K643 lint upkeep; a phone glyph look
  - brief: `docs/design/K580_s5.md`
- **K546** · Loss effects (Levi, 2026-10-16): a catch ends early today - animate the player and the minotaur/fire all the way to their meeting point first (contact t is computed in by-length mode; turn and realtime catches leave a visual gap), then a gratuitous contact effect at the meeting point plus a whole-screen loss effect akin to the win confetti. Levi's seeds: an explosion; a flare-up and burn-away; the player indicator ripped in half and falling over. Base to build on: K80 3b's catch feedback (dcdfaf4) and K270's fix; the fire side is K114. Design: `docs/design/K546_loss_effects.md`. Its q8 is answered (K525).
  - owner: nobody since 2026-10-20 18:25 (merged; agent `a57e1aa8c7ba233b0` of claude session 91b19e11-7759-4638-ba60-4705b011b94f)
  - branch: mainline; last commit: `5a8fa18`
  - evidence: `.claude/probes/K546/`
  - next: stages 2-3 landed 2026-10-21 (Handoffs in the design doc; contact sheet `.claude/probes/K546/s3/`); stage 4 (ripped in half) waits on Levi's Q1 after seeing the sheet
  - brief: `docs/design/K546_s1.md`
- **K137** · K80 section 4's cheap (S, S-M) mechanisms, each toggled (Levi 10-13), after the
  minotaur: 4.3, 4.7, 4.9, 4.10, 4.13-4.17, 4.21 (after K85), 4.26, 4.28-4.30, 4.32-4.34, plus
  Levi's sleeper variant. `K80_gameplay_additions.md`, stages in `sooner_20261020.md`; M: K138, M-L/L: K141.
  - owner: nobody since 2026-10-21 12:49 (merged; agent `ab3d78ded2f219f62` of claude session 91b19e11-7759-4638-ba60-4705b011b94f)
  - branch: mainline; last commit: `20b01d7e`
  - evidence: `.claude/probes/K137/s4/`
  - next: the s3b sims and the K784 phone batch (all look pieces done 2026-10-21: scent 4.34, the fray, darkness/lantern 4.17, sonar 4.26, tunnels 4.13; Handoffs in docs/design/K137_s6.md); muddy runs done in this merge
  - brief: `docs/design/K137_s4.md`
- **K138** · K80 section 4's M mechanisms (Levi 10-13, `docs/design/levi_notes_2026-10-13.md`),
  after K137: 4.1, 4.2, 4.4 (then 4.5), 4.6 (simulate first), 4.11, 4.12, 4.18-4.20, 4.23, 4.24,
  4.27, 4.31; 4.1, 4.2, 4.4, 4.11, 4.24, 4.31 change generation. M-L, L: K141. Plan it after K137 s2.
  - owner: nobody since 2026-10-21 10:36 (agent ac3462d3821227d69 of claude session 91b19e11-7759-4638-ba60-4705b011b94f; paused at the end of slice 2 per Levi)
  - branch: mainline; last commit: `13758f2b`
  - evidence: `.claude/probes/K138/s4/` (census/, page/ with locks_page.mjs and out/, the test and build logs)
  - next: locks vs the minotaur/fire once rules leave classic (slices 3 shortcut + 4 colors done 2026-10-21, Handoffs in docs/design/K138_s4.md)
  - brief: `docs/design/K138_s4.md` (Relaunch 3 Handoff and its Remainder)
  - env: vite with `.claude/probes/K138/s4/vite.private-cache.config.ts` on port 5402

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

- **K875** · K868 S1b, master's side: on Muse's link master registers only 58-80% with the oracle at
  j49/j123 and #6 finds every band end off (18/18, 19/19; cause untested: gaps or a reveal/fog state);
  its sdf and strip silhouettes differ in width; joinery.ts:1469-1471's comment is stale. s1b_oracle.md.
- **K876** · K868 oracle image probe: auto ink (pink on light paper) and markers/arrowheads count as ink,
  so sheet D fails every image check. Rerun D on the dsf 3 shots, dark paper and cr/fl variants, add
  exact-field checks on S1a's scenes and a bounded reach; compare the END tuck with §3.6.
- **K785** · Lore attach cost (frame_loop.ts narrowed in 2dc2af1d, 12 rules files to 2; the other hubs open): reading `src/app/frame_loop.ts` attaches 11 rules files (about 28k
  tokens), and the K774 reading set (main.ts, frame_loop, minotaur_turns, input_keys,
  fabric_maze_renderer) about 60k. K774 and K138 s4 compacted 7 and 9 times in their first 30 min
  with no commit (2026-10-21, agent_watch). Narrow each rule to the files it documents rather than
  every caller (`docs/lore_index.md`, K173, K437); re-measure with a fresh agent
- **K784** · Phone sitting 6 on real touches: one-way runs (K138 s3, ow), lures and snares (K137 s4,
  lur and snr; emulated only so far), the K775 overflow, and a touch press on an unrevealed hidden
  run (the K764 case); plus the beat rider's catch (K774: `.claude/probes/K774/beat_phone.mjs`
  check B, unrun on the phone); and the turnstile dim on a real phone (K138 s4 slice 1, 3dad5914;
  K760)
- **K579** · GPU confetti: upload each launch once, move the pieces in a vertex shader, no per-frame
  CPU sim or upload. Pays if K318 raises the counts (Levi asked 10-20); needs K307's warm-up;
  streamers need a CPU sim. The phone's fall isn't CPU-bound (K578). K628.
- **K797** · Paper look, one param per stage (Levi 2026-10-21, `docs/design/levi_notes_2026-10-21.md`; sooner list; sequence `docs/design/pickup_sequence_2026-10-21.md`): stage a (paper backdrop) done in b8473f19, b (fill/border/both prototype) in 8d021628; c (gap 0) done in b6585962, fans/plucks follow the look in e75e7e0d; next d (textures, perf-gated):
  a white paper background (from `vellum`); a thread look of fill, border or both (an edge stroke on each side; over,
  under and joins read from the strokes); the Crossing gap row down to 0 (its floor is 0.04; the codec takes 0); solid
  or textured fills and borders (pencil), if fast enough.
- **K409** · Levi's burn calls 1-3 merged (6b9eb8f..3231d59). Left: step 4, the ember over the smoke
  (NOT BUILT in `render-explore.md`), after K525 (paint files) and K623/K624. The phone sheet passed
  (K631 part 1, 10-20). `docs/design/K409.md`.
- **K412** · K7's worker-chunk modulepreload on a real network (measured only on localhost): a
  fresh-profile load of https://levi.dev/knotmaze/ through `stage7/k7_frames.mjs`; its `wk` column
  reads `c` when the worker's fetch came from the cache through the proxy. Rides K7's phone pass.

Every other item below waits on the trigger it names.

- **K557** · `RUN_FLAG.TEXT`: one text color for the cursive, optionally a reading-order gradient, plus a paint
  override for lent segments (`docs/design/K115_cursive_text.md` 572-583; deferred by `K115_stage4.md` 252-266).
  After K115's redesign.




- **K531** · Daily determinism at launch (K210 answered by Levi, 2026-10-16): past dailies must be deterministically reconstructible as (app version -> that version's frozen PARAM_DEFAULTS) merged with (daily-specific params/custom overrides for that day); post-launch changes must not significantly alter previous dailies. Implementation: frozen per-version defaults table + per-day override table, published days immutable; folds K82 in; lands at launch prep.
- **K533** · Backend daily precomputation (Levi, 2026-10-16, future): regularly precompute and cache daily designs on the backend and serve current + previous dailies, moving daily-calculation logic server-side so future dailies cannot be anticipated client-side. Explore/design/implement later alongside accounts/logins/data persistence (K144). Depends on K531's determinism design.
- **K345** · The hover rim stops `rimGap` (0.975 world) short of junctions; Levi (2026-10-14) wants it
  to follow the fillets. Rides K868/K9's field (it gives junctions an across coordinate); fan work
  now is wasted.
- **K240** · High contrast for the DOM chrome (K111 follow-up): a CSS layer on
  `:root[data-contrast="high"]` (already set) for the panel, HUD and badge (TS-injected styles).
  Small; after K238's review.
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
- **K9** · G4: junctions from one field, not fans and joinery. The border look goes first (K868); K9
  follows its integration: the fill look on the same field, the traveled route as the union of the
  traveled pieces (K81), G1's x160 leftover (`.claude/rules/render-gaps.md`), then the fan deletion.
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
- **K313** · A loader that looks like the maze (`docs/design/K313_loader.md`): stage 1 (desktop)
  done in K824. Left: stage 2's phone measures in K156's next pass, then camera and trail tuning
  with Levi. Full text: `docs/ledger_notes.md`, K313.
- **K326** · Drop knot mode (`mazeFabric`; `docs/design/K323_game_mode.md` s4-5): A done, the maze
  golden (057c5173); B deletes (after K323 s1, K307 s2, K329), retargets `scripts/fold_census.*`,
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
- **K318** · Win effects (Levi 10-14): one show, many themes; thirteen themes in a Win effects
  folder (Theme dropdown, Party default), built in twelve stages. Stage 1 after the confetti stage
  and K111 s5. `docs/design/K318_win_effects.md` ("Build stages").
- **K365** · K279's phone round: run the fixed `k279_phone.mjs`, pick the
  ripple's CSS floor (56 or 68; rec 56 unless it reads small), and only if the
  phone drops frames, a bbox replay (K279.md "Stage 2 handoff").



- **K376** · Look at the reveal's intro close-in, joints now fading with their
  arms (K268 s2, desktop only so far), on the desktop and the phone; fix any of
  the stage's four small residuals that show (`docs/design/K268.md`, "Stage 2 handoff").
- **K368** · A ring for the ripple under High contrast (K289 e; Levi, 2026-10-15: yes):
  `HIGH_CONTRAST_OVERRIDES` (`src/ui/accessibility.ts`); the glint has little room on light threads over black (inferred, not shot; fallback a stronger glint). Small: a unit test and a screenshot.
- **K485** · Pixel pass for the phone sheet and row help (scripts/phone.ps1): the sheet query, Back,
  the peek, help taps; K467 ran only in phone emulation
- **K486** · Touch help for the panel's buttons: Reset path, Replay settle, Reset to defaults, the
  seed row, the dice, Daily, stats (K467 covered the 161 rows only)
- **K543** · K74 stage 4's before/after sheet of three finishes (searched vs shipped, dailies 1-3) was not made in the build stage; make it from `.claude/probes/K74/stage4/build_measure.ts` output or a diag_screenshot pair when Levi wants the look check. Sheet: `.claude/probes/K74/stage4/sheet/contact_sheet.png` (`notes.md` beside it).

- **K548** · Overnight runner has no usage gate: the 92% weekly pause (Next binding rule) is checked by hand only; 2026-10-15/16 runs 1-6 launched at 88% (under the line, audit 2026-10-18) but nothing stops a launch over it. Add a /usage check to the runner before each batch, or a ledger-stamped usage line per run close.
- **K549** · Text scene fit ignores the open panel: a wide word's exit side sits under the panel (stage 2 probe stalled at tn97 by mouse; programmatic walk solved). Fit text scenes against the panel-cleared range like mazes (K198 view clamp), or close the panel for text scenes.
- **K569** · After K115 stage 9 (Levi, 2026-10-20): some lifted-pen strokes (dots, bars, accents)
  become maze threads, each a separate thread through the point, forced crossings at both ends with
  it underneath so it ends where the glyph wants. `docs/design/K115_glyphs.md` section 11, call 2.
- **K582** · Final ς gets its own glyph (Levi took stage 6's rec, 2026-10-19); live Greek still
  draws σ. Build it in the stage 9+ glyph set after K580 (`docs/design/K115_glyphs.md`).
- **K590** · G3-1's phone gap search, the rest: with K573 step 2 knot is still 2.0x the pre-G3-1
  build (19.3 vs 9.7 ms). Three untried levers; measure what lies outside the walk first.
  `docs/design/K573.md` ("Next, if knot must reach 1.5x"); full text `docs/ledger_notes.md`.
- **K595** · Police same-chain collision by rest material, not a fixed 2-slot skip
  (`src/physics/forces.ts` ~272): fixes K596. Census the kink loops and eyes first; regression
  `?b&am=instant` + 5 s drag sleeps within +5 s. `docs/ledger_notes.md` (K595), `docs/design/K372.md`.
- **K611** · Main's drag frame is 19-26 ms (a drag runs at 30 fps); `RibbonRenderer.update` is 63%
  (gap slots 28%, splines 22%, tickPaint 17%). K370's 50 ms needs it under 12 ms. Overlaps K5
  R3/R4 and G3-2. `docs/design/K370.md` ("The gap to 50 ms", 2).
- **K649** · K525's tuning: rim strengths 0.6/0.8/1 and fades 0.2/0.3; junction-end gaps (runs under
  1.95 world get no rims; try gap 0 at interior junctions); the ticks' touch alphas vs the line's
  0.7; the fog glow (a dim dot on the Pixel, K662); the sheet extras. `docs/design/K525_telegraph.md` Handoff.
- **K657** · K137 follow-ups: the win banner's strokes/par and snapped rows (showFabricWin is free
  since K336 merged); keep copy from promising par = perfect play (par counts runs, stars length; a
  100%-efficient walk lost strict par, seed 7, slack 0).
- **K688** · Healing cuts against monsters (Levi took R.3.5, decision 6): a cut closes again after a
  few moves; cut with the minotaur or the fire. After the K114 walker stage
  (`docs/design/K80_gameplay_additions.md` R.3.5).
- **K690** · K620 checks not run: the root-pixel census (GPU against the CPU mirror), CPU-mirror
  tests on the real a (xh 2 and 3, tp52 and tp60), a cold-compile time with `trace_intro.mjs`
  (`docs/design/K620.md`)
- **K709** · Phone kit hardening: the adb reconnect is built (K717, `.claude/probes/K578/phone/`
  adb_reconnect*.ps1 and watchdog_reconnect.ps1, on by default) but only its healthy-link no-op is
  tested; lib703 END cannot cross midnight; run_k717 skips a late probe; walker_phone takes 1 candidate
- **K786** · When K138 makes monsters obey one-way runs (its stage 6), the lure hop matrix and the
  snare runs (K137 s4, af04d8c7) need the directed graph; today one-way binds only the player
  (inferred by the K137 s4 rebase)
- **K873** · K868 integration needs flow (`fw`) as its own scene input: fw moves the drawn samples,
  so every K868 scene so far is `fw=0`. `docs/design/K868_s1a_notes.md`.
- **K887** · Refresh the open-work report (K585's artifact): v7 (2026-10-22 09:27) predates the K138
  slice 2, K809, K794, K795 and K137 s5 merges. List every test, as Levi asked; re-parse the ledger,
  don't re-run patch_items.mjs (`docs/design/K777.md` Handoff).
- **K890** · Move the K863 tracer into tracked `scripts/` (trace_k879.py, review_k879.py, K886's
  join_k886.py, the venv's requirements), without the chart or its crops, once K886 lands.
- **K895** · phone_pass kit: `-Phase start` hangs a piped caller; `summary.mjs` takes the lower of
  two reps at n=2 (use the mean); fabric m11 needs an A/A floor and a fresh `noise.json`. (K907 moved the round probes into `scripts/phone_pass/`.)
- **K896** · K568's confetti recheck on the phone (about 15 fps lost over the 8 s fall, round
  2026-10-20's left over 1): a `-Phase looks` window. `docs/design/K156.md`.
- **K912** · Cursive generator follow-ups from K902: o and b exits per class (ok 10.9, or 6.5 u);
  f's exit walk; `--high-exit` by rerun; per-left split overfit. v5 (K904) fixed h's and k's after-o
  entries, og, oq, ng and nq. `docs/design/K902_cursive_frames.md` ## Results.
- **K919** · K525's TELE paint item costs the phone +11.0 ms on dense (+2.8 max-fabric, +3.1 knot;
  T1 `a64390b0`, round 2026-10-27c): try a K905-style compile-out (no TELE item on pages that draw
  no telegraph; an analogy, unverified) and measure it. `docs/design/K156.md` round 27c.
- **K931** · Cursive capitals, once the lowercase settles: traced from the same font, entering from
  above or below, or from a direction kept within rules (Levi, 2026-10-27).
  `K863_trace.md` ## Levi's calls, "Capitals, later".
- **K935** · K922's follow-ups (endSnap is unconditional since K934): the 23 crossing-cut free ends; the 9 span-end
  triples the walk never starts; d2-d4's fill-outline and z-tie cuts; probe fixes (fe_mech R = 2W, K915's `h.ts`
  FULL_DIR). `K922_junction_extent.md` ## Handoff.
- **K937** · Cursive: fit the connector into o (`cnct.mod_n_o`) on its own at the 86 u junction. J2 kept one set for
  ma la ug no ho do po ro (to io mo ng too) and chose smoothness: ho 2.85, no 2.89, do 2.76, ro 2.89 u (were 1.78-2.00),
  inside 3.0; an o-only set may win the distance back. `K962_cursive_joins.md` ## Handoff (K937).
- **K941** · K924's follow-ups: trace F, the fill's paper edge at muse_hash #5's 9 sites (corner prims at
  (4.2, 12.1) and (11.9, 15.75)); attribute the 2 unattributed missing stretches; check that group ink's 106
  broken lines are S's; N's 7 extra (open-chain starts) go to the extent walk. `K924_label_artifacts.md` ## Handoff.
- **K961** · Cursive v5.8: 8 of 30 body strokes have more than 12 nodes (m 21, k 18, h 16, w 16, y 15, p 14, a 13,
  n 13; f is down to 12): k and p are at the fewest any candidate has, fewer-node h and n peak above their caps, m, y
  and w fall outside the 10% peak window, and a's 13th node holds its bowl top. `work16/fewnode/` in K863's probes.
- **K948** · Cursive: the e after o, b, v and w (be, we, ve, oe; Drive `K863/e_joins_v54.svg`) turns from its level
  crossbar up into the eye's back in a short span, an elbow; B1's b, v and w exits leave 3-9° steeper than the font's.
  Re-choose e's after_o start (`k962.evar.o`) with `ful_b_e|e`, `ful_o_e|e`, or redesign it. K962/K990 handoffs.
- **K949** · Cursive joins still off the font: fe 18.8 u (v5.8 15.34), bk 7.85 (check the reference cut near k's loop
  entry), ee 6.9, br 5.18 after J2 (its new set made a deeper V), y's final tail 3.55 after J2. fe, bk and ee are not
  in J2's census words (K998). `K926_cursive_e.md`, `K962_cursive_joins.md` ## Handoff.
- **K1009** · Cursive J3: letters declare ports and each join is solved per pair, replacing the join presets (Levi,
  2026-10-28: "more flexible and procedural and less preconfigured"). J3a built the ports and o's three exits (v6.1,
  `e45f59b8`); J3b solved o's exit B on all 26 joins and ot at the crossbar (v6.4, `72ef51cb`); J3c the rest, K1014.
- **K990** · Cursive bodies, Levi's v5.8 review (2026-10-28): B1 (v6.0) gave a its top corner (its flat top is K1004), k
  the sharper leg and p the shorter end. Left: f still ends its lower loop in a curl below the crossing, not a cusp into
  its exit (fe 22.55 u, ff 16.55, fo 9.07 off the font); J3. `K990_cursive_bodies.md` ## Handoff.
- **K991** · Cursive entries (Levi, v5.8 review, 2026-10-28): cusp entries (t, p; also i j r s u w y) meet the stem
  from one side at its tangent, never crossing it (h's entry and b's, K995, done in B1). J2 left them at 143-172°,
  crossing ~20 u lower: `K962_cursive_joins.md` ## Handoff, note 2.
- **K1006** · Cursive leads and tails: knees in e, f and l (0.0373, 0.0397, 0.0343 at t 0.14, 0.54, 0.15), h's hump
  (0.0053 at t 0.38), k's lead wiggling at the stem (v5.9 too); tail0q's exit not G2, a 151° hook (v6.4 and v6.5, B4's
  report). J3c, with K991. `K990_cursive_bodies.md` ## Handoff; crops come from `work20/dbg/post_k990.ps1`.
- **K997** · Cursive joins: the take rule (`joinfit_k962`, `freeze_k962`) should read the census's peak away from the
  seam, with the hook as its own term. J2 took fo and tail t for losing J1's hooks though that peak rose (fo 0.114 to
  0.146, tail t 0.044 to 0.169); t's tail shows a red burst in v5.9. `K962_cursive_joins.md` ## Handoff.
- **K998** · Cursive census coverage: add words holding fe, bk, ee (K949), na, nq (K946) and the pairs that share a
  re-chosen set (to io mo ng); then explain or re-choose the pieces over budget: ot 6.56 u, tail t 6.53, lead f 6.46
  (unexplained), oe 5.29, br 5.18, fo 4.64, lead h, tail y, lead s, lead l, ur, et. `K962_cursive_joins.md` ## Handoff.
- **K943** · K868: draw the over thread's line where two threads of one junction cross (about 110 spots; both inks
  fuse them now; Drive `K868/sheets/K943_crossing_in_junction.png`), behind a flag for Levi to compare. The oracle
  needs simLab to split a crossing's two passes (K940 step 5, `S/`); the app needs 1-2 label bits (S3). Under extent part this is label ink's largest class (#16 50/8, missing 41/16; K934).
- **K952** · K940's follow-ups under crossed: trace #16's 6 missing stretches (`checks_ab.ts` needs a flag that
  lists positions); check the 35 missing rows (inferred: tubes the table puts under the cluster); the 4 wrong
  cells, crossed's extra #7 break, m8's sliver (ch54 past J57, x233). `K940_label_fixes.md` ## Handoff.
- **K953** · K868: a tube past its span, under a member, in a junction core (M1: 24 member/member rows in every
  K940 candidate) needs a junction-core rule; labCapReach was the wrong tool. `K940_label_fixes.md` ## Handoff.
- **K955** · K868: free ends at tight loops show at play size in both inks: muse_hash (3.07, 28.27), a line
  stopping 2-3 px short of a small closed loop, and (4.78, 33.44), a 4x8 px spur (sheet K d1/d2, Drive
  `K868/sheets/K_recount.png`). After S3a, fix in the oracle and the passes. `K934_recount.md` step 5.
- **K956** · K868: where a band runs into its own group's union and the census expects its over line, label ink
  closes the band's end into a point and group ink leaves two loose line ends (#16 "the chain's group on top",
  16/9 in label ink; sheet K h1/h2). Both are wrong (§2 goals 2-3). After S3a, fix in the oracle and the passes.
- **K1077** · Real-time stand ticks +4.24 ms (1x) / +13.16 ms (4x) over the turn stand, both asleep; the fire
  chain explains about +0.5 (setExplore +0.42). Attribute the rest with the prof5 profile on an unminified
  build, under the perf lock (docs/design/K441_fire_frame.md, owed rerun of 2026-10-30).

## Residuals (known, not fixed)

- **K1048** · K1040's probe gaps (`docs/design/K1040_s1c_handoff_pops.md` F5; `K1040_s1d_corner.md` F1, Handoff 5):
  q5holes skips a hole with a partly OWN rim; q4's g41 crop holds no ink on the g41 rings; the free ends' oracle
  column is K900's census (fe_own.ts is like for like); omega_rate.ts, corner_ab.ts, omega_census.ts import stale form Bs.
- **K1047** · Scene changes in K1040's recordings: a chain resampled (48 pops / 728 px) or a junction's arms
  changed (5 / 54) between frames, and form B can't be continuous across them
  (`docs/design/K1040_s1c_handoff_pops.md` F3). In the app, does a resample visibly move the outline? (K992)
- **K1046** · Form B's residuals (`docs/design/K1040_s1b_holes_fades.md` ### Residuals): R2 a tie jump inside
  one top, R3 sliver fills' bound and evalPoint's rV, R4 the ω fade's width in motion (0.05h approved; S4b),
  R5 #1's unattributed px (156 after S1d, its F5's +9: `K1040_s1d_corner.md` Handoff), R6 q4's outer/none px on def.
- **K1000** · K868 label: V's folds and live/unsolved flips (class 1) still pop. K1040 carries it (F3's fades) and it
  closes at K1040 S4b. Stage 1's continuous caps landed with K992 in 9b549d30 (`K1000_continuous_caps.md` ## Handoff).
- **K1002** · K868's corner balls are never checked against other threads (master, b16 and c17 alike): a large r can
  enclose a neighbour (j139/2 t23: chains 46/84 sit 0.82-0.88h from q inside b16's 1.80h ring), which shows only once
  the neighbour reaches the fill between the arc and V. `K992_s2_continuous_stops.md` G2 (branch `k992-corners`).
- **K1003** · K868 label: a V apex can draw as a fan of white hairlines (c17 at the neighbour's apex by j139/2 t23;
  master at another corner). Stage 2's census never attributed it; untraced. `K992_s2_continuous_stops.md` G2.
- **K999** · `.claude/rules/probes.md` (51 KB, about 13k tokens) attaches on every Read under `.claude/probes/**`, so the
  cursive agents (K863's trace and crops live there) carry browser-probe lore they never use, again after each
  compaction (CC93). Fix: narrow its `paths:` to the browser probes, or split it (K173's pattern); interim, B1 reads crop copies.
- **K954** · K940's probe caveats: `ydiff.ts` lists a self-crossing by its first pass only (`yjudge.mjs`
  inherits it; d4's x252); the census prints #16 stretches without a point (K934's `at_s.ts` finds it). `.claude/probes/K940/`, `.claude/probes/K934/`.
- **K957** · K868's free-end check (the runs count, K934) misses site I (an overshoot tail shorter than the
  inner ring), a V under 0.45 rad, an L joined by an arc 0.35W inside the ring and an L filled solid past the
  inner ring; spur ends (site F, u3) are invisible to both counts. `K934_recount.md` step 1, `.claude/probes/K934/`.
- **K958** · K868 extent part's residuals (K934 step 3, `ext3/`): a crescent sliver at muse_hash (20.30, 1.40);
  an island under K955's free end (m4); a lens wedge with a free end at g41_def_tw64 (0.90, 14.40); a notch (r1);
  spur ends (u3); a 1 px hairline island at g41_user_tw64 (9.79, 12.93).
- **K966** · K868 with `labelInk` on: the ink ignores the thread reveal, fog, the appearance reveal and plucks, is one
  low-contrast colour over every layer (S3a3), and cuts or crosses the trail. Fix before the flag becomes the default.
  S3a2's and S3a3's handoffs; `gp7/`, `gp11/` crops on `k868-s3a`.
- **K967** · K868's label app fixes ctrlArc at 0.47 and the corner radius at 3, and its camera assumes no rotation
  or pivot; the panel's labelInk checkbox does not refresh after the 255 fallback. S3a2's handoff on `k868-s3a`.
- **K972** · K868's band ink against the oracle (S3a3 R1-R3): tube-against-tube switches are not found (twist eyes;
  g41_user_tw64's V diagonal), small closed islands are missing (sheet K a1), and loop tips draw an open hook where
  the oracle closes a teardrop (d1; K910's free-end rule makes the teardrop right). `K868_s3a3_ink.md` ## Handoff.
- **K973** · K868's band ink against the oracle (S3a3 R4-R6): a line along a tube is missing inside a loop (def at
  26.225, 1.436); junction ticks are missing (sheet K c1, c3) and junctions get extra segments (64 cells on the tw42
  user scenes); more free ends than the oracle on 11 of 12 scenes (def 27/1, muse_hash 75/10). S3a3's handoff.
- **K974** · K868 probes: S3a2's `label7` has no def row; the dev server's build stamp shows the SHA at the server's
  start, not the current one. S3a3's handoff (K320's budgets landed in S3a4).
- **K982** · Cursive K944 leftovers: loop crossings are recorded, never read; Inkscape's rewrite loses up to 4.4e-4 u.
  J1 fixed "fox" and p's entry turn (`K980_cursive_local.md` ## Handoff).
- **K977** · Cursive v5.8's leftovers: b's bottom notch (1.77 -> 0.46) and z's descender notch (0.43 -> 0.25) still
  show; b's upstroke has comb steps at two nodes (unmeasured); k's peak rose to its fair's own 2.71; f's hook keeps
  three nodes about 13 u apart (the font's shape). `K969_cursive_v58.md` ## Handoff; `work16/combs/crops/`.
- **K978** · Cursive's few-node writer has no guard against very short control arms: b's v5.7 spike at 568 u came
  from a 4.3 fu arm (v5.8's jump weight removed it; nothing guards it). `fewnode_k969.py`; K969's handoff.
- **K951** · Cursive v5.4's residual: b, f, p, v, o, s and w end without a final tail, as the font's do (v5.5
  fixed the titles and the rerun order). `.claude/probes/K863/trace/NOTES.md` ## v5.4.
- **K947** · Cursive v5.3's residuals: f's frames sharing a node, `bodies.json` at 4.5 MB, the ot crossing
  (v5.5 cleared pp and mp and tightened the ceilings; o's closing hook is K959). `K930_cursive_smooth.md`
  ## Handoff.
- **K938** · Cursive v5.2's residuals: zo reads 142 u at every height (likely the wrong reference connector,
  unchecked); five new crossings into o (the font crosses there too). Its eye flags are K960's.
  `K925_cursive_v52.md` ## Handoff.
- **K936** · K922's residuals: what holds an arm 7h+ under "part"; d1's crescent stub; #5's band (a spike under
  depth, a notch and an end under the extent); g41_user_tw64's free ends 20 to 23; #14's crossing whose passes
  never overlap. `K922_junction_extent.md` ## Handoff.
- **K933** · S3's open inputs from K923: the uniform LOD's look (facets on kink loops, twist eyes?);
  the packed label's budget (255 chains and clusters, 2048 s steps, 32 z; no fill/cap/closed flags);
  stand-in switch strips; no view culling at 6x. For the S3 brief; `K923_s3_bench.md` ## Handoff.
- **K914** · Root pages (`#glyphs2`, text in the first scene) also link plain `section-rgb` in wave
  1, unused: desktop cold first frame +0.1 / +4.8 s, phone none; decide `rootPaint` before wave 1.
  K620's probe link is now `7&txt=ai#glyphs2`. `docs/design/K905_root_glsl_gate.md`.
- **K892** · G3-1 costs the Pixel 11 +24.5 to +48 ms of render sync (K156 round 2026-10-27); K893's hand
  revert (`k893-g31-revert` d8caafa3, not clean, never merge) wins 14.5 / 15.9 / 11.2 ms. Kept until K868
  settles the gap search (Levi, 2026-10-27), then port the revert or replace G3-1. `docs/design/K156.md`.
- **K877** · K868 oracle residuals: 1 of muse_hash's 342 corner solves fails (j58/1, no V: K883); #2
  fails acute r=0 corners by ε·cot θ (0.017, 0.027 px); 0.0038h of a −0.0061h clearance unattributed;
  inset match ±0.022h on polyline arms; kink's 1x #5/#9; long renders' vitest RPC timeout exits 1.
- **K836 follow-ups** (Levi look needed, 2026-10-23): (a) the i stem still shows a step/flap at J and the K843 flare magnitudes (peak 6 GU, len 30/34 GU) are first guesses - tune by eye at xh2/xh3, incl. the flat dead-end cap. (b) In border mode the i tittle draws as a serrated ring with center speckles (aib still); the fill look is a clean disc. (c) Pale seam discs sit inside the a at L and R in the fill look - judge whether they read as junction pads or artifacts. Stills `.claude/probes/K836/`, `.claude/probes/K843/`.
- **K834 follow-up**: the stuck-on-loader report - the keep-loading flag is localStorage (`knotmaze.loaderStays`), so Chrome's clear-cache alone does not revert it (clear site data does); the K834 gating should keep the panel reachable under the permanent loader, but the real-phone panel-not-shown case (short landscape sheet) was never reproduced - retest on the phone.

- **K413** · The phone lock (`.claude/probes/agents/phone_lock_take.ps1`) is one line, owner | time |
  what, with no waiter field, so the briefs' "release it between items when K290 or K395 waits"
  never triggers (K7 s7 handoff). Add a waiter line, or drop the rule; claude-config CC62.
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
  the floor matches (K193, K195, K197); pre-worker numbers. `.claude/probes/rounds/2026-10-14-48da84d/pass/summary.md`
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
- **K212** · PixiJS warns "Attribute aGap/aGapId/aUV is not present in the shader" on every
  load (K132's probes; Levi's console 2026-10-14, K311). Find which mesh binds attributes its
  program does not declare (`docs/design/K299_choice_pulse_bug.md`). On 2026-10-20 a run
  printed 10 of them, adding aEnv, aCol and aClipA/B/F (K406's probe).
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
  frames phase `-Base b0a1c49~1 -Head 97293e7`. Is 19 s acceptable? Levi's call. Pre-worker numbers: remeasure on the K7 host first.
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
- **K178** · Since K122 the private-cache vite wrappers of K19-K20, K79, K99 and K104 fail with
  ERR_MODULE_NOT_FOUND; K80's (`.claude/probes/K80/rt/vite.private-cache.config.ts`, which loads the
  config with `loadConfigFromFile`) works (`.claude/rules/probes.md`).
- **K181** · K104's residuals: the phone's "can't tell" share stays high in fabric and dense (26%,
  41%); sound-only and hide-zone taps show only through a cue; G1's soft edge shows the under ribbon
  at 80-90 degrees. `docs/design/K104.md` ("Stage 1b handoff", "Stage 1c handoff").
- **K188** · K140's residuals (`docs/design/K140.md`, "Stage 1 handoff"): `restartSolve()` leaves
  pieces in the air; the open desktop panel covers the spray when the exit is at the lower right;
  the rain takes 5.5-6.2 s to fall out, longer below 10 fps.
- **K189** · Fabric at defaults never rests: while music mode's auto plucks ring (the default
  sound) every frame draws; with sound off, the flow and choice pulses still draw at K6-3's
  30 fps cadence. K140's 10 ms of JS a frame predates K6-3: measure on the phone first (K156).
- **K287** · K268 s1 residuals (a)-(g): full proof sweep unrun; MAX case and an over thread's tip
  lack GPU checks; no mode-off A/B after the K114 rebase; phone slot proof needs `__knotExplore`
  (K156 10-14c census passed). `docs/design/K268.md` ("Not done in stage 1", Calls).
- **K289** · K279 stage 1's last residual: (g) no webm clips of the plucks.
  Stage 2 closed a, c (a cull, not a bounded filterArea), d, i, j and k; (e)
  is K368. `docs/design/K279.md` ("Stage 2 handoff").
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
  real-time fire (K114 s2). After K137 s1, which edits `maze_stats.ts`.
- **K443** · Two panel rows labelled `clock`: K80's in Maze (turn-based | real time) and the fire's
  in Burn race (turn | realtime). Match the wording or rename one (K114 s2); rides a later param stage.
- **K444** · K408's start-marker fade: the gap slot moves in one frame when the fade starts, and the
  exit marker still hides without a fade (K114 s2; `.claude/rules/render-markers.md`).
- **K445** · K114 s2's real-time burn sim (`.claude/probes/K114/stage2/burn_sim_rt.ts`) models
  neither pauses at forced vertices nor queued taps, and real players' junction think times are
  unmeasured; K440's proposal rests on it.
- **K446** · The real-time fire clock is not re-synced after a replay; unreachable today, since only
  dailies replay and they run with the fire off (K114 s2).
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
- **K540** · Cold first-visible is ~0.7-0.9 s later on 3465090 than on its parent e83f203 in two interleaved trace_intro pairs (3.36/3.45 s vs 4.10/4.22 s, fresh profiles, phw=0), while section-rgb(-explore) link-status times are equal (43.7-48.3 vs 46.0 ms; explore 61.4 vs 51.7 ms, one run) - unattributed (not the section compile); bisect the load path before calling it a regression. Evidence `.claude/probes/K8/G3-1/` (`k536*` trace runs) and `.claude/probes/K307/runs/k536*/`. Attributed 2026-10-18: real cold-only regression, +0.39 s mean over 8 interleaved pairs (median +0.51, 7/8 positive; K536's pairs overstated it — the parent's own spread is 1.2 s); the wave-1 gate waits on the cold FXC compile of G3-1's enlarged gap-search shaders (section-rgb fs +1,117 chars), warm restart and Vulkan show no gap. Full record `.claude/probes/K8/G3-1/k540_results.md`; fixing (trimming the GAP search's GLSL cost) is the K8 lane's call.
- **K537** · census3a's 9 pre-existing fails on master (probe sanity 21-23/29 vs 80% bar; solid crossings' mode-on cuts 0-14px vs 109-142 off; slot restore; three 434px attribution restores; visitAll/mode-off-again ~11.3k px lower-half bbox; PROOF vacuous since G3-1) - identical on baseline 3465090 (22/31 with the K430 ramp vs 20/31 without; ramp-specific judgements pass). Next census owner ports census2d's K522/K523 judgements wholesale or retires census3a for census2d; may share K432's backdrop mechanism.
- **K538** · Pluck footprints (overHalf/eraseExtent) still step binary at vis 0.5; only underWindows ramp (by design in the K430 stage). Evidence `.claude/probes/K268/stage3a/out/census_ramp6/`.
- **K547** · The far-branch blend has no isolating GPU census yet: census3a's shaped slots cut 0 px at reach 2.5 in its state (PROOF vacuous since G3-1, K537), so it is proved by the farBlendCut formula tests, shader-text pins and the 22/31 no-regression census, not a pixel diff at a tight over bend with one branch shown and the other hidden. Build that state (a shaped slot whose over polyline bends back within farK, one branch across a frontier) and judge hidden (no dip) vs shown (master's blended cut, weighted). Evidence .claude/probes/K268/stage3a/out/census_far1/. Census attempt 2026-10-18 (build 0f8e277, far_census.mjs, out/far_k547/, results_K547.md): state unbuildable in the walked state - bend-back pairs and 1-vs-0 cover splits exist (0.53-0.83 world), but medial fragments are never mid-fade inside the window (CPU joint count 0; GPU both-shown vs sminK=0 = 0 hard px on 10 candidates, incl. fl=0.3 and over-branch cinch attempts), and every bend candidate's reject control is 0 px (neighbour-covered cuts). No defect found; the blend remains formula/text-pin proved only. Missing: a strong slot whose over chain rides parallel at 0.66-0.75 (e.g. fat-thread adjacent-corridor state or a held tug).
- **K542** · PROTECT's biting-triangle GPU census is still owed: in walked fabric states at rest the waiver's range is empty (protect intervals overlap slot windows on 137/570 sides, but no on-screen fragment sits in the margin band over B - the triangles are not world-squeezed until a cinch/tug), so the protect stage proved the chain by the CPU census (706 sides, factors = vis(B) exactly, incl. 544 hidden / 22 shown) plus the shader-text unit tests, and a manufactured bite changed 0 px for the same reason. Build a squeezed state (a cinched cyclic triangle under the reveal, e.g. a physics tug on fabric) and judge hidden (on == waiver-off) vs shown (on == waiver-full) there. Evidence .claude/probes/K268/stage3a/out/protect_final/ + census_protect2/ (22/31, the ramp baseline). Census attempt 2026-10-18 (build 0f8e277, protect_bite.mjs, out/protect_k542/, results_K542.md): shown state marginally built - cinching B onto A at off* on slot 3 side 0 (sin ~ 1) yields 6 faithful bite points (first non-zero in this state family); judged on == waiver-full (5 hard px vs 2 A/A churn, correct direction) but on vs waiver-off also only 5 px, below the decisive bar. Hidden state unbuildable here (no on-screen over-shown + A-shown + perpendicular slot with B hidden). No defect found; decisive census still owed - needs a bigger bite (held tug, iterated cinch), a zoomed bite clip and differing A/B section colors.
- **K555** · K115 residuals its redesign must absorb or re-check: the joins λγ λη λθ λψ τυ meet a glyph stroke
  (`docs/design/K115_stage6.md` 971-975), 6a's five CAPITAL_OVERRIDES (800-809), the digit-6 conflict
  (`docs/design/K115_stage3.md` 376-381), and 1b's same-slash crossings that rely on overFirst alone. K558 adds (c) a connector touching
  a lifted stroke's end makes a junction (Daily #12's #) and (d) the loops and bars of l, e and t are junctions
  (`docs/design/K558.md` Handoff). K552 adds: glyph waypoints
  land on cursive crossings (`text_graph.ts` `nearestNode`), so every title has self-loops and parallel runs. Stage 8's design absorbs them (`docs/design/K115_glyphs.md`); close when stage 9 lands.
- **K556** · K115 emblems: a shape under MIN_EMBLEM_DIA (6 LU) is refused silently
  (`docs/design/K115_stage5.md` 261, 620), and the triquetra shows gap slivers (594-596).
- **K560** · Decorative text threads never show under the thread reveal (today's accents; K115's
  lifted strokes next), and a hidden thread on top cuts no gap in the thread under it
  (`docs/design/K115_glyphs.md`, kill criterion 2: visible strokes plus a two-pass crossing lint).
- **K562** · K558's residuals (`docs/design/K558.md` Handoff): (a)+(b) spur pen order is untested (a
  spur taken for a lifted stroke; a spur attached before the pass it crosses needs a retrace-spur
  fixture); (e) "20" makes a three-pass node that keeps alternation (#20 on 2026-10-31, #120,
  #200-209, #220, #320): K115 stage 9's two-pass lint or a planarizer fix; (f) the panel tooltip's
  and the rule comment's examples come true only with K115's glyphs.
- **K564** · Titled dailies 6, 16 and 26 each log "Knot invariants violated; generation bug." once;
  untitled builds never do (K552, `.claude/probes/K552/invariant_warns.*`).
- **K565** · Leaving a titled daily by a live edit does not rebuild: the title stays, so fire,
  minotaur and fog start from the word (read from code, not exercised; stage 3a, K552 Handoff).
  K552's row tooltip ("your attempt is kept") also overstates: a move on the other form drops the
  raw loop walk (C4).
- **K574** · K320 stage 1 (`6c592e6`) costs about 4 ms of phone render sync (ABBA 69.9 vs 74.1 ms,
  same sign in both pairs, inside one p10-p90 band; K572).
- **K575** · `0733182` (K115 1b-B) does not build, a hazard for any bisect across it (K572; not
  diagnosed).
- **K576** · On the worker host (K7) two loads of one link freeze at different sim times (4.967-5.017
  s), so their rest states differ; in-thread they match, so probes pin `&phw=0` or `&phy=0`. Fix
  idea (untested): sleep only on a fixed substep grid. `docs/design/K550_kill.md` (Handoff).
- **K583** · K115 stage 9's glyphs: the i's dot draws as a rotated square; an untraced notch under
  the a's J spur and at the i's fork (`.claude/probes/K115/stage9/shots4/ai_land_xh2.png`); a crotch
  hairline at xh 3 (`LINT.forkMaxLU`).
- **K584** · An optional SceneParams field silently drops from the worker-name build and loses the
  worker's fast start; only `worker_host.test.ts` catches it, since tsc skips tests (K393).
- **K588** · The confetti palette's warm white (0xfff4e0) reads as a foil flash in still frames;
  dropping or tinting it would make the flashes stand out (K337 handoff).
- **K592** · The gap search rounds indices with `int(x + 0.5)`, which truncates toward zero, so a
  negative kStart rounds the wrong way (`src/render/gap_mask.ts`, `int(t4.z + 0.5)` and the range's
  start). Check whether kStart can go negative. From K573's agent report. Done in K817: kStart can go negative (ring seam crossings, pinned in gap_mask.test.ts); the three kStart decodes (gapRange, gapProtCover's start, the self-exclusion s0) now use floor(x + 0.5); the test mirror rounds the same way; K320 char budget held by inlining instead of a helper.
- **K593** · `scripts/preview.ps1` fails in an agent worktree that has no `node_modules` junction
  (K573's run). Make it find or make the junction, or fail with that message.
- **K594** · Phone kit flakes in K573's run: adb died 3x (unexplained), a foreground kit start hangs
  the tool, `cleanup.mjs` timed out after a watchdog trip, two reverse tunnels stayed on the phone.
  `.claude/probes/K573/logs/`; full text `docs/ledger_notes.md`.
- **K596** · Fabric `?b` (today's defaults) can stay awake forever after a drag: a six-substep limit
  cycle at max move 0.0197 per substep, above QUIET_EPS 0.015; 1 of 23 fabric seeds,
  history-dependent (5 of 6 grab points re-sleep). Fix: K595. `.claude/probes/K372/results.md`.
- **K600** · `.claude/rules/gameplay-links.md` lacks the `gm` key (`gameMode`) and a K534 entry.
- **K602** · K456 loose ends (untested): `KHR_parallel_shader_compile` stays off after a restore; a
  failed WebGL start after Reload is unhandled; scheduled notes ring out after a loss; a focused
  panel field still takes keys; no phone pickup watch. `docs/design/K456.md` (Handoff).
- **K604** · Reloading an `mf=0` link comes back in maze mode: `mf` left the link codec in K323
  Stage A. Probes that reload knot mode pass `mf=0` again; moot once K326 drops knot mode (K456
  handoff).
- **K605** · K456 step 1 flake: master's never-returns run died once with Execution context was
  destroyed, 19 s after load and before any loss; nothing in `src/` navigates; not seen again.
  `.claude/probes/K456/results.md` (One flake).
- **K607** · Probes: a clipped page.screenshot taken after a zoom or a pluck lost the pluck blur and
  backdrop (K406's sheet) and drifted the view about (+291, +342) CSS px (K515's); full-frame shots
  never did. Cause unproven (puppeteer's clip path suspected). Workaround: one full-frame shot per
  state, crops cut in a second page. `.claude/probes/K406/sheet/notes.md`,
  `.claude/probes/K515/hover/notes.md`.
- **K608** · K515's hover route: in the zoom-3 diff, a thin sliver is darker with the hover, at the
  seam between the route's two lit stretches. Undiagnosed.
  `.claude/probes/K515/hover/zoom3/sheet_diff.png`.
- **K609** · K395's example loop `9:133` no longer exists in `?7` (2026-10-20), so render-pluck.md's
  Pluck loop tip entry and probes-pluck.md's K395 recipe point at a loop that no longer reproduces.
  K406's sheet used chain 2, key 427 (`.claude/probes/K406/sheet/notes.md`).
- **K612** · The desktop worker's substeps cost 1.2x in-thread ones on the same page (13.4 against
  10.8 ms on the daily); not attributed, maybe the phone's 2.1-2.9x cause. Rides K370's next stage.
  `docs/design/K370.md`.
- **K613** · Re-measure raw pointer input's knot jitter (K370 lever B): the final pass read
  0.22-0.24 against 0.08-0.16 with it off, the lever pass 0.13 against 0.13. `docs/design/K370.md`
  (Verdicts).
- **K614** · The phone's 53 ms input queue (CDP touch, so a lower bound for a real finger): not
  attributed; main's drag frames overrunning the vsync are the likely cause (K611).
  `docs/design/K370.md` (Phone).
- **K615** · The in-thread host (the fallback) takes 240-600 ms a drag step: real-time stepping
  spirals to 12 substeps a frame (K279's WAKE COST), and only cheaper substeps help it.
  `docs/design/K370.md`.
- **K619** · K194 timed music-mode auto plucks with physics off; the live-physics link went untimed.
  `docs/design/K194_defaults.md` (Handoff).
- **K621** · K580's taper reaches only the ribbon width, the fans and the end cap; hit tests and
  plucks, crossing gaps (they quote h), trail paint, RADII, the reveal, fog and physics ignore it
  (#glyphs2 only). `docs/design/K580.md` (Handoff).
- **K622** · K580's root takes stroke-order keys just before J's, so a stroke-order reveal would
  draw the whole root the moment J draws; nothing orders by them yet.
  `src/core/glyphs/glyph_graph.ts`.
- **K632** · K244: under the thread reveal the pluck overlay clips (`fret: true`, K397), so a
  mid-reveal chain can still sound with nothing drawn; pass `exploreSolidSpan` to the site tester
  (`ribbon_renderer.ts`, after K525).
- **K633** · K244: a site is tested at schedule time but drawn up to 0.3 s later (0 misses in 844
  notes); no headless release test (`input_pointer.ts` needs pixi and a canvas).
- **K638** · K324 s1: the queued fleer escapes 76-83% of hunts against 75% at baseline, at every
  hunt pace tried up to 1.0 (`docs/design/K324_s1.md`, Handoff).
- **K639** · The main checkout's `.claude/probes/{K80,K174,K155}/rt/rt_lib.ts` (line 42) read
  `deadEnds`, removed in 35f3ec2, so re-runs build mazes with no dead ends (K637: 4.16 catches
  against 2.50). Make them fail loudly, or build through `buildSceneGraph` as K324's copy does.
- **K640** · K546 s1's travel window: while a runs catch travels, the HUD's mode, the head's glow
  and the close-calls and seen rows already show the after-catch state (only caught waits), and a
  wait queued then lands on the landing frame (`docs/design/K546_s1.md`).
- **K641** · Older catch quirks K546 s1 found: an empty by-length route shows the minotaur at its
  lair during the travel; `turnCaught`'s pluck takes the entrance's pitch; `minoRestart` shows no
  burst (`docs/design/K546_s1.md`).
- **K642** · K580 s2 leftovers (`docs/design/K580_s2.md` Handoff, "Left"): tp60 draws a dark bite at
  the top of J at xh 2 (tp60 not used); the root's inner edge hooks at R at xh 2 (edge cos -0.883,
  hidden in the bowl); the taper reads TAPER_THREAD_LU 0.52, not the live tw.
- **K648** · K336 leftovers: the streamers' sag only roughly holds across frame rates (the follow
  runs once a frame); on the phone the closest cannon arc tops out 0.081 w from its edge (median
  0.26 w).
- **K652** · The telegraph line draws over unrevealed threads under the thread reveal (K525 report;
  the line is master's).
- **K659** · K155's star thresholds look stale (K137's sim): the greedy median is 4.98 against
  K155's 2.57, and the star split moved from 28/52/19 to 56/32/12.
- **K660** · K155's sim kit (`.claude/probes/K155/rt/`) is stale: `rt_lib.buildMaze` lacks K74
  s2-4's params, and its codecDefaults call broke with K132 (K137 report).
- **K663** · K244 leftovers (K631): the unfretted predicate under the thread reveal needs
  `ribbon_renderer.ts` (free once K525 merges); a site tested at schedule time draws up to
  MUSIC_LOOKAHEAD (0.3 s) plus output latency later, unobserved; no headless release test.
- **K665** · K137's fog check after Undo varies run to run: IoU 0.956-0.981 over 8 runs, lowest on
  the phone; the rerun used a 0.95 bar. The guessed cause, K100's live-vs-restore noise, is untested
  (`.claude/probes/K137/rerun/`).
- **K668** · K324's stalker hunts only while charging: seen and closing in, it reads wander in the
  HUD and in the plan's `hunting` flag. Follow-up: a distinct stalk state (`src/game/minotaur.ts`).
- **K669** · K324's guard routes only over runs with both ends in its territory, so it skips a
  shorter route that leaves and comes back (`src/game/minotaur.ts`).
- **K670** · K324's page probe (`.claude/probes/K324/k324_page_s3.mjs`, untracked): in the
  stand-still phase a caught player stands unseen on the entrance, and its hunted-the-walking-player
  label is wrong.
- **K673** · An awake knot frame is 19.3 ms at 1x (110 at 4x CPU) against 9.5-9.9 (47) slept, and
  the first sleep takes about 5 sim-s (9-24 s wall on the worker host): phones pay it through the
  settle and the first moves. Likely K611; K441 Handoff.
- **K677** · aland only: a_x3_l cusp spike (0.075 LU) and a_x2_l square-step bites (0.089, 0.060),
  the same on master and K580 s4 (not a regression); K675 removed its 0.108 stem-foot thorn. Not
  investigated (`docs/design/K580_s4.md` real-render table).
- **K678** · A K81 cover strip with fewer than 9 pairs of room drops a round join arc (falls back to
  the sample pair); no A/B scene reaches it (`RibbonMesh.coverPairs`, the joinery.ts cover loop;
  K580 s3).
- **K679** · K653 fix (987d98f) has no still pair, pixel A/B or test: nothing in test/ reaches
  syncMinotaur and the frozen-scene probe never shows the glow; a headed real-GPU real-chase probe
  at mfg=never would (`docs/design/K653_checks.md` Handoff).
- **K682** · Collapse par always reads with >=: the 20k-step longest-trail search (and 200k) runs
  out on every measured maze (dailies 1-60, 20 grid-24); proving the maximum needs a stronger bound
  (`docs/design/K139.md` Handoff).
- **K683** · Collapse UI leftovers (K139): the win banner still shows path/optimal, backtracked,
  junctions and dead ends (optimal means nothing in free); the exit marker shows in free mode; a
  Burnt loss in free mode shows no score.
- **K684** · Collapse par runs synchronously on the main thread at its first read: desk at most 38
  ms, phone estimated near 190 ms (unmeasured; next phone pass). A worker or idle-time slice would
  hide it (K139).
- **K685** · K137: with collapse off, a respawn into stranded (fragile) or out of strokes (strict
  par) shows no banner until the next tap (found by K139).
- **K689** · Since K620, the root vertex block moves maze and burn 3-5 px of one level (no root
  pixels; guess: compiler rounding). Test a constants-only block, or accept (`docs/design/K620.md`
  Handoff)
- **K691** · K620 root looks: (a) the seam scallops along the strip triangles (fix idea: an exact
  sideways distance via the unread E1 texels), (c) a pink tab at R at xh 2, (d) a light streak along
  the seam at R with strand colours, seed 9 (`docs/design/K620.md`)
- **K692** · A light band across the glyph root at J, on master before K620 too (K620 residual b;
  `.claude/probes/K620/sheets/k620_zoom.png`)
- **K699** · Two visibility rules side by side: the K120 move pad hides while the panel is open, the
  K114 scissors show beside the desktop side panel (`src/ui/move_pad.ts`, `src/ui/cut_buttons.ts`)
- **K700** · K324 s2 GPU census skips the non-riding lead and the hunt strength (the CPU parity test
  covers both); a ride filter in tapAndFind would add them
  (`.claude/probes/K324/census/census_tele.mjs`)
- **K701** · Section shader lengths rose again, limits now 47,750 / 64,150 characters (K324 s2: +85
  each; `test/render/k320_slim.test.ts`)
- **K710** · K137-b: in real time a catch can still land through a broken run, since contact uses
  the plain thread distance (docs/design/K137_s3a.md, Residuals a)
- **K711** · K137-b edges (K137_s3a.md Residuals b-f): runBurnAt may draw a burnt broken run as
  burning; safeArms and fireTrapped count broken arms safe; refire is O(V^2) per breaking move;
  __knotChaseTap ignores broken runs; broken-run counts need main.ts to report every accepted run
- **K712** · Lives (K137 s3a): hearts are in neither Undo nor saved attempts, and default 3 when
  switched on is tooltip advice only (a toggle or a 0-to-3 snap would make it real; K137_s3a.md
  Residuals g). First half checked cb73089e: no Undo or saved attempt can hold hearts today.
- **K714** · K114 balance probe: its cutter keeps cutting once the walker is inside the fence;
  dailies 1, 12, 23, 28 and 29 have a one-run fence at radius 1, so Keep it in is trivial there
- **K719** · K580 s5 leftovers: an unidentified gap-mask slot bites the a bowl in ai at xh 2 (0.059
  vs 0.031); the 0.15 arm-drop rule leaves every glyph junction recordless at xh 2; the stadium is
  unmeasured on a glyphs2 maze title; U spikes over 0.01 in ai (0.014, 0.017).
  `docs/design/K580_s5.md`.
- **K723** · K137 s3a page checks unrun: a broken run turning the minotaur plan and the fire, and
  the finish banner hearts row (`K137_s3a.md` Handoff); the sword has had no real-phone pass (phone
  sitting 3)
- **K729** · K708 sim gaps: lives modelled off (run-outs and restarts unsimulated), the turn clock
  has hunter rows only, and the seeker is a greedy chaser, not a flee-tree predictor
  (docs/design/K708.md, Left over)
- **K732** · K720 residuals: iOS unverified (a context created outside a tap waits for the next tap;
  a suspended context keeps the song on the wall clock and skips the 1.2 s lead-in); in manual mode
  the first snore hover after sound turns on creates the context but plays nothing (decode the snore
  on an OfflineAudioContext); the snore and fabric mode under snd=none unchecked in a browser
  (docs/design/K720.md Handoff)
- **K734** · K643: a hairline seam inside the i fork junction at xh 3, in the build at 6278cf8b,
  cause unknown (docs/design/K643.md Handoff)
- **K737** · K137 s2 (K137_s2.md Handoff): with fragile runs or collapse the spool can leave no
  legal move at its limit (Undo or restart gets out); a lit hint hides the minotaur warning up to 2
  s; the path-display row does nothing under the spool; hints and the compass ignore the fire; a
  catch restart keeps hints used and chalk; the aids are off in walker modes; saved attempts keep no
  chalk or hints used (store version); the compass shares the hint mint
- **K738** · HUD rows vs the mode badge at 411x753: the sword row (slain on move NN) clears the Free
  play badge by only 13 css px (K726, `.claude/probes/K726/out/sword/stills/`); the K137 s3c/s3d and
  K138 HUD rows may push it under the badge
  - Real phone (K749): with stat rows on, the badge covers the HUD (2.9 px at path 1234 / 886,
    49.7 x 42 css px with the sword slain row, hiding the time and path values); stats off, slain
    clears by 12.7 px; at 360 px wide est. 38 px overlap. Fix: a width cap with wrap, the badge
    moving, or the HUD stepping under it. Sheet `.claude/probes/K749/out/hudgrow_g/sheet_hudgrow.png`
- **K740** · Toast placement gaps (K698 Handoff): a control that appears while a toast shows does
  not move it; the panel and the phone settings sheet are not avoided; the aids group is found by
  its class, not the indicators avoid list; the sword toasts were checked shown directly, not after
  a walked pickup; No hints left is unreachable by tap (Hint disables at 0)
  - K749: after a walked pickup on the real phone, all three sword toasts clear the pad
- **K741** · cutRules() still says the fewest cuts when the Lead par is only an upper bound (par at
  most P) (`docs/design/K698_polish.md` Handoff)
- **K744** · K138 s1 page gaps: blips of other colors at some junctions under the rule colors (cause
  unverified, maybe the junction webs); not page-checked: a backtrack undoing a slide, ice with
  alternate, strict par lost under a rule, the share (`docs/design/K138_s1.md` Handoff)
  - Real phone (K749): the patches show at real size at nearly every junction in both rules (dark
    magenta among pink, dark teal among olive); a backtrack undoing a 3-run slide passed. Next:
    trace each patch to its run, or hide the web meshes. `.claude/probes/K749/out/rules/`
- **K748** · Sprint polish (K137 s3c): a focus outline lingers on the sprint button after F; no real
  phone pass yet (emulated 411x753). The s3a fragile page check is weak on the hunter and the fire
  side is unit-tested only
- **K750** · Lives on the phone (K749): one read gave hearts {left:3, of:3} beside catches 1 while
  the toast said 2 hearts left; a lagging hearts state or the probe read timing; the HUD hearts row
  after a catch was not checked (`.claude/probes/K749/notes.md`)
- **K751** · Phone coverage gaps after K749: the F key and its focus-visible outline (K137 s3c),
  sprint with the sword or lives, the K747 off-by-one after a sprint, and the cut refusal for no way
  to the exit (seed 7 has none in free play); for the next phone pass
- **K755** · K114 beat: a note can land up to the audio output latency plus one frame late
  (`src/app/beat_frame.ts`)
- **K756** · K114 beat: no wait action under the beat, and the pause has no key
  (`src/ui/beat_pause.ts`)
- **K757** · K114 beat: the audio gate in `src/app/auto_audio.ts` guards a bug inferred from the
  code, not observed; whether manual mode dropped notes before it was not measured, and random sound
  mode was not run
- **K758** · The bottom-left corner has no layout of its own: the beat pause rises 60 px above the
  sprint button by hand (`65c4f78a`), and a third control there would need the same (compare K738 at
  the top)
- **K760** · K138 s2: turnstile bands show the next phase while a move animates, and the contrast of
  a band depends on the section colors (`src/game/turnstiles.ts`). Real phone (K767,
  `.claude/probes/K767/out/turnstile/`): a band reads only with the head away from the vertex (the
  head disc and gold trail cover it there), and it is weak over pale lavender
- **K761** · K138 s2: the rule search models waiting detours of up to 4 taps, so the fewest and par
  can overstate a maze that rewards a longer wait at a turnstile (`src/game/rule_search.ts`)
- **K769** · K137 s3d: with the minotaur traveling by length, the extra monsters still step one run
  a move; under `clk=beat` the sleeper rows show and the extras are laid (read from the code,
  untested)
- **K770** · K137 s3d: the s3b Decided 2 look is not met: the sleep look is static, and awake extras
  draw at the minotaur size
- **K771** · K137 s3d: the extra monsters have no off-screen indicator, the fog hunting setting
  keeps them fogged while they hunt, and the K481 catch tint ignores them
- **K772** · K137 s3d: an extra monster catch while the minotaur flees the sword sends it to its
  lair and leaves the sword fleeing (as built, untested); saved attempts do not cover the extra
  monsters
- **K773** · K137 s3d: the probe hooks are only on `__knotTurnMino()`, and the build stamp of
  `.claude/probes/K137/s3d/monsters_page.mjs` reads null
- **K775** · K138 s2: the hidden runs HUD row (found / of) overflows its box and runs under the menu
  button at hid=2 and hid=4 on the phone (a 288 px value in a 327 px box, the last word cut off;
  K767, `.claude/probes/K767/out/hidden/stills/tiles/`)
- **K780** · K138 s3 one-way traps, inferred from the rules, not seen: a slide over ice crosses
  several runs, and nothing checks that every vertex still reaches the exit under ice plus one-way
  (the census checks the start only); at a turnstile whose open pair leaves out a one-way arrival,
  the refused backtrack can leave no move (docs/design/K138_s3.md, Residuals). K138 s4 census: one-way plus
  ice traps the player on 42 of 50 seeds without keys, 44 of 50 with 2 keys (K778: no Undo to get out).
- **K781** · K138 s3 one-way chevrons: a placeholder design, each its own mesh and draw call (116 at
  seed 7, ow 0.4; not timed), unchecked under the fog and the thread reveal. With the color rule
  leaving no solvable draw (seed 1, alternate, 0.4) nothing is one-way and the HUD row reads 0
- **K782** · K137 s4 lure and snare residuals (docs/design/K137_s4.md Handoff): the Snared toast
  fires before the monster reaches the snare; an armed tool lights any run on hover; a live switch
  to travel by length keeps snares that never spring, rings drawn; the follower first step skips the
  snare check; under length a lure clears one hop late (read, untested); untested under clk=beat;
  the ring is a stand-in for a glyph
- **K787** · `test/game/beat_rider.test.ts` (the turn minotaur, one turn per committed move) ignores
  what `t.turn(run)` returns: after a catch every later turn rejects and the test still counts it,
  which is why it missed the K774 bug. Assert the result (K774 Handoff, `docs/design/K774.md`)
- **K791** · Locks and keys (K138 s4 slice 2, unmerged): ky 2 with the alternate color rule bites on
  only 41 of 50 seeds, taking up to 32 draws; the lock dim covers only a stretch at each end of a
  lock run, not the whole run; the census trap check skips clocked configs (turnstiles)
  (`docs/design/K138_s4.md`, its Handoff)
- **K802** · K138 s4: locks and keys work only in the classic game; under the Minotaur or Burn game their rows
  hide and a keys link plays without them (from the code, untested). Needs stage 6, then a closed lock handled
  like a broken run (K137-b) (`docs/design/K138_s4.md`, Handoff)
- **K803** · K138 s4: the key and padlock markers and the closed-lock dim are not checked on a page
  with the fog or the thread reveal on.
- **K871** · K868 S1a exporter residuals: captures landed a step apart between loads (sim 40.00833
  vs 40.01667, `phw=0&stb=0`); near-duplicate samples ~1e-4 apart; automatic ink written as
  "#000000"; export servers share the `.vite` cache (`docs/design/K868_s1a_notes.md`).
- **K872** · K868 S1a alignment check gaps: `def` reads 0.509 px at dsf 1 (limit 0.5; 0.172 at dsf
  3), unattributed; dark paper gives no rays (needs an inner-edge measure); rays near junctions are
  not cut at each arm's fillet reach. `docs/design/K868_s1a_notes.md`.
- **K884** · K868 S1a exporter: muse_hash's crossing 15 disagrees with its geometry (#14's one
  failure outside a cluster), and `look.ctrlArc` is not exported (the oracle's depth window then
  assumes 1). `docs/design/K868_s2_g2.md` Check numbers.
- **K885** · K863 trace v2 residuals (`.claude/probes/K863/trace/NOTES.md` v2): k's buckle traced as
  a 61° X where the font's passes run ~3° apart; coverage up to 4.3 u where a stroke touches back
  (f, q) and 1-3 u at retrace forks; stem p kinks at (166,244); repair windows in template units.
- **K888** · K138's rule colours (alternate 0.8/0.3, cycle 0.8/0.5/0.22) have had no grayscale or
  colour-blind contrast review (`docs/design/K138_s1.md` Handoff).
- **K889** · K138's ice colour rule is placed by retrying draws (5% of draws at seed 14, 41.8%
  pooled; cf. K781, K791): plant the legal route over the ice moves instead. Census helper:
  `.claude/probes/K889/d_diag.ts`.
- **K894** · Max-fabric (`b&gs=24&wd=1&brd=1&ded=1&del=40&jsp=.5`) never sleeps on the Pixel 11: 87
  s at 6 fps with a 600 ms frame (rounds 2026-10-20 and 10-27). `docs/design/K156.md`, round
  2026-10-27 handoff, step 4.
- **K897** · Load on the Pixel 11 at head: -7.4 fps (default) and -11.8 (slow) against `d0406df` in
  both orders, 2-3x the frames over 50 ms, first frame 130 ms sooner; the same gap as round
  2026-10-20 (-7.6, -15.3). `docs/design/K156.md`, round 2026-10-27 handoff, step 3.
- **K898** · K883 oracle: extra ink rose (muse_hash 13 to 22, g41_user_tw64 2 to 14; the census
  should record positions), and sheet F shows a spur at cr 3, hairlines and a thick seam at cr 4.5
  and a speck at cr 6 where an arm is cut short. `docs/design/K883_oracle_borders.md` handoff.
- **K899** · K883 oracle checks still failing: #14's crossing 15 on muse_hash (the S1a export holds
  the passes apart), #16 on 9 scenes (at most 65 samples), 1-2 failed corner solves a scene,
  j_pair_cross #2 and muse_hash #2 (26.75 px / 86.6 deg). `docs/design/K883_oracle_borders.md`.
- **K903** · Cursive v3: k's X traced at 61.3 deg (the font's passes: 3.2 deg); coverage 4.3 u in f;
  p.jmc's stem kink unmeasured; no join recalibration on edited bodies. v4 (K902) moved the b, e and
  z X's into bodies and rewrote the review notes. `.claude/probes/K863/trace/NOTES.md`.
- **K908** · Max-fabric's frozen cell draws a different frame run to run (base vs base 2587 px; K905's
  master vs master: desktop 2080, phone 1093 px), so its pixel diffs need another control.
  `docs/design/K156.md`, round 2026-10-27b handoff.
- **K911** · Sheet A's field-vs-EDT check fails on curved (6.751 px) and j_hook_cross (6.805 px)
  since its K900 regeneration (`7c972033`); not run at `5048670e`, so it may predate K900.
  `.claude/probes/K868/oracle/checks_synthetic.md`.
- **K913** · Cursive v4: a's fused junction at the font's 47.5 u (frame in the kink, 30.2 vs 52.6
  deg); the a body includes the up pass; d's after-o retrace frame at 36.3 deg; v3's rerun checker
  runs v4's commands; `--guides centreline` unrun. `.claude/probes/K863/trace/NOTES.md` ## v4.
- **K920** · K620's `fa0c61de` costs the phone +5.2 ms on max-fabric (about 2 ms of K905's gap;
  round 2026-10-27c). `docs/design/K156.md` round 27c.
- **K927** · Cursive fits stop at nfev 600 for 16 of 26 letters (since v5.2 q does and a no longer
  does); in v5.1 a and q ended 5.0 and 4.0 u off the trace. `K916_cursive_v51.md` Handoff, Open 5.
- **K985** · K868 S3a5's leftovers: a chain's point count changes between recorded frames (cause unverified); knot
  mode and the settle were never recorded (the GPU stages' checks must cover both); the 8x zoom is assumed (S3a6
  checks it). `K868_s3a5_incremental.md` 11.6, 11.9, 11.10.
- **K986** · Cursive: rough fails n after K944's n edit (facet 0.0056 > 0.0053, peak 14.67 at 166 u), the same with
  and without K981, so the fork is not the cause. Untraced. `K980_cursive_local.md` ## Handoff.
- **K989** · Cursive: frames with a bk (after_o with s: b f h k l x z; s_fused: a c d g o q) still go through K944's
  node alignment, not a rule on the drawn curve (h's node add moved them 1e-4 u); edits are emulated, never made in
  the GUI. `K980_cursive_local.md` ## Handoff.
- **K993** · K868 census blind spots: `label_pops.ts` does not track pieces or switch lines (def drag's eye flicker is
  unexplained), co-located events take the nearest event's label, and muse's frames show stray 1-2 px dark specks.
  `K868_s3a6_motion.md` F3, F6, ## Handoff.
- **K1008** · K868 label's GPU path: a fill-program compile failure skips the fills silently (the `gf` guard in
  `label_pass.ts`), both fill programs compile, the GPU tube program has no K320 budget, and G7's GL error shows
  only on muse (unexplained). `K868_s3a8a_fills.md` ## Handoff, Residuals.
- **K1014** · Cursive J3a's leftovers for J3b: 0 u cusp entries (hi×2, er, es, ow×2), on and en jumping between two
  minima (6.43/5.25 u), 12 maxfev solves, b f h k l e's after-high entries pinned at bounds, ea/et ~2 u below the
  baseline, ne/he at the 30 u bound, no words/template writers, no port sensitivity. `K1009_cursive_ports.md`.
- **K1021** · Cursive B2's measures, reported: g's and q's corners sit 1.96 and 1.89 u above a's (each at its own
  stem top); the new tops run 9.2-9.3 u off the font (a's 8.0); q's junction stretch 0.31 to 0.92 u (within 3.0);
  og's dmax 19.91 to 20.74 u (rough before and after). `K1012_cursive_gq_corner.md` ## Handoff.
- **K1024** · K868 S3a8b3's open points: at one muse_drag point only the GPU's cut root lies on its line, so the
  mirror's root is the odd one (`pops24/same24_fold.md`); lbp's GPU tube program has no fallback (a compile error turns
  the label off, as on master; the edge program falls back to CPU edges), and the cut line lengthened it. Its Q3, Q7.
- **K1027** · Cursive a's and q's preset high joins: after v6.5's rounder tops, ba, va, wa sit 7.6-7.7 u from the font
  (2.5-2.6 in v6.4) and bq, vq, wq 10.0-10.2 u (5.0-5.4); bq, vq, wq start with a ~160° hook (since v6.3). J3c's solved
  joins replace these presets. `K1029_cursive_b4.md` ## Handoff; NOTES `## K1029` N3a, N4.
- **K1032** · K992's continuity tests are slow under full-suite load: the short (D) and (E) 9.1 s and 6.6 s, K1000's (D)
  22.6 s, against 60 s timeouts, so CI has little margin. The short (D) misses F11's jump at u 0.5175-0.52; only the full
  sweep (`SWEEP=1`) and the path test cover it. `K992_s5_branch.md` F16-F17.
- **K1037** · K992's census and test tools (stage 6's leftovers): label_pops calls j56/1's def_flow@w1 pops "none" (nearest
  event 473-719 px away); `oracle_m25dbg.ts` keys on `__dbg25`, so `march27.ts` can't print master's nodes; SWEEP=1 vitest
  ends in "Timeout calling onTaskUpdate"; the census takes 2x its estimate (c27z 34 min). `K992_s6_tie.md` F20, ## Handoff.
- **K1035** · Cursive J3b's leftovers for J3c: oi switches between two minima as o's top moves (13.71 u, as on does,
  K1014); the seven corners (i j p s u w y after o) all sit at the 30° low end, and os skips the font's deep dip; b f
  h k l attach at the 100 bound (oh, ok far from the font) and oe at 90 with one crossing (K948). NOTES `## K1009b` N4-N7.
- **K1036** · Cursive J3b's census and checks: port-cusp entries at s = 0 (hi, er, es) count as 180° seams; the
  own-ends reference is cut at each build's own attach, so it ranks og's b0 (4.35 u) above v6.4 (7.12 u), which
  looks nearer; the i and u continuity sweeps move nothing (sweep the stem-top node). NOTES `## K1009b` N1, N6, N7.
- **K1033** · K868 S3a: at a span bound that coincides with a vertex the GPU and the CPU disagree: between the bisector
  and the next segment's perpendicular the GPU reads span 96 where the CPU reads -1 (muse_hash chain 83, s 21.4652).
  Older than S3a8b3. `K868_s3a8b4_attribution.md` Q10, on `k868-s3a`.
- **K1039** · K868's gate-1 and raster tools (S3a8b5's leftovers): same24 / same28 check the GPU path, not the CPU pieces
  (lbp off); same28 exits 1 on the favicon 404 (it counts console errors); its point counts differ slightly from pops24's,
  not attributed; raster26.ts is not on the 22-float layout. `K868_s3a8b5_shared_cut.md` Q15, ## Handoff, on `k868-s3a`.
- **K1041** · K992's corner march, the switches stage 7 left: the hop onto a far piece across a deep ridge (feet, footMax,
  extent), the fit's sharp fallback, unfaded Newton refusals, the part walk's start gate, boolean cluster roots, rc's J,
  the restart's steep weight. Input to K1040. `K992_s7_recover.md` F23 and ## Handoff (untraced extras), on `k992-corners`.
- **K1042** · `SWEEP=1` exits 1 on vitest's "Timeout calling onTaskUpdate" with 11 of 11 tests passing (seen on
  `k992-corners` under load; likely the file runs over 60 s synchronously, not traced). npm test and CI skip it.
- **K1043** · K868's label band can flip a long run on one edge decision under eps: at muse_flow@w0 t14 one label
  pixel, 6.0e-4 px inside chain 58's edge (eps 1e-3), decides 33 band pixels. S3a8b6's oracle limits: a hairpin tighter
  than h reads as a fold; fills carry no margins. Input to K1040. `K868_s3a8b6_oracle.md` Q17, ## Handoff, on `k868-s3a`.
- **K1044** · Cursive v6.5's leftovers (B4): a's largest |dk/ds| (8.51e-4 /u²) sits above g's 7.07e-4 mark where the held
  bowl starts; fa and fq moved 0.67 / 2.39 u, and no census word holds them; oa and oq dip 4.4 / 3.4 u deeper, the attach
  on its bound (34.3 / 34.6 u from the corner). For J3c. `K1029_cursive_b4.md` ## Handoff; NOTES `## K1029` N2c, N3c, N4b.
- **K1058** · Removing a worktree can empty the main checkout's node_modules: each `.claude/worktrees/*`
  links node_modules by junction, and `git worktree remove --force` deletes through it (2026-10-29 20:18,
  remover unknown). The worktrees sit inside the checkout, so Node finds packages upward: try no junction.
- **K1063** · `scripts/run_node.mjs` still opens Vite's WebSocket server, so parallel runs print 'WebSocket
  server error: Port 24678' (harmless); `server.ws: false` should stop it (K1061, 011274f9).

## Approved, to schedule (2026-10-11)

- **K22** · Dynamic resolution scaler (2x up to 3x when frame time
  allows; down when struggling). Part of K6, refined after G3.
- **K23** · GPU particles (G2.4), GPU fog-of-war accumulation, the yarn as
  a gap-masked ribbon (G3-5).
- **K322** · Art, sound and music by people (Levi, 2026-10-14 21:47): commission or license better
  icon art, sound effects and music before launch; credit each artist on the credits page (K321)
  with their terms (`notices/credits.ts`).
- **K804** · Beat indicators (Levi 2026-10-21, once there is budget): a dropdown param for showing
  when and where beats fall, inside multi-beat runs too: a pulse or a pluck at the dot, a crisp ring
  from its marker on each beat, or dots at the beat points along threads and junctions that pop with
  a ring when eaten. Takes over K114 beat item 6, the pulse (`docs/design/levi_notes_2026-10-21.md`)
- **K805** · Dot-eater mode (Levi 2026-10-21; after the paper look K797-K800, once there is budget):
  eat dots for points; wandering enemies (not ghosts: a shape of our own) send you to the start (the
  hit recorded, dots stay eaten, the trail erased); big dots flip who eats whom (you speed up,
  enemies score); enemies enter at a third marker (its own icon and placement param, its last run
  closed to you); turns or real time. Builds on K804 dots, K80, K114, K83, K138 one-way runs
  (`docs/design/levi_notes_2026-10-21.md`)

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
  override. A call for Levi whenever they want it (raised by K100).
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
- **K566** · Skip the intro replay on a title toggle (K552: ready 13.5 s after turning the title on,
  6.9 s after off; the clock pauses meanwhile).
- **K567** · If K320's split is revived (K550): draw with it only while cold, then swap to a combined program
  pre-compiled off-thread; or the cheaper try forms. All untested (`docs/ledger_notes.md` K567).
- **K577** · Worker-host A/Bs: try `__knotStepUntil(5)` after the freeze to make them reproducible,
  and promote the K550 kill's `ab_probe.mjs` to a tracked `scripts/` probe if more A/Bs follow
  (`docs/design/K550_kill.md`, Handoff).
- **K589** · A sheet of other foil flash sizes: sharper foil (p 128) halves the flashing time,
  softer (p 32) doubles it; so far only counted (K337 handoff).
- **K597** · Census: how many seeds and gestures leave same-chain pairs under the collision floor on
  compressed material (K372's mechanism), to size K595. Harness: `.claude/probes/K372/` (`drag.ts`,
  `cycle.ts`).
- **K598** · K372's open questions: what couples chains 56 and 45 on `?b`; chain 53's hot site at
  p1238-1240; why the drag history picks the awake basin. `.claude/probes/K372/results.md`.
- **K616** · K370's lever A (`grabExact`, off: the newest snapshot while grabbed) saves about 9 ms
  on the daily but doubles the jitter; revisit only with a jitter fix. `docs/design/K370.md`
  (Verdicts).
- **K618** · peakEstimateOf: hoist `Math.exp` out of the per-station loop, only if 0.11-0.16 ms a
  tap ever matters (K194 timings). `src/render/pluck_model.ts`.
- **K634** · The confetti fall's late frames on the phone (~50 fps, 1 in 5 frames at 33 ms): GPU or
  compositor? A tenfold CPU cut gave +0.5 fps. Measure with `scripts/bench_frame.mjs --cdp`; data in
  `.claude/probes/K578/phone/`.
- **K635** · Phone kit: a read-only idle gate before a pass (awake, unlocked, no touch for 30 s),
  `.claude/probes/K578/phone/wait_idle.ps1`. A 31 s gate still lost 6 cells to a touch 3.5 min in
  (K578's phone check).
- **K661** · A HUD popover for K137's rows (strokes, par, snapped).
- **K666** · Sim runs report the greedy player's catches per 100 s of play and the fleers' escapes
  beside raw catches: the trap lengthens greedy games, so raw catches move with game length (K637).
- **K672** · K441 s2: incremental `ExploreGaps.setExplore` (re-declare only the chains whose burn
  changed) saves at most 0.23 ms a frame at 1x, 1.85 at 4x CPU, in the real-time burn race only.
  Only if that race matters on phones; after K139. `docs/design/K441_fire_frame.md` Handoff.
- **K674** · Profile `tickPlucks` while plucks decay after a move: K441 inferred about 15 ms a frame
  at 4x CPU, against 1.6 asleep (untested). With K189.
- **K686** · Star thresholds for collapse games (K139 shows a percentage against par, no stars).
- **K702** · K114 cut: a long carried chain of collapsed runs animates run by run; make it one glide
  (`carryStep` in main.ts)
- **K716** · Smarter walker and cutter strategies for the K114 balance probe
  (.claude/probes/K114/walker/balance.ts)
- **K725** · K138 flourishes: a note per color for the color rule (`src/audio/`, after K720),
  glitter on ice runs, turnstiles and tides timed to the beat (`K138_plan.md` Handoff)
- **K733** · Sound off, further (K720): count volume 0 as sound off (the first input still creates a
  context today), and suspend the context when sound turns off after one exists (a running context
  costs battery and audio focus like the original bug) (docs/design/K720.md Handoff)
- **K735** · K643 leftovers: a crotch injection that keeps the minimum radius, to prove forkMaxLU
  1.2 past 0.79 LU; test/render/ribbon_round.test.ts hard-codes TOL 0.01 instead of importing
  LINT.taperBulgeLU
- **K745** · Frost on icy runs is a flat color; a texture would read better (K138 s1)
- **K752** · A cutPluck counter or last-pluck stamp in the probe hooks, so a refusal pluck is
  checkable at snd=none (K749: cutPluck is synth-only)
- **K765** · CLAUDE.md Project Structure lists about half of `src/game`, `src/ui` and `src/app`
  (2026-10-21: 23 game, 12 ui and 17 app files unlisted, among them K138's rules, K114's beat and
  K137's monsters). List them all (about 50 lines against the 400-line budget), or point at the
  headers as the `app/` line already does? Untouched until then
- **K776** · K767 look notes: the turnstile refusal and hidden reveal toasts sit 9.9 px above the
  move pad; the beat pause screen is near-white and full screen (a dark one?)
- **K811** · Panel search: when the mode hides matches (e.g. "minotaur" in classic shows only Game
  mode), say so in the status, like "3 more in other modes" (K793)
- **K880** · K863 tracer: trace Playwrite US Trad's stylistic sets as alternatives beside v2 (ss01-07
  change 4-19 lowercase each, ss19/20 none; survey `.claude/probes/K863/trace/work5/ss_table.txt`,
  `ss_sheet.png`; ss01's p is wired up as `--p stem`).
- **K921** · Phone A/B of shader variants of one commit: shader text alone moved a cell by about 10
  ms either way (T1, T2 and S2 in round 2026-10-27c), so a probe that A/Bs variants could find a
  cheaper program for every link. `docs/design/K156.md` round 27c.
- **K987** · Cursive: a G2 rule at a smooth node's retrace follower. K981's is G1 only: n's curvature jump grows with
  the drag (2.70e-2 1/fu at s1; K944 1.50e-2), node 6 gains one (1.63e-4), n has 4 kinks (K944: 3). `K980_cursive_local.md`.
- **K1076** · K814 stage 5 (optional): fold SHAPE_FNS (src/core/shapes.ts, line 68) into the SHAPE_REGISTRY
  entries (src/core/shape_injection.ts, line 158), so a pre-defined shape is added in one spot.

## Done

- **K1074** · K658 check: c4 stub. Dropped: stale check, K840 leaves snap no exempt stub; c5 covers snap (K658_page_checks.md) (2026-10-30).
- **K1073** · K658 check: real-time Undo. Dropped: by design, the real-time Stranded banner offers Restart only (K658_page_checks.md) (2026-10-30).
- **K1072** · K658 check: real-time Undo. Dropped: by design, the real-time Stranded banner offers Restart only (K658_page_checks.md) (2026-10-30).
- **K1071** · K658 check: real-time Undo. Dropped: by design, the real-time Stranded banner offers Restart only (K658_page_checks.md) (2026-10-30).
- **K1070** · K658 check: real-time Undo. Dropped: by design, the real-time Stranded banner offers Restart only (K658_page_checks.md) (2026-10-30).
- **K1065** · K658 check: fog IoU 0.9613 after Undo. Dropped: inside K137's 0.956-0.981 spread, the 0.97 line is too tight (K658_page_checks.md) (2026-10-30).
- **K1069** · K658 check: exempt tail crossing. Dropped: stale check, K840 (4507a632) breaks run ends too (K658_page_checks.md) (2026-10-30).
- **K1068** · K658 check: exempt tail crossing. Dropped: stale check, K840 (4507a632) breaks run ends too (K658_page_checks.md) (2026-10-30).
- **K1067** · K658 check: exempt tail crossing. Dropped: stale check, K840 (4507a632) breaks run ends too (K658_page_checks.md) (2026-10-30).
- **K1066** · K658 check: exempt tail crossing. Dropped: stale check, K840 (4507a632) breaks run ends too (K658_page_checks.md) (2026-10-30).
- **K1064** · K658 check: exempt tail crossing. Dropped: stale check, K840 (4507a632) breaks run ends too (K658_page_checks.md) (2026-10-30).
- **K1062** · Muse batch 3, runs G and A-F, reviewed on master. Done in 687e956b (2026-10-30).
- **K645** · K140 frame A/B on one build 5406c4e6: cannons cost unresolved at 1x, +3.2/+5.6 ms at 4x (K653_checks.md). Done in e9e5cc15 (2026-10-30).
- **K441** · Owed same-state rerun done: 8/8 stands asleep at both ends, tick gap +4.24 ms (1x) / +13.16 ms (4x) vs +0.23/+1.85 prediction in docs/design/K441_fire_frame.md. Done in 7bf9f07f (2026-10-30).
- **K814** · Text & emblem rows built from SHAPE_INJECTION_PARAMS. Done in 3fc7b612 (2026-10-30).
- **K658** · K137 page gaps checked: 155 checks in docs/design/K658_page_checks.md, FAILs K1064-K1074, sounds K1075. Done in b51bc22b (2026-10-30).
- **K321** · Credits page: licenses.html became credits.html, Levi header first, Scarborough Fair in Music and sound, Built with Claude Code below art/music. Done in bc18a40f (2026-10-30).
- **K1056** · Real-time lure lasts until the target (run G, K1062): detect() no longer re-spots a lured monster, both clocks suggest the shipped 2 lures / 1 snare. Done in b65bf3fb (2026-10-30).
- **K654** · the moving lead rides uKTeleAt, no texel rewrite (K324 s2). Done in ea3e63b8 (2026-10-29).
- **K650** · the TELE census, GPU vs mirror with the riding lead (K324 s2). Done in a90a1ceb (2026-10-29).
- **K1053** · Muse batch 2, runs A-F, reviewed on master. Done in b849de95 (2026-10-29).
- **K396** · scripts/dev.ps1 LAN dev server, checks verified on 5531. Done in 7b174bec (2026-10-29).
- **K1061** · run_node --config; last vite-node recipes pointed at it, panel/fold runs pass. Done in 011274f9 (2026-10-29).
- **K1060** · workerPreloadScript moved to src/loader/worker_preload.ts (default derived from PARAM_DEFAULTS.physicsWorker); test/loader/worker_preload.test.ts pins its decision against parseParams (probe forms, seeded writer links, overrides, other version, garbage). Done in 528af3ba (2026-10-29).
- **K1057** · scripts/run_node.mjs tracked (was .claude/probes/K708/run_node.mjs); rules recipes rewritten to it, no vite-node left in rules; burn_sim and par_census run through it. Done in d4d83422 (2026-10-29).
- **K783** · a chase starts with 2 lures and 1 snare (PARAM_DEFAULTS; sliders already existed); url_codec defaults pin 0/0 -> 2/1 only, page checks in .claude/probes/K783/ passed. Done in 7128df43 (2026-10-29).
- **K1059** · K1055's request count. Dropped: decided by Claude: count network downloads. The worker fetch is served from the HTTP cache, so K1055's check holds (c70db4fa) (2026-10-29).
- **K1055** · Worker preload back for worker pages: an inline head script modulepreloads the worker chunk unless phw=0 (hello about 26 ms sooner on first loads). Done in c70db4fa (2026-10-29).
- **K1054** · no K138 rule can be on in a realtime chase (fabricRulesOf zeroes them outside classic; chase needs minotaur), so handleChaseTap needs no ruled twin; gate pinned in url_codec.test.ts. Done in 0a58f52f (2026-10-29).
- **K1052** · test type errors fixed 92 -> 0 in 4 batches; tsconfig.tests.json folded into npm run typecheck. Done in 99c4aff7 (2026-10-29).
- **K728** · real-time seeker measured: taken 99.9-100%, slew/banish 4.4-8.9% vs blind 0.2-0.7% (docs/design/K708.md). Done in 9d673405 (2026-10-29).
- **K932** · bench_frame readPixels sync; K923 runner folded to scripts/k923 (.claude/probes/K932/results.md). Done in b6d0e1b2 (2026-10-29).
- **K414** · static worker preload dropped; phw=0 downloads no worker chunk, and default pages lost K7 s7's head start (back in K1055). Done in 2525712c (2026-10-29).
- **K1050** · Muse batch 1 (d504b686..24940b10), reviewed: K994, K788, K743/K762/K763, K747, K807, K810, K393, K414 and K932 landed; K783/K728 reopened (cea08eb5 measured other things); left K1052, K1054 (K743's chase tap), K1055 (K414's preload); batch 2 is K1053. Done in 24940b10 (2026-10-29).
- **K393** · Option B: probe:types groundwork shipped (92 errors/32 files), gates unchanged. Done in f79831c0 (2026-10-29).
- **K810** · shipped 44/44, Fuse 35, uFuzzy 31, fuzzysort 34 (.claude/probes/K810/results.md). Done in 443ebdda (2026-10-29).
- **K807** · nine constants to panel rows (follow, sword/sleeper rings, nearHops, routeWeight). Done in d8aaf37e (2026-10-29).
- **K747** · sword takenAt/slainAt count player moves (inputs.length). Done in cb73089e (2026-10-29).
- **K763** · hidden counter only when a hidden run was placed. Done in 40de45c1 (2026-10-29).
- **K762** · backtrack remembers retraced run; turnstile re-entry allowed. Done in 0e73c399 (2026-10-29).
- **K743** · planRouteRuled plans ruled taps; renderer targetAt uses it; the real-time chase's tap does not yet (K1054). Done in f61eff23 (2026-10-29).
- **K788** · placement rejects trapping one-way draws (ruleHasTrap); census 42/50+44/50 -> 0/50. Done in cff5a0d7 (2026-10-29).
- **K994** · audit clean: vitest ^4.1.12, @xmldom 0.8.15 (npm audit fix). Done in 732ab944 (2026-10-29).
- **K1029** · Cursive v6.5's a and q tops (B4): approved by Levi's look, with g's, 2026-10-29 (untracked `K863/trace/work25/base`, no commit).
- **K1038** · K992's F19 landing-bound residual. Dropped: moot, the march goes (K1040) (2026-10-28).
- **K1031** · K992 stage 5's branch rule leftovers. Dropped: moot, the march goes (K1040) (2026-10-28).
- **K1023** · K992 stage 4's untraced spots. Dropped: moot, the march goes (K1040) (2026-10-28).
- **K1018** · K868 flip_0, a 13 px row that differs between the label paths. Dropped: moot, both label paths go (K1040 S8) (2026-10-28).
- **K1017** · K992's census, the unexplained classes. Dropped: moot, K1040 S6 recensuses the new field and master's path goes at S8 (2026-10-28).
- **K1016** · K992 stage 3's tracked foot hops at a concave vertex. Dropped: moot, the march goes (K1040); S1's recordings gate covers a foot at a vertex (2026-10-28).
- **K1011** · K868 label's GPU band edges (BORROW, sub-float32 pieces). Dropped: moot, K1040's band strips borrow no clusters (F7) (2026-10-28).
- **K971** · K868's label rebuild with `lbi` at 0.44 s a frame. Dropped: moot, K1040 drops the per-frame FieldModel (F4) (2026-10-28).
- **K964** · K868's label residue after S3a2. Dropped: moot, the S3a label path goes (K1040 S8); its class B is K1040 S1's question 1 (2026-10-28).
- **K984** · K868's readback call before S3a10. Dropped: moot, K1040 reads nothing back and rules out S3a10 (F4) (2026-10-28).
- **K979** · K868 S3a4's measurement leftovers. Dropped: moot, the per-frame FieldModel they measured leaves the frame (K1040 F6) (2026-10-28).
- **K1022** · K992's c23w makes the label's CPU build 1.75x master's. Dropped: moot, the corner march goes and K1040's corners are closed form (F6) (2026-10-28).
- **K1015** · K868 label: passReach steps by h/8. Dropped: moot, K1040's depth needs no passReach walk (F6) (2026-10-28).
- **K1010** · K868 S3a8d, the switch lines found on the GPU. Dropped: moot, K1040's label has no switch lines (F6) (2026-10-28).
- **K1007** · K868 S3a8c, S3a8a's leftovers (window range records, the near test, the p95 spread). Dropped: moot, K1040 replaces the CPU label path they measure (F6) (2026-10-28).
- **K992** · K868 corner rules continuous in the geometry: the corner march (stage 4's c23w landed in 9b549d30). Dropped: superseded by K1040, whose corners are closed form (F2, F6); worktree `k992-corners` kept (the census kit) (2026-10-28).
- **K868** · Border look, junctions done right: one field renderer with exact G1 fillets, checked against a CPU oracle (`K868_field_border.md`). Dropped: superseded by K1040, which carries its goals (F1, F6, F7); worktree `k868-s3a` kept (oracle30, the recordings) (2026-10-28).
- **K1034** · Cursive v6.4 looks: Levi picked b0's joins out of o, ot's tangent entry (Ht) and v6.4's og. Done in 67e1bf84 (2026-10-28).
- **K1030** · Cursive og: Levi kept v6.4's (o meets g's left shoulder at 50.5 u). Done in 67e1bf84 (2026-10-28).
- **K1028** · Cursive tools for J3b: own-ends census and sheets, the run-on font reference, bg/wg/vg census words; b0 built through B3's reader (`work24/b0_build.log`). Done in 72ef51cb (2026-10-28).
- **K1026** · Cursive joins into g after B3's refit: Levi likes bg and vg where v6.3 lands them (2026-10-28); J3c keeps that attach, wg's with them. Done in 3b03127c (2026-10-28).
- **K1025** · Cursive v6.3, by look: Levi likes g's new top (2026-10-28); a's and q's tops follow (K1029), the joins into g go to J3c (K1026). Done in cbd489be (2026-10-28).
- **K1020** · Cursive g's top refit to curve evenly from the corner, like a's and q's (B3, v6.3; largest |dk/ds| 6.66e-3 -> 7.07e-4 /u^2); the joins into g it moved are K1026. Done in f2c2db5b (2026-10-28).
- **K1019** · Cursive reader: frames carried by true arclength (B3's `asdrawn_k1019.py`): ba, va, wa 6.8-7.0 -> 2.5-2.6 u, bq, vq, wq 22.9-23.3 -> 5.0-5.4 u; the census measures a solved join at its own ends (K1028). Done in f2c2db5b (2026-10-28).
- **K1013** · Cursive o's join, by look: Levi picked B (a point at o's top, then a short run back: "B for o's exit"); J3b builds it and fixes its dips and the oe crossing (K1009). Recorded in 15323c08 (2026-10-28).
- **K1012** · Cursive B2: g and q take a's top-right corner, one point with two tangents (v6.2; Levi's request); g's top is K1020. Done in ca7d2da3 (2026-10-28).
- **K1004** · Cursive o and a after B1: Levi likes a's top corner; o's exits are bad, and J3 takes them (K1009). Answered 2026-10-28.
- **K1005** · Cursive joins out of B1's o start low. Dropped: superseded by K1009 (solved joins replace the re-fit).
- **K976** · Cursive o's exit as an abrupt cusp, then a slight overstroke (Levi): built in B1 (v6.0); whether it looks right is K1004. Done in 86a2fca8 (2026-10-28).
- **K995** · Cursive b's lead-in as one even curve: B1 took out the knee (score 0.0357 to 0.0004; 3.20 u off the font's lead). Done in 86a2fca8 (2026-10-28).
- **K996** · Cursive body edits J2 measured: p's end and h's start done in B1; f's loop end continues as K990, the b, v and w exits as K948. Done in 86a2fca8 (2026-10-28).
- **K962** · Cursive joins J2: one frozen setting per key, nothing fitted at build time; hooks 28 to 10, comb spikes 62 to 16; minimum's m tail, hippo's po, ma and la smooth (fo's burst is f's body, K996; h's entry K991). Done in b1023618 (2026-10-28).
- **K946** · Cursive generator hooks: d's entry fixed in J2 (nd and lead d, no hooks); b's lead spike gone (its knee is K995); the hippo lead-in is K991, na and nq (unmeasured) K998. Done in b1023618 (2026-10-28).
- **K988** · Cursive: maze's z exit hook (the capped comb spike) gone in J2, ze 2.28 u; a seam micro-hook, like the J1-kept sets still at the floor (K948). Done in b1023618 (2026-10-28).
- **K975** · Cursive v5.8, Levi's review: another pass before the hand edits: o's exit (K976), the a k p f bodies (K990), the b h t p entries (K991). Answered 2026-10-28.
- **K950** · Cursive word-final e tail: long (Levi, 2026-10-28: "Long tail on e seems goood"), already the default of J1's `build_from_svg.ps1` (c23c6980). Done (2026-10-28).
- **K980** · Cursive J1: every derived piece local (v5.8's shared fits frozen in the map), the e variants a continuous fit; K944's nine edits pass with untouched pieces at 0 u (baseline up to 5.12 u). Done in c23c6980 (2026-10-28).
- **K981** · Cursive retrace rule: a smooth fork's departing handle stays collinear, so n's far fork no longer turns (G1 only: K987; rough still fails n: K986). Done in c23c6980 (2026-10-28).
- **K983** · The docs name Levi instead of the old pronouns: 211 of 225 hits fixed in 66 files under `docs/` and `.claude/rules/`; the 14 left are quotes, named other people, game characters and one letter pair. Done in d285ce71 (2026-10-28).
- **K944** · Cursive `--from-svg` reads Levi's edits as drawn: an Inkscape save reads back within 6.05e-7 u, the build from it matches v5.8's byte for byte, nine scripted edits read back exactly (`work17/dbg/build_from_svg.ps1`). Done in 3cad6ab8 (2026-10-28).
- **K970** · Cursive tools: `eye`, `fid_cmp`, `nodes_pairs`, fewnode's G2 tally and the `--end-budget` header, fixed in the `_k969` copies. Done in 4a178950 (2026-10-28).
- **K969** · Cursive v5.7's small comb bumps: a's, k's crotch ripple, y's exit corner and b's spike gone in v5.8; o's exit is K976, the rest K977. Done in 4a178950 (2026-10-28).
- **K968** · Cursive's checker read one-cubic strokes as 0: `rough_k969` reads x 1.40, x2 0.17, t2 0.26; v5.7's one-curve x kept. Done in 4a178950 (2026-10-28).
- **K963** · Cursive f's hook: v5.8's new fair peaks 3.85 (v5.7 5.21), its S and the bottom-loop lobe gone; three close nodes stay (K977). Done in 4a178950 (2026-10-28).
- **K965** · Cursive v5.6's peaks and ceilings: in v5.7 every stroke is at or below its v5.6 peak (x2 0.13 -> 0.16 aside), k, q, r, y and i under v5.4's, q and r under the ceilings; f's hook stays in K963, o's exit in K969. `K965_cursive_v57.md` ## Handoff. Done in 6942d35c (2026-10-28).
- **K960** · Cursive v5.6's eye flags over 3 (r@669, w@618, k@2136): gone in v5.7, none new; the looser band clears w and k, the junction stretches r. Done in 6942d35c (2026-10-28).
- **K959** · Cursive v5.6's exit ends: each body faired 40 fu past its smooth cuts, its end frames re-taken from the faired centreline; o's hook and e's flick gone. `K959_cursive_v56.md` ## Handoff. Done in ef4232ca (2026-10-28).
- **K945** · Cursive v5.5: the centreline is the medial axis of the font's thinnest outline (on the font's axis, 0.00-0.57 u in the moved runs; v5.4 0.4-2.8 u), fair is the default, the roughness ceilings tightened; leftovers K959-K963. `K945_cursive_v55.md` ## Handoff. Done in 50183203 (2026-10-27).
- **K939** · Cursive: the a/g/q stem tops are corners at the font's V (0.13, 0.26 and 0.00 u from it; d starts at its cusp), no U. `work13/vtops/vtops.png`. Done in 50183203 (2026-10-27).
- **K928** · Cursive: `--split fair` is the default (v5.5); reading Levi's edited template as drawn is K944. Done in 50183203 (2026-10-27).
- **K942** · Label ink's settled rules are the oracle's defaults (the crossed yield order, unit-tested; labTie "surface"); its other switches removed. Done in e2926d0e (2026-10-27).
- **K934** · K868 re-count: the free-end check counts runs of ink (31 free ends, not 83); the settled rules are the oracle defaults (K942); extent part; sheet K at play size. Done in e2926d0e (2026-10-27).
- **K940** · Label ink rule fixes behind switches, all off (`labFill: "yieldOrder"` with `labYieldChain`, `labCapReach`): the crossed yield form is right where plain yield was 82% wrong; change 2 hides crossing lines. Sheet J and S's crops. `K940_label_fixes.md` ## Results. Done in 4e0ce01d (2026-10-27).
- **K926** · Cursive v5.4: e's two high entries from the font (o entry after b o v w, g entry after c g j y z; be 31.17 to 2.89 u off the font's connector, ve 31.17 to 3.46, ze 12.45 to 2.05), en 7.08 to 1.15 u, er 8.35 to 2.36. `K926_cursive_e.md` ## Handoff. Done in a99b2d64 (2026-10-27).
- **K929** · Cursive: a word-final e draws its exit, cut where it has risen as far as the m/n/y/d tails (51.1 u, ending 1.46 u from the font's exit; the cut rule is K950). Done in a99b2d64 (2026-10-27).
- **K930** · Cursive v5.3: few-node G2 strokes (m 157 to 26 nodes, a 109 to 19; bodies a median 13 nodes, within 0.94 u of v5.2); the `--from-svg` hold is prototyped, not wired (K944). `K930_cursive_smooth.md` ## Handoff. Done in fa7efad8 (2026-10-27).
- **K924** · Label ink artifacts traced to their rules (M1 cap cut, M2 fill over a foreign tube, M6 fill z, M3 tie; S, a crossing inside a cluster, is a K868 design call); five diagnostic flips in OracleParams, off by default; rule changes ranked. `K924_label_artifacts.md` ## Results, ## Handoff. Done in 1a75731f (2026-10-27).
- **K925** · Cursive v5.2: the a/c/d/g/q dip fixed (eye check a 9.27 to 1.91, q 8.09 to 1.92), one eye scale, o's junction at 86 u (its joins stay inside the font's fill). `K925_cursive_v52.md` ## Handoff. Done in bec83b02 (2026-10-27).
- **K922** · K868 stage: depth over the whole overlap, endSnap (a float bug; real free ends 105 to 83) and extent part, behind switches that default off; sheet I. Brief ## Results, ## Handoff. Done in 4e8b1c7c (2026-10-27).
- **K923** · S3's Pixel bench (K868): as specified 4.8-5.5 ms at fit and 2x, over the 4 ms budget; with a screen-space LOD and a packed 32-bit label 1.6-2.7 ms at every zoom (p95 at most 3.43); a disc search 4.5-6.75 ms against G3-1's 24.5-48. `K923_s3_bench.md` ## Handoff. Done in b5fff04b (2026-10-27).
- **K917** · Cursive junction heights. Answered by Levi (2026-10-27): "sgtm"; 60 u for a, c, d, g and q; o at 86 u, chosen on the sheet ("Seems better than the other two sets"). `K863_trace.md` ## Levi's calls. Done in 95ef67d6 (2026-10-27).
- **K916** · Cursive v5.1: whole-stroke fairing (`--split fair`), leads into a/c/d/g/o/q from the left, the join refit, the K917 sheet; leftovers in K925-K928 and K917. Done in e1daa76f (2026-10-27).
- **K918** · K909's oracle leftovers (extra ink, #16's group on top, sheet F's spur, hairlines, seam and speck, S3's far pieces, geo's shorter spans). Dropped: superseded by K924: K915's label ink removes S3's far pieces and most group-on-top ends; the rest moved to K924 (2026-10-27).
- **K915** · Borders from the visible surface: oracle `ink` surface and label (free ends 228 to 100 on the real scenes, extra ink 71 to 94; d1-d4 close with angular cuts), `hookLook` seam, form B rejected, S3 as two passes, sheet H; verdict adapt; follow-ups under K868. Done in 69e304ed (2026-10-27).
- **K901** · Cursive: r after a high exit dips, as the font's does (Levi: "dip"); `docs/design/K863_trace.md` ## Levi's calls. Done in c1f25160 (2026-10-27).
- **K904** · Cursive v5: a, c, d, g, o and q fused at 60 u, the high entry mode, every split a G2 blend (peak curvature ratio max 120.5 -> 4.8), r after a high exit both ways; steps 4-5 moved to K916. Done in 1f5818eb (2026-10-27).
- **K906** · Phone round 2026-10-27c: T1 = K525's TELE paint item (`a64390b0`, dense +11.0 ms), T2 = K137's fray (`24ea1b3b`, dense -13.1 ms); `docs/design/K156.md` round 27c. Done in a9c4dfec (2026-10-27).
- **K907** · The phone kit tracked: scripts/phone_pass/ (12 files with headers), tested on the phone in round 2026-10-27c; k539_g31.mjs and pixdiff_g31.mjs only parse-checked. Done in a9c4dfec (2026-10-27).
- **K909** · Geometric junction groups behind groups: "geo" (free ends 228 to 227, so k883 stays the default), truth geo's crossing order, the hookLook switch and sheet G; leftovers in its handoff. Done in 33d3a12b (2026-10-27).
- **K905** · Root paint GLSL compiled out unless a root is drawn (K_ROOT): phone render sync -18.9 dense, -25.7 max-fabric, -12.3 ms knot; pixels unchanged. Done in c8814902 (2026-10-27).
- **K910** · K900's sheet B3: do the magenta free border ends cover every missing border on muse_hash? Answered by Levi (2026-10-27): "Yes, I think so"; the free-end image check judges K909.
- **K902** · Cursive v4 (probe-only, untracked `.claude/probes/K863/trace/` `out7/`): join frames by a walk to the font's connector (smooth-end angle mean 22.1 -> 4.7 deg), calibration mean 3.218 -> 2.175 u, test-word pairs over 4 u 22 -> 10, a's fused entry (0.3 u); r after high exits and the variants measured; two-mode design in its brief's ## Results. Done in cece1bb (2026-10-27).
- **K900** · Oracle holes: crossing 292 fixed (same-chain joins refused, crossing cut at L + h), census positions, two independent checks (geometric truth, image free ends), sheet B3; handoff in its brief. Done in 263bc134 (2026-10-27).
- **K893** · Phone round 2026-10-27b: G3-1 undone at head by hand wins 14.5 / 15.9 / 11.2 ms (dense / max-fabric / knot) but is not clean; the week's steps are K573 1b (knot -21.4), K620's root GLSL (+22.6 max-fabric) and K854's outline (+15.3). Done in 69ac4e03 (2026-10-27).
- **K891** · K883's sheets B2 / F / worst12. Answered 2026-10-27: B2 shows about twice the blue-marked misses (census undercounts; K900 redirected), F lgtm (cr 0-6, default 3).
- **K886** · K863 cursive v3: letter bodies with join frames, G2 connectors per letter pair, template and word sheet. Done 2026-10-27 (no commit; outputs in `.claude/probes/K863/trace/out6/`, template on Drive `K863/`; follow-ups K901-K903).
- **K883** · K868 oracle: the K883 span rule (no group holds both passes of a crossing) and the `cr` mapping; missing border samples 1540 to 208; follow-ups K891, K898-K900. Done in 5048670e (2026-10-27).
- **K832** · SDF + border residuals (Levi, 2026-10-22): SDF gaps bound to the scene's gap table, junction interiors cut in the border look, SDF border darkness; the G3-3 SDF-by-default flip stays gated on Levi's phone look. Done in faa56bce (2026-10-23).
- **K831** · Cursive a/i redesign (Levi, 2026-10-22), with its follow-up after Levi rejected the first stills (`docs/design/K831.md`). Done in 3b5c520f (2026-10-23).
- **K830** · Junction corner style (Levi, 2026-10-22): one `cornerRoundShare` slider (`crs`) that rounds broad gaps first and keeps narrow points sharp; stills `.claude/probes/K830/`. Done in e5fbdff4 (2026-10-23).
- **K881** · K868 sheet E: G2 corners against G1's rolling-ball arcs. Answered by Levi (2026-10-27): "In sheet E, I don't see any difference with G1 vs the others"; G1 stays, K882 dropped.
- **K878** · Cursive trace v2's three questions. Answered by Levi (2026-10-27): ss02's `p.jmc` (the retraced stem, with an exit and no pen lift), joins generated per letter pair, the font's proportions at x-height 120; K886 builds v3.
- **K874** · K868 S1b sheets B and C. Answered by Levi (2026-10-27): B, the oracle's look is right but misses some borders; C, the corner rule is taken and the `cr` slider stays, now scaling the approved corner. Both go to K883.
- **K879** · K863 tracer v2: crossing repair where a letter crosses itself, and the eight answer combinations for K878. Dropped: superseded by K886; v2 was delivered untracked (`.claude/probes/K863/trace/out5*`, all 13 crossings true X) and never uploaded (2026-10-27).
- **K882** · K868 S2b, only if K881 picked G2: why both G2 curves cross a side at acute corners. Dropped: K881 kept G1 (2026-10-27).
- **K870** · K868 S1b: the CPU oracle (`src/render/field/geom.ts`, `oracle.ts`, `checks.ts`), checks 1-9 and 11, 12 synthetic scenes, contact sheets A-D. Done in 2b798a93 (2026-10-26).
- **K869** · K868 S1a: the scene exporter (`__knotSceneExport`, `scripts/export_scene.mjs`) and 21 real scenes (65 variants) for S1b. Done in a3e915cb (2026-10-26).
- **K858** · Research adoption round: curves 3.2 became K859, cursive K860/K861; curves 3.3 (one field-shaded border) is now K868. Done in ec3a8b30 (K859) and f86068be (K860) (2026-10-26).
- **K861** · Fair re-authoring of a/i against K860's targets. Dropped: rejected by Levi ('they are bad'), superseded by K863's clean slate; its re-fit (b2c53c30) stays the live a/i data until K863 lands (2026-10-26).
- **K866** · Global union-field border, ?fbd=1. Dropped: superseded by K868 (its global union fused crossings too, then un-fused them with gates); never committed, code parked at 6e12716e (branch park/muse-2026-10-26) (2026-10-26).
- **K865** · SDF union-field junction border, ?sfb=1. Dropped: superseded by K868; never committed, code parked at 6e12716e (branch park/muse-2026-10-26) (2026-10-26).
- **K864** · K862 follow-up: cosine-warped rim samples, per-side side-cut windows. Dropped: never committed; parked at 6e12716e (`park/muse-2026-10-26`), superseded by K868 (2026-10-26).
- **K862** · G1 fillet rims (two Hermite halves through the old rim's midpoint). Dropped: never committed; parked at 6e12716e (`park/muse-2026-10-26`), superseded by K868 (2026-10-26).
- **K860** · Cursive fairness measurement (cursive research shortlist 1, measurement half): new pure `src/core/glyphs/glyph_fairness.ts` (K108-exact: densePath's signed curvature only) reports per path: min radius, curvature sign flips (deadbanded), monotone-κ pieces (swing-split), total κ variation, excess variation (ripple the piece skeleton cannot explain), max |dκ/ds|; `FAIR` targets (0 flips / ≤3 pieces / ≤0.004 excess) as a report, not a lint gate; synthetic tests (straight/arc/S/wiggle/jittered arc) in `test/core/glyph_fairness.test.ts`. Measured on the shipped K850 data (`.claude/probes/K860/measure.mts`): lint-clean (0 errors xh 2/3) but measurably unfair - a body: 5 sign flips, 10 pieces, excess 0.0339, minR 11.2 GU; a spur: 4 flips, 8 pieces; i body: 4 flips, 6 pieces, excess 0.0085; i stem spur clean (1 deadband flip). Intrinsic flips (entry blend, exit/bottom sweeps) account for ~2 of the body's - the rest is the lumpiness Levi rejected, now a number. Re-authoring registered as K861 with per-path targets pre-registered from this measurement. Done in f86068be (2026-10-23).
- **K859** · Rim curve extracted and measured; the research's premise corrected (curves research §3.2): the wedge rim's math moved verbatim into pure `src/render/ribbon/rim_curve.ts` (pinned by `test/render/rim_curve.test.ts`, frozen-maze diff vs the pre-extraction build = 0 px). Measurement overturned the plan: the corner-projection cubic (K846, "tangent rims") fires only when the edge-line corner lies beyond BOTH flank tips along their tangents - at cuspRadius 3 that needs wedges under ~29°, and on the frozen seed-3 maze the projection is negative on at least one side at 392/392 wedges (`.claude/probes/K859/fallback_count.mjs`, spot-checked ji0: tips ~0.59 out, corner ~0.25). The de-facto rim is the quadratic through the corner (union-outline-exact; G0 joins softened by K854's straddling band). A tangent-Hermite replacement (arc-fit lengths, G1 by construction) was implemented, unit-tested, and measured WORSE - outward bulge overshooting into neighbouring threads at tight junctions, 163k px churn on the frozen maze (`.claude/probes/K857/out/old_site1.png` vs `k859_site1.png`) - so it stays out and `rim_curve.ts` documents why. `rimCurvePoints` is the seam for the next candidate (a biarc through the corner region). Curves §3.1 was already shipped semantics (K854/K857); §3.3 (field-shaded border band) remains deferred insurance. Full suite 2320 passed. Done in ec3a8b30 (2026-10-23).
- **K857** · Borders running across junctions (across the joining thread's end), fixed (Levi, by 2026-10-23, after K854): ROOT CAUSE - joinery skipped every wedge flatter than FILLET_MAX_WEDGE (2.6 rad ≈ 149°): no rim AND no side-cut. That skip is only correct between one chain's own two arms (the near-straight pass-through side, whose ribbon already draws both edges through). A wide wedge between DIFFERENT chains is a real outline corner: skipping it left both facing ribbon edges uncut, so the through thread's border ran straight across the joining arm's mouth. Audit (`.claude/probes/K857/audit.mjs`, frozen seed 3): 5 such junctions of 166 (gaps 150-163°). Fix: the skip now requires `A.chain === B.chain`; wide different-chain wedges get flanks, rim and cuts like any other wedge (one line in `src/render/ribbon/joinery.ts` + comments). Verified: cut entries at j164 flip to left/right true on the previously uncut flanks; the before/after pixel diff at j164 (792 px) is exactly the removed cross-mouth stroke with the rim completing the outline (`.claude/probes/K857/out/j164_diff_crop.png`); same class fixed at a neighbour junction in j110's frame. Classifier (K854 oracle upgraded to mirror the new skip rule, baseline rebuilt via stash): j164 boundary 1048 -> 1250 (outline completed), interior 598 -> 557; j110 interior unchanged (its deep pixels are the crossing-window class). No regression at the K854 trio: interior 620/566/359, identical to K854. Full suite 2316 passed; fill look at j164 shows no fan bulge. The K854 residuals stand (crossing-gap-window strokes near junctions; SDF path still denser, gated). Done in 0c09ef63 (2026-10-23).
- **K856** · In-game markers clip partially at crossings, same rule as the loader's K855 (Levi, by 2026-10-23: "and the in-game markers should behave the same"): the head's and minotaur's MarkerMesh discs are cut by a band along the over pass (only the overlapping slice; the K842 whole-marker alpha dip is retired for these two). `RibbonRenderer.underClipBand(chain, arc, rWorld)` measures the strip (over casing/2 + gap x sin(crossing angle), the K855 form) at the under crossing nearest the marker's arc; `MarkerMesh.setClipBand` converts it to the disc frame (`src/render/clip_band.ts`, pure + tested) and MARKER_FRAG discards inside it. The band's shader half length covers every disc fragment so the across test alone decides (a fixed length let fragments escape at shallow angles). Station markers (start/exit/sword/extras/ticks) sit at vertices and keep the old rule. Verified: `test/render/clip_band.test.ts` (7 tests), full suite 2316 passed; probes `.claude/probes/K856/` - head: 865 band frames in bounded runs while walking seed 7's solution, white-core counts 39 (deepest) / 209-270 (partial) / ~520 (whole); burst21 shows the head sliced along the over thread with the rest rendering; minotaur (turn clock): 1707 band frames, mino_burst2/6 show the disc cut along the pink over thread. Done in 3be655ed (2026-10-23).
- **K855** · Loader marker clips partially at crossings (Levi, by 2026-10-23: only the portion overlapping the thread/gap clips; the rest keeps rendering): K851's whole-glyph dive (hide while inside gap + radius) replaced by an even-odd canvas clip: the band along the OVER pass's line through the crossing, half-width casing/2 + gapSamples x sin(crossing angle), cut out of the glyph in all four motion modes (device px in the moving modes, world units inside the head-mode transform). New pure geometry: `TrefoilShape.crossings` (under pass's arc/point + both headings) and `nearestUnderCrossing`, both tested. Verified: frame bursts in maze mode now show marker white counts between full (1844) and 0 (355..1765, 10 partial frames of 60) instead of binary full/gone, stills `.claude/probes/K854/clip/`; full suite 2309 passed. (At the exact crossing centre the band is wider than the glyph, so it still fully covers there - that IS the overlap.) Done in d0a279f0 (2026-10-23).
- **K854** · Border-mode junction outline, fixed as measured (Levi, by 2026-10-23: borders still ran across junctions and around them "awful"; probes `.claude/probes/K854/`, classifier = K849's silhouette judge upgraded to joinery's exact armReach + cubic rim, physics frozen `phy=0` so geometry can't drift mid-measurement): (1) the ribbon side-cut window now reaches the FLANK TIP (`max(capsule-exit, armReach - 0.05)` in joinery's entries; K849's capsule-exit alone was 0.39 world vs the 0.97 tip at cr 3 - the border redrew beside every rim: double strokes + interior spokes; the -0.05 overlaps the rim's tangent departure so the two solid strokes merge); (2) the fan rim band is SOLID (it was a `smoothstep(0.05, 0.95)` gradient across the whole band = pale crescents beside the ribbons' solid strokes), as wide as the ribbons' band (`borderWidth x casingHalf`), inset PERPENDICULAR to the rim (the apex-ward inset collapsed the band to a point at tips), with an outer ring so the band straddles the rim line like the ribbons' band straddles their edge (drawn only in border look; `vLook 2`, discarded otherwise - knot-mode byte identity stays green); (3) rim tips carry the arc's own flank value (0.75) and the flank fade steps in ~1px at 0.79, so arcs land on the borders instead of fading short or tonguing where the rim doubles back along the edge. Numbers (seed 3, core = junction disc, "interior" = stroke >0.05 world inside the union silhouette): ji96 937->620, ji100 833->566 (strip, upgraded oracle; fan-owned share at ji100 89->49), ji144 590->359; SDF path 1562/1589/1110 -> 1226/1259/719 (still worse than strip - pre-existing: SDF ribbons draw wider than the strip silhouette; the flip stays Levi-gated). Full suite 2307 passed incl. byte identity; K320 junction-frag budget raised 29,940 -> 30,650 with the measured note. RESIDUALS: deep strokes owned by ribbons at CROSSINGS just outside the junction core (crossing gap windows, the K849 class - not the junction outline; visible in classifier deep counts ji100 170), and ~0.03-world tip notches at 300px/world inspection zoom (subpixel at playing zoom). Border islands between a junction cut and a nearby dive gap remain by design (they are silhouette there) and now connect at both ends. Done in ccae4ffe (2026-10-23).
- **K853** · Loader fourth motion + speed cap (Levi, by 2026-10-23): `loaderMove` gains `"spin"` (codec-appended) - the knot's centroid stays pinned at the screen centre, the knot spins around it (exact rotation per frame via `rotationForHeadBelowCentroid`, accumulated continuously), and the marker stays directly below the centroid at the head's own distance, diving at under crossings as in the other modes. Loading-speed range max 3 -> 9 (x3, Levi). Verified: geometry tests (below-centroid rotation + duality with the above mode), full suite 2307 passed; probe `.claude/probes/K852/check_spin.mjs` - pixel centroid pinned ~(322, 307) of 640 across 8 frames, marker x≈319.5 riding y 378-490 below centre. (Headless probes must seed `knotmaze.motion=full`: headless Chrome reports reduced motion and the boot then never spawns the loader worker.) Done in fddb71b5 (2026-10-23).
- **K852** · Loader motion dropdown + loader-only look params (Levi, by 2026-10-23: the move param becomes a 3-way dropdown and the loader gets its own gap/thread-size/colors/fill/marker params, separate from the maze's): `loaderMove` gains `"above"` (codec-appended option; old links unaffected) - the threads still move around the centered marker, but the knot turns so its strand centroid (arc-weighted, `shapeCentroid`) stays directly above the marker every frame (exact angle per frame via `rotationForCentroidAbove`, accumulated continuously, no following lag). New codec-appended params (defaults reproduce the pre-K852 drawing exactly): `loaderGap` 0.6, `loaderThreadWidth` 0.42, `loaderThreadColor` #eccc41, `loaderBgColor` #151b28, `loaderIndicatorSize` 1, `loaderFill` solid/outline/flat, `loaderTrail` 2.6 - `loaderCfgFromParams` no longer reads the maze's gap/threadWidth/pathColor/backgroundBase, so tuning the maze's look no longer dresses the loader (the pre-K852 loader on an old link with a non-default maze look now shows the loader defaults instead; accepted, recorded here). Marker size scales the head glyph and its K851 dive margin in both moving modes and head mode. Verified: full suite 2306 passed; probe `.claude/probes/K852/` - pixel centroid in `above` mode x≈320-324 vs marker 319.4 in every frame (maze control wanders ±130 px), marker still dives 2/8 frames, flat/outline/pink stills + Loading rows in the DOM. Done in 06ea6405 (2026-10-23).
- **K851** · Permanent-loader escape, fixed properly (`.claude/probes/K851/`): the open settings panel was invisible over the kept loader because the desktop `.tp-dfwv` had z-index auto (its 28 lived only in the sheet media query) under the opaque loader overlay (z 15) — the base rule now carries z-index 28; and any page refresh (soft or hard — the page cannot tell them apart) forgets `knotmaze.loaderStays` and lets the intro finish, which the checkbox help now says. The loader's head glyph also dives at under crossings (loader_geometry `underGapAt`: the strand's gap window extended by the glyph's world radius, both motion modes), verified by frame sampling (glyph absent in the 3 dive frames per lap).
- **K850** · Cursive a/i measured rework (`.claude/probes/K850/measure.mts` + the lint as oracle, iterating endpoint curvature cross/handle³): the a's topmost point moved from x=49 (flat top, bowl 28..80) to x≈60-66 at y 75-77 with a one-way heading turn from L through the apex (soft, R ≥ 11 GU by lint) and a steep right descent to R; the spur lands at L within ~5° of the body tangent with monotone heading (no hook) and leaves R colinear with the descent; flares shortened to the arcs they dress (40/34). The i's entry control points climb monotonically into J (colinear with the stem by construction), the bottom sweeps one wide arc (was R ≈ 5 GU), the stem flare now reaches plain width at the tip, and the dot is the clean ellipse. Glyph lint clean at xh 2/3; stills `.claude/probes/K850/after/ai2.png`, `ai3.png`. AWAITING Levi's look verdict (K847's was rejected). Residual: pale seam discs inside the a at L and R (taper-root/joinery machinery, not the centerline), and a small notch at the i stem base.
- **K848** · Link-look chip docks against the mode badge on the shared (dropped-badge) row — right-aligned with an 8 px gap, re-laid-out on every badge re-fit (open/close, resize, label change) plus deferred re-fits at load, when the panel starts open; the sheet keeps its top-bar layout. Revises K844's screen-left placement (Levi: not against the screen's left edge; butt it against the row's other chip). Probe `.claude/probes/K848/`.
- **K849** Border-junction strokes, measured (`.claude/probes/K849/analyze.mjs`: CPU union silhouette vs settled stills, layer attribution): the K846 side cut now packs WORLD arc (it was spline-sample units against the strip shader's ctrl units, so it almost never fired), its window is the neighbour-capsule exit extent per side, and the fans' border band is baked into the fan geometry as an inner rim ring (pushFan bandIn = borderWidth × fillHalf) stroking the rim arc alone on wedges. Deep interior strokes at three 4-arm junctions: 569 → 357 device px (fan share 279 → 39); residuals sit at arm crossings (gap windows), plus a small curved-arm residue at one junction.

- **K268 (stage 2 item 2, PROTECT part)** · The protect waiver scales by the covered thread B's visibility per side under the thread reveal: computeGapSlot records B's chain/pass per slot side (slotProtChain/slotProtCtrl), applyExploreGaps writes the clamped vis as a per-slot factor into spare gap texels (texel 3.x / 9.w, solved at 1; GapMaskTable.setProtVis/protVisOf), and only the explore shader variants multiply the waiver by it (EXPLORE_PROT_GLSL; master's gap text and mode-off cost untouched, fans never run it). Mode off restores 1. Proof: unit tests (gap table texels, protVisScale, shader texts incl. fan/still undo), CPU census in a walked fabric state (706 sides, 0 mismatches; 544 hidden / 22 shown / 4 partial), protect probe 5/5 and census3a 22/31 = the K430 ramp baseline (the 3 extra fails in one run moved off on rerun - variance inside K537). The biting-triangle GPU census is K542; the far-branch smooth-min is the item's remaining part. Done in this commit (2026-10-16); evidence .claude/probes/K268/stage3a/out/protect_final/ + census_protect2/.
- **K268 (stage 2 item 2, FAR-BRANCH part - item 2 complete)** · The far-branch smooth-min blends vis-weighted cuts instead of distances in the explore programs only: each branch's geometric cut times its own coverage (the far branch's at its own projection through exploreCutCover), combined as the stronger weighted cut plus the smooth-min dip scaled by the visibility both branches share (farBlendCut; equal coverages reproduce master's blended cut weighted, a hidden branch contributes nothing). Dots frontiers and non-shaped slots keep master's path; master's gap text and mode-off cost untouched. Proof: farBlendCut + shader-text/undo unit tests, all explore variants compile in WebGL2, census3a 22/31 = the ramp/PROTECT baseline (same 9 K537 fails, 0 page errors). With this, K268 stage 2 item 2 is complete. Done in this commit (2026-10-16); evidence .claude/probes/K268/stage3a/out/census_far1/ + far_variants/.
