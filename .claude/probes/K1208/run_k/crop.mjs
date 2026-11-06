// K1208 Run K: screenshot-buffer helpers - decode, nearest-neighbour 3x
// upscale (the brief's crop), and small colour statistics. Uses png.mjs.
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

export function upscale3(buf) {
  const img = toRGB(decodePNG(buf));
  const { W, H, data } = img;
  const out = Buffer.alloc(W * 3 * H * 3 * 3);
  for (let y = 0; y < H * 3; y++) {
    const sy = (y / 3) | 0;
    for (let x = 0; x < W * 3; x++) {
      const sx = (x / 3) | 0;
      const si = (sy * W + sx) * 3, di = (y * W * 3 + x) * 3;
      out[di] = data[si]; out[di + 1] = data[si + 1]; out[di + 2] = data[si + 2];
    }
  }
  return encodePNG({ W: W * 3, H: H * 3, data: out });
}

export function decode(buf) {
  return toRGB(decodePNG(buf));
}

export const luma = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
export const dist = (d, i, c) => Math.hypot(d[i] - c[0], d[i + 1] - c[1], d[i + 2] - c[2]);
export const pxAt = (img, x, y) => {
  const i = ((y | 0) * img.W + (x | 0)) * 3;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
};
