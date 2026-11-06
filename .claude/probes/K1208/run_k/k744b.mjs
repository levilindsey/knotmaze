// K1208 Run K - K744 v2: zoomed island measure at K749's named junctions.
// crop sources: .claude/probes/K749/out/rules/crops.json (vertex per crop).
// Island = pixel within 1.3 half-widths of the centre whose RGB differs
// >40 from the 5x5 median around it (a patch, not a smooth fan blend).
//   node k744b.mjs <outDir>
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, viewExact, PIN, setState, sleep, stampText } from "./lib.mjs";
import { decode, upscale3 } from "./crop.mjs";

const OUT = resolve(process.argv[2] || "out");
mkdirSync(OUT, { recursive: true });
const STANDS = [
  { rule: "alternate", q: "7&am=instant&fw=0&snd=none&phw=0&cru=alternate", verts: ["mnode_109", "node_259", "mnode_125"] },
  { rule: "cycle", q: "7&am=instant&fw=0&snd=none&phw=0&cru=cycle", verts: ["mnode_109", "node_259", "mnode_156"] },
];
const browser = await openBrowser();
const results = [];
try {
  for (const st of STANDS) {
    const log = [];
    const page = await openPage(browser, st.q, log);
    await waitAsleep(page);
    await viewStill(page);
    // Zoom to ~60 CSS px/world on the first vertex (shoot.mjs wheel recipe).
    const vpt = (v) => page.evaluate((v) => window.__knotFabric().vertexScreen(v), v);
    let fpt = await vpt(st.verts[0]);
    const pxPerWorld = (p) => page.evaluate((p) => {
      const k = window.__knotFabric();
      const a = k.toWorld(p.x, p.y), b = k.toWorld(p.x + 100, p.y);
      return 100 / Math.hypot(b.x - a.x, b.y - a.y);
    }, p);
    const wheel = async (dy) => {
      await page.mouse.move(fpt.x, fpt.y);
      await page.keyboard.down("Control");
      await page.mouse.wheel({ deltaY: dy });
      await page.keyboard.up("Control");
      await sleep(250);
      await viewStill(page);
    };
    const target = 60, s0 = await pxPerWorld(fpt);
    if (s0 < target * 0.97) {
      await wheel(-30);
      const s1 = await pxPerWorld(fpt);
      const kEff = Math.log(s1 / s0) / 30;
      if (kEff > 0 && s1 < target * 0.97) { fpt = await vpt(st.verts[0]); await wheel(-Math.log(target / s1) / kEff); }
    }
    await page.mouse.move(2, 2);
    await sleep(300);
    await viewExact(page);
    await page.evaluate(PIN);
    await sleep(200);
    const fh = await page.evaluate(() => window.__knotRenderer().style.threadWidth / 2);
    const scale = await pxPerWorld(await vpt(st.verts[0]));
    const fhPx = fh * scale * 1.5;
    const measure = async (webs) => {
      await setState(page, { t: 100, dbg: 0, webs });
      const rows = [];
      for (const v of st.verts) {
        const c = await vpt(v);
        const S = 170;
        const clip = { x: Math.max(0, Math.round(c.x - S / 2)), y: Math.max(0, Math.round(c.y - S / 2)), width: S, height: S };
        const buf = await page.screenshot({ type: "png", clip });
        const img = decode(buf);
        const cx = (c.x - clip.x) * 1.5, cy = (c.y - clip.y) * 1.5, R = fhPx * 1.3;
        let island = 0, total = 0, maxJump = 0;
        for (let y = 2; y < img.H - 2; y++) for (let x = 2; x < img.W - 2; x++) {
          if (Math.hypot(x - cx, y - cy) > R) continue;
          total++;
          const i = (y * img.W + x) * 3;
          // 5x5 median per channel (sampled: corners + cross of the box)
          const samp = [];
          for (const [dx, dy] of [[-2, -2], [0, -2], [2, -2], [-2, 0], [2, 0], [-2, 2], [0, 2], [2, 2], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const j = ((y + dy) * img.W + (x + dx)) * 3;
            samp.push([img.data[j], img.data[j + 1], img.data[j + 2]]);
          }
          const med = [0, 1, 2].map((ch) => samp.map((s) => s[ch]).sort((a, b) => a - b)[6]);
          const d = Math.hypot(img.data[i] - med[0], img.data[i + 1] - med[1], img.data[i + 2] - med[2]);
          if (d > 40) island++;
          if (d > maxJump) maxJump = d;
        }
        // Dark patch: >45 from the local median AND >20 luma below it.
        let dark = 0;
        for (let y = 2; y < img.H - 2; y++) for (let x = 2; x < img.W - 2; x++) {
          if (Math.hypot(x - cx, y - cy) > R) continue;
          const i = (y * img.W + x) * 3;
          const samp = [];
          for (const [dx, dy] of [[-2, -2], [0, -2], [2, -2], [-2, 0], [2, 0], [-2, 2], [0, 2], [2, 2]]) {
            const j = ((y + dy) * img.W + (x + dx)) * 3;
            samp.push([img.data[j], img.data[j + 1], img.data[j + 2]]);
          }
          const med = [0, 1, 2].map((ch) => samp.map((s) => s[ch]).sort((a, b) => a - b)[4]);
          const d = Math.hypot(img.data[i] - med[0], img.data[i + 1] - med[1], img.data[i + 2] - med[2]);
          const dl = (0.2126 * img.data[i] + 0.7152 * img.data[i + 1] + 0.0722 * img.data[i + 2]) - (0.2126 * med[0] + 0.7152 * med[1] + 0.0722 * med[2]);
          if (d > 45 && dl < -20) dark++;
        }
        rows.push({ v, island, dark, total, maxJump: Math.round(maxJump) });
        if (webs && v === st.verts[0]) writeFileSync(join(OUT, `k744_${st.rule}_on.png`), upscale3(buf));
        if (!webs && v === st.verts[0]) writeFileSync(join(OUT, `k744_${st.rule}_off.png`), upscale3(buf));
      }
      return rows;
    };
    const on = await measure(true);
    const off = await measure(false);
    await setState(page, { t: 100, dbg: 0, webs: true });
    const stamp = await stampText(page);
    results.push({ rule: st.rule, q: st.q, fhPx: +fhPx.toFixed(1), on, off, stamp });
    console.log(`${st.rule}: fhPx ${fhPx.toFixed(1)} on islands ${on.map((r) => r.island).join("/")} off ${off.map((r) => r.island).join("/")} stamp ${stamp}`);
    await page.close();
  }
} finally { await browser.close(); }
writeFileSync(join(OUT, "k744b.json"), JSON.stringify(results, null, 1));
console.log("wrote k744b.json");
