// K923: close this probe's own tabs on the phone (URLs on localhost:<port>)
// over the 9222 DevTools forward, while Chrome is still in front. Attaches
// only to the tabs it closes; every other tab is left alone.
//   node scripts/k923/close_tabs.mjs [--ready] [5923]
// --ready runs the phone readiness check before connecting.
import puppeteer from "puppeteer-core";
import { ensurePhoneReady, PhoneNotReady } from "../phone_pass/phone_ready.mjs";

let ready = false;
let portArg;
for (const a of process.argv.slice(2)) {
  if (a === "--ready") ready = true;
  else if (portArg === undefined) portArg = a;
}
const port = portArg || "5923";
if (ready) {
  try { await ensurePhoneReady({ allowChrome: true }); }
  catch (e) { if (e instanceof PhoneNotReady) { console.error(e.line); process.exit(e.exit); } throw e; }
}
const b = await puppeteer.connect({ browserURL: "http://127.0.0.1:9222", defaultViewport: null });
try {
  const all = b.targets().filter((t) => t.type() === "page");
  const mine = all.filter((t) => t.url().startsWith(`http://localhost:${port}/`));
  for (const t of mine) { const p = await t.page(); if (p) await p.close(); }
  console.log(`closed ${mine.length} tab(s) on localhost:${port}; ${all.length - mine.length} other tab(s) untouched`);
} finally {
  await b.disconnect();
}
