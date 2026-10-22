# Pickup sequence, 2026-10-21 (all In progress + sooner)

Levi: "plan a sequence for implementing them, then do it." Scope: the 17
In progress handles in `LEDGER.md` plus the sooner list
(`sooner_20261020.md`, and K797-K800/K804/K805 from
`levi_notes_2026-10-21.md`, which Levi placed after all other sooner
items). Recent Claude Code work (session 91b19e11) merged K114
(cf41f919), K137 s5 (20b01d7e), K794 (fb110a3e), K795 (a1b1bdde); their
worktrees (k114, k137s5, k794, k138-s4-slice1) are all merged, so pickup
continues from each handle's `next:` on master (54563d7d), not from a
branch.

## Rules (from the ledger's Next binding + sooner plan)

- One stage per brief, each landing a working feature behind its own
  toggle; merges after desktop verification; phone checks batch into
  one K156 window per round.
- At most three code stages in flight; lanes that touch the same file
  run in sequence. The param hotspot (`PARAM_DEFAULTS`, `CODEC_PARAMS`
  append-only, panel, codec pin) is serial: whoever merges second
  re-appends and re-freezes the pin.
- Calls already built as recommended stay built; look-only approvals
  (sheets, phone feels) are not coded past. They are listed as gates,
  not stages.

## The sequence

### Wave 1 — ungated, disjoint lanes (start now)

1. **K797a — paper background.** Append `paper` to the backdrop list
   (white vellum-family paper, static at auto). Files:
   `background_model.ts`, `background_shaders.ts`, `background.ts`
   (none), `param_codec.ts` (append option), panel, pins. No maze
   change; default unchanged (`vellum`), so existing links and
   dailies are bit-identical.
2. **K796 — string burns with its thread** (Next; `pv=string` under
   the burn race). Small render fix in the fire/yarn paint; brief
   first from `gameplay-fire.md`.
3. **K785 — lore attach cost** (docs only): narrow each `.claude/rules`
   file to the files it documents; re-measure with a fresh read.

### Wave 2 — paper look chain (depends on Wave 1.1, ribbon lane, serial)

4. **K797b — fill / border / both** thread look (edge stroke each
   side; over/under/joins read from the strokes). Prototype first;
   CPU mirror/parity skipped until Levi picks a look (ledger rule).
5. **K797c — Crossing gap floor to 0** (panel floor 0.04 → 0; codec
   already takes 0; High contrast override checked).
6. **K797d — solid/textured fills and borders** (pencil graphite),
   only after one perf measurement under the lock.
7. **K798 — border-at-a-time intro** (a couple of orders, then a
   dropdown param). After 4.
8. **K799 — traveled-path look** (width ratio 0-1 + fill texture
   dropdown, perf-checked). After K794 (merged).
9. **K800 — looks set by the link** (look params override saved
   prefs; top-right button clears them for the maze). Daily's own
   look also needs K531/K46, which stay launch-prep.

### Wave 3 — gameplay (controller/minotaur lanes, serial per lane)

10. **K137 remainder**: muddy runs done (s5); real-time extras briefed as stage 6 in `docs/design/K137_s6.md`, then real-time lures/snares, then look pieces
    (scent 4.34, fray, darkness/lantern 4.17, sonar 4.26,
    tunnels 4.13). Brief: `K137_s4.md` handoff.
11. **K138 slices 3-4** from the Remainder in `K138_s4.md`
    (shortcut form, colors), built as recommended; then the
    remaining M mechanisms one stage each.
12. **K114 remainder, desktop parts**: locate the spoken-finish-time
    quirk (switching FROM beat); solver/While-riding page order.
    The phone feel of tempo/L waits for the Wave 5 window.
13. **K546 s2-s4** as recommended in K629 (sparks; contact 0.35 s;
    ash + vignette; `lossAmount`; full beat then restart).
14. **K80 chevrons** (K324 s2's last look piece), built as rec. B
    (K695); K696's phone look rides Wave 5.

### Wave 4 — render/perf lanes (never two GPU lanes together)

15. **K5 R3** (`reveal_fx.ts`, `paint_state.ts` split), then R4.
16. **K8 G3-2** (free to start since K90 stopped; never beside an R
    stage or K268 item 4).
17. **K370 next stage**: brief first (phone worker substep cost),
    desktop half here; phone half in Wave 5.
18. **K268/K397/K459 leftovers**: items 5/6 by eye, K459's truncated-
    dot hypotheses (iii) → (i)/(ii); close K397 when K477 lands.

### Wave 5 — one phone window (K156), then close-out

19. K156 round collecting: K114 tempo/L feel, K137/K138 real-touch
    items (K784 sitting 6), K7 F6 numbers + K412, K307 phone
    measures, K74 K544 timing, K543 sheet, K268 phone proof,
    K783 lure/snare stock sims (desktop sim, listed here as it
    sets phone-checked defaults).
20. Close handles whose `next:` is exhausted; move to Done with
    commits. K74 closes after 19's sheet/timing.

## Gates (no code until Levi's call; built as recommended already)

K115/K580 (K606, K718, K582, K557, K569), K546 look (K629 taken
above as rec.), K623/K624 (set K409 s4's scope), K696, K617,
K625-K630 and the rest of Waiting on Levi. K804 (beat indicators)
and K805 (dot-eater) come after the paper look, once there is
budget (Levi's words), so they close this sequence, not this round.

## Status

- 2026-10-21 evening: items 12-18 done or closed as far as desktop
  work reaches. Landed since: K114 desktop remainder (`9aa6fe45`),
  K546 stages 2-3 (`3659d965`, `4c860ce9`), K5 R3 (`6ce5ced8`,
  `5de8328d`) and R4 (`98d96fa5`, `0ee562bc`), K8 G3-2's brief + seam
  (`a8ea5b4e`, `957ba833`; the SDF pass itself is the brief's steps
  2-3, still to build), K370 stage 2's desktop half (`3d0102f3`: the
  worker substep premium does not reproduce), K459 item 1 closed
  (`a6450bc3`), K268 items 5/6 closed (`07100291`). Suite 2249
  passed at `07100291`.
- Still gated exactly as listed under Gates, plus Wave 5 (item 19,
  one phone window: K370's phone half, K477/K397 free-cap checks,
  K268's phone proof, K114/K137/K138 feel items) and K546 stage 4
  behind Levi's Q1 on the stage-3 sheet
  (`.claude/probes/K546/s3/`).
- Wave 1.1 (K797a) in progress on master; each stage commits and
  pushes on green (deploy = `npm test` + Pages).
- This doc is the plan of record; the ledger's In progress handles
  keep their own `next:` lines and this sequence between them.
