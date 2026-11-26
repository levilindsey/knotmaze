# Gate: when rp=gf becomes the default

Written 2026-11-25 for Levi (a proposal, not yet approved). Today three renderers run: today's look (the
default), `rp=outline` (K1240) and `rp=gf` (K1362, the GPU field). All look work since 2026-11-12 went into
gf. This page lists what must be true before gf replaces today's look, in the order to work on it, and what
stops once you adopt it. Cull candidates for the ledger are in `.claude/probes/gf-gate/cull.md`.

**How it relates to K1310 and `K1240_gate.md`.** That gate (approved 2026-11-11) was for rp=outline. Its
speed line (3 ms a def frame in the worker) was never approached (183-193 ms, K1247), and the route moved to
gf. This gate replaces it. It keeps three parts: the stage rules (end of this page), the Pixel render-sync
line (gate 3), and "today's look stays byte-identical until the flip". K1310 closes once this gate is adopted.

**Observed** means measured or seen, with the item that holds the number. **Inferred** means a cause someone
reasoned about but has not tested.

## The gates, in working order

Size: S = one stage, M = two to four, L = open-ended until the cause is found.

**1. Thread look and section colours are like for like (S).** Items: K1389, K1400, K1402.
- Must be true: gf draws the `tlk` thread looks and the section colours as today's look does, so every later
  A/B compares the same picture. Test: K1389's colour-table check on the desktop, then its Pixel run.
- Observed: before K1389, gf ignored the border look and the section colours, so earlier phone A/Bs compared
  different pictures. Stage 2 (colour table, 38b73e87) merged. The Pixel run and a look-form path in the
  K1362 bench are still open.

**2. First visit: cold load, fresh profiles (L).** Items: K1456, K1468, K1452, K1380, K1565, and the open
half of K1600.
- Must be true: on a fresh Chrome profile, gf's full look replaces today's within a set time (proposed: 30 s
  on the desktop with the machine idle), the GPU process is not restarted, and the swap is one clean step.
  The Pixel's first-frame compile is measured (K1380) and meets the same bar.
- Observed now: a cold load swapped to gf at 115.3 s (1bf4c77) and 116.9 s (3fdf4f4), under load. It took
  33.9 s (f26a651) when only `gf_look.ts` had changed. After K1468's fix merged (one target per program
  and a no-loop guard), a 245 s cold watch of live 1bf4c77 lost no context, and neither did three more cold
  loads of 66 s each (2026-11-20). Before the fix, three live builds hung the GPU for 50-70 s on a cold profile
  until Chrome killed it. Muse 26J cut the gating compile from 21.4 to 14.4 s.
  The three corner loops cost 14.7 s of the largest program's ~50 s (K1565). On new profiles all four K1600
  builds failed a drag check, the control included (prep died, context lost), while a warm profile passed.
  Today's look stays usable meanwhile (K1384: +222 ms worst frame). The Pixel's first frame has not been
  measured.
- Inferred: one program's FXC compile bounds the wait, and Chrome caches per program (hence 34 s when one file
  changed). The fresh-profile context loss is a cold cache plus GPU load from other Chromes (not confirmed).
- Untried levers (K1456): defer today's programs, split gf_split's two passes into two programs, a cold A/B of
  955de39d.

**3. Phone drag rate (L).** Items: K1369, K1386, K1393, K1376, K1430, K1471, K1367 (dpr call).
- Must be true: during a drag on the Pixel, sim/wall under gf is no more than 10% below today's look's. The
  K1240 gate's render-sync line also holds: `k539_g31.mjs` (`QHEAD=rp=gf`, ITER 60, ABBA) on dense, max
  fabric and knot gs 24 is at most today's + 10% (today 110 / 283 / 31 ms). `exact.mjs` reads 0 wrong values
  on the Pixel (K1471).
- Observed now: sim/wall 0.29-0.32 under gf against 0.62-0.71 for today's look (K1369). A gf build takes
  22.7 ms in the worker (tables 20.0 ms), so one worker caps at about 44 builds a second (K1386). On the
  Pixel the GPU idles; the CPU limits the rate.
- Inferred: the levers are a cheaper table build, or builds round-robined across two workers on idle cores
  (K1386), and the snapshot channel through the reveal (K1390-K1392). K1369 stage 5 is not launched.

**4. Overlays draw right under gf (M).** Items: K1387, K1385, K1424, K1425, K1447, K1537, K1538.
- Must be true: everything that hides at an under-crossing in today's look hides under gf too (reveal sparks,
  telegraph rim ends, burn sparks, the yarn, underClipBand, joinery). Route bands meet K1424's bar (IoU 0.7,
  now 0.366). The border look's pulse mask meets 0.8 (now 0.61-0.80, K1447).
- Observed: under gf the lean underWindows are empty, so none of those hide (K1387; the ledger calls it
  "needed before rp=gf default-on"). Stage 2 (lazy march, e12eba40) merged; its Pixel ABBA is pending.
  Pulses and the telegraph draw under gf (K1473, bc615b6ae).

**5. Reveal (M).** Items: K1472, K1469, K1459, K1395, K1431, K1397.
- Must be true: on Levi's link (`?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1`) and the reveal modes, gf's reveal draws
  every thread run today's draws (K1459's per-thread bar), with the colours Levi wants (question 2).
- Observed: gf no longer takes over in the middle of a reveal (K1472 s3, b42aa13f). Differences 1, 2, 4 and 5
  against today's reveal are open. gf draws the widths and fronts but not the burn tint, rainbow stripes,
  materialize alpha or the white bulb (K1395). The ink count is 1.10-1.31x today's (bar 15%, K1431). K1472 is
  paused behind gate 2.

**6. Highlights and the home build (M).** Items: K1451, K1523, K1462, K1582, K1443, K1489.
- Must be true: K1523 decides whether the home build lands (`gfh=1`'s page builds without it today). The fade
  slider has no dead zone (now one hard cut below fadeLength ~0.066, K1451). No cfg dashes at a ramp (90
  finds, K1462).
- Observed: the home build is parked on `worktree-agent-ad03e8b65a2afa540` (67d8d743, bar FAIL new 10, gone
  7); master took link A from 36 faulted to 22 without it.

**7. The look: Levi's named places, then his review (M).** Items: K1584 (stage 12 running), K1604 (stage 1
running), K1585, K1586, K1587, K1602, K1608, K1613, K1614, K1525, K1583, K1482.
- Must be true: every place Levi has named is fixed or he has accepted it, and he marks no place on the K1583
  review page, republished after K1584 to K1586 land. The K1436 STRICT bar shows no new or grown find against
  the approved base. Your approved look is the bar (Levi, 2026-11-15), not a census number.
- Observed: K1482's sweep of link A went from 327 sites to 46 faulted. The gaps (K1584, f915561ca and
  c2d628e03) and the junction rule (K1588, 140abd573) landed. The review page stopped at A_3 b1.

**8. Checks green on warm and fresh profiles (S).** Items: K1600, K1436, K1457.
- Must be true: `npm test`, the guards (panelopen, dragcheck_b, dragcheck), the K1450 hold guard and the K1436
  bar all pass on a warm profile, and on a fresh one once gate 2 holds.
- Observed: K1600's landing role is overtaken (K1584 and K1588 landed). What is left, the fresh-profile
  failure, is gate 2's.

**9. The flip (S).** Make `rp=gf` the default (with `gfh=1` if K1523 lands). Today's look stays as the stand-in
while gf compiles and as the fallback when it cannot attach. Re-freeze the pins it moves, and name what moved in
the commit. Links need no old-link path (pre-launch, no back-compat).

## What stops once you adopt this

- No stage for a kind of place you have not named: no new sweeps of link A for new fault classes, and no
  census-number work (K1437, K1442, K1412, K1409) unless the fault shows at a named place.
- Every stage names the gate line it moves and reports that number before and after. A stage that moves no
  gate line does not merge. Same rule as K1240_gate.md.
- No look stage on rp=outline (frozen, see below), and none on today's look beyond what its role as the stand-in
  needs.
- The two-stage stop still applies to every look fix.

## rp=outline: recommendation

**What outline has that gf lacks.**
- Your 2026-11-11 verdict: "looks a little better for most cases", with "plenty of unacceptable artifacts".
  Its census read 17 finds against gf's 301 on 2026-11-12, but that census measured against form B and was
  retired as the bar on 2026-11-15.
- It does no per-pixel shader work. Inferred: a shorter first-visit wait (not measured).
- K1315's ends bar, which you named.

**What gf has that outline lacks.**
- Every look decision since 2026-11-12: the junction rule, crossing gaps, the ball, corners, and its own border
  look (K1455).
- The app palette, `tlk` looks (K1465), trail, fog, reveal masks, pulses, telegraph and gameplay paint. Outline
  hides those or ignores them (K1291).
- Speed. Outline's worker frame is 117-193 ms against a 3 ms bar, and its pool made drag latency worse (250-340
  against 103-134 ms, K1247). gf's table build is about 15-18 ms on the desktop.

**Recommendation: retire it.** Freeze it now, with no stages, and close its items (cull group c). After the
flip, delete `src/render/outline/` (about 17,000 lines), its 12 test files, and the `rp=outline`, `oe`, `ob` and
`obt` flags. K1359 becomes that delete. Nothing outside it imports it except one dynamic import in
`frame_loop.ts` (observed). Reasons:
- gf already holds the look you approved.
- Outline's speed gap is two orders of magnitude.
- Keeping a third renderer alive costs every look change a third check.

Carry K1315's ends bar over to gf as a check rather than drop it.

## Questions only you can answer

1. **First visit.** A fresh visitor sees today's look for about two minutes (desktop, under load) before gf
   swaps in. Is that acceptable at the flip, or must it come down to a set time first (proposed 30 s)? Should
   the swap be invisible?
2. **Reveal colours.** gf's reveal draws the widths and fronts, but not the burn tint, rainbow stripes or white
   bulb (sheets `.claude/probes/K1383/out/b_J_*_sheet.png`). Must gf carry them before the flip, or is the
   plain reveal acceptable?
3. **Phone first, or desktop first?** On the Pixel, gf drags at about half today's rate (gate 3, size L). Should
   the flip wait for the phone, or go ahead on desktops first, with the phone kept on today's look until gate 3
   holds?
