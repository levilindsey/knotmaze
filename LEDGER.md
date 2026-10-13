# Knotmaze ledger

The to-do surface for work that isn't done yet: follow-ups, known
residuals, decisions waiting on Levi, and ideas. Claude Code sessions and
their agents keep it current (the convention lives in claude-config,
`rules/ledger.md`). Add an item the moment something is deferred,
proposed, or left over. Close it by moving it to **Done** with the commit
that resolved it. The daily transcript audit reconciles against this file.

History, measurements and lore stay in `CLAUDE.md` and the commit
messages; design documents are in `docs/design/`. IDs are stable (`K<n>`)
and never reused.

## Waiting on Levi

- **K46** · What should the daily be? `DAILY_V1` (`src/ui/daily_link.ts`)
  is today's default design every day: 18x18 rect, braided, no dead
  ends. Variety (weekday sizes, shapes, dead ends) would be a `DAILY_V2`
  starting a few days ahead.
- **K47** · A reload mid-attempt restarts the daily, and only the first
  finish is official, so a player can explore, reload, then post a
  better official time. Save the attempt in progress, as Wordle does?
- **K48** · Desktop browsers that offer native sharing (Chrome and Edge
  on Windows) get the clipboard on purpose; the native sheet is for
  phones. Native on desktop too? A one-line change.
- **K49** · Kink eye size after K41's chord-law pressure: 2.6 widths
  (shipped) keeps the median eye at about 1.25 widths. 2.8 lifts the
  boxed tail (default-width X304 0.78 -> 0.84; every harness link at
  0.82 or more) but grows median eyes to about 1.43 widths. Keep 2.6?
- **K52** · Default background: K21 shipped `vellum` at intensity 0.5
  (static parchment grain plus vignette; the page stays navy on average),
  so every existing link and every daily shows it. Keep it, or default
  to `none`? Changing the default later needs codec v4.
- **K53** · prefers-reduced-motion stops the background drift
  completely, and Levi's desktop Chrome reports reduced motion (Windows
  animation effects are off), so drift never shows there. Stop it, or
  only slow it?

## In progress

- **K4** · G2: per-sample color work moves into the shaders.
  - owner: G2 agent of session d8031183, started 2026-10-12 14:10.
  - branch: `worktree-agent-a7d1f998c07c3864f`
    (`.claude/worktrees/agent-a7d1f998c07c3864f`); last commit: 786b4bb
    (WIP).
  - evidence: `.claude/probes/K4/`.
  - next: reconcile the design doc with G1, then G2.0 through G2.3 and
    G2.5, then G2.4 GPU particles if the stages verify cleanly.
  - brief: `docs/design/K4.md` and `docs/design/G2_shader_paint.md`.

## Next, in order

- **K45** · Slim CLAUDE.md (2,040 lines, ~36k tokens, loaded into every
  session and agent) to about 400 lines under the new context-budget rule
  (claude-config `rules/context-budget.md`): keep binding rules, the
  architecture map and invariants. Stage history moves to
  `docs/history.md`; physics, render and probe lore move to path-scoped
  `.claude/rules/*.md` (track `.claude/rules/` while the rest of `.claude/`
  stays untracked). Do it right after K41, K4, K19+K20 and K21 merge:
  each of their agents edits CLAUDE.md.

- **K5** · Split `main.ts` and `ribbon_renderer.ts` along the new data
  lines, once K1-K3 land.
- **K6** · One frame loop driven by what-changed flags (after K5).
  Replaces K21's stand-in `sceneAnimating()` in main.ts, and the
  render-on-demand loop (K24) asks `background.needsFrame()`.
- **K7** · Physics in a Web Worker, with render-side interpolation between
  physics steps (after K6). Smooths the UI; it does not speed up physics.
  Acceptance includes K28: the intro runs at full frame rate WHILE
  physics settles (no settle-first loader wait).
- **K8** · G3: SDF ribbons drawn from one shared sample texture
  (`docs/design/G3G4_sdf_geometry.md`). Defaults: tight folds render as
  filled lobes, anchored tails keep flat caps, phones stay at a 2x
  resolution cap. Fold in G1's GPU levers: a loop-free protect test
  (about 0.15 ms of register pressure at 3200x1800), a zoom-aware
  polyline tolerance, a per-point far-branch gate, and dropping the
  globals fetch.
- **K9** · G4: smooth-union SDF junction webs (cuspRadius = blend
  radius); A/B crops at cr 1, 3, 6 before the fans are deleted. Also
  closes G1's x160 leftover: a faint tick where a wedge flank meets a
  tucked bridge.
- **K10** · Phone benchmark after every stage. Baseline (Pixel 11, Chrome
  154, 2026-10-11, default maze settled): 30 fps at rest with defaults,
  51 fps with `fw=0`. Flow at rest halves the frame rate today. Compare
  builds only with the knot asleep (or `phy=0`): a stale K1 preview that
  had not slept after 19 s on the phone ran 5.8 fps on physics alone
  (158 ms/frame), while master at Levi's link settled and ran 40 fps.
  Due now: the merged G1 build (the G1 agent measured 39 -> 60 fps at
  rest under flow at defaults, on an older base) and the K21 backgrounds
  (vellum and one drifting effect, at rest). If the full-screen blit
  costs frames, give phones a cheaper path. Setup: `scripts/phone.ps1`.

## Residuals (known, not fixed)

- **K11** · Ring + gridAlign: buckles lopsided below strength ~1.8e-3,
  wanders without sleeping at 5e-4..1.6e-3, never sleeps at ga=1.
- **K12** · Star shape, e-w anchors: 6/8 seeds sleep; 2 hover at the
  threshold.
- **K13** · Post-violent-play loud attractor at fat params (the open P3
  problem; fingerprint in CLAUDE.md Follow-ups).
- **K14** · Latent seam-window wraps on open chains
  (applyTransversality's window, the slide/project windows,
  updatePassCover's +-12 slots): agent-measured, unfixed.
- **K15** · During a reveal, a joint's fan can turn opaque while a fill
  beside it is still striped (K4 fixes it by construction). May be moot:
  G1 (99443cb) deleted the over-fills. Re-check fan vs base ribbon during
  a reveal.
- **K16** · Physics settle is slow: 100-190 ms/frame at gs 18 on a loaded
  desktop; on the phone 7 sim-seconds took 14 s. K6/K7 fix the UI side.
  It matters more now: the daily (K20) makes the 18x18 default design
  the front door, at about 6 fps for its first seconds on a loaded
  desktop.
- **K29** · Boxed kinks at tw 0.64: 3 of ~152 kinks (8 seeds) rest at
  0.56-0.78 thread widths of eye hole - boxed in by a fused joint on one
  side and the 1.6 corridor floor on the other, they keep only lattice
  material. A stronger eye pressure (2.6) doesn't lift them; 2.8 left 2/8
  fat seeds awake. See CLAUDE.md "KINK EYES". Since K41's chord law they
  rest a little smaller, because the flat law had pried their crossings
  open: five at 0.64-0.74 at tw .64, and X304 (seed 3zz2a1) at 0.78-0.80
  at the default width (was 0.83-0.86). K49 is the size decision.
- **K30** · Very wide threads (tw >= 0.72) never sleep - standing riders;
  the same counts as before the kink fix (2/4 seeds at 0.72, 0/4 at 0.8).
  After K41, 7/8 seeds sleep at tw .72 (was 4/8). Seed 1q2w3e's kink X360
  cycles material through its crossing at mv about 0.09 (df373b5 did the
  same); turning eye pressure off doesn't stop it. The slider reaches 0.8.
- **K50** · The riders gate measures overlap after the first final
  collision sweep but before the fusion snap, so a resting overlap of up
  to about 0.04 at joints can go unflagged. Measure the end-of-substep
  state instead. (K41 agent idea.)
- **K54** · Background contrast varies with the palette: ember roughly
  halves mist's (luma spread 11.4 -> 6.1). Normalizing the accents'
  brightness would even it out.
- **K51** · Knot-mode braids: where one pass sits between two twist
  twins, the two ratchets still clamp one after the other. K41's
  ratchet-intersection rule could apply there; no failure seen yet.
- **K26** · Plucks at tight loops, seen zoomed in. Only the concave side
  of the swing is capped, so the time exposure leans outward and a loop's
  eye gets a slightly ragged, enlarged rim during the ring. A symmetric
  cap fixed the eye but carved every hook's outer blur into lumps at
  normal zoom, so it was rejected.
- **K27** · Plucks near junctions. Lobes inside a junction's fillet-web
  footprint (about 1 world at cr 3) keep their base intact, so they ring
  as a crisp thread with a halo rather than a blur, as crossing
  footprints already do.
- **K42** · Silhouette-level cyclic overlaps: three ribbons over one
  pixel, each over the next (user link x170/x93 after repeated cinches,
  x134/x135 in one squeezed cinch: chains 1 > 2 > 0 > 1). G1's per-pixel
  protect can't break a cycle; it needs a per-pixel winner. 52-198
  naked px in those captures.
- **K43** · A fused tail riding its host (user link tips 0/1) is still
  sensitive to draw order. Predates G1.
- **K44** · Probe tooling: the gap census stops a crossing's ideal over
  polyline at 0.5 of the neighbor gap where the renderer uses 0.8 (the
  false overcut at user x57), and its totals drift between two captures
  of one frozen state (cause unknown). Same-state pixel diffs are exact.
  Also: `.claude/probes/K19-K20/probe_daily.mjs`'s time-zone mode hung
  once in `browser.close()` after writing its report. And any hold probe
  must first move past the 4 CSS px tug threshold: since df373b5 a still
  press is a pluck, so the KINK EYES battery's holds did nothing (the
  K41 copy in `.claude/probes/K41/` moves 12 px first).

## Approved, to schedule (2026-10-11)

- **K22** · Dynamic resolution scaler (2x up to 3x when frame time
  allows; down when struggling). Part of K6, refined after G3.
- **K23** · GPU particles (G2.4), GPU fog-of-war accumulation, the yarn as
  a gap-masked ribbon (G3-5).
- **K24** · Render on demand when the scene is fully static (battery);
  part of K6. An animated background (K21) must not defeat it.

## Ideas (not scheduled)

Offers from 2026-10-10 that Levi hasn't answered yet (filed from the
audit inbox; the first-tap sound offer is done, 82b6b6b).

- **K32** · Bigger tap targets for maze choices on touch screens; choices
  are tight at full-maze zoom on a small phone.
- **K33** · A share button that opens the phone's native share sheet with
  the link (the link holds the whole design). The daily's result share
  shipped with K20 (win banner and stats view); a general "share this
  design" button is what remains.
- **K34** · The settings panel as a bottom sheet in portrait on phones.
- **K35** · A short vibration on pluck (Android only; `navigator.vibrate`).
- **K36** · Add to home screen: a web app manifest and icons. Blocked on
  icon art (Levi has the prompt for another model). The same art fixes
  the `/favicon.ico` 404 on every load.
- **K37** · Fog-of-war edge wobble: stronger, or a slider (Stage 25b wobbles
  about 14 screen px).
- **K38** · Focus fade: softer, longer gap fades near the player's dot
  (depth-of-field feel), prototyped with a strength slider.
- **K39** · A manual battery/quality toggle for phones (fewer intro
  particles, lower resolution); may fold into K22's automatic scaler.
- **K55** · An optional parallax background mode: it pans and zooms at a
  fraction of the camera, for depth. Today it is screen-fixed on
  purpose. (K21 agent idea.)

## Done

(items move here with the commit that resolved them)

- **K21** · Shader noise backgrounds: `background` dropdown (none,
  vellum, mist, wash, silk, aurora, contours) and an intensity slider;
  screen-fixed, low-res and low-rate, colors from the design's gamut;
  fog draws the background in fogged areas; `none` is pixel-identical to
  master. Each effect adds 0.24-0.34 ms of GPU per frame at 3200x1800.
  Done in 66e80e9 (2026-10-12). Probes and contact sheets:
  `.claude/probes/K21/out/final/`.

- **K41** · Since the kink eyes (9920fab), Levi's rect link and the fat
  link never slept (93-95 ms of physics per frame at rest). Done in
  0e98804 and cb73eb5 (2026-10-12):
  - the capsule test solves its closest points in 3D (its 2D solve
    double-pushed twist-eye pairs, a cycle that predates the kink eyes);
  - the eye pressure follows a chord law, 2.6 widths;
  - ratchets intersect at every pass with both a joint and a twist twin;
  - crossing coverage continues through fused joints.

  Results: both links asleep at sim 7.0-7.3, and frame cost at rest
  111-119 -> 5.0-7.5 ms. Browser sweeps 32/32 asleep and gesture battery
  48/48. Guarded by `test/physics/sleep.regression.test.ts`.

- **K19 + K20** · Maze stats (time, efficiency, junctions, dead ends) in
  the HUD and win banner, and a Wordle-style daily maze: `?daily`, Daily
  #1 = 2026-10-12, pinned by the frozen `DAILY_V1`, results and streaks
  in localStorage, emoji-grid share. Also: the last three MazeParams
  joined the codec, and the app now starts with storage blocked. Done in
  3b3e028 and 29b42a1 (2026-10-12). Probes: `.claude/probes/K19-K20/`.

- **K40** · The lane-cut limiter stack (likely a no-op). Done in 99443cb:
  G1 deleted it along with the erase grid.

- **K1** · GPU migration G1: per-pixel crossing gaps. Done in 99443cb
  (casing masks in the ribbon fragment shader replace the erase grid,
  over-fills and fade strip; per-pixel protect for cyclic triangles,
  far-branch smooth-min for concave creases) and 0f25f0f (fused-tip cap
  cover) (2026-10-11). User URL: overcut 1098 -> 1 px and naked 510 -> 5
  (asleep, df373b5), draw calls 419 -> 47, update() 12.0 -> 5.7 ms; GPU
  0.79 -> 1.78 ms/frame at 3200x1800; phone defaults 39 -> 60 fps.
  History: CLAUDE.md "PER-PIXEL CROSSING GAPS".

- **K31** · Levi's phone collapsed crossing 305 (`?k88dtb.oHFEfg`) to
  3.37 ctrl. Re-checked on the phone (Pixel 11, USB) with the kink fix
  (9920fab): 305 rests at 8.58 ctrl with an open eye and a clean
  gap-faded crossing; all 22 kinks 8.0-15.0 ctrl (median 8.69); asleep
  at sim 7.0 s, wall 10.1 s. Closed in the commit that moved this item
  here (probe: `.claude/probes/probe_k31.mjs`).

- **K28** · Intro vs physics settle: Levi chose option (b) - no interim
  settle-first loader; the intro stays over the live settle until K7's
  worker lets it run at full frame rate (folded into K7's acceptance).

- **K25** · Pluck size default: Levi chose bigger. Done in the commit that
  moved this item here - pluckSize defaults to 1.75 (codec v3; v2 links
  keep 1), panel max 2 -> 3.

- **K2** · Kink loops squished shut. Done in 9920fab: an eye ratchet (7
  thread widths of rest length, rising at the twist-ratchet rate), eye
  pressure across each loop, and no fairing inside kink loops. Every
  kink eye at rest is now >= 0.8 thread widths on the five census URLs
  (user URL: min 0.17 -> 0.97, 16/21 -> 0 under target); fat + default
  sweeps 16/16 asleep (was 13/16).
- **K18** · vitest rewrote the byte-identity snapshot's line endings on
  Windows. Done in the commit that moved this item here: `.gitattributes`
  keeps `*.snap` LF in the working tree.
- **K3** · Render-only plucks plus a physics-off mode (settle, stop
  simulating, then the appear animation; pluck only, no tug). Done in
  df373b5.
- **K17** · Deep URLs such as `levi.dev/knotmaze/foo/bar` failed (the SPA
  fallback served the page under the wrong relative base). Done in the
  commit that moved this item here: `public/404.html` turns off Pages'
  SPA fallback and sends any unknown path to the app root, keeping the
  link's token.
