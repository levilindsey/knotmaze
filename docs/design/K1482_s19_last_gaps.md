# K1482 stage 19: j29, j49, t81s's V, j71 (Claude agent stage)

Read `### Handoff K1482 s18` in `docs/design/K1482_s18_cut_endings.md` whole, then `### Handoff K1482 s17`
in `docs/design/K1482_s17_joint_outlines.md`. Master has stages 15 to 18 (link A 36 to 22). The reference is
Levi's bar on gf's own picture: at junctions and under-tail ends the over thread's outline runs on unbroken,
with no dot, stub, wedge, tick, notch or sliver.

## Do, in this order

1. **j29**: no joint lies within the cut's reach (1.7-2.1 arc on both chains). Print the border composite's
   terms at the faulted pixels and their neighbours, name the term that removes the ink, and fix it where
   that term is made.
2. **j49**: a third chain's joint near the outline. Stage 18's prototypes (v4/v12, u18 128/256 in its WIP
   commits) were too broad or too weak; find the bake-side definition kept within about 1.5 arc that closes
   it and moves no site far from a joint.
3. **t81s's V** (909-912,1168-1170 still light) and **j71** on its own: terms first, then the fix.
4. Rerun the K1436 bar's two scenes stage 18 could not judge (see Done).

Not yours: j4's line between two separate surfaces and the 17 K1490 sites (they wait on Levi), j64 (Muse).
Do not change how flagged sides follow the Crossing fade (K1521 waits on Levi).

## Done

- The sweep's faulted count on your tip by class (start: 22), by your own eyes, every moved site named, none
  worse, `count13.py --specks` against your start 0 new.
- Fill look 0 px against your starting commit ON BUILT PREVIEWS; `hold.mjs` 60/60 on link A; both dragchecks
  pass (`.claude/probes/K1482/s15/panelopen.mjs` first); `npm test` green.
- The K1436 bar once, `STRICT=1 -NoPerfLock`, on `ring,def,muse_hash,g41_user_tw64`, `-Base` 0ceddbc54
  (stage 18's start, so ring and g41_user_tw64 are judged across stages 18 and 19), `-Tag k1482s19`: no new
  find, none grown; a scene that will not freeze after two bar runs is named.

## How to work

As stage 18's: profiles under `$env:TEMP\k1482s19-*`; ports 5990-6009; your probe directories are
`.claude/probes/K1482/s19` and `.claude/probes/K1482/out/s19`. At most three preview builds alive at once,
kept outside the bar's root. **Before your first build or Chrome, wait in ONE blocking loop (60 min at most)
while `$env:TEMP\claude-perf.lock` exists**: Muse is timing cold loads under it; the wait does not count
against your 2 h. Muse works in the main checkout (`tables.ts`, `eval.ts`, `gf_glsl.ts`, the bar script):
change no file there, keep any diff in those three files to the lines needed, run the bar from your
worktree's copy, fetch and rebase before each landing commit and the handoff.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock from the end of the lock wait
(`Get-Date` at each milestone), whichever comes first; keep the last 30 minutes for the checks. Do not stop
early while a step is untried and time remains. A compaction is not a stop: re-read this brief and
`git log`. On stopping: commit WIP, append `### Handoff K1482 s19` here, commit, and report: the class
table, the sheets' absolute paths (each site named), the numbers, which commits are confirmed on screen, a
`Ledger items` list and K1482's handle fields.

### Handoff K1482 s19

Claude agent (worktree-agent-a5d6861178992f9ee), 2026-11-19 04:09-06:09. **No src change landed**: every probe was
reverted, so the tip's `src/` and `test/` equal 41368cbbd. Each of the four sites was taken to its terms. Two
(j29, j49) can be closed only by changing an ordinary crossing gap's ending, at many other sites at once. That is a
look for Levi, not a fix this stage may pick. The other two (t81s's V, j71) have no cut to fix: they are K1490's.
Probe code is in `.claude/probes/K1482/s19/` (`u19_probe.patch`, `v19_t19_w19_probe.patch` apply to 41368cbbd;
`cap19.ps1`, `run19.ps1`, `log19.py`, `ov19.py`, `z19.py`). Sheets are in `.claude/probes/K1482/out/s19/sheets/`.

- **j29 (break):** the term that removes the ink is **xi291's ordinary crossing cut (c67 over c66) on c66's
  UNFLAGGED side**. No joint is within reach, so `gapJointFlags` sets no bit, and the cut fades c66's outline
  short of c67's outline, as at every ordinary crossing. That is the gap convention working as designed, at a
  spot that reads as a break. u19 (flag the far side 3 when both the over and under members lie within a19 = 0.7
  arc of the crossing) joins j29. It also joins about 74 other ordinary crossing endings (`u19a_cmp.png`). Not
  landed. Sheets: `ov_j29.png`, `ov_j29b.png`, `z_j29.png`, `z_j29c.png`, `z_j29w.png`, `z_j29z.png`,
  `u19a_cmp.png`.
- **j49 (tick):** this is two clusters of ONE ordinary under-pass gap: xi325, c75 over c71 (c71:980 / c75:226),
  about 0.5 arc past c75's member run 197-219 of the fused joint g50, where c18 starts.
  - j49t (1792,1579) is the gap's near end. **v19** flags the under side where a third chain shares a fused joint
    whose vertex lies on the over chain within 1.5 arc of the crossing. It closes j49t (+27 ink), but it fires on 82 crossings and closes about 11 other
    tail-end gaps (t20e, t17s, t24e, t61s, ...): `v19a_movers.png`, `sort_j49_v19.png`.
  - j49r (1829,1602) is the far end. Its nearest c75 sample is the first non-member past the joint's member run.
    **t19** adds a membership-boundary tolerance to `gapJointFlags`' near bit (dM < reach² and
    √dM ≤ √dN + 0.25 arc); **w19** applies it only where a third chain's joint is near. They close j49r. They also join the same-shaped under-tail gaps at about 17 junction
    and tail sites (j20, t75s, t73s, t23s, j50, j99, j143, j5, t61s, t47e, t60e, t66s, j101, j15, t58e, ...).
    At j50 they leave a dot. Sheets: `t19a_top.png`, `t19b_1.png`, `t19b_2.png`, `w19a_1.png`, `w19a_2.png`,
    `z_j49_t19.png`.
  - Every site they move is within about 1.5 arc of a joint, as the brief asked. But each changes the gap
    convention at under-tail ends Levi has not seen joined. Not landed. Base sheets: `sort_j49.png`,
    `ov_j49.png`, `ov_j49b.png`, `ov_j49r.png`, `z_j49.png`.
- **t81s's V (909-912,1168-1170) and j71:** both are cause 2: **no cut at all**. The light pixels lie between the
  outlines of two separate surfaces at a fused joint: t81s's V between labs 45 and 5 at jn19, and j71 between c67
  and c30 at jn71 (`sort_j71.png` all yellow: no gap term). They are K1490's cross-surface rule, so their owner
  moves from GAP / K1470 to K1490. No fix. Sheets: `ov_t81s.png`, `z_t81sV.png`, `z_t81sW.png`, `ov_j71.png`,
  `sort_j71.png`, `z_j71.png`. `sort_dbg0.png` is the baked-term sort of the start.

**Class table** (tip 24a9f83b2 against start 41368cbbd, its own build, hash fff8c9e5;
`.claude/probes/K1482/out/s19/classes_tip.txt`). 22 (start 22): wedge 6, notch 8, sliver 5, tick 1, break 1,
dot 1; by owner K1490 19, GAP 2 (j29, j49), PIN 1 (j64). Every site was seen at 4x (`cls_1.png`, `cls_2.png`):
all +0 -0 except j15 +1, an end-cap edge pixel. None moved, none worse.

**Checks on the tip:**
- **Pass:** `npm test` 256 files / 3190 tests green. Fill look 0 px against the start (built previews).
  `hold.mjs` 60/60 on link A. panelopen ok. Fill dragcheck PASS (53 px / 71 px > 24 at stops 1.2 / 0.14).
  `count13` 20/20.
- **count13 --specks, 1 new:** (1692,336), 1 px, RGB sum 74 to 73 at the ink threshold. The same-src dev control
  (`raw/ctl`) shows the same speck, so it is frame noise.
- **Border dragcheck FAILED twice, on a state lottery, not pixels:**
  - Stops 0 and 0.5 pass with 0 px.
  - At stops 1.2 and 0.14, all four fresh loads froze on state 49c20566 instead of the drag's f9d72040.
  - The fill dragcheck hit the same lottery at 0.14 and reached f9d72040 on its third load.
  - With src identical to the start, this is load-state nondeterminism. The probe needs more retries, or a
    pinned state.

**The K1436 bar** (`STRICT=1 -NoPerfLock`, ref 24a9f83b2 against base 0ceddbc54, scenes ring, def, muse_hash,
g41_user_tw64, `-Tag k1482s19`; `.claude/probes/K1436/out/bar/k1482s19/bar.txt`):
- **PASS: new 0, grown 0, gone 0.**
- Each scene froze on the same hash on both builds: ring 50dd4ffd, def 910ff135, muse_hash 733ee14a,
  g41_user_tw64 0d51331b.
- Ring needed two loads on the base (it saw 0a0ee15e first). It needed one on the ref.
- So ring and g41_user_tw64 are judged across stages 18 and 19, and every scene froze.
- Taken under load (no perf lock).

**Confirmed on screen:** none of this stage's commits changes the picture (src equals 41368cbbd). Stage 18's
merge 905abef19 holds at 22 on the tip's own build.

**Ledger items:**
- **j29: a look question for Levi.** Should an ordinary crossing whose over and under members both lie within
  0.7 arc of it join the under thread's outline to the over thread's outline (u19)? That closes j29 and about 74
  other ordinary endings (`u19a_cmp.png`).
- **j49: a look question for Levi.** Should under-tail gaps beside a fused joint join? v19 closes j49t and about
  11 tail-end gaps. t19 / w19 close j49r and about 17 junction and tail gaps, with a dot at j50. Sheets:
  `v19a_movers.png`, `w19a_1.png`, `w19a_2.png`.
- **t81s's V and j71 move to K1490.** Both are cross-surface light with no cut.
- **Residual: the border dragcheck's state lottery.** dragcheck_b failed twice at stops 1.2 and 0.14 because no
  fresh load reached f9d72040. It needs more retries or a pinned state (probe, not src).

**K1482 handle at stop:**
- owner: nobody since 2026-11-19 06:00 (stage 19 done; j29 and j49 wait on Levi's look answers).
- branch: worktree-agent-a5d6861178992f9ee (`.claude/worktrees/agent-a5d6861178992f9ee`), last commit: this
  handoff.
- evidence: `.claude/probes/K1482/s19/`, `.claude/probes/K1482/out/s19/`,
  `.claude/probes/K1436/out/bar/k1482s19/`.
- next: show Levi `u19a_cmp.png` (j29) and `v19a_movers.png` / `w19a_*.png` (j49), then land the chosen rule from
  the patches.
- brief: this file.
