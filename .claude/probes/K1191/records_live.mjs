// K1191 (Muse batch 19 Run D, task 2): the live half of the record map.
// On the x4 and cross stands (links and moves verbatim from diag_s4.mjs's
// STANDS, which copies strips.mjs's shared link k111&am=instant&fw=0&
// snd=none&phw=0 - see the copies' headers), read every junction's
// fieldProbe.record(ji) and center(ji) through __knotRenderer() (the
// ordinary probe surface; no __k1139diag hook, no src change), and name
// the junctions carrying aRec 2129 / 2668. Anchors: ji 28 must read rb
// 2206 on x4/four and ji 33 rb 2591 on cross, as Stage 4's dumps have it,
// or this map does not describe those dumps.
//   K1139_HOST=http://127.0.0.1:5720 node records_live.mjs
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, PIN, sleep } from "./lib.mjs";

const Q = "k111&am=instant&fw=0&snd=none&phw=0";
const STANDS = {
  cross: { q: Q, moves: [0, 246, 82, 83, 199], extra: "" },
  x4: { q: Q, moves: [0, 247, 248, 69, 72, 73, 95, 140, 180], extra: "&pr=8" },
};
const browser = await openBrowser();
try {
  for (const [name, st] of Object.entries(STANDS)) {
    const log = [];
    const page = await openPage(browser, st.q + st.extra, log);
    await waitAsleep(page);
    await viewStill(page);
    for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`${name}: move e${eid} refused`);
    await waitAsleep(page, 20000);
    await page.evaluate(PIN);
    await sleep(200);
    const rows = await page.evaluate(() => {
      const r = window.__knotRenderer();
      const fp = r.fieldProbe;
      const out = [];
      for (let ji = 0; ji < r.junctionArms.length; ji++) {
        const rb = fp.record(ji);
        if (rb < 0) continue;
        out.push({ ji, rb, c: fp.center(ji), arms: fp.arms(ji).length });
      }
      return { n: r.junctionArms.length, stamp: document.querySelector("#stamp")?.textContent ?? "", rows: out };
    });
    console.log(`stand ${name}: ${rows.n} junctions, ${rows.rows.length} with records`);
    for (const t of rows.rows) console.log(`  ji ${t.ji} rb ${t.rb} centre ${t.c?.map((v) => v.toFixed(3)).join(",")} arms ${t.arms}`);
    await page.close();
  }
} finally {
  await browser.close();
}
