# K1482 stage 21: finish the 14 wedges and notches on top of fix3 (Claude agent stage)

Levi, 2026-11-19, on K1490: **"Fix the wedges and notches, accept the slivers."** Stage 20 built fix3 (a second
corner try with longer arms, ink only) and did not land it. Read `### Handoff K1482 s20` in
`docs/design/K1482_s20_wedges_notches.md` whole, then that brief's `The sites` and `How to work`: both hold
here with `s21` for `s20`. Link A is `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (hash fff8c9e5).

The goal is Levi's approved look: at each of the 14 sites the two outlines meet in one clean rounded or mitred
corner, with no solid dark patch, no square or stepped cut, no tick. You own the technique.

## Where it stands

- fix3 is three WIP commits on branch `worktree-agent-a0f22901bb5fca4a4` (142179c03, 0e0dbc36f, 37eda49e8; not
  on master, not pushed). Start by cherry-picking them onto your branch; your work goes on top.
- Stage 20's tools and captures are untracked in its worktree,
  `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a0f22901bb5fca4a4\.claude\probes\K1482\s20` and
  `...\out\s20` (site pixels: `out\s20\raw\fix3\sites_gf.json`). Copy what you use into your own
  `.claude/probes/K1482/s21`; change nothing there.
- Two of its previews still run and are yours now (stop them when you finish): port 6010 is the start build
  (master's `src/`), port 6012 is fix3. Your own builds take ports 6013-6029, profiles `$env:TEMP\k1482s21-*`.
- The coordinator's own look at today | fix3 with the surrounding threads in view
  (`C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1524\out\k1524_named.png`, made by `card.py` beside it):
  only **j14** reads as finished. Left over at the sites stage 20 counted as improved: t58e the second V, t81s
  the tick at the top, t4s the step at the bottom, j47 the dark stub at the left, j15 the Z spike at the right,
  j4 hardly moves. Partial: t23e, j59. Unchanged: j50, t59s, t84e, j41, t45s. So 13 sites are open.

## Do

1. Stage 20's two causes, each fixed where it is made: (a) pass 0 keeps a corner with a tiny positive r, so no
   retry runs and the tiny corner draws the fault (t59s, j41): replace it without moving t43s's coverage; (b)
   the retry's extension starts from a negative Lcut and stays short (t84e, t45s, j59, t23e): measure the
   extension from the arm's true end. Then j50's cause, then each leftover above to its terms before a fix.
2. Judge every one of the 14 against the goal, not against fix3, in a context crop and a detail crop.
3. **fix3 also rounds about 27 sharp corners Levi did not name; whether that is welcome waits on him (K1524).**
   Until he answers: do not land, and add no new changed place beyond fix3's (name any you add, with a crop).
   If you meet a rule that holds the change to the 14 at no cost to them, keep it as a patch with its numbers:
   it is the fix for a "keep the sharp corners" answer. Do not spend the stage searching for one.
4. Commit WIP on your branch at every milestone. A fix that fails Done is kept as a patch in your probe
   directory, not in `src/`. The coordinator will message you if Levi answers while you run.

## Done

- The class table on your tip, by your own eyes at 4x or more and in context: each of the 14 named finished,
  better with its leftover named, or unchanged. The 5 slivers, j29, j49 and j64 not worse (mirror numbers as
  stage 20's), `count13.py --specks` against the start build 0 new.
- Sheets in `card.py`'s layout (context with the red box, then the box closer), columns today | fix3 | your
  tip: all 14 sites, and every other place your tip moves beyond fix3.
- The capture pins the background clock, so two loads of one build differ by 0 px in the fill look (stage 20's
  `cap20.ps1` does not: 72,965 px between two loads of the start build). Then fill look 0 px, your tip against
  the start build, on built previews.
- On your tip, in the last 30 minutes: `hold.mjs` 60/60 on link A; `.claude/probes/K1482/s15/panelopen.mjs`,
  then both dragchecks pass; `npm test` green; the K1436 bar once, `STRICT=1 -NoPerfLock`, on
  `ring,def,muse_hash,g41_user_tw64`, `-Base` the start build's commit, `-Tag k1482s21`: no new find, none
  grown. A check you could not run is named as not run, with why.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock from the end of your first lock wait
(`Get-Date` at each milestone), whichever comes first; keep the last 30 minutes for the checks. Timing checks
need `$env:TEMP\claude-perf.lock` (Muse holds it often: wait in ONE blocking loop, 60 min at most); look
captures do not. Do not stop early while a site is untried and time remains. A compaction is not a stop:
re-read this brief and `git log`. On stopping: commit WIP, append `### Handoff K1482 s21` here, commit, and
report: the class table, the sheets' absolute paths (each site named), the numbers, a `Ledger items` list and
K1482's handle fields. Never push, never edit `LEDGER.md`.

### Handoff K1482 s21

(agent afdf2b8b, 2026-11-19 10:47 to 12:20 PST; branch `worktree-agent-afdf2b8bb494bb380`, never pushed.)

**Result: no site fixed beyond fix3, and fix3 fails the K1436 bar.** The tip's src is fix3's
(`git diff a9985b1d3 HEAD -- src test` is empty). Every knob tried this stage failed Done and is kept as a patch in
`.claude/probes/K1482/s21/`. Notes, numbers and tools are in `.claude/probes/K1482/s21/notes.md`. Captures, mirrors,
crops and sheets are in `.claude/probes/K1482/out/s21/` (the sheets and crops are committed; `raw/` and `mir/` are not).

**Class table** (the tip = fix3; judged by my eyes on 4x box crops and in context, `out/s21/sheet_wedge.png`,
`sheet_notch.png`, columns today | fix3 | tip, tip == fix3 at every row):

| site | class | on the tip | leftover, traced to its terms |
|---|---|---|---|
| j14 | notch | finished | - |
| t23e | wedge | better | dark patch at the left: the two outlines of chain 23's end still run together |
| j59 | notch | better | a step at the top of the inner leg: j59 a2/b0's retry r is 0.02h (the arms past the cut are too short) |
| j15 | wedge | unchanged where named | Z spike at the right: the +1 side terms of chains 70 and 5 converge with no corner within 30 px (fix3 rounded only the bottom-centre corner) |
| j50 | wedge | unchanged | arm a0 (chain 71) is cut 0.27 units out by chain 71's own other pass. The retry ball k250 (r 0.67h) rounds past that crossing, so the crossing pass's +1 outline runs through the ball. Burial covers only rq > kR, which leaves a "<" sliver of paper |
| t59s | wedge | unchanged | one chain's +1 and -1 outlines converge at a twist's foot. No corner exists there |
| t81s | wedge | top tick remains (fix3 rounded the bottom corner) | chain 81's -1 outline starts at a crossing cut, under chain 9's -1 outline at a shallow angle. The cut's square end pokes out (s13's lkGap class, not a corner) |
| t84e | wedge | unchanged | j139 a0/b1: pass 1 is null (the extension from the cut is too short for a ball) |
| j4 | notch | unchanged to the eye | retry corners a1/b2 and a2/b0 at r 0.30h / 0.26h (intruded by chain 82, the crossing that cut the arms): too small to show |
| j41 | notch | unchanged | sharp ">" on the right outline: pass 0 keeps a0/b1 at r 0.26h, so there is no retry. Retrying it (KRMIN) changes nothing visible |
| j47 | notch | unchanged | the "dark stub" is the acute corner k248 (a2/b0, c17/64). The retry gives r 0.001h, so chain 64's +1 outline and the arc meet in a solid ">" |
| t4s | notch | unchanged | a step at the bottom right: a vertex term (chains 4/66) with chain 66's -1 and chain 50's +1 sides |
| t45s | notch | unchanged | j99: pass 1 is null; the stub end at the top right stays |
| t58e | notch | first V rounded, second V remains | chain 68's +1 meets chain 58's -1 after arc k212 (r 0.166h, ext 1) |

**Knobs tried and rejected.** At their defaults, the mirror equals fix3 with 0 moved.
- **GF_KRMIN** (`s21_knobs.patch`): pass 1 also retries a pass-0 corner under KRMIN h, and keeps the small corner
  as a coverage-only copy (ext 3), so coverage moved at 0 sites. KRMIN 0.3 moves 75 sites, makes t59s worse and
  leaves j41 unchanged; KRMIN 0.6 moves 79.
- **GF_KFROM=end** (same patch): measures the extension from the arm's true end. Retry corners form at t45s, j50 and
  t84e, but they are too small to show. 36 other windows move.
- **GF_KCLR** (`s21_knobs_clr.patch`): drops a retry ball whose clearance to its junction's other arms is negative.
  That is 8 of 165 balls, none of them among the 14. It returns t34e, j81, t21s and j9 exactly to the start build's
  look, and t43e and j97 partly. On the K1436 bar (probe branch `k1482s21-kclr`, 7b2b22e99, `-Tag k1482s21kclr`) it finds the same 10 as fix3: none of the bar finds sits at one of the 8 balls KCLR drops.
- **GF_KCLRA** (`s21_clra_probe.patch`): measures clearance to every chain's whole polyline. 68 of 165 balls are
  intruded by more than 0.25h, mostly by the thread whose crossing cut the arm. Applied as a rule, it moves 111
  windows.
- **GF_KX2** (`s21_kx2.patch`): a pass 2 on arms extended KX2 h past the cut, used when pass 1's r < 0.1h (35 of
  165). KX2 3 moves 75 sites and KX2 5 moves 66. t58e gets worse, j15's Z becomes a solid wedge, j50 gets a new dark
  triangle, and j47, j4 and t84e are unchanged.

**Numbers.**
- **Mirror, protected sites** (start vs tip, px with |d| > 0.05): j71 35, j95 25, t43s 17, t56s 25, j64 19, j29 6,
  j147 0, j49 0. These match stage 20's numbers. The tip moves 0 sites against fix3.
- **Fill look, tip vs start build:** 0 px. Six captures agree at 0 px: start, start3, tip, tip_force2, tipc1 and
  tipc2.
- **The 76,609 px fill difference.** start2 and fix3 agree with each other but differ from that group by 76,609 px.
  The difference sits on antialiased edges and in soft shadows (`out/s21/sd_sheet.png`): a sub-pixel edge shift
  between loads.
  - It is not the reload after a hash miss: tip_force2 reloaded twice and still matches.
  - It is not concurrent GPU use: tipc1 and tipc2 ran together and both match.
  - It is not the background: a load without bgs=0 also differs on edges, and the fill frame shows no background.
  - Inferred, not tested: a per-page view state, such as the eased camera's sub-pixel offset.
- **Border look:** tip vs start 8,247 px > 8; fix3 vs start2 7,918 px. 7,725 px are in both (fix3's change).
- **`count13.py --specks`:** tip vs start finds 1 new speck, a single pixel at (1692,336), 93 px from j130. Two loads
  of the start build alone find the same pixel (it sits at 72-74 against a threshold of 73), so it is load noise.
  Tip vs start2: 0 new.

**Checks on the tip (src = a9985b1d3).** I ran them early, from 11:23, because every knob had failed and every
leftover had been traced to its terms.
- `hold.mjs` on link A: 60/60 PASS.
- `panelopen.mjs`: 1.
- `dragcheck_b`: PASS (5 / 9 / 4 px).
- `dragcheck`: PASS (99 / 131 / 60 px).
- These ran under the perf lock, 11:23 to 11:32 (log: `out/s21/raw/checks_tip.log`).
- `npm test`: green (3190 passed, 18 skipped).
- **K1436 bar** (`STRICT=1 -NoPerfLock`, `-Ref a9985b1d3 -Base ccd63bcde`, ring,def,muse_hash,g41_user_tw64,
  `-Tag k1482s21`): **FAIL, new 10, grown 0** (`.claude/probes/K1436/out/bar/k1482s21/`). Stage 20 never ran the bar
  on fix3, so these are fix3's own finds:
  - def: 5 dstray, where sharp V mitres became arcs.
  - g41_user_tw64: 2 vdip, 29 px and 9 px. The retry ball's arc cuts across a sharp fill corner, and the corner's
    tip loses its outline (fix3 is ink-only, so the fill stays sharp). See `out/s21/bar_rows67.png`.
  - muse_hash: 3 (rstray 43 px plus its screen twin at j64, vdip 9 px).
  - Stage 20's "bare 0 at all 165 retry corners" holds on link A only.
- Not repeated in the last 30 minutes: they ran at 11:23 to 11:56 on a9985b1d3, and the stage ends on that same src. No check was skipped.

**Next.**
1. K1524 decides first. fix3 fails the bar in other scenes, so it cannot land as it is, whatever Levi decides about
   the ~27 unnamed roundings. A fix3 successor has to keep the outline on the fill: for example, cap the ball so its
   arc stays inside the fill's corner, or round the fill too.
2. The 13 leftovers split three ways:
   - **A ball that a crossing thread runs through, or arms past the cut too short for a ball** (j50, j4, j47, t84e,
     j59, t45s). The ball needs the crossing pass's near outline as a third bound, not longer arms (KFROM and KX2
     showed that). Write a design doc before code.
   - **An outline cut by a crossing at a shallow angle to another outline** (t81s's tick, probably t4s's step). This
     is s13's lkGap class: clip the cut to the other outline. It is not the corner solver's job.
   - **Convergence with no corner at all** (t59s's twist foot; j15's Z, t58e's second V and t23e's patch between two
     chains' sides). This would need a new corner kind, a side-side fillet. Levi's call whether it is in scope.
