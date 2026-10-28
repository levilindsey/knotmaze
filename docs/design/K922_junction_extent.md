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
