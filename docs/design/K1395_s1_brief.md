# K1395 stage 1: rp=gf's reveal carries the reveal's colours

Read first: `docs/design/K1383_s1_gf_reveal.md` with its handoff, `docs/design/gf_default_gate.md` gate 5,
and ledger items K1395, K1472, K1459, K1431 (`node $HOME/Repositories/claude-config/tools/ledger.mjs show
<ID> --repo .`). Base: `origin/master`.

## Goal

Under `rp=gf` the reveal draws the widths and fronts but not its colours: the burn tint, the rainbow stripes,
the materialize alpha, the rainbow's swell and its white bulb. Today's look draws them (`src/render/reveal.ts`,
`paint_glsl.ts`, `appear_fx.ts`). Levi's bar: the new renderer is finished before it replaces today's, so its
reveal must show what today's shows, in every appearance mode. Today's reveal on the same link is the
reference for colour and timing; gf's own thread shapes, borders and gaps stay as they are.

## This stage

Carry the reveal colours into gf, one mode at a time, starting with the mode that differs most. You own the
technique. Files: gf's reveal path in `src/render/gpu_field/` and what it reads; keep out of `gf_look.ts`'s
gap pass (`lkBall`, `lkCut`, `lkGap`), `eval.ts` and `gf_glsl.ts`'s junction rule (another agent works
there); if you must touch them, stop and report. Today's renderer stays byte-identical (the golden tests).

## Done

1. Each mode you finish: src, tests, `npm test` green, `npm run build` passes, every re-frozen pin named.
2. For Levi, per mode: one sheet of frames at the same reveal times, `today | gf before | gf now`, on his link
   `?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1`, large enough to read, viewed by you. Real-time captures only
   (`scripts/diag_screenshot.mjs` style, the perf lock through `scripts/perf_lock.ps1`, ports 5630 to 5634).
3. With the reveal finished (`am=instant` too), gf's settled picture equals master's capture pixel for pixel.
4. A list of the modes done and not done, with what each still lacks.

## How to work

`Get-Date` first. PowerShell. New worktree `...\worktrees\k1395-s1`, branch `k1395-s1`, from `origin/master`;
`node_modules` as a directory junction to the main checkout's (never `npm install`). Read code through the
shell; the Read tool only just before an Edit, and for images. Write only inside your worktree. Commit WIP at
every milestone (`git add -f` for probe tools, never their outputs). Never push, never bare `git stash`,
never edit LEDGER.md, never touch the phone, no Chrome `--virtual-time-budget`. Helpers on sonnet, mechanical
work only; looks are yours.

## Stop rule

Stop when every Done holds or after 2 h of wall clock, whichever first; finish and commit whole modes rather
than leave one half done. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit
WIP, append `## Handoff (stage 1)` here, commit, and report: verdict first (safe to land or not, which
modes), sheet paths, a `Ledger items` list and the handle fields.

## Handoff (stage 1)

Stopped at the wall clock (20:22 to about 21:50, 2026-11-25). One src change, safe to land: 25103bdce.
No mode is done.

**Landed on the branch.** gf drew the rainbow's six stripes mirrored across the thread: `lkRainbow`'s
side was `0.5 + 0.5 * sd`, with sd measured along the left normal (-t.y, t.x), and today's
`kRainbowBlend` reads `vUV.y`, which `ribbon_mesh.ts` sets to 0 on that same left side (it writes the
left vertex, c + n w, first with uv.y 0). Now `0.5 - 0.5 * sd` (`gf_look.ts`, the label site; the gap
pass, `eval.ts` and the junction rule are untouched). `npm test` green (260 files, typecheck included),
`vite build` of 25103bdce green, no pin re-frozen. Rest, master gf against this build, clocks pinned
(`__knotPinClocks(100)`) and the view bit-still: 0 px under `am=instant` and 0 px after the rainbow
reveal ends (a first load settled on a view 2.4e-6 off in scale and read 269 px; a reload on master's view read 0).

Where both renderers colour a pixel (max - min channel > 40), the rainbow's mean max-channel difference
from today, gf before -> gf now: f1 94 -> 44, f2 111 -> 48, f3 114 -> 54, f4 104 -> 48, f5 101 -> 33,
f6 43 -> 13, f7 70 -> 18 (`sat.py`). The f5 crop shows today's stripe order on the swept thread.

**What is still off, every mode: gf colours whole segments today does not.** gf has 35-60% more
FX-coloured pixels mid-reveal (sat.py coloured count, today -> gf: comet f3 44.7k -> 73.8k, f4 83.7k ->
123.6k; levi f4 39.7k -> 64.2k; rainbow f4 94.4k -> 124.0k; dust f4 38.1k -> 53.8k; roots f4 66.8k ->
94.6k). Where both colour, the colour itself agrees within 4-11 levels on average for
levi, dust, roots and comet. Ruled out, measured on the same pinned state in both renderers: the reveal
masks and widths (`widths.mjs`: every chain's shown fraction and mean width equal), the clocks (t 3.3919
and fxNow 1.5418 in both at comet 0.4), which chains have their FX live (`overlay.mjs FX=1`: 74 live, 5
done, 7 hidden in both) and the chain geometry on screen (0 px apart over 16,144 points). So the extra
segments sit inside chains whose FX are live in both: suspect `GfFxTable`'s per-sample bake (the CPU
mirror `kFxColor` per sample: the settled-slot test `uKFx.z >= kWall(kS(c.idx+sl).w)+kFxTail(st)`, the
ignition ahead of the front, or the interpolation between samples) against today's per-pixel kFxColor,
or the solidity `max(glow, fxHere ? alpha : 0)` spreading along the label. Not confirmed.

A second, smaller gap: gf's border alpha is thresholded from alpha-scaled ink (`(min(ink/m,1)-0.36)*3.5`,
a steep ramp over alpha 0.36-0.65), where today's stroke goes linearly with the materialize alpha. Fixing
it means carrying alpha to the composite separately; that sits beside K1604's gap code, so not touched.

**Modes.** levi (the link's own mode), rainbow, dust, roots, comet: none done; each lacks the extra
segments' cause (above). burn (`am=trace-burn`) was not captured this stage. Rainbow also still differs where both colour (mean 13-54 levels). The
mid-reveal border ramp applies to all the materialize styles (dust, comet).

**Other findings.** gf never takes over mid-reveal in production (`gf_app` 1170-1177, K1472 s3) unless
`__knotGfOpts.midReveal`: every sheet here forces it. `inpage.mjs` (today's layers shown on a gf page) is
not a valid method: under gf today's layers draw no ribbons. `sheet.py` crashes on `instant` (no frames).

**Next.** (1) On one chain at comet f3, dump GfFxTable's per-sample alpha and solidity beside a GPU
readback of today's aM (a debug view writing aM), and find where gf's alpha is 1 and today's 0; fix the
bake or its interpolation. (2) Then carry the materialize alpha linearly to the border composite. (3) Re-run
`run.ps1` per mode and `sat.py` (coloured counts should meet, both-coloured means fall to a few levels).

**Evidence** (`.claude/probes/K1395/s1/`, tools tracked, `out/` untracked): `run.ps1` + `pinsheet.mjs`
(per-mode pinned frames; env PINREST=1 adds a clock-pinned, view-still rest shot, NOFR=1 skips frames),
`sheet.py` (today | master gf | my gf), `sat.py` (coloured extents, XOR and agreement), `widths.mjs`,
`overlay.mjs` + `overlay.py`, `fxdone.mjs`, `cmp.py`. Sheets: `out/rainbow_sheet_whole.png` and
`out/rainbow_sheet_crop0.png` (today | gf before | gf now), `out/{levi,dust,roots,comet}_sheet_whole.png`
(today | master gf), `out/cmp_sat.png`, `out/cmp_fx.png`.
