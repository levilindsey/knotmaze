// K1139 S4: a link's self-loops (walk edges with va === vb) and the
// fewest-runs walk (edge ids) from the start to each loop's junction, with
// the loop's lattice length and the junction's arm count.
//   node find_cyc.mjs <query>...
import { openBrowser, openPage, waitAsleep, viewStill } from "./lib.mjs";

const browser = await openBrowser();
const log = [];
try {
  for (const QUERY of process.argv.slice(2)) {
    const page = await openPage(browser, QUERY, log);
    await waitAsleep(page);
    await viewStill(page);
    const out = await page.evaluate(() => {
      const fb = window.__knotFabricRenderer(), W = fb.walk, k = window.__knotFabric();
      const arms = (v) => W.vertices.get(v).edges.reduce((n, eid) => n + (W.edges[eid].va === W.edges[eid].vb ? 2 : 1), 0);
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
      const loops = W.edges.filter((e) => e.chain >= 0 && e.va === e.vb && prev.has(e.va))
        .map((e) => ({ edge: e.id, v: e.va, len: +e.length.toFixed(3), arms: arms(e.va), route: route(e.va) }))
        .sort((a, b) => a.route.length - b.route.length);
      return { head: k.head, nEdges: W.edges.length, loops };
    });
    console.log(QUERY, JSON.stringify(out));
    await page.close();
  }
} finally {
  await browser.close();
}
