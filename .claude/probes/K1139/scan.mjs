// K1139 scan: walk a link and dump, at every head, the declared pulses with
// lattice vs world spans, dist0, cont and far-junction arm counts.
//   node scan.mjs <query> <steps> [out.json]
// Each step takes the first choice that does not go back along the arrival.
import { writeFileSync } from "node:fs";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, dumpPulses } from "./lib.mjs";

const [, , QUERY, STEPS = "6", OUT] = process.argv;
const browser = await openBrowser();
const log = [];
const states = [];
try {
  const page = await openPage(browser, QUERY, log);
  const asleep = await waitAsleep(page);
  await viewStill(page);
  for (let s = 0; s <= Number(STEPS); s++) {
    const d = await dumpPulses(page);
    states.push(d);
    console.log(`== step ${s} head ${d.head} (${d.headArms} arms) reach ${d.reach} spacing ${d.spacing}`);
    for (const p of d.pulses) {
      console.log(`  e${p.edge} ch${p.chain} ${p.near}->${p.far} in=${p.inward ? 1 : 0} dist0=${p.dist0.toFixed(2)} cont=${p.cont ? 1 : 0} lat=${p.lattice.toFixed(3)} world=${p.world.toFixed(3)} d=${(p.world - p.lattice).toFixed(3)} far:${p.farEnd ? "END" : p.farArms + "arms"}`);
    }
    if (s === Number(STEPS)) break;
    const last = d.pathEdges.length ? d.pathEdges[d.pathEdges.length - 1] : -1;
    const pick = d.choices.find((c) => c.edge !== last && !c.farDeadEnd) ?? d.choices.find((c) => c.edge !== last) ?? d.choices[0];
    if (!pick) break;
    await moveEdge(page, pick.edge);
  }
  console.log("asleep:", asleep, "ctxLost:", await page.evaluate(() => window.__ctxLost));
} finally {
  if (OUT) writeFileSync(OUT, JSON.stringify({ query: QUERY, states, log }, null, 1));
  await browser.close();
}
