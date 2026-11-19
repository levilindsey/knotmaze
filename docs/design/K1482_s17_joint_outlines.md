# K1482 stage 17: the eight joint-side sites left (the joint's own outlines, the flag's arc end) (Claude agent stage)

Read `### Handoff K1482 s16` in `docs/design/K1482_s16_leftovers.md` whole, then `### Handoff K1482 s15` in
`docs/design/K1482_s15_slot_flag.md`. Master has stages 15 and 16 (the baked joint flag; link A 36 to 29).
The reference is Levi's bar on gf's own picture: at junctions and under-tail ends the over thread's outline
runs on unbroken, with no dot, stub, wedge, tick, notch or sliver.

Of the 29 sites left, 19 wait on Levi (K1490, the sharp V), one is K1470's and one the field's pinhole
(j64, Muse). **Yours are the 8 marked GAP in `.claude/probes/K1482/out/s16/classes_tip.txt`.**

## Do, in this order

1. **The flag's arc end** (j158 / t73e, dev 1638-1640,574-576): the bake's flag ends along the arc before
   the cut's window does. Make the flag's extent and the window's agree in the bake; its own commit.
2. **The joint's own outlines** (j4/t2s at 1646,231 and j71): a light pixel between the joint's own
   outlines, no cut involved. Print the border composite's terms at the pixel and its neighbours, name which
   outline stops short or which coverage leaves the hole, and close it where that term is made (if that is
   `tables.ts`, `eval.ts` or `gf_glsl.ts`, keep the diff to the lines needed and rebase before committing:
   Muse works in those files).
3. **The rest of the 8**: sort each into cause 1, cause 2 or its own; fix those sharing 1 or 2, and for one
   with its own cause print the terms, name it, and fix it if time allows.

## Done

- The sweep's faulted count on your tip by class (start: 29), by your own eyes, every moved site named,
  none worse, `count13.py --specks` against your start 0 new.
- Fill look 0 px against your starting commit ON BUILT PREVIEWS (an in-page shader patch moves the fill by
  itself); `hold.mjs` 60/60 on link A; both dragchecks pass (`.claude/probes/K1482/s15/panelopen.mjs`
  first); `npm test` green.
- The K1436 bar once, `STRICT=1 -NoPerfLock`, on `ring,def,muse_hash,g41_user_tw64`, `-Base` your starting
  commit, `-Tag k1482s17`: no new find, none grown. (The bar now prunes builds that are not its own `-Ref`
  or `-Base`: do not keep your working previews under its root.)

## How to work

As stage 16's: profiles under `$env:TEMP\k1482s17-*`; ports 5950-5969; your probe directories are
`.claude/probes/K1482/s17` and `.claude/probes/K1482/out/s17`. At most three preview builds alive at once.
Muse works in the main checkout (the bar script, then `tables.ts`, `eval.ts`, `gf_glsl.ts`): change no file
there, run the bar from your worktree's copy, fetch and rebase before each landing commit and the handoff.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock from your first `Get-Date`
(`Get-Date` at each milestone), whichever comes first; keep the last 30 minutes for the checks. Do not stop
early while a step is untried and time remains. A compaction is not a stop: re-read this brief and
`git log`. On stopping: commit WIP, append `### Handoff K1482 s17` here, commit, and report: the class
table, the sheets' absolute paths (each site named), the numbers, which commits are confirmed on screen, a
`Ledger items` list and K1482's handle fields.
