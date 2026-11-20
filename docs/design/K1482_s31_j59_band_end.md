# K1482 stage 31: j59's step, by ending the under bands at the over band (K1526; Claude agent stage)

**Queued behind stage 30** (`docs/design/K1482_s30_t81s_inleg.md`): one code agent at a time in
`src/render/gpu_field/`. Start only when the coordinator says the stage before it has landed or stopped.

Levi, 2026-11-19, on K1490: **"Fix the wedges and notches, accept the slivers."** His bar: at junctions and
under-tail ends the over thread's outline runs on unbroken, with no dot, stub, wedge, tick, notch or sliver.
j59 is one of the 14 sites he named on link A (`The sites` in `docs/design/K1482_s20_wedges_notches.md`; his
sheets `.claude/probes/K1490/out/k1490_wedge.png` and `k1490_notch.png` in the coordinator worktree
`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-af52b1a95572b7c1a`).

## The site

**j59** is at 1060,1512 on the 3200x1800 frame of link A; the step is near 1037,1512. At the top of the
junction's inner leg the outline widens in a step: a second band lies along the first for a few pixels and
ends square. Picture: the `j59` row of `.claude/probes/K1482/cards/s29_landed.png` (coordinator worktree;
before = now, stage 29 did not move it). The stub **t23e** (1050,1521; a named wedge site, K1528) is part of
the same place. The white sliver beside the step is one Levi accepted: it stays, and its border stays whole.

Stage 29 found what the step is and no fix. Read `### Handoff K1482 s29`
(`docs/design/K1482_s29_corner_side_wedge.md`) and the lore it added to `.claude/rules/render-gpu-field.md`
first. In short:

- The step is chain 43's band plus chain 23 (the stub t23e) running ALONG chain 7's outline, not across it.
- Burying the under band inside the over pass's tube along that run (1bb6f9c19, taken out again in
  e66fe43b4) opened the white sliver's border in the middle of the strip. Do not bury along the run.
- The same rule with a tolerance left a flag tick and a hairline at t84e and removed a whole outline to its
  left.
- A round cap at the run's end leaves knobs.

**The untried step:** end chain 43's and chain 23's bands where they MEET chain 7's band (one cut across each
band at the meeting line), and leave everything along the run alone. Build it in the CPU copy first, where a
try costs seconds: stage 29's tools are in
`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-af74bc71e7b05839a\.claude\probes\K1482\s29`
(`hb29.ts`, `spine29.ts` with BOX, `mimg29.ts` draw the CPU copy around a point; `capseq28.ps1`, `diff28.ps1`,
`sheet27.py`, `run29.ps1` capture, diff, make sheets and run the guards); copy what you use, change nothing
there.

Link A is `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (hash fff8c9e5). `&tlk=border` draws the
outlines only, `&tlk=fill` the fill; `&gfk=0` turns the second corner try off. A Node build leaves it off
unless env `GF_KRETRY=1` (K1536): set that for a Node probe and for the bar, and clear it before `npm test`.

## The goal

On link A as it loads: the step at j59 is gone, the inner leg's outline runs at one width into the junction,
and the sliver's border is whole; t23e's stub is no worse (say so if the same rule mends its half strokes);
the fill does not move. With `&gfk=0` nothing gets worse. Nothing else on link A or on the bar's four mazes
gets worse: a clean round turned into a point, a clean point rounded, or an outline that loses ink at a joint
corner is a failure. You own the technique: if the band-end step fails, say what it did at the site and try
the next thing. A stage that ends with more diagnosis and nothing in `src/` has not reached the goal while
time remains. t84e and j47 are NOT this stage's: leave them.

## Done

- **By eye**: j59 and t23e, context crop and detail crop, today | new, as it loads and with `&gfk=0`,
  contrast stretched (the outline is only about 15 levels darker than a pinhole inside it).
- **Link A**, loads of one state and one view (compare the image hashes of repeat loads first, K1539; report
  the floor), made **before** you commit anything as a fix: every place outside j59 where the border look
  changes at a luminance step of 1 is counted, the places that only gain or only lose ink counted separately;
  the ten largest are on a sheet (surrounding threads with a red box, then the box closer; today | new) and
  judged by eye; the fill look 0 px, or each place named.
- **The bar** on your tip: `.claude/probes/K1436/k1436_bar.ps1`, `STRICT=1 -NoPerfLock`, scenes
  `ring,def,muse_hash,g41_user_tw64`, `-Base` master's SHA at your start, `-Tag k1482s31`: new 0, grown 0.
- Under the perf lock (`scripts/perf_lock.ps1 -MaxWaitMin 60`, each wait in ONE blocking command): `hold.mjs`
  60/60 on link A, as it loads and with `&gfk=0`; `.claude/probes/K1482/s15/panelopen.mjs`; both dragchecks.
  `npm test` green, run WITHOUT the lock (a pin that moves is re-frozen in the same commit and named in its
  message). Each guard's whole output kept in a file.
- Three or four lines of lore in `.claude/rules/render-gpu-field.md`.
- The commits on your branch, in landing order, each green.

## How to work

`git merge --ff-only origin/master` in your worktree first. Ports 6230-6249, profiles `$env:TEMP\k1482s31-*`,
probe directories `.claude/probes/K1482/s31` and `.claude/probes/K1482/out/s31` (untracked: do not `git add`
raw captures or dumps). Pass `&snd=none` in every look capture; never Chrome's `--virtual-time-budget`. The
border look under gf is gf's own: today's renderer's border strokes are no bar. Read code through the shell
(`Select-String`, a range of `Get-Content`); use the Read tool only on a file you are about to edit. No
helpers. Commit WIP at every milestone, broken or not, and add two or three handoff lines here each time.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock from your start (`Get-Date` at the start
and at each milestone), whichever comes first; start the guards by 75 minutes in. A compaction is not a stop:
re-read this brief and `git log`. On stopping: commit WIP, append `### Handoff K1482 s31` here, commit, and
report: the commits to land by SHA in order, what changed at the site by eye, the numbers, each guard's result
with the path of its whole output file, the sheets' absolute paths, a `Ledger items` list and K1482's handle
fields. Never push, never edit `LEDGER.md`.

### WIP K1482 s31 (05:00)

- The mirror rule (eval.ts runT): a group's side band and vertex cap narrow to W*t where a lone piece over it (z up 0.05-0.2) faces the outline point across a gap under 5 aa (t 0 at 1 aa). Mirror A/B at j59 (`.claude/probes/K1482/out/s31/mi31_c.png`): the step and the cap's knob gone, the sliver untouched; a small 43:+1 tick at 1039-1044,1502-1507 and a blunt pink end at about 1024,1523 remain.
- GLSL port as text in retryForm (RUNT, RT_FACE, RT_VTX): gfk=0 and home-off programs unchanged. Not yet looked at on the GPU.
