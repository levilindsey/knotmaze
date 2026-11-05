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

Next free ID: K1186.

## Waiting on Levi

- **K1001** · Corners, sharp or round: where two threads split, the corner is a sharp point (K1040 F1 row 8: r goes to 0
  as the room closes); stage 1's b16 rounded it into a small arch (not landed). Levi sees it in motion at K1040 S4b,
  behind its flag; there is nothing to look at before then. Levi disliked losing rounding at K1114 (2026-11-03): lean round.
- **K867** · Plain-HTTP links (no AudioWorklet) fall back to the legacy synth, which played out of
  tune. Muse's in-tune voice is parked at 5ae5a1d1, awaiting Levi's timbre verdict (cherry-pick or
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

- **K545** · K481 stage 3's look for Levi (built as recommended in 610ef96): lit tick + moved ring on hover/press, phone bigger ticks with the caught-choice tint at the head (desktop ticks alone); the real-phone sheet is in (round 2026-10-20, `.claude/probes/rounds/2026-10-20-d0406df/k545/sheet_k545.png`: a press lights choice 0, the lit tick subtle on a still) and Levi's call whether the tint should show on desktop too. `docs/design/K481.md` (Stage 3 handoff); `.claude/probes/K481/stage3/`.
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
- **K626** · K525's telegraph styles (`mtl`): rims, line, both (or a fourth), in red or white like the hover.
  Red can't pass for your hover but reads worse on a red section. Rec: the three, in red; K525's sheet is red
  only; white rims are still unshot (K525 handoff, What's left).
- **K627** · K114's spider (call 7): S, the minotaur engine with its own icon, or M, which adds
  spinning webs. Rec: S first.
- **K629** · K546's Q1-Q7 (`K546_loss_effects.md`) set stages 2-4. Levi (2026-10-22): the recs stand; for the side cannons Levi wants more spread (K812 follow-up in the param batch). Rec, the design's: sparks; contact, 0.35 s, ~1 s, no
  skip; ash + vignette; a `lossAmount` slider; fire ends Burnt at the beat's end; full beat, then
  restart; dull pluck + thump (fire too).
- **K630** · K244: should a press in a junction core also silence its release when the grabbed
  particle's site draws? Today 8 of 12 core presses pluck a drawn neighbour. Rec: no; what sounds
  always draws, at the grabbed site.
- **K636** · K324 s1's two calls (`docs/design/K324_s1.md`, Handoff): (a) hunt pace 0.9 of yours
  restores the greedy player's catches, the fleers within 4-5 points; rec keep (revert: `git revert
  ce95d40`); (b) five panel labels cut to 23 characters; rec keep.
- **K647** · Path 8 (K336): Reset path during the winning move throws the confetti and records the
  result, but shows no banner. Rec: show the banner, since the result counts.
  `docs/design/K336_cannons.md` Handoff.
- **K655** · K137's slack default: shipped 1 in [0, 1] (greedy makes strict par 30%, careful 89%);
  the brief's half-of-greedy target needs 3 in [0, 4] (48% / 100%). Rec: 3 in [0, 4].
  `docs/design/K137_s1.md` Handoff.
- **K656** · K137's snap strands 40 of 50 greedy and explorer games (pre-K840; not re-measured; crack: none;
  the design expected about 2 in 3): healing runs, a hard label, or a way out under the chase or fire (no Undo
  there). Rec: the hard label.
- **K664** · K74 s3's trap-zone finish (83d4405, K637) lengthens greedy games: 3+ catches 23% to
  33%, solve p90 181 to 310 s, 6% of no-minotaur greedy walks unfinished at 900 s; the dailies ship
  it. Wanted? Rec: keep (it is the trap).
- **K667** · K324 s3's real-time defaults: stalker accuracy 0.45, guard sight 20 / 30 u, guard
  accuracy 0.4 (the turn clock's: 0.3, 30 / 40, 0.3). Rec: keep; greedy catches then match the
  hunter's, 2.5-2.7 a game (sim table: `docs/design/K324_s3.md` Handoff).
- **K680** · Streamer coverage: on desk the K336 streamers cover a fair part of the knot at 2-3 s
  (K653 sheets; the Pixel's at 0.35 and 0.85 s: `.claude/probes/K662/out/sheet_conf.png`). Keep, or
  thin them? Rec: keep; on the Pixel the cost is flat in the amount, so thinning buys no frames.
- **K681** · K139 collapse mode, six calls, each built as recommended (`docs/design/K139.md`,
  Design): score by length collapsed; free ends only when stranded; a finish strand = Stranded +
  Undo; overrides fragile and par; chase and fire allowed (Restart only); snap look + sound (plays
  every move).
- **K693** · K620: per-side stroke effects on the glyph root, not only the colours? 3fa7aab had them, but its
  shader compiled slowly (45-54 s loads against 20-30 s for A). Rec: no, keep the colour blend
  (`docs/design/K620.md`)
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
  define moat (.claude/probes/K114/walker/balance.md). Levi 2026-11-03 added several walkers to the mode, a third knob (K1172)
- **K718** · K580 s5 calls (`docs/design/K580_s5.md` Handoff): the tapered a J bite (0.031-0.059
  LU): accept the square-offset root outline, or lean it (a taper change)? Waist spikes vs T
  (0.012-0.023): accept U as the target? The notaper J seam colour: glyph-only fix (joinery.ts) or
  leave to G4? K643 measured against the bounds (K643.md Handoff): the J bite is 3.1-5.9x the 0.01
  bound but broad, and smooth in stills; the waist spikes are 1.2-2.3x vs T, 0.001-0.003 vs U.
  Phone (K726, Pixel real size): the J bite shows only on ai xh2 tapered (~7 device px); the notaper
  disc is a faint ellipse at xh2; waist spikes 1-4 device px, invisible at 1x; aland at a xh3 has a
  2 px tooth, a hairline arc seam and a 1-3 px waist ledge. Sheets: `.claude/probes/K726/out/glyph/`
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
- **K779** · K137 s4 lures and snares: 20 calls built as recommended, alternatives in the
  docs/design/K137_s4.md Handoff. The weightiest: both tools take no turn; a lure carries 6 runs and
  a cut or broken run blocks it; a lured minotaur drops its hunt; a snare goes only on a run at your
  junction and holds 3 turns; a held monster can still catch you; stocks refill only on a level
  restart
- **K789** · Locks and keys calls (K138 s4 slice 2: built, not page-checked or merged yet): a
  backtrack drops a key its move took, so keys sit only at core junctions; an open lock is hidden
  rather than drawn open; the key and padlock glyphs are placeholders for you to replace
  (`docs/design/K138_s4.md`, its Handoff)
- **K790** · Turnstile dim call (K138 s4 slice 1, live at 91c8d32b): arriving at a turnstile by its
  closed arm leaves the dimmed arm as the only legal move, and the yarn covers the dim. Keep it that
  way? (`docs/design/K138_s4.md`, its Handoff)
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
- **K1075** · K137 sounds unchecked: the snap pluck and the strand glissando need an ear (left by K658; K658
  doc Findings filed).
- **K1080** · On the phone, zoom in and out and tap threads and junction choices: do the tap targets feel
  right? They now stay the same finger size at every zoom (K331, 20b66f6e).
- **K1126** · With High contrast on, a plucked thread now shows the ring ripple whatever ripple you picked
  (unless it is off). Does it read well on the light threads over black? Pictures: .claude/probes/K368/shots/
  (K368, 89836d3b)
- **K1127** · On a narrow phone, the hidden-runs line in the corner panel now wraps in whole phrases (no lone
  'them', no dot at a line's end). Does it read well? Pictures: .claude/probes/K1100/out/k1127/stills/ (360x740 and 320x640, stats off and on; K1100, 22b5ebab)
- **K1150** · Under the beat, a new Beat indicator choice: the pulse you have today, a crisp ring that spreads
  from your marker on each beat, or off. Does the ring read well? Pictures: .claude/probes/K804/shots/ (K804,
  4f6ff982)
- **K688** · Healing cuts against monsters (Levi took R.3.5, decision 6): a cut closes again after a few
  moves. The design doc is done (`docs/design/K688_healing_cuts.md`, 182cfc8d). Its five questions wait on
  Levi: the heal count, the charges, the trapdoor, par beside cuts, the fire.
- **K207** · Fog on a path you walk back over: it used to clear a little more with each pass (crisp edges);
  since 16b1c56f it stays as the first walk left it (soft edges, a bit tighter). Keep the new look? Pictures:
  `.claude/probes/K207/shots/k207_fog_pair.png`.
- **K1140** · Memory modes, brainstormed 2026-11-03 at Levi's request (show the route, hide it, walk it):
  Glimpse (the base; a wrong move is one that does not shorten distToExit), Shuffle (a shake re-settles the
  knot after the glimpse; check it moves enough, else rotate or mirror the view), the myth (K80 4.23) plus a
  Retrace encore, Echo (Simon by pitch; needs K1139's route pulse), Beacons (K80 4.17 plus route beacons),
  memory hints (`hints.ts`: the next 3-4 runs, then fade). Rec: Glimpse first, with Shuffle as its hard
  setting. Levi's picks pending.
- **K1119** · Cursive J3g (v7.0), Levi's answers to v6.9 (2026-11-03): b, v and w exit between v6.8 and
  v6.9, closer to v6.8 ("still exit somewhat downward and with a swoosh"); the six a/q joins get v6.6's dip
  back ("We need that dip"); the e after them decided by the checks. One sheet per letter for Levi.
  - owner: nobody since 2026-11-03 08:47 (merged; agent `adcba68466fb7684f` of claude session 7301c55b-f743-4e00-a519-883d9aaaaa7c)
  - branch: mainline; last commit: `6d7dc73f`
  - evidence: .claude/probes/K863/trace/ (work30/, out30/, NOTES ## K1119)
  - next: Levi looks at the v7.0 sheets (b/v/w exits, the a/q dip, be/ve/we: v7.0 or e60, the br dip), then the c stage (K1112's next letter)
  - brief: docs/design/K1119_cursive_j3g.md (its Handoff); J3f's in docs/design/K1113_cursive_j3f.md
- **K1172** · Walker modes, Levi's brainstorm (2026-11-03): guide it, program it, a flock, stop them (and a tower
  defense), steer it live, bend and tilt. Which family first? (`docs/design/K1172_walker_modes.md`; full text:
  `docs/ledger_notes.md`)

## In progress

- **K1040** · Junction renderer redesign (K868's goals): the label, borders and corners as a per-pixel function of the
  frame on the GPU, in two raster passes (a depth-tested label, band strips MAX-blended), checked against form B's
  float64 reference. Plan S1-S8, about 15 h (F7); supersedes K868 and K992. S1 to S1f merged (S1f: fb348a78); S3 (K1097) merged short of its gate; S1g merged (ca273d04); S3b (K1097) merged (587b7e80, 2026-11-02): 0 DEFECT, the Pixel's 2 ms missed 5-20x.
  - owner: nobody since 2026-11-04 01:55 (S3 runs under K1097)
  - branch: mainline; last commit: `c0df57e3`
  - evidence: the design's F1-F7 (`docs/design/K1040_junction_field.md`); `.claude/probes/K1040/` (the timing prototype; the stages' driver in `s1/`, baselines in `s1/out/` (S1), `s1/out/s1b/` and `s1/out/s1c/`, S1d's runs in `s1/out/s1d/`, S1e's in `s1/out/s1e/` (gate `s1/run_s1e_gate.ps1`, table `s1/gate_table.ps1`; probes `b_rate.ts`, `bend_s1e.ts`, `attr_f4f5.ts`, `lcut_far.ts`, `attr_c2.ts`, `arms_c3.ts`; commands in its Handoff)); worktrees `k868-s3a` (oracle30, the recordings `.claude/probes/S3a/seq13/`) and `k992-corners` (the census kit), kept
  - next: K1097 S3f4 (docs/design/K1040_s3f4_bound.md): what bounds the Pixel's label drawing, after S3f3's drawing levers all failed their census; S1i (K1114) merged in 8b436272 (its root-gate veto: K1163)
  - brief: docs/design/K1040_s3f4_bound.md (S3f4); docs/design/K1040_s3f3_draw.md (S3f3); docs/design/K1040_s3f_draw.md (S3f); docs/design/K1040_s3e_lean.md (S3e's Handoff); docs/design/K1114_s1i_rounding.md (S1i)
  - env: from the worktree, `npx vite --config .claude/probes/K1040/vite.private-cache.config.ts --port 5401 --strictPort --host 127.0.0.1`
- **K863** · Cursive clean slate: trace a real school model's lowercase (Playwrite US Trad, OFL;
  credit it in `notices/credits.ts` if traced data ships) into `cursive_template.svg`'s format, for
  Levi to edit instead of drawing all 26 (Levi, 2026-10-26). Muse's prototype parked at abc135e7.
  - owner: nobody since 2026-11-02 23:06 (merged; agent `a6420b23c491748f8` of claude session 7301c55b-f743-4e00-a519-883d9aaaaa7c)
  - branch: mainline; last commit: `4d0fc282`
  - evidence: .claude/probes/K863/trace/ (`NOTES.md` has every version's files and rerun commands; J3f: `work29/`, `out29/`, `work29/dbg/*_k1113.*`, NOTES `## K1113`; J3e: `work28/`, `out28/`, NOTES `## K990e`); Drive `K863/` (v6.9: `*_v69.svg`); Levi's file to edit: `out25/cursive_template.svg`; the full file list as of v6.6: `docs/ledger_notes.md` `## K863`
  - next: J3g (K1119): b/v/w exits between v6.8 and v6.9, the a/q dip back; then K1112's next letter, c, one stage
  - brief: `docs/design/K1113_cursive_j3f.md` (## Handoff); J3e's Handoff in `docs/design/K990_cursive_j3e.md`
- **K114** · Gameplay round 2, designed in
  `docs/design/K80_gameplay_additions.md` section R: burn race, cut
  verb, beat rider, spider, Pluck Hero MVP. Levi took the recs (calls
  1-6, 8-10; call 7: a separate spider enemy, a no-spiders setting that
  swaps its icon). Burn stage 1 merged (`src/game/fire.ts`; calls K260,
  K280, residuals K281).
  - owner: nobody since 2026-10-21 13:04 (merged; agent `a178a00897a4044dc` of claude session 91b19e11-7759-4638-ba60-4705b011b94f)
  - branch: mainline; last commit: `edcecb94`
  - evidence: `.claude/probes/K114/beat/`
  - next: a real phone pass and Levi feel of tempo/L and the pulse (the spoken-finish-time quirk located 2026-10-21: no speech code exists; a clock switch from any mode restarts the solve, symmetrically - switch_probe.mjs; the While-riding page order passes 12/12 - see the K114_beat.md tail note)
  - brief: `docs/design/K114_beat.md`
- **K115** · Cursive text (Hershey Script Simplex + Greek; `docs/design/K115_cursive_text.md`). Stages 1b-6c done
  2026-10-18: 1b cacf586..19c585c, walk 90dd0da, title 1f8cd12, cartouche 879abee, emblems 171f49e+64d27dd,
  capitals 6351ff3, accents a5d858b, Greek 6d317d3 (suite 1521 green). Levi (2026-10-19, Daily #8): redesign first.
  - owner: nobody since 2026-10-20 13:01 (stage 9 merged at 55b30d1; waits on Levi's calls, K580)
  - branch: mainline; last commit: `55b30d1`
  - evidence: .claude/probes/K115/stage9/ (main checkout since the merge: stills shots1-4, the a search, suite_final.log); stage 8's .claude/probes/K115/stage8/
  - next: Levi's calls (K580); then the rest of the set under the lint, the class-pair lint and items 5-7 (reveal, metrics, sheets); then Levi's look, the final ς (K582), stage 7's live dates, K557, K569
  - brief: `docs/design/K115_stage9.md`
- **K74** · Maze design, decided (Levi, 2026-10-13;
  `docs/design/K74_maze_design.md`): every mechanism gets params whose
  neutral value turns it off. Stage 1 (long-tail dead ends) and stage 2
  (H1, the fused arm cut; calls K261, residuals K278) merged; stage 3 is
  the trap-zone finish, stage 4 the greedy-trap search and K46's bands.
  - owner: nobody since 2026-10-15 08:31 (stage 3's brief merged in a0c6879; docs agent
    `ae4714d103b5fd3bf` of claude session 05e60da0, worktree removed 2026-10-19, K161). Stage 2's agent
    a2c61932e9e358104 (session d8031183) finished; worktrees removed by the K161 sweep
    2026-10-15, branches kept
  - branch: mainline; last commit: `0fd08e7` (stage 4 sim-first; stage 3 83d4405, stages 1-2 8ba8834..30a949a)
  - evidence: `.claude/probes/K74/` (stage 2 in `stage2/`, sheets in
    `out/`); the design agent's probes, copied from its swept worktree 2026-10-15 (its branch,
    patch-identical with master, deleted 2026-10-19)
  - next: K521 done in c79bb74; stage 4 build half done in b728fbf (K527/K532: greedy-trap search behind `greedyTrap`, H1-in-loop only; gF median 2.86 -> 3.38, within-1.5x 20.0% -> 11.7%, both-targets 38.8% -> 59.2%, generation 25 -> 74 ms median; off = byte-identical). Left: the before/after sheet K543 and the phone timing K544.
    Dead-end branches as deeper traps are out of scope; K80's brief does not settle them
  - brief: `docs/design/K74_stage3.md`; stage 2's handoff: `docs/design/K74.md`; stage 4's brief: `docs/design/K74_stage4.md`
- **K80** · The minotaur, decided (Levi, 2026-10-13; design
  `docs/design/K80_gameplay_additions.md` section 0, Levi's answers in
  `docs/design/levi_notes_2026-10-13.md`): a telegraphed hunter with
  guard and stalker variants, real time as its own mode, turn-aligned as
  a modifier. Real time merged (`113ae4d`); turns stages 1, 2 and 3a merged (3a: the wait on
  every input, the give-up and roam-min knobs, the turn pull, K294, K293); stalker call K421.
  - owner: nobody since 2026-10-15 10:15 (turns 3a done, merged 10:15; agent `ad4536aff31e4c7ba`
    of claude session 05e60da0, worktree on K161's sweep list). Stage 2's agent a1579d5c460af2d20 of claude
    d8031183 (earlier agents af5995f5900f0f945 and a9c90f15cd6a55710; worktrees removed by the
    K161 sweep 2026-10-15, branches kept)
  - branch: mainline; last commit: `6d8bb4a` (turns 3b; 3a is 8b5bd9f..43457c1). Merged before: turns
    81892d4..0036d03 and 40f74d1..dea013f, K174 52a4e53..f258161
  - evidence: main checkout `.claude/probes/K80/` (`stage3/`: `wait_inputs.mjs`, `banner/`,
    `compare_after.ts`, `sim.ts`, sweeps, `shots/`, `rerun/K120`, `rerun/K329`; `turns2/`,
    `turns/`, `rt/`) and `.claude/probes/K174/rt/`; the research's branch
    `worktree-agent-a25726c24f262b138` (5 commits not on master; worktree swept 2026-10-15)
  - next: turns 3b done in 6d8bb4a (per-run telegraph alphas, catch feedback with K270 diagnosed and fixed, section 2.10's sounds and fog bleed; the contact sheet `.claude/probes/K80/stage3b/contact_sheet.png` is emulated - the real-phone sheet is K524, Levi's look call K525).
    Next: the chevrons, once Levi answers K696 (K324 stage 2 merged in af0f823). Check their main.ts
    overlap with the K114 walker before running them together.
    Before a daily pins a minotaur, waits enter `fc.taps` and K47's fingerprint covers its
    params; real time's phone check is K177
  - brief: `docs/design/K80_turns_stage3.md` (3b: sections 2.7, 2.8, 2.10; "Stage 3a handoff");
    `docs/design/K80_turns.md`; `docs/design/K80_realtime.md`; `docs/design/K80.md`
- **K156** · The round phone pass, `scripts/phone_pass.ps1` (K152 (1),
  from K81's gate kit): two builds run interleaved through a frame bench
  and a JSON looks list into a summary and sheets. Stages 3a-3c merged
  (737ac58..9ab8a01); rounds 2026-10-14, 14b and 14c are done (14c
  merged 772e48a..e1c2a80).
  - owner: nobody since 2026-11-03 03:38 (round 2026-11-03 ended: K1124, K1125 closed)
  - branch: mainline; last commit: `e7ebb1c4`
  - evidence: .claude/probes/rounds/2026-11-03/ (untracked)
  - next: K1130 (first-shot probe capture); a later window starts with a fresh idle wait and -Phase check, which since K1142 also needs the launcher in front (`scripts/phone_pass/phone_ready.mjs`)
  - brief: docs/design/K156.md, "Round 2026-11-03"
  - env: the phone on its charger, reached over adb 5555 through Tailscale (`adb connect`; not the desktop's USB, Levi 2026-11-02); the pass builds and serves both builds itself (ports 5480-5489); nobody else uses the phone during the pass (K234)
- **K268** · Shaped crossing gaps under thread reveal (K76; Levi, 2026-10-14):
  no gap until the over thread is seen, a dynamic gap for a stub's overlap and
  dead ends. Stages 1-2 merged (stage 2: 2fb3362..0fd6282; MAX fixed, joints fade).
  - owner: nobody since 2026-10-15 11:22 (stage 3a's agent `a5d9b049e72746ad2` of claude session 05e60da0 finished; merged 11:26, worktree on K161's sweep list). Stage 2's agent `a42c63c2db0401edb` (session d8031183): worktree swept; stage 1's `ab65d913a3b9a3dcb` is left, locked by the live Claude process (K161); branches kept
  - branch: mainline; last commit: `19d97f1` (K430 ramp; G3-1 93a231f before it)
  - evidence: `.claude/probes/K268/stage3a/` (census3a.mjs, 31/31 on master; sheet3a.mjs; the k76_probe.mjs copy with the bit-exact view wait; `out/`); `.claude/probes/K268/stage2/`; stage 1's beside it
  - next: Stage 2 item 2 is COMPLETE (ramp 19d97f1, PROTECT 2c03b57, far-branch this commit: the smooth-min blends vis-weighted cuts, census3a 22/31 = baseline, K537's 9 fails unchanged; evidence `.claude/probes/K268/stage3a/out/census_far1/`). Items 5/6 closed 2026-10-21: item 6 already landed (program_registry.ts registers arm-strip-explore, junction-field-explore, pluck-still-explore); item 5's desktop eye passed (`.claude/probes/K268/intro_eye/` r0/r2: joints emerge with their arms in the close-in, no popping fans). Left: the phone proof, riding K156's next window. Probe fixes: K431 (narrowed), K432; far-branch GPU isolation is K547
  - brief: `docs/design/K268.md`, Stage 3a handoff (2026-10-15 11:35), For the next stage
- **K7** · Physics in a Web Worker with render-side interpolation (K28; Levi's
  calls K302). Stages 1-7 merged: the worker is the default (stage 6, call F6), `&phw=0` runs
  in-thread. Stage 7 (05ae710..4420d6c) builds the first scene from the Worker's name and
  modulepreloads its chunk: ready 139-165 ms in on the desktop (master 363-396), first visible
  unchanged (K307's compiles set it). The phone (K411's window) still misses the 250 ms gate: the
  worker is ready 311-459 ms after the main chunk (master 454-764); its module alone evaluates at 233-364.
  - owner: nobody since 2026-10-15 10:32 (the phone pass, done in K411's window by claude session 05e60da0; stage 7's agent `a29b026fa5e2829ee` finished 08:57, merged 09:00, worktree on K161's sweep list)
  - branch: mainline; last commit: `4420d6c`
  - evidence: `.claude/probes/K7/stage7/` (`run_s7.ps1`, `phone_run.ps1`, `s7_desktop.txt`, `s7_phone.txt`, `k7_results.jsonl`, `table_s7.mjs`, `spike/`); stages 3-6 beside it
  - next: Levi's F6 review with the phone numbers (above); then K412
  - brief: `docs/design/K7_worker.md`, "Stage 7 handoff" ("Not done", "For the next stage")
  - env: the phone, under the phone lock (`phone_run.ps1` takes it and runs `stage5/phone_setup.ps1`)
- **K307** · The daily intro's freezes are cold shader compiles (Levi, K302 (8):
  prioritize). Stage 2 merged (9b66725..3ca7f56): a program registry and a warm-up that links
  every program blocking (parallel links never reach Chrome's disk cache, K385; call F8).
  - owner: nobody since 2026-10-15 05:39 (stage 2 done; agent `a11d7ce60428b687d` of claude session d8031183, worktree removed by the K161 sweep 2026-10-15, branch kept)
  - branch: mainline; last commit: `a7e199e` (stage 3 late enable)
  - evidence: `.claude/probes/K307/` (stage 1's tools and traces; `stage2/`: `trace_intro.mjs`, `run_s2.ps1`, batches 1-7, `runs/`, two A/B builds, `k366_firsttap.mjs`); the throwaway branch `k307-proto` (d1aefae), never merged; lore `.claude/rules/render-shaders.md` ("THE WARM-UP")
  - next: stage 3 done in a7e199e (late enable shipped, K517 (b); K385 ships with it - crbug (d) drafted at `.claude/probes/K307/stage3/crbug.md` for Levi to submit; cold first visible 3.27 s, warm restart 0.80 s, suite 1379). Remaining: phone measures only (persistence, Android cache cap, DrDc presents) with K156's next pass. K366 done as measured/attributed in the same commit; its fix is K535
  - brief: `docs/design/K307_intro_freezes.md`, "Stage 2 handoff" and "K385" (the mechanism and the plan)
- **K8** · G3: SDF ribbons drawn from one shared sample texture
  (`docs/design/G3G4_sdf_geometry.md`). G3-0 merged (ebdae8c..b11747e): the four G3
  tables, capture/restore, `scripts/bench_frame.mjs`; no visual change.
  - owner: nobody since 2026-10-15 14:18 (the phone agent `a2c95d8bde8feeea8` of claude session 05e60da0 finished its bench; G3-0's `af653fa7f942f2f1e` (session d8031183) finished, its worktree left, locked by the live Claude process (K161))
  - branch: mainline; last commit: `93a231f` (G3-1; G3-0 b11747e)
  - evidence: `.claude/probes/K8/G3-1/` (the brief's texture sizes); `.claude/probes/K8/stage2/` (`notes.md`, `g3_probe.mjs`, `batch3.ps1`-`batch6.ps1`, `phone6.ps1`, results); stage 1's `.claude/probes/K8/stage1/notes.md`
  - next: G3-1 (`93a231f0`) stays despite +24.5 to +48.0 ms of phone render sync until K868 settles the gap search (Levi, K892). G3-2 landed (777e19a8 seam, K816 70e2fe12 ribbon_sdf, K825 explore variant, K826 mitered silhouette; the residual A/B diff is uniform and needs the same-state capture). Desktop bench 2026-10-22: SDF frame p50 0.3 ms / 10 draws vs strip 1.1 ms / 102. G3-3 (default flip + strip deletion) waits on Levi's phone look and on a phone render-sync measurement of `?rp=sdf`. Lane: G4-1 is replaced for the border look by K868; never beside an R stage, K268 item 4 or another GPU measurement; may run beside K7. K90 stopped (Levi 2026-10-20)
  - brief: `docs/design/K8_G3-1.md`; G3-0's handoff: `docs/design/K8_stage1.md` ("Stage 2 handoff")
- **K5** · Split `main.ts` and `ribbon_renderer.ts` along K1-K3's data lines, with seams so G3 becomes a module
  swap; K6 rides it (`docs/design/K5_K6_split.md`, calls K377). Merged M1-M4 (`src/app/`: camera, frame_loop,
  lifecycle, scene, audio_map; M4 at 592b12b): main.ts 5709 → 3725 lines; R1-R2 (`src/render/ribbon/`; R2 at b88376c): ribbon_renderer.ts 7747 → 5989.
  - owner: nobody since 2026-10-15 15:00 (merged)
  - branch: mainline; last commit: `2a688a6` (R5 c6444e6 + e30edb8, M5 2a688a6)
  - evidence: M4's `.claude/probes/K5/M4/` and R2's `.claude/probes/K5/R2/`; M3's `.claude/probes/K5/M3/` (`checks/`, `frames/`, `step2/`, `k7_results.jsonl` and `k7_table.mjs`, `checks_m3.ps1`, `remap_e6e1734.md`), `.claude/probes/K5/R2/brief/` (the R2 brief's maps), `.claude/probes/K5/R1/` (`checks/`, `checks2/`; `checks3.ps1`, the fog B-vs-B control, never run; R2's inventory `parts.md`, `probe_surface.md`, `surface.json`), `.claude/probes/K5/M2/`; stage 1's tools in `.claude/probes/K5/stage1/`; the design's region maps in `.claude/probes/K5/design/`
  - next: R4 done 2026-10-21 (pluck_host 94e409f5, strip_pass; Handoff in `docs/design/K5_R4.md`); next in the lane is K8 G3-2, then G4-1 before R5. M4 leftovers K506.
  - brief: `docs/design/K5_K6_split.md` (Stage M4 brief); the R lane `docs/design/K5_R2.md`
- **K397** · The thread reveal's stub artifacts (Levi, 2026-10-15 08:01 and 08:06, phone, `?2gozcj.MgaM`):
  stage 2 fixed issues 1, 2, 4 and 5 (1039c5d); left is issue 3, the dark U at a tucked tip's root. At 13:39
  (`.claude/probes/K397/levi_1339.png`) truncated dots and issue 3 still show sometimes; the dot vibration is gone.
  - owner: nobody since 2026-10-15 16:17 (merged; agent `a2806c50953dec23d` of claude session 05e60da0)
  - branch: mainline; last commit: `2ea5c01`
  - evidence: `.claude/probes/K397/stage3/`
  - next: phone pass done (2026-10-16, master 6d8bb4a, Pixel 11): issue 3's dark U and the truncated dots not seen on 13 frontiers of Levi's link; the free cap's look is K477's, narrowed there. Nothing else owed; close when K477 lands. Evidence `.claude/probes/K397/stage6/out/`.
  - brief: `docs/design/K397.md`
  - env: the phone, only if the desktop can't reproduce: `scripts/phone.ps1`, under the phone lock (`.claude/probes/agents/phone_lock_take.ps1`)
- **K459** · A pluck at a stub stops short of its end: Levi wants the vibration on the whole solid
  stub, its rounded cap included (2026-10-15 13:39, `?2gozcj.MgaM`, `.claude/probes/K397/levi_1339.png`).
  With K397's truncated dots and Levi's rule that a pluck sound shows the pluck effect (`docs/design/K459.md`).
  - owner: nobody since 2026-10-15 16:30 (merged; agent `a21ef2f5cb56d9def` of claude session 05e60da0)
  - branch: mainline; last commit: `8ea62ef`
  - evidence: `.claude/probes/K459/`
  - next: item 1 CLOSED 2026-10-21 (hypothesis (iii) rejected, 0-px slot-reject diff; no truncation reproduced at 20 moves - see the Handoff's Open list) and item 3's silence landed in 9a32835b. Left: the free cap's checks (K477: base collapse, tip AA, pinned cap) and the phone free-end look, both Wave 5/eye work
  - brief: `docs/design/K459.md`
- **K370** · Worker input latency, p50 (target 50 ms). Stage 1 merged (918c824): raw pointer
  input on; desktop means daily 118 -> 110 ms, knot 93; phone about 185 (before 4c7f4db). 50 ms
  needs fewer or cheaper substeps (K610, K316), main's drag frame under 12 ms (K611), and B.
  - owner: nobody since 2026-10-20 15:55 (merged; agent `aa8bfad6d1cc3d6bf` of claude session 91b19e11-7759-4638-ba60-4705b011b94f)
  - branch: mainline; last commit: `918c824`
  - evidence: `.claude/probes/K370/`
  - next: stage 2 briefed (`docs/design/K370_s2.md`); desktop half done 2026-10-21: the worker substep premium does not reproduce (daily +4%, knot +4% per substep; no lever built; Handoff in the brief). Left: the phone half in the Wave 5 window (re-measure post-`4c7f4db`, cpu6 clock, paused-render drag)
  - brief: `docs/design/K370.md`
- **K580** · The a's J join, Levi's call (2026-10-20): tangent, its shared stretch a TAPERED spur that
  leaves the junction as wide as both merging strokes and narrows to normal where they turn collinear.
  Open calls: K606; the paint stage is K620. `docs/design/K580.md`; stage 9's handoff `docs/design/K115_stage9.md`.
  - owner: nobody since 2026-10-21 00:58 (merged; agent `a01b18429832678fd` of claude session 91b19e11-7759-4638-ba60-4705b011b94f)
  - branch: mainline; last commit: `c9fb508`
  - evidence: `.claude/probes/K580/s5/`
  - next: Levi calls K718 and K606, then a stage for the chosen fixes; K643 lint upkeep; a phone glyph look
  - brief: `docs/design/K580_s5.md`
- **K546** · Loss effects (Levi, 2026-10-16): a catch ends early today - animate the player and the minotaur/fire all the way to their meeting point first (contact t is computed in by-length mode; turn and realtime catches leave a visual gap), then a gratuitous contact effect at the meeting point plus a whole-screen loss effect akin to the win confetti. Levi's seeds: an explosion; a flare-up and burn-away; the player indicator ripped in half and falling over. Base to build on: K80 3b's catch feedback (6d8bb4a) and K270's fix; the fire side is K114. Design: `docs/design/K546_loss_effects.md`. Its q8 is answered (K525).
  - owner: nobody since 2026-10-20 18:25 (merged; agent `a57e1aa8c7ba233b0` of claude session 91b19e11-7759-4638-ba60-4705b011b94f)
  - branch: mainline; last commit: `4d1a783`
  - evidence: `.claude/probes/K546/`
  - next: stages 2-3 landed 2026-10-21 (Handoffs in the design doc; contact sheet `.claude/probes/K546/s3/`); stage 4 (ripped in half) waits on Levi's Q1 after seeing the sheet
  - brief: `docs/design/K546_s1.md`
- **K137** · K80 section 4's cheap (S, S-M) mechanisms, each toggled (Levi 10-13), after the
  minotaur: 4.3, 4.7, 4.9, 4.10, 4.13-4.17, 4.21 (after K85), 4.26, 4.28-4.30, 4.32-4.34, plus
  Levi's sleeper variant. `K80_gameplay_additions.md`, stages in `sooner_20261020.md`; M: K138, M-L/L: K141.
  - owner: nobody since 2026-10-21 12:49 (merged; agent `ab3d78ded2f219f62` of claude session 91b19e11-7759-4638-ba60-4705b011b94f)
  - branch: mainline; last commit: `0f4df60b`
  - evidence: `.claude/probes/K137/s4/`
  - next: the s3b sims and the K784 phone batch (all look pieces done 2026-10-21: scent 4.34, the fray, darkness/lantern 4.17, sonar 4.26, tunnels 4.13; Handoffs in docs/design/K137_s6.md); muddy runs done in this merge
  - brief: `docs/design/K137_s4.md`
- **K138** · K80 section 4's M mechanisms (Levi 10-13, `docs/design/levi_notes_2026-10-13.md`),
  after K137: 4.1, 4.2, 4.4 (then 4.5), 4.6 (simulate first), 4.11, 4.12, 4.18-4.20, 4.23, 4.24,
  4.27, 4.31; 4.1, 4.2, 4.4, 4.11, 4.24, 4.31 change generation. M-L, L: K141. Plan it after K137 s2.
  - owner: nobody since 2026-10-21 10:36 (agent ac3462d3821227d69 of claude session 91b19e11-7759-4638-ba60-4705b011b94f; paused at the end of slice 2 per Levi)
  - branch: mainline; last commit: `436286de`
  - evidence: `.claude/probes/K138/s4/` (census/, page/ with locks_page.mjs and out/, the test and build logs)
  - next: locks vs the minotaur/fire once rules leave classic (slices 3 shortcut + 4 colors done 2026-10-21, Handoffs in docs/design/K138_s4.md)
  - brief: `docs/design/K138_s4.md` (Relaunch 3 Handoff and its Remainder)
  - env: vite with `.claude/probes/K138/s4/vite.private-cache.config.ts` on port 5402
- **K1097** · K1040 S3, the label pass (F7 of `docs/design/K1040_junction_field.md`): the depth-tested label on
  the GPU, gated by oracle30's verdicts on the 12 scenes (0 DEFECT closes K1033), the recordings' pops and the
  Pixel's 2 ms.
  - owner: nobody since 2026-11-04 03:16 (S3f4 done in Muse run 16J)
  - branch: mainline; last commit: `b3dab0c9`
  - evidence: .claude/probes/K1040/s3/ (s3f4_gate.ps1, split.mjs, vert_count.ts; out/split_s3f4_desktop.md, out/vert_count_s3f4.md, out/check_s3f4chk_summary.md, out/ab_s3f4ab_summary.md; earlier splits out/split_s3f2.md, out/split_s3d2.md)
  - next: Pixel batch (coordinator): s3f4_gate.ps1 -SkipDesktop fills out/split_s3f4.md + out/phone_table_s3f4.md; read it by the Handoff's rule (pass-that-draws -> attachments/stores, instancing -> ftentvvid's draw, vertex side -> cheaper vertices, fragment side -> fewer covered pixels)
  - brief: `docs/design/K1040_s3f4_bound.md`
  - env: the phone through `.claude/probes/K1040/s3/phone_batch.ps1` (run_phone.ps1: both locks, then K1142's ready check), `phone_time.mjs` serving on 5403; desktop timing through `run_locked.ps1`, never piped through `Select-Object -First` (K1174)
- **K1139** · Choice pulses across junctions (Levi 2026-11-03: "we have to make pulses animate correctly across
  junctions"). S1, S2 done (a4dc218a, 16246c90). Answers: the light splits at a fork (A), runs toward you behind
  you, straight through your junction with no dim moment. S3a-S6 next. Full text: `docs/ledger_notes.md`.
  - owner: claude agent a70924906f47e96b0 (K1139 stage 2, launched 2026-11-04 about 13:16, 2 h cap), coordinated by claude session 7301c55b-f743-4e00-a519-883d9aaaaa7c
  - branch: `worktree-agent-a70924906f47e96b0`, worktree `.claude/worktrees/agent-a70924906f47e96b0` (master at acdc2f42 plus the S3b-fix branch cherry-picked, so its copies carry new SHAs; the old worktree `.claude/worktrees/agent-abc94fe39cb25940c` stays as it is); last commit: `c3ec166f`
  - evidence: .claude/probes/K1139/ on both branches (diag_an.mjs, wedge.mjs, taujump.mjs, imgdiff.mjs, run_locked.ps1, batch_fix_*.txt); out/doc/s3b_fix1_*.png; the stage's dumps under .claude/probes/K1139/out/s2/ in the new worktree (untracked); diagnosis and residuals in `docs/ledger_notes.md`
  - next: the agent runs Stage 2: a pivot param per band, no winner across bands, a continuous shared/drawing yield, a ramped crotch fill; T stands at 5.54/255 at cross (Claude's look at S3b's 2x crops of t4 and t5). Then Claude looks at its sheets and merges it or briefs the next stage; the __k1139diag hook goes before any merge
  - brief: Stage 2 at the end of `docs/design/K1139_s3b_fix.md` (c3ec166f on the old branch; on the agent's branch after its cherry-pick)
  - env: the brief's section 7 (the node_modules junction), then Resume step 2 (ports 5620-5639)
- **K1184** · Muse batch 17 (`docs/design/K1184_muse_batch17.md`, drafted by run A): runs B-G, plus runs H
  and I (K1179 S1d and S1e), added at Claude's review and run first.
  - owner: nobody since 2026-11-04 14:58 (runs B-G queued as Muse chain runs 17B-17G, coordinated by claude session 7301c55b-f743-4e00-a519-883d9aaaaa7c)
  - branch: mainline; last commit: `0876de0f`
  - evidence: `docs/design/K1184_muse_batch17.md`; the chain in `.claude/probes/K1053/` (queue.txt, chain.log)
  - next: chain runs 17B-17G in order (Run G stops at its look sheet); Claude reviews each run as it lands, applies the item texts its report gives and looks at Run G's sheet
  - brief: `docs/design/K1184_muse_batch17.md`

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
  new, and pause running agents with their WIP committed.

Running agents are listed under In progress, each with its own next step.
- **K875** · K868 S1b, master's side: on Muse's link master registers only 58-80% with the oracle at
  j49/j123 and #6 finds every band end off (18/18, 19/19; cause untested: gaps or a reveal/fog state);
  its sdf and strip silhouettes differ in width; joinery.ts:1469-1471's comment is stale. s1b_oracle.md.
- **K876** · K868 oracle image probe: auto ink (pink on light paper) and markers/arrowheads count as ink,
  so sheet D fails every image check. Rerun D on the dsf 3 shots, dark paper and cr/fl variants, add
  exact-field checks on S1a's scenes and a bounded reach; compare the END tuck with §3.6.
- **K784** · Phone sitting 6 on real touches: one-way runs (K138 s3, ow), lures and snares (K137 s4,
  lur and snr; emulated only so far), the K775 overflow, and a touch press on an unrevealed hidden
  run (the K764 case); plus the beat rider's catch (K774: `.claude/probes/K774/beat_phone.mjs`
  check B, unrun on the phone); and the turnstile dim on a real phone (K138 s4 slice 1, 91c8d32b;
  K760)
- **K579** · GPU confetti: upload each launch once, move the pieces in a vertex shader, no per-frame
  CPU sim or upload. Pays if K318 raises the counts (Levi asked 10-20); needs K307's warm-up;
  streamers need a CPU sim. The phone's fall isn't CPU-bound (K578). K628.
- **K797** · Paper look, one param per stage (Levi 2026-10-21, `docs/design/levi_notes_2026-10-21.md`; sooner list; sequence `docs/design/pickup_sequence_2026-10-21.md`): stage a (paper backdrop) done in 3be91436, b (fill/border/both prototype) in de9ed5e9; c (gap 0) done in 546e2c73, fans/plucks follow the look in d077eb6c; next d (textures, perf-gated):
  a white paper background (from `vellum`); a thread look of fill, border or both (an edge stroke on each side; over,
  under and joins read from the strokes); the Crossing gap row down to 0 (its floor is 0.04; the codec takes 0); solid
  or textured fills and borders (pencil), if fast enough.
- **K409** · Levi's burn calls 1-3 merged (115eb34..cf70caa). Left: step 4, the ember over the smoke
  (NOT BUILT in `render-explore.md`), after K525 (paint files) and K623/K624. The phone sheet passed
  (K631 part 1, 10-20). `docs/design/K409.md`.

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
  (10edc14), `docs/design/K46.md`, `.claude/probes/K46/`, branch `worktree-agent-a78c73cec4770a14d`.
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
  04ebd28, `docs/design/levi_notes_2026-10-13.md`): skeleton (drone, bass, `pluckVoice` presets),
  then marimba, bells; `pvc`, `acc`, `acl` daily-exempt; Pixel audio probe first; loop K125.
- **K10** · Phone benchmark after every stage (Pixel 11; baseline 2026-10-11: 30 fps at rest, 51
  with `fw=0`; K79 stage A 60). Rerun `scripts/preview.ps1` per ref, `scripts/phone.ps1 -Ports ...`,
  `.claude/probes/K10/phone_bench.mjs`; numbers `.claude/probes/K10/bench_*.txt`.
- **K292** · Mark the panel's maze rows with a subtle top-right dog-ear triangle (Levi 10-14), a key
  at the panel's top; personal settings (`DAILY_EXEMPT_KEYS`, localStorage prefs) unmarked; sheet
  for Levi first. After K298; replaces K84's section; K57 settles edge cases; leads to K297.
- **K265** · High contrast's own highlight (K111 s5; Levi 10-14): white rim on both edges, hard
  inner edge; looks 1-3 go (`hcl`, `__knotHcLook`). After K298; never beside K299, K76 2c, K268 s2.
  `docs/design/K111.md` ("Levi's pick", "For stage 5"); looks `.claude/probes/K111/stage4/sheet/`.
- **K312** · Add K299's lesson to claude-config `rules/lessons.md` (WebGL): GPU float division is
  approximate (ANGLE D3D11 `floor(k*n/n)` = k-1 in 3275 of 16384 pairs), so ring and lap math must
  be integer-corrected. Held while Levi is away (config edits wait for approval).
- **K313** · A loader that looks like the maze (`docs/design/K313_loader.md`): stage 1 (desktop)
  done in K824. Left: stage 2's phone measures in K156's next pass, then camera and trail tuning
  with Levi. Full text: `docs/ledger_notes.md`, K313.
- **K326** · Drop knot mode (`mazeFabric`; `docs/design/K323_game_mode.md` s4-5): A done, the maze
  golden (e67826e9); B deletes (after K323 s1, K307 s2, K329), retargets `scripts/fold_census.*`,
  `test/physics/byte_identity.test.ts`; optional C: knot paint (after B, K111 s5).
- **K328** · Hover rim profile (Levi, 10-14): an opaque outer band, then a
  fade from further in; High contrast reuses it at fade 0. Paint library
  only (K8 s1), with K111 s5 and K265; and hide the glow at strength 0 (K298).
- **K318** · Win effects (Levi 10-14): one show, many themes; thirteen themes in a Win effects
  folder (Theme dropdown, Party default), built in twelve stages. Stage 1 after the confetti stage
  and K111 s5. `docs/design/K318_win_effects.md` ("Build stages").
- **K365** · K279's phone round: run the fixed `k279_phone.mjs`, pick the
  ripple's CSS floor (56 or 68; rec 56 unless it reads small), and only if the
  phone drops frames, a bbox replay (K279.md "Stage 2 handoff").



- **K376** · Look at the reveal's intro close-in, joints now fading with their
  arms (K268 s2, desktop only so far), on the desktop and the phone; fix any of
  the stage's four small residuals that show (`docs/design/K268.md`, "Stage 2 handoff").
- **K543** · K74 stage 4's before/after sheet of three finishes (searched vs shipped, dailies 1-3) was not made in the build stage; make it from `.claude/probes/K74/stage4/build_measure.ts` output or a diag_screenshot pair when Levi wants the look check. Sheet: `.claude/probes/K74/stage4/sheet/contact_sheet.png` (`notes.md` beside it).

- **K548** · Overnight runner has no usage gate: the 92% weekly pause (Next binding rule) is checked by hand only; 2026-10-15/16 runs 1-6 launched at 88% (under the line, audit 2026-10-18) but nothing stops a launch over it. Add a /usage check to the runner before each batch, or a ledger-stamped usage line per run close.
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
- **K690** · K620 checks not run: the root-pixel census (GPU against the CPU mirror), CPU-mirror
  tests on the real a (xh 2 and 3, tp52 and tp60), a cold-compile time with `trace_intro.mjs`
  (`docs/design/K620.md`)
- **K709** · Phone kit hardening: the adb reconnect is built (K717, `.claude/probes/K578/phone/`
  adb_reconnect*.ps1 and watchdog_reconnect.ps1, on by default) but only its healthy-link no-op is
  tested; lib703 END cannot cross midnight; run_k717 skips a late probe; walker_phone takes 1 candidate
- **K786** · When K138 makes monsters obey one-way runs (its stage 6), the lure hop matrix and the
  snare runs (K137 s4, 0697d9a0) need the directed graph; today one-way binds only the player
  (inferred by the K137 s4 rebase)
- **K873** · K868 integration needs flow (`fw`) as its own scene input: fw moves the drawn samples,
  so every K868 scene so far is `fw=0`. `docs/design/K868_s1a_notes.md`.
- **K887** · Refresh the open-work report (K585's artifact): v7 (2026-10-21 09:27) predates the K138 slice 2,
  K809, K794, K795 and K137 s5 merges. List every test, as Levi asked; re-parse the ledger, don't re-run
  patch_items.mjs (`docs/design/K777.md` Handoff).
- **K890** · Move the K863 tracer into tracked `scripts/` (trace_k879.py, review_k879.py, K886's
  join_k886.py, the venv's requirements), without the chart or its crops, once K886 lands.
- **K912** · Cursive generator follow-ups from K902: o and b exits per class (ok 10.9, or 6.5 u);
  f's exit walk; `--high-exit` by rerun; per-left split overfit. v5 (K904) fixed h's and k's after-o
  entries, og, oq, ng and nq. `docs/design/K902_cursive_frames.md` ## Results.
- **K919** · K525's TELE paint item costs the phone +11.0 ms on dense (+2.8 max-fabric, +3.1 knot;
  T1 `9d23dab1`, round 2026-10-27c): try a K905-style compile-out (no TELE item on pages that draw
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
  `b59a72b2`); J3b solved o's exit B on all 26 joins and ot at the crossbar (v6.4, `7c382e05`); J3c gave o b0's joins,
  all converged, with og from v6.4 and ot's tangent entry (v6.6, `6079b195`; looks K1089, residuals K1090); the rest, K1014.
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
- **K1088** · K568's confetti fall costs the Pixel 11 about 15 fps on master (round 2026-10-30 step 2:
  45.0/45.3 fps, 119-122 of ~360 frames over 25 ms, none over 50, against 8fe3d20's 60.1/60.3, two runs a
  build in both orders, thermal status 0). Trim the piece counts or per-piece cost, or accept it.
  docs/design/K156.md round 2026-10-30 handoff.
- **K1112** · Cursive: one join rule for every pair (the answer to Levi's step-back question of 2026-11-02,
  `K863_trace.md` "Levi's calls"): port the exits J3 has not (b c g j k l m p q r s t u v w x y z), letter by
  letter, b, v and w first; then delete J2's presets (join_params `cnct.*`) and the six pins (og, oe, fo, fv,
  fr, fs). No per-pair data: a fix goes into a letter's body or ports. Gates: the census's smoothness and
  locality; font distance reported per letter; Levi judges one sheet per letter.
- **K1149** · Beat dots: dots at the beat points inside multi-beat runs, along threads and at junctions, that
  pop with a ring when the dot eats them; the dropdown and the pulse and ring at the dot are done (split from
  K804). Builds toward K805.
- **K1143** · K1040 S3g (K1097), after S3f: F4's merge scan; F6's SNAP class (within 0.01 px: accept or
  tighten eps); F8's sharp joints; F9, lr 2's upsample class (DEFECT, its 1.9x rate unexplained); F12, a
  float64 mirror pin against labelAt. F10 went to S3d (`docs/design/K1040_s3d_tent.md`).
- **K1168** · K144 stage 1: Google sign-in and per-account sync of the daily results, on a Cloudflare Worker +
  D1 (`docs/design/K144_accounts.md` sections 9-10; brief to write). Built and tested locally first; deploying
  needs a Google OAuth client and the Worker + D1 on the Cloudflare account, from Levi.
- **K1176** · Remove the merged, clean agent worktrees (50 on 11-03; 3 hold closed items' WIP, K372, K578 and
  K441's old briefs: ask Levi) after K1058, since a removal can empty node_modules. First copy `k868-s3a`'s
  `.claude/probes/S3a/` scripts to main (its seq13 recordings already are).
- **K1180** · Form B: let a round's feet run past an arm's root onto the neighbouring arm, so no null band is
  left there (row 15's class: j124, r 1.967h, 0.274h after K1163's softer gate, ab7cad9a). K1179's spike ended
  with no rebuild, so this goes ahead on form B (review section 4).

## Residuals (known, not fixed)

- **K1130** · K309 inject probes: a run's first normal screenshot can come back dark and nearly blank (round 2026-11-02 rimSeam, 3848 bytes against 628314; round 2026-11-03 handoff step 3b). Take a throwaway first shot, or shoot each state twice and diff the repeat, before believing a pair.
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
  closes at K1040 S4b. Stage 1's continuous caps landed with K992 in 27a183b9 (`K1000_continuous_caps.md` ## Handoff).
- **K1002** · K868's corner balls are never checked against other threads (master, b16 and c17 alike): a large r can
  enclose a neighbour (j139/2 t23: chains 46/84 sit 0.82-0.88h from q inside b16's 1.80h ring), which shows only once
  the neighbour reaches the fill between the arc and V. `K992_s2_continuous_stops.md` G2 (branch `k992-corners`).
- **K1003** · K868 label: a V apex can draw as a fan of white hairlines (c17 at the neighbour's apex by j139/2 t23;
  master at another corner). Stage 2's census never attributed it; untraced. `K992_s2_continuous_stops.md` G2.
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
  revert (`k893-g31-revert` 197c0a2c, not clean, never merge) wins 14.5 / 15.9 / 11.2 ms. Kept until K868
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
  (0810b6a), the strip block, §5.1 pins (`paint_explore.test.ts`, `paint_ring_lap.test.ts`), §5.3
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
- **K262** · K132 (530dfdc) broke two harnesses: K80's `.claude/probes/K80/lib.ts` (removed
  `codecDefaults(3)`; see `.claude/probes/K174/rt/rt_lib.ts`) and K100's `vite.fogdaily.config.ts`
  (removed `DAILY_V1`). K114 fixes its copy (`docs/design/K114_burn.md`).
- **K258** · K76 s2a's residuals: (a) in flight, KPAINT items are redeclared per frame and the
  per-slot refs shift (check `lastPaintUpload` in 2d); (b) so is growth, 0.45 s after each arrival;
  (c) the model is probe-only until 2c. `docs/design/K76.md` ("Stage 2a handoff", "Residuals").
- **K276** · K76 s2b's residuals (a)-(e): a visited END at growth 0 shows nothing at its tip; the
  census may miss a long shallow gap's far end; the mode-off-again failure is unexplained; mode-on
  costs are up slightly. `docs/design/K76.md` ("Stage 2b handoff", "Residuals").
- **K278** · K74 s2's residuals: (a) done in 83d4405 (H1 exit guard); (b) generation ~30% slower; (d)
  heart and ring designs cut no bridges; (e) H1 can shorten the optimal route; (f) ad7f030 says
  codec 108, it is 117; (c) done 40f74d1..dea013f. `docs/design/K74.md` ("Stage 2 handoff").
- **K285** · Citation details K277 left out until a record confirms them: Jakobsen's venue, Müller
  et al.'s volume and pages, Jaffe and Smith's pages, the Elias DOI, the editor of Perlin's course
  notes. `docs/design/K274_K277.md` ("Stage 1 handoff").
- **K281** · The burn race's s1 residuals (K114): (a) `drawFire` costs ~2.5 ms a frame; (b) it
  ignores K76's reveal; (c) char stroke draws over crossing gaps ((a)-(c) wait for s3's shader
  look); (d)-(h) small (c014a83: codec is 118-120). `docs/design/K114_burn.md` ("Stage 1 handoff").
- **K254** · K193 s1's phone-pass residuals (`docs/design/K193.md`, "Stage 1 handoff"): (a) desktop
  `-Dry -Looks scripts/phone_pass/looks.example.json` unrun, check `looks_report.json`; (b) docked
  landscape unverified (`-Viewport portrait`); (c) is K234.
- **K252** · K198 s2's residual: the head's 0.45 s show delay rests on five blips (longest 0.33 s): K156's next phone pass can check more. (`docs/design/K198.md`, "Stage 2 handoff").
- **K246** · K174's residuals (`docs/design/K174.md`, "Stage 1 handoff"): pace links unclamped (old
  `mhp=25` = 25x pace); K80 rt probes (`.claude/probes/K80/rt/`) lack K132's `rt_lib.ts` fix;
  `rt_chase.mjs` uses OS temp (fixed in `.claude/probes/K174/rt/`); panel labels clip `mino*` keys.
- **K242** · K191's residuals (`docs/design/K154_K169.md`, "Stage 2 handoff"): the fan program's GPU
  cost during fades and stage 1's phone hash cost are unmeasured; the tap-time fade-out and a full
  web restored on load are unit-tested only; the knot and fog A/B against stage 1 was not rerun.
- **K236** · K145's hover glow, now K248's rim: a pluck's overlay hides it (`pluckColor` has no
  across coordinate; fix: an across varying in the overlay strip and mirror compose). Other gaps
  settled in 46115c6. `docs/design/K111.md` ("Stage 3 handoff"), `docs/design/K93_K145.md`.
- **K232** · Round 2026-10-14b (K156): the default link's load (`?b.J`, d402ade vs f2fc583) is
  borderline worse: p95 33.4 -> 50.0 ms, first sleep 18.4 -> 19.6 s (2 reps). Rerun with 3 reps once
  the floor matches (K193, K195, K197); pre-worker numbers. `.claude/probes/rounds/2026-10-14-48da84d/pass/summary.md`
- **K230** · K92 did not check the badge's last fit level (bare icon) with the panel open; its phone
  checks were desktop emulation, so K156's next phone pass covers K92 (`gameplay-badge.md`). No
  phone look reaches the badge's fit levels at 411 px: use an emulated narrower viewport.
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
- **K208** · `restoreYarn` keeps its own copy of the travel-direction
  rule; it could share `travelOrder` / `moveEnds` (`src/render/fog_arc.ts`,
  K100).
- **K206** · A restored attempt stamps its fog right after the intro, while the threads re-settle,
  so with physics it differs from the live fog (IoU ~0.96). Option: stamp after the first sleep
  (`docs/design/K100.md`, Stage 1 handoff).
- **K205** · K120's leftovers (`docs/design/K120.md`): the follow camera doesn't keep the dot clear
  of the move pad (K148, K149); small maze at the phone's fit zoom; a 411 px toast can overlap the
  pad; an arrow after clicking the panel's empty area still moves; a hold could loop runs.
- **K197** · The phone's load settles later over af88b89..d402ade (K156, 2026-10-14): first sleep
  8.0 -> 19.3 s, p95 33 -> 50 ms; likely K147's settle budget (23bccd4..b1897da): attribute with the
  frames phase `-Base 23bccd4~1 -Head b1897da`. Is 19 s acceptable? Levi's call. Pre-worker numbers: remeasure on the K7 host first.
- **K190** · Unmeasured costs from K154+K169 (e03bbd2): the new hash adds 37-60% to the drifting
  backgrounds on the desktop; the phone and the fan program in a web fade are unmeasured. Measure at
  K79's K52 phone gate, vellum-drift first (`docs/design/K154_K169.md`, "Stage 1 handoff").
- **K195** · Phone pass gaps (K156 3c, `docs/design/K156.md`, "Stage 3c handoff"): noise floor is
  one 3-rep A/A pass for `-Moves 0,7,13` (rerun if orientation, phone or load changes); knot-mode
  render swings 7.5-20.5 ms in A/A; K80's indicator look never tapped. Fixed: K193, K253 (54ef27a).
- **K196** · K180's crossings options at phone scale: `ride` and `pinch` leave most taps unreadable
  in the census (dense `ride` 93.8%, fabric `pinch` 71.1%); `through` reads best
  (`docs/design/K180.md`, "Stage 1 handoff"; `.claude/probes/K180/`).
- **K123** · `.claude/probes/K10/phone_bench.mjs` drives the first visible `http://localhost:` tab
  on any port, so it can navigate one of Levi's own tabs. Use `.claude/probes/K79/phone/bench.mjs`
  (ports 5371-5374 only), or filter by port.
- **K124** · Marker gaps keep their CPU reveal gate, so they still pop
  during the reveal (pre-existing; G2 agent a7d1f998's report,
  2026-10-12 18:43; from the LEDGERS inbox).
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
- **K95** · Below about 340 px wide, the mode badge drops below the
  hamburger and covers the header of an open panel (K73; the fit levels
  are measured in `.claude/rules/gameplay-badge.md`, MODE BADGE).
- **K103** · Below 10 fps the fit camera, moves, paint clock and pluck overlay still slow down
  (fixed fit ease; `tickAnim`, paint and `tickPlucks` read Pixi's capped `deltaMS`). K96 (a24f104)
  moved only the follow camera. Since K101 (a913d58) a note's string trails its sound.
- **K106** · A dark spike inside a hook's tight bend while it rings (the
  ribbon's inner corner). Present with the base collapse off, so not
  K77's: `.claude/probes/K77/out/s2r/s2r_hookspike.png`.
- **K107** · A dark "X" at the center of big knot-mode attack-lobe blurs,
  also present with the collapse off:
  `.claude/probes/K77/out/abknot/sheet_zoomL.png`.
- **K133** · Crossed join bridges: plans built before K110 can hold two crossing join bridges (108
  plans, 20 dailies); K110's joins skip such a splice, older code doesn't. Fixing moves those plans;
  first see whether a crossing reads wrong (`.claude/probes/K110/verify_run3.txt`).
- **K136** · A gs 6 tree maze with dead ends never sleeps (140 s of sim) on 70dbc6c and ade3537
  alike, so not K110's doing; maybe the K13 attractor. Repro `?12l&gs=6&shp=tree` (K74's agent saw
  it at the new defaults too); `.claude/probes/K110/sheet/results_run1_tree_awake.json`.
- **K142** · The A/B harness's first case in a fresh browser can read nonzero (1 of 11 runs: K79
  B2b's `none_desk`, specks on thread edges); cause not found (a cold server or GPU cache?). Rerun
  before trusting it; a warm-up case is untested (`docs/design/K79.md`, "The 18/19 run").
- **K143** · Vellum's fibers read as long crossing hatching near scale
  2, the slider's max (K129; merged in bbd71dc). A look for K156's phone
  pass (sheets in `.claude/probes/K79/out/view/`).
- **K150** · Probes clash across agents (fix: claude-config `rules/lessons.md`): one Chrome profile
  (`scripts/diag_screenshot.mjs`), TEMP builds unless `-Root` (`scripts/preview.ps1 -Ref`, K156 s1,
  46019dd), tmpdir profiles (`scripts/bench_frame.mjs`, `probe_gpudraw.mjs`).
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
- **K166** · K81's render residuals (`docs/design/K81.md`, "Residuals to report"): the pluck overlay
  draws over the gold band; band edge cases (cover cap past a non-route arm, varying-width ribbons,
  non-adjacent routes, skipped wedges); setPaint runs a frame ahead of tickPaint at a tap.
- **K167** · K81's fan costs a +0.055 ms floor (+0.34 ms, about 9%, at
  15-20 moves); the early-out and the strip trim were deferred
  (`docs/design/K81.md`).
- **K168** · K81's untested ranges: more than 20 routed records, zoomed in, and a full web on the
  phone (the gate walks the cheapest route, so a full web was certified on the desktop only). K156's
  looks can cover some.
- **K172** · K156's screenshot sheets have no text labels, and its drift
  looks show drift only inside the intro window (3c checked the speed-8
  looks on the phone: they show motion).
- **K175** · K80's UI gaps (113ae4d): a queued tap has no visual; the
  choice pulses go quiet during a move; the bull glyph is a placeholder
  (K98); its off-screen indicator ignores `finishIndicator` (K84).
- **K176** · K80's entrance-tail trap: after losing a player on the
  entrance tail, the minotaur pauses at that tail's junction and catches
  them about 3 s later (`.claude/probes/K80/rt/results.md`).
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
- **K315** · `__knotPhys` calls `sys.readSlideStats()`, which resets the counters it reads; under
  K7's mirror it needs the diagnostic bridge or a worker-side count (decide in K7 s2 or s4).
  `docs/design/K7_worker.md` ("Stage 1 handoff", "For stage 2").
- **K319** · ANGLE's Vulkan backend lacks `KHR_parallel_shader_compile` (K307 s1) and phones may
  too: K307's warm-up then links blocking and stalls for the longest compile (section-rgb, ~2.8 s
  cold on D3D11). The phone's answer rides K156's next pass.
- **K342** · The snore link (K325) is verified on desktop Chrome, and Levi heard it on the phone's first
  touch (2026-11-03, K1110). Unchecked: Android Chrome (the touch delay's feel, a tab switch cutting the sound; rides K156's next phone pass),
  Safari/iOS, other desktop browsers. `gameplay-audio.md`, THE SNORING CAT LINK.
- **K348** · Key-move edges left by K329/K333/K334: the X assignment switches only past KEY_TIE, a
  hold shorter than HOLD_DELAY pauses at the first junction, a wait tap mid-move isn't queued, and
  four smaller ones. Lore: TIE CYCLES, CHORDS AND THE MOVE WAIT in `gameplay-moves.md`.
- **K349** · K120's key probe (`.claude/probes/K120/keys.mjs`, old copy `keys.pre-k329.mjs`) lags
  K329: "a held key keeps adding inputs" fails on master too; poll the queued-run check in the page.
  A first-press miss was not reproduced (`.claude/probes/K329/k120/out/keys-run2.log`).
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
  `f4c1d5f` and `8d051ae` (K7 s5, observed; the merge is unknown, K279 s2's ripple
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
- **K385** · K307 s2: links under KHR_parallel_shader_compile skip Chrome's disk cache, so warm-up links block. (b) late enable shipped in a7e199e (K307 s3); crbug (d) drafted at `.claude/probes/K307/stage3/crbug.md` for Levi to submit.


- **K386** · K307 s2's small residuals (gateOpenAt stamping fixed by the s3 poll path in a7e199e; remainder open): 131/212 ms frames after visible (parallel build);
  Pixi's Graphics program unregistered (<45 ms cold); `report()` stamps the blocking read's
  start; the pre-settle relink (8-26 ms a program); stray cache entries from one run.
- **K387** · With the flow on, its half-rate `update()` at rest costs about 20 ms a call on
  the phone (9.8 ms a frame mean, reveal on or off; K76 2d's gate run 1). CLAUDE.md's perf
  lever (2), now measured on the phone; the full fix is shader displacement.
- **K388** · K76 2d's probe residuals: gate2's in-page `arriveS` races the tap (use CDP
  arrivals; rAF stamps can hide a late Android frame); census2d says PROOF FAILED when off; k290_ab
  compares stamps, not SHAs; k111.L's shaped-slot count varied; `restoreScene` may keep HC's x = 2.
- **K391** · K5 M1's probe residuals: `k83_ab` has no knot-mode path (exits 1 at :149); diag's 12 s
  capture vs the worker's first sleep (about 9.9 s; recheck); `probe_daily` `front` fails 10/14
  (expects `#maze-hud .km-title`; its `?daily=1.aBMge` and `?1471kin.c` predate K132).
- **K392** · K5 M1's code residual: 46 lines of `src/app/probe_hooks.ts` pass 80 columns (the host seam's nested
  and element-access blind spots closed in e611bc2e).
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
  (the pad hides under the open panel since K224, 918c929). `.claude/probes/K80/stage3/rerun/K120/`.
- **K424** · Thread reveal: some junctions stay hidden while one of their arms turns visible 0.5-1
  ctrl out, so their webs are missing beside thread about to show (junctions 87 and 160 on
  `?2gozcj.MgaM`, K397 stage 1). `docs/design/K397.md`, Stage 1 handoff.
- **K425** · Probes editing `ribbon_renderer.ts`: `K290/stage3b/dump_variants.ts` + copies (K76 2d,
  K290 3a), `variant_build.ps1` (`g2/`, `K4/`), `K154_K169/edit_rr2.ps1`, `edit_rr3.ps1`. Repoint to
  `src/render/ribbon/ribbon_shader.ts` (R1's copy `.claude/probes/K5/R1/dump_variants.ts`); R2's gap files too (notes).
- **K427** · `warmup.mjs`'s unregistered-program check works only on a dev build
  (checkLinks defaults to `import.meta.env.DEV`), so a prod A/B cannot catch an
  unregistered program (K5 R1 handoff, `checks/`).
- **K428** · Thread-reveal same-state A/Bs don't repeat: captures land 17-67551 px apart (k83_ab
  with K381's explore-clock pin, `k5ab&phy=0&am=instant&fw=0&snd=none&xp=threads`); a clock is
  unpinned, so take several per build (K5 R1 `checks/`, `checks2/pairs_threads3.txt`).
- **K431** · Probes' three-decimal `viewStill` isn't pixel-still under cam=follow (frames change for 0.6-1 s more; bit-exact stop ~10 s later, K268 3a). Narrowed in 19d97f1: the bit-exact wait is ported to census3a's prepare (plus the probes.md lore line); other probes with three-decimal `viewStill` remain.


- **K432** · A pinned backdrop went black with no `webglcontextlost` in 2 of 3 unlocked k76 sheets
  (K268 3a, beside K290 3c's phone run). Rerun the sheet alone under the perf lock to attribute it;
  until then pixel-exact sheets take the lock (probes.md, K76 2b). Add a lore line.
- **K433** · Master's compositing isn't monotone in a gap's strength by one 8-bit level
  at some AA pixels (crossing 100; 84 px in census3a's KSWEEP=100 clip; K268 3a).
  census3a allows one level; which layer rounds is unattributed.
- **K439** · The G3-0 probe hooks (g3DataState, g3TableRows, g3Expected, captureScene, restoreScene; ribbon_renderer.ts
  4924-5182 at 034cec9) stay on the renderer's facade through K5 R2; R5 gives them a part, e.g. `ribbon/scene_probe.ts`
  (`docs/design/K5_R2.md`, Questions 1).
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
- **K477** · K459's free cap, narrowed by the phone pass (2026-10-16, 6d8bb4a): the free-cap look is seen on the phone (chain 48 fade pluck, lobe keyB -1, blur reaches the cap tip at t 0.06) and a reveal-off pluck draws unfretted on the phone. Still open: the base collapse under a free cap (this stub's swing never engages it; overlay-hidden diff 0 px), a strict reveal-off 0-px A/B against a pre-K459 build, the rounded tip's AA along the strip's end, and a cap a node pins staying still, as in K397
  (`docs/design/K459.md`, Handoff; phone evidence `.claude/probes/K397/stage6/out/`).

- **K484** · Sheet history (K467): a live switch to the sheet with the panel open pushes an entry
  without a gesture, which Chrome may skip on Back (the stale-on-load and fast close-then-reopen
  entries were fixed in 072b5ae5) (docs/design/K467.md Handoff)
- **K487** · The shipped probes .claude/probes/K92/undo.mjs and K198/stage2/pan.mjs predate the
  phone sheet; sheet-aware copies are in .claude/probes/K467/
- **K491** · K465's exit marker over unseen thread is pixel-verified only at 2600x1600 `&gs=4` (the
  exit is never on screen unseen at 411x753); no phone walk brings it on screen
- **K494** · K466 B (`rve=past|back`): up to 4.67 ctrl of unexplored thread shows; three covered
  ends do not move, and 1x2y3z f0 stays flagged after a 3.27 ctrl move (undiagnosed); a moved fade
  changes its length and its dots' size; the keep-out cache can go stale after a tug or a settle;
  the pad may count the gap's fade twice (docs/design/K466.md Handoff).
- **K497** · Tap preference (K479) on touch: a real touch tap and touch hover/tap parity are
  unverified on a phone (a touch press lights the glow since K330, 20b66f6e); a mid-flight tap ahead of
  the dot is empty space, and `setGlowRun` may center the glow in that stretch (cosmetic).
  docs/design/K479.md Handoff.
- **K498** · Tap preference (K479) limits: HEAD_EXCLUDE caps the bias at the dot (28.7% of
  inside-both taps still backtrack); sample-based distances break the inside-one-ribbon rule on
  0.066% of taps; no mid-move census (gameplay-camera.md TAP PREFERENCE).


- **K503** · The G3-0 probe hooks (g3DataState, g3TableRows, g3Expected, captureScene, restoreScene) still sit on the RibbonRenderer facade; R5 left them there because they read reveal/paint state R3/R4 have not homed yet - give them a part (e.g. ribbon/scene_probe.ts) once R3/R4 land.
- **K504** · K425 - a variant_build.ps1 -Subst naming ribbon_renderer.ts for joinery code (rebuildFillets, cpuJunctionField, the FILLET constants) must now name src/render/ribbon/joinery.ts; normArc likewise lives in ribbon/sampling.ts.
- **K506** · Stage M4 handoff leftovers not folded into M5 (filed, not done): FrameLoopDeps still reads physState/settleWall0/warmHoldFrom through main.ts getters instead of taking life; ProbeCtx could take life/scene/audioMap whole; stale lore prose in physics-settle.md and render-shaders.md still names main.ts for lifecycle code; the A/B harness physon step should wait for asleep, not frozen.
- **K512** · The cross-build threads round trip's 0 px expectation only holds across builds whose threads defaults match: K466 (2856678) added `rve`/`rvg` with new defaults, so a9e8040-vs-post-K466 pairings differ by 43,385 px unless the query pins the legacy look (`&rve=under&rvg=soft`, 0 px both ways, K507). Future prescribed pairings spanning 2856678 must pin both, or expect the frontier diff.
- **K508** · K5 R2's checks_r2.ps1/checks_threads.ps1 hardcode the deleted worktree agent-a695f82540244625a and cannot rerun as-is; K463's repo-relative k463_checks.ps1 supersedes them for these two checks.
- **K520** · K516's legacy timing harnesses not rerun in continuous mode: k7_latency (stage-5 batch setup), K174/K114 perf (rt_page first needs K461's fsr/fdr fix), k96_cam (desktop-Chrome launcher). Continuous-mode frame timings were measured instead (`.claude/probes/K516/results.md`); rerun the harnesses when next needed.

- **K528** · census2d's long-sequence drift against the FIRST mode-off frame (K522): 11,343 exact px (1,077 hard) over the m10 census while visitAll vs the contemporaneous mode-off-again frame is exactly 0 px; candidates are the follow-camera tail and one-level backdrop flicker (K519) - localize only if it grows (`.claude/probes/K76/stage2d/out_k522_m10e/`, `docs/design/K397.md` Stage 6 handoff).
- **K535** · First-tap residual after K366's attribution (K307 stage 3): fabric tap 1 costs one ~39 ms callback frame (27 ms with glint) and ~50 ms of first pointerup handling on desktop, knot unaffected, ripple program not involved; inferred first-pluck allocation and the fabric paint's first re-declare, not traced to a function. Traced 2026-10-18 (`.claude/probes/K307/stage2/k535_results.md`): ~25 ms first-gesture AudioContext creation in `KnotSynth.ensure()` + ~14 ms first fabric paint re-declare (rebuildFillets/computeGapSlot). Fix candidates listed there; not yet fixed.
- **K540** · Cold first-visible is ~0.7-0.9 s later on 93a231f than on its parent a7e199e in two interleaved trace_intro pairs (3.36/3.45 s vs 4.10/4.22 s, fresh profiles, phw=0), while section-rgb(-explore) link-status times are equal (43.7-48.3 vs 46.0 ms; explore 61.4 vs 51.7 ms, one run) - unattributed (not the section compile); bisect the load path before calling it a regression. Evidence `.claude/probes/K8/G3-1/` (`k536*` trace runs) and `.claude/probes/K307/runs/k536*/`. Attributed 2026-10-18: real cold-only regression, +0.39 s mean over 8 interleaved pairs (median +0.51, 7/8 positive; K536's pairs overstated it — the parent's own spread is 1.2 s); the wave-1 gate waits on the cold FXC compile of G3-1's enlarged gap-search shaders (section-rgb fs +1,117 chars), warm restart and Vulkan show no gap. Full record `.claude/probes/K8/G3-1/k540_results.md`; fixing (trimming the GAP search's GLSL cost) is the K8 lane's call.
- **K537** · census3a's 9 pre-existing fails on master (probe sanity 21-23/29 vs 80% bar; solid crossings' mode-on cuts 0-14px vs 109-142 off; slot restore; three 434px attribution restores; visitAll/mode-off-again ~11.3k px lower-half bbox; PROOF vacuous since G3-1) - identical on baseline 93a231f (22/31 with the K430 ramp vs 20/31 without; ramp-specific judgements pass). Next census owner ports census2d's K522/K523 judgements wholesale or retires census3a for census2d; may share K432's backdrop mechanism.
- **K538** · Pluck footprints (overHalf/eraseExtent) still step binary at vis 0.5; only underWindows ramp (by design in the K430 stage). Evidence `.claude/probes/K268/stage3a/out/census_ramp6/`.
- **K547** · The far-branch blend has no isolating GPU census yet: census3a's shaped slots cut 0 px at reach 2.5 in its state (PROOF vacuous since G3-1, K537), so it is proved by the farBlendCut formula tests, shader-text pins and the 22/31 no-regression census, not a pixel diff at a tight over bend with one branch shown and the other hidden. Build that state (a shaped slot whose over polyline bends back within farK, one branch across a frontier) and judge hidden (no dip) vs shown (master's blended cut, weighted). Evidence .claude/probes/K268/stage3a/out/census_far1/. Census attempt 2026-10-18 (build 2a42c8e, far_census.mjs, out/far_k547/, results_K547.md): state unbuildable in the walked state - bend-back pairs and 1-vs-0 cover splits exist (0.53-0.83 world), but medial fragments are never mid-fade inside the window (CPU joint count 0; GPU both-shown vs sminK=0 = 0 hard px on 10 candidates, incl. fl=0.3 and over-branch cinch attempts), and every bend candidate's reject control is 0 px (neighbour-covered cuts). No defect found; the blend remains formula/text-pin proved only. Missing: a strong slot whose over chain rides parallel at 0.66-0.75 (e.g. fat-thread adjacent-corridor state or a held tug).
- **K542** · PROTECT's biting-triangle GPU census is still owed: in walked fabric states at rest the waiver's range is empty (protect intervals overlap slot windows on 137/570 sides, but no on-screen fragment sits in the margin band over B - the triangles are not world-squeezed until a cinch/tug), so the protect stage proved the chain by the CPU census (706 sides, factors = vis(B) exactly, incl. 544 hidden / 22 shown) plus the shader-text unit tests, and a manufactured bite changed 0 px for the same reason. Build a squeezed state (a cinched cyclic triangle under the reveal, e.g. a physics tug on fabric) and judge hidden (on == waiver-off) vs shown (on == waiver-full) there. Evidence .claude/probes/K268/stage3a/out/protect_final/ + census_protect2/ (22/31, the ramp baseline). Census attempt 2026-10-18 (build 2a42c8e, protect_bite.mjs, out/protect_k542/, results_K542.md): shown state marginally built - cinching B onto A at off* on slot 3 side 0 (sin ~ 1) yields 6 faithful bite points (first non-zero in this state family); judged on == waiver-full (5 hard px vs 2 A/A churn, correct direction) but on vs waiver-off also only 5 px, below the decisive bar. Hidden state unbuildable here (no on-screen over-shown + A-shown + perpendicular slot with B hidden). No defect found; decisive census still owed - needs a bigger bite (held tug, iterated cinch), a zoomed bite clip and differing A/B section colors.
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
- **K574** · K320 stage 1 (`211cc24`) costs about 4 ms of phone render sync (ABBA 69.9 vs 74.1 ms,
  same sign in both pairs, inside one p10-p90 band; K572).
- **K575** · `f25defa` (K115 1b-B) does not build, a hazard for any bisect across it (K572; not
  diagnosed).
- **K576** · On the worker host (K7) two loads of one link freeze at different sim times (4.967-5.017
  s), so their rest states differ; in-thread they match, so probes pin `&phw=0` or `&phy=0`. Fix
  idea (untested): sleep only on a fixed substep grid. `docs/design/K550_kill.md` (Handoff).
- **K583** · K115 stage 9's glyphs: the i's dot draws as a rotated square; an untraced notch under
  the a's J spur and at the i's fork (`.claude/probes/K115/stage9/shots4/ai_land_xh2.png`); a crotch
  hairline at xh 3 (`LINT.forkMaxLU`).
- **K588** · The confetti palette's warm white (0xfff4e0) reads as a foil flash in still frames;
  dropping or tinting it would make the flashes stand out (K337 handoff).
- **K594** · Phone kit flakes in K573's run: adb died 3x (unexplained), a foreground kit start hangs
  the tool, `cleanup.mjs` timed out after a watchdog trip, two reverse tunnels stayed on the phone.
  `.claude/probes/K573/logs/`; full text `docs/ledger_notes.md`.
- **K596** · Fabric `?b` (today's defaults) can stay awake forever after a drag: a six-substep limit
  cycle at max move 0.0197 per substep, above QUIET_EPS 0.015; 1 of 23 fabric seeds,
  history-dependent (5 of 6 grab points re-sleep). Fix: K595. `.claude/probes/K372/results.md`.
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
  `deadEnds`, removed in 2605bf6, so re-runs build mazes with no dead ends (K637: 4.16 catches
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
- **K648** · K336 leftover: on the phone the closest cannon arc tops out 0.081 w from its edge
  (median 0.26 w); the streamers' sag holds across frame rates since 20453e7c.
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
- **K679** · K653 fix (eb7e471) has no still pair, pixel A/B or test: nothing in test/ reaches
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
- **K711** · K137-b edges (K137_s3a.md Residuals b, d-f): runBurnAt may draw a burnt broken run as
  burning; refire is O(V^2) per breaking move; __knotChaseTap ignores broken runs; broken-run counts
  need main.ts to report every accepted run (safeArms and fireTrapped count broken arms gone since
  c7e6329a)
- **K712** · Lives (K137 s3a): hearts are in neither Undo nor saved attempts, and default 3 when
  switched on is tooltip advice only (a toggle or a 0-to-3 snap would make it real; K137_s3a.md
  Residuals g). First half checked bfa3a639: no Undo or saved attempt can hold hearts today.
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
- **K732** · K720 residuals, iOS only: a context created outside a tap waits for the next tap, and a
  suspended context keeps the song on the wall clock and skips the 1.2 s lead-in, both unverified
  on iOS (docs/design/K720.md Handoff). The snore's offline decode landed with K343 (2b539fc8); the
  snore and fabric read silent under snd=none in a desktop browser (7274aae4's message).
- **K734** · K643: a hairline seam inside the i fork junction at xh 3, in the build at adc6535b,
  cause unknown (docs/design/K643.md Handoff)
- **K737** · K137 s2 (K137_s2.md Handoff): with fragile runs or collapse the spool can leave no
  legal move at its limit (Undo or restart gets out); a lit hint hides the minotaur warning up to 2
  s; the path-display row does nothing under the spool; hints and the compass ignore the fire; a
  catch restart keeps hints used and chalk; the aids are off in walker modes; saved attempts keep no
  chalk or hints used (store version); the compass shares the hint mint
- **K740** · Toast placement gaps (K698 Handoff): the panel and the phone settings sheet are not
  avoided; the aids group is found by its class, not the indicators avoid list; No hints left is
  unreachable by tap (Hint disables at 0). A showing toast re-places when a control appears or
  leaves since 742078db.
  - K749: after a walked pickup on the real phone, all three sword toasts clear the pad
- **K744** · K138 s1 page gaps: blips of other colors at some junctions under the rule colors (cause
  unverified, maybe the junction webs); not page-checked: a backtrack undoing a slide, ice with
  alternate, strict par lost under a rule, the share (`docs/design/K138_s1.md` Handoff)
  - Real phone (K749): the patches show at real size at nearly every junction in both rules (dark
    magenta among pink, dark teal among olive); a backtrack undoing a 3-run slide passed. Next:
    trace each patch to its run, or hide the web meshes. `.claude/probes/K749/out/rules/`
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
- **K897** · Load on the Pixel 11 at head: -7.4 fps (default) and -11.8 (slow) against `d96de6e` in
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
  since its K900 regeneration (`7c972033`); not run at `972228b5`, so it may predate K900.
  `.claude/probes/K868/oracle/checks_synthetic.md`.
- **K913** · Cursive v4: a's fused junction at the font's 47.5 u (frame in the kink, 30.2 vs 52.6
  deg); the a body includes the up pass; d's after-o retrace frame at 36.3 deg; v3's rerun checker
  runs v4's commands; `--guides centreline` unrun. `.claude/probes/K863/trace/NOTES.md` ## v4.
- **K920** · K620's `df8b80c3` costs the phone +5.2 ms on max-fabric (about 2 ms of K905's gap;
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
- **K1032** · K992's continuity tests are slow under full-suite load: the short (D) and (E) 9.1 s and 6.6 s, K1000's (D)
  22.6 s, against 60 s timeouts, so CI has little margin. The short (D) misses F11's jump at u 0.5175-0.52; only the full
  sweep (`SWEEP=1`) and the path test cover it. `K992_s5_branch.md` F16-F17.
- **K1037** · K992's census and test tools (stage 6's leftovers): label_pops calls j56/1's def_flow@w1 pops "none" (nearest
  event 473-719 px away); `oracle_m25dbg.ts` keys on `__dbg25`, so `march27.ts` can't print master's nodes; SWEEP=1 vitest
  ends in "Timeout calling onTaskUpdate"; the census takes 2x its estimate (c27z 34 min). `K992_s6_tie.md` F20, ## Handoff.
- **K1035** · Cursive J3b's leftovers (v6.4): oi switches between two minima as o's top moves (13.71 u, as on does,
  K1014); the corners into i j p s u w y sat at the 30° low end, os skipped the font's dip, b f h k l at the 100 bound,
  oe crossed once (K948). NOTES `## K1009b` N4-N7. v6.6 took b0's joins (oe fixed); the rest is K1090.
- **K1036** · Cursive J3b's census and checks: port-cusp entries at s = 0 (hi, er, es) count as 180° seams; the
  own-ends reference is cut at each build's own attach, so it ranks og's b0 (4.35 u) above v6.4 (7.12 u), which
  looks nearer; the i and u continuity sweeps move nothing (sweep the stem-top node). NOTES `## K1009b` N1, N6, N7.
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
- **K1086** · K412 probe: each warm profile's first reload starts main ~3.4 s (levi.dev) / ~3.7 s (pages.dev) late vs
  57-116 ms later; navigation timing (Muse 5D) puts it after responseEnd (~85 ms, unload instant), in the parser's wait
  for domInteractive. Next: a performance trace of that reload (`.claude/probes/K412/`; full text `docs/ledger_notes.md`).
- **K1090** · Cursive v6.6 (J3c) o joins: the oi oj os ou ow oy corners at the +40° bound, op at the side-margin
  tolerance (-0.05); ob of oh ok ol attach at [0, 100]'s end, oe at [0, 90]'s, oc od at their lower bounds (as b0); os, oh,
  ok farthest from the font (34.8-36.2 u); the words sheet lacks b0. `K1009_cursive_j3c.md` ## Handoff.
- **K1093** · Junction form B, c1's merge blend leftovers: a partial blend at |Δs| in (σ/2, σ); the fold's
  far-piece weight at |Δs| in (σ, 2σ) is S1b's; a steep u ramp at shallow barriers; S4a's foot strips need d_A
  and the barrier m, neither local (`K1040_s1e_bends.md` F1, Residuals).
- **K1095** · K775/K738 residual (1a6823ea): at 320x640, stats on, sword slain / all-grown, the HUD value
  column extends 17.8 px past the box [10,10,246,286.2] (badge clear, gap 22). Layout call for Levi. Probe
  .claude/probes/K775 (hud775.mjs, out/before|after). In the shots (`.claude/probes/K775/shots/`) the last
  glyph of each value straddles the painted border (~6 px past it); a fix: let the sword row's value wrap
  like the hidden row, or shrink the column gap.
- **K1103** · Junction form B after S1f: F2's e* is steep as kappa -> 0; member() reaches back to |Lcut| +
  lambda; group 21's hook stroke and the free end at chain 22 s 27.608; j55's arc 5 px inside its label; 597's
  discrete corner existence vs the labels (`K1040_s1f_reach.md` F2, F3, F6).
- **K1105** · Junction S3: form B merges a piece only into kept candidates, while the label scan drops a
  fragment against any nearer candidate; the two could disagree, not seen in the census (`K1040_s3_label.md`).
- **K1116** · Cursive v6.8 (J3e): fm, fn, fv and fz sit farther from the font than v6.7's presets (6.41,
  10.29, 6.59, 11.46 u against 3.23, 3.17, 3.15, 10.09), their attaches and fe's on a bound; Levi judged the
  new f better (2026-11-02: "The new f is better"), so these are reported, not fixed per pair. f's exit at its
  2.00 u bound; fr and fs need a 2 u lower bound on r's and s's entries; fj's and fw's side_min slightly
  negative; bq, vq and wq hook back (v6.6's, Levi's choice) (`K990_cursive_j3e.md` ## Handoff).
- **K1117** · Junctions S1g (form B's gates): the d-edge's span step at d = 0; the jj30 probe's 0.51 step; q4
  AA misses up to 0.84; S1f's r step of 0.0065; q5holes exits 1 in a worktree and misclassifies an eye whose
  rim is a chain's own surface; the rb05 tag clash (`K1040_s1g_gates.md` ## Handoff).
- **K1120** · Cursive v6.9 joins out of b, v and w (J3f): into b, f, h, k and l a straight climb to the 100 u
  attach limit, 53-57 u from the font (next: an entry rule after high exits); br, vr and wr meet r's cusp in a
  V; be and we show small repeated spikes; e after b/v/w has its own rule, landing up to 60 u into e (keep it,
  or fold it into K948's e-after-o rule, which moves oe) (`K1113_cursive_j3f.md` ## Handoff).
- **K1121** · Cursive v6.9 gates (J3f): locality fails, 157 of 1448 untouched pieces moved by up to 0.33 u
  (b's, v's and w's whole strokes were refitted; next: refit only the exit's stretch); seven rows newly fail
  rough (bt, vt, wt, ba, wa, and the ba and wa in bad and wave); 41 of the 78 joins sit at a bound; b/v/w font
  distance about 24 u (was about 3) (`K1113_cursive_j3f.md` ## Handoff).
- **K1122** · Junction label pass (S3b): the scan's remaining cost (desktop muse_hash 2.08 of 3.87 ms; the
  Pixel about half of muse_hash's 41 ms) and the span walk, never timed alone; `buildLabelB`'s prep takes
  9-128 ms on the desktop and 11-104 ms on the Pixel (S5's `nbWindows`) (`K1040_s3b_label.md` ## Handoff).
- **K1123** · `s3.mjs` and `phone_time.mjs` (`.claude/probes/K1040/s3/`) append to their summary files on
  every run, so the tracked `phone_time_summary.md` grows with each rerun (S3b's Handoff).
- **K1128** · Sprint: the s3a fragile page check is weak on the hunter, and the fire side is unit-tested only
  (split from K748). The real-phone pass landed in K749 (2026-10-21, build cdd3ed53).
- **K1133** · Burn re-declare: fillet rebuilds on front-crossing frames, retraced with the flow on
  (K1137 Run B, K1077 stand): realtime 71/119 vs turn 59/119 (burn cross-check 0.56 vs 0.50 a frame); the
  12 without an update split uwRev 8, joint-key 4; a fix needs incremental fillets (joinery), not the declare.
- **K1144** · Cursive v7.0's leftovers (K1119's Handoff in `docs/design/K1119_cursive_j3g.md`): br, vr and wr dip
  into r as a tighter V (br newly fails roughness); five of six a/q joins fail it; q's low point is 0.4 u above
  the band; be, ve and we sit 40.8-42.0 u from the font (Levi: the v7.0 or the e60 column).
- **K1147** · K1142's guard protects a person, not another agent's pass: the `scripts/` phone runners never
  take the phone lock (`.claude/probes/agents/phone_lock_take.ps1`), and the watchdog arms only after the `am
  start`, a few unwatched seconds (arm it first; `docs/design/K1142_phone_guard.md`, Handoff).
- **K1151** · Invalidating the S3 label pass's sampled D32F depth after its draws adds 31-34 ms a pass on the
  Pixel (s3d2), where K923's invalidated D24 renderbuffer cost nothing; the mechanism is untested
  (`docs/design/K1040_s3d_tent.md`, Handoff). S3e tries the renderbuffer (K1097).
- **K1165** · S1i leftovers (`docs/design/K1114_s1i_rounding.md` Handoff): sites 03/04 sit 2 px off S1f (another
  corner's root gate); `dEdgeK` unused once `dEdgeTip` > 0; S1g's doc quotes gate699 as 0.125/0.0006 (probe:
  0.1270/0.0007); q5 blobs 448 vs S1f's 451 (no g1 baseline); `s1i_angles.ts` misaligns its "today r" column.
- **K1167** · Pre-rewrite knotmaze SHAs quoted in other repos (claude-config's ledgers, notes and memory;
  levi.dev; hex-grid) name commits GitHub no longer serves. `.claude/probes/K1164/commit-map` (a copy in
  ~/Backups) translates them; `remap.mjs` beside it rewrote this repo's (K1164).
- **K1174** · `run_locked.ps1` (the K1040 s3 kit) releases the perf lock in its `finally` but leaves node
  running, so a pipeline stopped early (`Select-Object -First n`) times unlocked; S3f did it twice, 2026-11-03
  20:34-20:36. Kill the child in the `finally` (`docs/design/K1040_s3f_draw.md`, Handoff, Commands).
- **K1177** · K907's `scripts/phone_pass/k539_g31.mjs` and `pixdiff_g31.mjs` are only parse-checked, never run
  on the phone: round 2026-10-30's brief (b581f620) left them out. The next K156 round runs each once.
- **K1181** · The laptop's knotmaze checkout still has the pre-rewrite history (K1164): before its next use
  there, fetch, then reset to origin/master (after saving any local work); never pull, which would merge the
  old history back (Levi 11-04 dropped K1166).
- **K1182** · The fill rim meets the flank tips with a tangent break (G0 only:
  `src/render/ribbon/rim_curve.ts`, a quadratic); a biarc would make it G1 (K1179 review sections 2-3).
- **K1183** · No `.claude/rules/` file covers `src/render/field/` (form B and the field scene's lore lives only
  in design docs): write `render-field.md` with narrow `paths:` and add its `docs/lore_index.md` row (K1179
  review).

## Approved, to schedule (2026-10-11)

- **K22** · Dynamic resolution scaler (2x up to 3x when frame time
  allows; down when struggling). Part of K6, refined after G3.
- **K23** · GPU particles (G2.4), GPU fog-of-war accumulation, the yarn as
  a gap-masked ribbon (G3-5).
- **K322** · Art, sound and music by people (Levi, 2026-10-14 21:47): commission or license better
  icon art, sound effects and music before launch; credit each artist on the credits page (K321)
  with their terms (`notices/credits.ts`).
- **K805** · Dot-eater mode (Levi 2026-10-21; after the paper look K797-K800, once there is budget):
  eat dots for points; wandering enemies (not ghosts: a shape of our own) send you to the start (the
  hit recorded, dots stay eaten, the trail erased); big dots flip who eats whom (you speed up,
  enemies score); enemies enter at a third marker (its own icon and placement param, its last run
  closed to you); turns or real time. Builds on K804 dots, K80, K114, K83, K138 one-way runs
  (`docs/design/levi_notes_2026-10-21.md`)
- **K144** · Accounts and shared stats, a stretch goal (Levi 10-13; `docs/design/K144_accounts.md`, 61a24a82).
  Levi answered Q1-Q5 on 11-03 and 11-04 (recorded in the doc's Questions section, 12048678): Workers + D1,
  Google sign-in first, results synced first. Stage 1 is K1168.

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
  parked until near launch (rest done in d2adf8a: `LICENSE`, `package.json`): `gh repo edit
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
- **K360** · Ledger diet pass 2 (K353's handoff): CC67 (fc34d0e) cut the 165 long open items. Left:
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
- **K1106** · A build check that every `dist/assets/` file name carries a content hash: `public/_headers`
  caches `/assets/*` immutable for a year (K1084, a4cc20ee), so a file put in `public/assets/` would stay stale
  in browsers.
- **K1136** · Phone A/A floor: fabric@0 reads loose (fps ±8.3, frames over 25 ms ±33) from one outlier rep; a
  later A/A may tighten it (`docs/design/K156.md`, Round 2026-11-03 handoff, Left over 2).
- **K1145** · Cursive x5 (`R_DX=22 R_A1=-15 R_L1=10`): a steeper b, v and w exit (about -22 deg), if Levi
  wants v7.0's exits further down (K1119's Handoff).
- **K1157** · K1040 label pass, a lever for S5's live integration: x,y from K8's SAMP, at most a quarter of the
  moving upload (0.3 of the Pixel's 1.3 ms; needs both tent shaders rewritten and a vertex-to-sample map). S3f2
  dropped one texture: the bytes cost, not the calls (`docs/design/K1040_s3f2_levers.md`).
- **K1185** · V-pinned rounds, if K1179's outline is revisited: S1e's failure is the probe point on a curved
  arm, off the medial axis, so a successor needs a new rule (a medial correction to q_k, or feet by centreline
  arc), costed only in a rebuild (`docs/design/K1179_s1e.md`, What comes next).

## Done

- **K1179** · Thread geometry (Levi 11-04: rethink how thread bodies, junction rounds and gaps are built, maybe as a skin on the thread centres): reviewed (`docs/design/K1179_geometry_review.md`), no simulated skin; its one-rule outline failed the spike five times (S1-S1e, `docs/design/K1179_s1e.md`), so no rebuild. Done in b6174b00 (2026-11-04).
- **K1178** · Muse batch 16 (runs A-L, `docs/design/K1178_muse_batch16.md`), each through the chain's gate; the open leftovers stay on their own items (K484, K648, K1179). Done in 20453e7c (2026-11-04).
- **K178** · K79, K99 and K104 private-cache wrappers load the config with loadConfigFromFile, as K1139's tracked copy does. Done in 1a02e2b8 (2026-11-04).
- **K999** · probes.md's paths narrowed to the probe scripts; K863's trace and data reads no longer carry it. Done in 2b302a3f (2026-11-04).
- **K1175** · key hints recompute while the flow is on, so a disc never names a stale key on a bisector run. Done in 2a856876 (2026-11-04).
- **K1163** · Corner rounding's softer root gate (the root band scaled by the tip factor, Muse batch 16 Run H): the ten near-straight cusp corners now match S1f; row 15's corner goes on in K1180. Done in ab7cad9a (2026-11-04).
- **K1166** · After the history rewrite (K1164), two things only you can do: send GitHub Support the drafted request so closed PR #1 stops serving the old commits, and reset the laptop's knotmaze copy before its next use. Dropped: Levi 11-04: “let's ignore this”: the Support request is not sent; the laptop reset is Residual K1181 now (2026-11-04).
- **K701** · Section shader lengths rose again, limits now 47,750 / 64,150 characters (K324 s2: +85 each; `test/render/k320_slim.test.ts`). Dropped: a record, not open work: k320_slim.test.ts pins the section shader limits (57,430 and 73,850 today) (2026-11-04).
- **K511** · K334/K348 note (2026-10-15): K334's pointer queueing is superseded by Levi's correction in 2bcf771; K348's mid-move wait-tap leftover is now intentional for pointers. Dropped: a note, not open work: K334's queueing was superseded by 2bcf771 and K348's leftover is intentional (2026-11-04).
- **K69** · String mode (`pv=string`) on pre-G2.3 builds drew a 1-px diagonal sliver from the start to the exit marker (`?b.c&pv=string`, 6 moves); G2.3 doesn't show it, never attributed (G2 doc section 7, Follow-ups). Dropped: moot: G2.3 and later never showed the sliver, and since K83 (21a525e) that Graphics draws only the win ring (2026-11-04).
- **K390** · probes.md's fog A/B recipe passes &phw=0 (same-build controls about 700 px instead of 4054-7979); the start marker's two states stay unexplained, and the recipe says so. Done in 08e2165e (2026-11-04).
- **K435** · probes.md's FX-off burn pin waits two frames and says container.visible = false does not stop the burn FX; THE BURN's under-both-looks line was already corrected by K599. Done in 08e2165e (2026-11-04).
- **K1173** · A Tug threads checkbox in Touch & feel (per browser, on by default, never in a link): off, a drag pans wherever it starts and a tap still plucks (Muse run 15F). Done in d41a02c9 (2026-11-04).
- **K1171** · One Rules dropdown, Fragile runs: off, crack, snap, collapse, collapse (free); one link param (codec v10, `&cl=` gone); the Par rows disabled under the collapse options (Muse run 15E; shots checked). Done in 9a655597 (2026-11-04).
- **K1169** · Muse batch 15 (`docs/design/K1169_muse_batch15.md`): runs A (K1139 S2), B (K778) and C (K1162) done, each reviewed against its report and CI. Done in 95f8f0b0 (2026-11-04).
- **K1162** · Doc and item-text errata from the ask-card pass, all 15 checked: Muse run 15C fixed the docs (b2ca45af; claims 4, 11 and half of 8 were wrong), Claude applied its seven item-text lines (K440, K626, K1128, K887, K656, K693 and the K207 note). Done in b2ca45af (2026-11-04).
- **K1132** · key hints (the d-pad button that takes each run, K1170) sit out past the head marker; the reach placement and __knotKeyHintPlace are gone. Done in 415d131f (2026-11-03).
- **K1158** · K1040's label pass keeps GL state from Pixi's tracking, without draw()'s queries (S3f step 1). Done in 1aac725b (2026-11-03).
- **K778** · an Undo button in the HUD's rules row; ruleUndos 0-5 (default 1) sets how many a run gets; the Stranded banner's Undo unchanged. Done in 82537593 (2026-11-03).
- **K1170** · The key hints show the d-pad button that takes each run (Levi 2026-11-03: the arrows point along the runs, mostly diagonals no pad button presses; `hintMap` picks the smallest err). Done in 81081ab9 (2026-11-03).
- **K1164** · Master's history rewritten without the device addresses (force-pushed 2026-11-03; 2,456 commits from 7645fe67 on) and 3,823 quoted SHAs remapped; the old history is mirrored in ~/Backups, the map is `.claude/probes/K1164/commit-map`; leftovers K1166, K1167. Done in 82aa5072 (2026-11-03).
- **K628** · Confetti (Levi 2026-11-03): the finish spray throws no streamers (as built); GPU confetti (K579) goes after K318 stage 1, where it is queued. Done in this commit (2026-11-03).
- **K1138** · The backdrop speed slider tops out at 16x (Levi's call, 2026-11-03). Done in 56e6262f (2026-11-03).
- **K1114** · S1i: corner rounding back at the junction roots (rootBand 0.5). Done in 8b436272 (2026-11-03).
- **K1161** · Muse batch 14: runs B-F landed K1160+K1159, K710, K711 (c), K732's desktop half and K740's first gap. Done in e11beadd (2026-11-03).
- **K710** · a real-time catch (and an extra's, and the sword's touch) cannot land through a broken run; contact counts tails but not broken runs. Done in 4b347cad (2026-11-03).
- **K1159** · adb lookup folded into phone_ready.mjs (findAdb picker); phone_pass.ps1 delegates with --find-adb; phone.ps1's own lookup left beside them. Done in 0904b7ce (2026-11-03).
- **K1160** · scripts/phone_pass.ps1 finds the phone among online android peers; -TailscaleHost is the override, default empty. Done in 0904b7ce (2026-11-03).
- **K1156** · Muse batch 13: B K1152+K1148 (1bb70ac1), C K1155 (2e188c47), D K1154 (746284a4), E K351 (0a16e218), F K392's seam half (e611bc2e), G K685 (630da3c0); all reviewed. Done in b3ca3046 (2026-11-03).
- **K685** · a respawn into stranded or out of strokes shows its banner without a tap. Done in 630da3c0 (2026-11-03).
- **K351** · the panel inventory's Read by follows url_state's *Of builders. Done in 0a16e218 (2026-11-03).
- **K1154** · the physics-off load's wall cap and reported time count visible time (both hosts). Done in 746284a4 (2026-11-03).
- **K1155** · scripts/phone.ps1 finds the phone among online android peers; -TailscaleHost is the override, default empty. Done in 2e188c47 (2026-11-03).
- **K1148** · --ready guards bench_frame --cdp, k923 sync --target phone and close_tabs; the adb fold split out. Done in 1bb70ac1 (2026-11-03).
- **K1152** · phone_ready.mjs states its check in its own words (no deleted file, no rebased hash). Done in 1bb70ac1 (2026-11-03).
- **K1153** · Muse batch 12: K202's midnight rollover (20ee92c0); K201's Played chip (9cf52379); K125's whole bars (26455925); K165 (a)'s HALTED stamp (0efcead7, K1154 split off); K170's opt-in wake (620ddf93); K308's exact fifth contour (cd1f0087). Done in 57b60232 (2026-11-03).
- **K308** · the contours' fifth line counts exactly (integer-corrected). Done in cd1f0087 (2026-11-03).
- **K170** · scripts/phone.ps1 wakes the phone only under -Wake. Done in 620ddf93 (2026-11-03).
- **K165** · a halted load keeps its HALTED stamp; the load wall clock split out. Done in 0efcead7 (2026-11-03).
- **K125** · Scarborough Fair loops on whole bars (closing rest 3). Done in 26455925 (2026-11-03).
- **K201** · the Played chip counts the tile's days; a practice row shows its count. Done in 9cf52379 (2026-11-03).
- **K202** · an unstarted floating daily rolls to the new day at midnight. Done in 20ee92c0 (2026-11-03).
- **K1146** · Muse batch 11: K252 (a), the pan range's ease by time (0bbdc36b); K144's accounts doc (61a24a82); K804's beat ring (4f6ff982); K207's fog dedupe, partial (16b1c56f); K688's healing-cuts doc (182cfc8d). Done in 55df4231 (2026-11-03).
- **K804** · beat indicator dropdown: pulse and ring at the dot; dots split out. Done in 4f6ff982 (2026-11-03).
- **K234** · `scripts/phone_pass.ps1`'s `-Phase check` and `-WaitReady` called a phone in use ready: K1142's shared check (`scripts/phone_pass/phone_ready.mjs`) now needs the launcher in front and 120 s without a touch. Done in d773eb10 (2026-11-03).
- **K1142** · Phone kit guard: one shared read-only readiness check (`scripts/phone_pass/phone_ready.mjs`: screen on, unlocked, the launcher in front, 120 s without a touch) that every tracked phone runner calls before opening anything. Done in d773eb10 (2026-11-03).
- **K1141** · Muse batch 10: A, K1138's backdrop tuning (6aa02f19; the slider's top waits on Levi); B, batch 11's draft, reviewed into K1146 with its Run B dropped. Done in 39d47cce (2026-11-03).
- **K1137** · Muse batch 9: A, K1132's key-hint pictures; B, K1083 closed and K1133 kept open on the flow-on retrace; C, K1135's Reset test; D, batch 10's draft (K1141). Done in ff87d810 (2026-11-03).
- **K1129** · With Reduced motion on and the camera following the player, the view still glides after every move. Dropped: Levi 2026-11-03: "camera glide with reduced motion is fine", so the view keeps gliding (2026-11-03).
- **K1118** · Levi 2026-11-03: Motion follows across tabs without a reload. Done in 758dfe1e (2026-11-03).
- **K1111** · Levi 2026-11-03: the finer-step sliders feel right ("Pulse reach is good"; "Settle params are probably good for now"). Done in 9e617d7a (2026-11-03).
- **K1135** · behavior test on a real Pane, plus a warn-once. Done in d18d0be3 (2026-11-03).
- **K1083** · retraced with the flow on: no realtime extra. Done in 0451032c (2026-11-03).
- **K1110** · Levi heard the snore on the phone's first touch (2026-11-03: 'The snore sound is good'). Done in 2b539fc8 (2026-11-03).
- **K1134** · Gap slots stand pat on the K1083 burn stands (cause none on 120/120 frames; 0 updates and 0 gap solves a frame, realtime and turn, on master and pre-K1082 alike), so K1077 cluster 3 does not reproduce there; solves still run per awake update (drag 287/frame) (split from K1083). Dropped: its stands were `fw=0`, which removes K1077's flow trigger; folded into K1083's retrace (the drag stand's re-solve per awake update is expected: the geometry moves) (2026-11-03).
- **K1131** · Muse batch 8: K332, K657, K1081 and K1115 done, K1082's declare half; K1083 and K1133 were measured with `fw=0`, not on K1077's flow-on stand (the brief's error), so both retrace. Done in 0ad79ddc (2026-11-03).
- **K1115** · one general Reset fix in row/doReset. Done in 0ad79ddc (2026-11-03).
- **K1082** · incremental burn declare; fillets split out. Done in e0ec49f3 (2026-11-03).
- **K1081** · one panel rect read a frame (camera cache). Done in ac42b67a (2026-11-03).
- **K657** · win banner shows snapped and par rows. Done in 85decf22 (2026-11-03).
- **K332** · key hints after the first direction press. Done in 698a2924 (2026-11-03).
- **K1108** · Muse batch 7: runs A-F passed their gates (2026-11-03 00:29 to 03:06) and closed K368, K1100, K748, K1109, K1099, K1101, K426, K437; filed K1126, K1127, K1129 (Levi) and K1128. Done in 13906317 (2026-11-03).
- **K437** · rules name frame_loop.ts; half rate added. Done in 13906317 (2026-11-03).
- **K426** · index rows complete; scripts/lore_index_check.mjs. Done in 13906317 (2026-11-03).
- **K1101** · 119 pairs merged under one heading. Done in e5996c10 (2026-11-03).
- **K1099** · reset snaps; jump threshold checked; follow spring to Levi. Done in 977ad2f8 (2026-11-03).
- **K1109** · probed: the taps jump. Done in 977ad2f8 (2026-11-03).
- **K748** · no focus ring after a pointer click; phone pass and fragile check split out. Done in 70a1a43b (2026-11-03).
- **K1100** · non-breaking joins in the hidden row. Done in 22b5ebab (2026-11-03).
- **K368** · High contrast wears the ring. Done in 89836d3b (2026-11-03).
- **K1107** · Muse batch 6: runs A-F passed their gates (2026-11-02 20:20 to 2026-11-03 00:28) and closed all 14 items (K343, K130, K495, K128, K212, K490, K787, K584, K112, K403, K263, K600, K609, K462); Levi checks K1110, K1111 and K1118. Done in b4d15403 (2026-11-03).
- **K895** · phone_pass kit (K156 round 2026-11-02): (a) the median averages at even n and (d) a phase refuses once its pass has `state/watchdog.trip` (452cf61b, test `test/phone_pass/k895.test.ts`); (c) servers and watchdog start detached through WMI (f8c7669e). (b), the A/A floor, continues as K1124. Done in f8c7669e (2026-11-03).
- **K1124** · K895 (b): installer refuses finish samples (fa39d0bd, test test/phone_pass/install_floor.test.ts); portrait A/A retaken at -Moves 0,7,11 and installed as scripts/phone_pass/noise.json (d4c1dc41). Done in d4c1dc41 (2026-11-03).
- **K1125** · K309 control from failing (k, n) pairs (seed 4 chain 7 n 82: pre-fix 359-389 px, master 0 px) and rimSeam whole-frame diff explained as a first-capture blank frame (K156 round 2026-11-03). Done in e7ebb1c4 (2026-11-03).
- **K462** · K323 table and undo list updated to shipped burn rows (2026-11). Done in 7760bf01 (2026-11-03).
- **K609** · pluck docs point at chain 2 key 427, rechecked live on 5585. Done in b4d15403 (2026-11-03).
- **K600** · gameplay-links.md gains gm key and K534 entry. Done in 6ef60f05 (2026-11-03).
- **K263** · lore and K80 brief no longer cite undoAllowed (removed 2605bf6b/K534). Done in 5316c39a (2026-11-03).
- **K403** · abbott comment stage 4, codec citation by name, K74 stage 3 sections 4.2-4.3 and handoff files. Done in cb9e6fdb (2026-11-03).
- **K1033** · form B names a surface by its covering pieces only (`labelBy: "cover"`, S3b F1-F2): the census reads 0 DEFECT and 0 fade on all 12 scenes (was 137 and 216). Done in 239fba3f (2026-11-02).
- **K1113** · Cursive b, v and w (J3f, v6.9): ends rounded out (about -8°; the font's -12 to -16°), exit ports, every join out of them solved, their presets deleted; out of b/v/w hooks 43→0, spikes 49→3, rough 47→27. Levi's look: K1119. Done in 4d0fc282 (2026-11-02).
- **K112** · cross-tab sync only; the camera half is K1109. Done in 758dfe1e (2026-11-02).
- **K584** · already guarded: SCENE_FIELDS Record<keyof SceneParams> fails tsc TS2741 on optional field; name-build tests round-trip. Done in be6e15a3 (2026-11-02).
- **K787** · whole-game beat test lands catches (respawn+restAt+refuse), asserts every turn result, sees K774 (b). Done in be6e15a3 (2026-11-02).
- **K490** · explained, not reproduced: no 404 on master dev or preview build across the brief's links, a K466-style xp=threads load or a panel open; every file index.html/manifest names serves 200, and K466's log never recorded the URL. Done in ae6316fe (2026-11-02).
- **K212** · pluck strip split into one geometry per program (blur vs still); all eight attribute warnings (aGap, aGapId, aUV, aEnv, aCol, aClipA/B/F) gone, pictures pixel-identical. Done in ae6316fe (2026-11-02).
- **K128** · marker aUV slot dropped from the geometry and the dead declaration removed; PixiJS aUV warning gone (probe .claude/probes/K212/). Done in ae6316fe (2026-11-02).
- **K1104** · Cursive v6.7 (J3d): the joins into a and q attach on their lower bounds; the after-high stretch's [0, 90] was picked by a sweep with 85 tying; b's, v's and w's other high exits are still presets (`K1027_cursive_j3d.md` ## Handoff). Dropped: folded into K1113: the six are v6.6's presets again (K1102), so their attach bounds and the sweep's stretch are moot, and b's, v's and w's other high exits are K1113's scope (2026-11-02).
- **K1102** · Cursive a/q joins: Levi chose v6.6's ("aq: definitely 6.6", 2026-11-02); J3e restored them exactly for ba, va, wa, bq, vq and wq. Done in 636bd685 (2026-11-02).
- **K495** · End glow row shows only under thread reveal with the halo or beacon look. Done in 9e617d7a (2026-11-02).
- **K130** · Reset to defaults writes the exact default for backgroundIntensity, pulseReach, settleBudget and loadSettle (step removed, edits keep 2 decimals / whole numbers). Done in 9e617d7a (2026-11-02).
- **K343** · Snore decoded on OfflineAudioContext before the gate (KnotSynth.decodeOffline, SnoreSfx falls back to context decode); first touch plays it. Probe .claude/probes/K343/snore.mjs: decodes 1 before input, one tap plays 1, never stacked. Done in 2b539fc8 (2026-11-02).
- **K1091** · Muse batch 5, runs 5A-5E (1a6823ea..a1a7e12a), reviewed; Claude fixed K442's fire-lead line (91b54050); K1086, K1095 and K1099-K1101 stay open. Done in a1a7e12a (2026-11-02).
- **K1039** · K868's gate-tool leftovers: S3's verdict runner requests no favicon (a data: URL) and drops any favicon request from its error count; same24, same28 and raster26 are K868's, superseded by K1040. Done in 15d0ea13 (2026-11-02).
- **K1027** · Cursive: the six high joins of b, v and w into a and q solved in v6.7 (J3d), replacing the presets; the look call is K1102. Done in 4e88a54f (2026-11-02).
- **K1092** · Form B's Lcut reach: S1f's quadratic reach (the default) is continuous by construction, ending the phantom reach at near-tangent passes (`K1040_s1f_reach.md` F1). Done in b4b036e7 (2026-11-02).
- **K1094** · Ledger hygiene from the K1091 planner: K443, K404, K801 dropped, K497 reworded, the Next narrative moved to docs/history.md; K604 stays (still true: `mf` is outside the codec until K326 drops knot mode) and K1081-K1083 keep K1077 as their origin (their pointers hold). Done in 4e26f8a0 (2026-11-02).
- **K1098** · Look check: reduced motion's panel and resize snap. Dropped: nothing to see on a maze: there a panel toggle or a resize does not move the fit at all (K1085's probe, cases a and c, the same before and after); the text-scene toggle measured 89 -> 2 frames under reduce (`.claude/probes/K1085/`) (2026-11-02).
- **K592** · Gap search rounded a negative kStart the wrong way: kStart can go negative (ring seam crossings, pinned in gap_mask.test.ts), and its three decodes use floor(x + 0.5) now (K817). Done in 7dc79767 (2026-10-22).
- **K801** · K138 s4 slice 2 calls (keys at core junctions, placeholder icons). Dropped: duplicate of K789 (K1094) (2026-11-02).
- **K404** · Inferred: the hover path ignores onHead. Dropped: hover and click both gate on inWaitZone (input_pointer.ts:766, main.ts:3277, 6b5b88df; K1094) (2026-11-02).
- **K443** · Two panel rows labelled `clock`. Dropped: the rows already read Clock and Fire clock (tweakpane_panel.ts 1270, 1276, 1917; K1094) (2026-11-02).
- **K1096** · Levi checked the HUD's before/after sheet in place of the phone check: fine (`.claude/probes/K775/shots/sheet.png`). Done in 1a6823ea (2026-11-02).
- **K738** · Free play badge re-fits (icon only, beside or below the menu button) when the HUD grows; clear of the HUD in all 8 shot states (`.claude/probes/K775/shots/`). Done in 1a6823ea (2026-11-02).
- **K775** · HUD's hidden-runs row wraps inside the box (shots at 411x753, 360x740 and 320x640 matched the rects: `.claude/probes/K775/shots/sheet.png`). Done in 1a6823ea (2026-11-02).
- **K593** · preview.ps1 junctions main node_modules into bare worktrees or fails naming npm ci. Done in f0a871a9 (2026-11-02).
- **K1063** · run_node.mjs server.ws false; parallel probes no longer print Port 24678 error. Done in a869f4a6 (2026-11-02).
- **K1084** · hashed /assets/* now max-age=31536000 immutable on Pages; worker fetch cache-served 10/10, levi fresh hello 941->347 ms. Done in a4cc20ee (2026-11-02).
- **K741** · cutRules(upper) drops 'fewest cuts' for upper-bound par; exact-par pinned. Done in 221b5ad5 (2026-11-02).
- **K442** · walked/fire lead lines true under both fire clocks; tests pin old phrases gone. Done in 715049f5 and 91b54050 (2026-11-02).
- **K228** · pointerleave clears the choice hover too (probe K228 before 0 stays, after -1; guard held). Done in e5408241 (2026-11-02).
- **K1085** · Reduced motion snaps the camera's fit on a jump and its range ease (9e7fd3f8). Done in 9e7fd3f8 (2026-11-02).
- **K1078** · Hand K1040's gated stages to Muse. Dropped: Levi (2026-11-02) left Claude agents or Muse to the coordinator per task; the junction stages stay with Claude agents (S3 runs as K1097's agent) (2026-11-02).
- **K1089** · Cursive J3c's look calls: Levi kept v6.6 on all four (oe, ot's dip, the dips into m n v x z, the entries into i j p s u w y; `K863_trace.md` Levi's calls). Done in 54900768 (2026-11-02).
- **K671** · Remove 16 merged, clean agent worktrees with K161's cleanup.ps1. Dropped: already gone: removed after 10-27 without a K161 run (inferred: Claude Code's sweep of old clean worktrees); branches kept, all merged; the open items' probes were copied at merge (2026-11-02).
- **K485** · Pixel sheet pass on the phone: 34/34 portrait checks ok on master (keys, landscape, live skipped). Done in 7ef119c5 (2026-11-02).
- **K309** · K299 ring-lap fix on the PowerVR: 319/16384 division misses (all k-1); every seam case 0 px on master. Done in 7ef119c5 (2026-11-02).
- **K896** · Confetti recheck on the phone (round 2026-10-30): master 45.0/45.3 fps vs 8fe3d20 60.1/60.3 over the 8 s fall, both orders; cost reproduced. Done in 7ef119c5 (2026-11-02).
- **K1051** · Turn on Dependabot for knotmaze. Done by Levi in the repo settings: alerts and security updates on (2026-11-02).
- **K715** · adb deaths: Godot's shutdown_adb_on_exit is now false (claude-config Setup-GodotAndroid.ps1 step 5; applied on the desktop). Done in claude-config f914c3a4 (2026-11-02).
- **K1087** · The phone's network path off USB (5555 over Tailscale closes on every reboot). Dropped: decided 2026-11-02: re-arm 5555 over USB after each phone reboot, automated; the job is claude-config CC132 (2026-11-02).
- **K1079** · Muse batch 4: A K331+K330 20b66f6e, B K549 48cf34fa, C K486 4935f769, D K1077 d21a05d2, E K412 c24d5801; all passed review (K1081, K1083, K1084 amended; residuals K1085, K1086 filed). Done in c24d5801 (2026-10-30).
- **K412** · preload verified on real network: through levi.dev proxy chunk downloads once, worker fetch transfer 0 (5 fresh + 5 warm per origin, desktop Chrome); pages.dev revalidates (max-age=0), fix filed K1084. Done in c24d5801 (2026-10-30).
- **K1077** · prof5-prof8 attribute the residual: 82% of +4.24 x1, 87% of +13.16 x4; three clusters (button-tick rects, fillet rebuild, gap-slot pass) filed as K1081-K1083. Done in d21a05d2 (2026-10-30).
- **K486** · Touch help for the panel's nine buttons (K467's mechanism on buttons); probe .claude/probes/K486/. Done in 4935f769 (2026-10-30).
- **K549** · Text scenes fit beside the open panel (fitArea/fitPlacement in view_clamp, camera reads panel only for params.text); probe .claude/probes/K549/. Done in 48cf34fa (2026-10-30).
- **K330** · touch press on a choice lights its hover glow at once. Done in 20b66f6e (2026-10-30).
- **K331** · touch picks in pixels (touchPickMargin); with K330 glow on press. Done in 20b66f6e (2026-10-30).
- **K327** · Labels that say what they size: 'Off-screen arrow size' and 'Maze marker size' (K534, 2605bf6b), word labels for the rest (K541); the panel inventory at HEAD shows no row labelled with its key. Done in e77c9746 (2026-10-30).
- **K785** · Lore attach cost: the hubs now attach only their own lore (re-measured 2026-10-30: frame_loop.ts 2 rules files, 3k tokens, was 11 / 28k; K774's five files 7, 30k, was about 60k, 16k of it the minotaur lore for minotaur_turns.ts). Done in 65c4e1bd (2026-10-30).
- **K1074** · K658 check: c4 stub. Dropped: stale check, K840 leaves snap no exempt stub; c5 covers snap (K658_page_checks.md) (2026-10-30).
- **K1073** · K658 check: real-time Undo. Dropped: by design, the real-time Stranded banner offers Restart only (K658_page_checks.md) (2026-10-30).
- **K1072** · K658 check: real-time Undo. Dropped: by design, the real-time Stranded banner offers Restart only (K658_page_checks.md) (2026-10-30).
- **K1071** · K658 check: real-time Undo. Dropped: by design, the real-time Stranded banner offers Restart only (K658_page_checks.md) (2026-10-30).
- **K1070** · K658 check: real-time Undo. Dropped: by design, the real-time Stranded banner offers Restart only (K658_page_checks.md) (2026-10-30).
- **K1065** · K658 check: fog IoU 0.9613 after Undo. Dropped: inside K137's 0.956-0.981 spread, the 0.97 line is too tight (K658_page_checks.md) (2026-10-30).
- **K1069** · K658 check: exempt tail crossing. Dropped: stale check, K840 (0484e32f) breaks run ends too (K658_page_checks.md) (2026-10-30).
- **K1068** · K658 check: exempt tail crossing. Dropped: stale check, K840 (0484e32f) breaks run ends too (K658_page_checks.md) (2026-10-30).
- **K1067** · K658 check: exempt tail crossing. Dropped: stale check, K840 (0484e32f) breaks run ends too (K658_page_checks.md) (2026-10-30).
- **K1066** · K658 check: exempt tail crossing. Dropped: stale check, K840 (0484e32f) breaks run ends too (K658_page_checks.md) (2026-10-30).
- **K1064** · K658 check: exempt tail crossing. Dropped: stale check, K840 (0484e32f) breaks run ends too (K658_page_checks.md) (2026-10-30).
- **K1062** · Muse batch 3, runs G and A-F, reviewed on master. Done in 5debde5a (2026-10-30).
- **K645** · K140 frame A/B on one build 72bff312: cannons cost unresolved at 1x, +3.2/+5.6 ms at 4x (K653_checks.md). Done in 295d28c4 (2026-10-30).
- **K441** · Owed same-state rerun done: 8/8 stands asleep at both ends, tick gap +4.24 ms (1x) / +13.16 ms (4x) vs +0.23/+1.85 prediction in docs/design/K441_fire_frame.md. Done in 8308ea15 (2026-10-30).
- **K814** · Text & emblem rows built from SHAPE_INJECTION_PARAMS. Done in 82dd37a5 (2026-10-30).
- **K658** · K137 page gaps checked: 155 checks in docs/design/K658_page_checks.md, FAILs K1064-K1074, sounds K1075. Done in 7d00fc06 (2026-10-30).
- **K321** · Credits page: licenses.html became credits.html, Levi header first, Scarborough Fair in Music and sound, Built with Claude Code below art/music. Done in 9de9d25e (2026-10-30).
- **K1056** · Real-time lure lasts until the target (run G, K1062): detect() no longer re-spots a lured monster, both clocks suggest the shipped 2 lures / 1 snare. Done in ab055498 (2026-10-30).
- **K654** · the moving lead rides uKTeleAt, no texel rewrite (K324 s2). Done in 754f06a8 (2026-10-29).
- **K650** · the TELE census, GPU vs mirror with the riding lead (K324 s2). Done in 9cfe77af (2026-10-29).
- **K1053** · Muse batch 2, runs A-F, reviewed on master. Done in 9b9ea6be (2026-10-29).
- **K396** · scripts/dev.ps1 LAN dev server, checks verified on 5531. Done in 179ecd64 (2026-10-29).
- **K1061** · run_node --config; last vite-node recipes pointed at it, panel/fold runs pass. Done in 7f802e12 (2026-10-29).
- **K1060** · workerPreloadScript moved to src/loader/worker_preload.ts (default derived from PARAM_DEFAULTS.physicsWorker); test/loader/worker_preload.test.ts pins its decision against parseParams (probe forms, seeded writer links, overrides, other version, garbage). Done in 2a347a53 (2026-10-29).
- **K1057** · scripts/run_node.mjs tracked (was .claude/probes/K708/run_node.mjs); rules recipes rewritten to it, no vite-node left in rules; burn_sim and par_census run through it. Done in 00a7bc0e (2026-10-29).
- **K783** · a chase starts with 2 lures and 1 snare (PARAM_DEFAULTS; sliders already existed); url_codec defaults pin 0/0 -> 2/1 only, page checks in .claude/probes/K783/ passed. Done in 3e42d9cf (2026-10-29).
- **K1059** · K1055's request count. Dropped: decided by Claude: count network downloads. The worker fetch is served from the HTTP cache, so K1055's check holds (1c8fe970) (2026-10-29).
- **K1055** · Worker preload back for worker pages: an inline head script modulepreloads the worker chunk unless phw=0 (hello about 26 ms sooner on first loads). Done in 1c8fe970 (2026-10-29).
- **K1054** · no K138 rule can be on in a realtime chase (fabricRulesOf zeroes them outside classic; chase needs minotaur), so handleChaseTap needs no ruled twin; gate pinned in url_codec.test.ts. Done in df40887c (2026-10-29).
- **K1052** · test type errors fixed 92 -> 0 in 4 batches; tsconfig.tests.json folded into npm run typecheck. Done in ce1961e2 (2026-10-29).
- **K728** · real-time seeker measured: taken 99.9-100%, slew/banish 4.4-8.9% vs blind 0.2-0.7% (docs/design/K708.md). Done in 80d5c354 (2026-10-29).
- **K932** · bench_frame readPixels sync; K923 runner folded to scripts/k923 (.claude/probes/K932/results.md). Done in f7839f4e (2026-10-29).
- **K414** · static worker preload dropped; phw=0 downloads no worker chunk, and default pages lost K7 s7's head start (back in K1055). Done in b6cd031d (2026-10-29).
- **K1050** · Muse batch 1 (8828b9e2..3f68b7c5), reviewed: K994, K788, K743/K762/K763, K747, K807, K810, K393, K414 and K932 landed; K783/K728 reopened (42a1e8ed measured other things); left K1052, K1054 (K743's chase tap), K1055 (K414's preload); batch 2 is K1053. Done in 3f68b7c5 (2026-10-29).
- **K393** · Option B: probe:types groundwork shipped (92 errors/32 files), gates unchanged. Done in 9a8a6e7a (2026-10-29).
- **K810** · shipped 44/44, Fuse 35, uFuzzy 31, fuzzysort 34 (.claude/probes/K810/results.md). Done in 5add2671 (2026-10-29).
- **K807** · nine constants to panel rows (follow, sword/sleeper rings, nearHops, routeWeight). Done in f641fc0a (2026-10-29).
- **K747** · sword takenAt/slainAt count player moves (inputs.length). Done in bfa3a639 (2026-10-29).
- **K763** · hidden counter only when a hidden run was placed. Done in 6e27a088 (2026-10-29).
- **K762** · backtrack remembers retraced run; turnstile re-entry allowed. Done in ba8aaccc (2026-10-29).
- **K743** · planRouteRuled plans ruled taps; renderer targetAt uses it; the real-time chase's tap does not yet (K1054). Done in 34c31872 (2026-10-29).
- **K788** · placement rejects trapping one-way draws (ruleHasTrap); census 42/50+44/50 -> 0/50. Done in f35f6725 (2026-10-29).
- **K994** · audit clean: vitest ^4.1.12, @xmldom 0.8.15 (npm audit fix). Done in 5982aa16 (2026-10-29).
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
- **K992** · K868 corner rules continuous in the geometry: the corner march (stage 4's c23w landed in 27a183b9). Dropped: superseded by K1040, whose corners are closed form (F2, F6); worktree `k992-corners` kept (the census kit) (2026-10-28).
- **K868** · Border look, junctions done right: one field renderer with exact G1 fillets, checked against a CPU oracle (`K868_field_border.md`). Dropped: superseded by K1040, which carries its goals (F1, F6, F7); worktree `k868-s3a` kept (oracle30, the recordings) (2026-10-28).
- **K1034** · Cursive v6.4 looks: Levi picked b0's joins out of o, ot's tangent entry (Ht) and v6.4's og. Done in 0f532318 (2026-10-28).
- **K1030** · Cursive og: Levi kept v6.4's (o meets g's left shoulder at 50.5 u). Done in 0f532318 (2026-10-28).
- **K1028** · Cursive tools for J3b: own-ends census and sheets, the run-on font reference, bg/wg/vg census words; b0 built through B3's reader (`work24/b0_build.log`). Done in 7c382e05 (2026-10-28).
- **K1026** · Cursive joins into g after B3's refit: Levi likes bg and vg where v6.3 lands them (2026-10-28); J3c keeps that attach, wg's with them. Done in 4d082218 (2026-10-28).
- **K1025** · Cursive v6.3, by look: Levi likes g's new top (2026-10-28); a's and q's tops follow (K1029), the joins into g go to J3c (K1026). Done in 2bcbf84a (2026-10-28).
- **K1020** · Cursive g's top refit to curve evenly from the corner, like a's and q's (B3, v6.3; largest |dk/ds| 6.66e-3 -> 7.07e-4 /u^2); the joins into g it moved are K1026. Done in e3d89333 (2026-10-28).
- **K1019** · Cursive reader: frames carried by true arclength (B3's `asdrawn_k1019.py`): ba, va, wa 6.8-7.0 -> 2.5-2.6 u, bq, vq, wq 22.9-23.3 -> 5.0-5.4 u; the census measures a solved join at its own ends (K1028). Done in e3d89333 (2026-10-28).
- **K1013** · Cursive o's join, by look: Levi picked B (a point at o's top, then a short run back: "B for o's exit"); J3b builds it and fixes its dips and the oe crossing (K1009). Recorded in 3f2fd5c5 (2026-10-28).
- **K1012** · Cursive B2: g and q take a's top-right corner, one point with two tangents (v6.2; Levi's request); g's top is K1020. Done in 5b084d1a (2026-10-28).
- **K1004** · Cursive o and a after B1: Levi likes a's top corner; o's exits are bad, and J3 takes them (K1009). Answered 2026-10-28.
- **K1005** · Cursive joins out of B1's o start low. Dropped: superseded by K1009 (solved joins replace the re-fit).
- **K976** · Cursive o's exit as an abrupt cusp, then a slight overstroke (Levi): built in B1 (v6.0); whether it looks right is K1004. Done in 1522a265 (2026-10-28).
- **K995** · Cursive b's lead-in as one even curve: B1 took out the knee (score 0.0357 to 0.0004; 3.20 u off the font's lead). Done in 1522a265 (2026-10-28).
- **K996** · Cursive body edits J2 measured: p's end and h's start done in B1; f's loop end continues as K990, the b, v and w exits as K948. Done in 1522a265 (2026-10-28).
- **K962** · Cursive joins J2: one frozen setting per key, nothing fitted at build time; hooks 28 to 10, comb spikes 62 to 16; minimum's m tail, hippo's po, ma and la smooth (fo's burst is f's body, K996; h's entry K991). Done in 0a5712e7 (2026-10-28).
- **K946** · Cursive generator hooks: d's entry fixed in J2 (nd and lead d, no hooks); b's lead spike gone (its knee is K995); the hippo lead-in is K991, na and nq (unmeasured) K998. Done in 0a5712e7 (2026-10-28).
- **K988** · Cursive: maze's z exit hook (the capped comb spike) gone in J2, ze 2.28 u; a seam micro-hook, like the J1-kept sets still at the floor (K948). Done in 0a5712e7 (2026-10-28).
- **K975** · Cursive v5.8, Levi's review: another pass before the hand edits: o's exit (K976), the a k p f bodies (K990), the b h t p entries (K991). Answered 2026-10-28.
- **K950** · Cursive word-final e tail: long (Levi, 2026-10-28: "Long tail on e seems goood"), already the default of J1's `build_from_svg.ps1` (7c7248dc). Done (2026-10-28).
- **K980** · Cursive J1: every derived piece local (v5.8's shared fits frozen in the map), the e variants a continuous fit; K944's nine edits pass with untouched pieces at 0 u (baseline up to 5.12 u). Done in 7c7248dc (2026-10-28).
- **K981** · Cursive retrace rule: a smooth fork's departing handle stays collinear, so n's far fork no longer turns (G1 only: K987; rough still fails n: K986). Done in 7c7248dc (2026-10-28).
- **K983** · The docs name Levi instead of the old pronouns: 211 of 225 hits fixed in 66 files under `docs/` and `.claude/rules/`; the 14 left are quotes, named other people, game characters and one letter pair. Done in 3698078a (2026-10-28).
- **K944** · Cursive `--from-svg` reads Levi's edits as drawn: an Inkscape save reads back within 6.05e-7 u, the build from it matches v5.8's byte for byte, nine scripted edits read back exactly (`work17/dbg/build_from_svg.ps1`). Done in e347eb16 (2026-10-28).
- **K970** · Cursive tools: `eye`, `fid_cmp`, `nodes_pairs`, fewnode's G2 tally and the `--end-budget` header, fixed in the `_k969` copies. Done in 17ff48ef (2026-10-28).
- **K969** · Cursive v5.7's small comb bumps: a's, k's crotch ripple, y's exit corner and b's spike gone in v5.8; o's exit is K976, the rest K977. Done in 17ff48ef (2026-10-28).
- **K968** · Cursive's checker read one-cubic strokes as 0: `rough_k969` reads x 1.40, x2 0.17, t2 0.26; v5.7's one-curve x kept. Done in 17ff48ef (2026-10-28).
- **K963** · Cursive f's hook: v5.8's new fair peaks 3.85 (v5.7 5.21), its S and the bottom-loop lobe gone; three close nodes stay (K977). Done in 17ff48ef (2026-10-28).
- **K965** · Cursive v5.6's peaks and ceilings: in v5.7 every stroke is at or below its v5.6 peak (x2 0.13 -> 0.16 aside), k, q, r, y and i under v5.4's, q and r under the ceilings; f's hook stays in K963, o's exit in K969. `K965_cursive_v57.md` ## Handoff. Done in 5af5ed72 (2026-10-28).
- **K960** · Cursive v5.6's eye flags over 3 (r@669, w@618, k@2136): gone in v5.7, none new; the looser band clears w and k, the junction stretches r. Done in 5af5ed72 (2026-10-28).
- **K959** · Cursive v5.6's exit ends: each body faired 40 fu past its smooth cuts, its end frames re-taken from the faired centreline; o's hook and e's flick gone. `K959_cursive_v56.md` ## Handoff. Done in c011bc49 (2026-10-28).
- **K945** · Cursive v5.5: the centreline is the medial axis of the font's thinnest outline (on the font's axis, 0.00-0.57 u in the moved runs; v5.4 0.4-2.8 u), fair is the default, the roughness ceilings tightened; leftovers K959-K963. `K945_cursive_v55.md` ## Handoff. Done in d8e369a8 (2026-10-27).
- **K939** · Cursive: the a/g/q stem tops are corners at the font's V (0.13, 0.26 and 0.00 u from it; d starts at its cusp), no U. `work13/vtops/vtops.png`. Done in d8e369a8 (2026-10-27).
- **K928** · Cursive: `--split fair` is the default (v5.5); reading Levi's edited template as drawn is K944. Done in d8e369a8 (2026-10-27).
- **K942** · Label ink's settled rules are the oracle's defaults (the crossed yield order, unit-tested; labTie "surface"); its other switches removed. Done in 5bbe3790 (2026-10-27).
- **K934** · K868 re-count: the free-end check counts runs of ink (31 free ends, not 83); the settled rules are the oracle defaults (K942); extent part; sheet K at play size. Done in 5bbe3790 (2026-10-27).
- **K940** · Label ink rule fixes behind switches, all off (`labFill: "yieldOrder"` with `labYieldChain`, `labCapReach`): the crossed yield form is right where plain yield was 82% wrong; change 2 hides crossing lines. Sheet J and S's crops. `K940_label_fixes.md` ## Results. Done in c8e9f622 (2026-10-27).
- **K926** · Cursive v5.4: e's two high entries from the font (o entry after b o v w, g entry after c g j y z; be 31.17 to 2.89 u off the font's connector, ve 31.17 to 3.46, ze 12.45 to 2.05), en 7.08 to 1.15 u, er 8.35 to 2.36. `K926_cursive_e.md` ## Handoff. Done in e1c9ad64 (2026-10-27).
- **K929** · Cursive: a word-final e draws its exit, cut where it has risen as far as the m/n/y/d tails (51.1 u, ending 1.46 u from the font's exit; the cut rule is K950). Done in e1c9ad64 (2026-10-27).
- **K930** · Cursive v5.3: few-node G2 strokes (m 157 to 26 nodes, a 109 to 19; bodies a median 13 nodes, within 0.94 u of v5.2); the `--from-svg` hold is prototyped, not wired (K944). `K930_cursive_smooth.md` ## Handoff. Done in 8d5cb66e (2026-10-27).
- **K924** · Label ink artifacts traced to their rules (M1 cap cut, M2 fill over a foreign tube, M6 fill z, M3 tie; S, a crossing inside a cluster, is a K868 design call); five diagnostic flips in OracleParams, off by default; rule changes ranked. `K924_label_artifacts.md` ## Results, ## Handoff. Done in 1f48441b (2026-10-27).
- **K925** · Cursive v5.2: the a/c/d/g/q dip fixed (eye check a 9.27 to 1.91, q 8.09 to 1.92), one eye scale, o's junction at 86 u (its joins stay inside the font's fill). `K925_cursive_v52.md` ## Handoff. Done in 05ccdb2f (2026-10-27).
- **K922** · K868 stage: depth over the whole overlap, endSnap (a float bug; real free ends 105 to 83) and extent part, behind switches that default off; sheet I. Brief ## Results, ## Handoff. Done in f8881166 (2026-10-27).
- **K923** · S3's Pixel bench (K868): as specified 4.8-5.5 ms at fit and 2x, over the 4 ms budget; with a screen-space LOD and a packed 32-bit label 1.6-2.7 ms at every zoom (p95 at most 3.43); a disc search 4.5-6.75 ms against G3-1's 24.5-48. `K923_s3_bench.md` ## Handoff. Done in 4dbd9e98 (2026-10-27).
- **K917** · Cursive junction heights. Answered by Levi (2026-10-27): "sgtm"; 60 u for a, c, d, g and q; o at 86 u, chosen on the sheet ("Seems better than the other two sets"). `K863_trace.md` ## Levi's calls. Done in eae3a581 (2026-10-27).
- **K916** · Cursive v5.1: whole-stroke fairing (`--split fair`), leads into a/c/d/g/o/q from the left, the join refit, the K917 sheet; leftovers in K925-K928 and K917. Done in fc44d084 (2026-10-27).
- **K918** · K909's oracle leftovers (extra ink, #16's group on top, sheet F's spur, hairlines, seam and speck, S3's far pieces, geo's shorter spans). Dropped: superseded by K924: K915's label ink removes S3's far pieces and most group-on-top ends; the rest moved to K924 (2026-10-27).
- **K915** · Borders from the visible surface: oracle `ink` surface and label (free ends 228 to 100 on the real scenes, extra ink 71 to 94; d1-d4 close with angular cuts), `hookLook` seam, form B rejected, S3 as two passes, sheet H; verdict adapt; follow-ups under K868. Done in 150ac009 (2026-10-27).
- **K901** · Cursive: r after a high exit dips, as the font's does (Levi: "dip"); `docs/design/K863_trace.md` ## Levi's calls. Done in ebf1fef2 (2026-10-27).
- **K904** · Cursive v5: a, c, d, g, o and q fused at 60 u, the high entry mode, every split a G2 blend (peak curvature ratio max 120.5 -> 4.8), r after a high exit both ways; steps 4-5 moved to K916. Done in 0d0e8797 (2026-10-27).
- **K906** · Phone round 2026-10-27c: T1 = K525's TELE paint item (`9d23dab1`, dense +11.0 ms), T2 = K137's fray (`d8675df1`, dense -13.1 ms); `docs/design/K156.md` round 27c. Done in 9383defc (2026-10-27).
- **K907** · The phone kit tracked: scripts/phone_pass/ (12 files with headers), tested on the phone in round 2026-10-27c; k539_g31.mjs and pixdiff_g31.mjs only parse-checked. Done in 9383defc (2026-10-27).
- **K909** · Geometric junction groups behind groups: "geo" (free ends 228 to 227, so k883 stays the default), truth geo's crossing order, the hookLook switch and sheet G; leftovers in its handoff. Done in 5d85a213 (2026-10-27).
- **K905** · Root paint GLSL compiled out unless a root is drawn (K_ROOT): phone render sync -18.9 dense, -25.7 max-fabric, -12.3 ms knot; pixels unchanged. Done in e2d379ca (2026-10-27).
- **K910** · K900's sheet B3: do the magenta free border ends cover every missing border on muse_hash? Answered by Levi (2026-10-27): "Yes, I think so"; the free-end image check judges K909.
- **K902** · Cursive v4 (probe-only, untracked `.claude/probes/K863/trace/` `out7/`): join frames by a walk to the font's connector (smooth-end angle mean 22.1 -> 4.7 deg), calibration mean 3.218 -> 2.175 u, test-word pairs over 4 u 22 -> 10, a's fused entry (0.3 u); r after high exits and the variants measured; two-mode design in its brief's ## Results. Done in 482f259 (2026-10-27).
- **K900** · Oracle holes: crossing 292 fixed (same-chain joins refused, crossing cut at L + h), census positions, two independent checks (geometric truth, image free ends), sheet B3; handoff in its brief. Done in cd025b84 (2026-10-27).
- **K893** · Phone round 2026-10-27b: G3-1 undone at head by hand wins 14.5 / 15.9 / 11.2 ms (dense / max-fabric / knot) but is not clean; the week's steps are K573 1b (knot -21.4), K620's root GLSL (+22.6 max-fabric) and K854's outline (+15.3). Done in 6319be72 (2026-10-27).
- **K891** · K883's sheets B2 / F / worst12. Answered 2026-10-27: B2 shows about twice the blue-marked misses (census undercounts; K900 redirected), F lgtm (cr 0-6, default 3).
- **K886** · K863 cursive v3: letter bodies with join frames, G2 connectors per letter pair, template and word sheet. Done 2026-10-27 (no commit; outputs in `.claude/probes/K863/trace/out6/`, template on Drive `K863/`; follow-ups K901-K903).
- **K883** · K868 oracle: the K883 span rule (no group holds both passes of a crossing) and the `cr` mapping; missing border samples 1540 to 208; follow-ups K891, K898-K900. Done in 972228b5 (2026-10-27).
- **K881** · K868 sheet E: G2 corners against G1's rolling-ball arcs. Answered by Levi (2026-10-27): "In sheet E, I don't see any difference with G1 vs the others"; G1 stays, K882 dropped.
- **K878** · Cursive trace v2's three questions. Answered by Levi (2026-10-27): ss02's `p.jmc` (the retraced stem, with an exit and no pen lift), joins generated per letter pair, the font's proportions at x-height 120; K886 builds v3.
- **K874** · K868 S1b sheets B and C. Answered by Levi (2026-10-27): B, the oracle's look is right but misses some borders; C, the corner rule is taken and the `cr` slider stays, now scaling the approved corner. Both go to K883.
- **K879** · K863 tracer v2: crossing repair where a letter crosses itself, and the eight answer combinations for K878. Dropped: superseded by K886; v2 was delivered untracked (`.claude/probes/K863/trace/out5*`, all 13 crossings true X) and never uploaded (2026-10-27).
- **K882** · K868 S2b, only if K881 picked G2: why both G2 curves cross a side at acute corners. Dropped: K881 kept G1 (2026-10-27).
- **K870** · K868 S1b: the CPU oracle (`src/render/field/geom.ts`, `oracle.ts`, `checks.ts`), checks 1-9 and 11, 12 synthetic scenes, contact sheets A-D. Done in 7b278662 (2026-10-26).
- **K869** · K868 S1a: the scene exporter (`__knotSceneExport`, `scripts/export_scene.mjs`) and 21 real scenes (65 variants) for S1b. Done in 329324f3 (2026-10-26).
- **K858** · Research adoption round: curves 3.2 became K859, cursive K860/K861; curves 3.3 (one field-shaded border) is now K868. Done in badb6bd9 (K859) and a00fb6d5 (K860) (2026-10-26).
- **K861** · Fair re-authoring of a/i against K860's targets. Dropped: rejected by Levi ('they are bad'), superseded by K863's clean slate; its re-fit (c6e1c326) stays the live a/i data until K863 lands (2026-10-26).
- **K866** · Global union-field border, ?fbd=1. Dropped: superseded by K868 (its global union fused crossings too, then un-fused them with gates); never committed, code parked at 060151d7 (branch park/muse-2026-10-26) (2026-10-26).
- **K865** · SDF union-field junction border, ?sfb=1. Dropped: superseded by K868; never committed, code parked at 060151d7 (branch park/muse-2026-10-26) (2026-10-26).
- **K864** · K862 follow-up: cosine-warped rim samples, per-side side-cut windows. Dropped: never committed; parked at 060151d7 (`park/muse-2026-10-26`), superseded by K868 (2026-10-26).
- **K862** · G1 fillet rims (two Hermite halves through the old rim's midpoint). Dropped: never committed; parked at 060151d7 (`park/muse-2026-10-26`), superseded by K868 (2026-10-26).
- **K851** · Permanent-loader escape, fixed properly (`.claude/probes/K851/`): the open settings panel was invisible over the kept loader because the desktop `.tp-dfwv` had z-index auto (its 28 lived only in the sheet media query) under the opaque loader overlay (z 15) — the base rule now carries z-index 28; and any page refresh (soft or hard — the page cannot tell them apart) forgets `knotmaze.loaderStays` and lets the intro finish, which the checkbox help now says. The loader's head glyph also dives at under crossings (loader_geometry `underGapAt`: the strand's gap window extended by the glyph's world radius, both motion modes), verified by frame sampling (glyph absent in the 3 dive frames per lap).
- **K850** · Cursive a/i measured rework (`.claude/probes/K850/measure.mts` + the lint as oracle, iterating endpoint curvature cross/handle³): the a's topmost point moved from x=49 (flat top, bowl 28..80) to x≈60-66 at y 75-77 with a one-way heading turn from L through the apex (soft, R ≥ 11 GU by lint) and a steep right descent to R; the spur lands at L within ~5° of the body tangent with monotone heading (no hook) and leaves R colinear with the descent; flares shortened to the arcs they dress (40/34). The i's entry control points climb monotonically into J (colinear with the stem by construction), the bottom sweeps one wide arc (was R ≈ 5 GU), the stem flare now reaches plain width at the tip, and the dot is the clean ellipse. Glyph lint clean at xh 2/3; stills `.claude/probes/K850/after/ai2.png`, `ai3.png`. AWAITING Levi's look verdict (K847's was rejected). Residual: pale seam discs inside the a at L and R (taper-root/joinery machinery, not the centerline), and a small notch at the i stem base.
- **K848** · Link-look chip docks against the mode badge on the shared (dropped-badge) row — right-aligned with an 8 px gap, re-laid-out on every badge re-fit (open/close, resize, label change) plus deferred re-fits at load, when the panel starts open; the sheet keeps its top-bar layout. Revises K844's screen-left placement (Levi: not against the screen's left edge; butt it against the row's other chip). Probe `.claude/probes/K848/`.
- **K849** Border-junction strokes, measured (`.claude/probes/K849/analyze.mjs`: CPU union silhouette vs settled stills, layer attribution): the K846 side cut now packs WORLD arc (it was spline-sample units against the strip shader's ctrl units, so it almost never fired), its window is the neighbour-capsule exit extent per side, and the fans' border band is baked into the fan geometry as an inner rim ring (pushFan bandIn = borderWidth × fillHalf) stroking the rim arc alone on wedges. Deep interior strokes at three 4-arm junctions: 569 → 357 device px (fan share 279 → 39); residuals sit at arm crossings (gap windows), plus a small curved-arm residue at one junction.

- **K268 (stage 2 item 2, PROTECT part)** · The protect waiver scales by the covered thread B's visibility per side under the thread reveal: computeGapSlot records B's chain/pass per slot side (slotProtChain/slotProtCtrl), applyExploreGaps writes the clamped vis as a per-slot factor into spare gap texels (texel 3.x / 9.w, solved at 1; GapMaskTable.setProtVis/protVisOf), and only the explore shader variants multiply the waiver by it (EXPLORE_PROT_GLSL; master's gap text and mode-off cost untouched, fans never run it). Mode off restores 1. Proof: unit tests (gap table texels, protVisScale, shader texts incl. fan/still undo), CPU census in a walked fabric state (706 sides, 0 mismatches; 544 hidden / 22 shown / 4 partial), protect probe 5/5 and census3a 22/31 = the K430 ramp baseline (the 3 extra fails in one run moved off on rerun - variance inside K537). The biting-triangle GPU census is K542; the far-branch smooth-min is the item's remaining part. Done in this commit (2026-10-16); evidence .claude/probes/K268/stage3a/out/protect_final/ + census_protect2/.
- **K268 (stage 2 item 2, FAR-BRANCH part - item 2 complete)** · The far-branch smooth-min blends vis-weighted cuts instead of distances in the explore programs only: each branch's geometric cut times its own coverage (the far branch's at its own projection through exploreCutCover), combined as the stronger weighted cut plus the smooth-min dip scaled by the visibility both branches share (farBlendCut; equal coverages reproduce master's blended cut weighted, a hidden branch contributes nothing). Dots frontiers and non-shaped slots keep master's path; master's gap text and mode-off cost untouched. Proof: farBlendCut + shader-text/undo unit tests, all explore variants compile in WebGL2, census3a 22/31 = the ramp/PROTECT baseline (same 9 K537 fails, 0 page errors). With this, K268 stage 2 item 2 is complete. Done in this commit (2026-10-16); evidence .claude/probes/K268/stage3a/out/census_far1/ + far_variants/.
