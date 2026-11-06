// K1208 Run K - K678: the cover-strip fallback (coverPairs room < 9).
// ribbon_mesh.ts:458: a round join's sample returns 1 pair (no arc) when
// room < 1 + ROUND_ARC_SEGMENTS (9). joinery.ts:2605 passes room =
// COVER_STRIP_PTS - pairsSoFar - samplesAfter. Probe: patch
// RibbonMesh.prototype.coverPairs in the page (probe-only), force
// rebuildFillets(true), count join samples by room over 50 seeds.
//   node k678.mjs <outDir> [nSeeds]
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, sleep } from "./lib.mjs";

const OUT = resolve(process.argv[2] || "out");
mkdirSync(OUT, { recursive: true });
const N = Number(process.argv[3] || 50);
const browser = await openBrowser();
const perSeed = [];
let totCalls = 0, totJoin = 0, totArc = 0, totFallback = 0;
const HOST = process.env.K22K_HOST || "http://127.0.0.1:5980";
try {
  for (let s = 1; s <= N; s++) {
    const log = [];
    // Text mode (K580's A/B scenes): glyph fills carry the round joins
    // and glyph junctions carry cover strips. Renderer-only wait.
    const page = await browser.newPage();
    page.on("console", (m) => log.push(`[${m.type()}] ${m.text()}`));
    page.on("pageerror", (e) => log.push(`[pageerror] ${e.message}`));
    await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1.5 });
    const cdp = await page.createCDPSession();
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
    await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; window.__ctxLost = 0; document.addEventListener("webglcontextlost", () => { window.__ctxLost++; }, true); });
    await page.goto(`${HOST}/?${s}&txt=ai&am=instant&snd=none&fw=0&phw=0#glyphs2`, { waitUntil: "load", timeout: 90000 });
    await page.bringToFront();
    await page.mouse.move(2, 2);
    await page.waitForFunction(() => { const r = window.__knotRenderer && window.__knotRenderer(); return !!(r && r.junctionArms && r.junctionArms.length > 0); }, { timeout: 60000 });
    await sleep(300);
    const res = await page.evaluate(async () => {
      const RM = await import("/src/render/ribbon_mesh.ts");
      const proto = RM.RibbonMesh.prototype;
      if (!proto.__k22kOrig) {
        proto.__k22kOrig = proto.coverPairs;
        proto.__k22k = { calls: 0, join: 0, arc: 0, fallback: 0, firstHit: null };
        proto.coverPairs = function (k, out, room) {
          const st = proto.__k22k;
          st.calls++;
          const joins = this.joins;
          let isJoin = false;
          if (joins && joins.count > 0) {
            for (let j = 0; j < joins.count; j++) if (joins.sample[j] === k) { isJoin = true; break; }
          }
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
          return proto.__k22kOrig.call(this, k, out, room);
        };
      }
      proto.__k22k.calls = 0; proto.__k22k.join = 0; proto.__k22k.arc = 0; proto.__k22k.fallback = 0; proto.__k22k.firstHit = null;
      const r = window.__knotRenderer();
      r.rebuildFillets(true);
      const st = proto.__k22k;
      let joinsTotal = 0;
      for (const f of r.fills) if (f && f.joins) joinsTotal += f.joins.count;
      return { calls: st.calls, join: st.join, arc: st.arc, fallback: st.fallback, firstHit: st.firstHit, joinsTotal, junctions: r.junctionArms.length, stamp: ([...document.querySelectorAll("div")].map((d) => d.textContent || "").find((t) => /^P\d/.test(t)) || "").split(" | sim")[0] };
    });
    totCalls += res.calls; totJoin += res.join; totArc += res.arc; totFallback += res.fallback;
    perSeed.push({ seed: s, ...res });
    console.log(`seed ${s}: junctions ${res.junctions} joinsTotal ${res.joinsTotal} calls ${res.calls} joinSamples ${res.join} arcs ${res.arc} fallback ${res.fallback}${res.firstHit ? " firstHit " + JSON.stringify(res.firstHit) : ""}`);
    await page.close();
  }
} finally { await browser.close(); }
writeFileSync(join(OUT, "k678.json"), JSON.stringify({ nSeeds: N, totCalls, totJoin, totArc, totFallback, perSeed }, null, 1));
console.log(`TOTAL seeds ${N} calls ${totCalls} joinSamples ${totJoin} arcs ${totArc} fallback ${totFallback}`);
console.log("wrote k678.json");
