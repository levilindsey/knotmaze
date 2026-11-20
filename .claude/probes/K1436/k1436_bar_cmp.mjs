// K1436 s2: the bar's comparison. Matches the base's finds to the ref's by scene, scan (mirror | screen), kind:class
// and site (nearest unmatched find within R world units), and writes the verdict, the per-class lists and a crop sheet
// of the new and grown finds (base | ref, fill then border capture, 4x).
//   node k1436_bar_cmp.mjs <baseDir> <refDir> <outDir> [R=0.3] [GROW=0.1]
//   each dir holds <scene>.mirror.json, <scene>.screen.json and cap/<scene>/{fill,border}.png + meta.json
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { inflateSync, deflateSync } from "node:zlib";
const [baseDir, refDir, outDir, RS = "0.3", GS = "0.1"] = process.argv.slice(2);
const RAD = +RS, GROW = +GS, GROW_PX = 3;
const scenes = [...new Set(readdirSync(refDir).filter((f) => f.endsWith(".screen.json") || f.endsWith(".mirror.json")).map((f) => f.replace(/\.(screen|mirror)\.json$/, "")))].sort();
const rd = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);
const rows = []; const lines = []; let nNew = 0, nGrown = 0, nGone = 0, missing = 0, skipped = 0; const skippedScenes = [];
let deduped = 0; const dedupedScenes = [];
// K1479: g41_user_tw42 and user_tw42.lightpaper are one physics state by design (same seed and
// params; only the background paint differs, which the bar strips), exported one substep apart
// (4801 a5f6d198 / 4802 462652e7). Count the pair's finds once: the lightpaper scene's finds are
// the same state's finds, so they never enter new/grown/gone. This is not a K1519 skip: both
// scenes still freeze, capture and report FREEZE; only the counting dedupes.
const DEDUP_OF = { "user_tw42.lightpaper": "g41_user_tw42" };
const freezeOf = (dir, sc) => { try { return JSON.parse(readFileSync(join(dir, "cap", sc, "meta.json"), "utf8")).freeze ?? null; } catch { return null; } };
const freezeTxt = (f) => (f ? `${f.ok ? "ok" : "FAILED"} in ${f.tries} (saw ${(f.seen ?? []).join(",") || "?"}; want ${f.expected ?? "?"})` : "no record (pre-K1519 capture)");
for (const sc of scenes) for (const scan of ["mirror", "screen"]) {
  const A = rd(join(baseDir, `${sc}.${scan}.json`)), B = rd(join(refDir, `${sc}.${scan}.json`));
  if (!A || !B) { missing++; lines.push(`MISSING ${sc} ${scan} (base ${!!A}, ref ${!!B})`); continue; }
  if (DEDUP_OF[sc] && scenes.includes(DEDUP_OF[sc])) { if (!dedupedScenes.includes(sc)) { dedupedScenes.push(sc); deduped++; } lines.push(`DEDUP ${sc} ${scan}: same physics state as ${DEDUP_OF[sc]} by design (K1479); finds counted once under ${DEDUP_OF[sc]}`); continue; }
  if (scan === "screen") {
    const fa = freezeOf(baseDir, sc), fb = freezeOf(refDir, sc);
    if ((fa && (fa.tries > 1 || !fa.ok)) || (fb && (fb.tries > 1 || !fb.ok))) lines.push(`FREEZE ${sc}: base ${freezeTxt(fa)}; ref ${freezeTxt(fb)}`);
    // K1519: two loads that froze on different physics states are not one picture; skip the scene's screen
    // finds with a warning instead of judging them (the mirror scan, from the K868 tables, still judges).
    if (A.hash !== B.hash) { lines.push(`SKIP ${sc} screen: physics hash base ${A.hash} ref ${B.hash} differ; scene skipped, not judged (K1519)`); skipped++; skippedScenes.push(sc); continue; }
  }
  const used = new Set();
  for (const f of B.finds) {
    let best = -1, bd = RAD;
    A.finds.forEach((g, k) => { if (used.has(k) || g.kind !== f.kind || g.cls !== f.cls) return; const d = Math.hypot(g.x - f.x, g.y - f.y); if (d < bd) { bd = d; best = k; } });
    if (best < 0) { rows.push({ sc, scan, what: "new", f }); nNew++; continue; }
    used.add(best); const g = A.finds[best];
    if (f.px > g.px * (1 + GROW) && f.px - g.px >= GROW_PX) { rows.push({ sc, scan, what: "grown", f, g }); nGrown++; }
  }
  A.finds.forEach((g, k) => { if (!used.has(k)) { rows.push({ sc, scan, what: "gone", f: g }); nGone++; } });
}
const pass = nNew === 0 && nGrown === 0 && missing === 0; // skipped scenes (K1519) warn above and do not fail the bar
const byCls = new Map();
for (const r of rows) { const k = `${r.scan} ${r.f.kind}:${r.f.cls}`; if (!byCls.has(k)) byCls.set(k, []); byCls.get(k).push(r); }
const fmt = (r) => `${r.sc}:${r.f.x.toFixed(2)}:${r.f.y.toFixed(2)}${r.f.site ? " " + r.f.site : ""} ${r.f.px}px${r.g ? ` (was ${r.g.px}px)` : ""}`;
const out = [`${pass ? "PASS" : "FAIL"}  new ${nNew}  grown ${nGrown}  gone ${nGone}${missing ? `  missing ${missing}` : ""}${skipped ? `  skipped ${skipped} (${skippedScenes.join(",")})` : ""}${deduped ? `  deduped ${deduped} (${dedupedScenes.join(",")})` : ""}  (match radius ${RAD}, grow > ${GROW * 100}% and >= ${GROW_PX} px)`, ...lines];
for (const [k, rs] of [...byCls].sort()) {
  out.push(`\n${k}`);
  for (const what of ["new", "grown", "gone"]) { const L = rs.filter((r) => r.what === what); if (L.length) out.push(`  ${what} ${L.length}: ${L.slice(0, 40).map(fmt).join("; ")}${L.length > 40 ? " ..." : ""}`); }
}
writeFileSync(join(outDir, "bar.txt"), out.join("\n") + "\n");
writeFileSync(join(outDir, "bar.json"), JSON.stringify({ pass, nNew, nGrown, nGone, missing, skipped, skippedScenes, deduped, dedupedScenes, rows }));
console.log(out.join("\n"));
// --- crop sheet of new + grown (screen captures; mirror finds are cropped from the same captures)
function png(p) {
  const b = readFileSync(p); let o = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (o < b.length) { const len = b.readUInt32BE(o); const ty = b.toString("ascii", o + 4, o + 8); const dat = b.subarray(o + 8, o + 8 + len);
    if (ty === "IHDR") { w = dat.readUInt32BE(0); h = dat.readUInt32BE(4); ct = dat[9]; } else if (ty === "IDAT") idat.push(dat); else if (ty === "IEND") break; o += 12 + len; }
  const ch = ct === 6 ? 4 : 3; const raw = inflateSync(Buffer.concat(idat)); const st = w * ch; const d = new Uint8Array(w * h * ch);
  for (let y = 0; y < h; y++) { const f = raw[y * (st + 1)]; const s = y * (st + 1) + 1;
    for (let x = 0; x < st; x++) { const a = x >= ch ? d[y * st + x - ch] : 0, up = y ? d[(y - 1) * st + x] : 0, ul = y && x >= ch ? d[(y - 1) * st + x - ch] : 0; let v = raw[s + x];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1; else if (f === 4) { const pp = a + up - ul, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - ul); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : ul; }
      d[y * st + x] = v & 255; } }
  return { w, h, ch, d };
}
export function writePng(p, w, h, rgb) {
  const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = (buf) => { let c = -1; for (const x of buf) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (ty, dat) => { const l = Buffer.alloc(4); l.writeUInt32BE(dat.length); const td = Buffer.concat([Buffer.from(ty), dat]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const raw = Buffer.alloc(h * (w * 3 + 1)); for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; Buffer.from(rgb.buffer, rgb.byteOffset + y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  writeFileSync(p, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
}
const show = rows.filter((r) => r.what !== "gone").slice(0, +(process.env.SHEET_MAX ?? 48));
if (show.length) {
  const CR = 40, Z = 4, T = 2 * CR * Z, GAP = 6, COLS = 4; const tw = COLS * T + (COLS - 1) * GAP, th = T + 14;
  const W = tw + 2 * GAP, H = show.length * (th + GAP) + GAP; const img = new Uint8Array(W * H * 3).fill(40);
  const cache = new Map(); const get = (p) => { if (!cache.has(p)) cache.set(p, existsSync(p) ? png(p) : null); return cache.get(p); };
  show.forEach((r, k) => {
    const oy = GAP + k * (th + GAP) + 14;
    [[baseDir, "fill"], [refDir, "fill"], [baseDir, "border"], [refDir, "border"]].forEach(([dir, kind], q) => {
      const I = get(join(dir, "cap", r.sc, `${kind}.png`)); const M = rd(join(dir, "cap", r.sc, "meta.json")); if (!I || !M) return;
      const dpr = M.dpr, s = M.view.s * dpr; const cx = Math.round(r.f.x * s + M.view.x * dpr), cy = Math.round(r.f.y * s + M.view.y * dpr);
      const ox = GAP + q * (T + GAP);
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const sx = cx - CR + Math.floor(x / Z), sy = cy - CR + Math.floor(y / Z); const o = ((oy + y) * W + ox + x) * 3;
        if (sx < 0 || sy < 0 || sx >= I.w || sy >= I.h) continue; const i = (sy * I.w + sx) * I.ch; img[o] = I.d[i]; img[o + 1] = I.d[i + 1]; img[o + 2] = I.d[i + 2];
        const rr = Math.hypot(x - T / 2, y - T / 2); if (Math.abs(rr - (CR * Z * 0.55)) < 1.2) { img[o] = 255; img[o + 1] = 40; img[o + 2] = 200; } }
    });
    // label strip: a coloured tick per kind of row (new red, grown amber), the text goes in sheet.txt
    const col = r.what === "new" ? [230, 50, 50] : [240, 170, 30]; for (let y = oy - 12; y < oy - 2; y++) for (let x = GAP; x < GAP + 40; x++) { const o = (y * W + x) * 3; img[o] = col[0]; img[o + 1] = col[1]; img[o + 2] = col[2]; }
  });
  writePng(join(outDir, "sheet.png"), W, H, img);
  writeFileSync(join(outDir, "sheet.txt"), "rows top to bottom; tiles: base fill | ref fill | base border | ref border (80 device px at 4x, ring = the find)\n" + show.map((r, k) => `${k + 1}. ${r.what} ${r.scan} ${r.f.kind}:${r.f.cls} ${fmt(r)}`).join("\n") + "\n");
}
process.exit(pass ? 0 : 1);
