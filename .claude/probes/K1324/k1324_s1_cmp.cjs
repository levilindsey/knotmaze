const A = require(process.argv[2]), B = require(process.argv[3]);
const counted = new Set(["stray_ink","hard_edge","paper","broken_ink","k1049"]);
const key = (a) => a.scene + "|" + a.kind;
const tot = (J) => { const m = {}; for (const a of J.arts) m[a.kind] = (m[a.kind] || 0) + 1; return m; };
console.log("s8f", JSON.stringify(tot(A)), "\nnew", JSON.stringify(tot(B)));
for (const kinds of [counted, new Set(["owner_only","tail_look"])]) {
  const a = A.arts.filter((x) => kinds.has(x.kind)), b = B.arts.filter((x) => kinds.has(x.kind));
  const used = new Set(); const gone = []; let pxd = 0;
  for (const x of a) {
    let best = -1, bd = 0.06;
    b.forEach((y, i) => { if (used.has(i) || key(y) !== key(x)) return; const d = Math.hypot(x.x - y.x, x.y - y.y); if (d < bd) { bd = d; best = i; } });
    if (best < 0) gone.push(x); else { used.add(best); if (b[best].px !== x.px) pxd++; }
  }
  const added = b.filter((_, i) => !used.has(i));
  console.log(`kinds ${[...kinds].slice(0,2).join("/")}...: gone ${gone.length}, new ${added.length}, matched with px change ${pxd}`);
  for (const x of gone.slice(0, 8)) console.log(`  gone ${x.scene} ${x.kind} (${x.x},${x.y}) ${x.px}px near ${x.near} ${x.part}`);
  for (const x of added.slice(0, 8)) console.log(`  new  ${x.scene} ${x.kind} (${x.x},${x.y}) ${x.px}px near ${x.near} ${x.part}`);
}
