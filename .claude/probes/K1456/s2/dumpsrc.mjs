// K1456 s2: write the sources the app posts to its compile worker (vertex + every fragment, in the worker's
// index order) to <outDir>/vs.glsl and <outDir>/<idx>.frag. A warm profile gets there in a few seconds.
//   node dumpsrc.mjs <url> <profileDir> <outDir>
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
const [, , url, prof, outDir] = process.argv;
const b = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: prof, protocolTimeout: 600000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
try {
  const p = await b.newPage();
  await p.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await p.evaluateOnNewDocument(() => {
    const W0 = globalThis.Worker;
    globalThis.Worker = class extends W0 {
      postMessage(m, ...r) { if (m?.sources) globalThis.__kSrc = m.sources; return super.postMessage(m, ...r); }
    };
  });
  await p.goto(url, { waitUntil: "load", timeout: 300000 });
  await p.waitForFunction(() => !!globalThis.__kSrc, { timeout: 300000, polling: 200 });
  const src = await p.evaluate(() => globalThis.__kSrc);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${outDir}/vs.glsl`, src[0][0]);
  src.forEach(([, f], i) => writeFileSync(`${outDir}/${i}.frag`, f));
  console.log(src.map(([, f], i) => `${i}: ${f.length}`).join("\n"));
} finally { await b.close(); }
