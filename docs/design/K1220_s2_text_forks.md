# K1220 S2: a text fork reads as one fused piece, as the maze's junctions now do

Ledger: K1220. One Claude Opus stage agent in its own worktree, the only code agent in junction files
while it runs. Cap 2 h. Ports 5970-5979.

## Goal

Levi, 2026-11-05: "These junctions need to appear as though they are one whole fused seamless
unit." K1218 S2-S7 (master e4075024) made the maze's junctions read that way. The cursive text's
forks don't: at the i fork in "ai" and at the a's two attachments (K836), a disc of a different
colour shows its round edge inside the stroke, and the arms' straight end cuts stick out of it as
a notch and a ledge (Run N's 3x crops, `.claude/probes/K1220/run_n/out/ai_xh3_ji0_normal_3x.png`
and `a_xh3_ji1_normal_3x.png` in the main checkout). Make every text fork read as one piece: no
disc edge inside, no notch or ledge where an arm's cut meets it, its crotch drawn by K830's corner
rule, at every letter that forks.

Run N's cause (`.claude/probes/K1220/run_n/SUMMARY.md`, and `## K1220` in `docs/ledger_notes.md`;
its line numbers are 02805d13's, so search by the code): a text arm shorter than 0.15 world is
dropped (`joinery.ts`, `if (len < 0.15) continue;`), so the fork writes no field record and falls
back to a disc on the host chain's axis, painted by the AXIS strip lookup, which blends no arm;
each arm ends in a straight perpendicular cap (`ribbon_mesh.ts`), and the wedge loop skips these
forks. N's leads (its task 4): real field records for text forks (a threshold at glyph scale, so
they take the maze's blend, strips, wedges and corners), or an AXIS disc that blends the fork's
arms and covers the cuts' corners. S1 stopped at a session's end and left 9 lines in `joinery.ts`
(branch `worktree-agent-a887c979ca2299b92`, 25a5c501, on an old base): a lead only.

Levi's calls that bind: K1119, v6.8 is the approved cursive, so no glyph's centreline, width or
join moves, only how a fork is filled and coloured; K1001, keep K830's corner rule
(`cornerRoundShare`: broad gaps round, narrow points sharp); K836, the a attaches to its
undisturbed oval, tangent. The maze's junctions keep K1218's look, and nothing away from a text
fork changes. Mode 0.

## Authority

Every technical decision is yours: the records, the threshold, the disc, the wedges, the caps, the
blend, the paint and its CPU mirror, the fan's geometry. No numeric gate: tests pin what you built,
they don't define done. When you find a cause, fix it; don't stop to report it. Where a call leaves
a look open, pick what reads closest to one fused unit and say what you picked. Re-freeze any pin
your change moves and name it in the commit message. If a fix would need a glyph's shape to change,
say what it would take and take another way.

## Start

- Your worktree starts at master e4075024.
  `New-Item -ItemType Junction -Path node_modules -Target C:\Users\lsl\Repositories\knotmaze\node_modules`
- Tools: Run N's in `.claude/probes/K1220/run_n/` (`shoot.mjs`, `measure.mjs`, `proof.mjs`,
  `run_locked.ps1`, `crop.mjs`, `lib.mjs`, `png.mjs`, `vite.private-cache.config.ts`), and K1218's
  sheet and diff tools in `.claude/probes/K1218/s7/` and `s4/`. Copy any you use into
  `.claude/probes/K1220/s2/`. N's shots are from an old master: shoot today's master yourself.

## Done

1. A census of every text fork the cursive draws, at xh 2 and xh 3, on a word set holding every
   letter plus N's words (say which): how many write a field record, on master and on yours.
2. Sheets, nearest-scaled at zoom 4, rows master and yours, for N's stands (the i fork in "ai", the
   a's L and R, at xh 2 and 3) and every other letter's forks, at rest and in every state the
   text shows that reaches a fork. In `.claude/probes/K1220/s2/out/sheets/`.
3. A whole-frame diff of master against yours, at rest, for a text stand and for the maze's x4,
   loop and cross stands: only text forks change.
4. You viewed every crop at full size. Name any flaw you could not remove, and why.
5. `npm test` green after `git fetch -q origin` and a rebase onto `origin/master` (where only a
   pin's number conflicts, take master's side and re-freeze it to what your change gives).

## Rules

- PowerShell. Read code through the shell (Select-String, Get-Content ranges); the Read tool only
  right before an Edit, and to view crops. No helpers.
- Write only in your worktree. Output to `.claude/probes/K1220/s2/out/`; never `git add -f` a
  probe's outputs (a script may go in).
- Commit WIP on your branch at every milestone (each tool, each src change that renders), broken or
  not; never push; never edit LEDGER.md.
- Shots in real time (never `--virtual-time-budget`) under the perf lock (owner `K1220-S2`; wait
  for it inside one blocking command), at most two browsers, ports 5970-5979. A dev server's stamp
  is the SHA it started from: check the served code with a mark. Stop your servers.
- Out of scope (name it if a crop shows it; don't fix it): the glyphs' shapes and tails (K863,
  K1112, K1213, K1225), fire and collapse (K1210), the maze junctions' residuals (K1227-K1231), the
  pulse's timing (K1224), shader compile time (K1230).
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and each milestone); then
  commit WIP, append your handoff to this brief (after your final rebase) and report. A compaction
  is not a stop: re-read this brief and `git log`.

## Report

Short, in plain words: what you built; per fork, what you see against master; the sheets' paths,
with the two or three to show Levi first; the pins you moved; anything out of scope a crop showed;
the rebase; your last SHA. Commit messages carry the record. End with `Ledger items` and K1220's
handle fields (owner, branch, last commit, evidence, next).

## Handoff (K1220 S2, 2026-11-06)

**What it is.** On master, a visible text fork wrote no junction-field record. The records loop
drops an arm whose probe, 0.8 ctrl out, lies within 0.15 of J, and every glyph arm's probe does.
So each fork fell back to host-axis discs in the host chain's axis paint: the different-colour
disc. The a's flare step (`bodyFlares`, width 1.0 -> 1.48 at 0.41 fh from J) met those discs as
the notch and the ledge.

Four changes, all in `src/render/ribbon/joinery.ts`, all at glyph forks only:

1. `GLYPH_ARM_PROBE = 2` (9b9bcd24). A glyph arm reads its direction 2 fill half-widths along its
   arc. Every text fork now writes a full record, so it gets the field's blend, its wedges and
   K830's corners (`cornerRoundShare` is unchanged).
2. The glyph bridge (ae1ecfd4, 81377f0d). It applies at a glyph pair whose gap exceeds
   FILLET_MAX_WEDGE and whose arms step in width. A Hermite fillet in field material, with
   one-sided tangents, runs from the narrow arm's edge at 2 fh to the wide arm's edge just past its
   step. It fills the notch and the ledge without moving either stroke.
3. Covered flank points (cf2a7a10). At a glyph pair, a wedge flank point that the other arm's
   ribbon covers moves to that arm's true edge plus 0.05 fh. This removes the pale sliver of the
   spur's band in the narrow crotch.
4. The reveal gate (a9bc7061). A glyph arm's gate point (the record's J1) now sits fieldReach of
   arc out along the arm, at most at its end. It used to sit at 0.8 ctrl, which on a glyph lies
   within 0.15 of J. The record's fans reach about 4.7 fh along every arm, so they now wait until
   the reveal has drawn that far.

No glyph centreline, width or join moves. The maze junctions are untouched (see the diffs below).
No pin moved: `npm test` is green as-is after the rebase onto 73e0071d (217 files and 2879 tests
passed, 9 skipped).

**The look I picked**, where the calls leave it open: the field record's blend with K830's
corners at every text fork, the bridge across the a's flare step, and covered flank points at the
arm's edge.

**Census (Done 1).** Tool: `.claude/probes/K1220/s2/census.mjs`. Words a, i, ai, ia, aa and ii at
xh 3 and xh 2: 30 text forks.

| | records | arms per record | at the 20 visible a forks |
|---|---|---|---|
| master | 4 (the i forks at xh 3 in i, ia, ii) | 2 of 4 | none |
| mine | 30 / 30 | every arm | all 20 |

- The 10 i forks are hidden by `taperHideJn` on both builds: the tapered root draws them, with no
  fans. So the i fork in "ai" reads the same on both.
- Run N's "ai xh3 ji0 (i fork)" is in fact the a's L. The fork indices in "ai" are: ji 0 = the
  a's L, ji 1 = the a's R, ji 2 = the i fork. In "ia" they run the other way: ji 0 = the i fork,
  ji 1 = the a's L, ji 2 = the a's R.

**Sheets (Done 2)**, in `.claude/probes/K1220/s2/out/sheets/`.
- Each sheet has two rows, master then mine, at zoom 4.
- `sheets_all.ps1` builds them from `shoot.mjs`'s shots. The shots ran in real time, headed,
  under the perf lock, with `phw=0` and `fw=0`, and each served build was checked by its mark.
- `<word>_<xh>_ji<n>_A.png`, for a and ai: rest, nofans, the fork's pluck at 0.1 s, and the flow
  at t 2.5 and t 4.1.
- `_B.png`, for a and ai: the trace reveal at 20 / 40 / 60 / 80%.
- `_R.png`, for i, ia, aa and ii: rest and nofans.
- Show Levi first: `ai_xh3_ji0_A.png`, `ai_xh3_ji1_A.png`, `ai_xh2_ji0_A.png`.
- On mine, every a attachment reads as one piece: no disc, no notch, no ledge. nofans is identical
  on the two builds.
- The i forks are the same on both builds, notch and ledge included (see Flaws left).

**Whole-frame diffs at rest (Done 3)**, from `absdiff_all.ps1`, written to `out/diff/`.
- On the text stands, every changed pixel lies within 5 fh of a text fork, and none lies beyond.
- The record's field reaches max(1.25 cr, 2) fh + 0.25 along each arm, about 4.7 fh. At a 3 fh
  radius, 1457-4970 px sat just past it.

| stand | changed px, xh 3 | changed px, xh 2 |
|---|---|---|
| a | 43213 | 41712 |
| ai | 42813 | 41799 |
| ia | 40682 | 41293 |
| aa | 82162 | 82869 |
| i, ii | 0 (the forks are taper-hidden) | 0 |
| maze x4, cross, loop | 0 | |

**The reveal (the `_B` sheets).** In the first B sheets, every joint piece (master's discs and
mine's fans alike) showed over strokes the held reveal had not drawn. That was a probe artifact:
the FX clock, which the joint gate reads, kept the load wait's wall time. `shoot.mjs` now pins it
for each frame through the renderer's `revealPin` (de39f155).

Re-shot, fix 4 holds: mine's fans never show over undrawn strokes. Two looks remain:
- Between the strokes meeting and the gate opening, mine shows the bare ribbons. On "a" at xh 3
  this is the 40% frame: the notch, and a straight seam where the bowl meets the stem. Master shows
  its disc and the notch there. From 60% the fork is fused.
- On "ai", at the a's L at 20% (xh 3 and xh 2), the gate is open while the just-drawn strokes still
  wear the trace's bright tint. The fans show the settled paint instead: a darker band across the fork.
  Master's disc shows the same darker band. Inferred from the sheets, not attributed: the joint
  pieces' paint does not follow the trace's tint on either build.

**Flaws left.**
- The i forks: 10 of the 30, the i's fork in i, ai, ia and ii (ji 2 in "ai";
  `ai_xh3_ji2_A.png`). They still show a notch on the left edge and a ledge on the right, on both
  builds. `taperHideJn` hides their joint pieces (the tapered root draws the joint), so mine's
  record is never drawn there.
  - To make them one piece, draw the joint there: un-hide the record's fans at a tapered i fork
    (mine writes the record), or bridge the root's width step as fix 2 does for the a.
  - Not built: I read this crop at the end of the stage.
- ai at xh 3, the a's L: a soft bend of about 12 degrees where the stem's right edge meets the
  spur's. It is K830's corner between two arms of different widths. Removing it means moving the
  corner rule or a stroke, which the calls keep.
- The crotch-end dark V on the casing band at the a's J in "ai". It is the gap mask's slot there
  (K580 s5's unidentified slot), not the fork's material, and it lies past the fans. I did not
  attribute it in this stage's time.
- ia at xh 2, the a's R (ji 2): a jog of about 1 frame px in the far-side edge at the flare step.
  It shows at xh 2 only.
- The reveal's two looks above: the bare-ribbon moment before the gate opens, and the fans' settled
  paint under the trace's tint.

**Next.**
1. Levi looks at the sheets.
2. The i forks' notch and ledge (the first flaw above), which still stand against the goal.
3. The crotch-end V: identify the gap-mask slot at the a's J in "ai" (K580 s5). Then either give
   the fans the casing mask there, or end the crotch wedge's edge on the band's edge.
4. The reveal: fade the fans in from the gate, or gate them per arm, and give the joint pieces the
   trace's tint.
5. The xh 2 jog.
