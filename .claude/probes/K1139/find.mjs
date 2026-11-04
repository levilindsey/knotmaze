// K1139: list a link's junction kinds and the fewest-runs walk (edge ids)
// from the start to each vertex with >= 4 arms, plus short runs (world arc
// under the reach) that end at a non-END junction (crossing candidates).
//   node find.mjs <query>
import { openBrowser, openPage, waitAsleep, viewStill } from "./lib.mjs";

const [, , QUERY] = process.argv;
const browser = await openBrowser();
const log = [];
try {
  const page = await openPage(browser, QUERY, log);
  await waitAsleep(page);
  await viewStill(page);
  const out = await page.evaluate(() => {
    const fb = window.__knotFabricRenderer(), W = fb.walk, k = window.__knotFabric();
    const arms = (v) => W.vertices.get(v).edges.reduce((n, eid) => n + (W.edges[eid].va === W.edges[eid].vb ? 2 : 1), 0);
    const hist = {};
    for (const v of W.vertices.keys()) { const a = arms(v); hist[a] = (hist[a] || 0) + 1; }
    // BFS by runs from the head.
    const prev = new Map([[k.head, null]]);
    const q = [k.head];
    while (q.length) {
      const v = q.shift();
      for (const eid of W.vertices.get(v).edges) {
        const e = W.edges[eid]; if (e.chain < 0) continue;
        const w = e.va === v ? e.vb : e.va;
        if (!prev.has(w)) { prev.set(w, [v, eid]); q.push(w); }
      }
    }
    const route = (v) => { const r = []; while (prev.get(v)) { const [u, eid] = prev.get(v); r.unshift(eid); v = u; } return r; };
    const big = [...W.vertices.keys()].filter((v) => arms(v) >= 4 && prev.has(v)).map((v) => ({ v, arms: arms(v), route: route(v) }))
      .sort((a, b) => a.route.length - b.route.length).slice(0, 6);
    return { head: k.head, hist, big };
  });
  console.log(JSON.stringify(out, null, 1));
} finally {
  await browser.close();
}
