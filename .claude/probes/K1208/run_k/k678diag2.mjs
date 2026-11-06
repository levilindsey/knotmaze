// K1208 Run K - K678 diagnostic 2: is the patched prototype the fills'
// own, and does rebuildFillets(true) reach the cover loop in text mode?
import { openBrowser, sleep } from "./lib.mjs";
const HOST = process.env.K22K_HOST || "http://127.0.0.1:5980";
const browser = await openBrowser();
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1.5 });
  const cdp = await page.createCDPSession();
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; });
  await page.goto(`${HOST}/?7&txt=ai&am=instant&snd=none&fw=0&phw=0#glyphs2`, { waitUntil: "load", timeout: 90000 });
  await page.bringToFront();
  await page.mouse.move(2, 2);
  await page.waitForFunction(() => { const r = window.__knotRenderer && window.__knotRenderer(); return !!(r && r.junctionArms && r.junctionArms.length > 0); }, { timeout: 60000 });
  await sleep(500);
  const res = await page.evaluate(async () => {
    const RM = await import("/src/render/ribbon_mesh.ts");
    const r = window.__knotRenderer();
    const f0 = r.fills.find((f) => f);
    const proto = RM.RibbonMesh.prototype;
    const before = proto.coverPairs;
    let calls = 0;
    proto.coverPairs = function (k, out, room) { calls++; return before.call(this, k, out, room); };
    const sameProto = f0 ? Object.getPrototypeOf(f0).coverPairs === proto.coverPairs : null;
    const inst = f0 ? f0 instanceof RM.RibbonMesh : null;
    r.rebuildFillets(true);
    const after1 = calls;
    // Direct call check:
    const pts = [];
    const direct = f0 && f0.joins && f0.joins.count > 0 ? f0.coverPairs(f0.joins.sample[0], pts, 3) : -1;
    return { sameProto, inst, after1, direct, joins0: f0 && f0.joins ? f0.joins.count : -1, fills: r.fills.length, jn: r.junctionArms.length };
  });
  console.log(JSON.stringify(res));
  await page.close();
} finally { await browser.close(); }
