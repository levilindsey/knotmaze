# K728: deviation from the lattice after 60 seconds (2026-10-29)

Setup: the K728 link (`?s=5ovogt&gs=24&wd=1&cr=1.52&gap=.02`, zero
temperature) on a local preview build of master, in-thread physics
(`&phw=0`), frozen at sim 0, then stepped with `__knotStepUntil` in
5 s increments to 60 s; positions from `__knotPhysDump({arrays:true})`
(5459 particles). Script: k728.mjs in this folder.

Result: **maximum movement from the start positions 1.1116 world units**
(the lattice pitch is 1), reached inside the first 5 seconds — the hero
relaxation settling. **It stops**: per-5-second maximum movement after
that is 0.00013-0.00036 in the second interval and 0.00003-0.00005
thereafter (jitter at the 1e-4 level, flat to 60 s, no growth).

| sim (s) | max from start | max per 5 s |
|---|---|---|
| 5 | 1.1115 | 1.11155 |
| 10 | 1.1115 | 0.00013 |
| 15 | 1.1115 | 0.00036 |
| 20-60 | 1.1115-1.1116 | 0.00003-0.00005 |

So at zero temperature the default knot does its settling once and then
stays where it settled; nothing keeps creeping for a minute.
