// K1191 copy (Muse batch 19 Run D, 2026-11-04): verbatim copy from .claude/probes/K1139/diag_s4.mjs - stand links, ports and outputs unchanged in the copy; Run D reads Stage 4's dumps with it and changes nothing under K1139. (png.mjs/lib.mjs copied as these tools' imports.)
// K1139 Stage 4 (4.2 tasks 1-2): diag_s3b.mjs plus what the GPU draws that
// the twin did not model. Writes everything diag_s3b.mjs writes (same file
// names and layouts, so every Stage 3 analysis script reads these dumps),
// and per record:
//   r<ji>.tri.bin   the fillet meshes' triangles that touch the record's box,
//                   in DRAW ORDER (filletMesh, then filletTopMesh; index
//                   order inside each), 14 floats each: mesh, t, the three
//                   vertices in page device px (x, y), their aLook, their aRec
//                   (rec = fan, rec + 0.25 = cover strip, another rec = other);
//   r<ji>.tri.json  the meshes' sizes and a geometry hash, taken at the first
//                   and the last phase (the fans must not rebuild between);
//   r<ji>_t<k>.s.{u8,f32,c32,fa32}  the twin evaluated as a cover strip
//                   (fp.at(..., strip = true): the gold reach fh + 1.5 pxW);
//   r<ji>_t<k>.k32  per pixel per band (Float32, 4 each): rule (a)'s ray-hit
//                   segment k (-1 = no hit), the nearest-foot segment k, and
//                   the ray's k window [kA, kB), from the twin as a fan.
// The hook (joinery's __k1139diag) must carry B[22..25] (Stage 4's push).
//   node diag_s4.mjs <stand> <outDir> [frames=8]
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
        const hn = rd[(pb + 2) * 4] ** 2 + rd[(pb + 2) * 4 + 1] ** 2 + rd[(pb + 2) * 4 + 2] ** 2;
        const HB = Math.abs(hn - 1) < 1e-3 || hn === 0 ? 4 : 2;
        const piv = HB === 4 ? { code: rd[(pb + 1) * 4 + 3], P: [rd[(pb + 2) * 4], rd[(pb + 2) * 4 + 1], rd[(pb + 2) * 4 + 2]], side: [rd[(pb + 3) * 4], rd[(pb + 3) * 4 + 1], rd[(pb + 3) * 4 + 2]] } : null;
        const verts = [];
        for (let v = 0; v < nv; v++) {
          const o = (pb + HB + v) * 4;
          verts.push([rd[o], rd[o + 1], rd[o + 2], rd[o + 3]]);
        }
        bands.push({ i, nv, m: rd[pb * 4 + 1], ia: rd[pb * 4 + 2], ib: rd[pb * 4 + 3], distJ: rd[(pb + 1) * 4], flags: rd[(pb + 1) * 4 + 1], shared: rd[(pb + 1) * 4 + 2], piv, verts });
        pb += HB + nv;
      }
      const arms = fp.arms(ji);
      const label = arms.map((a) => ({ chain: a.chain, slot: a.slot, dir: a.dir, dx: a.dx, dy: a.dy }));
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

  // The fillet meshes' triangles in draw order, in page device px.
  const capture = () => page.evaluate((boxes, A, DSF, recs) => {
    const r = window.__knotRenderer();
    const det = A.bx * A.cy - A.cx * A.by;
    const meshes = [r.filletMesh, r.filletTopMesh];
    const out = boxes.map(() => []);
    const info = [];
    let hash = 0;
    for (let mi = 0; mi < meshes.length; mi++) {
      const m = meshes[mi];
      const V = m.vertexData, R = m.recData, L = m.lookData, I = m.indexData, nI = m.iUsed;
      info.push({ mesh: mi, iUsed: nI, vUsed: m.vUsed, parent: m.mesh.parent ? m.mesh.parent.label || "?" : null });
      for (let i = 0; i < m.vUsed * 2; i++) hash = (hash * 31 + Math.round(V[i] * 1e4)) | 0;
      for (let t = 0; t * 3 + 2 < nI; t++) {
        const a = I[t * 3], b = I[t * 3 + 1], c = I[t * 3 + 2];
        if (a === b || b === c || a === c) continue;
        const P = [a, b, c].map((v) => {
          const dx = V[v * 2] - A.ax, dy = V[v * 2 + 1] - A.ay;
          return [DSF * (A.cy * dx - A.cx * dy) / det, DSF * (-A.by * dx + A.bx * dy) / det];
        });
        const x0 = Math.min(P[0][0], P[1][0], P[2][0]), x1 = Math.max(P[0][0], P[1][0], P[2][0]);
        const y0 = Math.min(P[0][1], P[1][1], P[2][1]), y1 = Math.max(P[0][1], P[1][1], P[2][1]);
        for (let bi = 0; bi < boxes.length; bi++) {
          const B = boxes[bi];
          if (x1 < B.x - 1 || x0 > B.x + B.w + 1 || y1 < B.y - 1 || y0 > B.y + B.h + 1) continue;
          out[bi].push(mi, t, P[0][0], P[0][1], P[1][0], P[1][1], P[2][0], P[2][1], L[a], L[b], L[c], R[a], R[b], R[c]);
        }
      }
    }
    const b64 = (u) => {
      let s = "";
      for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
      return btoa(s);
    };
    return { info, hash, tris: out.map((a) => b64(new Uint8Array(new Float32Array(a).buffer))), recs };
  }, meta.recs.map((rc) => rc.box), A, DSF, meta.recs.map((rc) => rc.rb));
  const cap0 = await capture();
  for (let i = 0; i < meta.recs.length; i++) {
    writeFileSync(join(OUT, `r${meta.recs[i].ji}.tri.bin`), Buffer.from(cap0.tris[i], "base64"));
  }

  for (let kf = 0; kf < nf; kf++) {
    const t = 100 + (kf * period) / nf;
    for (const [view, dbg, webs] of [["n", 0, true], ["w", 0, false], ["d", 5, true], ["dw", 5, false]]) {
      await setState(page, { t, dbg, webs });
      writeFileSync(join(OUT, `t${kf}_${view}.png`), await page.screenshot({ type: "png", clip }));
    }
    await setState(page, { t, dbg: 0, webs: true });
    for (const rc of meta.recs) {
      for (const strip of [false, true]) {
        const res = await page.evaluate((ji, box, pxW, A, strip) => {
          const r = window.__knotRenderer();
          const fp = r.fieldProbe;
          const DG = { base: null, gold: null, bands: null, win: -1, drawn: null, out: null };
          globalThis.__k1139diag = DG;
          const out = new Float32Array(4);
          const n = box.w * box.h, NB = 4, PB = 9, PX = NB * PB + 10;
          const f32 = new Float32Array(n * NB * 2);
          const c32 = new Float32Array(n * NB * 2).fill(-1);
          const fa32 = new Float32Array(n * NB * 2).fill(-1);
          const k32 = new Float32Array(n * NB * 4).fill(-2);
          const u8 = new Uint8Array(n * PX);
          const q = (x) => Math.max(0, Math.min(255, Math.round(x * 255)));
          for (let Y = 0; Y < box.h; Y++) {
            for (let X = 0; X < box.w; X++) {
              const sx = (box.x + X + 0.5) / 1.5, sy = (box.y + Y + 0.5) / 1.5;
              const wx = A.ax + A.bx * sx + A.cx * sy, wy = A.ay + A.by * sx + A.cy * sy;
              const i = Y * box.w + X;
              DG.base = null; DG.gold = null; DG.bands = null; DG.win = -1; DG.out = null;
              fp.at(ji, wx, wy, out, pxW, strip);
              const o = i * PX;
              for (let b = 0; b < NB; b++) {
                const B = DG.bands && DG.bands[b];
                if (!B) { f32[(i * NB + b) * 2] = 1e9; continue; }
                f32[(i * NB + b) * 2] = B[1];
                f32[(i * NB + b) * 2 + 1] = B[2];
                if (B.length > 21) { c32[(i * NB + b) * 2] = B[20]; c32[(i * NB + b) * 2 + 1] = B[21]; }
                if (B.length > 25) for (let j = 0; j < 4; j++) k32[(i * NB + b) * 4 + j] = B[22 + j];
                fa32[(i * NB + b) * 2] = B[11]; fa32[(i * NB + b) * 2 + 1] = B[12];
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
          return {
            f32: b64(new Uint8Array(f32.buffer)), u8: b64(u8), c32: b64(new Uint8Array(c32.buffer)),
            fa32: b64(new Uint8Array(fa32.buffer)), k32: b64(new Uint8Array(k32.buffer)),
          };
        }, rc.ji, rc.box, pxW, A, strip);
        const tag = strip ? ".s" : "";
        for (const ext of ["f32", "u8", "c32", "fa32"]) writeFileSync(join(OUT, `r${rc.ji}_t${kf}${tag}.${ext}`), Buffer.from(res[ext], "base64"));
        if (!strip) writeFileSync(join(OUT, `r${rc.ji}_t${kf}.k32`), Buffer.from(res.k32, "base64"));
      }
    }
    console.log(`${STAND} t${kf} done`);
  }
  const cap1 = await capture();
  for (let i = 0; i < meta.recs.length; i++) {
    writeFileSync(join(OUT, `r${meta.recs[i].ji}.tri.json`), JSON.stringify({ first: { info: cap0.info, hash: cap0.hash }, last: { info: cap1.info, hash: cap1.hash }, same: cap0.hash === cap1.hash && cap0.tris[i] === cap1.tris[i] }));
  }
  writeFileSync(join(OUT, "meta.json"), JSON.stringify({ stand: STAND, scale, pxW, fanR, clip, dsf: DSF, period, nf, ...meta }, null, 1));
  console.log(`${STAND}: ${meta.recs.length} banded records, scale ${scale.toFixed(2)} css px/world, fanR ${fanR.toFixed(3)}, geometry same first/last ${cap0.hash === cap1.hash}`);
} finally {
  await browser.close();
}
