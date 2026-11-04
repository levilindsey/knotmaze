// K1139 S2 hook check: __knotPulses reads the declared tree and
// __knotPinClocks(t) pins the clocks in one call (cross stand, 5620).
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, sleep } from "./lib.mjs";

const browser = await openBrowser();
const log = [];
try {
  const page = await openPage(browser, "k111&am=instant&fw=0&snd=none&phw=0", log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of [0, 246, 82, 83, 199]) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  const out = await page.evaluate(async () => {
    const before = window.__knotPulses();
    const pinned = window.__knotPinClocks(100);
    const r = window.__knotRenderer();
    await new Promise((res) => setTimeout(res, 300));
    return {
      n: before.length,
      sample: before.filter((p) => p.edge === 150 || p.edge === 21),
      pinned,
      paintClock: r.paintClock,
      pulseBorn: r.pulseBorn,
    };
  });
  console.log(`__knotPulses: ${out.n} items; e150/e21: ${JSON.stringify(out.sample)}; __knotPinClocks(100) -> ${out.pinned}, paintClock ${out.paintClock}, pulseBorn ${out.pulseBorn} after 300 ms -> ${out.pinned && out.paintClock === 100 && out.pulseBorn === 0 ? "HOOKS PASS" : "HOOKS FAIL"}`);
} finally {
  await browser.close();
}
