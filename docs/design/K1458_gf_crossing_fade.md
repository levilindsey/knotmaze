# K1458: rp=gf draws no crossing fade on an ordinary load (Claude agent stage)

## What Levi saw (2026-11-17, on `https://levi.dev/knotmaze/?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1`)

"I don't see any fading happening, regardless of the slider value. I still see plenty of border artifacts."
Earlier, on the fade (K1440): "isn't this controlled by the crossing fade parameter? I want to continue being
able to adjust it on the fly." The slider is the panel's "Crossing fade" (`fadeLength`, URL key `fl`, 0 to 1.2,
default 0.14).

## What is measured (coordinator, live build 26b8a905, desktop Chrome, ordinary loads, no forced frames)

Sheets in `.claude/probes/K1444/` of the coordinator worktree `agent-af52b1a95572b7c1a` (committed):
`live_fill_A.png` (rows today | gf | gf + gfh=1; columns fade 0 | 0.14 | 1.2; link
`?3&xp=off&am=instant&prp=off[&rp=gf[&gfh=1]]&fl=<v>`, 2x device pixels, upscaled 2x), `live_fill_outl.png`
(rp=outline, same crop), `live_border_A.png` (the same on Levi's link, border look, contrast raised 2.2x).

- **He is right.** Today's renderer fades the under thread into the background before each crossing: nothing at
  fade 0 (a crisp thin gap), a short soft ramp at 0.14, a long one at 1.2. gf draws the under thread at full
  colour up to the over thread's edge at every fade value; only small outline details at junctions change.
  gf at 0.14 and 1.2 also shows a dotted, stair-stepped dark line along over-thread edges and dark ticks at
  junctions that fade 0 does not show.
- gf_look.ts's `lkGap` (K1389, K1398, K1415, K1417, K1423) is meant to cut today's gap and ramp it over today's
  fade (`uLkF`). Muse's runs measured it against today's and passed. So either those measures ran on a state
  the ordinary load never reaches, or they did not measure the fade, or something later removed it. Find out
  which before changing anything: capture one crossing on an ordinary load and read what `lkGap` returns there
  (the window term `uGwLive` / `lkWinM`, the key test, `uLkF`'s value at the draw).
- Dragging the slider with the real mouse does reach gf (`__knotGf.home.fade` follows; probe
  `.claude/probes/K1444/drag.mjs`), but the page then rewrites the address to the bare token
  (`url_state.ts:2465`), so `rp=gf&gfh=1` are gone and a reload shows today's renderer.
- Border look (Levi's link): today's strokes are thin, dim and section-tinted, and fade out toward crossings;
  gf's are near-black, wider, on both edges of every thread, and end in hard cuts, with blobs where strokes
  meet and ticks at fade 1.2.

## Do

1. The cause, from what the page draws on an ordinary load, in two or three sentences, and why Muse's gates
   did not see it.
2. Fix it in `src/`: under rp=gf, with and without `gfh=1`, the under thread fades before a crossing as
   today's does, following the live slider. Own the technique. The dotted line and the junction ticks at
   0.14 and 1.2 are part of this if they share the cause; otherwise report them with crops.
3. Keep `rp`, `gfh` and the other URL-only flags the page read at load in the address when the panel
   rewrites it (`url_state.ts`), with a test under `test/ui/`.
4. Border look: measure gf against today's on Levi's link (stroke colour, width, where a stroke ends). Fix
   what shares the fade's cause; report the rest with numbers and crops, do not widen the stage.
5. A guard, `.claude/probes/K1458/fade.mjs`: ordinary load, today's and gf at `fl` 0 and 1.2, fails when gf's
   under-thread ramp is not there. It must fail on origin/master.

## Done

1. On a build of your branch (`preview.ps1 -Ref`), ordinary loads of `?3&xp=off&am=instant&prp=off&rp=gf&fl=<v>`
   for v = 0, 0.14, 0.5, 1.2, at 12 ordinary crossings spread over the frame: the under thread's coverage
   along its centre line toward the over thread reaches 90%, 50% and 10% within 15% (or 1 device pixel) of
   the distances today's renderer gives at the same crossing and v. The same with `&gfh=1`.
2. `drag.mjs` on the same link: the picture after each slider stop matches item 1's without a reload.
3. A 4x sheet, today | gf | gf + gfh=1 at fade 0, 0.14, 1.2, of six crossings and three junctions, that you
   looked at yourself: no dotted line, no tick, the fade as today's.
4. `.claude/probes/K1450/hold.mjs` passes on `?3&xp=off&am=instant&rp=gf` and
   `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (no `prp=off` there).
5. After a slider drag `location.search` still carries `rp=gf` and `gfh=1`; the test is green.
6. `npm test` green. Pins that move are named with the reason.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- Muse batch 25 is editing `gf_look.ts`, `gf_pass.ts`, `gf_reveal.ts` and `gf_explore.ts` in the main checkout
  and pushing to master. Keep your diff in those files as small as the cause allows, and before the handoff
  `git fetch` and `git rebase origin/master` so it merges clean.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5580-5599. Headed, real-time Chrome, never `--virtual-time-budget`; one kept profile folder (a cold
  profile's first gf load takes about 2 min). No performance numbers are asked for: do not take the perf lock.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files). Never push. Never edit
  LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Helpers run on sonnet for mechanical work (captures, sheets), with this stop rule.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone),
whichever comes first. A compaction is not a stop: re-read this brief and `git log`. At the stop line with
the fade not matching: report what you tried and why each attempt fell short, not only the cause. On
stopping: commit WIP, append `### Handoff K1458` here, commit, and report: what holds, the sheets' paths,
the numbers, a `Ledger items` list and K1458's handle fields.

### Handoff K1458

2026-11-17, 09:07-10:50. Branch `worktree-agent-a108251c8d94e5b3a`, rebased on origin/master 48d1b37c
(the conflict was 25B's reverted K1431 block in gf_app.ts; master's form kept, plus the re-bake line).

**Cause** (from the drawn page, fade.mjs at fl 0 / 0.14 / 0.5 / 1.2 on one frozen state). gf's crossing
cut looped only over the per-pixel candidate pieces, which enter the list within rc = h + W + 2aa of the
pixel, so the under thread's fade stopped at a hard edge wherever today's ramp is longer than that
(every fl above about 0.14): the "gap that ignores the slider". Three more gaps behind it: today's K1218
S3 joint window cap and the per-side clearance scales were not ported, and the bake ran only on a build,
so a slider move on a sleeping knot kept the old window. Last, the per-sample bake that fixes the first
compared a float64 window against its own float32 copy and dropped about 2 of 3 samples, which drew the
stripes and stairs at long fades. The gates missed it because K1423's gate measured only fl 0.14 at
520x520 DSF1, where the candidate reach covers the whole ramp.

**Commits** (oldest first): b34cc9ba URL-only flags survive the panel's rewrite (+ test); 9b48e44f the
far reach (GW4 bake: winM, over chain, kept over index, scan + packed scales; shader lkGwSlot / lkNearOn
ramps from the over pass's true nearest point); 13bd0e34 fade.mjs; 676bd926 joint cap + clearance
scales; eff5a869 their tests; 77c180b9 re-bake on a fade or margin change; 7a5e8aad the float32 fix.

**Done, measured on 7a5e8aad's parent tree c681ecb7 (same src as 7a5e8aad before the rebase)**:
1. fade.mjs, gf / gfh sides within tolerance: fl 0 667/679, 0.14 665/679, 0.5 614/630, 1.2 432/451
   (98.2 / 97.9 / 97.5 / 95.8%; p90 |d - today| 0.0008 / 0.0006 / 0.0040 / 0.0155 world; before the
   float32 fix 0.5 was 82.4% and 1.2 77.6% with p90 0.093). The guard still prints FAIL: its sameState
   check fails because loads settle in one of two states (hashes 49c20566 / f9d72040), whatever fl is.
2. dragcheck.mjs (on de44f13e): PASS both modes, 0 px at every stop against a same-state fresh load.
3. Sheet `k1458out\pv6\sheet_c681.png`: fl 0 and 0.14 match today at all 9 sites; fl 1.2 fades smoothly
   at the six crossings. Left: a thin stair-stepped outer edge and faint radial bands on the faded under
   thread at jB and ci3's upper right (`pv6\zoom_c681.png`), and gf reads a little brighter than today
   at ci0's lower right. jB at fl 0 shows a small round blob at the lower right junction in gf and not
   in today's: a junction-look difference present with no fade, not part of this cause.
4. hold.mjs PASS on the rebased head 7a5e8aad, both links (60 of 60 frames show the maze).
5. Done (url_flags.test.ts; dragcheck's search keeps rp=gf and gfh=1).
6. npm test green on c681ecb7 (3111 passed) and on the rebased head (3110 passed; master's 25B revert
   took one test). No pin moved.
Border (Do 4): border.mjs on 7a5e8aad wrote `k1458out\border7\border_{today,gf,gfh}.png`, then died
with a puppeteer "Target closed" in its measuring step: no numbers.

**Probes** `.claude/probes/K1458/`: fade.mjs (guard), dragcheck.mjs, sheet.mjs, border.mjs (unrun),
claims.mjs (falsified the "wrong over pass named" idea: 0 of 700 sides claimed), align.mjs (bake index
= field vertex index on all 86 chains), bake.mjs (per-sample bake along one window; found the float32
holes), info.mjs, win.mjs.

**Next**: fix border.mjs's crash and measure the border; find the jB / ci3 edge stairs at fl 1.2
(bake.mjs on those crossings: a sample with oCh -1 inside a window, or the ±40-sample scan cap); make
fade.mjs's sameState pick same-hash loads (dragcheck's retry) so its verdict means something.
