// K1314 s11: ink-only panels at a spot, form B | the app's band ink | the app's ink with the pieces drawn over it
// (border pts as lines, each point's inner end as a short tick toward it; one colour per piece, listed on stdout).
//   node scripts/run_node.mjs .claude/probes/K1314/k1314s11_view.ts <scene> <x> <y> <out.png> [--px=480] [--w=1.25]
//        [--pieces=371,196] (only these drawn; default every piece in the window)
import * as D from "../../../src/render/outline/draw";
import { bandGpu } from "../../../src/render/outline/band_gpu";
import { buildModel, refEval, type Model } from "./k1314_census";
import { writePng } from "./k1314_crops";

const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [nm, xs, ys, out] = args.filter((a) => !a.startsWith("--"));
const P = Number(opt("px") ?? 480); const WH = Number(opt("w") ?? 1.25);
const only = opt("pieces")?.split(",").map(Number);

export function appInk(m: Model, c0: number, r0: number, W: number, H: number, ppu: number): Float32Array {
  const b = bandGpu(m.table, m.scene, m.zz); const tie = D.tieAlpha(m.zz, b.h, b.W, b.zt);
  const ink = new Float32Array(W * H);
  const wx0 = c0 / ppu; const wy0 = r0 / ppu; const wx1 = (c0 + W) / ppu; const wy1 = (r0 + H) / ppu;
  for (let t = 0; 3 * t + 2 < b.count; t++) {
    const v = [3 * t, 3 * t + 1, 3 * t + 2];
    const X = v.map((k) => b.pos[2 * k]); const Y = v.map((k) => b.pos[2 * k + 1]);
    if (Math.max(...X) < wx0 || Math.min(...X) > wx1 || Math.max(...Y) < wy0 || Math.min(...Y) > wy1) continue;
    const ch = b.chain[v[0]];
    const den = (Y[1] - Y[2]) * (X[0] - X[2]) + (X[2] - X[1]) * (Y[0] - Y[2]); if (!(Math.abs(den) > 1e-18)) continue;
    const ca = Math.max(0, Math.floor(Math.min(...X) * ppu - c0 - 0.5)); const cb = Math.min(W - 1, Math.ceil(Math.max(...X) * ppu - c0 - 0.5));
    const ra = Math.max(0, Math.floor(Math.min(...Y) * ppu - r0 - 0.5)); const rb = Math.min(H - 1, Math.ceil(Math.max(...Y) * ppu - r0 - 0.5));
    const sl = b.slots.subarray(4 * v[0], 4 * v[0] + 4); const tied = ch >= 0 && Array.from(sl).some((q) => q >= 0);
    for (let r = ra; r <= rb; r++) for (let c = ca; c <= cb; c++) {
      const x = (c0 + c + 0.5) / ppu; const y = (r0 + r + 0.5) / ppu;
      const l1 = ((Y[1] - Y[2]) * (x - X[2]) + (X[2] - X[1]) * (y - Y[2])) / den; const l2 = ((Y[2] - Y[0]) * (x - X[2]) + (X[0] - X[2]) * (y - Y[2])) / den; const l3 = 1 - l1 - l2;
      if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
      const L = [l1, l2, l3]; const at = (k: number): number => L[0] * b.attr[4 * v[0] + k] + L[1] * b.attr[4 * v[1] + k] + L[2] * b.attr[4 * v[2] + k];
      const a = Math.min(1, Math.max(0, tied ? at(3) * tie(ch, x, y, at(0), at(1)) : at(3)));
      const i = r * W + c; ink[i] = 1 - (1 - ink[i]) * (1 - a);
    }
  }
  return ink;
}

if (process.argv[1] && /k1314s11_view/.test(process.argv[1])) {
  const X = +xs; const Y = +ys;
  const m = buildModel(nm); const h = m.scene.look.halfWidth; const S = WH * h; const ppu = P / S;
  const W = 2 * h * (m.scene.look as any).inkFrac || 0; void W;
  const c0 = Math.round(X * ppu - P / 2); const r0 = Math.round(Y * ppu - P / 2);
  const Wt = 3 * P + 8; const img = new Uint8Array(Wt * P * 3).fill(255);
  const put = (k: number, c: number, r: number, rgb: number[]): void => { if (c < 0 || c >= P || r < 0 || r >= P) return; const o = 3 * (r * Wt + k * (P + 4) + c); img[o] = rgb[0]; img[o + 1] = rgb[1]; img[o + 2] = rgb[2]; };
  for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
    const ev = refEval(m, (c0 + c + 0.5) / ppu, (r0 + r + 0.5) / ppu);
    const g = Math.round(255 * (1 - Math.min(1, Math.max(0, ev.ink)))); put(0, c, r, [g, g, g]);
  }
  const ink = appInk(m, c0, r0, P, P, ppu);
  for (let i = 0; i < P * P; i++) { const c = i % P; const r = (i - c) / P; const g = Math.round(255 * (1 - ink[i])); put(1, c, r, [g, g, g]); put(2, c, r, [g, g, g]); }
  const pal = [[230, 0, 0], [0, 160, 0], [0, 0, 230], [230, 140, 0], [200, 0, 200], [0, 180, 180], [140, 90, 0], [120, 120, 255]];
  const bW = (m.table as any).W ?? bandGpu(m.table, m.scene, m.zz).W;
  const line = (ax: number, ay: number, bx: number, by: number, rgb: number[]): void => {
    const n = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * ppu) + 1;
    for (let k = 0; k <= n; k++) { const x = ax + ((bx - ax) * k) / n; const y = ay + ((by - ay) * k) / n; put(2, Math.round(x * ppu - c0 - 0.5), Math.round(y * ppu - r0 - 0.5), rgb); }
  };
  // Chain centrelines (dotted grey-ish, one shade per chain), on panel 2 only.
  const cpal = [[255, 120, 120], [120, 200, 120], [120, 120, 255], [255, 190, 90], [220, 120, 220], [90, 200, 200]];
  let cc = 0;
  m.scene.chains.forEach((ch: any, ci: number) => {
    const pts = ch.pts as number[]; const n = pts.length / 2; let hit = false;
    for (let i = 0; i < n; i++) if (Math.abs(pts[2 * i] - X) < S && Math.abs(pts[2 * i + 1] - Y) < S) hit = true;
    if (!hit) return;
    const rgb = cpal[cc++ % cpal.length];
    for (let i = 0; i + 1 < n; i++) {
      const ax = pts[2 * i]; const ay = pts[2 * i + 1]; const bx = pts[2 * i + 2]; const by = pts[2 * i + 3];
      const k = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * ppu) + 1;
      for (let t = 0; t <= k; t += 3) { const x = ax + ((bx - ax) * t) / k; const y = ay + ((by - ay) * t) / k; put(1, Math.round(x * ppu - c0 - 0.5), Math.round(y * ppu - r0 - 0.5), rgb); }
    }
    console.log(`chain idx ${ci} id ${ch.id} closed ${ch.closed} rgb ${rgb.join(",")}`);
  });
  let pc = 0;
  m.table.pieces.forEach((p, pi) => {
    const np = p.pts.length / 2; if (np < 2) return;
    if (only && !only.includes(pi)) return;
    let inWin = false;
    for (let i = 0; i < np; i++) { const x = p.pts[2 * i]; const y = p.pts[2 * i + 1]; if (Math.abs(x - X) < S / 2 && Math.abs(y - Y) < S / 2) inWin = true; }
    if (!inWin) return;
    const rgb = pal[pc++ % pal.length];
    for (let i = 0; i + 1 < np; i++) line(p.pts[2 * i], p.pts[2 * i + 1], p.pts[2 * i + 2], p.pts[2 * i + 3], rgb);
    for (let i = 0; i < np; i++) {
      const x = p.pts[2 * i]; const y = p.pts[2 * i + 1]; let dx = p.cpts[2 * i] - x; let dy = p.cpts[2 * i + 1] - y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      line(x, y, x + 0.35 * bW * dx, y + 0.35 * bW * dy, rgb);
    }
    const al = p.alpha ? Array.from({ length: np }, (_, i) => `${p.alpha![2 * i].toFixed(2)}/${p.alpha![2 * i + 1].toFixed(2)}`).join(" ") : "-";
    console.log(`piece ${pi} ${p.kind} chain ${p.chain} side ${(p as any).side} corner ${p.corner} n ${np} rgb ${rgb.join(",")} alpha ${al}`);
  });
  writePng(out, img, Wt, P);
  console.log(`${out}: ${S.toFixed(3)} world wide, ppu ${ppu.toFixed(1)}, W ${bW}`);
}
