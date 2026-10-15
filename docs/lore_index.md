# Rules lore index

Every path-scoped rules file in `.claude/rules/`, what it holds and the
files whose read attaches it. Written by K173's split
(`scripts/split_rules.mjs`, 2026-10-14); keep it current by hand when a
rules file or its `paths:` change. Not auto-loaded.

- `gameplay.md`: gameplay and UI: the intro and the list of the topic files
  paths: `src/game/**`, `src/ui/**`, `src/audio/**`, `src/main.ts`, `test/game/**`, `test/ui/**`, `test/audio/**`
- `gameplay-daily.md`: MAZE STATS + DAILY MAZE (K19, K20, K47, K56; the binding daily rules)
  paths: `src/game/daily_attempt.ts`, `src/game/daily_calendar.ts`, `src/game/daily_store.ts`, `src/game/maze_stats.ts`, `src/game/share_text.ts`, `src/ui/daily_link.ts`, `src/ui/daily_stats_view.ts`, `src/ui/share.ts`, `src/ui/maze_hud.ts`, `test/game/daily_attempt.test.ts`, `test/game/daily_calendar.test.ts`, `test/game/daily_store.test.ts`, `test/game/maze_stats.test.ts`, `test/ui/daily_link.test.ts`
- `gameplay-stars.md`: STAR RATINGS (K155)
  paths: `src/game/star_rating.ts`, `src/game/fabric_controller.ts`, `src/game/share_text.ts`, `src/ui/maze_hud.ts`, `src/ui/daily_stats_view.ts`, `test/game/star_rating.test.ts`, `test/game/fabric_controller.test.ts`, `test/game/fabric_trail.test.ts`
- `gameplay-badge.md`: MODE BADGE (K73, K151)
  paths: `src/ui/mode_badge.ts`, `test/ui/mode_badge.test.ts`
- `gameplay-indicators.md`: OFF-SCREEN INDICATORS (K73) and THE HEAD (K148)
  paths: `src/ui/offscreen_indicators.ts`, `src/ui/head_indicator.ts`, `test/ui/offscreen_indicators.test.ts`, `test/ui/head_indicator.test.ts`
- `gameplay-minotaur.md`: REAL-TIME MINOTAUR (K80)
  paths: `src/game/minotaur.ts`, `test/game/minotaur.test.ts`
- `gameplay-fog.md`: THE FOG RESETS ON A RESTART ONLY (K100)
  paths: `src/game/fabric_controller.ts`, `src/game/daily_attempt.ts`, `src/render/fabric_maze_renderer.ts`, `src/render/fog_arc.ts`, `test/render/fog_arc.test.ts`, `test/game/fabric_controller.test.ts`, `test/game/daily_attempt.test.ts`
- `gameplay-links.md`: link decoder details, codec v4, LOAD SETTLE PARAMS (K147), MARKER SIZE PARAM (K98)
  paths: `src/ui/param_codec.ts`, `src/ui/url_state.ts`, `src/ui/daily_link.ts`, `test/ui/param_codec.test.ts`, `test/ui/url_codec.test.ts`, `test/ui/seed_text.test.ts`, `test/ui/appear_mode.test.ts`
- `gameplay-panel.md`: pathViz labels, live recolor, panel rules, gridAlign, the background rows (K79), the Accessibility folder (K111)
  paths: `src/ui/tweakpane_panel.ts`, `src/ui/grid_align_curve.ts`, `test/ui/grid_align_curve.test.ts`
- `gameplay-motion.md`: THE MOTION SETTING (K53, K79), THE ACCESSIBILITY GROUP (K111: Reduced motion, High contrast)
  paths: `src/ui/motion.ts`, `test/ui/motion.test.ts`, `src/ui/accessibility.ts`, `test/ui/accessibility.test.ts`
- `gameplay-camera.md`: the camera round, FIT CAMERA PAN RANGE (K198), taps and drags
  paths: `src/main.ts`, `src/ui/view_clamp.ts`, `test/ui/view_clamp.test.ts`
- `gameplay-moves.md`: MOVES BY DIRECTION (K120): keys, the picker, the move pad
  paths: `src/ui/key_moves.ts`, `src/ui/move_pad.ts`, `test/ui/key_moves.test.ts`, `test/ui/move_pad.test.ts`
- `gameplay-audio.md`: the audio autoplay gate
  paths: `src/audio/**`, `test/audio/**`
- `generation.md`: generation: what changes move the dailies, the plan history pointer, engine-exact generation (K108)
  paths: `src/core/**`, `src/util/**`, `test/core/**`, `test/util/**`
- `generation-plan.md`: the plan identity pin (K87), long-tail dead ends (K74), a route to the exit (K109), reachability (K110)
  paths: `src/core/maze_plan.ts`, `src/core/maze_apply.ts`, `src/core/shapes.ts`, `test/core/maze_plan.test.ts`, `test/core/maze_plan_identity.test.ts`, `test/core/maze_apply.test.ts`, `test/core/maze_solvable.test.ts`, `test/core/maze_reachable.test.ts`, `test/core/shapes.test.ts`, `test/core/fixtures/maze_plan_v1.ts`
- `generation-shapes.md`: rect identity, the start/exit anchors, escape tails
  paths: `src/core/shapes.ts`, `src/core/lattice_grower.ts`, `src/core/maze_plan.ts`, `src/core/maze_apply.ts`, `test/core/shapes.test.ts`, `test/core/lattice_grower.test.ts`
- `generation-geometry.md`: the spline bend bound (K90)
  paths: `src/geometry/**`, `test/geometry/**`
- `physics.md`: physics: the intro, the sweep test, the Web Worker plan
  paths: `src/physics/**`, `test/physics/**`, `test/*.regression.test.ts`, `test/sweep.manual.test.ts`
- `physics-sleep.md`: the sleep gate counts sim time (K63)
  paths: `src/physics/sleep_gate.ts`, `test/physics/sleep_gate.test.ts`, `test/physics/sleep.regression.test.ts`, `test/quiescence.regression.test.ts`
- `physics-settle.md`: a new knot's first settle is paced (K147)
  paths: `src/physics/settle_budget.ts`, `test/physics/settle_budget.test.ts`
- `physics-kinks.md`: KINK EYES (with K41): the eye ratchet, across-eye pressure, the fairing exemption
  paths: `src/physics/particle_system.ts`, `src/physics/forces.ts`, `test/physics/sleep.regression.test.ts`
- `physics-fabric.md`: the junction cover, junction spacing, open-chain terminals
  paths: `src/physics/particle_system.ts`, `src/physics/forces.ts`, `test/physics/open_chain.test.ts`, `test/physics/junction.test.ts`, `test/physics/maze_fabric.test.ts`
- `physics-collision.md`: the P3 saga's invariants, mechanisms, lessons and negative results; the open loud attractor (K13)
  paths: `src/physics/particle_system.ts`, `src/physics/forces.ts`, `test/physics/particle_system.test.ts`, `test/quiescence.regression.test.ts`
- `probes.md`: probing: a bare URL is the daily, same-state A/Bs, the scratchpad, gotchas, hooks, recipes, the general diagnosis rules
  paths: `.claude/probes/**`, `scripts/*.mjs`, `scripts/*.ps1`, `scripts/*.ts`
- `probes-census.md`: the per-pixel gaps census, the census and scanner rules from P3
  paths: `scripts/diag_scan.mjs`, `scripts/fold_census.mjs`, `scripts/fold_census.ps1`, `scripts/fold_census.ts`, `scripts/fold_census.vite.config.mjs`
- `probes-phone.md`: the round phone pass (K156), phone gate probes (K79 B3)
  paths: `scripts/phone.ps1`, `scripts/phone_pass.ps1`, `scripts/phone_pass/**`, `.claude/probes/K79/**`, `.claude/probes/K156/**`
- `probes-pluck.md`: K77's pluck profile probes (`.claude/probes/K77/`)
  paths: `.claude/probes/K77/**`
- `render.md`: render: the intro, custom shaders and mesh.texture, palette textures, the P3.40 lessons
  paths: `src/render/**`, `test/render/**`
- `render-backgrounds.md`: SHADER BACKGROUNDS (K21), SHAPE PARAMS + CUSTOM COLORS (K79)
  paths: `src/render/background.ts`, `src/render/background_model.ts`, `src/render/background_shaders.ts`, `test/render/background_model.test.ts`, `test/render/background_shaders.test.ts`
- `render-hash.md`: THE BACKGROUNDS' HASH IS OUR OWN (K154)
  paths: `src/render/hash2d.ts`, `src/render/background_shaders.ts`, `test/render/hash2d.test.ts`
- `render-paint.md`: SHADER PAINT (G2), PULSES and PULSE REACH (K75; the trail split and the hover's reach, K93), palette strip order, gamut locality
  paths: `src/render/paint_glsl.ts`, `src/render/paint_math.ts`, `src/render/paint_model.ts`, `src/render/paint_const.ts`, `src/render/float_rows.ts`, `src/render/trail_paint.ts`, `test/render/trail_paint.test.ts`, `test/render/paint_fx.test.ts`, `test/render/paint_gameplay.test.ts`, `test/render/paint_math.test.ts`, `test/render/paint_section.test.ts`, `test/render/fixtures/pre_g2.ts`, `test/render/fixtures/pre_g23.ts`
- `render-ribbon.md`: the GPU junction field, overlay width, flat fills, arc-wrap, the arcAt gotcha, wedge flanks, fan indices, blend distance, miter clamp, displayF
  paths: `src/render/ribbon_renderer.ts`, `src/render/ribbon_mesh.ts`, `src/render/arm_strip.ts`, `src/render/junction_field.ts`, `test/render/fixtures/chains.ts`
- `render-pluck.md`: the concave-side cap, base collapse (K77), still plucks (K104), pluck params (K180)
  paths: `src/render/pluck_overlay.ts`, `src/render/pluck_model.ts`, `test/render/pluck_model.test.ts`
- `render-markers.md`: MARKER ICONS (K83), MARKER SIZE, COLORED DOTS, TWO GLYPHS (K98)
  paths: `src/render/marker_glyphs.ts`, `src/render/marker_mesh.ts`, `test/render/marker_glyphs.test.ts`
- `render-routes.md`: ROUTE BANDS (K81)
  paths: `src/render/junction_routes.ts`, `src/render/junction_field.ts`, `test/render/junction_routes.test.ts`
- `render-web-fade.md`: THE FULLY TRAVELED WEB FADES IN (K169)
  paths: `src/render/web_fade.ts`, `test/render/web_fade.test.ts`
- `render-confetti.md`: FINISH CONFETTI (K140)
  paths: `src/render/confetti.ts`, `src/render/confetti_model.ts`, `test/render/confetti_model.test.ts`
- `render-gaps.md`: PER-PIXEL CROSSING GAPS (G1) and its render lore, marker gaps
  paths: `src/render/gap_mask.ts`, `src/render/ribbon_renderer.ts`, `src/render/ribbon_mesh.ts`
- `notices.md`: the credits and licenses page (K122)
  paths: `notices/**`, `test/notices/**`, `vite.config.ts`
