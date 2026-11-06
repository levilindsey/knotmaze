// K1218 Run O offline analysis on shoot_o's full-viewport shots (no browser).
//   node analyze_o.mjs edges <standDir> <ji> [radiusPx]
//   node analyze_o.mjs slots <standDir> <ji>
//   node analyze_o.mjs layers <standDir> <ji>
// Gold: a pixel within GOLD_TOL (max channel) of the gold colour, the median
// of np's pixels that differ from pure by > 60 (checks2.mjs's rule).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

const load = (f) => toRGB(decodePNG(readFileSync(f)));
const [, , CMD, DIR, JIARG, RADARG] = process.argv;
const JI = Number(JIARG);
const M = JSON.parse(readFileSync(join(DIR, "meta_o.json"), "utf8"));
const R = M.recs.find((q) => q.ji === JI);
if (!R) throw new Error(`no ji ${JI}`);
const dsf = M.dsf || 1.5;
const pxw = M.scale * dsf; // device px per world
const CX = R.sx * dsf, CY = R.sy * dsf;
const px = (I, x, y) => { const o = (y * I.W + x) * 3; return [I.data[o], I.data[o + 1], I.data[o + 2]]; };
const dmax = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
function goldColour() {
  const NP = load(join(DIR, "np.png")), PU = load(join(DIR, "pure.png"));
  const rs = [], gs = [], bs = [];
  for (let y = 0; y < NP.H; y += 2) for (let x = 0; x < NP.W; x += 2) {
    const a = px(NP, x, y);
    if (dmax(a, px(PU, x, y)) > 60) { rs.push(a[0]); gs.push(a[1]); bs.push(a[2]); }
  }
  const med = (v) => v.sort((p, q) => p - q)[v.length >> 1];
  return [med(rs), med(gs), med(bs)];
}
const GOLD = goldColour();
const isGold = (I, x, y) => x >= 0 && y >= 0 && x < I.W && y < I.H && dmax(px(I, x, y), GOLD) <= 48;
console.log(`stand ${M.stand} ji ${JI} centre dev ${CX.toFixed(1)},${CY.toFixed(1)} pxw ${pxw.toFixed(2)} fhPx ${(M.fh * pxw).toFixed(1)} gold ${GOLD}`);

function goldContour(I) {
  const RAD = Number(RADARG || 110);
  const x0 = Math.round(CX - RAD), y0 = Math.round(CY - RAD), S = 2 * RAD + 1;
  const m = new Uint8Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) m[y * S + x] = isGold(I, x0 + x, y0 + y) ? 1 : 0;
  let seed = -1, bd = Infinity;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (m[y * S + x]) { const d = (x - RAD) ** 2 + (y - RAD) ** 2; if (d < bd) { bd = d; seed = y * S + x; } }
  if (seed < 0) return { cont: [], x0, y0, S, RAD };
  const comp = new Uint8Array(S * S), st = [seed];
  comp[seed] = 1;
  while (st.length) {
    const q = st.pop(), qx = q % S, qy = (q - qx) / S;
    for (const [ex, ey] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = qx + ex, ny = qy + ey;
      if (nx < 0 || ny < 0 || nx >= S || ny >= S) continue;
      const o = ny * S + nx;
      if (m[o] && !comp[o]) { comp[o] = 1; st.push(o); }
    }
  }
  let start = -1;
  for (let o = 0; o < S * S && start < 0; o++) if (comp[o]) start = o;
  const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const at = (x, y) => x >= 0 && y >= 0 && x < S && y < S && comp[y * S + x] === 1;
  const cont = [];
  let cxp = start % S, cyp = (start - cxp) / S, bdir = 6;
  const sx = cxp, sy = cyp;
  for (let it = 0; it < S * S * 4; it++) {
    cont.push([x0 + cxp, y0 + cyp]);
    let found = false;
    for (let t = 0; t < 8; t++) {
      const d = (bdir + 1 + t) % 8;
      const nx = cxp + dirs[d][0], ny = cyp + dirs[d][1];
      if (at(nx, ny)) { cxp = nx; cyp = ny; bdir = (d + 4) % 8; found = true; break; }
    }
    if (!found || (cxp === sx && cyp === sy && cont.length > 2)) break;
  }
  return { cont, x0, y0, S, RAD };
}
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-9;
    let bi = -1, bd = 0;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / L;
      if (d > bd) { bd = d; bi = i; }
    }
    if (bi >= 0 && bd > eps) { keep[bi] = 1; stack.push([a, bi], [bi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
if (CMD === "edges") {
  const I = load(join(DIR, "L0_t0.png"));
  const { cont } = goldContour(I);
  console.log(`contour pts ${cont.length}`);
  const simp = rdp(cont, 2.0);
  console.log(`RDP eps 2.0 -> ${simp.length} vertices; segments (device px, angle deg from +x, y down):`);
  for (let i = 0; i + 1 < simp.length; i++) {
    const [x1, y1] = simp[i], [x2, y2] = simp[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 6) continue;
    const ang = (Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI).toFixed(1);
    const dc = Math.hypot((x1 + x2) / 2 - CX, (y1 + y2) / 2 - CY) / (M.fh * pxw);
    console.log(` seg ${i}: (${x1 - CX},${y1 - CY})->(${x2 - CX},${y2 - CY}) len ${len.toFixed(1)} ang ${ang} midR ${dc.toFixed(2)}fh`);
  }
  // Interior edge points: gold boundary within 0.7 fanReach of centre.
  const fanR = (Math.max(M.fh * 1.25 * M.cusp, M.fh) + M.fh) * pxw;
  const inner = cont.filter(([x, y]) => Math.hypot(x - CX, y - CY) < fanR * 0.75);
  console.log(`inner boundary pts (r<${(fanR * 0.75).toFixed(0)}px): ${inner.length} of ${cont.length}; fanR ${fanR.toFixed(0)}px`);
} else if (CMD === "slots") {
  const chOf = (c) => M.dump.chains[String(c)];
  const toDev = (x, y) => {
    // world -> device via meta affine (CSS) then dsf: invert aff like shoot.
    const a = M.aff, dx = x - a.w0x, dy = y - a.w0y, det = a.ax * a.by - a.bx * a.ay;
    return [(a.by * dx - a.bx * dy) / det * dsf, (-a.ay * dx + a.ax * dy) / det * dsf];
  };
  const [ccx, ccy] = [R.c[0], R.c[1]];
  for (const s of M.dump.slots) {
    const ch = chOf(s.overChain);
    const pts = [];
    for (let j = 0; j < s.range.n; j++) {
      const raw = s.range.kStart + j * s.range.stride;
      const idx = ch.closed ? ((raw % ch.count) + ch.count) % ch.count : Math.max(0, Math.min(ch.count - 1, raw));
      pts.push({ x: ch.pos[idx * 2], y: ch.pos[idx * 2 + 1], idx, j });
    }
    let dmin = Infinity;
    for (const p of pts) dmin = Math.min(dmin, Math.hypot(p.x - ccx, p.y - ccy));
    if (dmin > 0.9) continue;
    const d = s.desc;
    // Split: nearest gold-span boundary on over chain (ctrl -> world via ctrlArc interp).
    const ca = ch.ctrlArc, nCtrl = ca.length;
    const arcOfCtrl = (ctrl) => {
      // ctrl unwrapped; fold into [0,nCtrl) with lap offset from ctrlArc ends.
      let c = ctrl;
      if (ch.closed) { c = ((c % nCtrl) + nCtrl) % nCtrl; }
      else c = Math.max(0, Math.min(nCtrl - 1, c));
      const i0 = Math.floor(c) % nCtrl, i1 = (i0 + 1) % nCtrl, f = c - Math.floor(c);
      let a0 = ca[i0], a1 = ca[i1];
      if (ch.closed && i1 === 0) a1 = ch.total;
      return a0 + (a1 - a0) * f;
    };
    const spans = M.dump.spans.filter((sp) => sp.chain === s.overChain);
    let bestB = null;
    for (const sp of spans) for (const b of [sp.c0, sp.c1]) {
      const arc = arcOfCtrl(b);
      // world of arc: nearest sample index.
      const arcPer = ch.total / (ch.closed ? ch.count : ch.count - 1);
      const k = Math.round(arc / arcPer);
      const idx = ch.closed ? ((k % ch.count) + ch.count) % ch.count : Math.max(0, Math.min(ch.count - 1, k));
      const wx = ch.pos[idx * 2], wy = ch.pos[idx * 2 + 1];
      const dist = Math.hypot(wx - ccx, wy - ccy);
      if (!bestB || dist < bestB.dist) bestB = { ctrl: b, arc, idx: k, wx, wy, dist, p0: sp.p0, p1: sp.p1 };
    }
    const [ox, oy] = pts.length ? toDev(pts[0].x, pts[0].y) : [0, 0];
    console.log(`slot ${s.slot} over ch${s.overChain} under ch${s.underChain} dmin ${dmin.toFixed(3)}w hOver ${d.hOver.toFixed(3)} margin ${d.margin.toFixed(3)} n ${s.n} stride ${s.range.stride} win -${d.winNeg.toFixed(2)}/+${d.winPos.toFixed(2)} centre ${d.center.map((v) => v.toFixed(2)).join(",")} split ${bestB ? `ctrl ${bestB.ctrl.toFixed(2)} arc ${bestB.arc.toFixed(2)} sampIdx ${bestB.idx} distToJoint ${bestB.dist.toFixed(3)}w p ${bestB.p0}/${bestB.p1}` : "none"}`);
  }
} else if (CMD === "masks") {
  const fh = M.fh;
  const fanReach = Math.max(fh * 1.25 * M.cusp, fh) + fh;
  console.log(`fanReach ${fanReach.toFixed(3)}w (${(fanReach * pxw).toFixed(0)} dev px)`);
  const slotById = new Map(M.dump.slots.map((s) => [s.slot, s]));
  const wrapAlong = (along, total, closed) => {
    if (!closed) return along;
    let a = ((along % total) + total) % total;
    if (a > total / 2) a -= total;
    return a;
  };
  const arms = R.arms.map((a) => {
    const ch = M.dump.chains[String(a.chain)];
    return { ...a, total: ch.total, closed: ch.closed };
  });
  const ownArm = (slot) => {
    const s = slotById.get(slot);
    if (!s || s.overChain < 0) return false;
    const oc = s.overChain, oa = s.overArc;
    for (const a of arms) {
      if (a.chain !== oc) continue;
      const along = wrapAlong((oa - a.arc0) * a.dir, a.total, a.closed);
      if (along > -fh && along < fanReach + fh) return true;
    }
    return false;
  };
  const cand = new Map();
  for (const a of arms) {
    const wins = M.dump.wins[String(a.chain)] || [];
    for (let w = 0; w < wins.length; w += 4) {
      const slot = wins[w], center = wins[w + 1], wn = wins[w + 2], wp = wins[w + 3];
      const along = wrapAlong((center - a.arc0) * a.dir, a.total, a.closed);
      const lo = along - (a.dir > 0 ? wn : wp), hi = along + (a.dir > 0 ? wp : wn);
      if (hi < -fh || lo > fanReach) continue;
      if (ownArm(slot)) { console.log(` fan-excluded own slot ${slot} (under arm ch${a.chain})`); continue; }
      const dist = Math.max(0, lo);
      if (!cand.has(slot) || dist < cand.get(slot)) cand.set(slot, dist);
    }
  }
  const sorted = [...cand.entries()].sort((a, b) => a[1] - b[1]).slice(0, 4);
  console.log(`fan mask slots (nearest 4): ${sorted.map(([s, d]) => `${s}@${d.toFixed(3)}w`).join(" ") || "none"}`);
  for (const [slot, dist] of sorted) {
    const s = slotById.get(slot), d = s.desc;
    const cr = s.cross ? `over ch${s.cross.over.chain}@${s.cross.over.ctrl.toFixed(2)} under ch${s.cross.under.chain}@${s.cross.under.ctrl.toFixed(2)}` : "emergent/marker";
    console.log(`  fan slot ${slot} dist ${dist.toFixed(3)} overCh ${s.overChain} underCh ${s.underChain} hOver ${d.hOver.toFixed(3)} n ${s.n} ${cr} centre ${d.center.map((v) => v.toFixed(2)).join(",")}`);
  }
  console.log("ribbon windows covering the joint (along 0), per arm:");
  for (const a of arms) {
    const wins = M.dump.wins[String(a.chain)] || [];
    for (let w = 0; w < wins.length; w += 4) {
      const slot = wins[w], center = wins[w + 1], wn = wins[w + 2], wp = wins[w + 3];
      const along = wrapAlong((center - a.arc0) * a.dir, a.total, a.closed);
      if (along < -wp - fh || along > wn + fh) {
        if (Math.abs(along) < fanReach + 1) console.log(`  arm ch${a.chain}:s${a.slot}:d${a.dir} slot ${slot} along ${along.toFixed(3)} win -${wn.toFixed(2)}/+${wp.toFixed(2)} (near, window misses joint)`);
        continue;
      }
      const s = slotById.get(slot), d = s.desc;
      const cr = s.cross ? `over ch${s.cross.over.chain}@${s.cross.over.ctrl.toFixed(2)} under ch${s.cross.under.chain}@${s.cross.under.ctrl.toFixed(2)}` : "emergent/marker";
      console.log(`  arm ch${a.chain}:s${a.slot}:d${a.dir} slot ${slot} along ${along.toFixed(3)} win -${wn.toFixed(2)}/+${wp.toFixed(2)} hOver ${d.hOver.toFixed(3)} margin ${d.margin.toFixed(3)} ${cr}`);
    }
  }
} else if (CMD === "fan") {
  // Fan-slot detail: over arc range, gold boundaries inside it, and how the
  // gold contour's inner points sit against the tube and the split.
  const fh = M.fh;
  const fanReach = Math.max(fh * 1.25 * M.cusp, fh) + fh;
  const slotById = new Map(M.dump.slots.map((s) => [s.slot, s]));
  const wrapAlong = (along, total, closed) => {
    if (!closed) return along;
    let a = ((along % total) + total) % total;
    if (a > total / 2) a -= total;
    return a;
  };
  const arms = R.arms.map((a) => {
    const ch = M.dump.chains[String(a.chain)];
    return { ...a, total: ch.total, closed: ch.closed };
  });
  const ownArm = (slot) => {
    const s = slotById.get(slot);
    if (!s || s.overChain < 0) return false;
    for (const a of arms) {
      if (a.chain !== s.overChain) continue;
      const along = wrapAlong((s.overArc - a.arc0) * a.dir, a.total, a.closed);
      if (along > -fh && along < fanReach + fh) return true;
    }
    return false;
  };
  const cand = new Map();
  for (const a of arms) {
    const wins = M.dump.wins[String(a.chain)] || [];
    for (let w = 0; w < wins.length; w += 4) {
      const slot = wins[w], center = wins[w + 1], wn = wins[w + 2], wp = wins[w + 3];
      const along = wrapAlong((center - a.arc0) * a.dir, a.total, a.closed);
      const lo = along - (a.dir > 0 ? wn : wp), hi = along + (a.dir > 0 ? wp : wn);
      if (hi < -fh || lo > fanReach || ownArm(slot)) continue;
      const dist = Math.max(0, lo);
      if (!cand.has(slot) || dist < cand.get(slot)) cand.set(slot, dist);
    }
  }
  const fanSlots = [...cand.entries()].sort((a, b) => a[1] - b[1]).slice(0, 4).map(([s]) => s);
  const I = load(join(DIR, "L0_t0.png"));
  const { cont } = goldContour(I);
  const inner = cont.filter(([x, y]) => Math.hypot(x - CX, y - CY) < fanReach * pxw);
  console.log(`fan slots ${fanSlots.join(",")} inner contour pts ${inner.length}`);
  const arcOfCtrl = (ch, ctrl) => {
    const ca = ch.ctrlArc, nCtrl = ca.length;
    let c = ctrl;
    if (ch.closed) c = ((c % nCtrl) + nCtrl) % nCtrl;
    else c = Math.max(0, Math.min(nCtrl - 1, c));
    const i0 = Math.floor(c) % nCtrl, i1 = (i0 + 1) % nCtrl, f = c - Math.floor(c);
    let a0 = ca[i0], a1 = ca[i1];
    if (ch.closed && i1 === 0) a1 = ch.total;
    return a0 + (a1 - a0) * f;
  };
  const worldAtArc = (ch, arc) => {
    const arcPer = ch.total / (ch.closed ? ch.count : ch.count - 1);
    const k = Math.round(arc / arcPer);
    const idx = ch.closed ? ((k % ch.count) + ch.count) % ch.count : Math.max(0, Math.min(ch.count - 1, k));
    return { idx: k, x: ch.pos[idx * 2], y: ch.pos[idx * 2 + 1] };
  };
  const toWorld = (dx, dy) => {
    const a = M.aff;
    // device -> CSS (divide dsf) then screen->world via forward affine inverse of shoot's toScreen.
    const sx = dx / dsf, sy = dy / dsf;
    return [a.w0x + a.ax * sx + a.bx * sy, a.w0y + a.ay * sx + a.by * sy];
  };
  for (const slot of fanSlots) {
    const s = slotById.get(slot), ch = M.dump.chains[String(s.overChain)], d = s.desc;
    const arcPer = s.range.arcPer;
    const aStart = s.range.kStart * arcPer, aEnd = (s.range.kStart + (s.range.n - 1) * s.range.stride) * arcPer;
    console.log(` slot ${slot} over ch${s.overChain} under ch${s.underChain} arcRange ${aStart.toFixed(2)}..${aEnd.toFixed(2)} (n ${s.n} stride ${s.range.stride} arcPer ${arcPer.toFixed(4)}) hOver ${d.hOver.toFixed(3)} margin ${d.margin.toFixed(3)}`);
    const bounds = [];
    for (const sp of M.dump.spans.filter((sp) => sp.chain === s.overChain)) {
      for (const b of [sp.c0, sp.c1]) {
        const arc = arcOfCtrl(ch, b);
        if (arc >= aStart - 0.3 && arc <= aEnd + 0.3) {
          const w = worldAtArc(ch, arc);
          bounds.push({ ctrl: b, arc, ...w, dj: Math.hypot(w.x - R.c[0], w.y - R.c[1]) });
        }
      }
    }
    for (const b of bounds) console.log(`   gold boundary ctrl ${b.ctrl.toFixed(2)} arc ${b.arc.toFixed(3)} sampIdx ${b.idx} world ${b.x.toFixed(2)},${b.y.toFixed(2)} distToJoint ${b.dj.toFixed(3)}w`);
    // Contour classification against this tube (nearest over sample dist).
    const pts = [];
    for (let j = 0; j < s.range.n; j++) {
      const raw = s.range.kStart + j * s.range.stride;
      const idx = ch.closed ? ((raw % ch.count) + ch.count) % ch.count : Math.max(0, Math.min(ch.count - 1, raw));
      pts.push({ x: ch.pos[idx * 2], y: ch.pos[idx * 2 + 1], arc: aStart + j * s.range.stride * arcPer });
    }
    let inTube = 0, nearSplit = 0, nearTubeEdge = 0;
    for (const [dx, dy] of inner) {
      const [wx, wy] = toWorld(dx, dy);
      let bd = Infinity, ba = 0;
      for (const p of pts) { const dd = Math.hypot(wx - p.x, wy - p.y); if (dd < bd) { bd = dd; ba = p.arc; } }
      if (bd < d.hOver) inTube++;
      if (bounds.length && Math.min(...bounds.map((b) => Math.abs(ba - b.arc))) < 0.06) nearSplit++;
      if (Math.abs(bd - d.hOver) < 0.03) nearTubeEdge++;
    }
    console.log(`   inner contour: inTube ${inTube}/${inner.length} nearTubeEdge(|d-hOver|<0.03w) ${nearTubeEdge} nearSplit(|arcArc|<0.06w) ${nearSplit}`);
  }
} else if (CMD === "overlay") {
  // Draw slot footprints over the 3x crop: white centreline, red silhouette
  // edges (+-hOver), orange casing edges (+-(hOver+margin)), cyan split line.
  //   node analyze_o.mjs overlay <standDir> <ji> <outPng> <slot...>
  const OUTP = process.argv[5];
  const slotsWanted = process.argv.slice(6).map(Number);
  const I = load(join(DIR, "L0_t0.png"));
  const S = 200, Z = 3, x0 = Math.round(CX - S / 2), y0 = Math.round(CY - S / 2);
  const W = S * Z, H = S * Z, data = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sx = x0 + Math.floor(x / Z), sy = y0 + Math.floor(y / Z), o = (y * W + x) * 3, so = (sy * I.W + sx) * 3;
    data[o] = I.data[so]; data[o + 1] = I.data[so + 1]; data[o + 2] = I.data[so + 2];
  }
  const toDev = (x, y) => {
    const a = M.aff, dx = x - a.w0x, dy = y - a.w0y, det = a.ax * a.by - a.bx * a.ay;
    return [(a.by * dx - a.bx * dy) / det * dsf, (-a.ay * dx + a.ax * dy) / det * dsf];
  };
  const put = (dx, dy, col) => {
    const ox = Math.round((dx - x0) * Z), oy = Math.round((dy - y0) * Z);
    for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) {
      const X = ox + xx, Y = oy + yy;
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const o = (Y * W + X) * 3;
      data[o] = col[0]; data[o + 1] = col[1]; data[o + 2] = col[2];
    }
  };
  const line = (pts, col) => {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) * Z));
      for (let k = 0; k <= n; k++) put(ax + (bx - ax) * k / n, ay + (by - ay) * k / n, col);
    }
  };
  const slotById = new Map(M.dump.slots.map((s) => [s.slot, s]));
  for (const slot of slotsWanted) {
    const s = slotById.get(slot), ch = M.dump.chains[String(s.overChain)], d = s.desc;
    const cen = [], silL = [], silR = [], casL = [], casR = [];
    for (let j = 0; j < s.range.n; j++) {
      const raw = s.range.kStart + j * s.range.stride;
      const idx = ch.closed ? ((raw % ch.count) + ch.count) % ch.count : Math.max(0, Math.min(ch.count - 1, raw));
      const x = ch.pos[idx * 2], y = ch.pos[idx * 2 + 1];
      const tx = ch.pos[Math.min(ch.count - 1, idx + 1) * 2] - ch.pos[Math.max(0, idx - 1) * 2];
      const ty = ch.pos[Math.min(ch.count - 1, idx + 1) * 2 + 1] - ch.pos[Math.max(0, idx - 1) * 2 + 1];
      const L = Math.hypot(tx, ty) || 1, nx = -ty / L, ny = tx / L;
      cen.push(toDev(x, y));
      silL.push(toDev(x + nx * d.hOver, y + ny * d.hOver)); silR.push(toDev(x - nx * d.hOver, y - ny * d.hOver));
      const cm = d.hOver + d.margin;
      casL.push(toDev(x + nx * cm, y + ny * cm)); casR.push(toDev(x - nx * cm, y - ny * cm));
    }
    line(cen, [255, 255, 255]); line(silL, [255, 40, 40]); line(silR, [255, 40, 40]);
    line(casL, [255, 150, 0]); line(casR, [255, 150, 0]);
    // Cyan: gold split lines (span boundaries on the over chain inside the
    // range), drawn across the ribbon (+-0.45 world along the normal).
    const arcOfCtrl = (chh, ctrl) => {
      const ca = chh.ctrlArc, nCtrl = ca.length;
      let c = ctrl;
      if (chh.closed) c = ((c % nCtrl) + nCtrl) % nCtrl;
      else c = Math.max(0, Math.min(nCtrl - 1, c));
      const i0 = Math.floor(c) % nCtrl, i1 = (i0 + 1) % nCtrl, f = c - Math.floor(c);
      let a0 = ca[i0], a1 = ca[i1];
      if (chh.closed && i1 === 0) a1 = chh.total;
      return a0 + (a1 - a0) * f;
    };
    const aStart = s.range.kStart * s.range.arcPer, aEnd = (s.range.kStart + (s.range.n - 1) * s.range.stride) * s.range.arcPer;
    for (const sp of M.dump.spans.filter((sp) => sp.chain === s.overChain)) {
      for (const b of [sp.c0, sp.c1]) {
        const arc = arcOfCtrl(ch, b);
        if (arc < aStart - 0.05 || arc > aEnd + 0.05) continue;
        const arcPerC = ch.total / (ch.closed ? ch.count : ch.count - 1);
        const k = Math.round(arc / arcPerC);
        const idx = ch.closed ? ((k % ch.count) + ch.count) % ch.count : Math.max(0, Math.min(ch.count - 1, k));
        const x = ch.pos[idx * 2], y = ch.pos[idx * 2 + 1];
        const tx = ch.pos[Math.min(ch.count - 1, idx + 1) * 2] - ch.pos[Math.max(0, idx - 1) * 2];
        const ty = ch.pos[Math.min(ch.count - 1, idx + 1) * 2 + 1] - ch.pos[Math.max(0, idx - 1) * 2 + 1];
        const L = Math.hypot(tx, ty) || 1, nx = -ty / L, ny = tx / L;
        line([toDev(x - nx * 0.45, y - ny * 0.45), toDev(x + nx * 0.45, y + ny * 0.45)], [0, 220, 255]);
        console.log(` slot ${slot} split ctrl ${b.toFixed(2)} arc ${arc.toFixed(3)} sampIdx ${k}`);
      }
    }
    // Magenta: under-window end lines (centreArc +- win, across the under ribbon).
    const uch = M.dump.chains[String(s.underChain)];
    if (uch) {
      const arcPerU = uch.total / (uch.closed ? uch.count : uch.count - 1);
      for (const off of [-d.winNeg, d.winPos]) {
        const arc = d.centerArc + off;
        const k = Math.round(arc / arcPerU);
        const idx = uch.closed ? ((k % uch.count) + uch.count) % uch.count : Math.max(0, Math.min(uch.count - 1, k));
        if (idx < 0 || idx >= uch.count) continue;
        const x = uch.pos[idx * 2], y = uch.pos[idx * 2 + 1];
        const tx = uch.pos[Math.min(uch.count - 1, idx + 1) * 2] - uch.pos[Math.max(0, idx - 1) * 2];
        const ty = uch.pos[Math.min(uch.count - 1, idx + 1) * 2 + 1] - uch.pos[Math.max(0, idx - 1) * 2 + 1];
        const L = Math.hypot(tx, ty) || 1, nx = -ty / L, ny = tx / L;
        line([toDev(x - nx * 0.45, y - ny * 0.45), toDev(x + nx * 0.45, y + ny * 0.45)], [255, 0, 255]);
      }
      console.log(` slot ${slot} window ends at under arcs ${(d.centerArc - d.winNeg).toFixed(2)} / ${(d.centerArc + d.winPos).toFixed(2)} (centreArc ${d.centerArc.toFixed(2)})`);
    }
    console.log(`slot ${slot} drawn: over ch${s.overChain} under ch${s.underChain} n ${s.n}`);
  }
  writeFileSync(OUTP, encodePNG({ W, H, data }));
  console.log(`${OUTP}: ${W}x${H}`);
} else if (CMD === "match") {
  // Match each RDP gold segment to candidate lines: split (cyan idea),
  // window ends, tube silhouette/casing edges, for every slot on the
  // junction's chains near the joint. Distances in device px.
  const I = load(join(DIR, "L0_t0.png"));
  const { cont } = goldContour(I);
  const simp = rdp(cont, 2.0);
  const segs = [];
  for (let i = 0; i + 1 < simp.length; i++) {
    const [x1, y1] = simp[i], [x2, y2] = simp[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 12) continue;
    const dc = Math.hypot((x1 + x2) / 2 - CX, (y1 + y2) / 2 - CY) / (M.fh * pxw);
    if (dc > 2.8) continue;
    segs.push({ i, x1, y1, x2, y2, len, ang: Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI, dc });
  }
  const toDev = (x, y) => {
    const a = M.aff, dx = x - a.w0x, dy = y - a.w0y, det = a.ax * a.by - a.bx * a.ay;
    return [(a.by * dx - a.bx * dy) / det * dsf, (-a.ay * dx + a.ax * dy) / det * dsf];
  };
  const arcOfCtrl = (chh, ctrl) => {
    const ca = chh.ctrlArc, nCtrl = ca.length;
    let c = ctrl;
    if (chh.closed) c = ((c % nCtrl) + nCtrl) % nCtrl;
    else c = Math.max(0, Math.min(nCtrl - 1, c));
    const i0 = Math.floor(c) % nCtrl, i1 = (i0 + 1) % nCtrl, f = c - Math.floor(c);
    let a0 = ca[i0], a1 = ca[i1];
    if (chh.closed && i1 === 0) a1 = chh.total;
    return a0 + (a1 - a0) * f;
  };
  const ptAtArc = (chh, arc) => {
    const arcPer = chh.total / (chh.closed ? chh.count : chh.count - 1);
    const k = Math.round(arc / arcPer);
    const idx = chh.closed ? ((k % chh.count) + chh.count) % chh.count : Math.max(0, Math.min(chh.count - 1, k));
    const x = chh.pos[idx * 2], y = chh.pos[idx * 2 + 1];
    const tx = chh.pos[Math.min(chh.count - 1, idx + 1) * 2] - chh.pos[Math.max(0, idx - 1) * 2];
    const ty = chh.pos[Math.min(chh.count - 1, idx + 1) * 2 + 1] - chh.pos[Math.max(0, idx - 1) * 2 + 1];
    const L = Math.hypot(tx, ty) || 1;
    return { x, y, nx: -ty / L, ny: tx / L, idx: k };
  };
  const linePts = (p, half) => [toDev(p.x - p.nx * half, p.y - p.ny * half), toDev(p.x + p.nx * half, p.y + p.ny * half)];
  const distToSeg = (pxx, pyy, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((pxx - a[0]) * dx + (pyy - a[1]) * dy) / L2));
    return Math.hypot(pxx - (a[0] + dx * t), pyy - (a[1] + dy * t));
  };
  const distToPoly = (pxx, pyy, pts) => {
    let best = Infinity;
    for (let i = 0; i + 1 < pts.length; i++) best = Math.min(best, distToSeg(pxx, pyy, pts[i], pts[i + 1]));
    return best;
  };
  const armChains = new Set(R.arms.map((a) => a.chain));
  const cands = [];
  for (const s of M.dump.slots) {
    if (!armChains.has(s.overChain) && !armChains.has(s.underChain)) continue;
    const dc = s.desc.center, dj = Math.hypot(dc[0] - R.c[0], dc[1] - R.c[1]);
    if (dj > 2.5) continue;
    const ch = M.dump.chains[String(s.overChain)], d = s.desc;
    // Tube edges.
    for (const [kind, rad] of [["sil", d.hOver], ["cas", d.hOver + d.margin]]) {
      for (const side of [1, -1]) {
        const pts = [];
        for (let j = 0; j < s.range.n; j++) {
          const raw = s.range.kStart + j * s.range.stride;
          const idx = ch.closed ? ((raw % ch.count) + ch.count) % ch.count : Math.max(0, Math.min(ch.count - 1, raw));
          const x = ch.pos[idx * 2], y = ch.pos[idx * 2 + 1];
          const p = ptAtArc(ch, (s.range.kStart + j * s.range.stride) * s.range.arcPer);
          pts.push(toDev(x + p.nx * rad * side, y + p.ny * rad * side));
        }
        cands.push({ name: `slot${s.slot}:${kind}${side > 0 ? "+" : "-"}`, pts });
      }
    }
    const cen = [];
    for (let j = 0; j < s.range.n; j++) {
      const raw = s.range.kStart + j * s.range.stride;
      const idx = ch.closed ? ((raw % ch.count) + ch.count) % ch.count : Math.max(0, Math.min(ch.count - 1, raw));
      cen.push(toDev(ch.pos[idx * 2], ch.pos[idx * 2 + 1]));
    }
    cands.push({ name: `slot${s.slot}:centre`, pts: cen });
    // Splits inside range.
    const aStart = s.range.kStart * s.range.arcPer, aEnd = (s.range.kStart + (s.range.n - 1) * s.range.stride) * s.range.arcPer;
    for (const sp of M.dump.spans.filter((sp) => sp.chain === s.overChain)) {
      for (const b of [sp.c0, sp.c1]) {
        const arc = arcOfCtrl(ch, b);
        if (arc < aStart - 0.05 || arc > aEnd + 0.05) continue;
        cands.push({ name: `slot${s.slot}:split${b.toFixed(1)}`, pts: linePts(ptAtArc(ch, arc), 0.55) });
      }
    }
    // Window ends on under.
    const uch = M.dump.chains[String(s.underChain)];
    for (const [tag, off] of [["winLo", -d.winNeg], ["winHi", d.winPos]]) {
      cands.push({ name: `slot${s.slot}:${tag}`, pts: linePts(ptAtArc(uch, d.centerArc + off), 0.55) });
    }
  }
  console.log(`segments ${segs.length} candidates ${cands.length}`);
  for (const sg of segs) {
    const mx = (sg.x1 + sg.x2) / 2, my = (sg.y1 + sg.y2) / 2;
    const scored = cands.map((c) => ({ name: c.name, d: distToPoly(mx, my, c.pts), e: (distToPoly(sg.x1, sg.y1, c.pts) + distToPoly(sg.x2, sg.y2, c.pts)) / 2 })).sort((a, b) => a.d - b.d).slice(0, 3);
    console.log(` seg${sg.i} len ${sg.len.toFixed(0)} ang ${sg.ang.toFixed(0)} midR ${sg.dc.toFixed(2)}fh -> ${scored.map((s) => `${s.name} mid ${s.d.toFixed(1)}px ends ${s.e.toFixed(1)}px`).join(" | ")}`);
  }
} else if (CMD === "maskdiff") {
  // What the mask draws in the crop: L0 vs nomask, colour clusters.
  const A = load(join(DIR, "L0_t0.png")), B = load(join(DIR, "nomask.png")), BG = load(join(DIR, "bg.png")), PU = load(join(DIR, "pure.png")), W0 = load(join(DIR, "w0_t0.png"));
  const RAD = 100, x0 = Math.round(CX - RAD), y0 = Math.round(CY - RAD);
  const pts = [];
  for (let y = 0; y < 2 * RAD; y++) for (let x = 0; x < 2 * RAD; x++) {
    if (dmax(px(A, x0 + x, y0 + y), px(B, x0 + x, y0 + y)) > 12) pts.push([x0 + x, y0 + y]);
  }
  console.log(`mask-diff px ${pts.length} in 200px crop`);
  // Cluster by L0 colour (32-level bins), report largest bins with mean colours in each shot.
  const bins = new Map();
  for (const [x, y] of pts) {
    const c = px(A, x, y), k = `${c[0] >> 5},${c[1] >> 5},${c[2] >> 5}`;
    if (!bins.has(k)) bins.set(k, []);
    bins.get(k).push([x, y]);
  }
  const top = [...bins.values()].sort((a, b) => b.length - a.length).slice(0, 6);
  for (const g of top) {
    const mean = (I) => {
      const s = [0, 0, 0];
      for (const [x, y] of g) { const c = px(I, x, y); s[0] += c[0]; s[1] += c[1]; s[2] += c[2]; }
      return s.map((v) => Math.round(v / g.length)).join(",");
    };
    const xs = g.map((p) => p[0] - CX), ys = g.map((p) => p[1] - CY);
    console.log(` bin n ${g.length} devX ${Math.min(...xs)}..${Math.max(...xs)} devY ${Math.min(...ys)}..${Math.max(...ys)} L0 ${mean(A)} | nomask ${mean(B)} | pure ${mean(PU)} | w0 ${mean(W0)} | bg ${mean(BG)}`);
  }
  // Enclosed holes in the gold mask (triangle finder) for L0 and pure-ribbon mask.
  const hole = (I, refI) => {
    const S = 2 * RAD + 1, m = new Uint8Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) m[y * S + x] = isGold(I, x0 - 1 + x, y0 - 1 + y) ? 1 : 0;
    const seen = new Uint8Array(S * S), st = [];
    for (let x = 0; x < S; x++) { st.push(x, (S - 1) * S + x); }
    for (let y = 0; y < S; y++) { st.push(y * S, y * S + S - 1); }
    while (st.length) { const q = st.pop(); if (seen[q] || m[q]) continue; seen[q] = 1; const qx = q % S, qy = (q - qx) / S; for (const [ex, ey] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = qx + ex, ny = qy + ey; if (nx >= 0 && ny >= 0 && nx < S && ny < S) st.push(ny * S + nx); } }
    const holes = [];
    for (let o = 0; o < S * S; o++) if (!m[o] && !seen[o]) holes.push(o);
    return holes.map((o) => [x0 - 1 + (o % S), y0 - 1 + ((o - (o % S)) / S)]);
  };
  for (const [name, I] of [["L0", A], ["pure(as gold-ref)", PU]]) {
    const h = name === "L0" ? hole(I) : [];
    if (h.length) {
      const mean = (J) => { const s = [0, 0, 0]; for (const [x, y] of h) { const c = px(J, x, y); s[0] += c[0]; s[1] += c[1]; s[2] += c[2]; } return s.map((v) => Math.round(v / h.length)).join(","); };
      console.log(` ${name} gold holes ${h.length}px L0 ${mean(A)} pure ${mean(PU)} bg ${mean(BG)} nomask ${mean(B)} w0 ${mean(W0)}`);
    } else console.log(` ${name} gold holes 0px`);
  }
} else if (CMD === "pixel") {
  // Colours at device offset (dx,dy from joint centre) in every shot.
  //   node analyze_o.mjs pixel <standDir> <ji> <dx> <dy>
  const dx = Number(process.argv[5]), dy = Number(process.argv[6]);
  const files = ["L0_t0.png", "w0_t0.png", "nb_t0.png", "np.png", "pure.png", "nomask.png", "bg.png"];
  const X = Math.round(CX + dx), Y = Math.round(CY + dy);
  console.log(`pixel dev ${X},${Y} (offset ${dx},${dy})`);
  for (const f of files) {
    const I = load(join(DIR, f));
    const c = px(I, X, Y);
    const s = [0, 0, 0];
    for (let yy = -2; yy <= 2; yy++) for (let xx = -2; xx <= 2; xx++) { const q = px(I, X + xx, Y + yy); s[0] += q[0]; s[1] += q[1]; s[2] += q[2]; }
    console.log(` ${f} centre ${c.join(",")} 5x5mean ${s.map((v) => Math.round(v / 25)).join(",")}`);
  }
} else if (CMD === "holes") {
  const A = load(join(DIR, "L0_t0.png"));
  const RAD = 100, x0 = Math.round(CX - RAD), y0 = Math.round(CY - RAD);
  const S = 2 * RAD + 1, m = new Uint8Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) m[y * S + x] = isGold(A, x0 - 1 + x, y0 - 1 + y) ? 1 : 0;
  const seen = new Uint8Array(S * S), st = [];
  for (let x = 0; x < S; x++) { st.push(x, (S - 1) * S + x); }
  for (let y = 0; y < S; y++) { st.push(y * S, y * S + S - 1); }
  while (st.length) { const q = st.pop(); if (seen[q] || m[q]) continue; seen[q] = 1; const qx = q % S, qy = (q - qx) / S; for (const [ex, ey] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = qx + ex, ny = qy + ey; if (nx >= 0 && ny >= 0 && nx < S && ny < S) st.push(ny * S + nx); } }
  const holes = [];
  for (let o = 0; o < S * S; o++) if (!m[o] && !seen[o]) holes.push([x0 - 1 + (o % S), y0 - 1 + ((o - (o % S)) / S)]);
  console.log(`holes ${holes.length}px`);
  for (const [x, y] of holes) console.log(` hole dev offset ${x - CX},${y - CY} L0 ${px(A, x, y).join(",")}`);
} else if (CMD === "near") {
  // Mask-diff pixels near the centre, with colours (notch / triangle hunt).
  const RAD = Number(process.argv[5] || 55);
  const A = load(join(DIR, "L0_t0.png")), B = load(join(DIR, "nomask.png")), PU = load(join(DIR, "pure.png")), BG = load(join(DIR, "bg.png")), W0 = load(join(DIR, "w0_t0.png"));
  const rows = [];
  for (let dy = -RAD; dy <= RAD; dy++) for (let dx = -RAD; dx <= RAD; dx++) {
    const X = Math.round(CX + dx), Y = Math.round(CY + dy);
    const a = px(A, X, Y), b = px(B, X, Y);
    if (dmax(a, b) > 12) rows.push({ dx, dy, a, b, pu: px(PU, X, Y), bg: px(BG, X, Y), w0: px(W0, X, Y) });
  }
  console.log(`near r${RAD}: ${rows.length} mask-diff px`);
  for (const r of rows) console.log(` (${r.dx},${r.dy}) L0 ${r.a.join(",")} nomask ${r.b.join(",")} pure ${r.pu.join(",")} w0 ${r.w0.join(",")} bg ${r.bg.join(",")}`);
} else if (CMD === "notch") {
  // Pixels that are gold without the mask but not gold with it (mask-cut
  // gold), and what L0 shows there, near the centre.
  const RAD = Number(process.argv[5] || 100);
  const A = load(join(DIR, "L0_t0.png")), B = load(join(DIR, "nomask.png")), PU = load(join(DIR, "pure.png")), W0 = load(join(DIR, "w0_t0.png")), BG = load(join(DIR, "bg.png"));
  const rows = [];
  for (let dy = -RAD; dy <= RAD; dy++) for (let dx = -RAD; dx <= RAD; dx++) {
    const X = Math.round(CX + dx), Y = Math.round(CY + dy);
    if (!isGold(B, X, Y) || isGold(A, X, Y)) continue;
    rows.push({ dx, dy, a: px(A, X, Y), pu: px(PU, X, Y), w0: px(W0, X, Y), bg: px(BG, X, Y) });
  }
  console.log(`mask-cut gold px (nomask gold, L0 not) r${RAD}: ${rows.length}`);
  if (rows.length) {
    const xs = rows.map((r) => r.dx), ys = rows.map((r) => r.dy);
    console.log(` bbox dx ${Math.min(...xs)}..${Math.max(...xs)} dy ${Math.min(...ys)}..${Math.max(...ys)}`);
    const mean = (k) => { const s = [0, 0, 0]; for (const r of rows) { s[0] += r[k][0]; s[1] += r[k][1]; s[2] += r[k][2]; } return s.map((v) => Math.round(v / rows.length)).join(","); };
    console.log(` mean L0 ${mean("a")} pure ${mean("pu")} w0 ${mean("w0")} bg ${mean("bg")}`);
    // Connected clusters (4-neighbour) with sizes and colour means.
    const set = new Set(rows.map((r) => `${r.dx},${r.dy}`));
    const seen = new Set(), clusters = [];
    for (const r of rows) {
      const k0 = `${r.dx},${r.dy}`;
      if (seen.has(k0)) continue;
      const st = [r], cl = [];
      seen.add(k0);
      while (st.length) { const q = st.pop(); cl.push(q); for (const [ex, ey] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const kk = `${q.dx + ex},${q.dy + ey}`; if (set.has(kk) && !seen.has(kk)) { seen.add(kk); const f = rows.find((z) => z.dx === q.dx + ex && z.dy === q.dy + ey); if (f) st.push(f); } } }
      clusters.push(cl);
    }
    clusters.sort((a, b) => b.length - a.length);
    for (const cl of clusters.slice(0, 5)) {
      const s = [0, 0, 0], sp = [0, 0, 0];
      for (const r of cl) { s[0] += r.a[0]; s[1] += r.a[1]; s[2] += r.a[2]; sp[0] += r.pu[0]; sp[1] += r.pu[1]; sp[2] += r.pu[2]; }
      const xs2 = cl.map((r) => r.dx), ys2 = cl.map((r) => r.dy);
      console.log(` cluster n ${cl.length} dx ${Math.min(...xs2)}..${Math.max(...xs2)} dy ${Math.min(...ys2)}..${Math.max(...ys2)} L0 ${s.map((v) => Math.round(v / cl.length)).join(",")} pure ${sp.map((v) => Math.round(v / cl.length)).join(",")}`);
    }
  }
} else if (CMD === "layers") {
  const files = ["L0_t0.png", "w0_t0.png", "nb_t0.png", "np.png", "pure.png", "nomask.png", "bg.png"];
  const ims = Object.fromEntries(files.map((f) => [f, load(join(DIR, f))]));
  const RAD = 100, x0 = Math.round(CX - RAD), y0 = Math.round(CY - RAD);
  // Changed-pixel counts vs L0 inside the crop, per layer shot.
  for (const f of files.slice(1)) {
    let n = 0, tot = 0;
    for (let y = 0; y < 2 * RAD; y++) for (let x = 0; x < 2 * RAD; x++) {
      tot++;
      if (dmax(px(ims["L0_t0.png"], x0 + x, y0 + y), px(ims[f], x0 + x, y0 + y)) > 8) n++;
    }
    console.log(`${f} vs L0: ${n}/${tot} px differ >8 in 200px crop`);
  }
  // Gold-mask agreement L0 vs w0 / nomask (is the gold shape the fan's?).
  for (const f of ["w0_t0.png", "nomask.png", "np.png"]) {
    let both = 0, onlyL = 0, onlyF = 0;
    for (let y = 0; y < 2 * RAD; y++) for (let x = 0; x < 2 * RAD; x++) {
      const a = isGold(ims["L0_t0.png"], x0 + x, y0 + y), b = isGold(ims[f], x0 + x, y0 + y);
      if (a && b) both++; else if (a) onlyL++; else if (b) onlyF++;
    }
    console.log(`gold L0 vs ${f}: both ${both} onlyL0 ${onlyL} onlyOther ${onlyF}`);
  }
} else {
  throw new Error(`cmd ${CMD}?`);
}
