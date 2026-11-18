# K1450: rp=gf draws the maze only in flashes (Claude agent stage)

## What Levi saw (2026-11-17)

On `https://levi.dev/knotmaze/?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1`: "the entire maze blinks in and out
constantly." He could not judge the junctions or the fade at all. This blocks every look decision on rp=gf, so
it comes before all other gf work.

## What is measured (coordinator, live builds fc861de and 4106c49, desktop Chrome, real GPU)

Probe: `.claude/probes/K1444/blink2.mjs <url> <outPrefix> <profileDir> [frames] [gapMs]` (full-viewport frames,
rAF gaps over 300 ms, `__knotGf.stats`; keep one profile directory so the shader cache is warm on reruns).
Frames are in `.claude/probes/K1444/` of the coordinator worktree `agent-af52b1a95572b7c1a`.

- With rp=gf the maze is drawn in a few frames and missing in most. 30 frames at 400 ms on
  `?3&xp=off&am=instant&rp=gf` (today's defaults, whole maze, no reveal): the maze shows in frames 10, 11 and
  22 only; the rest show the background, the markers and nothing else. The same with `gfh=1` on or off, with
  the fill look and the border look, with `xp=off` and with the thread reveal, with `am=instant` and after a
  burn reveal. No WebGL context loss, no page error, `stats.fallback` empty.
- rp=outline on the same link holds the maze in every frame (`w_out_*.jpg`).
- On Levi's link (border look, `tlk=border`) the flashes also show no fill: dim outlines only
  (`w_h_fl014_01.jpg`), where rp=outline draws coloured threads with dark borders (`w_out_12.jpg`). With
  `&tlk=fill` on the same link the flashes show the coloured maze. Find out whether that is a second defect or
  the same one.
- A cold profile's first rp=gf load blocks the main thread for 116 s, then 38 s and 29 s more after the reveal
  ends (three program compiles, probably); a warm profile shows none. K1449 measured the same 110 s. Report
  what compiles there and what would cut it, but do not fix it in this stage unless it is the blink's cause.
- Not known: which commit started it. The agents' and Muse's probes all force their own frames, so none saw it.
  K1439's build is 963029e8; Muse batch 24's later gf commits are 72620196 (24G), 5394edc5 (24H),
  83de5130 (24I), and batch 25's 4106c490 (25A).

## Do

1. Reproduce on a local build of origin/master with the probe, then bisect with
   `pwsh scripts/preview.ps1 -Port <p> -Ref <commit> -Root <your own folder>` until one commit separates
   "holds" from "blinks". Diagnose from what the page does (which pass draws, what it clears, what the frame
   loop skips at rest), not from the commit's message.
2. Fix the cause in `src/`. Keep the fix as small as the cause allows: Muse batch 25 is editing
   `gf_look.ts`, `gf_pass.ts`, `gf_reveal.ts` and `gf_explore.ts` in the main checkout, and your branch has to
   merge with it.
3. The border look's missing fill, if it is a separate defect: fix it too, or report its cause and commit.
4. Add a guard that would have caught this: a probe under `scripts/` or `.claude/probes/K1450/` that loads a
   link the ordinary way (no forced frames, no hooks that draw), samples N frames at rest, and fails when any
   frame lacks the maze. Say in the handoff how Muse and agent briefs should call it.

## Done

1. On a local build of your branch, 60 consecutive frames at 250 ms, taken from 5 s after load, each show the
   whole maze, on all of: `?3&xp=off&am=instant&rp=gf`; `?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1` (after its
   reveal); `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`; and the first one during a 5 s thread drag.
   Report the frame sizes or a maze-pixel count per frame, and look at six frames yourself.
2. The border-look link shows coloured threads as rp=outline does, or the cause is reported.
3. The bisect result: the commit, and the mechanism in two or three sentences.
4. `npm test` green; flag-off shader text, keys and pack unchanged (`test/render/gf_home_glsl.test.ts`).
5. The guard of item 4 exists and fails on origin/master's build.

## How to work

- Work in your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5560-5579. Screenshots from a headed, real-time Chrome, never `--virtual-time-budget`. No performance
  numbers are asked for, so do not take the perf lock.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files). Never push. Never edit
  LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Helpers run on sonnet for mechanical work (the bisect's builds and captures), with this stop rule.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone),
whichever comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP,
append `### Handoff K1450` here, commit, and report: what holds, the frames' paths, the numbers, a
`Ledger items` list and K1450's handle fields.

### Handoff K1450

Stopped 2026-11-17 08:45 PDT (started 08:04), every Done item holding. Fix: 6779cecb (gf_app.ts only).

**Cause.** gf's composite is a Pixi `RenderContainer` whose callback returned whenever a framebuffer was bound
(`if (g.getParameter(g.FRAMEBUFFER_BINDING) !== null) return;`, adac76dd, K1362 s2). While a pluck ripple
lives, `pluck_ripple.ts` (K279) sets `filters = [ripple]` on the world container, so Pixi's
`FilterSystem.push` binds a pooled filter texture's framebuffer around the whole world, rc included, and
the composite skipped that frame. Music mode's auto plucks (`auto_audio.ts`, `rippleAuto`) keep a ripple
live most of the time, so the maze showed only in the gaps. `&prp=off` alone holds every frame (30/30).
Bisect: 648d3df9, 963029e8 and fe889b0d (gf's first working commit) all blink alike (26/30 frames bad), so
no later commit started it; it has been there since gf first drew. Found with `fbwho.mjs` (the stack of
the last framebuffer bind before the callback: `FilterSystem.push`).

**Fix.** Inside a frame bound for the canvas (`renderTarget.renderingToScreen`), the callback binds the
canvas, draws the composite (its shaders texelFetch the target at gl_FragCoord, so they need the canvas's
pixel grid), then rebinds the filter's framebuffer and viewport. Any other render target still gets
nothing. Residual: the ripple now draws over the maze (the maze is not in the filter's texture), so under
rp=gf the ripple's refraction does not bend the threads. The full fix composites into the filter texture
through Pixi's projection (its y is flipped against the canvas), which touches the composite shaders in
gf_pass.ts / gf_look.ts (Muse's files).

**Border look (Do 3).** Not a gf defect. K797b's border look is "only a dark edge stroke along each side,
no fill" (`docs/K339_inventory.md`), and today's renderer draws it so (`runs/crop_today.png`: fainter
still). rp=outline ignores `tlk` (nothing under `src/render/outline/` reads threadLook), so it always
draws filled threads (`runs/crop_outl.png`); gf honours it (`runs/crop_gf.png`). If Levi wants the border
look under gf to carry colour, that is a look decision, not a fix.

**Numbers** (`.claude/probes/K1450/runs/*.json`; edges = luminance step > 16, x < 0.78 w):
- D1 `?3&xp=off&am=instant&rp=gf`: 60/60, 103165-104786; composites = passes 1475.
- D2 `?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1` (25 s wait, past the reveal): 60/60, 7550-8826; 2683 = 2683.
- D3 `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`: 60/60, 7480-9201; 1845 = 1845.
- D4 the D1 link, `DRAG=1`: 60/60, 103157-104640; 2240 = 2240 (`runs/drag_sheet.png`: the knot moves).
- origin/master ffa3c960, D1 link: FAIL 54/60 (bad frames 1203-6391, good 103232-103725); composites 191 of
  1542 passes (`runs/origin_ffa3c960.json`). D3's link there: 19/20 bad (`runs/cal5566.json`).
- Six frames looked at: `runs/done_sheet.png` (D1 f07, f42 with a live ripple, D2 f30, D3 f50, D4 f15, f45).
- `npm test`: 250 files, 3104 tests green (gf_home_glsl included; no shader file changed).

**The guard.** `node .claude/probes/K1450/hold.mjs <url> <outDir> <profileDir> [frames=60] [gapMs=250]
[waitMs=5000]`, exit 1 when any frame has under 0.6 x the run's largest edge count or under 4000. Briefs that
touch rp=gf (Muse's included) add a Done line: "`hold.mjs` passes on `?3&xp=off&am=instant&rp=gf` and
`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`, 60 frames, on a build of the branch (`preview.ps1
-Ref`), one profileDir kept across runs". Load the link the ordinary way: no frame-forcing hooks, no
`prp=off`, no `snd=none` (the auto plucks are what exposed this). Env: `DRAG=1` drags a thread through the
burst, `SAVE=all` keeps every frame, `EDGE`, `XMAX`, `RATIO`, `MIN`. Headed, off-screen, real time; a cold
profile waits about 2 min for the first composite.

**Cold compile** (`cold.mjs`, fresh profile, fix build, `?3&xp=off&am=instant&rp=gf`; `cold_fix_build.json`):
first composite at 114.8 s, main blocked 105.4 s inside first LINK_STATUS / uniform reads. Six gf programs
(40-63k chars of GLSL each, the `gf_split.ts` tier and full forms with and without SCAP / corners) wait
4.0-19.4 s each, 71 s together; `bg-blit-vertex` waits 34.6 s at 80 s, which I read as queue time behind
the gf programs in the GPU process (inferred: a 525-char program does not compile for 35 s). Everything
else is under 0.1 s. Levi's later 38 s and 29 s blocks are probably the reveal and explore variants
(`revealForm`, compiled on the first revealing frame), which this xp=off/am=instant link never builds
(inferred, not run). What would cut it: (1) KHR_parallel_shader_compile, polling COMPLETION_STATUS_KHR
and drawing today's renderer until gf's programs are ready, so main never blocks (the compile time stays);
(2) compiling only the program the first frame routes to, the others on demand or idle; (3) smaller
programs (fewer unrolled MAXP/MAXK loops, which D3D's compiler pays for superlinearly). A warm profile
reaches the first composite in about 1.2 s.