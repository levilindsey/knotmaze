// K1271 follow-up: form B's ink + top surface at cut 273's two spots (untracked probe).
//   node scripts/run_node.mjs .claude/probes/K1240/proto/_k1271_ink.ts <scene> <out.png> <width> <ppu> x1 y1 [x2 y2 ...]
import { readFileSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { FormB } from "../../../../src/render/field/form_b";
const [name, out, wS, ppuS, ...xy] = process.argv.slice(2);
const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8"));
scene.look.ctrlArc ??= 0.47;
const fb = new FormB(scene as never, { dpr: 2 }) as any;
const W = +wS, ppu = +ppuS, P = Math.round(W * ppu), GAP = 6;
const n = xy.length / 2, Wt = n * P + (n - 1) * GAP;
const img = new Uint8Array(Wt * P * 3).fill(128);
const hue = (c: number): [number, number, number] => { const h = ((c * 0.61803398875) % 1) * 6; const f = h - Math.floor(h); const q = [[1, f, 0], [1 - f, 1, 0], [0, 1, f], [0, 1 - f, 1], [f, 0, 1], [1, 0, 1 - f]][Math.floor(h) % 6]; return q.map((v) => 150 + 90 * v) as [number, number, number]; };
for (let k = 0; k < n; k++) {
  const cx = +xy[2 * k], cy = +xy[2 * k + 1];
  for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
    const ev = fb.evalPoint(cx - W / 2 + (c + 0.5) / ppu, cy - W / 2 + (r + 0.5) / ppu);
    let col: [number, number, number] = ev.top < 0 ? [255, 255, 255] : hue(ev.chain);
    const a = Math.min(1, Math.max(0, ev.ink));
    col = col.map((v) => Math.round(v * (1 - a))) as [number, number, number];
    const o = (r * Wt + k * (P + GAP) + c) * 3; img[o] = col[0]; img[o + 1] = col[1]; img[o + 2] = col[2];
  }
}
const crcT = new Int32Array(256).map((_, m) => { let c = m; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (b: Buffer): number => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t: string, d: Buffer): Buffer => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const cb = Buffer.alloc(4); cb.writeUInt32BE(crc(td)); return Buffer.concat([l, td, cb]); };
const raw = Buffer.alloc((Wt * 3 + 1) * P); for (let r = 0; r < P; r++) { raw[r * (Wt * 3 + 1)] = 0; Buffer.from(img.buffer, r * Wt * 3, Wt * 3).copy(raw, r * (Wt * 3 + 1) + 1); }
const ih = Buffer.alloc(13); ih.writeUInt32BE(Wt, 0); ih.writeUInt32BE(P, 4); ih[8] = 8; ih[9] = 2;
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
console.log(`wrote ${out} (${Wt}x${P})`);
