// K1218 S5 (a live_s5.mjs module): one chain's drawn centreline near a device
// point: per sample, its device position, its distance to the point, the
// signed turn there (degrees; device y points down, so - = a left turn on
// screen) and the radius that turn
// implies (chord / turn), against the half-width.
//   node live_s5.mjs <stand> <outDir> bend_s5.mjs <chain> <x,y> [span=8]
export async function run({ page, toWorld, toDevice, args }) {
  const chain = Number(args[0]);
  const [dx0, dy0] = args[1].split(",").map(Number);
  const span = Number(args[2] ?? 8);
  const [wx, wy] = toWorld(dx0 + 0.5, dy0 + 0.5);
  const res = await page.evaluate((chain, wx, wy, span) => {
    const r = window.__knotRenderer();
    const cs = r.chainSamples[chain];
    const P = cs.positions, n = P.length / 2;
    let bk = 0, bd = 1e9;
    for (let k = 0; k < n; k++) { const d = Math.hypot(P[2 * k] - wx, P[2 * k + 1] - wy); if (d < bd) { bd = d; bk = k; } }
    const rows = [];
    for (let j = Math.max(1, bk - span); j <= Math.min(n - 2, bk + span); j++) {
      const ax = P[2 * j] - P[2 * j - 2], ay = P[2 * j + 1] - P[2 * j - 1];
      const bx = P[2 * j + 2] - P[2 * j], by = P[2 * j + 3] - P[2 * j + 1];
      const turn = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
      const chord = 0.5 * (Math.hypot(ax, ay) + Math.hypot(bx, by));
      rows.push({ j, x: P[2 * j], y: P[2 * j + 1], d: Math.hypot(P[2 * j] - wx, P[2 * j + 1] - wy), turn, R: Math.abs(turn) > 1e-9 ? chord / Math.abs(turn) : Infinity });
    }
    return { n, closed: cs.closed, h: r.style.threadWidth / 2, rows };
  }, chain, wx, wy, span);
  const a = toWorld(dx0 + 0.5, dy0 + 0.5), b = toWorld(dx0 + 1.5, dy0 + 0.5);
  const pxW = Math.hypot(b[0] - a[0], b[1] - a[1]);
  console.log(`chain ${chain}: ${res.n} samples, closed ${res.closed}; half-width ${(res.h / pxW).toFixed(1)} device px; point ${dx0},${dy0}`);
  console.log("   j   device x   device y   dist px   turn deg   R px");
  for (const v of res.rows) {
    const q = toDevice(v.x, v.y);
    const [x, y] = Array.isArray(q) ? q : [q.x, q.y];
    console.log(`${String(v.j).padStart(4)} ${x.toFixed(1).padStart(10)} ${y.toFixed(1).padStart(10)} ${(v.d / pxW).toFixed(1).padStart(9)} ${(v.turn * 180 / Math.PI).toFixed(2).padStart(10)} ${(v.R / pxW).toFixed(1).padStart(6)}`);
  }
  return null;
}
