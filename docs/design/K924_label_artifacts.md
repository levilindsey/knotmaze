# K924: K868, trace the label ink's artifacts to their rules (agent brief)

Stage brief (coordinator, 2026-10-27). Parent: K868
(`docs/design/K868_field_border.md`). Previous stages: K915
(`docs/design/K915_surface_borders.md`, the label ink) and K922
(`docs/design/K922_junction_extent.md`: depth over the overlap, endSnap,
the junction extent). Read K922's `## Results` and `## Handoff`, then
K915's Step 3 and `## Handoff`, before anything else.

## Why

S3 will put K915's label ink into the app: a z-buffered label pass, then
band strips. K923 showed it fits the Pixel's 4 ms with a screen-space LOD
and a packed 32-bit label. S3 copies whatever rule the oracle's label ink
follows, flaws included. Sheet I (`.claude/probes/K922/I_junction_extent.png`)
shows angular shapes at d1-d3 in every label column, whatever the
switches. The label ink also draws extra ink that group ink did not (71 →
94 stretches, 88 under depth).

This stage traces every artifact the label ink adds to the rule that makes
it, counts what each mechanism accounts for, and names the rule change
that would remove it. Building the fixes is the next stage.

What K922 already traced (Step 5):
- d2: the line runs along the boundary between one cluster's member and
  another cluster's fill (J26, J31). The V and the turn are the fill
  polygon's corners.
- d4: ch58 (s 15.2) overlaps J7's fill and arm at equal depth, with no
  crossing between them in the table, so the visible label flips in a tie.
- d3: J8's arm (z 0.76) lies over J0's arm and then J0's fill. It changes
  under depth but stays angular. Inferred, not traced: the overlap order
  reshapes a crossing's depth.

K922 calls these a third mechanism: fill outlines against a foreign
member, and ties where the table has no crossing. Not traced yet: d1's
sawtooth under label and under depth. K915 guessed ties in a crowded
junction; under the extent a crossing cut at crossing 307 replaces it.

## The base

Trace under `INK=label`, `DEPTH=overlap` and `ENDSNAP=1` (the probes' env,
see `.claude/probes/K922/lib.ts`). The coordinator has recommended depth
to Levi (K934, open), and endSnap is a float bug fix. For each artifact,
also say whether `EXTENT=part` changes it. Group ink is the reference, not
the target.

## The list

1. Sheet I's d1, d2, d3 and d4 (muse_hash at 6x; `i.ts crops` gives the
   places).
2. j149's spur and speck. The spur is gone under depth: confirm it, and
   trace the speck.
3. The extra-ink stretches in classes the model's truth calls hidden (K915
   Step 3: 13 under label). Recount them under the base.
4. muse_hash's ink checks:
   - #5's band: 8.5 px under label and depth (W = 3.24 px), with a spike
     at its lower right under depth;
   - #6;
   - #7: 106 under group, 119 under depth;
   - #9.1: 1.60 px under group, 5.28 px under depth.
5. The #16 stretches (the checks table's row: 13 under depth).
6. Sheet F's spur, hairlines, seam and speck at cr 4.5 and 6 (K915 Step 3:
   not measured).

## Order

1. **Attribute.** For each item, give:
   - the labels on each side of the ink (member, fill or arm; cluster; z);
   - the rule in K868 §3.3-§3.7 that inks it there;
   - its mechanism. Known mechanisms are a cap cut (K915 Handoff 3), a
     fill outline against a foreign member, a tie with no crossing in the
     table, and the free-end check's exit count (K922 Step 5). It may also
     be a new one.

   Use K922's `trace.ts`, which reads the visible labels at W/8 around a
   point and runs the presence test across every label boundary within
   1.5W. Confirm d2 and d4 at one more point each, and trace d1 and d3.
2. **Count.** Over the 12 real scenes under the base, count the extra-ink
   stretches, missing-ink stretches and free ends each mechanism accounts
   for. The rows should add up to the base's totals. Report what is left
   unattributed.
3. **Confirm by flipping.** Where an attribution is a hypothesis, flip the
   suspect rule behind a new switch (off by default). Show that the
   artifact goes, and what else moves. Candidates:
   - a fill bounded by its G1 corner arcs instead of its polygon's
     corners (sheet F's corners, which Levi approved);
   - a depth for every fill-versus-member overlap, not only the crossing
     table's pairs;
   - a deterministic tie-break where depths are equal.

   A flip is a diagnostic, not the fix: no tuning and no new defaults.
4. **Name the rule changes.** For each mechanism, give:
   - the change to K868 §3.2-§3.7 that removes it;
   - what it costs S3 (a pass, label bits, a lookup per pixel);
   - what it risks elsewhere.

   Rank the changes.

Not this stage: the free-end check's exit count (Levi's call, K934), the
extent walk, the hook's look and anything on the phone.

## Setup

- **Worktree.** `.claude/worktrees/k924-label-artifacts`, branch
  `k924-label-artifacts`, made from master by the coordinator. Its
  `node_modules` is a junction to the main checkout's. Work and commit
  there.
- **K922's probes** are untracked in the main checkout, in
  `.claude/probes/K922/`: `lib.ts`, `run.ps1`, `trace.ts`, `flood.ts`,
  `arcs.ts`, `indep.ts`, `census.ts`, `checks_ab.ts` and `i.ts`. The run
  commands are in each probe's header. They import the K922 worktree's
  source by absolute path. Copy what you need into your worktree's
  `.claude/probes/K924/`, and repoint the imports to your worktree.
- **Scenes and synthetics.** The scenes are in the main checkout's
  `.claude/probes/K868/`, and the synthetics in `test/render/field/scenes`.
- **The model** is `src/render/field/oracle.ts`; read it by ranges. Its
  rules are in `docs/design/K868_field_border.md` §3.3-§3.7.
- **Images.** View them as small crops (1000 px or less, cut by script),
  never whole sheets.

## Rules

- **Stop rule.**
  - Run `Get-Date` at the start and at every milestone.
  - Stop when steps 1-4 are done or 2 h after the start, whichever comes
    first.
  - A compaction is not a stop. After one, re-read this brief and
    `git log` before going on.
- **Commits.** Commit work in progress to the branch at every milestone,
  broken or not. Never push. `npm test` passes in the worktree at the end.
- **Defaults.** They stay as they are: `ink: "group"`, today's depth and
  spans, and every new switch off.
- **Not allowed.**
  - No phone and no timing.
  - Never run `npm run build` in the main checkout.
  - Never touch processes you did not start.
  - Never use Levi's Chrome profile.
- **Shell.** Use PowerShell. Read code through the shell (`Select-String`,
  then `Get-Content | Select-Object`).
- **Helpers.** Only if needed: `model: sonnet`, a 1 h cap and these rules.
- **Write-up.** Append `## Results` (per step) and `## Handoff` to this
  brief, on the branch.
- **The final report** gives:
  - the attribution table (item, place, labels, rule, mechanism, base
    against extent);
  - the count per mechanism, and what is left unattributed;
  - what each flip showed;
  - the ranked rule changes and their S3 costs;
  - a `Ledger items` list (follow-ups, residuals, decisions for Levi);
  - K924's current handle fields.

## Results

Agent run, 2026-10-27 17:02-19:02, on `k924-label-artifacts` (from
bec83b02). The probes are untracked in `.claude/probes/K924/`: K922's,
repointed at this worktree, plus `at.ts` (crops and traces at a point),
`cls.ts` (sorts every item into a mechanism), `chk.ts` (the failing
checks' sites), `tally.mjs`, `tdiff.mjs`, `run.ps1` and `cls.ps1`. Each
header gives its command. Base: `INK=label DEPTH=overlap ENDSNAP=1`.
muse_hash: W 0.152 (3.24 px), h 0.4, σ 1.257.

Labels: `M<J>:ch<c>@<s>` is a member of cluster J, `F<J>` is J's fill
(tagged with its nearest foot's chain), and `C:ch<c>@<s>` is a chain
outside every cluster; z follows in brackets. Places are muse_hash world
coordinates.

### The mechanisms

M1, M2, M6 and M3 come from the label ink's rules (K915, K868
§3.3-§3.7). The others do not.

- **M1, the cap cut** (§3.4's caps under K915's similarity). A chain
  within σ of a cluster's span but past its cap is not similar to the
  cluster. The presence test then inks a boundary where one tube runs on.
  Every kind of cap does it: the reach, a crossing cut, the next root.
  This is K915 Handoff 3's mechanism.
- **M2, a fill over a foreign tube** (§3.7's fill and §3.3's fill z). A
  fill reaches its arms' centrelines and takes its nearest foot's z.
  Where that z beats the tube of another cluster or of a free chain, the
  fill's edge is inked across the tube. The tube's own outline under it
  goes missing (#16's "covered: fill on top").
- **M6, a fill's z from its nearest foot** (§3.3). Where two feet of one
  cluster with different z are equally near, the fill's z jumps. Over a
  foreign tube whose z lies between the two, the jump is a switch line
  across the fill (d1's sawtooth, d3's turn).
- **M3, the tie** (§3.3). Equal z with no table crossing: the higher
  chain id wins, then the larger s, so the winner can change along one
  boundary.
- **S, a table crossing between similar labels.** The crossing's over
  and under passes are one cluster, or one chain within σ, so no ink
  separates them and the over pass's band breaks (#6, #7). Group ink
  breaks these lines too (#7: 106 under group, 119 under the base).
- **σ not transitive** (K915's similarity): "the same chain within σ"
  joins A to C and C to B, but not A to B.
- **N, an open chain's start** (s ≈ −0.3): the label's extent and
  §3.6's END tuck disagree. It belongs to the extent walk.
- **E, free ends whose exit count is "none"**: K934's.
- **F, new: a fill's paper edge outside the outline.** A fill's edge
  against paper lies 0.3-0.5 W outside the exposed outline that #5's
  walk starts from. The arcs flip leaves it, so the polygon's corners do
  not make it. Not traced to a rule.

### Step 1: attribution

| Item | Place | Labels across the ink | Rule | Mechanism | `EXTENT=part` |
|---|---|---|---|---|---|
| d1 | (20.30, 1.40) | An island of J4's fill inside the free ch82 (crossing x6: ch2 over ch82). The fill's z flips between ch2's foot (0.928) and ch68's (−0.928): a switch line against C:ch82, and a cap edge against C:ch2 | §3.7, §3.3 | M2 + M6 | The island goes; the trace window gains 389 ink cells and loses 175 |
| d2 | (20.03, 22.16), confirmed at a second point | F31 (0.534) over J26's member ch10 (−0.869); F26 (−0.928) under J31's member ch85 (0.928) | §3.7, §3.3 | M2 + M6 | Unchanged |
| d3 | (26.71, 6.70) | F0 takes z 0.928 from ch68's other pin and covers ch3, against x35 (ch3 over ch68); F8 against M0:ch68 the same way | §3.3 | M6 | Unchanged |
| d4 | (31.05, 4.50), confirmed at d4b | F7 against C:ch58@14.8: a switch with no table crossing. F7's z comes from ch21 (0) or ch58@26 (0.8), a near-tie | §3.7, §3.3 | M2 + M6 | Unchanged |
| j149's spur | j149 | Under label alone: z-0 ties of F62 and M62:ch82 against C:ch46 | §3.3's tie, §3.4 | M3 + M1 | Gone under the base (confirmed) |
| j149's speck | (16.0603, 4.7267) | C:ch46@15.89 (0.928) against M62:ch68@1.43 (−0.928) | §3.4 | M1 | Unchanged (+0 −0 cells) |
| Sheet F's seam, cr 4.5 and 6 | (17.52, 23.74) | J34's top label alternates between ch14@8.98 (0) and ch66@83.16 (0.05), against C:ch66@83.17 (0.01, just past J34's span). ch14 against C:ch66 is a switch (dz 0.01, no table crossing) and inks; ch66 against C:ch66 is similar and does not. The result is a dashed line | §3.4, §3.3 | M1 + a near-tie | Not run |

Sheet F's crop at cr 4.5 and 6 shows no spur, hairline or speck under
the base. Its other line, at (16.17, 23.78), is ch85's ordinary outline
between paper and J34's ch66.

**Item 3, extra ink in hidden classes.** The base draws 34 extra-ink
stretches over the 12 scenes. 23 are in the /own classes and 11 in
classes the truth calls hidden (K915: 13 under label): core/hider 1,
core/merged 2, core/other 3, under/other 1 and union/other 4. The 11 are
M1 4, M2 2 and N 5.

**Item 4, muse_hash's checks under the base.** The four checks the list
names:

| Check | Value | Sites |
|---|---|---|
| #5 | 15 of 10819 walks fail; the longest is 8.519 px | M1 alone at 6 sites. The band (sites 1-3 and 5, (2.26-2.36, 27.56-27.58)): M16:ch81@4.96 (0) against C:ch45@23.62 (−0.646). The spike (site 4, (4.21, 27.85)): M15:ch5@24.75 against C:ch45@25.21. Site 8 ((16.46, 17.77)): M79:ch84@34.76 against C:ch66@69.70. F at the other 9 sites: 6-7 at (4.21-4.28, 12.04-12.10) on F18, and 9-15 at (11.79-11.99, 15.70-15.83) on F61. There the run starts 0.3-0.5 W outside the outline. Their inner ends are M1 at 5 sites (C:ch84, just past J61's span, against F61 or M61:ch48), the ordinary outline at 3, and M2 at site 12 (F61 at 0.928 over C:ch84@27.12 at 0.247) |
| #9.1 | 5.2816 px | Site 5's single run of 8.52 px, which is W + 5.28: M1 |
| #6 | 93 of 1264 band ends off; the largest is 16.6 px | 84 sit at crossings whose over line #7 finds broken. At the gap's middle: the over pass on top at 62 (S: the over's own band is the missing ink); a fill on top at 24 (M2 23, M1 1); similar across the outline, one cluster, at 5 (S); uninked at 1; and the one overlap, a silhouette at a crossing (14.58, 9.43; M53:ch72 against C:ch54), at 1 |
| #7 | 119 of 700 over lines broken (148 gaps) | Similar across the outline at 136 (one cluster 54, one cluster's fill 69, one chain within σ 13): S. M2 5, the own chain past σ on top 4, N 2, uninked 1 |

The other checks are corners 341/342, #2 26.75 px, #3 2.46 px, #4
0.1368, #8 and #9 (0.0498) pass, #11 and #14 349/350, and #15 passes.

**Item 5, the #16 stretches.** There are 13 over the 12 scenes
(muse_hash 6), all census class f and all "covered: fill on top". 10 are
against a foreign chain (M2) and 3 are against the cluster's own chain
past its span (M1).

### Step 2: counts (12 scenes, base)

| Mechanism | Extra | Missing | Free ends | #16 |
|---|---|---|---|---|
| M1, the cap cut | 25 (member/member 24, fill/member 1) | 10 (a fill over its own chain past the cap) | 28 (member/member 16, fill/member 12) | 3 |
| M2, a fill over a foreign tube | 2 (a foreign member) | 24 (a foreign chain 23, a member 1) | 0 | 10 |
| N, an open chain's start | 7 | 0 | 0 | 0 |
| σ not transitive | 0 | 0 | 3 | 0 |
| E, exit count "none" (K934) | 0 | 0 | 52 | 0 |
| Unattributed | 0 | 2 (similar across the outline: one cluster's fill) | 0 | 0 |
| **Total** | **34** | **36** | **83** | **13** |

M6 and M3 have no rows of their own. They set the z that decides where
M1 and M2 fall, and the classifier books those sites under M1 or M2.

Under `EXTENT=part` the totals are 43 / 34 / 86 / 10. M1's member/member
extra rises from 24 to 33 and N's extra from 7 to 8; M1's free ends rise
from 28 to 32 (member/member 16 → 19, fill/member 12 → 13). Which caps
the 9 new member/member stretches sit at was not traced. The fill rows
fall: missing 10 → 9 (M1) and 23 → 22 (M2), #16 3 → 1 (M1) and 10 → 9
(M2), the cap fill/member extra 1 → 0. E's free ends go from 52 to 51.

### Step 3: flips

There are four switches in `OracleParams` (five settings), all off by
default (5f402788 has arcs, order, tie and cap; 1f0ddefe has yield):
- `labFill: "arcs"`: a fill stops at its arms' outlines (the triangle V,
  t_A, t_B);
- `labFill: "yield"`: a fill never takes a point inside another
  surface's tube;
- `labFillDepth: "order"`: a fill against a foreign member takes the
  table's order between that member's chain and the cluster's nearest
  chain;
- `labTie: "surface"`: equal depths break by a key that is constant over
  a surface (the cluster, else the chain), then by s;
- `labCap: <w>`: a chain within w past its span of J is J's surface (run
  at 0.4).

The table counts over the 12 scenes. d1-d4 give the ink cells added and
removed in each trace window (`at.ts`'s grid).

| Flip | Extra | Missing | Free | #16 | d1 | d2 | d3 | d4 |
|---|---|---|---|---|---|---|---|---|
| base | 34 | 36 | 83 | 13 | | | | |
| `EXTENT=part` | 43 | 34 | 86 | 10 | +389 −175 | 0 | 0 | 0 |
| arcs | 33 | 31 | 77 | 11 | +148 −112 | 0 | 0 | 0 |
| order | 35 | 39 | 82 | 12 | +58 −137 | +16 −23 | +41 −29 | +5 −13 |
| tie | 34 | 35 | 79 | 13 | 0 | 0 | +5 −43 | 0 |
| cap 0.4 | 19 | 60 | 98 | 40 | −44 | 0 | 0 | 0 |
| yield | 31 | 2 | 81 | 0 | +127 −161 | +211 −121 | +123 −203 | +153 −59 |

What each flip showed:
- **arcs.** M1's fill rows mostly go: missing 10 → 4, #16 3 → 0, free
  ends 12 → 5 and extra 1 → 0. It adds one missing stretch and one #16
  stretch, both "similar, one cluster". #5's F sites do not change.
- **order.** It removes nothing. Missing against a foreign chain rises
  from 23 to 26, and extra against a foreign member from 2 to 4. M2 is
  not a missing table order.
- **tie.** Free ends fall by 4 (fill/member 12 → 10, member/member
  16 → 14), missing against a foreign member 1 → 0, and d3 loses 43
  cells. A small effect.
- **cap 0.4.** Member/member extra falls from 24 to 9 and M1's free ends
  from 28 to 1. But #16 gains 27, missing gains 26 ("similar, one chain
  within σ") and new free ends appear (switch or crossing, via a fill 7,
  via a member 6). These sit 2-6 from the junction and about 1 from a
  table crossing: the window also merges crossing-cut caps, where a
  crossing's line belongs.
- **yield.** Every "covered: fill on top" row goes (missing 36 → 2, #16
  13 → 0), and so do extra against a foreign member (2 → 0) and the cap
  fill/member extra (1 → 0). Fill/member free ends fall from 12 to 9.
  muse_hash's census misses 1 sample in 1 stretch instead of 12 in 8,
  and its #16 is 0. At d1-d4 it removes the wrong ink but draws the
  foreign tube's outline across the fill. At d3 that outline is ch3's,
  which x35 puts over ch68 (inferred, not traced). Its muse_hash checks
  (`checks_fyield.log`) were still running when this was written.

### Step 4: rule changes, ranked

1. **A fill yields to every foreign tube** (§3.7 with §3.3: a fill's z
   loses to any tube outside its cluster).
   - Removes M2 (24 missing, 10 #16, 2 extra), M1's fill rows (10
     missing, 3 #16, 1 extra) and most of M6. The yield flip shows it.
   - S3: a depth bias that puts fills under every tube in the label
     pass, or one compare in form B. No pass and no label bits.
   - Risk: a junction whose fill should cover a foreign chain no longer
     does, and the yielded tube's outline is drawn across the fill
     (100-200 cells at each of d1-d4). It needs an image check. The
     table's order could refine it where a crossing exists, though the
     order flip alone removed nothing.
2. **Caps by their reason** (§3.4 under K915's similarity). A chain past
   a reach cap stays similar to the cluster within w; a crossing cut or
   the next root still separates.
   - Targets M1's member/member rows (24 extra, 16 free ends).
   - S3: 2 bits per arm side in `GeoGroups.sides` plus one s compare per
     pixel, or the CPU extends reach-capped spans by w.
   - Risk: a reach cap near a crossing, and a new constant w. This form
     has not been flipped: the cap 0.4 flip merged every kind of cap and
     hid real crossing lines (+26 missing, +27 #16).
3. **A tie key constant over a surface** (§3.3: break equal z by the
   cluster, else the chain, then s).
   - S3: nothing.
   - Effect: small (free ends −4, missing −1, d3).
4. **A fill bounded by its corner arcs** (§3.7: the triangle V, t_A, t_B
   instead of the arms' centrelines).
   - After change 1 it adds little: M1's fill free ends 12 → 5.
   - S3: a CPU mesh, or two distance tests per pixel.
   - Risk: new ink at the fill's edges (d1 +148).
5. **A continuous fill z** (§3.3: blend the arm feet's z instead of
   taking the nearest foot's).
   - After change 1, only fill against fill (d2) is left.
   - S3: one float per arm and a blend per pixel.
   - Risk: it moves switch lines. The order flip, which changed a fill's
     z by the table, removed nothing.

Outside the label rules:
- **S (#6, #7).** Whether a table crossing inside a cluster draws its
  over line is K868's design question, not the label ink's: group ink
  breaks 106 of the lines (that most are the same lines is inferred).
  A change would split similarity at table crossings (S3: a pass id per
  member, 1-2 label bits, and a CPU split of the spans at the crossing).
  Levi's call.
- N (7 extra) goes to the extent walk, and E (52 free ends) to K934.
- F (#5's 9 sites) needs a trace of the fill's paper edge against the
  corner prims at (4.2, 12.1) and (11.9, 15.75).
- 2 missing stretches ("one cluster's fill") are unattributed.

## Handoff

The stage stopped with steps 1-4 done, inside the 2 h.

- **Commits** on `k924-label-artifacts`, not pushed: 5f402788 (four
  flips), 1f0ddefe (yield) and this write-up. The defaults are
  unchanged. Every flip is off by default, and only the probes set one.
  `npm test` passes (178 files, 2371 tests).
- **Probes**, untracked in `.claude/probes/K924/`:
  - `pwsh run.ps1 <label> INK=label DEPTH=overlap ENDSNAP=1 [LABFILL=...]`
    writes the 12 scenes' counts (`indep/`) and muse_hash's checks.
  - `pwsh cls.ps1 <label> <the same env>` sorts every item into a
    mechanism (`cls/<scene>.<label>.json`). `node tally.mjs base
    <flip>...` sets the rows side by side.
  - `at.ts` crops and traces a point under any flip, and `tdiff.mjs`
    compares the traces across flips.
  - `chk.ts <label>` lists muse_hash's failing #5, #6 and #7 sites for
    `cls.ts` (env `PTS_FILE`).
  - The labels run are base, ext, farcs, forder, ftie, fcap and fyield.
  - **Gotcha:** `checks_ab.ts` takes the head's ink from `HEAD_INK`,
    which `run.ps1` sets. Without it the head runs `surface` ink
    (`checks_fyield_inksurface.log` is such a run).
- **Open:**
  - the fix stage: change 1 behind its switch, with an image check of
    the outlines it draws across fills; then change 2 as a flip limited
    to reach caps;
  - F: trace the fill's paper edge at #5's sites;
  - the 2 unattributed missing stretches;
  - S: Levi's call (does a crossing inside a cluster draw its line?).
- **K924's handle:**
  - owner: nobody since 2026-10-27 (claude agent a4a3a477963af7824 of
    claude session bf876705-c9fa-4b1f-83ea-e173dac6cff3; stage done);
  - branch: `k924-label-artifacts`, worktree
    `.claude/worktrees/k924-label-artifacts`; last commit: this
    write-up;
  - evidence: the worktree's `.claude/probes/K924/` (untracked);
  - next: the fix stage, from change 1;
  - brief: `docs/design/K924_label_artifacts.md`.
