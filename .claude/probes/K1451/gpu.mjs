// K1451: on a live gf page, draw device-px tiles of the page's own tables with three GfPass variants and the
// CPU mirror, read them back and write ink / cov PNGs: live (the page's programs: tiers + cornerPlan), full
// (tiers [], the full program alone), probe (the census variant), mirror (eval.ts in the page).
//   node gpu.mjs <url> <outPrefix> <profileDir> <cx,cy,size>...   env FREEZE=1 WAIT=8000 FADE=<f>
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
const [, , url, pre, profileDir, ...tiles] = process.argv;
function png(file, rgb, W, H) {
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; Buffer.from(rgb.buffer, rgb.byteOffset + y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1); }
  const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
  const crc = (b) => { let c = ~0; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return ~c >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 2;
  writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
}
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  page.on("console", (m) => { if (m.type() === "error") console.log("console", m.text()); });
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: "load", timeout: 600000 });
  await page.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 600000, polling: 200 });
  await new Promise((r) => setTimeout(r, Number(process.env.WAIT ?? 8000)));
  if (process.env.FREEZE === "1") await page.evaluate(async () => { await window.__knotPhysFreeze?.(true); await new Promise((r) => setTimeout(r, 1500)); });
  const shot = await page.screenshot({ type: "png" }); writeFileSync(`${pre}_shot.png`, shot);
  for (const t of tiles) {
    const [cx, cy, size] = t.split(",").map(Number);
    const res = await page.evaluate(async (a) => {
      const imp = new Function("p", "return import(p)");
      const mod = await imp("/src/render/gpu_field/gf_pass.ts"); const ev = await imp("/src/render/gpu_field/eval.ts");
      const T = globalThis.__knotGf.tables; const v = window.__knotView(); const dpr = devicePixelRatio;
      const fade = a.fade ?? window.__knotRenderer?.()?.fadeLength;
      const ppu = v.s * dpr; const dx0 = a.cx - a.size / 2; const dy0 = a.cy - a.size / 2;
      const c0 = dx0 - v.x * dpr; const r0 = dy0 - v.y * dpr; const n = a.size * a.size;
      const cv = document.createElement("canvas"); cv.width = 4; cv.height = 4;
      const gl = cv.getContext("webgl2", { antialias: false });
      const out = {};
      const variants = [["live", () => new mod.GfPass(gl, false, undefined, undefined, false, { home: !!T.homeOn })], ["full", () => new mod.GfPass(gl, false, [], undefined, false, { home: !!T.homeOn })], ["probe", () => new mod.GfPass(gl, true, undefined, undefined, false, { home: !!T.homeOn })]];
      for (const [nm, mk] of variants) {
        const pass = mk(); pass.upload(T);
        if (fade !== undefined && "homeFade" in pass) try { pass.homeFade = fade; } catch { /* ro */ }
        const nt = nm === "probe" ? 3 : pass.lookable ? 3 : 1;
        const tg = new mod.GfTarget(gl, nt, true); tg.resize(a.size, a.size);
        pass.draw(tg, [1 / ppu, c0 / ppu, 1 / ppu, r0 / ppu], [0, 0, a.size, a.size], false);
        const buf = new Float32Array(4 * n); tg.read(0, buf);
        const ink = []; const cov = [];
        for (let i = 0; i < n; i++) { ink.push(buf[4 * i]); cov.push(buf[4 * i + 1]); }
        out[nm] = { ink, cov, err: gl.getError() };
      }
      const E = new ev.GfEval(T); if (fade !== undefined) E.fadeLength = fade;
      const ink = []; const cov = [];
      for (let r = 0; r < a.size; r++) for (let c = 0; c < a.size; c++) { const o = E.eval((c0 + c + 0.5) / ppu, (r0 + r + 0.5) / ppu); ink.push(o.ink); cov.push(o.cov); }
      out.mirror = { ink, cov, err: 0 };
      return out;
    }, { cx, cy, size, fade: process.env.FADE ? Number(process.env.FADE) : undefined });
    for (const [nm, o] of Object.entries(res)) {
      const rgb = new Uint8Array(size * size * 3);
      for (let i = 0; i < size * size; i++) { const c = o.cov[i]; const k = o.ink[i]; rgb[3 * i] = Math.round(255 * k); rgb[3 * i + 1] = Math.round(120 * c * (1 - k)); rgb[3 * i + 2] = Math.round(200 * c * (1 - k)); }
      png(`${pre}_${cx}_${cy}_${nm}.png`, rgb, size, size);
      let d = 0; if (nm !== "mirror") for (let i = 0; i < size * size; i++) d = Math.max(d, Math.abs(o.ink[i] - res.mirror.ink[i]));
      console.log(`${cx},${cy} ${nm} err ${o.err} max|ink - mirror| ${d.toFixed(3)}`);
    }
  }
} finally { await browser.close(); }
