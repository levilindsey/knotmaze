// K1240 S4: crop rows at matched world spots, fbb | today | rp=outline.
//   node .claude/probes/K1240/s4/k1240s4_crops.mjs <base> <outDir>
// Each scene loads its K868 capture link (in-thread physics, fw=0, stb=0),
// steps to sim 40.0167 with __knotStepUntil, checks the physics hash
// against the scene's capture, freezes, and so draws the state the scene
// files hold. Looks: fbb = the link + &fbb=1 (form B in the app); today =
// the link as captured (tlk=border, master's look); outline = the link +
// &rp=outline. Each spot: __knotLookAt(x, y, s) (main.ts), a bit-exact view,
// a clip of the canvas centre. Rows go to <outDir>/<spot>.png and all rows
// to <outDir>/rows.png (composed in the same browser), the numbers to
// <outDir>/crops.json. Headed hardware-GPU Chrome off-screen, real time.
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [, , base, outDir] = process.argv;
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SIM_T = 40;
const VW = 1240, VH = 900, DSF = 2, CLIP = 300;

// The six worst junctions of out/k1278/crops (k1278_worst_junctions.png,
// top to bottom) and cut 273 (g41_ring_tw64; k1240s4_spots.ts).
const SCENES = [
  { name: "def", hash: "910ff135", link: "?s=b&am=instant&snd=none&tlk=border&phw=0&fw=0&stb=0",
    spots: [["def_j16", 4.190, 34.688], ["def_j14", 3.421, 33.823], ["def_j156", 13.937, 20.813], ["def_j81", 13.219, 21.695]], span: 2.0 },
  { name: "muse_default_tw", hash: "c5d9f3b6", link: "?3&tlk=border&cr=6&bg=wash&bgcm=custom&bgc0=e6e9ee&am=instant&snd=none&stb=0&fw=0&phw=0",
    spots: [["muse_j150", 24.541, 10.903], ["muse_j163", 24.055, 27.057]], span: 2.0 },
  { name: "g41_ring_tw64", hash: "ea67fc77", link: "?s=1rphqy1&gs=12&shp=ring&wd=.45&sl=1&dr=.75&rep=1.45&bd=2.5&sm=.6&ga=.2&tw=.64&gap=.04&cr=3&fl=0&fv=1&am=instant&snd=none&tlk=border&phw=0&fw=0&stb=0",
    spots: [["cut273", 20.084, 20.859]], span: 3.0 },
];
// today = the app's default look on the same state (the link without
// tlk=border: the capture links carry it for the label pass and fbb).
const LOOKS = [["fbb", "&fbb=1", true], ["today", "", false], ["outline", "&rp=outline", true]];

const profileDir = join(tmpdir(), `k1240s4-crops-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false,
  userDataDir: profileDir,
  args: [
    "--use-angle=d3d11", "--no-first-run", "--no-default-browser-check",
    "--window-position=2200,50", "--window-size=1360,1040",
    "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
  ],
});
const report = { base, scenes: [] };
const shots = {}; // spot -> look -> png path
try {
  for (const sc of SCENES) {
    for (const [look, extra, border] of LOOKS) {
      const page = await browser.newPage();
      const link = border ? sc.link : sc.link.replace("&tlk=border", "");
      const rec = { scene: sc.name, look, url: `${base}/${link}${extra}`, errors: [] };
      page.on("pageerror", (e) => rec.errors.push(String(e.message).slice(0, 300)));
      page.on("console", (m) => { if (m.type() === "error") rec.errors.push(`console: ${m.text()}`.slice(0, 300)); });
      await page.setViewport({ width: VW, height: VH, deviceScaleFactor: DSF });
      await page.goto(rec.url, { waitUntil: "load", timeout: 120000 });
      await page.waitForFunction(() => typeof window.__knotStepUntil === "function" && typeof window.__knotLookAt === "function" && !!window.__knotPS?.(), { timeout: 120000, polling: 100 });
      rec.step = await page.evaluate(async (T) => {
        const t1 = await window.__knotStepUntil(T);
        const d1 = await window.__knotPhysDump();
        await window.__knotPhysFreeze(true);
        const d2 = await window.__knotPhysDump();
        window.__knotLoop?.({ continuous: true });
        return { t1, hash: d1.hashes.all, frozenHash: d2.hashes.all };
      }, SIM_T);
      rec.hashOk = rec.step.hash === sc.hash && rec.step.frozenHash === sc.hash;
      // Hide the chrome: everything but the app's canvas. The app's canvas
      // is scripts/export_scene.mjs's: the largest on screen by bounding
      // rect, never the loader's (same size; ties go to the later one). By
      // backing-store size the field's canvas won and fbb came out white.
      rec.canvas = await page.evaluate(() => {
        let c = null; let area = -1;
        for (const k of document.querySelectorAll("canvas")) {
          if (k.id === "knot-loading-canvas") continue;
          const r = k.getBoundingClientRect();
          if (r.width * r.height >= area) { area = r.width * r.height; c = k; }
        }
        c.setAttribute("data-k1240-main", "1");
        const st = document.createElement("style");
        st.textContent = "body * { visibility: hidden !important; } canvas[data-k1240-main] { visibility: visible !important; }";
        document.head.appendChild(st);
      });
      // The look ready: the outline caught up with the frozen state; fbb's hook up.
      const t0 = Date.now();
      if (look === "outline") {
        await page.waitForFunction(() => window.__knotOutline?.settled && window.__knotOutline.stats.replies > 0, { timeout: 180000, polling: 250 });
        rec.outline = await page.evaluate(() => ({ ...window.__knotOutline.stats }));
      } else if (look === "fbb") {
        await page.waitForFunction(() => !!window.__knotFieldB, { timeout: 60000, polling: 250 });
        await sleep(1500);
        rec.fieldB = await page.evaluate(() => JSON.parse(JSON.stringify(window.__knotFieldB.stats ?? {})));
      } else await sleep(1500);
      rec.readyMs = Date.now() - t0;
      writeFileSync(join(outDir, `full_${sc.name}_${look}.png`), await page.screenshot());
      rec.spots = [];
      for (const [spot, x, y] of sc.spots) {
        const s = CLIP / sc.span;
        // Place, then wait (frames running) until the view is the one asked
        // for and bit-still; re-place if an ease moved it.
        const v = await page.evaluate(async (a, b, c, W, H) => {
          const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          let last = ""; let same = 0; let tries = 0;
          window.__knotLookAt(a, b, c);
          for (let i = 0; i < 400 && same < 6; i++) {
            await raf();
            const w = window.__knotView(); const k = `${w.s},${w.x},${w.y}`;
            const off = Math.hypot(a * w.s + w.x - W / 2, b * w.s + w.y - H / 2);
            const ok = Math.abs(w.s - c) / c < 1e-6 && off < 0.05;
            same = k === last && ok ? same + 1 : 0; last = k;
            if (!ok && i % 40 === 39) { window.__knotLookAt(a, b, c); tries++; }
          }
          return { ...window.__knotView(), same, tries };
        }, x, y, s, VW, VH);
        await sleep(600);
        const cx = x * v.s + v.x, cy = y * v.s + v.y;
        const clip = { x: VW / 2 - CLIP / 2, y: VH / 2 - CLIP / 2, width: CLIP, height: CLIP };
        const file = join(outDir, `${spot}_${look}.png`);
        writeFileSync(file, await page.screenshot({ clip }));
        (shots[spot] ??= {})[look] = file;
        rec.spots.push({ spot, x, y, s, view: { s: v.s, x: v.x, y: v.y, same: v.same, tries: v.tries }, spotCss: [cx, cy], offCentre: [cx - VW / 2, cy - VH / 2] });
      }
      report.scenes.push(rec);
      console.log(`${sc.name} ${look}: hash ${rec.step.hash} ${rec.hashOk ? "ok" : `MISMATCH (want ${sc.hash})`}, ready ${rec.readyMs} ms, errors ${rec.errors.length}, offCentre ${rec.spots.map((p) => p.offCentre.map((d) => d.toFixed(2)).join("/")).join(" ")}`);
      await page.close();
    }
  }
  // Rows: fbb | today | outline per spot, one PNG each and all together.
  const page = await browser.newPage();
  await page.setViewport({ width: 3 * CLIP + 4 * 6, height: 800, deviceScaleFactor: DSF });
  const spots = Object.keys(shots);
  const img = (f) => `data:image/png;base64,${readFileSync(f).toString("base64")}`;
  const rowHtml = (sp) => `<div class="r"><div class="l">${sp}: fbb | today (default look) | rp=outline</div><div class="c">${LOOKS.map(([lk]) => `<img src="${img(shots[sp][lk])}">`).join("")}</div></div>`;
  const css = `body{margin:0;background:#777;font:12px monospace;color:#fff} .r{padding:3px 6px} .c{display:flex;gap:6px} img{width:${CLIP}px;height:${CLIP}px;display:block}`;
  for (const sp of spots) {
    await page.setContent(`<style>${css}</style>${rowHtml(sp)}`);
    const el = await page.$(".r");
    writeFileSync(join(outDir, `${sp}.png`), await el.screenshot());
  }
  await page.setContent(`<style>${css}</style><div id="all">${spots.map(rowHtml).join("")}</div>`);
  const all = await page.$("#all");
  writeFileSync(join(outDir, "rows.png"), await all.screenshot());
} finally {
  writeFileSync(join(outDir, "crops.json"), JSON.stringify(report, null, 1));
  await browser.close();
  try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
}
