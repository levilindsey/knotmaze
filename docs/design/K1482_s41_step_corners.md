# K1482 stage 41: rounder corners at t81s's step and at t4s (K1559, K1555)

Brief for one Claude agent (model opus), 2026-11-20. Render work in `src/render/gpu_field/eval.ts` and
`gf_glsl.ts` (the mirror and the shader, in step) and their tests. `gf_look.ts` is hands-off (a Muse run
works there). First try at both corners.

**What Levi asked.** Both places are on link A (`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`,
3200x1800 frame, border look `&tlk=border`).
- t81s, at (929, 1153): where the under thread's tail ends at the over thread, the outline makes a step.
  Levi, 2026-11-20: "we want the step. Ideally the step corner would be a be rounder though". The step is
  WANTED (a written look rule): it stays where it is and as high as it is; only its corner changes.
- t4s, at (2172, 615): a square inside corner. Levi: "this would be nice to round out, but is not too
  critical of the fix becomes too difficult to make or too costly".

**Goal.** A rule, yours to design, that draws each of the two corners ROUND: an arc that meets both border
lines without a kink, the border stroke unbroken through it at its full width. Choose the radius so that the
corner reads as the same hand as the rounded corners gf already draws on the frame (look at a few first;
`&gfk=0` shows the frame without the second corner try). t81s comes first. If the rule that rounds t81s does
not reach t4s and t4s needs its own, finish t81s and say what t4s would take. The result is a CANDIDATE:
Levi decides, nothing is pushed.

**The bar, binding.** At junctions and thread ends the outline runs on unbroken, with no dot, stub, wedge,
tick, notch or slit. Every thread at a place keeps BOTH borders, its width and its heading (never trade a
hook for a point; never thin, merge or drop a border). gf's border look is its own: do not move its strokes
toward the older render's, and do not use that render as a bar. A rounding rule fires at every corner of its
kind on every maze: each place it changes must be as the start draws it, or cleaner. A rule that rounds the
two named corners and breaks one other place is not a candidate as built (stage 37's ball: 8 places cleaner,
2 broken on sister mazes; `docs/design/K1482_s40_ball_narrow.md`).

**Done.**
1. Start pictures of both places (wide and close, as drawn and brightened), and in two or three lines each:
   what draws the corner (which pieces meet, which term makes it square), shown in the mirror.
2. The rule in the mirror and the shader; pins that move re-frozen and named; `npm test` green (with
   `GF_KRETRY` unset). A Vitest case for the rule if a scene fixture makes it cheap; else say so.
3. EVERY changed place against the start over ALL the test mazes (A_3 = link A to A_d, D_1 to D_a; links as
   in `.claude/probes/K1551/` and `.claude/probes/K1482/s36/`), border look. The mirror lists them without a
   capture (start against candidate on one frozen scene; stage 40's tools under `.claude/probes/K1482/s40/`
   and its handoff show how, and how far its list matched the captures): run it on every maze and write the
   list with coordinates and px. Captures confirm: ONE session per maze, loads start, candidate,
   start, candidate, compared only within the session (start against start and candidate against candidate
   must be 0 px). Capture link A first, then the mazes with the most listed places. A maze takes about
   4.7 min under the lock: name every maze you did not capture.
4. For EVERY captured changed place one sheet in stage 39's layout (before | candidate; wide and close, as
   drawn and brightened; two pictures per row, at most 1800 px wide), a `places.txt`, and a table: maze,
   coordinates, px changed, one plain line on what is drawn before and after. For t81s and t4s also the fill
   look (`&tlk=fill`) and `&gfk=0`.
5. Cost, as numbers for Levi: the largest program's text growth in chars, and its cold compile seconds
   against the start's with Run M's tools (`.claude/probes/K1552/`; `### Handoff 27M` in
   `docs/design/K1531_muse_batch27.md`), under the lock.
6. Guards on your candidate with `GF_KRETRY=1`: `guards.ps1 -Tag s41 -Port <p> -Ref <your commit> -BaseRef
   <your start commit> -BarPort <p2> -OutDir .claude/probes/K1482/out/s41/guards -Owner <you> -NoBar`; then,
   if 35 min remain, the K1436 bar (`-BarOnly`): new / grown / gone per scene and its verdict line.

**Setup and rules.** `Get-Date` first. Your worktree starts from master: name its commit in the handoff
(Muse runs land fixes on master while you work: your start commit is the base of every comparison). The
earlier stages' tools are on master under `.claude/probes/K1482/` (`s39/`: one capture session per maze,
`capseq39.ps1`, `diffseq39.ps1`, and `place39.py` for a place's sheet; `s40/`: the same pointed at stage 40,
and `census40.ts`, the mirror's per-place census, the model for yours); stage 40's handoff in
`docs/design/K1482_s40_ball_narrow.md` shows them in use. The D mazes have no scene file, so the mirror
cannot list their places: only a capture can. Stage 38's candidate at t81s (the under thread's width) and
stage 40's ball candidate are not landed and are not your start. Never push, never rebase, never merge
another stage's branch. Ports 6360-6379. Outputs under `.claude/probes/K1482/out/s41/` (untracked;
never `git add -f` them), tools under `.claude/probes/K1482/s41/` (tracked). A build of a commit:
`scripts/preview.ps1 -Port <p> -Ref <commit>`. One capture at a time, machine-wide: every capture and guard
through `scripts/perf_lock.ps1` (Muse runs share the lock; wait inside ONE blocking command; leave no lock
behind). `&snd=none` in every shot; never Chrome's `--virtual-time-budget`; Node probes as `node
scripts/run_node.mjs <entry.ts>`. Do not edit `LEDGER.md`. Commit at each milestone (WIP counts), and keep
two or three lines of notes under `### Notes K1482 s41` in this file as you go. Keep tool output short (cut
long lines; view pictures as crops, not whole sheets). Read code through the shell (`Select-String`, ranges
of `Get-Content`); the Read tool only just before an Edit. Clean up at the end: previews stopped, no lock
held, your temp folders and Chrome profiles removed; never touch `$env:TEMP\k1482s27live-profile-20548` or
another stage's folders.

**Stop rule.** Stop when the list is done or 2 hours after your start (`Get-Date` at the start and at each
milestone), whichever comes first; then commit WIP, append `### Handoff K1482 s41` to this file (what draws
each corner, the rule, the numbers, the cost, what did not run, the sheets' paths, the commit to build as
the candidate) and report. A compaction or context size is not a stop: after one, re-read this brief and
`git log`. If no rule rounds t81s's corner without breaking another place, say so with the numbers and stop.
The report ends with a `Ledger items` list and the handle fields (owner, branch, last commit, evidence,
next).

### Notes K1482 s41

- Start: ef6dacb53. Start capture `.claude/probes/K1482/out/s41/pre/m/A_3/gf_b2.png` (border, hash fff8c9e5); crops in
  `out/s41/mir/` (cap_t81s_c, cap_t81s_ctr, cap_t4s_c, cap_t4s_ctr; step_sbs.png = capture beside the mirror).
- t81s (mirror, A_3): the step is chain 45's LEFT band where it meets chain 9's lower band. The riser (x ~911,
  y 1131-1137 in the mirror; ~906 in the capture) is the INNER edge (X = h - W) of 45's left band along a short steep
  run just under 9. Its bottom corner (~912,1137) is a crease of 45's own distance field at its polyline kink near
  (917,1147.5): the nearest foot jumps s 18.61 -> 19.0, the ink wedge there is ~118 degrees, square. No gf corner
  exists for 45's thru pair at j103 (thru pairs with r 0 are dropped; the retry skips thru pairs), so no arc draws it.
  The riser's top meets 9's outer edge as a plain over/under cut.
- t4s: not yet attributed (a guess to test: the concave corner of chain 4's lower-left outline against chain 66's
  lower arm near 2155,620, no fillet).
- Plan for t81s: in the side term, d_other = the piece's distance to its own segments turned > ~30 deg from the
  nearest one (interior foot only); a = X - (h - W), b = d_other - (h - W); where b < KR the band's inner edge
  becomes the rounded intersection g = KR - |max(KR - a, KR - b, 0)| (val = band(W - g) ss(h - X)); elsewhere
  bit-identical.
- Rule built (retry programs only; eval.ts `cornerS` + side term, gf_glsl.ts `T41` + `cornerSGlsl`): where a piece's
  outline point q lies inside the piece's own tube, the band is measured from the outline crease O, so the inner edge
  turns on an arc of radius W about O. `npm test` green (GF_KRETRY unset). At t81s it takes 3 px (909,1139 8>5 of 9).
- Mirror census (`s41/census41.ts`, whole frame): A_3 673 px lost at 119 places, A_4 412 px at 95. The largest are
  V points cut blunt: 1538,944 (t84e's fold, 79 px, leaves a 1 px dot near 1541,948), 1691,229 (54 px), 1546,1598,
  1569,251 (s32's clean points). Left: a gate that spares V points (testing n1.n2 > K41G), or say no rule.

### Handoff K1482 s41

- Start ef6dacb53. Built rule at deb148a96: NOT a candidate (it leaves a dot and blunts V points, below).
  Tools in `.claude/probes/K1482/s41/`: `census41.ts` (whole-frame mirror census of S41 on/off, places with px and
  nearest site), `kink41.ts` (the rule's inputs at given px), `mir41.ts`/`px41.ts`/`geom41.ts` (mirror crops and
  geometry), `cap41.ps1`/`capseq41.ps1`/`runseq41.ps1`/`diffseq41.ps1` (captures), `analyze41.py`, `sbs41.py`.
- What draws each corner: the Notes above (t81s: chain 45's +1 side band against its own creased outline under
  chain 9; t4s: not attributed).
- The rule (retry programs only; `gfk=0` and the one-piece `layers1()` path untouched): where a piece's outline point
  q lies inside its own tube, the outline creases at O; s1 = the distance from q to O along the outline (one Newton
  step, f0 / max(|t1.n2|, 0.25)), and the side term becomes `band(length(h - X, s1)) * ss(-aa, aa, h - X)`: the
  inner edge turns on an arc of radius W about O. eval.ts `cornerS` + side term (env `GF_S41=0` turns it off,
  `GF_K41G` is a probe gate, default off); gf_glsl.ts `T41` + `cornerSGlsl` after homeBurial. `npm test` green
  with GF_KRETRY unset (258 files, 3201 tests), no pin moved; no Vitest case (no cheap fixture: census41 is the check).
- t81s: the rule takes 3 px off the step's corner (909,1139 8>5 of 9; 910,1139; 908,1140). A radius-W arc rounds
  about 1 px. A rounder step needs the outline crease itself filleted, with ink past X = h (radius h: the apex moves
  in ~3.2 px, tangent length 10.8 px against a ~7 px riser), so the face skip (fs) and coverage change in the
  mirror and in every shader variant.
- Mirror census (border look, |ink change| > 0.02, every changed px LOSES ink), px / places: A_3 673/119, A_4
  412/95, A_5 404/106, A_6 411/90, A_7 539/117, A_8 599/143, A_9 482/108, A_a 484/116, A_b 507/119, A_c 583/121,
  A_d 432/110 (`out/s41/census/<maze>.json`, `all.txt`). D_1..D_a have no scene file: not listed.
- Broken (mirror, A_3): 1538,944 (t84e) a V point's tip cut back from y 949 to 939, leaving a 1 px dot at 1541,948;
  1691,229 (t2s) a V tip cut blunt (54 px); 1717,228 a wedge's lower edge notched (14 px); 1546,1598 (j43) and
  1569,251 (t82e) V tips blunted (s32's clean points); 943,1436 (j26) a turning corner shaved 1-3 px; 1054,337
  (j110) a small bump removed.
- Gates tried (probe only, not kept): |t1.n2| >= 0.5: 99 places / 642 px, t81s 4 px; >= 0.8: 65 / 407, t81s 1 px,
  1690,230 still 28 px; turn n1.n2 > 0: 117 / 511 (1717,228 still 14 px); > -0.5: 119 / 555. No angle separates
  t81s's crease from the V tips.
- Captures, A_3 only (one session on 6360/6361: start, rule, start, rule; floors start/start and rule/rule 0 px;
  the retry shader compiled and drew, passes 585-604): rule against start 339 px at 79 places, every one LIGHTER
  (ink lost). 1537,944 (t84e) 58 px: the down-pointing V tip becomes a round knob with a 1 px dot left below it
  (`out/s41/sheets/A_3_t84e_1537_944.png`); 1694,228 (t2s) 39 px: a V tip cut blunt (`A_3_t2s_1694_228.png`);
  1545,1599 (j43) 14; 1657,1547 (j61) 12; 1664,188 (j4) 11; 1042,865 (j31) 8; the rest 7 or fewer. t81s: 1 px
  changed (at most 4 levels), the step drawn as before (`A_3_t81s_909_1139.png`). Lists:
  `out/s41/diff_raw/diffseq_A_3.txt`, `A_3_gf_b2_mc_places.json`, `A_3_gf_b2_mc_top.png`.
- Not captured: A_4..A_d and D_1..D_a (no candidate to confirm). Did not run: sheets for the other 76 places,
  `tlk=fill` / `gfk=0` shots, cost (compile seconds), guards, the K1436 bar.
- Next: no rule of this kind. A rounder t81s needs a fillet of the outline crease (ink past h), gated to the
  step's own geometry (an under band meeting its own creased outline beside an over pass), not an angle; the V
  tips (t84e, t2s, j43, t82e) and t81s share the crease and its angle.
