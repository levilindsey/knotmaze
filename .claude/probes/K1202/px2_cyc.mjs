// K1202 task 3b: which draw steps at col 20->21? At the kymograph's worst
// rows, shoot normal/debug5 with the fillet webs on and off (setState's
// webs flag), sample the fan twin (fieldProbe.at, fan and strip) at the
// same world points, and take a perpendicular transect across cols 20/21.
//   node px2_cyc.mjs
import { writeFileSync } from "node:fs";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, PIN, setState, sleep, frames } from "./lib.mjs";
import { STANDS, linkOf } from "./stands_cyc.mjs";

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
    for (let i = 0; i <= 256; i++) { const q = k.runPoint(210, i / 256); pts.push([q.x, q.y, q.wx, q.wy]); }
    const p0 = k.vertexScreen(k.head);
    const a = k.toWorld(p0.x, p0.y), b = k.toWorld(p0.x + 100, p0.y);
    return { pts, ppw: 100 / Math.hypot(b.x - a.x, b.y - a.y), spacing: r.pulseSpacing, reach: r.pulseReach };
  });
  const DSF = 1.5, MASK_R = 1.35;
  const xs = geo.pts.map((p) => p[0]), ys = geo.pts.map((p) => p[1]);
  const m = MASK_R * geo.ppw;
  const clip = { x: Math.floor(Math.min(...xs) - m), y: Math.floor(Math.min(...ys) - m) };
  clip.width = Math.ceil(Math.max(...xs) + m) - clip.x;
  clip.height = Math.ceil(Math.max(...ys) + m) - clip.y;
  const samp = [];
  for (let i = 0; i < geo.pts.length - 1; i++) {
    const [ax, ay, awx, awy] = geo.pts[i], [bx, by, bwx, bwy] = geo.pts[i + 1];
    const L = Math.hypot(bx - ax, by - ay) * DSF, n = Math.max(1, Math.round(L));
    for (let j = 0; j < n; j++) samp.push([(ax + ((bx - ax) * j) / n - clip.x) * DSF, (ay + ((by - ay) * j) / n - clip.y) * DSF, awx + ((bwx - awx) * j) / n, awy + ((bwy - awy) * j) / n]);
  }
  const period = geo.spacing / 1.6;
  const { decodePNG, toRGB, encodePNG } = await import("./png.mjs");
  const lum = (im, x, y) => { const k = (y * im.W + x) * 3; return 0.2126 * im.data[k] + 0.7152 * im.data[k + 1] + 0.0722 * im.data[k + 2]; };
  const shot = async (t, dbg, webs) => {
    await setState(page, { t, dbg, webs });
    return toRGB(decodePNG(Buffer.from(await page.screenshot({ type: "png", clip }))));
  };
  for (const r of [14, 15]) {
    const t = 100 + (r * 1.5 * period) / 72;
    const imN = await shot(t, 0, true), imD = await shot(t, 5, true);
    const imDW = await shot(t, 5, false), imNW = await shot(t, 0, false);
    writeFileSync(`out/px/r${r}_normal.png`, Buffer.from(await page.screenshot({ type: "png", clip })));
    console.log(`row ${r} t ${t.toFixed(3)}: col | lumaN G5 G5-websOff lumaN-websOff`);
    for (let c = 16; c <= 27; c++) {
      const sx = Math.round(samp[c][0]), sy = Math.round(samp[c][1]);
      console.log(`  col ${c} | ${lum(imN, sx, sy).toFixed(0)} ${imD.data[(sy * imD.W + sx) * 3 + 1]} ${imDW.data[(sy * imDW.W + sx) * 3 + 1]} ${lum(imNW, sx, sy).toFixed(0)}`);
    }
    // Fan twin (composed normal RGB) at the same world points, fan + strip.
    const twin = await page.evaluate((pts) => {
      const r = window.__knotRenderer(), fp = r.fieldProbe, out = new Float32Array(4);
      return pts.map(([wx, wy]) => {
        const res = {};
        for (const strip of [false, true]) {
          globalThis.__k1202out = null;
          const ok = fp.at(69, wx, wy, out, 0, strip);
          res[strip ? "strip" : "fan"] = ok ? [out[0], out[1], out[2]].map((v) => Math.round(v * 255)) : null;
        }
        return res;
      });
    }, [18, 19, 20, 21, 22, 23].map((c) => [samp[c][2], samp[c][3]]));
    console.log(`  twin at row ${r}: ` + [18, 19, 20, 21, 22, 23].map((c, i) => `col${c} fan ${JSON.stringify(twin[i].fan)} strip ${JSON.stringify(twin[i].strip)}`).join("; "));
    // Perpendicular transect at col 20 and 21 (offsets in device px).
    for (const c of [20, 21]) {
      const tx = samp[c + 1][0] - samp[c - 1][0], ty = samp[c + 1][1] - samp[c - 1][1], tl = Math.hypot(tx, ty) || 1;
      const nx = -ty / tl, ny = tx / tl;
      const vals = [];
      for (let o = -4; o <= 4; o++) {
        const sx = Math.round(samp[c][0] + nx * o), sy = Math.round(samp[c][1] + ny * o);
        vals.push(`${o}:${lum(imN, sx, sy).toFixed(0)}/${imD.data[(sy * imD.W + sx) * 3 + 1]}`);
      }
      console.log(`  transect col ${c} (lumaN/G5 by normal offset): ${vals.join(" ")}`);
    }
  }
  await page.close();
} finally { await browser.close(); }
