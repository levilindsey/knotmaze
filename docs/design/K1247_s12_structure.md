# K1247 stage 12: decisions the reduced frame still makes from positions

Ledgers: K1247 (the frame's speed) and K1240 (the redesign). One Claude Opus agent in its own
worktree, on its own branch. Cap 2 h.

## Why

Stage 11 (`docs/design/K1247_s11_tails.md`, its handoff; merged at b6103dd1) clipped the synthesized
cut's search to its window (g41_ring_tw64 cut 273: 8.9 → 1.0 px at eps 0.1) and gave every kept
interval a region. Plain reduction still fails 23 scenes at eps 0.1 (worst 7.103 px) and 26 at 0.2
(worst 10.620 px). Most of what is left is a decision that follows the positions, so the reduced
frame decides differently from the full one. Each one is also a pop in motion.

## Goal

The same as stages 10 and 11: plain reduction at eps 0.1, then 0.2, passes on every scene, scored by
the drawn union. Levi's rule still binds: the structure is decided once, and only positions follow
the frame. No piece that comes and goes, and no decision made from positions. The technique is yours.

Cut 273's new end is a look change that waits on Levi (K1247's ask in the ledger). Keep it as merged.

The places, from stage 11's Next. Re-measure each one first, and take them in this order:
1. **Region numbering and group from structure.**
   - g41_user_tw64 chain 26 has 18 regions reduced and 16 full, with the same cuts. The two extra
     splits sit near the chain's start (s 0.28-0.77, the arcs at corners 137 and 139): station
     activity, or the 1e-9 cS dedupe near the corner tangent stations. Find which, and fix it.
   - `memberGroup` / `memberGroupC` read the group from the cap ramp at cMid, with the cut-limited
     `a.L`, so the group flips near an arm's end. Take it from structure (the arm's structure-time L,
     or a rank).
   - Then re-check def cycle frame 18 (816 vs 817/818) and fat cyc18 crossing 310 (368 keys).
2. **The tail that comes and goes:** g41_def_tw64 tail/17 at corner 105, the eps 0.1 worst (n 0 full,
   3 reduced). Its existence has to come from structure. Its extent needs a continuous measure that
   passes the union bar; stage 11's t2-t6 did not (its handoff lists them). Then widen `SPAN_RAMP`
   toward h if that still quiets the run-end noise.
3. **Reach noise into spanRamp** (stage 11's places 4 and 5: g41_def_tw64 cyc18 #164, muse_hash cyc10
   run/54). Chord theta helped (muse_default_tw at eps 0.1: 5.784 → 0.874) but failed the union bar
   at cyc18 fat. Find a form that keeps it.
4. **g41_ring_tw64 at eps 0.2:** #88 run/1 and #253 run/13. Undiagnosed.
5. **def cyc18 arc/72 (corner 327).** Undiagnosed.

## Done

Done 1-6 of `docs/design/K1247_s10_reduce.md`, with these changes:
- **Setup.** Copy stage 11's untracked inputs from its worktree,
  `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-ab0e33c2e4fe88918\.claude\probes\K1240\`:
  `out/k1247s5` and `out/k1247s5_master`. Write `proto/outline_master.ts` from
  `git show b6103dd1:.claude/probes/K1240/proto/outline.ts`.
- **Step 0** is `k1247s10_base.ps1 -Sub s12base` on master's outline, before any change. The outside
  check compares against `s12base`.
- The bar for `k1247s5_cmp` is 44/8/0/0.
- The bar for `k1247s9_union.ts --d=0.001,0.01`, still and `--cyc`, is stage 11's handoff
  (`out/s11/t9_deg_union_*` in its worktree). No scene gets more drawn moves over 0.25 px, and no
  move gets larger.
- The acc table covers eps 0.02, 0.05, 0.1 and 0.2, before and after.
- Any change that moves what is drawn at rest gets a before/after crop pair, as stage 11's did.

## Rules

The Rules of `docs/design/K1247_s10_reduce.md` (your files: `outline.ts`, the `k1247s8_*` to
`k1247s12_*` tools and the check tools in `.claude/probes/K1240/proto/`; no `src/`), plus:
- **Load.** Other agents (K268's census, the phone round) time things on this machine. While anyone
  else holds `$env:TEMP\claude-perf.lock`, run one scoring process at a time, at Idle priority. Take
  the lock yourself only for the timing pair.

## Report

As in stage 11's brief: the acc table before and after, each place (what it was, what you changed,
its numbers before and after), what's left, the checks, the crops' paths, the timing pair, your last
SHA. End with `Ledger items` and K1247's handle fields.

## Handoff (stage 12, 2026-11-10, claude session 09c7a672 agent ac68950ce0ddc1f68)

Done does not hold. No eps passes every scene, and the acc table did not move. Place 1 is done
except the group. Key changes (KEYS) are gone at every eps. Places 2-5 were not started.

**Blocker:** the structural station order leaves a visible hole at rest on muse_hash (below). Fix
it before this order merges.

Commits on `worktree-agent-ac68950ce0ddc1f68`, after 2130554c:
- **9e32af40:** stations are ordered by structure.
  - sKey is the feature's diagram s: the seam is 0 and caps are ±1e12. slotSub is the arm dir.
  - Every structural interval is kept, and a passed one is empty. `K12_CSORDER=1` restores the cS order.
- **d78a5461:** structural region ids (`structRegionsC`). Adds `k1247s12_regdiff`.
- **42da7380:** a through pass's two arms are ordered by arm dir, and run regions are keyed by
  the A station alone.
- **5ada7039:** tools (`k1247s12_group`, `k1247s12_stations`, regdiff dumps).
- **0d4bb230, reverted by 19517724:** groups from structure (`st.regGroup`).
- **f2b3ca96:** `k1247s12_renum` and `k1247s12_regpoly`.
- **e9923938:** the envelope (`K12_NOENV=1` drops it) and `k1247s12_facecrops`.
  - A chain's structural intervals are laid end to end by length.
  - An interval whose start an earlier station has already passed starts at the furthest station
    so far, and is that much shorter. A closed chain runs two laps.
  - It is the identity when every length is positive, and it moves continuously.
  - It removed every region polygon that existed only after the change.

### Acc (`k1247s8_acc.ts`), drawn worst px / failures

| eps | before (2130554c) | after (e9923938) |
|---|---|---|
| 0.02 | 3.788 / 16 | 3.788 / 16 |
| 0.05 | 5.809 / 23 | 5.809 / 23 |
| 0.1 | 7.103 / 23 | 7.103 / 23 |
| 0.2 | 10.620 / 26 | 10.620 / 26 |

- **KEYS failures before:** def cycle (frames 18 and 6) and g41_user_tw64 piece 34.
- **KEYS failures after:** none, at any eps. Every remaining failure is drawn distance.
- **Outputs:** `out/s12/s12_env_acc_<eps>.txt`.

### Places

1. **Region numbering and group.**
   - **Chain 26 (g41_user_tw64): fixed by 9e32af40.**
     - Arms 196 and 198 sit 0.011 apart in cS. Under reduction they swapped cS order, and that
       broke both discard pairs (18 regions against 16).
     - The cause was the station order, not the 1e-9 dedupe.
     - Full and reduced now give the same intervals.
   - **def cycle frame 18 and fat cyc18 crossing 310:** KEYS are gone (fat cyc18 jitter 0.01: keys
     changed 368 → 0).
     - With the keys matched, the union now scores fat there: 2 drawn moves over 0.25 px
       (#601 run/2 1.142 px, #658 run/2 0.337 px, at crossing 310).
     - Stage 11's 0 at that row was masked by its 368 key changes.
     - Read earlier, not re-checked: a pickCand jump at a near-tangent crossing.
   - **Group: not resolved.** `memberGroup` / `memberGroupC` still read the cap ramp at cMid. Two
     attempts:
     - `st.regGroup` (0d4bb230), decided once from the structure scene's frame. Rest groups were
       unchanged, and the old rule moved 0-705 region-frames over def cycle frames 1-20. But it puts
       positions into the structure: k1247_structure gives structure(S) != structure(S') on
       11 scenes. Deciding it at cache time instead would follow the first frame (coldwarm).
       Reverted.
     - The adjacent-arm rule (the group of the arm whose root slot bounds the interval on its own
       side) changes 91-214 groups per scene at rest. That is a look change, so I dropped it.
     - The group is output only, and no key reads it now.
2. **g41_def_tw64 tail/17, corner 105.** Not started. Still the eps 0.1 worst (7.103 px).
3. **Reach noise into spanRamp.** Not started.
4. **g41_ring_tw64 at eps 0.2.** Not started.
5. **def cyc18 arc/72.** Not started. #1601 arc/72 is 0.825 px drawn at def cyc18 jitter 0.01, the
   same as stage 11.

### What is drawn at rest moved (`k1247s12_facecrops.ts`, s12base vs s12env)

The tool paints faces the way draw.ts does, at 40 px per world unit. Pixels that differ:

| scene | pixels | coverage | colour only |
|---|---|---|---|
| def | 71 | 45 | 26 |
| fat | 27 | 27 | 0 |
| g41_def_tw64 | 100 | 29 | 71 |
| muse_hash | 2839 | 2042 | 797 |
| every other scene | 0 | 0 | 0 |

- **muse_hash has a visible hole: the blocker.**
  - Where: chain 11, between junction arms 109 and 111 (cS 1.477-1.945, around 28.9,20.85 to
    29.19,20.97).
  - Why it was filled: over pass x77.2 (cS 1.901) lies between the two arms by position. Under the
    cS order it split the arm pair, and the base filled the span as regions r747/r748 (group 31).
  - Why it is empty now: by structure, x77.2 comes after both arms. The pair is adjacent and gets
    discarded, and no junction face covers the span.
  - The x76 seam gap on the same chain (base r745/r758) is now discarded too, but chain 66's over
    band covers it, so nothing shows there.
- def, fat and g41_def_tw64 change only thin slivers at band edges. They come from regions that
  only the base had, at seam gaps and overlapping features: def ch8 and ch89, fat ch1/3/5, and
  ch72/ch81.
- Crops, before and after (hatched pixels differ; muse_hash is 8 units wide, the others 3):
  - `.claude/probes/K1240/out/s12/crops/muse_hash_0_{before,after}.png`
  - `.claude/probes/K1240/out/s12/crops/def_0_{before,after}.png`
  - `.claude/probes/K1240/out/s12/crops/fat_0_{before,after}.png`
  - `.claude/probes/K1240/out/s12/crops/g41_def_tw64_0_{before,after}.png`

### Checks (on e9923938)

- **`k1247c_final.ps1 -Base out/k1247/s12base -Tables s12base`:**
  - Pass: coldwarm, cmp cold/warm/move (keyDiff 0), structure, pieces, move_def, outline_test,
    rows and cmprows.
  - verify (54) and faces (27 cases) differ from s12base. That is intended: region numbering, and
    the envelope's face sets.
  - Logs: `out/s12/cfinal_env*.txt`.
- **`k1247s5_cmp`:** 44/8/0/0.
- **`k1247s9_union --d=0.001,0.01`, still and `--cyc` 10/18:** the same as stage 11, except piece
  keys (region numbers) and the fat cyc18 row above. The envelope changed nothing here.
- **outside `--base=s12base`:** run curve distance 0 on every scene. Face and region sets differ,
  as intended.
- **sliver:** 0 corners over 0.5 px on every scene. This needs the untracked `proto/outline_base.ts`
  (`git show 2d452e0e:...`).
- **diffcorners:** every difference is a KEY (the region number in the piece key), with 0 point
  differences.
- **`s3f_claude_checks.ps1 -Tag s12`:** all within tolerance. It needs `out/s3f/s3dfresh*`, copied
  from stage 11's worktree.
- **`npm test`:** green (220 files passed and 2 skipped; 2893 tests passed and 9 skipped).
- **Timing:** see below.

### Timing

TIMING_PLACEHOLDER

### Next

1. **The muse_hash hole.**
   - Option A: decide from the diagram, at structure time, which crossings fall inside a junction's
     arm span, and keep the split there.
   - Option B: have the junction's face cover the discarded span.
   - Either way, re-run `k1247s12_facecrops.ts s12base <new> 40 8` and get 0 coverage pixels on
     muse_hash.
2. **fat cyc18 crossing 310** (#601 run/2, 1.142 px).
3. **The group from structure,** without positions in `structure()`.
4. **Places 2-5** of this brief.
