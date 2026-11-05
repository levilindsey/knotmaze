// K1203 21D positive control (Claude): does the GPU honour a pulse band's
// R3.w end window when the switch is on? On x4 (../stands_cyc.mjs,
// verbatim), at four pinned clocks a quarter pulse period apart, each
// pulse band's block (found as ../dump_cyc.mjs finds it) gets R3.w = 0.05
// (a span that zeroes the crest past tau 0.05) in the records' CPU copy,
// flushed, with the switch off and on. Expected: off+hack = off (the
// switch gates it), on+hack differs (the window applies). A second hack
// moves every block's distJ to 0.5 with the switch off: it shows that a
// record hack reaches the GPU at all. Each hack is read back after its
// shot (a re-pack would undo it) and restored by hand. Full-viewport
// shots, 1700x950 at dsf 1.5. Result: posctl_log.txt (K1203's notes).
//   (from this folder) node posctl.mjs   env K1139_HOST, the dev server
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, sleep } from "../lib.mjs";
import { STANDS, linkOf } from "../stands_cyc.mjs";
import { decodePNG, encodePNG, toRGB } from "../png.mjs";

const OUT = "posctl";
mkdirSync(OUT, { recursive: true });
const st = STANDS.x4;
const browser = await openBrowser();
try {
  const log = [];
  const page = await openPage(browser, linkOf(st), log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  await sleep(300);
  await viewStill(page);
  await page.evaluate(() => { for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden"; });
  const shot = async () => {
    await page.evaluate(() => new Promise((res) => { let k = 0; const f = () => (++k >= 3 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
    await sleep(60);
    return toRGB(decodePNG(Buffer.from(await page.screenshot({ type: "png" }))));
  };
  const prep = (on, t) => page.evaluate(async (o, tt) => {
    const JF = await import("/src/render/junction_field.ts");
    JF.setPulseBandEndWindow(o);
    const r = window.__knotRenderer();
    r.rebuildFillets(true);
    window.__knotPinClocks(tt);
    r.tickPaint(0);
    return JF.pulseBandEndWindow;
  }, on, t);
  // Each band's pulse block, found as dump_cyc.mjs finds it (the joint
  // whose arms hold the band's two arms, then the block with its arm
  // indices and distJ); kept in the page as window.__k1203Blocks.
  const found = await page.evaluate(async () => {
    const JF = await import("/src/render/junction_field.ts");
    const fp = window.__knotRenderer().fieldProbe, D = JF.recordData().data;
    const recs = [];
    for (let ji = 0; ji < 8192; ji++) { const rb = fp.record(ji); if (rb >= 0) recs.push({ ji, rb, arms: fp.arms(ji) }); }
    const armIx = (arms, x) => arms.findIndex((a) => a.chain === x.chain && a.slot === x.ctrl && a.dir === x.dir);
    const blocks = [], miss = [];
    for (const b of window.__knotPulseBands()) {
      let hit = null;
      for (const rc of recs) {
        const iA = armIx(rc.arms, b.a), iB = armIx(rc.arms, b.b);
        if (iA < 0 || iB < 0) continue;
        let cur = D[rc.rb * 4 + 3];
        const nr = D[rc.rb * 4 + 7];
        for (let k = 0; k < nr; k++) cur += 1 + D[cur * 4];
        const np = D[cur * 4];
        cur += 1;
        for (let k = 0; k < np && !hit; k++) {
          const o = cur * 4, nv = D[o];
          if (D[o + 2] === iA && D[o + 3] === iB && Math.abs(D[o + 4] - b.distJ) < 1e-3) hit = { ji: rc.ji, cur, nv, band: `${b.vertex} e${b.aEdge}->e${b.bEdge}` };
          cur += 4 + nv;
        }
        if (hit) break;
      }
      if (hit) blocks.push(hit); else miss.push(`${b.vertex} e${b.aEdge}->e${b.bEdge}`);
    }
    window.__k1203Blocks = blocks;
    return { blocks, miss };
  });
  console.log(`bands found ${found.blocks.length}: ${found.blocks.map((b) => `${b.band} (ji ${b.ji}, block ${b.cur})`).join("; ")}; not found ${found.miss.length}`);
  // Write texel `off` (15 = R3.w, 4 = distJ) of each found block: a number
  // for all, or an array (a restore, in block order); null only reads.
  // Returns the values it replaced.
  const poke = (off, val) => page.evaluate(async (ofs, v) => {
    const JF = await import("/src/render/junction_field.ts");
    const r = window.__knotRenderer(), D = JF.recordData(), data = D.data;
    const old = [];
    for (const b of window.__k1203Blocks) {
      const o = b.cur * 4;
      const was = data[o + ofs];
      if (v !== null) { data[o + ofs] = Array.isArray(v) ? v[old.length] : v; D.markDirty(b.cur, b.cur + 4 + b.nv); }
      old.push(was);
    }
    if (v !== null) { D.flush(); r.tickPaint(0); }
    return old;
  }, off, val);
  const read = (off) => poke(off, null);
  const diff = (a, b) => {
    let n = 0, mx = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    const img = { W: a.W, H: a.H, data: Buffer.alloc(a.data.length) };
    for (let i = 0, p = 0; i < a.data.length; i += 3, p++) {
      const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2]));
      if (d) { n++; mx = Math.max(mx, d); const x = p % a.W, y = (p - x) / a.W; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      const g = Math.min(255, d * 4); img.data[i] = g; img.data[i + 1] = g; img.data[i + 2] = g;
    }
    return { n, mx, box: n ? [x0, y0, x1, y1] : null, img };
  };
  const crop = (im, [x0, y0, x1, y1]) => {
    const W = x1 - x0 + 1, H = y1 - y0 + 1, data = Buffer.alloc(W * H * 3);
    for (let y = 0; y < H; y++) im.data.copy(data, y * W * 3, ((y0 + y) * im.W + x0) * 3, ((y0 + y) * im.W + x1 + 1) * 3);
    return { W, H, data };
  };
  const strip = (tiles, gap = 6) => {
    const W = tiles[0].W, H = tiles[0].H, SW = tiles.length * W + (tiles.length - 1) * gap, data = Buffer.alloc(SW * H * 3, 40);
    tiles.forEach((im, t) => { for (let y = 0; y < H; y++) im.data.copy(data, (y * SW + t * (W + gap)) * 3, y * W * 3, (y + 1) * W * 3); });
    return { W: SW, H, data };
  };
  const spacing = await page.evaluate(() => window.__knotRenderer().pulseSpacing);
  const P = spacing / 1.6;
  const r3 = await read(15), dj = await read(4);
  console.log(`pulse blocks: ${r3.length}; R3.w ${JSON.stringify(r3.map((v) => +v.toFixed(3)))}; distJ ${JSON.stringify(dj.map((v) => +v.toFixed(3)))}`);
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  let best = null;
  for (let k = 0; k < 4; k++) {
    const t = 100 + (k * P) / 4;
    if ((await prep(false, t)) !== false) throw new Error("flag readback");
    const a0 = await shot();
    let old = await poke(15, 0.05);
    const a1 = await shot();
    const keptA = (await read(15)).every((v) => Math.abs(v - 0.05) < 1e-6);
    await poke(15, old);
    if ((await prep(true, t)) !== true) throw new Error("flag readback");
    const b0 = await shot();
    old = await poke(15, 0.05);
    const b1 = await shot();
    const keptB = (await read(15)).every((v) => Math.abs(v - 0.05) < 1e-6);
    await poke(15, old);
    const b2 = await shot();
    if ((await prep(false, t)) !== false) throw new Error("flag readback");
    const oldD = await poke(4, 0.5);
    const c1 = await shot();
    const keptD = (await read(4)).every((v) => Math.abs(v - 0.5) < 1e-6);
    await poke(4, oldD);
    const a2 = await shot();
    const restored = same(await read(15), r3) && same(await read(4), dj);
    const dA = diff(a0, a1), dB = diff(b0, b1), dOn = diff(a0, b0), dB2 = diff(b0, b2), dC = diff(a0, c1), dCtl = diff(a0, a2);
    const f = (d) => `${d.n} px max ${d.mx}${d.box ? ` box ${d.box.join(",")}` : ""}`;
    console.log(`t ${t.toFixed(4)}: off/off+hack ${f(dA)} (hack kept ${keptA}); on/on+hack ${f(dB)} (kept ${keptB}); off/on ${f(dOn)}; on/on after restore ${f(dB2)}; off/off+distJ ${f(dC)} (kept ${keptD}); off/off control ${f(dCtl)}; records restored ${restored}`);
    if (dB.n && (!best || dB.n > best.d.n)) best = { k, t, d: dB, b0, b1 };
  }
  if (best) {
    const [x0, y0, x1, y1] = best.d.box, m = 24;
    const box = [Math.max(0, x0 - m), Math.max(0, y0 - m), Math.min(best.b0.W - 1, x1 + m), Math.min(best.b0.H - 1, y1 + m)];
    const name = join(OUT, `t${best.k}_on_onhack_diff.png`);
    writeFileSync(name, encodePNG(strip([crop(best.b0, box), crop(best.b1, box), crop(best.d.img, box)])));
    console.log(`strip (switch on | on with R3.w 0.05 | |diff| x4), clock ${best.k}, box ${box.join(",")}: ${name}`);
  }
  console.log(`context lost ${await page.evaluate(() => window.__ctxLost)}; page errors ${log.filter((l) => l.startsWith("[pageerror]")).length}`);
  await page.close();
} finally { await browser.close(); }
