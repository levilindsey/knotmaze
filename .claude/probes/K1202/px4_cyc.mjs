// K1202 task 3f: is the col 20->21 edge the gap mask? At row 14, shoot the
// sheets clip with the gap pass on, off (uFabricGap.x = 0) and in probe
// tint (uFabricGap.y = 1: masked material tinted magenta, not removed).
//   node px4_cyc.mjs
import { writeFileSync } from "node:fs";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, PIN, setState, sleep, frames } from "./lib.mjs";
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
  const setGap = (x, y) => page.evaluate(async (x, y) => {
    const FS = await import("/src/render/fabric_sdf.ts");
    FS.fabricUniforms().uniforms.uFabricGap[0] = x;
    FS.fabricUniforms().uniforms.uFabricGap[1] = y;
  }, x, y);
  const lum = (im, x, y) => { const k = (y * im.W + x) * 3; return 0.2126 * im.data[k] + 0.7152 * im.data[k + 1] + 0.0722 * im.data[k + 2]; };
  for (const [tag, gx, gy, dbg] of [["on", 1, 0, 0], ["off", 0, 0, 0], ["tint", 1, 1, 0], ["offD5", 0, 0, 5]]) {
    await setState(page, { t, dbg, webs: true });
    await setGap(gx, gy);
    await frames(page, 3);
    await sleep(120);
    const im = toRGB(decodePNG(Buffer.from(await page.screenshot({ type: "png", clip }))));
    const vals = [];
    for (let c = 16; c <= 27; c++) { const sx = Math.round(samp[c][0]), sy = Math.round(samp[c][1]); vals.push(dbg === 5 ? im.data[(sy * im.W + sx) * 3 + 1] : lum(im, sx, sy).toFixed(0)); }
    console.log(`${tag} (gap ${gx},${gy}, dbg ${dbg}): cols16..27: ${vals.join(" ")}`);
    if (tag === "tint") {
      const S = 6, out = { W: im.W * S, H: im.H * S, data: Buffer.alloc(im.W * S * im.H * S * 3) };
      for (let y = 0; y < out.H; y++) for (let x = 0; x < out.W; x++) im.data.copy(out.data, (y * out.W + x) * 3, (Math.floor(y / S) * im.W + Math.floor(x / S)) * 3, (Math.floor(y / S) * im.W + Math.floor(x / S)) * 3 + 3);
      writeFileSync("out/px/kymo_r14_tint.png", encodePNG(out));
    }
  }
  await setGap(1, 0);
  await page.close();
} finally { await browser.close(); }
