// K1208 Run K - K678 v2: patch coverPairs before the scene builds (via
// evaluateOnNewDocument's dynamic import of the same module), then count
// join samples by room through the whole settle at rest - the head
// junction's pulse bands route it, so its cover strips rebuild while the
// lattice zigzags still carry round joins. 50 seeds, 5 pages in parallel.
//   node k678b.mjs <outDir> [nSeeds]
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, sleep, stampText } from "./lib.mjs";

const OUT = resolve(process.argv[2] || "out");
mkdirSync(OUT, { recursive: true });
const N = Number(process.argv[3] || 50);
const HOST = process.env.K22K_HOST || "http://127.0.0.1:5980";
const PATCH = () => {
  window.__k22k = { calls: 0, join: 0, arc: 0, fallback: 0, firstHit: null, patched: false };
  import("/src/render/ribbon_mesh.ts").then((RM) => {
    const proto = RM.RibbonMesh.prototype;
    if (proto.__k22kOrig) return;
    proto.__k22kOrig = proto.coverPairs;
    proto.coverPairs = function (k, out, room) {
      const st = window.__k22k;
      if (st) {
        st.calls++;
        const joins = this.joins;
        let isJoin = false;
        if (joins && joins.count > 0) for (let j = 0; j < joins.count; j++) if (joins.sample[j] === k) { isJoin = true; break; }
        if (isJoin) {
          st.join++;
          if (room < 9) {
            st.fallback++;
            if (!st.firstHit) {
              const V = this.vertexData;
              st.firstHit = { k, room, sampleCount: this.sampleCount, mid: [+(V[k * 4] + V[k * 4 + 2]) / 2, +(V[k * 4 + 1] + V[k * 4 + 3]) / 2] };
            }
          } else st.arc++;
        }
      }
      return proto.__k22kOrig.call(this, k, out, room);
    };
    if (window.__k22k) window.__k22k.patched = true;
  }).catch((e) => { window.__k22kErr = String(e); });
};
const browser = await openBrowser();
const perSeed = [];
try {
  const seeds = Array.from({ length: N }, (_, i) => i + 1);
  const lanes = [[], [], [], [], []];
  seeds.forEach((s, i) => lanes[i % 5].push(s));
  await Promise.all(lanes.map(async (lane) => {
    for (const s of lane) {
      const page = await browser.newPage();
      page.on("pageerror", () => {});
      await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 1 });
      const cdp = await page.createCDPSession();
      await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
      await page.evaluateOnNewDocument(PATCH);
      await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; window.__ctxLost = 0; document.addEventListener("webglcontextlost", () => { window.__ctxLost++; }, true); });
      await page.goto(`${HOST}/?${s}&am=instant&fw=0&snd=none&phw=0`, { waitUntil: "load", timeout: 90000 });
      await page.bringToFront();
      await page.mouse.move(2, 2);
      // Settle through (rebuilds fire while geometry moves), then one
      // forced rebuild for a settled-state reading.
      for (const t0 = Date.now(); Date.now() - t0 < 90000; await sleep(400)) {
        const st = await stampText(page).catch(() => "");
        if (/asleep/.test(st)) break;
      }
      const res = await page.evaluate(() => {
        const r = window.__knotRenderer();
        const during = { ...(window.__k22k || {}) };
        let joinsTotal = 0;
        for (const f of r.fills) if (f && f.joins) joinsTotal += f.joins.count;
        return { during, joinsSettled: joinsTotal, err: window.__k22kErr || null, ctxLost: window.__ctxLost };
      });
      perSeed.push({ seed: s, ...res });
      console.log(`seed ${s}: patched=${res.during.patched} calls=${res.during.calls} join=${res.during.join} arc=${res.during.arc} fallback=${res.during.fallback} joinsSettled=${res.joinsSettled} err=${res.err}`);
      await page.close();
    }
  }));
} finally { await browser.close(); }
perSeed.sort((a, b) => a.seed - b.seed);
const tot = perSeed.reduce((a, r) => ({ calls: a.calls + (r.during.calls || 0), join: a.join + (r.during.join || 0), arc: a.arc + (r.during.arc || 0), fallback: a.fallback + (r.during.fallback || 0) }), { calls: 0, join: 0, arc: 0, fallback: 0 });
writeFileSync(join(OUT, "k678.json"), JSON.stringify({ nSeeds: N, mode: "fabric rest, settle-through count", tot, perSeed }, null, 1));
console.log(`TOTAL ${JSON.stringify(tot)} seedsWithFallback=${perSeed.filter((r) => r.during.fallback > 0).length}`);
console.log("wrote k678.json");
