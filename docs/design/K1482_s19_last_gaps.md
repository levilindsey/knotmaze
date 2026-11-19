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
- The K1436 bar once, `STRICT=1 -NoPerfLock`, on `ring,def,muse_hash,g41_user_tw64`, `-Base` 2e70be908
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
