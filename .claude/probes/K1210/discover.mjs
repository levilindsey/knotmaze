// K1210 (batch 22 Run H) discovery: which junctions can carry the fire,
// the collapse and the pulse. Loads K1139's stands (stands_cyc.mjs, links
// and moves verbatim) effect-off, then with the burn race on, then with
// collapse on, and dumps the head, its arms and the junctions one hop out.
//   node discover.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, dumpPulses, sleep } from "./lib.mjs";
import { STANDS, linkOf } from "./stands_cyc.mjs";

const OUT = join(import.meta.dirname, "out");
mkdirSync(OUT, { recursive: true });
const BURN = "&gm=burn&fck=turn&fsp=0.6&fdl=0&fbt=gone";
const COLLAPSE = "&fg=collapse";

const walkDump = (page) =>
  page.evaluate(() => {
    const fb = window.__knotFabricRenderer(), k = window.__knotFabric(), W = fb.walk;
    const arms = (v) => { const x = W.vertices.get(v); return x ? x.edges.reduce((n, eid) => n + (W.edges[eid].va === W.edges[eid].vb ? 2 : 1), 0) : 0; };
    const info = (v) => {
      const x = W.vertices.get(v);
      if (!x) return { v, missing: true };
      return {
        v, arms: arms(v), isEnd: !!x.isEnd,
        edges: x.edges.map((eid) => { const e = W.edges[eid]; return { eid, far: e.va === v ? e.vb : e.va, len: +e.length.toFixed(3), chain: e.chain }; }),
      };
    };
    const near = new Set([k.head]);
    for (const c of k.choices) { near.add(c.far); }
    for (const eid of k.pathEdges) { const e = W.edges[eid]; near.add(e.va); near.add(e.vb); }
    const frontier = [...near];
    for (const v of frontier) for (const eid of W.vertices.get(v)?.edges ?? []) { const e = W.edges[eid]; near.add(e.va); near.add(e.vb); }
    return {
      head: k.head, start: W.start, exit: W.exit, walked: k.walked, fire: k.fire, collapse: k.collapse,
      broken: k.broken, choices: k.choices.map((c) => c.edge),
      junctions: [...near].map(info).filter((j) => (j.arms ?? 0) >= 3 || j.v === k.head),
    };
  });

async function run(browser, name, query, moves) {
  const log = [];
  const page = await openPage(browser, query, log);
  try {
    await waitAsleep(page);
    await viewStill(page);
    const refused = [];
    for (const eid of moves) if (!(await moveEdge(page, eid))) refused.push(eid);
    await sleep(300);
    const pulses = await dumpPulses(page);
    const walk = await walkDump(page);
    return { name, query, moves, refused, head: pulses.head, headArms: pulses.headArms, choices: pulses.choices, reach: pulses.reach, spacing: pulses.spacing, pulses: pulses.pulses, walk, errors: log.filter((l) => l.includes("pageerror")) };
  } finally {
    await page.close();
  }
}

const browser = await openBrowser();
const results = [];
try {
  for (const name of ["fork", "cross", "four", "cyc", "x4"]) {
    const st = STANDS[name];
    results.push(await run(browser, name + ":off", linkOf(st), st.moves));
    console.log(`${name}:off done`);
  }
  for (const name of ["fork", "four", "cyc"]) {
    const st = STANDS[name];
    results.push(await run(browser, name + ":burn", linkOf(st) + BURN, st.moves));
    console.log(`${name}:burn done`);
    results.push(await run(browser, name + ":collapse", linkOf(st) + COLLAPSE, st.moves));
    console.log(`${name}:collapse done`);
  }
} finally {
  await browser.close();
}
writeFileSync(join(OUT, "discover.json"), JSON.stringify(results, null, 1));
for (const r of results) {
  console.log(`\n== ${r.name} head ${r.head} arms ${r.headArms} refused [${r.refused}] walked ${r.walk?.walked} fire ${JSON.stringify(r.walk?.fire)} collapse ${JSON.stringify(r.walk?.collapse)}`);
  for (const j of r.walk?.junctions ?? []) console.log(`   ${j.v} arms ${j.arms} end ${j.isEnd} edges ${j.edges?.map((e) => `e${e.eid}->${e.far}(${e.len})`).join(" ")}`);
  for (const p of r.pulses) console.log(`   pulse e${p.edge} ${p.near}->${p.far} lat ${p.lattice?.toFixed?.(2)} world ${p.world?.toFixed?.(2)} farArms ${p.farArms} cont ${p.cont}`);
}
