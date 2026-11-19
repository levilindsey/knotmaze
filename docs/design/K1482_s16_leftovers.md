# K1482 stage 16: the joint flag's leftovers (seams, the six smaller sites, the fill's 5 px) (Claude agent stage)

Read `### Handoff K1482 s15` in `docs/design/K1482_s15_slot_flag.md` whole. Stage 15 landed the baked joint
flag (0cee0dc1 on master; link A 36 to 31; K1436 bar PASS new 0 on ring, def, muse_hash, g41_user_tw64).
The reference is Levi's bar on gf's own picture: at junctions and under-tail ends the over thread's outline
runs on unbroken, with no dot, stub, wedge, tick, notch or sliver.

## Do, in this order

1. **The fill's 5 px.** With `tlk=fill` on link A, tip against 268c6c18 in one physics hash: find the term
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
4. Measure what stage 15 skipped: the tables build time on muse_hash, tip against 268c6c18, paired median
   of 7, labelled "under load" (no perf lock).

## Done

- The sweep's faulted count on your tip by class (start: 31, `.claude/probes/K1482/out/s15/classes_tip.txt`),
  by your own eyes, every moved site named, none worse, `count13.py --specks` against your start 0 new.
- Fill look 0 px against 268c6c18 (or the noise shown); `hold.mjs` 60/60 on link A; both dragchecks pass
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
