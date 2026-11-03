# K412: the worker preload on the real network

Question (K412, batch 4 run E): K7's worker-chunk preload was measured on
localhost only. On a fresh load through levi.dev's proxy, is the worker
chunk downloaded once, with the worker's own fetch served from the cache?
The same check against knotmaze.pages.dev directly isolates what the
proxy changes. Desktop Chrome only, as the brief directs (no phone).

**Answer: yes — through the proxy the chunk is downloaded once on every
fresh load (5/5), and the worker's own fetch is served from cache
(`transferSize` 0).**

## Method

- URLs: `https://levi.dev/knotmaze/?1471kin&snd=none` and
  `https://knotmaze.pages.dev/?1471kin&snd=none` (a seed link, not the
  bare daily). Production build stamp on both: `P4 v0.4.0 20afc25`.
  Chunk: `assets/physics_worker-DIhbM4cq.js`, decoded 191491 B, encoded
  65622–65758 B (the small encoded range differs by origin), same ETag
  (`"5c18bb3b0e47f8d20f2a70db63474374"`) on both origins.
- `.claude/probes/K7/stage7/k7_frames.mjs` and `phone_lib.mjs` copied
  verbatim to `.claude/probes/K412/`. `k412_run.mjs` there reuses its
  gate collection and adds what it does not collect: response headers
  (page responses, which see both fetches) and warm-profile reloads
  (k7_frames always uses a fresh profile). Per origin: five loads each
  in a fresh Chrome profile, then five loads (first load + four reloads)
  in one warm profile. Desktop headed Chrome, 1280x800, under the perf
  lock (owner `K412`, 2026-10-30 09:34–09:37 -07:00). Raw records:
  `.claude/probes/K412/k412_results.jsonl`.
- Per load the tables give the two `physics_worker` resource entries
  k7_frames collects (start → responseEnd in ms on the page clock,
  `transferSize`, initiator), the worker hello time (the host gate's
  `helloAt`, same clock), and each fetch's response headers
  (`cache-control` / `cf-cache-status` / `age`). The first entry
  (initiator `script`, early start) is the inline head script's
  modulepreload (K1055); the second (initiator `other`, starting at the
  hello) is the worker's own fetch. Every load had `preload` present,
  host kind `worker`, no page errors and no context loss. On
  cache-served entries `responseEnd` can read slightly before `start`
  (the stored response's timing); `transferSize` is the deciding field,
  as the brief states: 0 means the cache served it.
- Cross-check with the verbatim copy, one fresh load per origin:
  levi.dev `wkAll [[255.8, 532.8, 66058, "script"], [612.2, 601.6, 0,
  "other"]]`, hello 617.9 ms; pages.dev `wkAll [[133.1, 201.4, 65943,
  "script"], [377.8, 376.7, 300, "other"]]`, hello 383.2 ms. Same shape
  as the runner's tables.

## levi.dev (through the proxy)

Chunk headers on the downloaded response, every load:
`cache-control: public, max-age=14400, must-revalidate`; `age` absent
on all 20 loads' responses (both fetches). `cf-cache-status` below is
the edge status on that response (on cache-served responses it replays
the stored response's value).

| Load | Preload start→end · transfer | Worker start→end · transfer | Hello (ms) | Preload cf | Worker response |
|---|---|---|---|---|---|
| fresh 1 | 457.2→669.2 · 66058 | 1348.0→1339.8 · 0 | 1353.6 | MISS | 200, max-age=14400, MISS |
| fresh 2 | 454.7→948.5 · 65940 | 1040.3→1028.4 · 0 | 1046.5 | MISS | 200, max-age=14400, MISS |
| fresh 3 | 249.7→518.0 · 66058 | 624.6→610.6 · 0 | 633.5 | REVALIDATED | 200, max-age=14400, REVALIDATED |
| fresh 4 | 496.0→804.5 · 66058 | 935.0→926.9 · 0 | 940.8 | REVALIDATED | 200, max-age=14400, REVALIDATED |
| fresh 5 | 416.6→561.4 · 66058 | 784.2→776.8 · 0 | 789.6 | REVALIDATED | 200, max-age=14400, REVALIDATED |
| warm 1 | 394.2→700.6 · 66058 | 795.3→783.9 · 0 | 801.2 | REVALIDATED | 200, max-age=14400, REVALIDATED |
| warm 2 | 3504.5→3504.5 · 0 | 3531.1→3523.1 · 0 | 3536.7 | REVALIDATED | 200, max-age=14400, REVALIDATED |
| warm 3 | 164.2→164.2 · 0 | 184.5→178.4 · 0 | 189.6 | REVALIDATED | 200, max-age=14400, REVALIDATED |
| warm 4 | 220.1→220.1 · 0 | 241.0→234.7 · 0 | 246.5 | REVALIDATED | 200, max-age=14400, REVALIDATED |
| warm 5 | 156.8→156.8 · 0 | 175.8→169.6 · 0 | 182.9 | REVALIDATED | 200, max-age=14400, REVALIDATED |

Fresh hello median 940.8 ms (range 633.5–1353.6); warm median 246.5 ms
with one 3536.7 ms outlier reload (warm 2; its transfers are still 0/0,
so the outlier is page start-up, not the chunk). Warm preloads also read
`transferSize` 0: the 4-hour freshness covers reloads too, no
revalidation request at all.

## knotmaze.pages.dev (direct)

Chunk headers on the downloaded response, every load:
`cache-control: public, max-age=0, must-revalidate`; no
`cf-cache-status` header and no `age` on any response (shown as —).

| Load | Preload start→end · transfer | Worker start→end · transfer | Hello (ms) | Preload response | Worker response |
|---|---|---|---|---|---|
| fresh 1 | 171.8→243.9 · 65922 | 812.0→810.3 · 300 | 817.4 | 200, max-age=0, — | 304 |
| fresh 2 | 143.6→211.2 · 65922 | 421.9→417.8 · 300 | 428.4 | 200, max-age=0, — | 304 |
| fresh 3 | 166.1→208.8 · 65944 | 460.8→458.5 · 300 | 466.2 | 200, max-age=0, — | 304 |
| fresh 4 | 185.3→249.9 · 65944 | 446.7→443.7 · 300 | 452.5 | 200, max-age=0, — | 304 |
| fresh 5 | 211.8→265.7 · 65943 | 468.5→466.6 · 300 | 474.4 | 200, max-age=0, — | 304 |
| warm 1 | 156.4→208.5 · 65944 | 734.5→458.4 · 300 | 740.3 | 200, max-age=0, — | 304 |
| warm 2 | 3200.8→3244.5 · 300 | 3294.7→3286.0 · 300 | 3300.0 | 304 | 304 |
| warm 3 | 72.0→84.6 · 300 | 147.9→145.9 · 300 | 153.7 | 304 | 304 |
| warm 4 | 71.8→93.3 · 300 | 126.0→124.2 · 300 | 130.9 | 304 | 304 |
| warm 5 | 76.4→91.6 · 300 | 321.7→182.7 · 300 | 326.7 | 304 | 304 |

Fresh hello median 466.2 ms (range 428.4–817.4); warm median 326.7 ms
with the same one slow first reload (3300.0 ms). Direct loads say hello
sooner than proxied ones in this run despite the revalidation — the
proxy hop costs more than one 304 round trip on this desktop link.
That ordering is this run's observation, not a phone prediction.

## Reading

Observed: through the proxy the body moves over the network exactly
once per fresh profile (one ~66 kB transfer; the worker entry is 0 in
10/10 levi.dev loads, fresh and warm-first alike), and warm reloads
move nothing. Directly on pages.dev the body also moves once, but the
worker's fetch is never `transferSize` 0: it revalidates in 10/10
loads (300 B of headers, a 304, the body then served from cache), and
on warm reloads the preload revalidates too.

The header that makes the difference is `cache-control`. The proxy
serves the chunk `max-age=14400` (the 4-hour browser cache CLAUDE.md
records for proxied non-HTML), so the response the preload stored is
still fresh when the worker fetches milliseconds later. Pages serves
the identical chunk (same ETag) with `max-age=0, must-revalidate`, so
every later fetch — the worker's seconds later in the same load
included — must revalidate first. Nothing in the request breaks: both
fetches name the same URL, the preload is present and adopted
(`prebuild: adopted` in the cross-check), and the 304s prove the cache
held the body; only the freshness lifetime differs.

So the preload works as designed on the canonical address, and no fix
is owed for the proxy path. For direct pages.dev loads the same
freshness fix is filed as K1084 (long `max-age` for hashed `/assets/*`
on Pages, e.g. `_headers`): its cost there is one revalidation round
trip plus 300 B per fetch (two per warm reload), not a second download.
K412 closes on the tables above.

## After K1084 (2026-11-02, fc9b0eec)

Same runner and URLs as above, on the build that added `public/_headers`
(`P4 v0.4.0 fc9b0ee`), under the perf lock (owner `K1091`, 2026-11-02).
The runner now also records each load's navigation timing (for K1086).
Chunk headers on the downloaded response, every load, both origins:
`cache-control: public, max-age=31536000, immutable` (Pages serves the
rule from `_headers`; the proxy passes the same value through, with
`age` present on its edge HITs).

### levi.dev (through the proxy)

| Load | Preload start→end · transfer | Worker start→end · transfer | Hello (ms) | Preload cf | Worker response |
|---|---|---|---|---|---|
| fresh 1 | 215.7→403.6 · 66088 | 745.5→737.9 · 0 | 750.9 | MISS | 200, max-age=31536000, MISS |
| fresh 2 | 233.8→360.1 · 66100 | 661.9→654.7 · 0 | 667.4 | REVALIDATED | 200, max-age=31536000, REVALIDATED |
| fresh 3 | 167.5→202.0 · 66088 | 308.5→300.0 · 0 | 313.8 | HIT | 200, max-age=31536000, HIT |
| fresh 4 | 168.5→217.0 · 66088 | 322.3→314.3 · 0 | 327.6 | HIT | 200, max-age=31536000, HIT |
| fresh 5 | 165.8→203.7 · 66100 | 341.9→332.9 · 0 | 347.4 | HIT | 200, max-age=31536000, HIT |
| warm 1 | 164.7→199.9 · 66088 | 315.1→305.2 · 0 | 320.3 | HIT | 200, max-age=31536000, HIT |
| warm 2 | 3397.5→3397.5 · 0 | 3419.6→3414.1 · 0 | 3424.7 | HIT | 200, max-age=31536000, HIT |
| warm 3 | 95.3→95.3 · 0 | 114.4→108.5 · 0 | 119.3 | HIT | 200, max-age=31536000, HIT |
| warm 4 | 119.7→119.7 · 0 | 138.9→133.7 · 0 | 143.9 | HIT | 200, max-age=31536000, HIT |
| warm 5 | 100.9→100.9 · 0 | 117.1→112.0 · 0 | 121.8 | HIT | 200, max-age=31536000, HIT |

Fresh hello median 347.4 ms (range 313.8–750.9); warm median 143.9 ms
with the same one slow first reload (3424.7 ms, transfers still 0/0).

### knotmaze.pages.dev (direct)

| Load | Preload start→end · transfer | Worker start→end · transfer | Hello (ms) | Preload response | Worker response |
|---|---|---|---|---|---|
| fresh 1 | 85.1→153.1 · 65943 | 275.8→269.4 · 0 | 281.4 | 200, max-age=31536000, — | 200 (cache) |
| fresh 2 | 76.3→121.2 · 65943 | 243.6→237.3 · 0 | 249.0 | 200, max-age=31536000, — | 200 (cache) |
| fresh 3 | 79.5→105.4 · 65943 | 302.5→296.9 · 0 | 308.5 | 200, max-age=31536000, — | 200 (cache) |
| fresh 4 | 99.8→164.7 · 65943 | 299.4→293.0 · 0 | 304.8 | 200, max-age=31536000, — | 200 (cache) |
| fresh 5 | 94.2→134.1 · 65943 | 272.3→264.8 · 0 | 278.0 | 200, max-age=31536000, — | 200 (cache) |
| warm 1 | 111.0→169.5 · 65943 | 350.7→344.4 · 0 | 355.7 | 200, max-age=31536000, — | 200 (cache) |
| warm 2 | 3680.9→3680.9 · 0 | 3702.5→3698.2 · 0 | 3707.2 | 200, max-age=31536000, — | 200 (cache) |
| warm 3 | 61.8→61.8 · 0 | 84.0→77.6 · 0 | 89.4 | 200, max-age=31536000, — | 200 (cache) |
| warm 4 | 60.0→60.0 · 0 | 81.2→76.5 · 0 | 86.1 | 200, max-age=31536000, — | 200 (cache) |
| warm 5 | 61.5→61.5 · 0 | 81.5→77.1 · 0 | 86.2 | 200, max-age=31536000, — | 200 (cache) |

Fresh hello median 281.4 ms (range 249.0–308.5); warm median 89.4 ms
with the same one slow first reload (3707.2 ms, transfers still 0/0).

On pages.dev the worker's fetch is now served from the cache in 10/10
loads (`transferSize` 0, status 200, no 304) where it revalidated in
10/10 before, warm reloads 2–5 move nothing at all, and the fresh hello
median fell from 466.2 ms to 281.4 ms. Through levi.dev the worker's
fetch stayed `transferSize` 0 as before and warm reloads still move
nothing, while the fresh hello median fell from 940.8 ms to 347.4 ms —
the long-lived origin response lets the proxy edge HIT instead of
revalidating, so no separate proxy fix is owed.
