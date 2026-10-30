// K923: close this probe's own tabs on the phone (URLs on localhost:<port>)
// over the 9222 DevTools forward, while Chrome is still in front. Attaches
// only to the tabs it closes; every other tab is left alone.
//   node scripts/k923/close_tabs.mjs [5923]
import puppeteer from "puppeteer-core";

const port = process.argv[2] || "5923";
const b = await puppeteer.connect({ browserURL: "http://127.0.0.1:9222", defaultViewport: null });
try {
  const all = b.targets().filter((t) => t.type() === "page");
  const mine = all.filter((t) => t.url().startsWith(`http://localhost:${port}/`));
  for (const t of mine) { const p = await t.page(); if (p) await p.close(); }
  console.log(`closed ${mine.length} tab(s) on localhost:${port}; ${all.length - mine.length} other tab(s) untouched`);
} finally {
  await b.disconnect();
}
