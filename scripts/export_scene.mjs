// K868 S1a: export one app frame as a v1 FieldScene, with a master
// screenshot, an overlay and the outline alignment measurement
// (docs/design/K868_s1a_scene_export.md, deliverables 2 and 3).
//
//   node scripts/export_scene.mjs <url> <outBase> [--simT 40] [--dsf 1]
//     [--size 1240x900] [--zoom <poi> <pxPerUnit | Nx>] [--expect-hash <h>]
//     [--master-only]
//   node scripts/export_scene.mjs --batch <jobs.json>
//
// It loads <url> in a headed, hardware-GPU Chrome (off-screen, a fresh temp
// profile deleted afterwards; never --virtual-time-budget), waits for the
// probe hooks, steps the sim to simT with __knotStepUntil, reads the physics
// hash from __knotPhysDump (and refuses a mismatch with --expect-hash),
// freezes physics, hides the DOM chrome (canvases stay) and optionally zooms
// at a POI of the export (ctrl+wheel: one exact zoomAt, then a wheel pan
// that centres the POI; physics stays frozen, and the hash is re-checked).
// Then it writes, each under a temporary name renamed into place:
//   <outBase>.json         the FieldScene (window.__knotSceneExport)
//   <outBase>.diag.json    the export's diagnostics, the run, the alignment
//   <outBase>.master.png   the page at the scene's camera
//   <outBase>.overlay.png  master + centrelines, the +-h outlines, junction
//                          centres, crossing marks and dead ends, drawn
//                          through the scene's camera on an in-page canvas
// --master-only writes only the master and the diag: a render-only variant
// (cr, crs, ...) of a geometry exported elsewhere; pass --expect-hash.
// The alignment: along each sample's normal, both sides, master's outer
// edge (the ink-to-paper 50% crossing) against h; away from junctions
// (joinery's fillet reach + 2h), crossings (4h), open ends (3h arc), tight
// curvature (radius < 2h) and any other thread within 1.5 px.
//
// A batch file is a JSON array of {url, out, simT?, dsf?, size?: [w, h],
// zoom?: [poi, target], expectHash?, masterOnly?}; one browser runs them
// all. Every probe link carries snd=none and phw=0 (added when missing).

import puppeteer from "puppeteer-core";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function probeUrl(u) {
  const q = u.indexOf("?");
  const parts = (q < 0 ? "" : u.slice(q + 1)).split("&").filter(Boolean);
  for (const [k, v] of [["snd", "none"], ["phw", "0"]]) {
    const cur = parts.find((s) => s.split("=")[0] === k);
    if (cur === undefined) parts.push(`${k}=${v}`);
    else if (cur !== `${k}=${v}`) throw new Error(`${cur} in the URL; probe links need ${k}=${v}`);
  }
  return `${q < 0 ? u : u.slice(0, q)}?${parts.join("&")}`;
}

// Write under a temporary name, then rename into place (a reader never sees
// half a file). Windows refuses the rename while a reader holds the file:
// retry for a while.
async function writeAtomic(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.part-${process.pid}`;
  writeFileSync(tmp, data);
  for (let i = 0; ; i++) {
    try {
      renameSync(tmp, path);
      return;
    } catch (e) {
      if (i >= 40 || !["EPERM", "EBUSY", "EACCES"].includes(e.code)) throw e;
      await sleep(250);
    }
  }
}

// ---- In-page library (serialized into the page by page.evaluate). ----
function pageLib() {
  const L = (window.__k868 = window.__k868 || {});
  L.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  L.mainCanvas = () => {
    let best = null;
    let area = -1;
    for (const c of document.querySelectorAll("canvas")) {
      if (c.id === "k868-overlay") continue;
      const r = c.getBoundingClientRect();
      if (r.width * r.height > area) {
        area = r.width * r.height;
        best = c;
      }
    }
    return best;
  };
  L.hideChrome = () => {
    if (!document.getElementById("k868-style")) {
      const st = document.createElement("style");
      st.id = "k868-style";
      st.textContent =
        "body * { visibility: hidden !important; } canvas { visibility: visible !important; }";
      document.head.appendChild(st);
    }
    const c = L.mainCanvas();
    const r = c.getBoundingClientRect();
    return {
      canvases: [...document.querySelectorAll("canvas")].map((k) => {
        const b = k.getBoundingClientRect();
        return [k.id || k.className || "canvas", b.left, b.top, b.width, b.height];
      }),
      main: { left: r.left, top: r.top, width: r.width, height: r.height },
      dpr: window.devicePixelRatio,
      inner: [window.innerWidth, window.innerHeight],
    };
  };
  L.arcs = (ch) => {
    const n = ch.pts.length / 2;
    const s = new Float64Array(n + 1);
    for (let i = 1; i < n; i++) {
      s[i] = s[i - 1] + Math.hypot(ch.pts[2 * i] - ch.pts[2 * i - 2], ch.pts[2 * i + 1] - ch.pts[2 * i - 1]);
    }
    s[n] = ch.closed
      ? s[n - 1] + Math.hypot(ch.pts[0] - ch.pts[2 * n - 2], ch.pts[1] - ch.pts[2 * n - 1])
      : s[n - 1];
    return s;
  };
  L.posAt = (ch, A, s) => {
    const n = ch.pts.length / 2;
    if (n === 1) return [ch.pts[0], ch.pts[1]];
    const total = A[n];
    s = ch.closed ? ((s % total) + total) % total : Math.min(Math.max(s, 0), A[n - 1]);
    let lo = 0;
    let hi = ch.closed ? n : n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (A[mid] <= s) lo = mid;
      else hi = mid;
    }
    const j = (lo + 1) % n;
    const len = A[lo + 1] - A[lo];
    const t = len > 0 ? (s - A[lo]) / len : 0;
    return [
      ch.pts[2 * lo] + t * (ch.pts[2 * j] - ch.pts[2 * lo]),
      ch.pts[2 * lo + 1] + t * (ch.pts[2 * j + 1] - ch.pts[2 * lo + 1]),
    ];
  };
  // Unit normal at sample k: central difference, one-sided at open ends.
  L.normal = (ch, k) => {
    const n = ch.pts.length / 2;
    let i0 = k - 1;
    let i1 = k + 1;
    if (ch.closed) {
      i0 = (k - 1 + n) % n;
      i1 = (k + 1) % n;
    } else {
      i0 = Math.max(0, i0);
      i1 = Math.min(n - 1, i1);
    }
    const tx = ch.pts[2 * i1] - ch.pts[2 * i0];
    const ty = ch.pts[2 * i1 + 1] - ch.pts[2 * i0 + 1];
    const l = Math.hypot(tx, ty) || 1;
    return [-ty / l, tx / l];
  };
  L.view = () => window.__knotView();
  L.settleView = async () => {
    let last = "";
    for (let i = 0; i < 40; i++) {
      await L.sleep(120);
      const v = L.view();
      const k = [v.s, v.x, v.y].map((u) => u.toFixed(5)).join();
      if (k === last) return v;
      last = k;
    }
    return L.view();
  };
  // Zoom to `target` CSS px per world unit at world point `at`, then pan it
  // to the viewport centre (input_pointer.ts: ctrl+wheel = zoomAt by
  // exp(-deltaY * 0.01); a wheel with deltaX != 0 = panBy(-deltaX, -deltaY)).
  L.zoomTo = async (at, target) => {
    const cv = L.mainCanvas();
    const r = cv.getBoundingClientRect();
    const scr = (v) => [at[0] * v.s + v.x + r.left, at[1] * v.s + v.y + r.top];
    const wheel = (o) =>
      cv.dispatchEvent(new WheelEvent("wheel", { deltaMode: 0, bubbles: true, cancelable: true, ...o }));
    let v = L.view();
    for (let i = 0; i < 6 && Math.abs(v.s - target) / target > 1e-4; i++) {
      const [px, py] = scr(v);
      wheel({ deltaX: 0, deltaY: -Math.log(target / v.s) / 0.01, ctrlKey: true, clientX: px, clientY: py });
      v = await L.settleView();
    }
    for (let i = 0; i < 6; i++) {
      const [px, py] = scr(v);
      const dx = r.left + r.width / 2 - px;
      const dy = r.top + r.height / 2 - py;
      if (Math.hypot(dx, dy) < 0.25) break;
      wheel({
        deltaX: dx === 0 ? 1e-6 : -dx,
        deltaY: -dy,
        ctrlKey: false,
        clientX: r.left + r.width / 2,
        clientY: r.top + r.height / 2,
      });
      v = await L.settleView();
    }
    return { s: v.s, x: v.x, y: v.y, poiCss: scr(v) };
  };
  L.removeOverlay = () => document.getElementById("k868-overlay")?.remove();
  L.drawOverlay = () => {
    const sc = L.scene;
    const dpr = window.devicePixelRatio;
    L.removeOverlay();
    const cv = document.createElement("canvas");
    cv.id = "k868-overlay";
    cv.width = Math.round(window.innerWidth * dpr);
    cv.height = Math.round(window.innerHeight * dpr);
    Object.assign(cv.style, {
      position: "fixed",
      left: "0px",
      top: "0px",
      width: `${window.innerWidth}px`,
      height: `${window.innerHeight}px`,
      zIndex: "2147483647",
      pointerEvents: "none",
    });
    document.body.appendChild(cv);
    const g = cv.getContext("2d");
    const [a, b, c, d, e, f] = sc.camera.worldToCss;
    const P = (x, y) => [(a * x + c * y + e) * dpr, (b * x + d * y + f) * dpr];
    const h = sc.look.halfWidth;
    const stroke = (pts, closed, color, width) => {
      g.strokeStyle = color;
      g.lineWidth = width;
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      if (closed) g.closePath();
      g.stroke();
    };
    const arcs = sc.chains.map((ch) => L.arcs(ch));
    sc.chains.forEach((ch) => {
      const n = ch.pts.length / 2;
      const cen = [];
      const lft = [];
      const rgt = [];
      for (let k = 0; k < n; k++) {
        const x = ch.pts[2 * k];
        const y = ch.pts[2 * k + 1];
        const [nx, ny] = L.normal(ch, k);
        cen.push(P(x, y));
        lft.push(P(x + nx * h, y + ny * h));
        rgt.push(P(x - nx * h, y - ny * h));
      }
      stroke(lft, ch.closed, "rgba(255,0,200,0.95)", 1);
      stroke(rgt, ch.closed, "rgba(255,0,200,0.95)", 1);
      stroke(cen, ch.closed, "rgba(0,200,255,0.95)", 1);
    });
    for (const j of sc.junctions) {
      const [x, y] = P(j.c[0], j.c[1]);
      g.fillStyle = "rgba(0,170,0,0.95)";
      g.beginPath();
      g.arc(x, y, 3 * dpr, 0, Math.PI * 2);
      g.fill();
      for (const arm of j.arms) {
        const ch = sc.chains[arm.chain];
        const q = L.posAt(ch, arcs[arm.chain], arm.s + arm.dir * 2 * h);
        stroke([[x, y], P(q[0], q[1])], false, "rgba(0,170,0,0.95)", 1.5 * dpr);
      }
    }
    for (const xr of sc.crossings) {
      const p = L.posAt(sc.chains[xr.a.chain], arcs[xr.a.chain], xr.a.s);
      const q = L.posAt(sc.chains[xr.b.chain], arcs[xr.b.chain], xr.b.s);
      const [x, y] = P(p[0], p[1]);
      const m = 4 * dpr;
      g.strokeStyle = xr.emergent ? "rgba(255,140,0,0.95)" : "rgba(230,0,0,0.95)";
      g.lineWidth = 1.5 * dpr;
      g.beginPath();
      g.moveTo(x - m, y - m);
      g.lineTo(x + m, y + m);
      g.moveTo(x - m, y + m);
      g.lineTo(x + m, y - m);
      g.stroke();
      const [u, w] = P(q[0], q[1]);
      g.beginPath();
      g.arc(u, w, 2.5 * dpr, 0, Math.PI * 2);
      g.stroke();
    }
    for (const de of sc.deadEnds) {
      const p = L.posAt(sc.chains[de.chain], arcs[de.chain], de.s);
      const [x, y] = P(p[0], p[1]);
      const m = 3.5 * dpr;
      g.strokeStyle = g.fillStyle = "rgba(255,200,0,0.95)";
      g.lineWidth = 1.5 * dpr;
      if (de.offscreen) g.strokeRect(x - m, y - m, 2 * m, 2 * m);
      else g.fillRect(x - m, y - m, 2 * m, 2 * m);
    }
    return { size: [cv.width, cv.height] };
  };
  // Master's outer edge along sampled normals vs the exported +-h outline.
  L.align = async (b64, o = {}) => {
    const sc = L.scene;
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const W = img.naturalWidth;
    const H = img.naturalHeight;
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const g = cv.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const px = g.getImageData(0, 0, W, H).data;
    const k = W / window.innerWidth; // image px per CSS px
    const [a, b, c, d, e, f] = sc.camera.worldToCss;
    const ppw = Math.hypot(a, b) * k; // image px per world unit
    const toImg = (x, y) => [(a * x + c * y + e) * k, (b * x + d * y + f) * k];
    const L1 = (i, j) => {
      const q = (j * W + i) * 4;
      return 0.2126 * px[q] + 0.7152 * px[q + 1] + 0.0722 * px[q + 2];
    };
    const lum = (x, y) => {
      const fx = x - 0.5;
      const fy = y - 0.5;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      if (x0 < 0 || y0 < 0 || x0 + 1 >= W || y0 + 1 >= H) return NaN;
      const tx = fx - x0;
      const ty = fy - y0;
      return (
        ((1 - tx) * (1 - ty) * L1(x0, y0) +
          tx * (1 - ty) * L1(x0 + 1, y0) +
          (1 - tx) * ty * L1(x0, y0 + 1) +
          tx * ty * L1(x0 + 1, y0 + 1)) /
        255
      );
    };
    const h = sc.look.halfWidth;
    const band = sc.look.band;
    const cr = sc.look.cuspRadius;
    const pxW = 1 / ppw; // one image px, in world units
    const Rj = (o.rj ?? Math.max(1.25 * cr * h, 2 * h) + 2 * h);
    const Rx = o.rx ?? 4 * h;
    const Re = o.re ?? 3 * h;
    const arcs = sc.chains.map((ch) => L.arcs(ch));
    const cell = Math.max(h, 0.25);
    const grid = new Map();
    const key = (gx, gy) => (gx + 50000) * 100003 + (gy + 50000);
    sc.chains.forEach((ch, ci) => {
      for (let kk = 0; kk < ch.pts.length / 2; kk++) {
        const K = key(Math.floor(ch.pts[2 * kk] / cell), Math.floor(ch.pts[2 * kk + 1] / cell));
        let arr = grid.get(K);
        if (!arr) grid.set(K, (arr = []));
        arr.push(ci, kk);
      }
    });
    const blocked = (qx, qy, R, ci, kk, ownArc) => {
      for (let gx = Math.floor((qx - R) / cell); gx <= Math.floor((qx + R) / cell); gx++) {
        for (let gy = Math.floor((qy - R) / cell); gy <= Math.floor((qy + R) / cell); gy++) {
          const arr = grid.get(key(gx, gy));
          if (!arr) continue;
          for (let i = 0; i < arr.length; i += 2) {
            const cj = arr[i];
            const kj = arr[i + 1];
            const ch = sc.chains[cj];
            const dx = ch.pts[2 * kj] - qx;
            const dy = ch.pts[2 * kj + 1] - qy;
            if (dx * dx + dy * dy >= R * R) continue;
            if (cj === ci) {
              const n = ch.pts.length / 2;
              let ds = Math.abs(arcs[ci][kj] - arcs[ci][kk]);
              if (ch.closed) ds = Math.min(ds, arcs[ci][n] - ds);
              if (ds < ownArc) continue;
            }
            return true;
          }
        }
      }
      return false;
    };
    const jc = sc.junctions.map((j) => j.c);
    const xp = [];
    for (const xr of sc.crossings) {
      xp.push(L.posAt(sc.chains[xr.a.chain], arcs[xr.a.chain], xr.a.s));
      xp.push(L.posAt(sc.chains[xr.b.chain], arcs[xr.b.chain], xr.b.s));
    }
    const near = (x, y, list, R) => list.some((p) => (p[0] - x) ** 2 + (p[1] - y) ** 2 < R * R);
    const skip = { end: 0, junction: 0, crossing: 0, curvature: 0, offscreen: 0, neighbour: 0, contrast: 0, noEdge: 0 };
    const rec = [];
    let rays = 0;
    const stride = o.stride ?? 1;
    const step = 0.1;
    for (let ci = 0; ci < sc.chains.length; ci++) {
      const ch = sc.chains[ci];
      const n = ch.pts.length / 2;
      const A = arcs[ci];
      const total = ch.closed ? A[n] : A[n - 1];
      for (let kk = 0; kk < n; kk += stride) {
        const x = ch.pts[2 * kk];
        const y = ch.pts[2 * kk + 1];
        // Curvature from the turn between the neighbouring chords.
        const kp = ch.closed ? (kk - 1 + n) % n : Math.max(0, kk - 1);
        const kn = ch.closed ? (kk + 1) % n : Math.min(n - 1, kk + 1);
        const ax = x - ch.pts[2 * kp];
        const ay = y - ch.pts[2 * kp + 1];
        const bx = ch.pts[2 * kn] - x;
        const by = ch.pts[2 * kn + 1] - y;
        const la = Math.hypot(ax, ay);
        const lb = Math.hypot(bx, by);
        const turn = la > 0 && lb > 0 ? Math.abs(Math.atan2(ax * by - ay * bx, ax * bx + ay * by)) : 0;
        const kappa = la + lb > 0 ? turn / ((la + lb) / 2) : 0;
        for (const side of [1, -1]) {
          rays++;
          if (!ch.closed && (A[kk] < Re || total - A[kk] < Re)) { skip.end++; continue; }
          if (near(x, y, jc, Rj)) { skip.junction++; continue; }
          if (near(x, y, xp, Rx)) { skip.crossing++; continue; }
          if (kappa * h > 0.5) { skip.curvature++; continue; }
          const [n0x, n0y] = L.normal(ch, kk);
          const nx = n0x * side;
          const ny = n0y * side;
          const tOut = h + 4 * pxW;
          const ox = x + nx * h;
          const oy = y + ny * h;
          const qx = x + nx * tOut;
          const qy = y + ny * tOut;
          const [cx, cy] = toImg(x, y);
          const [qix, qiy] = toImg(qx, qy);
          const [eix, eiy] = toImg(x + nx * (h - band) - nx * pxW, y + ny * (h - band) - ny * pxW);
          const inside = (u, w) => u > 2 && w > 2 && u < W - 2 && w < H - 2;
          if (!inside(qix, qiy) || !inside(eix, eiy) || !inside(cx, cy)) { skip.offscreen++; continue; }
          const R = h + 1.5 * pxW;
          const own = 2 * h + 6 * pxW;
          if (blocked(ox, oy, R, ci, kk, own) || blocked(qx, qy, R, ci, kk, own)) { skip.neighbour++; continue; }
          const dl = Math.hypot(qix - cx, qiy - cy);
          const ux = (qix - cx) / dl;
          const uy = (qiy - cy) / dl;
          const hI = h * ppw;
          const t0 = Math.max(0, hI - band * ppw);
          let tMin = t0;
          let lMin = Infinity;
          for (let t = t0; t <= hI; t += step) {
            const l = lum(cx + ux * t, cy + uy * t);
            if (l < lMin) { lMin = l; tMin = t; }
          }
          const lPaper = (lum(cx + ux * (hI + 3), cy + uy * (hI + 3)) + lum(cx + ux * (hI + 4), cy + uy * (hI + 4))) / 2;
          if (!(lPaper - lMin > 0.15)) { skip.contrast++; continue; }
          const th = (lMin + lPaper) / 2;
          let edge = NaN;
          let prev = lMin;
          for (let t = tMin + step; t <= hI + 4; t += step) {
            const l = lum(cx + ux * t, cy + uy * t);
            if (l >= th) {
              edge = t - step + (step * (th - prev)) / (l - prev || 1);
              break;
            }
            prev = l;
          }
          if (!Number.isFinite(edge)) { skip.noEdge++; continue; }
          rec.push({ chain: ci, k: kk, side, err: edge - hI, at: [x, y], img: [cx, cy], ink: lMin, paper: lPaper });
        }
      }
    }
    const abs = rec.map((r) => Math.abs(r.err)).sort((p, q) => p - q);
    const qn = (p) => (abs.length ? abs[Math.min(abs.length - 1, Math.floor(p * abs.length))] : null);
    const mean = rec.length ? rec.reduce((s, r) => s + r.err, 0) / rec.length : null;
    const worst = [...rec].sort((p, q) => Math.abs(q.err) - Math.abs(p.err)).slice(0, 12);
    const hist = {};
    for (const r of rec) {
      const bin = (Math.round(r.err * 10) / 10).toFixed(1);
      hist[bin] = (hist[bin] ?? 0) + 1;
    }
    return {
      image: [W, H],
      imgPxPerCss: k,
      imgPxPerWorld: ppw,
      halfWidthImgPx: h * ppw,
      bandImgPx: band * ppw,
      exclusion: { junctionR: Rj, crossingR: Rx, endArc: Re, maxCurvatureTimesH: 0.5, neighbourPx: 1.5 },
      rays,
      measured: rec.length,
      skip,
      meanSignedImgPx: mean,
      absP50ImgPx: qn(0.5),
      absP95ImgPx: qn(0.95),
      absP99ImgPx: qn(0.99),
      absMaxImgPx: abs.length ? abs[abs.length - 1] : null,
      absMaxCssPx: abs.length ? abs[abs.length - 1] / k : null,
      hist,
      worst,
    };
  };
}

export async function launchBrowser() {
  const profileDir = join(tmpdir(), `knotmaze-k868-export-${process.pid}`);
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: false,
    userDataDir: profileDir,
    defaultViewport: null,
    args: [
      "--use-angle=d3d11",
      "--no-first-run",
      "--no-default-browser-check",
      // Off-screen (a real pointer cannot reach it) and never occluded.
      "--window-position=2200,50",
      "--window-size=1720,1100",
      "--disable-features=CalculateNativeWinOcclusion",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
    ],
  });
  return {
    browser,
    close: async () => {
      await browser.close();
      rmSync(profileDir, { recursive: true, force: true });
    },
  };
}

function parseTarget(t, base) {
  const m = /^([\d.]+)x$/.exec(String(t));
  return m ? base * Number(m[1]) : Number(t);
}

export async function runJob(browser, job) {
  const url = probeUrl(job.url);
  const [vw, vh] = job.size ?? [1240, 900];
  const dsf = job.dsf ?? 1;
  const simT = job.simT ?? 40;
  const out = resolve(job.out);
  const name = job.name ?? out.split(/[\\/]/).pop();
  const t0 = Date.now();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 300)));
  try {
    await page.setViewport({ width: vw, height: vh, deviceScaleFactor: dsf });
    await page.goto(url, { waitUntil: "load", timeout: 120000 });
    await page.waitForFunction(
      () =>
        typeof window.__knotSceneExport === "function" &&
        typeof window.__knotStepUntil === "function" &&
        !!window.__knotPS?.(),
      { timeout: 120000, polling: 100 }
    );
    await page.evaluate(pageLib);
    const step = await page.evaluate(async (T) => {
      const t1 = await window.__knotStepUntil(T);
      const d1 = await window.__knotPhysDump();
      const fr = await window.__knotPhysFreeze(true);
      const d2 = await window.__knotPhysDump();
      window.__knotLoop?.({ continuous: true });
      return { t1, simTime: d1.simTime, hash: d1.hashes.all, frozenHash: d2.hashes.all, frozenSim: d2.simTime, freeze: fr };
    }, simT);
    const tStep = Date.now();
    if (job.expectHash && step.hash !== job.expectHash) {
      throw new Error(`hash ${step.hash} != expected ${job.expectHash} (simTime ${step.simTime})`);
    }
    if (step.frozenHash !== step.hash) {
      throw new Error(`the sim moved between the step and the freeze: ${step.hash} -> ${step.frozenHash}`);
    }
    const chrome = await page.evaluate(() => window.__k868.hideChrome());
    await sleep(900); // frames of the frozen state (continuous loop)
    let ex = await page.evaluate(async (n) => {
      const r = await window.__knotSceneExport({ name: n });
      window.__k868.scene = r.scene;
      return r;
    }, name);
    let zoom = null;
    if (job.zoom) {
      const [poiName, tgt] = job.zoom;
      const poi = ex.scene.pois.find((p) => p.name === poiName);
      if (!poi) throw new Error(`no POI ${poiName} (have ${ex.scene.pois.map((p) => p.name).join(",")})`);
      const base = ex.scene.camera.pxPerUnit;
      const target = parseTarget(tgt, base);
      zoom = await page.evaluate((at, t) => window.__k868.zoomTo(at, t), poi.at, target);
      zoom = { poi: poiName, at: poi.at, basePxPerUnit: base, target, ...zoom };
      await sleep(600);
      ex = await page.evaluate(async (n) => {
        const r = await window.__knotSceneExport({ name: n });
        window.__k868.scene = r.scene;
        return r;
      }, name);
      if (ex.scene.source.physHash !== step.hash) {
        throw new Error(`the zoom moved the physics: ${step.hash} -> ${ex.scene.source.physHash}`);
      }
    }
    const { scene, diag } = ex;
    // The camera maps world to the SCREENSHOT's CSS px: fold in the canvas
    // offset, and dpr is the screenshot's (the app caps its own at 2).
    const rendererResolution = scene.camera.dpr;
    scene.camera.worldToCss[4] += chrome.main.left;
    scene.camera.worldToCss[5] += chrome.main.top;
    scene.camera.dpr = chrome.dpr;
    scene.camera.viewport = chrome.inner;
    await page.evaluate((cam) => {
      window.__k868.scene.camera = cam;
    }, scene.camera);
    const master = Buffer.from(await page.screenshot({ type: "png", captureBeyondViewport: false }));
    const viewAfter = await page.evaluate(() => window.__knotView());
    const camMoved =
      Math.abs(viewAfter.s - scene.camera.pxPerUnit) > 1e-9 ||
      Math.abs(viewAfter.x + chrome.main.left - scene.camera.worldToCss[4]) > 1e-6 ||
      Math.abs(viewAfter.y + chrome.main.top - scene.camera.worldToCss[5]) > 1e-6;
    if (camMoved) throw new Error(`the camera moved during the shot: ${JSON.stringify(viewAfter)}`);
    const align = await page.evaluate((b64, o) => window.__k868.align(b64, o), master.toString("base64"), job.align ?? {});
    let overlay = null;
    if (!job.masterOnly) {
      await page.evaluate(() => window.__k868.drawOverlay());
      overlay = Buffer.from(await page.screenshot({ type: "png", captureBeyondViewport: false }));
      await page.evaluate(() => window.__k868.removeOverlay());
    }
    const finalHash = await page.evaluate(async () => (await window.__knotPhysDump()).hashes.all);
    if (finalHash !== step.hash) throw new Error(`the physics moved during the export: ${finalHash}`);
    const info = {
      job: { ...job, url },
      pageUrl: scene.source.url,
      step: { ...step, ms: tStep - t0 },
      chrome,
      rendererResolution,
      zoom,
      camera: scene.camera,
      exportDiag: diag,
      align,
      pageErrors: errors,
      wallMs: Date.now() - t0,
    };
    if (!job.masterOnly) await writeAtomic(`${out}.json`, JSON.stringify(scene));
    await writeAtomic(`${out}.master.png`, master);
    if (overlay) await writeAtomic(`${out}.overlay.png`, overlay);
    await writeAtomic(`${out}.diag.json`, JSON.stringify(info, null, 1));
    return {
      out,
      hash: step.hash,
      simTime: step.simTime,
      build: scene.source.build,
      pxPerUnit: scene.camera.pxPerUnit,
      dpr: scene.camera.dpr,
      chains: scene.chains.length,
      crossings: scene.crossings.length,
      junctions: scene.junctions.length,
      deadEnds: scene.deadEnds.length,
      alignMaxCssPx: align.absMaxCssPx,
      alignP99ImgPx: align.absP99ImgPx,
      alignMeanImgPx: align.meanSignedImgPx,
      alignMeasured: align.measured,
      zoom: zoom && { poi: zoom.poi, s: zoom.s, poiCss: zoom.poiCss },
      pageErrors: errors.length,
      wallMs: Date.now() - t0,
    };
  } finally {
    await page.close();
  }
}

async function main() {
  const argv = process.argv.slice(2);
  let jobs;
  if (argv[0] === "--batch") {
    jobs = JSON.parse(readFileSync(argv[1], "utf8"));
  } else {
    const [url, out, ...rest] = argv;
    if (!url || !out) {
      console.error("usage: node scripts/export_scene.mjs <url> <outBase> [--simT 40] [--dsf 1] [--size WxH] [--zoom <poi> <pxPerUnit|Nx>] [--expect-hash <h>] [--master-only]");
      process.exit(2);
    }
    const job = { url, out };
    for (let i = 0; i < rest.length; i++) {
      const a = rest[i];
      if (a === "--simT") job.simT = Number(rest[++i]);
      else if (a === "--dsf") job.dsf = Number(rest[++i]);
      else if (a === "--size") job.size = rest[++i].split("x").map(Number);
      else if (a === "--zoom") job.zoom = [rest[++i], rest[++i]];
      else if (a === "--expect-hash") job.expectHash = rest[++i];
      else if (a === "--master-only") job.masterOnly = true;
      else throw new Error(`unknown argument ${a}`);
    }
    jobs = [job];
  }
  const { browser, close } = await launchBrowser();
  let failed = 0;
  try {
    for (const job of jobs) {
      try {
        const r = await runJob(browser, job);
        console.log(`OK ${JSON.stringify(r)}`);
      } catch (e) {
        failed++;
        console.log(`FAIL ${job.out}: ${e.message}`);
      }
    }
  } finally {
    await close();
  }
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
