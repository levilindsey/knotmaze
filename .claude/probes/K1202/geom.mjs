// K1202: e210's geometry on the cyc stand (link and moves verbatim from
// stands_cyc.mjs): runPoint ends, the walk edge's ctrls, node_218's fan
// record/arms/bands, and the kymograph's samp mapping for cols 15..30.
//   node geom.mjs <out.json>
import { writeFileSync } from "node:fs";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, sleep } from "./lib.mjs";
import { STANDS, linkOf } from "./stands_cyc.mjs";
const st = STANDS.cyc;
const browser = await openBrowser();
try {
  const log = [];
  const page = await openPage(browser, linkOf(st), log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  await sleep(300);
  const out = await page.evaluate(() => {
    const k = window.__knotFabric(), r = window.__knotRenderer();
    const e = window.__knotFabricRenderer().walk.edges[210];
    const pts = [];
    for (let i = 0; i <= 256; i++) { const q = k.runPoint(210, i / 256); pts.push([q.x, q.y, q.wx, q.wy]); }
    const fp = r.fieldProbe;
    let ji218 = -1, rec218 = -1;
    for (let ji = 0; ji < 8192; ji++) { const rb = fp.record(ji); if (rb >= 0 && fp.center(ji) === "node_218") { ji218 = ji; rec218 = rb; break; } }
    return {
      head: k.head, edge: { va: e.va, vb: e.vb, ctrlA: e.ctrlA, ctrlB: e.ctrlB, chain: e.chain, length: e.length },
      p0: pts[0], p1: pts[256], pts,
      v221: k.vertexScreen("node_221"), v218: k.vertexScreen("node_218"),
      view: window.__knotView(), spacing: r.pulseSpacing, reach: r.pulseReach,
      ji218, rec218,
      arms218: ji218 >= 0 ? fp.arms(ji218) : null,
      bands: window.__knotPulseBands(),
    };
  });
  writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
  console.log(`head ${out.head}; e210 va ${out.edge.va} vb ${out.edge.vb} ctrlA ${out.edge.ctrlA} ctrlB ${out.edge.ctrlB} chain ${out.edge.chain}`);
  console.log(`runPoint(0) screen ${out.p0.slice(0, 2)} world ${out.p0.slice(2)}; runPoint(1) screen ${out.p1.slice(0, 2)} world ${out.p1.slice(2)}`);
  console.log(`node_221 screen ${JSON.stringify(out.v221)}; node_218 screen ${JSON.stringify(out.v218)}`);
  console.log(`ji218 ${out.ji218} rec ${out.rec218}; arms ${JSON.stringify(out.arms218)}`);
  await page.close();
} finally { await browser.close(); }
