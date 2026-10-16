---
paths:
  - "src/render/background.ts"
  - "src/render/background_model.ts"
  - "src/render/background_shaders.ts"
  - "test/render/background_model.test.ts"
  - "test/render/background_shaders.test.ts"
  - "src/app/frame_loop.ts"
  - "src/app/scene.ts"
---

# Render lore: shader backgrounds (K21)

Moved verbatim from `render.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `render.md` lists the area's other files.

- SHADER BACKGROUNDS (K21, 2026-10-12; the commit message holds the
  measurements). `background` (bg=: none | vellum | mist | wash | silk |
  aurora | contours; default VELLUM) + `backgroundIntensity` (bgi=, [0,
  1], default 0.5; 0 = off like none) - render/background*.ts. A
  SCREEN-FIXED layer, the stage's first child: the effect's fragment
  shader fills a LOW-RES RenderTexture (0.34-0.75 texels per CSS px;
  vellum 1 for its grain) only when the drift clock says so (10-15 fps,
  6-10 on phones; static vellum once per change), and a dithered blit
  stretches it over the canvas every frame. Crossing gaps discard (G1),
  so they show it, and still read as gaps over every effect at
  intensity 1. RULES: (1) none (and intensity 0) adds NOTHING to a frame
  - same-state A/B vs master is 0 px; keep it so. (2) Colors = the page
  ink + three gamut accents (the design's own hue/arc/palette), resent
  on every recolor; the seed offsets the noise. (3) FOG = BACKGROUND: with
  an effect on, the fog of war draws the background texture at the
  pixel's screen position (FogBackdrop; the DisplacementFilter wobble is
  folded into the alpha lookup, the dither is the blit's), so fogged
  pixels ARE background pixels - a flat fog read as a flat square. (4)
  K24/K6 HOOK: needsFrame() + tick(dt, sceneActive); the drift pauses
  after 2.5 s of an otherwise still scene (main.ts sceneAnimating()
  stands in for K6's flags) and stops under reduced motion (the Motion
  setting, ui/motion.ts).
  Screen-fixed, not world-anchored: a backdrop at infinity - camera moves
  never drag it or force a re-render, zoom cannot alias it, and the fog
  can sample it. REJECTED: cells (Voronoi seams form a dark network that
  competes with the maze's faces), dither (a screen door that crawls
  under drift), linen (a 4.5 px weave that moires at fractional DPRs).
  LORE: this desktop's probe Chrome reports prefers-reduced-motion:
  reduce only while the session is attached over Remote Desktop (or left
  disconnected after one), and no-preference at the console (K104,
  probes.md), so backgrounds may not drift here - probes emulate
  no-preference; a warp of a warp amplifies its time
  offsets (mist's clock runs at 0.35) and contour lines that move faster
  than ~1 CSS px/s read as crawling; calibrate contrast as the p2-p98
  luma spread of a knot-free margin (about 9-13 levels at 0.5). Cost:
  +0.24-0.34 ms GPU per frame at 3200x1800 (the full-screen pass is most
  of it). Probes: `.claude/probes/K21/`.
  SPEED + VELLUM MOTION (K79, 2026-10-13; the commit messages hold the
  measurements): `backgroundSpeed` (bgs=, codec v4 index 70) defaults to
  AUTO (-1; any negative value, NaN or garbage reads as auto) = each
  effect's own pace; 0 = static, otherwise a multiple of the designed
  drift, clamped to BACKGROUND_SPEED_MAX = 8 (Levi, 2026-10-13: "Max
  backgroundSpeed should be like x8"; stage A shipped 3; the one constant
  feeds the slider, the link clamp and effectiveSpeed). The pass rate does
  not scale with it, so at 8x each texture pass moves the pattern 8x
  further: steppier, not costlier. Clock drift = profile drift x effectiveSpeed (auto
  = the profile's autoSpeed: vellum 0, the rest 1), so auto is
  bit-identical to K21, and the pass rate never scales. configure() zeroes
  the clock on an effect change and when an auto-static effect (vellum)
  returns to auto. VELLUM moves only at a set speed, in its own program
  VELLUM_DRIFT (effectProgram(id, t), t != 0): both mottling octaves
  drift and the vignette's light wanders; fibers and grain stay put. Keep
  TWO programs: one with its time terms zeroed put static vellum 34 px
  off master (1 LSB; the compiler fuses the multiply-adds differently).
  Same-state A/B vs master: 19 cases, 0 px, identical drift clocks. Cost
  at 3200x1800 (dpr 2): the drift pass ~2.1 ms (1 texel per CSS px =
  1600x900, for the grain) at ~10.7/s = 0.37 ms/frame, ~8x mist's pass,
  so the phone gate (K10) comes before vellum moves by default (K52). Vellum at speed 2 changes
  about as fast as aurora at auto. Programs are named bg-<id>
  (bg-vellum-drift), which is how a GPU probe times each one. Probes:
  `.claude/probes/K79/` (run_ab.ps1 + k79_ab.mjs, k79_sheet.mjs,
  k79_dstats.mjs, k79_gpu.mjs).
  SHAPE PARAMS + CUSTOM COLORS (K79 stage B, 2026-10-13; the commit
  messages hold the design notes, the panel side is in `gameplay-panel.md`):
  ten params appended to codec v4, indices 72-81 (K74 stage 1 took 71 for
  deadEndLength first, so these renumbered at their merge; before launch
  nothing keeps a link's meaning, and whichever branch merges second
  renumbers its appends): backgroundScale (bgsz, [0.5, 2], 1),
  backgroundDetail (bgdt, [0, 2], 1), backgroundFibers and backgroundGrain
  (bgfb, bggr, [0, 3], 1), backgroundAngle (bgan, degrees
  counterclockwise from screen right, any negative = AUTO = the seed's
  own direction, -1), backgroundColorMode (bgcm, gamut | custom) and
  backgroundBase / backgroundAccent1-3 (bgc0-bgc3, #rrggbb, defaults
  #151b28 #7ab8cd #cdb17a #aa7acd). What reads what: scale every effect;
  detail mist, wash, silk and contours only (BACKGROUND_DETAIL_EFFECTS:
  vellum and aurora moved 0.4 luma levels at detail 0 and 2 against 1,
  the others 0.9-2.6, so those two keep the designed fbm and no row);
  fibers and grain vellum; angle silk; the colors every effect. None of
  them is daily-exempt. SHAPED PROGRAMS: an effect draws with its own K21 /
  stage-A program, byte for byte, until a param IT READS leaves its
  default (needsShapeProgram); then with bg-<id>-x, which reads uShape
  (1 / scale, fbm gain, fibers, grain) and uShape2 (silk's angle). Pixi
  skips group uniforms a program does not declare, so the defaults never
  see them. Two programs per effect, not one: a generalized program does
  not reproduce the bits of the one it generalizes (the VELLUM_DRIFT
  lesson). `test/render/background_shaders.test.ts` pins the default
  sources by sha256 (all seven programs, the blit, the fog, the quad);
  re-pin only after a same-state A/B against the previous build
  (run_ab.ps1 over cases_all.json, then k79b_cases.json: explicit
  defaults, unread params, custom colors in gamut mode, none with shape
  params, fog and knot mode, all 0 px). SCALE zooms about the screen
  center (where the knot hides it): the pattern is evaluated at p / S and
  the drift time at t / S, so a drift crosses the screen at its designed
  CSS px per second at any S (contours 1.04 px/s at S 0.5, 1, 2 and 3 on
  the desktop viewport, 0.475 on the phone's, by cross-correlating two
  frames, before the max came down to 2; the crawl limit is about 1).
  Below 1 the render texture gets
  max(base, min(1, base / S)) texels per CSS px (mist, wash, silk and
  aurora reach 4x the texels at 0.5, contours 1.8x, vellum is at 1
  already): the same sharpness, and no blockiness in the sheets on
  either viewport (1x crops, and gain 4 at 3x zoom on the phone's
  0.6-0.8 texels per CSS px). Above 1 the pattern
  gets sparse and the margins quiet: the background's luma sd fell from
  3.4 to 2.6 (mist), 4.4 to 2.4 (wash) and 2.6 to 1.1 (contours, one or
  two lines on screen) from S 1 to 3. THE MAX IS 2 for that reason (K129,
  Levi 2026-10-13; BACKGROUND_SCALE_MAX, it was 3 through B2). VELLUM's
  mottling scales and its vignette stays on the screen, but its fibers
  grow with S above 1 and never shrink below their designed size (a texel
  per CSS px cannot draw them finer): at S 2-3 they read as long crossing
  hatching, not speckle. K129 kept that floor and cut the max instead
  (Levi left the vellum choice open: "whatever is best"). FBM DETAIL:
  octave gain 0.25 + 0.25 d (0.5 = designed), the sum rescaled to the
  designed fbm's RMS so contrast holds. CUSTOM COLORS: the BASE IS THE
  PAGE - the shaders' ink, the canvas's CSS background and
  `fabric.setFogColor` (so none, intensity 0 and the flat fog show it,
  and the fog still matches the backdrop). Accent 1 feeds uA2 (the
  gamut's middle color, vellum's tint), 2 feeds uA1 and 3 feeds uA3.
  BACKGROUND_ACCENTS_USED lists what each effect reads (vellum 1; silk
  and contours 2 and 3; mist, wash, aurora 1-3), and `k79b_sheet.mjs
  accents` holds it to the pixel (an unread accent changes 0 px).
  COST (stage B2b, 2026-10-13, perf lock held; RX 6800 XT, 3200x1800 =
  1600x900 CSS at dpr 2; k79b_gpu.mjs, a TIME_ELAPSED query per draw, 3
  rounds x 5 s per config on one settled page, so the page ran at 46-51
  fps; ms per pass repeats within ~5%, compare only inside one run): a
  -x program costs what its texels cost. Scale 0.5 quadruples them (mist
  1088x612, wash and aurora 1280x720, silk 1600x900) and the pass 3.9-4.3x:
  mist 0.27 -> 1.04 ms/pass, wash 0.36 -> 1.43, silk 0.34 -> 1.45, aurora
  0.43 -> 1.67 (the worst: x15/s = 0.42 ms per 60 Hz frame against 0.11);
  contours (1.8x the texels) 0.33 -> 0.59 (x10/s = 0.10 against 0.05).
  Scale 2 (the max), detail 2 and silk's angle cost the default's price
  (0.97-1.03x).
  Vellum-x at speed 1 costs the drift program's 2.1 ms/pass (x10/s = 0.35
  ms per frame) at scale 2 or fibers 3 (1.00-1.03x), and half of it at
  fibers 0 + grain 0 (0.99 ms). The blit adds ~0.2 ms (0.19-0.27) every
  frame under any effect, static vellum included; `none` draws nothing.
  These are desktop numbers: the phone's texel scales are 0.3-0.4 per CSS
  px (scale 0.5 doubles them), and the phone gate (B3) measures its cost.
  Full table: docs/design/K79.md, "Stage B2b results".
  Probes (untracked, `.claude/probes/K79/`): k79b_sheet.mjs (the sheets,
  the accent check and the contours crawl; desk or phone viewport),
  k79b_montage.mjs and k79b_bgsd.mjs (crops, contrast by scale),
  k79b_gpu.mjs (GPU ms per program, shape params in the config),
  k79b_smoke.mjs (links, programs, panel rows, custom base and fog; 70
  checks), k79b_k129.mjs (the scale max: links and the real slider; 17
  checks) and k79b_cases.json (the explicit-defaults A/B, 12 cases).
