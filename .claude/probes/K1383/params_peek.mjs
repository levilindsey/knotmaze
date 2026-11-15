import puppeteer from "puppeteer-core";
const link = process.argv[2] ?? "b.FMKB4DIQ";
const b = await puppeteer.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true, args: ["--no-first-run"] });
const p = await b.newPage();
await p.goto(`http://127.0.0.1:5383/?${link}&snd=none`, { waitUntil: "load" });
await p.waitForFunction(() => !!window.__knotParams, { timeout: 30000 });
const v = await p.evaluate(async () => {
  const m = await import("/src/ui/url_state.ts");
  const q = window.__knotParams(), D = m.PARAM_DEFAULTS, out = {};
  for (const k of Object.keys(q)) if (JSON.stringify(q[k]) !== JSON.stringify(D[k]) && k !== "seed") out[k] = [q[k], D[k]];
  return out;
});
console.log(JSON.stringify(v));
await b.close();
