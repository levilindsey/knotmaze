// K1182 (Muse batch 19 Run C): the fill rim's look sheet. For four
// junctions, 2x crops with the rim_curve biarc flag off, a same-build
// flag-off/flag-off control (a forced rebuild between the two off
// shots), and the flag on, at one pinned state per junction.
//   pwsh -File run_locked.ps1 -Batch batch_sheet.txt
// (the dev server must already serve this checkout on K1182_HOST,
// port 5710: npx vite --config .claude/probes/K1182/vite.private-cache.config.ts
//  --port 5710 --strictPort --host 127.0.0.1)
//
// Stands copied verbatim from .claude/probes/K1139/strips.mjs's
// STANDS (rule 11): cross and four below keep their q and moves
// exactly; nothing is added or changed. (Stage 4's dumps call the
// four-family stand "x4" = pre4 + &pr=8 in bands.mjs; this probe
// loads strips.mjs's `four`, whose junction indices ji are the
// same build's. The report names the centres it actually cropped.)
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, PIN, sleep, frames } from "./lib.mjs";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

const Q = "k111&am=instant&fw=0&snd=none&phw=0";
const STANDS = {
  cross: { q: Q, moves: [0, 246, 82, 83, 199], focus: ["node_116", "mnode_48"] },
  four: { q: Q, moves: [0, 247, 248, 69, 72, 73, 95, 140, 180, 176], focus: ["node_378"] },
};
// Brief order: x4 ji 28, ji 147, ji 149 (on the four stand), cross ji 33.
const TARGETS = [
  { stand: "four", ji: 28 },
  { stand: "four", ji: 147 },
  { stand: "four", ji: 149 },
  { stand: "cross", ji: 33 },
];
const OUT = resolve("sheet");
const CROPS = join(OUT, "crops");
mkdirSync(CROPS, { recursive: true });
const CLIP = 200; // CSS px square, centred on the junction
const ZOOM = 90; // px per world unit wanted at the junction

const setFlag = async (page, on) => {
  await page.evaluate(async (on) => {
    const m = await import("/src/render/ribbon/rim_curve.ts");
    m.setRimCurveBiarc(on);
    const r = window.__knotRenderer();
    r.joinery.rebuildFillets(true);
    r.tickPaint(0);
  }, on);
  await frames(page, 3);
  await sleep(200);
};
const centreOf = (page, ji) =>
  page.evaluate((ji) => {
    const fp = window.__knotRenderer().joinery.fieldProbe;
    return { center: fp.center(ji), record: fp.record(ji), arms: (fp.arms(ji) || []).length };
  }, ji);
const screenOf = (page, world) =>
  page.evaluate((w) => {
    const k = window.__knotFabric();
    const w0 = k.toWorld(0, 0), wx = k.toWorld(100, 0), wy = k.toWorld(0, 100);
    return { x: ((w[0] - w0.x) * 100) / (wx.x - w0.x), y: ((w[1] - w0.y) * 100) / (wy.y - w0.y) };
  }, world);
const shootAt = async (page, pt) => {
  const clip = {
    x: Math.max(0, Math.min(1700 - CLIP, Math.round(pt.x - CLIP / 2))),
    y: Math.max(0, Math.min(950 - CLIP, Math.round(pt.y - CLIP / 2))),
    width: CLIP,
    height: CLIP,
  };
  return { buf: await page.screenshot({ type: "png", clip }), clip };
};
function diffCount(aBuf, bBuf) {
  const a = toRGB(decodePNG(aBuf)), b = toRGB(decodePNG(bBuf));
  if (a.W !== b.W || a.H !== b.H) return { px: -1, exact: -1, W: a.W, H: a.H };
  let px = 0, exact = 0;
  for (let i = 0; i < a.W * a.H * 3; i += 3) {
    const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2]));
    if (d > 0) exact++;
    if (d > 8) px++;
  }
  return { px, exact, W: a.W, H: a.H };
}
function upscale2(img) {
  const W = img.W * 2, H = img.H * 2;
  const data = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const si = ((y >> 1) * img.W + (x >> 1)) * 3;
      img.data.copy(data, (y * W + x) * 3, si, si + 3);
    }
  return { W, H, data };
}
function makeSheet(cells, cols) {
  // cells: row-major RGB images (already 2x). Rows here: off, control, on.
  const W = cells[0].W, H = cells[0].H, G = 6;
  const rows = Math.ceil(cells.length / cols);
  const SW = cols * W + (cols + 1) * G, SH = rows * H + (rows + 1) * G;
  const data = Buffer.alloc(SW * SH * 3, 40);
  cells.forEach((im, i) => {
    const ox = G + (i % cols) * (W + G), oy = G + Math.floor(i / cols) * (H + G);
    for (let y = 0; y < H; y++) im.data.copy(data, ((oy + y) * SW + ox) * 3, y * W * 3, (y + 1) * W * 3);
  });
  writeFileSync(join(OUT, "sheet.png"), encodePNG({ W: SW, H: SH, data }));
  console.log(`sheet.png: ${SW}x${SH}, ${rows}x${cols}`);
}

const browser = await openBrowser();
const meta = { targets: [], layout: "sheet.png rows: off / control (2nd off) / on; columns in TARGETS order (four ji28, four ji147, four ji149, cross ji33); each cell a 200 CSS px crop upscaled 2x" };
try {
  for (const tgt of TARGETS) {
    const st = STANDS[tgt.stand];
    const log = [];
    const page = await openPage(browser, st.q, log);
    const rec = { stand: tgt.stand, ji: tgt.ji, usedJi: tgt.ji, replaced: null, log: [] };
    try {
      await waitAsleep(page);
      await viewStill(page);
      for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused on ${tgt.stand}`);
      await waitAsleep(page, 20000);
      let info = await centreOf(page, tgt.ji);
      if (!info.center) throw new Error(`ji ${tgt.ji} has no junction centre on ${tgt.stand}`);
      rec.center = info.center;
      rec.record = info.record;
      rec.arms = info.arms;
      // Zoom on the junction (ctrl+wheel, the pinch path, as strips.mjs).
      let pt = await screenOf(page, info.center);
      const pxPerWorld = () =>
        page.evaluate((p) => {
          const k = window.__knotFabric();
          const a = k.toWorld(p.x, p.y), b = k.toWorld(p.x + 100, p.y);
          return 100 / Math.hypot(b.x - a.x, b.y - a.y);
        }, pt);
      const wheel = async (dy) => {
        await page.mouse.move(pt.x, pt.y);
        await page.keyboard.down("Control");
        await page.mouse.wheel({ deltaY: dy });
        await page.keyboard.up("Control");
        await sleep(250);
        await viewStill(page);
      };
      let s0 = await pxPerWorld();
      if (s0 < ZOOM * 0.97) {
        await wheel(-30);
        const s1 = await pxPerWorld();
        const kEff = Math.log(s1 / s0) / 30;
        if (kEff > 0 && s1 < ZOOM * 0.97) await wheel(-Math.log(ZOOM / s1) / kEff);
      }
      rec.scale = await pxPerWorld();
      await page.mouse.move(2, 2);
      await sleep(400);
      await viewStill(page);
      await waitAsleep(page, 20000);
      await page.evaluate(PIN);
      await sleep(200);
      pt = await screenOf(page, info.center);
      // Control pair first: off, forced rebuild (flag still off), off again.
      await setFlag(page, false);
      const off1 = await shootAt(page, pt);
      await setFlag(page, false);
      const off2 = await shootAt(page, pt);
      await setFlag(page, true);
      const on = await shootAt(page, pt);
      await setFlag(page, false);
      rec.diffControl = diffCount(off1.buf, off2.buf);
      rec.diffOnOff = diffCount(off1.buf, on.buf);
      let used = { ji: tgt.ji, off1, off2, on };
      if (rec.diffOnOff.px === 0) {
        // No rounded wedge (or no rim change) at the named junction:
        // crop the nearest junction (by centre distance) that does
        // change, named by centre and record (brief task 5).
        const all = await page.evaluate(() => {
          const fp = window.__knotRenderer().joinery.fieldProbe;
          const out = [];
          for (let ji = 0; ji < 500; ji++) {
            const c = fp.center(ji);
            if (c) out.push({ ji, center: c, record: fp.record(ji) });
          }
          return out;
        });
        const near = all
          .filter((j) => j.ji !== tgt.ji)
          .sort((a, b) => Math.hypot(a.center[0] - info.center[0], a.center[1] - info.center[1]) - Math.hypot(b.center[0] - info.center[0], b.center[1] - info.center[1]));
        for (const cand of near.slice(0, 16)) {
          const cpt = await screenOf(page, cand.center);
          if (cpt.x < CLIP / 2 || cpt.y < CLIP / 2 || cpt.x > 1700 - CLIP / 2 || cpt.y > 950 - CLIP / 2) continue;
          await setFlag(page, true);
          const cOn = await shootAt(page, cpt);
          await setFlag(page, false);
          const cOff = await shootAt(page, cpt);
          const d = diffCount(cOff.buf, cOn.buf);
          if (d.px > 0) {
            await setFlag(page, false);
            const cOff2 = await shootAt(page, cpt);
            rec.replaced = { ji: cand.ji, center: cand.center, record: cand.record, diffOnOff: d, diffControl: diffCount(cOff.buf, cOff2.buf) };
            rec.usedJi = cand.ji;
            used = { ji: cand.ji, off1: cOff, off2: cOff2, on: cOn };
            break;
          }
        }
        await setFlag(page, false);
      }
      const tag = `${tgt.stand}_ji${used.ji}`;
      writeFileSync(join(CROPS, `${tag}_off.png`), used.off1.buf);
      writeFileSync(join(CROPS, `${tag}_control.png`), used.off2.buf);
      writeFileSync(join(CROPS, `${tag}_on.png`), used.on.buf);
      rec.tag = tag;
      rec.clip = used.off1.clip;
      rec.ctxLost = await page.evaluate(() => window.__ctxLost);
      rec.stamp = await page.evaluate(() => [...document.querySelectorAll("div")].map((d) => d.textContent || "").find((t) => /sim .* wall/.test(t)) || "");
      rec.cells = [used.off1.buf, used.off2.buf, used.on.buf].map((b) => upscale2(toRGB(decodePNG(b))));
      meta.targets.push(rec);
      console.log(`${tag}: centre ${JSON.stringify(rec.center)} rec ${rec.record} scale ${rec.scale?.toFixed(1)} control px>8=${rec.diffControl.px} (exact ${rec.diffControl.exact}) on-off px>8=${rec.diffOnOff.px}${rec.replaced ? ` REPLACED by ji${rec.replaced.ji}` : ""} ctxLost ${rec.ctxLost}`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
// Sheet cells row-major: row0 off, row1 control, row2 on; one column
// per target in TARGETS order.
const cells = [];
for (let r = 0; r < 3; r++) for (const t of meta.targets) cells.push(t.cells[r]);
makeSheet(cells, meta.targets.length);
for (const t of meta.targets) delete t.cells;
writeFileSync(join(OUT, "meta.json"), JSON.stringify(meta, null, 1));
console.log("meta.json written");
