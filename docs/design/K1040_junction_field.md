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

### F2 · The definition (form B, exact, per pixel)

Units are world units unless marked px; at dpr 2 a world unit is
2·pxPerUnit device px (def 44.7, fat 45.5). S1a's def and fat: h 0.26
(11.6 px), W 0.0988 (4.4 px), samples about 0.09 apart (4 px).

**Per frame, on the CPU (a pure function of the frame, no warm start):**

1. Chains c_i: the drawn samples (`renderer.chainSamples`), arc length s.
   An END arm's chain gains one segment from its terminal to c′, the
   nearest point of the through's centreline (§3.6). A dead end keeps the
   polyline's own round end.
2. Depth z_i(s): §3.3's pinned hats, per sample, from the crossing table
   (`src/render/field/depth.ts` as it stands).
3. Groups: a group G is a junction cluster (junctions joined by a chain
   run with no crossing cut between them: diagram topology). Each arm a of
   G is chain i on [s_root, s_cap(a)]; s_cap is the minimum of a FIXED
   candidate set (the chain's end, the next root on the chain, and for
   each crossing of the table on that run, d_c − h·cot(θ_c/2) − h), so it
   moves continuously (F3 D3). A pair of passes that K943 marks "crossed"
   stays two surfaces (a bit per pair, default off = today's fused look).
4. Corners: one per cyclically adjacent arm pair (a, b) of a junction
   (the export's `corners[]`), solved in closed form or by a bounded
   Newton that starts from V (no state from the last frame):
   - V: where the facing sides (offsets of c_a and c_b by h) cross.
   - θ: the angle between the arms' tangents at V's feet.
   - r0 = style · (cr/3) · min(2h, 1.5h·tan(θ/2)); style 0 (sharp) or 1
     (round) from the builder pins, then `crs` (topology-fixed).
   - fit: r1 = min(r0, room · tan(θ/2)), room = min over a, b of
     (s_cap − W − |V's foot − s_root|), clamped at 0.
   - feasibility: r = min(r1, r_max), where r_max is the largest radius
     whose ball still touches both arms within their spans (bisection to
     1/64 px; continuous because the feasible set is [0, r_max]).
   - q at h + r from both centrelines (Newton from V along the bisector);
     the feet t_a, t_b are the local minima of |q − c| reached from V's
     feet (K992 S3 F4's tracked foot, within the frame); the overlap gate
     ω = ss(1 − ov/ovw), ov = how much nearer another part of either arm
     comes to q than its foot, ovw = 0.05h (F1 row 17). The fill is the
     curvilinear triangle V, t_a, t_b outside the ball, at weight ω.
5. Tiles: 16×16 device px. A tile lists the segments within
   h + W + 1 px of it and the corners within r + h + W + 1 px of it.

**Per pixel, on the GPU:**

- Pieces: the local minima of |p − c_i(s)| over the tile's segments,
  one per chain within |Δs| ≤ σ (σ = π·h, K868 §3.4), each with (chain,
  s, d, z, surface). A piece's surface is G when s lies in an arm span of
  G, else the piece itself. A fill is a piece of its corner's group.
- Cover: piece P covers p iff d_P < h; fill F covers p iff p is in F.
- Top surface: z_S(p) is the z of S's nearest covering piece (a fill
  takes its corner's nearer foot's z); top = argmax_S z_S. The label is
  (top, its nearest piece's chain and s).
- Exposed-outline terms of the top surface S, each a distance D_τ and an
  exposure weight w_τ in [0, 1]:
  1. a side foot: for each piece A of S within h + W, f_A = c_A + h·(p −
     c_A)/d_A, D = h − d_A, w = 1 − max over the other pieces B of S
     (and fills) of inside(f_A, B) · ramp_B, where inside is
     [|f_A − c_B| < h], c_B read from a window of ±3 segments around B's
     own nearest segment, and ramp_B is the cap fade (F3 D2);
  2. exposed endpoints: each corner's tangent points t_a, t_b, and V when
     r = 0 (sharp), D = |p − E|, w = 1 − ω for V and ω for t_a, t_b; plus
     every other crossing of two member sides that the CPU found exposed
     (a list per group, usually empty);
  3. fillet arcs: for each corner of S with p in the wedge from q
     between t_a and t_b, D = |p − q| − r, w = ω.
- Ink: ink(p) = max_τ w_τ · band(D_τ), band(D) = 1 − ss(W − aa, W + aa,
  D), aa half a device px. With every w binary this equals band(min D)
  over the exposed terms: the exact definition. The max keeps it
  continuous while a w fades.
- Depth tie (F3 D4): with the two highest surfaces S1, S2 within ε_z,
  ink = mix(ink_S2-on-top, ink_S1-on-top, ss(−ε_z, ε_z, z_S1 − z_S2)).
- Colour: paper outside every tube; the reveal masks multiply ink as
  today; the tint (goal 7) and the hover rim (K345: a second band width
  on the same D) read the label.

```glsl
// SEG[k] = a, b (device px); SA[k] = chain, s0, ds, z0, z1, surfLo, surfHi
// TILE[t] = offset, count into IDX; CRN[c] = q, r, ta, tb, V, surf, omega
Piece P[4]; int n = 0;
for (int i = 0; i < TILE[t].count; ++i) {           // pass 1: pieces
  int k = IDX[TILE[t].offset + i];
  vec2 du = segDist(p, SEG[k]);                    // distance, parameter
  if (du.x > h + W + aa) continue;
  float s = SA[k].s0 + du.y * SA[k].ds;
  mergeOrInsert(P, n, SA[k].chain, s, du.x,        // same chain, |ds| <= sigma: keep
                mix(SA[k].z0, SA[k].z1, du.y),      //   the nearer; else keep 4 nearest
                surfaceOf(k, s), k);
}
int top = argmaxSurfaceZ(P, n, fillsCovering(p));  // z of each surface's nearest piece
if (top < 0) return paper;
float ink = 0.0;
for (int a = 0; a < n; ++a) if (P[a].surf == top && P[a].d < h + W) {  // term 1
  vec2 f = c(P[a]) + h * normalize(p - c(P[a]));
  float bur = 0.0;
  for (int b = 0; b < n; ++b) if (b != a && P[b].surf == top)
    bur = max(bur, insideWindow(f, P[b].seg, 3) * capRamp(P[b]));
  bur = max(bur, insideFills(f, top));
  ink = max(ink, (1.0 - bur) * band(h - P[a].d));
}
for (int c in tileCorners(t)) if (CRN[c].surf == top) {   // terms 2, 3
  ink = max(ink, CRN[c].omega * band(length(p - CRN[c].ta)));
  ink = max(ink, CRN[c].omega * band(length(p - CRN[c].tb)));
  if (inWedge(p, CRN[c])) ink = max(ink, CRN[c].omega * band(length(p - CRN[c].q) - CRN[c].r));
  ink = max(ink, (1.0 - CRN[c].omega) * band(length(p - CRN[c].V)));
}
// the depth tie: the same with the runner-up on top, mixed by ss(-eps_z, eps_z, dz)
```

What it is not: no state between frames, no march, no switch lines, no
walk with a step, no readback. Every input is a closed form or a bounded
solve of the current frame, and the CPU part is O(samples + corners).

### F3 · Every discrete decision, and its fade

| # | Decision | Kind | Can it flip in motion? | Fade, parameter, width |
|---|---|---|---|---|
| D1 | Same-chain pieces within σ are one piece | continuous except a hairpin tighter than about h (a fold; oracle30's limit) | only at a fold, which collision mostly prevents (KINK_MIN_SEPARATION 2.6) | burial by the other piece weighted ss(2σ, σ, Δs): `foldw` = σ |
| D2 | Which surface a piece belongs to (s inside an arm span) | topology-fixed set; the span's end moves continuously | yes, as the cap passes a foot | capRamp: B buries with weight ss(s_cap, s_cap − λ, s_B); `capw` λ = h (a look call only if a ramp shows) |
| D3 | The cap: the first of the chain's end, the next root, a crossing cut | min over a candidate set fixed by the diagram, each candidate continuous (L = h·cot(θ_c/2) is continuous in θ_c) | no: a min over a fixed set is continuous. No cut loop, no h/8 walk (the K1000 and K1015 classes) | none needed |
| D4 | Which surface is on top | continuous z; a flip at z_S1 = z_S2 | yes, at grazing crossings far from their pins, the k42 cyclic triple, group against group | `zt` ε_z = 0.1·amp (amp 0.6032: ε_z 0.06), the two orders mixed |
| D5 | Whether a corner has a V | V exists while the facing sides cross inside both spans | yes, at a split (K1001) or as an arm shortens | none needed: r → 0 before V leaves (room → 0 and tan(θ/2) → 0 both drive r1 to 0); V itself is an exposed endpoint that moves continuously |
| D6 | Which part of an arm the ball touches | continuous while one local minimum is nearest | yes, at grazes (K992 j152/1) | the overlap gate ω = ss(1 − ov/ovw): `ovw` = 0.05h (brief: a parameter) |
| D7 | Sharp or round per corner | topology-fixed (builder pins, `crs`) | no, only on an edit | none |
| D8 | r = min(r0, fit, r_max) | continuous, and monotone in room | no | none |
| D9 | An END arm's extension to c′ | topology-fixed (the arm's kind); c′ continuous | no | none (its cap is buried by construction) |
| D10 | Exposed or buried, per foot | continuous in effect: at the flip the foot sits on the exposed endpoint E, so D_foot = D_E | no | none (term 2 is what makes it continuous) |
| D11 | K943's crossed pair inside a group | topology-fixed bit | no | none |
| D12 | Group clusters | topology-fixed (chains without a cut between junctions) | no; two groups that only come near each other stay two surfaces, ordered by depth (D4) | none |

Two of the hypothesis' known problems do not arise in this form:
- **The closing that jumps at 2ρ.** No general closing is applied: a
  fillet exists only for the export's adjacent arm pairs (topology), and
  its r reaches 0 continuously through fit and r_max. A gap between two
  members that are not an adjacent arm pair never fills.
- **Where a corner exists.** Corner identity is topology (D7); its
  geometry fades through r → 0 (D5, D8) and ω (D6).

What can still pop, by design: nothing outside the four fades (D1, D2,
D4, D6), each over a stated width. A census against the float64
reference (F7) checks it.

### F4 · The alternatives, ruled out with numbers

Step 2 (F2-F4) done 22:00.

**(a) The CPU FieldModel made incremental (S3a10).** S3a5
(`K868_s3a5_incremental.md`, which calls it "S3a9"; the ledger and this
brief say S3a10) measured and estimated it on def and muse_hash, in
Node on the desktop:
- best case, the warm corner solves alone with no fallback: 1.8 ms p50,
  3.2-3.6 ms p95 (measured, §3a);
- a realistic incremental frame: 6-14 ms p50 without cold fallbacks
  (estimated), 10-30 ms with them as prototyped, 50-150 ms with today's
  step test (the warm passReach walks alone measured 24-69 ms p50);
- from scratch, today: 251-338 ms (def) and 525-660 ms (muse).

Even the 6-14 ms best case is CPU time on the desktop, on the main
thread, every frame in motion; the phone's CPU is slower still, and the
frame's whole budget is 16.7 ms. It also fails the binding calls: a
warm start is state between frames, so the label is not a pure function
of the frame, and the warm/cold switch is itself a discrete decision
(the fallbacks are where it pops). Ruled out as the renderer; it stays
the look reference.

**(b) A smooth-min SDF blend.** `.claude/probes/K1040/smin_dev.cjs` on
def at dpr 2 (h 11.6 px, W 4.4 px): 563 junction corners, 484 of them
filleted (θ < 179°); θ from 45° to 180°, most at 60-105°.
- The fillet's apex, matched per corner, needs k from 0.01 to 20.9 px
  (p50 19.7): no single k fits. The best single k (13.4 px) leaves the
  apex up to 3.35 px off the exact fillet, and the outline up to 3.44 px
  off anywhere along the corner.
- Even with k matched to each corner's apex, the smin outline leaves the
  arc by up to 0.62 px off the bisector: 20x check #12's 1/32 px.
- The band is the worse part. smin is not a distance, so its level sets
  are not parallel: the band's inner edge (the −W level) sits up to
  8.30 px from where the exact band's does, at the best single k. The
  stroke would swell in every acute corner.
- Plain min (k 0, no fillet) is 10.5 px off at the apex.
A smooth-min is continuous, but it is a different look from the G1
rolling-ball corners Levi chose (F1 row 5, K881 sheet E), and a
per-corner k needs the same CPU corner pass as form B. No look question
arises: the look is decided.

**(c) A raster coverage mask plus jump flooding.** The band needs the
distance to the exposed outline only within W + aa ≈ 5 px, so a JFA
needs steps 4, 2, 1 (27 taps a pixel) plus a +1 pass (36 taps). K923
measured about 0.15 ms per full-screen tap on the Pixel 11 (6.75 ms for
45 taps), so the flood costs 4.1-5.4 ms before the coverage mask itself
(the label pass, 1.83 ms on the Pixel): 5.9-7.2 ms against the 4 ms
budget. Its error: distances to pixel centres, ±0.5 px (±0.7 px on a
diagonal) against 1/32 px, and the mask flips a whole pixel whenever the
outline crosses a pixel centre, a 1 px pop in motion by construction.
Making it subpixel needs the analytic outline at the mask's edge, which
is form B again. Ruled out.

**(d) Form B exact on the GPU.** Measured by the prototype: F5.

### F5 · Form B on the GPU, measured

Step 3 done 22:11 (desktop measured; the phone estimated, since it was
not connected: `adb devices` listed nothing).

**The prototype** (`.claude/probes/K1040/`: `proto.html`, `proto.js`,
`run.mjs`, `run_locked.ps1`) is a standalone WebGL2 page, with no pixi
and no app code. Per scene it:
- transforms the S1a export to device px;
- computes the depth hats and the groups (arm spans, union-find, the
  crossing cut at s ∓ 2h);
- computes the corners (q, r, t_a, t_b, V, ω) at the straight arms;
- bins segments and corners into 16 px tiles;
- uploads it all as textures.

One fragment shader then evaluates form B per pixel:
- pieces: the nearest point of each chain within σ, at most 4;
- the top surface by z;
- side feet with their burial tests;
- the corner terms (wedge arc, t_a, t_b, V).

Timing uses `EXT_disjoint_timer_query_webgl2`, which Chrome exposes on
the desktop (RX 6800 XT, ANGLE D3D11). Each scene is timed three ways:
- 60 frames on rAF;
- 40 queries each waited for (the "synced" loop);
- K923's render sync as a check: 3×30 draws, each ending in a 1 px
  readPixels, minus a floor shader.

The desktop's timings are bimodal, and the cause is inferred, not
checked: a GPU power state. The same draw reads 2.7-4.9x apart between
the two query loops. The fast state agrees with the render sync, so the
tables give both: the fast state, and the slow state (the synced p50).

**Desktop, dpr 2, each scene's own camera** (2480×1800 = 4.46 Mpx;
results_dpr2_1793250529903.json):

| scene | h / W px | GPU ms, fast (rAF p50 / sync) | GPU ms, slow (synced p50) | CPU prep p50 (tiles) | CPU prep max |
|---|---|---|---|---|---|
| def | 11.6 / 4.4 | 0.98 / 1.0 | 4.78 | 5.6 ms (2.7) | 38 ms |
| fat | 11.8 / 4.5 | 0.72 / 0.7 | 3.36 | 3.3 ms (1.5) | 22 ms |
| muse_hash | 17.0 / 6.5 | 1.55 / 1.5 | 7.52 | 6.0 ms (3.3) | 8 ms |
| ring | 19.3 / 7.3 | 0.53 / 0.5 | 2.33 | 1.3 ms (0.8) | 3 ms |

The upload adds 0.6-1.3 ms. The CPU max is the first, cold repetition.
fat's prep read 7.9 ms p50 in an earlier run, so run-to-run spread is
large.

**Candidates per pixel**, max / p95 over the frame's pixels, which are
mostly empty: p50 is 0-18.

| scene | tile list (loop) | segments within reach | pieces | corners in the tile | burial tests |
|---|---|---|---|---|---|
| def | 71 / 41 | 37 / 21 | 3 / 2 | 10 / 5 | 14 / p99 5 |
| fat | 40 / 32 | 22 / 17 | 4 / 2 | 0 / 0 | 0 |
| muse_hash | 94 / 62 | 54 / 33 | 3 / 2 | 13 / 7 | 14 / p99 7 |
| ring | 45 / 25 | 31 / 15 | 3 / 2 | 7 / 3 | 14 / p99 0 |

**At the phone's buffer.** Here `--fit 822x1506` fits the knot into the
Pixel 11's portrait buffer at dpr 2, so h is about 5.7 px and the
density is the phone's
(`results_fit822x1506_1793250456645.json`):
- def: 0.50 ms (render sync) / 0.68 ms (rAF p50) fast, 1.84 ms slow.
  CPU prep 8.0 ms p50, of which tiles 4.4 ms. Tile list 98 / 67;
  within reach 38 / 21; corners 11 / 6.
- fat: 1.0 / 1.25 ms, 1.29 ms synced, so no fast state was seen in this
  run. CPU prep 3.2 ms. Tile list 63 / 49.

**The Pixel 11, estimated.** The ratio comes from K923's disc search,
calibrated by `calib()` at 822×1506 on the desktop with timer queries:
- desktop: 29 taps 0.095 ms, 45 taps 0.135 ms (floor 0.040);
- Pixel: 4.50 and 6.75 ms (K923);
- ratio: 47-50x on totals, 71-82x over the floor.

The estimates for def at the phone's buffer, from 0.5-1.84 ms on the
desktop:
- fetch-bound: 24-150 ms;
- ALU-bound, at an FP32 spec-sheet ratio of about 13x (a guess, not
  measured): 6.5-24 ms.

K892 measured the same class of work on the Pixel: G3-1's per-pixel
searches (up to 64 SAMP points with segment math) cost +24.5 to +48 ms.

So form B by per-pixel tile loops misses check #13 (≤ 4 ms on the Pixel
at dpr 2):
- by 1.6x at the most optimistic end;
- by 6-40x on the fetch evidence.

A perfect binning would not rescue it. Looping only over the segments
within reach (21 instead of 67 at p95) cuts the loop about 3x, which
still gives 8-50 ms fetch-bound.

**What it shows.**
- The definition itself is cheap. Per pixel it touches at most 4 pieces,
  13 corners and 14 burial tests (p95 2 / 7 / 0).
- The cost is the search for candidates: up to 98 segments a pixel at
  the phone's density, to find the 2-3 that matter.
- On the desktop, form B per pixel fits easily: ≤ 1.5 ms fast and
  2.3-7.5 ms slow at 4.46 Mpx.
- The search must not be a per-pixel loop. The rasterizer can do it:
  each segment's quad reaches exactly the pixels within its reach, as
  K923's label and band passes do. That path was measured on the Pixel
  itself at 2.67 ms worst median (LOD + packed label, p95 3.43 ms),
  against estimates here.

The CPU binning (0.8-4.4 ms on the desktop) goes with it. The rest of
the prep (depth, groups, corners: 0.3-2.7 ms) must become incremental
or move off the main thread. The depth already exists per particle in
the physics.

**Caveats.**
- The prototype draws the tube boundary (D = 0) as a hard, aliased cut:
  F2's band AA covers only the inner edge. The real outer edge needs
  coverage blended over the next surface, so the label carries the
  runner-up surface near the outline.
- `muse_hash_dpr2.png` shows stray ink inside about a dozen junctions.
  The cause is not diagnosed; a corner term is the likely suspect. Its
  look is therefore not the definition's, and it was not checked
  against a reference. The timing is valid for the amount of work, not
  for correctness.
- Debug tint: blue marks pixels whose top surface is a junction group.

### F6 · What survives of the open items

F6 done 22:21. Each verdict is against F2's definition as F7 builds it:
- a raster label;
- form B evaluated in the band strips;
- no FieldModel, march, walk or switch line in the frame.

"S<n>" is a stage of F7.

| Item | What it is | Verdict |
|---|---|---|
| K1000 | V's folds and the live/unsolved flips pop (class 1) | **Carried.** A corner is a closed form of the frame (F2 step 4). There is no march, so no live or unsolved state. V is an exposed endpoint whose weight fades with ω (F3 D5, D6). Closes when S4 lands and its census shows no corner pops outside ω's fade. |
| K1001 | Sharp or round where two threads split; Levi has not seen it in motion | **Still needed:** it is Levi's look call. F2 draws the sharp point: fit takes r to 0 continuously (F1 row 8). A round variant would put a floor on r, which is a new look. Only the route changes: Levi sees it behind S4's flag, not with `lbp`. |
| K1007 (S3a8c) | Window range records, the crossing rows' hypot near test, the p95 spread | **Moot.** All three belong to the FieldModel's per-frame CPU build, which leaves the frame. Its p95 lesson becomes part of S5's gate: no allocation per frame, p95 reported. |
| K1010 (S3a8d) | The GPU finds the switch lines | **Moot.** Form B has no switch lines. A depth switch is F3 D4's fade, designed in S1 and drawn in S4. |
| K1015 | passReach steps by h/8, so the reach moves in steps | **Moot.** There is no walk. Depth is depth.ts's closed-form hats per sample, and a cap is a minimum over a fixed candidate set (F3 D3). |
| K1022 | c23w's CPU build costs 1.75x master's | **Moot.** The FieldModel leaves the frame. It stays as the off-line look reference, where its cost does not matter. "Cut it with S3a10" is ruled out (F4 a). |
| K1033 | At a span bound on a vertex, the GPU and the CPU disagree | **Carried, in general form.** Spans are intervals of s. The GPU and the reference both read s as s0 + t·len of the same segment, so each bound has one owner by construction. One tie remains: two segments of one chain at equal z around a vertex, where draw order decides. That is S1's question 1. Closes when S3's gate passes on muse_hash (0 DEFECT pixels against the reference). |
| K1037 | K992's census and test tools | **Partly still needed.** `oracle_m25dbg` and `march27` are moot, since the march goes. Three census lessons stay: label_pops calls a pop "none" when the nearest event is far; vitest `SWEEP=1` ends in the onTaskUpdate timeout; the census ran 2x its estimate. Write them into S6's brief, then close. |
| K1039 | S3a8b5's gate-1 and raster tools | **Mostly moot.** same24, same28 and raster26 test the old label's layout. One lesson stays: a page tool must not count the favicon 404 as an error. S3's gate tool gets a favicon or filters it. Close when S3 lands. |
| K1041 | The corner march's remaining switches | **Carried.** Every switch on its list belongs to a march or a walk: the hop onto a far piece, the sharp fallback, Newton refusals, the part walk's start gate, boolean cluster roots, rc's J, the restart's weight. F2's corner has no march. Its discrete parts are D5-D8, each continuous or faded. Closes when S4 lands. |
| K1043 | A 33-pixel band run decided by one label pixel under eps; hairpins; fills without margins | **Carried.** In F2 no pixel reads a neighbour's label to decide a run: each strip pixel's ink comes from its own analytic distance, so one pixel cannot decide 33. The hairpin is F3 D1's fold fade, whose width S1 sets. The reference gives fills their margins (S1). Closes when S1's reference and S4's census pass. |
| K972 | Tube-against-tube switches missed (twist eyes), small islands missing, an open hook at loop tips | **Carried.** The depth test plus D4 handles tube against tube with no switch search. Every outline piece has its own strip, so no search can miss an island. At a loop tip F2 inks the exposed outline of the union, which closes the teardrop (K910's rule). Closes when S4's checks pass on g41_user_tw64 and sheet K's cases. |
| K973 | A line missing inside a loop; missing junction ticks; extra free ends | **Carried.** The causes are K972's: a search that misses, a switch line that adds a segment. Closes when S4's free-end check (K910, K934) matches the reference on all 12 scenes. |
| K979 | S3a4's measurement leftovers | **Moot.** The switch keys go with the switch lines, and the knot-mode p50 is the FieldModel's. One lesson stays: S5 records a master drag baseline before it measures. |
| K985 | Point counts change between frames; knot mode and the settle never recorded; the 8x zoom assumed | **Still needed, all three, for the new census.** A change in a chain's point count changes the strip instances, so S3 rebuilds instances on a count change, as `label_band_gpu.ts`'s BandEdgeLayout does. S6 records knot mode and the settle, and checks the zoom. |
| S3a10 | The CPU FieldModel made incremental | **Moot.** Ruled out as the renderer (F4 a). |

**What of oracle30 seeds the reference.** `.claude/probes/S3a/oracle30.ts` on `k868-s3a` (872 lines) evaluates the old label definition in float64, at the census's disputed pixels.

Carries over:
- the float64 segment geometry and its s parameterization;
- depth, through `depthAt` (the same pinned hats as depth.ts);
- the margin framework: EDGE, CUT and DEPTH margins with eps 1e-3 px plus ulp(D), which file a pixel as boundary rather than defect;
- the verdict classes (agree, fix, DEFECT, both, boundary, undefined) and TOL 32/255;
- the driver that evaluates a census's popped pixels;
- the PNG writer.

Does not carry over, because it is the old definition:
- the cut lines and bilinear claims (K1033's undefined folds);
- the cluster cut lines, and `FieldModel.clusterAt`, whose spans come from the passReach walk;
- the band emulation (`prepBand`, `bandAt`) and the packed word.

The reference needs four things oracle30 lacks:
- form B's three terms;
- the corners in closed form (F2 step 4, as `proto.js` computes them);
- the fades (D1, D2, D4, D6);
- coverage (the band with aa) instead of a binary label.

It reads master's `src/render/field/` directly: geom.ts, depth.ts, scene.ts and checks.ts.

### F7 · The staged plan

Step 4 done 22:27.

**The design the plan builds.**

- **The label pass (K923's).** Every chain segment is drawn as a capsule of radius h, depth-tested on z. Every corner's fill is drawn too: the curvilinear triangle between the two arms' sides and the fillet arc.
  - It writes the top surface per pixel (the packed R32UI word: surface, chain, s) and a depth that can be sampled.
  - The rasterizer is the candidate search. A capsule reaches exactly the pixels it covers, which is the search F5 shows a per-pixel loop cannot afford.
- **The band pass.** One instanced strip per outline piece: each tube edge at ±h (two per segment), each fillet arc, each dead end's cap.
  - A strip reaches W + aa inside its piece and aa outside.
  - Its fragment evaluates only its own piece's terms of F2: the side foot with its burial weight, the endpoints at its ends, and the arc with ω.
  - Burial is tested against the arms of the piece's own group, read from a per-group arm table: at most 4 arms of at most 9 segments each. F5 counted at most 14 tests per pixel, p99 at most 7. So there is no search.
  - The fragment inks only where the label says its surface is on top, and writes coverage with MAX blending. F2's ink is a max over terms, so the max over overlapping strips equals F2's ink exactly, provided every term's support lies inside the strips that evaluate it. S1 checks that.
- **The CPU prep, per frame:** depth per sample, the arm spans and their caps, and the corners in closed form. There are no tiles. F5's prototype spent 0.3-2.7 ms on these on the desktop.

K923 measured the same two passes on the Pixel, with its own band test (a similarity test against the label across the edge):
- label 1.83 ms; label + band 5.3 ms at full detail;
- with LOD and the packed label: 2.67 ms worst median, p95 3.43 ms.

Form B's band fragment does more than K923's test: a foot, up to 14 burial tests, and the corner terms. So S4a measures the band on the Pixel before anything is built on it.

S4 is split into two halves (S4a, S4b) so each fits the 2 h cap. F6's "S4" means both halves.

| Stage | Model, cap | After | Proves |
|---|---|---|---|
| S1 · The reference | Opus, 2 h | - | The definition is continuous and watertight on real scenes. Settles five questions. |
| S2 · The reference's sheets and census | Sonnet, 1 h | S1 | How the reference differs from the look reference, every difference attributed |
| S3 · The label pass | Opus, 2 h | S1 | The GPU's top surface equals the reference's; what the label costs |
| S4a · The band: tube edges and burial | Opus, 2 h | S3 | Term 1 on the GPU meets check #12; what the band costs on the Pixel |
| S4b · The band: corners, ties, the outer edge; the flag | Opus, 2 h | S4a | All of F2 on the GPU, checks #12 and #13; Levi's first look in motion |
| S5 · The CPU prep in budget | Opus, 2 h | S3 | The prep fits the Pixel's frame |
| S6 · The census in motion | Sonnet, 1 h | S4b | No pops outside the fades in knot mode, the settle and the zoom |
| S7 · Paint on the field | Opus, 2 h | S4b | Tint, hover rim, reveal masks and explore on the new field |
| S8 · The switch-over | Sonnet, 1 h | Levi accepts | The flag on by default; the old paths deleted |

This is about 15 h of agent time. Code agents run two at a time on different files:
- S2 runs beside S3;
- S5 runs beside S4a or S4b. Both take the perf lock for their timings;
- S6 runs beside S7.

**S1 · The reference (Opus, 2 h).**

It builds `src/render/field/form_b.ts`: F2 in float64, pure TS, beside the oracle. Nothing in the app imports it.
- It reads geom.ts, depth.ts and scene.ts.
- oracle30 lends the margin framework, the verdict classes, TOL and the PNG writer (F6).
- Its vitest pins run on small committed fixtures. The S1a scenes are untracked (`.claude/probes/K868/scenes/`), so the run over all 12 is a probe script.

It settles five questions, each by the reference's own checks:
1. **A surface's z at a pixel.** F2 says the nearest member's. A depth test computes the max over covering pieces, and two segments of one chain at equal z tie on draw order (K1033). The candidates:
   - write F2 in the max form;
   - key the depth test on z − d/K (the cone trick): among equal z the nearest piece wins, a continuous trade between z and d.
2. **The cap at both ends of a burial pair.** F2 fades B's burial by B's ramp. Suppose A's own foot is buried up to s_cap(A) and exposed past it, because A's piece becomes its own surface there. Then it flips at the cap unless A's ramp also fades it.
3. **D4 in raster form.** The top surface's strip does not know the runner-up's z. The candidates:
   - tie strips over each crossing pair's tie band: K923's switch strips, moved to where |Δz| < ε_z;
   - a second depth layer, under a stencil limited to the tie bands.

   First count the tie-band pixels per frame on the recordings. If only grazing crossings and the k42 cyclic triple (F3 D4) have any, the cheaper option wins.
4. **The outer edge's AA.** A strip also covers aa outside its piece. Its fragment blends its coverage over the label fetched across the edge (K923's fetch across), so no runner-up label is needed. The reference computes coverage the same way.
5. **The prototype's stray junction ink on muse_hash** (F5's caveat). Diagnose it against the reference, so S4 does not inherit it.

Gate:
- checks.ts's checks 1-9 and 11 pass on the reference's ink, on the 12 scenes;
- label_pops' rule (`scripts/label_pops.ts`) holds on the reference over its four recordings (def_drag, def_flow, muse_drag, muse_flow): no pixel changes more than the motion explains, outside the four fades;
- every term's support lies inside the strips that evaluate it (the max decomposition);
- the free-end check (K910, K934) runs on the reference.

Levi does not look.

Reuses `src/render/field/` (geom, depth, scene, scene_export, checks) and oracle30's parts. Deletes nothing.

**S2 · The reference's sheets and census (Sonnet, 1 h).**
- It draws the reference on the 12 scenes, as whole frames and junction crops, beside the FieldModel's look (the look reference) and master's. It runs the reference's census over every recording.
- Gate: every difference from the look reference is attributed, either to a change S1 made on purpose (named) or to a defect sent back to S1.
- Levi looks only if a crop shows a look difference. Each one becomes a look question, with its crop beside the current look.
- Reuses the layout of K868's sheets (`.claude/probes/K868/sheets/`) and `scripts/label_pops.ts`.

**S3 · The label pass (Opus, 2 h).**

It draws the label, depth-tested, into the packed R32UI label and the depth texture:
- capsules per chain segment, and the corner fills;
- surfaces from the topological groups and the arm spans (s per fragment), with the depth key S1 chose;
- static instances, rebuilt only when a chain's segment count changes (K985).

It also ports proto.js's prep (depth, groups, corners), without the tiles. It counts the groups per scene against the packed word's 8 cluster bits (255; def's junction ids reach j175), and widens the field if needed.

Gate:
- oracle30-style verdicts at every pixel centre on the 12 scenes: 0 DEFECT. K1033 closes;
- the label's own pops over the recordings fall only inside the fades;
- on the Pixel, by render sync at dpr 2, the label costs at most 2 ms (K923: 1.83 ms). On the desktop, by timer query;
- its page tool does not count the favicon 404 as an error. K1039 closes.

Levi does not look; a debug view sits behind the probe hook.

Reuses:
- label_pass.ts: the targets, the two draws, the state restore;
- label_glsl.ts: the packed word, whose cluster bits become the surface;
- label_band_gpu.ts: the static instance layout;
- label_tables.ts: the s, span and pin tables per fragment;
- label_app.ts: the glue, camera, fallback and `__knotLabel`.

It keeps one point table, not two. The candidates:
- SAMP (samp_table.ts, read through fabric_sdf.ts's sampAt), which the renderer already keeps in page-lifetime FloatRows and uploads by dirty rows;
- label_tables'.

The stage measures both uploads and keeps one.

It deletes nothing: the old flags stay until S8.

**S4a · The band: tube edges and burial (Opus, 2 h).**

It draws:
- the tube-edge strips and the dead-end caps;
- term 1: the foot, with burial against the group's arm table and F3 D1-D2's fades;
- the endpoint terms where a burial ends;
- MAX blending, and coverage by S1's rule.

Its gate runs on fat (no corners) and on the straight parts of the others:
- the GPU's ink against the reference's, through checks.ts' InkProbe (coverage from luminance, run ends by interpolation): ΔF ≤ 1/32 px (check #12) away from corners;
- on the Pixel, by render sync at dpr 2, label + band ≤ 4 ms (check #13), measured before going on. If it misses, try K923's LOD and the packed label first, then fewer burial reads (narrower windows in the arm table).

Levi does not look yet.

Reuses label_band.ts (`buildBandStrips`: one instanced quad per outline piece, with its outward normal) and label_band_gpu.ts.

**S4b · The band: corners, ties, the outer edge; the flag (Opus, 2 h).**

It adds:
- the fillet-arc strips and the corner terms (V, t_a, t_b, ω);
- S1's rules for D4 and the outer edge;
- a new flag param appended to CODEC_PARAMS, off by default.

Gate:
- check #12 everywhere, and checks 1-9 and 11, on the GPU frames;
- the pop census over the recordings (`scripts/label_pops.ts` driving the new passes): no pops outside the fades. K1000, K1041 and K1043 close;
- the free-end check against the reference on all 12 scenes, and the checks on g41_user_tw64 and sheet K's cases. K972 and K973 close;
- check #13 on the Pixel.

Levi's first look in motion is here: behind the flag, on the desktop and the Pixel. The look questions are asked here, each with crops beside the current look:
- K1001's split corners (sharp, as F2 draws them);
- the fade widths (foldw = σ, capw = h, zt = 0.1·amp, ovw = 0.05h), wherever a fade shows.

Reuses junction_field.ts's record textures as the pattern for the corner table.

**S5 · The CPU prep in budget (Opus, 2 h).**
- It measures depth, spans and corners per frame in the app on the Pixel.
  - It records a master drag baseline first (K979's lesson).
  - The prep allocates nothing per frame, and p95 is reported (K1007's lesson).
- Gate: the prep's p95 in a Pixel drag is at most 2 ms. That number is a proposal; Levi or the coordinator sets it. If the prep misses, three remedies:
  - compute the groups only when the diagram changes;
  - run the corner solve as a GPU pass (one instance per corner, into a float table);
  - or run it in the physics worker.
- Reference: S3's verdicts are unchanged after the move.
- Levi does not look.

**S6 · The census in motion (Sonnet, 1 h).**
- It records knot mode and the settle, and checks the 8x zoom (K985).
- It runs the pop census and the free-end check on the GPU path over every recording, against the reference.
- Its brief carries K1037's three census lessons.
- Gate: no pops outside the fades; free ends equal the reference's.

**S7 · Paint on the field (Opus, 2 h).**
- It moves the app's paint onto the field:
  - the highlight tint (goal 7), from the label's chain and s;
  - the hover rim (K345), as a second band width on the same D;
  - the reveal masks (K275, K268), multiplying the ink;
  - the explore view.
- Gate: the paint and reveal probes pass under the flag, and the reveal sheets match master's away from junctions.
- Levi looks in motion at the whole app, behind the flag.

**S8 · The switch-over (Sonnet, 1 h, after Levi accepts).**

It turns the flag on by default and deletes:
- the `lbi`/`lbp` label path: label_pieces.ts, label_switch.ts, and the FieldModel's per-frame use;
- G3-1's gap search, which K892 keeps until this point.

What it keeps:
- the FieldModel, as the off-line look reference, until the reference replaces it;
- junction_field.ts, arm_strip.ts and gap_mask.ts, which serve the ribbon looks. They go only if those looks also move to the field.

Gate: the full suite and the deploy.

**Where the float64 reference and the census come in:**
- S1 builds the reference and runs the census rule on it, so the definition is shown continuous before any shader exists;
- S2 compares it with the look reference;
- S3 gates the label against it, pixel by pixel;
- S4a and S4b gate the ink against it (ΔF, the checks, free ends), and S4b runs the census on the GPU;
- S5 reruns S3's verdicts after the prep moves;
- S6 runs the census everywhere.

**Look questions.** None this stage.
- Smooth-min's rounding does not arise: the look is decided (F4 b).
- The fade widths become look questions only where a fade shows in motion. The prototype's frames are not the definition's look (F5's stray ink), so a crop now would mislead. S4b asks them, with crops beside the current look.

## Handoff

Written 22:28 2026-10-28, by the K1040 stage agent (started 21:32). The Order is done, inside the 2 h cap.

**Done.**
- F1-F7 above:
  - the binding looks and the rule that carries each (F1);
  - form B as a per-pixel definition (F2) and its discrete decisions with their fades (F3);
  - the alternatives ruled out (F4);
  - the GPU cost, measured on the desktop and estimated for the Pixel (F5);
  - a verdict on each open K868/K992 item (F6);
  - the staged plan S1-S8 (F7).
- The timing prototype, committed under `.claude/probes/K1040/`:
  - `proto.html` and `proto.js`: form B per pixel, with CPU tiles;
  - `run.mjs`, the headed-Chrome runner;
  - `run_locked.ps1`, the runner under the perf lock;
  - `smin_dev.cjs`, F4 b's smooth-min deviation.
- No production code; nothing under `src/`, `test/` or `scripts/` changed. Nothing pushed.

**The verdict.**
- Form B is cheap per pixel: at most 4 pieces, 13 corners and 14 burial tests.
- Searching for those candidates per pixel misses the Pixel's 4 ms by 1.6-40x (F5).
- The search goes to the rasterizer: K923's label and band passes, with form B's terms evaluated in the band strips and MAX blending (F7).

**Next: S1, the float64 reference** (F7). It settles F7's five questions first:
1. a surface's z (max or nearest; the cone key);
2. the cap at both ends of a burial pair;
3. D4 in raster form, after counting the tie-band pixels;
4. the outer edge's AA;
5. the prototype's stray ink on muse_hash.

The coordinator files F6's verdicts in the ledger: closes the moot items and retargets the carried ones to their stages.

**Rerun the prototype** (from the worktree; no dev server, it loads `proto.html` from file://):

```powershell
$sc = 'C:\Users\lsl\Repositories\knotmaze\.claude\probes\K868\scenes'
& .claude\probes\K1040\run_locked.ps1 -RunArgs @("$sc\def.json", "$sc\fat.json", "$sc\muse_hash.json", "$sc\ring.json")
& .claude\probes\K1040\run_locked.ps1 -RunArgs @("$sc\def.json", "$sc\fat.json", '--fit', '822x1506', '--calib')
```

- `run_locked.ps1` takes the perf lock (`$env:TEMP\claude-perf.lock`, owner K1040), waits up to 20 min for another owner, and deletes the lock after.
- Flags: `--dpr 2` (default), `--cr 3` (corner rounding: r scales by cr/3; default 3), `--fit WxH` (fit the knot into a phone-sized buffer), `--calib` (K923's disc-search calibration at 822×1506), `--out <dir>`.
- Outputs go to `.claude/probes/K1040/out/` (untracked): `results_*.json` and a PNG per scene.
- Chrome is headed, off-screen, ANGLE D3D11, with a fresh temporary profile.
- The timer query needs `EXT_disjoint_timer_query_webgl2`, which the desktop has and the Pixel 11 does not.

**Residuals.**
- Stray ink inside about a dozen muse_hash junctions in the prototype. Not diagnosed; S1 question 5.
- The Pixel numbers are estimates: the phone was not connected (`adb devices` empty). S3 and S4a measure them by render sync.
- The desktop's timer readings are bimodal (2.7-4.9x). The cause, a GPU power state, is inferred, not checked.
- The prototype's outer edge is a hard, aliased cut (S1 question 4, S4b).
- The prototype's CPU prep reads 0.3-2.7 ms without tiles, and its first (cold) repetition, with tiles, up to 38 ms. S5 owns the budget.
