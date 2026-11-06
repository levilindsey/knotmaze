// K1208 Run K - K744: rule-colour junction blips on today's master.
// Stand (K138 s1 page checks, K749 phone crops): seed 7, alternate then
// cycle, Run K adds &snd=none&phw=0 and &fw=0&am=instant for a settled
// same-state frame (named here, per rule 11).
//   node k744.mjs <outDir>
// Measure per junction: pixels within 1.0 half-width of the centre whose
// colour is >45 RGB from every arm colour (sampled at 2.4 half-widths)
// AND >20 luma darker than the darkest arm - K749's dark patches. The
// same count with the fan meshes hidden (renderable=false) attributes it.
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, viewExact, PIN, setState, frames, sleep, stampText, HOST } from "./lib.mjs";
import { decode, upscale3, luma, dist } from "./crop.mjs";

const OUT = resolve(process.argv[2] || "out");
mkdirSync(OUT, { recursive: true });
const RULES = [
  { name: "alternate", q: "7&am=instant&fw=0&snd=none&phw=0&cru=alternate" },
  { name: "cycle", q: "7&am=instant&fw=0&snd=none&phw=0&cru=cycle" },
];
const browser = await openBrowser();
const results = [];
try {
  for (const rule of RULES) {
    const log = [];
    const page = await openPage(browser, rule.q, log);
    await waitAsleep(page);
    await viewExact(page);
    await page.evaluate(PIN);
    await sleep(200);
    const geo = await page.evaluate(() => {
      const k = window.__knotFabric(), r = window.__knotRenderer();
      const w0 = k.toWorld(0, 0), w1 = k.toWorld(100, 0), w2 = k.toWorld(0, 100);
      const ax = (w1.x - w0.x) / 100, ay = (w1.y - w0.y) / 100, bx = (w2.x - w0.x) / 100, by = (w2.y - w0.y) / 100;
      const det = ax * by - bx * ay;
      const toScreen = (x, y) => { const dx = x - w0.x, dy = y - w0.y; return [(by * dx - bx * dy) / det, (-ay * dx + ax * dy) / det]; };
      const fp = r.fieldProbe;
      const recs = [];
      for (let ji = 0; ji < (r.junctionArms ? r.junctionArms.length : 0); ji++) {
        const c = fp && fp.center(ji);
        if (!c || fp.record(ji) < 0) continue;
        const [sx, sy] = toScreen(c[0], c[1]);
        recs.push({ ji, sx, sy, arms: fp.arms(ji).map((a) => ({ ang: a.ang, chain: a.chain })) });
      }
      return { fh: r.style.threadWidth / 2, recs, view: window.__knotView() };
    });
    const scale = geo.view.s; // CSS px per world (view.s; dsf applied by screenshot)
    const dsf = 1.5;
    const fhPx = geo.fh * scale * dsf;
    const cand = geo.recs.filter((r) => r.sx > 120 && r.sx < 1580 && r.y !== 0 && r.sy > 120 && r.sy < 830).slice(0, 8);
    const measure = async (webs) => {
      await setState(page, { t: 100, dbg: 0, webs });
      const rows = [];
      for (const r of cand) {
        const S = 150;
        const clip = { x: Math.max(0, Math.round(r.sx - S / 2)), y: Math.max(0, Math.round(r.sy - S / 2)), width: S, height: S };
        const buf = await page.screenshot({ type: "png", clip });
        const img = decode(buf);
        const cx = (r.sx - clip.x) * dsf, cy = (r.sy - clip.y) * dsf;
        const armCols = r.arms.map((a) => {
          const x = Math.round(cx + Math.cos(a.ang) * 2.4 * fhPx), y = Math.round(cy + Math.sin(a.ang) * 2.4 * fhPx);
          const i = (Math.max(0, Math.min(img.H - 1, y)) * img.W + Math.max(0, Math.min(img.W - 1, x))) * 3;
          return [img.data[i], img.data[i + 1], img.data[i + 2]];
        });
        const minArmLuma = Math.min(...armCols.map((c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]));
        let patch = 0, dark = 0;
        const R = fhPx * 1.0;
        for (let y = Math.max(0, Math.floor(cy - R)); y < Math.min(img.H, cy + R); y++) {
          for (let x = Math.max(0, Math.floor(cx - R)); x < Math.min(img.W, cx + R); x++) {
            if (Math.hypot(x - cx, y - cy) > R) continue;
            const i = (y * img.W + x) * 3;
            const dMin = Math.min(...armCols.map((c) => dist(img.data, i, c)));
            if (dMin > 45) { patch++; if (luma(img.data, i) < minArmLuma - 20) dark++; }
          }
        }
        rows.push({ ji: r.ji, patch, dark, armCols: armCols.map((c) => c.join(",")) });
        if (webs && rule.name === "alternate" && r.ji === (cand[0] && cand[0].ji)) {
          writeFileSync(join(OUT, "k744_alt_on.png"), upscale3(buf));
        }
        if (!webs && rule.name === "alternate" && r.ji === (cand[0] && cand[0].ji)) {
          writeFileSync(join(OUT, "k744_alt_off.png"), upscale3(buf));
        }
      }
      return rows;
    };
    const on = await measure(true);
    const off = await measure(false);
    await setState(page, { t: 100, dbg: 0, webs: true });
    const stamp = await stampText(page);
    const ctxLost = await page.evaluate(() => window.__ctxLost);
    results.push({ rule: rule.name, q: rule.q, fhPx: +fhPx.toFixed(1), on, off, stamp, ctxLost });
    console.log(`${rule.name}: on dark max ${Math.max(...on.map((r) => r.dark))} off dark max ${Math.max(...off.map((r) => r.dark))} stamp ${stamp} ctxLost ${ctxLost}`);
    await page.close();
  }
} finally {
  await browser.close();
}
writeFileSync(join(OUT, "k744.json"), JSON.stringify(results, null, 1));
console.log("wrote", join(OUT, "k744.json"));
