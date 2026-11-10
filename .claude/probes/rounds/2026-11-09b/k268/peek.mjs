import { pathToFileURL } from "node:url";
const KIT = pathToFileURL("C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-ab935dd12e804fe68/scripts/phone_pass/");
const { CFG } = await import(new URL("lib.mjs", KIT).href);
import { createRequire } from "node:module";
const require = createRequire("C:/Users/lsl/Repositories/knotmaze/package.json");
const puppeteer = require("puppeteer-core");
const b = await puppeteer.connect({ browserURL: CFG.cdp, defaultViewport: null });
const pages = (await b.pages()).filter((p) => p.url().startsWith(CFG.hostB + "/"));
for (const p of pages) {
  const r = await p.evaluate(() => { const v = window.__knotView(), ps = window.__knotPS(), r = window.__knotRenderer(); let live = 0; for (let c = 0; c < ps.crossings.length; c++) if (r.slotLive[c]) live++; return { url: location.search, vw: innerWidth, vh: innerHeight, s: v.s, x: v.x, y: v.y, crossings: ps.crossings.length, live, thr: r.style.threadWidth, explore: !!r.exploreOn }; });
  console.log(JSON.stringify(r));
}
await b.disconnect();
