// K1202 task 3h: every fillet triangle covering the bright (col 20) and
// dark (col 21) centreline pixels, in draw order (filletMesh then
// filletTopMesh, index order), with its rec/look/flank/mask per vertex.
//   node stack_cyc.mjs
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, PIN, sleep } from "./lib.mjs";
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
  const out = await page.evaluate(() => {
    const k = window.__knotFabric(), r = window.__knotRenderer();
    const pts = [];
    for (let i = 0; i <= 256; i++) { const q = k.runPoint(210, i / 256); pts.push([q.x, q.y]); }
    const p0 = k.vertexScreen(k.head);
    const a = k.toWorld(p0.x, p0.y), b = k.toWorld(p0.x + 100, p0.y);
    const ppw = 100 / Math.hypot(b.x - a.x, b.y - a.y);
    const DSF = 1.5, m = 1.35 * ppw;
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const clip = { x: Math.floor(Math.min(...xs) - m), y: Math.floor(Math.min(...ys) - m) };
    const samp = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const L = Math.hypot(bx - ax, by - ay) * DSF, n = Math.max(1, Math.round(L));
      for (let j = 0; j < n; j++) samp.push([(ax + ((bx - ax) * j) / n - clip.x) * DSF, (ay + ((by - ay) * j) / n - clip.y) * DSF]);
    }
    // Full-page device px of cols 20 and 21.
    const targets = [20, 21].map((c) => [clip.x * DSF + Math.round(samp[c][0]), clip.y * DSF + Math.round(samp[c][1])]);
    // World -> device, as diag_s4's capture.
    const w0 = k.toWorld(0, 0), w1 = k.toWorld(100, 0), w2 = k.toWorld(0, 100);
    const A = { ax: w0.x, ay: w0.y, bx: (w1.x - w0.x) / 100, by: (w1.y - w0.y) / 100, cx: (w2.x - w0.x) / 100, cy: (w2.y - w0.y) / 100 };
    const det = A.bx * A.cy - A.cx * A.by;
    const stacks = targets.map(() => []);
    const meshes = [["filletMesh", r.filletMesh], ["filletTopMesh", r.filletTopMesh]];
    for (const [mn, mm] of meshes) {
      if (!mm) continue;
      const V = mm.vertexData, R = mm.recData, Ld = mm.lookData, Fl = mm.flankData, Mk = mm.maskData, I = mm.indexData, nI = mm.iUsed;
      for (let t = 0; t * 3 + 2 < nI; t++) {
        const idx = [I[t * 3], I[t * 3 + 1], I[t * 3 + 2]];
        if (idx[0] === idx[1] || idx[1] === idx[2] || idx[0] === idx[2]) continue;
        const P = idx.map((v) => { const dx = V[v * 2] - A.ax, dy = V[v * 2 + 1] - A.ay; return [DSF * (A.cy * dx - A.cx * dy) / det, DSF * (-A.by * dx + A.bx * dy) / det]; });
        targets.forEach(([tx, ty], ti) => {
          const [ax, ay] = P[0], [bx, by] = P[1], [cx, cy] = P[2];
          const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
          if (Math.abs(area) < 1e-9) return;
          const px = tx + 0.5, py = ty + 0.5;
          const wa = ((bx - px) * (cy - py) - (by - py) * (cx - px)) / area;
          const wb = ((cx - px) * (ay - py) - (cy - py) * (ax - px)) / area;
          if (wa >= 0 && wb >= 0 && 1 - wa - wb >= 0) stacks[ti].push({ mesh: mn, t, rec: idx.map((v) => R[v]), look: idx.map((v) => +Ld[v].toFixed(3)), flank: idx.map((v) => Fl ? Fl[v] : null), mask: idx.map((v) => Mk ? Mk[v] : null) });
        });
      }
    }
    return { targets, stacks };
  });
  out.targets.forEach((tp, i) => {
    console.log(`col ${i === 0 ? 20 : 21} device pixel ${JSON.stringify(tp)}: ${out.stacks[i].length} covering triangle(s), in draw order:`);
    for (const s of out.stacks[i]) console.log(`  ${s.mesh} tri ${s.t} rec ${JSON.stringify(s.rec)} look ${JSON.stringify(s.look)} flank ${JSON.stringify(s.flank)} mask ${JSON.stringify(s.mask)}`);
  });
  await page.close();
} finally { await browser.close(); }
