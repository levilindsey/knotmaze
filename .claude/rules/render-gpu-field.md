---
paths:
  - "src/render/gpu_field/**"
  - "test/render/gf_*"
---

# Render lore: the per-pixel field on the GPU (K1362, rp=gf)

rp=gf draws form B's junction look per pixel: main builds tables
(`tables.ts`) from the field scene export, `gf_pack.ts` packs them, and
`gf_pass.ts` draws `gf_glsl.ts`'s program. Off by default. The stage
briefs and handoffs are `docs/design/K1362_*.md`; their numbers are
not repeated here.

## Tables

- `buildTables` is bit-identical to its pre-Muse output (digest
  `.claude/probes/K1362/k1362t1_digest.ts`). Hold that: a 1e-13 drift
  in an arc length (hypot to sqrt) moves corner floats by up to 0.1
  and once changed a frame's bin lists, because the corner track
  flips projection segments. A speedup must keep the corner solve's
  input bits, or change the solve under a new gate argument
  (`K1362_t1_muse_tables.md`, addendum 2).

## The pass on the Pixel (stage 4, `K1362_s4_shader.md`)

- Cost follows the per-pixel arrays (MAXP pieces, MAXK keys), not
  the work done: the register footprint sets occupancy. A smaller
  program in front ("tier") handles most pixels; `GF_TIERS` default
  p3/k2 with ramps, then the full program.
- Stage 9 confirmed it on the Pixel: capping the tier's surfaces at 3
  (`s`) and keeping the label as a running best (`lab`) cut def,
  muse_hash and fat by 17-19%, while cutting work without shrinking
  arrays (`fast`) gained nothing.
- Stage 10: dropping a per-piece array pays on the Pixel (the ramp
  group and value folded into psurf, the key reusing ps: 33 slots to
  24, -8 to -11%); packing two arrays into one (lh, cs) or rebuilding
  values from the segment index (kq) is slower. `GF_TIERS` is
  t32rlgyc3. The layering is about 6.2 of def's 11.7 ms.
- Stage 11: per-surface and corner-key state folds (`v`, `a`, `d`, `e`)
  are within noise on the Pixel. What costs is the corner code (def
  3.1-3.8 ms: layers()'s use about 2.25, the scan's keep loop 1.6; fat
  0.8-1.2 though it has no corners, so that part is compile shape), the
  face loop (about 4.2 of the 6.2 ms of layering) and divergence (1.1 /
  1.7 / 0.4 ms on def / muse_hash / fat). Cutting layers()'s corner key
  loop alone is slower: measure every cut. A MAXK 1 tier routes 2.7% of
  def to full and costs 3.75 ms; MAXK 0 does not compile (compile the
  corner code out instead). Stage 8's burial exit (`bx`) is 8-97 px off
  full on 11 of 12 scenes on the Pixel: do not revive it. Run noise is
  about ±0.5 ms on def; the bench keys on the variant name, so repeat
  one as `aid@<tier>`.
- Stage 12: choosing the program per frame pays. `GF_TIERS`
  t32rlgyjfc3 draws a frame whose cells list no corners with the corner
  code compiled out (fat 7.95 -> 6.80 ms at 822); other frames draw
  t32rlgyc3. Routing corner-free CELLS to that program is exact but
  about 3 ms slower on def and muse_hash. The one-pass face loop (`fj`)
  is slower with corner code and gains only on fat without it. Alone,
  def's corner-free cells (55% of pixels) cost 5.72 ms, its corner cells
  8.17: both halves need less per-pixel work.
- Stage 13: a per-cell layering order is provable on only 81-99.9% of
  ink (def 94.5%, muse_hash 81.2%), and dropping the per-surface state
  saves only 0.2-0.4 ms on the Pixel: the cell order is closed, and the
  face loop's work is the cost. Stopping the face loop at the first
  opaque surface (`lz`) is exact but slower (dynamic array indexing).
  Skipping a face that cannot beat its surface's running maximum (`fs`,
  exact since every factor is in [0, 1]) pays in the corner program
  only: `GF_TIERS` t32rlgyjfFkc3, def 12.55 -> 12.01 ms at 822.
- Stage 14: corner-cell pixels keep 0/1/2/3+ corners on 44/49/7/0.5%,
  so the corner code costs by its compile shape, not its trip count. A
  pruned corner list (`P`, 2.85 -> 1.21 walks per corner-cell pixel) is
  level on the Pixel; merging the two corner loops (`M`) is 14-23%
  slower on the desktop. The other exact corner forms (T O G I D H)
  were not timed on the Pixel (`K1362_s14_corner_loops.md`).
- A tier is exact by construction: on overflow it sets a flag,
  breaks and discards, and the next program draws that pixel.
- Routing is by stencil (EQUAL 0, INCR). The LAST program uses KEEP,
  so the Pixel tests the stencil before shading. A routed program in
  the middle writes its route through a discard, so the Pixel tests
  late and shades every remaining pixel: a whole extra pass. Hence
  one tier in front of full, not more.
- Only an EQUAL 0 stencil test rejects early on the Pixel: a program
  behind EQUAL class+1 shades everywhere (stage 5; cause not
  isolated).
- Routing is spent (stage 5, `K1362_s5_tiles.md`): t32r's tier
  already takes 99.7% (def) / 100% (muse_hash) of inked pixels, and
  every exact tile route (quads per class, stencil masks) was
  slower; tile quads alone cost about 4 ms, and the route's CPU
  20-70 ms on the Pixel's main. Cuts now have to shrink the
  per-pixel program itself.
- Keys per bin (stage 6, `gf_keys.ts`): each chain's u range is split
  into bins holding pin search bounds and candidate arms, widened by
  half a bin each side so a bin picked one off by float error is still
  exact. Every program reads them; `#ifdef OLDKEYS` keeps the old full
  ranges for A/Bs. keyBin's two rounded quotients are in K299's
  registry (`paint_ring_lap.test.ts`).
- Desktop gains do not predict the Pixel (stage 6): the register form,
  constant trip counts and packed per-piece state (`gf_reg.ts`, bench
  forms only) were all slower on the Pixel; the pack was faster on the
  desktop, and its ivec4 group is what costs on the Pixel.
- Ramps stay inside the tier: a tier without ramps (t32, ramping
  pixels routed to full) was +5 to +9 ms against t32r on the Pixel, so
  any layering-once fold has to be exact inside the tier.
- The two-pass split (stage 7, `gf_split.ts`, bench forms only) is
  exact on the Pixel but gains only 1-2 ms there (12-37% on the
  desktop), and pass 1 alone (the scan) is 8-11 ms at 822. t32r is
  linear in canvas pixels with a large intercept (def about 8 ms +
  6.6 per Mpx): half of def's time does not scale with the canvas
  (K1376).
- mediump changes nothing on the Pixel.
- ANGLE (D3D on the desktop): execution continues past `discard`
  (write `discard; return;`), and a `&& !flag` loop condition was
  mistranslated (use `break`). So was a float `i < nk && cD > 0.0`
  (stage 14, 2-29 px off on 6 of 12 scenes): keep the loop bound alone
  and test the rest in a `break`.
- The GPU governor: a short pass at one per frame runs near 460 MHz
  against 1286 max; at the app's pacing the clock sits at 825-1100.
  Time passes back to back (sync4) and at frame pacing (frame1), and
  read the clock beside every number (`k1362s3_gpuclk.mjs`).
