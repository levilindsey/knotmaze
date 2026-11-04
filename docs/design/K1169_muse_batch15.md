# Muse batch 15 (K1169)

Claude starts these runs through Paseo, one run at a time, after batch
14 (`docs/design/K1161_muse_batch14.md`, K1161) finished. Each run is a
fresh Muse agent that reads this brief, does its run's tasks, and
stops. Claude reviews each run on master afterwards and closes K1169.
Claude wrote this brief from Levi's answers of 2026-11-03 (there was no
drafting run), so the runs are A to C, in that order:

- Run A, K1139 S2: the choice pulses as one light field over the lit
  tree, running toward you on the paths behind you (Levi's Q2).
- Run B, K778: an Undo button beside the extra rules, with a 0-5 slider
  for how many undos a run gets.
- Run C, K1162: the doc errata the ask-card pass found.

Every task here is decided by a unit test, a probe table or a check
against the primary record. None needs Levi. Run A is junction work,
which Levi's call of 2026-11-03 lets Muse take. No run changes physics
(the simulation), the cursive, the junction fan's shader (K1139 S3b),
or anything in `src/render/field/`, `.claude/probes/K1040/` or
`docs/design/K1040_s3f_draw.md`: K1040's label pass (S3f) runs beside
this batch in a Claude worktree. No two runs touch one file, except
that Run A may touch `src/main.ts` only to hand a new hook its deps
(Run B owns the undo code there); each run starts from the latest
master.

## How to work

Batch 8's "How to work" applies unchanged: read it in
`docs/design/K1131_muse_batch8.md` (its ten rules and the paragraphs
after them, which send you on to `docs/design/K1050_muse_week.md`)
before anything else. Read K1169 wherever it says K1131, and K1137's
rule 11 and K1141's rules 11 and 12 wherever they apply: rule 11 (a
re-measurement copies the original stand's link verbatim, read from
the old probe's source, not from a summary of it, and its table names
everything it adds or changes) wherever a stand is copied, and rule 12
(dependencies: no run should need a new or changed package; if one
changes anyway, `npm audit` must report no high or critical advisory
afterwards, and a security fix is taken even when it was published
less than two weeks ago) wherever a dependency moves. Each run below
names its ports.

After each run, update K1169's handle, naming the next run:
`ledger.mjs handle K1169 --last-commit <sha8> --next "Run <X> done; next Run <Y>"`
(after Run C: `--next "Run C done; batch 15 complete, Claude reviews and closes K1169"`).

Edit no ledger file by hand (`LEDGER.md`, `docs/ledger_done.md`,
`docs/ledger_notes.md`). `ledger.mjs` runs the commands this brief
names; any other change to an item's text goes in your report as the
item's ID, the file, the current line and its replacement, and Claude
applies it.

## Run A · K1139 S2: one light field over the lit tree

Read first: `docs/design/K1139_pulse_junctions.md` whole. Section 1
says how a pulse is made and drawn today and what goes wrong at a
junction; 2.1 is the model this run builds; 2.6 covers the paths
behind you and your own junction; 4 holds the unit tests (T1-T10), the
probes (P1-P10), the stands and the hooks; 5's S2 entry gives the
files, the done test and the risks; 6 records Levi's answers; the
appendix lists the harness. Then `docs/design/K1139_s1_brief.md` (how
stage 1 ran the harness), and the code: `litArms` in
`src/game/route_plan.ts` and every caller of it; the pulse declaration
in `src/render/fabric_maze_renderer.ts` (the `litArms` loop, about line
4087); `pulseKey` and `pulseBorn` in `src/render/ribbon/paint_state.ts`
(the fade-in, about lines 505 and 838); `test/game/route_plan.test.ts`;
and `src/app/probe_hooks.ts`, where the `__knot*` hooks live.

What S2 is (the plan's words win where this summary differs). A
Dijkstra over the walk graph's lattice lengths, rooted at your
junction, gives the lit tree. Each declared item is one walk edge of
the tree, with its drawn span (the live drawn length) and `dist0`: the
sum of the drawn spans along its tree path, quantized to 1e-3, so the
next arm's light starts exactly where the last arm's ended. Arms into a
junction inside the reach carry `cont`, your choices included. Behind
you the light runs inward, toward you (Levi's Q2). With this alone the
fan keeps its bars, so S2's look at a fork is option B's; Levi chose A
(the light splits along the paths), which arrives with S3a and S3b's
bands. Not in S2: the two-ended form of an arm lit from both ends, and
self-loops (S4, T6 and T7; in S2 such an arm keeps the one parent the
tree gives it); the bands (S3a, T10); your own junction's lead and dip
(S5, which shows Levi before it lands); and `kPulseV` and its GLSL
twin, which `test/render/paint_gameplay.test.ts` pins and S2 leaves
alone.

Tasks, in order (ports 5620-5639, K1139's own: its harness defaults to
5620 through `K1139_HOST`, and no other K1139 work runs during this
batch):

1. The before record, from today's master, before your first change.
   Start the dev server with the harness's config (`npx vite --config
   .claude/probes/K1139/vite.private-cache.config.ts --port 5620
   --strictPort --host 127.0.0.1`). On the five stands of 4.4 (links
   and moves copied verbatim from the plan's table and the harness),
   record P1, P2, P6 and P7 with `table.mjs`, P8 where today's build
   allows it, and P9 with the flow on. Shoot today's strips and
   kymographs into `.claude/probes/K1139/out/s2/today/` with
   `strips.mjs` and `kymo.mjs`, `K1139_INJECT` unset, through a batch
   file run by `run_locked.ps1 -Batch` (it takes the perf lock; wait
   inside that one command). Section 1.4's boundary table is the
   plan's; this record is yours, from the same harness as the after.
2. `src/render/pulse_path.ts`, pure (no Pixi, no DOM), as 4.1
   specifies. In: the walk graph, your junction, the arrival, the
   reach and a drawn-span function per edge. Out: the items (walk
   edge, drawn span, `dist0`, `cont`, inward, tree parent). Write
   `test/render/pulse_path.test.ts` with T1-T5, T8 and T9 on small
   invented graphs: a fork, a chain of junctions, a 4-arm junction,
   the reach cutting an arm, the region behind you, and a cycle (one
   parent per arm; the two-ended form is S4's).
3. Declare from it in `src/render/fabric_maze_renderer.ts`: your
   choices get `cont` and drawn `dist0`; behind you, inward. The spans
   come from main's paint data (the mirror's positions under the
   physics worker); no worker message changes. Re-declare when any
   span drifts past 1e-3 (P9), and keep `pulseKey` on your junction so
   a refresh does not reset `pulseBorn`: the fade-in restarts only when
   you move.
4. `litArms`: retire it from the pulses. If other callers remain, keep
   it for them and fix its comment (it says "world arc"; its length is
   lattice). Update `test/game/route_plan.test.ts` to match.
5. The hooks of 4.4, registered beside the other `__knot*` hooks:
   `__knotPulses()` (the declared items with their walk edges, drawn
   spans, `dist0`, `cont`, inward and tree parent) and
   `__knotPinClocks(t)` (the pin recipe in one call: `advanceClocks` a
   no-op, then `paintClock`, `pulseBorn`, the background and the
   explore clock).
6. The after record: P1, P2, P6, P7, P8 and P9 on the five stands,
   from the build (`K1139_INJECT` unset), and the strips and
   kymographs into `.claude/probes/K1139/out/s2/s2/`. Then a sheet per
   stand of cross, src and x4, today above S2, in
   `.claude/probes/K1139/out/doc/s2_<stand>.png` (`sheet.mjs`), tracked
   with `git add -f`, as is the batch file.

Done:

- T1-T5, T8 and T9 pass, and `npm test` passes. No golden pin moves
  (`test/physics/byte_identity.test.ts`, the K87 pin, the golden
  dailies, `paint_gameplay`'s `kPulseV`): the plan says S2 touches
  none, so if one moves, stop and report it instead of re-freezing.
- On the five stands: P1 at most 0.01 at every junction (today
  0.18-1.00); P2 zero within 1e-3; P6 and P7 pass; P8 within 2/255;
  P9's largest phase step at most 0.01 over 10 s with the flow on, and
  `pulseBorn` unchanged across that run's refreshes (the fade-in does
  not restart).
- The three sheets are in `out/doc/s2_*.png`.

Report: the before and after tables per stand (P1, P2, P6-P9), the
unit tests, the sheets' paths, what became of `litArms`, and the
commits. Then update K1139's handle (it stays In progress; S3a is
next):
`ledger.mjs handle K1139 --owner "nobody since <yyyy-mm-dd hh:mm> (S2 done in Muse batch 15 run A)" --last-commit <sha8> --next "S3a: pulse bands, CPU side (the plan's section 5); S2's record in .claude/probes/K1139/out/s2/" --brief "docs/design/K1169_muse_batch15.md (Run A); the plan: docs/design/K1139_pulse_junctions.md"`

## Run B · K778: an Undo button beside the extra rules

Read first: in `src/main.ts`, `undoMove` (about line 2377), the
`canUndo` and `undo` deps handed to the rule-loss banner (about line
1052), and `saveAttempt` (about line 1611); `src/app/rule_loss.ts`
(the Stranded banner, whose Undo replays your moves minus the last);
the rules row in `src/ui/maze_hud.ts` (the `rules` fields at about
lines 88 and 583, and `entry("rules", ...)` at about 758); the K138
params in `src/ui/url_state.ts` (their comments from about line 892,
their defaults from about 1310: every extra rule is off by default);
`CODEC_PARAMS` in `src/ui/param_codec.ts` (its header is the link
format's spec: a new param is appended); the `fRules` folder in
`src/ui/tweakpane_panel.ts` (about lines 2068-2159);
`src/ui/daily_link.ts` (the exempt playback preferences);
`test/ui/param_codec.test.ts` (the table pin) and
`test/ui/url_codec.test.ts`; `docs/design/K138_s4.md` (lines 52, 228
and 479 say there is no Undo control); and
`docs/design/K80_gameplay_additions.md` line 70 (K80's Undo note).

Levi, 2026-11-03: "Undo button beside the rules (let's have a slider
param to let us configure whether you get zero, one, two, ..., 5
undos)". The tasks, in order (ports 5560-5569):

1. The param. A design param: it changes the game, so it travels in
   the link and is not one of `daily_link.ts`'s exempt playback
   preferences. It sets the undos a run gets while an extra rule is
   on: an integer from 0 to 5, default 1. Append it to `PARAM_DEFAULTS`
   and `CODEC_PARAMS` (name it in the style of the K138 params around
   it, e.g. `ruleUndos`), and add a slider to the `fRules` folder, step
   1, with help text in the panel's voice: what it does, and that 0
   hides the button.
2. The button, in the HUD's rules row beside the rules text: "Undo"
   with the count left (e.g. "Undo · 1"). It shows only while an extra
   rule is on, the param is above 0, undos are left in this run, there
   is a move to undo, and `canUndo()` holds (no minotaur, fire or beat:
   only then do the taps hold the whole state). A tap calls the same
   `undoMove()` the banner's Undo calls and spends one undo. Build and
   style it as the HUD's existing controls are built; add a style only
   if none fits.
3. The count belongs to the run: a restart, a new maze and a new design
   refill it. It is not saved: only the daily's attempt is saved
   (`saveAttempt` returns unless `dailyAttemptLive()`), and a daily
   runs on today's defaults, where every extra rule is off. Say so in a
   comment beside the count.
4. The Stranded banner is unchanged: its Undo shows as it does today
   and does not spend the button's undos (Claude's call; Levi is told).
5. Moves and stats: the button's undo does exactly what the banner's
   does today to the clock, the moves, the walked distance and the
   stars. Read what that is and name it in the report. Don't change it
   in this run; if it rewards undoing, say so, and Claude files a
   residual.
6. Docs: `docs/design/K138_s4.md`'s three lines and K80's note now say
   the button exists (K778) and what it does.

Tests: the codec table pin with the new key appended (re-freeze only
the pins the new key moves, and name each in the commit message);
`url_codec.test.ts` (a link carrying the param round-trips; at the
default it is left out of the link); the button's rules as unit tests
wherever the HUD's logic is testable (it shows and hides on each
condition of task 2; the count spends and refills); `npm test` passes.

Pictures for Claude, in `.claude/probes/K778/` (tracked with
`git add -f`): the HUD with the button on a free-play link with ice
on, at the desktop window's size and at 412 x 915 CSS px
(`hud_undo_desktop.png`, `hud_undo_phone.png`), and the same two after
the one undo is spent, with the button gone (`hud_spent_desktop.png`,
`hud_spent_phone.png`). Shoot in real time (`scripts/diag_screenshot.mjs`
or a headed browser), never with `--virtual-time-budget`.

Done:

- The slider sets 0 to 5 undos (default 1); the button shows and spends
  as task 2 says; the banner is unchanged; the docs say so.
- The tests pass, and every pin that moved is named.
- The four pictures exist.

Report: the param's name and codec index, the pins re-frozen, what an
undo does to the clock, moves and stars (task 5), the pictures' paths,
and the commits. Then close K778:
`ledger.mjs done K778 --commit <sha8> --what "an Undo button in the HUD's rules row; <param> 0-5 (default 1) sets how many a run gets; the Stranded banner's Undo unchanged"`.

## Run C · K1162: the doc errata

Read first: `## K1162` in `docs/ledger_notes.md`, fifteen numbered
errata. Six agents found them on 2026-11-03 while writing ask cards,
and nobody has re-checked them. Check each against its primary record
(the code, `git log` and `git show`, the doc it names) before changing
anything.

Commit IDs: the history rewrite of 2026-11-03 (K1164, 82aa5072)
remapped every commit ID in the docs. An ID that doesn't resolve
(`git cat-file -t <id>`) may be an old one: look it up in
`.claude/probes/K1164/commit-map` (untracked, on this machine; one
old-new pair of full IDs per line) before calling it stale.

What you may change: design docs under `docs/design/`, the rules lore
under `.claude/rules/`, and files under `.claude/probes/`. Item 14
goes in `docs/design/K1142_phone_guard.md`: the phone stays on its
charger, unlocked and awake, through the guard's 120 s quiet window.
Item 15: `git rm` a tracked stray only when nothing references it
(search the docs, the rules and the probe scripts); for a picture no
script makes, say in the doc that shows it how it was made, from
`git log`, or report that you can't tell. Never change `src/` or
`test/`. Texts in a ledger file are Claude's to apply (How to work):
give each as a line in the report.

Done: each of the fifteen has a verdict in the report: fixed (the file
and the commit), a line for Claude, or "the claim was wrong" with the
record that shows it. `git diff --stat` over your commits lists no
file under `src/` or `test/`.

K1162 stays open: Claude closes it after applying your lines. Ports:
none (no server).

## Left out on purpose

- K1040's label pass (K1097, S3f): Claude's lane, in a worktree beside
  this batch.
- K1139 S3a to S6: after S2 lands and is reviewed; S5 shows Levi before
  it lands.
- K1168 (K144 stage 1, sign-in and synced results): it needs a Google
  OAuth client, and the Cloudflare Worker and D1 database Levi sets up
  first.
- K1163 (the rounding veto) and K1166 (GitHub Support, the laptop):
  Levi's.
- Batch 14's sources (Approved, then the Residuals after K1160) were
  not read for this batch; batch 16's drafting run starts from them.
