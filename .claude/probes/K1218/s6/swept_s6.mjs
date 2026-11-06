// K1218 S6 (a live_s5.mjs module): sweptArc's internals per pixel, for every
// arm of one junction's record whose chain is <chain> (all arms without it):
// the winning segment (j = the joint candidate, p = no sweep: the
// projection), u, the sweep distance l, the swept arc, the projection, and
// the arc the field paints after the hand-over. Then the arm's profile near
// the pixels: points, segment directions, turn per vertex, arc per length.
// It re-implements FIELD_GLSL's sweptArc (joinery.ts's mirror) over the
// record texels, so nothing in src/ is instrumented.
//   node live_s5.mjs <stand> <outDir> swept_s6.mjs <ji> <x0,y0,x1,y1> [chain]
export async function run({ page, toWorld, args }) {
  const ji = Number(args[0]);
  const [x0, y0, x1, y1] = args[1].split(",").map(Number);
  const chainSel = args[2] !== undefined ? Number(args[2]) : -1;
  const xs = [], ys = [];
  for (let x = x0; x <= x1; x++) xs.push(x);
  for (let y = y0; y <= y1; y++) ys.push(y);
  const pts = [];
  for (const y of ys) for (const x of xs) pts.push(toWorld(x + 0.5, y + 0.5));
  const R = await page.evaluate(async (ji, pts, chainSel) => {
    // The app's own instance: after an edit Vite serves it as ?t=<stamp>, and a bare import makes a second, empty one.
    const urls = performance.getEntriesByType("resource").map((e) => e.name).filter((u) => /\/src\/render\/junction_field\.ts(\?|$)/.test(u));
    const jf = await import(urls.length ? urls[urls.length - 1] : "/src/render/junction_field.ts");
    const r = window.__knotRenderer();
    const rec = r.fieldProbe.record(ji);
    const J = jf.recordData().data;
    const DR = jf.FIELD_PROF_DR;
    // The fold hand-over (S6): the app's own constants when it has them.
    const FLO = jf.FIELD_FOLD_LO ?? 0.45;
    const FHI = jf.FIELD_FOLD_HI ?? 0.8;
    const fh = r.style.threadWidth / 2;
    const profN = r.fieldProfLen;
    const last = profN - 1;
    const stride = 2 + profN;
    const hd = rec * 4;
    const n = Math.round(J[hd + 2]);
    const jx = J[hd], jy = J[hd + 1];
    const arms = [];
    for (let i = 0; i < n; i++) {
      const ab = rec + 2 + i * stride;
      const chain = Math.round(J[ab * 4]);
      if (chainSel >= 0 && chain !== chainSel) continue;
      const prof = [];
      for (let g = 0; g <= last; g++) {
        const t = (ab + 2 + g) * 4;
        prof.push([J[t], J[t + 1]]);
      }
      arms.push({ i, ab, chain, prof });
    }
    const P = (arm, g) => {
      const [a, s] = arm.prof[g];
      return [g * DR * Math.cos(a), g * DR * Math.sin(a), s];
    };
    const N = (x, y) => {
      const l = Math.sqrt(x * x + y * y);
      return [x / l, y / l];
    };
    const profArc = (arm, rp) => {
      const xg = rp / DR;
      if (xg >= last) return arm.prof[last][1] + (rp - last * DR);
      const i = Math.floor(xg);
      return arm.prof[i][1] + (arm.prof[i + 1][1] - arm.prof[i][1]) * (xg - i);
    };
    const swept = (arm, ex, ey, rp) => {
      const proj = profArc(arm, rp);
      const rho = Math.sqrt(ex * ex + ey * ey);
      const reach = 2 * fh;
      let g = Math.min(Math.max(Math.trunc((rho - reach) / DR), 0), last - 1);
      const g1 = Math.min(Math.max(Math.trunc((rho + reach) / DR) + 2, 1), last);
      let a = P(arm, Math.max(g - 1, 0)), b = P(arm, g), c = P(arm, g + 1);
      let tb = N(c[0] - b[0], c[1] - b[1]);
      let kb = 0;
      if (g > 0) {
        const t0 = N(b[0] - a[0], b[1] - a[1]);
        kb = (2 * (t0[0] * tb[1] - t0[1] * tb[0])) / (Math.hypot(b[0] - a[0], b[1] - a[1]) + Math.hypot(c[0] - b[0], c[1] - b[1]));
        tb = N(tb[0] + t0[0], tb[1] + t0[1]);
      }
      let best = 1e9, arc = proj, gw = "p", uw = -1, fold = 0;
      if (g === 0 && ex * tb[0] + ey * tb[1] < 0) {
        best = rho;
        arc = b[2];
        gw = "j";
        uw = 0;
      }
      const cands = [];
      // kappa at the pixel's own radius (vertex rho / DR, lerped): smooth in space.
      const gr = Math.trunc(rho / DR), fr = rho / DR - gr;
      let kr = 0, sideW = 0;
      for (let k = 0; k < 40 && g < g1; k++, g++) {
        const dd = [c[0] - b[0], c[1] - b[1]];
        let tc = N(dd[0], dd[1]);
        let d = c;
        let kc = 0;
        if (g + 2 <= last) {
          d = P(arm, g + 2);
          const s2 = N(d[0] - c[0], d[1] - c[1]);
          kc = (2 * (tc[0] * s2[1] - tc[1] * s2[0])) / (Math.hypot(dd[0], dd[1]) + Math.hypot(d[0] - c[0], d[1] - c[1]));
          tc = N(tc[0] + s2[0], tc[1] + s2[1]);
        }
        const n0 = [-tb[1], tb[0]];
        const dn = [-tc[1] - n0[0], tc[0] - n0[1]];
        const q = [ex - b[0], ey - b[1]];
        const qa = -(dd[0] * dn[1] - dd[1] * dn[0]);
        const qb = q[0] * dn[1] - q[1] * dn[0] - (dd[0] * n0[1] - dd[1] * n0[0]);
        const qc = q[0] * n0[1] - q[1] * n0[0];
        const disc = qb * qb - 4 * qa * qc;
        if (disc >= 0) {
          const h = -0.5 * (qb + (qb < 0 ? -Math.sqrt(disc) : Math.sqrt(disc)));
          for (let rr = 0; rr < 2; rr++) {
            const u = rr === 0 ? (Math.abs(qa) > 1e-12 ? h / qa : -1) : Math.abs(h) > 1e-12 ? qc / h : -1;
            if (!(u >= 0 && u <= 1)) continue;
            const l = Math.hypot(q[0] - u * dd[0], q[1] - u * dd[1]);
            // signed side: + = left of the segment direction
            const side = Math.sign(dd[0] * (q[1] - u * dd[1]) - dd[1] * (q[0] - u * dd[0]));
            cands.push([g, +u.toFixed(3), +(side * l).toFixed(3)]);
            if (l < best) {
              best = l;
              arc = b[2] + (c[2] - b[2]) * u;
              gw = g;
              uw = u;
              fold = side * l * (kb + (kc - kb) * u);
              sideW = side;
            }
          }
        }
        if (g === gr) kr = kb + (kc - kb) * fr;
        b = c;
        c = d;
        tb = tc;
        kb = kc;
      }
      let w = (best - fh) / fh;
      w = w < 0 ? 0 : w > 1 ? 1 : w;
      let wf = (fold - FLO) / (FHI - FLO);
      wf = wf < 0 ? 0 : wf > 1 ? 1 : wf;
      const wFold = wf * wf * (3 - 2 * wf);
      const wt = 1 - (1 - w * w * (3 - 2 * w)) * (1 - wFold);
      const fin = arc + (proj - arc) * wt;
      return { gw, uw, best, arc, proj, fin, cands, fold, wFold, wd: w * w * (3 - 2 * w), kr, sideW };
    };
    const TAU = Math.PI * 2;
    const rows = pts.map(([x, y]) => {
      const ex = x - jx, ey = y - jy;
      const rho = Math.sqrt(ex * ex + ey * ey);
      const phi = Math.atan2(ey, ex);
      const gx = rho / DR;
      let gi, gf;
      if (gx >= last) { gi = last - 1; gf = 1; } else { gi = Math.floor(gx); gf = gx - gi; }
      return arms.map((arm) => {
        const a0 = arm.prof[gi][0], a1 = arm.prof[gi + 1][0];
        let ra = phi - (a0 + (a1 - a0) * gf);
        ra -= TAU * Math.floor(ra / TAU);
        const rel = Math.min(ra, TAU - ra);
        const rp = rel < Math.PI / 2 ? rho * Math.cos(rel) : 0;
        const s = swept(arm, ex, ey, rp);
        s.rel = rel;
        s.rho = rho;
        return s;
      });
    });
    // Each arm's profile over the radii the pixels reach (+- 2 fh).
    let rmin = 1e9, rmax = 0;
    for (const [x, y] of pts) {
      const rr = Math.hypot(x - jx, y - jy);
      rmin = Math.min(rmin, rr);
      rmax = Math.max(rmax, rr);
    }
    const profs = arms.map((arm) => {
      const g0 = Math.max(0, Math.floor((rmin - 2 * fh) / DR) - 1);
      const g1 = Math.min(last, Math.ceil((rmax + 2 * fh) / DR) + 2);
      const lines = [];
      for (let g = g0; g <= g1; g++) {
        const p = P(arm, g);
        let th = null, turn = null, apl = null;
        if (g < last) {
          const q = P(arm, g + 1);
          th = Math.atan2(q[1] - p[1], q[0] - p[0]);
          apl = (q[2] - p[2]) / Math.hypot(q[0] - p[0], q[1] - p[1]);
          if (g > 0) {
            const o = P(arm, g - 1);
            let t0 = Math.atan2(p[1] - o[1], p[0] - o[0]);
            let dt = th - t0;
            dt -= TAU * Math.round(dt / TAU);
            turn = dt;
          }
        }
        lines.push({ g, x: +p[0].toFixed(4), y: +p[1].toFixed(4), ang: +arm.prof[g][0].toFixed(4), arc: +p[2].toFixed(4), segDir: th === null ? null : +th.toFixed(4), turnAtVertex: turn === null ? null : +turn.toFixed(4), arcPerLen: apl === null ? null : +apl.toFixed(4) });
      }
      return { i: arm.i, chain: arm.chain, lines };
    });
    return { url: urls[urls.length - 1] ?? "(bare)", rows, profs, fh, DR, jx, jy, rec, n, armIdx: arms.map((a) => a.i), chains: arms.map((a) => a.chain) };
  }, ji, pts, chainSel);
  console.log(`module ${R.url}`);
  // VARIANTS=f:0.45:0.8,r:0.3:0.8 ... : f = the fold at the foot (today), r = side * l *
  // kappa at the pixel's radius. Prints, per variant and row, the max final-arc d/dx
  // (x1000 per px) and its x, then the row's median; no grids.
  if (process.env.VARIANTS) {
    const sm = (t) => { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
    R.armIdx.forEach((ai, k) => {
      for (const spec of process.env.VARIANTS.split(",")) {
        const [src, lo, hi] = spec.split(":");
        const LO = Number(lo), HI = Number(hi);
        const fin = (v) => {
          const F = src === "r" ? v.sideW * v.best * v.kr : v.fold;
          const wt = 1 - (1 - v.wd) * (1 - sm((F - LO) / (HI - LO)));
          return v.arc + (v.proj - v.arc) * wt;
        };
        let s = `arm ${ai} ${spec.padEnd(12)}`, gmax = 0;
        ys.forEach((y, iy) => {
          let m = -1e9, mx = 0;
          const ds = [];
          xs.forEach((x, ix) => {
            if (ix === 0) return;
            const d = (fin(R.rows[iy * xs.length + ix][k]) - fin(R.rows[iy * xs.length + ix - 1][k])) * 1000;
            ds.push(d);
            if (d > m) { m = d; mx = x; }
          });
          ds.sort((p, q) => p - q);
          gmax = Math.max(gmax, m);
          s += ` ${y}:${m.toFixed(0)}@${mx}/${ds[ds.length >> 1].toFixed(0)}`;
        });
        console.log(`${s}  max ${gmax.toFixed(1)}`);
      }
    });
    return null;
  }
  console.log(`ji ${ji} rec ${R.rec} nArms ${R.n} fh ${R.fh} DR ${R.DR} centre ${R.jx.toFixed(4)},${R.jy.toFixed(4)}; arms shown ${R.armIdx.join(",")} (chains ${R.chains.join(",")})`);
  for (const p of R.profs) {
    console.log(`arm ${p.i} chain ${p.chain} profile:`);
    for (const l of p.lines) console.log("  " + JSON.stringify(l));
  }
  let hdr = "      ";
  for (const x of xs) hdr += String(x).padStart(8);
  R.armIdx.forEach((ai, k) => {
    const grid = (name, f) => {
      console.log(`arm ${ai} (chain ${R.chains[k]}) ${name}`);
      console.log(hdr);
      ys.forEach((y, iy) => {
        let s = `${String(y).padStart(5)} `;
        xs.forEach((x, ix) => { s += f(R.rows[iy * xs.length + ix][k]).padStart(8); });
        console.log(s);
      });
    };
    grid("winning segment", (v) => String(v.gw));
    grid("u", (v) => v.uw.toFixed(3));
    grid("best l", (v) => (v.best > 9 ? "-" : v.best.toFixed(3)));
    grid("swept arc", (v) => v.arc.toFixed(3));
    grid("proj", (v) => v.proj.toFixed(3));
    grid("fold (s kappa, + concave)", (v) => v.fold.toFixed(3));
    grid("wFold", (v) => v.wFold.toFixed(3));
    grid("final arc", (v) => v.fin.toFixed(3));
    grid("final arc d/dx (per px, x1000)", (v) => "");
    ys.forEach((y, iy) => {
      let s = `${String(y).padStart(5)} `;
      xs.forEach((x, ix) => {
        if (ix === 0) { s += "".padStart(8); return; }
        const a = R.rows[iy * xs.length + ix][k].fin, b = R.rows[iy * xs.length + ix - 1][k].fin;
        s += ((a - b) * 1000).toFixed(1).padStart(8);
      });
      console.log(s);
    });
  });
  // One row's candidates in full (the middle row).
  const midY = Math.floor(ys.length / 2);
  console.log(`candidates on row ${ys[midY]} [g, u, signed l]:`);
  xs.forEach((x, ix) => {
    const v = R.rows[midY * xs.length + ix];
    console.log(`  x ${x}: ` + v.map((s, k) => `arm ${R.armIdx[k]} ${JSON.stringify(s.cands)} rel ${s.rel.toFixed(3)} rho ${s.rho.toFixed(3)}`).join(" | "));
  });
  return null;
}
