// K1203 check: the JUNCTION_FRAG text the dev server builds, and the
// record R3.w values at mnode_27, read in the page.
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, sleep } from "./lib.mjs";
import { STANDS, linkOf } from "./stands_cyc.mjs";
const st = STANDS.x4;
const browser = await openBrowser();
try {
  const log = [];
  const page = await openPage(browser, linkOf(st), log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  await sleep(300);
  const out = await page.evaluate(async () => {
    const JF = await import("/src/render/junction_field.ts");
    const frag = JF.JUNCTION_FRAG || "";
    const i = frag.indexOf("uJParams.w");
    return {
      hasEndWin: i >= 0,
      snippet: i >= 0 ? frag.slice(i, i + 190) : "(absent)",
      hasSetWin: typeof JF.setPulseBandEndWindow,
      flag: JF.pulseBandEndWindow,
    };
  });
  console.log(JSON.stringify(out, null, 1));
  await page.close();
} finally { await browser.close(); }
