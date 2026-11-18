# K1482 s4 running notes (update at each finding)

## Mirror setup (load-bearing)
- Link A uses gfh=1 = home membership ON (frame_loop.ts:228-230). The page's tables are built
  with buildTables(scene,{aa}) (homeOn false; gf_app.ts:416, gf_worker.ts:405, gf_build.ts:55)
  and gf_pass.ts:782 uploads {...T, homeOn:true}. Captured tables_gf.json says homeOn false.
- So mirror runs MUST use HOME1=1 (scene_tables.ts). Home-off mirror runs do not match the GPU.
  Home-on mirror matches the GPU frame at j4 j14 j47 j59 (out/s4/sheets/gpu_vs_mirror_home_on.png).
- mirror_caps.py and older K1482 mirror tools likely built home-off tables too: check before trusting.
- px_probe.ts: one pixel through GfEval (pieces, keys, groups, arms). Tile coords as mirror_tiles.

## Item 1, notches (j4 j14 j41 j47 j59 t4s t16e t45s t58e)
- Cause: at a T junction (end arm meets a through thread) a crossing pin near the junction cuts the
  through arm's Lcut (= ahead - reach - h) to ~0-0.3; solveGfCorners rejects the concave pair
  (L0 or feet-out gate). With home on, the cut arm's pieces still join the group out to aHome, so
  the two outlines meet in a sharp V / notch with no fillet. Same family as item 0's sharp V.
- Gate tally, all junctions, master: corner pass 157, feet out 144, th out 76, L0 70, null r 47.
- Candidate: retry the pair with corner arms extended to Lcut + KEXT*h (env GF_KEXT, reverted):
  - KEXT 1: 90 sites change; rounds some sharp Vs (t71s t63e t82s j7 t30s t73s); notches unchanged.
  - KEXT 1.5: 180 sites; fixes j14 j47 t58e, t4s rounded, t16e slightly better; rounds many tail
    sharp corners incl. wedge sites j50 j158 t73e j147 (Levi's sharp-V card decides these);
    possible new light specks t73s, j1.
  - KEXT 2: 206 sites; fixes j14 j47, improves j4 t58e; regresses t4s (crescent), t16e (tick).
  - Unconditional (home off) it breaks: wedges/blobs at t55e t71s t63e j58 t6e t27e t14e t76e.
  - Landing needs: corners keyed on home (buildTables home option: gf_app.ts is another agent's),
    and Levi's sharp-V answer. Not landed. nK 198 -> 325 / 358 / 351 (KEXT 1 / 1.5 / 2).

## Item 2
- dots (home-off look, not rechecked home-on): winKind 4 tangent + partial ink haze at tail tips (j64, t1s).
- j58 tick (home-on): pixel tile (36,26) = chain 43 side stroke (winKind 1), inside chain 23's fill.
  Chain 23 is a 1.46-long open chain whose start tip ends 0.17 from chain 43's centreline; both in
  group 59. nK = 0 there (no corner at all, also with KEXT 1.5): the T between 23's end and 43 has no
  fillet; the stroke is the true union's inward band at the concave point. Missing-corner family.
