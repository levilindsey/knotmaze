// K1472: what a link shows from load to rest, read from the page itself.
//   node watch.mjs <url> <profileDir> <outPrefix> [seconds=120] [shots=5,15,30,60,90]
// env WINPOS="x,y" (default 0,0: on the 1280x720 desktop; gfshots used 2200,50, off screen),
//     VW/VH viewport (default 1600x900), EXTRA extra Chrome args, RELOAD=1 loads twice (warm the second).
// Each second prints one row: wall s, rAF frames in that second, the ticker's deltaMS median, the reveal
// (clock / duration / done), gf (composites, compileIssued/Ready, switched, fallback), the loader's opacity,
// the scene root's visibility, and visibilityState. At each shot time: a screenshot, plus the DOM stack at the
// canvas centre (tag, id, class, opacity, background) and the canvas's own opacity / filter.
import puppeteer from "puppeteer-core";
const [, , url, prof, out, secs = "120", shotsArg = "5,15,30,60,90"] = process.argv;
const shots = new Set(shotsArg.split(",").map(Number));
const [wx, wy] = (process.env.WINPOS ?? "0,0").split(",");
const VW = +(process.env.VW ?? 1600), VH = +(process.env.VH ?? 900);
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: prof, protocolTimeout: 900000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", `--window-position=${wx},${wy}`, `--window-size=${VW + 20},${VH + 120}`, "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", ...(process.env.EXTRA ? process.env.EXTRA.split(" ") : [])] });
const p = await b.newPage();
await p.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
await p.evaluateOnNewDocument(() => {
  let raf = 0; const dts = []; let last = 0;
  const tick = (t) => { raf++; if (last) dts.push(t - last); last = t; if (dts.length > 400) dts.shift(); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  globalThis.__k1472 = () => {
    const med = (a) => { if (!a.length) return -1; const s = [...a].sort((x, y) => x - y); return +s[s.length >> 1].toFixed(1); };
    const rv = globalThis.__knotReveal?.() ?? null;
    const gf = globalThis.__knotGf?.stats ?? null;
    let loader = null;
    for (const el of document.querySelectorAll("body > div")) { const cs = getComputedStyle(el); if (cs.zIndex === "15" && el.querySelector("svg")) loader = +cs.opacity; }
    const r = globalThis.__knotRenderer?.();
    let rootVis = null; if (r && r.root) { let n = r.root; rootVis = true; while (n) { if (!n.visible) rootVis = false; n = n.parent; } }
    const d = dts.splice(0);
    return { raf, dtMed: med(d), dtMax: d.length ? +Math.max(...d).toFixed(0) : -1, n: d.length,
      rv: rv ? { c: +rv.clock.toFixed(3), d: +rv.duration.toFixed(2), done: rv.done, fx: rv.fxAlive } : null,
      gf: gf ? { comp: gf.composites, pass: gf.passes, ci: gf.compileIssued, cr: gf.compileReady, sw: gf.switchedMs > 0 ? +(gf.switchedMs / 1000).toFixed(1) : -1, fb: gf.fallback, rvP: gf.rvPasses } : null,
      loader, rootVis, vis: document.visibilityState, focus: document.hasFocus() };
  };
  globalThis.__k1472stack = () => {
    const c = [...document.querySelectorAll("canvas")].map((cv) => { const cs = getComputedStyle(cv); const rc = cv.getBoundingClientRect(); return { w: cv.width, h: cv.height, rect: [rc.x, rc.y, rc.width, rc.height].map(Math.round), op: cs.opacity, filter: cs.filter, z: cs.zIndex, vis: cs.visibility, mix: cs.mixBlendMode }; });
    const stack = document.elementsFromPoint(innerWidth / 2, innerHeight / 2).map((el) => { const cs = getComputedStyle(el); return `${el.tagName.toLowerCase()}#${el.id}.${String(el.className).slice(0, 30)} op=${cs.opacity} bg=${cs.backgroundColor} z=${cs.zIndex} vis=${cs.visibility}`; });
    const dim = [...document.querySelectorAll("body *")].filter((el) => { const cs = getComputedStyle(el); const rc = el.getBoundingClientRect(); return rc.width * rc.height > innerWidth * innerHeight * 0.5 && cs.visibility !== "hidden" && cs.display !== "none" && (cs.backgroundColor !== "rgba(0, 0, 0, 0)" || +cs.opacity < 1 || cs.backdropFilter !== "none"); }).map((el) => `${el.tagName.toLowerCase()}#${el.id}.${String(el.className).slice(0, 30)} op=${getComputedStyle(el).opacity} bg=${getComputedStyle(el).backgroundColor} bdf=${getComputedStyle(el).backdropFilter}`);
    return { canvases: c, stack, bigPainted: dim };
  };
});
const t0 = Date.now(); const T = () => ((Date.now() - t0) / 1000).toFixed(1);
p.on("console", (m) => { const t = m.text(); if (!/^\[vite\]/.test(t)) console.log(T(), "console." + m.type(), t.slice(0, 300)); });
p.on("pageerror", (e) => console.log(T(), "pageerror", e.message.slice(0, 300)));
const load = async () => { await p.goto(url, { waitUntil: "load", timeout: 900000 }); };
await load();
if (process.env.RELOAD) {
  await p.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0 || !globalThis.__knotGf, { timeout: 900000, polling: 1000 });
  console.log(T(), "warm-up load composed; reloading"); await load();
}
await p.bringToFront();
const tl = Date.now();
console.log(T(), "load event", JSON.stringify(await p.evaluate(() => ({ params: globalThis.__knotParams?.() ? Object.fromEntries(Object.entries(globalThis.__knotParams()).filter(([k]) => /appear|thread|border|background|explor|fade|rp|renderPath/i.test(k))) : null }))));
let prevRaf = 0;
for (let i = 1; i <= +secs; i++) {
  await new Promise((r) => setTimeout(r, Math.max(0, tl + i * 1000 - Date.now())));
  const s = await p.evaluate(() => globalThis.__k1472()).catch((e) => ({ err: e.message }));
  const fps = s.raf != null ? s.raf - prevRaf : null; prevRaf = s.raf ?? prevRaf;
  console.log(`${String(i).padStart(4)}s fps=${fps} dt=${s.dtMed}/${s.dtMax} rv=${JSON.stringify(s.rv)} gf=${JSON.stringify(s.gf)} loader=${s.loader} rootVis=${s.rootVis} ${s.vis} focus=${s.focus}`);
  if (shots.has(i)) {
    await p.screenshot({ path: `${out}_s${i}.png` });
    console.log(`  shot s${i}`, JSON.stringify(await p.evaluate(() => globalThis.__k1472stack())));
  }
}
await b.close();
