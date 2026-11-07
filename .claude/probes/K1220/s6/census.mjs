// K1220 S6: census of every text fork (junctionArms entries whose arms are
// glyph chains) on the word set, at xh 3 (#glyphs2) and xh 2
// (#glyphs2=xh2), on each host given: per fork its arm count, the field
// record (fieldProbe.record >= 0), the record's arm count, taperHideJn, each
// arm's 0.8-ctrl probe distance from the joint, and the fused tips that end
// there. Text pages are knot-mode scenes (no fabric): wait for the renderer
// and __knotPerf().asleep, real time, headed (lib.mjs openBrowser).
//   node census.mjs <out.json> <host>[,<host>...] [words=a,i,ai,ia,aa,ii]
// The served code is checked with a mark: the host's joinery.ts is fetched
// and searched for "K1220 S6" (mine has it once the fix is in; master never).
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { openBrowser, sleep } from "./lib.mjs";

const OUT = resolve(process.argv[2] || "out/census.json");
mkdirSync(dirname(OUT), { recursive: true });
const HOSTS = (process.argv[3] || "http://127.0.0.1:5960").split(",");
const WORDS = (process.argv[4] || "a,i,ai,ia,aa,ii").split(",");
const XH = [
  { id: "xh3", hash: "glyphs2" },
  { id: "xh2", hash: "glyphs2=xh2" },
];

async function load(page, host, word, hash) {
  await page.goto(`${host}/?7&txt=${word}&am=instant&snd=none&fw=0&phw=0#${hash}`, { waitUntil: "load", timeout: 90000 });
  await page.bringToFront();
  await page.mouse.move(2, 2);
  await page.waitForFunction(() => window.__knotRenderer && window.__knotRenderer() && window.__knotRenderer().fieldProbe, { timeout: 60000 });
  let asleep = false;
  for (const t0 = Date.now(); Date.now() - t0 < 60000; await sleep(300)) {
    asleep = await page.evaluate(() => { const p = window.__knotPerf ? window.__knotPerf() : null; return !!(p && p.asleep); });
    if (asleep) break;
  }
  await sleep(500);
  return asleep;
}

async function page_census(page) {
  return page.evaluate(async () => {
    const S = await import("/src/render/ribbon/sampling.ts");
    const r = window.__knotRenderer();
    const fp = r.fieldProbe;
    const sc = new Float32Array(4);
    const glyph = r.style.glyph || [];
    const forks = [];
    const n = r.junctionArms ? r.junctionArms.length : 0;
    for (let ji = 0; ji < n; ji++) {
      const jn = r.junctionArms[ji];
      const c = fp.center(ji);
      const isGlyph = jn.arms.some((a) => glyph[a.chain]);
      const arms = jn.arms.map((a) => {
        const smp = r.chainSamples[a.chain];
        const closed = r.ps.chainBreakAfter[a.chain] < 0;
        let d = NaN;
        if (smp && c) {
          S.sampleAtSafe(smp, S.paintArcAt(smp, a.slot + a.dir * 0.8, closed), closed, sc, 0);
          d = Math.hypot(sc[0] - c[0], sc[1] - c[1]);
        }
        return { chain: a.chain, slot: a.slot, dir: a.dir, glyph: !!glyph[a.chain], probe08: +d.toFixed(4) };
      });
      const tips = (r.fusedTips || []).filter((t) => jn.arms.some((a) => a.chain === t.hostChain) || jn.arms.some((a) => a.chain === t.chain)).map((t) => ({ chain: t.chain, atEnd: t.atEnd, host: t.hostChain, hostCtrl: +(+t.hostCtrl).toFixed(3) }));
      forks.push({
        ji, glyph: isGlyph, c: c ? [+c[0].toFixed(3), +c[1].toFixed(3)] : null,
        nArms: jn.arms.length, recArms: (fp.arms(ji) || []).length, rb: fp.record(ji),
        hidden: r.taperHideJn ? r.taperHideJn[ji] : 0, arms, tips,
      });
    }
    const stamp = [...document.querySelectorAll("div")].map((d) => d.textContent || "").find((t) => /^P\d/.test(t)) || "";
    return {
      fh: r.style.threadWidth / 2, chains: r.chainSamples.length, glyphChains: glyph.filter(Boolean).length,
      fusedTips: (r.fusedTips || []).length, freeTips: (r.freeTips || []).length, forks,
      stamp: stamp.split(" | sim")[0], ctxLost: window.__ctxLost || 0,
    };
  });
}

const browser = await openBrowser();
const result = { hosts: {}, words: WORDS };
try {
  for (const host of HOSTS) {
    const src = await (await fetch(`${host}/src/render/ribbon/joinery.ts`)).text();
    const mark = src.includes("K1220 S6");
    const rows = [];
    const page = await browser.newPage();
    const log = [];
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warn") log.push(`[${m.type()}] ${m.text()}`); });
    page.on("pageerror", (e) => log.push(`[pageerror] ${e.message}`));
    await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });
    const cdp = await page.createCDPSession();
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
    await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; window.__ctxLost = 0; document.addEventListener("webglcontextlost", () => { window.__ctxLost++; }, true); });
    for (const word of WORDS) for (const xh of XH) {
      const asleep = await load(page, host, word, xh.hash);
      const c = await page_census(page);
      const text = c.forks.filter((f) => f.glyph);
      const withRec = text.filter((f) => f.rb >= 0).length;
      rows.push({ word, xh: xh.id, asleep, ...c });
      console.log(`${host} mark=${mark} ${word} ${xh.id}: asleep=${asleep} fh=${c.fh} glyphChains=${c.glyphChains} fusedTips=${c.fusedTips} textForks=${text.length} withRecord=${withRec} hidden=${text.filter((f) => f.hidden).length} ${c.stamp}`);
      for (const f of text) console.log(`   ji${f.ji} arms=${f.nArms} recArms=${f.recArms} rb=${f.rb} hidden=${f.hidden} c=${f.c} probe08=${f.arms.map((a) => a.probe08).join("/")} tips=${f.tips.length}`);
    }
    result.hosts[host] = { mark, rows, log };
    await page.close();
  }
} finally {
  await browser.close();
}
writeFileSync(OUT, JSON.stringify(result, null, 1));
console.log("wrote " + OUT);
