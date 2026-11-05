// K1139 S4: cycle-closing arms by head. For every junction v the start can
// walk to, the lit tree from v (pulseTree's lattice Dijkstra, no gates) out
// to <reach>, and its non-tree arms whose two ends are both lit: the arm,
// its ends' lattice distances, its length and where the ridge sits.
// Sorted by the walk's length from the start.
//   node find_cyc2.mjs <query> <reach> [max=12]
import { openBrowser, openPage, waitAsleep, viewStill } from "./lib.mjs";

const [, , QUERY, REACH = "3", MAX = "12"] = process.argv;
const browser = await openBrowser();
const log = [];
try {
  const page = await openPage(browser, QUERY, log);
  await waitAsleep(page);
  await viewStill(page);
  const out = await page.evaluate((R) => {
    const fb = window.__knotFabricRenderer(), W = fb.walk, k = window.__knotFabric();
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
    const rows = [];
    for (const head of prev.keys()) {
      if (W.vertices.get(head).isEnd) continue;
      const dist = new Map([[head, 0]]), par = new Map();
      const done = new Set();
      for (;;) {
        let cur = null, cd = Infinity;
        for (const [id, d] of dist) if (!done.has(id) && (d < cd || (d === cd && cur !== null && id < cur))) { cd = d; cur = id; }
        if (cur === null || cd >= R + 20) break;
        done.add(cur);
        for (const eid of W.vertices.get(cur).edges) {
          const e = W.edges[eid];
          if (e.va === e.vb || e.chain < 0) continue;
          const o = e.va === cur ? e.vb : e.va, nd = cd + e.length;
          if (nd < (dist.get(o) ?? Infinity)) { dist.set(o, nd); par.set(o, eid); }
        }
      }
      const tree = new Set(par.values());
      for (const e of W.edges) {
        if (e.chain < 0 || e.va === e.vb || tree.has(e.id)) continue;
        const da = dist.get(e.va), db = dist.get(e.vb);
        if (!(da < R) || !(db < R)) continue;
        if (W.vertices.get(e.va).isEnd || W.vertices.get(e.vb).isEnd) continue;
        const [u, w, du, dw] = da <= db ? [e.va, e.vb, da, db] : [e.vb, e.va, db, da];
        const dR = (du + dw + e.length) / 2;
        rows.push({ head, steps: route(head).length, edge: e.id, u, w, du: +du.toFixed(3), dw: +dw.toFixed(3), len: +e.length.toFixed(3), ridge: +dR.toFixed(3), atHead: u === head });
      }
    }
    rows.sort((a, b) => a.steps - b.steps || a.ridge - b.ridge);
    return { start: k.head, rows, routes: Object.fromEntries(rows.slice(0, 40).map((r) => [r.head, route(r.head)])) };
  }, Number(REACH));
  console.log(`start ${out.start}: ${out.rows.length} lit cycle arms over all heads`);
  for (const r of out.rows.slice(0, Number(MAX))) console.log(`  head ${r.head} (${r.steps} moves) e${r.edge} ${r.u}(${r.du}) - ${r.w}(${r.dw}) len ${r.len} ridge dG ${r.ridge}${r.atHead ? " [head arm]" : ""} route ${JSON.stringify(out.routes[r.head])}`);
} finally {
  await browser.close();
}
