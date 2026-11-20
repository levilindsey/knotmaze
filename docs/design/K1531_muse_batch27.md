# K1531: Muse batch 27, captures and guards that can be trusted (2026-11-19)

Six runs (tags 27A-27F; 27E and 27F were added 2026-11-19 23:55), started by Claude through Paseo with the K1053 chain, one after another in the main
checkout. **This brief is the authority and is self-contained: do not read the older batch briefs' rule
lists.** Levi (2026-11-11): junctions and outlines are the priority; a Claude agent is on rp=gf's corner
faults (K1482) and judges them with captures, the K1436 bar and the fade and drag guards. Three stages this
week lost time to captures that disagreed with themselves and to a guard that is red on master. These runs
fix that. They are probe runs first: `src/` changes only where a run's Done says so.

**rp=gf** (K1362) draws the junction and outline look per pixel on the GPU (`src/render/gpu_field/`); it is
opt-in (`rp=gf` in a link). **Today's look** is the default renderer. Link A is
`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (physics hash fff8c9e5 at simT 20).

## How to work (every run)

- **Read first:** your run's section, its ledger items (`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs
  show <ID> --repo .`), the documents it names, then the `.claude/rules/` files whose `paths:` cover the files
  you touch (`docs/lore_index.md` maps them; always `render-gpu-field.md`, `render.md`, `probes.md`). Muse does
  not load them by itself.
- **Checkout:** the main checkout, on master. Start with `git pull --rebase --autostash`. Leave it on master,
  clean (no tracked changes) and level with origin/master when you stop: the chain checks that.
- PowerShell. Read code with Select-String and 40-80 line ranges of Get-Content; never print a whole file.
  Write TypeScript and `.mjs` through Node or the editor, never through PowerShell text IO. No subagents.
- **Hands off** `src/render/gpu_field/tables.ts`, `eval.ts`, `gf_keys.ts`, `gf_glsl.ts`, `gf_look.ts` and
  `gf_pass.ts`: the Claude agent is changing them. If a fix needs a change there, file it (below) with your
  evidence and stop that part.
- **Servers and probes:** a port of your own, 5480-5499 (never 5173, Levi's). Builds through
  `pwsh scripts/preview.ps1 -Port <p> [-Ref <commit>]`, at most three alive; stop them and remove their
  directories and Chrome profiles when you finish (the disk is short); a tool with a `-Port` (the bar) takes
  one of yours. Never `--virtual-time-budget`; headed real-GPU Chrome off-screen (`probes.md`). Never touch
  the phone. At most 4 parallel Chrome or Node workers.
- **The perf lock** for every pixel-exact capture and every timing, **taken only through
  `scripts/perf_lock.ps1`** (changed 2026-11-19, K1533): `pwsh scripts/perf_lock.ps1 -Owner "muse-27<X>" -What
  "<what>" -Cmd "<the capture command>"`. It waits while another owner holds the lock (one blocking command, up
  to `-MaxWaitMin`, default 60), takes it, runs the command and releases it, also when the command fails. One
  capture sequence of at most 25 minutes per call. Never write or `Remove-Item` `$env:TEMP\claude-perf.lock`
  yourself: 27A's "remove it, write my line, run" removed whatever lock was there and re-took its own with no
  gap, so the Claude agent's guards waited 80 minutes and never ran.
- **Same-state captures:** freeze through `.claude/probes/freeze_parity.mjs`'s `alignFreezeParity`
  (Handoffs 26V and 26X in `docs/design/K1464_muse_batch26.md`: only those two handoffs, by Select-String).
  Compare two captures only when their physics hashes agree, and say which hash.
- **Bars:** measure a pixel bar's floor first (two captures of one build on one state) and report it beside
  the result. A pixel count is never the whole proof: put 4x crops with their surroundings under
  `.claude/probes/<ID>/out/27<X>/` (untracked; today | master gf | new) and write what you see at each,
  including what is worse. You match a reference, never invent a look.
- **Commits:** each finished, tested part: stage files by name (scripts under `.claude/` need `git add -f`),
  `npm test` green, the message ends `(Muse batch 27 Run <X>, 27<X>)`, then `git pull --rebase --autostash` and
  `git push origin master`. Never force-push, skip hooks, or commit outputs (`out/`, PNGs, dumps). After a push
  that touches `src/`, watch its deploy (`gh run list --workflow deploy.yml --limit 3`) and fix red first.
- **Ledger:** a new item's ID comes only from `ledger.mjs add --section Residuals --text "..." --repo .` (never
  type an ID). Bring the checkout level with origin/master right before an `add` (`git pull --ff-only origin master`; commit your work first if it refuses): the ID is one more than the highest in YOUR checkout, and a checkout that is behind hands out a taken one (27B's K1536). Before `ledger.mjs done <ID> --commit <sha> --repo .`, run `show <ID>` and check the text is
  your run's item. Close only your run's item, and only when every Done holds. Leave K1531 and K1482 open.
- **A run that changes `src/`** ends with the ordinary-load guards on a build of its commit, one kept profile:
  `node .claude/probes/K1450/hold.mjs <url> <outDir> <profileDir> 60 250 5000` on `?3&xp=off&am=instant&rp=gf`
  and on link A, and `.claude/probes/K1458/dragcheck.mjs` for gf and gfh. A probe-only run skips them and says so.
- **Time:** `Get-Date` at the start and at each milestone. Stop at 2 h or when every Done holds. A Done that
  looks out of reach is not a stop: spend the time on the next most promising part. At the stop line land what
  is finished and keep the rest as a patch under `.claude/probes/<ID>/` (untracked). Then append
  `### Handoff 27<X>` under your run's section (start and stop times, numbers before and after, what changed,
  what is left, what you tried that failed and why), commit, push, and report.

## Run A (27A): two redraws of one frozen state agree (K1530)

On `?3&xp=off&am=instant&rp=gf` master gf gives a different picture on two redraws of ONE frozen state:
K1525 s1's capture tool (`.claude/probes/K1525/s1/cap.mjs`, jobs in `jobs_q3.json`, notes in `notes.md`) steps
to simT 20, pins the paint clocks and the background, takes two shots and marks every shot of that link
UNSTABLE. Link A is stable (0 px). Suspects, untested: K390's start-marker flip, fog or explore ticks.
Done: 1. Reproduced with numbers on 10 loads: px that differ between the two shots, their bounding boxes and
which feature they sit on (marker, fog, thread, background), for rp=gf and for today's renderer. 2. The cause
named with evidence: dump the uniforms, clocks and data-texture hashes at both redraws and show what differs.
3. Fixed. If the page legitimately animates there, the capture pins that clock: in `cap.mjs` and in the helper
the other tools share (name each tool that now takes it). If one state draws two pictures with every clock
pinned, that is a render bug: fix it outside the hands-off files, else file it. Then two redraws agree, 0 px,
on 10 of 10 loads on that link and on link A. 4. One same-state sheet of K1463's spot (the notch at the lower
right of `.claude/probes/K1458/live/zoom_a.png`), today | master gf, with surroundings and at 4x, path in the
handoff. Do not fix K1463. 5. `npm test` green; K1530 closed with the commit.

### Handoff 27A (Muse, 2026-11-19, done: every Done holds; K1530 closed in b3f4be04a)

Started 14:18 PST, stopped 16:13 PST. Starting master 31e40ca9f; fix on master in b3f4be04a (src/app/probe_hooks.ts + .claude/probes/K1525/s1/cap.mjs + the new .claude/probes/K1530/ tools; no hands-off file touched). Perf lock held for each capture sequence, released at the end. Captures and dumps under .claude/probes/K1530/out/27A/ (repro/diag pairs + dumps, capfix/, fade/, guards/, k1463_sheet.png).

Done 1 (reproduced, 10 loads each, preview of 31e40ca9f on :5482, kept profile, cap.mjs's own pin). Two redraws of one frozen state (hash f9d72040 on every load) differ on every load: rp=gf 679,735 / 692,320 / 705,514 / 717,572 / 707,278 / 714,506 / 707,782 / 701,075 / 704,673 / 716,661 px; today's renderer 710,197-729,612 px. Bounding box x 689..2450, y 26..1714 (the whole knot) on both renderers; the differing px sit on the threads (every thread row, colour deltas up to 255: the flow-displaced shading), not on a marker, fog or the background (background alone differs by 1 level of dither). K390's start-marker flip, fog and explore ticks are ruled out: dumps at both redraws show paintClock 100, pulseBorn 0, exploreClock, view and physics hash all identical; only flowTime moves (e.g. 1.84 -> 2.59 -> 3.23 across pre/A/B).

Done 2 (the cause). __knotPinClocks pinned advanceClocks/paintClock/pulseBorn, the background and the fabric explore clock, but left tickPaint running with real dt; tickPaint advances the flow clock (flowTime += dt * flowSpeed, paint_state.ts) and the palette/appear work, so the displaced geometry and shading moved between redraws. Evidence chain: fw=0 cuts the diff 707k -> 190k (flow displacement off, clock still moving); stopping tickPaint after one tick gives 0 px from the first shot; K1139's hand PIN (.claude/probes/K1139/lib.mjs:88), which the hook's comment says it mirrors, wraps tickPaint at dt 0 - the hook had dropped that line. With the wrap, flowTime reads identical at both redraws and the redraws agree, so the gf tables/uniforms agree too (no data-texture difference left to name). gf needs two warm redraws after the pin before the compared pair (builds in flight at the pin, depth 2 at rest, still show pre-pin state: first compared pair differed 68-97k on 9 of 10 loads with one warm redraw, 0 with two; diag.mjs shot sequence 179,593 -> 0 -> 0).

Done 3 (fixed, b3f4be04a). src/app/probe_hooks.ts: __knotPinClocks now wraps renderer.tickPaint at dt 0 (bind + 0), as the K1139 PIN does. cap.mjs: freeze() pins through __knotPinClocks(100) instead of its partial hand pin (which also missed the explore clock). Tools that now take the fixed pin: every __knotPinClocks caller - K1139 (ab.mjs, ab_cyc.mjs, ab_s3b.mjs, sheets_cyc.mjs, hookcheck.mjs), K1186 (ab21e.mjs, ab22c.mjs, crops.mjs, flips.mjs, pc21e.mjs), K1202 (frames21c_claude.mjs, sheet21c.mjs, sheets_cyc.mjs), K1203 (check_gpu.mjs, check_gpu2.mjs) - plus cap.mjs. Verified on the fixed build (:5483 working tree, then guards on -Ref b3f4be04a): after two warm redraws, two redraws agree at 0 px on 10/10 loads of ?3&xp=off&am=instant&rp=gf (hash f9d72040) and 10/10 of link A (hash fff8c9e5); cap.mjs on jobs_q3.json prints no UNSTABLE (q3_gf tries [2,1,1,1,1,1,1,1], q3_today [1 x8]). The page legitimately animates here (flow undulation is a live look), so the capture pins it; no render bug and nothing filed against the hands-off files.

Done 4 (K1463's spot). Same-state sheet (state f9d72040, capfix captures, fade 0.14 and 1.2, today | master gf, surroundings + 4x): .claude/probes/K1530/out/27A/k1463_sheet.png (spot located by masked template match against zoom_a.png's today tile: device (1152,900), 152 px window). At 4x the gf pink tip still shows a small hard notch/step where it meets the blue band, against today's smooth contour, at both fades - K1463 itself not judged or fixed here, as briefed.

Done 5: npm test green (256 files, 3199 passed, 9 skipped; tsc clean). K1530 closed in b3f4be04a; its deploy (44640512146) succeeded. Guards on a preview of b3f4be04a (:5484, the kept profile above): hold.mjs 60 250 5000 PASS on ?3&xp=off&am=instant&rp=gf (60/60, edges min 102,769) and on link A (60/60, min 7,010); dragcheck.mjs PASS for gf (130 / 56 / 0 px over TOL 24) and gfh (0 / 0 / 0). fade.mjs on that build keeps its standing K1494 FAIL on dot counts only (83 / 96 / 65 / 103 sides over 2 dots; distances pass, sameState true) - 27C's item, untouched. K1531 and K1482 left open. Preview servers (5482, 5483, 5484) and probe Chromes stopped; preview dirs and the run's Chrome profile removed.

## Run B (27B): every load of one build lands on one view (K1529)

Read Handoff 27A first. K1482 s21 (`docs/design/K1482_s21_corners_rest.md`, "The 76,609 px fill difference"):
in A/B captures of rp=gf on link A some loads land on a view shifted by under a pixel, so two loads of one
build on one physics hash differ at 76,609 px, all on antialiased edges and soft shadows. Ruled out there: the
reload after a hash miss, concurrent GPU use, the background. Inferred, not tested: a per-page view state such
as the eased camera's offset.
Done: 1. Reproduced: 12 loads of master's preview on link A, fill (`&tlk=fill`) and border looks, through the
capture path s21 used (name it) and through the bar's `.claude/probes/K1436/k1436_screen.mjs`: how many distinct
pictures, and each load's `view.x`, `view.y`, `view.s`, dpr and canvas size. 2. The cause named with evidence
(the bounds-following viewport's last step, a resize, a scrollbar, a rounding of the device pixel ratio...).
3. Fixed in the capture helpers: the view is pinned or snapped so 12 of 12 loads give 0 px in both looks, and
the bar's control (`.claude/probes/K1436/k1436_bar.ps1`, `-Ref` and `-Base` both master, scenes
`ring,def,muse_hash,g41_user_tw64`) reads new 0, grown 0, gone 0 three times in a row. If the app's own view
at rest differs between loads (a user would see it), say so with numbers and fix it in `src/` outside the
hands-off files, else file it. 4. `npm test` green; K1529 closed with the commit.

### Handoff 27B (Muse, 2026-11-19, done: every Done holds; K1529 closed in 434a34092)

Started 16:24 PST, stopped 21:07 PST (much of it queued behind other agents' perf-lock sequences). Starting master 3e7eef326; fix on master in 434a34092 (probes only: the new .claude/probes/view_still.mjs, .claude/probes/K1436/k1436_screen.mjs, .claude/probes/K1482/cap.mjs, plus the run's tools under .claude/probes/K1529/; no src/, no hands-off file). Preview of master on :5481 (src identical to c8a91eb3, the bar controls' build). Every capture sequence through scripts/perf_lock.ps1 -Owner "muse-27B". Captures, trajectories and 4x crops under .claude/probes/K1529/out/27B/ (s21-base/, bar-base12/, bar-fix12/, cap-fix12/, cap-fix12b/, viewprobe/, drift_4x_base.png, drift_4x_fixed.png). Link A on hash fff8c9e5 everywhere below.

Done 1 (reproduced, 12 loads per path). Through the capture path s21 used (named: .claude/worktrees/agent-afdf2b8bb494bb380/.claude/probes/K1482/s21/cap21.ps1 -> cap21b.mjs, = K1482 s15 cap15.mjs + FORCE2; 1600x900, DSF 2, canvas 3200x1800 device px; FILL=1): fill 1 distinct picture, 0 px on 12 of 12; border (gf.png) 12 distinct pictures, vs load 01: 28,775 / 37,162-53,994 px differ (levels 1: ~25-30k, 2-3: 1.0-18.9k, >8: 84-1,608, max 26-32, mean 1.09-2.50), bbox x 734..2429 y 66..1707 (the whole knot), image corners 0. View at sites time (post-shot read) x 417.23864033820786, y 67.92990598455434, s 21.296838875313163, dpr 2 on all 12. Seven loads first froze on 10104c64 and reloaded to fff8c9e5, so both groups (reloaded / first-try) contain agreeing fill and disagreeing border shots. Through the bar's .claude/probes/K1436/k1436_screen.mjs (job t=20.0167 - t=20 steps to 19.992 under its t-0.008 recipe and lands on 8c308669, named here; t=20.0167 makes its parity target 2402 substeps, fff8c9e5 in 1 try on all 12): view x 237.23864033820786, y 67.92990598455434, s 21.296838875313163, zoom 1, pan 0, dpr 3, 1240x900 CSS / 3720x2700 device px on all 12; fill 1 distinct picture, 0 px (stableShot 3 shots on 11 loads, 2 on one); border 1 distinct picture, 0 px (2 shots each). Floor, reported beside the drift as briefed: on one build and one state the s21 path's fill and the bar path's both looks self-agree at 0 px; only the s21 path's first (border) shot wanders. On current master the 76,609 px figure itself does not recur in fill (s21 measured it across build pairs whose loads took different reload paths); the same fault, smaller, lives in the border shot.

Done 2 (the cause: the fit camera's last ease, caught in the first shot). .claude/probes/K1529/viewprobe.mjs (cap21b's load/freeze, parity aligned), 3 loads, world transform polled every 200 ms for 12 s after the freeze: at 2,200 ms - the moment cap21b shoots (sleep 1500 + one redraw) - loads 2 and 3 sit off their resting view by dx +0.049/+0.062, dy +0.145/+0.187 CSS px (0.10-0.37 device px) and keep moving; both become bit-still only at 4,881 / 5,161 ms and land bit-exact on x 417.23864033820786, y 67.92990598455434, s 21.296838875313163. Load 1 was already still at the first poll (its pre-freeze frames happened to finish the ease). The offset is the bounds-following fit ease (FIT_EASE 0.08 of the remainder per frame, src/app/camera.ts updateCamera, snapping only under 0.01 px): how many frames a load ran before the freeze sets the remainder, so the shot's sub-pixel offset differs per load and every antialiased edge shifts by 1-3 levels. Ruled out with numbers above: the hash-miss reload, concurrent GPU use (every sequence held the perf lock, one page at a time), the background (corners 0; fill, which shows none, agrees), dpr and canvas size (2 / 3200x1800 on every s21 load, 3 / 3720x2700 on every bar load), the physics state (one hash, parity-aligned in the bar path), paint and flow clocks (on the same pages the fill shots agree). The app's own view at rest agrees across loads to <= 0.001 device px (load 1's rest sits dx 7.6e-5, dy 4.7e-4 CSS px off the other two - the snap band's residue, three orders under a pixel; no user sees it), so there is no src/ fix and nothing filed against the hands-off files.

Done 3 (fixed in the capture helpers; the view is pinned by waiting for it). New shared .claude/probes/view_still.mjs: waitViewStill(page) polls the renderer root's world transform in device px at 17 digits until 10 polls in a row (200 ms apart, frames running) are exactly equal - K1482 s23's B2 recipe (probes.md) generalized - and returns that view. .claude/probes/K1436/k1436_screen.mjs waits for it after the freeze, before the first shot (logs "view still x=... y=... s=... dpr=...", warns and shoots unpinned if 60 s pass; stableShot stays as the net for a gf build still in flight). .claude/probes/K1482/cap.mjs's waitViewSettled (K1508: two samples 250 ms apart) now delegates to it. Tools that take the pin: k1436_screen.mjs (the bar and every census capture) and K1482/cap.mjs; s21's cap21b.mjs is an untracked worktree copy and cannot take it - master's cap.mjs is that lineage's maintained copy. Verified on the fixed helpers: k1436_screen 12 of 12 loads 0 px in both looks (fill md5 10df369488, identical to the base run's; border 0 px against the base run's picture - the pin lands the same settled view stableShot used to find by reshooting, stable now 2/2 shots on every load); cap.mjs 13 captured loads (11 of 12 in the set, 2 of 2 in a supplement) 0 px in both looks, its settled border matching none of s21's twelve (vs s21 load 01: 45,542 px of the same 1-3-level signature) while its fill equals s21's fill at 0 px. One cap load exhausted TRIES=6 on 10104c64: cap.mjs freezes without alignFreezeParity and plays the K1519 lottery, which is not the view; filed as K1539 with the cure (the add first numbered it K1536, an ID already taken: the checkout was behind origin; the coordinator renumbered it). Bar control (.claude/probes/K1436/k1436_bar.ps1 -Ref master -Base master -Scenes ring,def,muse_hash,g41_user_tw64, ports 5482-5484, tags 27B_ctrl1/2/3; screens taken by the fixed helper): PASS new 0, grown 0, gone 0 three times in a row, every scene on its K868 hash (ring 50dd4ffd, def 910ff135, muse_hash 733ee14a, g41_user_tw64 0d51331b), view-still logged on each. The 4x crops (drift_4x_fixed.png: s21 load 01 | s21 load 06 | fixed cap load 01, centre (880,200) device px at DSF 2, half 120): the three tiles are indistinguishable to my eye - the start marker sits identically registered in each, the dark border strokes cross the dark paper in the same place; the counted differences are 1-3 levels of antialiasing on thread edges, below what a crop can show, and nothing in the fixed tile reads worse than either mid-ease tile.

Done 4: npm test green on the landed tree (257 files passed, 2 skipped; 3206 tests passed, 9 skipped; tsc clean). K1529 closed with 434a34092; K1531 and K1482 left open. Probe-only change (no src/), so no ordinary-load guards and no deploy (a .claude//docs push does not deploy). Tried and left: an early bar run with job t=20 froze on 8c308669 (see Done 1) and was discarded, not measured; a lock run I terminated left orphan Chromes on the run's profile - killed by their verified command lines, their (lock-free) captures deleted and rerun under the lock; viewprobe load 1's sub-thousandth rest offset is named in Done 2, not chased. Preview :5481 and the run's Chrome profiles (k1529-*) stopped and removed at the stop line.

## Run C (27C): fade.mjs's verdict means something (K1494)

`.claude/probes/K1458/fade.mjs` prints FADE GUARD FAIL on master (26F; 26X 10 of 10 on one state; K1525 s1 on
330069e61). Its distances pass at every fade (678/679, 627/631, 439/451, 676/679 sides at fl 0 / 0.5 / 1.2 /
0.14); what fails is K1460's dot criterion: 79 / 98 / 68 / 103 sides with more than 2 dots, gf and gfh alike.
A guard that is always red proves nothing.
Done: 1. On a preview of 7fe4b9c6 (K1460's close): does the dot criterion pass? Numbers per fade. 2. If it
passed there, bisect to the commit that brought the dots back and name what it changed. If it failed there
too, show what the count sees: 4x crops with surroundings at five dot sides, today | gf (real dots, or a
counting artifact such as the K1474 colour mapping). 3. Then: a counting artifact is fixed in the count, and
five former dot sides read 0. Real dots from code outside the hands-off files are fixed. Real dots from inside
them are filed with the commit, the crops and the counts, and fade.mjs reports the dot criterion on its own
line (`DOTS FAIL (K<id>)`) so its distance verdict is a usable guard again. 4. fade.mjs on master: its verdict
passes, or names exactly the filed item; 3 runs in a row agree. 5. `npm test` green; K1494 closed with the
commit, or what is left recorded in it.

## Run D (27D): one physics state per census scene (K1479)

26V (3ae03fdcb) fixed the bar's freeze parity in `k1436_screen.mjs`: all 12 scenes freeze on their K868 hash
in one try. K1479 stays open for what 26V did not cover (`### Handoff K1436 s3` in
`docs/design/K1436_s3_screen_bar.md` has the first sighting: ring on 50dd4ffd and 0a0ee15e within one build).
Done: 1. `ring`: 10 loads through `k1436_screen.mjs` and 10 through `.claude/probes/K1468/ab.mjs` land on one hash each
(`ab.mjs` takes `alignFreezeParity` if it does not have it). 2. `g41_user_tw42` against
`user_tw42.lightpaper`: decode both links' params. If they are one physics state by design (one seed and
params, another paint), the census counts the pair's finds once (name where); if not, find what makes
`g41_user_tw42` freeze on the other's state and fix it. 3. The stale hashes: per scene, every hash the K868
census, the bar's scene table and the pins under `test/` carry, against a fresh freeze on master; re-take the
stale ones in one commit, each named old -> new. 4. The bar's control (`-Ref` and `-Base` both master, all 12
scenes): new 0, grown 0, gone 0, no scene skipped. 5. `npm test` green; K1479 closed with the commit.

### Handoff 27D (Muse, 2026-11-19, done: every Done holds; K1479 closed in 7b5d80a78)

Started 21:26 PST, stopped 22:47 PST. Starting master 7fbd67e48; fix on master in 7b5d80a78 (probes only: `.claude/probes/K1468/ab.mjs`, `.claude/probes/K1436/k1436_bar_cmp.mjs`, `.claude/probes/K1436/k1436_s3_table.mjs`, plus the run's tools under `.claude/probes/K1479/`; no `src/`, no hands-off file, so no deploy and, as a probe-only run, no ordinary-load guards). Preview of master on :5485 (stopped and removed at the stop line); every capture sequence through `scripts/perf_lock.ps1 -Owner "muse-27D"` except the bar, which waits on the lock itself (it waited out K1482 s28's sequences from 21:59; its base captures then ran while that agent re-took the lock at 22:30 — the verdict below is still 0/0/0 with every freeze 1 try). Evidence under `.claude/probes/K1479/out/` (`ring_screen/ring_r*/meta.json`, `ring_ab/`, `fresh12/<scene>/meta.json`, `dedup_test/`); the bar's output is `.claude/probes/K1436/out/bar/27D_ctrl/bar.txt`.

Done 1 (ring, one hash per path). Through `k1436_screen.mjs` (bar jobs for ring, STRICT, kept profile): 10/10 loads freeze on 50dd4ffd, 1 try each, `0a0ee15e` never seen. `ab.mjs` lacked the parity alignment (it froze then stepped, the K1468 s2 lottery): it now calls `alignFreezeParity(page, SIMT)` before its freeze+StepUntil evaluate, and gained link `R` (the K868 ring link at `rp=gf&gfh=1`). Through it at SIMT 40.01666666666504: 10/10 loads hash 50dd4ffd. (Each ab load also logged one `webglcontextlost` from Pixi's support-test canvas, which its hook counts; hashes unaffected.)

Done 2 (the pair is one design; the census counts it once). `.claude/probes/K1479/decode_pair.ts` (the app's own `parseParams` on the K868 job links, `decodeToken` on the exported tokens): same seed 2430477599; the job links differ only in `background` (vellum/wash), `backgroundBase` (#151b28/#e6e9ee) and `backgroundColorMode` (gamut/custom) — paint only (the K868 census already showed the background moves neither hash nor geomHash). The diags freeze one substep apart (g41 substep 4801 hash a5f6d198, lightpaper 4802 hash 462652e7), and a fresh STRICT freeze of the identical bar query reproduces exactly those hashes at those substeps, so nothing "makes" one freeze on the other's state beyond the export-time parity choice. Counted once, in two named places: `k1436_bar_cmp.mjs` DEDUPs `user_tw42.lightpaper` under `g41_user_tw42` (its finds never enter new/grown/gone; a `DEDUP` line and a `deduped` count in bar.txt/bar.json say so; it is not a K1519 skip — both scenes still freeze and capture, and Done 4's "no scene skipped" holds), and `k1436_s3_table.mjs` excludes the lightpaper scene from the census totals with its per-scene row marked `(dup of g41_user_tw42, K1479)`. A synthetic two-scene comparator run prints `DEDUP ... finds counted once` with new/grown/gone 0.

Done 3 (no stale hashes; old -> new is identity for all 12). Fresh STRICT freezes on master (bar queries, 1 try each, `fresh12/`): muse_hash 733ee14a, def 910ff135, fat 814c4e1e, muse_default_tw c5d9f3b6, ring 50dd4ffd, g41_def_tw42 da10b9a5, g41_def_tw64 5ccb276f, g41_ring_tw42 f7b1dff2, g41_ring_tw64 ea67fc77, g41_user_tw42 a5f6d198, g41_user_tw64 0d51331b, user_tw42.lightpaper 462652e7. Carriers checked per scene: the K868 diag `frozenHash`/`frozenSim` and the README table (the same values), the bar's scene table (`k1436_bar.ps1` Get-Jobs reads those diags; `K1479/make_jobs.mjs` mirrors it), `.claude/probes/K1240/s4/k1240s4_crops.mjs`'s three (def, muse_default_tw, g41_ring_tw64 — all match), and `test/`, which carries no physics-hash pins (the outline pins digest the K868 scene files' geometry, which a matching freeze hash leaves untouched). Nothing was stale, so nothing was re-taken; the per-scene old -> new list is the fix commit's message (7b5d80a78).

Done 4 (bar control). `k1436_bar.ps1 -Ref master -Base master -Port 5486 -Tag 27D_ctrl` on 7b5d80a78, all 12 scenes: `PASS new 0 grown 0 gone 0 deduped 1 (user_tw42.lightpaper)`, missing 0, skipped 0, no FREEZE lines; all 24 captures (base and ref) froze 1 try on their K868 hash (the table in Done 3).

Done 5: `npm test` green (257 files passed, 2 skipped; 3206 tests passed, 9 skipped; tsc clean). K1479 closed in 7b5d80a78; K1531 and K1482 left open. Tried and left: nothing failed and was dropped — the bar's 30-minute lock wait and the under-load base captures are recorded above; `fix_s3.mjs` (the one-shot patch that applied the s3-table edit) is kept with the run's tools. Preview :5485, the bar's :5486, and the run's Chrome profiles (`k1479-screen-profile`, `k1479-ab-profile`) stopped and removed.

## Run E (27E): the test run that failed once gets a name (K1543)

Added 2026-11-19 23:55. Between 22:46 and 23:08 that day `npm test` failed once, 3 tests in 1 file, in K1482
stage 28's guard sequence: right after its two drag checks, while 27D's bar was capturing. The script kept the
last 6 lines, so nobody knows which tests. Four later runs of the same code passed. Machine load is a guess,
not tested. `vitest.config.ts` sets `testTimeout: 30000` and some tests set their own. Piped, the default
reporter prints no per-test times: add the JSON reporter (`npx vitest run --reporter=default --reporter=json
--outputFile=<file>`; `npm test` runs `tsc` first, time that apart).
Done: 1. The idle table: one run on master with nothing else running (through `scripts/perf_lock.ps1`: it is a
timing). The 20 slowest tests: file, name, ms, its timeout, ms / timeout. 2. Six loaded runs, each one's whole
output and JSON kept under `.claude/probes/K1543/out/27E/` (untracked). A run starts while the bar's control
captures run in another process (`k1436_bar.ps1 -Ref <master> -Base <master> -Scenes
ring,def,muse_hash,g41_user_tw64 -Port <yours> -Tag 27E_load`, started again when it ends; the bar takes the
perf lock itself, the test run takes none). Per run: every failed test by file and name with the first line of
its error, and the same 20-slowest table. 3. The verdict, one of three. (a) A test failed: say whether it is a
timeout or an assertion. A timeout: cut the test's work where that keeps what it guards, else give it its own
timeout of at least 4x its slowest loaded time, with a comment giving the idle and loaded times measured here.
An assertion that depends on wall-clock time or on another process: remove that dependence. Then 6 more loaded
runs with 0 failures. (b) Nothing failed, and a test ran past half its timeout under load: the same fix, then 3
loaded runs with every test under half. (c) Neither: both tables go into the handoff with the three tests
nearest their timeouts, K1543 stays open (the coordinator updates its text from the handoff), and the run
stops. Never raise the global `testTimeout`; never skip, loosen or delete an assertion. 4. `npm test` green on
an idle machine. K1543 closed only under (a) or (b). A change outside `test/` needs its reason in the commit
message; none in the hands-off files.

## Run F (27F): the corner stages' tools: captures without the lottery (K1539), one guard script

Added 2026-11-19 23:55. Each K1482 stage agent rebuilds two things in its own worktree: a capture loop that
reloads until the physics hash matches, and a guard script. Both go into the tracked probes so the next stage
starts from them. Probes only: no `src/` change, so no ordinary-load guards at the end.
Done: 1. K1539: `.claude/probes/K1482/cap.mjs` calls `alignFreezeParity(page, SIMT)` before its freeze, as
`.claude/probes/K1458/dragcheck.mjs` and `.claude/probes/K1468/ab.mjs` do. The retry loop stays as the
fallback, and the header says so. 12 loads of link A with the arguments its header gives: 12 of 12 captured on
try 1, one physics hash (fff8c9e5), and for each look it writes 12 identical PNG hashes (`gf_b2view.txt`
differs per load by design: compare the pictures). K1539 closed with the commit. 2.
`.claude/probes/K1482/guards.ps1` (tracked: `git add -f`), made from the newest stage guard script: stage 27's
`run27.ps1` under `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a198fbb25c384a8cf\.claude\probes\K1482\s27\`
if it is there, else stage 28's `run28.ps1` under `...\agent-a1c1c68a332de8029\.claude\probes\K1482\s28\`
(other agents' worktrees: read, never write). Parameters `-Tag -Port -Ref -BaseRef -BarPort -OutDir -Owner
[-NoBar] [-BarOnly]`. The guards and their pass lines are that script's, unchanged (hold 60/60 on the two
ordinary links with the second corner try on and with `gfk=0`, panel open, the fill and the border drag check,
`npm test`, the K1436 bar): the header lists each with its pass line. New: each guard's whole output goes to
`<OutDir>/<guard>.txt`; one line per guard, `PASS|FAIL <guard>: <its numbers>`; a failed `npm test` prints the
failed tests' files and names (the JSON reporter, as in Run E); every capture guard runs through
`scripts/perf_lock.ps1` with `-Owner`; the exit code is the number of failed guards. 3. Proof. The script on a
preview of master, twice: every guard PASS both times, the two runs' numbers side by side in the handoff. The
failure path once: in a scratch worktree (`git worktree add` under `$env:TEMP`, removed afterwards with `git
worktree remove`) make one test fail, and show that the `FAIL npm test` line names it and the exit code is 1.
4. Three lines at most in `.claude/rules/probes.md` on the two tools (where, usage, what PASS means). `npm
test` green.
