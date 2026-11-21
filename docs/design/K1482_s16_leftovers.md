# K1482 stage 16: the joint flag's leftovers (seams, the six smaller sites, the fill's 5 px) (Claude agent stage)

Read `### Handoff K1482 s15` in `docs/design/K1482_s15_slot_flag.md` whole. Stage 15 landed the baked joint
flag (4bf1f072 on master; link A 36 to 31; K1436 bar PASS new 0 on ring, def, muse_hash, g41_user_tw64).
The reference is Levi's bar on gf's own picture: at junctions and under-tail ends the over thread's outline
runs on unbroken, with no dot, stub, wedge, tick, notch or sliver.

## Do, in this order

1. **The fill's 5 px.** With `tlk=fill` on link A, tip against 0f7c5a9d in one physics hash: find the term
   that reads the flag in the fill look and make the fill exactly 0 px again (or show the 5 px are load
   noise with two captures of one build). Its own commit.
2. **The four 1 px seams** (t25s/j60 at dev 1596:1542, j36 2097:1035, j143/t67s 1968:388, j4/t2s 1646:231):
   at each, print the border composite's terms at the seam pixel and its two neighbours across the seam,
   name the term that leaves it light, and close it by the flag's definition or the cut's geometry (not a
   per-pixel patch that could flip). Each seam gone is a win; land what closes without moving any other
   site for the worse.
3. **The six sites that got smaller but still count** (j4, j36, j71, j158, t16e, t73e; `out/s15/sheets/
   cls_1.png`, `cls_2.png`): for each say what is left (the same pass's other side not flagged, a second
   crossing's cut, the joint's own outline) and fix those that share a cause with step 2 or with each other.
   One whose cause is separate: record it, do not chase it.
4. Measure what stage 15 skipped: the tables build time on muse_hash, tip against 0f7c5a9d, paired median
   of 7, labelled "under load" (no perf lock).

## Done

- The sweep's faulted count on your tip by class (start: 31, `.claude/probes/K1482/out/s15/classes_tip.txt`),
  by your own eyes, every moved site named, none worse, `count13.py --specks` against your start 0 new.
- Fill look 0 px against 0f7c5a9d (or the noise shown); `hold.mjs` 60/60 on link A; both dragchecks pass
  (`.claude/probes/K1482/s15/panelopen.mjs` first: cap15 leaves the panel closed in its profile); `npm test`
  green.
- The K1436 bar once, `STRICT=1 -NoPerfLock`, on `ring,def,muse_hash,g41_user_tw64`, `-Base` your starting
  commit, `-Tag k1482s16`: no new find, none grown.

## How to work

As stage 15's: profiles under `$env:TEMP\k1482s16-*`; ports 5930-5949; your probe directories are
`.claude/probes/K1482/s16` and `.claude/probes/K1482/out/s16`. At most three preview builds alive at once:
delete a build before making a fourth (the disk filled on 2026-11-18). Muse's Run Q works in the main
checkout on `k1436_bar.ps1` (so run the bar from your worktree's copy), then on `tables.ts`, `eval.ts` and
`gf_glsl.ts`: change no file in the main checkout, stay in `gf_look.ts` and `gf_app.ts`, and fetch and
rebase before each landing commit and before the handoff.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock from your first `Get-Date`
(`Get-Date` at each milestone), whichever comes first; keep the last 30 minutes for the checks. Do not stop
early while a step is untried and time remains. A compaction is not a stop: re-read this brief and
`git log`. On stopping: commit WIP, append `### Handoff K1482 s16` here, commit, and report: the class
table, the sheets' absolute paths (each site named), the numbers, which commits are confirmed on screen, a
`Ledger items` list and K1482's handle fields.

### Handoff K1482 s16

Stopped at 12:19 AM 2026-11-19 (start 10:50:37 PM 2026-11-18). Branch `worktree-agent-adb9685c1b245d815`, level with
origin/master plus: bc6e0cde1 (step 1), e4ad4cc84 (step 2), c24d7b8d7 (WIP: probes, sheets, class table) and
this handoff. Source diff: `gf_look.ts` and `gf_gap.test.ts`; tables.ts, eval.ts, gf_glsl.ts and gf_app.ts
untouched.

**Step 1, the fill's 5 px.** Neither load noise nor a fill change against 0f7c5a9d: stage 15's 5 px were the
tip against its own flag-off patch. The start (5e981cb4) against 0f7c5a9d is 0 px in the fill look, and two
captures of one build are 0 px. The one path by which the flag could reach the coverage (and so the fill,
`o = vec4(C * cov, cov)`) was the far-reach term's gate, `gA < 0.999` behind the flagged cut g; bc6e0cde1
gates it by the unflagged cut g0 from the same loop, so the coverage cannot read the flag by construction.
The tip e4ad4cc8 on its own build: fill 0 px against 0f7c5a9d. Probe trap: a shader patched in the page reads
30035 px against 0f7c5a9d in the fill look even when its values equal the start's (the null control
`s16/patch_n0.json`): the patched program's codegen, so fill A/Bs run on builds, never on patches.

**Step 2, the four seams.** At the seam pixels the terms (`s16/terms16.py`, `patch_dbg16.json`) showed the
flagged side's cut: margin 0 and a fade of 0.3 of the slider started it at the over's outline, so the first
pixel past it (inner about 0.87) kept 0.13-0.53 of the cut, a 1 px light line between the over's outline and
the under's. e4ad4cc84 gives a flagged side a margin of -1 px (sc.x = -pxw / uLkG; fade unchanged; unflagged
cuts untouched). On the tip's own build (`s16/seamfind.py`, start -> tip): t25s/j60 (1593,1540-1543;
1594,1544) closed; j36 (2099,1030; 2100,1031; 2099,1037-1038) closed; j143/t67s (1971,390) closed; j4/t2s
(1646,231) stays, no flagged cut there: the light pixel sits between the joint's own outlines (separate
cause). The same change also closes 1 px joint seams at j157, j87, j146, j16, t70s, j19, j92, t5s, t81e and
t47s (`out/s16/sheets/f2_seams.png`, `f2_gains.png`, `f2_gains_z.png`).

**Step 3, the six.** j36 stub and t16e notch (the light line at 2269-2271,1135 / 2272,1136): step 2's cause,
closed (`tip_six_1.png`, `tip_six_z.png`). j4 notch and j71 sliver (between thread 67's and thread 30's
outlines; +2 ink px on the tip): the joint's own outline, no cut at the light pixels; one cause, separate,
not chased. j158 and t73e wedges (one spot, 1638-1640,574-576): the light pixels read jb 0 under an unflagged
cut of 0.73-1.0, so the bake's flag ends along the arc before the cut's window does; separate, not chased.

**Step 4, the tables build time.** stats.tablesMs on muse_hash (`s16/tms16.mjs`), 7 paired rounds of 5
forced rebuilds, one headed Chrome, order alternating, UNDER LOAD (no perf lock): 0f7c5a9d median 16.10 ms,
5e981cb4 (stage 15's flag bake) 16.90 ms, paired median B/A 1.054 (rounds 0.94-1.21). Stage 16 changed no bake
code, so the tip's bake is 5e981cb4's. `out/s16/tms_268c_vs_2eba.log`.

**Done checks (tip e4ad4cc8 on its own build, link A, hash fff8c9e5).**
- Class table `out/s16/classes_tip.txt`: 31 -> 29 (wedge 8, notch 8, sliver 6, tick 1, break 3, dot 2,
  stub 0, pocket 1). Fixed: j36 stub, t16e notch. Still faulted: j4, j71, j158, t73e (above).
- Movers: 16 of 327 sites move more than 4 ink px against the start, none more than 8 (ink 531628 ->
  531816); every one viewed at 4-10x (`tip_mov_1..3.png`, `tip_t68s_z.png`): t25s, j60, t29e, j67, j87,
  j109, t50e, t16s, t52s gain 1 px fills at joint seams or a chevron's inner vertex; j142, t66e, t71e, j138
  and j148/t68s flip end-cap edge pixels +-3, which the tip against f3 (the same rule patched in) and n0
  against startg0 flip as well: frame noise. None newly faulted.
- count13 limits 20/20; `--specks` against the start 0 new.
- Fill 0 px against 0f7c5a9d; hold.mjs 60/60 (link A + `&rp=gf`); panelopen, then dragcheck_b PASS (0 px at
  fades 0.5, 1.2, 0.14) and dragcheck PASS (0 px); `npm test` green (256 files, 3189 tests).
- The K1436 bar (`STRICT=1 -NoPerfLock`, ring,def,muse_hash,g41_user_tw64, -Base 5e981cb4 -Ref e4ad4cc8,
  -Tag k1482s16): PASS, new 0, grown 0, gone 0, taken under load;
  base and ref froze on the same hashes in all four scenes (ring 50dd4ffd, def 910ff135, muse_hash 733ee14a,
  g41_user_tw64 0d51331b). `.claude/probes/K1436/out/bar/k1482s16/bar.txt`.

**Confirmed on screen.** e4ad4cc84 on its own build (raw/tip: seamfind, tiles, the class table); bc6e0cde1
on its own build inside the tip (fill 0 px), and before it landed on the start build patched in the page
(raw/startg0).

**Probe notes.** The border look carries thousands of 1-level pixels of run-to-run noise: judge per site by
ink (s11/boxdiff.py, RGB sum <= 73) and `seamfind.py`, never by whole-frame px. `run7.ps1` runs the Done
checks on one build in order (cap, hold, panelopen, dragcheck_b, dragcheck).

**Next.** Two separate causes, a stage each: the joint's own outline at j4/j71 (no cut reaches the light
pixel), and the flag's extent along the arc at j158/t73e. Levi still to say whether c1's short fade on joint
sides at a large fade is the look he wants.
