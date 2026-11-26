# K1584 stage 7: two gaps that are not at a crossing (K1601 loops, K1595 stems)

Base: this worktree's HEAD (stage 6; its ball wedge stays as is, do not tune it: another agent is making
wedge variants on branch `k1584-wedge`). Read first, in full: `K1601_findings.md` on branch `k1584-s7`
(`git show k1584-s7:docs/design/K1601_findings.md`) and `K1595_findings.md` on branch `k1595-diag`
(`git show k1595-diag:docs/design/K1595_findings.md`); their probe tools are in the worktrees
`.claude/worktrees/k1584-s7/.claude/probes/K1601/` and `.claude/worktrees/k1595-diag/.claude/probes/K1595/`.

## Levi (2026-11-24)

- Shown 15 small loops and hooks, today | stage 5: A_b x75, A_8 x65, A_5 x277 are wrong, the other twelve
  right. "The wrong cases all add an extra gap in the middle of a sharply turning border that isn't actually
  at a crossing".
- Shown seven stems beside junctions (A_a 1600,1619; A_c 1585,1359; A_6 1362,1615; A_5 1270,747;
  A_b 1370,554; A_6 1269,326; A_d 2199,952), today | stage 4 | stage 5: "the first column is correct in all
  cases and the other columns are broken". The bar there is today's look.

## This stage

Both diagnosed rules in `src/render/gpu_field/` with CPU mirror and tests, nothing else:
1. Rule K (K1601 findings Q4): a border with no end of its own whose room is at least its own cut (or fade
   start) + fade + 0.12 keeps stage 4's behaviour (room scaling, end at its room, window limited as Q4 says).
2. The corner rule (K1595 findings Q4): a crossing's gap on a border stops where that border reaches a
   junction corner shared by the crossing's own two threads (tangent point minus about one arc step).
The rules are the diagnosers' proposals, tested on a CPU copy only: the goal is Levi's look, so where a rule
does not give it on the GPU, change the rule and say so.

Done:
1. Both rules in src with mirror and tests; `npm test` green; name every pin you re-freeze.
2. Capture of all 21 mazes (tag `s7a`, stage 6's recipe, under the perf lock).
3. The three wrong loops lose the extra cut; the twelve right ones (A_3 x49, D_9 x264, A_6 x119, A_3 x102,
   A_c x75, A_3 x192, A_7 x81, A_d x241, A_c x102, A_7 x158, A_4 x343, A_4 x5) are pixel-identical to stage 6.
   Sheet today | stage 5 | stage 7 of all 15.
4. The seven stems inside their rings read as today (the stem joined to the cup, no cut). Sheet
   today | stage 4 | stage 5 | stage 7. Separately report, without changing it: the short gap stage 4 opens at
   the stem's far end (a real crossing 0.8-0.9 arc from the junction) at A_a, A_c, A_5, A_b; show it on its
   own sheet with today beside it. Levi decides that one.
5. Stage 6 against stage 7, every changed place on all 21 mazes listed, boxed and viewed by you (expected: 44
   crossings from rule K, 50-odd corners from the corner rule): each is one of the two faults going away, or
   a defect you report. The teardrop loops with a junction at the neck (A_b k45, A_9 k0, A_5 k113, A_c k17,
   A_3 k103, D_6 k357, A_5 k0, A_a k101) are in both lanes: a row each, today | stage 4 | stage 5 | stage 7.
6. One `screen.py` run, stage 6 against stage 7: closed sides and loose pieces (on-screen counts only).
7. A_3 x100 (K1586) as its own row; do not tune to it.

Bindings: every under-thread border at a real crossing shows a gap, as much as fits beside a junction; the
under pass keeps its width and heading; never remove a thread's border; stage 4's angled cut ends stay;
`fadeLength` stays live with no table rebuild; prefer `gf_look.ts` (leave `eval.ts`, `gf_glsl.ts` rule code
alone: K1588 owns it).

## How to work

- This worktree and branch, from HEAD: no reset, rebase or merge. `Get-Date` first. Ports 5630 to 5639.
- Perf lock through `scripts/perf_lock.ps1` only; others hold it in turn: mirror work first, then wait inside
  one blocking command.
- PowerShell. Read code through the shell; the Read tool just before an Edit and for images.
- Commit WIP at every milestone (`git add -f` for probe tools under `.claude/probes/K1584/s7/`, never
  outputs). Never push, never bare `git stash`, never edit LEDGER.md, never touch the phone, no
  `--virtual-time-budget`. Helpers on sonnet, mechanical work only, with this stop rule. View every place
  you report.

## Stop rule

Stop when every Done holds or after 2 h of wall clock (`Get-Date` at each milestone), whichever comes first.
A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`## Handoff (stage 7)` here, commit, and report: what holds and what does not (numbers), sheet paths, the
counts, a `Ledger items` list and K1584's handle fields.
## Handoff (stage 7)

Stage 7 agent, 17:05 to 18:50 on 2026-11-24 (stopped at the 2 h cap). Branch `worktree-agent-a2dfb242b056cf793`.

**Done item 1: done.** The src commit is 04eeb1b69. It holds both rules, their CPU mirror and tests, and `npm test` passed: 3247 tests (`.claude/probes/K1584/s7/out/npmtest.txt`).
- Rule K is in `gapWindow`. A border with no end of its own, whose room lies past g0 + fade + GAP_END_PAD, ends at its room less the pad. That side's window is min(w, max(kw, ke)).
- The corner rule is in the bake's slot loop (`jointPartners` from `gfJointArcs`, passed by `gf_app.ts` as `gwJp`). From the nearest pair corner on, each side's slots carry `GAP_FAR_OFF` (the right code's 1024 bit). The shader's far term is off there, and its loop term is untouched.
- **The rule changed from the brief's diagnosis.** Form (a), which closed the codes, also shrank the loop term's cut, and it moved two right loops: A_3 x49 and A_d x241. Form (b), which turns off only the far term, leaves both pixel-identical in the mirror.
- **Re-frozen pin** (`test/render/gf_gap.test.ts`): `int pkR = int(fract(sl.x) * 4096.0 + 0.5);` (was 2048). A flag at /2048 broke the chain decode.
- **New pins:** `fo = pkR >= 1024; pkR -= fo ? 1024 : 0;` and `if (!fo) g = max(g, jf ? lkCut(N.x, sinT, exg, wm, pxw, sc) : cN);`.
- **New tests:** "K1584 s7 corner rule" and "K1584 s7 rule K".

**Mirror (CPU, on s6a's geometry, s6 against s7; `pxdiff.ts` + `pxsum.py`, `out/pxsum.txt`)**
- Rule K: 19 places, 598 px in 9 mazes. 559 px of ink come back and 39 px go: the only place that loses ink is A_8 x304 (c77 under o86, about 2318,614).
- Rule C: 37 places, 578 px in 16 mazes, all ink coming back.
- Wrong loops, all three change: A_b x75 46 px; A_8 x65 31 + 1 px; A_5 x277 11 + 5 px.
- Right loops: 0 of 12 change. In the tables, A_3 x49 and A_d x241 take the corner flag but draw the same.
- Stems: 7 of 7 change. A_a 76, A_c 36, A_5 10, A_b 52, A_6 (1269,326) 80, A_d 34 px. A_6 (1362,1615) changes 11 px, which `pxdet.ts` finds and pxsum's place box misses.
- In the tables (`tabsum.py`, `out/tabsum.txt`), rule K fires at 67 crossings in 17 mazes and rule C at 378 crossings in 21 mazes. The wrong loops and A_3 x100 (K1586) take both rules.
- **Against the brief:** the brief expected 44 changed crossings from rule K and 50-odd changed corners. The mirror changes pixels at 19 K places and 37 C places. Not yet explained.

**Done items 2 to 6: NOT done.** No s7a capture exists, so there are no sheets of s7, no framediff and no screen run.
- **What the capture showed** (observed, the build 04eeb1b69 checked as the one served):
  - The perf lock came at 18:30, after waiting 18:07 to 18:30. The run used stage 6's recipe: three streams, profiles `s1/profile1-3`, pinned views.
  - Each stream's first maze (A_3, A_4, A_7) had no gf frame after 240 s ("switchedMs/composites never ready").
  - The second mazes (A_5, A_6, A_a) had their first gf frame at 225, 227 and 231 s. Each physics hash missed its pin (A_5 06bf1995 against c79a38dc), so each reloaded at about 18:38.
  - At 18:39:41 the GPU processes of all three probe browsers were replaced in the same second and then used about 1.5 cores each. The System log has no display or TDR event.
  - Nothing came back by 18:43. I stopped the streams; the preview stopped and the lock released at 18:43:51.
  - Stage 6's s6a capture used the same tool, profiles and streams. Its gf frame came at 72 to 80 s, and the hash matched on the first try.
- **Inferred, not tested:** gf starts about 3x slower on the s7 build, or the machine was in a bad state. The shader diff is three lines: the decode at 4096, the `fo` flag, and `if (!fo)` around the far term. The bake's added work is constant per slot. A shader compile cost from the new branch is one candidate. The GPU processes all restarting in the same second points at a GPU-side hang or watchdog instead.
- **Test first:** one stream, one maze, one load each of the s6 build (7f8701166) and the s7 build (04eeb1b69) on a fresh profile. Report `__knotGf.stats` (switchedMs, passes, compileWorker), the time to the first gf frame, and context losses. If s7 is the slow one, A/B the `if (!fo)` branch against a branch-free form, `g = max(g, (fo ? 0.0 : 1.0) * (...))`.
- `cap7.ps1` is fixed for the next run: it checks 7 characters of the SHA across the page's scripts. The 9-character `--short` check threw on the first lock hold, at 18:06.

**Item 4's far-end gap (for Levi; nothing changed).** At A_a, A_c, A_5 and A_b, stage 4 opens a short gap at the stem's far end. A real crossing 0.8 to 0.9 arc from the junction has a loop-term window that opens the cup side to +0.24 (A_a, A_5), +0.31 (A_c) and +0.42 (A_b) arc. The stem then reads as detached: +125, +176, +70 and +113 px against today. Sheet (viewed): `out/farend_pre.png`, today | s4 | s5 | s6 | diff today to s4.

**A_8 x304, the one place where rule K takes ink.** Before s7 (viewed: `out/a8x304_pre.png`, today | s4 | s5 | s6), the box sits where two outline strokes merge, and nothing differs from today through s6 there. Whether s7's 39 px open a slit there, or remove a border (which would break a binding), needs the s7a capture.

**After the capture lands:** `pwsh -NoProfile -File .claude/probes/K1584/s7/post7.ps1` runs everything CPU-side in one go:
- the view check;
- `fdall.ps1` and `chgplaces.py 1 6`, which give the right loops' identity, the wrong loops and stems by pixel, and every changed place matched to a mirror place (unmatched ones are listed);
- the sheets `loops7.png`, `stems7.png`, `farend7.png`, `tear7.png`, `a3x100.png`, `a8x304.png` and `chg_<n>.png`;
- `an7.ps1`, the screen run against s6a (closed sides 132; loose pieces 501/15/43/1371).

Capture command (under the lock):
`pwsh -NoProfile -File scripts/perf_lock.ps1 -Owner '<who>' -What 's7a captures' -Cmd "& '<wt>\.claude\probes\K1584\s7\cap7.ps1' -Ref 04eeb1b69c8deca1f5cbb0e07038a95301cddc6a -Port 5631 -Tag s7a"`
