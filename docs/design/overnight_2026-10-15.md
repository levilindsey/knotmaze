# Overnight: what merged, and the calls made for you (2026-10-14/15)

Every call below is built and easy to reverse. Say "keep all" to keep
them, or name the ones to change.

## Merged

- **23:32, the confetti's top edge (K335).** The rain still opens with
  one sudden wave, but its releases now taper over 2.2 s instead of
  stopping, and later pieces start a little higher, so the top of the
  wave thins out raggedly instead of ending in a line.
- **23:38, the arrow keys (K329, K333, K334).**
  - Every key now moves at a 4-way junction. The cause: at an X whose
    four arms all sit near diagonals, every key was tied between two
    arms, and K120's rule only settled a tie by elimination.
  - Two adjacent keys pressed within 80 ms make a diagonal chord.
  - Any input made during a move waits and is taken on arrival, and a
    held arrow chains into the next move with no gap.
- **00:40, the pluck cusp (K344).** The pluck blur is clipped along the
  line of the thread that passes over it. On a self-crossing loop, that
  over thread is the loop itself, right where the plucked stretch starts,
  so the clip cut a straight, sharp-cornered band out of the loop's own
  blur. The clip now stops short of the loop's own crossing. Crossings
  with other threads are unchanged.
  - Please check your link on the live build (crossing 104):
    https://levi.dev/knotmaze/?qoietk.KIiHgRRXwRlRt8fGrST4sf
- **00:45, physics in a Web Worker, stage 3 (K7).** It is off by default
  for now: add `&phw=1` to a link to try it. On the daily, on the
  desktop, with the worker compared to without it:
  - a drag runs at 55 fps instead of 7;
  - after a touch wakes the knot, it runs at 55.5 fps instead of 9.6;
  - the knot first falls asleep 12.2-12.5 s after load instead of 21.0.

  The intro's two freezes (3.1 s and 2.2 s, K307) are still there, and
  stage 4 is looking at what runs in them. If a browser can't run the
  worker, or the worker never gets ready, physics falls back to the main
  thread. The phone is untested: stage 5 tries the worker there and then
  makes it the default. Stage 4, the desktop acceptance, started at
  00:48.
- **00:55, the ledger diet (K353).** `LEDGER.md` went from 206 KB to
  112 KB (3,135 to 1,530 lines): 154 open items are shorter, 91 Done
  items are one-liners, and ten old Done items left the ledger. Nothing
  is lost: the original text of every item is in `docs/ledger_notes.md`
  and `docs/ledger_done.md`. Items that agents were still editing (K7,
  K8, K279) were skipped, and they get shortened on their next edit.
- **01:11, the plan for SDF ribbons (K8 stage 1).** Docs only. The plan
  to draw the ribbons and junctions from signed distance fields (G3/G4)
  is re-based on today's code. Its first code stage, a frame bench on
  the desktop and the phone (G3-0), is briefed and waits for a free
  slot. Its six calls are under Questions; none blocks G3-0.
- **01:14, the thread reveal in the game (K76 stage 2c).** The reveal
  can now be turned on from the panel (exploration: off, fog or
  threads), and it stays off by default. Moves feed it, input ignores
  hidden thread, the camera frames what shows, and an optional intro
  (`fwi=1`) closes the reveal in on the start. Its census found one real
  defect: at crossings where the gap takes its two-piece shape, two
  walked threads fuse instead of showing a gap. The gap stage (K268
  stage 2) started at 01:15 and fixes that first.
- **02:10, the pluck ripple, stage 2 (K279).**
  - Glint is now the default ripple (your B1 pick).
  - The ripple's filter warms up at load, so the first tap no longer
    hitches on it.
  - Ripples that are off-screen are skipped.
  - A minimum on-screen size (56 CSS px) keeps the ripple from
    shrinking away on the phone. The next phone round checks whether 56
    or 68 reads better.

  One small first-tap hitch remains, on both builds, ripple or not. It
  goes to the intro-freeze work (K307).
- **02:34, physics in a Web Worker, stage 4 (K7).** Probes and
  screenshots can now drive the worker, so it was measured properly. On
  the desktop, on the daily, with the worker compared to without it:
  - 56 fps between the intro's freezes instead of 40;
  - the knot first falls asleep at 12.4 s instead of 21.4;
  - a drag runs at 55 fps instead of 7;
  - from touch to screen takes 105 ms instead of 285.

  Dense designs are now limited by drawing (37.7 fps), not physics;
  that is the SDF ribbon work (K8). The intro's two freezes remain with
  or without the worker: they are shader compiles (K307), not physics.
  Stage 5, the phone pass, started at 02:35. If the phone passes, the
  worker becomes the default.
- **03:25, crossing gaps under the thread reveal, stage 2 (K268).** The
  reveal is still off by default.
  - The fused crossing the reveal's census found is fixed: two walked
    threads that meet at a crossing keep their gap.
  - Junction joints and thread caps fade in with their thread instead
    of popping in.
  - The junction fans and the still pluck take the same shaped gap.
  - With the reveal off, every frame is pixel-identical to before.

  The gaps' next stage (the census's own fixes, then the remaining
  shapes) waits for burnt threads (K290), which started at 03:27, since
  both edit the same shader files.
- **03:28, the plan to split `main.ts` and the renderer, and one frame
  loop (K5, K6).** Docs only: `docs/design/K5_K6_split.md`.
  - It maps both files and places the seams, so the SDF ribbons
    (G3/G4) become a module swap.
  - It designs a frame loop that draws only what changed.
  - It stages it all: eight `main.ts` stages, five renderer stages and
    three frame-loop stages. The first starts after the worker's phone
    pass merges.

  Two findings:
  - At the default settings the fabric never idles, because the pulses
    and the flow always move, so stopping the draw when nothing moves
    (K24) would rarely apply. That is Q5.1.
  - The background's drift never pauses in fabric mode, because the
    check meant to pause it is always true there. That is Q5.6.

  Its seven calls are Q5; none blocks the first stage.
- **03:42, physics in a Web Worker, stage 5: the phone (K7).** The
  worker now starts before the renderer does, and the phone pass ran on
  your Pixel. With the worker compared to without it:

  | | worker | without |
  |---|---|---|
  | 5 s drag | 33.7-37.3 fps | 4.4-4.5 fps |
  | after a touch wakes the knot | 34-37 fps | 7.6-12 fps |
  | touch to screen (median) | 231 ms | 872 ms |
  | first sleep | 9.9-16.2 s | 19.6-28.5 s |
  | intro frame time (95th percentile) | 33.4 ms | 50.1 ms |
  | first visible frame (median) | 1.11 s | 0.95 s |

  No errors on 22 loads. It missed one gate: the worker was ready 407 ms
  after the page's main script started (median), against a 250 ms
  target, so the stage left it off by default. Call F6 makes it the
  default anyway; stage 6 started at 03:49 to do that. Not run: a cold
  start of levi.dev on the phone, because the phone tooling clears the
  site's storage and would have wiped your daily records (K379).
- **03:55, the SDF ribbons' groundwork and frame bench (K8, G3-0).** The
  renderer now also fills the four tables the SDF ribbons (G3) will draw
  from, with nothing visible changed: a pixel A/B on 6 links differs by
  0 px, the GPU's copies match the CPU's tables exactly, and a scene
  saved and restored redraws to 0 px. The cost per frame is +0.16 ms at
  the defaults and +0.28 ms on a dense maze on the desktop, +0.33 ms on
  your Pixel (the limit was 1 ms), and the median frame time is the same
  on both builds. Your Pixel's largest texture is 8192 px, half the
  desktop's, which bounds G3-1's design. Stage 2 of the intro-freeze fix
  (K307: compile the shaders before the first frame) started at 03:55.
- **04:37, burnt threads (K290, burn stage 3a).** A new `burnt` setting
  in the Burn race folder chooses what the fire leaves behind. Gone, the
  default, cuts burnt thread out of the maze: a crossing's gap closes
  once the thread over it burns, and a junction's fan drops the burnt
  arm. Char draws it charred instead (0x22140e, with an ash core of
  0x7a3a22 on ribbons). With the fire off, or on with nothing burnt yet,
  frames match the old build to 0 px (62 checks). A race's frame cost is
  not measured yet (K382): from the first burn, every thread draws
  through the thread reveal's shaders. The thread reveal's last stage-2
  pass (K76 stage 2d: High contrast dots, the phone check, the final
  sheets) started at 04:41.
- **04:44, the physics worker is the default (K7, stage 6; call F6).**
  Every link now runs the knot's physics in a background worker. A link
  ending in `&phw=0` runs it the old way, on the page's main thread. One
  test changed (the pin on the default settings); the other pins held,
  and all 1131 tests pass. The bare link on the desktop loads with the
  worker, settles and falls asleep. Undoing it means reverting two
  commits (the switch and its notes). Older probe scripts that freeze the
  physics need `&phw=0` now; the 21 shared probe libraries work both
  ways. The first stage of splitting `main.ts` (K5, stage M1) started at
  04:46.
- **05:49, the shader warm-up (K307, stage 2; call F8).** A first-ever
  load now builds every shader before the knot appears, so once it shows,
  nothing stalls: the worst frame after it is 64 ms, where the old build
  stalled 2.9 s and then 2.2 s more. The cost is a later start on that
  first load: the page sits still until about 3.2 s and the knot shows at
  3.7 s, against 1.0 s before. Later loads are unchanged (0.8 s). A fire
  race's shaders are built up front too, and a test now fails when a new
  shader is missing from the list. Next is showing the loading spinner
  before that still stretch (K307 stage 3).
- **06:09, the thread reveal's last stage-2 pass (K76, stage 2d).** High
  contrast now draws the reveal's dots pure white, even over charred
  thread. On the desktop the reveal costs the GPU 0.86 ms a frame where
  the normal view costs 2.59 ms, and 9% more than the normal view once
  every thread is seen. The phone holds 60 fps at rest. One phone check
  fails: with the reveal on, each move rebuilds the thread geometry 1-5
  times, likely the cause of its worst frames (24-39 ms, against 11-21 ms
  with the reveal off). That fix is the reveal's next step, and the
  reveal stays off by default. Four junctions still draw differently
  under the reveal, the same four the old build gets wrong; they are the
  first job of the next crossing-gap stage (K268 stage 3). The phone also
  measured the threads' flow at rest: about 10 ms a frame (K387).
- **06:18, the first stage of splitting `main.ts` (K5, stage M1).** Code
  moves only, no behavior change: the loading indicator, the build stamp
  and the probe hooks left `main.ts` for their own files, taking it from
  5709 to 4869 lines. All 1155 tests pass, and screenshots of the knot
  and the maze match the old build to the pixel. The fog screenshot check
  did not, but runs of one unchanged build differ from each other by
  thousands of pixels too, so the noise is the check's, not the move's
  (K390). Three steps became one commit at the merge, because two of
  them did not build alone. The physics worker's stage 7 can go next.

## Calls made for you

- **F1. At an X, each key takes the diagonal arm clockwise of it**
  (up takes up-right, right takes down-right, and so on). The
  alternatives were chords only (a lone key does nothing at an X), each
  key taking its nearest arm (two keys share one arm, one arm gets no
  key), or counterclockwise.
  - Recommended: keep clockwise.
- **F2. The chord window is 80 ms.** Keys pressed "together" land 0-50
  ms apart, and a delay starts to show from about 100 ms.
  - Recommended: keep.
- **F3. A lone press waits out the chord window only when it is needed:**
  when the key alone is tied or matches nothing, and a chord with an
  adjacent key would pick a different run. In your maze that delays 41
  of 180 key-junction pairs; the broader rule would delay 115.
  - Recommended: keep.
- **F4. The thread reveal stays in the panel before its fused-crossing
  fix.** It is off by default, the site is pre-launch, and the fix is
  the first job of the gap stage that is running now. The alternative was
  to hide the option until the fix lands.
  - Recommended: keep.
- **F5. The worker can become the default even though touch-to-screen
  (105 ms) misses its design's 50 ms target.** That is still 2.7x faster
  than without the worker (285 ms). Where the 105 ms goes is its own
  item (K370), measured before anything changes.
  - Recommended: keep.
- **F6. The worker becomes the default although it misses its start
  gate.** On the phone it is ready 407 ms after the page starts
  (median), against a 250 ms target, and the first frame shows about
  0.16 s later (1.11 s against 0.95 s). Everything after that is better:
  drags run about 8x faster, a touch reaches the screen 3.8x sooner, and
  the knot falls asleep about twice as soon. The fix for the gate (the
  worker starts building the first knot while the page loads; inferred
  about 190 ms sooner) is stage 7, after the first `main.ts` split
  stage. `&phw=0` turns the worker off for one link.
  - Recommended: keep.
- **F7. Burnt thread is cut out by default, and char shows only what the
  thread reveal shows (K290).** Gone is the default and char the option.
  The setting is not daily-exempt, like the fire's own settings, so a
  daily plays with the fire off. Under the thread reveal, char draws only
  on thread the reveal shows, so burnt thread you have not seen stays
  hidden. The alternative charred every burnt stretch, which shows the
  fire's spread and, with it, the hidden maze. With the reveal off, once
  anything burns, the reveal's shaders draw the rest of the race (its
  cost is K382). Cut ends are hard at the fire, without a fade.
  - Recommended: keep.
- **F8. The shader warm-up builds shaders one at a time (K307).** The
  design asked for building them in parallel, which keeps the loading
  spinner turning, but Chrome then never saved the built shaders, so
  every load was as slow as a first-ever load (3.0-3.5 s to the knot,
  against 0.8 s). One at a time, they are saved, at the cost of a still
  page until about 3.2 s on a first-ever load. A way to get both is
  untested (K385).
  - Recommended: keep.

## Questions for you

Each has a recommendation. Say "all recommended" to take them all.

- **Q1. The settings panel (K339, sent at 00:06).** Four calls, each
  recommended yes:
  1. the new twelve-folder tree;
  2. the merges (confetti and dead ends fold into their amounts, and
     `snappiness` goes);
  3. look F for subfolders (the sheet sent at 00:06);
  4. word labels of at most 23 characters, with the panel at 320 px.

  Details: `docs/design/K339_panel_audit.md`. Your answers unblock the
  panel stage.
- **Q2. The SDF ribbon plan (K361; `docs/design/G3G4_sdf_geometry.md`,
  section 6).** None of these blocks the next stage.
  1. Junction webs shaped by a quadratic smooth minimum, picked from a
     contact sheet. Recommended: yes, sheet first.
  2. Webs give way to any other thread's outline, inset 1 px (today they
     paint over nearby threads at big junctions). Recommended: yes.
  3. The yarn's lane bias tapers at the ends of a pass. Recommended:
     accept.
  4. The phone keeps rendering at 2x. It is upscaled 1.31x, which reads
     slightly soft, and full resolution costs about 1.7x the fragments.
     Recommended: keep 2x until the frame-time scaler (K22).
  5. Drop the links' switches back to today's renderer (`rp`, `jp`)
     once you have checked each stage on the phone. Recommended: yes.
  6. Keep or drop the spline bend you are testing (K90). Needed before
     G3-2. Recommended: decide after your live test.
- **Q3. The thread reveal's intro and start view (K362).**
  1. The intro stays off by default (`fwi=1` turns it on, as for the
     fog's intro). Recommended: keep it off.
  2. The start view zooms all the way in (the 90 px/world cap), because
     only a few ctrl of thread show at the start. Recommended: stage 2d
     gives it a minimum span of about 2 x (revealDistance + 2), so it
     opens wider.
- **Q4. The ripple under High contrast (K368).** I recommend ring
  instead of glint there. Ring's white band reads on the black page;
  glint brightens the thread, and light threads have little room left
  to brighten. This is inferred, not yet seen on screen. The fallback
  is a stronger glint. Recommended: yes, ring.
- **Q5. Splitting `main.ts` and the renderer, and the frame loop (K5,
  K6; `docs/design/K5_K6_split.md`, section 8).** None blocks the first
  stage.
  1. **A slower rate at rest.** While only the ambient motion runs (the
     pulses and the flow), draw at 30 fps, and go back to full rate on
     the first frame anything else moves. Check on the phone that the
     pulses still look smooth before it ships.
     - Recommended: yes.
     - The alternative is full rate always, saving only in fully still
       scenes, which the defaults never reach.
  2. **Probes on an idle page.** Once an idle page stops drawing, a
     probe that times frames would see no frames. Probes switch to
     continuous drawing (`__knotLoop({continuous: true})`, and
     `idle: true` in diag_screenshot), and an idle page refreshes its
     stamp once a second.
     - Recommended: yes.
  3. **Split the renderer before the SDF ribbon stages, interleaved.**
     - Two split stages go before G3-1, which delays G3-1 by about 4 h
       of agent time; one goes before G3-2 and one before G4-1.
     - The later SDF stages then delete files instead of editing a
       1,000-1,700-line one.
     - Recommended: yes.
     - The alternative is to do the SDF work inside the big file.
  4. **Burnt threads (K290) go before the two split stages that move the
     gaps and the fans.** It is the feature you asked for, it started at
     03:27, and the split then moves its code along with the rest.
     - Recommended: yes.
  5. **CLAUDE.md's file map gets one line for each new folder**
     (`src/app/`, `src/render/ribbon/`). Each file's header comment is
     the per-file map. One line per file would add about 27 lines to a
     file near its size budget.
     - Recommended: yes.
  6. **The background's drift pauses after 2.5 s in a still fabric
     scene**, as the backgrounds were designed (K21). It matters only
     in a fabric scene with no pulses, flow or fog drift.
     - Recommended: yes.
  7. **The renderer's shared fields lose `private`** and carry an
     `@internal ribbon` tag.
     - Recommended: yes.
     - The alternative is a separate scene object. It needs every field
       access rewritten, which would conflict with every renderer item
       in flight.
- **Q6. Burnt thread: unseen fire fronts and the start marker (K290's
  stage 3b, K383).**
  1. **Fire fronts you have not seen.** Under the thread reveal, the
     fire's embers still draw at every front, seen or not: about 30 over
     hidden thread in one test, so they trace the hidden maze. Stage 3b
     replaces these embers with the front's char band and new embers.
     - Recommended: 3b draws an unseen front as nothing, the same rule
       char follows (F7).
     - The alternative is to show every front: you see the fire spread,
       and the maze with it.
  2. **The start marker once its thread burns.** Under gone it keeps
     drawing over empty space after its run burns. The exit marker
     hides once its point burns.
     - Recommended: keep it; it marks where you began.
     - The alternative is to hide it, like the exit marker.

## For the morning, with you

- **The ledger diet for the other repos** (you asked at 00:05 not to
  forget it). Knotmaze's diet ran at 00:55 (above), and its tool,
  `scripts/ledger_diet.mjs`, is the starting point. In the morning:
  - the same diet for claude-config's ledger and the other repos';
  - the claude-config side: the diet convention in `rules/ledger.md`, a
    shared ledger CLI, the merge script closing items itself, and a
    nightly hygiene job.
- **A small watcher fix to file in claude-config's ledger:**
  `agent_watch.mjs` prints each agent's branch from the transcript's
  recorded `gitBranch`, which was wrong for one agent tonight (it showed
  another agent's branch). `git worktree list` showed the right one.
- **The dev server on port 5173** runs from this session (on the LAN)
  and stops when it closes. It has no repo script yet; `npx vite --host
  0.0.0.0 --port 5173 --strictPort` restarts it, and a `scripts/dev.ps1`
  would let a ledger `env:` line name it.
- **The phone is still on wireless debugging** (<phone>:5555, over
  Tailscale), left up by the last phone check. It ends when the phone
  reboots, or with `adb disconnect <phone>:5555`.
- **The phone lock** (agents take one before using the phone) is a
  knotmaze probe script for now (`.claude/probes/agents/`); it could
  become a convention in claude-config's `rules/sessions.md`, beside the
  perf lock.
