// K1139 S3b fix, 4.1: dump the fan's pulse section per device pixel from
// the CPU twin (joinery's temporary __k1139diag hook), per banded record and
// phase, plus the GPU frames of the same clip (normal / webs off / debug 5 /
// debug 5 webs off) so the fan footprint and the drawn colours line up.
//   node diag_s3b.mjs <stand> <outDir> [frames=8]
// Stands, zoom and clip as strips.mjs (x4 = pre4 + &pr=8).
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, PIN, setState, sleep } from "./lib.mjs";

const Q = "k111&am=instant&fw=0&snd=none&phw=0";
const STANDS = {
  fork: { q: Q, moves: [0], focus: ["node_12"], extra: "" },
  cross: { q: Q, moves: [0, 246, 82, 83, 199], focus: ["node_116", "mnode_48"], extra: "" },
  src: { q: Q, moves: [0, 246, 82, 83, 199, 150], focus: ["node_116", "mnode_48"], extra: "" },
  four: { q: Q, moves: [0, 247, 248, 69, 72, 73, 95, 140, 180, 176], focus: ["node_378"], extra: "" },
  x4: { q: Q, moves: [0, 247, 248, 69, 72, 73, 95, 140, 180], focus: ["node_378"], extra: "&pr=8" },
};
const [, , STAND, OUTARG, NF = "8"] = process.argv;
const st = STANDS[STAND];
if (!st) throw new Error(`stand ${STAND}?`);
const OUT = resolve(OUTARG);
mkdirSync(OUT, { recursive: true });
const DSF = 1.5;
const browser = await openBrowser();
const log = [];
try {
  const page = await openPage(browser, st.q + st.extra, log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  const fpt = await page.evaluate((ids) => {
    const k = window.__knotFabric();
    const ps = ids.map((id) => k.vertexScreen(id));
    return { x: ps.reduce((a, p) => a + p.x, 0) / ps.length, y: ps.reduce((a, p) => a + p.y, 0) / ps.length };
  }, st.focus);
  const pxPerWorld = () => page.evaluate((p) => {
    const k = window.__knotFabric();
    const a = k.toWorld(p.x, p.y), b = k.toWorld(p.x + 100, p.y);
    return 100 / Math.hypot(b.x - a.x, b.y - a.y);
  }, fpt);
  const target = 60;
  const wheel = async (dy) => {
    await page.mouse.move(fpt.x, fpt.y);
    await page.keyboard.down("Control");
    await page.mouse.wheel({ deltaY: dy });
    await page.keyboard.up("Control");
    await sleep(250);
    await viewStill(page);
  };
  const s0 = await pxPerWorld();
  if (s0 < target * 0.97) {
    await wheel(-30);
    const s1 = await pxPerWorld();
    const kEff = Math.log(s1 / s0) / 30;
    if (kEff > 0 && s1 < target * 0.97) await wheel(-Math.log(target / s1) / kEff);
  }
  const scale = await pxPerWorld();
  await page.mouse.move(2, 2);
  await sleep(400);
  await viewStill(page);
  await waitAsleep(page, 20000);
  await page.evaluate(PIN);
  await sleep(200);
  const foc = await page.evaluate((ids) => ids.map((id) => window.__knotFabric().vertexScreen(id)), st.focus);
  const cx = foc.reduce((a, p) => a + p.x, 0) / foc.length, cy = foc.reduce((a, p) => a + p.y, 0) / foc.length;
  const CW = 640, CH = 420;
  // Even CSS px, so the clip starts on a whole device pixel at DSF 1.5.
  const clip = { x: Math.max(0, 2 * Math.round((cx - CW / 2) / 2)), y: Math.max(0, 2 * Math.round((cy - CH / 2) / 2)), width: CW, height: CH };

  const meta = await page.evaluate(async () => {
    const mod = (p) => {
      const hit = performance.getEntriesByType("resource").map((e) => e.name).find((n) => n.includes(p));
      return import(hit ?? p);
    };
    const JF = await mod("/src/render/junction_field.ts");
    const r = window.__knotRenderer(), k = window.__knotFabric(), fp = r.fieldProbe;
    const rd = JF.recordData().data;
    // CSS screen -> world, affine from three points.
    const w0 = k.toWorld(0, 0), w1 = k.toWorld(100, 0), w2 = k.toWorld(0, 100);
    const aff = { ax: w0.x, ay: w0.y, bx: (w1.x - w0.x) / 100, by: (w1.y - w0.y) / 100, cx: (w2.x - w0.x) / 100, cy: (w2.y - w0.y) / 100 };
    const slotOf = (a) => r.paintState.routeArmSlot(a.chain, a.ctrl);
    const pbands = window.__knotPulseBands();
    const recs = [];
    for (let ji = 0; ji < r.junctionArms.length; ji++) {
      const rb = fp.record(ji);
      if (rb < 0) continue;
      const routeBase = Math.round(rd[rb * 4 + 3]);
      const nr = Math.round(rd[(rb + 1) * 4 + 3]);
      if (!(routeBase > 0)) continue;
      let base = routeBase;
      const golds = [];
      for (let i = 0; i < nr; i++) {
        const nv = Math.round(rd[base * 4]);
        golds.push({ nv, m: rd[base * 4 + 1], ia: rd[base * 4 + 2], ib: rd[base * 4 + 3] });
        base += 1 + nv;
      }
      const np = Math.round(rd[base * 4]);
      if (!(np > 0 && np <= 4)) continue;
      const bands = [];
      let pb = base + 1;
      for (let i = 0; i < np; i++) {
        const nv = Math.round(rd[pb * 4]);
        const verts = [];
        for (let v = 0; v < nv; v++) {
          const o = (pb + 2 + v) * 4;
          verts.push([rd[o], rd[o + 1], rd[o + 2], rd[o + 3]]);
        }
        bands.push({ i, nv, m: rd[pb * 4 + 1], ia: rd[pb * 4 + 2], ib: rd[pb * 4 + 3], distJ: rd[(pb + 1) * 4], flags: rd[(pb + 1) * 4 + 1], shared: rd[(pb + 1) * 4 + 2], verts });
        pb += 2 + nv;
      }
      const arms = fp.arms(ji);
      const label = arms.map((a) => ({ chain: a.chain, slot: a.slot, dir: a.dir, dx: a.dx, dy: a.dy }));
      // Which walk vertex / edges each band is (as fan.mjs's jiOf).
      for (const b of pbands) {
        const ia = arms.findIndex((x) => x.chain === b.a.chain && x.slot === slotOf(b.a) && x.dir === b.a.dir);
        const ib = arms.findIndex((x) => x.chain === b.b.chain && x.slot === slotOf(b.b) && x.dir === b.b.dir);
        if (ia < 0 || ib < 0) continue;
        const hit = bands.find((x) => Math.round(x.ia) === ia && Math.round(x.ib) === ib);
        if (hit) Object.assign(hit, { vertex: b.vertex, aEdge: b.aEdge, bEdge: b.bEdge, inward: b.inward, slotB: b.slot, sharedB: b.shared });
      }
      recs.push({ ji, rb, c: fp.center(ji), nr, np, golds, bands, arms: label });
    }
    return { aff, recs, spacing: r.pulseSpacing, reach: r.pulseReach, fh: r.style.threadWidth / 2, cusp: r.cuspRadius, head: k.head };
  });
  const A = meta.aff;
  const det = A.bx * A.cy - A.cx * A.by;
  const toCss = (wx, wy) => {
    const dx = wx - A.ax, dy = wy - A.ay;
    return [(A.cy * dx - A.cx * dy) / det, (-A.by * dx + A.bx * dy) / det];
  };
  const fanR = meta.fh * 1.25 * meta.cusp;
  const pxW = 1 / (scale * DSF);
  for (const rc of meta.recs) {
    const [sx, sy] = toCss(rc.c[0], rc.c[1]);
    const R = (fanR + 2 * meta.fh) * scale * DSF;
    const X0 = Math.floor(sx * DSF - R), Y0 = Math.floor(sy * DSF - R);
    rc.box = { x: X0, y: Y0, w: Math.ceil(2 * R), h: Math.ceil(2 * R) };
    rc.css = [sx, sy];
  }
  const period = meta.spacing / 1.6, nf = Number(NF);
  writeFileSync(join(OUT, "meta.json"), JSON.stringify({ stand: STAND, scale, pxW, fanR, clip, dsf: DSF, period, nf, ...meta }, null, 1));
  for (let kf = 0; kf < nf; kf++) {
    const t = 100 + (kf * period) / nf;
    for (const [view, dbg, webs] of [["n", 0, true], ["w", 0, false], ["d", 5, true], ["dw", 5, false]]) {
      await setState(page, { t, dbg, webs });
      writeFileSync(join(OUT, `t${kf}_${view}.png`), await page.screenshot({ type: "png", clip }));
    }
    await setState(page, { t, dbg: 0, webs: true });
    for (const rc of meta.recs) {
      const res = await page.evaluate((ji, box, pxW, A) => {
        const r = window.__knotRenderer();
        const fp = r.fieldProbe;
        const DG = { base: null, gold: null, bands: null, win: -1, drawn: null, out: null };
        globalThis.__k1139diag = DG;
        const out = new Float32Array(4);
        const n = box.w * box.h, NB = 4, PB = 9, PX = NB * PB + 10;
        const f32 = new Float32Array(n * NB * 2);
        const u8 = new Uint8Array(n * PX);
        const q = (x) => Math.max(0, Math.min(255, Math.round(x * 255)));
        for (let Y = 0; Y < box.h; Y++) {
          for (let X = 0; X < box.w; X++) {
            const sx = (box.x + X + 0.5) / 1.5, sy = (box.y + Y + 0.5) / 1.5;
            const wx = A.ax + A.bx * sx + A.cx * sy, wy = A.ay + A.by * sx + A.cy * sy;
            const i = Y * box.w + X;
            DG.base = null; DG.gold = null; DG.bands = null; DG.win = -1; DG.out = null;
            fp.at(ji, wx, wy, out, pxW, false);
            const o = i * PX;
            for (let b = 0; b < NB; b++) {
              const B = DG.bands && DG.bands[b];
              if (!B) { f32[(i * NB + b) * 2] = 1e9; continue; }
              f32[(i * NB + b) * 2] = B[1];
              f32[(i * NB + b) * 2 + 1] = B[2];
              const ob = o + b * PB;
              u8[ob] = q(B[11]); u8[ob + 1] = q(B[4]); u8[ob + 2] = q(B[13]);
              u8[ob + 3] = q(B[14]); u8[ob + 4] = q(B[15]); u8[ob + 5] = q(B[16]);
              u8[ob + 6] = q(B[17]); u8[ob + 7] = q(B[18]); u8[ob + 8] = q(B[19]);
            }
            const oo = o + NB * PB;
            const bs = DG.base || [0, 0, 0], gd = DG.gold || bs, fo = DG.out || out;
            u8[oo] = q(bs[0]); u8[oo + 1] = q(bs[1]); u8[oo + 2] = q(bs[2]);
            u8[oo + 3] = q(gd[0]); u8[oo + 4] = q(gd[1]); u8[oo + 5] = q(gd[2]);
            u8[oo + 6] = q(fo[0]); u8[oo + 7] = q(fo[1]); u8[oo + 8] = q(fo[2]);
            u8[oo + 9] = DG.win + 1;
          }
        }
        delete globalThis.__k1139diag;
        const b64 = (u) => {
          let s = "";
          for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
          return btoa(s);
        };
        return { f32: b64(new Uint8Array(f32.buffer)), u8: b64(u8) };
      }, rc.ji, rc.box, pxW, A);
      writeFileSync(join(OUT, `r${rc.ji}_t${kf}.f32`), Buffer.from(res.f32, "base64"));
      writeFileSync(join(OUT, `r${rc.ji}_t${kf}.u8`), Buffer.from(res.u8, "base64"));
    }
    console.log(`${STAND} t${kf} done`);
  }
  writeFileSync(join(OUT, "meta.json"), JSON.stringify({ stand: STAND, scale, pxW, fanR, clip, dsf: DSF, period, nf, ...meta }, null, 1));
  console.log(`${STAND}: ${meta.recs.length} banded records, scale ${scale.toFixed(2)} css px/world, fanR ${fanR.toFixed(3)}`);
} finally {
  await browser.close();
}
