# K922: K868 junction extent and depth over the overlap (agent brief)

Coordinator, 2026-10-27 15:15. One stage, opus, 2 h cap. Follows K915
(`K915_surface_borders.md`: Step 7's verdict and the `## Handoff`). Runs
beside K923 (S3's Pixel micro-benchmark), which has the phone.

## Why

K915 replaced the group outline with the visible surface: a point is ink
where a different surface shows within W (`OracleParams.ink: "label"`,
behind the switch; `group` stays the default). On the 12 real scenes the
free ends fell from 228 to 100. The coordinator's crops of sheet H
(`.claude/probes/K868/sheets/H_surface_model.png`) show what is left:
- d1 (around j149): a sawtooth band;
- d2-d4: free ends closed by straight cuts across an arm, angular and
  notched. They read as artifacts, not borders;
- j149 gains a spur and a speck; on muse_hash one band reaches 8.5 px
  (#5; W is 3.24 px).

The coordinator's reading, which this stage tests:
1. **Depth ties.** In a shallow crossing the depth tent falls to 0 for
   both passes over the outer overlap (K915 Step 5), so the z-buffer
   reads the tie-break (chain id, then s) there. Ties that flip along an
   overlap draw the sawtooth.
2. **Caps inside overlaps.** A cut appears where an arm's span ends (its
   cap) while the arm still overlaps another member of its cluster. The
   arm's label changes from J to its chain alone there, and the cap
   triple (K915 Step 3's mechanism table) needs a line to close it. If
   every cap that no crossing requires sat where the arm has parted from
   every other member, no triple would form there and nothing would need
   closing. A crossing cut (K868 §3.4) must stay: its two passes are two
   surfaces, and how that looks is the hook question, Levi's call.

## Binding (Levi)

- The free-end image check judges (K910).
- G1 corners; cr 0-6, default 3 (sheet F).
- Keep G3-1 until K868 settles (K892). This stage touches no app code.
- A new look stays behind a switch, with today's default, until Levi
  accepts it on a sheet. The hook's look (now, cap, carry, seam) stays
  his call.

## Setup

- Worktree `.claude/worktrees/k922-junction-extent`, branch
  `k922-junction-extent`, made from master by the coordinator. Work and
  commit there.
- The scenes and K915's probes are untracked in the main checkout:
  `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K868\` (scenes,
  oracle, sheets) and `...\.claude\probes\K915\` (`indep.ts`,
  `census.ts`, `checks_ab.ts`, `fe_mech.ts`, `fe_mech2.ts`, the sheet H
  script; the run commands are in each probe's header). Read the scenes
  there by path. Copy a probe into the worktree's `.claude/probes/K922/`
  before changing it, and keep your harnesses, logs, crops and sheet
  there.
- The model is `src/render/field/oracle.ts` (2,701 lines: read it by
  ranges), with its rules in `docs/design/K868_field_border.md`
  §3.3-§3.7. The oracle keeps every cap and its reason
  (`FieldModel.armCaps`).
- View images as small crops (1000 px or less, cut by script), never
  whole sheets.

## Order

1. **Depth over the whole overlap**, behind a switch, with today's tent
   the default. Each crossing's over pass lies above its under pass over
   the whole overlap. Take the order from the crossing table, or widen
   the tent to at least 2h/sin θ, and say which and why. Junction pins
   and everything outside overlaps keep today's depth. Rerun K915 Step
   3's table under `ink: "label"` with it. Expect #14 (349/350 on
   muse_hash under every ink) and d1's sawtooth to move. Crop d1.
2. **Where the caps sit.** For every label free end with a cap triple
   (`fe_mech`), and every cut that closes one on sheet H (d1-d4, the
   hook), give:
   - the cap's reason from `armCaps` (chain end, next root, crossing cut,
     span end);
   - the member the arm still overlaps there;
   - how far past the cap the arm parts from it (their tubes no longer
     overlap).

   Tabulate by reason, with the counts.
3. **The junction extent**, behind a switch (`span`, today's rule, the
   default). Under the new rule an arm stays in J past its span end until
   it has parted from every other member of J. A crossing cut stays where
   §3.4 puts it, and nothing may join both passes of a crossing (the
   refusals stand). Report:
   - how far the caps move;
   - K915 Step 3's table and the cap triples left, under label + depth +
     the new extent.

   Step 2's table decides the details. If it shows the cuts come from
   something other than span ends, follow that instead and say so.
4. **Sheet I**, `.claude/probes/K922/I_junction_extent.png` in the
   worktree, with a `README.md` line beside it.
   - Columns: today (`ink: "group"`), label, label + depth, label +
     depth + extent.
   - Rows, at 6x:
     - d1-d4;
     - the six sites;
     - j149's spur and speck;
     - muse_hash #5's band;
     - the hook (j_hook_cross, crossing 292), under each of now, cap,
       carry and seam where they still differ.
5. **The second free-end mechanism**, as time allows within the cap.
   Half of label's free ends have no non-transitive triple within 2W
   (`fe_mech2_r1.log`, `fe_mech2_r2.log`).
   - Trace three by hand, j111's band end among them. The "no triple"
     lines in `fe_mech_r1.log` give the places.
   - At each: the labels and the presence test on both sides of the band,
     stepping past its end.
   - Name the mechanism. If the fix is clear, put it behind a switch and
     measure it.

## Checks (report each against master and K915's label)

K915 Step 3's table, on the 12 real scenes and the synthetics:
- real free ends, by class (junction core, union, neither) and by
  mechanism;
- synthetic free ends;
- synthetic checks (116/117) and corners (341/342);
- #16's stretches;
- real misses (geometric truth);
- missing and extra ink (model truth);
- muse_hash's #5, #6, #7, #9.1 and #14.

## Rules

- Stop rule: run `Get-Date` at the start and at every milestone. Stop
  when steps 1-5 are done or 2 h after the start, whichever comes first.
  A compaction is not a stop: after one, re-read this brief and
  `git log` before going on.
- Commit work in progress to the branch at every milestone, broken or
  not. Never push. `npm test` passes in the worktree at the end.
- Defaults stay as they are: `ink: "group"`, today's depth and spans.
- No phone and no timing: K923 has the phone. Never run `npm run build`
  in the main checkout.
- Never touch processes you did not start, and never use Levi's Chrome
  profile.
- Use PowerShell. Read code through the shell (`Select-String`,
  `Get-Content | Select-Object`).
- Helpers only if needed: `model: sonnet`, a 1 h cap and these rules.
- Append `## Results` (per step) and `## Handoff` to this brief, on the
  branch.
- The final report gives:
  - what was built;
  - the checks table (master, label, + depth, + extent);
  - step 2's cap table;
  - the second mechanism;
  - sheet I's path and what to look at on it;
  - a `Ledger items` list (follow-ups, residuals, decisions for Levi);
  - K922's current handle fields.

## Results

Run 2026-10-27, 15:12-17:10 PDT, on `k922-junction-extent` (df34832f
depth, 9b413243 extent and endSnap, 2508cd74 check 5's place, then this
record). Probes, logs and crops are untracked in `.claude/probes/K922/`
(`run.ps1`; each probe's header gives its command). Names below:
**group** is master (`ink: "group"`, today's depth and spans); **label**
is K915's `ink: "label"`; **dep** is label + `depth: "overlap"`;
**snap** is dep + `endSnap`; **ext** is dep + `extent: "part"` +
`endSnap`. All three new switches are off by default.

### Step 1: depth over the overlap

`depth: "overlap"` (df34832f; `depth.ts` `plateauDepth`, the pass pins'
reach in `oracle.ts`). The order comes from the crossing table, not from
a wider tent. Each pass pin holds its ±amp over a plateau as long as its
pass's overlap reach: how far along the chain its tube still overlaps
the crossing's other pass, measured on the curves. Today's tent falls
from the plateau's edges. Why the table:
- the reach is measured, so a curving or acute pass gets its real
  overlap (a 30° crossing overlaps 3.7h along each pass; today's tent
  is 0 at win, about 1.4h), where 2h/sin θ is an estimate from the
  angle at the pin;
- junction pins and everything outside an overlap keep today's depth
  exactly; a wider tent would also lift the stretches and junction
  members next to the crossing;
- facing plateaus of opposite sign shrink to leave a ramp of win between
  them, so a twist eye keeps today's straight ramp and two chains never
  tie along a stretch. Same-sign plateaus merge.

K915 Step 3's table under it: the **+ depth** column below. Free ends
100 → 105, missing ink 116 in 53 → 68 in 36, real misses 113 in 52 → 68
in 36, #16 14 → 13 stretches. #14 did not move (349/350): its one
failure is a table crossing whose passes are apart, where there is no
overlap to order. d1's sawtooth did not move either (`icrops/d1_dep.png`
against `d1_label.png`): it is not a depth tie (Step 3).

### Step 2: where the caps sit

`caps.ts`: fe_mech's triple test (R = W) at every label free end (the 12
real scenes and the synthetics), then
`armCaps` for the arm whose cap the triple straddles, the member it
still overlaps, and how far past the cap it parts from it (their tubes
stop overlapping). Free ends by the cap's reason, with the parting
distance's median and max:

| Reason | label | dep | ext |
|---|---|---|---|
| Crossing cut | 16 (1.00h, 5.63h) | 17 (1.00h, 5.63h) | 23 (1.00h, 6.00h) |
| Chain end (a float error, below) | 20 (0) | 22 (0) | 0 |
| Span end | 11 (0.75h, 3.25h) | 10 (0.75h, 3.25h) | 9 (0.75h, 2.31h) |
| Next root | 0 | 0 | 0 |
| No triple within W | 53 | 56 | 54 |
| Triple, no cluster | 1 | 1 | 1 |

The member still overlapped, under label: crossing cuts 13 another
chain, 2 a fill, 1 the same chain; span ends 5 a fill, 5 the same chain,
1 another chain; chain ends 20 another chain. Under ext: crossing cuts
19 another chain, 3 a fill, 1 the same chain; span ends 5 a fill, 4 the
same chain.

The "chain end" caps are not chain ends. An open chain's last foot sits
1-9e-16 past `s0 + len`, `clusterAt` read it as off the chain, and the
arm's cluster ended a float's width short of the end, so the arm parts
from nothing (distance 0). Label's 20 sit in 3 places (12, 6 and 2 free
ends), dep's 22 in 4. This, not the span ends, was the largest cap
source, so Step 3 fixed it first (`endSnap`), as the brief allows.

At the sheet's cuts:
- d1, label: a span end. Arm ch2 of jj4/2 at s 1.88, over the same
  chain's J4 fill, parting at 0.00h.
- d1, ext: a crossing cut. Arm ch68 of jj4/1 at 5.94 (crossing 307's
  pass, 2.91h out), over ch2's J4, parting 1.00h past: the crescent stub
  on `d1_ext`.
- d2-d4: no cap triple within W at any of group's 12 free-end points
  there, under label or ext. These cuts are not caps (Step 5).
- The hook (j_hook_cross ch1 at 9.01): a crossing cut (crossing 0's pass,
  4.21h out), over ch0's J0, parting 5.63h past it.

### Step 3: the junction extent

Two switches (9b413243):
- `endSnap: true`: `clusterAt` clamps s into an open chain's
  [s0, s0 + len]. It removes every chain-end triple (22 → 0) and takes
  free ends from 105 (dep) to 83, the largest single change of the stage.
- `extent: "part"`: an uncapped arm whose span ends short of its cap
  walks on from the span end in h/8 steps, at most 12h, while any of nine
  offsets across its tube still hits another member of its root cluster.
  Its extent becomes the last hit + a step − the margin, to which the
  span adds W and the margin as today. Caps clamp it (crossing cuts, next roots, chain ends),
  so a crossing cut stays where §3.4 puts it and no cluster takes both
  passes of a crossing. Up to 4 rounds; 3 were used.

Cap moves, 12 real scenes: 869 of 3,622 arms moved, median 2.13h, p90
7.19h, max 12.50h (the walk's limit). muse_hash: 176 of 503, median
3.28h. What holds an arm against its junction for 7h or more is not
measured yet.

Under ext: free ends 86 (snap 83), missing ink 62 in 34, extra ink 74 in
43, real misses 62 in 34, #16 10 stretches. Cap triples left: 32 (23
crossing cuts, 9 span ends) and 1 without a cluster. Against snap,
`part` is a wash on free ends (83 → 86): carrying arms outward brings
more of them to a crossing cut inside an overlap (crossing-cut triples
17 under dep, 23 under ext), while it cuts missing ink, extra ink and
#16. The 9 span ends left are arms the
walk never started: 5 overlap a fill and 4 part at 0.00h, so its start
test (a tube hit at the span end itself) is stricter than the triple's
adjacency within W.

d1's sawtooth is gone under ext and unchanged under dep, so depth ties
did not make it. ext shows a crescent stub there instead (Step 2).

### Checks

K915 Step 3's table; group and label are K915's numbers.

| Check | group (master) | label | + depth | + depth + endSnap | + depth + extent (part + endSnap) |
|---|---|---|---|---|---|
| Real free ends | 228 | 100 | 105 | 83 | 86 |
| - junction core | 47 | 40 | 44 | 31 | 30 |
| - union | 24 | 19 | 20 | 14 | 18 |
| - neither | 18 | 13 | 13 | 13 | 16 |
| - fill | 74 | 11 | 13 | 12 | 10 |
| - inked by another group | 10 | 8 | 8 | 6 | 6 |
| - group on top | 52 | 6 | 5 | 5 | 4 |
| - under the fill | 2 | 2 | 1 | 1 | 1 |
| - under a chain | 1 | 1 | 1 | 1 | 1 |
| Synthetic free ends | 4 | 1 | 1 | - | 1 (j_hook_cross) |
| Synthetic checks | 116/117 | 116/117 | 116/117 | - | 116/117 |
| Corners (muse_hash) | 341/342 | 341/342 | 341/342 | - | 341/342 |
| #16 stretches | 31 | 14 | 13 | - | 10 |
| Real misses (geo) | 144 in 65 | 113 in 52 | 68 in 36 | 68 in 36 | 62 in 34 |
| Missing ink (model) | 148 in 66 | 116 in 53 | 68 in 36 | 68 in 36 | 62 in 34 |
| Extra ink (model) | 71 in 46 | 94 in 60 | 88 in 56 | - | 74 in 43 |
| muse_hash #5 | 9 walks (4.8 px) | 16 (8.5 px) | 15 (8.5 px) | - | 10 (6.4 px) |
| muse_hash #6 | 92 | 97 | 93 | - | 87 |
| muse_hash #7 | 106 | 117 | 119 | - | 114 |
| muse_hash #9.1 | 1.60 px | 5.28 px | 5.28 px | - | 3.18 px |
| muse_hash #14 | 349/350 | 349/350 | 349/350 | - | 349/350 |

(- = not run.) ext's one synthetic failure is j_pair_cross #2. By scene,
label → dep: free ends muse_hash 40 → 41, def 11 → 14, ring 2 → 1,
g41_def_tw64 12 → 14; missing ink muse_hash 32 → 12, ring 12 → 3,
g41_def_tw64 39 → 32, g41_ring_tw64 15 → 7, g41_user_tw64 7 → 3. dep →
ext: free ends muse_hash 41 → 39, def 14 → 3, ring 1 → 0, g41_def_tw42
5 → 1, g41_def_tw64 14 → 12, g41_ring_tw64 3 → 1, but g41_user_tw64
20 → 23; missing ink muse_hash 12 → 6.

### Step 4: sheet I

`.claude/probes/K922/I_junction_extent.png` (untracked, 2492 x 7980 px),
with a `README.md` line beside it: muse_hash at 6x, groups k883, cr 3.
Columns: today (`ink: "group"`), label (K915), label + depth `overlap`,
label + depth + extent `part` + `endSnap`. Magenta dots are each
column's free ends. Rows: d1-d4, the six sites (4-way j7, j111, j123,
j140, j149, crossing 292), j149's spur and speck, muse_hash #5's band,
and j_hook_cross's crossing 0 under the looks now, cap, carry and seam.
Under the three label kinds the four looks draw the same pixels, so
those columns show `now` only.

What to look at:
- d1: label's sawtooth is gone under extent; a curled crescent stub
  takes its place (Step 2: a crossing cut at crossing 307's pass).
  Depth alone leaves the sawtooth.
- d2: the same angular notch in every label column (a fill outline,
  Step 5).
- d3: label's slanted flag becomes a jagged, notched band under depth
  and under extent. It is still angular.
- d4: a small bite, unchanged.
- The sites' free ends, group → label / dep / ext: j123 6 → 4 / 4 / 4,
  j140 5 → 4 / 4 / 4, crossing 292 5 → 4 / 4 / 4; j111 1, j149 0 and
  j7 0 in every column.
- j149's spur, the dark wedge under label, is gone under depth and
  extent.
- muse_hash #5's band: group 1 free end, label 0, dep 1 (a spike at the
  lower right), ext 1 (a notch at the top and an end at the bottom).
- The hook: 1 free end in every look and column. Under group, now ends
  in a short stub, cap draws no border at the tip (the arm opens into
  the paper), carry draws a dark block at the end, and seam a spike to
  the left. The label kinds end the inner border at the tip.

### Step 5: the second mechanism

Traced by hand (`trace.ts`: the visible labels at W/8 around the end and
the presence test across every label boundary within 1.5W; `flood.ts`:
indep.ts's exit count, drawn):
- j111's band end (muse_hash ch83 at 2.636): a crossing-cut cap at
  crossing 346, the arm still over the other member 1.69h past it. A
  cap, not a second mechanism.
- ch45 at 5.508: a cap 1.02W away, just outside fe_mech's R = W disc
  (R = 2W finds it).
- ch42 at 8.26: no end. The band bends round a notch in the paper and
  its two exits merge on the flood's ring.

`arcs.ts` then sorted all 86 ext free ends by the exit's width on the
ring and the triple test at R = 2W: 38 have a cap triple; of the 48
without one, 35 leave through a wide arc (over 1.5 rad) and 13 are band
ends. Of six drawn (`flood_ext.log`, `flood_ext2.log`), five are corners,
not ends: an L whose inside ink joins the two legs along the ring, a
filled wedge, acute V's whose legs are under 0.5 rad apart, a thick
blob whose exits merge. The sixth is a thick band's end.

**The mechanism is the judge's exit count.** indep.ts splits the ring's
ink cells into exits at angular gaps over 2.5/N rad, so two legs closer
than that, or joined by ink along the ring (a filled corner), count as
one exit: a free end where the ink is continuous. Most of the "no
triple" free ends are these. The fix is in the judge (count exits as
connected runs of ring cells, or components of the ink in an annulus,
not by angular gaps), and the free-end check judges, so I did not
change it: Levi's call.

d2-d4's cuts, traced under label at group's free-end points
(`trace_d2a`, `d2b`, `d3a`, `d4a` logs):
- d2 (two points): junctions J26 and J31 meet. The line runs along the
  boundary between one cluster's member and the other cluster's fill,
  and stops where that fill meets its own cluster's arm (simLab 1, no
  line). The V and the turn are the fill polygon's corners.
- d3: J8's arm (z 0.76) lies over J0's arm and then J0's fill. The band
  along J0's arm becomes two thin lines along the fill where the arm
  gives way to the fill.
- d4: a plain stretch of ch58 (s 15.2) overlaps J7's fill and arm at
  equal depth (z 0 on both; the table has no crossing between them), so
  the visible label flips in a tie and the border inks an irregular
  patch.

None is a cap. d2 and d4 look the same under depth and extent (sheet
I): fills keep their depth, and the extent moves only arm caps. d3
changes under depth (label's slanted flag becomes a jagged, notched
band, the same under extent) but stays angular. Inferred, not traced:
J8's arm crosses J0's arm there, and the overlap order reshapes a
crossing's depth. They are a third mechanism: fill outlines against a
foreign member, and ties where the table has no crossing.

## Handoff

- **State:** steps 1-4 done, step 5 named (not fixed: the fix is in the
  judge). Defaults unchanged: the three switches (`depth: "overlap"`,
  `extent: "part"`, `endSnap`) are off by default and only the probes
  set them. `npm test` passes in the worktree.
- **Branch:** `k922-junction-extent`, not pushed. Code: df34832f,
  9b413243, 2508cd74.
- **Evidence:** `.claude/probes/K922/` (untracked): `lib.ts` (env INK,
  DEPTH, EXTENT, ENDSNAP, HOOK_LOOK), `run.ps1`, `indep.ts`, `census.ts`,
  `checks_ab.ts`, `caps.ts`, `moves.ts`, `arcs.ts`, `flood.ts`,
  `trace.ts`, `i.ts` (sheet I: `crops <kind> <places>`, `band`, `hook`,
  `sheet`), the logs and `indep/*.json` per label, `icrops/`, and
  `I_junction_extent.png` with its `README.md`.
- **Decisions for Levi:**
  - endSnap is a float bug fix in `clusterAt` and the stage's largest
    single win (105 → 83 free ends); make it unconditional?
  - depth "overlap" halves missing ink and real misses at +5 free ends;
    adopt it with label?
  - extent "part" cuts missing ink, extra ink and #16 but adds 6
    crossing-cut free ends (83 → 86); keep, or stop the walk short of
    crossing cuts?
  - the free-end judge's exit count (Step 5) counts filled corners and
    close V's as ends; fix the judge?
  - the hook's look (now, cap, carry, seam: sheet I's last rows). It
    matters only under group ink: the label kinds draw the same pixels
    in all four.
- **Next:** the crossing-cut free ends (23 under ext: an arm carried
  into a crossing's overlap now ends at its cut), the fill-outline and
  tie cuts of d2-d4, the 9 span ends the walk never starts, then rerun
  the table with a corrected judge.
