// K1247 s20: app-paint A/B of two screenshots of the same state (off | on | |difference|).
// Usage: node .claude/probes/K1247/k1247s20_appdiff.mjs <a.png> <b.png> <out.png> [n=5] [win=240] [thr=24]
// Counts the pixels whose largest channel difference exceeds thr, then crops the n windows (win device px,
// non-overlapping, greedy by count) with the most of them: each row A | B | 255 - 4|A - B| (black = differs).
// The image decode runs in a headless Chrome page (no physics; the screenshots come from headed real time).
import puppeteer from "puppeteer-core";
import { readFileSync, writeFileSync } from "node:fs";

const [, , pa, pb, out, nArg, wArg, tArg] = process.argv;
const n = Number(nArg ?? 5); const win = Number(wArg ?? 240); const thr = Number(tArg ?? 24);
const url = (p) => "data:image/png;base64," + readFileSync(p).toString("base64");
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
try {
  const page = await browser.newPage();
  const res = await page.evaluate(async (ua, ub, n, win, thr) => {
    const load = (u) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = u; });
    const [A, B] = await Promise.all([load(ua), load(ub)]);
    const W = Math.min(A.width, B.width); const H = Math.min(A.height, B.height);
    const px = (im) => { const c = new OffscreenCanvas(W, H); const g = c.getContext("2d"); g.drawImage(im, 0, 0); return g.getImageData(0, 0, W, H).data; };
    const a = px(A); const b = px(B);
    const gw = Math.ceil(W / 40); const gh = Math.ceil(H / 40); const cnt = new Int32Array(gw * gh); let tot = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const q = 4 * (y * W + x);
      const d = Math.max(Math.abs(a[q] - b[q]), Math.abs(a[q + 1] - b[q + 1]), Math.abs(a[q + 2] - b[q + 2]));
      if (d > thr) { tot++; cnt[((y / 40) | 0) * gw + ((x / 40) | 0)]++; }
    }
    // Window score: the sum over the win x win block of 40 px cells centred on each cell.
    const r = Math.floor(win / 80); const spots = []; const used = [];
    const score = (cx, cy) => { let s = 0; for (let j = cy - r; j <= cy + r; j++) for (let i = cx - r; i <= cx + r; i++) if (i >= 0 && j >= 0 && i < gw && j < gh) s += cnt[j * gw + i]; return s; };
    for (let k = 0; k < n; k++) {
      let best = 0; let bx = -1; let by = -1;
      for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
        if (!cnt[j * gw + i] || used.some(([u, v]) => Math.abs(u - i) <= 2 * r && Math.abs(v - j) <= 2 * r)) continue;
        const s = score(i, j); if (s > best) { best = s; bx = i; by = j; }
      }
      if (bx < 0) break; used.push([bx, by]);
      spots.push({ x: Math.max(0, Math.min(W - win, bx * 40 + 20 - win / 2)), y: Math.max(0, Math.min(H - win, by * 40 + 20 - win / 2)), px: best });
    }
    const O = document.createElement("canvas"); O.width = 3 * win + 8; O.height = Math.max(1, spots.length) * (win + 4);
    const g = O.getContext("2d"); g.fillStyle = "#888"; g.fillRect(0, 0, O.width, O.height);
    spots.forEach((s, k) => {
      const y0 = k * (win + 4);
      g.drawImage(A, s.x, s.y, win, win, 0, y0, win, win); g.drawImage(B, s.x, s.y, win, win, win + 4, y0, win, win);
      const D = g.createImageData(win, win);
      for (let y = 0; y < win; y++) for (let x = 0; x < win; x++) {
        const q = 4 * ((s.y + y) * W + s.x + x); const o = 4 * (y * win + x);
        const d = Math.max(Math.abs(a[q] - b[q]), Math.abs(a[q + 1] - b[q + 1]), Math.abs(a[q + 2] - b[q + 2]));
        const v = 255 - Math.min(255, 4 * d); D.data[o] = D.data[o + 1] = D.data[o + 2] = v; D.data[o + 3] = 255;
      }
      g.putImageData(D, 2 * win + 8, y0);
    });
    return { W, H, tot, spots, png: O.toDataURL("image/png") };
  }, url(pa), url(pb), n, win, thr);
  writeFileSync(out, Buffer.from(res.png.split(",")[1], "base64"));
  console.log(`${res.W}x${res.H}: ${res.tot} px differ (max channel > ${thr})`);
  res.spots.forEach((s, k) => console.log(`row ${k}: (${s.x}, ${s.y}) ${win} px window, ${s.px} px differ`));
} finally { await browser.close(); }
