# K1040 S4a2: the GPU band's ink matches form B away from corners

Ledger: K1040. One Muse fix run, which Claude starts through Paseo from this committed brief. It
works in its own worktree and pushes to master when Done holds. Cap 2 h. Ports 5960-5969.

## Goal

Levi, 2026-11-06: "When are we going to fix junction borders though?" S4a (its Handoff ends
`docs/design/K1040_s4a_band.md`) built the GPU band pass's first half in
`src/render/field/band_b.ts`, `band_b_glsl.ts` and `band_b_pass.ts`. Check #12 (ΔF ≤ 1/32 px
against the float64 reference, form B, away from corners) fails on all 12 scenes. S4a found five
causes and placed each in a crop. Fix them, in this order:

1. R2, group surfaces: `topDist()` returns -1 when L's surface code is not 0, so a group surface's
   band is missing or too low. Give it the distance to the group's surface, from its arm table.
2. The burial endpoint terms and their fades (F3 and F7's S4a in
   `docs/design/K1040_junction_field.md`): today the GPU cuts where the reference fades.
3. R3, END arms: form B extends an END arm's chain to c-prime (s < 0); the strips and `candOn`
   stop at sample 0.
4. R1, two partial rims at one pixel: form B unions them, 1 - (1 - a)(1 - b); MAX keeps the
   larger. S4a's proposal is per-pixel ownership plus a union blend; any way that gives form B's
   value is fine.
5. R4, the over-ink beside a group surface in user_tw42 at (736.7, 793.4), side +1.

Then the two spots S4a did not diagnose: muse_hash (1904.1, 1117.0) and g41_user_tw64
(1443.8, 895.5). Form B (`src/render/field/form_b.ts`) is the definition: don't change it.

## Read first

- S4a's Handoff (from line 94 of `docs/design/K1040_s4a_band.md`) and the brief above it.
- F3 (line 355) and F7 (line 616) of `docs/design/K1040_junction_field.md`.
- `.claude/rules/render-field.md`, `render-shaders.md` (K299's scan: no `mod` in lap wraps) and
  `probes.md`.

## Setup

- Work only in `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\muse-k1040-s4a2`. Claude
  made it, detached at this brief's commit, with `node_modules` junctioned. Never run `npm ci`.
- S4a's tools are tracked in `.claude/probes/K1040/s4a/`: `s4a.mjs check|time|diag [scenes]`, run
  through `run_locked.ps1 -RunArgs @(...)`, and `ref_at.ts` (form B's terms along one section).
  Copy them to `.claude/probes/K1040/s4a2/`, with lock owner `K1040-S4a2`, and work there.
- The 12 scenes are in the main checkout's `.claude/probes/K868/scenes/` (read them, don't write).
  S4a's results and crops are in its kept worktree:
  `.claude/worktrees/agent-a938d2e1d4d9b45e3/.claude/probes/K1040/s4a/out/` (read-only).
- Every browser job runs under the perf lock through your copy of `run_locked.ps1`: real time,
  headed, at most two browsers.

## Done

1. Check #12 on all 12 scenes, away from corners: ΔF ≤ 1/32 px. A table per scene: the worst ΔF
   and where, before (S4a's) and after. A spot still over: crop it and name its cause. A spot
   that is a corner's (S4b's) says so.
2. The fixes are in the band files (`label_b.ts` only for shared exports), each with a
   `K1040 S4a2` comment. Nothing in the app imports the band, so no default pixel changes and the
   golden snapshots stay green.
3. `test/render/field/band_b.test.ts` pins the tables' new parts (an END arm's s < 0 reach, a
   group surface's distance), on a small scene.
4. The desktop cost again (`s4a.mjs time`), beside S4a's table.
5. `npm test` is green after `git fetch -q origin` and `git rebase origin/master`. Then
   `git push origin HEAD:master` and watch that commit's deploy (`gh run list -R
   levilindsey/knotmaze -L 3`) until it is green. If the push is rejected: fetch, rebase, test,
   push again. Never force, never skip hooks. If Done 1 does not hold at the cap, push what
   passes Done 2-5, and the Handoff says what is left.

## Rules

- PowerShell. Stage files by name. Never `git add -f` a probe's outputs (PNG, JSON, tables, logs).
  The copied tools may go in with a fix's commit.
- Don't touch:
  - the main checkout (Claude merges there), or any other worktree;
  - `src/render/ribbon/joinery.ts` and `ribbon_renderer.ts` (K1220 S3, another Muse run, in
    `muse-k1220-s3` on ports 5980-5989);
  - port 5173, or the phone.
- Don't edit LEDGER.md.
- Out of scope (name it if you see it, don't fix it):
  - the corners, fillet arcs, V, t_a, t_b, ω, the D4 tie, the outer edge's AA and the flag (S4b,
    a Claude agent after you);
  - the CPU prep's cost (S5), and the band's copies of the label pass's tables;
  - the label pass's Pixel speed (K1097);
  - the old renderer's junctions (K1227-K1231);
  - how the reference's halos look (Levi judges that at S4b).
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and at each milestone).
  Stop your servers and browsers.

## Report

Append a Handoff to this brief, in the last push: what you fixed per cause, check #12's table
before and after, the cost, anything left, your last SHA. Commit messages carry the record.

## Handoff (K1040 S4a2, Muse, 2026-11-06)

Fix commit `365d2244`; this Handoff rides in the commit after it.
Worked in `.claude/worktrees/muse-k1040-s4a2` under the perf lock through
`.claude/probes/K1040/s4a2/` (owner `K1040-S4a2`), 08:18 to 09:3x PST, no servers left running.

### What was fixed, per cause

- **R2, a group surface's band.** `topDist` in `src/render/field/band_b_glsl.ts` walked only own
  surfaces and returned -1 for a group, so fragments under a group top were discarded or never
  composited. It now walks the label word's naming chain for group tops too (away from corners
  that member is the group's nearest); -1 remains only for fills (S4b).
- **The burial's endpoint terms and fades (cause 2).** The burial read every window segment at
  its own clamped cap ramp: two segments past B's foot on chain 22 of user_tw42 it buried at
  rB 0.78 against the piece's 0.17, and chain 62 of def at ramp 0.49 two segments past the foot
  against 0.002. The burier is now B's piece: the window's chain-local minimum (a new neighbour
  test, since overlapping arm windows of one chain each have a nearest segment), at B's full
  `memberRamp` (the max over B's arms with F10's root-side twin, factored out of A's read),
  with winW over the +-3 segments around the piece. The twin mattered on its own: chain 24 of
  g41_user_tw64 reads ramp 1 from its window arm and 0 from member, and buried chain 1's rim
  dead (memberRamp helper, `band_b_glsl.ts`).
- **R3, END arms.** Two halves. The extension rim itself was buried by the through arm under
  the old per-segment read (GPU 11 against ref 224 at user chain 1 k0); the per-piece burial
  fixed it - the strips and `candOn` already reached s < 0 (the k0 strip alone writes the rim;
  `test/render/field/band_b.test.ts` pins the tables' s < 0 reach). The dead end at
  g41_user_tw64 chain 1 k131 wrote 0 on the concave side of its last vertex: the vertex strip
  took its (h + aa) tan(phi/2) mitre only on the convex side, so the foot's rim fell between
  the two strips; the concave side takes it now, as form B's `inEdgeStrip` mitres both ends.
- **R1, two partial rims.** At paper pixels the old probe 1 px along the normal lands in paper
  again exactly where both tubes end together (fat's notch: both distances within 0.04 px of
  h). The fragment now probes 1 px inward (inside A's tube, naming the top there) and then the
  four neighbour texels of the label, and composites as lay 1 does, with dT from the other
  surface's naming chain. Fat: worst 0.579 -> 0.029 px, 49 spots over 1/32 -> 0; def's
  chain 58/78 notch (both normal probes paper) is the neighbour scan's case.
- **R4, over-ink beside a group surface.** A cap-ramp piece's OWN share (weight 1 - ramp_A in
  the cap mix) was written at full strength even when the group covers the pixel from above.
  The foot value is now `(ramp_A - bur + (1 - ramp_A) * ownVis)`, where ownVis hides the share
  only behind a group piece that is still a member in those configurations (ramp > ramp_A)
  and above A by cone key (`invK` rides `BandBTables` for the key). user_tw42 at (736.7, 793.4):
  GPU 105 -> 14 at (741, 800) against ref 45; what is left there is the tie, below.
- **The two undiagnosed spots.** muse_hash (1904.1, 1117.0) is the D4 tie: at the section
  form B's fade is F_TIE alone, the two cone keys 0.006 apart against zt; named, not fixed
  (S4b). g41_user_tw64 (1443.8, 895.5) was R2 (chain 24's rim under group 4, discarded) plus
  R3 (chain 1's dead end); both fixed, and the scene's worst moved.

### Check #12, all 12 scenes (2480x1800, away from corners)

Counts are sections over 1/32 px (then over 1/8, over 1/2, run-count mismatches).

| scene | before: worst ΔF (counts) | after: worst ΔF (counts) | at |
|---|---|---|---|
| muse_hash | 2.068 (132, 89, 10, 7) | 2.068 (107, 74, 8, 7) | (1904.1, 1117.0) c71 k1410 - tie |
| muse_default_tw | 1.053 (17) | 0.014 (0, 0, 0, 1) | clean |
| def | 0.977 (89) | 0.430 (5, 1, 0, 0) | (1000.1, 611.1) c65 k208 - tie (fade 22 at the pixel) |
| fat | 0.579 (49) | 0.029 (0, 0, 0, 0) | clean |
| ring | 0.947 (30) | 0.947 (7, 7, 1, 1) | (1737.0, 1434.1) c3 k322 - tie |
| user_tw42.lightpaper | 4.872 (472) | 2.840 (7, 5, 4, 1) | (736.7, 793.4) c21 k106 - cap + tie (fade 6) |
| g41_def_tw42 | 0.450 (25) | 0.075 (1, 0, 0, 1) | near clean |
| g41_def_tw64 | 3.277 (95) | 0.652 (42, 31, 3, 2) | (628.3, 480.4) c84 k35 - tie (keys 0.0013 apart) |
| g41_ring_tw42 | 1.130 (65) | 0.143 (3, 1, 0, 0) | near clean |
| g41_ring_tw64 | 2.875 (95) | 0.636 (16, 14, 4, 0) | (1770.7, 1483.2) c4 k31 - tie |
| g41_user_tw42 | 4.872 | 2.852 (7, 5, 4, 1) | same spot as user_tw42 |
| g41_user_tw64 | 4.213 (76) | 2.815 (37, 27, 7, 2) | (695.7, 344.2) c9 k72 - cap + tie + merge (fade 22) |

Every spot still over 1/32 that was sampled carries form B's F_TIE (the D4 tie, S4b's), most
with F_CAP (the cap mix's exact coupling, which the strip model approximates by
min(ramp_A, ramp_B)); the no-tie value the band writes is form B's untied value at those
pixels. Sheets (24, under `.claude/probes/K1040/s4a2/out/sheets/`, not committed): show
`user_tw42.lightpaper_worst.png` and `muse_hash_worst.png` first - the remaining differences
are small red/blue patches at grazing crossings beside junctions, plus the corner V-cuts that
were S4b's before this run.

### Desktop cost (render sync p50 ms, label / label+band / band adds, beside S4a's)

muse_hash 1.40/5.30/+3.90 (S4a +3.5); muse_default_tw 1.30/3.40/+2.10 (+1.7);
def 1.20/3.90/+2.70 (+2.1); fat 1.20/1.90/+0.70 (+0.6); ring 1.40/1.60/+0.20 (+0.1);
user_tw42 1.30/2.40/+1.10 (+0.5); g41_def_tw42 +2.10 (+1.7); g41_def_tw64 +3.20 (+2.7);
g41_ring_tw42 +0.30 (+0.2); g41_ring_tw64 +0.50 (+0.3); g41_user_tw42 +1.10 (+0.7);
g41_user_tw64 +2.10 (+1.5). The memberRamp reads and the neighbour walks cost a few tenths
on junction scenes; fat and the rings are unchanged in kind.

### Done 2-5

- Fixes only in `src/render/field/band_b.ts`, `band_b_glsl.ts`, `band_b_pass.ts`, each with a
  K1040 S4a2 comment; the app does not import the band, and the golden snapshots stay green
  (`npm test`: 218 files, 2884 tests passed, before and after the rebase).
- `test/render/field/band_b.test.ts`: an END arm's window starts at segment 0 over s < 0, its
  strips exist, a group's arms are all in the arm table with windows, and `invK` rides it.
- Probe copies with lock owner K1040-S4a2 are committed under `.claude/probes/K1040/s4a2/`
  (outputs ignored, never staged); `frag` isolates one strip, `diag_at/diag_cfg/diag_frag/
  diag_bur/diag_arm` are the CPU diags used above.

### Left

- The D4 tie and the exact cap mix at grazing crossings and cap boundaries (S4b's list plus
  S4a's noted approximation): the spots named in the table. A tie-aware band would have to
  blend the two composite orders by cone-key distance instead of MAX-ing one order.
- The lay 1/lay 3 composite approximates the top surface's rim unburied; where that rim is
  itself buried the band can still over-ink slightly (seen at g41_user_tw64 (1576.4, 770.2),
  itself tie-flagged).