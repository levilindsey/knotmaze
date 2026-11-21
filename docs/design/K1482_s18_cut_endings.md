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

### Handoff K1482 s18

Agent `worktree-agent-a077003d003b40d70` (worktree `.claude/worktrees/agent-a077003d003b40d70`), 2026-11-19
02:05-04:05. Start 0ceddbc54; landed **34ffa004d** (rebased onto 0a9dd835a; not pushed).

**Landed (step 1, and three of step 2's five).** `gapJointFlags` takes the under chain and its kept indices:
a side of a slot is also flagged when a member sample of the UNDER chain within `GAP_JOINT_RA` (arc) of a
slot lies within the cut's reach (`fillHalf + margin + fade`) of that side's outline point. Same carrier
(bits 1/2), decided per slot in the bake. Unit case "K1482 s18: a slot whose UNDER pass is a joint arm within
the cut's reach carries the flag on both sides" in `test/render/gf_gap.test.ts`.

**Faulted count by class, by eye (`.claude/probes/K1482/out/s18/sheets/cls_*.png`):** start 27, tip 22.
| class | wedge | notch | sliver | tick | break | dot | stub | pocket |
|---|---|---|---|---|---|---|---|---|
| tip | 6 | 8 | 5 | 1 | 1 | 1 | 0 | 0 |
By owner: K1490 17, GAP 3 (j29, j49, t81s), K1470 1, PIN 1. Fixed: j22 (break), j88 (dot), t80s (pocket),
t70s (sliver), t65s (break). t81s: the GAP spot (904-912,1130-1134) closes, the V (909-912,1168-1170) stays
light, so it stays a wedge. j29 and j49 unchanged. K1490 sites j14 j15 j47 j59 j95 t4s t23e t43s gain ink
(their outline joins close further) and stay faulted.

**Numbers (start vs tip, link A, built previews).** 82 sites move 10 px or more; by my eyes on the 4x tiles
every one gains ink toward a closed outline (`mov_1..7.png`); the small losses at j67, t68s and j100 match
two-load control flips of one build (start vs w0, u0, v0: the same 3-7 px). Reference oracle (eval.ts GfEval
via `s18/eval18.mjs`, `s18/score18.py`, HI 95): 2592 px toward the reference, 33 away; two captures of one
build score 19-21 away. `count13.py --specks` vs start: 0 new. Fill look 0 px. `hold.mjs` 60/60;
panelopen ran first; dragcheck_b PASS (0 px at 0 / 0.5 / 1.2 / 0.14), dragcheck (fill) PASS (0 px).
`npm test` green (256 files, 3190 tests).

**fl 0 / 1.2.** Three ordinary crossings away from any joint, oA 2325:1320, oB 2330:1395, oC 2070:1515
(cut endings visible in the tiles): 0 px at both fades (`ord_fl0.png`, `ord_fl1.2.png`). Whole frame, start vs
tip: fl 0 gains 1684 px, loses 0; fl 1.2 gains 29204, loses 1 (two loads of the tip build: 0; of the start
build: 430 / 456). At fl 1.2 the reach is larger, so many more joint-arm sides take the short cut, and a
flagged side fades over 0.3 sc.y instead of 1.2: the outline runs up to the over pass (`fl12_top.png`: three
largest clusters, 97-116 px each). This is the s15 rule's behaviour at a large fade, now on more crossings;
whether the short cut should scale with `fl` is open.

**Step 2, per site (from `eval_red.txt` / `eval_y130*.txt` and the slot dumps).** djC = the crossing
centre's arc to an under-chain joint vertex, dj = the nearest slot's.
- j22 (djC 0.98, dj 0.00), j88 (0.97, 0.12), t80s (1.00, 0.01), t70s (0.78, 0.01), t81s (0.82, 0.02):
  the under pass is an arm of the fused joint; the full cut's ending erased the arm's outline where it meets
  the joint's. Fixed by the landed rule (t81s only at its GAP spot).
- t65s (under c65, djC 1.36, dj 0.40): the same fact one step further; fixed by the landed rule.
- j29 (c66 / c67, g-1): djC 2.14 / 1.70, dj 0.88 / 1.09. No joint within the cut's reach on either chain,
  so no bake fact tested here tells it from an ordinary crossing. Unfixed.
- j49 (c18's end, g50): fixed only by a third-chain test (a member sample of a third chain near the side's
  outline point; prototypes v4 / v12). Not landed: its broad forms also moved sites far from any joint
  (djC 1.6-2.6) that I could not show to be no worse, and its narrower forms (u18 128: only where the window reaches an under joint vertex; u18 256:
  third-chain arm ENDS only; z260) move j49 by 2 px at most. An over-chain far-member bit (8) also fixes
  t70s, redundant with the landed rule.
Earlier variants' regression sites sit at djC 1.6-2.6: a definition must stay inside about 1.5 arc.

**Step 3 untried:** t81s's V (909-912,1168-1170) and j71.

**Bar** (`STRICT=1 -NoPerfLock`, `-Ref 34ffa004d -Base 0ceddbc54 -Tag k1482s18`, under load): PASS, new 0,
grown 0, gone 0, but only def and muse_hash judged: g41_user_tw64 (ref never froze on 0d51331b) and ring (base
never froze on 50dd4ffd) were skipped by K1519's freeze rule. Output `.claude/probes/K1436/out/bar/k1482s18/`.

**Confirmed on screen:** 34ffa004d (tip preview, every mover and class site, `mov_*`, `cls_*`,
`ord_*`, `fl12_top`); the u2 prototype it equals (0 sites over 10 px, tip vs u2).

**Tools.** `s18/run18.ps1` (cap border + fill, hold, panelopen, both dragchecks), `cap18.ps1`, `eval18.mjs`
(the reference oracle on a point file, DEV server), `score18.py` (per-pixel toward/away score of two captures
against the oracle), `flctl18.py`, `flmap18.py`, `flwin18.py` (the fl check); sheets in
`.claude/probes/K1482/out/s18/sheets/`.

**Next.** j29 needs a fact this rule cannot see (no joint within reach): look at the pixel's terms in the
shader (another chain's outline? the fill?) before a bake rule. j49: a third-chain test confined to ~1.5 arc.
t81s's V and j71 as the brief's step 3. Levi: whether the short cut at a flagged side should scale with `fl`.
