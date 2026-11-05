// K1202 task 3e: which mesh carries the bright side? At row 14 (t 100.456),
// debug view 5 with filletMesh / filletTopMesh hidden one at a time
// (renderable=false: the renderer resets `visible` each frame), sampled at
// e210's centreline cols 16..27 and the col 20/21 transects.
//   node px3_cyc.mjs
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, PIN, setState, sleep, frames } from "./lib.mjs";
import { STANDS, linkOf } from "./stands_cyc.mjs";
import { decodePNG, toRGB } from "./png.mjs";

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
  const shot = async (hide) => {
    await setState(page, { t, dbg: 5, webs: true });
    await page.evaluate((h) => {
      const r = window.__knotRenderer();
      if (r.filletMesh) r.filletMesh.mesh.renderable = h !== "bottom";
      if (r.filletTopMesh) r.filletTopMesh.mesh.renderable = h !== "top";
    }, hide);
    await frames(page, 3);
    await sleep(120);
    return toRGB(decodePNG(Buffer.from(await page.screenshot({ type: "png", clip }))));
  };
  for (const hide of ["none", "bottom", "top", "both"]) {
    const im = hide === "both" ? await (async () => { await setState(page, { t, dbg: 5, webs: false }); return toRGB(decodePNG(Buffer.from(await page.screenshot({ type: "png", clip })))); })() : await shot(hide);
    const vals = [];
    for (let c = 16; c <= 27; c++) { const sx = Math.round(samp[c][0]), sy = Math.round(samp[c][1]); vals.push(im.data[(sy * im.W + sx) * 3 + 1]); }
    console.log(`hide=${hide}: G5 cols16..27: ${vals.join(" ")}`);
  }
  await page.close();
} finally { await browser.close(); }
