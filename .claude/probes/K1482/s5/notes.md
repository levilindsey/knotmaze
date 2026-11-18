# K1482 s5 running notes

Start 02:53:35 (2 h cap 04:53).

## Item 0: the page builds with home at gfh=1
- src: gf_app.ts (the four build sites' option only: reference buildTables, the worker request, the in-thread
  gfBuild, the channel open), gf_build.ts (gfBuild(input, aa, home=false)), gf_worker.ts (Req.home, ChanOpen.home,
  Chan.home, single / pooled / fallback builds). Test: test/render/gf_build.test.ts "home: ...".
- Page check (previews: master 3f387e71 on 5680, tip 69a63364 on 5681; link A at hash fff8c9e5; s5/cap_s5.ps1):
  - master gfh=1: page homeOn false; tables = Node home 0 (EQUAL, tol 1e-12), != Node home 1 (pinWL 492, pinWR 484
    differ by up to 3.896, homeOn): the page never drew K1451's windows or clip.
  - tip gfh=1 pooled (pool 8): homeOn true, tables = Node buildTables(scene, {aa, home: true}) EQUAL in all 58 arrays
    (tol 1e-12: the page's lean scene export vs __knotSceneExport differ by ULPs in aL/k* on master too, home 0).
  - tip gfh=1 single (POOL=0, pool 0): EQUAL likewise.
  - home off: tip page tables = master page tables, every key bit for bit; ink at all 327 sites 0 px (site_diff.py),
    control master vs master also 0. Whole-frame ink XOR: tip 812 px vs master control 2126 px (load-to-load edge noise).
- Sweep at gfh=1, master vs tip (s5/site_diff.py, out/s5/diff_h1.png): 4 sites changed of 327, 7 px lost, 88 gained.
  4x sheets out/s5/tiles_h1_00.png (master | tip | diff), out/s5/tilesW_h1_00.png (R=40, master | tip):
  - t18e (master "stub 10" in the 46): the tail now joins the other thread's outline as a T instead of stopping short.
  - t50s (clean on master): the tail joins as a Y; the short tail gap is gone.
  - t21e, t2s: 3-4 px at the edge, same.

## Item 1: what the look's gap does at the 16 dot/tick/dash/break sites (03:40-03:50)
- Shader term switches on the tip's page (cap.mjs PATCH=<json>, s5/patch/*.json; same hash fff8c9e5; s5/attr.py):
  nogap (lkg = 0 in the composite), nowin (lkCut's K1423 window factor = 1), nofringe (lkFringe off). Frame-wide each
  changes ink (nogap 45905 px XOR: the small trims of the under outline at every crossing, out/s5/nogap_crop.png),
  but at the 16 item-1 sites nogap and nofringe change 0-2 px (within 1 px): the look's crossing gap neither draws nor
  removes any of these fragments. nowin opens wrong cuts into over outlines near t18e t23e t45s t46e t81s (tiles_nowin).
- So the premise "the mirror lacks the look's gap, so it cannot see the dots" does not hold with home tables: the
  mirror on the page's own gfh=1 tables (mirror_tiles.ts on out/s5/t_h1/tables_gf.json) against the screen
  (gm_count.py, R=18): extra 0 at all 16 sites, miss 0-3 px except t1s 20, t39s 9, t46e 7, t24s 6.
  Sheet out/s5/i1_screen_mirror.png (screen | mirror tinted by chain). The fragments are field ink, visible in eval.ts.
- j58 and t23s are ONE fragment (the dark triangle inside chain 23's fill: chain 43's side, winKind 1, at a T with
  no corner). Not the vertex cap: GfEval.vtx off (s5/mirror_novtx.ts, out/s5/i1_screen_mirror_novtx.png) leaves the
  triangle and instead opens notches at legit junction caps (j2 j22 t1s ...).
- Not done: a per-site grouping of the other 14, and any fix. Several item-1 sites (j2 j22 j29 j64 t65s t80s) show
  no fragment I can point to in the R=24 tiles: their s3 class needs re-reading against s3's own sheets.

## Build time, link A gfh=1 (03:42-03:48, under $env:TEMP\claude-perf.lock, taken by this agent; one load each, pool 8)
- stats.tablesMs (last 4 builds), master (home off at gfh=1): [17.7, 14.0, 20.4, 14.1]; tip (home on): [15.5, 16.2, 23.5, 26.4].
  workMs: master [20.9, 16.2, 22.3, 16.4]; tip [16.9, 17.6, 26.2, 29.6]. Home costs roughly +0-10 ms a build here
  (medians 15.9 vs 19.9 tablesMs); one load each, so the spread (14-26 ms) is as large as the difference.
- run4's "today" step (TODAY=1, home-off look on today's renderer) never froze on fff8c9e5 (10104c64 every load): dropped.

## Crossing fade slider at gfh=1 (coordinator's addition; 03:49-03:57)
- One frozen load per build (fff8c9e5), fadeLength set live like the slider (cap.mjs FLS=0.14/0/1.2), redraw, shoot.
  out/s5/m_fade, out/s5/t_fade; sheets (master fl 0|0.14|1.2, then tip fl 0|0.14|1.2, contrast-stretched):
  out/s5/fade_sheet_wide.png (4x of 96 device px = 2.25 world units: j0 j50 t18e t18s),
  out/s5/fade_sheet.png (sites where fl moves the tip most: j138 j15 j102 t53e t58e), fade_sheet_home.png.
- Scale: 42.6 device px per world unit, so fl 1.2 asks for a ~51 device px ramp.
- By eye: on master AND on the tip, fl 0 -> 1.2 only pulls the under thread's outline ends back a few px and softens
  their tip (j0, j50, j15, j102); nothing ramps over anything like 51 px. Frame-wide ink XOR fl 0 vs 1.2: master
  80340, tip 80961; per site the counts are equal on master and tip except where home draws (t18s 19 -> 54,
  t18e 45 -> 46... over R=20; R=48: t18e 378 -> 417, t18s 298 -> 337). So the home-off build was NOT why the slider
  looks dead: the tip with home on looks the same to the eye, plus a short soft end on the home dives (t18e's tail).
- What decides the fade there (from gf_look.ts's lkCut comments and code, not measured term by term): the crossing
  cut acts only on pixels within h + gap of the over piece's centre line, and its ramp width is
  fadeLength * max(sin, 0.2), floored at one pixel, inside that band; the band, not fadeLength, bounds how far the
  ramp can reach, so a longer fade only softens the last few px. The home fade (uHomeZ = fadeLength * amp / win)
  moves the dive's depth threshold, which also lands inside the same short window. No fix started (per the
  coordinator).

## Carry-across, gfh=1 removed (04:03, same hash fff8c9e5; one load per build, fadeLength live 0 then 1.2)
- site_diff m_nh vs t_nh: fl 0: 0 of 327 sites changed (0 px either way); fl 1.2: 0 of 327 (0 px).
  Frames out/s5/m_nh|t_nh/gf_fls0.png, gf_fls1.2.png (not committed); no sheet drawn: there is nothing to tile.
- hold.mjs on link A, tip build 69a63364 (warm profile): PASS 60/60 (edges 7185-9363; min frame 35).

## The K1436 bar, STRICT=1 (04:05-04:27): -Ref 69a63364 -Base 9f2c226f -HomeFlag 1 -Scenes ring,def,muse_hash,g41_user_tw64
- FAIL: new 10, grown 0, gone 7 (.claude/probes/K1436/out/bar/k1482s5/bar.txt, sheet.png, sheet.txt).
- Five of the ten are the same find changing class at the same px (cut:ramp -> cut:plain): g41 j0 20, x69 4, j66 15,
  x100 102, muse j81 26; and g41 j7 speck plain -> ramp 4 px. Real changes, by eye on sheet.png rows 4-10
  (out/s5/bar_sheet_rows4to10.png): g41_user_tw64 x154 (7.22:15.51, cut 59 px): the ref's fill edge along the cut is
  RAGGED (stair steps) - worse; g41 j25 (cut tie 15 px -> ramp 26 px): a small extra step, slightly worse;
  muse_hash j49 (22.04:34.65, cut 17 px): the ref draws a tail's outline into the junction as a T (t18e's change) -
  a look question, not judged; muse_hash j58 rstray 22 px: the speck is in both tiles, unchanged by eye.
- K1451 s4's spots and j71 (out/s5/spots_5_7_j71.png, base | ref, fill then border, 4x of 80 device px):
  spot 5 (muse_hash 21.86:18.64) and spot 7 (16.17:18.39): the base border's step where the thread meets the
  junction is gone on the ref - FIXED on screen. j71 (g41_user_tw64 4.981:7.472): the ref's stub end is squared and
  bumps up at its right end (the trapezoid from K1451 s4's pin window), where the base had a pointed wedge end:
  K1470's seam shape, now visible on the page.
