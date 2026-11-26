# Kink diagnosis (2026-11-25)

Levi, on the phone, link `?3.FHH1HtvQ...&rp=gf&gfh=1`: "on the bottom of
the maze, about a third from the right corner, there's a slight kink. In
general, I see more kinks like this than I think we used to with the old
renderer ... Is this a physics issue?" This file records the diagnosis.
Nothing in `src/` changed.

## Verdict

**The kinks are in the centre line, which both renderers share.** The
particle positions come from physics, and Catmull-Rom tightens a lone
sharp particle turn further. `rp=gf` does not change the simulation and
draws exactly the same centre line as today's renderer. It does not
create kinks.

Why gf can still look kinkier: Levi's link uses the **border** look
(`threadLook: border`, borderWidth 0.38). There the visible line is the
offset curve at half width h, and on the inside of a bend its radius is
R - h.
- Wherever the centre line's radius drops under h, the inner border has
  no radius left. gf's exact SDF draws that as a true corner.
- Today's strip renderer clamps the inner offset at 0.95 R
  (`ribbon_mesh.ts`). It pinches the ribbon there instead of drawing a
  corner.
- On this link, today's border look is too broken to compare kink for
  kink (see Side finding), so the outline difference is an inference
  from the code.

## Evidence (one frozen settled state, seed 3, master 843e32370)

Tools: `.claude/probes/kink/`.
- `cap.mjs` makes one real-time capture per renderer: `phw=0`, `fw=0`,
  asleep, physics frozen, clocks pinned, a bit-still view, and gf
  checked to have `passes > 0`.
- `analyze.py`, `attrib.py` and `tuckdev.py` do the measuring.
- `sheets2.py` makes the crops.

Outputs are untracked, under `.claude/probes/kink/out/`.

**Same physics:**
- Hash 15294c37 at sim time 5.0 under both renderers.
- Largest position difference 0.
- Identical view transform.

**Same centre line:**
- `renderer.chainSamples`: largest difference between today and gf is 0.
- gf's vertex table equals those samples. The largest gap is 0.042
  world, and only at the duplicate end points gf drops.
- The drawn samples follow a plain centripetal Catmull-Rom through the
  particles: median deviation 0.005 world.
- 126 of the 127 sharp samples lie on that plain spline. So tuck, flow
  and joinery made none of them; flow was 0 in the capture.

**How much the centre line turns.** h = 0.4 (threadWidth 0.8). There
are 23,978 samples, at 0.09 world spacing.

| Measure | Samples | Places (at least 1.2 world apart) |
|---|---|---|
| Radius R < h | 600 | 190 |
| R < 1.25 h | 1,192 | 276 |
| R < 1.5 h | 2,021 | 334 |
| Turn > 45 deg within +-0.15 world of arc | 127 (attrib.py, duplicates dropped; analyze.py counts 276) | 43 |
| Turn > 30 deg within +-0.15 world | | 139 |

**The particle polygon:**
- 2,626 controls, spaced 0.55 world apart at the median (about 1.4 h;
  P5 0.34, P95 0.75).
- 179 controls turn more than 45 deg and 41 more than 60 deg.
- K90 measured the same thing: at a lone polygon corner, the Catmull-Rom
  radius is cos(phi/2)/2 of the polygon's own radius, which is 0.35 at
  a 90 deg turn. Steps in turn angle make most of the overshoot.

**Where the sharp places are.** Rates of window turn > 45 deg per 1,000
samples:
- **Junction arms, 1 to 1.5 world from a chain's end** (the 2nd and 3rd
  particle from a fused junction terminal):
  - 36.5 per 1,000, against 3.5 far from any end (about 10 times as
    often);
  - 42 of the 127 sharp samples sit in 5% of the line;
  - 8 of the 20 sharpest places sit 0.97 to 1.27 world from an end;
  - in the polygon itself, control offset 3 turns more than 45 deg 13.5%
    of the time, against 6.2% elsewhere.
- **Crossings are not the hot spot.** Within 0.3 world of another chain
  the rate is 2.6 per 1,000, the lowest bucket. At 0.5 to 1.0 world it
  is 7.5 to 8, where a thread peels off a neighbour.
- **The maze boundary is not a hot spot.** At every distance from the
  bounding-box edge the rate is 2.8 to 9.5 per 1,000.
- **Levi's spot** (24.67, 35.10, on the bottom row, about a third of the
  way in from the right):
  - R/h is 1.02 and the window turns 31 deg, between controls 156 and
    157 of chain 71;
  - the neighbouring turns go the other way, so this is an S step in
    turn angle;
  - it is 0.12 world from another chain (at a crossing) and 1.4 world
    from the bottom edge.
  - With R about h, gf's inner border has radius about 0.02 h and reads
    as a notch.
  - In the crop, today's look shows the same bend.

**Inferred mechanism at junction arms (not tested by a change):**
- A tucked bridge or stub arm hugs its host for about 2 controls past
  the merge.
- Junction cover (`particle_system.ts`, graded 1/1/0.7/0.3 over 3
  controls) relaxes the 2D separation floor along that stretch.
- At the end of the stretch the arm has to turn from the host's
  direction to its own within one or two particles.

## Two follow-up captures (same frozen state, hash 15294c37)

**The fill look** (`&tlk=fill`, `out/fill/`). Today and gf draw the
same bends, and the fill hides most of them: only the inner side of a
tight bend shows a small corner, with no line drawn along it. So the
kinks were always in the shape; the border look is what makes them
read as kinks.

**K90's bend bound on** (`BEND='{"ratio":1.25,"soft":true}'` through
`__knotSplineBend`, `out/bend/`, run by `run_bend.ps1` under the perf lock). Physics
was unchanged (the same hash). These numbers come from `attrib.py`
on gf's vertices, with the bound off and then on:

| Measure (places 1.2 world apart) | Off | On |
|---|---|---|
| R < h | 190 | 12 |
| R < 1.25 h | 276 | 19 |
| R < 1.5 h | 334 | 336 |
| Turn > 45 deg within +-0.15 world | 43 | 2 |
| Turn > 30 deg within +-0.15 world | 139 | 38 |
| Levi's spot, window turn | 20.5 deg | 16.9 deg |

The bound moves samples up to about 0.2 world (0.5 h, its maxShift).
In `out/bend/levi_gf_off_vs_on.png`, gf's inner-border notch at Levi's
spot becomes a round bend; a junction's corner beside it stays sharp.

With the bound on, gf still drew (923 passes, no fallback). But
`chanWanted` (`gf_app.ts` ~887) requires `!splineBend.enabled`, so gf
took its non-snapshot path for the tables. That path's cost was not
measured.

## Sheets viewed

`.claude/probes/kink/out/fill/wide_levi.png` and `wide_p14.png`,
`out/bend/wide_p14.png` and `out/bend/levi_gf_off_vs_on.png`.

`.claude/probes/kink/out/a/` holds:
- `sheet_levi.png` and `sheet_worst1..8.png`: 8x, today | gf | today +
  particles + centre line;
- `wide_levi.png`, `wide_p3.png` and `wide_p10.png`: 4x, 5.2 world
  across, today | gf | gf + centre line + particles;
- `whole_pair.png`.

`out/b/whole_b_vs_c.png` shows today's look, unfrozen and frozen.

## Side finding: today's border look is broken on this link

On master 843e32370, today's renderer draws this link's border look with
fragmented borders across the maze interior. Unfrozen and frozen
captures agree (out/b, out/c), and so does the first capture. gf draws
the same state cleanly. Not investigated further.

## Recommendations

1. **Bound the centre line's bend before it is drawn.**
   - What: K90's bend bound (`splineBend` in `spline_generator.ts`). It
     is built but off, and reachable only through the `__knotSplineBend`
     hook. Turn it on at a ratio of about 1.25 h. Measured on this
     state: R < h drops from 190 places to 12, and window turns over
     45 deg from 43 to 2.
   - Where: render side, upstream of `chainSamples`, so both renderers
     get it and physics is untouched.
   - Risks:
     - K90 measured +0.6 to 1.1 ms per update;
     - in 24 of 585 scans the tightest window got tighter (4 with the
       soft clamp);
     - with it on, gf loses its K1369 snapshot channel (`chanWanted`,
       `gf_app.ts` ~887). Lifting that needs the worker to apply the
       bound too;
     - Levi stopped K90 on 2026-10-20 ("stop"), so it needs his word.
2. **Spread the junction arm's departure turn in physics.**
   - What: grade the junction cover out over more controls, or add a
     bending or turn-step term on the 2nd to 4th arm particles, so the
     arm leaves its host over 3 or 4 controls instead of 1 or 2.
   - Where: `particle_system.ts`, at the junction cover setup and the
     bending pass.
   - Risks:
     - junction cover exists so that fabric sleeps (2026-10-10 audit
       F1), so this needs the sleep regression tests;
     - it moves the byte-identity maze goldens;
     - the mechanism is inferred; test it on the arm offsets first.
