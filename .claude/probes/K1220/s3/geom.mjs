// K1220 S3: what draws a text fork. Loads one stand (shoot.mjs's rest link),
// waits for sleep, pins the clocks, then re-runs rebuildFillets(true) with
// both fan meshes' pushFan wrapped, so every fan near the record is caught
// with its kind (seal, wedge, cap = the record's cap-cover disc, stadium,
// axis = a host-axis fallback piece). Draws them over the frame on a 2D
// canvas (fans by kind, every chain's centreline and its two edges at its
// own half-width, J and each arm's direction) and writes:
//   <out>/<tag>_geom.json   arms, cuspRadius, fh, the wedge constants, fans,
//                           the chains' samples within 3 fh of J
//   <out>/<tag>_plain.png   the clip around J, no overlay
//   <out>/<tag>_over.png    the same clip with the overlay
//   node geom.mjs <host> <word> <xh3|xh2> <ji> <out> [tag] [boxFh=4]
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, sleep, frames, PIN } from "./lib.mjs";

const [, , HOST, WORD, XH, JI, OUTD, TAG0, BOX0] = process.argv;
const OUT = resolve(OUTD || "out/geom");
const TAG = TAG0 || `${WORD}_${XH}_ji${JI}`;
const BOX = Number(BOX0 || 4);
const hash = XH === "xh2" ? "glyphs2=xh2" : "glyphs2";
const url = `${HOST}/?7&txt=${WORD}&snd=none&phw=0&am=instant&fw=0#${hash}`;
mkdirSync(OUT, { recursive: true });

const browser = await openBrowser();
try {
  const page = await browser.newPage();
  const log = [];
  page.on("pageerror", (e) => log.push(`[pageerror] ${e.message}`));
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });
  await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; });
  await page.goto(url, { waitUntil: "load", timeout: 90000 });
  await page.bringToFront();
  await page.mouse.move(2, 2);
  await page.waitForFunction(() => window.__knotRenderer && window.__knotRenderer(), { timeout: 60000 });
  for (const t0 = Date.now(); Date.now() - t0 < 60000; await sleep(300)) {
    const a = await page.evaluate(() => { const p = window.__knotPerf && window.__knotPerf(); return !!(p && p.asleep); });
    if (a) break;
  }
  await sleep(600);
  await page.evaluate((pinSrc) => { new Function("return (" + pinSrc + ")")()(); }, PIN.toString());
  await frames(page, 4);
  const mark = await page.evaluate(async () => {
    const t = await (await fetch("/src/render/ribbon/joinery.ts")).text();
    return t.includes("K1220 S3");
  });
  const data = await page.evaluate((ji, BOX) => {
    const r = window.__knotRenderer(), v = window.__knotView();
    const fp = r.fieldProbe;
    const c = fp.center(ji);
    const fh = r.style.threadWidth / 2;
    const jx = c[0], jy = c[1], R = BOX * fh;
    const near = (x, y) => Math.hypot(x - jx, y - jy) <= R;
    const fans = [];
    const wrap = (fm, layer) => {
      if (!fm) return;
      fm.pushFan = function (ax, ay, rim, rb, flank, seal, flankFill, bandIn, bandOut) {
        let hit = near(ax, ay);
        for (let i = 0; !hit && i < rim.length; i += 2) hit = near(rim[i], rim[i + 1]);
        if (hit) {
          let kind = seal ? "seal" : flank ? "wedge" : flankFill === 4 ? (rim.length === 34 ? "cap" : "stadium") : "axis";
          fans.push({ layer, kind, rb, apex: [ax, ay], rim: Array.from(rim), flank: flank ? Array.from(flank) : null, flankFill, bandIn, bandOut });
        }
        return Object.getPrototypeOf(this).pushFan.apply(this, arguments);
      };
    };
    wrap(r.filletMesh, "base");
    wrap(r.filletTopMesh, "top");
    r.rebuildFillets(true);
    delete r.filletMesh.pushFan;
    if (r.filletTopMesh) delete r.filletTopMesh.pushFan;
    const arms = (fp.arms(ji) || []).map((a) => ({ ang: a.ang, dx: a.dx, dy: a.dy, chain: a.chain, dir: a.dir, slot: a.slot, arc0: a.arc0, domain: a.domain, toEnd: a.toEnd }));
    const chains = [];
    for (let ci = 0; ci < r.chainSamples.length; ci++) {
      const s = r.chainSamples[ci];
      if (!s) continue;
      let wm = null;
      try { wm = r.withTaper(ci, s, r.revealFx.widthMulFor(ci, s)); } catch (e) { wm = null; }
      const pts = [];
      for (let k = 0; k < s.count; k++) {
        const x = s.positions[k * 2], y = s.positions[k * 2 + 1];
        if (Math.hypot(x - jx, y - jy) <= R * 1.6) pts.push([k, x, y, wm ? wm[k] : 1]);
      }
      if (pts.length) chains.push({ ci, count: s.count, closed: s.closed, glyph: !!(r.style.glyph && r.style.glyph[ci]), pts });
    }
    const jn = r.junctionArms[ji];
    return {
      j: [jx, jy], fh, view: { x: v.x, y: v.y, s: v.s }, cuspRadius: r.cuspRadius, reachPerHalf: r.FILLET_REACH_PER_HALF,
      w: fh * 0.97, L: fh * r.FILLET_REACH_PER_HALF * r.cuspRadius, hidden: r.taperHideJn ? r.taperHideJn[ji] : 0,
      rb: fp.record(ji), arms, jnArms: jn.arms.map((a) => ({ chain: a.chain, slot: a.slot, dir: a.dir })), fans, chains,
    };
  }, Number(JI), BOX);
  const s = data.view.s;
  const half = BOX * data.fh * s;
  const cx = data.j[0] * s + data.view.x, cy = data.j[1] * s + data.view.y;
  const clip = { x: cx - half, y: cy - half, width: 2 * half, height: 2 * half, scale: 2 };
  writeFileSync(join(OUT, `${TAG}_plain.png`), await page.screenshot({ type: "png", clip }));
  await page.evaluate((d) => {
    const cv = document.createElement("canvas");
    cv.width = innerWidth * 2; cv.height = innerHeight * 2;
    cv.style.cssText = `position:fixed;left:0;top:0;width:${innerWidth}px;height:${innerHeight}px;z-index:99999;pointer-events:none`;
    document.body.appendChild(cv);
    const g = cv.getContext("2d");
    g.scale(2, 2);
    const X = (x) => x * d.view.s + d.view.x, Y = (y) => y * d.view.s + d.view.y;
    const col = { seal: "#00ffff", wedge: "#00ff00", cap: "#ffff00", stadium: "#ff8800", axis: "#ff0000" };
    g.lineWidth = 0.6;
    for (const f of d.fans) {
      g.strokeStyle = col[f.kind];
      g.beginPath();
      g.moveTo(X(f.rim[0]), Y(f.rim[1]));
      for (let i = 2; i < f.rim.length; i += 2) g.lineTo(X(f.rim[i]), Y(f.rim[i + 1]));
      g.stroke();
      g.fillStyle = col[f.kind];
      g.fillRect(X(f.apex[0]) - 1, Y(f.apex[1]) - 1, 2, 2);
    }
    const chainCol = ["#ffffff", "#ff66ff", "#66ffff", "#ffaa66"];
    for (const ch of d.chains) {
      const p = ch.pts;
      g.strokeStyle = chainCol[ch.ci % 4];
      for (let side = -1; side <= 1; side++) {
        g.setLineDash(side ? [2, 2] : []);
        g.beginPath();
        let started = false, lastK = -9;
        for (let i = 0; i < p.length; i++) {
          const [k, x, y, wm] = p[i];
          const prev = p[Math.max(0, i - 1)], next = p[Math.min(p.length - 1, i + 1)];
          let tx = next[1] - prev[1], ty = next[2] - prev[2];
          const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
          const ox = x - ty * side * d.fh * wm, oy = y + tx * side * d.fh * wm;
          if (!started || k !== lastK + 1) { g.moveTo(X(ox), Y(oy)); started = true; } else g.lineTo(X(ox), Y(oy));
          lastK = k;
        }
        g.stroke();
      }
      g.setLineDash([]);
      for (const [k, x, y] of p) { g.fillStyle = chainCol[ch.ci % 4]; g.fillRect(X(x) - 0.5, Y(y) - 0.5, 1, 1); }
    }
    g.strokeStyle = "#ff0000"; g.lineWidth = 1;
    g.beginPath(); g.arc(X(d.j[0]), Y(d.j[1]), 2, 0, 7); g.stroke();
    for (const a of d.arms) {
      g.beginPath(); g.moveTo(X(d.j[0]), Y(d.j[1]));
      g.lineTo(X(d.j[0] + a.dx * d.fh * 3), Y(d.j[1] + a.dy * d.fh * 3)); g.stroke();
    }
  }, data);
  await frames(page, 2);
  writeFileSync(join(OUT, `${TAG}_over.png`), await page.screenshot({ type: "png", clip }));
  writeFileSync(join(OUT, `${TAG}_geom.json`), JSON.stringify({ url, mark, ...data, log }, null, 1));
  const kinds = {};
  for (const f of data.fans) kinds[f.kind + "/" + f.layer] = (kinds[f.kind + "/" + f.layer] || 0) + 1;
  console.log(`${TAG}: mark=${mark} rb=${data.rb} arms=${data.arms.length} cuspR=${data.cuspRadius} fh=${data.fh.toFixed(4)} w=${data.w.toFixed(4)} L=${data.L.toFixed(4)} hidden=${data.hidden} fans ${JSON.stringify(kinds)}`);
  for (const a of data.arms) console.log(`  arm c${a.chain} slot ${a.slot} dir ${a.dir} ang ${a.ang.toFixed(3)} dom ${a.domain?.toFixed?.(3)}`);
  for (const ch of data.chains) console.log(`  chain ${ch.ci} glyph=${ch.glyph} count ${ch.count} near k ${ch.pts[0][0]}..${ch.pts[ch.pts.length - 1][0]} (${ch.pts.length})`);
  if (log.length) console.log(log.join("\n"));
} finally {
  await browser.close();
}
