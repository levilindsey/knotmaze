# Ledger cull candidates (2026-11-25, with docs/design/gf_default_gate.md)

Read from `ledger.mjs show` / `section` on master 4d7beacac. Nothing here is edited in LEDGER.md: the
coordinator files what Levi accepts. Confidence: **sure** (the ledger itself says so), **likely** (follows
from a landed commit or from adopting the gate), **ask** (Levi named it, or a check is needed first).

Counts: (a) 7 · (b) 18 · (c) 72 · (d) 10 · also noticed 6 (not counted in a-d).

Group (c) holds only if Levi takes the gate and the outline recommendation (freeze now, delete after the
flip). No residual on today's renderer itself is proposed: it stays on screen while gf compiles (K1456) and
as the fallback, and it draws overlays gf lacks (K1387). Form B's own residuals (K1046-K1048, K1093, K1103,
K1105, K1117, K1259, K1267) are kept too: gf ports form B's tables, and form B is the probes' reference.

## (a) Waiting on Levi: answered or overtaken (7)

- K1596 · junction rule landing call · answered "junction land" Nov 24; landed as K1588, 140abd573 · sure
- K1589 · gap step's five calls · balls answered (stage 6, wedge from the centre), loops answered (K1601), eye and junction located (x100, x305), stems via K1595 (today's look is the bar), gaps landed f915561ca and c2d628e03; only the optional "closed sides again" was never taken · likely
- K1444 · gf home-membership looks, three questions · (1) became K1523 (technical: land or drop), (2) and (3) continue as K1582 · likely
- K1377 · Pixel screen-locked overnight on 2026-11-13 · a one-night note; stage 7 is long past and K1362 has been paused since 11-14 · likely
- K185 · still pluck's cold-link stall, about 340 ms · its own text says it is probably moot (K307's warm-up links the program early); not measured · ask
- K394 · overnight 2026-10-15 calls F1-F8 · all answered except K90's spline bend, which K339 and K361 also ask · ask
- K585 · marks on the October open-work report page · the refresh trigger is K138 s4 slice 2, and K138 is paused; Levi now reviews through per-topic pages · ask

## (b) In progress, no activity since 2026-11-10, owner gone (18)

For each, the proposal is to move it to Done with its last merge, and to keep any open call that already has its own Waiting item. K8 and K268 sit on the boundary (their last activity was 2026-11-10 05:01-05:48).

- K7 · physics worker with render interpolation · default since stage 6; stage 7 merged; nobody since 10-15 · sure
- K5 · split main.ts and ribbon_renderer.ts · M1-M4 merged; nobody since 10-15 · likely
- K74 · maze-design mechanisms, stages 1-3 · merged; nobody since 10-15; calls K261 and K664 stay · likely
- K80 · the minotaur · turns 3a merged; nobody since 10-15; calls K401 and K696 stay · likely
- K307 · daily intro cold-compile freezes, warm-up · stage 2 merged 10-15; gf's cold compile is K1456 · likely
- K397 · thread-reveal stub artifacts on today's renderer · issues 1, 2, 4 and 5 fixed 10-15; issue 3 (the dark U) is today's look; recheck under gf · likely
- K459 · a pluck at a stub stops short · merged 10-15; Levi asked for it, so confirm the merge did it · ask
- K370 · worker input latency, target 50 ms · stage 1 merged 10-20 (110 ms desktop); move the target to Next rather than drop it · likely
- K546 · loss effects animate to the meeting point · merged 10-20; Levi's calls taken (K629) · likely
- K137 · K80 section 4's cheap mechanisms · merged 10-21; calls K705, K721, K736, K746, K768 and K779 stay · likely
- K114 · gameplay round 2 (burn, cut, beat, spider) · merged 10-21; calls K400, K627, K694, K706, K753 and K754 stay · likely
- K580 · the a's J join (cursive) · merged 10-21; cursive paused by Levi on 11-11 · ask
- K115 · cursive text, Hershey script · waits on K580 since 10-20; cursive paused · ask
- K138 · K80 section 4's M mechanisms · paused at slice 2 per Levi on 10-21; keep it or move it to Next, but do not drop · ask
- K1220 · text forks: disc with round edge · paused 11-06 for K1240 S2's verdict, a route that has since ended · ask
- K1139 · choice pulses across junctions · paused 11-09; a lane Levi named; recheck under gf (pulses draw there since K1473) rather than on today's · ask
- K8 · G3 SDF ribbons from a shared sample texture · phone stage done 11-10; gf supersedes the ribbon route · likely
- K268 · shaped crossing gaps under thread reveal · waits on K156's phone window since 11-10; Levi asked for it; recheck under gf · ask

## (c) rp=outline items that become moot if gf is the default and outline retires (72)

In progress (6):
- K1240 · one outline for both looks (umbrella) · the route moved to K1362; nobody since 11-10 · likely
- K1247 · outline frame cost, 3 ms bar · 183-193 ms at s36; waits on K1362 · likely
- K1278 · outline paint seamless across junctions · stage 3 unmerged since 11-11 · likely
- K1283 · outline junction borders against form B · merged; nobody since 11-11 · likely
- K1291 · outline in the app: palette, overlays · nobody since 11-11; gf carries these · likely
- K1314 · outline artifacts to zero · paused since 11-12, waiting on K1362 · likely

Next (12):
- K1254 · outline flat typed-array layout · speed work on a retired path · likely
- K1256 · outline frame() deopt leads · as above · likely
- K1311 · route bands in outline fans · gf's are K1424 · likely
- K1335 · outline end-tail shades at j28 · outline-only · likely
- K1339 · zChains in a second worker · outline speed · likely
- K1340 · outline fill on the GPU · outline speed · likely
- K1353 · outline pieces cache · outline speed · likely
- K1360 · outline worker pool on the Pixel · outline speed · likely
- K1359 · remove K1247's incremental options · becomes "delete src/render/outline/" after the flip · likely
- K1315 · under-tail ends in rp=outline · Levi named the bar: re-point it at gf, do not drop it · ask
- K1045 · junction eyes, DECIDED (form B's open eye) · the outline part is moot; check the decision on gf · ask
- K1049 · through-pass bends, DECIDED (rounded corner) · the outline part is moot; check the decision on gf · ask

Residuals (42):
- K1245 · K1240 S2 open work, L=0 arms · outline-only · likely
- K1248 · outline frame() rebuilds the piece list · likely
- K1250 · pulse glow in a junction not smooth · Levi named it; recheck under gf instead · ask
- K1258 · row measure's tA term at corner arcs · outline probe · likely
- K1264 · end-tail cost +1.8 ms · outline speed · likely
- K1274 · tail that comes and goes, g41 c105 · outline · likely
- K1275 · seam station inside a cut · outline · likely
- K1276 · prototype verify --ref 48 failures · outline tool · likely
- K1281 · outline jumps after stage 17 · likely
- K1287 · END-arm feet further from form B · likely
- K1288 · addPointAtC branch flip on a fold · likely
- K1289 · K1278 paint edge seams · likely
- K1292 · k1240s4_crops substep drift · outline tool · likely
- K1294 · outline border motion guard missing · likely
- K1295 · K1278 foot search raised fill p50 · likely
- K1296 · outline GPU paint vs CPU twin unmeasured · likely
- K1298 · outline def j45 hard under-pass · likely
- K1299 · outline caps at alpha 1 · likely
- K1300 · K1278 seam tool's frozen reference · likely
- K1301 · outline worker frame after K1283 s3-s4 · likely
- K1303 · outline round-end seams · likely
- K1304 · outline def gain hold max · likely
- K1306 · outline palette outlier at the muse finish · likely
- K1307 · X strokes in the outline band · likely
- K1308 · outline reveal looks against today's · likely
- K1309 · K1291 s2 reveal checks not run · likely
- K1312 · outline fan-gate spokes · likely
- K1313 · band_gpu pass slots overflow · likely
- K1316 · outline record fill 1 px paper · likely
- K1318 · outline fallback builder lacks thruRoomC · likely
- K1320 · ob=1 band records decimate mid-drag · likely
- K1323 · K1314 census reference seam · outline tool · likely
- K1326 · k1247s22 census caches form B tiles unkeyed · outline tool · likely
- K1330 · K1314 census reference paper crack · likely
- K1337 · K1247 s27 fan rule worse at 7 junctions · likely
- K1343 · k1247s29 bench's fat link is codec v9 · first check that no other script uses that link · likely
- K1345 · faint outline residue at muse_hash x58 · likely
- K1351 · outline under-pass diagonal shading · likely
- K1355 · band GPU vs CPU tie 0.49 · likely
- K1361 · outline update memory-bound past 6 workers · likely
- K1363 · draw.ts CONTACT_CACHE history dependence · likely
- K1364 · outline band blend stacks the two runs · likely

Ideas (12):
- K1252 · outline frame() in the physics worker · likely
- K1255 · outline corner integrator in WASM · likely
- K1260 · K1247 clear-margin certificate · likely
- K1261 · K1247 reuse corners across frames · likely
- K1262 · K1247 setupBorders deopts · likely
- K1268 · K1247 recompute only what moved · likely
- K1305 · outline redraws every frame at rest · likely
- K1329 · one strip rule for fillFrame and recStrip · likely
- K1342 · zChains toward 2 ms · likely
- K1348 · outline hold tolerance · likely
- K1349 · outline worker p95 scheduler · likely
- K1465 · outline ignores tlk · moot once retired · sure

## (d) Duplicates and items overtaken by another (10)

- K1310 · course check, gate for rp=outline · superseded by gf_default_gate.md; close on adoption · sure
- K1469 · verify 26B's reveal fix on screen · folded into K1472 stage 2 (its own next says so) · sure
- K1452 · gf fresh-profile cold start blocks 110 s · the same fault as K1456 and K1468 · likely
- K1600 · K1584 + K1588 landing drag check · both have landed (f915561ca, 140abd573); its open half, fresh-profile context loss, is gate 2 (K1468/K1456) · likely
- K1601 · extra gap at sharp turns (loops 2, 13, 14) · rule K landed as K1584 stage 7 in f915561ca; the handle still says "waits for stage 6" · likely
- K1407 · gf look to zero census finds · its work moved to K1438/K1439 (Done 11-16); the bar is now Levi's approved look plus K1436 · likely
- K1414 · pulses and telegraph only in today's look · K1473 Done in bc615b6ae; route bands are K1424 · likely
- K1443 · home fadeLength 0 tie bands · overlaps K1451 (fade dead zone) and K1582's spots · ask
- K1459 · per-thread reveal bar · the bar for K1472's open differences; fold into K1472 · ask
- K1430 · phone pass for gf's vertex cap · inside gate 3 (K1369/K1362 phone runs) · ask

## Also noticed (outside a-d, not counted)

- K1448 · Muse batch 25 tracker · its next still says "25A running"; batches 26 and 27 came after · likely close
- K1464 · Muse batch 26 tracker · last runs passed 2026-11-19; batch 27 is the live chain · likely close
- K1531 · Muse batch 27 tracker · "NO MUSE RUN": queue empty since 2026-11-21 19:28 · ask (keep it if batch 27 continues)
- K1409, K1412, K1442 · gf residuals counted by the form-B census (retired as the bar on 11-15) · fold into gate 7: fix only where Levi's named places show them · ask
