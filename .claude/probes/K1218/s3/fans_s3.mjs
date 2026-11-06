// K1218 S3 (a live_s3.mjs module): every junction fan rebuildFillets pushes
// near a device point, with its rim in device px.
//   node live_s3.mjs <stand> <outDir> fans_s3.mjs <x,y> [r=<world radius>] [box=x0,y0,x1,y1]
// Patches TriFanMesh.prototype.pushFan for one rebuildFillets(true), keeps the
// calls whose centre or any rim point lies within r of the point, and prints
// each fan's kind guess (wedge = has a flank array), centre and the rim points
// inside the device box (all of them when no box is given).
export async function run({ page, toWorld, toDevice, args }) {
  let R = 1.5, box = null, pt = null;
  for (const a of args) {
    if (a.startsWith("r=")) R = Number(a.slice(2));
    else if (a.startsWith("box=")) box = a.slice(4).split(",").map(Number);
    else pt = a.split(",").map(Number);
  }
  const [wx, wy] = toWorld(pt[0], pt[1]);
  const res = await page.evaluate(({ wx, wy, R }) => {
    const r = window.__knotRenderer();
    const proto = Object.getPrototypeOf(r.filletMesh);
    const orig = proto.pushFan;
    const calls = [];
    let idx = 0;
    proto.pushFan = function (cx, cy, rim, rb, flank, seal, flankFill, bIn, bOut) {
      let near = Math.hypot(cx - wx, cy - wy) < R;
      for (let i = 0; !near && i < rim.length; i += 2) near = Math.hypot(rim[i] - wx, rim[i + 1] - wy) < R;
      if (near) calls.push({ i: idx, cx, cy, rim: Array.from(rim), rb, flank: flank ? Array.from(flank) : null, seal: !!seal, flankFill, bIn, bOut, stack: new Error().stack.split("\n").slice(2, 4).map((s) => s.trim()).join(" | ") });
      idx++;
      return orig.apply(this, arguments);
    };
    try { r.rebuildFillets(true); } finally { proto.pushFan = orig; }
    r.rebuildFillets(true);
    return { calls, total: idx, fh: r.style.threadWidth / 2 };
  }, { wx, wy, R });
  console.log(`point ${pt} world ${wx.toFixed(4)},${wy.toFixed(4)}: ${res.calls.length} of ${res.total} fans near (fh ${res.fh})`);
  for (const c of res.calls) {
    const [dcx, dcy] = toDevice(c.cx, c.cy);
    console.log(`fan #${c.i} rb ${c.rb} ${c.flank ? "WEDGE" : "disc/cap"} seal ${c.seal} flankFill ${c.flankFill} band ${c.bIn?.toFixed?.(3)}/${c.bOut?.toFixed?.(3)} centre dev ${dcx.toFixed(1)},${dcy.toFixed(1)} rim ${c.rim.length / 2} pts`);
    console.log(`   from ${c.stack}`);
    const rows = [];
    for (let i = 0; i < c.rim.length; i += 2) {
      const [dx, dy] = toDevice(c.rim[i], c.rim[i + 1]);
      if (box && (dx < box[0] || dx > box[2] || dy < box[1] || dy > box[3])) continue;
      rows.push(`${i / 2}:${dx.toFixed(1)},${dy.toFixed(1)}${c.flank ? "f" + (+c.flank[i / 2]).toFixed(2) : ""}`);
    }
    for (let k = 0; k < rows.length; k += 6) console.log("   " + rows.slice(k, k + 6).join("  "));
    c.dev = [];
    for (let i = 0; i < c.rim.length; i += 2) c.dev.push(...toDevice(c.rim[i], c.rim[i + 1]).map((v) => +v.toFixed(2)));
    c.devCentre = [+dcx.toFixed(2), +dcy.toFixed(2)];
  }
  return res;
}
