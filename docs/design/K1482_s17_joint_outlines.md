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

### Handoff K1482 s17

Stopped at 2:04 AM 2026-11-19 (start 12:22:28 AM). Branch `worktree-agent-a5430e2070cd377bc`, level with
origin/master plus: f69d8ce6e (step 1), 4f18e8434 and b1a2da1d4 (WIP: probes, sheets, class table) and this
handoff (origin/master had not moved, so no rebase: the SHAs are final). Source diff: `gf_look.ts` and
`gf_gap.test.ts`; tables.ts, eval.ts, gf_glsl.ts and gf_app.ts untouched.

**Step 1, the flag's arc end (j158/t73e).** The bake's joint flag ended along the under's arc before the
cut's window did: at link A's crossing 72 under 46, slots k 276-281 (left side) read dM 0.31 <= dN 0.33 < fh,
the nearest non-member being the over's own sample 46:170 just past its membership boundary (46:169), so they
took the full cut and erased the joint's outline at 1638-1640,574-576. f69d8ce6e spreads the flag along each
contiguous run of `near` slots (dM < reach and dM <= dN) that holds a slot flagged by the s15 rule, per side.
Dev A/B (spread on vs off, same hash): 52 clusters of 5 px or more, every one viewed at 6x
(`out/s17/sheets/c_1..6.png`), each closes a gap where a joint outline meets another; none worse. On the
tip's own build (raw/tip against raw/start): j158 and t73e's light pixels are inked (`cls_4.png`,
`cls_6.png`, `cls_z.png`).

**Step 2, the joint's own outlines (j4/t2s).** Named, not fixed. `s17/eval17.mjs` (eval.ts's GfEval at device
pixels of the frozen state; DBG=1 prints the pieces, their surfaces and the vertex cap's pair tests;
`out/s17/eval_j4.txt`): the light line at j4 (1648,231 -> 1652,237 on the capture) lies between two
SEPARATE SURFACES: chain 2 (s 0.03-0.1, joint group 4, fused with chain 68) and chain 82 (s 25.03-25.10,
group -1, a surface of its own). At the crack both pieces sit about +0.011 world outside their outlines, and
neither the vertex cap nor burial applies ("surf differ": both work within one surface only). No outline
stops short and no cut reaches the pixel; each surface's outline is right on its own, and the background
shows through the ~1 px between two near-tangent surfaces at the V. A fix is a cross-surface contact rule
(close a near-tangent pair of different surfaces where their outlines meet) in `gf_glsl.ts` + `eval.ts`,
which touches every near-tangent pair and overlaps K1490 (j4's owner, the sharp V): not attempted. j71 was
not evaluated on its own: the sort finds no cut-made light pixel in its box (`sort_2.png`), consistent with
the same cause, unconfirmed. The step-1 rule closes j4's other seam (1641-1645,229 / 1642-1643,230).

**Step 3, the 8 GAP sites.** Sorted by `s17/sort17.py` (each light pixel coloured by the term that makes it,
from a debug capture: `patch_dbg17.json`, s16's terms decode; `sort_1.png` j22 j29 j49 j88 j4, `sort_2.png`
t65s t70s t80s t81s j71, `sortw_1/2.png` wider) and eval17 at each red cluster (`out/s17/eval_red.txt`).
At every site the light pixels are a CUT that removes field ink on a slot with no flag (jb 0; flags 99, 115,
112: no J, no B), and the over piece at the pixel is NOT a fused-joint member:

| Site | Crossing (over / under) | Membership |
|---|---|---|
| j49 | 75 / 71 | both group -1 (chain 18's end, group 50, beside) |
| t80s | 75 / 75 | over s 49.3 group -1; under s 59.3 group 164 (a member) |
| j29 | 67 / 66 | both -1 |
| t65s | 84 / 64 | both -1 |
| j22 | 64 / 6 | under chain 6 group 24 (ramp 0.004) |
| j88 | 31 / 70 | under group 152 (a member) |
| t81s | 5 / 9 | both -1 |
| t70s | 70 / 5 | over chain 70 holds s 0 group 15 (member) and s 11.4 group -1 (the one at the pixel) |

So none is cause 1 (the flag's arc end needs a member over) or cause 2 (two surfaces, no cut). Their own
cause, one for all eight: the crossing cut's own ending (margin + fade) of a non-member over thread beside a
fused joint's outline; at j22, j88 and t80s the joint is on the UNDER chain, which the slot flag (over
membership only) never reads. This matches s13's sort ("the crossing cut's own ending next to the joint's
outline"). A fix extends the flag to the under-member / non-member-over case, a design change of the kind
s14's v1-v7 variants were judged worse on: not attempted in the time left. t81s's V tip (904-906,1170-1173)
filled under step 1; its GAP spot (904-912,1130-1134) is unchanged.

**Done checks (tip f69d8ce6e on its own build, link A, hash fff8c9e5; raw/start = fcca3855e's build).**
- Class table `out/s17/classes_tip.txt`: 29 -> 27 (wedge 6, notch 8, sliver 6, tick 1, break 3, dot 2,
  stub 0, pocket 1; K1490 17, GAP 8, K1470 1, PIN 1). Fixed: j158 wedge, t73e wedge (one spot).
- Movers (s11/boxdiff, ink 531758 -> 532328): 4 sites over 9 px, 31 over 3, losses at most 4; all viewed at
  4x (`cls_1..6.png`, `mov_1..3.png`) and the spots at 10x (`cls_z.png`, `mov_z.png`): j86/j123 (one spot,
  1500-1505,1006-1009), t1s, j9, j102, j126, j1, j120, t0e, t34s, t51e, j47 and j71 ink 1 px seams between a
  joint's outlines; j148/t68s, j142/t66e, j100, j138, t71e flip end-cap edge pixels +-3/4 (frame noise, as
  in s16). None newly faulted, none worse.
- `count13.py --specks` against the start: 0 new. Fill look 0 px (max 0) between the two builds.
- hold.mjs 60/60 (link A + `&rp=gf`); panelopen, then dragcheck_b PASS and dragcheck PASS (0 px > 24 at each
  stop); `npm test` green (256 files, 3189 tests).
- The K1436 bar (`STRICT=1 -NoPerfLock`, ring,def,muse_hash,g41_user_tw64, -Base fcca3855e -Ref f69d8ce6e,
  -Tag k1482s17): PASS, new 0, grown 0, gone 0; every scene froze on the same hash in both builds (ring
  50dd4ffd, def 910ff135, muse_hash 733ee14a, g41_user_tw64 0d51331b), taken under load
  (`.claude/probes/K1436/out/bar/k1482s17/bar.txt`).

**Confirmed on screen.** f69d8ce6e on its own build (raw/tip against raw/start: the class table, the tiles,
seamfind at j158 and j4), and before that in the dev A/B (c0 vs c1).

**Probe notes.** eval17.mjs needs a DEV server and its page camera differs from the capture's: convert a
capture pixel through world coordinates (toDevA in sites_gf.json and in eval17's first line). Link A froze on
10104c64 in about half the loads: reload until fff8c9e5 (eval17 needed 5). `run17.ps1` runs the Done checks
on one build (cap with the fill frame, hold, panelopen, dragcheck_b, dragcheck).

**Next.** Two causes left in this lane, a stage each: the cross-surface contact at a near-tangent V (j4,
likely j71; with K1490), and the non-member-over cut ending beside a joint (the 8 GAP sites; the under-member
case first), which needs a variant shown on pictures before it lands.
