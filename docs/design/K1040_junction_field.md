# K1040: the junction renderer's redesign - design and feasibility

Ledger K1040. One stage: Opus, 2 h cap. Branch `k1040-field`, worktree
`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k1040-field` (from
master, node_modules joined to the main checkout's). Work only there.
Brief written 2026-10-28 by the coordinating session.

## Why

K868 (`docs/design/K868_field_border.md`) defines the junction look as
one field: union within a surface, occlusion by depth between surfaces,
exact G1 rolling-ball fillets at the corners (§3). Its §8 planned the next
step as a WebGL2 prototype (S3). The work since went another way:

- S3a built the field as a CPU model rebuilt every frame (the FieldModel,
  `src/render/field/oracle.ts`): 256-474 ms p50 a frame in Node, about
  265 ms of a 292 ms frame in the browser, so 2-4 fps in motion. The
  label and the band ink (`src/render/label/`, flags `lbi` and `lbp`, off
  by default) read it.
- The label, the band ink and the corners take discrete decisions every
  frame (which piece, which candidate, which switch line, which branch of
  the corner march), and each pops when it flips. S3a2-S3a8b6, K992's
  stages 1-7 and K1000 patched the pops one class at a time, and every
  census found new ones (K1041 lists the switches K992 left; K1043 a
  33-pixel label band run decided by one pixel under eps). Patching does
  not converge, and none of it has reached Levi in motion (K1001 waits on
  that).

The redesign returns to K868's own plan: the label, the borders and the
corners are a per-pixel function of the frame, evaluated on the GPU,
continuous and watertight by construction. The same definition,
evaluated in float64 on the CPU, is the reference the checks compare
against. The CPU FieldModel stays only as the look reference: it shows
what the looks Levi approved look like.

This stage designs it and proves it can run. It writes no production
code.

## Calls that bind the design

- K868 §2's eight goals. Goal 8 is the budget: 60 fps on the Pixel 11,
  GPU at most 4 ms a frame at dpr 2.
- The label is a pure function of the frame (K868). Every pop counts
  (K992, K1000): between two frames a pixel changes only as far as the
  scene moved it, except where a topology change fades over a stated
  width.
- The corner's cap is a pure function of the frame, continuous and
  monotone (K992). Stage 1's b16 arch does not land. Sharp or round
  where two threads split waits on Levi's look in motion (K1001); sharp
  or round per corner is K830's (`crs`, builder pins; §2 goal 4).
- The overlap gate's width (0.05h) is a look call: keep it a parameter.
- New looks stay behind a flag until Levi accepts them on screen.
  Pre-launch there is no back-compat (CLAUDE.md).
- Levi's earlier look calls on borders, corners, caps, gaps and labels
  bind too; step 1 lists them.

## The hypothesis to test (not a decision)

§3.5's form B, exact. A pixel's distance to its surface's exposed
outline is the minimum of three terms:

1. foot points on member sides (the centrelines offset by ±h) whose foot
   lies outside every other member and fillet of the surface;
2. exposed endpoints: where two boundaries cross, and fillet tangent
   points;
3. analytic rolling-ball fillets, one per adjacent arm pair, centred at
   h+ρ from both centrelines.

Known problems:
- The union moves continuously (in the Hausdorff sense); the rolling-ball
  closing does not: a gap that crosses 2ρ jumps. Whether a fillet exists
  needs either the topology or a fade. A smooth-min blend is continuous
  but not exact, which may be a look question for Levi.
- Depth ties between surfaces need a fade.
- Group membership and whether a corner exists are the discrete parts
  that cannot be removed; the design says how each changes without a pop.

## Order

Take `Get-Date` at the start and at each milestone, and write the times
into Findings. Append `## Findings` (F1, F2, ...) to this brief as you go.

1. **Read and list the calls (about 20 min).** K868 §1-§3 (lines 9-349),
   §5 (377) and §8 (432); `K992_corner_rules.md`; `K1000_continuous_caps.md`
   ## Handoff. Two stage docs hold their findings only on their branches
   (master has their briefs): `K992_s7_recover.md`'s F23 and ## Handoff
   (`git show k992-corners:docs/design/K992_s7_recover.md`), and
   `K868_s3a8b6_oracle.md`'s Q17 and ## Handoff
   (`git show k868-s3a:docs/design/K868_s3a8b6_oracle.md`). Then grep
   `Levi` in `docs/design/K868*`, `K883*`, `K909*`, `K915*`, `K922*`,
   `K924*`, `K940*`, `K992*`, `K1000*`, `LEDGER.md` and
   `docs/ledger_done.md`, keeping the calls about borders, corners, caps,
   gaps, bands and labels.
   F1: a table, look | where decided (doc, ledger ID, commit) | the rule
   of the new definition that carries it.
2. **The definition (about 40 min).** Write the per-pixel definition as
   maths plus GLSL-like pseudocode: label, border band, corners, ends
   (§3.6), depth between surfaces (§3.3). F2.
   List every discrete decision in it (F3): topology-fixed (it changes
   only when the diagram's combinatorics change, such as group membership,
   crossing order, which arms meet) or continuous; for each one that can
   flip, its fade, the fade's parameter and its width.
   Rule out the alternatives with numbers (F4): (a) the CPU FieldModel made
   incremental (S3a10): its best-case frame; (b) a smooth-min SDF blend:
   how far it sits from the exact outline, in px at dpr 2, at the scenes'
   junction sizes; (c) a raster coverage mask plus jump flooding: its cost
   at dpr 2 and its error; (d) form B exact on the GPU: candidates per
   pixel and the cost of each.
3. **The timing prototype (about 40 min).** A standalone WebGL2 page in
   `.claude/probes/K1040/`. Commit its source on the branch
   (`git add -f`; `.claude/*` is ignored) and leave its outputs untracked.
   It reads S1a's scene exports from the main checkout, read-only:
   `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K868\scenes\def.json`
   and `fat.json` (the format: `K868_s1a_scene_export.md`,
   `src/render/field/scene_export.ts`). It builds per-tile candidate lists
   on the CPU (timed), uploads them as textures, and evaluates the
   definition per pixel in a fragment shader at dpr 2 over the scene's
   viewport. It need not match the look yet: what matters is the cost of
   the worst case.
   F5 reports, per scene: GPU ms a frame (timer queries if Chrome exposes
   them; otherwise say how you measured), CPU binning ms, and candidates
   per pixel (max, p95). Measure on the desktop first. Use the Pixel 11
   only if it is already awake and unlocked; check read-only with
   `adb shell dumpsys power` and `dumpsys window`. Never wake or unlock
   it, send it key events, or touch its media. `scripts/phone.ps1` tunnels
   it.
4. **What survives, and the plan (about 20 min).**
   F6: a verdict for each of K1000, K1001, K1007 (S3a8c), K1010 (S3a8d),
   K1015, K1022, K1033, K1037, K1039, K1041, K1043, K972, K973, K979, K985
   and S3a10 (their text is in `LEDGER.md`). Each verdict is one of:
   - carried by the new definition (closes when stage N lands);
   - still needed (say why);
   - moot.

   Also say what of S3a8b6's float64 oracle can seed the CPU reference.
   It is `oracle30.ts`, tracked on `k868-s3a`
   (`git ls-tree -r --name-only k868-s3a | Select-String oracle30`).

   F7: the staged plan. Stages of at most 2 h each: Opus for design and
   shaders, Sonnet for mechanical work (exports, sheets, censuses). For
   each stage give:
   - what it proves and its gate;
   - where the float64 reference and the census come in;
   - where Levi looks (in motion, behind a flag);
   - which existing code it reuses or deletes.

   Reuse candidates: `src/render/samp_table.ts`, `fabric_sdf.ts`,
   `gap_mask.ts`, `junction_field.ts`, `arm_strip.ts`,
   `src/render/label/label_glsl.ts`, `label_band_gpu.ts`, and
   `src/render/field/`.

   A look question for Levi only where a look choice arises (smooth-min's
   rounding, a fade's width), each with a crop PNG beside the current
   look. Then `## Handoff`.

## Setup and tools

- Dev server, from the worktree:
  `npx vite --config .claude/probes/K1040/vite.private-cache.config.ts --port 5401 --strictPort --host 127.0.0.1`.
  The config is already in place. It keeps a private dep cache, because
  worktrees share node_modules. Stop the server when you are done.
- Timing takes the machine-wide perf lock, `$env:TEMP\claude-perf.lock`.
  Write one line in it: owner (K1040), start time, what.
  - If another owner holds the lock, wait inside ONE blocking command (a
    loop with a timeout). A lock older than 30 min is stale.
  - Delete the lock when you are done.
- Drive headed, hardware-GPU Chrome the way `scripts/diag_screenshot.mjs`
  does, with a fresh temporary profile and never Levi's. Never use
  `--virtual-time-budget`. App links carry `&snd=none`.

## Rules

- Do not edit existing files under `src/`, `test/` or `scripts/`. New code
  lives in `.claude/probes/K1040/`, and master's app keeps its behaviour.
  Don't run `npm run build` in the main checkout, and don't touch other
  worktrees.
- Read code through the shell: `Select-String` finds the lines, and
  `Get-Content <file> | Select-Object -Skip <n> -First <m>` reads them.
  Use the Read tool only for images and for a file you are about to edit.
  Branches can be read without a checkout: `git show k868-s3a:<path>`,
  `git show k992-corners:<path>`.
- Commit WIP to `k1040-field` at every milestone (this brief's Findings,
  the prototype), broken or not. Never push. Never skip hooks. Use no
  helpers (no subagents).
- Keep the Tailscale IP and the phone's adb serial out of tracked files.
- **Stop rule.** Stop when the Order is done or 2 h after your start
  (`Get-Date`), whichever comes first. A compaction is not a stop. After
  one, re-read this brief and `git log --oneline -5`, then go on. When you
  stop:
  1. Commit WIP.
  2. Append `## Handoff` to this brief: what is done, what is next, how to
     rerun the prototype.
  3. Commit.
  4. Report.
- Your final report ends with `Ledger items` (new follow-ups, residuals,
  decisions for Levi) and K1040's handle fields: owner, branch, last
  commit, evidence, next, brief, env.

## Findings

Stage agent, claude session bf876705 (agent a377492c). Times are
`Get-Date`, PDT, 2026-10-28.

- Start 21:32:22. Step 1 (reading, F1) done 21:46.

### F1 · The calls, and the rule that carries each

"The new definition" is F2's. A rule in quotes is F2's name for it.

| # | Look | Where decided | The rule that carries it |
|---|---|---|---|
| 1 | Paper background, two edge strokes per thread, hollow interior, no fills, no gaps | K868 §1-2; K797 (b6585962) | "ink": a pixel is ink iff it lies in the top surface and within W of that surface's exposed outline |
| 2 | Over's edges run through a crossing; the under's stop on the over's outline | K868 §2.2, §3.2 | "top": per pixel, the surface with the greatest z among those that contain it |
| 3 | A junction is ONE outline: no mouth border, no double strokes, no butts; 3-way and 4-way alike | Levi 10-23 and 10-25; K857 (0c09ef63), K854 (ccae4ffe), K883 | "exposed": distance to the exposed outline (a member side counts only where no other member or fill of the surface covers it), never min over members |
| 4 | Missing borders are wrong (an arm that loses its side, a group that swallows a passing thread) | K874/K883 sheet B, K909 B2, K910 | "groups" only within junction spans; "cut" at d − (L + h) on a crossing; exposure is per surface |
| 5 | G1 rolling-ball corners, not a mitre or a smooth-min blob | K881 sheet E; K868 §3.7 | "fillet": term 3, the arc of radius r centred at h + r from both centrelines, plus its tangent points |
| 6 | The `cr` slider: r(θ) = (cr/3)·min(2h, 1.5h·tan(θ/2)) | K874/K883 sheet C; sheet F approved (K915, K922) | "radius": the same r(θ), then "fit" shrinks it continuously by the room on the arms |
| 7 | Sharp or round per corner: `crs`, builder pins win | Levi 10-22; K830 (e5fbdff4); K868 §2 goal 4 | per-corner input bit, topology-fixed (F3 D7) |
| 8 | Sharp point where two threads split | K1001: waiting on Levi; b16's arch does not land (K1040 brief) | "fit": r → 0 continuously as the room → 0; the arch is not built; the look stays behind the flag until Levi sees it in motion |
| 9 | Dead ends: closed hollow caps | Levi 10-22 and 10-25; K868 §3.6 | a dead end is the tube's own semicircular cap, part of its member's outline |
| 10 | END arms tuck into the through thread | K868 §3.6; K915, K922 (binding) | "end": the END arm extends to c′ on the through's centreline and is capped there; that cap is always buried |
| 11 | Arms keep the thread width and line up | Levi 10-25 | every member is a chain tube of the same h; the arms are the chains themselves |
| 12 | Depth comes from the crossing diagram | K868 §3.3 (2026-10-26) | "depth": pinned hat sums on each chain; group z = z of the nearest member; ties fade (F3 D4) |
| 13 | Two threads of one junction that cross: both inks fuse them today; K943 proposes the over's line | K943: open, behind a flag for Levi to compare (sheet `K943_crossing_in_junction.png`) | a per-pair bit inside a group: one surface (fused, today's look) or two surfaces ordered by "depth" (K943's flag) (F3 D2) |
| 14 | The hook's look (now / cap / carry / seam) | K909, K915, K922: still open | a parameter of "end"; not decided here |
| 15 | The cap triple's notched cuts | K915 Handoff item 3: still open | open; F2 draws the cut as a straight buried cap, same as master |
| 16 | A pure function of the frame; a topology change fades over a stated width | K1040 brief; K992 call 3; K1000 call 2; K868 §2 goal 6 | F2 keeps no state between frames; every flip in F3 has a fade with a named parameter |
| 17 | The overlap gate's width, 0.05h | K992 S3 F4 (`K992_s3_landing.md`); K1040 brief | a parameter, `ovw` (F3 D9) |
| 18 | Graphite (pencil) look later | K868 §1, §9 | F2 exposes the outline distance and the arc coordinate, so a texture can follow the outline |
| 19 | The highlight tint (solved path) | K868 §2 goal 7 | the top surface's chain and s, read per pixel |
| 20 | The hover rim follows the outline | K345 | the same exposed distance, a second band width |
| 21 | Behind a flag; no back-compat | K1040 brief; CLAUDE.md (2026-10-13); K922 | a param appended to `CODEC_PARAMS`, default off |
| 22 | 60 fps on the Pixel 11: GPU at most 4 ms a frame at dpr 2 | K868 §2 goal 8; §6 check 13 | F5's budget |
| 23 | Reveal fades (appearance, explore) | K275, K268 | must not regress: the reveal masks multiply the ink |
| 24 | G3-1's gap search stays until K868 settles | K892 (Levi 2026-10-27) | replaced only when the new field lands behind its flag and Levi accepts it |
| 25 | The free-end image check is the judge; it counts runs of ink | K910, K934 | the gate of the first look stage (F7) |
