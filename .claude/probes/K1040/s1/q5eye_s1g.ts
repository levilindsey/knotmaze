// K1040 S1g step 5: the eye that q5holes stops counting under the d-edge
// (group 108 at about (25.3, 20.8) in muse_hash and muse_default_tw). For S1f's
// final on the two changes ({"dEdge":"skip","rootBand":0}) and the d-edge only
// ({"rootBand":0}): a char map of the tops around the hole's pixel (. paper,
// o group 108, + / # a chain's own surface (# where its ink >= 0.5), a-z other junction groups, upper case
// where the ink is >= 0.5), and the paper component from that pixel: its size,
// whether it reaches a 160 px box's edge, and the tops around it.
// Run: npx vite-node .claude/probes/K1040/s1/q5eye_s1g.ts   (writes out/s1g/q5eye.txt)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB, OWN } from "../../../../src/render/field/form_b";
import { FieldModel, cornerRadius } from "../../../../src/render/field/oracle";

const HERE = "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-a8056cde26bf07a6a/.claude/probes/K1040/s1";
const sceneDir = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const out: string[] = [];
const cases: [string, number, number][] = [
  ["muse_hash", 777, 512],
  ["muse_default_tw", 782, 512],
];
const variants: [string, object][] = [
  ["s1f", { dEdge: "skip", rootBand: 0 }],
  ["near", { rootBand: 0 }],
];
for (const [name, ci, cj] of cases) {
  const s = JSON.parse(readFileSync(`${sceneDir}/${name}.json`, "utf8")) as FieldScene;
  s.look.ctrlArc ??= 0.47;
  const [a, b, c, d, e, f] = s.camera.worldToCss;
  const det = a * d - b * c;
  const world = (x: number, y: number): [number, number] => {
    const u = x - e;
    const v = y - f;
    return [(d * u - c * v) / det, (-b * u + a * v) / det];
  };
  const hw = s.look.halfWidth;
  const om = new FieldModel(s, { rRound: 0, rOf: (_j, _i, th, st) => (st === "round" ? cornerRadius(3, hw, th) : 0), spans: "k883", crMax: 3 });
  out.push(`${name} oracle (. paper, i inside, I ink >= 0.5):`);
  for (let j = cj - 12; j <= cj + 12; j++) {
    let row = "";
    for (let i = ci - 20; i <= ci + 20; i++) {
      const [x, y] = world(i + 0.5, j + 0.5);
      const r = om.evalPoint(x, y, false);
      row += Number(r.ink) >= 0.5 ? "I" : r.inside || r.ink ? "i" : ".";
    }
    out.push(`  ${row}`);
  }
  let ink0: Float64Array | null = null;
  for (const [vn, params] of variants) {
    const fb = new FormB(s, { dpr: 1, ...params });
    const B = 80;
    const W = 2 * B + 1;
    const top = new Int32Array(W * W);
    const ink = new Float64Array(W * W);
    for (let j = 0; j < W; j++)
      for (let i = 0; i < W; i++) {
        const [x, y] = world(ci - B + i + 0.5, cj - B + j + 0.5);
        const r = fb.evalPoint(x, y);
        top[j * W + i] = r.top;
        ink[j * W + i] = r.ink;
      }
    if (ink0) {
      let mx = 0;
      let at = "";
      let n01 = 0;
      let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
      for (let o = 0; o < W * W; o++) {
        const dd = Math.abs(ink[o] - ink0[o]);
        const [pi, pj] = [ci - B + (o % W), cj - B + Math.floor(o / W)];
        if (dd > 0.01) [n01, x0, y0, x1, y1] = [n01 + 1, Math.min(x0, pi), Math.min(y0, pj), Math.max(x1, pi), Math.max(y1, pj)];
        if (dd > mx) [mx, at] = [dd, `px (${pi}, ${pj})`];
      }
      const wc = n01 ? world((x0 + x1 + 1) / 2, (y0 + y1 + 1) / 2) : [NaN, NaN];
      out.push(`  ${vn} vs ${variants[0][0]} over the ${W}x${W} box: max |Δink| ${mx.toFixed(4)} at ${at}; ${n01} px over 0.01, in px x ${x0}..${x1}, y ${y0}..${y1} (world centre ${wc[0].toFixed(3)}, ${wc[1].toFixed(3)})`);
    } else ink0 = ink;
    const letters = new Map<number, string>();
    const ch = (o: number): string => {
      const t = top[o];
      if (t < 0) return ".";
      if (t >= OWN) return ink[o] >= 0.5 ? "#" : "+";
      let k = t === 108 ? "o" : "";
      if (!k) {
        if (!letters.has(t)) letters.set(t, String.fromCharCode(97 + (letters.size % 26)));
        k = letters.get(t)!;
      }
      return ink[o] >= 0.5 ? k.toUpperCase() : k;
    };
    const [wx, wy] = world(ci + 0.5, cj + 0.5);
    out.push(`${name} ${vn}: pixel (${ci}, ${cj}) = world (${wx.toFixed(3)}, ${wy.toFixed(3)}); top there ${top[B * W + B]}`);
    for (let j = B - 12; j <= B + 12; j++) {
      let row = "";
      for (let i = B - 20; i <= B + 20; i++) row += ch(j * W + i);
      out.push(`  ${row}`);
    }
    out.push(`  letters: ${[...letters].map(([g, l]) => `${l}=${g}`).join(" ")}`);
    // The paper component from the nearest paper pixel to the centre.
    let o0 = -1;
    for (let rr = 0; rr < 6 && o0 < 0; rr++)
      for (let dj = -rr; dj <= rr && o0 < 0; dj++)
        for (let di = -rr; di <= rr && o0 < 0; di++) if (top[(B + dj) * W + B + di] < 0) o0 = (B + dj) * W + B + di;
    if (o0 < 0) {
      out.push("  no paper within 5 px of the hole's pixel");
      continue;
    }
    const seen = new Uint8Array(W * W);
    const st = [o0];
    seen[o0] = 1;
    let px = 0;
    let edge = false;
    const around = new Map<string, number>();
    while (st.length) {
      const o = st.pop()!;
      px++;
      const i = o % W;
      const j = (o - i) / W;
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          const i2 = i + di;
          const j2 = j + dj;
          if (i2 < 0 || j2 < 0 || i2 >= W || j2 >= W) {
            edge = true;
            continue;
          }
          const q = j2 * W + i2;
          if (top[q] < 0) {
            if (!seen[q]) {
              seen[q] = 1;
              st.push(q);
            }
          } else {
            const k = top[q] >= OWN ? "chain" : String(top[q]);
            around.set(k, (around.get(k) ?? 0) + 1);
          }
        }
    }
    out.push(`  paper component: ${px} px, reaches the box edge ${edge}; tops around it ${[...around].map(([k, v]) => `${k}:${v}`).join(" ")}`);
  }
}
mkdirSync(`${HERE}/out/s1g`, { recursive: true });
writeFileSync(`${HERE}/out/s1g/q5eye.txt`, out.join("\n") + "\n");
console.log(out.filter((l) => !l.startsWith("  ") || /letters|component|no paper/.test(l)).join("\n"));
