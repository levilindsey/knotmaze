// K868 S1a: export one app frame as a v1 FieldScene, with a master
// screenshot, an overlay and the outline alignment measurement
// (docs/design/K868_s1a_scene_export.md, deliverables 2 and 3).
//
//   node scripts/export_scene.mjs <url> <outBase> [--simT 40] [--dsf 1]
//     [--size 1240x900] [--zoom <poi> <pxPerUnit | Nx>] [--expect-hash <h>]
//     [--master-only]
//   node scripts/export_scene.mjs --batch <jobs.json> [--parallel N]
//
// It loads <url> in a headed, hardware-GPU Chrome (off-screen, a fresh temp
// profile deleted afterwards; never --virtual-time-budget), waits for the
// probe hooks, steps the sim to simT with __knotStepUntil, reads the physics
// hash from __knotPhysDump (and refuses a mismatch with --expect-hash),
// freezes physics, hides the DOM chrome (only the app's canvas stays) and
// waits for a bit-exact camera. Then, per shot, it writes (each file under
// a temporary name, renamed into place):
//   <out>.json         the FieldScene (window.__knotSceneExport)
//   <out>.diag.json    the export's diagnostics, the run, the alignment
//   <out>.master.png   the page at the scene's camera
//   <out>.overlay.png  master + centrelines (cyan), the +-h outlines
//                      (magenta), junction centres and arm stubs (green),
//                      crossings (an X on pass a, red = registered, orange =
//                      emergent; a ring on pass b) and dead ends (yellow;
//                      hollow = off-screen), drawn through the scene's camera
//                      on an in-page canvas
// --master-only writes only the master and the diag.
// --zoom: one ctrl+wheel event zooms by exactly the needed factor at the
// POI (input_pointer.ts: zoomAt by exp(-deltaY * 0.01)), then wheel pans
// centre it; "6x" = 6 x the full frame's pxPerUnit. Physics stays frozen,
// and every shot re-checks the hash and the samples (geomHash).
// The alignment: along each sample's normal, both sides, master's outer
// edge (the 50% crossing from the band's darkest ink to the paper) against
// h; away from junction centres (joinery's fillet reach 1.25 cr h, at least
// 2h, + 2h), crossings (4h), open ends (3h of arc), tight curvature
// (radius < 2h) and any other thread within h + 1.5 px.
//
// A batch file is a JSON array of jobs: {url, out, simT?, dsf?, size?: [w, h],
// zoom?: [poi, target], expectHash?, masterOnly?, census?, variants?: [{out,
// set: {cr?, fl?}}], zooms?: [{out, poi, target}]}. census: step, freeze and
// export only, and report the physics hash and a hash of the exported
// samples (geomHash); no files. variants: render-only params set LIVE
// through the panel's text inputs after the base shot (cr = "Corner reach",
// fl = "Crossing fade", gap = "Crossing gap"), one master each at the base camera, then restored.
// zooms: after the variants. --parallel N runs N browsers. Results go to
// stdout (OK/FAIL lines) and <jobs>.results.json. Every probe link carries
// snd=none and phw=0 (added when missing, refused when different). Pixel
// runs hold the machine-wide perf lock ($env:TEMP\claude-perf.lock).

import puppeteer from "puppeteer-core";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (b) => createHash("sha1").update(b).digest("hex").slice(0, 12);

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

export function geomHash(scene) {
  return sha(JSON.stringify(scene.chains.map((c) => [c.closed, c.pts])));
}

// The machine-wide perf lock (claude-config rules/sessions.md): one line,
// owner + start + what; stale after 30 min.
const LOCK = join(process.env.TEMP ?? tmpdir(), "claude-perf.lock");
async function takeLock(what, maxWaitMs = 15 * 60000) {
  const owner = `K868-S1a export_scene pid ${process.pid}`;
  const t0 = Date.now();
  for (;;) {
    let free = !existsSync(LOCK);
    if (!free) {
      const age = Date.now() - statSync(LOCK).mtimeMs;
      if (age > 30 * 60000) free = true;
    }
    if (free) {
      writeFileSync(LOCK, `${owner} | ${new Date().toISOString()} | ${what}\n`);
      return () => {
        try {
          if (readFileSync(LOCK, "utf8").startsWith(owner)) rmSync(LOCK, { force: true });
        } catch {
          // already gone
        }
      };
    }
    if (Date.now() - t0 > maxWaitMs) {
      throw new Error(`perf lock held for ${maxWaitMs / 60000} min: ${readFileSync(LOCK, "utf8").trim()}`);
    }
    await sleep(5000);
  }
}

// ---- In-page library (serialized into the page by page.evaluate). ----
function pageLib() {
  const L = (window.__k868 = window.__k868 || {});
  L.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  L.lost = L.lost ?? 0;
  for (const c of document.querySelectorAll("canvas")) {
    if (c.__k868lost) continue;
    c.__k868lost = true;
    c.addEventListener("webglcontextlost", () => L.lost++);
  }
  // The app's own canvas: the largest one that is not the loader's or ours
  // (the loader's canvas is the same size; ties go to the later one).
  L.mainCanvas = () => {
    let best = null;
    let area = -1;
    for (const c of document.querySelectorAll("canvas")) {
      if (c.id === "k868-overlay" || c.id === "knot-loading-canvas") continue;
      const r = c.getBoundingClientRect();
      if (r.width * r.height >= area) {
        area = r.width * r.height;
        best = c;
      }
    }
    return best;
  };
  L.hideChrome = () => {
    const c = L.mainCanvas();
    c.setAttribute("data-k868-main", "1");
    if (!document.getElementById("k868-style")) {
      const st = document.createElement("style");
      st.id = "k868-style";
      st.textContent =
        "body * { visibility: hidden !important; } " +
        "canvas[data-k868-main], #k868-overlay { visibility: visible !important; }";
      document.head.appendChild(st);
    }
    const r = c.getBoundingClientRect();
    return {
      canvases: [...document.querySelectorAll("canvas")].map((k) => {
        const b = k.getBoundingClientRect();
        return [k.id || k.className || "canvas", b.left, b.top, b.width, b.height, getComputedStyle(k).visibility];
      }),
      main: { left: r.left, top: r.top, width: r.width, height: r.height },
      dpr: window.devicePixelRatio,
      inner: [window.innerWidth, window.innerHeight],
    };
  };
  // Set a render-only param live through its panel row's text input (the
  // panel's own path: the binding writes the param, the frame loop's
  // handRendererLook hands it to the renderer before the next update()).
  L.setRow = (label, value) => {
    // The label's own text: the panel appends a reset glyph (.kp-reset).
    const text = (l) =>
      l ? [...l.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim() : "";
    const rows = [...document.querySelectorAll(".tp-lblv")];
    const row = rows.find((r) => text(r.querySelector(".tp-lblv_l")) === label);
    if (!row) throw new Error(`no panel row "${label}"`);
    const inp = row.querySelector("input.tp-txtv_i") ?? row.querySelector("input");
    if (!inp) throw new Error(`no input in the panel row "${label}"`);
    inp.value = String(value);
    inp.dispatchEvent(new Event("change", { bubbles: true }));
    return inp.value;
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
  // Wait for a BIT-EXACT view: `need` identical full-precision reads 100 ms
  // apart, frames running (the loop is continuous), at most 20 s. The fit
  // and the panel ease for a while after load, and a three-decimal check
  // passes on a creeping spring tail (probes.md, K431).
  L.settleView = async (need = 8) => {
    const t0 = performance.now();
    let last = "";
    let same = 0;
    for (let i = 0; i < 200; i++) {
      await L.sleep(100);
      const v = L.view();
      const k = `${v.s},${v.x},${v.y}`;
      same = k === last ? same + 1 : 0;
      last = k;
      if (same >= need) return v;
    }
    throw new Error(`the view never held still (${Math.round(performance.now() - t0)} ms): ${last}`);
  };
  // Zoom to `target` CSS px per world unit at world point `at`, then pan it
  // to the canvas centre (input_pointer.ts: ctrl+wheel = zoomAt by
  // exp(-deltaY * 0.01); a wheel with deltaX != 0 = panBy(-deltaX, -deltaY)).
  L.zoomTo = async (at, target) => {
    const cv = L.mainCanvas();
    const r = cv.getBoundingClientRect();
    const scr = (v) => [at[0] * v.s + v.x + r.left, at[1] * v.s + v.y + r.top];
    const wheel = (o) =>
      cv.dispatchEvent(new WheelEvent("wheel", { deltaMode: 0, bubbles: true, cancelable: true, ...o }));
    let v = L.view();
    const wheels = [];
    for (let i = 0; i < 6 && Math.abs(v.s - target) / target > 1e-4; i++) {
      const [px, py] = scr(v);
      wheel({ deltaX: 0, deltaY: -Math.log(target / v.s) / 0.01, ctrlKey: true, clientX: px, clientY: py });
      v = await L.settleView();
      wheels.push(["zoom", v.s]);
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
      wheels.push(["pan", dx, dy]);
    }
    const p = scr(v);
    return { s: v.s, x: v.x, y: v.y, poiCss: p, offCentreCss: [p[0] - r.left - r.width / 2, p[1] - r.top - r.height / 2], wheels };
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
    const Rj = o.rj ?? Math.max(1.25 * cr * h, 2 * h) + 2 * h;
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

export async function launchBrowser(tag = "0") {
  const profileDir = join(tmpdir(), `knotmaze-k868-export-${process.pid}-${tag}`);
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

const ROWS = {
  cr: ["Corner reach", "cuspRadius"],
  fl: ["Crossing fade", "fadeLength"],
  gap: ["Crossing gap", "gap"],
};
const LOOK_KEYS = [
  "threadWidth", "gap", "fadeLength", "cuspRadius", "cornerRoundShare", "flowStrength",
  "threadLook", "borderWidth", "borderColor", "backgroundBase", "mazeFabric",
];

async function exportScene(page, name) {
  return page.evaluate(async (n) => {
    const r = await window.__knotSceneExport({ name: n });
    window.__k868.scene = r.scene;
    return r;
  }, name);
}

async function readParams(page) {
  return page.evaluate((keys) => {
    const p = window.__knotParams();
    return Object.fromEntries(keys.map((k) => [k, p[k]]));
  }, LOOK_KEYS);
}

// One shot at the page's current camera: master, alignment, overlay, files.
async function shoot(page, ctx, shot) {
  const { scene, diag } = shot.ex;
  if (scene.source.physHash !== ctx.hash) {
    throw new Error(`${shot.out}: the physics moved: ${ctx.hash} -> ${scene.source.physHash}`);
  }
  const gh = geomHash(scene);
  // The camera maps world to the SCREENSHOT's CSS px: fold in the canvas
  // offset, and dpr is the screenshot's (the app caps its own at 2).
  const rendererResolution = scene.camera.dpr;
  scene.camera.worldToCss[4] += ctx.chrome.main.left;
  scene.camera.worldToCss[5] += ctx.chrome.main.top;
  scene.camera.dpr = Math.round(ctx.chrome.dpr * 1e6) / 1e6;
  scene.camera.viewport = ctx.chrome.inner;
  await page.evaluate((cam) => {
    window.__k868.scene.camera = cam;
  }, scene.camera);
  const master = Buffer.from(await page.screenshot({ type: "png", captureBeyondViewport: false }));
  const viewAfter = await page.evaluate(() => window.__knotView());
  const camMoved =
    Math.abs(viewAfter.s - scene.camera.pxPerUnit) > 1e-9 ||
    Math.abs(viewAfter.x + ctx.chrome.main.left - scene.camera.worldToCss[4]) > 1e-6 ||
    Math.abs(viewAfter.y + ctx.chrome.main.top - scene.camera.worldToCss[5]) > 1e-6;
  if (camMoved) {
    throw new Error(
      `${shot.out}: the camera moved during the shot: view ${JSON.stringify([viewAfter.s, viewAfter.x, viewAfter.y])}, ` +
        `scene ${JSON.stringify(scene.camera.worldToCss)}`
    );
  }
  const align = await page.evaluate((b64, o) => window.__k868.align(b64, o), master.toString("base64"), shot.align ?? {});
  let overlay = null;
  if (!shot.masterOnly) {
    await page.evaluate(() => window.__k868.drawOverlay());
    overlay = Buffer.from(await page.screenshot({ type: "png", captureBeyondViewport: false }));
    await page.evaluate(() => window.__k868.removeOverlay());
  }
  // The state after the shots: same physics, same samples, no lost context.
  const after = await exportScene(page, scene.name);
  if (after.scene.source.physHash !== ctx.hash) throw new Error(`${shot.out}: the physics moved during the shot`);
  const ghAfter = geomHash(after.scene);
  if (ghAfter !== gh) throw new Error(`${shot.out}: the samples moved during the shot (${gh} -> ${ghAfter})`);
  const lost = await page.evaluate(() => window.__k868.lost);
  if (lost) throw new Error(`${shot.out}: webglcontextlost x${lost}`);
  const params = await readParams(page);
  const info = {
    job: ctx.job,
    shot: { out: shot.out, kind: shot.kind, zoom: shot.zoom ?? null, set: shot.set ?? null },
    pageUrl: scene.source.url,
    step: ctx.step,
    viewStill: ctx.viewStill,
    chrome: ctx.chrome,
    rendererResolution,
    params,
    geomHash: gh,
    masterSha: sha(master),
    camera: scene.camera,
    exportDiag: diag,
    align,
    pageErrors: ctx.errors,
  };
  if (!shot.masterOnly) await writeAtomic(`${shot.out}.json`, JSON.stringify(scene));
  await writeAtomic(`${shot.out}.master.png`, master);
  if (overlay) await writeAtomic(`${shot.out}.overlay.png`, overlay);
  await writeAtomic(`${shot.out}.diag.json`, JSON.stringify(info, null, 1));
  return {
    out: shot.out,
    kind: shot.kind,
    hash: ctx.hash,
    geomHash: gh,
    masterSha: sha(master),
    build: scene.source.build,
    simTime: scene.source.simTime,
    pxPerUnit: scene.camera.pxPerUnit,
    worldToCss: scene.camera.worldToCss,
    dpr: scene.camera.dpr,
    rendererResolution,
    params,
    chains: scene.chains.length,
    crossings: scene.crossings.length,
    junctions: scene.junctions.length,
    deadEnds: scene.deadEnds.length,
    maxEndTucked: diag.maxEndTucked ?? null,
    alignMaxCssPx: align.absMaxCssPx,
    alignMaxImgPx: align.absMaxImgPx,
    alignP99ImgPx: align.absP99ImgPx,
    alignMeanImgPx: align.meanSignedImgPx,
    alignMeasured: align.measured,
    alignRays: align.rays,
    zoom: shot.zoom ? { poi: shot.zoom.poi, s: shot.zoom.s, offCentreCss: shot.zoom.offCentreCss } : null,
    set: shot.set ?? null,
    pageErrors: ctx.errors.length,
  };
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
    step.ms = Date.now() - t0;
    if (job.expectHash && step.hash !== job.expectHash) {
      throw new Error(`hash ${step.hash} != expected ${job.expectHash} (simTime ${step.simTime})`);
    }
    if (step.frozenHash !== step.hash) {
      throw new Error(`the sim moved between the step and the freeze: ${step.hash} -> ${step.frozenHash}`);
    }
    await page.evaluate(pageLib); // listeners on canvases made since
    if (job.census) {
      // A short simT can end while the page is still loading (warm-up,
      // cold shader compiles): the renderer has no samples yet. Wait.
      let ex = null;
      for (let i = 0; !ex; i++) {
        await sleep(i ? 500 : (job.censusWaitMs ?? 1500));
        try {
          ex = await exportScene(page, name);
        } catch (e) {
          if (i >= 120 || !/without samples/.test(e.message)) throw e;
        }
      }
      const ex2 = await exportScene(page, name);
      return [{
        out: job.out, kind: "census", url, hash: step.hash, simTime: step.simTime,
        geomHash: geomHash(ex.scene), geomStable: geomHash(ex2.scene) === geomHash(ex.scene),
        params: await readParams(page), chains: ex.scene.chains.length,
        crossings: ex.scene.crossings.length, junctions: ex.scene.junctions.length,
        pageErrors: errors.length, wallMs: Date.now() - t0,
      }];
    }
    const chrome = await page.evaluate(() => window.__k868.hideChrome());
    const tStill = Date.now();
    const viewStill = await page.evaluate(() => window.__k868.settleView());
    viewStill.ms = Date.now() - tStill;
    const ctx = { job: { ...job, url }, hash: step.hash, step, viewStill, chrome, errors };
    const results = [];
    let ex = await exportScene(page, name);
    const basePx = ex.scene.camera.pxPerUnit;
    const pois = ex.scene.pois;
    const zoomTo = async (poiName, tgt) => {
      const poi = pois.find((p) => p.name === poiName);
      if (!poi) throw new Error(`no POI ${poiName} (have ${pois.map((p) => p.name).join(",")})`);
      const target = parseTarget(tgt, basePx);
      const z = await page.evaluate((at, t) => window.__k868.zoomTo(at, t), poi.at, target);
      if (Math.abs(z.s - target) / target > 1e-3) {
        throw new Error(`zoom to ${poiName}: reached ${z.s}, wanted ${target} (${JSON.stringify(z.wheels)})`);
      }
      return { poi: poiName, at: poi.at, basePxPerUnit: basePx, target, ...z };
    };
    if (job.zoom) {
      const zoom = await zoomTo(job.zoom[0], job.zoom[1]);
      ex = await exportScene(page, name);
      results.push(await shoot(page, ctx, { out, kind: "zoom", ex, zoom, masterOnly: job.masterOnly }));
    } else {
      results.push(await shoot(page, ctx, { out, kind: "base", ex, masterOnly: job.masterOnly }));
    }
    if (job.variants?.length) {
      const orig = await page.evaluate(() => window.__knotParams());
      for (const v of job.variants) {
        for (const [k, val] of Object.entries(v.set)) {
          const [label, key] = ROWS[k] ?? [];
          if (!label) throw new Error(`no live row for ${k}`);
          await page.evaluate((l, x) => window.__k868.setRow(l, x), label, val);
          const now = await page.evaluate((kk) => window.__knotParams()[kk], key);
          if (Math.abs(now - val) > 1e-9) throw new Error(`${k}=${val} did not apply (reads ${now})`);
        }
        await sleep(600);
        await page.evaluate(() => window.__k868.settleView(4));
        const exv = await exportScene(page, name);
        results.push(await shoot(page, ctx, { out: resolve(v.out), kind: "variant", ex: exv, set: v.set, masterOnly: v.masterOnly ?? true }));
      }
      for (const k of new Set(job.variants.flatMap((v) => Object.keys(v.set)))) {
        const [label, key] = ROWS[k];
        await page.evaluate((l, x) => window.__k868.setRow(l, x), label, orig[key]);
      }
      await sleep(600);
    }
    for (const z of job.zooms ?? []) {
      const zoom = await zoomTo(z.poi, z.target);
      const exz = await exportScene(page, name);
      results.push(await shoot(page, ctx, { out: resolve(z.out), kind: "zoom", ex: exz, zoom, masterOnly: z.masterOnly }));
    }
    for (const r of results) r.wallMs = Date.now() - t0;
    return results;
  } finally {
    await page.close();
  }
}

async function main() {
  const argv = process.argv.slice(2);
  let jobs;
  let parallel = 1;
  let resultsPath = null;
  if (argv[0] === "--batch") {
    jobs = JSON.parse(readFileSync(argv[1], "utf8"));
    resultsPath = `${argv[1].replace(/\.json$/, "")}.results.json`;
    const pi = argv.indexOf("--parallel");
    if (pi > 0) parallel = Number(argv[pi + 1]);
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
  const pixels = jobs.some((j) => !j.census);
  const release = pixels ? await takeLock(`scene exports (${jobs.length} jobs)`) : () => {};
  const queue = [...jobs];
  const all = [];
  let failed = 0;
  const worker = async (i) => {
    const { browser, close } = await launchBrowser(String(i));
    try {
      for (let job = queue.shift(); job; job = queue.shift()) {
        try {
          const rs = await runJob(browser, job);
          for (const r of rs) {
            all.push(r);
            console.log(`OK ${JSON.stringify(r)}`);
          }
        } catch (e) {
          failed++;
          all.push({ out: job.out, fail: e.message });
          console.log(`FAIL ${job.out}: ${e.message}`);
        }
      }
    } finally {
      await close();
    }
  };
  try {
    await Promise.all(Array.from({ length: Math.min(parallel, jobs.length) }, (_, i) => worker(i)));
  } finally {
    release();
  }
  if (resultsPath) await writeAtomic(resultsPath, JSON.stringify(all, null, 1));
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
