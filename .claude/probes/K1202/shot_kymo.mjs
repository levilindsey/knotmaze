// K1202: the kymograph's own frame at row 14 (sheets clip), cols 16..27
// dotted (20 white, 21 cyan), scaled 6x, normal + debug-5.
//   node shot_kymo.mjs
import { writeFileSync } from "node:fs";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, PIN, setState, sleep } from "./lib.mjs";
import { STANDS, linkOf } from "./stands_cyc.mjs";
import { decodePNG, toRGB, encodePNG } from "./png.mjs";

const st = STANDS.cyc;
const browser = await openBrowser();
try {
  const log = [];
  const page = await openPage(browser, linkOf(st), log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  await sleep(300);
  await page.evaluate(PIN);
  const geo = await page.evaluate(() => {
    const k = window.__knotFabric(), r = window.__knotRenderer();
    const pts = [];
    for (let i = 0; i <= 256; i++) { const q = k.runPoint(210, i / 256); pts.push([q.x, q.y]); }
    const p0 = k.vertexScreen(k.head);
    const a = k.toWorld(p0.x, p0.y), b = k.toWorld(p0.x + 100, p0.y);
    return { pts, ppw: 100 / Math.hypot(b.x - a.x, b.y - a.y) };
  });
  const DSF = 1.5, MASK_R = 1.35;
  const xs = geo.pts.map((p) => p[0]), ys = geo.pts.map((p) => p[1]);
  const m = MASK_R * geo.ppw;
  const clip = { x: Math.floor(Math.min(...xs) - m), y: Math.floor(Math.min(...ys) - m) };
  clip.width = Math.ceil(Math.max(...xs) + m) - clip.x;
  clip.height = Math.ceil(Math.max(...ys) + m) - clip.y;
  const samp = [];
  for (let i = 0; i < geo.pts.length - 1; i++) {
    const [ax, ay] = geo.pts[i], [bx, by] = geo.pts[i + 1];
    const L = Math.hypot(bx - ax, by - ay) * DSF, n = Math.max(1, Math.round(L));
    for (let j = 0; j < n; j++) samp.push([(ax + ((bx - ax) * j) / n - clip.x) * DSF, (ay + ((by - ay) * j) / n - clip.y) * DSF]);
  }
  const t = 100 + (14 * 1.5 * (2.5 / 1.6)) / 72;
  for (const [tag, dbg] of [["normal", 0], ["debug5", 5]]) {
    await setState(page, { t, dbg, webs: true });
    const im = toRGB(decodePNG(Buffer.from(await page.screenshot({ type: "png", clip }))));
    for (let c = 16; c <= 27; c++) {
      const sx = Math.round(samp[c][0]), sy = Math.round(samp[c][1]);
      const col = c === 20 ? [255, 255, 255] : c === 21 ? [0, 255, 255] : [255, 0, 0];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const x = sx + dx, y = sy + dy;
        if (x < 0 || y < 0 || x >= im.W || y >= im.H) continue;
        im.data.set(col, (y * im.W + x) * 3);
      }
    }
    const S = 6, out = { W: im.W * S, H: im.H * S, data: Buffer.alloc(im.W * S * im.H * S * 3) };
    for (let y = 0; y < out.H; y++) for (let x = 0; x < out.W; x++) im.data.copy(out.data, (y * out.W + x) * 3, (Math.floor(y / S) * im.W + Math.floor(x / S)) * 3, (Math.floor(y / S) * im.W + Math.floor(x / S)) * 3 + 3);
    writeFileSync(`out/px/kymo_r14_${tag}.png`, encodePNG(out));
    console.log(`${tag}: clip ${JSON.stringify(clip)} samp20 ${samp[20].map((v) => v.toFixed(1))} samp21 ${samp[21].map((v) => v.toFixed(1))}`);
  }
  await page.close();
} finally { await browser.close(); }
