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
- mediump changes nothing on the Pixel.
- ANGLE (D3D on the desktop): execution continues past `discard`
  (write `discard; return;`), and a `&& !flag` loop condition was
  mistranslated (use `break`).
- The GPU governor: a short pass at one per frame runs near 460 MHz
  against 1286 max; at the app's pacing the clock sits at 825-1100.
  Time passes back to back (sync4) and at frame pacing (frame1), and
  read the clock beside every number (`k1362s3_gpuclk.mjs`).
