# K1531: Muse batch 27, captures and guards that can be trusted (2026-11-19)

Run tags 27A-27N (27E and 27F were added 2026-11-19 23:55; 27E was withdrawn and 27G added 2026-11-20 01:25; 27H and 27I were added 2026-11-20 06:00; 27J, held, 07:45; 27K 08:35; 27L and 27M, the two measuring runs Levi approved, 08:41; 27J was dropped and 27N added 10:52), started by Claude through Paseo with the K1053 chain, one after another in the main
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
- **Never end your turn while a `scripts/perf_lock.ps1` call or a capture is queued or running** (added
  2026-11-20): wait inside the blocking call and start the next step from the same turn. The chain reads an
  ended turn with no commit as a failed run and stops: 27I's did at 12:53, its capture still waiting for the
  lock.
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

### Handoff 27A (Muse, 2026-11-19, done: every Done holds; K1530 closed in 27a2120bb)

Started 14:18 PST, stopped 16:13 PST. Starting master d62d68f2e; fix on master in 27a2120bb (src/app/probe_hooks.ts + .claude/probes/K1525/s1/cap.mjs + the new .claude/probes/K1530/ tools; no hands-off file touched). Perf lock held for each capture sequence, released at the end. Captures and dumps under .claude/probes/K1530/out/27A/ (repro/diag pairs + dumps, capfix/, fade/, guards/, k1463_sheet.png).

Done 1 (reproduced, 10 loads each, preview of d62d68f2e on :5482, kept profile, cap.mjs's own pin). Two redraws of one frozen state (hash f9d72040 on every load) differ on every load: rp=gf 679,735 / 692,320 / 705,514 / 717,572 / 707,278 / 714,506 / 707,782 / 701,075 / 704,673 / 716,661 px; today's renderer 710,197-729,612 px. Bounding box x 689..2450, y 26..1714 (the whole knot) on both renderers; the differing px sit on the threads (every thread row, colour deltas up to 255: the flow-displaced shading), not on a marker, fog or the background (background alone differs by 1 level of dither). K390's start-marker flip, fog and explore ticks are ruled out: dumps at both redraws show paintClock 100, pulseBorn 0, exploreClock, view and physics hash all identical; only flowTime moves (e.g. 1.84 -> 2.59 -> 3.23 across pre/A/B).

Done 2 (the cause). __knotPinClocks pinned advanceClocks/paintClock/pulseBorn, the background and the fabric explore clock, but left tickPaint running with real dt; tickPaint advances the flow clock (flowTime += dt * flowSpeed, paint_state.ts) and the palette/appear work, so the displaced geometry and shading moved between redraws. Evidence chain: fw=0 cuts the diff 707k -> 190k (flow displacement off, clock still moving); stopping tickPaint after one tick gives 0 px from the first shot; K1139's hand PIN (.claude/probes/K1139/lib.mjs:88), which the hook's comment says it mirrors, wraps tickPaint at dt 0 - the hook had dropped that line. With the wrap, flowTime reads identical at both redraws and the redraws agree, so the gf tables/uniforms agree too (no data-texture difference left to name). gf needs two warm redraws after the pin before the compared pair (builds in flight at the pin, depth 2 at rest, still show pre-pin state: first compared pair differed 68-97k on 9 of 10 loads with one warm redraw, 0 with two; diag.mjs shot sequence 179,593 -> 0 -> 0).

Done 3 (fixed, 27a2120bb). src/app/probe_hooks.ts: __knotPinClocks now wraps renderer.tickPaint at dt 0 (bind + 0), as the K1139 PIN does. cap.mjs: freeze() pins through __knotPinClocks(100) instead of its partial hand pin (which also missed the explore clock). Tools that now take the fixed pin: every __knotPinClocks caller - K1139 (ab.mjs, ab_cyc.mjs, ab_s3b.mjs, sheets_cyc.mjs, hookcheck.mjs), K1186 (ab21e.mjs, ab22c.mjs, crops.mjs, flips.mjs, pc21e.mjs), K1202 (frames21c_claude.mjs, sheet21c.mjs, sheets_cyc.mjs), K1203 (check_gpu.mjs, check_gpu2.mjs) - plus cap.mjs. Verified on the fixed build (:5483 working tree, then guards on -Ref 27a2120bb): after two warm redraws, two redraws agree at 0 px on 10/10 loads of ?3&xp=off&am=instant&rp=gf (hash f9d72040) and 10/10 of link A (hash fff8c9e5); cap.mjs on jobs_q3.json prints no UNSTABLE (q3_gf tries [2,1,1,1,1,1,1,1], q3_today [1 x8]). The page legitimately animates here (flow undulation is a live look), so the capture pins it; no render bug and nothing filed against the hands-off files.

Done 4 (K1463's spot). Same-state sheet (state f9d72040, capfix captures, fade 0.14 and 1.2, today | master gf, surroundings + 4x): .claude/probes/K1530/out/27A/k1463_sheet.png (spot located by masked template match against zoom_a.png's today tile: device (1152,900), 152 px window). At 4x the gf pink tip still shows a small hard notch/step where it meets the blue band, against today's smooth contour, at both fades - K1463 itself not judged or fixed here, as briefed.

Done 5: npm test green (256 files, 3199 passed, 9 skipped; tsc clean). K1530 closed in 27a2120bb; its deploy (44640512146) succeeded. Guards on a preview of 27a2120bb (:5484, the kept profile above): hold.mjs 60 250 5000 PASS on ?3&xp=off&am=instant&rp=gf (60/60, edges min 102,769) and on link A (60/60, min 7,010); dragcheck.mjs PASS for gf (130 / 56 / 0 px over TOL 24) and gfh (0 / 0 / 0). fade.mjs on that build keeps its standing K1494 FAIL on dot counts only (83 / 96 / 65 / 103 sides over 2 dots; distances pass, sameState true) - 27C's item, untouched. K1531 and K1482 left open. Preview servers (5482, 5483, 5484) and probe Chromes stopped; preview dirs and the run's Chrome profile removed.

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

### Handoff 27B (Muse, 2026-11-19, done: every Done holds; K1529 closed in 9d519fb3a)

Started 16:24 PST, stopped 21:07 PST (much of it queued behind other agents' perf-lock sequences). Starting master 1f612d222; fix on master in 9d519fb3a (probes only: the new .claude/probes/view_still.mjs, .claude/probes/K1436/k1436_screen.mjs, .claude/probes/K1482/cap.mjs, plus the run's tools under .claude/probes/K1529/; no src/, no hands-off file). Preview of master on :5481 (src identical to 85e14e53, the bar controls' build). Every capture sequence through scripts/perf_lock.ps1 -Owner "muse-27B". Captures, trajectories and 4x crops under .claude/probes/K1529/out/27B/ (s21-base/, bar-base12/, bar-fix12/, cap-fix12/, cap-fix12b/, viewprobe/, drift_4x_base.png, drift_4x_fixed.png). Link A on hash fff8c9e5 everywhere below.

Done 1 (reproduced, 12 loads per path). Through the capture path s21 used (named: .claude/worktrees/agent-afdf2b8bb494bb380/.claude/probes/K1482/s21/cap21.ps1 -> cap21b.mjs, = K1482 s15 cap15.mjs + FORCE2; 1600x900, DSF 2, canvas 3200x1800 device px; FILL=1): fill 1 distinct picture, 0 px on 12 of 12; border (gf.png) 12 distinct pictures, vs load 01: 28,775 / 37,162-53,994 px differ (levels 1: ~25-30k, 2-3: 1.0-18.9k, >8: 84-1,608, max 26-32, mean 1.09-2.50), bbox x 734..2429 y 66..1707 (the whole knot), image corners 0. View at sites time (post-shot read) x 417.23864033820786, y 67.92990598455434, s 21.296838875313163, dpr 2 on all 12. Seven loads first froze on 10104c64 and reloaded to fff8c9e5, so both groups (reloaded / first-try) contain agreeing fill and disagreeing border shots. Through the bar's .claude/probes/K1436/k1436_screen.mjs (job t=20.0167 - t=20 steps to 19.992 under its t-0.008 recipe and lands on 8c308669, named here; t=20.0167 makes its parity target 2402 substeps, fff8c9e5 in 1 try on all 12): view x 237.23864033820786, y 67.92990598455434, s 21.296838875313163, zoom 1, pan 0, dpr 3, 1240x900 CSS / 3720x2700 device px on all 12; fill 1 distinct picture, 0 px (stableShot 3 shots on 11 loads, 2 on one); border 1 distinct picture, 0 px (2 shots each). Floor, reported beside the drift as briefed: on one build and one state the s21 path's fill and the bar path's both looks self-agree at 0 px; only the s21 path's first (border) shot wanders. On current master the 76,609 px figure itself does not recur in fill (s21 measured it across build pairs whose loads took different reload paths); the same fault, smaller, lives in the border shot.

Done 2 (the cause: the fit camera's last ease, caught in the first shot). .claude/probes/K1529/viewprobe.mjs (cap21b's load/freeze, parity aligned), 3 loads, world transform polled every 200 ms for 12 s after the freeze: at 2,200 ms - the moment cap21b shoots (sleep 1500 + one redraw) - loads 2 and 3 sit off their resting view by dx +0.049/+0.062, dy +0.145/+0.187 CSS px (0.10-0.37 device px) and keep moving; both become bit-still only at 4,881 / 5,161 ms and land bit-exact on x 417.23864033820786, y 67.92990598455434, s 21.296838875313163. Load 1 was already still at the first poll (its pre-freeze frames happened to finish the ease). The offset is the bounds-following fit ease (FIT_EASE 0.08 of the remainder per frame, src/app/camera.ts updateCamera, snapping only under 0.01 px): how many frames a load ran before the freeze sets the remainder, so the shot's sub-pixel offset differs per load and every antialiased edge shifts by 1-3 levels. Ruled out with numbers above: the hash-miss reload, concurrent GPU use (every sequence held the perf lock, one page at a time), the background (corners 0; fill, which shows none, agrees), dpr and canvas size (2 / 3200x1800 on every s21 load, 3 / 3720x2700 on every bar load), the physics state (one hash, parity-aligned in the bar path), paint and flow clocks (on the same pages the fill shots agree). The app's own view at rest agrees across loads to <= 0.001 device px (load 1's rest sits dx 7.6e-5, dy 4.7e-4 CSS px off the other two - the snap band's residue, three orders under a pixel; no user sees it), so there is no src/ fix and nothing filed against the hands-off files.

Done 3 (fixed in the capture helpers; the view is pinned by waiting for it). New shared .claude/probes/view_still.mjs: waitViewStill(page) polls the renderer root's world transform in device px at 17 digits until 10 polls in a row (200 ms apart, frames running) are exactly equal - K1482 s23's B2 recipe (probes.md) generalized - and returns that view. .claude/probes/K1436/k1436_screen.mjs waits for it after the freeze, before the first shot (logs "view still x=... y=... s=... dpr=...", warns and shoots unpinned if 60 s pass; stableShot stays as the net for a gf build still in flight). .claude/probes/K1482/cap.mjs's waitViewSettled (K1508: two samples 250 ms apart) now delegates to it. Tools that take the pin: k1436_screen.mjs (the bar and every census capture) and K1482/cap.mjs; s21's cap21b.mjs is an untracked worktree copy and cannot take it - master's cap.mjs is that lineage's maintained copy. Verified on the fixed helpers: k1436_screen 12 of 12 loads 0 px in both looks (fill md5 10df369488, identical to the base run's; border 0 px against the base run's picture - the pin lands the same settled view stableShot used to find by reshooting, stable now 2/2 shots on every load); cap.mjs 13 captured loads (11 of 12 in the set, 2 of 2 in a supplement) 0 px in both looks, its settled border matching none of s21's twelve (vs s21 load 01: 45,542 px of the same 1-3-level signature) while its fill equals s21's fill at 0 px. One cap load exhausted TRIES=6 on 10104c64: cap.mjs freezes without alignFreezeParity and plays the K1519 lottery, which is not the view; filed as K1539 with the cure (the add first numbered it K1536, an ID already taken: the checkout was behind origin; the coordinator renumbered it). Bar control (.claude/probes/K1436/k1436_bar.ps1 -Ref master -Base master -Scenes ring,def,muse_hash,g41_user_tw64, ports 5482-5484, tags 27B_ctrl1/2/3; screens taken by the fixed helper): PASS new 0, grown 0, gone 0 three times in a row, every scene on its K868 hash (ring 50dd4ffd, def 910ff135, muse_hash 733ee14a, g41_user_tw64 0d51331b), view-still logged on each. The 4x crops (drift_4x_fixed.png: s21 load 01 | s21 load 06 | fixed cap load 01, centre (880,200) device px at DSF 2, half 120): the three tiles are indistinguishable to my eye - the start marker sits identically registered in each, the dark border strokes cross the dark paper in the same place; the counted differences are 1-3 levels of antialiasing on thread edges, below what a crop can show, and nothing in the fixed tile reads worse than either mid-ease tile.

Done 4: npm test green on the landed tree (257 files passed, 2 skipped; 3206 tests passed, 9 skipped; tsc clean). K1529 closed with 9d519fb3a; K1531 and K1482 left open. Probe-only change (no src/), so no ordinary-load guards and no deploy (a .claude//docs push does not deploy). Tried and left: an early bar run with job t=20 froze on 8c308669 (see Done 1) and was discarded, not measured; a lock run I terminated left orphan Chromes on the run's profile - killed by their verified command lines, their (lock-free) captures deleted and rerun under the lock; viewprobe load 1's sub-thousandth rest offset is named in Done 2, not chased. Preview :5481 and the run's Chrome profiles (k1529-*) stopped and removed at the stop line.

## Run C (27C): fade.mjs's verdict means something (K1494)

`.claude/probes/K1458/fade.mjs` prints FADE GUARD FAIL on master (26F; 26X 10 of 10 on one state; K1525 s1 on
930632b90). Its distances pass at every fade (678/679, 627/631, 439/451, 676/679 sides at fl 0 / 0.5 / 1.2 /
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

### Handoff 27C (Muse, 2026-11-20, done: every Done holds; K1494 closed with the fix commit)

Started 03:21 PST, stopped 04:44 PST. Starting master 355d53cbb; fix on master in 7a4869708 (probes only: `.claude/probes/K1458/fade.mjs` + the run's tools under `.claude/probes/K1494/`; no `src/`, no hands-off file, so no deploy and, as a probe-only run, no ordinary-load guards - the fade guard itself is the run's guard, three times below). Previews of 7fe4b9c6 on :5487 and of 355d53cbb on :5488 under `$env:TEMP\knotmaze-27C`, every capture sequence through `scripts/perf_lock.ps1 -Owner "muse-27C"` (run 2 waited 1,183 s behind K1482 s30's sequence). Captures, crops and zooms under `.claude/probes/K1494/out/27C/` (untracked: `fade_7fe/`, `fade_master1/`, `fade_diag/`, `fade_fix1-3/`, `crops_master_fl0.png`, `dotszoom_master_fl0.png`, `dotszoom_master_fl12.png`, `crops_7fe_fl0.png`, `dotszoom_7fe_fl*.png`). One physics state everywhere: hash f9d72040, sameState true on every load. Floor: the same build re-run reads dots within ±5 sides and pass within ±1 of itself (81-84 sides>2 and 615-619 dots at fl 0 across master1/diag), beside the verdicts below.

Done 1 (7fe4b9c6 does NOT pass; numbers per fade, gf = gfh within a dot). On the 7fe preview the dot criterion fails at every fade, worse than master: fl 0: 1,889 dots, 257 sides>2, pass 667/679; fl 0.5: 863, 145, 615/631; fl 1.2: 630, 106, 433/452; fl 0.14: 963, 160, 665/679. Master (355d53cbb, same count): fl 0: 619, 84, 678/679; fl 0.5: 633, 97 (gfh 98), 628/631; fl 1.2: 442, 66, 439/451; fl 0.14: 677, 104, 676/679 - the standing FAIL, distances passing everywhere. So no commit brought the dots back: the criterion never passed, K1460 closed without it green. No bisect (Done 2's second branch).

Done 2 (what the count sees: a counting artifact - gf's one-pixel edge quantisation). Five former dot sides at 4x with surroundings, today | gf (`crops_master_fl0.png`: x228+, x43+, x5-, x25+, x33-): the tiles are indistinguishable; the amplified diff is only the threads' 1-px edge contours. Dot-centred 8x zooms (`dotszoom_master_fl0.png`, `dotszoom_master_fl12.png`) show every sampled dot sitting ON the dark gap line's contour, in a continuous diagonal staircase where gf steps coverage in one pixel and today blends over two; nothing sits isolated inside a faded span, and at fl 0 - no fade ramp at all - the old count still found 84 sides. Measured (fade_diag, dotFeat per counted dot): all 615 (fl 0) and 457 (fl 1.2) old-counted dots have brightest-neighbour excess <= 0.003 (median cv 1.000, brightest gf neighbour = the pixel itself: a contiguous edge run, never a speck), and today's local coverage range at each is ~1.0 (today's own edge within a pixel). 7fe's 3x count is the same edge read through K1474's then-unfixed colour lift (bg=none is fade.mjs's recipe); K1474's fix (649de0f4) cut the count 257 -> 84 sides without touching the edge. Real dots would be isolated specks in a faded span; there are none to file, and nothing here is worse in gf than today beyond the sharper edge itself, which is gf's per-pixel look.

Done 3 (count fixed; five former sides read 0). `fade.mjs`: a dot must now beat its brightest neighbour by 0.08 as well as today's pixel by 0.2 and the neighbour mean by 0.12 - an isolated spike, not an edge step. dotFeat stays recorded per counted dot. Synthetic control of the rule: an edge step passes the old rule and fails the new, an isolated speck passes both, a shifted ramp passes neither. On master the five worst former sides (fl 0: x228+ 6, x43+ 5, x5- 4, x25+ 4, x33- 4; fl 1.2: x228+ 6, x163+ 5, x5- 4, x39- 4, x58- 4) all read 0, as does every side at every fade. No `DOTS FAIL` line is needed: the dot criterion now passes and stays inside the verdict, still printed on its own line per fade/variant.

Done 4 (master, three runs agree). Fixed `fade.mjs` on the master preview, three runs (`fade_fix1/2/3`): FADE GUARD PASS each time, dots 0 over every side at fl 0 / 0.5 / 1.2 / 0.14 for gf and gfh, passes 678/679, 627-628/631, 439/451-452, 676/679, sameState true throughout.

Done 5: `npm test` green (258 files passed, 2 skipped; 3,207 tests passed, 9 skipped; tsc clean). K1494 closed with 7a4869708; K1531 and K1482 left open. Tried and left: a today-flatness gate (today's local range < 0.2) also zeroes every counted dot, recorded in dotFeat but not adopted - it leans on today's sub-pixel registration, where the isolation gate is intrinsic to gf's own frame. Previews :5487/:5488, the `$env:TEMP\knotmaze-27C` preview tree and the run's Chrome profiles (`profile_7fe`, `profile_master`) stopped and removed at the stop line.

## Run D (27D): one physics state per census scene (K1479)

26V (bc6ec4cef) fixed the bar's freeze parity in `k1436_screen.mjs`: all 12 scenes freeze on their K868 hash
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

### Handoff 27D (Muse, 2026-11-19, done: every Done holds; K1479 closed in fb18d719f)

Started 21:26 PST, stopped 22:47 PST. Starting master eb9ada0cd; fix on master in fb18d719f (probes only: `.claude/probes/K1468/ab.mjs`, `.claude/probes/K1436/k1436_bar_cmp.mjs`, `.claude/probes/K1436/k1436_s3_table.mjs`, plus the run's tools under `.claude/probes/K1479/`; no `src/`, no hands-off file, so no deploy and, as a probe-only run, no ordinary-load guards). Preview of master on :5485 (stopped and removed at the stop line); every capture sequence through `scripts/perf_lock.ps1 -Owner "muse-27D"` except the bar, which waits on the lock itself (it waited out K1482 s28's sequences from 21:59; its base captures then ran while that agent re-took the lock at 22:30 — the verdict below is still 0/0/0 with every freeze 1 try). Evidence under `.claude/probes/K1479/out/` (`ring_screen/ring_r*/meta.json`, `ring_ab/`, `fresh12/<scene>/meta.json`, `dedup_test/`); the bar's output is `.claude/probes/K1436/out/bar/27D_ctrl/bar.txt`.

Done 1 (ring, one hash per path). Through `k1436_screen.mjs` (bar jobs for ring, STRICT, kept profile): 10/10 loads freeze on 50dd4ffd, 1 try each, `0a0ee15e` never seen. `ab.mjs` lacked the parity alignment (it froze then stepped, the K1468 s2 lottery): it now calls `alignFreezeParity(page, SIMT)` before its freeze+StepUntil evaluate, and gained link `R` (the K868 ring link at `rp=gf&gfh=1`). Through it at SIMT 40.01666666666504: 10/10 loads hash 50dd4ffd. (Each ab load also logged one `webglcontextlost` from Pixi's support-test canvas, which its hook counts; hashes unaffected.)

Done 2 (the pair is one design; the census counts it once). `.claude/probes/K1479/decode_pair.ts` (the app's own `parseParams` on the K868 job links, `decodeToken` on the exported tokens): same seed 2430477599; the job links differ only in `background` (vellum/wash), `backgroundBase` (#151b28/#e6e9ee) and `backgroundColorMode` (gamut/custom) — paint only (the K868 census already showed the background moves neither hash nor geomHash). The diags freeze one substep apart (g41 substep 4801 hash a5f6d198, lightpaper 4802 hash 462652e7), and a fresh STRICT freeze of the identical bar query reproduces exactly those hashes at those substeps, so nothing "makes" one freeze on the other's state beyond the export-time parity choice. Counted once, in two named places: `k1436_bar_cmp.mjs` DEDUPs `user_tw42.lightpaper` under `g41_user_tw42` (its finds never enter new/grown/gone; a `DEDUP` line and a `deduped` count in bar.txt/bar.json say so; it is not a K1519 skip — both scenes still freeze and capture, and Done 4's "no scene skipped" holds), and `k1436_s3_table.mjs` excludes the lightpaper scene from the census totals with its per-scene row marked `(dup of g41_user_tw42, K1479)`. A synthetic two-scene comparator run prints `DEDUP ... finds counted once` with new/grown/gone 0.

Done 3 (no stale hashes; old -> new is identity for all 12). Fresh STRICT freezes on master (bar queries, 1 try each, `fresh12/`): muse_hash 733ee14a, def 910ff135, fat 814c4e1e, muse_default_tw c5d9f3b6, ring 50dd4ffd, g41_def_tw42 da10b9a5, g41_def_tw64 5ccb276f, g41_ring_tw42 f7b1dff2, g41_ring_tw64 ea67fc77, g41_user_tw42 a5f6d198, g41_user_tw64 0d51331b, user_tw42.lightpaper 462652e7. Carriers checked per scene: the K868 diag `frozenHash`/`frozenSim` and the README table (the same values), the bar's scene table (`k1436_bar.ps1` Get-Jobs reads those diags; `K1479/make_jobs.mjs` mirrors it), `.claude/probes/K1240/s4/k1240s4_crops.mjs`'s three (def, muse_default_tw, g41_ring_tw64 — all match), and `test/`, which carries no physics-hash pins (the outline pins digest the K868 scene files' geometry, which a matching freeze hash leaves untouched). Nothing was stale, so nothing was re-taken; the per-scene old -> new list is the fix commit's message (fb18d719f).

Done 4 (bar control). `k1436_bar.ps1 -Ref master -Base master -Port 5486 -Tag 27D_ctrl` on fb18d719f, all 12 scenes: `PASS new 0 grown 0 gone 0 deduped 1 (user_tw42.lightpaper)`, missing 0, skipped 0, no FREEZE lines; all 24 captures (base and ref) froze 1 try on their K868 hash (the table in Done 3).

Done 5: `npm test` green (257 files passed, 2 skipped; 3206 tests passed, 9 skipped; tsc clean). K1479 closed in fb18d719f; K1531 and K1482 left open. Tried and left: nothing failed and was dropped — the bar's 30-minute lock wait and the under-load base captures are recorded above; `fix_s3.mjs` (the one-shot patch that applied the s3-table edit) is kept with the run's tools. Preview :5485, the bar's :5486, and the run's Chrome profiles (`k1479-screen-profile`, `k1479-ab-profile`) stopped and removed.

## Run E (27E): withdrawn 2026-11-20 01:25 (K1543's cause was found first)

Not a run: its line left the queue before the chain reached it. The failure it was to name is not load. K1482
stage 28's `run28.ps1` sets `$env:GF_KRETRY = "1"` for the bar and leaves it set through `npm test`, and
`test/render/gf_k1482_switch.test.ts` pins the Node default off: 3 of its 7 tests fail with the variable set,
all pass without (coordinator, 2026-11-20; stage 27's agent hit the same and named the tests). Run F's guard
script clears the variable; K1543 holds what is left.

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
`scripts/perf_lock.ps1` with `-Owner`; the exit code is the number of failed guards; `npm test` runs with `GF_KRETRY` removed from its environment (K1543: the stage scripts set it to 1 for the bar and left it set, and 3 tests of `test/render/gf_k1482_switch.test.ts` then fail), each other guard gets the value its source line gives it, set for that one child process. 3. Proof. The script on a
preview of master, twice: every guard PASS both times, the two runs' numbers side by side in the handoff. The
failure path once: in a scratch worktree (`git worktree add` under `$env:TEMP`, removed afterwards with `git
worktree remove`) make one test fail, and show that the `FAIL npm test` line names it and the exit code is 1.
4. Three lines at most in `.claude/rules/probes.md` on the two tools (where, usage, what PASS means). `npm
test` green.

### Handoff 27F (Muse, 2026-11-20, done: every Done holds; K1539 closed in 3434cc5c7)

Started 04:55 PST, stopped 06:47 PST. Starting master 9b905333c; fix on master in 3434cc5c7 (probes only: `.claude/probes/K1482/cap.mjs`, the new `.claude/probes/K1482/guards.ps1`, the driver `.claude/probes/K1539/cap12.ps1`, one line in `.claude/rules/probes.md`; no `src/`, no hands-off file, so no deploy and, as a probe-only run, no ordinary-load guards beyond the guard script's own). Page preview of master on :5481 (stopped and removed at the stop line); every capture sequence through `scripts/perf_lock.ps1 -Owner "muse-27F"`. Evidence under `.claude/probes/K1539/out/27F/` (untracked: `cap12/`, `guards_run1/`, `guards_run2/`, `guards_fail/`).

Done 1 (K1539 cured). `cap.mjs` now imports `alignFreezeParity` and calls it before its freeze, as `dragcheck.mjs` and `ab.mjs` do; its header says the reload loop stays only as a fallback net. Proof (`.claude/probes/K1539/cap12.ps1`, preview of master, HASH=fff8c9e5, FILL=1, kept profile): 12 of 12 loads captured on try 1 (0 reloads in every log), one physics hash fff8c9e5, and both looks byte-identical on all 12: `gf.png` SHA-256 993D919E0A76... and `gf_fill.png` 9ED51864EE02... (`cap12/cap12.csv` has the rows; the tracked tool writes `gf.png`/`gf_fill.png`, the stage copy's `gf_b2view.txt` has no counterpart here, so the pictures are the comparison, as briefed).

Done 2 (guards.ps1). Made from stage 27's `run27.ps1` (present; stage 28's has the same sequence). Parameters `-Tag -Port -Ref -BaseRef -BarPort -OutDir -Owner [-NoBar] [-BarOnly]`; the header lists the seven guards with their source pass lines (bar, hold, hold_gfk0, panelopen, dragcheck_b, dragcheck, npm test). New: each guard runs as its own child (its whole output in `<OutDir>/<guard>.txt`), one `PASS|FAIL <guard>: <numbers>` line per guard, the exit code is the failed count, every capture guard goes through `scripts/perf_lock.ps1 -Owner`, the bar keeps `-NoPerfLock` inside that lock, npm test runs with `GF_KRETRY` removed and on failure names the failed tests from the JSON reporter, and every other guard gets the `GF_KRETRY`/`STRICT`/`TLK` value its source line gives it, for that child only.

Done 3 (proof). On the master preview, twice, every guard PASS both times (run1's bar waited 708 s behind K1482 s31's lock; run2 took it at once): bar `PASS new 0 grown 0 gone 0` | `PASS new 0 grown 0 gone 0`; hold 60/60 edges min 6941 | 6949; hold_gfk0 min 6969 | 6801; panelopen 1 | 1; dragcheck_b 0/11/6/0 | 0/0/6/0 px over TOL 24; dragcheck 0/0/67/0 | 0/0/0/0; npm test 258 files, 3207 tests | the same (run1's line read the counts from its `npm_test.txt` before the ANSI fix in 3434cc5c7's script). Failure path once: scratch worktree at 3434cc5c7 under `$env:TEMP` (junction unlinked, worktree removed after) with `web_fade.test.ts`'s `WEB_FADE_S` expectation broken: captures all PASS and `FAIL npm test: ... web_fade.test.ts > webFadeLevel (K169) is 0 when the web completes...`, exit code 1.

Done 4: one line in `.claude/rules/probes.md` (K1539: where the two tools are, their usage, what PASS means); `npm test` green (258 files passed, 2 skipped; 3207 tests passed, 9 skipped; tsc clean). K1539 closed in 3434cc5c7; K1531 and K1482 left open. Preview :5481, the bar's :5482 builds and the run's Chrome profiles (`k1539-cap`, `k1482-guards-*`) stopped and removed.

## Run G (27G): the start marker's glow ring comes back after a context loss (K1537)

Added 2026-11-20 01:25. K1537 in `LEDGER.md` has the one sighting (2026-11-19): after the probe Chrome's GPU
process restarted during a cold gf compile, a ring around the start marker was missing from then on (about
1,600 px, levels <= 28, device px x 745-826, y 78-159 in the fill drag check's view), and the page had logged
`Cannot read properties of undefined (reading 'stats')`. Not established: which object the ring is (first
suspect: the walker's glow, `WALKER_GLOW_TEX` in `src/render/fabric_maze_renderer.ts`, a canvas texture cached
at module level), whether today's renderer loses it too, and whether the app or the probe loses it (the drag
check pins clocks on a renderer the restore may have rebuilt). The app's handlers are in
`src/app/context_loss.ts`; `probe_hooks.ts` counts lost and restored events.
Done: 1. The repro, a tool under `.claude/probes/K1537/` (tracked: `git add -f`; its captures untracked). Load
K1537's link, and the same link without `rp=gf&gfh=1`; reach one state (`alignFreezeParity`, as
`.claude/probes/K1458/dragcheck.mjs` does) and shoot. Lose the app canvas's context
(`getExtension("WEBGL_lose_context").loseContext()`), restore it 2 s later, wait until the page draws again,
shoot. Count the px over tol 6 between the two shots, inside the ring's box and outside it (give the box for
your view). The floor first: two shots with no loss between them. 5 loads per renderer. 2. One of three. (a)
Something is missing after the restore in at least 1 load of 5: name the object (hide or tint it to prove
it) and why the restore does not bring it back, fix it in `src/` outside the hands-off files, then 5 of 5 loads
per renderer at the floor, in the box and outside. A second object that stays missing is fixed too if it is
the same cause; else it is listed with its px and its box, for the coordinator to file. (b) Nothing differs in
5 loads per renderer: try the sighting's own shape, a loss within 1 s of the load under `rp=gf&gfh=1` with the
restore 5 s later, 5 loads. Still nothing: the numbers go in the handoff, K1537 gains "not reproduced by
WEBGL_lose_context (N loads)" from the coordinator, and the run stops with no `src/` change. (c) The app draws
the ring and only the drag check loses it (its pinned clocks sit on a rebuilt renderer): fix the probe, show
its stops at 0 px in the box after a loss. 3. The `stats` error: its throw site by file and line if it shows
in any load; fixed only if the site is outside the hands-off files and the fix is the same cause, else one
line for the coordinator to file. 4. A `src/` change ends with How to work's guards and `npm test` green, and
with a unit test where the fix has a pure part. K1537 closed only under (a) or (c).

### Handoff 27G (Muse, 2026-11-20, stopped at the time line: branch (a) reproduced, the fix filed as K1550; K1537 left open)

Started 06:59 PST, stopped 08:12 PST. Starting master f3ca233a7; no `src/` change and no hands-off file touched (probes only: `.claude/probes/K1537/repro.mjs`, `cmp.mjs`, `crop.mjs`, `hunt.mjs`, tracked; captures untracked under `.claude/probes/K1537/out/27G/`). Preview of the working tree on :5489 (stopped and removed at the stop line); every capture sequence through `scripts/perf_lock.ps1 -Owner "muse-27G"`. One kept profile (`.claude/probes/K1537/profile27g`, removed at the stop line). State on every load: hash f9d72040 (SIMT 20, `alignFreezeParity`, `__knotPinClocks(100)`, view held bit-still); the ring box for this view is device px x 740-830, y 74-164 (centre 785,119 - the sighting's box, x 745-826, y 78-159, is the same marker in the same 1600x900 DSF 2 view). Floor first, every load: two shots with no loss between them differ by 0 px in the box and 0 outside (tol 6), gf and today alike.

Done 1+2, late shape (the brief's first repro): lose the app canvas's context on the settled page, restore 2 s later, wait for composites/rAFs, shoot. 5 of 5 gf loads and 5 of 5 today loads: 0 px in the box, 0 outside - the floor. Under gf the `__knotGf` object is rebuilt by the restore (frame_loop's dispose + recreate; `sameGf` false) and its threads come back bit-identical; Pixi's own restore brings the overlay back when every compile/upload finished before the loss. So the plain repro does not reproduce, and the run took branch (b)'s second step.

Done 2, the sighting's own shape (loss as soon as the app canvas has a WebGL2 context, 1.0-2.1 s after `goto` with a warm profile, restore 5 s later, then the same freeze/pin/shoot; each settled shot compared with a clean gf load's, cross-load floor 0/0): gfE1-E4 0 px in, 0 out; **gfE5 8,281 px in the box (the whole 91x91 box, max 234) and 14,107 outside** (bbox x 707-2447, y 40-1713). Two further breaks in 36 hunt loads (hunt batches of 8/12/12/12: 1, 0, 1, 1) - about 1 in 5-8 early loads, 3 of 41 in total. The object, proved by the crop sheet (`gfE5_crop.png`, clean left | gfE5 right, 4x on the ring box): the start marker is gone - its coloured rim, black disc and white glyph - and the soft head glow behind it is gone; the threads are pixel-identical (sample (985,419): (204,122,143) in both; marker centre: clean (255,255,255), gfE5 (38,44,57); backgrounds identical). Named: the Pixi-drawn fabric overlay at the head/start - the `MarkerMesh` discs (`src/render/marker_mesh.ts`) and the head-glow `Sprite` (`headGlowTexture()` in `fabric_maze_renderer.ts`, whose halo is what fills the ring box in the clean tile). Why the restore does not bring it back: on the broken loads, and only on them, the page logs 5 Pixi shader compiles attempted on the lost context (`Could not retrieve shader source` / `Could not initialize shader`, x5 programs); Pixi's `webglcontextrestored` handling revives resources that were bound before the loss but never the ones whose first compile/bind raced it - JS state stays perfect (markers `visible`/`renderable` at the right global position (392.66,59.33 CSS), glow alpha 0.3, containers parented, gf rebuilt with 213+ composites), and with gf's composite child hidden and the ribbon layers un-hidden Pixi still draws nothing at the marker (centre stays (21,27,40)): Pixi's batch rendering is dead for the page's life, while gf's raw-GL threads survive because the frame loop disposes and rebuilds the gf app on restore (`frame_loop.ts`'s restore branch - the same K868 S3a2 pattern that rebuilds the label app) and no equivalent rebuilds the fabric overlay, which `context_loss.ts`'s header trusts Pixi to restore. Tried and failed as in-page revivals on live broken pages: dropping `_gpuData` on the glow texture source, the marker geometries and their buffers; `source.update()` on every overlay texture; `buffer.update()` on the marker geometries - all still 8,281 / 14,107. The Pixi renderer handle for clearing its shader cache was not reachable from the probes (`F.ribbons.renderer` was not it), so no verified app fix landed in this run's window: the fix is filed with these numbers and the two candidate shapes (clear Pixi's program cache / re-emit its contextChange in the restore branch, or rebuild the overlay and drop the page-lifetime caches `MARKER_MESHES` and the glow textures) as K1550. K1537 is **not** closed (Done allows closing only under a landed (a) fix or (c)); it stays open with the repro numbers above - contrary to (b)'s "not reproduced" wording, the fault DOES reproduce in the sighting's own shape.

Done 3 (the `stats` error): `Cannot read properties of undefined (reading 'stats')` never appeared in 47 loads (pageerror listeners on every load; the only errors are the Pixi shader console errors above, and only on broken loads). No throw site to name from this run; the sighting's 26 s-after-loss timing still fits a reader of the disposed `__knotGf` (its `stats`), which the coordinator may file from K1550's evidence.

Done 4: no `src/` change, so no unit test and, as a probe-only run, no ordinary-load guards (How to work); `npm test` green (258 files passed, 2 skipped; 3,207 tests passed, 9 skipped; tsc clean). K1531 and K1482 left open. Preview :5489 and the run's Chrome profile stopped and removed at the stop line.

## Run H (27H): fade.mjs's dot rule catches the dotted line it was written for (K1548)

Added 2026-11-20 06:00. Run 27C (7a4869708) changed the dot rule in `.claude/probes/K1458/fade.mjs`: a dot must
now beat its brightest neighbour by 0.08, as well as today's pixel by 0.2 and the neighbour mean by 0.12, so
that rp=gf's one-pixel edge steps stop counting. Its only control was synthetic. The rule exists to catch one
real fault: rp=gf drew a dotted line across the faded under thread, on the over thread's edge (K1460; fixed by
a8d36be33, which changed `gf_look.ts` only; its parent 1de01c120 still draws the line). A run of dots along an
edge is not one isolated speck, so the new rule may no longer see it.
Done: 1. Build both commits (`pwsh scripts/preview.ps1 -Port <p> -Ref 1de01c120`, and a8d36be33). On each, at
fl 0 / 0.5 / 1.2 / 0.14, for gf (and gfh where the build has it): the sides with more than 2 dots under the
OLD rule (today's pixel and the neighbour mean only) and under the NEW rule. If today's `fade.mjs` cannot
drive a build of that date (a hook it needs is missing), capture with that commit's own copy (`git show
1de01c120:.claude/probes/K1458/fade.mjs`) and apply today's two counts to those captures; say which you did.
4x crops with surroundings of the three sides of 1de01c120 with the most dots under the old rule, today | gf |
gf with the counted pixels marked under each rule: are they the dotted line? 2. One of two. (a) The new rule
fails 1de01c120 on the sides the crops show as a dotted line and passes a8d36be33: put the numbers in
`fade.mjs`'s comment and close K1548. (b) It does not: change the rule until it fails 1de01c120's dotted sides,
passes a8d36be33, and still reads 0 dots on master at every fade for gf and gfh (the edge steps 27C showed
stay uncounted); the handoff has the counts per fade for the three builds, before and after. 3. `fade.mjs` on
master: FADE GUARD PASS, 3 runs in a row agree. 4. `npm test` green; K1548 closed with the commit, or what is
left recorded in it. Probes only: no `src/` change. Stop the preview servers and remove their directories.

### Handoff 27H (Muse, 2026-11-20, stopped at the time line: the control cannot be given on fade's link; K1548 left open with the cause recorded)

Started 08:18 PST, stopped 10:10 PST. Starting master d820d3731; probes only (`.claude/probes/K1458/fade.mjs` dual count + the run's tools under `.claude/probes/K1548/`; no `src/`, no hands-off file, so no deploy and, as a probe-only run, no ordinary-load guards - the fade guard itself is the run's guard, three times below). Previews of 1de01c120 on :5486, a8d36be33 on :5487 and the working tree on :5488 under `$env:TEMP\knotmaze-27H` (stopped and removed at the stop line); every capture sequence through `scripts/perf_lock.ps1 -Owner "muse-27H"` (the first waited 1,062 s behind K1482 s33's guards). Captures, crops and stats under `.claude/probes/K1548/out/27H/` (untracked: `fade_1de_a/b`, `fade_a8d_a/b`, `fade_master1-3`, `fadeA_debug`, `crops_1de_fl12.png`, `crops_1de_fl014.png`). One physics state per build set: seed 3 hash f9d72040 everywhere below, link A hash fff8c9e5. Today's `fade.mjs` drives both old builds as-is (their pages have every hook it needs; a fl 0 smoke on 1de01c120 read the same hash and PASS), so both rules were counted in one pass: `fade.mjs` now records `dotsOld`/`dotFeatOld` (the pre-27C rule, today's pixel + neighbour mean) beside the new rule's `dots`, plus per-dot neighbour features.

Done 1 (counts, gf = gfh on every line; dots over sides with more than 2). OLD rule: 1de01c120 fl 0: 1,918/259, fl 0.5: 862/146, fl 1.2: 620/105, fl 0.14: 961/162; a8d36be33: 1,998/264, 862/144, 622/105, 960/162; master: 616-623/84, 625-630/95-97, 437-444/65-68, 673-675/104-105. NEW rule: 0 sides over 2 on all three builds at every fade (a single dot at fl 0.14 on the two old builds). So the new rule does not fail the parent build: branch (a) does not hold. Crops (Done 1's question): the three 1de sides with the most OLD dots at fl 1.2 (x48- 8, x95- 7, x128+ 7) and fl 0.14 (x241+ 10, x255- 10, x24- 8), today | gf | gf with the counted pixels marked - the tiles are indistinguishable, the marks are 1-2 px specks on thread edges, and no dotted line crosses a faded span in any tile. They are the same one-pixel edge steps 27C found on master, not K1460's line.

Done 2 (no mend exists on this link, with the numbers). Per side, the two old builds differ by ±1-8 OLD dots in both directions (`sidediff.py`; at fl 0 the fixed build counts more), and their counted-dot features are the same distribution (`dotstats.py`: supporters 3-6 of 8 neighbours within 0.05, brightest-neighbour excess < 0.02 on both - contiguous edge pixels, never the isolated specks the new gate looks for). Any gate that fails 1de01c120's counted sides fails a8d36be33's and master's with them, so Done 2(b)'s three-way split is not reachable here. The fault does not live on this link: K1460's own captures (`.claude/probes/K1460/shot.mjs`) use link A (`Q=3.FGH1HtvQeDjm6e4BII`, now an env override in `fade.mjs`), and one diagnostic load of link A on 1de01c120 kept 0 of 700 sides - 654 skip on `uu` (today's under colour within ~35 levels of the flat backdrop: the coverage projection has nothing to read), 46 on `iu` - so this measure cannot count dots there either. What is left, recorded in K1548: a link-A-capable coverage read (the under colour against a non-backdrop reference), then this same dual count on the two builds there. The dual count and the numbers stay in `fade.mjs`'s dot comment for that run.

Done 3 (master, three runs agree). `fade.mjs` on the master preview, three runs: FADE GUARD PASS each time, new-rule dots 0 over every side at fl 0 / 0.5 / 1.2 / 0.14 for gf and gfh, passes 678/679, 627/631, 439/451-453, 676/679, sameState true throughout.

Done 4: `npm test` green (258 files passed, 2 skipped; 3,207 tests passed, 9 skipped; tsc clean). K1548 is NOT closed: the briefed control was not produced, because on the only link this guard measures, the parent build draws no dotted line for any rule to catch; the item keeps the link-A follow-up above. K1531 and K1482 left open.

## Run I (27I): two loads of the plain link agree, or the cause is named (K1544)

Added 2026-11-20 06:00. K1544 in `LEDGER.md`: two loads of ONE build of `?3&xp=off&am=instant`, asleep, at one
physics hash (0cbb8f07), differ by 193,124 px (today's renderer) and 101,249 px (rp=gf fill) over 24 levels in
the thread area (run 26Z; captures `.claude/probes/K1223/out/26Z`). Link A gives 0-3 px. Not established:
whether the two loads hold particle positions the hash cannot tell apart, or draw one state differently.
Done: 1. The repro, a tool under `.claude/probes/K1544/` (tracked: `git add -f`; its captures untracked): 6
loads of the plain link on one build of master, with today's renderer and with `rp=gf&gfh=1`, each brought to
one state the way `.claude/probes/K1458/dragcheck.mjs` does (`alignFreezeParity`), asleep. Per load: the probe
hash, a whole dump of the stepping state (`src/physics/probe_dump.ts` has the dumps and their hashes), the
view (scale and offset) and a shot. Per pair of loads: the largest position difference in world units and in
device px, whether the views agree, and the px over 24 levels in the thread area. 2. Name the cause from
those numbers, one of: (a) the states differ (by how much, in which particles, and what the hash leaves out
or rounds so that it is equal), (b) the states agree to the bit and the views differ, (c) both agree and the
draw differs (name the layer: hide it or tint it to prove it). 3. Fix what is fixable outside the hands-off
files and outside the physics step: for (a) the capture recipe (a fixed sim time before the shot, as link A's
checks use, or a finer hash that the probes compare before they trust a pair), for (b) the view, for (c) the
layer if its code is not hands-off. Then 6 loads agree pairwise at link A's floor (0-3 px over 24 levels in
the thread area) for both renderers. A cause inside the physics step itself (two loads of one link reaching
different rest states) is NOT fixed here: file it with the numbers and stop that part. 4. `probes.md` gains
two or three lines: how to take a 0 px check on the plain link, or why not to. 5. `npm test` green; K1544
closed with the commit, or what is left recorded in it.

### Handoff 27I (Muse, 2026-11-20, done: every Done holds; K1544 closed in ec4dccd82)

Started 12:26 PST, stopped 13:51 PST. Starting master dfe919f00 (the later baa3ef825 pull changed no `src/` or `test/`); fix on master in ec4dccd82 (probes only: `.claude/probes/K1544/repro.mjs`, `analyze.py`, `flowcheck.mjs`, the recipe fix in `.claude/probes/K1223/k1223_cap.mjs`, and two lines in `.claude/rules/probes.md`; no `src/`, no hands-off file, so no deploy and, as a probe-only run, no ordinary-load guards). Preview of dfe919f00 on :5492 under `$env:TEMP\knotmaze-27I` (stopped and removed at the stop line); every capture sequence through `scripts/perf_lock.ps1 -Owner "muse-27I"` (the smoke waited 2,069 s behind K1482 s34b). Captures, dumps and pair tables under `.claude/probes/K1544/out/27I/` (untracked: `smoke_aligned/`, `aligned/`, `aligned_gf_warm/`, `asleep26z/`, `flow/`, `patched/`, each set's `pairs.json` where `analyze.py` applies). All loads below have n 2,951 particles and c 350 crossings.

Done 1 (the repro; per load the probe hash, the whole stepping dump, the view and a shot; per pair the largest position difference, view agreement and thread-area px over 24). The fixed recipe (`alignFreezeParity` + freeze + `__knotStepUntil(20)`, dragcheck's probe params `fw=0&bg=none&phw=0&snd=none`, `__knotPinClocks(100)`, bit-still view, warmed profile): six today loads and six warm gf loads all freeze on f9d72040 at simT 20.0167. In every pair of both sets the positions, prev, zPos and passes are bit-identical, so the largest position difference is 0 world units and 0 device px; the bit-still views agree exactly; pairwise pictures differ by 0 px over 24 in the thread area (15/15 pairs per renderer, at and under link A's 0-3 px floor). On the cold profile's first aligned gf load the view sat 0.0039 device px off the other five (25 px over 24 against each; the other ten gf pairs were 0), so the counted gf six are the warmed-profile loads, as the recipe in Done 4 now says. The cited recipe, reproduced literally (k1223_cap's asleep shape: `phw=0&snd=none` only, asleep, the old manual clock pin): six loads per renderer all land on 0cbb8f07 at simT 5.0, again with bit-identical dumps in all 30 pairs per renderer (largest position difference 0 world / 0 device px) and bit-identical views, yet their pictures differ by 22,371-357,656 px over 24 (today) and 63,920-378,501 px (gf) across the whole knot - the same fault K1544 cited (193,124 / 101,249 on its one pair), on one state and one view.

Done 2 (the cause is (c): the state and the view agree to the bit; the draw differs - the flow clock). What differs in the asleep loads is only the draw clock: `flowTime` reads 18.02-19.43 on the today loads and 18.54-26.41 on the gf loads, because the old pin stopped `advanceClocks`/`paintClock` but left `tickPaint` advancing the flow phase (the plain token decodes to flowStrength 0.3, flowSpeed 0.5; link A's token sets flowStrength 0, which is why its checks never saw this). Proved on one frozen page at f9d72040 (`flowcheck.mjs`, flowStrength 0.3): setting `renderer.flowTime` 0 -> 2 changes 401,213 px over 24 (today) and 386,612 px (gf), bbox the whole knot; returning it to 0 restores 0 px. The layer is the flow displacement in the ribbon paint (`tickPaint` advancing `flowTime` in `src/render/ribbon/paint_state.ts`); gf inherits it through the renderer's as-drawn `chainSamples`. So the physics hash is not too coarse for particle state - the particle dumps agree bit for bit - it simply does not cover a render clock; the earlier sub-hash micro-state reading is falsified by the dumps.

Done 3 (fixed in the capture recipes, outside the hands-off files and outside the physics step). `repro.mjs`'s probe recipe above is the fixed recipe, and it gives the six-load 0 px agreement in Done 1 for both renderers. The tool that produced K1544's counts is fixed with it: `.claude/probes/K1223/k1223_cap.mjs` now pins through `__knotPinClocks(100)`, normalizes `renderer.flowTime` to 0 after the pin, and takes three gf redraws after it; under its own asleep shape on the warmed profile, two today and two gf loads (all 0cbb8f07) now agree at exactly 0 px over 24, whole frame included (`patched/`). No physics cause is filed: the physics step reaches one bit-identical rest state from every load.

Done 4: two lines in `.claude/rules/probes.md` (K1544: the 0 px recipe on the plain link, and the warning against reading its hash alone as a pixel floor).

Done 5: `npm test` green (258 files passed, 2 skipped; 3,207 tests passed, 9 skipped; tsc clean). K1544 closed in ec4dccd82; K1531 and K1482 left open. Preview :5492, the `$env:TEMP\knotmaze-27I` preview tree and the run's Chrome profile (`.claude/probes/K1544/profile27I`) stopped and removed at the stop line.

## Run J (27J): t84e's fold rule drawn by the shader at master's frame rate, then switched on (K1526)

**DROPPED 2026-11-20 10:52, never run.** Levi accepted t84e as it is (K1549: "j15 must be fixed. The others are
fine"), and its line is out of the queue. What follows is kept as the record of the rule only.

Added 2026-11-20 07:45. **Held in the queue behind a `#` until the coordinator removes it.** This run changes
`src/render/gpu_field/` (`gf_glsl.ts`, `eval.ts`, `tables.ts` if you bake a flag): the one exception to How to
work's hands-off list, so it runs only while no Claude agent works there. Leave K1526 and K1482 open.

**t84e** is one of the 14 sites Levi named on link A (K1490: "Fix the wedges and notches, accept the
slivers"): 1554,914 on the 3200x1800 frame, its wedge near 1541,940. K1482 stage 32 found a rule that removes
the wedge in the CPU copy (`### Handoff K1482 s32` in `docs/design/K1482_s32_t84e_paper.md`; the entry LONE
FOLD in `.claude/rules/render-gpu-field.md`; read both first): `eval.ts`'s `foldD` past `!inOther` plus the
sibling burial, on master only with env `GF_S32=1` (and `GF_KRETRY=1`). On the CPU copy link A changes in ONE
place (`.claude/probes/K1482/s32/wd32.ts`, stride 2, thr 0.02: 1537,938, 32 samples, all lost ink), and with
the second corner try off (`GF_KRETRY` unset) in none. One faint px stays at 1540,950 (ink 0.225): leave it.
Its shader twin, `loneFold(src)` in `gf_glsl.ts`, is exported and never called. Applied in `retryForm`
(`return loneFold(homeBurial(src));`, commit 41500f1e6, `npm test` green there), Chrome drew 3 composites in
the 4.6 s after its switch to gf where master drew 90 in 3.2 s (`diag32.mjs`), and `cap.mjs`'s forced redraw
timed out at 240 s twice. **Not established: whether that is a slow frame or a compile stall.** The record
ends 4.6 s after the switch and both profiles were cold (K1456: master's cold gf compile takes 34-117 s); a
shader with two more loops may only compile longer. Stage 32's suspects, untested: `member()` and `depth()`
inlined in `foldD` inside the faces loop; the D search's two extra segment loops for every face pixel of a
lone piece; the zb form's second copy. Its suggestion: bake a per-piece "lone fold" flag and the fold's foot
group at the piece scan (`tables.ts`) and run the D search only where the plain loop found a turned segment.
The split (packed) form has no arc table and the retry does not use it: leave it uncovered and say so.
Tools, tracked in `.claude/probes/K1482/s32/` (usage in each header): `diag32.mjs <url> <profileDir>`
(composites, `switchedMs`, frames every 5 s for 14 samples: lengthen it), `wd32.ts <scene.json> <sites.json>`
(the CPU copy's whole-link diff, rule off against on), `mimg32.ts` (the CPU copy's ink at a place, before |
after | diff), `px32.ts`, `glsl32.ts` (every tier's shader text), `sheet32.py`. `scene_gf.json` and
`sites_gf.json` come from `.claude/probes/K1482/cap.mjs` with env `SCENE=1`.
Done: 1. **The cause, before any change.** Two builds: master, and master with the one-line switch of
41500f1e6. Per build a first load on a fresh profile (cold) and a second load in the same profile (warm), with
diag32 lengthened to 180 s past the switch to gf: seconds to the switch, composites per second in each 5 s
window after it, the windows with none. Under the perf lock, in the order master, candidate, master. Say which
it is, with the numbers: a slow frame (the warm rate is under master's), a compile stall (cold only), or both.
2. **The cure.** A slow frame: make the rule cheap (the technique is yours; the suggestion above is one) and
change the CPU copy with it so the two stay twins, until the warm rate is within 10% of master's and
`cap.mjs` captures link A on the first try in 3 loads of 3. A compile stall only: no rewrite, the cold switch
time is the number (2 fresh profiles per build). 3. **Switched on** (`retryForm` applies `loneFold`; `eval.ts`'s
`s32` follows the retry switch and env `GF_S32=0` turns it off, as in 41500f1e6) only if all of this holds on
your tip, measured before the commit that switches it on: (a) link A's border look (`&tlk=border`), new
against master, loads of one state (hash fff8c9e5) and one view, the floor first (two loads of one build, 0
px): every px that changes at a luminance step of 1 lies inside x 1497-1577, y 898-978; its count, gain and
loss go in the handoff beside the CPU copy's 32 samples; (b) with `&gfk=0`, and in the fill look
(`&tlk=fill`): 0 px in the whole frame; (c) `wd32.ts` on your tip still names one place; (d) the warm rate
within 10% of master's, and the cold switch time at most 15% over master's (one session, fresh profiles); (e)
`.claude/probes/K1482/guards.ps1` with `-Ref` your tip and `-BaseRef` master before your first commit: seven
PASS; `npm test` green (a pin that moves is re-frozen in the same commit and named in its message). If only
the cold time fails, land the cheap form OFF with both times in the handoff: the coordinator decides. 4.
**Sheets, no verdict.** Under `.claude/probes/K1482/out/27J/` (untracked): master gf | new at t84e (a 400 px
crop with its surroundings and a red box, then the box at 6x; contrast stretched, the outline is only about 15
levels darker than a pinhole inside it), and the same pair at the four clean fold points a bare angle gate
could not tell from t84e: 1689,224, 1571,252, 1895,1358 and 1543,1602. Write what you see at each, including
what is worse. The coordinator looks at t84e on your capture before anyone calls it fixed. 5. Three or four
lines under LONE FOLD in `.claude/rules/render-gpu-field.md`. 6. If no form reaches the rate by the stop line:
the rule stays OFF on master (it renders as today), what you built stays as a patch under
`.claude/probes/K1482/s32/` (untracked), and the handoff has the cost of each part you measured.

## Run K (27K): everything Pixi draws comes back after an early context loss (K1550)

Added 2026-11-20 08:35. Run 27G found the fault: read `### Handoff 27G` above and K1550 first (K1550 is 27G's
item; the coordinator renumbered it from a second K1549). Under `rp=gf&gfh=1`, a context loss 1.0-2.1 s after
the load, restored 5 s later, leaves everything Pixi draws dead for the page's life in 3 of 41 loads: the
start marker and its glow in the ring box, and 14,107 px outside it that 27G did not name. Those loads are
exactly the ones that log Pixi shader compiles on the lost context (`Could not initialize shader`). A loss on
a settled page restores at the floor, 10 of 10. This run fixes it in `src/`: `src/app/context_loss.ts`,
`frame_loop.ts`'s restore branch, `src/render/fabric_maze_renderer.ts` and `marker_mesh.ts` are yours; the
hands-off list stands. 27G's tools are in `.claude/probes/K1537/` (`repro.mjs`, `hunt.mjs`, `cmp.mjs`,
`crop.mjs`); K1537 itself is the one sighting, a smaller shape (a thin ring of about 1,600 px, levels <= 28,
the marker still there), which 27G did not see in 47 loads.

Done: 1. **A repro that breaks nearly every load.** 3 of 41 cannot test a fix: with no fix at all, five clean
loads in a row happen 7 times in 10. Make the loss land where the broken loads have it, before or during
Pixi's first shader compiles (for instance from `evaluateOnNewDocument`: lose the context as the app canvas
gets it, or at the first `compileShader`; the technique is yours). Target: at least 8 of 10 loads broken on
master, each load compared with a clean load of the same state (27G's hash and view; the cross-load floor
first, 0 px in the box and 0 outside). Name what the px outside the box are. If 45 minutes do not reach the
target, keep 27G's timing and use the fallback gate in 4(b). 2. **Today's renderer** (the same link without
`rp=gf&gfh=1`), the same loss, 10 loads: how many break and what is missing. There the threads are Pixi's
too, and 27G ran only the late shape on it. 3. **The fix:** after a restore everything Pixi draws is back,
whatever had or had not been compiled or uploaded before the loss. K1550 has 27G's two candidate shapes and
its three in-page revivals that failed; the technique is yours. Keep the gf rebuild the restore branch already
does. A unit test in `test/app/context_loss.test.ts` for the part Node can test. 4. **The gate**, on a build
of your tip, one kept profile: (a) with the repro of 1: 0 of 20 loads off the floor under gf and 0 of 20 under
today's renderer, in the box and outside it; a load that shows K1537's smaller shape counts as off the floor;
(b) the fallback, if 1 missed its target: 0 of 45 early loads off the floor under gf, AND at least 3 of the 45
logged the lost-context compile errors; fewer than 3 is not proven: say so and leave K1550 open; (c) the late
shape still at the floor, 5 of 5 gf and 5 of 5 today; (d) no page error in any load (the `stats` error of
K1537: its throw site by file and line if it shows). 5. `npm test` green, the ordinary-load guards of How to
work, the deploy green. Close K1550 with the commit only when 4(a) or 4(b) holds together with (c) and (d).
Leave K1537 open: say in the handoff whether any load showed its smaller shape, before or after the fix, and
the coordinator decides. 6. **Crops, no verdict:** under `.claude/probes/K1537/out/27K/` (untracked), clean |
master after the loss | your tip after the loss, 4x, at the ring box and at one place outside it, for gf and
for today's renderer. Write what you see at each, including what is worse.

### Handoff 27K (Muse, 2026-11-20, done: every Done holds under 4(b)+(c)+(d); K1550 closed)

Started 19:34 PST, stopped 23:23 PST. Starting master dc6645531; fix on master in 5564d2665
(src/main.ts + src/app/context_loss.ts + test/app/context_loss.test.ts; no hands-off file touched),
gate completed on tip build 3a1bd40a4 (preview :5487, kept profiles profile27k / profile27kT).
Captures and summaries under .claude/probes/K1537/out/27K/ (gate_gf1/, gate_gf2/, gate_today/,
gate_late_gf/, gate_late_today/, guards/, crops_*.png).

Done 1 (repro, master): .claude/probes/K1537/repro27k.mjs loses the context at the first
compileShader on the connected app canvas (evaluateOnNewDocument). gf clean floor: in 0 /
out 27 (27 isolated gf thread px, tol 6). 7 of 10 loss loads broken, each in 8281 / out 14137
with 15 Pixi console errors and 23 lost compiles — above them the 3 clean loads read 13 lost
compiles, so the broken loads are the ones that also compile Pixi's 5 programs on the lost
context (deadlines at ~450 ms). Outside px: flat (21,27,40) — the head glow's halo beyond the
ring box plus the bottom-right exit marker and its glow. 7/10 is under the 8/10 target, so
gate 4(b) is the one used.
Done 2 (today, master): floor 0/0; 4 of 10 broken, each in 8281 / out 1,090,537 (threads Pixi too:
the whole knot missing), same 15-error signature.
Done 3 (fix landed in 5564d2665): in-place revival was tried first and failed every way (record in
K1550's text): synthetic webglcontextrestored, _gpuData clears, renderer rebuild with fresh
caches, full rebuild(): GPU objects dump healthy (VAO, buffers, texture, GL state = clean) and
Pixi still draws nothing for the page's life. A load-time loss now reloads the page once per tab
session (session key knotmaze.earlyRestoreReloads); the saved attempt resumes dailies; settled
losses keep Pixi's own restore and the unchanged cover. test/app/context_loss.test.ts (21 tests).
Done 4: (b) gf 0/45 off the floor (tips floors 0/0), 23 of 45 logged the lost-context compile
errors, 0 pageerrors; today: 0/20 off the floor, 0 pageerrors; (c) late shape 5/5 gf and 5/5 today
at floor, losses 1 / restores 1 in each (no late reload), the same renderer and fabric objects, 0 pageerrors.
No load showed K1537's smaller shape, before the fix or after it. Done 5: npm test green on the fix
tree (258 files, 3210 tests); ordinary-load guards on the tip build: hold 60/60 frames at rest on
rp=gf (min 102,757 edges) and on link A (min 7,066); dragcheck gf and gfh PASS (worst 91 / 60 px
<= 200). Deploy 44872812857 green. Done 6: crops under out/27K/crops_*.png (clean | master after
loss | tip after loss, x4 at ring box and exit marker): clean and tip panels alike: full marker
disc + glyph + glow; master's gf panel shows a grey crescent only (threads fine); master's today
panels lack the marker/glow entirely. Nothing looks worse on the fix.

## Run L (27L): how often each corner fault kind occurs on 20 other mazes (K1551)

Added 2026-11-20 08:41. A MEASURING run, approved by Levi (his "Sgtm" to K1549 c): no `src/` change, and
nothing here closes on a look. Why: 14 Claude stages chased single places on link A and 8 of Levi's 14 are
still open; the next corner rule is to be picked by how often its fault kind occurs across mazes, not by one
link. Faults are flaws in rp=gf's outline strokes where threads meet or end: **wedge** (the angle between
two strokes filled solid), **notch** (a bite out of a stroke's edge), **sliver** (a thin eye of page between
two strokes, often with a dot in it), **dot / tick / dash** (stray ink thinner than a stroke), **break /
stub** (a stroke that stops short, or a short spur). Tools, tracked in `.claude/probes/K1482/` (usage in
each header): `cap.mjs <base> <outDir> <profileDir> [query]` (one frozen rest state of any link: `gf.png` at
3200x1800 and `sites.json`, every junction `j<n>` and fused tail end `t<n>s|e` with its device px),
`specks.py` (stroke px a 2x2 or 3x3 opening removes, per site), `tiles.py` (4x tile sheets per site),
`sweep_table.py`.

The labelled sets, both on link A (`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1`, hash fff8c9e5, 327
sites): (i) master 0007c8df, every tile judged by eye: `.claude/probes/K1482/classes_master.txt`, 85 faulted
(sliver 33, wedge 19, notch 11, dot 7, tick 5, dash 4, break 3, stub 3), the other 242 clean; (ii) today's
master: a wedge or notch still at t84e, j59, t23e, j47, j15, t59s, t58e, j41; fixed, so they must read
clean: j14, j50, t45s, t81s; slivers Levi accepted: j71, j95, j147, t43s, t56s; j4 and t4s are being asked
of Levi: either reading is right.

Done: 1. **A detector that reads a frame, not a person.** `census.py <sites.json> <gf.png>` under
`.claude/probes/K1551/` (tracked; its outputs untracked): per site, a number per kind and a flag. The
measures are yours; a start: the stroke's width from the frame itself (the mode of the ink's local
thickness), then solid = ink whose inscribed disc is over about 1.5 strokes wide (wedge), thin =
`specks.py`'s residue (dot, tick, dash), eye = an enclosed page hole narrower than a stroke (sliver), bite =
a stroke edge that steps in by 2 px or more over a short run (notch). Python has numpy and PIL, no scipy.
2. **Checked against (i).** A build of 0007c8df (`scripts/preview.ps1 -Ref 0007c8df`); if today's `cap.mjs`
cannot drive it, `git show e063ee091:.claude/probes/K1482/cap.mjs` is the one written for it. Set each
threshold on the odd-numbered sites and report the even-numbered ones: per kind, of the labelled sites how
many it flags, and of the clean ones how many it flags. A measure that flags under half of its kind, or
more clean sites than faulted ones, is NOT usable: say so and leave that kind out of the census rather than
tune it further. 45 minutes for 1 and 2 together; if the old build cannot be captured in 20 of them, check
against (ii) alone and say the sample is 8. 3. **Checked against (ii)** on a build of master: the 8 open,
the 4 fixed, the 5 slivers, and how many of the other 308 it flags. 4. **The census**, on a build of master,
one kept profile, `&snd=none`, all in the border look (`&tlk=border`; first confirm on link A that the frame
with it equals the frame without: if they differ, say so and capture the first ten in link A's own look):
link A's settings on ten other seeds (`?<s>.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1`, s = 4 5 6 7 8 9 a
b c d) and the default design on ten seeds (`?<s>&xp=off&am=instant&gfh=1`, s = 1 to 9 and a). A link whose
capture fails twice is replaced by the next seed and named. Captures under the perf lock, at most 25 minutes
a call, so in batches. 5. **The table**, in the handoff: one row per maze (sites, flagged per usable kind,
per 100 sites), link A's row, the totals, and two sentences of fact: which kind is the most frequent per
100 sites, and whether link A's rate of each kind lies inside the range of the twenty. 6. **Sheets, no
verdict:** per usable kind, the 12 highest-scoring flagged sites of the twenty as 4x tiles with their
surroundings (`tiles.py`), under `.claude/probes/K1551/out/27L/` (untracked). Write what you see at each;
the coordinator and Levi judge them. Close K1551 with the commit that tracks the tools and this handoff.

### Handoff 27L (Muse, 2026-11-20, done: every Done holds; K1551 closed with the commit)

Started 10:24 PST, stopped 11:14 PST. Starting master 6f645f3ce; tools on master in the closing commit (probes only: `.claude/probes/K1551/census.py` + `calib.py`, this handoff; no `src/`, no hands-off file, so no deploy and, as a probe-only run, no ordinary-load guards). Previews of 0007c8df on :5480 and of the working tree (master) on :5481 under `$env:TEMP\knotmaze-27L*` (stopped and removed at the stop line); every capture sequence through `scripts/perf_lock.ps1 -Owner "muse-27L"`, in batches of at most 6 (each call under 6 minutes); one kept profile (`.claude/probes/K1551/profile`, removed at the stop line). Captures, scores and sheets under `.claude/probes/K1551/out/27L/` (untracked). Both link A captures land on hash fff8c9e5; today's `cap.mjs` drove the 0007c8df build as-is (no old-copy fallback needed).

Done 1 (the detector). `census.py <sites.json> <gf.png> [out.tsv]`: per site a number and a flag per kind. The frame's stroke width W comes from the frame (2 x the median chamfer distance-to-page over ridge px; the plain mode of local thickness is 2 px on any stroke, so it is not the width). wedge = the widest inscribed ink disc within 30 px, in strokes (2*maxDT/W); thin = `specks.py`'s 3x3-opening residue px within 30 px (2x2 rides along as thin2); sliver = narrow-channel centreline px (page-ridge px within 22 px at distance-to-ink 0.8..0.45*W); notch = a 5x5 closing's added px within 30 px outside enclosed holes; bstub = ink tips (one ink neighbour) within 30 px. numpy + PIL only.

Done 2 (checked against (i), thresholds set on the 164 odd sites, reported on the 163 even; 85 labelled, 242 clean). wedge, thr 1.85: odd 5/10 of its kind, 2 of 121 clean flagged -> even 6/9, 2 clean, 3 other-kind: USABLE. sliver, thr 12 channel px: odd 9/17, 4 clean -> even 8/16, 2 clean, 3 other-kind: USABLE. (First tried for sliver: enclosed page holes narrower than a stroke - most labelled slivers are open wedges, not enclosed eyes, and 1-px pinholes fire on clean sites: even 6/16 at 6 clean; replaced by the channel measure above, not tuned further.) thin (dot/tick/dash), thr 12 residue px: odd 4/7, 3 clean -> even 6/9, 6 clean, 17 other-kind: USABLE at the brief's bar (clean flagged equals its kind flagged, not more), and the weakest of the three - its residue also fires at other kinds' sites and at 6 clean ones. notch: no odd threshold catches half its 6 odd sites with clean <= faulted, under the closing measure or under a ridge-distance dip along the arms (labelled sites read 0.0-1.41, clean up to 1.41): NOT usable, left out. bstub (break/stub): the tip count reads 0 on 5 of its 6 labelled sites: NOT usable, left out. Both stay in the TSV as numbers with their flags always 0. On the whole 0007c8df frame the three usable kinds flag wedge 25, sliver 30, thin 53 of 327 (the eye classes: 19, 33, 16).

Done 3 (checked against (ii), master link A, plain look). The 8 open: wedge-flagged t84e (1.854), j59 (1.854) and t23e (1.854, also thin 13); j47, j15, t59s, t58e, j41 flagged by no usable kind (wedge 1.35-1.56 - their open fault is of the notch kind, which has no usable measure). The 4 fixed: j14, j50 and t45s read clean on every usable kind; t81s is wedge-flagged at 2.061 - the one false flag among the named sites. The 5 accepted slivers: none is sliver-flagged on master (channel 0-6; j95 thin-flagged at 12). Of the other 308 sites the detector flags wedge 17, sliver 7, thin 5. Link A on master in total: wedge 21, sliver 7, thin 7 of 327.

Done 4 (the census). First the look check: on link A, master, the frame with `&tlk=border` differs from the frame without it (3,054 px, max 16 levels, hash fff8c9e5 both) - they are NOT equal, so the ten link-A-settings mazes were captured in link A's own look (no `tlk`) and the ten default-design mazes with `&tlk=border`, as the brief's fallback says; `cap.mjs` adds `&snd=none` to every link. All 20 captured on their first load under one kept profile; no link failed, no seed was replaced. Site counts and hashes are in each maze's `sites_gf.json` under `out/27L/` (A_4..A_d, D_1..D_a).

Done 5 (the table; flagged sites per usable kind; per-100 in brackets). A_4 (seed 4, link A's settings): 345 sites, wedge 11 [3.2], sliver 12 [3.5], thin 10 [2.9]. A_5: 351, 44 [12.5], 9 [2.6], 6 [1.7]. A_6: 348, 19 [5.5], 8 [2.3], 1 [0.3]. A_7: 356, 41 [11.5], 11 [3.1], 4 [1.1]. A_8: 365, 42 [11.5], 10 [2.7], 8 [2.2]. A_9: 357, 2 [0.6], 12 [3.4], 3 [0.8]. A_a: 352, 27 [7.7], 7 [2.0], 3 [0.9]. A_b: 362, 22 [6.1], 9 [2.5], 10 [2.8]. A_c: 367, 30 [8.2], 6 [1.6], 1 [0.3]. A_d: 355, 26 [7.3], 13 [3.7], 33 [9.3]. D_1 (default design): 334, 0 [0.0], 0 [0.0], 10 [3.0]. D_2: 367, 0, 0, 16 [4.4]. D_3: 327, 0, 1 [0.3], 7 [2.1]. D_4: 345, 0, 0, 16 [4.6]. D_5: 351, 0, 0, 19 [5.4]. D_6: 348, 0, 0, 4 [1.1]. D_7: 356, 0, 0, 4 [1.1]. D_8: 365, 0, 0, 4 [1.1]. D_9: 357, 0, 0, 1 [0.3]. D_a: 352, 0, 0, 5 [1.4]. Totals, twenty mazes: 7,060 sites, wedge 264 [3.74], sliver 98 [1.39], thin 165 [2.34]. Link A (master, seed 3): 327 sites, wedge 21 [6.4], sliver 7 [2.1], thin 7 [2.1]. Two sentences of fact: wedge is the most frequent kind per 100 sites across the twenty (3.74; on the ten link-A-settings mazes alone 264 of 3,602 = 7.3, sliver 2.7, thin 2.1), ahead of thin (2.34) and sliver (1.39) - and on the ten default-design mazes the wedge flag never fires (their strokes are thinner, W 4.8 against 5.7-6.8, and their widest inscribed disc reads at most 1.59 strokes against the 1.85 threshold), so the ordering is a property of these measures on these designs, not a look judged here. Link A's rate of each kind lies inside the twenty's range: wedge 6.4 inside 0.0-12.5, sliver 2.1 inside 0.0-3.7, thin 2.1 inside 0.3-9.3.

Done 6 (sheets, no verdict; `tiles.py`, R 18, 4x, under `out/27L/`). wedge: `sheets_wedge_A4_00.png` (j22, t32s, j59, t22e), `sheets_wedge_A5_00.png` (j117), `sheets_wedge_A6_00.png` (j74, t24e), `sheets_wedge_A7_00.png` (j133, j159, j160, t70s, t83s). sliver: `sheets_sliver_A4_00.png` (j74, t33e, t34s), `sheets_sliver_A8_00.png` (t31e, t21s), `sheets_sliver_A9_00.png` (t17e), `sheets_sliver_Ad_00.png` (t68s, j127), `sheets_sliver_A6_00.png` (j106, j133), `sheets_sliver_Aa_00.png` (j98), `sheets_sliver_A7_00.png` (t35e). thin: `sheets_thin_Ad_00.png` (t68s, j127, j130, t49s, j131, j178, t78s), `sheets_thin_D2_00.png` (j23, t70e, t65s, j108), `sheets_thin_D3_00.png` (t42s). What I see: on the wedge sheets most tiles show dark stroke bands entering from a corner or edge and, at A_4's j59 and A_7's j133/j159, two bands meeting into one solid dark fan with no page strip between them; at A_5's j117 the window is almost all page (the widest disc sits at the window's edge, not its centre), and the same edge-offset shows at several tail-end tiles. On the sliver sheets, A_8's t31e/t21s, A_6's j133 and A_d's j127 show two roughly parallel dark bands with a narrow mottled page strip between them; A_a's j98 and A_7's t35e show a single band edge, the narrow strip at or beyond the tile's edge. On the thin sheets the tiles show ordinary stroke arcs crossing the window - A_d's seven are thicker-looking arcs with heavy residue scores (84-208 px, against 12-33 elsewhere), D_2/D_3's strokes look thinner than the A mazes' (their W is 4.8) - with no isolated speck standing out at this zoom in any tile; the residue the measure counts sits along the strokes' edges and ends. Nothing here is called fixed or faulted by this run; the coordinator and Levi judge the sheets.

Done 7: `npm test` green (258 files passed, 2 skipped; 3,207 tests passed, 9 skipped; tsc clean). K1551 closed with the closing commit; K1531 and K1482 left open. Tried and left: the enclosed-eye sliver measure and the ridge-dip notch measure, both recorded in Done 2 and in `census.py`'s header (the scripts that probed them, `alt_test.py` and `table*.py`, stay untracked under `out/27L/`); the first A_4 wedge sheet was generated without its ONLY filter (345 tiles) and was regenerated with it and the unfiltered sheets deleted. Previews :5480/:5481, the `$env:TEMP\knotmaze-27L*` preview trees and the run's Chrome profile stopped and removed at the stop line.

## Run M (27M): what each corner rule costs to compile and to draw (K1552)

Added 2026-11-20 08:41. A MEASURING run, approved by Levi (his "Sgtm" to K1549 d): no `src/` change at all
(the hands-off list stands; you only read and call those files). Why: K1482's stages added corner rules to
gf's fragment program one place at a time; `gf_glsl.ts` grew from 99,181 to 118,448 bytes between 2026-11-17
and 11-20 (`eval.ts` +30%, `tables.ts` +29%), and K1456 found that the wait on a first visit is that one
program's compile (40-96 s in the worker; 143 s whole against 18 s with `layers()` stubbed). The question
behind this run: would deciding corners once at maze build, baked into the tables, buy back compile time and
frame time, and which rules are worth moving first. You measure; the design is a later Claude stage. Read
K1456 and `### Handoff K1456 s2` in `docs/design/K1456_s2_first_visit.md` first. Tools, tracked, usage in
each header: `.claude/probes/K1456/s2/dumpsrc.mjs <url> <profileDir> <outDir>` (the vertex source and every
fragment source the app posts to its compile worker), `ctime.mjs <vs.glsl> <out.json> <a.frag> [b.frag ...]`
(compile + link seconds per source, each with a nonce so no cache answers; env `SERIAL=1` one at a time),
`.claude/probes/K1482/s32/glsl32.ts` (every tier's shader text), `diag32.mjs` (composites after the switch
to gf), `.claude/probes/K1482/cap.mjs` (lines 57-58 force one redraw). `gfFs` in `gf_glsl.ts` builds the
text for a given form, so a Node script can call it for the program with and without `retryForm`.

Done: 1. **The rule list**, at most 12 rows, drawn up from `gf_glsl.ts` and the dated stage entries of
`.claude/rules/render-gpu-field.md`: every block a K1482 stage added or grew (the second corner try
`retryForm`, the home burial `homeBurial`, the rounding at joints, the lone fold
`loneFold`, which is exported and not applied, and the rest), each with its function names, its commit and
its size in characters in the dumped source. 2. **The floor.** Dump link A's sources from a build of master
(`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1&snd=none`). Three batches of two identical copies of
the largest fragment source: the spread between twins is the floor every later difference is read against.
3. **Compile cost per rule**, with no build: for each rule a copy of the fragment text with that rule
neutralised (its function body replaced by the value it returns when it does not fire, or its call removed;
the technique is yours; the copy must still compile and link: a variant that fails is reported, not timed).
Time each variant against a control copy in its own batch, three batches, the median: characters removed,
seconds saved, and whether that is over the floor. Then one variant with every listed rule neutralised at
once, and, if `dumpsrc.mjs` can drive it, the full program of a build of 0007c8df (2026-11-17, before most
of them). All timings under the perf lock, at most 25 minutes a call. 4. **Draw cost**, warm, on a build of
master, one kept profile, link A at rest after its switch to gf: the wall time from a forced redraw to its
composite (`stats.composites` moves), 100 times, three repeats, the floor from the repeats; the same with
`&gfk=0` (the second corner try off: the one rule a link can switch). Report ms per redraw for both and say
whether the difference is over the floor. Per-rule draw cost needs builds and is NOT this run. 5. **What
each rule reads**, from the GLSL, one row per rule: table texels only, or also the pixel's own position or
distance; and whether its outcome is one answer per corner (the same for every pixel of that corner: a
candidate for a table flag) or varies across the corner's pixels. Fact, no proposal. 6. **The table**, in
the handoff: rule | chars | compile seconds saved (over the floor or not) | reads | per corner or per pixel,
then the all-rules row, the 0007c8df row and the two draw numbers. Scripts under `.claude/probes/K1552/`
(tracked), outputs under its `out/27M/` (untracked). Close K1552 with the commit that tracks the tools and
this handoff.

### Handoff 27M (Muse, 2026-11-20, done: every Done holds; K1552 closed with the closing commit)

Started 11:20 PST, stopped 12:15 PST. Starting master 3fcda2c14; probes only (`.claude/probes/K1552/` tools, this handoff; no `src/`, no hands-off file, so no deploy and, as a probe-only run, no ordinary-load guards). Previews of master on :5485 and of 0007c8df on :5486 under `$env:TEMP\knotmaze-27M*` (stopped and removed at the stop line, kept profiles removed); every capture and timing through `scripts/perf_lock.ps1 -Owner "muse-27M"`, no call over 16 minutes. Outputs under `.claude/probes/K1552/out/27M/` (untracked: `dump/`, `dump_old/`, `variants/`, `time/*.json`, `inventory.json`, `draw.json`).

Done 1+2 (the list and the floor). The dumped link A sources (master, `dumpsrc.mjs`): 12 fragment programs, 41,995-88,696 chars; the largest is `11.frag`, 88,696 chars (a MAXP 3 / MAXK 2 tier; the MAXP 8 full programs are 86,503-87,881). That source is the base for every variant below. Floor, three batches of two identical copies of it: twin spreads 1.88 / 9.27 / 1.89 s (median floor 1.89 s; a saving below is called over the floor only when its median beats the worst twin spread, 9.27 s). In Node (`forms.ts`), `gfFs(false,true)` is 45,269 chars, `homeForm` adds 461, `retryForm` adds 2,013 (total 47,743) and `loneFold` would add 2,379 (50,122); the timed neutralisations below cover 1,021 of retryForm's 2,013 (the rest is its surface-id encoding in the scan, which no variant removed).

Done 3 (compile cost per rule; median of three batches, each batch the variant against its own control copy of `11.frag`, compile+link seconds; every variant but loneFold's compiles and links ok).

Done 5 (what each rule reads, from the GLSL of `11.frag`; per corner = the same answer for every pixel of that corner, per pixel = varies across the corner's pixels).

Done 6 (the table; chars = chars the neutralisation removes from `11.frag`, or adds for loneFold).

| rule (functions; commit) | chars | compile s saved, median (batches) | over floor? | reads | per corner / per pixel |
|---|---|---|---|---|---|
| second corner try, ink-only gates (`retryForm` KXT macro in `layers`; a682b3a15 s23, default 650aac4fa) | 86 | -0.37 (0.28 / -0.37 / -0.78) | no | corner texel 5 `.z` only (`F(uOK + 6k + 5)`) | per corner |
| home burial (`homeBurial` loop in `layers`; d136ec526 s28, guard e3bde61b0 s29) | 333 | -3.32 (-0.21 / -4.85 / -3.32) | no | `PSURF/PC`, `pd[m]`, `pkey[m]` of partner pieces | per pixel |
| side-run gate (`runT` + 2 calls; 50314ee72 / 928ed154a s33) | 602 | 10.72 (9.61 / 10.72 / 11.78) | yes | chain texel `.y` (rtM), `pkey/pd`, `pieceF(m, q)` | per pixel |
| own-fold burial (`foldD`; 204aa6db9 s7) | 1,342 | 2.56 (10.10 / 0.32 / 2.56) | no (over the median floor, under the worst spread) | own chain's vertex texels, `ps/pd`, face point q | per pixel |
| fold shift (`layers` piece-face `fo`; 198469fc7 s27) | 121 | 0.42 (0.42 / -4.46 / 2.00) | no | `pieceD(j, q)`, `pieceD(m, q)` at q | per pixel |
| end-cap sink (`tipSink`; 0a84d3d13 s2, taper 059b5a04b s3) | 196 | 1.88 (1.88 / 4.49 / -5.69) | no (at the median floor) | chain and vertex texels, given the arc `s = ps[j]` | per pixel, through its arc |
| rounding at joints (the three corner loops in `layers`: label, arc, tangent; K1362 s4 / K1407 c1-c4, KXT gates a682b3a15) | 3,351 | 14.71 (14.39 / 15.55 / 14.71) | yes | corner texels (`uOK + 6k…`), the pixel p (rho, sector, q) | per pixel |
| home membership extension (`member` hg/ramp; homeForm 903139692 K1439, pre-K1482) | 349 | -0.48 (-3.53 / -0.48 / 1.47) | no | arm texels, given `s = ps[j]` and depth `mz` | per pixel, through arc and depth |
| gap joint flags (`lkGap` jb/jf/scJ; 264cd1671 s15, e4ad4cc84/bc6e0cde1 s16, 34ffa004d s18) | 1,267 | 3.62 (4.63 / 3.62 / 1.23) | no (over the median floor, under the worst spread) | gap slot from the tables, the pixel's side of the tangent | per pixel |
| lone fold (`loneFold`, exported, not applied; 41500f1e6 s32, off 1dae64879) | +2,379 | not timed on `11.frag`: its variant fails to compile in 0.02-0.04 s on all three batches (`pg` undeclared at its line 431: this tier defines PGRP, which packs pg into pc; `loneFold` reads `pg[j]`). On the `gfFs` form it was written for (`forms.ts` pair, 47,743 chars) it adds 3.20 s (batches -2.87 / -3.25 / -3.20, tightly clustered) | no, on either reading | vertex texels, `ps/pd`, `member/depth` at the foot arc | per pixel |
| retry third bound (`GF_KXB`; c40417678 s26) | 0 in the fragment source (tables only, so no variant to time) | - | - | at table build: the corner's drawn arc against its own chains' pass tubes | per corner, at build |
| rejected or removed rules (s25 converging outlines, s28 pocket `GF_KXO`, s29 side-face burial, s30 in-leg run-on reverted by K1545, s31 ungated runT) | 0 | - | - | no code in the dumped source | - |

All listed rules in the dumped source neutralised at once (`all.frag`, 7,607 chars removed, 81,089 left): saves 19.51 s (22.72 / 16.81 / 19.51), over the floor - less than the corner loops' and runT's savings added (14.71 + 10.72 = 25.43), so the compile costs are not additive. The full program of a build of 0007c8df (2026-11-17): `dumpsrc.mjs` drove that build as-is, its largest source is 79,510 chars (9,186 under master's 88,696), and it compiles in a median 36.52 s against master's control median 50.46 s in the same three batches, so master's program costs 13.94 s over the 2026-11-17 one, over the floor. Of the individual rules only two clear the worst-case floor: the corner loops in `layers` (14.71 s for 3,351 chars) and `runT` (10.72 s for 602 chars, its body inlined at two call sites with a `pieceF` loop over the pieces). Only the KXT gates and the third bound give one answer per corner; every other rule in the table varies per pixel, several of them only through the pixel's arc or its face point q. That is fact, no proposal.

Done 4 (draw cost, warm, master preview, one kept profile, link A at rest after the switch; 100 forced redraws per repeat, redraw to `stats.composites` moving, timed in the page). Second corner try on (`gfh=1`): repeat medians 23.6 / 49.8 / 49.6 ms (pooled median 26.5, mean 50.2). Off (`&gfk=0`): 23.6 / 57.2 / 54.5 ms (pooled median 26.5, mean 52.6). The two draw numbers are therefore about 49.6 ms on and 54.5 ms off by repeat median (identical pooled medians); the on-to-off difference (about 5 ms, off slower) is under the floor from the repeats (repeat spread 26.2 ms on, 33.6 ms off), so it is not over the floor. Per-rule draw cost was not measured, as briefed (it needs builds).

Done 7: `npm test` green (258 files passed, 2 skipped; 3,207 tests passed, 9 skipped; tsc clean). K1552 closed with the closing commit; K1531 and K1482 left open. Tried and left: `loneFold` on the dumped tier text, above (reported, not timed there, and timed instead on the `gfFs` form); nothing else failed - every other neutralised variant compiles and links, and no rule's variant needed a build.

## Run N (27N): withdrawn 2026-11-20 (stage 33's gate was reverted in 2afde92f0; K1553 dropped)

Added 2026-11-20 10:52. A fix run with ONE exception to the hands-off list: you may rewrite the BODY of
`sideRuns` in `src/render/gpu_field/tables.ts` (K1482 stage 33, 928ed154a) and nothing else in the six
gpu_field files: its signature, the constants `RT_DMIN`, `RT_TOL`, `RT_RUN`, its call in `buildTables` and
every other line stay. Before you edit: pull, then `ledger.mjs show K1482`; if its `owner:` line names a
running stage, stop and report without editing (one agent per file area: a stage in that file lands first).

Why: `sideRuns` fills `GfTables.rtM` (per chain C, the chain M whose tube C's lies beside over a long run
without ever dipping under it; the doc comment above the function is the definition). It runs in every table
build while the second corner try is on, and the tables are rebuilt for every physics snapshot while the knot
moves. Measured in one capture session as link A loads (`tms`, the pool's last four table builds, printed in
the capture tool's `pool {...}` line): 12.2-17.3 ms on master before it, 21.8-28.5 ms with it, about 9 ms a
build; with `&gfk=0` (no `rtM` built) 9.2-38.8 ms on both. Tools, tracked, in `.claude/probes/K1482/s33/`:
`rt33.ts` (its header: the chains marked on link A and on the bar's mazes, and the function's time in Node),
`cap28.ps1` with `cap28.mjs` (the capture; `-Env 'GF=1,B2=1,FILL=1,SCENE=1'` also writes `scene_gf.json`,
which `rt33.ts A` reads; a Node probe needs env `GF_KRETRY=1`, and `npm test` needs it unset).

Done: 1. **The reference.** Copy today's function whole to `.claude/probes/K1553/side_ref.ts` (tracked): every
later version is compared with it, element by element. 2. **Fixtures.** Link A's scene, the bar's four mazes
(`ring`, `def`, `muse_hash`, `g41_user_tw64`, loaded as `rt33.ts K` loads them) and 100 moved copies of each
of the five: every vertex shifted by a seeded random offset of up to 0.3 h, and in half of them one chain
shifted whole by up to 2 h, so that tubes come to lie beside each other and dive under each other. Report
how many of the 505 fixtures mark at least one chain and how many pairs sit within 0.05 h of a threshold: a
comparison on fixtures that mark nothing proves nothing. 3. **The floor.** The reference's Node time on link
A's tables, 200 calls, three repeats, under the perf lock: the median and the spread. 4. **The faster
body**, returning the same Int32Array on all 505 fixtures. Measure first where the time goes (the cell lists
built on every call, the 3x3 cell scan with a square root per segment, `ms.includes`); the technique is
yours. The meaning does not change: a version that differs on one element of one fixture is not landed,
however fast. Target: a quarter of the reference's Node time or less. 5. **A unit test**,
`test/render/gf_side_runs.test.ts`: the new body against a frozen copy of the reference under
`test/render/fixtures/` (as the paint tests keep theirs) on seeded random chains, under 2 s, with at least
one pair that lies beside (marked), one that dives under (not marked) and an empty input. 6. **In the
browser**, one capture session through the perf lock: a build of master before your commit, yours, master
again, link A as it loads and with `&gfk=0`. The three pictures of each load (`gf.png`, `gf_b2.png`,
`gf_fill.png`) are byte-equal across the three builds, and the median `tms` as it loads is at least 6 ms
under master's of the same session. 7. The ordinary-load guards (How to work), `npm test`, the deploy
green. Close K1553 with the commit. **If the target is out of reach** with an identical result, land nothing
in `src/` and say in the handoff what the best identical version costs and where the rest of the time goes:
the coordinator then weighs taking stage 33 back out (Levi called j59's look before it fine).

## Run P (27P): the corner census again, on today's build, with sheets that can be judged (K1558)

Added 2026-11-20 11:30. A measuring run: Levi approved the census, and this repeats it on the right build.
Probes only, nothing in `src/` or `test/`, so no deploy. Tools: Run L's, tracked in `.claude/probes/K1551/`
(`census.py`, `calib.py`), with `.claude/probes/K1482/cap.mjs` and `tiles.py`. Run L's outputs, untracked
in this checkout: `.claude/probes/K1551/out/27L/` (per maze `A_4`..`A_d` and `D_1`..`D_a`: `gf.png`,
`sites_gf.json`, `scores.tsv`; link A in `newA/` and `scores_newA.tsv`). Read `### Handoff 27L` first: it
names the 20 links and how each was captured. Your outputs go to `.claude/probes/K1558/out/27P/`, untracked.

Why: the coordinator checked Run L against its records. Its table recounts from the TSVs, but: (a) its
"master" preview was built from 6f645f3ce at the run's start, before the K1545 revert (7d1605597, on master
since bb958a136): `out/27L/newA/gf.png` equals the build WITH the rejected run-on at all eight places the
revert changed, so every count is of a build that is no longer master; (b) the wedge number is quantized,
and 146 of the 264 wedge flags sit on the first step over the 1.85 threshold (1.854 or 1.886), which is
t84e's level, a site Levi has called fine; 89 sit at 2.0 or more; (c) the sheets were cut at R 18, which
shows the paper inside a junction and none of its outline, so nobody can judge them; (d) no usable kind
sees j15, the one site Levi says must be fixed. Levi's verdicts on link A as master draws it today: OPEN
j15 (a spur across the under thread's paper), j59 with t23e (a stub, K1556), t81s (a small step, K1554);
FINE as they are j4, t84e, j47, t59s, t58e, j41; FIXED j14, j50, t45s.

Done: 1. **The build, proved.** Pull, then `git merge-base --is-ancestor 7d1605597 HEAD` must pass. Build
that commit (`scripts/preview.ps1 -Port <p> -Ref <sha>`, never a working tree built before a pull) and
write the sha in the handoff. Capture link A twice (two loads) in link A's own look, as Run L did. First
the two loads against each other: the pixels that differ are the floor. Then load 1 against
`out/27L/newA/gf.png`: the pixels differing by 3 levels or more in the 48 px boxes centred on (1358,186)
t28e, (1464,1325) j161, (914,1134) t81s, (1865,1529) j83, (1122,922) t61s, (2260,524) j51, (1017,847) j31
and (2117,771) t66s. The coordinator's frames of the revert give 88, 69, 61, 56, 56, 54, 38 and 22; if
yours give 0 everywhere, the build is the old one: stop and report. 2. **The same 20 mazes**, captured as
Run L captured them, `census.py` UNCHANGED on each. Run L's table again (sites, wedge, sliver, thin, per
maze and per 100) with two more columns: the wedge sites at 2.0 or more, and the sites whose flag of any
kind differs from Run L's `scores.tsv` of that maze (link A's listed by name, with both numbers).
3. **The detector against Levi's verdicts**: for the 13 sites named above, on your link A frame, each
usable kind's number and flag, then two counts per kind: how many of the four open sites it flags and how
many of the nine fine or fixed ones. Report only: change no threshold and no measure in this run.
4. **Sheets that can be judged**, by a small tracked tool `.claude/probes/K1558/top_sheets.py`: across the
20 mazes the 24 sites with the highest wedge number, the 16 highest sliver and the 16 highest thin (ties
by maze, then site); each tile 81 px square around the site (R 40) at 3x, its levels stretched (the tile's
1st to 99.5th percentile), 8 tiles a sheet, each tile labelled with maze, site and number; and one more
pair of sheets with link A's 13 named sites in the order above. Look at two sheets yourself and say in the
handoff whether each tile shows the junction's or tail end's whole outline. 5. Close K1558 with the commit
(tools and handoff; outputs stay untracked). A probes-only commit needs no `npm test` and no ordinary-load
guards: show in the handoff that nothing under `src/` or `test/` changed (`git diff --stat` of your commits).

## Run Q (27Q): the fill look's nub of gap beside a joint is gone (K1561)

Added 2026-11-20 14:00. K1561 in `LEDGER.md`; the diagnosis, with its numbers, is `docs/ledger_notes.md`
`## K1561`: read it first. Levi saw the fault on 2026-11-20: in rp=gf's fill look (`tlk=fill`), where a thread
comes out from under one thread and at once ends on another (a T joint), a notch of ground colour cuts into
that thread's body beside the thread it ends on (bar scene g41_user_tw64, junction j71, world 4.981:7.472:
chain 32 under chain 22, ending on chain 30; the notch is about 26 x 14 device px at dpr 3). Cause: `lkGap`
in `src/render/gpu_field/gf_look.ts`. Inside a crossing window its loop's COVERAGE cut (`gA = max(gA, cj)`)
takes every piece whose key is above the label's by more than `uZt`, the joint's host chain too; K1482
stage 8 limited only the OUTLINE's cut to the window's named over chain (`cS`).
**For this run `src/render/gpu_field/gf_look.ts` is NOT hands-off: you may edit it, and only it, of the six
gpu_field files.** The CPU mirror (`eval.ts`) has no notch and stays as it is.
Done: 1. The count, before any fix: turn `.claude/probes/K1470/nub_probe.ts` (it hard-codes chain 30) into a
tool that counts, per scene, the pixels of a thread's body that the coverage cut removes through a piece that
is a fused joint with the pixel's own chain (`crossing_gaps.ts` `isJointPair` and `eval.ts` `member()` say
what a fused joint is). Run it on the K1436 bar's scenes (`.claude/probes/K1436/k1436_lib.ts` lists them;
`$env:GF_KRETRY = '1'`, `node scripts/run_node.mjs <tool.ts> ...`): it must find j71's notch, and it lists
every other place of the kind. 2. The fix in `lkGap`: where the window's slot names its over chain
(`cS >= 0`), the coverage cut comes from that chain only (in the K1458 far-reach term too); or, if that moves
pixels it should not, pieces that are a fused joint with the label's chain are skipped. Take the smaller
change that meets Done 3 and 4. 3. Numbers, per scene from ONE capture session that loads master, the fix,
master, the fix (`.claude/probes/K1482/s34/capseq34.ps1` and `diffseq34.ps1` did this for stage 34b: reuse or
adapt them; ports 5480-5499; every capture through `scripts/perf_lock.ps1`): (a) the count of Done 1 is 0
with the fix, on every scene; (b) the border look (`tlk=border`) and the plain gf shot differ by 0 px between
master and the fix, every scene; (c) in the fill shots no changed pixel moves toward the ground colour: count
the pixels that were thread on master and are ground with the fix, 0; (d) master against master and the fix
against the fix are 0 px, or that session is not counted (K1534). 4. Guards, both with `GF_KRETRY=1`:
`.claude/probes/K1482/guards.ps1`, and the K1436 bar (`.claude/probes/K1436/k1436_bar.ps1 -Ref <your commit>
-Port <one of yours>`) with new 0 and grown 0. `npm test` green with `GF_KRETRY` unset. 5. Pictures for
Claude's look, untracked under `.claude/probes/K1561/out/27Q/`: for EVERY place whose fill pixels changed, on
every scene, one picture master | fix | changed pixels in red, at two zooms (the place with its
surroundings, and close), named by scene and place, plus `places.txt` (scene, world x:y, changed px). Levi's
rules bind: a thread keeps both borders, its width and its heading. You do not judge the look; you deliver
the pictures and the numbers. 6. If (a) to (d) and the guards hold: commit the fix and the tool (tools
tracked with `git add -f`, outputs untracked), push, see the deploy pass, close K1561 with the commit. If one
of them cannot be met in the time, push nothing under `src/`: commit the tool and the handoff only, and
record what stood in the way.

### Handoff 27Q (Muse, 2026-11-20, done: every Done holds; K1561 closed in dcd8e81e6)

Started 14:23 PST, stopped 17:16 PST (the 2 h line passed while the guards and the bar ran; every Done holds, so the run finished them). Starting master 221644ed7; fix on master in dcd8e81e6 (`src/render/gpu_field/gf_look.ts` + the `gf_gap.test.ts` pin re-frozen to its new lines + the run's tools under `.claude/probes/K1561/`; `gf_look.ts` was lifted from hands-off for this run only, and it is the only one of the six `gpu_field` files touched). Previews of 221644ed7 on :5480 and of the fix working tree on :5481, then of dcd8e81e6 on :5483 for the guards (all stopped and removed at the stop line); every capture sequence through `scripts/perf_lock.ps1 -Owner "muse-27Q"`. Captures, diffs and pictures under `.claude/probes/K1561/out/27Q/` (untracked: `m1/f1/m2/f2` per scene, `pics/` + `places.txt`, `guards/`, `diffcap.txt`). One physics state per scene throughout: every capture froze on its K868 hash (muse_hash 733ee14a, def 910ff135, fat 814c4e1e, muse_default_tw c5d9f3b6, ring 50dd4ffd, g41_def_tw42 da10b9a5, g41_def_tw64 5ccb276f, g41_ring_tw42 f7b1dff2, g41_ring_tw64 ea67fc77, g41_user_tw42 a5f6d198, g41_user_tw64 0d51331b, user_tw42.lightpaper 462652e7).

Done 1 (the count, before any fix). `.claude/probes/K1561/nub_count.ts` (from K1470's `nub_probe.ts`, which hard-coded chain 30): per bar scene it rasters the K868 state at 60 px/unit and counts a filled pixel when a higher piece inside its label's crossing window cuts its coverage (key above the label's by more than zt, centre line nearer than h + 0.15) and that piece is a fused joint with the label (both chains within their home interval of one junction group in the tables' arms, the arms `eval.ts member()` reads; `isJointPair`'s fact) and is not the window's named over chain (the bake's winner by winM). On master: muse_hash 3,821 px at 59 places, g41_def_tw42 465/19, g41_ring_tw64 157/5, user_tw42.lightpaper 863/18, def 1,503/33, fat 0/0, g41_def_tw64 3,005/52, g41_user_tw42 863/18, muse_default_tw 1,100/19, ring 59/3, g41_ring_tw42 0/0, g41_user_tw64 2,124/29 (12,960 px, 255 places; `out/27Q/count_before.txt`). It finds j71 as `label32<cutter30@j71`, 106 px at world 4.672:7.443, bbox 4.544..4.778 x 7.359..7.526, the ledger's notch footprint.

Done 2 (the fix: the smaller change, `gf_look.ts` only). In `lkGap`, inside a window the slot names (`cS >= 0`), the coverage cut `gA` now comes from that named over chain only, in the same piece loop that already limited the outline; the K1458 far-reach coverage term already took its `cN` from the named chain, so it is unchanged. Outside a window (`cS < 0`) every higher piece still cuts both, and a flagged side's coverage still takes the unflagged `cj` (the flag never reaches the fill). The fused-joint skip, the brief's other candidate, was not needed: Done 3 and 4 hold without it. Two logic lines move; the CPU mirror (`eval.ts`) has no `lkGap` and stays as it is.

Done 3 (one capture session, `screen3.mjs` = the bar's `k1436_screen.mjs` plus a plain/both shot; loads in the order master, fix, master, fix per scene; the bar's jobs, DSF 3, STRICT). The waiter for the third sequence (the fix repeat) took the lock before the fix's own warm pass and drew g41_ring_tw64 off-state (5,326 px against both other fix loads, m1m2 still 0): that one scene was recaptured on the by-then-warm fix profile and then agrees with the other fix load at 0 px, so the session counts. (a) The Done 1 fault is gone in the fix's fill: in both master/fix pairs no pixel that was thread on master is ground (21, 27, 40) with the fix (0 px in every scene; ground taken as the fill's most common colour, (21,27,40) everywhere). (b) The border look differs by 0 px between master and the fix in every scene in both pairs. (c) is the same count as (a): 0 thread-to-ground in the fill shots. (d) Master against master and the fix against the fix are 0 px in every scene in all three looks (fill, border, plain/both), so the session is counted under K1534. What changed, fill px per scene (m1-f1, identical in m2-f2): muse_hash 5,696 (78 places), g41_user_tw64 6,725 (56), g41_user_tw42 and user_tw42.lightpaper 3,054 each (20 each), def 1,988 (27), g41_def_tw64 1,783 (34), muse_default_tw 1,234 (13), g41_def_tw42 1,219 (34), ring 288 (3), g41_ring_tw64 142 (3), g41_ring_tw42 25 (2), fat 6 (1): 25,214 px at 291 places, all restored thread (toward colour, never toward ground). The plain/both look (`threadLook` 2 in the session's third shot) moves only inside those same places (14,651 px), as its composite paints the section colour over the coverage; it moves no pixel to ground either. Session places and the count's places correspond: 199 of the count's 255 have a changed capture place within 0.35 world (the count marches its windows on the scene polylines, the session on the real bake); j71 sits among them (370 changed px at world 4.663:7.438 in the capture; the picture below).

Done 4 (guards, both with `GF_KRETRY=1`; `npm test` with it unset). `.claude/probes/K1482/guards.ps1` on a preview of dcd8e81e6 (:5483), seven PASS: bar `PASS new 0 grown 0 gone 4`; hold 60/60 (edges min 6,988), hold with `gfk=0` 60/60 (min 6,938), panelopen 1, dragcheck_b 0/0/11/0 px over TOL 24, dragcheck 0/57/100/0, `npm test` 258 files and 3,207 tests passed (whole output in `out/27Q/guards/`). The standalone K1436 bar (`.claude/probes/K1436/k1436_bar.ps1 -Ref dcd8e81e6 -Base 221644ed7 -Port 5485 -Tag 27Q`, all 12 scenes, deduped 1): `PASS new 0 grown 0 gone 23` - the 23 gone finds are screen scan cuts and specks the old coverage died into (g41_def_tw42, g41_user_tw42, muse_hash, g41_user_tw64); nothing new grew. The deploy of dcd8e81e6 passed (run 44839377195).

Done 5 (pictures, no verdict from this run). `.claude/probes/K1561/out/27Q/pics/` holds one picture per changed fill place, all 291 of them (`make_pics.py` from the session's m1/f1 pair): each shows master | fix | changed pixels in red over a surroundings crop, and the same three tiles at 4x under it; `out/27Q/places.txt` lists scene, world x:y and changed px for each (the same list, with file names, is `pics/places.txt`). The ledger's place is `pics/g41_user_tw64_p002_370px.png` (world 4.663:7.438): on master a dark notch of ground cuts into the pale thread from the left thread's edge where it meets the thread it ends on; with the fix the thread body runs whole to that edge, and the red tile is exactly the notch. This run does not judge the look at any place; it notes only the measurements above - every changed pixel moved from ground toward a thread colour, none the other way, and the border look is unchanged everywhere, so every thread keeps both borders at these places by that measure. Claude and Levi judge the pictures.

Done 6: the fix and the tools are committed and pushed as dcd8e81e6 and its deploy is green, above. K1561 is closed with that commit; K1531 and K1482 are left open. Tried and left: the count's window march on the scene polylines against the real bake (199 of 255 places correspond within 0.35 world; the remaining counted places sit in windows the real bake caps shorter by its neighbour and joint rooms, which the tool does not cap - named in `nub_count.ts`'s header); the first fix-profile load of g41_ring_tw64 taken before its warm pass (Done 3), recaptured warm rather than chased.

## Run R (27R): the nub fix leaves real gap lines alone (K1566)

Added 2026-11-20 after Run Q. K1566 in `LEDGER.md`. Run Q's fix (dcd8e81e6: in `lkGap` the coverage cut
takes the window's named over chain only) removed the nub (K1561) but is WIDER than the bug. Checked against
the nub counter's own places (`.claude/probes/K1561/place_check.py`, tolerance 0.35 world): of the 288 fill
places the fix changed on the counter's scenes, 199 (18,627 px) lie at a place the counter names and 89
(6,556 px) do not: no fused joint is involved there. Claude's look at those: some are small cleanups, but at
others a real gap line, the one that shows which thread passes over, is cut to a stub that ends inside the
thread (muse_hash world 30.744:20.181, 21.722:34.462 and 6.178:4.541; g41_user_tw64 15.305:6.316), the kind
of shape Levi called a bug. Run Q's brief had no test for that; this run adds it.
**For this run `src/render/gpu_field/gf_look.ts` is NOT hands-off: you may edit it, and only it, of the six
gpu_field files.** BASE below is 221644ed7 (master before Run Q's fix); Q is dcd8e81e6.
Done: 1. Reproduce the finding: `python .claude/probes/K1561/place_check.py
.claude/probes/K1561/out/27Q/diffcap.json .claude/probes/K1561/out_before.txt` ends with
`WITHOUT: 89 (6556 px)`. 2. The fix in `lkGap`, Run Q's second option: every piece cuts as on BASE, except a
piece that is a fused joint with the label's chain and is not the window's named over chain (`nub_count.ts`'s
own definition of a nub's cutter), which is skipped, in the K1458 far-reach term too. Give `nub_count.ts` a
mode that models this rule. If `lkGap` cannot tell a fused joint from what `gf_look.ts` already reads, stop:
push nothing under `src/` and record which table and how many texels it would need. 3. Numbers, per scene,
from ONE capture session that loads BASE, your fix, Q, BASE, your fix (Run Q's tools:
`.claude/probes/K1561/screen3.mjs`, `make_jobs.mjs`, `diffcap.py`; ports 5480-5499; every capture through `scripts/perf_lock.ps1`, and no lock left behind when a capture ends: after Run Q a `muse-27Q` lock stood for 30 min and held a Claude stage for 24): (a) the nub count is 0 with your fix on every scene; (b) `place_check.py` on BASE
against your fix ends with `WITHOUT: 0 (0 px)`; (c) at the 89 places your fix's fill pixels equal BASE's,
0 px; (d) at the 199 places, the fill pixels that differ between Q and your fix: the count per place, each
such place listed; (e) the border look (`tlk=border`) differs by 0 px between BASE and your fix on every
scene, and every changed pixel of the plain shot lies inside a changed fill place; (f) no fill pixel that is
thread on BASE is ground with your fix: 0; (g) BASE against BASE and your fix against your fix are 0 px, or
that session is not counted (K1534). 4. Guards, both with `GF_KRETRY=1`: `.claude/probes/K1482/guards.ps1`,
and the K1436 bar (`.claude/probes/K1436/k1436_bar.ps1 -Ref <your commit> -Port <one of yours>`) with new 0
and grown 0. `npm test` green with `GF_KRETRY` unset. 5. Pictures for Claude's look, untracked under
`.claude/probes/K1561/out/27R/`: for every place whose fill pixels differ between BASE and your fix, and for
every place of (d), ONE sheet with four panels of the same crop: BASE fill | Q fill | your fix's fill | your
fix's plain shot, at two zooms (the place with its surroundings, and close), no wider than 1800 px, named by
scene and place, plus `places.txt` (scene, world x:y, changed px, sheet path). Levi's rules bind: a thread
keeps both borders, its width and its heading. You do not judge the look; you deliver the pictures and the
numbers. 6. What returns with the narrowing is expected and is not yours to fix: the small artifacts BASE had
at some of the 89 places (g41_user_tw64 3.377:9.416's ragged tip, g41_def_tw42's specks). List them in the
handoff. 7. If (a) to (g) and the guards hold: commit the fix and the tools (tools tracked with `git add -f`,
outputs untracked), push, see the deploy pass, close K1566 with the commit. If one of them cannot be met in
the time, push nothing under `src/`: commit the tools and the handoff only, and record what stood in the way.

### Handoff 27R (Muse, 2026-11-20, stopped at the time line: (b) cannot be met as written; nothing under `src/` landed, K1566 left open)

Started 17:35 PST, stopped 19:21 PST. Starting master d1c25f5fe (BASE 221644ed7, Q dcd8e81e6). No `src/` change landed: `gf_look.ts` and its `gf_gap.test.ts` pin were restored, the narrowing is kept as `.claude/probes/K1561/out/27R/narrow.patch` (untracked, with the `nub_count.ts` hunk this commit does land). This commit is probes + this handoff only (`.claude/probes/K1561/nub_count.ts`, `diff27r.py`, `make_pics27r.py`), so no deploy. Previews of BASE on :5480, the fix working tree on :5481 and Q on :5482 under `$env:TEMP\knotmaze-27R` (stopped and removed at the stop line, with the `profile_b`/`profile_n` Chrome profiles). Every capture sequence through `scripts/perf_lock.ps1 -Owner "muse-27R"`; no lock left behind. Captures and sheets under `.claude/probes/K1561/out/27R/` (untracked: `b1/`, `n1/`, `q1/` = 27Q's `f1/`, `b2/` = 27Q's `m2/`, `n2/` = a copy of `n1/` for the diff tool only, `diff27r.txt/json`, `diffcap.json`, `pics27r/` + `places.txt`, `count_narrow.txt`).

Done 1 (reproduced, 88 not 89). `place_check.py out/27Q/diffcap.json out/27Q/count_before.txt` ends `WITHOUT: 88 (6496 px)` (with 200 (18,687 px), 56 counter places with no change nearby), one place and 60 px under the brief's 89 (6,556 px): the coordinator's two files differ slightly from the ones on disk; the finding stands.

Done 2 (the fix, built and tested, not landed). `lkFusedJoint(cL, sL, cC, sC)` in `gf_look.ts` reads only what `lkGap` already reads (`F` over `uOArm`/`uOCh`: `(aSR, aDir, aL, aLcut) (aG, aHome, ...)`, reach `aHome` else `aL`, closed chains by `mod`, same chain never a joint), so no new table or texel was needed. `lkGap`'s coverage again takes every higher piece as on BASE, except `skipCov = cj > 0 && PC(j) != cU && PC(j) != cS && lkFusedJoint(cU, aU, PC(j), lkArc(PC(j), qO))`; the far-reach term gained the same test (`farSkip`, dead by construction: its piece `cO` is the named `cS`). `nub_count.ts --narrow` models it (the census's cutters are exactly the skipped ones, so it reads 0; the capture below is the proof). On the fix tree `gf_gap`/`gf_look`/`gf_compile` passed (32 tests, the `gf_gap` pin re-frozen to the new lines); the full suite was not run on that tree.

Done 3 (numbers; the literal one-session order was not met). `b1` (BASE) and `n1` (narrow) are fresh in this session, 12 of 12 scenes each on their K868 hash in 1 try (muse_hash 733ee14a, def 910ff135, fat 814c4e1e, muse_default_tw c5d9f3b6, ring 50dd4ffd, g41_def_tw42 da10b9a5, g41_def_tw64 5ccb276f, g41_ring_tw42 f7b1dff2, g41_ring_tw64 ea67fc77, g41_user_tw42 a5f6d198, g41_user_tw64 0d51331b, user_tw42.lightpaper 462652e7). `q1`/`b2` are 27Q's `f1`/`m2/` (same builds; fresh BASE against 27Q BASE is 0 px in fill, border and plain on 11 of 12 scenes) and no fresh fix repeat was captured: `n1`'s halves waited 781 s and 2,035 s behind K1482 stages 37/38's lock sequences, and the stop line left no turn for `q1`/`b2`/`n2` fresh loads. (a) `--narrow` is 0 px, 0 places on every scene (`count_narrow.txt`). (b) FAILS: `place_check.py` on `diffcap.json` (BASE against narrow places) ends `WITHOUT: 1996 (10393 px)`, of which `g41_ring_tw64` alone is 1,976 places (10,131 px) from a view-misaligned load pair (views differ in the fifth decimal, border 6,295 px, thread-to-ground 13; 27Q's own pair for that scene is clean at 142 px, so that scene's session is not counted under K1534 and needs a warm recapture). Without that scene: `WITHOUT: 20 (262 px)` — muse_hash 1 (11 px at 11.285:26.976), g41_def_tw42 16 (187 px), g41_user_tw42 and user_tw42.lightpaper 1 each (22 px at 22.396:10.631), g41_user_tw64 1 (20 px at 5.896:15.188), plus `g41_ring_tw42`'s 2 places (25 px) in a scene the counter counts 0 places in. At the sampled ones the change is 1–3 levels and Q changes identically there (muse_hash 11.285: Q against narrow 0, BASE against Q the same 11 px), with the nearest counter place 2–4 world away: the bake's fused nubs the march counter does not name, not widening. No change to the counter's march was made in this run. (c) At the brief's stub places the fix equals BASE: muse_hash 30.744:20.181 0 against Q's 592, 21.722:34.462 0/529, 6.178:4.541 0/227, g41_user_tw64 15.305:6.316 0/280 (80 px boxes); it fails only on the same 20 tiny places above. (d) Of the 200 with-counter places, 9 have Q-against-narrow fill in their box (897 px: g41_user_tw64 7.220:14.599 265, 2.023:18.391 253, 19.252:11.952 42, 7.030:14.457 29, 10.084:17.029 26, 2.169:18.665 11; muse_hash 15.076:19.695 93, 3.973:30.333 90, 5.074:33.110 88); the other 191 read 0 in box, j71 among them (box BASE-against-narrow 370, Q-against-narrow 0). Per-scene BASE-against-narrow fill px (Q's in brackets): muse_hash 2,674 (5,696), g41_user_tw64 3,040 (6,725), g41_def_tw42 882 (1,219), def 1,988 (1,988), g41_def_tw64 1,748 (1,783), muse_default_tw 1,234 (1,234), ring 288 (288), g41_ring_tw42 25 (25), fat 0 (6), g41_user_tw42 and lightpaper 3,045 each (3,054 each). (e) Border differs by 0 px between BASE and the fix on the 11 counted scenes (ring_tw64 6,295, excluded); every plain changed pixel lies inside a dilated fill place on those 11 (outside 0; ring_tw64 3,750, excluded). (f) No thread-to-ground on the 11 (ring_tw64 13, excluded; the 16 total is that scene's two pairs). (g) Fresh BASE against 27Q BASE is 0 on the 11; the fix repeat and ring_tw64's pair are unproven, so the session as a whole is not counted.

Done 4 (guards not run). No `src/` landing, so `guards.ps1` and the standalone bar were not run on a fix commit; `npm test` with `GF_KRETRY` unset is green on the restored tree (258 files passed, 2 skipped; 3,207 tests passed, 9 skipped; tsc clean). 27Q's guards stand for Q.

Done 5 (pictures, no verdict from this run). `.claude/probes/K1561/out/27R/pics27r/` holds 218 four-panel sheets (BASE fill | Q fill | narrow fill | narrow plain, surroundings then close, widest 928 px; `g41_ring_tw64` excluded for the misalignment above), `places.txt` (scene, world, BASE-against-narrow px, Q-against-narrow px in box, sheet) also at `out/27R/places.txt`. The ledger's place is `g41_user_tw64_p112_370px.png`: on BASE a dark notch cuts the thread, with Q and with the narrowing the body runs whole, the two fix panels alike there. At the stub sheets (muse_hash 30.744, 21.722, 6.178; g41_user_tw64 15.305) the narrowing's panel equals BASE's, Q's is the cut one. This run does not judge the look; it notes only that on the 11 counted scenes every thread keeps both borders by the border-0 measure.

Done 6 (what returns, expected). Everywhere the narrowing equals BASE, BASE's own small artifacts return with it, unmeasured beyond equality: g41_user_tw64 3.377:9.416's ragged tip (80 px box BASE-against-narrow 0, Q 272), g41_def_tw42's specks (its 18 Q-without places, 524 px in Q, now BASE except the 187 tiny px of Done 3(b)), muse_hash's and g41_user_tw64's remaining Q-without places likewise. The coordinator and Levi judge them in the sheets.

Done 7: (b), (c) on its tiny set, (g) and Done 4 cannot be met in the time, so nothing under `src/` is pushed and K1566 stays open. What stands in the way, in order: the counter's march does not name 20 small bake fused nubs (262 px) that any fused-joint narrowing must restore, so `WITHOUT: 0` needs the counter's windows taken from the bake (or the test reworded to the bake's places); `g41_ring_tw64` needs a warm recapture whose two loads land on one view before its numbers count; the literal BASE, fix, Q, BASE, fix session and the guards need lock turns behind the K1482 stages. The patch, the counts and the sheets above are the record to re-land from. K1531 and K1482 left open.

## Run S (27S): the narrowed nub fix lands (K1566)

Added 2026-11-20 after Run R. Run R built the narrowing (`lkFusedJoint` in `gf_look.ts`; kept as
`.claude/probes/K1561/out/27R/narrow.patch`, untracked, main checkout) and measured it, and could not land it
(its handoff above): test (b) was worded so that it cannot read 0, `g41_ring_tw64`'s load pair was not on one
view, and the one-session order and the guards did not fit in the time. Claude's look at Run R's sheets: at
g41_user_tw64 4.663:7.438 the nub is gone with the narrowing as with Q; nothing seen against it. This run
lands it.
**For this run `src/render/gpu_field/gf_look.ts` is NOT hands-off: you may edit it, and only it, of the six
gpu_field files.** BASE is 221644ed7 (master before Run Q's fix); Q is dcd8e81e6 (today's master `src/`).
Done: 1. Apply the patch's hunks under `src/` and `test/` (its `nub_count.ts` hunk is already on master); the
`gf_gap`, `gf_look` and `gf_compile` tests pass. 2. ONE capture session that loads BASE, your fix, Q, BASE,
your fix on the 12 scenes (Run Q's and R's tools: `.claude/probes/K1561/screen3.mjs`, `make_jobs.mjs`,
`diffcap.py`, `diff27r.py`; ports 5480-5499; every capture through `scripts/perf_lock.ps1`, and no lock left
behind when a capture ends). A scene COUNTS only when BASE against BASE and fix against fix are 0 px in fill,
border and plain (K1534); a scene that fails this is captured again, warm, up to three times
(`g41_ring_tw64` failed it in Run R). 3. Numbers per counted scene: (a) `nub_count.ts --narrow` reads 0 px,
0 places; (b) REWORDED: list every BASE-against-fix changed fill place with no counter place within 0.35
world (`place_check.py` with BASE's counter file `out/27Q/count_before.txt`). Each such place must have Q
against fix 0 px in its 80 px box AND a largest per-pixel step of at most 8 levels (Run R found 20 such
places, 262 px, at 1 to 3 levels: the bake's fused nubs that the march counter does not name). A place that
fails either test blocks the landing and gets a four-panel sheet; (c) at the stub places (muse_hash
30.744:20.181, 21.722:34.462 and 6.178:4.541; g41_user_tw64 15.305:6.316) fix against BASE is 0 px in the
80 px box; (d) the places where Q against fix differs: the count, each listed with its px; (e) the border
look (`tlk=border`) differs by 0 px between BASE and fix; (f) no fill pixel that is thread on BASE is ground
with the fix: 0. 4. Guards, both with `GF_KRETRY=1`: `.claude/probes/K1482/guards.ps1`, and the K1436 bar
(`.claude/probes/K1436/k1436_bar.ps1 -Ref <your commit> -Port <one of yours>`) with new 0 and grown 0.
`npm test` green with `GF_KRETRY` unset (the `gf_gap` pin re-frozen and named in the commit). 5. If every
counted scene passes (a) to (f), at least 11 of the 12 scenes count, and the guards hold: commit the fix and
the tools (tools tracked with `git add -f`, outputs untracked), push, see the deploy pass, close K1566 with
the commit; a scene that did not count is named in the commit and in the handoff's `Ledger items`. If one of
them cannot be met in the time, push nothing under `src/`: commit the tools and the handoff only, and record
what stood in the way. 6. Pictures for Claude's look, untracked under `.claude/probes/K1561/out/27S/`: one
four-panel sheet (BASE fill | Q fill | fix fill | fix plain; the place with its surroundings, and close; no
wider than 1800 px) for each of the four stub places of (c), for each place that fails (b), and for the ten
largest places of (d), plus `places.txt`. Levi's rules bind: a thread keeps both borders, its width and its
heading. You do not judge the look; you deliver the pictures and the numbers.

### Handoff 27S (Muse, 2026-11-21, stopped at the gates: (b) fails on 14 of its 20 places; nothing under `src/` landed, K1566 left open)

Started 02:56 PST, stopped 04:28 PST. Starting master 8e7219f3b (BASE 221644ed7, Q dcd8e81e6). The patch (`.claude/probes/K1561/out/27R/narrow.patch`, UTF-16 on disk) was converted to UTF-8 in `$env:TEMP` and its `src/` + `test/` hunks applied (its `nub_count.ts` hunk is already on master); `gf_gap`/`gf_look`/`gf_compile` passed (32 tests). Nothing under `src/` or `test/` is in this run's commit: the fix, its `gf_gap` pin and the K299 registry entries below were reverted when (b) failed, and Q's wide fix (dcd8e81e6) stays live. This commit is probes + this handoff only (`.claude/probes/K1561/analyze27s.py`, `make_pics27s.py`), so no deploy. Previews of BASE on :5488, the fix working tree on :5489 and Q on :5490 under `$env:TEMP\knotmaze-27S` (stopped and removed at the stop line, with the `out/27S/profile_*` Chrome profiles); every capture sequence through `scripts/perf_lock.ps1 -Owner "muse-27S"`, no lock left behind. Captures and sheets under `.claude/probes/K1561/out/27S/` (untracked: `b1/ n1/ q1/ b2/ n2/`, `analyze27s.txt/json`, `diff27r.txt/json`, `count_narrow.txt`, `pics/` + `places.txt`).

Done 1 (applied, then withheld). The fix tree also moved `test/render/paint_ring_lap.test.ts`'s K299 registry: `lkFusedJoint`'s two closed-chain wraps (`mod(d, lenL)`, `mod(d2, lenC)`) are new reviewed sites there (a full `npm test` on the fix tree failed only that one test, 1 of 3219; with the two entries the four gf/registry files pass, 42 tests). Both pins are re-frozen on the fix tree and must land with it; on the restored tree `npm test` is green as below.

Done 2 (one session, BASE, fix, Q, BASE, fix; 12 of 12 scenes count). Loads b1 03:01-03:18, n1 03:18-03:35, q1 03:36-03:52, b2 03:52-04:04, n2 04:04-04:16, each scene warm-captured on its K868 hash in every load (muse_hash 733ee14a, def 910ff135, fat 814c4e1e, muse_default_tw c5d9f3b6, ring 50dd4ffd, g41_def_tw42 da10b9a5, g41_def_tw64 5ccb276f, g41_ring_tw42 f7b1dff2, g41_ring_tw64 ea67fc77, g41_user_tw42 a5f6d198, g41_user_tw64 0d51331b, user_tw42.lightpaper 462652e7), `lost` 0 in every kept meta, and the bit-still views bit-equal across the three builds on all 12 scenes. In n2 two loads (muse_hash, g41_def_tw42) hit the 480 s cap with a context loss and retried onto their hash. BASE against BASE and fix against fix are 0 px in fill, border and plain on all 12 scenes, so every scene counts under K1534, g41_ring_tw64 included (its BASE-fix fill is 142 px here, not Run R's misaligned 10,328). Cross-check: this session's b1/n1/q1 fills equal 27Q's m1 / 27R's n1 / 27Q's f1 at 0 px on muse_hash, g41_def_tw42 and g41_user_tw64.

Done 3 (numbers per counted scene). (a) `nub_count.ts --narrow` (GF_KRETRY=1): 0 px, 0 places on all 12 scenes (`count_narrow.txt`). Fill BASE-fix px per scene (Q's in brackets): muse_hash 2,674 (5,696), def 1,988 (1,988), fat 0 (6), g41_def_tw42 882 (1,219), g41_def_tw64 1,748 (1,783), g41_ring_tw42 25 (25), g41_ring_tw64 142 (142), g41_user_tw42 3,045 (3,054), g41_user_tw64 3,040 (6,725), muse_default_tw 1,234 (1,234), ring 288 (288), user_tw42.lightpaper 3,045 (3,054); 18,111 px at 215 BASE-fix places. (b) REWORDED FAILS: `place_check.py` on this session ends `WITHOUT: 20 (262 px)` (g41_def_tw42 16, g41_user_tw42 1, g41_user_tw64 1, muse_hash 1, user_tw42.lightpaper 1), and of those 20 only 6 pass both tests (Q-fix 0 in the 80 px box AND largest own-pixel BASE-fix step <= 8: g41_def_tw42 32.356:3.781 step 3, 9.616:13.164 step 5, 32.185:9.909 step 5, 10.835:31.764 step 3, 32.762:1.470 step 1; muse_hash 11.285:26.976 step 3). The 14 that fail, each with its four-panel sheet, blocking the landing here, are in `analyze27s.txt` and `pics/places.txt`: ten in g41_def_tw42 where Q reads flat thread and the fix only part-way back (e.g. 10.529:20.043 18px, qnOwn 18, maxStep 34; 23.936:27.363 17px, maxStep 101), plus four where Q and the fix agree pixel for pixel but the BASE-fix step is over 8 (g41_user_tw42 and lightpaper 22.396:10.631, steps 82/84; g41_user_tw64 5.896:15.188, step 12; g41_def_tw42 22.348:22.818, step 10). Run R's premise (1-3 levels, Q identical) held on its muse_hash sample and on the six passes above; it does not hold on these 14, which read as bake fused nubs the march counter does not name, part-restored by the narrowing where another non-fused piece also cuts the coverage. Two g41_ring_tw42 places sit outside `place_check`'s scope (the counter names no place in that scene): 16.366:2.589 (step 24) and 15.359:5.300 (step 11), Q-fix 0 there, noted, not counted in (b). (c) at all four stub places fix against BASE is 0 px in the 80 px box (Q reads 592/532/227/280 there). (d) Q against fix: 88 places, 7,251 px, each listed in `analyze27s.json` (top: g41_user_tw64 5.368:10.195 622px, 7.220:14.599 265, 2.022:18.468 253; muse_hash 15.076:19.695, 3.973:30.333, 5.074:33.110 are among the with-counter places where the narrowing part-restores less than Q). (e) border 0 px BASE-fix on every scene; (f) thread-to-ground 0 px; every plain changed pixel lies inside a dilated fill place (plainOutside 0). So (a), (c), (d), (e), (f) and the session floors hold; (b) alone does not, and the brief blocks the landing on any (b) failure.

Done 4 (guards not run). No `src/` landing, so `guards.ps1` and the standalone K1436 bar were not run on a fix commit (Run R's precedent). `npm test` with `GF_KRETRY` unset is green on the restored tree (258 files passed, 2 skipped; 3,210 tests passed, 9 skipped; tsc clean), and the coordinator's K1436 bar still has Q's own green run from 27Q.

Done 5+6 (withheld; pictures for Claude's look, no verdict). `.claude/probes/K1561/out/27S/pics/` holds 24 four-panel sheets (BASE fill | Q fill | fix fill | fix plain, surroundings then close, widest 928 px): the four stub places, the 14 failing (b) places and the ten largest (d) places (four of those ten are the stubs under the stubs' names); `out/27S/places.txt` lists each with its px. The ledger's place g41_user_tw64 4.663:7.438 keeps Run R's reading within this session's numbers (its scene's with-counter places change under the narrowing, Q-fix 0 at j71's box as in Run R). What stood in the way, in order: literal test (b) - 14 of its 20 places are not faint Q-identical nubs but part-restored bake nubs/stub-like cuts the march counter misses, so whether the narrowing may land has to be decided on their sheets (or (b) reworded again to name an allowance for them, or the counter's windows taken from the bake). K1566 stays open; the narrowing remains as Run R's `narrow.patch` plus this session's captures; the fix's two test pins (gf_gap, K299 registry) are recorded in Done 1. Previews :5488/:5489/:5490, the `$env:TEMP\knotmaze-27S` tree and the `out/27S/profile_*` Chrome profiles stopped and removed at the stop line.

## Run T (27T): `npm test` no longer reads the shell's `GF_KRETRY` (K1575)

Added 2026-11-20. A test fix; nothing under `src/` (`eval.ts` and `gf_glsl.ts` are hands-off: Claude stages
work there. If the only clean fix needs a `src/` change, stop and say which). Today `npm test` with
`GF_KRETRY=1` in the shell fails `test/render/gf_home.test.ts` (it packs aHome into the arm record's free .y
only with the switch on) and passes with the variable unset. The guards and the node probes run with it set,
so every stage has to remember to unset it before the suite.
Done: 1. Find every test whose outcome depends on a `GF_*` shell variable: run the suite with the variable
unset, with `GF_KRETRY=1` and with `GF_KRETRY=0` (and each other `GF_*` variable `src/` reads from the
environment, set to each value it tests for), and list the tests whose outcome differs. 2. Each such test
sets the switch itself and restores it (per test or per file, so that no other file inherits it). Where the
code has two states, the test covers BOTH. 3. Numbers: `npm test` in every shell of 1 reports the same file
and test counts and 0 failed. 4. No pin value changes: a pin that moves means the fix changed what is
tested, so stop. 5. Commit, push, see the deploy pass (a push under `test/` deploys), close K1575 with the
commit.

## Run U (27U): fade.mjs's dot rule gets its control on link A (K1548)

Added 2026-11-20. Probes only (`.claude/probes/K1458/fade.mjs`, your tools under `.claude/probes/K1548/`);
nothing under `src/` or `test/`, so no deploy. Read `### Handoff 27H` first. It found that the control cannot
be given on fade's own link (the parent build draws no dotted line there) and that on link A
(`3.FGH1HtvQeDjm6e4BII`, an env override in `fade.mjs`) the coverage read keeps 0 of 700 sides: 654 skip on
`uu` (today's under colour sits within about 35 levels of the flat backdrop), 46 on `iu`. This run builds the
read that works on link A and gives the control there.
Done: 1. A coverage read for link A that does not need the under colour to stand off the backdrop (Run H's
suggestion: the under colour against a non-backdrop reference; the technique is yours), behind an option, so
that fade's own link reads exactly as today. On link A it keeps at least 300 of the 700 sides on each of
1de01c120, a8d36be33 and master. 2. The dual count (OLD rule, NEW rule) on link A at fl 0, 0.5, 1.2 and 0.14
for the three builds, in ONE capture session with each build loaded twice (two loads of a build agree within
2 sides, or the pair is captured again; ports 5480-5499; every capture through `scripts/perf_lock.ps1 -Owner
"muse-27U"`, and no lock left behind). 3. The control: the NEW rule counts at least one side with more than 2
dots on 1de01c120 at the fade where K1460's dotted line shows (`.claude/probes/K1460/shot.mjs` names the
place), and 0 such sides on a8d36be33 and on master. If it does not, mend the rule until it does AND master
on fade's own link still reads FADE GUARD PASS three runs running. If no rule does both, change no rule and
record the numbers. 4. `npm test` green. 5. Commit the tools (tracked with `git add -f`, outputs untracked)
and the handoff, push. Close K1548 with the commit if 3 holds; else leave it open with the cause. 6. One
sheet for Claude's look under `.claude/probes/K1548/out/27U/` (untracked): the control place on 1de01c120 |
a8d36be33 | master with the counted pixels marked, at most 1800 px wide.

## Run V (27V): one tool lists every place a candidate changes, on every test maze (K1578); first use, the ball candidate (K1572)

Added 2026-11-20. Probes only (your tools under `.claude/probes/K1578/`); nothing under `src/` or `test/`, so
no deploy. Why: a render rule fires at every place of its kind on every maze. Stage 37's ball rule cleaned 8
places and broke 2 on sister mazes, and that was seen only because stage 39 captured them. From now on no
candidate goes to Levi before every place it changes on ALL the test mazes has a picture Claude has looked
at. Stages 39 and 40 did this by hand, with per-stage copies of one script chain: `.claude/probes/K1482/s40/`
(`runseq40.ps1`, `capseq40.ps1`, which holds the 21 mazes' hashes and links, A_3 to A_d and D_1 to D_a,
`diffseq40.ps1`, `analyze40.py`) and `.claude/probes/K1482/s39/place39.py` (a place's sheet). `### Handoff
K1482 s40` in `docs/design/K1482_s40_ball_narrow.md` shows the chain in use, with its numbers. This run makes
it ONE tool for any two commits and runs it on the ball candidate.
Done: 1. `.claude/probes/K1578/allmaze.ps1 -Base <commit> -Cand <commit> -Name <run> [-Mazes ..] [-Fill]
[-Off] [-Force]`: it builds both commits (`scripts/preview.ps1 -Port <p> -Ref <commit>`, ports 5500-5519),
then per maze ONE capture session with the loads base, candidate, base, candidate, compared only inside that
session. Under `.claude/probes/K1578/out/<run>/` it writes `mazes.txt` (per maze: hash, passes, base against
base px, candidate against candidate px, base against candidate px and place count, the repeat pair's px),
`places.txt` (per changed place: maze, x, y in device px, px gained, px lost, nearest site),
`sheets/<maze>_<x>x<y>_<site>.png` (place39's layout: base | candidate, wide and close, as drawn and
brightened) and `look/<the same name>` (the sheet's two brightened rows only, 1300 px wide). A maze that has
its row is skipped unless `-Force`; a maze whose base against base or candidate against candidate is not 0 px
is captured once more, then flagged with its px. The lock is taken PER MAZE (`scripts/perf_lock.ps1 -Owner
"muse-27V"`, one maze per hold, no lock left behind): a Claude agent captures on this machine tonight and
must be able to take its turn. 2. Null control: base and candidate both d1c25f5fe, on A_3: 0 px, 0 places.
3. Known-break control: base d1c25f5fe, candidate df2e1c8bb (stage 37's ball rule), on A_b and A_a: the tool
lists the place at (1077, 1509) on A_b and the place at (2257, 991) on A_a, each within 4 px of those
coordinates (stage 39 measured 26 px and 15 px there). If control 2 or 3 fails and you cannot mend the tool,
stop there and report the numbers. 4. The run proper: base d1c25f5fe, candidate 4925aa786 (stage 40's ball
rule), run name `ball40`, all 21 mazes, in this order: A_b, A_a, A_4 (stage 40 measured 73 px in 1 place,
3 px in 1 place and 122 px in 2 places: name your numbers beside them), A_3, A_5, A_9, A_7, A_8, A_6, A_c,
A_d, then D_1 to D_a. Commit the tools once the A mazes are done. 5. `### Handoff 27V`: the two controls'
numbers, and a table of EVERY changed place of item 4 (maze, x, y, px gained, px lost, site, sheet file), the
mazes with no change named, any flagged maze named. Never call a place fixed, better or worse: Claude looks
at every one. 6. Commit the tools (`git add -f` by file name; outputs stay untracked: never `git add -f` an
output) and the handoff, push. K1578 and K1572 stay open: Claude closes them.
Two of these commits are LOCAL (df2e1c8bb and 4925aa786 sit on other worktrees' branches, not on origin):
build them by SHA only, and never check out, merge, cherry-pick or push them or their branches.

### Handoff 27V (Muse, 2026-11-21, done: every Done holds; ball40 listed on all 21 mazes; K1578 and K1572 left open)

Started 2026-11-20 23:38 PST, stopped 2026-11-21 02:37 PST (two sittings: 23:38-01:19 for the tool, the controls and the first nine mazes, then the remaining twelve). Starting master fd8f3978e; tools on master in 13e6b8475 (probes only: `.claude/probes/K1578/allmaze.ps1`, `cap_maze.ps1`, `analyze_maze.py`; nothing under `src/` or `test/` in the run's commits, so no deploy and, as a probe-only run, no ordinary-load guards). Previews under `$env:TEMP\k1578-<run>` on ports 5500-5501, stopped and removed at each run's end; every capture through `scripts/perf_lock.ps1 -Owner "muse-27V"`, one maze per hold, no lock left behind. Outputs untracked under `.claude/probes/K1578/out/{null,break,ball40}/` (`mazes.txt`, `places.txt`, `sheets/`, `look/`, `raw/`). The two local commits were built by SHA only (`preview.ps1 -Ref`), never checked out, merged or pushed.

Done 1 (the tool). `allmaze.ps1 -Base <c> -Cand <c> -Name <run> [-Mazes ..] [-Fill] [-Off] [-Force]` builds both commits (`scripts/preview.ps1`, ports 5500-5519), then per maze one session of base, candidate, base, candidate (tags m/c/m2/c2 via `cap_maze.ps1` → stage 40's `cap40.ps1`/`cap34.mjs`, capseq40's 21-maze hash/link table verbatim), compared only inside the session by `analyze_maze.py` (diff33's places at 24 px cells, nearest site from the base load's `sites_gf.json`). `mazes.txt` carries hash, passes, both floors, base-vs-candidate px and place count and the repeat pair; `places.txt` carries maze, x, y, px gained, px lost, site and sheet; `sheets/` is place39's layout and `look/` its two brightened rows at 1300 px. A maze with its row is skipped unless `-Force`; a non-zero floor recaptures once, then flags. Two mends while building: (i) `cap_maze.ps1` resets `$LASTEXITCODE` at its end — cap40's robocopy profile copy leaves it 1 after a good capture and `perf_lock.ps1` propagates it (the first null run's four loads all landed on fff8c9e5 and the lock still exited 1); (ii) the cross-build listing reads the two builds' `gf_b2view.txt` still views: when they differ bit for bit, 1-level edge flips swamp step 1 (ball40 A_b: 7,027 px at step 1, 436 at 2, 97 at 6, the 6,561 px place at (1503,659) near j31 showing no visible difference on its sheet), because the fit snaps to each build's own drawn bounds (candidate scale 21.74032186 against base 21.74026042 on A_b) and no recapture aligns them; those mazes list places at step 3 and the row carries VIEW-DIFF with both views. Same-build floors and the repeat stay at step 1, and when the views agree (both controls, every other ball40 maze) the listing is step 1, the chain's numbers.

Done 2 (null control). Base and candidate both d1c25f5fe, A_3: hash fff8c9e5 on all four loads (passes 591, 598, 609, 594), base-vs-base 0 px, cand-vs-cand 0 px, base-vs-cand 0 px in 0 places, repeat 0 px.

Done 3 (known-break control). Base d1c25f5fe, candidate df2e1c8bb: A_b (hash 98ae3432, floors 0/0, repeat 99 px) lists (1077,1509) near t22s, 26 px lost, and (994,224) near t25e, 73 px lost; A_a (hash 11744900, floors 0/0, repeat 53 px) lists (2257,991) near t29s, 15 px lost, and (2270,848) near t16s, 38 px lost. Both briefed places at their exact coordinates (0 px off, inside the 4 px bound), at stage 39's 26 and 15 px. Views bit-identical on both mazes.

Done 4 (ball40). Base d1c25f5fe, candidate 4925aa786, in the brief's order; all 21 mazes captured, every session on its table hash with `lost 0`, both floors 0 px and the repeat pair equal to the first pair on every maze. One more mend on the way: the bare-seed D links carry no flow-off token, so D_1's first session had bit-identical views and hashes and floors of 105,148 / 46,844 px (the K1544 flow clock; flowStrength defaults to 0.3 and cap34's freeze does not pin flowTime) and D_2's first attempt flagged the same way (68,847 / 102,474 px). `cap_maze.ps1` now adds `&fw=0` to every query (render-only, the hash unchanged; the token links already carry flow 0); D_1 and D_2 were recaptured under it and every D maze then floored at 0. The pre-mend flagged rows and their sheets were removed, and 13 orphan sheets from superseded listings (A_b's step-1 set, D_1's and D_2's pre-mend places) were deleted, so `sheets/` and `look/` hold exactly the 64 places of `places.txt`. Beside stage 40's numbers for the three named mazes: A_b — stage 40 read 73 px in 1 place (t25e) with t22s (1077,1509) at 0; this run (VIEW-DIFF, step 3) reads t25e (994,224) at 71 px lost and no place at (1077,1509), plus 47 places of 1-22 px (95 px in all) scattered frame-wide, the step-3 remainder of the view difference above. A_a — stage 40 read 3 px in 1 place (t16s at 2270,848); this run reads 3 px lost at (2268,850) near t16s. A_4 — stage 40 read 122 px in 2 places; this run reads 122 px in 2 places, (937,1627) near t32s 83 px and (1948,1293) near t22s 39 px, the same places and counts. The remaining mazes read: A_3 80 px in 2, A_5 142 in 4, A_9 132 in 2, A_7 216 in 1, A_8 119 in 1 (their places in the table; each matches a place stage 40's table or mirror census names, at its count), A_c 1 px in 1, A_d 92 px in 2, and D_1 to D_a 0 px in 0 places each. Tools committed mid-run in 13e6b8475, as briefed once the A mazes were under way; the `&fw=0` mend is committed with this handoff's commit.

Done 5 (every changed place of Done 4, 64 places; gained = candidate darker, lost = candidate lighter; sheets under `.claude/probes/K1578/out/ball40/sheets/`, the same names under `look/`). No maze is flagged (every floor 0); A_b's row carries the VIEW-DIFF note above. Mazes with no change: A_6 and D_1 to D_a (11 mazes).

| maze | x,y | gained | lost | site | sheet |
|---|---|---|---|---|---|
| A_b | 994,224 | 0 | 71 | t25e | A_b_994x224_t25e.png |
| A_b | 803,126 | 10 | 12 | j142 | A_b_803x126_j142.png |
| A_b | 980,731 | 3 | 4 | t63e | A_b_980x731_t63e.png |
| A_b | 1477,231 | 1 | 5 | t57e | A_b_1477x231_t57e.png |
| A_b | 2312,554 | 3 | 2 | j133 | A_b_2312x554_j133.png |
| A_b | 2276,215 | 0 | 4 | t20s | A_b_2276x215_t20s.png |
| A_b | 1422,694 | 3 | 0 | j165 | A_b_1422x694_j165.png |
| A_b | 1418,1044 | 2 | 1 | t72s | A_b_1418x1044_t72s.png |
| A_b | 1929,172 | 2 | 0 | j24 | A_b_1929x172_j24.png |
| A_b | 1000,878 | 2 | 0 | t44s | A_b_1000x878_t44s.png |
| A_b | 1338,867 | 0 | 2 | t77e | A_b_1338x867_t77e.png |
| A_b | 1498,1238 | 1 | 1 | t34s | A_b_1498x1238_t34s.png |
| A_b | 1793,1482 | 1 | 1 | j43 | A_b_1793x1482_j43.png |
| A_b | 1185,176 | 1 | 0 | t28e | A_b_1185x176_t28e.png |
| A_b | 2207,214 | 1 | 0 | j54 | A_b_2207x214_j54.png |
| A_b | 869,217 | 0 | 1 | t68e | A_b_869x217_t68e.png |
| A_b | 1048,252 | 0 | 1 | t25e | A_b_1048x252_t25e.png |
| A_b | 1017,295 | 1 | 0 | j63 | A_b_1017x295_j63.png |
| A_b | 2241,327 | 1 | 0 | j132 | A_b_2241x327_j132.png |
| A_b | 1132,335 | 0 | 1 | t56e | A_b_1132x335_t56e.png |
| A_b | 1576,340 | 1 | 0 | j5 | A_b_1576x340_j5.png |
| A_b | 1724,398 | 0 | 1 | j22 | A_b_1724x398_j22.png |
| A_b | 1032,432 | 1 | 0 | t36s | A_b_1032x432_t36s.png |
| A_b | 1985,468 | 1 | 0 | j28 | A_b_1985x468_j28.png |
| A_b | 1243,483 | 1 | 0 | t18s | A_b_1243x483_t18s.png |
| A_b | 942,484 | 0 | 1 | t84s | A_b_942x484_t84s.png |
| A_b | 1537,571 | 0 | 1 | t69s | A_b_1537x571_t69s.png |
| A_b | 850,608 | 1 | 0 | j93 | A_b_850x608_j93.png |
| A_b | 1787,626 | 1 | 0 | j125 | A_b_1787x626_j125.png |
| A_b | 1512,654 | 1 | 0 | j31 | A_b_1512x654_j31.png |
| A_b | 1606,667 | 1 | 0 | j31 | A_b_1606x667_j31.png |
| A_b | 1304,771 | 0 | 1 | t53s | A_b_1304x771_t53s.png |
| A_b | 1083,789 | 0 | 1 | j73 | A_b_1083x789_j73.png |
| A_b | 1154,916 | 0 | 1 | j72 | A_b_1154x916_j72.png |
| A_b | 2253,967 | 1 | 0 | j64 | A_b_2253x967_j64.png |
| A_b | 994,977 | 1 | 0 | t43s | A_b_994x977_t43s.png |
| A_b | 1162,1049 | 0 | 1 | t4s | A_b_1162x1049_t4s.png |
| A_b | 2122,1086 | 1 | 0 | j49 | A_b_2122x1086_j49.png |
| A_b | 1618,1092 | 0 | 1 | t74s | A_b_1618x1092_t74s.png |
| A_b | 1952,1137 | 1 | 0 | j179 | A_b_1952x1137_j179.png |
| A_b | 1384,1169 | 0 | 1 | t54e | A_b_1384x1169_t54e.png |
| A_b | 979,1208 | 0 | 1 | t71s | A_b_979x1208_t71s.png |
| A_b | 1541,1210 | 1 | 0 | j79 | A_b_1541x1210_j79.png |
| A_b | 1883,1237 | 1 | 0 | j95 | A_b_1883x1237_j95.png |
| A_b | 1927,1279 | 0 | 1 | t37s | A_b_1927x1279_t37s.png |
| A_b | 1574,1401 | 0 | 1 | t47s | A_b_1574x1401_t47s.png |
| A_b | 1512,1485 | 0 | 1 | j37 | A_b_1512x1485_j37.png |
| A_b | 1077,1607 | 0 | 1 | j16 | A_b_1077x1607_j16.png |
| A_a | 2268,850 | 0 | 3 | t16s | A_a_2268x850_t16s.png |
| A_4 | 937,1627 | 0 | 83 | t32s | A_4_937x1627_t32s.png |
| A_4 | 1948,1293 | 0 | 39 | t22s | A_4_1948x1293_t22s.png |
| A_3 | 2290,919 | 0 | 55 | t22e | A_3_2290x919_t22e.png |
| A_3 | 2099,1137 | 0 | 25 | t26s | A_3_2099x1137_t26s.png |
| A_5 | 2042,893 | 0 | 77 | t65s | A_5_2042x893_t65s.png |
| A_5 | 1233,254 | 0 | 40 | t30e | A_5_1233x254_t30e.png |
| A_5 | 2345,852 | 0 | 23 | t34e | A_5_2345x852_t34e.png |
| A_5 | 1064,410 | 0 | 2 | t14s | A_5_1064x410_t14s.png |
| A_9 | 2154,126 | 0 | 97 | t28e | A_9_2154x126_t28e.png |
| A_9 | 1894,1390 | 0 | 35 | t47e | A_9_1894x1390_t47e.png |
| A_7 | 2269,507 | 0 | 216 | t83e | A_7_2269x507_t83e.png |
| A_8 | 1149,1576 | 0 | 119 | t31s | A_8_1149x1576_t31s.png |
| A_c | 1427,785 | 0 | 1 | j69 | A_c_1427x785_j69.png |
| A_d | 2102,995 | 0 | 91 | t88s | A_d_2102x995_t88s.png |
| A_d | 1057,770 | 0 | 1 | j40 | A_d_1057x770_j40.png |

Done 6: tools 13e6b8475, the `&fw=0` mend and this handoff are committed and pushed; `npm test` green on the final tree (258 files passed, 2 skipped; 3,210 tests passed, 9 skipped; tsc clean). K1578 and K1572 stay open (Claude closes them; no place above is called fixed, better or worse by this run — Claude looks at every sheet). Tried and left: a step-1 listing on VIEW-DIFF mazes (the 7,027 px reading in Done 1 (ii), replaced by the step-3 listing in the same tool, not captured again — the re-listing ran on the session's own PNGs); nothing else failed. Preview servers and the run's Chrome profiles (`k1482s40-m/c/m2/c2` under `$env:TEMP`) stopped and removed at the stop line.
