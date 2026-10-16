# Rules lore index

Every path-scoped rules file in `.claude/rules/`, what it holds and the
files whose read attaches it. Written by K173's split
(`scripts/split_rules.mjs`, 2026-10-14); keep it current by hand when a
rules file or its `paths:` change. Not auto-loaded.

- `gameplay.md`: gameplay and UI: the intro and the list of the topic files
  paths: `src/game/**`, `src/ui/**`, `src/audio/**`, `src/main.ts`, `src/app/**`, `test/game/**`, `test/ui/**`, `test/audio/**`
- `gameplay-daily.md`: MAZE STATS + DAILY MAZE (K19, K20, K47, K56; the binding daily rules)
  paths: `src/game/daily_attempt.ts`, `src/game/daily_calendar.ts`, `src/game/daily_store.ts`, `src/game/maze_stats.ts`, `src/game/share_text.ts`, `src/ui/daily_link.ts`, `src/ui/daily_stats_view.ts`, `src/ui/share.ts`, `src/ui/maze_hud.ts`, `test/game/daily_attempt.test.ts`, `test/game/daily_calendar.test.ts`, `test/game/daily_store.test.ts`, `test/game/maze_stats.test.ts`, `test/ui/daily_link.test.ts`
- `gameplay-stars.md`: STAR RATINGS (K155)
  paths: `src/game/star_rating.ts`, `src/game/fabric_controller.ts`, `src/game/share_text.ts`, `src/ui/maze_hud.ts`, `src/ui/daily_stats_view.ts`, `test/game/star_rating.test.ts`, `test/game/fabric_controller.test.ts`, `test/game/fabric_trail.test.ts`
- `gameplay-badge.md`: MODE BADGE (K73, K151)
  paths: `src/ui/mode_badge.ts`, `test/ui/mode_badge.test.ts`
- `gameplay-indicators.md`: OFF-SCREEN INDICATORS (K73) and THE HEAD (K148)
  paths: `src/ui/offscreen_indicators.ts`, `src/ui/head_indicator.ts`, `test/ui/offscreen_indicators.test.ts`, `test/ui/head_indicator.test.ts`, `src/app/frame_loop.ts`
- `gameplay-minotaur.md`: REAL-TIME MINOTAUR (K80), THE MINOTAUR'S CONTROLS (K174), TURN-ALIGNED MINOTAUR (K80 turns)
  paths: `src/game/minotaur.ts`, `test/game/minotaur.test.ts`, `src/game/minotaur_turns.ts`, `test/game/minotaur_turns.test.ts`
- `gameplay-fire.md`: BURN RACE (K114)
  paths: `src/game/fire.ts`, `src/game/fire_clock.ts`,
  `test/game/fire.test.ts`, `test/game/fire_clock.test.ts`
- `gameplay-fog.md`: THE FOG RESETS ON A RESTART ONLY (K100), a catch's re-fog (K174)
  paths: `src/game/fabric_controller.ts`, `src/game/daily_attempt.ts`, `src/render/fabric_maze_renderer.ts`, `src/render/fog_arc.ts`, `test/render/fog_arc.test.ts`, `test/game/fabric_controller.test.ts`, `test/game/daily_attempt.test.ts`
- `gameplay-links.md`: link decoder details, codec v4, LOAD SETTLE PARAMS (K147), MARKER SIZE PARAM (K98), BURN RACE PARAMS (K114), PLUCK EMPHASIS PARAMS (K279)
  paths: `src/ui/param_codec.ts`, `src/ui/url_state.ts`, `src/ui/daily_link.ts`, `test/ui/param_codec.test.ts`, `test/ui/url_codec.test.ts`, `test/ui/seed_text.test.ts`, `test/ui/appear_mode.test.ts`
- `gameplay-panel.md`: pathViz labels, live recolor, panel rules, gridAlign, the background rows (K79), the Accessibility folder (K111)
  paths: `src/ui/tweakpane_panel.ts`, `src/ui/grid_align_curve.ts`, `test/ui/grid_align_curve.test.ts`
- `gameplay-motion.md`: THE MOTION SETTING (K53, K79), THE ACCESSIBILITY GROUP (K111: Reduced motion, High contrast)
  paths: `src/ui/motion.ts`, `test/ui/motion.test.ts`, `src/ui/accessibility.ts`, `test/ui/accessibility.test.ts`, `src/app/frame_loop.ts`, `src/app/lifecycle.ts`
- `gameplay-camera.md`: the camera round, FIT CAMERA PAN RANGE (K198), taps and drags (the tap tug, K279)
  paths: `src/main.ts`, `src/app/camera.ts`, `src/ui/view_clamp.ts`, `test/ui/view_clamp.test.ts`, `src/app/frame_loop.ts`
- `gameplay-moves.md`: MOVES BY DIRECTION (K120): keys, the picker, the move pad
  paths: `src/ui/key_moves.ts`, `src/ui/move_pad.ts`, `test/ui/key_moves.test.ts`, `test/ui/move_pad.test.ts`
- `gameplay-audio.md`: the audio autoplay gate, AUTO PLUCKS' VOLUME (K279), THE SNORING CAT LINK (K325)
  paths: `src/audio/**`, `test/audio/**`, `src/ui/snore_link.ts`, `test/ui/snore_link.test.ts`
- `generation.md`: generation: what changes move the dailies, the plan history pointer, engine-exact generation (K108)
  paths: `src/core/**`, `src/util/**`, `test/core/**`, `test/util/**`
- `generation-plan.md`: the plan identity pin (K87), long-tail dead ends (K74), H1 fused arm cuts (K74 stage 2), a route to the exit (K109), reachability (K110)
  paths: `src/core/maze_plan.ts`, `src/core/maze_apply.ts`, `src/core/shapes.ts`, `test/core/maze_plan.test.ts`, `test/core/maze_plan_identity.test.ts`, `test/core/maze_apply.test.ts`, `test/core/maze_solvable.test.ts`, `test/core/maze_reachable.test.ts`, `test/core/shapes.test.ts`, `test/core/fixtures/maze_plan_v1.ts`
- `generation-shapes.md`: rect identity, the start/exit anchors, escape tails
  paths: `src/core/shapes.ts`, `src/core/lattice_grower.ts`, `src/core/maze_plan.ts`, `src/core/maze_apply.ts`, `test/core/shapes.test.ts`, `test/core/lattice_grower.test.ts`
- `generation-geometry.md`: the spline bend bound (K90)
  paths: `src/geometry/**`, `test/geometry/**`
- `physics.md`: physics: the intro, the sweep test, the physics worker's pointer and the solver rules
  paths: `src/physics/**`, `test/physics/**`, `test/*.regression.test.ts`, `test/sweep.manual.test.ts`
- `physics-worker.md`: THE PHYSICS WORKER (K7): the two hosts, the mirror, transport, the allowance clock, interpolation, the start gate, the fallback, invariants, the measured numbers
  paths: `src/physics/physics_host.ts`, `src/physics/worker_host.ts`, `src/physics/physics_worker.ts`, `src/physics/physics_worker_core.ts`, `src/physics/mirror_system.ts`, `src/physics/snapshot.ts`, `src/physics/probe_dump.ts`, `src/core/scene_graph.ts`, `test/physics/physics_host.test.ts`, `test/physics/worker_host.test.ts`, `test/physics/host_seam.test.ts`, `test/physics/snapshot.test.ts`, `src/app/frame_loop.ts`, `src/app/lifecycle.ts`, `src/app/scene.ts`
- `physics-sleep.md`: the sleep gate counts sim time (K63)
  paths: `src/physics/sleep_gate.ts`, `test/physics/sleep_gate.test.ts`, `test/physics/sleep.regression.test.ts`, `test/quiescence.regression.test.ts`, `src/physics/physics_host.ts`, `src/app/frame_loop.ts`
- `physics-settle.md`: a new knot's first settle is paced (K147); its code lives in the physics host (K7)
  paths: `src/physics/settle_budget.ts`, `test/physics/settle_budget.test.ts`, `src/physics/physics_host.ts`, `src/app/frame_loop.ts`, `src/app/lifecycle.ts`
- `physics-kinks.md`: KINK EYES (with K41): the eye ratchet, across-eye pressure, the fairing exemption
  paths: `src/physics/particle_system.ts`, `src/physics/forces.ts`, `test/physics/sleep.regression.test.ts`
- `physics-fabric.md`: the junction cover, junction spacing, open-chain terminals
  paths: `src/physics/particle_system.ts`, `src/physics/forces.ts`, `test/physics/open_chain.test.ts`, `test/physics/junction.test.ts`, `test/physics/maze_fabric.test.ts`
- `physics-collision.md`: the P3 saga's invariants, mechanisms, lessons and negative results; the open loud attractor (K13)
  paths: `src/physics/particle_system.ts`, `src/physics/forces.ts`, `test/physics/particle_system.test.ts`, `test/quiescence.regression.test.ts`
- `probes.md`: probing: a bare URL is the daily, same-state A/Bs, the scratchpad, gotchas, hooks, recipes, the general diagnosis rules
  paths: `.claude/probes/**`, `scripts/*.mjs`, `scripts/*.ps1`, `scripts/*.ts`, `src/app/probe_hooks.ts`
- `probes-census.md`: the per-pixel gaps census, the census and scanner rules from P3
  paths: `scripts/diag_scan.mjs`, `scripts/fold_census.mjs`, `scripts/fold_census.ps1`, `scripts/fold_census.ts`, `scripts/fold_census.vite.config.mjs`
- `probes-phone.md`: the round phone pass (K156), phone gate probes (K79 B3), the physics worker on the phone (K7 stage 5)
  paths: `scripts/phone.ps1`, `scripts/phone_pass.ps1`, `scripts/phone_pass/**`, `.claude/probes/K79/**`, `.claude/probes/K156/**`, `.claude/probes/K7/stage5/**`
- `probes-pluck.md`: K77's pluck profile probes (`.claude/probes/K77/`), K279's pluck emphasis probes (`.claude/probes/K279/`), K344's pluck cusp probes (`.claude/probes/K344/`), K395's pluck loop tip probes (`.claude/probes/K395/`)
  paths: `.claude/probes/K77/**`, `.claude/probes/K279/**`, `.claude/probes/K344/**`, `.claude/probes/K395/**`
- `render.md`: render: the intro, custom shaders and mesh.texture, palette textures, the P3.40 lessons
  paths: `src/render/**`, `test/render/**`
- `render-backgrounds.md`: SHADER BACKGROUNDS (K21), SHAPE PARAMS + CUSTOM COLORS (K79)
  paths: `src/render/background.ts`, `src/render/background_model.ts`, `src/render/background_shaders.ts`, `test/render/background_model.test.ts`, `test/render/background_shaders.test.ts`, `src/app/frame_loop.ts`, `src/app/scene.ts`
- `render-hash.md`: THE BACKGROUNDS' HASH IS OUR OWN (K154)
  paths: `src/render/hash2d.ts`, `src/render/background_shaders.ts`, `test/render/hash2d.test.ts`
- `render-paint.md`: SHADER PAINT (G2), PULSES and PULSE REACH (K75; the trail split and the hover's reach, K93), RING LAPS (K299, integer-corrected lap math), palette strip order, gamut locality
  paths: `src/render/paint_glsl.ts`, `src/render/paint_math.ts`, `src/render/paint_model.ts`, `src/render/paint_const.ts`, `src/render/float_rows.ts`, `src/render/trail_paint.ts`, `test/render/trail_paint.test.ts`, `test/render/paint_fx.test.ts`, `test/render/paint_gameplay.test.ts`, `test/render/paint_math.test.ts`, `test/render/paint_section.test.ts`, `test/render/fixtures/pre_g2.ts`, `test/render/fixtures/pre_g23.ts`
- `render-ribbon.md`: the GPU junction field, overlay width, flat fills, arc-wrap, the arcAt gotcha, wedge flanks, fan indices, blend distance, miter clamp, displayF, the thread reveal's joint gate (K76 2b), the G3-0 data plane and the same-state capture (K8 stage 2), THE PARTS (K5: the rules for `src/render/ribbon/`, where R1 and R2 put things)
  paths: `src/render/ribbon_renderer.ts`, `src/render/ribbon/**`, `src/render/ribbon_mesh.ts`, `src/render/arm_strip.ts`, `src/render/junction_field.ts`, `test/render/fixtures/chains.ts`, `src/render/samp_table.ts`, `test/render/samp_table.test.ts`
- `render-pluck.md`: the concave-side cap, base collapse (K77), still plucks (K104), pluck params (K180), pluck emphasis (K279), pluck cusp (K344), pluck loop tip (K395)
  paths: `src/render/pluck_overlay.ts`, `src/render/pluck_model.ts`, `test/render/pluck_model.test.ts`, `src/render/pluck_ripple.ts`, `test/physics/tug.test.ts`
- `render-markers.md`: MARKER ICONS (K83), MARKER SIZE, COLORED DOTS, TWO GLYPHS (K98)
  paths: `src/render/marker_glyphs.ts`, `src/render/marker_mesh.ts`, `test/render/marker_glyphs.test.ts`
- `render-routes.md`: ROUTE BANDS (K81)
  paths: `src/render/junction_routes.ts`, `src/render/junction_field.ts`, `test/render/junction_routes.test.ts`
- `render-web-fade.md`: THE FULLY TRAVELED WEB FADES IN (K169)
  paths: `src/render/web_fade.ts`, `test/render/web_fade.test.ts`, `src/app/frame_loop.ts`
- `render-confetti.md`: FINISH CONFETTI (K140)
  paths: `src/render/confetti.ts`, `src/render/confetti_model.ts`, `test/render/confetti_model.test.ts`, `src/app/frame_loop.ts`
- `render-explore.md`: THE THREAD REVEAL (K76 stages 2a and 2b): the visibility model, VIS items and the whole-chain flag, the explore program and its looks, mode off = master's frame, the probe hook; the gates (crossing gaps, markers, junction joints), when the fans rebuild, the concurrent-GPU-probe lesson; the shaped cut (K268 stage 1): profile texels, gate bit, classifier, row-partial upload
  paths: `src/render/explore_glsl.ts`, `src/game/explore_view.ts`, `test/render/paint_explore.test.ts`, `test/render/explore_gates.test.ts`, `test/render/explore_cut.test.ts`, `test/game/explore_view.test.ts`, `src/render/ribbon/explore_gaps.ts`
- `render-gaps.md`: PER-PIXEL CROSSING GAPS (G1) and its render lore, marker gaps, the thread reveal's gap gate (K76 2b), the shaped cut's profile texels and row-partial upload (K268)
  paths: `src/render/gap_mask.ts`, `src/render/ribbon_renderer.ts`, `src/render/ribbon/**`, `src/render/ribbon_mesh.ts`
- `render-shaders.md`: SHADER COMPILES FREEZE THE SCREEN (K307): each program's cold cost (FXC on D3D11), where the intro's freezes are, the GPU program cache, why presents stop, parallel vs blocking warm-ups, building warm-up programs from the sites' own GlPrograms; THE WARM-UP (K307 stage 2): what main.ts gates, why it links blocking (parallel links miss the disk cache), wave 2 off, the registry rule, setProgramName twins, the burn rule
  paths: `src/render/ribbon_renderer.ts`, `src/render/ribbon/**`, `src/render/paint_glsl.ts`, `src/render/explore_glsl.ts`, `src/render/arm_strip.ts`, `src/render/junction_field.ts`, `src/render/background.ts`, `src/render/background_shaders.ts`, `src/render/marker_mesh.ts`, `src/render/pluck_overlay.ts`, `src/render/pluck_ripple.ts`, `src/render/shader_warmup.ts`, `src/render/program_registry.ts`, `test/render/program_registry.test.ts`, `test/render/shader_warmup.test.ts`, `src/app/frame_loop.ts`, `src/app/lifecycle.ts`
- `notices.md`: the credits and licenses page (K122)
  paths: `notices/**`, `test/notices/**`, `vite.config.ts`
