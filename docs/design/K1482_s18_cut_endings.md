# K1482 stage 18: the eight GAP sites, a cut's ending beside a fused joint (Claude agent stage)

Read `### Handoff K1482 s17` in `docs/design/K1482_s17_joint_outlines.md` whole and
`.claude/probes/K1482/out/s17/eval_red.txt`, then `### Handoff K1482 s15` in
`docs/design/K1482_s15_slot_flag.md` (the baked per-slot-side joint flag, the carrier, why per-pixel rules
fail). Master has stages 15 to 17 (link A 36 to 27). The reference is Levi's bar on gf's own picture: at
junctions and under-tail ends the over thread's outline runs on unbroken, with no dot, stub, wedge, tick,
notch or sliver.

**Yours are the 8 sites marked GAP in `.claude/probes/K1482/out/s17/classes_tip.txt`**: j22, j29, j49, j88,
t65s, t70s, t80s, t81s. Stage 17 found one shared cause: a crossing cut's own ending removes ink on an
unflagged slot; the over thread there is not a member of the fused joint beside it. At j22, j88 and t80s the
joint is on the UNDER chain, which the flag (over membership only) never reads.

## Do, in this order

1. **The under-member case** (j22, j88, t80s): extend the bake so a slot side whose UNDER pass is an arm of a
   fused joint within reach gets the short cut too (the same carrier; another bit if the meaning must stay
   apart). Decide it per slot in the bake, never per pixel. Capture, judge by `count13.py` and your eyes on
   4x tiles, start | tip, of every site moving 10 px or more. Land it, its own commit with a unit case, only
   if no site is worse and no speck is new; a narrower definition that fixes some and worsens none is worth
   landing.
2. **The other five** (j29, j49, t65s, t70s, t81s): for each, say from `eval_red.txt` and the pixel's terms
   which slot's cut ends there and what a bake-side fact could tell it from an ordinary crossing (a joint
   within reach on either chain, the cut window overlapping a joint's vertex cap, ...). Try the definition
   that covers the most sites; same landing rule.
3. If time remains, t81s's V (909-912,1168-1170 still light) and j71 on its own.

Not yours: j4's line between two separate surfaces (it waits on Levi's K1490 answer), the 17 K1490 sites,
j64.

## Done

- The sweep's faulted count on your tip by class (start: 27), by your own eyes, every moved site named, none
  worse, `count13.py --specks` against your start 0 new.
- Fill look 0 px against your starting commit ON BUILT PREVIEWS; `hold.mjs` 60/60 on link A; both dragchecks
  pass (`.claude/probes/K1482/s15/panelopen.mjs` first); at `fl` 0 and 1.2 three ordinary crossings away
  from any joint unchanged; `npm test` green.
- The K1436 bar once, `STRICT=1 -NoPerfLock`, on `ring,def,muse_hash,g41_user_tw64`, `-Base` your starting
  commit, `-Tag k1482s18`: no new find, none grown. (The bar prunes builds that are not its own `-Ref` or
  `-Base`: keep your working previews outside its root.)

## How to work

As stage 17's: profiles under `$env:TEMP\k1482s18-*`; ports 5970-5989; your probe directories are
`.claude/probes/K1482/s18` and `.claude/probes/K1482/out/s18`. At most three preview builds alive at once.
Muse works in the main checkout (the bar script, then `tables.ts`, `eval.ts`, `gf_glsl.ts`): change no file
there, stay in `gf_look.ts`, `gf_app.ts` and their tests, run the bar from your worktree's copy, fetch and
rebase before each landing commit and the handoff.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock from your first `Get-Date`
(`Get-Date` at each milestone), whichever comes first; keep the last 30 minutes for the checks. Do not stop
early while a step is untried and time remains. A compaction is not a stop: re-read this brief and
`git log`. On stopping: commit WIP, append `### Handoff K1482 s18` here, commit, and report: the class
table, the sheets' absolute paths (each site named), the numbers, which commits are confirmed on screen, a
`Ledger items` list and K1482's handle fields.
