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
