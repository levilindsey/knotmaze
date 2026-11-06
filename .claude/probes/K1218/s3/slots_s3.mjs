// K1218 S3 (a live_s3.mjs module): the gap slots and joints around device points.
//   node live_s3.mjs <stand> <outDir> slots_s3.mjs <x,y> [<x,y> ...] [r=<world radius>]
// Per point: the world point, each chain's nearest sample within the radius
// (arc, distance), and every live slot whose centre lies within the radius:
// over/under chain, under centre arc, window, hOver, margin, fade, the four
// clearance scales, the cuts, and the under chain's fused joints by signed arc
// from the slot centre (paintArcAt, as computeGapSlot reads them).
export async function run({ page, toWorld, args }) {
  let R = 1.6;
  const pts = [];
  for (const a of args) {
    if (a.startsWith("r=")) R = Number(a.slice(2));
    else { const [x, y] = a.split(",").map(Number); pts.push({ dev: [x, y], w: toWorld(x, y) }); }
  }
  const res = await page.evaluate(({ pts, R }) => {
    const r = window.__knotRenderer();
    const out = [];
    const nS = r.gaps.slots;
    for (const p of pts) {
      const [px, py] = p.w;
      const near = [];
      r.chainSamples.forEach((s, c) => {
        if (!s) return;
        let best = 1e9, bk = -1;
        for (let k = 0; k < s.count; k++) {
          const d = Math.hypot(s.positions[2 * k] - px, s.positions[2 * k + 1] - py);
          if (d < best) { best = d; bk = k; }
        }
        if (best < R) {
          const per = s.totalLength / (s.closed ? s.count : s.count - 1);
          near.push({ chain: c, k: bk, arc: +(bk * per).toFixed(4), d: +best.toFixed(4), total: +s.totalLength.toFixed(3), closed: s.closed });
        }
      });
      const slots = [];
      for (let sl = 0; sl < nS; sl++) {
        const h = r.gaps.readSlot(sl).header;
        if (!(h[7] !== 0)) continue;
        const cx = h[22], cy = h[23];
        const d = Math.hypot(cx - px, cy - py);
        if (d > R) continue;
        const uc = r.slotUnderChain[sl];
        const joints = [];
        const us = r.chainSamples[uc];
        const list = r.junctionArcCtrls.get(uc) || [];
        for (const jc of list) {
          if (!us) break;
          let dd = r.paintArcAt(us, jc.ctrl, us.closed) - r.slotUnderCenter[sl];
          if (us.closed) { const T = us.totalLength; dd = ((dd % T) + T) % T; if (dd > T / 2) dd -= T; }
          if (Math.abs(dd) < 3) joints.push({ jn: jc.jn, ctrl: jc.ctrl, d: +dd.toFixed(4) });
        }
        slots.push({
          slot: sl, emergent: sl >= r.emergentBase, d: +d.toFixed(4), live: r.slotLive[sl],
          over: r.slotOverChain[sl], under: uc, uCenter: +r.slotUnderCenter[sl].toFixed(4),
          centre: [+cx.toFixed(4), +cy.toFixed(4)], tan: [+h[24].toFixed(3), +h[25].toFixed(3)],
          win: [+h[8].toFixed(4), +h[9].toFixed(4)], hOver: +h[10].toFixed(4), margin: +h[32].toFixed(4), fade: +h[33].toFixed(4),
          mScale: [+h[26].toFixed(3), +h[27].toFixed(3)], fScale: [+h[20].toFixed(3), +h[21].toFixed(3)],
          strength: h[7], flags: h[15], sminK: h[34], farK: h[35],
          cut: [+r.slotCutNeg[sl].toFixed(4), +r.slotCutPos[sl].toFixed(4)],
          cover: [+r.slotCoverNeg[sl].toFixed(4), +r.slotCoverPos[sl].toFixed(4)],
          all: [+r.slotAllNeg[sl].toFixed(4), +r.slotAllPos[sl].toFixed(4)],
          prot: [h[28], h[29], h[30], h[31]].map((v) => +v.toFixed(4)),
          joints,
        });
      }
      slots.sort((a, b) => a.d - b.d);
      out.push({ dev: p.dev, w: p.w.map((v) => +v.toFixed(4)), near, slots });
    }
    return { fh: r.style.threadWidth / 2, out };
  }, { pts, R });
  for (const o of res.out) {
    console.log(`point dev ${o.dev} world ${o.w} (fh ${res.fh})`);
    for (const n of o.near) console.log(`  chain ${n.chain} k ${n.k} arc ${n.arc} d ${n.d} total ${n.total}${n.closed ? " closed" : ""}`);
    for (const s of o.slots) console.log(`  slot ${s.slot}${s.emergent ? "e" : ""} d ${s.d} over ${s.over} under ${s.under} uC ${s.uCenter} win ${s.win} hO ${s.hOver} m ${s.margin} f ${s.fade} mS ${s.mScale} fS ${s.fScale} cut ${s.cut} cover ${s.cover} all ${s.all} str ${s.strength} flags ${s.flags} joints ${JSON.stringify(s.joints)}`);
  }
  return res;
}
