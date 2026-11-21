# K1482 stage 42: t4s's inside corner, round (K1555)

Brief for one Claude agent (model opus), 2026-11-21. Render work in `src/render/gpu_field/` (the mirror
`eval.ts` and the shader `gf_glsl.ts` in step; `tables.ts`, `gf_pack.ts` and `gf_keys.ts` if the corner
records are where the fix belongs) and their tests. `gf_look.ts` is hands-off (a Muse run works there).
First real try at t4s: stage 41 spent its two hours on t81s and never reached it.

**What Levi asked.** t4s is on link A (`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`, 3200x1800
frame, border look `&tlk=border`), at (2172, 615): a square inside corner. Levi, 2026-11-20: "this would be
nice to round out, but is not too critical of the fix becomes too difficult to make or too costly".

**What stage 41 left** (`### Handoff K1482 s41` in `docs/design/K1482_s41_step_corners.md`; read it first).
- t4s is not attributed. Its guess, untested: the concave corner of chain 4's lower-left outline against
  chain 66's lower arm near (2155, 620), with no fillet.
- Its rule, a round join wherever a piece's outline creases (local commit `deb148a96`, not on master, not a
  candidate), fired at 79 places on link A's capture and about 100 per maze in the mirror: every V tip is
  such a crease, t84e's turned into a knob with a dot. No angle told the wanted corner from the V tips.
  The lesson for you: a rule keyed on a kind of geometry fires wherever that geometry is. Prefer giving
  THIS pair of arms a corner through the machinery gf already rounds its corners with (the corner records,
  the second corner try) over a new term in the field, and prefer the rule that can fire at the fewest
  places.
- t81s's step corner is parked (K1559): do not work on it.

**Goal.** t4s's corner drawn ROUND, in the same hand as the rounded inside corners gf already draws on the
frame (look at a few first; `&gfk=0` shows the frame without the second corner try): an arc that meets both
border lines without a kink, the border stroke unbroken through it at its full width. The result is a
CANDIDATE: Levi decides, nothing is pushed.

**The cost line, binding (Levi's own).** Attribute first, by 40 minutes in: which pieces meet at the corner,
which term draws it square, why gf's corner machinery skips it. Then decide: if the corner can be had by
letting the existing machinery take this kind of pair, build it. If it needs a new term in every shader
variant, or the mirror shows the rule firing at more than about ten places a maze, STOP: write what it
would take and what it would change, and report. That is "too costly", and the corner stays as it is.

**The bar, binding.** At junctions and thread ends the outline runs on unbroken, with no dot, stub, wedge,
tick, notch or slit. Every thread at a place keeps BOTH borders, its width and its heading (never trade a
hook for a point; never thin, merge or drop a border). gf's border look is its own: do not move its strokes
toward the older render's, and do not use that render as a bar. Each place the rule changes must be as the
start draws it, or cleaner; one broken place means: not a candidate as built.

**Done.**
1. Start pictures of t4s (wide and close, as drawn and brightened) and the attribution, shown in the mirror.
2. The rule in the mirror and the shader; pins that move re-frozen and named; `npm test` green (with
   `GF_KRETRY` unset). A Vitest case if a scene fixture makes it cheap; else say so.
3. EVERY changed place against the start on the A mazes (A_3 = link A to A_d), listed by the mirror
   (`.claude/probes/K1482/s41/census41.ts` is the model: whole frame, rule on against rule off, places with
   px and the nearest site): the list with coordinates and px per maze.
4. Captures: link A in ONE session (start, candidate, start, candidate; compared only within the session;
   start against start and candidate against candidate must be 0 px), then the one maze with the most
   listed places if the lock allows. A sheet in stage 39's layout (`.claude/probes/K1482/s39/place39.py`)
   for EVERY changed place you captured, and a table: maze, coordinates, px changed, one plain line on what
   is drawn before and after. For t4s also the fill look (`&tlk=fill`) and `&gfk=0`. The other mazes are
   the coordinator's: the all-maze tool (K1578) runs on your candidate after you report. Name every maze
   you did not capture.
5. Cost, as numbers: the largest program's text growth in chars; its cold compile seconds against the
   start's with Run M's tools (`.claude/probes/K1552/`) only if the lock is free.
6. If there is a candidate and 30 minutes remain: guards with `GF_KRETRY=1`: `guards.ps1 -Tag s42 -Port <p>
   -Ref <your commit> -BaseRef <your start commit> -BarPort <p2> -OutDir .claude/probes/K1482/out/s42/guards
   -Owner <you> -NoBar`.

**Setup and rules.** `Get-Date` first. Your worktree starts from master: name its commit in the handoff
(it is the base of every comparison). Earlier stages' tools are on master under `.claude/probes/K1482/`
(`s39/`, `s40/`, `s41/`: capture sessions, diffs, sheets, mirror crops and censuses; `s41/kink41.ts` needs
stage 41's `cornerS`, which is not on master). Stage 38's, stage 40's and stage 41's candidates are not
landed and are not your start. Never push, never rebase, never merge another stage's branch. Ports
6380-6399. Outputs under `.claude/probes/K1482/out/s42/` (untracked; never `git add -f` them), tools under
`.claude/probes/K1482/s42/` (tracked: `git add -f` each by file name). A build of a commit:
`scripts/preview.ps1 -Port <p> -Ref <commit>`. One capture at a time, machine-wide: every capture and guard
through `scripts/perf_lock.ps1`. A Muse run (owner `muse-27V`) holds that lock a maze at a time, about five
minutes each, until about 02:00: wait for it inside ONE blocking command, never by checking turn after
turn, and leave no lock behind. `&snd=none` in every shot; never Chrome's `--virtual-time-budget`; Node
probes as `node scripts/run_node.mjs <entry.ts>`. Do not edit `LEDGER.md`.

Context is your budget (stage 41 compacted six times in an hour): commit at each milestone (WIP counts,
src included) and keep two or three lines under `### Notes K1482 s42` in this file as you go; print counts
and the worst five rows, never a whole table; send long output to a file under `out/s42/` and print its
tail; view pictures as crops no wider than 800 px, at most two a turn. Read code through the shell
(`Select-String`, ranges of `Get-Content`); the Read tool only just before an Edit. Clean up at the end:
previews stopped, no lock held, your temp folders and Chrome profiles removed; never touch
`$env:TEMP\k1482s27live-profile-20548` or another stage's folders.

**Stop rule.** Stop when the list is done, at the cost line, or 2 hours after your start (`Get-Date` at the
start and at each milestone), whichever comes first; then commit WIP, append `### Handoff K1482 s42` to this
file (what draws the corner, the rule, the numbers, the cost, what did not run, the sheets' paths, the
commit to build as the candidate) and report. A compaction or context size is not a stop: after one,
re-read this brief and `git log`. The report ends with a `Ledger items` list and the handle fields (owner,
branch, last commit, evidence, next).
